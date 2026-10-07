
import React from 'react';
import { cn } from '@/lib/utils';

function InputField({ label, description, value, onChange, type = 'text', placeholder, className }) {
  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <label className="block text-sm font-medium text-gray-200">
          {label}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
      />
      {description && (
        <p className="text-xs text-gray-400">{description}</p>
      )}
    </div>
  );
}

export default InputField;
