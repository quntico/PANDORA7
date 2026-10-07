import React, { useState, useEffect, useRef } from 'react';
import { useM1AgentStore } from './M1AgentStore';
import { useM1Store } from './M1Store';
import { rebuildEffectiveTenderRules } from './data/m1ActiveTender';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip as CTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import {
    Terminal, Send, Paperclip, ChevronDown, Activity, FastForward, CheckCircle2,
    XCircle, Database, FileText, Briefcase, Zap, Plus, Cloud, Image as ImageIcon,
    Target, AlertTriangle, Info, Play, Box
} from 'lucide-react';
import { cn } from '@/lib/utils';

export const M1AgentConsole = () => {
    const agent = useM1AgentStore();
    const store = useM1Store();

    // Init session if not exists
    useEffect(() => {
        if (!agent.currentSessionId) {
            agent.initSession();
        }
    }, [agent]);

    const activeSession = agent.sessions.find(s => s.id === agent.currentSessionId) || { history: [] };

    const [input, setInput] = useState('');
    const [pastedImage, setPastedImage] = useState(null);
    const messagesEndRef = useRef(null);

    const { normativeDatasetStatus, clarificationCoverageStatus } = rebuildEffectiveTenderRules();

    const driveStatus = store.settings?.driveStatus || 'DISCONNECTED';
    const driveFolder = store.settings?.driveFolderId;
    const missingDocsCount = store.requirements.filter(r => (r.evidenceLinks || []).length === 0).length;
    const isReady = normativeDatasetStatus === 'CURRENT' && driveStatus === 'CONNECTED';

    const modes = [
        'CHAT', 'AUDITAR', 'REVISAR DOCUMENTO', 'CALCULAR',
        'COMPARAR', 'BUSCAR EN DRIVE', 'EXTRAER DATOS', 'GENERAR REPORTE'
    ];

    const contexts = [
        'Todo M1', 'Técnico', 'Económico', 'Legal', 'Personal', 'Experiencia', 'OEM', 'Riesgos', 'Expediente'
    ];

    const chipPrompts = [
        "¿Qué falta para 37.5?",
        "Compara AE1A vs AT9A",
        "Revisa AT2",
        "Busca contratos de experiencia",
        "¿Qué riesgos críticos tenemos?",
        "Resume Primera Junta"
    ];

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [activeSession.history, agent.timelineSteps]);

    const handlePaste = (e) => {
        const items = e.clipboardData?.items;
        if (!items) return;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => setPastedImage(event.target.result);
                reader.readAsDataURL(blob);
            }
        }
    };

    const API_BASE = import.meta.env.VITE_M1_API_BASE_URL || 'http://localhost:3001';

    const handleSend = async () => {
        if (!input.trim() && !pastedImage) return;

        const userMsg = {
            id: Date.now(),
            role: 'user',
            text: input,
            image: pastedImage,
            timestamp: new Date().toISOString()
        };

        agent.addMessage(userMsg);
        agent.incrementKpi('processedRequests');
        const userQuery = input;
        setInput('');
        setPastedImage(null);
        agent.setProcessing(true);
        agent.clearTimeline();

        try {
            const res = await fetch(`${API_BASE}/api/m1/agent/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userQuery,
                    conversationId: activeSession.id,
                    mode: agent.mode,
                    contextScope: agent.contextContext
                })
            });

            const reader = res.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const lines = decoder.decode(value, { stream: true }).split('\n').filter(Boolean);
                for (const line of lines) {
                    try {
                        const payload = JSON.parse(line);
                        if (payload.type === 'timeline') {
                            agent.addTimelineStep(payload.data);
                        } else if (payload.type === 'result') {
                            agent.incrementKpi('sourcedAnswers');
                            agent.addMessage({
                                id: Date.now() + Math.random(),
                                role: 'system',
                                ...payload.data
                            });
                        } else if (payload.type === 'error') {
                            agent.addTimelineStep({ status: 'FAILED', text: payload.data });
                            agent.incrementKpi('activeBlocks');
                            agent.addMessage({
                                id: Date.now() + Math.random(),
                                role: 'system',
                                summary: "Fallback o Bloqueo",
                                lack: [payload.data]
                            });
                        }
                    } catch (jsonErr) {
                        console.error("Agent Parse Line Error:", jsonErr, line);
                    }
                }
            }
        } catch (e) {
            console.error("Agent Network Error:", e);
            agent.addTimelineStep({ status: 'FAILED', text: "Error de red: " + e.message });
            agent.incrementKpi('activeBlocks');
        } finally {
            agent.setProcessing(false);
        }
    };

    return (
        <div className="flex w-full h-[65vh] min-h-[600px] bg-[#0B101A] rounded-[24px] border border-cyan-500/20 shadow-[0_4px_40px_rgba(6,182,212,0.05)] overflow-hidden animate-in zoom-in-95 duration-500" onPaste={handlePaste}>

            {/* Sidebar Left: State & KPIs */}
            <div className="w-[280px] border-r border-cyan-500/10 bg-[#070b12] flex flex-col shrink-0 hidden md:flex z-10">
                <div className="p-6 border-b border-cyan-500/10 bg-cyan-950/20">
                    <h2 className="text-white font-black tracking-tighter text-lg flex items-center gap-2">
                        <Terminal className="w-5 h-5 text-cyan-400" /> PANDORA AGENT
                    </h2>
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Global Copilot</p>
                        <p className="text-[8px] font-black text-slate-400 bg-slate-900 px-2 py-1 rounded-sm uppercase">PANDORA M1</p>
                    </div>
                </div>

                <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                    {/* Status Global */}
                    <div>
                        <h3 className="text-[9px] font-black uppercase text-slate-500 mb-2 tracking-widest">Estado de Sistema</h3>
                        <div className="space-y-1.5">
                            <div className="flex justify-between items-center bg-slate-900 border border-slate-800 p-2 rounded">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Cloud className="w-3 h-3" /> Drive</span>
                                <span className={cn("text-[9px] font-black", driveStatus === 'CONNECTED' ? "text-emerald-400" : "text-slate-500")}>{driveStatus}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-900/50 border border-slate-800 p-3 rounded-lg">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Box className="w-3 h-3 text-emerald-500" /> Normativa</span>
                                <span className={cn("text-[9px] font-black uppercase", normativeDatasetStatus === 'CURRENT' ? "text-emerald-400" : "text-amber-400")}>{normativeDatasetStatus}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-900/50 border border-slate-800 p-3 rounded-lg">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><FileText className="w-3 h-3 text-cyan-500" /> Juntas Ac.</span>
                                <span className={cn("text-[9px] font-black uppercase text-slate-500")}>{clarificationCoverageStatus}</span>
                            </div>
                            <div className="flex justify-between items-center bg-slate-900/50 border border-slate-800 p-3 rounded-lg">
                                <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5"><Target className="w-3 h-3 text-rose-500" /> Riesgos</span>
                                <span className="text-[10px] font-black text-rose-500">{missingDocsCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* KPIs */}
                    <div className="pt-4 border-t border-slate-800">
                        <h3 className="text-[10px] font-black uppercase text-slate-500 mb-3 tracking-widest">Métricas Neurales</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl text-center shadow-inner">
                                <p className="text-white font-black text-lg">{agent.kpis.processedRequests}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Solicitudes</p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-2 rounded text-center">
                                <p className="text-white font-black text-lg">{agent.kpis.sourcedAnswers}</p>
                                <p className="text-[8px] font-bold text-slate-400 uppercase">Verificadas</p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-2 rounded text-center">
                                <p className="text-white font-black text-lg">{agent.kpis.activeBlocks}</p>
                                <p className="text-[8px] font-bold text-rose-500 uppercase">Bloqueos</p>
                            </div>
                            <div className="bg-slate-900 border border-slate-800 p-2 rounded text-center items-center flex justify-center">
                                <span className="text-[8px] font-black text-cyan-600 bg-cyan-950 px-1 py-0.5 rounded leading-tight">Backend AI<br />Ready</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Center Area: Chat Activity */}
            <div className="flex-1 flex flex-col bg-[#0B101A] relative shadow-2xl z-20">
                {/* Mode Selector Header */}
                <div className="h-16 border-b border-cyan-800/30 flex items-center px-8 justify-between bg-[#0B101A]/80 backdrop-blur-md z-10 shrink-0 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-cyan-600 font-black text-xs uppercase tracking-widest bg-cyan-950 px-2 py-1 rounded-md">OP:</span>
                            <select value={agent.mode} onChange={e => agent.setMode(e.target.value)} className="bg-transparent text-cyan-400 text-sm font-black uppercase tracking-widest cursor-pointer focus:outline-none">
                                {modes.map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                        <div className="w-px h-6 bg-slate-800 mx-2" />
                        <div className="flex items-center gap-2">
                            <span className="text-slate-500 font-black text-xs uppercase tracking-widest">SCOPE:</span>
                            <select value={agent.contextContext} onChange={e => agent.setContext(e.target.value)} className="bg-slate-900 border border-slate-800 text-slate-300 text-xs font-bold uppercase tracking-widest p-1.5 rounded-lg focus:outline-none focus:border-slate-600 cursor-pointer">
                                {contexts.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Chat History */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activeSession.history.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 opacity-50">
                            <Terminal className="w-16 h-16 mb-4 text-cyan-900" />
                            <p className="font-black uppercase tracking-widest text-[10px]">Listo para órdenes operativas</p>
                        </div>
                    )}

                    {activeSession.history.map(msg => (
                        <div key={msg.id} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                            <div className={cn(
                                "max-w-[75%] rounded-2xl p-5 shadow-2xl relative",
                                msg.role === 'user' ? "bg-cyan-950 border border-cyan-900/50 text-cyan-50" : "bg-slate-900 border border-slate-800 text-slate-200"
                            )}>
                                {msg.role === 'system' && (
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl -mx-4 -my-4 pointer-events-none" />
                                )}

                                {msg.image && (
                                    <img src={msg.image} alt="pasted context" className="max-w-xs rounded-xl mb-3 border border-slate-700 shadow-md" />
                                )}

                                {msg.text && <p className="text-sm font-medium whitespace-pre-wrap">{msg.text}</p>}

                                {msg.role === 'system' && (
                                    <div className="space-y-4">
                                        {msg.summary && (
                                            <p className="text-[13px] font-semibold text-white leading-relaxed bg-slate-800/50 p-3 rounded-lg border border-slate-800/80 inline-flex items-center gap-2">
                                                <Zap className="w-4 h-4 text-amber-500" /> {msg.summary}
                                            </p>
                                        )}
                                        {msg.rawText && <p className="text-[11px] text-slate-400 font-medium leading-relaxed">{msg.rawText}</p>}

                                        {msg.action === 'RENDER_CHART' && msg.payload && (
                                            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mt-4 h-[300px] w-full relative">
                                                <h4 className="text-[10px] font-black uppercase text-cyan-400 tracking-widest absolute top-3 left-4">{msg.payload.title}</h4>
                                                <div className="pt-8 h-full w-full">
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        {msg.payload.type === 'BAR' ? (
                                                            <BarChart data={msg.payload.labels.map((l, i) => ({ name: l, value: msg.payload.datasets[0].data[i] }))}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} />
                                                                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                                                                <CTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '10px' }} />
                                                                <Bar dataKey="value" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                                                            </BarChart>
                                                        ) : msg.payload.type === 'PIE' ? (
                                                            <PieChart>
                                                                <Pie data={msg.payload.labels.map((l, i) => ({ name: l, value: msg.payload.datasets[0].data[i] }))} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#06b6d4" label>
                                                                    {msg.payload.labels.map((entry, index) => <Cell key={`cell-${index}`} fill={['#06b6d4', '#f59e0b', '#f43f5e', '#8b5cf6'][index % 4]} />)}
                                                                </Pie>
                                                                <CTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '10px' }} />
                                                                <Legend wrapperStyle={{ fontSize: '9px' }} />
                                                            </PieChart>
                                                        ) : (
                                                            <LineChart data={msg.payload.labels.map((l, i) => ({ name: l, value: msg.payload.datasets[0].data[i] }))}>
                                                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                                                                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} />
                                                                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} />
                                                                <CTooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '10px' }} />
                                                                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4, fill: '#3b82f6' }} />
                                                            </LineChart>
                                                        )}
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        )}

                                        {(msg.findings?.length > 0) && (
                                            <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-2">
                                                <h4 className="text-[9px] font-black text-cyan-500 uppercase tracking-widest flex items-center gap-2 mb-2"><CheckCircle2 className="w-3 h-3" /> HALLAZGOS Y CÁLCULOS</h4>
                                                {msg.findings.map((f, i) => (
                                                    <p key={i} className="text-xs text-slate-300 font-mono flex items-start gap-2"><span className="text-cyan-500">▶</span> {f}</p>
                                                ))}
                                            </div>
                                        )}

                                        {(msg.lack?.length > 0) && (
                                            <div className="bg-rose-950/20 border border-rose-900/40 p-4 rounded-xl space-y-2">
                                                <h4 className="text-[9px] font-black text-rose-500 uppercase tracking-widest flex items-center gap-2 mb-2"><AlertTriangle className="w-3 h-3" /> LO QUE FALTA PARA COMPLETAR LA TAREA</h4>
                                                {msg.lack.map((l, i) => (
                                                    <p key={i} className="text-xs text-rose-300/80 font-mono flex items-start gap-2"><span className="text-rose-500">x</span> {l}</p>
                                                ))}
                                            </div>
                                        )}

                                        {msg.action && msg.action !== 'RENDER_CHART' && (
                                            <button className="w-full mt-2 py-3 bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-800/50 text-cyan-400 rounded-xl text-[10px] font-black uppercase tracking-widest flex justify-center items-center gap-2 transition-all">
                                                <Play className="w-3 h-3" /> SIGUIENTE ACCIÓN: {msg.action}
                                            </button>
                                        )}

                                        {(msg.sources?.length > 0) && (
                                            <div className="mt-4 flex flex-wrap gap-2 text-[9px] font-mono text-cyan-600">
                                                Fuentes utilizadas:
                                                {msg.sources.map((s, i) => (
                                                    <a key={i} href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-cyan-400 underline decoration-cyan-900">
                                                        <FileText className="w-3 h-3" /> {s.name}
                                                    </a>
                                                ))}
                                            </div>
                                        )}

                                        {msg.readyForAiIntegration && (
                                            <div className="flex items-center gap-1 mt-4 pt-4 border-t border-slate-800 opacity-60">
                                                <Database className="w-3 h-3 text-cyan-600 gap-1" />
                                                <span className="text-[8px] font-mono text-cyan-600 uppercase">Backend listo para Ingesta IA Conver. (Phase 6+)</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-8 bg-[#0B101A] border-t border-cyan-900/30 shrink-0">
                    {chipPrompts.length > 0 && activeSession.history.length === 0 && (
                        <div className="flex flex-wrap gap-2 mb-4 justify-center">
                            {chipPrompts.map(p => (
                                <button key={p} onClick={() => setInput(p)} className="px-4 py-2 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-black text-slate-400 hover:text-cyan-400 transition-colors uppercase tracking-widest shadow-sm">
                                    {p}
                                </button>
                            ))}
                        </div>
                    )}

                    {pastedImage && (
                        <div className="mb-2 relative inline-block">
                            <img src={pastedImage} alt="paste-preview" className="h-16 rounded border border-cyan-900 shadow-md" />
                            <button onClick={() => setPastedImage(null)} className="absolute -top-2 -right-2 bg-rose-500 rounded-full p-0.5"><XCircle className="w-4 h-4 text-white" /></button>
                        </div>
                    )}

                    <div className="flex gap-3 relative">
                        <div className="flex-1 relative group">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSend()}
                                disabled={agent.isProcessing}
                                placeholder="Escribe instrucciones operativas aquí..."
                                className="w-full h-16 bg-slate-900/50 border border-slate-700 text-white rounded-2xl pl-16 pr-6 focus:outline-none focus:border-cyan-500 focus:bg-slate-900/80 shadow-inner font-medium transition-all"
                            />
                            <button className="absolute left-4 top-1/2 -translate-y-1/2 p-2 text-slate-500 hover:text-cyan-400 transition-colors">
                                <Paperclip className="w-5 h-5" />
                            </button>
                        </div>
                        <button
                            onClick={handleSend}
                            disabled={agent.isProcessing || (!input.trim() && !pastedImage)}
                            className={cn("h-16 px-8 rounded-2xl transition-all shadow-lg flex items-center justify-center font-black uppercase tracking-widest text-[11px]",
                                (input.trim() || pastedImage) && !agent.isProcessing ? "bg-cyan-600 text-white hover:bg-cyan-500 shadow-[0_4px_20px_rgba(6,182,212,0.4)]" : "bg-slate-900 text-slate-600 border border-slate-800"
                            )}
                        >
                            <Send className="w-5 h-5 sm:mr-2" />
                            <span className="hidden sm:inline">Ejecutar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Sidebar Right: Active Timeline */}
            <div className="w-[300px] border-l border-cyan-900/30 bg-[#070b12] flex flex-col shrink-0 hidden xl:flex">
                <div className="p-6 border-b border-cyan-900/30 flex items-center gap-3 bg-cyan-950/10">
                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400">
                        <Activity className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black text-white tracking-tight leading-none mb-1">LIVE LOGGER</h3>
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Traza del Sistema</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3 relative">
                    <div className="absolute left-[23px] top-4 bottom-4 w-px bg-slate-800/50" />
                    {agent.timelineSteps.map((step, idx) => (
                        <div key={idx} className="relative flex gap-3 animate-in fade-in slide-in-from-left-2 items-start">
                            <div className={cn("w-5 h-5 rounded-full border-2 bg-slate-950 flex items-center justify-center mt-0.5 shrink-0 z-10",
                                step.status === 'RUNNING' ? "border-cyan-500" :
                                    step.status === 'DONE' ? "border-emerald-500" :
                                        step.status === 'FAILED' ? "border-rose-500" :
                                            "border-slate-700"
                            )}>
                                {step.status === 'RUNNING' && <div className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-pulse" />}
                                {step.status === 'DONE' && <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />}
                                {step.status === 'FAILED' && <div className="w-1.5 h-1.5 bg-rose-500 rounded-full" />}
                            </div>
                            <div className="leading-tight pt-1">
                                <p className={cn("text-[10px] font-bold uppercase tracking-widest",
                                    step.status === 'DONE' ? "text-slate-300" : "text-cyan-400"
                                )}>{step.text}</p>
                                <p className="text-[8px] font-mono text-slate-500 mt-0.5">{step.timestamp.split('T')[1].split('.')[0]}</p>
                            </div>
                        </div>
                    ))}
                    {agent.timelineSteps.length === 0 && (
                        <p className="text-center text-slate-600 text-[9px] font-black uppercase tracking-widest mt-10">Sin operaciones<br />activas.</p>
                    )}
                </div>
            </div>

        </div>
    );
};
