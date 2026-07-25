import React, { useState, useEffect } from 'react';
import {
  Share2, Download, ExternalLink, Activity,
  ChevronRight, ArrowRightCircle, LogOut,
  Monitor, Settings, ShieldCheck, FolderOpen,
  Eye, EyeOff, Globe, Edit3
} from 'lucide-react';
import { useBeta } from '@/context/BetaContext';
import { useProject } from '@/context/ProjectContext';
import { useTranslation } from '@/context/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';

function BetaHeader() {
  const { activeProject, viewMode, setViewMode, focusMode, setFocusMode, updateProjectName } = useBeta();
  const { setAppMode } = useProject();
  const { language, setLanguage, t } = useTranslation();
  const navigate = useNavigate();

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');

  useEffect(() => {
    if (activeProject?.name) {
      setTempName(activeProject.name);
    }
  }, [activeProject?.name]);

  const handleSaveName = () => {
    setIsEditingName(false);
    if (tempName.trim() && tempName.trim() !== activeProject?.name) {
      updateProjectName(tempName.trim());
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveName();
    }
    if (e.key === 'Escape') {
      setIsEditingName(false);
      setTempName(activeProject?.name || '');
    }
  };

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

  const handleExit = () => {
    setAppMode('normal');
    navigate('/');
  };

  return (
    <header className="h-[92px] pt-[20px] pb-3 shrink-0 bg-[#050505] border-b border-[#151515] flex items-center justify-between px-8 z-40 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            {isEditingName ? (
              <input
                type="text"
                value={tempName}
                onChange={(e) => setTempName(e.target.value)}
                onBlur={handleSaveName}
                onKeyDown={handleKeyDown}
                autoFocus
                className="bg-[#0f0f0f] border border-neon-cyan/50 rounded-lg px-2 py-0.5 text-xs font-black text-white tracking-widest outline-none focus:ring-1 focus:ring-neon-cyan/50 w-72"
              />
            ) : (
              <h1
                onClick={() => setIsEditingName(true)}
                className="text-sm font-black text-white tracking-widest flex items-center gap-2 cursor-pointer hover:text-neon-cyan transition-colors group"
                title="Hacer click para renombrar proyecto/cliente"
              >
                {activeProject?.name || t('common.loading')}
                <Edit3 className="w-3.5 h-3.5 text-gray-500 hover:text-neon-cyan transition-colors" />
              </h1>
            )}
            <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[2px] mt-0.5 font-mono">
              {t('header.mode.title')}{' '}
              <span className={cn(viewMode === 'sandbox' ? "text-neon-cyan" : "text-neon-purple")}>
                {viewMode === 'sandbox' ? t('header.nav.sandbox') : t('header.nav.admin_system')}
              </span>
            </p>
          </div>
        </div>
      </div>

      {/* Central Navigation Toggle — hidden in focusMode */}
      {!focusMode && (
        <div className="flex items-center bg-[#0A0A0A] rounded-[20px] border border-[#1A1A1A] p-1.5 gap-2 shadow-inner">
          <button
            onClick={() => setViewMode('sandbox')}
            className={cn(
              "flex items-center gap-3 px-6 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-widest transition-all",
              viewMode === 'sandbox'
                ? "bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/30 shadow-glow-sm"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <Monitor className="w-4 h-4" />
            {t('header.nav.sandbox_tab')}
          </button>
          <button
            onClick={() => setViewMode('admin')}
            className={cn(
              "flex items-center gap-3 px-6 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-widest transition-all",
              viewMode === 'admin'
                ? "bg-neon-purple/10 text-neon-purple border border-neon-purple/30 shadow-glow-sm"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <Settings className="w-4 h-4" />
            {t('header.nav.admin_tab')}
          </button>
          <button
            onClick={() => setViewMode('vault')}
            className={cn(
              "flex items-center gap-3 px-6 py-2.5 rounded-[14px] text-[11px] font-black uppercase tracking-widest transition-all",
              viewMode === 'vault'
                ? "bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 shadow-glow-sm"
                : "text-gray-500 hover:text-gray-300"
            )}
          >
            <FolderOpen className="w-4 h-4" />
            {t('header.nav.vault_tab')}
          </button>
        </div>
      )}

      {/* Right actions */}
      <div className="flex items-center gap-3">
        {/* Language selector toggle */}
        {!focusMode && (
          <button
            onClick={() => setLanguage(l => l === 'es' ? 'en' : 'es')}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black bg-white/5 text-gray-400 border border-white/10 hover:text-gray-200 hover:border-white/20 transition-all font-mono"
            title="Cambiar idioma / Switch language"
          >
            <Globe className="w-4 h-4 text-neon-cyan" />
            <span>{language.toUpperCase()}</span>
          </button>
        )}

        {/* Focus Mode toggle */}
        <button
          onClick={() => setFocusMode(f => !f)}
          title={focusMode ? t('header.focus.show') : t('header.focus.hide')}
          className={cn(
            "flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black border transition-all group",
            focusMode
              ? "bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/50 shadow-[0_0_12px_#00F0FF44]"
              : "bg-white/5 text-gray-500 border-white/10 hover:text-gray-200 hover:border-white/20"
          )}
        >
          {focusMode
            ? <Eye className="w-4 h-4 drop-shadow-[0_0_6px_#00F0FF]" />
            : <EyeOff className="w-4 h-4" />
          }
          <span className="hidden xl:inline">{t('header.focus.label')}</span>
        </button>

        {!focusMode && (
          <div className="hidden xl:flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0A0A0A] border border-[#151515]">
            <span className="w-2 h-2 rounded-full bg-green-500 shadow-glow-sm animate-pulse" />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest font-mono">{t('header.status.ai_sync')}</span>
          </div>
        )}

        <button
          onClick={handleExit}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-neon-cyan/5 text-neon-cyan border border-neon-cyan/20 hover:border-neon-cyan/50 hover:bg-neon-cyan/10 transition-all group"
        >
          <ExternalLink className="w-4 h-4 group-hover:scale-110 transition-transform" />
          {!focusMode && <span>{t('header.nav.alpha_mode')}</span>}
        </button>
      </div>
    </header>
  );
}

export default BetaHeader;
