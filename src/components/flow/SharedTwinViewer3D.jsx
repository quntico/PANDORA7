import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import EquipmentWrapper from './Equipment3DModel';
import Connection3DArrow from './Connection3DArrow';
import { LayoutModel } from './LayoutLoader';
import { Box, Play, Pause, RotateCcw, Activity, RefreshCw, AlertTriangle, Maximize, Minimize, Camera } from 'lucide-react';

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
  labelHeightOffset, labelsCollapsed
}) {
  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 10, 15]} fov={50} />
      <ambientLight intensity={0.4} />
      <directionalLight 
        position={[10, 15, 10]} 
        intensity={1.2} 
        castShadow 
        shadow-mapSize-width={1024} 
        shadow-mapSize-height={1024} 
      />
      <pointLight position={[-10, 5, -10]} intensity={0.5} color="#00F0FF" />

      {/* Modelo de Planta 3D */}
      {layout && (
        <LayoutModel 
          layout={layout} 
          scale={layout.scale || 1} 
          elevation={layout.elevation || 0} 
          fxEnabled={isFxEnabled} 
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

      {/* Conexiones de Flujo Animadas */}
      {isPlaying && edges.map((edge) => (
        <Connection3DArrow
          key={edge.id}
          edge={edge}
          nodes={nodes}
          connectionStyle="curved"
        />
      ))}

      {/* Grid de Ingeniería */}
      <Grid
        position={[0, -0.01, 0]}
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1a2536"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#00F0FF"
        fadeDistance={45}
        fadeStrength={1}
      />

      {interactive && (
        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          maxPolarAngle={Math.PI / 2 - 0.05} 
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
  labelsCollapsed = false
}) {
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [layout, setLayout] = useState(null);
  const [isFxEnabled, setIsFxEnabled] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [canvasKey, setCanvasKey] = useState(0);
  const [webglSupported, setWebglSupported] = useState(true);
  const [canvasError, setCanvasError] = useState(null);

  const containerRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
        
        // Rellenar fondo oscuro original para evitar problemas de transparencia en PDF
        ctx.fillStyle = '#05070f';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        
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
        localStorage.setItem('twin_snapshot_base64', finalDataUrl);
        
        const link = document.createElement('a');
        link.download = `twin_snapshot_${Date.now()}.png`;
        link.href = finalDataUrl;
        link.click();
        
        alert("¡Foto capturada! Aparecerá en tu informe en formato Modo Claro perfecto.");
      };
      img.src = dataUrl;
    }
  };

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
        className={`relative w-full overflow-hidden bg-[#05070f] ${isFullscreen ? 'fixed inset-0 z-50 rounded-none border-none' : 'rounded-[24px] border border-glass-border'} ${className}`} 
        style={isFullscreen ? { height: '100vh', width: '100vw' } : { height }}
      >
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
          />
        </Canvas>

        {/* Panel de Control Flotante */}
        <div className="absolute top-4 left-4 z-10 p-3 rounded-2xl bg-black/40 backdrop-blur-xl border border-white/10 flex items-center gap-3 pointer-events-auto">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-neon-cyan animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-white">Twin Digital Activo</span>
          </div>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-1.5">
            <button 
              onClick={() => setIsPlaying(p => !p)}
              className={`p-1.5 rounded-lg border transition-all ${isPlaying ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
              title={isPlaying ? "Pausar Flujo" : "Iniciar Flujo"}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button 
              onClick={() => setCanvasKey(prev => prev + 1)}
              className="p-1.5 rounded-lg border bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20 transition-all"
              title="Centrar / Reiniciar Cámara"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="h-4 w-px bg-white/10 mx-1" />
            <button 
              onClick={handleScreenshot}
              className="p-1.5 rounded-lg border bg-white/5 border-white/10 text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/50 transition-all"
              title="Tomar Foto para Informe"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <button 
              onClick={toggleFullscreen}
              className={`p-1.5 rounded-lg border transition-all ${isFullscreen ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'}`}
              title={isFullscreen ? "Salir de Pantalla Completa (ESC)" : "Ver en Pantalla Completa"}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {showControls && (
          <div className="absolute bottom-4 right-4 z-10 text-[9px] font-bold text-gray-400 uppercase tracking-widest bg-black/30 px-3 py-1.5 rounded-xl border border-white/5 backdrop-blur-md pointer-events-none">
            🖱️ Click + Arrastrar para orbitar  |  Scroll para zoom
          </div>
        )}
      </div>
    </TwinErrorBoundary>
  );
}


