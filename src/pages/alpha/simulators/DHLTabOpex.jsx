import React from 'react';
import { BarChart2, Users, Wrench } from 'lucide-react';

export default function DHLTabOpex({ inputs, setInputs, results }) {
  const formatMxn = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);

  const handleChange = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-violet-300 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-50 rounded-bl-full -z-10 group-hover:bg-violet-100 transition-colors" />
        <h3 className="text-xl font-black text-[#0D1A2A] mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-violet-100 flex items-center justify-center text-violet-500">
            <BarChart2 className="w-4 h-4" />
          </span>
          Gastos Operativos (OPEX Mensual)
        </h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 flex items-center gap-2">
                <Users className="w-4 h-4" /> Mano de Obra
              </h4>
              <div className="space-y-2">
                {[
                  { label: 'Operadores por Turno', key: 'operadoresPorTurno', width: 'w-16' },
                  { label: 'Sueldo Operador (MXN)', key: 'sueldoOperadorMensual', width: 'w-24' },
                  { label: 'Supervisores por Turno', key: 'supervisoresPorTurno', width: 'w-16' },
                  { label: 'Sueldo Supervisor (MXN)', key: 'sueldoSupervisorMensual', width: 'w-24' }
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                    <span className="text-sm text-slate-700 font-medium">{item.label}</span>
                    <input
                      type="number"
                      value={inputs[item.key] || 0}
                      onChange={e => handleChange(item.key, Number(e.target.value))}
                      className={`${item.width} bg-white text-right text-[#0D1A2A] font-bold border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-colors`}
                    />
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-3 border-b border-slate-200 pb-1 flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Insumos y Mantenimiento
              </h4>
              <div className="space-y-2">
                {[
                  { label: 'Filtros / Químicos (MXN)', key: 'filtrosMensualMxn' },
                  { label: 'Refacciones (MXN)', key: 'refaccionesMensualMxn' },
                  { label: 'Lubricación (MXN)', key: 'lubricacionMensualMxn' },
                  { label: 'Limpieza (MXN)', key: 'limpiezaMensualMxn' },
                  { label: 'Consumibles (MXN)', key: 'consumiblesMensualMxn' },
                  { label: 'Otros (MXN)', key: 'otrosOpexMensualMxn' }
                ].map(item => (
                  <div key={item.key} className="flex items-center justify-between p-3 rounded-lg hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200">
                    <span className="text-sm text-slate-700 font-medium">{item.label}</span>
                    <input
                      type="number"
                      value={inputs[item.key] || 0}
                      onChange={e => handleChange(item.key, Number(e.target.value))}
                      className="w-24 bg-white text-right text-[#0D1A2A] font-bold border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-200 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="p-6 bg-gradient-to-r from-violet-50 to-white rounded-xl border border-violet-200">
              <span className="text-xs text-violet-500 font-bold uppercase tracking-widest block mb-1">Mano de Obra (Mensual)</span>
              <span className="text-2xl font-black text-[#0D1A2A]">{formatMxn(results?.manoObraMensualMxn)}</span>
            </div>
            <div className="p-6 bg-gradient-to-r from-orange-50 to-white rounded-xl border border-orange-200">
              <span className="text-xs text-orange-500 font-bold uppercase tracking-widest block mb-1">Mantenimiento (Mensual)</span>
              <span className="text-2xl font-black text-[#0D1A2A]">{formatMxn(results?.mantenimientoMensualMxn)}</span>
            </div>
            <div className="mt-auto p-6 bg-gradient-to-r from-cyan-50 to-white rounded-xl border border-[#00B5CC]/40 shadow-sm">
              <span className="text-xs text-[#00B5CC] font-bold uppercase tracking-widest block mb-1">OPEX Total Mensual</span>
              <span className="text-4xl font-black text-[#0D1A2A]">{formatMxn(results?.opexMensualMxn)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
