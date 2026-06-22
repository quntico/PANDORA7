
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Send, Plus, Mic, ArrowUp, Loader2, X, FileText, 
  CheckCircle2, Cpu, Trash2, Activity, ChevronDown,
  ChevronRight, Database, Brain, FolderOpen, Zap, Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';
import axios from 'axios';
import { useProject } from '@/context/ProjectContext';
import { useBeta } from '@/context/BetaContext';
import { useTranslation } from '@/context/LanguageContext';
import { supabase } from '@/supabase';
import ExecutiveActions from './ExecutiveActions';
import ResponseRenderer from './renderers/ResponseRenderer';

function BetaChat() {
  const { t } = useTranslation();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [showEngineLog, setShowEngineLog] = useState(false);
  const [engineLog, setEngineLog]         = useState(null);
  const [isActionsExpanded, setIsActionsExpanded] = useState(false);

  const { projectId, projectData, saveProjectToSupabase } = useProject();
  const { activeProject, memory, messages: betaMessages } = useBeta();
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // ── Archivos de la Bóveda: se cargan desde Supabase cuando cambia el proyecto
  const [projectFiles, setProjectFiles] = useState([]);
  useEffect(() => {
    if (!activeProject?.id || activeProject.id === 'local-fallback-id') {
      setProjectFiles([]);
      return;
    }
    supabase
      .from('project_artifacts_beta')
      .select('title, data')
      .eq('project_id', activeProject.id)
      .eq('type', 'file')
      .order('created_at', { ascending: false })
      .limit(20)
      .then(({ data }) => {
        const files = (data || []).map(f => {
          try { return { title: f.title, ...JSON.parse(f.data || '{}') }; }
          catch { return { title: f.title }; }
        });
        setProjectFiles(files);
        console.log(`[BetaChat] ${files.length} archivos cargados del proyecto '${activeProject.name}'`);
      });
  }, [activeProject?.id]);

  const getDynamicStatus = (text) => {
    const raw = text.toLowerCase();
    if (raw.includes('imagen') || raw.includes('dibuja') || raw.includes('foto') || raw.includes('manzana')) return "Conectando con DALL-E 3 para generación visual...";
    if (raw.includes('busca') || raw.includes('investiga') || raw.includes('web')) return "Extraeción de datos web en tiempo real...";
    if (raw.includes('calcula') || raw.includes('roi') || raw.includes('financiero')) return "Procesando matrices financieras...";
    if (raw.includes('recuerda') || raw.includes('memoria') || raw.includes('nombre')) return "Sincronizando con Memoria Híbrida Persistente...";
    return "Analizando contexto y generando respuesta estructurada...";
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const addMessage = (msg) => {
    setMessages((prev) => [...prev, msg]);
  };

  const handleSend = async (e, customPrompt = null) => {
    if (e) e.preventDefault();
    const currentPrompt = customPrompt || input;
    if ((!currentPrompt.trim() && attachments.length === 0) || isTyping) return;

    // Payload de envío
    const payloadPrompt = currentPrompt;
    if (!customPrompt) setInput('');

    addMessage({ 
      id: Date.now(), 
      role: 'user', 
      content: payloadPrompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });

    setIsTyping(true);
    setCurrentStatus(getDynamicStatus(payloadPrompt));

    try {
      // ── Armar contexto del proyecto activo desde la Bóveda ────────────────────
      let vaultContext = null;
      if (activeProject) {
        // Parsear description (puede ser JSON serializado con { desc, notes, tags })
        let realDesc = activeProject.description || '';
        let realNotes = activeProject.notes || '';
        let realTags = activeProject.tags || [];
        try {
          const parsed = JSON.parse(realDesc);
          if (parsed && typeof parsed === 'object' && ('desc' in parsed || 'notes' in parsed)) {
            realDesc  = parsed.desc  || '';
            realNotes = parsed.notes || realNotes;
            realTags  = Array.isArray(parsed.tags) ? parsed.tags : realTags;
          }
        } catch { /* description es texto plano */ }

        const parts = [
          `=== PROYECTO ACTIVO: ${activeProject.name || 'Sin nombre'} ===`,
          realDesc  ? `DESCRIPCIÓN: ${realDesc}` : null,
          realTags.length ? `ETIQUETAS: ${realTags.join(', ')}` : null,
          realNotes ? `NOTAS EJECUTIVAS:\n${realNotes}` : null,
          memory?.decisions?.length
            ? `DECISIONES REGISTRADAS (${memory.decisions.length}): ${memory.decisions.slice(-5).map(d => d.title || d.description).join(' | ')}`
            : null,
          memory?.pendingTasks?.length
            ? `TAREAS PENDIENTES: ${memory.pendingTasks.slice(0, 5).map(t => t.title).join(' | ')}`
            : null,
        ];
        vaultContext = parts.filter(Boolean).join('\n');
      }

      // ── Debug: verificar contenido de archivos ──
      console.log('[BetaChat] projectFiles:', projectFiles.length, projectFiles.map(f => ({ name: f.title, contentLen: f.content?.length || 0 })));
      console.log('[BetaChat] vaultContext chars:', vaultContext?.length || 0);

      // Construir el mensaje final: si hay archivos, incluir su contenido DIRECTAMENTE en el mensaje
      let finalMessage = payloadPrompt;
      if (projectFiles.length > 0) {
        const docsText = projectFiles
          .filter(f => f.content && f.content.length > 0)
          .map((f, idx) => {
            const isImage = f.fileType?.startsWith('image/');
            if (isImage) return `[ARCHIVO ${idx+1}: ${f.title} — Imagen adjunta al proyecto]`;
            return `[ARCHIVO ${idx+1}: ${f.title} (${(f.charCount || f.content.length).toLocaleString()} chars)]\n${f.content}`;
          })
          .join('\n\n---\n\n');
        if (docsText) {
          const totalChars = projectFiles.reduce((sum, f) => sum + (f.content?.length || 0), 0);
          finalMessage = [
            `=== CONTEXTO COMPLETO DEL PROYECTO "${activeProject?.name}" ===`,
            `Archivos cargados: ${projectFiles.length} | Total chars: ${totalChars.toLocaleString()}`,
            ``,
            docsText,
            ``,
            `=== PREGUNTA DEL USUARIO ===`,
            payloadPrompt,
            ``,
            `INSTRUCCIÓN: Responde usando la información de los archivos anteriores. Cita datos exactos si están disponibles. Si el monto exacto no aparece, dedúcelo matemáticamente con los datos disponibles y explica el cálculo paso a paso.`,
          ].join('\n');
        }
      }

      const response = await axios.post('/api/pandora/v2/execute', {
        message: finalMessage,
        projectId: activeProject?.id || projectId,
        companyId: 'local_company',
        attachments: attachments,
        v2: true,
        projectContext: vaultContext
          ? { ...projectData, vaultContext, projectName: activeProject.name }
          : projectData
      });

      if (response.data.success) {
        const engineInfo = response.data.engine_info || {};
        addMessage({
          id: Date.now() + 1,
          role: 'assistant',
          content: response.data.output,
          engine_info: engineInfo,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
        // Guardar log del engine para el panel de diagnóstico
        setEngineLog({
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          prompt: payloadPrompt.slice(0, 120) + (payloadPrompt.length > 120 ? '...' : ''),
          project: activeProject?.name || 'Sin proyecto',
          filesLoaded: projectFiles.length,
          fileNames: projectFiles.map(f => f.title),
          hasNotes: !!activeProject?.notes,
          contextChars: vaultContext?.length || 0,
          model: engineInfo.model || 'N/A',
          tools: engineInfo.tools_used || [],
          mode: engineInfo.mode || 'Chat',
          api: engineInfo.api || 'Pandora Engine',
          rawContext: vaultContext?.slice(0, 800) || 'Sin contexto',
        });
        setAttachments([]);
        setShowStatus(true);
        setTimeout(() => setShowStatus(false), 3000);
      }
    } catch (error) {
      console.error('PANDORA_V3_ERROR:', error);
      addMessage({
        id: Date.now() + 1,
        role: 'assistant',
        content: `❌ **Error V3**: ${error.response?.data?.message || error.message}.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleActionClick = (prompt) => {
    handleSend(null, prompt);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await axios.post('/api/pandora/v2/upload', formData);
      if (res.data.success) {
        setAttachments(prev => [...prev, { 
          name: file.name, 
          type: file.type, 
          content: res.data.content,
          previewUrl: file.type.includes('image') ? URL.createObjectURL(file) : null
        }]);
      }
    } catch (err) {
      alert('Error cargando archivo');
    } finally {
      setIsUploading(false);
    }
  };

  const removeAttachment = (idx) => {
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const handleClear = () => {
    if (window.confirm("¿Seguro que deseas limpiar el sandbox y borrar todo el contexto actual?")) {
      setMessages([]);
      setAttachments([]);
      setInput('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect({ target: { files: [e.dataTransfer.files[0]] } });
    }
  };

  return (
    <div 
      className="flex flex-row h-full w-full bg-[#0A0A0A] overflow-hidden relative"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >

      {/* ── PANEL ENGINE LOG (Diagnóstico del Motor) ────────────────────────── */}
      <AnimatePresence>
        {showEngineLog && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute right-0 top-0 bottom-0 z-50 w-80 bg-[#060606] border-l border-[#1A1A1A] flex flex-col shadow-2xl"
          >
            {/* Header del panel */}
            <div className="px-4 py-3 border-b border-[#1A1A1A] flex items-center justify-between bg-[#080808]">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-neon-cyan" />
                <span className="text-[9px] font-black text-white uppercase tracking-[3px]">Motor Log</span>
              </div>
              <button onClick={() => setShowEngineLog(false)} className="text-gray-600 hover:text-white transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {!engineLog ? (
                <div className="flex flex-col items-center justify-center h-32 opacity-40">
                  <Activity className="w-8 h-8 text-gray-600 mb-2" />
                  <p className="text-[9px] font-bold text-gray-600 uppercase tracking-widest text-center">
                    Envía una consulta para ver<br/>el diagnóstico del motor
                  </p>
                </div>
              ) : (
                <>
                  {/* Timestamp */}
                  <div className="text-[8px] font-bold text-gray-700 uppercase tracking-widest">
                    Última ejecución · {engineLog.timestamp}
                  </div>

                  {/* Consulta */}
                  <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5" /> Consulta Enviada
                    </p>
                    <p className="text-[10px] text-gray-300 leading-relaxed italic">"{engineLog.prompt}"</p>
                  </div>

                  {/* Modelo y motor */}
                  <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <Cpu className="w-2.5 h-2.5" /> Engine
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[9px] text-gray-600">Modelo</span>
                        <span className="text-[9px] font-bold text-neon-cyan">{engineLog.model}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[9px] text-gray-600">Modo</span>
                        <span className="text-[9px] font-bold text-neon-purple">{engineLog.mode}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[9px] text-gray-600">Herramientas</span>
                        <span className="text-[9px] font-bold text-yellow-400">
                          {engineLog.tools.length > 0 ? engineLog.tools.join(', ') : 'Ninguna'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Contexto del proyecto */}
                  <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A]">
                    <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1">
                      <FolderOpen className="w-2.5 h-2.5" /> Contexto del Proyecto
                    </p>
                    <div className="space-y-1.5">
                      <div className="flex justify-between">
                        <span className="text-[9px] text-gray-600">Proyecto</span>
                        <span className="text-[9px] font-bold text-white truncate max-w-[120px]">{engineLog.project}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-[9px] text-gray-600">Archivos Bóveda</span>
                        <span className={cn(
                          'text-[9px] font-black px-2 py-0.5 rounded-full',
                          engineLog.filesLoaded > 0
                            ? 'bg-green-500/15 text-green-400 border border-green-500/20'
                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        )}>
                          {engineLog.filesLoaded > 0 ? `✓ ${engineLog.filesLoaded} cargados` : '✗ 0 archivos'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[9px] text-gray-600">Notas del proyecto</span>
                        <span className={cn('text-[9px] font-bold', engineLog.hasNotes ? 'text-green-400' : 'text-gray-600')}>
                          {engineLog.hasNotes ? '✓ Sí' : '✗ No'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[9px] text-gray-600">Tamaño contexto</span>
                        <span className="text-[9px] font-bold text-gray-400">{engineLog.contextChars.toLocaleString()} chars</span>
                      </div>
                    </div>
                  </div>

                  {/* Archivos cargados */}
                  {engineLog.fileNames.length > 0 && (
                    <div className="p-3 rounded-xl bg-green-500/5 border border-green-500/10">
                      <p className="text-[8px] font-black text-green-400 uppercase tracking-widest mb-2 flex items-center gap-1">
                        <Database className="w-2.5 h-2.5" /> Archivos Enviados al Modelo
                      </p>
                      <div className="space-y-1">
                        {engineLog.fileNames.map((name, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <ChevronRight className="w-2.5 h-2.5 text-green-400 flex-shrink-0" />
                            <span className="text-[9px] text-gray-300 truncate">{name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contexto crudo (colapsable) */}
                  <details className="group">
                    <summary className="text-[8px] font-black text-gray-700 uppercase tracking-widest cursor-pointer flex items-center gap-1 hover:text-gray-500 list-none">
                      <ChevronDown className="w-2.5 h-2.5 group-open:rotate-180 transition-transform" />
                      Ver Contexto Enviado (raw)
                    </summary>
                    <pre className="mt-2 text-[8px] text-gray-500 leading-relaxed whitespace-pre-wrap font-mono bg-[#060606] p-3 rounded-xl border border-[#1A1A1A] max-h-48 overflow-y-auto">
                      {engineLog.rawContext}
                    </pre>
                  </details>

                  {/* Estado genéral */}
                  <div className={cn(
                    'p-3 rounded-xl border flex items-center gap-2',
                    engineLog.filesLoaded > 0 && engineLog.contextChars > 100
                      ? 'bg-green-500/5 border-green-500/20'
                      : 'bg-yellow-500/5 border-yellow-500/20'
                  )}>
                    <Shield className={cn('w-3.5 h-3.5 flex-shrink-0', engineLog.filesLoaded > 0 ? 'text-green-400' : 'text-yellow-400')} />
                    <p className="text-[9px] text-gray-400 leading-relaxed">
                      {engineLog.filesLoaded > 0 && engineLog.contextChars > 100
                        ? `✓ El modelo recibió el contexto completo del proyecto incluyendo ${engineLog.filesLoaded} archivo(s).`
                        : '⚠ El modelo no recibió archivos del proyecto. Sube archivos en la Bóveda y asegúrate de seleccionar el proyecto correcto.'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Overlay de Drag & Drop */}
      <AnimatePresence>
        {isDragging && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-neon-cyan/10 backdrop-blur-sm border-2 border-dashed border-neon-cyan/50 flex items-center justify-center pointer-events-none"
          >
            <div className="p-8 rounded-[40px] bg-black/80 flex flex-col items-center gap-4 shadow-2xl">
              <Plus className="w-16 h-16 text-neon-cyan animate-pulse" />
              <p className="text-xl font-black text-white uppercase tracking-widest">Suelta para adjuntar al Sandbox</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* AREA DE CHAT PRINCIPAL */}
      <div className="flex-1 flex flex-col h-full relative border-r border-white/5">
        
        {/* Barra de Estatus Superior */}
        <AnimatePresence>
          {showStatus && (
            <motion.div 
              initial={{ opacity: 0, y: -20, x: '-50%' }}
              animate={{ opacity: 1, y: 0, x: '-50%' }}
              exit={{ opacity: 0, y: -20, x: '-50%' }}
              className="absolute top-6 left-1/2 z-50 px-6 py-2.5 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-[10px] font-black uppercase tracking-[3px] shadow-glow-sm flex items-center gap-3 backdrop-blur-md"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Análisis Ejecutivo V3: Sincronizado
            </motion.div>
          )}
        </AnimatePresence>

        <input type="file" ref={fileInputRef} onChange={handleFileSelect} className="hidden" />

        {/* Mensajes */}
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 md:px-12 lg:px-24 py-12 space-y-12 pb-32">
          {messages.length === 0 && !isTyping ? (
            <div className="h-full flex flex-col items-center justify-center pt-20">
               <div className="text-center space-y-8">
                   <h2 className="text-[120px] font-black text-white tracking-[-5px] leading-none select-none opacity-20">PANDORA</h2>
                   <div className="flex flex-col items-center gap-4">
                      <div className="w-12 h-1 bg-neon-cyan shadow-glow-sm" />
                      <p className="text-[14px] text-gray-500 font-bold uppercase tracking-[8px] opacity-60">Strategic AI Console V3</p>
                   </div>
                </div>
            </div>
          ) : (
            <div className="max-w-6xl mx-auto w-full space-y-20">
              <AnimatePresence initial={false}>
                {messages.map((msg) => (
                  <motion.div 
                    key={msg.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn("w-full flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}
                  >
                    <div className={cn("flex items-center gap-4 mb-4", msg.role === 'user' ? "flex-row-reverse" : "flex-row")}>
                      <div className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center text-[10px] font-black tracking-widest",
                        msg.role === 'user' ? "bg-white/5 text-gray-500 border border-white/5" : "bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 shadow-glow-sm"
                      )}>
                        {msg.role === 'user' ? 'USER' : 'PNDR'}
                      </div>
                      <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest opacity-40">{msg.timestamp}</span>
                    </div>
                    
                    <div className="w-full">
                      <ResponseRenderer data={msg.content} />
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {isTyping && (
                <motion.div className="w-full py-20 flex flex-col items-center justify-center space-y-12 rounded-[64px] bg-white/[0.01] border border-dashed border-white/5">
                  <div className="relative">
                    <div className="w-24 h-24 rounded-full border-2 border-neon-cyan/20 border-t-neon-cyan animate-spin" />
                    <Cpu className="absolute inset-0 m-auto w-8 h-8 text-neon-cyan animate-pulse" />
                  </div>
                  <div className="flex flex-col items-center gap-4">
                    <p className="text-[12px] font-black text-neon-cyan uppercase tracking-[6px] animate-pulse text-center max-w-sm px-4">
                      {currentStatus}
                    </p>
                    <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ x: "-100%" }} 
                        animate={{ x: "0%" }} 
                        transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                        className="w-full h-full bg-neon-cyan shadow-glow-sm" 
                       />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* INPUT FIJO INFERIOR */}
        <div className="absolute bottom-0 left-0 w-full p-8 md:p-12 bg-gradient-to-t from-black via-black/80 to-transparent z-40">
          <form onSubmit={handleSend} className="max-w-5xl mx-auto">
            
            <AnimatePresence>
              {attachments.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap gap-2 mb-6">
                  {attachments.map((file, i) => (
                    <div key={i} className="flex relative group">
                       {file.type.includes('image') && file.previewUrl ? (
                         <div className="relative w-16 h-16 rounded-xl border border-neon-cyan/30 overflow-hidden bg-black flex shrink-0 items-center justify-center shadow-lg">
                            <img src={file.previewUrl} className="w-full h-full object-cover" />
                            <button type="button" onClick={() => removeAttachment(i)} className="absolute top-1 right-1 p-0.5 bg-black/60 rounded-full text-white hover:text-red-500 transition-all opacity-0 group-hover:opacity-100"><X className="w-3 h-3" /></button>
                         </div>
                       ) : (
                         <div className="flex items-center gap-3 px-5 py-2.5 bg-neon-cyan/5 border border-neon-cyan/20 rounded-full">
                           <FileText className="w-4 h-4 text-neon-cyan" />
                           <span className="text-[10px] font-black text-white uppercase tracking-widest">{file.name}</span>
                           <button type="button" onClick={() => removeAttachment(i)} className="text-gray-500 hover:text-white transition-all"><X className="w-4 h-4" /></button>
                         </div>
                       )}
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative group/input">
              <div className="absolute inset-0 bg-neon-cyan/20 rounded-[56px] blur-2xl opacity-0 group-focus-within/input:opacity-100 transition-opacity" />
              <div className={cn(
                "relative flex items-center bg-black border border-white/10 rounded-[56px] px-8 py-5 transition-all shadow-2xl overflow-hidden",
                isTyping ? "opacity-50 pointer-events-none" : "hover:border-white/20 focus-within:border-neon-cyan/60"
              )}>
                <button type="button" onClick={() => fileInputRef.current.click()} className="p-2 text-gray-500 hover:text-neon-cyan transition-colors">
                  <Plus className="w-6 h-6" />
                </button>
                
                <textarea
                  className="flex-1 bg-transparent px-6 text-[16px] text-gray-100 placeholder-gray-700 outline-none resize-none max-h-[120px] custom-scrollbar"
                  placeholder={t('chat.inputPlaceholder', 'Inicia un análisis estratégico o selecciona una acción...')}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { 
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  onPaste={(e) => {
                    const items = e.clipboardData?.items;
                    if (!items) return;
                    for (let i = 0; i < items.length; i++) {
                      if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('application/pdf') !== -1) {
                        // Es un archivo, prevenimos que se pegue como texto
                        e.preventDefault();
                        const file = items[i].getAsFile();
                        if (file) handleFileSelect({ target: { files: [file] } });
                      }
                    }
                  }}
                />

                <div className="flex items-center gap-4">
                  {messages.length > 0 && (
                    <button type="button" onClick={handleClear} className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 hover:bg-red-500 hover:text-white transition-all">
                      <Trash2 className="w-6 h-6" />
                    </button>
                  )}
                  <button type="submit" className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-black hover:bg-neon-cyan transition-all shadow-glow-sm disabled:opacity-20" disabled={(!input.trim() && attachments.length === 0) || isTyping}>
                    {isTyping ? <Loader2 className="w-6 h-6 animate-spin" /> : <ArrowUp className="w-6 h-6" />}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* BARRA DE COMANDO DERECHA (V3) - dinámica */}
      <motion.div 
        initial={false}
        animate={{ width: isActionsExpanded ? 240 : 84 }}
        className="flex-shrink-0 bg-[#050505] border-l border-white/5 flex flex-col items-center overflow-y-auto overflow-x-hidden relative"
      >
        {/* Botón Expansor Pestaña */}
        <button 
          onClick={() => setIsActionsExpanded(!isActionsExpanded)}
          title={isActionsExpanded ? "Ocultar descripciones" : "Mostrar descripciones"}
          className="relative w-full h-12 border-b border-white/5 flex items-center justify-center text-gray-500 hover:text-white hover:bg-white/5 transition-all outline-none"
        >
          <motion.div animate={{ rotate: isActionsExpanded ? 180 : 0 }}>
            <ChevronRight className="w-5 h-5" />
          </motion.div>
        </button>

        {/* Botón Engine Log en la barra derecha */}
        <button
          onClick={() => setShowEngineLog(p => !p)}
          title="Motor Log — ver diagnóstico del engine"
          className={cn(
            'relative h-12 rounded-2xl flex flex-col items-center justify-center gap-0.5 my-2 transition-all group overflow-hidden',
            isActionsExpanded ? 'w-48 px-4 flex-row justify-start gap-3' : 'w-12',
            showEngineLog
              ? 'bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan'
              : 'bg-transparent text-gray-600 hover:text-white hover:bg-white/5'
          )}
        >
          <Activity className="w-5 h-5 flex-shrink-0" />
          {isActionsExpanded ? (
            <span className="text-[11px] font-black uppercase tracking-[2px] leading-none text-white whitespace-nowrap">Engine Log</span>
          ) : (
            <span className="text-[7px] font-black uppercase tracking-wider leading-none">LOG</span>
          )}
          {engineLog && (
            <span className={cn(
              'absolute border-2 border-[#050505]',
              isActionsExpanded ? 'right-4 top-1/2 -translate-y-1/2 w-3 h-3 rounded-full' : '-top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full',
              engineLog.filesLoaded > 0 ? 'bg-green-400' : 'bg-yellow-400'
            )} />
          )}
        </button>
        <ExecutiveActions onAction={handleActionClick} isExpanded={isActionsExpanded} />
      </motion.div>

    </div>
  );
}

export default BetaChat;
