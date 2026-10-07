import { useAvatarStore } from './AvatarState';

export function getAudioBands(analyser, dataArray, sampleRate = 44100) {
  const binWidth = sampleRate / (analyser.fftSize);
  
  let lowSum = 0, lowCount = 0;
  let midSum = 0, midCount = 0;
  let highSum = 0, highCount = 0;
  let overallSum = 0;

  for (let i = 0; i < dataArray.length; i++) {
    const freq = i * binWidth;
    const val = dataArray[i];
    overallSum += val;

    if (freq >= 20 && freq <= 250) {
      lowSum += val;
      lowCount++;
    } else if (freq > 250 && freq <= 3000) {
      midSum += val;
      midCount++;
    } else if (freq > 3000 && freq <= 8000) {
      highSum += val;
      highCount++;
    }
  }

  const overall = overallSum / (dataArray.length * 180); // slight boost
  const low = lowCount > 0 ? (lowSum / (lowCount * 220)) : 0;
  const mid = midCount > 0 ? (midSum / (midCount * 200)) : 0;
  const high = highCount > 0 ? (highSum / (highCount * 180)) : 0;

  return {
    low: Math.min(low, 1.0),
    mid: Math.min(mid, 1.0),
    high: Math.min(high, 1.0),
    overall: Math.min(overall, 1.0)
  };
}

class VoiceEngineManager {
  constructor() {
    this.audioContext = null;
    this.analyser = null;
    this.microphoneStream = null;
    this.animationFrameId = null;
    this.isListening = false;
    this.synthesis = window.speechSynthesis;
    this.currentUtterance = null;
  }

  async startListening() {
    if (this.isListening) return;
    
    try {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.microphoneStream = stream;

      const source = this.audioContext.createMediaStreamSource(stream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      this.isListening = true;
      useAvatarStore.getState().setState('LISTENING');

      const bufferLength = this.analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      const sampleRate = this.audioContext.sampleRate;

      const updateMicLevel = () => {
        if (!this.isListening) return;
        this.analyser.getByteFrequencyData(dataArray);
        
        const bands = getAudioBands(this.analyser, dataArray, sampleRate);

        useAvatarStore.getState().setAudioAmplitude(bands.overall);
        useAvatarStore.getState().setAudioBands(bands);

        this.animationFrameId = requestAnimationFrame(updateMicLevel);
      };

      updateMicLevel();
    } catch (error) {
      console.error('Microphone error:', error);
      useAvatarStore.getState().setState('ERROR');
      useAvatarStore.getState().addMessage('avatar', 'No pude acceder al micrófono. Por favor verifica tus permisos.');
    }
  }

  stopListening() {
    this.isListening = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    if (this.microphoneStream) {
      this.microphoneStream.getTracks().forEach(track => track.stop());
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
    }
    useAvatarStore.getState().setAudioAmplitude(0);
    useAvatarStore.getState().setAudioBands({ low: 0, mid: 0, high: 0, overall: 0 });
  }

  speak(text, onEndCallback) {
    if (!this.synthesis) return;
    this.stopSpeaking();

    useAvatarStore.getState().setState('SPEAKING');
    useAvatarStore.getState().resetActivity();

    this.currentUtterance = new SpeechSynthesisUtterance(text);
    
    const voices = this.synthesis.getVoices();
    const googleVoice = voices.find(v => v.lang.includes('es') && v.name.includes('Google'));
    const defaultVoice = voices.find(v => v.lang.includes('es'));
    this.currentUtterance.voice = googleVoice || defaultVoice || null;
    this.currentUtterance.rate = 1.0;
    this.currentUtterance.pitch = 1.1;

    let speakInterval = null;
    this.currentUtterance.onstart = () => {
      speakInterval = setInterval(() => {
        // Simulate bands to drive separate parts of face (low, mid, high, overall)
        const overall = 0.25 + Math.random() * 0.75;
        const low = overall * (0.8 + Math.random() * 0.2);
        const mid = overall * (0.65 + Math.random() * 0.3);
        const high = overall * (0.45 + Math.random() * 0.45);

        useAvatarStore.getState().setAudioAmplitude(overall);
        useAvatarStore.getState().setAudioBands({ low, mid, high, overall });
      }, 70);
    };

    const cleanup = () => {
      if (speakInterval) {
        clearInterval(speakInterval);
      }
      useAvatarStore.getState().setAudioAmplitude(0);
      useAvatarStore.getState().setAudioBands({ low: 0, mid: 0, high: 0, overall: 0 });
      useAvatarStore.getState().setState('IDLE');
      if (onEndCallback) onEndCallback();
    };

    this.currentUtterance.onend = cleanup;
    this.currentUtterance.onerror = cleanup;

    this.synthesis.speak(this.currentUtterance);
  }

  stopSpeaking() {
    if (this.synthesis) {
      this.synthesis.cancel();
    }
    useAvatarStore.getState().setAudioAmplitude(0);
    useAvatarStore.getState().setAudioBands({ low: 0, mid: 0, high: 0, overall: 0 });
  }
}

export const VoiceEngine = new VoiceEngineManager();
export default VoiceEngine;
