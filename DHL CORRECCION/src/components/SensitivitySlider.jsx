
import React, { useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { AlertTriangle, TrendingDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

function SensitivitySlider() {
  const [revenueDrop, setRevenueDrop] = useState([15]);
  const [costIncrease, setCostIncrease] = useState([5]);

  return (
    <div className="relative flex flex-col h-full rounded-2xl p-6 backdrop-blur-xl bg-gray-900/40 border border-orange-500/30 shadow-[0_0_20px_rgba(249,115,22,0.1)] overflow-hidden">
      <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 blur-2xl rounded-full pointer-events-none" />

      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400">
           <AlertTriangle className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-white">Análisis de Sensibilidad</h3>
      </div>

      <div className="space-y-8 flex-1">
        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <label className="text-gray-300 flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-red-400" />
              Caída en Ingresos
            </label>
            <span className="text-orange-400 font-mono font-bold bg-orange-500/10 px-2 py-1 rounded border border-orange-500/20">-{revenueDrop}%</span>
          </div>
          <Slider
            value={revenueDrop}
            onValueChange={setRevenueDrop}
            max={60}
            step={1}
            className="[&>.relative>.absolute]:bg-orange-500 [&>.relative]:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-gray-500 font-medium">
            <span>0%</span>
            <span>-60% Impacto Severo</span>
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center text-sm">
            <label className="text-gray-300 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-red-400" />
              Aumento en Costos
            </label>
            <span className="text-red-400 font-mono font-bold bg-red-500/10 px-2 py-1 rounded border border-red-500/20">+{costIncrease}%</span>
          </div>
          <Slider
            value={costIncrease}
            onValueChange={setCostIncrease}
            max={20}
            step={0.5}
            className="[&>.relative>.absolute]:bg-red-500 [&>.relative]:bg-gray-700"
          />
          <div className="flex justify-between text-xs text-gray-500 font-medium">
            <span>0%</span>
            <span>+20% Crítico</span>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-xl bg-orange-950/20 border border-orange-500/20 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-orange-400 shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-orange-400 mb-1 uppercase tracking-wide">Riesgo Principal Detectado</h4>
            <p className="text-xs text-gray-400 leading-relaxed">
              Alta sensibilidad a la variación de costos operativos. Se sugiere coberturas o contratos a largo plazo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SensitivitySlider;
