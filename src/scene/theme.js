import * as THREE from 'three/webgpu';



export const THEME = {
bg: 0x070a12,
zNear: 0.1,
zFar: 300,


// Stars
starCount: 7000,
starSpread: 170,
bigStarCount: 900,
bigStarSize: 0.26,


// Galaxy clusters (tilted so discs read)
galaxyClusterLeft: {
clusterCount: 3,
arms: 5,
pointsPerArm: 700,
radius: 72,
twist: 2.1,
jitter: 0.65,
size: 0.12,
center: new THREE.Vector3(-110, 12, -260),
baseTilt: { x: 0.38, y: 0.08, z: 0.18 },
spin: 0.0014,
spread: { x: 22, y: 10, z: 18 },
},
galaxyClusterRight: {
clusterCount: 3,
arms: 5,
pointsPerArm: 680,
radius: 66,
twist: 2.0,
jitter: 0.6,
size: 0.115,
center: new THREE.Vector3(115, -16, -280),
baseTilt: { x: -0.3, y: -0.06, z: -0.22 },
spin: -0.0012,
spread: { x: 20, y: 12, z: 22 },
},


// Linked particles
links: {
beadSize: 0.13,
beadsPerLink: 22,
speed: 0.45,
color: new THREE.Color(0.62, 0.82, 1.0),
opacity: 0.7,
ringLinkCount: 6,
meteorLinkMax: 6,
curveArchHeight: 2.5,
},


// Meteors (steeper diagonal)
laneZMin: -1.0,
laneZMax: 1.0,
laneYTop: 9.3,
laneYBot: 2.1,
meteorSpeedMin: 18,
meteorSpeedMax: 30,
meteorLength: 2.4,
meteorThickness: 0.034,


smoke: {
perSecond: 10,
lifetime: 0.55,
sizeStart: 0.16,
sizeEnd: 0.48,
opacityStart: 0.16,
opacityEnd: 0.0,
poolSize: 320,
},
tipGlow: { size: 0.38, color: new THREE.Color(1.0, 0.78, 0.35), opacity: 0.55 },
burstInterval: 8.0,
burstCount: 10,
burstSpread: 0.9,
jitterEach: 0.16,
};