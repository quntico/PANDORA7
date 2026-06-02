import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ResponseRenderer from '@/components/beta/renderers/ResponseRenderer';
import { supabase, uploadFileWithProgress } from '@/supabase';
import RyderReportModal from '@/components/ryder/RyderReportModal';
import { buildRyderReportData } from '@/utils/buildRyderReportData';
import SharedTwinViewer3D from '@/components/flow/SharedTwinViewer3D';
import { useFlowDesigns } from '@/hooks/useFlowDesigns';
import FlowDesignsLibrary from '@/components/flow/FlowDesignsLibrary';
import { FolderOpen, Upload, Check, Sliders, Pencil, Link2, Droplets, Zap, Wind, Navigation, Cpu, Warehouse, Wrench, Anchor } from 'lucide-react';


import { Activity, ArrowLeft, Bot, Box, Brain, ChevronLeft, ChevronRight, Download, Edit3, Eye, FileText, LayoutDashboard, Lock, Minus, Plus, Send, Settings, Table2, Target, Trash2, Unlock, Loader2, X, Play, RotateCcw, Copy, Maximize2, Minimize2, Power, Calculator, EyeOff, FileDigit, GripVertical, AlertTriangle, Printer, Truck, BarChart2, CheckCircle2, Factory, Layers } from 'lucide-react';
import axios from 'axios';
import { Link, useParams } from 'react-router-dom';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell } from 'recharts';

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
    const requiredLines = (manualLinesUsed !== null && manualLinesUsed !== undefined) 
      ? manualLinesUsed 
      : (row.requiredPerHour > 0 ? Math.ceil(row.requiredPerHour / machine.actualBoxesHr) : 0);
      
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

export default function RiderSimulatorPage() {
  const { id } = useParams();
  const simulatorId = id || 'rider';
  const isGusi = checkIsGusi(simulatorId);
  const isIase = checkIsIase(simulatorId);

  // Cargar metadatos del simulador desde localStorage
  const simulatorMeta = useMemo(() => {
    try {
      const list = JSON.parse(localStorage.getItem('pandora_simulators') || '[]');
      return list.find(s => s.id === simulatorId) || { name: 'RYDER', description: 'Línea de lavado y secado para pallets/cajas plásticas (140 m/h max)' };
    } catch {
      return { name: 'RYDER', description: 'Línea de lavado y secado para pallets/cajas plásticas (140 m/h max)' };
    }
  }, [simulatorId]);

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
      : 'MÁQUINA EN EVALUACIÓN - PLD-140 | RYDER';
  });

  const [customerName, setCustomerName] = useState(() => {
    const saved = localStorage.getItem(`sim_${simulatorId}_customer_name`);
    return saved || 'CENTRAL DE INTELIGENCIA';
  });

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

  const buildReport = () => buildRyderReportData({
    inputs, computedRows, scenarioResults, mixScenarioResults,
    CUSTOMER_SCENARIOS, MACHINE_CONFIGS, selectedRow, physicalMaxMH,
    simulatorName: simulatorMeta.name,
    installedPowerKw,
    washFlowLh,
    waterReplenishLh,
    tankCapacityL,
    waterChangeDays,
    clientName,
    customerName
  });

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
        const hasRiderBoxes = parsed.some(b => b.id.startsWith('ex') && !b.id.startsWith('gusi_ex'));
        const hasGusiBoxes = parsed.some(b => b.id.startsWith('gusi_ex'));
        // Si el simulador es Gusi pero tiene cajas vacías o de rider, auto-sanar con las de Gusi
        if (isGusi && (hasRiderBoxes || !hasGusiBoxes || parsed.length === 0)) {
          const gusiDefaults = [
            { id:'gusi_ex0', name:'Canastilla Negra CHICA',  l:60.00, w:40.00, h:26.60, gap:0.100, advanceSide:'length', color:'#6b7280', maquina:'lavado_secado', suciedad:'Polvo', included:true },
            { id:'gusi_ex1', name:'Canastilla Negra GRANDE', l:60.00, w:39.00, h:21.40, gap:0.100, advanceSide:'length', color:'#8b5cf6', maquina:'lavado_secado', suciedad:'Polvo', included:true },
            { id:'gusi_ex2', name:'Canastilla AMARILLA',     l:60.00, w:40.00, h:28.00, gap:0.100, advanceSide:'length', color:'#f59e0b', maquina:'lavado_secado', suciedad:'Polvo', included:true },
            { id:'gusi_ex3', name:'Canastilla Verde',        l:59.00, w:39.00, h:22.30, gap:0.100, advanceSide:'length', color:'#10b981', maquina:'lavado_secado', suciedad:'Polvo', included:true },
          ];
          localStorage.setItem(`sim_${simulatorId}_boxes`, JSON.stringify(gusiDefaults));
          return gusiDefaults;
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
      // ── LAVADO Y SECADO ──────────────────────────────────────────────────────
      { id:'ex0', name:'Contenedor CHICO',       l:30.48, w:38.10, h:17.78, gap:0.095, advanceSide:'length', color:'#6b7280', maquina:'lavado_secado', suciedad:'Polvo',  included:true  },
      { id:'ex1', name:'Contenedor MEDIANO',     l:60.96, w:38.10, h:17.78, gap:0.100, advanceSide:'length', color:'#8b5cf6', maquina:'lavado_secado', suciedad:'Polvo',  included:true  },
      { id:'ex2', name:'Contenedor Rectangular', l:60.96, w:38.10, h:35.56, gap:0.080, advanceSide:'length', color:'#3b82f6', maquina:'lavado_secado', suciedad:'Polvo',  included:true  },
      // ── SOLO SECADO ──────────────────────────────────────────────────────────
      { id:'ex3', name:'Contenedor Cuadrado',    l:60.96, w:55.88, h:35.56, gap:0.100, advanceSide:'length', color:'#10b981', maquina:'secado',        suciedad:'Grasa',  included:true  },
      // ── ESPECIALES / BULK (Integrados en evaluación) ─────────────────────────
      { id:'ex4', name:'CONT-AIP-ABAT (bulk bote)', l:114.30, w:121.92, h:86.36, gap:0.097, advanceSide:'length', color:'#f59e0b', maquina:'lavado_secado', suciedad:'Polvo', included:true },
      { id:'ex5', name:'TAPA-AIP-ABAT (bulk bote)', l:114.30, w:121.92, h:12.70, gap:0.097, advanceSide:'length', color:'#ec4899', maquina:'lavado_secado', suciedad:'Polvo', included:true },
      { id:'ex6', name:'Tapas (separadores)',        l:0,      w:0,      h:0,     gap:0,     advanceSide:'length', color:'#94a3b8', maquina:'lavado_secado', suciedad:'Polvo', included:true },
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
    return isGusi ? 'gusi_ex0' : 'ex0';
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
  const COLOR_SWATCHES = ['#00F0FF','#10b981','#8B5CF6','#ec4899','#3b82f6','#f97316','#eab308','#ef4444','#ffffff','#06b6d4'];

  const [showTwinNodeEditor, setShowTwinNodeEditor] = useState(false);
  const [showTwinEdgeEditor, setShowTwinEdgeEditor] = useState(false);
  const [editingTwinNodeId, setEditingTwinNodeId] = useState(null);
  const [twinNodeForm, setTwinNodeForm] = useState({ label: '', type: 'Equipo', category: 'process', color: '#00F0FF', capacity: '', power: '' });
  const [twinEdgeForm, setTwinEdgeForm] = useState({ source: '', target: '', color: '#00F0FF' });

  const resetTwinNodeForm = () => {
    setTwinNodeForm({ label: '', type: 'Equipo', category: 'process', color: '#00F0FF', capacity: '', power: '' });
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
      color:    node.data?.color    || '#00F0FF',
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
    setTwinEdgeForm({ source: '', target: '', color: '#00F0FF' });
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
    : { ex0:1610, ex1:798, ex2:1064, ex3:574, ex4:82, ex5:82, ex6:0 };
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
          linesRequired: avail > 0 ? Math.ceil(totalHrsLavado / avail) : 0,
          status: avail >= totalHrsLavado ? 'VIABLE' : 'NO VIABLE',
        },
        // Solo Secado
        secado: {
          requiredHoursTotal: totalHrsSecado,
          deficitOrSurplusHours: avail - totalHrsSecado,
          linesRequired: avail > 0 ? Math.ceil(totalHrsSecado / avail) : 0,
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
          r.requiredLines+(r.requiredLines===1?' maq.':' maqs.')
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
      color: 'text-neon-cyan'
    },
    capacity: {
      title: 'Capacidad Real',
      description: 'Indica la cantidad real de cajas por hora que la máquina procesará.',
      calculation: 'Se calcula dividiendo la velocidad lineal (convertida a metros por hora) entre el Paso de cada caja (Avance + Gap). Se restringe a la Capacidad Objetivo si la supera en el modo autocalcular.',
      color: 'text-blue-400'
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
      color: 'text-neon-cyan'
    },
    col_nombre: {
      title: 'Nombre',
      description: 'El nombre descriptivo o código del modelo de la caja o pallet.',
      calculation: 'Definido por el usuario al crear o editar el modelo.',
      color: 'text-neon-cyan'
    },
    col_dim: {
      title: 'Dimensiones (cm)',
      description: 'Las medidas físicas de la caja: Largo × Ancho × Alto.',
      calculation: 'Ingresadas en la configuración de la caja.',
      color: 'text-neon-cyan'
    },
    col_paso: {
      title: 'Paso (m)',
      description: 'El espacio total que ocupa una caja en la banda transportadora, incluyendo su margen de separación (Gap).',
      calculation: 'Largo en avance (m) + Gap (m).',
      color: 'text-neon-cyan'
    },
    col_vel: {
      title: 'Vel. (m/h)',
      description: 'Velocidad lineal de la banda necesaria para este modelo.',
      calculation: 'Si es modo Fijo, usa la velocidad manual. Si es Autocalcular, se ajusta para cumplir la capacidad objetivo.',
      color: 'text-neon-cyan'
    },
    col_cap: {
      title: 'Cap. Real',
      description: 'La cantidad máxima de cajas por hora que la máquina puede lavar a la velocidad dada.',
      calculation: 'Velocidad (m/h) ÷ Paso de la caja (m).',
      color: 'text-blue-400'
    },
    col_cap_dia: {
      title: 'Cap. Día',
      description: 'Capacidad total de cajas por día operativo.',
      calculation: 'Capacidad Real (c/h) × Horas por Turno × Turnos por Día.',
      color: 'text-gray-300'
    },
    col_cap_mes: {
      title: 'Cap. Mes',
      description: 'Capacidad total de cajas en el mes operativo.',
      calculation: 'Capacidad por Día × Días por Mes.',
      color: 'text-gray-300'
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
      color: 'text-gray-300'
    },
    col_acc: {
      title: 'Acciones',
      description: 'Opciones para modificar o eliminar el modelo de la simulación.',
      calculation: 'No aplica.',
      color: 'text-neon-cyan'
    },
    // ---- Columnas de Escenarios del Cliente ----
    sc_year: {
      title: 'Año',
      description: 'Horizonte de planificación. Representa el año operativo del cliente (Y1 = primer año, Y5 = quinto año).',
      calculation: 'Definido directamente por los escenarios del cliente. No se calcula; es un identificador de periodo.',
      color: 'text-white'
    },
    sc_hrsBase: {
      title: 'Hrs Base',
      description: 'Número de horas brutas declaradas por el cliente como jornada laboral de referencia para ese año. No son horas efectivas; incluyen tiempos no productivos.',
      calculation: 'Dato del cliente. Generalmente disminuye cada año conforme se optimizan los procesos (Y1=48h, Y5=40h).',
      color: 'text-gray-300'
    },
    sc_hrsEf: {
      title: 'Hrs Ef./Turno',
      description: 'Horas reales productivas por turno, descontando arranque, limpieza, paros programáticos y breaks. Es el tiempo en que la máquina realmente puede procesar.',
      calculation: 'Dato del cliente. Ejemplo: de 8 horas brutas se restan 1.41 h de ineficiencias, resultando en 6.59 horas efectivas.',
      color: 'text-gray-300'
    },
    sc_turnos: {
      title: 'Turnos',
      description: 'Número de turnos operativos por día. Actualmente configurado en 2 turnos para todos los escenarios.',
      calculation: 'Dato del cliente. Se multiplica por las horas efectivas por turno para obtener el tiempo disponible total del día.',
      color: 'text-gray-300'
    },
    sc_tDisp: {
      title: 'T. Disp. (h)',
      description: 'Tiempo total productivo disponible en el día, sumando todos los turnos efectivos. Este es el tiempo real en que la máquina puede operar.',
      calculation: `Hrs Efectivas por Turno × Número de Turnos. Ejemplo Y1: 6.59 h × 2 = 13.18 h/día.`,
      color: 'text-gray-300'
    },
    sc_rateDia: {
      title: 'Rate / Día',
      description: 'Volumen de producción diario fijo que el cliente necesita lavar/secar. Es el objetivo de producción absoluto e inamovible.',
      calculation: 'Dato fijo del cliente. Para Lavado y Secado: 3,472 piezas/día.',
      color: 'text-gray-300'
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
      color: 'text-blue-400'
    },
    sc_deficit: {
      title: 'Déficit / Superávit',
      description: 'Diferencia entre lo que la máquina puede hacer y lo que el cliente necesita. Positivo = capacidad sobrante. Negativo = la máquina no alcanza.',
      calculation: `Capacidad Real Máquina (c/h) − Producción Requerida (c/h). Valor positivo → verde (sobrante). Valor negativo → rojo (déficit).`,
      color: 'text-green-400'
    },
    sc_cobertura: {
      title: 'Cobertura %',
      description: 'Porcentaje de la demanda que una sola máquina puede cubrir. 100% o más = una línea es suficiente. Menos de 100% = se requieren más líneas.',
      calculation: `Capacidad Real Máquina (c/h) ÷ Producción Requerida (c/h) × 100. Ejemplo: 100 c/h ÷ 263.4 c/h = 38.0%.`,
      color: 'text-green-400'
    },
    sc_lineas: {
      title: 'Líneas Req.',
      description: 'Número mínimo de líneas (máquinas en paralelo) necesarias para satisfacer la demanda del cliente en ese escenario.',
      calculation: `TECHO(Producción Requerida c/h ÷ Capacidad Real Máquina c/h). Siempre se redondea hacia arriba. Verde = 1 línea, Amarillo = 2 líneas, Rojo = 3+ líneas.`,
      color: 'text-green-400'
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white p-6 pb-24">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1A1A1A] pb-6">
          <div className="flex items-center gap-4">
            <Link to="/alpha/simulators" className="p-2 rounded-xl bg-glass-light hover:bg-glass-hover text-gray-400 hover:text-white transition-colors border border-glass-border">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-neon-cyan/20 border border-neon-cyan/30 flex items-center justify-center shadow-glow-sm">
              <LayoutDashboard className="w-6 h-6 text-neon-cyan" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white uppercase flex items-center gap-3">
                {simulatorMeta.name}
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] tracking-widest uppercase">Simulador Activo</span>
                <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded font-black tracking-normal uppercase animate-pulse">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Auto-guardado
                </span>
              </h1>

              {/* Nombre del Cliente - Editable en sitio, posicionado abajo del nombre de la empresa IASE */}
              <div className="flex items-center gap-2 mt-1.5 mb-1.5 bg-white/5 hover:bg-white/10 hover:border-cyan-500/30 border border-white/10 px-3 py-1 rounded-xl transition-all w-fit">
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-black tracking-wider uppercase text-cyan-400">Cliente:</span>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    setCustomerName(e.target.value);
                    localStorage.setItem(`sim_${simulatorId}_customer_name`, e.target.value);
                  }}
                  className="bg-transparent text-xs font-black text-white border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 w-64"
                  placeholder="Escribir nombre del cliente..."
                />
              </div>

              <p className="text-sm text-gray-500 font-medium">{simulatorMeta.description} ({physicalMaxMH} m/h max)</p>
              <div className="flex items-center gap-2 mt-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl max-w-[360px]">
                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-black tracking-wider uppercase text-cyan-400">Evaluación:</span>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    localStorage.setItem(`sim_${simulatorId}_client_name`, e.target.value);
                  }}
                  className="bg-transparent text-xs font-bold text-white border-none outline-none focus:outline-none focus:ring-0 p-0 m-0 w-56"
                  placeholder="Máquina en Evaluación..."
                />
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={openConfig} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00F0FF]/10 border border-[#00F0FF]/30 hover:bg-[#00F0FF]/20 text-[#00F0FF] transition-all text-sm font-bold" title="Configuración del Simulador">
              <Settings className="w-4 h-4" /> Configurar
            </button>
            <button onClick={handleSetFileName} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 hover:bg-indigo-500/20 text-indigo-400 transition-all text-sm font-bold" title={customFileName ? `Archivo: ${customFileName}` : "Configurar nombre de exportación"}>
              <Edit3 className="w-4 h-4" /> {customFileName ? 'Nombre OK' : 'Nombre'}
            </button>
            <button onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-glass-light border border-glass-border hover:bg-glass-hover transition-all text-sm font-bold">
              <Download className="w-4 h-4" /> CSV
            </button>
            <button onClick={exportExcel} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 transition-all text-sm font-bold">
              <Table2 className="w-4 h-4" /> Excel
            </button>

            {/* ── Informe PDF: choice dropdown ── */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setShowPdfMenu(v => !v)}
                onBlur={() => setTimeout(() => setShowPdfMenu(false), 160)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={{ background: 'rgba(17,181,201,0.13)', border: '1px solid rgba(17,181,201,0.35)', color: '#11b5c9' }}
              >
                <FileText className="w-4 h-4" /> Informe PDF
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7 }}><path d="M2 4l4 4 4-4"/></svg>
              </button>
              {showPdfMenu && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, minWidth: 230, background: '#0f1c2e', border: '1px solid rgba(17,181,201,0.28)', borderRadius: 12, padding: 6, zIndex: 9990, boxShadow: '0 16px 48px rgba(0,0,0,0.55)' }}>
                  <button
                    onMouseDown={openReportModal}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '12px 14px', background: 'transparent', border: 0, borderRadius: 8, color: '#e2eaf4', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(17,181,201,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ background: 'rgba(17,181,201,0.1)', padding: 8, borderRadius: 8, display: 'flex' }}>
                      <Eye size={18} color="#11b5c9" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#11b5c9', fontSize: 13, marginBottom: 2 }}>Ver Informe</div>
                      <div style={{ fontSize: 11, color: '#6b8599', lineHeight: 1.2 }}>Previsualiza el reporte en pantalla</div>
                    </div>
                  </button>
                  <div style={{ height: 1, background: 'rgba(255,255,255,0.06)', margin: '4px 0' }} />
                  <button
                    onMouseDown={directExportPDF}
                    style={{ display: 'flex', alignItems: 'center', gap: 14, width: '100%', padding: '12px 14px', background: 'transparent', border: 0, borderRadius: 8, color: '#e2eaf4', cursor: 'pointer', textAlign: 'left', transition: 'background 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(17,181,201,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <div style={{ background: 'rgba(17,181,201,0.1)', padding: 8, borderRadius: 8, display: 'flex' }}>
                      <Download size={18} color="#11b5c9" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, color: '#11b5c9', fontSize: 13, marginBottom: 2 }}>Descargar PDF</div>
                      <div style={{ fontSize: 11, color: '#6b8599', lineHeight: 1.2 }}>Exporta directamente a PDF descargable</div>
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
        </div>

        {/* Top KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-stretch">
          {/* ── Velocidad Máxima — editable al hacer click ── */}
          {editingSpeed ? (
            <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-[#00F0FF]/50 shadow-[0_0_16px_#00F0FF22] flex flex-col justify-center">
              <span className="text-xs text-[#00F0FF] uppercase font-bold tracking-wider mb-1">Velocidad Máxima</span>
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
                  className="w-24 text-3xl font-black bg-transparent border-b-2 border-[#00F0FF] text-white outline-none text-center"
                />
                <span className="text-sm text-[#00F0FF] font-bold">m/h</span>
              </div>
              <span className="text-[9px] text-gray-600 mt-1">Velocidad banda · Enter para confirmar · Esc para cancelar</span>
            </div>
          ) : (
            <div
              onClick={() => { setSpeedDraft(String(Math.round(inputs.manualSpeed * 60))); setEditingSpeed(true); }}
              className="group p-4 rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A] flex flex-col justify-center cursor-pointer
                         hover:border-[#00F0FF]/50 hover:shadow-[0_0_16px_#00F0FF22] hover:bg-[#00F0FF]/5 transition-all duration-300"
            >
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider group-hover:text-[#00F0FF] transition-colors duration-300">Velocidad Máxima</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-white group-hover:text-[#00F0FF] transition-colors duration-300">
                  {Math.round(inputs.manualSpeed * 60)}
                </span>
                <span className="text-sm text-gray-500 group-hover:text-[#00F0FF]/70 transition-colors duration-300">m/h</span>
                <span className="ml-auto text-[9px] text-gray-700 group-hover:text-[#00F0FF]/50 transition-colors duration-300">✎ editar</span>
              </div>
            </div>
          )}
          <div className="p-4 rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A] flex items-center justify-between">
            <div className="flex flex-col justify-center">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider">Equivalencia</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-black text-white">{formatNumber(inputs.manualSpeed)}</span>
                <span className="text-sm text-gray-500">m/min</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => { handleInputChange('calcMode', 'manual'); handleInputChange('manualSpeed', Math.min(physicalMaxMH/60, inputs.manualSpeed + 0.05)); }}
                className="p-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded transition-colors"
                title="Aumentar Velocidad"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => { handleInputChange('calcMode', 'manual'); handleInputChange('manualSpeed', Math.max(0.1, inputs.manualSpeed - 0.05)); }}
                className="p-1 bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white rounded transition-colors"
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
                  className="group relative cursor-pointer p-4 rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A]
                             hover:border-[#00F0FF]/40 hover:shadow-[0_0_18px_#00F0FF18] flex flex-col justify-center gap-1
                             transition-all duration-300"
                >
                  <span className="text-xs text-gray-500 uppercase font-bold tracking-wider group-hover:text-[#00F0FF] transition-colors">
                    CAP. MÁQ. / DÍA (Y1)
                  </span>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-3xl font-black text-[#00F0FF] drop-shadow-[0_0_8px_#00F0FF88]">
                      {capDay.toLocaleString('es-MX')}
                    </span>
                    <span className="text-xs text-gray-500 ml-1">cajas</span>
                  </div>
                  <span className="text-[10px] text-gray-500">
                    {formatNumber(avgCapH,1)} c/h × {formatNumber(y1H,1)} h (Y1)
                  </span>
                  <span className="absolute top-2 right-3 text-[9px] text-gray-700 group-hover:text-[#00F0FF]/50 transition-colors">ℹ cómo se calcula</span>
                </div>

                {/* Modal de desglose */}
                {showCapModal && (
                  <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
                    onClick={() => setShowCapModal(false)}
                  >
                    <div
                      className="relative bg-[#0D0D0D] border border-[#00F0FF]/30 rounded-2xl p-6 w-full max-w-md shadow-[0_0_40px_#00F0FF22]"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        onClick={() => setShowCapModal(false)}
                        className="absolute top-3 right-3 text-gray-600 hover:text-white transition-colors"
                      >✕</button>

                      <h3 className="text-sm font-black uppercase tracking-widest text-[#00F0FF] mb-4">
                        ℹ Cómo se calcula
                      </h3>
                      <p className="text-xs text-gray-400 mb-4">
                        La Capacidad Máxima de Máquina por Día es la cantidad de cajas que la máquina
                        puede procesar en un día completo de operación bajo las condiciones del año Y1.
                      </p>

                      <div className="space-y-3">
                        {/* Step 1 */}
                        <div className="bg-[#111] rounded-xl p-3 border border-[#1A1A1A]">
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Paso 1 — Promedio lineal del mix</p>
                          <p className="text-xs text-gray-300">
                            Paso promedio (Pitch) de los {mixR.length} modelo(s) en mix:
                          </p>
                          <div className="mt-1 space-y-0.5">
                            {mixR.map(r => (
                              <p key={r.id} className="text-[10px] text-gray-500">
                                &nbsp;&nbsp;{r.label}. {r.name} → <span className="text-white">{formatNumber(r.pitch,3)} m</span>
                              </p>
                            ))}
                          </div>
                          <p className="text-xs text-[#00F0FF] font-bold mt-2">
                            Promedio = {formatNumber(avgPitch,3)} m
                          </p>
                        </div>

                        {/* Step 1.1 — Cap/h */}
                        <div className="bg-[#111] rounded-xl p-3 border border-[#1A1A1A]">
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Paso 1.1 — Cajas por Hora (Máx)</p>
                          <p className="text-xs text-gray-300">
                            Velocidad Máx ({physicalMaxMH} m/h) ÷ Paso Promedio ({formatNumber(avgPitch,3)} m):
                          </p>
                          <p className="text-xs text-[#00F0FF] font-bold mt-2">
                            {formatNumber(avgCapH,1)} cajas/h
                          </p>
                        </div>

                        {/* Step 2 — Editable */}
                        <div
                          className={`rounded-xl p-3 border transition-all cursor-pointer ${
                            editHrs
                              ? 'bg-[#0D1A2A] border-[#00F0FF]/40'
                              : 'bg-[#111] border-[#1A1A1A] hover:border-[#00F0FF]/30'
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
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-2 flex items-center justify-between">
                            <span>Paso 2 — Horas reales de trabajo Y1</span>
                            {!editHrs && <span className="text-[#00F0FF]/60 text-[9px]">✎ editar</span>}
                          </p>

                          {!editHrs ? (
                            <>
                              <p className="text-xs text-gray-300">{y1Shifts} turnos × {formatNumber(y1Efs,2)} h efectivas/turno</p>
                              <p className="text-xs text-[#00F0FF] font-bold mt-1">= {formatNumber(y1H,2)} horas netas/día</p>
                            </>
                          ) : (
                            <div onClick={e => e.stopPropagation()}>
                              <div className="space-y-2 mb-3">
                                {hrsDraft?.map((row, idx) => (
                                  <div key={row.year} className="flex items-center gap-2">
                                    <span className="text-[10px] text-gray-400 w-6 font-bold">{row.year}</span>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number" min={1} max={3} step={1}
                                        value={row.shifts}
                                        onChange={e => setHrsDraft(d => d.map((r,i) => i===idx ? {...r, shifts: +e.target.value} : r))}
                                        className="w-12 bg-[#0A0A0A] border border-[#333] rounded text-white text-xs text-center px-1 py-0.5 focus:border-[#00F0FF] outline-none"
                                      />
                                      <span className="text-[9px] text-gray-500">turnos</span>
                                    </div>
                                    <span className="text-gray-600">×</span>
                                    <div className="flex items-center gap-1">
                                      <input
                                        type="number" min={0.5} max={12} step={0.01}
                                        value={row.effectiveHoursPerShift}
                                        onChange={e => setHrsDraft(d => d.map((r,i) => i===idx ? {...r, effectiveHoursPerShift: +e.target.value} : r))}
                                        className="w-16 bg-[#0A0A0A] border border-[#333] rounded text-white text-xs text-center px-1 py-0.5 focus:border-[#00F0FF] outline-none"
                                      />
                                      <span className="text-[9px] text-gray-500">h/turno</span>
                                    </div>
                                    <span className="text-[9px] text-[#00F0FF] ml-auto">
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
                                  className="flex-1 py-1 rounded-lg bg-[#00F0FF]/10 border border-[#00F0FF]/40 text-[#00F0FF] text-xs font-bold hover:bg-[#00F0FF]/20 transition-colors"
                                >Aplicar</button>
                                <button
                                  onClick={() => setEditHrs(false)}
                                  className="px-3 py-1 rounded-lg bg-white/5 border border-white/10 text-gray-400 text-xs hover:text-white transition-colors"
                                >Cancelar</button>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Step 3 — result */}
                        <div className="bg-[#00F0FF]/5 rounded-xl p-3 border border-[#00F0FF]/20">
                          <p className="text-[10px] text-gray-400 uppercase font-bold mb-1">Resultado</p>
                          <p className="text-xs text-gray-300">
                            {formatNumber(avgCapH,2)} c/h × {formatNumber(y1H,2)} h
                          </p>
                          <p className="text-2xl font-black text-[#00F0FF] mt-1 drop-shadow-[0_0_8px_#00F0FF88]">
                            = {capDay.toLocaleString('es-MX')} <span className="text-sm font-normal text-gray-400">cajas / día</span>
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
            const machineDailyBest = bestRow ? bestRow.machineBoxesPerHour * bestRow.availableDailyTime : 0;
            
            const displayPct = machineDailyBest > 0 ? Math.round((effectiveReq / machineDailyBest) * 100) : 0;
            const pct = Math.min(100, displayPct);

            // Paleta LED nítida — azul acero con buen contraste
            const getLedColor = (i, isActive, isHover) => {
              if (!isActive && !isHover) return '#060E1A';
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
                  className="group p-4 rounded-2xl cursor-pointer
                             border border-[#0D2A4A] hover:border-[#3A9EBE]/40
                             transition-all duration-300"
                  style={{
                    background: 'linear-gradient(180deg, #050E1C 0%, #061220 100%)',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.5), inset 0 1px 0 rgba(58,158,190,0.12)'
                  }}
                  onClick={() => setViabilityInfoModal({
                    title: 'Carga de Máquina',
                    formula: 'Representa el porcentaje de la capacidad máxima de la máquina al que se debe trabajar para cumplir con el requerimiento diario en el Año 1.',
                    steps: [
                      `Requerimiento Diario: ${effectiveReq.toLocaleString('es-MX')} cajas/día`,
                      `Capacidad Máxima Y1: ${Math.round(machineDailyBest).toLocaleString('es-MX')} cajas/día (${Math.round(bestRow?.machineBoxesPerHour || 0)} c/h × ${bestRow?.availableDailyTime?.toFixed(2)} h)`,
                      `Porcentaje de Carga = (${effectiveReq.toLocaleString('es-MX')} ÷ ${Math.round(machineDailyBest).toLocaleString('es-MX')}) × 100 = ${displayPct}%`
                    ]
                  })}
                  title="Click para ver detalle del cálculo"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-widest"
                      style={{ color: '#5A8FAA', textShadow: 'none' }}>
                      Carga de Máquina
                    </span>
                    <span
                      className="text-sm font-black transition-all"
                      style={{ color: '#5AACCC', textShadow: 'none' }}
                    >
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

                  <div className="text-[9px] text-gray-500 font-bold uppercase tracking-wider mt-2.5 flex items-center justify-between">
                    <span>0% (Sin Carga)</span>
                    <span className="text-gray-400">Cap. Máx Y1: {Math.round(machineDailyBest).toLocaleString('es-MX')} c/d</span>
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
                          <h2 className="text-sm font-black uppercase tracking-widest"
                            style={{ color: '#5AACCC', textShadow: 'none' }}>
                            ⚡ Configurar Velocidad
                          </h2>
                          <p className="text-[10px] text-gray-400 mt-0.5">
                            Ajusta la carga de máquina y velocidad operativa
                          </p>
                        </div>
                        <button onClick={() => setShowCapModal(false)}
                          className="w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Porcentaje grande */}
                      <div className="text-center mb-2">
                        <div className="text-6xl font-black mb-1" style={{ color: '#5AACCC' }}>
                          {pct}%
                        </div>
                        <div className="text-xs text-gray-400">
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
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Carga operativa</p>
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
                      <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Velocidad máx. de máquina (m/h)</p>
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
            <div className="p-6 rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A] space-y-4 shadow-xl">
              <h2 className="text-sm font-black uppercase tracking-widest text-neon-cyan flex items-center gap-2 border-b border-[#1A1A1A] pb-3 mb-4">
                <Settings className="w-4 h-4" /> Configuración Base
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Equipo</label>
                  <input type="text" value={inputs.machineName} onChange={(e) => handleInputChange('machineName', e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Capacidad (cajas/h)</label>
                  <input type="number" value={inputs.nominalBoxes} onChange={(e) => handleInputChange('nominalBoxes', Number(e.target.value))} className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Largo Máquina (m)</label>
                  <input type="number" step="0.1" value={inputs.machineLength} onChange={(e) => handleInputChange('machineLength', Number(e.target.value))} className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Velocidad (m/min)</label>
                  <input type="number" step="0.01" value={inputs.manualSpeed} disabled={inputs.calcMode !== 'manual'} onChange={(e) => handleInputChange('manualSpeed', Number(e.target.value))} className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan outline-none disabled:opacity-50" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Horas x Turno</label>
                  <input type="number" value={inputs.hoursPerShift} onChange={(e) => handleInputChange('hoursPerShift', Number(e.target.value))} className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Turnos x Día</label>
                  <input type="number" value={inputs.shifts} onChange={(e) => handleInputChange('shifts', Number(e.target.value))} className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Días x Mes</label>
                  <input type="number" value={inputs.daysPerMonth} onChange={(e) => handleInputChange('daysPerMonth', Number(e.target.value))} className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan outline-none" />
                </div>
              </div>
              
              <div className="space-y-1.5 pt-2">
                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Modo de Cálculo</label>
                <select value={inputs.calcMode} onChange={(e) => handleInputChange('calcMode', e.target.value)} className="w-full bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-sm text-white focus:border-neon-cyan outline-none">
                  <option value="manual">{`Velocidad Fija (Max ${physicalMaxMH} m/h)`}</option>
                  <option value="derive_nominal">Autocalcular Vel. para cumplir capacidad</option>
                </select>
              </div>
            </div>



            {/* PANDORA Chat Dialog */}
            <div className="p-5 rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A] shadow-xl flex flex-col h-[600px] sticky top-6">
              <h2 className="text-sm font-black uppercase tracking-widest text-neon-purple flex items-center gap-2 border-b border-[#1A1A1A] pb-3 mb-4">
                <Bot className="w-4 h-4" /> Asistente PANDORA
              </h2>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 pr-2 pb-4">
                {chatMessages.map((msg, idx) => (
                  <div key={idx} className={cn("flex flex-col gap-1 text-sm", msg.role === 'user' ? "items-end" : "items-start")}>
                    <div className={cn(
                      "px-4 py-2 rounded-2xl max-w-[95%] whitespace-pre-wrap leading-relaxed",
                      msg.role === 'user' ? "bg-white/10 text-white rounded-br-sm" : "bg-neon-purple/10 border border-neon-purple/20 text-gray-200 rounded-bl-sm"
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

              <form onSubmit={handleChatSend} className="pt-3 border-t border-[#1A1A1A]">
                <div className="relative flex items-center bg-[#111] border border-[#222] rounded-xl focus-within:border-neon-purple/50 transition-colors">
                  <input
                    type="text"
                    className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder-gray-600 outline-none"
                    placeholder="Pide sugerencias o análisis a PANDORA..."
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                  />
                  <button 
                    type="submit" 
                    disabled={isChatTyping || !chatInput.trim()}
                    className="p-2 mr-1 text-gray-500 hover:text-neon-purple disabled:opacity-30 transition-colors"
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
              className="hidden xl:flex absolute -left-6 top-10 h-16 w-6 bg-[#0A0A0A] border border-[#1A1A1A] border-r-0 rounded-l-xl items-center justify-center text-gray-500 hover:text-white transition-colors z-10 shadow-lg cursor-pointer hover:shadow-[0_0_15px_rgba(56,189,248,0.2)]"
              title={isSidebarOpen ? "Ocultar Panel de Configuración" : "Mostrar Panel de Configuración"}
            >
              {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {/* Dynamic KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div onClick={() => setInfoModal('speed')} className="p-5 rounded-2xl bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-[#1A1A1A] shadow-lg relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(56,189,248,0.1)] hover:border-neon-cyan/30 group">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity"><Activity className="w-8 h-8 text-neon-cyan" /></div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest group-hover:text-gray-300 transition-colors">Velocidad Usada</span>
                <div className="text-3xl font-black text-white mt-1">{formatNumber(currentSpeed)} <span className="text-sm text-gray-500 font-medium">m/min</span></div>
                <div className="text-xs text-neon-cyan mt-1">{formatNumber(currentSpeed * 60, 1)} m/h</div>
              </div>
              <div onClick={() => setInfoModal('capacity')} className="p-5 rounded-2xl bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-[#1A1A1A] shadow-lg relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(96,165,250,0.1)] hover:border-blue-400/30 group">
                <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity"><Box className="w-8 h-8 text-blue-400" /></div>
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest group-hover:text-gray-300 transition-colors">Capacidad Real</span>
                <div className="text-3xl font-black text-white mt-1">{selectedRow ? formatNumber(selectedRow.realBoxesHr, 1) : '-'} <span className="text-sm text-gray-500 font-medium">c/h</span></div>
                <div className="text-xs text-blue-400 mt-1">Obj: {inputs.nominalBoxes} c/h</div>
              </div>
              <div onClick={() => setInfoModal('residence')} className="p-5 rounded-2xl bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-[#1A1A1A] shadow-lg relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:border-white/20 group">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest group-hover:text-gray-300 transition-colors">Residencia</span>
                <div className="text-3xl font-black text-white mt-1">{selectedRow ? formatNumber(selectedRow.residenceMin) : '-'} <span className="text-sm text-gray-500 font-medium">min</span></div>
              </div>
              <div onClick={() => setInfoModal('inside')} className="p-5 rounded-2xl bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-[#1A1A1A] shadow-lg relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:border-white/20 group">
                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-widest group-hover:text-gray-300 transition-colors">Cajas Dentro</span>
                <div className="text-3xl font-black text-white mt-1">{selectedRow ? formatNumber(selectedRow.inside) : '-'} <span className="text-sm text-gray-500 font-medium">pzs</span></div>
              </div>
            </div>

            {/* Twin Digital 3D */}
            <div 
              ref={twinBlockRef}
              className={`transition-all duration-300 relative ${
                isTwinBlockFullscreen 
                  ? `w-screen h-screen overflow-y-auto ${twinTheme === 'toxic' ? 'bg-[#0d0d0e]' : 'bg-[#05070f]'} p-8 rounded-none border-none z-[9999] flex flex-col justify-between` 
                  : twinTheme === 'toxic'
                    ? 'bg-[#121212] border border-[#2c302e] rounded-3xl p-6 shadow-xl overflow-hidden'
                    : 'rounded-2xl bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-[#1A1A1A] p-5 shadow-xl overflow-hidden'
              }`}
            >
              <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b pb-4 ${twinTheme === 'toxic' ? 'border-[#2c302e]' : 'border-white/5'}`}>
                <div>
                  <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${twinTheme === 'toxic' ? 'text-[#84cc16]' : 'text-[#00F0FF]'}`}>
                    <Activity className={`w-4 h-4 animate-pulse ${twinTheme === 'toxic' ? 'text-[#84cc16]' : 'text-[#00F0FF]'}`} />
                    Twin Digital 3D de la Línea
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Gemelo digital interactivo y trayectorias de flujo en tiempo real.
                  </p>
                </div>
                
                {/* Controles de la Librería y Twin */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <button 
                    onClick={() => setIsDesignsLibraryOpen(true)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] ${
                      twinTheme === 'toxic'
                        ? 'bg-[#222222] border-[#2c302e] hover:border-[#84cc16] text-[#84cc16] hover:text-white'
                        : 'bg-neon-cyan/10 hover:bg-neon-cyan/20 text-[#00F0FF] border border-neon-cyan/30'
                    }`}
                    title="Abrir librería de twins guardados"
                  >
                    <FolderOpen className="w-3.5 h-3.5" /> Librería
                  </button>

                  <label 
                    htmlFor="twin-upload-file"
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer transition-all font-black uppercase tracking-widest text-[9px] ${
                      twinTheme === 'toxic'
                        ? 'bg-[#222222] border-[#2c302e] hover:border-[#84cc16] text-[#84cc16] hover:text-white'
                        : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30'
                    }`}
                    title="Subir archivo 3D de la planta (.glb, .gltf o .fbx)"
                  >
                    <Upload className="w-3.5 h-3.5" /> Subir 3D
                  </label>
                  <input 
                    type="file" 
                    id="twin-upload-file" 
                    className="hidden" 
                    accept=".glb,.gltf,.fbx,.dae" 
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
                    title="Acomodar fichas de movimiento y máquinas en 3D"
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
                    title="Sincronizar con el Flow Designer global"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>

                  {/* Anclar modelo + etiquetas a este simulador */}
                  {twinLayout && (
                    <button 
                      onClick={handleAnchorToSimulator}
                      disabled={isAnchoring || isAnchored}
                      className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl transition-all font-black uppercase tracking-widest text-[9px] ${
                        isAnchoring
                          ? 'bg-green-500/10 border-green-500/30 text-green-400 opacity-70 cursor-wait'
                          : isAnchored
                            ? twinTheme === 'toxic'
                              ? 'bg-lime-500/25 border-lime-400 text-lime-300 font-extrabold shadow-[0_0_10px_rgba(132,204,22,0.25)]'
                              : 'bg-green-500/20 border-green-500 text-green-400 font-extrabold shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                            : twinTheme === 'toxic'
                              ? 'bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 border border-lime-500/30 animate-pulse font-extrabold'
                              : 'bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 animate-pulse font-extrabold'
                      }`}
                      title={isAnchored ? "El modelo ya está correctamente anclado y guardado" : "Guardar modelo, etiquetas y conectores en la nube para este simulador"}
                    >
                      {isAnchoring ? (
                        <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Guardando...</>
                      ) : isAnchored ? (
                        <><Check className="w-3.5 h-3.5 text-green-400" /> Anclado</>
                      ) : (
                        <><Anchor className="w-3.5 h-3.5 text-green-400" /> Anclar</>
                      )}
                    </button>
                  )}
                </div>
              </div>

              {/* Panel de Ajustes del Twin / Fichas de Movimiento */}
              {isTwinEditMode && (
                <div className="mb-4 p-4 rounded-xl bg-black/40 border border-white/5 backdrop-blur-md space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                    {/* Altura de Fichas Slider */}
                    <div className="flex-1 space-y-1">
                      <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                        <span>Altura de Fichas de Movimiento:</span>
                        <span className="text-[#00F0FF]">{formatNumber(twinLabelHeightOffset, 1)} m</span>
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
                            ? 'bg-neon-cyan/20 border-neon-cyan text-neon-cyan' 
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
                          <span className="text-[#00F0FF] tabular-nums">{formatNumber(twinFloorElevation, 1)} m</span>
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
                          onClick={openAddTwinNode}
                          className="flex items-center gap-1 px-2 py-1 bg-[#00F0FF]/10 hover:bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/30 rounded-lg text-[9px] font-black uppercase transition-all"
                          title="Agregar nueva ficha / equipo"
                        >
                          <Plus className="w-3 h-3" /> Ficha
                        </button>
                        <button
                          onClick={() => { setShowTwinEdgeEditor(e => !e); setShowTwinNodeEditor(false); }}
                          className="flex items-center gap-1 px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30 rounded-lg text-[9px] font-black uppercase transition-all"
                          title="Agregar conector / flujo entre fichas"
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
                          {/* Dot de color */}
                          <span
                            className="w-2 h-2 rounded-full mx-1.5 flex-shrink-0"
                            style={{ backgroundColor: node.data?.color || '#00F0FF' }}
                          />
                          {/* Nombre → selecciona para mover */}
                          <button
                            onClick={() => setSelectedTwinNodeId(selectedTwinNodeId === node.id ? null : node.id)}
                            className={`py-1.5 pr-1 text-[10px] font-medium transition-colors ${
                              selectedTwinNodeId === node.id ? 'text-white font-bold' : 'text-gray-400 hover:text-white'
                            }`}
                            title="Seleccionar para mover en 3D"
                          >
                            {node.data?.label || node.data?.type || 'Equipo'}
                          </button>
                          {/* Editar */}
                          <button
                            onClick={() => openEditTwinNode(node)}
                            className="px-1.5 py-1.5 text-gray-600 hover:text-[#00F0FF] transition-all"
                            title="Editar propiedades"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
                          {/* Quitar (sin confirmación) */}
                          <button
                            onClick={() => handleDeleteTwinNode(node.id)}
                            className="px-1.5 py-1.5 border-l border-[#222] text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                            title="Quitar del Twin"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      ))}
                      {twinNodes.length === 0 && (
                        <p className="text-[10px] text-gray-600 italic">Sin equipos. Usa "+ Ficha" para agregar o sincroniza con Flow Designer.</p>
                      )}
                    </div>

                    {/* ── Formulario Agregar/Editar Ficha ─────────────────── */}
                    {showTwinNodeEditor && (
                      <div className="mt-2 p-3 rounded-xl bg-black/60 border border-[#00F0FF]/20 space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-[#00F0FF]">
                          {editingTwinNodeId ? '✏️ Editar Ficha' : '➕ Nueva Ficha'}
                        </div>

                        {/* Nombre */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-gray-500 uppercase tracking-wider">Nombre / Etiqueta</label>
                          <input
                            value={twinNodeForm.label}
                            onChange={e => setTwinNodeForm(f => ({ ...f, label: e.target.value }))}
                            placeholder="Ej: Bomba Hidráulica"
                            className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF]/50"
                          />
                        </div>

                        {/* Categoría / Acción */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-gray-500 uppercase tracking-wider">Tipo / Acción</label>
                          <div className="flex flex-wrap gap-1.5">
                            {TWIN_CATEGORIES.map(cat => (
                              <button
                                key={cat.key}
                                onClick={() => setTwinNodeForm(f => ({ ...f, category: cat.key, type: cat.label, color: twinNodeForm.color === '#00F0FF' ? cat.color : twinNodeForm.color }))}
                                className={`px-2 py-1 rounded-lg text-[9px] font-bold border transition-all ${
                                  twinNodeForm.category === cat.key
                                    ? 'text-white border-white/40 bg-white/10'
                                    : 'text-gray-500 border-[#2a2a2a] hover:border-gray-500 hover:text-gray-300'
                                }`}
                              >
                                {cat.emoji} {cat.label}
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Color */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-gray-500 uppercase tracking-wider">Color</label>
                          <div className="flex items-center gap-2 flex-wrap">
                            {COLOR_SWATCHES.map(c => (
                              <button
                                key={c}
                                onClick={() => setTwinNodeForm(f => ({ ...f, color: c }))}
                                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                                  twinNodeForm.color === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                            <input
                              type="color"
                              value={twinNodeForm.color}
                              onChange={e => setTwinNodeForm(f => ({ ...f, color: e.target.value }))}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                              title="Color personalizado"
                            />
                          </div>
                        </div>

                        {/* Capacidad y Potencia */}
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-500 uppercase tracking-wider">Capacidad</label>
                            <input
                              type="number"
                              value={twinNodeForm.capacity}
                              onChange={e => setTwinNodeForm(f => ({ ...f, capacity: e.target.value }))}
                              placeholder="0"
                              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF]/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-500 uppercase tracking-wider">Potencia / kW</label>
                            <input
                              type="number"
                              value={twinNodeForm.power}
                              onChange={e => setTwinNodeForm(f => ({ ...f, power: e.target.value }))}
                              placeholder="0"
                              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#00F0FF]/50"
                            />
                          </div>
                        </div>

                        {/* Acciones */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handleSaveTwinNode}
                            className="flex-1 py-1.5 bg-[#00F0FF] hover:bg-[#00d8e8] text-black font-black text-[9px] uppercase tracking-widest rounded-lg transition-all"
                          >
                            {editingTwinNodeId ? 'Guardar Cambios' : 'Agregar al Twin'}
                          </button>
                          <button
                            onClick={() => { setShowTwinNodeEditor(false); resetTwinNodeForm(); }}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 text-[9px] uppercase tracking-widest rounded-lg transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* ── Formulario Agregar Conector ──────────────────────── */}
                    {showTwinEdgeEditor && (
                      <div className="mt-2 p-3 rounded-xl bg-black/60 border border-purple-500/20 space-y-3">
                        <div className="text-[10px] font-black uppercase tracking-widest text-purple-400">↔ Nuevo Conector / Flujo</div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-500 uppercase tracking-wider">Desde</label>
                            <select
                              value={twinEdgeForm.source}
                              onChange={e => setTwinEdgeForm(f => ({ ...f, source: e.target.value }))}
                              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                            >
                              <option value="">Seleccionar...</option>
                              {twinNodes.map(n => <option key={n.id} value={n.id}>{n.data?.label || n.id}</option>)}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] text-gray-500 uppercase tracking-wider">Hasta</label>
                            <select
                              value={twinEdgeForm.target}
                              onChange={e => setTwinEdgeForm(f => ({ ...f, target: e.target.value }))}
                              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                            >
                              <option value="">Seleccionar...</option>
                              {twinNodes.filter(n => n.id !== twinEdgeForm.source).map(n => <option key={n.id} value={n.id}>{n.data?.label || n.id}</option>)}
                            </select>
                          </div>
                        </div>

                        {/* Color del conector */}
                        <div className="space-y-1">
                          <label className="text-[9px] text-gray-500 uppercase tracking-wider">Color del flujo</label>
                          <div className="flex items-center gap-2 flex-wrap">
                            {COLOR_SWATCHES.map(c => (
                              <button
                                key={c}
                                onClick={() => setTwinEdgeForm(f => ({ ...f, color: c }))}
                                className={`w-5 h-5 rounded-full border-2 transition-transform ${
                                  twinEdgeForm.color === c ? 'border-white scale-125' : 'border-transparent hover:scale-110'
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                            <input
                              type="color"
                              value={twinEdgeForm.color}
                              onChange={e => setTwinEdgeForm(f => ({ ...f, color: e.target.value }))}
                              className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent"
                            />
                          </div>
                        </div>

                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={handleAddTwinEdge}
                            disabled={!twinEdgeForm.source || !twinEdgeForm.target}
                            className="flex-1 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-black text-[9px] uppercase tracking-widest rounded-lg transition-all"
                          >
                            Agregar Conector
                          </button>
                          <button
                            onClick={() => setShowTwinEdgeEditor(false)}
                            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-400 border border-white/10 text-[9px] uppercase tracking-widest rounded-lg transition-all"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    <p className="text-[9px] text-gray-600 italic mt-1">
                      💡 Clic en nombre → mover en 3D · ✏️ editar · ✕ quitar
                    </p>
                  </div>
                </div>
              )}

              {/* Visor 3D */}
              <div className={`relative rounded-xl overflow-hidden border ${twinTheme === 'toxic' ? 'border-[#2c302e] bg-[#0c0d0e]' : twinTheme === 'blueprint' ? 'border-slate-800/80 bg-[#edf4f9]' : 'border-white/5 bg-[#05070f]'}`}>
                <SharedTwinViewer3D 
                  height={isTwinBlockFullscreen ? "calc(100vh - 280px)" : "390px"} 
                  customNodes={twinNodes}
                  customEdges={twinEdges}
                  customLayout={pendingUpload ? null : (twinLayout ? { ...twinLayout, elevation: twinFloorElevation } : null)}
                  editMode={isTwinEditMode}
                  selectedNodeId={selectedTwinNodeId}
                  onSelectNode={setSelectedTwinNodeId}
                  onUpdateNode={handleUpdateTwinNode}
                  labelHeightOffset={twinLabelHeightOffset}
                  labelsCollapsed={twinLabelsCollapsed}
                  showControls={!isTwinEditMode}
                  onFileDrop={processAndSetupTwinModel}
                  theme={twinTheme}
                  onThemeChange={setTwinTheme}
                />
              </div>

              {/* Portal de la Librería de Diseños */}
              <FlowDesignsLibrary 
                isOpen={isDesignsLibraryOpen}
                onClose={() => setIsDesignsLibraryOpen(false)}
                onLoad={handleLoadDesignFromLibrary}
                onNewDesign={() => {
                  alert("Para crear un nuevo diseño desde cero, por favor ingresa a la pestaña del Flow Designer en el menú principal.");
                  setIsDesignsLibraryOpen(false);
                }}
                currentDesignId={currentDesignId}
                activeLayout={twinLayout}
                onLayoutChange={setTwinLayout}
              />

              {/* ── Modal: Nombrar y Guardar Modelo 3D Subido ─────────────── */}
              {pendingUpload && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backdropFilter: 'blur(12px)', backgroundColor: 'rgba(0,0,0,0.65)' }}>
                  <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0a0c14]/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
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
                          <p className="text-xs font-bold text-white">{pendingUpload.file?.name}</p>
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
                          placeholder="Ej: Planta Lavado BWD-200"
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
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Table */}
            <div className="rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A] overflow-hidden shadow-xl flex flex-col">
              <div className="px-5 py-4 border-b border-[#1A1A1A] flex justify-between items-center bg-[#050505]">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Resultados de Simulación</h3>
                <div className="flex gap-3 text-xs">
                  <button onClick={clearBoxes} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition-all" title="Borrar Todos">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button onClick={loadOfficialReqs} className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Oficiales
                  </button>
                  <button onClick={openNewBoxModal} className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white font-bold uppercase tracking-wider rounded-xl transition-all shadow-glow-sm">
                    <Plus className="w-4 h-4" /> Agregar Caja
                  </button>
                </div>
              </div>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs" style={{minWidth:'900px'}}>
                  <thead className="bg-[#111] sticky top-0 z-10 border-b border-[#222]">
                    <tr>
                      <th className="px-3 py-3 font-semibold text-gray-400">Mod</th>
                      <th className="px-3 py-3 font-semibold text-gray-400">Máquina</th>
                      <th className="px-3 py-3 font-semibold text-gray-400">Nombre</th>
                      <th className="px-3 py-3 font-semibold text-gray-400 text-center">L&times;A&times;H (cm)</th>
                      <th onClick={() => setInfoModal('col_vel')} className="px-3 py-3 font-semibold text-gray-400 cursor-pointer hover:text-neon-cyan text-center">Vel (m/h)</th>
                      <th className="px-3 py-3 font-semibold text-gray-500 text-center" title="Vel. banda ÷ Pitch — capacidad teórica pura">Cap. Real (c/h)</th>
                      <th className="px-3 py-3 font-semibold text-yellow-400 text-center">
                        <span className="flex items-center gap-1 justify-center">
                          Req. Diario
                          <button
                            onClick={(e) => { e.stopPropagation(); setReqLocked(l => !l); }}
                            title={reqLocked ? 'Bloqueado — click para editar' : 'Click para bloquear'}
                            className={`p-0.5 rounded transition-all ${
                              reqLocked ? 'text-yellow-400 drop-shadow-[0_0_6px_#facc15]' : 'text-gray-600 hover:text-yellow-400'
                            }`}
                          >
                            {reqLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>
                          {saveStatus === 'saving' && <span className="text-[9px] text-yellow-400 animate-pulse">↻</span>}
                          {saveStatus === 'saved'  && <span className="text-[9px] text-green-400">✓</span>}
                        </span>
                      </th>
                      <th className="px-3 py-3 font-semibold text-purple-400 text-center">Horas Req.</th>
                      <th className="px-3 py-3 font-semibold text-gray-400 text-center">Suciedad</th>
                      <th className="px-3 py-3 font-semibold text-gray-400 text-center">Estado</th>
                      <th className="px-3 py-3 font-semibold text-gray-400 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1A]">
                    {/* ── Group header: LAVADO Y SECADO ── */}
                    <tr><td colSpan={11} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest" style={{color:'#00F0FF', background:'rgba(0,240,255,0.04)', borderBottom:'1px solid rgba(0,240,255,0.12)'}}>⬡ Lavado y Secado — {lavadoRows.filter(r=>r.included).length} productos — Total req: {lavadoRows.filter(r=>r.included).reduce((s,r)=>s+r.requiredDaily,0).toLocaleString('es-MX')} pzas/día</td></tr>
                    {lavadoRows.map((r) => (
                      <tr key={r.id}
                        className={cn("transition-all hover:bg-[#111] cursor-pointer", selectedId===r.id ? "bg-blue-500/5" : "", !r.included && "opacity-30 grayscale")}
                        onClick={() => setSelectedId(r.id)}
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleInclusion(r.id); }}
                              className={cn("p-1 rounded-md transition-all", r.included ? "text-cyan-400 hover:bg-cyan-400/10" : "text-gray-600 hover:bg-white/5")}
                              title={r.included ? "Desactivar de evaluación" : "Activar para evaluación"}
                            >
                              <Power className="w-3 h-3" />
                            </button>
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{backgroundColor: r.color||'#3b82f6',color:'#fff'}}>{r.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:'rgba(0,240,255,0.08)',color:'#00F0FF',border:'1px solid rgba(0,240,255,0.2)'}}>Lav+Sec</span></td>
                        <td className="px-3 py-3 font-medium text-white text-sm">{r.name}</td>
                        <td className="px-3 py-3 text-gray-400 text-xs text-center">{r.l}×{r.w}×{r.h}</td>
                        <td className="px-3 py-3 text-gray-300 text-center text-xs">{formatNumber(r.linearMh,1)}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-bold text-blue-400">{formatNumber(r.realBoxesHr,1)}</span>
                        </td>
                        <td className="px-3 py-3">
                          <input type="number" value={dailyReqs[r.id]??''} placeholder="Req" readOnly={reqLocked}
                            onChange={(e) => updateBoxRequirement(r.id, Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            className={`w-20 bg-black border rounded-lg px-2 py-1 text-xs outline-none transition-colors text-center ${
                              reqLocked ? 'border-yellow-500/40 text-yellow-400/60 cursor-not-allowed' : 'border-[#333] focus:border-yellow-400 text-yellow-400'
                            }`} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          {(dailyReqs[r.id]??0)>0
                            ? <span className={`text-xs font-bold ${r.requiredHours > r.totalHoursDay ? 'text-red-400' : 'text-purple-400'}`}>{formatNumber(r.requiredHours,2)}h</span>
                            : <span className="text-gray-600 text-xs">-</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-400 text-[10px] font-bold border border-white/10 uppercase tracking-tighter">
                            {r.suciedad || 'Polvo'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {(dailyReqs[r.id]??0)>0
                            ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.requiredHours<=r.totalHoursDay?'bg-green-500/10 text-green-400 border border-green-500/30':'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                                {r.requiredHours<=r.totalHoursDay?'✓ OK':'⚠ Excede'}
                              </span>
                            : <span className="text-gray-600 text-xs">-</span>}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button onClick={(e)=>{e.stopPropagation();openEditBoxModal(r);}} className="p-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all"><Edit3 className="w-3 h-3"/></button>
                            <button onClick={(e)=>{e.stopPropagation();removeBox(r.id);}} className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"><Trash2 className="w-3 h-3"/></button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* ── Group header: SOLO SECADO ── */}
                    <tr><td colSpan={11} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest" style={{color:'#8B5CF6', background:'rgba(139,92,246,0.04)', borderBottom:'1px solid rgba(139,92,246,0.12)'}}>⬡ Solo Secado — {secadoRows.filter(r=>r.included).length} productos — Total req: {secadoRows.filter(r=>r.included).reduce((s,r)=>s+r.requiredDaily,0).toLocaleString('es-MX')} pzas/día</td></tr>
                    {secadoRows.map((r) => (
                      <tr key={r.id}
                        className={cn("transition-all hover:bg-[#111] cursor-pointer", selectedId===r.id ? "bg-purple-500/5" : "", !r.included && "opacity-30 grayscale")}
                        onClick={() => setSelectedId(r.id)}
                      >
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleInclusion(r.id); }}
                              className={cn("p-1 rounded-md transition-all", r.included ? "text-purple-400 hover:bg-purple-400/10" : "text-gray-600 hover:bg-white/5")}
                              title={r.included ? "Desactivar de evaluación" : "Activar para evaluación"}
                            >
                              <Power className="w-3 h-3" />
                            </button>
                            <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{backgroundColor: r.color||'#8b5cf6',color:'#fff'}}>{r.label}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:'rgba(139,92,246,0.08)',color:'#8B5CF6',border:'1px solid rgba(139,92,246,0.2)'}}>Secado</span></td>
                        <td className="px-3 py-3 font-medium text-white text-sm">{r.name}</td>
                        <td className="px-3 py-3 text-gray-400 text-xs text-center">{r.l}×{r.w}×{r.h}</td>
                        <td className="px-3 py-3 text-gray-300 text-center text-xs">{formatNumber(r.linearMh,1)}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-bold text-purple-400">{formatNumber(r.realBoxesHr,1)}</span>
                        </td>
                        <td className="px-3 py-3">
                          <input type="number" value={dailyReqs[r.id]??''} placeholder="Req" readOnly={reqLocked}
                            onChange={(e) => updateBoxRequirement(r.id, Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            className={`w-20 bg-black border rounded-lg px-2 py-1 text-xs outline-none transition-colors text-center ${
                              reqLocked ? 'border-yellow-500/40 text-yellow-400/60 cursor-not-allowed' : 'border-[#333] focus:border-yellow-400 text-yellow-400'
                            }`} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          {(dailyReqs[r.id]??0)>0
                            ? <span className="text-xs font-bold text-purple-400">{formatNumber(r.requiredHours,2)}h</span>
                            : <span className="text-gray-600 text-xs">-</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="px-2 py-0.5 rounded-md bg-white/5 text-gray-400 text-[10px] font-bold border border-white/10 uppercase tracking-tighter">
                            {r.suciedad || 'Polvo'}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center">
                          {(dailyReqs[r.id]??0)>0
                            ? <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${r.requiredHours<=r.totalHoursDay?'bg-green-500/10 text-green-400 border border-green-500/30':'bg-red-500/10 text-red-400 border border-red-500/30'}`}>
                                {r.requiredHours<=r.totalHoursDay?'✓ OK':'⚠ Excede'}
                              </span>
                            : <span className="text-gray-600 text-xs">-</span>}
                        </td>
                        <td className="px-3 py-3 text-right">
                          <div className="flex gap-1 justify-end">
                            <button onClick={(e)=>{e.stopPropagation();openEditBoxModal(r);}} className="p-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all"><Edit3 className="w-3 h-3"/></button>
                            <button onClick={(e)=>{e.stopPropagation();removeBox(r.id);}} className="p-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-all"><Trash2 className="w-3 h-3"/></button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {/* ── Group header: EXCLUIDOS (Vaciado por petición de usuario) ── */}
                    {excluidos.length > 0 && (
                      <>
                        <tr><td colSpan={11} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest" style={{color:'#666', background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>⊘ Otros / Especiales</td></tr>
                        {excluidos.map((r) => (
                          <tr key={r.id} className="opacity-40 hover:opacity-70 transition-opacity">
                            <td className="px-3 py-2"><span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black bg-[#222] text-gray-500">{r.label}</span></td>
                            <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-gray-500/10 text-gray-500 border border-gray-500/20">Excluido</span></td>
                            <td className="px-3 py-2 text-gray-500 text-sm" colSpan={9}>{r.name} &mdash; <span className="text-[11px]">{r.l > 0 ? `${r.l}×${r.w}×${r.h} cm` : 'Sin dimensiones'}</span></td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                  {/* ─── FILA TOTAL REQ. DIARIO ─── */}
                  {(() => {
                    const selectedMixRows = computedRows.filter(r => selectedMixIds.includes(r.id));
                    const totalReq = selectedMixRows.reduce((s, r) => s + (r.requiredDaily || 0), 0);
                    if (totalReq === 0) return null;
                    const bestY1 = scenarioResults.lavadoSecado[0];
                    const machCapDay = bestY1 ? bestY1.machineBoxesPerHour * bestY1.availableDailyTime : 0;
                    const lines = machCapDay > 0 ? Math.ceil(totalReq / machCapDay) : '?';
                    const covers = machCapDay >= totalReq;
                    return (
                      <tfoot>
                        <tr className="border-t-2 border-[#00F0FF]/20 bg-[#0A0A0A]">
                          <td colSpan={3} className="px-4 py-3 text-xs font-black uppercase tracking-widest" style={{color:'#00F0FF'}}>Total req. diario (Mix seleccionado)</td>
                          <td colSpan={3} />
                          <td className="px-4 py-3">
                            <span className="text-lg font-black" style={{color:'#F59E0B'}}>{totalReq.toLocaleString('es-MX')}</span>
                            <span className="text-[10px] text-gray-500 ml-1">cajas/día</span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-black ${
                              covers ? 'bg-[#00F0FF]/10 text-[#00F0FF]' : 'bg-[#EC4899]/10 text-[#EC4899]'
                            }`}>
                              {covers ? '✓ 1 máq. suficiente' : `⚠ ${lines} máq.`}
                            </span>
                          </td>
                          <td />
                        </tr>
                      </tfoot>
                    );
                  })()}
                </table>
              </div>
            </div>

            {/* ════ PANEL VIABILIDAD TOTAL REQ. DIARIO ════ */}
            {(() => {
              // ── Base: modelos en mix o todos si no hay selección ──
              const mixRows  = computedRows.filter(r => selectedMixIds.includes(r.id));
              const usingMix = true; // Forzamos a que siempre se considere 'Mix' (aunque sea de 1 o 0 ítems)

              // 1) Total req/día = suma de requiredDaily de los modelos del mix
              const totalReq = mixRows.reduce((s, r) => s + (r.requiredDaily || 0), 0);
              if (totalReq === 0) return null;

              const bestY1 = scenarioResults.lavadoSecado[0];
              const y1Hours = bestY1?.availableDailyTime ?? (inputs.hoursPerShift * inputs.shifts);

              // 2) Cap. promedio/h del mix (promedio de realBoxesHr de modelos seleccionados)
              const avgCapH = mixRows.length > 0
                ? mixRows.reduce((s, r) => s + r.realBoxesHr, 0) / mixRows.length
                : 0;

              // 3) Cap. máq/día = promedio cap/h × horas Y1 disponibles
              const machCapDay  = +(avgCapH * y1Hours).toFixed(0);
              const machCapHour = +avgCapH.toFixed(1);

              // 4) Req/h necesario = total req ÷ horas Y1 disponibles
              const reqPerHour = y1Hours > 0 ? +(totalReq / y1Hours).toFixed(1) : 0;

              // 5) Máquinas = TECHO(totalReq / capDía)
              const covers   = machCapDay >= totalReq;
              const lines    = machCapDay > 0 ? Math.ceil(totalReq / machCapDay) : 0;
              const coverPct = machCapDay > 0 ? Math.min(100, (machCapDay / totalReq) * 100) : 0;

              return (
                <div className="rounded-2xl bg-[#0C0C0C] border border-[#1E1E1E] overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#1E1E1E] bg-[#080808] flex items-center justify-between">
                    <h3 className="text-sm font-black uppercase tracking-widest text-yellow-400">
                      ◈ Viabilidad — {usingMix ? `Mix seleccionado (${selectedMixIds.length} mod.)` : 'Todos los modelos'} vs. Lavado+Secado
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-black ${
                      covers ? 'bg-[#00F0FF]/10 text-white border border-[#00F0FF]/30' : 'bg-[#EC4899]/10 text-white border border-[#EC4899]/30'
                    }`}>
                      {covers ? '✓ UNA MÁQUINA SUFICIENTE' : `⚠️ SE REQUIEREN ${lines} MÁQUINAS`}
                    </span>
                  </div>
                  <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <div onClick={() => setViabilityInfoModal({
                      title: 'Total Req. / Día',
                      formula: usingMix
                        ? 'Suma de los Req. Diario de los modelos activos en el mix (círculos encendidos en la tabla).'
                        : 'Suma de todos los Req. Diario ingresados en la tabla (sin filtro de mix).',
                      steps: [
                        usingMix
                          ? `Modelos en mix: ${mixRows.filter(r=>r.requiredDaily>0).map(r=>`${r.label} ${r.name} = ${(r.requiredDaily||0).toLocaleString('es-MX')}`).join(' | ')}`
                          : `Todos los modelos con req.: ${computedRows.filter(r=>r.requiredDaily>0).map(r=>`${r.label} ${r.name} = ${(r.requiredDaily||0).toLocaleString('es-MX')}`).join(' | ')}`,
                        `Total = ${mixRows.filter(r=>r.requiredDaily>0).map(r=>r.requiredDaily||0).join(' + ')} = ${totalReq.toLocaleString('es-MX')} cajas/día`
                      ]
                    })} className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] text-center cursor-pointer hover:border-yellow-400/40 hover:bg-yellow-400/5 transition-all duration-200">
                      <div className="text-[9px] text-yellow-400 uppercase font-bold tracking-wider mb-1">Total Req. / Día</div>
                      <div className="text-2xl font-black text-white">{totalLavadoReq.toLocaleString('es-MX')}</div>
                      <div className="text-[9px] text-gray-500">{`cajas/día (${selectedMixIds.length} modelo${selectedMixIds.length>1?'s':''} seleccionados)`}</div>
                    </div>
                    {/* KPI 2 — Cap. Máq./Día */}
                    <div onClick={() => setViabilityInfoModal({
                      title: 'Cap. Máq. / Día (Y1)',
                      formula: 'Promedio de Cap. Real/h de los modelos en el mix × Horas disponibles Y1. El promedio refleja el ritmo mixto real de producción.',
                      steps: [
                        `Modelos en mix: ${selectedMixRows.map(r=>`${r.label} ${r.name} (${r.realBoxesHr.toFixed(1)} c/h)`).join(' | ')}`,
                        `Promedio cap/h = (${selectedMixRows.map(r=>r.realBoxesHr.toFixed(1)).join(' + ')}) ÷ ${selectedMixRows.length} = ${machCapHour} c/h`,
                        `Tiempo disponible Y1: ${y1Hours.toFixed(2)} h/día`,
                        `Cap./día = ${machCapHour} × ${y1Hours.toFixed(2)} = ${machCapDay.toLocaleString('es-MX')} cajas/día`
                      ]
                    })} className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] text-center cursor-pointer hover:border-yellow-400/40 hover:bg-yellow-400/5 transition-all duration-200">
                      <div className="text-[9px] text-yellow-400 uppercase font-bold tracking-wider mb-1">Cap. Máq. / Día (Y1)</div>
                      <div className="text-2xl font-black text-white">{machCapDay.toLocaleString('es-MX')}</div>
                      <div className="text-[9px] text-gray-500">prom. {machCapHour} c/h × {y1Hours.toFixed(1)}h (Y1)</div>
                    </div>
                    {/* KPI 3 — Req./h */}
                    <div onClick={() => setViabilityInfoModal({
                      title: 'Req. / Hora Necesario',
                      formula: 'Total req./día ÷ Horas disponibles Y1. Cuántas cajas/hora debe producir la máquina para terminar todos los items del mix en el día.',
                      steps: [
                        `Total req. mix: ${totalReq.toLocaleString('es-MX')} cajas/día`,
                        `Horas disponibles Y1: ${y1Hours.toFixed(2)} h`,
                        `Req./h = ${totalReq} ÷ ${y1Hours.toFixed(2)} = ${reqPerHour} c/h`,
                        `Cap. promedio del mix: ${machCapHour} c/h`,
                        reqPerHour > machCapHour
                          ? `⚠ INSUFICIENTE — se necesitan ${reqPerHour} c/h pero el mix promedió ${machCapHour} c/h`
                          : `✓ SUFICIENTE — el mix promedia ${machCapHour} c/h, mayor al req. de ${reqPerHour} c/h`
                      ]
                    })} className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] text-center cursor-pointer hover:border-yellow-400/40 hover:bg-yellow-400/5 transition-all duration-200">
                      <div className="text-[9px] text-yellow-400 uppercase font-bold tracking-wider mb-1">Req. / Hora Necesario</div>
                      <div className="text-2xl font-black text-white">{reqPerHour}</div>
                      <div className="text-[9px] text-gray-500">vs prom. mix: {machCapHour} c/h</div>
                    </div>
                    {/* KPI 4 — Máq. Necesarias */}
                    <div onClick={() => setViabilityInfoModal({
                      title: 'Máquinas Necesarias',
                      formula: 'TECHO(Total req./día ÷ Cap. máquina/día). Siempre se redondea hacia arriba para no dejar demanda sin cubrir.',
                      steps: [
                        `Total req./día: ${totalReq.toLocaleString('es-MX')} cajas`,
                        `Cap. máquina/día (Y1): ${machCapDay.toLocaleString('es-MX')} cajas`,
                        `Ratio = ${totalReq} ÷ ${machCapDay} = ${(totalReq/machCapDay).toFixed(3)}`,
                        `Máquinas = TECHO(${(totalReq/machCapDay).toFixed(3)}) = ${lines} línea(s)`,
                        lines <= 1 ? '✓ Una sola máquina cubre toda la demanda' : `⚠ Se necesitan ${lines} máquinas en paralelo`
                      ]
                    })} className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] text-center cursor-pointer hover:border-yellow-400/40 hover:bg-yellow-400/5 transition-all duration-200">
                      <div className="text-[9px] text-yellow-400 uppercase font-bold tracking-wider mb-1">Máquinas Necesarias</div>
                      <div className="text-2xl font-black text-white">{lines}</div>
                      <div className="text-[9px] text-gray-500">línea(s) para cubrir demanda</div>
                    </div>
                    {/* KPI 5 — Cap. Disponible */}
                    {(() => {
                      const capUsedPct = machCapDay > 0 ? (totalReq / machCapDay) * 100 : 0;
                      const capFreePct = Math.max(0, 100 - capUsedPct);
                      const overload   = capUsedPct > 100;
                      const freeBoxes  = Math.max(0, machCapDay - totalReq);
                      const kpiColor   = overload ? '#EC4899' : capFreePct > 20 ? '#00F0FF' : '#F59E0B';
                      return (
                        <div onClick={() => setViabilityInfoModal({
                          title: '% Cap. Disponible',
                          formula: '(Cap. máq/día − Total req.) ÷ Cap. máq/día × 100. Porcentaje de capacidad productiva que queda libre tras cubrir el mix seleccionado.',
                          steps: [
                            `Cap. máq/día (Y1): ${machCapDay.toLocaleString('es-MX')} cajas`,
                            `Total req. mix: ${totalReq.toLocaleString('es-MX')} cajas`,
                            `Cajas libres = ${machCapDay.toLocaleString('es-MX')} − ${totalReq.toLocaleString('es-MX')} = ${freeBoxes.toLocaleString('es-MX')} cajas`,
                            `% Usado = ${totalReq} ÷ ${machCapDay} × 100 = ${capUsedPct.toFixed(1)}%`,
                            `% Disponible = 100 − ${capUsedPct.toFixed(1)} = ${capFreePct.toFixed(1)}%`,
                            overload
                              ? `⚠ SOBRE-DEMANDA — el mix excede la capacidad en ${(capUsedPct - 100).toFixed(1)}%`
                              : capFreePct > 20
                                ? `✓ Margen cómodo — la máquina puede absorber hasta ${freeBoxes.toLocaleString('es-MX')} cajas adicionales/día`
                                : `⚠ Margen ajustado — solo ${capFreePct.toFixed(1)}% libre (${freeBoxes.toLocaleString('es-MX')} cajas)`
                          ]
                        })} className="p-4 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] text-center cursor-pointer hover:border-yellow-400/40 hover:bg-yellow-400/5 transition-all duration-200">
                          <div className="text-[9px] text-yellow-400 uppercase font-bold tracking-wider mb-1">Cap. Disponible</div>
                          <div className="text-2xl font-black" style={{ color: kpiColor }}>
                            {capFreePct.toFixed(1)}%
                          </div>
                          <div className="text-[9px] text-gray-500">{freeBoxes.toLocaleString('es-MX')} cajas libres/día</div>
                        </div>
                      );
                    })()}
                  </div>
                  {/* Barra de cobertura */}

                  <div className="px-5 pb-5 space-y-1.5">
                    <div className="flex justify-between text-[9px] text-gray-400">
                      <span className="text-white">Cobertura con 1 máquina (Y1 mejor caso)</span>
                      <span className="font-bold text-white">{coverPct.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[#1A1A1A] overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{ width:`${coverPct}%`, background:'linear-gradient(90deg,#0080FF,#00F0FF)' }}
                      />
                    </div>
                    {!covers && (
                      <p className="text-[10px] pt-1 text-white">
                        Déficit: <span className="font-bold">{(totalReq - machCapDay).toLocaleString('es-MX')}</span> cajas/día — la máquina cubre el {coverPct.toFixed(1)}% del total requerido.
                      </p>
                    )}
                  </div>
                </div>
              );

            })()}

            {/* ===== ESCENARIOS DEL CLIENTE ===== */}
            {selectedRow && (
              <div className="space-y-6 mt-2">

                {/* Header escenarios */}
                <div className="flex items-center gap-3 pt-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#2A2A2A] to-transparent" />
                  <span className="text-[11px] font-black uppercase tracking-[0.2em] text-gray-500">Escenarios del Cliente — Modelo: {selectedRow.name}</span>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-[#2A2A2A] to-transparent" />
                </div>

                 {/* Worst-case badges */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-[#222] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Activity className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest flex items-center gap-2">
                          Líneas Req. — Lavado y Secado
                          <span className={`text-[8px] px-1.5 py-0.5 rounded font-black tracking-normal uppercase ${manualLinesUsed !== null ? 'bg-amber-500/20 text-amber-400 border border-amber-500/25' : 'bg-blue-500/20 text-blue-400 border border-blue-500/25'}`}>
                            {manualLinesUsed !== null ? 'Fijo / Manual' : 'Cálculo Auto'}
                          </span>
                        </div>
                        <div className="text-2xl font-black text-white mt-0.5">
                          {worstLavado} <span className="text-xs text-gray-500 font-medium">línea(s) peor escenario</span>
                        </div>
                      </div>
                    </div>

                    {/* Controles de Líneas Manuales */}
                    <div className="flex items-center gap-1.5 bg-black/50 p-1.5 rounded-xl border border-white/5">
                      {manualLinesUsed !== null ? (
                        <>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManualLinesUsed(prev => Math.max(1, prev - 1)); }}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-white font-black flex items-center justify-center transition-all text-xs"
                            title="Disminuir líneas"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-mono font-black text-amber-400 text-sm">
                            {manualLinesUsed}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManualLinesUsed(prev => prev + 1); }}
                            className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 active:scale-95 text-white font-black flex items-center justify-center transition-all text-xs"
                            title="Aumentar líneas"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManualLinesUsed(null); }}
                            className="text-[9px] px-2 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 active:scale-95 border border-red-500/25 text-red-400 uppercase tracking-widest font-black transition-all ml-1"
                            title="Restablecer a cálculo automático"
                          >
                            Auto
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManualLinesUsed(worstLavado || 1); }}
                          className="px-3 py-1.5 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 active:scale-95 border border-blue-500/25 text-blue-400 text-[10px] font-black uppercase tracking-wider transition-all"
                          title="Establecer líneas manualmente"
                        >
                          Fijar
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* ── RESUMEN DE CAJAS/DÍA ── */}
                {/* Colors: #00F0FF cyan · #0080FF electric-blue · white numbers · cyan on hover */}
                <div className="grid grid-cols-1 gap-4">
                  {['lavadoSecado'].map(key => {
                    const sc = CUSTOMER_SCENARIOS[key];
                    const bestRow  = scenarioResults[key][0];
                    const worstRow = scenarioResults[key][scenarioResults[key].length - 1];
                    const machineDailyBest  = bestRow  ? bestRow.machineBoxesPerHour * bestRow.availableDailyTime  : 0;
                    const machineDailyWorst = worstRow ? worstRow.machineBoxesPerHour * worstRow.availableDailyTime : 0;

                    // ── Si hay modelos en el mix, usar su suma de requiredDaily ──
                    const isAuto = sc?.mode === 'auto';
                    const sumAllModels = computedRows.reduce((s, r) => s + (r.requiredDaily || 0), 0);
                    const mixSelected = computedRows.filter(r => selectedMixIds.includes(r.id));
                    const mixTotalReq = mixSelected.reduce((s, r) => s + (r.requiredDaily || 0), 0);
                    const effectiveReq = mixSelected.length > 0 && mixTotalReq > 0 
                      ? mixTotalReq 
                      : (isAuto ? sumAllModels : sc.dailyRate);
                    const usingMix = mixSelected.length > 0 && mixTotalReq > 0;

                    const pct = machineDailyBest > 0 ? Math.min(100, (machineDailyBest / effectiveReq) * 100) : 0;
                    return (

                      <div
                        key={`summary-${key}`}
                        className="group p-5 rounded-2xl bg-[#0C0C0C] border border-[#1E1E1E] space-y-4 cursor-default
                                   hover:border-[#00F0FF]/30 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between border-b border-[#1E1E1E]/50 pb-3">
                          <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-[#00F0FF] transition-colors duration-300">
                            ◈ {sc.name} — Resumen Diario
                          </h4>
                          
                          {/* Segment controller right in the header! */}
                          <div className="flex bg-[#121212] border border-[#222] p-0.5 rounded-lg gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomerScenarios(prev => ({
                                  ...prev,
                                  [key]: { ...prev[key], mode: 'manual' }
                                }));
                              }}
                              className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded transition-all duration-150 ${
                                sc.mode !== 'auto'
                                  ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 font-black'
                                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
                              }`}
                            >
                              Manual
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setCustomerScenarios(prev => ({
                                  ...prev,
                                  [key]: { ...prev[key], mode: 'auto' }
                                }));
                              }}
                              className={`px-2 py-0.5 text-[9px] font-extrabold uppercase rounded transition-all duration-150 ${
                                sc.mode === 'auto'
                                  ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 font-black'
                                  : 'text-gray-500 hover:text-gray-300 border border-transparent'
                              }`}
                            >
                              Tabla (Auto)
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {/* Req. Diario — Toggleable and inline editable */}
                          <div
                            onClick={() => setViabilityInfoModal({
                              title: `Req. Diario — ${sc.name}`,
                              formula: sc.mode === 'auto'
                                ? 'Suma de los Req. Diario de TODOS los modelos con requerimiento en la tabla.'
                                : 'Volumen de producción diario ingresado de forma manual directamente en esta tarjeta.',
                              steps: sc.mode === 'auto'
                                ? [
                                    `Modelos con req: ${computedRows.filter(r=>r.requiredDaily>0).map(r=>`${r.label} - ${r.name} (${(r.requiredDaily||0).toLocaleString('es-MX')} cajas)`).join(', ')}`,
                                    `Total Suma = ${computedRows.filter(r=>r.requiredDaily>0).map(r=>r.requiredDaily||0).join(' + ')} = ${effectiveReq.toLocaleString('es-MX')} cajas/día`,
                                    `Req/h (Y1) = ${effectiveReq} ÷ ${bestRow?.availableDailyTime?.toFixed(2)} h = ${bestRow ? (effectiveReq / bestRow.availableDailyTime).toFixed(1) : '-'} c/h`
                                  ]
                                : [
                                    `Dato manual ingresado: ${sc.dailyRate?.toLocaleString('es-MX')} cajas/día`,
                                    `Req/h (Y1) = ${sc.dailyRate} ÷ ${bestRow?.availableDailyTime?.toFixed(2)} h = ${bestRow ? (sc.dailyRate / bestRow.availableDailyTime).toFixed(1) : '-'} c/h`
                                  ]
                            })}
                            className={`p-3 rounded-xl border text-center cursor-pointer transition-all duration-200 ${
                              sc.mode === 'auto'
                                ? 'bg-[#00F0FF]/5 border-[#00F0FF]/40 hover:border-[#00F0FF]/70'
                                : 'bg-[#141414] border-[#1E1E1E] hover:border-[#00F0FF]/40 hover:bg-[#00F0FF]/5'
                            }`}
                          >
                            <div className="flex flex-col items-center justify-between h-full">
                              <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-1">
                                Req. Diario
                              </div>
                              {sc.mode === 'auto' ? (
                                <div className="space-y-0.5">
                                  <div className="text-xl font-black text-[#00F0FF] transition-colors duration-300">
                                    {effectiveReq.toLocaleString('es-MX')}
                                  </div>
                                  <div className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider">
                                    [Tabla]
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1 flex flex-col items-center">
                                  <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={sc.dailyRate ?? 0}
                                    onClick={(e) => e.stopPropagation()} // Evita abrir el modal de información al hacer click
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value.replace(/\D/g, '')) || 0);
                                      setCustomerScenarios(prev => ({
                                        ...prev,
                                        [key]: {
                                          ...prev[key],
                                          dailyRate: val
                                        }
                                      }));
                                    }}
                                    className="w-24 bg-[#181818] border border-[#333] text-center text-white font-black text-lg rounded px-1 py-0.5 focus:border-[#00F0FF] focus:outline-none transition-colors"
                                  />
                                  <div className="text-[8px] text-gray-500 font-extrabold uppercase tracking-wider">
                                    [Manual]
                                  </div>
                                </div>
                              )}
                              <div className="text-[9px] text-gray-600 mt-1">cajas/día</div>
                            </div>
                          </div>

                          {/* Cap. Máx Y1 */}
                          <div
                            onClick={() => setViabilityInfoModal({
                              title: `Cap. Máx (Y1) — ${sc.name}`,
                              formula: 'Capacidad máxima diaria de la máquina en el año 1 (mejor escenario de tiempo disponible). Cap./h × Tiempo disponible Y1.',
                              steps: [
                                `Modelo activo: ${selectedRow?.name}`,
                                `Cap. real/h máquina: ${bestRow?.machineBoxesPerHour?.toFixed(1)} cajas/h`,
                                `Horas efectivas Y1: ${bestRow?.effectiveHoursPerShift?.toFixed(2)} h/turno × ${bestRow?.shifts} turnos = ${bestRow?.availableDailyTime?.toFixed(2)} h/día`,
                                `Cap. Máx/día = ${bestRow?.machineBoxesPerHour?.toFixed(1)} × ${bestRow?.availableDailyTime?.toFixed(2)} = ${Math.round(machineDailyBest).toLocaleString('es-MX')} cajas/día`
                              ]
                            })}
                            className="p-3 rounded-xl bg-[#141414] border border-[#1E1E1E] text-center cursor-pointer hover:border-[#00F0FF]/40 hover:bg-[#00F0FF]/5 transition-all duration-200"
                          >
                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-1">Cap. Máx (Y1)</div>
                            <div className="text-xl font-black text-white group-hover:text-[#00F0FF] transition-colors duration-300">
                              {Math.round(machineDailyBest).toLocaleString('es-MX')}
                            </div>
                            <div className="text-[9px] text-gray-600">cajas/día</div>
                          </div>
                          {/* Cap. Mín Y5 */}
                          <div
                            onClick={() => setViabilityInfoModal({
                              title: `Cap. Mín (Y5) — ${sc.name}`,
                              formula: 'Capacidad mínima diaria de la máquina en el año 5 (peor escenario de tiempo disponible). Cap./h × Tiempo disponible Y5.',
                              steps: [
                                `Modelo activo: ${selectedRow?.name}`,
                                `Cap. real/h máquina: ${worstRow?.machineBoxesPerHour?.toFixed(1)} cajas/h`,
                                `Horas efectivas Y5: ${worstRow?.effectiveHoursPerShift?.toFixed(2)} h/turno × ${worstRow?.shifts} turnos = ${worstRow?.availableDailyTime?.toFixed(2)} h/día`,
                                `Cap. Mín/día = ${worstRow?.machineBoxesPerHour?.toFixed(1)} × ${worstRow?.availableDailyTime?.toFixed(2)} = ${Math.round(machineDailyWorst).toLocaleString('es-MX')} cajas/día`,
                                `Nota: Y5 tiene menos horas disponibles (${worstRow?.hrsBase}h base vs ${bestRow?.hrsBase}h en Y1), por eso la capacidad diaria es menor.`
                              ]
                            })}
                            className="p-3 rounded-xl bg-[#141414] border border-[#1E1E1E] text-center cursor-pointer hover:border-[#00F0FF]/40 hover:bg-[#00F0FF]/5 transition-all duration-200"
                          >
                            <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider mb-1">Cap. Mín (Y5)</div>
                            <div className="text-xl font-black text-white group-hover:text-[#00F0FF] transition-colors duration-300">
                              {Math.round(machineDailyWorst).toLocaleString('es-MX')}
                            </div>
                            <div className="text-[9px] text-gray-600">cajas/día</div>
                          </div>
                        </div>


                        {/* Barra de cobertura — cyan/blue gradient siempre */}
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-[9px] text-gray-500">
                            <span>Cobertura con 1 línea — mejor caso (Y1)</span>
                            <span className="font-bold text-white group-hover:text-[#00F0FF] transition-colors duration-300">
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#1A1A1A] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700"
                              style={{
                                width: `${pct}%`,
                                background: 'linear-gradient(90deg, #0080FF, #00F0FF)'
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* ══ SELECTOR DE MIX DE MODELOS ══ */}
                {(() => {
                  const mixRows = computedRows.filter(r => selectedMixIds.includes(r.id));
                  const avgCapH = mixRows.length > 0
                    ? mixRows.reduce((s, r) => s + r.realBoxesHr, 0) / mixRows.length
                    : 0;
                  const totalMixReq = mixRows.reduce((s, r) => s + (r.requiredDaily || 0), 0);
                  // Use Y1 best-case hours from lavadoSecado
                  const y1Hours = scenarioResults.lavadoSecado[0]?.availableDailyTime ?? (inputs.hoursPerShift * inputs.shifts);
                  const mixCapDay = +(avgCapH * y1Hours).toFixed(0);
                  const mixCovers = totalMixReq > 0 ? mixCapDay >= totalMixReq : null;
                  const mixHrsNeeded = avgCapH > 0 && totalMixReq > 0 ? +(totalMixReq / avgCapH).toFixed(2) : 0;
                  return (
                    <div className="rounded-2xl bg-[#0C0C0C] border border-[#1E1E1E] overflow-hidden">
                      <div className="px-5 py-3 border-b border-[#1E1E1E] bg-[#080808] flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest text-yellow-400">
                          ◈ Análisis de Mix — Selecciona los modelos a producir hoy
                        </h3>
                        <div className="flex gap-3">
                          <button onClick={distributeGlobalRate} className="text-[10px] font-black uppercase bg-yellow-400/10 text-yellow-400 border border-yellow-400/20 px-3 py-1 rounded-lg hover:bg-yellow-400 hover:text-black transition-all">
                            Distribuir Rate Global
                          </button>
                          <button onClick={() => setSelectedMixIds([])} className="text-[10px] text-gray-500 hover:text-white transition-colors">Limpiar</button>
                        </div>
                      </div>
                      {/* Selector de modelos */}
                      <div className="p-4 flex flex-wrap gap-2 border-b border-[#1A1A1A]">
                        {computedRows.map(r => {
                          const active = selectedMixIds.includes(r.id);
                          return (
                            <button key={r.id} onClick={() => toggleMix(r.id)}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all duration-200 ${
                                active
                                  ? 'border-[#00F0FF] bg-[#00F0FF]/10 text-white'
                                  : 'border-[#2A2A2A] bg-[#111] text-gray-500 hover:border-[#444] hover:text-gray-300'
                              }`}
                            >
                              <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black"
                                style={{ backgroundColor: active ? (r.color||'#3b82f6') : '#333', color: '#fff' }}>
                                {r.label}
                              </span>
                              {r.name}
                              <span className="opacity-60">{r.realBoxesHr.toFixed(0)} c/h</span>
                            </button>
                          );
                        })}
                      </div>
                      {/* Resultados del Mix */}
                      {mixRows.length === 0 ? (
                        <div className="px-5 py-6 text-center text-xs text-gray-600">Selecciona al menos un modelo para analizar el mix.</div>
                      ) : (
                        <div className="p-5 space-y-4">
                          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                            <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] text-center">
                              <div className="text-[9px] text-yellow-400 uppercase font-bold tracking-wider mb-1">Modelos Selec.</div>
                              <div className="text-2xl font-black text-white">{mixRows.length}</div>
                              <div className="text-[9px] text-gray-500">{mixRows.map(r=>r.label).join(', ')}</div>
                            </div>
                            <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] text-center">
                              <div className="text-[9px] text-yellow-400 uppercase font-bold tracking-wider mb-1">Cap. Promedio/h</div>
                              <div className="text-2xl font-black text-white">{avgCapH.toFixed(1)}</div>
                              <div className="text-[9px] text-gray-500">cajas/h (promedio del mix)</div>
                            </div>
                            <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] text-center">
                              <div className="text-[9px] text-yellow-400 uppercase font-bold tracking-wider mb-1">Cap. Mix / Día (Y1)</div>
                              <div className="text-2xl font-black text-white">{mixCapDay.toLocaleString('es-MX')}</div>
                              <div className="text-[9px] text-gray-500">{avgCapH.toFixed(1)} c/h × {y1Hours.toFixed(2)} h</div>
                            </div>
                            {/* ── HRS EFECTIVAS / TURNO ── */}
                            {(() => {
                              const y1Sc    = CUSTOMER_SCENARIOS.lavadoSecado.scenarios[0];
                              const hrsEfT  = y1Sc?.effectiveHoursPerShift ?? 0;
                              const shifts  = y1Sc?.shifts ?? 1;
                              return (
                                <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#00F0FF]/20 text-center">
                                  <div className="text-[9px] text-[#00F0FF] uppercase font-bold tracking-wider mb-1">Hrs Ef. / Turno (Y1)</div>
                                  <div className="text-2xl font-black text-[#00F0FF]">{hrsEfT.toFixed(2)}h</div>
                                  <div className="text-[9px] text-gray-500">{shifts} turno{shifts > 1 ? 's' : ''} · {y1Hours.toFixed(2)}h totales/día</div>
                                </div>
                              );
                            })()}
                            <div className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] text-center">
                              <div className="text-[9px] text-yellow-400 uppercase font-bold tracking-wider mb-1">Horas Necesarias</div>
                              <div className={`text-2xl font-black ${mixHrsNeeded > y1Hours ? 'text-red-400' : 'text-white'}`}>
                                {mixHrsNeeded > 0 ? `${mixHrsNeeded}h` : '-'}
                              </div>
                              <div className="text-[9px] text-gray-500">de {y1Hours.toFixed(2)}h disponibles (Y1)</div>
                            </div>
                          </div>
                          {/* Detalle por modelo */}
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-[#1A1A1A]">
                                  {['Mod','Nombre','Cap. Real/h','Req. Diario','Hrs Necesarias','¿Alcanza?'].map(h=>(
                                    <th key={h} className="px-3 py-2 text-left text-[10px] text-yellow-400 uppercase font-bold tracking-wider">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-[#1A1A1A]">
                                {mixRows.map(r => {
                                  const hrsNeeded = r.realBoxesHr > 0 && r.requiredDaily > 0 ? +(r.requiredDaily / r.realBoxesHr).toFixed(2) : null;
                                  const ok = hrsNeeded !== null ? hrsNeeded <= y1Hours : null;
                                  return (
                                    <tr key={r.id} className="hover:bg-white/[0.02]">
                                      <td className="px-3 py-2">
                                        <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center" style={{backgroundColor: r.color||'#3b82f6', color:'#fff'}}>{r.label}</span>
                                      </td>
                                      <td className="px-3 py-2 text-white font-medium">{r.name}</td>
                                      <td className="px-3 py-2 text-white">{r.realBoxesHr.toFixed(1)} c/h</td>
                                      <td className="px-3 py-2 text-white">{r.requiredDaily > 0 ? r.requiredDaily.toLocaleString('es-MX') : <span className="text-gray-600">—</span>}</td>
                                      <td className="px-3 py-2 font-bold" style={{color: ok===false?'#f87171':'#fff'}}>{hrsNeeded !== null ? `${hrsNeeded}h` : '—'}</td>
                                      <td className="px-3 py-2">
                                        {ok === null ? <span className="text-gray-600 text-[10px]">Sin req.</span>
                                        : ok ? <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-[#00F0FF]/10 text-[#00F0FF]">✓ Sí</span>
                                        : <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-red-500/10 text-red-400">✗ No</span>}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                          {/* Veredicto mix */}
                          {totalMixReq > 0 && (
                            <div className={`p-3 rounded-xl border text-center text-xs font-bold ${
                              mixCovers ? 'bg-[#00F0FF]/5 border-[#00F0FF]/30 text-white' : 'bg-red-500/5 border-red-500/30 text-white'
                            }`}>
                              {mixCovers
                                ? `✓ El mix completo (${totalMixReq.toLocaleString('es-MX')} cajas) puede completarse en ${mixHrsNeeded}h — dentro de las ${y1Hours.toFixed(2)}h disponibles (Y1).`
                                : `⚠ El mix (${totalMixReq.toLocaleString('es-MX')} cajas) requiere ${mixHrsNeeded}h pero solo hay ${y1Hours.toFixed(2)}h disponibles (Y1). Faltan ${(mixHrsNeeded - y1Hours).toFixed(2)}h.`
                              }
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* ── IMPACTO ENERGÉTICO Y COSTOS ── */}
                {(() => {
                  const totalPowerKw = installedPowerKw;
                  const activeLoadFactor = 0.85;
                  const avgHourlyKwh = totalPowerKw * activeLoadFactor;
                  const avgHourlyCostMxn = avgHourlyKwh * 2.50;
                  
                  const dailyHours = scenarioResults.lavadoSecado?.[0]?.availableDailyTime ?? 16;
                  const dailyKwh = avgHourlyKwh * dailyHours;
                  const dailyCostMxn = dailyKwh * 2.50;
                  const annualCostMxn = dailyCostMxn * (inputs.daysPerMonth || 26) * 12;
                  
                  const pumpsKw = totalPowerKw * (30.0 / 89.5);
                  const blowersKw = totalPowerKw * (22.0 / 89.5);
                  const beltKw = totalPowerKw * (1.5 / 89.5);
                  const heatingKw = totalPowerKw * (36.0 / 89.5);
                  
                  const boxKwh = selectedRow && selectedRow.realBoxesHr > 0 ? avgHourlyKwh / selectedRow.realBoxesHr : 0;
                  const boxCost = boxKwh * 2.50;
                  
                  return (
                    <div className="rounded-2xl bg-[#0C0C0C] border border-[#1E1E1E] overflow-hidden p-5">
                      <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                            ⚡ Impacto Energético e Indicadores de Consumo
                          </h3>
                        </div>
                        <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Línea Wash & Dry</span>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="p-4 rounded-xl bg-gradient-to-b from-[#141414] to-[#0A0A0A] border border-[#1E1E1E]">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Potencia Instalada</div>
                          {isEditingPower ? (
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              const val = parseFloat(powerDraft);
                              if (!isNaN(val) && val > 0) {
                                setInstalledPowerKw(val);
                                localStorage.setItem(`sim_${simulatorId}_installed_power`, val.toString());
                              }
                              setIsEditingPower(false);
                            }} className="mt-1 flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.1"
                                autoFocus
                                value={powerDraft}
                                onChange={(e) => setPowerDraft(e.target.value)}
                                onBlur={() => {
                                  const val = parseFloat(powerDraft);
                                  if (!isNaN(val) && val > 0) {
                                    setInstalledPowerKw(val);
                                    localStorage.setItem(`sim_${simulatorId}_installed_power`, val.toString());
                                  }
                                  setIsEditingPower(false);
                                }}
                                className="w-20 px-1.5 py-0.5 bg-[#1F1F1F] border border-amber-500/50 rounded-lg text-white font-black text-lg outline-none focus:ring-1 focus:ring-amber-500"
                              />
                              <span className="text-xs text-gray-400 font-medium">kW</span>
                            </form>
                          ) : (
                            <div 
                              onClick={() => {
                                setPowerDraft(totalPowerKw.toString());
                                setIsEditingPower(true);
                              }}
                              className="text-xl font-black text-white mt-1 cursor-pointer hover:text-amber-400 transition-colors flex items-baseline gap-1 group/btn"
                              title="Haz clic para editar manualmente la potencia instalada"
                            >
                              {formatNumber(totalPowerKw, 1)} <span className="text-xs text-gray-500 font-medium">kW</span>
                              <Edit3 className="w-3.5 h-3.5 opacity-40 group-hover/btn:opacity-100 text-amber-400 transition-opacity ml-1.5" />
                            </div>
                          )}
                          <div className="text-[10px] text-gray-400 mt-1">Haz clic para editar</div>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-b from-[#141414] to-[#0A0A0A] border border-[#1E1E1E]">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Consumo Promedio</div>
                          <div className="text-xl font-black text-amber-400 mt-1">{formatNumber(avgHourlyKwh, 1)} <span className="text-xs text-gray-400 font-medium">kWh</span></div>
                          <div className="text-[10px] text-gray-400 mt-1">A 85% de factor de carga</div>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-b from-[#141414] to-[#0A0A0A] border border-[#1E1E1E]">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Costo Operativo/h</div>
                          <div className="text-xl font-black text-emerald-400 mt-1">${formatNumber(avgHourlyCostMxn, 1)} <span className="text-xs text-gray-400 font-medium">MXN</span></div>
                          <div className="text-[10px] text-gray-400 mt-1">Ref Tarifa: $2.50 / kWh</div>
                        </div>
                        <div className="p-4 rounded-xl bg-gradient-to-b from-[#141414] to-[#0A0A0A] border border-[#1E1E1E]">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Costo Energético Anual</div>
                          <div className="text-xl font-black text-red-500 mt-1">
                            ${Number(annualCostMxn).toLocaleString('es-MX', { maximumFractionDigits: 0 })} <span className="text-xs text-gray-400 font-medium">MXN</span>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">312 días de operación Y1</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-[#141414]/30 border border-[#1E1E1E]">
                          <div className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">◈ Desglose Técnico de Potencia</div>
                          <div className="space-y-2 text-xs">
                            <div className="flex justify-between items-center py-1 border-b border-[#1E1E1E]">
                              <span className="text-gray-400">🔥 Calentamiento de Agua:</span>
                              <span className="font-bold text-white">{formatNumber(heatingKw, 1)} kW <span className="text-gray-500 font-normal">(40.2%)</span></span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-[#1E1E1E]">
                              <span className="text-gray-400">💧 Bombas de Lavado:</span>
                              <span className="font-bold text-white">{formatNumber(pumpsKw, 1)} kW <span className="text-gray-500 font-normal">(33.5%)</span></span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-[#1E1E1E]">
                              <span className="text-gray-400">🌀 Secado (Turbinas Sopladoras):</span>
                              <span className="font-bold text-white">{formatNumber(blowersKw, 1)} kW <span className="text-gray-500 font-normal">(24.6%)</span></span>
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-gray-400">⚙ Motor Banda Transportadora:</span>
                              <span className="font-bold text-white">{formatNumber(beltKw, 1)} kW <span className="text-gray-500 font-normal">(1.7%)</span></span>
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-[#141414]/30 border border-[#1E1E1E] flex flex-col justify-between">
                          <div>
                            <div className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">◈ Huella Energética por Caja</div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Con una capacidad real de <span className="text-white font-bold">{selectedRow ? formatNumber(selectedRow.realBoxesHr, 0) : '-'} cajas/hora</span> y un consumo promedio de <span className="text-white font-bold">{formatNumber(avgHourlyKwh, 1)} kWh</span>, cada caja lavada y secada tiene un consumo eléctrico neto estimado de <span className="text-amber-400 font-black">{boxKwh > 0 ? formatNumber(boxKwh, 2) : '-'} kWh/caja</span>.
                            </p>
                          </div>
                          <div className="mt-3 pt-3 border-t border-[#1E1E1E] flex justify-between items-center text-xs">
                            <span className="text-gray-500">Costo energético neto unitario:</span>
                            <span className="font-black text-emerald-400">
                              ${boxCost > 0 ? formatNumber(boxCost, 2) : '-'} MXN / caja
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── 💧 BALANCE HÍDRICO Y SUSTENTABILIDAD (NUEVO PANEL CORPORATIVO) ── */}
                {(() => {
                  const y1Sc = CUSTOMER_SCENARIOS.lavadoSecado.scenarios[0];
                  const y1Hours = y1Sc ? (y1Sc.effectiveHoursPerShift * y1Sc.shifts) : 10;
                  
                  // Consumo diario (m³/día) = (waterReplenishLh * horas) / 1000
                  const dailyWaterM3 = (waterReplenishLh * y1Hours) / 1000;
                  
                  // Consumo semanal (m³/semana) = dailyWaterM3 * 6 días
                  const weeklyWaterM3 = dailyWaterM3 * 6;
                  
                  // Recirculación (%) = ((Caudal - Reposición) / Caudal) * 100
                  const recircPct = washFlowLh > 0 ? ((washFlowLh - waterReplenishLh) / washFlowLh) * 100 : 0;
                  
                  // Consumo unitario por caja (L/caja)
                  const unitWaterL = selectedRow && selectedRow.realBoxesHr > 0 ? (waterReplenishLh / selectedRow.realBoxesHr) : 0;

                  return (
                    <div className="rounded-2xl bg-[#0C0C0C] border border-[#1E1E1E] overflow-hidden p-5">
                      <div className="flex items-center justify-between border-b border-[#1E1E1E] pb-3 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                            💧 Balance Hídrico e Indicadores de Consumo de Agua
                          </h3>
                        </div>
                        <span className="text-[10px] bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">Sustentabilidad</span>
                      </div>

                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div className="p-4 rounded-xl bg-gradient-to-b from-[#141414] to-[#0A0A0A] border border-[#1E1E1E]">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Caudal Lavado Interno</div>
                          {isEditingWashFlow ? (
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              const val = parseFloat(washFlowDraft);
                              if (!isNaN(val) && val > 0) {
                                setWashFlowLh(val);
                                localStorage.setItem(`sim_${simulatorId}_wash_flow_lh`, val.toString());
                              }
                              setIsEditingWashFlow(false);
                            }} className="mt-1 flex items-center gap-1.5">
                              <input
                                type="number"
                                step="1"
                                autoFocus
                                value={washFlowDraft}
                                onChange={(e) => setWashFlowDraft(e.target.value)}
                                onBlur={() => {
                                  const val = parseFloat(washFlowDraft);
                                  if (!isNaN(val) && val > 0) {
                                    setWashFlowLh(val);
                                    localStorage.setItem(`sim_${simulatorId}_wash_flow_lh`, val.toString());
                                  }
                                  setIsEditingWashFlow(false);
                                }}
                                className="w-20 px-1.5 py-0.5 bg-[#1F1F1F] border border-blue-500/50 rounded-lg text-white font-black text-lg outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-400 font-medium">L/h</span>
                            </form>
                          ) : (
                            <div 
                              onClick={() => {
                                setWashFlowDraft(washFlowLh.toString());
                                setIsEditingWashFlow(true);
                              }}
                              className="text-xl font-black text-white mt-1 cursor-pointer hover:text-blue-400 transition-colors flex items-baseline gap-1 group/btn"
                              title="Haz clic para editar manualmente el caudal de lavado"
                            >
                              {formatNumber(washFlowLh, 0)} <span className="text-xs text-gray-500 font-medium">L/h</span>
                              <Edit3 className="w-3.5 h-3.5 opacity-40 group-hover/btn:opacity-100 text-blue-400 transition-opacity ml-1.5" />
                            </div>
                          )}
                          <div className="text-[10px] text-gray-400 mt-1">Haz clic para editar</div>
                        </div>

                        <div className="p-4 rounded-xl bg-gradient-to-b from-[#141414] to-[#0A0A0A] border border-[#1E1E1E]">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Reposición Real de Agua</div>
                          {isEditingReplenish ? (
                            <form onSubmit={(e) => {
                              e.preventDefault();
                              const val = parseFloat(replenishDraft);
                              if (!isNaN(val) && val > 0) {
                                setWaterReplenishLh(val);
                                localStorage.setItem(`sim_${simulatorId}_water_replenish_lh`, val.toString());
                              }
                              setIsEditingReplenish(false);
                            }} className="mt-1 flex items-center gap-1.5">
                              <input
                                type="number"
                                step="1"
                                autoFocus
                                value={replenishDraft}
                                onChange={(e) => setReplenishDraft(e.target.value)}
                                onBlur={() => {
                                  const val = parseFloat(replenishDraft);
                                  if (!isNaN(val) && val > 0) {
                                    setWaterReplenishLh(val);
                                    localStorage.setItem(`sim_${simulatorId}_water_replenish_lh`, val.toString());
                                  }
                                  setIsEditingReplenish(false);
                                }}
                                className="w-20 px-1.5 py-0.5 bg-[#1F1F1F] border border-blue-500/50 rounded-lg text-white font-black text-lg outline-none focus:ring-1 focus:ring-blue-500"
                              />
                              <span className="text-xs text-gray-400 font-medium">L/h</span>
                            </form>
                          ) : (
                            <div 
                              onClick={() => {
                                setReplenishDraft(waterReplenishLh.toString());
                                setIsEditingReplenish(true);
                              }}
                              className="text-xl font-black text-blue-400 mt-1 cursor-pointer hover:text-blue-300 transition-colors flex items-baseline gap-1 group/btn"
                              title="Haz clic para editar manualmente la reposición de agua"
                            >
                              {formatNumber(waterReplenishLh, 0)} <span className="text-xs text-gray-500 font-medium">L/h</span>
                              <Edit3 className="w-3.5 h-3.5 opacity-40 group-hover/btn:opacity-100 text-blue-300 transition-opacity ml-1.5" />
                            </div>
                          )}
                          <div className="text-[10px] text-gray-400 mt-1">Haz clic para editar</div>
                        </div>

                        <div className="p-4 rounded-xl bg-gradient-to-b from-[#141414] to-[#0A0A0A] border border-[#1E1E1E]">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Consumo Nominal Diario</div>
                          <div className="text-xl font-black text-white mt-1">
                            {formatNumber(dailyWaterM3, 2)} <span className="text-xs text-gray-400 font-medium">m³/día</span>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">Para {y1Hours} hrs de operación Y1</div>
                        </div>

                        <div className="p-4 rounded-xl bg-gradient-to-b from-[#141414] to-[#0A0A0A] border border-[#1E1E1E]">
                          <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Consumo Nominal Semanal</div>
                          <div className="text-xl font-black text-[#11b5c9] mt-1">
                            {formatNumber(weeklyWaterM3, 1)} <span className="text-xs text-gray-400 font-medium">m³/sem</span>
                          </div>
                          <div className="text-[10px] text-gray-400 mt-1">Basado en 6 días/semana</div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl bg-[#141414]/30 border border-[#1E1E1E]">
                          <div className="text-xs font-bold text-gray-300 mb-3 uppercase tracking-wider">◈ Configuración de Recirculación y Filtros</div>
                          <div className="space-y-2.5 text-xs">
                            <div className="flex justify-between items-center py-1 border-b border-[#1E1E1E]">
                              <span className="text-gray-400">♻ Tasa de Recirculación:</span>
                              <span className="font-black text-[#11b5c9]">{formatNumber(recircPct, 1)}% <span className="text-gray-500 font-normal">(Ahorro de agua limpia)</span></span>
                            </div>
                            <div className="flex justify-between items-center py-1 border-b border-[#1E1E1E]">
                              <span className="text-gray-400">📦 Capacidad del Tanque:</span>
                              {isEditingTank ? (
                                <form onSubmit={(e) => {
                                  e.preventDefault();
                                  const val = parseFloat(tankDraft);
                                  if (!isNaN(val) && val > 0) {
                                    setTankCapacityL(val);
                                    localStorage.setItem(`sim_${simulatorId}_tank_capacity_l`, val.toString());
                                  }
                                  setIsEditingTank(false);
                                }} className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    autoFocus
                                    value={tankDraft}
                                    onChange={(e) => setTankDraft(e.target.value)}
                                    onBlur={() => {
                                      const val = parseFloat(tankDraft);
                                      if (!isNaN(val) && val > 0) {
                                        setTankCapacityL(val);
                                        localStorage.setItem(`sim_${simulatorId}_tank_capacity_l`, val.toString());
                                      }
                                      setIsEditingTank(false);
                                    }}
                                    className="w-16 px-1.5 py-0.5 bg-[#1F1F1F] border border-blue-500/50 rounded-lg text-white font-black text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </form>
                              ) : (
                                <span 
                                  onClick={() => {
                                    setTankDraft(tankCapacityL.toString());
                                    setIsEditingTank(true);
                                  }}
                                  className="font-bold text-white cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-1"
                                  title="Haz clic para editar"
                                >
                                  {formatNumber(tankCapacityL, 0)} L
                                  <Edit3 className="w-3 h-3 opacity-40 text-blue-400" />
                                </span>
                              )}
                            </div>
                            <div className="flex justify-between items-center py-1">
                              <span className="text-gray-400">📅 Cambio de Agua Recomendado:</span>
                              {isEditingChangeDays ? (
                                <form onSubmit={(e) => {
                                  e.preventDefault();
                                  if (changeDaysDraft.trim()) {
                                    setWaterChangeDays(changeDaysDraft.trim());
                                    localStorage.setItem(`sim_${simulatorId}_water_change_days`, changeDaysDraft.trim());
                                  }
                                  setIsEditingChangeDays(false);
                                }} className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    autoFocus
                                    value={changeDaysDraft}
                                    onChange={(e) => setChangeDaysDraft(e.target.value)}
                                    onBlur={() => {
                                      if (changeDaysDraft.trim()) {
                                        setWaterChangeDays(changeDaysDraft.trim());
                                        localStorage.setItem(`sim_${simulatorId}_water_change_days`, changeDaysDraft.trim());
                                      }
                                      setIsEditingChangeDays(false);
                                    }}
                                    className="w-16 px-1.5 py-0.5 bg-[#1F1F1F] border border-blue-500/50 rounded-lg text-white font-black text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </form>
                              ) : (
                                <span 
                                  onClick={() => {
                                    setChangeDaysDraft(waterChangeDays);
                                    setIsEditingChangeDays(true);
                                  }}
                                  className="font-bold text-white cursor-pointer hover:text-blue-400 transition-colors flex items-center gap-1"
                                  title="Haz clic para editar"
                                >
                                  Cada {waterChangeDays} días
                                  <Edit3 className="w-3 h-3 opacity-40 text-blue-400" />
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="p-4 rounded-xl bg-[#141414]/30 border border-[#1E1E1E] flex flex-col justify-between">
                          <div>
                            <div className="text-xs font-bold text-gray-300 mb-2 uppercase tracking-wider">◈ Huella Hídrica por Caja Lavada</div>
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Con una capacidad real de <span className="text-white font-bold">{selectedRow ? formatNumber(selectedRow.realBoxesHr, 0) : '-'} cajas/hora</span> y un consumo de reposición de <span className="text-white font-bold">{formatNumber(waterReplenishLh, 0)} litros/hora</span>, cada caja lavada y secada tiene un consumo neto de agua potable estimado de solo <span className="text-blue-400 font-black">{unitWaterL > 0 ? formatNumber(unitWaterL, 2) : '-'} litros/caja</span>.
                            </p>
                          </div>
                          <div className="mt-3 pt-3 border-t border-[#1E1E1E] flex justify-between items-center text-xs">
                            <span className="text-gray-500">Eficiencia hídrica unitaria:</span>
                            <span className="font-black text-blue-400">
                              {unitWaterL > 0 ? formatNumber(unitWaterL, 2) : '-'} Litros / caja
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* ── GRÁFICA DE EFICIENCIA — solo 2 colores: #00F0FF y #0080FF ── */}

                <div className="rounded-2xl bg-[#0C0C0C] border border-[#1E1E1E] overflow-hidden">
                  <div className="px-5 py-3 border-b border-[#1E1E1E] bg-[#080808] flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      ◈ Gráfica de Eficiencia — Req/h vs Capacidad Máquina
                    </h3>
                    <span className="text-[11px] text-gray-500">Modelo activo: {selectedRow?.name}</span>
                  </div>
                  <div className="grid grid-cols-1 gap-0">
                    {['lavadoSecado'].map(key => {
                      const sc = CUSTOMER_SCENARIOS[key];
                      const chartData = scenarioResults[key].map(r => ({
                        year: r.year,
                        'Req/h':        +r.requiredPerHour.toFixed(1),
                        'Cap. Máquina': +r.machineBoxesPerHour.toFixed(1),
                      }));
                      return (
                        <div key={`chart-${key}`} className="p-5">
                          <div className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-400">
                            ◈ <span style={{ color: '#00F0FF' }}>{sc.name}</span>
                          </div>
                          <ResponsiveContainer width="100%" height={220}>
                            <BarChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1A1A1A" />
                              <XAxis dataKey="year" tick={{ fill: '#9ca3af', fontSize: 11, fontWeight: 600 }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor: '#111', border: '1px solid #00F0FF30', borderRadius: '10px', fontSize: '12px', color: '#fff' }}
                                cursor={{ fill: 'rgba(0,240,255,0.03)' }}
                              />
                              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: '#9ca3af' }} />
                              {/* ■ Req/h — Cyan #00F0FF */}
                              <Bar dataKey="Req/h" name="Req. / hora" fill="#00F0FF" fillOpacity={0.85} radius={[4,4,0,0]} maxBarSize={36} />
                              {/* ■ Cap. Máquina — Electric Blue #0080FF */}
                              <Bar dataKey="Cap. Máquina" name="Cap. Máquina" fill="#0080FF" fillOpacity={0.75} radius={[4,4,0,0]} maxBarSize={36} />
                            </BarChart>
                          </ResponsiveContainer>
                          <p className="text-[9px] text-gray-600 mt-1 text-center">
                            <span style={{color:'#00F0FF'}}>■ Cian</span> = Req. / hora &nbsp;·&nbsp;
                            <span style={{color:'#0080FF'}}>■ Azul</span> = Cap. Máquina
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>





                {[{ key: 'lavadoSecado', label: '⬡ Lavado y Secado', accent: 'border-[#00F0FF]/20', th: 'text-[#00F0FF]' }].map(({ key, label, accent, th }) => (
                  <div key={key} className={`rounded-2xl bg-[#0A0A0A] border ${accent} overflow-hidden shadow-xl`}>
                    <div className="px-5 py-3 border-b border-[#1A1A1A] bg-[#050505] flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white uppercase tracking-wider">{label}</h3>
                      <span className="text-[11px] text-gray-500">Rate diario: <strong className="text-white">{(key === 'lavadoSecado' ? totalLavadoReq : totalSecadoReq).toLocaleString('es-MX')}</strong> piezas/día</span>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead className="bg-[#111] border-b border-[#222]">
                          <tr>
                            {[
                              { label: 'Año',               key: 'sc_year'      },
                              { label: 'Hrs Base',           key: 'sc_hrsBase'   },
                              { label: 'Hrs Ef./Turno',      key: 'sc_hrsEf'     },
                              { label: 'Turnos',             key: 'sc_turnos'    },
                              { label: 'T. Disp. (h)',       key: 'sc_tDisp'     },
                              { label: 'Rate/Día',           key: 'sc_rateDia'   },
                              { label: 'Req./h',             key: 'sc_reqH'      },
                              { label: 'Máq. c/h',           key: 'sc_maqH'      },
                              { label: 'Déficit/Superávit',   key: 'sc_deficit'   },
                              { label: 'Cobertura %',        key: 'sc_cobertura' },
                              { label: 'Líneas Req.',        key: 'sc_lineas'    },
                            ].map(({ label, key }) => (
                              <th
                                key={key}
                                onClick={() => setInfoModal(key)}
                                className={`px-4 py-2.5 font-semibold ${th} uppercase tracking-wider cursor-pointer hover:text-white hover:bg-white/5 transition-all duration-200 select-none`}
                                title="Click para ver definición"
                              >
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#1A1A1A]">
                          {scenarioResults[key].map(row => (
                            <tr key={row.year} className="hover:bg-white/[0.02] transition-colors">
                              <td className="px-4 py-2.5 font-black text-white">{row.year}</td>
                              <td className="px-4 py-2.5 text-gray-400">{row.hrsBase}</td>
                              <td className="px-4 py-2.5 text-gray-400">{formatNumber(row.effectiveHoursPerShift, 2)}</td>
                              <td className="px-4 py-2.5 text-gray-400">{row.shifts}</td>
                              <td className="px-4 py-2.5 text-gray-300">{formatNumber(row.availableDailyTime, 2)}</td>
                              <td className="px-4 py-2.5 text-gray-300">{row.dailyRate.toLocaleString('es-MX')}</td>
                              <td className="px-4 py-2.5 font-bold text-yellow-400">{formatNumber(row.requiredPerHour, 1)}</td>
                              <td className="px-4 py-2.5 font-bold text-blue-400">{formatNumber(row.machineBoxesPerHour, 1)}</td>
                              <td className={`px-4 py-2.5 font-bold ${row.deficitOrSurplus >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {row.deficitOrSurplus >= 0 ? '+' : ''}{formatNumber(row.deficitOrSurplus, 1)}
                              </td>
                              <td className={`px-4 py-2.5 font-bold ${row.coverageRatio >= 1 ? 'text-green-400' : 'text-red-400'}`}>
                                {formatNumber(row.coverageRatio * 100, 1)}%
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-black ${row.requiredLines <= 1 ? 'bg-green-500/20 text-green-400' : row.requiredLines === 2 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-red-500/20 text-red-400'}`}>
                                  {row.requiredLines} L
                                </span>
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

          </div>
        </div>
      </div>

      {/* ── Barra de exportación flotante inferior ── */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-5 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-2xl bg-black/80 backdrop-blur-xl border border-white/10 shadow-2xl">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mr-1">Exportar</span>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition-all text-xs font-bold"
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
          <div className="w-full max-w-lg p-8 rounded-[32px] bg-white/5 border border-white/10 shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-black uppercase tracking-widest text-blue-400 flex items-center gap-3 border-b border-white/10 pb-5 mb-6">
              <Box className="w-6 h-6" /> {editingBoxId ? 'Editar Modelo de Caja' : 'Nuevo Modelo de Caja'}
            </h2>
            
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Nombre del Modelo</label>
                <input type="text" placeholder="Ej. Caja Agrícola Exportación" value={boxInput.name} onChange={(e) => handleBoxInputChange('name', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-400 outline-none" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Largo (cm)</label>
                  <input type="number" value={boxInput.l} onChange={(e) => handleBoxInputChange('l', Number(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-sm text-center text-white focus:border-blue-400 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Ancho (cm)</label>
                  <input type="number" value={boxInput.w} onChange={(e) => handleBoxInputChange('w', Number(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-sm text-center text-white focus:border-blue-400 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Alto (cm)</label>
                  <input type="number" value={boxInput.h} onChange={(e) => handleBoxInputChange('h', Number(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-3 text-sm text-center text-white focus:border-blue-400 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Gap (m)</label>
                  <input type="number" step="0.01" value={boxInput.gap} onChange={(e) => handleBoxInputChange('gap', Number(e.target.value))} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-400 outline-none" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Avance</label>
                  <select value={boxInput.advanceSide} onChange={(e) => handleBoxInputChange('advanceSide', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-400 outline-none">
                    <option value="length">Largo</option>
                    <option value="width">Ancho</option>
                    <option value="auto">Auto (Menor)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Color (ID)</label>
                  <input type="color" value={boxInput.color || '#3b82f6'} onChange={(e) => handleBoxInputChange('color', e.target.value)} className="w-full h-[46px] bg-black/50 border border-white/10 rounded-xl px-2 py-1 cursor-pointer focus:border-blue-400 outline-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Tipo de Máquina</label>
                  <select value={boxInput.maquina} onChange={(e) => handleBoxInputChange('maquina', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-400 outline-none">
                    <option value="lavado_secado">Lavado + Secado</option>
                    <option value="secado">Solo Secado</option>
                    <option value="no">Excluido / Otros</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">Grado de Suciedad</label>
                  <select value={boxInput.suciedad} onChange={(e) => handleBoxInputChange('suciedad', e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-400 outline-none">
                    <option value="Polvo">Polvo (Ligero)</option>
                    <option value="Grasa">Grasa (Medio)</option>
                    <option value="Aceite">Aceite (Pesado)</option>
                    <option value="Orgánico">Orgánico / Sangre</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="flex gap-4 pt-8">
              <button onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-xl text-sm font-bold text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">Cancelar</button>
              <button onClick={saveBox} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-400 hover:from-blue-500 hover:to-blue-300 text-white font-bold py-4 rounded-xl text-sm transition-all shadow-[0_0_20px_rgba(59,130,246,0.3)] flex items-center justify-center gap-2">
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
          <div className="w-full max-w-3xl rounded-[28px] bg-[#0A0A0A] border border-[#1E1E1E] shadow-2xl flex flex-col overflow-hidden" style={{maxHeight:'90vh'}}>
            {/* Header modal */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-[#1A1A1A] bg-[#060606]">
              <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-3" style={{color:'#00F0FF'}}>
                <Settings className="w-5 h-5" /> Configuración del Simulador
              </h2>
              <button onClick={() => setIsConfigOpen(false)} className="p-2 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"><X className="w-4 h-4" /></button>
            </div>

            {/* Tabs — paleta PANDORA: cyan · purple · blue · pink */}
            <div className="flex gap-1 px-7 pt-4 border-b border-[#1A1A1A]">
              {[
                {id:'maquina',     label:'⚙ Máquina',        color:'#00F0FF'},
                {id:'escenarios',  label:'📅 Escenarios',     color:'#8B5CF6'},
                {id:'reqs',        label:'📦 Requerimientos', color:'#0080FF'},
                {id:'tiempo',      label:'⏱ Tiempo',          color:'#EC4899'}
              ].map(t => (
                <button key={t.id} onClick={() => setConfigTab(t.id)}
                  style={configTab===t.id?{color:t.color,borderBottomColor:t.color,borderBottomWidth:'2px',backgroundColor:`${t.color}10`}:{}}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-t-lg transition-all border-b-2 border-transparent ${
                    configTab !== t.id ? 'text-gray-500 hover:text-gray-300' : ''
                  }`}>{t.label}</button>
              ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto flex-1 px-7 py-6 space-y-5">

              {/* TAB: Máquina */}
              {configTab === 'maquina' && (
                <div className="space-y-5">
                  <p className="text-[11px] text-gray-500">Parámetros físicos de las máquinas. Afectan el cálculo de capacidad real, residencia y cajas/h.</p>
                  {['lavadoSecado'].map(mk => {
                    const m = configDraft.machines[mk];
                    const label = 'Lavadora + Secadora';
                    return (
                      <div key={mk} className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#222] space-y-4">
                        <div className="text-xs font-black uppercase tracking-widest" style={{color: mk==='lavadoSecado'?'#00F0FF':'#8B5CF6'}}>◈ {label}</div>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {[['Vel. Máx (m/h)','maxSpeedMMin', v => v*60, v => v/60],
                            ['Long. Máquina (m)','machineLengthM',v=>v,v=>v],
                            ['Cap. Nominal (c/h)','nominalBoxesPerHour',v=>v,v=>v]
                          ].map(([lbl, field, toDisplay, fromDisplay]) => (
                            <div key={field} className="space-y-1">
                              <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{lbl}</label>
                              <input type="number" step="0.01"
                                value={+toDisplay(m[field]).toFixed(4)}
                                onChange={e => setConfigDraft(prev => {
                                  const d = JSON.parse(JSON.stringify(prev));
                                  d.machines[mk][field] = fromDisplay(Number(e.target.value));
                                  return d;
                                })}
                                className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#00F0FF] outline-none"
                              />
                            </div>
                          ))}
                          <div className="space-y-1">
                            <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Nombre Equipo</label>
                            <input type="text" value={m.machineName}
                              onChange={e => setConfigDraft(prev => { const d=JSON.parse(JSON.stringify(prev)); d.machines[mk].machineName=e.target.value; return d; })}
                              className="w-full bg-[#0A0A0A] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-sm text-white focus:border-[#00F0FF] outline-none"
                            />
                          </div>
                        </div>
                        {/* Derived preview */}
                        <div className="grid grid-cols-3 gap-3 mt-2">
                          {[['Cap/h',`${m.nominalBoxesPerHour} c/h`],['Cap/Día (2t×8h)',`${Math.round(m.nominalBoxesPerHour*2*8).toLocaleString('es-MX')} c`],['Cap/Mes (×26)',`${Math.round(m.nominalBoxesPerHour*2*8*26).toLocaleString('es-MX')} c`]].map(([k,v])=>(
                            <div key={k} className="p-3 rounded-xl bg-[#0A0A0A] border border-[#1A1A1A] text-center">
                              <div className="text-[9px] text-gray-600 uppercase font-bold mb-1">{k}</div>
                              <div className="text-sm font-black" style={{color:'#00F0FF'}}>{v}</div>
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
                  <p className="text-[11px] text-gray-500">Define las horas base, horas efectivas por turno, y número de turnos para cada año (Y1-Y5) en cada máquina.</p>
                  {['lavadoSecado'].map(mk => (
                    <div key={mk} className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#222]">
                      <div className="text-xs font-black uppercase tracking-widest mb-4" style={{color:'#8B5CF6'}}>◈ {configDraft.scenarios[mk].name}</div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b border-[#1E1E1E]">
                              {['Año','Hrs Base','Hrs Ef./Turno','Turnos','T.Disp/Día'].map(h=>(
                                <th key={h} className="px-3 py-2 text-left text-[10px] text-gray-500 uppercase font-bold tracking-wider">{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#1A1A1A]">
                            {configDraft.scenarios[mk].scenarios.map((row, i) => (
                              <tr key={row.year}>
                                <td className="px-3 py-2 font-black text-white">{row.year}</td>
                                {['hrsBase','effectiveHoursPerShift','shifts'].map(f=>(
                                  <td key={f} className="px-3 py-2">
                                    <input type="number" step="0.01" value={row[f]}
                                      onChange={e => updateScenarioRow(mk, i, f, Number(e.target.value))}
                                      className="w-24 bg-[#0A0A0A] border border-[#2A2A2A] rounded-lg px-2 py-1.5 text-white focus:border-[#00F0FF] outline-none text-xs"
                                    />
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-[#00F0FF] font-bold">
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
                  <p className="text-[11px] text-gray-500">Rate diario de producción que el cliente necesita procesar. Cambia el cálculo de Req/h y déficit en la tabla de escenarios.</p>
                  {['lavadoSecado'].map(mk => (
                    <div key={mk} className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#222] space-y-3">
                      <div className="text-xs font-black uppercase tracking-widest" style={{color:'#0080FF'}}>◈ {configDraft.scenarios[mk].name}</div>
                      <div className="grid grid-cols-2 gap-4 items-end">
                        <div className="space-y-1">
                          <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Rate Diario (cajas/día)</label>
                          <input type="number" value={configDraft.scenarios[mk].dailyRate}
                            onChange={e => setConfigDraft(prev => { const d=JSON.parse(JSON.stringify(prev)); d.scenarios[mk].dailyRate=Number(e.target.value); return d; })}
                            className="w-full bg-[#080808] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-lg font-black text-white focus:border-[#0080FF] outline-none"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="p-3 rounded-xl bg-[#080808] border border-[#1A1A1A] text-center">
                            <div className="text-[9px] text-gray-600 uppercase font-bold mb-1">Por Mes</div>
                            <div className="text-sm font-black" style={{color:'#0080FF'}}>{(configDraft.scenarios[mk].dailyRate * 26).toLocaleString('es-MX')}</div>
                          </div>
                          <div className="p-3 rounded-xl bg-[#080808] border border-[#1A1A1A] text-center">
                            <div className="text-[9px] text-gray-600 uppercase font-bold mb-1">Por Año</div>
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
                  <p className="text-[11px] text-gray-500">Factor de tiempo efectivo y parámetros de turno para el cálculo de capacidad diaria y mensual general.</p>
                  <div className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#222] space-y-4">
                    <div className="text-xs font-black uppercase tracking-widest" style={{color:'#EC4899'}}>◈ Parámetros Generales de Operación</div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[['Horas x Turno','hoursPerShift'],['Turnos x Día','shifts'],['Días x Mes','daysPerMonth']].map(([lbl,field])=>(
                        <div key={field} className="space-y-1">
                          <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{lbl}</label>
                          <input type="number" step="1" value={inputs[field]}
                            onChange={e => handleInputChange(field, Number(e.target.value))}
                            className="w-full bg-[#080808] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-sm font-black text-white focus:border-[#EC4899] outline-none"
                          />
                        </div>
                      ))}
                      <div className="space-y-1">
                        <label className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Factor Efic. (%)</label>
                        <input type="number" step="1" min="1" max="100"
                          value={inputs.efficiencyFactor ?? 100}
                          onChange={e => handleInputChange('efficiencyFactor', Number(e.target.value))}
                          className="w-full bg-[#080808] border border-[#2A2A2A] rounded-xl px-3 py-2.5 text-sm font-black text-white focus:border-[#EC4899] outline-none"
                        />
                      </div>
                    </div>
                    {/* Preview */}
                    <div className="grid grid-cols-3 gap-3 mt-2">
                      {[['Hrs Disponibles/Día', `${(inputs.hoursPerShift*(inputs.shifts||2)).toFixed(1)} h`],
                        ['Hrs Efectivas (×factor)', `${((inputs.hoursPerShift*(inputs.shifts||2))*(inputs.efficiencyFactor??100)/100).toFixed(2)} h`],
                        ['Días Op./Mes', `${inputs.daysPerMonth} días`]
                      ].map(([k,v])=>(
                        <div key={k} className="p-3 rounded-xl bg-[#080808] border border-[#1A1A1A] text-center">
                          <div className="text-[9px] text-gray-600 uppercase font-bold mb-1">{k}</div>
                          <div className="text-sm font-black" style={{color:'#EC4899'}}>{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

            </div>{/* end content */}

            {/* Footer */}
            <div className="flex items-center justify-between px-7 py-4 border-t border-[#1A1A1A] bg-[#060606]">
              <span className="text-[10px] text-gray-600">Los cambios se aplican al cerrar con Guardar.</span>
              <div className="flex gap-3">
                <button onClick={() => setIsConfigOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 transition-colors">Cancelar</button>
                <button onClick={saveConfig} className="px-6 py-2.5 rounded-xl text-xs font-bold text-black bg-[#00F0FF] hover:bg-[#00d4e0] transition-all shadow-[0_0_20px_rgba(0,240,255,0.3)]">Guardar Cambios</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Detalle de cálculo viabilidad */}
      {viabilityInfoModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
          onClick={() => setViabilityInfoModal(null)}>
          <div className="w-full max-w-md rounded-[24px] bg-[#0A0A0A] border border-[#2A2A2A] shadow-2xl p-7 relative"
            onClick={e => e.stopPropagation()}>
            <button onClick={() => setViabilityInfoModal(null)}
              className="absolute top-5 right-5 p-1.5 text-gray-500 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
            {/* Title */}
            <h3 className="text-base font-black uppercase tracking-widest text-yellow-400 mb-1 pr-8">
              {viabilityInfoModal.title}
            </h3>
            <p className="text-xs text-gray-400 mb-5 leading-relaxed border-b border-[#1A1A1A] pb-4">
              {viabilityInfoModal.formula}
            </p>
            {/* Steps */}
            <div className="space-y-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-2">Paso a paso con los valores actuales</div>
              {viabilityInfoModal.steps.map((step, i) => (
                <div key={i} className="flex gap-3 items-start">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-yellow-400/10 text-yellow-400 text-[10px] font-black flex items-center justify-center shrink-0">{i+1}</span>
                  <p className="text-sm text-white leading-relaxed">{step}</p>
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
            <button onClick={() => setInfoModal(null)} className="absolute top-5 right-5 p-1.5 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors">
              <X className="w-4 h-4" />
            </button>
            <h3 className={cn("text-lg font-black uppercase tracking-widest mb-2 pr-8", kpiInfo[infoModal].color)}>
              {kpiInfo[infoModal].title}
            </h3>
            <div className="space-y-4 text-sm text-gray-300 leading-relaxed mt-4">
              <p>{kpiInfo[infoModal].description}</p>
              <div className="p-4 rounded-xl bg-black/30 border border-white/5">
                <span className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1.5">Cómo se calcula</span>
                <p className="text-gray-400 italic text-xs leading-relaxed">{kpiInfo[infoModal].calculation}</p>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/10 flex justify-end">
              <button onClick={() => setInfoModal(null)} className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-white/10 hover:bg-white/20 transition-colors">Entendido</button>
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
          <div className="w-full max-w-sm p-6 rounded-[24px] bg-[#0c1328]/95 border border-[#11b5c9]/35 shadow-[0_0_50px_rgba(17,181,201,0.25)] text-center">
            <div className="w-16 h-16 border-4 border-[#11b5c9]/20 border-t-[#11b5c9] rounded-full animate-spin mx-auto mb-4" />
            <h3 className="text-lg font-bold text-white mb-2">Generando PDF de Alta Resolución</h3>
            <p className="text-[#6b8599] text-sm mb-4">Exportando el informe de 8 páginas completo en formato vectorial directamente.</p>
            <div className="bg-[#122033]/50 rounded-xl p-3 border border-white/5">
              <span className="text-xs text-[#11b5c9] font-bold uppercase tracking-widest block mb-1">Estado de Progreso</span>
              <span className="text-white font-mono text-sm font-semibold">{exportProgress}</span>
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
              <h3 className="text-xl font-black uppercase tracking-[0.2em] mb-2 text-white text-center">
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
                    className="w-full px-5 py-4 rounded-2xl bg-black/45 border border-white/20 text-white placeholder-gray-400 
                             focus:outline-none focus:border-[#00F0FF]/60 focus:shadow-[0_0_20px_rgba(0,240,255,0.25)] 
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
                           bg-[#00F0FF] hover:bg-[#00D0FF] shadow-[0_10px_20px_rgba(0,240,255,0.25)] 
                           hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                >
                  {pdfPendingAction ? 'Exportar e Iniciar Descarga' : 'Guardar Cambios'}
                </button>
                <button 
                  onClick={() => { setShowFileNameModal(false); setPdfPendingAction(false); }} 
                  className="w-full py-3 rounded-2xl text-[10px] font-bold uppercase tracking-widest text-white/60 
                           hover:text-white hover:bg-white/10 transition-all duration-300"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
