import React from 'react';
import { 
  BarChart, LineChart, Table, FileText, 
  Activity, TrendingUp, AlertCircle, CheckCircle2 
} from 'lucide-react';
import { ResponsiveContainer, BarChart as ReBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';

function ArtifactRenderer({ artifact }) {
  // Datos sugeridos si no vienen en el artefacto
  const defaultData = [
    { name: 'Ene', value: 400 },
    { name: 'Feb', value: 300 },
    { name: 'Mar', value: 500 },
    { name: 'Abr', value: 200 },
    { name: 'May', value: 600 },
  ];

  const chartData = artifact.data?.series ? 
    artifact.data.series.map((val, i) => ({ 
      name: artifact.data.labels ? artifact.data.labels[i] : `P${i+1}`, 
      value: val 
    })) : defaultData;

  switch (artifact.type) {
    case 'chart':
    case 'gráfica':
      return (
        <div className="h-[280px] w-full p-8 animate-in zoom-in-95 duration-700">
           <ResponsiveContainer width="100%" height="100%">
             <ReBarChart data={chartData}>
               <CartesianGrid strokeDasharray="3 3" stroke="#222" vertical={false} />
               <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#666' }} />
               <YAxis fontSize={10} axisLine={false} tickLine={false} tick={{ fill: '#666' }} />
               <Tooltip 
                 contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '12px' }}
                 itemStyle={{ color: '#00F0FF', fontSize: '10px', fontWeight: 'bold' }}
                 labelStyle={{ color: '#666', marginBottom: '4px', fontSize: '10px' }}
               />
               <Bar dataKey="value" name="Valor" fill="rgba(0, 240, 255, 0.4)" radius={[4, 4, 0, 0]} />
             </ReBarChart>
           </ResponsiveContainer>
        </div>
      );

    case 'table':
    case 'tabla':
      return (
        <div className="p-8 animate-in zoom-in-95 duration-700">
           <table className="w-full text-left border-collapse">
             <thead>
               <tr className="border-b border-[#222]">
                 <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest px-2">Variable Analizada</th>
                 <th className="pb-4 text-[10px] font-black text-gray-500 uppercase tracking-widest px-2 text-right">Métrica / Valor</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-[#151515]">
               {(artifact.data?.rows || [
                 { label: "Costo de Adquisición", val: "$1,200.00" },
                 { label: "Conversión de Leads", val: "15.4%" },
                 { label: "Retorno Proyectado", val: "4.2x" },
                 { label: "Impacto en Mercado", val: "Alto" }
               ]).map((row, i) => (
                 <tr key={i} className="group hover:bg-[#111] transition-all">
                   <td className="py-4 px-2 text-[11px] font-bold text-gray-400 group-hover:text-white transition-colors capitalize">{row.label}</td>
                   <td className="py-4 px-2 text-[11px] font-black text-neon-cyan text-right">{row.val}</td>
                 </tr>
               ))}
             </tbody>
           </table>
        </div>
      );

    default:
      return (
        <div className="p-12 flex flex-col items-center justify-center space-y-4 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
           <FileText className="w-12 h-12 text-gray-700" />
           <p className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Tipo de Salida: {artifact.type}</p>
        </div>
      );
  }
}

export default ArtifactRenderer;

