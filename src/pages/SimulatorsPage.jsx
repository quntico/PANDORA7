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
      },
      {
        id: 'iase',
        name: 'IASE',
        description: 'Simulador de Velocidad vs Cajas para línea de lavado y secado (140 m/h max).',
        icon: 'Activity',
        color: '#10b981',
        isSystem: true
      },
      {
        id: 'lma-500',
        name: 'LMA-500',
        description: 'Simulador Técnico-Económico Avanzado para la línea de extrusión y reciclado de 500 kg/h.',
        icon: 'Activity',
        color: '#0d9488',
        isSystem: true
      },
      {
        id: 'smq-automatic',
        name: 'SMQ COTIZADOR',
        description: 'Simulador Técnico-Comercial Inteligente para cotización automática de líneas y maquinaria de envasado, extrusión y dosificación SMQ.',
        icon: 'Activity',
        color: '#F5C400',
        isSystem: true
      },
      {
        id: 'carrier',
        name: 'CARRIER',
        description: 'Simulador Técnico de desbobinado, corte, trituración, molienda y briqueteado de rollos de tubo de cobre.',
        icon: 'Activity',
        color: '#00F0FF',
        isSystem: true
      },
      {
        id: 'forvia',
        name: 'FORVIA',
        description: 'Simulador de Velocidad vs Cajas para línea de lavado y secado BDW 200 (140 m/h max) con Digital Twin 3D.',
        icon: 'Activity',
        color: '#e11d48',
        isSystem: true
      },
      {
        id: 'wm-500',
        name: 'WM-500',
        description: 'Simulador técnico-económico paramétrico para la trituradora de madera y tarimas WM-500 con OEE y consumos.',
        icon: 'Activity',
        color: '#00F0FF',
        isSystem: true
      },
      {
        id: 'molex',
        name: 'MOLEX',
        description: 'Simulador técnico-comercial para la recuperación de cobre y cobre estañado en finales de rollo.',
        icon: 'Activity',
        color: '#0f766e',
        isSystem: true
      }
    ];

    // Filtrar de la lista cargada cualquier duplicado de sistema o preset manual antiguo
    const filteredList = Array.isArray(list) ? list.filter(s => {
      if (!s || !s.id) return false;
      const lowerId = s.id.toLowerCase();
      const lowerName = (s.name || '').toLowerCase();
      if (['rider', 'grupo-gusi', 'iase', 'lma-500', 'smq-automatic', 'carrier', 'forvia', 'wm-500', 'molex'].includes(lowerId)) return false;
      if (['iase', 'lma-500', 'smq cotizador', 'carrier', 'forvia', 'wm-500', 'molex'].includes(lowerName)) return false;
      return true;
    }) : [];

    const merged = [...filteredList];
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
  const [formCompanyName, setFormCompanyName] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formProjectName, setFormProjectName] = useState('');

  // Colores predefinidos y elegantes (diseño premium)
  const COLORS = [
    { value: '#3b82f6', name: 'Azul Eléctrico' },
    { value: '#00F0FF', name: 'Cian Neón' },
    { value: '#8b5cf6', name: 'Violeta Profundo' },
    { value: '#ec4899', name: 'Rosa Neón' },
    { value: '#10b981', name: 'Verde Esmeralda' },
    { value: '#f59e0b', name: 'Ámbar Cálido' }
  ];

  // Helper de valores predeterminados para cada tipo de simulador
  const getDefaultInputsForTemplate = (templateId) => {
    const norm = (templateId || '').toLowerCase();
    if (norm.includes('lma-500')) {
      return {
        clientName: 'PABLO SOLER',
        projectName: 'Proyecto Reciclado Solimaq LMA-500',
        companyName: 'SOLIMAQ',
        capacityDesired: 450,
        hoursPerShift: 8,
        shiftsPerDay: 2,
        daysPerMonth: 26,
        materialType: 'hdpe',
        loadFactor: 75,
        electricityRate: 2.30,
        exchangeRate: 18.00,
        numOperators: 2,
        laborCostPerShift: 450,
        maintenanceCost: 800,
        sparePartsCost: 500,
        waterCost: 150,
        requiresAir: true,
        airPressureBar: 7.0,
        airConsumptionNm3: 15.0,
        airCostPerNm3: 0.35,
        capexCableado: 4500,
        capexManiobras: 3000,
        capexMontaje: 6000,
        capexObraCivil: 8000,
        capexCompresor: 12000,
        capexInstalacionAdic: 2500,
        sellPricePerKg: 28.50,
        rawMaterialCostPerKg: 12.00,
        includeRawMaterialInOpex: true,
        nominalCapacity: 500,
        oeePercent: 95,
        wastePercent: 5,
        voltage: 440,
        powerFactor: 0.85,
        feederLength: 50,
        isEpcMode: false,
        useAdvancedPower: false,
        energyStates: { conveyor: 'Normal', shredder: 'Normal', agglomerator: 'Normal', pelletizer: 'Normal', chiller: 'Normal' },
        thermalConfig: { humidity: 1, zoneTemps: 220, dieTemp: 230 },
        dynamicCapexConfig: { ccm: true, cables: true, capacitors: true, transformer: true, engineering: true },
        includeTechAuditPdf: true,
        includeFinancialAuditPdf: true
      };
    }
    if (norm.includes('wm-500')) {
      return {
        companyName: 'ELECTRIZ',
        clientName: 'CENTRAL DE INTELIGENCIA',
        machineName: 'WM 500',
        projectName: 'PROYECTO PREDETERMINADO PANDORA',
        evaluationDate: '20/6/2026',
        materialType: 'TARIMA PESADA',
        evaluationName: 'Trituradora para Maderas y Tarimas',
        technicalSheetName: 'Ficha Técnica de Homologación WM-500',
        energySectionTitle: 'Desglose Energético Operativo',
        capacityCardTitle: 'Capacidad Real Ajustada',
        nominalCapacity: 4000,
        utilization: 90,
        oee: 85,
        loadFactor: 85,
        hoursPerDay: 20,
        shiftsPerDay: 2,
        daysPerMonth: 24,
        dailyGoalKg: 50000,
        reductionFactor: 90,
        motorPrincipalHp: 120,
        motorAuxiliarHp: 10,
        customInstalledPowerKw: 96.98,
        potenciaActivaKw: 82.43,
        electricityRate: 2.50,
        machineLength: 14.50,
        machineWidth: 1.75,
        machineHeight: 1.90,
        pesoKg: 13000,
        bocaAlimentacion: '1300 x 300 mm',
        rotorRpm: 650,
        particulaFinal: '2–3 cm',
        ruidoDb: 80,
        separadorMagnetico: 'Incluido',
        componentesElectricos: 'Schneider Electric',
        motorMarca: 'Siemens',
        precioEquipoUsd: 48600,
        iva: 16,
        tipoCambio: 18,
        porcentajeManiobras: 5,
        porcentajeMontajeMecanico: 6,
        porcentajeObraCivil: 5,
        porcentajeElectricoPrincipal: 8,
        porcentajeCanalizacionProtecciones: 5,
        porcentajeExtraccionPolvo: 12,
        porcentajeSeguridadIndustrial: 3,
        porcentajeIngenieriaSupervision: 4,
        porcentajeContingencia: 10,
        operadoresPorTurno: 1,
        sueldoOperadorMensual: 12000,
        supervisoresPorTurno: 0,
        sueldoSupervisorMensual: 20000,
        mantenimientoAnualPorcentaje: 5,
        cuchillasMensualMxn: 15000,
        refaccionesMensualMxn: 8000,
        lubricacionMensualMxn: 2000,
        limpiezaMensualMxn: 3000,
        consumiblesMensualMxn: 2500,
        otrosOpexMensualMxn: 0,
        precioVentaTonMxn: 500,
        ahorroPorTonMxn: 600,
        usarModoIngresoVenta: true,
        usarModoAhorroInterno: false,
        vidaUtilAnios: 10,
        tasaDescuento: 14,
        depreciacionAnual: 10,
        inflacionAnual: 5,
        incrementoEnergiaAnual: 6,
        riesgoPolvo: 'medio',
        riesgoIncendio: 'bajo',
        riesgoMetal: 'alto',
        riesgoRuido: 'alto',
        frecuenciaMantenimientoHoras: 250,
        vidaUtilCuchillasHoras: 800,
        disponibilidadMecanica: 95,
        factorParo: 5,
        requiereExtraccionPolvo: true,
        requiereSistemaContraIncendio: false,
        requiereCabinaAcustica: false,
        requiereLOTO: true,
        requiereGuardas: true,
        requiereEStop: true
      };
    }
    if (norm.includes('molex')) {
      return {
        pesoObjetivo: 20,
        precioRojo: 195,
        precioEstanado: 175,
        costoCompra: 0,
        multiplicadorActivo: 1,
        diasMes: 26,
        mesesAnio: 12,
        nombreEscenario: "MOLEX finales de rollo",
        companyName: 'CENTRAL DE INTELIGENCIA',
        clientName: 'CENTRAL DE INTELIGENCIA',
        projectName: 'MOLEX - RECUPERACIÓN COBRE',
        machinePurchaseUsd: 45000,
        installationCostUsd: 5000,
        civilWorksUsd: 2500,
        numOperators: 2,
        monthlySalaryMxn: 12000,
        monthlyMaintenanceUsd: 400,
        monthlyConsumablesUsd: 250,
        installedPowerKw: 22,
        averageLoadFactor: 80,
        electricityRateMxn: 2.50,
        voltage: 440,
        exchangeRate: 18.20,
        vidaUtilCuchillasHoras: 800,
        frecuenciaMantenimientoHoras: 250,
        riesgoHumedad: 'medio',
        riesgoPolvo: 'bajo',
        riesgoMetal: 'medio',
        riesgoVoltaje: 'alto'
      };
    }
    if (norm.includes('forvia')) {
      return {
        clientName: 'CENTRAL DE INTELIGENCIA',
        projectName: 'FORVIA - BDW 200',
        evaluationName: 'MÁQUINA EN EVALUACIÓN - PLD-140',
        nominalBoxes: 200,
        machineLength: 7.60,
        maxSpeed: 140,
        defaultGap: 0.10,
        calcMode: 'manual',
        shifts: 2,
        hoursPerShift: 8,
        daysPerMonth: 26,
        electricityRate: 2.50,
        loadFactor: 85,
        installedPowerKw: 89.5,
        sueldoOperadorMensual: 12000,
        operatorsPerShift: 1,
        waterFlowLh: 1000,
        waterReplenishLh: 150,
        tankCapacityL: 1200,
        waterChangeInterval: '3-5 días'
      };
    }
    return {
      machineName: 'PLD-120 / PLD-140',
      nominalBoxes: 200,
      machineLength: 7.60,
      maxAdvance: 1.40,
      manualSpeed: 140 / 60,
      defaultGap: 0.10,
      calcMode: 'manual',
      shifts: 2,
      hoursPerShift: 8,
      daysPerMonth: 26,
      companyName: 'CENTRAL DE INTELIGENCIA',
      clientName: 'CENTRAL DE INTELIGENCIA',
      projectName: 'PROYECTO RYDER'
    };
  };

  // 3. Acciones de negocio

  // Abrir modal de creación
  const openCreateModal = () => {
    setModalType('create');
    setCurrentSim(null);
    setFormName('');
    setFormDesc('Simulador avanzado de capacidad y optimización de líneas industriales.');
    setFormColor('#00F0FF');
    setFormIcon('Layers');
    setFormCompanyName('CENTRAL DE INTELIGENCIA');
    setFormClientName('CENTRAL DE INTELIGENCIA');
    setFormProjectName('PROYECTO PREDETERMINADO PANDORA');
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

    let inputsKey = `sim_${sim.id}_inputs`;
    let currentInputs = {};
    const savedInputs = localStorage.getItem(inputsKey);
    if (savedInputs) {
      try {
        currentInputs = JSON.parse(savedInputs);
      } catch (e) {}
    }
    
    const templateId = (sim.type || sim.id).toLowerCase();
    const defaultCompany = currentInputs.companyName || currentInputs.customerName || localStorage.getItem(`sim_${sim.id}_customer_name`) || (templateId === 'lma-500' ? 'SOLIMAQ' : 'CENTRAL DE INTELIGENCIA');
    const defaultClient = currentInputs.clientName || localStorage.getItem(`sim_${sim.id}_client_name`) || 'CENTRAL DE INTELIGENCIA';
    const defaultProject = currentInputs.projectName || (templateId === 'lma-500' ? 'Proyecto Reciclado Solimaq LMA-500' : `${sim.name}`);

    setFormCompanyName(defaultCompany);
    setFormClientName(defaultClient);
    setFormProjectName(defaultProject);

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

    let inputsKey = `sim_${sim.id}_inputs`;
    let currentInputs = {};
    const savedInputs = localStorage.getItem(inputsKey);
    if (savedInputs) {
      try {
        currentInputs = JSON.parse(savedInputs);
      } catch (e) {}
    }
    
    const templateId = (sim.type || sim.id).toLowerCase();
    const defaultCompany = currentInputs.companyName || currentInputs.customerName || localStorage.getItem(`sim_${sim.id}_customer_name`) || (templateId === 'lma-500' ? 'SOLIMAQ' : 'CENTRAL DE INTELIGENCIA');
    const defaultClient = currentInputs.clientName || localStorage.getItem(`sim_${sim.id}_client_name`) || 'CENTRAL DE INTELIGENCIA';
    const defaultProject = currentInputs.projectName || (templateId === 'lma-500' ? 'Proyecto Reciclado Solimaq LMA-500' : `${sim.name} - Copia`);

    setFormCompanyName(defaultCompany);
    setFormClientName(defaultClient);
    setFormProjectName(defaultProject);

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
        isSystem: false,
        type: 'rider'
      };

      // Al crear desde cero, copiamos la estructura por defecto de RYDER para que no falle
      copySimulatorData('rider', newId);

      const destInputsKey = `sim_${newId}_inputs`;
      const destInputs = getDefaultInputsForTemplate('rider');
      if (destInputs) {
        destInputs.companyName = formCompanyName.trim();
        destInputs.clientName = formClientName.trim();
        destInputs.projectName = formProjectName.trim();
        destInputs.customerName = formCompanyName.trim();
        localStorage.setItem(destInputsKey, JSON.stringify(destInputs));
      }
      localStorage.setItem(`sim_${newId}_client_name`, formClientName.trim());
      localStorage.setItem(`sim_${newId}_customer_name`, formCompanyName.trim());

      setSimulators([...simulators, newSim]);

    } else if (modalType === 'edit') {
      setSimulators(simulators.map(s => 
        s.id === currentSim.id 
          ? { ...s, name: formName.trim(), description: formDesc.trim(), color: formColor, icon: formIcon }
          : s
      ));

      const inputsKey = `sim_${currentSim.id}_inputs`;
      let currentInputs = {};
      const savedInputs = localStorage.getItem(inputsKey);
      if (savedInputs) {
        try {
          currentInputs = JSON.parse(savedInputs);
        } catch (e) {}
      } else {
        currentInputs = getDefaultInputsForTemplate(currentSim.type || currentSim.id);
      }

      if (currentInputs) {
        currentInputs.companyName = formCompanyName.trim();
        currentInputs.clientName = formClientName.trim();
        currentInputs.projectName = formProjectName.trim();
        currentInputs.customerName = formCompanyName.trim();
        localStorage.setItem(inputsKey, JSON.stringify(currentInputs));
      }

      localStorage.setItem(`sim_${currentSim.id}_client_name`, formClientName.trim());
      localStorage.setItem(`sim_${currentSim.id}_customer_name`, formCompanyName.trim());

    } else if (modalType === 'clone') {
      const newId = `sim_${Date.now()}`;
      const newSim = {
        id: newId,
        name: formName.trim(),
        description: formDesc.trim(),
        icon: formIcon,
        color: formColor,
        isSystem: false,
        type: currentSim.type || currentSim.id
      };

      copySimulatorData(currentSim.id, newId);

      const destInputsKey = `sim_${newId}_inputs`;
      let destInputs = {};
      const savedNewInputs = localStorage.getItem(destInputsKey);
      if (savedNewInputs) {
        try {
          destInputs = JSON.parse(savedNewInputs);
        } catch (e) {}
      } else {
        destInputs = getDefaultInputsForTemplate(currentSim.type || currentSim.id);
      }

      if (destInputs) {
        destInputs.companyName = formCompanyName.trim();
        destInputs.clientName = formClientName.trim();
        destInputs.projectName = formProjectName.trim();
        destInputs.customerName = formCompanyName.trim();
        localStorage.setItem(destInputsKey, JSON.stringify(destInputs));
      }

      localStorage.setItem(`sim_${newId}_client_name`, formClientName.trim());
      localStorage.setItem(`sim_${newId}_customer_name`, formCompanyName.trim());

      setSimulators([...simulators, newSim]);
    }

    setIsModalOpen(false);
  };

  // Copiar datos de localStorage de un simulador a otro
  const copySimulatorData = (srcId, destId) => {
    const normalizedSrc = srcId.replace('-', '').toLowerCase();
    const normalizedDest = destId.toLowerCase();

    // Primero copiar llaves específicas conocidas
    const keys = ['inputs', 'customer_scenarios', 'machine_configs', 'boxes', 'daily_reqs', 'physical_max_mh', 'req_locked'];
    keys.forEach(key => {
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

    // Luego hacer una copia genérica de cualquier otra llave que contenga el ID del origen
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.toLowerCase().includes(normalizedSrc) || key.toLowerCase().includes(srcId.toLowerCase()))) {
        const val = localStorage.getItem(key);
        if (val !== null) {
          let newKey = key;
          if (key.toLowerCase().includes(normalizedSrc)) {
            const index = key.toLowerCase().indexOf(normalizedSrc);
            newKey = key.substring(0, index) + normalizedDest + key.substring(index + normalizedSrc.length);
          } else if (key.toLowerCase().includes(srcId.toLowerCase())) {
            const index = key.toLowerCase().indexOf(srcId.toLowerCase());
            newKey = key.substring(0, index) + normalizedDest + key.substring(index + srcId.length);
          }
          if (!localStorage.getItem(newKey)) {
            localStorage.setItem(newKey, val);
          }
        }
      }
    }
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
          
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate('/alpha/simulators/builder')}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#8b5cf6]/15 border border-[#8b5cf6]/35 hover:bg-[#8b5cf6]/25 text-[#c084fc] transition-all font-bold text-sm shadow-[0_0_15px_rgba(139,92,246,0.15)] group"
            >
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" style={{ color: '#c084fc' }} />
              + Constructor Dinámico
            </button>
            <button 
              onClick={openCreateModal}
              className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#00F0FF]/15 border border-[#00F0FF]/35 hover:bg-[#00F0FF]/25 text-[#00F0FF] transition-all font-bold text-sm shadow-[0_0_15px_rgba(0,240,255,0.15)] group"
            >
              <Layers className="w-4 h-4 transition-transform duration-300" style={{ color: '#00F0FF' }} />
              + Crear Preset
            </button>
          </div>
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

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Nombre de la Empresa
                </label>
                <input
                  type="text"
                  placeholder="Ej. ELECTRIZ / SOLIMAQ"
                  value={formCompanyName}
                  onChange={e => setFormCompanyName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-[#222] hover:border-gray-700 focus:border-blue-500 focus:outline-none text-white transition-all text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Cliente
                </label>
                <input
                  type="text"
                  placeholder="Ej. CENTRAL DE INTELIGENCIA"
                  value={formClientName}
                  onChange={e => setFormClientName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-[#222] hover:border-gray-700 focus:border-blue-500 focus:outline-none text-white transition-all text-sm font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  placeholder="Ej. PROYECTO PREDETERMINADO PANDORA"
                  value={formProjectName}
                  onChange={e => setFormProjectName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-[#141414] border border-[#222] hover:border-gray-700 focus:border-blue-500 focus:outline-none text-white transition-all text-sm font-semibold"
                />
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
