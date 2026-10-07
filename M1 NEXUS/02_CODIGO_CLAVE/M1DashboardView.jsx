import React from 'react';
import { useM1Store } from './M1Store';
import { M1DeadlineCountdown } from './M1DeadlineCountdown';
import { Activity, Star, Users, Briefcase, Settings2, FileText, FolderOpen } from 'lucide-react';
import { cn } from '@/lib/utils';
import { officialConfiguration, rebuildEffectiveTenderRules } from './data/m1ActiveTender';

export const M1DashboardView = () => {
    const store = useM1Store();
    const { normativeDatasetStatus } = rebuildEffectiveTenderRules();
    const totalDocs = store.requirements.length;
    const missingDocsCount = store.requirements.filter(r => (r.evidenceLinks || []).length === 0).length;
    const expPorcentaje = totalDocs > 0 ? Math.floor(100 - (missingDocsCount / totalDocs * 100)) : 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full relative">
            <div className="absolute -top-12 right-0 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                SYSTEM VALIDATION: LIVE PENDING
            </div>
            <M1DeadlineCountdown />

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FolderOpen className="w-3 h-3" /> Expediente Integral</span>
                    <div className="mt-4">
                        <p className="text-4xl font-black text-slate-800 tracking-tighter">{expPorcentaje}%</p>
                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">{store.requirements.length - missingDocsCount} / {store.requirements.length} Docs</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Star className="w-3 h-3" /> Puntos Acreditados</span>
                    <div className="mt-4">
                        <p className="text-4xl font-black text-amber-500 tracking-tighter">0.0</p>
                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Requeridos: 37.5</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2"><Activity className="w-3 h-3" /> Riesgos Críticos</span>
                    <div className="mt-4">
                        <p className="text-4xl font-black text-rose-500 tracking-tighter">5</p>
                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Activos y sin mitigación</p>
                    </div>
                </div>

                <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between relative overflow-hidden text-white">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl -mx-4 -my-4 pointer-events-none" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Settings2 className="w-3 h-3" /> Modelo Normativo</span>
                    <div className="mt-4 z-10 relative">
                        <p className="text-2xl font-black text-white tracking-tighter uppercase">{normativeDatasetStatus}</p>
                        <p className="text-xs font-bold text-cyan-400 mt-1 uppercase tracking-widest">Basado en Junta {officialConfiguration.clarificationsMeetingsTotal}</p>
                    </div>
                </div>

            </div>

        </div>
    );
};
