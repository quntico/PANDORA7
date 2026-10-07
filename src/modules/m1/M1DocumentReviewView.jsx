import React, { useState } from 'react';
import { useM1Store } from './M1Store';
import { FileText, Cpu, CheckCircle2, AlertTriangle, Eye, ShieldCheck, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export const M1DocumentReviewView = () => {
    const { requirements, updateRequirement } = useM1Store();
    const API_BASE = import.meta.env.VITE_M1_API_BASE_URL || 'http://localhost:3001';

    const [selectedDoc, setSelectedDoc] = useState(null);
    const [loadingParse, setLoadingParse] = useState(false);

    // Flatten all linked documents across all requirements
    const allDocs = requirements.flatMap(req =>
        (req.evidenceLinks || []).map(link => ({
            ...link,
            requirementId: req.id,
            reqStatus: req.status
        }))
    );

    const handleParse = async (doc) => {
        setLoadingParse(true);
        setSelectedDoc({ ...doc, status: 'PARSING' });
        try {
            const res = await fetch(`${API_BASE}/api/m1/drive/parse`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driveFileId: doc.driveFileId,
                    mimeType: doc.mimeType || 'application/pdf',
                    fileName: doc.name
                })
            });
            const data = await res.json();

            if (data.success) {
                const parsed = data.parsedContext;

                // Update requirements store with parsed data directly into the link
                const req = requirements.find(r => r.id === doc.requirementId);
                const updatedLinks = req.evidenceLinks.map(l =>
                    l.id === doc.id ? { ...l, parsedData: parsed, reviewStatus: 'FILE_PARSED' } : l
                );
                updateRequirement(doc.requirementId, { evidenceLinks: updatedLinks });

                setSelectedDoc({ ...doc, parsedData: parsed, reviewStatus: 'FILE_PARSED' });
            } else {
                setSelectedDoc({ ...doc, error: data.error, reviewStatus: 'PARSER_ERROR' });
            }
        } catch (error) {
            console.error(error);
            setSelectedDoc({ ...doc, error: error.message, reviewStatus: 'PARSER_ERROR' });
        }
        setLoadingParse(false);
    };

    const handleAcceptClassification = (doc) => {
        const req = requirements.find(r => r.id === doc.requirementId);
        const updatedLinks = req.evidenceLinks.map(l =>
            l.id === doc.id ? { ...l, reviewStatus: 'HUMAN_REVIEWED' } : l
        );
        updateRequirement(doc.requirementId, { evidenceLinks: updatedLinks });
        setSelectedDoc({ ...doc, reviewStatus: 'HUMAN_REVIEWED' });
    };

    const handleAcceptEvidence = (doc) => {
        const req = requirements.find(r => r.id === doc.requirementId);
        const updatedLinks = req.evidenceLinks.map(l =>
            l.id === doc.id ? { ...l, reviewStatus: 'EVIDENCE_SUPPORTED' } : l
        );
        updateRequirement(doc.requirementId, { evidenceLinks: updatedLinks, status: 'COMPLIANT' });
        setSelectedDoc({ ...doc, reviewStatus: 'EVIDENCE_SUPPORTED' });
    };

    const StatusBadge = ({ status }) => {
        const st = status || 'FILE_LINKED';
        const colorMap = {
            'FILE_LINKED': 'bg-slate-200 text-slate-700',
            'PARSED': 'bg-blue-100 text-blue-700',
            'CLASSIFIED': 'bg-indigo-100 text-indigo-700',
            'EXTRACTED': 'bg-violet-100 text-violet-700',
            'HUMAN_REVIEWED': 'bg-amber-100 text-amber-700',
            'EVIDENCE_SUPPORTED': 'bg-emerald-100 text-emerald-700',
            'REJECTED': 'bg-rose-100 text-rose-700'
        };
        return <span className={cn("inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest", colorMap[st] || colorMap['FILE_LINKED'])}>{st}</span>;
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl bg-slate-900 shadow-xl border border-slate-800 text-white relative flex flex-col justify-center overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-3xl -mx-10 -my-10" />
                    <h3 className="text-[12px] font-black uppercase tracking-widest mb-2 z-10 flex items-center gap-2 text-fuchsia-400">
                        <Cpu className="w-4 h-4" /> OCR y NLP Ingesta
                    </h3>
                    <h2 className="text-3xl font-black mb-1 z-10 tracking-tight">Review de Documentos Motores</h2>
                    <p className="text-slate-400 text-xs font-bold w-3/4 z-10">Evaluación algorítmica sobre PDFs/DOCXs. Para obtener puntos reales, la evidencia debe escalar de FILE_LINKED a EVIDENCE_SUPPORTED con inspección semántica.</p>
                </div>
            </div>

            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden flex h-[600px]">

                {/* Left Sidebar - Doc List */}
                <div className="w-1/3 border-r border-slate-100 bg-slate-50 overflow-y-auto">
                    <h4 className="p-4 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                        Archivos Vinculados ({allDocs.length})
                    </h4>
                    <ul className="divide-y divide-slate-100">
                        {allDocs.map((doc, idx) => (
                            <li
                                key={idx}
                                onClick={() => setSelectedDoc(doc)}
                                className={cn(
                                    "p-4 cursor-pointer hover:bg-slate-100 transition-colors",
                                    selectedDoc?.id === doc.id && "bg-fuchsia-50 hover:bg-fuchsia-50 border-l-2 border-l-fuchsia-500"
                                )}
                            >
                                <div className="flex gap-3">
                                    <FileText className={cn("w-5 h-5 shrink-0", doc.reviewStatus === 'EVIDENCE_SUPPORTED' ? "text-emerald-500" : "text-fuchsia-400")} />
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold text-slate-700 truncate">{doc.name}</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5 truncate">
                                            Req: {doc.requirementId} | {doc.reviewStatus || 'FILE_LINKED'}
                                        </p>
                                    </div>
                                </div>
                            </li>
                        ))}
                        {allDocs.length === 0 && (
                            <div className="p-8 text-center text-[10px] font-black uppercase text-slate-400 tracking-widest leading-relaxed">
                                No hay archivos vinculados en el expediente actualmente.<br />Abre el checklist y enlaza evidencias.
                            </div>
                        )}
                    </ul>
                </div>

                {/* Right Content - Viewer */}
                <div className="flex-1 p-8 overflow-y-auto bg-white relative">
                    {!selectedDoc ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-300">
                            <Eye className="w-12 h-12 mb-4" />
                            <p className="text-[10px] font-black tracking-widest uppercase">Selecciona un documento para revisión semántica</p>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">

                            {/* Header Panel */}
                            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl">
                                <div className="mb-4">
                                    <StatusBadge status={selectedDoc.reviewStatus} />
                                </div>
                                <h3 className="text-xl font-black text-slate-800 tracking-tight break-words">{selectedDoc.name}</h3>
                                <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest font-mono">ID: {selectedDoc.driveFileId}</p>

                                <div className="mt-6 flex flex-wrap gap-2">
                                    <button
                                        onClick={() => handleParse(selectedDoc)}
                                        disabled={loadingParse}
                                        className="px-4 py-2 bg-slate-900 text-white rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-800"
                                    >
                                        <RefreshCw className={cn("w-3.5 h-3.5", loadingParse && "animate-spin")} /> Ejecutar Parse
                                    </button>

                                    {selectedDoc.parsedData && selectedDoc.reviewStatus !== 'HUMAN_REVIEWED' && selectedDoc.reviewStatus !== 'EVIDENCE_SUPPORTED' && (
                                        <button
                                            onClick={() => handleAcceptClassification(selectedDoc)}
                                            className="px-4 py-2 bg-amber-500 text-white rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-amber-600"
                                        >
                                            <Eye className="w-3.5 h-3.5" /> Revisión Humana - Aprobada
                                        </button>
                                    )}

                                    {selectedDoc.reviewStatus === 'HUMAN_REVIEWED' && (
                                        <button
                                            onClick={() => handleAcceptEvidence(selectedDoc)}
                                            className="px-4 py-2 bg-emerald-500 text-white rounded text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-emerald-600"
                                        >
                                            <ShieldCheck className="w-3.5 h-3.5" /> CONFIRMAR EVIDENCE_SUPPORTED
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Warning Panels */}
                            {(selectedDoc.parsedData?.warnings?.length > 0 || selectedDoc.parsedData?.errors?.length > 0) && (
                                <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl space-y-2">
                                    {(selectedDoc.parsedData.warnings || []).map((w, i) => (
                                        <p key={i} className="text-xs text-amber-700 font-bold flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {w}</p>
                                    ))}
                                    {(selectedDoc.parsedData.errors || []).map((e, i) => (
                                        <p key={i} className="text-xs text-rose-700 font-bold flex gap-2"><AlertTriangle className="w-4 h-4 shrink-0" /> {e}</p>
                                    ))}
                                </div>
                            )}

                            {/* Parsing Results */}
                            {selectedDoc.parsedData && (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-2">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Metadatos de Ingesta</h4>
                                        <p className="text-xs font-mono"><span className="text-slate-400 font-sans">Estatus:</span> {selectedDoc.parsedData.parserStatus}</p>
                                        <p className="text-xs font-mono"><span className="text-slate-400 font-sans">Motor:</span> {selectedDoc.parsedData.parserType} | <span className="text-slate-400 font-sans">Fullness:</span> {selectedDoc.parsedData.completeness}</p>
                                        <p className="text-xs font-mono"><span className="text-slate-400 font-sans">Metrics:</span> {selectedDoc.parsedData.pages} Pages/Slides | {selectedDoc.parsedData.durationMs}ms</p>
                                    </div>
                                    <div className="bg-fuchsia-50 border border-fuchsia-100 rounded-xl p-5 shadow-sm space-y-2">
                                        <h4 className="text-[10px] font-black text-fuchsia-400 uppercase tracking-widest mb-3 border-b border-fuchsia-100/50 pb-2">Entidades (Simuladas)</h4>
                                        {Object.entries(selectedDoc.parsedData.extractedFields || {}).map(([k, v]) => (
                                            <p key={k} className="text-xs font-bold text-fuchsia-800">{k}: <span className="text-fuchsia-600 font-normal">{v}</span></p>
                                        ))}
                                    </div>
                                    <div className="col-span-2 bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-100 pb-2">Raw Text Extract (Snapshot)</h4>
                                        <pre className="text-[10px] text-slate-600 font-mono whitespace-pre-wrap max-h-[300px] overflow-y-auto bg-white p-3 border border-slate-100 rounded">
                                            {selectedDoc.parsedData.rawText?.substring(0, 1500) || 'Sin contenido de texto.'}
                                            {(selectedDoc.parsedData.rawText?.length > 1500) && '\n\n[...TEXTO TRUNCADO EN SNAPSHOT UI...]'}
                                        </pre>
                                    </div>
                                </div>
                            )}

                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
