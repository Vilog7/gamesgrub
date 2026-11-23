/* ==========================================================================
   GAMER'S GRUB — main.js
   Application Initialization, Module Orchestration, 60fps Render Loop,
   Coin Counter HUD Updates, Efficient Background Pausing, & Website UI.
   ========================================================================== */

(function () {
  'use strict';

  document.addEventListener('DOMContentLoaded', () => {
    const engine = initEndlessRunner();
    setupHudCounter();
    setupEfficientBackgroundProcessing(engine);
    setupNavigation();
    setupGamesFilter();
    setupGalleryLightbox();
    setupContactForm();
    setupScrollReveals();
    setupReplayIntro(engine);

    const yearEl = document.getElementById('footer-year');
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());
  });

  /* ------------------------------------------------------------------------
     Initialize Modular 3D Endless-Runner & Continuous Animation Loop
     ------------------------------------------------------------------------ */
  function initEndlessRunner() {
    const sceneCtx = window.GamersGrubScene ? window.GamersGrubScene.create() : null;
    if (!sceneCtx) {
      if (window.GamersGrubScroll) window.GamersGrubScroll.create();
      return null;
    }

    const road = window.GamersGrubRoad.create(sceneCtx);
    const player = window.GamersGrubPlayer.create(sceneCtx.camera, sceneCtx.scene, sceneCtx.isLowPower);
    const coins = window.GamersGrubCoins.create(sceneCtx);
    const obstacles = window.GamersGrubObstacles.create(sceneCtx);

    let isPaused = false;
    let rafId = null;
    let lastTime = performance.now();
    let elapsed = 0;

    const scrollCtrl = window.GamersGrubScroll.create({
      onLeaveIntro() {
        pause();
      },
      onEnterIntro() {
        resume();
      },
    });

    function tick(now) {
      if (isPaused) {
        rafId = null;
        return;
      }

      const dt = Math.min(0.05, Math.max(0.001, (now - lastTime) / 1000));
      lastTime = now;
      elapsed += dt;

      const s = scrollCtrl.state;

      // 1. Update 3D runner character & ultra-smooth chase camera
      player.update(dt, s);
      const playerPos = player.getPosition();

      // 2. Update scene atmosphere, fog, directional & dynamic lights
      sceneCtx.updateAtmosphere(s.envOpacity, s.lightsReveal, playerPos);

      // 3. Update & recycle endless 3D road segments, streetlights & buildings
      road.update(playerPos.z, s);

      // 4. Update 3D obstacles lighting/visibility
      obstacles.update(s.lightsReveal, s.envOpacity);

      // 5. Rotate 3D metallic coins, detect collisions, animate collection bursts
      coins.update(dt, elapsed, playerPos, s.coinsVisibility * s.envOpacity);

      // 6. Render frame
      sceneCtx.render();

      rafId = requestAnimationFrame(tick);
    }

    function pause() {
      isPaused = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function resume() {
      if (!isPaused) return;
      isPaused = false;
      lastTime = performance.now();
      if (rafId === null) {
        rafId = requestAnimationFrame(tick);
      }
    }

    // Expose read-only debug/verification hook for live testing
    window.__GAMERS_GRUB__ = {
      getState: () => ({
        ...scrollCtrl.state,
        coinsCollected: coins.getCount(),
        coinsTotal: coins.getTotal(),
        obstacleCount: obstacles.getObstacles().length,
        cameraPosition: {
          x: Number(sceneCtx.camera.position.x.toFixed(2)),
          y: Number(sceneCtx.camera.position.y.toFixed(2)),
          z: Number(sceneCtx.camera.position.z.toFixed(2)),
        },
      }),
      resetCoins: () => coins.resetAll(),
    };

    // Start render loop
    rafId = requestAnimationFrame(tick);

    return { pause, resume, resetCoins: () => coins.resetAll(), dispose: sceneCtx.dispose };
  }

  /* ------------------------------------------------------------------------
     Gaming Coin Counter HUD (COINS: 000 + subtle collect pulse)
     ------------------------------------------------------------------------ */
  function setupHudCounter() {
    const countEl = document.getElementById('hud-coin-count');
    const hudBox = document.getElementById('game-hud');
    const popEl = document.getElementById('hud-coin-pop');
    if (!countEl) return;

    let pulseTimeout;
    window.addEventListener('gamersgrub:coins-updated', (e) => {
      const { count, delta } = e.detail;
      countEl.textContent = String(count).padStart(3, '0');

      if (delta > 0 && hudBox) {
        hudBox.classList.remove('is-collecting');
        void hudBox.offsetWidth;
        hudBox.classList.add('is-collecting');

        if (popEl) {
          popEl.classList.remove('is-popping');
          void popEl.offsetWidth;
          popEl.classList.add('is-popping');
        }

        clearTimeout(pulseTimeout);
        pulseTimeout = setTimeout(() => {
          hudBox.classList.remove('is-collecting');
        }, 240);
      }
    });
  }

  /* ------------------------------------------------------------------------
     Efficient Background Processing for Three.js WebGL Stage
     ------------------------------------------------------------------------ */
  function setupEfficientBackgroundProcessing(engine) {
    if (!engine) return;
    const introStage = document.getElementById('intro-stage');
    if (!introStage) return;

    // Note: #intro-stage hosts a position:sticky viewport, so we use IntersectionObserver
    // (avoiding content-visibility containment that breaks sticky) to pause WebGL off-screen.
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) engine.resume();
            else engine.pause();
          });
        },
        { rootMargin: '150px' }
      );
      observer.observe(introStage);
    }

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) engine.pause();
      else engine.resume();
    });
  }

  /* ------------------------------------------------------------------------
     Responsive Navigation Drawer & Active Section Highlight
     ------------------------------------------------------------------------ */
  function setupNavigation() {
    const menuBtn = document.getElementById('mobile-menu-btn');
    const drawer = document.getElementById('mobile-nav-drawer');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');
    const navLinks = document.querySelectorAll('.nav-link');

    function closeDrawer() {
      if (!menuBtn || !drawer) return;
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.setAttribute('aria-label', 'Open navigation menu');
      drawer.hidden = true;
    }

    if (menuBtn && drawer) {
      menuBtn.addEventListener('click', () => {
        const isOpen = menuBtn.getAttribute('aria-expanded') === 'true';
        menuBtn.setAttribute('aria-expanded', String(!isOpen));
        menuBtn.setAttribute('aria-label', isOpen ? 'Open navigation menu' : 'Close navigation menu');
        drawer.hidden = isOpen;
      });

      mobileLinks.forEach((link) => link.addEventListener('click', closeDrawer));

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !drawer.hidden) {
          closeDrawer();
          menuBtn.focus();
        }
      });
    }

    const sectionIds = ['home', 'games', 'about', 'cafe', 'community', 'contact'];
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

    if ('IntersectionObserver' in window && sections.length) {
      const spy = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const id = entry.target.id;
            navLinks.forEach((link) => {
              link.classList.toggle('is-active', link.getAttribute('href') === `#${id}`);
            });
          });
        },
        { rootMargin: '-35% 0px -55% 0px' }
      );
      sections.forEach((sec) => spy.observe(sec));
    }
  }

  /* ------------------------------------------------------------------------
     Popular Games Search & Platform Filter
     ------------------------------------------------------------------------ */
  function setupGamesFilter() {
    const searchInput = document.getElementById('game-search');
    const filterPills = document.querySelectorAll('.filter-pill');
    const resetBtn = document.getElementById('reset-games-btn');
    const cards = document.querySelectorAll('#games-grid .game-card-wrap');
    const emptyState = document.getElementById('games-empty-state');

    let activePlatform = 'all';
    let searchQuery = '';

    function applyFilter() {
      let visibleCount = 0;
      cards.forEach((card) => {
        const platforms = (card.dataset.platform || '').toLowerCase();
        const title = (card.dataset.title || '').toLowerCase();
        const matchesPlatform = activePlatform === 'all' || platforms.includes(activePlatform);
        const matchesSearch = !searchQuery || title.includes(searchQuery);
        const show = matchesPlatform && matchesSearch;
        card.hidden = !show;
        if (show) visibleCount++;
      });
      if (emptyState) emptyState.hidden = visibleCount > 0;
    }

    filterPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        activePlatform = pill.dataset.filter || 'all';
        filterPills.forEach((p) => p.classList.toggle('is-active', p === pill));
        applyFilter();
      });
    });

    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        applyFilter();
        if (searchQuery) {
          const gamesSection = document.getElementById('games');
          if (gamesSection && window.scrollY < gamesSection.offsetTop - 400) {
            gamesSection.scrollIntoView({ behavior: 'smooth' });
          }
        }
      });
    }

    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        activePlatform = 'all';
        searchQuery = '';
        if (searchInput) searchInput.value = '';
        filterPills.forEach((p) => p.classList.toggle('is-active', p.dataset.filter === 'all'));
        applyFilter();
      });
    }
  }

  /* ------------------------------------------------------------------------
     Native <dialog closedby="any"> Gallery Lightbox (+ Safari fallback)
     ------------------------------------------------------------------------ */
  function setupGalleryLightbox() {
    const dialog = document.getElementById('gallery-lightbox');
    const imgEl = document.getElementById('lightbox-img');
    const captionEl = document.getElementById('lightbox-caption');
    const closeBtn = document.getElementById('lightbox-close');
    const prevBtn = document.getElementById('lightbox-prev');
    const nextBtn = document.getElementById('lightbox-next');
    const triggers = Array.from(document.querySelectorAll('.gallery-item'));

    if (!dialog || !imgEl || !triggers.length) return;

    let currentIndex = 0;

    function showSlide(index) {
      currentIndex = (index + triggers.length) % triggers.length;
      const item = triggers[currentIndex];
      const thumb = item.querySelector('img');
      imgEl.src = item.dataset.full || (thumb ? thumb.src : '');
      imgEl.alt = thumb ? thumb.alt : "Gamer's Grub gallery photo";
      if (captionEl) captionEl.textContent = item.dataset.caption || '';
    }

    triggers.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        showSlide(idx);
        dialog.showModal();
      });
    });

    if (closeBtn) closeBtn.addEventListener('click', () => dialog.close());
    if (prevBtn) prevBtn.addEventListener('click', () => showSlide(currentIndex - 1));
    if (nextBtn) nextBtn.addEventListener('click', () => showSlide(currentIndex + 1));

    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') showSlide(currentIndex - 1);
      if (e.key === 'ArrowRight') showSlide(currentIndex + 1);
    });

    if (!('closedBy' in HTMLDialogElement.prototype)) {
      dialog.addEventListener('click', (event) => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        const isInside =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!isInside) dialog.close();
      });
    }
  }

  /* ------------------------------------------------------------------------
     Accessible Post-Interaction Contact Form Validation
     ------------------------------------------------------------------------ */
  function setupContactForm() {
    const form = document.getElementById('contact-form');
    const statusEl = document.getElementById('form-status');
    if (!form) return;

    const supportsUserInvalid = CSS.supports('selector(:user-invalid)');
    const dirtyState = new WeakMap();
    const flagged = new WeakSet();
    const announced = new WeakSet();

    const announcer = document.createElement('div');
    announcer.setAttribute('aria-live', 'polite');
    announcer.classList.add('visually-hidden');
    document.body.append(announcer);
    let announceTimer;
    let announcedField;

    function linkError(el, shown) {
      const errorId = el.dataset.error;
      if (!errorId) return;
      const ids = (el.getAttribute('aria-describedby') || '')
        .split(/\s+/)
        .filter((id) => id && id !== errorId);
      if (shown) ids.push(errorId);
      if (ids.length) el.setAttribute('aria-describedby', ids.join(' '));
      else el.removeAttribute('aria-describedby');
    }

    function announceError(el) {
      const error = document.getElementById(el.dataset.error);
      if (!error) return;
      const label = el.labels?.[0] ? `${el.labels[0].textContent.trim()}: ` : '';
      clearTimeout(announceTimer);
      announcer.textContent = '';
      announcedField = el;
      announceTimer = setTimeout(() => {
        announcer.textContent = label + error.textContent.replace(/\s+/g, ' ').trim();
      }, 450);
    }

    function syncField(el, announce = false, forceInvalidCheck = false) {
      if (!el.matches?.('input, textarea')) return;
      let isInvalid = false;

      if (supportsUserInvalid) {
        isInvalid = el.matches(':user-invalid') || (forceInvalidCheck && !el.validity.valid);
      } else {
        const st = dirtyState.get(el);
        const shouldEvaluate = forceInvalidCheck || (st && st.hasInteracted && st.hasBlurred);
        isInvalid = shouldEvaluate ? !el.validity.valid : false;
        el.classList.toggle('user-invalid-fallback', isInvalid);
        el.classList.toggle('user-valid-fallback', Boolean(shouldEvaluate && el.validity.valid));
      }

      if (isInvalid) {
        if (announce && !announced.has(el)) {
          announceError(el);
          announced.add(el);
        }
        el.setAttribute('aria-invalid', 'true');
        linkError(el, true);
        flagged.add(el);
      } else if (flagged.has(el) || el.getAttribute('aria-invalid') !== 'true') {
        el.setAttribute('aria-invalid', 'false');
        linkError(el, false);
        flagged.delete(el);
        announced.delete(el);
        if (announcedField === el) {
          clearTimeout(announceTimer);
          announcer.textContent = '';
        }
      }
    }

    const fields = form.querySelectorAll('input, textarea');
    fields.forEach((f) => f.setAttribute('aria-invalid', 'false'));

    form.addEventListener(
      'blur',
      (e) => {
        const st = dirtyState.get(e.target) || { hasInteracted: false, hasBlurred: false };
        st.hasBlurred = true;
        dirtyState.set(e.target, st);
        syncField(e.target, true);
      },
      true
    );

    form.addEventListener('input', (e) => {
      const st = dirtyState.get(e.target) || { hasInteracted: false, hasBlurred: false };
      st.hasInteracted = true;
      dirtyState.set(e.target, st);
      syncField(e.target, false);
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let firstInvalid = null;

      fields.forEach((field) => {
        dirtyState.set(field, { hasInteracted: true, hasBlurred: true });
        if (!field.checkValidity()) {
          announced.add(field);
          syncField(field, false, true);
          if (!firstInvalid) firstInvalid = field;
        } else {
          syncField(field, false, true);
        }
      });

      if (firstInvalid) {
        firstInvalid.focus();
        return;
      }

      if (statusEl) {
        statusEl.textContent = "Message received! Our Gamer's Grub team will get back to you shortly.";
        statusEl.hidden = false;
      }
      form.reset();
      setTimeout(() => {
        fields.forEach((f) => {
          dirtyState.delete(f);
          f.classList.remove('user-invalid-fallback', 'user-valid-fallback');
          syncField(f, false, false);
        });
      });
    });
  }

  /* ------------------------------------------------------------------------
     Subtle Scroll-Triggered Section Reveals
     ------------------------------------------------------------------------ */
  function setupScrollReveals() {
    const items = document.querySelectorAll('.reveal-on-scroll');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach((el) => el.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    items.forEach((el) => observer.observe(el));
  }

  /* ------------------------------------------------------------------------
     Replay 3D Intro Button in Footer
     ------------------------------------------------------------------------ */
  function setupReplayIntro(engine) {
    const btn = document.getElementById('replay-intro-btn');
    if (!btn) return;
    btn.addEventListener('click', () => {
      if (engine) engine.resume();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
