import * as THREE from 'three/webgpu';


export function createGalaxyCluster(scene, cfg, name){
const group = new THREE.Group(); group.name = name;
for (let n=0;n<cfg.clusterCount;n++){
const center = cfg.center.clone().add(new THREE.Vector3(
(Math.random()-0.5)*cfg.spread.x,
(Math.random()-0.5)*cfg.spread.y,
(Math.random()-0.5)*cfg.spread.z,
));
const pts = buildGalaxyPoints({
arms: cfg.arms,
pointsPerArm: cfg.pointsPerArm,
radius: cfg.radius * (0.92 + Math.random()*0.18),
twist: cfg.twist * (0.95 + Math.random()*0.1),
jitter: cfg.jitter,
size: cfg.size,
}, center);
pts.rotation.x = cfg.baseTilt.x + (Math.random()-0.5)*0.12;
pts.rotation.y = (cfg.baseTilt.y||0) + (Math.random()-0.5)*0.1;
pts.rotation.z = cfg.baseTilt.z + (Math.random()-0.5)*0.12;
pts.userData.rotSpeed = cfg.spin * (0.7 + Math.random()*0.6);
group.add(pts);
}
scene.add(group);
return group;
}


function buildGalaxyPoints(g, center){
const total = g.arms * g.pointsPerArm;
const positions = new Float32Array(total*3);
const colors = new Float32Array(total*3);
const color = new THREE.Color(); let idx=0;
for (let a=0;a<g.arms;a++){
const armPhase = (a/g.arms) * Math.PI*2;
for (let i=0;i<g.pointsPerArm;i++){
const t = i/g.pointsPerArm; const r = t*g.radius; const ang = armPhase + t*g.twist*Math.PI*2;
let x = Math.cos(ang)*r; let y = (Math.random()-0.5)*1.2; let z = Math.sin(ang)*r;
x += (Math.random()-0.5)*g.jitter; y += (Math.random()-0.5)*g.jitter*0.35; z += (Math.random()-0.5)*g.jitter;
positions[idx] = x+center.x; positions[idx+1]=y+center.y; positions[idx+2]=z+center.z; idx+=3;
color.setHSL(0.58 + (1-t)*0.08, 0.5 + t*0.2, 0.6 + (1-t)*0.25);
colors[idx-3] = color.r; colors[idx-2] = color.g; colors[idx-1] = color.b;
}
}
const geo = new THREE.BufferGeometry();
geo.setAttribute('position', new THREE.BufferAttribute(positions,3));
geo.setAttribute('color', new THREE.BufferAttribute(colors,3));
const mat = new THREE.PointsMaterial({ size:g.size, sizeAttenuation:true, vertexColors:true, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending });
const pts = new THREE.Points(geo,mat); pts.renderOrder = 2; return pts;
}