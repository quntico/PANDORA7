import React, { useRef, useEffect, useState, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAvatarStore } from './AvatarState';
import { useCursorFollow } from './CursorFollow';

export default function ParticleFace({
  audioLevel = 0,
  state = "IDLE",
  tuning = {}
}) {
  const groupRef = useRef(null);
  const mainPointsRef = useRef(null);
  const glowPointsRef = useRef(null);
  
  const { updateRotation } = useCursorFollow();
  const quality = useAvatarStore(state => state.quality);
  const setFps = useAvatarStore(state => state.setFps);

  const [pixelData, setPixelData] = useState(null);
  const [loading, setLoading] = useState(false);

  // Constants
  const referenceImageSrc = '/avatar/reference-face.png';
  const thresholdVal = 18;

  // Dynamic tuning parameters
  const parallaxStrength = tuning.parallaxStrength !== undefined ? tuning.parallaxStrength : 0.06;
  const shimmerVal = tuning.shimmer !== undefined ? tuning.shimmer : 0.5;
  const audioPulseVal = tuning.audioPulse !== undefined ? tuning.audioPulse : 0.4;

  // Load and sample the reference-face image
  useEffect(() => {
    setLoading(true);
    const img = new Image();
    img.src = referenceImageSrc;
    img.crossOrigin = 'Anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Quality tiers configuration to balance high fidelity and 60fps
      let targetRes = 480;
      if (quality === 'high') targetRes = 560;
      else if (quality === 'low') targetRes = 360;

      let w = img.width;
      let h = img.height;
      if (w > targetRes || h > targetRes) {
        if (w > h) {
          h = Math.round((h * targetRes) / w);
          w = targetRes;
        } else {
          w = Math.round((w * targetRes) / h);
          h = targetRes;
        }
      }

      canvas.width = w;
      canvas.height = h;
      ctx.drawImage(img, 0, 0, w, h);

      const imgData = ctx.getImageData(0, 0, w, h).data;
      const positions = [];
      const colors = [];
      const speakWeights = [];
      const rightEdgeWeights = [];

      // Determine points multiplier to hit requested density (250k - 400k)
      const targetDensity = quality === 'high' ? 380000 : (quality === 'low' ? 180000 : 280000);
      
      // Collect valid pixels
      const pixels = [];
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const idx = (y * w + x) * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          const a = imgData[idx + 3];

          if (a < 20) continue;
          const brightness = (r + g + b) / 3;
          if (brightness < thresholdVal) continue;

          pixels.push({ x, y, r, g, b, brightness });
        }
      }

      if (pixels.length === 0) {
        setLoading(false);
        return;
      }

      const pointsPerPixel = Math.max(1, Math.ceil(targetDensity / pixels.length));

      // Build coordinates and apply holographic properties
      for (let i = 0; i < pixels.length; i++) {
        const p = pixels[i];
        for (let k = 0; k < pointsPerPixel; k++) {
          const jitterX = pointsPerPixel > 1 ? (Math.random() - 0.5) * 0.9 : 0;
          const jitterY = pointsPerPixel > 1 ? (Math.random() - 0.5) * 0.9 : 0;

          // Map parameters to screen coords
          let px = (((p.x + jitterX) / w) - 0.5) * 2.4;
          let py = -(((p.y + jitterY) / h) - 0.5) * 2.8;

          // 2.5D subtle depth mapping
          let nz = (p.brightness / 255.0) * 0.12 + (Math.random() - 0.5) * 0.025;

          // Apply micro-dispersion for right edge disintegration
          if (px > 0.55) {
            px += (Math.random() - 0.2) * 0.08;
            nz += (Math.random() - 0.5) * 0.04;
          }

          positions.push(px, py, nz);

          // Locate mouth region for audio reactivity weights
          let isMouth = 0;
          if (px > -0.22 && px < 0.22 && py > -0.72 && py < -0.32) {
            const rx = px / 0.22;
            const ry = (py + 0.52) / 0.20;
            isMouth = Math.exp(-(rx * rx + ry * ry));
          }
          speakWeights.push(isMouth);

          // Brightness and contrast tweaks
          let cr = p.r / 255.0;
          let cg = p.g / 255.0;
          let cb = p.b / 255.0;
          const factor = 1.35;
          cr = Math.min(0.95, cr * factor);
          cg = Math.min(0.95, cg * factor);
          cb = Math.min(0.95, cb * factor);

          colors.push(cr, cg, cb);



          // Identify right edge for floating particles
          rightEdgeWeights.push(px > 0.45 ? (px - 0.45) / 0.75 : 0);
        }
      }

      setPixelData({
        positions: new Float32Array(positions),
        colors: new Float32Array(colors),
        speakWeights: new Float32Array(speakWeights),
        rightEdgeWeights: new Float32Array(rightEdgeWeights),
        count: positions.length / 3
      });
      setLoading(false);
    };

    img.onerror = () => {
      console.error("Reference face image could not be loaded at: ", referenceImageSrc);
      setLoading(false);
    };
  }, [quality]);

  const fpsTracker = useRef({
    frameCount: 0,
    lastTime: performance.now()
  });

  const rotX = useRef(0);
  const rotY = useRef(0);
  const floatOffset = useRef(Math.random() * 100);

  useFrame((stateVal) => {
    const time = stateVal.clock.getElapsedTime();

    // Track FPS
    fpsTracker.current.frameCount++;
    const now = performance.now();
    if (now > fpsTracker.current.lastTime + 1000) {
      const fps = Math.round((fpsTracker.current.frameCount * 1000) / (now - fpsTracker.current.lastTime));
      setFps(fps);
      fpsTracker.current.frameCount = 0;
      fpsTracker.current.lastTime = now;
    }

    if (!groupRef.current) return;

    // Breath scale modulation: 1.0 -> 1.008
    let breathe = 1.0 + Math.sin(time * 2.2) * 0.004;

    // Adjust scale for LISTENING (contraction 2%) and SPEAKING (vocal bounce scaled by audioPulseVal)
    let stateScale = 1.0;
    if (state === 'LISTENING') {
      stateScale = 0.98;
    } else if (state === 'SPEAKING') {
      stateScale = 1.0 + audioLevel * 0.035 * audioPulseVal;
    }
    
    const baseScale = 1.45 * breathe * stateScale;
    groupRef.current.scale.setScalar(baseScale);

    // Subtle floating animation: +/- 2px scale equivalent (0.015 world units)
    groupRef.current.position.y = 0.05 + Math.sin(time * 1.8 + floatOffset.current) * 0.015;

    // Cursor Follow rotation mapping to card tilt
    const targetCursor = updateRotation(); // Returns normalized cursor offsets
    
    // Limits rotation to avoid side view: X max +/-0.04 rad, Y max +/-0.08 rad
    // Scale by parallax strength setting
    const scaleFactor = (parallaxStrength / 0.06);
    let targetRotX = targetCursor.x * 0.04 * scaleFactor;
    let targetRotY = targetCursor.y * 0.08 * scaleFactor;

    // Add idle swaying and speaking micro-vibration
    if (state === 'IDLE') {
      targetRotY += Math.sin(time * 0.5) * 0.015 * scaleFactor;
      targetRotX += Math.cos(time * 0.3) * 0.010 * scaleFactor;
    } else if (state === 'SPEAKING') {
      targetRotX += (Math.random() - 0.5) * 0.005;
      targetRotY += (Math.random() - 0.5) * 0.005;
    }

    // Interpolate rotation
    rotX.current += (targetRotX - rotX.current) * 0.08;
    rotY.current += (targetRotY - rotY.current) * 0.08;

    groupRef.current.rotation.x = rotX.current;
    groupRef.current.rotation.y = rotY.current;

    // Update dynamic properties in materials / attributes
    if (pixelData && mainPointsRef.current && glowPointsRef.current) {
      const mainGeom = mainPointsRef.current.geometry;
      const glowGeom = glowPointsRef.current.geometry;
      
      const posAttr = mainGeom.attributes.position;
      const glowPosAttr = glowGeom.attributes.position;
      
      if (posAttr && glowPosAttr) {
        const positions = posAttr.array;
        const origPositions = pixelData.positions;
        const speakWeights = pixelData.speakWeights;
        const rightEdgeWeights = pixelData.rightEdgeWeights;

        for (let i = 0; i < pixelData.count; i++) {
          const idx = i * 3;
          let offsetZ = 0;
          let offsetX = 0;
          let offsetY = 0;

          // Shimmer vibration (micro noise in positions)
          const shimNoiseX = (Math.random() - 0.5) * 0.004 * shimmerVal;
          const shimNoiseY = (Math.random() - 0.5) * 0.004 * shimmerVal;
          const shimNoiseZ = (Math.random() - 0.5) * 0.004 * shimmerVal;

          // SPEAKING animation: mouth zone vibrates & shifts down-forward
          if (state === 'SPEAKING' && audioLevel > 0) {
            const w = speakWeights[i];
            const noise = (Math.random() - 0.5) * audioLevel * 0.024 * audioPulseVal;
            offsetX = noise * w;
            offsetY = -audioLevel * 0.030 * audioPulseVal * w + (Math.random() - 0.5) * 0.016 * audioPulseVal * w;
            offsetZ = audioLevel * 0.040 * audioPulseVal * w;
          }

          // THINKING animation: shimmer & right edge floats
          if (state === 'THINKING') {
            const edgeW = rightEdgeWeights[i];
            if (edgeW > 0) {
              offsetX += Math.sin(time * 3.0 + i) * 0.015 * edgeW * (0.5 + shimmerVal * 0.5);
              offsetY += Math.cos(time * 2.0 + i) * 0.015 * edgeW * (0.5 + shimmerVal * 0.5);
            }
          }

          positions[idx] = origPositions[idx] + offsetX + shimNoiseX;
          positions[idx + 1] = origPositions[idx + 1] + offsetY + shimNoiseY;
          positions[idx + 2] = origPositions[idx + 2] + offsetZ + shimNoiseZ;
        }
        
        posAttr.needsUpdate = true;
        glowPosAttr.needsUpdate = true;
      }
    }
  });

  const geometry = useMemo(() => {
    if (!pixelData) return null;
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(pixelData.positions.slice(), 3));
    geom.setAttribute('color', new THREE.BufferAttribute(pixelData.colors, 3));
    return geom;
  }, [pixelData]);

  if (loading) return null;
  if (!geometry) return null;

  return (
    <group ref={groupRef} position={[0, 0.05, 0]}>
      {/* Primary High-Density Particle Cloud */}
      <points ref={mainPointsRef} geometry={geometry}>
        <pointsMaterial
          size={0.009}
          vertexColors={true}
          transparent={true}
          opacity={state === 'SPEAKING' ? 0.98 : 0.90}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation={true}
        />
      </points>

      {/* Duplicate Glow Layer */}
      <points ref={glowPointsRef} geometry={geometry}>
        <pointsMaterial
          size={0.018}
          vertexColors={true}
          transparent={true}
          opacity={state === 'LISTENING' ? 0.35 : 0.22}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation={true}
        />
      </points>
    </group>
  );
}
