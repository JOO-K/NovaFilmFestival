import * as THREE from 'three/webgpu';
import { initScene, startLoop } from './scene/index.js';
import { THEME } from './scene/theme.js';

import {
  createScreen,
  updateScreen,
  shatterScreenUV,
  isScreenBusy
} from './elements/screen.js';

import { createScaffold } from './elements/scaffold.js';
import { createRings } from './elements/rings.js';
import { createStars, createBigStars } from './effects/stars.js';
import { createMeteorSystem } from './effects/meteors.js';
import { createTSLGalaxy } from './effects/galaxy_tsl.js';

(async () => {
  const ctx = await initScene();
  const { scene } = ctx;

  const isMobile = window.matchMedia('(max-width: 768px)').matches;

  const DESK_W = 9.0, DESK_H = 6.0;
  const MOB_W = 4.0, MOB_H = 10.0;

  const SCREEN_X = isMobile ? 0.0 : -0.2;
  const SCREEN_Y = 5.7;
  const SCREEN_Z = 0.0;

  const screenW = isMobile ? MOB_W : DESK_W;
  const screenH = isMobile ? MOB_H : DESK_H;

  // Screen — force contain + debug overlay to verify it's taking effect
  const screen = createScreen({
    width: screenW,
    height: screenH,
    position: [SCREEN_X, SCREEN_Y, SCREEN_Z],
    debugOverlay: true
  });
  scene.add(screen);

  // Scaffold (desktop only, behind screen)
  if (!isMobile) {
    const DESK_W_SCAFF = 9.0, DESK_H_SCAFF = 6.0;
    const SCAFF_SCREEN_X = -0.2, SCAFF_SCREEN_Y = 7.3, SCAFF_SCREEN_Z = -1.6;
    const SCAFFOLD_DEPTH = 0.4;
    const scaffoldFrontZ = SCAFF_SCREEN_Z - SCAFFOLD_DEPTH - 0.01;
    const frameH = DESK_H_SCAFF * 1.8;
    const baseY = SCAFF_SCREEN_Y - frameH / 2;
    scene.add(createScaffold([SCAFF_SCREEN_X, baseY, scaffoldFrontZ], [DESK_W_SCAFF, DESK_H_SCAFF]));
  }

  // Rings
  const { ringGroup1, ringGroup2, ringPlanes, ringPivots } = createRings();
  scene.add(ringPivots.base1, ringPivots.base2);
  if (isMobile) {
    ringPivots.base1.scale.setScalar(0.9);
    ringPivots.base2.scale.setScalar(0.9);
  }

  // Background + FX
  createStars(scene, THEME);
  createBigStars(scene, THEME);
  const meteors = createMeteorSystem(scene, THEME);

  // Galaxy
  const galaxyTSL = createTSLGalaxy(scene, { count: 20000, branches: 3, radius: 14.0, size: 0.085 });
  galaxyTSL.object.position.x = SCREEN_X;
  if (isMobile) { galaxyTSL.setRadius(16.0); galaxyTSL.setScaleScalar(1.7); }
  else { galaxyTSL.setRadius(18.0); galaxyTSL.setScaleScalar(2.0); }

  // UI → Comet → Shatter
  const activeEffects = [];
  function spawnCometTowardScreen(targetLocalXY = new THREE.Vector2(0, 0)) {
    const cometGroup = new THREE.Group();
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.28, 20, 20),
      new THREE.MeshStandardMaterial({ color: 0xffd089, emissive: 0xffb347, emissiveIntensity: 2.6, roughness: 0.4, metalness: 0.1 }));
    cometGroup.add(core);
    const trailGeom = new THREE.BufferGeometry();
    const trailCount = 70;
    const trailPos = new Float32Array(trailCount * 3);
    trailGeom.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    const trail = new THREE.Points(trailGeom,
      new THREE.PointsMaterial({ size: 0.065, transparent: true, opacity: 0.9, color: 0xffc680 }));
    cometGroup.add(trail);

    cometGroup.position.set(SCREEN_X + 8, SCREEN_Y + 6, 12);

    const local = new THREE.Vector3(targetLocalXY.x, targetLocalXY.y, 0);
    const worldTarget = local.clone(); screen.localToWorld(worldTarget);
    const dir = worldTarget.clone().sub(cometGroup.position).normalize();
    const speed = 12.0;
    let life = 0, hit = false;

    scene.add(cometGroup);

    let cameraShakeT = 0;
    function update(dt) {
      life += dt;
      cometGroup.position.addScaledVector(dir, speed * dt);
      for (let i = trailCount - 1; i > 0; i--) {
        trailPos[i*3+0] = trailPos[(i-1)*3+0];
        trailPos[i*3+1] = trailPos[(i-1)*3+1];
        trailPos[i*3+2] = trailPos[(i-1)*3+2];
      }
      trailPos[0] = cometGroup.position.x;
      trailPos[1] = cometGroup.position.y;
      trailPos[2] = cometGroup.position.z;
      trailGeom.attributes.position.needsUpdate = true;
      trail.material.opacity = Math.max(0, 0.9 - life * 0.18);

      if (!hit) {
        const toPlane = Math.abs(cometGroup.position.z - SCREEN_Z);
        const dx = Math.abs(cometGroup.position.x - worldTarget.x);
        const dy = Math.abs(cometGroup.position.y - worldTarget.y);
        if (toPlane < 0.15 && dx < 0.6 && dy < 0.8) {
          hit = true;
          const localHit = screen.worldToLocal(cometGroup.position.clone());
          const u = (localHit.x + (isMobile ? MOB_W : DESK_W) * 0.5) / (isMobile ? MOB_W : DESK_W);
          const v = (localHit.y + (isMobile ? MOB_H : DESK_H) * 0.5) / (isMobile ? MOB_H : DESK_H);
          shatterScreenUV(screen, THREE.MathUtils.clamp(u, 0, 1), THREE.MathUtils.clamp(v, 0, 1));
          cameraShakeT = 0.45;
          core.material.emissiveIntensity = 3.0;
        }
      }
      if (cameraShakeT > 0) {
        cameraShakeT -= dt;
        const k = cameraShakeT / 0.45;
        const amp = 0.07 * k;
        ctx.rigs.cameraRig.position.x += (Math.random() - 0.5) * amp;
        ctx.rigs.cameraRig.position.y += (Math.random() - 0.5) * amp;
        ctx.rigs.cameraRig.rotation.z += (Math.random() - 0.5) * amp * 0.2;
      }
      if (life > 2.6) { scene.remove(cometGroup); return false; }
      return true;
    }
    activeEffects.push(update);
  }

  const btn1 = document.getElementById('btn1');
  if (btn1) {
    btn1.addEventListener('click', () => {
      if (isScreenBusy(screen)) return;
      spawnCometTowardScreen(new THREE.Vector2(0, 0));
    });
  }

  startLoop(ctx, ({ dt, t }) => {
    updateScreen(screen);

    // rings anim
    ringPivots.ring1.rotateOnAxis(new THREE.Vector3(0, 1, 0), 0.008);
    ringPivots.ring2.rotateOnAxis(new THREE.Vector3(0, 1, 0), -0.006);
    ringPivots.base1.rotation.x = Math.sin(t * 0.9) * 0.4;
    ringPivots.base1.rotation.z = Math.cos(t * 1.2) * 0.3;
    ringPivots.base2.rotation.x = Math.cos(t * 1.1) * 0.35;
    ringPivots.base2.rotation.z = Math.sin(t * 0.8) * 0.25;

    meteors.update(dt);
    galaxyTSL.update(dt);

    for (let i = activeEffects.length - 1; i >= 0; i--) {
      const alive = activeEffects[i](dt);
      if (!alive) activeEffects.splice(i, 1);
    }
  });
})();
