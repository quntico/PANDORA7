
import React, { useState, useEffect } from 'react';
import { X, Save, Settings, Info } from 'lucide-react';

function SimulationSettingsModal({ isOpen, onClose, config, onSave }) {
    const [formData, setFormData] = useState({
        electricityRate: 0.15,
        pricePerKg: 2.5,
        daysPerMonth: 30,
        hoursPerShift: 8,
        shiftsPerDay: 1,
        rawMaterialCost: 0,
        operatorCost: 0, // Costo mensual por operador
        operatorCount: 0 // Número de operadores
    });

    useEffect(() => {
        if (config) {
            setFormData(prev => ({ ...prev, ...config }));
        }
    }, [config, isOpen]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: parseFloat(value) || 0
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="w-full max-w-md bg-deep border border-glass-border rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-glass-border">
                    <div className="flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
                            <Settings className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Parámetros de Simulación</h2>
                            <p className="text-xs text-gray-400">Ajusta las variables de cálculo</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-6">

                    {/* Costos */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-neon-purple uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-neon-purple"></span>
                            Costos y Tarifas
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-400 block">Tarifa Eléctrica ($/kWh)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="electricityRate"
                                        value={formData.electricityRate}
                                        onChange={handleChange}
                                        className="w-full pl-7 pr-3 py-2 bg-glass-light border border-glass-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 transition-all placeholder:text-gray-600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-400 block">Precio Venta ($/kg)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        step="0.1"
                                        name="pricePerKg"
                                        value={formData.pricePerKg}
                                        onChange={handleChange}
                                        className="w-full pl-7 pr-3 py-2 bg-glass-light border border-glass-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 transition-all placeholder:text-gray-600"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-400 block">Costo Materia Prima ($/kg)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        name="rawMaterialCost"
                                        value={formData.rawMaterialCost || 0}
                                        onChange={handleChange}
                                        className="w-full pl-7 pr-3 py-2 bg-glass-light border border-glass-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 transition-all placeholder:text-gray-600"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Tiempo */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Tiempos de Operación
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-400 block">Días por Mes</label>
                                <input
                                    type="number"
                                    step="1"
                                    max="31"
                                    min="1"
                                    name="daysPerMonth"
                                    value={formData.daysPerMonth}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-glass-light border border-glass-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 transition-all placeholder:text-gray-600"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-400 block">Horas por Turno</label>
                                <input
                                    type="number"
                                    step="0.5"
                                    max="24"
                                    min="1"
                                    name="hoursPerShift"
                                    value={formData.hoursPerShift}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-glass-light border border-glass-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 transition-all placeholder:text-gray-600"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-400 block">Turnos por Día</label>
                                <input
                                    type="number"
                                    step="1"
                                    max="3"
                                    min="1"
                                    name="shiftsPerDay"
                                    value={formData.shiftsPerDay || 1}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-glass-light border border-glass-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 transition-all placeholder:text-gray-600"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Mano de Obra */}
                    <div className="space-y-4">
                        <h3 className="text-xs font-semibold text-orange-400 uppercase tracking-wider flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>
                            Mano de Obra
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-400 block">Número de Operadores</label>
                                <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    name="operatorCount"
                                    value={formData.operatorCount || 0}
                                    onChange={handleChange}
                                    className="w-full px-3 py-2 bg-glass-light border border-glass-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 transition-all placeholder:text-gray-600"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs text-gray-400 block">Costo Mensual / Operador ($)</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">$</span>
                                    <input
                                        type="number"
                                        step="100"
                                        min="0"
                                        name="operatorCost"
                                        value={formData.operatorCost || 0}
                                        onChange={handleChange}
                                        className="w-full pl-7 pr-3 py-2 bg-glass-light border border-glass-border rounded-lg text-white text-sm focus:outline-none focus:border-neon-cyan/50 focus:ring-1 focus:ring-neon-cyan/50 transition-all placeholder:text-gray-600"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 flex items-start gap-2">
                        <Info className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                        <p className="text-[10px] text-blue-300 leading-relaxed">
                            Estos valores afectarán globalmente los cálculos de consumo, costos, producción mensual y ROI estimado de la simulación.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="pt-2 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 rounded-lg bg-gradient-to-r from-neon-cyan to-neon-blue text-black font-semibold text-sm hover:shadow-glow-sm hover:scale-[1.02] transition-all flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" />
                            Aplicar Cambios
                        </button>
                    </div>
                </form>
            </div >
        </div >
    );
}

export default SimulationSettingsModal;
