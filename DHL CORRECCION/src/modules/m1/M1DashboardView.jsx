import React, { useState, useEffect } from 'react';
import { useM1Store } from './M1Store';
import { M1DeadlineCountdown } from './M1DeadlineCountdown';
import { Activity, Star, Users, Briefcase, Settings2, FileText, FolderOpen, Check, Loader2, X, ChevronRight, HardDrive, RefreshCw, AlertTriangle, FileJson, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { officialConfiguration, rebuildEffectiveTenderRules } from './data/m1ActiveTender';
import { M1AuditEngine } from './services/M1AuditEngine';

const LogViewerModal = ({ isOpen, onClose }) => {
    const [logData, setLogData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const API_BASE = import.meta.env.VITE_M1_API_BASE_URL || 'http://localhost:3010';
        if (isOpen) {
            setIsLoading(true);
            setError(null);
            fetch(`${API_BASE}/api/m1/nexus/log`)
                .then(res => {
                    if (!res.ok) throw new Error('Servidor no respondió (' + res.status + ')');
                    return res.text();
                })
                .then(text => {
                    try {
                        const parsed = JSON.parse(text);
                        setLogData(parsed.log ? JSON.stringify(parsed.log, null, 2) : text);
                    } catch {
                        setLogData(text);
                    }
                })
                .catch(e => setError(e.message))
                .finally(() => setIsLoading(false));
        }
    }, [isOpen]);

    const handleCopy = () => {
        if (logData) {
            navigator.clipboard.writeText(logData);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-4xl bg-[#0B101A] border border-cyan-800/40 rounded-[20px] shadow-2xl overflow-hidden flex flex-col text-slate-200 max-h-[90vh]">
                <div className="p-4 border-b border-cyan-800/30 bg-cyan-950/20 flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                        <FileJson className="w-4 h-4 text-cyan-400" />
                        M1 NEXUS · VISOR DE LOGS (CHANGE_FEED)
                    </h3>
                    <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="p-4 flex-1 overflow-hidden flex flex-col relative bg-slate-950">
                    {isLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="flex-1 flex flex-col items-center justify-center text-rose-500 gap-2">
                            <AlertTriangle className="w-8 h-8" />
                            <p className="text-xs font-bold uppercase tracking-widest">{error}</p>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-y-auto w-full group relative border border-slate-800 rounded bg-[#05080f]">
                            <pre className="p-4 text-[10px] text-emerald-400 font-mono whitespace-pre-wrap">{logData || 'El registro está vacío.'}</pre>
                        </div>
                    )}
                </div>

                <div className="p-4 border-t border-cyan-800/30 bg-cyan-950/10 flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 tracking-widest uppercase font-bold">Mostrando últimos 500 registros</span>
                    <button
                        onClick={handleCopy}
                        disabled={isLoading || !logData}
                        className={cn("px-6 py-2 rounded-lg font-bold text-xs tracking-widest transition-colors flex items-center gap-2",
                            copied ? "bg-emerald-600 text-white" : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/20"
                        )}
                    >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                        {copied ? 'COPIADO' : 'COPIAR LOG'}
                    </button>
                </div>
            </div>
        </div>
    );
};

const M1SyncModal = ({ isOpen, onClose, syncState, result, error, onRetry }) => {
    const [step, setStep] = useState(0);

    useEffect(() => {
        if (syncState === 'SCANNING') {
            const timer = setInterval(() => {
                setStep(s => (s < 6 ? s + 1 : s));
            }, 400);
            return () => clearInterval(timer);
        } else if (syncState === 'STARTING') {
            setStep(0);
        }
    }, [syncState]);

    if (!isOpen) return null;

    const steps = [
        "Conectando con M1 NEXUS",
        "Verificando proyecto local",
        "Escaneando archivos",
        "Comparando hashes",
        "Actualizando espejo",
        "Actualizando CHANGE_FEED",
        "Confirmando sincronización en Drive"
    ];

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-lg bg-[#0B101A] border border-cyan-800/40 rounded-[20px] shadow-2xl overflow-hidden flex flex-col text-slate-200">
                {/* Header */}
                <div className="p-5 border-b border-cyan-800/30 bg-cyan-950/10 flex justify-between items-center">
                    <h3 className="text-xs font-black uppercase text-white tracking-widest flex items-center gap-2">
                        <HardDrive className={cn("w-4 h-4 text-cyan-400", (syncState === 'STARTING' || syncState === 'SCANNING') && "animate-pulse")} />
                        M1 NEXUS · SINCRONIZACIÓN
                    </h3>
                    {(syncState === 'RESULT' || syncState === 'ERROR') && (
                        <button onClick={onClose} className="p-1.5 text-slate-500 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="p-8">
                    {syncState === 'STARTING' && (
                        <div className="flex flex-col items-center justify-center py-10 space-y-4">
                            <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
                            <p className="text-sm font-bold text-slate-400 tracking-widest uppercase">Iniciando sincronización...</p>
                        </div>
                    )}

                    {syncState === 'SCANNING' && (
                        <div className="space-y-4 py-4">
                            {steps.map((s, idx) => {
                                const isDone = step > idx;
                                const isActive = step === idx;
                                const isPending = step < idx;
                                return (
                                    <div key={idx} className={cn("flex items-center gap-3 text-sm font-bold tracking-wide transition-colors duration-300",
                                        isActive ? "text-cyan-400" : isDone ? "text-slate-300" : "text-slate-700"
                                    )}>
                                        <div className="w-5 flex justify-center">
                                            {isDone ? <Check className="w-4 h-4 text-emerald-500" /> :
                                                isActive ? <ChevronRight className="w-4 h-4 animate-pulse" /> :
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />}
                                        </div>
                                        {s}
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {syncState === 'RESULT' && result && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-2">
                            <div className="text-center space-y-1 pb-4 border-b border-slate-800">
                                {result.mirror_integrity === 'FAILED' || result.sync_status === 'DEGRADED' ? (
                                    <>
                                        <h4 className="text-rose-500 font-black text-lg tracking-widest">SINCRONIZACIÓN COMPLETADA CON ERRORES</h4>
                                        <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest">Discrepancias de hash o fallos de copia detectados</p>
                                    </>
                                ) : (
                                    <>
                                        <h4 className="text-emerald-400 font-black text-lg tracking-widest">SINCRONIZACIÓN COMPLETADA</h4>
                                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">TODO ACTUALIZADO SATISFACTORIAMENTE</p>
                                    </>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Archivos revisados</p>
                                    <p className="text-2xl font-black text-white">{result.files_scanned}</p>
                                </div>
                                <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                                    <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Total Modificados</p>
                                    <p className="text-2xl font-black text-white">{result.files_changed}</p>
                                </div>
                                <div className="col-span-2 flex justify-between bg-slate-900/20 p-4 rounded-xl border border-slate-800/50 text-[10px] font-bold">
                                    <span className="text-slate-400">CREADOS: <span className="text-white">{result.created}</span></span>
                                    <span className="text-slate-400">EDITADOS: <span className="text-white">{result.modified}</span></span>
                                    <span className="text-slate-400">BORRADOS: <span className="text-white">{result.deleted}</span></span>
                                    <span className="text-slate-400">RENOMBRADOS: <span className="text-white">{result.renamed}</span></span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {(result.files_changed > 0 && result.changed_files) ? (
                                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 max-h-40 overflow-y-auto">
                                        <p className="text-[9px] text-amber-500 font-black uppercase tracking-widest mb-3">CAMBIOS DETECTADOS</p>
                                        <div className="space-y-2">
                                            {result.changed_files.map((file, i) => (
                                                <div key={i} className="flex justify-between items-center text-xs border-b border-slate-800/50 pb-2 last:border-0 last:pb-0">
                                                    <span className="text-slate-300 font-medium truncate pr-4">{file.file}</span>
                                                    <span className={cn("text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded",
                                                        file.action === 'MODIFIED' ? 'bg-blue-500/10 text-blue-400' :
                                                            file.action === 'CREATED' ? 'bg-emerald-500/10 text-emerald-400' :
                                                                file.action === 'DELETED' ? 'bg-rose-500/10 text-rose-400' : 'bg-slate-500/10 text-slate-400'
                                                    )}>{file.action}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
                                        <Check className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
                                        <p className="text-emerald-400 font-black text-xs tracking-widest">TODO ACTUALIZADO</p>
                                        <p className="text-[10px] text-emerald-500/70 font-bold mt-1">No se detectaron cambios desde la última ronda.</p>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-center text-[9px] pt-4 border-t border-slate-800 font-black tracking-widest text-slate-500">
                                <div>LAST SYNC: {new Date(result.timestamp).toLocaleString().replace(',', ' · ')}</div>
                                <div className="text-cyan-600/50">{result.sync_status}</div>
                            </div>
                        </div>
                    )}

                    {syncState === 'ERROR' && (
                        <div className="space-y-4 text-center py-4 flex flex-col items-center w-full">
                            <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
                            <div className="w-full">
                                <h4 className="text-rose-500 font-black text-lg tracking-widest mb-1">SINCRONIZACIÓN INCOMPLETA</h4>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3">Detalle Técnico del Error:</p>

                                <div className="bg-slate-950 border border-rose-900/30 rounded-xl p-4 text-left w-full h-32 overflow-y-auto mb-2 custom-scrollbar shadow-inner relative group">
                                    <pre className="text-[10px] text-rose-300/80 font-mono whitespace-pre-wrap word-break-all break-all">{error || 'Ocurrió un error inesperado al contactar con el daemon.'}</pre>
                                </div>
                            </div>
                            <div className="flex justify-center gap-3 pt-2 w-full">
                                <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white font-bold text-[10px] tracking-widest transition-colors">CERRAR</button>
                                <button onClick={() => navigator.clipboard.writeText(error || '')} className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 font-bold text-[10px] tracking-widest transition-colors flex items-center gap-1.5 shadow-lg"><Copy className="w-3 h-3" /> COPIAR ERROR</button>
                                <button onClick={onRetry} className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] tracking-widest transition-colors shadow-lg shadow-rose-900/20">REINTENTAR</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export const M1DashboardView = () => {
    const store = useM1Store();
    const [isSyncing, setIsSyncing] = useState(false);

    // Modal states
    const [syncModalOpen, setSyncModalOpen] = useState(false);
    const [syncState, setSyncState] = useState('IDLE'); // STARTING, SCANNING, RESULT, ERROR
    const [syncResult, setSyncResult] = useState(null);
    const [syncError, setSyncError] = useState(null);

    // Log Modal
    const [logModalOpen, setLogModalOpen] = useState(false);

    const { normativeDatasetStatus } = rebuildEffectiveTenderRules();
    const auditRes = M1AuditEngine.runFullAudit(store);

    // Instead of simple counts, use the robust validation results
    const totalDocs = store.requirements.length;
    // Missing docs: we can count from requirements missing any evidence or use warnings length
    const missingDocsCount = store.requirements.filter(r => (!r.evidenceLinks || r.evidenceLinks.length === 0)).length;
    const expPorcentaje = totalDocs > 0 ? Math.floor(100 - (missingDocsCount / totalDocs * 100)) : 0;

    const executeSync = async () => {
        setIsSyncing(true);
        setSyncModalOpen(true);
        setSyncState('STARTING');
        setSyncResult(null);
        setSyncError(null);

        // Let STARTING state render briefly
        await new Promise(r => setTimeout(r, 600));
        setSyncState('SCANNING');

        try {
            const API_BASE = import.meta.env.VITE_M1_API_BASE_URL || 'http://localhost:3010';
            const res = await fetch(`${API_BASE}/api/m1/nexus/sync`, { method: 'POST' });

            // Handle proxy or server errors gracefully
            if (!res.ok) {
                let errorTxt = '';
                try { errorTxt = await res.text(); } catch (e) { }
                throw new Error(`Error de servidor (${res.status}): ${errorTxt.trim().slice(0, 50)}`);
            }

            let data;
            try {
                data = await res.json();
            } catch (jsonErr) {
                throw new Error('El backend no devolvió JSON válido. Revisa si server.js está corriendo y disponible.');
            }

            // Artificial delay to let the nice scanning animation play out (min 3 seconds)
            await new Promise(r => setTimeout(r, 2500));

            if (data.success) {
                setSyncResult(data);
                setSyncState('RESULT');
            } else {
                throw new Error(data.error || 'Fallo interno en el backend');
            }
        } catch (e) {
            console.error('Error in manual sync:', e);
            setSyncError(e.message);
            setSyncState('ERROR');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSync = () => {
        if (!isSyncing) executeSync();
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full relative">
            <M1SyncModal
                isOpen={syncModalOpen}
                onClose={() => setSyncModalOpen(false)}
                syncState={syncState}
                result={syncResult}
                error={syncError}
                onRetry={handleSync}
            />
            <LogViewerModal
                isOpen={logModalOpen}
                onClose={() => setLogModalOpen(false)}
            />
            <div className="absolute -top-12 right-0 flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-amber-500 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                SYSTEM VALIDATION: LIVE PENDING
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-center">
                <div className="flex-1 w-full">
                    <M1DeadlineCountdown />
                </div>
                <div className="flex md:flex-col gap-3 w-full md:w-auto self-stretch md:self-center">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className={cn(
                            "w-full md:w-44 px-4 py-3 rounded-xl flex items-center justify-center gap-2 border transition-all duration-300 shadow-lg",
                            isSyncing
                                ? "bg-cyan-950 border-cyan-800 text-cyan-400"
                                : "bg-cyan-600 hover:bg-cyan-500 border-cyan-500 text-white shadow-cyan-900/20"
                        )}
                    >
                        <Activity className={cn("w-4 h-4", isSyncing && "animate-spin text-cyan-400")} />
                        <span className="text-[10px] font-black uppercase tracking-widest">{isSyncing ? 'Procesando...' : 'M1 SYNC'}</span>
                    </button>

                    <button
                        onClick={() => setLogModalOpen(true)}
                        className="w-full md:w-44 px-4 py-3 rounded-xl flex items-center justify-center gap-2 border transition-all duration-300 bg-purple-900/20 border-purple-800/40 hover:border-purple-500/50 hover:bg-purple-900/40 text-purple-400 hover:text-purple-300"
                    >
                        <FileJson className="w-4 h-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">VER LOG</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><FolderOpen className="w-3 h-3" /> Expediente Integral</span>
                    <div className="mt-4">
                        <p className="text-4xl font-black text-slate-800 tracking-tighter">{expPorcentaje}%</p>
                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">{totalDocs - missingDocsCount} / {totalDocs} Docs</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-2"><Star className="w-3 h-3" /> Estado de Solvencia</span>
                    <div className="mt-4">
                        <p className={cn("text-2xl font-black tracking-tighter uppercase",
                            store.auditStatus === 'NOT_STARTED' ? "text-amber-500" :
                                auditRes.isSolvent ? "text-emerald-500" : "text-rose-500"
                        )}>
                            {store.auditStatus === 'NOT_STARTED' ? "Por Evaluar" : auditRes.solvencyStatus}
                        </p>
                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">
                            {store.auditStatus === 'NOT_STARTED' ?
                                "Min: 37.50 pts" :
                                `Pts: ${auditRes.accreditedTechnicalPoints.toFixed(2)} / 50`}
                        </p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2"><Activity className="w-3 h-3" /> Riesgos Críticos</span>
                    <div className="mt-4">
                        <p className="text-4xl font-black text-rose-500 tracking-tighter">{auditRes.criticalCount}</p>
                        <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">Causales de Desechamiento</p>
                    </div>
                </div>

                <div className={cn("p-6 rounded-2xl border shadow-sm flex flex-col justify-between relative overflow-hidden transition-colors",
                    auditRes.modelValidation.valid ? "bg-slate-900 border-slate-800 text-white" : "bg-rose-900 border-rose-800 text-white"
                )}>
                    {auditRes.modelValidation.valid && <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/20 rounded-full blur-2xl -mx-4 -my-4 pointer-events-none" />}
                    <span className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2"><Settings2 className="w-3 h-3" /> Cobertura Normativa</span>
                    <div className="mt-4 z-10 relative">
                        <p className="text-2xl font-black text-white tracking-tighter uppercase">{auditRes.modelValidation.valid ? "VÁLIDO" : "INCOMPLETO"}</p>
                        <p className={cn("text-[9px] font-bold mt-1 uppercase tracking-widest", auditRes.modelValidation.valid ? "text-cyan-400" : "text-rose-300")}>
                            {auditRes.modelValidation.valid ? `100% Reglas Integradas` : `${auditRes.modelValidation.blockingErrors.length} Errores Bloqueantes`}
                        </p>
                    </div>
                </div>

            </div>

        </div>
    );
};
