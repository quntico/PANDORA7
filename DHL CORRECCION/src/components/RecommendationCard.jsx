
import React from 'react';
import { CheckCircle2, ChevronRight, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

function RecommendationCard() {
  const recommendations = [
    "Optimizar costos operativos en fase inicial",
    "Asegurar contratos a largo plazo",
    "Diversificar base de proveedores"
  ];

  return (
    <div className="relative flex flex-col h-full rounded-2xl p-6 backdrop-blur-xl bg-gray-900/40 border border-green-500/30 shadow-[0_0_20px_rgba(34,197,94,0.1)] overflow-hidden group hover:border-green-500/50 transition-all">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50" />
      <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-green-500/10 blur-3xl rounded-full pointer-events-none" />

      <div className="flex items-center justify-between mb-6 relative z-10">
        <h3 className="text-lg font-semibold text-white">Dictamen General</h3>
        <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-bold shadow-sm">
          <CheckCircle2 className="w-4 h-4" />
          Viable
        </span>
      </div>

      <div className="flex-1 space-y-6 relative z-10">
        <div className="space-y-2">
          <p className="text-gray-300 leading-relaxed text-sm">
            El proyecto presenta indicadores financieros sólidos con un VAN positivo y una TIR superior a la tasa de descuento. El riesgo se considera moderado.
          </p>
        </div>

        <div className="space-y-3">
          <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center gap-2">
            <span className="w-1 h-1 rounded-full bg-green-500"></span> Recomendaciones
          </h4>
          <ul className="space-y-3">
            {recommendations.map((rec, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-gray-300 group/item">
                <div className="mt-0.5 p-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/20 group-hover/item:bg-green-500 group-hover/item:text-black transition-all">
                  <Check className="w-3 h-3" />
                </div>
                {rec}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/5 relative z-10">
        <Link to="/results" className="flex items-center text-sm font-medium text-green-400 hover:text-green-300 transition-colors group/link">
          Ver Proyecciones Detalladas
          <ChevronRight className="w-4 h-4 ml-1 group-hover/link:translate-x-1 transition-transform" />
        </Link>
      </div>
    </div>
  );
}

export default RecommendationCard;
