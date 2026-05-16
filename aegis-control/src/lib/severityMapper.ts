import * as THREE from 'three';

export function applySeverityColors(geom: THREE.BufferGeometry, defects: any[], viewMode: string) {
  const pos = geom.attributes.position;
  const count = pos.count;
  const colors = new Float32Array(count * 3);
  
  const cClean = new THREE.Color('#00ff88');
  const cMod = new THREE.Color('#ffcc00');
  const cCrit = new THREE.Color('#ff3333');
  const cGray = new THREE.Color('#aaaaaa');
  
  for (let i = 0; i < count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    const z = pos.getZ(i);
    
    let minD = Infinity;
    let closestDefect = null;
    
    for (const d of defects) {
      if (!d.position) continue;
      const dx = x - d.position[0];
      const dy = y - d.position[1];
      const dz = z - d.position[2];
      const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
      if (dist < 3 && dist < minD) { // Defect effect radius
        minD = dist;
        closestDefect = d;
      }
    }
    
    let col = cGray.clone();
    
    if (closestDefect) {
      if (closestDefect.severity === 'CRITICAL') col = cCrit.clone();
      else if (closestDefect.severity === 'MODERATE' || closestDefect.severity === 'WARNING') col = cMod.clone();
      else col = cClean.clone();
      
      if (viewMode === 'thermal') {
        const t = Math.max(0, 1 - (minD / 3));
        col = cClean.clone().lerp(col, t);
      }
    } else {
      col = viewMode === 'thermal' ? cClean.clone() : cGray.clone();
    }
    
    colors[i * 3] = col.r;
    colors[i * 3 + 1] = col.g;
    colors[i * 3 + 2] = col.b;
  }
  
  geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}
