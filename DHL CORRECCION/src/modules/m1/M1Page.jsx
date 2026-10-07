import React, { useState } from 'react';
import { useM1Store } from './M1Store';
import { motion } from 'framer-motion';
import { officialScoringCriteria, officialTenderRequirements, officialConfiguration } from './data/m1ActiveTender';
import { M1AuditEngine } from './services/M1AuditEngine';
import { M1ChecklistView, M1WireframeView } from './M1ChecklistView';
import { M1EconomicView } from './M1EconomicView';
import { M1LegalView } from './M1LegalView';
import { M1RiskView } from './M1RiskView';
import { M1ManufacturerView } from './M1ManufacturerView';
import { M1PersonnelView } from './M1PersonnelView';
import { M1ExperienceView } from './M1ExperienceView';
import { M1ClarificationsView } from './M1ClarificationsView';
import { M1ExpedienteView } from './M1ExpedienteView';
import { M1DriveView } from './M1DriveView';
import { M1AuditFinalView } from './M1AuditFinalView';
import { M1DocumentReviewView } from './M1DocumentReviewView';
import { M1AgentConsole } from './M1AgentConsole';
import { M1GlobalAgentSandbox } from './M1GlobalAgentSandbox';
import { M1OpenAIConfigModal } from './M1OpenAIConfigModal';
import { M1DashboardView } from './M1DashboardView';
import { useM1AgentStore } from './M1AgentStore';
import {
    LayoutDashboard, Star, CheckSquare, Users, Briefcase,
    Settings2, DollarSign, Scale, Factory, FileText,
    Users2, AlertTriangle, ShieldCheck, Settings, Server, HardDrive,
    ChevronDown, ChevronRight, FileSearch, Calculator, FolderOpen, Terminal
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Replaced by M1WireframeView inside logic

// --- Trazabilidad Modal Mock ---
const FundamentoModal = ({ req, onClose }) => {
    if (!req) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
            <div className="bg-white rounded-3xl p-8 max-w-lg w-full shadow-2xl relative">
                <button onClick={onClose} className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 font-bold">✕</button>
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 bg-cyan-50 rounded-full flex items-center justify-center">
                        <FileSearch className="w-5 h-5 text-cyan-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest">Fundamento Oficial</h3>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">{req.code}</h2>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-4 items-center">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest w-24">Documento</span>
                        <span className="text-sm font-bold text-slate-700">{req.sourceDocument}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-4 items-center">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest w-24">Sección</span>
                        <span className="text-sm font-bold text-slate-700">{req.sourceSection}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-4 items-center">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest w-24">Página</span>
                        <span className="text-sm font-bold text-slate-700">{req.sourcePage}</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex gap-4">
                        <span className="text-xs font-black text-slate-400 uppercase tracking-widest w-24 shrink-0">Extracto</span>
                        <span className="text-[11px] font-semibold text-slate-600">{req.description}</span>
                    </div>

                    <button onClick={onClose} className="w-full mt-4 bg-cyan-500 text-white rounded-xl py-3 text-[11px] font-black uppercase tracking-widest shadow-md shadow-cyan-500/20 hover:bg-cyan-600 transition-colors">
                        Abrir Fuente Original
                    </button>
                </div>
            </div>
        </div>
    )
}

// --- M1 Score View (Calificación) ---
const M1ScoreView = () => {
    const { auditStatus, scores, requirements, scoringCriteria, updateScoringCriterion, setAuditStatus } = useM1Store();

    const [exPrecioNosotros, setExPrecioNosotros] = useState('');
    const [exPrecioBajo, setExPrecioBajo] = useState('');
    const [expanded, setExpanded] = useState({ I: true, II: true, III: true, IV: true });
    const [selectedReq, setSelectedReq] = useState(null);

    const isNotStarted = auditStatus === 'NOT_STARTED';

    // Merge local state with official template to guarantee integrity
    const reqs = officialScoringCriteria.map(officialReq => {
        const storedReq = scoringCriteria?.find(c => c.id === officialReq.id) || {};
        return { ...officialReq, ...storedReq };
    });

    const toggleCategory = (catId) => {
        setExpanded(prev => ({ ...prev, [catId]: !prev[catId] }));
    };

    // Live Technical Calculation
    const liveAccredited = isNotStarted ? 0 : reqs.reduce((sum, r) => sum + (r.pointStatus === 'SUPPORTED' ? r.maxPoints : 0), 0);

    // Economic Calc
    const econScore = M1AuditEngine.calculateEconomicScore(parseFloat(exPrecioBajo), parseFloat(exPrecioNosotros));
    const isTechnicallySolvent = !isNotStarted && liveAccredited >= officialConfiguration.minimumTechnicalSolvency;
    const totalScoreFinal = isTechnicallySolvent ? (liveAccredited + econScore).toFixed(2) : '--';

    // Grouped Categories
    const categories = [
        { id: 'I', title: 'CALIDAD DE LA OBRA', max: 15 },
        { id: 'II', title: 'CAPACIDAD DEL LICITANTE', max: 17 },
        { id: 'III', title: 'EXPERIENCIA Y ESPECIALIDAD', max: 15 },
        { id: 'IV', title: 'CUMPLIMIENTO DE CONTRATOS', max: 3 }
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {selectedReq && <FundamentoModal req={selectedReq} onClose={() => setSelectedReq(null)} />}

            {/* Global Status Banner */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <h3 className="text-[10px] font-black text-cyan-500 uppercase tracking-widest mb-1">Puntos Acreditados</h3>
                    <div className="text-4xl font-black text-slate-800 tracking-tighter">
                        {isNotStarted ? '--' : liveAccredited.toFixed(2)}<span className="text-lg text-slate-300">/50</span>
                    </div>
                </div>
                <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <h3 className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-1">Puntos Estimados</h3>
                    <div className="text-4xl font-black text-slate-800 tracking-tighter">
                        {isNotStarted ? '--' : scores.estimatedTechnicalPoints.toFixed(2)}
                    </div>
                </div>
                <div className="p-6 rounded-3xl bg-white border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center">
                    <h3 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-1">Puntos en Riesgo</h3>
                    <div className="text-4xl font-black text-slate-800 tracking-tighter">
                        {isNotStarted ? '--' : scores.atRiskTechnicalPoints.toFixed(2)}
                    </div>
                </div>
                <div className={cn("p-6 rounded-3xl border shadow-sm flex flex-col items-center justify-center text-center transition-colors",
                    isNotStarted ? "bg-slate-100 border-slate-200" : (isTechnicallySolvent ? "bg-emerald-50 border-emerald-100" : "bg-rose-50 border-rose-100"))}>
                    <h3 className={cn("text-[10px] font-black uppercase tracking-widest mb-1", isNotStarted ? "text-slate-400" : (isTechnicallySolvent ? "text-emerald-500" : "text-rose-500"))}>Estado Técnico</h3>
                    <div className={cn("text-2xl font-black tracking-tighter uppercase leading-none", isNotStarted ? "text-slate-400" : (isTechnicallySolvent ? "text-emerald-600" : "text-rose-600"))}>
                        {isNotStarted ? 'Por Evaluar' : (isTechnicallySolvent ? 'SOLVENTE' : 'NO SOLVENTE')}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2 bg-white/50 px-2 py-0.5 rounded-full">Umbral: 37.50</div>
                </div>
            </div>

            {/* Solvency Progress Bar */}
            <div className="p-8 rounded-3xl bg-white shadow-sm border border-slate-100 relative overflow-hidden">
                <h3 className="text-[12px] font-black text-slate-500 uppercase tracking-widest mb-4">Medidor de Solvencia Técnica</h3>
                <div className="relative h-6 bg-slate-100 rounded-full overflow-hidden w-full border border-slate-200">
                    {/* Threshold Line at 37.5 = 75% */}
                    <div className="absolute top-0 bottom-0 left-[75%] w-0.5 bg-rose-500 z-10"></div>

                    {/* Fill Bar */}
                    <div className={cn("h-full transition-all duration-1000 rounded-full",
                        isNotStarted ? "bg-slate-300 w-0" : (isTechnicallySolvent ? "bg-emerald-400" : "bg-cyan-400")
                    )} style={{ width: `${isNotStarted ? 0 : Math.min((liveAccredited / 50) * 100, 100)}%` }}></div>
                </div>
                <div className="flex justify-between items-center text-[10px] font-black text-slate-400 mt-2 uppercase tracking-widest relative">
                    <span>0</span>
                    <span className="absolute left-[75%] -translate-x-1/2 text-rose-500">UMBRAL MIN (37.5)</span>
                    <span>50</span>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

                {/* Categories Accordion */}
                <div className="lg:col-span-2 space-y-4">
                    {categories.map(cat => {
                        const catReqs = reqs.filter(r => r.section === cat.id);
                        const catPointsAccredited = isNotStarted ? 0 : catReqs.map(r =>
                            r.pointStatus === 'SUPPORTED' ? r.maxPoints : 0
                        ).reduce((a, b) => a + b, 0);

                        const isCatExpanded = expanded[cat.id];

                        return (
                            <div key={cat.id} className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                                <button
                                    onClick={() => toggleCategory(cat.id)}
                                    className="w-full flex items-center justify-between p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={cn("p-1.5 rounded-full transition-transform", isCatExpanded ? "rotate-90 bg-cyan-100" : "bg-slate-200")}>
                                            <ChevronRight className={cn("w-4 h-4", isCatExpanded ? "text-cyan-600" : "text-slate-400")} />
                                        </div>
                                        <h2 className="text-[13px] font-black text-slate-800 tracking-tight">{cat.id}. {cat.title}</h2>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-lg font-black text-cyan-600">{catPointsAccredited.toFixed(1)}</span>
                                        <span className="text-[10px] font-black text-slate-300 ml-1">/ {cat.max}</span>
                                    </div>
                                </button>

                                {isCatExpanded && (
                                    <div className="divide-y divide-slate-100 border-t border-slate-100">
                                        {catReqs.map(req => (
                                            <div key={req.id} className="p-5 flex flex-col md:flex-row md:items-start justify-between gap-4 hover:bg-slate-50/50 transition-colors">
                                                <div className="flex gap-4 items-start flex-1 w-full">
                                                    {/* Custom Checkbox */}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            if (auditStatus === 'NOT_STARTED') setAuditStatus('IN_PROGRESS');
                                                            const newStatus = req.pointStatus === 'SUPPORTED' ? 'NOT_EVALUATED' : 'SUPPORTED';
                                                            updateScoringCriterion(req.id, { pointStatus: newStatus });
                                                        }}
                                                        className={cn("mt-1 shrink-0 w-6 h-6 rounded-md border flex items-center justify-center transition-all bg-white",
                                                            req.pointStatus === 'SUPPORTED' ? "bg-cyan-500 border-cyan-500 text-white" : "border-slate-300 hover:border-cyan-400"
                                                        )}
                                                    >
                                                        {req.pointStatus === 'SUPPORTED' ? <CheckSquare className="w-4 h-4" /> : null}
                                                    </button>
                                                    <div className="flex-1">
                                                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 mb-2">
                                                            <span className="text-[10px] font-black px-2 py-0.5 bg-slate-800 text-white rounded-full tracking-widest w-max">{req.id}</span>
                                                            <h4 className="text-xs font-black text-slate-700 tracking-wide uppercase">{req.title}</h4>
                                                        </div>
                                                        <p className="text-[11px] font-bold text-slate-500 leading-relaxed max-w-2xl whitespace-pre-wrap">{req.description}</p>
                                                        {/* Document Requirements Tags */}
                                                        {req.evidenceRequired && req.evidenceRequired.length > 0 && (
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                <span className="text-[9px] font-black text-slate-400 uppercase flex items-center h-full mr-1">Debes presentar:</span>
                                                                {req.evidenceRequired.map(ev => (
                                                                    <span key={ev} className="text-[9px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-100 rounded px-2 py-0.5 flex items-center gap-1">
                                                                        <FileText className="w-3 h-3" /> {ev}
                                                                    </span>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4 shrink-0 mt-2 md:mt-0 ml-[40px] md:ml-0">
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setSelectedReq(req); }}
                                                        className="px-4 py-2 bg-purple-50 text-purple-600 border border-purple-100 rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-purple-100 transition-colors mix-blend-multiply"
                                                    >
                                                        Fundamento
                                                    </button>
                                                    <div className="text-right w-16">
                                                        <span className={cn("text-lg font-black", req.pointStatus === 'SUPPORTED' ? "text-cyan-600" : "text-slate-400")}>
                                                            {isNotStarted ? 0 : (req.pointStatus === 'SUPPORTED' ? req.maxPoints : 0)}
                                                        </span>
                                                        <span className="text-[10px] font-bold text-slate-300 ml-1">/ {req.maxPoints}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {/* Economic Simulator */}
                <div className="p-8 rounded-3xl bg-[#0f172a] shadow-xl border border-slate-800 flex flex-col self-start sticky top-24">
                    <h3 className="text-[12px] font-black text-emerald-400 uppercase tracking-widest mb-6 flex items-center gap-2"><Calculator className="w-4 h-4" /> Simulador Económico</h3>

                    <div className="space-y-4 mb-8">
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Precio Propuesta Solvente Más Baja (Sin IVA)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3.5 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    value={exPrecioBajo}
                                    onChange={e => setExPrecioBajo(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-8 pr-4 text-sm font-black text-white focus:outline-none focus:border-emerald-500 placeholder:text-slate-600"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nuestra Propuesta (Sin IVA)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3.5 text-slate-400 font-bold">$</span>
                                <input
                                    type="number"
                                    value={exPrecioNosotros}
                                    onChange={e => setExPrecioNosotros(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-slate-900 border border-slate-700 rounded-xl py-3 pl-8 pr-4 text-sm font-black text-white focus:outline-none focus:border-cyan-500 placeholder:text-slate-600"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700/50 mb-6">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 text-center">Fórmula: 50 × (PSPMB / PPj)</p>
                        <div className="text-center">
                            <span className="text-4xl font-black text-emerald-400">{econScore > 0 ? econScore.toFixed(2) : '--'}</span>
                            <span className="text-sm font-bold text-slate-500 ml-1 tracking-widest uppercase">Puntos</span>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-slate-800 text-center">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Puntaje Total Proyectado</h3>

                        {isNotStarted ? (
                            <p className="text-xs font-bold text-slate-400">Auditoría no iniciada.</p>
                        ) : (
                            isTechnicallySolvent ? (
                                <div className="text-3xl font-black text-white">
                                    {totalScoreFinal} <span className="text-sm text-slate-500">/ 100</span>
                                </div>
                            ) : (
                                <div className="px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-[10px] font-black uppercase tracking-widest">
                                    Propuesta Técnicamente<br />NO Solvente
                                </div>
                            )
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};


// --- M1 Settings ---
const M1Settings = () => {
    const { settings, updateSettings } = useM1Store();

    const toggleAutoEval = () => updateSettings({ autoEval: !settings.autoEval });
    const toggleAutoSync = () => updateSettings({ autoSync: !settings.autoSync });

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">

            <div className="p-8 rounded-3xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col relative overflow-hidden">
                <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-widest mb-6 flex items-center gap-2"><Server className="w-4 h-4" /> API Connection</h3>

                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Estado</span>
                        <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            settings.apiStatus === 'connected' ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
                        )}>
                            {settings.apiStatus === 'connected' ? 'Conectada' : 'Sin Configurar'}
                        </span>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Autoevaluación</label>
                        <button onClick={toggleAutoEval} className={cn(
                            "w-full p-4 rounded-2xl border flex items-center justify-between transition-all",
                            settings.autoEval ? "bg-cyan-50 border-cyan-200" : "bg-white border-slate-200"
                        )}>
                            <span className="text-[11px] font-black text-slate-600 uppercase">Activar Evaluador en Tiempo Real</span>
                            <div className={cn("w-10 h-5 rounded-full flex items-center px-1 transition-all", settings.autoEval ? "bg-cyan-500 justify-end" : "bg-slate-300 justify-start")}>
                                <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>

            <div className="p-8 rounded-3xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col relative overflow-hidden">
                <h3 className="text-[12px] font-black text-purple-500 uppercase tracking-widest mb-6 flex items-center gap-2"><HardDrive className="w-4 h-4" /> Google Drive</h3>

                <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Estado</span>
                        <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                            settings.driveStatus === 'connected' ? "bg-emerald-100 text-emerald-600" : "bg-slate-200 text-slate-500"
                        )}>
                            {settings.driveStatus === 'connected' ? 'Conectado' : 'Sin Configurar'}
                        </span>
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Directorio Base (Folder ID)</label>
                        <input
                            type="text"
                            readOnly
                            value={settings.driveFolderId || "ID_NO_CONFIGURADO"}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-500 focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Sincronización Automática</label>
                        <button onClick={toggleAutoSync} className={cn(
                            "w-full p-4 rounded-2xl border flex items-center justify-between transition-all",
                            settings.autoSync ? "bg-purple-50 border-purple-200" : "bg-white border-slate-200"
                        )}>
                            <span className="text-[11px] font-black text-slate-600 uppercase">Buscar Cambios Automáticamente</span>
                            <div className={cn("w-10 h-5 rounded-full flex items-center px-1 transition-all", settings.autoSync ? "bg-purple-500 justify-end" : "bg-slate-300 justify-start")}>
                                <div className="w-3.5 h-3.5 bg-white rounded-full shadow-sm" />
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- M1 Dashboard ---
const M1Dashboard = () => {
    const { auditStatus, settings, scores } = useM1Store();
    const isNotStarted = auditStatus === 'NOT_STARTED';

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">

                {/* Avance Documental */}
                <div className="p-6 rounded-3xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-[12px] font-black text-cyan-500 uppercase tracking-widest">Avance Documental</h3>
                        <span className="text-4xl font-black text-cyan-50 absolute -right-2 top-0 pointer-events-none transition-all duration-300 group-hover:text-cyan-100">01</span>
                    </div>
                    <p className="text-slate-500 text-[11px] font-bold leading-relaxed mb-6 mt-1 pr-4">
                        Porcentaje total de requisitos cubiertos en la propuesta técnica y legal.
                    </p>
                    <div className="mt-auto flex items-end gap-1">
                        <span className={cn("font-black tracking-tighter", isNotStarted ? "text-4xl text-slate-800" : "text-5xl text-slate-800")}>
                            {isNotStarted ? '0' : '0'}
                        </span>
                        <span className="text-xl font-bold text-slate-400 mb-1.5">%</span>
                    </div>
                </div>

                {/* Puntos Técnicos */}
                <div className="p-6 rounded-3xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-[12px] font-black text-purple-500 uppercase tracking-widest">Puntos Técnicos</h3>
                        <span className="text-4xl font-black text-purple-50 absolute -right-2 top-0 pointer-events-none transition-all duration-300 group-hover:text-purple-100">02</span>
                    </div>
                    <p className="text-slate-500 text-[11px] font-bold leading-relaxed mb-6 mt-1 pr-4">
                        Puntaje técnico acreditado evaluado según rúbrica actual.
                    </p>
                    <div className="mt-auto flex items-end gap-1">
                        <span className={cn("font-black tracking-tighter", isNotStarted ? "text-3xl text-slate-400" : "text-5xl text-slate-800")}>
                            {isNotStarted ? '-- / --' : scores.accreditedTechnicalPoints}
                        </span>
                        {!isNotStarted && <span className="text-xl font-bold text-slate-400 mb-1.5">/ 50</span>}
                    </div>
                </div>

                {/* Umbral Técnico */}
                <div className="p-6 rounded-3xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-[12px] font-black text-amber-500 uppercase tracking-widest">Umbral Técnico</h3>
                        <span className="text-4xl font-black text-amber-50 absolute -right-2 top-0 pointer-events-none transition-all duration-300 group-hover:text-amber-100">03</span>
                    </div>
                    <p className="text-slate-500 text-[11px] font-bold leading-relaxed mb-6 mt-1 pr-4">
                        Estado de solvencia técnica requerida para no desechamiento.
                    </p>
                    <div className="mt-auto">
                        <span className={cn("font-black tracking-tight uppercase", isNotStarted ? "text-xl text-slate-400" : "text-2xl text-amber-500")}>
                            {isNotStarted ? 'Por Evaluar' : 'Pendiente'}
                        </span>
                    </div>
                </div>

                {/* Pendientes Críticos */}
                <div className="p-6 rounded-3xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col relative overflow-hidden group hover:scale-[1.02] transition-transform duration-300">
                    <div className="flex justify-between items-start mb-2">
                        <h3 className="text-[12px] font-black text-rose-500 uppercase tracking-widest">Alerta de Causales</h3>
                        <span className="text-4xl font-black text-rose-50 absolute -right-2 top-0 pointer-events-none transition-all duration-300 group-hover:text-rose-100">04</span>
                    </div>
                    <p className="text-slate-500 text-[11px] font-bold leading-relaxed mb-6 mt-1 pr-4">
                        Número de causales de desechamiento abiertas y sin solventar.
                    </p>
                    <div className="mt-auto flex items-end gap-1">
                        <span className={cn("font-black tracking-tight", isNotStarted ? "text-xl text-slate-400 uppercase" : "text-5xl text-rose-500")}>
                            {isNotStarted ? 'Por Evaluar' : '0'}
                        </span>
                        {!isNotStarted && <span className="text-[10px] font-black text-rose-300 uppercase tracking-widest mb-2 ml-1">Causales</span>}
                    </div>
                </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Dark style card derived from the image's bottom section */}
                <div className="p-8 rounded-3xl bg-[#0f172a] shadow-xl relative overflow-hidden flex flex-col">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

                    <h3 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-2 z-10 relative">Sincronización</h3>
                    <h2 className="text-2xl font-black text-white mb-6 z-10 relative">Estado de Conexión</h2>

                    <div className="space-y-4 z-10 relative mt-auto">
                        <div className="flex justify-between items-center p-4 rounded-xl bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                <Server className="w-3.5 h-3.5 text-cyan-400" /> API: {settings.apiStatus === 'connected' ? 'Conectada' : 'Sin Configurar'}
                            </span>
                            <span className="text-[10px] font-black text-white bg-slate-700 px-3 py-1.5 rounded-full uppercase tracking-widest">Nunca</span>
                        </div>
                        <div className="flex justify-between items-center p-4 rounded-xl bg-slate-800/80 border border-slate-700/50 backdrop-blur-sm">
                            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                                <HardDrive className="w-3.5 h-3.5 text-purple-400" /> Drive: {settings.driveStatus === 'connected' ? 'Conectado' : 'Sin Configurar'}
                            </span>
                            <span className="text-[10px] font-black text-white bg-slate-700 px-3 py-1.5 rounded-full uppercase tracking-widest">Nunca</span>
                        </div>
                    </div>
                </div>

                {/* Clear/Light style secondary card */}
                <div className="p-8 rounded-3xl bg-white shadow-[0_4px_20px_rgba(0,0,0,0.02)] border border-slate-100 flex flex-col justify-center relative">
                    <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 pb-4">Resumen de Inconsistencias</h3>
                    <div className="flex flex-col items-center justify-center py-6 text-center">

                        {isNotStarted ? (
                            <>
                                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mb-6 border-4 border-slate-100/50">
                                    <AlertTriangle className="w-10 h-10 text-slate-300" />
                                </div>
                                <p className="text-slate-500 text-sm font-bold mt-2">Aún no se ha ejecutado la auditoría M1.</p>
                            </>
                        ) : (
                            <>
                                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6 border-4 border-emerald-100/50">
                                    <ShieldCheck className="w-10 h-10 text-emerald-500" />
                                </div>
                                <p className="text-slate-800 text-lg font-black uppercase tracking-tight">Todo en orden</p>
                                <p className="text-slate-500 text-xs font-bold mt-2">No se han detectado riesgos abiertos.</p>
                            </>
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
};


// --- PANDORA M1 Main Layout ---
const internalMenu = [
    { id: 'Agent Console', icon: Terminal, special: true },
    { id: 'Dashboard', icon: LayoutDashboard },
    { id: 'Calificación', icon: Star },
    { id: 'Checklist', icon: CheckSquare },
    { id: 'Personal', icon: Users },
    { id: 'Experiencia', icon: Briefcase },
    { id: 'Técnico', icon: Settings2 },
    { id: 'Económico', icon: DollarSign },
    { id: 'Legal', icon: Scale },
    { id: 'Fabricantes', icon: Factory },
    { id: 'Expediente', icon: FolderOpen },
    { id: 'Drive', icon: HardDrive },
    { id: 'Documentos', icon: FileText },
    { id: 'Revisión Docs', icon: FileSearch },
    { id: 'Juntas', icon: Users2 },
    { id: 'Riesgos', icon: AlertTriangle },
    { id: 'Auditoría final', icon: ShieldCheck },
    { id: 'Configuración', icon: Settings }
];

const M1Page = () => {
    const { activeView, setActiveView, requirements, hydrateNormativeModel } = useM1Store();
    const agent = useM1AgentStore();

    React.useEffect(() => {
        if (requirements.length === 0) {
            hydrateNormativeModel();
        }
    }, [requirements.length, hydrateNormativeModel]);

    const renderActiveView = () => {
        switch (activeView) {
            case 'Agent Console':
                return <M1AgentConsole />;
            case 'Dashboard':
                return <M1DashboardView />;
            case 'Configuración':
                return <M1Settings />;
            case 'Calificación':
                return <M1ScoreView />;
            case 'Checklist':
                return <M1ChecklistView requirements={officialTenderRequirements} />;
            case 'Personal':
                return <M1PersonnelView />;
            case 'Experiencia':
                return <M1ExperienceView />;
            case 'Técnico':
                return <M1WireframeView title={activeView} desc="Fichas técnicas y alcances" />;
            case 'Económico':
                return <M1EconomicView />;
            case 'Legal':
                return <M1LegalView />;
            case 'Fabricantes':
                return <M1ManufacturerView />;
            case 'Expediente':
                return <M1ExpedienteView />;
            case 'Drive':
            case 'Documentos':
                return <M1DriveView />;
            case 'Revisión Docs':
                return <M1DocumentReviewView />;
            case 'Juntas':
                return <M1ClarificationsView />;
            case 'Riesgos':
                return <M1RiskView />;
            case 'Auditoría final':
                return <M1AuditFinalView />;
            default:
                return <M1WireframeView title={activeView} desc="Vista modular en construcción" />;
        }
    };

    return (
        <div className="min-h-[calc(100vh-64px)] bg-[#f8fafc] flex flex-col md:flex-row font-sans">

            {/* Sidebar Menú Interno M1 - Light Theme */}
            <div className="w-full md:w-[280px] border-b md:border-b-0 md:border-r border-slate-200 bg-white shrink-0 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10">
                <div className="p-6 flex-1 overflow-y-auto">

                    <div className="mb-8 p-5 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col">
                        <h1 className="text-2xl font-black text-slate-800 tracking-tighter uppercase flex items-center gap-1.5">
                            <span className="text-cyan-500">M1</span> AUDITOR
                        </h1>
                        <p className="text-[10px] text-cyan-600 uppercase tracking-widest font-bold mt-1">Licitación Miramar 1</p>
                    </div>

                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 px-2">Módulos Interfaz</h4>

                    <nav className="space-y-1.5 relative">

                        {/* Active Pill Indicator absolute positioned */}
                        <div className="absolute left-0 w-1 bg-cyan-500 rounded-r-full transition-all duration-300 ease-out"
                            style={{
                                height: '42px',
                                top: `${internalMenu.findIndex(i => i.id === activeView) * 48}px`
                            }}
                        />

                        {internalMenu.map((item) => {
                            const Icon = item.icon;
                            const isActive = activeView === item.id;

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setActiveView(item.id)}
                                    className={cn(
                                        "w-full flex items-center justify-between px-5 py-3 rounded-xl transition-all duration-300 h-[42px] group",
                                        isActive
                                            ? "bg-slate-800 text-white shadow-md shadow-slate-800/10"
                                            : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                                    )}
                                >
                                    <div className="flex items-center gap-3">
                                        <Icon className={cn("w-[18px] h-[18px]", isActive ? "text-cyan-400" : "text-slate-400 group-hover:text-cyan-500")} />
                                        <span className="text-[11px] font-black uppercase tracking-wider mt-[1px]">{item.id}</span>
                                    </div>
                                    {/* Optional right arrow indicator on active */}
                                    {isActive && (
                                        <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                                    )}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 p-6 md:p-10 overflow-y-auto w-full max-w-[1600px] mx-auto">

                {/* Top Header Bar styled like PANDORA LOCAL UI */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6 bg-white p-5 px-8 rounded-[24px] shadow-[0_4px_24px_rgba(0,0,0,0.03)] border border-slate-100/80">
                    <div>
                        <div className="flex items-center gap-4 mb-2">
                            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">
                                {activeView}
                            </h2>
                            {/* Badge */}
                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-100">
                                <div className="w-1.5 h-1.5 rounded-full bg-purple-500 animate-pulse" />
                                <span className="text-[9px] font-black uppercase tracking-widest text-purple-600">
                                    V. Estable
                                </span>
                            </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            <span>Cliente: <span className="text-cyan-600">Miramar Fase 1</span></span>
                            <span className="h-3 w-px bg-slate-200"></span>
                            <span>{agent.aiStatus.configured ? 'PANDORA ONLINE · IA ONLINE' : 'DRIVE ONLINE · IA OFFLINE'}</span>
                        </div>
                    </div>

                    {/* Action Buttons mapped from the image style */}
                    <div className="flex flex-wrap items-center gap-3">
                        <button className="flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-wider bg-white border border-slate-200 text-slate-600 hover:text-cyan-600 hover:border-cyan-200 hover:bg-cyan-50 transition-all shadow-sm">
                            <FileText className="w-4 h-4" />
                            Sincro Drive
                        </button>
                        <button
                            onClick={() => setActiveView('Drive')}
                            className="flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500 text-white hover:bg-orange-600 transition-all shadow-[0_4px_15px_rgba(249,115,22,0.35)] hover:-translate-y-0.5"
                        >
                            <HardDrive className="w-4 h-4" />
                            Conectar Drive
                        </button>
                        <button
                            onClick={() => { }}
                            className="flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500 text-white hover:bg-cyan-600 transition-all shadow-[0_4px_15px_rgba(6,182,212,0.3)] hover:-translate-y-0.5"
                        >
                            <Settings2 className="w-4 h-4" />
                            Ejecutar Auditoría
                        </button>
                    </div>

                </header>

                {/* View Component */}
                <div className="transition-all duration-300 overflow-y-auto">
                    {renderActiveView()}
                </div>

            </div>

            {/* Global Agent Button Overlay */}
            <motion.div
                className="fixed bottom-10 right-10 z-[80] group cursor-grab active:cursor-grabbing"
                drag
                dragMomentum={false}
            >
                <button
                    onClick={agent.toggleSandbox}
                    className={cn(
                        "flex items-center gap-3 px-6 py-3.5 rounded-full shadow-xl transition-all duration-300 hover:shadow-2xl border backdrop-blur-xl relative overflow-hidden",
                        agent.aiStatus.configured ? "bg-[#0F172A]/90 border-[#00BCD4]/40 hover:border-[#00BCD4] shadow-[#00BCD4]/10" : "bg-slate-900/90 border-rose-900/50"
                    )}>
                    <div className={cn("w-2 h-2 rounded-full", agent.aiStatus.configured ? "bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse" : "bg-rose-500")} />
                    <Terminal className={cn("w-4 h-4", agent.aiStatus.configured ? "text-[#00BCD4]" : "text-rose-500")} />
                    <span className={cn("text-[10px] uppercase font-black tracking-widest transition-colors", agent.aiStatus.configured ? "text-[#00BCD4] group-hover:text-cyan-300" : "text-rose-500")}>
                        {agent.aiStatus.configured ? 'IA ONLINE' : 'IA OFFLINE'}
                    </span>
                </button>
            </motion.div>

            <M1GlobalAgentSandbox />
            <M1OpenAIConfigModal />

        </div>
    );
};

export default M1Page;
