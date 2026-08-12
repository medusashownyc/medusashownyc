import * as THREE from 'three';

// Medusa Show — WebGL curved-card carousel.
// Cards sit at fixed angular positions on a ring; the whole ring rotates
// continuously around its centre (a real circular motion path, not a
// left-right slide). Each card is also a genuinely bent plane — vertices
// pushed back in Z along a cosine curve, normals recomputed, lit by a real
// directional light — so the curve you see is actual geometry + shading,
// not a faked gradient.

const IMAGES = [
  { src: 'images/belly-dance.jpg', ratio: 1200 / 1706, alt: 'Bailarina de danza árabe girando sobre el escenario' },
  { src: 'images/fuego.jpg', ratio: 1200 / 1800, alt: 'Performer de fuego girando antorchas encendidas en la oscuridad' },
  { src: 'images/garotas.jpg', ratio: 1200 / 798, alt: 'Garota de carnaval brasileño con tocado de plumas turquesa' },
  { src: 'images/gogo.jpg', ratio: 1200 / 1800, alt: 'Gogo dancer en silueta sobre plataforma con luces de club' },
  { src: 'images/salsa.jpg', ratio: 1200 / 1800, alt: 'Pareja de baile profesional en pose de salsa' },
  { src: 'images/zancos-robot.jpg', ratio: 1200 / 1800, alt: 'Performers en zancos con vestuario escénico entre el público' },
];

// Same order as IMAGES — clicking a card navigates straight to its show
// page instead of just snapping it to front.
const SHOW_URLS = [
  'show-belly-dancers.html',
  'show-fuego.html',
  'show-garotas.html',
  'show-gogo-dancers.html',
  'show-salsa.html',
  'show-zancos-robot.html',
];

// 2:3 — matches the natural ratio of most of the source photos (1200×1800),
// so object-fit: cover barely has to crop them. Only the wide garotas shot
// gets cropped now (on its sides, which it can spare), instead of every
// photo losing head/feet room to a squarer 4:5 frame.
const CARD_W = 3.4;
const CARD_H = 5.1;
const GAP = 0.8;
const BEND = 0.08; // barely-there curl — reads as a clean flat card, not a
                    // rendered 3D surface
const SEGMENTS_X = 32; // the bend runs left-to-right across each card now,
                        // not top-to-bottom — matches the reference.
const RING_COUNT = 20; // positions around the ring (images repeat) — this
                        // sets the ring's actual radius (below), which is
                        // what controls how far the side cards recede into
                        // the background; a smaller count keeps the whole
                        // ring compact instead of sprawling back in depth.
                        // It does NOT change how big the front card reads
                        // (that's CAMERA_DISTANCE, further down) — with a
                        // flat/untilted ring the two are independent.
const ANGLE_STEP = (Math.PI * 2) / RING_COUNT;
const RADIUS = (CARD_W + GAP) / ANGLE_STEP;
const ROTATE_SPEED = 0.05; // radians / second — scaled with ANGLE_STEP so
                            // each card still spends a proportional amount
                            // of time near the front
const CAMERA_DISTANCE = 4.1; // from the ring's edge, not its centre — the
                              // main lever for how big the front card reads;
                              // tight enough that the card fills almost the
                              // whole frame top-to-bottom, so there's no
                              // dead canvas space between it and the row
                              // of service tags underneath
const RING_TILT_DEG = 0; // flat, upright ring — no tilt. A tilt reads as
                          // the cards "reclining" once the camera sits
                          // close/wide enough to fill the frame; a flat
                          // ring stays vertical no matter how it's framed.
const CAMERA_FOV_DEG = 70; // moderate — wide enough for a full-bleed hero
                            // without the fisheye stretch a very wide FOV
                            // puts on the side cards
const FOCUS_SCALE = 1.08; // must match the scale bump applied to the
                           // front-facing card in the animation loop below

const container = document.getElementById('mqScene');
if (container && !prefersNoWebGL()) {
  init();
}

function prefersNoWebGL() {
  try {
    const c = document.createElement('canvas');
    return !(c.getContext('webgl') || c.getContext('experimental-webgl'));
  } catch (e) {
    return true;
  }
}

function init() {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const scene = new THREE.Scene();

  // The ring group rotates around its own local origin (0,0,0) — so that
  // origin MUST be the circle's true centre, or cards swing through the
  // wrong arc as the ring spins (some passing much closer to the camera
  // than intended, ballooning in size). Camera distance is measured from
  // that same centre, out past the ring's radius.
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, 1, 1, 60);

  // RING_TILT_DEG is kept generic (rather than hard-coding a flat ring) so
  // a tilt can be reintroduced later without touching this math — only the
  // spin (ring.rotation.y, applied to a child group) animates; the whole
  // ring is one rigid disk, tilted or not.
  const tiltRad = THREE.MathUtils.degToRad(RING_TILT_DEG);
  const frontY = RADIUS * Math.sin(tiltRad);

  // Solved, not guessed: how much world-space height the camera actually
  // sees at the front card's depth, given its FOV and distance —
  // then aim just high enough that the (scaled-up, focused) card's own
  // top edge clears the frame by a small margin, instead of leaving a lot
  // of unused headroom above it.
  const halfVFov = THREE.MathUtils.degToRad(CAMERA_FOV_DEG) / 2;
  const distanceToCard = RADIUS + CAMERA_DISTANCE - RADIUS * Math.cos(tiltRad);
  const visibleHalfHeight = distanceToCard * Math.tan(halfVFov);
  const cardTopY = frontY + (CARD_H / 2) * FOCUS_SCALE;
  const topMargin = 0.1;
  const lookY = cardTopY - visibleHalfHeight + topMargin;
  camera.position.set(0, lookY + 0.15, RADIUS + CAMERA_DISTANCE);
  camera.lookAt(0, lookY, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  // Flatter cards read best under flatter light: a strong ambient base with
  // a gentle key/fill on top, instead of one dominant directional light —
  // that reads as an evenly-lit printed photo, not a shaded 3D render.
  // Neutral white (not the old warm cream tint) now that the page background
  // is brand white, plus a fill light in the brand's emerald green for a
  // subtle on-brand rim tint rather than a random teal.
  scene.add(new THREE.AmbientLight(0xffffff, 1.0));

  const key = new THREE.DirectionalLight(0xffffff, 0.85);
  key.position.set(-1.4, 3.4, 3.2);
  scene.add(key);

  const fill = new THREE.DirectionalLight(0x00b87e, 0.2);
  fill.position.set(2, -1.5, 2);
  scene.add(fill);

  const cardMask = buildMaskTexture();
  const bentGeometry = buildBentGeometry();

  const tilt = new THREE.Group();
  tilt.rotation.x = -tiltRad;
  scene.add(tilt);

  const ring = new THREE.Group();
  tilt.add(ring);

  const textureLoader = new THREE.TextureLoader();
  const cards = [];

  for (let i = 0; i < RING_COUNT; i++) {
    const imgIndex = i % IMAGES.length;
    const img = IMAGES[imgIndex];
    const angle = i * ANGLE_STEP;
    const mesh = buildCard(img, bentGeometry, cardMask, textureLoader);

    mesh.userData.angle = angle;
    mesh.userData.baseScale = 1;
    mesh.userData.imgIndex = imgIndex;
    ring.add(mesh);
    cards.push(mesh);
  }

  // Service-row tags "activate" to match whichever card is currently
  // facing front — driven by the same angle math as the fade/scale
  // spotlight below, not a separate source of truth.
  const serviceItems = Array.from(document.querySelectorAll('.service-row li[data-service]'));
  let activeServiceIndex = -1;
  function setActiveService(imgIndex) {
    if (imgIndex === activeServiceIndex) return;
    activeServiceIndex = imgIndex;
    serviceItems.forEach((li) => {
      li.classList.toggle('is-active', Number(li.dataset.service) === imgIndex);
    });
  }

  // Hovering a service tag spins the ring to whichever occurrence of that
  // image is angularly closest right now (the ring repeats each image
  // several times), so it always takes the short way round. Used to be
  // wired to click, but the tags are now real links to each show's page —
  // click needs to stay a plain navigation, not get intercepted here.
  function findNearestCardForImgIndex(imgIndex) {
    let best = null;
    let bestDiff = Infinity;
    cards.forEach((mesh) => {
      if (mesh.userData.imgIndex !== imgIndex) return;
      const rawTarget = -mesh.userData.angle;
      const diff = Math.abs(Math.atan2(
        Math.sin(rawTarget - ring.rotation.y),
        Math.cos(rawTarget - ring.rotation.y)
      ));
      if (diff < bestDiff) {
        bestDiff = diff;
        best = mesh;
      }
    });
    return best;
  }

  serviceItems.forEach((li) => {
    li.addEventListener('mouseenter', () => {
      const imgIndex = Number(li.dataset.service);
      const mesh = findNearestCardForImgIndex(imgIndex);
      if (mesh) snapToCard(mesh);
    });
  });

  function layout() {
    cards.forEach((mesh) => {
      const angle = mesh.userData.angle;
      // Positioned relative to the ring's own origin — the pivot the group
      // actually rotates around — so every card stays at a fixed radius
      // from the camera's sightline through the whole spin, no matter how
      // far `ring.rotation.y` has accumulated.
      mesh.position.x = Math.sin(angle) * RADIUS;
      mesh.position.z = Math.cos(angle) * RADIUS;
      mesh.rotation.y = angle;
    });
  }
  layout();

  // --- Pointer interaction: drag to spin the ring, click a card to bring
  // it to front. A single 'mode' state machine keeps this from fighting
  // the automatic rotation: 'auto' drives ring.rotation.y itself each
  // frame, 'dragging' lets pointermove drive it directly, 'snapping'
  // eases it toward a clicked card's angle and then hands back to 'auto'.
  const raycaster = new THREE.Raycaster();
  const pointerNDC = new THREE.Vector2();
  const DRAG_SENSITIVITY = 0.0022; // radians of spin per pixel dragged
  const CLICK_MAX_MOVE = 6; // px — under this, a pointerup counts as a
                             // click rather than the end of a drag
  let mode = 'auto';
  let dragStartX = 0;
  let dragStartRotation = 0;
  let dragMoved = 0;
  let snapTarget = 0;

  function setPointerNDC(e) {
    const rect = container.getBoundingClientRect();
    pointerNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function snapToCard(mesh) {
    // Shortest angular path to the click's target, not the raw difference —
    // otherwise a card just behind the current rotation could spin the
    // long way round instead of the short way.
    const rawTarget = -mesh.userData.angle;
    const diff = Math.atan2(
      Math.sin(rawTarget - ring.rotation.y),
      Math.cos(rawTarget - ring.rotation.y)
    );
    snapTarget = ring.rotation.y + diff;
    mode = 'snapping';
  }

  container.style.touchAction = 'none'; // otherwise touch-dragging the ring
                                         // also tries to scroll the page

  container.addEventListener('pointerdown', (e) => {
    mode = 'dragging';
    dragStartX = e.clientX;
    dragStartRotation = ring.rotation.y;
    dragMoved = 0;
    container.style.cursor = 'grabbing';
    container.setPointerCapture(e.pointerId);
  });

  container.addEventListener('pointermove', (e) => {
    if (mode !== 'dragging') {
      // Not dragging — just hovering. Swap the cursor to a pointer over an
      // actual card so it reads as clickable/navigable, 'grab' everywhere
      // else in the scene.
      setPointerNDC(e);
      raycaster.setFromCamera(pointerNDC, camera);
      const hovering = raycaster.intersectObjects(cards).length > 0;
      container.style.cursor = hovering ? 'pointer' : 'grab';
      return;
    }
    const delta = e.clientX - dragStartX;
    dragMoved = Math.max(dragMoved, Math.abs(delta));
    ring.rotation.y = dragStartRotation + delta * DRAG_SENSITIVITY;
  });

  function endDrag(e) {
    if (mode !== 'dragging') return;
    container.style.cursor = 'grab';
    if (dragMoved < CLICK_MAX_MOVE) {
      setPointerNDC(e);
      raycaster.setFromCamera(pointerNDC, camera);
      const hit = raycaster.intersectObjects(cards)[0];
      if (hit) {
        // Straight to that show's page — this used to just snap the card
        // to front, which meant the card itself wasn't actually a way in;
        // only the service-row tag underneath it was.
        const url = SHOW_URLS[hit.object.userData.imgIndex];
        if (url) window.location.href = url;
        return;
      }
    }
    mode = 'auto';
  }

  container.addEventListener('pointerup', endDrag);
  container.addEventListener('pointercancel', endDrag);

  function resize() {
    const rect = container.getBoundingClientRect();
    camera.aspect = rect.width / rect.height;
    camera.updateProjectionMatrix();
    renderer.setSize(rect.width, rect.height);
  }

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();

  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;

    if (mode === 'auto') {
      if (!reduceMotion) ring.rotation.y -= ROTATE_SPEED * dt;
    } else if (mode === 'snapping') {
      ring.rotation.y = THREE.MathUtils.lerp(ring.rotation.y, snapTarget, 0.12);
      if (Math.abs(snapTarget - ring.rotation.y) < 0.0015) {
        ring.rotation.y = snapTarget;
        mode = 'auto';
      }
    }
    // mode === 'dragging': rotation is driven directly by pointermove above.

    let frontImgIndex = -1;
    let minAbsAngle = Infinity;

    cards.forEach((mesh) => {
      const worldAngle = mesh.userData.angle + ring.rotation.y;
      const wrapped = Math.atan2(Math.sin(worldAngle), Math.cos(worldAngle));
      const absAngle = Math.abs(wrapped);

      if (absAngle < minAbsAngle) {
        minAbsAngle = absAngle;
        frontImgIndex = mesh.userData.imgIndex;
      }

      // Gently scale up whichever card is currently closest to facing the
      // camera dead-on — a spotlight that follows the rotation itself, not
      // the pointer.
      const focus = THREE.MathUtils.clamp(1 - absAngle / (ANGLE_STEP * 1.6), 0, 1);
      const targetScale = 1 + focus * (FOCUS_SCALE - 1);
      mesh.scale.setScalar(THREE.MathUtils.lerp(mesh.scale.x, targetScale, 0.1));

      // Fade cards out the further round the ring they sit, over a much
      // wider window than the scale spotlight above — so the ones trailing
      // into the background stay visible (you can still tell what they
      // are) but read as dimmer, receding depth rather than fully lit,
      // instead of popping at full brightness right up until they're
      // edge-on.
      const fadeRange = Math.PI * 0.46;
      let fade = THREE.MathUtils.clamp(1 - absAngle / fadeRange, 0, 1);
      fade = fade * fade * (3 - 2 * fade); // smoothstep
      const minOpacity = 0.32;
      const targetOpacity = THREE.MathUtils.lerp(minOpacity, 1, fade);
      mesh.material.opacity = THREE.MathUtils.lerp(mesh.material.opacity, targetOpacity, 0.08);
    });

    setActiveService(frontImgIndex);

    renderer.render(scene, camera);
  }

  requestAnimationFrame((t) => {
    last = t;
    frame(t);
  });
}

function buildBentGeometry() {
  const geo = new THREE.PlaneGeometry(CARD_W, CARD_H, SEGMENTS_X, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const t = x / (CARD_W / 2); // -1 (left) .. 1 (right)
    const z = -BEND * (1 - Math.cos((t * Math.PI) / 2));
    pos.setZ(i, z);
  }
  geo.computeVertexNormals();
  return geo;
}

function buildMaskTexture() {
  // High resolution + a hairline-soft edge (rather than a hard binary
  // cutoff via alphaTest) is what actually makes a rounded corner look
  // crisp once the card is rendered at several hundred pixels on screen —
  // at 256px the corner arc was only a handful of texels, so it scaled up
  // into a visibly "chewed"/stair-stepped curve.
  const w = 1024;
  const h = Math.round((w * CARD_H) / CARD_W);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#fff';
  const radius = w * 0.045; // tighter corner — reads as a crisp flat card
  ctx.beginPath();
  ctx.roundRect(0, 0, w, h, radius);
  ctx.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.needsUpdate = true;
  // Mipmapped/anisotropic sampling of the alpha mask is what was actually
  // causing the vertical seams (not the photo texture) — the derivative
  // discontinuity at every segment boundary shows up as a visible seam in
  // the alpha channel, i.e. exactly a thin vertical line. Plain linear
  // sampling has no derivative-based LOD to go wrong.
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  return tex;
}

function buildCard(img, geometry, maskTexture, loader) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.9,
    metalness: 0,
    alphaMap: maskTexture,
    transparent: true, // smooth, antialiased edge instead of alphaTest's
    depthWrite: true,  // hard binary cutoff — depthWrite kept on so the
    side: THREE.DoubleSide, // curved cards still sort/occlude correctly.
    // DoubleSide: past the ring's midpoint a card's front face points away
    // from the camera — with FrontSide that half of the ring simply never
    // rendered (backface culled), instead of fading into the distance.
  });

  const mesh = new THREE.Mesh(geometry, material);

  loader.load(img.src, (tex) => {
    tex.colorSpace = THREE.SRGBColorSpace;
    // Mipmapping picks its LOD from the screen-space derivative of the UVs;
    // on a bent surface that derivative spikes right at the fold, which
    // shows up as a bright vertical seam down the middle of every card.
    // Turning mipmaps off (we're always viewing these large and close, so
    // minification aliasing isn't a real concern) removes it entirely.
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    const cardRatio = CARD_W / CARD_H;
    if (img.ratio >= cardRatio) {
      tex.repeat.set(cardRatio / img.ratio, 1);
      tex.offset.set((1 - tex.repeat.x) / 2, 0);
    } else {
      tex.repeat.set(1, img.ratio / cardRatio);
      tex.offset.set(0, (1 - tex.repeat.y) / 2);
    }
    material.map = tex;
    material.needsUpdate = true;
  });

  return mesh;
}
