
import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';
import { cn } from '@/lib/utils';

function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="p-6 rounded-2xl backdrop-blur-md bg-gray-900/40 border border-white/10">
      <h3 className="text-xl font-semibold text-white mb-6">Apariencia</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <button
          onClick={() => setTheme('light')}
          className={cn(
            "group relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-3",
            theme === 'light' 
              ? "border-teal-500 bg-gray-100" 
              : "border-gray-700 bg-gray-800 hover:border-gray-600"
          )}
        >
          <div className="p-3 rounded-full bg-white shadow-sm text-yellow-500">
            <Sun className="w-6 h-6" />
          </div>
          <span className={cn("font-medium", theme === 'light' ? "text-gray-900" : "text-gray-400")}>
            Modo Claro
          </span>
          {theme === 'light' && (
            <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-teal-500" />
          )}
        </button>

        <button
          onClick={() => setTheme('dark')}
          className={cn(
            "group relative p-4 rounded-xl border-2 transition-all duration-300 flex flex-col items-center gap-3",
            theme === 'dark' 
              ? "border-teal-500 bg-[#0F172A]" 
              : "border-gray-200 bg-gray-100 hover:border-gray-300"
          )}
        >
          <div className="p-3 rounded-full bg-gray-800 text-teal-400">
            <Moon className="w-6 h-6" />
          </div>
          <span className={cn("font-medium", theme === 'dark' ? "text-white" : "text-gray-600")}>
            Modo Oscuro
          </span>
          {theme === 'dark' && (
            <div className="absolute top-2 right-2 w-3 h-3 rounded-full bg-teal-500" />
          )}
        </button>
      </div>
      
      <p className="text-sm text-gray-500 mt-4 text-center">
        El tema seleccionado se guardará en sus preferencias locales.
      </p>
    </div>
  );
}

export default ThemeSelector;
