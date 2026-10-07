import React from 'react';
import { officialTenderRequirements, RiskType, RequirementStatus, M1LegalData } from './data/m1ActiveTender';
import { Scale, ShieldAlert, CheckCircle, AlertOctagon, Users2, Building2, Gavel, FileSignature } from 'lucide-react';
import { cn } from '@/lib/utils';

export const M1LegalView = () => {
    // Basic stats
    const legalReqs = officialTenderRequirements.filter(r => r.group === 'LEGAL' || r.group === 'ADMINISTRATIVE' || r.group === 'JOINT_PROPOSAL');
    const totalLegal = legalReqs.length;
    const completed = legalReqs.filter(r => r.status === RequirementStatus.COMPLIANT).length;

    // KPI Mock Data
    const kpis = [
        { label: "Documentos legales", val: totalLegal, icon: Scale, color: "text-slate-500" },
        { label: "Completos", val: completed, icon: CheckCircle, color: "text-emerald-500" },
        { label: "Vencidos", val: 0, icon: AlertOctagon, color: "text-rose-500" },
        { label: "Faltan por integrante", val: 3, icon: Users2, color: "text-amber-500" },
        { label: "Firmas faltantes", val: 8, icon: FileSignature, color: "text-purple-500" },
        { label: "Bajo protesta faltantes", val: 7, icon: Gavel, color: "text-cyan-500" },
        { label: "Riesgos Críticos", val: 0, icon: ShieldAlert, color: "text-rose-600" }
    ];

    const underOath = legalReqs.filter(r => r.underOathRequired);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">

            {/* Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl bg-slate-900 shadow-xl border border-slate-800 text-white relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl -mx-10 -my-10" />
                    <h3 className="text-[12px] font-black text-indigo-400 uppercase tracking-widest mb-2 z-10 flex items-center gap-2">
                        <Scale className="w-4 h-4" /> Control Documental
                    </h3>
                    <h2 className="text-3xl font-black mb-1 z-10 tracking-tight">Legal y Administrativo</h2>
                    <p className="text-slate-400 text-xs font-bold w-3/4 z-10">Validación de personería, cumplimiento fiscal, convenios conjuntos y mitigación de riesgos de desechamiento puro.</p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {kpis.slice(1, 7).map((kpi, idx) => {
                        const Icon = kpi.icon;
                        return (
                            <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between">
                                <Icon className={cn("w-5 h-5 mb-2", kpi.color)} />
                                <div>
                                    <h4 className="text-2xl font-black text-slate-800 tracking-tight">{kpi.val}</h4>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Categorías */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {[
                    { title: "CORPORATIVO", desc: "Acreditación y poderes", icon: Building2, color: "bg-blue-50 text-blue-600" },
                    { title: "CUMPLIMIENTO FISCAL", desc: "Vigencia y opiniones", icon: ShieldAlert, color: "bg-emerald-50 text-emerald-600" },
                    { title: "MANIFESTACIONES", desc: "Declaraciones de ley", icon: Gavel, color: "bg-purple-50 text-purple-600" },
                    { title: "PARTICIPACIÓN CONJUNTA", desc: "Convenios y alcances", icon: Users2, color: "bg-cyan-50 text-cyan-600" }
                ].map((block, i) => (
                    <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                        <div className={cn("w-10 h-10 rounded-full flex items-center justify-center mb-4", block.color)}>
                            <block.icon className="w-5 h-5" />
                        </div>
                        <h3 className="text-sm font-black text-slate-800 tracking-tight mb-1">{block.title}</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{block.desc}</p>
                    </div>
                ))}
            </div>

            {/* Matriz de Participación Conjunta */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-50 text-cyan-500 rounded-xl">
                            <Users2 className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">MATRIZ DE PARTICIPACIÓN CONJUNTA</h2>
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Validación cruzada de cumplimiento individual</h3>
                        </div>
                    </div>
                    {M1LegalData && (
                        <div className="px-3 py-1 bg-slate-100 text-slate-600 text-[10px] font-black tracking-widest uppercase rounded">
                            {M1LegalData.entity.name}
                        </div>
                    )}
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">INTEGRANTE</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">ROL</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">DLA1</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">DLA3</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">DLA4</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">DLA5</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">DLA6 (Vigencia)</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest rounded-tl-lg bg-indigo-50 border-x border-indigo-100 border-t">PARTICIPACIÓN</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {M1LegalData?.entity?.members?.map((member, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                                    <td className="px-5 py-4">
                                        <span className="text-xs font-black text-slate-700 block">{member.name}</span>
                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{member.rfc}</span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest", member.role === "LEAD" ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-600")}>
                                            {member.role === "LEAD" ? "REPRESENTANTE COMÚN" : "INTEGRANTE"}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="w-4 h-4 rounded-full bg-slate-200" />
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="w-4 h-4 rounded-full bg-slate-200" />
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="w-4 h-4 rounded-full bg-slate-200" />
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="w-4 h-4 rounded-full bg-slate-200" />
                                    </td>
                                    <td className="px-5 py-4">
                                        <div className="w-4 h-4 rounded-full bg-slate-200" />
                                    </td>
                                    <td className="px-5 py-4 bg-indigo-50/30 border-x border-indigo-100 group-hover:bg-indigo-50/50">
                                        <span className="text-xs font-black text-indigo-700">{member.percentage}%</span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Under Oath Documents */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                    <div className="p-2 bg-rose-50 text-rose-500 rounded-xl">
                        <Gavel className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">UNDER OATH DOCUMENTS</h2>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Documentos requeridos obligatoriamente bajo protesta de decir verdad</h3>
                    </div>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Requisito</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Texto Requerido</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Firma Autógrafa</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Membrete</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Riesgo</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {underOath.map((req, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="bg-slate-800 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest">
                                                {req.code}
                                            </span>
                                            <span className="text-xs font-black text-slate-700">{req.title}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="text-[10px] font-bold text-slate-500 line-clamp-1 max-w-[200px]">{req.exactRequirementSummary}</span>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {req.autographSignatureRequired ? (
                                            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[9px] font-black tracking-widest uppercase rounded">EXIGIDA</span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Normal</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {req.letterheadRequired ? (
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">SÍ</span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">NO</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <span className={cn("text-[8px] font-black uppercase tracking-widest px-2 py-1 rounded bg-rose-50 text-rose-500")}>
                                            {req.riskType}
                                        </span>
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
