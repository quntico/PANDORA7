import React from 'react';
import { DollarSign, TrendingUp } from 'lucide-react';

export default function DHLTabCapex({ inputs, setInputs, results }) {
  const formatMxn = (val) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(val || 0);

  const handleChange = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-[#00B5CC]/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-50 rounded-bl-full -z-10 group-hover:bg-cyan-100 transition-colors" />
        <h3 className="text-xl font-black text-[#0D1A2A] mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center text-[#00B5CC]">
            <DollarSign className="w-4 h-4" />
          </span>
          Estructura de Capital (CAPEX)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#00B5CC]/40 transition-all shadow-inner">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 block">Precio del Equipo (USD)</span>
            <input
              type="number"
              value={inputs.precioEquipoUsd}
              onChange={e => handleChange('precioEquipoUsd', Number(e.target.value))}
              className="w-full bg-transparent text-2xl font-black text-[#0D1A2A] border-b border-slate-300 focus:border-[#00B5CC] outline-none py-1 transition-colors"
            />
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-[#00B5CC]/40 transition-all shadow-inner">
            <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 block">Tipo de Cambio (MXN/USD)</span>
            <input
              type="number"
              value={inputs.tipoCambio}
              onChange={e => handleChange('tipoCambio', Number(e.target.value))}
              className="w-full bg-transparent text-2xl font-black text-[#0D1A2A] border-b border-slate-300 focus:border-[#00B5CC] outline-none py-1 transition-colors"
            />
          </div>
          <div className="p-4 bg-gradient-to-br from-cyan-50 to-white rounded-xl border border-[#00B5CC]/30 flex flex-col justify-center">
            <span className="text-xs text-[#00B5CC] font-bold uppercase tracking-wider mb-1">Costo Base (MXN)</span>
            <span className="text-3xl font-black text-[#0D1A2A]">{formatMxn(results?.baseMxn)}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm">
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Gastos de Integración (%)</h4>
          <div className="space-y-3">
            {[
              { label: 'Maniobras y Fletes', key: 'porcentajeManiobras' },
              { label: 'Montaje Mecánico', key: 'porcentajeMontajeMecanico' },
              { label: 'Obra Civil / Piso', key: 'porcentajeObraCivil' },
              { label: 'Instalación Eléctrica', key: 'porcentajeElectricoPrincipal' },
              { label: 'Canalización y Protecciones', key: 'porcentajeCanalizacionProtecciones' },
              { label: 'Seguridad Industrial', key: 'porcentajeSeguridadIndustrial' },
              { label: 'Ingeniería y Supervisión', key: 'porcentajeIngenieriaSupervision' },
              { label: 'Contingencia', key: 'porcentajeContingencia' }
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors">
                <span className="text-sm text-slate-700 font-medium">{item.label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={inputs[item.key]}
                    onChange={e => handleChange(item.key, Number(e.target.value))}
                    className="w-16 bg-white text-right text-[#0D1A2A] font-bold border border-slate-300 rounded-lg px-2 py-1 outline-none focus:border-[#00B5CC] focus:ring-1 focus:ring-[#00B5CC]/20 transition-colors"
                  />
                  <span className="text-slate-400 font-bold">%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4 border-b border-slate-200 pb-2">Desglose de Costos (MXN)</h4>
            <div className="space-y-3">
              {[
                { label: 'Maniobras', key: 'maniobras' },
                { label: 'Montaje Mecánico', key: 'montaje' },
                { label: 'Obra Civil', key: 'obraCivil' },
                { label: 'Eléctrico', key: 'electrico' },
                { label: 'Ingeniería', key: 'ingenieria' }
              ].map(item => (
                <div key={item.key} className="flex justify-between text-sm py-1 border-b border-slate-100">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="text-[#0D1A2A] font-bold">{formatMxn(results?.capexItems?.[item.key])}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-8 p-6 bg-gradient-to-r from-cyan-50 to-white rounded-xl border border-[#00B5CC]/30">
            <span className="text-xs text-[#00B5CC] font-bold uppercase tracking-widest block mb-1">CAPEX Total Instalado</span>
            <span className="text-4xl font-black text-[#0D1A2A]">{formatMxn(results?.capexInstaladoMxn)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
