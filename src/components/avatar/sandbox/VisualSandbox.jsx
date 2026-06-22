import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useAvatarStore } from '../AvatarState';
import ParticleFace from '../ParticleFace';
import ImageParticleObject from './ImageParticleObject';
import GLBModelObject from './GLBModelObject';
import SandboxControls from './SandboxControls';
import { processImageToParticles } from './ImageProcessor';

// Helper to check WebGL support
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

// Camera control helper mapping to state tuning in real time
function CameraTuner({ zDistance, fov }) {
  const { camera } = useThree();
  
  useEffect(() => {
    camera.position.set(0, 0, zDistance);
    camera.fov = fov;
    camera.updateProjectionMatrix();
  }, [camera, zDistance, fov]);
  
  return null;
}

// Orbits showing up around center object
function CyberOrbits({ active }) {
  const meshRef1 = useRef();
  const meshRef2 = useRef();

  useFrame((state) => {
    if (!active) return;
    const time = state.clock.getElapsedTime();
    if (meshRef1.current) {
      meshRef1.current.rotation.z = time * 0.4;
      meshRef1.current.rotation.x = time * 0.2;
    }
    if (meshRef2.current) {
      meshRef2.current.rotation.z = -time * 0.6;
      meshRef2.current.rotation.y = time * 0.35;
    }
  });

  if (!active) return null;

  return (
    <group scale={[1.25, 1.25, 1.25]}>
      <mesh ref={meshRef1}>
        <ringGeometry args={[1.5, 1.518, 64]} />
        <meshBasicMaterial 
          color="#00E5FF" 
          transparent 
          opacity={0.4} 
          side={THREE.DoubleSide} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      <mesh ref={meshRef2} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <ringGeometry args={[1.3, 1.314, 64]} />
        <meshBasicMaterial 
          color="#C026FF" 
          transparent 
          opacity={0.5} 
          side={THREE.DoubleSide} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

export default function VisualSandbox() {
  const [hasWebGL, setHasWebGL] = useState(true);

  // Global avatar store values
  const audioAmplitude = useAvatarStore(state => state.audioAmplitude);
  const currentState = useAvatarStore(state => state.currentState);

  // Sandbox local config state
  const [config, setConfig] = useState({
    preset: 'PANDORA_FACE', // 'PANDORA_FACE' | 'PRODUCT_HOLOGRAM' | 'LOGO_PARTICLES' | 'TECH_BLUEPRINT' | 'CINEMATIC_GLOW' | 'CUSTOM_UPLOAD' | 'GLB_MODEL'
    customImageSrc: null,
    glbUrl: null,
    maxParticles: 250000,
    threshold: 18,
    removeDarkBackground: true,
    brightness: 3.5,
    contrast: 2.2,
    pointSize: 0.009,
    opacity: 0.98,
    scale: 1.45,
    depthMode: 'VOLUMETRIC_FAKE_3D',
    depthStrength: 0.25,
    colorMode: 'PANDORA',
    exploded: false,
    rotationSpeed: 0.5,
    rotationDirection: 'LEFT_TO_RIGHT', // 'LEFT_TO_RIGHT' | 'RIGHT_TO_LEFT' | 'STATIC'
    rotationAxis: 'Y', // 'Y' | 'X' | 'Z' | 'DIAGONAL'
    cameraZ: 3.0,
    cameraFov: 28,
    parallaxStrength: 0.06,
    shimmer: 0.5,
    audioPulse: 0.4
  });

  const [particlesData, setParticlesData] = useState(null);
  const [loading, setLoading] = useState(false);
  const orbitControlsRef = useRef(null);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setHasWebGL(false);
    }
  }, []);

  // Map preset to corresponding image source
  const getPresetImageSrc = (presetId) => {
    switch (presetId) {
      case 'PRODUCT_HOLOGRAM':
        return '/blueprint_preview.png';
      case 'LOGO_PARTICLES':
        return '/cube-logo.png';
      case 'TECH_BLUEPRINT':
        return '/blueprint_preview.png';
      case 'CINEMATIC_GLOW':
        return '/dark_preview.png';
      default:
        return null;
    }
  };

  // Process image when preset, custom image source, density, or threshold changes
  useEffect(() => {
    if (config.preset === 'PANDORA_FACE' || config.preset === 'GLB_MODEL') {
      setParticlesData(null);
      return;
    }

    let src = null;
    if (config.preset === 'CUSTOM_UPLOAD') {
      src = config.customImageSrc;
    } else {
      src = getPresetImageSrc(config.preset);
    }

    if (!src) return;

    setLoading(true);
    processImageToParticles(src, {
      maxParticles: config.maxParticles,
      threshold: config.threshold,
      removeDarkBackground: config.removeDarkBackground,
      depthMode: config.depthMode,
      depthStrength: config.depthStrength
    })
      .then((data) => {
        setParticlesData(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error processing image: ", err);
        setLoading(false);
      });
  }, [
    config.preset,
    config.customImageSrc,
    config.maxParticles,
    config.threshold,
    config.depthMode,
    config.depthStrength,
    config.removeDarkBackground
  ]);

  const handleUploadImage = (file) => {
    // Check if GLB model is uploaded
    if (file.name.toLowerCase().endsWith('.glb')) {
      const url = URL.createObjectURL(file);
      setConfig(prev => ({
        ...prev,
        preset: 'GLB_MODEL',
        glbUrl: url,
        customImageSrc: null
      }));
      setParticlesData(null);
      return;
    }

    // Otherwise load image file
    const reader = new FileReader();
    reader.onload = (e) => {
      setConfig(prev => ({
        ...prev,
        preset: 'CUSTOM_UPLOAD',
        customImageSrc: e.target?.result,
        glbUrl: null
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleResetView = () => {
    if (config.preset === 'PANDORA_FACE') {
      setConfig(prev => ({
        ...prev,
        scale: 1.45,
        cameraZ: 3.0,
        cameraFov: 28,
        parallaxStrength: 0.06,
        shimmer: 0.5,
        audioPulse: 0.4,
        exploded: false
      }));
    } else {
      setConfig(prev => ({
        ...prev,
        scale: 2.5,
        cameraZ: 2.5,
        cameraFov: 30,
        exploded: false
      }));
    }
    if (orbitControlsRef.current) {
      orbitControlsRef.current.reset();
    }
  };

  const handleClearScene = () => {
    setConfig(prev => ({
      ...prev,
      preset: 'CUSTOM_UPLOAD',
      customImageSrc: null,
      glbUrl: null
    }));
    setParticlesData(null);
  };

  const handleSavePreset = () => {
    localStorage.setItem('pandora-sandbox-preset-custom', JSON.stringify(config));
    alert("Sandbox custom preset saved successfully!");
  };

  const handleCopyConfig = () => {
    const serialized = { ...config, customImageSrc: undefined, glbUrl: undefined };
    navigator.clipboard.writeText(JSON.stringify(serialized, null, 2))
      .then(() => alert("Sandbox configuration copied to clipboard!"))
      .catch((err) => console.error("Failed to copy sandbox config: ", err));
  };

  if (!hasWebGL) {
    return (
      <div className="w-full h-full bg-[#020617] flex items-center justify-center font-mono text-cyan-400">
        WebGL not supported on this device.
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#020617] flex">
      {/* Visual Canvas Viewport */}
      <div className="flex-1 h-full relative">
        {/* Nebula Glowing Background */}
        <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#001B44]/35 via-[#020617] to-[#020617] pointer-events-none" />
        
        {/* Decorative Grid */}
        <div 
          className="absolute inset-0 z-0 opacity-[0.006] pointer-events-none" 
          style={{
            backgroundImage: `linear-gradient(#00E5FF 1px, transparent 1px), linear-gradient(90deg, #00E5FF 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Loading Spinner Overlay */}
        {loading && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-sm">
            <div className="w-10 h-10 rounded-full border-2 border-t-cyan-400 border-r-transparent border-b-cyan-400 border-l-transparent animate-spin mb-3" />
            <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest animate-pulse">
              Converting image to particles...
            </span>
          </div>
        )}

        <Canvas
          camera={{ position: [0, 0, config.cameraZ], fov: config.cameraFov }}
          gl={{ antialias: true, alpha: true }}
          className="w-full h-full z-10 relative"
        >
          <CameraTuner zDistance={config.cameraZ} fov={config.cameraFov} />
          <ambientLight intensity={0.3} />
          
          <pointLight position={[5, 5, 5]} color="#00E5FF" intensity={0.8} />
          <pointLight position={[-5, -5, -5]} color="#C026FF" intensity={0.6} />

          <Suspense fallback={null}>
            <group position={[0, 0, 0]}>
              {config.preset === 'PANDORA_FACE' ? (
                <ParticleFace audioLevel={audioAmplitude} state={currentState} tuning={config} />
              ) : config.preset === 'GLB_MODEL' ? (
                <GLBModelObject
                  glbUrl={config.glbUrl}
                  audioLevel={audioAmplitude}
                  config={config}
                />
              ) : (
                <ImageParticleObject
                  particlesData={particlesData}
                  audioLevel={audioAmplitude}
                  config={config}
                />
              )}
              <CyberOrbits active={currentState === 'THINKING' || currentState === 'LISTENING'} />
            </group>
          </Suspense>

          <OrbitControls 
            ref={orbitControlsRef}
            enableZoom={true}
            minDistance={0.5}
            maxDistance={18.0}
            enablePan={true}
            minPolarAngle={config.preset === 'PANDORA_FACE' ? Math.PI / 2 - (config.parallaxStrength ?? 0.06) * 0.5 : 0}
            maxPolarAngle={config.preset === 'PANDORA_FACE' ? Math.PI / 2 + (config.parallaxStrength ?? 0.06) * 0.5 : Math.PI}
            minAzimuthAngle={config.preset === 'PANDORA_FACE' ? -(config.parallaxStrength ?? 0.06) : -Infinity}
            maxAzimuthAngle={config.preset === 'PANDORA_FACE' ? (config.parallaxStrength ?? 0.06) : Infinity}
          />
        </Canvas>

        {/* Scanlines Effect */}
        <div className="absolute inset-0 z-20 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%] opacity-20" />
      </div>

      {/* Controls Sidebar Component */}
      <SandboxControls
        config={config}
        setConfig={setConfig}
        onUploadImage={handleUploadImage}
        onResetView={handleResetView}
        onClearScene={handleClearScene}
        onSavePreset={handleSavePreset}
        onCopyConfig={handleCopyConfig}
      />
    </div>
  );
}
