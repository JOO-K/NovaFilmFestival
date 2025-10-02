import * as THREE from 'three/webgpu';

import { THEME } from '../scene/theme.js';
import { softCircleTexture } from '../scene/utils.js';


export function createLinksSystem(scene, THEME, { screen, ringPlanes, meteors }){
const beadTex = softCircleTexture(128, { inner:1.0, mid:0.5 });
const links = []; const persistent = [];
function screenAnchor(){ return new THREE.Vector3(4.0, 5.4, 0.05); }
function createLink(getStart, getEnd){
const curve = new THREE.CatmullRomCurve3([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], false, 'catmullrom', 0.5);
const g = new THREE.PlaneGeometry(1,1);
const m = new THREE.MeshBasicMaterial({ map:beadTex, color:THEME.links.color, transparent:true, opacity:THEME.links.opacity, blending:THREE.AdditiveBlending, depthWrite:false });
const beads = new THREE.InstancedMesh(g, m, THEME.links.beadsPerLink); beads.renderOrder=12; scene.add(beads);
const offsets = new Float32Array(THEME.links.beadsPerLink); for (let i=0;i<offsets.length;i++) offsets[i]=i/offsets.length;
const midOffset = new THREE.Vector3((Math.random()-0.5)*1.0, THEME.links.curveArchHeight*(0.8+Math.random()*0.4), (Math.random()-0.5)*1.0);
return { getStart, getEnd, curve, beads, offsets, midOffset };
}
// persistent screen ↔ ring links
const pool = ringPlanes.slice();
for (let i=0;i<Math.min(THEME.links.ringLinkCount, pool.length); i++){
const idx = Math.floor(Math.random()*pool.length); const plane = pool.splice(idx,1)[0];
const link = createLink(()=>screenAnchor(), ()=>plane.getWorldPosition(new THREE.Vector3()));
links.push(link); persistent.push(link);
}
function update(dt, camera){
// ensure up to meteorLinkMax dynamic links
const currentMeteorMeshes = meteors.getActiveMeteorMeshes();
// remove links whose target no longer exists (non-persistent only)
for (let i=links.length-1;i>=0;i--){
if (persistent.includes(links[i])) continue;
const end = links[i].getEnd(); if (!end){ scene.remove(links[i].beads); links.splice(i,1); }
}
const dynamicNow = links.length - persistent.length;
for (let i=0; i<currentMeteorMeshes.length && (dynamicNow + i) < THEME.links.meteorLinkMax; i++){
const mesh = currentMeteorMeshes[i];
if (!links.some(L => !persistent.includes(L) && L.target === mesh)){
const link = createLink(()=>screenAnchor(), ()=>mesh.getWorldPosition(new THREE.Vector3()));
link.target = mesh; links.push(link);
}
}
// animate beads
const tmp = new THREE.Object3D();
links.forEach(link => {
const start = link.getStart(); const end = link.getEnd(); if (!start||!end) return;
const mid = start.clone().lerp(end, 0.5).add(link.midOffset);
link.curve.points[0].copy(start); link.curve.points[1].copy(mid); link.curve.points[2].copy(end);
for (let i=0;i<link.offsets.length;i++){
link.offsets[i]=(link.offsets[i]+THEME.links.speed*dt)%1.0; const t=link.offsets[i];
const p = link.curve.getPoint(t);
tmp.position.copy(p); tmp.quaternion.copy(camera.quaternion);
const s = THEME.links.beadSize * (0.8 + 0.4 * Math.sin(t*Math.PI*2)); tmp.scale.set(s,s,s); tmp.updateMatrix();
link.beads.setMatrixAt(i, tmp.matrix);
}
link.beads.instanceMatrix.needsUpdate = true;
});
}
return { update };
}