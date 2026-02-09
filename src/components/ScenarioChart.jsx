
import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

const data = [
  { year: 'AÑO 1', conservador: 26465, realista: 45000, optimista: 65000 },
  { year: 'AÑO 2', conservador: 45000, realista: 85000, optimista: 120000 },
  { year: 'AÑO 3', conservador: 78000, realista: 150000, optimista: 210000 },
  { year: 'AÑO 4', conservador: 120000, realista: 240000, optimista: 340000 },
  { year: 'AÑO 5', conservador: 180000, realista: 350000, optimista: 500000 },
];

function ScenarioChart() {
  return (
    <div className="relative flex flex-col h-full rounded-2xl p-4 backdrop-blur-xl bg-glass-light border border-glass-border shadow-float group hover:bg-glass-medium transition-all">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 rounded-lg bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20">
          <TrendingUp className="w-4 h-4" />
        </div>
        <h3 className="text-base font-semibold text-white">Escenarios</h3>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
          >
            {/* Tenue grid */}
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis
              dataKey="year"
              stroke="#6b7280"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#6b7280"
              fontSize={11}
              tickFormatter={(value) => `$${value / 1000}k`}
              tickLine={false}
              axisLine={false}
              width={50}
            />
            {/* Dark tooltip with glassmorphism */}
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(7, 10, 18, 0.95)',
                borderColor: 'rgba(255,255,255,0.12)',
                borderRadius: '12px',
                backdropFilter: 'blur(12px)',
                fontSize: '12px'
              }}
              formatter={(value) => [`$${value.toLocaleString()}`, '']}
              labelStyle={{ color: '#9ca3af' }}
            />
            <Legend
              wrapperStyle={{ paddingTop: '10px', fontSize: '11px' }}
              iconType="line"
            />
            {/* Neon lines */}
            <Line
              type="monotone"
              dataKey="optimista"
              stroke="#10b981"
              strokeWidth={3}
              dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#10b981' }}
              name="Optimista"
            />
            <Line
              type="monotone"
              dataKey="realista"
              stroke="#00F0FF"
              strokeWidth={3}
              dot={{ r: 3, fill: '#00F0FF', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#00F0FF' }}
              name="Realista"
            />
            <Line
              type="monotone"
              dataKey="conservador"
              stroke="#8B5CF6"
              strokeWidth={3}
              dot={{ r: 3, fill: '#8B5CF6', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#8B5CF6' }}
              name="Conservador"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default ScenarioChart;
