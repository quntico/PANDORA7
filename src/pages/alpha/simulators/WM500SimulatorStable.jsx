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
  Legend, ResponsiveContainer, Cell, AreaChart, Area, LineChart, Line
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

export default function WM500SimulatorStable() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeProject, updateProjectName } = useBeta();
  const reportRef = useRef(null);

  // --- 1. ESTADO DE ENTRADAS ---
  const defaultInputs = {
    companyName: 'MÁQUINA EN EVALUACIÓN - WM-500',
    clientName: 'CENTRAL DE INTELIGENCIA',
    machineName: 'WM-500',
    projectName: 'SIMULADOR PARAMÉTRICO WM-500',
    evaluationName: 'Trituradora para Maderas y Tarimas',
    
    // Variables editables por el usuario
    hoursPerShift: 8,
    shiftsPerDay: 2,
    daysPerWeek: 6,
    daysPerMonth: 24,
    loadFactor: 85,          // %
    oee: 85,                 // %
    electricityRate: 2.50,   // MXN/kWh
    materialDensity: 250,    // kg/m³
    averageLoadWeight: 25,   // kg por tarima o carga
    dailyGoalKg: 30000,      // kg/día
    monthlyGoalTon: 720,     // ton/mes
    materialHumidity: 15,    // %
    materialType: 'tarima_pesada', // Tipo de material
    reductionFactor: 90,     // Factor de reducción (%)
    technicalSheetName: 'Ficha Técnica de Homologación WM-500',
    energySectionTitle: 'Desglose Energético Operativo',
    customInstalledPowerKw: 96.98,
    nominalCapacity: 4000,   // kg/h base de fábrica
    capacityCardTitle: 'Capacidad Real Ajustada',
    machineLength: 14.50,
    machineWidth: 1.75,
    machineHeight: 1.90,
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

  // --- ESTADOS LOCALES DE INTERFAZ ---
  const [activeTab, setActiveTab] = useState('resumen');
  const [isPlaying, setIsPlaying] = useState(true);
  const [activeHotspot, setActiveHotspot] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [currentScenario, setCurrentScenario] = useState('normal'); // 'conservador' | 'normal' | 'alto'

  // --- ESTADOS DEL GEMELO DIGITAL 3D ---
  const [is3DView, setIs3DView] = useState(false);
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
        if (data && data.value) {
          const cloudData = JSON.parse(data.value);
          console.log("[WM500Simulator] Re-hydrating state from Supabase:", cloudData);

          // Re-hidratar inputs
          if (cloudData.inputs) {
            setInputs(prev => ({ ...prev, ...cloudData.inputs }));
          }

          // Re-hidratar diseño 3D
          if (cloudData.twinLayout) {
            if (cloudData.twinLayout.url && cloudData.twinLayout.url.startsWith('blob:')) {
              console.warn("[WM500Simulator] Ignorando URL blob temporal proveniente de la nube. IndexedDB la manejará localmente.");
            } else {
              setTwinLayout(cloudData.twinLayout);
            }
          }
          if (cloudData.currentDesignId) {
            setCurrentDesignId(cloudData.currentDesignId);
          }
          if (cloudData.twinNodePositions) {
            setTwinNodePositions(cloudData.twinNodePositions);
          }
        }
      } catch (err) {
        console.error("[WM500Simulator] Error loading from cloud:", err);
      }
    };

    loadSimulatorDataFromCloud();
  }, [activeProject?.id]);

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
    const nominalCapacity = inputs.nominalCapacity !== undefined ? inputs.nominalCapacity : 4000; // kg/h
    const kwPerHp = 0.746;
    
    // Potencia instalada total en kW
    const installedPowerKw = inputs.customInstalledPowerKw !== undefined ? parseFloat(inputs.customInstalledPowerKw) || 0 : 96.98;
    const totalHp = Math.round(installedPowerKw / kwPerHp); // 130 HP aprox

    
    // Consumo promedio por hora
    const averageHourlyConsumptionKw = installedPowerKw * (inputs.loadFactor / 100);
    
    // Producción real por hora = nominal x OEE x factor de reducción
    const realProductionPerHourKg = nominalCapacity * (inputs.oee / 100) * (inputs.reductionFactor / 100);
    
    // Horas disponibles por día
    const hoursPerDay = inputs.hoursPerShift * inputs.shiftsPerDay;
    
    // Producciones
    const dailyProductionKg = realProductionPerHourKg * hoursPerDay;
    const weeklyProductionKg = dailyProductionKg * inputs.daysPerWeek;
    const monthlyProductionKg = dailyProductionKg * inputs.daysPerMonth;
    const annualProductionKg = monthlyProductionKg * 12;

    // Costos eléctricos (MXN)
    const hourlyElectricityCostMxn = averageHourlyConsumptionKw * inputs.electricityRate;
    const dailyElectricityCostMxn = hourlyElectricityCostMxn * hoursPerDay;
    const monthlyElectricityCostMxn = dailyElectricityCostMxn * inputs.daysPerMonth;

    // kWh y costo por tonelada procesada
    const productionPerHourTon = realProductionPerHourKg / 1000;
    const kwhPerTon = productionPerHourTon > 0 ? (averageHourlyConsumptionKw / productionPerHourTon) : 0;
    const electricityCostPerTonMxn = kwhPerTon * inputs.electricityRate;

    // Utilización del sistema = requerimiento diario / capacidad diaria real
    // (Requerimiento diario objetivo en kg)
    const systemUtilization = dailyProductionKg > 0 ? (inputs.dailyGoalKg / dailyProductionKg) : 0;
    
    // Cobertura del requerimiento = capacidad diaria real / requerimiento diario (%)
    const requirementCoverage = inputs.dailyGoalKg > 0 ? (dailyProductionKg / inputs.dailyGoalKg) * 100 : 0;
    
    // Reserva operativa
    const operationalReserve = Math.max(0, 100 - (systemUtilization * 100));

    // Número de máquinas requeridas (redondeado hacia arriba)
    const machinesRequired = dailyProductionKg > 0 ? Math.ceil(inputs.dailyGoalKg / dailyProductionKg) : 1;

    // Viabilidad / Estado
    let viabilityState = "VIABLE";
    let viabilityColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
    if (systemUtilization > 0.95) {
      if (machinesRequired >= 2) {
        viabilityState = `REQUIERE ${machinesRequired} MÁQUINAS`;
        viabilityColor = "text-red-700 bg-red-50 border-red-200";
      } else {
        viabilityState = "SATURADO";
        viabilityColor = "text-amber-600 bg-amber-50 border-amber-200";
      }
    }

    return {
      installedPowerKw,
      averageHourlyConsumptionKw,
      realProductionPerHourKg,
      hoursPerDay,
      dailyProductionKg,
      weeklyProductionKg,
      monthlyProductionKg,
      annualProductionKg,
      hourlyElectricityCostMxn,
      dailyElectricityCostMxn,
      monthlyElectricityCostMxn,
      kwhPerTon,
      electricityCostPerTonMxn,
      systemUtilization,
      requirementCoverage,
      operationalReserve,
      machinesRequired,
      viabilityState,
      viabilityColor,
      totalHp
    };
  }, [inputs]);

  // Escenarios
  const scenarioResults = useMemo(() => {
    const calcScenario = (oeeValue) => {
      const nominalCapacity = inputs.nominalCapacity !== undefined ? inputs.nominalCapacity : 4000;
      const realProd = nominalCapacity * (oeeValue / 100) * (inputs.reductionFactor / 100);
      const hoursPerDay = inputs.hoursPerShift * inputs.shiftsPerDay;
      const dailyProd = realProd * hoursPerDay;
      const utilization = dailyProd > 0 ? (inputs.dailyGoalKg / dailyProd) : 0;
      const coverage = inputs.dailyGoalKg > 0 ? (dailyProd / inputs.dailyGoalKg) * 100 : 0;
      
      const totalHp = 130;
      const installedPowerKw = totalHp * 0.746;
      const averageHourlyConsumptionKw = installedPowerKw * (inputs.loadFactor / 100);
      const kwhPerTon = (realProd / 1000) > 0 ? (averageHourlyConsumptionKw / (realProd / 1000)) : 0;
      const costPerTon = kwhPerTon * inputs.electricityRate;

      return {
        oee: oeeValue,
        realProd,
        dailyProdTon: dailyProd / 1000,
        costPerTon,
        coverage,
        utilization
      };
    };

    return {
      conservador: calcScenario(70),
      normal: calcScenario(85),
      alto: calcScenario(95)
    };
  }, [inputs]);

  // Sincronizar OEE de entradas al cambiar de escenario (para simular de forma rápida)
  const applyScenario = (type) => {
    setCurrentScenario(type);
    let oeeVal = 85;
    if (type === 'conservador') oeeVal = 70;
    if (type === 'alto') oeeVal = 95;
    setInputs(prev => ({ ...prev, oee: oeeVal }));
    
    setToastMessage(`Escenario [${type.toUpperCase()}] aplicado (OEE fijado en ${oeeVal}%)`);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  // --- 3. PERSISTENCIA DE DATOS EN SUPABASE ---
  const handleSaveSimulator = async () => {
    localStorage.setItem('sim_wm500_inputs', JSON.stringify(inputs));
    
    if (activeProject && activeProject.id && activeProject.id !== 'local-fallback-id') {
      try {
        const payload = {
          project_id: activeProject.id,
          key: 'sim_wm500_data',
          value: JSON.stringify({
            inputs,
            twinLayout,
            currentDesignId,
            twinNodePositions,
            results,
            timestamp: Date.now()
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
    const defaultName = `INFORME_TECNICO_WM-500_${inputs.clientName.replace(/\s+/g, '_')}`;
    const fileName = window.prompt('Ingrese el nombre del archivo a exportar (PDF):', defaultName);
    
    if (!fileName) return; // Cancelado por el usuario
    
    setIsGeneratingPdf(true);
    setPdfProgress(15);
    
    const suffix = activeProject?.id ? `${activeProject.id}_` : '';
    setTwinSnapshot(localStorage.getItem(`sim_wm500_${suffix}twin_snapshot_base64`));
    setTwinSnapshotLateral(localStorage.getItem(`sim_wm500_${suffix}twin_snapshot_lateral`));
    setTwinSnapshotSuperior(localStorage.getItem(`sim_wm500_${suffix}twin_snapshot_superior`));
    setTwinSnapshotIsometrica(localStorage.getItem(`sim_wm500_${suffix}twin_snapshot_isometrica`));
    
    try {
      setIsPreviewMode(false);
      setIsReportModalOpen(true);
      await new Promise(resolve => setTimeout(resolve, 800)); // Esperar carga
      
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
      doc.save(`${fileName.endsWith('.pdf') ? fileName : fileName + '.pdf'}`);
    } catch (err) {
      console.error(err);
      alert('Error al generar PDF: ' + err.message);
    } finally {
      setIsGeneratingPdf(false);
      setIsReportModalOpen(false);
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
  const hotspots = {
    entrada: { title: "Banda alimentadora de entrada", desc: "Longitud de 4,000 mm. Diseñada para alimentación continua de madera, tarimas completas y residuos industriales." },
    camara: { title: "Cámara de trituración", desc: "Boca de entrada de 1,300 x 300 mm. Estructura de alta resistencia con rodillos de alimentación forzada." },
    rotor: { title: "Rotor con cuchillas tipo martillo", desc: "Gira a 650 rpm. Equipado con cuchillas templadas capaces de triturar clavos, grapas y tornillos de madera estructural." },
    hidraulico: { title: "Sistema hidráulico de apertura", desc: "Facilita la apertura de la cámara de trituración para labores de mantenimiento, cambio de cuchillas y limpieza rápida." },
    separador: { title: "Separador magnético de banda", desc: "Incluido de fábrica. Imán permanente sobre la banda de salida que extrae metales ferrosos de forma automática." },
    salida: { title: "Banda de salida", desc: "Longitud de 3,000 mm. Transporta el material triturado y limpio hacia la tolva o zona de acopio." },
    motor_p: { title: "Motor Principal Siemens", desc: "Potencia de 120 hp. Altamente eficiente, con control de torque para sobrecargas súbitas durante la trituración." },
    motor_a: { title: "Motor Auxiliar Siemens", desc: "Potencia de 10 hp. Encargado de sistemas hidráulicos, alimentadores y bandas." },
    estructura: { title: "Estructura Robusta", desc: "Chasis de acero soldado de alta densidad. Peso total de la máquina: 13,000 kg para absorber vibraciones." }
  };

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
      const prodTon = (results.monthlyProductionKg / 1000) * factor;
      const energyMxn = results.monthlyElectricityCostMxn * factor;
      const kwhMonth = (results.averageHourlyConsumptionKw * results.hoursPerDay * inputs.daysPerMonth) * factor;
      return {
        name: m,
        Produccion: parseFloat(prodTon.toFixed(1)),
        CostoEnergia: parseFloat(energyMxn.toFixed(0)),
        ConsumoKwh: parseFloat(kwhMonth.toFixed(0)),
        Meta: inputs.monthlyGoalTon
      };
    });
  }, [results, inputs.monthlyGoalTon]);

  const hasAnySnapshot = !!(twinSnapshot || twinSnapshotLateral || twinSnapshotSuperior || twinSnapshotIsometrica);
  
  const snapshotPages = [];
  if (twinSnapshotIsometrica) snapshotPages.push({ title: 'PERSPECTIVA ISOMÉTRICA', type: 'Isométrica', src: twinSnapshotIsometrica });
  if (twinSnapshotSuperior) snapshotPages.push({ title: 'PLANTA ARQUITECTÓNICA', type: 'Superior', src: twinSnapshotSuperior });
  if (twinSnapshotLateral) snapshotPages.push({ title: 'ELEVACIÓN LATERAL', type: 'Lateral', src: twinSnapshotLateral });
  if (snapshotPages.length === 0 && twinSnapshot) snapshotPages.push({ title: 'PERSPECTIVA GENERAL', type: 'Libre', src: twinSnapshot });
  
  const totalPdfPages = 4 + snapshotPages.length;

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
    th: { padding: '8px 12px', fontSize: 9, fontWeight: 900, color: '#008299', textTransform: 'uppercase', letterSpacing: 1, borderBottom: '2px solid #b2f5ea', borderTop: '2px solid #b2f5ea', textAlign: 'left' },
    td: { padding: '12px 12px', borderBottom: '1px solid #e2e8f0', color: '#334155', fontWeight: 600 }
  };

  const getSplitTitle = (title) => {
    const cleanTitle = title.toUpperCase();
    const extractNum = (str) => { const match = str.match(/^(\d+)\.\s+/); return match ? match[1] + '. ' : ''; };
    const num = extractNum(title);

    if (cleanTitle.includes('ESPECIFICACIONES TÉCNICAS')) return { line1: num + 'ESPECIFICACIONES TÉCNICAS', line2: 'Y DESGLOSE DE EQUIPOS' };
    if (cleanTitle.includes('VISTA')) return { line1: num + 'GEMELO DIGITAL 3D', line2: cleanTitle.replace(num, '') };
    return { line1: cleanTitle, line2: '' };
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

          <div className="space-y-5 overflow-y-auto max-h-[75vh] pr-1">
            
            {/* Metadatos del Proyecto */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
              <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-2">Metadatos del Proyecto</label>
              
              <div className="grid grid-cols-1 gap-2">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Empresa</span>
                  <input type="text" value={inputs.companyName || ''} onChange={e => setInputs(p => ({...p, companyName: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Cliente</span>
                  <input type="text" value={inputs.clientName || ''} onChange={e => setInputs(p => ({...p, clientName: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Máquina</span>
                  <input type="text" value={inputs.machineName || ''} onChange={e => setInputs(p => ({...p, machineName: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Proyecto</span>
                  <input type="text" value={inputs.projectName || ''} onChange={e => setInputs(p => ({...p, projectName: e.target.value}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />
                </div>
              </div>
            </div>

            {/* OEE / Eficiencia operativa */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Eficiencia Operativa / OEE (%)</label>
                <span className="text-xs font-black text-cyan-600">{inputs.oee}%</span>
              </div>
              <input 
                type="range" min="40" max="100" step="1"
                value={inputs.oee}
                onChange={e => setInputs(p => ({ ...p, oee: parseInt(e.target.value) }))}
                className="w-full accent-cyan-600"
              />
            </div>

            {/* Factor de carga */}
            <div>
              <div className="flex justify-between mb-1.5">
                <label className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Factor de carga del equipo (%)</label>
                <span className="text-xs font-black text-cyan-600">{inputs.loadFactor}%</span>
              </div>
              <input 
                type="range" min="30" max="100" step="5"
                value={inputs.loadFactor}
                onChange={e => setInputs(p => ({ ...p, loadFactor: parseInt(e.target.value) }))}
                className="w-full accent-cyan-600"
              />
            </div>

            {/* Turnos y horas */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Horas x Turno</label>
                <input 
                  type="number" step="0.5" min="1" max="12"
                  value={inputs.hoursPerShift}
                  onChange={e => setInputs(p => ({ ...p, hoursPerShift: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Turnos x Día</label>
                <input 
                  type="number" min="1" max="3"
                  value={inputs.shiftsPerDay}
                  onChange={e => setInputs(p => ({ ...p, shiftsPerDay: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Días Operación */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Días x Semana</label>
                <input 
                  type="number" min="1" max="7"
                  value={inputs.daysPerWeek}
                  onChange={e => setInputs(p => ({ ...p, daysPerWeek: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Días x Mes</label>
                <input 
                  type="number" min="1" max="31"
                  value={inputs.daysPerMonth}
                  onChange={e => setInputs(p => ({ ...p, daysPerMonth: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Tipo de material */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Tipo de Material</label>
              <select 
                value={inputs.materialType}
                onChange={e => {
                  const val = e.target.value;
                  let redFactor = 90;
                  let density = 250;
                  let avgWeight = 25;
                  if (val === 'tarima_ligera') { redFactor = 95; density = 180; avgWeight = 15; }
                  else if (val === 'tarima_pesada') { redFactor = 90; density = 250; avgWeight = 25; }
                  else if (val === 'madera_mixta') { redFactor = 85; density = 300; avgWeight = 50; }
                  else if (val === 'madera_metal') { redFactor = 75; density = 350; avgWeight = 60; }
                  else if (val === 'residuos_madera') { redFactor = 80; density = 200; avgWeight = 10; }
                  
                  setInputs(p => ({ 
                    ...p, 
                    materialType: val,
                    reductionFactor: redFactor,
                    materialDensity: density,
                    averageLoadWeight: avgWeight
                  }));
                }}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
              >
                <option value="tarima_ligera">Tarima Ligera (~15kg, Limpia)</option>
                <option value="tarima_pesada">Tarima Pesada (~25kg, Clavos/Grapas)</option>
                <option value="madera_mixta">Madera Mixta de Embalaje</option>
                <option value="madera_metal">Madera Estructural con Metal</option>
                <option value="residuos_madera">Residuos Industriales de Madera</option>
              </select>
            </div>

            {/* Factor de reducción y Humedad */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Reducción (%)</label>
                <input 
                  type="number" min="10" max="100"
                  value={inputs.reductionFactor}
                  onChange={e => setInputs(p => ({ ...p, reductionFactor: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                  title="Factor de reducción por suciedad/metal/humedad"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Humedad (%)</label>
                <input 
                  type="number" min="0" max="80"
                  value={inputs.materialHumidity}
                  onChange={e => setInputs(p => ({ ...p, materialHumidity: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Densidad y Peso carga */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Densidad (kg/m³)</label>
                <input 
                  type="number" min="10"
                  value={inputs.materialDensity}
                  onChange={e => setInputs(p => ({ ...p, materialDensity: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Peso Carga (kg)</label>
                <input 
                  type="number" min="1"
                  value={inputs.averageLoadWeight}
                  onChange={e => setInputs(p => ({ ...p, averageLoadWeight: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Tarifa eléctrica */}
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Tarifa Eléctrica (MXN/kWh)</label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-xs font-black text-slate-400">$</span>
                <input 
                  type="number" step="0.05" min="0.1"
                  value={inputs.electricityRate}
                  onChange={e => setInputs(p => ({ ...p, electricityRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Objetivos de requerimiento */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Meta Diaria (kg)</label>
                <input 
                  type="number" step="1000" min="0"
                  value={inputs.dailyGoalKg}
                  onChange={e => setInputs(p => ({ ...p, dailyGoalKg: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-wider mb-1.5">Meta Mensual (ton)</label>
                <input 
                  type="number" step="10" min="0"
                  value={inputs.monthlyGoalTon}
                  onChange={e => setInputs(p => ({ ...p, monthlyGoalTon: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm font-bold text-slate-800 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
            {/* Estudio de Layout */}
            <div className="pt-2 border-t border-slate-100">
              <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-wider mb-2">Estudio de Layout (Metros)</label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5 text-center">Largo</span>
                  <input type="number" step="0.1" value={inputs.machineLength} onChange={e => setInputs(p => ({...p, machineLength: parseFloat(e.target.value) || 0}))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-center" />
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5 text-center">Ancho</span>
                  <input type="number" step="0.1" value={inputs.machineWidth} onChange={e => setInputs(p => ({...p, machineWidth: parseFloat(e.target.value) || 0}))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-center" />
                </div>
                <div>
                  <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5 text-center">Alto</span>
                  <input type="number" step="0.1" value={inputs.machineHeight} onChange={e => setInputs(p => ({...p, machineHeight: parseFloat(e.target.value) || 0}))} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none text-center" />
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* PANEL DERECHO: NAVEGACIÓN Y REPORTES INDUSTRIALES */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* TABS DE SECCIÓN */}
          <div className="flex flex-wrap bg-slate-250 p-1.5 rounded-2xl gap-1">
            {[
              { id: 'resumen', label: '1. Portada Ejecutiva' },
              { id: 'twin', label: '2. Twin Digital & Flujo' },
              { id: 'tabla', label: '3. Datos & Métricas' },
              { id: 'energia', label: '4. Energía & Capacidad' },
              { id: 'escenarios', label: '5. Escenarios' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold uppercase transition-all tracking-wider ${activeTab === t.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
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
                    <h2 className="text-3xl font-black text-white uppercase tracking-tight mt-1">SIMULADOR PARAMÉTRICO WM-500</h2>
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
                        {is3DView 
                          ? `Twin Digital 3D de la Línea (WM-500) ${twinLayout?.name ? `- [${twinLayout.name.toUpperCase()}]` : ''}` 
                          : 'Twin Digital Conceptual WM-500'}
                      </h3>
                      {isProcessingModel && <Loader2 className={`w-3.5 h-3.5 animate-spin ${
                        twinTheme === 'toxic' ? 'text-[#84cc16]' : twinTheme === 'blueprint' ? 'text-cyan-600' : 'text-[#00F0FF]'
                      }`} />}
                    </div>
                    {/* Botones de Selección 2D/3D */}
                    <div className={`flex p-0.5 rounded-xl border gap-0.5 ${
                      twinTheme === 'toxic'
                        ? 'bg-[#18181b] border-[#2c302e]'
                        : twinTheme === 'blueprint'
                          ? 'bg-slate-100 border-slate-200'
                          : 'bg-slate-950/60 border border-slate-850'
                    }`}>
                      <button
                        onClick={() => setIs3DView(false)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                          !is3DView 
                            ? twinTheme === 'toxic'
                              ? 'bg-[#84cc16] text-black font-extrabold shadow-sm'
                              : twinTheme === 'blueprint'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/30'
                            : twinTheme === 'blueprint'
                              ? 'text-slate-500 hover:text-slate-800'
                              : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Vista 2D de Flujo
                      </button>
                      <button
                        onClick={() => setIs3DView(true)}
                        className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all ${
                          is3DView 
                            ? twinTheme === 'toxic'
                              ? 'bg-[#84cc16] text-black font-extrabold shadow-sm'
                              : twinTheme === 'blueprint'
                                ? 'bg-white text-slate-900 shadow-sm'
                                : 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/30'
                            : twinTheme === 'blueprint'
                              ? 'text-slate-500 hover:text-slate-800'
                              : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        Visor 3D CAD
                      </button>
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

                {is3DView ? (
                  /* 3D CAD Twin Viewer Container */
                  <div className={`relative rounded-2xl overflow-hidden border ${twinTheme === 'toxic' ? 'border-[#2c302e] bg-[#0c0d0e]' : twinTheme === 'blueprint' ? 'border-slate-200 bg-[#edf4f9]' : 'border-slate-200 bg-[#05070f]'}`}>
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
                ) : (
                  /* SVG Conceptual Canvas */
                  <div className="relative border border-slate-100 rounded-2xl bg-slate-50 overflow-hidden" style={{ minHeight: '380px' }}>
                    
                    {/* Partículas animadas simuladas por CSS */}
                    {isPlaying && (
                      <div className="absolute inset-0 pointer-events-none overflow-hidden">
                        {/* Partículas en banda de entrada */}
                        <div className="absolute w-2 h-2 rounded bg-amber-800 opacity-60 animate-[wood-feed_3s_infinite_linear]" style={{ left: '15%', top: '65%' }} />
                        <div className="absolute w-2.5 h-2 rounded bg-amber-700 opacity-70 animate-[wood-feed_3s_infinite_linear]" style={{ left: '15%', top: '65%', animationDelay: '1s' }} />
                        <div className="absolute w-2 h-1.5 rounded bg-amber-600 opacity-60 animate-[wood-feed_3s_infinite_linear]" style={{ left: '15%', top: '65%', animationDelay: '2s' }} />
                        
                        {/* Partículas en cámara de trituración */}
                        <div className="absolute w-1 h-1 bg-amber-650 rounded-full animate-ping" style={{ left: '46%', top: '48%' }} />
                        <div className="absolute w-1.5 h-1.5 bg-amber-750 rounded-full animate-ping" style={{ left: '49%', top: '52%', animationDelay: '0.5s' }} />

                        {/* Partículas en banda de salida */}
                        <div className="absolute w-1.5 h-1.5 rounded bg-amber-600 opacity-70 animate-[wood-out_2.5s_infinite_linear]" style={{ left: '55%', top: '75%' }} />
                        <div className="absolute w-1 h-1 rounded bg-amber-700 opacity-80 animate-[wood-out_2.5s_infinite_linear]" style={{ left: '55%', top: '75%', animationDelay: '0.8s' }} />
                        
                        {/* Clavos metálicos atraídos por separador magnético */}
                        <div className="absolute w-1.5 h-1 bg-slate-500 rotate-45 opacity-90 animate-[metal-attract_1.5s_infinite_ease-out]" style={{ left: '68%', top: '75%' }} />
                      </div>
                    )}

                    {/* SVG Blueprint */}
                    <svg viewBox="0 0 800 450" className="w-full h-full select-none">
                      <defs>
                        <linearGradient id="cyan-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#06b6d4" />
                          <stop offset="100%" stopColor="#0891b2" />
                        </linearGradient>
                        <linearGradient id="gray-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#f1f5f9" />
                          <stop offset="100%" stopColor="#cbd5e1" />
                        </linearGradient>
                      </defs>

                      {/* Estructura Base y Chasis (Isométrica) */}
                      <path d="M 280 250 L 520 250 L 520 380 L 280 380 Z" fill="#cbd5e1" stroke="#94a3b8" strokeWidth="2" opacity="0.4" />
                      <path d="M 520 250 L 620 200 L 620 320 L 520 380 Z" fill="#94a3b8" stroke="#64748b" strokeWidth="2" opacity="0.4" />

                      {/* Banda alimentadora de entrada */}
                      <g className="cursor-pointer" onClick={() => setActiveHotspot('entrada')}>
                        <path d="M 50 320 L 320 220 L 320 240 L 50 340 Z" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
                        <line x1="60" y1="325" x2="310" y2="230" stroke="#00f0ff" strokeWidth="1" strokeDasharray="5,5" />
                        <text x="90" y="300" fill="#475569" className="text-[10px] font-black uppercase font-mono">Banda de Entrada</text>
                      </g>

                      {/* Cámara de Trituración */}
                      <g className="cursor-pointer" onClick={() => setActiveHotspot('camara')}>
                        <rect x="300" y="140" width="160" height="130" rx="10" fill="#f8fafc" stroke="#0ea5e9" strokeWidth="3" />
                        <path d="M 330 140 L 330 200 M 430 140 L 430 200" stroke="#0ea5e9" strokeWidth="1" />
                        <text x="325" y="180" fill="#0284c7" className="text-[10px] font-black uppercase font-mono">Cámara Trituración</text>
                      </g>

                      {/* Rotor con martillos */}
                      <g className="cursor-pointer" onClick={() => setActiveHotspot('rotor')}>
                        <circle cx="380" cy="225" r="35" fill="none" stroke="#0ea5e9" strokeWidth="2.5" strokeDasharray="10,5" className={isPlaying ? "animate-[spin_6s_infinite_linear] origin-[380px_225px]" : ""} />
                        <circle cx="380" cy="225" r="8" fill="#0ea5e9" />
                        {/* Cuchillas del rotor */}
                        <line x1="380" y1="190" x2="380" y2="260" stroke="#0284c7" strokeWidth="4" />
                        <line x1="345" y1="225" x2="415" y2="225" stroke="#0284c7" strokeWidth="4" />
                      </g>

                      {/* Motor Principal Siemens */}
                      <g className="cursor-pointer" onClick={() => setActiveHotspot('motor_p')}>
                        <rect x="220" y="270" width="70" height="50" rx="5" fill="#475569" stroke="#334155" strokeWidth="2" />
                        <rect x="235" y="260" width="40" height="10" fill="#64748b" />
                        <text x="225" y="310" fill="#f8fafc" className="text-[8px] font-black font-mono">120 HP</text>
                      </g>

                      {/* Motor Auxiliar Siemens */}
                      <g className="cursor-pointer" onClick={() => setActiveHotspot('motor_a')}>
                        <rect x="230" y="330" width="40" height="30" rx="3" fill="#64748b" stroke="#475569" strokeWidth="1.5" />
                        <text x="235" y="350" fill="#f8fafc" className="text-[8px] font-black font-mono">10 HP</text>
                      </g>

                      {/* Separador Magnético */}
                      <g className="cursor-pointer" onClick={() => setActiveHotspot('separador')}>
                        <rect x="530" y="210" width="60" height="35" rx="4" fill="#ef4444" stroke="#b91c1c" strokeWidth="2" opacity="0.8" />
                        <text x="535" y="232" fill="#ffffff" className="text-[8px] font-black font-mono uppercase">IMÁN</text>
                        {/* Clavos extraídos */}
                        <path d="M 560 245 L 560 280" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="3,3" />
                      </g>

                      {/* Banda de salida */}
                      <g className="cursor-pointer" onClick={() => setActiveHotspot('salida')}>
                        <path d="M 420 300 L 700 370 L 700 390 L 420 320 Z" fill="#334155" stroke="#1e293b" strokeWidth="1.5" />
                        <text x="600" y="360" fill="#475569" className="text-[10px] font-black uppercase font-mono">Banda de Salida</text>
                      </g>

                      {/* Sistema hidráulico */}
                      <g className="cursor-pointer" onClick={() => setActiveHotspot('hidraulico')}>
                        <path d="M 460 210 L 500 230 M 460 220 L 500 240" stroke="#0284c7" strokeWidth="3" />
                        <circle cx="500" cy="235" r="4" fill="#06b6d4" />
                      </g>

                      {/* HOTSPOTS INTERACTIVOS (PULSAR RINGS) */}
                      {Object.keys(hotspots).map((key, idx) => {
                        let coords = { x: 0, y: 0 };
                        if (key === 'entrada') coords = { x: 180, y: 280 };
                        if (key === 'camara') coords = { x: 380, y: 155 };
                        if (key === 'rotor') coords = { x: 410, y: 225 };
                        if (key === 'hidraulico') coords = { x: 480, y: 225 };
                        if (key === 'separador') coords = { x: 560, y: 215 };
                        if (key === 'salida') coords = { x: 580, y: 350 };
                        if (key === 'motor_p') coords = { x: 255, y: 295 };
                        if (key === 'motor_a') coords = { x: 250, y: 345 };
                        if (key === 'estructura') coords = { x: 490, y: 310 };

                        return (
                          <g 
                            key={key} 
                            className="cursor-pointer"
                            onClick={() => setActiveHotspot(key)}
                          >
                            <circle cx={coords.x} cy={coords.y} r="10" fill="#00f0ff" opacity="0.3" className="animate-ping origin-center" />
                            <circle cx={coords.x} cy={coords.y} r="6" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
                          </g>
                        );
                      })}
                    </svg>

                    {/* Detalle flotante de Hotspot Seleccionado */}
                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 border border-slate-200 p-4 rounded-xl shadow-md z-10 transition-all">
                      {activeHotspot ? (
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <h4 className="text-xs font-black text-cyan-800 uppercase tracking-wider">{hotspots[activeHotspot].title}</h4>
                            <button onClick={() => setActiveHotspot(null)} className="text-slate-400 hover:text-slate-700">
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-[11px] font-medium text-slate-600 leading-relaxed">{hotspots[activeHotspot].desc}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] font-bold text-slate-500 text-center uppercase tracking-wider flex items-center justify-center gap-1">
                          <Info className="w-4 h-4 text-cyan-600" />
                          Haz clic en los puntos tácticos de la máquina para ver sus especificaciones.
                        </p>
                      )}
                    </div>

                  </div>
                )}
              </div>

              {/* 3. FLUJO DE PROCESO */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-4 border-b border-slate-100 pb-3">Flujo del Proceso de Trituración</h3>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                  {[
                    { step: 'A', title: 'Alimentación', desc: 'Banda alimentadora continua de 4.0m.' },
                    { step: 'B', title: 'Entrada al Rotor', desc: 'Entrada forzada por gravedad a la boca.' },
                    { step: 'C', title: 'Trituración', desc: 'Acción de cuchillas tipo martillo a 650 rpm.' },
                    { step: 'D', title: 'Imán Separador', desc: 'Extracción magnética de clavos y tornillos.' },
                    { step: 'E', title: 'Descarga', desc: 'Salida de material limpio por banda de 3.0m.' },
                    { step: 'F', title: 'Producto Final', desc: 'Partículas de madera homogénea de 2-3 cm.' },
                  ].map((f, i) => (
                    <div key={i} className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-between">
                      <div>
                        <span className="w-6 h-6 rounded-full bg-cyan-100 border border-cyan-200 flex items-center justify-center text-[10px] font-black text-cyan-800 font-mono mb-2">{f.step}</span>
                        <h4 className="text-xs font-black text-slate-800 uppercase tracking-tight">{f.title}</h4>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium leading-relaxed mt-2">{f.desc}</p>
                    </div>
                  ))}
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
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTechnicalSheetName(true)}>
                      {inputs.technicalSheetName}
                      <Edit2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-cyan-500 transition-colors" />
                    </h3>
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
                <div className="flex items-center gap-2 border-b border-slate-100 pb-4 mb-6">
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
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingEnergyTitle(true)}>
                      {inputs.energySectionTitle || 'DESGLOSE ENERGÉTICO OPERATIVO'}
                      <Edit2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-cyan-500 transition-colors" />
                    </h3>
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

                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={chartData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <defs>
                        <linearGradient id="colorProd" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorKwh" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis yAxisId="left" stroke="#94a3b8" fontSize={11} tickLine={false} label={{ value: 'Producción (ton)', angle: -90, position: 'insideLeft', style: { fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' } }} />
                      <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={11} tickLine={false} label={{ value: 'Consumo Eléctrico (kWh)', angle: 90, position: 'insideRight', style: { fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' } }} />
                      <Tooltip formatter={(value, name) => [new Intl.NumberFormat().format(value), name]} />
                      <Legend verticalAlign="top" height={36} />
                      <Area yAxisId="left" type="monotone" dataKey="Produccion" stroke="#06b6d4" fillOpacity={1} fill="url(#colorProd)" strokeWidth={3} name="Producción Real (ton)" />
                      <Area yAxisId="right" type="monotone" dataKey="ConsumoKwh" stroke="#6366f1" fillOpacity={1} fill="url(#colorKwh)" strokeWidth={3} name="Consumo Mensual (kWh)" />
                    </AreaChart>
                  </ResponsiveContainer>
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
                <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                  <div style={{ height: 80, background: 'linear-gradient(to right, #008299, #00c2cb)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px' }}>
                    <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(120deg, transparent, transparent 28px, rgba(255,255,255,0.03) 28px, rgba(255,255,255,0.03) 30px)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2 }}>
                      <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>CENTERS DE MÉXICO</span>
                      <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 800, color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '2px 8px', background: 'rgba(255,255,255,0.1)' }}>PANDORA 3.0</span>
                    </div>
                    <div style={{ textAlign: 'right', position: 'relative', zIndex: 2 }}>
                      <div style={{ color: '#fff', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>TRITURADORA INDUSTRIAL {inputs.machineName?.toUpperCase() || 'WM-500'}</div>
                      <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: 700, marginTop: 3 }}>CLIENTE: {inputs.clientName.toUpperCase()} &nbsp;|&nbsp; MÁQUINA: {inputs.machineName?.toUpperCase() || 'WM-500'} &nbsp;|&nbsp; FECHA: {new Date().toLocaleDateString()}</div>
                    </div>
                  </div>

                  <div style={{ ...S.inner, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40, alignItems: 'center', flex: 1, paddingTop: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                      <div>
                        <div style={{ fontSize: 9, fontWeight: 900, color: '#008299', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>INFORME PARAMÉTRICO DE SIMULACIÓN</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                          <div style={{ fontSize: 44, fontWeight: 900, color: '#0f2038', letterSpacing: -0.8, lineHeight: 1.0, fontFamily: 'sans-serif' }}>SIMULACIÓN</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 4, height: 38, background: '#00c2cb', borderRadius: 2 }} />
                            <div style={{ fontSize: 44, fontWeight: 900, color: '#00c2cb', letterSpacing: -0.8, lineHeight: 1.0, fontFamily: 'sans-serif' }}>DE LÍNEA</div>
                          </div>
                        </div>
                      </div>

                      <div style={{ marginTop: 4 }}>
                        <div style={{ fontSize: 9, fontWeight: 900, color: '#00c2cb', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 }}>CLIENTE</div>
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
                        <span style={{ fontSize: 9, fontWeight: 900, color: '#0f766e', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 8 }}>PARÁMETROS DEL MATERIAL SIMULADO</span>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', fontSize: 11, color: '#475569' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#0f766e', fontWeight: 700 }}>Material Evaluado</span><strong style={{ color: '#0f172a', textTransform: 'uppercase' }}>{inputs.materialType.replace('_', ' ')}</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#0f766e', fontWeight: 700 }}>Régimen Diario</span><strong style={{ color: '#0f172a' }}>{results.hoursPerDay} horas ({inputs.shiftsPerDay} turnos)</strong></div>
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#0f766e', fontWeight: 700 }}>Meta Objetivo Diaria</span><strong style={{ color: '#0f172a' }}>{new Intl.NumberFormat().format(inputs.dailyGoalKg)} kg/día</strong></div>
                        </div>
                      </div>
                    </div>

                    <div style={{ background: '#edfbfd', borderRadius: 24, padding: 32, border: '1px solid #cffafe', display: 'flex', flexDirection: 'column', gap: 24, height: '100%', justifyContent: 'center' }}>
                      <div style={{ fontSize: 12, fontWeight: 900, color: '#008299', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 }}>VISTA PREVIA DE RESULTADOS</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cffafe', paddingBottom: 16 }}>
                        <div><div style={{ fontSize: 14, fontWeight: 800, color: '#0f2038' }}>Capacidad Real / Hora</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Considerando OEE del {inputs.oee}%</div></div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#008299' }}>{results.realProductionPerHourKg.toFixed(0)} kg/h</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cffafe', paddingBottom: 16 }}>
                        <div><div style={{ fontSize: 14, fontWeight: 800, color: '#0f2038' }}>Producción Diaria</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Capacidad total por día</div></div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#008299' }}>{(results.dailyProductionKg/1000).toFixed(2)} ton/día</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #cffafe', paddingBottom: 16 }}>
                        <div><div style={{ fontSize: 14, fontWeight: 800, color: '#0f2038' }}>Consumo Eléctrico</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Por tonelada triturada</div></div>
                        <div style={{ fontSize: 26, fontWeight: 900, color: '#008299' }}>{results.electricityCostPerTonMxn.toFixed(1)} MXN</div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div><div style={{ fontSize: 14, fontWeight: 800, color: '#0f2038' }}>Viabilidad Proyectada</div><div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Cobertura de meta ({results.requirementCoverage.toFixed(1)}%)</div></div>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#008299' }}>{results.viabilityState}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '0 48px 24px' }}>
                    <div style={{ borderTop: '1px solid #dbe5ee', paddingTop: 16, display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>
                      <span>{inputs.clientName.toUpperCase()} · MÁQUINA: {inputs.machineName?.toUpperCase() || 'WM-500'}</span><span>PÁGINA 1 DE {totalPdfPages}</span>
                    </div>
                  </div>
                </div>

                {/* PÁGINA 2: DATOS TÉCNICOS Y DICTAMEN AI */}
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
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#008299', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>DISTRIBUCIÓN DE POTENCIA INSTALADA POR EQUIPO (kW)</span>
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: 9, lineHeight: '1.4' }}>
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
                      <span style={{ fontSize: 9, fontWeight: 900, color: '#0f766e', letterSpacing: 1.5, textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>DICTAMEN TÉCNICO AUTOMÁTICO</span>
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {conclusions.map((c, i) => (
                          <div key={i} style={{ fontSize: 11, lineHeight: 1.5, fontWeight: 600, color: '#334155' }}>
                            <span style={{ color: '#00c2cb', fontWeight: 900, marginRight: 6 }}>▪</span>{c.text}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ flex: 1 }} />
                    {renderPageFooter(2, totalPdfPages)}
                  </div>
                </div>

                {/* PÁGINA 3: FICHA TÉCNICA DE HOMOLOGACIÓN */}
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

                    {renderPageFooter(3, totalPdfPages)}
                  </div>
                </div>

                {/* PÁGINA 4: ENERGÍA Y CAPACIDAD */}
                <div className="pdf-page bg-white relative flex flex-col" style={S.page}>
                  <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {renderPageHeader(`4. ${inputs.energySectionTitle || 'Energía & Capacidad'}`, 'Desglose energético operativo y comparativa de producción real vs consumo en kWh')}

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
                            <div style={{ fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: 6 }}>{k.title}</div>
                            <div style={{ fontSize: 22, fontWeight: 900, color: '#0f2038' }}>{k.val}</div>
                            <div style={{ fontSize: 9, color: '#94a3b8', marginTop: 4, fontFamily: 'monospace' }}>{k.sub}</div>
                          </div>
                        ))}
                      </div>

                      {/* Charts Area */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, flex: 1, minHeight: 0 }}>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: '#0f766e', textTransform: 'uppercase', marginBottom: 12 }}>Capacidad Diaria vs Requerimiento Diario</div>
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
                          <div style={{ textAlign: 'center', fontSize: 9, fontWeight: 700, color: '#64748b', marginTop: 8 }}>
                            Margen operativo disponible: <span style={{ color: '#008299' }}>{new Intl.NumberFormat().format(Math.max(0, results.dailyProductionKg - inputs.dailyGoalKg).toFixed(0))} kg/día</span>
                          </div>
                        </div>

                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, display: 'flex', flexDirection: 'column' }}>
                          <div style={{ fontSize: 10, fontWeight: 900, color: '#4f46e5', textTransform: 'uppercase', marginBottom: 12 }}>Producción vs Consumo Energético</div>
                          <div style={{ flex: 1, minHeight: 0 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart
                                data={chartData}
                                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                              >
                                <defs>
                                  <linearGradient id="colorProdPdf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3}/><stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/></linearGradient>
                                  <linearGradient id="colorKwhPdf" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/><stop offset="95%" stopColor="#6366f1" stopOpacity={0}/></linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} tickLine={false} />
                                <YAxis yAxisId="left" stroke="#94a3b8" fontSize={9} tickLine={false} width={30} />
                                <YAxis yAxisId="right" orientation="right" stroke="#94a3b8" fontSize={9} tickLine={false} width={30} />
                                <Area yAxisId="left" type="monotone" dataKey="Produccion" stroke="#06b6d4" fill="url(#colorProdPdf)" strokeWidth={2} />
                                <Area yAxisId="right" type="monotone" dataKey="ConsumoKwh" stroke="#6366f1" fill="url(#colorKwhPdf)" strokeWidth={2} />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      </div>
                    </div>

                    {renderPageFooter(4, totalPdfPages)}
                  </div>
                </div>

                {/* PÁGINAS DINÁMICAS: MODELADO 3D (TWIN DIGITAL) */}
                {snapshotPages.map((page, index) => (
                  <div key={index} className="pdf-page bg-white relative flex flex-col" style={S.page}>
                    <div style={{ ...S.inner, flex: 1, paddingTop: 40, display: 'flex', flexDirection: 'column', gap: 20 }}>
                      {renderPageHeader(`${index + 5}. Vista ${page.type.charAt(0).toUpperCase() + page.type.slice(1)}`, 'Renderizado CAD de alta resolución del equipo en configuración de planta')}
                      
                      <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 16, background: '#edf4f9', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <img src={page.src} alt={page.type} style={{ width: '100%', height: '100%', objectFit: 'contain', mixBlendMode: 'darken', objectPosition: 'center' }} className="animate-fade-in" />
                      </div>

                      <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: 12, padding: 16, fontSize: 10, lineHeight: 1.5, color: '#334155', fontWeight: 600 }}>
                        <span style={{ color: '#0f766e', fontWeight: 900, textTransform: 'uppercase', marginRight: 6 }}>Nota de Escala Visual ({page.type}): </span>
                        Esta proyección tridimensional corresponde a la captura exacta de la Trituradora WM-500 evaluada bajo la perspectiva {page.type.toLowerCase()}. Las proporciones y el diseño representan el volumen real del equipo industrial proyectado en el software PANDORA 3.0.
                      </div>
                      
                      {renderPageFooter(index + 5, totalPdfPages)}
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
