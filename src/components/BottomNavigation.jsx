
import React from 'react';
import { LayoutDashboard, FolderKanban, BarChart2, FileText, ChevronDown, Plus } from 'lucide-react';

function BottomNavigation() {
  return (
    <div className="sticky bottom-0 z-50 w-full backdrop-blur-xl bg-[#0F172A]/90 border-t border-white/5 px-6 py-3">
      <div className="max-w-[1600px] mx-auto flex items-center justify-between">
        
        {/* Left Icons */}
        <div className="flex items-center gap-1">
          <NavIconButton icon={LayoutDashboard} label="Dashboard" active />
          <NavIconButton icon={FolderKanban} label="Proyectos" />
          <NavIconButton icon={BarChart2} label="Simulación" />
          <NavIconButton icon={FileText} label="Reports" />
        </div>

        {/* Center Pagination */}
        <div className="hidden md:flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]" />
          <div className="w-2 h-2 rounded-full bg-gray-700" />
          <div className="w-2 h-2 rounded-full bg-gray-700" />
          <div className="w-2 h-2 rounded-full bg-gray-700" />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:bg-gray-700 hover:border-gray-600 transition-all text-sm font-medium">
            Exportar
            <ChevronDown className="w-4 h-4" />
          </button>
          
          <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 hover:scale-[1.02] transition-all text-sm font-medium">
            <Plus className="w-4 h-4" />
            Nuevo Análisis
          </button>
        </div>
      </div>
    </div>
  );
}

function NavIconButton({ icon: Icon, label, active }) {
  return (
    <button className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors min-w-[64px] ${active ? 'text-teal-400' : 'text-gray-500 hover:text-gray-300'}`}>
      <Icon className="w-5 h-5" />
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

export default BottomNavigation;
