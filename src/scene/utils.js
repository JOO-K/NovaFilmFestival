import * as THREE from 'three/webgpu';



export function softCircleTexture(size = 256, stops = { inner: 1.0, mid: 0.35 }) {
const canvas = document.createElement('canvas');
canvas.width = canvas.height = size;
const ctx = canvas.getContext('2d');
const g = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
g.addColorStop(0.0, `rgba(255,255,255,${stops.inner})`);
g.addColorStop(0.4, `rgba(255,255,255,${stops.mid})`);
g.addColorStop(1.0, 'rgba(255,255,255,0.0)');
ctx.fillStyle = g; ctx.fillRect(0,0,size,size);
const tex = new THREE.CanvasTexture(canvas);
tex.minFilter = THREE.LinearFilter; tex.magFilter = THREE.LinearFilter;
tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
return tex;
}