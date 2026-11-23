/* ==========================================================================
   GAMER'S GRUB — scroll-controller.js
   Master GSAP ScrollTrigger Timeline (8 Coordinated Stages):
     STAGE 1: DARKNESS         (0 -> 4)
     STAGE 2: ROAD REVEAL      (4 -> 18)
     STAGE 3: RUNNING START    (18 -> 26)
     STAGE 4: COIN COLLECTION  (26 -> 38)
     STAGE 5: ADVANCED GAMEPLAY(38 -> 84) — Lane weaves, Jumps, Slides, Coins
     STAGE 6: FINAL RUN        (84 -> 90)
     STAGE 7: DARK TRANSITION  (90 -> 96.5)
     STAGE 8: MAIN WEBSITE     (96.5 -> 100)
   100% deterministic & smoothly reversible when scrolling backwards.
   ========================================================================== */

(function () {
  'use strict';

  function createScrollController(callbacks) {
    const introStage = document.getElementById('intro-stage');
    const blackCurtain = document.getElementById('black-curtain');
    const vignette = document.getElementById('intro-vignette');
    const gameHud = document.getElementById('game-hud');
    const mainSite = document.getElementById('main-site');

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    const anim = {
      curtainOpacity: 1,
      vignetteOpacity: 0,
      hudOpacity: 0,
      outlineReveal: 0,
      roadReveal: 0,
      lightsReveal: 0,
      buildingsReveal: 0,
      coinsVisibility: 0,
      envOpacity: 0,
      runnerZ: 0,
      cameraX: 0,
      cameraY: 1.65,
      cameraPitch: -0.02,
      cameraRoll: 0,
      cameraFov: 64,
      bobIntensity: 0,
      progress: 0,
    };

    function setMainSiteRevealed(revealed) {
      if (!mainSite) return;
      mainSite.classList.toggle('is-revealed', revealed);
      mainSite.setAttribute('aria-hidden', revealed ? 'false' : 'true');
      document.body.classList.toggle('intro-active', !revealed);
    }

    function applyOverlays() {
      if (blackCurtain) {
        blackCurtain.style.opacity = anim.curtainOpacity.toFixed(3);
      }
      if (vignette) {
        vignette.style.opacity = anim.vignetteOpacity.toFixed(3);
      }
      if (gameHud) {
        gameHud.style.opacity = anim.hudOpacity.toFixed(3);
        gameHud.setAttribute('aria-hidden', anim.hudOpacity < 0.05 ? 'true' : 'false');
      }
    }

    if (!introStage || typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      anim.curtainOpacity = 0;
      applyOverlays();
      setMainSiteRevealed(true);
      return { state: anim };
    }

    gsap.registerPlugin(ScrollTrigger);

    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: introStage,
        start: 'top top',
        end: 'bottom bottom',
        scrub: prefersReducedMotion ? 0.35 : 1.45,
        invalidateOnRefresh: true,
        onUpdate(self) {
          anim.progress = self.progress;
          applyOverlays();
          setMainSiteRevealed(self.progress >= 0.96);
          if (callbacks && callbacks.onProgress) {
            callbacks.onProgress(anim);
          }
        },
        onLeave() {
          setMainSiteRevealed(true);
          if (callbacks && callbacks.onLeaveIntro) callbacks.onLeaveIntro();
        },
        onEnterBack() {
          if (callbacks && callbacks.onEnterIntro) callbacks.onEnterIntro();
        },
      },
    });

    if (prefersReducedMotion) {
      // Reduced-motion alternative: gentle darkness -> static road + coins -> fade to black -> main site
      tl.set(anim, { curtainOpacity: 1, envOpacity: 0, hudOpacity: 0 }, 0)
        .to(anim, { curtainOpacity: 0, envOpacity: 1, outlineReveal: 1, roadReveal: 1, lightsReveal: 1, buildingsReveal: 1, coinsVisibility: 1, hudOpacity: 1, duration: 30, ease: 'power1.out' }, 6)
        .to(anim, { runnerZ: -68, duration: 35, ease: 'none' }, 36)
        .to(anim, { curtainOpacity: 1, envOpacity: 0, lightsReveal: 0, hudOpacity: 0, coinsVisibility: 0, duration: 22, ease: 'power1.in' }, 72)
        .to(anim, { curtainOpacity: 1, duration: 6 }, 94);

      applyOverlays();
      return { state: anim, timeline: tl };
    }

    // =========================================================================
    // STAGE 1 — DARKNESS (0 -> 4)
    // Pure #000000 black screen, no UI, no HUD
    // =========================================================================
    tl.set(anim, { curtainOpacity: 1, envOpacity: 0, hudOpacity: 0 }, 0);

    // =========================================================================
    // STAGE 2 — ROAD REVEAL (4 -> 18)
    // Road outline -> 3-lane asphalt -> streetlights -> urban buildings
    // =========================================================================
    tl.to(anim, { curtainOpacity: 0, envOpacity: 0.65, outlineReveal: 1, duration: 6, ease: 'power1.inOut' }, 4)
      .to(anim, { roadReveal: 1, envOpacity: 0.95, duration: 6, ease: 'power1.out' }, 8)
      .to(anim, { lightsReveal: 1, buildingsReveal: 1, envOpacity: 1, outlineReveal: 0.25, vignetteOpacity: 0.45, duration: 7, ease: 'power2.out' }, 11);

    // =========================================================================
    // STAGE 3 — RUNNING START (18 -> 26)
    // Forward movement begins, first-person running bob engages
    // =========================================================================
    tl.to(anim, { runnerZ: -34, duration: 8, ease: 'power1.in' }, 18)
      .to(anim, { bobIntensity: 1, cameraFov: 69, vignetteOpacity: 0.55, duration: 5, ease: 'power2.out' }, 18);

    // =========================================================================
    // STAGE 4 — COIN COLLECTION (26 -> 38)
    // Coins appear & HUD fades in; player collects center lane trail (z=-42..-68)
    // =========================================================================
    tl.to(anim, { coinsVisibility: 1, hudOpacity: 1, duration: 3.5, ease: 'power2.out' }, 24.5)
      .to(anim, { runnerZ: -76, duration: 12, ease: 'none' }, 26);

    // =========================================================================
    // STAGE 5 — ADVANCED GAMEPLAY (38 -> 84)
    // Continuous sprint from z = -76 to z = -302 (4.913m per timeline unit)
    // Synchronized with obstacles.js and coins.js formations:
    //   - Weave Center -> Left (t = 38.8 -> 42.6) around Center block at z=-96
    //   - Jump Left barrier at z=-134 (t = 47.2 -> 52.4) through elevated coins
    //   - Weave Left -> Right (t = 53.0 -> 57.5) around Double block at z=-174
    //   - Slide Right gantry at z=-216 (t = 63.6 -> 69.6) collecting low coins
    //   - Weave Right -> Center (t = 70.2 -> 73.8) around Right block at z=-250
    //   - Final Jump Center barrier at z=-284 (t = 77.8 -> 82.9) through coins
    // =========================================================================
    tl.to(anim, { runnerZ: -302, duration: 46, ease: 'none' }, 38);

    // 5A. Lane Change: CENTER (0) -> LEFT (-3.2) along curved coin trail
    tl.to(anim, { cameraX: -3.2, duration: 3.8, ease: 'power2.inOut' }, 38.8)
      .to(anim, { cameraRoll: 0.11, duration: 1.8, ease: 'power2.out' }, 38.8)
      .to(anim, { cameraRoll: 0, duration: 2.0, ease: 'power2.inOut' }, 40.6);

    // 5B. First-Person JUMP over Left low barrier at z = -134
    tl.to(anim, { bobIntensity: 0, duration: 0.6 }, 46.8)
      .to(anim, { cameraY: 3.48, cameraPitch: 0.08, cameraFov: 73, duration: 2.6, ease: 'power2.out' }, 47.2)
      .to(anim, { cameraY: 1.5, cameraPitch: -0.05, cameraFov: 69, duration: 2.4, ease: 'power2.in' }, 49.8)
      .to(anim, { cameraY: 1.65, cameraPitch: -0.02, bobIntensity: 1, duration: 0.8, ease: 'power1.out' }, 52.2);

    // 5C. Double Lane Change: LEFT (-3.2) -> RIGHT (+3.2) along staggered curve
    tl.to(anim, { cameraX: 3.2, duration: 4.5, ease: 'power2.inOut' }, 53.0)
      .to(anim, { cameraRoll: -0.14, duration: 2.1, ease: 'power2.out' }, 53.0)
      .to(anim, { cameraRoll: 0, duration: 2.4, ease: 'power2.inOut' }, 55.1);

    // 5D. First-Person SLIDE underneath overhead gantry at z = -216
    tl.to(anim, { bobIntensity: 0.12, cameraY: 0.64, cameraPitch: 0.06, cameraRoll: -0.09, cameraFov: 75, duration: 1.1, ease: 'power3.out' }, 63.6)
      .to(anim, { cameraY: 0.64, duration: 3.5 }, 64.7)
      .to(anim, { cameraY: 1.65, cameraPitch: -0.02, cameraRoll: 0, cameraFov: 69, bobIntensity: 1, duration: 1.4, ease: 'power2.inOut' }, 68.2);

    // 5E. Lane Change: RIGHT (+3.2) -> CENTER (0) along curved coin trail
    tl.to(anim, { cameraX: 0, duration: 3.6, ease: 'power2.inOut' }, 70.2)
      .to(anim, { cameraRoll: 0.11, duration: 1.7, ease: 'power2.out' }, 70.2)
      .to(anim, { cameraRoll: 0, duration: 1.9, ease: 'power2.inOut' }, 71.9);

    // 5F. Final Heroic First-Person JUMP over Center low barrier at z = -284
    tl.to(anim, { bobIntensity: 0, duration: 0.6 }, 77.3)
      .to(anim, { cameraY: 3.55, cameraPitch: 0.08, cameraFov: 73, duration: 2.5, ease: 'power2.out' }, 77.8)
      .to(anim, { cameraY: 1.65, cameraPitch: -0.01, cameraFov: 67, duration: 2.6, ease: 'power2.in' }, 80.3);

    // =========================================================================
    // STAGE 6 — FINAL RUN (84 -> 90)
    // Cinematic dimming stretch into deeper night fog
    // =========================================================================
    tl.to(anim, { runnerZ: -324, bobIntensity: 0.55, lightsReveal: 0.45, vignetteOpacity: 0.8, cameraFov: 64, duration: 6, ease: 'power1.out' }, 84);

    // =========================================================================
    // STAGE 7 — DARK TRANSITION (90 -> 96.5)
    // Streetlights fade, buildings & road disappear, HUD fades, running stops -> pure black
    // =========================================================================
    tl.to(anim, { runnerZ: -332, bobIntensity: 0, duration: 5.5, ease: 'power2.out' }, 90)
      .to(anim, { lightsReveal: 0, hudOpacity: 0, coinsVisibility: 0, duration: 4.5, ease: 'power2.in' }, 90)
      .to(anim, { buildingsReveal: 0, roadReveal: 0, outlineReveal: 0, envOpacity: 0, duration: 5.0, ease: 'power2.in' }, 91)
      .to(anim, { curtainOpacity: 1, vignetteOpacity: 0, duration: 4.0, ease: 'power1.inOut' }, 92.5);

    // =========================================================================
    // STAGE 8 — MAIN WEBSITE (96.5 -> 100)
    // Pure black beat before revealing Gamer's Grub homepage
    // =========================================================================
    tl.to(anim, { curtainOpacity: 1, duration: 3.5 }, 96.5);

    applyOverlays();
    return { state: anim, timeline: tl };
  }

  window.GamersGrubScroll = {
    create: createScrollController,
  };
})();
