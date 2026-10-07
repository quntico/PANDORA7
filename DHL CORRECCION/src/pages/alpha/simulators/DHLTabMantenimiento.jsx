import React from 'react';
import { Activity, Cpu, Wrench, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function DHLTabMantenimiento({ inputs, setInputs }) {
  const handleChange = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const riskColor = (val) => {
    if (val === 'critico') return 'text-red-600 bg-red-50 border-red-200';
    if (val === 'alto') return 'text-orange-600 bg-orange-50 border-orange-200';
    if (val === 'medio') return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-emerald-600 bg-emerald-50 border-emerald-200';
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-orange-300 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-bl-full -z-10 group-hover:bg-orange-100 transition-colors" />
        <h3 className="text-xl font-black text-[#0D1A2A] mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-orange-500">
            <Wrench className="w-4 h-4" />
          </span>
          Riesgos Operativos y Mantenimiento
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Riesgo de Polvo / Lodos', key: 'riesgoPolvo' },
            { label: 'Riesgo de Incendio', key: 'riesgoIncendio' },
            { label: 'Riesgo de Metal', key: 'riesgoMetal' },
            { label: 'Nivel de Ruido', key: 'riesgoRuido' }
          ].map(risk => (
            <div key={risk.key} className={`p-4 rounded-xl border transition-all shadow-sm ${riskColor(inputs[risk.key] || 'bajo')}`}>
              <span className="text-xs font-bold uppercase tracking-wider mb-2 block opacity-80">{risk.label}</span>
              <select
                value={inputs[risk.key] || 'bajo'}
                onChange={e => handleChange(risk.key, e.target.value)}
                className="w-full bg-transparent text-lg font-bold outline-none cursor-pointer"
              >
                <option value="bajo">Bajo</option>
                <option value="medio">Medio</option>
                <option value="alto">Alto</option>
                <option value="critico">Crítico</option>
              </select>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 flex items-center gap-2">
              <Cpu className="w-4 h-4" /> Sistemas Requeridos
            </h4>
            <div className="space-y-2">
              {[
                { label: 'Extracción de Polvo / Humedad', key: 'requiereExtraccionPolvo' },
                { label: 'Sistema Contra Incendio', key: 'requiereSistemaContraIncendio' },
                { label: 'Cabina Acústica', key: 'requiereCabinaAcustica' },
                { label: 'Procedimiento LOTO', key: 'requiereLOTO' },
                { label: 'Guardas de Seguridad', key: 'requiereGuardas' },
                { label: 'Paros de Emergencia (E-Stop)', key: 'requiereEStop' }
              ].map(sys => (
                <div key={sys.key} className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer" onClick={() => handleChange(sys.key, !inputs[sys.key])}>
                  <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${inputs[sys.key] ? 'bg-[#00B5CC] border-[#00B5CC] text-white' : 'border-slate-300 bg-white'}`}>
                    {inputs[sys.key] && <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>
                  <span className="text-sm text-slate-700 font-medium">{sys.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 flex items-center gap-2">
              <Activity className="w-4 h-4" /> Tiempos y Disponibilidad
            </h4>
            <div className="space-y-3">
              {[
                { label: 'Frecuencia Mantenimiento (Horas)', key: 'frecuenciaMantenimientoHoras' },
                { label: 'Vida Útil Filtros (Horas)', key: 'vidaUtilCuchillasHoras' },
                { label: 'Disponibilidad Mecánica (%)', key: 'disponibilidadMecanica' },
                { label: 'Factor de Paro Imprevisto (%)', key: 'factorParo' }
              ].map(item => (
                <div key={item.key} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex justify-between items-center">
                  <span className="text-sm text-slate-700 font-medium">{item.label}</span>
                  <input
                    type="number"
                    value={inputs[item.key]}
                    onChange={e => handleChange(item.key, Number(e.target.value))}
                    className="w-24 bg-white text-right text-[#0D1A2A] font-bold border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-[#00B5CC] focus:ring-1 focus:ring-[#00B5CC]/20 transition-colors"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
