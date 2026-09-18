const gsap = window.gsap;

// Hero entrance choreography — matches weichie.com's own hero timeline
// (extracted from their compiled bundle): the title words punch in, then
// dissolve away entirely (last word first), and the ring slides up from
// below starting just as that fade-out begins, then the service tags
// fade in last.

const titleLines = document.querySelectorAll('.hero-title-line');
const ring = document.getElementById('mqScene');
const labels = document.getElementById('lineup');

const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

if (ring) {
  // Parked a full ring-height below its resting spot, invisible — it
  // slides up into place rather than just fading in place.
  gsap.set(ring, { y: ring.offsetHeight, autoAlpha: 0 });
}

if (prefersReduced) {
  if (titleLines.length) gsap.set(titleLines, { opacity: 0, y: 0 });
  if (ring) gsap.set(ring, { y: 0, autoAlpha: 1 });
  if (labels) gsap.set(labels, { opacity: 1 });
} else {
  const tl = gsap.timeline();

  if (titleLines.length) {
    tl.to(titleLines, {
      opacity: 1,
      y: 0,
      duration: 1.3,
      stagger: 0.1,
      ease: 'power3.out',
      delay: 0.2,
    }).to(titleLines, {
      opacity: 0,
      duration: 0.35,
      stagger: { each: 0.06, from: 'end' },
      ease: 'power2.in',
    }, '+=0.25');
  }

  if (ring) {
    tl.to(ring, {
      y: 0,
      autoAlpha: 1,
      duration: 1.2,
      ease: 'power3.out',
    }, titleLines.length ? '<0.15' : 0);
  }

  if (labels) {
    tl.to(labels, { opacity: 1, duration: 0.6, ease: 'power2.out' });
  }
}
