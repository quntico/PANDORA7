import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Layers, Plus, Trash2, Copy, Play, ArrowLeft, FileJson, 
  Settings, HelpCircle, Save, Database, AlertCircle, RefreshCw, 
  ArrowUp, ArrowDown, Type, Calculator, Award, Table, BarChart3, BookOpen
} from 'lucide-react';

// Safe regex-based math expression evaluator with variables
function evaluateFormula(formulaStr, variables) {
  if (!formulaStr) return 0;
  let cleaned = formulaStr.toLowerCase();
  
  // Sort variables by length descending to prevent partial replacements (e.g. 'cajas_hora' before 'cajas')
  const sortedVars = Object.keys(variables).sort((a, b) => b.length - a.length);
  
  for (const varName of sortedVars) {
    const val = variables[varName] ?? 0;
    const regex = new RegExp('\\b' + varName + '\\b', 'g');
    cleaned = cleaned.replace(regex, val);
  }
  
  // Sanitize math string: allow only numbers, basic operators, decimal points, parentheses and spaces
  const mathSanitized = cleaned.replace(/[^0-9+\-*/().\s]/g, '');
  try {
    const result = new Function(`return (${mathSanitized});`)();
    return isNaN(result) || !isFinite(result) ? 0 : result;
  } catch (e) {
    return 'Error';
  }
}

function DynamicSimulatorBuilder() {
  const navigate = useNavigate();
  const [simName, setSimName] = useState('Mi Simulador Dinámico');
  const [simDesc, setSimDesc] = useState('Creado con el Dynamic Simulator Builder de PANDORA.');
  const [accentColor, setAccentColor] = useState('#8b5cf6'); // Default violet accent
  
  // Blocks state
  const [blocks, setBlocks] = useState([
    { 
      id: 'b1', 
      type: 'input', 
      title: 'Capacidad de Máquina', 
      variable: 'cap_nominal', 
      value: 200, 
      unit: 'cajas/h', 
      notes: 'Capacidad nominal de la línea de producción.' 
    },
    { 
      id: 'b2', 
      type: 'input', 
      title: 'Horas de Operación', 
      variable: 'horas_dia', 
      value: 16, 
      unit: 'h/día', 
      notes: 'Tiempo activo diario (ej. 2 turnos de 8 horas).' 
    },
    { 
      id: 'b3', 
      type: 'formula', 
      title: 'Producción Diaria Total', 
      variable: 'prod_diaria', 
      formula: 'cap_nominal * horas_dia', 
      unit: 'cajas/día', 
      notes: 'Cálculo de cajas procesadas bajo velocidad nominal.' 
    },
    {
      id: 'b4',
      type: 'kpi',
      title: 'Eficiencia Global (OEE)',
      variable: 'oee_target',
      formula: 'prod_diaria * 0.85',
      unit: 'cajas reales',
      notes: 'Meta diaria aplicando 85% de eficiencia operativa estándar.'
    }
  ]);

  // Active variable resolution namespace
  const [variables, setVariables] = useState({});

  // Trigger cascade calculation engine when blocks change
  useEffect(() => {
    const vars = {};
    
    // Seed all static inputs first
    blocks.forEach(b => {
      if (b.type === 'input') {
        vars[b.variable] = Number(b.value) || 0;
      } else {
        vars[b.variable] = 0; // Initialize dynamic placeholders
      }
    });

    // Run up to 12 cascade passes to resolve variable nesting
    for (let pass = 0; pass < 12; pass++) {
      let changed = false;
      blocks.forEach(b => {
        if (b.type === 'formula' || b.type === 'kpi') {
          const prevVal = vars[b.variable];
          const newVal = evaluateFormula(b.formula, vars);
          if (newVal !== prevVal) {
            vars[b.variable] = newVal;
            changed = true;
          }
        }
      });
      if (!changed) break;
    }
    setVariables(vars);
  }, [blocks]);

  // Handler to edit fields of a block
  const handleEditBlock = (id, key, val) => {
    setBlocks(prev => prev.map(b => {
      if (b.id !== id) return b;
      
      // Sanitizar nombres de variables: letras, números y guiones bajos
      if (key === 'variable') {
        const sanitized = val.toLowerCase().replace(/[^a-z0-9_]/g, '');
        return { ...b, [key]: sanitized };
      }
      return { ...b, [key]: val };
    }));
  };

  // Add block from side palette
  const handleAddBlock = (type) => {
    const newId = `block_${Date.now()}`;
    const baseVarName = `${type}_${blocks.length + 1}`;
    
    let newBlock = {
      id: newId,
      type,
      title: `Nuevo Bloque ${type.toUpperCase()}`,
      variable: baseVarName,
      notes: ''
    };

    if (type === 'input') {
      newBlock.value = 100;
      newBlock.unit = 'unidades';
    } else if (type === 'formula' || type === 'kpi') {
      newBlock.formula = '10 * 10';
      newBlock.unit = 'unidades';
    } else if (type === 'table') {
      newBlock.title = 'Tabla Resumen';
      newBlock.selectedVars = blocks.slice(0, 3).map(b => b.variable);
    } else if (type === 'chart') {
      newBlock.title = 'Gráfica de Carga';
      newBlock.selectedVars = blocks.filter(b => b.type !== 'note').slice(0, 3).map(b => b.variable);
    } else if (type === 'note') {
      newBlock.title = 'Nota Técnica';
      newBlock.content = 'Escribe aquí la documentación del proceso o límites operativos.';
    }

    setBlocks(prev => [...prev, newBlock]);
  };

  // Duplicate a block
  const handleDuplicateBlock = (block, e) => {
    e.stopPropagation();
    const newId = `block_${Date.now()}`;
    const newBlock = {
      ...JSON.parse(JSON.stringify(block)),
      id: newId,
      title: `${block.title} (Copia)`,
      variable: `${block.variable}_copia`
    };
    setBlocks(prev => [...prev, newBlock]);
  };

  // Delete a block
  const handleDeleteBlock = (id, e) => {
    e.stopPropagation();
    if (blocks.length <= 1) {
      alert("Debes mantener al menos un bloque de simulación.");
      return;
    }
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  // Move blocks up/down in ordering
  const handleMoveBlock = (index, direction, e) => {
    e.stopPropagation();
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === blocks.length - 1) return;

    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const reordered = [...blocks];
    const temp = reordered[index];
    reordered[index] = reordered[targetIndex];
    reordered[targetIndex] = temp;
    setBlocks(reordered);
  };

  // Export layout as JSON
  const handleExportJSON = () => {
    const config = {
      schema: 'pandora_dynamic_builder_v1',
      name: simName,
      description: simDesc,
      accent: accentColor,
      blocks
    };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${simName.toLowerCase().replace(/[^a-z0-9]/g, '_')}_config.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Import layout from JSON
  const handleImportJSON = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target.result);
        if (parsed.schema !== 'pandora_dynamic_builder_v1') {
          alert('El archivo JSON no corresponde a un esquema válido del constructor dinámico.');
          return;
        }
        setSimName(parsed.name || 'Simulador Importado');
        setSimDesc(parsed.description || '');
        setAccentColor(parsed.accent || '#8b5cf6');
        setBlocks(parsed.blocks || []);
      } catch (err) {
        alert('Error al leer el archivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 relative overflow-hidden">
      {/* Background neon flares */}
      <div className="absolute top-[-10%] left-[-15%] w-[45%] h-[45%] rounded-full bg-neon-cyan/5 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-neon-purple/5 blur-[130px] pointer-events-none" />

      <div className="max-w-[1700px] mx-auto space-y-6 relative z-10">
        
        {/* Navigation & Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-[#1A1A1A] pb-5 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/alpha/simulators')}
              className="p-3 rounded-xl bg-[#111] hover:bg-[#1C1C1C] border border-[#222] text-gray-400 hover:text-white transition-all flex items-center justify-center"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <input 
                  type="text" 
                  value={simName}
                  onChange={e => setSimName(e.target.value)}
                  className="bg-transparent border-b border-transparent hover:border-gray-700 focus:border-neon-cyan outline-none text-2xl font-black uppercase text-white tracking-wide w-[300px] md:w-[450px]"
                />
                <span className="px-2.5 py-0.5 rounded bg-neon-purple/20 border border-neon-purple/35 text-[9px] text-neon-purple tracking-widest uppercase font-bold">
                  Builder v7.80
                </span>
              </div>
              <input 
                type="text"
                value={simDesc}
                onChange={e => setSimDesc(e.target.value)}
                placeholder="Añade una descripción sobre los bloques de cálculo."
                className="bg-transparent border-b border-transparent hover:border-gray-800 focus:border-gray-600 outline-none text-xs text-gray-500 font-medium tracking-wide w-full"
              />
            </div>
          </div>

          {/* Builder Controls */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Accent selection */}
            <div className="flex items-center gap-2 bg-[#0F0F0F] border border-[#1E1E1E] rounded-xl px-3 py-2">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Acento:</span>
              <div className="flex gap-1.5">
                {['#8b5cf6', '#00F0FF', '#ec4899', '#10b981', '#f59e0b'].map(c => (
                  <button
                    key={c}
                    onClick={() => setAccentColor(c)}
                    className="w-4 h-4 rounded-full border border-black transition-transform hover:scale-110 relative"
                    style={{ backgroundColor: c }}
                  >
                    {accentColor === c && (
                      <div className="absolute inset-0 bg-white/35 rounded-full" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* JSON Import/Export */}
            <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111] hover:bg-[#181818] border border-[#222] text-gray-300 hover:text-white transition-all text-xs font-bold cursor-pointer">
              <FileJson className="w-4 h-4" />
              Importar JSON
              <input 
                type="file" 
                accept=".json" 
                onChange={handleImportJSON} 
                className="hidden" 
              />
            </label>

            <button
              onClick={handleExportJSON}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#111] hover:bg-[#181818] border border-[#222] text-gray-300 hover:text-white transition-all text-xs font-bold"
            >
              <FileJson className="w-4 h-4" />
              Exportar JSON
            </button>

            {/* Supabase Save hook ready */}
            <button
              onClick={() => {
                alert("Estructura guardada temporalmente de manera local. La persistencia en la base de datos de Supabase se activará en la siguiente fase de desarrollo.");
              }}
              style={{ backgroundColor: `${accentColor}20`, borderColor: `${accentColor}60`, color: accentColor }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border font-bold text-xs shadow-md transition-transform hover:scale-[1.02] active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              Guardar en PANDORA
            </button>
          </div>
        </div>

        {/* Builder Work Area */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* LEFT: Blocks Palette */}
          <div className="lg:col-span-3 space-y-4">
            <div className="p-6 rounded-2xl bg-[#090909] border border-[#1A1A1A] shadow-xl relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 w-full h-[2px]" 
                style={{ backgroundColor: accentColor }}
              />
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-300 flex items-center gap-2 pb-3 border-b border-[#1A1A1A] mb-4">
                <Settings className="w-4 h-4" /> Paleta de Bloques
              </h2>
              
              <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-5">
                Haz clic en cualquier bloque a continuación para insertarlo de forma dinámica en tu lienzo de simulación.
              </p>

              <div className="space-y-3">
                {[
                  { type: 'input', label: 'Input Numérico', desc: 'Variables físicas (Velocidades, dimensiones, turnos...)', icon: Type, color: '#00F0FF' },
                  { type: 'formula', label: 'Fórmula / Cálculo', desc: 'Opera variables (suma, resta, multiplicación...)', icon: Calculator, color: '#8b5cf6' },
                  { type: 'kpi', label: 'KPI / Resultado', desc: 'Panel destacado para metas o indicadores clave', icon: Award, color: '#ec4899' },
                  { type: 'table', label: 'Tabla Resumen', desc: 'Resumen tabular ordenado de las variables', icon: Table, color: '#10b981' },
                  { type: 'chart', label: 'Gráfica de Carga', desc: 'Visualización comparativa mediante barras SVG', icon: BarChart3, color: '#f59e0b' },
                  { type: 'note', label: 'Nota Técnica', desc: 'Documentación técnica, guías o límites', icon: BookOpen, color: '#6b7280' }
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.type}
                      onClick={() => handleAddBlock(item.type)}
                      className="w-full text-left p-3.5 rounded-xl bg-[#111] hover:bg-[#161616] border border-[#1E1E1E] hover:border-gray-700 transition-all flex items-start gap-3 group relative overflow-hidden"
                    >
                      <div 
                        className="w-9 h-9 rounded-lg flex items-center justify-center border transition-all"
                        style={{ backgroundColor: `${item.color}15`, borderColor: `${item.color}35`, color: item.color }}
                      >
                        <Icon className="w-5 h-5 group-hover:scale-110 transition-transform" />
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-xs font-black uppercase text-white tracking-wider group-hover:text-neon-cyan transition-colors">
                          {item.label}
                        </span>
                        <p className="text-[10px] text-gray-500 font-medium leading-normal line-clamp-2">
                          {item.desc}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Quick Tutorial Help Panel */}
            <div className="p-5 rounded-2xl bg-[#090909] border border-[#1A1A1A] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <HelpCircle className="w-4 h-4 text-neon-cyan" />
                Guía de Fórmulas
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Para referenciar otras variables en tus bloques de fórmulas, escribe exactamente su identificador corto en minúsculas. 
                <br /><br />
                Ejemplo:
                <br />
                <code className="text-neon-cyan bg-black/60 px-1.5 py-0.5 rounded border border-[#222]">cap_nominal * horas_dia</code>
              </p>
            </div>
          </div>

          {/* MIDDLE: Simulator Canvas */}
          <div className="lg:col-span-6 space-y-5">
            {blocks.map((block, index) => {
              const borderStyles = {
                input: { border: 'border-l-4 border-l-[#00F0FF]', tagColor: '#00F0FF' },
                formula: { border: 'border-l-4 border-l-[#8b5cf6]', tagColor: '#8b5cf6' },
                kpi: { border: 'border-l-4 border-l-[#ec4899]', tagColor: '#ec4899' },
                table: { border: 'border-l-4 border-l-[#10b981]', tagColor: '#10b981' },
                chart: { border: 'border-l-4 border-l-[#f59e0b]', tagColor: '#f59e0b' },
                note: { border: 'border-l-4 border-l-[#6b7280]', tagColor: '#6b7280' }
              }[block.type];

              return (
                <div
                  key={block.id}
                  className={`p-5 rounded-2xl bg-[#0A0A0A] border border-[#1C1C1C] ${borderStyles.border} shadow-lg relative group transition-all`}
                >
                  
                  {/* Block Header Toolbar */}
                  <div className="flex items-center justify-between pb-3 border-b border-[#181818] mb-4 gap-2">
                    <div className="flex items-center gap-2">
                      <span 
                        style={{ color: borderStyles.tagColor, backgroundColor: `${borderStyles.tagColor}15` }}
                        className="px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-wider"
                      >
                        {block.type}
                      </span>
                      <input 
                        type="text" 
                        value={block.title}
                        onChange={e => handleEditBlock(block.id, 'title', e.target.value)}
                        className="bg-transparent border-b border-transparent hover:border-gray-800 focus:border-gray-600 outline-none text-xs font-black uppercase tracking-wider text-white w-[150px] md:w-[220px]"
                      />
                    </div>

                    {/* Toolbar Actions */}
                    <div className="flex items-center gap-1.5 opacity-30 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={(e) => handleMoveBlock(index, 'up', e)}
                        className="p-1 rounded bg-[#111] hover:bg-[#1E1E1E] text-gray-400 hover:text-white transition-all disabled:opacity-30"
                        disabled={index === 0}
                        title="Mover arriba"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => handleMoveBlock(index, 'down', e)}
                        className="p-1 rounded bg-[#111] hover:bg-[#1E1E1E] text-gray-400 hover:text-white transition-all disabled:opacity-30"
                        disabled={index === blocks.length - 1}
                        title="Mover abajo"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => handleDuplicateBlock(block, e)}
                        className="p-1 rounded bg-[#111] hover:bg-[#1E1E1E] text-gray-400 hover:text-white transition-all"
                        title="Duplicar Bloque"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button 
                        onClick={(e) => handleDeleteBlock(block.id, e)}
                        className="p-1 rounded bg-[#111] hover:bg-red-950/20 text-red-500 hover:text-red-400 transition-all border border-transparent hover:border-red-900/40"
                        title="Eliminar Bloque"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Block Content depending on type */}
                  <div className="space-y-4">
                    
                    {/* INPUT TYPE */}
                    {block.type === 'input' && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Identificador Variable</label>
                          <input 
                            type="text" 
                            value={block.variable}
                            onChange={e => handleEditBlock(block.id, 'variable', e.target.value)}
                            placeholder="ej. cap_nominal"
                            className="w-full bg-[#121212] border border-[#222] rounded-xl px-3 py-2 text-xs text-white focus:border-neon-cyan outline-none font-mono"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Valor Numérico</label>
                          <input 
                            type="number" 
                            value={block.value}
                            onChange={e => handleEditBlock(block.id, 'value', Number(e.target.value))}
                            className="w-full bg-[#121212] border border-[#222] rounded-xl px-3 py-2 text-xs text-white focus:border-neon-cyan outline-none font-bold"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Unidad</label>
                          <div className="flex gap-2">
                            <input 
                              type="text" 
                              value={block.unit}
                              onChange={e => handleEditBlock(block.id, 'unit', e.target.value)}
                              placeholder="ej. kilos/h"
                              className="flex-1 bg-[#121212] border border-[#222] rounded-xl px-3 py-2 text-xs text-white focus:border-neon-cyan outline-none font-bold"
                            />
                            <select 
                              value={['kilos/h', 'piezas/min', 'cajas/h', 'toneladas/día', 'litros/seg', 'unidades/h', 'h/día', 'min/turno', 'seg', 'turnos/día', 'm/min', 'm/s', 'mm', 'metros', 'kg', 'litros', 'kW', 'HP', 'kWh', 'V', 'A', 'USD', 'MXN', 'USD/h', '%'].includes(block.unit) ? block.unit : ''}
                              onChange={e => {
                                if (e.target.value) {
                                  handleEditBlock(block.id, 'unit', e.target.value);
                                }
                              }}
                              className="bg-[#121212] border border-[#222] rounded-xl px-2 py-2 text-xs text-gray-400 focus:text-white outline-none max-w-[125px] cursor-pointer"
                            >
                              <option value="">⚙️ Elegir...</option>
                              <optgroup label="Producción / Flujo">
                                <option value="kilos/h">kilos/h</option>
                                <option value="piezas/min">piezas/min</option>
                                <option value="cajas/h">cajas/h</option>
                                <option value="toneladas/día">toneladas/día</option>
                                <option value="litros/seg">litros/seg</option>
                                <option value="unidades/h">unidades/h</option>
                              </optgroup>
                              <optgroup label="Tiempo / Frecuencia">
                                <option value="h/día">h/día</option>
                                <option value="min/turno">min/turno</option>
                                <option value="seg">seg</option>
                                <option value="turnos/día">turnos/día</option>
                              </optgroup>
                              <optgroup label="Físico / Mecánico">
                                <option value="m/min">m/min</option>
                                <option value="m/s">m/s</option>
                                <option value="mm">mm</option>
                                <option value="metros">metros</option>
                                <option value="kg">kg</option>
                                <option value="litros">litros</option>
                              </optgroup>
                              <optgroup label="Energía / Potencia">
                                <option value="kW">kW</option>
                                <option value="HP">HP</option>
                                <option value="kWh">kWh</option>
                                <option value="V">V</option>
                                <option value="A">A</option>
                              </optgroup>
                              <optgroup label="Financiero / KPI">
                                <option value="USD">USD</option>
                                <option value="MXN">MXN</option>
                                <option value="USD/h">USD/h</option>
                                <option value="%">%</option>
                              </optgroup>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* FORMULA TYPE */}
                    {block.type === 'formula' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Identificador Resultado</label>
                            <input 
                              type="text" 
                              value={block.variable}
                              onChange={e => handleEditBlock(block.id, 'variable', e.target.value)}
                              placeholder="ej. prod_diaria"
                              className="w-full bg-[#121212] border border-[#222] rounded-xl px-3 py-2 text-xs text-white focus:border-neon-purple outline-none font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fórmula Matemática</label>
                            <input 
                              type="text" 
                              value={block.formula}
                              onChange={e => handleEditBlock(block.id, 'formula', e.target.value)}
                              placeholder="ej. cap_nominal * horas_dia"
                              className="w-full bg-[#121212] border border-[#222] rounded-xl px-3 py-2 text-xs text-white focus:border-neon-purple outline-none font-mono text-neon-cyan font-bold"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Unidad Salida</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={block.unit}
                                onChange={e => handleEditBlock(block.id, 'unit', e.target.value)}
                                placeholder="ej. kilos/h"
                                className="flex-1 bg-[#121212] border border-[#222] rounded-xl px-3 py-2 text-xs text-white focus:border-neon-purple outline-none font-bold"
                              />
                              <select 
                                value={['kilos/h', 'piezas/min', 'cajas/h', 'toneladas/día', 'litros/seg', 'unidades/h', 'h/día', 'min/turno', 'seg', 'turnos/día', 'm/min', 'm/s', 'mm', 'metros', 'kg', 'litros', 'kW', 'HP', 'kWh', 'V', 'A', 'USD', 'MXN', 'USD/h', '%'].includes(block.unit) ? block.unit : ''}
                                onChange={e => {
                                  if (e.target.value) {
                                    handleEditBlock(block.id, 'unit', e.target.value);
                                  }
                                }}
                                className="bg-[#121212] border border-[#222] rounded-xl px-2 py-2 text-xs text-gray-400 focus:text-white outline-none max-w-[125px] cursor-pointer"
                              >
                                <option value="">⚙️ Elegir...</option>
                                <optgroup label="Producción / Flujo">
                                  <option value="kilos/h">kilos/h</option>
                                  <option value="piezas/min">piezas/min</option>
                                  <option value="cajas/h">cajas/h</option>
                                  <option value="toneladas/día">toneladas/día</option>
                                  <option value="litros/seg">litros/seg</option>
                                  <option value="unidades/h">unidades/h</option>
                                </optgroup>
                                <optgroup label="Tiempo / Frecuencia">
                                  <option value="h/día">h/día</option>
                                  <option value="min/turno">min/turno</option>
                                  <option value="seg">seg</option>
                                  <option value="turnos/día">turnos/día</option>
                                </optgroup>
                                <optgroup label="Físico / Mecánico">
                                  <option value="m/min">m/min</option>
                                  <option value="m/s">m/s</option>
                                  <option value="mm">mm</option>
                                  <option value="metros">metros</option>
                                  <option value="kg">kg</option>
                                  <option value="litros">litros</option>
                                </optgroup>
                                <optgroup label="Energía / Potencia">
                                  <option value="kW">kW</option>
                                  <option value="HP">HP</option>
                                  <option value="kWh">kWh</option>
                                  <option value="V">V</option>
                                  <option value="A">A</option>
                                </optgroup>
                                <optgroup label="Financiero / KPI">
                                  <option value="USD">USD</option>
                                  <option value="MXN">MXN</option>
                                  <option value="USD/h">USD/h</option>
                                  <option value="%">%</option>
                                </optgroup>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Real-time formula output preview */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-black/40 border border-[#161616]">
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Resultado Resolvido</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-base font-black text-neon-purple">
                              {typeof variables[block.variable] === 'number' 
                                ? variables[block.variable].toLocaleString('es-MX', { maximumFractionDigits: 2 }) 
                                : variables[block.variable]}
                            </span>
                            <span className="text-[10px] font-bold text-gray-500">{block.unit}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* KPI TYPE */}
                    {block.type === 'kpi' && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Identificador Variable</label>
                            <input 
                              type="text" 
                              value={block.variable}
                              onChange={e => handleEditBlock(block.id, 'variable', e.target.value)}
                              placeholder="ej. oee_target"
                              className="w-full bg-[#121212] border border-[#222] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ec4899] outline-none font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Fórmula o Valor</label>
                            <input 
                              type="text" 
                              value={block.formula}
                              onChange={e => handleEditBlock(block.id, 'formula', e.target.value)}
                              placeholder="ej. prod_diaria * 0.85"
                              className="w-full bg-[#121212] border border-[#222] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ec4899] outline-none font-mono"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Unidad KPI</label>
                            <div className="flex gap-2">
                              <input 
                                type="text" 
                                value={block.unit}
                                onChange={e => handleEditBlock(block.id, 'unit', e.target.value)}
                                placeholder="ej. kilos/h"
                                className="flex-1 bg-[#121212] border border-[#222] rounded-xl px-3 py-2 text-xs text-white focus:border-[#ec4899] outline-none font-bold"
                              />
                              <select 
                                value={['kilos/h', 'piezas/min', 'cajas/h', 'toneladas/día', 'litros/seg', 'unidades/h', 'h/día', 'min/turno', 'seg', 'turnos/día', 'm/min', 'm/s', 'mm', 'metros', 'kg', 'litros', 'kW', 'HP', 'kWh', 'V', 'A', 'USD', 'MXN', 'USD/h', '%'].includes(block.unit) ? block.unit : ''}
                                onChange={e => {
                                  if (e.target.value) {
                                    handleEditBlock(block.id, 'unit', e.target.value);
                                  }
                                }}
                                className="bg-[#121212] border border-[#222] rounded-xl px-2 py-2 text-xs text-gray-400 focus:text-white outline-none max-w-[125px] cursor-pointer"
                              >
                                <option value="">⚙️ Elegir...</option>
                                <optgroup label="Producción / Flujo">
                                  <option value="kilos/h">kilos/h</option>
                                  <option value="piezas/min">piezas/min</option>
                                  <option value="cajas/h">cajas/h</option>
                                  <option value="toneladas/día">toneladas/día</option>
                                  <option value="litros/seg">litros/seg</option>
                                  <option value="unidades/h">unidades/h</option>
                                </optgroup>
                                <optgroup label="Tiempo / Frecuencia">
                                  <option value="h/día">h/día</option>
                                  <option value="min/turno">min/turno</option>
                                  <option value="seg">seg</option>
                                  <option value="turnos/día">turnos/día</option>
                                </optgroup>
                                <optgroup label="Físico / Mecánico">
                                  <option value="m/min">m/min</option>
                                  <option value="m/s">m/s</option>
                                  <option value="mm">mm</option>
                                  <option value="metros">metros</option>
                                  <option value="kg">kg</option>
                                  <option value="litros">litros</option>
                                </optgroup>
                                <optgroup label="Energía / Potencia">
                                  <option value="kW">kW</option>
                                  <option value="HP">HP</option>
                                  <option value="kWh">kWh</option>
                                  <option value="V">V</option>
                                  <option value="A">A</option>
                                </optgroup>
                                <optgroup label="Financiero / KPI">
                                  <option value="USD">USD</option>
                                  <option value="MXN">MXN</option>
                                  <option value="USD/h">USD/h</option>
                                  <option value="%">%</option>
                                </optgroup>
                              </select>
                            </div>
                          </div>
                        </div>

                        {/* Large gorgeous KPI display card */}
                        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#180e15] to-[#0A0A0A] border border-[#ff4ba6]/20 flex flex-col items-center justify-center text-center space-y-1 py-6 relative overflow-hidden shadow-inner">
                          <div className="absolute top-0 right-0 w-[80px] h-[80px] bg-[#ff4ba6]/5 rounded-full blur-xl pointer-events-none" />
                          <span className="text-[10px] font-black uppercase text-[#ec4899] tracking-widest">{block.title}</span>
                          <span className="text-3xl font-black text-white drop-shadow-[0_0_12px_rgba(236,72,153,0.3)]">
                            {typeof variables[block.variable] === 'number' 
                              ? variables[block.variable].toLocaleString('es-MX', { maximumFractionDigits: 2 }) 
                              : variables[block.variable]}
                          </span>
                          <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{block.unit || 'unidad'}</span>
                        </div>
                      </div>
                    )}

                    {/* TABLE TYPE */}
                    {block.type === 'table' && (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Variables a incluir</label>
                          <div className="flex flex-wrap gap-1.5">
                            {blocks.filter(b => b.type !== 'note' && b.type !== 'table' && b.type !== 'chart').map(item => {
                              const isChecked = block.selectedVars?.includes(item.variable);
                              return (
                                <button
                                  key={item.variable}
                                  type="button"
                                  onClick={() => {
                                    const nextList = isChecked 
                                      ? (block.selectedVars || []).filter(v => v !== item.variable)
                                      : [...(block.selectedVars || []), item.variable];
                                    handleEditBlock(block.id, 'selectedVars', nextList);
                                  }}
                                  style={{ borderColor: isChecked ? '#10b981' : '#222' }}
                                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-wider uppercase transition-all ${
                                    isChecked ? 'bg-[#10b981]/15 text-[#10b981]' : 'bg-[#121212] text-gray-400 hover:text-white'
                                  }`}
                                >
                                  {item.variable}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Custom visual tabular preview */}
                        <div className="rounded-xl border border-[#1A1A1A] overflow-hidden bg-black/40">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#0f0f0f] border-b border-[#1A1A1A] text-[9px] font-black uppercase tracking-wider text-gray-400">
                              <tr>
                                <th className="p-3">Variable</th>
                                <th className="p-3 text-right">Valor Resolvido</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#161616]">
                              {(block.selectedVars || []).map(v => {
                                const related = blocks.find(b => b.variable === v);
                                return (
                                  <tr key={v} className="hover:bg-white/5 transition-colors">
                                    <td className="p-3 font-semibold text-gray-300 font-mono">{v}</td>
                                    <td className="p-3 text-right font-bold text-neon-cyan">
                                      {typeof variables[v] === 'number' 
                                        ? variables[v].toLocaleString('es-MX', { maximumFractionDigits: 2 }) 
                                        : variables[v] ?? '—'}{' '}
                                      <span className="text-[9px] text-gray-500 font-normal">{related?.unit}</span>
                                    </td>
                                  </tr>
                                );
                              })}
                              {(!block.selectedVars || block.selectedVars.length === 0) && (
                                <tr>
                                  <td colSpan="2" className="p-4 text-center text-[10px] text-gray-500 font-medium italic">
                                    Ninguna variable seleccionada para la tabla.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}

                    {/* CHART TYPE */}
                    {block.type === 'chart' && (
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Variables a graficar</label>
                          <div className="flex flex-wrap gap-1.5">
                            {blocks.filter(b => b.type !== 'note' && b.type !== 'table' && b.type !== 'chart').map(item => {
                              const isChecked = block.selectedVars?.includes(item.variable);
                              return (
                                <button
                                  key={item.variable}
                                  type="button"
                                  onClick={() => {
                                    const nextList = isChecked 
                                      ? (block.selectedVars || []).filter(v => v !== item.variable)
                                      : [...(block.selectedVars || []), item.variable];
                                    handleEditBlock(block.id, 'selectedVars', nextList);
                                  }}
                                  style={{ borderColor: isChecked ? '#f59e0b' : '#222' }}
                                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold tracking-wider uppercase transition-all ${
                                    isChecked ? 'bg-[#f59e0b]/15 text-[#f59e0b]' : 'bg-[#121212] text-gray-400 hover:text-white'
                                  }`}
                                >
                                  {item.variable}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        {/* Interactive dynamic SVG chart rendering */}
                        <div className="p-4 rounded-xl bg-black/40 border border-[#1A1A1A] flex flex-col justify-center items-center">
                          {block.selectedVars && block.selectedVars.length > 0 ? (
                            <div className="w-full space-y-4">
                              <span className="text-[10px] font-black uppercase tracking-widest text-[#f59e0b] block text-center mb-1">
                                {block.title}
                              </span>
                              <div className="space-y-3">
                                {block.selectedVars.map(v => {
                                  const val = Number(variables[v]) || 0;
                                  // Compute dynamic visual percentage limit
                                  const maxVal = Math.max(...block.selectedVars.map(key => Number(variables[key]) || 1));
                                  const pct = maxVal > 0 ? (val / maxVal) * 100 : 0;
                                  const related = blocks.find(b => b.variable === v);

                                  return (
                                    <div key={v} className="space-y-1">
                                      <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-gray-400">
                                        <span className="font-mono text-gray-300">{v}</span>
                                        <span className="text-[#f59e0b]">
                                          {val.toLocaleString('es-MX', { maximumFractionDigits: 1 })}{' '}
                                          <span className="text-gray-500 font-normal">{related?.unit}</span>
                                        </span>
                                      </div>
                                      <div className="w-full h-3 rounded-full bg-[#141414] border border-[#222] overflow-hidden">
                                        <div 
                                          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                                          className="h-full bg-gradient-to-r from-[#f59e0b]/60 to-[#f59e0b] rounded-full transition-all duration-500"
                                        />
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-500 font-medium italic">
                              Selecciona al menos una variable para renderizar la gráfica.
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* NOTE TYPE */}
                    {block.type === 'note' && (
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Notas y Documentación del Bloque</label>
                        <textarea
                          rows="4"
                          value={block.content}
                          onChange={e => handleEditBlock(block.id, 'content', e.target.value)}
                          placeholder="Ingresa notas operativas, criterios de OEE, límites de potencia o fórmulas teóricas..."
                          className="w-full bg-[#121212] border border-[#222] rounded-xl px-4 py-3 text-xs text-gray-300 focus:border-gray-500 outline-none leading-relaxed resize-none"
                        />
                      </div>
                    )}

                    {/* General block annotations (optional text note on all blocks) */}
                    {block.type !== 'note' && (
                      <div className="pt-2">
                        <input 
                          type="text" 
                          value={block.notes}
                          onChange={e => handleEditBlock(block.id, 'notes', e.target.value)}
                          placeholder="✎ Añade notas técnicas sobre este bloque o variable..."
                          className="w-full bg-transparent border-none outline-none text-[10px] text-gray-500 hover:text-gray-400 font-medium focus:text-gray-300 italic"
                        />
                      </div>
                    )}

                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT: Live Results Panel */}
          <div className="lg:col-span-3 space-y-4">
            <div className="p-6 rounded-2xl bg-[#090909] border border-[#1A1A1A] shadow-xl relative overflow-hidden">
              <div 
                className="absolute top-0 left-0 w-full h-[2px]" 
                style={{ backgroundColor: accentColor }}
              />
              
              <h2 className="text-sm font-black uppercase tracking-widest text-gray-300 flex items-center gap-2 pb-3 border-b border-[#1A1A1A] mb-4">
                <Play className="w-4 h-4 text-neon-cyan" /> Resultados Vivos
              </h2>

              <p className="text-[11px] text-gray-500 font-medium leading-relaxed mb-4">
                Listado en tiempo real con todas las variables cargadas y procesadas por el motor de cálculos del constructor.
              </p>

              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1">
                {Object.keys(variables).map(vName => {
                  const val = variables[vName];
                  const block = blocks.find(b => b.variable === vName);
                  if (!block) return null;

                  return (
                    <div 
                      key={vName} 
                      className="p-3 rounded-xl bg-black/60 border border-[#141414] flex justify-between items-center group/item hover:border-gray-800 transition-colors"
                    >
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-bold text-gray-400 block font-mono">{vName}</span>
                        <span className="text-[9px] text-gray-600 block uppercase tracking-wide font-black truncate max-w-[130px]">
                          {block.title}
                        </span>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="text-sm font-black text-white">
                          {typeof val === 'number' 
                            ? val.toLocaleString('es-MX', { maximumFractionDigits: 2 }) 
                            : val}
                        </span>
                        <span className="text-[8px] font-bold text-gray-600 uppercase">{block.unit}</span>
                      </div>
                    </div>
                  );
                })}
                {Object.keys(variables).length === 0 && (
                  <div className="text-center py-6 text-[10px] text-gray-500 italic">
                    Sin variables cargadas en el canvas.
                  </div>
                )}
              </div>
            </div>

            {/* Dynamic visual health summary */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-[#090909] to-[#050505] border border-[#1A1A1A] space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                <AlertCircle className="w-4 h-4 text-neon-cyan" />
                Diagnóstico del Motor
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[10px] text-gray-500">
                  <span>Bloques Totales:</span>
                  <span className="font-bold text-white font-mono">{blocks.length}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500">
                  <span>Variables Activas:</span>
                  <span className="font-bold text-white font-mono">{Object.keys(variables).length}</span>
                </div>
                <div className="flex justify-between items-center text-[10px] text-gray-500">
                  <span>Errores de Cálculo:</span>
                  <span className="font-bold text-green-500 font-mono">
                    {Object.values(variables).filter(v => v === 'Error').length}
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

export default DynamicSimulatorBuilder;
