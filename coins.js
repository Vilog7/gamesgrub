/* ==========================================================================
   GAMER'S GRUB — coins.js
   Real 3D Metallic Gold Collectible Coin System:
   - Detailed 3D metallic gold coin meshes (disc + rim + embossed center emblem)
   - Continuous 3D spinning animation via requestAnimationFrame
   - 5 Formations: Center line, Left line, Right line, Staggered curve, Jump arcs
   - Real distance-based collision detection with player's 3D position
   - Spark burst & pop animation on collection + custom HUD counter events
   - Full forward AND backward scroll synchronization (coins restore on scroll back)
   ========================================================================== */

(function () {
  'use strict';

  const LANE_X = [-3.2, 0, 3.2];
  const COLLECT_RADIUS_XZ = 1.95;
  const COLLECT_RADIUS_Y = 1.75;

  function createCoinSystem(sceneCtx) {
    const { scene, isLowPower } = sceneCtx;

    // Shared high-metallic gold materials
    const goldBodyMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.35,
      metalness: 0.92,
      roughness: 0.16,
    });

    const goldRimMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.45,
      metalness: 0.95,
      roughness: 0.12,
    });

    // Reusable coin geometries
    const discGeo = new THREE.CylinderGeometry(0.46, 0.46, 0.11, isLowPower ? 16 : 24);
    discGeo.rotateX(Math.PI / 2);

    const rimGeo = new THREE.TorusGeometry(0.44, 0.065, 8, isLowPower ? 16 : 24);
    const emblemGeo = new THREE.OctahedronGeometry(0.18, 0);
    emblemGeo.scale(1, 1, 0.35);

    // Subtle soft glow halo sprite behind each coin
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 64;
    glowCanvas.height = 64;
    const gCtx = glowCanvas.getContext('2d');
    const grad = gCtx.createRadialGradient(32, 32, 4, 32, 32, 30);
    grad.addColorStop(0, 'rgba(253, 224, 71, 0.65)');
    grad.addColorStop(0.5, 'rgba(245, 158, 11, 0.22)');
    grad.addColorStop(1, 'rgba(245, 158, 11, 0)');
    gCtx.fillStyle = grad;
    gCtx.fillRect(0, 0, 64, 64);
    const glowTex = new THREE.CanvasTexture(glowCanvas);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    // Spark burst pool for collection visual effect
    const SPARK_POOL_SIZE = isLowPower ? 24 : 48;
    const sparkGeo = new THREE.OctahedronGeometry(0.08, 0);
    const sparkMat = new THREE.MeshBasicMaterial({
      color: 0xfef08a,
      transparent: true,
      opacity: 0.95,
    });
    const sparks = [];
    for (let i = 0; i < SPARK_POOL_SIZE; i++) {
      const m = new THREE.Mesh(sparkGeo, sparkMat);
      m.visible = false;
      scene.add(m);
      sparks.push({
        mesh: m,
        vx: 0,
        vy: 0,
        vz: 0,
        life: 0,
      });
    }
    let nextSparkIdx = 0;

    function spawnCollectionBurst(x, y, z) {
      const count = isLowPower ? 5 : 8;
      for (let i = 0; i < count; i++) {
        const s = sparks[nextSparkIdx];
        nextSparkIdx = (nextSparkIdx + 1) % SPARK_POOL_SIZE;
        const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
        const speed = 2.2 + Math.random() * 2.4;
        s.mesh.position.set(x, y, z);
        s.mesh.scale.setScalar(1);
        s.mesh.visible = true;
        s.vx = Math.cos(angle) * speed;
        s.vy = 1.5 + Math.random() * 2.5;
        s.vz = Math.sin(angle) * speed;
        s.life = 0.42;
      }
    }

    // Build coin trail definitions matching the scroll-controlled player trajectory:
    // 1. Center straight line (Stage 4 introduction: z = -42 to -72)
    // 2. Curved staggered transition Center -> Left (z = -84 to -98)
    // 3. Left lane straight line (z = -104 to -120)
    // 4. Elevated Jump Arc over low barrier at z = -134 (Left lane)
    // 5. Curved staggered transition Left -> Right (z = -152 to -168)
    // 6. Right lane straight line leading into slide (z = -176 to -200)
    // 7. Low slide coin trail underneath overhead gantry at z = -216 (Right lane, y = 0.72)
    // 8. Curved staggered transition Right -> Center (z = -236 to -252)
    // 9. Final Center lane + Heroic Elevated Jump Arc over barrier at z = -284
    const coinDefs = [];

    // 1. Center straight line (6 coins)
    for (let i = 0; i < 6; i++) {
      coinDefs.push({ x: LANE_X[1], y: 1.35, z: -42 - i * 5.2 });
    }

    // 2. Staggered curve Center -> Left (4 coins)
    [
      { x: -0.6, y: 1.35, z: -84 },
      { x: -1.6, y: 1.35, z: -89 },
      { x: -2.6, y: 1.35, z: -94 },
      { x: LANE_X[0], y: 1.35, z: -99 },
    ].forEach((c) => coinDefs.push(c));

    // 3. Left lane straight line (3 coins)
    for (let i = 0; i < 3; i++) {
      coinDefs.push({ x: LANE_X[0], y: 1.35, z: -106 - i * 5.2 });
    }

    // 4. Elevated Jump Arc over Left low barrier at z = -134 (5 coins in parabolic arc)
    [
      { z: -124, y: 1.9 },
      { z: -129, y: 2.85 },
      { z: -134, y: 3.35 },
      { z: -139, y: 2.85 },
      { z: -144, y: 1.9 },
    ].forEach((p) => coinDefs.push({ x: LANE_X[0], y: p.y, z: p.z }));

    // 5. Staggered curve Left -> Right (5 coins)
    [
      { x: -1.8, y: 1.35, z: -154 },
      { x: -0.3, y: 1.35, z: -158.5 },
      { x: 1.2, y: 1.35, z: -163 },
      { x: 2.5, y: 1.35, z: -167.5 },
      { x: LANE_X[2], y: 1.35, z: -172 },
    ].forEach((c) => coinDefs.push(c));

    // 6. Right lane straight line (4 coins)
    for (let i = 0; i < 4; i++) {
      coinDefs.push({ x: LANE_X[2], y: 1.35, z: -179 - i * 5.2 });
    }

    // 7. Low Slide coin line under overhead gantry at z = -216 (4 coins at crouch height)
    for (let i = 0; i < 4; i++) {
      coinDefs.push({ x: LANE_X[2], y: 0.72, z: -207 - i * 5.5 });
    }

    // 8. Staggered curve Right -> Center (4 coins)
    [
      { x: 2.4, y: 1.35, z: -237 },
      { x: 1.4, y: 1.35, z: -242 },
      { x: 0.5, y: 1.35, z: -247 },
      { x: LANE_X[1], y: 1.35, z: -252 },
    ].forEach((c) => coinDefs.push(c));

    // 9. Final Center sprint + Elevated Heroic Jump Arc over barrier at z = -284 (7 coins)
    coinDefs.push({ x: LANE_X[1], y: 1.35, z: -260 });
    coinDefs.push({ x: LANE_X[1], y: 1.35, z: -266 });
    [
      { z: -274, y: 1.95 },
      { z: -279, y: 2.95 },
      { z: -284, y: 3.45 },
      { z: -289, y: 2.95 },
      { z: -294, y: 1.95 },
    ].forEach((p) => coinDefs.push({ x: LANE_X[1], y: p.y, z: p.z }));

    // Instantiate 3D coin objects
    const coinsGroup = new THREE.Group();
    scene.add(coinsGroup);

    const coins = coinDefs.map((def, idx) => {
      const grp = new THREE.Group();
      grp.position.set(def.x, def.y, def.z);

      const disc = new THREE.Mesh(discGeo, goldBodyMat);
      grp.add(disc);

      const rim = new THREE.Mesh(rimGeo, goldRimMat);
      grp.add(rim);

      const emblem = new THREE.Mesh(emblemGeo, goldRimMat);
      grp.add(emblem);

      const glow = new THREE.Sprite(glowMat);
      glow.scale.set(1.55, 1.55, 1);
      grp.add(glow);

      coinsGroup.add(grp);

      return {
        id: idx,
        mesh: grp,
        baseX: def.x,
        baseY: def.y,
        baseZ: def.z,
        phase: idx * 0.45,
        collected: false,
        popProgress: 0, // 0..1 brief scale/rise animation on collect
      };
    });

    let collectedCount = 0;

    function notifyHud(delta) {
      window.dispatchEvent(
        new CustomEvent('gamersgrub:coins-updated', {
          detail: { count: collectedCount, total: coins.length, delta },
        })
      );
    }

    function update(dt, elapsed, playerPos, visibilityFactor) {
      const vis = Math.max(0, Math.min(1, visibilityFactor));
      coinsGroup.visible = vis > 0.01;
      goldBodyMat.emissiveIntensity = 0.38 * vis;
      goldRimMat.emissiveIntensity = 0.5 * vis;
      glowMat.opacity = 0.52 * vis;

      let countChanged = 0;

      for (let i = 0; i < coins.length; i++) {
        const c = coins[i];

        // If player scrolled BACKWARDS well behind a previously collected coin, restore it cleanly!
        if (c.collected && playerPos.z > c.baseZ + 2.8) {
          c.collected = false;
          c.popProgress = 0;
          c.mesh.visible = true;
          c.mesh.scale.setScalar(1);
          c.mesh.position.set(c.baseX, c.baseY, c.baseZ);
          collectedCount = Math.max(0, collectedCount - 1);
          countChanged = -1;
        }

        // Active uncollected coin: rotate smoothly in 3D + subtle hover bob + collision check
        if (!c.collected) {
          c.mesh.visible = vis > 0.01;
          c.mesh.rotation.y = elapsed * 3.1 + c.phase;
          c.mesh.position.y = c.baseY + Math.sin(elapsed * 3.4 + c.phase) * 0.1;

          // Real distance-based 3D collision detection with player's position
          if (vis > 0.25) {
            const dx = Math.abs(playerPos.x - c.baseX);
            const dz = Math.abs(playerPos.z - c.baseZ);
            const dy = Math.abs(playerPos.y - c.baseY);

            if (dx <= COLLECT_RADIUS_XZ && dz <= COLLECT_RADIUS_XZ && dy <= COLLECT_RADIUS_Y) {
              c.collected = true;
              c.popProgress = 0.001;
              collectedCount++;
              countChanged = 1;
              spawnCollectionBurst(c.baseX, c.baseY, c.baseZ);
            }
          }
        } else if (c.popProgress > 0 && c.popProgress < 1) {
          // Brief collection pop & spin-out animation
          c.popProgress = Math.min(1, c.popProgress + dt * 5.2);
          const s = 1 + c.popProgress * 0.7;
          c.mesh.scale.setScalar(s * (1 - c.popProgress * 0.85));
          c.mesh.position.y = c.baseY + c.popProgress * 1.1;
          c.mesh.rotation.y += dt * 16;
          if (c.popProgress >= 1) {
            c.mesh.visible = false;
          }
        }
      }

      if (countChanged !== 0) {
        notifyHud(countChanged);
      }

      // Animate gold spark particles
      for (let i = 0; i < sparks.length; i++) {
        const s = sparks[i];
        if (s.life > 0) {
          s.life -= dt;
          if (s.life <= 0) {
            s.mesh.visible = false;
          } else {
            s.mesh.position.x += s.vx * dt;
            s.mesh.position.y += s.vy * dt;
            s.mesh.position.z += s.vz * dt;
            s.vy -= 7.5 * dt;
            s.mesh.scale.setScalar(s.life / 0.42);
            s.mesh.rotation.x += dt * 10;
            s.mesh.rotation.y += dt * 8;
          }
        }
      }
    }

    function resetAll() {
      for (let i = 0; i < coins.length; i++) {
        const c = coins[i];
        c.collected = false;
        c.popProgress = 0;
        c.mesh.visible = true;
        c.mesh.scale.setScalar(1);
        c.mesh.position.set(c.baseX, c.baseY, c.baseZ);
      }
      collectedCount = 0;
      notifyHud(0);
    }

    return {
      update,
      resetAll,
      getCount: () => collectedCount,
      getTotal: () => coins.length,
    };
  }

  window.GamersGrubCoins = {
    create: createCoinSystem,
  };
})();
