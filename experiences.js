const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;

// Scroll-scrubbed reveal for the "Experiences" section: the word is
// static (always visible, no entrance animation) and sits behind the
// photos. Each photo runs a two-phase journey:
//   A. rises from bottom-center up to the middle of the screen, drifting
//      sideways into its own lane (LANES below) as it goes
//   B. continues rising off the top while growing slightly, as a little
//      flourish right before it exits
// Lanes keep consecutive photos from stacking in the same spot; the
// stride between one photo starting and the next gives them room to not
// crowd each other.
//
// #experiences is a tall spacer — .experiences-stage inside it is what's
// actually sticky/visible (see styles.css) — so there's real scroll
// distance for the photos to travel across instead of having nowhere to
// scroll into.

gsap.registerPlugin(ScrollTrigger);

const outer = document.getElementById('experiences');
const stage = document.querySelector('.experiences-stage');
const items = Array.from(document.querySelectorAll('.experiences-item'));

const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

// One per item, in order — no two neighbors share a lane, so the photo
// that's exiting and the one entering are never in the same spot.
const LANES = ['-27vw', '25vw', '0vw', '27vw', '-25vw', '0vw'];

if (outer && stage && items.length && !prefersReduced) {
  // Measured, not guessed: how far an item needs to travel to go from
  // fully below the stage to fully above it, given its actual rendered
  // size — so it works at any screen size/aspect instead of a fixed
  // pixel guess.
  const itemRect = items[0].getBoundingClientRect();
  const travel = stage.offsetHeight / 2 + itemRect.height / 2 + 80;

  // Every photo starts at the same spot: dead-center, below the fold.
  items.forEach((item) => {
    gsap.set(item, { xPercent: -50, yPercent: -50, x: 0, y: travel, scale: 1, opacity: 1 });
  });

  // More stride relative to duration than before = a clearer gap between
  // one photo finishing its pass and the next one starting.
  const ITEM_DURATION = 0.35;
  const ITEM_STRIDE = 0.24;
  const PHASE_A_RATIO = 0.5; // rise-to-center-and-drift-into-lane vs. grow-and-exit

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger: outer,
      start: 'top top',
      end: 'bottom bottom',
      // A bigger scrub value makes the animation lag gently behind the
      // scroll (like inertia) instead of snapping to it 1:1 on every
      // wheel tick — that lag is most of what reads as "smooth" rather
      // than mechanical.
      scrub: 1.2,
    },
  });

  items.forEach((item, i) => {
    const laneX = LANES[i % LANES.length];
    const itemStart = i * ITEM_STRIDE;
    const phaseADuration = ITEM_DURATION * PHASE_A_RATIO;
    const phaseBDuration = ITEM_DURATION - phaseADuration;
    // Phase B splits in two: it grows while still fully opaque, then
    // fades out on the final stretch — so it's gone before it ever
    // reaches the hard edge of the screen, instead of being visibly
    // sliced off flush against the top of the browser.
    const phaseB1Duration = phaseBDuration * 0.55;
    const phaseB2Duration = phaseBDuration * 0.45;

    // Phase A: bottom-center → middle of the screen, drifting into its lane.
    // sine.inOut eases the drift/rise in and out instead of moving at a
    // flat, constant rate — that constant-rate motion is what read as
    // "tosco" even with the scrub lag smoothing the scroll response itself.
    tl.fromTo(
      item,
      { y: travel, x: 0 },
      { y: 0, x: laneX, ease: 'sine.inOut', duration: phaseADuration },
      itemStart
    );
    // Phase B1: rises further and grows, still fully visible.
    tl.to(
      item,
      { y: -travel * 0.5, scale: 1.3, ease: 'sine.in', duration: phaseB1Duration },
      itemStart + phaseADuration
    );
    // Phase B2: keeps rising while fading out, gone before it hits the top edge.
    tl.to(
      item,
      { y: -travel, opacity: 0, ease: 'sine.in', duration: phaseB2Duration },
      itemStart + phaseADuration + phaseB1Duration
    );
  });

  // The black panel's corners round off during the hand-off from the hero
  // (while #experiences is still rising up to cover it, before its own top
  // has reached the top of the viewport) — done by the time the section is
  // actually pinned and the photos start their run, not still animating
  // while you're scrolling through the content.
  //
  // No exit animation here: #about (styles.css) is pulled up via
  // margin-top:-100vh so it's already sticky-pinned behind this stage for
  // the stage's last viewport-height, the same way #hero sits pinned
  // behind it for the whole photo run — so it just gets uncovered as this
  // stage releases and scrolls away on its own, no JS needed for that part.
  gsap.fromTo(
    stage,
    { borderRadius: '0px' },
    {
      borderRadius: '56px',
      ease: 'none',
      scrollTrigger: {
        trigger: outer,
        start: 'top bottom',
        end: 'top top',
        scrub: true,
      },
    }
  );
}
