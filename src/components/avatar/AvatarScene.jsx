import React, { Suspense, useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useAvatarStore } from './AvatarState';
import ParticleFace from './ParticleFace';
import AvatarTuningPanel from './AvatarTuningPanel';

// Helper to check WebGL support
function isWebGLAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (canvas.getContext('webgl') || canvas.getContext('experimental-webgl')));
  } catch (e) {
    return false;
  }
}

// Error Boundary for WebGL/Three.js errors
class CanvasErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[CanvasErrorBoundary] WebGL crashed:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

// Camera control helper mapping to state tuning in real time
function CameraTuner({ tuning }) {
  const { camera } = useThree();
  
  useEffect(() => {
    if (tuning.cameraZ !== undefined) {
      camera.position.z = tuning.cameraZ;
    }
    if (tuning.cameraFov !== undefined) {
      camera.fov = tuning.cameraFov;
    }
    camera.updateProjectionMatrix();
  }, [camera, tuning.cameraZ, tuning.cameraFov]);
  
  return null;
}

// Orbit circles showing up when PANDORA is thinking or listening
function CyberOrbits() {
  const meshRef1 = useRef();
  const meshRef2 = useRef();
  const currentState = useAvatarStore(state => state.currentState);
  const isInactivityMode = useAvatarStore(state => state.isInactivityMode);

  useFrame((state) => {
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

  if (isInactivityMode || currentState === 'STANDBY') return null;

  const showOrbits = currentState === 'THINKING' || currentState === 'SPEAKING' || currentState === 'LISTENING';
  const scale = currentState === 'LISTENING' ? 1.35 : 1.25;

  if (!showOrbits) return null;

  // Thinking state displays rings glowing brighter (120% opacity)
  const isThinking = currentState === 'THINKING';
  const outerOpacity = isThinking ? 0.85 : 0.4;
  const innerOpacity = isThinking ? 0.95 : 0.5;

  return (
    <group scale={[scale, scale, scale]}>
      {/* Outer Ring */}
      <mesh ref={meshRef1}>
        <ringGeometry args={[1.5, 1.518, 64]} />
        <meshBasicMaterial 
          color="#00E5FF" 
          transparent 
          opacity={outerOpacity} 
          side={THREE.DoubleSide} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
      {/* Inner Tilted Ring */}
      <mesh ref={meshRef2} rotation={[Math.PI / 4, Math.PI / 4, 0]}>
        <ringGeometry args={[1.3, 1.314, 64]} />
        <meshBasicMaterial 
          color="#C026FF" 
          transparent 
          opacity={innerOpacity} 
          side={THREE.DoubleSide} 
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

// Premium 2D Fallback Component
function PremiumFallback2D() {
  return (
    <div className="w-full h-full relative overflow-hidden bg-[#020617] flex flex-col items-center justify-center p-6 select-none">
      <div 
        className="absolute inset-0 z-0 opacity-[0.006] pointer-events-none" 
        style={{
          backgroundImage: `linear-gradient(#00E5FF 1px, transparent 1px), linear-gradient(90deg, #00E5FF 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />
      
      {/* Cybernetic circle logo animation */}
      <div className="relative w-24 h-24 mb-6 flex items-center justify-center z-10">
        <div className="absolute inset-0 rounded-full border border-dashed border-[#00E5FF]/40 animate-spin" style={{ animationDuration: '12s' }} />
        <div className="absolute inset-2 rounded-full border border-[#C026FF]/30 animate-ping" style={{ animationDuration: '4s' }} />
        <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#00E5FF] to-[#C026FF] opacity-80 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.4)]">
          <span className="text-white font-mono text-xs font-bold">AI</span>
        </div>
      </div>

      <div className="text-center z-10 max-w-md">
        <h2 className="text-[#E0F7FF] font-mono text-lg font-bold tracking-widest uppercase mb-2">
          AVATAR no disponible en este dispositivo
        </h2>
        <p className="text-slate-400 font-sans text-sm leading-relaxed mb-1">
          WebGL o la aceleración por hardware están inactivos.
        </p>
        <p className="text-xs font-mono text-[#00E5FF]/60 uppercase tracking-widest">
          SISTEMA PANDORA V7.89
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-6 flex justify-between px-8 text-[10px] font-mono text-slate-500 z-10">
        <span>STATUS: DEGRADED_2D</span>
        <span>LATENCY: N/A</span>
        <span>FPS: --</span>
      </div>
    </div>
  );
}

export default function AvatarScene() {
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    if (!isWebGLAvailable()) {
      setHasWebGL(false);
    }
  }, []);  const quality = useAvatarStore(state => state.quality);
  const particleCountStr = quality === 'high' ? '300,000' : quality === 'medium' ? '200,000' : '70,000';

  const audioAmplitude = useAvatarStore(state => state.audioAmplitude);
  const currentState = useAvatarStore(state => state.currentState);
  const avatarTuning = useAvatarStore(state => state.avatarTuning);

  if (!hasWebGL) {
    return <PremiumFallback2D />;
  }

  return (
    <div className="w-full h-full relative overflow-hidden bg-[#020617]">
      {/* Nebula glowing background gradients */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#001B44]/35 via-[#020617] to-[#020617] pointer-events-none" />
      
      {/* Decorative ambient grid overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.006] pointer-events-none" 
        style={{
          backgroundImage: `linear-gradient(#00E5FF 1px, transparent 1px), linear-gradient(90deg, #00E5FF 1px, transparent 1px)`,
          backgroundSize: '40px 40px'
        }}
      />

      <CanvasErrorBoundary fallback={<PremiumFallback2D />}>
        <Canvas
          camera={{ position: [0, 0, avatarTuning.cameraZ || 2.25], fov: avatarTuning.cameraFov || 28 }}
          gl={{ antialias: true, alpha: true }}
          className="w-full h-full z-10 relative"
        >
          <CameraTuner tuning={avatarTuning} />
          <ambientLight intensity={0.25} />
          
          <pointLight position={[5, 5, 5]} color="#00E5FF" intensity={0.8} />
          <pointLight position={[-5, -5, -5]} color="#C026FF" intensity={0.6} />

          <Suspense fallback={null}>
            <group position={[0, 0, 0]}>
              <ParticleFace audioLevel={audioAmplitude} state={currentState} tuning={avatarTuning} />
              <CyberOrbits />
            </group>
          </Suspense>

          <OrbitControls 
            enableZoom={true}
            minDistance={0.5}
            maxDistance={18.0}
            enablePan={false}
            minPolarAngle={Math.PI / 2.3}
            maxPolarAngle={Math.PI / 1.7}
            minAzimuthAngle={-Math.PI / 4}
            maxAzimuthAngle={Math.PI / 4}
          />
        </Canvas>
      </CanvasErrorBoundary>

      {/* Hologram scanlines effect overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,_rgba(0,0,0,0.25)_50%),_linear-gradient(90deg,_rgba(255,0,0,0.06),_rgba(0,255,0,0.02),_rgba(0,0,255,0.06))] bg-[size:100%_4px,_6px_100%] opacity-20" />
      <AvatarTuningPanel />
    </div>
  );
}
