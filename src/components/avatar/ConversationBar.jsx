import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Maximize2, Minimize2, RotateCcw, Send } from 'lucide-react';
import { useAvatarStore } from './AvatarState';
import VoiceEngine from './VoiceEngine';

export default function ConversationBar({ mainContainerRef }) {
  const [inputText, setInputText] = useState('');
  const currentState = useAvatarStore(state => state.currentState);
  const isMuted = useAvatarStore(state => state.isMuted);
  const isFullscreen = useAvatarStore(state => state.isFullscreen);
  const messages = useAvatarStore(state => state.messages);
  const setState = useAvatarStore(state => state.setState);
  const setMuted = useAvatarStore(state => state.setMuted);
  const setFullscreen = useAvatarStore(state => state.setFullscreen);
  const addMessage = useAvatarStore(state => state.addMessage);
  const resetConversation = useAvatarStore(state => state.resetConversation);
  const setLatency = useAvatarStore(state => state.setLatency);

  // Monitor inactive standby timer (30s)
  useEffect(() => {
    const checkInactivity = setInterval(() => {
      const lastActivity = useAvatarStore.getState().lastActivityTime;
      const isCurrentlyInactive = useAvatarStore.getState().isInactivityMode;
      const current = useAvatarStore.getState().currentState;
      
      if (Date.now() - lastActivity > 30000 && !isCurrentlyInactive && current === 'IDLE') {
        useAvatarStore.getState().setInactivityMode(true);
      }
    }, 5000);

    return () => clearInterval(checkInactivity);
  }, []);

  const handleMicToggle = async () => {
    useAvatarStore.getState().resetActivity();
    if (currentState === 'LISTENING') {
      VoiceEngine.stopListening();
      setState('IDLE');
    } else {
      VoiceEngine.stopSpeaking();
      await VoiceEngine.startListening();
    }
  };

  const handleMuteToggle = () => {
    useAvatarStore.getState().resetActivity();
    const nextMuted = !isMuted;
    setMuted(nextMuted);
    if (nextMuted) {
      VoiceEngine.stopSpeaking();
    }
  };

  const handleFullscreenToggle = () => {
    useAvatarStore.getState().resetActivity();
    if (!mainContainerRef || !mainContainerRef.current) return;

    if (!document.fullscreenElement) {
      mainContainerRef.current.requestFullscreen()
        .then(() => setFullscreen(true))
        .catch(err => console.error("Error enabling fullscreen:", err));
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      setFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, [setFullscreen]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const query = inputText.trim();
    addMessage('user', query);
    setInputText('');
    VoiceEngine.stopListening();
    VoiceEngine.stopSpeaking();

    // Start latency benchmark timer
    const startTime = Date.now();

    setState('THINKING');

    setTimeout(() => {
      let responseText = "Entendido. He procesado tu solicitud en el núcleo de QUANTICO. Iniciando análisis de optimización en los módulos de simulación para verificar márgenes de capacidad y costos operativos.";
      
      const q = query.toLowerCase();
      if (q.includes('hola') || q.includes('saludos') || q.includes('buenos')) {
        responseText = "Hola, soy el núcleo de IA PANDORA de QUANTICO. ¿Qué análisis industrial o cálculo de línea de producción deseas realizar hoy?";
      } else if (q.includes('carrier') || q.includes('tubo')) {
        responseText = "He analizado el módulo Carrier. La capacidad del cuello de botella está configurada actualmente por la cizalla rotativa. ¿Deseas optimizar la velocidad del desbobinado?";
      } else if (q.includes('capacidad') || q.includes('cuello de botella') || q.includes('limitante')) {
        responseText = "El simulador Carrier indica que la capacidad máxima real de la planta está determinada por el módulo limitante. Podemos modificar los parámetros del motor para incrementar el flujo sin riesgo de sobrecarga.";
      } else if (q.includes('inversión') || q.includes('precio') || q.includes('costo') || q.includes('usd') || q.includes('venta')) {
        responseText = "Calculando la inversión estimada del proyecto... La suma de módulos activos asciende a la cifra consolidada en tu panel de control. ¿Procedemos a exportar el informe de inversión?";
      } else if (q.includes('quien eres') || q.includes('creador') || q.includes('pandora')) {
        responseText = "Soy PANDORA versión 7.89, la inteligencia artificial holográfica y centro neurálgico del ecosistema QUANTICO. Fui programada para optimizar plantas industriales de alta tecnología.";
      }

      // Record latency
      const elapsed = Date.now() - startTime;
      setLatency(elapsed);

      addMessage('avatar', responseText);
      
      if (!isMuted) {
        VoiceEngine.speak(responseText);
      } else {
        setState('IDLE');
      }
    }, 1200);
  };

  const handleReset = () => {
    VoiceEngine.stopListening();
    VoiceEngine.stopSpeaking();
    resetConversation();
  };

  // State border glow toggles
  const getContainerBorderClass = () => {
    switch (currentState) {
      case 'LISTENING': 
        return 'border-cyan-500/50 shadow-[0_0_15px_rgba(0,229,255,0.25)] animate-pulse';
      case 'THINKING': 
        return 'border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.25)]';
      case 'SPEAKING': 
        return 'border-cyan-400/40 shadow-[0_0_12px_rgba(0,229,255,0.15)]';
      case 'ERROR': 
        return 'border-red-500/40 shadow-[0_0_15px_rgba(239,68,68,0.2)]';
      case 'STANDBY': 
        return 'border-slate-800 opacity-60';
      default: 
        return 'border-cyan-500/20';
    }
  };

  const getStateText = () => {
    switch (currentState) {
      case 'LISTENING': return 'ESCUCHANDO...';
      case 'THINKING': return 'ANALIZANDO INTERFAZ...';
      case 'SPEAKING': return 'PANDORA HABLANDO';
      case 'ERROR': return 'ERROR DE CONEXIÓN';
      case 'STANDBY': return 'EN ESPERA';
      default: return 'PANDORA V7.89 IDLE';
    }
  };

  return (
    <div className={`w-full bg-[#070b19]/90 border rounded-2xl p-4 backdrop-blur-xl transition-all duration-300 z-30 ${getContainerBorderClass()}`}>
      
      {/* Messages display (shows last 2 messages for conversational context) */}
      <div className="mb-4 h-16 overflow-y-auto pr-1 text-xs space-y-1.5 scrollbar-thin">
        {messages.slice(-2).map((m, idx) => (
          <div key={idx} className={`flex items-start gap-2 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-3 py-1.5 rounded-xl max-w-[80%] leading-relaxed ${
              m.sender === 'user' 
                ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-200' 
                : 'bg-purple-500/10 border border-purple-500/30 text-purple-200'
            }`}>
              <span className="font-black uppercase tracking-wider text-[8px] block opacity-60 mb-0.5">
                {m.sender === 'user' ? 'TÚ' : 'PANDORA'}
              </span>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row items-center gap-4 justify-between border-t border-cyan-500/10 pt-3">
        {/* Status Indicator */}
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${
            currentState === 'LISTENING' ? 'bg-cyan-400 animate-ping' :
            currentState === 'THINKING' ? 'bg-purple-500 animate-pulse' :
            currentState === 'SPEAKING' ? 'bg-cyan-400 shadow-[0_0_8px_#00e5ff]' :
            currentState === 'ERROR' ? 'bg-red-500' : 
            currentState === 'STANDBY' ? 'bg-slate-600' : 'bg-cyan-500 shadow-[0_0_8px_#00E5FF]'
          }`} />
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 font-mono">
            {getStateText()}
          </span>
        </div>

        {/* Input Text Form */}
        <form onSubmit={handleSendMessage} className="flex-1 w-full max-w-xl flex items-center gap-2 bg-[#030712] border border-cyan-500/15 rounded-xl px-3 py-1.5 focus-within:border-cyan-500/45 transition-colors">
          <input
            type="text"
            placeholder="Habla con PANDORA..."
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              useAvatarStore.getState().resetActivity();
            }}
            className="flex-1 bg-transparent text-xs text-white placeholder-gray-500 outline-none border-none py-1"
          />
          <button 
            type="submit" 
            disabled={!inputText.trim() || currentState === 'THINKING'}
            className="p-1.5 rounded-lg text-cyan-400 hover:text-cyan-200 hover:bg-cyan-500/10 transition-all disabled:opacity-30"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          {/* Microfono */}
          <button
            onClick={handleMicToggle}
            className={`p-2.5 rounded-xl border transition-all ${
              currentState === 'LISTENING'
                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400 shadow-[0_0_10px_rgba(0,229,255,0.2)]'
                : 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400 hover:border-cyan-500/40 hover:bg-cyan-500/10'
            }`}
            title={currentState === 'LISTENING' ? 'Detener micrófono' : 'Activar micrófono'}
          >
            {currentState === 'LISTENING' ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>

          {/* Mute */}
          <button
            onClick={handleMuteToggle}
            className={`p-2.5 rounded-xl border transition-all ${
              isMuted
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-400 shadow-[0_0_10px_rgba(168,85,247,0.2)]'
                : 'bg-cyan-500/5 border-cyan-500/20 text-cyan-400 hover:border-cyan-500/40 hover:bg-cyan-500/10'
            }`}
            title={isMuted ? 'Activar voz artificial' : 'Silenciar voz artificial'}
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Reiniciar conversación */}
          <button
            onClick={handleReset}
            className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all"
            title="Reiniciar conversación"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Pantalla completa */}
          <button
            onClick={handleFullscreenToggle}
            className="p-2.5 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 hover:border-cyan-500/40 hover:bg-cyan-500/10 transition-all"
            title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
