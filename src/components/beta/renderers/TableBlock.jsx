
import React from 'react';

export default function TableBlock({ title, columns, rows }) {
  if (!columns || !rows) return null;

  return (
    <div className="my-10 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />
        <h4 className="text-[10px] font-black uppercase tracking-[4px] text-neon-purple/60">{title || 'DATOS ESTRUCTURADOS'}</h4>
      </div>
      
      <div className="overflow-hidden rounded-3xl border border-white/5 bg-white/[0.01] shadow-2xl backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-white/5">
                {columns.map((col, idx) => (
                  <th
                    key={idx}
                    className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-neon-cyan/50 border-b border-white/5"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-white/[0.03] transition-colors group">
                  {row.map((cell, cellIdx) => (
                    <td
                      key={cellIdx}
                      className="px-6 py-4 text-sm font-medium text-gray-400 group-hover:text-white transition-colors"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
