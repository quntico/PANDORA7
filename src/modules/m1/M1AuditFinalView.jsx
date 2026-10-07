import React, { useMemo } from 'react';
import { useM1Store } from './M1Store';
import { officialTenderRequirements, rebuildEffectiveTenderRules } from './data/m1ActiveTender';
import { FileCheck2, Download, CloudDownload, ShieldAlert, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const M1AuditFinalView = () => {
    const { requirements, submissionReadiness } = useM1Store();

    // Evaluate Data
    const { normativeDatasetStatus, clarificationCoverageStatus } = rebuildEffectiveTenderRules();
    const isTenderCurrent = normativeDatasetStatus === 'CURRENT';

    const auditState = useMemo(() => {
        let totalPoints = 50.0;
        let securedPoints = 0;
        let estimatedPoints = 0; // if evidence were supported/provided
        let missingMandatory = 0;
        let rejectionRisks = 0;

        officialTenderRequirements.forEach(req => {
            const state = requirements.find(r => r.id === req.id) || {};
            const isCompliant = state.status === 'COMPLIANT';
            const docs = state.evidenceLinks || [];

            if (req.mandatory && (!isCompliant || docs.length === 0)) missingMandatory++;
            if (req.rejectionStatus === 'CONFIRMED' && (!isCompliant || docs.length === 0)) rejectionRisks++;

            if (req.scored) {
                if (isCompliant && docs.length > 0) securedPoints += req.maxPoints;
                else estimatedPoints += req.maxPoints;
            }
        });

        const isFinalReady = isTenderCurrent && submissionReadiness === 'READY_FOR_INTERNAL_REVIEW' && missingMandatory === 0;

        return {
            securedPoints,
            estimatedPoints,
            missingMandatory,
            rejectionRisks,
            isFinalReady,
            totalPoints,
            gapToContract: Math.max(0, 37.50 - securedPoints)
        };
    }, [requirements, submissionReadiness, isTenderCurrent]);

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl bg-slate-900 shadow-xl border border-slate-800 text-white relative flex flex-col justify-center overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl -mx-10 -my-10" />
                    <h3 className={cn("text-[12px] font-black uppercase tracking-widest mb-2 z-10 flex items-center gap-2", auditState.isFinalReady ? "text-emerald-400" : "text-rose-400")}>
                        <FileCheck2 className="w-4 h-4" /> {auditState.isFinalReady ? 'Auditoría Final Aprobada' : 'Auditoría Preliminar M1'}
                    </h3>
                    <h2 className="text-3xl font-black mb-1 z-10 tracking-tight">Informe PANDORA</h2>
                    <p className="text-slate-400 text-xs font-bold w-3/4 z-10">Emisión analítica de estado probatorio y constructivo previo a la inyección final del modelo económico.</p>
                </div>
            </div>

            <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <h3 className="text-lg font-black text-slate-800 tracking-tight mb-6 flex items-center gap-2">
                    Métricas Maestras de Riesgo y Competitividad
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estado Normativo M1</span>
                        <span className={cn("text-xl font-black mt-auto", isTenderCurrent ? "text-emerald-600" : "text-rose-500")}>
                            {normativeDatasetStatus}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Cobertura JA: {clarificationCoverageStatus}</span>
                    </div>

                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Faltantes Críticos (Desecho)</span>
                        <span className={cn("text-3xl font-black mt-auto", auditState.rejectionRisks > 0 ? "text-rose-600" : "text-emerald-600")}>
                            {auditState.rejectionRisks}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Causales Confirmadas Activadas</span>
                    </div>

                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Puntos Técnicos Asegurados</span>
                        <span className="text-3xl font-black text-emerald-600 mt-auto flex items-baseline gap-1">
                            {auditState.securedPoints.toFixed(2)} <span className="text-xs text-slate-400">/ {auditState.totalPoints}</span>
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Brecha a Mínimo: {auditState.gapToContract.toFixed(2)} pts</span>
                    </div>

                    <div className="p-6 bg-slate-50 border border-slate-100 rounded-2xl flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Puntos Potenciales / Estimados</span>
                        <span className="text-3xl font-black text-amber-500 mt-auto flex items-baseline gap-1">
                            {auditState.estimatedPoints.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 mt-1 uppercase">Sin Evidencia Definitiva Aún</span>
                    </div>
                </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-6 rounded-3xl flex gap-4 items-start shadow-sm">
                <ShieldAlert className="w-8 h-8 text-amber-600 shrink-0" />
                <div>
                    <h4 className="text-sm font-black text-amber-800 uppercase tracking-widest mb-1">{auditState.isFinalReady ? 'SOLVENCIA CONFIRMADA' : 'INFORME DE CUMPLIMIENTO IMPEDIDO'}</h4>
                    <p className="text-xs font-bold text-amber-700 max-w-4xl">
                        {auditState.isFinalReady
                            ? "El Sistema PANDORA certifica la pre-solvencia técnica y normativa del conjunto M1. El volumen documental no reporta fallos a los algoritmos de riesgo."
                            : "Atención: La declaración de solvencia técnica no ha sido alcanzada. Existen brechas documentales críticas en la matriz operativa, modificaciones pendientes de aplicar, o ausencia física de garantías. Reporte etiquetado como Auditoría Preliminar y no válido para recomendación ejecutiva."
                        }
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
                <button className="flex-1 py-4 bg-slate-900 border border-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest gap-2 flex items-center justify-center hover:bg-slate-800 shadow-md">
                    <Download className="w-4 h-4" /> EXPORTAR INFORME PDF
                </button>
                <button className="flex-1 py-4 bg-white border border-slate-200 text-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-widest gap-2 flex items-center justify-center hover:bg-slate-50 shadow-sm">
                    <CloudDownload className="w-4 h-4" /> EXPORTAR JSON (BACKUP)
                </button>
            </div>

        </div>
    )
}
