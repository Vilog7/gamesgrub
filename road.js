/* ==========================================================================
   GAMER'S GRUB — road.js
   Endless 3D Three-Lane Urban Road System with Smooth Segment Recycling,
   Realistic Asphalt & White/Yellow Lane Markings, Pavements, Side Barriers,
   Streetlights, Overhead Gantries, and Urban Buildings on Both Sides.
   ========================================================================== */

(function () {
  'use strict';

  const SEGMENT_LENGTH = 40;
  const SEGMENT_COUNT = 8; // 320m continuous horizon recycled seamlessly

  function createRoadTexture(maxAnisotropy) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Realistic dark urban asphalt base
    ctx.fillStyle = '#121119';
    ctx.fillRect(0, 0, 512, 512);

    // Fine asphalt aggregate grain
    for (let i = 0; i < 11000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const shade = 16 + Math.floor(Math.random() * 24);
      ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade + 6})`;
      ctx.fillRect(x, y, 2, 2);
    }

    // Subtle worn rubber tire tracks in each of the 3 lanes
    [92, 256, 420].forEach((cx) => {
      const grad = ctx.createLinearGradient(cx - 42, 0, cx + 42, 0);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(0.5, 'rgba(6, 5, 10, 0.35)');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.fillRect(cx - 42, 0, 84, 512);
    });

    // Crisp outer yellow road shoulder lines
    ctx.fillStyle = '#e5b82e';
    ctx.fillRect(18, 0, 7, 512);
    ctx.fillRect(487, 0, 7, 512);

    // Crisp white dashed 3-lane divider markings (LEFT | CENTER | RIGHT)
    ctx.fillStyle = '#f4f2ff';
    [172, 340].forEach((dx) => {
      for (let y = 16; y < 512; y += 128) {
        ctx.fillRect(dx - 4, y, 8, 72);
      }
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 3);
    tex.anisotropy = Math.min(8, maxAnisotropy || 4);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function createBuildingFacadeTexture(accentColor) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0c0a14';
    ctx.fillRect(0, 0, 256, 512);

    // Architectural pilasters
    ctx.fillStyle = '#151224';
    for (let x = 0; x < 256; x += 32) {
      ctx.fillRect(x, 0, 5, 512);
    }

    // Window grid
    const cols = 6;
    const rows = 14;
    const px = 11;
    const py = 12;
    const w = (256 - px * (cols + 1)) / cols;
    const h = (512 - py * (rows + 1)) / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const rnd = Math.random();
        if (rnd > 0.68) {
          ctx.fillStyle = rnd > 0.9 ? accentColor : 'rgba(216, 206, 255, 0.25)';
        } else {
          ctx.fillStyle = '#100e1b';
        }
        ctx.fillRect(px + c * (w + px), py + r * (h + py), w, h);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function createSignTexture(title, subtitle, accentHex) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 160;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#080612';
    ctx.fillRect(0, 0, 512, 160);

    ctx.strokeStyle = accentHex;
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 144);

    ctx.fillStyle = accentHex;
    ctx.fillRect(22, 22, 10, 116);

    ctx.font = 'italic 800 46px "Chakra Petch", sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.fillText(title, 48, 66);

    ctx.font = '600 20px "Inter", sans-serif';
    ctx.fillStyle = accentHex;
    ctx.fillText(subtitle, 50, 118);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  function createRoadSystem(sceneCtx) {
    const { scene, renderer, isLowPower } = sceneCtx;
    const maxAniso = renderer.capabilities.getMaxAnisotropy();

    // Shared Materials (reused across all recycled segments for high FPS)
    const roadTex = createRoadTexture(maxAniso);
    const roadMat = new THREE.MeshStandardMaterial({
      map: roadTex,
      roughness: 0.55,
      metalness: 0.18,
      transparent: true,
      opacity: 0,
    });

    const outlineMat = new THREE.LineBasicMaterial({
      color: 0xa78bfa,
      transparent: true,
      opacity: 0,
    });

    const pavementMat = new THREE.MeshStandardMaterial({
      color: 0x161322,
      roughness: 0.82,
      metalness: 0.1,
      transparent: true,
      opacity: 0,
    });

    const curbGlowMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0,
      roughness: 0.3,
    });

    const guardrailMat = new THREE.MeshStandardMaterial({
      color: 0x262138,
      metalness: 0.65,
      roughness: 0.4,
    });

    const poleMat = new THREE.MeshStandardMaterial({
      color: 0x1f1b30,
      metalness: 0.72,
      roughness: 0.35,
    });

    const buildingMatA = new THREE.MeshStandardMaterial({
      map: createBuildingFacadeTexture('rgba(168, 85, 247, 0.5)'),
      roughness: 0.72,
      metalness: 0.22,
      transparent: true,
      opacity: 0,
    });

    const buildingMatB = new THREE.MeshStandardMaterial({
      map: createBuildingFacadeTexture('rgba(124, 58, 237, 0.45)'),
      roughness: 0.76,
      metalness: 0.2,
      transparent: true,
      opacity: 0,
    });

    const signData = [
      ["GAMER'S GRUB", 'PLAY · CONNECT · ENJOY', '#a855f7'],
      ['PRO PC ARENA', '240HZ RTX STATIONS', '#c084fc'],
      ['SQUAD NIGHTS', '5V5 LAN TOURNAMENTS', '#818cf8'],
      ['CONSOLE LOUNGE', '4K COUCH CO-OP', '#a855f7'],
    ];
    const signMaterials = signData.map(([t, s, c]) => {
      const tex = createSignTexture(t, s, c);
      return new THREE.MeshStandardMaterial({
        map: tex,
        emissiveMap: tex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0,
        roughness: 0.35,
      });
    });

    // Shared Geometries
    const roadGeo = new THREE.PlaneGeometry(11.6, SEGMENT_LENGTH);
    const pavementGeo = new THREE.BoxGeometry(3.6, 0.34, SEGMENT_LENGTH);
    const curbGeo = new THREE.BoxGeometry(0.14, 0.08, SEGMENT_LENGTH);
    const railPostGeo = new THREE.BoxGeometry(0.14, 0.85, 0.14);
    const railBarGeo = new THREE.BoxGeometry(0.12, 0.16, SEGMENT_LENGTH);
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 6.8, 8);
    const armGeo = new THREE.BoxGeometry(2.0, 0.1, 0.12);
    const lampGeo = new THREE.BoxGeometry(0.75, 0.12, 0.28);
    const gantryPillarGeo = new THREE.BoxGeometry(0.65, 9.2, 0.75);
    const gantryBeamGeo = new THREE.BoxGeometry(16.4, 0.85, 0.95);

    // Outline lines per segment (for Stage 2 faint outline reveal)
    const outlinePts = [
      new THREE.Vector3(-5.6, 0.03, SEGMENT_LENGTH / 2),
      new THREE.Vector3(-5.6, 0.03, -SEGMENT_LENGTH / 2),
      new THREE.Vector3(5.6, 0.03, SEGMENT_LENGTH / 2),
      new THREE.Vector3(5.6, 0.03, -SEGMENT_LENGTH / 2),
    ];
    [-1.7, 1.7].forEach((lx) => {
      for (let z = SEGMENT_LENGTH / 2; z > -SEGMENT_LENGTH / 2; z -= 8) {
        outlinePts.push(
          new THREE.Vector3(lx, 0.03, z),
          new THREE.Vector3(lx, 0.03, z - 4.2)
        );
      }
    });
    const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePts);

    const segments = [];
    const allLampBulbs = [];

    function buildSegment(index) {
      const group = new THREE.Group();

      // Road surface
      const roadMesh = new THREE.Mesh(roadGeo, roadMat);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.receiveShadow = !isLowPower;
      group.add(roadMesh);

      // Luminous road outline (emerges first in Stage 2)
      const outline = new THREE.LineSegments(outlineGeo, outlineMat);
      group.add(outline);

      // Left & right pavements, curbs, and roadside guardrails
      [-1, 1].forEach((side) => {
        const pav = new THREE.Mesh(pavementGeo, pavementMat);
        pav.position.set(side * 7.6, 0.17, 0);
        pav.receiveShadow = !isLowPower;
        group.add(pav);

        const curb = new THREE.Mesh(curbGeo, curbGlowMat);
        curb.position.set(side * 5.82, 0.36, 0);
        group.add(curb);

        // Roadside steel barrier rail
        const rail = new THREE.Mesh(railBarGeo, guardrailMat);
        rail.position.set(side * 6.05, 0.72, 0);
        group.add(rail);

        for (let rz = -16; rz <= 16; rz += 8) {
          const post = new THREE.Mesh(railPostGeo, guardrailMat);
          post.position.set(side * 6.05, 0.42, rz);
          group.add(post);
        }

        // Two pairs of streetlights per 40m segment
        [-10, 10].forEach((lz) => {
          const lampGroup = new THREE.Group();
          lampGroup.position.set(side * 6.3, 0, lz);

          const pole = new THREE.Mesh(poleGeo, poleMat);
          pole.position.y = 3.4;
          lampGroup.add(pole);

          const arm = new THREE.Mesh(armGeo, poleMat);
          arm.position.set(-side * 0.95, 6.7, 0);
          lampGroup.add(arm);

          const bulbMat = new THREE.MeshStandardMaterial({
            color: 0xf5f3ff,
            emissive: side < 0 ? 0xa855f7 : 0xd8b4fe,
            emissiveIntensity: 0,
            roughness: 0.2,
          });
          const bulb = new THREE.Mesh(lampGeo, bulbMat);
          bulb.position.set(-side * 1.7, 6.62, 0);
          lampGroup.add(bulb);

          group.add(lampGroup);
          allLampBulbs.push({
            mat: bulbMat,
            localOffset: new THREE.Vector3(side * 6.3 - side * 1.7, 6.2, lz),
            parentGroup: group,
          });
        });

        // Urban buildings on both sides (2 distinct silhouettes per segment)
        [-10, 10].forEach((bz, bi) => {
          const seed = index * 13 + bi * 7 + (side > 0 ? 3 : 0);
          const bw = 7.5 + (seed % 4);
          const bd = 17 + (seed % 3);
          const bh = 16 + ((seed * 5) % 20);
          const bMesh = new THREE.Mesh(
            new THREE.BoxGeometry(bw, bh, bd),
            (seed % 2 === 0) ? buildingMatA : buildingMatB
          );
          bMesh.position.set(side * (9.5 + bw / 2), bh / 2, bz);
          group.add(bMesh);
        });
      });

      // Overhead steel gantry + neon roadside signboard on alternating segments
      if (index % 2 === 0) {
        const leftP = new THREE.Mesh(gantryPillarGeo, poleMat);
        leftP.position.set(-7.8, 4.6, 0);
        group.add(leftP);

        const rightP = new THREE.Mesh(gantryPillarGeo, poleMat);
        rightP.position.set(7.8, 4.6, 0);
        group.add(rightP);

        const beam = new THREE.Mesh(gantryBeamGeo, poleMat);
        beam.position.set(0, 8.85, 0);
        group.add(beam);

        const signMat = signMaterials[(index / 2) % signMaterials.length];
        const sign = new THREE.Mesh(new THREE.BoxGeometry(6.8, 2.0, 0.28), signMat);
        sign.position.set(0, 8.85, 0.55);
        group.add(sign);
      }

      group.position.z = -index * SEGMENT_LENGTH;
      scene.add(group);
      return group;
    }

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      segments.push(buildSegment(i));
    }

    const activeLampPositions = [];

    function update(playerZ, state) {
      const env = Math.max(0, Math.min(1, state.envOpacity));
      const outlineRev = Math.max(0, Math.min(1, state.outlineReveal));
      const roadRev = Math.max(0, Math.min(1, state.roadReveal));
      const lightsRev = Math.max(0, Math.min(1, state.lightsReveal));
      const buildingsRev = Math.max(0, Math.min(1, state.buildingsReveal));

      // Endless segment recycling — works smoothly BOTH scrolling forward AND backward!
      const baseIndex = Math.floor(-playerZ / SEGMENT_LENGTH);
      for (let i = 0; i < SEGMENT_COUNT; i++) {
        // Place segments from 1 behind player to (SEGMENT_COUNT - 2) ahead
        const segIndex = baseIndex - 1 + i;
        segments[i].position.z = -segIndex * SEGMENT_LENGTH;
      }

      // Update shared materials
      outlineMat.opacity = outlineRev * env;
      roadMat.opacity = roadRev * env;
      pavementMat.opacity = roadRev * env;
      buildingMatA.opacity = buildingsRev * env;
      buildingMatB.opacity = buildingsRev * env;
      curbGlowMat.emissiveIntensity = 1.35 * roadRev * env;

      for (let i = 0; i < signMaterials.length; i++) {
        signMaterials[i].emissiveIntensity = 1.15 * lightsRev * env;
      }

      // Progressive streetlight illumination wave + collect nearest lamp positions for dynamic point lights
      activeLampPositions.length = 0;
      const waveReach = lightsRev * 260;

      for (let i = 0; i < allLampBulbs.length; i++) {
        const b = allLampBulbs[i];
        const worldZ = b.parentGroup.position.z + b.localOffset.z;
        const distAhead = playerZ - worldZ;
        const localOn =
          distAhead < -25
            ? 0
            : Math.max(0, Math.min(1, (waveReach - Math.max(0, distAhead) + 28) / 36));
        b.mat.emissiveIntensity = localOn * 2.5 * env;

        if (distAhead > -6 && distAhead < 85 && activeLampPositions.length < 4) {
          activeLampPositions.push(
            new THREE.Vector3(b.localOffset.x, b.localOffset.y, worldZ)
          );
        }
      }

      sceneCtx.updateLampLights(activeLampPositions, lightsRev, env);
    }

    return {
      update,
      SEGMENT_LENGTH,
    };
  }

  window.GamersGrubRoad = {
    create: createRoadSystem,
  };
})();
