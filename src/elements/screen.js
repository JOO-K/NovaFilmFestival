// src/elements/screen.js
// Video screen that fits the full video INSIDE the outer screen (object-fit: contain),
// and a shatter effect that uses per-tile CLONED textures so the intact screen never
// gets its UVs hijacked.

import * as THREE from 'three/webgpu';

const GRID_X = 12;
const GRID_Y = 8;

export function createScreen({
  width = 9.0,
  height = 6.0,
  position = [-0.2, 5.7, 0],
  resetAfter = 2.2,
  cooldown = 0.6
} = {}) {

  // --- Group anchor
  const group = new THREE.Group();
  group.position.set(position[0], position[1], position[2]);
  group.name = 'ScreenGroup';

  // --- Back panel (letter/pillar box background)
  const backPanel = new THREE.Mesh(
    new THREE.PlaneGeometry(width, height),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  );
  group.add(backPanel);

  // --- Video element + base VideoTexture (NEVER change offset/repeat on THIS one)
  const video = document.createElement('video');
  video.src = 'showreel.mp4';
  video.crossOrigin = 'anonymous';
  video.loop = true;
  video.muted = true;
  video.playsInline = true;
  video.autoplay = true;

  const baseTex = new THREE.VideoTexture(video);
  baseTex.colorSpace = THREE.SRGBColorSpace;
  baseTex.minFilter = THREE.LinearFilter;
  baseTex.magFilter = THREE.LinearFilter;
  baseTex.wrapS = THREE.ClampToEdgeWrapping;
  baseTex.wrapT = THREE.ClampToEdgeWrapping;
  baseTex.flipY = true; // default; leave it consistent across all clones

  // IMPORTANT: keep defaults on the base texture
  baseTex.offset.set(0, 0);
  baseTex.repeat.set(1, 1);
  baseTex.center.set(0, 0);

  // --- Intact video plane (built after metadata so we know aspect)
  let intactVideoPlane = null;
  let videoW = 0, videoH = 0;

  // --- Shatter tiles (each uses a CLONE of baseTex so UV changes are local)
  const tiles = [];

  function clearTiles() {
    for (const t of tiles) {
      // dispose cloned textures/materials/geometry to be clean if you ever rebuild
      if (t.material?.map && t.material.map !== baseTex) t.material.map.dispose();
      t.material?.dispose?.();
      t.geometry?.dispose?.();
      group.remove(t);
    }
    tiles.length = 0;
  }

  function buildTiles() {
    clearTiles();

    const tileW = videoW / GRID_X;
    const tileH = videoH / GRID_Y;
    const tileGeo = new THREE.PlaneGeometry(tileW, tileH);

    for (let iy = 0; iy < GRID_Y; iy++) {
      for (let ix = 0; ix < GRID_X; ix++) {
        // CLONE the base texture so repeat/offset only affect this tile
        const tileTex = baseTex.clone();
        // keep same image/source; no need to set .needsUpdate every frame
        tileTex.wrapS = THREE.ClampToEdgeWrapping;
        tileTex.wrapT = THREE.ClampToEdgeWrapping;
        tileTex.flipY = baseTex.flipY;

        // Window into the video (0..1 range), flip Y for standard UVs
        tileTex.repeat.set(1 / GRID_X, 1 / GRID_Y);
        tileTex.offset.set(ix / GRID_X, 1 - (iy + 1) / GRID_Y);

        const mat = new THREE.MeshBasicMaterial({
          map: tileTex,
          transparent: true,
          opacity: 1.0,
          depthTest: true
        });

        const m = new THREE.Mesh(tileGeo, mat);

        const baseX = -videoW / 2 + tileW / 2 + ix * tileW;
        const baseY = -videoH / 2 + tileH / 2 + iy * tileH;
        m.position.set(baseX, baseY, 0);
        m.rotation.set(0, 0, 0);

        m.userData.basePos = new THREE.Vector3(baseX, baseY, 0);
        m.userData.vel = new THREE.Vector3();
        m.userData.ang = new THREE.Vector3();

        m.visible = false; // hidden until shatter
        tiles.push(m);
        group.add(m);
      }
    }
  }

  function buildIntactVideoPlane() {
    if (intactVideoPlane) {
      group.remove(intactVideoPlane);
      intactVideoPlane.material?.dispose?.();
      intactVideoPlane.geometry?.dispose?.();
    }
    intactVideoPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(videoW, videoH),
      new THREE.MeshBasicMaterial({ map: baseTex }) // use BASE texture with repeat=(1,1), offset=(0,0)
    );
    intactVideoPlane.name = 'IntactVideoPlane';
    group.add(intactVideoPlane);
  }

  // Fit the video plane INSIDE the outer screen (contain)
  function fitVideoToScreen(vw, vh) {
    const planeAspect = width / height;
    const vidAspect = vw / vh;

    if (vidAspect > planeAspect) {
      videoW = width;
      videoH = width / vidAspect;
    } else {
      videoH = height;
      videoW = height * vidAspect;
    }
  }

  function initAfterMetadata() {
    const vw = video.videoWidth || 1280;
    const vh = video.videoHeight || 720;

    fitVideoToScreen(vw, vh);
    buildIntactVideoPlane();
    buildTiles();

    video.play().catch(() => {});
  }

  video.addEventListener('loadedmetadata', initAfterMetadata);
  setTimeout(() => {
    // fallback if metadata event is slow
    if (!videoW || !videoH) initAfterMetadata();
  }, 1200);

  // --- Shatter state
  let shatterActive = false;
  let shatterT = 0;
  let cooldownT = 0;

  function fullyHideTilesAndShowIntact() {
    for (const t of tiles) {
      t.visible = false;
      t.material.opacity = 1.0;
      t.position.copy(t.userData.basePos);
      t.rotation.set(0, 0, 0);
      t.userData.vel.set(0, 0, 0);
      t.userData.ang.set(0, 0, 0);
    }
    if (intactVideoPlane) intactVideoPlane.visible = true;
  }

  // u,v are outer-screen UVs (0..1 across width/height)
  function triggerShatter(u, v) {
    if (!intactVideoPlane || !videoW || !videoH) return;
    if (shatterActive || cooldownT > 0) return;

    const hitOuter = new THREE.Vector3(
      (u - 0.5) * width,
      (v - 0.5) * height,
      0
    );

    // clamp impact to the inner video rectangle (centered)
    const halfW = videoW / 2;
    const halfH = videoH / 2;
    const hitLocal = new THREE.Vector3(
      THREE.MathUtils.clamp(hitOuter.x, -halfW, halfW),
      THREE.MathUtils.clamp(hitOuter.y, -halfH, halfH),
      0
    );

    intactVideoPlane.visible = false;

    for (const t of tiles) {
      t.visible = true;
      t.material.opacity = 1.0;
      t.position.copy(t.userData.basePos);
      t.rotation.set(0, 0, 0);

      const toTile = new THREE.Vector3().subVectors(t.position, hitLocal);
      const dist = Math.max(0.001, toTile.length());
      toTile.normalize();

      const base = 6.5;
      const falloff = Math.max(0.2, 1.0 - dist / Math.max(videoW, videoH));
      const speed = base * (0.6 + 0.8 * falloff) * (0.9 + Math.random() * 0.2);
      const zKick = 0.6 * (0.6 + 0.8 * falloff);

      t.userData.vel.set(toTile.x * speed, toTile.y * speed, zKick);
      t.userData.ang.set(
        (Math.random() - 0.5) * 6.0,
        (Math.random() - 0.5) * 6.0,
        (Math.random() - 0.5) * 6.0
      );
    }

    shatterActive = true;
    shatterT = 0;
  }

  function update() {
    // keep base VideoTexture fresh
    if (video.readyState >= 2) {
      baseTex.needsUpdate = true;
    }

    if (cooldownT > 0) cooldownT = Math.max(0, cooldownT - 1 / 60);
    if (!shatterActive) return;

    const dt = 1 / 60;
    shatterT += dt;

    for (const t of tiles) {
      const v = t.userData.vel;
      const a = t.userData.ang;

      t.position.x += v.x * dt;
      t.position.y += v.y * dt;
      t.position.z += v.z * dt;

      t.rotation.x += a.x * dt;
      t.rotation.y += a.y * dt;
      t.rotation.z += a.z * dt;

      v.y -= 9.8 * 0.6 * dt;
      v.multiplyScalar(0.985);
      a.multiplyScalar(0.985);

      if (shatterT > resetAfter - 1.2) {
        const k = THREE.MathUtils.clamp((shatterT - (resetAfter - 1.2)) / 1.2, 0, 1);
        t.material.opacity = 1.0 - k;
      }
    }

    if (shatterT >= resetAfter) {
      shatterActive = false;
      cooldownT = cooldown;
      fullyHideTilesAndShowIntact();
    }
  }

  // API
  group.userData.update = update;
  group.userData.shatter = (u, v) =>
    triggerShatter(THREE.MathUtils.clamp(u, 0, 1), THREE.MathUtils.clamp(v, 0, 1));
  group.userData.isShattering = () => shatterActive || cooldownT > 0;

  // initial
  fullyHideTilesAndShowIntact();
  return group;
}

// Helpers for main.js
export function updateScreen(screenMesh) { screenMesh?.userData?.update?.(); }
export function shatterScreenUV(screenMesh, u, v) { screenMesh?.userData?.shatter?.(u, v); }
export function isScreenBusy(screenMesh) { return !!screenMesh?.userData?.isShattering?.(); }
