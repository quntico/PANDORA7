import React from 'react';
import { officialTenderRequirements, RiskType, RequirementStatus } from './data/m1ActiveTender';
import { DollarSign, ShieldCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const M1EconomicView = () => {
    // Get all AE docs
    const econReqs = officialTenderRequirements.filter(r => r.code.startsWith('AE'));

    // Resumen Económico Categories
    const econSummary = [
        { label: "Costo Directo", code: "AE1D" },
        { label: "Costos Indirectos", code: "AE4" },
        { label: "Financiamiento", code: "---" }, // Usually part of AE4 or separate, for now we let it say SIN DATOS
        { label: "Utilidad", code: "AE5" },
        { label: "Cargos Adicionales", code: "AE6" },
        { label: "Subtotal", code: "SUBTOTAL" },
        { label: "IVA (16%)", code: "IVA" },
        { label: "Total Proposición", code: "AE21" }
    ];

    // Technical-Economic Matrix Matches
    const matrixMocks = [
        { label: "Materiales", atCode: "AT9A", aeCode: "AE1A", status: "PENDIENTE", diff: "N/A", risk: "BAJO" },
        { label: "Mano de Obra", atCode: "AT9B", aeCode: "AE1B", status: "PENDIENTE", diff: "N/A", risk: "MEDIO" },
        { label: "Maquinaria", atCode: "AT9C", aeCode: "AE1C", status: "PENDIENTE", diff: "N/A", risk: "BAJO" },
        { label: "Personal Técnico", atCode: "AT3B/12D", aeCode: "AE1B/AE4", status: "PENDIENTE", diff: "N/A", risk: "CRÍTICO" },
        { label: "Cronología de programas", atCode: "AT12(A-D)", aeCode: "AE (Erogaciones)", status: "PENDIENTE", diff: "N/A", risk: "ALTO" }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">

            {/* Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl bg-slate-900 shadow-xl border border-slate-800 text-white relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -mx-10 -my-10" />
                    <h3 className="text-[12px] font-black text-emerald-400 uppercase tracking-widest mb-2 z-10 flex items-center gap-2">
                        <DollarSign className="w-4 h-4" /> Integración Presupuestal
                    </h3>
                    <h2 className="text-3xl font-black mb-1 z-10 tracking-tight">Económico M1</h2>
                    <p className="text-slate-400 text-xs font-bold w-3/4 z-10">Análisis absoluto de los anexos del presupuesto y vinculación directa con el universo técnico.</p>
                </div>
            </div>

            {/* Resumen Económico */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 text-emerald-500 rounded-xl">
                        <DollarSign className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">RESUMEN ECONÓMICO</h2>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Estructura general con base en los anexos disponibles</h3>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-8 divide-x divide-y lg:divide-y-0 divide-slate-100 bg-slate-50">
                    {econSummary.map((item, idx) => (
                        <div key={idx} className={cn("p-6 flex flex-col text-center transition-colors hover:bg-slate-100", item.code === "AE21" ? "bg-emerald-50/50" : "")}>
                            <h4 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.label}</h4>
                            <div className="mt-auto">
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin Datos</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Consistencia Técnico Económica */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                    <div className="p-2 bg-purple-50 text-purple-500 rounded-xl">
                        <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">CONSISTENCIA TÉCNICO-ECONÓMICA</h2>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matriz de cruce para detección de {RiskType.TECHNICAL_ECONOMIC_MISMATCH}</h3>
                    </div>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Rubro</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">AT Base</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">AE Valuación</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Estado de Integridad</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Diferencia</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Riesgo</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {matrixMocks.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <span className="text-xs font-black text-slate-700">{row.label}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase">{row.atCode}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold tracking-widest uppercase">{row.aeCode}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                                            {row.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className="text-xs font-bold text-slate-300">--</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={cn("text-[10px] font-black uppercase tracking-widest",
                                            row.risk === 'CRÍTICO' ? 'text-rose-500' : (row.risk === 'ALTO' ? 'text-orange-500' : 'text-slate-400')
                                        )}>
                                            {row.risk}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button className="text-[10px] font-black text-cyan-500 hover:text-cyan-700 tracking-widest uppercase bg-cyan-50 px-3 py-1 rounded-full transition-colors">
                                            Inspeccionar
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};
