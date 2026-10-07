import React, { useState, useMemo } from 'react';
import { X, Save } from 'lucide-react';

function NodePropertiesModal({ node, onClose, onUpdate }) {
    const [formData, setFormData] = useState({
        name: node.data.name || '',
        capacity: node.data.capacity || 0,
        power: node.data.power || 0,
        efficiency: node.data.efficiency || 100,
        cost: node.data.cost || 0,
    });

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
    };

    const handleSave = () => {
        onUpdate(node.id, formData);
        onClose();
    };

    // Determinar color del equipo
    const nodeColor = useMemo(() => {
        const colorMap = {
            'Mezcladora': '#00F0FF', // Cyan
            'Extrusora': '#8B5CF6', // Purple
            'Molino': '#10b981',    // Emerald
            'Secadora': '#f59e0b',  // Amber
            'Empacadora': '#ec4899',// Pink
            'Transportador': '#06b6d4', // Cyan dark
        };
        const typeKey = Object.keys(colorMap).find(k => k.toLowerCase() === (node.data.type || '').toLowerCase());
        return node.data.color || (typeKey ? colorMap[typeKey] : '#00F0FF');
    }, [node.data.type, node.data.color]);

    // Helper para input range con track coloreado dinámicamente
    const getRangeBackground = (value, min, max) => {
        const percentage = ((value - min) / (max - min)) * 100;
        return `linear-gradient(to right, ${nodeColor} 0%, ${nodeColor} ${percentage}%, #374151 ${percentage}%, #374151 100%)`;
    };

    return (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div
                className="w-full max-w-md rounded-3xl bg-[#0A0D14] border border-gray-800 shadow-2xl overflow-hidden relative"
                style={{
                    boxShadow: `0 0 50px -20px ${nodeColor}40`
                }}
            >
                {/* Acento lateral izquierdo estilo tarjeta futurista */}
                <div className="absolute left-0 top-0 bottom-0 w-1" style={{ backgroundColor: nodeColor }}></div>

                {/* Header */}
                <div className="flex items-start justify-between p-6 pb-2">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-3">
                            <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: nodeColor, boxShadow: `0 0 10px ${nodeColor}` }}
                            ></div>
                            Propiedades del Equipo
                        </h2>
                        <p className="text-sm font-bold tracking-widest mt-1 ml-6 uppercase opacity-90" style={{ color: nodeColor }}>
                            {node.data.type}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full bg-gray-900 border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 transition-all"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6">

                    {/* Nombre */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                            Nombre
                        </label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => handleChange('name', e.target.value)}
                            className="w-full px-4 py-3 rounded-xl bg-[#0F1218] border border-gray-800 text-white placeholder-gray-600 focus:outline-none focus:border-gray-600 transition-all font-medium"
                            placeholder="Nombre del equipo"
                        />
                    </div>

                    {/* Controles de Rango */}
                    {[
                        { label: 'Capacidad (kg/h)', field: 'capacity', min: 0, max: 2000, step: 50 },
                        { label: 'Consumo (kw)', field: 'power', min: 0, max: 100, step: 5 },
                    ].map((item) => (
                        <div key={item.field} className="space-y-3">
                            <div className="flex justify-between items-end">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                                    {item.label}
                                </label>
                                <div className="px-3 py-1 rounded-lg bg-[#0F1218] border border-gray-800 min-w-[60px] text-right">
                                    <span className="text-sm font-bold text-white font-mono">
                                        {formData[item.field]}
                                    </span>
                                </div>
                            </div>

                            <input
                                type="range"
                                value={formData[item.field]}
                                onChange={(e) => handleChange(item.field, parseFloat(e.target.value))}
                                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                                min={item.min}
                                max={item.max}
                                step={item.step}
                                style={{
                                    background: getRangeBackground(formData[item.field], item.min, item.max)
                                }}
                            />

                            {/* Estilos CSS inline para el thumb del slider (Chrome/Safari/Firefox) */}
                            <style jsx>{`
                                input[type=range]::-webkit-slider-thumb {
                                    -webkit-appearance: none;
                                    height: 16px;
                                    width: 16px;
                                    border-radius: 50%;
                                    background: ${nodeColor};
                                    cursor: pointer;
                                    margin-top: -6px; /* Ajuste para centrar verticalmente si es necesario */
                                    box-shadow: 0 0 10px ${nodeColor}60;
                                    border: 2px solid #0A0D14;
                                }
                                input[type=range]::-moz-range-thumb {
                                    height: 16px;
                                    width: 16px;
                                    border-radius: 50%;
                                    background: ${nodeColor};
                                    cursor: pointer;
                                    border: 2px solid #0A0D14;
                                    box-shadow: 0 0 10px ${nodeColor}60;
                                }
                                /* Resetear el track para el estilo custom */
                                input[type=range] {
                                    -webkit-appearance: none; 
                                    background: transparent; 
                                }
                                input[type=range]::-webkit-slider-runnable-track {
                                    width: 100%;
                                    height: 4px;
                                    cursor: pointer;
                                    border-radius: 2px;
                                    /* El background se maneja inline */
                                }
                            `}</style>
                        </div>
                    ))}

                    {/* Eficiencia */}
                    <div className="space-y-3">
                        <div className="flex justify-between items-end">
                            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                                Eficiencia
                            </label>
                            <span className="text-sm font-bold" style={{ color: nodeColor }}>
                                {formData.efficiency}%
                            </span>
                        </div>
                        <input
                            type="range"
                            value={formData.efficiency}
                            onChange={(e) => handleChange('efficiency', parseFloat(e.target.value))}
                            className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
                            min="0"
                            max="100"
                            step="1"
                            style={{
                                background: getRangeBackground(formData.efficiency, 0, 100)
                            }}
                        />
                    </div>

                    {/* Costo */}
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">
                            Costo ($)
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                            <input
                                type="number"
                                value={formData.cost}
                                onChange={(e) => handleChange('cost', parseFloat(e.target.value) || 0)}
                                className="w-full pl-8 pr-4 py-3 rounded-xl bg-[#0F1218] border border-gray-800 text-white font-mono focus:outline-none focus:border-gray-600 transition-all"
                                min="0"
                                step="1000"
                            />
                        </div>
                    </div>

                </div>

                {/* Footer */}
                <div className="p-6 pt-2 flex items-center justify-end gap-3 border-t border-transparent">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl bg-[#0F1218] border border-gray-800 text-gray-400 font-semibold hover:text-white hover:border-gray-600 transition-all text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSave}
                        className="px-6 py-3 rounded-xl text-black text-sm font-bold flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all"
                        style={{
                            backgroundColor: nodeColor,
                            boxShadow: `0 0 20px -5px ${nodeColor}60`
                        }}
                    >
                        <Save className="w-4 h-4" />
                        Guardar Cambios
                    </button>
                </div>
            </div>
        </div>
    );
}

export default NodePropertiesModal;
