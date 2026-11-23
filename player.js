/* ==========================================================================
   GAMER'S GRUB — player.js
   Articulated 3D Runner Character + Ultra-Smooth Chase Camera Controller:
   - Original dark-techwear & violet-neon Gamer's Grub runner character
   - Procedural running stride, lane-banking lean, athletic jump tuck & low slide
   - Frame-rate-independent exponential smoothing (butter-smooth wheel scrolling)
   - Three Lanes: LEFT (-3.2) | CENTER (0) | RIGHT (+3.2)
   - Trailing over-the-shoulder chase camera looking down the 3-lane corridor
   ========================================================================== */

(function () {
  'use strict';

  const LANE_POSITIONS = [-3.2, 0, 3.2]; // LEFT, CENTER, RIGHT
  const BASE_EYE_HEIGHT = 1.65;

  function buildRunnerCharacter(isLowPower) {
    const root = new THREE.Group();

    // Original Gamer's Grub cyber-streetwear materials
    const hoodieMat = new THREE.MeshStandardMaterial({
      color: 0x161224,
      roughness: 0.65,
      metalness: 0.15,
    });
    const jacketAccentMat = new THREE.MeshStandardMaterial({
      color: 0x7c3aed,
      emissive: 0x8b5cf6,
      emissiveIntensity: 0.9,
      roughness: 0.3,
      metalness: 0.3,
    });
    const pantsMat = new THREE.MeshStandardMaterial({
      color: 0x0e0c18,
      roughness: 0.78,
      metalness: 0.1,
    });
    const sneakerMat = new THREE.MeshStandardMaterial({
      color: 0xf4f2ff,
      roughness: 0.45,
      metalness: 0.1,
    });
    const soleGlowMat = new THREE.MeshStandardMaterial({
      color: 0xa855f7,
      emissive: 0x9333ea,
      emissiveIntensity: 1.1,
      roughness: 0.25,
    });
    const skinMat = new THREE.MeshStandardMaterial({
      color: 0x2a2438,
      roughness: 0.5,
      metalness: 0.2,
    });

    // Body pivot at hips (y = 0.96) so jumping/sliding tilts naturally
    const bodyPivot = new THREE.Group();
    bodyPivot.position.y = 0.96;
    root.add(bodyPivot);

    // Torso (techwear hoodie)
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.68, 0.32), hoodieMat);
    torso.position.y = 0.34;
    torso.castShadow = !isLowPower;
    bodyPivot.add(torso);

    // Glowing violet neon chevron / spine strip on back of hoodie
    const backStrip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.46, 0.04), jacketAccentMat);
    backStrip.position.set(0, 0.36, 0.17);
    bodyPivot.add(backStrip);

    // Shoulder pads / hoodie trim
    const shoulderTrim = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.09, 0.34), jacketAccentMat);
    shoulderTrim.position.set(0, 0.64, 0);
    bodyPivot.add(shoulderTrim);

    // Head + Hoodie Cowl + Glowing Gaming Headphones
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.84, 0);
    bodyPivot.add(headGroup);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.34, 0.32), skinMat);
    head.castShadow = !isLowPower;
    headGroup.add(head);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.38, 0.36), hoodieMat);
    hood.position.set(0, 0.02, 0.03);
    headGroup.add(hood);

    // Gaming headphones band & glowing earcups
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.21, 0.028, 6, 16, Math.PI), jacketAccentMat);
    band.position.y = 0.03;
    headGroup.add(band);

    [-0.2, 0.2].forEach((ex) => {
      const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.06, 10), jacketAccentMat);
      cup.rotation.z = Math.PI / 2;
      cup.position.set(ex, 0.01, 0);
      headGroup.add(cup);
    });

    // Helper for articulated limbs
    function createArm(side) {
      const shoulder = new THREE.Group();
      shoulder.position.set(side * 0.36, 0.6, 0);

      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.36, 0.16), hoodieMat);
      upper.position.y = -0.16;
      upper.castShadow = !isLowPower;
      shoulder.add(upper);

      const elbow = new THREE.Group();
      elbow.position.y = -0.34;
      shoulder.add(elbow);

      const forearm = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.32, 0.14), hoodieMat);
      forearm.position.y = -0.14;
      elbow.add(forearm);

      const cuff = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.15), jacketAccentMat);
      cuff.position.y = -0.28;
      elbow.add(cuff);

      bodyPivot.add(shoulder);
      return { shoulder, elbow };
    }

    function createLeg(side) {
      const hip = new THREE.Group();
      hip.position.set(side * 0.16, 0.02, 0);

      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.44, 0.22), pantsMat);
      thigh.position.y = -0.22;
      thigh.castShadow = !isLowPower;
      hip.add(thigh);

      const knee = new THREE.Group();
      knee.position.y = -0.44;
      hip.add(knee);

      const calf = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.42, 0.18), pantsMat);
      calf.position.y = -0.21;
      calf.castShadow = !isLowPower;
      knee.add(calf);

      const shoe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.34), sneakerMat);
      shoe.position.set(0, -0.44, -0.05);
      knee.add(shoe);

      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.04, 0.35), soleGlowMat);
      sole.position.set(0, -0.5, -0.05);
      knee.add(sole);

      bodyPivot.add(hip);
      return { hip, knee };
    }

    const leftArm = createArm(-1);
    const rightArm = createArm(1);
    const leftLeg = createLeg(-1);
    const rightLeg = createLeg(1);

    // Subtle ground contact shadow disc directly beneath the runner
    const shadowGeo = new THREE.CircleGeometry(0.62, 18);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });
    const contactShadow = new THREE.Mesh(shadowGeo, shadowMat);
    contactShadow.position.y = 0.025;
    root.add(contactShadow);

    return {
      root,
      bodyPivot,
      headGroup,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      contactShadow,
      accentMats: [jacketAccentMat, soleGlowMat],
    };
  }

  function createPlayerController(camera, scene, isLowPower) {
    const character = buildRunnerCharacter(isLowPower);
    if (scene) {
      scene.add(character.root);
    }

    // Smoothly damped runtime state (eliminates discrete mouse-wheel stepping!)
    const smooth = {
      x: 0,
      y: BASE_EYE_HEIGHT,
      z: 0,
      pitch: -0.02,
      roll: 0,
      fov: 64,
      bobIntensity: 0,
      initialized: false,
    };

    const runnerColliderPos = new THREE.Vector3(0, 1.2, 0);
    const lookTarget = new THREE.Vector3(0, 1.5, -18);

    function update(dt, target) {
      // Frame-rate-independent exponential smoothing for silky-smooth motion
      const alpha = smooth.initialized ? 1 - Math.exp(-9.5 * dt) : 1;
      smooth.initialized = true;

      smooth.x += (target.cameraX - smooth.x) * alpha;
      smooth.y += (target.cameraY - smooth.y) * alpha;
      smooth.z += (target.runnerZ - smooth.z) * alpha;
      smooth.pitch += (target.cameraPitch - smooth.pitch) * alpha;
      smooth.roll += (target.cameraRoll - smooth.roll) * alpha;
      smooth.fov += (target.cameraFov - smooth.fov) * alpha;
      smooth.bobIntensity += (target.bobIntensity - smooth.bobIntensity) * alpha;

      // Compute jump elevation & slide factor from target height relative to BASE_EYE_HEIGHT
      const jumpHeight = Math.max(0, smooth.y - BASE_EYE_HEIGHT);
      const slideFactor = Math.max(0, Math.min(1, (BASE_EYE_HEIGHT - smooth.y) / 0.95));
      const jumpFactor = Math.max(0, Math.min(1, jumpHeight / 1.4));

      // Fade character cleanly in/out with environment opacity
      const env = Math.max(0, Math.min(1, target.envOpacity));
      const roadRev = Math.max(0, Math.min(1, target.roadReveal || 0));
      const charVis = env * roadRev;
      character.root.visible = charVis > 0.02;
      character.accentMats.forEach((m) => {
        m.emissiveIntensity = 1.15 * charVis;
      });

      // Deterministic running stride driven by forward distance z
      const stride = Math.abs(smooth.z) * 1.05;
      const runCycle = Math.sin(stride);
      const runCycleOpp = Math.sin(stride + Math.PI);
      const runScale = smooth.bobIntensity * (1 - jumpFactor * 0.85) * (1 - slideFactor);

      // Position runner on road
      const runBounce = Math.abs(Math.sin(stride)) * 0.12 * runScale;
      character.root.position.set(smooth.x, jumpHeight, smooth.z);

      // Keep contact shadow anchored on the asphalt directly below the runner
      character.contactShadow.position.y = -jumpHeight + 0.03;
      const shadowScale = Math.max(0.45, 1 - jumpHeight * 0.22);
      character.contactShadow.scale.setScalar(shadowScale);

      // Torso pose: slight athletic sprint lean, banking into lane weaves, or low slide recline
      const basePivotY = 0.96 + runBounce - slideFactor * 0.56;
      character.bodyPivot.position.y = basePivotY;
      character.bodyPivot.rotation.x =
        -0.16 * runScale - jumpFactor * 0.14 + slideFactor * 1.18;
      character.bodyPivot.rotation.z = smooth.roll * 1.75;
      character.bodyPivot.rotation.y = -smooth.roll * 0.9;

      // Head stays level looking forward down the road
      character.headGroup.rotation.x = -character.bodyPivot.rotation.x * 0.55;

      // Legs animation (running vs jump hurdle tuck vs low slide)
      if (slideFactor > 0.15) {
        // Low slide: right leg extended forward, left leg tucked back
        character.rightLeg.hip.rotation.x = 0.25 * slideFactor;
        character.rightLeg.knee.rotation.x = 0.15 * slideFactor;
        character.leftLeg.hip.rotation.x = -0.35 * slideFactor;
        character.leftLeg.knee.rotation.x = 1.45 * slideFactor;

        character.leftArm.shoulder.rotation.x = -0.6 * slideFactor;
        character.leftArm.elbow.rotation.x = -0.7 * slideFactor;
        character.rightArm.shoulder.rotation.x = 0.5 * slideFactor;
        character.rightArm.elbow.rotation.x = -0.5 * slideFactor;
      } else if (jumpFactor > 0.15) {
        // Athletic mid-air jump tuck
        character.leftLeg.hip.rotation.x = -1.05 * jumpFactor;
        character.leftLeg.knee.rotation.x = 1.35 * jumpFactor;
        character.rightLeg.hip.rotation.x = -0.55 * jumpFactor;
        character.rightLeg.knee.rotation.x = 0.95 * jumpFactor;

        character.leftArm.shoulder.rotation.x = -0.95 * jumpFactor;
        character.leftArm.elbow.rotation.x = -0.85 * jumpFactor;
        character.rightArm.shoulder.rotation.x = -0.75 * jumpFactor;
        character.rightArm.elbow.rotation.x = -0.75 * jumpFactor;
      } else {
        // Full athletic running stride
        character.leftLeg.hip.rotation.x = runCycle * 0.85 * runScale;
        character.leftLeg.knee.rotation.x = Math.max(0, -runCycle) * 1.15 * runScale;
        character.rightLeg.hip.rotation.x = runCycleOpp * 0.85 * runScale;
        character.rightLeg.knee.rotation.x = Math.max(0, -runCycleOpp) * 1.15 * runScale;

        // Opposite arm swing
        character.leftArm.shoulder.rotation.x = runCycleOpp * 0.78 * runScale;
        character.leftArm.elbow.rotation.x = -0.85 * runScale;
        character.rightArm.shoulder.rotation.x = runCycle * 0.78 * runScale;
        character.rightArm.elbow.rotation.x = -0.85 * runScale;
      }

      // Smooth trailing 3rd-person chase camera behind & slightly above the runner
      const camBobY = Math.sin(stride * 2) * 0.04 * runScale;
      const camX = smooth.x * 0.82;
      const camY = 2.68 + jumpHeight * 0.72 - slideFactor * 0.92 + camBobY;
      const camZ = smooth.z + 5.35 - slideFactor * 0.45;

      camera.position.set(camX, camY, camZ);
      lookTarget.set(
        smooth.x * 0.68,
        1.45 + jumpHeight * 0.55 - slideFactor * 0.55 + smooth.pitch * 4,
        smooth.z - 15
      );
      camera.lookAt(lookTarget);
      camera.rotation.z += smooth.roll * 0.45;

      if (Math.abs(camera.fov - smooth.fov) > 0.05) {
        camera.fov = smooth.fov;
        camera.updateProjectionMatrix();
      }

      // Collider position centered on the runner's actual 3D body so coins collect on contact!
      runnerColliderPos.set(
        smooth.x,
        1.15 + jumpHeight - slideFactor * 0.52,
        smooth.z
      );
    }

    function getPosition() {
      return runnerColliderPos;
    }

    return {
      LANE_POSITIONS,
      BASE_EYE_HEIGHT,
      update,
      getPosition,
      character,
    };
  }

  window.GamersGrubPlayer = {
    create: createPlayerController,
    LANE_POSITIONS,
    BASE_EYE_HEIGHT,
  };
})();
