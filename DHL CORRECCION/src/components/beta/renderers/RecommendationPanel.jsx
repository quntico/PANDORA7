
import React from 'react';
import { Target, CheckCircle2, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function RecommendationPanel({ status, text, bullets }) {
  const isPositive = status?.toLowerCase().includes('avanzar') || status?.toLowerCase().includes('viable');
  const isAlert = status?.toLowerCase().includes('riesgo') || status?.toLowerCase().includes('reservas');

  return (
    <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
      
      <div className="flex flex-col gap-3">
        {/* Badge de estado */}
        <div className={cn(
          'inline-flex items-center gap-2 px-3 py-1.5 rounded-full border w-fit',
          isPositive ? 'bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan' : 
          isAlert    ? 'bg-orange-500/10 border-orange-500/30 text-orange-400' :
                       'bg-white/5 border-white/10 text-white'
        )}>
          {isPositive ? <CheckCircle2 className="w-3.5 h-3.5" /> : isAlert ? <AlertCircle className="w-3.5 h-3.5" /> : <Target className="w-3.5 h-3.5" />}
          <span className="text-[9px] font-black uppercase tracking-[3px]">{status || 'ESTADO ESTRATÉGICO'}</span>
        </div>

        {/* Texto de recomendación */}
        {text && (
          <p 
            className="text-sm font-semibold text-white leading-relaxed text-justify outline-none border border-transparent focus:border-white/10 focus:bg-black/20 focus:p-3 focus:-mx-3 rounded-xl transition-all"
            contentEditable
            suppressContentEditableWarning
          >
            {text}
          </p>
        )}

        {/* Bullets de soporte */}
        {bullets && bullets.length > 0 && (
          <ul className="space-y-2 mt-2">
            {bullets.map((b, idx) => (
              <li key={idx} className="flex items-start gap-2 text-sm text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan/40 mt-2 flex-shrink-0" />
                <span 
                  className="outline-none border border-transparent focus:border-white/10 focus:bg-black/20 focus:px-2 rounded-lg flex-1 text-justify transition-all"
                  contentEditable
                  suppressContentEditableWarning
                >
                  {b}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
