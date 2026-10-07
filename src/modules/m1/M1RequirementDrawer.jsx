import React, { useState } from 'react';
import { X, ExternalLink, Link2, UploadCloud, Save, FileText, CheckCircle2, History, AlertOctagon, User, Cloud } from 'lucide-react';
import { useM1Store } from './M1Store';
import { officialTenderRequirements, RejectionStatus } from './data/m1ActiveTender';
import { cn } from '@/lib/utils';

export const M1RequirementDrawer = ({ isOpen, onClose, requirementId }) => {
    const { updateRequirement, requirements } = useM1Store();

    // Always find the single source of truth for the base requirement
    const baseReq = officialTenderRequirements.find(r => r.id === requirementId);
    // Overlay any user-modified state from the store (status, responsible, uploads, etc)
    const storedState = requirements.find(r => r.id === requirementId) || {};

    const API_BASE = import.meta.env.VITE_M1_API_BASE_URL || 'http://localhost:3001';

    // Form active state
    const [toast, setToast] = useState(null);
    const [note, setNote] = useState("");

    // Drive Picker State
    const [showPicker, setShowPicker] = useState(false);
    const [driveFiles, setDriveFiles] = useState([]);
    const [loadingDrive, setLoadingDrive] = useState(false);

    if (!isOpen || !baseReq) return null;

    const currentStatus = storedState.status || baseReq.status;
    const currentResponsible = storedState.responsiblePerson || baseReq.responsiblePerson;

    const showToast = (msg, type = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSourceLink = () => {
        if (!baseReq.sourceUrl || baseReq.sourceUrl === "#") {
            showToast("Fuente oficial no vinculada aún en base de datos", "error");
            return;
        }
        window.open(baseReq.sourceUrl, "_blank", "noopener,noreferrer");
    };

    const handleAssign = (role) => {
        updateRequirement(requirementId, { responsiblePerson: role });
        showToast(`Responsable reasignado a: ${role}`);
    };

    const handleStatusChange = (newStatus) => {
        if (newStatus === 'COMPLIANT' && (baseReq.evidenceRequired?.length > 0) && !storedState.evidenceLinks?.length) {
            showToast("No se puede marcar como CUMPLE sin evidencia vinculada", "error");
            return;
        }
        updateRequirement(requirementId, { status: newStatus });
        showToast(`Estado actualizado: ${newStatus}`);
    };

    const handleOpenDrivePicker = async () => {
        setShowPicker(true);
        setLoadingDrive(true);
        try {
            const res = await fetch(`${API_BASE}/api/m1/drive/tree`);
            const data = await res.json();
            if (data.success) {
                setDriveFiles(data.files || []);
            } else {
                showToast("Error al obtener arbol de Drive", "error");
            }
        } catch (error) {
            console.error('Picker Error:', error);
            showToast("Sin conexión a Drive", "error");
        }
        setLoadingDrive(false);
    };

    const handleSelectDriveFile = (file) => {
        const link = {
            id: file.driveFileId,
            driveFileId: file.driveFileId,
            name: file.fileName,
            url: file.webViewLink,
            type: 'gdrive',
            uploadedAt: new Date().toISOString()
        };
        const currentLinks = storedState.evidenceLinks || [];
        updateRequirement(requirementId, { evidenceLinks: [...currentLinks, link] });
        setShowPicker(false);
        showToast("Evidencia vinculada desde Google Drive");
    };

    const handleAddNote = () => {
        if (!note.trim()) return;
        const currentNotes = storedState.auditorNotes || [];
        updateRequirement(requirementId, { auditorNotes: [...currentNotes, { text: note, date: new Date().toISOString() }] });
        setNote("");
        showToast("Nota añadida exitosamente");
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm">
            <div className="w-full md:w-[600px] h-full bg-slate-50 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="bg-slate-900 text-white p-6 shrink-0 flex items-start justify-between relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl -mx-10 -my-10" />
                    <div className="z-10">
                        <div className="flex gap-2 items-center mb-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">{baseReq.code}</span>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest text-slate-400">{baseReq.group}</span>
                        </div>
                        <h2 className="text-xl font-black tracking-tight leading-tight mb-2 pr-8">{baseReq.title}</h2>
                        <div className="flex gap-2">
                            <span className={cn("px-2 py-1 rounded text-[9px] font-black tracking-widest uppercase", currentStatus === 'COMPLIANT' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300')}>
                                {currentStatus}
                            </span>
                            {baseReq.rejectionStatus === RejectionStatus.CONFIRMED && (
                                <span className="px-2 py-1 rounded text-[9px] font-black tracking-widest uppercase bg-rose-500 text-white">Riesgo Desecho</span>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-full transition-colors z-10"><X className="w-5 h-5 text-slate-400" /></button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {toast && (
                        <div className={cn("p-3 rounded-xl border text-xs font-black uppercase tracking-widest flex items-center justify-between",
                            toast.type === 'error' ? "bg-rose-50 border-rose-200 text-rose-600" : "bg-emerald-50 border-emerald-200 text-emerald-600"
                        )}>
                            <span>{toast.msg}</span>
                            <button onClick={() => setToast(null)}><X className="w-3 h-3" /></button>
                        </div>
                    )}

                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 items-center flex gap-1"><FileText className="w-3 h-3" /> Requisito Exacto</h4>
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm text-sm text-slate-700 font-medium">
                            {baseReq.exactRequirementSummary}
                        </div>
                        <p className="text-xs text-slate-500 mt-2">{baseReq.description}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fuente de Origen</h4>
                            <div className="space-y-1 text-xs">
                                <p><span className="font-bold">Doc:</span> {baseReq.sourceDocumentName}</p>
                                <p><span className="font-bold">Sección:</span> {baseReq.sourceSection}</p>
                                <p><span className="font-bold">Loc:</span> {baseReq.sourceLocator}</p>
                            </div>
                            <button onClick={handleSourceLink} className="mt-3 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-black uppercase tracking-widest flex justify-center items-center gap-1 transition-colors">
                                <ExternalLink className="w-3 h-3" /> Abrir Fuente Activa
                            </button>
                        </div>

                        <div className="bg-white p-4 border border-slate-200 rounded-xl shadow-sm">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Responsabilidad</h4>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600"><User className="w-4 h-4" /></div>
                                <div>
                                    <p className="text-xs font-black text-slate-700">{currentResponsible}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Rol: {baseReq.ownerRole}</p>
                                </div>
                            </div>
                            <select
                                className="w-full text-[10px] uppercase font-bold text-slate-600 bg-slate-50 border-slate-200 rounded p-1.5 focus:outline-none"
                                value={currentResponsible}
                                onChange={(e) => handleAssign(e.target.value)}
                            >
                                <option value="SIN ASIGNAR">SIN ASIGNAR</option>
                                <option value="SMQ">SMQ</option>
                                <option value="TRS">TRS</option>
                                <option value="OEM">OEM</option>
                                <option value="LEGAL">LEGAL</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 items-center flex gap-1"><UploadCloud className="w-3 h-3" /> Evidencia ({(storedState.evidenceLinks || []).length} vinculadas)</h4>
                        <div className="bg-white border border-slate-200 rounded-xl p-2 space-y-2">
                            {(storedState.evidenceLinks || []).map((ev, i) => (
                                <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded text-xs border border-slate-100">
                                    <span className="font-bold flex items-center gap-2 max-w-full"><Link2 className="w-3 h-3 text-cyan-500" /> {ev.name}</span>
                                </div>
                            ))}
                            <div className="flex flex-col gap-2 p-2">
                                {!showPicker ? (
                                    <button onClick={handleOpenDrivePicker} className="py-2 bg-slate-100 hover:bg-cyan-50 hover:text-cyan-600 transition-colors text-slate-600 text-[10px] font-black uppercase tracking-widest rounded flex items-center justify-center gap-2 border border-slate-200">
                                        <Cloud className="w-3.5 h-3.5" /> Vincular desde Drive
                                    </button>
                                ) : (
                                    <div className="border border-slate-200 rounded p-2 bg-white max-h-48 overflow-y-auto">
                                        <div className="flex justify-between items-center mb-2 px-1">
                                            <span className="text-[9px] font-black uppercase text-slate-400">Seleccionar Archivo</span>
                                            <button onClick={() => setShowPicker(false)}><X className="w-3 h-3 text-slate-400" /></button>
                                        </div>
                                        {loadingDrive ? (
                                            <div className="text-[10px] text-center text-slate-400 font-bold p-4">Cargando...</div>
                                        ) : driveFiles.length === 0 ? (
                                            <div className="text-[10px] text-center text-slate-400 font-bold p-4">No hay archivos.</div>
                                        ) : (
                                            <ul className="space-y-1">
                                                {driveFiles.map(f => (
                                                    <li key={f.driveFileId} onClick={() => handleSelectDriveFile(f)} className="p-2 bg-slate-50 hover:bg-cyan-50 rounded cursor-pointer text-xs flex items-center gap-2 border border-transparent hover:border-cyan-100 transition-colors">
                                                        <FileText className="w-3 h-3 text-cyan-500 shrink-0" />
                                                        <span className="truncate text-slate-600 font-medium">{f.fileName}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 items-center flex gap-1"><History className="w-3 h-3" /> Ciclo Normativo</h4>
                        <div className="flex flex-wrap gap-2">
                            {['NOT_STARTED', 'IN_PROGRESS', 'PENDING_EVIDENCE', 'UNDER_REVIEW', 'COMPLIANT'].map(st => (
                                <button
                                    key={st}
                                    onClick={() => handleStatusChange(st)}
                                    className={cn("px-3 py-1.5 rounded text-[9px] font-black tracking-widest uppercase transition-colors border",
                                        currentStatus === st ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 hover:bg-slate-50 border-slate-200"
                                    )}
                                >
                                    {st}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><FileText className="w-3 h-3" /> Notas de Auditor</h4>
                        <div className="space-y-2 mb-2">
                            {(storedState.auditorNotes || []).map((n, i) => (
                                <div key={i} className="bg-amber-50 border border-amber-100 p-2 rounded text-xs text-amber-800">
                                    <p>{n.text}</p>
                                </div>
                            ))}
                        </div>
                        <div className="flex gap-2">
                            <input type="text" value={note} onChange={e => setNote(e.target.value)} placeholder="Añadir nota oficial a este requerimiento..." className="flex-1 border border-slate-200 p-2 text-xs rounded focus:outline-none focus:border-slate-400" />
                            <button onClick={handleAddNote} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded font-black text-[10px] uppercase tracking-widest">
                                Guardar
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    )
}
