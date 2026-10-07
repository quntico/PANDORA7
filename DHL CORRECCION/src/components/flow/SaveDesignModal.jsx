import React, { useState } from 'react';
import { X, Save, FileText } from 'lucide-react';

function SaveDesignModal({ isOpen, onClose, onSave, defaultName = '', isUpdate = false }) {
    const [name, setName] = useState(defaultName);
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim()) {
            alert('Por favor ingresa un nombre para el diseño');
            return;
        }

        setIsSaving(true);
        await onSave(name.trim(), description.trim());
        setIsSaving(false);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div
                className="w-full max-w-md mx-4 rounded-2xl backdrop-blur-2xl bg-gradient-to-br from-[#0A0F1C]/95 to-[#070A12]/95 border border-glass-border overflow-hidden"
                style={{
                    boxShadow: '0 8px 32px 0 rgba(0, 240, 255, 0.15), inset 0 1px 0 0 rgba(255, 255, 255, 0.1)'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-glass-border">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30">
                            <FileText className="w-5 h-5 text-neon-cyan" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">
                                {isUpdate ? 'Actualizar Diseño' : 'Guardar Diseño'}
                            </h2>
                            <p className="text-xs text-gray-400">
                                {isUpdate ? 'Actualiza el nombre o descripción' : 'Dale un nombre a tu diseño'}
                            </p>
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
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                            Nombre del Diseño *
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-deep border border-glass-border text-white focus:border-neon-cyan/50 focus:outline-none transition-all"
                            placeholder="Ej: Línea de Producción Principal"
                            autoFocus
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                            Descripción (opcional)
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full px-4 py-3 rounded-xl bg-deep border border-glass-border text-white focus:border-neon-cyan/50 focus:outline-none transition-all resize-none"
                            placeholder="Describe brevemente este diseño..."
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-glass-border">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-glass-light border border-glass-border text-gray-300 hover:text-white hover:border-glass-hover text-sm transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving || !name.trim()}
                        className="px-4 py-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 text-sm font-medium transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <Save className="w-4 h-4" />
                        {isSaving ? 'Guardando...' : (isUpdate ? 'Actualizar' : 'Guardar')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default SaveDesignModal;
