import React from 'react';
import { M1PersonnelData, validatePersonnelMatch } from './data/m1ActiveTender';
import { Users, FileText, CheckCircle, AlertTriangle, UserCheck, ShieldAlert, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const M1PersonnelView = () => {

    // Derived states
    const requiredPositions = M1PersonnelData.positions.length;
    const proposedPeople = M1PersonnelData.members.length;

    // Simulate counts
    const supportedPeople = M1PersonnelData.members.filter(m => validatePersonnelMatch(m) === 'QUALIFIES').length;
    const incompleteDocs = M1PersonnelData.members.filter(m => validatePersonnelMatch(m) === 'PARTIAL').length;
    const missingLicenses = M1PersonnelData.members.filter(m => !m.professionalLicense).length;
    const missingLetters = M1PersonnelData.members.filter(m => !m.commitmentLetter).length;
    const criticalRisks = 0; // Derived logically

    const kpis = [
        { label: "Puestos Requeridos", val: requiredPositions, icon: Users, color: "text-slate-500" },
        { label: "Personas Propuestas", val: proposedPeople, icon: UserCheck, color: "text-blue-500" },
        { label: "Personas Acreditables", val: supportedPeople, icon: CheckCircle, color: "text-emerald-500" },
        { label: "Documentación Incompleta", val: incompleteDocs, icon: FileText, color: "text-amber-500" },
        { label: "Cédulas Faltantes", val: missingLicenses, icon: AlertTriangle, color: "text-orange-500" },
        { label: "Cartas Faltantes", val: missingLetters, icon: AlertTriangle, color: "text-rose-400" },
        { label: "Riesgos Críticos", val: criticalRisks, icon: ShieldAlert, color: "text-rose-600" }
    ];

    const BooleanCell = ({ val }) => (
        <td className="px-3 py-3 text-center">
            {val ? <BadgeCheck className="w-4 h-4 text-emerald-500 mx-auto" /> : <div className="w-4 h-4 rounded-full bg-slate-200 mx-auto" />}
        </td>
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">

            {/* Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl bg-slate-900 shadow-xl border border-slate-800 text-white relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl -mx-10 -my-10" />
                    <h3 className="text-[12px] font-black text-fuchsia-400 uppercase tracking-widest mb-2 z-10 flex items-center gap-2">
                        <Users className="w-4 h-4" /> Recursos Humanos
                    </h3>
                    <h2 className="text-3xl font-black mb-1 z-10 tracking-tight">Plantilla del Personal</h2>
                    <p className="text-slate-400 text-xs font-bold w-3/4 z-10">Auditoría sobre profesionales acreditables por consorciado cruzado contra el Modelo Económico y Criterios Técnicos.</p>
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

            {/* Warning Rule Pending */}
            {M1PersonnelData.positions.some(p => p.sourceStatus === 'CONFLICTING_SOURCES') && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-4">
                    <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0" />
                    <div>
                        <h4 className="text-sm font-black text-amber-800 uppercase tracking-widest mb-1">REGLAS PARAMÉTRICAS DE PERSONAL PENDIENTES</h4>
                        <p className="text-xs font-medium text-amber-700 leading-snug">
                            Las características exactas (años de antigüedad y especialidades obligatorias) continúan sin ser asignadas definitivamente hasta finalizar conciliación normativa. Ningún miembro se evaluará negativamente hasta que la fuente dicte el umbral aplicable.
                        </p>
                    </div>
                </div>
            )}

            {/* Main Personnel Grid */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center gap-3">
                    <div className="p-2 bg-fuchsia-50 text-fuchsia-500 rounded-xl">
                        <UserCheck className="w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">PERSONAL PROPUESTO</h2>
                        <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Acreditación cruzada (AT3A - AT3B - AT12D)</h3>
                    </div>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1300px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">PERSONA</th>
                                <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">EMPRESA</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">PUESTO</th>
                                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">AÑOS</th>
                                <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">CV</th>
                                <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">TÍTULO</th>
                                <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">CÉDULA</th>
                                <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">IDENTIF.</th>
                                <th className="px-3 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center border-r">CARTA</th>
                                <th className="px-3 py-3 text-[9px] font-black text-cyan-600 uppercase tracking-widest text-center bg-cyan-50/50">AT3A</th>
                                <th className="px-3 py-3 text-[9px] font-black text-cyan-600 uppercase tracking-widest text-center bg-cyan-50/50">AT3B</th>
                                <th className="px-3 py-3 text-[9px] font-black text-cyan-600 uppercase tracking-widest text-center bg-cyan-50/50">AT12D</th>
                                <th className="px-4 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">ESTADO</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {M1PersonnelData.members.map(member => {
                                const status = validatePersonnelMatch(member);
                                return (
                                    <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-5 py-3">
                                            <span className="text-xs font-black text-slate-700 block whitespace-nowrap">{member.fullName}</span>
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{member.profession}</span>
                                        </td>
                                        <td className="px-3 py-3">
                                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase">{member.employerEntityId.substring(0, 6)}..</span>
                                        </td>
                                        <td className="px-5 py-3">
                                            <span className="text-[10px] font-bold text-slate-600 capitalize leading-tight block">{member.proposedRole}</span>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className="text-xs font-black text-slate-700">{member.yearsExperience}</span>
                                        </td>
                                        <BooleanCell val={member.cv} />
                                        <BooleanCell val={member.titleDocument} />
                                        <BooleanCell val={member.professionalLicense} />
                                        <BooleanCell val={member.officialId} />
                                        <BooleanCell val={member.commitmentLetter} />
                                        <td className="px-3 py-3 text-center bg-cyan-50/20 border-l border-cyan-50">
                                            {member.verificationStatus === 'SUPPORTED' ? <CheckCircle className="w-4 h-4 text-cyan-500 mx-auto" /> : <div className="w-4 h-4 mx-auto block" />}
                                        </td>
                                        <td className="px-3 py-3 text-center bg-cyan-50/20">
                                            <CheckCircle className="w-4 h-4 text-cyan-500 mx-auto" />
                                        </td>
                                        <td className="px-3 py-3 text-center bg-cyan-50/20">
                                            <CheckCircle className="w-4 h-4 text-cyan-500 mx-auto" />
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={cn("px-2 py-1.5 rounded text-[8px] font-black tracking-widest uppercase",
                                                status === "QUALIFIES" ? "bg-emerald-100 text-emerald-700" :
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
