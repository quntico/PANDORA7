
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { BarChart3 } from 'lucide-react';

const data = [
  { year: 'AÑO 1', value: -15 },
  { year: 'AÑO 2', value: 5 },
  { year: 'AÑO 3', value: 12 },
  { year: 'AÑO 4', value: 22 },
  { year: 'AÑO 5', value: 28 },
];

function CashFlowChart() {
  return (
    <div className="relative flex flex-col h-full rounded-2xl p-6 backdrop-blur-xl bg-gray-900/40 border border-cyan-500/30 shadow-2xl">
      <div className="flex items-center gap-2 mb-6">
        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
          <BarChart3 className="w-5 h-5" />
        </div>
        <h3 className="text-lg font-semibold text-white">Proyección de Flujo de Caja</h3>
      </div>

      <div className="h-[250px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
            stackOffset="sign"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
            <XAxis 
              dataKey="year" 
              stroke="#9ca3af" 
              fontSize={12} 
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#9ca3af" 
              fontSize={12}
              tickFormatter={(value) => `${value}%`}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              cursor={{ fill: '#ffffff10' }}
              contentStyle={{ backgroundColor: '#111827', borderColor: '#374151', borderRadius: '8px' }}
              itemStyle={{ color: '#fff' }}
              formatter={(value) => [`${value}%`, 'Flujo']}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={50}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.value >= 0 ? '#10b981' : '#ef4444'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export default CashFlowChart;
