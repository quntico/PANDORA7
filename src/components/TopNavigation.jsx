
import React from 'react';
import { Box, User, Settings, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLogoManager } from '@/hooks/useLogoManager';

function TopNavigation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logo } = useLogoManager();

  const tabs = [
    { name: 'Evaluación', path: '/' },
    { name: 'Simuladores', path: '/simulators' },
    { name: 'Análisis', path: '/analysis' },
    { name: 'AVATAR', path: '/avatar' },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full backdrop-blur-xl bg-[#0F172A]/80 border-b border-white/5 px-6 py-4 transition-colors duration-300 light:bg-white/80 light:border-gray-200">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-3 group">
          {logo ? (
            <img
              src={logo}
              alt="PANDORA Logo"
              className="w-12 h-12 object-contain max-w-[180px] transition-transform group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextSibling.style.display = 'flex';
              }}
            />
          ) : null}

          <div
            style={{ display: logo ? 'none' : 'flex' }}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform"
          >
            <Box className="w-7 h-7 text-white" />
          </div>

          <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-tight">
            PANDORA
          </span>
        </Link>

        {/* Center Tabs */}
        <div className="hidden md:flex items-center p-1 rounded-xl bg-white/5 border border-white/5 light:bg-gray-100 light:border-gray-200">
          {tabs.map((tab) => (
            <Link
              key={tab.name}
              to={tab.path}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300",
                location.pathname === tab.path
                  ? "bg-gray-800 text-white shadow-md light:bg-white light:text-gray-900"
                  : "text-gray-400 hover:text-white hover:bg-white/5 light:text-gray-600 light:hover:text-gray-900 light:hover:bg-gray-200/50"
              )}
            >
              {tab.name}
            </Link>
          ))}
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-4">
          <Link
            to="/chat"
            className={cn(
              "flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border",
              location.pathname === '/chat'
                ? "bg-teal-500/20 border-teal-500/50 text-teal-400"
                : "border-transparent hover:bg-white/5 text-gray-400 hover:text-white"
            )}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm font-medium hidden lg:inline">Chat IA</span>
          </Link>

          <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 light:bg-gray-100 light:border-gray-200">
            <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold mr-2 light:text-gray-500">Modo</span>
            <button className="px-3 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-medium border border-blue-500/30">
              Analista
            </button>
            <span className="text-gray-600 light:text-gray-300">|</span>
            <button className="px-3 py-1 rounded text-gray-400 text-xs font-medium hover:text-white light:text-gray-600 light:hover:text-gray-900">
              Emprendedor
            </button>
          </div>

          <div className="w-px h-8 bg-white/10 mx-2 light:bg-gray-200" />

          <button
            onClick={() => navigate('/settings')}
            title="Configuración"
            className="p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors light:text-gray-600 light:hover:text-gray-900 light:hover:bg-gray-100"
          >
            <Settings className="w-5 h-5" />
          </button>

          <button className="flex items-center gap-2 p-1.5 pr-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 transition-all group light:hover:bg-gray-100 light:hover:border-gray-200">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <User className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-300 group-hover:text-white light:text-gray-700 light:group-hover:text-gray-900">Admin</span>
          </button>
        </div>
      </div>
    </nav>
  );
}

export default TopNavigation;
