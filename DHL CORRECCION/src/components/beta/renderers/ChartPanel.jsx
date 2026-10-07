
import React from 'react';
import { 
  ResponsiveContainer, BarChart, Bar, 
  XAxis, YAxis, Tooltip, PieChart, Pie, Cell, 
  LineChart, Line, CartesianGrid, Legend 
} from 'recharts';

const COLORS = ['#00F0FF', '#7000FF', '#FF00EA', '#00FF41', '#FF9F00'];

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-black/90 backdrop-blur-3xl border border-white/10 p-4 rounded-3xl shadow-glow-md max-w-[220px]">
        <p className="text-[10px] font-black text-neon-cyan uppercase tracking-[3px] mb-1">{label}</p>
        <p className="text-2xl font-black text-white">{payload[0].value}</p>
        {data.reason && <p className="text-[10px] text-gray-400 mt-2 leading-snug">{data.reason}</p>}
      </div>
    );
  }
  return null;
};

export default function ChartPanel({ title, type, data, config }) {
  if (!data?.length) return null;

  // Sanitizar valores: la IA a veces devuelve strings con comas y signos de peso ("$3,500.50"), 
  // que Recharts no puede graficar y rompe la visualización (aparece en blanco).
  const parsedData = data.map((d, index) => {
    // 1. Manejo Primitivo (si la IA manda un array de números [10, 20, 30])
    if (typeof d !== 'object' || d === null) {
       let val = 0;
       if (typeof d === 'number') val = d;
       else if (typeof d === 'string') val = parseFloat(d.replace(/[^0-9.-]+/g,"")) || 0;
       return { name: `Pt ${index+1}`, value: val };
    }

    // 2. Manejo de Array/Tuplas (si manda [["Año 1", 500], ["Año 2", 600]])
    if (Array.isArray(d)) {
       let name = `Pt ${index+1}`;
       let val = 0;
       if (d.length >= 2) {
          name = String(d[0]);
          val = typeof d[1] === 'number' ? d[1] : parseFloat(String(d[1]).replace(/[^0-9.-]+/g,"")) || 0;
       } else if (d.length === 1) {
          val = typeof d[0] === 'number' ? d[0] : parseFloat(String(d[0]).replace(/[^0-9.-]+/g,"")) || 0;
       }
       return { name, value: val };
    }

    // 3. Manejo de Objetos (Heurística extrema)
    let keyName = d.name || d.label || d.etapa || d.fase || d.year || d.mes || d.año || d.periodo;
    if (keyName === undefined) {
      // Buscar primera propiedad que parezca texto descriptivo
      for (const [k, v] of Object.entries(d)) {
         if (typeof v === 'string' && !/^[0-9.,$]+$/.test(v)) {
            keyName = v; 
            break;
         }
      }
      if (!keyName) keyName = Object.values(d)[0] || `Pt ${index+1}`;
    }
    
    let numericValue = d.value !== undefined ? d.value : d.monto || d.costo || d.inversion || d.amount || d.ganancia || d.score || d.total;
    
    if (numericValue === undefined) {
      for (const key of Object.keys(d)) {
        const lowerKey = key.toLowerCase();
        if (!['name', 'label', 'etapa', 'fase', 'reason', 'year', 'mes', 'año', 'periodo', 'descripcion'].includes(lowerKey)) {
          const rawVal = d[key];
          if (typeof rawVal === 'number') {
            numericValue = rawVal;
            break;
          }
          if (typeof rawVal === 'string' && /[0-9]/.test(rawVal)) {
            if (rawVal !== keyName) {
               numericValue = rawVal;
               break;
            }
          }
        }
      }
    }
    
    if (numericValue === undefined) numericValue = 0;
    if (typeof numericValue === 'string') {
      const cleanString = numericValue.replace(/[^0-9.-]+/g,"");
      numericValue = parseFloat(cleanString) || 0;
    }
    
    return { ...d, name: String(keyName).substring(0, 15), value: numericValue };
  });

  console.log('[ChartPanel] Data cruda:', data);
  console.log('[ChartPanel] Data parseada:', parsedData);

  return (
    <div className="p-10 rounded-[48px] bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all shadow-2xl backdrop-blur-3xl relative overflow-hidden group">
      
      <div className="flex items-center gap-4 mb-8">
        <div className="w-2 h-2 rounded-full bg-neon-purple shadow-glow-sm" />
        <h3 className="text-sm font-black uppercase tracking-[4px] text-neon-purple group-hover:text-neon-cyan transition-colors">{title || 'ANÁLISIS DE INDICADORES'}</h3>
      </div>
      
      <div className="h-[350px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          {type === 'bar' ? (
            <BarChart data={parsedData}>
              <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="rgba(255,255,255,0.02)" />
              <XAxis 
                dataKey="name" 
                axisLine={true} 
                tickLine={true} 
                className="chart-pdf-axis"
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold' }} 
              />
              <YAxis 
                axisLine={true} 
                tickLine={true} 
                className="chart-pdf-axis"
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold' }} 
              />
              <Tooltip cursor={{ fill: 'rgba(255,255,255,0.01)' }} content={<CustomTooltip />} />
              <Bar dataKey="value" radius={[12, 12, 0, 0]}>
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          ) : type === 'pie' ? (
            <PieChart>
              <Pie
                data={parsedData}
                cx="50%"
                cy="45%"
                innerRadius={60}
                outerRadius={100}
                paddingAngle={8}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend 
                verticalAlign="bottom" 
                height={40}
                wrapperStyle={{ 
                  fontSize: '9px', 
                  fontWeight: '900', 
                  color: 'rgba(255,255,255,0.7)', 
                  textTransform: 'uppercase', 
                  letterSpacing: '2px',
                  paddingTop: '20px'
                }} 
              />
            </PieChart>
          ) : (
            <LineChart data={parsedData}>
              <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="rgba(255,255,255,0.02)" />
              <XAxis 
                dataKey="name" 
                axisLine={true} 
                tickLine={true} 
                className="chart-pdf-axis"
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold' }} 
              />
              <YAxis 
                axisLine={true} 
                tickLine={true} 
                className="chart-pdf-axis"
                tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: 'bold' }} 
              />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#00F0FF" 
                strokeWidth={5} 
                dot={{ r: 8, fill: '#00F0FF', strokeWidth: 0 }}
                activeDot={{ r: 10, stroke: 'white', strokeWidth: 3 }}
              />
            </LineChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
