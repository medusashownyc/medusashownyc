import { getLang } from './i18n.js';

const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

/* ---------- eased wheel scroll ---------- */

// styles.css's scroll-behavior:smooth only covers anchor-link jumps — plain
// wheel/trackpad scrolling is still the browser's default, which moves the
// page in the exact fixed steps the input device reports (a full page-stack
// site like this one, with sticky sections riding over each other, reads
// every one of those steps as a visible little jolt). This intercepts wheel
// input and eases window.scrollY toward it every frame instead of jumping
// straight there, giving scrolling actual inertia/weight — the same "hijack
// the wheel, animate scrollTop yourself" technique behind Lenis/Locomotive,
// done by hand here so the page doesn't need another whole scroll-library
// dependency (and, critically, without moving any content into a
// transform-driven virtual scroller — position:sticky, ScrollTrigger's
// pinning and the IntersectionObserver-based nav highlighting below all
// keep working exactly as before, since window.scrollY is still the real,
// only scroll position on the page).
if (!prefersReduced && window.matchMedia?.('(pointer: fine)').matches !== false) {
  const EASE = 0.11;
  const WHEEL_MULTIPLIER = 1;
  let currentY = null; // lazily read on first wheel event, not at module
                        // load — a cross-page #hash link (e.g. a show page's
                        // "Nosotros" back to index.html#about) may still be
                        // mid-jump when this module executes, and caching
                        // scrollY now would race that landing position.
  let targetY = null;
  let raf = null;

  function maxScroll() {
    return document.documentElement.scrollHeight - window.innerHeight;
  }

  // 'instant', not 'auto' — 'auto' defers to the element's own
  // scroll-behavior CSS, which is set to smooth site-wide above for
  // anchor-link jumps. Left as 'auto' here, every one of these per-frame
  // steps would itself kick off its own smooth sub-animation toward a
  // target that's already moved by the next frame, so the real scroll
  // position permanently lagged far behind the easing math below instead
  // of tracking it — the page barely moved no matter how hard you
  // scrolled. 'instant' makes each step a plain, immediate jump; the
  // easing below is what supplies the actual smoothness.
  function step() {
    currentY += (targetY - currentY) * EASE;
    if (Math.abs(targetY - currentY) < 0.5) {
      currentY = targetY;
      window.scrollTo({ top: currentY, behavior: 'instant' });
      raf = null;
      return;
    }
    window.scrollTo({ top: currentY, behavior: 'instant' });
    raf = requestAnimationFrame(step);
  }

  window.addEventListener('wheel', (event) => {
    // Lets an element that scrolls on its own (the booking form's
    // textarea, the format <select>) keep handling its own wheel input
    // instead of the page stealing it out from under the user.
    if (event.target.closest('textarea, select')) return;
    if (event.ctrlKey) return; // pinch-zoom on a trackpad, not a scroll

    event.preventDefault();

    // Re-sync to the real scroll position whenever it's drifted away from
    // our tracked one, not just on the very first wheel event ever. Any
    // scroll that happens outside this handler — a nav-link click (CSS
    // scroll-behavior:smooth, or the #top/#about JS scrollTo), the
    // scrollbar, keyboard paging, back/forward — moves window.scrollY
    // directly and leaves currentY/targetY stale. Left unsynced, the next
    // wheel tick would ease FROM that stale point (e.g. still sitting
    // down at the footer) instead of from where the page actually is now,
    // which reads as the page suddenly yanking itself back to wherever it
    // was before that other scroll happened.
    if (currentY === null || Math.abs(window.scrollY - currentY) > 2) {
      currentY = window.scrollY;
      targetY = window.scrollY;
    }
    targetY = Math.max(0, Math.min(maxScroll(), targetY + event.deltaY * WHEEL_MULTIPLIER));
    if (!raf) raf = requestAnimationFrame(step);
  }, { passive: false });

  // A resize (or content settling in late — images, GSAP ScrollTrigger
  // recalculating pin spacers) can shrink maxScroll() out from under an
  // in-flight target set before it; re-clamping keeps the eased scroll
  // from ever chasing a target past the page's current actual bottom.
  window.addEventListener('resize', () => {
    if (targetY !== null) targetY = Math.max(0, Math.min(maxScroll(), targetY));
  });
}

/* ---------- scroll progress bar ---------- */

const scrollProgress = document.getElementById('scrollProgress');

function updateScrollProgress() {
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  const pct = max > 0 ? (doc.scrollTop / max) * 100 : 0;
  if (scrollProgress) scrollProgress.style.width = `${pct}%`;
}

/* ---------- "Nosotros" links: jump past the curtain, not to it ---------- */

// #about is sticky-pinned behind #experiences' stage (styles.css) starting
// at #about's own (early) static top — but it's still fully hidden there,
// covered by the still-opaque stage. A plain anchor jump lands exactly on
// that early point, so clicking "Nosotros" appeared to do nothing (still
// showing #experiences) instead of landing where #about is actually
// visible, i.e. #experiences' own natural bottom edge, once its stage has
// finished sliding away.
const experiencesEl = document.getElementById('experiences');

function scrollToAbout(event) {
  const aboutEl = document.getElementById('about');
  if (!experiencesEl || !aboutEl) return;
  event.preventDefault();
  const target = experiencesEl.offsetTop + experiencesEl.offsetHeight;
  window.scrollTo({ top: target, behavior: prefersReduced ? 'auto' : 'smooth' });
}

document.querySelectorAll('a[href="#about"]').forEach((a) => {
  a.addEventListener('click', scrollToAbout);
});

/* ---------- "Shows" link: jump to the actual top, not a stale sticky
   offset ---------- */

// #top is .hero itself — first element on the page, so its true position is
// scroll offset 0. But .hero is also position:sticky (styles.css, the same
// section-stack trick #about relies on above), and once the page has
// scrolled past its pinned range, browsers report a native hash-jump target
// for a sticky element based on its last "stuck" offset rather than its
// static in-flow position — landing well down the page (around where
// #experiences hands off to #about) instead of back at the hero. A plain
// scrollTo(0) sidesteps that entirely.
function scrollToTop(event) {
  event.preventDefault();
  window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
}

document.querySelectorAll('a[href="#top"]').forEach((a) => {
  a.addEventListener('click', scrollToTop);
});

/* ---------- header: scrolled state + active section tracking ---------- */

const header = document.getElementById('siteHeader');
const navLinks = document.getElementById('navLinks');
const navAnchors = navLinks ? Array.from(navLinks.querySelectorAll('a')) : [];

// The header goes dark (light logo/text, dark glass backing instead of
// white) for exactly the stretch where #experiences' own black stage is
// what's actually pinned full-screen behind it — the same "sticky
// release" window described above scrollToAbout. offsetTop/offsetHeight
// are cached (recomputed only on resize) rather than read live on every
// scroll tick — reading them forces a synchronous layout, and doing that
// on every native 'scroll' event (fired far more often than once per
// frame during a fling) was a real source of main-thread jank: it showed
// up as the #experiences tunnel (experiences.js) visibly stalling
// mid-scroll, competing with this for the same frame budget. The ±40px
// pad covers the brief rise/fall right at each edge, where the stage is
// still animating into/out of place rather than fully covering the
// screen yet.
let darkStageStart = 0;
let darkStageEnd = 0;
function updateDarkStageBounds() {
  if (!experiencesEl) return;
  darkStageStart = experiencesEl.offsetTop - 40;
  darkStageEnd = experiencesEl.offsetTop + experiencesEl.offsetHeight - window.innerHeight + 40;
}
function isOverDarkStage() {
  if (!experiencesEl) return false;
  return window.scrollY >= darkStageStart && window.scrollY <= darkStageEnd;
}

let mobileNavOpen = false;

function onScroll() {
  updateScrollProgress();
  if (header) {
    header.classList.toggle('is-scrolled', window.scrollY > 12);
    header.classList.toggle('is-dark', isOverDarkStage() || mobileNavOpen);
  }
}

function onResize() {
  updateDarkStageBounds();
  onScroll();
}

window.addEventListener('scroll', onScroll, { passive: true });
window.addEventListener('resize', onResize);
onResize();

/* ---------- "Universo Medusa" entry + exit snap ---------- */

// Both hand-offs get assisted — hero → tunnel (entry) and tunnel → about
// (exit) — each as its own independent, one-sided check: "still
// approaching this boundary from above, within reach? snap to it."
// Two one-sided checks instead of one combined direction-aware system on
// purpose: a combined system kept cascading — landing exactly on one
// point re-satisfied its own "continue toward the other point" branch on
// the very next scrollend, firing a second unrequested jump with no real
// user input in between. Landing exactly ON a point here never re-enters
// either check (both require y strictly LESS than their own target), so
// there's nothing left for either to cascade into.
let isSnapping = false;

function trySnap() {
  if (isSnapping || !experiencesEl) return;
  const enter = experiencesEl.offsetTop;
  const exit = enter + experiencesEl.offsetHeight;
  const buffer = window.innerHeight * 0.4;
  const y = window.scrollY;
  let target = null;
  if (y < enter && y > enter - buffer) target = enter;
  else if (y < exit && y > exit - buffer) target = exit;
  if (target === null) return;
  // A smooth scrollTo rarely settles on the exact target pixel (sub-pixel
  // rounding), so "y < target" alone doesn't actually stop a snap that
  // just finished from re-triggering itself on the very next scrollend —
  // y is still a hair below target, re-satisfying the same branch above.
  // That was firing this repeatedly (a fresh smooth scrollTo to the same
  // target every scrollend) for as long as the user's scroll gesture kept
  // producing scrollend events near the boundary, which is what read as
  // the page/tunnel stuttering rather than a single clean snap.
  if (Math.abs(y - target) < 2) return;
  isSnapping = true;
  window.scrollTo({ top: target, behavior: prefersReduced ? 'auto' : 'smooth' });
  const finish = () => { isSnapping = false; };
  if ('onscrollend' in window) {
    window.addEventListener('scrollend', finish, { once: true });
  } else {
    window.setTimeout(finish, 500);
  }
}

if ('onscrollend' in window) {
  window.addEventListener('scrollend', trySnap, { passive: true });
} else {
  let fallbackTimer = null;
  window.addEventListener('scroll', () => {
    if (isSnapping) return;
    window.clearTimeout(fallbackTimer);
    fallbackTimer = window.setTimeout(trySnap, 220);
  }, { passive: true });
}

// The current section's link just dims to match the reference's resting
// "is-active" state (styles.css: opacity .6) — same treatment hover
// already gets, no separate pill/indicator element to keep in sync.
const trackedSections = navAnchors
  .map((a) => document.getElementById(a.dataset.nav))
  .filter(Boolean);

if (trackedSections.length) {
  const sectionObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const link = navAnchors.find((a) => a.dataset.nav === entry.target.id);
        if (!link) return;
        navAnchors.forEach((a) => a.classList.remove('is-active'));
        link.classList.add('is-active');
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );
  trackedSections.forEach((section) => sectionObserver.observe(section));
}

// Per-letter hover "pop" — top-level links only (:scope > li > a skips the
// "Shows" mega-menu's own image links, which stay plain text/images).
// Splitting happens once on load rather than hand-writing the spans in
// index.html, same approach as the reference.
const topNavLinks = navLinks ? Array.from(navLinks.querySelectorAll(':scope > li > a')) : [];

// Pulled into a named function (not just a one-time forEach) because
// i18n.js's language sweep plainly overwrites textContent on every
// [data-es] element it owns, these links included — on a link that's
// already been split into per-letter spans, that wipes the spans back
// down to a single text node (with the correct new-language text, but no
// hop animation left to trigger). Re-splitting after every language
// change rebuilds the spans from that already-translated text.
function splitNavChars(a) {
  // On a re-split (language change), a.textContent would already include
  // BOTH the visible per-letter spans' text AND the .sr-only duplicate
  // from the previous split, concatenated — reading straight from
  // textContent here doubled the label every time (first toggle: "Shows"
  // -> "ShowsShows", second: "ShowsShowsShowsShows", visibly, since the
  // new spans get built from that doubled string). The .sr-only span's
  // OWN textContent is always just the clean label, split or not, so use
  // that once it exists.
  const existingLabel = a.querySelector('.sr-only');
  const label = (existingLabel ? existingLabel.textContent : a.textContent).trim();
  const chars = Array.from(label)
    .map((ch, i) => `<span class="nav-char" style="--i:${i}">${ch === ' ' ? '&nbsp;' : ch}</span>`)
    .join('');
  a.innerHTML = `<span class="nav-chars" aria-hidden="true">${chars}</span><span class="sr-only">${label}</span>`;
}

topNavLinks.forEach((a) => {
  splitNavChars(a);

  a.addEventListener('mouseenter', () => {
    a.querySelectorAll('.nav-char').forEach((c) => {
      c.classList.remove('is-hopping');
      void c.offsetWidth; // restart the animation on a fast re-hover
      c.classList.add('is-hopping');
    });
  });
});

document.addEventListener('medusa:langchange', () => {
  topNavLinks.forEach(splitNavChars);
});

/* ---------- mobile nav ---------- */

const navToggle = document.getElementById('navToggle');
const mobileNav = document.getElementById('mobileNav');

function closeMobileNav() {
  navToggle?.classList.remove('is-open');
  navToggle?.setAttribute('aria-expanded', 'false');
  mobileNav?.classList.remove('is-open');
  document.body.style.overflow = '';
  mobileNavOpen = false;
  onScroll();
}

navToggle?.addEventListener('click', () => {
  const isOpen = mobileNav?.classList.toggle('is-open');
  navToggle.classList.toggle('is-open', isOpen);
  navToggle.setAttribute('aria-expanded', String(!!isOpen));
  document.body.style.overflow = isOpen ? 'hidden' : '';
  // The overlay behind the header is dark full-bleed — reuse the same
  // is-dark treatment (styles.css) the header gets over #experiences'
  // dark stage, or the logo/toggle stay in their black-on-light variant
  // and nearly disappear against it.
  mobileNavOpen = !!isOpen;
  onScroll();
});

mobileNav?.querySelectorAll('a').forEach((a) => a.addEventListener('click', closeMobileNav));

/* ---------- back to top ---------- */

document.getElementById('backToTop')?.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: prefersReduced ? 'auto' : 'smooth' });
});

/* ---------- scroll reveals ---------- */

const revealEls = Array.from(document.querySelectorAll('[data-reveal]'));

if (revealEls.length) {
  if (prefersReduced) {
    gsap.set(revealEls, { opacity: 1, y: 0 });
  } else {
    revealEls.forEach((el) => {
      // 'top 85%' needs ~15% of a viewport-height's worth of scroll room
      // below the element to ever fire — true for everything on the page
      // except .footer-bottom, the very last element in the document:
      // there's nothing after it to scroll into, so its top never reaches
      // 85% down the viewport and it would stay permanently at opacity:0.
      // 'bottom bottom' (no offset) lands exactly ON max scroll for a
      // page-end element — no room left to actually scroll past it, so
      // ScrollTrigger's progress can never tick over from 0 and the
      // reveal still never plays. +=60 here needs the scroller-side
      // reference 60px past the true viewport bottom to satisfy the same
      // comparison, which works out to needing 60px LESS scroll to reach
      // (verified against the live ScrollTrigger instance — GSAP's offset
      // direction here isn't the intuitive one), giving the threshold
      // room to actually be crossed before hitting max scroll.
      const isPageEnd = el.matches('.footer-bottom');
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: isPageEnd ? 'bottom bottom+=60' : 'top 85%',
        },
      });
    });
  }
}

/* ---------- about: animated stat counters ---------- */

const statNumbers = Array.from(document.querySelectorAll('.stat-number'));

statNumbers.forEach((el) => {
  const target = Number(el.dataset.count || 0);
  if (prefersReduced) {
    el.textContent = target;
    return;
  }
  const counter = { value: 0 };
  ScrollTrigger.create({
    trigger: el,
    start: 'top 88%',
    once: true,
    onEnter: () => {
      gsap.to(counter, {
        value: target,
        duration: 1.6,
        ease: 'power2.out',
        onUpdate: () => {
          el.textContent = Math.round(counter.value);
        },
      });
    },
  });
});

/* ---------- rituales: rotating feature panel ---------- */

// Entrance is just the standard [data-reveal] pass above (on #ritualFeature
// and #ritualThumbs) — kept deliberately separate from the rotation logic
// below so there's only ever one thing animating a given element's
// opacity at a time. An earlier version of this section had a dedicated
// stagger *and* [data-reveal] wired up for the same card elements, two
// independent GSAP tweens fighting over the same properties, which is
// what made cards randomly fail to appear.

// Keyed by whatever plain-text format name shows up in a ritual's
// data-includes/data-includes-es list — since that list is authored once
// per language (English baseline + Spanish alternate, see index.html), the
// same icon needs a lookup entry under both languages' spelling of a given
// format (e.g. "Fire" and "Fuego").
const FORMAT_ICONS = {
  'Belly Dancers': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7c.8.7 1.6 1.3 3 1.3 2.8 0 2.8-2.3 5.5-2.3 2.5 0 2.8 2.3 5.5 2.3 2.8 0 2.6-2.3 5.5-2.3 1.4 0 2.2.6 3 1.3M2 13c.8.7 1.6 1.3 3 1.3 2.8 0 2.8-2.3 5.5-2.3 2.5 0 2.8 2.3 5.5 2.3 2.8 0 2.6-2.3 5.5-2.3 1.4 0 2.2.6 3 1.3M2 19c.8.7 1.6 1.3 3 1.3 2.8 0 2.8-2.3 5.5-2.3 2.5 0 2.8 2.3 5.5 2.3 2.8 0 2.6-2.3 5.5-2.3 1.4 0 2.2.6 3 1.3"/></svg>',
  Fire: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5a2.5 2.5 0 0 0 2.5-2.5c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/></svg>',
  Fuego: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5a2.5 2.5 0 0 0 2.5-2.5c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/></svg>',
  Garotas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 17 3 8l4.8 3.6L12 5l4.2 6.6L21 8l-1.5 9Z"/><path d="M5 20h14"/></svg>',
  'Gogo Dancers': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>',
  Salsa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  'Stilt Walkers & Robot': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H9"/><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M1 14h2M21 14h2M9 13v2M15 13v2"/></svg>',
  'Zancos & Robot': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H9"/><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M1 14h2M21 14h2M9 13v2M15 13v2"/></svg>',
};

// Same lookup shape as FORMAT_ICONS above (English + Spanish spelling of
// each format), pointing each included format at its own show page so the
// ritual panel's chips can link straight there instead of just naming it.
const FORMAT_LINKS = {
  'Belly Dancers': 'show-belly-dancers.html',
  Fire: 'show-fuego.html',
  Fuego: 'show-fuego.html',
  Garotas: 'show-garotas.html',
  'Gogo Dancers': 'show-gogo-dancers.html',
  Salsa: 'show-salsa.html',
  'Stilt Walkers & Robot': 'show-zancos-robot.html',
  'Zancos & Robot': 'show-zancos-robot.html',
};

const ritualFeature = document.getElementById('ritualFeature');
const ritualThumbsEl = document.getElementById('ritualThumbs');
const ritualThumbs = ritualThumbsEl ? Array.from(ritualThumbsEl.querySelectorAll('.ritual-thumb')) : [];
const AUTOPLAY_MS = 6000;

if (ritualFeature && ritualThumbs.length) {
  const featureImg = document.getElementById('ritualFeatureImg');
  const featureNumeral = document.getElementById('ritualFeatureNumeral');
  const featureTag = document.getElementById('ritualFeatureTag');
  const featureTitle = document.getElementById('ritualFeatureTitle');
  const featureDesc = document.getElementById('ritualFeatureDesc');
  const featureIncludes = document.getElementById('ritualFeatureIncludes');

  let activeIndex = 0;
  let autoplayId = null;

  function fillIndicators(index) {
    ritualThumbs.forEach((thumb, i) => {
      const bar = thumb.querySelector('.ritual-thumb-progress');
      if (!bar) return;
      bar.classList.remove('is-filling');
      if (i === index) {
        // Force a reflow between removing and re-adding the class so the
        // width transition actually restarts from 0 instead of the
        // browser coalescing the two class changes and skipping straight
        // to the end state.
        void bar.offsetWidth;
        if (!prefersReduced) bar.classList.add('is-filling');
      }
    });
  }

  function applyRitual(index) {
    const thumb = ritualThumbs[index];
    if (!thumb) return;
    const { image, accent, numeral } = thumb.dataset;
    // Every ritual is authored in both languages right on the button
    // (data-tag/-title/-desc/-includes/-alt = English, the -es-suffixed
    // twin = Spanish) — picking the suffix here is the only place that
    // needs to know which language is active; everything downstream just
    // renders whatever these four end up holding.
    const suffix = getLang() === 'es' ? 'Es' : '';
    const tag = thumb.dataset['tag' + suffix];
    const title = thumb.dataset['title' + suffix];
    const desc = thumb.dataset['desc' + suffix];
    const includes = thumb.dataset['includes' + suffix];
    const alt = thumb.dataset['alt' + suffix];

    featureImg.src = image;
    featureImg.alt = alt || '';
    featureNumeral.textContent = numeral || '';
    featureTag.textContent = tag || '';
    featureTitle.textContent = title || '';
    featureDesc.textContent = desc || '';
    featureIncludes.innerHTML = (includes || '')
      .split(',')
      .map((raw) => {
        const name = raw.trim();
        // Strip a trailing "(closer)" / "(cierre)" qualifier so it still
        // matches the plain format name in FORMAT_ICONS/FORMAT_LINKS, while
        // the qualifier itself stays visible in the label text.
        const base = name.replace(/\s*\([^)]*\)\s*$/, '');
        const label = `${FORMAT_ICONS[base] || ''}${name}`;
        const href = FORMAT_LINKS[base];
        return href ? `<li><a href="${href}">${label}</a></li>` : `<li>${label}</li>`;
      })
      .join('');
    ritualFeature.style.setProperty('--accent', `var(--brand-${accent})`);

    ritualThumbs.forEach((t, i) => {
      t.classList.toggle('is-active', i === index);
      t.setAttribute('aria-selected', String(i === index));
    });
  }

  function goToRitual(index, { userInitiated = false } = {}) {
    const next = ((index % ritualThumbs.length) + ritualThumbs.length) % ritualThumbs.length;
    if (next === activeIndex && !userInitiated) return;
    activeIndex = next;

    if (prefersReduced) {
      applyRitual(activeIndex);
      fillIndicators(activeIndex);
      return;
    }

    // Crossfade: fade the panel out, swap its content while invisible,
    // fade back in — same "settle, then reveal" shape as the rest of the
    // site's scroll reveals, just triggered by the timer/click instead.
    gsap.to([ritualFeature.querySelector('.ritual-feature-media'), ritualFeature.querySelector('.ritual-feature-body')], {
      opacity: 0,
      duration: 0.28,
      ease: 'power2.in',
      onComplete: () => {
        applyRitual(activeIndex);
        gsap.fromTo(
          [ritualFeature.querySelector('.ritual-feature-media'), ritualFeature.querySelector('.ritual-feature-body')],
          { opacity: 0 },
          { opacity: 1, duration: 0.45, ease: 'power2.out' }
        );
      },
    });
    fillIndicators(activeIndex);
  }

  function startAutoplay() {
    if (prefersReduced) return;
    stopAutoplay();
    autoplayId = window.setInterval(() => goToRitual(activeIndex + 1), AUTOPLAY_MS);
  }

  function stopAutoplay() {
    if (autoplayId) window.clearInterval(autoplayId);
    autoplayId = null;
  }

  ritualThumbs.forEach((thumb, i) => {
    thumb.addEventListener('click', () => {
      goToRitual(i, { userInitiated: true });
      startAutoplay();
    });
  });

  ritualThumbsEl.addEventListener('mouseenter', stopAutoplay);
  ritualThumbsEl.addEventListener('mouseleave', startAutoplay);
  ritualFeature.addEventListener('mouseenter', stopAutoplay);
  ritualFeature.addEventListener('mouseleave', startAutoplay);

  applyRitual(0);
  fillIndicators(0);
  startAutoplay();

  // The generic data-es sweep in i18n.js only handles elements it owns
  // directly — the feature panel's text is written by applyRitual() above
  // instead, reading straight off whichever thumb is active, so a language
  // switch needs to explicitly ask it to re-render with the new language's
  // fields rather than being picked up automatically.
  document.addEventListener('medusa:langchange', () => applyRitual(activeIndex));
}

