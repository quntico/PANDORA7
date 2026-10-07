import React, { useState } from 'react';
import { useM1AgentStore } from './M1AgentStore';
import { X, Key, Server, Loader2, CheckCircle2, AlertTriangle, Eye, EyeOff, ShieldAlert, Copy, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export const M1OpenAIConfigModal = () => {
    const agent = useM1AgentStore();
    const API_BASE = import.meta.env.VITE_M1_API_BASE_URL || 'http://localhost:3001';

    const [apiKey, setApiKey] = useState('');
    const [showKey, setShowKey] = useState(false);
    const [model, setModel] = useState('gpt-5.6-sol');
    const [reasoning, setReasoning] = useState('medium');

    const [isLoading, setIsLoading] = useState(false);
    const [errorObj, setErrorObj] = useState(null);
    const [showErrorDetails, setShowErrorDetails] = useState(false);

    const handleSave = async () => {
        if (!apiKey.trim()) return;
        setIsLoading(true);
        setErrorObj(null);
        setShowErrorDetails(false);

        try {
            const res = await fetch(`${API_BASE}/api/admin/openai/configure`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey, model, reasoningEffort: reasoning })
            });
            const data = await res.json();

            if (data.error) {
                setErrorObj({
                    title: data.status || "API ERROR",
                    message: data.error,
                    details: JSON.stringify(data, null, 2)
                });
                setIsLoading(false);
                return;
            }

            // Sync Status
            const statusRes = await fetch(`${API_BASE}/api/m1/agent/status`);
            const statusData = await statusRes.json();
            agent.setAiStatus(statusData);

            agent.setConfigModalOpen(false);
        } catch (e) {
            setErrorObj({
                title: "NETWORK ERROR",
                message: "No se pudo contactar al backend de PANDORA M1.",
                details: `Error Type: ${e.name}
Message: ${e.message}
Stack:
${e.stack}

HINT: Verifica que el servidor de Node Backend ('server.js') esté ejecutándose correctamente en el puerto :3001. Si editaste el archivo recientemente, asegúrate de reiniciar el proceso si no estás usando nodemon.`
            });
            setIsLoading(false);
        }
    };

    const handleDisconnect = async () => {
        setIsLoading(true);
        try {
            await fetch(`${API_BASE}/api/admin/openai/disconnect`, { method: 'POST' });
            agent.setAiStatus({ configured: false, connected: false, model: 'Desconocido', apiReachable: false, lastError: null });
            agent.setConfigModalOpen(false);
        } catch (e) {
        } finally {
            setIsLoading(false);
        }
    };

    if (!agent.isConfigModalOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl relative overflow-hidden flex flex-col">
                <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <Key className="w-5 h-5 text-emerald-400" />
                        <h2 className="text-white font-black text-sm uppercase tracking-widest">Configurar OpenAI</h2>
                    </div>
                    <button onClick={() => agent.setConfigModalOpen(false)} className="text-slate-500 hover:text-white p-1 rounded transition-colors"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">API Key</label>
                            <div className="relative">
                                <input
                                    type={showKey ? "text" : "password"}
                                    value={apiKey}
                                    onChange={(e) => setApiKey(e.target.value)}
                                    placeholder="sk-proj-..."
                                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 font-mono transition-colors"
                                />
                                <button type="button" onClick={() => setShowKey(!showKey)} className="absolute right-3 top-[14px] text-slate-500 hover:text-slate-300">
                                    {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[9px] text-slate-500 font-mono mt-1 flex items-center gap-1.5 leading-tight">
                                <ShieldAlert className="w-3 h-3" /> Nunca se guardará en el Frontend local ni en localStorage. Sólo se transmite 1 vez al `.env.local` del Backend.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Modelo M1</label>
                                <select value={model} disabled className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400 focus:outline-none appearance-none opacity-80 cursor-not-allowed">
                                    <option value="gpt-5.6-sol">gpt-5.6-sol</option>
                                    <option value="gpt-4o">gpt-4o</option>
                                </select>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Reasoning</label>
                                <select value={reasoning} onChange={(e) => setReasoning(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/50 appearance-none">
                                    <option value="low">Low</option>
                                    <option value="medium">Medium</option>
                                    <option value="high">High</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {errorObj && (
                        <div className="bg-rose-950/30 border border-rose-900/50 rounded-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-3 bg-rose-950/80 border-b border-rose-900/50 flex items-center justify-between cursor-pointer hover:bg-rose-900/50 transition-colors" onClick={() => setShowErrorDetails(!showErrorDetails)}>
                                <div className="flex items-center gap-3">
                                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
                                    <p className="text-[10px] uppercase font-black tracking-wider text-rose-400">{errorObj.title}: {errorObj.message}</p>
                                </div>
                                {showErrorDetails ? <ChevronUp className="w-4 h-4 text-rose-500" /> : <ChevronDown className="w-4 h-4 text-rose-500" />}
                            </div>

                            {showErrorDetails && (
                                <div className="p-3 bg-rose-950/20 relative group">
                                    <button
                                        onClick={() => navigator.clipboard.writeText(errorObj.details)}
                                        className="absolute top-2 right-2 p-1.5 bg-rose-900/50 hover:bg-rose-700 text-rose-300 rounded border border-rose-800 transition-colors opacity-80 hover:opacity-100 flex items-center gap-1"
                                    >
                                        <Copy className="w-3 h-3" />
                                        <span className="text-[8px] font-black uppercase tracking-widest hidden group-hover:block">Copiar Log</span>
                                    </button>
                                    <pre className="text-[9px] font-mono text-rose-300/80 whitespace-pre-wrap overflow-x-auto max-h-32 leading-relaxed">
                                        {errorObj.details}
                                    </pre>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="bg-slate-900 border-t border-slate-800 px-6 py-4 flex flex-col sm:flex-row gap-3">
                    <button
                        onClick={handleSave}
                        disabled={isLoading || !apiKey.trim()}
                        className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg py-2.5 text-[10px] font-black uppercase tracking-widest transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Server className="w-4 h-4" />}
                        Guardar y Probar
                    </button>
                    {agent.aiStatus.configured && (
                        <button onClick={handleDisconnect} disabled={isLoading} className="sm:w-auto w-full bg-slate-800 hover:bg-rose-950/50 hover:text-rose-500 text-slate-400 border border-transparent hover:border-rose-900/50 rounded-lg py-2.5 px-4 text-[10px] font-black uppercase tracking-widest transition-all text-center">
                            Desconectar IA
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
