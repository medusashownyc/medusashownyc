import * as THREE from 'three';

// Medusa Show — WebGL curved-card carousel.
// Cards sit at fixed angular positions on a ring; the whole ring rotates
// continuously around its centre (a real circular motion path, not a
// left-right slide). Each card is also a genuinely bent plane — vertices
// pushed back in Z along a cosine curve, normals recomputed, lit by a real
// directional light — so the curve you see is actual geometry + shading,
// not a faked gradient.

const IMAGES = [
  { src: 'images/belly-dance.jpg', ratio: 690 / 1035, alt: 'Bailarina de danza árabe girando sobre el escenario' },
  { src: 'images/fuego.jpg', ratio: 690 / 1035, alt: 'Performer de fuego girando antorchas encendidas en la oscuridad' },
  { src: 'images/garotas.jpg', ratio: 684 / 1024, alt: 'Garota de carnaval brasileño con tocado de plumas turquesa' },
  { src: 'images/gogo.jpg', ratio: 686 / 1028, alt: 'Gogo dancer en silueta sobre plataforma con luces de club' },
  { src: 'images/salsa.jpg', ratio: 690 / 1035, alt: 'Pareja de baile profesional en pose de salsa' },
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

// 1:1 — square cards, per reference. object-fit: cover crops each source
// photo to fit (they're mostly portrait), same as before.
const CARD_W = 5.6;
const CARD_H = 5.6;
const GAP = 0.5;
// No fixed BEND constant — each card's curve is derived from RADIUS
// (below) so it follows the ring's own arc exactly. Adjacent cards then
// continue one unbroken circle instead of reading as flat facets joined
// at angles.
const SEGMENTS_X = 32; // the bend runs left-to-right across each card now,
                        // not top-to-bottom — matches the reference.
const RING_COUNT = 18; // positions around the ring (images repeat). This is
                        // the actual lever for how much of the frame's
                        // *width* the ring fills at a fixed CAMERA_DISTANCE:
                        // RADIUS (below) grows with it, and a card's max
                        // possible apparent angle from the camera is capped
                        // by the RADIUS:CAMERA_DISTANCE ratio — past that
                        // cap, no amount of extra FOV reveals more cards,
                        // it just adds empty margin either side. Doesn't
                        // change how big any individual card reads (that's
                        // CARD_W vs. CAMERA_DISTANCE) — the two are
                        // independent levers for size vs. spread.
const ANGLE_STEP = (Math.PI * 2) / RING_COUNT;
const RADIUS = (CARD_W + GAP) / ANGLE_STEP;
const ROTATE_SPEED = 0.04; // radians / second — scaled with ANGLE_STEP so
                            // each card still spends a proportional amount
                            // of time near the front. Roughly half the old
                            // speed's rate of "new card arriving up front" —
                            // reads as a slow, deliberate drift.
const CAMERA_DISTANCE = 10; // from the ring's edge, not its centre — kept
                              // large relative to RADIUS (a "telephoto"
                              // shot) so the ratio between the front card's
                              // distance and a side card's distance stays
                              // close to 1:1. That's what actually kills
                              // the up/down "bobbing": with the camera
                              // sitting right at the ring's edge (old
                              // value: 3), a card swinging from the side to
                              // the front changes distance ~6x, and that
                              // swing — combined with the camera's pitch —
                              // reads as vertical motion, not just a spin.
const RING_TILT_DEG = 0; // flat, upright ring — no tilt. The "look up into
                          // it" effect instead comes purely from the
                          // camera's pitch below (CAMERA_LOOK_UP), so the
                          // cards themselves stay vertical, not tipped
                          // back.
const CAMERA_LOOK_UP = 1.1; // how far below the look-at point the camera
                             // sits, in world units — this is what angles
                             // the *view* upward without touching the
                             // ring's own geometry.
const CAMERA_FOV_DEG = 33; // narrow — paired with the large CAMERA_DISTANCE
                            // above to keep the front card's on-screen size
                            // the same while flattening the perspective
                            // (a telephoto lens, not a wide-angle one close
                            // up). Narrower FOV also means less keystoning
                            // at the card's own left/right edges. This is a
                            // *vertical* FOV (three.js convention) — on a
                            // narrow/portrait container the resulting
                            // horizontal FOV shrinks along with the aspect
                            // ratio, so it's only the floor for wide
                            // screens; see MIN_HORIZONTAL_FOV_DEG below.
const MIN_HORIZONTAL_FOV_DEG = 50; // on a narrow/portrait screen, holding
                                    // the vertical FOV fixed at
                                    // CAMERA_FOV_DEG starves the horizontal
                                    // FOV — it can end up narrower than a
                                    // single card's own angular width, so
                                    // the "front card" can't fully fit
                                    // between the frame edges and the ring
                                    // reads as stuck/off-centre rather than
                                    // a card properly framed dead-centre.
                                    // updateCameraFraming() widens the
                                    // vertical FOV as needed (never
                                    // narrows it) so the horizontal FOV
                                    // never drops below this floor.
const FOCUS_SCALE = 1.04; // must match the scale bump applied to the
                           // front-facing card in the animation loop below.
                           // Kept subtle — a big scale pop reads as the
                           // same unwanted "bounce" as the vertical bob.
const FOG_NEAR = CAMERA_DISTANCE + RADIUS * 0.75; // held off well past the
                                       // side cards — those should still
                                       // read clearly, not just the front.
const FOG_FAR = CAMERA_DISTANCE + RADIUS * 2.4; // fully white only out near
                                                  // the back of the ring —
                                                  // the fade is a late,
                                                  // narrow tail, not
                                                  // something that starts
                                                  // eating into the sides.

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
  // Matches the page's white background (styles.css --bg), so cards don't
  // fade to a visible grey/black box — they genuinely dissolve into the
  // page behind the canvas, reading as "lost in the distance" rather than
  // just dimmed. FOG_NEAR sits just past the front card so it stays fully
  // crisp; by FOG_FAR (out past where the ring curves toward edge-on) a
  // card is fully white and its own fading opacity finishes the job.
  scene.fog = new THREE.Fog(0xffffff, FOG_NEAR, FOG_FAR);

  // The ring group rotates around its own local origin (0,0,0) — so that
  // origin MUST be the circle's true centre, or cards swing through the
  // wrong arc as the ring spins (some passing much closer to the camera
  // than intended, ballooning in size). Camera distance is measured from
  // that same centre, out past the ring's radius.
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV_DEG, 1, 1, 120);

  // RING_TILT_DEG is kept generic (rather than hard-coding a flat ring) so
  // a tilt can be reintroduced later without touching this math — only the
  // spin (ring.rotation.y, applied to a child group) animates; the whole
  // ring is one rigid disk, tilted or not.
  const tiltRad = THREE.MathUtils.degToRad(RING_TILT_DEG);
  const frontY = RADIUS * Math.sin(tiltRad);
  const camZ = RADIUS + CAMERA_DISTANCE; // camera's world Z — fixed regardless of tilt/pitch/FOV
  const frontCardZ = RADIUS * Math.cos(tiltRad);
  const cardTopY = frontY + (CARD_H / 2) * FOCUS_SCALE;
  const topMargin = 0.1;

  // Solved, not guessed: how much world-space height the camera actually
  // sees at the front card's depth, given its FOV, distance AND pitch —
  // then aim just high enough that the (scaled-up, focused) card's own
  // top edge clears the frame by a small margin, instead of leaving a lot
  // of unused headroom above it (or, if this math is skipped, cropping the
  // card outright once CAMERA_LOOK_UP tilts the view enough to matter).
  //
  // CAMERA_LOOK_UP moves the camera below its look-at point, which pitches
  // the whole view upward — so the frustum's top edge is no longer simply
  // "distance × tan(halfFOV)" above the look-at height the way it is for a
  // level camera. It's derived properly here instead of eyeballed: find
  // the camera's actual (pitched) up vector and forward vector, project
  // the top-of-frustum ray out to the front card's depth, and solve for
  // the lookY that lands that ray's world-space Y exactly on the card's
  // top edge (plus topMargin).
  //
  // Takes the *vertical* FOV to use as a parameter (rather than always
  // reading CAMERA_FOV_DEG) because updateCameraFraming() below widens it
  // per-aspect-ratio — re-run on every resize, not just once at startup,
  // since the same fixed vertical FOV that frames things properly on a
  // wide desktop window starves the horizontal FOV on a narrow/portrait
  // one (see MIN_HORIZONTAL_FOV_DEG).
  function frameCamera(verticalFovDeg) {
    const halfVFov = THREE.MathUtils.degToRad(verticalFovDeg) / 2;
    const tanHalfVFov = Math.tan(halfVFov);
    // L: length of the (CAMERA_LOOK_UP, camZ) leg — i.e. the camera-to-lookAt
    // distance projected into the Y-Z plane (X=0 throughout, no roll).
    const L = Math.hypot(CAMERA_LOOK_UP, camZ);
    // d: camera-space depth (along the pitched forward axis) at which the
    // view ray reaches the front card's Z plane.
    const d = (L * (camZ - frontCardZ)) / (camZ - tanHalfVFov * CAMERA_LOOK_UP);
    const lookY =
      cardTopY +
      topMargin +
      CAMERA_LOOK_UP -
      (d / L) * (CAMERA_LOOK_UP + tanHalfVFov * camZ);
    camera.fov = verticalFovDeg;
    camera.position.set(0, lookY - CAMERA_LOOK_UP, camZ);
    camera.lookAt(0, lookY, 0);
  }

  // Widen the vertical FOV just enough that the horizontal FOV — which
  // shrinks along with a narrow/portrait aspect ratio even with the
  // vertical FOV held fixed — never drops below MIN_HORIZONTAL_FOV_DEG.
  // Never narrows below the base CAMERA_FOV_DEG (that's the desktop
  // framing, already tuned). Math mirrors three.js's own vertical↔aspect
  // relationship: horizontalHalf = atan(aspect × tan(verticalHalf)), so
  // solved the other way: verticalHalf = atan(tan(horizontalHalf) / aspect).
  function verticalFovForAspect(aspect) {
    const minHorizontalHalfRad = THREE.MathUtils.degToRad(MIN_HORIZONTAL_FOV_DEG) / 2;
    const neededVerticalDeg = THREE.MathUtils.radToDeg(
      Math.atan(Math.tan(minHorizontalHalfRad) / aspect)
    ) * 2;
    return Math.max(CAMERA_FOV_DEG, neededVerticalDeg);
  }

  function updateCameraFraming() {
    const rect = container.getBoundingClientRect();
    const aspect = rect.width / rect.height;
    camera.aspect = aspect;
    frameCamera(verticalFovForAspect(aspect));
    camera.updateProjectionMatrix();
  }

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
    updateCameraFraming();
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

      // Per reference: side/background cards read fully opaque, cropped by
      // the canvas edge rather than dissolving into it — only cards well
      // round toward the back actually dim, and only a little.
      const fadeRange = Math.PI * 0.85;
      let fade = THREE.MathUtils.clamp(1 - absAngle / fadeRange, 0, 1);
      fade = fade * fade * (3 - 2 * fade); // smoothstep
      const minOpacity = 0.9;
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
    // x is arc-length along the ring's own circumference (that's how
    // RADIUS was derived from CARD_W in the first place), so treating it
    // as an angle swept at that RADIUS and sagging back by the circle's
    // own cosine reproduces the ring's exact curvature — this card's
    // surface sits flush on the same circle its neighbours do, instead of
    // approximating it with an arbitrary curve.
    const z = RADIUS * (Math.cos(x / RADIUS) - 1);
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
