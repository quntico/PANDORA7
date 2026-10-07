import React, { useState } from 'react';
import { useBeta } from '@/context/BetaContext';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  Calculator, 
  CheckCircle2, 
  Settings, 
  Target, 
  TrendingUp, 
  AlertTriangle,
  Zap,
  ArrowRight,
  Droplets,
  DollarSign
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { cn } from '@/lib/utils';

export default function BetaSimulator() {
  const { activeProject } = useBeta();
  const [activeTab, setActiveTab] = useState('proyeccion');
  const [inversion, setInversion] = useState(activeProject?.metadata?.capex || 5000000);
  const [tasaRetorno, setTasaRetorno] = useState(15);
  const [operacionMeses, setOperacionMeses] = useState(60);
  const [tipoCambio, setTipoCambio] = useState(17.50);
  const [inflacion, setInflacion] = useState(4.5);
  const [isr, setIsr] = useState(30);
  const [tasaDeuda, setTasaDeuda] = useState(11.25);
  const [wacc, setWacc] = useState(12.5);

  // Variables Distribución CAPEX
  const [distMaq, setDistMaq] = useState(60);
  const [distCivil, setDistCivil] = useState(25);
  const distPerm = Math.max(0, 100 - distMaq - distCivil);

  // Derivados CAPEX/OPEX
  const capexData = [
    { name: 'Maquinaria y Eq.', value: inversion * (distMaq / 100), color: '#00F0FF' },
    { name: 'Obra Civil', value: inversion * (distCivil / 100), color: '#9D4EDD' },
    { name: 'Permisos', value: inversion * (distPerm / 100), color: '#FFB703' },
  ];

  const opexAnual = inversion * 0.08; // 8% estimado de OPEX
  const opexData = [
    { name: 'Nómina', value: opexAnual * 0.50, color: '#00F0FF' },
    { name: 'Mantenimiento', value: opexAnual * 0.30, color: '#9D4EDD' },
    { name: 'Insumos', value: opexAnual * 0.20, color: '#FFB703' },
  ];

  const formatCurrency = (val, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val) + ` ${currency}`;
  };
  
  // Fake Checklist State
  const [checklist, setChecklist] = useState([
    { id: 1, label: 'Permisos Ambientales SEMARNAT', done: false, impact: 'Alto Riesgo' },
    { id: 2, label: 'Aprobación de CAPEX Inicial', done: true, impact: 'Financiero' },
    { id: 3, label: 'Estudio de Factibilidad Técnica', done: true, impact: 'Técnico' },
    { id: 4, label: 'Contrato PPA o Venta de Materiales', done: false, impact: 'Ingresos' },
    { id: 5, label: 'Garantías de Equipamiento', done: false, impact: 'Operativo' }
  ]);

  const [newItemLabel, setNewItemLabel] = useState('');
  const [newItemImpact, setNewItemImpact] = useState('Operativo');

  const addChecklistItem = (e) => {
    e.preventDefault();
    if (!newItemLabel.trim()) return;
    setChecklist([...checklist, {
      id: Date.now(),
      label: newItemLabel,
      done: false,
      impact: newItemImpact
    }]);
    setNewItemLabel('');
  };

  if (!activeProject) {
    return (
      <div className="h-full flex flex-col items-center justify-center bg-[#050505]">
        <AlertTriangle className="w-12 h-12 text-gray-700 mb-4" />
        <h2 className="text-xl font-bold text-gray-500 uppercase tracking-widest">No hay proyecto activo</h2>
        <p className="text-sm text-gray-600 mt-2">Selecciona un proyecto del panel lateral para usar el simulador.</p>
      </div>
    );
  }

  const toggleCheck = (id) => {
    setChecklist(prev => prev.map(c => c.id === id ? { ...c, done: !c.done } : c));
  };

  const progress = Math.round((checklist.filter(c => c.done).length / checklist.length) * 100);

  // Proyección de datos
  const data = Array.from({ length: 6 }, (_, i) => {
    const year = new Date().getFullYear() + i;
    const flujos = (inversion * (tasaRetorno / 100)) * (i + 1);
    const balance = isNaN(flujos) ? 0 : Math.round(flujos - (i === 0 ? inversion : 0));
    return { name: `Año ${i+1}`, balance, flujos, year };
  });

  return (
    <div className="h-full flex flex-col bg-[#080808] text-white overflow-hidden relative">
      
      {/* HEADER SIMULADOR */}
      <div className="flex-shrink-0 border-b border-white/5 bg-[#0A0A0A] p-6 relative z-10 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="max-w-6xl mx-auto flex items-end justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.2)]">
              <Activity className="w-8 h-8 text-neon-cyan" />
            </div>
            <div>
              <h1 className="text-3xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
                Simulador Estratégico
                <span className="px-2 py-0.5 rounded-md bg-neon-cyan/20 text-neon-cyan text-[10px] tracking-widest align-middle">BETA</span>
              </h1>
              <p className="text-gray-400 font-medium tracking-wide mt-1">
                Motor de cálculo de escenarios para <span className="text-white font-bold">{activeProject.name}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-black/50 px-4 py-2 rounded-xl border border-white/5">
            <div className="text-right">
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Viabilidad Simulada</p>
              <p className="text-xl font-black text-neon-cyan">{progress >= 80 ? 'ÓPTIMA' : progress >= 40 ? 'RIESGO MEDIO' : 'CRÍTICA'}</p>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-white/5 flex items-center justify-center relative">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle cx="20" cy="20" r="18" fill="none" stroke="rgba(0,240,255,0.2)" strokeWidth="4" />
                <circle cx="20" cy="20" r="18" fill="none" stroke="#00F0FF" strokeWidth="4" strokeDasharray="113" strokeDashoffset={113 - (113 * progress) / 100} className="transition-all duration-1000" />
              </svg>
              <span className="text-xs font-bold">{progress}%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">
        <div className="max-w-6xl mx-auto p-6 space-y-6">
          
          <div className="flex space-x-2 border-b border-white/10 pb-4 overflow-x-auto custom-scrollbar">
            {['proyeccion', 'costos', 'checklist', 'configuracion'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all overflow-hidden relative group whitespace-nowrap",
                  activeTab === tab ? "bg-white text-black" : "bg-transparent text-gray-500 hover:text-white"
                )}
              >
                {activeTab === tab && (
                   <motion.div layoutId="sim_tab" className="absolute inset-0 bg-white" style={{ zIndex: -1 }} />
                )}
                {tab === 'proyeccion' ? 'Flujo de Escenarios' : tab === 'costos' ? 'Control CAPEX/OPEX' : tab === 'checklist' ? 'Ruta Cero Errores' : 'Variables'}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <AnimatePresence mode="wait">
            
            {activeTab === 'proyeccion' && (
              <motion.div key="proyeccion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* CALC INPUTS */}
                <div className="md:col-span-1 space-y-4">
                  <div className="p-5 rounded-2xl bg-[#0F0F0F] border border-white/5 shadow-xl space-y-5">
                    <h3 className="text-sm font-black text-neon-cyan uppercase tracking-widest flex items-center gap-2">
                      <Calculator className="w-4 h-4" /> Parámetros
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                        <label className="text-xs text-gray-400 font-bold uppercase tracking-widest">Inversión Inicial</label>
                        <span className="text-[10px] font-black text-neon-cyan bg-neon-cyan/10 px-2 py-0.5 rounded">{formatCurrency(inversion, 'USD')}</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                        <input 
                          type="text" 
                          value={inversion === 0 ? '' : new Intl.NumberFormat('en-US').format(inversion)} 
                          onChange={(e) => {
                            const raw = e.target.value.replace(/[^0-9]/g, '');
                            setInversion(raw ? Number(raw) : 0);
                          }}
                          className="w-full bg-black border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white font-mono text-lg focus:border-neon-cyan outline-none transition-colors"
                        />
                      </div>
                      <div className="text-right">
                        <span className="text-[9px] font-bold text-gray-600 uppercase tracking-widest">
                          EQUIVALENTE: <span className="text-gray-300">{formatCurrency(inversion * tipoCambio, 'MXN')}</span>
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold uppercase">Tasa de Retorno (TIR Estimada)</label>
                      <div className="flex items-center gap-3">
                        <input 
                          type="range" min="1" max="50" 
                          value={tasaRetorno} onChange={(e) => setTasaRetorno(Number(e.target.value))}
                          className="w-full h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-neon-cyan [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                        />
                        <span className="w-12 text-right font-black text-neon-cyan">{tasaRetorno}%</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 font-bold uppercase">Meses de Operación</label>
                      <input 
                        type="text" 
                        value={operacionMeses === 0 ? '' : new Intl.NumberFormat('en-US').format(operacionMeses)} 
                        onChange={(e) => {
                          const raw = e.target.value.replace(/[^0-9]/g, '');
                          setOperacionMeses(raw ? Number(raw) : 0);
                        }}
                        className="w-full bg-black border border-white/10 rounded-lg px-4 py-2 text-white font-mono focus:border-neon-cyan outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* SUMMARY CARDS */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-neon-purple/20 to-transparent border border-neon-purple/30">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Cálculo de Payback</p>
                    <p className="text-2xl font-black text-white">{Math.round((inversion / (inversion * (tasaRetorno / 100))))} Años</p>
                    <div className="w-full h-1 bg-white/10 mt-3 rounded-full overflow-hidden">
                      <div className="h-full bg-neon-purple rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>
                </div>

                {/* GRAPH */}
                <div className="md:col-span-2 p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-xl flex flex-col">
                   <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center justify-between">
                     Proyección Financiera a 5 Años
                     <span className="text-[10px] text-neon-cyan bg-neon-cyan/10 px-2 py-1 rounded-md">DATOS DINÁMICOS</span>
                   </h3>
                   <div className="flex-1 w-full min-h-[300px]">
                     <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={data}>
                          <defs>
                            <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#00F0FF" stopOpacity={0.3}/>
                              <stop offset="95%" stopColor="#00F0FF" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="name" stroke="rgba(255,255,255,0.2)" tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold' }} />
                          <YAxis 
                            stroke="rgba(255,255,255,0.2)" 
                            tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: 'bold' }} 
                            tickFormatter={(val) => new Intl.NumberFormat('en-US', { notation: "compact" }).format(val)}
                          />
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#050505', borderColor: '#333', borderRadius: '8px' }}
                            itemStyle={{ color: '#00F0FF', fontWeight: 'bold' }}
                            formatter={(value) => [formatCurrency(value, 'USD'), 'Flujo Libre']}
                          />
                          <Area type="monotone" dataKey="balance" stroke="#00F0FF" strokeWidth={3} fillOpacity={1} fill="url(#colorBalance)" />
                        </AreaChart>
                     </ResponsiveContainer>
                   </div>
                </div>

              </motion.div>
            )}

            {activeTab === 'checklist' && (
              <motion.div key="checklist" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 rounded-2xl bg-[#0C0C0C] border border-white/5 shadow-xl max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                  <h3 className="text-lg font-black text-white uppercase tracking-widest">Ruta Crítica del Proyecto</h3>
                  <span className="text-xs px-3 py-1 bg-yellow-500/20 text-yellow-500 rounded-full font-bold uppercase tracking-widest border border-yellow-500/30">
                     Gestión de Riesgos
                  </span>
                </div>
                
                <div className="space-y-3">
                  {checklist.map(item => (
                    <div key={item.id} className={cn(
                      "group flex items-center justify-between p-4 rounded-xl border transition-all cursor-pointer",
                      item.done ? "bg-[#111] border-neon-cyan/20 opacity-70 hover:opacity-100" : "bg-[#050505] border-white/10 hover:border-white/30"
                    )} onClick={() => toggleCheck(item.id)}>
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                          item.done ? "border-neon-cyan bg-neon-cyan text-black" : "border-gray-600 bg-transparent"
                        )}>
                          {item.done && <CheckCircle2 className="w-4 h-4" />}
                        </div>
                        <span className={cn(
                          "text-sm font-bold uppercase tracking-wide transition-colors",
                          item.done ? "text-gray-400 line-through" : "text-white"
                        )}>{item.label}</span>
                      </div>
                      <span className={cn(
                        "text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-md",
                        item.impact === 'Alto Riesgo' ? 'bg-red-500/20 text-red-500' : 'bg-white/5 text-gray-500'
                      )}>
                        {item.impact}
                      </span>
                    </div>
                  ))}
                </div>

                <form onSubmit={addChecklistItem} className="mt-6 flex flex-col md:flex-row gap-3 pt-6 border-t border-white/5">
                  <input 
                    type="text" 
                    value={newItemLabel}
                    onChange={(e) => setNewItemLabel(e.target.value)}
                    placeholder="Añadir hito a la ruta crítica..."
                    className="flex-1 bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-yellow-500/50 outline-none transition-colors"
                  />
                  <select
                    value={newItemImpact}
                    onChange={(e) => setNewItemImpact(e.target.value)}
                    className="bg-black border border-white/10 rounded-xl px-4 py-3 text-white text-sm focus:border-yellow-500/50 outline-none transition-colors appearance-none cursor-pointer"
                  >
                    <option value="Alto Riesgo">Alto Riesgo</option>
                    <option value="Técnico">Técnico</option>
                    <option value="Financiero">Financiero</option>
                    <option value="Operativo">Operativo</option>
                    <option value="Ingresos">Ingresos</option>
                  </select>
                  <button type="submit" className="px-6 py-3 rounded-xl bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20 border border-yellow-500/30 font-bold uppercase text-xs tracking-widest transition-all">
                    Añadir a Ruta
                  </button>
                </form>
              </motion.div>
            )}

            {activeTab === 'costos' && (
              <motion.div key="costos" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* MATRIZ DE DESGLOSE */}
                <div className="space-y-6">
                  {/* CAPEX */}
                  <div className="p-6 rounded-2xl bg-[#0F0F0F] border border-white/5 shadow-xl">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                       <Target className="w-4 h-4 text-neon-cyan" /> Matriz de Inversión (CAPEX)
                    </h3>
                    
                    <div className="space-y-5">
                      <div className="space-y-2">
                         <div className="flex justify-between text-xs font-bold uppercase">
                            <span className="text-gray-400">Maquinaria & Equipamiento</span>
                            <span className="text-neon-cyan">{distMaq}%</span>
                         </div>
                         <input type="range" min="0" max="100" value={distMaq} onChange={e => setDistMaq(Number(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-neon-cyan [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                         <p className="text-[10px] text-right text-gray-500 font-mono">{formatCurrency(capexData[0].value, 'USD')}</p>
                      </div>

                      <div className="space-y-2">
                         <div className="flex justify-between text-xs font-bold uppercase">
                            <span className="text-gray-400">Infraestructura Civil</span>
                            <span className="text-neon-purple">{distCivil}%</span>
                         </div>
                         <input type="range" min="0" max="100" value={distCivil} onChange={e => setDistCivil(Number(e.target.value))} className="w-full h-1 bg-white/10 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-neon-purple [&::-webkit-slider-thumb]:rounded-full cursor-pointer" />
                         <p className="text-[10px] text-right text-gray-500 font-mono">{formatCurrency(capexData[1].value, 'USD')}</p>
                      </div>
                      
                      <div className="pt-3 border-t border-white/10 flex justify-between items-center">
                         <span className="text-xs text-gray-500 font-bold uppercase">Restante (Permisos)</span>
                         <span className="text-sm text-yellow-500 font-black">{distPerm}% &rarr; {formatCurrency(capexData[2].value, 'USD')}</span>
                      </div>
                    </div>
                  </div>

                  {/* OPEX */}
                  <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-white/5 shadow-xl">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest mb-4 flex items-center justify-between">
                       <span className="flex items-center gap-2"><Settings className="w-4 h-4 text-neon-purple" /> Costos Operativos (OPEX)</span>
                       <span className="text-[9px] bg-white/5 px-2 py-1 rounded text-gray-400">ANUAL</span>
                    </h3>
                    <div className="flex items-end justify-between mb-4">
                       <div>
                         <p className="text-[10px] text-neon-purple font-bold tracking-widest uppercase mb-1">Presupuesto Corriente Estimado</p>
                         <p className="text-2xl font-black text-white">{formatCurrency(opexAnual, 'USD')}</p>
                       </div>
                    </div>
                    <ul className="space-y-3">
                       {opexData.map((op, i) => (
                         <li key={i} className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                           <div className="flex items-center gap-2 font-bold text-gray-400 uppercase tracking-widest">
                             <div className="w-2 h-2 rounded-full" style={{ backgroundColor: op.color }} />
                             {op.name}
                           </div>
                           <span className="font-mono text-gray-300">{formatCurrency(op.value, 'USD')}</span>
                         </li>
                       ))}
                    </ul>
                  </div>
                </div>

                {/* GRÁFICAS Y DISTRIBUCIÓN */}
                <div className="flex flex-col gap-6">
                  <div className="flex-1 p-6 rounded-2xl bg-[#080808] border border-white/5 shadow-xl flex flex-col justify-center items-center relative">
                    <h3 className="absolute top-6 left-6 text-sm font-black text-gray-500 uppercase tracking-widest">
                       Matriz de Capital
                    </h3>
                    <div className="w-full h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie 
                            data={capexData} 
                            cx="50%" cy="50%" 
                            innerRadius={70} 
                            outerRadius={100} 
                            paddingAngle={5} 
                            dataKey="value"
                            stroke="none"
                          >
                            {capexData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            contentStyle={{ backgroundColor: '#050505', borderColor: '#333', borderRadius: '8px' }}
                            itemStyle={{ color: '#FFF', fontWeight: 'bold' }}
                            formatter={(value) => formatCurrency(value, 'USD')}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    
                    {/* Leyenda PieChart */}
                    <div className="w-full flex justify-center gap-4 mt-2">
                      {capexData.map((c, i) => (
                         <div key={i} className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                            <span className="text-[9px] font-bold text-gray-400 uppercase">{c.name}</span>
                         </div>
                      ))}
                    </div>
                  </div>
                </div>

              </motion.div>
            )}

            {activeTab === 'configuracion' && (
              <motion.div key="configuracion" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 rounded-2xl bg-[#0C0C0C] border border-white/5 shadow-xl max-w-4xl mx-auto">
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/5">
                  <h3 className="text-lg font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <Settings className="w-5 h-5 text-neon-purple" /> Variables Globales
                  </h3>
                  <span className="text-xs px-3 py-1 bg-neon-purple/20 text-neon-purple rounded-full font-bold uppercase tracking-widest border border-neon-purple/30">
                     Entorno Macro-Económico
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* TIPO DE CAMBIO */}
                  <div className="space-y-4 p-5 bg-[#050505] rounded-xl border border-white/10 group hover:border-white/20 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-white font-bold uppercase tracking-widest">Tipo de Cambio</label>
                        <span className="text-[9px] font-black uppercase text-gray-500 bg-white/5 px-2 py-1 rounded">MXN/USD</span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                        <input type="number" step="0.01" value={tipoCambio} onChange={(e) => setTipoCambio(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded-xl pl-8 pr-4 py-3 text-white font-mono text-lg focus:border-neon-purple outline-none transition-colors" />
                      </div>
                  </div>

                  {/* INFLACION */}
                  <div className="space-y-4 p-5 bg-[#050505] rounded-xl border border-white/10 group hover:border-white/20 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-white font-bold uppercase tracking-widest">Inflación Estimada</label>
                        <span className="text-[9px] font-black uppercase text-gray-500 bg-white/5 px-2 py-1 rounded">ANUAL</span>
                      </div>
                      <div className="relative">
                        <input type="number" step="0.1" value={inflacion} onChange={(e) => setInflacion(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg focus:border-neon-cyan outline-none transition-colors" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                      </div>
                  </div>

                  {/* TASA DE DEUDA */}
                  <div className="space-y-4 p-5 bg-[#050505] rounded-xl border border-white/10 group hover:border-white/20 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-white font-bold uppercase tracking-widest">Tasa Deuda (TIIE)</label>
                        <span className="text-[9px] font-black uppercase text-gray-500 bg-white/5 px-2 py-1 rounded">BANCARIO</span>
                      </div>
                      <div className="relative">
                        <input type="number" step="0.1" value={tasaDeuda} onChange={(e) => setTasaDeuda(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg focus:border-yellow-500 outline-none transition-colors" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                      </div>
                  </div>

                  {/* IMPUESTO ISR */}
                  <div className="space-y-4 p-5 bg-[#050505] rounded-xl border border-white/10 group hover:border-white/20 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-white font-bold uppercase tracking-widest">Impuesto ISR</label>
                        <span className="text-[9px] font-black uppercase text-gray-500 bg-white/5 px-2 py-1 rounded">FISCAL</span>
                      </div>
                      <div className="relative">
                        <input type="number" step="1" value={isr} onChange={(e) => setIsr(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg focus:border-red-500/50 outline-none transition-colors" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                      </div>
                  </div>

                  {/* WACC */}
                  <div className="space-y-4 p-5 bg-[#050505] rounded-xl border border-white/10 group hover:border-white/20 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                      <div className="flex items-center justify-between">
                        <label className="text-xs text-white font-bold uppercase tracking-widest">Tasa de Descuento</label>
                        <span className="text-[9px] font-black uppercase text-gray-500 bg-white/5 px-2 py-1 rounded">WACC</span>
                      </div>
                      <div className="relative">
                        <input type="number" step="0.1" value={wacc} onChange={(e) => setWacc(Number(e.target.value))} className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-lg focus:border-neon-cyan outline-none transition-colors" />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">%</span>
                      </div>
                  </div>
                </div>

                <div className="mt-8 p-4 rounded-xl bg-neon-purple/5 border border-neon-purple/20 flex items-start gap-4">
                  <Activity className="w-5 h-5 text-neon-purple flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-400 leading-relaxed font-medium">
                    Las <span className="text-white font-bold">Variables Macro-Económicas</span> alteran en tiempo real todas las ecuaciones de Payback, amortizaciones proyectadas a futuro y equivalencias MXN/USD dentro del motor de cálculo de Pandora.
                  </p>
                </div>
              </motion.div>
            )}

          </AnimatePresence>

        </div>
      </div>
      
    </div>
  );
}
