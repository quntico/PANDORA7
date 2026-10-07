import React, { useState } from 'react';
import { officialTenderRequirements, RiskType, RequirementStatus, RejectionStatus, auditTenderDatasetIntegrity } from './data/m1ActiveTender';
import { AlertOctagon, ShieldAlert, FileWarning, Search, XCircle, FileQuestion, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const M1RiskView = () => {
    // Generate risk register dynamically from official requirements
    const riskRegister = officialTenderRequirements
        .filter(req => req.status !== RequirementStatus.COMPLIANT && req.status !== RequirementStatus.NOT_APPLICABLE)
        .map(req => {
            let severity = "LOW";

            // Map severe internal states to Severity
            if (req.rejectionStatus === RejectionStatus.CONFIRMED && req.riskType === RiskType.REJECTION) severity = "CRITICAL";
            else if (req.riskType === RiskType.TECHNICAL_SCORE_LOSS || req.riskType === RiskType.LEGAL_EXPIRED) severity = "HIGH";
            else if (req.priority === "CRÍTICA" || req.priority === "ALTA") severity = "HIGH";
            else if (req.riskType === RiskType.DOCUMENT_MISSING || req.riskType === RiskType.INCONSISTENCY) severity = "MEDIUM";
            else if (req.riskType === RiskType.INFORMATIONAL) severity = "INFO";

            return {
                id: `R-${req.id}`,
                requirementId: req.id,
                family: req.group,
                riskType: req.riskType,
                severity: severity,
                description: `Incumplimiento potencial: ${req.title}`,
                evidenceGap: req.evidenceRequired.join(", ") || "No definido",
                responsible: req.responsiblePerson,
                status: "OPEN",
                mitigation: req.exactRequirementSummary
            };
        });

    const [activeFilter, setActiveFilter] = useState('ALL');

    // Stats calculations
    const stats = {
        open: riskRegister.length,
        critical: riskRegister.filter(r => r.severity === 'CRITICAL').length,
        rejection: officialTenderRequirements.filter(r => r.rejectionStatus === RejectionStatus.CONFIRMED).length,
        points: riskRegister.filter(r => r.riskType === RiskType.TECHNICAL_SCORE_LOSS).length,
        missing: riskRegister.filter(r => r.riskType === RiskType.DOCUMENT_MISSING || r.riskType === RiskType.LEGAL_MISSING).length,
        inconsistencies: riskRegister.filter(r => r.riskType.includes("INCONSISTENCY") || r.riskType.includes("MISMATCH")).length,
        expired: riskRegister.filter(r => r.riskType === RiskType.LEGAL_EXPIRED).length
    };

    const datasetStats = auditTenderDatasetIntegrity();

    const filteredRisks = riskRegister.filter(r => {
        if (activeFilter === 'CRÍTICO') return r.severity === 'CRITICAL' || r.severity === 'HIGH';
        if (activeFilter === 'DESECHAMIENTO') return r.severity === 'CRITICAL';
        if (activeFilter === 'INCONSISTENCIAS') return r.riskType.includes("INCONSISTENCY") || r.riskType.includes("MISMATCH");
        if (activeFilter === 'AT') return r.family === 'AT' || r.family === 'TECHNICAL_SCOPE';
        if (activeFilter === 'AE') return r.family === 'AE';
        if (activeFilter === 'LEGAL') return r.family === 'LEGAL' || r.family === 'ADMINISTRATIVE';
        return true; // ALL
    });

    const filters = ['ALL', 'CRÍTICO', 'DESECHAMIENTO', 'PUNTOS', 'LEGAL', 'AT', 'AE', 'INCONSISTENCIAS', 'VENCIMIENTOS'];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">

            {/* Header & Global Dataset Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 p-8 rounded-3xl bg-slate-900 shadow-xl border border-slate-800 text-white relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-red-500/10 rounded-full blur-3xl -mx-10 -my-10" />
                    <h3 className="text-[12px] font-black text-rose-400 uppercase tracking-widest mb-2 z-10 flex items-center gap-2">
                        <AlertOctagon className="w-4 h-4" /> Matriz Maestra de Riesgo
                    </h3>
                    <h2 className="text-3xl font-black mb-1 z-10 tracking-tight">Riesgos Abiertos</h2>
                    <p className="text-slate-400 text-xs font-bold w-3/4 z-10">Consolidación de causales de desechamiento sustentadas y pérdida de solvencia.</p>
                </div>

                <div className={cn(
                    "p-8 rounded-3xl shadow-sm border flex flex-col items-center justify-center text-center transition-colors",
                    datasetStats.status === 'VALID' ? "bg-emerald-50 border-emerald-100"
                        : (datasetStats.status === 'WARNING' ? "bg-amber-50 border-amber-100" : "bg-rose-50 border-rose-100")
                )}>
                    <h3 className={cn("text-[10px] font-black uppercase tracking-widest mb-2",
                        datasetStats.status === 'VALID' ? "text-emerald-500"
                            : (datasetStats.status === 'WARNING' ? "text-amber-500" : "text-rose-500")
                    )}>DATASET INTEGRITY</h3>
                    <div className={cn("text-3xl font-black tracking-tighter uppercase leading-none mb-1",
                        datasetStats.status === 'VALID' ? "text-emerald-600"
                            : (datasetStats.status === 'WARNING' ? "text-amber-600" : "text-rose-600")
                    )}>
                        {datasetStats.status}
                    </div>
                    {datasetStats.status !== 'VALID' && (
                        <p className="text-[10px] font-bold text-slate-500 mt-2">
                            {datasetStats.errors.length > 0 ? "Errores estructurales detectados" : "Advertencias parciales normativas"}
                        </p>
                    )}
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-7 gap-3">
                {[
                    { label: "ABIERTOS", val: stats.open, color: "text-slate-700" },
                    { label: "CRÍTICOS", val: stats.critical, color: "text-rose-500" },
                    { label: "CAUSALES", val: stats.rejection, color: "text-rose-600" },
                    { label: "PUNTOS", val: stats.points, color: "text-amber-500" },
                    { label: "FALTANTES", val: stats.missing, color: "text-purple-500" },
                    { label: "INCONSISTENCIAS", val: stats.inconsistencies, color: "text-orange-500" },
                    { label: "VENCIMIENTOS", val: stats.expired, color: "text-red-600" }
                ].map((kpi, idx) => (
                    <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between items-center text-center">
                        <h4 className={cn("text-2xl font-black tracking-tight", kpi.color)}>{kpi.val}</h4>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
                    </div>
                ))}
            </div>

            {/* Risk Register Table */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-4 border-b border-slate-50 flex items-center justify-between overflow-x-auto">
                    <div className="flex gap-2 min-w-max">
                        {filters.map(f => (
                            <button
                                key={f}
                                onClick={() => setActiveFilter(f)}
                                className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors",
                                    activeFilter === f ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                                )}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[100px]">SEVERIDAD</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">REQ</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">FAMILIA</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">RIESGO</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[250px]">DESCRIPCIÓN</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest min-w-[200px]">MITIGACIÓN ESPERADA</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">RESPONSABLE</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">ACCIÓN</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredRisks.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-5 py-12 text-center">
                                        <p className="text-sm font-black text-slate-300 uppercase tracking-widest">Ningún riesgo registrado en esta categoría</p>
                                    </td>
                                </tr>
                            ) : filteredRisks.map((row, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-3">
                                        <span className={cn("px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border",
                                            row.severity === 'CRITICAL' ? "bg-rose-50 text-rose-600 border-rose-100" :
                                                row.severity === 'HIGH' ? "bg-orange-50 text-orange-600 border-orange-100" :
                                                    row.severity === 'MEDIUM' ? "bg-amber-50 text-amber-600 border-amber-100" :
                                                        row.severity === 'LOW' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                                                            "bg-slate-50 text-slate-500 border-slate-100"
                                        )}>
                                            {row.severity}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-xs font-black text-slate-700 block">{row.requirementId}</span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase">
                                            {row.family}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className={cn("text-[9px] font-black uppercase tracking-widest",
                                            row.riskType === RiskType.REJECTION ? "text-rose-600" : "text-slate-500"
                                        )}>
                                            {row.riskType}
                                        </span>
                                    </td>
                                    <td className="px-5 py-3">
                                        <p className="text-[10px] font-bold text-slate-600 line-clamp-2">{row.description}</p>
                                    </td>
                                    <td className="px-5 py-3">
                                        <p className="text-[10px] font-medium text-slate-500">{row.mitigation}</p>
                                    </td>
                                    <td className="px-5 py-3">
                                        <span className="text-[10px] font-black text-slate-400 capitalize">{row.responsible}</span>
                                    </td>
                                    <td className="px-5 py-3 text-center">
                                        <button className="text-[9px] font-black text-cyan-500 hover:text-cyan-700 tracking-widest uppercase bg-cyan-50 hover:bg-cyan-100 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 mx-auto">
                                            Mitigar <ArrowRight className="w-3 h-3" />
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
