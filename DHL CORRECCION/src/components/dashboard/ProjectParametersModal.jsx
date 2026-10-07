import React, { useState, useEffect } from 'react';
import { X, Save, DollarSign, Activity, Factory, Building, TrendingUp } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';

export default function ProjectParametersModal({ isOpen, onClose }) {
    const { calculatorMetrics, updateCalculatorMetrics, saveProjectToSupabase } = useProject();
    const [formData, setFormData] = useState({
        productionVolume: 0,
        salesPrice: 0,
        rawMaterialUnitCost: 0,
        monthlyFixedCosts: 0,
        facilityRent: 0,
        facilityPurchase: 0,
        equipmentInvestment: 0,
    });

    // Load initial data from context
    useEffect(() => {
        if (isOpen) {
            // Try to load existing granular data, or reverse engineer from aggregates if granular missing
            setFormData({
                productionVolume: calculatorMetrics.productionVolume || 0,
                salesPrice: calculatorMetrics.salesPrice || 0,
                rawMaterialUnitCost: calculatorMetrics.rawMaterialUnitCost || 0,
                monthlyFixedCosts: calculatorMetrics.monthlyFixedCosts || (calculatorMetrics.expenses || 0), // Fallback
                facilityRent: calculatorMetrics.facilityRent || 0,
                facilityPurchase: calculatorMetrics.facilityPurchase || 0,
                equipmentInvestment: calculatorMetrics.investment_amount || calculatorMetrics.investment || 0,
            });
        }
    }, [isOpen, calculatorMetrics]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
    };

    const calculateAndSave = async () => {
        // 1. Calculate Aggregates
        const monthlyRevenue = formData.productionVolume * formData.salesPrice;
        const monthlyCOGS = formData.productionVolume * formData.rawMaterialUnitCost;
        const monthlyOpEx = formData.monthlyFixedCosts + formData.facilityRent;
        const totalMonthlyCost = monthlyCOGS + monthlyOpEx;

        const netProfitMonthly = monthlyRevenue - totalMonthlyCost;

        const totalInvestment = formData.equipmentInvestment + formData.facilityPurchase;

        // Simple Annualized Metrics
        const annualProfit = netProfitMonthly * 12;
        const roi = totalInvestment > 0 ? (annualProfit / totalInvestment) * 100 : 0;
        const paybackYears = annualProfit > 0 ? (totalInvestment / annualProfit) : 0;

        // IRR Approximation (Simplified for immediate feedback)
        // Very rough estimation: ROI/100 is often close to IRR for long term perpetuities, 
        // but let's just stick to ROI or use a simple heuristic.
        const irr = roi / 100; // Placeholder

        // 2. Prepare Payload
        const updatedMetrics = {
            ...calculatorMetrics,
            ...formData, // Save the granular inputs too

            // Standard Dashboard Keys
            monthlyRevenue,
            monthlyCost: totalMonthlyCost,
            investment: totalInvestment,
            investment_amount: totalInvestment, // Alias
            netProfitMonthly,
            roi,
            paybackYears,
            irr,

            // Update derived aggregates that might be named differently
            revenue: monthlyRevenue,
            expenses: totalMonthlyCost,
            netPresentValue: annualProfit * 5 - totalInvestment, // Very rough NPV (5 year horizon) placeholder
        };

        // 3. Update Context & Persist
        updateCalculatorMetrics(updatedMetrics);
        await saveProjectToSupabase();

        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-[#12141C] border border-gray-800 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-800 bg-[#0A0C10]">
                    <div>
                        <h2 className="text-xl font-bold text-white flex items-center gap-2">
                            <Activity className="w-5 h-5 text-neon-cyan" />
                            Parámetros del Proyecto
                        </h2>
                        <p className="text-sm text-gray-400">Ajusta las variables clave para recalcular el análisis financiero.</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">

                    {/* Sección: Operación y Producción */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-neon-blue uppercase tracking-wider flex items-center gap-2">
                            <Factory className="w-4 h-4" /> Producción y Ventas
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400">Volumen de Producción Mensual (Kg/Unidades)</label>
                                <input
                                    type="number"
                                    name="productionVolume"
                                    value={formData.productionVolume}
                                    onChange={handleChange}
                                    className="w-full bg-[#0A0C10] border border-gray-700 rounded-lg px-3 py-2 text-white focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan outline-none transition-all"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400">Precio de Venta Promedio ($)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="number"
                                        name="salesPrice"
                                        value={formData.salesPrice}
                                        onChange={handleChange}
                                        className="w-full bg-[#0A0C10] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white focus:border-neon-cyan focus:ring-1 focus:ring-neon-cyan outline-none transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-gray-800" />

                    {/* Sección: Costos Operativos */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-neon-purple uppercase tracking-wider flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> Costos Operativos
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400">Costo MP / Unitario ($)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="number"
                                        name="rawMaterialUnitCost"
                                        value={formData.rawMaterialUnitCost}
                                        onChange={handleChange}
                                        className="w-full bg-[#0A0C10] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400">Gastos Fijos Mensuales (Nómina, Luz, etc.)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="number"
                                        name="monthlyFixedCosts"
                                        value={formData.monthlyFixedCosts}
                                        onChange={handleChange}
                                        className="w-full bg-[#0A0C10] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400">Renta de Nave (Mensual)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="number"
                                        name="facilityRent"
                                        value={formData.facilityRent}
                                        onChange={handleChange}
                                        className="w-full bg-[#0A0C10] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white focus:border-neon-purple focus:ring-1 focus:ring-neon-purple outline-none transition-all"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500">Si se compra nave, dejar en 0.</p>
                            </div>
                        </div>
                    </section>

                    <div className="h-px bg-gray-800" />

                    {/* Sección: Inversión (CAPEX) */}
                    <section className="space-y-4">
                        <h3 className="text-sm font-semibold text-yellow-500 uppercase tracking-wider flex items-center gap-2">
                            <Building className="w-4 h-4" /> Inversión Inicial (CAPEX)
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400">Inversión en Maquinaria (Equipos)</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="number"
                                        name="equipmentInvestment"
                                        value={formData.equipmentInvestment}
                                        onChange={handleChange}
                                        className="w-full bg-[#0A0C10] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs text-gray-400">Compra de Nave / Terreno</label>
                                <div className="relative">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                    <input
                                        type="number"
                                        name="facilityPurchase"
                                        value={formData.facilityPurchase}
                                        onChange={handleChange}
                                        className="w-full bg-[#0A0C10] border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-white focus:border-yellow-500 focus:ring-1 focus:ring-yellow-500 outline-none transition-all"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-500">Si se renta, dejar en 0.</p>
                            </div>
                        </div>
                    </section>

                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-800 bg-[#0A0C10] flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 rounded-xl text-sm font-medium text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={calculateAndSave}
                        className="px-6 py-2 rounded-xl text-sm font-bold bg-gradient-to-r from-neon-blue to-neon-cyan text-black hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] transition-all flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        Guardar y Recalcular
                    </button>
                </div>

            </div>
        </div>
    );
}
