import React, { useState, useEffect } from 'react';
import { Layers, Activity, Plus, Copy, Trash2, Edit3, X, Eye } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

function SimulatorsPage() {
  const navigate = useNavigate();

  // 1. Estado de simuladores en localStorage (con fusiones de respaldo del sistema)
  const [simulators, setSimulators] = useState(() => {
    const saved = localStorage.getItem('pandora_simulators');
    let list = [];
    if (saved) {
      try {
        list = JSON.parse(saved);
      } catch (e) {
        console.error('Error cargando simuladores:', e);
      }
    }
    
    // Asegurar que los simuladores base del sistema siempre existan en el hub
    const defaults = [
      {
        id: 'rider',
        name: 'RYDER',
        description: 'Simulador de Velocidad vs Cajas para línea de lavado y secado (140 m/h max).',
        icon: 'Activity',
        color: '#3b82f6',
        isSystem: true
      },
      {
        id: 'grupo-gusi',
        name: 'GRUPO GUSI',
        description: 'Simulador de Velocidad vs Cajas para línea de lavado y secado (140 m/h max).',
        icon: 'Activity',
        color: '#00F0FF',
        isSystem: true
      }
    ];

    // Fusionar listas de forma que no duplique IDs de sistema y preserve elementos del usuario
    const merged = Array.isArray(list) ? [...list] : [];
    defaults.forEach(d => {
      if (!merged.some(s => s.id === d.id)) {
        merged.push(d);
      }
    });

    return merged;
  });

  // Guardar en localStorage cada vez que cambia el listado
  useEffect(() => {
    localStorage.setItem('pandora_simulators', JSON.stringify(simulators));
  }, [simulators]);

  // 2. Estados de control de Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState('create'); // 'create' | 'edit' | 'clone'
  const [currentSim, setCurrentSim] = useState(null); // Para editar o clonar
  
  // Campos del formulario
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formColor, setFormColor] = useState('#3b82f6');
  const [formIcon, setFormIcon] = useState('Activity');

  // Colores predefinidos y elegantes (diseño premium)
  const COLORS = [
    { value: '#3b82f6', name: 'Azul Eléctrico' },
    { value: '#00F0FF', name: 'Cian Neón' },
    { value: '#8b5cf6', name: 'Violeta Profundo' },
    { value: '#ec4899', name: 'Rosa Neón' },
    { value: '#10b981', name: 'Verde Esmeralda' },
    { value: '#f59e0b', name: 'Ámbar Cálido' }
  ];

  // 3. Acciones de negocio

  // Abrir modal de creación
  const openCreateModal = () => {
    setModalType('create');
    setCurrentSim(null);
    setFormName('');
    setFormDesc('Simulador avanzado de capacidad y optimización de líneas industriales.');
    setFormColor('#00F0FF');
    setFormIcon('Layers');
    setIsModalOpen(true);
  };

  // Abrir modal de edición
  const openEditModal = (sim, e) => {
    e.preventDefault();
    e.stopPropagation();
    setModalType('edit');
    setCurrentSim(sim);
    setFormName(sim.name);
    setFormDesc(sim.description);
    setFormColor(sim.color || '#3b82f6');
    setFormIcon(sim.icon || 'Activity');
    setIsModalOpen(true);
  };

  // Abrir modal de clonación rápida
  const openCloneModal = (sim, e) => {
    e.preventDefault();
    e.stopPropagation();
    setModalType('clone');
    setCurrentSim(sim);
    setFormName(`${sim.name} (Copia)`);
    setFormDesc(sim.description);
    setFormColor(sim.color || '#3b82f6');
    setFormIcon(sim.icon || 'Activity');
    setIsModalOpen(true);
  };

  // Guardar datos desde el modal (Crear, Editar o Clonar)
  const handleSave = (e) => {
    e.preventDefault();
    if (!formName.trim()) return;

    if (modalType === 'create') {
      const newId = `sim_${Date.now()}`;
      const newSim = {
        id: newId,
        name: formName.trim(),
        description: formDesc.trim() || 'Simulador personalizado de capacidad y cobertura.',
        icon: formIcon,
        color: formColor,
        isSystem: false
      };

      // Al crear desde cero, copiamos la estructura por defecto de RYDER para que no falle
      copySimulatorData('rider', newId);
      setSimulators([...simulators, newSim]);

    } else if (modalType === 'edit') {
      setSimulators(simulators.map(s => 
        s.id === currentSim.id 
          ? { ...s, name: formName.trim(), description: formDesc.trim(), color: formColor, icon: formIcon }
          : s
      ));

    } else if (modalType === 'clone') {
      const newId = `sim_${Date.now()}`;
      const newSim = {
        id: newId,
        name: formName.trim(),
        description: formDesc.trim(),
        icon: formIcon,
        color: formColor,
        isSystem: false
      };

      copySimulatorData(currentSim.id, newId);
      setSimulators([...simulators, newSim]);
    }

    setIsModalOpen(false);
  };

  // Copiar datos de localStorage de un simulador a otro
  const copySimulatorData = (srcId, destId) => {
    const keys = ['inputs', 'customer_scenarios', 'machine_configs', 'boxes', 'daily_reqs', 'physical_max_mh', 'req_locked'];
    keys.forEach(key => {
      // Mapeo especial para los nombres antiguos de llaves de ryder
      let srcKey = `sim_${srcId}_${key}`;
      if (srcId === 'rider') {
        if (key === 'daily_reqs') srcKey = 'rider_daily_reqs_v2';
        else if (key === 'physical_max_mh') srcKey = 'rider_physical_max_mh';
        else if (key === 'req_locked') srcKey = 'rider_req_locked';
      }

      const val = localStorage.getItem(srcKey);
      if (val !== null) {
        localStorage.setItem(`sim_${destId}_${key}`, val);
      }
    });

    // Si copiamos a partir de rider y no hay nada en local storage aún,
    // RiderSimulatorPage los inicializará automáticamente con valores por defecto cuando cargue.
  };

  // Eliminar un simulador
  const handleDelete = (id, name, e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const confirm = window.confirm(`¿Estás seguro de que deseas eliminar el simulador "${name}"? Esta acción borrará todos sus datos.`);
    if (!confirm) return;

    setSimulators(simulators.filter(s => s.id !== id));

    // Opcional: limpiar claves de localStorage
    const keys = ['inputs', 'customer_scenarios', 'machine_configs', 'boxes', 'daily_reqs', 'physical_max_mh', 'req_locked'];
    keys.forEach(key => {
      localStorage.removeItem(`sim_${id}_${key}`);
    });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-8 relative overflow-hidden">
      {/* Acentos de fondo premium */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-neon-cyan/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-neon-purple/5 blur-[120px] pointer-events-none" />

      <div className="max-w-[1400px] mx-auto space-y-8 mt-4 relative z-10">
        
        {/* Encabezado */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-[#1A1A1A] pb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-neon-cyan/5 border border-neon-cyan/20 flex items-center justify-center shadow-inner group overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-br from-neon-cyan/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <Layers className="w-7 h-7 text-neon-cyan group-hover:scale-110 transition-transform" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-3xl font-black tracking-tight text-white uppercase flex items-center gap-3">
                Hub de Simuladores
                <span className="px-2.5 py-1 rounded-md bg-neon-cyan/10 border border-neon-cyan/20 text-[10px] text-neon-cyan tracking-widest animate-pulse">
                  ACTIVO
                </span>
              </h1>
              <p className="text-gray-500 mt-1.5 font-medium tracking-wide">
                Centro de control unificado para cargar, duplicar y ejecutar entornos de simulación avanzados.
              </p>
            </div>
          </div>
          
          <button 
            onClick={openCreateModal}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#00F0FF]/15 border border-[#00F0FF]/35 hover:bg-[#00F0FF]/25 text-[#00F0FF] transition-all font-bold text-sm shadow-[0_0_15px_rgba(0,240,255,0.15)] group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            Crear Simulador
          </button>
        </div>

        {/* Grid de Simuladores */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pt-4">
          {simulators.map((sim) => {
            const glowColor = sim.color || '#3b82f6';
            
            return (
              <div
                key={sim.id}
                onClick={() => navigate(`/alpha/simulators/${sim.id}`)}
                className="flex flex-col justify-between h-[300px] p-6 rounded-3xl bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-[#1A1A1A] hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.12)] transition-all group relative overflow-hidden cursor-pointer"
              >
                {/* Capa de destello al hacer hover */}
                <div 
                  className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" 
                  style={{ backgroundImage: `linear-gradient(135deg, ${glowColor}10, transparent 60%)` }}
                />

                {/* Acciones de la esquina superior derecha */}
                <div className="absolute top-4 right-4 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                  <button
                    onClick={(e) => openCloneModal(sim, e)}
                    className="p-1.5 rounded-lg bg-[#181818] border border-[#2A2A2A] hover:border-gray-400 text-gray-400 hover:text-white transition-all"
                    title="Clonar Simulador"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => openEditModal(sim, e)}
                    className="p-1.5 rounded-lg bg-[#181818] border border-[#2A2A2A] hover:border-gray-400 text-gray-400 hover:text-white transition-all"
                    title="Editar Información"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  {!sim.isSystem && (
                    <button
                      onClick={(e) => handleDelete(sim.id, sim.name, e)}
                      className="p-1.5 rounded-lg bg-[#181818] border border-red-900/50 hover:border-red-500 text-red-500 hover:text-red-400 transition-all hover:bg-red-950/20"
                      title="Eliminar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                {/* Contenido Superior */}
                <div>
                  <div 
                    className="w-16 h-16 rounded-2xl bg-[#151515] border border-[#222] flex items-center justify-center mb-5 shadow-inner transition-colors relative"
                    style={{ borderColor: sim.isSystem ? undefined : `${glowColor}30` }}
                  >
                    {/* Anillo giratorio de hover */}
                    <div 
                      className="absolute inset-0 rounded-2xl border-2 border-transparent opacity-0 group-hover:opacity-100 group-hover:animate-spin-slow" 
                      style={{ borderTopColor: glowColor }}
                    />
                    <Activity className="w-7 h-7 transition-transform group-hover:scale-110" style={{ color: glowColor }} />
                  </div>

                  <h3 className="text-xl font-black text-white tracking-widest uppercase flex items-center gap-2">
                    {sim.name}
                    {sim.isSystem && (
                      <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-blue-500/10 border border-blue-500/25 text-blue-400 uppercase tracking-normal">
                        Sistema
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-gray-500 mt-2.5 leading-relaxed group-hover:text-gray-300 transition-colors line-clamp-3">
                    {sim.description}
                  </p>
                </div>

                {/* Contenido Inferior (Botón de Acción) */}
                <div className="pt-4 border-t border-[#161616] flex items-center justify-between text-xs text-gray-400 font-bold group-hover:text-white transition-colors">
                  <span className="uppercase tracking-widest text-[9px] group-hover:text-white transition-colors" style={{ color: `${glowColor}bb` }}>
                    Abrir Entorno
                  </span>
                  <Eye className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" style={{ color: glowColor }} />
                </div>

              </div>
            );
          })}
        </div>

      </div>

      {/* MODAL MULTIPROPÓSITO (Crear, Editar, Clonar) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-300">
          <div className="relative bg-[#0d0d0d] border border-gray-800 rounded-3xl p-8 w-full max-w-lg shadow-[0_20px_50px_rgba(0,0,0,0.8)] mx-4 overflow-hidden">
            {/* Acento del Modal */}
            <div className="absolute top-0 left-0 w-full h-[3px]" style={{ backgroundColor: formColor }} />
            
            {/* Header del Modal */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-black uppercase tracking-widest text-white flex items-center gap-2">
                {modalType === 'create' && 'Crear Nuevo Simulador'}
                {modalType === 'edit' && 'Editar Simulador'}
                {modalType === 'clone' && `Clonar ${currentSim?.name}`}
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSave} className="space-y-6">
              
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Nombre del Simulador
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. LINEA LAVADO OESTE"
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-[#222] hover:border-gray-700 focus:border-blue-500 focus:outline-none text-white transition-all text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Descripción / Notas de Línea
                </label>
                <textarea
                  rows="3"
                  placeholder="Describe la línea, límites físicos de velocidad, o el proyecto del cliente."
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-[#222] hover:border-gray-700 focus:border-blue-500 focus:outline-none text-white transition-all text-sm font-medium leading-relaxed resize-none"
                />
              </div>

              {/* Selector de color de branding */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                  Color Identificador (Branding)
                </label>
                <div className="grid grid-cols-6 gap-3">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setFormColor(c.value)}
                      className="h-10 rounded-xl transition-all relative border border-[#222] hover:scale-105"
                      style={{ backgroundColor: c.value }}
                      title={c.name}
                    >
                      {formColor === c.value && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/20 rounded-xl">
                          <div className="w-2.5 h-2.5 bg-white rounded-full shadow" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Botones de acción */}
              <div className="flex gap-4 pt-4 border-t border-[#1C1C1C]">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-3.5 rounded-xl bg-glass-light hover:bg-glass-hover border border-glass-border font-bold text-sm text-gray-400 hover:text-white transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3.5 rounded-xl font-bold text-sm text-black transition-all hover:scale-[1.02] active:scale-[0.98]"
                  style={{ backgroundColor: formColor }}
                >
                  {modalType === 'create' && 'Crear Entorno'}
                  {modalType === 'edit' && 'Guardar Cambios'}
                  {modalType === 'clone' && 'Confirmar Clonación'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default SimulatorsPage;
