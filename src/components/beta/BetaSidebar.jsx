import React from 'react';
import { 
  Database, Layout, Layers, Terminal, Bookmark, FileText, 
  History, CheckSquare, GitBranch, Settings, Plus, 
  Box, Cpu, Globe, Share2, LogOut, ChevronRight, ShieldCheck
} from 'lucide-react';
import { useBeta } from '@/context/BetaContext';
import { useProject } from '@/context/ProjectContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

function BetaSidebar() {
  const { 
    activeProject, setActiveProject, projects, createProject,
    viewMode, setViewMode 
  } = useBeta();

  const { setAppMode } = useProject();
  const navigate = useNavigate();

  const handleExitBeta = () => {
    setAppMode('normal');
    navigate('/');
  };

  const navGroups = [
    {
      label: "ESPACIO DE TRABAJO",
      items: [
        { id: 'memory', label: "Memoria del Proyecto", icon: Cpu, count: 0 },
        { id: 'docs', label: "Documentación", icon: FileText, count: 12 },
        { id: 'history', label: "Historial de Capturas", icon: History, count: 42 },
      ]
    },
    {
      label: "MOTOR DEL PROYECTO",
      items: [
        { id: 'tasks', label: "Decisiones y Tareas", icon: CheckSquare, count: 8 },
        { id: 'versions', label: "Control de Versiones", icon: GitBranch, count: 3 },
        { id: 'tools', label: "Herramientas Conectadas", icon: Globe, count: 15 },
      ]
    }
  ];

  return (
    <aside className="w-[280px] h-full bg-[#050505] border-r border-[#151515] flex flex-col z-30 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
      {/* Beta Logo Section */}
      <div className="p-6 border-b border-[#151515] bg-gradient-to-b from-[#0A0A0A] to-transparent">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-purple to-neon-blue flex items-center justify-center shadow-glow-sm">
            <span className="text-white font-black text-lg">P</span>
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white leading-none">PANDORA</span>
            <span className="text-[10px] text-neon-purple font-black tracking-widest mt-0.5 uppercase">MODO BETA</span>
          </div>
        </div>
      </div>

      {/* Project Selector */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">PROYECTOS ACTIVOS</span>
          <button 
            onClick={() => createProject("Nuevo Proyecto " + (projects.length + 1))}
            className="p-1.5 rounded-md hover:bg-[#151515] text-gray-500 hover:text-white transition-all border border-transparent hover:border-[#222]"
            title="Nuevo Proyecto"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-1.5">
          {projects.map(p => (
            <button
              key={p.id}
              onClick={() => setActiveProject(p)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border group relative overflow-hidden",
                activeProject?.id === p.id 
                  ? "bg-[#111] border-[#333] text-white shadow-inner" 
                  : "bg-transparent border-transparent text-gray-500 hover:bg-[#0A0A0A] hover:text-gray-300"
              )}
            >
              <div className={cn(
                "w-1.5 h-1.5 rounded-full transition-all",
                p.status === 'active' || p.status === 'activo' ? "bg-neon-cyan shadow-glow-sm" : "bg-gray-600"
              )} />
              <div className="flex-1 truncate">
                <p className="text-sm font-semibold truncate leading-tight">{p.name}</p>
                <p className="text-[9px] text-gray-600 font-medium uppercase tracking-tighter">Actualizado: {p.lastUpdate || "Recientemente"}</p>
              </div>
              <ChevronRight className={cn(
                "w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity",
                activeProject?.id === p.id ? "text-neon-purple" : "text-gray-700"
              )} />
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-[#151515]">
          <button 
            onClick={() => setViewMode('admin')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all border group shadow-lg",
              viewMode === 'admin' 
                ? "bg-neon-purple/10 border-neon-purple/20 text-white" 
                : "bg-[#0A0A0A] border-[#151515] text-gray-500 hover:border-[#333] hover:text-white"
            )}
          >
            <ShieldCheck className={cn("w-4 h-4", viewMode === 'admin' ? "text-neon-purple" : "text-gray-600")} />
            <span className="text-xs font-black uppercase tracking-widest">Administración</span>
          </button>
        </div>
      </div>


      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-8">
        {navGroups.map(group => (
          <div key={group.label} className="space-y-1.5">
            <h3 className="px-3 text-[9px] font-black text-gray-600 uppercase tracking-[2px] mb-3">{group.label}</h3>
            {group.items.map(item => (
              <button
                key={item.id}
                onClick={() => {
                  setViewMode('admin');
                  setTimeout(() => {
                    const el = document.getElementById(`admin-${item.id}`);
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }, 100);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all border group",
                  viewMode === 'admin' ? "bg-transparent border-transparent text-gray-500 hover:bg-[#111] hover:text-white" : "bg-transparent text-gray-500 hover:bg-[#111] hover:text-white border border-transparent hover:border-[#1A1A1A]"
                )}
              >
                <item.icon className="w-4 h-4 text-gray-600 group-hover:text-neon-cyan transition-colors" />
                <span className="flex-1 text-xs font-semibold">{item.label}</span>
                {item.count > 0 && (
                  <span className="text-[9px] font-bold text-[#E0E0E0] px-1.5 py-0.5 rounded-full bg-[#1A1A1A]">
                    {item.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        ))}
      </div>

      {/* Footer Settings */}
      <div className="p-4 mt-auto border-t border-[#151515] space-y-2">
        <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-gray-500 hover:bg-[#111] hover:text-white transition-all group">
          <Settings className="w-4 h-4 group-hover:rotate-45 transition-transform" />
          <span className="text-xs font-semibold text-gray-400 group-hover:text-white transition-colors">Configuración Alfa</span>
        </button>

        <button 
          onClick={handleExitBeta}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">Salir Modo Beta</span>
        </button>
      </div>
    </aside>
  );
}

export default BetaSidebar;

