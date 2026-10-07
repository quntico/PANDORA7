
import React from 'react';
import { cn } from '@/lib/utils';
import { Briefcase, TrendingUp } from 'lucide-react';

function ModeToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-lg bg-gray-800/50 p-1 border border-gray-700">
      <button
        onClick={() => onChange('analyst')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
          value === 'analyst'
            ? 'bg-blue-500 text-white shadow-lg'
            : 'text-gray-400 hover:text-gray-200'
        )}
      >
        <Briefcase className="w-4 h-4" />
        Modo Analista
      </button>
      <button
        onClick={() => onChange('entrepreneur')}
        className={cn(
          'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all',
          value === 'entrepreneur'
            ? 'bg-blue-500 text-white shadow-lg'
            : 'text-gray-400 hover:text-gray-200'
        )}
      >
        <TrendingUp className="w-4 h-4" />
        Modo Emprendedor
      </button>
    </div>
  );
}

export default ModeToggle;
