import React from 'react';
import { Layers, Activity, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';

function SimulatorsPage() {
  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 relative overflow-hidden">
      {/* Background accents */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-neon-cyan/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-neon-purple/5 blur-[120px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto space-y-8 mt-4 relative z-10">
        <div className="flex flex-col gap-2 border-b border-[#1A1A1A] pb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-neon-cyan/5 border border-neon-cyan/20 flex items-center justify-center shadow-inner group overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Layers className="w-7 h-7 text-neon-cyan group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-3">
                Hub de Simuladores
                <span className="px-2.5 py-1 rounded-md bg-neon-cyan/10 border border-neon-cyan/20 text-[10px] text-neon-cyan tracking-widest animate-pulse">
                  EN ESPERA
                </span>
              </h1>
              <p className="text-gray-500 mt-1.5 font-medium tracking-wide">Centro de control unificado para cargar y ejecutar entornos de simulación avanzados.</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4">
          {/* RYDER Simulator */}
          <Link to="/alpha/simulators/rider" className="flex flex-col items-center justify-center text-center h-[280px] p-8 rounded-3xl bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-[#1A1A1A] hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] transition-all group relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="w-20 h-20 rounded-2xl bg-[#151515] border border-[#222] flex items-center justify-center mb-6 shadow-inner group-hover:border-blue-500/50 transition-colors relative">
              <div className="absolute inset-0 rounded-2xl border-2 border-transparent border-t-blue-500/50 opacity-0 group-hover:opacity-100 group-hover:animate-spin-slow" />
              <Activity className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform" />
            </div>
            
            <h3 className="text-xl font-black text-white tracking-widest uppercase">RYDER</h3>
            <p className="text-xs text-gray-500 mt-2 max-w-[220px] leading-relaxed group-hover:text-gray-400 transition-colors">
              Simulador de Velocidad vs Cajas para línea de lavado y secado (140 m/h max).
            </p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default SimulatorsPage;
