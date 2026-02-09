import React, { useEffect, useState } from 'react';
import { X, Folder, Trash2, Clock, FileText, Plus, Loader2 } from 'lucide-react';
import { useFlowDesigns } from '@/hooks/useFlowDesigns';

function FlowDesignsLibrary({ isOpen, onClose, onLoad, onNewDesign, currentDesignId }) {
    const { designs, isLoading, error, loadDesigns, deleteDesign } = useFlowDesigns();
    const [deletingId, setDeletingId] = useState(null);

    useEffect(() => {
        if (isOpen) {
            loadDesigns();
        }
    }, [isOpen, loadDesigns]);

    const handleDelete = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('¿Eliminar este diseño permanentemente?')) return;

        setDeletingId(id);
        await deleteDesign(id);
        setDeletingId(null);
    };

    const formatDate = (dateString) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
                className="w-full max-w-2xl mx-4 rounded-2xl backdrop-blur-2xl bg-gradient-to-br from-[#0A0F1C]/95 to-[#070A12]/95 border border-glass-border max-h-[80vh] overflow-hidden flex flex-col"
                style={{
                    boxShadow: '0 8px 32px 0 rgba(0, 240, 255, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-glass-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                            <Folder className="w-5 h-5 text-neon-cyan" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Librería de Diseños</h2>
                            <p className="text-xs text-gray-400">{designs.length} diseños guardados</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-glass-light border border-glass-border text-gray-400 hover:text-white hover:border-red-500/30 transition-all"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {isLoading && designs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="w-8 h-8 text-neon-cyan animate-spin mb-3" />
                            <p className="text-gray-400">Cargando diseños...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <p className="text-red-400">Error: {error}</p>
                        </div>
                    ) : designs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <FileText className="w-12 h-12 text-gray-600 mb-3" />
                            <p className="text-gray-400 mb-4">No hay diseños guardados</p>
                            <button
                                onClick={onNewDesign}
                                className="px-4 py-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 transition-all flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Crear Nuevo
                            </button>
                        </div>
                    ) : (
                        <div className="grid gap-3">
                            {designs.map((design) => (
                                <div
                                    key={design.id}
                                    onClick={() => onLoad(design.id)}
                                    className={`group p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] ${currentDesignId === design.id
                                            ? 'bg-neon-cyan/10 border-neon-cyan/50'
                                            : 'bg-glass-light border-glass-border hover:border-neon-cyan/30 hover:bg-glass-medium'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <h3 className="text-white font-semibold mb-1 flex items-center gap-2">
                                                {design.name}
                                                {currentDesignId === design.id && (
                                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-cyan/20 text-neon-cyan border border-neon-cyan/30">
                                                        Actual
                                                    </span>
                                                )}
                                            </h3>
                                            {design.description && (
                                                <p className="text-sm text-gray-400 mb-2 line-clamp-2">
                                                    {design.description}
                                                </p>
                                            )}
                                            <div className="flex items-center gap-3 text-xs text-gray-500">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDate(design.updated_at)}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={(e) => handleDelete(e, design.id)}
                                            disabled={deletingId === design.id}
                                            className="p-2 rounded-lg opacity-0 group-hover:opacity-100 bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all disabled:opacity-50"
                                            title="Eliminar"
                                        >
                                            {deletingId === design.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Trash2 className="w-4 h-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-glass-border flex justify-between items-center">
                    <button
                        onClick={onNewDesign}
                        className="px-4 py-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 transition-all flex items-center gap-2 text-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Nuevo Diseño
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-glass-light border border-glass-border text-gray-300 hover:text-white hover:border-glass-hover transition-all text-sm"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}

export default FlowDesignsLibrary;
