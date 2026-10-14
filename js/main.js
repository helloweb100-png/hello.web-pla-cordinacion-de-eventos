/* ==========================================================================
   PAL Coordinación de Eventos & Wedding Planner
   Interacciones y animaciones.

   Dependencias locales (assets/vendor): GSAP 3.12 + ScrollTrigger y Lenis 1.1.
   Principios:
   - Toda animación tiene una razón: jerarquía, narración, retroalimentación
     o cambio de estado.
   - Nada de listeners de "scroll" manuales: todo va por ScrollTrigger,
     IntersectionObserver o Lenis.
   - Con prefers-reduced-motion la página queda estática y completa.
   - Si algo de JS falla, el contenido sigue visible y los enlaces funcionan.
   ========================================================================== */
(() => {
  'use strict';

  /* ---------- Configuración del negocio ---------- */
  const WA_NUMBER = '528447679690';          // 844 767 9690 con lada de México (52)
  const PROMO_MONTH = 9;                      // 0 = enero ... 9 = octubre (mes de la promoción)

  /* ---------- Utilidades ---------- */
  const root = document.documentElement;
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FINE_POINTER = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const DESKTOP = window.matchMedia('(min-width: 900px)');
  const HAS_GSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const safe = (name, fn) => { try { fn(); } catch (e) { console.warn('[PAL] ' + name, e); } };
  const pad2 = (n) => String(n).padStart(2, '0');
  const waLink = (msg) => `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;

  let lenis = null;
  let promoActive = false;
  let menuOpen = false;

  /* ==========================================================================
     1. Funciones que NO dependen de GSAP (siempre activas)
     ========================================================================== */

  /* Enlaces de WhatsApp con mensaje prellenado */
  function initWhatsAppLinks() {
    $$('[data-wa]').forEach((a) => { a.href = waLink(a.dataset.wa); });
  }

  function initYear() {
    const y = $('[data-year]');
    if (y) y.textContent = new Date().getFullYear();
  }

  /* Botones: el relleno de hover nace donde entra el cursor; algunos son magnéticos */
  function initButtons() {
    $$('.btn').forEach((btn) => {
      const setOrigin = (e) => {
        const r = btn.getBoundingClientRect();
        btn.style.setProperty('--x', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
        btn.style.setProperty('--y', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
      };
      btn.addEventListener('pointerenter', setOrigin);
      btn.addEventListener('pointerleave', setOrigin);
      if (!FINE_POINTER || REDUCED || !btn.hasAttribute('data-magnetic')) return;
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        btn.style.translate = `${(dx * 0.18).toFixed(1)}px ${(dy * 0.28).toFixed(1)}px`;
      });
      btn.addEventListener('pointerleave', () => { btn.style.translate = '0 0'; });
    });
  }

  /* Menú móvil */
  function initMenu() {
    const burger = $('.nav__burger');
    const menu = $('#menu');
    if (!burger || !menu) return;
    let closeTimer;

    const open = () => {
      clearTimeout(closeTimer);
      menuOpen = true;
      menu.hidden = false;
      requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.add('is-open')));
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Cerrar menú');
      if (lenis) lenis.stop(); else root.style.overflow = 'hidden';
      $('[data-nav]').classList.remove('is-hidden');
    };
    const close = (immediate) => {
      if (!menuOpen) return;
      menuOpen = false;
      menu.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Abrir menú');
      if (lenis) lenis.start(); else root.style.overflow = '';
      closeTimer = setTimeout(() => { menu.hidden = true; }, immediate ? 0 : 850);
    };

    burger.addEventListener('click', () => (menuOpen ? close() : open()));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuOpen) { close(); burger.focus(); }
    });
    DESKTOP.addEventListener('change', (e) => { if (e.matches) close(true); });
    window.palCloseMenu = close;
  }

  /* Enlaces internos con scroll suave */
  function initAnchors() {
    document.addEventListener('click', (e) => {
      const a = e.target.closest('a[href^="#"]');
      if (!a) return;
      const id = a.getAttribute('href');
      if (!id || id === '#') return;
      const target = id === '#top' ? document.body : $(id);
      if (!target) return;
      e.preventDefault();
      if (typeof window.palCloseMenu === 'function') window.palCloseMenu();
      const go = () => {
        if (lenis) lenis.scrollTo(id === '#top' ? 0 : target, { duration: 1.6, offset: 0 });
        else target.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
      };
      menuOpen ? setTimeout(go, 120) : go();
      history.replaceState(null, '', id);
    });
  }

  /* Servicios: acordeón de imágenes (clic/tap; hover en escritorio) */
  let refreshTimer;
  const refreshLater = (ms = 1000) => {
    if (!HAS_GSAP) return;
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => ScrollTrigger.refresh(), ms);
  };

  function initServices() {
    const items = $$('[data-svc]');
    if (!items.length) return;
    const activate = (target) => {
      if (target.classList.contains('is-active')) return;
      items.forEach((it) => {
        const on = it === target;
        it.classList.toggle('is-active', on);
        $('.svc__toggle', it).setAttribute('aria-expanded', String(on));
      });
      refreshLater();
    };
    items.forEach((it) => {
      $('.svc__toggle', it).addEventListener('click', () => activate(it));
      let hoverTimer;
      it.addEventListener('pointerenter', (e) => {
        if (e.pointerType !== 'mouse' || !DESKTOP.matches) return;
        hoverTimer = setTimeout(() => activate(it), 90);
      });
      it.addEventListener('pointerleave', () => clearTimeout(hoverTimer));
    });
  }

  /* Preguntas frecuentes */
  function initFaq() {
    const items = $$('.faq__item');
    items.forEach((item) => {
      const q = $('.faq__q', item);
      q.addEventListener('click', () => {
        const willOpen = !item.classList.contains('is-open');
        items.forEach((o) => {
          const on = o === item && willOpen;
          o.classList.toggle('is-open', on);
          $('.faq__q', o).setAttribute('aria-expanded', String(on));
        });
        refreshLater(750);
      });
    });
  }

  /* Cronograma de ejemplo: avanza solo mientras está a la vista */
  function initTimeline() {
    const box = $('[data-timeline]');
    if (!box) return;
    const rows = $$('li', box);
    let i = 0;
    let timer = null;
    const paint = () => rows.forEach((li, k) => {
      li.classList.toggle('is-now', k === i);
      li.classList.toggle('is-done', k < i);
    });
    paint();
    if (REDUCED) return;
    const start = () => { if (!timer) timer = setInterval(() => { i = (i + 1) % rows.length; paint(); }, 1900); };
    const stop = () => { clearInterval(timer); timer = null; };
    new IntersectionObserver(([en]) => (en.isIntersecting ? start() : stop()), { threshold: 0.35 }).observe(box);
  }

  /* Cuenta regresiva de la promoción (hasta el último día del mes promocional) */
  function initCountdown() {
    const box = $('[data-countdown]');
    const ended = $('[data-countdown-ended]');
    if (!box) return;
    const now = new Date();
    const end = new Date(now.getFullYear(), PROMO_MONTH + 1, 0, 23, 59, 59);
    if (now > end) { if (ended) ended.hidden = false; return; }
    promoActive = true;
    box.hidden = false;
    const cells = { d: $('[data-cd="d"]'), h: $('[data-cd="h"]'), m: $('[data-cd="m"]'), s: $('[data-cd="s"]') };
    const tick = () => {
      let diff = Math.max(0, end - new Date());
      const d = Math.floor(diff / 864e5); diff -= d * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      cells.d.textContent = pad2(d); cells.h.textContent = pad2(h);
      cells.m.textContent = pad2(m); cells.s.textContent = pad2(s);
    };
    tick();
    setInterval(() => { if (!document.hidden) tick(); }, 1000);
  }

  /* Formulario: valida y abre WhatsApp con el mensaje armado */
  function initForm() {
    const form = $('#form');
    if (!form) return;
    const nombre = $('#f-nombre');
    const fecha = $('#f-fecha');
    const errNombre = $('#err-nombre');
    const errTipo = $('#err-tipo');
    const ok = $('#form-ok');
    const okLink = $('#form-ok-link');

    const today = new Date();
    fecha.min = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;

    nombre.addEventListener('input', () => {
      if (nombre.value.trim().length >= 2) { errNombre.textContent = ''; nombre.removeAttribute('aria-invalid'); }
    });
    $$('input[name="tipo"]', form).forEach((r) => r.addEventListener('change', () => { errTipo.textContent = ''; }));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nombre.value.trim();
      const tipo = ($('input[name="tipo"]:checked', form) || {}).value;
      let valid = true;

      if (name.length < 2) {
        errNombre.textContent = 'Escribe tu nombre para que sepamos cómo llamarte.';
        nombre.setAttribute('aria-invalid', 'true');
        valid = false;
      }
      if (!tipo) {
        errTipo.textContent = 'Elige qué vamos a celebrar.';
        valid = false;
      }
      if (!valid) {
        const firstBad = name.length < 2 ? nombre : $('input[name="tipo"]', form);
        firstBad.focus();
        return;
      }

      const parts = [`Hola PAL, soy ${name}. Quiero cotizar la coordinación de mi ${tipo}.`];
      if (fecha.value) {
        const d = new Date(fecha.value + 'T12:00:00');
        parts.push(`Mi fecha tentativa es el ${d.toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}.`);
      } else {
        parts.push('Todavía no tengo definida la fecha.');
      }
      const inv = $('#f-invitados').value;
      if (inv) parts.push(`Calculo ${inv} invitados.`);
      const msg = $('#f-msg').value.trim();
      if (msg) parts.push(`Lo que imagino: ${msg.replace(/[.\s]+$/, '')}.`);
      if (promoActive) parts.push('Vi la promoción de octubre (25% de descuento y cabina de cortesía).');

      const url = waLink(parts.join(' '));
      okLink.href = url;
      ok.hidden = false;
      const win = window.open(url, '_blank', 'noopener');
      if (!win) window.location.href = url;
    });
  }

  /* ==========================================================================
     2. Preloader
     ========================================================================== */
  function runLoader(done) {
    const loader = $('#loader');
    if (!loader) { done(); return; }
    const bar = $('.loader__bar', loader);
    const count = $('[data-loader-count]', loader);
    const status = $('[data-loader-status]', loader);
    const messages = ['Preparando tu evento', 'Coordinando cada detalle', 'Acomodando la mesa', 'Todo listo'];
    const minTime = REDUCED ? 350 : 2300;
    const t0 = performance.now();
    let loaded = document.readyState === 'complete';
    let p = 0;
    let lastMsg = -1;
    root.style.overflow = 'hidden';
    window.addEventListener('load', () => { loaded = true; }, { once: true });

    const exit = () => {
      const finish = () => { loader.remove(); root.style.overflow = ''; };
      if (!HAS_GSAP || REDUCED) {
        loader.style.transition = 'opacity .35s';
        loader.style.opacity = '0';
        setTimeout(finish, 380);
        done();
        return;
      }
      const l = $('.loader__curtain--l', loader);
      const r = $('.loader__curtain--r', loader);
      const tl = gsap.timeline({ onComplete: finish });
      tl.to($('.loader__center', loader), { opacity: 0, scale: 1.12, duration: 0.7, ease: 'power2.in' })
        .add(done, 0.55)
        .to(l, { xPercent: -101, duration: 1.5, ease: 'expo.inOut' }, 0.45)
        .to(r, { xPercent: 101, duration: 1.5, ease: 'expo.inOut' }, 0.45);
    };

    const frame = (now) => {
      const t = Math.min((now - t0) / minTime, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const cap = loaded ? 100 : 92;
      p = Math.max(p, Math.min(eased * 100, cap));
      bar.style.strokeDashoffset = String(100 - p);
      count.textContent = String(Math.round(p));
      const mi = Math.min(messages.length - 1, Math.floor(p / (100 / messages.length)));
      if (mi !== lastMsg) { status.textContent = messages[mi]; lastMsg = mi; }
      if (p >= 99.9 && loaded && t >= 1) { exit(); return; }
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    setTimeout(() => { loaded = true; }, 6000); // red muy lenta: no dejar al visitante esperando
  }

  /* ==========================================================================
     3. Partículas (canvas) - hero y contacto
     ========================================================================== */
  function createParticles(canvas, mode, pointerHost) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const night = mode === 'night';
    let w = 0, h = 0, parts = [], running = false;
    const mouse = { x: -999, y: -999 };
    const scheme = window.matchMedia('(prefers-color-scheme: dark)');
    let rgb = night ? '233,214,176' : getComputedStyle(root).getPropertyValue('--particle').trim() || '168,152,127';
    scheme.addEventListener('change', () => { if (!night) rgb = getComputedStyle(root).getPropertyValue('--particle').trim(); });

    const make = (initial) => ({
      x: Math.random() * w,
      y: initial ? Math.random() * h : h + 24,
      r: night ? 2.5 + Math.random() * 7 : 0.8 + Math.random() * 2.2,
      vy: -(night ? 0.1 : 0.08) - Math.random() * (night ? 0.28 : 0.32),
      vx: (Math.random() - 0.5) * 0.16,
      ph: Math.random() * 6.283,
      sp: 0.4 + Math.random() * 0.9,
      a: night ? 0.1 + Math.random() * 0.26 : 0.28 + Math.random() * 0.5
    });
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      w = r.width; h = r.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const n = Math.min(night ? 38 : 80, Math.round((w * h) / (night ? 26000 : 15000)));
      parts = Array.from({ length: n }, () => make(true));
    };
    const draw = () => {
      ctx.clearRect(0, 0, w, h);
      for (const p of parts) {
        p.ph += 0.012 * p.sp;
        p.x += p.vx + Math.sin(p.ph) * 0.22;
        p.y += p.vy;
        if (!night) {
          const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
          if (d2 < 15000) { const d = Math.sqrt(d2) || 1, f = (1 - d2 / 15000) * 1.8; p.x += (dx / d) * f; p.y += (dy / d) * f; }
        }
        if (p.y < -30 || p.x < -30 || p.x > w + 30) Object.assign(p, make(false));
        const a = p.a * (0.6 + 0.4 * Math.sin(p.ph * 2.3));
        if (night) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 2.4);
          g.addColorStop(0, `rgba(${rgb},${a})`); g.addColorStop(1, `rgba(${rgb},0)`);
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 2.4, 0, 6.283); ctx.fill();
        } else {
          ctx.fillStyle = `rgba(${rgb},${a})`; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill();
        }
      }
    };
    const start = () => { if (!running) { running = true; gsap.ticker.add(draw); } };
    const stop = () => { if (running) { running = false; gsap.ticker.remove(draw); } };

    resize();
    new ResizeObserver(resize).observe(canvas);
    new IntersectionObserver(([en]) => (en.isIntersecting ? start() : stop()), { threshold: 0 }).observe(canvas);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : null));
    if (!night && FINE_POINTER && pointerHost) {
      pointerHost.addEventListener('pointermove', (e) => {
        const r = canvas.getBoundingClientRect();
        mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
      });
      pointerHost.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    }
  }

  /* ==========================================================================
     4. Texto partido en palabras
     ========================================================================== */
  function wrapWords(node, mask) {
    Array.from(node.childNodes).forEach((ch) => {
      if (ch.nodeType === 3) {
        const frag = document.createDocumentFragment();
        ch.textContent.split(/(\s+)/).forEach((tok) => {
          if (!tok) return;
          if (/^\s+$/.test(tok)) { frag.append(document.createTextNode(' ')); return; }
          if (mask) {
            const w = document.createElement('span'); w.className = 'w';
            const i = document.createElement('span'); i.className = 'wi'; i.textContent = tok;
            w.append(i); frag.append(w);
          } else {
            const s = document.createElement('span'); s.className = 'sw'; s.textContent = tok; frag.append(s);
          }
        });
        ch.replaceWith(frag);
      } else if (ch.nodeType === 1 && !ch.hasAttribute('data-nosplit')) {
        wrapWords(ch, mask);
      }
    });
  }

  /* ==========================================================================
     5. Movimiento (GSAP + ScrollTrigger + Lenis)
     ========================================================================== */
  function initBasicsWithScrollTrigger() {
    /* Barra de progreso, navegación inteligente y botón de WhatsApp.
       Se usa también con movimiento reducido (no son animaciones decorativas). */
    const nav = $('[data-nav]');
    const wa = $('[data-wa-float]');
    const nudge = $('[data-wa-nudge]');

    gsap.to('.progress__bar', { scaleX: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: REDUCED ? false : 0.2 } });

    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: (self) => {
        const y = self.scroll();
        nav.classList.toggle('is-solid', y > 40);
        nav.classList.toggle('is-hidden', self.direction === 1 && y > 360 && !menuOpen);
      }
    });

    let nudged = false;
    try { nudged = sessionStorage.getItem('pal-nudge') === '1'; } catch (e) { /* sin storage */ }
    ScrollTrigger.create({
      trigger: '#inicio', start: 'bottom 70%',
      onEnter: () => {
        wa.classList.add('is-visible');
        if (!nudged) {
          nudged = true;
          try { sessionStorage.setItem('pal-nudge', '1'); } catch (e) { /* sin storage */ }
          setTimeout(() => nudge.classList.add('is-on'), 1500);
          setTimeout(() => nudge.classList.remove('is-on'), 7500);
        }
      },
      onLeaveBack: () => { wa.classList.remove('is-visible'); nudge.classList.remove('is-on'); }
    });
  }

  function initSmoothScroll() {
    if (REDUCED || typeof window.Lenis === 'undefined') return;
    lenis = new Lenis({ duration: 1.15, easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), wheelMultiplier: 0.95 });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
  }

  function initMotion() {
    gsap.defaults({ ease: 'expo.out' });
    const mm = gsap.matchMedia();

    /* --- Titulares: cada palabra sube desde una máscara --- */
    const heroTitle = $('[data-split="hero"]');
    const headings = $$('[data-split]');
    headings.forEach((el) => wrapWords(el, true));
    headings.forEach((el) => {
      if (el === heroTitle) return;
      gsap.from($$('.wi', el), {
        yPercent: 118, duration: 1.2, stagger: 0.055,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      });
    });
    const heroWords = $$('.wi', heroTitle);
    gsap.set(heroWords, { yPercent: 118 });

    /* --- Elementos que aparecen al entrar en pantalla --- */
    const reveals = $$('[data-reveal]');
    gsap.set(reveals, { opacity: 0, y: 30 });
    ScrollTrigger.batch(reveals, {
      start: 'top 90%', once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1.1, stagger: 0.1, overwrite: true })
    });

    /* --- Hero: estado inicial (la entrada se dispara al abrirse el telón) --- */
    const hv = $('.hero__visual');
    $$('[data-depth]').forEach((el) => el.style.setProperty('--d', el.dataset.depth));
    gsap.set(['[data-hero="strip"]', '[data-hero="lead"]', '[data-hero="actions"]'], { opacity: 0 });
    gsap.set('.hero__arch', { clipPath: 'inset(100% 0% 0% 0%)' });
    gsap.set('.hero__arch img', { scale: 1.4 });
    gsap.set('.hero__card--a', { clipPath: 'inset(0% 0% 100% 0% round 22px)' });
    gsap.set('.hero__card--b', { clipPath: 'inset(0% 0% 100% 0% round 22px)' });
    gsap.set(['.hero__ring', '.hero__orbit'], { opacity: 0 });

    /* Parallax del hero al hacer scroll */
    gsap.to(hv, { yPercent: -9, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
    gsap.to('.hero__copy', { yPercent: -12, opacity: 0.25, ease: 'none', scrollTrigger: { trigger: '.hero', start: '55% top', end: 'bottom top', scrub: true } });

    /* Parallax con el mouse */
    if (FINE_POINTER) {
      const hero = $('.hero');
      let queued = false, nx = 0, ny = 0;
      hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        nx = (e.clientX - r.left) / r.width * 2 - 1;
        ny = (e.clientY - r.top) / r.height * 2 - 1;
        if (!queued) {
          queued = true;
          requestAnimationFrame(() => { hv.style.setProperty('--px', nx.toFixed(3)); hv.style.setProperty('--py', ny.toFixed(3)); queued = false; });
        }
      });
      hero.addEventListener('pointerleave', () => { hv.style.setProperty('--px', 0); hv.style.setProperty('--py', 0); });
    }

    /* --- Marquee: se duplica para un bucle sin saltos --- */
    const track = $('[data-marquee]');
    if (track && track.firstElementChild) {
      for (let i = 0; i < 3; i++) {
        const clone = track.firstElementChild.cloneNode(true);
        clone.setAttribute('aria-hidden', 'true');
        track.append(clone);
      }
    }

    /* --- Manifiesto: las palabras se iluminan con el scroll --- */
    const st = $('[data-statement]');
    if (st) {
      wrapWords(st, false);
      gsap.fromTo($$('.sw', st), { opacity: 0.14 }, {
        opacity: 1, ease: 'none', stagger: 0.14,
        scrollTrigger: { trigger: st, start: 'top 82%', end: 'bottom 60%', scrub: 0.6 }
      });
      $$('.thumb', st).forEach((t) => {
        gsap.fromTo(t, { clipPath: 'inset(0% 100% 0% 0% round 999px)' }, {
          clipPath: 'inset(0% 0% 0% 0% round 999px)', ease: 'none',
          scrollTrigger: { trigger: t, start: 'top 88%', end: 'top 58%', scrub: true }
        });
      });
    }

    /* --- Imagen que se abre: de arco a pantalla completa --- */
    const zoom = $('[data-zoom]');
    if (zoom) {
      const media = $('[data-zoom-media]', zoom);
      const zimg = $('img', media);
      const scrim = $('[data-zoom-scrim]', zoom);
      const lines = $$('[data-zoom-line]', zoom);
      const cta = $('[data-zoom-cta]', zoom);
      mm.add({ wide: '(min-width: 900px)', narrow: '(max-width: 899px)' }, (ctx) => {
        const from = ctx.conditions.wide
          ? 'inset(13% 33% 12% 33% round 700px 700px 30px 30px)'
          : 'inset(15% 13% 15% 13% round 400px 400px 24px 24px)';
        gsap.set(media, { clipPath: from });
        gsap.set(zimg, { scale: 1.35 });
        gsap.set(scrim, { opacity: 0 });
        gsap.set(lines, { opacity: 0, yPercent: 45 });
        gsap.set(cta, { opacity: 0, y: 30 });
        gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: { trigger: zoom, start: 'top top', end: '+=170%', scrub: 0.8, pin: '.zoom__pin', anticipatePin: 1 }
        })
          .to(media, { clipPath: 'inset(0% 0% 0% 0% round 0px 0px 0px 0px)', duration: 1.2, ease: 'power1.inOut' }, 0)
          .to(zimg, { scale: 1, duration: 1.7 }, 0)
          .to(scrim, { opacity: 1, duration: 0.6 }, 0.75)
          .to(lines, { opacity: 1, yPercent: 0, stagger: 0.24, duration: 0.55, ease: 'power2.out' }, 1)
          .to(cta, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 1.75)
          .to({}, { duration: 0.35 });
      });
    }

    /* --- Servicios: entrada escalonada --- */
    const svcs = $$('[data-svc]');
    if (svcs.length) {
      gsap.from(svcs, { y: 70, opacity: 0, duration: 1.3, stagger: 0.12, scrollTrigger: { trigger: '[data-services]', start: 'top 85%', once: true } });
    }

    /* --- Bento: aparición por lotes y parallax de las fotos --- */
    const tiles = $$('[data-tile]');
    gsap.set(tiles, { opacity: 0, y: 64 });
    ScrollTrigger.batch(tiles, {
      start: 'top 92%', once: true,
      onEnter: (b) => gsap.to(b, { opacity: 1, y: 0, duration: 1.3, stagger: 0.13, overwrite: true })
    });
    $$('[data-bento] .tile--img').forEach((tile) => {
      gsap.fromTo($('img', tile), { yPercent: -6 }, {
        yPercent: 6, ease: 'none',
        scrollTrigger: { trigger: tile, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    });
    $$('[data-bento] .tile--img img').forEach((img) => { img.style.willChange = 'transform'; });

    /* --- Método: cada tarjeta se achica al llegar la siguiente --- */
    const cards = $$('[data-card]');
    cards.forEach((card, i) => {
      const next = cards[i + 1];
      if (!next) return;
      gsap.to(card, {
        scale: 0.93, '--dim': 0.5, ease: 'none',
        scrollTrigger: {
          trigger: next,
          start: 'top bottom',
          end: () => 'top ' + (parseFloat(getComputedStyle(next).top) || 0) + 'px',
          scrub: true, invalidateOnRefresh: true
        }
      });
    });

    /* --- Galería: scroll vertical que se convierte en desplazamiento horizontal --- */
    const gal = $('[data-gallery]');
    const galTrack = $('[data-gallery-track]');
    if (gal && galTrack) {
      gal.classList.add('is-pinned');
      const dist = () => Math.max(0, galTrack.scrollWidth - window.innerWidth);
      const pan = gsap.to(galTrack, {
        x: () => -dist(), ease: 'none',
        scrollTrigger: {
          trigger: gal, start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 0.7,
          anticipatePin: 1, invalidateOnRefresh: true,
          onUpdate: (self) => gal.style.setProperty('--gp', self.progress.toFixed(3))
        }
      });
      $$('.g__frame', gal).forEach((frame) => {
        gsap.fromTo($('img', frame), { xPercent: -5 }, {
          xPercent: 5, ease: 'none',
          scrollTrigger: { trigger: frame, containerAnimation: pan, start: 'left right', end: 'right left', scrub: true }
        });
      });
    }

    /* --- Promoción: el boleto aparece y el 25 se cuenta solo --- */
    const ticket = $('[data-ticket]');
    if (ticket) {
      gsap.from(ticket, { y: 90, opacity: 0, scale: 0.96, duration: 1.5, scrollTrigger: { trigger: ticket, start: 'top 88%', once: true } });
      const num = $('[data-count]', ticket);
      if (num) {
        num.textContent = '0';
        ScrollTrigger.create({
          trigger: ticket, start: 'top 80%', once: true,
          onEnter: () => {
            const o = { v: 0 };
            gsap.to(o, { v: Number(num.dataset.count), duration: 2.2, ease: 'power3.out', onUpdate: () => { num.textContent = Math.round(o.v); } });
          }
        });
      }
    }

    /* --- Contacto: la foto nocturna se desplaza más lento que el contenido --- */
    const contact = $('[data-contact]');
    if (contact) {
      gsap.fromTo($('.contact__photo', contact), { yPercent: -9 }, {
        yPercent: 9, ease: 'none',
        scrollTrigger: { trigger: contact, start: 'top bottom', end: 'bottom top', scrub: true }
      });
      gsap.fromTo($('.contact__mark', contact), { yPercent: 14 }, {
        yPercent: -14, ease: 'none',
        scrollTrigger: { trigger: contact, start: 'top bottom', end: 'bottom top', scrub: true }
      });
    }

    /* --- Pie: el logotipo sube y aparece --- */
    const fl = $('[data-footer-logo]');
    if (fl) {
      gsap.fromTo($('img', fl), { yPercent: 45, opacity: 0 }, {
        yPercent: 0, opacity: 0.96, ease: 'none',
        scrollTrigger: { trigger: fl, start: 'top 98%', end: 'bottom 88%', scrub: true }
      });
    }

    /* --- Partículas --- */
    const heroCanvas = $('[data-particles="hero"]');
    const nightCanvas = $('[data-particles="night"]');
    if (heroCanvas) createParticles(heroCanvas, 'hero', $('.hero'));
    if (nightCanvas) createParticles(nightCanvas, 'night', null);
  }

  /* Entrada del hero (se ejecuta cuando el telón empieza a abrirse) */
  function playHeroIntro() {
    if (!HAS_GSAP || REDUCED) return;
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to($$('.wi', $('[data-split="hero"]')), { yPercent: 0, duration: 1.5, stagger: 0.09 }, 0.1)
      .to('[data-hero="strip"]', { opacity: 1, duration: 1.2 }, 0.15)
      .to('[data-hero="lead"]', { opacity: 1, duration: 1.2 }, 0.55)
      .to('[data-hero="actions"]', { opacity: 1, duration: 1.2 }, 0.7)
      .to('.hero__arch', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.9, ease: 'expo.inOut' }, 0.2)
      .to('.hero__arch img', { scale: 1, duration: 2.4 }, 0.2)
      .to('.hero__card--a', { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.5, ease: 'expo.inOut' }, 0.85)
      .to('.hero__card--b', { clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.5, ease: 'expo.inOut' }, 1.0)
      .to(['.hero__ring', '.hero__orbit'], { opacity: 1, duration: 1.6, ease: 'power2.out' }, 1.2)
      .set('.hero__arch, .hero__card', { clearProps: 'clipPath' });
  }

  /* ==========================================================================
     6. Arranque
     ========================================================================== */
  function onReady() {
    if (lenis) lenis.start();
    if (HAS_GSAP) {
      playHeroIntro();
      ScrollTrigger.refresh();
    }
  }

  function boot() {
    safe('whatsapp', initWhatsAppLinks);
    safe('year', initYear);
    safe('buttons', initButtons);
    safe('menu', initMenu);
    safe('anchors', initAnchors);
    safe('services', initServices);
    safe('faq', initFaq);
    safe('timeline', initTimeline);
    safe('countdown', initCountdown);
    safe('form', initForm);

    if (HAS_GSAP) {
      gsap.registerPlugin(ScrollTrigger);
      ScrollTrigger.config({ ignoreMobileResize: true });
      safe('lenis', initSmoothScroll);
      safe('basics', initBasicsWithScrollTrigger);
      if (!REDUCED) safe('motion', initMotion);
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => ScrollTrigger.refresh());
      window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
    } else {
      /* Sin librerías: contenido completo y estático */
      const nav = $('[data-nav]'); if (nav) nav.classList.add('is-solid');
      const wa = $('[data-wa-float]'); if (wa) wa.classList.add('is-visible');
    }
    runLoader(onReady);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
