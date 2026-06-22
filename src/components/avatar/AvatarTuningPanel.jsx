import React, { useState } from 'react';
import { useAvatarStore } from './AvatarState';

export default function AvatarTuningPanel() {
  const avatarTuning = useAvatarStore(state => state.avatarTuning);
  const setAvatarTuning = useAvatarStore(state => state.setAvatarTuning);
  const resetAvatarTuning = useAvatarStore(state => state.resetAvatarTuning);
  const applyAvatarPreset = useAvatarStore(state => state.applyAvatarPreset);

  // Default: open in development mode, collapsed in production
  const [isOpen, setIsOpen] = useState(() => {
    try {
      return import.meta.env.DEV;
    } catch (e) {
      return false;
    }
  });

  const controls = [
    { key: 'brightness', label: 'Brightness', min: 0.5, max: 8.0, step: 0.1 },
    { key: 'contrast', label: 'Contrast', min: 0.5, max: 5.0, step: 0.1 },
    { key: 'pointSize', label: 'Point Size', min: 0.004, max: 0.05, step: 0.001 },
    { key: 'opacity', label: 'Opacity', min: 0.1, max: 1.0, step: 0.05 },
    { key: 'scale', label: 'Scale', min: 0.1, max: 5.0, step: 0.1 },
    { key: 'threshold', label: 'Threshold', min: 0, max: 120, step: 1 },
    { key: 'saturationBoost', label: 'Saturation Boost', min: 0.5, max: 5.0, step: 0.1 },
    { key: 'glow', label: 'Glow Strength', min: 0, max: 5, step: 0.1 },
    { key: 'depth', label: 'Depth Depth', min: 0, max: 1.0, step: 0.05 },
    { key: 'noise', label: 'Noise Jitter', min: 0, max: 0.4, step: 0.01 },
    { key: 'magentaStrength', label: 'Magenta Power', min: 0, max: 5.0, step: 0.1 },
    { key: 'cyanStrength', label: 'Cyan Power', min: 0, max: 5.0, step: 0.1 },
    { key: 'cameraZ', label: 'Camera Distance', min: 1.5, max: 15.0, step: 0.1 },
    { key: 'cameraFov', label: 'Camera FOV', min: 20, max: 55, step: 1 },
    { key: 'positionX', label: 'Offset X', min: -2.0, max: 2.0, step: 0.05 },
    { key: 'positionY', label: 'Offset Y', min: -2.0, max: 2.0, step: 0.05 }
  ];

  const handleCopyConfig = () => {
    const configStr = JSON.stringify(avatarTuning, null, 2);
    navigator.clipboard.writeText(configStr)
      .then(() => {
        alert("Configuration copied to clipboard!");
      })
      .catch((err) => {
        console.error("Could not copy config: ", err);
      });
  };

  const handleSavePreset = () => {
    localStorage.setItem('pandora-avatar-preset-custom', JSON.stringify(avatarTuning));
    alert("Custom preset saved to localStorage!");
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="absolute bottom-4 right-4 z-40 font-mono text-[11px] text-[#00E5FF] bg-slate-950/90 border border-[#00E5FF]/40 px-3 py-2 rounded shadow-[0_0_15px_rgba(0,229,255,0.25)] hover:bg-[#00E5FF]/10 transition-colors uppercase tracking-widest"
      >
        Show Tuning Panel
      </button>
    );
  }

  return (
    <div className="absolute bottom-4 right-4 z-40 w-72 max-h-[75vh] flex flex-col bg-slate-950/90 backdrop-blur-md border border-[#00E5FF]/30 text-white rounded-lg shadow-2xl overflow-hidden font-sans select-none">
      
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#00E5FF]/20 bg-slate-900/60">
        <span className="font-mono text-xs font-bold uppercase tracking-widest text-[#00E5FF]">
          Avatar Tuning
        </span>
        <button
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-[#00E5FF] transition-colors text-xs font-mono px-2 py-0.5 rounded border border-slate-700/60 hover:border-[#00E5FF]/30 bg-slate-800/40"
        >
          Collapse
        </button>
      </div>

      {/* Sliders Area */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3.5 scrollbar-thin scrollbar-thumb-slate-800">
        {controls.map(({ key, label, min, max, step }) => {
          const val = avatarTuning[key] !== undefined ? avatarTuning[key] : min;
          return (
            <div key={key} className="space-y-1">
              <div className="flex justify-between text-[11px] text-slate-300 font-mono">
                <span>{label}</span>
                <span className="text-[#00E5FF]">{val}</span>
              </div>
              <input
                type="range"
                min={min}
                max={max}
                step={step}
                value={val}
                onChange={(e) => setAvatarTuning(key, parseFloat(e.target.value))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#00E5FF] focus:outline-none"
              />
            </div>
          );
        })}
      </div>

      {/* Action Buttons */}
      <div className="p-3 border-t border-[#00E5FF]/10 bg-slate-900/40 space-y-2">
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => applyAvatarPreset('HIGH_VISIBILITY')}
            className="px-2 py-1.5 font-mono text-[9px] bg-[#C026FF]/15 hover:bg-[#C026FF]/25 border border-[#C026FF]/40 rounded text-[#D980FF] transition-colors uppercase tracking-wider text-center"
          >
            High Vis
          </button>
          <button
            onClick={() => applyAvatarPreset('REFERENCE_LOOK')}
            className="px-2 py-1.5 font-mono text-[9px] bg-[#00E5FF]/15 hover:bg-[#00E5FF]/25 border border-[#00E5FF]/40 rounded text-[#70FAFF] transition-colors uppercase tracking-wider text-center"
          >
            Ref Look
          </button>
        </div>

        <div className="grid grid-cols-3 gap-1">
          <button
            onClick={resetAvatarTuning}
            className="py-1 font-mono text-[9px] bg-slate-850 hover:bg-slate-800 border border-slate-700/80 rounded text-slate-300 transition-colors uppercase"
          >
            Reset
          </button>
          <button
            onClick={handleSavePreset}
            className="py-1 font-mono text-[9px] bg-slate-850 hover:bg-slate-800 border border-slate-700/80 rounded text-slate-300 transition-colors uppercase"
          >
            Save
          </button>
          <button
            onClick={handleCopyConfig}
            className="py-1 font-mono text-[9px] bg-slate-850 hover:bg-slate-800 border border-slate-700/80 rounded text-slate-300 transition-colors uppercase"
          >
            Copy
          </button>
        </div>
      </div>

    </div>
  );
}
