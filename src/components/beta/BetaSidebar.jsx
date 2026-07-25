import React, { useState, useEffect } from 'react';
import { 
  Database, Layout, Layers, Terminal, Bookmark, FileText, 
  History, CheckSquare, GitBranch, Settings, Plus, 
  Box, Cpu, Globe, Share2, LogOut, ChevronRight, ShieldCheck, Activity
} from 'lucide-react';
import { useBeta } from '@/context/BetaContext';
import { useProject } from '@/context/ProjectContext';
import { useTranslation } from '@/context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

function BetaSidebar() {
  const { 
    activeProject, setActiveProject, projects, createProject,
    viewMode, setViewMode 
  } = useBeta();
  const { t } = useTranslation();

  const [customLogo, setCustomLogo] = useState(() => {
    return localStorage.getItem('pandora_beta_custom_logo') || localStorage.getItem('pandora_custom_logo') || null;
  });

  useEffect(() => {
    const updateLogo = () => {
      const saved = localStorage.getItem('pandora_beta_custom_logo') || localStorage.getItem('pandora_custom_logo');
      if (saved) setCustomLogo(saved);
    };
    window.addEventListener('storage', updateLogo);
    window.addEventListener('pandora_logo_update', updateLogo);
    return () => {
      window.removeEventListener('storage', updateLogo);
      window.removeEventListener('pandora_logo_update', updateLogo);
    };
  }, []);

  const handleLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target.result;
        setCustomLogo(base64);
        try {
          localStorage.setItem('pandora_beta_custom_logo', base64);
          localStorage.setItem('pandora_custom_logo', base64);
          window.dispatchEvent(new Event('pandora_logo_update'));
        } catch (err) {
          console.warn('Quota error saving custom logo', err);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const { setAppMode } = useProject();
  const navigate = useNavigate();

  const handleExitBeta = () => {
    setAppMode('normal');
    navigate('/');
  };

  const navGroups = [
    {
      label: t('sidebar.groups.workspace'),
      items: [
        { id: 'memory', label: t('sidebar.items.memory'), icon: Cpu, count: 0 },
        { id: 'docs', label: t('sidebar.items.docs'), icon: FileText, count: 12 },
        { id: 'history', label: t('sidebar.items.history'), icon: History, count: 42 },
      ]
    },
    {
      label: t('sidebar.groups.engine'),
      items: [
        { id: 'tasks', label: t('sidebar.items.tasks'), icon: CheckSquare, count: 8 },
        { id: 'versions', label: t('sidebar.items.versions'), icon: GitBranch, count: 3 },
        { id: 'tools', label: t('sidebar.items.tools'), icon: Globe, count: 15 },
      ]
    }
  ];

  return (
    <aside className="w-[280px] h-full bg-[#050505] border-r border-[#151515] flex flex-col z-30 shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
      {/* Beta Logo Section */}
      <div 
        className="px-6 pt-9 pb-6 border-b border-[#151515] bg-gradient-to-b from-[#0A0A0A] to-transparent cursor-pointer group hover:bg-[#111] transition-colors"
        onClick={() => setViewMode('sandbox')}
        title={t('sidebar.logo_title')}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className="flex flex-col">
            <span 
              className="text-lg font-bold tracking-tight text-white leading-none outline-none group-hover:text-neon-cyan transition-colors"
              contentEditable
              suppressContentEditableWarning
              onClick={(e) => e.stopPropagation()}
              title="Click para editar nombre"
            >
              PANDORA
            </span>
            <span className="text-[10px] text-neon-purple font-black tracking-widest mt-0.5 uppercase">{t('sidebar.mode_beta')}</span>
          </div>
        </div>
      </div>

      {/* Project Selector */}
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{t('sidebar.active_projects')}</span>
          <button 
            onClick={() => createProject("Nuevo Proyecto " + (projects.length + 1))}
            className="p-1.5 rounded-md hover:bg-[#151515] text-gray-500 hover:text-white transition-all border border-transparent hover:border-[#222]"
            title={t('sidebar.new_project')}
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
                <p className="text-[9px] text-gray-600 font-medium uppercase tracking-tighter">{t('common.updated')}: {p.lastUpdate || t('common.recently')}</p>
              </div>
              <ChevronRight className={cn(
                "w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity",
                activeProject?.id === p.id ? "text-neon-purple" : "text-gray-700"
              )} />
            </button>
          ))}
        </div>

        <div className="pt-4 border-t border-[#151515] flex flex-col gap-2">
          <button 
            onClick={() => setViewMode('admin')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all border group",
              viewMode === 'admin' 
                ? "bg-neon-purple/10 border-neon-purple/20 text-white shadow-lg" 
                : "bg-[#0A0A0A] border-[#151515] text-gray-500 hover:border-[#333] hover:text-white"
            )}
          >
            <ShieldCheck className={cn("w-4 h-4", viewMode === 'admin' ? "text-neon-purple" : "text-gray-600")} />
            <span className="text-xs font-black uppercase tracking-widest">{t('sidebar.admin')}</span>
          </button>

          <button 
            onClick={() => setViewMode('simulator')}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-left transition-all border group relative overflow-hidden",
              viewMode === 'simulator' 
                ? "bg-neon-cyan/10 border-neon-cyan/20 text-white shadow-lg" 
                : "bg-[#0A0A0A] border-[#151515] text-gray-500 hover:border-[#333] hover:text-white"
            )}
          >
            {viewMode !== 'simulator' && <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />}
            <Activity className={cn("w-4 h-4 transition-colors", viewMode === 'simulator' ? "text-neon-cyan" : "text-gray-600 group-hover:text-neon-cyan/50")} />
            <span className="text-xs font-black uppercase tracking-widest">{t('sidebar.simulator')}</span>
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
          <span className="text-xs font-semibold text-gray-400 group-hover:text-white transition-colors">{t('sidebar.alpha_config')}</span>
        </button>

        <button 
          onClick={handleExitBeta}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left text-red-400/70 hover:bg-red-500/10 hover:text-red-400 transition-all border border-transparent hover:border-red-500/20"
        >
          <LogOut className="w-4 h-4" />
          <span className="text-xs font-bold uppercase tracking-wider">{t('sidebar.exit_beta')}</span>
        </button>
      </div>
    </aside>
  );
}

export default BetaSidebar;
