import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import ResponseRenderer from '@/components/beta/renderers/ResponseRenderer';
import { supabase } from '@/supabase';
import RyderReportModal from '@/components/ryder/RyderReportModal';
import { buildRyderReportData } from '@/utils/buildRyderReportData';


import { Activity, ArrowLeft, Bot, Box, Brain, ChevronLeft, ChevronRight, Download, Edit3, Eye, FileText, LayoutDashboard, Lock, Minus, Plus, Send, Settings, Table2, Trash2, Unlock, Loader2, X, Play, RotateCcw, Copy, Maximize2, Power, Calculator, EyeOff, FileDigit, GripVertical, AlertTriangle, Printer, Truck, BarChart2, CheckCircle2, Factory, Layers } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';
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
function compareScenarioAgainstMachine(box, machineKey, MACHINE_CONFIGS, CUSTOMER_SCENARIOS) {
  const machineConfig = MACHINE_CONFIGS[machineKey];
  const machineScenario = CUSTOMER_SCENARIOS[machineKey];
  if (!machineConfig || !machineScenario) return [];
  const machine = computeMachineCapacity(box, machineConfig);
  const scenarioRows = computeCustomerScenarioTable(machineScenario);
  return scenarioRows.map(row => {
    const deficitOrSurplus = machine.actualBoxesHr - row.requiredPerHour;
    const coverageRatio = row.requiredPerHour > 0 ? machine.actualBoxesHr / row.requiredPerHour : 0;
    const requiredLines = row.requiredPerHour > 0 ? Math.ceil(row.requiredPerHour / machine.actualBoxesHr) : 0;
    return { ...row, machineBoxesPerHour: machine.actualBoxesHr, deficitOrSurplus, coverageRatio, requiredLines };
  });
}

export default function RiderSimulatorPage() {
  const [inputs, setInputs] = useState({
    machineName: 'PLD-120 / PLD-140',
    nominalBoxes: 200,          // Capacidad nominal ofertada
    machineLength: 7.60,
    maxAdvance: 1.40,
    manualSpeed: 2.33,
    defaultGap: 0.10,
    calcMode: 'manual',
    shifts: 2,
    hoursPerShift: 8,
    daysPerMonth: 26
  });

  const [CUSTOMER_SCENARIOS, setCustomerScenarios] = useState(() => {
    // Sanitize: only keep lavadoSecado, drop any stale secado data from HMR state
    return { lavadoSecado: DEFAULT_SCENARIOS.lavadoSecado };
  });
  const [MACHINE_CONFIGS, setMachineConfigs] = useState(() => {
    return { lavadoSecado: DEFAULT_MACHINE_CONFIGS.lavadoSecado };
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
    const saved = parseFloat(localStorage.getItem('rider_physical_max_mh'));
    return isNaN(saved) ? 140 : saved;
  });
  const [editHrs, setEditHrs]           = useState(false);
  const [hrsDraft, setHrsDraft]         = useState(null); // [{year,effectiveHoursPerShift,shifts}]

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
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showCapModal, isConfigOpen, isModalOpen, infoModal, viabilityInfoModal, editPct, editingSpeed, editHrs]);

  const [nominalCapInfo, setNominalCapInfo] = useState(null); // { id, geom, label }
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportModalData, setReportModalData] = useState(null);
  const [showPdfMenu, setShowPdfMenu] = useState(false);
  const [customFileName, setCustomFileName] = useState('');

  const handleSetFileName = () => {
    const name = window.prompt("Nombre base para los archivos exportados (deja vacío para usar nombre por defecto):", customFileName);
    if (name !== null) setCustomFileName(name.trim());
  };

  const buildReport = () => buildRyderReportData({
    inputs, computedRows, scenarioResults, mixScenarioResults,
    CUSTOMER_SCENARIOS, MACHINE_CONFIGS, selectedRow, physicalMaxMH,
  });

  const openReportModal = () => {
    setReportModalData(buildReport());
    setShowReportModal(true);
    setShowPdfMenu(false);
  };

  const directExportPDF = async () => {
    setShowPdfMenu(false);
    const d = buildReport();
    const N = (v, dec = 0) => Number(v ?? 0).toLocaleString('es-MX', { minimumFractionDigits: dec, maximumFractionDigits: dec });

    const modelRows = d.modelTable.map(r =>
      `<tr><td style="padding:8px 10px;border-bottom:1px solid #dbe5ee;font-weight:800;color:#0b8ea0">${r.mod}</td>` +
      `<td style="padding:8px 10px;border-bottom:1px solid #dbe5ee">${r.nombre}</td>` +
      `<td style="padding:8px 10px;border-bottom:1px solid #dbe5ee">${N(r.capHora,1)}</td>` +
      `<td style="padding:8px 10px;border-bottom:1px solid #dbe5ee">${N(r.capDia)}</td>` +
      `<td style="padding:8px 10px;border-bottom:1px solid #dbe5ee">${r.reqDia!=null?N(r.reqDia):'—'}</td>` +
      `<td style="padding:8px 10px;border-bottom:1px solid #dbe5ee;color:${r.estado==='VIABLE'?'#16a34a':r.estado==='EXCEDE'?'#dc2626':'#6b7280'};font-weight:700">${r.estado==='VIABLE'?'✅':r.estado==='EXCEDE'?'❌':'—'} ${r.estado}</td></tr>`
    ).join('');

    const scenRows = d.lavadoSecadoParams.rows.map(r =>
      `<tr><td style="padding:7px 8px;border-bottom:1px solid #dbe5ee;font-weight:800;color:#0b8ea0">${r.year}</td>` +
      `<td style="padding:7px 8px;border-bottom:1px solid #dbe5ee">${r.hrsBase}</td>` +
      `<td style="padding:7px 8px;border-bottom:1px solid #dbe5ee">${N(r.hrsEfTurno,2)}</td>` +
      `<td style="padding:7px 8px;border-bottom:1px solid #dbe5ee">${r.turnos}</td>` +
      `<td style="padding:7px 8px;border-bottom:1px solid #dbe5ee">${N(r.tiempoDisponible,2)}</td>` +
      `<td style="padding:7px 8px;border-bottom:1px solid #dbe5ee">${N(r.reqHora,1)}</td>` +
      `<td style="padding:7px 8px;border-bottom:1px solid #dbe5ee">${N(r.capHora,1)}</td>` +
      `<td style="padding:7px 8px;border-bottom:1px solid #dbe5ee;color:${r.balance>=0?'#16a34a':'#dc2626'};font-weight:700">${r.balance>=0?'+':''}${N(r.balance,1)}</td>` +
      `<td style="padding:7px 8px;border-bottom:1px solid #dbe5ee;color:${r.cobertura>=100?'#16a34a':'#f59e0b'};font-weight:700">${N(r.cobertura,1)}%</td>` +
      `<td style="padding:7px 8px;border-bottom:1px solid #dbe5ee">${r.lineas}</td></tr>`
    ).join('');

    const conclusionCards = d.conclusions.map(c =>
      `<div style="border-radius:10px;padding:12px 14px;border:1px solid #dbe5ee;background:#fbfdff;border-left:5px solid ${c.type==='ok'?'#22c55e':c.type==='warn'?'#f59e0b':'#ef4444'};margin-bottom:9px">` +
      `<div style="font-weight:700;font-size:14px;color:#122033;margin-bottom:3px">${c.type==='ok'?'✅':c.type==='warn'?'⚠️':'❌'} ${c.title}</div>` +
      `<p style="margin:0;color:#4f6377;font-size:12px;line-height:1.5">${c.text}</p></div>`
    ).join('');

    // ── Build hidden pages ──────────────────────────────────────
    const root = document.createElement('div');
    root.style.cssText = 'position:fixed;left:-9999px;top:0;width:900px;z-index:-1;';
    
    // Page 1
    const p1 = document.createElement('div');
    p1.style.cssText = 'background:#fff;font-family:Segoe UI,Arial,sans-serif;color:#1f2a37;min-height:1100px;';
    p1.innerHTML = `
      <div style="background:linear-gradient(90deg,#0b8ea0,#11b5c9 55%,#6dd5e3);padding:22px 36px 18px;display:flex;justify-content:space-between;align-items:center">
        <div style="color:#fff;font-weight:800;font-size:20px;letter-spacing:2px">RYDER <span style="font-size:10px;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.3);border-radius:4px;padding:2px 8px;letter-spacing:1px">PANDORA 3.0 · ${d.meta.version}</span></div>
        <div style="color:rgba(255,255,255,.8);font-size:12px;font-weight:600">Reporte de Simulación Industrial</div>
      </div>
      <div style="padding:24px 36px;display:grid;grid-template-columns:1.2fr 1fr;gap:24px;align-items:start">
        <div>
          <div style="display:flex;align-items:center;gap:9px;margin-bottom:14px">
            <div style="width:4px;height:40px;background:linear-gradient(180deg,#11b5c9,#0b8ea0);border-radius:4px"></div>
            <div>
              <div style="font-size:9px;font-weight:800;color:#11b5c9;letter-spacing:3px;text-transform:uppercase;margin-bottom:2px">Informe Paramétrico de Simulación</div>
              <div style="font-size:32px;font-weight:900;color:#0f1c2e;line-height:1">SIMULACIÓN</div>
              <div style="font-size:32px;font-weight:900;color:#11b5c9;line-height:1">DE LÍNEA</div>
            </div>
          </div>
          <div style="display:inline-flex;align-items:center;gap:7px;background:#f0fbfd;border:1.5px solid #b2e8f0;border-radius:50px;padding:4px 14px;margin-bottom:14px">
            <div style="width:6px;height:6px;border-radius:50%;background:#11b5c9"></div>
            <span style="font-size:12px;font-weight:800;color:#0b8ea0">Horizonte ${d.meta.periodo}</span>
          </div>
          <p style="font-size:12px;color:#4d647a;line-height:1.55;margin:0 0 14px">${d.meta.subtitulo}</p>
          <div style="background:#f7fbfd;border:1px solid #dbe5ee;border-radius:9px;padding:10px 14px">
            <div style="font-size:11px;color:#122033;margin-bottom:4px"><span style="font-weight:700;color:#0b8ea0;min-width:65px;display:inline-block">Máquina</span>${d.meta.simulador}</div>
            <div style="font-size:11px;color:#122033;margin-bottom:4px"><span style="font-weight:700;color:#0b8ea0;min-width:65px;display:inline-block">Proyecto</span>${d.meta.proyecto}</div>
            <div style="font-size:11px;color:#122033"><span style="font-weight:700;color:#0b8ea0;min-width:65px;display:inline-block">Fecha</span>${d.meta.fecha}</div>
          </div>
        </div>
        <div style="background:linear-gradient(160deg,#f0fbfd,#eef6fa);border:1.5px solid #c2e8f2;border-radius:14px;padding:18px">
          <div style="font-size:9px;font-weight:800;color:#0b8ea0;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px">Vista Previa de Resultados</div>
          ${[['Vel. de Banda',`${N(d.kpis.velocidadBandaMph,1)} m/h`],['Capacidad Promedio',`${N(d.kpis.capacidadPromHora)} c/h`],['Req. Diario Total',`${N(d.kpis.requerimientoTotalDia)} cajas`],['Cobertura Y1',`${N(d.kpis.coberturaY1,1)}%`]].map(([l,v],i,a)=>`<div style="display:flex;justify-content:space-between;align-items:center;padding-bottom:10px;${i<a.length-1?'border-bottom:1px solid #d4edf5;margin-bottom:10px':''}"><div style="font-size:11px;color:#526678">${l}</div><div style="font-size:18px;font-weight:800;color:#0b8ea0">${v}</div></div>`).join('')}
        </div>
      </div>
      <div style="height:2px;background:#eef3f7;margin:0 36px"></div>
      <div style="padding:20px 36px">
        <h2 style="font-size:20px;margin:0 0 5px;color:#122033">Indicadores Clave de Operación</h2>
        <p style="margin:0 0 14px;color:#5f7286;font-size:12px">Resumen ejecutivo de velocidad, capacidad y cobertura inicial.</p>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px">
          ${[{v:N(d.kpis.velocidadBandaMph,1),l:'Vel. Banda (m/h)',h:`Máx: ${N(d.kpis.velocidadMaxMph)} m/h`},{v:N(d.kpis.capacidadPromHora),l:'Cap. Prom/h (c/h)',h:''},{v:N(d.kpis.capacidadDiaY1),l:'Cap. Día Y1 (cajas)',h:''},{v:N(d.kpis.requerimientoTotalDia),l:'Req. Total/Día',h:''}].map(k=>`<div style="background:linear-gradient(180deg,#fbfdff,#f3f8fc);border:1px solid #dbe5ee;border-radius:12px;padding:14px"><div style="font-size:26px;font-weight:800;color:#0b8ea0;line-height:1;margin-bottom:5px">${k.v}</div><div style="font-size:12px;font-weight:700;color:#122033">${k.l}</div>${k.h?`<div style="font-size:10px;color:#6b7280;margin-top:3px">${k.h}</div>`:''}</div>`).join('')}
        </div>
        <div style="background:linear-gradient(180deg,#fbfdff,#f3f8fc);border:1px solid #dbe5ee;border-radius:12px;padding:14px;max-width:200px">
          <div style="font-size:26px;font-weight:800;color:#0b8ea0;line-height:1;margin-bottom:5px">${N(d.kpis.coberturaY1,1)}%</div>
          <div style="font-size:12px;font-weight:700;color:#122033">Cobertura Y1</div>
        </div>
      </div>
      <div style="height:2px;background:#eef3f7;margin:0 36px"></div>
      <div style="padding:20px 36px">
        <h2 style="font-size:20px;margin:0 0 12px;color:#122033">Modelos de Contenedores Evaluados</h2>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr>${['Mod','Nombre','Cap c/h','Cap/Día','Req/Día','Estado'].map(h=>`<th style="background:#f1f8fb;color:#122033;font-size:10px;text-transform:uppercase;letter-spacing:.4px;padding:7px 9px;border-bottom:1px solid #dbe5ee;text-align:left;font-weight:700">${h}</th>`).join('')}</tr></thead>
          <tbody>${modelRows}</tbody>
        </table>
      </div>`;

    // Page 2
    const p2 = document.createElement('div');
    p2.style.cssText = 'background:#fff;font-family:Segoe UI,Arial,sans-serif;color:#1f2a37;min-height:1100px;';
    p2.innerHTML = `
      <div style="background:#0f1c2e;padding:12px 36px;display:flex;justify-content:space-between;align-items:center">
        <div style="color:rgba(255,255,255,.7);font-size:10px;font-weight:700;letter-spacing:1px">RYDER PANDORA 3.0</div>
        <div style="color:rgba(255,255,255,.5);font-size:10px">Página 2 de 2</div>
      </div>
      <div style="padding:32px 36px">
        <h2 style="font-size:20px;margin:0 0 5px;color:#122033">Lavado y Secado — Parámetros Y1–Y5</h2>
        <p style="font-size:11px;color:#6b7280;margin:0 0 10px">Ref: ${d.lavadoSecadoParams.referencia} · Rate base: ${N(d.lavadoSecadoParams.rateBase)} cajas/día</p>
        <table style="width:100%;border-collapse:collapse;font-size:11px">
          <thead><tr>${['Año','Hrs B','Ef/T','Turn','T.Disp','Req/h','Cap/h','Bal.','Cob.','Líneas'].map(h=>`<th style="background:#f1f8fb;color:#122033;font-size:10px;text-transform:uppercase;padding:6px 7px;border-bottom:1px solid #dbe5ee;text-align:left;font-weight:700;white-space:nowrap">${h}</th>`).join('')}</tr></thead>
          <tbody>${scenRows}</tbody>
        </table>
      </div>
      <div style="height:2px;background:#eef3f7;margin:0 36px"></div>
      <div style="padding:20px 36px">
        <h2 style="font-size:20px;margin:0 0 12px;color:#122033">Conclusiones del Informe</h2>
        ${conclusionCards}
        <p style="margin-top:18px;color:#9aabb8;font-size:10px;border-top:1px solid #e8eef4;padding-top:12px">Generado automáticamente · PANDORA 3.0 · RYDER Industrial Simulator · ${d.meta.fecha}</p>
      </div>`;

    root.appendChild(p1);
    root.appendChild(p2);
    document.body.appendChild(root);

    try {
      const [html2canvas, { default: jsPDF }] = await Promise.all([
        import('html2canvas').then(m => m.default),
        import('jspdf'),
      ]);

      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();

      for (let i = 0; i < 2; i++) {
        const pageNode = i === 0 ? p1 : p2;
        const canvas = await html2canvas(pageNode, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          width: 900,
        });

        if (i > 0) pdf.addPage();
        
        const imgData = canvas.toDataURL('image/jpeg', 0.98);
        const imgW  = pageW;
        const imgH  = (canvas.height * pageW) / canvas.width;
        
        pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH, '', 'FAST');
      }

      const defaultName = `RYDER_Informe_${d.meta.fecha.replace(/\//g, '-')}`;
      pdf.save(`${customFileName || defaultName}.pdf`);
    } finally {
      document.body.removeChild(root);
    }
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
    name: '',
    l: 120,
    w: 100,
    h: 85,
    gap: 0.10,
    advanceSide: 'length',
    color: '#3b82f6'
  });

  const [boxes, setBoxes] = useState([
    // ── LAVADO Y SECADO ──────────────────────────────────────────────────────
    { id:'ex0', label:'A', name:'Contenedor CHICO',       l:30.48, w:38.10, h:17.78, gap:0.095, advanceSide:'length', color:'#6b7280', maquina:'lavado_secado', suciedad:'Polvo',  included:true  },
    { id:'ex1', label:'B', name:'Contenedor MEDIANO',     l:60.96, w:38.10, h:17.78, gap:0.100, advanceSide:'length', color:'#8b5cf6', maquina:'lavado_secado', suciedad:'Polvo',  included:true  },
    { id:'ex2', label:'C', name:'Contenedor Rectangular', l:60.96, w:38.10, h:35.56, gap:0.080, advanceSide:'length', color:'#3b82f6', maquina:'lavado_secado', suciedad:'Polvo',  included:true  },
    // ── SOLO SECADO ──────────────────────────────────────────────────────────
    { id:'ex3', label:'D', name:'Contenedor Cuadrado',    l:60.96, w:55.88, h:35.56, gap:0.100, advanceSide:'length', color:'#10b981', maquina:'secado',        suciedad:'Grasa',  included:true  },
    // ── EXCLUIDOS ─────────────────────────────────────────────────────────────
    { id:'ex4', label:'E', name:'CONT-AIP-ABAT (bulk bote)', l:114.30, w:121.92, h:86.36, gap:0.097, advanceSide:'length', color:'#f59e0b', maquina:'no', suciedad:'Polvo', included:false },
    { id:'ex5', label:'F', name:'TAPA-AIP-ABAT (bulk bote)', l:114.30, w:121.92, h:12.70, gap:0.097, advanceSide:'length', color:'#ec4899', maquina:'no', suciedad:'Polvo', included:false },
    { id:'ex6', label:'G', name:'Tapas (separadores)',        l:0,      w:0,      h:0,     gap:0,     advanceSide:'length', color:'#94a3b8', maquina:'no', suciedad:'Polvo', included:false },
  ]);

  const [selectedId, setSelectedId] = useState(boxes[0]?.id || null);

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
    scrollToChatBottom();
  }, [chatMessages, isChatTyping]);

  const handleInputChange = (field, value) => {
    setInputs(prev => {
      const updated = { ...prev, [field]: value };
      if (field === 'manualSpeed' && updated.calcMode === 'manual') {
        updated.manualSpeed = Math.min(value, 140 / 60);
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
    localStorage.setItem('rider_physical_max_mh', String(clamped));
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
    setBoxInput({ name: '', l: 120, w: 100, h: 85, gap: 0.10, advanceSide: 'length', color: '#3b82f6' });
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
        label: nextLetter(boxes.length),
        name: boxInput.name || `Modelo ${nextLetter(boxes.length)}`,
        ...boxInput
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
    const updated = boxes.filter(b => b.id !== id).map((b, i) => ({ ...b, label: nextLetter(i) }));
    setBoxes(updated);
    if (selectedId === id) setSelectedId(updated[0]?.id || null);
  };

  // ── Req. Diario — valores oficiales pre-cargados ──
  const OFFICIAL_REQS = { A:1610, B:798, C:1064, D:574, E:82, F:82, G:0 };
  const LS_KEY = 'rider_daily_reqs_v2';
  const [dailyReqs, setDailyReqs] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      // Merge: stored values override official defaults
      return { ...OFFICIAL_REQS, ...stored };
    } catch { return OFFICIAL_REQS; }
  });
  const [reqLocked,  setReqLocked]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('rider_req_locked') || 'false'); } catch { return false; }
  });
  const [saveStatus, setSaveStatus] = useState('idle');
  const saveTimer = useRef(null);

  // Guardar en localStorage siempre que cambie dailyReqs
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(dailyReqs));
  }, [dailyReqs]);

  // Guardar estado del candado
  useEffect(() => {
    localStorage.setItem('rider_req_locked', JSON.stringify(reqLocked));
  }, [reqLocked]);

  // Backup a Supabase (best-effort, no bloquea si falla)
  const updateBoxRequirement = useCallback((label, reqDaily) => {
    if (reqLocked) return;  // Bloqueado — no permitir cambios
    setDailyReqs(prev => ({ ...prev, [label]: reqDaily }));
    setSaveStatus('saving');
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      try {
        await supabase
          .from('rider_daily_reqs')
          .upsert({ box_id: label, required_daily: reqDaily }, { onConflict: 'box_id' });
      } catch (_) {/* Supabase opcional */}
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    }, 600);
  }, [reqLocked]);

  // Computations
  const NOMINAL_CAP = 200; // Referencia nominal del equipo (solo etiqueta, NO limita el cálculo)

  const computedRows = useMemo(() => {
    return boxes.map(box => {
      let advance = box.l / 100;
      if (box.advanceSide === 'width') advance = box.w / 100;
      if (box.advanceSide === 'auto')  advance = Math.min(box.l / 100, box.w / 100);

      const pitch   = advance + box.gap;
      const speed   = inputs.calcMode === 'derive_nominal'
        ? (pitch * inputs.nominalBoxes) / 60
        : inputs.manualSpeed;

      const linearMh          = speed * 60;
      const geometricBoxesHr  = pitch > 0 ? linearMh / pitch : 0;
      // Cap. real = 100% geometrica — la banda define la capacidad, no un tope nominal
      const realBoxesHr       = geometricBoxesHr;
      const residenceMin      = speed > 0 ? inputs.machineLength / speed : 0;
      const inside            = pitch > 0 ? inputs.machineLength / pitch : 0;

      const boxesPerShift  = realBoxesHr * inputs.hoursPerShift;
      const boxesPerDay    = boxesPerShift * inputs.shifts;
      const boxesPerMonth  = boxesPerDay * (inputs.daysPerMonth || 26);
      const requiredDaily  = dailyReqs[box.label] ?? 0;
      const requiredHours  = realBoxesHr > 0 ? requiredDaily / realBoxesHr : 0;
      const totalHoursDay  = inputs.shifts * inputs.hoursPerShift;

      return {
        ...box,
        advance, pitch, speed, linearMh, geometricBoxesHr, realBoxesHr, residenceMin, inside,
        boxesPerShift, boxesPerDay, boxesPerMonth, requiredDaily, requiredHours, totalHoursDay
      };
    });
  }, [boxes, inputs, dailyReqs]);

  const selectedRow = computedRows.find(r => r.id === selectedId) || computedRows[0];
  const largestRow  = [...computedRows].sort((a,b) => b.advance - a.advance)[0];
  const currentSpeed = selectedRow?.speed ?? (140 / 60);

  // ── Grupos por tipo de máquina ──────────────────────────────────────────
  const lavadoRows   = computedRows.filter(r => r.maquina === 'lavado_secado' && r.included);
  const secadoRows   = computedRows.filter(r => r.maquina === 'secado'        && r.included);
  const excluidos    = computedRows.filter(r => !r.included || r.maquina === 'no');

  // ── Horas totales requeridas por grupo (agregado) ───────────────────────
  const totalHrsLavado = lavadoRows.reduce((s, r) => s + r.requiredHours, 0);
  const totalHrsSecado = secadoRows.reduce((s, r) => s + r.requiredHours, 0);

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
    return {
      lavadoSecado: compareScenarioAgainstMachine(selectedRow, 'lavadoSecado', MACHINE_CONFIGS, CUSTOMER_SCENARIOS),
    };
  }, [selectedRow, MACHINE_CONFIGS, CUSTOMER_SCENARIOS]);

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
    link.download = `${customFileName || 'RYDER_Simulador'}.csv`;
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
=== CONTEXTO DEL SIMULADOR RYDER ===
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
        projectContext: { type: 'simulator', name: 'RYDER', data: inputs }
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
    md.push(`# PANDORA 3.0 — Reporte Técnico RYDER Simulator`);
    md.push(`**Exportado:** ${ts}  |  **Modelo seleccionado:** ${selectedRow?.name ?? '—'}  |  **Ver:** 7.61\n`);
    md.push(`---`);
    md.push(`\n## CONTEXTO DEL SISTEMA`);
    md.push(`Este simulador calcula la capacidad operativa de una línea de lavado y secado industrial (tipo RYDER/PLD).`);
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
    md.push(`## 2. MODELOS DE CAJA EVALUADOS (${computedRows.length} modelos)`);
    md.push(`> **Fórmulas clave:**`);
    md.push(`> - Avance = min(largo, ancho) en metros (lado menor de la caja)`);
    md.push(`> - Paso (Pitch) = Avance + Gap`);
    md.push(`> - Cap. Geom. (cajas/h) = Velocidad (m/h) ÷ Pitch (m)`);
    md.push(`> - Residencia (min) = Longitud máquina ÷ Velocidad (m/min)`);
    md.push(`> - Cajas dentro = Longitud máquina ÷ Pitch`);
    md.push('');
    md.push(`| Mod | Nombre | L(cm) | A(cm) | H(cm) | Avance(m) | Gap(m) | Pitch(m) | Vel(m/h) | Cap.Geom(c/h) | Cap.Real(c/h) | Resid(min) | Dentro | Req.Diário | Req(h) |`);
    md.push(`|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
    computedRows.forEach(r => {
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
    computedRows.forEach(r => {
      md.push(`| ${r.label} — ${r.name} | ${r.requiredDaily.toLocaleString('es-MX')} | ${r.realBoxesHr.toFixed(1)} | ${r.requiredHours.toFixed(2)} h |`);
    });
    md.push('');

    // 6. Prompt para IA
    md.push(`---`);
    md.push(`## 🤖 INSTRUCCIONES PARA EVALUACIÓN POR IA`);
    md.push(`Por favor realiza una **evaluación técnica completa** de este reporte de simulación industrial. Analiza:`);
    md.push(``);
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
    lbl('RYDER', 12, 14);
    const rW = doc.getTextWidth('RYDER');
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
    const useP = Math.min(100,(speedMH/140*100));
    // Title (+30%: 8→10)
    text(...C.accent1); font('bold',10);
    lbl('VELOCIDAD DE LÍNEA  —  UTILIZACIÓN', 10, curY+5);
    // Subtitle (+30%: 7→9)
    text(...C.gray2); font('normal',9);
    lbl(`Banda: ${speedMH} m/h  |  Límite: 140 m/h`, 10, curY+12);

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
    const usedW = sbW * Math.min(1, speedMH/140);
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
    text(...C.accent1); font('bold',9); lbl('RYDER  —  Análisis de Escenarios Y1-Y5', 12, 9.5);
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
      lbl('PANDORA 3.0  |  RYDER Industrial Simulator  |  Confidencial', 12, H-2.5);
      lbl(`Página ${p} de ${pc}`, W-10, H-2.5, {align:'right'});
    }

    const defaultName = `RYDER_Analisis_${Date.now()}`;
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

    const defaultName = `RYDER_Simulacion_${Date.now()}`;
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
                RYDER
                <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] tracking-widest uppercase">Simulador Activo</span>
              </h1>
              <p className="text-sm text-gray-500 font-medium">Línea de lavado y secado para pallets/cajas plásticas (140 m/h max)</p>
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
            <button onClick={exportPDF} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 transition-all text-sm font-bold">
              <FileText className="w-4 h-4" /> PDF
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
                onClick={() => { handleInputChange('calcMode', 'manual'); handleInputChange('manualSpeed', Math.min(140/60, inputs.manualSpeed + 0.05)); }}
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
            const mixR     = selectedMixIds.length > 0 ? computedRows.filter(r => selectedMixIds.includes(r.id)) : computedRows;
            const avgCap   = mixR.length ? mixR.reduce((s,r) => s + r.realBoxesHr, 0) / mixR.length : 0;
            const y1Sc     = CUSTOMER_SCENARIOS.lavadoSecado.scenarios[0];
            const y1Efs    = y1Sc.effectiveHoursPerShift;
            const y1Shifts = y1Sc.shifts;
            const y1H      = y1Efs * y1Shifts;
            const capDay   = Math.round(avgCap * y1H);
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
                    {formatNumber(avgCap,1)} c/h × {formatNumber(y1H,1)} h (Y1)
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
                          <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Paso 1 — Velocidad promedio del mix</p>
                          <p className="text-xs text-gray-300">
                            Promedio de Cap. Real de los {mixR.length} modelo(s) en mix:
                          </p>
                          <div className="mt-1 space-y-0.5">
                            {mixR.map(r => (
                              <p key={r.id} className="text-[10px] text-gray-500">
                                &nbsp;&nbsp;{r.label}. {r.name} → <span className="text-white">{formatNumber(r.realBoxesHr,1)} c/h</span>
                              </p>
                            ))}
                          </div>
                          <p className="text-xs text-[#00F0FF] font-bold mt-2">
                            Promedio = {formatNumber(avgCap,2)} c/h
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
                            {formatNumber(avgCap,2)} c/h × {formatNumber(y1H,2)} h
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

            // Usa physicalMaxMH como denominador fijo — no cambia con el % operativo
            const maxMH = physicalMaxMH;
            const pct   = Math.min(100, Math.max(0, Math.round((inputs.manualSpeed * 60 / maxMH) * 100)));

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
                  onClick={() => setShowCapModal(true)}
                  title="Click para configurar velocidad"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black uppercase tracking-widest"
                      style={{ color: '#5A8FAA', textShadow: 'none' }}>
                      Carga de Máquina
                    </span>
                    <span
                      className="text-sm font-black cursor-pointer transition-all"
                      style={{ color: '#5AACCC', textShadow: 'none' }}
                      onClick={(e) => { e.stopPropagation(); setPctDraft(String(pct)); setEditPct(true); }}
                      title="Click para editar %"
                    >
                      {hoverLed !== null ? `${Math.round(((hoverLed + 1) / 20) * 100)}%` : `${pct}%`}
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
                      const isHover  = hoverLed !== null && i <= hoverLed;
                      const color    = getLedColor(i, isActive, isHover);
                      return (
                        <div
                          key={i}
                          title={`${Math.round(segPct)}% — ${(maxMH * segPct / 100).toFixed(1)} m/h`}
                          className="relative flex-1 cursor-pointer transition-all duration-75"
                          style={{
                            borderRadius: '2px 2px 1px 1px',
                            backgroundColor: color,
                            boxShadow: (isActive || isHover) ? getLedGlow(color) : 'none',
                            opacity: (!isActive && !isHover) ? 0.12 : 1,
                            transform: isHover ? 'scaleY(1.12)' : 'scaleY(1)',
                            transformOrigin: 'bottom',
                          }}
                          onMouseEnter={() => setHoverLed(i)}
                          onMouseLeave={() => setHoverLed(null)}
                          onClick={() => setOperatingPct(Math.round(((i + 1) / 20) * 100))}
                        >
                          {/* Highlight cúpula */}
                          <div className="absolute inset-0 pointer-events-none" style={{
                            borderRadius: '2px 2px 0 0',
                            background: getLedHighlight(isActive, isHover),
                          }} />
                        </div>
                      );
                    })}
                  </div>

                  {/* Hint hover */}
                  <div className={`text-[9px] text-right mt-1 transition-all duration-150 ${hoverLed !== null ? 'opacity-100' : 'opacity-0'}`}
                    style={{ color: '#5A8FAA' }}>
                    {hoverLed !== null ? `→ ${((maxMH * ((hoverLed + 1) / 20)).toFixed(1))} m/h` : '\u00a0'}
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
                          placeholder="ej. 140"
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
                  <option value="manual">Velocidad Fija (Max 140 m/h)</option>
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

            {/* Table */}
            <div className="rounded-2xl bg-[#0A0A0A] border border-[#1A1A1A] overflow-hidden shadow-xl flex flex-col">
              <div className="px-5 py-4 border-b border-[#1A1A1A] flex justify-between items-center bg-[#050505]">
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">Resultados de Simulación</h3>
                <div className="flex gap-3 text-xs">
                  <button onClick={clearBoxes} className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl transition-all" title="Borrar Todos">
                    <Trash2 className="w-4 h-4" />
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
                      <th className="px-3 py-3 font-semibold text-gray-400 text-center">Estado</th>
                      <th className="px-3 py-3 font-semibold text-gray-400 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A1A]">
                    {/* ── Group header: LAVADO Y SECADO ── */}
                    <tr><td colSpan={11} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest" style={{color:'#00F0FF', background:'rgba(0,240,255,0.04)', borderBottom:'1px solid rgba(0,240,255,0.12)'}}>⬡ Lavado y Secado — {lavadoRows.length} productos — Total req: {lavadoRows.reduce((s,r)=>s+r.requiredDaily,0).toLocaleString('es-MX')} pzas/día</td></tr>
                    {lavadoRows.map((r) => (
                      <tr key={r.id}
                        className={cn("transition-colors hover:bg-[#111] cursor-pointer", selectedId===r.id ? "bg-blue-500/5" : "")}
                        onClick={() => setSelectedId(r.id)}
                      >
                        <td className="px-3 py-3">
                          <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{backgroundColor: r.color||'#3b82f6',color:'#fff'}}>{r.label}</span>
                        </td>
                        <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:'rgba(0,240,255,0.08)',color:'#00F0FF',border:'1px solid rgba(0,240,255,0.2)'}}>Lav+Sec</span></td>
                        <td className="px-3 py-3 font-medium text-white text-sm">{r.name}</td>
                        <td className="px-3 py-3 text-gray-400 text-xs text-center">{r.l}×{r.w}×{r.h}</td>
                        <td className="px-3 py-3 text-gray-300 text-center text-xs">{formatNumber(r.linearMh,1)}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-bold text-blue-400">{formatNumber(r.realBoxesHr,1)}</span>
                        </td>
                        <td className="px-3 py-3">
                          <input type="number" value={dailyReqs[r.label]??''} placeholder="Req" readOnly={reqLocked}
                            onChange={(e) => updateBoxRequirement(r.label, Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            className={`w-20 bg-black border rounded-lg px-2 py-1 text-xs outline-none transition-colors text-center ${
                              reqLocked ? 'border-yellow-500/40 text-yellow-400/60 cursor-not-allowed' : 'border-[#333] focus:border-yellow-400 text-yellow-400'
                            }`} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          {(dailyReqs[r.label]??0)>0
                            ? <span className={`text-xs font-bold ${r.requiredHours > r.totalHoursDay ? 'text-red-400' : 'text-purple-400'}`}>{formatNumber(r.requiredHours,2)}h</span>
                            : <span className="text-gray-600 text-xs">-</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {(dailyReqs[r.label]??0)>0
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
                    <tr><td colSpan={11} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest" style={{color:'#8B5CF6', background:'rgba(139,92,246,0.04)', borderBottom:'1px solid rgba(139,92,246,0.12)'}}>⬡ Solo Secado — {secadoRows.length} productos — Total req: {secadoRows.reduce((s,r)=>s+r.requiredDaily,0).toLocaleString('es-MX')} pzas/día</td></tr>
                    {secadoRows.map((r) => (
                      <tr key={r.id}
                        className={cn("transition-colors hover:bg-[#111] cursor-pointer", selectedId===r.id ? "bg-purple-500/5" : "")}
                        onClick={() => setSelectedId(r.id)}
                      >
                        <td className="px-3 py-3">
                          <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black" style={{backgroundColor: r.color||'#8b5cf6',color:'#fff'}}>{r.label}</span>
                        </td>
                        <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold" style={{background:'rgba(139,92,246,0.08)',color:'#8B5CF6',border:'1px solid rgba(139,92,246,0.2)'}}>Secado</span></td>
                        <td className="px-3 py-3 font-medium text-white text-sm">{r.name}</td>
                        <td className="px-3 py-3 text-gray-400 text-xs text-center">{r.l}×{r.w}×{r.h}</td>
                        <td className="px-3 py-3 text-gray-300 text-center text-xs">{formatNumber(r.linearMh,1)}</td>
                        <td className="px-3 py-3 text-center">
                          <span className="font-bold text-purple-400">{formatNumber(r.realBoxesHr,1)}</span>
                        </td>
                        <td className="px-3 py-3">
                          <input type="number" value={dailyReqs[r.label]??''} placeholder="Req" readOnly={reqLocked}
                            onChange={(e) => updateBoxRequirement(r.label, Number(e.target.value))}
                            onClick={(e) => e.stopPropagation()}
                            className={`w-20 bg-black border rounded-lg px-2 py-1 text-xs outline-none transition-colors text-center ${
                              reqLocked ? 'border-yellow-500/40 text-yellow-400/60 cursor-not-allowed' : 'border-[#333] focus:border-yellow-400 text-yellow-400'
                            }`} />
                        </td>
                        <td className="px-3 py-3 text-center">
                          {(dailyReqs[r.label]??0)>0
                            ? <span className="text-xs font-bold text-purple-400">{formatNumber(r.requiredHours,2)}h</span>
                            : <span className="text-gray-600 text-xs">-</span>}
                        </td>
                        <td className="px-3 py-3 text-center">
                          {(dailyReqs[r.label]??0)>0
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

                    {/* ── Group header: EXCLUIDOS ── */}
                    {excluidos.length > 0 && (
                      <>
                        <tr><td colSpan={11} className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest" style={{color:'#666', background:'rgba(255,255,255,0.02)', borderBottom:'1px solid rgba(255,255,255,0.06)'}}>⊘ Excluidos de evaluación — no entran en lavado ni secado</td></tr>
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
                    const totalReq = computedRows.reduce((s, r) => s + (r.requiredDaily || 0), 0);
                    if (totalReq === 0) return null;
                    const bestY1 = scenarioResults.lavadoSecado[0];
                    const machCapDay = bestY1 ? bestY1.machineBoxesPerHour * bestY1.availableDailyTime : 0;
                    const lines = machCapDay > 0 ? Math.ceil(totalReq / machCapDay) : '?';
                    const covers = machCapDay >= totalReq;
                    return (
                      <tfoot>
                        <tr className="border-t-2 border-[#00F0FF]/20 bg-[#0A0A0A]">
                          <td colSpan={3} className="px-4 py-3 text-xs font-black uppercase tracking-widest" style={{color:'#00F0FF'}}>Total req. diario (todos los modelos)</td>
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
              const mixRows  = selectedMixIds.length > 0
                ? computedRows.filter(r => selectedMixIds.includes(r.id))
                : computedRows;
              const usingMix = selectedMixIds.length > 0;

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
                      <div className="text-2xl font-black text-white">{totalReq.toLocaleString('es-MX')}</div>
                      <div className="text-[9px] text-gray-500">{usingMix ? `cajas/día (${selectedMixIds.length} modelo${selectedMixIds.length>1?'s':''} en mix)` : 'cajas/día (suma todos)'}</div>
                    </div>
                    {/* KPI 2 — Cap. Máq./Día */}
                    <div onClick={() => setViabilityInfoModal({
                      title: 'Cap. Máq. / Día (Y1)',
                      formula: 'Promedio de Cap. Real/h de los modelos en el mix × Horas disponibles Y1. El promedio refleja el ritmo mixto real de producción.',
                      steps: [
                        `Modelos en mix: ${mixRows.map(r=>`${r.label} ${r.name} (${r.realBoxesHr.toFixed(1)} c/h)`).join(' | ')}`,
                        `Promedio cap/h = (${mixRows.map(r=>r.realBoxesHr.toFixed(1)).join(' + ')}) ÷ ${mixRows.length} = ${machCapHour} c/h`,
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
                  <div className="p-4 rounded-2xl bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-[#222] flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <Activity className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Líneas Req. — Lavado y Secado</div>
                      <div className="text-2xl font-black text-white">{worstLavado} <span className="text-xs text-gray-500 font-medium">línea(s) peor escenario</span></div>
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
                    const mixSelected = computedRows.filter(r => selectedMixIds.includes(r.id));
                    const mixTotalReq = mixSelected.reduce((s, r) => s + (r.requiredDaily || 0), 0);
                    const effectiveReq = mixSelected.length > 0 && mixTotalReq > 0 ? mixTotalReq : sc.dailyRate;
                    const usingMix = mixSelected.length > 0 && mixTotalReq > 0;

                    const pct = machineDailyBest > 0 ? Math.min(100, (machineDailyBest / effectiveReq) * 100) : 0;
                    return (

                      <div
                        key={`summary-${key}`}
                        className="group p-5 rounded-2xl bg-[#0C0C0C] border border-[#1E1E1E] space-y-4 cursor-default
                                   hover:border-[#00F0FF]/30 transition-all duration-300"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-black uppercase tracking-widest text-gray-400 group-hover:text-[#00F0FF] transition-colors duration-300">
                            ◈ {sc.name} — Resumen Diario
                          </h4>
                          <span className="text-[10px] text-gray-600">Modelo: {selectedRow?.name}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                          {/* Req. Diario — dinámico según mix */}
                          <div
                            onClick={() => setViabilityInfoModal({
                              title: `Req. Diario — ${sc.name}`,
                              formula: usingMix
                                ? 'Suma de los Req. Diario de los modelos seleccionados en el mix (círculos activos en la tabla).'
                                : 'Volumen de producción diario del cliente para esta línea (valor de configuración).',
                              steps: usingMix
                                ? [
                                    `Modelos en mix: ${mixSelected.map(r=>`${r.label} - ${r.name} (${(r.requiredDaily||0).toLocaleString('es-MX')} cajas)`).join(', ')}`,
                                    `Total mix = ${mixSelected.map(r=>r.requiredDaily||0).join(' + ')} = ${effectiveReq.toLocaleString('es-MX')} cajas/día`,
                                    `Req/h (Y1) = ${effectiveReq} ÷ ${bestRow?.availableDailyTime?.toFixed(2)} h = ${bestRow ? (effectiveReq / bestRow.availableDailyTime).toFixed(1) : '-'} c/h`,
                                    `Req/h (Y5) = ${effectiveReq} ÷ ${worstRow?.availableDailyTime?.toFixed(2)} h = ${worstRow ? (effectiveReq / worstRow.availableDailyTime).toFixed(1) : '-'} c/h`
                                  ]
                                : [
                                    `Dato del cliente para ${sc.name}: ${sc.dailyRate.toLocaleString('es-MX')} cajas/día`,
                                    `No hay modelos seleccionados en el mix → se usa el req. de configuración.`,
                                    `Req/h (Y1) = ${sc.dailyRate} ÷ ${bestRow?.availableDailyTime?.toFixed(2)} h = ${bestRow ? (sc.dailyRate / bestRow.availableDailyTime).toFixed(1) : '-'} c/h`,
                                    `Para activar el mix: haz click en los círculos (A, B, C…) de la tabla de modelos.`
                                  ]
                            })}
                            className={`p-3 rounded-xl border text-center cursor-pointer transition-all duration-200 ${
                              usingMix
                                ? 'bg-[#00F0FF]/5 border-[#00F0FF]/40 hover:border-[#00F0FF]/70'
                                : 'bg-[#141414] border-[#1E1E1E] hover:border-[#00F0FF]/40 hover:bg-[#00F0FF]/5'
                            }`}
                          >
                            <div className="flex items-center justify-center gap-1 mb-1">
                              <div className="text-[9px] text-gray-500 uppercase font-bold tracking-wider">Req. Diario</div>
                              {usingMix && (
                                <span className="text-[8px] font-black px-1.5 py-0.5 rounded-full" style={{backgroundColor:'#00F0FF', color:'#000'}}>MIX</span>
                              )}
                            </div>
                            <div className={`text-xl font-black transition-colors duration-300 ${usingMix ? 'text-[#00F0FF]' : 'text-white group-hover:text-[#00F0FF]'}`}>
                              {effectiveReq.toLocaleString('es-MX')}
                            </div>
                            <div className="text-[9px] text-gray-600">cajas/día{usingMix ? ` (${mixSelected.length} modelo${mixSelected.length>1?'s':''})` : ''}</div>
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
                        <button onClick={() => setSelectedMixIds([])} className="text-[10px] text-gray-500 hover:text-white transition-colors">Limpiar</button>
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
                      <span className="text-[11px] text-gray-500">Rate diario: <strong className="text-white">{CUSTOMER_SCENARIOS[key].dailyRate.toLocaleString('es-MX')}</strong> piezas/día</span>
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
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 hover:bg-red-500/20 text-red-400 transition-all text-xs font-bold"
          >
            <FileText className="w-3.5 h-3.5" /> PDF
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
          onClose={() => setShowReportModal(false)}
        />
      )}
    </div>
  );
}
