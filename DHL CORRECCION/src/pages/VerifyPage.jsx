import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldCheck, Calendar, Activity, Factory } from 'lucide-react';

export default function VerifyPage() {
  const [searchParams] = useSearchParams();
  const [data, setData] = useState(null);

  useEffect(() => {
    const payload = searchParams.get('d');
    if (payload) {
      try {
        const decoded = JSON.parse(decodeURIComponent(escape(atob(payload))));
        setData(decoded);
      } catch (e) {
        console.error("Invalid QR payload", e);
        setData({ error: true });
      }
    } else {
      setData({ error: true });
    }
  }, [searchParams]);

  if (!data) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white font-sans p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-teal-500/20 border-t-teal-500 rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-sm">Verificando Certificado PANDORA...</p>
        </div>
      </div>
    );
  }

  if (data.error) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white font-sans p-6">
        <div className="text-center space-y-4 bg-[#0b0c10] border border-red-500/30 rounded-3xl p-8 max-w-md shadow-2xl">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
            <span className="text-red-500 text-2xl font-black">X</span>
          </div>
          <h1 className="text-xl font-black text-white">Certificado Inválido</h1>
          <p className="text-gray-400 text-sm">No se pudo verificar la autenticidad de este reporte en PANDORA.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans flex flex-col items-center justify-center p-6 relative overflow-hidden">
      
      {/* Background FX */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-teal-500/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="bg-[#0b0c10]/90 backdrop-blur-xl border border-teal-500/30 rounded-3xl p-8 max-w-lg w-full shadow-2xl relative z-10">
        <div className="flex justify-center mb-6">
          <div className="w-20 h-20 bg-teal-500/10 rounded-full flex items-center justify-center border border-teal-500/30 shadow-[0_0_30px_rgba(20,184,166,0.2)]">
            <ShieldCheck className="w-10 h-10 text-teal-400" />
          </div>
        </div>
        
        <h1 className="text-2xl font-black text-center mb-2 tracking-tight">CERTIFICADO OFICIAL PANDORA</h1>
        <p className="text-center text-teal-400 font-bold text-xs uppercase tracking-widest mb-8">Validación Exitosa</p>
        
        <div className="space-y-4">
          <div className="bg-[#14161f] rounded-2xl p-4 border border-slate-800">
            <div className="flex items-center gap-3 mb-2 text-gray-400">
              <Factory className="w-4 h-4 text-teal-500" />
              <span className="text-[10px] font-black uppercase tracking-widest">Proyecto Validado</span>
            </div>
            <div className="text-lg font-bold text-white">{data.p}</div>
            <div className="text-sm text-gray-500 mt-1">Cliente / Solicitante: {data.c}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-[#14161f] rounded-2xl p-4 border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-gray-400">
                <Activity className="w-4 h-4 text-teal-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Simulador</span>
              </div>
              <div className="text-sm font-bold text-white">{data.s}</div>
            </div>
            <div className="bg-[#14161f] rounded-2xl p-4 border border-slate-800">
              <div className="flex items-center gap-2 mb-2 text-gray-400">
                <Calendar className="w-4 h-4 text-teal-500" />
                <span className="text-[10px] font-black uppercase tracking-widest">Fecha de Emisión</span>
              </div>
              <div className="text-sm font-bold text-white">{data.d}</div>
            </div>
          </div>
        </div>

        <div className="mt-8 text-center border-t border-slate-800 pt-6">
          <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Hash Criptográfico de Integridad</p>
          <div className="font-mono text-[9px] text-teal-500/70 bg-teal-500/5 py-2 px-3 rounded-lg break-all">
            {data.h}
          </div>
          <p className="text-[10px] text-gray-400 mt-4 max-w-sm mx-auto leading-relaxed">
            Este documento ha sido generado y validado matemáticamente por el motor paramétrico PANDORA de SOLIMAQ S.A. de C.V.
          </p>
        </div>
      </div>
    </div>
  );
}
