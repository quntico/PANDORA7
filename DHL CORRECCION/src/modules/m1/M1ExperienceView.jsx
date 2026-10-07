import React, { useState } from 'react';
import { M1ExperienceData, validateExperienceContract } from './data/m1ActiveTender';
import { Briefcase, CheckCircle, ShieldAlert, FileSearch, Building, Target, Link as LinkIcon, BadgeCheck, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const M1ExperienceView = () => {

    const contracts = M1ExperienceData.contracts;

    // KPIs
    const totalLoaded = contracts.length;
    const supported = contracts.filter(c => validateExperienceContract(c) === 'SUPPORTED').length;
    const partial = contracts.filter(c => validateExperienceContract(c) === 'PARTIAL').length;
    const qualifying = contracts.filter(c => c.qualificationStatus === 'QUALIFIES').length;

    // Derived Points Logic (mock values for now)
    const pointsPossible = 12.0;
    const pointsSecured = 9.0;
    const pointsRisk = 3.0;

    const kpis = [
        { label: "Contratos Cargados", val: totalLoaded, icon: Briefcase, color: "text-slate-500" },
        { label: "Soportados (Evidencia)", val: supported, icon: FileSearch, color: "text-blue-500" },
        { label: "Evaluación Parcial", val: partial, icon: AlertTriangle, color: "text-amber-500" },
        { label: "Califican a Scoring", val: qualifying, icon: CheckCircle, color: "text-emerald-500" },
        { label: "Puntos Potenciales", val: pointsPossible, icon: Target, color: "text-slate-600" },
        { label: "Puntos Acreditados", val: pointsSecured, icon: BadgeCheck, color: "text-emerald-600" },
        { label: "Puntos en Riesgo", val: pointsRisk, icon: ShieldAlert, color: "text-rose-500" }
    ];

    const providerStats = [
        { entityType: "Licitante Líder", acronym: "BIDDER", count: 1 },
        { entityType: "Consorciado M1", acronym: "CONSORTIUM", count: 0 },
        { entityType: "Constructor Civil", acronym: "CONSTRUCTOR", count: 0 },
        { entityType: "OEM", acronym: "MANUFACTURER", count: 2 },
    ];

    const [activeTab, setActiveTab] = useState('contracts');

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">

            {/* Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl bg-slate-900 shadow-xl border border-slate-800 text-white relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -mx-10 -my-10" />
                    <h3 className="text-[12px] font-black text-amber-400 uppercase tracking-widest mb-2 z-10 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" /> Solvencia del Licitante
                    </h3>
                    <h2 className="text-3xl font-black mb-1 z-10 tracking-tight">Experiencia Contractual</h2>
                    <p className="text-slate-400 text-xs font-bold w-3/4 z-10">Mapeo absoluto de contratos soportados sin adjudicación de puntos dobles multi-entidad.</p>
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

            {/* Entity Aportation Board */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
                {providerStats.map((stat, i) => (
                    <div key={i} className="px-6 py-4 bg-white border border-slate-100 rounded-3xl shadow-sm flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-slate-50 text-slate-500 rounded-xl">
                                <Building className="w-4 h-4" />
                            </div>
                            <div>
                                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">{stat.entityType}</h4>
                                <p className="text-xl font-black text-slate-800 tracking-tight leading-none mt-1">{stat.count} <span className="text-[10px] font-bold text-slate-400 uppercase tracking-normal">Contratos</span></p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Tabs */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="border-b border-slate-100 p-4">
                    <div className="flex bg-slate-50 p-1 rounded-xl w-max">
                        <button onClick={() => setActiveTab('contracts')} className={cn("px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-colors", activeTab === 'contracts' ? 'bg-white shadow-sm text-amber-600' : 'text-slate-500 hover:text-slate-700')}>Contratos Base</button>
                        <button onClick={() => setActiveTab('scoring')} className={cn("px-6 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-colors", activeTab === 'scoring' ? 'bg-white shadow-sm text-cyan-600' : 'text-slate-500 hover:text-slate-700')}>Score Contribution Map</button>
                    </div>
                </div>

                {activeTab === 'contracts' && (
                    <div className="w-full overflow-x-auto">
                        <table className="w-full text-left border-collapse min-w-[1200px]">
                            <thead>
                                <tr className="bg-white border-b border-slate-100">
                                    <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">CONTRATO</th>
                                    <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">ENTIDAD / PROPIETARIO</th>
                                    <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest max-w-[200px]">OBJETO</th>
                                    <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">ALCANCE / CATEGORÍA</th>
                                    <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">EVIDENCIA</th>
                                    <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">MONTO</th>
                                    <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">ESTADO</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {contracts.map(c => {
                                    const status = validateExperienceContract(c);
                                    return (
                                        <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-4">
                                                <span className="text-xs font-black text-slate-800 block">{c.contractNumber}</span>
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest line-clamp-1">{c.client}</span>
                                            </td>
                                            <td className="px-5 py-4 flex flex-col gap-1">
                                                <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[8px] font-black tracking-widest uppercase w-max">{c.evidenceOwnerType}</span>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase">{c.entityId}</span>
                                            </td>
                                            <td className="px-5 py-4">
                                                <p className="text-[10px] font-medium text-slate-600 line-clamp-2 max-w-[250px]">{c.object}</p>
                                            </td>
                                            <td className="px-5 py-4">
                                                <div className="flex gap-1 flex-wrap max-w-[150px]">
                                                    {c.scopePerformed.map(s => (
                                                        <span key={s} className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[8px] font-black tracking-widest uppercase">{s}</span>
                                                    ))}
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className={cn("text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded", c.contractDocument ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500")}>CONT</span>
                                                    <span className={cn("text-[9px] font-black tracking-widest uppercase px-1.5 py-0.5 rounded", c.acceptanceDocument ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-500")}>ACTA</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-4 text-center">
                                                <span className="text-[10px] font-black text-slate-700">${(c.contractAmount / 1000000).toFixed(1)}M</span>
                                                <span className="text-[8px] font-bold text-slate-400 block tracking-widest uppercase">MXN</span>
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
                )}

                {activeTab === 'scoring' && (
                    <div className="p-12 text-center text-slate-400">
                        <LinkIcon className="w-8 h-8 mx-auto mb-4 opacity-50" />
                        <h4 className="text-sm font-black uppercase tracking-widest mb-2 text-slate-500">Mapeo de Puntos no Ejecutado</h4>
                        <p className="text-xs max-w-md mx-auto">La red de asignación de criterios de evaluación procederá tras la compilación exitosa de todos los módulos durante la corrida del M1AuditEngine.</p>
                    </div>
                )}
            </div>

        </div>
    );
};
