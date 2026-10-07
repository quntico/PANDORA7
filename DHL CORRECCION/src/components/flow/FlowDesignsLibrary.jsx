import React, { useEffect, useState, useMemo } from 'react';
import { X, Folder, Trash2, Clock, FileText, Plus, Loader2, RefreshCw, CheckCircle, Cloud, CloudUpload, Server } from 'lucide-react';
import { useFlowDesigns } from '@/hooks/useFlowDesigns';
import { supabase } from '@/supabase';

// ── Helpers ───────────────────────────────────────────────────────────────────
function modelTypeIcon(type) {
    if (!type) return '🗂️';
    const t = type.toLowerCase();
    if (t === 'fbx') return '🏭';
    if (t === 'glb' || t === 'gltf') return '📦';
    if (t === 'obj') return '🧊';
    return '🗂️';
}

function hasLayout(design) {
    return !!design?.layout?.url;
}

function formatDate(dateString) {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('es-MX', {
        day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ── Tarjeta de Diseño ─────────────────────────────────────────────────────────
function DesignCard({ design, isCurrent, onLoad, onDelete, deleting }) {
    const has3D = hasLayout(design);
    const ext = design?.layout?.type?.toUpperCase() || '';
    return (
        <div
            onClick={() => onLoad(design.id)}
            className={`group relative p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${
                isCurrent
                    ? 'bg-neon-cyan/10 border-neon-cyan/50'
                    : 'bg-glass-light border-glass-border hover:border-neon-cyan/30 hover:bg-glass-medium'
            }`}
        >
            <div className="flex items-start gap-3">
                <div className={`text-2xl flex-shrink-0 mt-0.5 ${has3D ? '' : 'grayscale opacity-60'}`}>
                    {has3D ? modelTypeIcon(design.layout?.type) : '📐'}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-white font-semibold text-sm truncate">{design.name}</h3>
                        {isCurrent && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30 flex-shrink-0">
                                Actual
                            </span>
                        )}
                        {has3D && ext && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/20 flex-shrink-0">
                                {ext}
                            </span>
                        )}
                        {has3D && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#00F0FF]/10 text-[#00F0FF] border border-[#00F0FF]/20 flex-shrink-0">
                                3D
                            </span>
                        )}
                    </div>
                    {design.description && (
                        <p className="text-xs text-gray-400 mb-1 line-clamp-1">{design.description}</p>
                    )}
                    <div className="flex items-center gap-3 text-[10px] text-gray-500">
                        <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDate(design.updated_at)}
                        </span>
                        {design.nodes?.length > 0 && (
                            <span>{design.nodes.length} equipos</span>
                        )}
                    </div>
                </div>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(design.id); }}
                    disabled={deleting}
                    className="p-2 rounded-lg opacity-0 group-hover:opacity-100 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50 flex-shrink-0"
                    title="Eliminar diseño"
                >
                    {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                </button>
            </div>
        </div>
    );
}

// ── Componente Principal ──────────────────────────────────────────────────────
function FlowDesignsLibrary({ isOpen, onClose, onLoad, onNewDesign, currentDesignId, activeLayout = null, onLayoutChange = null }) {
    const { designs, isLoading, error, loadDesigns, deleteDesign } = useFlowDesigns();
    const [deletingId, setDeletingId] = useState(null);
    const [tab, setTab] = useState('all');
    const [isUploadingCloud, setIsUploadingCloud] = useState(false);

    useEffect(() => {
        if (isOpen) loadDesigns();
    }, [isOpen, loadDesigns]);

    const handleDelete = async (id) => {
        setDeletingId(id);
        await deleteDesign(id);
        setDeletingId(null);
    };

    const handleUploadActiveLayoutToCloud = async () => {
        if (!activeLayout || !activeLayout.url) return;
        setIsUploadingCloud(true);
        try {
            // 1. Descargar archivo del blob local
            const res = await fetch(activeLayout.url);
            const blob = await res.blob();
            
            const originalName = activeLayout.name || 'Modelo_Simulador';
            const ext = activeLayout.type || 'glb';
            const fileNameWithExt = `${originalName.replace(/[^a-zA-Z0-9.-]/g, '_')}_${Date.now()}.${ext}`;
            const file = new File([blob], fileNameWithExt, { type: blob.type || 'application/octet-stream' });
            
            // 2. Subir a Supabase Storage (intentar flow-assets primero, fallback a assets)
            let storageBucket = 'flow-assets';
            let storagePath = `twin-models/${fileNameWithExt}`;
            let uploadResult = null;
            let uploadError = null;
            
            try {
                const { data, error } = await supabase.storage
                    .from(storageBucket)
                    .upload(storagePath, file, { 
                        upsert: false, 
                        contentType: file.type || 'application/octet-stream' 
                    });
                uploadResult = data;
                uploadError = error;
            } catch (err) {
                uploadError = err;
            }
            
            if (uploadError) {
                // Fallback a 'assets' bucket
                storageBucket = 'assets';
                storagePath = `layouts/${fileNameWithExt}`;
                const { data, error } = await supabase.storage
                    .from(storageBucket)
                    .upload(storagePath, file, { 
                        upsert: false, 
                        contentType: file.type || 'application/octet-stream' 
                    });
                uploadResult = data;
                uploadError = error;
                if (uploadError) throw uploadError;
            }

            // Obtener URL pública
            const { data: urlData } = supabase.storage.from(storageBucket).getPublicUrl(storagePath);
            const publicUrl = urlData?.publicUrl || activeLayout.url;

            // 3. Crear payload para base de datos
            const persistentLayout = {
                ...activeLayout,
                url: publicUrl,
                storagePath: uploadResult?.path || storagePath,
            };

            // 4. Registrar en flow_designs_beta
            const { error: dbError } = await supabase
                .from('flow_designs_beta')
                .insert([{
                    name: originalName,
                    description: `Modelo 3D guardado en la nube (${ext.toUpperCase()})`,
                    nodes: [],
                    edges: [],
                    layout: persistentLayout,
                    custom_equipments: null
                }]);

            if (dbError) throw dbError;

            // 5. Notificar al componente padre
            if (onLayoutChange) {
                onLayoutChange(persistentLayout);
            }

            // 6. Recargar lista de diseños
            await loadDesigns();

            alert('¡Excelente! El modelo se ha guardado en la nube de Supabase con éxito y se ha añadido a tu librería global.');
        } catch (err) {
            console.error('[FlowDesignsLibrary] Error al guardar en la nube:', err);
            alert('Error al guardar en la nube: ' + err.message);
        } finally {
            setIsUploadingCloud(false);
        }
    };

    const count3D   = useMemo(() => designs.filter(d => hasLayout(d)).length,   [designs]);
    const countFlow = useMemo(() => designs.filter(d => !hasLayout(d)).length,  [designs]);

    const filtered = useMemo(() => {
        if (tab === '3d')   return designs.filter(d => hasLayout(d));
        if (tab === 'flow') return designs.filter(d => !hasLayout(d));
        return designs;
    }, [designs, tab]);

    const activeLayoutIsCloud = useMemo(() => {
        if (!activeLayout) return false;
        return !!activeLayout.storagePath || (!activeLayout.url?.startsWith('blob:') && activeLayout.url?.startsWith('http'));
    }, [activeLayout]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
                className="w-full max-w-2xl mx-4 rounded-2xl backdrop-blur-2xl bg-gradient-to-br from-[#0A0F1C]/95 to-[#070A12]/95 border border-glass-border max-h-[85vh] overflow-hidden flex flex-col"
                style={{ boxShadow: '0 8px 32px 0 rgba(0,240,255,0.15), inset 0 1px 0 0 rgba(255,255,255,0.1)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                            <Folder className="w-5 h-5 text-neon-cyan" />
                        </div>
                        <div>
                            <h2 className="text-base font-bold text-white">Librería de Diseños 3D</h2>
                            <p className="text-[10px] text-gray-400">
                                {designs.length} diseño{designs.length !== 1 ? 's' : ''} guardado{designs.length !== 1 ? 's' : ''}
                                {count3D > 0 && ` · ${count3D} con modelo 3D`}
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={loadDesigns}
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-all"
                            title="Recargar"
                        >
                            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg bg-glass-light border border-glass-border text-gray-400 hover:text-white hover:border-red-500/30 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 px-5 pt-3">
                    {[
                        { key: 'all',  label: `Todo (${designs.length})` },
                        { key: '3d',   label: `🏭 Modelos 3D (${count3D})` },
                        { key: 'flow', label: `📐 Solo Flujos (${countFlow})` },
                    ].map(t => (
                        <button
                            key={t.key}
                            onClick={() => setTab(t.key)}
                            className={`px-3 py-1.5 rounded-t-lg text-[10px] font-black uppercase tracking-wider border-b-2 transition-all ${
                                tab === t.key
                                    ? 'border-[#00F0FF] text-[#00F0FF] bg-[#00F0FF]/5'
                                    : 'border-transparent text-gray-500 hover:text-gray-300'
                            }`}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

                    {/* ── Modelo Activo ── */}
                    {activeLayout && (tab === 'all' || tab === '3d') && (
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-[#00F0FF]/60 mb-2">📌 Modelo activo en este simulador</p>
                            <div className="p-4 rounded-xl border border-[#00F0FF]/40 bg-[#00F0FF]/5 flex flex-col gap-3">
                                <div className="flex items-center gap-4">
                                    <div className="text-3xl">{modelTypeIcon(activeLayout.type)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <h3 className="text-white font-bold text-sm truncate">
                                                {activeLayout.name || 'Modelo sin nombre'}
                                            </h3>
                                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 flex items-center gap-1 flex-shrink-0">
                                                <CheckCircle className="w-2.5 h-2.5" /> En uso
                                            </span>
                                            {activeLayout.type && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/20">
                                                    {activeLayout.type.toUpperCase()}
                                                </span>
                                            )}
                                            {activeLayoutIsCloud ? (
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 flex-shrink-0">
                                                    <Cloud className="w-2.5 h-2.5" /> En la Nube
                                                </span>
                                            ) : (
                                                <span className="text-[9px] px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 flex items-center gap-1 flex-shrink-0">
                                                    <Server className="w-2.5 h-2.5" /> Temporal (Local)
                                                </span>
                                            )}
                                        </div>
                                        {activeLayoutIsCloud ? (
                                            <p className="text-[10px] text-emerald-400/80 flex items-center gap-1 mt-1 truncate">
                                                <CheckCircle className="w-3.5 h-3.5" /> Guardado permanentemente en la nube (Supabase)
                                            </p>
                                        ) : (
                                            <p className="text-[10px] text-yellow-500/70">Solo en memoria local · expira al recargar la página</p>
                                        )}
                                    </div>
                                </div>
                                
                                {!activeLayoutIsCloud && (
                                    <div className="flex items-center justify-between gap-3 pt-2 border-t border-white/5 flex-wrap">
                                        <p className="text-[10px] text-gray-400">¿Quieres respaldarlo para siempre?</p>
                                        <button
                                            onClick={handleUploadActiveLayoutToCloud}
                                            disabled={isUploadingCloud}
                                            className="px-3 py-1 rounded bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 border border-[#00F0FF]/30 hover:border-[#00F0FF]/60 text-[#00F0FF] text-[10px] font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_10px_rgba(0,240,255,0.1)]"
                                        >
                                            {isUploadingCloud ? (
                                                <>
                                                    <Loader2 className="w-3 h-3 animate-spin" /> Guardando en Supabase...
                                                </>
                                            ) : (
                                                <>
                                                    <CloudUpload className="w-3.5 h-3.5" /> Guardar en la Nube
                                                </>
                                            )}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* ── Diseños de la BD ── */}
                    {isLoading && designs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-neon-cyan animate-spin mb-3" />
                            <p className="text-gray-400 text-sm">Cargando librería...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <p className="text-red-400 text-sm mb-2">Error al cargar: {error}</p>
                            <button onClick={loadDesigns} className="text-[10px] text-gray-400 underline">Reintentar</button>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-10 text-center">
                            <FileText className="w-12 h-12 text-gray-600 mb-3" />
                            <p className="text-gray-400 text-sm mb-1">
                                {tab === '3d'   ? 'No hay modelos 3D guardados en la nube.' :
                                 tab === 'flow' ? 'No hay diseños de flujo guardados.' :
                                 'No hay diseños en la librería aún.'}
                            </p>
                            <p className="text-[10px] text-gray-600">
                                Usa el botón "Subir 3D" en el simulador para agregar modelos.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-[9px] font-black uppercase tracking-widest text-gray-600">
                                {tab === '3d' ? '🏭 Modelos 3D en la nube' : tab === 'flow' ? '📐 Diseños de flujo' : '📂 Todos los diseños'}
                            </p>
                            {filtered.map((design) => (
                                <DesignCard
                                    key={design.id}
                                    design={design}
                                    isCurrent={currentDesignId === design.id}
                                    onLoad={onLoad}
                                    onDelete={handleDelete}
                                    deleting={deletingId === design.id}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-glass-border flex justify-between items-center">
                    <button
                        onClick={onNewDesign}
                        className="px-4 py-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 transition-all flex items-center gap-2 text-xs font-bold"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Diseño
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-glass-light border border-glass-border text-gray-300 hover:text-white transition-all text-xs"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default FlowDesignsLibrary;
