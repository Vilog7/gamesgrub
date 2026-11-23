/* ==========================================================================
   GAMER'S GRUB — three-scene.js
   Core Three.js Scene, First-Person Camera, Dynamic Lighting, Soft Shadows,
   Atmospheric Fog, Ambient Dust Particles, and Optimized WebGL Renderer.
   ========================================================================== */

(function () {
  'use strict';

  function createThreeScene() {
    const canvas = document.getElementById('three-canvas');
    const fallbackEl = document.getElementById('webgl-fallback');
    if (!canvas || typeof THREE === 'undefined') {
      if (fallbackEl) fallbackEl.hidden = false;
      return null;
    }

    const isLowPower =
      window.innerWidth < 768 ||
      (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: !isLowPower,
        powerPreference: 'high-performance',
        alpha: false,
      });
    } catch (err) {
      if (fallbackEl) fallbackEl.hidden = false;
      return null;
    }

    const maxDpr = isLowPower ? 1.25 : 1.75;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !isLowPower;
    if (!isLowPower) {
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    const fog = new THREE.FogExp2(0x04030a, 0.042);
    scene.fog = fog;

    // First-person perspective camera (human eye level ~1.65m)
    const camera = new THREE.PerspectiveCamera(
      64,
      window.innerWidth / window.innerHeight,
      0.1,
      240
    );
    camera.position.set(0, 1.65, 0);

    // =====================================================================
    // LIGHTING RIG (Ambient + Hemisphere + Shadow-casting Directional + Dynamic Point Lights)
    // =====================================================================
    const ambientLight = new THREE.AmbientLight(0x2a1f4a, 0);
    scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0x9b7bf7, 0x0b0816, 0);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xe9ddff, 0);
    dirLight.position.set(10, 26, 14);
    if (!isLowPower) {
      dirLight.castShadow = true;
      dirLight.shadow.mapSize.set(1024, 1024);
      dirLight.shadow.camera.near = 2;
      dirLight.shadow.camera.far = 110;
      dirLight.shadow.camera.left = -24;
      dirLight.shadow.camera.right = 24;
      dirLight.shadow.camera.top = 24;
      dirLight.shadow.camera.bottom = -24;
      dirLight.shadow.bias = -0.0005;
    }
    scene.add(dirLight);
    scene.add(dirLight.target);

    // Player forward headlamp / road illumination bounce
    const runnerLight = new THREE.PointLight(0xa855f7, 0, 28, 1.6);
    scene.add(runnerLight);

    // Warm gold rim light ahead of the player so metallic coins sparkle realistically
    const coinFillLight = new THREE.PointLight(0xffe4a0, 0, 22, 1.5);
    scene.add(coinFillLight);

    // Pool of dynamic point lights synchronized to nearby streetlights
    const lampLightCount = isLowPower ? 2 : 4;
    const lampLights = [];
    for (let i = 0; i < lampLightCount; i++) {
      const pl = new THREE.PointLight(i % 2 === 0 ? 0xa855f7 : 0xd8b4fe, 0, 26, 1.6);
      scene.add(pl);
      lampLights.push(pl);
    }

    // =====================================================================
    // DISTANT HORIZON GLOW DOME (Subtle urban violet night-sky horizon)
    // =====================================================================
    const horizonGeo = new THREE.PlaneGeometry(180, 56);
    const horizonCanvas = document.createElement('canvas');
    horizonCanvas.width = 256;
    horizonCanvas.height = 128;
    const hCtx = horizonCanvas.getContext('2d');
    const hGrad = hCtx.createRadialGradient(128, 118, 6, 128, 118, 120);
    hGrad.addColorStop(0, 'rgba(139, 92, 246, 0.42)');
    hGrad.addColorStop(0.45, 'rgba(88, 28, 135, 0.16)');
    hGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    hCtx.fillStyle = hGrad;
    hCtx.fillRect(0, 0, 256, 128);
    const horizonTex = new THREE.CanvasTexture(horizonCanvas);
    const horizonMat = new THREE.MeshBasicMaterial({
      map: horizonTex,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      fog: false,
    });
    const horizonPlane = new THREE.Mesh(horizonGeo, horizonMat);
    horizonPlane.position.set(0, 18, -190);
    scene.add(horizonPlane);

    // =====================================================================
    // ATMOSPHERIC DEPTH PARTICLES (Recycled around player)
    // =====================================================================
    const particleCount = isLowPower ? 120 : 260;
    const pPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      pPositions[i * 3] = (Math.random() - 0.5) * 18;
      pPositions[i * 3 + 1] = 0.5 + Math.random() * 7.5;
      pPositions[i * 3 + 2] = -Math.random() * 140;
    }
    const pGeo = new THREE.BufferGeometry();
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
    const pMat = new THREE.PointsMaterial({
      color: 0xc4b5fd,
      size: 0.08,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    const blackColor = new THREE.Color(0x000000);
    const nightColor = new THREE.Color(0x06040f);
    const tmpColor = new THREE.Color();

    function updateAtmosphere(envOpacity, lightsReveal, playerPos) {
      const env = Math.max(0, Math.min(1, envOpacity));
      const lgt = Math.max(0, Math.min(1, lightsReveal));

      tmpColor.copy(blackColor).lerp(nightColor, env);
      scene.background.copy(tmpColor);
      fog.color.copy(tmpColor);
      // Denser fog when entering/leaving darkness, clearer urban depth during gameplay
      fog.density = 0.048 - env * 0.029;

      ambientLight.intensity = 0.48 * lgt * env;
      hemiLight.intensity = 0.85 * lgt * env;
      dirLight.intensity = 1.15 * lgt * env;
      horizonMat.opacity = 0.85 * lgt * env;
      pMat.opacity = 0.4 * lgt * env;

      // Keep shadow frustum & dynamic lights anchored near the player
      const pz = playerPos.z;
      dirLight.position.set(10, 26, pz + 16);
      dirLight.target.position.set(0, 0, pz - 18);
      dirLight.target.updateMatrixWorld();

      runnerLight.position.set(playerPos.x, playerPos.y + 0.5, pz - 6);
      runnerLight.intensity = 2.8 * lgt * env;

      coinFillLight.position.set(playerPos.x, playerPos.y + 1.4, pz - 8);
      coinFillLight.intensity = 2.1 * lgt * env;

      horizonPlane.position.z = pz - 195;

      // Keep atmospheric dust particles recycled around the player
      const posAttr = pGeo.attributes.position;
      for (let i = 0; i < particleCount; i++) {
        let z = posAttr.getZ(i);
        if (z > pz + 6) z -= 140;
        else if (z < pz - 134) z += 140;
        posAttr.setZ(i, z);
      }
      posAttr.needsUpdate = true;
    }

    function updateLampLights(activePositions, lightsReveal, envOpacity) {
      const intensity = 8.0 * lightsReveal * envOpacity;
      for (let i = 0; i < lampLights.length; i++) {
        if (i < activePositions.length) {
          lampLights[i].position.copy(activePositions[i]);
          lampLights[i].intensity = intensity;
        } else {
          lampLights[i].intensity = 0;
        }
      }
    }

    function resize() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxDpr));
      renderer.setSize(w, h, false);
    }

    window.addEventListener('resize', resize, { passive: true });

    function render() {
      renderer.render(scene, camera);
    }

    function dispose() {
      window.removeEventListener('resize', resize);
      renderer.dispose();
    }

    return {
      scene,
      camera,
      renderer,
      isLowPower,
      updateAtmosphere,
      updateLampLights,
      render,
      resize,
      dispose,
    };
  }

  window.GamersGrubScene = {
    create: createThreeScene,
  };
})();
