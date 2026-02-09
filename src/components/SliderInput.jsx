
import React from 'react';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

function SliderInput({ label, value, onChange, min, max, step, unit = '', className }) {
  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex justify-between items-center">
        <label className="text-sm font-medium text-gray-200">{label}</label>
        <span className="text-sm font-semibold text-teal-400">
          {typeof value === 'number' ? value.toLocaleString() : value} {unit}
        </span>
      </div>
      <Slider
        value={[value]}
        onValueChange={(vals) => onChange(vals[0])}
        min={min}
        max={max}
        step={step}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min.toLocaleString()} {unit}</span>
        <span>{max.toLocaleString()} {unit}</span>
      </div>
    </div>
  );
}

export default SliderInput;
