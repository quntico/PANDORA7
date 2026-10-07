import React, { useState, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import * as THREE from 'three';

export default function GLBModelObject({
  glbUrl,
  audioLevel = 0,
  config = {}
}) {
  const [modelWrapper, setModelWrapper] = useState(null);
  const [error, setError] = useState(null);
  const groupRef = useRef(null);
  const explodeFactor = useRef(0.0);
  const floatOffset = useRef(Math.random() * 100);

  // Load the GLB file
  useEffect(() => {
    if (!glbUrl) return;

    const loader = new GLTFLoader();
    loader.load(
      glbUrl,
      (gltf) => {
        const scene = gltf.scene;
        
        // Compute precise bounding box from all mesh geometries in world coordinates
        const box = new THREE.Box3();
        let hasGeometry = false;
        
        scene.updateMatrixWorld(true);
        scene.traverse((child) => {
          if (child.isMesh) {
            child.userData.originalPosition = child.position.clone();
            
            // Calculate geometry bounding box in world space
            if (child.geometry) {
              child.geometry.computeBoundingBox();
              const childBox = child.geometry.boundingBox.clone();
              childBox.applyMatrix4(child.matrixWorld);
              box.union(childBox);
              hasGeometry = true;
            }
          }
        });

        const center = new THREE.Vector3();
        const size = new THREE.Vector3();
        if (hasGeometry) {
          box.getCenter(center);
          box.getSize(size);
        } else {
          center.set(0, 0, 0);
          size.set(1, 1, 1);
        }

        // Shift model so its center is exactly at (0, 0, 0)
        scene.position.set(-center.x, -center.y, -center.z);

        // Wrapper to handle centering and normalized scaling
        const wrapper = new THREE.Group();
        wrapper.add(scene);

        // Normalize model size to fit nicely in visor
        const maxDim = Math.max(size.x, size.y, size.z);
        const scaleVal = maxDim > 0 ? (1.5 / maxDim) : 1.0;
        wrapper.scale.setScalar(scaleVal);

        setModelWrapper(wrapper);
        setError(null);
      },
      undefined,
      (err) => {
        console.error("Error loading GLB: ", err);
        setError("Failed to parse GLB 3D model.");
      }
    );
  }, [glbUrl]);

  // Handle color mode and material properties dynamically
  useEffect(() => {
    if (!modelWrapper) return;

    // Define color based on config colorMode
    let colorHex = '#8B5CFF';
    switch (config.colorMode) {
      case 'BLUEPRINT': colorHex = '#00B8FF'; break;
      case 'GHOST': colorHex = '#E0F5FF'; break;
      case 'WIREFRAME_POINTS': colorHex = '#00FF58'; break;
      default: colorHex = '#8B5CFF';
    }
    const color = new THREE.Color(colorHex);

    modelWrapper.traverse((child) => {
      if (child.isMesh) {
        if (config.colorMode === 'WIREFRAME_POINTS') {
          // Point Cloud Mode: Hide original mesh and render Points representation
          child.visible = false;
          
          if (!child.userData.pointsHelper) {
            const pointsMat = new THREE.PointsMaterial({
              size: config.pointSize || 0.010,
              color: color,
              transparent: true,
              opacity: config.opacity || 0.9,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              sizeAttenuation: true
            });
            const points = new THREE.Points(child.geometry, pointsMat);
            child.userData.pointsHelper = points;
            child.add(points);
          } else {
            child.userData.pointsHelper.material.color = color;
            child.userData.pointsHelper.material.size = config.pointSize || 0.010;
            child.userData.pointsHelper.material.opacity = config.opacity || 0.9;
            child.userData.pointsHelper.visible = true;
          }
        } else {
          // Solid / Wireframe mode: Show mesh, hide Points helper
          child.visible = true;
          if (child.userData.pointsHelper) {
            child.userData.pointsHelper.visible = false;
          }

          if (config.colorMode === 'ORIGINAL' && child.material) {
            child.material.transparent = true;
            child.material.opacity = config.opacity || 0.8;
            child.material.depthWrite = false;
            child.material.blending = THREE.AdditiveBlending;
          } else {
            child.material = new THREE.MeshBasicMaterial({
              color: color,
              wireframe: config.colorMode === 'BLUEPRINT',
              transparent: true,
              opacity: config.colorMode === 'GHOST' ? (config.opacity * 0.35) : config.opacity,
              depthWrite: false,
              blending: THREE.AdditiveBlending,
              side: THREE.DoubleSide
            });
          }
        }
      }
    });
  }, [modelWrapper, config.colorMode, config.opacity, config.pointSize]);

  // Reset rotation when axis changes
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.rotation.set(0, 0, 0);
    }
  }, [config.rotationAxis]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (!groupRef.current || !modelWrapper) return;

    // Explode factor interpolation
    const targetExplode = config.exploded ? 1.0 : 0.0;
    explodeFactor.current += (targetExplode - explodeFactor.current) * 0.08;

    // Displace individual meshes for explosion animation
    modelWrapper.traverse((child) => {
      if (child.isMesh && child.userData.originalPosition) {
        const orig = child.userData.originalPosition;
        const dir = orig.clone().normalize();
        if (dir.lengthSq() === 0) dir.set(0, 1, 0);
        child.position.copy(orig.clone().add(dir.multiplyScalar(explodeFactor.current * 0.4)));
      }
    });

    // Rotation based on direction and axis
    if (config.rotationDirection !== 'STATIC' && config.rotationSpeed > 0) {
      const dirMultiplier = config.rotationDirection === 'RIGHT_TO_LEFT' ? -1 : 1;
      const speed = dirMultiplier * config.rotationSpeed * 0.01;

      if (config.rotationAxis === 'X') {
        groupRef.current.rotation.x += speed;
      } else if (config.rotationAxis === 'Z') {
        groupRef.current.rotation.z += speed;
      } else if (config.rotationAxis === 'DIAGONAL') {
        groupRef.current.rotation.x += speed * 0.5;
        groupRef.current.rotation.y += speed;
        groupRef.current.rotation.z += speed * 0.2;
      } else {
        // Y Axis
        groupRef.current.rotation.y += speed;
      }
    }

    // Audio reactive micro-shake
    if (audioLevel > 0) {
      groupRef.current.position.x = (Math.random() - 0.5) * audioLevel * 0.02;
      groupRef.current.position.z = (Math.random() - 0.5) * audioLevel * 0.02;
    } else {
      groupRef.current.position.x = 0;
      groupRef.current.position.z = 0;
    }

    // Floating animation
    const floatY = Math.sin(time * 1.5 + floatOffset.current) * 0.03;
    groupRef.current.position.y = floatY;

    // Apply scaling
    const targetScale = config.scale || 2.5;
    groupRef.current.scale.setScalar(targetScale);
  });

  if (error) {
    return (
      <group>
        <mesh>
          <boxGeometry args={[0.5, 0.5, 0.5]} />
          <meshBasicMaterial color="#FF38D5" wireframe />
        </mesh>
      </group>
    );
  }

  if (!modelWrapper) return null;

  return (
    <group ref={groupRef}>
      <primitive object={modelWrapper} />
    </group>
  );
}
