/* ==========================================================================
   GAMER'S GRUB — obstacles.js
   Real 3D Gameplay Obstacles:
   - Road Barriers (low jumpable striped barriers)
   - Traffic Cones (orange/white reflective roadside & lane cones)
   - Tall Road Blocks (lane-change required concrete/neon barricades)
   - Overhead Slide Gantries (duck/slide underneath required)
   Includes reusable geometries/materials & clearance/collision tracking.
   ========================================================================== */

(function () {
  'use strict';

  const LANE_X = [-3.2, 0, 3.2];

  function createHazardTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#151024';
    ctx.fillRect(0, 0, 256, 64);

    ctx.fillStyle = '#a855f7';
    for (let x = -64; x < 320; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 64);
      ctx.lineTo(x + 20, 64);
      ctx.lineTo(x + 40, 0);
      ctx.lineTo(x + 20, 0);
      ctx.closePath();
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function createObstacleSystem(sceneCtx) {
    const { scene, isLowPower } = sceneCtx;

    const obstaclesGroup = new THREE.Group();
    scene.add(obstaclesGroup);

    // Shared materials
    const darkMetalMat = new THREE.MeshStandardMaterial({
      color: 0x1d1830,
      roughness: 0.48,
      metalness: 0.55,
    });

    const concreteMat = new THREE.MeshStandardMaterial({
      color: 0x262236,
      roughness: 0.85,
      metalness: 0.1,
    });

    const hazardTex = createHazardTexture();
    const hazardMat = new THREE.MeshStandardMaterial({
      map: hazardTex,
      emissiveMap: hazardTex,
      emissive: new THREE.Color(0xa855f7),
      emissiveIntensity: 0,
      roughness: 0.3,
    });

    const coneOrangeMat = new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0xea580c,
      emissiveIntensity: 0,
      roughness: 0.45,
    });

    const coneWhiteMat = new THREE.MeshStandardMaterial({
      color: 0xf8fafc,
      emissive: 0xe2e8f0,
      emissiveIntensity: 0,
      roughness: 0.35,
    });

    // Shared geometries
    const coneBaseGeo = new THREE.BoxGeometry(0.46, 0.08, 0.46);
    const coneBodyGeo = new THREE.ConeGeometry(0.2, 0.72, 12);
    const coneBandGeo = new THREE.CylinderGeometry(0.11, 0.15, 0.14, 12);

    const activeObstacles = [];

    function addTrafficCone(x, z) {
      const g = new THREE.Group();
      g.position.set(x, 0, z);

      const base = new THREE.Mesh(coneBaseGeo, darkMetalMat);
      base.position.y = 0.04;
      g.add(base);

      const body = new THREE.Mesh(coneBodyGeo, coneOrangeMat);
      body.position.y = 0.42;
      body.castShadow = !isLowPower;
      g.add(body);

      const band = new THREE.Mesh(coneBandGeo, coneWhiteMat);
      band.position.y = 0.46;
      g.add(band);

      obstaclesGroup.add(g);
    }

    function addLowBarrier(laneIdx, z) {
      const g = new THREE.Group();
      g.position.set(LANE_X[laneIdx], 0, z);

      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.56, 0.36), hazardMat);
      plank.position.y = 0.72;
      plank.castShadow = !isLowPower;
      g.add(plank);

      [-1.12, 1.12].forEach((lx) => {
        const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 1.0, 0.44), darkMetalMat);
        leg.position.set(lx, 0.5, 0);
        g.add(leg);
      });

      obstaclesGroup.add(g);
      activeObstacles.push({ type: 'jump', laneIdx, x: LANE_X[laneIdx], z });
    }

    function addRoadBlock(laneIdx, z) {
      const g = new THREE.Group();
      g.position.set(LANE_X[laneIdx], 0, z);

      const body = new THREE.Mesh(new THREE.BoxGeometry(2.8, 2.55, 1.45), concreteMat);
      body.position.y = 1.275;
      body.castShadow = !isLowPower;
      g.add(body);

      const stripe = new THREE.Mesh(new THREE.BoxGeometry(2.84, 0.44, 1.5), hazardMat);
      stripe.position.y = 1.95;
      g.add(stripe);

      obstaclesGroup.add(g);
      activeObstacles.push({ type: 'block', laneIdx, x: LANE_X[laneIdx], z });
    }

    function addSlideBarrier(laneIdx, z) {
      const g = new THREE.Group();
      g.position.set(LANE_X[laneIdx], 0, z);

      [-1.36, 1.36].forEach((lx) => {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 3.2, 0.36), darkMetalMat);
        post.position.set(lx, 1.6, 0);
        g.add(post);
      });

      // Overhead crossbar with open crouch clearance below y = 1.35m
      const beam = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.1, 0.46), hazardMat);
      beam.position.y = 2.05;
      beam.castShadow = !isLowPower;
      g.add(beam);

      obstaclesGroup.add(g);
      activeObstacles.push({ type: 'slide', laneIdx, x: LANE_X[laneIdx], z });
    }

    // Strategic obstacle layout synchronized with scroll-controller.js & coins.js:
    // Center road block at z = -96 -> Player weaves Center to Left along curved coin trail
    addRoadBlock(1, -96);
    addTrafficCone(LANE_X[2] - 0.8, -94);
    addTrafficCone(LANE_X[2] + 0.8, -97);

    // Left lane low barrier at z = -134 -> Player JUMPS over it through elevated coin arc
    addLowBarrier(0, -134);
    addTrafficCone(LANE_X[1] - 0.7, -133);

    // Double road block (Left + Center) at z = -174 -> Player weaves Left to Right along curved coins
    addRoadBlock(0, -174);
    addRoadBlock(1, -174);

    // Right lane overhead slide barrier at z = -216 -> Player SLIDES underneath collecting low coins
    addSlideBarrier(2, -216);
    addTrafficCone(LANE_X[1] + 0.9, -215);

    // Right lane road block at z = -250 -> Player weaves Right to Center along curved coins
    addRoadBlock(2, -250);
    addTrafficCone(LANE_X[0] - 0.6, -248);
    addTrafficCone(LANE_X[0] + 0.6, -251);

    // Final Center low barrier at z = -284 -> Heroic final JUMP through coin arc
    addLowBarrier(1, -284);
    addTrafficCone(LANE_X[0], -282);
    addTrafficCone(LANE_X[2], -282);

    function update(lightsReveal, envOpacity) {
      const factor = Math.max(0, Math.min(1, lightsReveal * envOpacity));
      obstaclesGroup.visible = envOpacity > 0.02;
      hazardMat.emissiveIntensity = 1.1 * factor;
      coneOrangeMat.emissiveIntensity = 0.25 * factor;
      coneWhiteMat.emissiveIntensity = 0.35 * factor;
    }

    return {
      update,
      getObstacles: () => activeObstacles,
    };
  }

  window.GamersGrubObstacles = {
    create: createObstacleSystem,
  };
})();
