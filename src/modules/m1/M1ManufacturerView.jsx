import React from 'react';
import { M1OEMData, manufacturerReferenceRequirement, validateManufacturerReference, RiskType } from './data/m1ActiveTender';
import { Factory, ShieldAlert, CheckCircle, Search, BadgeCheck, AlertTriangle, FileText, Settings, Cog } from 'lucide-react';
import { cn } from '@/lib/utils';

export const M1ManufacturerView = () => {

    const mainOem = M1OEMData.providers[0]; // Currently just using the main for the UI mockup
    const allReferences = M1OEMData.providers.flatMap(p => p.references);

    // KPIs
    const evalOems = M1OEMData.providers.length;
    const letterStatus = mainOem.commitmentLetterStatus === 'PENDING' ? "PENDIENTE" : "SUBIDA";
    const totalRefs = allReferences.length;
    const verifiedRefs = allReferences.filter(r => r.verified).length;
    const qualifiedRefs = allReferences.filter(r => r.qualifiesForRequirement).length;
    const ruleStatus = manufacturerReferenceRequirement.sourceStatus === 'CONFLICTING_SOURCES' ? "PENDIENTE RECONCILIACIÓN" : "ESTABLECIDA";

    const kpis = [
        { label: "OEM Evaluados", val: evalOems, icon: Factory, color: "text-slate-500" },
        { label: "Carta Compromiso", val: letterStatus, icon: FileText, color: "text-amber-500" },
        { label: "Referencias Cargadas", val: totalRefs, icon: Search, color: "text-blue-500" },
        { label: "Refs. Verificadas", val: verifiedRefs, icon: BadgeCheck, color: "text-emerald-500" },
        { label: "Refs. Calificables", val: qualifiedRefs, icon: CheckCircle, color: "text-emerald-600" },
        { label: "Regla Oficial", val: ruleStatus, icon: Settings, color: "text-rose-500" },
        { label: "Riesgos Críticos", val: 0, icon: ShieldAlert, color: "text-slate-300" }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">

            {/* Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl bg-slate-900 shadow-xl border border-slate-800 text-white relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mx-10 -my-10" />
                    <h3 className="text-[12px] font-black text-cyan-400 uppercase tracking-widest mb-2 z-10 flex items-center gap-2">
                        <Cog className="w-4 h-4" /> Proveeduría Tecnológica
                    </h3>
                    <h2 className="text-3xl font-black mb-1 z-10 tracking-tight">Fabricantes y OEM</h2>
                    <p className="text-slate-400 text-xs font-bold w-3/4 z-10">Auditoría centralizada sobre cartas compromiso y compatibilidad de experiencia tecnológica (referencias) de los fabricantes del core tecnológico.</p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
                {kpis.map((kpi, idx) => {
                    const Icon = kpi.icon;
                    return (
                        <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between items-center text-center">
                            <h4 className={cn("text-xl font-black tracking-tight", kpi.color)}>{kpi.val}</h4>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight mt-1">{kpi.label}</p>
                        </div>
                    )
                })}
            </div>

            {/* Warning Conflict */}
            {manufacturerReferenceRequirement.sourceStatus === 'CONFLICTING_SOURCES' && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                        <h4 className="text-sm font-black text-amber-800 uppercase tracking-widest mb-1">REGLA OFICIAL EN CONFLICTO (CANTIDAD DE REFERENCIAS)</h4>
                        <p className="text-xs font-medium text-amber-700 leading-snug">
                            No es posible contabilizar el cumplimiento legal u otorgar puntos definitivos. Existen discrepancias documentales sobre la cantidad exigida de plantas
                            nacionales e internacionales. <strong>Acción requerida:</strong> Esperar Junta de Aclaraciones u oficio de modificación para estipular regla oficial dura.
                        </p>
                    </div>
                </div>
            )}

            {/* Matriz comparativa OEM */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                    <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
                        <Factory className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">MATRIZ COMPARATIVA OEM</h2>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validación de viabilidad por fabricante</h3>
                    </div>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[800px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 divide-x divide-slate-100">
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest max-w-[200px]">COMPONENTE</th>
                                {M1OEMData.providers.map(p => (
                                    <th key={p.id} className="px-5 py-3 text-[9px] font-black text-slate-700 uppercase tracking-widest text-center">
                                        <div className="flex flex-col items-center">
                                            <span>{p.commercialName}</span>
                                            <span className={cn("text-[8px] font-bold mt-1 px-2 py-0.5 rounded tracking-widest",
                                                p.verificationStatus === 'CANDIDATE' ? "bg-amber-100 text-amber-600" : "bg-emerald-100 text-emerald-600"
                                            )}>{p.verificationStatus}</span>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {[
                                { title: "Carta Compromiso", key: "commitmentLetterStatus" },
                                { title: "Tecnología RSU Ofertada", key: "proposedTechnology" },
                                { title: "Alcance", key: "proposedScope" },
                                { title: "Referencias Calificables", key: "qualifyingRefs" }
                            ].map((row, i) => (
                                <tr key={i} className="divide-x divide-slate-50 hover:bg-slate-50/50">
                                    <td className="px-5 py-4 text-xs font-black text-slate-700">{row.title}</td>
                                    {M1OEMData.providers.map(p => {
                                        let val = p[row.key];
                                        if (row.key === 'qualifyingRefs') {
                                            val = p.references.filter(r => r.qualifiesForRequirement).length;
                                        }
                                        return (
                                            <td key={p.id} className="px-5 py-4 text-center text-xs font-medium text-slate-500">
                                                {val}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Referencias Cargadas */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-500 rounded-xl">
                        <Search className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">REFERENCIAS DEL FABRICANTE</h2>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Auditoría cruzada de experiencia OEM</h3>
                    </div>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">PLANTA</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">PAÍS</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">TECNOLOGÍA</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">CAPACIDAD</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">ALCANCE</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">VERIFICADA</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">CALIFICA</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {allReferences.map(ref => {
                                const status = validateManufacturerReference(ref);
                                return (
                                    <tr key={ref.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-4">
                                            <span className="text-xs font-black text-slate-700 block">{ref.plantName}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{ref.client}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-xs font-bold text-slate-500">{ref.country}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase">{ref.technologyType}</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="text-xs font-black text-slate-700">{ref.designCapacityTPD} TPD</span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex gap-1 flex-wrap max-w-[150px]">
                                                {ref.scopeProvided.map(s => (
                                                    <span key={s} className="bg-cyan-50 text-cyan-600 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase">{s}</span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            {ref.verified ? (
                                                <BadgeCheck className="w-5 h-5 text-emerald-500 mx-auto" />
                                            ) : (
                                                <AlertTriangle className="w-5 h-5 text-amber-500 mx-auto" />
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-center">
                                            <span className={cn("px-2 py-1.5 rounded text-[8px] font-black tracking-widest uppercase",
                                                status === "SUPPORTED" ? "bg-emerald-100 text-emerald-700" :
                                                    status === "PARTIAL" ? "bg-amber-100 text-amber-700" :
                                                        "bg-rose-100 text-rose-700"
                                            )}>
                                                {status}
                                            </span>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

        </div>
    );
};
