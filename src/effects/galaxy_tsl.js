// src/effects/galaxy_tsl.js
// WebGPU + TSL spiral galaxy with smooth "implode → explode → settle" cycle.
import * as THREE from 'three/webgpu';
import { color, cos, float, mix, range, sin, time, uniform, uv, vec3, vec4, PI2 } from 'three/tsl';

export function createTSLGalaxy(scene, opts = {}) {
  const count        = opts.count    ?? 20000;
  const spriteSize   = opts.size     ?? 0.085;
  const branches     = opts.branches ?? 3;

  // ---- tunables (updated to your request) ----
  const PERIOD_S         = opts.period     ?? 13.0;  // total cycle 13s
  const COLLAPSE_FRAC    = 0.60;                     // 60% of cycle = slow, gradual implosion
  const EXPLODE_FRAC     = 0.18;                     // fast pop
  const SETTLE_FRAC      = 1.0 - COLLAPSE_FRAC - EXPLODE_FRAC;
  const COLLAPSE_MIN     = opts.collapseTo ?? 0.10;  // tighter implosion
  const EXPLODE_MAX      = opts.explodeTo  ?? 1.45;  // bigger explosion
  const SMOOTH_LAMBDA    = 7.0;                      // smoothing factor for jitter-free motion
  // --------------------------------------------

  // uniforms
  const radiusU        = uniform(opts.radius ?? 14.0);   // base spiral radius (dynamic)
  const burstScaleU    = uniform(1.0);                   // animated multiplier
  const sizeU          = uniform(spriteSize);
  const colorInsideU   = uniform(color('#ffa575'));
  const colorOutsideU  = uniform(color('#311599'));

  const material = new THREE.SpriteNodeMaterial({
    depthWrite: false,
    depthTest:  true,                 // screen can occlude the center
    transparent: true,
    blending: THREE.AdditiveBlending
  });

  // TSL graph (demo-accurate) with burst scaling injected
  material.scaleNode = range(0, 1).mul(sizeU);

  const radiusRatio  = range(0, 1);
  const radius       = radiusRatio.pow(1.5).mul(radiusU).mul(burstScaleU).toVar();

  const branchAngle  = range(0, branches).floor().mul(PI2.div(branches));
  const angle        = branchAngle.add(time.mul(radiusRatio.oneMinus()));

  const position     = vec3(cos(angle), 0, sin(angle)).mul(radius);
  const randomOffset = range(vec3(-1), vec3(1)).pow3().mul(radiusRatio).add(0.2);
  material.positionNode = position.add(randomOffset);

  const colorFinal   = mix(colorInsideU, colorOutsideU, radiusRatio.oneMinus().pow(2).oneMinus());
  const alpha        = float(0.1).div(uv().sub(0.5).length()).sub(0.2);
  material.colorNode = vec4(colorFinal, alpha);

  const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, count);
  mesh.frustumCulled = false;
  mesh.renderOrder   = 5;
  mesh.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 9999);

  const group = new THREE.Group();
  group.add(mesh);

  // behind your screen, big enough to peek around sides
  group.position.set(-0.2, 5.2, -10.0);
  group.rotation.set(0.35, 0.0, 0.18);
  group.scale.setScalar(2.0);

  scene.add(group);

  // --------------- animation (smooth, jitter-free) ---------------
  let elapsed = 0;
  let currentScale = 1.0;
  const baseSize = spriteSize;

  // easings
  const easeInCubic  = (t) => t*t*t;
  const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
  const easeOutExpo  = (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));
  // framerate-independent exponential smoothing
  const smoothTo = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));

  function update(dt) {
    elapsed += dt;
    const p = (elapsed % PERIOD_S) / PERIOD_S; // 0..1 phase in cycle

    let target = 1.0;

    if (p < COLLAPSE_FRAC) {
      // gradual implosion from 1.0 -> COLLAPSE_MIN
      const u = p / COLLAPSE_FRAC;                 // 0..1
      const k = easeInCubic(u);                    // slow start, faster later
      target = 1.0 + (COLLAPSE_MIN - 1.0) * k;
    } else if (p < COLLAPSE_FRAC + EXPLODE_FRAC) {
      // quick explosion from COLLAPSE_MIN -> EXPLODE_MAX
      const u = (p - COLLAPSE_FRAC) / EXPLODE_FRAC; // 0..1
      const k = easeOutCubic(u);
      target = COLLAPSE_MIN + (EXPLODE_MAX - COLLAPSE_MIN) * k;
    } else {
      // settle back from EXPLODE_MAX -> 1.0
      const u = (p - COLLAPSE_FRAC - EXPLODE_FRAC) / SETTLE_FRAC; // 0..1
      const k = easeOutExpo(u);
      target = EXPLODE_MAX + (1.0 - EXPLODE_MAX) * k;
    }

    // smooth both the radius scale and the slight sprite-size pulse
    currentScale = smoothTo(currentScale, target, SMOOTH_LAMBDA, dt);
    burstScaleU.value = currentScale;

    const sizePulse = 0.06 * (currentScale - 1.0); // very subtle
    sizeU.value = baseSize * (1.0 + sizePulse);

    // gentle swirl
    group.rotation.y += 0.06 * dt;
  }

  // runtime setters (still available)
  function setRadius(v)       { radiusU.value = v; }
  function setSpriteSize(v)   { sizeU.value = v; }
  function setScaleScalar(s)  { group.scale.setScalar(s); }
  function setColors(insideHex, outsideHex) {
    colorInsideU.value.set(insideHex);
    colorOutsideU.value.set(outsideHex);
  }

  return { object: group, update, setRadius, setSpriteSize, setScaleScalar, setColors };
}
