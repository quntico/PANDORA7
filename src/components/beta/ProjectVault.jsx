import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FolderOpen, Plus, Trash2, Edit3, Save, X,
  CheckCircle2, Clock, Tag, FileText, Brain,
  ChevronRight, BarChart3, Upload, Loader2,
  File, Image as ImageIcon, FileSpreadsheet,
  FileType, Download, Eye
} from 'lucide-react';
import { useBeta } from '@/context/BetaContext';
import { supabase } from '@/supabase';
import { cn } from '@/lib/utils';
import axios from 'axios';

// ── Icono por tipo de archivo ─────────────────────────────────────────────────
function FileTypeIcon({ type, className = 'w-4 h-4' }) {
  if (type?.includes('pdf'))                                  return <FileText className={cn(className, 'text-red-400')} />;
  if (type?.includes('image'))                                return <ImageIcon className={cn(className, 'text-blue-400')} />;
  if (type?.includes('sheet') || type?.includes('excel') || type?.includes('csv')) return <FileSpreadsheet className={cn(className, 'text-green-400')} />;
  if (type?.includes('word') || type?.includes('doc'))        return <FileType className={cn(className, 'text-blue-300')} />;
  return <File className={cn(className, 'text-gray-400')} />;
}

// ── Extensión desde nombre ─────────────────────────────────────────────────────
function getExt(name) {
  return (name?.split('.').pop() || '').toUpperCase().slice(0, 4);
}

// ── Zona de carga de archivos (drag & drop) ───────────────────────────────────
function FileDropZone({ onFilesExtracted, isUploading }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);

  const processFiles = useCallback(async (files) => {
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      try {
        const res = await axios.post('/api/pandora/v2/upload', formData);
        if (res.data.success) {
          onFilesExtracted(file.name, file.type, res.data.content || '', file);
        }
      } catch {
        onFilesExtracted(file.name, file.type, `[Archivo adjunto: ${file.name}]`, file);
      }
    }
  }, [onFilesExtracted]);

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) await processFiles(e.dataTransfer.files);
  };

  const handleChange = async (e) => {
    if (e.target.files?.length) await processFiles(e.target.files);
    e.target.value = '';
  };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      onClick={() => fileRef.current?.click()}
      className={cn(
        'relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-5 cursor-pointer transition-all duration-200 select-none',
        isDragging
          ? 'border-neon-cyan/60 bg-neon-cyan/5 scale-[1.01]'
          : 'border-[#2A2A2A] bg-[#0A0A0A] hover:border-[#3A3A3A] hover:bg-[#0D0D0D]'
      )}
    >
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".pdf,.txt,.md,.csv,.json,.xlsx,.docx,image/*"
        className="hidden"
        onChange={handleChange}
      />

      {isUploading ? (
        <>
          <Loader2 className="w-6 h-6 text-neon-cyan animate-spin" />
          <span className="text-[9px] font-black text-neon-cyan uppercase tracking-widest">Extrayendo contenido...</span>
        </>
      ) : (
        <>
          <div className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center transition-colors',
            isDragging ? 'bg-neon-cyan/20' : 'bg-[#151515]'
          )}>
            <Upload className={cn('w-5 h-5', isDragging ? 'text-neon-cyan' : 'text-gray-500')} />
          </div>
          <div className="text-center">
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              Arrastra archivos aquí o <span className="text-neon-cyan">haz clic</span>
            </p>
            <p className="text-[8px] text-gray-700 mt-1 uppercase tracking-wider">
              PDF · TXT · CSV · DOCX · XLSX · Imágenes
            </p>
          </div>
        </>
      )}

      {isDragging && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 rounded-xl border-2 border-neon-cyan/40 pointer-events-none"
        />
      )}
    </div>
  );
}

// ── Editor inline de Proyecto ─────────────────────────────────────────────────
function ProjectEditor({ project, onSave, onCancel }) {
  const [form, setForm] = useState({
    name:        project?.name || '',
    description: project?.description || '',
    notes:       project?.notes || '',
    tags:        project?.tags?.join(', ') || '',
    status:      project?.status || 'active',
  });
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading]     = useState(false);

  // Guardar archivo como artefacto en Supabase (campo 'data' JSONB)
  const saveFileToSupabase = async (fileName, fileType, content, projectId) => {
    if (!projectId || projectId === 'local-fallback-id') return;
    try {
      // Guardar el contenido COMPLETO (sin truncar) — GPT-4o soporta 128K tokens
      const { error } = await supabase.from('project_artifacts_beta').insert([{
        project_id: projectId,
        type:       'file',
        title:      fileName,
        data:       JSON.stringify({ 
          fileType, 
          content: content || '',   // Sin truncar
          uploadedAt: new Date().toISOString(),
          charCount: content?.length || 0,
        })
      }]);
      if (error) console.error('[ProjectVault] Error guardando archivo en Supabase:', error);
      else        console.log(`[ProjectVault] Archivo guardado: ${fileName} (${content?.length || 0} chars, tipo: ${fileType})`);
    } catch (err) {
      console.error('[ProjectVault] Error guardando artefacto:', err);
    }
  };

  const handleFilesExtracted = useCallback((fileName, fileType, content, rawFile) => {
    setAttachedFiles(prev => {
      if (prev.find(f => f.name === fileName)) return prev;
      return [...prev, { name: fileName, type: fileType, content }];
    });
    setForm(f => ({
      ...f,
      notes: f.notes
        ? `${f.notes}\n\n--- Contenido de: ${fileName} ---\n${content}`
        : `--- Contenido de: ${fileName} ---\n${content}`,
    }));
    setIsUploading(false);
    // Guardar en Supabase si el proyecto ya existe
    if (project?.id && project.id !== 'local-fallback-id') {
      saveFileToSupabase(fileName, fileType, content, project.id);
    }
  }, [project?.id]);

  const removeFile = (fileName) => {
    const file = attachedFiles.find(f => f.name === fileName);
    if (file) {
      setForm(f => ({
        ...f,
        notes: f.notes
          .replace(`\n\n--- Contenido de: ${fileName} ---\n${file.content}`, '')
          .replace(`--- Contenido de: ${fileName} ---\n${file.content}`, '')
          .trim(),
      }));
    }
    setAttachedFiles(prev => prev.filter(f => f.name !== fileName));
  };

  const handleSave = () => {
    onSave({
      ...project,
      ...form,
      tags: form.tags.split(',').map(t => t.trim()).filter(Boolean),
      attachedFiles,
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-2xl border border-neon-cyan/20 bg-[#0A0A0A] p-5 space-y-4"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-black text-neon-cyan uppercase tracking-[3px]">
          {project?.id ? 'Editar Proyecto' : 'Nuevo Proyecto'}
        </span>
        <button onClick={onCancel} className="text-gray-600 hover:text-white transition-colors">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Nombre */}
      <div>
        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Nombre</label>
        <input
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          className="w-full bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl px-3 py-2 text-sm text-white outline-none focus:border-neon-cyan/40 transition-all"
          placeholder="Nombre del proyecto..."
        />
      </div>

      {/* Descripción */}
      <div>
        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Descripción</label>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={3}
          className="w-full bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl px-3 py-2 text-sm text-gray-300 outline-none focus:border-neon-cyan/40 transition-all resize-none"
          placeholder="¿De qué trata este proyecto?"
        />
      </div>

      {/* ── ZONA DRAG & DROP ─────────────────────────────────────────── */}
      <div>
        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-2">
          Archivos de Contexto (arrastrar y soltar)
        </label>

        <FileDropZone
          onFilesExtracted={(name, type, content, rawFile) => {
            setIsUploading(true);
            setTimeout(() => handleFilesExtracted(name, type, content, rawFile), 300);
          }}
          isUploading={isUploading}
        />

        {/* Chips de archivos adjuntos */}
        <AnimatePresence>
          {attachedFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-wrap gap-2 mt-3"
            >
              {attachedFiles.map(f => (
                <motion.div
                  key={f.name}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-neon-cyan/5 border border-neon-cyan/20 group"
                >
                  <FileTypeIcon type={f.type} className="w-3.5 h-3.5" />
                  <span className="text-[9px] font-bold text-gray-300 max-w-[140px] truncate">{f.name}</span>
                  <button
                    onClick={() => removeFile(f.name)}
                    className="text-gray-600 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Notas / Contexto ejecutivo */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest">
            Notas / Contexto Ejecutivo
          </label>
          {form.notes && (
            <span className="text-[8px] text-gray-700 font-bold">
              {form.notes.length} caracteres
            </span>
          )}
        </div>
        <textarea
          value={form.notes}
          onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
          rows={6}
          className="w-full bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl px-3 py-2 text-sm text-gray-300 outline-none focus:border-neon-purple/40 transition-all resize-none font-mono text-[11px] leading-relaxed"
          placeholder="Información clave, supuestos, restricciones, objetivos... (También se completa automáticamente al subir archivos)"
        />
      </div>

      {/* Etiquetas */}
      <div>
        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">
          Etiquetas (separadas por coma)
        </label>
        <input
          value={form.tags}
          onChange={e => setForm(f => ({ ...f, tags: e.target.value }))}
          className="w-full bg-[#0D0D0D] border border-[#1A1A1A] rounded-xl px-3 py-2 text-sm text-gray-300 outline-none focus:border-neon-purple/40 transition-all"
          placeholder="manufactura, reciclaje, startup..."
        />
      </div>

      {/* Estado */}
      <div>
        <label className="text-[9px] font-black text-gray-600 uppercase tracking-widest block mb-1.5">Estado</label>
        <div className="flex gap-2">
          {['active', 'paused', 'archived'].map(s => (
            <button
              key={s}
              onClick={() => setForm(f => ({ ...f, status: s }))}
              className={cn(
                'flex-1 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border transition-all',
                form.status === s
                  ? s === 'active' ? 'bg-green-500/15 border-green-500/40 text-green-400'
                    : s === 'paused' ? 'bg-yellow-500/15 border-yellow-500/40 text-yellow-400'
                    : 'bg-gray-500/15 border-gray-500/40 text-gray-400'
                  : 'bg-transparent border-[#1A1A1A] text-gray-600 hover:border-[#2A2A2A]'
              )}
            >
              {s === 'active' ? 'Activo' : s === 'paused' ? 'Pausado' : 'Archivado'}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={!form.name.trim()}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan text-[10px] font-black uppercase tracking-widest hover:bg-neon-cyan/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <Save className="w-4 h-4" />
        Guardar Proyecto
      </button>
    </motion.div>
  );
}



// ── Tarjeta visual de un Proyecto ─────────────────────────────────────────────
function ProjectCard({ project, isActive, onSelect, onEdit, onDelete, fileTypes = {} }) {
  const statusColor = {
    active:   'bg-green-400 shadow-[0_0_8px_rgba(0,255,100,0.5)]',
    paused:   'bg-yellow-400',
    archived: 'bg-gray-600',
  };

  // Indicadores de tipos de archivo — se encienden si el proyecto tiene ese tipo
  const fileIndicators = [
    {
      key:   'pdf',
      label: 'PDF',
      icon:  '\uD83D\uDCC4',
      activeColor: 'text-red-400 border-red-400/40 bg-red-400/10',
      inactiveColor: 'text-gray-700 border-gray-800 bg-transparent',
    },
    {
      key:   'excel',
      label: 'XLS',
      icon:  '\uD83D\uDCCA',
      activeColor: 'text-green-400 border-green-400/40 bg-green-400/10',
      inactiveColor: 'text-gray-700 border-gray-800 bg-transparent',
    },
    {
      key:   'image',
      label: 'IMG',
      icon:  '\uD83D\uDDBC\uFE0F',
      activeColor: 'text-blue-400 border-blue-400/40 bg-blue-400/10',
      inactiveColor: 'text-gray-700 border-gray-800 bg-transparent',
    },
    {
      key:   'video',
      label: 'VID',
      icon:  '\uD83C\uDFAC',
      activeColor: 'text-purple-400 border-purple-400/40 bg-purple-400/10',
      inactiveColor: 'text-gray-700 border-gray-800 bg-transparent',
    },
    {
      key:   'word',
      label: 'DOC',
      icon:  '\uD83D\uDCDD',
      activeColor: 'text-sky-400 border-sky-400/40 bg-sky-400/10',
      inactiveColor: 'text-gray-700 border-gray-800 bg-transparent',
    },
  ];

  const projectTypes = fileTypes[project.id] || {};
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'group relative rounded-2xl border p-4 cursor-pointer transition-all duration-300',
        isActive
          ? 'bg-neon-cyan/5 border-neon-cyan/30 shadow-[0_0_20px_rgba(0,217,255,0.1)]'
          : 'bg-[#0A0A0A] border-[#1A1A1A] hover:border-[#2A2A2A] hover:bg-[#0D0D0D]'
      )}
      onClick={() => onSelect(project)}
    >
      {/* Active indicator */}
      {isActive && (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neon-cyan/10 border border-neon-cyan/20">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse" />
          <span className="text-[8px] font-black text-neon-cyan uppercase tracking-widest">Activo</span>
        </div>
      )}

      <div className="flex items-start gap-3 pr-16">
        <div className={cn(
          'w-2 h-2 rounded-full mt-1.5 flex-shrink-0',
          statusColor[project.status] || statusColor.active
        )} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-white truncate">{project.name}</p>
          {project.description && (
            <p className="text-[10px] text-gray-600 mt-0.5 line-clamp-2 leading-relaxed">
              {project.description}
            </p>
          )}
          <p className="text-[9px] text-gray-700 font-bold uppercase tracking-wider mt-2">
            {project.lastUpdate || 'Actualizado recientemente'}
          </p>
        </div>
      </div>

      {/* File Type Indicators ── se encienden según los archivos del proyecto */}
      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-[#111]">
        {fileIndicators.map(ind => {
          const active = !!projectTypes[ind.key];
          return (
            <div
              key={ind.key}
              title={`${ind.label}: ${projectTypes[ind.key] || 0} archivo(s)`}
              className={cn(
                'flex items-center gap-1 px-1.5 py-0.5 rounded-lg border text-[8px] font-black uppercase tracking-wider transition-all',
                active ? ind.activeColor : ind.inactiveColor
              )}
            >
              <span className="text-[10px] leading-none">{ind.icon}</span>
              <span>{ind.label}</span>
              {active && (
                <span className="ml-0.5 text-[7px] opacity-70">{projectTypes[ind.key]}</span>
              )}
            </div>
          );
        })}
      </div>

      {/* Acciones */}
      <div className="absolute bottom-3 right-3 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(project); }}
          className="p-1.5 rounded-lg bg-[#151515] border border-[#222] text-gray-500 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all"
        >
          <Edit3 className="w-3 h-3" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(project); }}
          className="p-1.5 rounded-lg bg-[#151515] border border-[#222] text-gray-500 hover:text-red-400 hover:border-red-400/30 transition-all"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </motion.div>
  );
}




// ── Panel de Detalles del Proyecto Activo ─────────────────────────────────────
function ActiveProjectDetails({ project, memory, messages, artifacts, onAddFiles }) {
  const decisions = memory?.decisions || [];
  const tasks     = memory?.pendingTasks || [];
  const aiMsgs    = messages?.filter(m => m.role === 'assistant') || [];

  // Archivos del proyecto: filtrar artefactos de tipo 'file' de Supabase
  const [projectFiles, setProjectFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [deletingId, setDeletingId]     = useState(null);
  const [previewFile, setPreviewFile]   = useState(null);

  useEffect(() => {
    if (!project?.id || project.id === 'local-fallback-id') return;
    setLoadingFiles(true);
    supabase
      .from('project_artifacts_beta')
      .select('*')
      .eq('project_id', project.id)
      .eq('type', 'file')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('[ProjectVault] Error cargando archivos:', error);
        // Parsear el campo 'data' JSONB de cada registro
        const files = (data || []).map(f => ({
          ...f,
          parsedData: (() => { try { return JSON.parse(f.data || '{}'); } catch { return {}; } })()
        }));
        setProjectFiles(files);
        setLoadingFiles(false);
      });
  }, [project?.id]);

  const handleDeleteFile = async (fileId) => {
    setDeletingId(fileId);
    await supabase.from('project_artifacts_beta').delete().eq('id', fileId);
    setProjectFiles(prev => prev.filter(f => f.id !== fileId));
    setDeletingId(null);
  };

  // ── Zona Drop Directa en detalle (sin abrir editor) ─────────────────────────
  const [isDroppingHere, setIsDroppingHere] = useState(false);
  const [uploadingHere, setUploadingHere]   = useState(false);
  const detailFileRef = useRef(null);

  const processDetailFiles = useCallback(async (files) => {
    if (!project?.id || project.id === 'local-fallback-id') return;
    setUploadingHere(true);
    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append('file', file);
      let content = '';
      try {
        const res = await axios.post('/api/pandora/v2/upload', formData);
        content = res.data?.content || '';
      } catch {}
      const { error } = await supabase.from('project_artifacts_beta').insert([{
        project_id: project.id,
        type:       'file',
        title:      file.name,
        data:       JSON.stringify({ 
          fileType: file.type, 
          content: content, 
          charCount: content?.length || 0,
          uploadedAt: new Date().toISOString() 
        })
      }]);
      if (!error) {
        const newFile = {
          id: Date.now() + Math.random(),
          project_id: project.id,
          type: 'file',
          title: file.name,
          created_at: new Date().toISOString(),
          parsedData: { fileType: file.type, content }
        };
        setProjectFiles(prev => [newFile, ...prev]);
      }
    }
    setUploadingHere(false);
  }, [project?.id]);

  const handleDetailDrop = (e) => {
    e.preventDefault();
    setIsDroppingHere(false);
    if (e.dataTransfer.files?.length) processDetailFiles(e.dataTransfer.files);
  };

  const stats = [
    { label: 'Análisis IA', value: aiMsgs.length,       icon: Brain,        color: 'text-neon-cyan' },
    { label: 'Archivos',    value: projectFiles.length,  icon: FileText,     color: 'text-orange-400' },
    { label: 'Decisiones',  value: decisions.length,     icon: CheckCircle2, color: 'text-green-400' },
    { label: 'Tareas',      value: tasks.length,          icon: Clock,        color: 'text-yellow-400' },
  ];

  const tags = project?.tags || [];

  // Mini preview modal
  const PreviewModal = () => previewFile ? (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-6"
      onClick={() => setPreviewFile(null)}
    >
      <motion.div
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        className="bg-[#0A0A0A] border border-[#2A2A2A] rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FileTypeIcon type={previewFile.parsedData?.fileType || ''} />
            <span className="text-sm font-bold text-white">{previewFile.title}</span>
          </div>
          <button onClick={() => setPreviewFile(null)} className="text-gray-600 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
        <pre className="text-[10px] text-gray-400 leading-relaxed whitespace-pre-wrap font-mono bg-[#060606] p-4 rounded-xl border border-[#1A1A1A]">
          {previewFile.parsedData?.content || 'Sin contenido extraído'}
        </pre>
      </motion.div>
    </motion.div>
  ) : null;

  return (
    <div className="space-y-5">
      <AnimatePresence>{previewFile && <PreviewModal />}</AnimatePresence>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        {stats.map(s => (
          <div key={s.label} className="p-3 rounded-xl bg-[#0A0A0A] border border-[#151515] flex flex-col gap-1">
            <s.icon className={cn('w-3.5 h-3.5', s.color)} />
            <span className="text-xl font-black text-white leading-none">{s.value}</span>
            <span className="text-[8px] font-bold text-gray-600 uppercase tracking-widest">{s.label}</span>
          </div>
        ))}
      </div>

      {/* ── ARCHIVOS DEL PROYECTO ───────────────────── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDroppingHere(true); }}
        onDragLeave={() => setIsDroppingHere(false)}
        onDrop={handleDetailDrop}
      >
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-black text-orange-400 uppercase tracking-[3px] flex items-center gap-1.5">
            <FileText className="w-3 h-3" /> Archivos del Proyecto
          </p>
          <div className="flex items-center gap-2">
            {uploadingHere && <Loader2 className="w-3 h-3 text-orange-400 animate-spin" />}
            <button
              onClick={() => detailFileRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-orange-400/10 border border-orange-400/20 text-orange-400 text-[8px] font-black uppercase tracking-widest hover:bg-orange-400/20 transition-all"
            >
              <Upload className="w-2.5 h-2.5" /> Subir
            </button>
          </div>
        </div>
        <input ref={detailFileRef} type="file" multiple accept=".pdf,.txt,.md,.csv,.json,.xlsx,.docx,image/*" className="hidden"
          onChange={(e) => { if (e.target.files?.length) processDetailFiles(e.target.files); e.target.value = ''; }} />

        {loadingFiles ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-4 h-4 text-gray-600 animate-spin" />
          </div>
        ) : projectFiles.length === 0 ? (
          <div
            onClick={() => detailFileRef.current?.click()}
            className={cn(
              'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-2 cursor-pointer transition-all group',
              isDroppingHere
                ? 'border-orange-400/60 bg-orange-400/10 scale-[1.01]'
                : 'border-[#1A1A1A] hover:border-orange-400/30 hover:bg-orange-400/5'
            )}
          >
            <Upload className={cn('w-6 h-6 transition-colors', isDroppingHere ? 'text-orange-400' : 'text-gray-700 group-hover:text-orange-400')} />
            <p className={cn('text-[9px] font-black uppercase tracking-widest transition-colors', isDroppingHere ? 'text-orange-400' : 'text-gray-600 group-hover:text-orange-400')}>
              {isDroppingHere ? 'Suelta aqui para subir' : 'Arrastra archivos o haz clic'}
            </p>
            <p className="text-[8px] text-gray-700">PDF · Excel · Word · Imágenes · CSV</p>
          </div>
        ) : (
          <div className={cn(
            'space-y-2 rounded-xl transition-all',
            isDroppingHere && 'ring-2 ring-orange-400/40 bg-orange-400/5 p-2'
          )}>
            <AnimatePresence>
              {projectFiles.map(file => {
                const meta = file.parsedData || {};
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#0A0A0A] border border-[#181818] group hover:border-[#2A2A2A] transition-all"
                  >
                    {/* Icono tipo */}
                    <div className="w-9 h-9 rounded-xl bg-[#111] border border-[#1A1A1A] flex items-center justify-center flex-shrink-0">
                      <FileTypeIcon type={meta.fileType} className="w-4 h-4" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-gray-200 truncate">{file.title}</p>
                      <p className="text-[8px] text-gray-600 mt-0.5 uppercase tracking-wider">
                        {getExt(file.title)} · {new Date(file.created_at).toLocaleDateString('es-MX')}
                      </p>
                    </div>

                    {/* Badge extensión */}
                    <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-[#151515] border border-[#222] text-gray-500 uppercase flex-shrink-0">
                      {getExt(file.title)}
                    </span>

                    {/* Acciones */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {meta.content && (
                        <button
                          onClick={() => setPreviewFile(file)}
                          className="p-1.5 rounded-lg bg-[#151515] border border-[#222] text-gray-600 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all"
                          title="Ver contenido extraído"
                        >
                          <Eye className="w-3 h-3" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        disabled={deletingId === file.id}
                        className="p-1.5 rounded-lg bg-[#151515] border border-[#222] text-gray-600 hover:text-red-400 hover:border-red-400/30 transition-all"
                        title="Eliminar archivo"
                      >
                        {deletingId === file.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Descripción */}
      {project?.description && (
        <div className="p-4 rounded-xl bg-[#0A0A0A] border border-[#151515]">
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <FileText className="w-3 h-3" /> Descripción
          </p>
          <p className="text-[11px] text-gray-300 leading-relaxed">{project.description}</p>
        </div>
      )}

      {/* Notas ejecutivas */}
      {project?.notes && (
        <div className="p-4 rounded-xl bg-neon-purple/5 border border-neon-purple/20">
          <p className="text-[9px] font-black text-neon-purple uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Brain className="w-3 h-3" /> Contexto Ejecutivo
          </p>
          <p className="text-[11px] text-gray-300 leading-relaxed whitespace-pre-wrap line-clamp-6">{project.notes}</p>
        </div>
      )}

      {/* Etiquetas */}
      {tags.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Tag className="w-3 h-3" /> Etiquetas
          </p>
          <div className="flex flex-wrap gap-1.5">
            {tags.map(t => (
              <span key={t} className="px-2 py-0.5 rounded-full bg-[#0D0D0D] border border-[#1A1A1A] text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Últimas decisiones */}
      {decisions.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <CheckCircle2 className="w-3 h-3 text-green-400" /> Decisiones Recientes
          </p>
          <div className="space-y-1.5">
            {decisions.slice(-4).reverse().map((d, i) => (
              <div key={i} className="flex items-start gap-2 p-2 rounded-lg bg-[#0A0A0A] border border-[#151515]">
                <ChevronRight className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
                <span className="text-[10px] text-gray-400">{d.title || d.description || d.action}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tareas pendientes */}
      {tasks.length > 0 && (
        <div>
          <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-yellow-400" /> Tareas Pendientes
          </p>
          <div className="space-y-1.5">
            {tasks.slice(0, 4).map((t, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-[#0A0A0A] border border-[#151515]">
                <div className={cn(
                  'w-1.5 h-1.5 rounded-full flex-shrink-0',
                  t.priority === 'high' ? 'bg-red-400' : t.priority === 'medium' ? 'bg-yellow-400' : 'bg-gray-500'
                )} />
                <span className="text-[10px] text-gray-400">{t.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Helper: parsear notes/tags guardados dentro de 'description' ─────────────
function parseProjectDescription(raw) {
  if (!raw) return { description: '', notes: '', tags: [] };
  try {
    const parsed = JSON.parse(raw);
    // Formato guardado: { desc, notes, tags }
    if (typeof parsed === 'object' && ('desc' in parsed || 'notes' in parsed)) {
      return {
        description: parsed.desc  || '',
        notes:       parsed.notes || '',
        tags:        Array.isArray(parsed.tags) ? parsed.tags : [],
      };
    }
  } catch {}
  // Si no es JSON, es texto plano (formato antiguo)
  return { description: raw, notes: '', tags: [] };
}

// ── Componente Principal: ProjectVault ────────────────────────────────────────
export default function ProjectVault() {
  const { projects, activeProject, setActiveProject, createProject, memory, messages, artifacts, fetchProjects } = useBeta();
  const [showEditor, setShowEditor]   = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [activeView, setActiveView]   = useState('list');
  const [isSaving, setIsSaving]       = useState(false);
  const [filter, setFilter]           = useState('all');
  // Mapa de tipos de archivo por proyecto: { [projectId]: { pdf: N, excel: N, image: N, video: N, word: N } }
  const [fileTypeMap, setFileTypeMap] = useState({});

  // Cargar tipos de archivo para todos los proyectos de la lista
  useEffect(() => {
    if (!projects.length) return;
    supabase
      .from('project_artifacts_beta')
      .select('project_id, data')
      .eq('type', 'file')
      .then(({ data }) => {
        if (!data) return;
        const map = {};
        data.forEach(row => {
          let fileType = '';
          try { fileType = JSON.parse(row.data || '{}').fileType || ''; } catch {}
          const pid = row.project_id;
          if (!map[pid]) map[pid] = { pdf: 0, excel: 0, image: 0, video: 0, word: 0 };
          if (fileType.includes('pdf'))                        map[pid].pdf++;
          else if (fileType.includes('sheet') || fileType.includes('excel') || fileType.includes('ms-excel')) map[pid].excel++;
          else if (fileType.startsWith('image/'))              map[pid].image++;
          else if (fileType.startsWith('video/'))              map[pid].video++;
          else if (fileType.includes('word') || fileType.includes('document')) map[pid].word++;
        });
        setFileTypeMap(map);
      });
  }, [projects]);

  const filteredProjects = projects.filter(p => {
    if (filter === 'all')      return true;
    if (filter === 'active')   return p.status === 'active' || !p.status;
    if (filter === 'archived') return p.status === 'archived';
    return true;
  });

  const handleSelect = (project) => {
    // Parsear notes/tags del campo description antes de activar el proyecto
    const enriched = { ...project, ...parseProjectDescription(project.description) };
    setActiveProject(enriched);
    setActiveView('detail');
  };

  const handleEdit = (project) => {
    setEditTarget(project);
    setShowEditor(true);
  };

  const handleNewProject = () => {
    setEditTarget(null);
    setShowEditor(true);
  };

  const handleSave = async (formData) => {
    setIsSaving(true);
    try {
      // Serializar notes y tags en description (la tabla solo tiene: name, description, status)
      // Formato: JSON con { desc, notes, tags } para compatibilidad
      const descPayload = JSON.stringify({
        desc:  formData.description || '',
        notes: formData.notes      || '',
        tags:  formData.tags       || [],
      });

      if (formData.id && formData.id !== 'local-fallback-id') {
        // Update — solo columnas que existen
        const { data, error } = await supabase
          .from('projects_beta')
          .update({
            name:        formData.name,
            description: descPayload,
            status:      formData.status || 'active',
          })
          .eq('id', formData.id)
          .select()
          .single();
        if (error) { console.error('[ProjectVault] Error update:', error); }
        if (data) {
          // Reconstituir campos en memoria para que el UI los vea
          const reconstructed = {
            ...data,
            ...parseProjectDescription(data.description),
          };
          setActiveProject(reconstructed);
          if (typeof fetchProjects === 'function') await fetchProjects();
        }
      } else {
        // Nuevo proyecto
        await createProject(formData.name);
      }
    } catch (err) {
      console.error('[ProjectVault] Error guardando:', err);
    } finally {
      setIsSaving(false);
      setShowEditor(false);
    }
  };

  const handleDelete = async (project) => {
    if (!window.confirm(`¿Eliminar "${project.name}"? Esta acción no se puede deshacer.`)) return;
    try {
      await supabase.from('projects_beta').delete().eq('id', project.id);
      if (typeof fetchProjects === 'function') await fetchProjects();
      if (activeProject?.id === project.id) setActiveView('list');
    } catch (err) {
      console.error('[ProjectVault] Error eliminando:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-[#050505] relative overflow-hidden animate-in fade-in duration-500">
      {/* Fondo grid */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none"
           style={{ backgroundImage: 'radial-gradient(#00F0FF 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />

      {/* Header */}
      <div className="px-8 py-8 border-b border-[#151515] bg-gradient-to-b from-[#0A0A0A] to-[#050505] relative z-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-[#0A0A0A] border border-neon-purple/20 text-neon-purple">
            <FolderOpen className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black text-white tracking-[5px] uppercase leading-none">BÓVEDA</h1>
            <p className="text-[9px] text-gray-600 font-bold uppercase tracking-[2px] mt-1.5">Gestión de Proyectos Persistentes</p>
          </div>
        </div>

        <button
          onClick={handleNewProject}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neon-purple/10 border border-neon-purple/30 text-neon-purple text-[10px] font-black uppercase tracking-widest hover:bg-neon-purple/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          Nuevo
        </button>
      </div>

      {/* Filtros */}
      <div className="px-8 pt-5 pb-3 relative z-10">
        <div className="flex items-center gap-1.5 bg-[#080808] p-1 rounded-xl border border-[#151515] w-fit">
          {[
            { id: 'all',      label: 'Todos' },
            { id: 'active',   label: 'Activos' },
            { id: 'archived', label: 'Archivados' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                filter === f.id
                  ? 'bg-[#151515] text-white border border-[#2A2A2A]'
                  : 'text-gray-600 hover:text-gray-400'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8 pt-2 relative z-10">
        <AnimatePresence mode="wait">
          {showEditor ? (
            <motion.div key="editor" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ProjectEditor
                project={editTarget}
                onSave={handleSave}
                onCancel={() => setShowEditor(false)}
              />
            </motion.div>
          ) : activeView === 'detail' && activeProject ? (
            <motion.div key="detail" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className="flex items-center gap-2 mb-5">
                <button
                  onClick={() => setActiveView('list')}
                  className="text-[9px] font-black text-gray-600 hover:text-white uppercase tracking-widest transition-colors flex items-center gap-1"
                >
                  ← Proyectos
                </button>
                <span className="text-gray-700">/</span>
                <span className="text-[9px] font-black text-neon-cyan uppercase tracking-widest truncate max-w-[200px]">
                  {activeProject.name}
                </span>
                <button
                  onClick={() => handleEdit(activeProject)}
                  className="ml-auto p-1.5 rounded-lg bg-[#0D0D0D] border border-[#1A1A1A] text-gray-600 hover:text-neon-cyan hover:border-neon-cyan/30 transition-all"
                >
                  <Edit3 className="w-3 h-3" />
                </button>
              </div>
              <ActiveProjectDetails
                project={activeProject}
                memory={memory}
                messages={messages}
                artifacts={artifacts}
                onAddFiles={() => { setEditTarget(activeProject); setShowEditor(true); }}
              />
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3 mt-2">
              {filteredProjects.length === 0 ? (
                <div className="h-48 flex flex-col items-center justify-center border border-dashed border-[#1A1A1A] rounded-2xl opacity-40">
                  <FolderOpen className="w-8 h-8 text-gray-700 mb-3" />
                  <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest">Sin proyectos</p>
                </div>
              ) : (
                filteredProjects.map(p => (
                  <ProjectCard
                    key={p.id}
                    project={p}
                    isActive={activeProject?.id === p.id}
                    onSelect={handleSelect}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    fileTypes={fileTypeMap}
                  />
                ))
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
