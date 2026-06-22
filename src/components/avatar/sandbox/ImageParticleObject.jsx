import React, { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export default function ImageParticleObject({
  particlesData,
  audioLevel = 0,
  config = {}
}) {
  const pointsRef = useRef(null);
  const shaderMaterialRef = useRef(null);

  const explodeFactor = useRef(0.0);
  const scaleVal = useRef(config.scale || 2.5);
  const floatOffset = useRef(Math.random() * 100);

  // Shader Uniforms
  const uniforms = useMemo(() => ({
    uExplode: { value: 0.0 },
    uAudioLevel: { value: 0.0 },
    uColorMode: { value: 0 },
    uPointSize: { value: 0.010 },
    uOpacity: { value: 0.95 },
    uTime: { value: 0.0 }
  }), []);

  useEffect(() => {
    if (shaderMaterialRef.current) {
      // Map color mode string to integer
      let modeInt = 0;
      switch (config.colorMode) {
        case 'ORIGINAL': modeInt = 0; break;
        case 'PANDORA': modeInt = 1; break;
        case 'BLUEPRINT': modeInt = 2; break;
        case 'GHOST': modeInt = 3; break;
        case 'THERMAL': modeInt = 4; break;
        case 'WIREFRAME_POINTS': modeInt = 5; break;
        default: modeInt = 0;
      }
      shaderMaterialRef.current.uniforms.uColorMode.value = modeInt;
      shaderMaterialRef.current.uniforms.uPointSize.value = config.pointSize || 0.010;
      shaderMaterialRef.current.uniforms.uOpacity.value = config.opacity || 0.95;
    }
  }, [config.colorMode, config.pointSize, config.opacity]);

  // Reset rotation when axis changes
  useEffect(() => {
    if (pointsRef.current) {
      pointsRef.current.rotation.set(0, 0, 0);
    }
  }, [config.rotationAxis]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    if (!pointsRef.current || !shaderMaterialRef.current) return;

    // Explode / Reconstruct interpolation
    const targetExplode = config.exploded ? 1.0 : 0.0;
    explodeFactor.current += (targetExplode - explodeFactor.current) * 0.08;
    shaderMaterialRef.current.uniforms.uExplode.value = explodeFactor.current;

    // Audio Reactivity
    shaderMaterialRef.current.uniforms.uAudioLevel.value = audioLevel;
    shaderMaterialRef.current.uniforms.uTime.value = time;

    // Floating animation
    const floatY = Math.sin(time * 1.5 + floatOffset.current) * 0.03;
    pointsRef.current.position.y = floatY;

    // Rotation based on direction and axis
    if (config.rotationDirection !== 'STATIC' && config.rotationSpeed > 0) {
      const dirMultiplier = config.rotationDirection === 'RIGHT_TO_LEFT' ? -1 : 1;
      const speed = dirMultiplier * config.rotationSpeed * 0.01;
      
      if (config.rotationAxis === 'X') {
        pointsRef.current.rotation.x += speed;
      } else if (config.rotationAxis === 'Z') {
        pointsRef.current.rotation.z += speed;
      } else if (config.rotationAxis === 'DIAGONAL') {
        pointsRef.current.rotation.x += speed * 0.5;
        pointsRef.current.rotation.y += speed;
        pointsRef.current.rotation.z += speed * 0.2;
      } else {
        // Y Axis
        pointsRef.current.rotation.y += speed;
      }
    }

    // Interpolate scale
    const targetScale = config.scale || 2.5;
    scaleVal.current += (targetScale - scaleVal.current) * 0.1;
    pointsRef.current.scale.setScalar(scaleVal.current);
  });

  // Re-generate geometry attributes when data changes
  const geometry = useMemo(() => {
    if (!particlesData) return null;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(particlesData.positions, 3));
    geom.setAttribute('aOriginalColor', new THREE.BufferAttribute(particlesData.originalColors, 3));
    return geom;
  }, [particlesData]);

  if (!geometry) return null;

  return (
    <points ref={pointsRef}>
      <primitive object={geometry} attach="geometry" />
      <shaderMaterial
        ref={shaderMaterialRef}
        vertexShader={`
          uniform float uExplode;
          uniform float uAudioLevel;
          uniform int uColorMode;
          uniform float uPointSize;
          uniform float uTime;
          
          attribute vec3 aOriginalColor;
          
          varying vec3 vColor;
          varying float vDepth;
          
          float rand(vec2 co){
            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
          }
          
          void main() {
            vec3 pos = position;
            
            // Audio level micro-vibration
            if (uAudioLevel > 0.0) {
              float rx = rand(pos.xy + uTime) - 0.5;
              float ry = rand(pos.yz + uTime + 1.0) - 0.5;
              float rz = rand(pos.zx + uTime + 2.0) - 0.5;
              pos += vec3(rx, ry, rz) * uAudioLevel * 0.06;
            }
            
            // Explosion dispersion
            if (uExplode > 0.0) {
              vec3 dir = normalize(pos + vec3(0.0, 0.0, 0.1));
              pos += dir * uExplode * 0.75;
            }
            
            vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = uPointSize * (300.0 / -mvPosition.z);
            
            vDepth = pos.z;
            
            // Color modes
            if (uColorMode == 0) {
              vColor = aOriginalColor;
            } else if (uColorMode == 1) {
              // PANDORA Cyan/Magenta
              float t = smoothstep(-0.3, 0.3, pos.x);
              vec3 colMagenta = vec3(1.0, 0.22, 0.835); // #FF38D5
              vec3 colPurple = vec3(0.545, 0.36, 1.0);  // #8B5CFF
              vec3 colCyan = vec3(0.0, 0.72, 1.0);      // #00B8FF
              
              if (t < 0.5) {
                vColor = mix(colMagenta, colPurple, t * 2.0);
              } else {
                vColor = mix(colPurple, colCyan, (t - 0.5) * 2.0);
              }
            } else if (uColorMode == 2) {
              // BLUEPRINT
              vColor = vec3(0.0, 0.72, 1.0);
            } else if (uColorMode == 3) {
              // GHOST
              vColor = vec3(0.8, 0.92, 1.0);
            } else if (uColorMode == 4) {
              // THERMAL
              float d = clamp((pos.z + 0.15) / 0.35, 0.0, 1.0);
              vec3 blue = vec3(0.0, 0.0, 0.8);
              vec3 yellow = vec3(1.0, 1.0, 0.0);
              vec3 red = vec3(1.0, 0.0, 0.0);
              if (d < 0.5) {
                vColor = mix(blue, yellow, d * 2.0);
              } else {
                vColor = mix(yellow, red, (d - 0.5) * 2.0);
              }
            } else {
              // WIREFRAME POINTS
              vColor = vec3(0.0, 1.0, 0.35);
            }
            
            vColor = clamp(vColor, 0.0, 0.95);
          }
        `}
        fragmentShader={`
          uniform float uOpacity;
          uniform int uColorMode;
          
          varying vec3 vColor;
          varying float vDepth;
          
          void main() {
            vec2 circ = gl_PointCoord - vec2(0.5);
            if (dot(circ, circ) > 0.25) {
              discard;
            }
            
            float strength = 1.0 - (dot(circ, circ) * 4.0);
            float alpha = uOpacity * strength;
            
            if (uColorMode == 3) {
              alpha *= 0.35; // GHOST mode transparency modifier
            }
            
            gl_FragColor = vec4(vColor, alpha);
          }
        `}
        uniforms={uniforms}
        transparent={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}
