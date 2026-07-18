import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ResponseRenderer from '@/components/beta/renderers/ResponseRenderer';
import { supabase, uploadFileWithProgress } from '@/supabase';
import RyderReportModal from '@/components/ryder/RyderReportModal';
import { buildRyderReportData } from '@/utils/buildRyderReportData';
import SharedTwinViewer3D from '@/components/flow/SharedTwinViewer3D';
import { useFlowDesigns } from '@/hooks/useFlowDesigns';
import { useBeta } from '@/context/BetaContext';
import FlowDesignsLibrary from '@/components/flow/FlowDesignsLibrary';
import { FolderOpen, Upload, Check, Sliders, Pencil, Link2, Droplets, Zap, Wind, Navigation, Cpu, Warehouse, Wrench, Anchor, Save } from 'lucide-react';


import { Activity, ArrowLeft, Bot, Box, Brain, ChevronLeft, ChevronRight, Download, Edit3, Eye, FileText, LayoutDashboard, Lock, Minus, Plus, Send, Settings, Table2, Target, Trash2, Unlock, Loader2, X, Play, RotateCcw, Copy, Maximize2, Minimize2, Power, Calculator, EyeOff, FileDigit, GripVertical, AlertTriangle, Printer, Truck, BarChart2, CheckCircle2, Factory, Layers } from 'lucide-react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';
import TabPortada from './TabPortada';
import TabTwin3D from './TabTwin3D';
import TabMetricas from './TabMetricas';
import DHLTabCapex from './DHLTabCapex';
import DHLTabOpex from './DHLTabOpex';
import DHLTabMantenimiento from './DHLTabMantenimiento';
import DHLTabObraCivil from './DHLTabObraCivil';
import { useFinancialEngine } from './useFinancialEngine';


// Helper to generate letters (A, B, C...)
function nextLetter(index) {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let s = '';
  index += 1;
  while (index > 0) {
    let rem = (index - 1) % 26;
    s = letters[rem] + s;
    index = Math.floor((index - 1) / 26);
  }
  return s;
}

const formatNumber = (value, decimals = 2) => {
  if (!isFinite(value)) return '-';
  return Number(value).toLocaleString('es-MX', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
};

// =========================
// customerScenarios
// =========================
const DEFAULT_SCENARIOS = {
  lavadoSecado: {
    name: 'Lavado y Secado',
    dailyRate: 3472,
    scenarios: [
      { year: 'Y1', hrsBase: 48, effectiveHoursPerShift: 6.59, shifts: 2 },
      { year: 'Y2', hrsBase: 46, effectiveHoursPerShift: 6.26, shifts: 2 },
      { year: 'Y3', hrsBase: 44, effectiveHoursPerShift: 5.94, shifts: 2 },
      { year: 'Y4', hrsBase: 42, effectiveHoursPerShift: 5.61, shifts: 2 },
      { year: 'Y5', hrsBase: 40, effectiveHoursPerShift: 5.28, shifts: 2 }
    ]
  }
};

const DEFAULT_MACHINE_CONFIGS = {
  lavadoSecado: {
    machineName: 'Lavadora + Secadora',
    machineLengthM: 7.60,
    maxSpeedMMin: 140 / 60,      // 2.3333 m/min
    nominalBoxesPerHour: 200,    // Capacidad nominal ofertada (tope oficial)
  }
};

// =========================
// scenarioEngine
// =========================
function computeCustomerScenarioTable(machineScenario) {
  if (!machineScenario || !machineScenario.scenarios) return [];
  return machineScenario.scenarios.map(row => {
    const availableDailyTime = row.effectiveHoursPerShift * row.shifts;
    const requiredPerHour = availableDailyTime > 0 ? machineScenario.dailyRate / availableDailyTime : 0;
    return { ...row, dailyRate: machineScenario.dailyRate, availableDailyTime, requiredPerHour };
  });
}

// =========================
// machineCapacityEngine
// =========================
function computeBoxAdvance(box) {
  const lM = box.l / 100;
  const wM = box.w / 100;
  if (box.advanceSide === 'width') return wM;
  if (box.advanceSide === 'auto')  return Math.min(lM, wM);
  return lM; // 'length' default
}

function computeMachineCapacity(box, machineConfig) {
  const advanceM    = computeBoxAdvance(box);
  const pitchM      = advanceM + (box.gap || 0.10);
  const speedMMin   = machineConfig.maxSpeedMMin;
  const linearMh    = speedMMin * 60;                          // m/h
  const geomBoxesHr = pitchM > 0 ? linearMh / pitchM : 0;    // Cap. real = velocidad banda ÷ pitch
  // La capacidad la define la física de la banda, NO un tope nominal
  const actualBoxesHr = geomBoxesHr;
  const residenceMin  = speedMMin > 0 ? machineConfig.machineLengthM / speedMMin : 0;
  const boxesInside   = pitchM > 0 ? machineConfig.machineLengthM / pitchM : 0;
  return { advanceM, pitchM, speedMMin, linearMh, geomBoxesHr, actualBoxesHr, residenceMin, boxesInside };
}

// =========================
// comparisonEngine
// =========================
function compareScenarioAgainstMachine(box, machineKey, MACHINE_CONFIGS, CUSTOMER_SCENARIOS, manualLinesUsed) {
  const machineConfig = MACHINE_CONFIGS[machineKey];
  const machineScenario = CUSTOMER_SCENARIOS[machineKey];
  if (!machineConfig || !machineScenario) return [];
  const machine = computeMachineCapacity(box, machineConfig);
  const scenarioRows = computeCustomerScenarioTable(machineScenario);
  return scenarioRows.map(row => {
    // Siempre asumimos 1 sola máquina
    const requiredLines = row.requiredPerHour > 0 ? 1 : 0;
      
    const totalBoxesHr = requiredLines * machine.actualBoxesHr;
    const deficitOrSurplus = totalBoxesHr - row.requiredPerHour;
    const coverageRatio = row.requiredPerHour > 0 ? totalBoxesHr / row.requiredPerHour : 0;
    
    return { ...row, machineBoxesPerHour: machine.actualBoxesHr, deficitOrSurplus, coverageRatio, requiredLines };
  });
}

const checkIsGusi = (simId) => {
  if (simId === 'grupo-gusi') return true;
  try {
    const list = JSON.parse(localStorage.getItem('pandora_simulators') || '[]');
    const meta = list.find(s => s.id === simId);
    return !!(meta && meta.name && meta.name.toUpperCase().includes('GUSI'));
  } catch {
    return false;
  }
};

const checkIsIase = (simId) => {
  if (simId === 'iase') return true;
  try {
    const list = JSON.parse(localStorage.getItem('pandora_simulators') || '[]');
    const meta = list.find(s => s.id === simId);
    return !!(meta && meta.name && meta.name.toUpperCase().includes('IASE'));
  } catch {
    return false;
  }
};

export default function DHLSimulator() {
  const { id } = useParams();
  const simulatorId = id || 'dhl';
  const { activeProject, updateProjectName } = useBeta();
  const isGusi = checkIsGusi(simulatorId);
  const isIase = checkIsIase(simulatorId);
  const { finInputs, setFinInputs, finResults } = useFinancialEngine(simulatorId);

  // Estados de notificación de guardado
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const [productImageBase64, setProductImageBase64] = useState(() => {
    return localStorage.getItem(`sim_${simulatorId}_product_image_base64`) || '';
  });

  const handleProductImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Por favor selecciona un archivo de imagen válido (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert('La imagen es demasiado grande. Elige una de menos de 2MB para asegurar un rendimiento óptimo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      setProductImageBase64(base64);
      localStorage.setItem(`sim_${simulatorId}_product_image_base64`, base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProductImage = () => {
    setProductImageBase64('');
    localStorage.removeItem(`sim_${simulatorId}_product_image_base64`);
  };

  const [simulatorMeta, setSimulatorMeta] = useState(() => {
    try {
      const list = JSON.parse(localStorage.getItem('pandora_simulators') || '[]');
      return list.find(s => s.id === simulatorId) || { name: 'DHL', description: 'Línea de lavado y secado para pallets/cajas plásticas (140 m/h max)' };
    } catch {
      return { name: 'DHL', description: 'Línea de lavado y secado para pallets/cajas plásticas (140 m/h max)' };
    }
  });

  useEffect(() => {
    try {
      const list = JSON.parse(localStorage.getItem('pandora_simulators') || '[]');
      const found = list.find(s => s.id === simulatorId);
      if (found) {
        setSimulatorMeta(found);
      } else {
        setSimulatorMeta({ name: 'DHL', description: 'Línea de lavado y secado para pallets/cajas plásticas (140 m/h max)' });
      }
    } catch (e) {
      console.error(e);
    }
  }, [simulatorId]);

  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem(`sim_${simulatorId}_active_tab`) || 'resumen';
  });

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    localStorage.setItem(`sim_${simulatorId}_active_tab`, tabId);
  };

  useEffect(() => {
    if (activeProject?.name && activeProject.name !== simulatorMeta.name) {
      setSimulatorMeta(prev => ({ ...prev, name: activeProject.name }));
      try {
        const list = JSON.parse(localStorage.getItem('pandora_simulators') || '[]');
        let exists = false;
        const updated = list.map(s => {
          if (s.id === simulatorId) {
            exists = true;
            return { ...s, name: activeProject.name };
          }
          return s;
        });
        if (!exists) {
          updated.push({ id: simulatorId, name: activeProject.name, description: simulatorMeta.description });
        }
        localStorage.setItem('pandora_simulators', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }
    }
  }, [activeProject?.name, simulatorId]);

  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState('');

  useEffect(() => {
    if (simulatorMeta.name) {
      setTempTitle(simulatorMeta.name);
    }
  }, [simulatorMeta.name]);

  const handleSaveTitle = () => {
    setIsEditingTitle(false);
    const clean = tempTitle.trim();
    if (clean && clean !== simulatorMeta.name) {
      setSimulatorMeta(prev => ({ ...prev, name: clean }));
      try {
        const list = JSON.parse(localStorage.getItem('pandora_simulators') || '[]');
        let exists = false;
        const updated = list.map(s => {
          if (s.id === simulatorId) {
            exists = true;
            return { ...s, name: clean };
          }
          return s;
        });
        if (!exists) {
          updated.push({ id: simulatorId, name: clean, description: simulatorMeta.description });
        }
        localStorage.setItem('pandora_simulators', JSON.stringify(updated));
      } catch (err) {
        console.error(err);
      }

      if (activeProject) {
        updateProjectName(clean);
      }
    }
  };

  const handleTitleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleSaveTitle();
    }
    if (e.key === 'Escape') {
      setIsEditingTitle(false);
      setTempTitle(simulatorMeta.name || '');
    }
  };

  const [inputs, setInputs] = useState(() => {
    const savedInputs = localStorage.getItem(`sim_${simulatorId}_inputs`);
    if (savedInputs) {
      try {
        const parsed = JSON.parse(savedInputs);
        // Auto-sanar el machineName si es Gusi pero dice PLD (limpieza de estado cruzado)
        if (isGusi && parsed.machineName && parsed.machineName.startsWith('PLD')) {
          parsed.machineName = 'BWD-200';
          parsed.manualSpeed = 2.5; // 150 / 60
          localStorage.setItem(`sim_${simulatorId}_inputs`, JSON.stringify(parsed));
        }
        // Auto-sanar el machineName si es Iase pero dice PLD o BWD (limpieza de estado cruzado)
        if (isIase && parsed.machineName && (parsed.machineName.startsWith('PLD') || parsed.machineName.startsWith('BWD'))) {
          parsed.machineName = 'BDP 150';
          parsed.manualSpeed = 2.5; // 150 / 60
          localStorage.setItem(`sim_${simulatorId}_inputs`, JSON.stringify(parsed));
        }
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    const savedLimit = parseFloat(localStorage.getItem(simulatorId === 'rider' ? 'rider_physical_max_mh' : `sim_${simulatorId}_physical_max_mh`));
    const limit = isNaN(savedLimit) ? ((isGusi || isIase) ? 150 : 140) : savedLimit;
    
    if (isGusi) {
      return {
        machineName: 'BWD-200',
        nominalBoxes: 200,          // Capacidad nominal ofertada
        machineLength: 7.60,
        maxAdvance: 1.40,
        manualSpeed: limit / 60,
        defaultGap: 0.10,
        calcMode: 'manual',
        shifts: 2,
        hoursPerShift: 8,
        daysPerMonth: 26
      };
    }

    if (isIase) {
      return {
        machineName: 'BDP 150',
        nominalBoxes: 200,          // Capacidad nominal ofertada
        machineLength: 7.60,
        maxAdvance: 1.40,
        manualSpeed: limit / 60,
        defaultGap: 0.10,
        calcMode: 'manual',
        shifts: 2,
        hoursPerShift: 8,
        daysPerMonth: 26
      };
    }
    
    return {
      machineName: 'PLD-120 / PLD-140',
      nominalBoxes: 200,          // Capacidad nominal ofertada
      machineLength: 7.60,
      maxAdvance: 1.40,
      manualSpeed: limit / 60,
      defaultGap: 0.10,
      calcMode: 'manual',
      shifts: 2,
      hoursPerShift: 8,
      daysPerMonth: 26
    };
  });

  const [CUSTOMER_SCENARIOS, setCustomerScenarios] = useState(() => {
    const savedScenarios = localStorage.getItem(`sim_${simulatorId}_customer_scenarios`);
    if (savedScenarios) {
      try {
        const parsed = JSON.parse(savedScenarios);
        if (isGusi && parsed.lavadoSecado && parsed.lavadoSecado.dailyRate !== 2200) {
          parsed.lavadoSecado.dailyRate = 2200;
          localStorage.setItem(`sim_${simulatorId}_customer_scenarios`, JSON.stringify(parsed));
        }
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    if (isGusi) {
      return {
        lavadoSecado: {
          ...DEFAULT_SCENARIOS.lavadoSecado,
          dailyRate: 2200
        }
      };
    }
    return { lavadoSecado: DEFAULT_SCENARIOS.lavadoSecado };
  });

  const [MACHINE_CONFIGS, setMachineConfigs] = useState(() => {
    const savedConfigs = localStorage.getItem(`sim_${simulatorId}_machine_configs`);
    if (savedConfigs) {
      try {
        return JSON.parse(savedConfigs);
      } catch (e) {
        console.error(e);
      }
    }
    const savedLimit = parseFloat(localStorage.getItem(simulatorId === 'rider' ? 'rider_physical_max_mh' : `sim_${simulatorId}_physical_max_mh`));
    const limit = isNaN(savedLimit) ? ((isGusi || isIase) ? 150 : 140) : savedLimit;
    return { 
      lavadoSecado: { 
        ...DEFAULT_MACHINE_CONFIGS.lavadoSecado, 
        maxSpeedMMin: limit / 60 
      } 
    };
  });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBoxId, setEditingBoxId] = useState(null);
  const [infoModal, setInfoModal] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configDraft, setConfigDraft] = useState(null);
  const [configTab, setConfigTab] = useState('maquina');
  const [viabilityInfoModal, setViabilityInfoModal] = useState(null);
  const [selectedMixIds, setSelectedMixIds] = useState([]);
  const toggleMix = id => setSelectedMixIds(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  const [editingSpeed, setEditingSpeed] = useState(false);
  const [speedDraft, setSpeedDraft] = useState('');
  const [hoverLed, setHoverLed] = useState(null);
  const [editPct, setEditPct]   = useState(false);
  const [pctDraft, setPctDraft] = useState('');
  const [showCapModal, setShowCapModal] = useState(false);
  // physicalMaxMH: velocidad máxima absoluta de la máquina (fija, no cambia al ajustar %)
  const [physicalMaxMH, setPhysicalMaxMH] = useState(() => {
    const key = simulatorId === 'rider' ? 'rider_physical_max_mh' : `sim_${simulatorId}_physical_max_mh`;
    const saved = parseFloat(localStorage.getItem(key));
    return isNaN(saved) ? ((isGusi || isIase) ? 150 : 140) : saved;
  });
  const [editHrs, setEditHrs]           = useState(false);
  const [hrsDraft, setHrsDraft]         = useState(null); // [{year,effectiveHoursPerShift,shifts}]
  const [installedPowerKw, setInstalledPowerKw] = useState(() => {
    const key = `sim_${simulatorId}_installed_power`;
    const saved = parseFloat(localStorage.getItem(key));
    return isNaN(saved) ? 89.5 : saved;
  });
  const [isEditingPower, setIsEditingPower] = useState(false);
  const [powerDraft, setPowerDraft] = useState('');

  const [manualLinesUsed, setManualLinesUsed] = useState(() => {
    const key = `sim_${simulatorId}_manual_lines_used`;
    const saved = localStorage.getItem(key);
    return saved !== null && saved !== 'null' ? parseInt(saved, 10) : null;
  });

  useEffect(() => {
    const key = `sim_${simulatorId}_manual_lines_used`;
    if (manualLinesUsed === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, manualLinesUsed.toString());
    }
  }, [manualLinesUsed, simulatorId]);

  const [clientName, setClientName] = useState(() => {
    const saved = localStorage.getItem(`sim_${simulatorId}_client_name`);
    if (saved) return saved;
    if (isIase) return 'MÁQUINA EN EVALUACIÓN - BDP 150 | IASE';
    return isGusi 
      ? 'MÁQUINA EN EVALUACIÓN - BWD 200 | GRUPO GUSI' 
      : 'MÁQUINA EN EVALUACIÓN - PLD-140 | DHL';
  });

  const [customerName, setCustomerName] = useState(() => {
    const saved = localStorage.getItem(`sim_${simulatorId}_customer_name`);
    return saved || 'CENTRAL DE INTELIGENCIA';
  });

  useEffect(() => {
    if (activeProject?.name) {
      setCustomerName(activeProject.name);
    }
  }, [activeProject?.name]);

  // ── Estados para el Módulo Hídrico y Sustentabilidad ──
  const [washFlowLh, setWashFlowLh] = useState(() => {
    const saved = parseFloat(localStorage.getItem(`sim_${simulatorId}_wash_flow_lh`));
    return isNaN(saved) ? 1000 : saved;
  });
  const [waterReplenishLh, setWaterReplenishLh] = useState(() => {
    const saved = parseFloat(localStorage.getItem(`sim_${simulatorId}_water_replenish_lh`));
    return isNaN(saved) ? 150 : saved;
  });
  const [tankCapacityL, setTankCapacityL] = useState(() => {
    const saved = parseFloat(localStorage.getItem(`sim_${simulatorId}_tank_capacity_l`));
    return isNaN(saved) ? 1200 : saved;
  });
  const [waterChangeDays, setWaterChangeDays] = useState(() => {
    return localStorage.getItem(`sim_${simulatorId}_water_change_days`) || '3–5';
  });

  const [isEditingWashFlow, setIsEditingWashFlow] = useState(false);
  const [washFlowDraft, setWashFlowDraft] = useState('');
  const [isEditingReplenish, setIsEditingReplenish] = useState(false);
  const [replenishDraft, setReplenishDraft] = useState('');
  const [isEditingTank, setIsEditingTank] = useState(false);
  const [tankDraft, setTankDraft] = useState('');
  const [isEditingChangeDays, setIsEditingChangeDays] = useState(false);
  const [changeDaysDraft, setChangeDaysDraft] = useState('');

  // ── ESC cierra cualquier modal abierto ──────────────────────────────────
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key !== 'Escape') return;
       if (showCapModal)        { setShowCapModal(false);       return; }
      if (isConfigOpen)        { setIsConfigOpen(false);       return; }
      if (isModalOpen)         { setIsModalOpen(false);        return; }
      if (infoModal)           { setInfoModal(null);           return; }
      if (viabilityInfoModal)  { setViabilityInfoModal(null);  return; }
      if (editPct)             { setEditPct(false);            return; }
      if (editingSpeed)        { setEditingSpeed(false);       return; }
      if (editHrs)             { setEditHrs(false);            return; }
      if (nominalCapInfo)      { setNominalCapInfo(null);      return; }
      if (isEditingWashFlow)   { setIsEditingWashFlow(false);   return; }
      if (isEditingReplenish)  { setIsEditingReplenish(false);  return; }
      if (isEditingTank)       { setIsEditingTank(false);       return; }
      if (isEditingChangeDays) { setIsEditingChangeDays(false); return; }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showCapModal, isConfigOpen, isModalOpen, infoModal, viabilityInfoModal, editPct, editingSpeed, editHrs, isEditingWashFlow, isEditingReplenish, isEditingTank, isEditingChangeDays]);

  const [nominalCapInfo, setNominalCapInfo] = useState(null); // { id, geom, label }
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportModalData, setReportModalData] = useState(null);
  const [printWindow, setPrintWindow] = useState(null);
  const [autoPrintReport, setAutoPrintReport] = useState(false);
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [exportProgress, setExportProgress] = useState('');
  const [customFileName, setCustomFileName] = useState('');
  const [showFileNameModal, setShowFileNameModal] = useState(false);
  const [tempFileName, setTempFileName] = useState('');
  const [pdfPendingAction, setPdfPendingAction] = useState(false);

  const handleSetFileName = () => {
    setTempFileName(customFileName);
    setPdfPendingAction(false);
    setShowFileNameModal(true);
  };

  const buildReport = () => {
    const projectSuffix = activeProject?.id ? `${activeProject.id}_` : '';
    const twinSnapshotLateral = localStorage.getItem(`${projectSuffix}twin_snapshot_lateral`);
    const twinSnapshotSuperior = localStorage.getItem(`${projectSuffix}twin_snapshot_superior`);
    const twinSnapshotIsometrica = localStorage.getItem(`${projectSuffix}twin_snapshot_isometrica`);

    return buildRyderReportData({
      inputs, computedRows, scenarioResults, mixScenarioResults,
      CUSTOMER_SCENARIOS, MACHINE_CONFIGS, selectedRow, physicalMaxMH,
      simulatorName: simulatorMeta.name,
      installedPowerKw: totalPowerKw,
      pumpsKw,
      blowersKw,
      heatingKw,
      beltKw,
      washFlowLh,
      waterReplenishLh,
      tankCapacityL,
      waterChangeDays,
      clientName,
      customerName,
      productImageBase64,
      twinSnapshotLateral,
      twinSnapshotSuperior,
      twinSnapshotIsometrica
    });
  };

  const openReportModal = () => {
    setReportModalData(buildReport());
    setPrintWindow(null);
    setShowReportModal(true);
    setShowPdfMenu(false);
  };

  const directExportPDF = () => {
    setShowPdfMenu(false);
    setTempFileName(customFileName || `${simulatorMeta.name}_Informe_Parametrico`);
    setPdfPendingAction(true);
    setShowFileNameModal(true);
  };

  const performActualPdfExport = async (nameToUse) => {
    setIsExportingPdf(true);
    setExportProgress('Preparando datos...');
    setReportModalData(buildReport());
    
    setTimeout(async () => {
      try {
        const [html2canvas, { default: jsPDF }] = await Promise.all([
          import('html2canvas').then(m => m.default),
          import('jspdf'),
        ]);

        const reportContainer = document.getElementById('ry-export-hidden-root');
        if (!reportContainer) {
          throw new Error('No se encontró el contenedor de exportación.');
        }

        const pages = reportContainer.querySelectorAll('.ry-page');
        if (pages.length === 0) {
          throw new Error('No se encontraron las páginas del informe.');
        }

        const pdf = new jsPDF({
          orientation: 'landscape',
          unit: 'mm',
          format: 'a4'
        });

        for (let i = 0; i < pages.length; i++) {
          setExportProgress(`Procesando página ${i + 1} de ${pages.length}...`);
          
          const pageNode = pages[i];
          const canvas = await html2canvas(pageNode, {
            scale: 2.5,
            useCORS: true,
            allowTaint: true,
            logging: false,
            backgroundColor: '#ffffff'
          });

          const imgData = canvas.toDataURL('image/jpeg', 0.95);
          if (i > 0) {
            pdf.addPage();
          }
          pdf.addImage(imgData, 'JPEG', 0, 0, 297, 210);
        }

        setExportProgress('Generando y descargando PDF...');
        
        const fileName = nameToUse 
          ? `${nameToUse.replace(/\.[^/.]+$/, "")}.pdf`
          : `${simulatorMeta.name}_Informe_Parametrico.pdf`;
          
        pdf.save(fileName);
        
        setExportProgress('¡Completado con éxito!');
        setTimeout(() => {
          setIsExportingPdf(false);
        }, 800);
      } catch (err) {
        console.error('Error generating PDF:', err);
        alert('Ocurrió un error al generar el PDF. Por favor, intenta de nuevo.');
        setIsExportingPdf(false);
      }
    }, 1500);
  };
  const handleSaveSimulator = async () => {
    // 1. Guardar localmente
    localStorage.setItem(`sim_${simulatorId}_inputs`, JSON.stringify(inputs));
    localStorage.setItem(`sim_${simulatorId}_customer_scenarios`, JSON.stringify(CUSTOMER_SCENARIOS));
    localStorage.setItem(`sim_${simulatorId}_machine_configs`, JSON.stringify(MACHINE_CONFIGS));
    localStorage.setItem(`sim_${simulatorId}_client_name`, clientName);
    localStorage.setItem(`sim_${simulatorId}_custom_file_name`, customFileName || '');
    localStorage.setItem(`sim_${simulatorId}_boxes`, JSON.stringify(boxes));
    
    if (twinNodes?.length) {
      localStorage.setItem(`sim_${simulatorId}_twin_nodes`, JSON.stringify(twinNodes));
    }
    if (twinEdges?.length) {
      localStorage.setItem(`sim_${simulatorId}_twin_edges`, JSON.stringify(twinEdges));
    }
    if (twinLayout) {
      localStorage.setItem(`sim_${simulatorId}_twin_layout`, JSON.stringify(twinLayout));
    }

    // 2. Guardar en Supabase (puente de guardado)
    if (activeProject && activeProject.id && activeProject.id !== 'local-fallback-id') {
      try {
        const mixR      = computedRows.filter(r => selectedMixIds.includes(r.id));
        const finalMix  = mixR.length ? mixR : (selectedRow ? [selectedRow] : []);
        const avgPitch  = finalMix.length ? (finalMix.reduce((s,r) => s + r.pitch, 0) / finalMix.length) : 0;
        const avgCapH   = avgPitch > 0 ? (physicalMaxMH / avgPitch) : 0;
        const y1Sc      = CUSTOMER_SCENARIOS.lavadoSecado.scenarios[0];
        const y1Efs     = y1Sc.effectiveHoursPerShift;
        const y1Shifts  = y1Sc.shifts;
        const y1H       = y1Efs * y1Shifts;
        const capDay    = Math.round(avgCapH * y1H);

        const payload = {
          project_id: activeProject.id,
          key: `sim_${simulatorId}_data`,
          value: JSON.stringify({
            inputs,
            customerScenarios: CUSTOMER_SCENARIOS,
            machineConfigs: MACHINE_CONFIGS,
            clientName,
            customFileName,
            boxesCount: boxes.length,
            results: {
              dailyCapacityY1: capDay,
              avgCapacityPerHour: Math.round(avgCapH),
              manualSpeedMh: Math.round(inputs.manualSpeed * 60)
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

  const openConfig = () => {
    setConfigDraft(JSON.parse(JSON.stringify({ scenarios: CUSTOMER_SCENARIOS, machines: MACHINE_CONFIGS })));
    setConfigTab('maquina');
    setIsConfigOpen(true);
  };
  const saveConfig = () => {
    // Solo guardar lavadoSecado — descartar cualquier dato obsoleto de 'secado'
    const cleanScenarios = { lavadoSecado: configDraft.scenarios.lavadoSecado };
    const cleanMachines  = { lavadoSecado: configDraft.machines.lavadoSecado };
    setCustomerScenarios(cleanScenarios);
    setMachineConfigs(cleanMachines);
    setIsConfigOpen(false);
  };
  const updateScenarioRow = (machineKey, rowIdx, field, val) => {
    setConfigDraft(prev => {
      const d = JSON.parse(JSON.stringify(prev));
      d.scenarios[machineKey].scenarios[rowIdx][field] = val;
      return d;
    });
  };

  const [boxInput, setBoxInput] = useState({
    advanceSide: 'length',
    color: '#3b82f6',
    maquina: 'lavado_secado',
    suciedad: 'Polvo'
  });

  const [boxes, setBoxes] = useState(() => {
    const savedBoxes = localStorage.getItem(`sim_${simulatorId}_boxes`);
    if (savedBoxes) {
      try {
        const parsed = JSON.parse(savedBoxes);
        const hasDhlBoxes = parsed.some(b => b.id.startsWith('dhl_'));
        if (!hasDhlBoxes || parsed.length === 0) {
          const dhlDefaults = [
            { id:'dhl_ex0', name:'Contenedor DHL FORVIA', l:39.97, w:30.00, h:20.00, gap:0.100, advanceSide:'length', color:'#ffcc00', maquina:'lavado_secado', suciedad:'Polvo', included:true },
            { id:'dhl_ex1', name:'Contenedor CHICO',       l:30.48, w:38.10, h:17.78, gap:0.095, advanceSide:'length', color:'#6b7280', maquina:'lavado_secado', suciedad:'Polvo',  included:true  },
            { id:'dhl_ex2', name:'Contenedor MEDIANO',     l:60.96, w:38.10, h:17.78, gap:0.100, advanceSide:'length', color:'#8b5cf6', maquina:'lavado_secado', suciedad:'Polvo',  included:true  },
            { id:'dhl_ex3', name:'Contenedor Rectangular', l:60.96, w:38.10, h:35.56, gap:0.080, advanceSide:'length', color:'#3b82f6', maquina:'lavado_secado', suciedad:'Polvo',  included:true  },
          ];
          localStorage.setItem(`sim_${simulatorId}_boxes`, JSON.stringify(dhlDefaults));
          return dhlDefaults;
        }
        return parsed;
      } catch (e) {
        console.error(e);
      }
    }
    
    if (isGusi) {
      const gusiDefaults = [
        { id:'gusi_ex0', name:'Canastilla Negra CHICA',  l:60.00, w:40.00, h:26.60, gap:0.100, advanceSide:'length', color:'#6b7280', maquina:'lavado_secado', suciedad:'Polvo', included:true },
        { id:'gusi_ex1', name:'Canastilla Negra GRANDE', l:60.00, w:39.00, h:21.40, gap:0.100, advanceSide:'length', color:'#8b5cf6', maquina:'lavado_secado', suciedad:'Polvo', included:true },
        { id:'gusi_ex2', name:'Canastilla AMARILLA',     l:60.00, w:40.00, h:28.00, gap:0.100, advanceSide:'length', color:'#f59e0b', maquina:'lavado_secado', suciedad:'Polvo', included:true },
        { id:'gusi_ex3', name:'Canastilla Verde',        l:59.00, w:39.00, h:22.30, gap:0.100, advanceSide:'length', color:'#10b981', maquina:'lavado_secado', suciedad:'Polvo', included:true },
      ];
      return gusiDefaults;
    }
    
    return [
      // ── DHL / FORVIA ────────────────────────────────────────────────────────
      { id:'dhl_ex0', name:'Contenedor DHL FORVIA', l:39.97, w:30.00, h:20.00, gap:0.100, advanceSide:'length', color:'#ffcc00', maquina:'lavado_secado', suciedad:'Polvo', included:true },
      { id:'dhl_ex1', name:'Contenedor CHICO',       l:30.48, w:38.10, h:17.78, gap:0.095, advanceSide:'length', color:'#6b7280', maquina:'lavado_secado', suciedad:'Polvo',  included:true  },
      { id:'dhl_ex2', name:'Contenedor MEDIANO',     l:60.96, w:38.10, h:17.78, gap:0.100, advanceSide:'length', color:'#8b5cf6', maquina:'lavado_secado', suciedad:'Polvo',  included:true  },
      { id:'dhl_ex3', name:'Contenedor Rectangular', l:60.96, w:38.10, h:35.56, gap:0.080, advanceSide:'length', color:'#3b82f6', maquina:'lavado_secado', suciedad:'Polvo',  included:true  },
    ];
  });

  const [selectedId, setSelectedId] = useState(() => {
    const savedBoxes = localStorage.getItem(`sim_${simulatorId}_boxes`);
    if (savedBoxes) {
      try {
        const parsed = JSON.parse(savedBoxes);
        return parsed[0]?.id || null;
      } catch (e) {
        console.error(e);
      }
    }
    return 'dhl_ex0';
  });

  // ── Hook de Librería de Diseños 3D de Supabase ──
  const { loadDesign: fetchDesignFromDb, saveDesign: saveDesignToDb } = useFlowDesigns();

  // ── Estados del Twin Digital 3D Independiente para este Simulador ──
  const [twinNodes, setTwinNodes] = useState(() => {
    const saved = localStorage.getItem(`sim_${simulatorId}_twin_nodes`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { console.error(e); }
    }
    return [];
  });

  const [twinEdges, setTwinEdges] = useState(() => {
    const saved = localStorage.getItem(`sim_${simulatorId}_twin_edges`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) { console.error(e); }
    }
    return [];
  });

  const [twinLayout, setTwinLayout] = useState(() => {
    const saved = localStorage.getItem(`sim_${simulatorId}_twin_layout`);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    // Fallback inteligente: Tomar el modelo 3D del Flow Designer si no hay uno propio
    const fallbackLayout = localStorage.getItem('flowDesigner_currentLayout');
    if (fallbackLayout) {
      try { return JSON.parse(fallbackLayout); } catch (e) { console.error(e); }
    }
    return null;
  });

  const [twinLabelHeightOffset, setTwinLabelHeightOffset] = useState(() => {
    const saved = localStorage.getItem(`sim_${simulatorId}_twin_label_height_offset`);
    return saved !== null ? Number(saved) : 0.2;
  });

  const [twinLabelsCollapsed, setTwinLabelsCollapsed] = useState(() => {
    const saved = localStorage.getItem(`sim_${simulatorId}_twin_labels_collapsed`);
    return saved !== null ? saved === 'true' : false;
  });

  // Elevación del piso del modelo 3D + Candado
  const [twinFloorElevation, setTwinFloorElevation] = useState(() => {
    const saved = localStorage.getItem(`sim_${simulatorId}_twin_floor_elevation`);
    return saved !== null ? Number(saved) : 0;
  });
  const [twinFloorLocked, setTwinFloorLocked] = useState(() => {
    const saved = localStorage.getItem(`sim_${simulatorId}_twin_floor_locked`);
    return saved === 'true';
  });

  const [isTwinEditMode, setIsTwinEditMode] = useState(false);
  const [selectedTwinNodeId, setSelectedTwinNodeId] = useState(null);
  const [isDesignsLibraryOpen, setIsDesignsLibraryOpen] = useState(false);
  const [currentDesignId, setCurrentDesignId] = useState(null);

  // --- ESTADOS DE PANTALLA COMPLETA DEL GEMELO DIGITAL ---
  const twinBlockRef = useRef(null);
  const [isTwinBlockFullscreen, setIsTwinBlockFullscreen] = useState(false);
  const [twinTheme, setTwinTheme] = useState('dark');

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


  // Guardar estados del Twin en LocalStorage en cambio
  useEffect(() => {
    localStorage.setItem(`sim_${simulatorId}_twin_nodes`, JSON.stringify(twinNodes));
  }, [twinNodes, simulatorId]);

  useEffect(() => {
    localStorage.setItem(`sim_${simulatorId}_twin_edges`, JSON.stringify(twinEdges));
  }, [twinEdges, simulatorId]);

  useEffect(() => {
    if (twinLayout) {
      localStorage.setItem(`sim_${simulatorId}_twin_layout`, JSON.stringify(twinLayout));
    } else {
      localStorage.removeItem(`sim_${simulatorId}_twin_layout`);
    }
  }, [twinLayout, simulatorId]);

  useEffect(() => {
    localStorage.setItem(`sim_${simulatorId}_twin_label_height_offset`, String(twinLabelHeightOffset));
  }, [twinLabelHeightOffset, simulatorId]);

  useEffect(() => {
    localStorage.setItem(`sim_${simulatorId}_twin_labels_collapsed`, String(twinLabelsCollapsed));
  }, [twinLabelsCollapsed, simulatorId]);

  useEffect(() => {
    localStorage.setItem(`sim_${simulatorId}_twin_floor_elevation`, String(twinFloorElevation));
  }, [twinFloorElevation, simulatorId]);

  useEffect(() => {
    localStorage.setItem(`sim_${simulatorId}_twin_floor_locked`, String(twinFloorLocked));
  }, [twinFloorLocked, simulatorId]);

  const handleLoadDesignFromLibrary = async (designId) => {
    const design = await fetchDesignFromDb(designId);
    if (design) {
      // Solo cargamos el modelo 3D (layout). Los nodos y edges del usuario se mantienen.
      if (design.layout) setTwinLayout(design.layout);
      setCurrentDesignId(designId);
      setIsDesignsLibraryOpen(false);
    }
  };

  // Estado para el modelo pendiente de nombrar y guardar
  const [pendingUpload, setPendingUpload] = useState(null); // { file, processedResult }
  const [uploadModelName, setUploadModelName] = useState('');
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Función genérica para procesar y cargar archivo 3D (soportando arrastrar y soltar)
  const processAndSetupTwinModel = async (file) => {
    if (!file) return;
    try {
      const { process3DFile } = await import('@/utils/fileProcessor');
      const result = await process3DFile(file);
      // Sugerir nombre basado en el nombre del archivo (sin extensión)
      const suggestedName = file.name.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' ');
      setUploadModelName(suggestedName);
      setPendingUpload({ file, processedResult: result });
    } catch (err) {
      console.error(err);
      alert('Error procesando el archivo 3D: ' + err.message);
    }
  };

  // Paso 1: Leer el archivo y mostrar el modal de nombre
  const handleTwinModelUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    // Reset input
    e.target.value = '';
    await processAndSetupTwinModel(file);
  };

  // Paso 2: Guardar en la nube y en la librería local
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

      // Crear la configuración de layout con la URL pública (o blob)
      const layoutRecord = {
        ...processedResult,
        url: publicUrl,
        name: modelName,
        storagePath: storageData?.path || storagePath,
      };

      // Guardar en flow_designs_beta como diseño con solo el layout 3D
      const savedDesign = await saveDesignToDb({
        name: modelName,
        description: `Modelo 3D subido desde el simulador (${ext.toUpperCase()})`,
        nodes: [],
        edges: [],
        layout: layoutRecord,
        customEquipments: null,
      });

      // Aplicar el layout al visor del simulador y limpiar etiquetas anteriores
      setTwinLayout(layoutRecord);
      setTwinNodes([]);
      setTwinEdges([]);
      if (savedDesign?.id) setCurrentDesignId(savedDesign.id);

      setPendingUpload(null);
      setUploadModelName('');
      setUploadProgress(0);
    } catch (err) {
      console.error(err);
      alert('Error guardando en la nube: ' + err.message);
    } finally {
      setIsSavingToCloud(false);
    }
  };

  // Cancelar el modal de nombre
  const handleCancelUpload = () => {
    if (pendingUpload?.processedResult?.url?.startsWith('blob:')) {
      URL.revokeObjectURL(pendingUpload.processedResult.url);
    }
    setPendingUpload(null);
    setUploadModelName('');
  };

  // ── Anclar modelo + etiquetas a este simulador (guardar en la nube) ──
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [isAnchored, setIsAnchored] = useState(true);

  const handleAnchorToSimulator = async () => {
    if (!twinLayout) return;
    setIsAnchoring(true);
    try {
      const anchorData = {
        name: `Twin · ${simulatorId}`,
        description: `Configuración anclada al simulador ${simulatorId}`,
        nodes: twinNodes,
        edges: twinEdges,
        layout: { ...twinLayout, elevation: twinFloorElevation },
        custom_equipments: null,
      };

      if (currentDesignId) {
        // Actualizar el diseño existente en la nube
        const { updateDesign } = await import('@/hooks/useFlowDesigns').then(m => {
          const hook = m.useFlowDesigns;
          return hook;
        }).catch(() => null);
        
        // Usar supabase directo para update
        const { error } = await supabase
          .from('flow_designs_beta')
          .update({
            nodes: twinNodes,
            edges: twinEdges,
            layout: { ...twinLayout, elevation: twinFloorElevation },
            updated_at: new Date().toISOString(),
          })
          .eq('id', currentDesignId);

        if (error) throw error;
      } else {
        // Crear nuevo registro vinculado a este simulador
        const { data, error } = await supabase
          .from('flow_designs_beta')
          .insert([anchorData])
          .select()
          .single();

        if (error) throw error;
        if (data?.id) setCurrentDesignId(data.id);
      }

      // Guardar también en localStorage la referencia
      localStorage.setItem(`sim_${simulatorId}_twin_anchor_id`, currentDesignId || '');
      setIsAnchored(true);
    } catch (err) {
      console.error('[Anchor] Error:', err);
      alert('Error al guardar en la nube: ' + err.message);
    } finally {
      setIsAnchoring(false);
    }
  };

  const handleUpdateTwinNode = (nodeId, updatedData) => {
    setIsAnchored(false);
    setTwinNodes(prev => prev.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            ...updatedData
          }
        };
      }
      return node;
    }));
  };

  const handleDeleteTwinNode = (nodeId) => {
    setIsAnchored(false);
    setTwinNodes(prev => prev.filter(n => n.id !== nodeId));
    setTwinEdges(prev => prev.filter(e => e.source !== nodeId && e.target !== nodeId));
    if (selectedTwinNodeId === nodeId) setSelectedTwinNodeId(null);
  };

  // ── Editor de Fichas y Conectores del Twin ──────────────────────────────────
  const TWIN_CATEGORIES = [
    { key: 'water',       label: 'Agua',         emoji: '💧', color: '#3b82f6' },
    { key: 'electricity', label: 'Electricidad',  emoji: '⚡', color: '#eab308' },
    { key: 'air',         label: 'Aire',          emoji: '🌀', color: '#06b6d4' },
    { key: 'direction',   label: 'Dirección',     emoji: '↗',  color: '#10b981' },
    { key: 'machine',     label: 'Máquina',       emoji: '🏭', color: '#8B5CF6' },
    { key: 'storage',     label: 'Almacén',       emoji: '📦', color: '#f97316' },
    { key: 'process',     label: 'Proceso',       emoji: '🔧', color: '#ec4899' },
  ];
  const COLOR_SWATCHES = ['#ffcc00','#10b981','#8B5CF6','#ec4899','#3b82f6','#f97316','#eab308','#ef4444','#ffffff','#06b6d4'];

  const [showTwinNodeEditor, setShowTwinNodeEditor] = useState(false);
  const [showTwinEdgeEditor, setShowTwinEdgeEditor] = useState(false);
  const [editingTwinNodeId, setEditingTwinNodeId] = useState(null);
  const [twinNodeForm, setTwinNodeForm] = useState({ label: '', type: 'Equipo', category: 'process', color: '#ffcc00', capacity: '', power: '' });
  const [twinEdgeForm, setTwinEdgeForm] = useState({ source: '', target: '', color: '#ffcc00' });

  const resetTwinNodeForm = () => {
    setTwinNodeForm({ label: '', type: 'Equipo', category: 'process', color: '#ffcc00', capacity: '', power: '' });
    setEditingTwinNodeId(null);
  };

  const openAddTwinNode = () => {
    resetTwinNodeForm();
    setShowTwinEdgeEditor(false);
    setShowTwinNodeEditor(true);
  };

  const openEditTwinNode = (node) => {
    setEditingTwinNodeId(node.id);
    setTwinNodeForm({
      label:    node.data?.label    || '',
      type:     node.data?.type     || 'Equipo',
      category: node.data?.category || 'process',
      color:    node.data?.color    || '#ffcc00',
      capacity: String(node.data?.capacity || ''),
      power:    String(node.data?.power    || ''),
    });
    setShowTwinEdgeEditor(false);
    setShowTwinNodeEditor(true);
  };

  const handleSaveTwinNode = () => {
    setIsAnchored(false);
    if (editingTwinNodeId) {
      // Editar nodo existente
      setTwinNodes(prev => prev.map(n => n.id === editingTwinNodeId
        ? { ...n, data: { ...n.data, ...twinNodeForm, capacity: Number(twinNodeForm.capacity) || 0, power: Number(twinNodeForm.power) || 0 } }
        : n
      ));
    } else {
      // Agregar nuevo nodo
      const cat = TWIN_CATEGORIES.find(c => c.key === twinNodeForm.category);
      const newNode = {
        id: `twin_node_${Date.now()}`,
        type: 'custom',
        data: {
          label:    twinNodeForm.label || cat?.label || 'Nuevo Equipo',
          type:     twinNodeForm.type,
          category: twinNodeForm.category,
          color:    twinNodeForm.color,
          capacity: Number(twinNodeForm.capacity) || 0,
          power:    Number(twinNodeForm.power)    || 0,
          position3D: { x: (Math.random() - 0.5) * 12, y: 0.2, z: (Math.random() - 0.5) * 8 }
        }
      };
      setTwinNodes(prev => [...prev, newNode]);
    }
    setShowTwinNodeEditor(false);
    resetTwinNodeForm();
  };

  const handleAddTwinEdge = () => {
    if (!twinEdgeForm.source || !twinEdgeForm.target || twinEdgeForm.source === twinEdgeForm.target) return;
    setIsAnchored(false);
    const newEdge = {
      id:     `twin_edge_${Date.now()}`,
      source: twinEdgeForm.source,
      target: twinEdgeForm.target,
      color:  twinEdgeForm.color,
    };
    setTwinEdges(prev => [...prev, newEdge]);
    setTwinEdgeForm({ source: '', target: '', color: '#ffcc00' });
    setShowTwinEdgeEditor(false);
  };

  const handleSyncFromFlowDesigner = () => {
    if (!window.confirm("¿Seguro que deseas sobrescribir el Twin Digital de este simulador con el diseño global del Flow Designer?")) return;
    setIsAnchored(false);
    
    const fdNodes = localStorage.getItem('flowDesigner_nodes');
    const fdEdges = localStorage.getItem('flowDesigner_edges');
    const fdLayout = localStorage.getItem('flowDesigner_currentLayout');

    if (fdNodes) setTwinNodes(JSON.parse(fdNodes));
    if (fdEdges) setTwinEdges(JSON.parse(fdEdges));
    if (fdLayout) setTwinLayout(JSON.parse(fdLayout));
    
    alert("¡Twin Digital sincronizado correctamente con Flow Designer!");
  };

  const [chatMessages, setChatMessages] = useState([
    { role: 'assistant', content: 'Hola, soy PANDORA. Puedo analizar los datos actuales del simulador o ayudarte a interpretar los resultados. ¿Qué necesitas?' }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatTyping, setIsChatTyping] = useState(false);
  const chatEndRef = useRef(null);

  const scrollToChatBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };
  useEffect(() => {
    if (chatMessages.length > 1) {
      scrollToChatBottom();
    }
  }, [chatMessages, isChatTyping]);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, []);

  const handleInputChange = (field, value) => {
    setInputs(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'manualSpeed' && updated.calcMode === 'manual') {
        updated.manualSpeed = Math.min(value, physicalMaxMH / 60);
      }
      return updated;
    });
  };

  // Aplica la velocidad máxima (m/h) en un único setInputs atómico
  // Y actualiza MACHINE_CONFIGS para que los cálculos de escenario usen la nueva velocidad
  // También actualiza physicalMaxMH (el techo absoluto de la máquina)
  const applyManualSpeed = (mh) => {
    const clamped = Math.min(999, Math.max(1, Number(mh) || 140));
    const mMin = +(clamped / 60).toFixed(6);
    setInputs(prev => ({ ...prev, calcMode: 'manual', manualSpeed: mMin }));
    setMachineConfigs(prev => ({
      lavadoSecado: { ...prev.lavadoSecado, maxSpeedMMin: mMin },
    }));
    // Actualiza el máximo físico cuando se establece manualmente
    setPhysicalMaxMH(clamped);
    const key = simulatorId === 'rider' ? 'rider_physical_max_mh' : `sim_${simulatorId}_physical_max_mh`;
    localStorage.setItem(key, String(clamped));
  };

  // Solo mueve la velocidad operativa como % del physicalMaxMH
  // NO cambia machineConfigs ni physicalMaxMH — solo el speed actual
  const setOperatingPct = (p) => {
    const targetMH = physicalMaxMH * p / 100;
    const mMin = +(targetMH / 60).toFixed(6);
    setInputs(prev => ({ ...prev, calcMode: 'manual', manualSpeed: mMin }));
    // machineConfigs.maxSpeedMMin permanece = physicalMaxMH (no cambia)
  };


  const handleBoxInputChange = (field, value) => {
    setBoxInput(prev => ({ ...prev, [field]: value }));
  };

  const openNewBoxModal = () => {
    setEditingBoxId(null);
    setBoxInput({ 
      name: '', 
      l: 120, 
      w: 100, 
      h: 85, 
      gap: 0.10, 
      advanceSide: 'length', 
      color: '#3b82f6',
      maquina: 'lavado_secado',
      suciedad: 'Polvo'
    });
    setIsModalOpen(true);
  };

  const openEditBoxModal = (box) => {
    setEditingBoxId(box.id);
    setBoxInput({ ...box });
    setIsModalOpen(true);
  };

  const saveBox = () => {
    if (editingBoxId) {
      setBoxes(boxes.map(b => b.id === editingBoxId ? { ...b, ...boxInput } : b));
    } else {
      const newBox = {
        id: 'b' + Date.now(),
        name: boxInput.name || `Modelo ${boxes.length + 1}`,
        ...boxInput,
        included: true // New boxes are included by default
      };
      setBoxes([...boxes, newBox]);
      if (!selectedId) setSelectedId(newBox.id);
    }
    setIsModalOpen(false);
  };

  const clearBoxes = () => {
    setBoxes([]);
    setSelectedId(null);
  };

  const removeBox = (id) => {
    const updated = boxes.filter(b => b.id !== id);
    setBoxes(updated);
    if (selectedId === id) setSelectedId(updated[0]?.id || null);
  };

  const toggleInclusion = (id) => {
    setBoxes(prev => prev.map(b => b.id === id ? { ...b, included: !b.included } : b));
  };

  const distributeGlobalRate = () => {
    if (selectedMixIds.length === 0) return;
    const globalRate = CUSTOMER_SCENARIOS.lavadoSecado.dailyRate;
    const perBox = Math.floor(globalRate / selectedMixIds.length);
    const newReqs = { ...dailyReqs };
    selectedMixIds.forEach(id => {
      newReqs[id] = perBox;
    });
    setDailyReqs(newReqs);
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 600);
  };

  const loadOfficialReqs = () => {
    setDailyReqs({ ...OFFICIAL_REQS });
    setSaveStatus('saving');
    setTimeout(() => setSaveStatus('saved'), 600);
  };

  // ── Req. Diario — valores oficiales pre-cargados (ahora por ID) ──
  const OFFICIAL_REQS = isGusi
    ? { gusi_ex0: 500, gusi_ex1: 500, gusi_ex2: 600, gusi_ex3: 600 }
    : { ex0:1610, ex1:798, ex2:1064, ex4:82, ex5:82, ex6:0 };
  const LS_KEY = simulatorId === 'rider' ? 'rider_daily_reqs_v2' : `sim_${simulatorId}_daily_reqs`;
  const [dailyReqs, setDailyReqs] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      const hasRiderKeys = Object.keys(stored).some(k => k.startsWith('ex') && !k.startsWith('gusi_ex'));
      if (isGusi && hasRiderKeys) {
        localStorage.setItem(LS_KEY, JSON.stringify(OFFICIAL_REQS));
        return OFFICIAL_REQS;
      }
      // Merge: stored values override official defaults
      return { ...OFFICIAL_REQS, ...stored };
    } catch { return OFFICIAL_REQS; }
  });
  const [reqLocked,  setReqLocked]  = useState(() => {
    try { return JSON.parse(localStorage.getItem(`sim_${simulatorId}_req_locked`) || 'false'); } catch { return false; }
  });
  const [saveStatus, setSaveStatus] = useState('idle');
  const saveTimer = useRef(null);

  // Guardar en localStorage siempre que cambie dailyReqs
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(dailyReqs));
  }, [dailyReqs, LS_KEY]);

  // Guardar estado del candado
  useEffect(() => {
    localStorage.setItem(`sim_${simulatorId}_req_locked`, JSON.stringify(reqLocked));
  }, [reqLocked, simulatorId]);

  // Guardar todos los estados sincronizados a localStorage en cambio
  useEffect(() => {
    localStorage.setItem(`sim_${simulatorId}_inputs`, JSON.stringify(inputs));
  }, [inputs, simulatorId]);

  useEffect(() => {
    localStorage.setItem(`sim_${simulatorId}_customer_scenarios`, JSON.stringify(CUSTOMER_SCENARIOS));
  }, [CUSTOMER_SCENARIOS, simulatorId]);

  useEffect(() => {
    localStorage.setItem(`sim_${simulatorId}_machine_configs`, JSON.stringify(MACHINE_CONFIGS));
  }, [MACHINE_CONFIGS, simulatorId]);

  useEffect(() => {
    localStorage.setItem(`sim_${simulatorId}_boxes`, JSON.stringify(boxes));
  }, [boxes, simulatorId]);

  useEffect(() => {
    const key = simulatorId === 'rider' ? 'rider_physical_max_mh' : `sim_${simulatorId}_physical_max_mh`;
    localStorage.setItem(key, String(physicalMaxMH));
  }, [physicalMaxMH, simulatorId]);

  // Backup a Supabase (best-effort, no bloquea si falla)
  const updateBoxRequirement = useCallback((id, reqDaily) => {
    if (reqLocked) return;  // Bloqueado — no permitir cambios
    setDailyReqs(prev => ({ ...prev, [id]: reqDaily }));
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await supabase
          .from('rider_daily_reqs')
          .upsert({ box_id: id, required_daily: reqDaily }, { onConflict: 'box_id' });
      } catch (_) {/* Supabase opcional */}
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 600);
  }, [reqLocked]);

  // Computations
  const NOMINAL_CAP = 200; // Referencia nominal del equipo (solo etiqueta, NO limita el cálculo)

  const computedRows = useMemo(() => {
    let activeIndex = 0;
    return boxes.map(box => {
      // Cálculo dinámico de letra (Consecutiva solo para incluidos)
      const dynamicLabel = box.included ? nextLetter(activeIndex++) : '-';
      
      let advance = box.l / 100;
      if (box.advanceSide === 'width') advance = box.w / 100;
      if (box.advanceSide === 'auto')  advance = Math.min(box.l / 100, box.w / 100);

      const pitch   = advance + box.gap;
      const speed   = inputs.calcMode === 'derive_nominal'
        ? (pitch * inputs.nominalBoxes) / 60
        : inputs.manualSpeed;

      const linearMh          = speed * 60;
      const geometricBoxesHr  = pitch > 0 ? linearMh / pitch : 0;
      const realBoxesHr       = geometricBoxesHr;
      const residenceMin      = speed > 0 ? inputs.machineLength / speed : 0;
      const inside            = pitch > 0 ? inputs.machineLength / pitch : 0;

      const boxesPerShift  = realBoxesHr * inputs.hoursPerShift;
      const boxesPerDay    = boxesPerShift * inputs.shifts;
      const boxesPerMonth  = boxesPerDay * (inputs.daysPerMonth || 26);
      const requiredDaily  = dailyReqs[box.id] ?? 0;
      const requiredHours  = realBoxesHr > 0 ? requiredDaily / realBoxesHr : 0;
      const totalHoursDay  = inputs.shifts * inputs.hoursPerShift;

      return {
        ...box,
        label: dynamicLabel,
        advance, pitch, speed, linearMh, geometricBoxesHr, realBoxesHr, residenceMin, inside,
        boxesPerShift, boxesPerDay, boxesPerMonth, requiredDaily, requiredHours, totalHoursDay
      };
    });
  }, [boxes, inputs, dailyReqs]);

  const selectedRow = computedRows.find(r => r.id === selectedId) || computedRows[0];
  const largestRow  = [...computedRows].sort((a,b) => b.advance - a.advance)[0];
  const currentSpeed = selectedRow?.speed ?? (physicalMaxMH / 60);

  // ── Grupos por tipo de máquina ──────────────────────────────────────────
  const lavadoRows   = computedRows.filter(r => r.maquina === 'lavado_secado');
  const secadoRows   = computedRows.filter(r => r.maquina === 'secado');
  const excluidos    = computedRows.filter(r => r.maquina === 'no');

  // ── Horas totales requeridas por grupo (basado estricatmente en la SELECCIÓN del Mix) ──
  const selectedMixRows = computedRows.filter(r => selectedMixIds.includes(r.id));
  const totalHrsLavado = selectedMixRows.filter(r => r.maquina === 'lavado_secado').reduce((s, r) => s + r.requiredHours, 0);
  const totalHrsSecado = selectedMixRows.filter(r => r.maquina === 'secado').reduce((s, r) => s + r.requiredHours, 0);
  const totalLavadoReq = selectedMixRows.filter(r => r.maquina === 'lavado_secado').reduce((s, r) => s + r.requiredDaily, 0);
  const totalSecadoReq = selectedMixRows.filter(r => r.maquina === 'secado').reduce((s, r) => s + r.requiredDaily, 0);

  // ── Viabilidad por mix (Y1-Y5) — no por producto individual ──────────────
  const CLIENT_SCENARIOS = CUSTOMER_SCENARIOS.lavadoSecado?.scenarios ?? [];

  // ── Cálculos Dinámicos del Mix y Capacidad Y1 (para tarjetas y reportes) ──
  const mixRForShared = computedRows.filter(r => selectedMixIds.includes(r.id));
  const finalMixForShared = mixRForShared.length ? mixRForShared : (selectedRow ? [selectedRow] : []);
  const avgPitchForShared = finalMixForShared.length ? (finalMixForShared.reduce((s, r) => s + r.pitch, 0) / finalMixForShared.length) : 0;
  const avgCapHForShared = avgPitchForShared > 0 ? (physicalMaxMH / avgPitchForShared) : 0;
  
  const y1ScForShared = CLIENT_SCENARIOS[0] || { effectiveHoursPerShift: 8, shifts: 2 };
  const y1HForShared = y1ScForShared.effectiveHoursPerShift * y1ScForShared.shifts;
  const mixCapacityDailyY1 = Math.round(avgCapHForShared * y1HForShared);

  const activeCapacityPerHour = mixRForShared.length > 0 ? avgCapHForShared : (selectedRow?.realBoxesHr || 0);

  // ── Cálculos de Potencia Dinámica basados en Fichas del Twin 3D ──
  const getTwinPowerByCategory = (nodes) => {
    let heating = 0;
    let pumps = 0;
    let blowers = 0;
    let belt = 0;
    let other = 0;

    nodes.forEach(n => {
      const label = (n.data?.label || '').toLowerCase();
      const cat = (n.data?.category || '').toLowerCase();
      const power = Number(n.data?.power) || 0;

      if (label.includes('calent') || label.includes('heating') || label.includes('calor') || label.includes('resistencia')) {
        heating += power;
      } else if (label.includes('bomba') || label.includes('pump') || label.includes('hidr') || cat === 'water') {
        pumps += power;
      } else if (label.includes('sopla') || label.includes('blower') || label.includes('turbin') || label.includes('secad') || label.includes('extractor') || cat === 'air') {
        blowers += power;
      } else if (label.includes('banda') || label.includes('belt') || label.includes('motor') || cat === 'direction' || label.includes('transportador')) {
        belt += power;
      } else {
        if (cat === 'electricity') {
          heating += power;
        } else if (cat === 'water') {
          pumps += power;
        } else if (cat === 'air') {
          blowers += power;
        } else if (cat === 'direction') {
          belt += power;
        } else {
          other += power;
        }
      }
    });

    return { heating, pumps, blowers, belt, other };
  };

  const twinPowers = getTwinPowerByCategory(twinNodes);
  const hasTwinPowers = (twinPowers.heating + twinPowers.pumps + twinPowers.blowers + twinPowers.belt + twinPowers.other) > 0;

  const totalPowerKw = hasTwinPowers 
    ? (twinPowers.heating + twinPowers.pumps + twinPowers.blowers + twinPowers.belt + twinPowers.other)
    : installedPowerKw;

  const heatingKw = hasTwinPowers ? twinPowers.heating : totalPowerKw * (36.0 / 89.5);
  const pumpsKw   = hasTwinPowers ? twinPowers.pumps   : totalPowerKw * (30.0 / 89.5);
  const blowersKw = hasTwinPowers ? twinPowers.blowers : totalPowerKw * (22.0 / 89.5);
  const beltKw    = hasTwinPowers ? twinPowers.belt    : totalPowerKw * (1.5 / 89.5);
  const mixScenarioResults = useMemo(() => {
    return CLIENT_SCENARIOS.map(sc => {
      const avail = sc.effectiveHoursPerShift * sc.shifts;
      return {
        year:   sc.year,
        hrsBase: sc.hrsBase,
        effectiveHoursPerShift: sc.effectiveHoursPerShift,
        shifts:  sc.shifts,
        availableDailyTime: avail,
        // Lavado+Secado
        lavado: {
          requiredHoursTotal: totalHrsLavado,
          deficitOrSurplusHours: avail - totalHrsLavado,
          linesRequired: avail > 0 && totalHrsLavado > 0 ? 1 : 0,
          status: avail >= totalHrsLavado ? 'VIABLE' : 'NO VIABLE',
        },
        // Solo Secado
        secado: {
          requiredHoursTotal: totalHrsSecado,
          deficitOrSurplusHours: avail - totalHrsSecado,
          linesRequired: avail > 0 && totalHrsSecado > 0 ? 1 : 0,
          status: avail >= totalHrsSecado ? 'VIABLE' : 'NO VIABLE',
        },
      };
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalHrsLavado, totalHrsSecado, JSON.stringify(CLIENT_SCENARIOS)]);

  // ── Legacy scenarioResults (mantener por compatibilidad UI existente) ────
  const scenarioResults = useMemo(() => {
    if (!selectedRow) return { lavadoSecado: [] };
    const sc = CUSTOMER_SCENARIOS.lavadoSecado;
    const isAuto = sc?.mode === 'auto';
    const sumAllModels = computedRows.reduce((s, r) => s + (r.requiredDaily || 0), 0);
    const rateToUse = isAuto ? sumAllModels : (sc?.dailyRate ?? 3472);

    const scLavado = { ...sc, dailyRate: rateToUse };
    return {
      lavadoSecado: compareScenarioAgainstMachine(selectedRow, 'lavadoSecado', MACHINE_CONFIGS, { lavadoSecado: scLavado }, manualLinesUsed),
    };
  }, [selectedRow, MACHINE_CONFIGS, CUSTOMER_SCENARIOS, computedRows, manualLinesUsed]);

  const worstLavado = scenarioResults.lavadoSecado.reduce((max, r) => r.requiredLines > max ? r.requiredLines : max, 0);

  const exportCsv = () => {
    const csv = [
      ['Modelo', 'Nombre', 'Largo (cm)', 'Ancho (cm)', 'Alto (cm)', 'Avance (m)', 'Gap (m)', 'Paso (m)', 'Vel. (m/min)', 'm/h', 'Cap. Geom. (cajas/h)', 'Cap. Real (cajas/h)', 'Residencia (min)', 'Cajas Dentro'],
      ...computedRows.map(r => [
        r.label, r.name, r.l, r.w, r.h, r.advance.toFixed(3), r.gap.toFixed(3), r.pitch.toFixed(3), r.speed.toFixed(3), r.linearMh.toFixed(3), r.geometricBoxesHr.toFixed(3), r.realBoxesHr.toFixed(3), r.residenceMin.toFixed(3), r.inside.toFixed(3)
      ])
    ].map(e => e.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${customFileName || `${simulatorMeta.name}_Simulador`}.csv`;
    link.click();
  };

  const handleChatSend = async (e) => {
    if (e) e.preventDefault();
    if (!chatInput.trim() || isChatTyping) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatTyping(true);

    try {
      const contextStr = `
=== CONTEXTO DEL SIMULADOR ${simulatorMeta.name} ===
Configuración actual:
${JSON.stringify(inputs, null, 2)}
Modelos activos (${boxes.length}):
${JSON.stringify(boxes, null, 2)}
Resultados calculados:
${JSON.stringify(computedRows, null, 2)}

El usuario está viendo este simulador. Ayúdale a analizar, tomar decisiones o dile qué ajustes hacer.
PREGUNTA DEL USUARIO:
${userMsg}
      `.trim();

      const response = await axios.post('/api/pandora/v2/execute', {
        message: contextStr,
        projectId: 'local-fallback-id',
        companyId: 'local_company',
        v2: true,
        projectContext: { type: 'simulator', name: simulatorMeta.name, data: inputs }
      });

      if (response.data && response.data.success) {
        setChatMessages(prev => [...prev, { role: 'assistant', content: response.data.output }]);
      } else {
        setChatMessages(prev => [...prev, { role: 'assistant', content: 'Error: No se recibió una respuesta válida del motor.' }]);
      }
    } catch (error) {
      console.error('PANDORA_RYDER_ERROR:', error);
      const errorMsg = error.response?.data?.error || error.response?.data?.message || error.message || 'Error desconocido';
      setChatMessages(prev => [...prev, { role: 'assistant', content: `❌ Error V3: ${errorMsg}` }]);
    } finally {
      setIsChatTyping(false);
    }
  };

  // ── exportForAI — Reporte Markdown para evaluación técnica por IA ───────────────────
  const exportForAI = () => {
    const ts = new Date().toLocaleString('es-MX');
    const sc = CUSTOMER_SCENARIOS.lavadoSecado;
    const machineCfg = MACHINE_CONFIGS.lavadoSecado;

    let md = [];
    md.push(`# PANDORA 3.0 — Reporte Técnico ${simulatorMeta.name} Simulator`);
    md.push(`**Exportado:** ${ts}  |  **Modelo seleccionado:** ${selectedRow?.name ?? '—'}  |  **Ver:** 7.80\n`);
    md.push(`---`);
    md.push(`\n## CONTEXTO DEL SISTEMA`);
    md.push(`Este simulador calcula la capacidad operativa de una línea de lavado y secado industrial (tipo ${simulatorMeta.name}/PLD).`);
    md.push(`Evalúa si la máquina puede procesar el volumen de cajas requerido por el cliente bajo distintos escenarios de eficiencia anual (Y1–Y5).\n`);

    // 1. Configuración de máquina
    md.push(`## 1. CONFIGURACIÓN DE MÁQUINA (Lavadora + Secadora)`);
    md.push(`| Parámetro | Valor |`);
    md.push(`|---|---|`);
    md.push(`| Nombre | ${machineCfg?.machineName ?? '—'} |`);
    md.push(`| Longitud | ${machineCfg?.machineLengthM ?? '—'} m |`);
    md.push(`| Vel. máx. configurada | ${(machineCfg?.maxSpeedMMin ?? 0).toFixed(4)} m/min (${((machineCfg?.maxSpeedMMin ?? 0) * 60).toFixed(1)} m/h) |`);
    md.push(`| Vel. máx. física (physicalMaxMH) | ${physicalMaxMH.toFixed(1)} m/h |`);
    md.push(`| Modo de cálculo | ${inputs.calcMode === 'manual' ? 'Manual (velocidad fija)' : 'Derivado de cajas nominales'} |`);
    md.push(`| Velocidad operativa actual | ${(inputs.manualSpeed * 60).toFixed(2)} m/h |`);
    md.push(`| Turnos | ${inputs.shifts} |`);
    md.push(`| Horas/turno base | ${inputs.hoursPerShift} |`);
    md.push(`| Días/mes | ${inputs.daysPerMonth} |\n`);

    // 2. Modelos de caja evaluados
    const selectedMixRows = computedRows.filter(r => selectedMixIds.includes(r.id));
    md.push(`## 2. MODELOS DE CAJA EVALUADOS (${selectedMixRows.length} modelos seleccionados)`);
    md.push(`> **Fórmulas clave:**`);
    md.push(`> - Avance = min(largo, ancho) en metros (lado menor de la caja)`);
    md.push(`> - Paso (Pitch) = Avance + Gap`);
    md.push(`> - Cap. Geom. (cajas/h) = Velocidad (m/h) ÷ Pitch (m)`);
    md.push(`> - Residencia (min) = Longitud máquina ÷ Velocidad (m/min)`);
    md.push(`> - Cajas dentro = Longitud máquina ÷ Pitch`);
    md.push('');
    md.push(`| Mod | Nombre | L(cm) | A(cm) | H(cm) | Avance(m) | Gap(m) | Pitch(m) | Vel(m/h) | Cap.Geom(c/h) | Cap.Real(c/h) | Resid(min) | Dentro | Req.Diário | Req(h) |`);
    md.push(`|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
    selectedMixRows.forEach(r => {
      md.push(`| ${r.label} | ${r.name} | ${r.l} | ${r.w} | ${r.h} | ${r.advance.toFixed(3)} | ${r.gap.toFixed(3)} | ${r.pitch.toFixed(3)} | ${r.linearMh.toFixed(2)} | ${r.geometricBoxesHr.toFixed(1)} | ${r.realBoxesHr.toFixed(1)} | ${r.residenceMin.toFixed(2)} | ${r.inside.toFixed(1)} | ${r.requiredDaily.toLocaleString('es-MX')} | ${r.requiredHours.toFixed(2)} |`);
    });
    md.push('');

    // 3. Escenario cliente Y1-Y5
    md.push(`## 3. ESCENARIO CLIENTE — ${sc?.name ?? 'Lavado y Secado'}`);
    md.push(`**Rate diario requerido:** ${(sc?.dailyRate ?? 0).toLocaleString('es-MX')} cajas/día`);
    md.push('');
    md.push(`| Año | Hrs.Base | Hrs.Ef/Turno | Turnos | Hrs.Efectivas/Día | Req/h (vs ${selectedRow?.name ?? 'modelo sel.'}) | Cap.Máq (c/h) | Líneas Req. | Cobertura | Δ Déficit |`);
    md.push(`|---|---|---|---|---|---|---|---|---|---|`);
    scenarioResults.lavadoSecado.forEach(r => {
      const cov = (r.coverageRatio * 100).toFixed(1);
      const delta = r.deficitOrSurplus >= 0 ? `+${r.deficitOrSurplus.toFixed(1)} (SUPERÁVIT)` : `${r.deficitOrSurplus.toFixed(1)} (DÉFICIT)`;
      md.push(`| ${r.year} | ${r.hrsBase} | ${r.effectiveHoursPerShift.toFixed(2)} | ${r.shifts} | ${r.availableDailyTime.toFixed(2)} | ${r.requiredPerHour.toFixed(2)} | ${r.machineBoxesPerHour.toFixed(2)} | ${r.requiredLines} | ${cov}% | ${delta} |`);
    });
    md.push('');

    // 4. Resumen de viabilidad
    md.push(`## 4. RESUMEN DE VIABILIDAD`);
    const best  = scenarioResults.lavadoSecado[0];
    const worst = scenarioResults.lavadoSecado[scenarioResults.lavadoSecado.length - 1];
    md.push(`| Métrica | Y1 (mejor caso) | Y5 (peor caso) |`);
    md.push(`|---|---|---|`);
    md.push(`| Cajas/h máquina | ${best?.machineBoxesPerHour?.toFixed(2) ?? '—'} | ${worst?.machineBoxesPerHour?.toFixed(2) ?? '—'} |`);
    md.push(`| Req/h cliente | ${best?.requiredPerHour?.toFixed(2) ?? '—'} | ${worst?.requiredPerHour?.toFixed(2) ?? '—'} |`);
    md.push(`| Líneas requeridas | ${best?.requiredLines ?? '—'} | ${worst?.requiredLines ?? '—'} |`);
    md.push(`| Cobertura | ${best ? (best.coverageRatio * 100).toFixed(1) + '%' : '—'} | ${worst ? (worst.coverageRatio * 100).toFixed(1) + '%' : '—'} |`);
    md.push(`| Estado | ${best?.coverageRatio >= 1 ? '✅ VIABLE' : '❌ INSUFICIENTE'} | ${worst?.coverageRatio >= 1 ? '✅ VIABLE' : '❌ INSUFICIENTE'} |`);
    md.push('');

    // 5. Requerimientos diarios por modelo
    md.push(`## 5. REQUERIMIENTOS DIARIOS POR MODELO`);
    md.push(`| Modelo | Req. Diario (cajas) | Cap. Real (c/h) | Horas necesarias |`);
    md.push(`|---|---|---|---|`);
    selectedMixRows.forEach(r => {
      md.push(`| ${r.label} — ${r.name} | ${r.requiredDaily.toLocaleString('es-MX')} | ${r.realBoxesHr.toFixed(1)} | ${r.requiredHours.toFixed(2)} h |`);
    });
    md.push('');

    // 6. Prompt para IA
    md.push(`---`);
    md.push(`1. **Precisión de fórmulas**: ¿Son correctas las fórmulas de capacidad, residencia y paso? Revisa la coherencia entre Pitch = Avance + Gap y Cap. Geom. = Vel / Pitch.`);
    md.push(`2. **Viabilidad del escenario**: Con los datos de Y1 a Y5, ¿puede una sola línea cubrir el rate diario del cliente? ¿En qué año se vuelve crítico?`);
    md.push(`3. **Modelo crítico**: ¿Qué modelo de caja representa el cuello de botella más severo? ¿Por qué?`);
    md.push(`4. **Consistencia de datos**: ¿Hay alguna incoherencia entre los valores calculados? (ej. horas requeridas > horas disponibles)`);
    md.push(`5. **Recomendaciones**: Sugiere ajustes de parámetros (velocidad, turnos, horas efectivas) para maximizar la cobertura en Y5.`);
    md.push(`6. **Riesgos operativos**: Identifica riesgos en la operación basado en los márgenes de cobertura.`);

    const fullReport = md.join('\n');

    // Descargar como .md
    const blob = new Blob([fullReport], { type: 'text/markdown;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `PANDORA_AI_Report_${Date.now()}.md`;
    link.click();

    // También copiar al clipboard
    navigator.clipboard?.writeText(fullReport).catch(() => {});
  };

  // ── exportPDF — Reporte Ejecutivo ──────────────────────────────
  const exportPDF = () => {
    const doc  = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const W    = 297;
    const H    = 210;
    const ts   = new Date().toLocaleString('es-MX');
    const speedMH   = +(inputs.manualSpeed * 60).toFixed(1);
    const mixRows   = selectedMixIds.length > 0
      ? computedRows.filter(r => selectedMixIds.includes(r.id))
      : computedRows;


    // PALETTE — light premium (white bg, dark text, colored accents)
    const C = {
      bg:      [252, 252, 255],   // off-white page
      panel:   [255, 255, 255],   // card white
      panel2:  [245, 247, 252],   // alt row light blue-gray
      card:    [248, 250, 255],   // KPI card very light
      border:  [220, 225, 238],   // soft border
      header:  [15,  20,  40],    // header bar dark navy
      accent1: [0,   170, 200],   // cyan
      accent2: [60,  100, 220],   // blue
      accent3: [110, 65,  210],   // purple
      accent4: [220, 85,  30],    // orange
      accent5: [30,  170, 100],   // green
      white:   [255, 255, 255],
      gray1:   [20,  25,  40],    // primary text dark
      gray2:   [90,  100, 130],   // secondary text
      gray3:   [200, 205, 220],   // divider
      red:     [200, 35,  35],    // danger
      redL:    [220, 50,  50],
    };

    const fill   = (...c) => doc.setFillColor(...c);
    const stroke = (...c) => doc.setDrawColor(...c);
    const text   = (...c) => doc.setTextColor(...c);
    const font   = (sty,sz) => { doc.setFont('helvetica', sty); doc.setFontSize(sz); };
    const rect   = (x,y,w,h,m='F') => doc.rect(x,y,w,h,m);
    const lbl    = (s,x,y,o={}) => doc.text(s,x,y,o);
    const rrect  = (x,y,w,h,r,m='F') => doc.roundedRect(x,y,w,h,r,r,m);

    const addBG = () => {
      fill(...C.bg); rect(0,0,W,H);
      // Very subtle mesh
      stroke(230,232,242); doc.setLineWidth(0.06);
      for(let i=0;i<W;i+=20){ doc.line(i,0,i,H); }
      for(let j=0;j<H;j+=20){ doc.line(0,j,W,j); }
    };

    // ── PAGE 1
    addBG();

    // ── Header gradient bar ──────────────────────────────────────────
    fill(...C.header); rect(0,0,W,22);
    // Cyan accent stripe
    fill(...C.accent1); rect(0,21.5,W,0.8);
    // Brand name
    text(...C.accent1); font('bold',16);
    lbl(simulatorMeta.name, 12, 14);
    const rW = doc.getTextWidth(simulatorMeta.name);
    text(...C.gray2); font('normal',10);
    lbl('  —  Reporte de Simulacion Industrial', 12+rW, 14);
    // Right meta
    text(...C.gray2); font('normal',6);
    lbl(`${inputs.machineName}  |  Velocidad: ${speedMH} m/h  |  ${ts}`, W-10, 8, {align:'right'});
    lbl(`Mix: ${selectedMixIds.length>0?selectedMixIds.length+' modelo(s)':'Todos los modelos'}`, W-10, 16, {align:'right'});

    let curY = 28;

    // ── KPI Cards ────────────────────────────────────────────────────
    const kpiData = (() => {
      const avg = mixRows.length ? mixRows.reduce((s,r)=>s+r.realBoxesHr,0)/mixRows.length : 0;
      const tot = mixRows.reduce((s,r)=>s+(r.requiredDaily||0),0);
      const y1h = CUSTOMER_SCENARIOS.lavadoSecado.scenarios[0].effectiveHoursPerShift*2;
      const cap = avg*y1h;
      const cov = cap>0 ? Math.min(100,(cap/Math.max(1,tot))*100) : 0;
      return [
        {l:'VEL. BANDA',      v:String(speedMH),                         u:'m/h',    ac:C.accent1},
        {l:'CAP. PROM/H',     v:String(Math.round(avg)),                 u:'c/h',    ac:C.accent2},
        {l:'CAP. DÍA (Y1)',   v:Math.round(cap).toLocaleString('es-MX'), u:'cajas',  ac:C.accent3},
        {l:'REQ. TOTAL/DÍA',  v:tot>0?tot.toLocaleString('es-MX'):'--', u:'cajas',  ac:C.accent4},
        {l:'COBERTURA Y1',    v:cov.toFixed(1),                          u:'%',      ac:C.accent5},
      ];
    })();

    const kW=54, kH=36, kGap=2.5;
    kpiData.forEach((k,i)=>{
      const x = 10 + i*(kW+kGap);
      // Card bg
      fill(...C.card); rrect(x, curY, kW, kH, 1.5);
      // Top accent bar (color per card)
      fill(...k.ac); rrect(x, curY, kW, 4, 1.5);
      fill(...k.ac); rect(x, curY+2, kW, 2);           // square bottom of accent
      // Subtle border
      stroke(...C.border); doc.setLineWidth(0.25); rrect(x,curY,kW,kH,1.5,'S');
      // Label (+20%: 5.5→6.5)
      text(...C.gray2); font('bold',6.5);
      lbl(k.l, x+4, curY+11);
      // Value (+20%: 14→17) — measure width BEFORE changing font
      text(...k.ac); font('bold',17);
      const valW = doc.getTextWidth(k.v);
      lbl(k.v, x+4, curY+28);
      // Unit (+20%: 6→7) inline right, 3mm gap
      text(...C.gray2); font('normal',7);
      lbl(k.u, x+4+valW+3, curY+28);
    });
    curY += kH+6;


    // ── SPEED BAR — redesigned ────────────────────────────────────────
    const useP = Math.min(100,(speedMH/physicalMaxMH*100));
    // Title (+30%: 8→10)
    text(...C.accent1); font('bold',10);
    lbl('VELOCIDAD DE LÍNEA  —  UTILIZACIÓN', 10, curY+5);
    // Subtitle (+30%: 7→9)
    text(...C.gray2); font('normal',9);
    lbl(`Banda: ${speedMH} m/h  |  Límite: ${physicalMaxMH} m/h`, 10, curY+12);

    // % Badge pill (top-right)
    const bdgW=32, bdgH=16, bdgX=W-bdgW-10, bdgY=curY;
    fill(...C.accent1); rrect(bdgX, bdgY, bdgW, bdgH, 3);
    text(...C.white); font('bold',11);
    lbl(`${useP.toFixed(1)}%`, bdgX+bdgW/2, bdgY+8, {align:'center'});
    text(...C.white); font('normal',5.5);
    lbl('UTILIZACIÓN', bdgX+bdgW/2, bdgY+13, {align:'center'});

    // Bar track
    const sbX=10, sbY=curY+16, sbW=W-20, sbH=14;
    fill(...C.panel2); rrect(sbX,sbY,sbW,sbH,2);

    // Gradient fill — cyan→blue→indigo
    const usedW = sbW * Math.min(1, speedMH/physicalMaxMH);
    const segs=80;
    for(let s=0;s<segs;s++){
      const sx=sbX+(sbW/segs)*s, sw=sbW/segs+0.15;
      if(sx-sbX<usedW){
        const t=s/segs;
        fill(Math.round(0+t*60), Math.round(185-t*65), Math.round(215-t*15));
        rect(sx,sbY,sw,sbH);
      }
    }
    // Clear unfilled zone (overwrite with bg color for clean edge)
    fill(...C.panel2); rect(sbX+usedW, sbY, sbW-usedW+0.5, sbH);
    // Track border
    stroke(...C.border); doc.setLineWidth(0.3); rrect(sbX,sbY,sbW,sbH,2,'S');

    // Speed label inside bar (white)
    if(usedW>25){
      text(...C.white); font('bold',9);
      lbl(`${speedMH} m/h`, sbX+usedW-3, sbY+9.5, {align:'right'});
    }

    // Vertical marker at usage point
    stroke(...C.white); doc.setLineWidth(0.8);
    doc.line(sbX+usedW, sbY+1, sbX+usedW, sbY+sbH-1);

    // Tick marks + % labels (+30%: 5.2→7)
    for(let t=0;t<=10;t++){
      const tx=sbX+sbW*t/10;
      stroke(...C.gray3); doc.setLineWidth(0.3);
      doc.line(tx, sbY+sbH+0.5, tx, sbY+sbH+3);
      text(...C.gray2); font('normal',7);
      lbl(t*10+'%', tx, sbY+sbH+7.5, {align:'center'});
    }
    curY += sbH+30;   // +10mm gap between chart and table

    // Products table
    text(...C.accent1); font('bold',8);
    lbl('MODELOS  —  CAPACIDAD vs REQUERIMIENTO', 10, curY+4);
    curY += 6;

    autoTable(doc,{
      startY: curY,
      head:[['Mod','Nombre','Dim (cm)','Vel m/h','Cap c/h','Cap/Día','Cap/Mes','Req/Día','Hrs req.','Estado']],
      body: mixRows.map(r=>[
        r.label, r.name, `${r.l}x${r.w}x${r.h}`,
        r.linearMh.toFixed(1), r.realBoxesHr.toFixed(1),
        Math.round(r.boxesPerDay).toLocaleString('es-MX'),
        Math.round(r.boxesPerMonth).toLocaleString('es-MX'),
        r.requiredDaily>0 ? r.requiredDaily.toLocaleString('es-MX') : '--',
        r.requiredDaily>0 ? (r.requiredDaily/r.realBoxesHr).toFixed(1)+'h' : '--',
        r.requiredDaily>0 ? (r.requiredHours<=r.totalHoursDay?'VIABLE':'EXCEDE') : '--'
      ]),
      styles:{fillColor:C.panel,textColor:C.gray1,fontSize:7.5,lineColor:C.border,lineWidth:0.2,cellPadding:2.5},
      headStyles:{fillColor:C.header,textColor:C.accent1,fontStyle:'bold',fontSize:7.5,lineColor:C.accent1,lineWidth:0.3},
      alternateRowStyles:{fillColor:C.panel2},
      didParseCell:(d)=>{
        // Accent first column (Mod label)
        if(d.column.index===0){
          d.cell.styles.fillColor = [10,13,24];
          d.cell.styles.textColor = C.accent1;
          d.cell.styles.fontStyle = 'bold';
        }
        // Estado column
        if(d.section==='body'&&d.column.index===9){
          d.cell.styles.textColor = d.cell.raw==='VIABLE' ? C.accent5 : d.cell.raw==='EXCEDE' ? C.red : C.gray2;
          d.cell.styles.fontStyle='bold';
        }
      },
      theme:'grid', margin:{left:10,right:10}
    });

    curY = (doc.lastAutoTable?.finalY ?? curY)+5;

    // Bar chart Cap vs Req
    if(curY<H-55){
      const cX=10, cY=curY, cH=36, cW=W-20;
      const n=mixRows.length||1;
      const maxV=Math.max(...mixRows.map(r=>Math.max(r.boxesPerDay,r.requiredDaily||0)),1);
      const bGW=cW/n;
      text(...C.accent1); font('bold',7);
      lbl('GRÁFICO: CAPACIDAD DIARIA vs REQUERIMIENTO DIARIO (cajas/día)', cX, cY);
      const axY=cY+cH;
      stroke(...C.gray3); doc.setLineWidth(0.2);
      doc.line(cX,cY+4,cX,axY); doc.line(cX,axY,cX+cW,axY);
      [25,50,75,100].forEach(p=>{
        const gy=axY-(cH-6)*p/100;
        stroke(...C.gray3); doc.setLineWidth(0.12); doc.line(cX,gy,cX+cW,gy);
        text(...C.gray2); font('normal',5);
        lbl(Math.round(maxV*p/100).toLocaleString('es-MX'), cX-1, gy+1, {align:'right'});
      });
      mixRows.forEach((r,idx)=>{
        const gx=cX+idx*bGW, bW=bGW*0.32;
        const capH=(r.boxesPerDay/maxV)*(cH-8);
        const reqH=r.requiredDaily>0?(r.requiredDaily/maxV)*(cH-8):0;
        // Cap bar — cyan
        fill(...C.accent1); rect(gx+bGW*0.08, axY-capH, bW, capH);
        // Req bar — orange
        fill(...C.accent4); rect(gx+bGW*0.08+bW+1, axY-reqH, bW, reqH);
        text(...C.gray1); font('bold',6.5);
        lbl(r.label, gx+bGW/2, axY+5, {align:'center'});
      });
      // Legend
      const lX=cX+cW-48, lY=cY+1;
      fill(...C.accent1); rect(lX,    lY, 5, 3);
      text(...C.gray1); font('normal',6.5); lbl('Capacidad/día', lX+6.5,  lY+2.5);
      fill(...C.accent4); rect(lX+28, lY, 5, 3);
      font('normal',6.5); lbl('Req. diario', lX+34.5, lY+2.5);
    }

    // ── PAGE 2 - Scenarios
    doc.addPage(); addBG();
    fill(...C.header); rect(0,0,W,14);
    fill(...C.accent1); rect(0,13.5,W,0.7);
    text(...C.accent1); font('bold',9); lbl(`${simulatorMeta.name}  —  Análisis de Escenarios Y1-Y5`, 12, 9.5);
    text(...C.gray2); font('normal',6); lbl(ts, W-10, 9.5, {align:'right'});
    curY=20;

    ['lavadoSecado'].forEach(key=>{
      const sc=CUSTOMER_SCENARIOS[key];
      const rows=scenarioResults[key];
      if(!rows.length) return;
      fill(...C.panel); rect(10,curY,W-20,9);
      fill(...C.accent1); rect(10,curY+8.5,W-20,0.6);
      text(...C.accent1); font('bold',8.5);
      lbl(`${sc.name.toUpperCase()}  —  RATE: ${sc.dailyRate.toLocaleString('es-MX')} cajas/día`, 13, curY+6);
      text(...C.gray2); font('normal',7);
      lbl(`Ref: ${selectedRow?.name??'Todos'}`, W-12, curY+6, {align:'right'});
      curY+=11;
      autoTable(doc,{
        startY:curY,
        head:[['Año','Hrs Base','Hrs Ef/T','Turnos','T.Disp h','Rate/Día','Req/h','Cap c/h','Déficit/Superávit','Cobertura','Líneas']],
        body:rows.map(r=>[
          r.year, r.hrsBase, r.effectiveHoursPerShift.toFixed(2), r.shifts,
          r.availableDailyTime.toFixed(2), r.dailyRate.toLocaleString('es-MX'),
          r.requiredPerHour.toFixed(1), r.machineBoxesPerHour.toFixed(1),
          (r.deficitOrSurplus>=0?'+':'')+r.deficitOrSurplus.toFixed(1),
          (r.coverageRatio*100).toFixed(1)+'%',
          r.requiredLines+' maq.'
        ]),
        styles:{fillColor:C.panel,textColor:C.gray1,fontSize:8,lineColor:C.border,lineWidth:0.2,cellPadding:2.5},
        headStyles:{fillColor:C.header,textColor:C.accent1,fontStyle:'bold',fontSize:8,lineColor:C.accent1,lineWidth:0.3},
        alternateRowStyles:{fillColor:C.panel2},
        didParseCell:(d)=>{
          if(d.column.index===0){
            d.cell.styles.fillColor = [10,13,24];
            d.cell.styles.textColor = C.accent1;
            d.cell.styles.fontStyle = 'bold';
          }
          if(d.section!=='body') return;
          const r=rows[d.row.index]; if(!r) return;
          if(d.column.index===8){
            d.cell.styles.textColor = r.deficitOrSurplus>=0 ? C.accent5 : C.red;
            d.cell.styles.fontStyle='bold';
          }
          if(d.column.index===9){
            const cv = r.coverageRatio;
            d.cell.styles.textColor = cv>=1 ? C.accent5 : cv>=0.75 ? C.accent4 : C.red;
          }
          if(d.column.index===10){
            d.cell.styles.textColor = r.requiredLines<=1 ? C.accent5 : r.requiredLines===2 ? C.accent4 : C.red;
            d.cell.styles.fontStyle='bold';
          }
        },
        theme:'grid', margin:{left:10,right:10}
      });
      curY=(doc.lastAutoTable?.finalY??curY)+4;

      // Mini coverage chart
      if(curY<H-42){
        const cX=10, cY=curY, cH=26, cW=W-20, n=rows.length, bW2=cW/n*0.5;
        text(...C.accent1); font('bold',5.5); lbl('Cobertura % por escenario anual', cX, cY+4);
        const axY=cY+cH;
        [50,100,150].forEach(p=>{
          const gy=axY-(cH-6)*p/150;
          stroke(...C.gray3); doc.setLineWidth(0.15); doc.line(cX,gy,cX+cW,gy);
          text(...C.gray2); font('normal',4); lbl(p+'%', cX-1, gy+1, {align:'right'});
        });
        rows.forEach((r,idx)=>{
          const gx=cX+idx*(cW/n);
          const pct=Math.min(150,r.coverageRatio*100);
          const bH2=(pct/150)*(cH-6);
          const t=Math.min(1,r.coverageRatio);
          fill(Math.round(0+t*50), Math.round(120+t*80), Math.round(130+t*90));
          rect(gx+(cW/n-bW2)/2, axY-bH2, bW2, bH2);
          text(...C.gray1); font('bold',5); lbl(r.year, gx+cW/n/2, axY+3.5, {align:'center'});
          if(bH2>5){ text(...C.white); font('normal',4.5); lbl((r.coverageRatio*100).toFixed(0)+'%', gx+cW/n/2, axY-bH2-1, {align:'center'}); }
        });
        // 100% reference line
        const refY=axY-(cH-6)*(100/150);
        stroke(...C.accent1); doc.setLineWidth(0.4); doc.line(cX,refY,cX+cW,refY);
        text(...C.accent1); font('bold',4.5); lbl('100%  — 1 máquina suficiente', cX+cW-1, refY-1, {align:'right'});
        curY=axY+10;
      }
      curY+=3;
    });

    // Footer — dark bar matching header
    const pc=doc.getNumberOfPages();
    for(let p=1;p<=pc;p++){
      doc.setPage(p);
      fill(...C.header); rect(0,H-8,W,8);
      fill(...C.accent1); rect(0,H-8,W,0.5);
      text(...C.gray2); font('normal',5.5);
      lbl(`PANDORA 3.0  |  ${simulatorMeta.name} Industrial Simulator  |  Confidencial`, 12, H-2.5);
      lbl(`Página ${p} de ${pc}`, W-10, H-2.5, {align:'right'});
    }

    const defaultName = `${simulatorMeta.name}_Analisis_${Date.now()}`;
    doc.save(`${customFileName || defaultName}.pdf`);
  };


  // ── exportExcel ──────────────────────────────────────────────
  const exportExcel = () => {
    const wb = XLSX.utils.book_new();
    const modelData = [
      ['Mod','Nombre','Largo cm','Ancho cm','Alto cm','Vel m/h','Cap Real c/h','Cap Día','Cap Mes','Req Diario','Hrs Req','Hrs Disp'],
      ...computedRows.map(r => [
        r.label, r.name, r.l, r.w, r.h,
        +r.linearMh.toFixed(2), +r.realBoxesHr.toFixed(1),
        Math.round(r.boxesPerDay), Math.round(r.boxesPerMonth),
        r.requiredDaily || 0, +r.requiredHours.toFixed(2), r.totalHoursDay
      ])
    ];
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(modelData), 'Modelos');

    ['lavadoSecado'].forEach(key => {
      const sc = CUSTOMER_SCENARIOS[key];
      const rows = scenarioResults[key];
      const data = [
        [`Modelo: ${selectedRow?.name ?? '-'} | Rate: ${sc.dailyRate}`],
        ['Año','Hrs Base','Hrs Ef/T','Turnos','T.Disp h','Rate/Día','Req/h','Máq c/h','Déficit','Cob %','Líneas'],
        ...rows.map(r => [
          r.year, r.hrsBase, +r.effectiveHoursPerShift.toFixed(2), r.shifts,
          +r.availableDailyTime.toFixed(2), r.dailyRate,
          +r.requiredPerHour.toFixed(1), +r.machineBoxesPerHour.toFixed(1),
          +r.deficitOrSurplus.toFixed(1), +(r.coverageRatio*100).toFixed(1), r.requiredLines
        ])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(data), 'Lav+Sec');
    });

    const defaultName = `${simulatorMeta.name}_Simulacion_${Date.now()}`;
    XLSX.writeFile(wb, `${customFileName || defaultName}.xlsx`);
  };

  const kpiInfo = {
    speed: {
      title: 'Velocidad Usada',
      description: 'Muestra la velocidad lineal a la que avanza la banda transportadora.',
      calculation: 'Si es Manual, es la velocidad fija ingresada. Si es Autocalcular, se determina multiplicando el Paso (Largo de la caja en avance + Gap) por la capacidad objetivo (cajas/h), y dividiendo entre 60 para obtener m/min.',
      color: 'text-yellow-500'
    },
    capacity: {
      title: 'Capacidad Real',
      description: 'Indica la cantidad real de cajas por hora que la máquina procesará.',
      calculation: 'Se calcula dividiendo la velocidad lineal (convertida a metros por hora) entre el Paso de cada caja (Avance + Gap). Se restringe a la Capacidad Objetivo si la supera en el modo autocalcular.',
      color: 'text-[#00B5CC]'
    },
    residence: {
      title: 'Residencia',
      description: 'El tiempo estimado que una caja permanece dentro del equipo de lavado y secado.',
      calculation: 'Se obtiene dividiendo el Largo total de la Máquina (en metros) entre la Velocidad Usada (m/min), dando como resultado los minutos totales dentro.',
      color: 'text-gray-200'
    },
    inside: {
      title: 'Cajas Dentro',
      description: 'El número promedio de piezas que están físicamente dentro de la máquina en un momento dado.',
      calculation: 'Se calcula dividiendo el Largo de la Máquina entre el Paso de la caja (Avance + Gap).',
      color: 'text-gray-200'
    },
    col_mod: {
      title: 'Mod',
      description: 'Letra o identificador único para cada modelo de caja en la simulación.',
      calculation: 'Se asigna automáticamente (A, B, C...) conforme agregas nuevos modelos.',
      color: 'text-yellow-500'
    },
    col_nombre: {
      title: 'Nombre',
      description: 'El nombre descriptivo o código del modelo de la caja o pallet.',
      calculation: 'Definido por el usuario al crear o editar el modelo.',
      color: 'text-yellow-500'
    },
    col_dim: {
      title: 'Dimensiones (cm)',
      description: 'Las medidas físicas de la caja: Largo × Ancho × Alto.',
      calculation: 'Ingresadas en la configuración de la caja.',
      color: 'text-yellow-500'
    },
    col_paso: {
      title: 'Paso (m)',
      description: 'El espacio total que ocupa una caja en la banda transportadora, incluyendo su margen de separación (Gap).',
      calculation: 'Largo en avance (m) + Gap (m).',
      color: 'text-yellow-500'
    },
    col_vel: {
      title: 'Vel. (m/h)',
      description: 'Velocidad lineal de la banda necesaria para este modelo.',
      calculation: 'Si es modo Fijo, usa la velocidad manual. Si es Autocalcular, se ajusta para cumplir la capacidad objetivo.',
      color: 'text-yellow-500'
    },
    col_cap: {
      title: 'Cap. Real',
      description: 'La cantidad máxima de cajas por hora que la máquina puede lavar a la velocidad dada.',
      calculation: 'Velocidad (m/h) ÷ Paso de la caja (m).',
      color: 'text-[#00B5CC]'
    },
    col_cap_dia: {
      title: 'Cap. Día',
      description: 'Capacidad total de cajas por día operativo.',
      calculation: 'Capacidad Real (c/h) × Horas por Turno × Turnos por Día.',
      color: 'text-slate-500'
    },
    col_cap_mes: {
      title: 'Cap. Mes',
      description: 'Capacidad total de cajas en el mes operativo.',
      calculation: 'Capacidad por Día × Días por Mes.',
      color: 'text-slate-500'
    },
    col_req_diario: {
      title: 'Req. Diario',
      description: 'Meta de cajas a lavar por día.',
      calculation: 'Ingresado por el usuario.',
      color: 'text-yellow-400'
    },
    col_estatus: {
      title: 'Estatus',
      description: 'Horas necesarias vs Horas disponibles.',
      calculation: 'Requerimiento Diario ÷ Capacidad Real (c/h).',
      color: 'text-slate-500'
    },
    col_acc: {
      title: 'Acciones',
      description: 'Opciones para modificar o eliminar el modelo de la simulación.',
      calculation: 'No aplica.',
      color: 'text-yellow-500'
    },
    // ---- Columnas de Escenarios del Cliente ----
    sc_year: {
      title: 'Año',
      description: 'Horizonte de planificación. Representa el año operativo del cliente (Y1 = primer año, Y5 = quinto año).',
      calculation: 'Definido directamente por los escenarios del cliente. No se calcula; es un identificador de periodo.',
      color: 'text-slate-800'
    },
    sc_hrsBase: {
      title: 'Hrs Base',
      description: 'Número de horas brutas declaradas por el cliente como jornada laboral de referencia para ese año. No son horas efectivas; incluyen tiempos no productivos.',
      calculation: 'Dato del cliente. Generalmente disminuye cada año conforme se optimizan los procesos (Y1=48h, Y5=40h).',
      color: 'text-slate-500'
    },
    sc_hrsEf: {
      title: 'Hrs Ef./Turno',
      description: 'Horas reales productivas por turno, descontando arranque, limpieza, paros programáticos y breaks. Es el tiempo en que la máquina realmente puede procesar.',
      calculation: 'Dato del cliente. Ejemplo: de 8 horas brutas se restan 1.41 h de ineficiencias, resultando en 6.59 horas efectivas.',
      color: 'text-slate-500'
    },
    sc_turnos: {
      title: 'Turnos',
      description: 'Número de turnos operativos por día. Actualmente configurado en 2 turnos para todos los escenarios.',
      calculation: 'Dato del cliente. Se multiplica por las horas efectivas por turno para obtener el tiempo disponible total del día.',
      color: 'text-slate-500'
    },
    sc_tDisp: {
      title: 'T. Disp. (h)',
      description: 'Tiempo total productivo disponible en el día, sumando todos los turnos efectivos. Este es el tiempo real en que la máquina puede operar.',
      calculation: `Hrs Efectivas por Turno × Número de Turnos. Ejemplo Y1: 6.59 h × 2 = 13.18 h/día.`,
      color: 'text-slate-500'
    },
    sc_rateDia: {
      title: 'Rate / Día',
      description: 'Volumen de producción diario fijo que el cliente necesita lavar/secar. Es el objetivo de producción absoluto e inamovible.',
      calculation: 'Dato fijo del cliente. Para Lavado y Secado: 3,472 piezas/día.',
      color: 'text-slate-500'
    },
    sc_reqH: {
      title: 'Req. / h',
      description: 'Producción horaria que debe cumplir la máquina para lograr el rate diario dentro del tiempo disponible. Es el KPI crítico de comparación.',
      calculation: `Rate Diario ÷ Tiempo Disponible (h/día). Ejemplo Y1 Lavado: 3,472 ÷ 13.18 = 263.4 cajas/h.`,
      color: 'text-yellow-400'
    },
    sc_maqH: {
      title: 'Máq. c/h',
      description: 'Capacidad real que puede entregar la máquina por hora al procesar el modelo de caja seleccionado a velocidad máxima de banda.',
      calculation: `Mín(Capacidad Nominal, Velocidad Banda m/h ÷ Paso de la Caja m). Depende del modelo de caja activo; cambia al seleccionar diferente modelo en la tabla superior.`,
      color: 'text-[#00B5CC]'
    },
    sc_deficit: {
      title: 'Déficit / Superávit',
      description: 'Diferencia entre lo que la máquina puede hacer y lo que el cliente necesita. Positivo = capacidad sobrante. Negativo = la máquina no alcanza.',
      calculation: `Capacidad Real Máquina (c/h) − Producción Requerida (c/h). Valor positivo → verde (sobrante). Valor negativo → rojo (déficit).`,
      color: 'text-green-400'
    },
    sc_cobertura: {
      title: 'Cobertura %',
      description: 'Porcentaje de la demanda que la máquina única puede cubrir. 100% o más = suficiente. Menos de 100% = capacidad insuficiente.',
      calculation: `Capacidad Real Máquina (c/h) ÷ Producción Requerida (c/h) × 100. Ejemplo: 100 c/h ÷ 263.4 c/h = 38.0%.`,
      color: 'text-green-400'
    },
    sc_lineas: {
      title: 'Máquinas Req.',
      description: 'Máquinas requeridas fijadas a la unidad física disponible.',
      calculation: `Fijado siempre a 1 máquina operativa.`,
      color: 'text-green-400'
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 p-6 pb-24">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200 pb-6 gap-4">
          <div className="flex items-center gap-4">
            <Link to="/alpha/simulators" className="p-2 rounded-xl bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-850 transition-colors border border-slate-200 shadow-sm">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-12 h-12 rounded-2xl bg-yellow-50 border border-yellow-200 flex items-center justify-center shadow-sm">
              <LayoutDashboard className="w-6 h-6 text-[#F59E0B]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                {isEditingTitle ? (
                  <input
                    type="text"
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={handleTitleKeyDown}
                    autoFocus
                    className="bg-white border border-yellow-500 rounded-lg px-2 py-0.5 text-2xl font-black text-slate-800 tracking-tight outline-none focus:ring-1 focus:ring-yellow-555 w-80 uppercase"
                  />
                ) : (
                  <h1 
                    onClick={() => setIsEditingTitle(true)}
                    className="text-2xl font-black tracking-tight text-slate-800 uppercase cursor-pointer hover:text-yellow-650 transition-colors flex items-center gap-2 group"
                    title="Hacer click para renombrar el simulador"
                  >
                    {simulatorMeta.name}
                    <Edit3 className="w-5 h-5 text-slate-400 group-hover:text-[#F59E0B] transition-colors" />
                  </h1>
                )}
                <span className="px-2.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 text-[10px] tracking-widest uppercase font-bold">Simulador Activo</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded font-black tracking-normal uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Auto-guardado
                </span>
              </div>

              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1 mb-2">
                {simulatorMeta.description} ({physicalMaxMH} m/h max)
              </p>

              <div className="flex flex-wrap items-center gap-3 mt-2">
                {/* EMPRESA (Header / Proyecto) */}
                <div className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl transition-all w-fit shadow-sm">
                  <Edit3 className="w-3.5 h-3.5 text-cyan-600" />
                  <span className="text-[10px] font-black tracking-wider uppercase text-cyan-700">Empresa:</span>
                  <input
                    type="text"
                    value={simulatorMeta.name}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setSimulatorMeta(prev => ({ ...prev, name: newName }));
                      try {
                        const list = JSON.parse(localStorage.getItem('pandora_simulators') || '[]');
                        let exists = false;
                        const updated = list.map(s => {
                          if (s.id === simulatorId) {
                            exists = true;
                            return { ...s, name: newName };
                          }
                          return s;
                        });
                        if (!exists) {
                          updated.push({ id: simulatorId, name: newName, description: simulatorMeta.description });
                        }
                        localStorage.setItem('pandora_simulators', JSON.stringify(updated));
                      } catch (err) {
                        console.error(err);
                      }
                      if (activeProject) {
                        updateProjectName(newName);
                      }
                    }}
                    className="bg-transparent text-xs font-black text-slate-800 border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 w-48 uppercase"
                    placeholder="Escribir Empresa (Header)..."
                  />
                </div>

                {/* CLIENTE */}
                <div className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl transition-all w-fit shadow-sm">
                  <Edit3 className="w-3.5 h-3.5 text-cyan-600" />
                  <span className="text-[10px] font-black tracking-wider uppercase text-cyan-700">Cliente:</span>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => {
                      setCustomerName(e.target.value);
                      localStorage.setItem(`sim_${simulatorId}_customer_name`, e.target.value);
                    }}
                    className="bg-transparent text-xs font-black text-slate-800 border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 w-48 uppercase"
                    placeholder="Escribir Cliente..."
                  />
                </div>

                {/* EVALUACIÓN */}
                <div className="flex items-center gap-2 bg-white hover:bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl transition-all w-fit shadow-sm">
                  <Edit3 className="w-3.5 h-3.5 text-cyan-600" />
                  <span className="text-[10px] font-black tracking-wider uppercase text-cyan-700">Evaluación:</span>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => {
                      setClientName(e.target.value);
                      localStorage.setItem(`sim_${simulatorId}_client_name`, e.target.value);
                    }}
                    className="bg-transparent text-xs font-black text-slate-800 border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 w-72 uppercase"
                    placeholder="Máquina / Proyecto..."
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-stretch lg:items-end gap-3 shrink-0">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={openConfig} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-50 border border-yellow-200 hover:bg-yellow-100 text-yellow-700 transition-all text-xs font-black uppercase tracking-wider shadow-sm" title="Configuración del Simulador">
                <Settings className="w-4 h-4" /> Configurar
              </button>
              <button onClick={handleSetFileName} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-50 border border-indigo-200 hover:bg-indigo-100 text-indigo-700 transition-all text-xs font-black uppercase tracking-wider shadow-sm" title={customFileName ? `Archivo: ${customFileName}` : "Configurar nombre de exportación"}>
                <Edit3 className="w-4 h-4" /> {customFileName ? 'Nombre OK' : 'Nombre'}
              </button>
              <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 transition-all text-xs font-black uppercase tracking-wider shadow-sm">
                <Download className="w-4 h-4" /> CSV
              </button>
              <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 text-emerald-700 transition-all text-xs font-black uppercase tracking-wider shadow-sm">
                <Table2 className="w-4 h-4" /> Excel
              </button>

              {/* ── Informe PDF: choice dropdown ── */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowPdfMenu(v => !v)}
                  onBlur={() => setTimeout(() => setShowPdfMenu(false), 160)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-sm"
                  style={{ background: '#f0fdfa', border: '1px solid #99f6e4', color: '#0d9488' }}
                >
                  <FileText className="w-4 h-4" /> Informe PDF
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}><path d="M2 4l4 4 4-4"/></svg>
                </button>
                {showPdfMenu && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 230, background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: 12, padding: 6, zIndex: 9990, boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1), 0 8px 10px -6px rgba(0,0,0,0.1)' }}>
                    <button
                      onMouseDown={openReportModal}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '12px 14px', background: 'transparent', border: 0, borderRadius: 8, color: '#1e293b', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ background: '#f0fdfa', padding: 8, borderRadius: 8, display: 'flex' }}>
                        <Eye size={18} color="#0d9488" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0d9488', fontSize: 13, marginBottom: 2 }}>Ver Informe</div>
                        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.2 }}>Previsualiza el reporte en pantalla</div>
                      </div>
                    </button>
                    <div style={{ height: 1, background: '#e2e8f0', margin: '4px 0' }} />
                    <button
                      onMouseDown={directExportPDF}
                      style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '12px 14px', background: 'transparent', border: 0, borderRadius: 8, color: '#1e293b', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      <div style={{ background: '#f0fdfa', padding: 8, borderRadius: 8, display: 'flex' }}>
                        <Download size={18} color="#0d9488" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: '#0d9488', fontSize: 13, marginBottom: 2 }}>Descargar PDF</div>
                        <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.2 }}>Exporta directamente a PDF descargable</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>

              <button
                onClick={exportForAI}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={{
                  background: 'rgba(139, 92, 246, 0.12)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  color: '#A78BFA',
                }}
                title="Exporta un reporte Markdown para evaluación técnica por IA (descarga + copia al clipboard)"
              >
                <Brain className="w-4 h-4" /> Revisar con IA
              </button>
            </div>

            {/* BOTÓN GUARDAR SIMULADOR */}
            <button 
              onClick={handleSaveSimulator}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black bg-yellow-500/15 border border-yellow-500/35 hover:border-yellow-500 hover:bg-yellow-500/25 text-yellow-500 hover:text-slate-800 transition-all uppercase tracking-wider"
              title="Guardar estado de simulación localmente y en la base de datos de producción (Supabase)"
            >
              <Save className="w-4 h-4" />
              Guardar Simulador
            </button>
          </div>
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
          {/* ── Velocidad Máxima — editable al hacer click ── */}
          {editingSpeed ? (
            <div className="p-4 rounded-2xl bg-white border border-yellow-400 shadow-sm flex flex-col justify-center">
              <span className="text-xs text-[#F59E0B] uppercase font-bold tracking-wider mb-1">Velocidad Máxima</span>
              <div className="flex items-center gap-2 mt-1">
                <input
                  autoFocus
                  type="number"
                  min={1} max={999} step={1}
                  value={speedDraft}
                  onChange={e => setSpeedDraft(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      applyManualSpeed(speedDraft);
                      setEditingSpeed(false);
                    }
                    if (e.key === 'Escape') setEditingSpeed(false);
                  }}
                  onBlur={() => {
                    applyManualSpeed(speedDraft);
                    setEditingSpeed(false);
                  }}
                  className="w-24 text-3xl font-black bg-transparent border-b-2 border-yellow-500 text-slate-800 outline-none text-center"
                />
                <span className="text-sm text-[#F59E0B] font-bold">m/h</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1">Velocidad banda · Enter para confirmar · Esc para cancelar</span>
            </div>
          ) : (
            <div
              onClick={() => { setSpeedDraft(String(Math.round(inputs.manualSpeed * 60))); setEditingSpeed(true); }}
              className="group p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col justify-center cursor-pointer hover:border-yellow-400 hover:shadow-md hover:bg-yellow-50 transition-all duration-300"
            >
              <span className="text-xs text-[#0D1A2A] uppercase font-bold tracking-wider group-hover:text-[#F59E0B] transition-colors duration-300">Velocidad Máxima</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-[#00B5CC] group-hover:text-[#008080] transition-colors duration-300">
                  {Math.round(inputs.manualSpeed * 60)}
                </span>
                <span className="text-sm text-slate-500 group-hover:text-[#F59E0B]/70 transition-colors duration-300">m/h</span>
                <span className="ml-auto text-[9px] text-slate-400 group-hover:text-[#F59E0B]/50 transition-colors duration-300">✎ editar</span>
              </div>
            </div>
          )}
          <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex items-center justify-between">
            <div className="flex flex-col justify-center">
              <span className="text-xs text-[#0D1A2A] uppercase font-bold tracking-wider">Equivalencia</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-[#00B5CC]">{formatNumber(inputs.manualSpeed)}</span>
                <span className="text-sm text-slate-500">m/min</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => { handleInputChange('calcMode', 'manual'); handleInputChange('manualSpeed', Math.min(physicalMaxMH/60, inputs.manualSpeed + 0.05)); }}
                className="p-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded transition-colors"
                title="Aumentar Velocidad"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => { handleInputChange('calcMode', 'manual'); handleInputChange('manualSpeed', Math.max(0.1, inputs.manualSpeed - 0.05)); }}
                className="p-1 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-slate-800 rounded transition-colors"
                title="Disminuir Velocidad"
              >
                <Minus className="w-4 h-4" />
              </button>
            </div>
          </div>
          {/* ── CAP. MÁQ. / DÍA (Y1) — Clicable ── */}
          {(() => {
    const mixR      = computedRows.filter(r => selectedMixIds.includes(r.id));
    const finalMix  = mixR.length ? mixR : (selectedRow ? [selectedRow] : []);
    const avgPitch  = finalMix.length ? (finalMix.reduce((s,r) => s + r.pitch, 0) / finalMix.length) : 0;
    const avgCapH   = avgPitch > 0 ? (physicalMaxMH / avgPitch) : 0;
    const y1Sc      = CUSTOMER_SCENARIOS.lavadoSecado.scenarios[0];
    const y1Efs     = y1Sc.effectiveHoursPerShift;
    const y1Shifts  = y1Sc.shifts;
    const y1H       = y1Efs * y1Shifts;
    const capDay    = Math.round(avgCapH * y1H);
            return (
              <>
                {/* Card */}
                <div
                  onClick={() => setShowCapModal(true)}
                  className="group relative cursor-pointer p-4 rounded-2xl bg-white border border-slate-200 shadow-sm
                             hover:border-[#ffcc00]/40 hover:shadow-[0_0_18px_#ffcc0018] flex flex-col justify-center gap-1
                             transition-all duration-300"
                >
                  <span className="text-xs text-[#0D1A2A] uppercase font-bold tracking-wider group-hover:text-[#F59E0B] transition-colors">
                    CAP. MÁQ. / DÍA (Y1)
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black text-[#F59E0B] drop-shadow-[0_0_8px_#ffcc0088]">
                      {capDay.toLocaleString('es-MX')}
                    </span>
                    <span className="text-xs text-slate-500 ml-1">cajas</span>
                  </div>
                  <span className="text-[10px] text-slate-500">
                    {formatNumber(avgCapH,1)} c/h × {formatNumber(y1H,1)} h (Y1)
                  </span>
                  <span className="absolute top-2 right-3 text-[9px] text-slate-400 group-hover:text-[#F59E0B]/50 transition-colors">ℹ cómo se calcula</span>
                </div>

                {/* Modal de desglose */}
                {showCapModal && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setShowCapModal(false)}
                  >
                    <div
                      className="relative bg-white border border-[#ffcc00]/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_40px_#ffcc0022]"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setShowCapModal(false)}
                        className="absolute top-3 right-3 text-slate-600 hover:text-slate-800 transition-colors"
                      >✕</button>

                      <h3 className="text-sm font-black uppercase tracking-widest text-[#F59E0B] mb-4">
                        ℹ Cómo se calcula
                      </h3>
                      <p className="text-xs text-slate-500 mb-4">
                        La Capacidad Máxima de Máquina por Día es la cantidad de cajas que la máquina
                        puede procesar en un día completo de operación bajo las condiciones del año Y1.
                      </p>

                      <div className="space-y-3">
                        {/* Step 1 */}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Paso 1 — Promedio lineal del mix</p>
                          <p className="text-xs text-slate-500">
                            Paso promedio (Pitch) de los {mixR.length} modelo(s) en mix:
                          </p>
                          <div className="mt-1 space-y-0.5">
                            {mixR.map(r => (
                              <p key={r.id} className="text-[10px] text-slate-500">
                                &nbsp;&nbsp;{r.label}. {r.name} → <span className="text-slate-800">{formatNumber(r.pitch,3)} m</span>
                              </p>
                            ))}
                          </div>
                          <p className="text-xs text-[#F59E0B] font-bold mt-2">
                            Promedio = {formatNumber(avgPitch,3)} m
                          </p>
                        </div>

                        {/* Step 1.1 — Cap/h */}
                        <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Paso 1.1 — Cajas por Hora (Máx)</p>
                          <p className="text-xs text-slate-500">
                            Velocidad Máx ({physicalMaxMH} m/h) ÷ Paso Promedio ({formatNumber(avgPitch,3)} m):
                          </p>
                          <p className="text-xs text-[#F59E0B] font-bold mt-2">
                            {formatNumber(avgCapH,1)} cajas/h
                          </p>
                        </div>

                        {/* Step 2 — Editable */}
                        <div
                          className={`rounded-xl p-3 border transition-all cursor-pointer ${
                            editHrs
                              ? 'bg-[#0D1A2A] border-[#ffcc00]/40'
                              : 'bg-slate-50 border-slate-200 hover:border-[#ffcc00]/30'
                          }`}
                          onClick={() => {
                            if (!editHrs) {
                              setHrsDraft(
                                CUSTOMER_SCENARIOS.lavadoSecado.scenarios.map(s => ({
                                  year: s.year,
                                  effectiveHoursPerShift: s.effectiveHoursPerShift,
                                  shifts: s.shifts
                                }))
                              );
                              setEditHrs(true);
                            }
                          }}
                        >
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 flex items-center justify-between">
                            <span>Paso 2 — Horas reales de trabajo Y1</span>
                            {!editHrs && <span className="text-[#F59E0B]/60 text-[9px]">✎ editar</span>}
                          </p>

                          {!editHrs ? (
                            <>
                              <p className="text-xs text-slate-500">{y1Shifts} turnos × {formatNumber(y1Efs,2)} h efectivas/turno</p>
                              <p className="text-xs text-[#F59E0B] font-bold mt-1">= {formatNumber(y1H,2)} horas netas/día</p>
                            </>
                          ) : (
                            <div onClick={e => e.stopPropagation()}>
                              <div className="space-y-2 mb-3">
                                {hrsDraft?.map((row, idx) => (
                                  <div key={row.year} className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-500 w-6 font-bold">{row.year}</span>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number" min={1} max={3} step={1}
                                        value={row.shifts}
                                        onChange={e => setHrsDraft(d => d.map((r,i) => i===idx ? {...r, shifts: +e.target.value} : r))}
                                        className="w-12 bg-white border border-slate-300 rounded text-slate-800 text-xs text-center px-1 py-0.5 focus:border-[#ffcc00] outline-none"
                                      />
                                      <span className="text-[9px] text-slate-500">turnos</span>
                                    </div>
                                    <span className="text-slate-600">×</span>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number" min={0.5} max={12} step={0.01}
                                        value={row.effectiveHoursPerShift}
                                        onChange={e => setHrsDraft(d => d.map((r,i) => i===idx ? {...r, effectiveHoursPerShift: +e.target.value} : r))}
                                        className="w-16 bg-white border border-slate-300 rounded text-slate-800 text-xs text-center px-1 py-0.5 focus:border-[#ffcc00] outline-none"
                                      />
                                      <span className="text-[9px] text-slate-500">h/turno</span>
                                    </div>
                                    <span className="text-[9px] text-[#F59E0B] ml-auto">
                                      = {(row.shifts * row.effectiveHoursPerShift).toFixed(2)}h/día
                                    </span>
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    // Apply to lavadoSecado
                                    setCustomerScenarios(prev => ({
                                      lavadoSecado: {
                                        ...prev.lavadoSecado,
                                        scenarios: prev.lavadoSecado.scenarios.map((s, i) => ({
                                          ...s,
                                          effectiveHoursPerShift: hrsDraft[i]?.effectiveHoursPerShift ?? s.effectiveHoursPerShift,
                                          shifts: hrsDraft[i]?.shifts ?? s.shifts
                                        }))
                                      },
                                    }));
                                    setEditHrs(false);
                                  }}
                                  className="flex-1 py-1 rounded-lg bg-[#ffcc00]/10 border border-[#ffcc00]/40 text-[#F59E0B] text-xs font-bold hover:bg-[#ffcc00]/20 transition-colors"
                                >Aplicar</button>
                                <button
                                  onClick={() => setEditHrs(false)}
                                  className="px-3 py-1 rounded-lg bg-white/5 border border-slate-200 text-slate-500 text-xs hover:text-slate-800 transition-colors"
                                >Cancelar</button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Step 3 — result */}
                        <div className="bg-[#ffcc00]/5 rounded-xl p-3 border border-[#ffcc00]/20">
                          <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Resultado</p>
                          <p className="text-xs text-slate-500">
                            {formatNumber(avgCapH,2)} c/h × {formatNumber(y1H,2)} h
                          </p>
                          <p className="text-2xl font-black text-[#F59E0B] mt-1 drop-shadow-[0_0_8px_#ffcc0088]">
                            = {capDay.toLocaleString('es-MX')} <span className="text-sm font-normal text-slate-500">cajas / día</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          })()}

          {/* ── Carga de Máquina — LEDs azul eléctrico + modal cristal ── */}
          {(() => {

            const sc = CUSTOMER_SCENARIOS.lavadoSecado;
            const isAuto = sc?.mode === 'auto';
            const sumAllModels = computedRows.reduce((s, r) => s + (r.requiredDaily || 0), 0);
            const mixSelected = computedRows.filter(r => selectedMixIds.includes(r.id));
            const mixTotalReq = mixSelected.reduce((s, r) => s + (r.requiredDaily || 0), 0);
            const effectiveReq = mixSelected.length > 0 && mixTotalReq > 0 
              ? mixTotalReq 
              : (isAuto ? sumAllModels : (sc?.dailyRate ?? 3472));

            const bestRow = scenarioResults.lavadoSecado?.[0];
            const machineDailyBest = mixCapacityDailyY1;
            
            const displayPct = machineDailyBest > 0 ? Math.round((effectiveReq / machineDailyBest) * 100) : 0;
            const pct = Math.min(100, displayPct);

            // Paleta LED nítida — azul acero con buen contraste
            const getLedColor = (i, isActive, isHover) => {
              if (!isActive && !isHover) return '#f1f5f9';
              if (isHover) return '#78CFDF';
              if (i < 7)       return '#3A9EBE'; // cian acero
              else if (i < 12) return '#3278C8'; // azul medio
              else if (i < 16) return '#4A5AC8'; // azul índigo
              else             return '#7A5CC8'; // violeta
            };
            // Glow focalizado tipo LED real
            const getLedGlow = (color) =>
              `0 0 3px ${color}FF, 0 0 7px ${color}99, inset 0 -2px 4px ${color}55`;
            // Highlight superior (cúpula LED)
            const getLedHighlight = (isActive, isHover) =>
              (isActive || isHover)
                ? 'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.04) 40%, transparent 100%)'
                : 'none';

            return (
              <>
                {/* Tarjeta principal */}
                <div
                  className="group p-4 rounded-2xl cursor-pointer border border-slate-200 bg-white hover:border-cyan-300 shadow-sm transition-all duration-300"
                  
                  onClick={() => setViabilityInfoModal({
                    title: 'Carga de Máquina',
                    formula: 'Representa el porcentaje de la capacidad máxima de la máquina al que se debe trabajar para cumplir con el requerimiento diario en el Año 1.',
                    steps: [
                      `Requerimiento Diario: ${effectiveReq.toLocaleString('es-MX')} cajas/día`,
                      `Capacidad Máxima Y1: ${Math.round(machineDailyBest).toLocaleString('es-MX')} cajas/día (${Math.round(avgCapHForShared || 0)} c/h × ${y1HForShared?.toFixed(2)} h)`,
                      `Porcentaje de Carga = (${effectiveReq.toLocaleString('es-MX')} ÷ ${Math.round(machineDailyBest).toLocaleString('es-MX')}) × 100 = ${displayPct}%`
                    ]
                  })}
                  title="Click para ver detalle del cálculo"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-widest text-[#0D1A2A]">
                      Carga de Máquina
                    </span>
                    <span className="text-sm font-black transition-all text-cyan-600">
                      {displayPct}%
                    </span>
                  </div>

                  {/* Barra LED — segmentos nítidos */}
                  <div
                    className="flex h-6 w-full"
                    style={{ gap: '2px' }}
                    onClick={e => e.stopPropagation()}
                  >
                    {Array.from({ length: 20 }).map((_, i) => {
                      const segPct   = ((i + 1) / 20) * 100;
                      const isActive = i < (pct / 100) * 20;
                      const color    = getLedColor(i, isActive, false);
                      return (
                        <div
                          key={i}
                          title={`Segmento ${Math.round(segPct)}% — Capacidad de Carga`}
                          className="relative flex-1 transition-all duration-75"
                          style={{
                            borderRadius: '2px 2px 1px 1px',
                            backgroundColor: color,
                            boxShadow: isActive ? getLedGlow(color) : 'none',
                            opacity: !isActive ? 0.12 : 1,
                            transformOrigin: 'bottom',
                          }}
                        >
                          {/* Highlight cúpula */}
                          <div className="absolute inset-0 pointer-events-none" style={{
                            borderRadius: '2px 2px 0 0',
                            background: getLedHighlight(isActive, false),
                          }} />
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mt-2.5 flex items-center justify-between">
                    <span>0% (Sin Carga)</span>
                    <span className="text-slate-500">Cap. Máx Y1: {Math.round(machineDailyBest).toLocaleString('es-MX')} c/d</span>
                    <span>100%+ (Full)</span>
                  </div>
                </div>

                {/* ── Modal cristal glassmorphism ── */}
                {showCapModal && (
                  <div
                    className="fixed inset-0 z-[9999] flex items-center justify-center"
                    style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
                    onClick={() => setShowCapModal(false)}
                  >
                    <div
                      className="relative w-[420px] max-h-[85vh] overflow-y-auto rounded-3xl p-6"
                      style={{
                        background: 'rgba(4, 14, 28, 0.30)',
                        backdropFilter: 'blur(28px) saturate(160%)',
                        WebkitBackdropFilter: 'blur(28px) saturate(160%)',
                        border: '1.5px solid rgba(74, 140, 180, 0.20)',
                        boxShadow: '0 0 40px rgba(0,100,160,0.10), 0 0 0 1px rgba(74,140,180,0.05) inset, 0 8px 32px rgba(0,0,0,0.5)',
                      }}
                      onClick={e => e.stopPropagation()}
                    >
                      {/* Borde bisel superior */}
                      <div className="absolute top-0 left-6 right-6 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(74,140,180,0.35), transparent)' }} />

                      {/* Header del modal */}
                      <div className="flex items-center justify-between mb-5">
                        <div>
                          <h2 className="text-sm font-black uppercase tracking-widest text-cyan-600">
                            ⚡ Configurar Velocidad
                          </h2>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Ajusta la carga de máquina y velocidad operativa
                          </p>
                        </div>
                        <button onClick={() => setShowCapModal(false)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Porcentaje grande */}
                      <div className="text-center mb-2">
                        <div className="text-6xl font-black mb-1" style={{ color: '#5AACCC' }}>
                          {pct}%
                        </div>
                        <div className="text-xs text-slate-500">
                          {(inputs.manualSpeed * 60).toFixed(1)} m/h operativo
                          &nbsp;/&nbsp;
                          <span style={{ color: '#5AACCC' }}>{physicalMaxMH.toFixed(1)} m/h máx</span>
                        </div>
                      </div>

                      {/* Mini barra LED en modal */}
                      <div className="flex gap-[3px] h-3 w-full mb-5">
                      {Array.from({ length: 20 }).map((_, i) => {
                          const isActive = i < (pct / 100) * 20;
                          const color = getLedColor(i, isActive, false);
                          return (
                            <div key={i}
                              className="flex-1 rounded-[2px] cursor-pointer transition-all duration-100 hover:scale-y-125"
                              style={{
                                backgroundColor: color,
                                opacity: isActive ? 1 : 0.12,
                                boxShadow: isActive ? getLedGlow(color) : 'none',
                              }}
                              onClick={() => setOperatingPct(Math.round(((i + 1) / 20) * 100))}
                            />
                          );
                        })}
                      </div>

                      {/* Presets rápidos */}
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Carga operativa</p>
                      <div className="grid grid-cols-5 gap-2 mb-5">
                        {[20, 40, 60, 80, 100].map(p => (
                          <button key={p}
                            onClick={() => { setOperatingPct(p); }}
                            className="py-1.5 rounded-xl text-xs font-bold transition-all"
                            style={{
                              background: pct === p ? 'rgba(74,140,180,0.18)' : 'rgba(255,255,255,0.04)',
                              border: pct === p ? '1px solid rgba(74,140,180,0.50)' : '1px solid rgba(255,255,255,0.08)',
                              color: pct === p ? '#6ABED4' : '#666',
                              boxShadow: pct === p ? `0 0 8px rgba(74,140,180,0.35)` : 'none',
                            }}>
                            {p}%
                          </button>
                        ))}
                      </div>

                      {/* Velocidad máxima absoluta */}
                      <p className="text-[10px] text-slate-500 uppercase font-bold mb-2">Velocidad máx. de máquina (m/h)</p>
                      <div className="flex gap-2 mb-4">
                        <input id="maxSpeedInput"
                          type="number" min={1} max={999} step={1}
                          defaultValue={physicalMaxMH.toFixed(1)}
                          className="flex-1 rounded-xl px-3 py-2 text-sm font-bold outline-none"
                          style={{ background:'rgba(74,140,180,0.05)', border:'1px solid rgba(74,140,180,0.20)', color:'#5AACCC' }}
                          placeholder={`ej. ${physicalMaxMH}`}
                        />
                        <button
                          onClick={(e) => {
                            const inp = document.getElementById('maxSpeedInput');
                            applyManualSpeed(+inp.value); // cambia max Y speed actual a 100%
                            setShowCapModal(false);
                          }}
                          className="px-3 py-2 rounded-xl text-xs font-black transition-all"
                          style={{ background:'rgba(74,140,180,0.10)', border:'1px solid rgba(74,140,180,0.30)', color:'#5AACCC' }}>
                          Definir máx
                        </button>
                      </div>

                      {/* Borde bisel inferior */}
                      <div className="absolute bottom-0 left-6 right-6 h-px"
                        style={{ background: 'linear-gradient(90deg, transparent, rgba(74,140,180,0.18), transparent)' }} />
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
        <div className="flex flex-col xl:flex-row gap-6 relative items-start">
          {/* Left Column: Inputs */}
          <div className={cn("space-y-6 w-full transition-all duration-300", isSidebarOpen ? "xl:w-[380px] shrink-0" : "xl:w-0 xl:h-0 xl:opacity-0 xl:overflow-hidden")}>
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4 shadow-xl">
              <h2 className="text-sm font-black uppercase tracking-widest text-yellow-500 flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
                <Settings className="w-4 h-4" /> Configuración Base
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Equipo</label>
                  <input type="text" value={inputs.machineName} onChange={(e) => handleInputChange('machineName', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-yellow-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Capacidad (cajas/h)</label>
                  <input type="number" value={inputs.nominalBoxes} onChange={(e) => handleInputChange('nominalBoxes', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-yellow-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Largo Máquina (m)</label>
                  <input type="number" step="0.1" value={inputs.machineLength} onChange={(e) => handleInputChange('machineLength', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-yellow-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Velocidad (m/min)</label>
                  <input type="number" step="0.01" value={inputs.manualSpeed} disabled={inputs.calcMode !== 'manual'} onChange={(e) => handleInputChange('manualSpeed', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-yellow-500 outline-none disabled:opacity-50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Horas x Turno</label>
                  <input type="number" value={inputs.hoursPerShift} onChange={(e) => handleInputChange('hoursPerShift', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-yellow-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Turnos x Día</label>
                  <input type="number" value={inputs.shifts} onChange={(e) => handleInputChange('shifts', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-yellow-500 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Días x Mes</label>
                  <input type="number" value={inputs.daysPerMonth} onChange={(e) => handleInputChange('daysPerMonth', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-yellow-500 outline-none" />
                </div>
              </div>
              
              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Modo de Cálculo</label>
                <select value={inputs.calcMode} onChange={(e) => handleInputChange('calcMode', e.target.value)} className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:border-yellow-500 outline-none">
                  <option value="manual">{`Velocidad Fija (Max ${physicalMaxMH} m/h)`}</option>
                  <option value="derive_nominal">Autocalcular Vel. para cumplir capacidad</option>
                </select>
              </div>
            </div>



            {/* PANDORA Chat Dialog */}
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm shadow-xl flex flex-col h-[600px] sticky top-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-neon-purple flex items-center gap-2 border-b border-slate-200 pb-3 mb-4">
                <Bot className="w-4 h-4" /> Asistente PANDORA
              </h2>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={cn("flex flex-col gap-1 text-sm", msg.role === 'user' ? "items-end" : "items-start")}>
                    <div className={cn(
                      "px-4 py-2 rounded-2xl max-w-[95%] whitespace-pre-wrap leading-relaxed",
                      msg.role === 'user' ? "bg-white/10 text-slate-800 rounded-br-sm" : "bg-neon-purple/10 border border-neon-purple/20 text-gray-200 rounded-bl-sm"
                    )}>
                      {typeof msg.content === 'object' ? <ResponseRenderer data={msg.content} /> : msg.content}
                    </div>
                  </div>
                ))}
                {isChatTyping && (
                  <div className="flex items-start">
                    <div className="px-4 py-2 rounded-2xl bg-neon-purple/5 border border-neon-purple/10 text-neon-purple rounded-bl-sm flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Procesando...
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              <form onSubmit={handleChatSend} className="pt-3 border-t border-slate-200">
                <div className="relative flex items-center bg-white border border-slate-200 rounded-xl focus-within:border-neon-purple/50 transition-colors">
                  <input
                    type="text"
                    className="flex-1 bg-transparent px-4 py-3 text-sm text-slate-800 placeholder-gray-600 outline-none"
                    placeholder="Pide sugerencias o análisis a PANDORA..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    disabled={isChatTyping || !chatInput.trim()}
                    className="p-2 mr-1 text-slate-500 hover:text-neon-purple disabled:opacity-30 transition-colors"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Column: Dashboard & Results */}
          <div className="flex-1 min-w-0 space-y-6 relative w-full">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="hidden xl:flex absolute -left-6 top-10 h-16 w-6 bg-white border border-slate-200 shadow-sm border-r-0 rounded-l-xl items-center justify-center text-slate-500 hover:text-slate-800 transition-colors z-10 shadow-lg cursor-pointer hover:shadow-[0_0_15px_rgba(56,189,248,0.2)]"
              title={isSidebarOpen ? "Ocultar Panel de Configuración" : "Mostrar Panel de Configuración"}
            >
              {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {/* Dynamic KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div onClick={() => setInfoModal('speed')} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-yellow-400 group">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity"><Activity className="w-8 h-8 text-yellow-500" /></div>
                <span className="text-[10px] text-[#0D1A2A] font-bold uppercase tracking-widest group-hover:text-slate-500 transition-colors">Velocidad Usada</span>
                <div className="text-3xl font-black text-[#00B5CC] mt-1">{formatNumber(currentSpeed)} <span className="text-sm text-slate-500 font-medium">m/min</span></div>
                <div className="text-xs text-yellow-500 mt-1">{formatNumber(currentSpeed * 60, 1)} m/h</div>
              </div>
              <div onClick={() => setInfoModal('capacity')} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-blue-300 group">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity"><Box className="w-8 h-8 text-[#00B5CC]" /></div>
                <span className="text-[10px] text-[#0D1A2A] font-bold uppercase tracking-widest group-hover:text-slate-500 transition-colors">Capacidad Real</span>
                <div className="text-3xl font-black text-[#00B5CC] mt-1">{selectedRow ? formatNumber(selectedRow.realBoxesHr, 1) : '-'} <span className="text-sm text-slate-500 font-medium">c/h</span></div>
                <div className="text-xs text-[#00B5CC] mt-1">Obj: {inputs.nominalBoxes} c/h</div>
              </div>
              <div onClick={() => setInfoModal('residence')} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 group">
                <span className="text-[10px] text-[#0D1A2A] font-bold uppercase tracking-widest group-hover:text-slate-500 transition-colors">Residencia</span>
                <div className="text-3xl font-black text-[#00B5CC] mt-1">{selectedRow ? formatNumber(selectedRow.residenceMin) : '-'} <span className="text-sm text-slate-500 font-medium">min</span></div>
              </div>
              <div onClick={() => setInfoModal('inside')} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 group">
                <span className="text-[10px] text-[#0D1A2A] font-bold uppercase tracking-widest group-hover:text-slate-500 transition-colors">Cajas Dentro</span>
                <div className="text-3xl font-black text-[#00B5CC] mt-1">{selectedRow ? formatNumber(selectedRow.inside) : '-'} <span className="text-sm text-slate-500 font-medium">pzs</span></div>
              </div>
            </div>

            {/* Twin Digital 3D */}

            {/* TABS DE SECCIÓN */}
            <div className="flex flex-wrap bg-slate-200 p-1.5 rounded-full gap-1 border border-slate-300 mx-auto max-w-fit shadow-inner">
              {[
                { id: 'resumen', label: '1. Portada' },
                { id: 'twin', label: '2. Twin 3D' },
                { id: 'tabla', label: '3. Métricas' },
                { id: 'capex', label: '4. Capex' },
                { id: 'opex', label: '5. Opex' },
                { id: 'mantenimiento', label: '6. Riesgos/Man...' },
                { id: 'obracivil', label: '7. Obra Civil' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTabChange(t.id)}
                  className={`px-5 py-2.5 rounded-full text-[11px] font-black uppercase transition-all tracking-wider text-center truncate ${
                    activeTab === t.id 
                      ? 'bg-white text-[#0D1A2A] shadow-md font-extrabold' 
                      : 'text-slate-500 hover:text-[#0D1A2A] hover:bg-white/50'
                  }`}
                  title={t.label}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* TAB CONTENTS */}
            {activeTab === 'resumen' && (
              <TabPortada
                computedRows={computedRows}
                selectedId={selectedId}
                setSelectedId={setSelectedId}
                toggleInclusion={toggleInclusion}
                dailyReqs={dailyReqs}
                updateBoxRequirement={updateBoxRequirement}
                reqLocked={reqLocked}
                setReqLocked={setReqLocked}
                saveStatus={saveStatus}
                openEditBoxModal={openEditBoxModal}
                removeBox={removeBox}
                excluidos={excluidos}
                selectedMixIds={selectedMixIds}
                toggleMix={toggleMix}
                distributeGlobalRate={distributeGlobalRate}
                setSelectedMixIds={setSelectedMixIds}
                totalLavadoReq={totalLavadoReq}
                scenarioResults={scenarioResults}
                inputs={inputs}
                activeCapacityPerHour={activeCapacityPerHour}
                setViabilityInfoModal={setViabilityInfoModal}
                productImageBase64={productImageBase64}
                handleRemoveProductImage={handleRemoveProductImage}
                handleProductImageUpload={handleProductImageUpload}
                openNewBoxModal={openNewBoxModal}
                clearBoxes={clearBoxes}
                loadOfficialReqs={loadOfficialReqs}
                lavadoRows={lavadoRows}
                secadoRows={secadoRows}
              />
            )}

            {activeTab === 'twin' && (
              <TabTwin3D
                twinBlockRef={twinBlockRef}
                isTwinBlockFullscreen={isTwinBlockFullscreen}
                setIsDesignsLibraryOpen={setIsDesignsLibraryOpen}
                isTwinEditMode={isTwinEditMode}
                setIsTwinEditMode={setIsTwinEditMode}
                toggleTwinBlockFullscreen={toggleTwinBlockFullscreen}
                handleSyncFromFlowDesigner={handleSyncFromFlowDesigner}
                twinLayout={twinLayout}
                isAnchoring={isAnchoring}
                isAnchored={isAnchored}
                setIsAnchored={setIsAnchored}
                handleAnchorToSimulator={handleAnchorToSimulator}
                twinLabelHeightOffset={twinLabelHeightOffset}
                setTwinLabelHeightOffset={setTwinLabelHeightOffset}
                twinLabelsCollapsed={twinLabelsCollapsed}
                setTwinLabelsCollapsed={setTwinLabelsCollapsed}
                twinFloorElevation={twinFloorElevation}
                setTwinFloorElevation={setTwinFloorElevation}
                twinFloorLocked={twinFloorLocked}
                setTwinFloorLocked={setTwinFloorLocked}
                twinNodes={twinNodes}
                setTwinNodes={setTwinNodes}
                twinEdges={twinEdges}
                setTwinEdges={setTwinEdges}
                selectedTwinNodeId={selectedTwinNodeId}
                setSelectedTwinNodeId={setSelectedTwinNodeId}
                openAddTwinNode={openAddTwinNode}
                openEditTwinNode={openEditTwinNode}
                handleDeleteTwinNode={handleDeleteTwinNode}
                showTwinNodeEditor={showTwinNodeEditor}
                editingTwinNodeId={editingTwinNodeId}
                twinNodeForm={twinNodeForm}
                setTwinNodeForm={setTwinNodeForm}
                TWIN_CATEGORIES={TWIN_CATEGORIES}
                COLOR_SWATCHES={COLOR_SWATCHES}
                handleSaveTwinNode={handleSaveTwinNode}
                resetTwinNodeForm={resetTwinNodeForm}
                setShowTwinNodeEditor={setShowTwinNodeEditor}
                showTwinEdgeEditor={showTwinEdgeEditor}
                setShowTwinEdgeEditor={setShowTwinEdgeEditor}
                twinEdgeForm={twinEdgeForm}
                setTwinEdgeForm={setTwinEdgeForm}
                handleAddTwinEdge={handleAddTwinEdge}
                twinTheme={twinTheme}
                setTwinTheme={setTwinTheme}
                pendingUpload={pendingUpload}
                uploadModelName={uploadModelName}
                setUploadModelName={setUploadModelName}
                isSavingToCloud={isSavingToCloud}
                uploadProgress={uploadProgress}
                handleConfirmUploadToLibrary={handleConfirmUploadToLibrary}
                handleCancelUpload={handleCancelUpload}
                isDesignsLibraryOpen={isDesignsLibraryOpen}
                currentDesignId={currentDesignId}
                setTwinLayout={setTwinLayout}
                handleLoadDesignFromLibrary={handleLoadDesignFromLibrary}
                processAndSetupTwinModel={processAndSetupTwinModel}
                handleTwinModelUpload={handleTwinModelUpload}
                handleUpdateTwinNode={handleUpdateTwinNode}
              />
            )}

            {activeTab === 'tabla' && (
              <TabMetricas
                selectedRow={selectedRow}
                worstLavado={worstLavado}
                manualLinesUsed={manualLinesUsed}
                setManualLinesUsed={setManualLinesUsed}
                scenarioResults={scenarioResults}
                CUSTOMER_SCENARIOS={CUSTOMER_SCENARIOS}
                setCustomerScenarios={setCustomerScenarios}
                computedRows={computedRows}
                selectedMixIds={selectedMixIds}
                setViabilityInfoModal={setViabilityInfoModal}
                totalLavadoReq={totalLavadoReq}
                totalSecadoReq={totalSecadoReq}
                installedPowerKw={installedPowerKw}
                heatingKw={heatingKw}
                pumpsKw={pumpsKw}
                blowersKw={blowersKw}
                beltKw={beltKw}
                washFlowLh={washFlowLh}
                setWashFlowLh={setWashFlowLh}
                waterReplenishLh={waterReplenishLh}
                setWaterReplenishLh={setWaterReplenishLh}
                tankCapacityL={tankCapacityL}
                setTankCapacityL={setTankCapacityL}
                waterChangeDays={waterChangeDays}
                setWaterChangeDays={setWaterChangeDays}
                activeCapacityPerHour={activeCapacityPerHour}
                isEditingPower={isEditingPower}
                setIsEditingPower={setIsEditingPower}
                powerDraft={powerDraft}
                setPowerDraft={setPowerDraft}
                isEditingWashFlow={isEditingWashFlow}
                setIsEditingWashFlow={setIsEditingWashFlow}
                washFlowDraft={washFlowDraft}
                setWashFlowDraft={setWashFlowDraft}
                isEditingReplenish={isEditingReplenish}
                setIsEditingReplenish={setIsEditingReplenish}
                replenishDraft={replenishDraft}
                setReplenishDraft={setReplenishDraft}
                isEditingTank={isEditingTank}
                setIsEditingTank={setIsEditingTank}
                tankDraft={tankDraft}
                setTankDraft={setTankDraft}
                isEditingChangeDays={isEditingChangeDays}
                setIsEditingChangeDays={setIsEditingChangeDays}
                changeDaysDraft={changeDaysDraft}
                setChangeDaysDraft={setChangeDaysDraft}
                inputs={inputs}
                physicalMaxMH={physicalMaxMH}
                totalHrsLavado={totalHrsLavado}
                totalHrsSecado={totalHrsSecado}
                setInfoModal={setInfoModal}
                simulatorId={simulatorId}
              />
            )}

            {activeTab === 'capex' && (
              <DHLTabCapex inputs={finInputs} setInputs={setFinInputs} results={finResults} />
            )}
            
            {activeTab === 'opex' && (
              <DHLTabOpex inputs={finInputs} setInputs={setFinInputs} results={finResults} />
            )}
            
            {activeTab === 'mantenimiento' && (
              <DHLTabMantenimiento inputs={finInputs} setInputs={setFinInputs} />
            )}
            
            {activeTab === 'obracivil' && (
              <DHLTabObraCivil inputs={finInputs} setInputs={setFinInputs} />
            )}
          </div>
        </div>
      </div>

            {/* ── Barra de exportación flotante inferior ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-5 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-2xl bg-black/80 backdrop-blur-xl border border-slate-200 shadow-2xl">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 mr-1">Exportar</span>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-slate-200 hover:bg-white/10 text-slate-500 transition-all text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 transition-all text-xs font-bold"
          >
            <Table2 className="w-3.5 h-3.5" /> Excel
          </button>

        </div>
      </div>

      {/* Modal de Cristal: Agregar Nuevo Modelo */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md">
          <div className="w-full max-w-lg p-8 rounded-[32px] bg-white border border-slate-200 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black uppercase tracking-widest text-[#00B5CC] flex items-center gap-3 border-b border-slate-200 pb-5 mb-6">
              <Box className="w-6 h-6" /> {editingBoxId ? 'Editar Modelo de Caja' : 'Nuevo Modelo de Caja'}
            </h2>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Nombre del Modelo</label>
                <input type="text" placeholder="Ej. Caja Agrícola Exportación" value={boxInput.name} onChange={(e) => handleBoxInputChange('name', e.target.value)} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-blue-400 outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Largo (cm)</label>
                  <input type="number" value={boxInput.l} onChange={(e) => handleBoxInputChange('l', Number(e.target.value))} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-3 py-3 text-sm text-center text-slate-800 focus:border-blue-400 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Ancho (cm)</label>
                  <input type="number" value={boxInput.w} onChange={(e) => handleBoxInputChange('w', Number(e.target.value))} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-3 py-3 text-sm text-center text-slate-800 focus:border-blue-400 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Alto (cm)</label>
                  <input type="number" value={boxInput.h} onChange={(e) => handleBoxInputChange('h', Number(e.target.value))} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-3 py-3 text-sm text-center text-slate-800 focus:border-blue-400 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gap (m)</label>
                  <input type="number" step="0.01" value={boxInput.gap} onChange={(e) => handleBoxInputChange('gap', Number(e.target.value))} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-blue-400 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Avance</label>
                  <select value={boxInput.advanceSide} onChange={(e) => handleBoxInputChange('advanceSide', e.target.value)} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-blue-400 outline-none">
                    <option value="length">Largo</option>
                    <option value="width">Ancho</option>
                    <option value="auto">Auto (Menor)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Color (ID)</label>
                  <input type="color" value={boxInput.color || '#3b82f6'} onChange={(e) => handleBoxInputChange('color', e.target.value)} className="w-full h-[46px] bg-white border border-slate-200 shadow-sm rounded-xl px-2 py-1 cursor-pointer focus:border-blue-400 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tipo de Máquina</label>
                  <select value={boxInput.maquina} onChange={(e) => handleBoxInputChange('maquina', e.target.value)} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-blue-400 outline-none">
                    <option value="lavado_secado">Lavado + Secado</option>
                    <option value="secado">Solo Secado</option>
                    <option value="no">Excluido / Otros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Grado de Suciedad</label>
                  <select value={boxInput.suciedad} onChange={(e) => handleBoxInputChange('suciedad', e.target.value)} className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 text-sm text-slate-800 focus:border-blue-400 outline-none">
                    <option value="Polvo">Polvo (Ligero)</option>
                    <option value="Grasa">Grasa (Medio)</option>
                    <option value="Aceite">Aceite (Pesado)</option>
                    <option value="Orgánico">Orgánico / Sangre</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 pt-8">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 transition-colors">Cancelar</button>
              <button onClick={saveBox} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-slate-800 font-bold py-4 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2">
                <Plus className="w-5 h-5" /> {editingBoxId ? 'Guardar Cambios' : 'Agregar Caja'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ══════════════════════════════════════════
           MODAL DE CONFIGURACIÓN DEL SIMULADOR
      ══════════════════════════════════════════ */}
      {isConfigOpen && configDraft && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
          <div className="w-full max-w-3xl rounded-[28px] bg-white border border-slate-200 shadow-sm shadow-2xl flex flex-col overflow-hidden" style={{maxHeight:'90vh'}}>
            {/* Header modal */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-slate-200 bg-slate-50">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-3" style={{color:'#ffcc00'}}>
                <Settings className="w-5 h-5" /> Configuración del Simulador
              </h2>
              <button onClick={() => setIsConfigOpen(false)} className="p-2 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {/* Tabs — paleta PANDORA: cyan · purple · blue · pink */}
            <div className="flex gap-1 px-7 pt-4 border-b border-slate-200">
              {[
                {id:'maquina',     label:'⚙ Máquina',        color:'#ffcc00'},
                {id:'escenarios',  label:'📅 Escenarios',     color:'#8B5CF6'},
                {id:'reqs',        label:'📦 Requerimientos', color:'#0080FF'},
                {id:'tiempo',      label:'⏱ Tiempo',          color:'#EC4899'}
              ].map(t => (
                <button key={t.id} onClick={() => setConfigTab(t.id)}
                  style={configTab===t.id?{color:t.color,borderBottomColor:t.color,borderBottomWidth:'2px',backgroundColor:`${t.color}10`}:{}}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all border-b-2 border-transparent ${
                    configTab !== t.id ? 'text-slate-500 hover:text-slate-500' : ''
                  }`}>{t.label}</button>
              ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5">

              {/* TAB: Máquina */}
              {configTab === 'maquina' && (
                <div className="space-y-5">
                  <p className="text-[11px] text-slate-500">Parámetros físicos de las máquinas. Afectan el cálculo de capacidad real, residencia y cajas/h.</p>
                  {['lavadoSecado'].map(mk => {
                    const m = configDraft.machines[mk];
                    const label = 'Lavadora + Secadora';
                    return (
                      <div key={mk} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                        <div className="text-xs font-black uppercase tracking-widest" style={{color: mk==='lavadoSecado'?'#ffcc00':'#8B5CF6'}}>◈ {label}</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[['Vel. Máx (m/h)','maxSpeedMMin', v => v*60, v => v/60],
                            ['Long. Máquina (m)','machineLengthM',v=>v,v=>v],
                            ['Cap. Nominal (c/h)','nominalBoxesPerHour',v=>v,v=>v]
                          ].map(([lbl, field, toDisplay, fromDisplay]) => (
                            <div key={field} className="space-y-1">
                              <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{lbl}</label>
                              <input type="number" step="0.01"
                                value={+toDisplay(m[field]).toFixed(4)}
                                onChange={e => setConfigDraft(prev => {
                                  const d = JSON.parse(JSON.stringify(prev));
                                  d.machines[mk][field] = fromDisplay(Number(e.target.value));
                                  return d;
                                })}
                                className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:border-[#ffcc00] outline-none"
                              />
                            </div>
                          ))}
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Nombre Equipo</label>
                            <input type="text" value={m.machineName}
                              onChange={e => setConfigDraft(prev => { const d=JSON.parse(JSON.stringify(prev)); d.machines[mk].machineName=e.target.value; return d; })}
                              className="w-full bg-white border border-slate-200 shadow-sm rounded-xl px-3 py-2.5 text-sm text-slate-800 focus:border-[#ffcc00] outline-none"
                            />
                          </div>
                        </div>
                        {/* Derived preview */}
                        <div className="grid grid-cols-3 gap-3 mt-2">
                          {[['Cap/h',`${m.nominalBoxesPerHour} c/h`],['Cap/Día (2t×8h)',`${Math.round(m.nominalBoxesPerHour*2*8).toLocaleString('es-MX')} c`],['Cap/Mes (×26)',`${Math.round(m.nominalBoxesPerHour*2*8*26).toLocaleString('es-MX')} c`]].map(([k,v])=>(
                            <div key={k} className="p-3 rounded-xl bg-white border border-slate-200 shadow-sm text-center">
                              <div className="text-[9px] text-slate-600 uppercase font-bold mb-1">{k}</div>
                              <div className="text-sm font-black" style={{color:'#ffcc00'}}>{v}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* TAB: Escenarios (horas/turnos por año) */}
              {configTab === 'escenarios' && (
                <div className="space-y-5">
                  <p className="text-[11px] text-slate-500">Define las horas base, horas efectivas por turno, y número de turnos para cada año (Y1-Y5) en cada máquina.</p>
                  {['lavadoSecado'].map(mk => (
                    <div key={mk} className="p-5 rounded-2xl bg-white border border-slate-200">
                      <div className="text-xs font-black uppercase tracking-widest mb-4" style={{color:'#8B5CF6'}}>◈ {configDraft.scenarios[mk].name}</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[#1E1E1E]">
                              {['Año','Hrs Base','Hrs Ef./Turno','Turnos','T.Disp/Día'].map(h=>(
                                <th key={h} className="px-3 py-2 text-left text-[10px] text-slate-500 uppercase font-bold tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1A1A1A]">
                            {configDraft.scenarios[mk].scenarios.map((row, i) => (
                              <tr key={row.year}>
                                <td className="px-3 py-2 font-black text-slate-800">{row.year}</td>
                                {['hrsBase','effectiveHoursPerShift','shifts'].map(f=>(
                                  <td key={f} className="px-3 py-2">
                                    <input type="number" step="0.01" value={row[f]}
                                      onChange={e => updateScenarioRow(mk, i, f, Number(e.target.value))}
                                      className="w-24 bg-white border border-slate-200 shadow-sm rounded-lg px-2 py-1.5 text-slate-800 focus:border-[#ffcc00] outline-none text-xs"
                                    />
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-[#F59E0B] font-bold">
                                  {(row.effectiveHoursPerShift * row.shifts).toFixed(2)} h
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: Requerimientos del cliente */}
              {configTab === 'reqs' && (
                <div className="space-y-5">
                  <p className="text-[11px] text-slate-500">Rate diario de producción que el cliente necesita procesar. Cambia el cálculo de Req/h y déficit en la tabla de escenarios.</p>
                  {['lavadoSecado'].map(mk => (
                    <div key={mk} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                      <div className="text-xs font-black uppercase tracking-widest" style={{color:'#0080FF'}}>◈ {configDraft.scenarios[mk].name}</div>
                      <div className="grid grid-cols-2 gap-4 items-end">
                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Rate Diario (cajas/día)</label>
                          <input type="number" value={configDraft.scenarios[mk].dailyRate}
                            onChange={e => setConfigDraft(prev => { const d=JSON.parse(JSON.stringify(prev)); d.scenarios[mk].dailyRate=Number(e.target.value); return d; })}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-lg font-black text-slate-800 focus:border-[#0080FF] outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-xl bg-white border border-slate-200 text-center">
                            <div className="text-[9px] text-slate-600 uppercase font-bold mb-1">Por Mes</div>
                            <div className="text-sm font-black" style={{color:'#0080FF'}}>{(configDraft.scenarios[mk].dailyRate * 26).toLocaleString('es-MX')}</div>
                          </div>
                          <div className="p-3 rounded-xl bg-white border border-slate-200 text-center">
                            <div className="text-[9px] text-slate-600 uppercase font-bold mb-1">Por Año</div>
                            <div className="text-sm font-black" style={{color:'#0080FF'}}>{(configDraft.scenarios[mk].dailyRate * 26 * 12).toLocaleString('es-MX')}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* TAB: Tiempo efectivo */}
              {configTab === 'tiempo' && (
                <div className="space-y-5">
                  <p className="text-[11px] text-slate-500">Factor de tiempo efectivo y parámetros de turno para el cálculo de capacidad diaria y mensual general.</p>
                  <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4">
                    <div className="text-xs font-black uppercase tracking-widest" style={{color:'#EC4899'}}>◈ Parámetros Generales de Operación</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[['Horas x Turno','hoursPerShift'],['Turnos x Día','shifts'],['Días x Mes','daysPerMonth']].map(([lbl,field])=>(
                        <div key={field} className="space-y-1">
                          <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">{lbl}</label>
                          <input type="number" step="1" value={inputs[field]}
                            onChange={e => handleInputChange(field, Number(e.target.value))}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black text-slate-800 focus:border-[#EC4899] outline-none"
                          />
                        </div>
                      ))}
                      <div className="space-y-1">
                        <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Factor Efic. (%)</label>
                        <input type="number" step="1" min="1" max="100"
                          value={inputs.efficiencyFactor ?? 100}
                          onChange={e => handleInputChange('efficiencyFactor', Number(e.target.value))}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-sm font-black text-slate-800 focus:border-[#EC4899] outline-none"
                        />
                      </div>
                    </div>
                    {/* Preview */}
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {[['Hrs Disponibles/Día', `${(inputs.hoursPerShift*(inputs.shifts||2)).toFixed(1)} h`],
                        ['Hrs Efectivas (×factor)', `${((inputs.hoursPerShift*(inputs.shifts||2))*(inputs.efficiencyFactor??100)/100).toFixed(2)} h`],
                        ['Días Op./Mes', `${inputs.daysPerMonth} días`]
                      ].map(([k,v])=>(
                        <div key={k} className="p-3 rounded-xl bg-white border border-slate-200 text-center">
                          <div className="text-[9px] text-slate-600 uppercase font-bold mb-1">{k}</div>
                          <div className="text-sm font-black" style={{color:'#EC4899'}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>{/* end content */}

            {/* Footer */}
            <div className="flex items-center justify-between px-7 py-4 border-t border-slate-200 bg-slate-50">
              <span className="text-[10px] text-slate-600">Los cambios se aplican al cerrar con Guardar.</span>
              <div className="flex gap-3">
                <button onClick={() => setIsConfigOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 transition-colors">Cancelar</button>
                <button onClick={saveConfig} className="px-6 py-2.5 rounded-xl text-xs font-bold text-black bg-[#ffcc00] hover:bg-[#00d4e0] transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)]">Guardar Cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalle de cálculo viabilidad */}
      {viabilityInfoModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setViabilityInfoModal(null)}>
          <div className="w-full max-w-md rounded-[24px] bg-white border border-slate-200 shadow-sm shadow-2xl p-7 relative"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setViabilityInfoModal(null)}
              className="absolute top-5 right-5 p-1.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
            {/* Title */}
            <h3 className="text-base font-black uppercase tracking-widest text-yellow-400 mb-1 pr-8">
              {viabilityInfoModal.title}
            </h3>
            <p className="text-xs text-slate-500 mb-5 leading-relaxed border-b border-slate-200 pb-4">
              {viabilityInfoModal.formula}
            </p>
            {/* Steps */}
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Paso a paso con los valores actuales</div>
              {viabilityInfoModal.steps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-yellow-400/10 text-yellow-400 text-[10px] font-black flex items-center justify-center shrink-0">{i+1}</span>
                  <p className="text-sm text-slate-800 leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setViabilityInfoModal(null)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-black bg-yellow-400 hover:bg-yellow-300 transition-colors">
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Cristal: Información de KPIs */}
      {infoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white/[0.05] border-t border-l border-white/30 border-b border-r border-black/50 shadow-[0_15px_35px_rgba(0,0,0,0.5),inset_0_0_20px_rgba(255,255,255,0.05)] backdrop-blur-xl relative">
            <button onClick={() => setInfoModal(null)} className="absolute top-5 right-5 p-1.5 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 border border-slate-200 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
            <h3 className={cn("text-lg font-black uppercase tracking-widest mb-2 pr-8", kpiInfo[infoModal].color)}>
              {kpiInfo[infoModal].title}
            </h3>
            <div className="space-y-4 text-sm text-slate-500 leading-relaxed mt-4">
              <p>{kpiInfo[infoModal].description}</p>
              <div className="p-4 rounded-xl bg-black/30 border border-slate-200">
                <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Cómo se calcula</span>
                <p className="text-slate-500 italic text-xs leading-relaxed">{kpiInfo[infoModal].calculation}</p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-200 flex justify-end">
              <button onClick={() => setInfoModal(null)} className="px-5 py-2 rounded-xl text-xs font-bold text-slate-800 bg-white/10 hover:bg-white/20 transition-colors">Entendido</button>
            </div>
          </div>
        </div>
      )}

      {/* ── RYDER Informe PDF Modal ─────────────────────────────────────── */}
      {showReportModal && (
        <RyderReportModal
          reportData={reportModalData}
          printWindow={printWindow}
          clearPrintWindow={() => setPrintWindow(null)}
          onExportPDF={directExportPDF}
          onClose={() => {
            setShowReportModal(false);
            if (printWindow) {
              try { printWindow.close(); } catch (e) {}
              setPrintWindow(null);
            }
          }}
        />
      )}

      {/* Hidden container for high-fidelity direct PDF export */}
      {isExportingPdf && reportModalData && (
        <div 
          id="ry-export-hidden-root"
          style={{ 
            position: 'fixed', 
            left: '-9999px', 
            top: 0, 
            zIndex: -9999, 
            width: '1120px', 
            background: '#ffffff' 
          }}
        >
          <RyderReportModal
            reportData={reportModalData}
            isExportOnly={true}
            onClose={() => {}}
          />
        </div>
      )}

      {/* Premium Progress Loading overlay */}
      {isExportingPdf && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-sm p-6 rounded-[24px] bg-white border border-cyan-300 shadow-[0_0_50px_rgba(17,181,201,0.25)] text-center">
            <div className="w-16 h-16 border-4 border-[#11b5c9]/20 border-t-[#11b5c9] rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-slate-800 mb-2">Generando PDF de Alta Resolución</h3>
            <p className="text-[#6b8599] text-sm mb-4">Exportando el informe de 12 páginas completo en formato vectorial directamente.</p>
            <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
              <span className="text-xs text-[#11b5c9] font-bold uppercase tracking-widest block mb-1">Estado de Progreso</span>
              <span className="text-slate-800 font-mono text-sm font-semibold">{exportProgress}</span>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Cristal: Nombre de Exportación (Vidrio Biselado 30%) */}
      {showFileNameModal && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={() => { setShowFileNameModal(false); setPdfPendingAction(false); }}
        >
          <div 
            className="w-full max-w-sm p-8 rounded-[32px] bg-white/30 backdrop-blur-2xl relative overflow-hidden"
            style={{
              borderTop: '1px solid rgba(255, 255, 255, 0.45)',
              borderLeft: '1px solid rgba(255, 255, 255, 0.45)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.35)',
              borderRight: '1px solid rgba(0, 0, 0, 0.35)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6), inset 0 0 20px rgba(255, 255, 255, 0.1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/15 to-transparent pointer-events-none" />

            <div className="relative z-10">
              <h3 className="text-xl font-black uppercase tracking-[0.2em] mb-2 text-slate-800 text-center">
                {pdfPendingAction ? 'Descargar PDF' : 'Nombre de Archivo'}
              </h3>
              <p className="text-[10px] text-gray-200 uppercase tracking-widest text-center mb-6 opacity-85">
                {pdfPendingAction ? 'Asigna el nombre de tu reporte técnico' : 'Configurar nombre base del archivo'}
              </p>

              <div className="space-y-4">
                <div className="relative group">
                  <input
                    type="text"
                    value={tempFileName}
                    onChange={e => setTempFileName(e.target.value)}
                    placeholder="Nombre del archivo..."
                    className="w-full px-5 py-4 rounded-2xl bg-black/45 border border-white/20 text-slate-800 placeholder-gray-400 
                             focus:outline-none focus:border-[#ffcc00]/60 focus:shadow-[0_0_20px_rgba(0,240,255,0.25)] 
                             transition-all duration-300 text-center font-bold"
                    autoFocus
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const finalName = tempFileName.trim();
                        setCustomFileName(finalName);
                        setShowFileNameModal(false);
                        if (pdfPendingAction) {
                          setPdfPendingAction(false);
                          setTimeout(() => performActualPdfExport(finalName), 300);
                        }
                      } else if (e.key === 'Escape') {
                        setShowFileNameModal(false);
                        setPdfPendingAction(false);
                      }
                    }}
                  />
                </div>
              </div>

              <div className="mt-8 flex flex-col gap-3">
                <button 
                  onClick={() => { 
                    const finalName = tempFileName.trim();
                    setCustomFileName(finalName); 
                    setShowFileNameModal(false); 
                    if (pdfPendingAction) {
                      setPdfPendingAction(false);
                      setTimeout(() => performActualPdfExport(finalName), 300);
                    }
                  }} 
                  className="w-full py-4 rounded-2xl text-xs font-black uppercase tracking-widest text-black 
                           bg-[#ffcc00] hover:bg-[#00D0FF] shadow-[0_10px_20px_rgba(0,240,255,0.25)] 
                           hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                >
                  {pdfPendingAction ? 'Exportar e Iniciar Descarga' : 'Guardar Cambios'}
                </button>
                <button 
                  onClick={() => { setShowFileNameModal(false); setPdfPendingAction(false); }} 
                  className="w-full py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-slate-800/60 
                           hover:text-slate-800 hover:bg-white/10 transition-all duration-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Premium Toast Notification System */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-[9999] animate-fade-in-up">
          <div className="relative px-6 py-4 rounded-2xl bg-black/80 backdrop-blur-xl border border-yellow-500/50 shadow-[0_0_24px_rgba(0,240,255,0.15)] flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
            <span className="text-xs font-semibold tracking-wide text-slate-800 font-mono">{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
}
