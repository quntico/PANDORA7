import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { 
  Activity, Play, Pause, RefreshCw, AlertTriangle, CheckCircle2, 
  Settings, Layers, TrendingUp, Cpu, Wrench, ShieldAlert, 
  Printer, Download, FileSpreadsheet, Eye, EyeOff, Sliders, Info, Zap, ArrowLeft,
  FolderOpen, Upload, Check, RotateCcw, Table2, MousePointer, Loader2, Lock, Unlock, Link2, Plus, Minimize2, Maximize2, DollarSign,
  FileText, X, LineChart, Wind, Database, Gauge, Trash2, Copy, Save, Users
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

// Componentes del Visor 3D y Datos Base
import SharedTwinViewer3D from '../../../components/flow/SharedTwinViewer3D';
import FlowDesignsLibrary from '../../../components/flow/FlowDesignsLibrary';
import { useBeta } from '../../../context/BetaContext';
import { process3DFile } from '../../../utils/fileProcessor';
import { supabase, uploadFileWithProgress } from '../../../supabase';
import { useFlowDesigns } from '../../../hooks/useFlowDesigns';

const PRESET_MODULOS = [
  {
    id: 'banda_entrada',
    nombre: 'Banda de entrada',
    activo: true,
    potenciaInstalada: 2.2,
    capacidadNominal: 1500,
    comentarioRiesgo: 'Pellizcos en rodillos',
    ocupaAire: false,
    presionAireBar: 0,
    caudalAireM3Min: 0,
    funcion: 'Transporte y alineación de las piezas y trozos de cobre hacia la dosificación.',
    especificaciones: 'Ancho de banda: 600mm. Velocidad: 10m/min. Motor: 2.2kW, trifásico 440V.'
  },
  {
    id: 'desbobinadora',
    nombre: 'Tolva dosificadora de piezas',
    activo: true,
    potenciaInstalada: 5.5,
    capacidadNominal: 1500,
    comentarioRiesgo: 'Atrapamiento en tornillo dosificador',
    ocupaAire: false,
    presionAireBar: 0,
    caudalAireM3Min: 0,
    funcion: 'Dosificación controlada y alineación de los trozos y pedazos de tubo de cobre hacia la línea.',
    especificaciones: 'Capacidad de tolva: 2.0 m³. Vibrador eléctrico integrado. Velocidad regulable por PLC.'
  },
  {
    id: 'dancer',
    nombre: 'Módulo detector de metales',
    activo: true,
    potenciaInstalada: 1.5,
    capacidadNominal: 1500,
    comentarioRiesgo: 'Falla en bobina sensora',
    ocupaAire: true,
    presionAireBar: 6.0,
    caudalAireM3Min: 0.15,
    funcion: 'Detección e inspección de impurezas ferrosas en los tubos para protección de la trituradora.',
    especificaciones: 'Bobina de alta sensibilidad. Alarma sonora y parada de banda en caso de contaminantes.'
  },
  {
    id: 'alimentador',
    nombre: 'Empujador / Rodillo alimentador',
    activo: true,
    potenciaInstalada: 3,
    capacidadNominal: 1200,
    comentarioRiesgo: 'Puntos de atrapamiento',
    ocupaAire: false,
    presionAireBar: 0,
    caudalAireM3Min: 0,
    funcion: 'Tracción activa de las piezas de cobre hacia la cortadora o trituradora.',
    especificaciones: 'Rodillos de poliuretano de alta adherencia. Presión mecánica regulable.'
  },
  {
    id: 'cizalla',
    nombre: 'Cizalla de pre-corte',
    activo: true,
    potenciaInstalada: 15,
    capacidadNominal: 1000,
    comentarioRiesgo: 'Cuchillas expuestas, alta fuerza',
    ocupaAire: true,
    presionAireBar: 7.0,
    caudalAireM3Min: 0.3,
    funcion: 'Corte transversal de piezas largas de tubo en trozos pequeños óptimos para triturar.',
    especificaciones: 'Cuchilla de acero rápido templado HSS. Actuación de corte neumática rápida.'
  },
  {
    id: 'trituradora',
    nombre: 'Trituradora M1200',
    activo: true,
    potenciaInstalada: 75,
    capacidadNominal: 1200,
    comentarioRiesgo: 'Picos de corriente, sobrecarga',
    ocupaAire: false,
    presionAireBar: 0,
    caudalAireM3Min: 0,
    funcion: 'Trituración primaria de las piezas de tubo de cobre.',
    especificaciones: 'Cámara de trituración de 1200mm. Rotor con 24 cuchillas intercambiables. Transmisión por poleas.'
  },
  {
    id: 'banda_salida_trit',
    nombre: 'Banda salida trituradora',
    activo: true,
    potenciaInstalada: 2.2,
    capacidadNominal: 1200,
    comentarioRiesgo: 'Derrame de virutas',
    ocupaAire: false,
    presionAireBar: 0,
    caudalAireM3Min: 0,
    funcion: 'Evacuación de virutas y trozos triturados hacia el molino.',
    especificaciones: 'Banda de caucho anti-corte con deflectores laterales para evitar derrames.'
  },
  {
    id: 'molino',
    nombre: 'Molino granulador',
    activo: true,
    potenciaInstalada: 55,
    capacidadNominal: 800,
    comentarioRiesgo: 'Alto ruido y polvo fino',
    ocupaAire: false,
    presionAireBar: 0,
    caudalAireM3Min: 0,
    funcion: 'Molienda secundaria para reducir el cobre a un tamaño de grano uniforme.',
    especificaciones: 'Criba intercambiable de 6mm. Sistema insonorizado. Rotor de alta velocidad.'
  },
  {
    id: 'banda_salida_mol',
    nombre: 'Banda salida molino',
    activo: true,
    potenciaInstalada: 2.2,
    capacidadNominal: 800,
    comentarioRiesgo: 'Acumulación de estática',
    ocupaAire: false,
    presionAireBar: 0,
    caudalAireM3Min: 0,
    funcion: 'Transporte de cobre granulado hacia la tolva pulmón.',
    especificaciones: 'Banda inclinada de PVC antiestático. Colector magnético integrado para impurezas ferrosas.'
  },
  {
    id: 'tolva',
    nombre: 'Tolva pulmón',
    activo: true,
    potenciaInstalada: 1.5,
    capacidadNominal: 800,
    comentarioRiesgo: 'Bloqueo por puente de material',
    ocupaAire: true,
    presionAireBar: 5.5,
    caudalAireM3Min: 0.4,
    funcion: 'Almacenamiento temporal y dosificación del cobre granulado.',
    especificaciones: 'Capacidad de 1.5 m³. Vibradores neumáticos anti-bóveda en paredes cónicas.'
  },
  {
    id: 'briqueteadora',
    nombre: 'Briqueteadora doble BQT300',
    activo: true,
    potenciaInstalada: 60,
    capacidadNominal: 600,
    comentarioRiesgo: 'Presión extrema, temperatura',
    ocupaAire: true,
    presionAireBar: 7.0,
    caudalAireM3Min: 0.5,
    funcion: 'Compactación del cobre granulado bajo alta presión para formar briquetas sólidas.',
    especificaciones: 'Doble pistón hidráulico. Sistema de refrigeración de aceite por intercambiador.'
  },
  {
    id: 'banda_salida_briq',
    nombre: 'Banda salida briqueteadora',
    activo: true,
    potenciaInstalada: 2.2,
    capacidadNominal: 600,
    comentarioRiesgo: 'Caída de briquetas calientes',
    ocupaAire: false,
    presionAireBar: 0,
    caudalAireM3Min: 0,
    funcion: 'Transporte y enfriamiento de las briquetas terminadas.',
    especificaciones: 'Banda metálica de eslabones de acero inoxidable resistente a altas temperaturas.'
  },
  {
    id: 'carritos',
    nombre: 'Carritos de descarga',
    activo: true,
    potenciaInstalada: 0,
    capacidadNominal: 600,
    comentarioRiesgo: 'Sobresfuerzo del operador',
    ocupaAire: false,
    presionAireBar: 0,
    caudalAireM3Min: 0,
    funcion: 'Recolección y almacenamiento final de las briquetas para logística.',
    especificaciones: 'Carros tolva móviles de volteo manual. Capacidad: 250kg cada uno.'
  }
];

const PRESET_PRECIOS = {
  banda_entrada: 8500,
  desbobinadora: 15000,
  dancer: 12000,
  alimentador: 9500,
  cizalla: 28000,
  trituradora: 75000,
  banda_salida_trit: 8500,
  molino: 55000,
  banda_salida_mol: 8500,
  tolva: 18000,
  briqueteadora: 95000,
  banda_salida_briq: 8500,
  carritos: 3000
};

const PRESET_TUBERIAS = [
  { name: '1/4"', od: 6.35, wall: 0.80 },
  { name: '3/8"', od: 9.52, wall: 0.80 },
  { name: '1/2"', od: 12.70, wall: 0.90 },
  { name: '5/8"', od: 15.88, wall: 1.00 },
  { name: '3/4"', od: 19.05, wall: 1.00 },
  { name: '7/8"', od: 22.22, wall: 1.14 },
  { name: '1-1/8"', od: 28.58, wall: 1.27 },
  { name: '1-3/8"', od: 34.93, wall: 1.40 },
  { name: '1-5/8"', od: 41.28, wall: 1.58 },
  { name: '2-1/8"', od: 53.98, wall: 1.83 },
  { name: 'Personalizado', od: null, wall: null }
];

export default function CarrierSimulator() {
  const navigate = useNavigate();
  const { activeProject } = useBeta();

  // Estados de notificación de guardado
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  // --- ESTADOS DE LA APLICACIÓN ---
  
  // 1. Configuración de las Piezas de Cobre (Reemplazando los Rollos Maestro)
  const [longitudPieza, setLongitudPieza] = useState(() => {
    const val = localStorage.getItem('carrier_simulator_saved_longitud');
    return val ? parseInt(val) : 50;
  }); // cm (10 cm a 80 cm)
  const [diametroExteriorPieza, setDiametroExteriorPieza] = useState(() => {
    const val = localStorage.getItem('carrier_simulator_saved_diametro');
    return val ? parseFloat(val) : 12.70;
  }); // mm (1/2" por defecto)
  const [espesorParedPieza, setEspesorParedPieza] = useState(() => {
    const val = localStorage.getItem('carrier_simulator_saved_espesor');
    return val ? parseFloat(val) : 0.90;
  }); // mm (1/2" por defecto)
  const [frecuenciaAlimentacion, setFrecuenciaAlimentacion] = useState(() => {
    const val = localStorage.getItem('carrier_simulator_saved_frecuencia');
    return val ? parseInt(val) : 30;
  }); // piezas/min (5 a 120)
  const [presetTubo, setPresetTubo] = useState('1/2"');
  const [materialGuia, setMaterialGuia] = useState('acero_lubricado');
  const [coefFriccion, setCoefFriccion] = useState(0.15); // Cobre sobre Acero lubricado
  const [capacidadMaximaLinea, setCapacidadMaximaLinea] = useState(() => {
    const val = localStorage.getItem('carrier_simulator_saved_capacidad_max');
    return val ? parseInt(val) : 1500;
  }); // kg/h requerida de la línea

  const [capacidadObjetivoKgH, setCapacidadObjetivoKgH] = useState(() => {
    const val = localStorage.getItem('carrier_simulator_saved_capacidad_objetivo');
    return val ? parseInt(val) : 500; // default to 500 kg/h
  });
  const [turnosTrabajo, setTurnosTrabajo] = useState(() => {
    const val = localStorage.getItem('carrier_simulator_saved_turnos_trabajo');
    return val ? parseInt(val) : 3; // default to 3 shifts
  });
  const [numeroOperadores, setNumeroOperadores] = useState(() => {
    const val = localStorage.getItem('carrier_simulator_saved_numero_operadores');
    return val ? parseInt(val) : 2; // default to 2 operators
  });

  // Mapeos de compatibilidad para evitar romper reportes y gráficas existentes
  const areaCorteM2 = Math.PI * (espesorParedPieza / 1000) * ((diametroExteriorPieza - espesorParedPieza) / 1000);
  const pesoLinealKgM = areaCorteM2 * 8960;
  const pesoPiezaKg = pesoLinealKgM * (longitudPieza / 100);

  const diametroExteriorRollo = longitudPieza / 100; // m
  const diametroInteriorRollo = (diametroExteriorPieza - 2 * espesorParedPieza) / 1000; // m
  const alturaRollo = espesorParedPieza / 1000; // m
  const pesoRollo = Math.round(pesoPiezaKg * 100) / 100; // kg
  const velocidadDesbobinado = frecuenciaAlimentacion; // piezas/min
  const factorSeguridad = 1.5;
  const diametroExteriorTubo = diametroExteriorPieza;
  const diametroInteriorTubo = diametroExteriorPieza - 2 * espesorParedPieza;
  const [resistenciaCorte, setResistenciaCorte] = useState(220); // MPa
  const [limiteElastico, setLimiteElastico] = useState(70); // MPa
  const [extractorPolvoActivo, setExtractorPolvoActivo] = useState(false);

  // 2.5 Configuración de Reporte y PDF
  const [projectName, setProjectName] = useState(() => {
    return localStorage.getItem('carrier_simulator_saved_project_name') || 'PROYECTO CARRIER - COBRE';
  });
  const [clientName, setClientName] = useState(() => {
    return localStorage.getItem('carrier_simulator_saved_client_name') || 'CARRIER CORPORATION';
  });
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isExportOnly, setIsExportOnly] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFileName, setExportFileName] = useState('INFORME_TECNICO_CARRIER.pdf');
  const [exportExchangeRate, setExportExchangeRate] = useState(20.0);
  
  // Snapshots para el reporte (cargadas desde localStorage)
  const [twinSnapshot, setTwinSnapshot] = useState(null);
  const [twinSnapshotLateral, setTwinSnapshotLateral] = useState(null);
  const [twinSnapshotSuperior, setTwinSnapshotSuperior] = useState(null);
  const [twinSnapshotIsometrica, setTwinSnapshotIsometrica] = useState(null);

  const [modulos, setModulos] = useState(() => {
    const saved = localStorage.getItem('carrier_simulator_saved_modulos');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error loading saved modulos:", e);
      }
    }
    return PRESET_MODULOS.map(m => ({
      ...m,
      precioVenta: PRESET_PRECIOS[m.id] ?? 10000
    }));
  });

  const [editingModuloId, setEditingModuloId] = useState(null);
  
  // Estados de la librería de equipos
  const [isLibraryModalOpen, setIsLibraryModalOpen] = useState(false);
  const [customNombre, setCustomNombre] = useState('');
  const [customCapacidad, setCustomCapacidad] = useState(600);
  const [customPotencia, setCustomPotencia] = useState(15);
  const [customOcupaAire, setCustomOcupaAire] = useState(false);
  const [customPresionAire, setCustomPresionAire] = useState(6.0);
  const [customCaudalAire, setCustomCaudalAire] = useState(0.2);
  const [customFuncion, setCustomFuncion] = useState('');
  const [customEspecificaciones, setCustomEspecificaciones] = useState('');
  const [customPrecioVenta, setCustomPrecioVenta] = useState(10000);

  // Estados del Sandbox Pandora
  const [isSandboxOpen, setIsSandboxOpen] = useState(false);
  const [sandboxPrompt, setSandboxPrompt] = useState('Procesamiento de cable de cobre reciclado de alta pureza.');
  const [sandboxHumedad, setSandboxHumedad] = useState(2);
  const [sandboxPureza, setSandboxPureza] = useState(98);
  const [sandboxTemp, setSandboxTemp] = useState(25);
  const [sandboxTurno, setSandboxTurno] = useState('Diurno');
  const [sandboxAnalyzing, setSandboxAnalyzing] = useState(false);
  const [sandboxResult, setSandboxResult] = useState(null);

  const [lineaGuardadaStatus, setLineaGuardadaStatus] = useState(false);

  const handleSaveModulos = async () => {
    // 1. Guardar localmente
    localStorage.setItem('carrier_simulator_saved_modulos', JSON.stringify(modulos));
    localStorage.setItem('carrier_simulator_saved_capacidad_max', capacidadMaximaLinea.toString());
    localStorage.setItem('carrier_simulator_saved_project_name', projectName);
    localStorage.setItem('carrier_simulator_saved_client_name', clientName);
    localStorage.setItem('carrier_simulator_saved_frecuencia', frecuenciaAlimentacion.toString());
    localStorage.setItem('carrier_simulator_saved_longitud', longitudPieza.toString());
    localStorage.setItem('carrier_simulator_saved_diametro', diametroExteriorPieza.toString());
    localStorage.setItem('carrier_simulator_saved_espesor', espesorParedPieza.toString());
    localStorage.setItem('carrier_simulator_saved_capacidad_objetivo', capacidadObjetivoKgH.toString());
    localStorage.setItem('carrier_simulator_saved_turnos_trabajo', turnosTrabajo.toString());
    localStorage.setItem('carrier_simulator_saved_numero_operadores', numeroOperadores.toString());
    
    if (typeof twinNodes !== 'undefined' && twinNodes?.length) {
      localStorage.setItem('sim_carrier_twin_nodes', JSON.stringify(twinNodes));
    }
    if (typeof twinEdges !== 'undefined' && twinEdges?.length) {
      localStorage.setItem('sim_carrier_twin_edges', JSON.stringify(twinEdges));
    }
    if (typeof twinLayout !== 'undefined' && twinLayout) {
      localStorage.setItem('sim_carrier_twin_layout', JSON.stringify(twinLayout));
    }

    // 2. Guardar en Supabase (puente de guardado)
    if (activeProject && activeProject.id && activeProject.id !== 'local-fallback-id') {
      try {
        const payload = {
          project_id: activeProject.id,
          key: 'sim_carrier_data',
          value: JSON.stringify({
            projectName,
            clientName,
            inputs: {
              longitudPieza,
              diametroExteriorPieza,
              espesorParedPieza,
              frecuenciaAlimentacion,
              capacidadMaximaLinea,
              capacidadObjetivoKgH,
              turnosTrabajo,
              numeroOperadores,
              materialGuia,
              coefFriccion,
              resistenciaCorte,
              limiteElastico
            },
            modulos,
            twinLayout,
            twinNodes,
            twinEdges,
            twinNodePositions,
            currentDesignId,
            results: {
              pesoPiezaKg: pesoPiezaKg,
              capacidadRealKgH: calculos?.capacidadRealKgH || 0,
              potenciaTotalKw: calculos?.potenciaTotalKw || 0,
              consumoAireTotalM3Min: calculos?.consumoAireTotalM3Min || 0,
              capexTotalUSD: calculos?.capexTotalUSD || 0
            },
            timestamp: Date.now()
          })
        };
        
        await supabase
          .from('project_context_beta')
          .upsert([payload], { onConflict: 'project_id,key' });
          
        setToastMessage('¡Simulador guardado! Parámetros sincronizados exitosamente con la base de datos de producción.');
      } catch (dbErr) {
        console.error("Error al sincronizar con Supabase:", dbErr);
        setToastMessage('¡Simulador guardado localmente! (Error de sincronización con la base de datos)');
      }
    } else {
      setToastMessage('¡Simulador guardado en local! (Crea o abre un proyecto en la bóveda de producción para sincronizar)');
    }
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const handleResetModulos = () => {
    if (window.confirm("¿Está seguro de que desea restablecer todos los parámetros y equipos a los valores por defecto de fábrica?")) {
      localStorage.removeItem('carrier_simulator_saved_modulos');
      localStorage.removeItem('carrier_simulator_saved_capacidad_max');
      localStorage.removeItem('carrier_simulator_saved_project_name');
      localStorage.removeItem('carrier_simulator_saved_client_name');
      localStorage.removeItem('carrier_simulator_saved_frecuencia');
      localStorage.removeItem('carrier_simulator_saved_longitud');
      localStorage.removeItem('carrier_simulator_saved_diametro');
      localStorage.removeItem('carrier_simulator_saved_espesor');
      localStorage.removeItem('carrier_simulator_saved_capacidad_objetivo');
      localStorage.removeItem('carrier_simulator_saved_turnos_trabajo');
      localStorage.removeItem('carrier_simulator_saved_numero_operadores');
      window.location.reload();
    }
  };

  const removeModulo = (id) => {
    setModulos(prev => prev.filter(m => m.id !== id));
    if (editingModuloId === id) {
      setEditingModuloId(null);
    }
  };

  const duplicateModulo = (id) => {
    const target = modulos.find(m => m.id === id);
    if (!target) return;
    
    const newId = `${target.id}_dup_${Date.now()}`;
    const baseName = target.nombre.endsWith(' (Copia)') ? target.nombre : `${target.nombre} (Copia)`;

    const newModulo = {
      ...target,
      id: newId,
      nombre: baseName,
      activo: true
    };
    
    const idx = modulos.findIndex(m => m.id === id);
    if (idx !== -1) {
      setModulos(prev => {
        const next = [...prev];
        next.splice(idx + 1, 0, newModulo);
        return next;
      });
    } else {
      setModulos(prev => [...prev, newModulo]);
    }
  };

  const addModuloPreset = (preset) => {
    // Generate a unique ID if already exists
    const idExists = modulos.some(m => m.id === preset.id);
    const newId = idExists ? `${preset.id}_${Date.now()}` : preset.id;
    
    const newModulo = {
      ...preset,
      id: newId,
      activo: true
    };
    
    setModulos(prev => [...prev, newModulo]);
  };

  const handleCreateCustomModulo = (e) => {
    if (e) e.preventDefault();
    if (!customNombre.trim()) return;

    // Slugify name for ID
    const baseId = 'custom_' + customNombre.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const newId = `${baseId}_${Date.now()}`;

    const newModulo = {
      id: newId,
      nombre: customNombre,
      activo: true,
      potenciaInstalada: Number(customPotencia) || 0,
      capacidadNominal: Number(customCapacidad) || 0,
      comentarioRiesgo: 'Evaluación de riesgo pendiente',
      ocupaAire: customOcupaAire,
       presionAireBar: customOcupaAire ? Number(customPresionAire) || 0 : 0,
      caudalAireM3Min: customOcupaAire ? Number(customCaudalAire) || 0 : 0,
      funcion: customFuncion || 'Operación personalizada dentro del flujo Carrier.',
      especificaciones: customEspecificaciones || 'Especificaciones personalizadas cargadas por el usuario.',
      precioVenta: Number(customPrecioVenta) || 0
    };

    setModulos(prev => [...prev, newModulo]);

    // Reset form states
    setCustomNombre('');
    setCustomCapacidad(600);
    setCustomPotencia(15);
    setCustomOcupaAire(false);
    setCustomPresionAire(6.0);
    setCustomCaudalAire(0.2);
    setCustomFuncion('');
    setCustomEspecificaciones('');
    setCustomPrecioVenta(10000);
    setIsLibraryModalOpen(false);
  };

  const handlePresetChange = (val) => {
    setPresetTubo(val);
    const preset = PRESET_TUBERIAS.find(p => p.name === val);
    if (preset && preset.od !== null) {
      setDiametroExteriorPieza(preset.od);
      setEspesorParedPieza(preset.wall);
    }
  };

  const handleMaterialGuiaChange = (val) => {
    setMaterialGuia(val);
    if (val === 'acero_seco') setCoefFriccion(0.30);
    else if (val === 'acero_lubricado') setCoefFriccion(0.15);
    else if (val === 'polimero_ptfe') setCoefFriccion(0.08);
  };

  const handleRunSandboxAnalysis = () => {
    setSandboxAnalyzing(true);
    setTimeout(() => {
      const totalPower = modulos.filter(m => m.activo).reduce((sum, m) => sum + m.potenciaInstalada, 0);
      const totalAir = modulos.filter(m => m.activo && m.ocupaAire).reduce((sum, m) => sum + m.caudalAireM3Min, 0);
      const countActive = modulos.filter(m => m.activo).length;

      // Custom recommendations based on prompt
      let recomendacionEspecifica = "";
      const promptLower = sandboxPrompt.toLowerCase();
      
      if (promptLower.includes("humed") || sandboxHumedad > 5) {
        recomendacionEspecifica += `• ⚠️ **Riesgo de Humedad Elevada (${sandboxHumedad}%):** Se detecta riesgo de apelmazamiento en la Tolva Pulmón. Se aconseja programar ciclos de soplado neumático continuos a 6.0 Bar en los vibradores anti-bóveda para evitar obstrucciones.\n`;
      }
      if (promptLower.includes("plastico") || promptLower.includes("recubr") || promptLower.includes("impur") || sandboxPureza < 95) {
        recomendacionEspecifica += `• ⚙️ **Presencia de Impurezas / Plástico (${(100 - sandboxPureza).toFixed(1)}%):** El molino granulador y la cizalla generarán mayor fricción. Se sugiere reducir la velocidad de alimentación en 10% para evitar picos de corriente en la Trituradora M1200.\n`;
      }
      if (sandboxTemp > 38) {
        recomendacionEspecifica += `• 🌡️ **Temperatura Crítica (${sandboxTemp}°C):** Temperatura ambiental extrema. Es imperativo monitorear el enfriamiento de la Briqueteadora (máx. 65°C de aceite hidráulico) para evitar paros por sobrecalentamiento.\n`;
      }
      if (promptLower.includes("sobrecarga") || promptLower.includes("trituradora") || totalPower > 200) {
        recomendacionEspecifica += `• ⚡ **Demanda Energética Alta:** El consumo de la secuencia actual es de ${totalPower.toFixed(1)} kW. Asegura el balance de fases en la subestación principal.\n`;
      }

      if (!recomendacionEspecifica) {
        recomendacionEspecifica = "• ✅ **Flujo Nominal Optimizado:** La secuencia actual cumple con los estándares Carrier de producción continua. No se registran cuellos de botella térmicos ni neumáticos con el contexto provisto.";
      }

      const ef = Math.max(70, Math.min(99.5, 98.2 - (sandboxHumedad * 0.8) - ((100 - sandboxPureza) * 0.4) - (sandboxTemp > 35 ? (sandboxTemp - 35) * 0.3 : 0)));

      setSandboxResult({
        eficiencia: ef.toFixed(1),
        potenciaProyectada: (totalPower * (1 + (sandboxHumedad * 0.008))).toFixed(1),
        aireProyectado: (totalAir * (1 + (100 - sandboxPureza) * 0.005)).toFixed(2),
        diagnostico: recomendacionEspecifica,
        resumen: `Análisis predictivo completado con éxito. Línea operando con ${countActive} equipos activos en turno ${sandboxTurno}.`
      });
      setSandboxAnalyzing(false);
    }, 1200);
  };

  const getModuloColor = (id) => {
    // If modulos is defined (can be undefined during initialization of state before modulos exists)
    if (typeof modulos !== 'undefined' && Array.isArray(modulos)) {
      const found = modulos.find(m => m.id === id);
      if (found && found.color) return found.color;
    }
    switch (id) {
      case 'banda_entrada': return '#3b82f6'; // Vibrant Blue
      case 'desbobinadora': return '#f97316'; // Neon Orange
      case 'dancer': return '#10b981'; // Emerald Green
      case 'alimentador': return '#fbbf24'; // Amber Gold
      case 'cizalla': return '#ef4444'; // Vibrant Red
      case 'trituradora': return '#ec4899'; // Hot Pink
      case 'banda_salida_trit': return '#06b6d4'; // Cyan
      case 'molino': return '#8b5cf6'; // Electric Purple
      case 'banda_salida_mol': return '#14b8a6'; // Teal
      case 'tolva': return '#f43f5e'; // Rose Red
      case 'briqueteadora': return '#d946ef'; // Fuchsia/Magenta
      case 'banda_salida_briq': return '#6366f1'; // Indigo
      case 'carritos': return '#84cc16'; // Lime Green
      default: return '#a855f7'; // Purple fallback
    }
  };

  const getModuloIcon = (id) => {
    switch(id) {
      case 'banda_entrada':
      case 'banda_salida_trit':
      case 'banda_salida_mol':
      case 'banda_salida_briq':
        return TrendingUp;
      case 'desbobinadora':
        return Activity;
      case 'dancer':
        return Gauge;
      case 'alimentador':
        return Sliders;
      case 'cizalla':
        return Wrench;
      case 'trituradora':
        return ShieldAlert;
      case 'molino':
        return Cpu;
      case 'tolva':
        return Database;
      case 'briqueteadora':
        return RefreshCw;
      case 'carritos':
        return MousePointer;
      default:
        return Settings;
    }
  };

  // Drag and Drop reordering states and handlers
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.currentTarget.style.opacity = '0.4';
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex !== index) {
      setDragOverIndex(index);
    }
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDragEnd = (e) => {
    e.currentTarget.style.opacity = '1';
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDrop = (e, index) => {
    e.preventDefault();
    setDragOverIndex(null);
    if (draggedIndex === null || draggedIndex === index) return;
    
    const updated = [...modulos];
    const [draggedItem] = updated.splice(draggedIndex, 1);
    updated.splice(index, 0, draggedItem);
    setModulos(updated);
  };

  // 4. Estados del Visor 3D y Librería
  const [animando, setAnimando] = useState(true);
  const [isTwinEditMode, setIsTwinEditMode] = useState(false);
  const [selectedTwinNodeId, setSelectedTwinNodeId] = useState(null);
  const [isDesignsLibraryOpen, setIsDesignsLibraryOpen] = useState(false);
  const twinBlockRef = useRef(null);
  const [isTwinBlockFullscreen, setIsTwinBlockFullscreen] = useState(false);
  const [twinTheme, setTwinTheme] = useState('blueprint');
  
  // Estados locales para edición de módulo
  const [editingNombre, setEditingNombre] = useState('');
  const [editingActivo, setEditingActivo] = useState(true);
  const [editingCapacidad, setEditingCapacidad] = useState(0);
  const [editingPotencia, setEditingPotencia] = useState(0);
  const [editingOcupaAire, setEditingOcupaAire] = useState(false);
  const [editingPresionAire, setEditingPresionAire] = useState(6.0);
  const [editingCaudalAire, setEditingCaudalAire] = useState(0.2);
  const [editingFuncion, setEditingFuncion] = useState('');
  const [editingEspecificaciones, setEditingEspecificaciones] = useState('');
  const [editingPrecioVenta, setEditingPrecioVenta] = useState(0);
  const [editingColor, setEditingColor] = useState('#a855f7');

  useEffect(() => {
    if (isSandboxOpen) {
      handleRunSandboxAnalysis();
    }
  }, [isSandboxOpen]);

  useEffect(() => {
    if (editingModuloId) {
      const mod = modulos.find(m => m.id === editingModuloId);
      if (mod) {
        setEditingNombre(mod.nombre);
        setEditingActivo(mod.activo);
        setEditingCapacidad(mod.capacidadNominal);
        setEditingPotencia(mod.potenciaInstalada);
        setEditingOcupaAire(!!mod.ocupaAire);
        setEditingPresionAire(mod.presionAireBar ?? 6.0);
        setEditingCaudalAire(mod.caudalAireM3Min ?? 0.2);
        setEditingFuncion(mod.funcion ?? '');
        setEditingEspecificaciones(mod.especificaciones ?? '');
        setEditingPrecioVenta(mod.precioVenta ?? 0);
        setEditingColor(mod.color ?? getModuloColor(mod.id));
      }
    }
  }, [editingModuloId, modulos]);
  
  const [twinLayout, setTwinLayout] = useState(() => {
    const saved = localStorage.getItem('sim_carrier_twin_layout');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    const fallbackLayout = localStorage.getItem('flowDesigner_currentLayout');
    if (fallbackLayout) {
      try { return JSON.parse(fallbackLayout); } catch (e) { console.error(e); }
    }
    return null;
  });

  const [twinNodePositions, setTwinNodePositions] = useState(() => {
    const saved = localStorage.getItem('sim_carrier_twin_node_positions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {};
  });

  const [twinLabelHeightOffset, setTwinLabelHeightOffset] = useState(() => {
    const saved = localStorage.getItem('sim_carrier_twin_label_height_offset');
    return saved !== null ? Number(saved) : 0.2;
  });

  const [twinLabelsCollapsed, setTwinLabelsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sim_carrier_twin_labels_collapsed');
    return saved !== null ? saved === 'true' : false;
  });

  const [twinFloorElevation, setTwinFloorElevation] = useState(() => {
    const saved = localStorage.getItem('sim_carrier_twin_floor_elevation');
    return saved !== null ? Number(saved) : 0.0;
  });

  const [twinFloorLocked, setTwinFloorLocked] = useState(() => {
    const saved = localStorage.getItem('sim_carrier_twin_floor_locked');
    return saved === 'true';
  });

  const [isAnchored, setIsAnchored] = useState(true);
  const [isAnchoring, setIsAnchoring] = useState(false);
  
  const [currentDesignId, setCurrentDesignId] = useState(() => {
    return localStorage.getItem('sim_carrier_twin_anchor_id') || null;
  });

  const [pendingUpload, setPendingUpload] = useState(null); // { file, processedResult }
  const [uploadModelName, setUploadModelName] = useState('');
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { loadDesign: fetchDesignFromDb, saveDesign: saveDesignToDb } = useFlowDesigns();

  useEffect(() => {
    localStorage.setItem('sim_carrier_twin_label_height_offset', String(twinLabelHeightOffset));
  }, [twinLabelHeightOffset]);

  useEffect(() => {
    localStorage.setItem('sim_carrier_twin_labels_collapsed', String(twinLabelsCollapsed));
  }, [twinLabelsCollapsed]);

  useEffect(() => {
    localStorage.setItem('sim_carrier_twin_floor_elevation', String(twinFloorElevation));
  }, [twinFloorElevation]);

  useEffect(() => {
    localStorage.setItem('sim_carrier_twin_floor_locked', String(twinFloorLocked));
  }, [twinFloorLocked]);

  useEffect(() => {
    if (twinLayout) {
      localStorage.setItem('sim_carrier_twin_layout', JSON.stringify(twinLayout));
    } else {
      localStorage.removeItem('sim_carrier_twin_layout');
    }
  }, [twinLayout]);

  // Cargar datos del simulador de Supabase al cambiar de proyecto
  useEffect(() => {
    const loadSimulatorDataFromCloud = async () => {
      if (!activeProject || !activeProject.id || activeProject.id === 'local-fallback-id') {
        return;
      }
      try {
        const { data, error } = await supabase
          .from('project_context_beta')
          .select('value')
          .eq('project_id', activeProject.id)
          .eq('key', 'sim_carrier_data')
          .maybeSingle();

        if (error) throw error;
        if (data && data.value) {
          const cloudData = JSON.parse(data.value);
          console.log("[CarrierSimulator] Re-hydrating state from Supabase:", cloudData);
          
          if (cloudData.projectName) setProjectName(cloudData.projectName);
          if (cloudData.clientName) setClientName(cloudData.clientName);

          // Re-hidratar inputs
          if (cloudData.inputs) {
            const inp = cloudData.inputs;
            if (inp.longitudPieza !== undefined) setLongitudPieza(inp.longitudPieza);
            if (inp.diametroExteriorPieza !== undefined) setDiametroExteriorPieza(inp.diametroExteriorPieza);
            if (inp.espesorParedPieza !== undefined) setEspesarParedPieza(inp.espesorParedPieza);
            if (inp.frecuenciaAlimentacion !== undefined) setFrecuenciaAlimentacion(inp.frecuenciaAlimentacion);
            if (inp.capacidadMaximaLinea !== undefined) setCapacidadMaximaLinea(inp.capacidadMaximaLinea);
            if (inp.capacidadObjetivoKgH !== undefined) setCapacidadObjetivoKgH(inp.capacidadObjetivoKgH);
            if (inp.turnosTrabajo !== undefined) setTurnosTrabajo(inp.turnosTrabajo);
            if (inp.numeroOperadores !== undefined) setNumeroOperadores(inp.numeroOperadores);
            if (inp.materialGuia !== undefined) setMaterialGuia(inp.materialGuia);
            if (inp.coefFriccion !== undefined) setCoefFriccion(inp.coefFriccion);
            if (inp.resistenciaCorte !== undefined) setResistenciaCorte(inp.resistenciaCorte);
            if (inp.limiteElastico !== undefined) setLimiteElastico(inp.limiteElastico);
          }
          
          // Re-hidratar módulos
          if (cloudData.modulos) {
            setModulos(cloudData.modulos);
          }
          
          // Re-hidratar diseño 3D
          if (cloudData.twinLayout) {
            setTwinLayout(cloudData.twinLayout);
          }
          if (cloudData.currentDesignId) {
            setCurrentDesignId(cloudData.currentDesignId);
          }
          if (cloudData.twinNodePositions) {
            setTwinNodePositions(cloudData.twinNodePositions);
          }
        }
      } catch (err) {
        console.error("[CarrierSimulator] Error loading from cloud:", err);
      }
    };

    loadSimulatorDataFromCloud();
  }, [activeProject?.id]);

  // Cargar instantánea del gemelo digital de localStorage y mantenerlo sincronizado
  useEffect(() => {
    const syncSnapshot = () => {
      const suffix = activeProject?.id ? `${activeProject.id}_` : '';
      setTwinSnapshot(localStorage.getItem(`sim_carrier_${suffix}twin_snapshot_base64`));
      setTwinSnapshotLateral(localStorage.getItem(`sim_carrier_${suffix}twin_snapshot_lateral`));
      setTwinSnapshotSuperior(localStorage.getItem(`sim_carrier_${suffix}twin_snapshot_superior`));
      setTwinSnapshotIsometrica(localStorage.getItem(`sim_carrier_${suffix}twin_snapshot_isometrica`));
    };
    syncSnapshot();
    window.addEventListener('storage', syncSnapshot);
    return () => window.removeEventListener('storage', syncSnapshot);
  }, [isReportModalOpen, activeProject?.id]);

  // Tecla Escape para cerrar el reporte
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsReportModalOpen(false);
      }
    };
    if (isReportModalOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isReportModalOpen]);

  // --- VALIDACIONES DE ENTRADAS ---
  const validaciones = useMemo(() => {
    const errores = [];
    if (longitudPieza < 10 || longitudPieza > 80) {
      errores.push("La longitud de la pieza debe estar entre 10 cm y 80 cm.");
    }
    if (diametroExteriorPieza < 5 || diametroExteriorPieza > 250) {
      errores.push("El diámetro exterior de la pieza debe estar entre 5 mm y 250 mm.");
    }
    if (espesorParedPieza < 0.5 || espesorParedPieza > 10) {
      errores.push("El espesor de pared debe estar entre 0.5 mm y 10 mm.");
    }
    if (espesorParedPieza * 2 >= diametroExteriorPieza) {
      errores.push("El espesor de pared por dos debe ser menor que el diámetro exterior.");
    }
    if (frecuenciaAlimentacion <= 0) {
      errores.push("La frecuencia de alimentación debe ser mayor a 0 piezas/min.");
    }
    return {
      valido: errores.length === 0,
      errores
    };
  }, [longitudPieza, diametroExteriorPieza, espesorParedPieza, frecuenciaAlimentacion]);

  // --- CÁLCULOS TÉCNICOS ---
  const calculos = useMemo(() => {
    if (!validaciones.valido) {
      return {
        espesorTuboMm: 0,
        areaMetalicaM2: 0,
        pesoMetroKgM: 0,
        pesoPiezaKg: 0,
        longitudTotalM: 0,
        tiempoDesbobinadoMin: 0,
        masaPorMinutoKgMin: 0,
        capacidadRequeridaKgH: 0,
        fuerzaCorteN: 0,
        fuerzaCorteKN: 0,
        fuerzaCorteTon: 0,
        radioMedioRolloM: 0,
        torqueBaseNm: 0,
        torqueSeguroNm: 0,
        omegaRadSeg: 0,
        potenciaMecanicaDesbobinadoKw: 0,
        potenciaInstaladaTotalKw: 0,
        cuelloBotellaModulo: 'Ninguno',
        cuelloBotellaCapacidad: Infinity,
        alertaSobrecarga: false,
        scoreRiesgo: 0,
        clasificacionRiesgo: 'Bajo',
        precioVentaTotalUSD: 0,
        aireRequeridoTotalM3Min: 0,
        presionAireMaximaBar: 0,
        numModulosAire: 0,
        capacidadMaximaLinea: 0,
        consumoNominalProyectadoKw: 0,
        eficienciaGlobalLinea: 0
      };
    }

    // A) Espesor Tubo
    const thickness = espesorParedPieza;

    // B) Área metálica del tubo en m²
    const odM = diametroExteriorPieza / 1000;
    const thicknessM = espesorParedPieza / 1000;
    const areaMetalicaM2 = Math.PI * thicknessM * (odM - thicknessM);

    // C) Peso por metro del tubo y peso por pieza
    const densidadCobre = 8960; // kg/m³
    const pesoMetroKgM = areaMetalicaM2 * densidadCobre;
    const pesoPiezaKg = pesoMetroKgM * (longitudPieza / 100);

    // D) Masa por minuto y capacidad requerida kg/h
    const masaPorMinutoKgMin = pesoPiezaKg * frecuenciaAlimentacion;
    const capacidadRequeridaKgH = masaPorMinutoKgMin * 60;

    // E) Mapeos de compatibilidad para ciclo virtual
    const tiempoDesbobinadoMin = 60.0;
    const longitudTotalM = (longitudPieza / 100) * frecuenciaAlimentacion * 60; // total metros en una hora

    // F) Fuerza de corte
    const fuerzaCorteN = areaMetalicaM2 * (resistenciaCorte * 1000000);
    const fuerzaCorteKN = fuerzaCorteN / 1000;
    const fuerzaCorteTon = fuerzaCorteN / 9806.65;

    // G) Torque en el rodillo alimentador / empujador de entrada
    const radioMedioRolloM = 0.10; // m (radio del rodillo alimentador)
    const gravedad = 9.81;
    const masaTransitoKg = masaPorMinutoKgMin * 0.5; // aprox 30 segundos de tránsito
    const torqueBaseNm = masaTransitoKg * gravedad * coefFriccion * radioMedioRolloM;
    const torqueSeguroNm = torqueBaseNm * 1.5;

    // H) Potencia mecánica del sistema de empuje
    const velocidadLinealMSeg = (frecuenciaAlimentacion / 60) * (longitudPieza / 100);
    const omegaRadSeg = velocidadLinealMSeg / radioMedioRolloM;
    const potenciaMecanicaDesbobinadoKw = (torqueSeguroNm * omegaRadSeg) / 1000;

    // H.2) Cálculos avanzados de fricción en la tubería
    const fuerzaFriccionTotalN = masaTransitoKg * gravedad * coefFriccion;
    const potenciaFriccionKw = (fuerzaFriccionTotalN * velocidadLinealMSeg) / 1000;

    // I) Potencia instalada total (módulos activos)
    const potenciaInstaladaTotalKw = modulos
      .filter(m => m.activo)
      .reduce((sum, m) => sum + m.potenciaInstalada, 0);

    // J) Cuello de Botella
    const modulosActivos = modulos.filter(m => m.activo);
    let cuelloBotellaModulo = 'Ninguno';
    let cuelloBotellaCapacidad = Infinity;
    
    if (modulosActivos.length > 0) {
      const minCap = modulosActivos.reduce((min, curr) => curr.capacidadNominal < min.capacidadNominal ? curr : min, modulosActivos[0]);
      cuelloBotellaModulo = minCap.nombre;
      cuelloBotellaCapacidad = minCap.capacidadNominal;
    }

    const alertaSobrecarga = capacidadRequeridaKgH > cuelloBotellaCapacidad;

    // K) Índice de Riesgo (0 a 100)
    let riskScore = 0;
    
    const detectorMetalesActivo = modulos.find(m => m.id === 'dancer')?.activo;
    const alimentadorActivo = modulos.find(m => m.id === 'alimentador')?.activo;
    const cizallaActiva = modulos.find(m => m.id === 'cizalla')?.activo;
    const trituradoraActiva = modulos.find(m => m.id === 'trituradora')?.activo;
    const molinoActivo = modulos.find(m => m.id === 'molino')?.activo;

    if (frecuenciaAlimentacion > 80) riskScore += 20;
    if (pesoPiezaKg > 15) riskScore += 15;
    if (diametroExteriorPieza > 150) riskScore += 10;
    if (!detectorMetalesActivo) riskScore += 25; // Alto riesgo si no hay detector de metales
    if (!alimentadorActivo) riskScore += 20;
    if (!cizallaActiva && trituradoraActiva && longitudPieza > 40) riskScore += 15; // piezas muy largas sin pre-corte
    if (molinoActivo && !extractorPolvoActivo) riskScore += 15;
    if (alertaSobrecarga) riskScore += 25;

    riskScore = Math.min(riskScore, 100);

    let clasificacionRiesgo = 'Bajo';
    if (riskScore > 30 && riskScore <= 60) {
      clasificacionRiesgo = 'Medio';
    } else if (riskScore > 60) {
      clasificacionRiesgo = 'Alto';
    }

    const consumoNominalProyectadoKw = Math.min(potenciaInstaladaTotalKw, potenciaInstaladaTotalKw * (capacidadRequeridaKgH / (capacidadMaximaLinea || 1)));
    const eficienciaGlobalLinea = Math.min(100, (capacidadRequeridaKgH / (capacidadMaximaLinea || 1)) * 100);

    // Cálculos de Disponibilidad Real, Turnos, Operadores y Panoramas
    const capacidadRealLinea = Math.min(capacidadRequeridaKgH, cuelloBotellaCapacidad);
    
    let disponibilidadReal = 98.0 - (numeroOperadores < 2 ? 4.5 : 0) - (riskScore * 0.08) - (turnosTrabajo - 1) * 1.0;
    disponibilidadReal = Math.max(70, Math.min(98.5, disponibilidadReal));
    
    const horasRealesPorTurno = 8.0 * (disponibilidadReal / 100);
    const produccionRealTurnoKg = capacidadRealLinea * horasRealesPorTurno;
    const produccionRealDiaKg = produccionRealTurnoKg * turnosTrabajo;

    let panoramaTipo = 'optimo'; 
    let panoramaLabel = 'Operación Óptima y Sincronizada';
    let panoramaColor = '#10b981'; 
    let panoramaClass = 'text-green-400';
    let panoramaDesc = 'La capacidad real de la línea está perfectamente sincronizada con la demanda del diseñador.';

    if (capacidadRealLinea > capacidadObjetivoKgH * 1.15) {
      panoramaTipo = 'sub_utilizado';
      panoramaLabel = 'Sobrediseño / Capacidad Excedente';
      panoramaColor = '#f59e0b'; 
      panoramaClass = 'text-amber-400';
      panoramaDesc = 'La línea cuenta con capacidad excedente (sobrediseño) respecto al objetivo. Esto permite flexibilidad, pero aumentará el retorno de inversión y consumo.';
    }

    return {
      espesorTuboMm: thickness,
      areaMetalicaM2,
      pesoMetroKgM,
      pesoPiezaKg,
      longitudTotalM,
      tiempoDesbobinadoMin,
      masaPorMinutoKgMin,
      capacidadRequeridaKgH,
      fuerzaCorteN,
      fuerzaCorteKN,
      fuerzaCorteTon,
      radioMedioRolloM,
      torqueBaseNm,
      torqueSeguroNm,
      omegaRadSeg,
      potenciaMecanicaDesbobinadoKw,
      potenciaInstaladaTotalKw,
      cuelloBotellaModulo,
      cuelloBotellaCapacidad,
      alertaSobrecarga,
      scoreRiesgo: riskScore,
      clasificacionRiesgo,
      fuerzaFriccionTotalN,
      potenciaFriccionKw,
      aireRequeridoTotalM3Min: modulos.filter(m => m.activo && m.ocupaAire).reduce((sum, m) => sum + (m.caudalAireM3Min || 0), 0),
      presionAireMaximaBar: modulos.filter(m => m.activo && m.ocupaAire).reduce((max, m) => Math.max(max, m.presionAireBar || 0), 0),
      numModulosAire: modulos.filter(m => m.activo && m.ocupaAire).length,
      precioVentaTotalUSD: modulos.filter(m => m.activo).reduce((sum, m) => sum + (m.precioVenta || 0), 0),
      capacidadMaximaLinea,
      consumoNominalProyectadoKw,
      eficienciaGlobalLinea,
      disponibilidadReal,
      horasRealesPorTurno,
      produccionRealTurnoKg,
      produccionRealDiaKg,
      panoramaTipo,
      panoramaLabel,
      panoramaColor,
      panoramaClass,
      panoramaDesc,
      capacidadRealLinea
    };
  }, [
    validaciones, longitudPieza, diametroExteriorPieza, espesorParedPieza, frecuenciaAlimentacion,
    resistenciaCorte, limiteElastico, extractorPolvoActivo, modulos, coefFriccion, capacidadMaximaLinea,
    capacidadObjetivoKgH, turnosTrabajo, numeroOperadores
  ]);

  // --- PANDORA COGNITIVE AI PROCESS ANALYZER ---
  const aiProcessAnalysis = useMemo(() => {
    const activeModulos = modulos.filter(m => m.activo);
    const issues = [];
    const recommendationsList = [];
    let isSequenceCorrect = true;

    if (activeModulos.length === 0) {
      return {
        isSequenceCorrect: false,
        statusText: "SIN MÓDULOS ACTIVOS",
        couplingEfficiency: 0,
        specificPowerIndex: 0,
        flowBottleneck: "N/A",
        bottleneckCapacity: 0,
        diagnosticoTermico: "La secuencia no contiene módulos activos para evaluar.",
        diagnosticoTrace: ["No hay equipos activos en la línea de flujo."],
        soluciones: ["Active al menos un módulo de alimentación y procesamiento."]
      };
    }

    // 1. Check if feed modules are first
    const firstActive = activeModulos[0];
    const feedIds = ['banda_entrada', 'desbobinadora'];
    const activeFeedModules = activeModulos.filter(m => feedIds.includes(m.id));
    
    if (activeFeedModules.length > 0) {
      const firstActiveId = firstActive.id;
      if (!feedIds.includes(firstActiveId)) {
        isSequenceCorrect = false;
        issues.push(`Error de secuenciación: El módulo inicial es "${firstActive.nombre}". La secuencia de flujo debe comenzar con la alimentación ("Banda de entrada" o "Tolva dosificadora de piezas").`);
        recommendationsList.push("Reordene la secuencia arrastrando el módulo de alimentación al inicio (Posición 01).");
      }
    } else {
      isSequenceCorrect = false;
      issues.push("Error crítico: No se ha activado ningún módulo de alimentación principal.");
      recommendationsList.push("Active la Banda de entrada o la Tolva dosificadora de piezas en la secuencia.");
    }

    // 2. Check for missing transport between active process modules
    const processIds = ['cizalla', 'trituradora', 'molino', 'briqueteadora'];
    for (let i = 0; i < activeModulos.length - 1; i++) {
      const current = activeModulos[i];
      const next = activeModulos[i + 1];
      if (processIds.includes(current.id) && processIds.includes(next.id)) {
        isSequenceCorrect = false;
        issues.push(`Error de acoplamiento: Se detectó procesamiento directo consecutivo entre "${current.nombre}" y "${next.nombre}" sin transporte intermedio.`);
        recommendationsList.push(`Inserte un módulo de transporte (Banda de salida o Rodillo alimentador) entre "${current.nombre}" y "${next.nombre}".`);
      }
    }

    // 3. Check for correct granularity flow: cizalla/trituradora -> molino -> briqueteadora
    const getProcessStepOrder = (id) => {
      if (id === 'cizalla') return 1;
      if (id === 'trituradora') return 2;
      if (id === 'molino') return 3;
      if (id === 'tolva') return 4;
      if (id === 'briqueteadora') return 5;
      return 0;
    };

    let lastStep = 0;
    let lastStepName = "";
    for (let i = 0; i < activeModulos.length; i++) {
      const current = activeModulos[i];
      const step = getProcessStepOrder(current.id);
      if (step > 0) {
        if (step < lastStep) {
          isSequenceCorrect = false;
          issues.push(`Error de granulometría: El orden de procesamiento es incorrecto. "${current.nombre}" está posicionado después de "${lastStepName}".`);
          recommendationsList.push(`Ajuste el flujo secuencial para que el corte o trituración preceda a la granulación, y esta a la briqueteadora.`);
        }
        lastStep = step;
        lastStepName = current.nombre;
      }
    }

    // 4. Check if briqueteadora has a tolva pulmón directly before it
    const briqIndex = activeModulos.findIndex(m => m.id === 'briqueteadora');
    if (briqIndex !== -1) {
      if (briqIndex === 0) {
        isSequenceCorrect = false;
        issues.push("Error operativo: La Briqueteadora doble BQT300 no puede estar al inicio de la línea.");
        recommendationsList.push("Mueva la Briqueteadora al final de la secuencia de procesamiento.");
      } else {
        const preceding = activeModulos[briqIndex - 1];
        if (preceding.id !== 'tolva') {
          issues.push(`Alerta de dosificación: "${preceding.nombre}" alimenta directamente a la Briqueteadora. Se recomienda acoplar una "Tolva pulmón" antes de la Briqueteadora para evitar atascamientos por alimentación discontinua.`);
          recommendationsList.push("Active e inserte el módulo Tolva pulmón justo antes de la Briqueteadora doble BQT300.");
        }
      }
    }

    // 5. Check if molino is active but extractorPolvoActivo is false
    const molinoActivo = activeModulos.some(m => m.id === 'molino');
    if (molinoActivo && !extractorPolvoActivo) {
      issues.push("Alerta ambiental/seguridad: Molino granulador activo sin sistema de Extracción de Polvo.");
      recommendationsList.push("Active el switch del Extractor de Polvo en los parámetros estáticos.");
    }

    // 6. Check for metal detector when tolva dosificadora is active
    const desbobinadoraActiva = activeModulos.some(m => m.id === 'desbobinadora');
    const dancerActivo = activeModulos.some(m => m.id === 'dancer');
    if (desbobinadoraActiva && !dancerActivo) {
      issues.push("Riesgo operativo/mecánico: Tolva activa sin Módulo detector de metales (riesgo de dañar cuchillas de trituradora).");
      recommendationsList.push("Active y posicione el Módulo detector de metales inmediatamente después de la Tolva.");
    }

    // 7. Capacity and bottleneck calculations
    const bottleneckCandidates = activeModulos.filter(m => !m.id.startsWith('banda_salida') && m.id !== 'carritos');
    let bottleneckModulo = "Ninguno";
    let minCapacity = Infinity;
    if (bottleneckCandidates.length > 0) {
      bottleneckCandidates.forEach(m => {
        if (m.capacidadNominal < minCapacity) {
          minCapacity = m.capacidadNominal;
          bottleneckModulo = m.nombre;
        }
      });
    } else {
      minCapacity = 0;
    }

    const desbobinadorModulo = activeModulos.find(m => m.id === 'desbobinadora');
    const inputCapacity = desbobinadorModulo ? calculos.capacidadRequeridaKgH : 0;
    const isOverloaded = false;

    // Calculate Coupling Efficiency
    let couplingEfficiency = 100;
    if (activeModulos.length > 1) {
      const capacities = activeModulos.map(m => m.capacidadNominal);
      const avg = capacities.reduce((sum, c) => sum + c, 0) / capacities.length;
      const varianceSum = capacities.reduce((sum, c) => sum + Math.abs(c - avg), 0);
      const pctVariance = (varianceSum / (avg * capacities.length)) * 100;
      couplingEfficiency = Math.max(50, Math.min(100, 100 - pctVariance * 0.7));
    }

    // Specific Power Index
    const totalActivePower = activeModulos.reduce((sum, m) => sum + m.potenciaInstalada, 0);
    const specificPowerIndex = minCapacity > 0 ? (totalActivePower / minCapacity) : 0;

    let statusText = isSequenceCorrect ? "PROCESO SECUENCIAL OPTIMIZADO" : "DETECTADAS ANOMALÍAS DE FLUJO";
    
    let aiSummary = "";
    if (isSequenceCorrect) {
      aiSummary = `La línea de producción se encuentra correctamente balanceada con una eficiencia de acoplamiento del ${couplingEfficiency.toFixed(1)}%. El flujo de materiales desde la alimentación inicial hasta el empaque final sigue un orden lógico termodinámico y de granulometría óptimo. La capacidad nominal real está gobernada por "${bottleneckModulo}" a ${minCapacity} kg/h, lo cual satisface la demanda operativa actual de manera segura.`;
    } else {
      aiSummary = `Se han identificado fallas de consistencia o desequilibrio en la secuencia de equipos. El flujo presenta cuellos de botella u omisiones de acoplamiento de transporte que provocarán interrupciones físicas o fatiga en los motores de procesamiento. Se aconseja seguir las directrices de optimización en el orden de las tarjetas y acoplar los módulos de almacenamiento y tracción intermedios sugeridos.`;
    }

    return {
      isSequenceCorrect,
      statusText,
      couplingEfficiency,
      specificPowerIndex,
      flowBottleneck: bottleneckModulo,
      bottleneckCapacity: minCapacity,
      diagnosticoTermico: aiSummary,
      diagnosticoTrace: issues,
      soluciones: recommendationsList
    };
  }, [modulos, calculos, velocidadDesbobinado, extractorPolvoActivo]);

  // --- DIAGNÓSTICOS AUTOMÁTICOS (Reescritos para usar aiProcessAnalysis) ---
  const diagnosticos = useMemo(() => {
    return aiProcessAnalysis.diagnosticoTrace;
  }, [aiProcessAnalysis]);

  // --- RECOMENDACIONES DE INGENIERÍA (Reescritos para usar aiProcessAnalysis) ---
  const recomendaciones = useMemo(() => {
    return aiProcessAnalysis.soluciones;
  }, [aiProcessAnalysis]);

  const reportRef = useRef(null);

  // --- EXPORTAR A CSV ---
  const exportarCSV = () => {
    const rows = [
      ["Variable", "Valor", "Unidad", "Comentario"],
      ["Area metalica del tubo", calculos.areaMetalicaM2.toFixed(8), "m2", "Seccion transversal metalica"],
      ["Peso por metro", calculos.pesoMetroKgM.toFixed(4), "kg/m", "Basado en densidad del cobre"],
      ["Coeficiente de friccion", coefFriccion, "adimensional", `Material guia: ${materialGuia}`],
      ["Fuerza de friccion total", calculos.fuerzaFriccionTotalN.toFixed(2), "N", "Fuerza resistiva longitudinal"],
      ["Potencia perdida por friccion", calculos.potenciaFriccionKw.toFixed(4), "kW", "Perdida de potencia por deslizamiento"],
      ["Longitud total estimada", calculos.longitudTotalM.toFixed(2), "m", "Longitud de tubo de cobre procesado por hora"],
      ["Tiempo de ciclo base", calculos.tiempoDesbobinadoMin.toFixed(2), "min", "Duracion del ciclo base de operacion"],
      ["Capacidad requerida", calculos.capacidadRequeridaKgH.toFixed(2), "kg/h", "Flujo de masa requerido"],
      ["Fuerza de corte", calculos.fuerzaCorteKN.toFixed(2), "kN", "Fuerza necesaria para cizalla"],
      ["Torque requerido rodillo (Seguro)", calculos.torqueSeguroNm.toFixed(2), "N-m", "Torque de empuje con F.S. 1.5"],
      ["Potencia rodillo alimentador", calculos.potenciaMecanicaDesbobinadoKw.toFixed(4), "kW", "Potencia mecanica util de alimentacion"],
      ["Potencia instalada total", calculos.potenciaInstaladaTotalKw.toFixed(2), "kW", "Suma de modulos activos"],
      ["Precio total de venta", calculos.precioVentaTotalUSD, "USD", "Suma de modulos activos"],
      ["Cuello de botella", calculos.cuelloBotellaModulo, "Modulo", `Capacidad limitante: ${calculos.cuelloBotellaCapacidad} kg/h`],
      ["Disponibilidad real", calculos.disponibilidadReal.toFixed(2), "%", "Eficiencia proyectada basada en turnos y personal"]
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${val.toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Carrier_Simulador_Resultados.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- EXPORTAR A EXCEL ---
  const exportarExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      const configData = [
        ['Parámetro', 'Valor Simulado', 'Unidad'],
        ['Cliente', clientName, 'Texto'],
        ['Proyecto', projectName, 'Texto'],
        ['Longitud Pieza', longitudPieza, 'cm'],
        ['Ø Exterior Tubo de Cobre', diametroExteriorTubo, 'mm'],
        ['Espesor de Pared', espesorParedPieza, 'mm'],
        ['Tasa de Alimentación', frecuenciaAlimentacion, 'piezas/min'],
        ['Coef. Fricción', coefFriccion, 'adimensional'],
        ['Guía Deslizante', materialGuia, 'Texto'],
        ['Factor de Seguridad', factorSeguridad, 'FS'],
        ['Resistencia al Corte', resistenciaCorte, 'MPa'],
        ['Límite Elástico', limiteElastico, 'MPa'],
        ['Extractor Polvo Activo', extractorPolvoActivo ? 'SÍ' : 'NO', 'Estado']
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(configData), 'Configuración');

      const eqData = [
        ['ID', 'Nombre de Módulo', 'kW Instalado', 'Capacidad Nominal (kg/h)', 'Estado (Activo)'],
        ...modulos.map(m => [
          m.id, m.nombre, m.potenciaInstalada, m.capacidadNominal, m.activo ? 'ACTIVO' : 'INACTIVO'
        ])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eqData), 'Módulos');

      const resData = [
        ['Métrica', 'Valor', 'Unidad', 'Descripción'],
        ['Área Metálica Tubo', calculos.areaMetalicaM2, 'm2', 'Sección transversal metálica de cobre'],
        ['Peso por Metro', calculos.pesoMetroKgM, 'kg/m', 'Peso por metro lineal del tubo'],
        ['Coeficiente de Fricción', coefFriccion, 'adimensional', 'Coeficiente de fricción de la guía deslizante'],
        ['Fuerza de Fricción Total', calculos.fuerzaFriccionTotalN, 'N', 'Fuerza longitudinal de rozamiento'],
        ['Potencia Perdida por Fricción', calculos.potenciaFriccionKw, 'kW', 'Pérdidas de potencia mecánica por deslizamiento'],
        ['Longitud Total Procesada', calculos.longitudTotalM, 'm', 'Longitud de tubo de cobre por hora'],
        ['Tiempo de Ciclo Base', calculos.tiempoDesbobinadoMin, 'min', 'Tiempo base de operación simulada'],
        ['Capacidad Requerida', calculos.capacidadRequeridaKgH, 'kg/h', 'Flujo de masa requerido por hora'],
        ['Fuerza de Corte', calculos.fuerzaCorteKN, 'kN', 'Fuerza necesaria para la cizalla rotativa'],
        ['Torque Rodillo Alimentador (Seguro)', calculos.torqueSeguroNm, 'N-m', 'Torque de empuje con F.S. 1.5'],
        ['Potencia Rodillo Alimentador', calculos.potenciaMecanicaDesbobinadoKw, 'kW', 'Potencia útil de alimentación'],
        ['Potencia Instalada Total', calculos.potenciaInstaladaTotalKw, 'kW', 'Potencia de módulos activos'],
        ['Cuello de Botella', calculos.cuelloBotellaModulo, '-', 'Módulo limitante de capacidad'],
        ['Capacidad Cuello Botella', calculos.cuelloBotellaCapacidad, 'kg/h', 'Capacidad nominal del cuello de botella'],
        ['Disponibilidad Real', calculos.disponibilidadReal, '%', 'Eficiencia proyectada basada en turnos y personal']
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resData), 'Resultados');

      XLSX.writeFile(wb, `Carrier_Simulacion_${clientName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Error al exportar a Excel");
    }
  };

  // --- GENERAR REPORTE PDF DE ALTA FIDELIDAD ---
  const printReport = async (fileName = null, exportOnly = false) => {
    const reportWrap = reportRef.current;
    if (!reportWrap) return;

    const pages = reportWrap.querySelectorAll('.lma-page');
    if (!pages || pages.length === 0) {
      alert("No se encontraron páginas para exportar.");
      return;
    }

    setIsGeneratingPdf(true);
    setPdfProgress(0);

    try {
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: 'a4',
        compress: true
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < pages.length; i++) {
        const pageEl = pages[i];
        setPdfProgress((i / pages.length) * 100);

        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: false,
          backgroundColor: '#ffffff',
          logging: false
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          pdf.addPage('a4', 'landscape');
        }

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      setPdfProgress(100);
      
      const clientClean = clientName.trim().toUpperCase().replace(/\s+/g, '_');
      const projectClean = projectName.trim().toUpperCase().replace(/\s+/g, '_');
      const defaultFileName = `CARRIER_INFORME_${projectClean}_${clientClean}.pdf`;
      const finalFileName = fileName && fileName.trim() !== '' ? fileName : defaultFileName;
      
      // Guardar/Descargar el PDF
      pdf.save(finalFileName);
      
    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert("Error al generar el PDF de alta fidelidad. Por favor reintente.");
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress(0);
      if (exportOnly) {
        setIsReportModalOpen(false);
        setIsExportOnly(false);
      }
    }
  };

  const handlePrintFromMain = () => {
    const clientClean = clientName.trim().toUpperCase().replace(/\s+/g, '_');
    const projectClean = projectName.trim().toUpperCase().replace(/\s+/g, '_');
    setExportFileName(`CARRIER_INFORME_${projectClean}_${clientClean}.pdf`);
    setShowExportDialog(true);
  };

  const confirmExportPdf = () => {
    setShowExportDialog(false);
    setTwinSnapshot(localStorage.getItem('sim_carrier_twin_snapshot_base64'));
    setTwinSnapshotLateral(localStorage.getItem('sim_carrier_twin_snapshot_lateral'));
    setTwinSnapshotSuperior(localStorage.getItem('sim_carrier_twin_snapshot_superior'));
    setTwinSnapshotIsometrica(localStorage.getItem('sim_carrier_twin_snapshot_isometrica'));
    setIsExportOnly(true);
    setIsReportModalOpen(true);
    
    setTimeout(() => {
      printReport(exportFileName, true);
    }, 1000);
  };

  const toggleModulo = (id) => {
    setModulos(prev => prev.map(m => m.id === id ? { ...m, activo: !m.activo } : m));
  };

  const setPotenciaModulo = (id, kw) => {
    setModulos(prev => prev.map(m => m.id === id ? { ...m, potenciaInstalada: kw } : m));
  };

  const setCapacidadModulo = (id, kgh) => {
    setModulos(prev => prev.map(m => m.id === id ? { ...m, capacidadNominal: kgh } : m));
  };

  const setPrecioModulo = (id, usd) => {
    setModulos(prev => prev.map(m => m.id === id ? { ...m, precioVenta: usd } : m));
  };

  const updateModulo = (id, fields) => {
    setModulos(prev => prev.map(m => m.id === id ? { ...m, ...fields } : m));
  };

  // --- 3D TWIN BINDING & CONFIGURATION ---
  const twinNodes = useMemo(() => {
    return modulos.map((m) => {
      const customPos = twinNodePositions[m.id];
      
      // Map modulo ID to 3D equipment type
      let type3D = 'Transportador';
      if (m.id === 'desbobinadora') type3D = 'Extrusora';
      else if (m.id === 'dancer') type3D = 'Detector';
      else if (m.id === 'cizalla') type3D = 'Molino';
      else if (m.id === 'trituradora') type3D = 'Molino';
      else if (m.id === 'molino') type3D = 'Molino';
      else if (m.id === 'tolva') type3D = 'Secadora';
      else if (m.id === 'briqueteadora') type3D = 'Extrusora';
      else if (m.id === 'carritos') type3D = 'Chiller';

      return {
        id: m.id,
        type: 'custom',
        data: {
          type: type3D,
          label: m.nombre,
          capacity: m.capacidadNominal, 
          power: m.potenciaInstalada, 
          color: m.activo ? '#00F0FF' : '#374151', 
          hideLabel: true,
          position3D: customPos?.position3D || null,
          labelPosition: customPos?.labelPosition || null
        }
      };
    });
  }, [modulos, twinNodePositions]);

  const twinEdges = useMemo(() => {
    return [
      { id: 'edge_1', source: 'banda_entrada', target: 'desbobinadora' },
      { id: 'edge_2', source: 'desbobinadora', target: 'dancer' },
      { id: 'edge_3', source: 'dancer', target: 'alimentador' },
      { id: 'edge_4', source: 'alimentador', target: 'cizalla' },
      { id: 'edge_5', source: 'cizalla', target: 'trituradora' },
      { id: 'edge_6', source: 'trituradora', target: 'banda_salida_trit' },
      { id: 'edge_7', source: 'banda_salida_trit', target: 'molino' },
      { id: 'edge_8', source: 'molino', target: 'banda_salida_mol' },
      { id: 'edge_9', source: 'banda_salida_mol', target: 'tolva' },
      { id: 'edge_10', source: 'tolva', target: 'briqueteadora' },
      { id: 'edge_11', source: 'briqueteadora', target: 'banda_salida_briq' },
      { id: 'edge_12', source: 'banda_salida_briq', target: 'carritos' }
    ];
  }, []);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      const isFs = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsTwinBlockFullscreen(isFs);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    document.addEventListener('mozfullscreenchange', handleFsChange);
    document.addEventListener('MSFullscreenChange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
      document.removeEventListener('mozfullscreenchange', handleFsChange);
      document.removeEventListener('MSFullscreenChange', handleFsChange);
    };
  }, []);

  const toggleTwinBlockFullscreen = () => {
    const element = twinBlockRef.current;
    if (!element) return;
    if (!isTwinBlockFullscreen) {
      if (element.requestFullscreen) element.requestFullscreen();
      else if (element.webkitRequestFullscreen) element.webkitRequestFullscreen();
      else if (element.msRequestFullscreen) element.msRequestFullscreen();
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
    }
  };

  const processAndSetupTwinModel = async (file) => {
    if (!file) return;
    try {
      const result = await process3DFile(file);
      const suggestedName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setUploadModelName(suggestedName);
      setPendingUpload({ file, processedResult: result });
    } catch (err) {
      console.error(err);
      alert('Error procesando el archivo 3D: ' + err.message);
    }
  };

  const handleTwinModelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    await processAndSetupTwinModel(file);
  };

  const handleConfirmUploadToLibrary = async () => {
    if (!pendingUpload) return;
    const { file, processedResult } = pendingUpload;
    const modelName = uploadModelName.trim() || processedResult.name;
    setIsSavingToCloud(true);
    setUploadProgress(0);
    try {
      const ext = file.name.split('.').pop().toLowerCase();
      const storagePath = `twin-models/${Date.now()}_${modelName.replace(/\s+/g, '_')}.${ext}`;
      
      const { data: storageData, error: storageError } = await uploadFileWithProgress(
        'flow-assets',
        storagePath,
        file,
        (p) => setUploadProgress(p)
      );

      if (storageError) {
        throw new Error(storageError.message || storageError);
      }

      const { data: urlData } = supabase.storage.from('flow-assets').getPublicUrl(storagePath);
      if (!urlData?.publicUrl) {
        throw new Error('No se pudo obtener la URL pública del archivo subido.');
      }
      const publicUrl = urlData.publicUrl;

      const layoutRecord = {
        ...processedResult,
        url: publicUrl,
        name: modelName,
        storagePath: storageData?.path || storagePath,
      };

      const savedDesign = await saveDesignToDb({
        name: modelName,
        description: `Modelo 3D subido desde el simulador Carrier (${ext.toUpperCase()})`,
        nodes: [],
        edges: [],
        layout: layoutRecord,
        customEquipments: null,
      });

      setTwinLayout(layoutRecord);
      if (savedDesign?.id) setCurrentDesignId(savedDesign.id);

      setPendingUpload(null);
      setUploadModelName('');
      setUploadProgress(0);
      alert(`Modelo 3D "${modelName}" subido y guardado exitosamente en tu librería.`);
    } catch (err) {
      console.error(err);
      alert('Error guardando en la nube: ' + err.message);
    } finally {
      setIsSavingToCloud(false);
    }
  };

  const handleCancelUpload = () => {
    if (pendingUpload?.processedResult?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(pendingUpload.processedResult.url);
    }
    setPendingUpload(null);
    setUploadModelName('');
  };

  const handleLoadDesignFromLibrary = async (designId) => {
    const design = await fetchDesignFromDb(designId);
    if (design) {
      if (design.layout) setTwinLayout(design.layout);
      setCurrentDesignId(designId);
      setIsDesignsLibraryOpen(false);
      setIsAnchored(false);

      if (design.nodes && design.nodes.length > 0) {
        const positions = {};
        design.nodes.forEach(n => {
          if (n.data?.position3D || n.data?.labelPosition) {
            positions[n.id] = {
              position3D: n.data.position3D,
              labelPosition: n.data.labelPosition
            };
          }
        });
        setTwinNodePositions(positions);
        localStorage.setItem('sim_carrier_twin_node_positions', JSON.stringify(positions));
      }
    }
  };

  const handleSyncFromFlowDesigner = () => {
    setIsAnchoring(true);
    setTimeout(() => {
      setIsAnchoring(false);
      setIsAnchored(true);
      setTwinLayout(null);
      setTwinNodePositions({});
      localStorage.removeItem('sim_carrier_twin_layout');
      localStorage.removeItem('sim_carrier_twin_node_positions');
      localStorage.removeItem('sim_carrier_twin_anchor_id');
      setCurrentDesignId(null);
      alert("Coordenadas 3D del gemelo reajustadas a los valores originales.");
    }, 1000);
  };

  const handleAnchorToSimulator = async () => {
    if (!twinLayout) return;
    setIsAnchoring(true);
    try {
      const anchorData = {
        name: `Twin · Carrier`,
        description: `Configuración anclada al simulador Carrier`,
        nodes: twinNodes,
        edges: twinEdges,
        layout: { ...twinLayout, elevation: twinFloorElevation },
        custom_equipments: null,
      };

      let designId = currentDesignId;

      if (designId) {
        const { error } = await supabase
          .from('flow_designs_beta')
          .update({
            nodes: twinNodes,
            edges: twinEdges,
            layout: { ...twinLayout, elevation: twinFloorElevation },
            updated_at: new Date().toISOString(),
          })
          .eq('id', designId);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('flow_designs_beta')
          .insert([anchorData])
          .select()
          .single();

        if (error) throw error;
        if (data?.id) {
          designId = data.id;
          setCurrentDesignId(data.id);
        }
      }

      localStorage.setItem('sim_carrier_twin_anchor_id', designId || '');
      localStorage.setItem('sim_carrier_twin_layout', JSON.stringify({ ...twinLayout, elevation: twinFloorElevation }));
      localStorage.setItem('sim_carrier_twin_node_positions', JSON.stringify(twinNodePositions));
      setIsAnchored(true);
      alert("Posiciones de máquinas y diseño 3D anclados y guardados exitosamente para este simulador.");
    } catch (err) {
      console.error('[Anchor] Error:', err);
      alert('Error al guardar en la nube: ' + err.message);
    } finally {
      setIsAnchoring(false);
    }
  };

  const handleUpdateTwinNode = (nodeId, updatedData) => {
    setTwinNodePositions(prev => {
      const next = {
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          ...updatedData
        }
      };
      localStorage.setItem('sim_carrier_twin_node_positions', JSON.stringify(next));
      return next;
    });
    setIsAnchored(false);
  };

  const chartBalanceCargaData = useMemo(() => {
    return [
      { name: 'Flujo Requerido', 'Masa kg/h': Math.round(calculos.capacidadRequeridaKgH) },
      { name: 'Cuello de Botella', 'Masa kg/h': calculos.cuelloBotellaCapacidad === Infinity ? 0 : calculos.cuelloBotellaCapacidad }
    ];
  }, [calculos]);

  // Estilos de Páginas en Modal / Reporte
  const S = {
    page: { 
      width: '1120px', 
      height: '792px', 
      background: 'radial-gradient(circle at 90% 8%, rgba(6,182,212,0.04) 0%, rgba(255,255,255,0) 40%), radial-gradient(circle at 10% 92%, rgba(8,145,178,0.03) 0%, rgba(255,255,255,0) 40%), #ffffff', 
      borderRadius: '24px', 
      overflow: 'hidden', 
      position: 'relative',
      border: '1px solid #dbe5ee',
      boxShadow: '0 10px 40px rgba(15,23,42,0.08)',
      boxSizing: 'border-box',
      flexShrink: 0
    },
    inner: { 
      padding: '38px 48px 65px', 
      height: '100%', 
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box'
    },
    h2: { fontSize: 24, margin: '0 0 6px', color: '#0f172a', fontWeight: 800 },
    sub: { margin: '0 0 15px', color: '#475569', fontSize: 13, fontWeight: 500 },
    th: { background: '#ecfeff', color: '#0891b2', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, padding: '8px 10px', borderBottom: '2px solid #a5f3fc', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 },
    td: { borderBottom: '1px solid #e2e8f0', padding: '8px 10px', textAlign: 'left', verticalAlign: 'middle', fontSize: 11, color: '#1e293b' }
  };

  const getSplitTitle = (title) => {
    const cleanTitle = title.toUpperCase();
    const extractNum = (str) => { const match = str.match(/^(\d+)\.\s+/); return match ? match[1] + '. ' : ''; };
    const num = extractNum(title);

    if (cleanTitle.includes('ESPECIFICACIONES TÉCNICAS')) return { line1: num + 'ESPECIFICACIONES TÉCNICAS', line2: 'Y MÓDULOS DE PROCESO' };
    if (cleanTitle.includes('VISTA LATERAL')) return { line1: num + 'GEMELO DIGITAL 3D', line2: 'VISTA LATERAL / PRINCIPAL' };
    if (cleanTitle.includes('VISTA SUPERIOR')) return { line1: num + 'GEMELO DIGITAL 3D', line2: 'VISTA SUPERIOR (PLANTA)' };
    if (cleanTitle.includes('VISTA ISOMÉTRICA')) return { line1: num + 'GEMELO DIGITAL 3D', line2: 'VISTA ISOMÉTRICA (PERSPECTIVA)' };
    if (cleanTitle.includes('MATRIZ DE RESULTADOS')) return { line1: num + 'MATRIZ DE RESULTADOS', line2: 'TÉCNICOS CONSOLIDADOS' };
    if (cleanTitle.includes('BALANCE ENERGÉTICO')) return { line1: num + 'BALANCE ENERGÉTICO', line2: 'Y POTENCIAS DE MÓDULOS' };
    if (cleanTitle.includes('DIAGNÓSTICO OPERATIVO')) return { line1: num + 'DIAGNÓSTICO OPERATIVO', line2: 'Y RECOMENDACIONES DE INGENIERÍA' };

    return { line1: title.toUpperCase(), line2: '' };
  };
  const renderPageHeader = (title, subtitle) => {
    const { line1, line2 } = getSplitTitle(title);
    return (
      <div style={{ marginBottom: 20 }}>
        {/* Estampado Corporativo de Carrier */}
        <div style={{ fontSize: 10, fontWeight: 900, color: '#0891b2', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
          PROYECTO CARRIER · COBRE · PANDORA v8.00
        </div>
        
        {/* Título en Dos Líneas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <div style={{ fontSize: 34, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.8px', lineHeight: 1.1 }}>
            {line1}
          </div>
          {line2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 1 }}>
              <div style={{ width: 4, height: 30, background: '#06b6d4', borderRadius: 2 }} />
              <div style={{ fontSize: 34, fontWeight: 900, color: '#06b6d4', letterSpacing: '-0.8px', lineHeight: 1.1 }}>
                {line2}
              </div>
            </div>
          )}
        </div>

        {/* Subtítulo */}
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 13, fontWeight: 600 }}>
          {subtitle}
        </p>
      </div>
    );
  };

  const renderPageFooter = (pageNum, totalPgs) => {
    return (
      <div style={{ position: 'absolute', bottom: 18, left: 48, right: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 8, fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>
        <span style={{ textTransform: 'uppercase' }}>{clientName} · PROYECTO: {projectName}</span>
        <span style={{ color: '#64748b', fontWeight: 900 }}>PÁGINA {pageNum} DE {totalPgs}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#08080a] text-gray-200 p-4 md:p-8">
      
      {/* Botón Volver */}
      <div className="mb-4 no-print">
        <button
          onClick={() => navigate('/alpha/simulators')}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-xs font-semibold text-gray-400 hover:text-white hover:border-gray-700 transition-all"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver al Hub
        </button>
      </div>

      {/* 1. ENCABEZADO */}
      <header className="mb-8 border-b border-[#1b1b22] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
              Simulador Técnico – Rollos de Tubo de Cobre
            </h1>
          </div>
          <p className="text-gray-500 mt-2 font-semibold tracking-widest uppercase text-xs">
            Desbobinado | Corte | Trituración | Molienda | Briqueteado · Proyecto Carrier
          </p>
        </div>

        {/* Acciones principales de cabecera */}
        <div className="flex flex-col items-end gap-3 no-print">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAnimando(!animando)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
                animando 
                  ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-glow-cyan" 
                  : "bg-gray-800/30 border-gray-700 text-gray-400"
              }`}
            >
              {animando ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {animando ? "Animación ON" : "Animación OFF"}
            </button>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-850 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-300 transition-all font-bold text-xs uppercase tracking-widest"
            >
              <Eye className="w-4 h-4 text-cyan-400" />
              Ver Informe
            </button>

            <button
              onClick={handlePrintFromMain}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-teal-500/20 to-cyan-500/20 border border-teal-500/35 hover:border-teal-500/60 text-teal-300 transition-all font-black text-xs uppercase tracking-widest shadow-[0_0_12px_rgba(20,184,166,0.1)]"
            >
              <Printer className="w-4 h-4 text-cyan-400" />
              Exportar PDF
            </button>

            <button
              onClick={handleResetModulos}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/20 border border-red-500/30 hover:border-red-500 hover:bg-red-500 hover:text-white text-red-400 transition-all font-black text-xs uppercase tracking-widest"
              title="Restablecer todos los equipos a los valores de fábrica"
            >
              <RotateCcw className="w-4 h-4" />
              Reiniciar
            </button>
          </div>

          {/* BOTÓN GUARDAR SIMULADOR */}
          <button 
            onClick={handleSaveModulos}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-cyan-500/15 border border-cyan-500/35 hover:border-cyan-400 hover:bg-cyan-500/25 text-cyan-400 hover:text-white transition-all uppercase tracking-wider"
            title="Guardar estado de simulación localmente y en la base de datos de producción (Supabase)"
          >
            <Save className="w-4 h-4" />
            Guardar Simulador
          </button>
        </div>
      </header>

      {/* ALERTAS DE VALIDACIÓN */}
      {!validaciones.valido && (
        <div className="mb-8 p-4 rounded-2xl bg-red-950/20 border border-red-500/40 text-red-200">
          <h3 className="font-bold flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Error en configuración del simulador
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-300">
            {validaciones.errores.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* GRID DE PANTALLA PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PARTE IZQUIERDA: CONFIGURACIONES (5 COLS) */}
        <div className="lg:col-span-5 space-y-8 no-print">
          
          {/* 1. DATOS DEL PROYECTO */}
          <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24]">
            <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
              <Cpu className="w-4 h-4 text-cyan-400" />
              1. Datos del Proyecto
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Nombre del Proyecto</label>
                <input 
                  type="text" 
                  value={projectName} 
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-[#17171e] border border-[#272733] hover:border-gray-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm font-black text-white focus:outline-none"
                  placeholder="Ej. PROYECTO CARRIER - COBRE"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Nombre del Cliente</label>
                <input 
                  type="text" 
                  value={clientName} 
                  onChange={(e) => setClientName(e.target.value)}
                  className="w-full bg-[#17171e] border border-[#272733] hover:border-gray-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm font-black text-white focus:outline-none"
                  placeholder="Ej. CARRIER CORP"
                />
              </div>
            </div>
          </section>
          
          {/* 2. DIMENSIONES DE PIEZAS DE COBRE */}
          <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24]">
            <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
              <Sliders className="w-4 h-4 text-blue-400" />
              2. Dimensiones de Piezas de Cobre
            </h2>
            <div className="space-y-4">
              {/* Preset Comercial */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1.5">Preset Comercial HVAC/ACR (Carrier)</label>
                <select
                  value={presetTubo}
                  onChange={(e) => handlePresetChange(e.target.value)}
                  className="w-full bg-[#17171e] border border-[#272733] focus:border-blue-500 rounded-xl px-3 py-2 text-xs font-black text-white focus:outline-none"
                >
                  {PRESET_TUBERIAS.map(p => (
                    <option key={p.name} value={p.name}>
                      {p.name !== 'Personalizado' ? `${p.name} (OD: ${p.od}mm, Pared: ${p.wall}mm)` : 'Dimensiones Personalizadas'}
                    </option>
                  ))}
                </select>
              </div>

              {/* Longitud Pieza */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Longitud de Pieza (cm)</label>
                  <span className="text-xs font-black text-blue-400">{longitudPieza} cm</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="10" 
                    max="80" 
                    value={longitudPieza}
                    onChange={(e) => setLongitudPieza(parseInt(e.target.value) || 10)}
                    className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <input 
                    type="number" 
                    min="10" 
                    max="80" 
                    value={longitudPieza}
                    onChange={(e) => setLongitudPieza(Math.max(10, Math.min(80, parseInt(e.target.value) || 10)))}
                    className="w-16 bg-[#17171e] border border-[#272733] focus:border-blue-500 rounded-lg px-2 py-1 text-xs font-black text-white text-center focus:outline-none"
                  />
                </div>
              </div>

              {/* Diámetro Exterior */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Ø Exterior Tubo (mm)</label>
                  <span className="text-xs font-black text-blue-400">{diametroExteriorPieza} mm</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="5" 
                    max="250" 
                    step="0.05"
                    value={diametroExteriorPieza}
                    onChange={(e) => {
                      setDiametroExteriorPieza(parseFloat(e.target.value) || 5);
                      setPresetTubo('Personalizado');
                    }}
                    className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <input 
                    type="number" 
                    min="5" 
                    max="250" 
                    step="0.01"
                    value={diametroExteriorPieza}
                    onChange={(e) => {
                      setDiametroExteriorPieza(Math.max(5, Math.min(250, parseFloat(e.target.value) || 5)));
                      setPresetTubo('Personalizado');
                    }}
                    className="w-16 bg-[#17171e] border border-[#272733] focus:border-blue-500 rounded-lg px-2 py-1 text-xs font-black text-white text-center focus:outline-none"
                  />
                </div>
              </div>

              {/* Espesor Pared */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Espesor de Pared (mm)</label>
                  <span className="text-xs font-black text-blue-400">{espesorParedPieza} mm</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="0.5" 
                    max="10" 
                    step="0.05"
                    value={espesorParedPieza}
                    onChange={(e) => {
                      setEspesorParedPieza(parseFloat(e.target.value) || 0.5);
                      setPresetTubo('Personalizado');
                    }}
                    className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <input 
                    type="number" 
                    min="0.5" 
                    max="10" 
                    step="0.01"
                    value={espesorParedPieza}
                    onChange={(e) => {
                      setEspesorParedPieza(Math.max(0.5, Math.min(10, parseFloat(e.target.value) || 0.5)));
                      setPresetTubo('Personalizado');
                    }}
                    className="w-16 bg-[#17171e] border border-[#272733] focus:border-blue-500 rounded-lg px-2 py-1 text-xs font-black text-white text-center focus:outline-none"
                  />
                </div>
              </div>

              {/* Frecuencia de Alimentación */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Tasa de Alimentación (piezas/min)</label>
                  <span className="text-xs font-black text-blue-400">{frecuenciaAlimentacion} piezas/min</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="5" 
                    max="120" 
                    value={frecuenciaAlimentacion}
                    onChange={(e) => setFrecuenciaAlimentacion(parseInt(e.target.value) || 5)}
                    className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <input 
                    type="number" 
                    min="5" 
                    max="120" 
                    value={frecuenciaAlimentacion}
                    onChange={(e) => setFrecuenciaAlimentacion(Math.max(5, Math.min(120, parseInt(e.target.value) || 5)))}
                    className="w-16 bg-[#17171e] border border-[#272733] focus:border-blue-500 rounded-lg px-2 py-1 text-xs font-black text-white text-center focus:outline-none"
                  />
                </div>
              </div>

              {/* Capacidad Máxima Requerida */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Capacidad Máx. Requerida de Línea</label>
                  <span className="text-xs font-black text-blue-400">{capacidadMaximaLinea} kg/h</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="100" 
                    max="5000" 
                    step="50"
                    value={capacidadMaximaLinea}
                    onChange={(e) => setCapacidadMaximaLinea(parseInt(e.target.value) || 100)}
                    className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <input 
                    type="number" 
                    min="100" 
                    max="5000" 
                    value={capacidadMaximaLinea}
                    onChange={(e) => setCapacidadMaximaLinea(Math.max(100, Math.min(5000, parseInt(e.target.value) || 100)))}
                    className="w-16 bg-[#17171e] border border-[#272733] focus:border-blue-500 rounded-lg px-2 py-1 text-xs font-black text-white text-center focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* OPERACIÓN Y TURNOS DE TRABAJO */}
          <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24]">
            <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
              <Users className="w-4 h-4 text-cyan-400" />
              Operación y Turnos
            </h2>
            <div className="space-y-4">
              {/* Capacidad Objetivo del Diseñador */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Capacidad Máxima de Cobre (kg/h)</label>
                  <span className="text-xs font-black text-blue-400">{capacidadObjetivoKgH} kg/h</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="50" 
                    max="3000" 
                    step="50"
                    value={capacidadObjetivoKgH}
                    onChange={(e) => setCapacidadObjetivoKgH(parseInt(e.target.value) || 50)}
                    className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <input 
                    type="number" 
                    min="50" 
                    max="3000" 
                    value={capacidadObjetivoKgH}
                    onChange={(e) => setCapacidadObjetivoKgH(Math.max(50, Math.min(3000, parseInt(e.target.value) || 50)))}
                    className="w-16 bg-[#17171e] border border-[#272733] focus:border-blue-500 rounded-lg px-2 py-1 text-xs font-black text-white text-center focus:outline-none"
                  />
                </div>
              </div>

              {/* Turnos de Trabajo */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Turnos de Trabajo (8h c/u)</label>
                  <span className="text-xs font-black text-blue-400">{turnosTrabajo} ({turnosTrabajo * 8}h/día)</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="1" 
                    max="3" 
                    step="1"
                    value={turnosTrabajo}
                    onChange={(e) => setTurnosTrabajo(parseInt(e.target.value) || 1)}
                    className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <input 
                    type="number" 
                    min="1" 
                    max="3" 
                    value={turnosTrabajo}
                    onChange={(e) => setTurnosTrabajo(Math.max(1, Math.min(3, parseInt(e.target.value) || 1)))}
                    className="w-16 bg-[#17171e] border border-[#272733] focus:border-blue-500 rounded-lg px-2 py-1 text-xs font-black text-white text-center focus:outline-none"
                  />
                </div>
              </div>

              {/* Número de Operadores */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase">Operadores en Línea</label>
                  <span className="text-xs font-black text-blue-400">{numeroOperadores} op</span>
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="range" 
                    min="1" 
                    max="8" 
                    step="1"
                    value={numeroOperadores}
                    onChange={(e) => setNumeroOperadores(parseInt(e.target.value) || 1)}
                    className="flex-1 accent-blue-500 h-1 bg-gray-800 rounded-lg appearance-none cursor-pointer"
                  />
                  <input 
                    type="number" 
                    min="1" 
                    max="8" 
                    value={numeroOperadores}
                    onChange={(e) => setNumeroOperadores(Math.max(1, Math.min(8, parseInt(e.target.value) || 1)))}
                    className="w-16 bg-[#17171e] border border-[#272733] focus:border-blue-500 rounded-lg px-2 py-1 text-xs font-black text-white text-center focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 3. PARÁMETROS OPERATIVOS Y FÍSICOS */}
          <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24]">
            <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
              <Wrench className="w-4 h-4 text-cyan-400" />
              3. Parámetros Físicos de Operación
            </h2>
            <div className="space-y-4">
              {/* Parámetros estáticos del Cobre */}
              <div className="p-4 rounded-2xl bg-gray-900/30 border border-[#222] grid grid-cols-2 gap-y-3 gap-x-4">
                <div>
                  <span className="text-[10px] text-gray-500 block">Peso de una Pieza:</span>
                  <span className="text-xs font-black text-cyan-400">{(calculos.pesoPiezaKg || 0).toFixed(3)} kg</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Área Metálica:</span>
                  <span className="text-xs font-black text-cyan-400">{(calculos.areaMetalicaM2 * 1e6).toFixed(1)} mm²</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Peso Lineal:</span>
                  <span className="text-xs font-black text-emerald-400">{(calculos.pesoMetroKgM || 0).toFixed(4)} kg/m</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Densidad Cobre:</span>
                  <span className="text-xs font-bold text-white">8,960 kg/m³</span>
                </div>

                <div className="col-span-2 border-t border-[#222]/50 pt-2">
                  <span className="text-[10px] text-gray-500 block mb-1">Guía de Deslizamiento (Fricción):</span>
                  <select
                    value={materialGuia}
                    onChange={(e) => handleMaterialGuiaChange(e.target.value)}
                    className="w-full bg-[#17171e] border border-[#272733] focus:border-cyan-500 rounded-lg px-2 py-1 text-xs font-black text-white focus:outline-none"
                  >
                    <option value="acero_seco">Cobre sobre Acero (Seco) - μ = 0.30</option>
                    <option value="acero_lubricado">Cobre sobre Acero (Lubricado) - μ = 0.15</option>
                    <option value="polimero_ptfe">Cobre sobre PTFE / Polímero - μ = 0.08</option>
                  </select>
                </div>

                <div>
                  <span className="text-[10px] text-gray-500 block">Coef. Fricción (μ):</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="1.00"
                    value={coefFriccion}
                    onChange={(e) => {
                      setPresetTubo('Personalizado');
                      setCoefFriccion(parseFloat(e.target.value) || 0.01);
                    }}
                    className="w-full max-w-[80px] bg-transparent text-xs font-black text-white border-b border-gray-700 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Fuerza Fricción:</span>
                  <span className="text-xs font-black text-white">{(calculos.fuerzaFriccionTotalN || 0).toFixed(2)} N</span>
                </div>

                <div className="col-span-2 border-t border-[#222]/50 pt-2 grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-gray-500 block">Resistencia Corte (MPa):</span>
                    <input
                      type="number"
                      value={resistenciaCorte}
                      onChange={(e) => setResistenciaCorte(parseFloat(e.target.value) || 0)}
                      className="w-full max-w-[80px] bg-transparent text-xs font-black text-white border-b border-gray-700 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-gray-500 block">Límite Elástico (MPa):</span>
                    <input
                      type="number"
                      value={limiteElastico}
                      onChange={(e) => setLimiteElastico(parseFloat(e.target.value) || 0)}
                      className="w-full max-w-[80px] bg-transparent text-xs font-black text-white border-b border-gray-700 focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="col-span-2 flex justify-between items-center pt-2 border-t border-[#222]">
                  <span className="text-[10px] text-gray-500 block">Extractor de Polvo Ambiental:</span>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={extractorPolvoActivo} 
                      onChange={(e) => setExtractorPolvoActivo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* INDICADORES CLAVE RÁPIDOS */}
          <section className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] flex flex-col justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">Flujo de Masa Requerido</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-black text-white">{Math.round(calculos.capacidadRequeridaKgH)}</span>
                <span className="text-xs text-gray-500">kg/h</span>
              </div>
            </div>

            <div className={`p-4 rounded-3xl border flex flex-col justify-between transition-colors ${
              calculos.clasificacionRiesgo === 'Alto'
                ? "bg-red-950/20 border-red-500/30"
                : calculos.clasificacionRiesgo === 'Medio'
                  ? "bg-amber-950/20 border-amber-500/30"
                  : "bg-green-950/20 border-green-500/30"
            }`}>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">Score de Riesgo</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-xl font-black ${
                  calculos.clasificacionRiesgo === 'Alto' ? "text-red-500" : calculos.clasificacionRiesgo === 'Medio' ? "text-amber-500" : "text-green-500"
                }`}>{calculos.scoreRiesgo}</span>
                <span className="text-xs text-gray-500 uppercase tracking-widest">{calculos.clasificacionRiesgo}</span>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] flex flex-col justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">Disponibilidad Real</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-black text-cyan-400">{calculos.disponibilidadReal.toFixed(1)}%</span>
                <span className="text-[9px] text-gray-500 uppercase font-black">OEE-A</span>
              </div>
            </div>

            <div className="p-4 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] flex flex-col justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider block">Panorama de Línea</span>
              <div className="mt-2">
                <span className={`text-[11px] font-black leading-tight block ${calculos.panoramaClass}`}>
                  {calculos.panoramaLabel}
                </span>
              </div>
            </div>
          </section>

        </div>

        {/* PARTE DERECHA: GEMELO DIGITAL Y MÓDULOS (7 COLS) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* VISUALIZADOR 3D / GEMELO DIGITAL */}
          <section ref={twinBlockRef} className={`transition-all duration-300 relative ${isTwinBlockFullscreen ? 'w-screen h-screen overflow-y-auto bg-[#05070f] p-8 rounded-none border-none z-[9999] flex flex-col justify-between' : 'rounded-3xl bg-[#0f0f13] border border-[#1d1d24] overflow-hidden flex flex-col print-card'}`}>
            <div className="px-6 py-4 border-b border-[#1b1b22] flex flex-col md:flex-row md:items-center justify-between gap-3 no-print">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-black uppercase tracking-widest text-white">Gemelo Digital Interactivo (3D Real-Time)</span>
              </div>
              <div className="flex items-center flex-wrap gap-2">
                {/* Selector de Tema */}
                <select 
                  value={twinTheme} 
                  onChange={(e) => setTwinTheme(e.target.value)}
                  className={`px-2 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all focus:outline-none cursor-pointer ${
                    twinTheme === 'toxic'
                      ? 'bg-[#1a1a1a] border-[#2c302e] text-[#84cc16]'
                      : 'bg-white/5 border-white/10 text-gray-300'
                  }`}
                  title="Cambiar tema de renderizado 3D"
                >
                  <option value="blueprint" className="bg-[#0b0c10] text-gray-300">Esquema Azul</option>
                  <option value="dark" className="bg-[#0b0c10] text-gray-300">Gris Carbón</option>
                  <option value="toxic" className="bg-[#0c0d0e] text-[#84cc16]">Toxic Green</option>
                  <option value="aluminum" className="bg-[#0b0c10] text-gray-300">Aluminio Mate</option>
                </select>

                <button 
                  onClick={() => setIsDesignsLibraryOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl transition-all font-black uppercase tracking-widest text-[9px] ${
                    twinTheme === 'toxic'
                      ? 'bg-[#222222] border-[#2c302e] hover:border-[#84cc16] text-[#84cc16] hover:text-white'
                      : 'bg-white/5 border-white/10 text-gray-300 hover:text-white hover:border-white/20'
                  }`}
                  title="Ver y cargar planos o modelos 3D de la nube"
                >
                  <FolderOpen className="w-3.5 h-3.5" /> Librería
                </button>

                <label 
                  htmlFor="twin-upload-file-carrier"
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer transition-all font-black uppercase tracking-widest text-[9px] ${
                    twinTheme === 'toxic'
                      ? 'bg-[#222222] border-[#2c302e] hover:border-[#84cc16] text-[#84cc16] hover:text-white'
                      : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30'
                  }`}
                  title="Subir archivo 3D de la planta (.glb, .gltf o .fbx)"
                >
                  <Upload className="w-3.5 h-3.5" /> Subir 3D
                </label>
                <input 
                  type="file" 
                  id="twin-upload-file-carrier" 
                  className="hidden" 
                  accept=".glb,.gltf,.fbx" 
                  onChange={handleTwinModelUpload} 
                />

                <button 
                  onClick={() => setIsTwinEditMode(!isTwinEditMode)}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl transition-all font-black uppercase tracking-widest text-[9px] ${
                    isTwinEditMode 
                      ? twinTheme === 'toxic'
                        ? 'bg-[#84cc16] hover:bg-[#a3e635] text-black font-extrabold border-none shadow-[0_0_12px_rgba(132,204,22,0.4)]'
                        : 'bg-yellow-500/20 border-yellow-500 text-yellow-400' 
                      : twinTheme === 'toxic'
                        ? 'bg-[#1a1a1a] border-[#2c302e] text-gray-400 hover:text-white'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                  title="Activar edición de posiciones de máquinas en 3D"
                >
                  <Sliders className="w-3.5 h-3.5" /> {isTwinEditMode ? 'Listo' : 'Ajustes'}
                </button>

                <button 
                  onClick={toggleTwinBlockFullscreen}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl transition-all font-black uppercase tracking-widest text-[9px] ${
                    isTwinBlockFullscreen 
                      ? twinTheme === 'toxic'
                        ? 'bg-[#84cc16]/25 border-[#84cc16] text-[#84cc16] font-extrabold shadow-[0_0_10px_rgba(132,204,22,0.25)]'
                        : 'bg-[#00F0FF]/25 border-[#00F0FF] text-[#00F0FF] font-extrabold shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                      : twinTheme === 'toxic'
                        ? 'bg-[#1a1a1a] border-[#2c302e] text-gray-400 hover:text-white hover:border-[#84cc16]/40'
                        : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                  }`}
                  title={isTwinBlockFullscreen ? "Salir de Pantalla Completa" : "Editar en Pantalla Completa"}
                >
                  {isTwinBlockFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                  <span>{isTwinBlockFullscreen ? 'Ventana' : 'Pantalla Completa'}</span>
                </button>

                <button 
                  onClick={handleSyncFromFlowDesigner}
                  className={`flex items-center justify-center p-2 border rounded-xl transition-all ${
                    twinTheme === 'toxic'
                      ? 'bg-[#1a1a1a] border-[#2c302e] text-gray-400 hover:text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                  }`}
                  title="Restablecer posiciones originales"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>

                <button 
                  onClick={handleAnchorToSimulator}
                  disabled={isAnchoring}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl transition-all font-black uppercase tracking-widest text-[9px] ${
                    isAnchoring
                      ? 'bg-green-500/10 border-green-500/30 text-green-400 opacity-70 cursor-wait'
                      : isAnchored
                        ? twinTheme === 'toxic'
                          ? 'bg-lime-500/25 border-lime-400 text-lime-300 font-extrabold shadow-[0_0_10px_rgba(132,204,22,0.25)]'
                          : 'bg-green-500/20 border-green-500 text-green-400 font-extrabold shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                        : twinTheme === 'toxic'
                          ? 'bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 border border-lime-500/30'
                          : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30'
                  }`}
                  title="Guardar posiciones en este simulador"
                >
                  <Check className="w-3.5 h-3.5" /> {isAnchoring ? 'Guardando...' : 'Anclado'}
                </button>
              </div>
            </div>

            {/* Panel de Ajustes del Twin / Fichas de Movimiento */}
            {isTwinEditMode && (
              <div className="mb-4 p-4 rounded-xl bg-black/40 border border-white/5 backdrop-blur-md space-y-4 mx-6 mt-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                  {/* Altura de Fichas Slider */}
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                      <span>Altura de Fichas de Movimiento:</span>
                      <span className="text-[#00F0FF]">{twinLabelHeightOffset.toFixed(1)} m</span>
                    </div>
                    <input 
                      type="range" 
                      min="-2.0" 
                      max="5.0" 
                      step="0.1" 
                      value={twinLabelHeightOffset} 
                      onChange={(e) => setTwinLabelHeightOffset(Number(e.target.value))}
                      className="w-full h-1.5 bg-[#222] rounded-lg appearance-none cursor-pointer accent-[#00F0FF]"
                    />
                  </div>

                  {/* Mostrar/Colapsar Fichas Toggle */}
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Modo Compacto:</span>
                    <button 
                      onClick={() => setTwinLabelsCollapsed(!twinLabelsCollapsed)}
                      className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all ${
                        twinLabelsCollapsed 
                          ? 'bg-[#00F0FF]/20 border-[#00F0FF] text-[#00F0FF]' 
                          : 'bg-white/5 border-white/10 text-gray-400'
                      }`}
                    >
                      {twinLabelsCollapsed ? 'Activado' : 'Desactivado'}
                    </button>
                  </div>
                </div>

                {/* ── Elevación del Piso del Modelo 3D + Candado ── */}
                {twinLayout && (
                  <div className="border-t border-white/5 pt-3 space-y-1.5">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                      <span className={`${twinFloorLocked ? 'text-yellow-400' : 'text-gray-400'}`}>
                        {twinFloorLocked ? '🔒' : '📐'} Elevación del Piso:
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[#00F0FF] tabular-nums">{twinFloorElevation.toFixed(1)} m</span>
                        <button
                          onClick={() => setTwinFloorLocked(l => !l)}
                          className={`p-1.5 rounded-lg border text-[10px] transition-all ${
                            twinFloorLocked
                              ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-400'
                              : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:border-white/30'
                          }`}
                          title={twinFloorLocked ? 'Desbloquear elevación del piso' : 'Bloquear elevación del piso'}
                        >
                          {twinFloorLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                        </button>
                      </div>
                    </div>
                    <input 
                      type="range" 
                      min="-10.0" 
                      max="10.0" 
                      step="0.1" 
                      value={twinFloorElevation} 
                      onChange={(e) => { 
                        if (!twinFloorLocked) { 
                          setTwinFloorElevation(Number(e.target.value)); 
                          setIsAnchored(false); 
                        } 
                      }}
                      disabled={twinFloorLocked}
                      className={`w-full h-1.5 rounded-lg appearance-none transition-opacity ${
                        twinFloorLocked 
                          ? 'bg-yellow-900/30 cursor-not-allowed opacity-50 accent-yellow-500' 
                          : 'bg-[#222] cursor-pointer accent-[#00F0FF]'
                      }`}
                    />
                    <p className="text-[9px] text-gray-600 italic">
                      {twinFloorLocked 
                        ? '🔒 Elevación bloqueada. Haz clic en el candado para ajustar de nuevo.' 
                        : '📐 Desliza para encontrar la altura correcta, luego bloquea con el candado.'}
                    </p>
                  </div>
                )}

                {/* ── Lista de Fichas / Equipos ───────────────────────── */}
                <div className="border-t border-white/5 pt-3 space-y-2">
                  <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider flex items-center justify-between">
                    <span>Equipos en el Twin:</span>
                    <div className="flex gap-2">
                      <button
                        className="flex items-center gap-1 px-2 py-1 bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 rounded-lg text-[9px] font-black uppercase transition-all opacity-50 cursor-not-allowed"
                        title="Fichas automáticas del simulador"
                        disabled
                      >
                        <Plus className="w-3 h-3" /> Ficha
                      </button>
                      <button
                        className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-[9px] font-black uppercase transition-all opacity-50 cursor-not-allowed"
                        title="Conectores de flujo automáticos"
                        disabled
                      >
                        <Link2 className="w-3 h-3" /> Conector
                      </button>
                    </div>
                  </div>

                  {/* Lista de fichas existentes */}
                  <div className="flex flex-wrap gap-1.5">
                    {twinNodes.map((node) => (
                      <div
                        key={node.id}
                        className={`flex items-center rounded-lg border overflow-hidden transition-all ${
                          selectedTwinNodeId === node.id
                            ? 'border-[#00F0FF] bg-[#00F0FF]/15'
                            : 'border-[#252525] bg-[#111] hover:border-[#333]'
                        }`}
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full mx-1.5 flex-shrink-0"
                          style={{ backgroundColor: node.data?.color || '#00F0FF' }}
                        />
                        <button
                          onClick={() => setSelectedTwinNodeId(selectedTwinNodeId === node.id ? null : node.id)}
                          className={`py-1.5 px-3 text-[10px] font-medium transition-colors ${
                            selectedTwinNodeId === node.id ? 'text-white font-bold' : 'text-gray-400 hover:text-white'
                          }`}
                          title="Seleccionar para mover en 3D"
                        >
                          {node.data?.label || node.data?.type || 'Equipo'}
                        </button>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-600 italic">
                    💡 Clic en nombre → mover en 3D
                  </p>
                </div>
              </div>
            )}

            {/* Canvas 3D Viewer */}
            <div className={`relative overflow-hidden ${isTwinBlockFullscreen ? 'flex-1 rounded-none border-none' : 'h-[360px] w-full rounded-b-3xl border-t border-[#1d1d24]'} ${twinTheme === 'toxic' ? 'bg-[#0c0d0e]' : twinTheme === 'blueprint' ? 'bg-[#edf4f9]' : 'bg-[#05070f]'}`}>
              <SharedTwinViewer3D 
                storagePrefix="sim_carrier_"
                height={isTwinBlockFullscreen ? "calc(100vh - 280px)" : "360px"} 
                customNodes={twinNodes}
                customEdges={twinEdges}
                customLayout={twinLayout ? { ...twinLayout, elevation: twinFloorElevation } : null}
                editMode={isTwinEditMode}
                selectedNodeId={selectedTwinNodeId}
                onSelectNode={setSelectedTwinNodeId}
                onUpdateNode={handleUpdateTwinNode}
                labelHeightOffset={twinLabelHeightOffset}
                labelsCollapsed={twinLabelsCollapsed}
                showControls={!isTwinEditMode}
                theme={twinTheme}
                onThemeChange={setTwinTheme}
              />

              <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5 select-none pointer-events-none no-print">
                <MousePointer className="w-3 h-3 text-[#00F0FF]" />
                Click + arrastrar para orbitar | Scroll para zoom
              </div>
            </div>
          </section>

          {/* 10. DIAGRAMA DE ICONOS E INTERACTIVO */}
          <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] print-card">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-[#1b1b22] pb-3">
              <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-cyan-400" />
                Esquema Secuencial de Flujo
              </h2>
              <div className="flex flex-wrap items-center gap-3 no-print">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider bg-gray-950 px-2.5 py-1 rounded-full border border-gray-800/60">
                  💡 Arrastra y suelta para reordenar la secuencia | Click para configurar
                </span>
                <button
                  onClick={() => setIsLibraryModalOpen(true)}
                  className="px-3.5 py-1.5 bg-[#00F0FF]/15 border border-[#00F0FF]/30 hover:bg-[#00F0FF] hover:text-black text-[#00F0FF] text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(0,240,255,0.1)]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Librería de Equipos
                </button>
                <button
                  onClick={() => setIsSandboxOpen(true)}
                  className="px-3.5 py-1.5 bg-purple-500/10 border border-purple-500/35 hover:bg-purple-500 hover:text-black text-purple-400 text-[9px] font-black uppercase tracking-wider rounded-xl transition-all flex items-center gap-1.5 shadow-[0_0_15px_rgba(139,92,246,0.15)]"
                >
                  <Cpu className="w-3.5 h-3.5" />
                  Sandbox Pandora
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {modulos.map((m, idx) => {
                const color = getModuloColor(m.id);
                const IconComponent = getModuloIcon(m.id);
                const indexStr = String(idx + 1).padStart(2, '0');
                const isTrituradoraSobrecarga = m.id === 'trituradora' && calculos.alertaSobrecarga;
                const isMolinoPolvo = m.id === 'molino' && m.activo && !extractorPolvoActivo;
                const hasWarning = isTrituradoraSobrecarga || isMolinoPolvo;

                const isDragOver = dragOverIndex === idx;
                const borderColor = isDragOver 
                  ? '#00f0ff' 
                  : (m.activo ? (hasWarning ? '#ef4444' : color) : '#1d1d24');
                
                const shadowGlow = isDragOver
                  ? '0 0 20px rgba(0, 240, 255, 0.4), inset 0 0 10px rgba(0, 240, 255, 0.2)'
                  : (m.activo 
                      ? (hasWarning 
                          ? '0 0 14px rgba(239, 68, 68, 0.25), inset 0 0 8px rgba(239, 68, 68, 0.1)' 
                          : `0 0 14px ${color}20, inset 0 0 8px ${color}10`)
                      : 'none');

                return (
                  <div 
                    key={m.id}
                    draggable="true"
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDragEnd={handleDragEnd}
                    onDrop={(e) => handleDrop(e, idx)}
                    onClick={() => setEditingModuloId(m.id)}
                    className={`p-4 rounded-2xl border bg-gradient-to-br from-[#0c0c12] to-[#12121b] transition-all duration-300 hover:scale-[1.03] cursor-grab active:cursor-grabbing group flex flex-col justify-between min-h-[140px] ${
                      isDragOver ? 'scale-[1.05] z-10' : ''
                    }`}
                    style={{
                      borderColor: borderColor,
                      boxShadow: shadowGlow,
                    }}
                  >
                    <div>
                      {/* Top row: Number and Icon */}
                      <div className="flex items-center justify-between mb-2">
                        <span 
                          className="text-lg font-black tracking-tighter"
                          style={{ color: m.activo ? color : '#4b5563' }}
                        >
                          {indexStr}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              duplicateModulo(m.id);
                            }}
                            className="p-1.5 rounded-lg bg-cyan-950/40 border border-cyan-900/40 hover:bg-cyan-500 hover:text-black text-cyan-400 transition-all opacity-0 group-hover:opacity-100 no-print"
                            title="Duplicar equipo"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`¿Está seguro de que desea eliminar el equipo "${m.nombre}" de la secuencia?`)) {
                                removeModulo(m.id);
                              }
                            }}
                            className="p-1.5 rounded-lg bg-red-950/40 border border-red-900/40 hover:bg-red-500 hover:text-black text-red-400 transition-all opacity-0 group-hover:opacity-100 no-print"
                            title="Eliminar equipo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div 
                            className="p-1.5 rounded-lg bg-gray-950/80 border transition-colors group-hover:border-white/20"
                            style={{ 
                              borderColor: m.activo ? `${color}40` : '#1f2937',
                              color: m.activo ? color : '#4b5563'
                            }}
                          >
                            <IconComponent className="w-4 h-4" />
                          </div>
                        </div>
                      </div>

                      {/* Title */}
                      <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest leading-none mb-1">
                        QUANTICO
                      </div>
                      <div className="text-xs font-black text-white uppercase tracking-wide leading-tight group-hover:text-cyan-400 transition-colors">
                        {m.nombre}
                      </div>
                    </div>

                    {/* Specs / indicators at the bottom */}
                    <div className="mt-4 pt-2 border-t border-white/5 space-y-1">
                      {m.activo ? (
                        <>
                          <div className="flex items-center justify-between text-[9px] text-gray-400 font-semibold">
                            <span>CAPACIDAD:</span>
                            <span className="font-bold text-white">{m.capacidadNominal} kg/h</span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-gray-400 font-semibold">
                            <span>POTENCIA:</span>
                            <span className="font-bold text-white">{m.potenciaInstalada} kW</span>
                          </div>
                          <div className="flex items-center justify-between text-[9px] text-emerald-400 font-bold">
                            <span>PRECIO:</span>
                            <span>{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(m.precioVenta ?? 0)}</span>
                          </div>
                          {m.ocupaAire && (
                            <div className="flex items-center justify-between text-[9px] text-blue-400 font-bold">
                              <span className="flex items-center gap-0.5"><Wind className="w-2.5 h-2.5" /> AIRE:</span>
                              <span>{m.caudalAireM3Min} m³/m</span>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="text-[10px] text-gray-600 font-black tracking-widest text-center py-1 uppercase">
                          INACTIVO
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* 4. CONFIGURACIÓN DE LOS MÓDULOS DEL PROCESO */}
          <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] no-print">
            <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
              <Cpu className="w-4 h-4 text-blue-400" />
              4. Módulos y Equipos del Proceso
            </h2>
            
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {modulos.map((m) => {
                const isTrituradoraAlerta = m.id === 'trituradora' && calculos.alertaSobrecarga;
                
                return (
                  <div 
                    key={m.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      m.activo 
                        ? isTrituradoraAlerta 
                          ? "bg-red-950/10 border-red-500/40" 
                          : "bg-gray-900/50 border-[#222]" 
                        : "bg-gray-950/20 border-transparent opacity-60"
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-[240px]">
                      <input 
                        type="checkbox" 
                        checked={m.activo}
                        onChange={() => toggleModulo(m.id)}
                        className="w-4 h-4 rounded accent-cyan-500 bg-gray-800 border-gray-700"
                      />
                      <div>
                        <span className="text-sm font-bold text-white block">{m.nombre}</span>
                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block">{m.comentarioRiesgo}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Potencia (kW):</span>
                        <input 
                          type="number"
                          value={m.potenciaInstalada}
                          disabled={!m.activo}
                          onChange={(e) => setPotenciaModulo(m.id, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-gray-950 border border-gray-800 hover:border-gray-600 focus:border-cyan-500 rounded-lg px-2 py-1 text-xs font-black text-center text-white disabled:opacity-40"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Capacidad (kg/h):</span>
                        <input 
                          type="number"
                          value={m.capacidadNominal}
                          disabled={!m.activo}
                          onChange={(e) => setCapacidadModulo(m.id, parseInt(e.target.value) || 0)}
                          className="w-20 bg-gray-950 border border-gray-800 hover:border-gray-600 focus:border-cyan-500 rounded-lg px-2 py-1 text-xs font-black text-center text-white disabled:opacity-40"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Precio ($):</span>
                        <input 
                          type="number"
                          value={m.precioVenta ?? 0}
                          disabled={!m.activo}
                          onChange={(e) => setPrecioModulo(m.id, parseInt(e.target.value) || 0)}
                          className="w-24 bg-gray-950 border border-gray-800 hover:border-gray-600 focus:border-cyan-500 rounded-lg px-2 py-1 text-xs font-black text-center text-white disabled:opacity-40"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>

      </div>

      {/* SECCIÓN INFERIOR: GRÁFICAS Y ANÁLISIS COMPLEMENTARIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        
        {/* GRÁFICAS RECHARTS */}
        <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] no-print">
          <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
            <Activity className="w-4 h-4 text-cyan-400" />
            Balance Operativo de la Línea (kg/h)
          </h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartBalanceCargaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 41, 59, 0.4)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight="bold" />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f0f13', borderColor: '#1d1d24', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#fff' }}
                />
                <Bar dataKey="Masa kg/h" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  <Cell fill="#00F0FF" />
                  <Cell fill={calculos.alertaSobrecarga ? "#f43f5e" : "#10b981"} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* GRÁFICA DE POTENCIAS POR EQUIPO */}
        <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] no-print">
          <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            Distribución de Potencia de Módulos Activos (kW)
          </h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={modulos.filter(m => m.activo && m.potenciaInstalada > 0).map(m => ({ name: m.nombre, 'Potencia (kW)': m.potenciaInstalada }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 41, 59, 0.4)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f0f13', borderColor: '#1d1d24', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#fff' }}
                />
                <Bar dataKey="Potencia (kW)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

      </div>

      {/* DIAGNÓSTICOS, RECOMENDACIONES Y RESULTADOS */}
      {/* PANDORA COGNITIVE AI PROCESS DIAGNOSTIC & AUDIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-8">
        
        {/* PANELA: AUDITORÍA Y DIAGNÓSTICO COGNITIVO (2 columnas) */}
        <section className="lg:col-span-2 p-6 rounded-3xl bg-gradient-to-br from-[#0c0c14] to-[#11111d] border border-purple-500/25 shadow-[0_0_30px_rgba(139,92,246,0.08)] flex flex-col justify-between print-card">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1b1b22] pb-4 mb-4">
              <h2 className="text-sm font-black uppercase tracking-widest text-white flex items-center gap-2">
                <Cpu className="w-5 h-5 text-purple-400 animate-pulse" />
                Auditoría Cognitiva Pandora AI (v8.00)
              </h2>
              <span className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-wider border transition-all ${
                aiProcessAnalysis.isSequenceCorrect
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]"
                  : "bg-amber-500/10 text-amber-400 border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]"
              }`}>
                {aiProcessAnalysis.statusText}
              </span>
            </div>

            {/* AI Synthesized Executive Summary */}
            <div className="mb-4">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-1.5">Conclusiones Escritas (Resumen Ejecutivo)</span>
              <p className="text-xs font-semibold text-gray-300 leading-relaxed bg-black/40 border border-white/5 rounded-2xl p-4 italic">
                "{aiProcessAnalysis.diagnosticoTermico}"
              </p>
            </div>

            {/* Trace List of Anomalies */}
            <div className="space-y-3">
              <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block">Trazado de Anomalías en Secuencia</span>
              {aiProcessAnalysis.diagnosticoTrace.length > 0 && aiProcessAnalysis.diagnosticoTrace[0] !== "No hay equipos activos en la línea de flujo." ? (
                <ul className="space-y-2.5">
                  {aiProcessAnalysis.diagnosticoTrace.map((d, idx) => (
                    <li 
                      key={idx} 
                      className="flex items-start gap-2.5 p-3 rounded-2xl bg-red-950/15 border border-red-500/25 text-xs font-bold text-red-300 leading-normal"
                    >
                      <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                      {d}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex items-center gap-3 p-4 rounded-2xl bg-emerald-950/15 border border-emerald-500/25 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                  La secuencia física de equipos respeta las reglas de granulometría y transporte del cobre.
                </div>
              )}
            </div>
          </div>

          {/* Solutions / Engineering Actions */}
          <div className="mt-6 border-t border-white/5 pt-4">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest block mb-2">Acciones de Ingeniería Correctivas</span>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {aiProcessAnalysis.soluciones.map((rec, idx) => (
                <li 
                  key={idx} 
                  className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-950/80 border border-gray-900 text-[11px] font-semibold text-gray-400 leading-normal"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5"></span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* COLUMNA DERECHA: CONCLUSIONES Y OPERACIÓN */}
        <div className="space-y-8 flex flex-col justify-start">
          
          {/* PANEL B: CONCLUSIONES NUMÉRICAS Y BALANCE OPERATIVO */}
          <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] flex flex-col justify-between print-card">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
                <Info className="w-4 h-4 text-cyan-400" />
                Conclusiones Numéricas
              </h2>
              
              <div className="space-y-4">
                {/* BottleNeck */}
                <div className="p-3.5 bg-gray-950 border border-gray-900 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Cuello de Botella</span>
                    <span className="text-xs font-black text-white">{aiProcessAnalysis.flowBottleneck}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Capacidad</span>
                    <span className="text-xs font-black text-cyan-400">{aiProcessAnalysis.bottleneckCapacity} kg/h</span>
                  </div>
                </div>

                {/* Coupling Efficiency */}
                <div className="p-3.5 bg-gray-950 border border-gray-900 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Eficiencia del Acoplamiento</span>
                    <span className="text-[9px] text-gray-400">Variabilidad de capacidad en línea</span>
                  </div>
                  <div className="text-right">
                    <span className={`text-sm font-black ${
                      aiProcessAnalysis.couplingEfficiency > 90 ? "text-emerald-400" : aiProcessAnalysis.couplingEfficiency > 75 ? "text-amber-400" : "text-red-400"
                    }`}>
                      {aiProcessAnalysis.couplingEfficiency.toFixed(1)}%
                    </span>
                  </div>
                </div>

                {/* Specific Energy consumption */}
                <div className="p-3.5 bg-gray-950 border border-gray-900 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Consumo Específico de Energía</span>
                    <span className="text-[9px] text-gray-400">Densidad de potencia instalada</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-black text-white">
                      {aiProcessAnalysis.specificPowerIndex.toFixed(3)} <span className="text-[9px] text-gray-500 font-bold">kW/(kg/h)</span>
                    </span>
                  </div>
                </div>

                {/* Pneumatics requirements */}
                <div className="p-3.5 bg-gray-950 border border-gray-900 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Carga Neumática Consolidada</span>
                    <span className="text-[9px] text-gray-400">Demanda total de aire comprimido</span>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className="text-xs font-black text-blue-400">
                      {calculos.aireRequeridoTotalM3Min.toFixed(2)} m³/min
                    </span>
                    <span className="text-[8px] text-gray-500 font-black">
                      @{calculos.presionAireMaximaBar.toFixed(1)} Bar
                    </span>
                  </div>
                </div>

                {/* Total Active Investment */}
                <div className="pt-3.5 border-t border-white/5 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-gray-500 block uppercase font-bold">Inversión de Equipos Simulado</span>
                    <span className="text-[9px] text-gray-400">Suma total de venta (módulos activos)</span>
                  </div>
                  <div className="text-right">
                    <span className="text-base font-black text-emerald-400 tracking-wider">
                      {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(calculos.precioVentaTotalUSD)} USD
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {calculos.alertaSobrecarga && (
              <div className="mt-4 p-3.5 rounded-2xl bg-red-950/20 border border-red-500/30 flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
                <div className="text-[10px] font-bold text-red-300 leading-normal">
                  ¡ALERTA DE FLUJO!: La alimentación de entrada ({Math.round(calculos.capacidadRequeridaKgH)} kg/h) supera el cuello de botella. Se producirá atascamiento.
                </div>
              </div>
            )}
          </section>

          {/* PANEL C: PANORAMAS Y DISPONIBILIDAD OPERATIVA */}
          <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] flex flex-col justify-between print-card">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
                <TrendingUp className="w-4 h-4 text-cyan-400" />
                Panoramas y Operación
              </h2>
              
              <div className="space-y-4">
                {/* Panorama Activo */}
                <div className="p-4 rounded-2xl bg-gray-950 border border-[#1d1d24]">
                  <span className="text-[10px] text-gray-500 block uppercase font-bold mb-1">Panorama de Capacidad Activo</span>
                  <span className={`text-xs font-black block mb-1.5 ${calculos.panoramaClass}`}>{calculos.panoramaLabel}</span>
                  <p className="text-[10px] text-gray-400 leading-relaxed">{calculos.panoramaDesc}</p>
                </div>

                {/* Comparación Capacidad */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gray-950/60 border border-gray-900 rounded-xl">
                    <span className="text-[9px] text-gray-500 block uppercase font-bold">Capacidad Real</span>
                    <span className="text-xs font-black text-white">{Math.round(calculos.capacidadRealLinea)} kg/h</span>
                  </div>
                  <div className="p-3 bg-gray-950/60 border border-gray-900 rounded-xl">
                    <span className="text-[9px] text-gray-500 block uppercase font-bold">Objetivo Diseñador</span>
                    <span className="text-xs font-black text-cyan-400">{calculos.capacidadObjetivoKgH} kg/h</span>
                  </div>
                </div>

                {/* Detalle por Turno */}
                <div className="p-3.5 bg-gray-950/40 border border-gray-900/60 rounded-2xl space-y-2.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Turnos de Trabajo:</span>
                    <span className="font-bold text-white">{turnosTrabajo} turno(s) ({turnosTrabajo * 8}h)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Operadores Asignados:</span>
                    <span className="font-bold text-white">{numeroOperadores} operario(s)</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Horas Reales/Turno:</span>
                    <span className="font-bold text-white">{calculos.horasRealesPorTurno.toFixed(2)} hrs</span>
                  </div>
                  <div className="flex justify-between items-center text-xs border-t border-white/5 pt-2">
                    <span className="text-gray-400 font-medium">Producción por Turno:</span>
                    <span className="font-black text-emerald-400">{Math.round(calculos.produccionRealTurnoKg).toLocaleString()} kg/turno</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-400 font-medium">Producción Diaria Total:</span>
                    <span className="font-black text-emerald-400">{Math.round(calculos.produccionRealDiaKg).toLocaleString()} kg/día</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

        </div>

      </div>

      {/* 8. TABLA DE RESULTADOS COMPLETOS */}
      <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] mt-8 print-card">
        <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
          <Layers className="w-4 h-4 text-blue-400" />
          8. Matriz de Resultados Técnicos Consolidados
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1b1b22] text-gray-400 uppercase text-[10px] font-black tracking-wider">
                <th className="py-3 px-4">Variable del Sistema</th>
                <th className="py-3 px-4">Valor Simulado</th>
                <th className="py-3 px-4">Unidad</th>
                <th className="py-3 px-4">Comentario de Ingeniería</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171720] font-semibold text-gray-300">
              
              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Área metálica del tubo</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.areaMetalicaM2.toFixed(8)}</td>
                <td className="py-3.5 px-4 text-gray-500">m²</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Sección neta del material conductor de cobre.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Peso por metro</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.pesoMetroKgM.toFixed(4)}</td>
                <td className="py-3.5 px-4 text-gray-500">kg/m</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Carga de gravedad unitaria lineal para transporte y esfuerzos.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Coeficiente de fricción (μ)</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{coefFriccion.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-gray-500">adimensional</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Coeficiente según interfaz de contacto ({materialGuia === 'acero_seco' ? 'Cobre sobre Acero Seco' : materialGuia === 'acero_lubricado' ? 'Cobre sobre Acero Lubricado' : 'Cobre sobre PTFE'}).</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Fuerza de fricción de arrastre</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.fuerzaFriccionTotalN.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-gray-500">N</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Esfuerzo longitudinal resistivo de las piezas en la guía deslizante.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Potencia perdida por fricción</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.potenciaFriccionKw.toFixed(4)}</td>
                <td className="py-3.5 px-4 text-gray-500">kW</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Potencia requerida únicamente para superar las pérdidas por deslizamiento.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Longitud total estimada</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.longitudTotalM.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-gray-500">m</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Distancia lineal total de tubería procesada por hora.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Tiempo de procesamiento base</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.tiempoDesbobinadoMin.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-gray-500">minutos</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Tiempo de ciclo base operativo para análisis de lote continuo.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Capacidad requerida</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.capacidadRequeridaKgH.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-gray-500">kg/h</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Rendimiento continuo mínimo para procesar el flujo de piezas.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Capacidad máxima requerida</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.capacidadMaximaLinea}</td>
                <td className="py-3.5 px-4 text-gray-500">kg/h</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Capacidad objetivo solicitada para el dimensionamiento del proceso.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Consumo nominal proyectado</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.consumoNominalProyectadoKw.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-gray-500">kW</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Consumo eléctrico estimado en base al factor de carga y flujo de material requerido.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Eficiencia global de operación</td>
                <td className="py-3.5 px-4 font-mono text-emerald-400 font-bold">{calculos.eficienciaGlobalLinea.toFixed(1)}%</td>
                <td className="py-3.5 px-4 text-gray-500">%</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Porcentaje de aprovechamiento de la línea respecto a la demanda requerida.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Fuerza de corte estimada</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">
                  {calculos.fuerzaCorteKN.toFixed(2)} / {calculos.fuerzaCorteTon.toFixed(2)}
                </td>
                <td className="py-3.5 px-4 text-gray-500">kN / tonf</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Capacidad de fuerza perpendicular neta que la cizalla rotativa debe aplicar.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Torque rodillo alimentador</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.torqueSeguroNm.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-gray-500">N·m</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Par de torsión seguro necesario para el arrastre y empuje de piezas (F.S. 1.5).</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Potencia rodillo alimentador</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.potenciaMecanicaDesbobinadoKw.toFixed(4)}</td>
                <td className="py-3.5 px-4 text-gray-500">kW</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Demanda útil mecánica en el árbol del motor de arrastre.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Potencia instalada total</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.potenciaInstaladaTotalKw.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-gray-500">kW</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Suma total de acometida eléctrica consumida por todos los módulos activos.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Cuello de botella</td>
                <td className="py-3.5 px-4 font-bold text-white">{calculos.cuelloBotellaModulo}</td>
                <td className="py-3.5 px-4 text-gray-500">Módulo</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Punto restrictivo del sistema con la menor velocidad/capacidad nominal.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Índice de riesgo</td>
                <td className="py-3.5 px-4 font-mono text-red-400">{calculos.scoreRiesgo} / 100</td>
                <td className="py-3.5 px-4 text-gray-500">Score</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">
                  Evaluación ponderada de riesgos operativos (Velocidades, dancer inactivo, etc.).
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </section>

      <footer className="mt-16 text-center text-xs text-gray-600 font-semibold uppercase tracking-widest no-print">
        Carrier Corp. Industrial Design Suite © 2026 - PANDORA 3.0 Platform
      </footer>

      {/* --- PORTAL DE DISEÑOS DEL GEMELO --- */}
      <FlowDesignsLibrary 
        isOpen={isDesignsLibraryOpen}
        onClose={() => setIsDesignsLibraryOpen(false)}
        onLoad={handleLoadDesignFromLibrary}
        onNewDesign={() => {
          alert("Para diseñar planos tridimensionales detallados, accede al modulo Flow Designer en el panel izquierdo.");
          setIsDesignsLibraryOpen(false);
        }}
        currentDesignId={currentDesignId}
        activeLayout={twinLayout}
        onLayoutChange={setTwinLayout}
      />

      {/* ── Modal: Nombrar y Guardar Modelo 3D Subido ─────────────── */}
      {pendingUpload && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0c14]/95 backdrop-blur-2xl shadow-2xl overflow-hidden" style={{ boxShadow: '0 8px 32px 0 rgba(0,240,255,0.15)' }}>
            {/* Header */}
            <div className="px-6 py-4 border-b border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/20 flex items-center justify-center">
                <Upload className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Guardar en Librería</h3>
                <p className="text-[10px] text-gray-500">El modelo se guardará en la nube y quedará disponible desde cualquier simulador.</p>
              </div>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Info del archivo */}
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                <div className="text-2xl">
                  {pendingUpload.processedResult?.type === 'fbx' ? '🏭' 
                  : pendingUpload.processedResult?.type === 'glb' || pendingUpload.processedResult?.type === 'gltf' ? '📦'
                  : '🗂️'}
                </div>
                <div>
                  <p className="text-xs font-bold text-white truncate max-w-[240px]">{pendingUpload.file?.name}</p>
                  <p className="text-[10px] text-gray-500">
                    {(pendingUpload.file?.size / 1024 / 1024).toFixed(2)} MB · {pendingUpload.processedResult?.type?.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Progreso de subida */}
              {isSavingToCloud && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-[#00F0FF]">
                    <span>Progreso de Subida</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-white/5 border border-white/10 overflow-hidden relative">
                    <div 
                      className="h-full rounded-full bg-gradient-to-r from-blue-500 to-[#00F0FF] transition-all duration-300 shadow-[0_0_10px_rgba(0,240,255,0.4)]"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                  <p className="text-[9px] text-gray-500">Subiendo archivo grande a Supabase... por favor no cierres esta pestaña.</p>
                </div>
              )}

              {/* Campo de nombre */}
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF]">
                  Nombre del Modelo / Planta
                </label>
                <input
                  type="text"
                  value={uploadModelName}
                  onChange={e => setUploadModelName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleConfirmUploadToLibrary(); if (e.key === 'Escape') handleCancelUpload(); }}
                  placeholder="Ej: Planta Carrier"
                  autoFocus
                  className="w-full bg-[#111] border border-[#2a2a2a] focus:border-[#00F0FF]/60 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none transition-colors"
                />
                <p className="text-[9px] text-gray-600">Este nombre aparecerá en la Librería de Twins para identificarlo fácilmente.</p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 pb-5 flex gap-3">
              <button
                onClick={handleConfirmUploadToLibrary}
                disabled={isSavingToCloud || !uploadModelName.trim()}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-[#00F0FF] hover:bg-[#00d8e8] disabled:opacity-50 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all"
              >
                {isSavingToCloud ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Guardando... {uploadProgress}%</>
                ) : (
                  <><Check className="w-4 h-4" /> Guardar en Librería</>
                )}
              </button>
              <button
                onClick={handleCancelUpload}
                disabled={isSavingToCloud}
                className="px-4 py-3 bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 text-xs uppercase tracking-widest rounded-xl transition-all"
              >
                {isSavingToCloud ? 'Esperando...' : 'Cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- BARRA FLOTANTE DE EXPORTACIÓN INFERIOR --- */}
      {!isReportModalOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-5 pointer-events-none no-print">
          <div className="pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-2xl bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mr-1">Exportar</span>
            <button
              onClick={exportarCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition-all text-xs font-bold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-green-400" />
              CSV
            </button>
            <button
              onClick={exportarExcel}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition-all text-xs font-bold"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-teal-400" />
              Excel
            </button>
            <div className="w-[1px] h-4 bg-white/10" />
            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 hover:bg-cyan-500/20 text-cyan-400 transition-all text-xs font-black uppercase tracking-widest"
            >
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
              Ver Informe
            </button>
            <button
              onClick={handlePrintFromMain}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-[#00cbd6] text-black hover:opacity-90 transition-all text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(20,184,166,0.35)]"
            >
              <Printer className="w-3.5 h-3.5 text-black" />
              Exportar PDF
            </button>
          </div>
        </div>
      )}

      {/* Loader de Progreso de Generación de PDF */}
      {isGeneratingPdf && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="bg-[#0b0c10] border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl space-y-6">
            <RefreshCw className="w-12 h-12 text-teal-400 animate-spin mx-auto" />
            <div>
              <h4 className="text-lg font-black text-white uppercase tracking-wider">Generando PDF Oficial</h4>
              <p className="text-xs text-gray-400 mt-2 font-medium">Renderizando páginas en alta fidelidad A4...</p>
            </div>
            
            {/* Barra de Progreso */}
            <div className="w-full bg-slate-900 rounded-full h-3.5 border border-slate-800 overflow-hidden relative">
              <div 
                className="bg-gradient-to-r from-teal-500 to-cyan-500 h-full transition-all duration-300 rounded-full" 
                style={{ width: `${pdfProgress}%` }}
              />
            </div>
            
            <div className="flex justify-between items-center text-xs text-gray-500 font-bold tracking-widest uppercase">
              <span>Progreso</span>
              <span className="text-teal-400">{Math.round(pdfProgress)}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Dialogo de Configuración de Exportación */}
      {showExportDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#0b0c10] border border-slate-850 rounded-3xl p-6 shadow-2xl relative">
            <button 
              onClick={() => setShowExportDialog(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-teal-500/10 rounded-xl">
                <Printer className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h3 className="text-md font-black uppercase text-white tracking-wider">Exportar Informe Técnico</h3>
                <p className="text-[10px] text-gray-500 font-medium">Configure los parámetros del documento PDF</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                  Nombre del Archivo PDF
                </label>
                <input
                  type="text"
                  value={exportFileName}
                  onChange={(e) => setExportFileName(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white transition-all"
                  placeholder="Carrier_Report.pdf"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                    Cliente
                  </label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white transition-all"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                    Proyecto
                  </label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white transition-all"
                  />
                </div>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={confirmExportPdf}
                className="flex-1 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 hover:opacity-90 text-black rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(20,184,166,0.2)]"
              >
                Exportar a PDF
              </button>
              <button
                onClick={() => setShowExportDialog(false)}
                className="px-5 py-3 rounded-2xl bg-[#14161f] border border-slate-800 hover:bg-slate-800 text-gray-400 hover:text-white text-xs font-black uppercase tracking-widest transition-all"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL LIBRERÍA DE EQUIPOS */}
      {isLibraryModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-3xl bg-[#0a0a0f] border border-[#00F0FF]/30 p-6 md:p-8 flex flex-col gap-6 relative shadow-[0_0_50px_rgba(0,240,255,0.15)] max-h-[90vh]">
            {/* Botón cerrar */}
            <button 
              onClick={() => setIsLibraryModalOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="p-2.5 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 text-cyan-400">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  LIBRERÍA Y ESPECIFICACIONES DE EQUIPOS
                </h3>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">
                  Gestión integral de módulos para la secuencia Carrier
                </p>
              </div>
            </div>

            {/* Split Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto pr-1 flex-1">
              
              {/* Columna Izquierda (Presets) */}
              <div className="lg:col-span-7 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" />
                    Equipos Preestablecidos de Fábrica
                  </h4>
                  <span className="text-[9px] text-gray-500 font-bold">
                    ({PRESET_MODULOS.length} disponibles)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                  {PRESET_MODULOS.map((preset) => {
                    const color = getModuloColor(preset.id);
                    const IconComponent = getModuloIcon(preset.id);
                    const countInSequence = modulos.filter(m => m.id.startsWith(preset.id)).length;

                    return (
                      <div 
                        key={preset.id}
                        className="p-3.5 rounded-xl border border-gray-900 bg-gray-950/40 hover:border-gray-800 transition-all flex flex-col justify-between gap-3 group relative"
                      >
                        <div>
                          {/* Title and Icon */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span 
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: color }}
                              />
                              <span className="text-xs font-black text-white uppercase tracking-wide group-hover:text-cyan-400 transition-colors">
                                {preset.nombre}
                              </span>
                            </div>
                            <div 
                              className="p-1 rounded-md bg-gray-900 border"
                              style={{ borderColor: `${color}30`, color: color }}
                            >
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                          </div>

                          {/* Quick Specs */}
                          <div className="mt-2.5 flex flex-wrap gap-1.5">
                            <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded text-gray-400 font-semibold">
                              {preset.capacidadNominal} kg/h
                            </span>
                            <span className="text-[8px] bg-white/5 px-2 py-0.5 rounded text-gray-400 font-semibold">
                              {preset.potenciaInstalada} kW
                            </span>
                            {preset.ocupaAire && (
                              <span className="text-[8px] bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-bold">
                                {preset.caudalAireM3Min} m³/m
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Add Button */}
                        <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
                          <span className="text-[9px] text-gray-500 font-bold">
                            {countInSequence > 0 ? (
                              <span className="text-emerald-500 flex items-center gap-1 font-bold">
                                ✓ En secuencia ({countInSequence})
                              </span>
                            ) : (
                              'No instalado'
                            )}
                          </span>
                          <button
                            onClick={() => addModuloPreset(preset)}
                            className="px-2.5 py-1 bg-cyan-500 hover:bg-cyan-400 text-black text-[9px] font-black uppercase tracking-wider rounded-lg transition-all flex items-center gap-1"
                          >
                            <Plus className="w-2.5 h-2.5" />
                            Instalar
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Columna Derecha (Custom Creator) */}
              <form 
                onSubmit={handleCreateCustomModulo}
                className="lg:col-span-5 space-y-4 bg-gray-950/40 p-5 rounded-2xl border border-gray-900/50 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-[#00F0FF] uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />
                    Diseñar Equipo Personalizado
                  </h4>

                  {/* Nombre */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                      Nombre del Módulo
                    </label>
                    <input 
                      type="text"
                      required
                      value={customNombre}
                      onChange={(e) => setCustomNombre(e.target.value)}
                      placeholder="Ej. Banda de Inspección, Balanza..."
                      className="w-full bg-gray-950 border border-gray-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none"
                    />
                  </div>

                  {/* Capacidad, Potencia y Precio de Venta Grid */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                        Capacidad (kg/h)
                      </label>
                      <input 
                        type="number"
                        min="0"
                        value={customCapacidad}
                        onChange={(e) => setCustomCapacidad(parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-950 border border-gray-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                        Potencia Motor (kW)
                      </label>
                      <input 
                        type="number"
                        step="0.1"
                        min="0"
                        value={customPotencia}
                        onChange={(e) => setCustomPotencia(parseFloat(e.target.value) || 0)}
                        className="w-full bg-gray-950 border border-gray-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                        Precio ($ USD)
                      </label>
                      <input 
                        type="number"
                        min="0"
                        value={customPrecioVenta}
                        onChange={(e) => setCustomPrecioVenta(parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-950 border border-gray-800 focus:border-cyan-500 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Aire Comprimido Toggle */}
                  <div className="p-3 rounded-xl bg-gray-950 border border-gray-900 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Wind className="w-3.5 h-3.5 text-blue-400" />
                        Conexión de Aire Comprimido
                      </span>
                      <input 
                        type="checkbox"
                        checked={customOcupaAire}
                        onChange={(e) => setCustomOcupaAire(e.target.checked)}
                        className="w-4 h-4 rounded accent-cyan-500 bg-gray-900 border-gray-800"
                      />
                    </div>

                    {customOcupaAire && (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                        <div>
                          <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">
                            Presión (Bar)
                          </label>
                          <input 
                            type="number"
                            step="0.1"
                            min="0"
                            value={customPresionAire}
                            onChange={(e) => setCustomPresionAire(parseFloat(e.target.value) || 0)}
                            className="w-full bg-gray-900 border border-gray-800 focus:border-cyan-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[8px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">
                            Caudal (m³/min)
                          </label>
                          <input 
                            type="number"
                            step="0.01"
                            min="0"
                            value={customCaudalAire}
                            onChange={(e) => setCustomCaudalAire(parseFloat(e.target.value) || 0)}
                            className="w-full bg-gray-900 border border-gray-800 focus:border-cyan-500 rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Función */}
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                      Función en el Proceso
                    </label>
                    <textarea 
                      value={customFuncion}
                      onChange={(e) => setCustomFuncion(e.target.value)}
                      placeholder="Ej. Realiza el pesaje en línea para validar balance de masa..."
                      className="w-full bg-gray-950 border border-gray-800 focus:border-cyan-500 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none h-14 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 mt-4">
                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-cyan-500 to-[#00F0FF] hover:opacity-90 text-black rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(0,240,255,0.2)]"
                  >
                    + Registrar e Instalar Equipo
                  </button>
                </div>
              </form>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
              <button
                onClick={() => setIsLibraryModalOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-800 text-gray-400 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
              >
                Cerrar Librería
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL SANDBOX PANDORA */}
      {isSandboxOpen && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-5xl rounded-3xl bg-[#08080c] border border-purple-500/30 p-6 md:p-8 flex flex-col gap-6 relative shadow-[0_0_50px_rgba(139,92,246,0.15)] max-h-[90vh]">
            {/* Botón cerrar */}
            <button 
              onClick={() => setIsSandboxOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 border-b border-white/5 pb-4">
              <div className="p-2.5 rounded-2xl border border-purple-500/30 bg-purple-950/20 text-purple-400">
                <Cpu className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  PANDORA PROCESS CONTEXT SANDBOX
                </h3>
                <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">
                  Simulador de Entorno Operacional y Análisis Predictivo AI
                </p>
              </div>
            </div>

            {/* Split Content */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 overflow-y-auto pr-1 flex-1">
              
              {/* Columna Izquierda (Inputs de Contexto) */}
              <div className="lg:col-span-5 space-y-4">
                <h4 className="text-[10px] font-black text-purple-400 uppercase tracking-widest border-b border-white/5 pb-2 flex items-center gap-1.5">
                  <Sliders className="w-3.5 h-3.5" />
                  Variables de Entorno
                </h4>

                {/* Humedad */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                    <span className="text-gray-400">Humedad del Material:</span>
                    <span className="text-purple-400 font-black">{sandboxHumedad}%</span>
                  </div>
                  <input 
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={sandboxHumedad}
                    onChange={(e) => setSandboxHumedad(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#181824] rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                {/* Pureza */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                    <span className="text-gray-400">Pureza de Cobre de Entrada:</span>
                    <span className="text-purple-400 font-black">{sandboxPureza}%</span>
                  </div>
                  <input 
                    type="range"
                    min="80"
                    max="100"
                    step="1"
                    value={sandboxPureza}
                    onChange={(e) => setSandboxPureza(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#181824] rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                {/* Temperatura */}
                <div className="space-y-1">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase">
                    <span className="text-gray-400">Temperatura Operativa:</span>
                    <span className="text-purple-400 font-black">{sandboxTemp}°C</span>
                  </div>
                  <input 
                    type="range"
                    min="10"
                    max="50"
                    step="1"
                    value={sandboxTemp}
                    onChange={(e) => setSandboxTemp(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-[#181824] rounded-lg appearance-none cursor-pointer accent-purple-500"
                  />
                </div>

                {/* Turno */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    Turno de Operación
                  </label>
                  <select 
                    value={sandboxTurno}
                    onChange={(e) => setSandboxTurno(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                  >
                    <option value="Diurno">Turno Diurno (Luz natural, temperatura ambiente templada)</option>
                    <option value="Mixto">Turno Mixto (Transición tarde-noche, humedad variable)</option>
                    <option value="Nocturno">Turno Nocturno (Baja temperatura, mayor humedad condensada)</option>
                  </select>
                </div>

                {/* Prompt contextual */}
                <div className="space-y-1">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">
                    Instrucciones y Notas de Contexto para Pandora AI
                  </label>
                  <textarea 
                    value={sandboxPrompt}
                    onChange={(e) => setSandboxPrompt(e.target.value)}
                    className="w-full bg-gray-950 border border-gray-800 focus:border-purple-500 rounded-lg px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none h-24 resize-none"
                    placeholder="Describe características adicionales del material, velocidad del operario, etc..."
                  />
                </div>

                <button
                  onClick={handleRunSandboxAnalysis}
                  className="w-full py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_15px_rgba(139,92,246,0.3)] flex items-center justify-center gap-2"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${sandboxAnalyzing ? 'animate-spin' : ''}`} />
                  Recalcular Con Pandora
                </button>
              </div>

              {/* Columna Derecha (Output / Reporte Diagnóstico) */}
              <div className="lg:col-span-7 flex flex-col bg-gray-950/40 border border-gray-900 rounded-2xl p-5 md:p-6 justify-between min-h-[350px]">
                {sandboxAnalyzing ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest animate-pulse">
                      Pandora AI está analizando los flujos del proceso...
                    </span>
                  </div>
                ) : sandboxResult ? (
                  <div className="space-y-5 flex-1">
                    <div className="flex items-center justify-between border-b border-white/5 pb-2">
                      <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5" />
                        Resultados de Simulación AI
                      </h4>
                      <span className="text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                        Estable
                      </span>
                    </div>

                    {/* Stats Row */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="p-3 bg-gray-950 border border-gray-900 rounded-xl text-center space-y-1">
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider block">Eficiencia Proyectada</span>
                        <span 
                          className="text-lg font-black block"
                          style={{ color: Number(sandboxResult.eficiencia) > 90 ? '#10b981' : Number(sandboxResult.eficiencia) > 80 ? '#f59e0b' : '#ef4444' }}
                        >
                          {sandboxResult.eficiencia}%
                        </span>
                      </div>
                      <div className="p-3 bg-gray-950 border border-gray-900 rounded-xl text-center space-y-1">
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider block">Potencia Proyectada</span>
                        <span className="text-lg font-black text-white block">
                          {sandboxResult.potenciaProyectada} <span className="text-[9px] font-bold text-gray-400">kW</span>
                        </span>
                      </div>
                      <div className="p-3 bg-gray-950 border border-gray-900 rounded-xl text-center space-y-1">
                        <span className="text-[8px] text-gray-500 font-bold uppercase tracking-wider block">Aire Requerido</span>
                        <span className="text-lg font-black text-blue-400 block">
                          {sandboxResult.aireProyectado} <span className="text-[9px] font-bold text-gray-400">m³/m</span>
                        </span>
                      </div>
                    </div>

                    {/* Consola Diagnóstico */}
                    <div className="space-y-2">
                      <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block">Consola de Diagnóstico Pandora AI</span>
                      <div className="p-4 bg-gray-950 border border-purple-900/30 rounded-xl text-xs font-mono text-gray-300 space-y-3 leading-relaxed max-h-[200px] overflow-y-auto custom-scrollbar">
                        {sandboxResult.diagnostico.split('\n').filter(Boolean).map((line, idx) => {
                          const isWarning = line.includes('⚠️');
                          const isGear = line.includes('⚙️');
                          const isTemp = line.includes('🌡️');
                          const isBolt = line.includes('⚡');
                          const isAir = line.includes('💨');
                          
                          let textColor = "text-gray-300";
                          if (isWarning) textColor = "text-yellow-400";
                          else if (isGear) textColor = "text-orange-400";
                          else if (isTemp) textColor = "text-red-400";
                          else if (isBolt) textColor = "text-purple-400";
                          else if (isAir) textColor = "text-blue-400";
                          else if (line.includes('✅')) textColor = "text-emerald-400";

                          return (
                            <p key={idx} className={`${textColor} border-l-2 pl-2.5 ${isWarning ? 'border-yellow-500/50' : isGear ? 'border-orange-500/50' : isTemp ? 'border-red-500/50' : isBolt ? 'border-purple-500/50' : isAir ? 'border-blue-500/50' : 'border-emerald-500/50'}`}>
                              {line.replace(/• |\*\*|\*/g, '')}
                            </p>
                          );
                        })}
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-500 italic">
                      {sandboxResult.resumen}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col items-center justify-center gap-3 py-10">
                    <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                    <span className="text-xs text-gray-400 font-bold uppercase tracking-widest animate-pulse">
                      Iniciando simulador...
                    </span>
                  </div>
                )}
              </div>

            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-white/5 pt-4">
              <button
                onClick={() => setIsSandboxOpen(false)}
                className="px-5 py-2.5 rounded-xl border border-gray-800 text-gray-400 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
              >
                Cerrar Sandbox
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* MODAL EDICIÓN DE MÓDULO */}
      {editingModuloId && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4 overflow-y-auto">
          {(() => {
            const color = getModuloColor(editingModuloId);
            const IconComponent = getModuloIcon(editingModuloId);

            return (
              <div 
                className="w-full max-w-2xl rounded-3xl bg-[#0a0a0f] border p-6 md:p-8 flex flex-col gap-6 relative shadow-[0_0_50px_rgba(0,0,0,0.8)]"
                style={{ 
                  borderColor: editingColor,
                  boxShadow: `0 0 30px ${editingColor}20`
                }}
              >
                {/* Botón cerrar */}
                <button 
                  onClick={() => setEditingModuloId(null)}
                  className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white hover:bg-white/5 rounded-xl transition-all"
                >
                  <X className="w-5 h-5" />
                </button>

                {/* Header */}
                <div className="flex items-center gap-3">
                  <div 
                    className="p-2.5 rounded-2xl border bg-gray-950"
                    style={{ 
                      borderColor: `${editingColor}40`,
                      color: editingColor 
                    }}
                  >
                    <IconComponent className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">
                      CONFIGURACIÓN DE EQUIPO
                    </h3>
                    <p className="text-[11px] text-gray-500 font-bold uppercase tracking-widest">
                      {editingNombre} • MÓDULO INDUSTRIAL CARRIER
                    </p>
                  </div>
                </div>

                {/* Nombre y Color */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-gray-950/40 border border-gray-900/50">
                  <div className="md:col-span-2">
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                      Nombre del Equipo
                    </label>
                    <input
                      type="text"
                      value={editingNombre}
                      onChange={(e) => setEditingNombre(e.target.value)}
                      className="w-full bg-[#0d0d12] border border-gray-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white placeholder-gray-600 focus:outline-none"
                      placeholder="Ej. Trituradora M1200"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                      Color de Identificación
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={editingColor}
                        onChange={(e) => setEditingColor(e.target.value)}
                        className="w-10 h-8 rounded bg-transparent border-0 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={editingColor}
                        onChange={(e) => setEditingColor(e.target.value)}
                        className="w-full bg-[#0d0d12] border border-gray-800 focus:border-cyan-500 rounded-xl px-2 py-2 text-[10px] text-white focus:outline-none font-mono text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* Form Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Columna Izquierda: Specs y Info */}
                  <div className="space-y-4 bg-gray-950/40 p-5 rounded-2xl border border-gray-900/50">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2">
                      Especificaciones e Historial Técnico
                    </h4>

                    <div className="space-y-3">
                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                          Función en el Proceso
                        </label>
                        <textarea
                          value={editingFuncion}
                          onChange={(e) => setEditingFuncion(e.target.value)}
                          className="w-full bg-[#0d0d12] border border-gray-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none min-h-[70px] resize-none"
                          placeholder="Describe el rol de esta máquina en la línea..."
                        />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-gray-500 uppercase tracking-widest block mb-1">
                          Ficha Técnica / Detalles del Equipo
                        </label>
                        <textarea
                          value={editingEspecificaciones}
                          onChange={(e) => setEditingEspecificaciones(e.target.value)}
                          className="w-full bg-[#0d0d12] border border-gray-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none min-h-[90px] resize-none"
                          placeholder="Indica marca, modelo, dimensiones, conexiones..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Parámetros del Simulador */}
                  <div className="space-y-5">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-white/5 pb-2">
                      Parámetros Operativos del Proceso
                    </h4>

                    {/* Switch Activo */}
                    <div className="flex items-center justify-between p-3 rounded-2xl bg-gray-950/60 border border-gray-900">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-white uppercase tracking-wide">
                          Estado de Operación
                        </span>
                        <span className="text-[10px] text-gray-500">
                          Habilitar este módulo en la simulación
                        </span>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={editingActivo} 
                          onChange={(e) => setEditingActivo(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-350 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                      </label>
                    </div>

                    {/* Capacidad, Potencia y Precio de Venta */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                          Capacidad (kg/h)
                        </label>
                        <input
                          type="number"
                          value={editingCapacidad}
                          disabled={!editingActivo}
                          onChange={(e) => setEditingCapacidad(parseInt(e.target.value) || 0)}
                          className="w-full bg-gray-950 border border-gray-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                          Potencia (kW)
                        </label>
                        <input
                          type="number"
                          value={editingPotencia}
                          disabled={!editingActivo}
                          onChange={(e) => setEditingPotencia(parseFloat(e.target.value) || 0)}
                          className="w-full bg-gray-950 border border-gray-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1.5">
                          Precio Venta ($ USD)
                        </label>
                        <input
                          type="number"
                          value={editingPrecioVenta}
                          disabled={!editingActivo}
                          onChange={(e) => setEditingPrecioVenta(parseInt(e.target.value) || 0)}
                          className="w-full bg-gray-950 border border-gray-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
                        />
                      </div>
                    </div>

                    {/* Aire Comprimido */}
                    <div className="p-4 rounded-2xl bg-gray-950/40 border border-gray-900/50 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Wind className="w-4 h-4 text-blue-400" />
                          <span className="text-xs font-bold text-white uppercase tracking-wide">
                            Requiere Aire
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={editingOcupaAire}
                          disabled={!editingActivo}
                          onChange={(e) => setEditingOcupaAire(e.target.checked)}
                          className="w-4 h-4 rounded accent-blue-500 bg-gray-900 border-gray-800"
                        />
                      </div>

                      {editingOcupaAire && editingActivo && (
                        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/5">
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                              Presión (Bar)
                            </label>
                            <input
                              type="number"
                              step="0.1"
                              value={editingPresionAire}
                              onChange={(e) => setEditingPresionAire(parseFloat(e.target.value) || 0)}
                              className="w-full bg-gray-950 border border-gray-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                          <div>
                            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-1">
                              Caudal (m³/min)
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              value={editingCaudalAire}
                              onChange={(e) => setEditingCaudalAire(parseFloat(e.target.value) || 0)}
                              className="w-full bg-gray-950 border border-gray-800 focus:border-blue-500 rounded-lg px-2.5 py-1.5 text-xs text-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer buttons */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-white/5">
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Está seguro de que desea eliminar el equipo "${editingNombre}" del flujo del proceso?`)) {
                        removeModulo(editingModuloId);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl border border-red-900/40 hover:bg-red-500 hover:text-black text-red-400 text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5"
                  >
                    <Trash2 className="w-4 h-4" />
                    Eliminar Equipo
                  </button>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setEditingModuloId(null)}
                      className="px-5 py-2.5 rounded-xl border border-gray-800 text-gray-400 text-xs font-bold uppercase tracking-wider hover:bg-white/5 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        updateModulo(editingModuloId, {
                          nombre: editingNombre,
                          color: editingColor,
                          activo: editingActivo,
                          capacidadNominal: editingCapacidad,
                          potenciaInstalada: editingPotencia,
                          ocupaAire: editingOcupaAire,
                          presionAireBar: editingPresionAire,
                          caudalAireM3Min: editingCaudalAire,
                          funcion: editingFuncion,
                          especificaciones: editingEspecificaciones,
                          precioVenta: editingPrecioVenta
                        });
                        setEditingModuloId(null);
                      }}
                      className="px-6 py-2.5 rounded-xl text-black text-xs font-black uppercase tracking-widest transition-all hover:opacity-90"
                      style={{ backgroundColor: editingColor }}
                    >
                      Guardar Configuración
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>,
        document.body
      )}

      {/* MÁSTER INFORME MODAL */}
      {isReportModalOpen && createPortal(
        <div className={`fixed inset-0 z-[99999] flex flex-col bg-[#0f111a] overflow-y-auto ${isExportOnly ? 'opacity-0 pointer-events-none' : ''}`}>
          {/* Header del Modal del Reporte */}
          <div className="bg-[#141622]/95 backdrop-blur-md border-b border-slate-800 px-8 py-4 flex items-center justify-between sticky top-0 z-[10000] no-print">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-teal-500/10 rounded-xl">
                <FileText className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  {projectName || 'INFORME INDUSTRIAL CARRIER'}
                </h3>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                  PANDORA 3.0 • VISOR DE 8 PÁGINAS MÁSTER
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => printReport(exportFileName)}
                className="flex items-center gap-2 px-5 py-2.5 text-xs font-black bg-teal-500 hover:bg-teal-600 text-black rounded-xl transition-all shadow-[0_0_15px_rgba(20,184,166,0.25)]"
              >
                <Printer className="w-3.5 h-3.5" />
                Exportar PDF
              </button>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="flex items-center justify-center w-9 h-9 bg-white/5 border border-white/10 hover:bg-white/15 text-gray-400 hover:text-white rounded-xl transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CONTENEDOR MÁSTER DE PÁGINAS (Hojas en Vista Previa e Imprimibles) */}
          <div className="flex-1 py-10 px-4 overflow-x-auto flex justify-center bg-[#0d0e15]">
            <div ref={reportRef} className="lma-report-wrap flex flex-col gap-10" style={{ width: '1120px' }}>
              
              {/* PÁGINA 1: PORTADA PRINCIPAL (COVER) */}
              <div className="lma-page" style={S.page}>
                {/* Top Banner Gradient */}
                <div style={{ height: 80, background: 'linear-gradient(to right, #0891b2, #06b6d4)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px' }}>
                  <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(120deg, transparent, transparent 28px, rgba(255,255,255,0.03) 28px, rgba(255,255,255,0.03) 30px)' }} />
                  
                  {/* Brand Logo & Version badge */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2 }}>
                    <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
                      CARRIER
                    </span>
                    <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 800, color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '2px 8px', background: 'rgba(255,255,255,0.1)' }}>
                      PANDORA 3.0 · V8.00
                    </span>
                  </div>

                  {/* Right side line metadata */}
                  <div style={{ textAlign: 'right', position: 'relative', zIndex: 2 }}>
                    <div style={{ color: '#fff', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      LÍNEA DE PROCESAMIENTO CARRIER
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: 700, marginTop: 3 }}>
                      CLIENTE: {clientName.toUpperCase()} &nbsp;|&nbsp; MÁQUINA: CARRIER v3.0 &nbsp;|&nbsp; FECHA: {new Date().toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Cover Content */}
                <div className="lma-page-inner" style={{ ...S.inner, height: '712px', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40, alignItems: 'center', marginTop: -20, flex: 1 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div>
                      {/* Small tag */}
                      <div style={{ fontSize: 9, fontWeight: 900, color: '#0891b2', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
                        INFORME PARAMÉTRICO DE SIMULACIÓN
                      </div>
                      
                      {/* Main Title */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{ fontSize: 40, fontWeight: 900, color: '#0f2038', letterSpacing: -0.8, lineHeight: 1.0, fontFamily: 'sans-serif' }}>
                          SIMULACIÓN
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 4, height: 34, background: '#06b6d4', borderRadius: 2 }} />
                          <div style={{ fontSize: 40, fontWeight: 900, color: '#06b6d4', letterSpacing: -0.8, lineHeight: 1.0, fontFamily: 'sans-serif' }}>
                            DE LÍNEA
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Cliente Section */}
                    <div style={{ marginTop: 1 }}>
                      <div style={{ fontSize: 9, fontWeight: 900, color: '#06b6d4', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 1 }}>
                        CLIENTE
                      </div>
                      <div style={{ fontSize: 28, fontWeight: 900, color: '#0f2038', letterSpacing: -0.5 }}>
                        {clientName.toUpperCase()}
                      </div>
                    </div>

                    <p style={{ color: '#475569', fontSize: 11, lineHeight: 1.5, margin: 0 }}>
                      Análisis de capacidad, potencia instalada y esfuerzos mecánicos para la dosificación, corte y briqueteado de piezas discretas de tubo de cobre.
                    </p>

                    {/* Calculation Base Card */}
                    <div style={{ background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 12, padding: '8px 12px' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '4px', fontSize: 10, color: '#475569' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#0891b2', fontWeight: 700 }}>Empresa</span>
                          <strong style={{ color: '#1e293b' }}>MÁQUINA EN EVALUACIÓN - CARRIER | PANDORA</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#0891b2', fontWeight: 700 }}>Cliente</span>
                          <strong style={{ color: '#1e293b' }}>{clientName}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#0891b2', fontWeight: 700 }}>Proyecto</span>
                          <strong style={{ color: '#1e293b' }}>{projectName || 'Informe Paramétrico de Simulación'}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#0891b2', fontWeight: 700 }}>Fecha</span>
                          <strong style={{ color: '#1e293b' }}>{new Date().toLocaleDateString()}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Material Parámetro Activo Card */}
                    <div style={{ background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '8px 12px', marginTop: -2 }}>
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#0f766e', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 4 }}>
                        MATRIZ DE MODELOS DE TUBO DE COBRE COMPATIBLES
                      </span>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '8px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #a7f3d0', color: '#0f766e', fontWeight: 800 }}>
                            <th style={{ textAlign: 'left', padding: '2px 0' }}>Modelo HVAC</th>
                            <th style={{ textAlign: 'right', padding: '2px 0' }}>Diámetro Ext. (Ø)</th>
                            <th style={{ textAlign: 'right', padding: '2px 0' }}>Espesor Pared</th>
                            <th style={{ textAlign: 'right', padding: '2px 0' }}>Longitud Corte</th>
                            <th style={{ textAlign: 'center', padding: '2px 0' }}>Compatibilidad</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { name: "1/4\"", od: 6.35, wall: 0.80 },
                            { name: "3/8\"", od: 9.52, wall: 0.80 },
                            { name: "1/2\"", od: 12.70, wall: 0.90 },
                            { name: "5/8\"", od: 15.88, wall: 1.00 },
                            { name: "3/4\"", od: 19.05, wall: 1.00 },
                            { name: "7/8\"", od: 22.22, wall: 1.14 },
                            { name: "1-1/8\"", od: 28.58, wall: 1.27 },
                            { name: "1-3/8\"", od: 34.93, wall: 1.40 },
                            { name: "1-5/8\"", od: 41.28, wall: 1.58 },
                            { name: "2-1/8\"", od: 53.98, wall: 1.83 }
                          ].map((p) => {
                            const isCurrent = (presetTubo === p.name) || 
                              (presetTubo === 'Personalizado' && p.od === diametroExteriorPieza && p.wall === espesorParedPieza);
                            return (
                              <tr key={p.name} style={{ 
                                background: isCurrent ? 'rgba(16,185,129,0.15)' : 'transparent', 
                                color: isCurrent ? '#065f46' : '#475569', 
                                fontWeight: isCurrent ? 800 : 500 
                              }}>
                                <td style={{ padding: '2px 0' }}>Tubo Cobre {p.name}</td>
                                <td style={{ textAlign: 'right', padding: '2px 0', fontFamily: 'monospace' }}>{p.od.toFixed(2)} mm</td>
                                <td style={{ textAlign: 'right', padding: '2px 0', fontFamily: 'monospace' }}>{p.wall.toFixed(2)} mm</td>
                                <td style={{ textAlign: 'right', padding: '2px 0', fontFamily: 'monospace' }}>{isCurrent ? longitudPieza : 50} cm</td>
                                <td style={{ textAlign: 'center', padding: '2px 0' }}>
                                  <span style={{ 
                                    fontSize: '7px', 
                                    padding: '0.5px 3px', 
                                    borderRadius: '3px', 
                                    background: isCurrent ? '#10b981' : '#e2e8f0', 
                                    color: isCurrent ? '#ffffff' : '#64748b',
                                    fontWeight: 900
                                  }}>
                                    {isCurrent ? 'ACTIVO' : 'SOPORTADO'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {presetTubo === 'Personalizado' && (
                        <div style={{ marginTop: 4, paddingTop: 3, borderTop: '1px dashed #a7f3d0', fontSize: '8px', color: '#065f46', fontWeight: 700 }}>
                          * Medida Personalizada: Diámetro Ø {diametroExteriorPieza.toFixed(2)} mm | Espesor {espesorParedPieza.toFixed(2)} mm | Largo Corte {longitudPieza} cm
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Results Preview Widget */}
                  <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <span style={{ fontSize: 12, fontWeight: 900, color: '#0891b2', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block' }}>
                      VISTA PREVIA DE RESULTADOS
                    </span>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div style={{ borderBottom: '1px solid #a5f3fc', paddingBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block' }}>Capacidad Requerida</span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>Flujo deseado</span>
                        </div>
                        <strong style={{ fontSize: 24, color: '#0891b2', fontWeight: 900 }}>{calculos.capacidadRequeridaKgH.toFixed(1)} kg/h</strong>
                      </div>

                      <div style={{ borderBottom: '1px solid #a5f3fc', paddingBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block' }}>Potencia Instalada</span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>Total motores activos</span>
                        </div>
                        <strong style={{ fontSize: 24, color: '#0891b2', fontWeight: 900 }}>{calculos.potenciaInstaladaTotalKw.toFixed(2)} kW</strong>
                      </div>

                      <div style={{ borderBottom: '1px solid #a5f3fc', paddingBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block' }}>Inversión Estimada (Precio Venta)</span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>Total equipos activos</span>
                        </div>
                        <strong style={{ fontSize: 24, color: '#10b981', fontWeight: 900 }}>
                          {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(calculos.precioVentaTotalUSD)} USD
                        </strong>
                      </div>

                      <div style={{ borderBottom: '1px solid #a5f3fc', paddingBottom: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block' }}>Esfuerzo de Corte Máximo</span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>Fuerza cizalla</span>
                        </div>
                        <strong style={{ fontSize: 24, color: '#0891b2', fontWeight: 900 }}>{calculos.fuerzaCorteKN.toFixed(1)} kN</strong>
                      </div>

                      <div style={{ borderBottom: '1px solid #a5f3fc', paddingBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block' }}>Torque de Alimentación</span>
                            <span style={{ fontSize: 11, color: '#64748b' }}>Rodillo Alimentador</span>
                          </div>
                          <strong style={{ fontSize: 22, color: '#0891b2', fontWeight: 900 }}>{calculos.torqueSeguroNm.toFixed(0)} N-m</strong>
                        </div>
                      </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
                          <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, flex: 1 }}>
                            <span style={{ display: 'block', color: '#64748b', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Peso Pieza</span>
                            <span style={{ color: '#0891b2', fontWeight: 900 }}>{(calculos.pesoPiezaKg || 0).toFixed(3)} kg</span>
                          </div>
                          <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, flex: 1 }}>
                            <span style={{ display: 'block', color: '#64748b', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Tasa Aliment.</span>
                            <span style={{ color: '#0891b2', fontWeight: 900 }}>{frecuenciaAlimentacion} pz/min</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, fontSize: 10, marginTop: 4 }}>
                          <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, flex: 1 }}>
                            <span style={{ display: 'block', color: '#64748b', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Fricción (μ)</span>
                            <span style={{ color: '#0891b2', fontWeight: 900 }}>{coefFriccion.toFixed(2)}</span>
                          </div>
                          <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, flex: 1 }}>
                            <span style={{ display: 'block', color: '#64748b', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>F. Fricción</span>
                            <span style={{ color: '#0891b2', fontWeight: 900 }}>{calculos.fuerzaFriccionTotalN.toFixed(1)} N</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <div>
                            <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block' }}>Disponibilidad Real</span>
                            <span style={{ fontSize: 11, color: '#64748b' }}>Mano de obra y turnos</span>
                          </div>
                          <strong style={{ fontSize: 24, color: '#10b981', fontWeight: 900 }}>{calculos.disponibilidadReal.toFixed(1)}%</strong>
                        </div>
                    </div>
                  </div>
                </div>

                {renderPageFooter(1, 8)}
              </div>

              {/* PÁGINA 2: ESPECIFICACIONES TÉCNICAS Y PROCESO DE MÓDULOS */}
              <div className="lma-page" style={S.page}>
                <div style={S.inner}>
                  <div>
                    {renderPageHeader("1. ESPECIFICACIONES TÉCNICAS Y MÓDULOS DE PROCESO", "Configuración de equipos y parámetros mecánicos e instalados de la planta")}
                    <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                      {/* Columna Izquierda: Primeros 6 Módulos */}
                      <div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '6px', overflow: 'hidden' }}>
                          <thead>
                            <tr>
                              <th style={{ ...S.th, padding: '6px 8px', fontSize: '12px' }}>Módulo</th>
                              <th style={{ ...S.th, padding: '6px 8px', fontSize: '12px', textAlign: 'right' }}>kW</th>
                              <th style={{ ...S.th, padding: '6px 8px', fontSize: '12px', textAlign: 'right' }}>Capacidad</th>
                              <th style={{ ...S.th, padding: '6px 8px', fontSize: '12px', textAlign: 'center' }}>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modulos.slice(0, 6).map((m) => (
                              <tr key={m.id}>
                                <td style={{ ...S.td, padding: '6px 8px', fontSize: '12px' }}><strong>{m.nombre}</strong></td>
                                <td style={{ ...S.td, padding: '6px 8px', fontSize: '12px', fontFamily: 'monospace', textAlign: 'right' }}>{m.potenciaInstalada > 0 ? `${m.potenciaInstalada.toFixed(1)}` : 'N/A'}</td>
                                <td style={{ ...S.td, padding: '6px 8px', fontSize: '12px', fontFamily: 'monospace', textAlign: 'right' }}>{m.capacidadNominal > 0 ? `${m.capacidadNominal}` : 'N/A'}</td>
                                <td style={{ ...S.td, padding: '6px 8px', fontSize: '12px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    fontSize: '9px',
                                    fontWeight: 900,
                                    background: m.activo ? '#e6fffa' : '#fee2e2',
                                    color: m.activo ? '#0d9488' : '#ef4444'
                                  }}>
                                    {m.activo ? 'ACT' : 'INA'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Columna Derecha: Siguientes 6 Módulos */}
                      <div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', borderRadius: '6px', overflow: 'hidden' }}>
                          <thead>
                            <tr>
                              <th style={{ ...S.th, padding: '6px 8px', fontSize: '12px' }}>Módulo</th>
                              <th style={{ ...S.th, padding: '6px 8px', fontSize: '12px', textAlign: 'right' }}>kW</th>
                              <th style={{ ...S.th, padding: '6px 8px', fontSize: '12px', textAlign: 'right' }}>Capacidad</th>
                              <th style={{ ...S.th, padding: '6px 8px', fontSize: '12px', textAlign: 'center' }}>Estado</th>
                            </tr>
                          </thead>
                          <tbody>
                            {modulos.slice(6).map((m) => (
                              <tr key={m.id}>
                                <td style={{ ...S.td, padding: '6px 8px', fontSize: '12px' }}><strong>{m.nombre}</strong></td>
                                <td style={{ ...S.td, padding: '6px 8px', fontSize: '12px', fontFamily: 'monospace', textAlign: 'right' }}>{m.potenciaInstalada > 0 ? `${m.potenciaInstalada.toFixed(1)}` : 'N/A'}</td>
                                <td style={{ ...S.td, padding: '6px 8px', fontSize: '12px', fontFamily: 'monospace', textAlign: 'right' }}>{m.capacidadNominal > 0 ? `${m.capacidadNominal}` : 'N/A'}</td>
                                <td style={{ ...S.td, padding: '6px 8px', fontSize: '12px', textAlign: 'center' }}>
                                  <span style={{
                                    padding: '2px 6px',
                                    borderRadius: '3px',
                                    fontSize: '9px',
                                    fontWeight: 900,
                                    background: m.activo ? '#e6fffa' : '#fee2e2',
                                    color: m.activo ? '#0d9488' : '#ef4444'
                                  }}>
                                    {m.activo ? 'ACT' : 'INA'}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', background: '#f8fafc', padding: '12px 20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginTop: '10px' }}>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Potencia Consolidada:</span>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>{calculos.potenciaInstaladaTotalKw.toFixed(2)} kW</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Inversión Estimada:</span>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#10b981' }}>
                        {new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(calculos.precioVentaTotalUSD)} USD
                      </div>
                    </div>
                    <div>
                      <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>Capacidad Real:</span>
                      <div style={{ fontSize: '18px', fontWeight: 900, color: '#0f172a' }}>
                        {calculos.cuelloBotellaCapacidad === Infinity ? '0' : `${calculos.cuelloBotellaCapacidad} kg/h`} ({calculos.cuelloBotellaModulo})
                      </div>
                    </div>
                  </div>

                  {renderPageFooter(2, 8)}
                </div>
              </div>

              {/* PÁGINA 3: GEMELO DIGITAL 3D - VISTA LATERAL */}
              <div className="lma-page" style={S.page}>
                <div style={S.inner}>
                  <div>
                    {renderPageHeader("2. GEMELO DIGITAL 3D - VISTA LATERAL / PRINCIPAL", "Instantánea tridimensional del flujo de desbobinado y trituración en vista de perfil")}
                    
                    <div style={{ height: '420px', width: '100%', background: twinTheme === 'blueprint' ? '#edf4f9' : '#05070f', borderRadius: '16px', border: twinTheme === 'blueprint' ? '1px solid #cbd5e1' : '1px solid #1e293b', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: 15 }}>
                      {twinSnapshotLateral ? (
                        <img src={twinSnapshotLateral} alt="Vista Lateral" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : twinSnapshot ? (
                        <img src={twinSnapshot} alt="Vista Lateral Fallback" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ color: '#475569', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '100%' }}>
                          <Sliders className="w-8 h-8 text-cyan-500 animate-pulse" />
                          <span>Sin captura de pantalla lateral guardada.</span>
                          <span style={{ fontSize: '10px', color: '#334155' }}>Presiona "Capturar Vistas" en el visor 3D para persistir instantáneas en alta fidelidad.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {renderPageFooter(3, 8)}
                </div>
              </div>

              {/* PÁGINA 4: GEMELO DIGITAL 3D - VISTA SUPERIOR (PLANTA) */}
              <div className="lma-page" style={S.page}>
                <div style={S.inner}>
                  <div>
                    {renderPageHeader("3. GEMELO DIGITAL 3D - VISTA SUPERIOR (PLANTA)", "Instantánea tridimensional en vista cenital mostrando la distribución espacial de los módulos")}
                    
                    <div style={{ height: '420px', width: '100%', background: twinTheme === 'blueprint' ? '#edf4f9' : '#05070f', borderRadius: '16px', border: twinTheme === 'blueprint' ? '1px solid #cbd5e1' : '1px solid #1e293b', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: 15 }}>
                      {twinSnapshotSuperior ? (
                        <img src={twinSnapshotSuperior} alt="Vista Superior" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : twinSnapshot ? (
                        <img src={twinSnapshot} alt="Vista Superior Fallback" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ color: '#475569', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '100%' }}>
                          <Sliders className="w-8 h-8 text-cyan-500 animate-pulse" />
                          <span>Sin captura de pantalla cenital guardada.</span>
                          <span style={{ fontSize: '10px', color: '#334155' }}>Presiona "Capturar Vistas" en el visor 3D para persistir instantáneas en alta fidelidad.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {renderPageFooter(4, 8)}
                </div>
              </div>

              {/* PÁGINA 5: GEMELO DIGITAL 3D - VISTA ISOMÉTRICA (PERSPECTIVA) */}
              <div className="lma-page" style={S.page}>
                <div style={S.inner}>
                  <div>
                    {renderPageHeader("4. GEMELO DIGITAL 3D - VISTA ISOMÉTRICA (PERSPECTIVA)", "Representación tridimensional general en perspectiva isométrica de toda la planta")}
                    
                    <div style={{ height: '420px', width: '100%', background: twinTheme === 'blueprint' ? '#edf4f9' : '#05070f', borderRadius: '16px', border: twinTheme === 'blueprint' ? '1px solid #cbd5e1' : '1px solid #1e293b', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', marginTop: 15 }}>
                      {twinSnapshotIsometrica ? (
                        <img src={twinSnapshotIsometrica} alt="Vista Isométrica" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : twinSnapshot ? (
                        <img src={twinSnapshot} alt="Vista Isométrica Fallback" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ color: '#475569', fontSize: '12px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px', height: '100%' }}>
                          <Sliders className="w-8 h-8 text-cyan-500 animate-pulse" />
                          <span>Sin captura de pantalla isométrica guardada.</span>
                          <span style={{ fontSize: '10px', color: '#334155' }}>Presiona "Capturar Vistas" en el visor 3D para persistir instantáneas en alta fidelidad.</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {renderPageFooter(5, 8)}
                </div>
              </div>

              {/* PÁGINA 6: MATRIZ DE RESULTADOS TÉCNICOS CONSOLIDADOS */}
              <div className="lma-page" style={S.page}>
                <div style={S.inner}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', justifyContent: 'space-between' }}>
                    <div>
                      {renderPageHeader("5. MATRIZ DE RESULTADOS TÉCNICOS CONSOLIDADOS", "Resultados cuantitativos y cálculos estructurales derivados de la simulación física")}
                      <div style={{ marginTop: 6 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                          <div>
                            <h3 style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #06b6d4', paddingBottom: '3px', marginBottom: '6px', textTransform: 'uppercase' }}>Cálculos Dimensionales y de Material</h3>
                            <table style={{ width: '100%' }}>
                              <tbody>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Espesor del Tubo de Cobre:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{calculos.espesorTuboMm.toFixed(2)} mm</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Área Metálica Neta del Tubo:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{calculos.areaMetalicaM2.toFixed(8)} m²</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Peso Lineal del Tubo:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{calculos.pesoMetroKgM.toFixed(4)} kg/m</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Peso Unitario de la Pieza:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{(calculos.pesoPiezaKg || 0).toFixed(3)} kg</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Tasa de Alimentación:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{frecuenciaAlimentacion} pz/min</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Coeficiente de Fricción (μ):</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{coefFriccion.toFixed(2)}</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Fuerza de Fricción Deslizante:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{calculos.fuerzaFriccionTotalN.toFixed(2)} N</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Capacidad Máxima de Cobre:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{capacidadObjetivoKgH} kg/h</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Turnos de Trabajo:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{turnosTrabajo} ({turnosTrabajo * 8}h/día)</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Número de Operadores:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{numeroOperadores} op</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          <div>
                            <h3 style={{ fontSize: '12.5px', fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #06b6d4', paddingBottom: '3px', marginBottom: '6px', textTransform: 'uppercase' }}>Cálculos de Esfuerzos y Potencias</h3>
                            <table style={{ width: '100%' }}>
                              <tbody>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Masa Procesada por Minuto:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{calculos.masaPorMinutoKgMin.toFixed(2)} kg/min</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Capacidad de Flujo Requerida:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{calculos.capacidadRequeridaKgH.toFixed(1)} kg/h</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Fuerza de Corte de Cizalla:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{calculos.fuerzaCorteKN.toFixed(1)} kN ({calculos.fuerzaCorteTon.toFixed(1)} Ton)</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Pérdida por Fricción:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{calculos.potenciaFriccionKw.toFixed(4)} kW</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Torque Seguro Alimentador:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{calculos.torqueSeguroNm.toFixed(1)} N-m</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Demanda Mecánica Rodillo:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{calculos.potenciaMecanicaDesbobinadoKw.toFixed(3)} kW</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Disponibilidad Real (OEE-A):</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{calculos.disponibilidadReal.toFixed(1)}%</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Producción por Turno:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{Math.round(calculos.produccionRealTurnoKg).toLocaleString()} kg/turno</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Producción Diaria Total:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontFamily: 'monospace', fontWeight: 800, textAlign: 'right' }}>{Math.round(calculos.produccionRealDiaKg).toLocaleString()} kg/día</td>
                                </tr>
                                <tr>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 700 }}>Panorama Operativo:</td>
                                  <td style={{ ...S.td, padding: '3.5px 8px', fontSize: '11px', fontWeight: 800, color: calculos.panoramaColor, textAlign: 'right', textTransform: 'uppercase' }}>{calculos.panoramaLabel}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Alerta de Sobrecarga de Capacidad */}
                    <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0', display: 'flex', alignItems: 'center', gap: '10px', marginTop: 1 }}>
                      <CheckCircle2 style={{ color: '#10b981', width: '16px', height: '16px', flexShrink: 0 }} />
                      <div>
                        <h5 style={{ color: '#065f46', fontSize: '10px', fontWeight: 800, margin: 0, textTransform: 'uppercase' }}>
                          Flujo Técnico Operativo en Estado Seguro
                        </h5>
                        <p style={{ color: '#047857', fontSize: '9.5px', margin: '1px 0 0', fontWeight: 500 }}>
                          El flujo de material requerido ({calculos.capacidadRequeridaKgH.toFixed(1)} kg/h) se encuentra dentro de los márgenes nominales de todos los módulos activos de la planta.
                        </p>
                      </div>
                    </div>

                    {/* Gráfica de Balance de Capacidad de Módulos */}
                    {(() => {
                      // Filtrar los módulos que realmente están activos en el simulador y que no son simples bandas transportadoras o carritos
                      const chartModules = modulos.filter(m => m.activo && m.capacidadNominal > 0 && !m.id.startsWith('banda_salida') && m.id !== 'carritos');
                      const maxCap = Math.max(1200, ...chartModules.map(m => m.capacidadNominal), calculos.capacidadRequeridaKgH || 0);
                      
                      const rowHeight = 15;
                      const barRows = chartModules.length;
                      const chartHeight = 25 + Math.max(1, barRows) * rowHeight;
                      const svgHeight = chartHeight + 15;

                      return (
                        <div style={{ padding: '8px 12px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0', marginTop: 1 }}>
                          <div style={{ fontSize: '10.5px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                            Balance de Capacidad de Módulos vs. Flujo Requerido
                          </div>
                          {chartModules.length === 0 ? (
                            <div style={{ fontSize: '10px', color: '#64748b', textAlign: 'center', padding: '15px' }}>
                              No hay módulos de procesamiento activos para graficar.
                            </div>
                          ) : (
                            <svg width="100%" height={svgHeight} viewBox={`0 0 920 ${svgHeight}`} style={{ overflow: 'visible' }}>
                              {/* Ejes y líneas de cuadrícula verticales */}
                              {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
                                const x = 180 + pct * 650;
                                const capVal = Math.round(maxCap * pct);
                                return (
                                  <g key={idx}>
                                    <line x1={x} y1="20" x2={x} y2={chartHeight - 1} stroke={pct === 0 || pct === 1 ? "#cbd5e1" : "#f1f5f9"} strokeWidth="1" />
                                    <text x={x} y={chartHeight + 11} textAnchor="middle" fontSize="8.5" fontWeight="700" fill="#64748b">{capVal} kg/h</text>
                                  </g>
                                );
                              })}

                              {/* Barras de los Módulos */}
                              {chartModules.map((m, idx) => {
                                const yText = 38 + idx * rowHeight;
                                const yRect = 29 + idx * rowHeight;
                                const barWidth = (m.capacidadNominal / maxCap) * 650;
                                const barColor = m.id === 'trituradora' ? '#06b6d4' : (m.id === 'molino' ? '#22d3ee' : '#0891b2');
                                return (
                                  <g key={m.id}>
                                    <text x="170" y={yText} textAnchor="end" fontSize="9" fontWeight="700" fill="#475569">{m.nombre}</text>
                                    <rect x="180" y={yRect} width={barWidth} height="10" rx="2" fill={barColor} />
                                    <text x={185 + barWidth} y={yText - 1} fontSize="8.5" fontWeight="800" fill="#0f172a">{m.capacidadNominal} kg/h</text>
                                  </g>
                                );
                              })}

                              {/* Línea vertical de Demanda Actual */}
                              {(() => {
                                const demandX = 180 + (Math.min(calculos.capacidadRequeridaKgH, maxCap) / maxCap) * 650;
                                const textAnchor = demandX < 280 ? 'start' : (demandX > 800 ? 'end' : 'middle');
                                const textX = demandX + (demandX < 280 ? 8 : (demandX > 800 ? -8 : 0));
                                return (
                                  <>
                                    <line x1={demandX} y1="18" x2={demandX} y2={chartHeight - 1} stroke="#ea580c" strokeWidth="2" strokeDasharray="3 3" />
                                    <polygon points={`${demandX},20 ${demandX-4},15 ${demandX+4},15`} fill="#ea580c" />
                                    <text x={textX} y="12" textAnchor={textAnchor} fontSize="8.5" fontWeight="900" fill="#ea580c">
                                      FLUJO REQUERIDO: {calculos.capacidadRequeridaKgH.toFixed(1)} kg/h
                                    </text>
                                  </>
                                );
                              })()}
                            </svg>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  {renderPageFooter(6, 8)}
                </div>
              </div>

              {/* PÁGINA 7: BALANCE ENERGÉTICO Y POTENCIA DE MÓDULOS */}
              <div className="lma-page" style={S.page}>
                <div style={S.inner}>
                  <div>
                    {renderPageHeader("6. BALANCE ENERGÉTICO Y POTENCIA DE MÓDULOS", "Desglose energético de toda la línea de procesamiento instalada y activa")}
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '30px', marginTop: 15 }}>
                      <div>
                        <h4 style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #06b6d4', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase' }}>Desglose de Acometida por Máquina Activa</h4>
                        
                        {(() => {
                          const activePowerModules = modulos.filter(m => m.activo && m.potenciaInstalada > 0);
                          const halfLength = Math.ceil(activePowerModules.length / 2);
                          return (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                              <table style={{ width: '100%', fontSize: '11.5px' }}>
                                <thead>
                                  <tr>
                                    <th style={{ ...S.th, fontSize: '11.5px', padding: '6px 8px' }}>Módulo</th>
                                    <th style={{ ...S.th, fontSize: '11.5px', padding: '6px 8px', textAlign: 'right' }}>kW</th>
                                    <th style={{ ...S.th, fontSize: '11.5px', padding: '6px 8px', textAlign: 'right' }}>%</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {activePowerModules.slice(0, halfLength).map(m => {
                                    const pct = ((m.potenciaInstalada / (calculos.potenciaInstaladaTotalKw || 1)) * 100).toFixed(1);
                                    return (
                                      <tr key={m.id}>
                                        <td style={{ ...S.td, padding: '6px 8px', fontSize: '11.5px' }}>{m.nombre}</td>
                                        <td style={{ ...S.td, padding: '6px 8px', fontSize: '11.5px', fontFamily: 'monospace', textAlign: 'right', fontWeight: 700 }}>{m.potenciaInstalada.toFixed(1)}</td>
                                        <td style={{ ...S.td, padding: '6px 8px', fontSize: '11.5px', fontFamily: 'monospace', textAlign: 'right', color: '#64748b' }}>{pct}%</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>

                              <table style={{ width: '100%', fontSize: '11.5px' }}>
                                <thead>
                                  <tr>
                                    <th style={{ ...S.th, fontSize: '11.5px', padding: '6px 8px' }}>Módulo</th>
                                    <th style={{ ...S.th, fontSize: '11.5px', padding: '6px 8px', textAlign: 'right' }}>kW</th>
                                    <th style={{ ...S.th, fontSize: '11.5px', padding: '6px 8px', textAlign: 'right' }}>%</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {activePowerModules.slice(halfLength).map(m => {
                                    const pct = ((m.potenciaInstalada / (calculos.potenciaInstaladaTotalKw || 1)) * 100).toFixed(1);
                                    return (
                                      <tr key={m.id}>
                                        <td style={{ ...S.td, padding: '6px 8px', fontSize: '11.5px' }}>{m.nombre}</td>
                                        <td style={{ ...S.td, padding: '6px 8px', fontSize: '11.5px', fontFamily: 'monospace', textAlign: 'right', fontWeight: 700 }}>{m.potenciaInstalada.toFixed(1)}</td>
                                        <td style={{ ...S.td, padding: '6px 8px', fontSize: '11.5px', fontFamily: 'monospace', textAlign: 'right', color: '#64748b' }}>{pct}%</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          );
                        })()}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Carga Total Activa de Línea:</span>
                          <strong style={{ fontSize: '20px', fontWeight: 900, color: '#0f172a' }}>{calculos.potenciaInstaladaTotalKw.toFixed(1)} kW</strong>
                          <p style={{ fontSize: '9px', color: '#64748b', margin: '2px 0 0', fontWeight: 500 }}>Suma de potencia de motores activos.</p>
                        </div>

                        <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#f0fdfa', border: '1px solid #99f6e4' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#0d9488', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Módulo de Mayor Consumo:</span>
                          {(() => {
                            const maxKwModule = [...modulos].filter(m => m.activo).sort((a, b) => b.potenciaInstalada - a.potenciaInstalada)[0];
                            return maxKwModule ? (
                              <>
                                <strong style={{ fontSize: '13px', fontWeight: 900, color: '#115e59', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{maxKwModule.nombre}</strong>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#0d9488', fontFamily: 'monospace', marginTop: '2px' }}>{maxKwModule.potenciaInstalada.toFixed(1)} kW</div>
                              </>
                            ) : <span style={{ color: '#14b8a6', fontSize: '11px' }}>Ninguno</span>;
                          })()}
                        </div>

                        <div style={{ padding: '10px 14px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                          <span style={{ fontSize: '10px', fontWeight: 800, color: '#2563eb', textTransform: 'uppercase', display: 'block', marginBottom: '2px' }}>Demanda Neumática Total:</span>
                          <strong style={{ fontSize: '20px', fontWeight: 900, color: '#1e3a8a', display: 'block' }}>
                            {calculos.aireRequeridoTotalM3Min.toFixed(2)} m³/min
                          </strong>
                          <span style={{ fontSize: '10px', fontWeight: 700, color: '#3b82f6', display: 'block', marginTop: '2px' }}>
                            Presión Requerida: {calculos.presionAireMaximaBar.toFixed(1)} Bar
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {renderPageFooter(7, 8)}
                </div>
              </div>

              {/* PÁGINA 8: DIAGNÓSTICO OPERATIVO Y RECOMENDACIONES DE INGENIERÍA */}
              <div className="lma-page" style={S.page}>
                <div style={S.inner}>
                  <div>
                    {renderPageHeader("7. DIAGNÓSTICO OPERATIVO Y RECOMENDACIONES DE INGENIERÍA", "Evaluación sistémica de riesgos y acciones correctivas para planta")}
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr', gap: '25px', marginTop: 10 }}>
                      <div>
                        <div style={{ padding: '15px 20px', borderRadius: '16px', background: '#0f172a', border: '1px solid #1e293b', textAlign: 'center' }}>
                          <h4 style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '6px' }}>Disponibilidad de la Planta</h4>
                          <div style={{ fontSize: '38px', fontWeight: 900, color: '#10b981', fontFamily: 'monospace', lineHeight: 1 }}>
                            {calculos.disponibilidadReal.toFixed(1)}<span style={{ fontSize: '16px', color: '#475569' }}>%</span>
                          </div>
                          <div style={{
                            marginTop: '8px',
                            display: 'inline-block',
                            padding: '2px 10px',
                            borderRadius: '20px',
                            fontSize: '9px',
                            fontWeight: 900,
                            textTransform: 'uppercase',
                            background: 'rgba(16,185,129,0.1)',
                            color: '#10b981',
                            border: '1px solid #10b981'
                          }}>
                            OPERACIÓN SEGURA
                          </div>
                        </div>

                        <div style={{ marginTop: '10px' }}>
                          <h5 style={{ fontSize: '9px', fontWeight: 900, color: '#64748b', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '6px' }}>Auditoría de Simulación:</h5>
                          <div style={{ fontSize: '9.5px', color: '#065f46', fontWeight: 700, padding: '8px 10px', background: '#ecfdf5', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                            ✓ Secuencia óptima sin anomalías de flujo o acoplamiento detectadas en la línea de materiales.
                          </div>
                        </div>
                      </div>
 
                      <div>
                        <h4 style={{ fontSize: '12px', fontWeight: 800, color: '#0f172a', borderBottom: '1.5px solid #06b6d4', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase' }}>Recomendaciones Generales de Ingeniería</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          {[
                            "Mantener el programa de mantenimiento preventivo planificado según los manuales técnicos oficiales de cada módulo activo.",
                            "Operar la planta respetando las tasas de alimentación nominal recomendadas para maximizar la vida útil del equipamiento.",
                            "Conservar la sincronización de velocidades de bandas de transporte para asegurar un flujo de material continuo y homogéneo.",
                            "Supervisar el estado de las cuchillas y elementos de corte periódicamente para garantizar la máxima calidad de granulometría."
                          ].map((rec, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: '8px', background: '#f8fafc', padding: '6px 10px', borderRadius: '8px', border: '1px solid #e2e8f0', alignItems: 'center' }}>
                              <div style={{ width: '16px', height: '16px', borderRadius: '50%', background: '#ecfeff', border: '1px solid #06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0891b2', fontSize: '9px', fontWeight: 900, flexShrink: 0 }}>
                                {idx + 1}
                              </div>
                              <span style={{ fontSize: '9.5px', color: '#334155', fontWeight: 600, lineHeight: 1.2 }}>{rec}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {renderPageFooter(8, 8)}
                </div>
              </div>

            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Premium Toast Notification System */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-fade-in-up">
          <div className="relative px-6 py-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-neon-cyan/50 shadow-[0_0_24px_rgba(0,240,255,0.15)] flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-neon-cyan animate-pulse" />
            <span className="text-xs font-semibold tracking-wide text-white font-mono">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
