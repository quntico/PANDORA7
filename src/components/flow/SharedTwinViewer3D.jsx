import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import EquipmentWrapper from './Equipment3DModel';
import Connection3DArrow from './Connection3DArrow';
import { LayoutModel } from './LayoutLoader';
import { Box, Play, Pause, RotateCcw, Activity, RefreshCw, AlertTriangle, Maximize, Minimize, Camera, Upload, RotateCw, Palette, X, Check, Sliders, Sun, Grid3X3, Compass, Sparkles, Download, Minimize2, Maximize2, Square, Circle } from 'lucide-react';

// ── Detección proactiva de soporte WebGL ──────────────────────────────────────
function checkWebGLSupport() {
  try {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!ctx) return false;
    // Verificar que no hay ya demasiados contextos activos (límite típico del browser: 16)
    canvas.remove();
    return true;
  } catch (e) {
    return false;
  }
}

// ── Error Boundary para errores de React/Three en runtime ────────────────────
class TwinErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorMsg: error?.message || '' };
  }

  componentDidCatch(error, errorInfo) {
    console.error("TwinErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <TwinFallbackUI 
          height={this.props.height} 
          errorMsg={this.state.errorMsg}
          onRetry={() => this.setState({ hasError: false, errorMsg: '' })}
        />
      );
    }
    return this.props.children;
  }
}

// ── Componente de Fallback Visual ────────────────────────────────────────────
function TwinFallbackUI({ height, errorMsg, onRetry }) {
  return (
    <div 
      className="flex flex-col items-center justify-center p-8 bg-[#05070f] border border-[#1A1A1A] rounded-[24px] text-center"
      style={{ height: height || '360px' }}
    >
      <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-full px-3 py-1 mb-4">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse" />
        <span className="text-[8px] font-black uppercase tracking-widest text-red-500">Error de Gráficos 3D</span>
      </div>
      <AlertTriangle className="w-10 h-10 text-red-400 mb-3 opacity-60" />
      <h4 className="text-xs font-black uppercase tracking-widest text-white">Visualización 3D Desactivada</h4>
      <p className="text-[10px] text-gray-400 max-w-xs mt-2 leading-relaxed">
        No se pudo inicializar el contexto WebGL. Esto puede ocurrir cuando hay demasiadas ventanas 3D abiertas simultáneamente. 
        Intenta recargar o hacer clic en "Reintentar".
      </p>
      {errorMsg && (
        <p className="text-[9px] text-red-400/60 max-w-xs mt-1 font-mono break-all">{errorMsg}</p>
      )}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 flex items-center gap-2 px-4 py-2 bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Reintentar
        </button>
      )}
    </div>
  );
}

// ── Escena Interna del Canvas ─────────────────────────────────────────────────
function TwinScene({ 
  nodes, edges, layout, isPlaying, 
  isFxEnabled, interactive,
  editMode, selectedNodeId, onSelectNode, onUpdateNode,
  labelHeightOffset, labelsCollapsed,
  autoRotate = false,
  autoRotateSpeed = 2.0,
  theme = 'dark',
  lightIntensity = 1.0,
  showFloorPlane = 'reflective',
  extraFills = true,
  sunAngle = 45,
  customRoughness = 0.25,
  customMetalness = 0.95,
  customOutlineOpacity = 0.0
}) {
  const isBlueprint = theme === 'blueprint';
  const isToxic = theme === 'toxic';
  const isAluminum = theme === 'aluminum';
  const isCustom = typeof theme === 'object' && theme !== null;
  const { camera } = useThree();
  const controlsRef = useRef();

  // Cargar estado inicial de la cámara al montar
  useEffect(() => {
    if (!layout || !layout.url) return;
    const cameraKey = `camera_state_${layout.url.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const saved = localStorage.getItem(cameraKey);
    if (saved) {
      try {
        const { position, target } = JSON.parse(saved);
        if (position) {
          camera.position.set(position.x, position.y, position.z);
        }
        if (target && controlsRef.current) {
          controlsRef.current.target.set(target.x, target.y, target.z);
          controlsRef.current.update();
        }
      } catch (e) {
        console.error("Error cargando cámara:", e);
      }
    } else {
      camera.position.set(0, 10, 15);
      if (controlsRef.current) {
        controlsRef.current.target.set(0, 0, 0);
        controlsRef.current.update();
      }
    }
  }, [layout, camera]);

  const handleControlsChange = useCallback(() => {
    if (!layout || !layout.url) return;
    const cameraKey = `camera_state_${layout.url.replace(/[^a-zA-Z0-9]/g, '_')}`;
    const state = {
      position: {
        x: camera.position.x,
        y: camera.position.y,
        z: camera.position.z
      },
      target: controlsRef.current ? {
        x: controlsRef.current.target.x,
        y: controlsRef.current.target.y,
        z: controlsRef.current.target.z
      } : { x: 0, y: 0, z: 0 }
    };
    localStorage.setItem(cameraKey, JSON.stringify(state));
  }, [layout, camera]);

  const angleRad = (sunAngle * Math.PI) / 180;
  const sunX = 15 * Math.cos(angleRad);
  const sunZ = 15 * Math.sin(angleRad);

  return (
    <>
      <PerspectiveCamera makeDefault fov={50} />
      <ambientLight intensity={(isBlueprint ? 1.0 : 0.4) * lightIntensity} />
      <directionalLight 
        position={[sunX, 15, sunZ]} 
        intensity={(isBlueprint ? 1.5 : 1.2) * lightIntensity} 
        castShadow 
        shadow-mapSize-width={1024} 
        shadow-mapSize-height={1024} 
      />
      <pointLight position={[-10, 5, -10]} intensity={(isBlueprint ? 0.8 : 0.5) * lightIntensity} color={isBlueprint ? "#0d9488" : "#00F0FF"} />
      
      {/* Luces Auxiliares de Relleno para Máxima Visibilidad */}
      {extraFills && (
        <directionalLight 
          position={[-10, 10, 15]} 
          intensity={1.5 * lightIntensity} 
          color="#ffffff" 
        />
      )}
      {extraFills && (
        <pointLight 
          position={[0, -5, 10]} 
          intensity={0.6 * lightIntensity} 
          color="#ffffff" 
        />
      )}

      {/* Modelo de Planta 3D */}
      {layout && (
        <LayoutModel 
          layout={layout} 
          scale={layout.scale || 1} 
          elevation={layout.elevation || 0} 
          fxEnabled={isBlueprint ? true : isFxEnabled} 
          theme={theme}
          customMetalness={customMetalness}
          customRoughness={customRoughness}
          customOutlineOpacity={customOutlineOpacity}
        />
      )}

      {/* Equipos */}
      {nodes.map((node, index) => (
        <EquipmentWrapper
          key={node.id}
          node={node}
          index={index}
          isSelected={editMode && selectedNodeId === node.id}
          onClick={() => {
            if (editMode && onSelectNode) onSelectNode(node.id);
          }}
          onUpdate={(id, updatedData) => {
            if (onUpdateNode) onUpdateNode(id, updatedData);
          }}
          isCollapsed={labelsCollapsed}
          heightOffset={labelHeightOffset}
        />
      ))}

      {/* Grid de Ingeniería */}
      {showFloorPlane !== 'none' && (
        <Grid
          position={[0, -0.01, 0]}
          args={[50, 50]}
          cellSize={1}
          cellThickness={isBlueprint ? 0.6 : isToxic ? 0.4 : isAluminum ? 0.3 : 0.5}
          cellColor={isCustom ? (theme.gridBg || '#1e293b') : isBlueprint ? "#b2f5ea" : isToxic ? "#2c302e" : isAluminum ? "#1e2228" : "#1a2536"}
          sectionSize={5}
          sectionThickness={isBlueprint ? 1.2 : isToxic ? 0.8 : isAluminum ? 0.6 : 1}
          sectionColor={isCustom ? (theme.grid || theme.wireframe) : isBlueprint ? "#0d9488" : isToxic ? "#84cc16" : isAluminum ? "#334155" : "#00F0FF"}
          fadeDistance={45}
          fadeStrength={1}
        />
      )}

      {/* Piso CAD Industrial (Sólido o Reflectivo pulido) */}
      {showFloorPlane !== 'none' && showFloorPlane !== 'grid' && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.015, 0]} receiveShadow>
          <planeGeometry args={[2000, 2000]} />
          <meshStandardMaterial 
            color={
              isBlueprint 
                ? "#edf4f9" 
                : isToxic 
                  ? "#08090a" 
                  : isAluminum 
                    ? "#111317" 
                    : isCustom 
                      ? (theme.bg || "#05070f") 
                      : "#05070f"
            } 
            roughness={showFloorPlane === 'reflective' ? 0.12 : 0.9}
            metalness={showFloorPlane === 'reflective' ? 0.85 : 0.0}
          />
        </mesh>
      )}

      {interactive && (
        <OrbitControls 
          ref={controlsRef}
          onChange={handleControlsChange}
          enablePan={true} 
          enableZoom={true} 
          maxPolarAngle={Math.PI / 2 - 0.05} 
          autoRotate={autoRotate}
          autoRotateSpeed={autoRotateSpeed}
        />
      )}
    </>
  );
}

// ── Componente Principal ──────────────────────────────────────────────────────
export default function SharedTwinViewer3D({ 
  className = '', 
  height = '500px', 
  interactive = true, 
  customLayout = null, 
  customNodes = null, 
  customEdges = null,
  showControls = true,
  editMode = false,
  selectedNodeId = null,
  onSelectNode = null,
  onUpdateNode = null,
  labelHeightOffset = 0.2,
  labelsCollapsed = false,
  onFileDrop = null,
  theme = 'dark',
  onThemeChange = null,
  storagePrefix = ''
}) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [layout, setLayout] = useState(null);
  const [isFxEnabled, setIsFxEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [canvasKey, setCanvasKey] = useState(0);
  const [webglSupported, setWebglSupported] = useState(true);
  const [canvasError, setCanvasError] = useState(null);
  const [rotationLevel, setRotationLevel] = useState(0); // 0 = OFF, 1 = 1x, 2 = 2x, 3 = 3x
  const [lightIntensity, setLightIntensity] = useState(1.0);
  const [showFloorPlane, setShowFloorPlane] = useState('reflective');
  const [extraFills, setExtraFills] = useState(true);
  const [sunAngle, setSunAngle] = useState(45);
  const [customRoughness, setCustomRoughness] = useState(0.25);
  const [customMetalness, setCustomMetalness] = useState(0.95);
  const [customOutlineOpacity, setCustomOutlineOpacity] = useState(0.0);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // --- GRABADOR DE PANTALLA PROFESIONAL ---
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState("00:00");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(0);
  const accumulatedTimeRef = useRef(0);
  const canvasRef = useRef(null);

  const startTimer = useCallback(() => {
    startTimeRef.current = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTimeRef.current + accumulatedTimeRef.current;
      const secs = Math.floor(elapsed / 1000);
      const mm = String(Math.floor(secs / 60)).padStart(2, '0');
      const ss = String(secs % 60).padStart(2, '0');
      setRecordingTime(`${mm}:${ss}`);
    }, 1000);
  }, []);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(() => {
    try {
      const canvas = canvasRef.current || containerRef.current?.querySelector('canvas');
      if (!canvas) {
        alert("No se encontró el lienzo 3D para grabar.");
        return;
      }

      chunksRef.current = [];
      const stream = canvas.captureStream(60); // 60 FPS ultra fluido

      let mimeType = 'video/webm;codecs=vp9';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }

      const recorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 15000000 // 15 Mbps de calidad profesional nítida
      });

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (chunksRef.current.length === 0) return;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const extension = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `pandora_digital_twin_rec_${Date.now()}.${extension}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        setIsRecording(false);
        setIsPaused(false);
        setRecordingTime("00:00");
      };

      mediaRecorderRef.current = recorder;
      recorder.start(250);

      setIsRecording(true);
      setIsPaused(false);
      setRecordingTime("00:00");
      accumulatedTimeRef.current = 0;
      startTimer();

    } catch (err) {
      console.error("Error al iniciar la grabación:", err);
      alert("Error al iniciar el grabador: " + err.message);
    }
  }, [startTimer]);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
      accumulatedTimeRef.current += Date.now() - startTimeRef.current;
    }
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      startTimer();
    }
  }, [startTimer]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && (mediaRecorderRef.current.state === 'recording' || mediaRecorderRef.current.state === 'paused')) {
      mediaRecorderRef.current.stop();
      stopTimer();
    }
  }, [stopTimer]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);


  // --- ESTADO LOCAL DE TEMA PARA SOPORTAR BLUEPRINT, CLASICO Y TOXIC CAD ---
  const [activeTheme, setActiveTheme] = useState(theme);
  const [showThemePopover, setShowThemePopover] = useState(false);
  const [showCustomizer, setShowCustomizer] = useState(false);
  const [dragOverPalette, setDragOverPalette] = useState(false);
  const [customPalette, setCustomPalette] = useState({
    body: '#6b7280',
    wireframe: '#84cc16',
    glass: '#84cc16',
    bg: '#0d0d0e',
    grid: '#84cc16'
  });

  useEffect(() => {
    setActiveTheme(theme);
    if (typeof theme === 'object' && theme !== null) {
      setCustomPalette(prev => ({ ...prev, ...theme }));
    }
  }, [theme]);

  const handlePaletteImageUpload = (file) => {
    const reader = new FileReader();
    reader.onload = function(e) {
      const img = new Image();
      img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 100;
        canvas.height = 100;
        ctx.drawImage(img, 0, 0, 100, 100);
        
        const imgData = ctx.getImageData(0, 0, 100, 100).data;
        const colorCounts = {};
        const step = 4;
        
        for (let i = 0; i < imgData.length; i += 4 * step) {
          const r = imgData[i];
          const g = imgData[i+1];
          const b = imgData[i+2];
          const a = imgData[i+3];
          if (a < 200) continue;
          
          const qr = Math.round(r / 16) * 16;
          const qg = Math.round(g / 16) * 16;
          const qb = Math.round(b / 16) * 16;
          
          const hex = "#" + ((1 << 24) + (qr << 16) + (qg << 8) + qb).toString(16).slice(1);
          colorCounts[hex] = (colorCounts[hex] || 0) + 1;
        }
        
        const sortedColors = Object.keys(colorCounts).sort((a, b) => colorCounts[b] - colorCounts[a]);
        const extracted = sortedColors.slice(0, 5);
        
        const sortedByLuminance = extracted.map(hex => {
          const r = parseInt(hex.slice(1, 3), 16);
          const g = parseInt(hex.slice(3, 5), 16);
          const b = parseInt(hex.slice(5, 7), 16);
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          return { hex, luminance };
        }).sort((a, b) => a.luminance - b.luminance);
        
        const darkColor = sortedByLuminance[0]?.hex || '#0d0d0e';
        const bodyColor = sortedByLuminance[1]?.hex || '#6b7280';
        const brightColor = sortedByLuminance[sortedByLuminance.length - 1]?.hex || '#84cc16';
        const glassColor = sortedByLuminance[sortedByLuminance.length - 2]?.hex || brightColor;
        
        setCustomPalette({
          body: bodyColor,
          wireframe: brightColor,
          glass: glassColor,
          bg: darkColor,
          grid: brightColor
        });
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const updateCustomPaletteField = (field, value) => {
    setCustomPalette(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const applyCustomPalette = () => {
    setActiveTheme(customPalette);
    if (onThemeChange) onThemeChange(customPalette);
    setShowThemePopover(false);
  };

  const handleToggleTheme = () => {
    const nextTheme = activeTheme === 'blueprint' ? 'dark' : activeTheme === 'dark' ? 'toxic' : 'blueprint';
    setActiveTheme(nextTheme);
    if (onThemeChange) {
      onThemeChange(nextTheme);
    }
  };

  const [hasLateral, setHasLateral] = useState(() => !!localStorage.getItem(`${storagePrefix}twin_snapshot_lateral`));
  const [hasSuperior, setHasSuperior] = useState(() => !!localStorage.getItem(`${storagePrefix}twin_snapshot_superior`));
  const [hasIsometrica, setHasIsometrica] = useState(() => !!localStorage.getItem(`${storagePrefix}twin_snapshot_isometrica`));

  useEffect(() => {
    const checkCaptures = () => {
      setHasLateral(!!localStorage.getItem(`${storagePrefix}twin_snapshot_lateral`));
      setHasSuperior(!!localStorage.getItem(`${storagePrefix}twin_snapshot_superior`));
      setHasIsometrica(!!localStorage.getItem(`${storagePrefix}twin_snapshot_isometrica`));
    };
    checkCaptures();
    window.addEventListener('storage', checkCaptures);
    return () => window.removeEventListener('storage', checkCaptures);
  }, [storagePrefix]);

  const handleToggleRotation = () => {
    setRotationLevel(prev => (prev + 1) % 4);
  };

  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (interactive && onFileDrop) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (interactive && onFileDrop) {
      const file = e.dataTransfer.files[0];
      if (file) {
        onFileDrop(file);
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen?.();
    }
  };

  const handleDownloadSnapshot = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `PANDORA_Twin_Digital_3D_${layout?.name || 'Vista'}_${new Date().toISOString().slice(0,10)}.png`;
      link.href = dataUrl;
      link.click();
    }
  };

  const handleCaptureView = (viewType) => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      
      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const ctx = offscreen.getContext('2d');
        
        ctx.fillStyle = theme === 'blueprint' ? '#edf4f9' : '#05070f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        if (theme === 'blueprint') {
          const finalDataUrl = offscreen.toDataURL('image/png');
          localStorage.setItem(`${storagePrefix}twin_snapshot_${viewType}`, finalDataUrl);
          // También guardar en twin_snapshot_base64 como fallback compatible
          if (viewType === 'lateral') {
            localStorage.setItem(`${storagePrefix}twin_snapshot_base64`, finalDataUrl);
          }
          window.dispatchEvent(new Event('storage'));
          
          if (viewType === 'lateral') setHasLateral(true);
          if (viewType === 'superior') setHasSuperior(true);
          if (viewType === 'isometrica') setHasIsometrica(true);
          
          alert(`¡${viewType === 'lateral' ? 'Vista Lateral' : viewType === 'superior' ? 'Vista Superior' : 'Vista Isométrica'} guardada con éxito!`);
          return;
        }

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
          let max = Math.max(r, g, b), min = Math.min(r, g, b);
          let h, s, l = (max + min) / 2;
          
          if (max === min) { h = s = 0; } 
          else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
          }
          
          l = 1 - l;
          
          if (s === 0) { r = g = b = l; } 
          else {
            const hue2rgb = (p, q, t) => {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1/6) return p + (q - p) * 6 * t;
              if (t < 1/2) return q;
              if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
              return p;
            };
            let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            let p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
          }
          
          data[i] = r * 255;
          data[i + 1] = g * 255;
          data[i + 2] = b * 255;
        }
        
        ctx.putImageData(imgData, 0, 0);
        
        const finalDataUrl = offscreen.toDataURL('image/png');
        localStorage.setItem(`${storagePrefix}twin_snapshot_${viewType}`, finalDataUrl);
        // También guardar en twin_snapshot_base64 como fallback compatible
        if (viewType === 'lateral') {
          localStorage.setItem(`${storagePrefix}twin_snapshot_base64`, finalDataUrl);
        }
        window.dispatchEvent(new Event('storage'));
        
        if (viewType === 'lateral') setHasLateral(true);
        if (viewType === 'superior') setHasSuperior(true);
        if (viewType === 'isometrica') setHasIsometrica(true);
        
        alert(`¡${viewType === 'lateral' ? 'Vista Lateral' : viewType === 'superior' ? 'Vista Superior' : 'Vista Isométrica'} capturada con éxito para el informe!`);
      };
      img.src = dataUrl;
    }
  };

  const handleScreenshot = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      
      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const ctx = offscreen.getContext('2d');
        
        // Rellenar fondo original para evitar problemas de transparencia en PDF
        ctx.fillStyle = theme === 'blueprint' ? '#edf4f9' : '#05070f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        if (theme === 'blueprint') {
          const finalDataUrl = offscreen.toDataURL('image/png');
          localStorage.setItem(`${storagePrefix}twin_snapshot_base64`, finalDataUrl);
          
          const link = document.createElement('a');
          link.download = `twin_snapshot_${Date.now()}.png`;
          link.href = finalDataUrl;
          link.click();
          
          alert("¡Foto capturada! Guardada con éxito para el informe.");
          return;
        }

        // Inversión manual de luminosidad (Garantiza compatibilidad cross-browser y PDF)
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
          let max = Math.max(r, g, b), min = Math.min(r, g, b);
          let h, s, l = (max + min) / 2;
          
          if (max === min) { h = s = 0; } 
          else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
          }
          
          // Invertir solo luminosidad (Modo claro)
          l = 1 - l;
          
          if (s === 0) { r = g = b = l; } 
          else {
            const hue2rgb = (p, q, t) => {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1/6) return p + (q - p) * 6 * t;
              if (t < 1/2) return q;
              if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
              return p;
            };
            let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            let p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
          }
          
          data[i] = r * 255;
          data[i + 1] = g * 255;
          data[i + 2] = b * 255;
        }
        
        ctx.putImageData(imgData, 0, 0);
        
        const finalDataUrl = offscreen.toDataURL('image/png');
        localStorage.setItem(`${storagePrefix}twin_snapshot_base64`, finalDataUrl);
        
        const link = document.createElement('a');
        link.download = `twin_snapshot_${Date.now()}.png`;
        link.href = finalDataUrl;
        link.click();
        
        alert("¡Foto capturada! Aparecerá en tu informe en formato Modo Claro perfecto.");
      };
      img.src = dataUrl;
    }
  };

  const captureSilentSnapshot = () => {
    const canvas = containerRef.current?.querySelector('canvas');
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/png');
      
      const img = new Image();
      img.onload = () => {
        const offscreen = document.createElement('canvas');
        offscreen.width = canvas.width;
        offscreen.height = canvas.height;
        const ctx = offscreen.getContext('2d');
        
        ctx.fillStyle = theme === 'blueprint' ? '#edf4f9' : '#05070f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
        if (theme === 'blueprint') {
          const finalDataUrl = offscreen.toDataURL('image/png');
          localStorage.setItem(`${storagePrefix}twin_snapshot_base64`, finalDataUrl);
          window.dispatchEvent(new Event('storage'));
          return;
        }

        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imgData.data;
        
        for (let i = 0; i < data.length; i += 4) {
          let r = data[i] / 255, g = data[i + 1] / 255, b = data[i + 2] / 255;
          let max = Math.max(r, g, b), min = Math.min(r, g, b);
          let h, s, l = (max + min) / 2;
          
          if (max === min) { h = s = 0; } 
          else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
              case r: h = (g - b) / d + (g < b ? 6 : 0); break;
              case g: h = (b - r) / d + 2; break;
              case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
          }
          
          l = 1 - l;
          
          if (s === 0) { r = g = b = l; } 
          else {
            const hue2rgb = (p, q, t) => {
              if (t < 0) t += 1;
              if (t > 1) t -= 1;
              if (t < 1/6) return p + (q - p) * 6 * t;
              if (t < 1/2) return q;
              if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
              return p;
            };
            let q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            let p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
          }
          
          data[i] = r * 255;
          data[i + 1] = g * 255;
          data[i + 2] = b * 255;
        }
        
        ctx.putImageData(imgData, 0, 0);
        
        const finalDataUrl = offscreen.toDataURL('image/png');
        localStorage.setItem(`${storagePrefix}twin_snapshot_base64`, finalDataUrl);
        window.dispatchEvent(new Event('storage'));
      };
      img.src = dataUrl;
    } catch (e) {
      console.warn("Error capturing silent screenshot:", e);
    }
  };

  // Auto-Capturar snapshot silencioso 2 segundos después de montar o cambiar el layout/modelo
  useEffect(() => {
    const timer = setTimeout(() => {
      captureSilentSnapshot();
    }, 2000);
    return () => clearTimeout(timer);
  }, [layout, nodes]);

  // Detectar soporte WebGL al montar
  useEffect(() => {
    const supported = checkWebGLSupport();
    setWebglSupported(supported);
  }, []);

  // Sincronizar nodes
  useEffect(() => {
    // Si customNodes fue proporcionado (incluyendo array vacío), úsalo directamente
    if (customNodes !== null && customNodes !== undefined) {
      setNodes(customNodes);
      return;
    }
    // Solo generar defaults si NO hay customNodes prop
    const savedNodes = localStorage.getItem('flowDesigner_nodes');
    if (savedNodes) {
      try { setNodes(JSON.parse(savedNodes)); } catch (e) { /* skip */ }
      return;
    }
    setNodes([
      { id: 'eq_1', type: 'custom', data: { type: 'Transportador', label: 'Banda Inclinada 1', capacity: 1200, power: 5.5, color: '#00F0FF', position3D: { x: -6, y: 0.2, z: -2 } } },
      { id: 'eq_2', type: 'custom', data: { type: 'Molino', label: 'Triturador M1200', capacity: 1200, power: 60, color: '#10b981', position3D: { x: -2, y: 0.2, z: -2 } } },
      { id: 'eq_3', type: 'custom', data: { type: 'Mezcladora', label: 'Mezcladora 3', capacity: 500, power: 15, color: '#8B5CF6', position3D: { x: 2, y: 0.2, z: -2 } } },
      { id: 'eq_4', type: 'custom', data: { type: 'Extrusora', label: 'Extrusora PLD-120', capacity: 300, power: 45, color: '#ec4899', position3D: { x: 6, y: 0.2, z: -2 } } }
    ]);
  }, [customNodes]);

  // Sincronizar edges
  useEffect(() => {
    if (customEdges !== null && customEdges !== undefined) {
      setEdges(customEdges);
      return;
    }
    const savedEdges = localStorage.getItem('flowDesigner_edges');
    if (savedEdges) {
      try { setEdges(JSON.parse(savedEdges)); } catch (e) { /* skip */ }
      return;
    }
    setEdges([
      { id: 'edge_1_2', source: 'eq_1', target: 'eq_2' },
      { id: 'edge_2_3', source: 'eq_2', target: 'eq_3' },
      { id: 'edge_3_4', source: 'eq_3', target: 'eq_4' }
    ]);
  }, [customEdges]);

  // Sincronizar layout
  useEffect(() => {
    if (customLayout) { setLayout(customLayout); return; }
    const savedLayout = localStorage.getItem('flowDesigner_currentLayout');
    if (savedLayout) {
      try { setLayout(JSON.parse(savedLayout)); } catch (e) { /* skip */ }
    }
  }, [customLayout]);

  const handleRetry = useCallback(() => {
    setCanvasError(null);
    setWebglSupported(checkWebGLSupport());
    setCanvasKey(prev => prev + 1);
  }, []);

  // Si el navegador no tiene WebGL disponible en absoluto
  if (!webglSupported) {
    return <TwinFallbackUI height={height} errorMsg="WebGL no está disponible en este navegador o dispositivo." onRetry={handleRetry} />;
  }

  // Si ocurrió un error en el Canvas y no fue capturado por el ErrorBoundary
  if (canvasError) {
    return <TwinFallbackUI height={height} errorMsg={canvasError} onRetry={handleRetry} />;
  }

  return (
    <TwinErrorBoundary height={height}>
      <div 
        ref={containerRef}
        className={`relative w-full overflow-hidden ${activeTheme === 'blueprint' ? '' : activeTheme === 'toxic' ? 'bg-[#0c0d0e]' : activeTheme === 'aluminum' ? 'bg-[#15181c]' : 'bg-[#05070f]'} ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'rounded-[24px] border border-glass-border'} ${isRecording ? 'recording-no-cursor' : ''} ${className}`} 
        style={{
          ...isFullscreen ? { height: '100vh', width: '100vw' } : { height },
          background: activeTheme === 'blueprint' 
            ? 'radial-gradient(circle at center, #f4f8fb 0%, #edf4f9 100%)' 
            : activeTheme === 'toxic'
              ? 'radial-gradient(circle at center, #1b1b1b 0%, #0d0d0e 100%)'
              : activeTheme === 'aluminum'
                ? 'radial-gradient(circle at center, #23272d 0%, #15181c 100%)'
                : typeof activeTheme === 'object' && activeTheme !== null
                  ? `radial-gradient(circle at center, ${activeTheme.bg || '#1b1b1b'} 0%, #05070f 100%)`
                  : undefined
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Estilo para ocultar el cursor de forma profesional durante la grabación */}
        <style>{`
          .recording-no-cursor canvas {
            cursor: none !important;
          }
        `}</style>

        {/* Neon Drop Overlay */}
        {isDragging && (
          <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/85 backdrop-blur-md border-2 border-dashed border-[#00F0FF] rounded-[24px] animate-pulse">
            <div className="p-4 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 mb-3">
              <Upload className="w-10 h-10 text-[#00F0FF] animate-bounce" />
            </div>
            <h3 className="text-[#00F0FF] font-bold text-base uppercase tracking-widest text-center">¡Suelta tu archivo aquí!</h3>
            <p className="text-gray-400 text-xs mt-1 text-center max-w-xs px-4">Soporta formatos .glb, .gltf, .fbx, .dae o archivos .zip comprimidos</p>
          </div>
        )}
        {/* Canvas 3D con configuración robusta */}
        <Canvas
          key={canvasKey}
          shadows
          gl={{
            preserveDrawingBuffer: true,
            antialias: true,
            powerPreference: 'high-performance',
            failIfMajorPerformanceCaveat: false,
          }}
          onCreated={({ gl }) => {
            canvasRef.current = gl.domElement;
            // Confirmar que el contexto WebGL se creó bien
            if (!gl || !gl.getContext()) {
              setCanvasError('No se pudo crear el contexto WebGL.');
            }
          }}
          style={{ position: 'absolute', inset: 0 }}
        >
          <TwinScene
            nodes={nodes}
            edges={edges}
            layout={layout}
            isPlaying={isPlaying}
            isFxEnabled={isFxEnabled}
            interactive={interactive}
            editMode={editMode}
            selectedNodeId={selectedNodeId}
            onSelectNode={onSelectNode}
            onUpdateNode={onUpdateNode}
            labelHeightOffset={labelHeightOffset}
            labelsCollapsed={labelsCollapsed}
            autoRotate={rotationLevel > 0}
            autoRotateSpeed={rotationLevel === 1 ? 1.0 : rotationLevel === 2 ? 3.5 : 8.5}
            theme={activeTheme}
            lightIntensity={lightIntensity}
            showFloorPlane={showFloorPlane}
            extraFills={extraFills}
            sunAngle={sunAngle}
            customRoughness={customRoughness}
            customMetalness={customMetalness}
            customOutlineOpacity={customOutlineOpacity}
          />
        </Canvas>

        {/* Panel de Control Flotante */}
        {!isRecording && (
          <div className="absolute top-4 left-4 z-10 p-3 rounded-2xl bg-slate-950/90 backdrop-blur-xl border border-slate-700/80 flex items-center gap-3 pointer-events-auto shadow-2xl">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-widest text-white">Twin Digital Activo</span>
            </div>
            <div className="h-4 w-px bg-slate-700/60" />
            <div className="flex items-center gap-1.5">
              <button 
                onClick={() => setIsPlaying(p => !p)}
                className={`p-1.5 rounded-xl border transition-all font-bold ${
                  isPlaying 
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 hover:bg-cyan-500/40 hover:text-white shadow-[0_0_10px_rgba(6,182,212,0.25)]' 
                    : 'bg-slate-800/90 border-slate-700 text-slate-100 hover:text-white hover:bg-slate-700 hover:border-slate-500'
                }`}
                title={isPlaying ? "Pausar Flujo" : "Iniciar Flujo"}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              </button>
              <button 
                onClick={() => setCanvasKey(prev => prev + 1)}
                className="p-1.5 rounded-xl border bg-slate-800/90 border-slate-700 text-slate-100 hover:text-white hover:bg-slate-700 hover:border-slate-500 transition-all shadow-sm"
                title="Centrar / Reiniciar Cámara"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <div className="h-4 w-px bg-slate-700/60 mx-1" />
              <div className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-2xl border border-slate-800">
                <button 
                  onClick={() => handleCaptureView('lateral')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-[9px] font-black uppercase tracking-wider ${
                    hasLateral 
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 hover:bg-emerald-500/40 hover:text-white shadow-[0_0_10px_rgba(16,185,129,0.25)]' 
                      : 'bg-slate-800/90 border-slate-700 text-slate-100 hover:text-white hover:bg-slate-700 hover:border-slate-500'
                  }`}
                  title="Capturar Vista Lateral actual"
                >
                  <Camera className="w-3 h-3" />
                  <span>Lateral</span>
                  <span className={`w-2 h-2 rounded-full ${hasLateral ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]' : 'bg-slate-600'}`} />
                </button>

                <button 
                  onClick={() => handleCaptureView('superior')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-[9px] font-black uppercase tracking-wider ${
                    hasSuperior 
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 hover:bg-emerald-500/40 hover:text-white shadow-[0_0_10px_rgba(16,185,129,0.25)]' 
                      : 'bg-slate-800/90 border-slate-700 text-slate-100 hover:text-white hover:bg-slate-700 hover:border-slate-500'
                  }`}
                  title="Capturar Vista Superior actual"
                >
                  <Camera className="w-3 h-3" />
                  <span>Superior</span>
                  <span className={`w-2 h-2 rounded-full ${hasSuperior ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]' : 'bg-slate-600'}`} />
                </button>

                <button 
                  onClick={() => handleCaptureView('isometrica')}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border transition-all text-[9px] font-black uppercase tracking-wider ${
                    hasIsometrica 
                      ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 hover:bg-emerald-500/40 hover:text-white shadow-[0_0_10px_rgba(16,185,129,0.25)]' 
                      : 'bg-slate-800/90 border-slate-700 text-slate-100 hover:text-white hover:bg-slate-700 hover:border-slate-500'
                  }`}
                  title="Capturar Vista Isométrica actual"
                >
                  <Camera className="w-3 h-3" />
                  <span>Isométrica</span>
                  <span className={`w-2 h-2 rounded-full ${hasIsometrica ? 'bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]' : 'bg-slate-600'}`} />
                </button>
              </div>
              <button 
                onClick={handleToggleRotation}
                className={`flex items-center gap-1 p-1.5 rounded-xl border transition-all ${
                  rotationLevel > 0 
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 hover:bg-cyan-500/40 hover:text-white shadow-[0_0_10px_rgba(6,182,212,0.25)]' 
                    : 'bg-slate-800/90 border-slate-700 text-slate-100 hover:text-white hover:bg-slate-700 hover:border-slate-500'
                }`}
                title={`Girar modelo automáticamente (Nivel: ${rotationLevel === 0 ? 'Desactivado' : rotationLevel + 'x'})`}
              >
                <RotateCw 
                  className={`w-3.5 h-3.5 ${rotationLevel > 0 ? 'animate-spin' : ''}`} 
                  style={{ 
                    animationDuration: rotationLevel === 1 ? '5s' : rotationLevel === 2 ? '2.5s' : '0.8s' 
                  }} 
                />
                {rotationLevel > 0 && (
                  <span className="text-[7px] font-black tracking-tight">{rotationLevel}x</span>
                )}
              </button>
              <button 
                onClick={() => setShowThemePopover(!showThemePopover)}
                className={`p-1.5 rounded-xl border transition-all ${
                  showThemePopover 
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.25)]'
                    : activeTheme === 'toxic' 
                      ? 'bg-lime-500/25 border-lime-400 text-lime-300 hover:bg-lime-500/40 hover:text-white shadow-[0_0_10px_rgba(132,204,22,0.25)]' 
                      : activeTheme === 'blueprint'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-400 hover:bg-teal-500/30'
                        : 'bg-slate-800/90 border-slate-700 text-slate-100 hover:text-white hover:bg-slate-700 hover:border-slate-500'
                }`}
                title="Seleccionar paleta de colores del visor (con previsualizaciones)"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
              
              {/* Botón REC Profesional */}
              <button 
                onClick={startRecording}
                className="p-1.5 rounded-xl border bg-slate-800/90 border-slate-700 hover:bg-slate-700 hover:border-slate-500 text-red-500 hover:text-red-400 transition-all shadow-sm flex items-center justify-center gap-1.5 cursor-pointer font-bold"
                title="Iniciar Grabación de Pantalla Profesional"
              >
                <Circle className="w-3.5 h-3.5 fill-red-500 animate-pulse text-red-500" />
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-200 pr-0.5">REC</span>
              </button>

              <button 
                onClick={toggleFullscreen}
                className={`p-1.5 rounded-xl border transition-all ${
                  isFullscreen 
                    ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 hover:bg-cyan-500/40 hover:text-white shadow-[0_0_10px_rgba(6,182,212,0.25)]' 
                    : 'bg-slate-800/90 border-slate-700 text-slate-100 hover:text-white hover:bg-slate-700 hover:border-slate-500'
                }`}
                title={isFullscreen ? "Salir de Pantalla Completa (ESC)" : "Ver en Pantalla Completa"}
              >
                {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        )}

        {/* Panel de Ajustes de Estudio CAD (Luz, Piso, Visibilidad) - Visible en pantalla completa */}
        {isFullscreen && !isRecording && (
          <div className={`absolute top-4 right-4 z-10 p-4 rounded-3xl bg-slate-950/94 backdrop-blur-xl border border-slate-700/80 w-[270px] pointer-events-auto shadow-2xl flex flex-col ${isPanelCollapsed ? 'gap-0 py-3' : 'gap-4 max-h-[90vh] overflow-y-auto'} text-white animate-fade-in transition-all duration-300`}>
            {/* Cabecera */}
            <div className={`flex items-center justify-between ${isPanelCollapsed ? '' : 'pb-2 border-b border-slate-800/80'}`}>
              <div className="flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-200">Estudio CAD Pro</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[7px] font-black uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-450/30 rounded px-1.5 py-0.5 tracking-wider">
                  PREMIUM
                </span>
                <button
                  onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
                  className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-450 hover:text-white transition-all duration-200 cursor-pointer flex items-center justify-center"
                  title={isPanelCollapsed ? "Maximizar Panel" : "Minimizar Panel"}
                >
                  {isPanelCollapsed ? <Maximize2 className="w-3 h-3 text-cyan-400" /> : <Minimize2 className="w-3 h-3 text-slate-400" />}
                </button>
              </div>
            </div>

            {/* SECCIÓN DESPLEGABLE */}
            {!isPanelCollapsed && (
              <>
                {/* SECCIÓN 1: ILUMINACIÓN Y SOL */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-1">
                    <Sun className="w-3.5 h-3.5 text-amber-400" />
                    <span>Iluminación y Sombras</span>
                  </div>

                  {/* Intensidad de Luz */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-400">
                      <span>Brillo e Iluminación</span>
                      <span className="text-cyan-400 font-mono">{(lightIntensity * 100).toFixed(0)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => setLightIntensity(prev => Math.max(0.2, prev - 0.2))}
                        className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                      >
                        -
                      </button>
                      <input 
                        type="range"
                        min="0.2"
                        max="3.0"
                        step="0.1"
                        value={lightIntensity}
                        onChange={(e) => setLightIntensity(parseFloat(e.target.value))}
                        className="flex-1 accent-cyan-400 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <button 
                        onClick={() => setLightIntensity(prev => Math.min(3.0, prev + 0.2))}
                        className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 text-xs font-bold transition-all flex items-center justify-center cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Posición del Sol (sunAngle) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-400">
                      <div className="flex items-center gap-1">
                        <Compass className="w-3 h-3 text-cyan-400 animate-spin-slow" />
                        <span>Ángulo del Sol (Sombras)</span>
                      </div>
                      <span className="text-cyan-400 font-mono">{sunAngle}°</span>
                    </div>
                    <input 
                      type="range"
                      min="0"
                      max="360"
                      step="5"
                      value={sunAngle}
                      onChange={(e) => setSunAngle(parseInt(e.target.value))}
                      className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* SECCIÓN 2: DETALLES DE EQUIPOS (MATERIALES CAD) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-1">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Detalle y Acabado CAD</span>
                  </div>

                  {/* Metalicidad (customMetalness) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-400">
                      <span>Brillo Metálico</span>
                      <span className="text-cyan-400 font-mono">{(customMetalness * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={customMetalness}
                      onChange={(e) => setCustomMetalness(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Rugosidad / Pulido (customRoughness) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-400">
                      <span>Rugosidad / Pulido</span>
                      <span className="text-cyan-400 font-mono">{(customRoughness * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.05"
                      value={customRoughness}
                      onChange={(e) => setCustomRoughness(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>

                  {/* Contornos CAD / Outlines (customOutlineOpacity) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[8px] font-black uppercase text-slate-400">
                      <span>Siluetas e Ingeniería</span>
                      <span className="text-cyan-400 font-mono">{(customOutlineOpacity * 100).toFixed(0)}%</span>
                    </div>
                    <input 
                      type="range"
                      min="0.0"
                      max="1.0"
                      step="0.1"
                      value={customOutlineOpacity}
                      onChange={(e) => setCustomOutlineOpacity(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                  </div>
                </div>

                {/* SECCIÓN 3: PISO */}
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5 text-[8.5px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-1">
                    <Grid3X3 className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Superficie del Suelo</span>
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'grid', label: 'Cuadrícula' },
                      { id: 'solid', label: 'Piso Sólido' },
                      { id: 'reflective', label: 'Reflectivo' },
                      { id: 'none', label: 'Sin Piso' }
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => setShowFloorPlane(opt.id)}
                        className={`py-1 px-1.5 rounded-lg border text-[8px] font-bold uppercase tracking-wider transition-all text-center cursor-pointer ${
                          showFloorPlane === opt.id
                            ? 'bg-cyan-500/15 border-cyan-400 text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.15)]'
                            : 'bg-slate-900 border-slate-800/80 text-slate-450 hover:bg-slate-850 hover:text-slate-200'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* SECCIÓN 4: CONTRALUZ & CAPTURA DE FOTOS */}
                <div className="space-y-3 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex flex-col">
                      <span className="text-[8px] font-black uppercase tracking-wider text-slate-400">Filtro de Contraluz</span>
                      <span className="text-[6.5px] text-slate-500 font-medium leading-tight">Iluminación frontal</span>
                    </div>
                    <button
                      onClick={() => setExtraFills(prev => !prev)}
                      className={`w-9 h-5 rounded-full p-0.5 transition-all duration-300 cursor-pointer ${
                        extraFills ? 'bg-cyan-500' : 'bg-slate-800'
                      }`}
                    >
                      <div 
                        className={`w-4 h-4 rounded-full bg-white transition-transform duration-300 transform ${
                          extraFills ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Botón de Captura de Foto PNG Independiente */}
                  <button
                    onClick={handleDownloadSnapshot}
                    className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-[9px] uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_4px_15px_rgba(6,182,212,0.3)] cursor-pointer"
                    title="Tomar fotografía y descargar como archivo PNG independiente"
                  >
                    <Camera className="w-3.5 h-3.5 animate-pulse" />
                    <span>Descargar Foto 3D</span>
                    <Download className="w-3 h-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* HUD DE GRABACIÓN DE PANTALLA PROFESIONAL */}
        {isRecording && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl bg-slate-950/95 backdrop-blur-xl border border-red-500/35 shadow-[0_0_40px_rgba(239,68,68,0.35)] flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4 pointer-events-auto select-none">
            {/* Pulser REC */}
            <div className="flex items-center gap-2 pr-1">
              <div className={`w-3.5 h-3.5 rounded-full bg-red-500 ${isPaused ? '' : 'animate-pulse shadow-[0_0_12px_#ef4444]'}`} />
              <span className="text-[11px] font-black text-white uppercase tracking-widest">REC</span>
            </div>
            
            {/* Timer */}
            <span className="text-base font-mono font-black text-white min-w-[50px] text-center bg-red-950/45 px-2.5 py-1 rounded-lg border border-red-900/30">
              {recordingTime}
            </span>
            
            <div className="w-px h-6 bg-slate-800" />
            
            {/* Pause / Resume */}
            <button
              onClick={isPaused ? resumeRecording : pauseRecording}
              className={`p-2 rounded-xl border transition-all cursor-pointer ${
                isPaused 
                  ? 'bg-emerald-500/25 border-emerald-400 text-emerald-300 hover:bg-emerald-500/40 hover:text-white' 
                  : 'bg-slate-900 border-slate-800 text-slate-100 hover:text-white hover:bg-slate-800'
              }`}
              title={isPaused ? "Reanudar Grabación" : "Pausar Grabación"}
            >
              {isPaused ? <Play className="w-4 h-4 fill-current" /> : <Pause className="w-4 h-4 fill-current" />}
            </button>
            
            {/* Stop & Save */}
            <button
              onClick={stopRecording}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-550 text-white border border-red-500/25 hover:border-red-400 font-bold text-[10px] uppercase tracking-wider transition-all hover:scale-[1.03] active:scale-[0.97] shadow-[0_4px_15px_rgba(239,68,68,0.25)] flex items-center gap-2 cursor-pointer"
              title="Detener y Guardar Grabación"
            >
              <Square className="w-3.5 h-3.5 fill-white text-white" />
              <span>Detener</span>
            </button>
            
            <div className="w-px h-6 bg-slate-800" />
            
            {/* Rotation Control */}
            <button
              onClick={handleToggleRotation}
              className={`px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer ${
                rotationLevel > 0
                  ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
              }`}
              title="Alternar Rotación Automática"
            >
              <RotateCw 
                className={`w-3.5 h-3.5 ${rotationLevel > 0 ? 'animate-spin' : ''}`} 
                style={{ 
                  animationDuration: rotationLevel === 1 ? '5s' : rotationLevel === 2 ? '2.5s' : '0.8s' 
                }} 
              />
              <span>{rotationLevel > 0 ? `Giro ${rotationLevel}x` : 'Giro Off'}</span>
            </button>
            
            {/* Reset camera */}
            <button
              onClick={() => setCanvasKey(prev => prev + 1)}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-450 hover:text-white hover:border-slate-700 transition-all cursor-pointer"
              title="Reiniciar Cámara"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Selector de Temas Modal con Previsualización de Imagen y Extractor de Colores */}
        {showThemePopover && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in pointer-events-auto">
            <div className="relative w-full max-w-[500px] md:max-w-[800px] p-6 rounded-3xl bg-slate-950/95 border border-slate-700/85 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4 border-b border-slate-800/80 pb-3">
                <div className="flex items-center gap-1.5">
                  <Palette className="w-4 h-4 text-cyan-400" />
                  <span className="text-[10px] font-black uppercase tracking-wider text-white">
                    {showCustomizer ? "Extractor y Personalizador de Paleta" : "Seleccionar Paleta de Colores / Temas del Twin"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {showCustomizer && (
                    <button 
                      onClick={() => setShowCustomizer(false)}
                      className="text-[9px] text-cyan-400 hover:text-cyan-300 font-black uppercase tracking-wider transition-colors mr-2"
                    >
                      ← Volver
                    </button>
                  )}
                  <button 
                    onClick={() => setShowThemePopover(false)}
                    className="text-gray-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-900"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {!showCustomizer ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Tema Blueprint */}
                    <div 
                      onClick={() => {
                        setActiveTheme('blueprint');
                        if (onThemeChange) onThemeChange('blueprint');
                      }}
                      className={`group cursor-pointer rounded-xl border p-2 transition-all flex flex-col justify-between ${
                        activeTheme === 'blueprint'
                          ? 'border-teal-500 bg-teal-500/10 shadow-[0_0_12px_rgba(20,184,166,0.2)]'
                          : 'border-slate-855 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
                      }`}
                    >
                      <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/5 bg-slate-950 mb-2">
                        <img 
                          src="/blueprint_preview.png" 
                          alt="Planos Blueprint" 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        {activeTheme === 'blueprint' && (
                          <div className="absolute inset-0 bg-teal-500/15 flex items-center justify-center backdrop-blur-[0.5px]">
                            <span className="bg-teal-500 text-black font-black uppercase tracking-wider text-[7px] px-1.5 py-0.5 rounded-md shadow-lg">Activo</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-[9px] font-bold text-white uppercase tracking-wider">Planos Blueprint</h4>
                        <p className="text-[7px] text-gray-400 mt-1 leading-tight">Estilo esquema técnico en azul celeste y cuadrícula blanca.</p>
                      </div>
                    </div>

                    {/* Tema Clásico Cyberpunk */}
                    <div 
                      onClick={() => {
                        setActiveTheme('dark');
                        if (onThemeChange) onThemeChange('dark');
                      }}
                      className={`group cursor-pointer rounded-xl border p-2 transition-all flex flex-col justify-between ${
                        activeTheme === 'dark'
                          ? 'border-cyan-500 bg-cyan-500/10 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                          : 'border-slate-855 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
                      }`}
                    >
                      <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/5 bg-slate-950 mb-2">
                        <img 
                          src="/dark_preview.png" 
                          alt="Clásico Cyberpunk" 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        {activeTheme === 'dark' && (
                          <div className="absolute inset-0 bg-cyan-500/15 flex items-center justify-center backdrop-blur-[0.5px]">
                            <span className="bg-cyan-500 text-black font-black uppercase tracking-wider text-[7px] px-1.5 py-0.5 rounded-md shadow-lg">Activo</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-[9px] font-bold text-white uppercase tracking-wider">Clásico Cyberpunk</h4>
                        <p className="text-[7px] text-gray-400 mt-1 leading-tight">Fondo oscuro con flujo cian de alto contraste y partículas.</p>
                      </div>
                    </div>

                    {/* Tema Industrial Toxic */}
                    <div 
                      onClick={() => {
                        setActiveTheme('toxic');
                        if (onThemeChange) onThemeChange('toxic');
                      }}
                      className={`group cursor-pointer rounded-xl border p-2 transition-all flex flex-col justify-between ${
                        activeTheme === 'toxic'
                          ? 'border-lime-500 bg-lime-500/10 shadow-[0_0_12px_rgba(132,204,22,0.2)]'
                          : 'border-slate-855 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
                      }`}
                    >
                      <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/5 bg-slate-950 mb-2">
                        <img 
                          src="/toxic_preview.png" 
                          alt="Industrial Toxic" 
                          className="w-full h-full object-cover transition-transform group-hover:scale-105"
                        />
                        {activeTheme === 'toxic' && (
                          <div className="absolute inset-0 bg-lime-500/15 flex items-center justify-center backdrop-blur-[0.5px]">
                            <span className="bg-lime-500 text-black font-black uppercase tracking-wider text-[7px] px-1.5 py-0.5 rounded-md shadow-lg">Activo</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-[9px] font-bold text-white uppercase tracking-wider">Industrial Toxic</h4>
                        <p className="text-[7px] text-gray-400 mt-1 leading-tight">Gris mate industrial con contornos verde de alta visibilidad.</p>
                      </div>
                    </div>

                    {/* Tema Gris Aluminio (Render CAD) */}
                    <div 
                      onClick={() => {
                        setActiveTheme('aluminum');
                        if (onThemeChange) onThemeChange('aluminum');
                      }}
                      className={`group cursor-pointer rounded-xl border p-2 transition-all flex flex-col justify-between ${
                        activeTheme === 'aluminum'
                          ? 'border-slate-400 bg-slate-400/15 shadow-[0_0_12px_rgba(203,213,225,0.2)]'
                          : 'border-slate-855 bg-slate-900/60 hover:border-slate-700 hover:bg-slate-900/90'
                      }`}
                    >
                      <div className="relative aspect-video w-full rounded-lg overflow-hidden border border-white/5 bg-slate-950 mb-2">
                        <div className="w-full h-full bg-gradient-to-br from-slate-300 via-slate-500 to-slate-700 flex items-center justify-center">
                          <div className="w-7 h-7 rounded bg-slate-200/95 shadow-[0_4px_10px_rgba(0,0,0,0.3)] border border-white/40 transform rotate-12 flex items-center justify-center">
                            <span className="text-[8px] font-black text-slate-800 tracking-tighter">Al</span>
                          </div>
                        </div>
                        {activeTheme === 'aluminum' && (
                          <div className="absolute inset-0 bg-slate-400/15 flex items-center justify-center backdrop-blur-[0.5px]">
                            <span className="bg-white text-black font-black uppercase tracking-wider text-[7px] px-1.5 py-0.5 rounded-md shadow-lg">Activo</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h4 className="text-[9px] font-bold text-white uppercase tracking-wider">Gris Aluminio</h4>
                        <p className="text-[7px] text-gray-400 mt-1 leading-tight">Modelo 3D de aluminio pulido metálico realista sin contornos.</p>
                      </div>
                    </div>
                  </div>

                  {/* Botón para abrir el diseñador de temas */}
                  <div className="mt-4 pt-3 border-t border-slate-800/80">
                    <button
                      onClick={() => setShowCustomizer(true)}
                      className="w-full py-2.5 bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-lime-500/10 hover:from-cyan-500/20 hover:via-purple-500/20 hover:to-lime-500/20 border border-slate-800 hover:border-slate-700 rounded-xl text-center text-[9px] font-black uppercase tracking-widest text-white transition-all flex items-center justify-center gap-2"
                    >
                      <Sliders className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Subir Foto / Personalizar Colores de la Línea</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  {/* Drag and Drop Zone to upload palette image */}
                  <div 
                    onDragOver={(e) => { e.preventDefault(); setDragOverPalette(true); }}
                    onDragLeave={() => setDragOverPalette(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOverPalette(false);
                      const file = e.dataTransfer.files[0];
                      if (file && file.type.startsWith('image/')) {
                        handlePaletteImageUpload(file);
                      }
                    }}
                    className={`border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer relative ${
                      dragOverPalette 
                        ? 'border-lime-400 bg-lime-500/5' 
                        : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/60'
                    }`}
                  >
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) handlePaletteImageUpload(file);
                      }}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="w-6 h-6 text-gray-450 mx-auto mb-1.5" />
                    <p className="text-[9px] font-black text-white uppercase tracking-wider">Subir Foto o Paleta de la Línea</p>
                    <p className="text-[7.5px] text-gray-500 mt-1 leading-normal">
                      Sube una foto (como la paleta Toxic) para pintar el Twin Digital automáticamente con sus colores exactos.
                    </p>
                  </div>

                  {/* Color Pickers Grid */}
                  <div className="grid grid-cols-2 gap-4 bg-slate-900/40 p-4 rounded-xl border border-slate-850">
                    <div className="space-y-1.5">
                      <label className="text-[7.5px] text-gray-400 uppercase tracking-widest block font-black">Color Cuerpo</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={customPalette.body} 
                          onChange={(e) => updateCustomPaletteField('body', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-[9px] font-mono text-white uppercase font-bold">{customPalette.body}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[7.5px] text-gray-400 uppercase tracking-widest block font-black">Color Contornos</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={customPalette.wireframe} 
                          onChange={(e) => updateCustomPaletteField('wireframe', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-[9px] font-mono text-white uppercase font-bold">{customPalette.wireframe}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[7.5px] text-gray-400 uppercase tracking-widest block font-black">Color Vidrios</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={customPalette.glass} 
                          onChange={(e) => updateCustomPaletteField('glass', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-[9px] font-mono text-white uppercase font-bold">{customPalette.glass}</span>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[7.5px] text-gray-400 uppercase tracking-widest block font-black">Color Fondo</label>
                      <div className="flex items-center gap-2">
                        <input 
                          type="color" 
                          value={customPalette.bg} 
                          onChange={(e) => updateCustomPaletteField('bg', e.target.value)}
                          className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                        />
                        <span className="text-[9px] font-mono text-white uppercase font-bold">{customPalette.bg}</span>
                      </div>
                    </div>
                  </div>

                  {/* Apply Button */}
                  <button
                    onClick={applyCustomPalette}
                    className="w-full py-2.5 bg-lime-500 hover:bg-lime-400 text-black font-black uppercase tracking-widest text-[9px] rounded-xl transition-all shadow-[0_0_12px_rgba(132,204,22,0.3)] flex items-center justify-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Aplicar Paleta Personalizada</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {showControls && (
          <div className="absolute bottom-4 right-4 z-10 text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-black/30 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-md pointer-events-none">
            🖱️ Click + Arrastrar para orbitar  |  Scroll para zoom
          </div>
        )}
      </div>
    </TwinErrorBoundary>
  );
}


