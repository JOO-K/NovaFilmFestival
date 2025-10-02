import * as THREE from 'three/webgpu';



export function createStars(scene, THEME){
const positions = new Float32Array(THEME.starCount * 3);
const colors = new Float32Array(THEME.starCount * 3);
const color = new THREE.Color();
for (let i=0;i<THEME.starCount;i++){
const ix = i*3;
positions[ix] = (Math.random()*2-1) * THEME.starSpread;
positions[ix + 1] = (Math.random()*2-1) * THEME.starSpread;
positions[ix + 2] = (Math.random()*2-1) * THEME.starSpread;
color.setHSL(0.58 + Math.random()*0.1, 0.55, 0.75 + Math.random()*0.2);
colors[ix] = color.r; colors[ix+1] = color.g; colors[ix+2] = color.b;
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
const mat = new THREE.PointsMaterial({ size: 0.06, sizeAttenuation: true, vertexColors: true, transparent: true, depthWrite:false, blending: THREE.AdditiveBlending });
scene.add(new THREE.Points(geo, mat));
}


export function createBigStars(scene, THEME){
const N = THEME.bigStarCount;
const positions = new Float32Array(N*3);
for (let i=0;i<N;i++){
const ix=i*3;
positions[ix] = (Math.random()*2-1) * THEME.starSpread * 0.9;
positions[ix + 1] = (Math.random()*2-1) * THEME.starSpread * 0.9;
positions[ix + 2] = (Math.random()*2-1) * THEME.starSpread * 0.9;
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
const mat = new THREE.PointsMaterial({ size: THEME.bigStarSize, sizeAttenuation:true, color:0xffffff, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending });
scene.add(new THREE.Points(geo, mat));
}