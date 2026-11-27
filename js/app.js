/* =========================================================
   AI Pharma / HEOR Intelligence — Presentación interactiva
   Navegación por teclado · swipe táctil · índice · vista general
   Sin dependencias · compatible con GitHub Pages
   ========================================================= */
(function () {
  'use strict';

  /* ---------- Referencias del DOM ---------- */
  const deck     = document.getElementById('deck');
  const slides   = Array.from(document.querySelectorAll('.slide'));
  const N        = slides.length;

  const bar        = document.getElementById('progress-bar');
  const counter    = document.getElementById('counter');
  const sectionLbl = document.getElementById('section-label');
  const dotsWrap   = document.getElementById('dots');
  const btnPrev    = document.getElementById('btn-prev');
  const btnNext    = document.getElementById('btn-next');
  const btnMenu    = document.getElementById('btn-menu');
  const btnMenuX   = document.getElementById('btn-menu-close');
  const menu       = document.getElementById('menu');
  const backdrop   = document.getElementById('backdrop');
  const btnOv      = document.getElementById('btn-overview');
  const btnOvX     = document.getElementById('btn-overview-close');
  const overview   = document.getElementById('overview');
  const ovGrid     = document.getElementById('overview-grid');
  const btnFs      = document.getElementById('btn-fullscreen');
  const hint       = document.getElementById('hint');

  if (!N) return;

  let current  = 0;
  let menuOpen = false;
  let ovOpen   = false;

  const clamp = (i) => Math.max(0, Math.min(N - 1, i));
  const isDark = (i) => slides[i].dataset.theme === 'dark';

  /* ---------- Puntos de navegación (dots) ---------- */
  slides.forEach((s, i) => {
    const d = document.createElement('button');
    d.type = 'button';
    d.className = 'dot';
    d.setAttribute('role', 'tab');
    d.setAttribute('aria-label', `Ir a la diapositiva ${i + 1}: ${s.dataset.title || ''}`);
    d.addEventListener('click', () => goTo(i));
    dotsWrap.appendChild(d);
  });
  const dots = Array.from(dotsWrap.children);

  /* ---------- Vista general: se construye una vez ---------- */
  slides.forEach((s, i) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'ov-item';
    item.innerHTML =
      `<span class="ov-item__n">${String(i + 1).padStart(2, '0')}</span>` +
      `<span class="ov-item__s">${s.dataset.section || ''}</span>` +
      `<span class="ov-item__t">${s.dataset.title || ''}</span>`;
    item.addEventListener('click', () => { goTo(i); closeOverview(); });
    ovGrid.appendChild(item);
  });
  const ovItems = Array.from(ovGrid.children);

  /* ---------- Navegación principal ---------- */
  function goTo(i, opts) {
    opts = opts || {};
    i = clamp(i);
    if (i === current && !opts.force) { syncHash(); return; }

    slides.forEach((s, j) => {
      const active = j === i;
      s.classList.toggle('is-active', active);
      s.setAttribute('aria-hidden', String(!active));
      if ('inert' in s) s.inert = !active;
      if (active) s.scrollTop = 0;                 /* reinicia scroll al cambiar */
    });

    current = i;

    /* Progreso, contador y etiqueta de sección */
    bar.style.transform = `scaleX(${(i + 1) / N})`;
    counter.textContent = `${i + 1} / ${N}`;
    sectionLbl.textContent = slides[i].dataset.section || `Diapositiva ${i + 1}`;

    /* Tema (oscuro en portada) */
    deck.dataset.theme = isDark(i) ? 'dark' : 'light';
    document.querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', isDark(i) ? '#071a2e' : '#f4f7fb');

    /* Dots */
    dots.forEach((d, j) => d.setAttribute('aria-selected', String(j === i)));
    btnPrev.disabled = i === 0;
    btnNext.disabled = i === N - 1;

    /* Índice y vista general: resaltar la actual */
    document.querySelectorAll('.menu__item').forEach((m) => {
      m.classList.toggle('is-current', m.dataset.section === slides[i].dataset.section);
    });
    ovItems.forEach((o, j) => o.classList.toggle('is-current', j === i));

    /* Contadores animados de la diapositiva activa */
    animateCounters(slides[i]);

    if (opts.updateHash !== false) syncHash();
  }

  const next = () => goTo(current + 1);
  const prev = () => goTo(current - 1);

  function syncHash() {
    const target = `#${current + 1}`;
    if (location.hash !== target) {
      history.replaceState(null, '', target);
    }
  }

  /* ---------- Contadores numéricos (solo una vez por diapositiva) ---------- */
  function animateCounters(slide) {
    slide.querySelectorAll('.stat__num[data-count]').forEach((el) => {
      if (el.dataset.done) return;
      el.dataset.done = '1';
      const end = parseInt(el.dataset.count, 10);
      if (prefersReduced()) { el.textContent = end; return; }
      const dur = 900, t0 = performance.now();
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(end * eased);
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }

  const prefersReduced = () =>
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Teclado ---------- */
  document.addEventListener('keydown', (e) => {
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;

    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
        e.preventDefault(); if (menuOpen) return; next(); break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault(); if (menuOpen) return; prev(); break;
      case ' ':
      case 'Spacebar':
        /* Si el foco está en un botón, el navegador ya lo activará con Space:
           evitamos así una navegación doble (botón + manejador global). */
        if (t && t.tagName === 'BUTTON') return;
        e.preventDefault(); if (menuOpen) return; e.shiftKey ? prev() : next(); break;
      case 'Home':
        e.preventDefault(); goTo(0); break;
      case 'End':
        e.preventDefault(); goTo(N - 1); break;
      case 'Escape':
        if (ovOpen) closeOverview();
        else if (menuOpen) closeMenu();
        break;
      case 'o': case 'O':
        ovOpen ? closeOverview() : openOverview(); break;
      case 'f': case 'F':
        toggleFullscreen(); break;
      case 'm': case 'M':
        menuOpen ? closeMenu() : openMenu(); break;
    }
  });

  /* ---------- Swipe táctil ---------- */
  let tx = 0, ty = 0, tt = 0, swiping = false;
  const MIN_DX = 60, MAX_DT = 700;

  const area = document.getElementById('slides');

  area.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || menuOpen || ovOpen) return;
    const touch = e.touches[0];
    tx = touch.clientX; ty = touch.clientY; tt = Date.now(); swiping = true;
  }, { passive: true });

  area.addEventListener('touchend', (e) => {
    if (!swiping) return;
    swiping = false;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - tx;
    const dy = touch.clientY - ty;
    const dt = Date.now() - tt;
    /* Solo gestos horizontales claros y rápidos */
    if (dt <= MAX_DT && Math.abs(dx) >= MIN_DX && Math.abs(dx) > Math.abs(dy) * 1.6) {
      dx < 0 ? next() : prev();
    }
  }, { passive: true });

  /* ---------- Botones de navegación ---------- */
  btnNext.addEventListener('click', next);
  btnPrev.addEventListener('click', prev);

  /* ---------- Índice lateral ---------- */
  /* Los paneles son mutuamente excluyentes: abrir uno cierra al otro */
  function closeMenuQuiet() {
    if (!menuOpen) return;
    menuOpen = false;
    menu.classList.remove('is-open');
    backdrop.classList.remove('is-open');
    btnMenu.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (!menuOpen) { menu.hidden = true; backdrop.hidden = true; } }, 380);
  }

  function openMenu() {
    if (ovOpen) closeOverviewQuiet();
    menuOpen = true;
    menu.hidden = false; backdrop.hidden = false;
    requestAnimationFrame(() => {
      menu.classList.add('is-open');
      backdrop.classList.add('is-open');
    });
    btnMenu.setAttribute('aria-expanded', 'true');
    btnMenuX.focus();
  }
  function closeMenu() {
    closeMenuQuiet();
    btnMenu.focus();
  }
  btnMenu.addEventListener('click', () => menuOpen ? closeMenu() : openMenu());
  btnMenuX.addEventListener('click', closeMenu);
  backdrop.addEventListener('click', closeMenu);

  document.querySelectorAll('.menu__item').forEach((item) => {
    item.addEventListener('click', () => {
      const sec = item.dataset.section;
      const idx = slides.findIndex((s) => s.dataset.section === sec);
      if (idx >= 0) goTo(idx);
      closeMenu();
    });
  });

  /* ---------- Vista general ---------- */
  function closeOverviewQuiet() {
    if (!ovOpen) return;
    ovOpen = false;
    overview.classList.remove('is-open');
    btnOv.setAttribute('aria-expanded', 'false');
    setTimeout(() => { if (!ovOpen) overview.hidden = true; }, 340);
  }

  function openOverview() {
    if (menuOpen) closeMenuQuiet();
    ovOpen = true;
    overview.hidden = false;
    requestAnimationFrame(() => overview.classList.add('is-open'));
    btnOv.setAttribute('aria-expanded', 'true');
    (ovItems[current] || btnOvX).focus();
  }
  function closeOverview() {
    closeOverviewQuiet();
    btnOv.focus();
  }
  btnOv.addEventListener('click', () => ovOpen ? closeOverview() : openOverview());
  btnOvX.addEventListener('click', closeOverview);

  /* Cerrar al pulsar fuera del grid */
  overview.addEventListener('click', (e) => {
    if (e.target === overview) closeOverview();
  });

  /* ---------- Pantalla completa ---------- */
  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.();
    }
  }
  btnFs.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    const on = !!document.fullscreenElement;
    btnFs.setAttribute('aria-pressed', String(on));
    btnFs.setAttribute('aria-label', on ? 'Salir de pantalla completa (tecla F)' : 'Activar pantalla completa (tecla F)');
  });

  /* ---------- Pista de uso (una vez por sesión) ---------- */
  function showHint() {
    const mobile = window.matchMedia('(hover: none)').matches;
    hint.textContent = mobile
      ? 'Desliza ↔ para navegar · toca ⛶ para el índice'
      : 'Usa ← → para navegar · O: vista general · F: pantalla completa';
    hint.classList.add('is-visible');
    setTimeout(() => hint.classList.remove('is-visible'), 4800);
  }

  /* ---------- Rueda horizontal (trackpad) ---------- */
  let wheelLock = 0;
  area.addEventListener('wheel', (e) => {
    if (menuOpen || ovOpen) return;
    /* Solo gestos horizontales inequívocos del trackpad */
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY) * 2 && Math.abs(e.deltaX) > 40) {
      const now = Date.now();
      if (now - wheelLock < 500) return;
      wheelLock = now;
      e.deltaX > 0 ? next() : prev();
    }
  }, { passive: true });

  /* ---------- Deep links (#3) y arranque ---------- */
  function initialIndex() {
    const m = location.hash.match(/^#(\d{1,2})$/);
    return m ? clamp(parseInt(m[1], 10) - 1) : 0;
  }

  window.addEventListener('hashchange', () => {
    const i = initialIndex();
    if (i !== current) goTo(i, { updateHash: false });
  });

  /* Flechas en móviles: los botones grandes también responden a swipe en ellos */
  btnNext.addEventListener('touchend', (e) => { e.preventDefault(); next(); }, { passive: false });
  btnPrev.addEventListener('touchend', (e) => { e.preventDefault(); prev(); }, { passive: false });

  /* ---------- Arranque ---------- */
  goTo(initialIndex(), { force: true, updateHash: false });
  syncHash();
  setTimeout(showHint, 900);
})();
