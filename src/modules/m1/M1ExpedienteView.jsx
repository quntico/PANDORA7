import React, { useState, useEffect } from 'react';
import { officialTenderRequirements } from './data/m1ActiveTender';
import { FileStack, FolderOpen, RefreshCcw, FileText, Search, CheckCircle2, AlertCircle, Cloud, Key, Folder, ExternalLink, ChevronRight, ArrowLeft, Info, Calendar, HardDrive, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';

const API_BASE = import.meta.env.VITE_M1_API_BASE_URL || 'http://localhost:3010';

export const M1ExpedienteView = () => {
    const [indexData, setIndexData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [scanning, setScanning] = useState(false);
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState('archivos'); // 'archivos' | 'progreso'

    // EXPLORER STATE
    const [currentPath, setCurrentPath] = useState(''); // '' means root, 'FolderA/FolderB'
    const [selectedFile, setSelectedFile] = useState(null);

    const loadIndex = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/m1/files/index`);
            if (!res.ok) throw new Error('API Error');
            const data = await res.json();
            if (data.success) setIndexData(data.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const runRescan = async () => {
        try {
            setScanning(true);
            const res = await fetch(`${API_BASE}/api/m1/files/rescan`, { method: 'POST' });
            const data = await res.json();
            if (data.success) {
                setIndexData({ ...indexData, ...data.data }); // Merging properly
                loadIndex(); // Force reload index fully to get files array
            }
        } catch (err) {
            console.error(err);
        } finally {
            setScanning(false);
        }
    };

    useEffect(() => { loadIndex(); }, []);

    const formatSize = (b) => {
        if (b === undefined || b === null) return '--';
        if (b === 0) return '0 B';
        if (b < 1024) return b + ' B';
        if (b < 1048576) return (b / 1024).toFixed(1) + ' KB';
        return (b / 1048576).toFixed(1) + ' MB';
    };

    const formatDate = (d) => {
        if (!d) return '--';
        return new Date(d).toLocaleDateString();
    };

    const files = indexData?.files || [];

    // ---- PROGRESS LOGIC ----
    const progressData = officialTenderRequirements.map(req => {
        const keywords = [req.code, ...(req.code?.split(/[-_]/))].filter(Boolean).map(k => k.toLowerCase());
        const found = files.some(f => {
            const haystack = `${f.name || ''} ${f.relativePath || ''} ${f.parentFolder || ''}`.toLowerCase();
            return keywords.some(kw => kw.length > 2 && haystack.includes(kw));
        });
        return { ...req, found };
    });

    const foundCount = progressData.filter(r => r.found).length;
    const notFoundCount = progressData.filter(r => !r.found).length;
    const docProgress = progressData.length > 0 ? Math.round((foundCount / progressData.length) * 100) : 0;

    const kpis = [
        { label: "TOTAL ARCHIVOS", val: indexData?.totalFiles ?? 0 },
        { label: "TOTAL CARPETAS", val: indexData?.totalFolders ?? 0 },
        { label: "CLASIFICADOS", val: indexData?.classified ?? 0 },
        { label: "SIN CLASIFICAR", val: indexData?.unclassified ?? 0 },
        { label: "ERRORES", val: indexData?.errors ?? 0 },
    ];

    const notConnected = indexData?.error;

    // ---- EXPLORER LOGIC ----
    const [currentFolders, setCurrentFolders] = useState([]);
    const [currentFiles, setCurrentFiles] = useState([]);

    useEffect(() => {
        if (search) {
            // Flat search results
            const filtered = files.filter(f => f.name?.toLowerCase().includes(search.toLowerCase()));
            setCurrentFolders([]);
            setCurrentFiles(filtered);
            return;
        }

        const prefix = currentPath ? currentPath + '/' : '';
        const subFiles = files.filter(f => f.relativePath.startsWith(prefix));

        const foldersSet = new Set();
        const filesList = [];

        subFiles.forEach(f => {
            const remainder = f.relativePath.substring(prefix.length);
            if (remainder.includes('/')) {
                foldersSet.add(remainder.split('/')[0]);
            } else {
                filesList.push(f);
            }
        });

        setCurrentFolders(Array.from(foldersSet).sort());
        setCurrentFiles(filesList.sort((a, b) => a.name.localeCompare(b.name)));
    }, [files, currentPath, search]);

    const navigateTo = (folderName) => {
        const newPath = currentPath ? `${currentPath}/${folderName}` : folderName;
        setCurrentPath(newPath);
        setSelectedFile(null);
    };

    const navigateUp = () => {
        if (!currentPath) return;
        const parts = currentPath.split('/');
        parts.pop();
        setCurrentPath(parts.join('/'));
        setSelectedFile(null);
    };

    const renderBreadcrumbs = () => {
        const parts = currentPath ? currentPath.split('/') : [];
        return (
            <div className="flex items-center gap-1.5 text-[10px] font-black tracking-widest uppercase overflow-x-auto whitespace-nowrap pb-1">
                <button
                    onClick={() => { setCurrentPath(''); setSelectedFile(null); }}
                    className={cn("hover:text-cyan-600 transition-colors", currentPath ? "text-slate-400" : "text-slate-800")}
                >
                    M1 - LICITACIÓN ACTIVA
                </button>
                {parts.map((p, i) => {
                    const isLast = i === parts.length - 1;
                    const pathSoFar = parts.slice(0, i + 1).join('/');
                    return (
                        <React.Fragment key={p}>
                            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                            <button
                                onClick={() => { setCurrentPath(pathSoFar); setSelectedFile(null); }}
                                className={cn("hover:text-cyan-600 transition-colors", isLast ? "text-slate-800" : "text-slate-400")}
                            >
                                {p}
                            </button>
                        </React.Fragment>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">

            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div className="p-6 rounded-2xl bg-slate-900 text-white flex-1 relative overflow-hidden max-w-2xl">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl" />
                    <h3 className="text-[11px] font-black text-cyan-400 uppercase tracking-widest mb-1 flex items-center gap-2">
                        <FolderOpen className="w-3.5 h-3.5" /> Expediente Real M1
                    </h3>
                    <h2 className="text-2xl font-black tracking-tight">Directorio Activo · Drive API</h2>
                    <p className="text-slate-400 text-[11px] font-bold mt-1">Read-only · Google Drive API · BFS scan</p>
                </div>

                <div className="flex flex-col gap-2 items-end shrink-0">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {indexData?.generatedAt ? new Date(indexData.generatedAt).toLocaleString() : 'Sin escanear'}
                    </div>
                    {indexData?.elapsedMs && (
                        <div className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                            Tardó {(indexData.elapsedMs / 1000).toFixed(1)}s
                        </div>
                    )}
                    <button
                        onClick={runRescan}
                        disabled={scanning}
                        className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl font-black text-[10px] tracking-widest flex items-center gap-2 transition-colors"
                    >
                        <RefreshCcw className={cn("w-3.5 h-3.5", scanning && "animate-spin")} />
                        {scanning ? 'ESCANEANDO...' : 'RESCAN DRIVE'}
                    </button>
                </div>
            </div>

            {/* Not connected message */}
            {notConnected && (
                <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex items-center gap-4">
                    <Cloud className="w-8 h-8 text-amber-500 shrink-0" />
                    <div>
                        <h4 className="font-black text-amber-700 text-sm tracking-tight">Drive no conectado</h4>
                        <p className="text-xs font-bold text-amber-600 mt-0.5">Ve a <strong>Drive</strong> en el sidebar para configurar las credenciales OAuth y ejecutar el escaneo.</p>
                    </div>
                </div>
            )}

            {/* KPIs */}
            {!notConnected && (
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                    {kpis.map((kpi, i) => (
                        <div key={i} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm text-center">
                            <h4 className={cn("text-2xl font-black tracking-tight", kpi.label === 'ERRORES' && kpi.val > 0 ? "text-rose-500" : "text-slate-800")}>{kpi.val}</h4>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{kpi.label}</p>
                        </div>
                    ))}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                {['archivos', 'progreso'].map(tab => (
                    <button key={tab} onClick={() => { setActiveTab(tab); setSelectedFile(null); }}
                        className={cn("px-5 py-2.5 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all",
                            activeTab === tab ? "border-cyan-500 text-cyan-600" : "border-transparent text-slate-400 hover:text-slate-600"
                        )}>
                        {tab === 'archivos' ? `Examinador de Archivos` : `Progreso Documental (${docProgress}%)`}
                    </button>
                ))}
            </div>

            {/* TAB: ARCHIVOS (EXPLORADOR) */}
            {activeTab === 'archivos' && (
                <div className="flex gap-4 h-[600px]">
                    {/* Main Explorer Area */}
                    <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">

                        {/* Toolbar / Search */}
                        <div className="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                                {!search && renderBreadcrumbs()}
                                {search && <span className="text-[10px] font-black tracking-widest text-slate-800 uppercase">RESULTADOS DE BÚSQUEDA</span>}
                            </div>
                            <div className="relative w-64 shrink-0">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    type="text"
                                    placeholder="Buscar archivo (global)..."
                                    value={search} onChange={e => { setSearch(e.target.value); setSelectedFile(null); }}
                                    className="w-full pl-9 pr-8 py-1.5 text-[10px] font-bold bg-white border border-slate-200 rounded-full focus:outline-none focus:border-cyan-500 transition-colors placeholder:text-slate-400 uppercase"
                                />
                                {search && (
                                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                                        ✕
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* List Area */}
                        <div className="flex-1 overflow-auto bg-white">
                            <table className="w-full text-left border-collapse min-w-[700px] select-none">
                                <thead className="sticky top-0 bg-white/95 backdrop-blur z-10 shadow-sm border-b border-slate-100">
                                    <tr className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-4 py-3">NOMBRE</th>
                                        <th className="px-4 py-3">TIPO</th>
                                        <th className="px-4 py-3">TAMAÑO</th>
                                        <th className="px-4 py-3">MODIFICADO</th>
                                        <th className="px-4 py-3 text-center">CLASIFICACIÓN</th>
                                        <th className="px-4 py-3 text-center">ESTADO</th>
                                        <th className="px-4 py-3 text-right"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">

                                    {/* Loading State */}
                                    {loading && (
                                        <tr><td colSpan={7} className="text-center py-12 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cargando expediente...</td></tr>
                                    )}

                                    {/* Empty / Not Found */}
                                    {!loading && currentFolders.length === 0 && currentFiles.length === 0 && (
                                        <tr><td colSpan={7} className="text-center py-12 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {search ? 'Sin coincidencias' : 'Carpeta Vacía'}
                                        </td></tr>
                                    )}

                                    {/* BACK ROW */}
                                    {!loading && !search && currentPath !== '' && (
                                        <tr className="hover:bg-slate-50 cursor-pointer group" onDoubleClick={navigateUp}>
                                            <td className="px-4 py-2.5" colSpan={7}>
                                                <div className="flex items-center gap-3 text-slate-500 group-hover:text-cyan-600 transition-colors">
                                                    <ArrowLeft className="w-5 h-5 text-slate-400" />
                                                    <span className="text-xs font-black uppercase tracking-widest">.. / ATRÁS</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}

                                    {/* FOLDERS (Hidden during search) */}
                                    {!loading && !search && currentFolders.map(folder => (
                                        <tr key={folder}
                                            className="hover:bg-slate-50 cursor-pointer transition-colors"
                                            onClick={() => setSelectedFile(null)}
                                            onDoubleClick={() => navigateTo(folder)}>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-3">
                                                    <Folder className="w-5 h-5 text-amber-400 shrink-0 fill-amber-100" />
                                                    <span className="text-xs font-black text-slate-700 truncate">{folder}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5"><span className="text-[9px] font-black tracking-widest text-slate-400 uppercase">CARPETA</span></td>
                                            <td className="px-4 py-2.5"><span className="text-[10px] font-black text-slate-300">--</span></td>
                                            <td className="px-4 py-2.5"><span className="text-[10px] font-black text-slate-300">--</span></td>
                                            <td className="px-4 py-2.5 text-center"><span className="text-[10px] font-black text-slate-300">--</span></td>
                                            <td className="px-4 py-2.5 text-center"><span className="text-[10px] font-black text-slate-300">--</span></td>
                                            <td className="px-4 py-2.5 text-right"></td>
                                        </tr>
                                    ))}

                                    {/* FILES */}
                                    {!loading && currentFiles.map(f => {
                                        const isSelected = selectedFile?.id === f.id;
                                        return (
                                            <tr key={f.id}
                                                className={cn("cursor-pointer transition-colors border-l-4",
                                                    isSelected ? "bg-cyan-50/50 border-cyan-500" : "hover:bg-slate-50 border-transparent")}
                                                onClick={() => setSelectedFile(f)}
                                                onDoubleClick={() => window.open(f.webViewLink, '_blank')}
                                            >
                                                <td className="px-4 py-2.5 max-w-[260px]">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className={cn("w-5 h-5 shrink-0 transition-colors", isSelected ? "text-cyan-600" : "text-slate-400")} />
                                                        <div className="flex flex-col truncate">
                                                            <span className="text-xs font-bold text-slate-700 truncate" title={f.name}>{f.name}</span>
                                                            {search && <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">{f.parentFolder || 'ROOT'}</span>}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-[8px] font-black tracking-widest text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">{f.extension || 'FILE'}</span>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-[10px] font-black text-slate-500">{formatSize(f.sizeBytes)}</span>
                                                </td>
                                                <td className="px-4 py-2.5">
                                                    <span className="text-[10px] font-black text-slate-500">{formatDate(f.modifiedAt)}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className={cn("text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded",
                                                        f.category === 'CLASSIFIED' ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                                                    )}>{f.category || 'N/A'}</span>
                                                </td>
                                                <td className="px-4 py-2.5 text-center">
                                                    <span className="text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">
                                                        {f.status || 'OK'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-2.5 text-right">
                                                    <button onClick={(e) => { e.stopPropagation(); window.open(f.webViewLink, '_blank'); }}
                                                        className="p-1.5 rounded bg-slate-100 hover:bg-cyan-100 text-slate-400 hover:text-cyan-600 transition-colors">
                                                        <ExternalLink className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right Detail Panel */}
                    <div className="w-80 shrink-0 bg-white rounded-2xl shadow-sm border border-slate-100 flex flex-col overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col items-center justify-center pt-8 pb-6">
                            {selectedFile ? (
                                <>
                                    <div className="w-16 h-16 bg-cyan-100 text-cyan-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
                                        <FileText className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-sm font-bold text-slate-800 text-center px-4 w-full break-words leading-tight">{selectedFile.name}</h3>
                                    <span className="text-[9px] font-black tracking-widest text-slate-400 uppercase mt-2">{selectedFile.extension?.toUpperCase() || 'FILE'}</span>
                                </>
                            ) : (
                                <>
                                    <div className="w-16 h-16 bg-slate-100 text-slate-300 rounded-2xl flex items-center justify-center mb-4">
                                        <Info className="w-8 h-8" />
                                    </div>
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Sin Selección</h3>
                                </>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto p-5">
                            {selectedFile ? (
                                <div className="space-y-5">

                                    {/* Actions */}
                                    <div className="flex flex-col gap-2 border-b border-slate-100 pb-5">
                                        <button
                                            onClick={() => window.open(selectedFile.webViewLink, '_blank')}
                                            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex justify-center items-center gap-2">
                                            <ExternalLink className="w-3.5 h-3.5" /> ABRIR EN DRIVE
                                        </button>
                                        <button className="w-full bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-colors flex justify-center items-center gap-2">
                                            <Tag className="w-3.5 h-3.5" /> ASIGNAR REQUISITO
                                        </button>
                                    </div>

                                    {/* Tech Details */}
                                    <div className="space-y-3">
                                        <div>
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">RUTA RELATIVA</label>
                                            <p className="text-xs font-mono text-slate-700 break-all bg-slate-50 p-2 rounded-lg border border-slate-100 mt-1">{selectedFile.relativePath || selectedFile.name}</p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><HardDrive className="w-3 h-3" /> TAMAÑO</label>
                                                <p className="text-[11px] font-bold text-slate-700 mt-0.5">{formatSize(selectedFile.sizeBytes)}</p>
                                            </div>
                                            <div>
                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><Calendar className="w-3 h-3" /> MODIFICADO</label>
                                                <p className="text-[11px] font-bold text-slate-700 mt-0.5">{formatDate(selectedFile.modifiedAt)}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">CLASIFICACIÓN</label>
                                            <p className="text-[11px] font-bold text-slate-700 mt-0.5">{selectedFile.category}</p>
                                        </div>

                                        <div>
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">POSIBLE REQUISITO</label>
                                            <div className="mt-1 flex flex-wrap gap-1">
                                                {selectedFile.possibleRequirementCodes?.length > 0 ? (
                                                    selectedFile.possibleRequirementCodes.map(code => (
                                                        <span key={code} className="text-[9px] font-black tracking-widest uppercase text-cyan-700 bg-cyan-100 px-2 py-1 border border-cyan-200 rounded">{code}</span>
                                                    ))
                                                ) : <span className="text-[10px] font-bold text-slate-400">Sin asociar</span>}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">DRIVE ID (TÉCNICO)</label>
                                            <p className="text-[9px] font-mono text-slate-400 break-all select-all mt-0.5">{selectedFile.driveFileId}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex items-center justify-center text-center">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 max-w-[200px]">Selecciona un archivo para ver sus detalles</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TAB: PROGRESO */}
            {activeTab === 'progreso' && (
                <div className="space-y-4">
                    {/* Summary bar */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Avance Documental Preliminar (por nombre/carpeta)</h3>
                            <span className="text-2xl font-black text-slate-800 tracking-tighter">{docProgress}%</span>
                        </div>
                        <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full transition-all duration-700" style={{ width: `${docProgress}%` }} />
                        </div>
                        <div className="flex justify-between mt-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            <span className="text-emerald-600">{foundCount} CON DOCUMENTO</span>
                            <span className="text-rose-500">{notFoundCount} SIN DOCUMENTO</span>
                        </div>
                        <p className="text-[9px] text-slate-400 font-bold mt-3">⚠ FOUND ≠ COMPLIANT. Esta es una coincidencia de nombre/carpeta, NO una validación normativa.</p>
                    </div>

                    {/* Requirements table */}
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
                            <table className="w-full text-left border-collapse min-w-[700px]">
                                <thead className="sticky top-0 bg-slate-50 z-10">
                                    <tr className="border-b border-slate-100 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                        <th className="px-4 py-3">CÓDIGO</th>
                                        <th className="px-4 py-3">REQUISITO</th>
                                        <th className="px-4 py-3 text-center">DOCUMENTO EN DRIVE</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {progressData.map(req => (
                                        <tr key={req.id} className="hover:bg-slate-50/60">
                                            <td className="px-4 py-3">
                                                <span className="text-[8px] font-black tracking-widest uppercase bg-slate-800 text-white px-2 py-0.5 rounded">{req.code}</span>
                                            </td>
                                            <td className="px-4 py-3 max-w-xs">
                                                <p className="text-[11px] font-bold text-slate-700 line-clamp-2">{req.title}</p>
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                {req.found ? (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded">
                                                        <CheckCircle2 className="w-3 h-3" /> FOUND
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-50 border border-rose-200 px-2 py-1 rounded">
                                                        <AlertCircle className="w-3 h-3" /> NOT FOUND
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
