import React, { useRef } from 'react';
import VisualSandbox from '@/components/avatar/sandbox/VisualSandbox';
import AudioReactive from '@/components/avatar/AudioReactive';
import ConversationBar from '@/components/avatar/ConversationBar';
import { useAvatarStore } from '@/components/avatar/AvatarState';

function TechnicalPanel() {
  const currentState = useAvatarStore(state => state.currentState);
  const amplitude = useAvatarStore(state => state.audioAmplitude);
  const fps = useAvatarStore(state => state.fps);
  const latency = useAvatarStore(state => state.latency);
  const quality = useAvatarStore(state => state.quality);

  const getStatusText = () => {
    switch (currentState) {
      case 'LISTENING': return 'Escuchando...';
      case 'THINKING': return 'Analizando...';
      case 'SPEAKING': return 'Respondiendo...';
      case 'ERROR': return 'Sin conexión';
      case 'STANDBY': return 'En espera';
      default: return 'Inactivo';
    }
  };

  const getStatusColor = () => {
    switch (currentState) {
      case 'LISTENING': return 'text-cyan-400';
      case 'THINKING': return 'text-purple-400';
      case 'SPEAKING': return 'text-green-400';
      case 'ERROR': return 'text-red-400';
      case 'STANDBY': return 'text-slate-500';
      default: return 'text-cyan-400/80';
    }
  };

  return (
    <div 
      className="absolute bottom-6 right-6 z-20 w-60 p-4 rounded-xl border border-cyan-500/20 backdrop-blur-md flex flex-col gap-2.5 font-mono text-[9px] select-none pointer-events-auto"
      style={{
        background: 'rgba(7, 11, 25, 0.75)',
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
      }}
    >
      <div className="flex justify-between items-center border-b border-cyan-500/10 pb-1.5">
        <span className="text-white/60 tracking-wider">ESTADO TÉCNICO</span>
        <span className="text-cyan-400/50 text-[8px] animate-pulse">● ACTIVO</span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-white/40">ESTADO:</span>
        <span className={`font-bold uppercase tracking-wider ${getStatusColor()}`}>
          {getStatusText()}
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-white/40">MICRÓFONO:</span>
        <span className={currentState === 'LISTENING' ? 'text-cyan-400 font-bold' : 'text-slate-500'}>
          {currentState === 'LISTENING' ? 'ENCENDIDO' : 'APAGADO'}
        </span>
      </div>

      <div className="flex flex-col gap-1">
        <div className="flex justify-between text-white/40">
          <span>AUDIO LEVEL:</span>
          <span>{(amplitude * 100).toFixed(0)}%</span>
        </div>
        <div className="w-full h-1 bg-slate-800/80 rounded-full overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-cyan-400 to-purple-500 transition-all duration-75"
            style={{ width: `${Math.min(amplitude * 100, 100)}%` }}
          />
        </div>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-white/40">FPS RENDER:</span>
        <span className={fps < 45 ? 'text-yellow-400' : 'text-cyan-400 font-bold'}>
          {fps} FPS
        </span>
      </div>

      <div className="flex justify-between items-center">
        <span className="text-white/40">LATENCIA IA:</span>
        <span className="text-purple-400 font-bold">
          {latency > 0 ? `${latency} ms` : '--'}
        </span>
      </div>

      <div className="flex justify-between items-center border-t border-cyan-500/10 pt-1.5 text-[8px] text-slate-500">
        <span>DEVICES: {quality.toUpperCase()}</span>
        <span>PANDORA 8.01</span>
      </div>
    </div>
  );
}

export default function AvatarPage() {
  const pageContainerRef = useRef(null);
  const currentState = useAvatarStore(state => state.currentState);
  const isInactivityMode = useAvatarStore(state => state.isInactivityMode);

  return (
    <div 
      ref={pageContainerRef}
      className="w-full h-[calc(100vh-72px)] relative flex flex-col justify-between bg-[#020617] text-white overflow-hidden select-none"
    >
      {/* 3D Hologram Area (65-75% height) */}
      <div className="flex-1 relative w-full h-[70%] z-10">
        
        {/* Futuristic Floating Header Indicator */}
        <div className="absolute top-6 left-6 z-20 pointer-events-none">
          <div className="flex items-center gap-3 bg-[#070b19]/80 border border-cyan-500/20 px-4 py-2 rounded-xl backdrop-blur-md">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
            </span>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white tracking-widest uppercase font-mono">PANDORA V8.01 CORE</span>
              <span className="text-[8px] text-cyan-400 font-bold tracking-widest font-mono">SYSTEM: ACTIVE</span>
            </div>
          </div>
        </div>

        <div className="absolute top-6 right-6 z-20 pointer-events-none">
          <div className="flex items-center gap-3 bg-[#070b19]/80 border border-cyan-500/20 px-4 py-2 rounded-xl backdrop-blur-md text-right">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-white tracking-widest uppercase font-mono">NEURAL STATUS</span>
              <span className="text-[8px] text-purple-400 font-bold tracking-widest font-mono">
                {currentState === 'THINKING' ? 'COMPUTING SYNAPSES' : 'IDLE CONNECTED'}
              </span>
            </div>
          </div>
        </div>

        {/* The 3D Scene */}
        <VisualSandbox />

        {/* Technical Panel Overlay */}
        <TechnicalPanel />

        {/* Ambient Overlay: Inactivity Mode Banner */}
        {isInactivityMode && (
          <div className="absolute inset-0 bg-[#020617]/70 backdrop-blur-sm z-20 flex flex-col items-center justify-center transition-all duration-700 animate-in fade-in">
            <div className="text-center p-8 border border-cyan-500/10 bg-[#070b19]/60 rounded-3xl max-w-sm shadow-2xl">
              <div className="w-12 h-12 rounded-full border border-cyan-500/30 flex items-center justify-center mx-auto mb-4 animate-pulse">
                <span className="w-3 h-3 rounded-full bg-cyan-500 shadow-glow-sm" />
              </div>
              <h3 className="text-sm font-black tracking-widest text-white uppercase mb-1">Modo de Espera</h3>
              <p className="text-[10px] text-gray-500 font-bold tracking-wider leading-relaxed">
                PANDORA ha entrado en modo reposo. Mueve el cursor o presiona cualquier botón para reconstruir partículas.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* UI Lower Container */}
      <div className="w-full max-w-[1400px] mx-auto px-6 pb-6 z-20 flex flex-col gap-2 relative">
        
        {/* Waves section */}
        <div className="relative w-full h-[60px] flex items-center justify-center">
          
          {/* Virtual Floating HUD indicator when listening */}
          {currentState === 'LISTENING' && (
            <div className="absolute z-10 bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse font-mono">
              MICROPHONE ACTIVE - ESCUCHANDO...
            </div>
          )}

          {currentState === 'THINKING' && (
            <div className="absolute z-10 bg-purple-500/15 border border-purple-500/30 text-purple-200 px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest animate-pulse font-mono">
              ANALIZANDO CONSULTA...
            </div>
          )}

          <AudioReactive />
        </div>

        {/* Conversation controls bar */}
        <ConversationBar mainContainerRef={pageContainerRef} />
      </div>
    </div>
  );
}
