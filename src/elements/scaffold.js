import * as THREE from 'three/webgpu';

export function createScaffold(position=[0,0,0], screenSize=[4.15,3.15]){
  const group = new THREE.Group();
  group.position.set(...position);
  const width = screenSize[0] + 2.4;
  const height = screenSize[1] * 1.3;
  const depth = 0.4;
  const barThickness = 0.05;
  const segmentCount = 6;
  const segmentHeight = height / segmentCount;
  const mat = new THREE.MeshStandardMaterial({ color: 0x8e99a8, roughness: 0.7, metalness: 0.2 });

  [-width/2, width/2].forEach((x)=>[0,depth].forEach((z)=>{
    const bar = new THREE.Mesh(new THREE.BoxGeometry(barThickness, height, barThickness), mat);
    bar.position.set(x, height/2, z); group.add(bar);
  }));

  for (let i=0;i<=segmentCount;i++){
    const y = i*segmentHeight; [0,depth].forEach((z)=>{
      const bar = new THREE.Mesh(new THREE.BoxGeometry(width, barThickness, barThickness), mat);
      bar.position.set(0,y,z); group.add(bar);
    });
  }
  return group;
}
