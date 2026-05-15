'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { gpsToXYZ } from '@/lib/gps';

interface Structure {
  id: string;
  name: string;
  type: string;
  lastInspected: string;
  healthScore: number;
  totalDefects: number;
}

interface Zone {
  zoneId: string;
  label: string;
  severity: string;
  lat: number;
  lon: number;
  alt: number;
  defectCount: number;
  defectTypes: string[];
  x?: number;
  y?: number;
  z?: number;
}

export default function Viewer() {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // ThreeJS refs
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const structureGroupRef = useRef<THREE.Group>(new THREE.Group());
  const zonesGroupRef = useRef<THREE.Group>(new THREE.Group());
  const raycasterRef = useRef<THREE.Raycaster>(new THREE.Raycaster());

  const [structures, setStructures] = useState<Structure[]>([]);
  const [selectedStructId, setSelectedStructId] = useState('');
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedZone, setSelectedZone] = useState<Zone | null>(null);
  const [isDemo, setIsDemo] = useState(false);
  const [isReconstructing, setIsReconstructing] = useState(false);

  // Animation refs
  const requestRef = useRef<number>();
  const clockRef = useRef<THREE.Clock>(new THREE.Clock());
  const criticalSpheresRef = useRef<THREE.Mesh[]>([]);

  useEffect(() => {
    fetch('/api/structures/list')
      .then(res => res.json())
      .then(data => {
        setStructures(data.structures);
        if (data.structures.length > 0) {
          setSelectedStructId(data.structures[0].id);
        }
      });
  }, []);

  useEffect(() => {
    if (!selectedStructId) return;
    fetch(`/api/defects/zones?targetId=${selectedStructId}`)
      .then(res => res.json())
      .then(data => setZones(data.zones));
  }, [selectedStructId]);

  // Init Three.js
  useEffect(() => {
    if (!mountRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0d1117');
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    camera.position.set(20, 20, 30);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.innerHTML = '';
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controlsRef.current = controls;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    const gridHelper = new THREE.GridHelper(100, 100, 0x30363d, 0x21262d);
    scene.add(gridHelper);

    scene.add(structureGroupRef.current);
    scene.add(zonesGroupRef.current);

    const animate = () => {
      requestRef.current = requestAnimationFrame(animate);
      controls.update();

      const t = clockRef.current.getElapsedTime();
      const pulse = 1.0 + Math.abs(Math.sin(t * Math.PI)) * 0.4; // 1.0 to 1.4 loop
      criticalSpheresRef.current.forEach(mesh => {
        mesh.scale.set(pulse, pulse, pulse);
      });

      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!mountRef.current || !camera || !renderer) return;
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    const onClick = (event: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouse, camera);
      const intersects = raycasterRef.current.intersectObjects(zonesGroupRef.current.children);
      if (intersects.length > 0) {
        const obj = intersects[0].object;
        setSelectedZone(obj.userData.zone as Zone);
      } else {
        setSelectedZone(null);
      }
    };
    renderer.domElement.addEventListener('click', onClick);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      window.removeEventListener('resize', handleResize);
      renderer.domElement.removeEventListener('click', onClick);
      renderer.dispose();
    };
  }, []);

  // Update Structure & Zones
  useEffect(() => {
    if (!sceneRef.current) return;
    
    // Clear old
    structureGroupRef.current.clear();
    zonesGroupRef.current.clear();
    criticalSpheresRef.current = [];
    setSelectedZone(null);

    const struct = structures.find(s => s.id === selectedStructId) || { type: isDemo ? 'pylon' : 'bridge' };
    
    // Procedural placeholder materials
    const mat = new THREE.MeshLambertMaterial({ color: 0xcccccc });

    // Build structure geometry
    if (struct.type === 'bridge') {
      const deck = new THREE.Mesh(new THREE.BoxGeometry(40, 3, 10), mat);
      deck.position.y = 8;
      structureGroupRef.current.add(deck);
      [-15, 15].forEach(x => {
        const p1 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 8), mat);
        p1.position.set(x, 4, 3);
        const p2 = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 8), mat);
        p2.position.set(x, 4, -3);
        structureGroupRef.current.add(p1, p2);
      });
    } else if (struct.type === 'building') {
      const bldg = new THREE.Mesh(new THREE.BoxGeometry(15, 30, 15), mat);
      bldg.position.y = 15;
      structureGroupRef.current.add(bldg);
    } else if (struct.type === 'pylon') {
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 20), mat);
      pylon.position.y = 10;
      structureGroupRef.current.add(pylon);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 0.5), mat);
      arm.position.y = 18;
      structureGroupRef.current.add(arm);
    }

    // Origin for relative placement (use first zone as approx origin)
    const oLat = zones.length > 0 ? zones[0].lat : 0;
    const oLon = zones.length > 0 ? zones[0].lon : 0;
    const oAlt = zones.length > 0 ? zones[0].alt - 10 : 0; // offset so some are up

    // Plot zones
    const getColor = (sev: string) => {
      if (sev === 'CRITICAL') return 0xef4444;
      if (sev === 'HIGH') return 0xf97316;
      if (sev === 'MEDIUM') return 0xeab308;
      return 0x22c55e;
    };

    zones.forEach((z, i) => {
      const { x, y, z: zPos } = gpsToXYZ(z.lat, z.lon, z.alt, oLat, oLon, oAlt);
      
      // Add slightly jittered offset if all are at 0 (demo/mock)
      const finalX = isDemo || x === 0 ? (Math.random() - 0.5) * 10 : x;
      const finalY = isDemo || y === 0 ? Math.random() * 20 : y;
      const finalZ = isDemo || zPos === 0 ? (Math.random() - 0.5) * 10 : zPos;

      z.x = finalX; z.y = finalY; z.z = finalZ;

      const sphere = new THREE.Mesh(
        new THREE.SphereGeometry(1, 16, 16),
        new THREE.MeshBasicMaterial({ color: getColor(z.severity) })
      );
      sphere.position.set(finalX, finalY, finalZ);
      sphere.userData = { zone: z };
      zonesGroupRef.current.add(sphere);

      if (z.severity === 'CRITICAL') {
        criticalSpheresRef.current.push(sphere);
      }
    });

  }, [selectedStructId, zones, structures, isDemo]);

  const flyToZone = (z: Zone) => {
    setSelectedZone(z);
    if (!cameraRef.current || !controlsRef.current || z.x === undefined) return;
    
    const targetPos = new THREE.Vector3(z.x + 5, (z.y||0) + 5, (z.z||0) + 5);
    const lookAtPos = new THREE.Vector3(z.x, z.y, z.z);
    
    // Simple instant jump for now (in real app, use lerp in animation loop)
    cameraRef.current.position.copy(targetPos);
    controlsRef.current.target.copy(lookAtPos);
  };

  const handleDemo = () => {
    setIsDemo(true);
    setStructures([{ id: 'demo', name: 'Demo Pylon X-4', type: 'pylon', lastInspected: new Date().toISOString().split('T')[0], healthScore: 45, totalDefects: 15 }]);
    setSelectedStructId('demo');
    setZones([
      { zoneId: 'd1', label: 'Lower Brace', severity: 'CRITICAL', lat: 0, lon: 0, alt: 5, defectCount: 5, defectTypes: ['crack'] },
      { zoneId: 'd2', label: 'Mid Brace', severity: 'HIGH', lat: 0, lon: 0, alt: 10, defectCount: 3, defectTypes: ['corrosion'] },
      { zoneId: 'd3', label: 'Upper Brace', severity: 'MEDIUM', lat: 0, lon: 0, alt: 15, defectCount: 1, defectTypes: ['spalling'] },
      { zoneId: 'd4', label: 'Top Arm Left', severity: 'CLEAN', lat: 0, lon: 0, alt: 20, defectCount: 0, defectTypes: [] },
      { zoneId: 'd5', label: 'Top Arm Right', severity: 'CRITICAL', lat: 0, lon: 0, alt: 20, defectCount: 6, defectTypes: ['delamination'] },
    ]);
  };

  const activeStruct = structures.find(s => s.id === selectedStructId);

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 96px)', margin: '-1.5rem', backgroundColor: '#0d1117', color: '#c9d1d9', fontFamily: 'system-ui' }}>
      
      {/* 3D CANVAS */}
      <div style={{ flex: '1', position: 'relative' }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

        {isDemo && (
          <div style={{ position: 'absolute', top: '1rem', right: '1rem', backgroundColor: '#ef4444', color: 'white', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 'bold', fontSize: '0.875rem' }}>
            DEMO MODE
          </div>
        )}

        <div style={{ position: 'absolute', top: '1rem', left: '1rem', backgroundColor: 'rgba(13, 17, 23, 0.8)', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #30363d', backdropFilter: 'blur(4px)' }}>
          <div style={{ fontSize: '0.875rem', color: '#8b949e', marginBottom: '0.25rem' }}>Notice</div>
          <div style={{ fontSize: '0.875rem' }}>No high-res 3D model found — rendering procedural placeholder geometry.</div>
        </div>

        {/* Legend */}
        <div style={{ position: 'absolute', bottom: '1rem', right: '1rem', backgroundColor: 'rgba(13, 17, 23, 0.8)', padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #30363d', backdropFilter: 'blur(4px)' }}>
           <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.875rem', color: '#8b949e' }}>Zone Legend</h4>
           <div style={{ display: 'flex', gap: '1rem' }}>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#ef4444' }}></div> Critical</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#f97316' }}></div> High</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#eab308' }}></div> Medium</div>
             <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}><div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: '#22c55e' }}></div> Clean</div>
           </div>
        </div>

        {/* Popup Overlay */}
        {selectedZone && (
          <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#161b22', border: '1px solid #30363d', padding: '1.5rem', borderRadius: '0.5rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', zIndex: 10, width: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0 }}>{selectedZone.label}</h3>
              <button onClick={() => setSelectedZone(null)} style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '1rem' }}>&times;</button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: '#8b949e' }}>Severity</span>
              <span style={{ fontWeight: 'bold', color: selectedZone.severity === 'CRITICAL' ? '#ef4444' : selectedZone.severity === 'HIGH' ? '#f97316' : selectedZone.severity === 'MEDIUM' ? '#eab308' : '#22c55e' }}>{selectedZone.severity}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.875rem' }}>
              <span style={{ color: '#8b949e' }}>Defects</span>
              <span>{selectedZone.defectCount}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', fontSize: '0.875rem' }}>
              <span style={{ color: '#8b949e' }}>Types</span>
              <span>{selectedZone.defectTypes.join(', ') || 'None'}</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
               <div style={{ flex: 1, height: '60px', backgroundColor: '#0d1117', border: '1px dashed #30363d', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#8b949e' }}>IMG_01.jpg</div>
               <div style={{ flex: 1, height: '60px', backgroundColor: '#0d1117', border: '1px dashed #30363d', borderRadius: '0.25rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: '#8b949e' }}>IMG_02.jpg</div>
            </div>
          </div>
        )}
      </div>

      {/* RIGHT PANEL */}
      <div style={{ width: '300px', backgroundColor: '#161b22', borderLeft: '1px solid #30363d', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1.5rem', borderBottom: '1px solid #30363d' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#8b949e', marginBottom: '0.5rem', textTransform: 'uppercase' }}>Inspect Structure</label>
          <select 
            value={selectedStructId} 
            onChange={e => setSelectedStructId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', backgroundColor: '#0d1117', color: '#c9d1d9', border: '1px solid #30363d', borderRadius: '0.25rem', marginBottom: '1rem' }}
          >
            {structures.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>

          {activeStruct && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
               <div style={{ backgroundColor: '#0d1117', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #30363d' }}>
                 <div style={{ fontSize: '0.65rem', color: '#8b949e', textTransform: 'uppercase' }}>Health Score</div>
                 <div style={{ fontSize: '1.25rem', fontWeight: 'bold', color: activeStruct.healthScore > 80 ? '#22c55e' : activeStruct.healthScore > 50 ? '#eab308' : '#ef4444' }}>{activeStruct.healthScore}%</div>
               </div>
               <div style={{ backgroundColor: '#0d1117', padding: '0.75rem', borderRadius: '0.5rem', border: '1px solid #30363d' }}>
                 <div style={{ fontSize: '0.65rem', color: '#8b949e', textTransform: 'uppercase' }}>Total Defects</div>
                 <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{activeStruct.totalDefects}</div>
               </div>
            </div>
          )}
        </div>

        <div style={{ padding: '1.5rem', flex: 1, overflowY: 'auto' }}>
          <h4 style={{ margin: '0 0 1rem 0', fontSize: '0.875rem', color: '#8b949e', textTransform: 'uppercase' }}>Identified Zones</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {zones.map(z => (
              <div 
                key={z.zoneId} 
                onClick={() => flyToZone(z)}
                style={{ padding: '0.75rem', backgroundColor: selectedZone?.zoneId === z.zoneId ? '#30363d' : '#0d1117', border: '1px solid #30363d', borderRadius: '0.5rem', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div>
                  <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{z.label}</div>
                  <div style={{ fontSize: '0.75rem', color: '#8b949e' }}>{z.defectCount} defects</div>
                </div>
                <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: z.severity === 'CRITICAL' ? '#ef4444' : z.severity === 'HIGH' ? '#f97316' : z.severity === 'MEDIUM' ? '#eab308' : '#22c55e' }} />
              </div>
            ))}
          </div>
        </div>

        <div style={{ padding: '1.5rem', borderTop: '1px solid #30363d', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button 
            onClick={() => {
              setIsReconstructing(true);
              setTimeout(() => setIsReconstructing(false), 3000);
            }}
            disabled={isReconstructing}
            style={{ width: '100%', padding: '0.5rem', backgroundColor: '#238636', color: 'white', border: 'none', borderRadius: '0.25rem', cursor: isReconstructing ? 'wait' : 'pointer', fontWeight: 'bold' }}
          >
            {isReconstructing ? 'Reconstructing...' : 'Reconstruct from Flight'}
          </button>
          <button 
            onClick={handleDemo}
            style={{ width: '100%', padding: '0.5rem', backgroundColor: 'transparent', color: '#58a6ff', border: '1px solid #30363d', borderRadius: '0.25rem', cursor: 'pointer', fontSize: '0.875rem' }}
          >
            Load Demo Structure
          </button>
        </div>
      </div>
    </div>
  );
}
