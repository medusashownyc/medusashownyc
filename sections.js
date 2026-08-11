const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
gsap.registerPlugin(ScrollTrigger);

const prefersReduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

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

/* ---------- header: scrolled state + active section tracking ---------- */

const header = document.getElementById('siteHeader');
const navLinks = document.getElementById('navLinks');
const navIndicator = document.getElementById('navIndicator');
const navAnchors = navLinks ? Array.from(navLinks.querySelectorAll('a')) : [];

function onScroll() {
  updateScrollProgress();
  if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
}

window.addEventListener('scroll', onScroll, { passive: true });
onScroll();

function moveIndicatorTo(link) {
  if (!navIndicator || !link) return;
  const linkRect = link.getBoundingClientRect();
  const parentRect = link.closest('.nav-links').getBoundingClientRect();
  navIndicator.style.width = `${linkRect.width}px`;
  navIndicator.style.transform = `translateX(${linkRect.left - parentRect.left}px)`;
  navIndicator.classList.add('is-visible');
}

let activeLink = null;

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
        navAnchors.forEach((a) => a.classList.remove('is-active', 'is-uncovered'));
        link.classList.add('is-active');
        activeLink = link;
        moveIndicatorTo(link);
      });
    },
    { rootMargin: '-45% 0px -50% 0px', threshold: 0 }
  );
  trackedSections.forEach((section) => sectionObserver.observe(section));
}

// Hovering/focusing any link drags the one shared pill over to it. When
// that link isn't the active one, the active link loses its pill and
// would otherwise sit there as plain white text on the light header —
// invisible. .is-uncovered (styles.css) is exactly that fallback state,
// toggled on/off as the pill leaves/returns.
navAnchors.forEach((a) => {
  a.addEventListener('mouseenter', () => {
    moveIndicatorTo(a);
    activeLink?.classList.toggle('is-uncovered', a !== activeLink);
  });
  a.addEventListener('focus', () => {
    moveIndicatorTo(a);
    activeLink?.classList.toggle('is-uncovered', a !== activeLink);
  });
});

navLinks?.addEventListener('mouseleave', () => {
  if (!activeLink) return;
  moveIndicatorTo(activeLink);
  activeLink.classList.remove('is-uncovered');
});

navLinks?.addEventListener('focusout', (event) => {
  if (!activeLink || navLinks.contains(event.relatedTarget)) return;
  moveIndicatorTo(activeLink);
  activeLink.classList.remove('is-uncovered');
});

window.addEventListener('resize', () => {
  if (activeLink) moveIndicatorTo(activeLink);
});

/* ---------- mobile nav ---------- */

const navToggle = document.getElementById('navToggle');
const mobileNav = document.getElementById('mobileNav');

function closeMobileNav() {
  navToggle?.classList.remove('is-open');
  navToggle?.setAttribute('aria-expanded', 'false');
  mobileNav?.classList.remove('is-open');
  document.body.style.overflow = '';
}

navToggle?.addEventListener('click', () => {
  const isOpen = mobileNav?.classList.toggle('is-open');
  navToggle.classList.toggle('is-open', isOpen);
  navToggle.setAttribute('aria-expanded', String(!!isOpen));
  document.body.style.overflow = isOpen ? 'hidden' : '';
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
      gsap.to(el, {
        opacity: 1,
        y: 0,
        duration: 0.9,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: el,
          start: 'top 85%',
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

const FORMAT_ICONS = {
  'Belly Dancers': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 7c.8.7 1.6 1.3 3 1.3 2.8 0 2.8-2.3 5.5-2.3 2.5 0 2.8 2.3 5.5 2.3 2.8 0 2.6-2.3 5.5-2.3 1.4 0 2.2.6 3 1.3M2 13c.8.7 1.6 1.3 3 1.3 2.8 0 2.8-2.3 5.5-2.3 2.5 0 2.8 2.3 5.5 2.3 2.8 0 2.6-2.3 5.5-2.3 1.4 0 2.2.6 3 1.3M2 19c.8.7 1.6 1.3 3 1.3 2.8 0 2.8-2.3 5.5-2.3 2.5 0 2.8 2.3 5.5 2.3 2.8 0 2.6-2.3 5.5-2.3 1.4 0 2.2.6 3 1.3"/></svg>',
  Fuego: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5a2.5 2.5 0 0 0 2.5-2.5c0-1.4-.5-2-1-3-1.1-2.1-.2-4 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.2.4-2.3 1-3a2.5 2.5 0 0 0 2.5 2.5Z"/></svg>',
  Garotas: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4.5 17 3 8l4.8 3.6L12 5l4.2 6.6L21 8l-1.5 9Z"/><path d="M5 20h14"/></svg>',
  'Gogo Dancers': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"/></svg>',
  Salsa: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  'Zancos & Robot': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 8V4H9"/><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M1 14h2M21 14h2M9 13v2M15 13v2"/></svg>',
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
    const { tag, title, desc, includes, image, alt, accent, numeral } = thumb.dataset;

    featureImg.src = image;
    featureImg.alt = alt || '';
    featureNumeral.textContent = numeral || '';
    featureTag.textContent = tag || '';
    featureTitle.textContent = title || '';
    featureDesc.textContent = desc || '';
    featureIncludes.innerHTML = (includes || '')
      .split(',')
      .map((name) => `<li>${FORMAT_ICONS[name] || ''}${name}</li>`)
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
}

/* ---------- booking form: floating labels + WhatsApp handoff ---------- */

const WHATSAPP_NUMBER = '000000000000'; // TODO: reemplazar con el número real (código de país + número, sin signos)

const bookingForm = document.getElementById('bookingForm');
const bookingStatus = document.getElementById('bookingStatus');

bookingForm?.querySelectorAll('select').forEach((select) => {
  const field = select.closest('.field');
  const sync = () => field?.classList.toggle('has-value', !!select.value);
  select.addEventListener('change', sync);
  sync();
});

bookingForm?.addEventListener('submit', (event) => {
  event.preventDefault();

  if (!bookingForm.reportValidity()) return;

  const data = new FormData(bookingForm);
  const name = data.get('name');
  const email = data.get('email');
  const phone = data.get('phone');
  const format = data.get('format');
  const date = data.get('date');
  const message = data.get('message');

  const lines = [
    `Hola, soy ${name}, quiero reservar una cita para negociar un show.`,
    `Formato de interés: ${format}`,
    date ? `Fecha del evento: ${date}` : null,
    `Correo: ${email}`,
    `Teléfono: ${phone}`,
    message ? `Detalles: ${message}` : null,
  ].filter(Boolean);

  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines.join('\n'))}`;

  if (bookingStatus) {
    bookingStatus.textContent = 'Abriendo WhatsApp con tu solicitud…';
  }

  window.open(waUrl, '_blank', 'noopener');
});
