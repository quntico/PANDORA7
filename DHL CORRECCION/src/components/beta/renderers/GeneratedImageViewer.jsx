import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, Share2, Expand, X, Wand2, Sparkles, SlidersHorizontal, ArrowDownToLine, Crop, Paintbrush, Undo, Video, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { removeBackground } from '@imgly/background-removal';

export default function GeneratedImageViewer({ src }) {
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [removedBgSrc, setRemovedBgSrc] = useState(null);
  
  // Para el Editor Interactivo Inteligente
  const [filter, setFilter] = useState({ brightness: 100, contrast: 100, saturation: 100, sepia: 0, invert: 0 });
  const [isEditing, setIsEditing] = useState(false);
  const [magicPrompt, setMagicPrompt] = useState("");
  const [isMagicThinking, setIsMagicThinking] = useState(false);
  
  // Video Generation States
  const [isVideoPromptOpen, setIsVideoPromptOpen] = useState(false);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [sysMessage, setSysMessage] = useState(null);
  const [generatedVideoSrc, setGeneratedVideoSrc] = useState(null);
  
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const getProxiedUrl = (url) => {
    if (!url || url.startsWith('/api/') || url.startsWith('blob:') || url.startsWith('data:')) return url;
    return `/api/pandora/v2/proxy-image?url=${encodeURIComponent(url)}`;
  };

  const rawDisplaySrc = removedBgSrc || src;
  const displaySrc = getProxiedUrl(rawDisplaySrc);

  // Descargar la imagen mostrada
  const handleDownload = async (e) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(displaySrc);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pandora-generation-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error downloading image', err);
      // Fallback si falla el proxy
      window.open(rawDisplaySrc, '_blank');
    }
  };

  const handleShare = async (e) => {
    if (e) e.stopPropagation();
    try {
      const response = await fetch(displaySrc);
      const blob = await response.blob();
      const file = new File([blob], 'pandora-image.png', { type: blob.type });
      if (navigator.share) {
        await navigator.share({
          title: 'Imagen Generada por PANDORA V3',
          files: [file]
        });
      } else {
        await navigator.clipboard.writeText(displaySrc);
        alert("Enlace copiado al portapapeles.");
      }
    } catch (err) {
      console.error('Error sharing', err);
    }
  };

  // Extracción de Fondo con Red Neuronal On-Device (WASM)
  const handleRemoveBg = async (e) => {
    if (e) e.stopPropagation();
    if (removedBgSrc) return; // Si ya fue removido
    
    setIsRemovingBg(true);
    try {
      let sourceForImgly = displaySrc;
      try {
         // Asegurar que imgly reciba un Blob puro si es una URL externa o proxy, para evitar sus propios bugs de CORS internally
         const res = await fetch(displaySrc);
         sourceForImgly = await res.blob();
      } catch(e) {
         console.log("Fetch local falló, pasando original", e);
      }
      
      const config = { 
        model: 'small',
        debug: false
      };
      const imageBlob = await removeBackground(sourceForImgly, config);
      const url = window.URL.createObjectURL(imageBlob);
      setRemovedBgSrc(url);
    } catch (err) {
      console.error("[BG_REMOVAL] Error Completo:", err);
      alert(`Error procesando recorte: ${err.message || 'Desconocido'}. Revisa la consola para más detalles.`);
    } finally {
      setIsRemovingBg(false);
    }
  };

  const handleGenerateVideo = async (e) => {
    e.preventDefault();
    if (!videoPrompt) return;
    setIsGeneratingVideo(true);
    setSysMessage("Procesando Motor PANDORA V3... Construyendo secuencia temporal fotograma a fotograma.");

    try {
       const p = videoPrompt.toLowerCase();
       const doZoom = p.includes('zoom') || p.includes('acerca') || p.includes('crece');
       const doRotate = p.includes('gira') || p.includes('rota') || p.includes('vueltas');
       const doParticles = p.includes('particula') || p.includes('chispa') || p.includes('estrella') || p.includes('nieve');
       const doPan = p.includes('mueve') || p.includes('paneo') || p.includes('desplaza') || p.includes('avanza') || p.includes('aire') || p.includes('viento');

       const canvas = document.createElement('canvas');
       const img = new Image();
       
       if (!displaySrc.startsWith('blob:') && !displaySrc.startsWith('data:')) {
           img.crossOrigin = "Anonymous";
       }
       img.src = displaySrc;
       
       await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => {
             console.log("Error de CORS cruzado temporal, reintentando carga...");
             img.crossOrigin = null;
             img.onload = resolve;
             img.onerror = () => reject(new Error("No se pudo cargar la imagen para el render."));
             // Forzar recarga
             img.src = displaySrc + (displaySrc.includes('?') ? '&' : '?') + 't=' + new Date().getTime();
          };
       });
       
       // Optimization for processing
       const MAX_DIM = 800;
       let w = img.width;
       let h = img.height;
       if (w > MAX_DIM || h > MAX_DIM) {
           const ratio = Math.min(MAX_DIM/w, MAX_DIM/h);
           w = Math.floor(w * ratio);
           h = Math.floor(h * ratio);
       }
       
       canvas.width = w;
       canvas.height = h;
       const ctx = canvas.getContext('2d');
       
       // Record WebM stream at 30 fps
       const stream = canvas.captureStream(30);
       let recorderOptions = {};
       if (typeof MediaRecorder !== 'undefined') {
           if (MediaRecorder.isTypeSupported('video/webm')) {
               recorderOptions = { mimeType: 'video/webm' };
           } else if (MediaRecorder.isTypeSupported('video/mp4')) {
               recorderOptions = { mimeType: 'video/mp4' };
           }
       }
       const recorder = new MediaRecorder(stream, recorderOptions);
       const chunks = [];
       recorder.ondataavailable = ev => {
           if (ev.data && ev.data.size > 0) chunks.push(ev.data);
       };
       
       recorder.onstop = () => {
          const type = (chunks.length > 0 && chunks[0].type) ? chunks[0].type : 'video/mp4';
          const blob = new Blob(chunks, { type });
          const url = URL.createObjectURL(blob);
          setGeneratedVideoSrc(url);
          setIsGeneratingVideo(false);
          setIsVideoPromptOpen(false);
          setIsEditing(false); // <--- Se cierra editor para que no se parta la pantalla
          setVideoPrompt("");
          setSysMessage("Renderizado temporal completado con éxito. Reproduciendo animación PANDORA V3.");
          setTimeout(() => setSysMessage(null), 8000);
       };

       recorder.start();

       const durationMs = 5000;
       const startTime = performance.now();
       
       // Particles system
       const particles = [];
       if (doParticles || doPan || true) { 
          const count = doParticles ? 150 : 40;
          for(let i=0; i<count; i++) {
             particles.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * (doParticles || doPan ? 4 : 1),
                vy: (Math.random() - 0.5) * (doParticles || doPan ? 4 : 1),
                s: Math.random() * (doParticles ? 4 : 1.5) + 0.5
             });
          }
       }

       const animate = (time) => {
          const elapsed = time - startTime;
          const progress = Math.min(elapsed / durationMs, 1);
          
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.save();
          ctx.translate(canvas.width/2, canvas.height/2);
          
          let scale = 1;
          if (doZoom) scale = 1 + (progress * 0.3);
          else scale = 1 + (progress * 0.05); // slight ambient zoom
          
          let angle = 0;
          if (doRotate) angle = progress * Math.PI * 0.1;
          
          let dx = 0, dy = 0;
          if (doPan) { dx = progress * 60; dy = progress * -20; }
          
          ctx.scale(scale, scale);
          ctx.rotate(angle);
          ctx.translate(-canvas.width/2 + dx, -canvas.height/2 + dy);
          
          ctx.filter = `brightness(${filter.brightness}%) contrast(${filter.contrast}%) saturate(${filter.saturation}%) sepia(${filter.sepia}%) invert(${filter.invert}%)`;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          ctx.restore();
          
          if (particles.length > 0) {
             ctx.fillStyle = (doParticles && p.includes('estrella')) ? '#FFFFFF' : 'rgba(0, 255, 255, 0.7)';
             particles.forEach(pt => {
                pt.x += (pt.vx + (doPan ? -2 : 0)); // Wind effect if panning
                pt.y += pt.vy;
                if (pt.x < 0) pt.x = canvas.width;
                if (pt.x > canvas.width) pt.x = 0;
                if (pt.y < 0) pt.y = canvas.height;
                if (pt.y > canvas.height) pt.y = 0;
                
                ctx.beginPath();
                ctx.arc(pt.x, pt.y, pt.s, 0, Math.PI * 2);
                ctx.fill();
             });
          }

          if (progress < 1) {
             requestAnimationFrame(animate);
          } else {
             recorder.stop();
          }
       };
       
       requestAnimationFrame(animate);
       
    } catch (err) {
       console.error("Video Gen Error", err);
       setSysMessage("Error al originar motor generativo: " + err.message);
       setIsGeneratingVideo(false);
    }
  };

  const openViewer = () => setIsViewerOpen(true);
  const closeViewer = () => {
    setIsViewerOpen(false);
    setIsEditing(false);
    setMagicPrompt("");
  };

  const handleMagicEdit = (e) => {
    e.preventDefault();
    if (!magicPrompt) return;
    
    setIsMagicThinking(true);
    setIsEditing(true);
    const q = magicPrompt.toLowerCase();
    let nF = { ...filter };
    
    setTimeout(() => {
      // Intentos de extracción de fondo
      if (q.includes('fondo') || q.includes('recorta') || q.includes('extrae')) {
         handleRemoveBg();
      } else {
         // NLP de Edición en Tiempo Real
         if (q.includes('blanc') || q.includes('gris') || q.includes('b&w')) nF.saturation = 0;
         if (q.includes('color') || q.includes('satura') || q.includes('viv')) nF.saturation = 180;
         if (q.includes('sepia') || q.includes('antigua') || q.includes('vint')) nF.sepia = 100;
         if (q.includes('brill') || q.includes('aclara') || q.includes('ilum')) nF.brightness = Math.min(200, nF.brightness + 40);
         if (q.includes('oscur') || q.includes('apaga')) nF.brightness = Math.max(0, nF.brightness - 40);
         if (q.includes('contrast') || q.includes('intens')) nF.contrast = Math.min(200, nF.contrast + 50);
         if (q.includes('invierte') || q.includes('negativ')) nF.invert = 100;
         if (q.includes('normal') || q.includes('restaura') || q.includes('borra')) {
            nF = { brightness: 100, contrast: 100, saturation: 100, sepia: 0, invert: 0 };
         }
         setFilter(nF);
      }
      setMagicPrompt("");
      setIsMagicThinking(false);
    }, 600); // Micro-delay neural sim
  };

  // Manejo de Dibujo y Edición en Canvas
  useEffect(() => {
    if (isEditing && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      const img = new Image();
      // Si usamos la URL proxy, no cross origin es necesario estrictamente, 
      // pero agregar anonymous ayuda si cambia origen en un deploy externo.
      img.crossOrigin = "Anonymous";
      img.src = displaySrc;
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.filter = `brightness(${filter.brightness}%) contrast(${filter.contrast}%) saturate(${filter.saturation}%) sepia(${filter.sepia}%) invert(${filter.invert}%)`;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      };
      img.onerror = (err) => console.error("Error cargando imagen en canvas", err);
    }
  }, [filter, isEditing, displaySrc]);

  return (
    <>
      <div 
        className="relative group rounded-2xl border border-white/10 shadow-2xl overflow-hidden bg-black max-w-sm cursor-pointer transition-all hover:border-neon-cyan/50 hover:shadow-glow-sm"
        onClick={openViewer}
      >
        <img 
          src={displaySrc} 
          alt="Contenido generado por IA" 
          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105" 
          style={{ filter: isRemovingBg ? 'blur(4px) grayscale(50%)' : 'none' }}
        />
        
        {isRemovingBg && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
             <div className="w-8 h-8 border-2 border-neon-cyan/20 border-t-neon-cyan rounded-full animate-spin mb-3" />
             <span className="text-[10px] font-black text-neon-cyan uppercase tracking-widest animate-pulse">Procesando Pixeles...</span>
          </div>
        )}

        {/* Overlay Hover Actions */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/90 via-black/40 to-transparent translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center gap-3">
          <ActionButton icon={Wand2} label="Sin Fondo" onClick={handleRemoveBg} disabled={isRemovingBg} />
          <ActionButton icon={Expand} label="Visor" onClick={openViewer} />
          <ActionButton icon={Share2} label="Compartir" onClick={handleShare} />
          <ActionButton icon={Download} label="Guardar" onClick={handleDownload} highlight />
        </div>
      </div>

      {/* Editor & Viewer Modal */}
      <AnimatePresence>
        {isViewerOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-lg"
          >
            {/* Banner de Mensajes de Sistema */}
            <AnimatePresence>
               {sysMessage && (
                  <motion.div 
                    initial={{ opacity: 0, y: -20, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: -20, x: '-50%' }}
                    className="absolute top-8 left-1/2 z-[200] max-w-lg w-full p-5 bg-[#0A0A0A]/95 border border-neon-cyan/40 rounded-2xl shadow-[0_0_30px_rgba(0,255,255,0.15)] flex items-start gap-4 backdrop-blur-xl"
                  >
                    <div className="p-2 bg-neon-cyan/10 rounded-full shrink-0">
                       <Sparkles className="w-5 h-5 text-neon-cyan" />
                    </div>
                    <div className="flex-1">
                      <h4 className="text-[11px] font-black text-white uppercase tracking-widest mb-1 shadow-glow-sm">Sistema Pandora V3</h4>
                      <p className="text-[12px] text-gray-300 leading-relaxed font-medium mt-2 whitespace-pre-wrap">{sysMessage}</p>
                    </div>
                    <button onClick={() => setSysMessage(null)} className="text-gray-500 hover:text-white transition-colors shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </motion.div>
               )}
            </AnimatePresence>

            <button onClick={closeViewer} className="absolute top-6 right-6 p-3 bg-white/5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors z-50">
              <X className="w-6 h-6" />
            </button>

            <div className="w-full h-full max-w-7xl mx-auto p-6 md:p-12 flex flex-col lg:flex-row gap-8">
              
              {/* Imagen Principal */}
              <div className="flex-1 flex items-center justify-center relative overflow-hidden bg-black/50 rounded-[40px] border border-white/5 shadow-2xl group">
                <div className="absolute top-6 left-6 flex items-center gap-3 z-10">
                   <div className="px-4 py-2 bg-black/40 backdrop-blur-md rounded-full border border-white/5 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-neon-cyan" />
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Estudio Visual Pandora</span>
                   </div>
                </div>

                {isEditing && !generatedVideoSrc && (
                  <>
                    <canvas ref={canvasRef} className="max-w-full max-h-full object-contain rounded-xl shadow-glow-sm" />
                  </>
                )}
                
                {!isEditing && !generatedVideoSrc && (
                  <img src={displaySrc} alt="Visor" className="max-w-full max-h-full object-contain drop-shadow-2xl" />
                )}

                {generatedVideoSrc && (
                  <video src={generatedVideoSrc} autoPlay loop muted playsInline className="max-w-full max-h-full object-contain drop-shadow-2xl rounded-xl border border-neon-cyan/20 shadow-glow-sm" />
                )}

                {/* Overlay de Generación de Video */}
                {isGeneratingVideo && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-30 p-8 text-center" style={{ backdropFilter: 'blur(10px)' }}>
                     <Video className="w-12 h-12 text-neon-purple animate-pulse mb-6" />
                     <div className="w-64 h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden relative">
                       <motion.div initial={{ x: "-100%" }} animate={{ x: "0%" }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }} className="w-full h-full bg-neon-purple shadow-[0_0_15px_#B026FF]" />
                     </div>
                     <span className="text-[14px] font-black uppercase tracking-[4px] text-neon-purple shadow-glow-sm animate-pulse">Renderizando Motor Temporal...</span>
                     <span className="text-[11px] text-gray-400 mt-3 max-w-sm leading-relaxed">Construyendo interpolación temporal y aplicando físicas V3 a la imagen origen.</span>
                  </div>
                )}
              </div>

              {/* Panel Lateral de Edición */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-full lg:w-[340px] bg-[#0A0A0A] border border-white/10 rounded-[32px] flex flex-col h-full overflow-hidden shadow-2xl relative"
              >
                <div className="p-6 border-b border-white/5">
                  <h3 className="text-[12px] font-black text-white uppercase tracking-[4px] flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-neon-purple" />
                    Sala de Edición
                  </h3>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                  {!isEditing && !generatedVideoSrc && (
                    <div className="flex items-center gap-4 p-4 rounded-2xl bg-neon-cyan/5 border border-neon-cyan/20 cursor-pointer hover:bg-neon-cyan/10 transition-colors" onClick={() => setIsEditing(true)}>
                      <Paintbrush className="w-5 h-5 text-neon-cyan" />
                      <div>
                        <h4 className="text-[11px] font-bold text-white uppercase tracking-widest">Activar Editor</h4>
                        <p className="text-[10px] text-gray-400 mt-1">Aplica filtros y modificaciones manualmente</p>
                      </div>
                    </div>
                  )}

                  {/* Chat de Edición Inteligente */}
                  <div className="p-4 bg-black/40 border border-neon-cyan/20 rounded-2xl shadow-glow-sm">
                    <h4 className="text-[10px] font-bold text-white uppercase tracking-widest mb-3 flex items-center gap-2">
                       <MessageSquare className="w-3 h-3 text-neon-cyan" />
                       Asistente Visual IA
                    </h4>
                    <form onSubmit={handleMagicEdit} className="relative group/chat">
                      <div className="absolute inset-0 bg-neon-cyan/10 rounded-xl blur-lg opacity-0 group-focus-within/chat:opacity-100 transition-opacity pointer-events-none" />
                      <div className="relative flex items-center bg-black border border-white/10 rounded-xl overflow-hidden hover:border-white/20 focus-within:border-neon-cyan/60 transition-all">
                         <Wand2 className={cn("w-4 h-4 ml-3 text-neon-cyan shrink-0 transition-transform", isMagicThinking && "animate-spin")} />
                         <input 
                           type="text" 
                           placeholder={isMagicThinking ? "Procesando..." : "Ej: 'ponle más brillo', 'sepia'..."} 
                           className="w-full bg-transparent text-white text-[11px] font-bold outline-none placeholder-gray-600 py-3 px-2"
                           value={magicPrompt}
                           onChange={(e) => setMagicPrompt(e.target.value)}
                           disabled={isMagicThinking}
                         />
                      </div>
                    </form>
                  </div>

                  {isEditing && (
                    <div className="space-y-6">
                      <ControlSlider label="Brillo" value={filter.brightness} min={0} max={200} onChange={(v) => setFilter({...filter, brightness: v})} />
                      <ControlSlider label="Contraste" value={filter.contrast} min={0} max={200} onChange={(v) => setFilter({...filter, contrast: v})} />
                      <ControlSlider label="Saturación" value={filter.saturation} min={0} max={200} onChange={(v) => setFilter({...filter, saturation: v})} />
                    </div>
                  )}

                  <div className="space-y-3 pt-6 border-t border-white/5">
                    <button onClick={handleRemoveBg} disabled={isRemovingBg} className="w-full relative flex items-center gap-3 px-5 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all group overflow-hidden border border-white/5 disabled:opacity-50">
                      <Wand2 className={cn("w-4 h-4 text-neon-cyan transition-transform", isRemovingBg ? "animate-spin" : "group-hover:rotate-12")} />
                      <span className="text-[10px] font-black uppercase tracking-widest">{isRemovingBg ? "Extrayendo Sujetos..." : "Remover Fondo (IA)"}</span>
                    </button>
                    
                    <div className="relative">
                      <button 
                        onClick={() => setIsVideoPromptOpen(!isVideoPromptOpen)}
                        className="w-full relative flex items-center gap-3 px-5 py-4 bg-white/5 hover:bg-white/10 rounded-2xl text-white transition-all border border-white/5 group overflow-hidden"
                      >
                        <Video className={cn("w-4 h-4 transition-transform", isVideoPromptOpen ? "text-neon-cyan" : "text-neon-purple group-hover:scale-110")} />
                        <span className="text-[10px] font-black uppercase tracking-widest opacity-80 group-hover:opacity-100 transition-opacity">Generar Video 5s</span>
                        {!isVideoPromptOpen && <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />}
                      </button>

                      <AnimatePresence>
                        {isVideoPromptOpen && (
                          <motion.div 
                            initial={{ opacity: 0, height: 0, marginTop: 0 }} 
                            animate={{ opacity: 1, height: 'auto', marginTop: 12 }} 
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            className="bg-black/40 border border-neon-cyan/20 rounded-2xl p-4 overflow-hidden shadow-glow-sm relative"
                          >
                            <form onSubmit={handleGenerateVideo} className="flex flex-col gap-3">
                              <label className="text-[10px] font-bold text-white uppercase tracking-widest">
                                Contexto del Video:
                              </label>
                              <textarea
                                value={videoPrompt}
                                onChange={(e) => setVideoPrompt(e.target.value)}
                                disabled={isGeneratingVideo}
                                placeholder="Ej: 'haz que las estrellas brillen', 'partículas flotando', 'cámara girando suavemente'..."
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-[11px] text-white placeholder-gray-500 focus:border-neon-cyan/50 outline-none resize-none h-20 custom-scrollbar"
                              />
                              <button 
                                type="submit" 
                                disabled={!videoPrompt.trim() || isGeneratingVideo}
                                className="w-full py-2.5 bg-neon-cyan/10 hover:bg-neon-cyan border border-neon-cyan/30 text-neon-cyan hover:text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                              >
                                {isGeneratingVideo ? <Wand2 className="w-3 h-3 animate-spin" /> : <Video className="w-3 h-3" />}
                                {isGeneratingVideo ? "Animando..." : "Iniciar Motor"}
                              </button>
                            </form>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {(removedBgSrc || isEditing || generatedVideoSrc) && (
                      <button 
                        onClick={() => {
                          setRemovedBgSrc(null);
                          setGeneratedVideoSrc(null);
                          setFilter({ brightness: 100, contrast: 100, saturation: 100, sepia: 0, invert: 0 });
                          setIsEditing(false);
                        }} 
                        className="w-full flex items-center justify-center gap-2 px-5 py-3 mt-4 bg-red-500/5 hover:bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 transition-all font-black text-[10px] uppercase tracking-widest"
                      >
                        <Undo className="w-4 h-4" /> Deshacer Cambios
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6 bg-black border-t border-white/10">
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={handleShare} className="flex items-center justify-center gap-2 py-3.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white transition-all group">
                      <Share2 className="w-4 h-4 group-hover:-translate-y-0.5 transition-transform" />
                    </button>
                    <button 
                      onClick={async () => {
                        if (generatedVideoSrc) {
                          const link = document.createElement('a');
                          link.href = generatedVideoSrc; link.download = 'pandora-motion-v3.webm'; link.click();
                        } else if (isEditing && canvasRef.current) {
                          const url = canvasRef.current.toDataURL("image/png");
                          const link = document.createElement('a');
                          link.href = url; link.download = 'pandora-edited.png'; link.click();
                        } else {
                          handleDownload();
                        }
                      }} 
                      className="flex items-center justify-center gap-2 py-3.5 bg-neon-cyan hover:bg-neon-cyan/80 shadow-glow-sm rounded-xl text-black transition-all group"
                    >
                      <ArrowDownToLine className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                      <span className="text-[10px] font-black uppercase tracking-widest">Guardar</span>
                    </button>
                  </div>
                </div>

              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ActionButton({ icon: Icon, label, onClick, highlight, disabled }) {
  return (
    <button 
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all relative group/btn disabled:opacity-50 disabled:cursor-not-allowed",
        highlight ? "bg-neon-cyan text-black hover:bg-neon-cyan/80 shadow-glow-sm" : "bg-white/10 text-white backdrop-blur-md hover:bg-white/20 border border-white/5"
      )}
    >
      <Icon className={cn("w-4 h-4", highlight ? "" : "group-hover/btn:scale-110 transition-transform duration-300")} />
      {/* Tooltip */}
      <span className="absolute -top-8 bg-black border border-white/10 text-white text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
        {label}
      </span>
    </button>
  );
}

function ControlSlider({ label, value, min, max, onChange }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{label}</label>
        <span className="text-[10px] text-neon-cyan font-mono">{value}%</span>
      </div>
      <input 
        type="range" 
        min={min} 
        max={max} 
        value={value} 
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-cyan"
      />
    </div>
  );
}
