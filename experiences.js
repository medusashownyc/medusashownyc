const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

// Self-playing, endless 3D "image tunnel" for the Experiences section: a
// corridor built from four walls (left, right, ceiling, floor), each
// tiled with a regular grid of photo frames receding into the distance.
// The camera never moves — instead every frame's own Z position is
// continuously advanced on each animation-frame tick and wrapped back to
// the far end once it passes the camera, so the flight-through loops
// forever with no scroll input required. Frames fade in as they emerge
// from the fog at the far end and fade out right before they'd pass the
// camera, which hides the wrap seam.
//
// #experiences is still a tall spacer — .experiences-stage inside it is
// what's actually sticky/pinned full-screen (see styles.css) — so
// scrolling through the section keeps the effect centered on screen for
// a while, but the tunnel itself keeps flying regardless of scroll
// position; it only starts/stops based on whether the stage is actually
// on screen (so it isn't burning cycles while scrolled past).

gsap.registerPlugin(ScrollTrigger);

const outer = document.getElementById('experiences');
const stage = document.querySelector('.experiences-stage');
const tunnel = document.getElementById('experiencesTunnel');

const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// Every photo actually supplied for the show (assets/images/) — not just
// the six show-category cover shots — so the tunnel reads as a wide mix
// instead of six images repeating. No placeholder/stock images mixed in.
const IMAGES = [
  { src: 'assets/images/whatsapp_image_2026_08_04_at_4_43_53_pm_2_1.webp', alt: 'Garotas de carnaval en grupo con plumas multicolor' },
  { src: 'assets/images/whatsapp_image_2026_08_04_at_4_43_52_pm_1_1.webp', alt: 'Garotas de carnaval en pose grupal con tocados de plumas' },
  { src: 'assets/images/whatsapp_image_2026_08_04_at_4_43_52_pm_2_1.webp', alt: 'Garotas de carnaval sonriendo con plumas rojas y amarillas' },
  { src: 'assets/images/whatsapp_image_2026_08_04_at_4_43_53_pm_1_1.webp', alt: 'Garotas de carnaval de perfil con tocados de plumas' },
  { src: 'assets/images/whatsapp_image_2026_08_04_at_4_43_53_pm_3_1.webp', alt: 'Bailarinas de danza árabe en trío con vestuario dorado y verde' },
  { src: 'assets/images/whatsapp_image_2026_08_04_at_4_43_53_pm_4_1.webp', alt: 'Bailarinas de danza árabe posando en grupo' },
  { src: 'assets/images/whatsapp_image_2026_08_04_at_4_43_53_pm_1.webp', alt: 'Garotas de carnaval en pose dinámica de grupo' },
  { src: 'assets/images/whatsapp_image_2026_08_04_at_4_43_54_pm_1_1.webp', alt: 'Bailarinas de danza árabe con vestuario verde, dorado y lila' },
  { src: 'assets/images/whatsapp_image_2026_08_04_at_4_43_54_pm_1.webp', alt: 'Bailarinas de danza árabe en pose expresiva' },
  { src: "assets/images/img_0539_jpg_1 (1).webp", alt: 'Contorsionistas en catsuit de encaje blanco' },
  { src: "assets/images/img_0551_jpg_1 (1).webp", alt: 'Performer con sombrero de mariachi' },
  { src: "assets/images/imgl5742_1 (1).webp", alt: 'Performer en aro aéreo sobre el escenario' },
  { src: 'assets/images/img_0487_1.webp', alt: 'Pareja de salsa en pose de levantada' },
  { src: 'assets/images/img_0488_1.webp', alt: 'Pareja de salsa en pose cercana' },
  { src: 'assets/images/img_0491_1.webp', alt: 'Pareja de salsa en pose dinámica' },
  { src: 'assets/images/imgl5533_1.webp', alt: 'Performer en aro aéreo con luces de club' },
  { src: 'assets/images/imgl2348_1.webp', alt: 'Bailarinas de danza árabe en trío, pose lateral' },
  { src: 'assets/images/imgl2677_1_1.webp', alt: 'Bailarina de danza árabe en vestuario dorado' },
  { src: 'assets/images/imgl2909_1_1.webp', alt: 'Bailarinas de danza árabe en trío, vestuario verde, dorado y lila' },
  { src: 'assets/images/imgl2689_1_1.webp', alt: 'Bailarina de danza árabe en vestuario dorado' },
  { src: 'assets/images/imgl2700_1.webp', alt: 'Bailarina de danza árabe con falda al vuelo' },
  { src: 'assets/images/imgl5409_1.webp', alt: 'Performers de fuego con abanico encendido en la calle' },
  { src: 'assets/images/imgl5428_1.webp', alt: 'Performers de fuego en la calle de noche' },
  { src: 'assets/images/img_0516_jpg_1.webp', alt: 'Contorsionistas gemelas de pelo rojo' },
  { src: 'assets/images/img_0528_jpg_1.webp', alt: 'Gogo dancers con botas de plataforma neón' },
  { src: 'assets/images/img_0514_jpg_1.webp', alt: 'Contorsionistas gemelas en pose de arco' },
];

if (outer && stage && tunnel && !prefersReduced) {
  // Deterministic PRNG (mulberry32) — the tunnel's layout (which image
  // goes where, its small jitter) is the same on every load instead of
  // reshuffling itself on refresh.
  function mulberry32(seed) {
    return function random() {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const rand = mulberry32(20260819);

  // All distances are in vmin, matching .experiences-stage's
  // `perspective: 250vmin` — keeping everything in the same
  // viewport-relative unit means the whole scene stays correct at any
  // screen size with zero JS resize handling.
  const PERSPECTIVE = 250;
  const RING_DEPTH = 44; // sets how deep the tunnel's fog/birth point is
  const DEPTH_ROWS = 6; // depth "budget", in ring-widths, of the loop
  const WX = 44; // wall half-width (left/right frame offset)
  const WY = 30; // wall half-height (ceiling/floor frame offset)

  // Frames loop between FAR_Z (where they're born, in the fog) and
  // NEAR_Z (how close to the camera they're allowed to get before
  // wrapping back to FAR_Z). Kept well short of the perspective plane —
  // not just to avoid the divide-by-zero "flip" point, but because the
  // apparent scale-up (~PERSPECTIVE/(PERSPECTIVE-z)) gets severe well
  // before that: frames were both ballooning in size enough to overlap
  // neighboring depth slots on screen, AND, being nearly edge-on wall
  // frames, stretching into a distorted, "twisted" trapezoid at extreme
  // close range. 0.48 keeps the max scale-up around 2x instead of 3x+.
  const FAR_Z = -(DEPTH_ROWS + 1) * RING_DEPTH;
  const NEAR_Z = PERSPECTIVE * 0.48;
  const PERIOD = NEAR_Z - FAR_Z;

  // How much of the loop, at each end, is spent fading in/out. Frames
  // stay fully opaque for nearly the whole ride — this window only
  // exists to hide the wrap itself (a frame would otherwise pop, fully
  // visible, at the instant it jumps from NEAR_Z back to FAR_Z).
  const FADE_FRACTION = 0.035;

  const FLIGHT_SPEED = 34; // vmin/second

  // The sign each wall's rotation needs so its face turns INWARD, toward
  // the tunnel's center line, instead of outward/away from it — that's
  // what makes the floor read as "lying flat, seen from above", the
  // ceiling as "seen from below", and the side walls as "facing across
  // the corridor" rather than everything facing off into empty space.
  // Kept as one named lookup (rather than hardcoded +/- in each branch
  // below) specifically so it can be flipped per-wall in one place if the
  // debug grid (below) ever shows a wall still facing the wrong way.
  const WALL_SIGN = { left: 1, right: -1, ceiling: -1, floor: 1 };

  // A faint wireframe on all four walls — purely a perspective sanity
  // check: with the tunnel's real box shape drawn out in straight grid
  // lines, it's immediately obvious whether the box reads as a correct
  // receding corridor (lines converging cleanly toward the vanishing
  // point) or something's inside-out/mismatched, in a way that's much
  // harder to judge by eye from the photos alone.
  //
  // Drawn on a <canvas> with a hand-rolled perspective projection —
  // matching PERSPECTIVE/FAR_Z/NEAR_Z above — rather than as CSS/DOM
  // elements living inside .experiences-tunnel's own preserve-3d scene.
  // Two earlier approaches both still flickered there: a repeating-
  // gradient texture (browsers don't mipmap backgrounds across a
  // perspective transform, so a moving pattern's sub-pixel alignment
  // recalculates unreliably every frame) and then real 3D line elements
  // (which fixed that, but still shared the same 3D stacking context as
  // ~70 independently-Z-animating photo frames — browsers don't
  // guarantee stable paint ordering across that many overlapping,
  // simultaneously-moving 3D elements, so which of two things rendered
  // "in front" could flip frame to frame). A canvas has neither problem:
  // it's one flat surface we redraw ourselves every tick with an
  // explicit draw order we decide — nothing left for the browser's own
  // compositing heuristics to get inconsistent about.
  const canvas = document.getElementById('experiencesGridCanvas');
  const ctx = canvas.getContext('2d');
  // Full half-extent, no inset — a canvas draws in one explicit pass (no
  // z-fighting to worry about, unlike the earlier DOM-based grid this
  // replaced), so there's no longer any reason for adjacent walls not to
  // meet exactly at each corner of the tunnel. A gap here read as an
  // ugly cut right where the walls should join.
  const GRID_CELL_TARGET = 22; // vmin between rungs — see rungCount below
  const LONG_LINES_PER_WALL = 3;

  // Maps a point in a wall's own 2D local space — freeAxisPos (its
  // position across the wall's free axis) and depthPos (0 at FAR_Z,
  // PERIOD at NEAR_Z) — to a real 3D point in the tunnel.
  function wallPoint(kind, freeAxisPos, depthPos) {
    const z = FAR_Z + depthPos;
    if (kind === 'floor') return [freeAxisPos, WY, z];
    if (kind === 'ceiling') return [freeAxisPos, -WY, z];
    if (kind === 'left') return [-WX, freeAxisPos, z];
    return [WX, freeAxisPos, z]; // right
  }

  const WALL_KINDS = ['floor', 'ceiling', 'left', 'right'];
  const longLines = []; // static: {kind, pos}
  const rungs = []; // moving: {kind, phase, freeExtent}

  // Rung count is rounded to the nearest whole number and the spacing
  // (PERIOD / rungCount) recomputed from that, rather than using
  // GRID_CELL_TARGET directly — that guarantees the rungs' spacing
  // divides PERIOD exactly, so the wrap continues the same rhythm with
  // zero gap or overlap. Using GRID_CELL_TARGET as a literal step (plus
  // an extra rung to cover the remainder) left an uneven, tighter gap
  // right at the seam — that's the "doubled cut" where the loop reset.
  const rungCount = Math.round(PERIOD / GRID_CELL_TARGET);
  const rungSpacing = PERIOD / rungCount;

  WALL_KINDS.forEach((kind) => {
    const isHorizontal = kind === 'floor' || kind === 'ceiling';
    const freeExtent = isHorizontal ? 2 * WX : 2 * WY;
    for (let i = 0; i < LONG_LINES_PER_WALL; i++) {
      const pos = -freeExtent / 2 + ((i + 0.5) / LONG_LINES_PER_WALL) * freeExtent;
      longLines.push({ kind, pos });
    }
    for (let i = 0; i < rungCount; i++) {
      rungs.push({ kind, phase: i * rungSpacing, freeExtent });
    }
  });

  // stageW/stageH/vmin are recomputed on resize (see below); project()
  // reads them fresh each call, so a resize takes effect on the very
  // next draw with no extra plumbing.
  let stageW = 0;
  let stageH = 0;
  let vmin = 0;

  function resizeGridCanvas() {
    const rect = stage.getBoundingClientRect();
    stageW = rect.width;
    stageH = rect.height;
    vmin = Math.min(stageW, stageH) / 100;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = stageW * dpr;
    canvas.height = stageH * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Same perspective-divide formula the CSS `perspective: 250vmin` on
  // .experiences-stage produces for the photo frames — keeping both in
  // vmin (converted to real px only at the very last step here) is what
  // keeps the canvas grid and the CSS-driven photos in agreement.
  //
  // originShiftX/Y (px) is where the mouse-follow effect below moves the
  // vanishing point to — plugged into the exact same
  // `origin + (point - origin) * scale` formula the CSS perspective-
  // origin property itself uses, not just added as a flat pan. That's
  // what makes it real parallax rather than a slide: since scale is 1 at
  // z=0 and drifts away from 1 the farther a point is from that plane,
  // (1 - scale) is near zero for close-to-camera geometry and grows for
  // deep background geometry, so near and far lines swing by different
  // amounts — exactly like actually turning to look toward a side of the
  // room, the way the reference tunnel's mouse-follow reads.
  function project(x, y, z, originShiftX, originShiftY) {
    const scale = PERSPECTIVE / (PERSPECTIVE - z);
    return {
      sx: stageW / 2 + originShiftX * (1 - scale) + x * vmin * scale,
      sy: stageH / 2 + originShiftY * (1 - scale) + y * vmin * scale,
    };
  }

  function drawGrid(originShiftX, originShiftY) {
    ctx.clearRect(0, 0, stageW, stageH);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1.5;

    longLines.forEach(({ kind, pos }) => {
      const a = project(...wallPoint(kind, pos, 0), originShiftX, originShiftY);
      const b = project(...wallPoint(kind, pos, PERIOD), originShiftX, originShiftY);
      ctx.globalAlpha = 0.04;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    });

    rungs.forEach(({ kind, phase, freeExtent }) => {
      const t = (((phase + flight) % PERIOD) + PERIOD) % PERIOD;
      const progress = t / PERIOD;
      const fadeIn = gsap.utils.clamp(0, 1, progress / FADE_FRACTION);
      const fadeOut = gsap.utils.clamp(0, 1, (1 - progress) / FADE_FRACTION);
      const alpha = fadeIn * fadeOut * 0.04;
      if (alpha <= 0.01) return;
      const a = project(...wallPoint(kind, -freeExtent / 2, t), originShiftX, originShiftY);
      const b = project(...wallPoint(kind, freeExtent / 2, t), originShiftX, originShiftY);
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(b.sx, b.sy);
      ctx.stroke();
    });

    ctx.globalAlpha = 1;
  }

  resizeGridCanvas();
  window.addEventListener('resize', () => {
    resizeGridCanvas();
    drawGrid(originShiftX, originShiftY);
  });

  // Mouse-follow "look around" — moving the cursor toward one side of
  // the stage nudges the vanishing point toward the OPPOSITE side, so
  // more of the wall the cursor is pointing at comes into view (the same
  // way turning your head left brings the left wall into view — the
  // vanishing point/your view center moves right relative to your head).
  // mouseX/mouseY are the raw, immediate target (-1..1, one axis per
  // side of center, already inverted below); originX/originY are what
  // actually drives the render, eased toward that target a little every
  // tick (see the ticker below) instead of snapping straight to it, so
  // the look-around reads as a smooth drift rather than a jump cut every
  // time the mouse moves.
  const ORIGIN_RANGE = 10; // vmin — how far the vanishing point can travel
  let mouseX = 0;
  let mouseY = 0;
  let originX = 0;
  let originY = 0;
  let originShiftX = 0;
  let originShiftY = 0;

  stage.addEventListener('pointermove', (event) => {
    const rect = stage.getBoundingClientRect();
    mouseX = -gsap.utils.clamp(-1, 1, ((event.clientX - rect.left) / rect.width - 0.5) * 2);
    mouseY = -gsap.utils.clamp(-1, 1, ((event.clientY - rect.top) / rect.height - 0.5) * 2);
  });
  stage.addEventListener('pointerleave', () => {
    mouseX = 0;
    mouseY = 0;
  });

  const walls = ['left', 'right', 'ceiling', 'floor'];
  const specs = [];

  // Stratified placement per wall: each wall is divided into a coarse
  // ALONG_SLOTS x DEPTH_SLOTS grid of non-overlapping cells, and every
  // frame is jittered only within its own cell (not the full wall) —
  // that's what guarantees frames never pile up on/through each other
  // while still not lining up into a mechanical, identical-looking grid
  // (each cell's image is also picked independently at random, so
  // there's no repeating pattern either). Rotation is flush with the
  // wall itself — close to the same 90° the debug grid above uses — so
  // a frame reads as actually mounted on the floor/wall/ceiling instead
  // of floating in front of it at a random tilt.
  // Fewer, more spread-out slots than before: near the camera end,
  // perspective compresses even fairly different depths into similar
  // screen space, so a denser grid was overlapping there no matter how
  // cleanly separated the frames were in actual 3D world space. Fewer
  // cells means more real distance between neighbors in both directions,
  // enough margin that the near-camera compression doesn't erase it.
  //
  // The side walls (left/right) get fewer along-slots than the
  // floor/ceiling: their free axis is WY (30) vs WX (44) for the
  // floor/ceiling, but frames are sized the same regardless of wall — 3
  // slots along a shorter axis packed frames closer together than their
  // own height, guaranteeing overlap no matter how tightly jittered.
  const DEPTH_SLOTS = 3;
  const depthStep = (NEAR_Z - FAR_Z) / DEPTH_SLOTS;

  walls.forEach((wall) => {
    const isSideWall = wall === 'left' || wall === 'right';
    // Capped at 2 per row on every wall (ceiling/floor used to get 3,
    // which — combined with bigger frame sizes — read as images
    // climbing/stacking on top of each other along that row).
    const alongSlots = 2;
    const alongStep = 2 / alongSlots; // "along" ranges -1..1
    for (let a = 0; a < alongSlots; a++) {
      for (let d = 0; d < DEPTH_SLOTS; d++) {
        // Wider spread (and squared so most frames land small-to-mid with
        // occasional large standouts) so the wall reads as a mix of sizes
        // rather than a uniform grid. Computed before the along/depth
        // jitter below so a big frame's jitter can be reined in — a large
        // frame given the same jitter budget as a small one is what was
        // pushing neighboring slots into each other and reading as frames
        // stacked on top of one another.
        // Capped so even the largest frame at zero jitter stays within one
        // slot's own share of the wall (see `spread` below) — with only 2
        // slots per row now, a max-size frame bigger than that overlapped
        // its neighbor regardless of how little the jitter budget was.
        const sizeRand = rand() * rand();
        const size = (isSideWall ? 8 : 10) + sizeRand * (isSideWall ? 14 : 22); // vmin, width
        const jitterScale = 1 - sizeRand * 0.7;
        const alongCenter = -1 + (a + 0.5) * alongStep;
        const along = alongCenter + (rand() - 0.5) * alongStep * 0.4 * jitterScale;
        const depthCenter = FAR_Z + (d + 0.5) * depthStep;
        const baseZ = depthCenter + (rand() - 0.5) * depthStep * 0.4 * jitterScale;
        const image = IMAGES[Math.floor(rand() * IMAGES.length)];
        // Flush with the wall, close to (but not quite) the debug grid's
        // true 90° — full 90 was fine as long as the camera looked
        // straight down the tunnel, but the mouse-follow parallax (see
        // "look around" below) shifts the effective viewing angle per
        // frame, and a frame already sitting exactly edge-on had no
        // buffer left before that shift pushed it past grazing into a
        // visibly warped/detached sliver. A few degrees of margin here
        // keeps every frame comfortably shy of that regardless of where
        // the vanishing point drifts to.
        const rake = 87 + rand() * 3; // 87-90deg — flush against the wall, not propped off it
        // No rotateZ roll: GSAP composes transforms as translate, then
        // rotationX, rotationY, rotationZ in that order, so a Z roll
        // here would apply AFTER the wall's own ~80° Y rotation above —
        // at that point the frame's local Z axis no longer points along
        // the wall's normal, it's swung around toward the world X axis,
        // so a "roll" there actually tips the frame's face out of the
        // wall's plane instead of just rotating it in-place within it.
        // That mismatch between the intended in-plane tilt and what it
        // actually did was the twisted/detached look reported.
        const tilt = 0;
        let x = 0;
        let y = 0;
        let rx = 0;
        let ry = 0;
        // x/y here match the grid walls' own offset exactly (WX/WY, no
        // extra push-out) — that's what puts a frame's plane flush on the
        // wall surface itself instead of hovering slightly off of it.
        // The 0.55 pull-in keeps frames clustered toward the middle of
        // each wall — near along's extremes (close to ±1) put a frame
        // right where two walls meet, in the corner, which read as
        // cluttered/awkward rather than looking like part of either wall.
        // Tuned so the gap between slot centers comes out to roughly the
        // same real vmin distance on both wall types despite their
        // different half-extents (WY=30 vs WX=44) and slot counts (2 vs
        // 3) — without that, whichever axis ended up with less room per
        // slot than a frame's own size would overlap regardless of jitter.
        const spread = 0.85;
        if (wall === 'left') { x = -WX; y = along * WY * spread; ry = WALL_SIGN.left * rake; }
        if (wall === 'right') { x = WX; y = along * WY * spread; ry = WALL_SIGN.right * rake; }
        if (wall === 'ceiling') { y = -WY; x = along * WX * spread; rx = WALL_SIGN.ceiling * rake; }
        if (wall === 'floor') { y = WY; x = along * WX * spread; rx = WALL_SIGN.floor * rake; }
        specs.push({ x, y, z: baseZ, rx, ry, rz: tilt, size, image, wall });
      }
    }
  });

  // Click-to-enlarge: a frame in the tunnel is small, foreshortened and
  // often nearly edge-on (that's the whole "mounted on the wall" look) —
  // clicking it opens the actual photo full-size instead of that being
  // the only way anyone ever sees it clearly.
  const lightbox = document.createElement('div');
  lightbox.className = 'experiences-lightbox';
  lightbox.innerHTML =
    '<figure><img alt=""><button type="button" class="experiences-lightbox-close" aria-label="Cerrar">&times;</button></figure>';
  document.body.appendChild(lightbox);
  const lightboxImg = lightbox.querySelector('img');
  let lightboxOpen = false;

  function openLightbox(image) {
    lightboxImg.src = image.src;
    lightboxImg.alt = image.alt;
    lightbox.classList.add('is-open');
    lightboxOpen = true;
  }
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightboxOpen = false;
  }
  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox || e.target.closest('.experiences-lightbox-close')) closeLightbox();
  });
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightboxOpen) closeLightbox();
  });

  const frames = specs.map((spec) => {
    const el = document.createElement('figure');
    el.className = 'experiences-frame';
    el.style.width = spec.size + 'vmin';
    el.style.height = spec.size * 1.3 + 'vmin';
    el.style.cursor = 'zoom-in';
    // stopPropagation so opening a photo doesn't also toggle the tunnel's
    // own click-to-pause behavior on the stage underneath it.
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openLightbox(spec.image);
    });

    const img = document.createElement('img');
    img.src = spec.image.src;
    img.alt = spec.image.alt;
    img.loading = 'lazy';
    el.appendChild(img);
    tunnel.appendChild(el);

    gsap.set(el, {
      xPercent: -50,
      yPercent: -50,
      x: spec.x + 'vmin',
      y: spec.y + 'vmin',
      rotateX: spec.rx,
      rotateY: spec.ry,
      rotateZ: spec.rz,
    });

    // A quickSetter only ever touches the z component of the transform,
    // leaving the x/y/rotate already set above untouched — far cheaper
    // per tick than a full gsap.set() across ~70 frames every frame.
    const setZ = gsap.quickSetter(el, 'z', 'vmin');
    // phase is this frame's fixed offset within the loop; only the
    // shared `flight` value (advanced every tick) changes after this.
    const phase = spec.z - FAR_Z;

    return { el, setZ, phase };
  });

  // The destination text is a flat, always-visible overlay — not part of
  // the 3D flight — sitting at the tunnel's vanishing point the same way
  // the section's word used to sit statically behind the photos before
  // this rebuild.
  const textEl = document.createElement('div');
  textEl.className = 'experiences-tunnel-text';
  textEl.innerHTML = '<h2>Universo Medusa</h2>';
  stage.insertBefore(textEl, stage.querySelector('.experiences-vignette'));

  let flight = 0;
  let running = false;
  let stopped = false;
  let lastTime = null;
  // Tweened speed multiplier: stopping eases 1 -> 0 over a couple of
  // seconds (a slow, coasting-to-a-stop feel), while resuming snaps
  // straight back to 1 — asymmetric on purpose, per the reference.
  const speed = { mult: 1 };
  function setStopped(next) {
    stopped = next;
    gsap.killTweensOf(speed);
    if (stopped) {
      gsap.to(speed, { mult: 0, duration: 2.2, ease: 'power2.out' });
    } else {
      speed.mult = 1;
      lastTime = null;
    }
  }

  drawGrid(0, 0); // initial paint, before the tunnel is ever scrolled into view

  // gsap.ticker calls back with `time` as elapsed seconds (not ms) by
  // default — dt below is computed in seconds to match FLIGHT_SPEED's
  // vmin/second unit.
  gsap.ticker.add((time) => {
    if (!running) return;

    // Eased toward the mouse's current target every tick, independently
    // of `speed.mult` — looking around should keep working even while the
    // flight itself is stopped, same as the reference tunnel.
    originX += (mouseX - originX) * 0.08;
    originY += (mouseY - originY) * 0.08;
    originShiftX = originX * ORIGIN_RANGE * vmin;
    originShiftY = originY * ORIGIN_RANGE * vmin;
    // Drives the CSS side (photo frames) — px units via calc() so it
    // stays in exact agreement with the canvas side's own px math below,
    // both reading the same originShiftX/Y.
    stage.style.perspectiveOrigin = `calc(50% + ${originShiftX}px) calc(50% + ${originShiftY}px)`;

    if (lastTime === null) lastTime = time;
    const dt = time - lastTime;
    lastTime = time;
    flight += dt * FLIGHT_SPEED * speed.mult;

    frames.forEach(({ el, setZ, phase }) => {
      const t = (((phase + flight) % PERIOD) + PERIOD) % PERIOD;
      const z = FAR_Z + t;
      setZ(z);

      const progress = t / PERIOD;
      const fadeIn = gsap.utils.clamp(0, 1, progress / FADE_FRACTION);
      const fadeOut = gsap.utils.clamp(0, 1, (1 - progress) / FADE_FRACTION);
      el.style.opacity = String(fadeIn * fadeOut);
    });

    // Reads the same `flight` value the photo frames above just used, so
    // the grid and the photos always stay in lockstep — redrawn even
    // while stopped so the look-around still visibly responds.
    drawGrid(originShiftX, originShiftY);
  });

  // Only fly while the stage is actually pinned/visible on screen —
  // scrolling past pauses it instead of animating uselessly off-screen.
  ScrollTrigger.create({
    trigger: outer,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      running = self.isActive;
      if (running) lastTime = null;
    },
  });

  // Click to pause/resume, hold to run — same idle interaction as the
  // reference tunnel.
  let holdTimer = null;
  stage.style.cursor = 'pointer';
  stage.addEventListener('click', () => {
    setStopped(!stopped);
  });
  stage.addEventListener('pointerdown', () => {
    if (!stopped) return;
    holdTimer = window.setTimeout(() => {
      setStopped(false);
    }, 120);
  });
  const releaseHold = () => {
    if (holdTimer) { window.clearTimeout(holdTimer); holdTimer = null; }
  };
  stage.addEventListener('pointerup', releaseHold);
  stage.addEventListener('pointerleave', releaseHold);
}
