import React, { useState } from 'react';
import { M1ClarificationsData, compareNormativeRule, officialTenderRequirements } from './data/m1ActiveTender';
import { FileText, MessagesSquare, CheckCircle, RefreshCw, Layers, ZoomIn } from 'lucide-react';
import { cn } from '@/lib/utils';

export const M1ClarificationsView = () => {

    // We only have one meeting loaded currently
    const activeMeeting = M1ClarificationsData.meetings[0];

    // Derived KPIs
    const resolvedQuestions = activeMeeting.questions.length;
    const rulesModified = activeMeeting.modifications.length + activeMeeting.questions.filter(q => q.normativeEffect === 'MODIFIED' || q.normativeEffect === 'CLARIFIED').length;

    const [selectedQuestion, setSelectedQuestion] = useState(null);

    const kpis = [
        { label: "Juntas de Aclaraciones", val: M1ClarificationsData.meetings.length, icon: Layers, color: "text-slate-500" },
        { label: "Preguntas / Respuestas", val: resolvedQuestions, icon: MessagesSquare, color: "text-blue-500" },
        { label: "Reglas Aclaradas/Modificadas", val: rulesModified, icon: RefreshCw, color: "text-amber-500" },
        { label: "Conflictos Pendientes", val: 1, icon: FileText, color: "text-orange-500" },
        { label: "Dataset Normativo", val: M1ClarificationsData.meetings.length > 0 ? "INCOMPLETE" : "CURRENT", icon: CheckCircle, color: "text-rose-500" },
    ];

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300 w-full">

            {/* Header */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 rounded-3xl bg-slate-900 shadow-xl border border-slate-800 text-white relative overflow-hidden flex flex-col justify-center">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl -mx-10 -my-10" />
                    <h3 className="text-[12px] font-black text-violet-400 uppercase tracking-widest mb-2 z-10 flex items-center gap-2">
                        <MessagesSquare className="w-4 h-4" /> Autoridad Normativa
                    </h3>
                    <h2 className="text-3xl font-black mb-1 z-10 tracking-tight">Motor de Aclaraciones (Juntas)</h2>
                    <p className="text-slate-400 text-xs font-bold w-3/4 z-10">Control maestro de prelación normativa (Las Juntas derogan las Bases). Se muestran explícitamente los efectos de la interacción con el convocante.</p>
                </div>
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {kpis.map((kpi, idx) => {
                    const Icon = kpi.icon;
                    return (
                        <div key={idx} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm flex flex-col justify-between items-center text-center">
                            <h4 className={cn("text-xl font-black tracking-tight", kpi.color)}>{kpi.val}</h4>
                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-tight mt-1">{kpi.label}</p>
                        </div>
                    )
                })}
            </div>

            {/* Clarification Records */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-violet-50 text-violet-500 rounded-xl">
                            <RefreshCw className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 tracking-tight leading-none mb-1">REGISTRO DE PREGUNTAS Y ACTUALIZACIONES</h2>
                            <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{activeMeeting.documentName} </h3>
                        </div>
                    </div>
                </div>

                <div className="w-full overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1200px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest max-w-[50px]">#</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">PREGUNTA / PARTICIPANTE</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">RESPUESTA OFICIAL</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">EFECTO NORMATIVO</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">TEMA M1</th>
                                <th className="px-5 py-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">DIFF / ANÁLISIS</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {activeMeeting.questions.map(q => (
                                <tr key={q.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="px-5 py-4 text-xs font-black text-slate-500">
                                        Q-{q.questionNumber}
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-xs font-bold text-slate-700 italic max-w-sm">"{q.question}"</p>
                                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">POR: {q.participant}</p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="text-xs font-medium text-slate-600 max-w-md bg-slate-50 p-2 rounded border border-slate-100 border-l-2 border-l-violet-500">{q.officialAnswer}</p>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className={cn("px-2 py-1 rounded text-[8px] font-black tracking-widest uppercase",
                                            q.normativeEffect === 'CLARIFIED' ? "bg-amber-100 text-amber-700" :
                                                q.normativeEffect === 'MODIFIED' ? "bg-violet-100 text-violet-700" :
                                                    "bg-slate-100 text-slate-500"
                                        )}>
                                            {q.normativeEffect}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-bold tracking-widest uppercase text-slate-500">
                                            {q.topic}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4 text-center">
                                        <button onClick={() => setSelectedQuestion(q)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-violet-50 hover:bg-violet-100 text-violet-600 transition-colors text-[9px] font-black uppercase tracking-widest">
                                            <ZoomIn className="w-3 h-3" /> Ver Diff
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal Diff */}
            {selectedQuestion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight">Análisis Diff Normativo</h2>
                                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pregunta Q-{selectedQuestion.questionNumber}</h3>
                            </div>
                            <button onClick={() => setSelectedQuestion(null)} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full text-xs font-black uppercase tracking-widest transition-colors">Cerrar</button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 border border-rose-200 bg-rose-50 rounded-xl relative">
                                    <span className="absolute top-2 right-2 text-[8px] font-black text-rose-500 bg-rose-100 px-1.5 py-0.5 uppercase tracking-widest rounded-full">Base Anterior</span>
                                    <p className="text-sm font-medium text-rose-800 mt-4 line-through decoration-rose-300">{selectedQuestion.previousRule}</p>
                                </div>
                                <div className="p-4 border border-emerald-200 bg-emerald-50 rounded-xl relative">
                                    <span className="absolute top-2 right-2 text-[8px] font-black text-emerald-500 bg-emerald-100 px-1.5 py-0.5 uppercase tracking-widest rounded-full">Activa (Efectivo)</span>
                                    <p className="text-sm font-bold text-emerald-800 mt-4">{selectedQuestion.effectiveRule}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded">Fecha Activa: {selectedQuestion.effectiveFrom}</span>
                                <span className="text-[9px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded">Req. Afectados: {selectedQuestion.affectedRequirementIds.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
