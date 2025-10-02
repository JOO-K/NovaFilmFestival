// src/scene/index.js
import * as THREE from 'three/webgpu';
import { THEME } from './theme.js';

function safePixelRatio(maxDim = 8192) {
  const maxDprW = maxDim / Math.max(1, window.innerWidth);
  const maxDprH = maxDim / Math.max(1, window.innerHeight);
  return Math.min(window.devicePixelRatio || 1, maxDprW, maxDprH);
}

export async function initScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(THEME.bg);

  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    THEME.zNear,
    THEME.zFar
  );
  camera.position.set(0, 5, 11);
  camera.lookAt(0, 5, 0);

  const cameraRig = new THREE.Group();
  cameraRig.add(camera);
  scene.add(cameraRig);

  const renderer = new THREE.WebGPURenderer({
    antialias: true,
    requiredLimits: { maxTextureDimension2D: 16384 }
  });

  function sizeRenderer() {
    const dpr = safePixelRatio(8192);
    renderer.setPixelRatio(dpr);
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  sizeRenderer();
  renderer.domElement.classList.add('three-canvas');
  document.body.appendChild(renderer.domElement);

  // IMPORTANT: wait for backend/device
  await renderer.init();

  // simple lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.32));
  const dir = new THREE.DirectionalLight(0x9fc1ff, 0.5);
  dir.position.set(6, 12, 8);
  scene.add(dir);

  const clock = new THREE.Clock();
  const mouse = new THREE.Vector2();
  window.addEventListener('mousemove', (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  });

  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    sizeRenderer();
  });

  return { scene, camera, renderer, clock, mouse, rigs: { cameraRig } };
}

export function startLoop(ctx, update) {
  const { renderer, scene, camera, clock, rigs, mouse } = ctx;

  function frame(timeMs) {
    const dt = clock.getDelta();
    const t = timeMs * 0.001;

    const maxTilt = 0.1, maxShift = 0.5;
    rigs.cameraRig.rotation.x += ((mouse.y * maxTilt) - rigs.cameraRig.rotation.x) * 0.05;
    rigs.cameraRig.rotation.y += ((-mouse.x * maxTilt) - rigs.cameraRig.rotation.y) * 0.05;
    rigs.cameraRig.position.x += ((-mouse.x * maxShift) - rigs.cameraRig.position.x) * 0.05;
    rigs.cameraRig.position.y += ((mouse.y * maxShift) - rigs.cameraRig.position.y) * 0.05;

    update({ dt, t });
    renderer.render(scene, camera);

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}
