'use client';

import React, { useRef, useState, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Wireframe, Html, ContactShadows, Environment, Float, Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';

// Procedural Bridge Model
function ProceduralBridge({ mode, onSelectDefect, activeDefectId, defects }: any) {
  // A simple stylized bridge: Two pylons, one deck.
  const isThermal = mode === 'thermal';
  const isWireframe = mode === 'wireframe' || mode === 'mesh';
  const isPointCloud = mode === 'pointcloud';

  const deckColor = isThermal ? '#F59E0B' : '#1F2937';
  const pylon1Color = isThermal ? '#EF4444' : '#374151'; // Red = critical
  const pylon2Color = isThermal ? '#22C55E' : '#374151'; // Green = clean

  const handleClick = (e: any, defectId: string) => {
    e.stopPropagation();
    onSelectDefect(defectId);
  };

  if (isPointCloud) {
    // Generate a random point cloud representing the bridge
    const pts = useMemo(() => {
      const positions = new Float32Array(50000 * 3);
      for (let i = 0; i < 50000; i++) {
        // Deck
        if (i < 20000) {
          positions[i*3] = (Math.random() - 0.5) * 12;
          positions[i*3+1] = 0 + (Math.random() - 0.5) * 0.5;
          positions[i*3+2] = (Math.random() - 0.5) * 3;
        } else if (i < 35000) {
          // Pylon 1
          positions[i*3] = -4 + (Math.random() - 0.5) * 1.5;
          positions[i*3+1] = -3 + (Math.random() - 0.5) * 6;
          positions[i*3+2] = (Math.random() - 0.5) * 1.5;
        } else {
          // Pylon 2
          positions[i*3] = 4 + (Math.random() - 0.5) * 1.5;
          positions[i*3+1] = -3 + (Math.random() - 0.5) * 6;
          positions[i*3+2] = (Math.random() - 0.5) * 1.5;
        }
      }
      return positions;
    }, []);

    return (
      <Points positions={pts} stride={3}>
        <PointMaterial transparent color="#3B82F6" size={0.02} sizeAttenuation={true} depthWrite={false} />
      </Points>
    );
  }

  return (
    <group>
      {/* Deck */}
      <mesh position={[0, 0, 0]} onClick={(e) => handleClick(e, 'd3')}>
        <boxGeometry args={[12, 0.5, 3]} />
        <meshStandardMaterial color={deckColor} wireframe={isWireframe} transparent opacity={isWireframe ? 0.3 : 1} />
        {mode === 'mesh' && <Wireframe stroke="#3B82F6" fillOpacity={0} thickness={0.02} />}
      </mesh>
      
      {/* Pylon 1 (Critical) */}
      <mesh position={[-4, -3, 0]} onClick={(e) => handleClick(e, 'd1')}>
        <boxGeometry args={[1.5, 6, 1.5]} />
        <meshStandardMaterial color={pylon1Color} wireframe={isWireframe} transparent opacity={isWireframe ? 0.3 : 1} />
        {mode === 'mesh' && <Wireframe stroke="#EF4444" fillOpacity={0} thickness={0.02} />}
      </mesh>

      {/* Pylon 2 (Clean) */}
      <mesh position={[4, -3, 0]} onClick={(e) => handleClick(e, 'd2')}>
        <boxGeometry args={[1.5, 6, 1.5]} />
        <meshStandardMaterial color={pylon2Color} wireframe={isWireframe} transparent opacity={isWireframe ? 0.3 : 1} />
        {mode === 'mesh' && <Wireframe stroke="#22C55E" fillOpacity={0} thickness={0.02} />}
      </mesh>

      {/* Defect Markers (Only show if not pointcloud) */}
      {!isPointCloud && defects.map((d: any) => {
        const isActive = activeDefectId === d.id;
        const color = d.severity === 'CRITICAL' ? '#EF4444' : d.severity === 'WARNING' ? '#F59E0B' : '#3B82F6';
        
        return (
          <group key={d.id} position={d.position as any}>
            <mesh onClick={(e) => handleClick(e, d.id)}>
              <sphereGeometry args={[isActive ? 0.4 : 0.2, 16, 16]} />
              <meshBasicMaterial color={color} />
            </mesh>
            {/* Pulsing ring for active */}
            {isActive && (
              <mesh>
                <ringGeometry args={[0.5, 0.6, 32]} />
                <meshBasicMaterial color={color} transparent opacity={0.5} side={THREE.DoubleSide} />
              </mesh>
            )}
            {/* HTML Tooltip */}
            {isActive && (
              <Html distanceFactor={10} position={[0, 0.6, 0]} center>
                <div className="stride-card glass" style={{ padding: '8px 12px', whiteSpace: 'nowrap', border: `1px solid ${color}` }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color }}>{d.type}</div>
                  <div style={{ fontSize: 11, color: 'white' }}>{d.zone}</div>
                </div>
              </Html>
            )}
          </group>
        );
      })}
    </group>
  );
}

export default function Viewer({ mode, onSelectDefect, activeDefectId, modelData }: any) {
  return (
    <Canvas camera={{ position: [8, 5, 10], fov: 45 }}>
      <color attach="background" args={['#070B14']} />
      
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
      <pointLight position={[-10, -10, -5]} intensity={0.5} color="#3B82F6" />
      
      <Float speed={1} rotationIntensity={0.2} floatIntensity={0.2}>
        <ProceduralBridge 
          mode={mode} 
          onSelectDefect={onSelectDefect} 
          activeDefectId={activeDefectId}
          defects={modelData?.defects || []}
        />
      </Float>

      <ContactShadows position={[0, -6, 0]} opacity={0.4} scale={20} blur={2} far={10} />
      
      <OrbitControls 
        makeDefault 
        autoRotate={false} 
        enablePan={true} 
        enableZoom={true} 
        maxPolarAngle={Math.PI / 2}
      />
      
      <Environment preset="city" />
      
      {/* Grid Floor */}
      <gridHelper args={[30, 30, '#1F2937', '#111827']} position={[0, -6.01, 0]} />
    </Canvas>
  );
}
