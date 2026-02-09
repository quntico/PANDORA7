
import React from 'react';
import { cn } from '@/lib/utils';

function ScenarioToggle({ value, onChange }) {
  const scenarios = ['conservative', 'realistic', 'optimistic'];
  
  const labels = {
    conservative: 'Conservador',
    realistic: 'Realista',
    optimistic: 'Optimista'
  };

  return (
    <div className="inline-flex rounded-xl bg-gray-900/60 p-1.5 border border-cyan-500/20 shadow-inner">
      {scenarios.map((scenario) => (
        <button
          key={scenario}
          onClick={() => onChange(scenario)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-lg transition-all duration-300',
            value === scenario
              ? 'bg-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)]'
              : 'text-gray-400 hover:text-white hover:bg-white/5'
          )}
        >
          {labels[scenario]}
        </button>
      ))}
    </div>
  );
}

export default ScenarioToggle;
