// src/elements/rings.js
import * as THREE from 'three/webgpu';

/**
 * Textures for the ring planes
 * - Files must live in: src/assets/textures/
 * - We use Vite's import.meta.glob to collect URLs at build time.
 * - 'as: "url"' ensures we get the resolved URL (works in dev + build + GitHub Pages).
 */
const files = import.meta.glob('../assets/textures/*.{jpg,jpeg,png,gif}', {
  eager: true,
  as: 'url'
});

const loader = new THREE.TextureLoader();
const textures = Object.values(files).map((url) => {
  const tex = loader.load(url);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.minFilter = THREE.LinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
});

// Fallback if no textures were found (keeps app from crashing on empty folder)
if (textures.length === 0) {
  const c = document.createElement('canvas');
  c.width = c.height = 2;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 2, 2);
  const fallback = new THREE.CanvasTexture(c);
  fallback.colorSpace = THREE.SRGBColorSpace;
  textures.push(fallback);
}

export function createRings() {
  const ringRadius = 14;
  const ringPlaneCount = 20;
  const arcLength = (2 * Math.PI * ringRadius) / ringPlaneCount;
  const planeWidth = arcLength * 1.05;
  const planeHeight = 6;

  const base1 = new THREE.Object3D();
  const base2 = new THREE.Object3D();
  const ring1 = new THREE.Object3D();
  const ring2 = new THREE.Object3D();
  base1.add(ring1);
  base2.add(ring2);
  ring1.rotation.set(0.5, 0, 0.3);
  ring2.rotation.set(-0.3, 0, -0.5);

  const ringGroup1 = new THREE.Group();
  const ringGroup2 = new THREE.Group();
  const ringPlanes = [];

  const geometry = new THREE.PlaneGeometry(planeWidth, planeHeight);

  for (let i = 0; i < ringPlaneCount; i++) {
    const angle = (i / ringPlaneCount) * Math.PI * 2;
    const x = Math.cos(angle) * ringRadius;
    const z = Math.sin(angle) * ringRadius;

    const tex = textures[Math.floor(Math.random() * textures.length)];
    const mat1 = new THREE.MeshBasicMaterial({
      map: tex,
      transparent: true,
      side: THREE.DoubleSide
    });
    const mat2 = mat1.clone();

    const p1 = new THREE.Mesh(geometry, mat1);
    p1.position.set(x, 0, z);
    p1.lookAt(0, 0, 0);
    ringGroup1.add(p1);
    ringPlanes.push(p1);

    const p2 = new THREE.Mesh(geometry, mat2);
    p2.position.set(x, 0, z);
    p2.lookAt(0, 0, 0);
    ringGroup2.add(p2);
    ringPlanes.push(p2);
  }

  ringGroup1.position.y = 4.5;
  ringGroup2.position.y = 5.5;
  ring1.add(ringGroup1);
  ring2.add(ringGroup2);

  return {
    ringGroup1,
    ringGroup2,
    ringPlanes,
    ringPivots: { base1, base2, ring1, ring2 }
  };
}
