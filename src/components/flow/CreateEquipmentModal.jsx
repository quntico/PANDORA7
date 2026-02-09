import React, { useState } from 'react';
import { X, Save } from 'lucide-react';
import {
    Blend,
    Cog,
    Hammer,
    Wind,
    Package,
    MoveRight,
    Zap,
    Droplet,
    Flame,
    Box
} from 'lucide-react';

const iconOptions = [
    { name: 'Engranaje', icon: Cog },
    { name: 'Mezclador', icon: Blend },
    { name: 'Martillo', icon: Hammer },
    { name: 'Viento', icon: Wind },
    { name: 'Paquete', icon: Package },
    { name: 'Flecha', icon: MoveRight },
    { name: 'Rayo', icon: Zap },
    { name: 'Gota', icon: Droplet },
    { name: 'Fuego', icon: Flame },
    { name: 'Caja', icon: Box },
];

const colorOptions = [
    { name: 'Cyan', value: '#00F0FF' },
    { name: 'Azul', value: '#0080FF' },
    { name: 'Púrpura', value: '#8B5CF6' },
    { name: 'Rosa', value: '#EC4899' },
    { name: 'Verde', value: '#10b981' },
    { name: 'Naranja', value: '#f59e0b' },
    { name: 'Rojo', value: '#ef4444' },
    { name: 'Amarillo', value: '#eab308' },
];

function CreateEquipmentModal({ onClose, onSave }) {
    const [formData, setFormData] = useState({
        type: '',
        capacity: 500,
        power: 20,
        efficiency: 90,
        cost: 30000,
        inputType: 'any',
        outputType: 'any',
        color: '#00F0FF',
        iconIndex: 0,
    });

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        if (!formData.type.trim()) {
            alert('Por favor ingresa un nombre para el equipo');
            return;
        }

        const newEquipment = {
            ...formData,
            icon: iconOptions[formData.iconIndex].icon,
        };

        onSave(newEquipment);
    };

    const SelectedIcon = iconOptions[formData.iconIndex].icon;

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md mx-4 rounded-2xl backdrop-blur-2xl bg-gradient-to-br from-[#0A0F1C]/30 to-[#070A12]/30 border-2 border-t-white/30 border-l-white/30 border-r-white/10 border-b-white/10 max-h-[90vh] overflow-y-auto"
                style={{
                    boxShadow: `
                        0 8px 32px 0 rgba(0, 240, 255, 0.2),
                        inset 0 2px 4px 0 rgba(255, 255, 255, 0.15),
                        inset 0 -2px 4px 0 rgba(0, 0, 0, 0.15),
                        0 0 0 1px rgba(255, 255, 255, 0.08)
                    `
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-glass-border sticky top-0 bg-glass-light backdrop-blur-xl z-10">
                    <div>
                        <h2 className="text-lg font-bold text-white">
                            Crear Equipo Personalizado
                        </h2>
                        <p className="text-xs text-gray-400">Define las características</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg bg-glass-light border border-glass-border text-gray-400 hover:text-white hover:border-neon-cyan/30 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-4 space-y-4">
                    {/* Preview */}
                    <div className="p-4 rounded-xl bg-deep border border-glass-border">
                        <p className="text-xs text-gray-400 mb-2">Vista previa:</p>
                        <div className="flex items-center gap-3">
                            <div
                                className="p-2 rounded-lg"
                                style={{
                                    backgroundColor: `${formData.color}15`,
                                    color: formData.color,
                                    borderWidth: '1px',
                                    borderColor: `${formData.color}40`,
                                }}
                            >
                                <SelectedIcon className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-sm font-bold text-white">
                                    {formData.type || 'Nuevo Equipo'}
                                </h3>
                                <p className="text-xs text-gray-400">
                                    {formData.capacity} kg/h • {formData.power} kW
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Nombre */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                            Nombre del Equipo
                        </label>
                        <input
                            type="text"
                            value={formData.type}
                            onChange={(e) => handleChange('type', e.target.value)}
                            className="w-full px-3 py-2 rounded-lg bg-deep border border-glass-border text-white text-sm focus:border-neon-cyan/50 focus:outline-none transition-all"
                            placeholder="Ej: Cortadora Láser"
                        />
                    </div>

                    {/* Icono */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                            Icono
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {iconOptions.map((option, index) => {
                                const Icon = option.icon;
                                return (
                                    <button
                                        key={index}
                                        onClick={() => handleChange('iconIndex', index)}
                                        className={`p-3 rounded-lg border transition-all ${formData.iconIndex === index
                                            ? 'bg-neon-cyan/10 border-neon-cyan/50 text-neon-cyan'
                                            : 'bg-glass-light border-glass-border text-gray-400 hover:border-glass-hover'
                                            }`}
                                        title={option.name}
                                    >
                                        <Icon className="w-5 h-5 mx-auto" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Color */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                            Color
                        </label>
                        <div className="grid grid-cols-4 gap-2">
                            {colorOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => handleChange('color', option.value)}
                                    className={`p-3 rounded-lg border transition-all ${formData.color === option.value
                                        ? 'border-white scale-110'
                                        : 'border-glass-border hover:border-glass-hover'
                                        }`}
                                    style={{ backgroundColor: option.value }}
                                    title={option.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Capacidad */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                            Capacidad (kg/h)
                        </label>
                        <input
                            type="number"
                            value={formData.capacity}
                            onChange={(e) => handleChange('capacity', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg bg-deep border border-glass-border text-white text-sm focus:border-neon-cyan/50 focus:outline-none transition-all"
                            min="0"
                            step="10"
                        />
                        <input
                            type="range"
                            value={formData.capacity}
                            onChange={(e) => handleChange('capacity', parseFloat(e.target.value))}
                            className="w-full mt-2"
                            min="0"
                            max="2000"
                            step="50"
                        />
                    </div>

                    {/* Consumo */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                            Consumo (kW)
                        </label>
                        <input
                            type="number"
                            value={formData.power}
                            onChange={(e) => handleChange('power', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg bg-deep border border-glass-border text-white text-sm focus:border-neon-cyan/50 focus:outline-none transition-all"
                            min="0"
                            step="1"
                        />
                        <input
                            type="range"
                            value={formData.power}
                            onChange={(e) => handleChange('power', parseFloat(e.target.value))}
                            className="w-full mt-2"
                            min="0"
                            max="100"
                            step="5"
                        />
                    </div>

                    {/* Eficiencia */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                            Eficiencia (%)
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                type="range"
                                value={formData.efficiency}
                                onChange={(e) => handleChange('efficiency', parseFloat(e.target.value))}
                                className="flex-1"
                                min="0"
                                max="100"
                                step="1"
                            />
                            <span className="text-white font-semibold text-sm w-12 text-right">
                                {formData.efficiency}%
                            </span>
                        </div>
                    </div>

                    {/* Costo */}
                    <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-2 uppercase tracking-wide">
                            Costo ($)
                        </label>
                        <input
                            type="number"
                            value={formData.cost}
                            onChange={(e) => handleChange('cost', parseFloat(e.target.value) || 0)}
                            className="w-full px-3 py-2 rounded-lg bg-deep border border-glass-border text-white text-sm focus:border-neon-cyan/50 focus:outline-none transition-all"
                            min="0"
                            step="1000"
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-end gap-2 p-4 border-t border-glass-border sticky bottom-0 bg-glass-light backdrop-blur-xl">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-lg bg-glass-light border border-glass-border text-gray-300 hover:text-white hover:border-glass-hover text-sm transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg bg-neon-cyan/10 border border-neon-cyan/30 text-neon-cyan hover:bg-neon-cyan/20 text-sm font-medium transition-all flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Crear Equipo
                    </button>
                </div>
            </div>
        </div>
    );
}

export default CreateEquipmentModal;
