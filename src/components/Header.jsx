
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Settings, User, LayoutGrid, Calculator, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { useProject } from '@/context/ProjectContext';
import { useToast } from '@/components/ui/use-toast';
import { useLogoManager } from '@/hooks/useLogoManager';
import { cn } from '@/lib/utils';

function Header() {
  const { userMode, setUserMode, setAppMode } = useProject();
  const navigate = useNavigate();
  const { logo, logoSize } = useLogoManager();
  const location = useLocation();
  const { toast } = useToast();

  // Collapse state — persiste en localStorage
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('pandora_nav_collapsed') || 'false'); }
    catch { return false; }
  });
  const toggleNav = () => {
    setNavCollapsed(v => {
      localStorage.setItem('pandora_nav_collapsed', JSON.stringify(!v));
      return !v;
    });
  };

  const handleFeatureClick = (feature) => {
    toast({
      title: "🚧 Función en desarrollo",
      description: `La función de ${feature} estará disponible pronto. 🚀`
    });
  };

  const navItems = [
    { name: 'Evaluación', path: '/alpha' },
    { name: 'Simuladores', path: '/alpha/simulators' },
    { name: 'Análisis', path: '/alpha/analysis' },
    { name: 'Historial', path: '/alpha/results' },
    { name: 'Flow Designer', path: '/alpha/flow-designer' },
  ];

  return (
    <header className="sticky top-0 z-50 backdrop-blur-2xl bg-deep/95 border-b border-glass-border shadow-float">
      <div className="max-w-[1800px] mx-auto px-4 md:px-6 py-3">
        <nav className="flex items-center justify-between">

          {/* Logo + PANDORA + VER — siempre visibles */}
          <Link to="/" className="flex items-center gap-3 group">
            {logo ? (
              <div style={{ width: `${logoSize}px`, height: '48px' }} className="relative flex-shrink-0">
                <img
                  src={logo}
                  alt="PANDORA Logo"
                  style={{ width: `${logoSize}px`, height: `${logoSize}px`, maxWidth: 'none' }}
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 object-contain rounded-xl transition-all group-hover:scale-105 group-hover:shadow-glow-sm"
                />
              </div>
            ) : null}

            <div style={{ display: logo ? 'none' : 'flex' }}
              className="w-12 h-12 rounded-xl bg-gradient-to-br from-neon-cyan via-neon-blue to-neon-purple flex items-center justify-center shadow-glow-md group-hover:shadow-glow-lg group-hover:scale-105 transition-all">
              <span className="text-2xl font-bold text-white">P</span>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-[#00F0FF] tracking-tight drop-shadow-[0_0_10px_rgba(0,240,255,0.5)]">
                PANDORA
              </span>
              <span
                className="flex items-center gap-2 text-[10px] font-semibold text-neon-purple bg-neon-purple/15 px-2 py-0.5 rounded-md border border-neon-purple/30 tracking-wider cursor-pointer hover:bg-neon-purple/20 transition-colors"
                onDoubleClick={(e) => {
                  e.preventDefault(); e.stopPropagation();
                  const password = prompt("ADMIN | Ingrese contraseña:");
                  if (password === "2020") { window.open('/admin-cotizador', '_blank'); }
                  else if (password !== null) { alert("Contraseña incorrecta."); }
                }}
              >
                VER 7.61
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-purple opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-neon-purple"></span>
                </span>
              </span>
            </div>
          </Link>

          {/* Navigation Links — oculto si colapsado */}
          {!navCollapsed && (
            <div className="hidden md:flex items-center p-1 rounded-xl bg-glass-light border border-glass-border backdrop-blur-md gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300",
                    location.pathname === item.path
                      ? "bg-neon-cyan/10 text-neon-cyan shadow-glow-sm border border-neon-cyan/20"
                      : "text-gray-400 hover:text-white hover:bg-glass-hover"
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </div>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-3">

            {/* Botón colapsar nav — siempre visible */}
            <button
              onClick={toggleNav}
              title={navCollapsed ? 'Mostrar navegación completa' : 'Ocultar navegación'}
              className={cn(
                "p-2 rounded-xl border transition-all",
                navCollapsed
                  ? "bg-[#00F0FF]/10 border-[#00F0FF]/40 text-[#00F0FF] shadow-[0_0_10px_#00F0FF33]"
                  : "bg-glass-light border-glass-border text-gray-500 hover:text-white hover:border-white/20"
              )}
            >
              {navCollapsed
                ? <PanelLeftOpen className="w-4 h-4" />
                : <PanelLeftClose className="w-4 h-4" />
              }
            </button>

            {/* Cotizador, Panel, Mode, Settings, User — ocultos si colapsado */}
            {!navCollapsed && (
              <>
                <Link to="/alpha/admin-cotizador"
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border",
                    location.pathname === '/alpha/admin-cotizador'
                      ? "bg-neon-purple/10 border-neon-purple/30 text-neon-purple shadow-glow-sm"
                      : "bg-glass-light border-glass-border text-gray-300 hover:text-white hover:border-neon-purple/20 hover:bg-glass-hover"
                  )}>
                  <Calculator className="w-4 h-4" />
                  <span className="hidden lg:inline">Cotizador</span>
                </Link>

                <Link to="/alpha/dashboard"
                  className={cn(
                    "flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium transition-all border",
                    location.pathname === '/alpha/dashboard'
                      ? "bg-neon-cyan/10 border-neon-cyan/30 text-neon-cyan shadow-glow-sm"
                      : "bg-glass-light border-glass-border text-gray-300 hover:text-white hover:border-neon-cyan/20 hover:bg-glass-hover"
                  )}>
                  <LayoutGrid className="w-4 h-4" />
                  <span className="hidden lg:inline">Panel</span>
                </Link>
              </>
            )}

            {/* Beta System — siempre visible */}
            <button
              onClick={() => { setAppMode('beta'); navigate('/'); }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-bold transition-all border border-neon-purple/50 bg-neon-purple/10 text-neon-purple hover:bg-neon-purple/20 hover:shadow-glow-sm"
            >
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neon-purple opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-neon-purple"></span>
              </span>
              Beta System
            </button>

            {!navCollapsed && (
              <>
                <div className="h-6 w-px bg-glass-border" />
                <div className="flex items-center gap-2">
                  <button
                    className="px-3 py-1 rounded-lg bg-neon-blue/10 border border-neon-blue/30 text-neon-blue text-xs font-semibold uppercase hover:bg-neon-blue/20 transition-all"
                    onClick={() => setUserMode(userMode === 'analyst' ? 'entrepreneur' : 'analyst')}
                  >
                    {userMode === 'analyst' ? 'Analista' : 'Emprendedor'}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <Link to="/alpha/settings"
                    className="p-2 rounded-xl bg-glass-light border border-glass-border text-gray-400 hover:text-neon-cyan hover:border-neon-cyan/30 hover:bg-glass-hover transition-all"
                    title="Configuración">
                    <Settings className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleFeatureClick("Perfil de Usuario")}
                    className="p-2 rounded-xl bg-glass-light border border-glass-border text-gray-400 hover:text-white hover:border-neon-cyan/30 hover:bg-glass-hover transition-all group"
                  >
                    <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-neon-cyan to-neon-blue flex items-center justify-center group-hover:shadow-glow-sm">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export default Header;
