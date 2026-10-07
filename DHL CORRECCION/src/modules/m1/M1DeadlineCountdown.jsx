import React, { useState, useEffect } from 'react';
import { M1_DEADLINES } from './data/m1ActiveTender';
import { Clock, AlertOctagon, Timer, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export const M1DeadlineCountdown = () => {
    const deadlineConf = M1_DEADLINES.proposalSubmission;
    const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
    const [urgency, setUrgency] = useState('NORMAL');

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date().getTime();
            const distance = new Date(deadlineConf.dateTime).getTime() - now;

            if (distance < 0) {
                clearInterval(timer);
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
                setUrgency('CLOSED');
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            setTimeLeft({ days, hours, minutes, seconds });

            if (days <= 1) setUrgency('EMERGENCY');
            else if (days <= 3) setUrgency('CRITICAL');
            else if (days <= 7) setUrgency('HIGH');
            else if (days <= 10) setUrgency('ATTENTION');
            else setUrgency('NORMAL');

        }, 1000);

        return () => clearInterval(timer);
    }, [deadlineConf.dateTime]);

    // Format Absolute date
    const dObj = new Date(deadlineConf.dateTime);
    const months = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
    const absoluteDate = `${String(dObj.getDate()).padStart(2, '0')} ${months[dObj.getMonth()]} ${dObj.getFullYear()} · ${String(dObj.getHours()).padStart(2, '0')}:${String(dObj.getMinutes()).padStart(2, '0')} H`;

    // Semantic colors based on urgency
    const semantic = {
        'NORMAL': { box: 'bg-emerald-50/20 border-emerald-100', number: 'text-emerald-500', fill: 'bg-emerald-50', icon: 'text-emerald-500' },
        'ATTENTION': { box: 'bg-emerald-50/20 border-emerald-100', number: 'text-emerald-500', fill: 'bg-emerald-50', icon: 'text-emerald-500' },
        'HIGH': { box: 'bg-orange-50/50 border-orange-200', number: 'text-orange-600', fill: 'bg-orange-50', icon: 'text-orange-500' },
        'CRITICAL': { box: 'bg-rose-50 border-rose-200', number: 'text-rose-600', fill: 'bg-rose-50', icon: 'text-rose-600' },
        'EMERGENCY': { box: 'bg-rose-100 border-rose-300 shadow-[0_0_20px_rgba(225,29,72,0.3)]', number: 'text-rose-700', fill: 'bg-rose-600 text-white', icon: 'text-white' },
        'CLOSED': { box: 'bg-slate-50 border-slate-200', number: 'text-slate-400', fill: 'bg-slate-100', icon: 'text-slate-400' }
    };

    const currentStyle = semantic[urgency] || semantic.NORMAL;

    return (
        <div className={cn("relative overflow-hidden rounded-3xl border p-8 md:p-10 transition-all duration-1000 ease-in-out shadow-sm",
            urgency === 'EMERGENCY' ? "bg-rose-50 border-rose-200" :
                urgency === 'CRITICAL' ? "bg-white border-rose-100" :
                    urgency === 'HIGH' ? "bg-white border-orange-100" :
                        "bg-white border-slate-200"
        )}>
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-10 relative z-10 w-full relative">

                {/* Info Text Zone */}
                <div className="flex items-start gap-5">
                    <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border shadow-sm transition-colors duration-1000", currentStyle.fill, urgency === 'EMERGENCY' ? 'border-rose-500 flex' : 'border-current opacity-20 hidden md:flex text-transparent bg-transparent')}>
                        <Clock className={cn("w-7 h-7", urgency === 'EMERGENCY' ? "text-white" : currentStyle.icon)} />
                    </div>
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h3 className="text-[11px] font-black uppercase text-slate-500 tracking-widest flex items-center gap-2">
                                TIEMPO RESTANTE PARA PRESENTAR
                            </h3>
                            {urgency === 'CRITICAL' && (
                                <span className="bg-rose-100 text-rose-600 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-rose-200 animate-pulse flex items-center gap-1">
                                    <AlertOctagon className="w-3 h-3" /> VENTANA CRÍTICA
                                </span>
                            )}
                            {urgency === 'EMERGENCY' && (
                                <span className="bg-rose-600 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest border border-rose-500 animate-pulse flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> CIERRE INMINENTE
                                </span>
                            )}
                        </div>
                        <p className="text-slate-800 font-bold text-2xl md:text-3xl tracking-tight leading-none">{deadlineConf.label}</p>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-2">
                            <p className="text-sm font-bold text-slate-500 font-mono bg-slate-100 px-3 py-1 rounded inline-block">{absoluteDate}</p>
                            <p className="text-[10px] font-bold text-slate-400 font-mono">Zona: {deadlineConf.timezone} · Origen: {deadlineConf.sourceType}</p>
                        </div>
                    </div>
                </div>

                {/* Big Live Counter */}
                <div className="flex gap-2 sm:gap-4 justify-start xl:justify-end">

                    {[
                        { val: timeLeft.days, label: 'DÍAS' },
                        { val: timeLeft.hours, label: 'HORAS' },
                        { val: timeLeft.minutes, label: 'MIN' },
                        { val: timeLeft.seconds, label: 'SEG' }
                    ].map((unit, idx) => (
                        <div key={idx} className={cn(
                            "flex flex-col items-center justify-center rounded-2xl px-3 sm:px-6 py-4 min-w-[70px] sm:min-w-[100px] border shadow-sm transition-all duration-300",
                            currentStyle.box,
                            urgency === 'EMERGENCY' ? "bg-white" : ""
                        )}>
                            <span className={cn(
                                "text-4xl sm:text-5xl font-black tracking-tighter tabular-nums transition-colors duration-1000",
                                currentStyle.number
                            )}>
                                {String(unit.val || 0).padStart(2, '0')}
                            </span>
                            <span className={cn("text-[9px] sm:text-[10px] font-black uppercase tracking-widest mt-1 opacity-70", currentStyle.number)}>
                                {unit.label}
                            </span>
                        </div>
                    ))}

                </div>
            </div>
        </div>
    );
};
