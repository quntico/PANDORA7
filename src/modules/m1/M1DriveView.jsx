import React, { useState, useEffect } from 'react';
import { HardDrive, Cloud, AlertCircle, RefreshCw, Key, Link as LinkIcon, FolderOpen, FileText } from 'lucide-react';
import { useM1Store } from './M1Store';
import { cn } from '@/lib/utils';

export const M1DriveView = () => {
    const API_BASE = import.meta.env.VITE_M1_API_BASE_URL || 'http://localhost:3001';
    const { updateSettings } = useM1Store();
    const [status, setStatus] = useState('CONNECTING');
    const [driveData, setDriveData] = useState(null);
    const [files, setFiles] = useState([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [syncMsg, setSyncMsg] = useState('');

    // Config states
    const [clientId, setClientId] = useState('');
    const [clientSecret, setClientSecret] = useState('');
    const [redirectUri, setRedirectUri] = useState('http://localhost:3010/api/m1/drive/oauth/callback');
    const [showSecret, setShowSecret] = useState(false);
    const [saveStatus, setSaveStatus] = useState('');

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        setStatus('CONNECTING');
        try {
            const res = await fetch(`${API_BASE}/api/m1/drive/status`);
            if (res.ok) {
                const data = await res.json();
                setStatus(data.connected ? 'CONNECTED' : (data.error === 'NOT_AUTHENTICATED' ? 'DISCONNECTED' : 'DISCONNECTED'));
                setDriveData(data);
                if (data.configured) {
                    setClientId(data.clientIdMasked || '');
                    setRedirectUri(data.redirectUri || 'http://localhost:3010/api/m1/drive/callback');
                    if (data.clientSecretConfigured) setClientSecret('************************');
                }
                updateSettings({ driveStatus: data.connected ? 'CONNECTED' : 'DISCONNECTED', driveFolderId: data.rootFolderId });
                if (data.connected && data.rootAccessible) {
                    // Trigger auto rescan tests as requested
                    handleSync();
                }
            } else {
                setStatus('ERROR');
            }
        } catch (error) {
            console.error('Error connecting to Drive API:', error);
            setStatus('ERROR');
        }
    };

    const handleConnect = async () => {
        try {
            const res = await fetch(`${API_BASE}/api/m1/drive/auth-url`);
            const data = await res.json();
            if (data.url) {
                const popup = window.open(data.url, "GoogleAuth", "width=500,height=600");
                const timer = setInterval(() => {
                    if (popup && popup.closed) {
                        clearInterval(timer);
                        checkStatus();
                    }
                }, 1000);
            }
        } catch (error) {
            console.error('Drive Auth Error:', error);
        }
    };

    const handleSync = async () => {
        setLoadingFiles(true);
        setSyncMsg('SINCRONIZANDO...');
        try {
            // Step 1: trigger rescan
            const rescanRes = await fetch(`${API_BASE}/api/m1/files/rescan`, { method: 'POST' });
            const rescanData = await rescanRes.json();

            if (!rescanRes.ok || !rescanData.success) {
                setSyncMsg(`ERROR: ${rescanData.error || 'Rescan fallido'}`);
                setLoadingFiles(false);
                return;
            }

            const stats = rescanData.data || rescanData;
            setSyncMsg(`COMPLETADO — ${stats.totalFiles || 0} archivos / ${stats.totalFolders || 0} carpetas`);

            // Step 2: fetch full index to get files array
            const indexRes = await fetch(`${API_BASE}/api/m1/files/index`);
            const indexData = await indexRes.json();
            if (indexData.success && indexData.data?.files) {
                setFiles(indexData.data.files);
            }
        } catch (error) {
            console.error('Sync Error:', error);
            setSyncMsg('ERROR de red');
        } finally {
            setLoadingFiles(false);
        }
    };

    const handleDisconnect = async () => {
        try {
            await fetch(`${API_BASE}/api/m1/drive/disconnect`, { method: 'POST' });
            setStatus('DISCONNECTED');
            setFiles([]);
            checkStatus(); // to re-fetch config status
        } catch (error) {
            console.error('Drive Disconnect Error:', error);
        }
    };

    const handleSaveConfig = async () => {
        // Always use the canonical redirect URI — ignore any frontend state corruption
        const canonicalRedirectUri = 'http://localhost:3010/api/m1/drive/oauth/callback';
        try {
            setSaveStatus('Guardando...');
            const res = await fetch(`${API_BASE}/api/m1/drive/config`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ clientId, clientSecret, redirectUri: canonicalRedirectUri })
            });
            const data = await res.json();
            if (data.success) {
                setSaveStatus('✅ CREDENCIALES GUARDADAS');
                checkStatus();
            } else {
                setSaveStatus(data.error || 'Error al guardar');
            }
        } catch (e) {
            setSaveStatus('Error de red');
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl bg-slate-900 shadow-xl border border-slate-800 text-white relative flex flex-col justify-center overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl -mx-10 -my-10" />
                    <h3 className="text-[12px] font-black uppercase tracking-widest mb-2 z-10 flex items-center gap-2 text-cyan-400">
                        <Cloud className="w-4 h-4" /> Almacenamiento Central
                    </h3>
                    <h2 className="text-3xl font-black mb-1 z-10 tracking-tight">Expediente Drive</h2>
                    <p className="text-slate-400 text-xs font-bold w-3/4 z-10">Conexión cifrada (OAuth 2.0) al repositorio documental oficial del proceso M1.</p>
                </div>
            </div>

            <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
                {status === 'ERROR' && (
                    <div className="bg-rose-50 border border-rose-200 p-6 rounded-2xl flex items-center gap-4 text-rose-700">
                        <AlertCircle className="w-8 h-8" />
                        <div>
                            <h4 className="font-black tracking-tight">ERROR DE CONEXIÓN AL BACKEND</h4>
                            <p className="text-xs font-bold mt-1">El backend PANDORA en {API_BASE} no responde. Por seguridad Drive operará en modo offline simulado.</p>
                        </div>
                    </div>
                )}

                {status === 'CONNECTING' && (
                    <div className="flex flex-col items-center justify-center p-12 text-slate-400">
                        <RefreshCw className="w-8 h-8 animate-spin mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Iniciando Enlace OAUTH...</span>
                    </div>
                )}

                {status === 'DISCONNECTED' && !driveData?.configured && (
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-8">
                        <h4 className="text-sm font-black text-slate-700 tracking-widest uppercase mb-6 flex items-center gap-2">
                            <Key className="w-4 h-4 text-slate-400" /> Configuración OAuth 2.0
                        </h4>
                        <div className="space-y-4 max-w-xl">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">CLIENT ID</label>
                                <input type="text" placeholder="...apps.googleusercontent.com" value={clientId} onChange={e => setClientId(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-300 focus:border-cyan-500 focus:outline-none" />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">CLIENT SECRET</label>
                                <div className="relative">
                                    <input type={showSecret ? "text" : "password"} value={clientSecret} onChange={e => { setClientSecret(e.target.value); if (e.target.value === '') setSaveStatus(''); }} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono text-slate-800 placeholder:text-slate-300 focus:border-cyan-500 focus:outline-none" />
                                    <button onClick={() => setShowSecret(!showSecret)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-cyan-600">
                                        {showSecret ? 'OCULTAR' : 'MOSTRAR'}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">REDIRECT URI</label>
                                <div className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-2 text-xs font-mono text-slate-500 flex items-center justify-between gap-2">
                                    <span className="truncate">{redirectUri}</span>
                                    <span className="text-[8px] font-black bg-slate-200 text-slate-500 px-2 py-0.5 rounded uppercase tracking-widest shrink-0">FIJO</span>
                                </div>
                                <p className="text-[9px] text-slate-400 font-bold mt-1">Registra exactamente este URI en Google Cloud Console → Credenciales → OAuth.</p>
                            </div>

                            <div className="pt-4 flex items-center gap-4">
                                <button onClick={handleSaveConfig} className="bg-slate-800 hover:bg-slate-700 text-white px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors">
                                    GUARDAR CREDENCIALES
                                </button>
                                {saveStatus && <span className={cn("text-[10px] font-black tracking-widest uppercase", saveStatus.includes('✅') ? "text-emerald-500" : "text-amber-500")}>{saveStatus}</span>}
                            </div>
                        </div>
                    </div>
                )}

                {status === 'DISCONNECTED' && driveData?.configured && (
                    <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-3xl p-16 bg-slate-50">
                        <Key className="w-12 h-12 text-emerald-400 mb-4" />
                        <h4 className="text-xl font-black text-slate-700 tracking-tight mb-2">Google Drive OAuth configurado</h4>
                        <p className="text-xs font-bold text-slate-400 max-w-sm text-center mb-6">Autoriza a PANDORA para acceder y auditar el repositorio oficial de evidencias de esta licitación.</p>
                        <button onClick={handleConnect} className="px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-md transition-all">
                            <Cloud className="w-4 h-4" /> Conectar Google Drive
                        </button>
                        <button onClick={() => setDriveData({ ...driveData, configured: false })} className="mt-6 text-[9px] font-black text-slate-300 uppercase tracking-widest hover:text-slate-500">
                            MODIFICAR CREDENCIALES OAUTH
                        </button>
                    </div>
                )}

                {status === 'CONNECTED' && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center bg-cyan-50 border border-cyan-100 p-6 rounded-2xl">
                            <div className="flex gap-4 items-center">
                                <div className="p-3 bg-white text-cyan-600 rounded-full shadow-sm">
                                    <Cloud className="w-6 h-6" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-cyan-800 tracking-tight flex items-center gap-2">
                                        Google Drive <span className="bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded text-[8px] uppercase tracking-widest">● CONECTADO</span>
                                    </h4>
                                    <p className="text-[10px] font-bold text-cyan-600/70 mt-1 font-mono">{driveData?.accountEmail}</p>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={handleSync} disabled={loadingFiles} className="px-5 py-2.5 bg-white text-cyan-600 border border-cyan-200 hover:bg-cyan-100 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 transition-all disabled:opacity-50">
                                    <RefreshCw className={cn("w-3.5 h-3.5", loadingFiles && "animate-spin")} />
                                    {loadingFiles ? 'SINCRONIZANDO...' : 'SINCRONIZAR'}
                                </button>
                                <button onClick={handleDisconnect} className="px-5 py-2.5 bg-white text-slate-500 border border-slate-200 hover:bg-slate-100 rounded-full text-[9px] font-black uppercase tracking-widest transition-all">
                                    Desconectar
                                </button>
                            </div>
                        </div>
                        {syncMsg && (
                            <div className={cn("px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest",
                                syncMsg.startsWith('COMPLETADO') ? "bg-emerald-50 text-emerald-600 border border-emerald-200" :
                                    syncMsg.startsWith('ERROR') ? "bg-rose-50 text-rose-600 border border-rose-200" :
                                        "bg-amber-50 text-amber-600 border border-amber-200"
                            )}>
                                {syncMsg}
                            </div>
                        )}

                        <div>
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <FolderOpen className="w-4 h-4" /> Archivos Detectados ({files.length})
                            </h4>

                            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm text-sm overflow-hidden">
                                {loadingFiles ? (
                                    <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-[9px]">Sincronizando Árbol...</div>
                                ) : files.length === 0 ? (
                                    <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-[9px]">Sin archivos — pulsa SINCRONIZAR para escanear Drive</div>
                                ) : (
                                    <ul className="divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
                                        {files.map(f => (
                                            <li key={f.driveFileId} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-3 w-1/2">
                                                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                                    <span className="font-bold text-slate-700 truncate">{f.name || f.fileName}</span>
                                                </div>
                                                <div className="text-[10px] font-bold text-slate-400 font-mono truncate max-w-[200px]">{f.driveFileId}</div>
                                                <a href={f.webViewLink} target="_blank" rel="noreferrer" className="p-2 rounded bg-slate-100 hover:bg-cyan-50 text-slate-500 hover:text-cyan-600 transition-colors">
                                                    <LinkIcon className="w-3.5 h-3.5" />
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
