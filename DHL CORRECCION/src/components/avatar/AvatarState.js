import { create } from 'zustand';

const DEFAULT_TUNING = {
  brightness: 3.5,
  contrast: 2.2,
  pointSize: 0.010,
  opacity: 0.98,
  scale: 2.5,
  threshold: 20,
  saturationBoost: 2.5,
  glow: 2.0,
  depth: 0.35,
  noise: 0.08,
  magentaStrength: 2.8,
  cyanStrength: 3.2,
  cameraZ: 2.5,
  cameraFov: 30,
  positionX: 0.0,
  positionY: 0.0
};

const getInitialTuning = () => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('pandora-avatar-tuning');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Automatically migrate old default values to avoid screen-filling projection
        if (parsed.scale === 2.8 || parsed.scale === 1.0 || parsed.scale === 2.4 || parsed.scale === undefined) parsed.scale = 2.5;
        if (parsed.cameraZ === 2.25 || parsed.cameraZ === 4.5 || parsed.cameraZ === 2.8 || parsed.cameraZ === 2.9 || parsed.cameraZ === undefined) parsed.cameraZ = 2.5;
        if (parsed.pointSize === 0.018 || parsed.pointSize === 0.012 || parsed.pointSize === 0.008 || parsed.pointSize === undefined) parsed.pointSize = 0.010;
        if (parsed.opacity === 1.0 || parsed.opacity === 0.95 || parsed.opacity === undefined) parsed.opacity = 0.98;
        if (parsed.positionY === 0.15 || parsed.positionY === undefined) parsed.positionY = 0.0;
        return { ...DEFAULT_TUNING, ...parsed };
      } catch (e) {
        console.error("Failed to parse saved tuning", e);
      }
    }
  }
  return DEFAULT_TUNING;
};

export const useAvatarStore = create((set, get) => ({
  currentState: 'IDLE', // 'IDLE', 'LISTENING', 'THINKING', 'SPEAKING', 'ERROR', 'STANDBY'
  isMuted: false,
  isFullscreen: false,
  audioAmplitude: 0,
  audioBands: { low: 0, mid: 0, high: 0, overall: 0 },
  fps: 60,
  latency: 0,
  quality: 'high', // 'high' | 'medium' | 'low'
  lastActivityTime: Date.now(),
  isInactivityMode: false,
  messages: [
    { sender: 'avatar', text: 'Hola, soy PANDORA. ¿En qué puedo ayudarte hoy?' }
  ],

  // Tuning Panel State
  avatarTuning: getInitialTuning(),

  setAvatarTuning: (key, value) => {
    set((state) => {
      const updated = {
        ...state.avatarTuning,
        [key]: value
      };
      if (typeof window !== 'undefined') {
        localStorage.setItem('pandora-avatar-tuning', JSON.stringify(updated));
      }
      return { avatarTuning: updated };
    });
  },

  resetAvatarTuning: () => {
    set({ avatarTuning: DEFAULT_TUNING });
    if (typeof window !== 'undefined') {
      localStorage.setItem('pandora-avatar-tuning', JSON.stringify(DEFAULT_TUNING));
    }
  },

  applyAvatarPreset: (presetName) => {
    let preset = {};
    if (presetName === 'HIGH_VISIBILITY') {
      preset = {
        brightness: 6,
        contrast: 3.5,
        pointSize: 0.026,
        opacity: 1,
        scale: 3.3,
        threshold: 6,
        saturationBoost: 3.5,
        glow: 4,
        depth: 0.42,
        noise: 0.12,
        magentaStrength: 3.5,
        cyanStrength: 4,
        cameraZ: 2,
        cameraFov: 26,
        positionX: 0,
        positionY: 0.2
      };
    } else if (presetName === 'REFERENCE_LOOK') {
      preset = {
        brightness: 4.5,
        contrast: 2.8,
        pointSize: 0.018,
        opacity: 1,
        scale: 3,
        threshold: 10,
        saturationBoost: 3,
        glow: 3,
        depth: 0.35,
        noise: 0.08,
        magentaStrength: 3.2,
        cyanStrength: 3.5,
        cameraZ: 2.25,
        cameraFov: 28,
        positionX: 0,
        positionY: 0.15
      };
    } else {
      return;
    }
    set({ avatarTuning: preset });
    if (typeof window !== 'undefined') {
      localStorage.setItem('pandora-avatar-tuning', JSON.stringify(preset));
    }
  },

  setState: (state) => {
    set({ currentState: state });
    get().resetActivity();
  },

  setMuted: (muted) => set({ isMuted: muted }),
  setFullscreen: (fullscreen) => set({ isFullscreen: fullscreen }),
  setAudioAmplitude: (amplitude) => set({ audioAmplitude: amplitude }),
  setAudioBands: (bands) => set({ audioBands: bands }),
  setFps: (fps) => set({ fps }),
  setLatency: (latency) => set({ latency }),
  setQuality: (quality) => set({ quality }),

  resetActivity: () => {
    set({ 
      lastActivityTime: Date.now(),
      isInactivityMode: false 
    });
  },

  setInactivityMode: (mode) => {
    set({ isInactivityMode: mode });
    if (mode) {
      set({ currentState: 'STANDBY' });
    } else if (get().currentState === 'STANDBY') {
      set({ currentState: 'IDLE' });
    }
  },

  addMessage: (sender, text) => {
    set((state) => ({
      messages: [...state.messages, { sender, text }]
    }));
    get().resetActivity();
  },

  resetConversation: () => {
    set({
      currentState: 'IDLE',
      audioAmplitude: 0,
      audioBands: { low: 0, mid: 0, high: 0, overall: 0 },
      lastActivityTime: Date.now(),
      isInactivityMode: false,
      latency: 0,
      messages: [
        { sender: 'avatar', text: 'Conexión reiniciada. Estoy lista para escuchar.' }
      ]
    });
  }
}));
