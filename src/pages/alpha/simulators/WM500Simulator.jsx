import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Zap, DollarSign, Activity, Settings, 
  AlertCircle, ShieldAlert, Cpu, Layers, Wrench, 
  Clock, BarChart3, FileSpreadsheet, Percent, 
  TrendingUp, RotateCcw, Printer, Info, Eye, X, Download, 
  Upload, Check, Sliders, Play, Pause, Save, Scale, ArrowRight, Loader2,
  FolderOpen, Link2, Plus, Maximize2, Minimize2, Lock, Unlock, MousePointer, Edit2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Cell, AreaChart, Area, LineChart, Line, PieChart, Pie
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

// ── Helpers de IndexedDB para almacenamiento de Modelos 3D persistentes locales ──
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

export default function WM500Simulator() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeProject, updateProjectName } = useBeta();
  const reportRef = useRef(null);

  // --- 1. ESTADO DE ENTRADAS ---
  const defaultInputs = {
    // Metadatos
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

    // Operación
    nominalCapacity: 4000,
    utilization: 90,
    oee: 85,
    loadFactor: 85,
    hoursPerDay: 20,
    shiftsPerDay: 2,
    daysPerMonth: 24,
    dailyGoalKg: 50000,
    reductionFactor: 90,

    // Energía y Motor
    motorPrincipalHp: 120,
    motorAuxiliarHp: 10,
    customInstalledPowerKw: 96.98,
    potenciaActivaKw: 82.43,
    electricityRate: 2.50,

    // Especificaciones Técnicas
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

    // CAPEX
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

    // OPEX
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

    // Financiero
    precioVentaTonMxn: 500,
    ahorroPorTonMxn: 600,
    usarModoIngresoVenta: true,
    usarModoAhorroInterno: false,
    vidaUtilAnios: 10,
    tasaDescuento: 14,
    depreciacionAnual: 10,
    inflacionAnual: 5,
    incrementoEnergiaAnual: 6,

    // Riesgos y Mantenimiento
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
    requiereEStop: true,
  };

  const [inputs, setInputs] = useState(() => {
    const saved = localStorage.getItem('sim_wm500_inputs');
    return saved ? JSON.parse(saved) : defaultInputs;
  });

  useEffect(() => {
    localStorage.setItem('sim_wm500_inputs', JSON.stringify(inputs));
  }, [inputs]);

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
  
  const [pdfConfig, setPdfConfig] = useState(() => {
    const saved = localStorage.getItem('sim_wm500_pdf_config');
    if (saved) {
      try { return JSON.parse(saved); } catch(e){}
    }
    return {
      resumen: true,
      twin: true,
      tabla: true,
      capex: true,
      energia: true,
      escenarios: true,
      financiero: true,
      riesgos: true
    };
  });

  useEffect(() => {
    localStorage.setItem('sim_wm500_pdf_config', JSON.stringify(pdfConfig));
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
  const [twinSnapshotIsometrica, setTwinSnapshotIsometrica] = useState(null);

  const [isDesignsLibraryOpen, setIsDesignsLibraryOpen] = useState(false);
  const [isTwinEditMode, setIsTwinEditMode] = useState(false);
  const [selectedTwinNodeId, setSelectedTwinNodeId] = useState(null);
  
  const [twinLabelHeightOffset, setTwinLabelHeightOffset] = useState(() => {
    const saved = localStorage.getItem('sim_wm500_twin_label_height_offset');
    return saved !== null ? Number(saved) : 0.2;
  });
  const [twinLabelsCollapsed, setTwinLabelsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sim_wm500_twin_labels_collapsed');
    return saved !== null ? saved === 'true' : false;
  });
  const [twinFloorElevation, setTwinFloorElevation] = useState(() => {
    const saved = localStorage.getItem('sim_wm500_twin_floor_elevation');
    return saved !== null ? Number(saved) : 0.0;
  });
  const [twinFloorLocked, setTwinFloorLocked] = useState(() => {
    const saved = localStorage.getItem('sim_wm500_twin_floor_locked');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sim_wm500_twin_label_height_offset', String(twinLabelHeightOffset));
  }, [twinLabelHeightOffset]);
  useEffect(() => {
    localStorage.setItem('sim_wm500_twin_labels_collapsed', String(twinLabelsCollapsed));
  }, [twinLabelsCollapsed]);
  useEffect(() => {
    localStorage.setItem('sim_wm500_twin_floor_elevation', String(twinFloorElevation));
  }, [twinFloorElevation]);
  useEffect(() => {
    localStorage.setItem('sim_wm500_twin_floor_locked', String(twinFloorLocked));
  }, [twinFloorLocked]);
  useEffect(() => {
    localStorage.setItem('sim_wm500_twin_floor_locked', String(twinFloorLocked));
  }, [twinFloorLocked]);

  const twinBlockRef = useRef(null);
  const [isTwinBlockFullscreen, setIsTwinBlockFullscreen] = useState(false);
  const [twinTheme, setTwinTheme] = useState(() => {
    const saved = localStorage.getItem('sim_wm500_twin_theme');
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
    localStorage.setItem('sim_wm500_twin_theme', typeof twinTheme === 'object' ? JSON.stringify(twinTheme) : twinTheme);
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
    const saved = localStorage.getItem('sim_wm500_twin_node_positions');
    return saved ? JSON.parse(saved) : {};
  });

  // Nodos y enlaces para la trituradora industrial WM-500
  const twinNodes = useMemo(() => {
    const baseNodes = [
      { id: '1', type: 'alimentador', label: 'Banda Alimentadora WM-500', color: '#00F0FF', x: -4 },
      { id: '2', type: 'camara', label: 'Cámara de Trituración (120hp)', color: '#FF0055', x: 0 },
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
      const savedMeta = localStorage.getItem('sim_wm500_layout_meta');
      if (!savedMeta) return;
      
      const savedModel = await getModelFromIndexedDB('sim_wm500_active_model');
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
          .eq('key', 'sim_wm500_data')
          .maybeSingle();

        if (error) throw error;
        let stateToLoad = null;

        if (data && data.value) {
          stateToLoad = JSON.parse(data.value);
        }

        // Revisar si hay un autoguardado local más reciente (por F5 accidental)
        const suffix = activeProject?.id ? `${activeProject.id}_` : 'local_';
        const localAutoSaveStr = localStorage.getItem(`sim_wm500_${suffix}autosave`);
        
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
            setInputs(prev => ({ ...prev, ...stateToLoad.inputs }));
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
    const autoSaveData = {
      inputs,
      twinNodePositions,
      currentDesignId,
      activeTab,
      timestamp: Date.now()
    };
    
    // No guardamos la url blob, pero sí guardamos que hay un diseño activo
    if (twinLayout && !twinLayout.url?.startsWith('blob:')) {
      autoSaveData.twinLayout = twinLayout;
    }

    localStorage.setItem(`sim_wm500_${suffix}autosave`, JSON.stringify(autoSaveData));
  }, [inputs, twinNodePositions, currentDesignId, activeTab, twinLayout, activeProject?.id]);

  // Cargar instantáneas del gemelo digital de localStorage y mantenerlas sincronizadas
  useEffect(() => {
    const syncSnapshot = () => {
      const suffix = activeProject?.id ? `${activeProject.id}_` : '';
      setTwinSnapshot(localStorage.getItem(`sim_wm500_${suffix}twin_snapshot_base64`));
      setTwinSnapshotLateral(localStorage.getItem(`sim_wm500_${suffix}twin_snapshot_lateral`));
      setTwinSnapshotSuperior(localStorage.getItem(`sim_wm500_${suffix}twin_snapshot_superior`));
      setTwinSnapshotIsometrica(localStorage.getItem(`sim_wm500_${suffix}twin_snapshot_isometrica`));
    };
    syncSnapshot();
    window.addEventListener('storage', syncSnapshot);
    return () => window.removeEventListener('storage', syncSnapshot);
  }, [isReportModalOpen, activeProject?.id]);

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

  // --- 2. CÁLCULO DE MÉTRICAS AUTOMÁTICAS ---
  const results = useMemo(() => {
    // 1. DIMENSIONES
    const footprintM2 = (inputs.machineLength || 0) * (inputs.machineWidth || 0);

    // 2. PRODUCCIÓN Y CAPACIDAD
    const nominalCapacity = inputs.nominalCapacity || 4000;
    const realProductionPerHourKg = nominalCapacity * ((inputs.utilization || 90) / 100) * ((inputs.oee || 85) / 100);
    const dailyProductionKg = realProductionPerHourKg * (inputs.hoursPerDay || 20);
    const dailyProductionTon = dailyProductionKg / 1000;
    const monthlyProductionTon = dailyProductionTon * (inputs.daysPerMonth || 24);
    const annualProductionTon = monthlyProductionTon * 12;
    const requirementCoverage = (inputs.dailyGoalKg || 0) > 0 ? (dailyProductionKg / inputs.dailyGoalKg) * 100 : 0;
    const systemUtilization = dailyProductionKg > 0 ? ((inputs.dailyGoalKg || 0) / dailyProductionKg) : 0;
    const operationalReserve = Math.max(0, 100 - (systemUtilization * 100));
    const machinesRequired = dailyProductionKg > 0 ? Math.ceil((inputs.dailyGoalKg || 0) / dailyProductionKg) : 1;

    // 3. ENERGÍA
    const installedPowerKw = inputs.customInstalledPowerKw || 96.98;
    const averageHourlyConsumptionKw = installedPowerKw * ((inputs.loadFactor || 85) / 100);
    const hourlyElectricityCostMxn = averageHourlyConsumptionKw * (inputs.electricityRate || 2.50);
    const dailyElectricityCostMxn = hourlyElectricityCostMxn * (inputs.hoursPerDay || 20);
    const monthlyElectricityCostMxn = dailyElectricityCostMxn * (inputs.daysPerMonth || 24);
    const annualElectricityCostMxn = monthlyElectricityCostMxn * 12;

    const productionPerHourTon = realProductionPerHourKg / 1000;
    const kwhPerTon = productionPerHourTon > 0 ? (averageHourlyConsumptionKw / productionPerHourTon) : 0;
    const electricityCostPerTonMxn = kwhPerTon * (inputs.electricityRate || 2.50);

    // 4. CAPEX
    const precioEquipoUsd = inputs.precioEquipoUsd || 0;
    const ivaUsd = precioEquipoUsd * ((inputs.iva || 0) / 100);
    const maniobrasUsd = precioEquipoUsd * ((inputs.porcentajeManiobras || 0) / 100);
    const montajeMecanicoUsd = precioEquipoUsd * ((inputs.porcentajeMontajeMecanico || 0) / 100);
    const obraCivilUsd = precioEquipoUsd * ((inputs.porcentajeObraCivil || 0) / 100);
    const electricoPrincipalUsd = precioEquipoUsd * ((inputs.porcentajeElectricoPrincipal || 0) / 100);
    const canalizacionProteccionesUsd = precioEquipoUsd * ((inputs.porcentajeCanalizacionProtecciones || 0) / 100);
    const extraccionPolvoUsd = precioEquipoUsd * ((inputs.porcentajeExtraccionPolvo || 0) / 100);
    const seguridadIndustrialUsd = precioEquipoUsd * ((inputs.porcentajeSeguridadIndustrial || 0) / 100);
    const ingenieriaSupervisionUsd = precioEquipoUsd * ((inputs.porcentajeIngenieriaSupervision || 0) / 100);
    const contingenciaUsd = precioEquipoUsd * ((inputs.porcentajeContingencia || 0) / 100);

    const capexInstaladoUsd = precioEquipoUsd + maniobrasUsd + montajeMecanicoUsd + obraCivilUsd + electricoPrincipalUsd + canalizacionProteccionesUsd + extraccionPolvoUsd + seguridadIndustrialUsd + ingenieriaSupervisionUsd + contingenciaUsd;
    const capexFiscalUsd = capexInstaladoUsd + ivaUsd;
    const capexInstaladoMxn = capexInstaladoUsd * (inputs.tipoCambio || 1);
    
    const capexPorTonHoraUsd = productionPerHourTon > 0 ? (capexInstaladoUsd / productionPerHourTon) : 0;
    const capexPorKwUsd = installedPowerKw > 0 ? (capexInstaladoUsd / installedPowerKw) : 0;
    const capexPorM2Usd = footprintM2 > 0 ? (capexInstaladoUsd / footprintM2) : 0;
    const capexPorTonAnualUsd = annualProductionTon > 0 ? (capexInstaladoUsd / annualProductionTon) : 0;

    // 5. OPEX
    const manoObraMensualMxn = ((inputs.operadoresPorTurno || 0) * (inputs.shiftsPerDay || 2) * (inputs.sueldoOperadorMensual || 0)) + ((inputs.supervisoresPorTurno || 0) * (inputs.shiftsPerDay || 2) * (inputs.sueldoSupervisorMensual || 0));
    const mantenimientoAnualMxn = capexInstaladoMxn * ((inputs.mantenimientoAnualPorcentaje || 0) / 100);
    const mantenimientoMensualMxn = mantenimientoAnualMxn / 12;

    const opexMensualMxn = (monthlyElectricityCostMxn || 0) + (manoObraMensualMxn || 0) + (mantenimientoMensualMxn || 0) + (inputs.cuchillasMensualMxn || 0) + (inputs.refaccionesMensualMxn || 0) + (inputs.lubricacionMensualMxn || 0) + (inputs.limpiezaMensualMxn || 0) + (inputs.consumiblesMensualMxn || 0) + (inputs.otrosOpexMensualMxn || 0);
    const opexAnualMxn = opexMensualMxn * 12;
    const opexPorTonMxn = monthlyProductionTon > 0 ? (opexMensualMxn / monthlyProductionTon) : 0;

    // 6. VIABILIDAD FINANCIERA
    let ingresoMensual = 0;
    if (inputs.usarModoIngresoVenta) ingresoMensual = monthlyProductionTon * (inputs.precioVentaTonMxn || 0);
    else if (inputs.usarModoAhorroInterno) ingresoMensual = monthlyProductionTon * (inputs.ahorroPorTonMxn || 0);

    const flujoOperativoMensual = ingresoMensual - opexMensualMxn;
    const flujoOperativoAnual = flujoOperativoMensual * 12;
    const paybackMeses = flujoOperativoMensual > 0 ? (capexInstaladoMxn / flujoOperativoMensual) : Infinity;
    const roiAnual = capexInstaladoMxn > 0 ? (flujoOperativoAnual / capexInstaladoMxn) * 100 : 0;
    const puntoEquilibrioTonMes = inputs.usarModoIngresoVenta && (inputs.precioVentaTonMxn || 0) > 0 ? (opexMensualMxn / inputs.precioVentaTonMxn) : 
                                  (inputs.usarModoAhorroInterno && (inputs.ahorroPorTonMxn || 0) > 0 ? (opexMensualMxn / inputs.ahorroPorTonMxn) : 0);

    // ESTADO OPERATIVO
    let estadoOperativo = "NO VIABLE";
    let estadoColor = "text-red-700 bg-red-50 border-red-200";
    if (requirementCoverage >= 110 && paybackMeses <= 24) {
      estadoOperativo = "VIABLE";
      estadoColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
    } else if (requirementCoverage >= 90 && paybackMeses <= 36) {
      estadoOperativo = "REVISAR";
      estadoColor = "text-amber-600 bg-amber-50 border-amber-200";
    }

    let estadoFinanciero = "NO VIABLE";
    if (flujoOperativoMensual > 0) {
      if (paybackMeses <= 24) estadoFinanciero = "VIABLE";
      else if (paybackMeses <= 36) estadoFinanciero = "REVISAR";
    }

    return {
      footprintM2,
      installedPowerKw,
      averageHourlyConsumptionKw,
      realProductionPerHourKg,
      dailyProductionKg,
      dailyProductionTon,
      monthlyProductionTon,
      annualProductionTon,
      hourlyElectricityCostMxn,
      dailyElectricityCostMxn,
      monthlyElectricityCostMxn,
      annualElectricityCostMxn,
      kwhPerTon,
      electricityCostPerTonMxn,
      systemUtilization,
      requirementCoverage,
      operationalReserve,
      machinesRequired,
      estadoOperativo,
      estadoColor,
      estadoFinanciero,
      totalHp: (inputs.motorPrincipalHp || 120) + (inputs.motorAuxiliarHp || 10),
      // CAPEX
      precioEquipoUsd, ivaUsd, maniobrasUsd, montajeMecanicoUsd, obraCivilUsd, electricoPrincipalUsd, canalizacionProteccionesUsd, extraccionPolvoUsd, seguridadIndustrialUsd, ingenieriaSupervisionUsd, contingenciaUsd,
      capexInstaladoUsd, capexFiscalUsd, capexInstaladoMxn,
      capexPorTonHoraUsd, capexPorKwUsd, capexPorM2Usd, capexPorTonAnualUsd,
      // OPEX
      manoObraMensualMxn, mantenimientoMensualMxn, opexMensualMxn, opexAnualMxn, opexPorTonMxn,
      // FINANCIAL
      ingresoMensual, flujoOperativoMensual, flujoOperativoAnual, paybackMeses, roiAnual, puntoEquilibrioTonMes
    };
  }, [inputs]);

  // Escenarios
  const scenarioResults = useMemo(() => {
    const calcScenario = (params) => {
      const { utilizacion, oee, factorCarga, horasDia, diasMes } = params;
      const nominalCapacity = inputs.nominalCapacity || 4000;
      const capacidadRealKgH = nominalCapacity * (utilizacion / 100) * (oee / 100);
      const produccionDiariaKg = capacidadRealKgH * horasDia;
      const produccionDiariaTon = produccionDiariaKg / 1000;
      const produccionMensualTon = produccionDiariaTon * diasMes;
      
      const installedPowerKw = inputs.customInstalledPowerKw || 96.98;
      const consumoPromedioHoraKwh = installedPowerKw * (factorCarga / 100);
      const costoElectricoHora = consumoPromedioHoraKwh * (inputs.electricityRate || 2.50);
      const costoElectricoMensual = costoElectricoHora * horasDia * diasMes;

      const manoObraMensual = ((inputs.operadoresPorTurno || 0) * (inputs.shiftsPerDay || 2) * (inputs.sueldoOperadorMensual || 0)) + ((inputs.supervisoresPorTurno || 0) * (inputs.shiftsPerDay || 2) * (inputs.sueldoSupervisorMensual || 0));
      const capexInstaladoMxn = results.capexInstaladoMxn || 0;
      const mantenimientoMensualMxn = (capexInstaladoMxn * ((inputs.mantenimientoAnualPorcentaje || 0) / 100)) / 12;

      const opexMensualMxn = (costoElectricoMensual || 0) + (manoObraMensual || 0) + (mantenimientoMensualMxn || 0) + (inputs.cuchillasMensualMxn || 0) + (inputs.refaccionesMensualMxn || 0) + (inputs.lubricacionMensualMxn || 0) + (inputs.limpiezaMensualMxn || 0) + (inputs.consumiblesMensualMxn || 0) + (inputs.otrosOpexMensualMxn || 0);
      const opexPorTon = produccionMensualTon > 0 ? (opexMensualMxn / produccionMensualTon) : 0;
      const coberturaMeta = (inputs.dailyGoalKg || 0) > 0 ? (produccionDiariaKg / inputs.dailyGoalKg) * 100 : 0;

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
        utilization: utilizacion / 100,
        payback,
        estado,
        estadoColor
      };
    };

    return {
      conservador: calcScenario({ utilizacion: inputs.utilization || 90, oee: 70, factorCarga: inputs.loadFactor || 85, horasDia: inputs.hoursPerDay || 20, diasMes: inputs.daysPerMonth || 24 }),
      normal: calcScenario({ utilizacion: inputs.utilization || 90, oee: 85, factorCarga: inputs.loadFactor || 85, horasDia: inputs.hoursPerDay || 20, diasMes: inputs.daysPerMonth || 24 }),
      alto: calcScenario({ utilizacion: inputs.utilization || 90, oee: 95, factorCarga: inputs.loadFactor || 85, horasDia: inputs.hoursPerDay || 20, diasMes: inputs.daysPerMonth || 24 })
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
    localStorage.setItem('sim_wm500_inputs', JSON.stringify(inputs));
    
    if (activeProject && activeProject.id && activeProject.id !== 'local-fallback-id') {
      try {
        const stateToSave = {
          inputs,
          twinLayout: twinLayout?.url?.startsWith('blob:') ? null : twinLayout,
          currentDesignId,
          twinNodePositions,
          timestamp: Date.now() // Marca de tiempo oficial de guardado
        };
        const payload = {
          project_id: activeProject.id,
          key: 'sim_wm500_data',
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
      await saveModelToIndexedDB('sim_wm500_active_model', file, file.name, processedResult.type);
      localStorage.setItem('sim_wm500_layout_meta', JSON.stringify({ name: file.name, type: processedResult.type }));

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
        localStorage.setItem('sim_wm500_twin_node_positions', JSON.stringify(positions));
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
      localStorage.removeItem('sim_wm500_twin_layout');
      localStorage.removeItem('sim_wm500_twin_node_positions');
      localStorage.removeItem('sim_wm500_twin_anchor_id');
      localStorage.removeItem('sim_wm500_layout_meta');
      deleteModelFromIndexedDB('sim_wm500_active_model');
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
      localStorage.setItem('sim_wm500_twin_anchor_id', designId || '');
      localStorage.setItem('sim_wm500_twin_layout', JSON.stringify({ ...twinLayout, elevation: twinFloorElevation }));
      localStorage.setItem('sim_wm500_twin_node_positions', JSON.stringify(twinNodePositions));
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
      localStorage.setItem('sim_wm500_twin_node_positions', JSON.stringify(next));
      return next;
    });
    setIsAnchored(false);
  };

  const printReport = async () => {
    const defaultName = `Dictamen_Industrial_${(inputs.clientName || 'Cliente').replace(/\s+/g, '_')}_WM500`;
    const finalFileName = window.prompt("Ingresa el nombre del archivo PDF a exportar:", defaultName);
    
    if (!finalFileName) return; // User cancelled or left empty
    
    setIsGeneratingPdf(true);
    setPdfProgress(10);
    
    const suffix = activeProject?.id ? `${activeProject.id}_` : '';
    setTwinSnapshot(localStorage.getItem(`sim_wm500_${suffix}twin_snapshot_base64`));
    setTwinSnapshotLateral(localStorage.getItem(`sim_wm500_${suffix}twin_snapshot_lateral`));
    setTwinSnapshotSuperior(localStorage.getItem(`sim_wm500_${suffix}twin_snapshot_superior`));
    setTwinSnapshotIsometrica(localStorage.getItem(`sim_wm500_${suffix}twin_snapshot_isometrica`));
    
    try {
      setIsPreviewMode(false);
      setIsReportModalOpen(true);
      await new Promise(resolve => setTimeout(resolve, 800)); // Esperar carga de componentes e imágenes
      
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4', compress: true });
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();
      
      const element = reportRef.current;
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
      ['SIMULADOR PARAMÉTRICO TRITURADORA WM-500'],
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
      ['Requerimiento diario objetivo', inputs.dailyGoalKg, 'kg/día'],
      ['Requerimiento mensual objetivo', inputs.monthlyGoalTon, 'ton/mes'],
      ['Humedad del material', inputs.materialHumidity, '%'],
      ['Factor de reducción', inputs.reductionFactor, '%'],
      [],
      ['RESULTADOS DE CAPACIDAD Y ENERGÍA', 'Valor', 'Unidad'],
      ['Potencia instalada total', results.installedPowerKw.toFixed(2), 'kW'],
      ['Consumo promedio por hora', results.averageHourlyConsumptionKw.toFixed(2), 'kW'],
      ['Producción real por hora', results.realProductionPerHourKg.toFixed(2), 'kg/h'],
      ['Producción diaria real', (results.dailyProductionKg / 1000).toFixed(2), 'ton/día'],
      ['Producción semanal real', (results.weeklyProductionKg / 1000).toFixed(2), 'ton/sem'],
      ['Producción mensual real', (results.monthlyProductionKg / 1000).toFixed(2), 'ton/mes'],
      ['Producción anual real', (results.annualProductionKg / 1000).toFixed(2), 'ton/año'],
      ['Costo eléctrico por hora', results.hourlyElectricityCostMxn.toFixed(2), 'MXN/h'],
      ['Costo eléctrico por día', results.dailyElectricityCostMxn.toFixed(2), 'MXN/día'],
      ['Costo eléctrico mensual', results.monthlyElectricityCostMxn.toFixed(2), 'MXN/mes'],
      ['kWh por tonelada procesada', results.kwhPerTon.toFixed(2), 'kWh/ton'],
      ['Costo por tonelada procesada', results.electricityCostPerTonMxn.toFixed(2), 'MXN/ton'],
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
      ['Producción Horaria (kg/h)', (4000 * 0.70 * (inputs.reductionFactor/100)).toFixed(0), (4000 * 0.85 * (inputs.reductionFactor/100)).toFixed(0), (4000 * 0.95 * (inputs.reductionFactor/100)).toFixed(0)],
      ['Producción Diaria (ton/día)', scenarioResults.conservador.dailyProdTon.toFixed(2), scenarioResults.normal.dailyProdTon.toFixed(2), scenarioResults.alto.dailyProdTon.toFixed(2)],
      ['Costo Energético por Ton (MXN/ton)', scenarioResults.conservador.costPerTon.toFixed(2), scenarioResults.normal.costPerTon.toFixed(2), scenarioResults.alto.costPerTon.toFixed(2)],
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
        text: `Equipo viable operando bajo régimen exigente (Utilización: ${utilPct.toFixed(1)}%). Se sugiere monitorear el desgaste de cuchillas y programar paros periódicos de mantenimiento preventivo.`
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
        text: "Se recomienda encarecidamente añadir una segunda máquina trituradora WM-500 en paralelo, o bien ampliar el turno diario actual para lograr el requerimiento diario objetivo."
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
      const prodTon = (results.monthlyProductionTon || 0) * factor;
      const energyMxn = (results.monthlyElectricityCostMxn || 0) * factor;
      const kwhMonth = ((results.averageHourlyConsumptionKw || 0) * (inputs.hoursPerDay || 24) * (inputs.daysPerMonth || 30)) * factor;
      return {
        name: m,
        Produccion: parseFloat(prodTon.toFixed(1)),
        CostoEnergia: parseFloat(energyMxn.toFixed(0)),
        ConsumoKwh: parseFloat(kwhMonth.toFixed(0)),
        Meta: inputs.monthlyGoalTon || 0
      };
    });
  }, [results, inputs]);

  const hasAnySnapshot = !!(twinSnapshot || twinSnapshotLateral || twinSnapshotSuperior || twinSnapshotIsometrica);
  
  const snapshotPages = [];
  if (twinSnapshotIsometrica) snapshotPages.push({ title: 'PERSPECTIVA ISOMÉTRICA', type: 'Isométrica', src: twinSnapshotIsometrica });
  if (twinSnapshotSuperior) snapshotPages.push({ title: 'PLANTA ARQUITECTÓNICA', type: 'Superior', src: twinSnapshotSuperior });
  if (twinSnapshotLateral) snapshotPages.push({ title: 'ELEVACIÓN LATERAL', type: 'Lateral', src: twinSnapshotLateral });
  if (snapshotPages.length === 0 && twinSnapshot) snapshotPages.push({ title: 'PERSPECTIVA GENERAL', type: 'Libre', src: twinSnapshot });
  
  let basePagesCount = 0;
  if (pdfConfig.resumen) basePagesCount++;
  if (pdfConfig.tabla) basePagesCount += 3;
  if (pdfConfig.energia) basePagesCount++;
  if (pdfConfig.financiero || pdfConfig.capex || pdfConfig.riesgos) basePagesCount++;
  if (pdfConfig.escenarios) basePagesCount++;
  
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
    th: { padding: '8px 12px', fontSize: 10.5, fontWeight: 900, color: '#008299', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '2px solid #b2f5ea', borderTop: '2px solid #b2f5ea', textAlign: 'left' },
    td: { padding: '12px 12px', borderBottom: '1px solid #e2e8f0', color: '#334155', fontWeight: 600 }
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
    if (withoutNum.includes('FINANCIERO')) return { line1: num + 'ANÁLISIS DE RENTABILIDAD', line2: withoutNum };
    if (withoutNum.includes('ENERGÍA') || withoutNum.includes('ENERGIA') || withoutNum.includes('CAPACIDAD')) return { line1: num + 'REQUERIMIENTOS OPERATIVOS', line2: withoutNum };
    
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
      </div>
    );
  };

  const renderPageFooter = (pageNum, total) => (
    <div style={{ borderTop: '1px solid #dbe5ee', paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
      <span>{inputs.clientName.toUpperCase()} · MÁQUINA: WM-500</span>
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
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        
        {/* PANEL IZQUIERDO: VARIABLES EDITABLES (CONFIGURADOR) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-4">
            <Sliders className="w-5 h-5 text-cyan-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">Variables Editables</h2>
          </div>

          <div className="overflow-y-auto max-h-[75vh] pr-2 custom-scrollbar">
            
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
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Capacidad Nom (kg/h)</span>
                    <input type="number" step="100" value={inputs.nominalCapacity || 0} onChange={e => setInputs(p => ({...p, nominalCapacity: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />
                  </div>
                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Meta Diaria (kg)</span>
                    <input type="number" step="100" value={inputs.dailyGoalKg || 0} onChange={e => setInputs(p => ({...p, dailyGoalKg: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between mb-1">
                    <span className="text-[9px] font-bold text-slate-500 uppercase">Utilización / Factor de Reducción (%)</span>
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
                    <input type="number" step="0.1" value={inputs.customInstalledPowerKw || 0} onChange={e => setInputs(p => ({...p, customInstalledPowerKw: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />
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
                  <span className="block text-[8px] font-bold text-slate-400 uppercase mb-2">Costos Indirectos (Porcentajes % sobre USD)</span>
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
                  { label: 'Cuchillas (MXN)', key: 'cuchillasMensualMxn', isMxn: true },
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
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Precio de Venta (MXN/ton)</span>
                    <div className="relative flex items-center">
                      <span className="absolute left-2.5 text-xs font-black text-purple-400">$</span>
                      <input type="number" step="10" value={inputs.precioVentaTonMxn || 0} onChange={e => setInputs(p => ({...p, precioVentaTonMxn: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-purple-200 rounded-lg pl-6 pr-2 py-1.5 text-xs font-bold text-purple-800 focus:border-purple-500 focus:outline-none" />
                    </div>
                  </div>
                )}
                {inputs.usarModoAhorroInterno && (
                  <div>
                    <span className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Ahorro Generado (MXN/ton)</span>
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
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Vida Cuchillas (Hrs)</span>
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

          </div>
        </div>

        {/* PANEL DERECHO: NAVEGACIÓN Y REPORTES INDUSTRIALES */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* TABS DE SECCIÓN */}
          <div className="flex flex-wrap bg-slate-200 p-1.5 rounded-2xl gap-1">
            {[
              { id: 'resumen', label: '1. Portada' },
              { id: 'twin', label: '2. Twin 3D' },
              { id: 'tabla', label: '3. Métricas' },
              { id: 'capex', label: '4. CAPEX/OPEX' },
              { id: 'energia', label: '5. Energía' },
              { id: 'escenarios', label: '6. Escenarios' },
              { id: 'financiero', label: '7. Financiero' },
              { id: 'riesgos', label: '8. Riesgos' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider flex-1 text-center truncate ${activeTab === t.id ? 'bg-white text-cyan-800 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-300'}`}
                title={t.label}
              >
                {t.label}
              </button>
            ))}
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
                      <h2 className="text-3xl font-black text-white uppercase tracking-tight">SIMULADOR PARAMÉTRICO WM-500</h2>
                      {renderPdfToggleButton('resumen', 'Portada')}
                    </div>
                    <p className="text-xs text-slate-300 font-bold uppercase tracking-wider mt-1">{inputs.evaluationName}</p>
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
                    <span className="text-3xl font-black text-slate-900">{new Intl.NumberFormat().format(results.realProductionPerHourKg.toFixed(0))}</span>
                    <span className="text-xs font-bold text-slate-400 ml-1">kg/h</span>
                  </div>
                  
                  <div className="flex flex-col gap-1.5 mt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                      <span>Nominal:</span>
                      <div>
                        <input 
                          type="number"
                          value={inputs.nominalCapacity !== undefined ? inputs.nominalCapacity : 4000}
                          onChange={(e) => setInputs(prev => ({ ...prev, nominalCapacity: parseInt(e.target.value) || 0 }))}
                          className="w-16 bg-transparent border-b border-dashed border-slate-400 focus:border-cyan-500 focus:outline-none text-slate-700 px-0.5 group-hover:text-cyan-700 font-black text-right text-sm"
                          step="100"
                        /> kg/h
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
                  </div>
                </div>

                {/* Producción diaria */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-cyan-600" />
                    Producción Diaria
                  </span>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-slate-900">{(results.dailyProductionKg / 1000).toFixed(1)}</span>
                    <span className="text-xs font-bold text-slate-400 ml-1">ton/día</span>
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

                {/* Costo por Tonelada */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col justify-between shadow-sm">
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-cyan-600" />
                    Costo por Tonelada
                  </span>
                  <div className="mt-4">
                    <span className="text-3xl font-black text-slate-900">${results.electricityCostPerTonMxn.toFixed(1)}</span>
                    <span className="text-xs font-bold text-slate-400 ml-1">MXN/ton</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono mt-1">Eficiencia: {results.kwhPerTon.toFixed(1)} kWh/ton</span>
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
                  <span className="text-[9px] text-slate-500 font-mono mt-1">Objetivo: {new Intl.NumberFormat().format(inputs.dailyGoalKg)} kg/día</span>
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
                            {twinFloorLocked ? '🔒' : '📐'} Elevación del Piso:
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
                            ? '🔒 Elevación bloqueada. Haz clic en el candado para ajustar de nuevo.' 
                            : '📐 Desliza para encontrar la altura correcta, luego bloquea con el candado.'}
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
                        💡 Clic en nombre → mover en 3D
                      </p>
                    </div>
                  </div>
                )}

                {/* 3D CAD Twin Viewer Container */}
                <div className={`relative rounded-2xl overflow-hidden border ${twinTheme === 'toxic' ? 'border-[#2c302e] bg-[#0c0d0e]' : twinTheme === 'blueprint' ? 'border-slate-200 bg-[#edf4f9]' : 'border-slate-200 bg-[#05070f]'}`} style={{ display: is3DView ? 'block' : 'none' }}>
                  <SharedTwinViewer3D 
                    storagePrefix="sim_wm500_"
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
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Flujo del Proceso de Trituración</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">WM500 // Línea Industrial para Madera y Tarimas</p>
                  </div>
                  <div className="flex items-center gap-6 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />Capacidad</span>
                      <span className="text-xs font-black text-slate-800">4,000 kg/h</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Rotor</span>
                      <span className="text-xs font-black text-slate-800">650 rpm</span>
                    </div>
                    <div className="w-px h-6 bg-slate-200" />
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Partícula</span>
                      <span className="text-xs font-black text-slate-800">2-3 cm</span>
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
                    { num: '01', step: 'ETAPA A', sub: 'FEED_01', title: 'ALIMENTACIÓN', desc: 'Carga continua de madera o tarimas en la banda de entrada.', footer: 'BANDA: 4.0 m', color: 'teal', hex: '#14b8a6', bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-400' },
                    { num: '02', step: 'ETAPA B', sub: 'INLET_02', title: 'ENTRADA AL ROTOR', desc: 'Los rodillos conducen y dosifican el material hacia la cámara.', footer: 'INGRESO CONTROLADO', color: 'blue', hex: '#3b82f6', bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-400' },
                    { num: '03', step: 'ETAPA C', sub: 'SHRED_03', title: 'TRITURACIÓN', desc: 'Cuchillas tipo martillo reducen la madera de forma continua.', footer: 'ROTOR: 650 rpm', color: 'amber', hex: '#f59e0b', bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-400' },
                    { num: '04', step: 'ETAPA D', sub: 'MAG_SEP_04', title: 'SEPARACIÓN MAGNÉTICA', desc: 'Retiro de clavos, grapas y tornillos del material triturado.', footer: 'METAL: REMOVIDO', color: 'purple', hex: '#8b5cf6', bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-400' },
                    { num: '05', step: 'ETAPA E', sub: 'OUTFEED_05', title: 'DESCARGA', desc: 'Evacuación continua del material limpio por la banda de salida.', footer: 'BANDA: 3.0 m', color: 'emerald', hex: '#10b981', bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-400' },
                    { num: '06', step: 'ETAPA F', sub: 'OUTPUT_06', title: 'PRODUCTO FINAL', desc: 'Partículas de madera homogéneas, listas para valorización.', footer: 'SALIDA: 2-3 cm', color: 'rose', hex: '#f43f5e', bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-400' },
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
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Flujo: Izquierda → Derecha</span>
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
                        { comp: 'Modelo del Equipo', spec: 'WM-500', detail: 'Trituradora Industrial de Madera' },
                        { comp: 'Aplicación Operativa', spec: 'Madera, tarimas, clavos, grapas, tornillos', detail: 'Separación magnética automática' },
                        { comp: 'Capacidad Nominal', spec: '4,000 kg/h', detail: 'Sujeta a OEE y factor de reducción' },
                        { comp: 'Motorización Principal', spec: '120 hp Siemens', detail: 'Alta eficiencia clase IE3' },
                        { comp: 'Motorización Auxiliar', spec: '10 hp Siemens', detail: 'Sistemas auxiliares e hidráulicos' },
                        { comp: 'Potencia Instalada Total', spec: `${results.totalHp} hp`, detail: `${results.installedPowerKw.toFixed(2)} kW` },
                        { comp: 'Dimensiones Bandas', spec: 'Entrada: 4,000 mm | Salida: 3,000 mm', detail: 'Diseño continuo de banda reforzada' },
                        { comp: 'Boca de Alimentación', spec: '1,300 x 300 mm', detail: 'Apertura de seguridad' },
                        { comp: 'Rotación del Rotor', spec: '650 rpm', detail: 'Eje balanceado dinámicamente' },
                        { comp: 'Tamaño de Partícula Final', spec: '2 - 3 cm', detail: 'Ideal para reciclaje o briquetas' },
                        { comp: 'Separación Metálica', spec: 'Separador magnético incluido', detail: 'Imán sobrebanda autolimpiable' },
                        { comp: 'Dimensiones Físicas', spec: `Largo: ${inputs.machineLength} m | Ancho: ${inputs.machineWidth} m | Alto: ${inputs.machineHeight} m`, detail: `Footprint: ${(inputs.machineLength * inputs.machineWidth).toFixed(2)} m²` },
                        { comp: 'Peso Total Equipo', spec: '13,000 kg', detail: 'Anclaje antivibraciones' },
                        { comp: 'Componentes Eléctricos', spec: 'Schneider Electric', detail: 'Gabinete de control integrado' },
                        { comp: 'Nivel de Ruido', spec: '80 dB', detail: 'Diseño aislante de vibraciones' },
                      ].map((t, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-4 font-black text-slate-800">{t.comp}</td>
                          <td className="py-3 px-4 text-slate-600 font-bold">{t.spec}</td>
                          <td className="py-3 px-4 text-right text-slate-500 font-mono text-[11px]">{t.detail}</td>
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
                        value={inputs.customInstalledPowerKw === undefined ? 96.98 : inputs.customInstalledPowerKw}
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
                    <span className="text-xl font-black text-slate-800">{results.kwhPerTon.toFixed(1)} kWh/ton</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Costo por Tonelada</span>
                    <span className="text-xl font-black text-cyan-700">${results.electricityCostPerTonMxn.toFixed(2)} MXN</span>
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
                        { name: 'Requerimiento Diario', valor: inputs.dailyGoalKg, fill: '#64748b' },
                        { name: 'Capacidad Diaria Real', valor: results.dailyProductionKg, fill: '#06b6d4' }
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
                  Margen operativo disponible: <span className="text-cyan-600">{new Intl.NumberFormat().format(Math.max(0, results.dailyProductionKg - inputs.dailyGoalKg).toFixed(0))} kg/día</span>
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
                      <Line yAxisId="right" type="monotone" dataKey="CostoEnergia" stroke="#ef4444" strokeWidth={2} name="Costo Eléctrico (MXN)" />
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
                        <th className="px-4 py-3 font-black text-cyan-800 uppercase tracking-wider text-[10px] text-right">Producción (Ton)</th>
                        <th className="px-4 py-3 font-black text-indigo-800 uppercase tracking-wider text-[10px] text-right">Consumo (kWh)</th>
                        <th className="px-4 py-3 font-black text-emerald-800 uppercase tracking-wider text-[10px] text-right">Ratio (kWh/Ton)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {[
                        { period: 'Por Hora', prod: results.productionPerHourTon || 0, cons: results.averageHourlyConsumptionKw || 0 },
                        { period: 'Por Día', prod: results.dailyProductionTon || 0, cons: (results.averageHourlyConsumptionKw || 0) * (inputs.hoursPerDay || 20) },
                        { period: 'Por Semana', prod: (results.dailyProductionTon || 0) * 7, cons: (results.averageHourlyConsumptionKw || 0) * (inputs.hoursPerDay || 20) * 7 },
                        { period: 'Por Mes', prod: results.monthlyProductionTon || 0, cons: (results.averageHourlyConsumptionKw || 0) * (inputs.hoursPerDay || 20) * (inputs.daysPerMonth || 24) }
                      ].map((row, idx) => (
                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-700">{row.period}</td>
                          <td className="px-4 py-3 font-bold text-cyan-600 text-right">{new Intl.NumberFormat().format((row.prod).toFixed(2))}</td>
                          <td className="px-4 py-3 font-bold text-indigo-600 text-right">{new Intl.NumberFormat().format((row.cons).toFixed(1))}</td>
                          <td className="px-4 py-3 font-black text-emerald-600 text-right">{new Intl.NumberFormat().format((row.prod > 0 ? (row.cons / row.prod) : 0).toFixed(2))}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="mt-4 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-start gap-3">
                    <Info className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                    <p className="text-[11px] text-indigo-800 font-medium leading-relaxed">
                      El <strong>Consumo Específico (Ratio)</strong> indica la cantidad exacta de kilowatts requeridos para producir una tonelada. Un ratio bajo asegura la alta rentabilidad energética de la línea industrial.
                    </p>
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
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Producción:</span><span className="text-slate-800 font-bold">{(4000 * 0.7 * (inputs.reductionFactor/100)).toFixed(0)} kg/h</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Producción Diaria:</span><span className="text-slate-800 font-bold">{scenarioResults.conservador.dailyProdTon.toFixed(1)} ton</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Costo por Ton:</span><span className="text-slate-800 font-bold">${scenarioResults.conservador.costPerTon.toFixed(1)} MXN</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Cobertura Meta:</span><span className="text-slate-800 font-bold">{scenarioResults.conservador.coverage.toFixed(1)}%</span></div>
                        <div className="flex justify-between"><span>Utilización:</span><span className="text-slate-850 font-bold">{(scenarioResults.conservador.utilization * 100).toFixed(1)}%</span></div>
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
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Producción:</span><span className="text-slate-800 font-bold">{(4000 * 0.85 * (inputs.reductionFactor/100)).toFixed(0)} kg/h</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Producción Diaria:</span><span className="text-slate-800 font-bold">{scenarioResults.normal.dailyProdTon.toFixed(1)} ton</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Costo por Ton:</span><span className="text-slate-800 font-bold">${scenarioResults.normal.costPerTon.toFixed(1)} MXN</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Cobertura Meta:</span><span className="text-slate-800 font-bold">{scenarioResults.normal.coverage.toFixed(1)}%</span></div>
                        <div className="flex justify-between"><span>Utilización:</span><span className="text-slate-850 font-bold">{(scenarioResults.normal.utilization * 100).toFixed(1)}%</span></div>
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
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Producción:</span><span className="text-slate-800 font-bold">{(4000 * 0.95 * (inputs.reductionFactor/100)).toFixed(0)} kg/h</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Producción Diaria:</span><span className="text-slate-800 font-bold">{scenarioResults.alto.dailyProdTon.toFixed(1)} ton</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Costo por Ton:</span><span className="text-slate-800 font-bold">${scenarioResults.alto.costPerTon.toFixed(1)} MXN</span></div>
                        <div className="flex justify-between border-b border-slate-100 pb-1.5"><span>Cobertura Meta:</span><span className="text-slate-800 font-bold">{scenarioResults.alto.coverage.toFixed(1)}%</span></div>
                        <div className="flex justify-between"><span>Utilización:</span><span className="text-slate-850 font-bold">{(scenarioResults.alto.utilization * 100).toFixed(1)}%</span></div>
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
                        <YAxis yAxisId="left" stroke="#94a3b8" fontSize={10} tickLine={false} label={{ value: 'Producción (ton/día)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' } }} />
                        <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={10} tickLine={false} label={{ value: 'Costo (MXN/ton)', angle: 90, position: 'insideRight', style: { fill: '#94a3b8', fontSize: 10, fontWeight: 'bold' } }} />
                        <Tooltip cursor={{ fill: '#f8fafc' }} formatter={(value, name) => [name === 'produccion' ? `${value.toFixed(1)} ton` : `$${value.toFixed(1)}`, name === 'produccion' ? 'Producción Diaria' : 'Costo Operativo/Ton']} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '10px' }} />
                        <Bar yAxisId="left" dataKey="produccion" name="Producción Diaria (ton)" fill="#008299" radius={[4, 4, 0, 0]} maxBarSize={50} />
                        <Bar yAxisId="right" dataKey="costo" name="Costo Operativo (MXN/ton)" fill="#f43f5e" radius={[4, 4, 0, 0]} maxBarSize={50} />
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
                        { label: 'Maniobras y Montaje', val: (results.maniobrasUsd + results.montajeMecanicoUsd) * (inputs.tipoCambio || 1) },
                        { label: 'Instalación Eléctrica', val: (results.electricoPrincipalUsd + results.canalizacionProteccionesUsd) * (inputs.tipoCambio || 1) },
                        { label: 'Sistemas Seguridad/Polvo', val: (results.extraccionPolvoUsd + results.seguridadIndustrialUsd) * (inputs.tipoCambio || 1) },
                        { label: 'Obra Civil / Contingencia', val: (results.obraCivilUsd + results.contingenciaUsd) * (inputs.tipoCambio || 1) },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-xs font-semibold">
                          <span className="text-slate-600 uppercase">{item.label}</span>
                          <span className="text-emerald-700">${new Intl.NumberFormat().format(item.val.toFixed(0))}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between text-xs">
                      <span className="font-bold text-slate-400 uppercase">CAPEX por Ton/h:</span>
                      <span className="font-black text-slate-800">${new Intl.NumberFormat().format((results.capexInstaladoMxn / (results.realProductionPerHourKg/1000)).toFixed(0))} MXN</span>
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
                        { label: 'Refacciones (Cuchillas, etc)', val: inputs.cuchillasMensualMxn + inputs.refaccionesMensualMxn },
                        { label: 'Lubricación y Consumibles', val: inputs.lubricacionMensualMxn + inputs.limpiezaMensualMxn + inputs.consumiblesMensualMxn },
                      ].map((item, i) => (
                        <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded-lg text-xs font-semibold">
                          <span className="text-slate-600 uppercase">{item.label}</span>
                          <span className="text-rose-700">${new Intl.NumberFormat().format(item.val.toFixed(0))}</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-slate-100 pt-3 mt-3 flex justify-between text-xs">
                      <span className="font-bold text-slate-400 uppercase">OPEX por Tonelada:</span>
                      <span className="font-black text-slate-800">${new Intl.NumberFormat().format(results.opexPorTonMxn.toFixed(1))} MXN</span>
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
                  <span className="block text-[10px] font-bold text-slate-500 uppercase mb-1.5">{inputs.usarModoIngresoVenta ? 'Precio de Venta por Tonelada' : 'Ahorro Operativo por Tonelada'} (MXN)</span>
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
                      La operación requiere procesar al menos <strong>{new Intl.NumberFormat().format(results.puntoEquilibrioTonMes.toFixed(1))}</strong> toneladas mensuales para cubrir todos los gastos operativos (OPEX). Cualquier producción por encima de este umbral genera utilidad neta.
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
                      { label: 'Exposición a Polvo Fino', val: inputs.riesgoPolvo, icon: '🌪️' },
                      { label: 'Riesgo de Incendio', val: inputs.riesgoIncendio, icon: '🔥' },
                      { label: 'Contaminación Metálica', val: inputs.riesgoMetal, icon: '🧲' },
                      { label: 'Contaminación Acústica', val: inputs.riesgoRuido, icon: '🔊' }
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
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Cambio Cuchillas</span>
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

      </div>
      </div>

      {/* RENDERIZADO DEL INFORME COMPLETO EN LANDSCAPE */}
      {isReportModalOpen && (
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
                {!isPreviewMode && <span className="animate-spin text-cyan-600">⌛</span>}
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">
                  {isPreviewMode ? 'Vista Previa del Reporte' : 'Generando Reporte PDF WM-500...'}
                </h3>
              </div>
              {isPreviewMode && (
                <button 
                  onClick={printReport}
                  disabled={isGeneratingPdf}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-red-500 hover:bg-red-600 text-white transition-all uppercase tracking-wider shadow-sm"
                >
                  <Printer className="w-4 h-4" />
                  Descargar PDF
                </button>
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
                      <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>CENTERS DE MÉXICO</span>
                      <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '2px 8px', background: 'rgba(255,255,255,0.1)' }}>PANDORA 3.0</span>
                    </div>
                    <div style={{ textAlign: 'right', position: 'relative', zIndex: 2 }}>
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>TRITURADORA INDUSTRIAL {inputs.machineName?.toUpperCase() || 'WM-500'}</div>
                      <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 10, fontWeight: 700, marginTop: 3 }}>CLIENTE: {inputs.clientName.toUpperCase()} &nbsp;|&nbsp; MÁQUINA: {inputs.machineName?.toUpperCase() || 'WM-500'} &nbsp;|&nbsp; FECHA: {new Date().toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div style={{ ...S.inner, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40, alignItems: 'center', flex: 1, paddingTop: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
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

                      <div style={{ marginTop: 4 }}>
                        <div style={{ fontSize: 10, fontWeight: 900, color: '#00c2cb', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 }}>CLIENTE</div>
                        <div style={{ fontSize: 32, fontWeight: 900, color: '#0f2038', letterSpacing: -0.5 }}>{inputs.clientName.toUpperCase()}</div>
                      </div>

                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content', background: '#edfbfd', border: '1px solid #00c2cb', borderRadius: 20, padding: '4px 14px', fontSize: 10, color: '#008299', fontWeight: 800 }}>
                        <span style={{ display: 'inline-block', width: 6, height: 6, background: '#008299', borderRadius: '50%' }} />
                        Evaluación de Capacidad y Eficiencia
                      </div>

                      <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.6, margin: 0 }}>Análisis de capacidad, potencia instalada y viabilidad financiera para la línea de trituración de materiales sólidos con la WM-500.</p>

                      <div style={{ background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 16, padding: 18 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: 11, color: '#475569' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#008299', fontWeight: 700 }}>Empresa</span><strong style={{ color: '#1e293b' }}>{inputs.companyName || 'MÁQUINA EN EVALUACIÓN - WM-500'}</strong></div>
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
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#0f766e', fontWeight: 700 }}>Meta Objetivo Diaria</span><strong style={{ color: '#0f172a' }}>{new Intl.NumberFormat().format(inputs.dailyGoalKg)} kg/día</strong></div>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#edfbfd', borderRadius: 24, padding: 32, border: '1px solid #cffafe', display: 'flex', flexDirection: 'column', gap: 24, height: '100%', justifyContent: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: '#008299', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>VISTA PREVIA DE RESULTADOS</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cffafe', paddingBottom: 16 }}>
                        <div><div style={{ fontSize: 14, fontWeight: 800, color: '#0f2038' }}>Capacidad Real / Hora</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Considerando OEE del {inputs.oee}%</div></div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#008299' }}>{results.realProductionPerHourKg.toFixed(0)} kg/h</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cffafe', paddingBottom: 16 }}>
                        <div><div style={{ fontSize: 14, fontWeight: 800, color: '#0f2038' }}>Producción Diaria</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Capacidad total por día</div></div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#008299' }}>{(results.dailyProductionKg/1000).toFixed(2)} ton/día</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cffafe', paddingBottom: 16 }}>
                        <div><div style={{ fontSize: 14, fontWeight: 800, color: '#0f2038' }}>Costo de Producción (OPEX)</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Por tonelada producida</div></div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#008299' }}>{results.opexPorTonMxn.toFixed(1)} MXN</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><div style={{ fontSize: 14, fontWeight: 800, color: '#0f2038' }}>Viabilidad Proyectada</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Cobertura de meta ({results.requirementCoverage.toFixed(1)}%)</div></div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#008299' }}>{results.viabilityState}</div>
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

                {/* PÁGINA 2: DATOS TÉCNICOS Y DICTAMEN AI */}
                {pdfConfig.tabla && (
                <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                  <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {renderPageHeader('2. Especificaciones Técnicas', 'Listado físico nominal con potencias individuales calculadas al factor de carga')}

                    <div style={{ width: '100%' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                        <thead>
                          <tr>
                            <th style={{ ...REPORT_STYLES.th, background: '#edfbfd' }}>Equipo</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#edfbfd', textAlign: 'center' }}>Capacidad</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#edfbfd', textAlign: 'center' }}>kW Instalados</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#edfbfd', textAlign: 'center' }}>Carga Activa ({inputs.loadFactor}%)</th>
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
                            <td style={REPORT_STYLES.td}>Trituradora Principal WM-500 (Rotor 650 RPM)</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{inputs.nominalCapacity || 4000} kg/h</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>89.50 kW</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#0d9488', fontWeight: 700 }}>{(89.50 * (inputs.loadFactor/100)).toFixed(2)} kW</td>
                          </tr>
                          <tr>
                            <td style={REPORT_STYLES.td}>Motor Auxiliar Hidráulico</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>-</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>7.46 kW</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#0d9488', fontWeight: 700 }}>{(7.46 * (inputs.loadFactor/100)).toFixed(2)} kW</td>
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
                            <td style={{ ...REPORT_STYLES.td, color: '#0d9488' }}>Total Sistema de Trituración WM-500</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>-</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{(results.installedPowerKw || 96.98).toFixed(2)} kW</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#0d9488' }}>{(results.averageHourlyConsumptionKw || 72.73).toFixed(2)} kW</td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, fontSize: 10, color: '#475569', lineHeight: 1.4 }}>
                      <strong>Nota del Ingeniero:</strong> Los componentes han sido calibrados mecánicamente para un voltaje nominal adaptado a los requerimientos eléctricos del sitio, con una carga activa basada en un OEE del {inputs.oee}%.
                    </div>

                    <div style={{ marginTop: 5, background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 16, padding: '14px 20px' }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: '#008299', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 4 }}>DISTRIBUCIÓN DE POTENCIA INSTALADA POR EQUIPO (kW)</span>
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: 10, lineHeight: '1.4' }}>
                        <tbody>
                          {[
                            { name: 'Banda Alimentadora', kw: 1.65 },
                            { name: 'Trituradora Principal', kw: 89.50 },
                            { name: 'Motor Hidráulico', kw: 7.46 },
                            { name: 'Banda de Descarga', kw: 1.65 },
                          ].map((eq, i) => {
                            const percentage = (eq.kw / (results.installedPowerKw || 100.26)) * 100;
                            return (
                              <tr key={i} style={{ border: 'none' }}>
                                <td style={{ width: 160, color: '#475569', fontWeight: 600, padding: '4px 0 4px 10px', verticalAlign: 'middle', whiteSpace: 'nowrap', border: 'none' }}>
                                  {eq.name}
                                </td>
                                <td style={{ padding: '4px 10px', verticalAlign: 'middle', border: 'none' }}>
                                  <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', width: '100%' }}>
                                    <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, #008299, #00c2cb)', borderRadius: 3 }} />
                                  </div>
                                </td>
                                <td style={{ width: 75, textAlign: 'right', fontWeight: 700, color: '#1e293b', padding: '4px 10px 4px 0', verticalAlign: 'middle', whiteSpace: 'nowrap', border: 'none' }}>
                                  {eq.kw.toFixed(2)} kW
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: 5 }}>
                      <span style={{ fontSize: 10, fontWeight: 900, color: '#0f766e', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>DICTAMEN TÉCNICO AUTOMÁTICO</span>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {conclusions.map((c, i) => (
                          <div key={i} style={{ fontSize: 11, lineHeight: 1.5, fontWeight: 600, color: '#334155' }}>
                            <span style={{ color: '#00c2cb', fontWeight: 900, marginRight: 6 }}>▪</span>{c.text}
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
                  <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {renderPageHeader(`3. ${inputs.technicalSheetName}`, 'Desglose detallado de especificaciones, capacidades y componentes de fabricación')}

                    <div style={{ width: '100%', flex: 1 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                        <thead>
                          <tr>
                            <th style={{ ...REPORT_STYLES.th, background: '#edfbfd' }}>Componente / Característica</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#edfbfd', textAlign: 'center' }}>Especificación Original</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#edfbfd', textAlign: 'right' }}>Detalle Técnico</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { comp: 'Modelo del Equipo', spec: 'WM-500', detail: 'Trituradora Industrial de Madera' },
                            { comp: 'Aplicación Operativa', spec: 'Madera, tarimas, clavos, grapas, tornillos', detail: 'Separación magnética automática' },
                            { comp: 'Capacidad Nominal', spec: '4,000 kg/h', detail: 'Sujeta a OEE y factor de reducción' },
                            { comp: 'Motorización Principal', spec: '120 hp Siemens', detail: 'Alta eficiencia clase IE3' },
                            { comp: 'Motorización Auxiliar', spec: '10 hp Siemens', detail: 'Sistemas auxiliares e hidráulicos' },
                            { comp: 'Potencia Instalada Total', spec: `${results.totalHp} hp`, detail: `${results.installedPowerKw.toFixed(2)} kW` },
                            { comp: 'Dimensiones Bandas', spec: 'Entrada: 4,000 mm | Salida: 3,000 mm', detail: 'Diseño continuo de banda reforzada' },
                            { comp: 'Boca de Alimentación', spec: '1,300 x 300 mm', detail: 'Apertura de seguridad' },
                            { comp: 'Rotación del Rotor', spec: '650 rpm', detail: 'Eje balanceado dinámicamente' },
                            { comp: 'Tamaño de Partícula Final', spec: '2 - 3 cm', detail: 'Ideal para reciclaje o briquetas' },
                            { comp: 'Separación Metálica', spec: 'Separador magnético incluido', detail: 'Imán sobrebanda autolimpiable' },
                            { comp: 'Dimensiones Físicas', spec: `Largo: ${inputs.machineLength} m | Ancho: ${inputs.machineWidth} m | Alto: ${inputs.machineHeight} m`, detail: `Footprint: ${(inputs.machineLength * inputs.machineWidth).toFixed(2)} m²` },
                            { comp: 'Peso Total Equipo', spec: '13,000 kg', detail: 'Anclaje antivibraciones' },
                            { comp: 'Componentes Eléctricos', spec: 'Schneider Electric', detail: 'Gabinete de control integrado' },
                            { comp: 'Nivel de Ruido', spec: '80 dB', detail: 'Diseño aislante de vibraciones' },
                          ].map((t, idx) => (
                            <tr key={idx}>
                              <td style={REPORT_STYLES.td}>{t.comp}</td>
                              <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#008299' }}>{t.spec}</td>
                              <td style={{ ...REPORT_STYLES.td, textAlign: 'right' }}>{t.detail}</td>
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
                    {renderPageHeader('4. FLUJO DEL PROCESO', 'Esquema secuencial de la línea de trituración y separación de partículas')}

                    <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <div style={{ display: 'flex', gap: '16px', justifyContent: 'space-between', width: '100%' }}>
                        {[
                          { num: '01', step: 'ETAPA A', sub: 'FEED_01', title: 'ALIMENTACIÓN', desc: 'Carga continua de madera o tarimas en la banda de entrada.', footer: 'BANDA: 4.0 m', hex: '#14b8a6' },
                          { num: '02', step: 'ETAPA B', sub: 'INLET_02', title: 'ENTRADA ROTOR', desc: 'Los rodillos conducen y dosifican el material hacia la cámara.', footer: 'INGRESO CONTROLADO', hex: '#3b82f6' },
                          { num: '03', step: 'ETAPA C', sub: 'SHRED_03', title: 'TRITURACIÓN', desc: 'Cuchillas tipo martillo reducen la madera de forma continua.', footer: 'ROTOR: 650 rpm', hex: '#f59e0b' },
                          { num: '04', step: 'ETAPA D', sub: 'MAG_SEP_04', title: 'SEP. MAGNÉTICA', desc: 'Retiro de clavos, grapas y tornillos del material triturado.', footer: 'METAL: REMOVIDO', hex: '#8b5cf6' },
                          { num: '05', step: 'ETAPA E', sub: 'OUTFEED_05', title: 'DESCARGA', desc: 'Evacuación continua del material limpio por la banda de salida.', footer: 'BANDA: 3.0 m', hex: '#10b981' },
                          { num: '06', step: 'ETAPA F', sub: 'OUTPUT_06', title: 'PRODUCTO FINAL', desc: 'Partículas de madera homogéneas, listas para valorización.', footer: 'SALIDA: 2-3 cm', hex: '#f43f5e' },
                        ].map((f, i) => (
                          <div key={i} style={{ flex: 1, background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative', minHeight: '300px' }}>
                            <div style={{ height: '6px', width: '100%', backgroundColor: f.hex }} />
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
                              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '20px' }}>
                                <div style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 900, color: 'white', backgroundColor: f.hex }}>
                                  {f.num}
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: f.hex }}>{f.step}</span>
                                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>{f.sub}</span>
                                </div>
                              </div>
                              <h4 style={{ fontSize: '14px', fontWeight: 900, color: '#1e293b', textTransform: 'uppercase', marginBottom: '12px', lineHeight: 1.2 }}>{f.title}</h4>
                              <p style={{ fontSize: '11.5px', color: '#64748b', fontWeight: 500, lineHeight: 1.5, flex: 1 }}>{f.desc}</p>
                              
                              <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <span style={{ fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '1px', color: f.hex }}>{f.footer}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                  </div>
                </div>
                )}

                {/* PÁGINA 5: ENERGÍA Y CAPACIDAD */}
                {pdfConfig.energia && (
                <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                  <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {renderPageHeader(`5. ${inputs.energySectionTitle || 'Energía & Capacidad'}`, 'Desglose energético operativo y comparativa de producción real vs consumo en kWh')}

                    <div style={{ width: '100%', flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
                      
                      {/* KPIs de Energía */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                        {[
                          { title: 'Potencia Instalada Total', val: `${(inputs.customInstalledPowerKw !== undefined ? inputs.customInstalledPowerKw : results.installedPowerKw).toFixed(2)} kW`, sub: `${results.totalHp} hp equivalentes` },
                          { title: 'Consumo Promedio Hora', val: `${results.averageHourlyConsumptionKw.toFixed(2)} kWh`, sub: `Factor de Carga: ${inputs.loadFactor}%` },
                          { title: 'Costo Eléctrico Hora', val: `$${results.hourlyElectricityCostMxn.toFixed(2)} MXN`, sub: `Tarifa: $${inputs.electricityRate}/kWh` },
                          { title: 'Consumo Específico', val: `${results.kwhPerTon.toFixed(1)} kWh/ton`, sub: 'Relación energía-producción' },
                          { title: 'Costo por Tonelada', val: `$${results.electricityCostPerTonMxn.toFixed(2)} MXN`, sub: 'Costo operativo directo' },
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
                                  { name: 'Requerimiento', valor: inputs.dailyGoalKg, fill: '#64748b' },
                                  { name: 'Capacidad', valor: results.dailyProductionKg, fill: '#06b6d4' }
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
                            Margen operativo disponible: <span style={{ color: '#008299' }}>{new Intl.NumberFormat().format(Math.max(0, results.dailyProductionKg - inputs.dailyGoalKg).toFixed(0))} kg/día</span>
                          </div>
                        </div>

                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase', marginBottom: 4 }}>Producción vs Consumo Energético</div>
                          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                              <thead>
                                <tr>
                                  <th style={{ ...REPORT_STYLES.th, background: '#f8fafc', textAlign: 'left' }}>Período</th>
                                  <th style={{ ...REPORT_STYLES.th, background: '#ecfeff', textAlign: 'right', color: '#0e7490' }}>Producción (Ton)</th>
                                  <th style={{ ...REPORT_STYLES.th, background: '#eef2ff', textAlign: 'right', color: '#4338ca' }}>Consumo (kWh)</th>
                                  <th style={{ ...REPORT_STYLES.th, background: '#ecfdf5', textAlign: 'right', color: '#047857' }}>Ratio (kWh/Ton)</th>
                                </tr>
                              </thead>
                              <tbody>
                                {[
                                  { period: 'Por Hora', prod: results.productionPerHourTon || 0, cons: results.averageHourlyConsumptionKw || 0 },
                                  { period: 'Por Día', prod: results.dailyProductionTon || 0, cons: (results.averageHourlyConsumptionKw || 0) * (inputs.hoursPerDay || 20) },
                                  { period: 'Por Semana', prod: (results.dailyProductionTon || 0) * 7, cons: (results.averageHourlyConsumptionKw || 0) * (inputs.hoursPerDay || 20) * 7 },
                                  { period: 'Por Mes', prod: results.monthlyProductionTon || 0, cons: (results.averageHourlyConsumptionKw || 0) * (inputs.hoursPerDay || 20) * (inputs.daysPerMonth || 24) }
                                ].map((row, idx) => (
                                  <tr key={idx}>
                                    <td style={{ ...REPORT_STYLES.td, fontWeight: 'bold' }}>{row.period}</td>
                                    <td style={{ ...REPORT_STYLES.td, textAlign: 'right', fontWeight: 'bold', color: '#0891b2' }}>{new Intl.NumberFormat().format((row.prod).toFixed(2))}</td>
                                    <td style={{ ...REPORT_STYLES.td, textAlign: 'right', fontWeight: 'bold', color: '#4f46e5' }}>{new Intl.NumberFormat().format((row.cons).toFixed(1))}</td>
                                    <td style={{ ...REPORT_STYLES.td, textAlign: 'right', fontWeight: 'bold', color: '#059669' }}>{new Intl.NumberFormat().format((row.prod > 0 ? (row.cons / row.prod) : 0).toFixed(2))}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>

                    {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                  </div>
                </div>
                )}

                {/* PÁGINA 5: ESCENARIOS OPERATIVOS */}
                {pdfConfig.escenarios && (
                <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                  <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {renderPageHeader('Simulación de Escenarios', 'Comparativa de rendimiento bajo diferentes métricas de eficiencia (OEE)')}

                    <div style={{ width: '100%', flex: 1 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11.5 }}>
                        <thead>
                          <tr>
                            <th style={{ ...REPORT_STYLES.th, background: '#edfbfd' }}>Métrica de Evaluación</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#edfbfd', textAlign: 'center' }}>Conservador (70% OEE)</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#edfbfd', textAlign: 'center' }}>Normal (85% OEE)</th>
                            <th style={{ ...REPORT_STYLES.th, background: '#edfbfd', textAlign: 'center', color: '#0d9488' }}>Alto Rendimiento (95% OEE)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td style={REPORT_STYLES.td}>Producción Diaria Proyectada</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{scenarioResults.conservador.dailyProdTon.toFixed(2)} ton/día</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{scenarioResults.normal.dailyProdTon.toFixed(2)} ton/día</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#0f766e', fontWeight: 800 }}>{scenarioResults.alto.dailyProdTon.toFixed(2)} ton/día</td>
                          </tr>
                          <tr>
                            <td style={REPORT_STYLES.td}>Costo Operativo (Eléctrico) por Tonelada</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>${scenarioResults.conservador.costPerTon.toFixed(2)} MXN</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>${scenarioResults.normal.costPerTon.toFixed(2)} MXN</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#0f766e', fontWeight: 800 }}>${scenarioResults.alto.costPerTon.toFixed(2)} MXN</td>
                          </tr>
                          <tr>
                            <td style={REPORT_STYLES.td}>Cobertura de la Meta Diaria Objetivo</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{scenarioResults.conservador.coverage.toFixed(1)}%</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{scenarioResults.normal.coverage.toFixed(1)}%</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#0f766e', fontWeight: 800 }}>{scenarioResults.alto.coverage.toFixed(1)}%</td>
                          </tr>
                          <tr>
                            <td style={REPORT_STYLES.td}>Utilización de la Capacidad de Planta</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{(scenarioResults.conservador.utilization * 100).toFixed(1)}%</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{(scenarioResults.normal.utilization * 100).toFixed(1)}%</td>
                            <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#0f766e', fontWeight: 800 }}>{(scenarioResults.alto.utilization * 100).toFixed(1)}%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, fontSize: 11.5, color: '#475569', lineHeight: 1.4 }}>
                      <strong>Nota del Analista:</strong> Las proyecciones mostradas asumen un flujo constante de material de alimentación y no consideran variaciones drásticas en la humedad o densidad del sustrato.
                    </div>

                    <div style={{ flex: 1 }} />
                    {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                  </div>
                </div>
                )}

                {/* PÁGINA 7: DICTAMEN FINANCIERO */}
                {(pdfConfig.financiero || pdfConfig.capex || pdfConfig.riesgos) && (
                <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                      <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {renderPageHeader('7. Dictamen Financiero', 'Análisis Ejecutivo de Viabilidad Económica (CAPEX/OPEX)')}
                        
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                          
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                              <div style={{ fontSize: 10, fontWeight: 900, color: '#0ea5e9', textTransform: 'uppercase', marginBottom: 4 }}>Estructura CAPEX (Inversión Inicial)</div>
                              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f2038', marginBottom: 4 }}>${new Intl.NumberFormat().format(results.capexInstaladoMxn.toFixed(0))} MXN</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, color: '#475569', fontWeight: 600 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Equipo Base</span><span>${new Intl.NumberFormat().format((results.precioEquipoUsd * (inputs.tipoCambio || 1)).toFixed(0))}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Montaje y Maniobras</span><span>${new Intl.NumberFormat().format(((results.maniobrasUsd + results.montajeMecanicoUsd) * (inputs.tipoCambio || 1)).toFixed(0))}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Instalación Eléctrica</span><span>${new Intl.NumberFormat().format(((results.electricoPrincipalUsd + results.canalizacionProteccionesUsd) * (inputs.tipoCambio || 1)).toFixed(0))}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Sistemas de Seguridad</span><span>${new Intl.NumberFormat().format(((results.extraccionPolvoUsd + results.seguridadIndustrialUsd) * (inputs.tipoCambio || 1)).toFixed(0))}</span></div>
                              </div>
                            </div>

                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                              <div style={{ fontSize: 10, fontWeight: 900, color: '#e11d48', textTransform: 'uppercase', marginBottom: 4 }}>Estructura OPEX (Gasto Mensual)</div>
                              <div style={{ fontSize: 24, fontWeight: 900, color: '#0f2038', marginBottom: 4 }}>${new Intl.NumberFormat().format(results.opexMensualMxn.toFixed(0))} MXN</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 10, color: '#475569', fontWeight: 600 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Energía Eléctrica</span><span>${new Intl.NumberFormat().format(results.monthlyElectricityCostMxn.toFixed(0))}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Mano de Obra</span><span>${new Intl.NumberFormat().format(results.manoObraMensualMxn.toFixed(0))}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Mantenimiento Preventivo</span><span>${new Intl.NumberFormat().format(results.mantenimientoMensualMxn.toFixed(0))}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Refacciones / Consumibles</span><span>${new Intl.NumberFormat().format((inputs.cuchillasMensualMxn + inputs.refaccionesMensualMxn + inputs.lubricacionMensualMxn).toFixed(0))}</span></div>
                              </div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                              <div style={{ fontSize: 10, fontWeight: 900, color: '#7c3aed', textTransform: 'uppercase', marginBottom: 4 }}>Viabilidad y Retorno de Inversión</div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Flujo Operativo Mensual</div>
                                  <div style={{ fontSize: 16, fontWeight: 900, color: '#0f2038' }}>${new Intl.NumberFormat().format(results.flujoOperativoMensual.toFixed(0))}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Estado de Viabilidad</div>
                                  <div style={{ fontSize: 14, fontWeight: 900, color: '#7c3aed' }}>{results.estadoFinanciero}</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Retorno de Inversión (ROI)</div>
                                  <div style={{ fontSize: 16, fontWeight: 900, color: '#0f2038' }}>{results.roiAnual.toFixed(1)}% Anual</div>
                                </div>
                                <div>
                                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>Período Payback</div>
                                  <div style={{ fontSize: 16, fontWeight: 900, color: '#0f2038' }}>{results.paybackMeses === Infinity ? 'N/A' : `${results.paybackMeses.toFixed(1)} Meses`}</div>
                                </div>
                              </div>
                            </div>

                            <div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>
                              <div style={{ fontSize: 10, fontWeight: 900, color: '#ea580c', textTransform: 'uppercase', marginBottom: 4 }}>Matriz de Riesgo y Operación</div>
                              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 10, color: '#475569', fontWeight: 600 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e2e8f0' }}><span>Exposición a Polvo:</span> <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>{inputs.riesgoPolvo}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #e2e8f0' }}><span>Riesgo de Incendio:</span> <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>{inputs.riesgoIncendio}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>Riesgo Metálico:</span> <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>{inputs.riesgoMetal}</span></div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}><span>Contaminación Acústica:</span> <span style={{ textTransform: 'uppercase', fontWeight: 800 }}>{inputs.riesgoRuido}</span></div>
                              </div>
                            </div>
                          </div>
                        </div>
                        {/* GRÁFICO OPEX INYECTADO */}
                        <div style={{ marginTop: 12, border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px', background: '#fff', display: 'flex', alignItems: 'center', gap: 20 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 900, color: '#0f2038', textTransform: 'uppercase', marginBottom: 4 }}>Distribución de Costo Operativo (OPEX)</div>
                            <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>El gráfico circular detalla la proporción de gastos operativos mensuales. La optimización de la matriz energética y los mantenimientos preventivos son la clave para maximizar el flujo operativo y acelerar el retorno de inversión.</div>
                          </div>
                          <div style={{ width: 300, height: 140 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'Energía', value: results.monthlyElectricityCostMxn, fill: '#0ea5e9' },
                                    { name: 'Mano de Obra', value: results.manoObraMensualMxn, fill: '#8b5cf6' },
                                    { name: 'Mantenimiento', value: results.mantenimientoMensualMxn, fill: '#f59e0b' },
                                    { name: 'Consumibles', value: inputs.cuchillasMensualMxn + inputs.refaccionesMensualMxn + inputs.lubricacionMensualMxn, fill: '#10b981' }
                                  ].filter(d => d.value > 0)}
                                  cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value"
                                >
                                  {[{fill: '#0ea5e9'}, {fill: '#8b5cf6'}, {fill: '#f59e0b'}, {fill: '#10b981'}].map((e,i) => <Cell key={i} fill={e.fill} />)}
                                </Pie>
                                <Tooltip formatter={(value) => "$" + new Intl.NumberFormat().format(value.toFixed(0))} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 10 }} iconType="circle" iconSize={6} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>


                      </div>

                      {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                    </div>
                )}

                {/* PÁGINA 8+: GEMELO DIGITAL 3D */}
                {pdfConfig.twin && snapshotPages.map((page, index) => (
                  <div key={index} className="pdf-page bg-white relative flex flex-col" style={S.page}>
                    <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {renderPageHeader(`${index + (pdfConfig.financiero ? 8 : 7)}. Vista ${page.type.charAt(0).toUpperCase() + page.type.slice(1)}`, 'Renderizado CAD de alta resolución del equipo en configuración de planta')}
                      
                      <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 16, background: '#edf4f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={page.src} alt={page.type} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'darken', objectPosition: 'center' }} className="animate-fade-in" />
                      </div>

                      <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: 12, padding: 16, fontSize: 10, lineHeight: 1.5, color: '#334155', fontWeight: 600 }}>
                        <span style={{ color: '#0f766e', fontWeight: 900, textTransform: 'uppercase', marginRight: 6 }}>Nota de Escala Visual ({page.type}): </span>
                        Esta proyección tridimensional corresponde a la captura exacta de la Trituradora WM-500 evaluada bajo la perspectiva {page.type.toLowerCase()}. Las proporciones y el diseño representan el volumen real del equipo industrial proyectado en el software PANDORA 3.0.
                      </div>
                      
                      {renderPageFooter(++pdfPageIndex, totalPdfPages)}
                    </div>
                  </div>
                ))}

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
                placeholder="Ej: Planta de Triturado Norte"
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
