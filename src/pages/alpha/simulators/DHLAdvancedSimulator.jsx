import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, Zap, DollarSign, Activity, Settings, 
  AlertCircle, ShieldAlert, Cpu, Layers, Wrench, 
  Clock, BarChart3, FileSpreadsheet, Percent, 
  TrendingUp, RotateCcw, Printer, Info, Eye, X, Download, 
  Upload, Check, Sliders, Play, Pause, Save, Scale, ArrowRight, Loader2,
  FolderOpen, Link2, Plus, Maximize2, Minimize2, Lock, Unlock, MousePointer, Edit2,
  Ruler, Grid, Trash2, Box, Droplet, Shield, Target, Trophy, Package, Gauge,
  Building2, Factory, Users, FlaskConical, Volume2, Star, PieChart as PieChartLucide
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Cell, AreaChart, Area, LineChart, Line, PieChart, Pie, ComposedChart
} from 'recharts';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

import { useTranslation } from '@/context/LanguageContext';
import { useBeta } from '@/context/BetaContext';
import { supabase, uploadFileWithProgress } from '@/supabase';
import SharedTwinViewer3D from '@/components/flow/SharedTwinViewer3D';
import FlowDesignsLibrary from '@/components/flow/FlowDesignsLibrary';
import { useFlowDesigns } from '@/hooks/useFlowDesigns';
import { process3DFile } from '@/utils/fileProcessor';

// â”€â”€ Helpers de IndexedDB para almacenamiento de Modelos 3D persistentes locales â”€â”€
const dbName = "PandoraWM500DB";
const storeName = "wm500_models";

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(storeName)) {
        db.createObjectStore(storeName);
      }
    };
    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

async function saveModelToIndexedDB(key, fileBlob, name, type) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const data = { blob: fileBlob, name, type, timestamp: Date.now() };
      const request = store.put(data, key);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("IndexedDB error:", err);
  }
}

async function getModelFromIndexedDB(key) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(key);
      request.onsuccess = (e) => resolve(e.target.result);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("IndexedDB load error:", err);
    return null;
  }
}

async function deleteModelFromIndexedDB(key) {
  try {
    const db = await initDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);
      request.onsuccess = () => resolve(true);
      request.onerror = (e) => reject(e.target.error);
    });
  } catch (err) {
    console.error("IndexedDB delete error:", err);
  }
}

export default function DHLAdvancedSimulator() {
  const navigate = useNavigate();
  const { id } = useParams();
  const simId = id || 'wm500';
  const { t } = useTranslation();
  const { activeProject, updateProjectName } = useBeta();
  const reportRef = useRef(null);
  let currentSectionIndex = 1;

  // --- 1. ESTADO DE ENTRADAS ---
  const defaultInputs = {
    // Metadatos
    companyName: 'SOLIWASTE',
    clientName: 'FRANCISCO LOUVIER',
    machineName: 'BWD-250',
    projectName: 'PROYECTO LAVADO DE CAJAS',
    evaluationDate: '17/7/2026',
    materialType: 'CAJAS DE PLÁSTICO',
    evaluationName: 'Lavadora y Secadora de Cajas BWD-250',
    technicalSheetName: 'Ficha Técnica de Lavadora y Secadora de Cajas BWD-250',
    garantia_estandar_meses: 12,
    garantia_extendida_meses: 24,
    alcance_garantia: 'Defectos de fabricación y vicios ocultos',
    exclusiones: 'Partes de desgaste y daños por mala operación',
    fecha_inicio_garantia: 'A partir de firma de FAT/SAT',
    energySectionTitle: 'Desglose Energético Operativo',
    capacityCardTitle: 'Capacidad Real Ajustada',

    // Visibilidad de Pestañas
    hideFinanciero: false,
    hideCapex: false,
    hideEnergía: false,
    hideEscenarios: false,
    hideRiesgos: false,

    // Obra Civil y Piso
    civilCargaPorApoyo: 500,
    civilNumeroApoyos: 6,
    civilDrenajeRequerido: 'Trinchera con rejilla',
    civilCaudalDescarga: 250,
    civilDiametroTuberia: '4 pulgadas',
    civilAreaRequeridaM2: 25,
    civilAlimentacionElectrica: 'Trifásica 440V',
    civilDistanciaTablero: 15,
    civilTransformador: 'No',
    civilAireComprimido: 'No',
    civilRequerimientoAgua: 'Toma 1 pulgada',
    civilVentilacion: 'Campana extractora opcional',

    // Operación
    capacidad_nominal_cajas_h: 200,
    utilization: 90,
    oee: 85,
    loadFactor: 85,
    hoursPerDay: 8,
    shiftsPerDay: 2,
    daysPerMonth: 24,
    meta_diaria_cajas: 3000,
    cajas: [
      { id: '1', nombre: 'Packaging 460 (blue box + lid)', largoCm: 60, anchoCm: 40, altoCm: 20, color: '#3b82f6', suciedad: 'Polvo' },
      { id: '2', nombre: 'Packaging 500 (blue box)', largoCm: 30, anchoCm: 20, altoCm: 15, color: '#0ea5e9', suciedad: 'Polvo' },
      { id: '3', nombre: 'Packaging 600 (blue box)', largoCm: 60, anchoCm: 20, altoCm: 15, color: '#06b6d4', suciedad: 'Polvo' },
      { id: '4', nombre: 'Packaging 750 (blue box + lid)', largoCm: 60, anchoCm: 40, altoCm: 20, color: '#14b8a6', suciedad: 'Polvo' },
      { id: '5', nombre: 'Packaging 757 (blue box + lid)', largoCm: 40, anchoCm: 30, altoCm: 9.86, color: '#10b981', suciedad: 'Polvo' },
      { id: '6', nombre: 'Packaging 780 (blue box + lid)', largoCm: 60, anchoCm: 40, altoCm: 20, color: '#8b5cf6', suciedad: 'Polvo' },
      { id: '7', nombre: 'Packaging 787 (blue box + lid)', largoCm: 60, anchoCm: 40, altoCm: 9.86, color: '#a855f7', suciedad: 'Polvo' },
      { id: '8', nombre: 'Packaging 800 (blue box + lid)', largoCm: 80, anchoCm: 30, altoCm: 20, color: '#d946ef', suciedad: 'Polvo' },
      { id: '9', nombre: 'Packaging 840 (blue box + lid)', largoCm: 80, anchoCm: 60, altoCm: 20, color: '#ec4899', suciedad: 'Polvo' },
      { id: '10', nombre: 'Packaging 81 (spacer of plastic)', largoCm: 116, anchoCm: 76, altoCm: 0.4, color: '#f43f5e', suciedad: 'Polvo' },
      { id: '11', nombre: 'Packaging 82 (spacer of plastic)', largoCm: 76, anchoCm: 56, altoCm: 0.4, color: '#f97316', suciedad: 'Polvo' }
    ],



    // Energía y Motor
    motorBombaAguaHp: 15,
    motorSopladorHp: 10,
    motorBandaHp: 0.5,
    calentamientoElectricoKw: 18.00,
    secadoresIncluidosEnSoplador: 'No',
    potenciaSecadoresAdicionalKw: 0,
    customInstalledPowerKw: 37.02,
    potenciaActivaKw: 21,
    electricityRate: 2.50,
    volumen_tanque_l: 1200,
    caudal_interno_l_h: 2527,
    porcentaje_recirculacion: 85,
    reposicion_por_arrastre_l_h: 145,
    reposicion_por_evaporacion_l_h: 0,
    purga_l_h: 0,
    frecuencia_cambio_tanque_dias: 7,
    waterCostM3: 35.0,
    waterDragOutPercent: 5,

    // Especificaciones Técnicas
    machineLength: 7.0,
    machineWidth: 1.8,
    machineHeight: 1.75,
    pesoOperativoKg: 1800,
    pesoSecoKg: 1000,
    longitudSecadoExternoM: 5.0,
    volumenAguaOperativoL: 800,
    bocaAlimentacion: 'Temperatura: 60-80°C',
    presionLavadoBar: 200,
    particulaFinal: 'Presión: 5.0 bar',
    ruidoDb: 75,
    separadorMagnetico: 'Eficiencia: 90-95%',
    componentesElectricos: 'Schneider / Siemens',
    motorMarca: '15 hp (Bomba) | 10 hp (Soplador)',

    // CAPEX
    precioEquipoUsd: 89700,
    iva: 16,
    tipoCambio: 18,
    porcentajeManiobras: 2,
    porcentajeMontajeMecanico: 3,
    porcentajeObraCivil: 2,
    porcentajeElectricoPrincipal: 4,
    porcentajeCanalizacionProtecciones: 3,
    porcentajeExtraccionPolvo: 0,
    porcentajeSeguridadIndustrial: 2,
    porcentajeIngenieriaSupervision: 2,
    porcentajeContingencia: 5,

    // OPEX
    operadoresPorTurno: 2,
    sueldoOperadorMensual: 12000,
    supervisoresPorTurno: 0,
    sueldoSupervisorMensual: 20000,
    mantenimientoAnualPorcentaje: 5,
    filtrosMensualMxn: 0,
    refaccionesMensualMxn: 5000,
    lubricacionMensualMxn: 1000,
    limpiezaMensualMxn: 4000,
    consumiblesMensualMxn: 8000,
    otrosOpexMensualMxn: 0,

    // Financiero
    precioVentaTonMxn: 5,
    ahorroPorTonMxn: 8,
    usarModoIngresoVenta: false,
    usarModoAhorroInterno: true,
    vidaUtilAnios: 10,
    tasaDescuento: 14,
    depreciacionAnual: 10,
    inflacionAnual: 5,
    incrementoEnergíaAnual: 6,

    // Riesgos y Mantenimiento
    riesgoPolvo: 'bajo',
    riesgoIncendio: 'bajo',
    riesgoMetal: 'bajo',
    riesgoRuido: 'medio',
    frecuenciaMantenimientoHoras: 250,
    vidaUtilCuchillasHoras: 2000,
    disponibilidadMecanica: 95,
    factorParo: 5,
    requiereExtraccionPolvo: false,
    requiereSistemaContraIncendio: false,
    requiereCabinaAcustica: false,
    requiereLOTO: true,
    requiereGuardas: true,
    requiereEStop: true,

    // Propiedades editables de la Ficha Técnica (Métricas)
    machineNameDetalle: 'Lavadora Industrial de Cajas (Agua y Aire)',
    aplicacionOperativa: 'Lavado, enjuague y secado de cajas plásticas',
    aplicacionDetalle: 'Eficiencia de Lavado: 90-95% | Secado: 80-90%',
    capacidadNominalDetalle: 'Sujeta a OEE y nivel de suciedad',
    motorPrincipalDetalle: 'Motor de Bomba de Agua: 15 hp',
    motorAuxiliarDetalle: 'Motor Soplador: 10 hp | Banda: 0.5 hp',
    dimensionesBandas: 'Temperatura de Lavado: 60-80°C',
    dimensionesBandasDetalle: 'Calentamiento: 18 kW',
    bocaAlimentacionDetalle: 'Presión de Agua: 5.0 bar',
    presionLavadoBarDetalle: 'Inversor: Incluido (SIEMENS)',
    particulaFinalDetalle: 'Contactores y Relays: SCHNEIDER',
    separadorMagneticoDetalle: 'Voltaje: 220/440V',
    pesoKgDetalle: 'Estructura en Acero Inoxidable',
    componentesElectricosDetalle: 'Contactores SCHNEIDER, Inversor SIEMENS',
    ruidoDbDetalle: 'Nivel óptimo para piso de producción',
  };

  const [inputs, setInputs] = useState(() => {
    const saved = localStorage.getItem('sim_dhl_v2_inputs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { 
          ...defaultInputs, 
          ...parsed, 
          cajas: (parsed.cajas && parsed.cajas.length > 0) ? parsed.cajas : defaultInputs.cajas 
        };
      } catch(e) {}
    }
    return defaultInputs;
  });

  useEffect(() => {
    try {
      const { customProcessImage, ...safeInputs } = inputs;
      localStorage.setItem('sim_dhl_v2_inputs', JSON.stringify(safeInputs));
    } catch(e) {
      console.warn("No se pudo guardar sim_dhl_v2_inputs", e);
    }
  }, [inputs]);

  // Migración automática para forzar valores de lavado si provienen de caché vieja
  useEffect(() => {
    setInputs(prev => {
      let changed = false;
      let newInputs = { ...prev };
      if (newInputs.machineName === 'BWS-250' || newInputs.machineName === 'BWD-200 + BA' || (newInputs.evaluationName && newInputs.evaluationName.includes('BWS-250'))) {
        newInputs.machineName = 'BWD-250';
        newInputs.evaluationName = 'Lavadora y Secadora de Cajas BWD-250';
        newInputs.technicalSheetName = 'Ficha Técnica de Lavadora y Secadora de Cajas BWD-250';
        if (newInputs.customInstalledPowerKw === 18) {
          newInputs.customInstalledPowerKw = 37.02;
        }
        changed = true;
      }
      
      // Also catch if they already migrated but have the bad power value
      if (newInputs.machineName === 'BWD-250' && newInputs.customInstalledPowerKw === 18) {
        newInputs.customInstalledPowerKw = 37.02;
        changed = true;
      }
      return changed ? newInputs : prev;
    });
  }, []);

  // Sync project names
  useEffect(() => {
    if (activeProject?.name) {
      setInputs(prev => ({ ...prev, projectName: activeProject.name }));
    }
  }, [activeProject?.name]);

  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [tempProjectName, setTempProjectName] = useState('');

  useEffect(() => {
    if (inputs.projectName) {
      setTempProjectName(inputs.projectName);
    }
  }, [inputs.projectName]);

  const handleSaveProjectName = () => {
    setIsEditingProjectName(false);
    const trimmed = tempProjectName.trim();
    if (trimmed && trimmed !== inputs.projectName) {
      setInputs(prev => ({ ...prev, projectName: trimmed }));
      if (activeProject) {
        updateProjectName(trimmed);
      }
    }
  };

  const [isEditingClientName, setIsEditingClientName] = useState(false);
  const [tempClientName, setTempClientName] = useState('');

  useEffect(() => {
    if (inputs.clientName) {
      setTempClientName(inputs.clientName);
    }
  }, [inputs.clientName]);

  const handleSaveClientName = () => {
    setIsEditingClientName(false);
    const trimmed = tempClientName.trim();
    if (trimmed && trimmed !== inputs.clientName) {
      setInputs(prev => ({ ...prev, clientName: trimmed }));
    }
  };

  const [isEditingMachineName, setIsEditingMachineName] = useState(false);
  const [tempMachineName, setTempMachineName] = useState('');

  useEffect(() => {
    if (inputs.machineName) {
      setTempMachineName(inputs.machineName);
    }
  }, [inputs.machineName]);

  const handleSaveMachineName = () => {
    setIsEditingMachineName(false);
    const trimmed = tempMachineName.trim();
    if (trimmed && trimmed !== inputs.machineName) {
      setInputs(prev => ({ ...prev, machineName: trimmed }));
    }
  };

  const [isEditingEvaluationName, setIsEditingEvaluationName] = useState(false);
  const [tempEvaluationName, setTempEvaluationName] = useState('');

  useEffect(() => {
    if (inputs.evaluationName) {
      setTempEvaluationName(inputs.evaluationName);
    }
  }, [inputs.evaluationName]);

  const handleSaveEvaluationName = () => {
    setIsEditingEvaluationName(false);
    const trimmed = tempEvaluationName.trim();
    if (trimmed && trimmed !== inputs.evaluationName) {
      setInputs(prev => ({ ...prev, evaluationName: trimmed }));
    }
  };

  const [isEditingTechnicalSheetName, setIsEditingTechnicalSheetName] = useState(false);
  const [tempTechnicalSheetName, setTempTechnicalSheetName] = useState('');

  useEffect(() => {
    if (inputs.technicalSheetName) {
      setTempTechnicalSheetName(inputs.technicalSheetName);
    }
  }, [inputs.technicalSheetName]);

  const handleSaveTechnicalSheetName = () => {
    setIsEditingTechnicalSheetName(false);
    const trimmed = tempTechnicalSheetName.trim();
    if (trimmed && trimmed !== inputs.technicalSheetName) {
      setInputs(prev => ({ ...prev, technicalSheetName: trimmed }));
    }
  };

  const [isEditingEnergyTitle, setIsEditingEnergyTitle] = useState(false);
  const [tempEnergyTitle, setTempEnergyTitle] = useState('');

  useEffect(() => {
    if (inputs.energySectionTitle) {
      setTempEnergyTitle(inputs.energySectionTitle);
    }
  }, [inputs.energySectionTitle]);

  const handleSaveEnergyTitle = () => {
    setIsEditingEnergyTitle(false);
    const trimmed = tempEnergyTitle.trim();
    if (trimmed && trimmed !== inputs.energySectionTitle) {
      setInputs(prev => ({ ...prev, energySectionTitle: trimmed }));
    }
  };

  const [isEditingCapacityTitle, setIsEditingCapacityTitle] = useState(false);
  const [tempCapacityTitle, setTempCapacityTitle] = useState('');

  useEffect(() => {
    if (inputs.capacityCardTitle) {
      setTempCapacityTitle(inputs.capacityCardTitle);
    }
  }, [inputs.capacityCardTitle]);

  const handleSaveCapacityTitle = () => {
    setIsEditingCapacityTitle(false);
    const trimmed = tempCapacityTitle.trim();
    if (trimmed && trimmed !== inputs.capacityCardTitle) {
      setInputs(prev => ({ ...prev, capacityCardTitle: trimmed }));
    }
  };

  const [activeTab, setActiveTab] = useState('resumen');
  const [isPlaying, setIsPlaying] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [currentScenario, setCurrentScenario] = useState('normal'); // 'conservador' | 'normal' | 'alto'
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  
  const [pdfConfig, setPdfConfig] = useState(() => {
    const defaultConfig = {
      resumen: true,
      twin: true,
      tabla: true,
      capex: true,
      energia: true,
      escenarios: true,
      financiero: true,
      riesgos: true,
      civil: true,
      analisis: true,
      hidrico: true
    };
    
    const saved = localStorage.getItem('sim_dhl_v2_pdf_config');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved); 
        return { ...defaultConfig, ...parsed, analisis: parsed.analisis ?? true };
      } catch(e){}
    }
    return defaultConfig;
  });

  useEffect(() => {
    localStorage.setItem('sim_dhl_v2_pdf_config', JSON.stringify(pdfConfig));
  }, [pdfConfig]);

  const renderPdfToggleButton = (tabId, label) => (
    <button 
      onClick={() => setPdfConfig(p => ({...p, [tabId]: !p[tabId]}))}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border ${
        pdfConfig[tabId] 
          ? 'bg-purple-100 border-purple-200 text-purple-700' 
          : 'bg-slate-200 border-slate-300 text-slate-500'
      }`}
      title={`Activar/desactivar visualización de ${label} en el Informe PDF`}
    >
      <div className={`w-2 h-2 rounded-full ${pdfConfig[tabId] ? 'bg-purple-600 animate-pulse' : 'bg-slate-400'}`} />
      {pdfConfig[tabId] ? 'PDF: Activado' : 'PDF: Apagado'}
    </button>
  );

  // --- ESTADOS DEL GEMELO DIGITAL 3D ---
  const [is3DView, setIs3DView] = useState(true);
  const [twinLayout, setTwinLayout] = useState(null);
  const [isProcessingModel, setIsProcessingModel] = useState(false);
  const [currentDesignId, setCurrentDesignId] = useState(null);
  const [twinSnapshot, setTwinSnapshot] = useState(null);
  const [twinSnapshotLateral, setTwinSnapshotLateral] = useState(null);
  const [twinSnapshotSuperior, setTwinSnapshotSuperior] = useState(null);
  const [twinSnapshotIsométrica, setTwinSnapshotIsométrica] = useState(null);

  // Load from IndexedDB on mount
  useEffect(() => {
    async function loadSnapshots() {
      const s1 = await getModelFromIndexedDB(`sim_${simId}_snapshot_libre`);
      if (s1 && s1.blob) setTwinSnapshot(s1.blob);
      
      const s2 = await getModelFromIndexedDB(`sim_${simId}_snapshot_lateral`);
      if (s2 && s2.blob) setTwinSnapshotLateral(s2.blob);
      
      const s3 = await getModelFromIndexedDB(`sim_${simId}_snapshot_superior`);
      if (s3 && s3.blob) setTwinSnapshotSuperior(s3.blob);
      
      const s4 = await getModelFromIndexedDB(`sim_${simId}_snapshot_isometrica`);
      if (s4 && s4.blob) setTwinSnapshotIsométrica(s4.blob);
    }
    loadSnapshots();
  }, [simId]);

  // Save to IndexedDB on change
  useEffect(() => { if (twinSnapshot) saveModelToIndexedDB(`sim_${simId}_snapshot_libre`, twinSnapshot, 'snap', 'img'); else deleteModelFromIndexedDB(`sim_${simId}_snapshot_libre`); }, [twinSnapshot, simId]);
  useEffect(() => { if (twinSnapshotLateral) saveModelToIndexedDB(`sim_${simId}_snapshot_lateral`, twinSnapshotLateral, 'snap', 'img'); else deleteModelFromIndexedDB(`sim_${simId}_snapshot_lateral`); }, [twinSnapshotLateral, simId]);
  useEffect(() => { if (twinSnapshotSuperior) saveModelToIndexedDB(`sim_${simId}_snapshot_superior`, twinSnapshotSuperior, 'snap', 'img'); else deleteModelFromIndexedDB(`sim_${simId}_snapshot_superior`); }, [twinSnapshotSuperior, simId]);
  useEffect(() => { if (twinSnapshotIsométrica) saveModelToIndexedDB(`sim_${simId}_snapshot_isometrica`, twinSnapshotIsométrica, 'snap', 'img'); else deleteModelFromIndexedDB(`sim_${simId}_snapshot_isometrica`); }, [twinSnapshotIsométrica, simId]);

  const [isDesignsLibraryOpen, setIsDesignsLibraryOpen] = useState(false);
  const [isTwinEditMode, setIsTwinEditMode] = useState(false);
  const [selectedTwinNodeId, setSelectedTwinNodeId] = useState(null);
  
  const [twinLabelHeightOffset, setTwinLabelHeightOffset] = useState(() => {
    const saved = localStorage.getItem('sim_dhl_v2_twin_label_height_offset');
    return saved !== null ? Number(saved) : 0.2;
  });
  const [twinLabelsCollapsed, setTwinLabelsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sim_dhl_v2_twin_labels_collapsed');
    return saved !== null ? saved === 'true' : false;
  });
  const [twinFloorElevation, setTwinFloorElevation] = useState(() => {
    const saved = localStorage.getItem('sim_dhl_v2_twin_floor_elevation');
    return saved !== null ? Number(saved) : 0.0;
  });
  const [twinFloorLocked, setTwinFloorLocked] = useState(() => {
    const saved = localStorage.getItem('sim_dhl_v2_twin_floor_locked');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sim_dhl_v2_twin_label_height_offset', String(twinLabelHeightOffset));
  }, [twinLabelHeightOffset]);
  useEffect(() => {
    localStorage.setItem('sim_dhl_v2_twin_labels_collapsed', String(twinLabelsCollapsed));
  }, [twinLabelsCollapsed]);
  useEffect(() => {
    localStorage.setItem('sim_dhl_v2_twin_floor_elevation', String(twinFloorElevation));
  }, [twinFloorElevation]);
  useEffect(() => {
    localStorage.setItem('sim_dhl_v2_twin_floor_locked', String(twinFloorLocked));
  }, [twinFloorLocked]);
  useEffect(() => {
    localStorage.setItem('sim_dhl_v2_twin_floor_locked', String(twinFloorLocked));
  }, [twinFloorLocked]);

  const twinBlockRef = useRef(null);
  const [isTwinBlockFullscreen, setIsTwinBlockFullscreen] = useState(false);
  const [twinTheme, setTwinTheme] = useState(() => {
    const saved = localStorage.getItem('sim_dhl_v2_twin_theme');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return saved;
      }
    }
    return 'cyberpunk';
  });

  useEffect(() => {
    localStorage.setItem('sim_dhl_v2_twin_theme', typeof twinTheme === 'object' ? JSON.stringify(twinTheme) : twinTheme);
  }, [twinTheme]); 

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsTwinBlockFullscreen(!!document.fullscreenElement && document.fullscreenElement === twinBlockRef.current);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const toggleTwinBlockFullscreen = () => {
    if (!document.fullscreenElement) {
      twinBlockRef.current?.requestFullscreen?.().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      document.exitFullscreen?.();
    }
  };

  const [isAnchored, setIsAnchored] = useState(true);
  const [isAnchoring, setIsAnchoring] = useState(false);

  const { loadDesign: fetchDesignFromDb, saveDesign: saveDesignToDb } = useFlowDesigns();
  const [pendingUpload, setPendingUpload] = useState(null); 
  const [uploadModelName, setUploadModelName] = useState('');
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [twinNodePositions, setTwinNodePositions] = useState(() => {
    const saved = localStorage.getItem('sim_dhl_v2_twin_node_positions');
    return saved ? JSON.parse(saved) : {};
  });

  // Nodos y enlaces para la lavadora y secadora industrial WM-500
  const twinNodes = useMemo(() => {
    const baseNodes = [
      { id: '1', type: 'alimentador', label: 'Banda Alimentadora WM-500', color: '#00F0FF', x: -4 },
      { id: '2', type: 'camara', label: 'Cámara de Lavado (120hp)', color: '#FF0055', x: 0 },
      { id: '3', type: 'separador', label: 'Separador Magnético Overband', color: '#FFB700', x: 4 },
      { id: '4', type: 'descarga', label: 'Banda de Descarga WM-500', color: '#00FF66', x: 8 }
    ];
    return baseNodes.map(node => {
      const customPos = twinNodePositions[node.id];
      return {
        id: node.id,
        type: node.type,
        position: { x: node.x, y: 0, z: 0 },
        data: {
          label: node.label,
          color: node.color,
          hideLabel: true,
          position3D: customPos?.position3D || null,
          labelPosition: customPos?.labelPosition || null
        }
      };
    });
  }, [twinNodePositions]);

  const twinEdges = useMemo(() => [
    { id: 'e1', source: '1', target: '2', animated: true },
    { id: 'e2', source: '2', target: '3', animated: true },
    { id: 'e3', source: '3', target: '4', animated: true }
  ], []);

  // Cargar modelo 3D desde IndexedDB al montar
  useEffect(() => {
    async function loadSavedModel() {
      const savedMeta = localStorage.getItem('sim_dhl_v2_layout_meta');
      if (!savedMeta) return;
      
      const savedModel = await getModelFromIndexedDB(`sim_${simId}_active_model`);
      if (savedModel && savedModel.blob) {
        try {
          const result = await process3DFile(savedModel.blob);
          setTwinLayout({
            url: result.url,
            type: result.type,
            name: savedModel.name,
            blobMap: result.blobMap
          });
        } catch (err) {
          console.error("Error cargando modelo guardado de IndexedDB:", err);
        }
      }
    }
    loadSavedModel();
  }, []);

  // Cargar datos de Supabase al cambiar de proyecto
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
          .eq('key', 'sim_dhl_v2_data')
          .maybeSingle();

        if (error) throw error;
        let stateToLoad = null;

        if (data && data.value) {
          stateToLoad = JSON.parse(data.value);
        }

        // Revisar si hay un autoguardado local más reciente (por F5 accidental)
        const suffix = activeProject?.id ? `${activeProject.id}_` : 'local_';
        const localAutoSaveStr = localStorage.getItem(`sim_dhl_v2_${suffix}autosave`);
        
        if (localAutoSaveStr) {
          try {
            const localData = JSON.parse(localAutoSaveStr);
            // Si el autoguardado local es más reciente que la versión en la nube, le damos prioridad
            if (!stateToLoad || (localData.timestamp && (!stateToLoad.timestamp || localData.timestamp > stateToLoad.timestamp))) {
              console.log("[WM500Simulator] Restaurando autoguardado local (más reciente que la nube)");
              stateToLoad = { ...stateToLoad, ...localData };
            }
          } catch (e) {
            console.warn("No se pudo leer el autoguardado local", e);
          }
        }

        if (stateToLoad) {
          console.log("[WM500Simulator] Re-hydrating state:", stateToLoad);

          // Re-hidratar inputs
          if (stateToLoad.inputs) {
            let migratedInputs = { ...stateToLoad.inputs };
            if (migratedInputs.technicalSheetName === 'Ficha Técnica de Homologación BWD-250') {
              migratedInputs.technicalSheetName = 'Ficha Técnica de Máquina de Lavado BWD-250';
            }
            setInputs(prev => ({ ...prev, ...migratedInputs }));
          }

          // Re-hidratar diseño 3D
          if (stateToLoad.twinLayout) {
            if (stateToLoad.twinLayout.url && stateToLoad.twinLayout.url.startsWith('blob:')) {
              console.warn("[WM500Simulator] Ignorando URL blob temporal. IndexedDB la manejará localmente.");
            } else {
              setTwinLayout(stateToLoad.twinLayout);
            }
          }
          if (stateToLoad.currentDesignId) {
            setCurrentDesignId(stateToLoad.currentDesignId);
          }
          if (stateToLoad.twinNodePositions) {
            setTwinNodePositions(stateToLoad.twinNodePositions);
          }
          if (stateToLoad.activeTab) {
            setActiveTab(stateToLoad.activeTab);
          }
        }
      } catch (err) {
        console.error("[WM500Simulator] Error loading from cloud:", err);
      }
    };

    loadSimulatorDataFromCloud();
  }, [activeProject?.id]);

  // --- AUTO-GUARDADO LOCAL EN TIEMPO REAL ---
  useEffect(() => {
    // Evitar guardar si es el estado vacío inicial
    if (!inputs.clientName && !inputs.evaluationName) return;

    const suffix = activeProject?.id ? `${activeProject.id}_` : 'local_';
    const { customProcessImage, ...safeInputsForAutoSave } = inputs;
    const autoSaveData = {
      inputs: safeInputsForAutoSave,
      twinNodePositions,
      currentDesignId,
      activeTab,
      timestamp: Date.now()
    };
    
    // No guardamos la url blob, pero sí guardamos que hay un diseño activo
    if (twinLayout && !twinLayout.url?.startsWith('blob:')) {
      autoSaveData.twinLayout = twinLayout;
    }

    try {
      localStorage.setItem(`sim_dhl_v2_${suffix}autosave`, JSON.stringify(autoSaveData));
    } catch (err) {
      console.warn('No se pudo autoguardar el estado debido al límite de cuota de localStorage.', err);
    }
  }, [inputs, twinNodePositions, currentDesignId, activeTab, twinLayout, activeProject?.id]);

  // Cargar instantáneas del gemelo digital de localStorage y mantenerlas sincronizadas
  useEffect(() => {
    const syncSnapshot = (e) => {
      const suffix = activeProject?.id ? `${activeProject.id}_` : '';
      const prefix = `sim_dhl_v2_${suffix}`;

      // Auto-Limpieza: Si existen imágenes viejas pesadas (antes de la compresión), purgarlas para liberar la cuota de 5MB.
      if (!window.__twin_purged) {
        try {
          const check = localStorage.getItem(`${prefix}twin_snapshot_base64`);
          if (check && check.length > 500000) { // Si pesa más de 500KB, es la versión vieja sin comprimir
            localStorage.removeItem(`${prefix}twin_snapshot_base64`);
            localStorage.removeItem(`${prefix}twin_snapshot_lateral`);
            localStorage.removeItem(`${prefix}twin_snapshot_superior`);
            localStorage.removeItem(`${prefix}twin_snapshot_isometrica`);
            console.log("Purgado de caché de imágenes antiguas exitoso.");
          }
        } catch (err) {}
        window.__twin_purged = true;
      }

      // Si el evento tiene newValue (StorageEvent sintético cuando localStorage falla por cuota),
      // actualizar el estado directamente desde el evento sin releer localStorage
      if (e && e.key && e.newValue) {
        if (e.key === `${prefix}twin_snapshot_lateral`) setTwinSnapshotLateral(e.newValue);
        else if (e.key === `${prefix}twin_snapshot_superior`) setTwinSnapshotSuperior(e.newValue);
        else if (e.key === `${prefix}twin_snapshot_isometrica`) setTwinSnapshotIsométrica(e.newValue);
        else if (e.key === `${prefix}twin_snapshot_base64`) setTwinSnapshot(e.newValue);
        return;
      }

      // Sincronización normal desde localStorage
      const base64 = localStorage.getItem(`${prefix}twin_snapshot_base64`);
      const lat = localStorage.getItem(`${prefix}twin_snapshot_lateral`);
      const sup = localStorage.getItem(`${prefix}twin_snapshot_superior`);
      const iso = localStorage.getItem(`${prefix}twin_snapshot_isometrica`);
      
      if (base64) setTwinSnapshot(base64);
      if (lat) setTwinSnapshotLateral(lat);
      if (sup) setTwinSnapshotSuperior(sup);
      if (iso) setTwinSnapshotIsométrica(iso);
    };

    const handleCustomSnapshot = (e) => {
      const suffix = activeProject?.id ? `${activeProject.id}_` : '';
      const prefix = `sim_dhl_v2_${suffix}`;
      if (e && e.detail && e.detail.key && e.detail.value) {
        if (e.detail.key === `${prefix}twin_snapshot_lateral`) setTwinSnapshotLateral(e.detail.value);
        else if (e.detail.key === `${prefix}twin_snapshot_superior`) setTwinSnapshotSuperior(e.detail.value);
        else if (e.detail.key === `${prefix}twin_snapshot_isometrica`) setTwinSnapshotIsométrica(e.detail.value);
        else if (e.detail.key === `${prefix}twin_snapshot_base64`) setTwinSnapshot(e.detail.value);
      }
    };

    syncSnapshot(null); // carga inicial sin evento
    window.addEventListener('storage', syncSnapshot);
    window.addEventListener('twin_snapshot_captured', handleCustomSnapshot);
    
    return () => {
      window.removeEventListener('storage', syncSnapshot);
      window.removeEventListener('twin_snapshot_captured', handleCustomSnapshot);
    };
  }, [activeProject?.id]);

  // --- ESC KEY LISTENER PARA CERRAR EL MODAL ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isReportModalOpen) {
        setIsReportModalOpen(false);
        setIsPreviewMode(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isReportModalOpen]);

  // --- 1.5 CÁLCULO DINÁMICO DE CAPACIDAD POR CAJA ---
  const activeBox = (inputs.cajas || []).find(c => c.id === (inputs.activeBoxId || '1')) || (inputs.cajas || [])[0] || { largoCm: 60, nombre: 'Caja Genérica' };
  const conveyorSpeedMH = inputs.conveyorSpeedMH !== undefined ? inputs.conveyorSpeedMH : 160;
  const conveyorSpeedCmH = conveyorSpeedMH * 100;
  const espacioPorCajaCm = activeBox.largoCm + (inputs.boxGapCm !== undefined ? inputs.boxGapCm : 15);
  const capacidadGeometrica = espacioPorCajaCm > 0 ? Math.floor(conveyorSpeedCmH / espacioPorCajaCm) : 0;
  const currentNominalCapacity = Math.min(capacidadGeometrica, 350);

  // --- 2. CÁLCULO DE MÉTRICAS AUTOMÁTICAS ---
  const results = useMemo(() => {
    // 1. DIMENSIONES Y CAPACIDAD
    const footprintM2 = (inputs.machineLength || 7.0) * (inputs.machineWidth || 1.8);
    
    const capacidadNominalCajasH = currentNominalCapacity;
    // Capacidad real nunca excede la nominal, y se basa en OEE y reducción.
    // También validamos que el layout de la caja no obligue a producir más de 200.
    const realProductionPerHourBoxes = capacidadNominalCajasH * ((inputs.oee || 85) / 100);
    
    const dailyProductionBoxes = realProductionPerHourBoxes * (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 2);
    const monthlyProductionBoxes = dailyProductionBoxes * (inputs.daysPerMonth || 24);
    const annualProductionBoxes = monthlyProductionBoxes * 12;
    
    const dailyGoalBoxes = inputs.meta_diaria_cajas || 3000;
    const requirementCoverage = dailyGoalBoxes > 0 ? (dailyProductionBoxes / dailyGoalBoxes) * 100 : 0;
    const systemUtilization = dailyProductionBoxes > 0 ? (dailyGoalBoxes / dailyProductionBoxes) * 100 : 0;
    const operationalReserve = dailyProductionBoxes - dailyGoalBoxes;
    const hoursRequired = realProductionPerHourBoxes > 0 ? (dailyGoalBoxes / realProductionPerHourBoxes) : 0;

    // 3. ENERGÍA
    const motorBombaAguaKw = (inputs.motorBombaAguaHp || 15) * 0.746;
    const motorSopladorKw = (inputs.motorSopladorHp || 10) * 0.746;
    const motorBandaKw = (inputs.motorBandaHp || 0.5) * 0.746;
    const calentamientoKw = inputs.calentamientoElectricoKw || 18.0;
    
    let potenciaSecadoresAdicionalKw = 0;
    if (inputs.secadoresIncluidosEnSoplador === 'No') {
      potenciaSecadoresAdicionalKw = inputs.potenciaSecadoresAdicionalKw || 0;
    }
    
    const baseSumPowerKw = motorBombaAguaKw + motorSopladorKw + motorBandaKw + calentamientoKw + potenciaSecadoresAdicionalKw;
    const installedPowerKw = inputs.customInstalledPowerKw !== undefined ? inputs.customInstalledPowerKw : baseSumPowerKw;
    const averageHourlyConsumptionKw = installedPowerKw * ((inputs.loadFactor || 85) / 100);
    const hourlyElectricityCostMxn = averageHourlyConsumptionKw * (inputs.electricityRate || 2.50);
    const dailyElectricityCostMxn = hourlyElectricityCostMxn * (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 2);
    const monthlyElectricityCostMxn = dailyElectricityCostMxn * (inputs.daysPerMonth || 24);
    const annualElectricityCostMxn = monthlyElectricityCostMxn * 12;

    const kwhPer1000Boxes = realProductionPerHourBoxes > 0 ? (averageHourlyConsumptionKw / realProductionPerHourBoxes) * 1000 : 0;
    const electricityCostPer1000BoxesMxn = kwhPer1000Boxes * (inputs.electricityRate || 2.50);

    // 3.5. AGUA E HÍDRICO
    const reposicionTotalLH = (inputs.reposicion_por_arrastre_l_h || 145) + (inputs.reposicion_por_evaporacion_l_h || 0) + (inputs.purga_l_h || 0);
    const consumoPorCajaL = realProductionPerHourBoxes > 0 ? (reposicionTotalLH / realProductionPerHourBoxes) : 0;
    const consumoDiarioOperacionL = reposicionTotalLH * (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 2);
    const consumoPorCambioTanqueLDia = (inputs.volumen_tanque_l || 1200) / (inputs.frecuencia_cambio_tanque_dias || 7);
    const consumoDiarioTotalL = consumoDiarioOperacionL + consumoPorCambioTanqueLDia;
    const totalWaterMonthlyLiters = consumoDiarioTotalL * (inputs.daysPerMonth || 24);
    const waterCostMonthlyMxn = (totalWaterMonthlyLiters / 1000) * (inputs.waterCostM3 || 35.0);

    // 3.6 ESCENARIOS (70%, 85%, 95%, 100%)
    const scenarios = [
      { name: 'Conservador', oee: 70 },
      { name: 'Normal', oee: 85 },
      { name: 'Alto Rendimiento', oee: 95 },
      { name: 'Máximo Teórico', oee: 100 }
    ].map(esc => {
      const escCapH = Math.min(capacidadNominalCajasH, capacidadNominalCajasH * (esc.oee / 100));
      const escCapDia = escCapH * (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 2);
      const escHorasReq = escCapH > 0 ? (dailyGoalBoxes / escCapH) : 0;
      const escCob = dailyGoalBoxes > 0 ? (escCapDia / dailyGoalBoxes) * 100 : 0;
      const escMargen = escCapDia - dailyGoalBoxes;
      return { ...esc, capH: escCapH, capDia: escCapDia, horasReq: escHorasReq, cob: escCob, margen: escMargen };
    });

    // 4. CAPEX
    const precioEquipoUsd = inputs.precioEquipoUsd || 89700;
    const tipoCambio = inputs.tipoCambio || 18.00;
    const ivaUsd = precioEquipoUsd * ((inputs.iva || 16) / 100);
    
    // Todo será capturado en porcentaje o dólares según la función, pero se pide que se muestren
    // los valores reales. Haremos lo mismo, si val>100 asume es USD, sino %.
    const getCapexValue = (val, base) => (val > 100 || val < -100) ? val : base * (val / 100);

    const maniobrasUsd = getCapexValue(inputs.porcentajeManiobras || 0, precioEquipoUsd);
    const montajeMecanicoUsd = getCapexValue(inputs.porcentajeMontajeMecanico || 0, precioEquipoUsd);
    const obraCivilUsd = getCapexValue(inputs.porcentajeObraCivil || 0, precioEquipoUsd);
    const electricoPrincipalUsd = getCapexValue(inputs.porcentajeElectricoPrincipal || 0, precioEquipoUsd);
    const canalizacionProteccionesUsd = getCapexValue(inputs.porcentajeCanalizacionProtecciones || 0, precioEquipoUsd);
    const extraccionPolvoUsd = getCapexValue(inputs.porcentajeExtraccionPolvo || 0, precioEquipoUsd);
    const seguridadIndustrialUsd = getCapexValue(inputs.porcentajeSeguridadIndustrial || 0, precioEquipoUsd);
    const ingenieriaSupervisionUsd = getCapexValue(inputs.porcentajeIngenieriaSupervision || 0, precioEquipoUsd);
    const contingenciaUsd = getCapexValue(inputs.porcentajeContingencia || 0, precioEquipoUsd);
    const otrosCapexUsd = getCapexValue(inputs.otrosCapexUsd || 0, precioEquipoUsd);

    const capexInstaladoUsd = precioEquipoUsd + maniobrasUsd + montajeMecanicoUsd + obraCivilUsd + electricoPrincipalUsd + canalizacionProteccionesUsd + extraccionPolvoUsd + seguridadIndustrialUsd + ingenieriaSupervisionUsd + contingenciaUsd + otrosCapexUsd;
    const capexFiscalUsd = capexInstaladoUsd + ivaUsd;
    const capexInstaladoMxn = capexInstaladoUsd * tipoCambio;

    // 5. OPEX
    const manoObraMensualMxn = inputs.manoObraMensualMxn || 48000;
    const mantenimientoMensualMxn = inputs.mantenimientoMensualMxn || 8275;
    const refaccionesMensualMxn = inputs.refaccionesMensualMxn || 6000;
    
    const quimicosMensualMxn = inputs.quimicosMensualMxn !== undefined ? inputs.quimicosMensualMxn : 7000.20;
    const opexMensualMxn = (monthlyElectricityCostMxn || 0) + (waterCostMonthlyMxn || 0) + manoObraMensualMxn + mantenimientoMensualMxn + refaccionesMensualMxn + quimicosMensualMxn + (inputs.supervisionMensualMxn || 0) + (inputs.consumiblesMensualMxn || 0) + (inputs.tratamientoEfluentesMensualMxn || 0) + (inputs.disposicionResiduosMensualMxn || 0) + (inputs.otrosOpexMensualMxn || 0);
    
    const opexAnualMxn = opexMensualMxn * 12;
    const opexPorCajaMxn = monthlyProductionBoxes > 0 ? (opexMensualMxn / monthlyProductionBoxes) : 0;
    const opexPor1000CajasMxn = opexPorCajaMxn * 1000;

    // 6. VIABILIDAD FINANCIERA (OPCIONAL O MANTENIDO POR COMPATIBILIDAD)
    let ingresoMensual = 0;
    if (inputs.usarModoIngresoVenta) ingresoMensual = monthlyProductionBoxes * (inputs.precioVentaCajaMxn || 0);
    else if (inputs.usarModoAhorroInterno) ingresoMensual = monthlyProductionBoxes * (inputs.ahorroPorCajaMxn || 0);

    const flujoOperativoMensual = ingresoMensual - opexMensualMxn;
    const flujoOperativoAnual = flujoOperativoMensual * 12;
    const paybackMeses = flujoOperativoMensual > 0 ? (capexInstaladoMxn / flujoOperativoMensual) : Infinity;

    // ESTADO OPERATIVO (DICTAMEN)
    let estadoOperativo = "NO CUMPLE";
    let estadoColor = "text-red-700 bg-red-50 border-red-200";
    let dictamenTexto = "NO CUMPLE. Se requieren más horas, mayor velocidad validada o una línea adicional.";
    
    if (dailyProductionBoxes >= dailyGoalBoxes) {
      estadoOperativo = "VIABLE";
      estadoColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
      if (systemUtilization <= 70) {
        dictamenTexto = "VIABLE. La línea cubre la meta diaria bajo el escenario seleccionado. La línea dispone de margen operativo suficiente.";
      } else if (systemUtilization <= 90) {
        dictamenTexto = "VIABLE. La línea cubre la meta diaria bajo el escenario seleccionado. La línea cubre la meta con margen operativo moderado.";
      } else {
        dictamenTexto = "VIABLE. La línea cubre la meta diaria bajo el escenario seleccionado. La línea cubre la meta con margen limitado.";
      }
    }

    return {
      footprintM2,
      installedPowerKw,
      averageHourlyConsumptionKw,
      realProductionPerHourBoxes,
      totalWaterMonthlyLiters,
      waterCostMonthlyMxn,
      scenarios,
      dailyProductionBoxes,
      monthlyProductionBoxes,
      annualProductionBoxes,
      hourlyElectricityCostMxn,
      dailyElectricityCostMxn,
      monthlyElectricityCostMxn,
      annualElectricityCostMxn,
      kwhPer1000Boxes,
      electricityCostPer1000BoxesMxn,
      systemUtilization,
      requirementCoverage,
      operationalReserve,
      hoursRequired,
      estadoOperativo,
      estadoColor,
      dictamenTexto,
      totalHp: (inputs.motorBombaAguaHp || 15) + (inputs.motorSopladorHp || 10) + (inputs.motorBandaHp || 0.5),
      // CAPEX
      precioEquipoUsd, ivaUsd, maniobrasUsd, montajeMecanicoUsd, obraCivilUsd, electricoPrincipalUsd, canalizacionProteccionesUsd, extraccionPolvoUsd, seguridadIndustrialUsd, ingenieriaSupervisionUsd, contingenciaUsd, otrosCapexUsd,
      capexInstaladoUsd, capexFiscalUsd, capexInstaladoMxn,
      // OPEX
      manoObraMensualMxn, mantenimientoMensualMxn, opexMensualMxn, opexAnualMxn, opexPorCajaMxn, opexPor1000CajasMxn,
      // WATER
      reposicionTotalLH, consumoPorCajaL, consumoDiarioOperacionL, consumoPorCambioTanqueLDia, consumoDiarioTotalL
    };
  }, [inputs, currentNominalCapacity]);

  // --- 4. ESCENARIOS FINANCIEROS (OEE) ---
  const scenarioResults = useMemo(() => {
    if (!results) return null;
    
    const nominalCapacity = currentNominalCapacity;
    const calcScenario = (params) => {
      const { oee, factorCarga, horasDia, diasMes } = params;
      const capacidadRealKgH = nominalCapacity * (oee / 100);
      const produccionDiariaKg = capacidadRealKgH * horasDia;
      const produccionDiariaTon = produccionDiariaKg / 1000;
      const produccionMensualTon = produccionDiariaTon * diasMes;
      
      const baseMotorsKw = ((inputs.motorBombaAguaHp || 120) + (inputs.motorSopladorHp || 10)) * 0.746;
      const installedPowerKw = (inputs.calentamientoElectricoKw !== undefined && inputs.calentamientoElectricoKw !== 96.98)
        ? inputs.calentamientoElectricoKw
        : (baseMotorsKw + 3.30);
      const consumoPromedioHoraKwh = installedPowerKw * (factorCarga / 100);
      const costoElectricoHora = consumoPromedioHoraKwh * (inputs.electricityRate || 2.50);
      const costoElectricoMensual = costoElectricoHora * horasDia * diasMes;

      const manoObraMensual = ((inputs.operadoresPorTurno || 0) * (inputs.shiftsPerDay || 2) * (inputs.sueldoOperadorMensual || 0)) + ((inputs.supervisoresPorTurno || 0) * (inputs.shiftsPerDay || 2) * (inputs.sueldoSupervisorMensual || 0));
      const capexInstaladoMxn = results.capexInstaladoMxn || 0;
      const mantenimientoMensualMxn = (capexInstaladoMxn * ((inputs.mantenimientoAnualPorcentaje || 0) / 100)) / 12;

      const opexMensualMxn = (costoElectricoMensual || 0) + (manoObraMensual || 0) + (mantenimientoMensualMxn || 0) + (inputs.filtrosMensualMxn || 0) + (inputs.refaccionesMensualMxn || 0) + (inputs.lubricacionMensualMxn || 0) + (inputs.limpiezaMensualMxn || 0) + (inputs.consumiblesMensualMxn || 0) + (inputs.otrosOpexMensualMxn || 0);
      const opexPorTon = produccionMensualTon > 0 ? (opexMensualMxn / produccionMensualTon) : 0;
      const coberturaMeta = (inputs.meta_diaria_cajas || 0) > 0 ? (produccionDiariaKg / inputs.meta_diaria_cajas) * 100 : 0;

      let ingresoMensual = 0;
      if (inputs.usarModoIngresoVenta) ingresoMensual = produccionMensualTon * (inputs.precioVentaTonMxn || 0);
      else if (inputs.usarModoAhorroInterno) ingresoMensual = produccionMensualTon * (inputs.ahorroPorTonMxn || 0);

      const flujoOperativoMensual = ingresoMensual - opexMensualMxn;
      const payback = flujoOperativoMensual > 0 ? (capexInstaladoMxn / flujoOperativoMensual) : Infinity;

      let estado = "NO VIABLE";
      let estadoColor = "text-red-700 bg-red-50 border-red-200";
      if (flujoOperativoMensual > 0) {
        if (payback <= 24) { estado = "VIABLE"; estadoColor = "text-emerald-600 bg-emerald-50 border-emerald-200"; }
        else if (payback <= 36) { estado = "REVISAR"; estadoColor = "text-amber-600 bg-amber-50 border-amber-200"; }
      }

      return {
        ...params,
        capacidadRealKgH,
        dailyProdTon: produccionDiariaTon,
        produccionMensualTon,
        consumoPromedioHoraKwh,
        costoElectricoMensual,
        opexMensual: opexMensualMxn,
        costPerTon: opexPorTon,
        coverage: coberturaMeta,
        utilization: 1,
        payback,
        estado,
        estadoColor
      };
    };

    return {
      conservador: calcScenario({ oee: 70, factorCarga: inputs.loadFactor || 85, horasDia: (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1), diasMes: inputs.daysPerMonth || 24 }),
      normal: calcScenario({ oee: 85, factorCarga: inputs.loadFactor || 85, horasDia: (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1), diasMes: inputs.daysPerMonth || 24 }),
      alto: calcScenario({ oee: 95, factorCarga: inputs.loadFactor || 85, horasDia: (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1), diasMes: inputs.daysPerMonth || 24 })
    };
  }, [inputs, results.capexInstaladoMxn]);

  // Sincronizar de entradas al cambiar de escenario (para simular de forma rápida)
  const applyScenario = (type) => {
    setCurrentScenario(type);
    let params = { oee: 85 };
    if (type === 'conservador') params = { oee: 70 };
    if (type === 'alto') params = { oee: 95 };
    
    setInputs(prev => ({
      ...prev,
      oee: params.oee
    }));
    
    setToastMessage(`Escenario [${type.toUpperCase()}] aplicado exitosamente.`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // --- 3. PERSISTENCIA DE DATOS EN SUPABASE ---
  const handleSaveSimulator = async () => {
    try {
      const { customProcessImage, ...safeInputs } = inputs;
      localStorage.setItem('sim_dhl_v2_inputs', JSON.stringify(safeInputs));
    } catch(e) {}
    
    if (activeProject && activeProject.id && activeProject.id !== 'local-fallback-id') {
      try {
        const { customProcessImage, ...safeInputsForCloud } = inputs;
        const stateToSave = {
          inputs: safeInputsForCloud,
          twinLayout: twinLayout?.url?.startsWith('blob:') ? null : twinLayout,
          currentDesignId,
          twinNodePositions,
          timestamp: Date.now() // Marca de tiempo oficial de guardado
        };
        const payload = {
          project_id: activeProject.id,
          key: 'sim_dhl_v2_data',
          value: JSON.stringify({
            ...stateToSave,
            results
          })
        };
        
        await supabase
          .from('project_context_beta')
          .upsert([payload], { onConflict: 'project_id,key' });
          
        setToastMessage('¡Simulador WM-500 guardado y sincronizado con Supabase!');
      } catch (dbErr) {
        console.error("Error al sincronizar con Supabase:", dbErr);
        setToastMessage('¡Guardado localmente! (Error de red con Supabase)');
      }
    } else {
      setToastMessage('¡Simulador guardado localmente!');
    }
    
    setShowToast(true);
    setTimeout(() => setShowToast(false), 4000);
  };

  const handleResetInputs = () => {
    if (window.confirm('¿Deseas restablecer todos los parámetros del simulador a los datos base originales?')) {
      setInputs(defaultInputs);
      setToastMessage('Parámetros restablecidos a valores por defecto.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  // Controladores de eventos de la barra del Twin con carga en la nube
  const processAndSetupTwinModel = async (file) => {
    if (!file) return;
    setIsProcessingModel(true);
    try {
      const result = await process3DFile(file);
      // Sugerir nombre basado en el nombre del archivo (sin extensión)
      const suggestedName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setUploadModelName(suggestedName);
      setPendingUpload({ file, processedResult: result });
    } catch (err) {
      console.error(err);
      alert('Error procesando el archivo 3D: ' + err.message);
    } finally {
      setIsProcessingModel(false);
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
      // Subir archivo binario a Supabase Storage con progreso
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

      // Crear la configuración de layout con la URL pública
      const layoutRecord = {
        ...processedResult,
        url: publicUrl,
        name: modelName,
        storagePath: storageData?.path || storagePath,
      };

      // Guardar en flow_designs_beta como diseño con solo el layout 3D
      const savedDesign = await saveDesignToDb({
        name: modelName,
        description: `Modelo 3D subido desde el simulador WM-500 (${ext.toUpperCase()})`,
        nodes: [],
        edges: [],
        layout: layoutRecord,
        customEquipments: null,
      });

      // Aplicar el layout al visor del simulador
      setTwinLayout(layoutRecord);
      if (savedDesign?.id) setCurrentDesignId(savedDesign.id);

      // Guardar también en IndexedDB localmente para velocidad de carga
      await saveModelToIndexedDB(`sim_${simId}_active_model`, file, file.name, processedResult.type);
      localStorage.setItem('sim_dhl_v2_layout_meta', JSON.stringify({ name: file.name, type: processedResult.type }));

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
      setIsAnchored(false); // Permite al usuario anclarlo explícitamente a este simulador

      // Cargar también posiciones personalizadas de máquinas si existen en el diseño
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
        localStorage.setItem('sim_dhl_v2_twin_node_positions', JSON.stringify(positions));
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
      localStorage.removeItem('sim_dhl_v2_twin_layout');
      localStorage.removeItem('sim_dhl_v2_twin_node_positions');
      localStorage.removeItem('sim_dhl_v2_twin_anchor_id');
      localStorage.removeItem('sim_dhl_v2_layout_meta');
      deleteModelFromIndexedDB('sim_dhl_v2_active_model');
      setCurrentDesignId(null);
      alert("Coordenadas 3D del gemelo reajustadas a los valores de diseño de Solimaq.");
    }, 1000);
  };

  const handleAnchorToSimulator = async () => {
    if (!twinLayout) return;
    setIsAnchoring(true);
    try {
      const anchorData = {
        name: `Twin · WM500`,
        description: `Configuración anclada al simulador wm500`,
        nodes: twinNodes,
        edges: twinEdges,
        layout: { ...twinLayout, elevation: twinFloorElevation },
        custom_equipments: null,
      };

      let designId = currentDesignId;

      if (designId) {
        // Actualizar el diseño existente en la nube
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
        // Crear nuevo registro vinculado a este simulador
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

      // Guardar también en localStorage la referencia y el diseño específico
      localStorage.setItem('sim_dhl_v2_twin_anchor_id', designId || '');
      localStorage.setItem('sim_dhl_v2_twin_layout', JSON.stringify({ ...twinLayout, elevation: twinFloorElevation }));
      localStorage.setItem('sim_dhl_v2_twin_node_positions', JSON.stringify(twinNodePositions));
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
      localStorage.setItem('sim_dhl_v2_twin_node_positions', JSON.stringify(next));
      return next;
    });
    setIsAnchored(false);
  };

  const handleCustomClientLogoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputs(prev => ({ ...prev, customClientLogo: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCustomProcessImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setInputs(prev => ({ ...prev, customProcessImage: event.target.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const printReport = async () => {
    const defaultName = `Proyeccion_Industrial_${(inputs.clientName || 'Cliente').replace(/\s+/g, '_')}_WM500`;
    const finalFileName = window.prompt("Ingresa el nombre del archivo PDF a exportar:", defaultName);
    
    if (!finalFileName) return; // User cancelled or left empty
    
    setIsGeneratingPdf(true);
    setPdfProgress(10);
    
    const suffix = activeProject?.id ? `${activeProject.id}_` : '';
    // Las capturas del Gemelo Digital ya están sincronizadas en el estado local (twinSnapshotLateral, etc.)
    // No leemos de localStorage aquí para evitar sobreescribir las capturas en memoria con versiones antiguas o truncadas.
    
    const waitForImages = (el) => {
      const images = el.querySelectorAll('img');
      const promises = Array.from(images).map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise(resolve => {
          img.onload = resolve;
          img.onerror = resolve;
        });
      });
      return Promise.all(promises);
    };

    try {
      setIsPreviewMode(false);
      setIsReportModalOpen(true);
      
      // Esperar a que el componente se monte en el DOM
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const element = reportRef.current;
      if (element) {
        await waitForImages(element);
      }
      
      // Espera de estabilidad del motor de pintado del navegador
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();
      
      const pages = element.querySelectorAll('.pdf-page');

      for (let i = 0; i < pages.length; i++) {
        setPdfProgress(15 + Math.round((i / pages.length) * 80));
        const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) doc.addPage('a4', 'landscape');
        doc.addImage(imgData, 'JPEG', 0, 0, width, height, undefined, 'FAST');
      }

      setPdfProgress(100);
      doc.save(`${finalFileName.endsWith('.pdf') ? finalFileName : finalFileName + '.pdf'}`);
    } catch (err) {
      console.error(err);
      alert('Error al generar PDF: ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
      setIsReportModalOpen(false);
      setPdfProgress(0);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Hoja 1: Parámetros e Indicadores
    const generalData = [
      [`SIMULADOR PARAMÉTRICO lavadora ${inputs.machineName?.toUpperCase() || 'WM-500'}`],
      ['Cliente:', inputs.clientName],
      ['Proyecto:', inputs.projectName],
      ['Subtítulo:', inputs.evaluationName],
      ['Fecha de simulación:', new Date().toLocaleDateString()],
      [],
      ['PARÁMETROS DE ENTRADA', 'Valor', 'Unidad'],
      ['Horas por turno', inputs.hoursPerShift, 'horas'],
      ['Turnos por día', inputs.shiftsPerDay, 'turnos'],
      ['Días de operación por semana', inputs.daysPerWeek, 'días'],
      ['Días de operación por mes', inputs.daysPerMonth, 'días'],
      ['Factor de carga del equipo', inputs.loadFactor, '%'],
      ['Eficiencia operativa / OEE', inputs.oee, '%'],
      ['Tarifa eléctrica', inputs.electricityRate, 'MXN/kWh'],
      ['Densidad del material', inputs.materialDensity, 'kg/m³'],
      ['Peso promedio por carga', inputs.averageLoadWeight, 'kg'],
      ['Requerimiento diario objetivo', inputs.meta_diaria_cajas, 'cajas/día'],
      ['Requerimiento mensual objetivo', inputs.monthlyGoalTon, 'ton/mes'],
      ['Humedad del material', inputs.materialHumidity, '%'],
      [],
      ['RESULTADOS DE CAPACIDAD Y ENERGÍA', 'Valor', 'Unidad'],
      ['Potencia instalada total', results.installedPowerKw.toFixed(2), 'kW'],
      ['Consumo promedio por hora', results.averageHourlyConsumptionKw.toFixed(2), 'kW'],
      ['Producción real por hora', results.realProductionPerHourBoxes.toFixed(2), 'cajas/h'],
      ['Producción diaria real', results.dailyProductionBoxes.toFixed(0), 'cajas/día'],
      ['Producción semanal real', (results.weeklyProductionKg / 1000).toFixed(2), 'ton/sem'],
      ['Producción mensual real', results.monthlyProductionKg.toFixed(0), 'cajas/mes'],
      ['Producción anual real', (results.annualProductionKg / 1000).toFixed(2), 'ton/año'],
      ['Costo eléctrico por hora', results.hourlyElectricityCostMxn.toFixed(2), 'MXN/h'],
      ['Costo eléctrico por día', results.dailyElectricityCostMxn.toFixed(2), 'MXN/día'],
      ['Costo eléctrico mensual', results.monthlyElectricityCostMxn.toFixed(2), 'MXN/mes'],
      ['kWh por 1000 cajas procesadas', results.kwhPer1000Boxes.toFixed(2), 'kWh/kCajas'],
      ['Costo por 1000 Cajas procesadas', results.electricityCostPer1000BoxesMxn.toFixed(2), 'MXN/kCajas'],
      ['Utilización del sistema', (results.systemUtilization * 100).toFixed(1), '%'],
      ['Cobertura del requerimiento', results.requirementCoverage.toFixed(1), '%'],
      ['Reserva operativa', results.operationalReserve.toFixed(1), '%'],
      ['Máquinas requeridas', results.machinesRequired, 'unidades'],
      ['Estado técnico del equipo', results.viabilityState]
    ];
    const wsGeneral = XLSX.utils.aoa_to_sheet(generalData);
    XLSX.utils.book_append_sheet(wb, wsGeneral, 'Resultados Generales');

    // Hoja 2: Análisis de Escenarios
    const scenarioData = [
      ['COMPARATIVA DE ESCENARIOS DE RENDIMIENTO (OEE)'],
      [],
      ['Métrica', 'Conservador (70% OEE)', 'Normal (85% OEE)', 'Alto Rendimiento (95% OEE)'],
      ['Producción Horaria (cajas/h)', (currentNominalCapacity * 0.70).toFixed(0), (currentNominalCapacity * 0.85).toFixed(0), (currentNominalCapacity * 0.95).toFixed(0)],
      ['Producción Diaria (cajas/día)', (scenarioResults.conservador.dailyProdTon * 1000).toFixed(0), (scenarioResults.normal.dailyProdTon * 1000).toFixed(0), (scenarioResults.alto.dailyProdTon * 1000).toFixed(0)],
      ['Costo Energético por kCajas (MXN/kCajas)', scenarioResults.conservador.costPerTon.toFixed(2), scenarioResults.normal.costPerTon.toFixed(2), scenarioResults.alto.costPerTon.toFixed(2)],
      ['Cobertura de Requerimiento (%)', scenarioResults.conservador.coverage.toFixed(1), scenarioResults.normal.coverage.toFixed(1), scenarioResults.alto.coverage.toFixed(1)],
      ['Utilización del Equipo (%)', (scenarioResults.conservador.utilization * 100).toFixed(1), (scenarioResults.normal.utilization * 100).toFixed(1), (scenarioResults.alto.utilization * 100).toFixed(1)],
    ];
    const wsScenarios = XLSX.utils.aoa_to_sheet(scenarioData);
    XLSX.utils.book_append_sheet(wb, wsScenarios, 'Comparación Escenarios');

    XLSX.writeFile(wb, `DATOS_SIMULACION_WM500_${inputs.clientName.replace(/\s+/g, '_')}.xlsx`);
  };

  // --- 5. HOTSPOTS DEL TWIN DIGITAL ---
  // Removido junto con la vista conceptual 2D


  // Generador de Conclusiones Automáticas
  const conclusions = useMemo(() => {
    const utilPct = results.systemUtilization * 100;
    const covPct = results.requirementCoverage;
    const list = [];
    
    if (utilPct < 80) {
      list.push({
        type: 'success',
        text: `Equipo viable con excelente reserva operativa disponible (${results.operationalReserve.toFixed(1)}%). El equipo trabajará holgadamente sin riesgos de fatiga térmica o saturación.`
      });
    } else if (utilPct >= 80 && utilPct <= 95) {
      list.push({
        type: 'warning',
        text: `Equipo viable operando bajo régimen exigente (Utilización: ${utilPct.toFixed(1)}%). Se sugiere monitorear el Filtros y Consumibles y programar paros periódicos de mantenimiento preventivo.`
      });
    } else {
      list.push({
        type: 'danger',
        text: `Riesgo elevado de saturación técnica. La utilización proyectada es de ${utilPct.toFixed(1)}%, operando al límite de su capacidad real. Cualquier imprevisto detendrá el flujo productivo.`
      });
    }

    if (covPct < 100) {
      list.push({
        type: 'recommend',
        text: "Se recomienda encarecidamente añadir una segunda máquina lavadora y secadora WM-500 en paralelo, o bien ampliar el turno diario actual para lograr el requerimiento diario objetivo."
      });
    } else {
      list.push({
        type: 'success',
        text: `La cobertura actual es del ${covPct.toFixed(1)}%, cumpliendo satisfactoriamente el requerimiento objetivo sin necesidad de unidades adicionales.`
      });
    }

    return list;
  }, [results]);

  // Proyecciones mensuales simuladas para gráficos (12 meses)
  const chartData = useMemo(() => {
    const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    return months.map((m, idx) => {
      // Pequeñas variaciones estacionales en producción
      const factor = 0.95 + Math.sin(idx / 1.5) * 0.05; 
      const prodTon = (results.monthlyProductionBoxes || 0) * factor;
      const energyMxn = (results.monthlyElectricityCostMxn || 0) * factor;
      const kwhMonth = ((results.averageHourlyConsumptionKw || 0) * (inputs.hoursPerDay || 24) * (inputs.daysPerMonth || 30)) * factor;
      return {
        name: m,
        Produccion: parseFloat(prodTon.toFixed(1)),
        CostoEnergía: parseFloat(energyMxn.toFixed(0)),
        ConsumoKwh: parseFloat(kwhMonth.toFixed(0)),
        Meta: inputs.monthlyGoalTon || 0
      };
    });
  }, [results, inputs]);

  const hasAnySnapshot = !!(twinSnapshot || twinSnapshotLateral || twinSnapshotSuperior || twinSnapshotIsométrica);
  
  const snapshotPages = [];
  if (twinSnapshotIsométrica) snapshotPages.push({ title: 'PERSPECTIVA ISOMÉTRICA', type: 'Isométrica', src: twinSnapshotIsométrica });
  if (twinSnapshotSuperior) snapshotPages.push({ title: 'PLANTA ARQUITECTÓNICA', type: 'Superior', src: twinSnapshotSuperior });
  if (twinSnapshotLateral) snapshotPages.push({ title: 'ELEVACIÓN LATERAL', type: 'Lateral', src: twinSnapshotLateral });
  if (snapshotPages.length === 0 && twinSnapshot) snapshotPages.push({ title: 'PERSPECTIVA GENERAL', type: 'Libre', src: twinSnapshot });

  let basePagesCount = 0;
  if (pdfConfig.resumen) basePagesCount += 1;
  if (pdfConfig.tabla) basePagesCount += 4;
  if (pdfConfig.analisis) basePagesCount += 1;
  if (pdfConfig.energia) basePagesCount += 1;
  if (pdfConfig.escenarios) basePagesCount += 1;
  if (pdfConfig.financiero) basePagesCount += 1;
  if (pdfConfig.civil) basePagesCount += 1;
  if (pdfConfig.hidrico) basePagesCount += 1;

  const totalPdfPages = basePagesCount + (pdfConfig.twin ? snapshotPages.length : 0);
  let pdfPageIndex = 0;

  // Estilos de Páginas Corporativas en Modal (Pandora 3.0 Standard)
  const S = {
    page: { 
      width: '1120px', 
      height: '792px', 
      background: 'radial-gradient(circle at 90% 8%, rgba(13,148,136,0.04) 0%, rgba(255,255,255,0) 40%), radial-gradient(circle at 10% 92%, rgba(15,118,110,0.03) 0%, rgba(255,255,255,0) 40%), #ffffff', 
      borderRadius: '24px', 
      overflow: 'hidden', 
      position: 'relative',
      border: '1px solid #dbe5ee',
      boxShadow: '0 10px 40px rgba(15,23,42,0.08)',
      boxSizing: 'border-box'
    },
    inner: { 
      padding: '38px 48px 50px', 
      height: '100%', 
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box'
    }
  };

  const REPORT_STYLES = {
    th: { padding: '8px 12px', fontSize: 12, fontWeight: 900, color: '#008299', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '2px solid #b2f5ea', borderTop: '2px solid #b2f5ea', textAlign: 'left' },
    td: { padding: '8px 12px', borderBottom: '1px solid #e2e8f0', color: '#334155', fontWeight: 600 }
  };

  const getSplitTitle = (title) => {
    if (!title) return { line1: '', line2: '' };
    const cleanTitle = title.toUpperCase();
    const match = cleanTitle.match(/^(\d+)\.\s+/);
    const num = match ? match[1] + '. ' : '';
    const withoutNum = cleanTitle.replace(num, '').trim();

    if (withoutNum.includes('ESPECIFICACIONES TÉCNICAS')) return { line1: num + 'CONFIGURACIÓN DEL SISTEMA', line2: withoutNum };
    if (withoutNum.includes('VISTA')) return { line1: num + 'GEMELO DIGITAL 3D', line2: withoutNum };
    if (withoutNum.includes('ESCENARIOS')) return { line1: (num || '6. ') + 'PROYECCIÓN PARAMÉTRICA', line2: withoutNum };
    if (withoutNum.includes('FINANCIER')) return { line1: num + 'ANÁLISIS DE RENTABILIDAD', line2: withoutNum };
    if (withoutNum.includes('OBRA CIVIL') || withoutNum.includes('CONCRETO') || withoutNum.includes('CIMENTACIÓN')) return { line1: num + 'REQUERIMIENTOS ESTRUCTURALES', line2: withoutNum };
    if (withoutNum.includes('ENERGÍA') || withoutNum.includes('ENERGÍA') || withoutNum.includes('CAPACIDAD')) return { line1: num + 'REQUERIMIENTOS OPERATIVOS', line2: withoutNum };
    
    return { line1: num ? num + 'FICHA TÉCNICA Y COMPONENTES' : 'FICHA TÉCNICA Y COMPONENTES', line2: withoutNum };
  };

  const renderPageHeader = (title, subtitle) => {
    const titles = getSplitTitle(title);
    return (
      <div style={{ marginBottom: 25, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        {titles.line2 ? (
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#0f2038', letterSpacing: -0.5, lineHeight: 1.0, fontFamily: 'sans-serif', paddingLeft: 16 }}>
              {titles.line1}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
              <div style={{ width: 4, height: 24, background: '#00c2cb', borderRadius: 2 }} />
              <div style={{ fontSize: 24, fontWeight: 900, color: '#00c2cb', letterSpacing: -0.5, lineHeight: 1.0, fontFamily: 'sans-serif' }}>
                {titles.line2}
              </div>
            </div>
            {subtitle && (
              <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginTop: 8, paddingLeft: 16 }}>
                {subtitle}
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 12 }}>
            <div style={{ width: 4, height: 42, background: '#00c2cb', borderRadius: 2 }} />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f2038', letterSpacing: -0.5, lineHeight: 1.0, fontFamily: 'sans-serif' }}>
                {titles.line1}
              </div>
              {subtitle && (
                <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, marginTop: 6 }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>
        )}
        {inputs.customClientLogo && (
          <img src={inputs.customClientLogo} alt="Logo Cliente" style={{ maxHeight: '45px', maxWidth: '180px', objectFit: 'contain', marginLeft: 'auto' }} />
        )}
      </div>
    );
  };

  const renderPageFooter = (pageNum, total) => (
    <div style={{ width: '100%', borderTop: '1px solid #dbe5ee', paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, flexShrink: 0, marginTop: 'auto' }}>
      <span>{inputs.companyName?.toUpperCase() || 'EMPRESA'} | {inputs.clientName?.toUpperCase() || 'CLIENTE'} | MÁQUINA: {inputs.machineName?.toUpperCase() || 'BWD-250'}</span>
      <span>PÁGINA {pageNum} DE {total}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 md:p-8 font-sans relative overflow-x-hidden">
      
      {/* HEADER DE CONTROL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/alpha/simulators')}
            className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all shadow-sm"
            title="Volver a la galería de simuladores"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              {isEditingProjectName ? (
                <input
                  type="text"
                  value={tempProjectName}
                  onChange={(e) => setTempProjectName(e.target.value)}
                  onBlur={handleSaveProjectName}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveProjectName()}
                  autoFocus
                  className="bg-white border border-cyan-500/50 rounded-lg px-2 py-0.5 text-lg font-black text-slate-800 tracking-wide outline-none focus:ring-1 focus:ring-cyan-500 w-72 uppercase"
                />
              ) : (
                <h1 
                  onClick={() => setIsEditingProjectName(true)}
                  className="text-2xl font-black tracking-tight text-slate-900 uppercase cursor-pointer hover:text-cyan-600 transition-colors flex items-center gap-2 group"
                  title="Hacer click para editar nombre de simulación"
                >
                  {inputs.projectName}
                  <Info className="w-4 h-4 text-slate-400 group-hover:text-cyan-500 transition-colors" />
                </h1>
              )}
              <span className="text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 uppercase animate-pulse">PARAMÉTRICO</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
              <span>Cliente:</span>
              {isEditingClientName ? (
                <input
                  type="text"
                  value={tempClientName}
                  onChange={(e) => setTempClientName(e.target.value)}
                  onBlur={handleSaveClientName}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveClientName()}
                  autoFocus
                  className="bg-white border border-cyan-500/50 rounded-lg px-2 py-0.5 text-xs font-bold text-slate-800 tracking-wide outline-none w-64 uppercase"
                />
              ) : (
                <span 
                  onClick={() => setIsEditingClientName(true)}
                  className="text-cyan-600 cursor-pointer hover:underline flex items-center gap-1 font-black"
                >
                  {inputs.clientName}
                </span>
              )}
              <span className="text-slate-350">|</span>
              <span>{inputs.evaluationName}</span>
            </div>
          </div>
        </div>

        {/* ACCIONES SUPERIORES */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleSaveSimulator}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-cyan-600 border border-cyan-700 hover:bg-cyan-700 text-white transition-all uppercase tracking-wider shadow-sm"
          >
            <Save className="w-4 h-4" />
            Guardar Configuración
          </button>

          <button 
            onClick={() => navigate('/alpha/simulators/wm-500-stable')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-amber-50 border border-amber-200 hover:bg-amber-100 text-amber-700 transition-all uppercase tracking-wider shadow-sm"
            title="Descartar cambios experimentales y volver a la versión de respaldo"
          >
            <RotateCcw className="w-4 h-4 text-amber-600" />
            Versión Estable
          </button>

          <button 
            onClick={() => {
              setActiveTab('twin');
              setIs3DView(true);
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all uppercase tracking-wider shadow-sm ${activeTab === 'twin' && is3DView ? 'bg-cyan-50 border-cyan-300 text-cyan-700' : 'bg-white border border-slate-200 hover:bg-slate-50 text-slate-750'}`}
            title="Ver gemelo digital en el visor 3D"
          >
            <Eye className="w-4 h-4 text-cyan-600" />
            Visualizador 3D
          </button>

          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-all uppercase tracking-wider shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Excel
          </button>

          <button 
            onClick={() => {
              setIsPreviewMode(true);
              setIsReportModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-cyan-50 hover:text-cyan-700 hover:border-cyan-200 text-slate-700 transition-all uppercase tracking-wider shadow-sm"
            title="Previsualizar el diseño del informe"
          >
            <Eye className="w-4 h-4 text-cyan-500" />
            Visualizar Informe
          </button>

          <button 
            onClick={printReport}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-red-50 hover:text-red-750 hover:border-red-200 text-slate-700 transition-all uppercase tracking-wider shadow-sm"
          >
            <Printer className="w-4 h-4 text-red-500" />
            {isGeneratingPdf ? `Generando ${pdfProgress}%` : 'Informe PDF'}
          </button>

          <button 
            onClick={handleResetInputs}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all shadow-sm"
            title="Reiniciar a valores originales"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CUERPO DEL SIMULADOR - COLUMNAS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8 relative">
        
        {/* PANEL IZQUIERDO: VARIABLES EDITABLES (CONFIGURADOR) */}
        {isSidebarOpen && (
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6 relative">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <Sliders className="w-5 h-5 text-cyan-600" />
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Variables Editables</h2>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="p-1 hover:bg-slate-100 rounded-md text-slate-400 hover:text-slate-700 transition-colors" title="Ocultar Panel">
              <Minimize2 className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-y-auto max-h-[75vh] pr-2 custom-scrollbar">
            
            {/* 0. CONFIGURACIÓN DE PESTAÑAS */}
            <details className="group mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-cyan-600 uppercase tracking-wider">0. Configuración de Pestañas</span>
              </summary>
              <div className="p-4 pt-0 space-y-2">
                <span className="block text-[9px] font-bold text-slate-500 uppercase">Activar / Desactivar Secciones:</span>
                <div className="grid grid-cols-1 gap-2">
                  <label className="flex items-center gap-2.5 cursor-pointer bg-white p-2 rounded-lg border border-slate-200 hover:border-cyan-300 transition-colors">
                    <input type="checkbox" checked={!inputs.hideCapex} onChange={e => setInputs(p => ({...p, hideCapex: !e.target.checked}))} className="accent-cyan-600 w-3.5 h-3.5" />
                    <span className="text-[10px] font-black text-slate-850 uppercase">4. CAPEX/OPEX</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer bg-white p-2 rounded-lg border border-slate-200 hover:border-cyan-300 transition-colors">
                    <input type="checkbox" checked={!inputs.hideEnergía} onChange={e => setInputs(p => ({...p, hideEnergía: !e.target.checked}))} className="accent-cyan-600 w-3.5 h-3.5" />
                    <span className="text-[10px] font-black text-slate-850 uppercase">5. ENERGÍA</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer bg-white p-2 rounded-lg border border-slate-200 hover:border-cyan-300 transition-colors">
                    <input type="checkbox" checked={!inputs.hideEscenarios} onChange={e => setInputs(p => ({...p, hideEscenarios: !e.target.checked}))} className="accent-cyan-600 w-3.5 h-3.5" />
                    <span className="text-[10px] font-black text-slate-850 uppercase">6. ESCENARIOS</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer bg-white p-2 rounded-lg border border-slate-200 hover:border-cyan-300 transition-colors">
                    <input type="checkbox" checked={!inputs.hideFinanciero} onChange={e => setInputs(p => ({...p, hideFinanciero: !e.target.checked}))} className="accent-cyan-600 w-3.5 h-3.5" />
                    <span className="text-[10px] font-black text-slate-850 uppercase">7. FINANCIERO</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer bg-white p-2 rounded-lg border border-slate-200 hover:border-cyan-300 transition-colors">
                    <input type="checkbox" checked={!inputs.hideRiesgos} onChange={e => setInputs(p => ({...p, hideRiesgos: !e.target.checked}))} className="accent-cyan-600 w-3.5 h-3.5" />
                    <span className="text-[10px] font-black text-slate-850 uppercase">8. RIESGOS</span>
                  </label>
                </div>
              </div>
            </details>

            {/* 1. METADATOS DEL PROYECTO */}
            <details className="group mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50" open>
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">1. Metadatos del Proyecto</span>
              </summary>
              <div className="p-4 pt-0 grid grid-cols-1 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Empresa</span>
                  <input type="text" value={inputs.companyName || ''} onChange={e => setInputs(p => ({...p, companyName: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none uppercase" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Cliente</span>
                  <input type="text" value={inputs.clientName || ''} onChange={e => setInputs(p => ({...p, clientName: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none uppercase" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Máquina</span>
                  <input type="text" value={inputs.machineName || ''} onChange={e => setInputs(p => ({...p, machineName: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none uppercase" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Fecha</span>
                  <input type="text" value={inputs.evaluationDate || ''} onChange={e => setInputs(p => ({...p, evaluationDate: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none uppercase" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Material Evaluado</span>
                  <input type="text" value={inputs.materialType || ''} onChange={e => setInputs(p => ({...p, materialType: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none uppercase" />
                </div>
              </div>
            </details>

            {/* 2. OPERACIÓN */}
            <details className="group mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-cyan-600 uppercase tracking-wider">2. Operación</span>
              </summary>
              <div className="p-4 pt-0 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Caja a Simular</span>
                    <select value={inputs.activeBoxId || '1'} onChange={e => setInputs(p => ({...p, activeBoxId: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none truncate">
                      {(inputs.cajas || []).map(c => (
                        <option key={c.id} value={c.id}>{c.nombre} ({c.largoCm}cm)</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Capacidad Auto (cajas/h)</span>
                    <div className="w-full bg-slate-100 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-black text-cyan-700 select-none">{new Intl.NumberFormat().format(currentNominalCapacity)} cajas/h</div>
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Vel. Banda (m/h)</span>
                    <input type="number" step="10" value={inputs.conveyorSpeedMH !== undefined ? inputs.conveyorSpeedMH : 160} onChange={e => setInputs(p => ({...p, conveyorSpeedMH: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Gap / Espacio (cm)</span>
                    <input type="number" step="1" value={inputs.boxGapCm !== undefined ? inputs.boxGapCm : 15} onChange={e => setInputs(p => ({...p, boxGapCm: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />
                  </div>
                  <div className="col-span-2">
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Meta Diaria (cajas)</span>
                    <input type="number" step="100" value={inputs.meta_diaria_cajas || 0} onChange={e => setInputs(p => ({...p, dailyGoalKg: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-black text-cyan-600">{inputs.utilization}%</span>
                  </div>
                  <input type="range" min="10" max="100" step="5" value={inputs.utilization || 0} onChange={e => setInputs(p => ({...p, utilization: parseInt(e.target.value) || 0}))} className="w-full accent-cyan-600" />
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Eficiencia (OEE) (%)</span>
                    <span className="text-xs font-black text-cyan-600">{inputs.oee}%</span>
                  </div>
                  <input type="range" min="10" max="100" step="5" value={inputs.oee || 0} onChange={e => setInputs(p => ({...p, oee: parseInt(e.target.value) || 0}))} className="w-full accent-cyan-600" />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Hrs/Día</span>
                    <input type="number" step="0.5" value={inputs.hoursPerDay || 0} onChange={e => setInputs(p => ({...p, hoursPerDay: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 text-center focus:border-cyan-500 focus:outline-none" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Turnos</span>
                    <input type="number" step="1" value={inputs.shiftsPerDay || 0} onChange={e => setInputs(p => ({...p, shiftsPerDay: parseInt(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 text-center focus:border-cyan-500 focus:outline-none" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Días/Mes</span>
                    <input type="number" step="1" value={inputs.daysPerMonth || 0} onChange={e => setInputs(p => ({...p, daysPerMonth: parseInt(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 text-center focus:border-cyan-500 focus:outline-none" />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 grid grid-cols-3 gap-2">
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5 text-center">Largo (m)</span>
                    <input type="number" step="0.1" value={inputs.machineLength} onChange={e => setInputs(p => ({...p, machineLength: parseFloat(e.target.value) || 0}))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-center" />
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5 text-center">Ancho (m)</span>
                    <input type="number" step="0.1" value={inputs.machineWidth} onChange={e => setInputs(p => ({...p, machineWidth: parseFloat(e.target.value) || 0}))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-center" />
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5 text-center">Alto (m)</span>
                    <input type="number" step="0.1" value={inputs.machineHeight} onChange={e => setInputs(p => ({...p, machineHeight: parseFloat(e.target.value) || 0}))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-center" />
                  </div>
                </div>


                {/* Gestión de Cajas / Contenedores */}
                <div className="pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5"><Box className="w-3.5 h-3.5 text-cyan-600"/> Contenedores (Cajas)</span>
                    <button 
                      onClick={() => {
                        const newId = Date.now().toString();
                        setInputs(p => ({
                          ...p, 
                          cajas: [...(p.cajas || []), { id: newId, nombre: 'Nueva Caja', largoCm: 50, anchoCm: 30, altoCm: 20, color: '#cbd5e1', suciedad: 'Polvo' }]
                        }));
                      }}
                      className="p-1 bg-cyan-50 text-cyan-700 rounded hover:bg-cyan-100 transition-colors"
                      title="Añadir Caja"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {(inputs.cajas || []).map((caja, index) => (
                      <div key={caja.id} className="bg-white border border-slate-200 rounded-lg p-2 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                          <input 
                            type="text" 
                            value={caja.nombre}
                            onChange={(e) => {
                              const newCajas = [...inputs.cajas];
                              newCajas[index].nombre = e.target.value;
                              setInputs(p => ({ ...p, cajas: newCajas }));
                            }}
                            className="text-[10px] font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-cyan-500 focus:outline-none w-full mr-2"
                          />
                          <div className="flex items-center gap-1">
                            <input 
                              type="color" 
                              value={caja.color}
                              onChange={(e) => {
                                const newCajas = [...inputs.cajas];
                                newCajas[index].color = e.target.value;
                                setInputs(p => ({ ...p, cajas: newCajas }));
                              }}
                              className="w-4 h-4 p-0 border-0 rounded cursor-pointer"
                              title="Color de la caja"
                            />
                            <button 
                              onClick={() => {
                                setInputs(p => ({ ...p, cajas: p.cajas.filter(c => c.id !== caja.id) }));
                              }}
                              className="text-red-400 hover:text-red-600 p-0.5"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          <div>
                            <span className="block text-[7px] text-slate-400 font-bold uppercase">Largo(cm)</span>
                            <input type="number" step="0.1" value={caja.largoCm} onChange={(e) => {
                              const newCajas = [...inputs.cajas];
                              newCajas[index].largoCm = parseFloat(e.target.value) || 0;
                              setInputs(p => ({ ...p, cajas: newCajas }));
                            }} className="w-full text-[9px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center focus:outline-none focus:border-cyan-500" />
                          </div>
                          <div>
                            <span className="block text-[7px] text-slate-400 font-bold uppercase">Ancho(cm)</span>
                            <input type="number" step="0.1" value={caja.anchoCm} onChange={(e) => {
                              const newCajas = [...inputs.cajas];
                              newCajas[index].anchoCm = parseFloat(e.target.value) || 0;
                              setInputs(p => ({ ...p, cajas: newCajas }));
                            }} className="w-full text-[9px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center focus:outline-none focus:border-cyan-500" />
                          </div>
                          <div>
                            <span className="block text-[7px] text-slate-400 font-bold uppercase">Alto(cm)</span>
                            <input type="number" step="0.1" value={caja.altoCm} onChange={(e) => {
                              const newCajas = [...inputs.cajas];
                              newCajas[index].altoCm = parseFloat(e.target.value) || 0;
                              setInputs(p => ({ ...p, cajas: newCajas }));
                            }} className="w-full text-[9px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center focus:outline-none focus:border-cyan-500" />
                          </div>
                          <div>
                            <span className="block text-[7px] text-slate-400 font-bold uppercase">Suciedad</span>
                            <select value={caja.suciedad} onChange={(e) => {
                              const newCajas = [...inputs.cajas];
                              newCajas[index].suciedad = e.target.value;
                              setInputs(p => ({ ...p, cajas: newCajas }));
                            }} className="w-full text-[9px] font-mono text-slate-700 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 focus:outline-none focus:border-cyan-500">
                              <option value="Ligera">Ligera</option>
                              <option value="Polvo">Polvo</option>
                              <option value="Aceite">Aceite</option>
                              <option value="Pesada">Pesada</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    ))}
                    {(!inputs.cajas || inputs.cajas.length === 0) && (
                      <div className="text-center py-4 text-slate-400 text-[10px] font-bold">
                        No hay cajas registradas
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </details>

            {/* 3. ENERGÍA */}
            <details className="group mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider">3. Energía</span>
              </summary>
              <div className="p-4 pt-0 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Potencia Instalada (kW)</span>
                    <input type="number" step="0.1" value={inputs.customInstalledPowerKw !== undefined ? inputs.customInstalledPowerKw : 37.02} onChange={e => setInputs(p => ({...p, customInstalledPowerKw: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Tarifa (MXN/kWh)</span>
                    <input type="number" step="0.05" value={inputs.electricityRate || 0} onChange={e => setInputs(p => ({...p, electricityRate: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Factor de Carga (%)</span>
                    <span className="text-xs font-black text-cyan-600">{inputs.loadFactor}%</span>
                  </div>
                  <input type="range" min="10" max="100" step="5" value={inputs.loadFactor || 0} onChange={e => setInputs(p => ({...p, loadFactor: parseInt(e.target.value) || 0}))} className="w-full accent-cyan-600" />
                </div>
                {/* --- SUB-PANEL HÍDRICO --- */}
                <div className="mt-6 pt-4 border-t border-slate-200">
                  <div className="flex items-center gap-2 mb-4">
                    <Droplet className="w-4 h-4 text-cyan-600" />
                    <span className="text-[11px] font-black text-slate-800 uppercase tracking-wider">Gestión Hídrica</span>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Capacidad Tanque (L)</span>
                      <input type="number" value={inputs.waterTankLiters || 1200} onChange={e => setInputs(p => ({...p, waterTankLiters: parseFloat(e.target.value) || 0}))} className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-800 text-center focus:border-cyan-500 focus:outline-none" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Recambios Semanales</span>
                      <input type="number" step="0.5" value={inputs.waterChangesPerWeek || 1} onChange={e => setInputs(p => ({...p, waterChangesPerWeek: parseFloat(e.target.value) || 0}))} className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-800 text-center focus:border-cyan-500 focus:outline-none" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Arrastre / Evap (%)</span>
                      <input type="number" step="1" value={inputs.waterDragOutPercent || 5} onChange={e => setInputs(p => ({...p, waterDragOutPercent: parseFloat(e.target.value) || 0}))} className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-800 text-center focus:border-cyan-500 focus:outline-none" />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-600 uppercase">Costo Agua (MXN/m³)</span>
                      <input type="number" step="1" value={inputs.waterCostM3 || 35} onChange={e => setInputs(p => ({...p, waterCostM3: parseFloat(e.target.value) || 0}))} className="w-20 bg-white border border-slate-200 rounded px-2 py-1 text-xs font-bold text-slate-800 text-center focus:border-cyan-500 focus:outline-none" />
                    </div>
                  </div>
                </div>
              </div>
            </details>

            {/* 4. CAPEX */}
            <details className="group mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-emerald-600 uppercase tracking-wider">4. CAPEX</span>
              </summary>
              <div className="p-4 pt-0 grid grid-cols-2 gap-x-3 gap-y-2">
                <div className="col-span-2">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Precio Equipo Base (USD)</span>
                  <div className="relative flex items-center">
                    <span className="absolute left-2.5 text-xs font-black text-emerald-400">$</span>
                    <input type="number" step="100" value={inputs.precioEquipoUsd || 0} onChange={e => setInputs(p => ({...p, precioEquipoUsd: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-emerald-700 focus:border-cyan-500 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">IVA (%)</span>
                  <input type="number" value={inputs.iva || 0} onChange={e => setInputs(p => ({...p, iva: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Tipo de Cambio (MXN)</span>
                  <div className="relative flex items-center">
                    <span className="absolute left-2 text-xs font-black text-slate-400">$</span>
                    <input type="number" step="0.1" value={inputs.tipoCambio || 0} onChange={e => setInputs(p => ({...p, tipoCambio: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg pl-5 pr-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />
                  </div>
                </div>
                <div className="col-span-2 border-t border-slate-200 mt-2 pt-2">
                  <span className="block text-[8px] font-bold text-slate-400 uppercase mb-2">Costos Indirectos (% O Valor Absoluto en USD)</span>
                </div>
                {[
                  { label: 'Maniobras', key: 'porcentajeManiobras' },
                  { label: 'Montaje Mecánico', key: 'porcentajeMontajeMecanico' },
                  { label: 'Obra Civil', key: 'porcentajeObraCivil' },
                  { label: 'Eléctrico Principal', key: 'porcentajeElectricoPrincipal' },
                  { label: 'Canalizaciones', key: 'porcentajeCanalizacionProtecciones' },
                  { label: 'Extracción Polvo', key: 'porcentajeExtraccionPolvo' },
                  { label: 'Seguridad Ind.', key: 'porcentajeSeguridadIndustrial' },
                  { label: 'Ingeniería', key: 'porcentajeIngenieriaSupervision' },
                  { label: 'Contingencia', key: 'porcentajeContingencia' }
                ].map(item => (
                  <div key={item.key} className="flex flex-col gap-0.5">
                    <span className="text-[8px] font-bold text-slate-500 uppercase leading-tight truncate" title={item.label}>{item.label}</span>
                    <input type="number" step="1" value={inputs[item.key] || 0} onChange={e => setInputs(p => ({...p, [item.key]: parseFloat(e.target.value) || 0}))} className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right" />
                  </div>
                ))}
              </div>
            </details>

            {/* 5. OPEX */}
            <details className="group mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">5. OPEX Mensual (MXN)</span>
              </summary>
              <div className="p-4 pt-0 grid grid-cols-2 gap-x-3 gap-y-2">
                {[
                  { label: 'Operadores/Turno', key: 'operadoresPorTurno', isMxn: false },
                  { label: 'Sueldo Op. (Mes MXN)', key: 'sueldoOperadorMensual', isMxn: true },
                  { label: 'Supervisores/Turno', key: 'supervisoresPorTurno', isMxn: false },
                  { label: 'Sueldo Sup. (Mes MXN)', key: 'sueldoSupervisorMensual', isMxn: true },
                  { label: 'Mantenimiento Base/Año %', key: 'mantenimientoAnualPorcentaje', isMxn: false, full: true },
                  { label: 'Detergentes (MXN)', key: 'filtrosMensualMxn', isMxn: true },
                  { label: 'Refacciones (MXN)', key: 'refaccionesMensualMxn', isMxn: true },
                  { label: 'Lubricación (MXN)', key: 'lubricacionMensualMxn', isMxn: true },
                  { label: 'Limpieza (MXN)', key: 'limpiezaMensualMxn', isMxn: true },
                  { label: 'Consumibles (MXN)', key: 'consumiblesMensualMxn', isMxn: true },
                  { label: 'Otros OPEX (MXN)', key: 'otrosOpexMensualMxn', isMxn: true },
                ].map((item, idx) => (
                  <div key={item.key} className={`flex flex-col gap-0.5 ${item.full ? 'col-span-2 border-t border-slate-200 pt-2 mt-1' : ''}`}>
                    <span className="text-[8px] font-bold text-slate-500 uppercase truncate">{item.label}</span>
                    <div className="relative flex items-center">
                      {item.isMxn && <span className="absolute left-2 text-[10px] font-black text-rose-400">$</span>}
                      <input 
                        type="number" 
                        value={inputs[item.key] || 0} 
                        onChange={e => setInputs(p => ({...p, [item.key]: parseFloat(e.target.value) || 0}))} 
                        className={`w-full bg-white border border-slate-200 rounded-lg ${item.isMxn ? 'pl-5 pr-2' : 'px-2'} py-1 text-[10px] font-bold ${item.isMxn ? 'text-rose-700' : 'text-slate-800'} focus:border-cyan-500 focus:outline-none`} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </details>

            {/* 6. FINANCIERO */}
            <details className="group mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-purple-600 uppercase tracking-wider">6. Financiero</span>
              </summary>
              <div className="p-4 pt-0 space-y-3">
                <div className="flex bg-slate-200 p-1 rounded-lg">
                  <button onClick={() => setInputs(p => ({...p, usarModoIngresoVenta: true, usarModoAhorroInterno: false}))} className={`flex-1 text-[9px] font-black uppercase py-1.5 rounded-md transition-all ${inputs.usarModoIngresoVenta ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>Ingreso por Venta</button>
                  <button onClick={() => setInputs(p => ({...p, usarModoIngresoVenta: false, usarModoAhorroInterno: true}))} className={`flex-1 text-[9px] font-black uppercase py-1.5 rounded-md transition-all ${inputs.usarModoAhorroInterno ? 'bg-white shadow-sm text-purple-700' : 'text-slate-500 hover:text-slate-700'}`}>Ahorro Interno</button>
                </div>
                
                {inputs.usarModoIngresoVenta && (
                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Precio de Venta (MXN/kCajas)</span>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs font-black text-purple-400">$</span>
                      <input type="number" step="10" value={inputs.precioVentaTonMxn || 0} onChange={e => setInputs(p => ({...p, precioVentaTonMxn: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-purple-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-purple-800 focus:border-purple-500 focus:outline-none" />
                    </div>
                  </div>
                )}
                {inputs.usarModoAhorroInterno && (
                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Ahorro Generado (MXN/kCajas)</span>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs font-black text-purple-400">$</span>
                      <input type="number" step="10" value={inputs.ahorroPorTonMxn || 0} onChange={e => setInputs(p => ({...p, ahorroPorTonMxn: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-purple-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-purple-800 focus:border-purple-500 focus:outline-none" />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-2">
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Tasa Desc. (%)</span>
                    <input type="number" step="1" value={inputs.tasaDescuento} onChange={e => setInputs(p => ({...p, tasaDescuento: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-800" />
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Vida Útil (Años)</span>
                    <input type="number" step="1" value={inputs.vidaUtilAnios} onChange={e => setInputs(p => ({...p, vidaUtilAnios: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-800" />
                  </div>
                </div>
              </div>
            </details>

            {/* 7. RIESGOS Y MANTENIMIENTO */}
            <details className="group mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-red-500 uppercase tracking-wider">7. Riesgos y Mantenimiento</span>
              </summary>
              <div className="p-4 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: 'Riesgo Polvo', key: 'riesgoPolvo', options: ['bajo', 'medio', 'alto'] },
                    { label: 'Riesgo Incendio', key: 'riesgoIncendio', options: ['bajo', 'medio', 'alto'] },
                    { label: 'Riesgo Metales', key: 'riesgoMetal', options: ['bajo', 'medio', 'alto'] },
                    { label: 'Riesgo Ruido', key: 'riesgoRuido', options: ['bajo', 'medio', 'alto'] },
                  ].map(item => (
                    <div key={item.key}>
                      <span className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">{item.label}</span>
                      <select value={inputs[item.key]} onChange={e => setInputs(p => ({...p, [item.key]: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-1 py-1 text-[10px] font-bold text-slate-800 uppercase outline-none">
                        {item.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-2 border-t border-slate-200 pt-2">
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Vida Filtros (Hrs)</span>
                    <input type="number" step="50" value={inputs.vidaUtilCuchillasHoras || ''} onChange={e => setInputs(p => ({...p, vidaUtilCuchillasHoras: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-800 focus:border-red-500 focus:outline-none" />
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Frecuencia Mtto (Hrs)</span>
                    <input type="number" step="10" value={inputs.frecuenciaMantenimientoHoras || ''} onChange={e => setInputs(p => ({...p, frecuenciaMantenimientoHoras: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-[10px] font-bold text-slate-800 focus:border-red-500 focus:outline-none" />
                  </div>
                </div>
                <div className="border-t border-slate-200 pt-2 space-y-2">
                  <span className="block text-[9px] font-bold text-slate-500 uppercase">Requisitos de Seguridad</span>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { label: 'Extracción Polvo', key: 'requiereExtraccionPolvo' },
                      { label: 'Sistema Incendio', key: 'requiereSistemaContraIncendio' },
                      { label: 'Cabina Acústica', key: 'requiereCabinaAcustica' },
                      { label: 'Protocolo LOTO', key: 'requiereLOTO' },
                      { label: 'Guardas Físicas', key: 'requiereGuardas' },
                      { label: 'E-Stop', key: 'requiereEStop' }
                    ].map(item => (
                      <label key={item.key} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={inputs[item.key]} onChange={e => setInputs(p => ({...p, [item.key]: e.target.checked}))} className="accent-red-500 w-3 h-3" />
                        <span className="text-[9px] font-bold text-slate-700 uppercase">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </details>

            {/* 8. OBRA CIVIL Y CIMENTACIÓN */}
            <details className="group mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-wider">8. Obra Civil y Cimentación</span>
              </summary>
              <div className="p-4 pt-0 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Espesor Piso (cm)</span>
                    <input type="number" value={inputs.civilEspesorPisoCm || ''} onChange={e => setInputs(p => ({...p, civilEspesorPisoCm: parseInt(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none" />
                  </div>
                  <div>
                    <span className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Resistencia Concreto (f'c)</span>
                    <input type="number" value={inputs.civilConcretoFc || ''} onChange={e => setInputs(p => ({...p, civilConcretoFc: parseInt(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none" />
                  </div>
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Carga Máxima (Ton/m²)</span>
                  <input type="number" step="0.5" value={inputs.civilCargaSoportada || ''} onChange={e => setInputs(p => ({...p, civilCargaSoportada: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Área Requerida (m²)</span>
                  <input type="number" value={inputs.civilAreaRequeridaM2 || ''} onChange={e => setInputs(p => ({...p, civilAreaRequeridaM2: parseInt(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Excavación Base (m³)</span>
                  <input type="number" step="0.1" value={inputs.civilExcavacionM3 || ''} onChange={e => setInputs(p => ({...p, civilExcavacionM3: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none" />
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Refuerzo Estructural</span>
                  <input type="text" value={inputs.civilRefuerzoPiso || ''} onChange={e => setInputs(p => ({...p, civilRefuerzoPiso: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none uppercase" />
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-500 uppercase mb-0.5">Acabado Piso</span>
                  <input type="text" value={inputs.civilAcabadoPiso || ''} onChange={e => setInputs(p => ({...p, civilAcabadoPiso: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-amber-500 focus:outline-none uppercase" />
                </div>
              </div>
            </details>

          </div>
        </div>
        )}

        {/* PESTAÑA LATERAL FLOTANTE CUANDO ESTÁ CERRADO */}
        {!isSidebarOpen && (
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="absolute left-0 top-10 bg-slate-800 text-white p-3 pr-4 rounded-r-2xl shadow-xl hover:bg-slate-700 transition-all z-50 flex items-center gap-3 border border-l-0 border-slate-600"
            title="Abrir Variables Editables"
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[11px] font-black uppercase tracking-widest">Configurar</span>
          </button>
        )}

        {/* PANEL DERECHO: NAVEGACIÓN Y REPORTES INDUSTRIALES */}
        <div className={`${isSidebarOpen ? 'lg:col-span-8' : 'lg:col-span-12'} flex flex-col gap-6 transition-all duration-300 relative`}>
          
          {/* TABS DE SECCIÓN */}
          <div className={`flex overflow-x-auto bg-slate-200 p-1.5 rounded-2xl gap-1 scrollbar-hide whitespace-nowrap ${!isSidebarOpen ? 'ml-36' : ''}`}>
            {/* BOTÓN EXTRA PARA OCULTAR (sólo si hay espacio o dentro del tab bar) */}
            {isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider text-center bg-slate-800 text-white hover:bg-slate-700 flex-shrink-0 flex items-center gap-2 mr-2"
                title="Cerrar Panel"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cerrar Variables</span>
              </button>
            )}
            {[
              { id: 'resumen', label: 'Portada' },
              { id: 'operacion', label: 'Operación' },
              { id: 'analisis', label: 'Análisis' },
              { id: 'twin', label: 'Twin 3D' },
              { id: 'tabla', label: 'Métricas' },
              { id: 'capex', label: 'CAPEX/OPEX', hide: inputs.hideCapex },
              { id: 'energia', label: 'Energía', hide: inputs.hideEnergía },
              { id: 'escenarios', label: 'Escenarios', hide: inputs.hideEscenarios },
              { id: 'financiero', label: 'Financiero', hide: inputs.hideFinanciero },
              { id: 'riesgos', label: 'Riesgos', hide: inputs.hideRiesgos },
              { id: 'civil', label: 'Obra Civil' },
            ].filter(t => !t.hide).map((t, idx) => {
              const numberedLabel = `${idx + 1}. ${t.label}`;
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider text-center ${activeTab === t.id ? 'bg-white text-cyan-800 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-300'}`}
                  title={numberedLabel}
                >
                  {numberedLabel}
                </button>
              );
            })}
          </div>

          {/* TAB 1: PORTADA EJECUTIVA */}
          {activeTab === 'resumen' && (
            <div className="space-y-6">
              
              {/* BANNER DE INFORME INDUSTRIAL */}
              <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-3xl p-8 relative overflow-hidden shadow-sm">
                <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-cyan-500/10 skew-x-12 transform origin-bottom-right pointer-events-none" />
                <div className="relative z-10 flex flex-col justify-between h-full">
                  <div>
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest font-mono">INFORME TÉCNICO DE CAPACIDAD</span>
                    <div className="flex items-center gap-3 mt-1">
                      {isEditingMachineName ? (
                        <div className="flex items-center gap-2">
                          <span className="text-3xl font-black text-white uppercase tracking-tight">SIMULADOR PARAMÉTRICO</span>
                          <input
                            type="text"
                            value={tempMachineName}
                            onChange={(e) => setTempMachineName(e.target.value)}
                            onBlur={handleSaveMachineName}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveMachineName()}
                            autoFocus
                            className="bg-slate-800 border border-cyan-500/50 rounded-lg px-2 py-0.5 text-3xl font-black text-white tracking-wide outline-none focus:ring-1 focus:ring-cyan-500 w-56 uppercase"
                          />
                        </div>
                      ) : (
                        <h2 
                          onClick={() => setIsEditingMachineName(true)}
                          className="text-3xl font-black text-white uppercase tracking-tight cursor-pointer hover:text-cyan-400 transition-colors flex items-center gap-2 group"
                          title="Hacer click para editar modelo del equipo"
                        >
                          SIMULADOR PARAMÉTRICO {inputs.machineName || 'WM-500'}
                          <Info className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                        </h2>
                      )}
                      {renderPdfToggleButton('resumen', 'Portada')}
                    </div>
                    {isEditingEvaluationName ? (
                      <input
                        type="text"
                        value={tempEvaluationName}
                        onChange={(e) => setTempEvaluationName(e.target.value)}
                        onBlur={handleSaveEvaluationName}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEvaluationName()}
                        autoFocus
                        className="bg-slate-800 border border-cyan-500/50 rounded-lg px-2 py-0.5 text-xs font-bold text-white uppercase tracking-wider outline-none focus:ring-1 focus:ring-cyan-500 w-96 mt-1"
                      />
                    ) : (
                      <p 
                        onClick={() => setIsEditingEvaluationName(true)}
                        className="text-xs text-slate-300 font-bold uppercase tracking-wider mt-1 cursor-pointer hover:text-white transition-colors flex items-center gap-1.5 group"
                        title="Hacer click para editar descripción de la evaluación"
                      >
                        {inputs.evaluationName}
                        <Info className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                      </p>
                    )}
                  </div>
                  <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/10 pt-6">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Cliente</span>
                      <p className="text-sm font-bold text-white uppercase truncate mt-0.5">{inputs.clientName}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fecha Proyección</span>
                      <p className="text-sm font-bold text-white mt-0.5">{new Date().toLocaleDateString()}</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">OEE Evaluado</span>
                      <p className="text-sm font-bold text-cyan-400 mt-0.5">{inputs.oee}%</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Estado Operativo</span>
                      <p className="text-sm font-black text-cyan-400 mt-0.5">VIABLE</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* GRUPO DE INDICADORES PRINCIPALES (KPI CARDS) */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                
                {/* Capacidad Real */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-all hover:border-cyan-300 group">
                  {isEditingCapacityTitle ? (
                    <div className="flex items-center gap-2 w-full">
                      <input
                        type="text"
                        value={tempCapacityTitle}
                        onChange={(e) => setTempCapacityTitle(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-black text-slate-900 uppercase tracking-wider focus:outline-none focus:border-cyan-500"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveCapacityTitle()}
                      />
                      <button onClick={handleSaveCapacityTitle} className="text-green-600 hover:bg-green-50 p-1 rounded-lg transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <span 
                      className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5 group-hover:text-cyan-600 cursor-pointer"
                      onClick={() => setIsEditingCapacityTitle(true)}
                    >
                      <Activity className="w-3.5 h-3.5 text-cyan-600" />
                      {inputs.capacityCardTitle || 'CAPACIDAD REAL AJUSTADA'} <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                  )}
                  
                  <div className="mt-4">
                    <span className="text-3xl font-black text-slate-900">{new Intl.NumberFormat().format(results.realProductionPerHourBoxes.toFixed(0))}</span>
                    <span className="text-xs font-bold text-slate-400 ml-1">cajas/h</span>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Nominal:</span>
                      <div>
                        <span className="text-slate-700 font-black text-sm">{new Intl.NumberFormat().format(currentNominalCapacity)}</span> cajas/h
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Factor (OEE):</span>
                      <div>
                        <input 
                          type="number"
                          value={inputs.oee}
                          onChange={(e) => setInputs(prev => ({ ...prev, oee: parseInt(e.target.value) || 0 }))}
                          className="w-12 bg-transparent border-b border-dashed border-slate-400 focus:border-cyan-500 focus:outline-none text-slate-700 px-0.5 group-hover:text-cyan-700 font-black text-right text-sm"
                          step="1" max="100" min="1"
                        /> %
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      
                      <div>
                        <input 
                          type="number"
                          className="w-12 bg-transparent border-b border-dashed border-slate-400 focus:border-cyan-500 focus:outline-none text-slate-700 px-0.5 group-hover:text-cyan-700 font-black text-right text-sm"
                          step="1" max="100" min="1"
                        /> %
                      </div>
                    </div>
                  </div>
                </div>

                {/* Producción diaria */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-cyan-600" />
                    Producción Diaria
                  </span>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-slate-900">{new Intl.NumberFormat().format(results.realProductionPerHourBoxes.toFixed(0))}</span>
                    <span className="text-xs font-bold text-slate-400 ml-1">cajas/día</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-1">Horas operando: {results.hoursPerDay}h</span>
                </div>

                {/* Consumo promedio */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-600" />
                    Consumo Promedio
                  </span>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-slate-900">{results.averageHourlyConsumptionKw.toFixed(1)}</span>
                    <span className="text-xs font-bold text-slate-400 ml-1">kWh</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-1">Potencia: {results.installedPowerKw.toFixed(1)} kW inst.</span>
                </div>

                {/* Costo por 1000 Cajas */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-cyan-600" />
                    Costo por 1000 Cajas
                  </span>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-slate-900">${results.electricityCostPer1000BoxesMxn.toFixed(1)}</span>
                    <span className="text-xs font-bold text-slate-400 ml-1">MXN/kCajas</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-1">Eficiencia: {results.kwhPer1000Boxes.toFixed(1)} kWh/kCajas</span>
                </div>

                {/* Cobertura */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Percent className="w-3.5 h-3.5 text-cyan-600" />
                    Cobertura de Meta
                  </span>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-slate-900">{results.requirementCoverage.toFixed(1)}%</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-1">Objetivo: {new Intl.NumberFormat().format(inputs.meta_diaria_cajas)} cajas/día</span>
                </div>

                {/* Viabilidad/Estado */}
                <div className={`border rounded-2xl p-5 flex flex-col justify-between shadow-sm transition-colors ${results.viabilityColor}`}>
                  <span className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Viabilidad del Equipo
                  </span>
                  <div className="mt-4">
                    <span className="text-lg font-black uppercase break-words tracking-tight leading-tight">{results.viabilityState}</span>
                  </div>
                  <span className="text-[9px] font-mono mt-1">Utilización: {(results.systemUtilization * 100).toFixed(1)}%</span>
                </div>

              </div>

              {/* RESUMEN DE PROYECCIONES RÁPIDAS */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-4 border-b border-slate-100 pb-3">Resumen Proyectado de Operación</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Producción Semanal</span>
                    <span className="text-lg font-black text-slate-800">{(results.weeklyProductionKg / 1000).toFixed(1)} ton</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Producción Mensual</span>
                    <span className="text-lg font-black text-slate-800">{(results.monthlyProductionKg / 1000).toFixed(1)} ton</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Costo Eléctrico Día</span>
                    <span className="text-lg font-black text-slate-800">${new Intl.NumberFormat().format(results.dailyElectricityCostMxn.toFixed(0))} MXN</span>
                  </div>
                  <div>
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Costo Eléctrico Mes</span>
                    <span className="text-lg font-black text-slate-800">${new Intl.NumberFormat().format(results.monthlyElectricityCostMxn.toFixed(0))} MXN</span>
                  </div>
                </div>
              </div>

              {/* CONCLUSIONES RÁPIDAS AUTOMÁTICAS */}
              <div className="bg-cyan-50/50 border border-cyan-150 rounded-3xl p-6 flex flex-col gap-4">
                <h4 className="text-xs font-black uppercase tracking-wider text-cyan-900 flex items-center gap-2">
                  <Info className="w-4 h-4 text-cyan-600" />
                  Dictamen Técnico y Recomendaciones Ejecutivas
                </h4>
                <div className="space-y-3">
                  {conclusions.map((c, i) => (
                    <div key={i} className="flex gap-2 text-xs leading-relaxed font-semibold text-slate-700">
                      <ArrowRight className="w-4 h-4 text-cyan-600 shrink-0 mt-0.5" />
                      <span>{c.text}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* TAB 1.5: OPERACIÓN Y FLUJO */}
          {activeTab === 'operacion' && (
            <div className="space-y-6">
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <Box className="w-5 h-5 text-cyan-600" />
                    Parámetros Operativos
                  </h3>
                  {renderPdfToggleButton('tabla', 'Flujo de Proceso')}
                </div>

                {/* FLUJO DE PROCESO (UI Version of the PDF section) */}
                <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mb-8">
                  {[
                    { num: '01', title: 'ALIMENTACIÓN', desc: 'Carga continua de cajas plásticas en la banda de entrada para su procesamiento automático.', hex: '#14b8a6' },
                    { num: '02', title: 'INGRESO AL TÚNEL', desc: 'La banda transportadora conduce las cajas al área de lavado de manera estable y controlada.', hex: '#3b82f6' },
                    { num: '03', title: 'LAVADO POR ASPERSIÓN', desc: 'Sistema de limpieza con agua caliente a 60-80 °C y presión de 5.0 bar para remover suciedad, polvo, aceites y líquidos.', hex: '#f59e0b' },
                    { num: '04', title: 'RECIRCULACIÓN DE AGUA', desc: 'El sistema reutiliza hasta el 85% del agua mediante filtración, trampas y recirculación interna.', hex: '#8b5cf6' },
                    { num: '05', title: 'SECADO', desc: 'Secado por soplado de aire en banda externa de 5 metros con 4 secadores de alta velocidad.', hex: '#10b981' },
                    { num: '06', title: 'DESCARGA FINAL', desc: 'Salida continua de cajas limpias con eficiencia de lavado de 90-95% y secado de 80-90%.', hex: '#ef4444' }
                  ].map((step, idx) => (
                    <div key={idx} className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <span className="text-4xl font-black" style={{ color: step.hex }}>{step.num}</span>
                      </div>
                      <span className="text-xs font-black mb-2" style={{ color: step.hex }}>{step.title}</span>
                      <p className="text-[10px] text-slate-500 font-bold leading-relaxed">{step.desc}</p>
                    </div>
                  ))}
                </div>

                {/* DETALLE DE CAJA ACTIVA */}
                <div className="bg-[#0f2038] rounded-xl p-6 text-white grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div>
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1 block">Perfil de Simulación Actual</span>
                    <h4 className="text-xl font-black mb-4">{activeBox.nombre}</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <span className="text-xs text-slate-400 font-bold">Dimensiones (L x A x H)</span>
                        <span className="text-sm font-black">{activeBox.largoCm} x {activeBox.anchoCm} x {activeBox.altoCm} cm</span>
                      </div>
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <span className="text-xs text-slate-400 font-bold">Color Identificador</span>
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: activeBox.color }} />
                          <span className="text-sm font-black">{activeBox.color}</span>
                        </div>
                      </div>
                      <div className="flex justify-between items-center pb-2">
                        <span className="text-xs text-slate-400 font-bold">Capacidad Teórica (por banda)</span>
                        <span className="text-sm font-black text-cyan-400">{new Intl.NumberFormat().format(currentNominalCapacity)} cajas/h</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Visor simulado de la caja */}
                  <div className="flex items-center justify-center bg-white/5 rounded-xl border border-white/10 p-8 h-full min-h-[200px]">
                    <div className="relative flex items-center justify-center w-full h-full perspective-[800px]">
                      <div className="relative" style={{
                        width: `${Math.min(activeBox.largoCm * 2, 240)}px`,
                        height: `${Math.min(activeBox.anchoCm * 2, 160)}px`,
                        backgroundColor: activeBox.color,
                        border: '2px solid rgba(255,255,255,0.2)',
                        boxShadow: `0 20px 40px -10px ${activeBox.color}66, inset 0 0 20px rgba(0,0,0,0.2)`,
                        borderRadius: '8px',
                        transform: 'rotateX(20deg) rotateY(-20deg)',
                        transformStyle: 'preserve-3d'
                      }}>
                        <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent rounded-lg" />
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white/40 font-black text-xl">{activeBox.largoCm}cm</div>
                      </div>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[9px] font-black tracking-widest text-white/50">
                        REPRESENTACIÓN ESCALADA
                      </div>
                    </div>
                  </div>
                </div>

                {/* TABLA COMPLETA DE CONTENEDORES */}
                <div className="mt-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                      <Box className="w-5 h-5 text-cyan-600" />
                      Modelos de Contenedores Evaluados
                    </h3>
                  </div>
                  <div className="overflow-x-auto bg-white rounded-xl border border-slate-200">
                    <table className="w-full text-left text-[10px] font-bold text-slate-700 whitespace-nowrap">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 uppercase tracking-wider text-slate-500">
                          <th className="py-3 px-4">Mod</th>
                          <th className="py-3 px-4">Nombre</th>
                          <th className="py-3 px-4">Medidas (L x A x H) CM</th>
                          <th className="py-3 px-4 text-center">Suciedad</th>
                          <th className="py-3 px-4 text-right">Cap C/H</th>
                          <th className="py-3 px-4 text-right">Cap/Día</th>
                          <th className="py-3 px-4 text-right">Req/Día</th>
                          <th className="py-3 px-4 text-right">Hrs Req.</th>
                          <th className="py-3 px-4 text-center">Estado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {inputs.cajas.map((caja, idx) => {
                          const gapCm = inputs.boxGapCm || 15;
                          const speedCmMin = ((inputs.conveyorSpeedMH !== undefined ? inputs.conveyorSpeedMH : 160) / 60) * 100;
                          const spaceCm = caja.largoCm + gapCm;
                          const boxPerMin = speedCmMin / spaceCm;
                          const capCH = boxPerMin * 60 * ((inputs.oee || 85) / 100);
                          const capDia = capCH * ((inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1));
                          const reqDia = inputs.meta_diaria_cajas || 3000;
                          const hrsReq = reqDia / capCH;
                          const isViable = hrsReq <= (((inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1)) + 0.5); // Margen de 30 min de tolerancia
                          
                          return (
                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                              <td className="py-2.5 px-4">
                                <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: caja.color }} title={caja.color} />
                              </td>
                              <td className="py-2.5 px-4 font-black text-slate-800">{caja.nombre}</td>
                              <td className="py-2.5 px-4 text-slate-600">{caja.largoCm} x {caja.anchoCm} x {caja.altoCm} cm</td>
                              <td className="py-2.5 px-4 text-center">
                                <select 
                                  className="bg-transparent border-b border-dashed border-slate-300 focus:outline-none focus:border-cyan-500 font-bold text-slate-600 cursor-pointer"
                                  value={caja.suciedad || 'Media'}
                                  onChange={(e) => {
                                    const newCajas = [...inputs.cajas];
                                    newCajas[idx].suciedad = e.target.value;
                                    setInputs(p => ({...p, cajas: newCajas}));
                                  }}
                                >
                                  <option value="Baja">Baja</option>
                                  <option value="Media">Media</option>
                                  <option value="Alta">Alta</option>
                                </select>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-cyan-700">{new Intl.NumberFormat().format(capCH.toFixed(1))}</td>
                              <td className="py-2.5 px-4 text-right font-mono">{new Intl.NumberFormat().format(capDia.toFixed(0))}</td>
                              <td className="py-2.5 px-4 text-right">
                                <input 
                                  type="number" 
                                  value={reqDia}
                                  onChange={(e) => setInputs(p => ({...p, metaProduccionCajasDia: parseInt(e.target.value)||0}))}
                                  className="w-16 bg-transparent border-b border-dashed border-slate-300 text-right focus:outline-none focus:border-cyan-500 font-mono text-slate-800 font-bold" 
                                />
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-600">{hrsReq.toFixed(1)}h</td>
                              <td className="py-2.5 px-4 text-center">
                                <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase tracking-wider ${isViable ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {isViable ? '✓ VIABLE' : '✕ EXCEDE'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <span className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-1.5 mb-1"><Activity className="w-3.5 h-3.5" /> Criterios de Viabilidad</span>
                      <p className="text-[9px] text-slate-500 leading-relaxed">Las cajas que requieren más horas operativas de las disponibles por día ({(inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1)}h) se marcan como EXCEDE en rojo para indicar sobrecarga en la línea.</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <span className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-1.5 mb-1"><AlertCircle className="w-3.5 h-3.5" /> Ajuste por Suciedad</span>
                      <p className="text-[9px] text-slate-500 leading-relaxed">El nivel de suciedad (Baja, Media, Alta) impacta directamente en la velocidad requerida de la banda y en el volumen de dosificación química.</p>
                    </div>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                      <span className="text-[10px] font-black text-slate-700 uppercase flex items-center gap-1.5 mb-1"><Maximize2 className="w-3.5 h-3.5" /> Espaciamiento Mecánico</span>
                      <p className="text-[9px] text-slate-500 leading-relaxed">Se calcula una holgura o "gap" mecánico de {inputs.boxGapCm || 15} cm entre cajas para prevenir colisiones y asegurar el secado térmico uniforme de cada unidad.</p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {activeTab === 'analisis' && (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-8 border border-slate-200 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                  <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-cyan-600" />
                    Capacidad vs Requerimiento | Análisis de la Línea
                  </h3>
                  {renderPdfToggleButton('analisis', 'Análisis de la Línea')}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* CHART PANEL */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                    <h4 className="text-xs font-black text-slate-800 mb-6">Capacidad vs Requerimiento por Modelo</h4>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[{
                            name: activeBox.nombre,
                            CapDia: ((((inputs.conveyorSpeedMH !== undefined ? inputs.conveyorSpeedMH : 160) / 60) * 100) / (activeBox.largoCm + (inputs.boxGapCm || 15))) * 60 * ((inputs.oee || 85) / 100) * (inputs.hoursPerDay || 20),
                            ReqDia: inputs.meta_diaria_cajas || 3000
                          }]}
                          margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            itemStyle={{ fontSize: '11px', fontWeight: 700 }}
                            formatter={(value) => new Intl.NumberFormat().format(value.toFixed(0))}
                          />
                          <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 700, paddingTop: '20px' }} />
                          <Bar dataKey="CapDia" name="Cap/Día" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={60} />
                          <Bar dataKey="ReqDia" name="Req/Día" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={60} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* TABLE PANEL */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                    <h4 className="text-xs font-black text-slate-800 mb-2">Lavado y Secado — Parámetros Y1–Y5</h4>
                    <span className="text-[10px] font-bold text-slate-500 mb-6 block">Ref: {activeBox.nombre} · Rate base: {new Intl.NumberFormat().format(inputs.meta_diaria_cajas || 3000)} cajas/día</span>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[10px] font-bold text-slate-700 whitespace-nowrap">
                        <thead>
                          <tr className="border-b border-slate-200 uppercase tracking-wider text-slate-500">
                            <th className="py-2 px-2">AÑO</th>
                            <th className="py-2 px-2 text-center">HRS B</th>
                            <th className="py-2 px-2 text-center">EF/T</th>
                            <th className="py-2 px-2 text-center">TURN</th>
                            <th className="py-2 px-2 text-center">T.DISP</th>
                            <th className="py-2 px-2 text-right">REQ/H</th>
                            <th className="py-2 px-2 text-right">CAP/H</th>
                            <th className="py-2 px-2 text-right">BAL.</th>
                            <th className="py-2 px-2 text-right">COB.</th>
                            <th className="py-2 px-2 text-center">LÍNEAS</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Array.from({length: 5}).map((_, i) => {
                            const reqDia = inputs.meta_diaria_cajas || 3000;
                            const speedCmMin = ((inputs.conveyorSpeedMH !== undefined ? inputs.conveyorSpeedMH : 160) / 60) * 100;
                            const spaceCm = activeBox.largoCm + (inputs.boxGapCm || 15);
                            const capH = (speedCmMin / spaceCm) * 60 * ((inputs.oee || 85) / 100);
                            
                            const hrsB = 48 - (i * 2);
                            const hrsPerShiftDay = hrsB / 6;
                            const efT = hrsPerShiftDay * ((inputs.oee || 85) / 100);
                            const turn = inputs.shiftsPerDay || 2;
                            const tDisp = efT * turn;
                            const reqH = reqDia / tDisp;
                            const bal = capH - reqH;
                            const cob = (capH / reqH) * 100;

                            return (
                              <tr key={i} className="hover:bg-white transition-colors">
                                <td className="py-2.5 px-2 text-cyan-600">Y{i+1}</td>
                                <td className="py-2.5 px-2 text-center">{hrsB}</td>
                                <td className="py-2.5 px-2 text-center">{efT.toFixed(2)}</td>
                                <td className="py-2.5 px-2 text-center">{turn}</td>
                                <td className="py-2.5 px-2 text-center">{tDisp.toFixed(2)}</td>
                                <td className="py-2.5 px-2 text-right">{reqH.toFixed(1)}</td>
                                <td className="py-2.5 px-2 text-right">{capH.toFixed(1)}</td>
                                <td className={`py-2.5 px-2 text-right ${bal >= 0 ? 'text-green-600' : 'text-red-500'}`}>{bal >= 0 ? '+' : ''}{bal.toFixed(1)}</td>
                                <td className={`py-2.5 px-2 text-right ${cob >= 100 ? 'text-green-600' : 'text-orange-500'}`}>{cob.toFixed(1)}%</td>
                                <td className="py-2.5 px-2 text-center text-slate-500 font-normal">1 maq.</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {/* --- INYECCIÓN HÍDRICA DIRECTA --- */}
                      <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                          <h3 style={{ fontSize: '11px', fontWeight: '900', color: '#0284c7', textTransform: 'uppercase' }}>Resumen Hídrico Operativo</h3>
                          {renderPdfToggleButton('hidrico', 'Sustentabilidad')}
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#0f172a', fontWeight: '600' }}>
                          <div><strong>Recambios Mensuales:</strong> {new Intl.NumberFormat().format(((inputs.waterTankLiters || 1200) * (inputs.waterChangesPerWeek || 1) * 4))} L</div>
                          <div><strong>Pérdida por Arrastre/Evap:</strong> {new Intl.NumberFormat().format((results.totalWaterMonthlyLiters || 0) - ((inputs.waterTankLiters || 1200) * (inputs.waterChangesPerWeek || 1) * 4))} L</div>
                          <div style={{ color: '#059669' }}><strong>Impacto OPEX:</strong> ${new Intl.NumberFormat().format(results.waterCostMonthlyMxn || 0)} MXN/mes</div>
                        </div>
                      </div>
                      
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TWIN DIGITAL & FLUJO */}
          {activeTab === 'twin' && (
            <div className="space-y-6">
              
              {/* DIGITAL TWIN 3D / 2D VIEW CONTAINER */}
              <div 
                ref={twinBlockRef}
                className={`transition-all duration-300 relative ${
                  isTwinBlockFullscreen 
                    ? `w-screen h-screen overflow-y-auto ${twinTheme === 'toxic' ? 'bg-[#0d0d0e]' : twinTheme === 'blueprint' ? 'bg-[#edf4f9]' : 'bg-[#05070f]'} p-8 rounded-none border-none z-[9999] flex flex-col justify-between` 
                    : twinTheme === 'toxic'
                      ? 'bg-[#121212] border border-[#2c302e] rounded-3xl p-6 shadow-xl overflow-hidden'
                      : twinTheme === 'blueprint'
                        ? 'bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-hidden'
                        : 'bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md overflow-hidden'
                }`}
              >
                <div className={`flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 mb-4 gap-4 ${
                  twinTheme === 'toxic' ? 'border-[#2c302e]' : twinTheme === 'blueprint' ? 'border-slate-100' : 'border-slate-800'
                }`}>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Cpu className={`w-5 h-5 animate-pulse ${
                        twinTheme === 'toxic' ? 'text-[#84cc16]' : twinTheme === 'blueprint' ? 'text-cyan-650' : 'text-[#00F0FF]'
                      }`} />
                      <h3 className={`text-sm font-black uppercase tracking-wider ${
                        twinTheme === 'toxic' ? 'text-[#84cc16]' : twinTheme === 'blueprint' ? 'text-slate-900' : 'text-white'
                      }`}>
                        {`Twin Digital 3D de la Línea (WM-500) ${twinLayout?.name ? `- [${twinLayout.name.toUpperCase()}]` : ''}`}
                      </h3>
                      {renderPdfToggleButton('twin', 'Twin 3D')}
                      {isProcessingModel && <Loader2 className={`w-3.5 h-3.5 animate-spin ${
                        twinTheme === 'toxic' ? 'text-[#84cc16]' : twinTheme === 'blueprint' ? 'text-cyan-600' : 'text-[#00F0FF]'
                      }`} />}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {is3DView ? (
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <button 
                          onClick={() => setIsDesignsLibraryOpen(true)}
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] shadow-sm ${
                            twinTheme === 'toxic'
                              ? 'bg-[#222222] border-[#2c302e] hover:border-[#84cc16] text-[#84cc16] hover:text-white border'
                              : twinTheme === 'blueprint'
                                ? 'bg-cyan-50/50 hover:bg-cyan-50 text-cyan-700 border-cyan-200/60 border'
                                : 'bg-teal-950/40 hover:bg-teal-900/40 text-[#00F0FF] border border-[#0d9488]/40'
                          }`}
                          title="Abrir librería de layouts guardados"
                        >
                          <FolderOpen className="w-3.5 h-3.5" /> Librería
                        </button>

                        <label 
                          htmlFor="twin-upload-file-wm500"
                          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer transition-all font-black uppercase tracking-widest text-[9px] shadow-sm ${
                            twinTheme === 'toxic'
                              ? 'bg-[#222222] border-[#2c302e] hover:border-[#84cc16] text-[#84cc16] hover:text-white border'
                              : twinTheme === 'blueprint'
                                ? 'bg-purple-50 hover:bg-purple-100/80 text-purple-700 border-purple-200/60 border'
                                : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30'
                          }`}
                          title="Subir archivo 3D de la planta (.glb, .gltf o .fbx)"
                        >
                          <Upload className="w-3.5 h-3.5" /> Subir 3D
                        </label>
                        <input 
                          type="file" 
                          id="twin-upload-file-wm500" 
                          className="hidden" 
                          accept=".glb,.gltf,.fbx" 
                          onChange={handleTwinModelUpload} 
                        />

                        <button 
                          onClick={() => setIsTwinEditMode(!isTwinEditMode)}
                          className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl transition-all font-black uppercase tracking-widest text-[9px] shadow-sm ${
                            isTwinEditMode 
                              ? twinTheme === 'toxic'
                                ? 'bg-[#84cc16] hover:bg-[#a3e635] text-black font-extrabold border-none shadow-[0_0_12px_rgba(132,204,22,0.4)]'
                                : twinTheme === 'blueprint'
                                  ? 'bg-yellow-100 hover:bg-yellow-200/85 text-yellow-800 border-yellow-300 font-extrabold'
                                  : 'bg-yellow-500/20 border-yellow-500 text-yellow-400 font-extrabold' 
                              : twinTheme === 'toxic'
                                ? 'bg-[#1a1a1a] border-[#2c302e] text-gray-400 hover:text-white'
                                : twinTheme === 'blueprint'
                                  ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                          }`}
                          title="Activar edición de posiciones de máquinas en 3D"
                        >
                          <Sliders className="w-3.5 h-3.5" /> {isTwinEditMode ? 'Listo' : 'Ajustes'}
                        </button>

                        <button 
                          onClick={toggleTwinBlockFullscreen}
                          className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl transition-all font-black uppercase tracking-widest text-[9px] shadow-sm ${
                            isTwinBlockFullscreen 
                              ? twinTheme === 'toxic'
                                ? 'bg-[#84cc16]/25 border-[#84cc16] text-[#84cc16] font-extrabold shadow-[0_0_10px_rgba(132,204,22,0.25)]'
                                : twinTheme === 'blueprint'
                                  ? 'bg-cyan-100 border-cyan-300 text-cyan-800 font-extrabold'
                                  : 'bg-[#00F0FF]/25 border-[#00F0FF] text-[#00F0FF] font-extrabold shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                              : twinTheme === 'toxic'
                                ? 'bg-[#1a1a1a] border-[#2c302e] text-gray-400 hover:text-white hover:border-[#84cc16]/40'
                                : twinTheme === 'blueprint'
                                  ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-white/5 border-white/10 text-gray-400 hover:text-white hover:border-white/20'
                          }`}
                          title={isTwinBlockFullscreen ? "Salir de Pantalla Completa" : "Editar en Pantalla Completa"}
                        >
                          {isTwinBlockFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                          <span>{isTwinBlockFullscreen ? 'Ventana' : 'Pantalla Completa'}</span>
                        </button>

                        <button 
                          onClick={handleSyncFromFlowDesigner}
                          className={`flex items-center justify-center p-2 border rounded-xl transition-all shadow-sm ${
                            twinTheme === 'toxic'
                              ? 'bg-[#1a1a1a] border-[#2c302e] text-gray-400 hover:text-white'
                              : twinTheme === 'blueprint'
                                ? 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                          }`}
                          title="Restablecer posiciones originales de fábrica"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>

                        <button 
                          onClick={handleAnchorToSimulator}
                          disabled={isAnchoring}
                          className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl transition-all font-black uppercase tracking-widest text-[9px] shadow-sm ${
                            isAnchoring
                              ? 'bg-green-500/10 border-green-500/30 text-green-400 opacity-70 cursor-wait'
                              : isAnchored
                                ? twinTheme === 'toxic'
                                  ? 'bg-lime-500/25 border-lime-400 text-lime-300 font-extrabold shadow-[0_0_10px_rgba(132,204,22,0.25)]'
                                  : twinTheme === 'blueprint'
                                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-extrabold shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                                    : 'bg-green-500/20 border-green-500 text-green-400 font-extrabold shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                                : twinTheme === 'toxic'
                                  ? 'bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 border border-lime-500/30'
                                  : twinTheme === 'blueprint'
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                    : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30'
                          }`}
                          title="Guardar posiciones en este simulador"
                        >
                          <Check className="w-3.5 h-3.5" /> {isAnchoring ? 'Guardando...' : 'Anclado'}
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => setIsPlaying(p => !isPlaying)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all border shadow-sm ${
                          twinTheme === 'toxic'
                            ? isPlaying ? 'bg-[#84cc16]/20 border-[#84cc16] text-[#84cc16]' : 'bg-[#1a1a1a] border-[#2c302e] text-gray-400 hover:text-white'
                            : twinTheme === 'blueprint'
                              ? isPlaying ? 'bg-cyan-50 border-cyan-200 text-cyan-700' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-800'
                              : isPlaying ? 'bg-cyan-500/25 border-cyan-400 text-cyan-300' : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                        }`}
                      >
                        {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                        {isPlaying ? 'Pausar Flujo' : 'Simular Flujo'}
                      </button>
                    )}
                  </div>
                </div>

                {is3DView && isTwinEditMode && (
                  <div className={`mb-4 p-4 rounded-2xl border space-y-4 transition-all shadow-inner ${
                    twinTheme === 'toxic'
                      ? 'bg-[#121212] border-[#2c302e]'
                      : twinTheme === 'blueprint'
                        ? 'bg-slate-50 border-slate-200/85 shadow-inner'
                        : 'bg-black/40 border-white/5 backdrop-blur-md'
                  }`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                      {/* Altura de Fichas Slider */}
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-wider">
                          <span className={twinTheme === 'blueprint' ? 'text-slate-500' : 'text-gray-400'}>
                            Altura de Fichas de Movimiento:
                          </span>
                          <span className={
                            twinTheme === 'toxic' 
                              ? 'text-[#84cc16] font-bold' 
                              : twinTheme === 'blueprint' 
                                ? 'text-cyan-600 font-bold' 
                                : 'text-[#00F0FF] font-bold'
                          }>
                            {twinLabelHeightOffset.toFixed(1)} m
                          </span>
                        </div>
                        <input 
                          type="range" 
                          min="-2.0" 
                          max="5.0" 
                          step="0.1" 
                          value={twinLabelHeightOffset} 
                          onChange={(e) => setTwinLabelHeightOffset(Number(e.target.value))}
                          className={`w-full h-1.5 rounded-lg appearance-none cursor-pointer ${
                            twinTheme === 'toxic'
                              ? 'bg-[#222] accent-[#84cc16]'
                              : twinTheme === 'blueprint'
                                ? 'bg-slate-200 accent-cyan-600'
                                : 'bg-[#222] accent-[#00F0FF]'
                          }`}
                        />
                      </div>

                      {/* Mostrar/Colapsar Fichas Toggle */}
                      <div className="flex items-center gap-3">
                        <span className={`text-[10px] font-black uppercase tracking-wider ${
                          twinTheme === 'blueprint' ? 'text-slate-500' : 'text-gray-400'
                        }`}>
                          Modo Compacto:
                        </span>
                        <button 
                          onClick={() => setTwinLabelsCollapsed(!twinLabelsCollapsed)}
                          className={`px-3 py-1.5 rounded-lg border text-[9px] font-black uppercase tracking-wider transition-all shadow-sm ${
                            twinLabelsCollapsed 
                              ? twinTheme === 'toxic'
                                ? 'bg-[#84cc16]/20 border-[#84cc16] text-[#84cc16]'
                                : twinTheme === 'blueprint'
                                  ? 'bg-cyan-100 border-cyan-300 text-cyan-800'
                                  : 'bg-[#00F0FF]/25 border-[#00F0FF] text-[#00F0FF]' 
                              : twinTheme === 'toxic'
                                ? 'bg-white/5 border-white/10 text-gray-400'
                                : twinTheme === 'blueprint'
                                  ? 'bg-white border-slate-200 text-slate-600'
                                  : 'bg-white/5 border-white/10 text-gray-400'
                          }`}
                        >
                          {twinLabelsCollapsed ? 'Activado' : 'Desactivado'}
                        </button>
                      </div>
                    </div>

                    {/* Elevación del Piso del Modelo 3D + Candado */}
                    {twinLayout && (
                      <div className={`border-t pt-3 space-y-1.5 ${
                        twinTheme === 'blueprint' ? 'border-slate-200/60' : 'border-white/5'
                      }`}>
                        <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wider">
                          <span className={
                            twinFloorLocked
                              ? twinTheme === 'toxic'
                                ? 'text-yellow-400'
                                : twinTheme === 'blueprint'
                                  ? 'text-amber-600'
                                  : 'text-yellow-400'
                              : twinTheme === 'blueprint'
                                ? 'text-slate-500'
                                : 'text-gray-400'
                          }>
                            {twinFloorLocked ? 'ðŸ”’' : 'ðŸ“'} Elevación del Piso:
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`tabular-nums ${
                              twinTheme === 'toxic'
                                ? 'text-[#84cc16]'
                                : twinTheme === 'blueprint'
                                  ? 'text-cyan-600'
                                  : 'text-[#00F0FF]'
                            }`}>{twinFloorElevation.toFixed(1)} m</span>
                            <button
                              onClick={() => setTwinFloorLocked(l => !l)}
                              className={`p-1.5 rounded-lg border text-[10px] transition-all shadow-sm ${
                                twinFloorLocked
                                  ? twinTheme === 'toxic'
                                    ? 'bg-yellow-500/20 border-yellow-500/60 text-yellow-400'
                                    : twinTheme === 'blueprint'
                                      ? 'bg-amber-100 border-amber-300 text-amber-800'
                                      : 'bg-yellow-500/20 border-yellow-500/60 text-yellow-400'
                                  : twinTheme === 'toxic'
                                    ? 'bg-white/5 border-white/10 text-gray-500 hover:text-white'
                                    : twinTheme === 'blueprint'
                                      ? 'bg-white border-slate-200 text-slate-500 hover:text-slate-800'
                                      : 'bg-white/5 border-white/10 text-gray-500 hover:text-white'
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
                              ? 'bg-slate-250 opacity-50 cursor-not-allowed' 
                              : twinTheme === 'toxic'
                                ? 'bg-[#222] cursor-pointer accent-[#84cc16]'
                                : twinTheme === 'blueprint'
                                  ? 'bg-slate-300 cursor-pointer accent-cyan-650'
                                  : 'bg-[#222] cursor-pointer accent-[#00F0FF]'
                          }`}
                        />
                        <p className={`text-[9px] italic ${
                          twinTheme === 'blueprint' ? 'text-slate-400' : 'text-gray-500'
                        }`}>
                          {twinFloorLocked 
                            ? 'ðŸ”’ Elevación bloqueada. Haz clic en el candado para ajustar de nuevo.' 
                            : 'ðŸ“ Desliza para encontrar la altura correcta, luego bloquea con el candado.'}
                        </p>
                      </div>
                    )}

                    {/* Lista de Fichas / Equipos */}
                    <div className={`border-t pt-3 space-y-2 ${
                      twinTheme === 'blueprint' ? 'border-slate-200/60' : 'border-white/5'
                    }`}>
                      <div className={`text-[10px] font-black uppercase tracking-wider flex items-center justify-between ${
                        twinTheme === 'blueprint' ? 'text-slate-500' : 'text-gray-400'
                      }`}>
                        <span>Equipos en el Twin:</span>
                        <div className="flex gap-2">
                          <button
                            className="flex items-center gap-1 px-2 py-1 bg-cyan-50/10 text-cyan-500 border border-cyan-500/20 rounded-lg text-[9px] font-black uppercase transition-all opacity-50 cursor-not-allowed"
                            title="Fichas automáticas del simulador"
                            disabled
                          >
                            <Plus className="w-3 h-3" /> Ficha
                          </button>
                          <button
                            className="flex items-center gap-1 px-2 py-1 bg-purple-50/10 text-purple-500 border border-purple-500/20 rounded-lg text-[9px] font-black uppercase transition-all opacity-50 cursor-not-allowed"
                            title="Conectores de flujo automáticos"
                            disabled
                          >
                            <Link2 className="w-3 h-3" /> Conector
                          </button>
                        </div>
                      </div>

                      {/* Lista de fichas existentes */}
                      <div className="flex flex-wrap gap-1.5">
                        {twinNodes.map((node) => {
                          const isActive = selectedTwinNodeId === node.id;
                          return (
                            <div
                              key={node.id}
                              className={`flex items-center rounded-lg border overflow-hidden transition-all shadow-sm ${
                                isActive
                                  ? twinTheme === 'toxic'
                                    ? 'border-[#84cc16] bg-[#84cc16]/15'
                                    : twinTheme === 'blueprint'
                                      ? 'border-cyan-500 bg-cyan-50'
                                      : 'border-[#00F0FF] bg-[#00F0FF]/15'
                                  : twinTheme === 'toxic'
                                    ? 'border-[#252525] bg-[#111] hover:border-[#333]'
                                    : twinTheme === 'blueprint'
                                      ? 'border-slate-200 bg-white hover:border-slate-300'
                                      : 'border-[#252525] bg-[#111] hover:border-[#333]'
                              }`}
                            >
                              <span
                                className="w-2.5 h-2.5 rounded-full mx-1.5 flex-shrink-0"
                                style={{ backgroundColor: node.data?.color || (twinTheme === 'toxic' ? '#84cc16' : '#00F0FF') }}
                              />
                              <button
                                onClick={() => setSelectedTwinNodeId(isActive ? null : node.id)}
                                className={`py-1.5 px-3 text-[10px] font-extrabold transition-colors ${
                                  isActive
                                    ? twinTheme === 'toxic'
                                      ? 'text-white font-bold'
                                      : twinTheme === 'blueprint'
                                        ? 'text-cyan-900 font-extrabold'
                                        : 'text-white font-bold'
                                    : twinTheme === 'blueprint'
                                      ? 'text-slate-650 hover:text-slate-900'
                                      : 'text-gray-400 hover:text-white'
                                }`}
                                title="Seleccionar para mover en 3D"
                              >
                                {node.data?.label || node.data?.type || 'Equipo'}
                              </button>
                            </div>
                          );
                        })}
                      </div>
                      <p className={`text-[9px] italic ${
                        twinTheme === 'blueprint' ? 'text-slate-400' : 'text-gray-500'
                      }`}>
                        ðŸ’¡ Clic en nombre â†’ mover en 3D
                      </p>
                    </div>
                  </div>
                )}

                {/* 3D CAD Twin Viewer Container */}
                <div className={`relative rounded-2xl overflow-hidden border ${twinTheme === 'toxic' ? 'border-[#2c302e] bg-[#0c0d0e]' : twinTheme === 'blueprint' ? 'border-slate-200 bg-[#edf4f9]' : 'border-slate-200 bg-[#05070f]'}`} style={{ display: is3DView ? 'block' : 'none' }}>
                  <SharedTwinViewer3D 
                    storagePrefix={`sim_dhl_v2_${activeProject?.id ? `${activeProject.id}_` : ''}`}
                    height={isTwinBlockFullscreen ? "calc(100vh - 280px)" : "480px"}
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
                  
                  {/* Banner flotante inferior */}
                  <div className="absolute bottom-4 right-4 bg-black/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-[9px] font-black uppercase tracking-widest text-slate-300 flex items-center gap-1.5 select-none pointer-events-none shadow-lg">
                    <MousePointer className="w-3 h-3 text-cyan-400 animate-pulse" />
                    Click + arrastrar para orbitar | Scroll para zoom
                  </div>
                </div>


              </div>

              {/* 3. FLUJO DE PROCESO */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm overflow-x-auto">
                <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4 min-w-[800px]">
                  <div>
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Flujo del Proceso de Lavado</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">BWD-250 // Línea Industrial para Lavado de Cajas</p>
                  </div>
                  <div className="flex items-center gap-6 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />Capacidad</span>
                      <span className="text-xs font-black text-slate-800">{new Intl.NumberFormat().format(currentNominalCapacity)} cajas/h</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Presión</span>
                      <span className="text-xs font-black text-slate-800">5.0 bar</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Temp.</span>
                      <span className="text-xs font-black text-slate-800">60-80°C</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado</span>
                      <span className="text-xs font-black text-cyan-600">NOMINAL</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4 min-w-[1000px] relative">
                  {[
                    { num: '01', step: 'ETAPA A', sub: 'FEED_01', title: 'ALIMENTACIÓN', desc: 'Carga continua de cajas plásticas en la banda de entrada.', footer: 'BANDA: 4.0 m', color: 'teal', hex: '#14b8a6', bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-400' },
                    { num: '02', step: 'ETAPA B', sub: 'INLET_02', title: 'ENTRADA AL sistema de lavado', desc: 'Los rodillos conducen y dosifican el material hacia la cámara.', footer: 'INGRESO CONTROLADO', color: 'blue', hex: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-400' },
                    { num: '03', step: 'ETAPA C', sub: 'SHRED_03', title: 'LAVADO', desc: 'Sistema de aspersión de agua a alta presión con filtración.', footer: 'BOMBAS: 30 HP', color: 'amber', hex: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-400' },
                    { num: '04', step: 'ETAPA D', sub: 'MAG_SEP_04', title: 'SEPARACIÓN MAGNÉTICA', desc: 'Retiro de clavos, grapas y tornillos del material lavado.', footer: 'METAL: REMOVIDO', color: 'purple', hex: '#8b5cf6', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-400' },
                    { num: '05', step: 'ETAPA E', sub: 'OUTFEED_05', title: 'DESCARGA', desc: 'Evacuación continua del material limpio por la banda de salida.', footer: 'BANDA: 3.0 m', color: 'emerald', hex: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-400' },
                    { num: '06', step: 'ETAPA F', sub: 'OUTPUT_06', title: 'PRODUCTO FINAL', desc: 'Partículas de madera homogéneas, listas para valorización.', footer: 'SALIDA: SECAS', color: 'rose', hex: '#f43f5e', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-400' },
                  ].map((f, i) => (
                    <React.Fragment key={i}>
                      <div className={`flex-1 bg-slate-50/50 rounded-xl border border-slate-200 overflow-hidden flex flex-col relative`}>
                        <div className={`h-1.5 w-full bg-${f.color}-500`} style={{ backgroundColor: f.hex }} />
                        <div className="p-4 flex flex-col h-full">
                          
                          <div className="flex items-start gap-3 mb-4">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-black text-white`} style={{ backgroundColor: f.hex }}>
                              {f.num}
                            </div>
                            <div className="flex flex-col justify-center">
                              <span className={`text-[9px] font-black uppercase tracking-widest`} style={{ color: f.hex }}>{f.step}</span>
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{f.sub}</span>
                            </div>
                          </div>

                          <h4 className="text-[13px] font-black text-slate-800 uppercase tracking-tight mb-2 leading-tight">{f.title}</h4>
                          <p className="text-[10px] text-slate-500 font-medium leading-relaxed flex-1">{f.desc}</p>
                          
                          <div className="mt-6 pt-3 border-t border-slate-200/60 flex items-center justify-between">
                            <span className={`text-[9px] font-black uppercase tracking-widest`} style={{ color: f.hex }}>{f.footer}</span>
                          </div>
                        </div>
                      </div>
                      
                      {i < 5 && (
                        <div className="flex items-center justify-center -mx-2 z-10">
                          <ArrowRight className="w-4 h-4 text-cyan-500 opacity-60" />
                        </div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div className="flex justify-between items-center mt-4 border-t border-slate-100 pt-3 min-w-[800px]">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">SMQ // WM500 PROCESS MAP</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Flujo: Izquierda â†’ Derecha</span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 3: DATOS Y MÉTRICAS */}
          {activeTab === 'tabla' && (
            <div className="space-y-6">
              
              {/* TABLA TÉCNICA WM-500 */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                  <Wrench className="w-5 h-5 text-cyan-600" />
                  {isEditingTechnicalSheetName ? (
                    <div className="flex items-center gap-2 w-full max-w-md">
                      <input
                        type="text"
                        value={tempTechnicalSheetName}
                        onChange={(e) => setTempTechnicalSheetName(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-black text-slate-900 uppercase tracking-wider focus:outline-none focus:border-cyan-500"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTechnicalSheetName()}
                      />
                      <button onClick={handleSaveTechnicalSheetName} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 w-full">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTechnicalSheetName(true)}>
                        {inputs.technicalSheetName}
                        <Edit2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-cyan-500 transition-colors" />
                      </h3>
                      {renderPdfToggleButton('tabla', 'Métricas')}
                    </div>
                  )}
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-semibold text-slate-700">
                    <thead className="bg-slate-50 text-[10px] font-black text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-3.5 px-4">Componente / Característica</th>
                        <th className="py-3.5 px-4">Especificación Original</th>
                        <th className="py-3.5 px-4 text-right">Detalle Técnico</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { 
                          comp: 'Modelo del Equipo', 
                          renderSpec: () => (
                            <input 
                              type="text" 
                              value={inputs.machineName || ''} 
                              onChange={e => setInputs(prev => ({ ...prev, machineName: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                            />
                          ), 
                          renderDetail: () => (
                            <input 
                              type="text" 
                              value={inputs.machineNameDetalle !== undefined ? inputs.machineNameDetalle : 'Lavadora y Secadora Industrial de Madera'} 
                              onChange={e => setInputs(prev => ({ ...prev, machineNameDetalle: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                            />
                          ) 
                        },
                        { 
                          comp: 'Aplicación Operativa', 
                          renderSpec: () => (
                            <input 
                              type="text" 
                              value={inputs.aplicacionOperativa !== undefined ? inputs.aplicacionOperativa : 'Madera, tarimas, clavos, grapas, tornillos'} 
                              onChange={e => setInputs(prev => ({ ...prev, aplicacionOperativa: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                            />
                          ), 
                          renderDetail: () => (
                            <input 
                              type="text" 
                              value={inputs.aplicacionDetalle !== undefined ? inputs.aplicacionDetalle : 'Separación magnética automática'} 
                              onChange={e => setInputs(prev => ({ ...prev, aplicacionDetalle: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                            />
                          ) 
                        },
                        { 
                          comp: 'Capacidad Nominal', 
                          renderSpec: () => (
                            <div className="flex items-center gap-1.5 w-full justify-end pr-2">
                              <span className="text-xs font-black text-slate-800">{new Intl.NumberFormat().format(currentNominalCapacity)}</span>
                              <span className="text-xs font-bold text-slate-500 shrink-0">cajas/h</span>
                            </div>
                          ), 
                          renderDetail: () => (
                            <input 
                              type="text" 
                              value={inputs.capacidadNominalDetalle !== undefined ? inputs.capacidadNominalDetalle : 'Sujeta a OEE y factor de reducción'} 
                              onChange={e => setInputs(prev => ({ ...prev, capacidadNominalDetalle: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                            />
                          ) 
                        },
                        { 
                          comp: 'Motorización Principal', 
                          renderSpec: () => (
                            <div className="flex items-center gap-1.5 w-full">
                              <input 
                                type="number" 
                                value={inputs.motorBombaAguaHp || 0} 
                                onChange={e => setInputs(prev => ({ ...prev, motorPrincipalHp: parseFloat(e.target.value) || 0 }))} 
                                className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                              />
                              <span className="text-xs font-bold text-slate-500 shrink-0">hp</span>
                              <input 
                                type="text" 
                                value={inputs.motorMarca || ''} 
                                onChange={e => setInputs(prev => ({ ...prev, motorMarca: e.target.value }))} 
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                              />
                            </div>
                          ), 
                          renderDetail: () => (
                            <input 
                              type="text" 
                              value={inputs.motorPrincipalDetalle !== undefined ? inputs.motorPrincipalDetalle : 'Alta eficiencia clase IE3'} 
                              onChange={e => setInputs(prev => ({ ...prev, motorPrincipalDetalle: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                            />
                          ) 
                        },
                        { 
                          comp: 'Motorización Auxiliar', 
                          renderSpec: () => (
                            <div className="flex items-center gap-1.5 w-full">
                              <input 
                                type="number" 
                                value={inputs.motorSopladorHp || 0} 
                                onChange={e => setInputs(prev => ({ ...prev, motorAuxiliarHp: parseFloat(e.target.value) || 0 }))} 
                                className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                              />
                              <span className="text-xs font-bold text-slate-500 shrink-0">hp</span>
                              <input 
                                type="text" 
                                value={inputs.motorMarca || ''} 
                                onChange={e => setInputs(prev => ({ ...prev, motorMarca: e.target.value }))} 
                                className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                              />
                            </div>
                          ), 
                          renderDetail: () => (
                            <input 
                              type="text" 
                              value={inputs.motorAuxiliarDetalle !== undefined ? inputs.motorAuxiliarDetalle : 'Sistemas auxiliares e hidráulicos'} 
                              onChange={e => setInputs(prev => ({ ...prev, motorAuxiliarDetalle: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                            />
                          ) 
                        },
                        { 
                          comp: 'Potencia Instalada Total', 
                          renderSpec: () => (
                            <span className="text-slate-700 font-bold px-2 py-1">{results.totalHp} hp</span>
                          ), 
                          renderDetail: () => (
                            <span className="text-slate-500 font-mono text-[11px] px-2 py-1 block text-right">{results.installedPowerKw.toFixed(2)} kW</span>
                          ) 
                        },
                        { 
                          comp: 'Dimensiones Bandas', 
                          renderSpec: () => (
                            <input 
                              type="text" 
                              value={inputs.dimensionesBandas !== undefined ? inputs.dimensionesBandas : 'Entrada: 4,000 mm | Salida: 3,000 mm'} 
                              onChange={e => setInputs(prev => ({ ...prev, dimensionesBandas: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                            />
                          ), 
                          renderDetail: () => (
                            <input 
                              type="text" 
                              value={inputs.dimensionesBandasDetalle !== undefined ? inputs.dimensionesBandasDetalle : 'Diseño continuo de banda reforzada'} 
                              onChange={e => setInputs(prev => ({ ...prev, dimensionesBandasDetalle: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                            />
                          ) 
                        },
                        { 
                          comp: 'Boca de Alimentación', 
                          renderSpec: () => (
                            <input 
                              type="text" 
                              value={inputs.bocaAlimentacion || ''} 
                              onChange={e => setInputs(prev => ({ ...prev, bocaAlimentacion: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                            />
                          ), 
                          renderDetail: () => (
                            <input 
                              type="text" 
                              value={inputs.bocaAlimentacionDetalle !== undefined ? inputs.bocaAlimentacionDetalle : 'Apertura de seguridad'} 
                              onChange={e => setInputs(prev => ({ ...prev, bocaAlimentacionDetalle: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                            />
                          ) 
                        },
                        { 
                          comp: 'Rotación del Sistema de lavado', 
                          renderSpec: () => (
                            <div className="flex items-center gap-1.5 w-full">
                              <input 
                                type="number" 
                                value={inputs.presionLavadoBar || 0} 
                                onChange={e => setInputs(prev => ({ ...prev, presionLavadoBar: parseFloat(e.target.value) || 0 }))} 
                                className="w-full max-w-[120px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                              />
                              <span className="text-xs font-bold text-slate-500 shrink-0">rpm</span>
                            </div>
                          ), 
                          renderDetail: () => (
                            <input 
                              type="text" 
                              value={inputs.presionLavadoBarDetalle !== undefined ? inputs.presionLavadoBarDetalle : 'Eje balanceado dinámicamente'} 
                              onChange={e => setInputs(prev => ({ ...prev, presionLavadoBarDetalle: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                            />
                          ) 
                        },
                        { 
                          comp: 'Tamaño de Partícula Final', 
                          renderSpec: () => (
                            <input 
                              type="text" 
                              value={inputs.particulaFinal || ''} 
                              onChange={e => setInputs(prev => ({ ...prev, particulaFinal: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                            />
                          ), 
                          renderDetail: () => (
                            <input 
                              type="text" 
                              value={inputs.particulaFinalDetalle !== undefined ? inputs.particulaFinalDetalle : 'Ideal para reciclaje o briquetas'} 
                              onChange={e => setInputs(prev => ({ ...prev, particulaFinalDetalle: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                            />
                          ) 
                        },
                        { 
                          comp: 'Separación Metálica', 
                          renderSpec: () => (
                            <input 
                              type="text" 
                              value={inputs.separadorMagnetico || ''} 
                              onChange={e => setInputs(prev => ({ ...prev, separadorMagnetico: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                            />
                          ), 
                          renderDetail: () => (
                            <input 
                              type="text" 
                              value={inputs.separadorMagneticoDetalle !== undefined ? inputs.separadorMagneticoDetalle : 'Imán sobrebanda autolimpiable'} 
                              onChange={e => setInputs(prev => ({ ...prev, separadorMagneticoDetalle: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                            />
                          ) 
                        },
                        { 
                          comp: 'Dimensiones Físicas', 
                          renderSpec: () => (
                            <div className="flex items-center gap-1 w-full overflow-hidden">
                              <span className="text-[9px] font-bold text-slate-400 shrink-0">L:</span>
                              <input 
                                type="number" step="0.05"
                                value={inputs.machineLength || 0} 
                                onChange={e => setInputs(prev => ({ ...prev, machineLength: parseFloat(e.target.value) || 0 }))} 
                                className="w-14 bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-center"
                              />
                              <span className="text-[9px] font-bold text-slate-400 shrink-0">W:</span>
                              <input 
                                type="number" step="0.05"
                                value={inputs.machineWidth || 0} 
                                onChange={e => setInputs(prev => ({ ...prev, machineWidth: parseFloat(e.target.value) || 0 }))} 
                                className="w-14 bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-center"
                              />
                              <span className="text-[9px] font-bold text-slate-400 shrink-0">H:</span>
                              <input 
                                type="number" step="0.05"
                                value={inputs.machineHeight || 0} 
                                onChange={e => setInputs(prev => ({ ...prev, machineHeight: parseFloat(e.target.value) || 0 }))} 
                                className="w-14 bg-white border border-slate-200 rounded-lg px-1.5 py-1 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-center"
                              />
                              <span className="text-xs font-bold text-slate-500 shrink-0">m</span>
                            </div>
                          ), 
                          renderDetail: () => (
                            <span className="text-slate-500 font-mono text-[11px] px-2 py-1 block text-right">Footprint: {(inputs.machineLength * inputs.machineWidth).toFixed(2)} m²</span>
                          ) 
                        },
                        { 
                          comp: 'Peso Total Equipo', 
                          renderSpec: () => (
                            <div className="flex items-center gap-1.5 w-full">
                              <input 
                                type="number" 
                                value={inputs.pesoOperativoKg || 0} 
                                onChange={e => setInputs(prev => ({ ...prev, pesoKg: parseFloat(e.target.value) || 0 }))} 
                                className="w-full max-w-[120px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                              />
                              <span className="text-xs font-bold text-slate-500 shrink-0">kg</span>
                            </div>
                          ), 
                          renderDetail: () => (
                            <input 
                              type="text" 
                              value={inputs.pesoOperativoKgDetalle !== undefined ? inputs.pesoOperativoKgDetalle : 'Anclaje antivibraciones'} 
                              onChange={e => setInputs(prev => ({ ...prev, pesoKgDetalle: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                            />
                          ) 
                        },
                        { 
                          comp: 'Componentes Eléctricos', 
                          renderSpec: () => (
                            <input 
                              type="text" 
                              value={inputs.componentesElectricos || ''} 
                              onChange={e => setInputs(prev => ({ ...prev, componentesElectricos: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                            />
                          ), 
                          renderDetail: () => (
                            <input 
                              type="text" 
                              value={inputs.componentesElectricosDetalle !== undefined ? inputs.componentesElectricosDetalle : 'Gabinete de control integrado'} 
                              onChange={e => setInputs(prev => ({ ...prev, componentesElectricosDetalle: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                            />
                          ) 
                        },
                        { 
                          comp: 'Nivel de Ruido', 
                          renderSpec: () => (
                            <div className="flex items-center gap-1.5 w-full">
                              <input 
                                type="number" 
                                value={inputs.ruidoDb || 0} 
                                onChange={e => setInputs(prev => ({ ...prev, ruidoDb: parseFloat(e.target.value) || 0 }))} 
                                className="w-full max-w-[120px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                              />
                              <span className="text-xs font-bold text-slate-500 shrink-0">dB</span>
                            </div>
                          ), 
                          renderDetail: () => (
                            <input 
                              type="text" 
                              value={inputs.ruidoDbDetalle !== undefined ? inputs.ruidoDbDetalle : 'Diseño aislante de vibraciones'} 
                              onChange={e => setInputs(prev => ({ ...prev, ruidoDbDetalle: e.target.value }))} 
                              className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-right"
                            />
                          ) 
                        },
                      ].map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-2 px-4 font-black text-slate-800 align-middle w-1/4 min-w-[150px]">{t.comp}</td>
                          <td className="py-2 px-4 text-slate-600 font-bold align-middle w-1/3 min-w-[200px]">{t.renderSpec()}</td>
                          <td className="py-2 px-4 text-right text-slate-500 font-mono text-[11px] align-middle w-1/3 min-w-[200px]">{t.renderDetail()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: ENERGÍA & CAPACIDAD */}
          {activeTab === 'energia' && (
            <div className="space-y-6">
              
              {/* CONSUMO ENERGÉTICO */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-3 w-full border-b border-slate-100 pb-4 mb-6">
                  <Zap className="w-5 h-5 text-cyan-600" />
                  {isEditingEnergyTitle ? (
                    <div className="flex items-center gap-2 w-full max-w-md">
                      <input
                        type="text"
                        value={tempEnergyTitle}
                        onChange={(e) => setTempEnergyTitle(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-black text-slate-900 uppercase tracking-wider focus:outline-none focus:border-cyan-500"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveEnergyTitle()}
                      />
                      <button onClick={handleSaveEnergyTitle} className="text-green-600 hover:bg-green-50 p-1.5 rounded-lg transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 w-full">
                      <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingEnergyTitle(true)}>
                        {inputs.energySectionTitle || 'DESGLOSE ENERGÉTICO OPERATIVO'}
                        <Edit2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-cyan-500 transition-colors" />
                      </h3>
                      {renderPdfToggleButton('energia', 'Energía')}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 transition-all hover:border-cyan-300 group">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase flex items-center gap-1 group-hover:text-cyan-600">
                      Potencia Instalada Total <Edit2 className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </span>
                    <div className="flex items-baseline gap-1 mt-1">
                      <input 
                        type="number"
                        value={inputs.calentamientoElectricoKw === undefined || inputs.calentamientoElectricoKw === 96.98 ? results.installedPowerKw.toFixed(2) : inputs.calentamientoElectricoKw}
                        onChange={(e) => setInputs(prev => ({ ...prev, customInstalledPowerKw: parseFloat(e.target.value) || 0 }))}
                        className="w-20 bg-transparent border-b border-dashed border-slate-300 focus:border-cyan-500 focus:outline-none text-xl font-black text-slate-800"
                        step="0.01"
                      />
                      <span className="text-xl font-black text-slate-800">kW</span>
                    </div>
                    <span className="block text-[9px] text-slate-400 mt-1 font-mono">{results.totalHp} hp total equivalente</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Consumo Promedio Hora</span>
                    <span className="text-xl font-black text-cyan-700">{results.averageHourlyConsumptionKw.toFixed(2)} kWh</span>
                    <span className="block text-[9px] text-cyan-600 font-mono mt-1">Factor de Carga: {inputs.loadFactor}%</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 transition-all hover:border-cyan-300 group">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Costo Eléctrico Hora</span>
                    <span className="text-xl font-black text-slate-800">${results.hourlyElectricityCostMxn.toFixed(2)} MXN</span>
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 mt-1 font-mono">
                      Tarifa: $
                      <input 
                        type="number"
                        value={inputs.electricityRate}
                        onChange={(e) => setInputs(prev => ({ ...prev, electricityRate: parseFloat(e.target.value) || 0 }))}
                        className="w-12 bg-transparent border-b border-dashed border-slate-300 focus:border-cyan-500 focus:outline-none text-slate-500 px-0.5 group-hover:text-cyan-700"
                        step="0.01"
                      />
                      /kWh <Edit2 className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Consumo Específico</span>
                    <span className="text-xl font-black text-slate-800">{results.kwhPer1000Boxes.toFixed(1)} kWh/kCajas</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Costo por 1000 Cajas</span>
                    <span className="text-xl font-black text-cyan-700">${results.electricityCostPer1000BoxesMxn.toFixed(2)} MXN</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Costo Eléctrico Mensual</span>
                    <span className="text-xl font-black text-slate-800">${new Intl.NumberFormat().format(results.monthlyElectricityCostMxn.toFixed(0))} MXN</span>
                  </div>
                </div>
              </div>

              {/* ANÁLISIS CAPACIDAD VS REQUERIMIENTO */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                  <BarChart3 className="w-5 h-5 text-cyan-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Capacidad Diaria vs Requerimiento Diario</h3>
                </div>

                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        { name: 'Requerimiento Diario', valor: inputs.meta_diaria_cajas, fill: '#64748b' },
                        { name: 'Capacidad Diaria Real', valor: results.dailyProductionBoxes, fill: '#06b6d4' }
                      ]}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} label={{ value: 'kg / día', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' } }} />
                      <Tooltip formatter={(value) => [`${new Intl.NumberFormat().format(value)} kg`, 'Valor']} />
                      <Bar dataKey="valor" radius={[10, 10, 0, 0]} maxBarSize={60}>
                        {
                          [
                            { fill: '#64748b' },
                            { fill: '#06b6d4' }
                          ].map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))
                        }
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="text-center text-xs font-bold text-slate-500 mt-2">
                  Margen operativo disponible: <span className="text-cyan-600">{new Intl.NumberFormat().format(Math.max(0, results.dailyProductionBoxes - inputs.meta_diaria_cajas).toFixed(0))} cajas/día</span>
                </div>
              </div>

              {/* PROYECCIÓN MENSUAL */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                  <TrendingUp className="w-5 h-5 text-cyan-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Proyección de Producción y Costo Eléctrico Anual</h3>
                </div>

                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} label={{ value: 'Producción (ton)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' } }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tickLine={false} label={{ value: 'Costo Electricidad (MXN)', angle: 90, position: 'insideRight', style: { fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' } }} />
                      <Tooltip />
                      <Legend verticalAlign="top" height={36} />
                      <Line yAxisId="left" type="monotone" dataKey="Produccion" stroke="#06b6d4" strokeWidth={3} name="Producción Real (ton)" />
                      <Line yAxisId="left" type="monotone" dataKey="Meta" stroke="#64748b" strokeWidth={2} strokeDasharray="5 5" name="Meta Mensual (ton)" />
                      <Line yAxisId="right" type="monotone" dataKey="CostoEnergía" stroke="#ef4444" strokeWidth={2} name="Costo Eléctrico (MXN)" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* EVALUACIÓN DE PRODUCCIÓN VS CONSUMO ENERGÉTICO */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                  <Activity className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Evaluación de Producción vs Consumo Energético</h3>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-y border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-black text-slate-800 uppercase tracking-wider text-[10px]">Período Operativo</th>
                        <th className="px-4 py-3 font-black text-cyan-800 uppercase tracking-wider text-[10px] text-right">Producción (Cajas)</th>
                        <th className="px-4 py-3 font-black text-indigo-800 uppercase tracking-wider text-[10px] text-right">Consumo (kWh)</th>
                        <th className="px-4 py-3 font-black text-emerald-800 uppercase tracking-wider text-[10px] text-right">Ratio (kWh/kCajas)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { period: 'Por Hora', prod: results.realProductionPerHourBoxes || 0, cons: results.averageHourlyConsumptionKw || 0 },
                        { period: 'Por Día', prod: results.dailyProductionBoxes || 0, cons: (results.averageHourlyConsumptionKw || 0) * ((inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1)) },
                        { period: 'Por Semana', prod: (results.dailyProductionBoxes || 0) * 7, cons: (results.averageHourlyConsumptionKw || 0) * ((inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1)) * 7 },
                        { period: 'Por Mes', prod: (results.dailyProductionBoxes || 0) * (inputs.daysPerMonth || 24), cons: (results.averageHourlyConsumptionKw || 0) * ((inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1)) * (inputs.daysPerMonth || 24) }
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-700">{row.period}</td>
                          <td className="px-4 py-3 font-bold text-cyan-600 text-right">{new Intl.NumberFormat().format(Math.round(row.prod))}</td>
                          <td className="px-4 py-3 font-bold text-indigo-600 text-right">{new Intl.NumberFormat().format((row.cons).toFixed(1))}</td>
                          <td className="px-4 py-3 font-black text-emerald-600 text-right">{new Intl.NumberFormat().format((row.prod > 0 ? (row.cons / (row.prod / 1000)) : 0).toFixed(2))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-3">
                    <Info className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-indigo-800 font-medium leading-relaxed">
                      El <strong>Consumo Específico (Ratio)</strong> indica la cantidad exacta de kilowatts requeridos para procesar 1,000 cajas. Un ratio bajo asegura la alta rentabilidad energética de la línea industrial.
                    </p>
                  </div>
                </div>
              </div>

              {/* ANÁLISIS A 5 AÑOS (Y1-Y5) Y AGUA */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-4">
                  <Activity className="w-5 h-5 text-emerald-600" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Proyección de Viabilidad a 5 Años (Y1-Y5)</h3>
                </div>
                
                <div className="overflow-x-auto mb-6">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-slate-50 border-y border-slate-200">
                      <tr>
                        <th className="px-4 py-3 font-black text-slate-800 uppercase tracking-wider text-[10px]">Año</th>
                        <th className="px-4 py-3 font-black text-slate-800 uppercase tracking-wider text-[10px] text-center">Hrs B</th>
                        <th className="px-4 py-3 font-black text-slate-800 uppercase tracking-wider text-[10px] text-center">EF/T</th>
                        <th className="px-4 py-3 font-black text-slate-800 uppercase tracking-wider text-[10px] text-center">Turn</th>
                        <th className="px-4 py-3 font-black text-indigo-800 uppercase tracking-wider text-[10px] text-center">T.Disp</th>
                        <th className="px-4 py-3 font-black text-amber-600 uppercase tracking-wider text-[10px] text-right">Req/H</th>
                        <th className="px-4 py-3 font-black text-emerald-800 uppercase tracking-wider text-[10px] text-right">Cap/H</th>
                        <th className="px-4 py-3 font-black text-emerald-800 uppercase tracking-wider text-[10px] text-right">Bal.</th>
                        <th className="px-4 py-3 font-black text-emerald-800 uppercase tracking-wider text-[10px] text-right">Cob.</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {results.projectionY5?.map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-sky-600">{row.year}</td>
                          <td className="px-4 py-3 font-bold text-slate-600 text-center">{row.hrsB}</td>
                          <td className="px-4 py-3 font-bold text-slate-600 text-center">{row.efT.toFixed(2)}</td>
                          <td className="px-4 py-3 font-bold text-slate-600 text-center">{row.turn}</td>
                          <td className="px-4 py-3 font-black text-indigo-600 text-center">{row.tDisp.toFixed(2)}</td>
                          <td className="px-4 py-3 font-black text-amber-600 text-right">{row.reqH.toFixed(1)}</td>
                          <td className="px-4 py-3 font-black text-emerald-600 text-right">{row.capH.toFixed(1)}</td>
                          <td className="px-4 py-3 font-black text-emerald-600 text-right">+{row.bal.toFixed(1)}</td>
                          <td className="px-4 py-3 font-black text-emerald-600 text-right">{row.cob.toFixed(1)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                    <span className="text-[10px] font-black text-sky-700 uppercase flex items-center gap-1.5 mb-1"><Droplet className="w-3.5 h-3.5" /> Consumo Hídrico Mensual</span>
                    <div className="text-xl font-black text-sky-900 mt-1">{new Intl.NumberFormat().format(results.totalWaterMonthlyLiters || 0)} L</div>
                  </div>
                  <div className="bg-sky-50 border border-sky-100 rounded-xl p-4">
                    <span className="text-[10px] font-black text-sky-700 uppercase flex items-center gap-1.5 mb-1"><AlertCircle className="w-3.5 h-3.5" /> Recambios + Evaporación</span>
                    <div className="text-sm font-bold text-sky-800 mt-1">Tanque: {inputs.waterTankLiters}L / {inputs.waterDragOutPercent}% Arrastre</div>
                  </div>
                  <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                    <span className="text-[10px] font-black text-emerald-700 uppercase flex items-center gap-1.5 mb-1"><Activity className="w-3.5 h-3.5" /> Impacto OPEX Hídrico</span>
                    <div className="text-xl font-black text-emerald-900 mt-1">${new Intl.NumberFormat().format(results.waterCostMonthlyMxn || 0)} MXN</div>
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 5: COMPARATIVA DE ESCENARIOS */}
          {activeTab === 'escenarios' && (
            <div className="space-y-6">
              
              {/* TABLA COMPARATIVA */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Percent className="w-5 h-5 text-cyan-600" />
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Simulación de Escenarios Operativos</h3>
                    {renderPdfToggleButton('escenarios', 'Escenarios')}
                  </div>
                </div>

                <p className="text-xs text-slate-500 leading-relaxed mb-6 font-medium">
                  Compara el comportamiento del equipo bajo tres regímenes de OEE diferentes. El factor de carga ({inputs.loadFactor}%) y la tarifa eléctrica (${inputs.electricityRate.toFixed(2)} MXN/kWh) se mantienen constantes.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Conservador */}
                  <div className={`border rounded-2xl p-5 flex flex-col justify-between transition-all ${currentScenario === 'conservador' ? 'border-cyan-500 bg-cyan-50/30 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Escenario</span>
                      <h4 className="text-lg font-black text-slate-800 uppercase mt-0.5">CONSERVADOR</h4>
                      <div className="mt-4 space-y-3 text-xs font-semibold text-slate-600">
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>OEE:</span><span className="text-slate-800 font-bold">70%</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Producción:</span><span className="text-slate-800 font-bold">{(currentNominalCapacity * 0.7).toFixed(0)} cajas/h</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Producción Diaria:</span><span className="text-slate-800 font-bold">{scenarioResults.conservador.dailyProdTon.toFixed(1)} ton</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Costo por Ton:</span><span className="text-slate-800 font-bold">${scenarioResults.conservador.costPerTon.toFixed(1)} MXN</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Cobertura Meta:</span><span className="text-slate-800 font-bold">{scenarioResults.conservador.coverage.toFixed(1)}%</span></div>
                        
                      </div>
                    </div>
                    <button 
                      onClick={() => applyScenario('conservador')}
                      className="mt-6 w-full py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all uppercase tracking-wider"
                    >
                      Aplicar Escenario
                    </button>
                  </div>

                  {/* Normal */}
                  <div className={`border rounded-2xl p-5 flex flex-col justify-between transition-all ${currentScenario === 'normal' ? 'border-cyan-500 bg-cyan-50/30 shadow-sm' : 'border-slate-200 bg-white hover:bg-slate-50'}`}>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Escenario</span>
                      <h4 className="text-lg font-black text-slate-800 uppercase mt-0.5">NORMAL</h4>
                      <div className="mt-4 space-y-3 text-xs font-semibold text-slate-600">
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>OEE:</span><span className="text-slate-800 font-bold">85%</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Producción:</span><span className="text-slate-800 font-bold">{(currentNominalCapacity * 0.85).toFixed(0)} cajas/h</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Producción Diaria:</span><span className="text-slate-800 font-bold">{scenarioResults.normal.dailyProdTon.toFixed(1)} ton</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Costo por Ton:</span><span className="text-slate-800 font-bold">${scenarioResults.normal.costPerTon.toFixed(1)} MXN</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Cobertura Meta:</span><span className="text-slate-800 font-bold">{scenarioResults.normal.coverage.toFixed(1)}%</span></div>
                        
                      </div>
                    </div>
                    <button 
                      onClick={() => applyScenario('normal')}
                      className="mt-6 w-full py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all uppercase tracking-wider"
                    >
                      Aplicar Escenario
                    </button>
                  </div>

                  {/* Alto Rendimiento */}
                  <div className={`border rounded-2xl p-5 flex flex-col justify-between transition-all ${currentScenario === 'alto' ? 'border-cyan-500 bg-cyan-50/30 shadow-sm' : 'border-slate-250 bg-white hover:bg-slate-50'}`}>
                    <div>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Escenario</span>
                      <h4 className="text-lg font-black text-slate-800 uppercase mt-0.5">ALTO RENDIMIENTO</h4>
                      <div className="mt-4 space-y-3 text-xs font-semibold text-slate-600">
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>OEE:</span><span className="text-slate-800 font-bold">95%</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Producción:</span><span className="text-slate-800 font-bold">{(currentNominalCapacity * 0.95).toFixed(0)} cajas/h</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Producción Diaria:</span><span className="text-slate-800 font-bold">{scenarioResults.alto.dailyProdTon.toFixed(1)} ton</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Costo por Ton:</span><span className="text-slate-800 font-bold">${scenarioResults.alto.costPerTon.toFixed(1)} MXN</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Cobertura Meta:</span><span className="text-slate-800 font-bold">{scenarioResults.alto.coverage.toFixed(1)}%</span></div>
                        
                      </div>
                    </div>
                    <button 
                      onClick={() => applyScenario('alto')}
                      className="mt-6 w-full py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-all uppercase tracking-wider"
                    >
                      Aplicar Escenario
                    </button>
                  </div>

                </div>
                
                {/* GRÁFICA COMPARATIVA DE ESCENARIOS */}
                <div className="mt-8 border-t border-slate-100 pt-6">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-600" />
                    Comparativa de Rendimiento (Producción vs Costo)
                  </h4>
                  <div className="h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          { name: 'Conservador (70%)', produccion: scenarioResults.conservador.dailyProdTon, costo: scenarioResults.conservador.costPerTon },
                          { name: 'Normal (85%)', produccion: scenarioResults.normal.dailyProdTon, costo: scenarioResults.normal.costPerTon },
                          { name: 'Alto (95%)', produccion: scenarioResults.alto.dailyProdTon, costo: scenarioResults.alto.costPerTon }
                        ]}
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} fontWeight="bold" />
                        <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} tickLine={false} label={{ value: 'Producción (cajas/día)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' } }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} tickLine={false} label={{ value: 'Costo (MXN/kCajas)', angle: 90, position: 'insideRight', style: { fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' } }} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value, name) => [name === 'produccion' ? `${value.toFixed(0)} cajas` : `$${value.toFixed(1)}`, name === 'produccion' ? 'Producción Diaria' : 'Costo Operativo/kCajas']} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                        <Bar yAxisId="left" dataKey="produccion" name="Producción Diaria (cajas)" fill="#008299" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        <Bar yAxisId="right" dataKey="costo" name="Costo Operativo (MXN/kCajas)" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: CAPEX & OPEX */}
          {activeTab === 'capex' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CAPEX */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-4">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-emerald-600" />
                        Estructura CAPEX (Inversión Inicial)
                      </h3>
                      {renderPdfToggleButton('capex', 'CAPEX')}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">CAPEX Instalado (Sin IVA)</span>
                      <span className="text-3xl font-black text-slate-900">${new Intl.NumberFormat().format(results.capexInstaladoMxn.toFixed(0))} <span className="text-lg text-slate-500">MXN</span></span>
                    </div>
                    <div className="space-y-2 mt-4">
                      {[
                        { label: 'Equipo Base', val: results.precioEquipoUsd * (inputs.tipoCambio || 1) },
                        { label: 'Montaje y Maniobras', val: (results.maniobrasUsd + results.montajeMecanicoUsd) * (inputs.tipoCambio || 1) },
                        { label: 'Instalación Eléctrica', val: (results.electricoPrincipalUsd + results.canalizacionProteccionesUsd) * (inputs.tipoCambio || 1) },
                        { label: 'Sistemas Hídricos / Drenaje', val: (results.extraccionPolvoUsd + results.seguridadIndustrialUsd) * (inputs.tipoCambio || 1) },
                        { label: 'Obra Civil e Ingeniería *', val: (results.obraCivilUsd + results.ingenieriaSupervisionUsd) * (inputs.tipoCambio || 1) },
                        { label: 'Contingencia y Otros *', val: (results.contingenciaUsd + (results.otrosCapexUsd || 0)) * (inputs.tipoCambio || 1) },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-xs font-semibold">
                          <span className="text-slate-600 uppercase">{item.label}</span>
                          <span className="text-emerald-700">${new Intl.NumberFormat().format(item.val.toFixed(0))}</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-2 p-2.5 bg-blue-50 border-l-[3px] border-blue-400 text-[11px] text-blue-700 font-medium leading-relaxed">
                      * Las partidas de Obra Civil, Ingeniería y Contingencia son estimaciones sujetas a evaluación en sitio y diseño de layout final.
                    </div>
                    <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between text-xs">
                      <span className="font-bold text-slate-400 uppercase">CAPEX por kCajas/h:</span>
                      <span className="font-black text-slate-800">${new Intl.NumberFormat().format((results.capexInstaladoMxn / (results.realProductionPerHourBoxes/1000)).toFixed(0))} MXN</span>
                    </div>
                  </div>
                </div>

                {/* OPEX */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-rose-600" />
                    Estructura OPEX (Gasto Mensual)
                  </h3>
                  <div className="space-y-4">
                    <div>
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">OPEX Mensual Total</span>
                      <span className="text-3xl font-black text-slate-900">${new Intl.NumberFormat().format(results.opexMensualMxn.toFixed(0))} <span className="text-lg text-slate-500">MXN</span></span>
                    </div>
                    <div className="space-y-2 mt-4">
                      {[
                        { label: 'Energía Eléctrica', val: results.monthlyElectricityCostMxn },
                        { label: 'Mano de Obra', val: results.manoObraMensualMxn },
                        { label: 'Mantenimiento Preventivo', val: results.mantenimientoMensualMxn },
                        { label: 'Refacciones (Filtros, etc)', val: inputs.filtrosMensualMxn + inputs.refaccionesMensualMxn },
                        { label: 'Lubricación y Consumibles', val: inputs.lubricacionMensualMxn + inputs.limpiezaMensualMxn + inputs.consumiblesMensualMxn },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-xs font-semibold">
                          <span className="text-slate-600 uppercase">{item.label}</span>
                          <span className="text-rose-700">${new Intl.NumberFormat().format(item.val.toFixed(0))}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between text-xs">
                      <span className="font-bold text-slate-400 uppercase">OPEX por caja:</span>
                      <span className="font-black text-slate-800">${new Intl.NumberFormat().format(results.opexPor1000CajasMxn.toFixed(1))} MXN</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 7: FINANCIERO */}
          {activeTab === 'financiero' && (
            <div className="space-y-6">
              
              {/* CONFIGURACIÓN FINANCIERA INTERACTIVA */}
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-200 flex flex-col md:flex-row gap-6 items-center justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h4 className="text-sm font-black uppercase tracking-wider text-slate-800">Modelo de Ingresos</h4>
                    {renderPdfToggleButton('financiero', 'Financiero')}
                  </div>
                  <p className="text-xs text-slate-500 font-medium max-w-sm">Configura cómo se genera el flujo de capital de la línea (Venta comercial directa del material procesado o Ahorro operativo interno).</p>
                </div>
                <div className="flex gap-2 bg-slate-200 p-1.5 rounded-2xl">
                  <button onClick={() => setInputs(p => ({...p, usarModoIngresoVenta: true, usarModoAhorroInterno: false}))} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${inputs.usarModoIngresoVenta ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Venta Comercial
                  </button>
                  <button onClick={() => setInputs(p => ({...p, usarModoIngresoVenta: false, usarModoAhorroInterno: true}))} className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${inputs.usarModoAhorroInterno ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                    Ahorro Interno
                  </button>
                </div>
                <div className="w-full md:w-64">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">{inputs.usarModoIngresoVenta ? 'Precio de Venta por caja' : 'Ahorro Operativo por caja'} (MXN)</span>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">$</span>
                    <input 
                      type="number" step="10" 
                      value={inputs.usarModoIngresoVenta ? inputs.precioVentaTonMxn : inputs.ahorroPorTonMxn} 
                      onChange={e => setInputs(p => inputs.usarModoIngresoVenta ? ({...p, precioVentaTonMxn: parseFloat(e.target.value) || 0}) : ({...p, ahorroPorTonMxn: parseFloat(e.target.value) || 0}))} 
                      className="w-full pl-8 pr-4 py-2.5 bg-white border border-purple-200 rounded-xl text-sm font-black text-purple-700 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all shadow-sm" 
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    Viabilidad y Retorno de Inversión
                  </h3>
                  <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    results.paybackMeses <= 24 ? 'bg-emerald-100 text-emerald-700' : 
                    results.paybackMeses <= 36 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {results.estadoFinanciero}
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Ingreso Bruto Mensual</span>
                    <span className="text-xl font-black text-slate-800">${new Intl.NumberFormat().format(results.ingresoMensual.toFixed(0))}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Flujo Operativo (EBITDA)</span>
                    <span className="text-xl font-black text-purple-700">${new Intl.NumberFormat().format(results.flujoOperativoMensual.toFixed(0))}</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">ROI Anual</span>
                    <span className="text-xl font-black text-slate-800">{results.roiAnual.toFixed(1)}%</span>
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase">Payback (Meses)</span>
                    <span className="text-xl font-black text-cyan-600">{results.paybackMeses === Infinity ? 'N/A' : results.paybackMeses.toFixed(1)}</span>
                  </div>
                </div>

                <div className="h-[300px]">
                  {/* Aquí podría ir la gráfica de punto de equilibrio, pero se mostrará un análisis de texto si no está */}
                  <div className="w-full h-full bg-slate-50 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center p-6">
                    <DollarSign className="w-12 h-12 text-slate-300 mb-4" />
                    <h4 className="text-lg font-black text-slate-700 uppercase">Punto de Equilibrio: <span className="text-purple-600">{new Intl.NumberFormat().format(results.puntoEquilibrioTonMes.toFixed(1))} ton/mes</span></h4>
                    <p className="text-xs text-slate-500 max-w-md mt-2 font-medium">
                      La operación requiere procesar al menos <strong>{new Intl.NumberFormat().format(results.puntoEquilibrioTonMes.toFixed(1))}</strong> millares de cajas mensuales para cubrir todos los gastos operativos (OPEX). Cualquier producción por encima de este umbral genera utilidad neta.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 8: RIESGOS & MANTENIMIENTO */}
          {activeTab === 'riesgos' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* MATRIZ DE RIESGO */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <div className="flex items-center gap-4 mb-4 border-b border-slate-100 pb-3">
                    <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-red-600" />
                      Matriz de Riesgo Operativo
                    </h3>
                    {renderPdfToggleButton('riesgos', 'Riesgos')}
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: 'Exposición a Polvo Fino', val: inputs.riesgoPolvo, icon: 'ðŸŒªï¸' },
                      { label: 'Riesgo de Incendio', val: inputs.riesgoIncendio, icon: 'ðŸ”¥' },
                      { label: 'Contaminación Metálica', val: inputs.riesgoMetal, icon: 'ðŸ§²' },
                      { label: 'Contaminación Acústica', val: inputs.riesgoRuido, icon: 'ðŸ”Š' }
                    ].map((r, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <span className="text-xs font-bold text-slate-600 uppercase flex items-center gap-2">{r.icon} {r.label}</span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          r.val === 'alto' ? 'bg-red-100 text-red-700' : 
                          r.val === 'medio' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>{r.val}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* MANTENIMIENTO Y SEGURIDAD */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <Wrench className="w-5 h-5 text-slate-600" />
                    Mantenimiento y Sistemas Requeridos
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Cambio Filtros</span>
                      <span className="text-lg font-black text-slate-800">{inputs.vidaUtilCuchillasHoras || 800} hrs</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Mtto General</span>
                      <span className="text-lg font-black text-slate-800">{inputs.frecuenciaMantenimientoHoras || 250} hrs</span>
                    </div>
                  </div>
                  
                  <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3">Requisitos de Seguridad de Planta</h4>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { label: 'Extracción de Polvo', val: inputs.requiereExtraccionPolvo },
                      { label: 'Sistema vs Incendio', val: inputs.requiereSistemaContraIncendio },
                      { label: 'Cabina Acústica', val: inputs.requiereCabinaAcustica },
                      { label: 'Protocolo LOTO', val: inputs.requiereLOTO },
                      { label: 'Guardas Físicas', val: inputs.requiereGuardas },
                      { label: 'Paros de Emergencia', val: inputs.requiereEStop }
                    ].map((req, i) => req.val && (
                      <span key={i} className="bg-cyan-50 border border-cyan-200 text-cyan-700 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase flex items-center gap-1.5">
                        <Check className="w-3 h-3" /> {req.label}
                      </span>
                    ))}
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 9: REQUERIMIENTOS DE OBRA CIVIL Y PISO */}
          {activeTab === 'civil' && (
            <div className="space-y-6">
              
              {/* ENCABEZADO DE SECCIÓN CON CONTROL PDF */}
              <div className="bg-white border border-slate-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-slate-100 rounded-xl text-slate-700">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Especificaciones Estructurales de Obra Civil
                    </h3>
                    <p className="text-[10px] text-slate-500 font-bold mt-0.5 uppercase tracking-wide">
                      Dictamen y requerimientos técnicos del piso y área
                    </p>
                  </div>
                </div>
                <div>
                  {renderPdfToggleButton('civil', 'Obra Civil')}
                </div>
              </div>

              {/* TARJETAS KPI DE OBRA CIVIL */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                
                {/* Concreto */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:border-slate-400 transition-colors group">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    Especificación Concreto
                  </span>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-slate-900">f'c {inputs.civilConcretoFc || 250}</span>
                    <span className="text-xs font-bold text-slate-400 ml-1">kg/cm²</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-1">Concreto Estructural</span>
                </div>

                {/* Espesor */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:border-slate-400 transition-colors group">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Ruler className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    Espesor de Losa
                  </span>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-slate-900">{inputs.civilEspesorPisoCm || 20}</span>
                    <span className="text-xs font-bold text-slate-400 ml-1">cm</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-1">Losa de cimentación</span>
                </div>

                {/* Carga Máxima */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:border-slate-400 transition-colors group">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    Carga Soportada
                  </span>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-slate-900">{inputs.civilCargaSoportada || 8.0}</span>
                    <span className="text-xs font-bold text-slate-400 ml-1">Ton/m²</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-1">Capacidad portante</span>
                </div>

                {/* Área requerida */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm hover:border-slate-400 transition-colors group">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Grid className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    Área de Bodega
                  </span>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-slate-900">{inputs.civilAreaRequeridaM2 || 75}</span>
                    <span className="text-xs font-bold text-slate-400 ml-1">m²</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-1">Espacio de operación</span>
                </div>

              </div>

              {/* DETALLES DE OBRA CIVIL Y ESPECIFICACIONES DE PISO */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* ESPECIFICACIONES DEL PISO DE LA BODEGA Y ÁREA */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <Layers className="w-4 h-4 text-slate-500" />
                        Especificaciones del Piso y Bodega
                      </h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                        <span className="font-bold text-slate-500 uppercase">Acabado Superficial</span>
                        <span className="font-extrabold text-slate-850 text-right uppercase">{inputs.civilAcabadoPiso || 'PULIDO ESPEJO CON ENDURECEDOR DE CUARZO'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                        <span className="font-bold text-slate-500 uppercase">Refuerzo Estructural</span>
                        <span className="font-extrabold text-slate-850 text-right uppercase">{inputs.civilRefuerzoPiso || 'DOBLE PARRILLA DE VARILLA 3/8" @ 20CM'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                        <span className="font-bold text-slate-500 uppercase">Tratamiento de Juntas</span>
                        <span className="font-extrabold text-slate-850 text-right uppercase">{inputs.civilJuntasDilatacion || 'SELLO ELASTOMÉRICO DE POLIURETANO'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                        <span className="font-bold text-slate-500 uppercase">Sistema de Anclaje</span>
                        <span className="font-extrabold text-slate-850 text-right uppercase">{inputs.civilAnclajeTornillos || 'HILTI HAS-E CON RESINA HIT-RE 500 V3'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500 uppercase">Volumen de Excavación</span>
                        <span className="font-extrabold text-slate-850 text-right uppercase">{inputs.civilExcavacionM3 || 4.5} m³</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-6">
                    <span className="text-[10px] font-black text-slate-850 uppercase tracking-wider block mb-1">Nota de Seguridad Estructural</span>
                    <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                      Debido a las fuerzas dinámicas de lavado del equipo {inputs.machineName || 'WM-500'}, se requiere un piso de bodega reforzado para evitar fisuras por fatiga y vibración armónica. El anclaje químico debe realizarse posterior a la cura completa del concreto (28 días).
                    </p>
                  </div>
                </div>

                {/* DETALLES DE OBRA CIVIL Y ÁREA OPERATIVA */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4 border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-slate-500" />
                        Requerimientos de Instalación y Obra Civil
                      </h3>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                        <span className="font-bold text-slate-500 uppercase">Canalizaciones Subterráneas</span>
                        <span className="font-extrabold text-slate-850 text-right uppercase">{inputs.civilCanalizacionesSubterraneas || '2 TUBOS PVC DE 4" Y 1 TUBO DE 2"'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                        <span className="font-bold text-slate-500 uppercase">Mitigación de Vibraciones</span>
                        <span className="font-extrabold text-slate-850 text-right uppercase">{inputs.civilSistemaVibracion || 'NEOPRENO DE ALTA DENSIDAD / ELASTÓMERO'}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                        <span className="font-bold text-slate-500 uppercase">Dimensiones del Equipo</span>
                        <span className="font-extrabold text-slate-850 text-right uppercase">{inputs.machineLength || 14.5}m x {inputs.machineWidth || 1.75}m x {inputs.machineHeight || 1.9}m</span>
                      </div>
                      <div className="flex justify-between items-center text-xs border-b border-slate-50 pb-2">
                        <span className="font-bold text-slate-500 uppercase">Peso de la Lavadora y Secadora</span>
                        <span className="font-extrabold text-slate-850 text-right uppercase">{inputs.pesoOperativoKg && inputs.pesoOperativoKg !== 1000 ? new Intl.NumberFormat().format(inputs.pesoOperativoKg) : '1,800'} kg</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-bold text-slate-500 uppercase">Área Mínima Libre de Maniobras</span>
                        <span className="font-extrabold text-slate-850 text-right uppercase">{inputs.civilAreaRequeridaM2 || 75} m²</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 mt-6">
                    <span className="text-[10px] font-black text-slate-850 uppercase tracking-wider block mb-1">Gobernanza de Obra Civil</span>
                    <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
                      Se recomienda dejar canalizaciones perimetrales con registros de fácil acceso para cables de potencia y control. El área de maniobras debe contar con un radio mínimo libre para alimentación y descarga continua de material mediante montacargas.
                    </p>
                  </div>
                </div>

              </div>
            </div>
          )}

      </div>
      </div>

      {/* RENDERIZADO DEL INFORME COMPLETO EN LANDSCAPE */}
      {isReportModalOpen && (currentSectionIndex = 1, true) && (
        <div className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex flex-col items-center justify-start p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 rounded-3xl p-6 w-full max-w-[1200px] shadow-2xl relative text-slate-900 mt-10 mb-10 shrink-0">
            <button 
              onClick={() => {
                setIsReportModalOpen(false);
                setIsPreviewMode(false);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-650"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                {!isPreviewMode && <span className="animate-spin text-cyan-600">⏳</span>}
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                  {isPreviewMode ? 'Vista Previa del Reporte' : 'Generando Reporte PDF WM-500...'}
                </h3>
              </div>
              {isPreviewMode && (
                <div className="flex items-center gap-2">
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all uppercase tracking-wider shadow-sm">
                    <Upload className="w-4 h-4" />
                    Subir Diagrama
                    <input type="file" accept="image/*" className="hidden" onChange={handleCustomProcessImageUpload} />
                  </label>
                  <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all uppercase tracking-wider shadow-sm">
                    <Upload className="w-4 h-4" />
                    Subir Logo
                    <input type="file" accept="image/*" className="hidden" onChange={handleCustomClientLogoUpload} />
                  </label>
                  <button 
                    onClick={printReport}
                    disabled={isGeneratingPdf}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-all uppercase tracking-wider shadow-sm"
                  >
                    <Printer className="w-4 h-4" />
                    Descargar PDF
                  </button>
                </div>
              )}
            </div>

            {/* VISTA PREVIA DEL INFORME (A4 LANDSCAPE) */}
            <div className="max-h-[600px] w-full overflow-y-auto overflow-x-hidden border border-slate-200 rounded-xl bg-slate-50 p-4 shadow-inner flex flex-col items-center">
              <div ref={reportRef} className="flex flex-col gap-8" style={{ width: '1120px' }}>
                
                {/* PÁGINA 1: PORTADA EJECUTIVA */}
                {pdfConfig.resumen && (
                <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                  <div style={{ height: 80, background: 'linear-gradient(to right, #008299, #00c2cb)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(120deg, transparent, transparent 28px, rgba(255,255,255,0.03) 28px, rgba(255,255,255,0.03) 30px)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2 }}>
                      <span style={{ color: '#fff', fontWeight: 900, fontSize: 36, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>{inputs.companyName || 'CENTERS DE MÉXICO'}</span>
                      <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '2px 8px', background: 'rgba(255,255,255,0.1)' }}>PANDORA 3.0</span>
                    </div>
                    <div style={{ textAlign: 'right', position: 'relative', zIndex: 2 }}>
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>lavadora INDUSTRIAL {inputs.machineName?.toUpperCase() || 'WM-500'}</div>
                      <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 700, marginTop: 3 }}>CLIENTE: {inputs.clientName.toUpperCase()} &nbsp;|&nbsp; MÁQUINA: {inputs.machineName?.toUpperCase() || 'WM-500'} &nbsp;|&nbsp; FECHA: {(inputs.evaluationDate || new Date().toLocaleDateString()).toUpperCase()}</div>
                    </div>
                  </div>

                  <div style={{ ...S.inner, height: 'auto', display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40, alignItems: 'center', flex: 1, paddingTop: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 900, color: '#008299', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>INFORME PARAMÉTRICO DE SIMULACIÓN</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ fontSize: 44, fontWeight: 900, color: '#0f2038', letterSpacing: -0.8, lineHeight: 1.0, fontFamily: 'sans-serif' }}>SIMULACIÓN</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <div style={{ width: 4, height: 38, background: '#00c2cb', borderRadius: 2 }} />
                              <div style={{ fontSize: 44, fontWeight: 900, color: '#00c2cb', letterSpacing: -0.8, lineHeight: 1.0, fontFamily: 'sans-serif' }}>DE LÍNEA</div>
                            </div>
                          </div>
                        </div>
                        {inputs.customClientLogo && (
                          <img src={inputs.customClientLogo} alt="Logo Cliente" style={{ maxHeight: '45px', maxWidth: '140px', objectFit: 'contain' }} />
                        )}
                      </div>

                      <div style={{ marginTop: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: '#00c2cb', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 }}>CLIENTE</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#0f2038', letterSpacing: -0.5 }}>{inputs.clientName.toUpperCase()}</div>
                      </div>

                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content', background: '#edfbfd', border: '1px solid #00c2cb', borderRadius: 20, padding: '4px 14px', fontSize: 10, color: '#008299', fontWeight: 800 }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, background: '#008299', borderRadius: '50%' }} />
                        Evaluación de Capacidad y Eficiencia
                      </div>

                      <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.6, margin: 0 }}>Análisis de capacidad, potencia instalada y viabilidad financiera para la línea de lavado, enjuague y secado de cajas plásticas con la {inputs.machineName || 'WM-500'}.</p>
                    <div style={{ marginTop: 12, padding: 12, backgroundColor: "#f8fafc", borderLeft: "4px solid #0284c7", fontSize: 10, color: "#475569", lineHeight: 1.5 }}>
                      <strong>Nota Metodológica:</strong> La capacidad por modelo se calcula en función de la velocidad lineal de la banda, la dimensión de la caja en el sentido de avance y la separación entre unidades. El resultado está limitado a una capacidad física máxima de 350 cajas/h. La capacidad real considera el OEE seleccionado.
                    </div>

                      <div style={{ background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 16, padding: 18 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: 11, color: '#475569' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#008299', fontWeight: 700 }}>Empresa</span><strong style={{ color: '#1e293b' }}>{inputs.companyName || `MÁQUINA EN EVALUACIÓN - ${inputs.machineName || 'WM-500'}`}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#008299', fontWeight: 700 }}>Cliente</span><strong style={{ color: '#1e293b' }}>{inputs.clientName}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#008299', fontWeight: 700 }}>Máquina</span><strong style={{ color: '#1e293b' }}>{inputs.machineName || 'WM-500'}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#008299', fontWeight: 700 }}>Proyecto</span><strong style={{ color: '#1e293b' }}>{inputs.projectName}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#008299', fontWeight: 700 }}>Fecha</span><strong style={{ color: '#1e293b' }}>{new Date().toLocaleDateString()}</strong></div>
                        </div>
                      </div>

                      <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 16, padding: 18, marginTop: -8 }}>
                        <span style={{ fontSize: 10, fontWeight: 900, color: '#0f766e', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 4 }}>PARÁMETROS DEL MATERIAL SIMULADO</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', fontSize: 11, color: '#475569' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#0f766e', fontWeight: 700 }}>Material Evaluado</span><strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>{inputs.materialType.replace('_', ' ')}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#0f766e', fontWeight: 700 }}>Régimen Diario</span><strong style={{ color: '#0f172a' }}>{results.hoursPerDay} horas ({inputs.shiftsPerDay} turnos)</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#0f766e', fontWeight: 700 }}>Meta Objetivo Diaria</span><strong style={{ color: '#0f172a' }}>{new Intl.NumberFormat().format(inputs.meta_diaria_cajas)} cajas/día</strong></div>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#edfbfd', borderRadius: 24, padding: 32, border: '1px solid #cffafe', display: 'flex', flexDirection: 'column', gap: 24, height: '100%', justifyContent: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: '#008299', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>VISTA PREVIA DE RESULTADOS</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cffafe', paddingBottom: 16 }}>
                        <div><div style={{ fontSize: 14, fontWeight: 800, color: '#0f2038' }}>Capacidad Real / Hora</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Considerando OEE del {inputs.oee}%</div></div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#008299' }}>{results.realProductionPerHourBoxes.toFixed(0)} cajas/h</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cffafe', paddingBottom: 16 }}>
                        <div><div style={{ fontSize: 14, fontWeight: 800, color: '#0f2038' }}>Producción Diaria</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Capacidad total por día</div></div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#008299' }}>{results.dailyProductionBoxes.toFixed(0)} cajas/día</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cffafe', paddingBottom: 16 }}>
                        <div><div style={{ fontSize: 14, fontWeight: 800, color: '#0f2038' }}>Costo de Producción (OPEX)</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Por 1,000 cajas procesadas</div></div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#008299' }}>{results.opexPor1000CajasMxn.toFixed(1)} MXN</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><div style={{ fontSize: 22, fontWeight: 900, color: '#0f2038' }}>Viabilidad Proyectada</div><div style={{ fontSize: 14, color: '#64748b', marginTop: 4, fontWeight: 600 }}>Cobertura de meta ({results.requirementCoverage.toFixed(1)}%)</div></div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#008299', textTransform: 'uppercase' }}>{results.viabilityState}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '0 48px 24px' }}>
                    <div style={{ borderTop: '1px solid #dbe5ee', paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
                      <span>{inputs.clientName.toUpperCase()} · MÁQUINA: {inputs.machineName?.toUpperCase() || 'WM-500'}</span><span>PÁGINA {++pdfPageIndex} DE {totalPdfPages}</span>
                    </div>
                  </div>
                </div>
                )}

                {/* PÁGINA 2+: GEMELO DIGITAL 3D */}
                {pdfConfig.twin && snapshotPages.length > 0 && (() => {
                  const pageSecNum = ++currentSectionIndex;
                  return snapshotPages.map((page, index) => (
                    <div key={index} className="pdf-page bg-white relative flex flex-col" style={S.page}>
                      <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {renderPageHeader(`${pageSecNum}. Vista ${page.type.charAt(0).toUpperCase() + page.type.slice(1)}`, 'Renderizado CAD de alta resolución del equipo en configuración de planta')}
                      
                      <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 16, background: '#edf4f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '100%', height: '100%', backgroundImage: `url(${page.src})`, backgroundSize: 'contain', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} />
                      </div>

                      <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: 12, padding: 16, fontSize: 10, lineHeight: 1.5, color: '#334155', fontWeight: 600 }}>
                        <span style={{ color: '#0f766e', fontWeight: 900, textTransform: 'uppercase', marginRight: 6 }}>Nota de Escala Visual ({page.type}): </span>
                        Esta proyección tridimensional corresponde a la captura exacta de la Lavadora {inputs.machineName || 'BWD-250'} evaluada bajo la perspectiva {page.type.toLowerCase()}. Las proporciones y el diseño representan el volumen real del equipo industrial proyectado en el software PANDORA 3.0.
                      </div>
                        {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                  </div>
                    </div>
                  ));
                })()}

                {/* PÁGINA SIGUIENTE: DATOS TÉCNICOS Y DICTAMEN AI */}
                {pdfConfig.tabla && (
                <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                  <div style={{ ...S.inner, flex: 1, paddingTop: 30, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {renderPageHeader(`${++currentSectionIndex}. Especificaciones Técnicas`, 'Listado físico nominal con potencias individuales calculadas al factor de carga')}

                    <div style={{ width: '100%' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                        <thead>
                          <tr>
                            <th style={{ ...REPORT_STYLES.th, padding: '6px 12px', background: '#edfbfd' }}>Equipo</th>
                            <th style={{ ...REPORT_STYLES.th, padding: '6px 12px', background: '#edfbfd', textAlign: 'center' }}>Capacidad</th>
                            <th style={{ ...REPORT_STYLES.th, padding: '6px 12px', background: '#edfbfd', textAlign: 'center' }}>kW Instalados</th>
                            <th style={{ ...REPORT_STYLES.th, padding: '6px 12px', background: '#edfbfd', textAlign: 'center' }}>Carga Activa ({inputs.loadFactor}%)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={REPORT_STYLES.td}>Banda Alimentadora (4,000 mm)</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>-</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>1.65 kW</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#0d9488', fontWeight: 700 }}>{(1.65 * (inputs.loadFactor/100)).toFixed(2)} kW</td>
                          </tr>
                          <tr>
                            <td style={REPORT_STYLES.td}>Lavadora Principal {inputs.machineName || 'BWD-250'} (Sistema de lavado {inputs.presionLavadoBar || 650} RPM)</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{new Intl.NumberFormat().format(currentNominalCapacity)} cajas/h</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{((inputs.motorBombaAguaHp || 120) * 0.746).toFixed(2)} kW</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#0d9488', fontWeight: 700 }}>{(((inputs.motorBombaAguaHp || 120) * 0.746) * (inputs.loadFactor/100)).toFixed(2)} kW</td>
                          </tr>
                          <tr>
                            <td style={REPORT_STYLES.td}>Motor Auxiliar Hidráulico</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>-</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{((inputs.motorSopladorHp || 10) * 0.746).toFixed(2)} kW</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#0d9488', fontWeight: 700 }}>{(((inputs.motorSopladorHp || 10) * 0.746) * (inputs.loadFactor/100)).toFixed(2)} kW</td>
                          </tr>
                          <tr>
                            <td style={REPORT_STYLES.td}>Banda de Descarga (3,000 mm)</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>-</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>1.65 kW</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#0d9488', fontWeight: 700 }}>{(1.65 * (inputs.loadFactor/100)).toFixed(2)} kW</td>
                          </tr>
                        </tbody>
                        <tfoot>
                          <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                            <td style={{ ...REPORT_STYLES.td, color: '#0d9488' }}>Total Sistema de Lavado {inputs.machineName || 'WM-500'}</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>-</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{(results.installedPowerKw || 96.98).toFixed(2)} kW</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#0d9488' }}>{(results.averageHourlyConsumptionKw || 72.73).toFixed(2)} kW</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '8px 12px', fontSize: 10, color: '#475569', lineHeight: 1.4 }}>
                      <strong>Nota del Ingeniero:</strong> Los componentes han sido calibrados mecánicamente para un voltaje nominal adaptado a los requerimientos eléctricos del sitio, con una carga activa basada en un OEE del {inputs.oee}%.
                    </div>

                    <div style={{ marginTop: 0, background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 16, padding: '8px 20px' }}>
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#008299', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 2 }}>DISTRIBUCIÓN DE POTENCIA INSTALADA POR EQUIPO (kW)</span>
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: 10, lineHeight: '1.2' }}>
                        <tbody>
                          {[
                            { name: 'Banda Alimentadora', kw: 1.65 },
                            { name: 'Motor Lavado Principal', kw: (inputs.motorBombaAguaHp || 15) * 0.746 },
                            { name: 'Motor Hidráulico', kw: (inputs.motorSopladorHp || 10) * 0.746 },
                            { name: 'Banda de Descarga', kw: 1.65 },
                          ].map((eq, i) => {
                            const percentage = (eq.kw / (results.installedPowerKw || 100.26)) * 100;
                            return (
                              <tr key={i} style={{ border: 'none' }}>
                                <td style={{ width: 160, color: '#475569', fontWeight: 650, padding: '2px 0 2px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap', border: 'none' }}>
                                  {eq.name}
                                </td>
                                <td style={{ padding: '2px 10px', verticalAlign: 'middle', border: 'none' }}>
                                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', width: '100%' }}>
                                    <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, #008299, #00c2cb)', borderRadius: 3 }} />
                                  </div>
                                </td>
                                <td style={{ width: 75, textAlign: 'right', fontWeight: 700, color: '#1e293b', padding: '2px 10px 2px 0', verticalAlign: 'middle', whiteSpace: 'nowrap', border: 'none' }}>
                                  {eq.kw.toFixed(2)} kW
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: 0 }}>
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#0f766e', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 2 }}>DICTAMEN TÉCNICO AUTOMÁTICO</span>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '10px 20px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {conclusions.map((c, i) => (
                          <div key={i} style={{ fontSize: 10, lineHeight: 1.35, fontWeight: 600, color: '#334155' }}>
                            <span style={{ color: '#00c2cb', fontWeight: 900, marginRight: 6 }}>â–ª</span>{c.text}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ flex: 1 }} />
                    {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                  </div>
                </div>
                )}

                {/* PÁGINA 3: FICHA TÉCNICA DE HOMOLOGACIÓN */}
                {pdfConfig.tabla && (
                <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                  <div style={{ ...S.inner, flex: 1, paddingTop: 30, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {renderPageHeader(`3. ${inputs.technicalSheetName === 'Ficha Técnica de Homologación BWD-250' ? 'Ficha Técnica de Máquina de Lavado BWD-250' : inputs.technicalSheetName}`, 'Desglose detallado de especificaciones, capacidades y componentes de fabricación')}

                    <div style={{ width: '100%', flex: 1 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                        <thead>
                          <tr>
                            <th style={{ ...REPORT_STYLES.th, padding: '5px 10px', background: '#edfbfd' }}>Componente / Característica</th>
                            <th style={{ ...REPORT_STYLES.th, padding: '5px 10px', background: '#edfbfd', textAlign: 'center' }}>Especificación Original</th>
                            <th style={{ ...REPORT_STYLES.th, padding: '5px 10px', background: '#edfbfd', textAlign: 'right' }}>Detalle Técnico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { comp: 'Modelo del Equipo', spec: inputs.machineName || 'BWD-250', detail: inputs.machineNameDetalle !== undefined ? inputs.machineNameDetalle : 'Lavadora Industrial de Cajas (Agua y Aire)' },
                            { comp: 'Aplicación Operativa', spec: inputs.aplicacionOperativa !== undefined ? inputs.aplicacionOperativa : 'Lavado, enjuague y secado de cajas plásticas', detail: inputs.aplicacionDetalle !== undefined ? inputs.aplicacionDetalle : 'Eficiencia de Lavado: 90-95% | Secado: 80-90%' },
                            { comp: 'Capacidad Nominal (Dinámica)', spec: `${new Intl.NumberFormat().format(currentNominalCapacity)} cajas/h`, detail: `Calculada para: ${activeBox.nombre} (${activeBox.largoCm}cm)` },
                            { comp: 'Motorización Principal (Bomba)', spec: `${inputs.motorBombaAguaHp || 15} hp ${inputs.motorMarca || 'Siemens'}`, detail: inputs.motorPrincipalDetalle !== undefined ? inputs.motorPrincipalDetalle : 'Motor de Bomba de Agua: 15 hp' },
                            { comp: 'Motorización Auxiliar (Soplador)', spec: `${inputs.motorSopladorHp || 10} hp ${inputs.motorMarca || 'Siemens'}`, detail: inputs.motorAuxiliarDetalle !== undefined ? inputs.motorAuxiliarDetalle : 'Motor Soplador: 10 hp | Banda: 0.5 hp' },
                            { comp: 'Potencia Instalada Total', spec: `${results.totalHp} hp`, detail: `${results.installedPowerKw.toFixed(2)} kW` },
                            { comp: 'Temperaturas de Proceso', spec: inputs.dimensionesBandas !== undefined ? inputs.dimensionesBandas : 'Temperatura de Lavado: 60-80°C', detail: inputs.dimensionesBandasDetalle !== undefined ? inputs.dimensionesBandasDetalle : 'Calentamiento: 18 kW' },
                            { comp: 'Presión de Aspersión', spec: inputs.bocaAlimentacion || '5.0 bar (Nominal)', detail: inputs.bocaAlimentacionDetalle !== undefined ? inputs.bocaAlimentacionDetalle : 'Presión de Agua: 5.0 bar' },
                            { comp: 'Control de Tracción', spec: inputs.presionLavadoBar ? `${inputs.presionLavadoBar} m/min` : 'Velocidad Variable', detail: inputs.presionLavadoBarDetalle !== undefined ? inputs.presionLavadoBarDetalle : 'Inversor: Incluido (SIEMENS)' },
                            { comp: 'Sistema de Control', spec: inputs.particulaFinal || 'Gabinete NEMA 4 (Estanco)', detail: inputs.particulaFinalDetalle !== undefined ? inputs.particulaFinalDetalle : 'Contactores y Relays: SCHNEIDER' },
                            { comp: 'Alimentación Eléctrica', spec: inputs.separadorMagnetico || 'Trifásica 60Hz', detail: inputs.separadorMagneticoDetalle !== undefined ? inputs.separadorMagneticoDetalle : 'Voltaje: 220/440V' },
                            { comp: 'Dimensiones Físicas', spec: `Largo: ${inputs.machineLength || 11.5} m | Ancho: ${inputs.machineWidth || 1.8} m | Alto: ${inputs.machineHeight || 1.75} m`, detail: `Footprint: ${((inputs.machineLength || 11.5) * (inputs.machineWidth || 1.8)).toFixed(2)} m²` },
                            { comp: 'Peso Total Equipo', spec: `${(!inputs.pesoOperativoKg || inputs.pesoOperativoKg === 1000) ? 1800 : inputs.pesoOperativoKg} kg`, detail: inputs.pesoOperativoKgDetalle !== undefined ? inputs.pesoOperativoKgDetalle : 'Estructura en Acero Inoxidable' },
                            { comp: 'Componentes Eléctricos', spec: inputs.componentesElectricos || 'Schneider / Siemens', detail: inputs.componentesElectricosDetalle !== undefined ? inputs.componentesElectricosDetalle : 'Contactores SCHNEIDER, Inversor SIEMENS' },
                            { comp: 'Nivel de Ruido', spec: `${inputs.ruidoDb || 60} dB`, detail: inputs.ruidoDbDetalle !== undefined ? inputs.ruidoDbDetalle : 'Nivel óptimo para piso de producción' },
                          ].map((t, idx) => (
                            <tr key={idx}>
                              <td style={{ ...REPORT_STYLES.td, padding: '5px 10px' }}>{t.comp}</td>
                              <td style={{ ...REPORT_STYLES.td, padding: '5px 10px', textAlign: 'center', color: '#008299' }}>{t.spec}</td>
                              <td style={{ ...REPORT_STYLES.td, padding: '5px 10px', textAlign: 'right' }}>{t.detail}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      </div>
                      {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                  </div>
                </div>
                )}

                {/* PÁGINA 4: FLUJO DE PROCESO */}
                {pdfConfig.tabla && (
                <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                  <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {renderPageHeader(`${++currentSectionIndex}. FLUJO DEL PROCESO`, 'Esquema secuencial de la línea de lavado, enjuague y secado de cajas plásticas')}

                    <div style={{ width: '100%', flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      {inputs.customProcessImage ? (
                        <div style={{ width: '100%', height: '480px', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          <img src={inputs.customProcessImage} style={{ width: '100%', height: '100%', objectFit: 'contain' }} alt="Diagrama de Flujo Personalizado" />
                        </div>
                      ) : (
                      <div style={{ width: '100%', height: '480px', position: 'relative', background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                        {twinSnapshotLateral ? (
                          <img src={twinSnapshotLateral} style={{ width: '90%', height: '90%', objectFit: 'contain', opacity: 0.85, transform: 'scale(1.05)' }} alt="Lateral" />
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 600 }}>Requiere Captura Lateral del Gemelo Digital</span>
                        )}

                        {[
                          { num: '01', step: 'ETAPA A', title: 'ALIMENTACIÓN', sub: 'FEED_01', hex: '#10b981', top: '8%', left: '8%', lineHeight: 220 },
                          { num: '02', step: 'ETAPA B', title: 'INGRESO AL TÚNEL', sub: 'INLET_02', hex: '#3b82f6', top: '8%', left: '22%', lineHeight: 140 },
                          { num: '03', step: 'ETAPA C', title: 'LAVADO POR ASPERSIÓN', sub: 'WASH_03', hex: '#f59e0b', top: '8%', left: '37%', lineHeight: 135 },
                          { num: '04', step: 'ETAPA D', title: 'RECIRCULACIÓN DE AGUA', sub: 'RECYCLE_04', hex: '#8b5cf6', top: '80%', left: '44%', lineHeight: 80, isBottom: true },
                          { num: '05', step: 'ETAPA E', title: 'SECADO 1', sub: 'DRY_05', hex: '#0f766e', top: '8%', left: '55%', lineHeight: 140 },
                          { num: '06', step: 'ETAPA F', title: 'SECADO 2', sub: 'DRY_06', hex: '#84cc16', top: '8%', left: '68%', lineHeight: 135 },
                          { num: '07', step: 'ETAPA G', title: 'DESCARGA FINAL', sub: 'OUTPUT_07', hex: '#ef4444', top: '8%', left: '79%', lineHeight: 210 },
                        ].map((step, i) => (
                          <div key={i} style={{ position: 'absolute', top: step.top, left: step.left, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                            {step.isBottom ? (
                              <>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: step.hex, marginBottom: '-4px', zIndex: 2 }} />
                                <div style={{ width: '2px', height: `${step.lineHeight}px`, background: step.hex }} />
                                <div style={{ background: '#fff', border: `2px solid ${step.hex}`, borderRadius: '8px', padding: '6px 10px', display: 'flex', gap: '8px', alignItems: 'center', zIndex: 2, marginTop: '-2px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>
                                  <div style={{ background: step.hex, color: '#fff', padding: '4px 8px', borderRadius: '6px', fontWeight: 900, fontSize: '14px' }}>{step.num}</div>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '8px', color: step.hex, fontWeight: 900, letterSpacing: '0.5px' }}>{step.step}</span>
                                    <span style={{ fontSize: '10px', color: '#1e293b', fontWeight: 900 }}>{step.title}</span>
                                    <span style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 700 }}>{step.sub}</span>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div style={{ background: '#fff', border: `2px solid ${step.hex}`, borderRadius: '8px', padding: '6px 10px', display: 'flex', gap: '8px', alignItems: 'center', zIndex: 2, marginBottom: '-2px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)', whiteSpace: 'nowrap' }}>
                                  <div style={{ background: step.hex, color: '#fff', padding: '4px 8px', borderRadius: '6px', fontWeight: 900, fontSize: '14px' }}>{step.num}</div>
                                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                                    <span style={{ fontSize: '8px', color: step.hex, fontWeight: 900, letterSpacing: '0.5px' }}>{step.step}</span>
                                    <span style={{ fontSize: '10px', color: '#1e293b', fontWeight: 900 }}>{step.title}</span>
                                    <span style={{ fontSize: '8px', color: '#94a3b8', fontWeight: 700 }}>{step.sub}</span>
                                  </div>
                                </div>
                                <div style={{ width: '2px', height: `${step.lineHeight}px`, background: step.hex }} />
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: step.hex, marginTop: '-4px', zIndex: 2 }} />
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                      )}
                      </div>
                      {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                  </div>
                </div>
                )}

                {/* PÁGINA 4.5: MODELOS DE CONTENEDORES */}
                {pdfConfig.tabla && (
                <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                  <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {renderPageHeader(`${++currentSectionIndex}. MODELOS DE CONTENEDORES EVALUADOS`, 'Especificaciones técnicas, dimensiones de las cajas plásticas consideradas y tiempos de ciclo.')}

                    <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 20 }}>
                        <thead>
                          <tr>
                            <th style={{ ...REPORT_STYLES.th, background: '#f8fafc', padding: '6px', fontSize: '10px' }}>MOD</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#f8fafc', padding: '6px', fontSize: '10px' }}>NOMBRE</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#f8fafc', padding: '6px', fontSize: '10px' }}>MEDIDAS (L X A X H) CM</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#f8fafc', padding: '6px', fontSize: '10px', textAlign: 'center' }}>SUCIEDAD</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#f8fafc', padding: '6px', fontSize: '10px', textAlign: 'right' }}>CAP C/H</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#f8fafc', padding: '6px', fontSize: '10px', textAlign: 'right' }}>CAP/DÍA</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#f8fafc', padding: '6px', fontSize: '10px', textAlign: 'right' }}>REQ/DÍA</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#f8fafc', padding: '6px', fontSize: '10px', textAlign: 'right' }}>HRS REQ.</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#f8fafc', padding: '6px', fontSize: '10px', textAlign: 'center' }}>ESTADO</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inputs.cajas.map((caja, idx) => {
                            const gapCm = inputs.boxGapCm || 15;
                            const speedCmMin = ((inputs.conveyorSpeedMH !== undefined ? inputs.conveyorSpeedMH : 160) / 60) * 100;
                            const spaceCm = caja.largoCm + gapCm;
                            const capCH = (speedCmMin / spaceCm) * 60 * ((inputs.oee || 85) / 100);
                            const capDia = capCH * ((inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1));
                            const reqDia = inputs.meta_diaria_cajas || 3000;
                            const hrsReq = reqDia / capCH;
                            const isViable = hrsReq <= (((inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1)) + 0.5); // Margen de 30 min de tolerancia
                            return (
                              <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                <td style={{ ...REPORT_STYLES.td, padding: '6px', textAlign: 'center' }}>
                                  <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: caja.color, margin: '0 auto' }} />
                                </td>
                                <td style={{ ...REPORT_STYLES.td, padding: '6px', fontWeight: 'bold' }}>{caja.nombre}</td>
                                <td style={{ ...REPORT_STYLES.td, padding: '6px' }}>{caja.largoCm} x {caja.anchoCm} x {caja.altoCm} cm</td>
                                <td style={{ ...REPORT_STYLES.td, padding: '6px', textAlign: 'center' }}>{caja.suciedad || 'Media'}</td>
                                <td style={{ ...REPORT_STYLES.td, padding: '6px', textAlign: 'right', fontWeight: 'bold', color: '#0e7490' }}>{new Intl.NumberFormat().format(capCH.toFixed(1))}</td>
                                <td style={{ ...REPORT_STYLES.td, padding: '6px', textAlign: 'right' }}>{new Intl.NumberFormat().format(capDia.toFixed(0))}</td>
                                <td style={{ ...REPORT_STYLES.td, padding: '6px', textAlign: 'right' }}>{new Intl.NumberFormat().format(reqDia)}</td>
                                <td style={{ ...REPORT_STYLES.td, padding: '6px', textAlign: 'right', fontWeight: 'bold' }}>{hrsReq.toFixed(1)}h</td>
                                <td style={{ ...REPORT_STYLES.td, padding: '6px', textAlign: 'center' }}>
                                  <span style={{ fontSize: '9px', fontWeight: 'bold', padding: '3px 6px', borderRadius: '4px', backgroundColor: isViable ? '#dcfce7' : '#fee2e2', color: isViable ? '#15803d' : '#b91c1c' }}>
                                    {isViable ? '✓ VIABLE' : '✕ EXCEDE'}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      <div style={{ display: 'flex', gap: '15px', marginTop: '10px' }}>
                        <div style={{ flex: 1, padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Criterios de Viabilidad</span>
                          <span style={{ fontSize: '8px', color: '#64748b', lineHeight: '1.4' }}>Las cajas que requieren más horas operativas de las disponibles por día ({(inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1)}h) se marcan como EXCEDE en rojo para indicar sobrecarga en la línea.</span>
                        </div>
                        <div style={{ flex: 1, padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Ajuste por Suciedad</span>
                          <span style={{ fontSize: '8px', color: '#64748b', lineHeight: '1.4' }}>El nivel de suciedad impacta directamente en la velocidad requerida de la banda transportadora y en la dosificación química necesaria para limpieza profunda.</span>
                        </div>
                        <div style={{ flex: 1, padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                          <span style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: '#334155', marginBottom: '4px' }}>Espaciamiento Mecánico</span>
                          <span style={{ fontSize: '8px', color: '#64748b', lineHeight: '1.4' }}>Se calcula una holgura mecánica de {inputs.boxGapCm || 15} cm entre cada caja para prevenir colisiones en banda y asegurar un secado térmico uniforme de cada unidad.</span>
                        </div>
                      </div>
                      {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                    </div>
                  </div>
                </div>
                )}

                {/* PÁGINA 4.6: ANÁLISIS DE LA LÍNEA */}
                {pdfConfig.analisis && (
                <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                  <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {renderPageHeader(`${++currentSectionIndex}. CAPACIDAD VS REQUERIMIENTO`, 'Contraste gráfico de la capacidad real frente a la demanda por modelo de caja.')}

                    <div style={{ width: '100%', flex: 1, display: 'flex', gap: '20px' }}>
                      {/* Left: Capacidad vs Requerimiento (Graphic) */}
                      <div style={{ flex: '1', display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: '20px' }}>Capacidad vs Requerimiento por Modelo</h4>
                        <div style={{ flex: 1, minHeight: '300px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={[{
                                name: activeBox.nombre,
                                CapDia: ((((inputs.conveyorSpeedMH !== undefined ? inputs.conveyorSpeedMH : 160) / 60) * 100) / (activeBox.largoCm + (inputs.boxGapCm || 15))) * 60 * ((inputs.oee || 85) / 100) * (inputs.hoursPerDay || 20),
                                ReqDia: inputs.meta_diaria_cajas || 3000
                              }]}
                              margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="name" tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} axisLine={false} tickLine={false} />
                              <Bar dataKey="CapDia" name="Cap/Día" fill="#14b8a6" radius={[4, 4, 0, 0]} barSize={60} />
                              <Bar dataKey="ReqDia" name="Req/Día" fill="#0f172a" radius={[4, 4, 0, 0]} barSize={60} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', marginTop: '16px' }}>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#14b8a6' }} /> <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569' }}>Cap/Día</span></div>
                           <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><div style={{ width: '12px', height: '12px', background: '#0f172a' }} /> <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#475569' }}>Req/Día</span></div>
                        </div>
                      </div>

                      {/* Right: Table */}
                      <div style={{ flex: '1.2', display: 'flex', flexDirection: 'column', background: '#f8fafc', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                        <h4 style={{ fontSize: '12px', fontWeight: 'bold', color: '#1e293b', marginBottom: '8px' }}>Lavado y Secado — Parámetros Y1-Y5</h4>
                        <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 'bold', marginBottom: '24px' }}>Ref: {activeBox.nombre} · Rate base: {new Intl.NumberFormat().format(inputs.meta_diaria_cajas || 3000)} cajas/día</span>
                        
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                              <th style={{ padding: '8px 4px', fontSize: '9px', fontWeight: 'bold', color: '#64748b', textAlign: 'left' }}>AÑO</th>
                              <th style={{ padding: '8px 4px', fontSize: '9px', fontWeight: 'bold', color: '#64748b', textAlign: 'center' }}>HRS B</th>
                              <th style={{ padding: '8px 4px', fontSize: '9px', fontWeight: 'bold', color: '#64748b', textAlign: 'center' }}>EF/T</th>
                              <th style={{ padding: '8px 4px', fontSize: '9px', fontWeight: 'bold', color: '#64748b', textAlign: 'center' }}>TURN</th>
                              <th style={{ padding: '8px 4px', fontSize: '9px', fontWeight: 'bold', color: '#64748b', textAlign: 'center' }}>T.DISP</th>
                              <th style={{ padding: '8px 4px', fontSize: '9px', fontWeight: 'bold', color: '#64748b', textAlign: 'right' }}>REQ/H</th>
                              <th style={{ padding: '8px 4px', fontSize: '9px', fontWeight: 'bold', color: '#64748b', textAlign: 'right' }}>CAP/H</th>
                              <th style={{ padding: '8px 4px', fontSize: '9px', fontWeight: 'bold', color: '#64748b', textAlign: 'right' }}>BAL.</th>
                              <th style={{ padding: '8px 4px', fontSize: '9px', fontWeight: 'bold', color: '#64748b', textAlign: 'right' }}>COB.</th>
                              <th style={{ padding: '8px 4px', fontSize: '9px', fontWeight: 'bold', color: '#64748b', textAlign: 'center' }}>LÍNEAS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Array.from({length: 5}).map((_, i) => {
                              const reqDia = inputs.meta_diaria_cajas || 3000;
                              const speedCmMin = ((inputs.conveyorSpeedMH !== undefined ? inputs.conveyorSpeedMH : 160) / 60) * 100;
                              const spaceCm = activeBox.largoCm + (inputs.boxGapCm || 15);
                              const capH = (speedCmMin / spaceCm) * 60 * ((inputs.oee || 85) / 100);
                              
                              const hrsB = 48 - (i * 2);
                              const hrsPerShiftDay = hrsB / 6;
                              const efT = hrsPerShiftDay * ((inputs.oee || 85) / 100);
                              const turn = inputs.shiftsPerDay || 2;
                              const tDisp = efT * turn;
                              const reqH = reqDia / tDisp;
                              const bal = capH - reqH;
                              const cob = (capH / reqH) * 100;

                              return (
                                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                  <td style={{ padding: '12px 4px', fontSize: '10px', fontWeight: 'bold', color: '#0284c7' }}>Y{i+1}</td>
                                  <td style={{ padding: '12px 4px', fontSize: '10px', textAlign: 'center' }}>{hrsB}</td>
                                  <td style={{ padding: '12px 4px', fontSize: '10px', textAlign: 'center' }}>{efT.toFixed(2)}</td>
                                  <td style={{ padding: '12px 4px', fontSize: '10px', textAlign: 'center' }}>{turn}</td>
                                  <td style={{ padding: '12px 4px', fontSize: '10px', textAlign: 'center' }}>{tDisp.toFixed(2)}</td>
                                  <td style={{ padding: '12px 4px', fontSize: '10px', textAlign: 'right' }}>{reqH.toFixed(1)}</td>
                                  <td style={{ padding: '12px 4px', fontSize: '10px', textAlign: 'right' }}>{capH.toFixed(1)}</td>
                                  <td style={{ padding: '12px 4px', fontSize: '10px', textAlign: 'right', fontWeight: 'bold', color: bal >= 0 ? '#16a34a' : '#ef4444' }}>{bal >= 0 ? '+' : ''}{bal.toFixed(1)}</td>
                                  <td style={{ padding: '12px 4px', fontSize: '10px', textAlign: 'right', fontWeight: 'bold', color: cob >= 100 ? '#16a34a' : '#f97316' }}>{cob.toFixed(1)}%</td>
                                  <td style={{ padding: '12px 4px', fontSize: '10px', textAlign: 'center', color: '#64748b' }}>1 maq.</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* --- ANÁLISIS HÍDRICO (REPORTE) --- */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '20px', marginTop: 'auto' }}>
                      <div style={{ background: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: '16px', padding: '16px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 900, color: '#0369a1', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <Droplet size={14} /> Consumo Hídrico Mensual
                        </span>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#0c4a6e', marginTop: '4px' }}>{new Intl.NumberFormat().format(results.totalWaterMonthlyLiters || 0)} L</div>
                      </div>
                      <div style={{ background: '#f0f9ff', border: '1px solid #e0f2fe', borderRadius: '16px', padding: '16px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 900, color: '#0369a1', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <AlertCircle size={14} /> Recambios + Evaporación
                        </span>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: '#075985', marginTop: '4px' }}>Tanque: {inputs.waterTankLiters}L / {inputs.waterDragOutPercent}% Arrastre</div>
                      </div>
                      <div style={{ background: '#ecfdf5', border: '1px solid #d1fae5', borderRadius: '16px', padding: '16px' }}>
                        <span style={{ fontSize: '10px', fontWeight: 900, color: '#047857', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                          <Activity size={14} /> Impacto OPEX Hídrico
                        </span>
                        <div style={{ fontSize: '20px', fontWeight: 900, color: '#064e3b', marginTop: '4px' }}>${new Intl.NumberFormat().format(results.waterCostMonthlyMxn || 0)} MXN</div>
                      </div>
                      {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                    </div>
                  </div>
                </div>
                )}

                {/* PÁGINA 5: ENERGÍA Y CAPACIDAD */}
                {pdfConfig.energia && (
                <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                  <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {renderPageHeader(`${++currentSectionIndex}. ${inputs.energySectionTitle || 'Energía & Capacidad'}`, 'Desglose energético operativo y comparativa de producción real vs consumo en kWh')}

                    <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
                      
                      {/* KPIs de Energía */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                        {[
                          { title: 'Potencia Instalada Total', val: `${results.installedPowerKw.toFixed(2)} kW`, sub: `${results.totalHp} hp equivalentes` },
                          { title: 'Consumo Promedio Hora', val: `${results.averageHourlyConsumptionKw.toFixed(2)} kWh`, sub: `Factor de Carga: ${inputs.loadFactor}%` },
                          { title: 'Costo Eléctrico Hora', val: `$${results.hourlyElectricityCostMxn.toFixed(2)} MXN`, sub: `Tarifa: $${inputs.electricityRate}/kWh` },
                          { title: 'Consumo Específico', val: `${results.kwhPer1000Boxes.toFixed(1)} kWh/kCajas`, sub: 'Relación energía-producción' },
                          { title: 'Costo por 1000 Cajas', val: `$${results.electricityCostPer1000BoxesMxn.toFixed(2)} MXN`, sub: 'Costo operativo directo' },
                          { title: 'Costo Eléctrico Mensual', val: `$${new Intl.NumberFormat().format(results.monthlyElectricityCostMxn.toFixed(0))} MXN`, sub: 'Proyección mensual base' },
                        ].map((k, i) => (
                          <div key={i} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 16 }}>
                            <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>{k.title}</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: '#0f2038' }}>{k.val}</div>
                            <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 4, fontFamily: 'monospace' }}>{k.sub}</div>
                          </div>
                        ))}
                      </div>

                      {/* Charts Area */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: '#0f766e', textTransform: 'uppercase', marginBottom: 4 }}>Capacidad Diaria vs Requerimiento Diario</div>
                          <div style={{ flex: 1, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart
                                data={[
                                  { name: 'Requerimiento', valor: inputs.meta_diaria_cajas, fill: '#64748b' },
                                  { name: 'Capacidad', valor: results.dailyProductionBoxes, fill: '#06b6d4' }
                                ]}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                              >
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} width={40} />
                                <Tooltip formatter={(value) => [`${new Intl.NumberFormat().format(value)} kg`, 'Valor']} />
                                <Bar dataKey="valor" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                  {[{fill: '#64748b'}, {fill: '#06b6d4'}].map((e,i)=><Cell key={i} fill={e.fill}/>)}
                                </Bar>
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                          <div style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#64748b', marginTop: 8 }}>
                            Margen operativo disponible: <span style={{ color: '#008299' }}>{new Intl.NumberFormat().format(Math.max(0, results.dailyProductionBoxes - inputs.meta_diaria_cajas).toFixed(0))} cajas/día</span>
                          </div>
                        </div>

                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase', marginBottom: 4 }}>Producción vs Consumo Energético</div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                              <thead>
                                <tr>
                                  <th style={{ ...REPORT_STYLES.th, background: '#f8fafc', textAlign: 'left' }}>Período</th>
                                  <th style={{ ...REPORT_STYLES.th, background: '#ecfeff', textAlign: 'right', color: '#0e7490' }}>Producción (Cajas)</th>
                                  <th style={{ ...REPORT_STYLES.th, background: '#eef2ff', textAlign: 'right', color: '#4338ca' }}>Consumo (kWh)</th>
                                  <th style={{ ...REPORT_STYLES.th, background: '#ecfdf5', textAlign: 'right', color: '#047857' }}>Ratio (kWh/kCajas)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { period: 'Por Hora', prod: results.realProductionPerHourBoxes || 0, cons: results.averageHourlyConsumptionKw || 0 },
                                  { period: 'Por Día', prod: results.dailyProductionBoxes || 0, cons: (results.averageHourlyConsumptionKw || 0) * ((inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1)) },
                                  { period: 'Por Semana', prod: (results.dailyProductionBoxes || 0) * 7, cons: (results.averageHourlyConsumptionKw || 0) * ((inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1)) * 7 },
                                  { period: 'Por Mes', prod: (results.dailyProductionBoxes || 0) * (inputs.daysPerMonth || 24), cons: (results.averageHourlyConsumptionKw || 0) * ((inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 1)) * (inputs.daysPerMonth || 24) }
                                ].map((row, idx) => (
                                  <tr key={idx}>
                                    <td style={{ ...REPORT_STYLES.td, fontWeight: 'bold' }}>{row.period}</td>
                                    <td style={{ ...REPORT_STYLES.td, textAlign: 'right', fontWeight: 'bold', color: '#0891b2' }}>{new Intl.NumberFormat().format(Math.round(row.prod))}</td>
                                    <td style={{ ...REPORT_STYLES.td, textAlign: 'right', fontWeight: 'bold', color: '#4f46e5' }}>{new Intl.NumberFormat().format((row.cons).toFixed(1))}</td>
                                    <td style={{ ...REPORT_STYLES.td, textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{new Intl.NumberFormat().format((row.prod > 0 ? (row.cons / (row.prod / 1000)) : 0).toFixed(2))}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                      {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                    </div>
                  </div>
                </div>
                )}


                {/* PÁGINA 5: ESCENARIOS OPERATIVOS */}
                {pdfConfig.escenarios && (
                <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                  <div style={{ ...S.inner, flex: 1, paddingTop: 20, display: 'flex', flexDirection: 'column', gap: 15 }}>
                    {renderPageHeader(`${++currentSectionIndex}. Simulación de Escenarios`, 'Comparativa de rendimiento bajo diferentes métricas de eficiencia (OEE)')}

                    <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, borderRadius: '8px', overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                        <thead>
                          <tr>
                            <th style={{ backgroundColor: '#159b9a', padding: '8px 12px', color: 'white', textAlign: 'left', width: '31%', borderRight: '1px solid rgba(255,255,255,0.2)', fontSize: '11.5px' }}>MÉTRICA DE EVALUACIÓN</th>
                            <th style={{ backgroundColor: '#059ca0', padding: '8px', color: 'white', textAlign: 'center', width: '23%', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Shield size={16} /> <div style={{ textAlign: 'left', lineHeight: '1.2' }}><span style={{fontWeight: 'bold', fontSize: '11.5px'}}>CONSERVADOR</span><br/><span style={{fontSize:'9.5px', fontWeight:'normal'}}>(70% OEE)</span></div></div>
                            </th>
                            <th style={{ backgroundColor: '#1b71b8', padding: '8px', color: 'white', textAlign: 'center', width: '23%', borderRight: '1px solid rgba(255,255,255,0.2)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><TrendingUp size={16} /> <div style={{ textAlign: 'left', lineHeight: '1.2' }}><span style={{fontWeight: 'bold', fontSize: '11.5px'}}>NORMAL</span><br/><span style={{fontSize:'9.5px', fontWeight:'normal'}}>(85% OEE)</span></div></div>
                            </th>
                            <th style={{ backgroundColor: '#3bb565', padding: '8px', color: 'white', textAlign: 'center', width: '23%' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}><Trophy size={16} /> <div style={{ textAlign: 'left', lineHeight: '1.2' }}><span style={{fontWeight: 'bold', fontSize: '11.5px'}}>ALTO RENDIMIENTO</span><br/><span style={{fontSize:'9.5px', fontWeight:'normal'}}>(95% OEE)</span></div></div>
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Package size={18} color="#159b9a" />
                                <div>
                                  <div style={{ fontWeight: 'bold', fontSize: '11.5px', color: '#334155' }}>Producción Diaria Proyectada</div>
                                  <div style={{ fontSize: '9.5px', color: '#64748b' }}>(cajas/día)</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#fff' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#059ca0' }}>{new Intl.NumberFormat().format((scenarioResults.conservador.dailyProdTon * 1000).toFixed(0))}</div>
                              <div style={{ fontSize: '9.5px', color: '#64748b' }}>cajas/día</div>
                            </td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#fff' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1b71b8' }}>{new Intl.NumberFormat().format((scenarioResults.normal.dailyProdTon * 1000).toFixed(0))}</div>
                              <div style={{ fontSize: '9.5px', color: '#64748b' }}>cajas/día</div>
                            </td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#fff' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#3bb565' }}>{new Intl.NumberFormat().format((scenarioResults.alto.dailyProdTon * 1000).toFixed(0))}</div>
                              <div style={{ fontSize: '9.5px', color: '#64748b' }}>cajas/día</div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Zap size={18} color="#159b9a" />
                                <div>
                                  <div style={{ fontWeight: 'bold', fontSize: '11.5px', color: '#334155' }}>Costo Operativo (Eléctrico)</div>
                                  <div style={{ fontSize: '9.5px', color: '#64748b' }}>por caja</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#fff' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#059ca0' }}>${new Intl.NumberFormat().format(scenarioResults.conservador.costPerTon.toFixed(2))}</div>
                              <div style={{ fontSize: '9.5px', color: '#64748b' }}>MXN</div>
                            </td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#fff' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1b71b8' }}>${new Intl.NumberFormat().format(scenarioResults.normal.costPerTon.toFixed(2))}</div>
                              <div style={{ fontSize: '9.5px', color: '#64748b' }}>MXN</div>
                            </td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#fff' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#3bb565' }}>${new Intl.NumberFormat().format(scenarioResults.alto.costPerTon.toFixed(2))}</div>
                              <div style={{ fontSize: '9.5px', color: '#64748b' }}>MXN</div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '8px 12px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Target size={18} color="#159b9a" />
                                <div>
                                  <div style={{ fontWeight: 'bold', fontSize: '11.5px', color: '#334155' }}>Cobertura de la Meta</div>
                                  <div style={{ fontSize: '9.5px', color: '#64748b' }}>Diaria Objetivo</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#fff' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#059ca0' }}>{scenarioResults.conservador.coverage.toFixed(1)}%</div>
                            </td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#fff' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1b71b8' }}>{scenarioResults.normal.coverage.toFixed(1)}%</div>
                            </td>
                            <td style={{ padding: '8px', borderBottom: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#fff' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#3bb565' }}>{scenarioResults.alto.coverage.toFixed(1)}%</div>
                            </td>
                          </tr>
                          <tr>
                            <td style={{ padding: '8px 12px', borderRight: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Gauge size={18} color="#159b9a" />
                                <div>
                                  <div style={{ fontWeight: 'bold', fontSize: '11.5px', color: '#334155' }}>Utilización de la Capacidad</div>
                                  <div style={{ fontSize: '9.5px', color: '#64748b' }}>de Planta</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#fff' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#059ca0' }}>{(scenarioResults.conservador.utilization * 100).toFixed(1)}%</div>
                            </td>
                            <td style={{ padding: '8px', borderRight: '1px solid #e2e8f0', textAlign: 'center', backgroundColor: '#fff' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#1b71b8' }}>{(scenarioResults.normal.utilization * 100).toFixed(1)}%</div>
                            </td>
                            <td style={{ padding: '8px', textAlign: 'center', backgroundColor: '#fff' }}>
                              <div style={{ fontWeight: 'bold', fontSize: '13px', color: '#3bb565' }}>{(scenarioResults.alto.utilization * 100).toFixed(1)}%</div>
                            </td>
                          </tr>
                        </tbody>
                      </table>

                      <div style={{ padding: '10px', border: '1px solid #e2e8f0', borderRadius: '8px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                          <h4 style={{ fontSize: '11.5px', fontWeight: '900', color: '#1e293b', textTransform: 'uppercase' }}>PRODUCCIÓN DIARIA Y COSTO OPERATIVO POR ESCENARIO</h4>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '5px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '16px', height: '8px', backgroundColor: '#059ca0', borderRadius: '2px' }}/>
                            <span style={{fontSize: '9.5px', color: '#334155', fontWeight: 'bold'}}>Producción Diaria (cajas/día)</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', border: '2px solid #1b71b8', position: 'relative' }}>
                              <div style={{ position: 'absolute', top: '50%', left: '-8px', right: '-8px', height: '2px', backgroundColor: '#1b71b8', transform: 'translateY(-50%)', zIndex: -1 }} />
                            </div>
                            <span style={{fontSize: '9.5px', color: '#334155', fontWeight: 'bold'}}>Costo Operativo Eléctrico (MXN por caja)</span>
                          </div>
                        </div>
                        <div style={{ width: '100%', flex: 1, minHeight: '160px' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <ComposedChart 
                              data={[
                                { name: 'Conservador\n(70% OEE)', prod: scenarioResults.conservador.dailyProdTon * 1000, costo: scenarioResults.conservador.costPerTon },
                                { name: 'Normal\n(85% OEE)', prod: scenarioResults.normal.dailyProdTon * 1000, costo: scenarioResults.normal.costPerTon },
                                { name: 'Alto Rendimiento\n(95% OEE)', prod: scenarioResults.alto.dailyProdTon * 1000, costo: scenarioResults.alto.costPerTon }
                              ]} 
                              margin={{ top: 20, right: 10, bottom: 0, left: 10 }}
                            >
                              <CartesianGrid stroke="#f1f5f9" strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" tick={{ fontSize: 10.5, fill: '#1e293b', fontWeight: 'bold' }} axisLine={false} tickLine={false} dy={10} />
                              <YAxis yAxisId="left" tick={{ fontSize: 10.5, fill: '#059ca0', fontWeight: 'bold' }} axisLine={false} tickLine={false} dx={-5} />
                              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 10.5, fill: '#1b71b8', fontWeight: 'bold' }} axisLine={false} tickLine={false} dx={5} />
                              <Tooltip cursor={{fill: '#f8fafc'}} />
                              <Bar yAxisId="left" dataKey="prod" fill="#059ca0" barSize={60} radius={[4,4,0,0]} label={{ position: 'top', fill: '#059ca0', fontSize: 11.5, fontWeight: 'bold', formatter: (v) => new Intl.NumberFormat().format(v.toFixed(0)) }} />
                              <Line yAxisId="right" type="monotone" dataKey="costo" stroke="#1b71b8" strokeWidth={2} dot={{ r: 4, stroke: '#1b71b8', strokeWidth: 2, fill: '#fff' }} label={{ position: 'bottom', fill: '#1b71b8', fontSize: 11.5, fontWeight: 'bold', formatter: (v) => '$' + v.toFixed(2) }} />
                            </ComposedChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: 12, fontSize: 11.5, color: '#64748b', lineHeight: 1.4 }}>
                        <strong style={{color:'#334155'}}>Nota del Analista:</strong> Las proyecciones mostradas asumen un flujo constante de material de alimentación y no consideran variaciones drásticas en la humedad o densidad del sustrato.
                      </div>
                    </div>

                    <div style={{ flex: 1 }} />
                    {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                  </div>
                </div>
                )}

                {/* PÁGINA: ANÁLISIS HÍDRICO Y SUSTENTABILIDAD */}
                {pdfConfig.hidrico && (() => {
                  const speedCmMin = ((inputs.conveyorSpeedMH !== undefined ? inputs.conveyorSpeedMH : 160) / 60) * 100;
                  const spaceCm = activeBox.largoCm + (inputs.boxGapCm || 15);
                  const baseCapH = ((speedCmMin / spaceCm) * 60) * ((inputs.oee || 85) / 100);
                  const hrsDay = inputs.hoursPerDay || 20;
                  const realWaterPerHr = (results.totalWaterMonthlyLiters || 0) / 24 / hrsDay;
                  
                  return (
                    <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                      <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '16px' }}>
                          <div style={{ display: 'flex', gap: '16px' }}>
                            <div style={{ width: '8px', height: '60px', background: '#06b6d4', borderRadius: '4px' }} />
                            <div>
                              <div style={{ fontSize: '26px', fontWeight: 900, color: '#1e293b', lineHeight: 1.1, letterSpacing: '-0.5px' }}>CONSUMO HÍDRICO</div>
                              <div style={{ fontSize: '26px', fontWeight: 900, color: '#06b6d4', lineHeight: 1.1, letterSpacing: '-0.5px' }}>Y SUSTENTABILIDAD</div>
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', fontWeight: 800, color: '#0ea5e9', letterSpacing: '1px', textTransform: 'uppercase', marginBottom: '4px' }}>{inputs.clientName || 'FORVIA'} - {activeBox.nombre}</div>
                            <div style={{ fontSize: '12px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', marginBottom: '6px' }}>ING. {inputs.userName || 'ADONAI RODRÍGUEZ'} | {inputs.userPosition || 'EMILIANO MACHUCA'}</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>Análisis del balance hídrico, tasa de recirculación de agua y huella ecológica.</div>
                          </div>
                        </div>

                        {/* TOP ROW: 4 CARDS */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0891b2', marginBottom: '4px' }}>{new Intl.NumberFormat().format(Math.round(baseCapH * 3.5))} L/h</div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>Caudal de Lavado Interno</div>
                            <div style={{ fontSize: '9px', color: '#64748b' }}>Volumen interno recirculado</div>
                          </div>
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0891b2', marginBottom: '4px' }}>{new Intl.NumberFormat().format(Math.round(realWaterPerHr))} L/h</div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>Reposición Real de Agua</div>
                            <div style={{ fontSize: '9px', color: '#64748b' }}>Consumo real de red de agua limpia</div>
                          </div>
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0891b2', marginBottom: '4px', display: 'flex', alignItems: 'flex-start' }}>{((Math.round(realWaterPerHr) * hrsDay) / 1000).toFixed(2)} m<span style={{ fontSize: '12px' }}>³</span></div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>Consumo Diario Y1 ({hrsDay.toFixed(1)}h)</div>
                            <div style={{ fontSize: '9px', color: '#64748b' }}>Equivalente a {new Intl.NumberFormat().format(Math.round(realWaterPerHr) * hrsDay)} Litros</div>
                          </div>
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '16px', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0891b2', marginBottom: '4px', display: 'flex', alignItems: 'flex-start' }}>{(((Math.round(realWaterPerHr) * hrsDay) / 1000) * (inputs.daysPerWeek || 6)).toFixed(1)} m<span style={{ fontSize: '12px' }}>³</span></div>
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a', marginBottom: '6px' }}>Consumo Semanal</div>
                            <div style={{ fontSize: '9px', color: '#64748b' }}>Basado en {inputs.daysPerWeek || 6} días laborables</div>
                          </div>
                        </div>

                        {/* BOTTOM ROW: 2 CARDS */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', flex: 1 }}>
                          {/* Configuración y Eficiencia Hídrica */}
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f2038', marginBottom: '24px' }}>Configuración y Eficiencia Hídrica</div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Tasa de Recirculación de Agua</div>
                                  <div style={{ fontSize: '9px', color: '#64748b' }}>Ahorro neto de agua limpia por recirculación y filtrado</div>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 900, color: '#0891b2' }}>85.0%</div>
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Capacidad Nominal del Tanque</div>
                                  <div style={{ fontSize: '9px', color: '#64748b' }}>Capacidad del tanque de lavado principal</div>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 900, color: '#0891b2' }}>{new Intl.NumberFormat().format(inputs.waterTankLiters || 1200)} Litros</div>
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9', paddingBottom: '12px' }}>
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Frecuencia de Cambio de Agua</div>
                                  <div style={{ fontSize: '9px', color: '#64748b' }}>Frecuencia de purga e higienización total</div>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 900, color: '#0891b2' }}>Cada {Math.round(6 / (inputs.waterChangesPerWeek || 1))} días</div>
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                  <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Modelo de Referencia Activo</div>
                                  <div style={{ fontSize: '9px', color: '#64748b' }}>Modelo de caja base para el análisis unitario</div>
                                </div>
                                <div style={{ fontSize: '16px', fontWeight: 900, color: '#0891b2', textTransform: 'uppercase' }}>{activeBox.nombre}</div>
                              </div>
                            </div>
                          </div>

                          {/* Análisis de Huella Hídrica */}
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '24px', background: '#fff', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)', display: 'flex', flexDirection: 'column' }}>
                            <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f2038', marginBottom: '24px' }}>Análisis de Huella Hídrica por Contenedor</div>
                            
                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                              <div>
                                <div style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>Consumo Específico por Caja</div>
                                <div style={{ fontSize: '9px', color: '#64748b' }}>Basado en {new Intl.NumberFormat().format(Math.round(baseCapH))} cajas/h de capacidad real</div>
                              </div>
                              <div style={{ fontSize: '24px', fontWeight: 900, color: '#0891b2' }}>{(realWaterPerHr / Math.round(baseCapH)).toFixed(2)} L / caja</div>
                            </div>

                            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '20px' }}>
                              <div style={{ fontSize: '11px', fontWeight: 800, color: '#1e293b', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <Target size={12} color="#0891b2" /> Evaluación de Impacto Ambiental (ESG)
                              </div>
                              <div style={{ fontSize: '10px', color: '#475569', lineHeight: 1.6, textAlign: 'justify' }}>
                                El sistema de recirculación del simulador Wash & Dry reduce en un <strong style={{ color: '#0f172a' }}>85%</strong> la demanda de agua de reposición respecto a sistemas tradicionales de lavado una vez-pasados (once-through). Esto representa una disminución crítica de la huella hídrica y minimiza la generación de efluentes, facilitando el cumplimiento de normativas de sustentabilidad y optimizando el costo operativo por caja.
                              </div>
                            </div>
                          </div>
                          {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                  </div>
                  </div>
                  </div>
                  );
                })()}

                {/* PÁGINA 7: DICTAMEN FINANCIERO (VERSIÓN SIN RENTABILIDAD) */}
                {pdfConfig.financiero && (
                  <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                    <div style={{ ...S.inner, flex: 1, paddingTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {renderPageHeader(`${++currentSectionIndex}. Análisis Financiero de Inversión`, 'Resumen Ejecutivo de CAPEX y Gasto Operativo Mensual')}

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {/* CAPEX Card */}
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                          <div style={{ background: '#1d70b8', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Building2 size={20} color="#fff" />
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estructura CAPEX (Inversión Inicial)</div>
                          </div>
                          <div style={{ padding: '10px 14px' }}>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>Inversión Total Estimada</div>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f2038', marginBottom: '8px' }}>${new Intl.NumberFormat().format(results.capexInstaladoMxn.toFixed(0))} MXN</div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: '#334155', fontWeight: 600 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ background: '#e0f2fe', padding: '6px', borderRadius: '6px', display: 'flex' }}><Factory size={14} color="#0284c7" /></div> Equipo Base</div>
                                <span style={{ fontWeight: 800, color: '#0284c7' }}>${new Intl.NumberFormat().format((results.precioEquipoUsd * (inputs.tipoCambio || 1)).toFixed(0))}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ background: '#e0f2fe', padding: '6px', borderRadius: '6px', display: 'flex' }}><Wrench size={14} color="#0284c7" /></div> Montaje y Maniobras</div>
                                <span style={{ fontWeight: 800, color: '#0284c7' }}>${new Intl.NumberFormat().format(((results.maniobrasUsd + results.montajeMecanicoUsd) * (inputs.tipoCambio || 1)).toFixed(0))}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ background: '#e0f2fe', padding: '6px', borderRadius: '6px', display: 'flex' }}><Zap size={14} color="#0284c7" /></div> Instalación Eléctrica</div>
                                <span style={{ fontWeight: 800, color: '#0284c7' }}>${new Intl.NumberFormat().format(((results.electricoPrincipalUsd + results.canalizacionProteccionesUsd) * (inputs.tipoCambio || 1)).toFixed(0))}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ background: '#e0f2fe', padding: '6px', borderRadius: '6px', display: 'flex' }}><Droplet size={14} color="#0284c7" /></div> Sistemas Hídricos / Drenaje</div>
                                <span style={{ fontWeight: 800, color: '#0284c7' }}>${new Intl.NumberFormat().format(((results.extraccionPolvoUsd + results.seguridadIndustrialUsd) * (inputs.tipoCambio || 1)).toFixed(0))}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><div style={{ background: "#e0f2fe", padding: "6px", borderRadius: "6px", display: "flex" }}><Building2 size={14} color="#0284c7" /></div> Obra Civil e Ingeniería</div>
                                <span style={{ fontWeight: 800, color: "#0284c7" }}>${new Intl.NumberFormat().format(((results.obraCivilUsd + results.ingenieriaSupervisionUsd) * (inputs.tipoCambio || 1)).toFixed(0))}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><div style={{ background: "#e0f2fe", padding: "6px", borderRadius: "6px", display: "flex" }}><ShieldAlert size={14} color="#0284c7" /></div> Contingencia y Otros</div>
                                <span style={{ fontWeight: 800, color: "#0284c7" }}>${new Intl.NumberFormat().format(((results.contingenciaUsd + results.otrosCapexUsd) * (inputs.tipoCambio || 1)).toFixed(0))}</span>
                              </div>
                            </div>
                            <div style={{ marginTop: '12px', padding: '10px', background: '#f0f9ff', borderLeft: '3px solid #38bdf8', fontSize: '10px', fontWeight: 500, color: '#0369a1', lineHeight: '1.4' }}>
                              * Las partidas de Obra Civil, Ingeniería y Contingencia son estimaciones sujetas a evaluación en sitio y diseño de layout final.
                            </div>
                          </div>
                          <div style={{ background: '#f8fafc', padding: '10px 14px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#1d70b8' }}>INVERSIÓN INICIAL TOTAL</span>
                            <span style={{ background: '#1d70b8', color: '#fff', fontSize: '12px', fontWeight: 900, padding: '4px 12px', borderRadius: '16px' }}>${new Intl.NumberFormat().format(results.capexInstaladoMxn.toFixed(0))} MXN</span>
                          </div>
                        </div>

                        {/* OPEX Card */}
                        <div style={{ border: '1px solid #fecdd3', borderRadius: '8px', overflow: 'hidden', background: '#fff' }}>
                          <div style={{ background: '#e11d48', padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Settings size={20} color="#fff" />
                            <div style={{ fontSize: '11px', fontWeight: 800, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Estructura OPEX (Gasto Mensual)</div>
                          </div>
                          <div style={{ padding: '10px 14px' }}>
                            <div style={{ fontSize: '10px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>Gasto Operativo Mensual Estimado</div>
                            <div style={{ fontSize: '22px', fontWeight: 900, color: '#0f2038', marginBottom: '8px' }}>${new Intl.NumberFormat().format(results.opexMensualMxn.toFixed(0))} MXN</div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '11px', color: '#334155', fontWeight: 600 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ background: '#ffe4e6', padding: '6px', borderRadius: '6px', display: 'flex' }}><Zap size={14} color="#e11d48" /></div> Energía Eléctrica</div>
                                <span style={{ fontWeight: 800, color: '#e11d48' }}>${new Intl.NumberFormat().format(results.monthlyElectricityCostMxn.toFixed(0))}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ background: '#ffe4e6', padding: '6px', borderRadius: '6px', display: 'flex' }}><Droplet size={14} color="#e11d48" /></div> Impacto Hídrico (Agua)</div>
                                <span style={{ fontWeight: 800, color: '#e11d48' }}>${new Intl.NumberFormat().format(results.waterCostMonthlyMxn || 0)}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ background: '#ffe4e6', padding: '6px', borderRadius: '6px', display: 'flex' }}><Users size={14} color="#e11d48" /></div> Mano de Obra</div>
                                <span style={{ fontWeight: 800, color: '#e11d48' }}>${new Intl.NumberFormat().format(results.manoObraMensualMxn.toFixed(0))}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ background: '#ffe4e6', padding: '6px', borderRadius: '6px', display: 'flex' }}><Shield size={14} color="#e11d48" /></div> Mantenimiento Preventivo</div>
                                <span style={{ fontWeight: 800, color: '#e11d48' }}>${new Intl.NumberFormat().format(results.mantenimientoMensualMxn.toFixed(0))}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><div style={{ background: '#ffe4e6', padding: '6px', borderRadius: '6px', display: 'flex' }}><Wrench size={14} color="#e11d48" /></div> Refacciones / Consumibles</div>
                                <span style={{ fontWeight: 800, color: '#e11d48' }}>${new Intl.NumberFormat().format((inputs.filtrosMensualMxn + inputs.refaccionesMensualMxn + inputs.lubricacionMensualMxn).toFixed(0))}</span>
                              </div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}><div style={{ background: "#ffe4e6", padding: "6px", borderRadius: "6px", display: "flex" }}><FlaskConical size={14} color="#e11d48" /></div> Químicos y Supervisión</div>
                                <span style={{ fontWeight: 800, color: "#e11d48" }}>${new Intl.NumberFormat().format(7000.20)}</span>
                              </div>
                            </div>
                          </div>
                          <div style={{ background: '#fff1f2', padding: '10px 14px', borderTop: '1px solid #fecdd3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#e11d48' }}>GASTO OPERATIVO MENSUAL TOTAL</span>
                            <span style={{ background: '#e11d48', color: '#fff', fontSize: '12px', fontWeight: 900, padding: '4px 12px', borderRadius: '16px' }}>${new Intl.NumberFormat().format(results.opexMensualMxn.toFixed(0))} MXN</span>
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: 10, marginTop: '0px' }}>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ background: '#ea580c', borderRadius: '50%', padding: '4px', display: 'flex' }}><Shield size={14} color="#fff" /></div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 900, color: '#ea580c', textTransform: 'uppercase' }}>Matriz de Riesgo y Operación</div>
                              <div style={{ fontSize: '9px', color: '#64748b' }}>Evaluación cualitativa de los principales riesgos operativos</div>
                            </div>
                          </div>
                          
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '10px', color: '#334155', fontWeight: 600 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #f1f5f9', padding: '6px', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><FlaskConical size={12} color="#ea580c" /> Manejo de Químicos</div>
                                <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>{inputs.riesgoPolvo || 'BAJO'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #f1f5f9', padding: '6px', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Zap size={12} color="#ea580c" /> Riesgo Eléctrico</div>
                                <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>{inputs.riesgoMetal || 'BAJO'}</span>
                              </div>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #f1f5f9', padding: '6px', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Droplet size={12} color="#ea580c" /> Drenaje y Fugas</div>
                                <span style={{ background: '#dcfce7', color: '#166534', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>{inputs.riesgoIncendio || 'BAJO'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #f1f5f9', padding: '6px', borderRadius: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Volume2 size={12} color="#ea580c" /> Contam. Acústica</div>
                                <span style={{ background: '#fef08a', color: '#854d0e', padding: '2px 6px', borderRadius: '4px', fontSize: '9px', fontWeight: 800 }}>{inputs.riesgoRuido || 'MEDIO'}</span>
                              </div>
                            </div>
                          </div>

                          <div style={{ marginTop: 'auto', background: '#fff', border: '1px solid #f1f5f9', padding: '4px', borderRadius: '6px', display: 'flex', gap: '8px' }}>
                            <div style={{ background: '#ea580c', width: '16px', height: '16px', borderRadius: '50%', color: '#fff', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>i</div>
                            <div style={{ fontSize: '9px', color: '#64748b', lineHeight: 1.2 }}><strong style={{ color: '#ea580c' }}>Nota:</strong> Los niveles de riesgo se evaluaron considerando controles y protocolos.</div>
                          </div>
                        </div>

                        <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <div style={{ background: '#7c3aed', borderRadius: '50%', padding: '4px', display: 'flex' }}><PieChartLucide size={14} color="#fff" /></div>
                            <div>
                              <div style={{ fontSize: '11px', fontWeight: 900, color: '#6d28d9', textTransform: 'uppercase' }}>Distribución OPEX</div>
                              <div style={{ fontSize: '9px', color: '#64748b' }}>Proporción de gastos operativos mensuales</div>
                            </div>
                          </div>
                          
                          <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                              <div style={{ fontSize: '9px', color: '#475569', lineHeight: 1.2 }}>El gráfico circular muestra la distribución porcentual de los componentes del gasto operativo (OPEX).</div>
                              <div style={{ background: '#f5f3ff', border: '1px solid #ede9fe', padding: '6px', borderRadius: '6px', marginTop: '6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}><Star size={10} color="#7c3aed" fill="#7c3aed" /> <span style={{ fontSize: '10px', fontWeight: 800, color: '#6d28d9' }}>Recomendación:</span></div>
                                <div style={{ fontSize: '9px', color: '#5b21b6', lineHeight: 1.2 }}>Optimizar consumo de energía y agua maximiza el rendimiento.</div>
                              </div>
                            </div>
                            <div style={{ width: 95, height: 95, position: 'relative', marginTop: '-10px' }}>
                              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
                                <span style={{ fontSize: '8px', fontWeight: 800, color: '#334155' }}>TOTAL</span>
                                <span style={{ fontSize: '10px', fontWeight: 900, color: '#0f172a' }}>${new Intl.NumberFormat().format(results.opexMensualMxn.toFixed(0))}</span>
                                <span style={{ fontSize: '8px', fontWeight: 800, color: '#334155' }}>MXN</span>
                              </div>
                              <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                  <Pie
                                    data={[
                                      { name: 'Energía Eléctrica', value: results.monthlyElectricityCostMxn, fill: '#1d4ed8' },
                                      { name: 'Mano de Obra', value: results.manoObraMensualMxn, fill: '#8b5cf6' },
                                      { name: 'Impacto Hídrico (Agua)', value: results.waterCostMonthlyMxn || 0, fill: '#0ea5e9' },
                                      { name: 'Mantenimiento Preventivo', value: results.mantenimientoMensualMxn, fill: '#ea580c' },
                                      { name: 'Refacciones / Consumibles', value: inputs.filtrosMensualMxn + inputs.refaccionesMensualMxn + inputs.lubricacionMensualMxn, fill: '#65a30d' }
                                    ].filter(d => d.value > 0)}
                                    cx="50%" cy="50%" innerRadius={25} outerRadius={42} paddingAngle={2} dataKey="value"
                                    labelLine={false}
                                    label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
                                      const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
                                      const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
                                      return percent > 0.05 ? <text x={x} y={y} fill="white" fontSize="7" fontWeight="bold" textAnchor="middle" dominantBaseline="central">{`${(percent * 100).toFixed(0)}%`}</text> : null;
                                    }}
                                  >
                                    {[{fill: '#1d4ed8'}, {fill: '#8b5cf6'}, {fill: '#0ea5e9'}, {fill: '#ea580c'}, {fill: '#65a30d'}].map((e,i) => <Cell key={i} fill={e.fill} />)}
                                  </Pie>
                                </PieChart>
                              </ResponsiveContainer>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', justifyContent: 'center' }}>
                              {[
                                { name: 'Energía Eléctrica', value: results.monthlyElectricityCostMxn, fill: '#1d4ed8' },
                                { name: 'Mano de Obra', value: results.manoObraMensualMxn, fill: '#8b5cf6' },
                                { name: 'Impacto Hídrico', value: results.waterCostMonthlyMxn || 0, fill: '#0ea5e9' },
                                { name: 'Mantenimiento', value: results.mantenimientoMensualMxn, fill: '#ea580c' },
                                { name: 'Refacciones', value: inputs.filtrosMensualMxn + inputs.refaccionesMensualMxn + inputs.lubricacionMensualMxn, fill: '#65a30d' }
                              ].filter(d => d.value > 0).map((d, i, arr) => {
                                const total = arr.reduce((sum, item) => sum + item.value, 0);
                                const pct = ((d.value / total) * 100).toFixed(1);
                                return (
                                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '4px' }}>
                                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: d.fill, marginTop: '3px', flexShrink: 0 }} />
                                    <div>
                                      <div style={{ fontSize: '8px', fontWeight: 700, color: '#334155', lineHeight: 1.1 }}>{d.name}</div>
                                      <div style={{ fontSize: '7px', color: '#64748b' }}>({pct}%)</div>
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                        {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                    </div>
                  </div>
                  </div>
                )}

                {/* PÁGINA: REQUERIMIENTOS DE OBRA CIVIL Y PISO */}
                {pdfConfig.civil && (
                  <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                    <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {renderPageHeader('Obra Civil y Cimentación', 'Dictamen y Especificaciones Estructurales de Piso y Bodega')}
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        
                        {/* Panel izquierdo: Especificaciones y Ficha */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 16, background: '#fffbeb' }}>
                            <div style={{ fontSize: 10, fontWeight: 900, color: '#d97706', textTransform: 'uppercase', marginBottom: 6 }}>Especificación de Losa y Concreto</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: '#1e293b', marginBottom: 4 }}>Concreto f'c {inputs.civilConcretoFc || 250} kg/cm²</div>
                            <div style={{ fontSize: 11, color: '#475569', fontWeight: 650 }}>Espesor mínimo de losa: <strong>{inputs.civilEspesorPisoCm || 20} cm</strong></div>
                          </div>

                          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                            <div style={{ fontSize: 10, fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>Ficha de Estructura de Bodega</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10.5, color: '#475569', fontWeight: 600 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Acabado Superficial:</span><strong style={{ color: '#1e293b' }}>{inputs.civilAcabadoPiso || 'PULIDO ESPEJO CON ENDURECEDOR'}</strong></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Refuerzo Estructural:</span><strong style={{ color: '#1e293b' }}>{inputs.civilRefuerzoPiso || 'DOBLE PARRILLA DE VARILLA 3/8"'}</strong></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Tratamiento de Juntas:</span><strong style={{ color: '#1e293b' }}>{inputs.civilJuntasDilatacion || 'SELLO DE POLIURETANO'}</strong></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Área Mínima Bodega:</span><strong style={{ color: '#1e293b' }}>{inputs.civilAreaRequeridaM2 || 75} m²</strong></div>
                            </div>
                          </div>
                        </div>

                        {/* Panel derecho: Instalación y Anclaje */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                            <div style={{ fontSize: 10, fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', marginBottom: 8, borderBottom: '1px solid #e2e8f0', paddingBottom: 4 }}>Instalación y Anclaje Mecánico</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10.5, color: '#475569', fontWeight: 600 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sistema de Anclaje:</span><strong style={{ color: '#1e293b' }}>{inputs.civilAnclajeTornillos || 'HILTI HAS-E CON RESINA'}</strong></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Canalizaciones Subterráneas:</span><strong style={{ color: '#1e293b' }}>{inputs.civilCanalizacionesSubterraneas || '2 TUBOS PVC 4" + 1 TUBO 2"'}</strong></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Mitigación de Vibraciones:</span><strong style={{ color: '#1e293b' }}>{inputs.civilSistemaVibracion || 'NEOPRENO DE ALTA DENSIDAD'}</strong></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Carga Dinámica Portante:</span><strong style={{ color: '#1e293b' }}>{inputs.civilCargaSoportada || 8.0} Ton/m²</strong></div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Volumen Excavación Base:</span><strong style={{ color: '#1e293b' }}>{inputs.civilExcavacionM3 || 4.5} m³</strong></div>
                            </div>
                          </div>

                          <div style={{ border: '1px solid #d97706', borderRadius: 12, padding: 12, background: '#fffbeb', fontSize: 10, color: '#78350f', lineHeight: 1.4, fontWeight: 600 }}>
                            <span style={{ fontWeight: 900, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>⚠️ Nota de Cumplimiento Técnico:</span>
                            La obra civil debe ser supervisada por un ingeniero estructural certificado. La resistencia del terreno debe ser validada mediante un estudio de mecánica de suelos previo a la colada del concreto estructural para soportar las fuerzas hidrodinámicas del sistema de lavado.
                          </div>
                        </div>

                      </div>

                      {/* Dimensiones y Diagrama conceptual */}
                      <div style={{ border: '1px solid #cbd5e1', borderRadius: 12, padding: 12, background: '#f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 900, color: '#475569', textTransform: 'uppercase' }}>Dimensiones de Planta y Peso del Equipo</div>
                          <div style={{ fontSize: 13, fontWeight: 900, color: '#1e293b', marginTop: 2 }}>{inputs.machineLength || 14.5}m Largo x {inputs.machineWidth || 1.75}m Ancho x {inputs.machineHeight || 1.9}m Alto | Peso: {inputs.pesoOperativoKg && inputs.pesoOperativoKg !== 1000 ? new Intl.NumberFormat().format(inputs.pesoOperativoKg) : '1,800'} kg</div>
                        </div>
                        <div style={{ fontSize: 10, color: '#475569', fontWeight: 600 }}>
                          Estándar de Obra Civil de PANDORA v3.0
                        </div>
                      </div>
                      
                      {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                    </div>
                  </div>
                )}

              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: LIBRERÍA DE DISEÑOS 3D */}
      <FlowDesignsLibrary 
        isOpen={isDesignsLibraryOpen}
        onClose={() => setIsDesignsLibraryOpen(false)}
        onLoad={handleLoadDesignFromLibrary}
        onLayoutChange={setTwinLayout}
        activeLayout={twinLayout}
      />

      {/* MODAL: CONFIRMACIÓN Y NOMBRADO DE SUBIDA 3D */}
      {pendingUpload && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[10000] flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-md w-full shadow-2xl space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-purple-50 flex items-center justify-center text-purple-600">
                <Upload className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase">Subir a Librería de Diseños</h3>
                <p className="text-[10px] text-slate-400">Asigna un nombre para guardar el modelo CAD en la nube</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Nombre del Layout:</label>
              <input 
                type="text"
                value={uploadModelName}
                onChange={(e) => setUploadModelName(e.target.value)}
                placeholder="Ej: Planta de Lavado Norte"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 outline-none transition-all"
              />
            </div>

            {isSavingToCloud && (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase">
                  <span>Subiendo archivo binario...</span>
                  <span className="text-cyan-600 font-mono">{uploadProgress}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-gradient-to-r from-cyan-500 to-purple-500 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }} />
                </div>
              </div>
            )}

            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={handleCancelUpload}
                disabled={isSavingToCloud}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-slate-500 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmUploadToLibrary}
                disabled={isSavingToCloud}
                className="px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-white bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-700 hover:to-purple-700 shadow-md hover:shadow-lg transition-all"
              >
                {isSavingToCloud ? 'Guardando...' : 'Confirmar y Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST DE NOTIFICACIÓN DE ÉXITO */}
      {showToast && (
        <div className="fixed bottom-8 right-8 z-[9999] px-5 py-3.5 rounded-xl bg-slate-900 border border-cyan-500/30 text-white shadow-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="w-7 h-7 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Check className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider">Notificación de Sistema</h4>
            <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{toastMessage}</p>
          </div>
        </div>
      )}

      {/* ESTILOS DE ANIMACIÓN EN SVG */}
      <style>{`
        @keyframes wood-feed {
          0% { transform: translate(0, 0) scale(1); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translate(180px, -70px) scale(0.6); opacity: 0; }
        }
        @keyframes wood-out {
          0% { transform: translate(0, 0) scale(0.6); opacity: 0; }
          10% { opacity: 0.8; }
          90% { opacity: 0.8; }
          100% { transform: translate(200px, 50px) scale(1); opacity: 0; }
        }
        @keyframes metal-attract {
          0% { transform: translate(0, 0) rotate(45deg); opacity: 0; }
          10% { opacity: 0.9; }
          80% { transform: translate(0, -60px) rotate(90deg); opacity: 0.9; }
          100% { transform: translate(0, -60px) rotate(90deg); opacity: 0; }
        }
      `}</style>

    </div>
  );
}

