import * as THREE from 'three/webgpu';

import { THEME } from '../scene/theme.js';
import { softCircleTexture } from '../scene/utils.js';


export function createMeteorSystem(scene){
const smokeTexture = softCircleTexture(256, { inner:1.0, mid:0.35 });
const glowTexture = softCircleTexture(128, { inner:1.0, mid:0.6 });
const meteorPool = []; const activeMeteors = []; const smokePool=[]; const activeSmoke=[];
let elapsed=0; let burstSchedule=[]; let nextBurstAt=THEME.burstInterval;


function makeMeteorMesh(){
const geom = new THREE.BoxGeometry(THEME.meteorThickness, THEME.meteorThickness, THEME.meteorLength);
const mat = new THREE.MeshBasicMaterial({ color:new THREE.Color(1.0,0.96,0.9), blending:THREE.AdditiveBlending, transparent:true, opacity:0.85, depthWrite:false, depthTest:false });
const mesh = new THREE.Mesh(geom, mat);
const glowMat = new THREE.SpriteMaterial({ map:glowTexture, color:THEME.tipGlow.color, transparent:true, opacity:THEME.tipGlow.opacity, depthWrite:false, depthTest:false, blending:THREE.AdditiveBlending });
const glow = new THREE.Sprite(glowMat); glow.scale.set(THEME.tipGlow.size, THEME.tipGlow.size, THEME.tipGlow.size); glow.position.set(0,0,THEME.meteorLength*0.5+0.08); mesh.add(glow);
mesh.visible=false; mesh.renderOrder=10; scene.add(mesh);
return { mesh, velocity:new THREE.Vector3(), lifetime:0, maxLifetime:0, smokeTimer:0, glow };
}
function createPools(){ for (let i=0;i*Math.max(1,1)<Math.max(12,THEME.burstCount+2);i++) meteorPool.push(makeMeteorMesh()); }
createPools();
for (let i=0;i<THEME.smoke.poolSize;i++){
const mat = new THREE.SpriteMaterial({ map:smokeTexture, color:new THREE.Color(0.9,0.92,1.0), transparent:true, opacity:THEME.smoke.opacityStart, depthWrite:false, depthTest:false, blending:THREE.AdditiveBlending });
const sprite = new THREE.Sprite(mat); sprite.visible=false; sprite.renderOrder=9; scene.add(sprite);
smokePool.push({ sprite, lifetime:0, maxLifetime:THEME.smoke.lifetime });
}


function scheduleNextBurst(now){
nextBurstAt = now + THEME.burstInterval; burstSchedule.length=0;
for (let i=0;i<THEME.burstCount;i++) burstSchedule.push(now + Math.random()*THEME.burstSpread + (Math.random()-0.5)*THEME.jitterEach);
burstSchedule.sort((a,b)=>a-b);
}


function spawnMeteor(){
if (!meteorPool.length) return; const slot = meteorPool.pop();
const startX = 25 + Math.random()*10; const startY = THREE.MathUtils.lerp(THEME.laneYTop, THEME.laneYTop+1.8, Math.random()); const startZ = THREE.MathUtils.lerp(THEME.laneZMin, THEME.laneZMax, Math.random());
const targetX = -18 - Math.random()*20; const targetY = THREE.MathUtils.lerp(THEME.laneYBot, THEME.laneYBot-2.2, Math.random()); const targetZ = THREE.MathUtils.lerp(THEME.laneZMin, THEME.laneZMax, Math.random());
const dir = new THREE.Vector3(targetX-startX, targetY-startY, targetZ-startZ).normalize();
const speed = THREE.MathUtils.lerp(THEME.meteorSpeedMin, THEME.meteorSpeedMax, Math.random());
slot.mesh.position.set(startX,startY,startZ); slot.velocity.copy(dir).multiplyScalar(speed);
slot.maxLifetime = new THREE.Vector3(targetX,targetY,targetZ).distanceTo(slot.mesh.position)/speed; slot.lifetime=0; slot.smokeTimer=0;
const quat = new THREE.Quaternion(); quat.setFromUnitVectors(new THREE.Vector3(0,0,1), dir); slot.mesh.setRotationFromQuaternion(quat);
slot.mesh.visible=true; activeMeteors.push(slot);
}


function emitSmoke(position, velocity){
if (!smokePool.length) return; const slot = smokePool.pop();
const back = velocity.clone().normalize().multiplyScalar(0.18);
const jitter = new THREE.Vector3((Math.random()-0.5)*0.08,(Math.random()-0.5)*0.08,(Math.random()-0.5)*0.08);
slot.sprite.position.copy(position).sub(back).add(jitter); slot.lifetime=0; slot.maxLifetime=THEME.smoke.lifetime; slot.sprite.scale.set(THEME.smoke.sizeStart, THEME.smoke.sizeStart, THEME.smoke.sizeStart); slot.sprite.material.opacity=THEME.smoke.opacityStart; slot.sprite.visible=true; activeSmoke.push(slot);
}


function updateMeteors(dt){
for (let i=activeMeteors.length-1;i>=0;i--){
const m=activeMeteors[i]; m.lifetime+=dt; m.mesh.position.addScaledVector(m.velocity, dt);
m.smokeTimer += dt; const emitInterval = 1/THEME.smoke.perSecond; while (m.smokeTimer>=emitInterval){ m.smokeTimer -= emitInterval; emitSmoke(m.mesh.position, m.velocity); }
if (m.glow) m.glow.material.opacity = THEME.tipGlow.opacity * (0.95 + Math.sin((elapsed+i)*8.0)*0.05);
if (m.lifetime>=m.maxLifetime || m.mesh.position.x<-90 || m.mesh.position.x>90 || Math.abs(m.mesh.position.y)>90 || Math.abs(m.mesh.position.z)>90){ m.mesh.visible=false; activeMeteors.splice(i,1); meteorPool.push(m); }
}
}


function updateSmoke(dt){
for (let i=activeSmoke.length-1;i>=0;i--){
const s=activeSmoke[i]; s.lifetime+=dt; const t=s.lifetime/s.maxLifetime; const size=THREE.MathUtils.lerp(THEME.smoke.sizeStart, THEME.smoke.sizeEnd, t); const op=THREE.MathUtils.lerp(THEME.smoke.opacityStart, THEME.smoke.opacityEnd, t);
s.sprite.scale.set(size,size,size); s.sprite.material.opacity=op; s.sprite.position.y += dt*0.1;
if (s.lifetime>=s.maxLifetime){ s.sprite.visible=false; activeSmoke.splice(i,1); smokePool.push(s); }
}
}


scheduleNextBurst(0);


return {
update(dt){
elapsed += dt; if (elapsed>=nextBurstAt && !burstSchedule.length) scheduleNextBurst(elapsed);
while (burstSchedule.length && burstSchedule[0]<=elapsed){ burstSchedule.shift(); spawnMeteor(); }
updateMeteors(dt); updateSmoke(dt);
},
getActiveMeteorMeshes(){ return activeMeteors.map(m=>m.mesh); }
};
}