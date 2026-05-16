'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { generateStructureGeometry } from '@/lib/pointCloudGenerator';
import { applySeverityColors } from '@/lib/severityMapper';

export default function ThreeDAnalysis({ modelData, viewMode, onSelectDefect, activeDefectId }: any) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !modelData) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#070B14');

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(8, 5, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // Clear previous canvas if any
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    // Generate Geometry
    const geometry = generateStructureGeometry(modelData.type);
    applySeverityColors(geometry, modelData.defects || [], viewMode);

    let mainObject: THREE.Object3D = new THREE.Group();

    if (viewMode === 'pointcloud') {
      const material = new THREE.PointsMaterial({ size: 0.05, vertexColors: true });
      const points = new THREE.Points(geometry, material);
      mainObject.add(points);
    } else {
      const material = new THREE.MeshLambertMaterial({ 
        vertexColors: true, 
        wireframe: viewMode === 'wireframe',
        transparent: viewMode === 'wireframe',
        opacity: viewMode === 'wireframe' ? 0.3 : 1
      });
      const mesh = new THREE.Mesh(geometry, material);
      mainObject.add(mesh);
      
      if (viewMode === 'mesh') {
        const wireMat = new THREE.MeshBasicMaterial({ color: 0x3b82f6, wireframe: true, transparent: true, opacity: 0.1 });
        const wireMesh = new THREE.Mesh(geometry, wireMat);
        mainObject.add(wireMesh);
      }
    }

    scene.add(mainObject);

    // Add Defect Markers
    const defectMarkers: { mesh: THREE.Mesh, id: string }[] = [];
    if (viewMode !== 'pointcloud') {
      modelData.defects?.forEach((d: any) => {
        const isActive = activeDefectId === d.id;
        const color = d.severity === 'CRITICAL' ? 0xef4444 : d.severity === 'WARNING' || d.severity === 'MODERATE' ? 0xf59e0b : 0x3b82f6;
        
        const sphereGeo = new THREE.SphereGeometry(isActive ? 0.4 : 0.2, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({ color });
        const marker = new THREE.Mesh(sphereGeo, sphereMat);
        marker.position.set(d.position[0], d.position[1], d.position[2]);
        marker.userData = { id: d.id };
        
        scene.add(marker);
        defectMarkers.push({ mesh: marker, id: d.id });

        if (isActive) {
          const ringGeo = new THREE.RingGeometry(0.5, 0.6, 32);
          const ringMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.5, side: THREE.DoubleSide });
          const ring = new THREE.Mesh(ringGeo, ringMat);
          ring.position.copy(marker.position);
          ring.lookAt(camera.position);
          scene.add(ring);
        }
      });
    }

    // --- Manual Orbit Controller ---
    let isDragging = false;
    let dragMode = 0; // 0: rotate (left click), 1: pan (right click)
    let previousMousePosition = { x: 0, y: 0 };
    const target = new THREE.Vector3(0, 0, 0);

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      dragMode = e.button === 2 ? 1 : 0;
      previousMousePosition = { x: e.clientX, y: e.clientY };
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaX = e.clientX - previousMousePosition.x;
      const deltaY = e.clientY - previousMousePosition.y;
      previousMousePosition = { x: e.clientX, y: e.clientY };

      if (dragMode === 0) {
        // Rotate (Quaternion based)
        const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -deltaX * 0.01);
        const right = new THREE.Vector3().crossVectors(camera.up, camera.position.clone().sub(target)).normalize();
        const qy = new THREE.Quaternion().setFromAxisAngle(right, -deltaY * 0.01);
        
        const offset = camera.position.clone().sub(target);
        offset.applyQuaternion(qx);
        offset.applyQuaternion(qy);
        
        camera.position.copy(target).add(offset);
        camera.lookAt(target);
      } else {
        // Pan
        const right = new THREE.Vector3().crossVectors(camera.up, camera.position.clone().sub(target)).normalize();
        const up = new THREE.Vector3().crossVectors(camera.position.clone().sub(target), right).normalize();
        target.add(right.multiplyScalar(-deltaX * 0.05));
        target.add(up.multiplyScalar(deltaY * 0.05));
        
        const offset = camera.position.clone().sub(target);
        target.add(right.multiplyScalar(deltaX * 0.05));
        target.add(up.multiplyScalar(-deltaY * 0.05));
        
        camera.position.add(right.multiplyScalar(-deltaX * 0.05));
        camera.position.add(up.multiplyScalar(deltaY * 0.05));
      }
    };

    const onMouseUp = () => { isDragging = false; };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const zoomSpeed = 0.05;
      const direction = camera.position.clone().sub(target).normalize();
      const distance = camera.position.distanceTo(target);
      
      let newDist = distance + (e.deltaY * zoomSpeed);
      newDist = Math.max(1, newDist);
      
      camera.position.copy(target).add(direction.multiplyScalar(newDist));
    };

    // Raycaster for defect selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(defectMarkers.map(d => d.mesh));
      
      if (intersects.length > 0) {
        const clickedId = intersects[0].object.userData.id;
        onSelectDefect(clickedId);
      }
    };

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });
    dom.addEventListener('contextmenu', e => e.preventDefault());
    dom.addEventListener('click', onClick);

    // Animation Loop
    let reqId: number;
    const animate = () => {
      reqId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    // Resize handler
    const handleResize = () => {
      if (!containerRef.current) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      dom.removeEventListener('click', onClick);
      cancelAnimationFrame(reqId);
      geometry.dispose();
      renderer.dispose();
    };
  }, [modelData, viewMode, activeDefectId, onSelectDefect]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%', outline: 'none' }} />;
}
