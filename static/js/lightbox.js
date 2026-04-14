/* =========================================================
   Lightbox — universal, zero-dependency
   Auto-initialises on DOMContentLoaded
   ========================================================= */
(function () {
  'use strict';

  /* ---- helpers ----------------------------------------- */
  function shouldSkip(img) {
    if (!img.complete || img.naturalWidth === 0) return true;          // broken / not loaded
    if (img.naturalWidth < 100 || img.naturalHeight < 100) return true; // tiny (icon/logo)
    if (img.width < 100 || img.height < 100) return true;              // rendered tiny
    const cls = (img.className || '').toLowerCase();
    if (/logo|icon|nav|avatar|emoji/.test(cls)) return true;
    // also skip images inside <a class="*logo*|*nav*"> or <nav>
    let el = img.parentElement;
    while (el) {
      const tag = el.tagName.toLowerCase();
      if (tag === 'nav') return true;
      const c = (el.className || '').toLowerCase();
      if (/logo|icon|nav/.test(c)) return true;
      el = el.parentElement;
    }
    return false;
  }

  /* ---- build overlay DOM ------------------------------- */
  function buildOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'lightbox-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Image lightbox');

    const wrap = document.createElement('div');
    wrap.id = 'lightbox-img-wrap';

    const img = document.createElement('img');
    img.id = 'lightbox-img';
    img.alt = '';

    wrap.appendChild(img);

    const close = document.createElement('button');
    close.id = 'lightbox-close';
    close.setAttribute('aria-label', 'Close lightbox');
    close.innerHTML = '&times;';

    const prev = document.createElement('button');
    prev.id = 'lightbox-prev';
    prev.setAttribute('aria-label', 'Previous image');
    prev.innerHTML = '&#8592;';

    const next = document.createElement('button');
    next.id = 'lightbox-next';
    next.setAttribute('aria-label', 'Next image');
    next.innerHTML = '&#8594;';

    const counter = document.createElement('div');
    counter.id = 'lightbox-counter';

    overlay.appendChild(wrap);
    overlay.appendChild(close);
    overlay.appendChild(prev);
    overlay.appendChild(next);
    overlay.appendChild(counter);

    document.body.appendChild(overlay);
    return { overlay, img, close, prev, next, counter };
  }

  /* ---- main init --------------------------------------- */
  function init() {
    const allImgs = Array.from(document.querySelectorAll('img'));

    // Wait for images to load before measuring, then filter
    function getEligible() {
      return allImgs.filter(function (img) { return !shouldSkip(img); });
    }

    // Mark cursor immediately where we can determine size now
    allImgs.forEach(function (img) {
      if (img.complete) {
        if (!shouldSkip(img)) img.classList.add('lightbox-trigger');
      } else {
        img.addEventListener('load', function () {
          if (!shouldSkip(img)) img.classList.add('lightbox-trigger');
        });
      }
    });

    const { overlay, img: lbImg, close, prev, next, counter } = buildOverlay();

    let eligible = [];
    let current = 0;

    /* ---- open ------------------------------------------ */
    function open(index) {
      eligible = getEligible();
      if (!eligible.length) return;
      current = Math.max(0, Math.min(index, eligible.length - 1));

      const src = eligible[current];
      lbImg.src = src.currentSrc || src.src;
      lbImg.alt = src.alt || '';

      updateNav();
      overlay.classList.add('lb-open');
      document.body.style.overflow = 'hidden';
      close.focus();
    }

    function updateNav() {
      const single = eligible.length <= 1;
      prev.classList.toggle('lb-hidden', single);
      next.classList.toggle('lb-hidden', single);
      counter.classList.toggle('lb-hidden', single);
      if (!single) {
        counter.textContent = (current + 1) + ' / ' + eligible.length;
      }
    }

    /* ---- close ----------------------------------------- */
    function closeLB() {
      overlay.classList.remove('lb-open');
      document.body.style.overflow = '';
    }

    /* ---- navigate -------------------------------------- */
    function navigate(delta) {
      eligible = getEligible();
      current = (current + delta + eligible.length) % eligible.length;
      lbImg.src = eligible[current].currentSrc || eligible[current].src;
      lbImg.alt = eligible[current].alt || '';
      updateNav();
    }

    /* ---- events: open on click ------------------------- */
    document.addEventListener('click', function (e) {
      const img = e.target.closest('img.lightbox-trigger');
      if (!img) return;
      e.preventDefault();
      eligible = getEligible();
      const idx = eligible.indexOf(img);
      open(idx >= 0 ? idx : 0);
    });

    /* ---- events: close --------------------------------- */
    close.addEventListener('click', closeLB);

    overlay.addEventListener('click', function (e) {
      // close if clicking backdrop or the wrap (not the image itself)
      if (e.target === overlay || e.target.id === 'lightbox-img-wrap') closeLB();
    });

    document.addEventListener('keydown', function (e) {
      if (!overlay.classList.contains('lb-open')) return;
      if (e.key === 'Escape') closeLB();
      if (e.key === 'ArrowLeft') navigate(-1);
      if (e.key === 'ArrowRight') navigate(1);
    });

    prev.addEventListener('click', function () { navigate(-1); });
    next.addEventListener('click', function () { navigate(1); });

    /* ---- touch / swipe --------------------------------- */
    let touchStartX = 0;
    let touchStartY = 0;

    overlay.addEventListener('touchstart', function (e) {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    }, { passive: true });

    overlay.addEventListener('touchend', function (e) {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      // only act if horizontal swipe dominates
      if (Math.abs(dx) < 40 && Math.abs(dy) < 40) {
        // tap — close if not on image
        if (e.target === overlay || e.target.id === 'lightbox-img-wrap') closeLB();
        return;
      }
      if (Math.abs(dx) > Math.abs(dy)) {
        navigate(dx < 0 ? 1 : -1);
      }
    }, { passive: true });
  }

  /* ---- bootstrap --------------------------------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
