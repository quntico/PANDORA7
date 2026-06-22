import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Zap, DollarSign, Activity, Settings, 
  AlertCircle, ShieldAlert, Cpu, Layers, Wind, Droplet, 
  Clock, BarChart3, Wrench, FileSpreadsheet, Percent, 
  TrendingUp, RefreshCw, Printer, Info, Eye, X, Download, FileText,
  FolderOpen, Upload, Check, Sliders, RotateCcw, Table2, MousePointer, Edit3,
  Loader2, Lock, Unlock, Link2, Plus, LineChart, Maximize2, Minimize2, Save
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, LabelList
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

// Componentes del Visor 3D
import SharedTwinViewer3D from '../../../components/flow/SharedTwinViewer3D';
import { useTranslation } from '../../../context/LanguageContext';
import { useBeta } from '../../../context/BetaContext';
import { supabase } from '../../../supabase';
import { process3DFile } from '../../../utils/fileProcessor';

const FORVIA_EQUIPMENTS = [
  { id: 'alimentador', name: 'Alimentador Plástico BDW', kw: 5.5, capexUsd: 12000 },
  { id: 'formadora', name: 'Formadora de Cajas PLD-140', kw: 18.5, capexUsd: 45000 },
  { id: 'selladora', name: 'Selladora de Cajas Alta Frecuencia', kw: 22.0, capexUsd: 38000 },
  { id: 'transportador', name: 'Banda Transportadora de Salida', kw: 2.2, capexUsd: 8000 },
  { id: 'apilador', name: 'Apilador Automático BDW-200', kw: 7.5, capexUsd: 15000 }
];

const REPORT_STYLES = {
  th: { background: '#0a0d14', color: '#00F0FF', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, padding: '8px 10px', borderBottom: '2px solid #00F0FF', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 },
  td: { borderBottom: '1px solid #1a1e2c', padding: '8px 10px', textAlign: 'left', verticalAlign: 'middle', fontSize: 11, color: '#e0e0e0' }
};

// ── Helpers de IndexedDB para almacenamiento de Modelos 3D persistentes locales ──
const dbName = "PandoraForviaDB";
const storeName = "forvia_models";

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

export default function ForviaSimulator() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { activeProject, updateProjectName } = useBeta();
  const reportRef = useRef(null);

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

  const handleProjectNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveProjectName();
    }
    if (e.key === 'Escape') {
      setIsEditingProjectName(false);
      setTempProjectName(inputs.projectName || '');
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

  const handleClientNameKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveClientName();
    }
    if (e.key === 'Escape') {
      setIsEditingClientName(false);
      setTempClientName(inputs.clientName || '');
    }
  };

  // --- 1. ESTADO DE ENTRADAS ---
  const defaultInputs = {
    clientName: 'CENTRAL DE INTELIGENCIA',
    projectName: 'FORVIA - BDW 200',
    evaluationName: 'MÁQUINA EN EVALUACIÓN - PLD-140',
    maxSpeed: 140, // m/h
    targetCapacity: 200, // cajas/h
    machineLength: 7.6, // m
    boxLength: 0.3997, // m
    loadFactor: 75, // %
    hoursPerShift: 6.6, // hrs
    shiftsPerDay: 2, // turnos
    daysPerMonth: 26, // días operativos al mes
    electricityRate: 2.30, // MXN/kWh
    exchangeRate: 18.20, // USD/MXN
    voltage: 440, // VAC
    powerFactor: 0.85,
    boxWeightGrams: 420, // g
    sellPricePerBox: 12.50, // MXN por caja terminada
    rawMaterialCostPerKg: 18.00, // MXN/kg
    numOperators: 1,
    laborCostPerShift: 500, // MXN/turno
    maintenanceCost: 600, // USD/mes
    sparePartsCost: 350, // USD/mes
    cableadoCapex: 2500, // USD
    obraCivilCapex: 4000, // USD
    isEpcMode: false
  };

  const [inputs, setInputs] = useState(() => {
    const saved = localStorage.getItem('sim_forvia_inputs');
    return saved ? JSON.parse(saved) : defaultInputs;
  });

  useEffect(() => {
    localStorage.setItem('sim_forvia_inputs', JSON.stringify(inputs));
  }, [inputs]);

  // --- ESTADOS DE PERSISTENCIA Y MODELO CAD ---
  const [twinLayout, setTwinLayout] = useState(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [isProcessingModel, setIsProcessingModel] = useState(false);

  // Cargar modelo 3D desde IndexedDB al montar
  useEffect(() => {
    async function loadSavedModel() {
      const savedMeta = localStorage.getItem('sim_forvia_layout_meta');
      if (!savedMeta) return;
      
      const savedModel = await getModelFromIndexedDB('sim_forvia_active_model');
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

  // Guardar simulador de forma explícita (puente de guardado)
  const handleSaveSimulator = async () => {
    // 1. Guardar localmente
    localStorage.setItem('sim_forvia_inputs', JSON.stringify(inputs));
    
    // 2. Guardar en Supabase (puente de guardado)
    if (activeProject && activeProject.id && activeProject.id !== 'local-fallback-id') {
      try {
        const payload = {
          project_id: activeProject.id,
          key: 'sim_forvia_data',
          value: JSON.stringify({
            inputs,
            twinLayout,
            twinNodes,
            twinEdges,
            currentDesignId,
            results: {
              capexTotalUsd: results.capex.totalUsd,
              installedKw: results.installedKw,
              activePowerKw: results.activePowerKw,
              energyDailyKwh: results.energyDailyKwh,
              electricityMonthlyCostMxn: results.electricityMonthlyCostMxn,
              laborCostMonthlyMxn: results.laborCostMonthlyMxn,
              maintenanceMonthlyCostMxn: results.maintenanceMonthlyCostMxn,
              sparePartsMonthlyCostMxn: results.sparePartsMonthlyCostMxn,
              opexTotalMxn: results.opex.totalMxn,
              dailyCapacity: results.dailyCapacity,
              monthlyCapacity: results.monthlyCapacity,
              annualCapacity: results.annualCapacity,
              revenueMonthlyMxn: results.revenueMonthlyMxn,
              profitMonthlyMxn: results.profitMonthlyMxn,
              paybackMonths: results.profitability.paybackMonths,
              roiAnnualPercent: results.profitability.roiAnnualPercent
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

  // Procesar archivo de modelo 3D
  const processAndSetupTwinModel = async (file) => {
    if (!file) return;
    setIsProcessingModel(true);
    try {
      const result = await process3DFile(file);
      // Guardar el archivo Blob en IndexedDB para persistencia local
      await saveModelToIndexedDB('sim_forvia_active_model', file, file.name, result.type);
      
      const layoutData = {
        url: result.url,
        type: result.type,
        name: file.name,
        blobMap: result.blobMap
      };
      
      setTwinLayout(layoutData);
      localStorage.setItem('sim_forvia_layout_meta', JSON.stringify({ name: file.name, type: result.type }));
      
      setToastMessage(`Modelo 3D "${file.name}" cargado y guardado con éxito.`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
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

  const handleResetTwinModel = async () => {
    if (confirm('¿Deseas restablecer el visor 3D al modelo predeterminado?')) {
      await deleteModelFromIndexedDB('sim_forvia_active_model');
      setTwinLayout(null);
      localStorage.removeItem('sim_forvia_layout_meta');
      setToastMessage('Visor 3D restablecido al modelo predeterminado.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }
  };

  // --- 2. CÁLCULO DE MÉTRICAS ---
  const results = useMemo(() => {
    const maxSpeed = Math.max(1, parseFloat(inputs.maxSpeed) || 1);
    const targetCapacity = Math.max(1, parseFloat(inputs.targetCapacity) || 1);
    const machineLength = Math.max(0.1, parseFloat(inputs.machineLength) || 0.1);
    const boxLength = Math.max(0.01, parseFloat(inputs.boxLength) || 0.01);
    const loadFactor = Math.max(0, parseFloat(inputs.loadFactor) || 0);
    const hoursPerShift = Math.max(0, parseFloat(inputs.hoursPerShift) || 0);
    const shiftsPerDay = Math.max(0, parseFloat(inputs.shiftsPerDay) || 0);
    const daysPerMonth = Math.max(0, parseFloat(inputs.daysPerMonth) || 0);
    const electricityRate = Math.max(0, parseFloat(inputs.electricityRate) || 0);
    const exchangeRate = Math.max(1, parseFloat(inputs.exchangeRate) || 1);
    const voltage = parseFloat(inputs.voltage) || 440;
    const powerFactor = parseFloat(inputs.powerFactor) || 0.85;
    const boxWeightGrams = parseFloat(inputs.boxWeightGrams) || 420;
    const sellPricePerBox = parseFloat(inputs.sellPricePerBox) || 12.50;
    const rawMaterialCostPerKg = parseFloat(inputs.rawMaterialCostPerKg) || 18.00;
    const numOperators = parseFloat(inputs.numOperators) || 1;
    const laborCostPerShift = parseFloat(inputs.laborCostPerShift) || 500;
    const maintenanceCost = parseFloat(inputs.maintenanceCost) || 600;
    const sparePartsCost = parseFloat(inputs.sparePartsCost) || 350;

    // Métricas Físicas e HMI
    const speedMMin = maxSpeed / 60; // Equivalencia m/min
    const capacityReal = maxSpeed / boxLength; // cajas/h
    const residenceTime = machineLength / speedMMin; // min
    const boxesInside = machineLength / boxLength; // pzs

    const hoursPerDay = hoursPerShift * shiftsPerDay;
    const hoursPerMonth = hoursPerDay * daysPerMonth;

    // Capacidad Diaria
    const dailyCapacity = capacityReal * hoursPerDay; // Cajas al día
    const monthlyCapacity = dailyCapacity * daysPerMonth;
    const annualCapacity = monthlyCapacity * 12;

    // Consumo Eléctrico
    const totalInstalledKw = FORVIA_EQUIPMENTS.reduce((sum, eq) => sum + eq.kw, 0);
    const activePowerKw = totalInstalledKw * (loadFactor / 100) * (voltage === 220 ? 1.07 : 1.0);
    
    const energyDailyKwh = activePowerKw * hoursPerDay;
    const energyMonthlyKwh = energyDailyKwh * daysPerMonth;

    // Costos Operativos (OPEX)
    const electricityCostMonthlyMxn = energyMonthlyKwh * electricityRate;
    const laborCostMonthlyMxn = numOperators * laborCostPerShift * shiftsPerDay * daysPerMonth;
    
    // Costo de Materia Prima
    const boxWeightKg = boxWeightGrams / 1000;
    const materialCostPerBoxMxn = boxWeightKg * rawMaterialCostPerKg;
    const materialCostMonthlyMxn = monthlyCapacity * materialCostPerBoxMxn;

    const opexMonthlyMxn = electricityCostMonthlyMxn + laborCostMonthlyMxn + materialCostMonthlyMxn + ((maintenanceCost + sparePartsCost) * exchangeRate);
    const opexCostPerBoxMxn = monthlyCapacity > 0 ? opexMonthlyMxn / monthlyCapacity : 0;

    // Ingresos
    const revenueMonthlyMxn = monthlyCapacity * sellPricePerBox;

    // CAPEX
    const baseCapexUsd = FORVIA_EQUIPMENTS.reduce((sum, eq) => sum + eq.capexUsd, 0);
    const additionalCapexUsd = (parseFloat(inputs.cableadoCapex) || 0) + (parseFloat(inputs.obraCivilCapex) || 0);
    const epcCostUsd = inputs.isEpcMode ? baseCapexUsd * 0.15 : 0;
    const totalCapexUsd = baseCapexUsd + additionalCapexUsd + epcCostUsd;
    const totalCapexMxn = totalCapexUsd * exchangeRate;

    // Rentabilidad
    const marginMonthlyMxn = revenueMonthlyMxn - opexMonthlyMxn;
    const paybackMonths = marginMonthlyMxn > 0 ? totalCapexMxn / marginMonthlyMxn : null;

    const equipmentDetails = FORVIA_EQUIPMENTS.map(eq => ({
      ...eq,
      realKw: eq.kw * (loadFactor / 100),
      capexMxn: eq.capexUsd * exchangeRate
    }));

    return {
      speedMMin,
      capacityReal,
      residenceTime,
      boxesInside,
      hoursPerDay,
      dailyCapacity,
      monthlyCapacity,
      annualCapacity,
      activePowerKw,
      installedKw: totalInstalledKw,
      energyMonthlyKwh,
      opex: {
        electricityMxn: electricityCostMonthlyMxn,
        laborMxn: laborCostMonthlyMxn,
        materialMxn: materialCostMonthlyMxn,
        fixedMxn: (maintenanceCost + sparePartsCost) * exchangeRate,
        totalMxn: opexMonthlyMxn,
        costPerBoxMxn: opexCostPerBoxMxn
      },
      revenueMonthlyMxn,
      capex: {
        baseUsd: baseCapexUsd,
        additionalUsd: additionalCapexUsd,
        epcUsd: epcCostUsd,
        totalUsd: totalCapexUsd,
        totalMxn: totalCapexMxn
      },
      profitability: {
        marginMonthlyMxn,
        paybackMonths
      },
      equipmentDetails
    };
  }, [inputs]);

  // --- 3. DIGITAL TWIN NODES ---
  const twinNodes = useMemo(() => [
    { id: '1', type: 'alimentador', data: { label: 'Alimentador Plástico BDW', color: '#00F0FF' }, position: { x: -3, y: 0, z: 0 } },
    { id: '2', type: 'formadora', data: { label: 'Formadora de Cajas PLD-140', color: '#FF0055' }, position: { x: 0, y: 0, z: 0 } },
    { id: '3', type: 'selladora', data: { label: 'Selladora de Alta Frecuencia', color: '#FFB700' }, position: { x: 3, y: 0, z: 0 } },
    { id: '4', type: 'transportador', data: { label: 'Banda Transportadora de Salida', color: '#00FF66' }, position: { x: 6, y: 0, z: 0 } },
    { id: '5', type: 'apilador', data: { label: 'Apilador Automático BDW-200', color: '#8A2BE2' }, position: { x: 9, y: 0, z: 0 } }
  ], []);

  const twinEdges = useMemo(() => [
    { id: 'e1', source: '1', target: '2', animated: true },
    { id: 'e2', source: '2', target: '3', animated: true },
    { id: 'e3', source: '3', target: '4', animated: true },
    { id: 'e4', source: '4', target: '5', animated: true }
  ], []);

  // --- 4. EXPORTACIÓN DE ARCHIVOS ---
  const [currentDesignId, setCurrentDesignId] = useState(null);
  const [twinSnapshot, setTwinSnapshot] = useState(null);
  const [twinSnapshotLateral, setTwinSnapshotLateral] = useState(null);
  const [twinSnapshotSuperior, setTwinSnapshotSuperior] = useState(null);
  const [twinSnapshotIsometrica, setTwinSnapshotIsometrica] = useState(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  // Cargar datos del simulador Forvia de Supabase al cambiar de proyecto
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
          .eq('key', 'sim_forvia_data')
          .maybeSingle();

        if (error) throw error;
        if (data && data.value) {
          const cloudData = JSON.parse(data.value);
          console.log("[ForviaSimulator] Re-hydrating state from Supabase:", cloudData);

          // Re-hidratar inputs
          if (cloudData.inputs) {
            setInputs(prev => ({ ...prev, ...cloudData.inputs }));
          }

          // Re-hidratar diseño 3D
          if (cloudData.twinLayout) {
            setTwinLayout(cloudData.twinLayout);
          }
          if (cloudData.currentDesignId) {
            setCurrentDesignId(cloudData.currentDesignId);
          }
        }
      } catch (err) {
        console.error("[ForviaSimulator] Error loading from cloud:", err);
      }
    };

    loadSimulatorDataFromCloud();
  }, [activeProject?.id]);

  // Cargar instantánea del gemelo digital de localStorage y mantenerlo sincronizado
  useEffect(() => {
    const syncSnapshot = () => {
      const suffix = activeProject?.id ? `${activeProject.id}_` : '';
      setTwinSnapshot(localStorage.getItem(`sim_forvia_${suffix}twin_snapshot_base64`));
      setTwinSnapshotLateral(localStorage.getItem(`sim_forvia_${suffix}twin_snapshot_lateral`));
      setTwinSnapshotSuperior(localStorage.getItem(`sim_forvia_${suffix}twin_snapshot_superior`));
      setTwinSnapshotIsometrica(localStorage.getItem(`sim_forvia_${suffix}twin_snapshot_isometrica`));
    };
    syncSnapshot();
    window.addEventListener('storage', syncSnapshot);
    return () => window.removeEventListener('storage', syncSnapshot);
  }, [isReportModalOpen, activeProject?.id]);

  const printReport = async () => {
    setIsGeneratingPdf(true);
    setPdfProgress(10);
    
    // Cargar los últimos snapshots guardados dinámicamente
    const suffix = activeProject?.id ? `${activeProject.id}_` : '';
    setTwinSnapshot(localStorage.getItem(`sim_forvia_${suffix}twin_snapshot_base64`));
    setTwinSnapshotLateral(localStorage.getItem(`sim_forvia_${suffix}twin_snapshot_lateral`));
    setTwinSnapshotSuperior(localStorage.getItem(`sim_forvia_${suffix}twin_snapshot_superior`));
    setTwinSnapshotIsometrica(localStorage.getItem(`sim_forvia_${suffix}twin_snapshot_isometrica`));

    try {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const width = doc.internal.pageSize.getWidth();
      const height = doc.internal.pageSize.getHeight();

      // Generar Reporte de Alta Calidad con html2canvas
      setIsReportModalOpen(true);
      await new Promise(resolve => setTimeout(resolve, 800)); // Un poco más de tiempo para renderizado de imágenes
      
      const element = reportRef.current;
      const pages = element.querySelectorAll('.lma-page');

      for (let i = 0; i < pages.length; i++) {
        setPdfProgress(10 + Math.round((i / pages.length) * 80));
        const canvas = await html2canvas(pages[i], { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (i > 0) doc.addPage('a4', 'landscape');
        doc.addImage(imgData, 'JPEG', 0, 0, width, height, undefined, 'FAST');
      }

      setPdfProgress(100);
      doc.save(`SOLIMAQ_FORVIA_INFORME_${inputs.clientName.replace(/\s+/g, '_')}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error al generar PDF');
    } finally {
      setIsGeneratingPdf(false);
      setIsReportModalOpen(false);
    }
  };

  const exportToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // Hoja 1: Resumen General
    const summaryData = [
      ['FORVIA - BDW 200', 'INFORME OPERATIVO Y FINANCIERO'],
      ['Cliente', inputs.clientName],
      ['Proyecto', inputs.projectName],
      ['Evaluación', inputs.evaluationName],
      [],
      ['Métrica', 'Valor', 'Unidad'],
      ['Velocidad Máxima', inputs.maxSpeed, 'm/h'],
      ['Equivalencia', results.speedMMin.toFixed(2), 'm/min'],
      ['Capacidad Máxima / Día', results.dailyCapacity.toFixed(0), 'cajas/día'],
      ['Carga de Máquina', inputs.loadFactor, '%'],
      ['Capacidad Real', results.capacityReal.toFixed(1), 'cajas/h'],
      ['Residencia', results.residenceTime.toFixed(2), 'min'],
      ['Cajas Dentro de Línea', results.boxesInside.toFixed(2), 'pzs'],
      [],
      ['CAPEX Total', results.capex.totalUsd.toFixed(0), 'USD'],
      ['OPEX Mensual', results.opex.totalMxn.toFixed(0), 'MXN'],
      ['Ingreso Mensual', results.revenueMonthlyMxn.toFixed(0), 'MXN'],
      ['Payback Estimado', results.profitability.paybackMonths ? results.profitability.paybackMonths.toFixed(1) : 'N/D', 'Meses']
    ];
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen General');

    // Hoja 2: Equipos
    const eqData = [
      ['ID', 'Nombre del Equipo', 'kW Instalados', 'Consumo Real (kW)', 'CAPEX Base (USD)'],
      ...results.equipmentDetails.map(eq => [eq.id, eq.name, eq.kw, eq.realKw, eq.capexUsd]),
      ['Total', 'Línea Completa', results.installedKw, results.activePowerKw, results.capex.baseUsd]
    ];
    const wsEq = XLSX.utils.aoa_to_sheet(eqData);
    XLSX.utils.book_append_sheet(wb, wsEq, 'Equipamiento');

    XLSX.writeFile(wb, `SOLIMAQ_FORVIA_SIMULACION_${inputs.clientName.replace(/\s+/g, '_')}.xlsx`);
  };

  const formatCurrency = (val, symbol = 'MXN') => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: symbol }).format(val);
  };

  return (
    <div className="min-h-screen bg-[#05060c] text-white p-6 md:p-8 font-sans relative overflow-x-hidden">
      
      {/* HEADER DE CONTROL */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8 border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/alpha/simulators')}
            className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
            title="Volver a simuladores"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              {isEditingProjectName ? (
                <input
                  type="text"
                  value={tempProjectName}
                  onChange={(e) => setTempProjectName(e.target.value)}
                  onBlur={handleSaveProjectName}
                  onKeyDown={handleProjectNameKeyDown}
                  autoFocus
                  className="bg-[#0b0c10] border border-neon-cyan/50 rounded-lg px-2 py-0.5 text-lg font-black text-white tracking-widest outline-none focus:ring-1 focus:ring-neon-cyan/50 w-72 uppercase"
                />
              ) : (
                <h1 
                  onClick={() => setIsEditingProjectName(true)}
                  className="text-2xl font-black tracking-widest text-white uppercase cursor-pointer hover:text-neon-cyan transition-colors flex items-center gap-2 group"
                  title="Hacer click para renombrar proyecto/cliente"
                >
                  {inputs.projectName}
                  <Edit3 className="w-4 h-4 text-gray-500 hover:text-neon-cyan transition-colors" />
                </h1>
              )}
              <span className="text-[10px] font-black tracking-wider px-2 py-0.5 rounded bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan uppercase">Simulador Activo</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-gray-500 font-bold uppercase tracking-widest">
              <span>Cliente:</span>
              {isEditingClientName ? (
                <input
                  type="text"
                  value={tempClientName}
                  onChange={(e) => setTempClientName(e.target.value)}
                  onBlur={handleSaveClientName}
                  onKeyDown={handleClientNameKeyDown}
                  autoFocus
                  className="bg-[#0b0c10] border border-neon-cyan/50 rounded-lg px-2 py-0.5 text-xs font-bold text-white tracking-widest outline-none focus:ring-1 focus:ring-neon-cyan/50 w-64 uppercase"
                />
              ) : (
                <span 
                  onClick={() => setIsEditingClientName(true)}
                  className="text-neon-cyan cursor-pointer hover:underline flex items-center gap-1 group"
                  title="Click para editar nombre del cliente"
                >
                  {inputs.clientName}
                  <Edit3 className="w-3 h-3 text-gray-500 hover:text-neon-cyan transition-colors" />
                </span>
              )}
              <span className="text-gray-600">|</span>
              <span>{inputs.evaluationName}</span>
            </div>
          </div>
        </div>

        {/* ACCIONES SUPERIORES */}
        <div className="flex flex-wrap items-center gap-3">
          <button 
            onClick={handleSaveSimulator}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-neon-cyan/15 border border-neon-cyan/35 hover:border-neon-cyan hover:bg-neon-cyan/25 text-neon-cyan hover:text-white transition-all uppercase tracking-wider"
            title="Guardar estado del simulador"
          >
            <Save className="w-4 h-4" />
            Guardar Simulador
          </button>

          <button 
            onClick={() => {
              const name = prompt('Nombre del cliente:', inputs.clientName);
              if (name) setInputs(p => ({ ...p, clientName: name.toUpperCase() }));
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-white/5 border border-white/10 hover:border-[#00F0FF]/30 hover:bg-[#00F0FF]/5 text-gray-300 hover:text-white transition-all uppercase tracking-wider"
          >
            <Wrench className="w-4 h-4 text-neon-cyan" />
            Nombre
          </button>

          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-white/5 border border-white/10 hover:border-green-500/30 hover:bg-green-500/5 text-gray-300 hover:text-white transition-all uppercase tracking-wider"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-400" />
            Excel
          </button>

          <button 
            onClick={printReport}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black bg-white/5 border border-white/10 hover:border-red-500/30 hover:bg-red-500/5 text-gray-300 hover:text-white transition-all uppercase tracking-wider"
          >
            {isGeneratingPdf ? <Loader2 className="w-4 h-4 animate-spin text-red-400" /> : <Printer className="w-4 h-4 text-red-400" />}
            {isGeneratingPdf ? `Generando ${pdfProgress}%` : 'Informe PDF'}
          </button>
        </div>
      </div>

      {/* DASHBOARD PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
        
        {/* PANEL IZQUIERDO: CONFIGURADOR */}
        <div className="lg:col-span-4 bg-[#0a0c12] border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <Sliders className="w-5 h-5 text-neon-cyan" />
            <h2 className="text-sm font-black uppercase tracking-widest text-white">Configuración Base</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Máquina en Evaluación</label>
              <input 
                type="text" 
                value={inputs.evaluationName}
                onChange={e => setInputs(p => ({ ...p, evaluationName: e.target.value }))}
                className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-neon-cyan/50"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Velocidad Máxima (m/h)</label>
                <span className="text-xs font-black text-neon-cyan">{inputs.maxSpeed} m/h</span>
              </div>
              <input 
                type="range" min="10" max="300" step="5"
                value={inputs.maxSpeed}
                onChange={e => setInputs(p => ({ ...p, maxSpeed: parseInt(e.target.value) }))}
                className="w-full accent-neon-cyan"
              />
            </div>

            <div>
              <div className="flex justify-between mb-2">
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Capacidad de Diseño (Cajas/H)</label>
                <span className="text-xs font-black text-neon-cyan">{inputs.targetCapacity} c/h</span>
              </div>
              <input 
                type="range" min="50" max="1000" step="10"
                value={inputs.targetCapacity}
                onChange={e => setInputs(p => ({ ...p, targetCapacity: parseInt(e.target.value) }))}
                className="w-full accent-neon-cyan"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Largo Máquina (m)</label>
                <input 
                  type="number" step="0.1"
                  value={inputs.machineLength}
                  onChange={e => setInputs(p => ({ ...p, machineLength: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-neon-cyan/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Largo de Caja (m)</label>
                <input 
                  type="number" step="0.0001"
                  value={inputs.boxLength}
                  onChange={e => setInputs(p => ({ ...p, boxLength: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-neon-cyan/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Carga de Máquina (%)</label>
                <input 
                  type="number" min="0" max="100"
                  value={inputs.loadFactor}
                  onChange={e => setInputs(p => ({ ...p, loadFactor: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-neon-cyan/50"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">TC (USD/MXN)</label>
                <input 
                  type="number" step="0.1"
                  value={inputs.exchangeRate}
                  onChange={e => setInputs(p => ({ ...p, exchangeRate: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white focus:outline-none focus:border-neon-cyan/50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Horas x Turno</label>
                <input 
                  type="number" step="0.1"
                  value={inputs.hoursPerShift}
                  onChange={e => setInputs(p => ({ ...p, hoursPerShift: parseFloat(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Turnos x Día</label>
                <input 
                  type="number"
                  value={inputs.shiftsPerDay}
                  onChange={e => setInputs(p => ({ ...p, shiftsPerDay: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white/[0.02] border border-white/10 rounded-xl px-4 py-2 text-sm font-bold text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* PANEL DERECHO: VISUALES Y REPORTES */}
        <div className="lg:col-span-8 flex flex-col gap-8">
          
          {/* TARJETAS DE MÉTRICAS CLAVE */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-[#0a0c12] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Velocidad Máxima</span>
              <div className="mt-2">
                <span className="text-2xl font-black text-white">{inputs.maxSpeed}</span>
                <span className="text-[10px] font-bold text-gray-400 ml-1">m/h</span>
              </div>
            </div>

            <div className="bg-[#0a0c12] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Equivalencia</span>
              <div className="mt-2">
                <span className="text-2xl font-black text-white">{results.speedMMin.toFixed(2)}</span>
                <span className="text-[10px] font-bold text-gray-400 ml-1">m/min</span>
              </div>
            </div>

            <div className="bg-[#0a0c12] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Cap. Máq. / Día (Y1)</span>
              <div className="mt-2">
                <span className="text-2xl font-black text-neon-cyan">{new Intl.NumberFormat().format(results.dailyCapacity)}</span>
                <span className="text-[10px] font-bold text-gray-400 ml-1">cajas</span>
              </div>
              <span className="text-[8px] text-gray-600 mt-1 font-mono">{results.capacityReal.toFixed(1)} c/h * {results.hoursPerDay.toFixed(1)} h</span>
            </div>

            <div className="bg-[#0a0c12] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Carga de Máquina</span>
              <div className="mt-2">
                <span className="text-2xl font-black text-neon-purple">{inputs.loadFactor}%</span>
              </div>
            </div>
          </div>

          {/* TWIN DIGITAL 3D DE LA LÍNEA */}
          <div className="bg-[#0a0c12] border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-neon-cyan animate-pulse" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">Twin Digital 3D de la Línea</h3>
                {isProcessingModel && <Loader2 className="w-3.5 h-3.5 text-neon-cyan animate-spin" />}
              </div>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-[10px] font-black bg-white/5 border border-white/10 hover:border-neon-cyan/30 hover:bg-[#00F0FF]/5 text-gray-300 hover:text-white cursor-pointer transition-all uppercase tracking-wider">
                  <Upload className="w-3.5 h-3.5 text-neon-cyan" />
                  Subir Modelo CAD
                  <input 
                    type="file" 
                    accept=".glb,.gltf,.obj,.fbx,.dae,.zip" 
                    onChange={handleTwinModelUpload} 
                    className="hidden" 
                  />
                </label>
                {twinLayout && (
                  <button 
                    onClick={handleResetTwinModel}
                    className="flex items-center justify-center p-1.5 rounded-xl bg-red-550/10 border border-red-500/25 hover:bg-red-500/25 hover:border-red-500 text-red-400 hover:text-white transition-all"
                    title="Restablecer modelo predeterminado"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative rounded-2xl overflow-hidden border border-white/5 bg-[#05060b] h-[360px]">
              <SharedTwinViewer3D 
                storagePrefix="sim_forvia_"
                height="100%"
                customNodes={twinNodes}
                customEdges={twinEdges}
                customLayout={twinLayout}
                onFileDrop={processAndSetupTwinModel}
                showControls={true}
                theme="cyberpunk"
              />
            </div>
          </div>

          {/* MÁS DETALLES DE CAPACIDAD Y RESIDENCIA */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4">
              <span className="block text-[8px] font-black text-gray-500 uppercase tracking-widest">Velocidad Usada</span>
              <span className="text-lg font-black text-white">{results.speedMMin.toFixed(2)} m/min</span>
              <span className="block text-[9px] text-gray-600 font-mono mt-0.5">{inputs.maxSpeed.toFixed(1)} m/h</span>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4">
              <span className="block text-[8px] font-black text-gray-500 uppercase tracking-widest">Capacidad Real</span>
              <span className="text-lg font-black text-white">{results.capacityReal.toFixed(1)} c/h</span>
              <span className="block text-[9px] text-gray-600 font-mono mt-0.5">Obj: {inputs.targetCapacity} c/h</span>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4">
              <span className="block text-[8px] font-black text-gray-500 uppercase tracking-widest">Residencia</span>
              <span className="text-lg font-black text-neon-cyan">{results.residenceTime.toFixed(2)} min</span>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4">
              <span className="block text-[8px] font-black text-gray-500 uppercase tracking-widest">Cajas Dentro</span>
              <span className="text-lg font-black text-neon-purple">{results.boxesInside.toFixed(2)} pzs</span>
            </div>
          </div>

        </div>

      </div>

      {/* FINANZAS Y DESGLOSE TÉCNICO */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* DESGLOSE FÍSICO Y ELÉCTRICO */}
        <div className="bg-[#0a0c12] border border-white/5 rounded-3xl p-6 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4 mb-4">
            <Zap className="w-5 h-5 text-neon-cyan" />
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Desglose de Equipos FORVIA</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-semibold text-gray-400">
              <thead className="bg-white/[0.02] text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-white/5">
                <tr>
                  <th className="py-3 px-4 text-gray-400">Equipo</th>
                  <th className="py-3 px-4 text-center">Tensión</th>
                  <th className="py-3 px-4 text-center">kW Inst.</th>
                  <th className="py-3 px-4 text-center">kW Real</th>
                  <th className="py-3 px-4 text-right">CAPEX Base</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {results.equipmentDetails.map(eq => (
                  <tr key={eq.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 font-black text-white">{eq.name}</td>
                    <td className="py-3 px-4 text-center text-gray-500">{inputs.voltage} VAC</td>
                    <td className="py-3 px-4 text-center text-white">{eq.kw.toFixed(1)} kW</td>
                    <td className="py-3 px-4 text-center text-neon-cyan">{eq.realKw.toFixed(1)} kW</td>
                    <td className="py-3 px-4 text-right font-black text-white">{formatCurrency(eq.capexUsd, 'USD')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-white/10 font-black text-white">
                <tr>
                  <td className="py-3 px-4 text-neon-cyan">Total Línea</td>
                  <td className="py-3 px-4 text-center text-gray-500">-</td>
                  <td className="py-3 px-4 text-center text-white">{results.installedKw.toFixed(1)} kW</td>
                  <td className="py-3 px-4 text-center text-neon-cyan">{results.activePowerKw.toFixed(1)} kW</td>
                  <td className="py-3 px-4 text-right text-neon-cyan">{formatCurrency(results.capex.baseUsd, 'USD')}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* INFORME DE RENTABILIDAD */}
        <div className="bg-[#0a0c12] border border-white/5 rounded-3xl p-6 shadow-2xl flex flex-col gap-6">
          <div className="flex items-center gap-2 border-b border-white/5 pb-4">
            <DollarSign className="w-5 h-5 text-neon-cyan" />
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Métricas de Rentabilidad</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">CAPEX Proyectado</span>
              <div className="mt-2">
                <span className="text-xl font-black text-neon-cyan">{formatCurrency(results.capex.totalUsd, 'USD')}</span>
                <span className="block text-[10px] text-gray-500 mt-1 font-mono">{formatCurrency(results.capex.totalMxn, 'MXN')}</span>
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Payback Simple</span>
              <div className="mt-2">
                <span className="text-xl font-black text-neon-purple">
                  {results.profitability.paybackMonths ? `${results.profitability.paybackMonths.toFixed(1)} Meses` : 'N/D'}
                </span>
                <span className="block text-[10px] text-gray-500 mt-1 font-mono">Retorno Estimado</span>
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Ingresos Mensuales</span>
              <div className="mt-2">
                <span className="text-xl font-black text-white">{formatCurrency(results.revenueMonthlyMxn, 'MXN')}</span>
                <span className="block text-[10px] text-gray-500 mt-1 font-mono">Venta Estimada</span>
              </div>
            </div>

            <div className="bg-white/[0.01] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">OPEX Mensual</span>
              <div className="mt-2">
                <span className="text-xl font-black text-white">{formatCurrency(results.opex.totalMxn, 'MXN')}</span>
                <span className="block text-[10px] text-teal-400 font-bold mt-1 font-mono">Costo/Caja: {formatCurrency(results.opex.costPerBoxMxn, 'MXN')}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* RENDERIZADO DEL INFORME COMPLETO (OCULTO EN LA UI, CAPTURADO POR HTML2CANVAS PARA EL PDF) */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#05060b] border border-[#1e293b] rounded-3xl p-6 w-full max-w-[900px] shadow-2xl relative">
            <button 
              onClick={() => setIsReportModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-6">
              <Loader2 className="w-6 h-6 text-neon-cyan animate-spin" />
              <h3 className="text-lg font-black text-white uppercase tracking-widest">Generando Reporte de Alta Fidelidad...</h3>
            </div>
            
            {/* VISTA PREVIA DEL REPORTE */}
            <div ref={reportRef} className="overflow-hidden border border-white/10 rounded-2xl bg-white text-black p-8 space-y-8" style={{ width: '842px', minHeight: '595px', fontFamily: 'sans-serif' }}>
              
              {/* PÁGINA 1: RESUMEN OPERATIVO Y FINANCIERO */}
              <div className="lma-page bg-white p-8 relative flex flex-col justify-between mb-8" style={{ width: '782px', height: '535px', boxSizing: 'border-box' }}>
                <div>
                  <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-6">
                    <div className="flex gap-3 items-stretch">
                      <div className="w-1.5 bg-[#11b5c9] rounded-full" />
                      <div className="flex flex-col justify-center">
                        <h2 className="text-lg font-black text-[#0c0d14] uppercase leading-none tracking-tight">SOLIMAQ FORVIA SIMULADOR</h2>
                        <h2 className="text-lg font-black text-[#11b5c9] uppercase leading-none mt-1 tracking-tight">RESUMEN OPERATIVO</h2>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">PROYECTO / FECHA</p>
                      <p className="text-[10px] font-bold text-gray-700 mt-0.5">{inputs.projectName}</p>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#008299] border-b border-gray-100 pb-1">DATOS DE LA LÍNEA</h3>
                      <table className="w-full text-xs">
                        <tbody>
                          <tr className="border-b border-gray-50"><td className="py-1.5 font-bold text-gray-500">Cliente</td><td className="py-1.5 text-right font-black">{inputs.clientName}</td></tr>
                          <tr className="border-b border-gray-50"><td className="py-1.5 font-bold text-gray-500">Velocidad Máxima</td><td className="py-1.5 text-right font-black">{inputs.maxSpeed} m/h</td></tr>
                          <tr className="border-b border-gray-50"><td className="py-1.5 font-bold text-gray-500">Equivalencia</td><td className="py-1.5 text-right font-black">{results.speedMMin.toFixed(2)} m/min</td></tr>
                          <tr className="border-b border-gray-50"><td className="py-1.5 font-bold text-gray-500">Capacidad Máxima / Día</td><td className="py-1.5 text-right font-black">{results.dailyCapacity.toFixed(0)} cajas</td></tr>
                        </tbody>
                      </table>
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-xs font-black uppercase tracking-wider text-[#008299] border-b border-gray-100 pb-1">DATOS FINANCIEROS</h3>
                      <table className="w-full text-xs">
                        <tbody>
                          <tr className="border-b border-gray-50"><td className="py-1.5 font-bold text-gray-500">CAPEX Total</td><td className="py-1.5 text-right font-black text-teal-600">{formatCurrency(results.capex.totalUsd, 'USD')}</td></tr>
                          <tr className="border-b border-gray-50"><td className="py-1.5 font-bold text-gray-500">OPEX Mensual</td><td className="py-1.5 text-right font-black">{formatCurrency(results.opex.totalMxn, 'MXN')}</td></tr>
                          <tr className="border-b border-gray-50"><td className="py-1.5 font-bold text-gray-500">Ingresos Mensuales</td><td className="py-1.5 text-right font-black">{formatCurrency(results.revenueMonthlyMxn, 'MXN')}</td></tr>
                          <tr className="border-b border-gray-50"><td className="py-1.5 font-bold text-gray-500">Payback Estimado</td><td className="py-1.5 text-right font-black text-teal-600">{results.profitability.paybackMonths ? `${results.profitability.paybackMonths.toFixed(1)} Meses` : 'N/D'}</td></tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-100 pt-3 flex justify-between text-[8px] font-bold text-gray-400 tracking-wider">
                  <span>CENTERS DE MÉXICO - PANDORA 3.0</span>
                  <span>PÁGINA 1 DE 4</span>
                </div>
              </div>

              {/* PÁGINA 2: TWIN DIGITAL - VISTA LATERAL */}
              <div className="lma-page bg-white p-8 relative flex flex-col justify-between mb-8" style={{ width: '782px', height: '535px', boxSizing: 'border-box' }}>
                <div>
                  <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
                    <div className="flex gap-3 items-stretch">
                      <div className="w-1.5 bg-[#11b5c9] rounded-full" />
                      <div className="flex flex-col justify-center">
                        <h2 className="text-lg font-black text-[#0c0d14] uppercase leading-none tracking-tight">TWIN DIGITAL 3D</h2>
                        <h2 className="text-lg font-black text-[#11b5c9] uppercase leading-none mt-1 tracking-tight">VISTA LATERAL</h2>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">CLIENTE / PROYECTO</p>
                      <p className="text-[10px] font-bold text-gray-700 mt-0.5">{inputs.clientName}</p>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{inputs.projectName}</p>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-2xl bg-[#f8fafc] overflow-hidden flex items-center justify-center relative" style={{ width: '718px', height: '360px' }}>
                    {twinSnapshotLateral ? (
                      <img src={twinSnapshotLateral} alt="Vista Lateral" className="w-full h-full object-cover" />
                    ) : twinSnapshot ? (
                      <img src={twinSnapshot} alt="Twin Snapshot Fallback" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <span className="text-2xl">📷</span>
                        <span className="text-[10px] font-black uppercase">Vista Lateral no capturada</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border-t border-gray-100 pt-3 flex justify-between text-[8px] font-bold text-gray-400 tracking-wider">
                  <span>CENTERS DE MÉXICO - PANDORA 3.0</span>
                  <span>PÁGINA 2 DE 4</span>
                </div>
              </div>

              {/* PÁGINA 3: TWIN DIGITAL - VISTA SUPERIOR */}
              <div className="lma-page bg-white p-8 relative flex flex-col justify-between mb-8" style={{ width: '782px', height: '535px', boxSizing: 'border-box' }}>
                <div>
                  <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
                    <div className="flex gap-3 items-stretch">
                      <div className="w-1.5 bg-[#11b5c9] rounded-full" />
                      <div className="flex flex-col justify-center">
                        <h2 className="text-lg font-black text-[#0c0d14] uppercase leading-none tracking-tight">TWIN DIGITAL 3D</h2>
                        <h2 className="text-lg font-black text-[#11b5c9] uppercase leading-none mt-1 tracking-tight">VISTA SUPERIOR</h2>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">CLIENTE / PROYECTO</p>
                      <p className="text-[10px] font-bold text-gray-700 mt-0.5">{inputs.clientName}</p>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{inputs.projectName}</p>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-2xl bg-[#f8fafc] overflow-hidden flex items-center justify-center relative" style={{ width: '718px', height: '360px' }}>
                    {twinSnapshotSuperior ? (
                      <img src={twinSnapshotSuperior} alt="Vista Superior" className="w-full h-full object-cover" />
                    ) : twinSnapshot ? (
                      <img src={twinSnapshot} alt="Twin Snapshot Fallback" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <span className="text-2xl">📷</span>
                        <span className="text-[10px] font-black uppercase">Vista Superior no capturada</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border-t border-gray-100 pt-3 flex justify-between text-[8px] font-bold text-gray-400 tracking-wider">
                  <span>CENTERS DE MÉXICO - PANDORA 3.0</span>
                  <span>PÁGINA 3 DE 4</span>
                </div>
              </div>

              {/* PÁGINA 4: TWIN DIGITAL - VISTA ISOMÉTRICA */}
              <div className="lma-page bg-white p-8 relative flex flex-col justify-between" style={{ width: '782px', height: '535px', boxSizing: 'border-box' }}>
                <div>
                  <div className="flex justify-between items-center border-b border-gray-200 pb-4 mb-4">
                    <div className="flex gap-3 items-stretch">
                      <div className="w-1.5 bg-[#11b5c9] rounded-full" />
                      <div className="flex flex-col justify-center">
                        <h2 className="text-lg font-black text-[#0c0d14] uppercase leading-none tracking-tight">TWIN DIGITAL 3D</h2>
                        <h2 className="text-lg font-black text-[#11b5c9] uppercase leading-none mt-1 tracking-tight">VISTA ISOMÉTRICA</h2>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">CLIENTE / PROYECTO</p>
                      <p className="text-[10px] font-bold text-gray-700 mt-0.5">{inputs.clientName}</p>
                      <p className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-0.5">{inputs.projectName}</p>
                    </div>
                  </div>
                  
                  <div className="border border-gray-200 rounded-2xl bg-[#f8fafc] overflow-hidden flex items-center justify-center relative" style={{ width: '718px', height: '360px' }}>
                    {twinSnapshotIsometrica ? (
                      <img src={twinSnapshotIsometrica} alt="Vista Isométrica" className="w-full h-full object-cover" />
                    ) : twinSnapshot ? (
                      <img src={twinSnapshot} alt="Twin Snapshot Fallback" className="w-full h-full object-cover" />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        <span className="text-2xl">📷</span>
                        <span className="text-[10px] font-black uppercase">Vista Isométrica no capturada</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="border-t border-gray-100 pt-3 flex justify-between text-[8px] font-bold text-gray-400 tracking-wider">
                  <span>CENTERS DE MÉXICO - PANDORA 3.0</span>
                  <span>PÁGINA 4 DE 4</span>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}
 
      {/* TOAST NOTIFICATION PREMIUM */}
      {showToast && (
        <div className="fixed bottom-8 right-8 z-[99999] px-6 py-4 rounded-2xl bg-slate-950/90 backdrop-blur-2xl border border-neon-cyan/40 shadow-[0_10px_40px_rgba(0,240,255,0.25)] flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5">
          <div className="w-8 h-8 rounded-full bg-neon-cyan/10 border border-neon-cyan/30 flex items-center justify-center">
            <Check className="w-4 h-4 text-neon-cyan animate-bounce" />
          </div>
          <div>
            <h4 className="text-xs font-black uppercase tracking-widest text-white">Simulador Guardado</h4>
            <p className="text-[10px] text-gray-400 mt-0.5">{toastMessage}</p>
          </div>
        </div>
      )}

    </div>
  );
}
