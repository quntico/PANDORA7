import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Search, Filter, Plus, FileEdit, Link, FileUp, UserPlus, Clock, ArrowRight, Save, LayoutGrid, CheckCircle2, XCircle, AlertTriangle, Info } from 'lucide-react';
import { RiskType, RejectionStatus } from './data/m1ActiveTender';
import { useM1Store } from './M1Store';
import { M1RequirementDrawer } from './M1RequirementDrawer';

// Consume officialTenderRequirements directly.
export const M1ChecklistView = ({ requirements = [] }) => {
    const [filterText, setFilterText] = useState('');
    const [statusFilter, setStatusFilter] = useState('TODOS');
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [selectedReq, setSelectedReq] = useState(null);

    const storeRequirements = useM1Store(state => state.requirements);

    const allReqs = useMemo(() => {
        return requirements.map(r => {
            const storeOverlay = storeRequirements.find(sq => sq.id === r.id) || {};
            const effectiveStatus = storeOverlay.status || r.status;
            const effectiveResponsible = storeOverlay.responsiblePerson || r.responsiblePerson;
            return {
                id: r.id,
                code: r.code,
                name: r.title,
                type: r.section === 'I' || r.section === 'III' ? 'TÉCNICO' : 'ECONÓMICO/CAPACIDAD',
                required: r.mandatory,
                scored: r.scored,
                maxPoints: r.maxPoints,
                status: effectiveStatus,
                risk: r.rejectionStatus === RejectionStatus.CONFIRMED ? 'CRÍTICO' : 'MEDIO',
                points: r.accreditedPoints,
                responsible: effectiveResponsible,
                deps: r.crossChecks || [],
                riskType: r.riskType,
                rejectionStatus: r.rejectionStatus,
                rejectionCause: r.rejectionCause,
                rejectionBasis: r.rejectionBasis
            }
        });
    }, [requirements, storeRequirements]);

    const displayList = allReqs
        .filter(r => (statusFilter === 'TODOS' || r.status === statusFilter) &&
            (r.name.toLowerCase().includes(filterText.toLowerCase()) || r.code?.toLowerCase().includes(filterText.toLowerCase())));

    const stats = {
        total: displayList.length,
        cumple: displayList.filter(r => r.status === 'CUMPLE').length,
        enProceso: displayList.filter(r => r.status === 'EN PROCESO').length,
        criticos: displayList.filter(r => r.risk === 'CRÍTICO').length
    };

    const getStatusColor = (status) => {
        if (status === 'CUMPLE') return 'bg-emerald-500 text-white';
        if (status === 'NO CUMPLE') return 'bg-rose-500 text-white';
        if (status === 'EN PROCESO') return 'bg-amber-500 text-white';
        if (status === 'PENDIENTE EVIDENCIA') return 'bg-purple-500 text-white';
        if (status === 'POR REVISAR') return 'bg-cyan-500 text-white';
        if (status === 'NO APLICA') return 'bg-slate-300 text-slate-700';
        return 'bg-slate-200 text-slate-500';
    }

    // The dataset is no longer empty, but Phase 4 A/B/C is ongoing.
    const isDatasetIncomplete = allReqs.filter(r => r.code?.startsWith('AE')).length === 0;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full relative">

            {isDatasetIncomplete && (
                <div className="bg-cyan-50 border border-cyan-200 p-4 rounded-2xl flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-cyan-600" />
                    <p className="text-xs font-black text-cyan-700 uppercase tracking-widest leading-none mt-0.5">Dataset documental M1 en proceso de carga normativa (Fase 4).</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Requisitos</span>
                    <span className="text-3xl font-black text-slate-800 tracking-tighter">{isDatasetIncomplete ? '--' : stats.total}</span>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col items-center">
                    <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Completados</span>
                    <span className="text-3xl font-black text-emerald-600 tracking-tighter">{isDatasetIncomplete ? '--' : stats.cumple}</span>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col items-center">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">En Proceso</span>
                    <span className="text-3xl font-black text-amber-600 tracking-tighter">{isDatasetIncomplete ? '--' : stats.enProceso}</span>
                </div>
                <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col items-center">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Causales de Desechamiento</span>
                    <span className="text-3xl font-black text-rose-600 tracking-tighter">{isDatasetIncomplete ? '--' : requirements.filter(r => r.rejectionStatus === RejectionStatus.CONFIRMED).length}</span>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white p-4 rounded-3xl border border-slate-100 shadow-sm">
                <div className="flex bg-slate-50 border border-slate-200 rounded-full px-4 py-2 items-center w-full md:w-96">
                    <Search className="w-4 h-4 text-slate-400 shrink-0" />
                    <input type="text" placeholder="Buscar requisitos, códigos..." value={filterText} onChange={e => setFilterText(e.target.value)}
                        className="bg-transparent border-none focus:outline-none text-[11px] font-bold text-slate-600 w-full pl-3" />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    {['TODOS', 'NO INICIADO', 'EN PROCESO', 'PENDIENTE EVIDENCIA', 'CUMPLE', 'NO CUMPLE'].map(f => (
                        <button key={f} onClick={() => setStatusFilter(f)}
                            className={cn("px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest transition-colors",
                                statusFilter === f ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200")}>
                            {f}
                        </button>
                    ))}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden text-left">
                <div className="overflow-x-auto">
                    <table className="w-full text-[10px] font-bold">
                        <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 uppercase tracking-widest">
                            <tr>
                                <th className="p-4 rounded-tl-3xl font-black">Requisito Oficial</th>
                                <th className="p-4 font-black">Atributos (Badges)</th>
                                <th className="p-4 font-black text-center">Estado Documental</th>
                                <th className="p-4 font-black">Evidencia</th>
                                <th className="p-4 font-black">Responsable</th>
                                <th className="p-4 font-black text-right rounded-tr-3xl">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {displayList.map(req => (
                                <tr key={req.id} className="hover:bg-slate-50/50 transition-colors group cursor-pointer">
                                    <td className="p-4 min-w-[250px]">
                                        <div className="flex items-center gap-2 mb-1">
                                            {req.code && <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[8px] font-black tracking-widest">{req.code}</span>}
                                            {req.rejectionStatus === RejectionStatus.CONFIRMED && <span className="text-rose-500 font-bold" title="Causal Expresa Confirmada"><AlertTriangle className="w-3 h-3 inline" /> RIESGO DE DESECHAMIENTO</span>}
                                        </div>
                                        <p className="text-[11px] text-slate-700 leading-tight pr-4">{req.name}</p>
                                        {req.deps.length > 0 && <p className="text-[9px] text-slate-400 mt-1 uppercase tracking-widest">Dependencias: {req.deps.length}</p>}
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-wrap flex-col gap-1.5 items-start">
                                            <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest border", req.required ? "bg-amber-50 text-amber-600 border-amber-200" : "bg-slate-50 text-slate-500 border-slate-200")}>
                                                OBLIGATORIO: {req.required ? 'SÍ' : 'NO'}
                                            </span>

                                            {req.rejectionStatus === RejectionStatus.NOT_CLASSIFIED ? (
                                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest border bg-slate-100 text-slate-500 border-slate-300">
                                                    CLASIFICACIÓN NORMATIVA PENDIENTE
                                                </span>
                                            ) : (
                                                <span className={cn("px-2 py-0.5 rounded-full text-[8px] font-black tracking-widest border", req.rejectionStatus === RejectionStatus.CONFIRMED ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-slate-50 text-slate-500 border-slate-200")}>
                                                    CAUSAL EXPRESA: {req.rejectionStatus === RejectionStatus.CONFIRMED ? 'SÍ' : 'NO APLICA'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex gap-1 justify-center">
                                            <span className={cn("px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest", getStatusColor(req.status))}>
                                                {req.status}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4 text-center">
                                        <div className="flex gap-1 justify-center">
                                            <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-cyan-600 transition-colors" title="Vincular Archivo"><Link className="w-3.5 h-3.5" /></button>
                                            <button className="p-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-cyan-600 transition-colors" title="Subir Evidencia"><FileUp className="w-3.5 h-3.5" /></button>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <span className="text-slate-600 border border-slate-200 px-2 py-1 rounded bg-slate-50 text-[10px] uppercase font-bold">{req.responsible || 'SIN ASIGNAR'}</span>
                                    </td>
                                    <td className="p-4 text-right">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedReq(req.id); setDrawerOpen(true); }}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-slate-200 hover:border-cyan-200 hover:bg-cyan-50 text-slate-500 hover:text-cyan-600 transition-colors text-[9px] font-black uppercase tracking-widest cursor-pointer"
                                            aria-label="Abrir Detalle del Requisito"
                                        >
                                            Abrir Detalle <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <M1RequirementDrawer
                isOpen={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                requirementId={selectedReq}
            />
        </div>
    );
};

export const M1WireframeView = ({ title, desc }) => (
    <div className="flex flex-col p-8 bg-white rounded-3xl border border-slate-100 shadow-sm min-h-[500px] animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex items-center gap-4 mb-8 pb-6 border-b border-slate-100">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                <LayoutGrid className="w-5 h-5 text-slate-400" />
            </div>
            <div>
                <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">{title}</h2>
                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-1">{desc}</p>
            </div>
            <div className="ml-auto">
                <button className="px-5 py-2.5 bg-slate-800 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-700 shadow-md">
                    <Plus className="w-3.5 h-3.5" /> Agregar Elemento
                </button>
            </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl bg-slate-50/50">
            <FileEdit className="w-10 h-10 text-slate-300 mb-4" />
            <p className="text-slate-500 text-sm font-bold">Iniciando estructura de tabla relacional</p>
            <p className="text-slate-400 text-[11px] font-black uppercase tracking-widest mt-2">{title} actualmente vacía.</p>
        </div>
    </div>
);
