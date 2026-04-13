
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Info, X, Target, Brain, Factory, Search, Landmark, Scale, Leaf, AlertTriangle, Link, Settings, Star } from 'lucide-react';

const METHODOLOGY_GUIDE = [
  { icon: <Search/>, title: "1. Exploración", desc: "Sentido lógico del proyecto y actores principales." },
  { icon: <Target/>, title: "2. Mercado", desc: "Verificación de demanda real, precios y competencia." },
  { icon: <Factory/>, title: "3. Técnica", desc: "Viabilidad de la ingeniería, procesos operativos y maquinaria." },
  { icon: <Landmark/>, title: "4. Financiera", desc: "Análisis de CAPEX, OPEX, Ingresos y Retorno (ROI)." },
  { icon: <Scale/>, title: "5. Legal", desc: "Cumplimiento normativo, contratos y permisos requeridos." },
  { icon: <Leaf/>, title: "6. Socio-Ambiental", desc: "Impacto ecológico y nivel de aceptación en comunidad local." },
  { icon: <AlertTriangle/>, title: "7. Riesgos", desc: "Identificación de amenazas críticas que puedan colapsar la operación." },
  { icon: <Link/>, title: "8. Integración", desc: "Coherencia cruzada (Ej: Mercado bueno pero Técnica deficiente)." },
  { icon: <Settings/>, title: "9. Estructuración", desc: "Modelo de inversión, roles y estrategia de salida o escalabilidad." },
  { icon: <Star/>, title: "Métricas Clave", desc: "CERTEZA: Confiabilidad de los datos. SCORE: Puntuación algorítmica de viabilidad global (0 a 100)." }
];

export default function ExecutiveTable({ title, columns, headers, rows }) {
  const [showInfo, setShowInfo] = useState(false);
  
  if (!rows?.length) return null;

  const actualColumns = columns || headers || [];
  const isEvaluationTable = String(title).toUpperCase().includes('FASE') || String(title).toUpperCase().includes('EVALUACIÓN');

  return (
    <div className="p-8 rounded-[48px] bg-white/[0.01] border border-white/5 shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan animate-pulse shadow-glow-sm" />
          <h4 className="text-[10px] font-black uppercase tracking-[5px] text-gray-500 group-hover:text-neon-cyan/50 transition-colors uppercase">{title || 'TABLA DE ANÁLISIS ESTRATÉGICO'}</h4>
        </div>
        
        {isEvaluationTable && (
          <button 
            onClick={() => setShowInfo(!showInfo)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/10 hover:border-neon-cyan/50 hover:bg-neon-cyan/10 transition-all text-gray-400 hover:text-neon-cyan"
          >
            <Info className="w-4 h-4" />
            <span className="text-[9px] font-black uppercase tracking-wider">Metodología</span>
          </button>
        )}
      </div>

      <AnimatePresence>
        {showInfo && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-8 overflow-hidden"
          >
            <div className="p-6 rounded-3xl bg-[#0A0A0A] border border-neon-cyan/20">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {METHODOLOGY_GUIDE.map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-neon-cyan/10 flex items-center justify-center flex-shrink-0 text-neon-cyan border border-neon-cyan/20">
                      {React.cloneElement(item.icon, { className: "w-4 h-4" })}
                    </div>
                    <div>
                      <h5 className="text-[10px] font-black text-white uppercase tracking-wider mb-1">{item.title}</h5>
                      <p className="text-[11px] text-gray-400 leading-snug">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-left border-separate border-spacing-y-2">
          <thead>
            <tr>
              {actualColumns.map((col, idx) => (
                <th
                  key={idx}
                  className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-600 border-b border-white/5 pb-6"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y-0">
            {rows.map((row, rowIdx) => (
              <tr key={rowIdx} className="hover:bg-white/[0.03] transition-all group/row">
                {row.map((cell, cellIdx) => (
                  <td
                    key={cellIdx}
                    className="px-6 py-5 text-sm font-medium text-gray-400 group-hover/row:text-white first:rounded-l-2xl last:rounded-r-2xl first:border-l last:border-r border-transparent group-hover/row:border-neon-cyan/10 transition-all"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
