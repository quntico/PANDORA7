import React, { useState } from 'react';
import { 
  Monitor, Layout, Layers, Maximize2, 
  Download, Clock, Zap, Search, Cpu, 
  ShieldCheck, Database, Activity, ChevronRight
} from 'lucide-react';
import { useBeta } from '@/context/BetaContext';
import ArtifactRenderer from './ArtifactRenderer';
import { cn } from '@/lib/utils';

function BetaSandbox() {
  const { artifacts, activeProject, loading } = useBeta();
  const [activeTab, setActiveTab] = useState('output'); // output | admin | context

  const tabs = [
    { id: 'output', label: 'RESULTADOS', icon: Layers },
    { id: 'admin', label: 'ADMINISTRACIÓN', icon: ShieldCheck },
    { id: 'context', label: 'CONTEXTO', icon: Database }
  ];

  return (
    <div className="flex-1 flex flex-col h-full bg-[#050505] relative overflow-hidden">
      {/* Background Technical Grid */}
      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#00F0FF 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }} />
      
      {/* Sandbox Main Header - MORE PROMINENT */}
      <div className="px-8 py-8 border-b border-[#151515] bg-gradient-to-b from-[#080808] to-[#050505] relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-5">
            <div className="relative">
              <div className="p-3.5 rounded-2xl bg-[#0A0A0A] border border-neon-cyan/30 text-neon-cyan shadow-glow-sm">
                <Monitor className="w-6 h-6" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-cyan opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-neon-cyan"></span>
              </span>
            </div>
            <div>
               <h1 className="text-2xl font-black text-white tracking-[6px] uppercase leading-none">SANDBOX</h1>
               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-[2px] mt-2">
                 Espacio de resultados y control de proyecto
               </p>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-3">
             <div className="flex items-center px-4 py-2 rounded-xl bg-[#0A0A0A] border border-[#151515] text-[10px] font-black text-gray-500 uppercase tracking-widest gap-2">
                <Activity className="w-3.5 h-3.5 text-neon-purple" />
                SISTEMA: EN LÍNEA
             </div>
          </div>
        </div>
        
        <div className="mt-8 flex flex-col gap-3">
           <span className="text-[9px] font-black text-gray-600 uppercase tracking-[3px] ml-1">SELECCIONA UNA VISTA DEL SANDBOX</span>
           <div className="flex items-center gap-2 bg-[#080808] p-1.5 rounded-2xl border border-[#151515] w-fit shadow-2xl">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-3 px-5 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer group",
                  activeTab === tab.id 
                    ? "bg-[#151515] text-white shadow-glow-sm border border-[#222]" 
                    : "text-gray-600 hover:text-gray-300 hover:bg-[#0D0D0D]"
                )}
              >
                <tab.icon className={cn("w-4 h-4 transition-colors", activeTab === tab.id ? "text-neon-cyan" : "text-gray-700 group-hover:text-gray-500")} />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* View Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-8 relative">
        {activeTab === 'output' && (
          <div className="animate-in fade-in duration-700 h-full flex flex-col">
            {artifacts.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center space-y-10">
                <div className="relative group">
                  <div className="w-40 h-40 rounded-full border border-dashed border-gray-800 flex items-center justify-center animate-spin-slow">
                    <div className="w-28 h-28 rounded-full border border-gray-800/50 flex items-center justify-center animate-spin-reverse-slow">
                      <Cpu className="w-12 h-12 text-gray-800 group-hover:text-neon-cyan transition-colors" />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-neon-cyan/5 blur-3xl rounded-full opacity-50 group-hover:opacity-100 transition-opacity" />
                </div>
                
                <div className="text-center space-y-5 max-w-[380px]">
                  <h3 className="text-xs font-black text-gray-400 uppercase tracking-[4px]">Esperando Resultados del Sistema</h3>
                  <p className="text-[12px] text-gray-600 font-bold uppercase leading-relaxed tracking-widest px-4">
                    Escribe una instrucción en el chat para materializar análisis, gráficas y entregables en este espacio.
                  </p>
                </div>

                {/* Ghost Panels */}
                <div className="w-full grid grid-cols-2 gap-6 opacity-20 filter grayscale mt-10">
                  <div className="h-32 rounded-3xl border border-dashed border-gray-800 bg-[#0A0A0A]/30 p-5 flex flex-col gap-3">
                    <div className="w-16 h-2.5 bg-gray-800 rounded" />
                    <div className="w-full h-1.5 bg-gray-900 rounded" />
                    <div className="w-3/4 h-1.5 bg-gray-900 rounded" />
                  </div>
                  <div className="h-32 rounded-3xl border border-dashed border-gray-800 bg-[#0A0A0A]/30 p-5 flex flex-col gap-3">
                    <div className="w-16 h-2.5 bg-gray-800 rounded" />
                    <div className="w-full h-1.5 bg-gray-900 rounded" />
                    <div className="w-3/4 h-1.5 bg-gray-900 rounded" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                 <div className="flex items-center gap-3 px-2">
                    <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[3px]">FLUJO DE RESULTADOS ACTIVOS</span>
                 </div>
                {[...artifacts].reverse().map((art) => (
                  <div key={art.id} className="group animate-in fade-in slide-in-from-right-4 duration-500">
                     <div className="flex items-center justify-between mb-4 px-2">
                       <div className="flex items-center gap-4">
                         <span className="text-[10px] font-black text-neon-cyan uppercase tracking-widest px-3 py-1 rounded-lg bg-neon-cyan/5 border border-neon-cyan/20">{art.type === 'chart' ? 'Gráfica' : 'Tabla'}</span>
                         <h4 className="text-[13px] font-black text-gray-200 uppercase tracking-widest">{art.title}</h4>
                       </div>
                       <button className="p-2 rounded-xl bg-[#0A0A0A] border border-[#151515] text-gray-500 hover:text-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer">
                          <Download className="w-4 h-4" />
                       </button>
                     </div>
                     <div className="bg-[#0A0A0A] border border-[#151515] rounded-[32px] overflow-hidden shadow-2xl group-hover:border-[#222] transition-all relative p-1">
                       <ArtifactRenderer artifact={art} />
                     </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'admin' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 h-full">
             <div className="p-10 rounded-[40px] border border-neon-purple/20 bg-gradient-to-br from-[#0A0A0A] to-[#050505] relative overflow-hidden group shadow-2xl">
                <div className="absolute top-0 right-0 p-8">
                   <ShieldCheck className="w-16 h-16 text-neon-purple opacity-5 group-hover:opacity-20 transition-opacity" />
                </div>
                <h3 className="text-sm font-black text-white uppercase tracking-[4px] mb-3">PANEL DE ADMINISTRACIÓN</h3>
                <p className="text-[12px] text-gray-500 font-bold uppercase tracking-widest mb-10 leading-relaxed max-w-md">
                  Gestión avanzada de privilegios y orquestación de recursos para el proyecto: <span className="text-neon-purple">{activeProject?.name || 'Pandora'}</span>.
                </p>
                
                <div className="grid grid-cols-1 gap-4">
                   {[
                     { label: 'Registros de Acceso', icon: History },
                     { label: 'Protocolo de Seguridad v4', icon: ShieldCheck },
                     { label: 'Espejo de Base de Datos', icon: Database },
                     { label: 'Webhooks de Sistema', icon: Zap }
                   ].map(item => (
                     <div key={item.label} className="flex items-center justify-between p-5 rounded-2xl bg-[#080808] border border-[#151515] hover:border-neon-purple/30 transition-all group cursor-pointer hover:shadow-lg">
                        <div className="flex items-center gap-4">
                           <item.icon className="w-5 h-5 text-gray-700 group-hover:text-neon-purple transition-colors" />
                           <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest group-hover:text-white transition-colors">{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-800 group-hover:text-neon-purple group-hover:translate-x-1 transition-all" />
                     </div>
                   ))}
                </div>
             </div>
          </div>
        )}

        {activeTab === 'context' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 h-full">
             <div className="flex items-center gap-5 p-6 rounded-3xl bg-[#0D0D0D] border border-[#1A1A1A] shadow-xl">
                <div className="w-14 h-14 rounded-2xl bg-neon-cyan/10 flex items-center justify-center border border-neon-cyan/20">
                   <Database className="w-7 h-7 text-neon-cyan" />
                </div>
                <div>
                   <h4 className="text-[13px] font-black text-white uppercase tracking-widest">Motor de Contexto Activo</h4>
                   <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[2px] mt-1">6,420 tokens en memoria activa</p>
                </div>
             </div>
             
             <div className="grid grid-cols-1 gap-4 mt-4">
                <div className="p-8 rounded-[32px] bg-[#0A0A0A] border border-[#151515] space-y-6 shadow-2xl">
                   <div className="flex items-center justify-between border-b border-[#151515] pb-4">
                      <p className="text-[11px] font-black text-gray-400 uppercase tracking-widest">VARIABLES GLOBALES</p>
                      <Zap className="w-4 h-4 text-neon-cyan animate-pulse" />
                   </div>
                   <div className="space-y-4">
                      <div className="flex justify-between items-center group">
                        <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-400 transition-colors uppercase tracking-widest">OBJETIVO_ROI</span>
                        <span className="text-[13px] font-black text-neon-cyan bg-neon-cyan/5 px-3 py-1 rounded-lg border border-neon-cyan/10">24.5%</span>
                      </div>
                      <div className="flex justify-between items-center group">
                        <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-400 transition-colors uppercase tracking-widest">TOLERANCIA_RIESGO</span>
                        <span className="text-[13px] font-black text-neon-cyan bg-neon-cyan/5 px-3 py-1 rounded-lg border border-neon-cyan/10">MEDIA_BAJA</span>
                      </div>
                      <div className="flex justify-between items-center group">
                        <span className="text-[11px] font-bold text-gray-600 group-hover:text-gray-400 transition-colors uppercase tracking-widest">PRIORIDAD_SISTEMA</span>
                        <span className="text-[13px] font-black text-neon-cyan bg-neon-cyan/5 px-3 py-1 rounded-lg border border-neon-cyan/10">CRÍTICA</span>
                      </div>
                   </div>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* Footer Status Bar - SPANISH */}
      <div className="px-8 py-5 border-t border-[#151515] bg-[#050505] flex items-center justify-between z-10">
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-2.5">
               <div className="w-2.5 h-2.5 rounded-full bg-neon-cyan shadow-glow-sm animate-pulse" />
               <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">SINCRONIZACIÓN ESTABLE</span>
            </div>
            <div className="h-4 w-px bg-gray-800" />
            <div className="flex items-center gap-2.5">
               <Cpu className="w-4 h-4 text-gray-700" />
               <span className="text-[10px] font-bold text-gray-700 uppercase tracking-widest">ENLACE NEURONAL ACTIVO</span>
            </div>
         </div>
         
         <button className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-neon-cyan/5 border border-neon-cyan/10 text-neon-cyan text-[10px] font-black uppercase tracking-widest hover:bg-neon-cyan/10 transition-all shadow-glow-sm cursor-pointer">
           MODO VISTA EN VIVO
         </button>
      </div>
    </div>
  );
}

function BoxIcon({ className, ...props }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} {...props}>
            <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>
        </svg>
    );
}

export default BetaSandbox;

