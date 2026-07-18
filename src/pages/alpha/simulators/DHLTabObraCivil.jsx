import React from 'react';
import { Layers, Ruler, Building2 } from 'lucide-react';

export default function DHLTabObraCivil({ inputs, setInputs }) {
  const handleChange = (key, value) => {
    setInputs(prev => ({ ...prev, [key]: value }));
  };

  const numericFields = [
    { label: 'Excavación (m³)', key: 'civilExcavacionM3' },
    { label: "Resistencia Concreto (f'c)", key: 'civilConcretoFc' },
    { label: 'Espesor Piso (cm)', key: 'civilEspesorPisoCm' },
    { label: 'Carga Soportada (ton/m²)', key: 'civilCargaSoportada' },
    { label: 'Área Requerida (m²)', key: 'civilAreaRequeridaM2' }
  ];

  const textFields1 = [
    { label: 'Refuerzo de Piso', key: 'civilRefuerzoPiso' },
    { label: 'Acabado de Piso', key: 'civilAcabadoPiso' },
    { label: 'Juntas de Dilatación', key: 'civilJuntasDilatacion' }
  ];

  const textFields2 = [
    { label: 'Anclaje de Tornillos', key: 'civilAnclajeTornillos' },
    { label: 'Canalizaciones Subterráneas', key: 'civilCanalizacionesSubterraneas' },
    { label: 'Sistema Antivibración', key: 'civilSistemaVibracion' }
  ];

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden group hover:border-emerald-300 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -z-10 group-hover:bg-emerald-100 transition-colors" />
        <h3 className="text-xl font-black text-[#0D1A2A] mb-6 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600">
            <Layers className="w-4 h-4" />
          </span>
          Especificaciones de Obra Civil y Piso
        </h3>

        {/* Numeric fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          {numericFields.map(field => (
            <div key={field.key} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:border-emerald-300 transition-all shadow-inner group/item">
              <span className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 block group-hover/item:text-emerald-600 transition-colors">
                {field.label}
              </span>
              <input
                type="number"
                value={inputs[field.key]}
                onChange={e => handleChange(field.key, Number(e.target.value))}
                className="w-full bg-transparent text-2xl font-black text-[#0D1A2A] outline-none border-b border-slate-300 focus:border-emerald-500 transition-colors py-1"
              />
            </div>
          ))}
        </div>

        {/* Text fields */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Ruler className="w-4 h-4" /> Acabados y Refuerzos
            </h4>
            {textFields1.map(field => (
              <div key={field.key} className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-emerald-200 transition-colors">
                <span className="text-xs text-slate-400 block mb-1 uppercase font-bold">{field.label}</span>
                <input
                  type="text"
                  value={inputs[field.key]}
                  onChange={e => handleChange(field.key, e.target.value)}
                  className="w-full bg-transparent text-[#0D1A2A] font-medium outline-none focus:text-emerald-700 transition-colors"
                />
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Building2 className="w-4 h-4" /> Infraestructura
            </h4>
            {textFields2.map(field => (
              <div key={field.key} className="p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-emerald-200 transition-colors">
                <span className="text-xs text-slate-400 block mb-1 uppercase font-bold">{field.label}</span>
                <input
                  type="text"
                  value={inputs[field.key]}
                  onChange={e => handleChange(field.key, e.target.value)}
                  className="w-full bg-transparent text-[#0D1A2A] font-medium outline-none focus:text-emerald-700 transition-colors"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
