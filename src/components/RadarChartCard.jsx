
import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import { Hexagon } from 'lucide-react';

const data = [
  { subject: 'Robustez', A: 52, fullMark: 100 },
  { subject: 'Realismo', A: 56, fullMark: 100 },
  { subject: 'Riesgo', A: 52, fullMark: 100 },
  { subject: 'Escalabilidad', A: 68, fullMark: 100 },
  { subject: 'Viabilidad', A: 60, fullMark: 100 },
  { subject: 'Mercado', A: 58, fullMark: 100 },
];

function RadarChartCard() {
  return (
    <div className="relative flex flex-col h-full rounded-2xl p-6 backdrop-blur-xl bg-gray-900/40 border border-teal-500/30 shadow-2xl">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
          <Hexagon className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-white">Análisis Multidimensional</h3>
      </div>

      <div className="h-[300px] w-full -ml-4">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="70%" data={data}>
            <defs>
              <linearGradient id="radarFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.4}/>
              </linearGradient>
            </defs>
            <PolarGrid stroke="#374151" strokeDasharray="3 3" />
            <PolarAngleAxis 
              dataKey="subject" 
              tick={{ fill: '#9ca3af', fontSize: 12 }} 
            />
            <Radar
              name="Proyecto"
              dataKey="A"
              stroke="#2dd4bf"
              strokeWidth={2}
              fill="url(#radarFill)"
              fillOpacity={0.6}
            />
            <Tooltip 
              contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
              itemStyle={{ color: '#2dd4bf' }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default RadarChartCard;
