import React, { useRef } from 'react';

export default function SandboxControls({
  config,
  setConfig,
  onUploadImage,
  onResetView,
  onClearScene,
  onSavePreset,
  onCopyConfig
}) {
  const fileInputRef = useRef(null);

  const presets = [
    { id: 'PANDORA_FACE', label: 'Pandora Face' },
    { id: 'PRODUCT_HOLOGRAM', label: 'Product Hologram' },
    { id: 'LOGO_PARTICLES', label: 'Logo Particles' },
    { id: 'TECH_BLUEPRINT', label: 'Tech Blueprint' },
    { id: 'CINEMATIC_GLOW', label: 'Cinematic Glow' }
  ];

  const colorModes = [
    { value: 'ORIGINAL', label: 'Original Colors' },
    { value: 'PANDORA', label: 'Pandora Cyan/Magenta' },
    { value: 'BLUEPRINT', label: 'Blueprint Blue' },
    { value: 'GHOST', label: 'Ghostly Glow' },
    { value: 'THERMAL', label: 'Thermal Spectrum' },
    { value: 'WIREFRAME_POINTS', label: 'Matrix Green' }
  ];

  const depthModes = [
    { value: 'FLAT', label: 'Flat 2D' },
    { value: 'BRIGHTNESS_DEPTH', label: 'Brightness Depth' },
    { value: 'RADIAL_DEPTH', label: 'Radial Depth' },
    { value: 'NOISE_DEPTH', label: 'Noise Depth' },
    { value: 'VOLUMETRIC_FAKE_3D', label: 'Volumetric Fake 3D' }
  ];

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadImage(file);
    }
  };

  return (
    <div className="absolute top-6 right-6 z-30 w-80 max-h-[calc(100vh-120px)] flex flex-col bg-slate-950/90 backdrop-blur-md border border-cyan-500/30 text-white rounded-2xl shadow-2xl overflow-hidden font-sans select-none pointer-events-auto">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-cyan-500/20 bg-slate-900/40">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
          <span className="font-mono text-xs font-black uppercase tracking-widest text-cyan-400">
            Visual Sandbox
          </span>
        </div>
        <button
          onClick={onResetView}
          className="text-[10px] font-mono px-2 py-0.5 rounded border border-slate-700 bg-slate-800/40 hover:bg-cyan-500/10 hover:text-cyan-400 hover:border-cyan-500/30 transition-all uppercase tracking-wider"
        >
          Reset View
        </button>
      </div>

      {/* Control sliders/selectors */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin scrollbar-thumb-slate-800">
        {/* Preset Selector */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Presets</label>
          <div className="grid grid-cols-2 gap-1.5">
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => setConfig(prev => ({ ...prev, preset: preset.id }))}
                className={`px-2.5 py-1.5 font-mono text-[9px] border rounded transition-all uppercase tracking-wider text-center ${
                  config.preset === preset.id
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_8px_rgba(0,229,255,0.15)]'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload Button */}
        <div className="pt-1">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/png, image/jpeg, image/webp, .glb"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 font-mono text-[10px] bg-gradient-to-r from-cyan-500/20 to-purple-600/20 hover:from-cyan-500/30 hover:to-purple-600/30 border border-cyan-400/30 hover:border-cyan-400/60 rounded-xl text-cyan-200 transition-all uppercase tracking-widest font-black text-center shadow-lg"
          >
            Upload Custom Image / GLB
          </button>
        </div>

        <div className="border-t border-slate-800 my-2" />

        {/* Visual Mode Selectors */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Color Mode</label>
          <select
            value={config.colorMode}
            onChange={(e) => setConfig(prev => ({ ...prev, colorMode: e.target.value }))}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
          >
            {colorModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Depth Mode</label>
          <select
            value={config.depthMode}
            onChange={(e) => setConfig(prev => ({ ...prev, depthMode: e.target.value }))}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500/50"
          >
            {depthModes.map((mode) => (
              <option key={mode.value} value={mode.value}>
                {mode.label}
              </option>
            ))}
          </select>
        </div>

        {/* Density & Threshold */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-slate-400 font-mono uppercase tracking-wider">
              <span>Density</span>
              <span className="text-cyan-400">{(config.maxParticles / 1000).toFixed(0)}k</span>
            </div>
            <input
              type="range"
              min={10000}
              max={350000}
              step={10000}
              value={config.maxParticles}
              onChange={(e) => setConfig(prev => ({ ...prev, maxParticles: parseInt(e.target.value) }))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-slate-400 font-mono uppercase tracking-wider">
              <span>Threshold</span>
              <span className="text-cyan-400">{config.threshold}</span>
            </div>
            <input
              type="range"
              min={0}
              max={150}
              step={1}
              value={config.threshold}
              onChange={(e) => setConfig(prev => ({ ...prev, threshold: parseInt(e.target.value) }))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Point Size & Opacity */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-slate-400 font-mono uppercase tracking-wider">
              <span>Point Size</span>
              <span className="text-cyan-400">{config.pointSize.toFixed(3)}</span>
            </div>
            <input
              type="range"
              min={0.002}
              max={0.040}
              step={0.001}
              value={config.pointSize}
              onChange={(e) => setConfig(prev => ({ ...prev, pointSize: parseFloat(e.target.value) }))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-slate-400 font-mono uppercase tracking-wider">
              <span>Opacity</span>
              <span className="text-cyan-400">{config.opacity.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.10}
              max={1.00}
              step={0.05}
              value={config.opacity}
              onChange={(e) => setConfig(prev => ({ ...prev, opacity: parseFloat(e.target.value) }))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Brightness & Contrast */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-slate-400 font-mono uppercase tracking-wider">
              <span>Brightness</span>
              <span className="text-cyan-400">{config.brightness.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={8.0}
              step={0.1}
              value={config.brightness}
              onChange={(e) => setConfig(prev => ({ ...prev, brightness: parseFloat(e.target.value) }))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-slate-400 font-mono uppercase tracking-wider">
              <span>Contrast</span>
              <span className="text-cyan-400">{config.contrast.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.1}
              value={config.contrast}
              onChange={(e) => setConfig(prev => ({ ...prev, contrast: parseFloat(e.target.value) }))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Depth Strength & Scale */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-slate-400 font-mono uppercase tracking-wider">
              <span>Depth</span>
              <span className="text-cyan-400">{config.depthStrength.toFixed(2)}</span>
            </div>
            <input
              type="range"
              min={0.00}
              max={1.50}
              step={0.05}
              value={config.depthStrength}
              onChange={(e) => setConfig(prev => ({ ...prev, depthStrength: parseFloat(e.target.value) }))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-slate-400 font-mono uppercase tracking-wider">
              <span>Scale</span>
              <span className="text-cyan-400">{config.scale.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.5}
              max={5.0}
              step={0.1}
              value={config.scale}
              onChange={(e) => setConfig(prev => ({ ...prev, scale: parseFloat(e.target.value) }))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Rotation Controls Group */}
        <div className="space-y-2.5 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
          <div className="flex justify-between text-[10px] font-mono text-slate-300 uppercase tracking-wider">
            <span>Rotation Controls</span>
          </div>
          
          {/* Rotation Speed */}
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] text-slate-400 font-mono uppercase tracking-wider">
              <span>Speed</span>
              <span className="text-cyan-400">{config.rotationSpeed.toFixed(1)}</span>
            </div>
            <input
              type="range"
              min={0.0}
              max={3.0}
              step={0.1}
              value={config.rotationSpeed}
              onChange={(e) => setConfig(prev => ({ ...prev, rotationSpeed: parseFloat(e.target.value) }))}
              className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
            />
          </div>

          {/* Rotation Axis */}
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Rotation Axis</label>
            <div className="grid grid-cols-4 gap-1">
              {['Y', 'X', 'Z', 'DIAGONAL'].map((axis) => (
                <button
                  key={axis}
                  onClick={() => setConfig(prev => ({ ...prev, rotationAxis: axis }))}
                  className={`py-1 font-mono text-[8px] border rounded transition-all uppercase tracking-wider text-center ${
                    config.rotationAxis === axis
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold shadow-[0_0_8px_rgba(0,229,255,0.15)]'
                      : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-white'
                  }`}
                >
                  {axis}
                </button>
              ))}
            </div>
          </div>

          {/* Rotation Direction Selector */}
          <div className="space-y-1">
            <label className="text-[9px] font-mono text-slate-400 uppercase tracking-wider">Direction</label>
            <div className="grid grid-cols-3 gap-1">
              <button
                onClick={() => setConfig(prev => ({ ...prev, rotationDirection: 'RIGHT_TO_LEFT' }))}
                className={`py-1 font-mono text-[8px] border rounded transition-all uppercase tracking-wider text-center ${
                  config.rotationDirection === 'RIGHT_TO_LEFT'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                    : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                ← Left
              </button>
              <button
                onClick={() => setConfig(prev => ({ ...prev, rotationDirection: 'STATIC' }))}
                className={`py-1 font-mono text-[8px] border rounded transition-all uppercase tracking-wider text-center ${
                  config.rotationDirection === 'STATIC'
                    ? 'bg-red-500/20 border-red-500 text-red-200 font-bold shadow-[0_0_8px_rgba(239,68,68,0.2)]'
                    : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Pause ‖
              </button>
              <button
                onClick={() => setConfig(prev => ({ ...prev, rotationDirection: 'LEFT_TO_RIGHT' }))}
                className={`py-1 font-mono text-[8px] border rounded transition-all uppercase tracking-wider text-center ${
                  config.rotationDirection === 'LEFT_TO_RIGHT'
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                    : 'bg-slate-950 border-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                Right →
              </button>
            </div>
          </div>
        </div>


        {/* Holographic Parallax and Vibration Controls (Only visible for PANDORA_FACE) */}
        {config.preset === 'PANDORA_FACE' && (
          <div className="space-y-3 p-3 bg-slate-900/60 rounded-xl border border-slate-800/80">
            <div className="flex justify-between text-[10px] font-mono text-slate-300 uppercase tracking-wider">
              <span>Hologram Controls</span>
            </div>

            {/* Parallax Strength */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-slate-400 font-mono uppercase tracking-wider">
                <span>Parallax Strength</span>
                <span className="text-cyan-400">{(config.parallaxStrength ?? 0.06).toFixed(3)}</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={0.20}
                step={0.005}
                value={config.parallaxStrength ?? 0.06}
                onChange={(e) => setConfig(prev => ({ ...prev, parallaxStrength: parseFloat(e.target.value) }))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
              />
            </div>

            {/* Shimmer */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-slate-400 font-mono uppercase tracking-wider">
                <span>Shimmer</span>
                <span className="text-cyan-400">{(config.shimmer ?? 0.5).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.05}
                value={config.shimmer ?? 0.5}
                onChange={(e) => setConfig(prev => ({ ...prev, shimmer: parseFloat(e.target.value) }))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
              />
            </div>

            {/* Audio Pulse */}
            <div className="space-y-1">
              <div className="flex justify-between text-[9px] text-slate-400 font-mono uppercase tracking-wider">
                <span>Audio Pulse</span>
                <span className="text-cyan-400">{(config.audioPulse ?? 0.4).toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.0}
                max={1.0}
                step={0.05}
                value={config.audioPulse ?? 0.4}
                onChange={(e) => setConfig(prev => ({ ...prev, audioPulse: parseFloat(e.target.value) }))}
                className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
              />
            </div>
          </div>
        )}

        <div className="flex justify-between items-center py-1 bg-slate-900/40 rounded-xl border border-slate-800 px-3">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Explode Mode</span>
          <button
            onClick={() => setConfig(prev => ({ ...prev, exploded: !prev.exploded }))}
            className={`px-3 py-1 font-mono text-[9px] border rounded transition-all uppercase tracking-wider font-bold ${
              config.exploded
                ? 'bg-red-500/20 border-red-500 text-red-200'
                : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            {config.exploded ? 'Exploded' : 'Normal'}
          </button>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-cyan-500/10 bg-slate-900/30 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onSavePreset}
            className="py-2 font-mono text-[9px] bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-all uppercase tracking-wider font-bold"
          >
            Save Preset
          </button>
          <button
            onClick={onCopyConfig}
            className="py-2 font-mono text-[9px] bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-xl text-slate-300 transition-all uppercase tracking-wider font-bold"
          >
            Copy Config
          </button>
        </div>
        <button
          onClick={onClearScene}
          className="w-full py-1.5 font-mono text-[9px] bg-red-950/20 hover:bg-red-950/40 border border-red-900/40 hover:border-red-900 rounded-xl text-red-400 transition-all uppercase tracking-wider font-black"
        >
          Clear Scene
        </button>
      </div>
    </div>
  );
}
