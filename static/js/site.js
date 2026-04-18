/* ============================================================
   site.js — Stage 1 foundation
   - Lenis smooth scroll (ESM from jsDelivr)
   - Scroll progress bar
   - Time-of-day palette (auto + manual switcher)
   - Reveal / stagger via IntersectionObserver
   Honours prefers-reduced-motion: no Lenis, no animation.
   ============================================================ */

import Lenis from 'https://cdn.jsdelivr.net/npm/lenis@1.1.20/+esm';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- palette ---------- */
const PALETTES = ['dawn', 'day', 'sunset', 'night'];
const PALETTE_STORAGE_KEY = 'aog-palette';

function detectAutoPalette() {
  const h = new Date().getHours();
  if (h >= 5 && h < 9)  return 'dawn';
  if (h >= 9 && h < 17) return 'day';
  if (h >= 17 && h < 20) return 'sunset';
  return 'night';
}

function setMenuChecked(switcher, activeKey) {
  switcher.querySelectorAll('button[data-palette]').forEach(btn => {
    btn.setAttribute('aria-checked', btn.dataset.palette === activeKey ? 'true' : 'false');
  });
}

function applyPalette(name) {
  if (!PALETTES.includes(name)) name = 'day';
  document.documentElement.setAttribute('data-palette', name);
}

function initPalette() {
  const stored = localStorage.getItem(PALETTE_STORAGE_KEY);
  const mode = !stored ? 'auto' : stored;
  applyPalette(mode === 'auto' ? detectAutoPalette() : mode);

  const switcher = document.querySelector('.aog-palette-switch');
  if (!switcher) return;
  setMenuChecked(switcher, mode);

  const toggle = switcher.querySelector('.aog-palette-toggle');
  const closeMenu = () => {
    switcher.setAttribute('data-open', 'false');
    toggle?.setAttribute('aria-expanded', 'false');
  };
  const openMenu = () => {
    switcher.setAttribute('data-open', 'true');
    toggle?.setAttribute('aria-expanded', 'true');
  };

  toggle?.addEventListener('click', (e) => {
    e.stopPropagation();
    switcher.getAttribute('data-open') === 'true' ? closeMenu() : openMenu();
  });

  switcher.querySelectorAll('button[data-palette]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const choice = btn.dataset.palette;
      localStorage.setItem(PALETTE_STORAGE_KEY, choice);
      applyPalette(choice === 'auto' ? detectAutoPalette() : choice);
      setMenuChecked(switcher, choice);
      closeMenu();
    });
  });

  document.addEventListener('click', (e) => {
    if (!switcher.contains(e.target)) closeMenu();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
}

/* ---------- scroll progress ---------- */
function initProgress(lenis) {
  const bar = document.querySelector('.aog-scroll-progress');
  if (!bar) return;
  const update = (scroll, limit) => {
    const pct = limit > 0 ? (scroll / limit) * 100 : 0;
    bar.style.width = pct + '%';
  };
  if (lenis) {
    lenis.on('scroll', ({ scroll, limit }) => update(scroll, limit));
  } else {
    window.addEventListener('scroll', () => {
      const limit = document.documentElement.scrollHeight - window.innerHeight;
      update(window.scrollY, limit);
    }, { passive: true });
  }
}

/* ---------- reveal on scroll ---------- */
function initReveals() {
  if (prefersReducedMotion) {
    document.querySelectorAll('.reveal, .stagger, .photo-reveal')
      .forEach(el => el.classList.add('in'));
    return;
  }
  const onIntersect = (entries, observer) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('in');
        observer.unobserve(e.target);
      }
    });
  };
  // Normal reveal/stagger: want a "real" intersection (visual threshold)
  const ioReveal = new IntersectionObserver(onIntersect,
    { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });
  document.querySelectorAll('.reveal, .stagger').forEach(el => ioReveal.observe(el));
  // photo-reveal starts with clip-path:inset(100%) → intersectionRatio is always 0.
  // Threshold 0 fires on any intersection so the clip can open.
  const ioPhoto = new IntersectionObserver(onIntersect,
    { threshold: 0, rootMargin: '0px 0px -80px 0px' });
  document.querySelectorAll('.photo-reveal').forEach(el => ioPhoto.observe(el));

  // Safety net: if something never intersects (e.g. mobile layout settled with
  // an element already past the rootMargin, or tall sections where the 10%
  // threshold needs extra scroll), force-reveal everything still hidden once
  // the page has loaded.
  const sweep = () => {
    document.querySelectorAll('.reveal:not(.in), .stagger:not(.in), .photo-reveal:not(.in)').forEach(el => {
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight + 200) el.classList.add('in');
    });
  };
  window.addEventListener('load', () => setTimeout(sweep, 400));
  setTimeout(sweep, 2500);
}

/* ---------- pinned story (3 stages) ---------- */
function initStory(lenis) {
  const story = document.querySelector('.aog-story');
  if (!story) return;
  const stages = story.querySelectorAll('.aog-story__stage');
  const dots   = story.querySelectorAll('.aog-story__dot');
  if (!stages.length) return;

  // initial state: stage 0 active
  stages[0].classList.add('active');
  dots[0]?.classList.add('active');

  if (prefersReducedMotion) {
    // Reduced motion: show all three stages stacked instead of pinning
    stages.forEach(s => s.classList.add('active'));
    story.style.height = 'auto';
    return;
  }

  const apply = (scroll) => {
    const rect = story.getBoundingClientRect();
    const top = scroll + rect.top;
    const height = story.offsetHeight - window.innerHeight;
    if (height <= 0) return;
    const progress = Math.max(0, Math.min(1, (scroll - top) / height));
    // 3 stages, each ~1/3 of the pinned scroll
    const idx = Math.min(2, Math.floor(progress * 3));
    stages.forEach((s, i) => s.classList.toggle('active', i === idx));
    dots.forEach((d, i)   => d.classList.toggle('active', i === idx));
  };

  if (lenis) {
    lenis.on('scroll', ({ scroll }) => apply(scroll));
  } else {
    window.addEventListener('scroll', () => apply(window.scrollY), { passive: true });
  }
  apply(window.scrollY || 0);
}

/* ---------- horizontal gallery (weekly rhythm) ---------- */
function initHGallery(lenis) {
  const section = document.querySelector('.aog-hgallery');
  if (!section) return;
  const track = section.querySelector('[data-track]');
  if (!track) return;
  if (prefersReducedMotion) return;              // CSS fallback handles it

  const apply = (scroll) => {
    const rect = section.getBoundingClientRect();
    const top = scroll + rect.top;
    const height = section.offsetHeight - window.innerHeight;
    if (height <= 0) return;
    const progress = Math.max(0, Math.min(1, (scroll - top) / height));
    const maxShift = Math.max(0, track.scrollWidth - window.innerWidth);
    track.style.transform = `translate3d(${-progress * maxShift}px, 0, 0)`;
  };

  if (lenis) {
    lenis.on('scroll', ({ scroll }) => apply(scroll));
  } else {
    window.addEventListener('scroll', () => apply(window.scrollY), { passive: true });
  }
  window.addEventListener('resize', () => apply(window.scrollY || 0));
  apply(window.scrollY || 0);
}

/* ---------- lenis ---------- */
function initLenis() {
  if (prefersReducedMotion) return null;
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    touchMultiplier: 1.4,
  });
  const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
  requestAnimationFrame(raf);

  // anchor links use Lenis
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', (e) => {
      const href = a.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: -20, duration: 1.5 });
    });
  });

  // expose for later stages (hero parallax, pinned story)
  window.__aogLenis = lenis;
  return lenis;
}

/* ---------- hero parallax ---------- */
function initHeroParallax(lenis) {
  const hero = document.querySelector('.hero-parallax');
  if (!hero) return;
  const photo = hero.querySelector('.hero-photo');
  const layers = hero.querySelectorAll('.hero-layer');
  if (prefersReducedMotion) return;

  // --- scroll parallax on the photo (moves slower than viewport) ---
  const scrollFactor = 0.35;
  const applyScroll = (scroll) => {
    const rect = hero.getBoundingClientRect();
    // only transform while hero is anywhere near viewport
    if (rect.bottom < -100 || rect.top > window.innerHeight + 100) return;
    const y = scroll * scrollFactor;
    if (photo) photo.style.transform = `translate3d(0, ${y}px, 0)`;
  };
  if (lenis) {
    lenis.on('scroll', ({ scroll }) => applyScroll(scroll));
  } else {
    window.addEventListener('scroll', () => applyScroll(window.scrollY), { passive: true });
  }
  applyScroll(window.scrollY || 0);

  // --- mouse / gyro parallax on SVG layers ---
  let targetX = 0, targetY = 0;
  let mouseX = 0, mouseY = 0;
  let rafId = null;

  hero.addEventListener('mousemove', (e) => {
    const r = hero.getBoundingClientRect();
    targetX = ((e.clientX - r.left) / r.width  - 0.5) * 2;
    targetY = ((e.clientY - r.top)  / r.height - 0.5) * 2;
  });
  hero.addEventListener('mouseleave', () => { targetX = 0; targetY = 0; });

  window.addEventListener('deviceorientation', (e) => {
    if (e.gamma == null || e.beta == null) return;
    targetX = Math.max(-1, Math.min(1, e.gamma / 25));
    targetY = Math.max(-1, Math.min(1, (e.beta - 45) / 25));
  });

  const tick = () => {
    mouseX += (targetX - mouseX) * 0.06;
    mouseY += (targetY - mouseY) * 0.06;
    layers.forEach((layer) => {
      const d = parseFloat(layer.dataset.depth || '0.2');
      const tx = -mouseX * d * 40;
      const ty = -mouseY * d * 24;
      layer.style.transform = `translate3d(${tx}px, ${ty}px, 0)`;
    });
    rafId = requestAnimationFrame(tick);
  };
  tick();

  // pause when hero leaves viewport (battery)
  const visIo = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting && rafId == null) rafId = requestAnimationFrame(tick);
      else if (!e.isIntersecting && rafId != null) {
        cancelAnimationFrame(rafId); rafId = null;
      }
    });
  }, { threshold: 0 });
  visIo.observe(hero);
}

/* ---------- boot ---------- */
function boot() {
  initPalette();
  const lenis = initLenis();
  initProgress(lenis);
  initReveals();
  initHeroParallax(lenis);
  initStory(lenis);
  initHGallery(lenis);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
