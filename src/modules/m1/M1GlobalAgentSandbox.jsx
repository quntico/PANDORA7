import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useM1AgentStore } from './M1AgentStore';
import { useM1Store } from './M1Store';
import {
    Terminal, Send, X, Maximize2, Minimize2, Paperclip,
    Settings2, Server, Database, FileText, CheckCircle2, AlertTriangle, Play,
    Loader2, CloudOff, Globe, Trash2, Search, Minus, Square, Copy
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, XAxis, YAxis, CartesianGrid, Tooltip as CTooltip, Legend, ResponsiveContainer, Cell } from 'recharts';
import { motion } from 'framer-motion';

export const M1GlobalAgentSandbox = () => {
    const agent = useM1AgentStore();
    const store = useM1Store();

    const API_BASE = import.meta.env.VITE_M1_API_BASE_URL || 'http://localhost:3001';

    useEffect(() => {
        // Fetch AI configuration status on mount
        const checkStatus = async () => {
            try {
                const res = await fetch(`${API_BASE}/api/m1/agent/status`);
                const data = await res.json();
                agent.setAiStatus(data);
            } catch (e) {
                console.error("Agent Sandbox Backend Down", e);
            }
        };
        checkStatus();
    }, []);

    // Session Init Context 
    useEffect(() => {
        if (!agent.currentSessionId) agent.initSession();
    }, [agent]);

    const activeSession = agent.sessions.find(s => s.id === agent.currentSessionId) || { history: [] };

    const [input, setInput] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [pastedImage, setPastedImage] = useState(null);
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => setPastedImage(event.target.result);
        reader.readAsDataURL(file);
        e.target.value = ''; // Reset input to allow consecutive selections of the same file
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (agent.isSandboxOpen) scrollToBottom();
    }, [activeSession.history, agent.timelineSteps, agent.isSandboxOpen]);

    const handleSend = async (directText = null) => {
        const queryText = typeof directText === 'string' ? directText : input;
        if (!queryText.trim() && !pastedImage) return;

        if (!agent.aiStatus.configured) {
            agent.addMessage({
                id: Date.now(),
                role: 'system',
                summary: "IA NO CONFIGURADA",
                rawText: "El sandbox está activo pero el backend operativo de PANDORA no tiene conexión con OpenAI.",
                lack: ["Falta configurar OPENAI_API_KEY en el servidor backend en .env"],
                action: "Configurar IA"
            });
            return;
        }

        const userMsg = {
            id: Date.now(),
            role: 'user',
            text: queryText,
            image: pastedImage,
            timestamp: new Date().toISOString()
        };

        agent.addMessage(userMsg);
        agent.incrementKpi('processedRequests');

        if (typeof directText !== 'string') {
            setInput('');
        }

        setPastedImage(null);
        agent.setProcessing(true);
        agent.clearTimeline();

        try {
            const res = await fetch(`${API_BASE}/api/m1/agent/message`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: queryText,
                    conversationId: activeSession.id,
                    mode: agent.mode,
                    contextScope: store.activeView || agent.contextContext,
                    history: activeSession.history.map(m => ({
                        role: m.role === 'user' ? 'user' : 'assistant',
                        content: m.text || m.rawText || ''
                    })).slice(-10)
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
                            agent.addMessage({ id: Date.now() + Math.random(), role: 'system', timestamp: new Date().toISOString(), ...payload.data });
                        } else if (payload.type === 'error') {
                            agent.addTimelineStep({ status: 'FAILED', text: payload.data });
                            agent.incrementKpi('activeBlocks');
                            agent.addMessage({ id: Date.now() + Math.random(), role: 'system', summary: "Bloqueo Operativo", lack: [payload.data] });
                        }
                    } catch (jsonErr) { }
                }
            }
        } catch (e) {
            agent.addTimelineStep({ status: 'FAILED', text: "Error de red: " + e.message });
            agent.addMessage({ id: Date.now(), role: 'system', lack: ["El servidor del agent no responde."] });
        } finally {
            agent.setProcessing(false);
        }
    };

    if (!agent.isSandboxOpen) return null;

    const quickPrompts = ["¿Qué falta para 37.5?", "Revisa el expediente", "Haz gráfica avance", "Busca Drive"];

    const highlightText = (text, term) => {
        if (!term || typeof text !== 'string') return text;
        try {
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedTerm})`, 'gi');
            return text.split(regex).map((part, i) =>
                regex.test(part) ? <span key={i} className="bg-cyan-300 text-cyan-950 font-black px-1 rounded-sm underline decoration-cyan-700/50">{part}</span> : part
            );
        } catch (e) { return text; }
    };

    const renderMarkdown = (text, term) => {
        if (typeof text !== 'string') return text;

        const lines = text.split('\n');
        return lines.map((line, idx) => {
            if (line.trim() === '') return <div key={idx} className="h-2"></div>;

            let contentString = line;
            let className = "mb-1 leading-relaxed";

            if (line.match(/^###?\s/)) {
                contentString = line.replace(/^###?\s/, '');
                className = "text-[13px] font-black text-cyan-400 mt-4 mb-2 uppercase tracking-wide";
            } else if (line.match(/^[-*]\s/)) {
                contentString = line.replace(/^[-*]\s/, '');
                className = "ml-3 flex items-start text-slate-200 mt-1 mb-1 gap-2";
            }

            const parts = contentString.split(/(\*\*.*?\*\*)/g);
            const renderedLine = parts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                    const innerText = part.slice(2, -2);
                    return (
                        <button
                            key={pIdx}
                            onClick={(e) => { e.preventDefault(); handleSend(`Desglosa y explica a mayor profundidad este punto en específico: ${innerText}`); }}
                            className="font-black text-cyan-400 hover:text-cyan-300 hover:underline cursor-pointer border-none bg-transparent p-0 inline text-left"
                            title="Haz clic para que PANDORA expanda este tema"
                        >
                            {highlightText(innerText, term)}
                        </button>
                    );
                }
                return <span key={pIdx}>{highlightText(part, term)}</span>;
            });

            if (line.match(/^[-*]\s/)) {
                return (
                    <div key={idx} className={className}>
                        <span className="text-cyan-500 font-black shrink-0">•</span>
                        <span>{renderedLine}</span>
                    </div>
                );
            }
            return <div key={idx} className={className}>{renderedLine}</div>;
        });
    };

    const sandboxContent = (
        <motion.div
            drag={!agent.isSandboxMaximized}
            dragMomentum={false}
            animate={agent.isSandboxMaximized ? { x: 0, y: 0 } : undefined}
            className={cn("fixed z-[9999] flex flex-col bg-slate-900/70 backdrop-blur-xl border border-cyan-500/30 shadow-[0_8px_32px_0_rgba(6,182,212,0.2)] transition-all duration-300 ease-[cubic-bezier(0.2,0.8,0.2,1)] rounded-t-2xl sm:rounded-2xl",
                agent.isSandboxMaximized
                    ? "top-16 inset-x-0 bottom-12 sm:top-20 sm:inset-x-4 sm:bottom-16"
                    : "top-24 bottom-20 left-0 right-0 m-auto w-[95%] sm:w-[600px] h-[75vh] sm:h-[520px] sm:max-h-[calc(100vh-180px)]"
            )} style={{ resize: agent.isSandboxMaximized ? 'none' : 'both', overflow: agent.isSandboxMaximized ? 'hidden' : 'auto' }}>
            {/* Widget Head */}
            <div className="bg-[#00BCD4] border-b border-[#00BCD4] p-4 shrink-0 flex items-center justify-between cursor-grab active:cursor-grabbing">
                <div className="flex items-center gap-3 pointer-events-none">
                    <div className="w-8 h-8 rounded-full bg-white/20 border border-white/50 flex items-center justify-center shadow-[inset_0_0_10px_rgba(255,255,255,0.3)]">
                        <Terminal className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-white font-black text-sm tracking-tight leading-none">PANDORA SANDBOX</h3>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={cn("w-1.5 h-1.5 rounded-full", agent.aiStatus.configured ? "bg-white" : "bg-red-400")} />
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/90 font-mono">
                                {agent.aiStatus.configured ? agent.aiStatus.model : "OFFLINE"}
                            </p>
                        </div>
                    </div>
                </div>
                {/* Search Bar Premium */}
                <div className="flex-1 max-w-[220px] mx-4 hidden sm:block relative pointer-events-auto">
                    <Search className="w-3 h-3 text-white absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                        type="text"
                        placeholder="Buscar en el chat..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full bg-[#009fb3] border border-white/30 rounded-full py-1.5 pl-8 pr-3 text-[10px] text-white font-bold placeholder:text-white/70 focus:outline-none focus:border-white transition-colors"
                    />
                </div>

                <div className="flex items-center gap-1 pointer-events-auto">
                    <button onClick={agent.initSession} className="p-2 hover:bg-[#009fb3] rounded-lg text-white/90" title="Limpiar Conversación"><Trash2 className="w-4 h-4 hover:text-white" /></button>
                    <button onClick={() => agent.setSandboxOpen(false)} className="p-2 hover:bg-[#009fb3] rounded-lg text-white/90" title="Minimizar"><Minus className="w-4 h-4" /></button>
                    {agent.isSandboxMaximized ? (
                        <button onClick={() => agent.setSandboxMaximized(false)} className="p-2 hover:bg-[#009fb3] rounded-lg text-white/90" title="Restaurar Tamaño Normal"><Copy className="w-4 h-4" /></button>
                    ) : (
                        <button onClick={() => agent.setSandboxMaximized(true)} className="p-2 hover:bg-[#009fb3] rounded-lg text-white/90" title="Maximizar"><Square className="w-4 h-4" /></button>
                    )}
                    <button onClick={() => agent.setSandboxOpen(false)} className="p-2 hover:bg-rose-500 rounded-lg text-white transition-colors" title="Cerrar Panel"><X className="w-4 h-4" /></button>
                </div>
            </div>

            {/* Diagnostic Bar */}
            <div className="bg-slate-950/80 backdrop-blur border-b border-slate-800 shrink-0 px-4 py-2 flex items-center gap-5 overflow-x-auto text-[9px] font-black uppercase tracking-widest text-slate-300">
                <div className="flex items-center gap-1.5"><Database className="w-3 h-3 text-cyan-500" /> PANDORA · ONLINE</div>
                <div className="flex items-center gap-1.5"><Globe className="w-3 h-3 text-emerald-500" /> WEB SEARCH · {agent.aiStatus.configured ? 'AVAILABLE' : 'OFFLINE'}</div>
                {store.settings?.driveStatus !== 'CONNECTED' && <div className="flex items-center gap-1.5 text-amber-500"><CloudOff className="w-3 h-3" /> DRIVE MISSING</div>}
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 relative scroll-smooth">
                {activeSession.history.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full text-center p-6 opacity-80">
                        <div className="w-16 h-16 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mb-6">
                            <Terminal className="w-6 h-6 text-cyan-500" />
                        </div>
                        <h4 className="text-white font-black uppercase tracking-widest text-sm mb-2">Copiloto Global M1</h4>
                        <p className="text-slate-400 text-xs font-bold leading-relaxed max-w-[300px]">
                            Contexto actual enlazado: "{store.activeView}".<br />Reviso normatividad, conecto internet, extraigo Drive y realizo comparativas cruzadas.
                        </p>

                        {!agent.aiStatus.configured && (
                            <div className="mt-8 bg-rose-950/30 border border-rose-900/50 rounded-xl p-4 w-full">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-rose-500 mb-2">IA NO CONFIGURADA</h4>
                                <p className="text-[10px] text-slate-300 leading-relaxed font-mono mb-4 text-left">
                                    PANDORA no tiene conexión local con OpenAI. Se requiere la inyección de una clave autorizada para reactivar la red neuronal.
                                </p>
                                <button onClick={() => agent.setConfigModalOpen(true)} className="w-full py-2 bg-rose-900/50 hover:bg-rose-900 text-rose-400 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors font-mono tracking-tight">
                                    Configurar IA
                                </button>
                            </div>
                        )}
                    </div>
                )}

                {activeSession.history.filter(msg => {
                    if (!searchTerm) return true;
                    const t = searchTerm.toLowerCase();
                    if (msg.role === 'user' && msg.text?.toLowerCase().includes(t)) return true;
                    if (msg.role === 'system' && ((msg.summary || '').toLowerCase().includes(t) || (msg.rawText || '').toLowerCase().includes(t))) return true;
                    return false;
                }).map((msg, i) => (
                    <div key={msg.id + i} className={cn("flex w-full", msg.role === 'user' ? "justify-end" : "justify-start")}>
                        <div className={cn(
                            "max-w-[85%] rounded-2xl p-4 shadow-xl relative backdrop-blur-md min-w-[120px] flex flex-col",
                            msg.role === 'user' ? "bg-[#00BCD4] border border-[#009fb3] text-white" : "bg-slate-900/80 border border-slate-700/50 text-slate-200"
                        )}>
                            {msg.role === 'user' && <div className="text-[13px] font-medium leading-relaxed">{highlightText(msg.text, searchTerm)}</div>}
                            {msg.role === 'system' && (
                                <div className="space-y-4">
                                    {msg.summary && (
                                        <p className="text-[11px] font-bold text-white bg-slate-800/80 px-2 py-1.5 rounded-lg border border-slate-700/50 inline-flex items-center gap-2">
                                            {highlightText(msg.summary, searchTerm)}
                                        </p>
                                    )}
                                    {msg.rawText && (
                                        <div className="group relative">
                                            <div className="text-[11px] text-slate-100 font-medium leading-relaxed">
                                                {renderMarkdown(msg.rawText, searchTerm)}
                                            </div>
                                            <div className="flex justify-end mt-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button onClick={() => navigator.clipboard.writeText(msg.rawText)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/80 hover:bg-cyan-900/50 border border-slate-700/50 hover:border-cyan-500/50 text-slate-400 hover:text-cyan-400 rounded-md transition-colors text-[9px] font-black uppercase tracking-widest backdrop-blur-sm">
                                                    <Copy className="w-3 h-3" /> Copiar / Exportar
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {msg.action === 'RENDER_CHART' && msg.payload && (
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 h-[250px] w-[350px] max-w-full relative">
                                            <h4 className="text-[9px] font-black uppercase text-cyan-500 absolute top-2 left-3">{msg.payload.title}</h4>
                                            <div className="pt-6 h-full"><ResponsiveContainer width="100%" height="100%">
                                                {msg.payload.type === 'BAR' ? <BarChart data={msg.payload.labels.map((l, i) => ({ name: l, val: msg.payload.datasets[0].data[i] }))}><XAxis dataKey="name" tick={{ fontSize: 8, fill: '#64748b' }} /><Bar dataKey="val" fill="#06b6d4" radius={[4, 4, 0, 0]} /></BarChart> : <LineChart data={msg.payload.labels.map((l, i) => ({ name: l, val: msg.payload.datasets[0].data[i] }))}><XAxis dataKey="name" tick={{ fontSize: 8, fill: '#64748b' }} /><Line type="monotone" dataKey="val" stroke="#3b82f6" strokeWidth={2} /></LineChart>}
                                            </ResponsiveContainer></div>
                                        </div>
                                    )}

                                    {msg.lack?.length > 0 && (
                                        <div className="bg-rose-950/20 border border-rose-900/30 p-3 rounded-lg space-y-2">
                                            <h4 className="text-[9px] font-black text-rose-500 uppercase flex items-center gap-1.5"><AlertTriangle className="w-3 h-3" /> LO QUE FALTA</h4>
                                            {msg.lack.map((l, i) => <p key={i} className="text-[10px] text-rose-200/80 font-mono">· {l}</p>)}
                                        </div>
                                    )}

                                    {msg.sources?.length > 0 && (
                                        <div className="pt-2 flex flex-wrap gap-1 text-[9px] font-mono text-cyan-600">
                                            {msg.sources.map((s, i) => (
                                                <a key={i} href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 hover:text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">
                                                    <FileText className="w-3 h-3" /> {s.name}
                                                </a>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                            <div className={cn("w-full flex justify-end mt-2 pt-1 text-[9px] font-mono tracking-tighter opacity-70", msg.role === 'user' ? "text-cyan-50" : "text-slate-400")}>
                                {new Date(msg.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </div>
                        </div>
                    </div>
                ))}

                {agent.isProcessing && (
                    <div className="flex flex-col gap-1.5 w-full bg-slate-900/50 p-4 rounded-xl border border-slate-800 animate-pulse">
                        <div className="flex items-center gap-2 mb-2">
                            <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-cyan-500">PROCESANDO...</span>
                        </div>
                        {agent.timelineSteps.slice(-2).map((s, idx) => (
                            <p key={idx} className="text-[10px] font-mono text-slate-400 tabular-nums">[{s.timestamp.split('T')[1].split('.')[0]}] {s.text}</p>
                        ))}
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 shrink-0">
                {activeSession.history.length === 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-3 no-scrollbar">
                        {quickPrompts.map(q => <button key={q} onClick={() => setInput(q)} className="shrink-0 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[9px] font-black uppercase tracking-widest rounded-full">{q}</button>)}
                    </div>
                )}
                {pastedImage && (
                    <div className="mb-3 relative inline-block animate-in fade-in slide-in-from-bottom-2 duration-300">
                        {pastedImage.startsWith('data:image') ? (
                            <img src={pastedImage} alt="Attachment" className="h-16 w-16 object-cover rounded-xl border border-slate-700 shadow-md" />
                        ) : (
                            <div className="h-16 w-16 bg-slate-800 rounded-xl border border-slate-700 shadow-md flex items-center justify-center">
                                <FileText className="w-6 h-6 text-cyan-400" />
                            </div>
                        )}
                        <button onClick={() => setPastedImage(null)} className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 hover:bg-rose-600 shadow-lg"><X className="w-3 h-3" /></button>
                    </div>
                )}
                <div className="flex relative items-end bg-slate-950 border border-slate-800 rounded-2xl focus-within:border-cyan-500/50 transition-colors">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf,.doc,.docx,.txt,.csv" onChange={handleFileUpload} />
                    <button onClick={() => fileInputRef.current?.click()} className="p-4 text-slate-500 hover:text-cyan-400 h-[52px] transition-colors"><Paperclip className="w-4 h-4" /></button>
                    <textarea
                        value={input} onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                        placeholder={`Pregunta a PANDORA sobre [${store.activeView}]...`}
                        disabled={agent.isProcessing}
                        className="flex-1 max-h-32 bg-transparent text-white text-sm py-4 focus:outline-none resize-none font-medium placeholder:text-slate-400"
                        rows={1}
                    />
                    <button onClick={handleSend} disabled={agent.isProcessing || !input.trim()} className={cn("m-2 w-10 h-10 rounded-xl flex items-center justify-center transition-all", input.trim() && !agent.isProcessing ? "bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]" : "bg-slate-900 text-slate-700 border border-slate-800")}><Send className="w-4 h-4" /></button>
                </div>
                <div className="flex justify-between items-center mt-2 px-1">
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest font-mono">SHIFT + ENTER = NUEVA LÍNEA</p>
                    <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest font-mono hidden sm:block">AI COPILOT POWERED BY OPENAI</p>
                </div>
            </div>
        </motion.div>
    );

    return typeof document !== 'undefined' ? createPortal(sandboxContent, document.body) : null;
};
