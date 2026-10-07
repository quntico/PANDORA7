
import React from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, 
  XAxis, YAxis, Tooltip, PieChart, Pie, Cell, 
  LineChart, Line, CartesianGrid 
} from 'recharts';

const COLORS = ['#00F0FF', '#7000FF', '#FF00EA', '#00FF41', '#FF9F00'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-black/80 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl">
        <p className="text-[10px] font-black text-neon-cyan uppercase tracking-widest mb-1">{label}</p>
        <p className="text-xl font-black text-white">{payload[0].value}</p>
      </div>
    );
  }
  return null;
};

export default function ChartBlock({ title, chartType, data }) {
  if (!data || !data.length) return null;

  return (
    <div className="my-10 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-1.5 h-1.5 rounded-full bg-neon-purple animate-pulse" />
        <h4 className="text-[10px] font-black uppercase tracking-[4px] text-neon-purple/60">{title || 'DISTRIBUCIÓN ANALÍTICA'}</h4>
      </div>
      
      <div className="h-[300px] w-full p-8 rounded-[40px] bg-white/[0.02] border border-white/5 shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
        
        <ResponsiveContainer width="100%" height="100%">
          {chartType === 'bar' ? (
            <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }} 
              />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.02)' }} content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[10, 10, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : chartType === 'pie' ? (
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          ) : (
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.03)" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fill: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: 'bold' }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#00F0FF" 
                strokeWidth={4} 
                dot={{ r: 6, fill: '#00F0FF', strokeWidth: 0 }}
                activeDot={{ r: 8, stroke: 'white', strokeWidth: 2 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
