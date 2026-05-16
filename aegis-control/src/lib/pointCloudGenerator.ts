import * as THREE from 'three';

export function generateStructureGeometry(type: string): THREE.BufferGeometry {
  let geom: THREE.BufferGeometry;
  
  if (type === 'Bridge') {
    // Flat rectangular surface ~100m x 20m, 50k points (scaled for demo)
    geom = new THREE.PlaneGeometry(12, 3, 500, 100);
    geom.rotateX(-Math.PI / 2); // Lay flat
  } else if (type === 'Tower') {
    // Vertical cylindrical lattice structure, ~40m tall
    geom = new THREE.CylinderGeometry(1.5, 1.5, 15, 100, 500);
    geom.translate(0, 7.5, 0); // Base at 0
  } else if (type === 'Dam') {
    // Curved wall face ~60m wide x 30m tall
    geom = new THREE.CylinderGeometry(15, 15, 10, 500, 100, 0, Math.PI / 4);
    geom.rotateY(Math.PI);
    geom.translate(0, 5, -10);
  } else {
    geom = new THREE.BoxGeometry(10, 10, 10, 10, 10, 10);
  }

  // Apply noise/undulation
  const pos = geom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    
    // Add realistic scan noise
    const noiseX = (Math.random() - 0.5) * 0.05;
    const noiseY = (Math.random() - 0.5) * 0.05;
    const noiseZ = (Math.random() - 0.5) * 0.05;
    
    pos.setXYZ(i, x + noiseX, y + noiseY, z + noiseZ);
  }
  
  geom.computeVertexNormals();
  return geom;
}
