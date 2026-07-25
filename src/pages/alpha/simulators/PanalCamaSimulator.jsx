import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Download, FileSpreadsheet, FileText, Save, Eye, X,
  CheckCircle2, SlidersHorizontal, ChevronLeft, ChevronRight,
  Activity, Clock, Package, DollarSign, Image as ImageIcon, Trash2, Upload,
  Gauge, BarChart3, TrendingUp, Info, AlertTriangle, ArrowRight,
  Zap, Wrench, Users, Factory, Calculator, Disc, Calendar
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

export default function PanalCamaSimulator() {
  const navigate = useNavigate();
  const STORAGE_KEY = 'sim_panal_cama_inputs';
  const LOGO_KEY = 'sim_panal_cama_logo';
  const PRODUCT_IMG_KEY = 'sim_panal_cama_product_img';
  const MACHINE_IMG_KEY = 'sim_panal_cama_machine_img';
  
  const logoInputRef = useRef(null);
  const productImgInputRef = useRef(null);
  const machineImgInputRef = useRef(null);

  // ── ESTADOS DE PESTAÑAS, LOGO Y MODAL ─────────────────────────────────────
  const [activeTab, setActiveTab] = useState('portada'); // 'portada' | 'operacion' | 'analisis' | 'tablas' | 'capex_opex'
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);

  // ── ESTADOS DEL MODAL DE PARÁMETROS DE EXPORTACIÓN PDF ──────────────────────
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportPdfFileName, setExportPdfFileName] = useState('');
  const [exportClientName, setExportClientName] = useState('');
  const [exportFx, setExportFx] = useState(17.5);
  const [exportSalePrice, setExportSalePrice] = useState(4.70);
  const [isExporting, setIsExporting] = useState(false);

  const handleOpenExportModal = () => {
    const defaultName = `Reporte_Simulacion_Panal_Cama_${(inputs.clientName || 'Cliente').replace(/\s+/g, '_')}`;
    setExportPdfFileName(defaultName);
    setExportClientName(inputs.clientName || '');
    setExportFx(inputs.fx || 17.5);
    setExportSalePrice(inputs.salePrice || 4.70);
    setShowExportModal(true);
  };

  const handleConfirmExport = () => {
    const targetFileName = exportPdfFileName.trim() || `Reporte_Simulacion_Panal_Cama_${(exportClientName || 'Cliente').replace(/\s+/g, '_')}`;
    setInputs(prev => ({
      ...prev,
      clientName: exportClientName,
      fx: exportFx,
      salePrice: exportSalePrice
    }));
    setShowExportModal(false);
    setTimeout(() => {
      exportPDF(targetFileName);
    }, 150);
  };

  // Escuchar la tecla ESC para cerrar el visor de informe
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.key === 'Esc' || e.keyCode === 27) {
        setShowPreviewModal(false);
      }
    };
    if (showPreviewModal) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [showPreviewModal]);

  // Logo Personalizado Base64
  const [customLogo, setCustomLogo] = useState(() => {
    try {
      return localStorage.getItem(LOGO_KEY) || null;
    } catch (e) {
      return null;
    }
  });

  // Imagen Producto Portada Base64
  const [customProductImg, setCustomProductImg] = useState(() => {
    try {
      return localStorage.getItem(PRODUCT_IMG_KEY) || null;
    } catch (e) {
      return null;
    }
  });

  // Imagen Máquina Portada Base64
  const [customMachineImg, setCustomMachineImg] = useState(() => {
    try {
      return localStorage.getItem(MACHINE_IMG_KEY) || null;
    } catch (e) {
      return null;
    }
  });

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result;
        setCustomLogo(base64);
        try {
          localStorage.setItem(LOGO_KEY, base64);
        } catch (err) {}
        triggerToast('Logo corporativo cargado correctamente.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearLogo = () => {
    setCustomLogo(null);
    try {
      localStorage.removeItem(LOGO_KEY);
    } catch (e) {}
    triggerToast('Logo eliminado.');
  };

  const handleProductImgUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result;
        setCustomProductImg(base64);
        try {
          localStorage.setItem(PRODUCT_IMG_KEY, base64);
        } catch (err) {}
        triggerToast('Imagen de producto actualizada correctamente.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearProductImg = () => {
    setCustomProductImg(null);
    try {
      localStorage.removeItem(PRODUCT_IMG_KEY);
    } catch (e) {}
    triggerToast('Imagen de producto restablecida.');
  };

  const handleMachineImgUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const base64 = evt.target?.result;
        setCustomMachineImg(base64);
        try {
          localStorage.setItem(MACHINE_IMG_KEY, base64);
        } catch (err) {}
        triggerToast('Imagen de máquina portada actualizada correctamente.');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearMachineImg = () => {
    setCustomMachineImg(null);
    try {
      localStorage.removeItem(MACHINE_IMG_KEY);
    } catch (e) {}
    triggerToast('Imagen de máquina restablecida.');
  };

  // ── ENTRADAS EDITABLES ─────────────────────────────────────────────────────
  const defaultState = {
    clientName: 'EMILIO FUENTES',
    companyName: 'SMQ',
    machineName: 'MAP-1050',
    productName: 'Pañal cama 60 x 90 cm',
    salePrice: 4.70, // MXN antes de IVA
    ivaRate: 16,
    speed: 30, // pz/min nominal
    oee: 85, // %
    hoursShift: 8,
    shiftsDay: 2,
    daysMonth: 26,
    rawCost: 2.76, // MXN/pz sin IVA
    tapeLengthCm: 5,
    tapeSections: 2,
    tapeRollUsd: 4.90,
    tapeRollMeters: 200,
    operators: 2,
    wage: 8000,
    kwhPrice: 2.50,
    powerKw: 18,
    indirectUnit: 0.12,
    machineUsd: 82500,
    fx: 17.50,
    extraCivil: 0,
    capexFactor: 3, // % importacion/instalacion
    recoveryMonths: 36,
    maintenancePct: 3, // % anual sobre CAPEX
    depreciationYears: 10
  };

  const [inputs, setInputs] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return { ...defaultState, ...JSON.parse(saved) };
    } catch (e) {}
    return defaultState;
  });

  const handleChange = (field, value) => {
    setInputs(prev => ({
      ...prev,
      [field]: typeof value === 'number' ? (isNaN(value) ? 0 : value) : value
    }));
  };

  // ── MOTOR DE CÁLCULO ──────────────────────────────────────────────────────
  const calc = useMemo(() => {
    const salePrice = Number(inputs.salePrice ?? 4.70);
    const ivaRate = Number(inputs.ivaRate ?? 16);
    const speed = Number(inputs.speed ?? 30);
    const oee = Number(inputs.oee ?? 85);
    const hoursShift = Number(inputs.hoursShift ?? 8);
    const shiftsDay = Number(inputs.shiftsDay ?? 2);
    const daysMonth = Number(inputs.daysMonth ?? 26);
    const rawCost = Number(inputs.rawCost ?? 2.76);
    const tapeLengthCm = Number(inputs.tapeLengthCm ?? 5);
    const tapeSections = Number(inputs.tapeSections ?? 2);
    const tapeRollUsd = Number(inputs.tapeRollUsd ?? 4.90);
    const tapeRollMeters = Number(inputs.tapeRollMeters ?? 200);
    const operators = Number(inputs.operators ?? 2);
    const wage = Number(inputs.wage ?? 8000);
    const kwhPrice = Number(inputs.kwhPrice ?? 2.50);
    const powerKw = Number(inputs.powerKw ?? 18);
    const indirectUnit = Number(inputs.indirectUnit ?? 0.12);
    const machineUsd = Number(inputs.machineUsd ?? 82500);
    const fx = Number(inputs.fx ?? 17.50);
    const extraCivil = Number(inputs.extraCivil ?? 0);
    const capexFactor = Number(inputs.capexFactor ?? 3);
    const recoveryMonths = Number(inputs.recoveryMonths ?? 36);
    const maintenancePct = Number(inputs.maintenancePct ?? 3);
    const depreciationYears = Number(inputs.depreciationYears ?? 10);

    // Producción
    const realSpeedMin = speed * (oee / 100);
    const kpiHour = Math.round(realSpeedMin * 60); // 1,530 pz/h
    const hoursPerDay = hoursShift * shiftsDay;
    const dayPz = kpiHour * hoursPerDay; // 24,480 pz/día
    const kpiMonth = dayPz * daysMonth; // 636,480 pz/mes

    // Cintilla
    const tapeMetersPerPiece = (tapeLengthCm * tapeSections) / 100;
    const tapeCostUsdPerMeter = tapeRollMeters > 0 ? (tapeRollUsd / tapeRollMeters) : 0;
    const tapeCostMxnPerPiece = tapeMetersPerPiece * tapeCostUsdPerMeter * fx;

    // CAPEX
    const machineMxn = machineUsd * fx;
    const baseCapex = machineMxn + extraCivil;
    const capexTotal = baseCapex * (1 + (capexFactor / 100));

    // OPEX Mensual
    const rawMonthly = kpiMonth * rawCost;
    const tapeMonthly = kpiMonth * tapeCostMxnPerPiece;
    const totalOperators = operators * shiftsDay;
    const laborMonthly = totalOperators * wage;
    const totalHoursMonthly = hoursPerDay * daysMonth;
    const energyMonthly = totalHoursMonthly * powerKw * kwhPrice;
    const maintenanceAnnual = capexTotal * (maintenancePct / 100);
    const maintenanceMonthly = maintenanceAnnual / 12;
    const indirectMonthly = kpiMonth * indirectUnit;

    const opexMonthly = rawMonthly + tapeMonthly + laborMonthly + energyMonthly + maintenanceMonthly + indirectMonthly;
    const kpiOpexUnit = kpiMonth > 0 ? opexMonthly / kpiMonth : 0;

    // Recuperación CAPEX
    const capexMonthlyRecovery = recoveryMonths > 0 ? capexTotal / recoveryMonths : 0;
    const capexUnitRecovery = kpiMonth > 0 ? capexMonthlyRecovery / kpiMonth : 0;

    // Costo Total por Pieza
    const kpiTotalCostUnit = kpiOpexUnit + capexUnitRecovery;

    // Venta y Utilidades
    const netSale = salePrice;
    const priceWithIva = netSale * (1 + (ivaRate / 100));
    const profitPiece = netSale - kpiTotalCostUnit;
    const profitMonth = profitPiece * kpiMonth;
    const marginPct = netSale > 0 ? (profitPiece / netSale) * 100 : 0;

    // Punto de Equilibrio
    const totalMonthlyCost = opexMonthly + capexMonthlyRecovery;
    const breakEvenPz = netSale > 0 ? Math.ceil(totalMonthlyCost / netSale) : 0;

    // Viabilidad
    let statusText = 'Viable';
    let statusClass = 'good';
    if (profitPiece < 0) {
      statusText = 'No Viable';
      statusClass = 'bad';
    } else if (marginPct < 15) {
      statusText = 'Precaución';
      statusClass = 'warn';
    }

    // Depreciación
    const depreciationAnnual = capexTotal / (depreciationYears || 10);
    const depreciationMonthly = depreciationAnnual / 12;

    // Escenarios Operativos (1 turno vs 2 turnos)
    const calcScenarioShifts = (sShifts) => {
      const sHoursDay = hoursShift * sShifts;
      const sDayPz = kpiHour * sHoursDay;
      const sMonthPz = sDayPz * daysMonth;

      const sRaw = sMonthPz * rawCost;
      const sTape = sMonthPz * tapeCostMxnPerPiece;
      const sLabor = (operators * sShifts) * wage;
      const sEnergy = (sHoursDay * daysMonth) * powerKw * kwhPrice;
      const sMaint = maintenanceMonthly;
      const sIndir = sMonthPz * indirectUnit;

      const sOpexMonth = sRaw + sTape + sLabor + sEnergy + sMaint + sIndir;
      const sOpexUnit = sMonthPz > 0 ? sOpexMonth / sMonthPz : 0;
      const sCapexUnit = sMonthPz > 0 ? capexMonthlyRecovery / sMonthPz : 0;
      const sTotalUnit = sOpexUnit + sCapexUnit;
      const sProfitPiece = netSale - sTotalUnit;
      const sProfitMonth = sProfitPiece * sMonthPz;
      const cashFlowMonth = sProfitMonth + capexMonthlyRecovery;
      const paybackMonths = cashFlowMonth > 0 ? (capexTotal / cashFlowMonth).toFixed(2) : '-';

      return {
        shifts: sShifts,
        monthPz: sMonthPz,
        opexMonth: sOpexMonth,
        opexUnit: sOpexUnit,
        totalUnit: sTotalUnit,
        profitPiece: sProfitPiece,
        profitMonth: sProfitMonth,
        paybackMonths
      };
    };

    const scenario1Shift = calcScenarioShifts(1);
    const scenario2Shifts = calcScenarioShifts(2);

    // Tabla Recuperación Inversión (1, 2, 3 años)
    const recoveryTiers = [12, 24, 36].map((m, idx) => {
      const recM = capexTotal / m;
      const recUnit = kpiMonth > 0 ? recM / kpiMonth : 0;
      const totalU = kpiOpexUnit + recUnit;
      const profP = netSale - totalU;
      const profM = profP * kpiMonth;
      return { yearsLabel: `${idx + 1} año${idx > 0 ? 's' : ''}`, months: m, recM, recUnit, totalU, profP, profM };
    });

    // Depreciación Máquina (Año 1, 2, 3)
    const depreciationRows = [1, 2, 3].map(yr => {
      const bookValue = capexTotal - (depreciationAnnual * yr);
      return {
        yearLabel: `Año ${yr}`,
        annual: depreciationAnnual,
        monthly: depreciationMonthly,
        bookValue: Math.max(0, bookValue)
      };
    });

    const chartDataOpex = [
      { name: 'Materia Prima', valor: rawMonthly },
      { name: 'Cintilla', valor: tapeMonthly },
      { name: 'Mano de Obra', valor: laborMonthly },
      { name: 'Energía', valor: energyMonthly },
      { name: 'Mantenimiento', valor: maintenanceMonthly },
      { name: 'Indirectos', valor: indirectMonthly }
    ];

    return {
      kpiHour, dayPz, kpiMonth,
      tapeMetersPerPiece, tapeCostMxnPerPiece,
      capexTotal,
      rawMonthly, tapeMonthly, laborMonthly, energyMonthly, maintenanceMonthly, indirectMonthly,
      opexMonthly, kpiOpexUnit,
      capexMonthlyRecovery, capexUnitRecovery,
      kpiTotalCostUnit,
      netSale, priceWithIva, profitPiece, profitMonth, marginPct,
      breakEvenPz, statusText, statusClass,
      depreciationAnnual, depreciationMonthly,
      scenario1Shift, scenario2Shifts,
      recoveryTiers, depreciationRows,
      chartDataOpex
    };
  }, [inputs]);

  // Formatters
  const formatMxn = (val) => `$${Number(val || 0).toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  const formatNum = (val) => Number(val || 0).toLocaleString('es-MX');

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs));
      triggerToast('Configuración guardada correctamente.');
    } catch (e) {
      triggerToast('No se pudo guardar la configuración (cuota llena).');
    }
  };

  const scrollToPage = (pageId) => {
    const el = document.getElementById(pageId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Exportar Excel
  const exportCSV = () => {
    const data = [
      ["REPORTE PARAMÉTRICO DE SIMULACIÓN - PAÑAL CAMA MAP-1050"],
      ["Cliente", inputs.clientName],
      ["Fecha", new Date().toLocaleDateString('es-MX')],
      [],
      ["INDICADOR", "VALOR"],
      ["Velocidad Nominal", `${inputs.speed} pz/min`],
      ["OEE Real", `${inputs.oee}%`],
      ["Capacidad por Hora", `${formatNum(calc.kpiHour)} pz/h`],
      ["Producción Mensual", `${formatNum(calc.kpiMonth)} pz/mes`],
      ["CAPEX Total Estimado", formatMxn(calc.capexTotal)],
      ["OPEX Mensual Total", formatMxn(calc.opexMonthly)],
      ["Costo OPEX / Pieza", formatMxn(calc.kpiOpexUnit)],
      ["Recuperación CAPEX / Pieza", formatMxn(calc.capexUnitRecovery)],
      ["Costo Total / Pieza", formatMxn(calc.kpiTotalCostUnit)],
      ["Precio Venta Base (sin IVA)", formatMxn(calc.netSale)],
      ["Precio Venta Final (+16% IVA)", formatMxn(calc.priceWithIva)],
      ["Utilidad por Pieza", formatMxn(calc.profitPiece)],
      ["Utilidad Mensual", formatMxn(calc.profitMonth)],
      ["Margen Operativo", `${calc.marginPct.toFixed(2)}%`],
      ["Punto de Equilibrio Mensual", `${formatNum(calc.breakEvenPz)} pz`],
      ["Estado de Viabilidad", calc.statusText]
    ];

    const ws = XLSX.utils.aoa_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Panal_Cama_MAP1050");
    XLSX.writeFile(wb, `Simulacion_Panal_Cama_${inputs.clientName.replace(/\s+/g, '_')}.xlsx`);
    triggerToast('Reporte Excel descargado.');
  };

  // Exportar PDF 100% Idéntico al Visor utilizando HTML2Canvas
  const exportPDF = async (overrideFileName) => {
    if (isExporting) return;
    try {
      setIsExporting(true);
      triggerToast('Generando PDF idéntico al visor...');

      const wasModalOpen = showPreviewModal;
      if (!wasModalOpen) {
        setShowPreviewModal(true);
        // Esperar 600ms a que el DOM React se monte completamente
        await new Promise((resolve) => setTimeout(resolve, 600));
      } else {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      const scrollContainer = document.getElementById('report-modal-scroll-container');
      if (scrollContainer) {
        scrollContainer.scrollTop = 0;
      }

      const pageIds = [
        'report-cover-page',
        'report-page-1',
        'report-page-2',
        'report-page-3',
        'report-page-4'
      ];

      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      const pdfWidth = doc.internal.pageSize.getWidth();
      const pdfHeight = doc.internal.pageSize.getHeight();

      for (let i = 0; i < pageIds.length; i++) {
        const pageEl = document.getElementById(pageIds[i]);
        if (!pageEl) continue;

        pageEl.scrollIntoView({ block: 'start', behavior: 'instant' });
        await new Promise((res) => setTimeout(res, 80));

        // Capturar elemento DOM exacto del visor sin desplazamientos de scroll
        const canvas = await html2canvas(pageEl, {
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          backgroundColor: '#ffffff',
          x: 0,
          y: 0,
          scrollX: 0,
          scrollY: 0,
          windowWidth: 1280
        });

        const imgData = canvas.toDataURL('image/jpeg', 0.95);

        if (i > 0) {
          doc.addPage('a4', 'landscape');
        }

        doc.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      }

      if (!wasModalOpen) {
        setShowPreviewModal(false);
      }

      const nameToUse = (overrideFileName || exportPdfFileName || `Informe_Pandora_Panal_Cama_${(inputs.clientName || 'Cliente').replace(/\s+/g, '_')}`).trim();
      const finalFileName = nameToUse.toLowerCase().endsWith('.pdf') ? nameToUse : `${nameToUse}.pdf`;
      doc.save(finalFileName);
      triggerToast('Reporte PDF descargado exitosamente (100% idéntico al visor).');
    } catch (err) {
      console.error('Error al exportar PDF:', err);
      triggerToast('Error al generar el PDF. Por favor intente nuevamente.');
    } finally {
      setIsExporting(false);
    }
  };


  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans relative pb-16">
      
      {/* Elemento oculto de subida de Logo */}
      <input 
        type="file" 
        ref={logoInputRef}
        accept="image/*"
        onChange={handleLogoUpload}
        className="hidden"
      />

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#078896] text-white px-5 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-cyan-200" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* ── HEADER SUPERIOR (ESTILO DHL INDUSTRIAL LIGHT) ────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-[1700px] mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate('/alpha/simulators')}
              className="p-2.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-all"
              title="Volver a Simuladores"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <span className="text-[10px] font-black text-[#078896] uppercase tracking-widest block mb-0.5">
                PROYECTO PREDETERMINADO PANDORA
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight uppercase flex items-center gap-2 leading-tight">
                <span>SIMULACIÓN</span> <span className="text-[#12b9c5]">| PAÑAL CAMA MAP-1050</span>
              </h1>
              <p className="text-[11px] text-slate-500 font-bold uppercase tracking-wide flex items-center gap-2 mt-0.5">
                <span>CLIENTE: <strong className="text-[#078896]">{inputs.clientName}</strong></span>
              </p>
            </div>
          </div>

          {/* Botones de Acción Superiores */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            <button 
              onClick={() => logoInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shadow-xs transition-all"
              title="Subir Logo Corporativo para el Informe"
            >
              <Upload className="w-4 h-4 text-[#078896]" />
              {customLogo ? 'Cambiar Logo' : 'Subir Logo'}
            </button>

            {customLogo && (
              <button 
                onClick={handleClearLogo}
                className="p-2 rounded-xl bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                title="Eliminar Logo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button 
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#078896] hover:bg-[#078896]/90 text-white font-bold text-xs shadow-sm transition-all"
            >
              <Save className="w-4 h-4" />
              Guardar Configuración
            </button>

            <button 
              onClick={() => setShowPreviewModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-cyan-50 border border-cyan-300 text-[#078896] font-bold text-xs shadow-xs transition-all"
            >
              <Eye className="w-4 h-4" />
              Visualizar Informe
            </button>

            <button 
              onClick={handleOpenExportModal}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-600 font-bold text-xs shadow-xs transition-all"
            >
              <FileText className="w-4 h-4" />
              Informe PDF
            </button>

            <button 
              onClick={exportCSV}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-600 font-bold text-xs shadow-xs transition-all"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Excel
            </button>
          </div>

        </div>
      </header>

      {/* ── CONTENIDO PRINCIPAL (LAYOUT CON SIDEBAR Y TABS) ───────────────────────── */}
      <div className="max-w-[1700px] mx-auto px-4 sm:px-6 mt-6">
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          
          {/* ── SIDEBAR IZQUIERDO: VARIABLES EDITABLES ─────────────────────────── */}
          <aside className={`${sidebarOpen ? 'w-full lg:w-[320px] xl:w-[350px]' : 'w-full lg:w-16'} shrink-0 transition-all duration-300`}>
            <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm space-y-5 sticky top-24">
              
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#078896]" />
                  {sidebarOpen && <h2 className="text-sm font-black uppercase text-slate-900 tracking-wider">VARIABLES EDITABLES</h2>}
                </div>
                <button 
                  onClick={() => setSidebarOpen(!sidebarOpen)}
                  className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                  title={sidebarOpen ? "Colapsar Panel" : "Expandir Panel"}
                >
                  {sidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
              </div>

              {sidebarOpen && (
                <div className="space-y-5 text-xs max-h-[calc(100vh-200px)] overflow-y-auto pr-1">
                  
                  {/* SECCIÓN 1: METADATOS PROYECTO */}
                  <div className="space-y-3">
                    <h3 className="font-black text-[#078896] uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                      1. METADATOS DEL PROYECTO
                    </h3>
                    
                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Cliente</label>
                      <input 
                        type="text" 
                        value={inputs.clientName}
                        onChange={e => handleChange('clientName', e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Precio Venta / pz (MXN sin IVA)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={inputs.salePrice}
                        onChange={e => handleChange('salePrice', parseFloat(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">IVA Aplicable (%)</label>
                      <input 
                        type="number" 
                        value={inputs.ivaRate}
                        onChange={e => handleChange('ivaRate', parseFloat(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* SECCIÓN 2: PARÁMETROS PRODUCCIÓN */}
                  <div className="space-y-3 pt-2">
                    <h3 className="font-black text-[#078896] uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                      2. PARÁMETROS DE PRODUCCIÓN
                    </h3>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Velocidad Nominal (pz/min)</label>
                      <input 
                        type="number" 
                        value={inputs.speed}
                        onChange={e => handleChange('speed', parseFloat(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">OEE / Eficiencia Real (%)</label>
                      <input 
                        type="number" 
                        value={inputs.oee}
                        onChange={e => handleChange('oee', parseFloat(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">Horas/Turno</label>
                        <input 
                          type="number" 
                          value={inputs.hoursShift}
                          onChange={e => handleChange('hoursShift', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">Turnos/Día</label>
                        <input 
                          type="number" 
                          value={inputs.shiftsDay}
                          onChange={e => handleChange('shiftsDay', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Días Laborables / Mes</label>
                      <input 
                        type="number" 
                        value={inputs.daysMonth}
                        onChange={e => handleChange('daysMonth', parseFloat(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                      />
                    </div>
                  </div>

                  {/* SECCIÓN 3: COSTOS OPEX */}
                  <div className="space-y-3 pt-2">
                    <h3 className="font-black text-[#078896] uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                      3. COSTOS OPERATIVOS (OPEX)
                    </h3>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Materia Prima (MXN/pz sin IVA)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        value={inputs.rawCost}
                        onChange={e => handleChange('rawCost', parseFloat(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">Cintilla (cm)</label>
                        <input 
                          type="number" 
                          value={inputs.tapeLengthCm}
                          onChange={e => handleChange('tapeLengthCm', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">Secciones</label>
                        <input 
                          type="number" 
                          value={inputs.tapeSections}
                          onChange={e => handleChange('tapeSections', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">Operadores/Turno</label>
                        <input 
                          type="number" 
                          value={inputs.operators}
                          onChange={e => handleChange('operators', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">Sueldo/Mes (MXN)</label>
                        <input 
                          type="number" 
                          value={inputs.wage}
                          onChange={e => handleChange('wage', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">Energía ($/kWh)</label>
                        <input 
                          type="number" 
                          step="0.1"
                          value={inputs.kwhPrice}
                          onChange={e => handleChange('kwhPrice', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">Indirectos ($/pz)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={inputs.indirectUnit}
                          onChange={e => handleChange('indirectUnit', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* SECCIÓN 4: INVERSIÓN Y CAPEX */}
                  <div className="space-y-3 pt-2">
                    <h3 className="font-black text-[#078896] uppercase tracking-wider text-[11px] border-b border-slate-100 pb-1">
                      4. INVERSIÓN Y CAPEX
                    </h3>

                    <div className="space-y-1">
                      <label className="font-bold text-slate-600">Precio Máquina (USD)</label>
                      <input 
                        type="number" 
                        value={inputs.machineUsd}
                        onChange={e => handleChange('machineUsd', parseFloat(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">Tipo Cambio (MXN)</label>
                        <input 
                          type="number" 
                          step="0.01"
                          value={inputs.fx}
                          onChange={e => handleChange('fx', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">Importación (%)</label>
                        <input 
                          type="number" 
                          value={inputs.capexFactor}
                          onChange={e => handleChange('capexFactor', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">Recuperación (meses)</label>
                        <input 
                          type="number" 
                          value={inputs.recoveryMonths}
                          onChange={e => handleChange('recoveryMonths', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="font-bold text-slate-600">Mantenimiento (%)</label>
                        <input 
                          type="number" 
                          value={inputs.maintenancePct}
                          onChange={e => handleChange('maintenancePct', parseFloat(e.target.value))}
                          className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold focus:border-[#078896] focus:bg-white outline-none transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                </div>
              )}
            </div>
          </aside>

          {/* ── COLUMNA DERECHA: PESTAÑAS Y CONTENIDO ─────────────────────────── */}
          <main className="flex-1 w-full space-y-6">
            
            {/* BARRA DE NAVEGACIÓN POR PESTAÑAS (ESTILO DHL) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-1.5 shadow-xs flex items-center gap-1.5 overflow-x-auto">
              <button 
                onClick={() => setActiveTab('portada')}
                className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === 'portada' 
                    ? 'bg-[#142035] text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                1. PORTADA
              </button>

              <button 
                onClick={() => setActiveTab('operacion')}
                className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === 'operacion' 
                    ? 'bg-[#142035] text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                2. OPERACIÓN
              </button>

              <button 
                onClick={() => setActiveTab('analisis')}
                className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === 'analisis' 
                    ? 'bg-[#142035] text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                3. ANÁLISIS
              </button>

              <button 
                onClick={() => setActiveTab('tablas')}
                className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === 'tablas' 
                    ? 'bg-[#142035] text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                4. MÉTRICAS Y TABLAS
              </button>

              <button 
                onClick={() => setActiveTab('capex_opex')}
                className={`px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap ${
                  activeTab === 'capex_opex' 
                    ? 'bg-[#142035] text-white shadow-sm' 
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                5. CAPEX / OPEX
              </button>
            </div>

            {/* ── PESTAÑA 1: PORTADA ────────────────────────────────────────── */}
            {activeTab === 'portada' && (
              <div className="space-y-6">
                
                {/* DARK HERO BANNER */}
                <div className="bg-[#142035] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
                  
                  <div className="flex flex-col md:flex-row justify-between md:items-start gap-4 mb-6 relative z-10 border-b border-slate-700/60 pb-5">
                    <div>
                      <span className="text-[11px] font-black tracking-widest text-cyan-400 uppercase">INFORME TÉCNICO DE CAPACIDAD</span>
                      <h2 className="text-3xl sm:text-4xl font-black tracking-tight uppercase mt-1">
                        <span>SIMULACIÓN</span> <span className="text-[#12b9c5]">| PAÑAL CAMA MAP-1050</span>
                      </h2>
                      <p className="text-slate-300 font-bold text-sm mt-1">LÍNEA DE PRODUCCIÓN PAÑAL CAMA 60 X 90 CM</p>
                    </div>

                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-xs font-black tracking-wider uppercase self-start">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
                      PDF: ACTIVADO
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-xs relative z-10">
                    <div>
                      <span className="text-slate-400 font-bold uppercase block text-[10px]">CLIENTE</span>
                      <strong className="text-white font-black text-sm uppercase">{inputs.clientName}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase block text-[10px]">FECHA PROYECCIÓN</span>
                      <strong className="text-white font-black text-sm">{new Date().toLocaleDateString('es-MX')}</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase block text-[10px]">OEE EVALUADO</span>
                      <strong className="text-cyan-400 font-black text-sm">{inputs.oee}%</strong>
                    </div>
                    <div>
                      <span className="text-slate-400 font-bold uppercase block text-[10px]">ESTADO OPERATIVO</span>
                      <span className={`inline-block px-2.5 py-0.5 rounded-md font-black text-xs uppercase mt-0.5 ${
                        calc.statusClass === 'good' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
                        calc.statusClass === 'warn' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                        'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      }`}>
                        {calc.statusText}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TARJETAS DE MÉTRICAS EJECUTIVAS */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                  
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
                    <div className="flex justify-between items-center text-slate-500 text-xs font-bold">
                      <span>CAPACIDAD REAL AJUSTADA</span>
                      <Activity className="w-4 h-4 text-[#078896]" />
                    </div>
                    <div className="text-3xl font-black text-slate-900">{formatNum(calc.kpiHour)} <span className="text-xs font-bold text-slate-500">pz/h</span></div>
                    <p className="text-[11px] text-slate-400">Considerando OEE ({inputs.oee}%)</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
                    <div className="flex justify-between items-center text-slate-500 text-xs font-bold">
                      <span>PRODUCCIÓN DIARIA</span>
                      <Clock className="w-4 h-4 text-[#078896]" />
                    </div>
                    <div className="text-3xl font-black text-slate-900">{formatNum(calc.dayPz)} <span className="text-xs font-bold text-slate-500">pz/día</span></div>
                    <p className="text-[11px] text-slate-400">{inputs.shiftsDay} turnos ({inputs.hoursShift}h cada uno)</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
                    <div className="flex justify-between items-center text-slate-500 text-xs font-bold">
                      <span>PRODUCCIÓN MENSUAL</span>
                      <Package className="w-4 h-4 text-[#078896]" />
                    </div>
                    <div className="text-3xl font-black text-[#078896]">{formatNum(calc.kpiMonth)} <span className="text-xs font-bold text-slate-500">pz/mes</span></div>
                    <p className="text-[11px] text-slate-400">{inputs.daysMonth} días laborables/mes</p>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-1">
                    <div className="flex justify-between items-center text-slate-500 text-xs font-bold">
                      <span>COSTO TOTAL INTEGRADO</span>
                      <DollarSign className="w-4 h-4 text-[#078896]" />
                    </div>
                    <div className="text-3xl font-black text-slate-900">{formatMxn(calc.kpiTotalCostUnit)}</div>
                    <p className="text-[11px] text-slate-400">OPEX ({formatMxn(calc.kpiOpexUnit)}) + CAPEX ({formatMxn(calc.capexUnitRecovery)})</p>
                  </div>

                </div>

                {/* TARJETA DE VIABILIDAD Y MARGEN */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                    <div>
                      <span className="text-[10px] font-black text-[#078896] uppercase tracking-widest block mb-0.5">EVALUACIÓN FINANCIERA</span>
                      <h3 className="text-xl font-black text-slate-900 uppercase">
                        <span>VIABILIDAD</span> <span className="text-[#12b9c5]">| PROYECTADA</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-0.5">Evaluación sobre precio base de venta ({formatMxn(calc.netSale)} MXN sin IVA)</p>
                    </div>
                    <span className={`self-start sm:self-auto px-3 py-1 rounded-full text-xs font-black uppercase ${
                      calc.statusClass === 'good' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                      calc.statusClass === 'warn' ? 'bg-amber-100 text-amber-800 border border-amber-300' :
                      'bg-rose-100 text-rose-800 border border-rose-300'
                    }`}>
                      {calc.statusText}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden p-0.5 border border-slate-200">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        calc.statusClass === 'good' ? 'bg-[#078896]' :
                        calc.statusClass === 'warn' ? 'bg-amber-500' :
                        'bg-rose-500'
                      }`}
                      style={{ width: `${Math.max(0, Math.min(100, calc.marginPct))}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-bold block">Margen Operativo</span>
                      <strong className="text-lg font-black text-slate-900">{calc.marginPct.toFixed(2)}%</strong>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-bold block">Utilidad por Pieza</span>
                      <strong className="text-lg font-black text-emerald-600">{formatMxn(calc.profitPiece)}</strong>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-bold block">Utilidad Mensual Estimada</span>
                      <strong className="text-lg font-black text-emerald-600">{formatMxn(calc.profitMonth)}</strong>
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ── PESTAÑA 2: OPERACIÓN ──────────────────────────────────────── */}
            {activeTab === 'operacion' && (
              <div className="space-y-6">
                
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-[#078896] uppercase tracking-widest block mb-0.5">PARÁMETROS OPERATIVOS</span>
                    <h3 className="text-xl font-black text-slate-900 uppercase">
                      <span>CAPACIDAD</span> <span className="text-[#12b9c5]">| OPERATIVA Y EFICIENCIA</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 font-bold">Velocidad Nominal Máquina</span>
                      <div className="text-2xl font-black text-slate-900">{inputs.speed} pz/min</div>
                      <p className="text-[11px] text-slate-400">1,800 pz/h a 100% de eficiencia</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 font-bold">Velocidad Ajustada por OEE</span>
                      <div className="text-2xl font-black text-[#078896]">{(inputs.speed * inputs.oee / 100).toFixed(1)} pz/min</div>
                      <p className="text-[11px] text-slate-400">Considerando OEE del {inputs.oee}%</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 font-bold">Horas Operativas Mensuales</span>
                      <div className="text-2xl font-black text-slate-900">{inputs.hoursShift * inputs.shiftsDay * inputs.daysMonth} hrs/mes</div>
                      <p className="text-[11px] text-slate-400">{inputs.shiftsDay} turnos/día x {inputs.daysMonth} días</p>
                    </div>
                  </div>
                </div>

                {/* GRÁFICO OPEX */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-[#078896] uppercase tracking-widest block mb-0.5">ANÁLISIS GRÁFICO</span>
                    <h3 className="text-xl font-black text-slate-900 uppercase">
                      <span>DISTRIBUCIÓN</span> <span className="text-[#12b9c5]">| COSTOS OPEX MENSUALES</span>
                    </h3>
                  </div>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={calc.chartDataOpex} margin={{ top: 10, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value) => [formatMxn(value), 'Costo Mensual']} />
                        <Bar dataKey="valor" fill="#078896" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            )}

            {/* ── PESTAÑA 3: ANÁLISIS ───────────────────────────────────────── */}
            {activeTab === 'analisis' && (
              <div className="space-y-6">
                
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-[#078896] uppercase tracking-widest block mb-0.5">EVALUACIÓN COMPARATIVA</span>
                    <h3 className="text-xl font-black text-slate-900 uppercase">
                      <span>ANÁLISIS</span> <span className="text-[#12b9c5]">| ESCENARIOS (1 TURNO VS 2 TURNOS)</span>
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                          <th className="p-3 font-bold">Escenario Operativo</th>
                          <th className="p-3 font-bold text-right">Producción Mensual</th>
                          <th className="p-3 font-bold text-right">OPEX Mensual</th>
                          <th className="p-3 font-bold text-right">Costo OPEX / pz</th>
                          <th className="p-3 font-bold text-right">Costo Total / pz</th>
                          <th className="p-3 font-bold text-right">Utilidad Mensual</th>
                          <th className="p-3 font-bold text-right">Payback Estimado</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        <tr>
                          <td className="p-3 font-bold text-slate-900">1 Turno (8h / día)</td>
                          <td className="p-3 text-right">{formatNum(calc.scenario1Shift.monthPz)} pz</td>
                          <td className="p-3 text-right">{formatMxn(calc.scenario1Shift.opexMonth)}</td>
                          <td className="p-3 text-right">{formatMxn(calc.scenario1Shift.opexUnit)}</td>
                          <td className="p-3 text-right">{formatMxn(calc.scenario1Shift.totalUnit)}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">{formatMxn(calc.scenario1Shift.profitMonth)}</td>
                          <td className="p-3 text-right font-bold text-[#078896]">{calc.scenario1Shift.paybackMonths} meses</td>
                        </tr>
                        <tr className="bg-cyan-50/50">
                          <td className="p-3 font-bold text-[#078896]">2 Turnos (16h / día) [Base]</td>
                          <td className="p-3 text-right font-bold text-slate-900">{formatNum(calc.scenario2Shifts.monthPz)} pz</td>
                          <td className="p-3 text-right font-bold text-slate-900">{formatMxn(calc.scenario2Shifts.opexMonth)}</td>
                          <td className="p-3 text-right font-bold text-slate-900">{formatMxn(calc.scenario2Shifts.opexUnit)}</td>
                          <td className="p-3 text-right font-bold text-slate-900">{formatMxn(calc.scenario2Shifts.totalUnit)}</td>
                          <td className="p-3 text-right font-bold text-emerald-600">{formatMxn(calc.scenario2Shifts.profitMonth)}</td>
                          <td className="p-3 text-right font-bold text-[#078896]">{calc.scenario2Shifts.paybackMonths} meses</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* ── PESTAÑA 4: MÉTRICAS Y TABLAS ────────────────────────────────── */}
            {activeTab === 'tablas' && (
              <div className="space-y-6">
                
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                  <div className="bg-[#142035] text-white px-6 py-4">
                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block mb-0.5">DESGLOSE FINANCIERO</span>
                    <h3 className="text-xl font-black tracking-tight uppercase">
                      <span>MÉTRICAS</span> <span className="text-[#12b9c5]">| COMPONENTES OPEX</span>
                    </h3>
                  </div>
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                        <th className="p-3.5 font-bold">Componente Operativo</th>
                        <th className="p-3.5 font-bold text-right">Costo Mensual (MXN)</th>
                        <th className="p-3.5 font-bold text-right">Costo Unitario (MXN/pz)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 text-slate-800">
                      <tr>
                        <td className="p-3.5 font-medium">Materia Prima (sin IVA)</td>
                        <td className="p-3.5 text-right font-bold">{formatMxn(calc.rawMonthly)}</td>
                        <td className="p-3.5 text-right text-[#078896] font-bold">{formatMxn(inputs.rawCost)}</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-medium">Cintilla Adhesiva ({inputs.tapeSections} secciones)</td>
                        <td className="p-3.5 text-right font-bold">{formatMxn(calc.tapeMonthly)}</td>
                        <td className="p-3.5 text-right text-[#078896] font-bold">{formatMxn(calc.tapeCostMxnPerPiece)}</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-medium">Mano de Obra Directa ({inputs.operators * inputs.shiftsDay} op)</td>
                        <td className="p-3.5 text-right font-bold">{formatMxn(calc.laborMonthly)}</td>
                        <td className="p-3.5 text-right text-[#078896] font-bold">{formatMxn(calc.kpiMonth ? calc.laborMonthly/calc.kpiMonth : 0)}</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-medium">Energía Eléctrica ({inputs.powerKw} kW)</td>
                        <td className="p-3.5 text-right font-bold">{formatMxn(calc.energyMonthly)}</td>
                        <td className="p-3.5 text-right text-[#078896] font-bold">{formatMxn(calc.kpiMonth ? calc.energyMonthly/calc.kpiMonth : 0)}</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-medium">Mantenimiento Programado</td>
                        <td className="p-3.5 text-right font-bold">{formatMxn(calc.maintenanceMonthly)}</td>
                        <td className="p-3.5 text-right text-[#078896] font-bold">{formatMxn(calc.kpiMonth ? calc.maintenanceMonthly/calc.kpiMonth : 0)}</td>
                      </tr>
                      <tr>
                        <td className="p-3.5 font-medium">Indirectos y Empaque</td>
                        <td className="p-3.5 text-right font-bold">{formatMxn(calc.indirectMonthly)}</td>
                        <td className="p-3.5 text-right text-[#078896] font-bold">{formatMxn(inputs.indirectUnit)}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* ── PESTAÑA 5: CAPEX / OPEX ───────────────────────────────────── */}
            {activeTab === 'capex_opex' && (
              <div className="space-y-6">
                
                <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                  <div>
                    <span className="text-[10px] font-black text-[#078896] uppercase tracking-widest block mb-0.5">ESTRUCTURA DE INVERSIÓN</span>
                    <h3 className="text-xl font-black text-slate-900 uppercase">
                      <span>RESUMEN</span> <span className="text-[#12b9c5]">| INVERSIÓN INICIAL (CAPEX)</span>
                    </h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 font-bold block">Precio de la Máquina</span>
                      <strong className="text-xl font-black text-slate-900 block">${inputs.machineUsd.toLocaleString()} USD</strong>
                      <span className="text-slate-400">({formatMxn(inputs.machineUsd * inputs.fx)})</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-500 font-bold block">Importación e Instalación ({inputs.capexFactor}%)</span>
                      <strong className="text-xl font-black text-slate-900 block">{formatMxn((inputs.machineUsd * inputs.fx + inputs.extraCivil) * (inputs.capexFactor / 100))}</strong>
                      <span className="text-slate-400">Logística y arranque de planta</span>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                      <span className="text-slate-[#078896] font-bold block">CAPEX TOTAL INTEGRADO</span>
                      <strong className="text-xl font-black text-[#078896] block">{formatMxn(calc.capexTotal)}</strong>
                      <span className="text-slate-400">Amortizable a {inputs.recoveryMonths} meses</span>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </main>

        </div>
      </div>

      {/* ── MODAL DE VISUALIZACIÓN DE INFORME (FULL SCROLLABLE & LOGO CONTROL) ────── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-6xl h-[92vh] flex flex-col overflow-hidden animate-in fade-in duration-200">
            
            {/* Modal Sticky Control Header */}
            <div className="bg-[#142035] text-white px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-3">
                <FileText className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider">INFORME PARAMÉTRICO DE SIMULACIÓN PANDORA</h3>
                  <p className="text-[11px] text-slate-300">Cliente: {inputs.clientName} | MAP-1050</p>
                </div>
              </div>

              {/* Botones de salto rápido a páginas */}
              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 text-xs">
                <button 
                  onClick={() => scrollToPage('report-cover-page')}
                  className="px-3 py-1 rounded-lg font-bold text-cyan-400 hover:text-white hover:bg-slate-700 transition-all"
                >
                  Portada
                </button>
                <button 
                  onClick={() => scrollToPage('report-page-1')}
                  className="px-3 py-1 rounded-lg font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
                >
                  Pág 1
                </button>
                <button 
                  onClick={() => scrollToPage('report-page-2')}
                  className="px-3 py-1 rounded-lg font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
                >
                  Pág 2
                </button>
                <button 
                  onClick={() => scrollToPage('report-page-3')}
                  className="px-3 py-1 rounded-lg font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
                >
                  Pág 3
                </button>
                <button 
                  onClick={() => scrollToPage('report-page-4')}
                  className="px-3 py-1 rounded-lg font-bold text-slate-300 hover:text-white hover:bg-slate-700 transition-all"
                >
                  Pág 4
                </button>
              </div>

              <div className="flex items-center gap-2">
                <input 
                  type="file" 
                  ref={logoInputRef} 
                  onChange={handleLogoUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <input 
                  type="file" 
                  ref={productImgInputRef} 
                  onChange={handleProductImgUpload} 
                  accept="image/*" 
                  className="hidden" 
                />
                <input 
                  type="file" 
                  ref={machineImgInputRef} 
                  onChange={handleMachineImgUpload} 
                  accept="image/*" 
                  className="hidden" 
                />

                <button 
                  onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-bold text-xs border border-cyan-500/30 transition-all"
                  title="Subir o cambiar logo corporativo"
                >
                  <Upload className="w-4 h-4" />
                  {customLogo ? 'Cambiar Logo' : 'Subir Logo'}
                </button>

                <button 
                  onClick={handleOpenExportModal}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#078896] hover:bg-[#078896]/90 text-white font-bold text-xs shadow-xs transition-all"
                >
                  <Download className="w-4 h-4" />
                  Descargar PDF
                </button>

                <button 
                  onClick={() => setShowPreviewModal(false)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 text-xs font-bold"
                  title="Cerrar Previsualización (Presiona ESC)"
                >
                  <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded font-mono border border-slate-700">ESC</span>
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Area de scroll vertical de las 5 paginas */}
            <div id="report-modal-scroll-container" className="p-4 sm:p-8 overflow-y-auto bg-slate-200/80 flex-1 space-y-10">
              
              {/* ── PORTADA (PÁGINA DE CUBIERTA OFICIAL) ───────────────────── */}
              <div id="report-cover-page" className="bg-white rounded-2xl shadow-xl border border-slate-300 p-8 w-[1123px] h-[794px] mx-auto text-slate-900 flex flex-col justify-between relative overflow-hidden shrink-0">
                
                {/* Top Cyan Line */}
                <div className="absolute top-0 left-0 right-0 h-2 bg-[#00a8b5]"></div>

                {/* Top Content */}
                <div>
                  {/* Header Logo */}
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <span className="text-xs font-black text-[#00a8b5] uppercase tracking-widest block mb-1">
                        INFORME PARAMÉTRICO DE SIMULACIÓN
                      </span>
                    </div>

                    {customLogo ? (
                      <div className="relative group">
                        <img src={customLogo} alt="Logo" className="h-[115px] max-w-[600px] object-contain shrink-0" />
                        <button 
                          onClick={handleClearLogo} 
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-xs"
                          title="Quitar Logo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => logoInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-cyan-300 text-[#00a8b5] hover:bg-cyan-50 font-bold text-xs transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Subir Logo
                      </button>
                    )}
                  </div>

                  {/* Title & Product Card Row */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mt-2">
                    
                    {/* Left Titles & Model Info */}
                    <div className="lg:col-span-8 space-y-5">
                      
                      <div className="space-y-0.5">
                        <h1 className="text-4xl sm:text-[42px] font-black tracking-tight uppercase leading-none flex items-center gap-3">
                          <span className="text-slate-900">SIMULACIÓN</span>
                          <span className="text-[#00a8b5]">|</span>
                          <span className="text-[#00a8b5]">PAÑAL CAMA</span>
                        </h1>
                      </div>

                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        SISTEMA DE PRODUCCIÓN DE PROTECTOR ABSORBENTE · 60 × 90 CM
                      </p>

                      <div>
                        <span className="inline-block px-4 py-1.5 rounded-full border border-cyan-400 text-[#00a8b5] text-xs font-bold bg-cyan-50/40">
                          EVALUACIÓN DE CAPEX · OPEX · COSTO POR PIEZA
                        </span>
                      </div>

                      <div className="pt-4 space-y-1">
                        <span className="text-xs font-black text-slate-900 uppercase tracking-wide block">
                          LÍNEA AUTOMÁTICA
                        </span>
                        <h2 className="text-3xl font-black text-[#00a8b5] uppercase tracking-tight">
                          MAP — 1050
                        </h2>
                        <p className="text-xs text-slate-500 font-medium leading-relaxed max-w-lg pt-1">
                          Análisis financiero y operativo para la toma de decisiones.<br />
                          Producción, costos, recuperación de inversión y viabilidad proyectada.
                        </p>
                      </div>

                    </div>

                    {/* Right Product Card (Interactive Upload) */}
                    <div className="lg:col-span-4 flex justify-end">
                      <div className="bg-gradient-to-b from-[#eafafd] to-[#d6f2f7] border border-cyan-200/90 rounded-2xl p-4 shadow-xs flex flex-col justify-between items-center w-full max-w-[280px] h-[310px] relative overflow-hidden group">
                        
                        {/* Background Grid Accent */}
                        <div className="absolute inset-0 bg-[radial-gradient(#078896_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none"></div>

                        {/* Product Upload / Change Hover Controls */}
                        <div className="absolute top-2 right-2 z-20 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => productImgInputRef.current?.click()}
                            className="bg-[#078896] text-white p-1.5 rounded-lg shadow-sm hover:bg-[#078896]/90 transition-colors"
                            title="Cambiar imagen de producto"
                          >
                            <Upload className="w-3.5 h-3.5" />
                          </button>
                          {customProductImg && (
                            <button 
                              onClick={handleClearProductImg}
                              className="bg-rose-500 text-white p-1.5 rounded-lg shadow-sm hover:bg-rose-600 transition-colors"
                              title="Restablecer imagen por defecto"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Product Image */}
                        <div 
                          onClick={() => productImgInputRef.current?.click()}
                          className="relative z-10 my-auto flex items-center justify-center w-full h-44 cursor-pointer group/img"
                          title="Haz clic para cambiar la imagen del producto"
                        >
                          <img 
                            src={customProductImg || "/assets/panal_cama_product_card.png"} 
                            alt="Protector Absorbente" 
                            className="max-h-40 max-w-full object-contain drop-shadow-md transition-transform duration-300 group-hover/img:scale-105" 
                          />
                        </div>

                        {/* Product Card Label */}
                        <div className="bg-white/95 backdrop-blur-xs w-full p-2.5 rounded-xl border border-cyan-100/80 text-center shadow-2xs relative z-10">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">PRODUCTO TERMINADO</span>
                          <span className="text-xs font-black text-[#00a8b5] uppercase tracking-wide">PROTECTOR ABSORBENTE</span>
                        </div>

                      </div>
                    </div>

                  </div>

                  {/* Middle Machine Graphic Section (Interactive Upload - Full Edge-to-Edge) */}
                  <div className="w-full h-64 bg-slate-50 border border-slate-200 rounded-3xl shadow-xs relative overflow-hidden mt-4 group">
                    
                    {/* Machine Upload / Change Hover Controls */}
                    <div className="absolute top-3 right-3 z-20 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => machineImgInputRef.current?.click()}
                        className="bg-[#078896] text-white px-3 py-1.5 rounded-xl font-bold text-xs shadow-md hover:bg-[#078896]/90 transition-colors flex items-center gap-1.5"
                        title="Cambiar imagen de la máquina"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Cambiar Imagen Línea</span>
                      </button>
                      {customMachineImg && (
                        <button 
                          onClick={handleClearMachineImg}
                          className="bg-rose-500 text-white p-1.5 rounded-xl shadow-md hover:bg-rose-600 transition-colors"
                          title="Restablecer imagen por defecto"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div 
                      onClick={() => machineImgInputRef.current?.click()}
                      className="w-full h-full cursor-pointer"
                      title="Haz clic para cambiar la imagen de la línea autómata"
                    >
                      <img 
                        src={customMachineImg || "/assets/map_1050_machine_line.png"} 
                        alt="Línea Autómata MAP-1050" 
                        className="w-full h-full object-cover object-center" 
                      />
                    </div>
                  </div>

                </div>

                {/* Footer of Cover Page */}
                <div className="flex justify-end items-center border-t border-slate-200 pt-4 mt-6">
                  <div className="flex items-center gap-3">
                    <a href="https://www.smq.mx" target="_blank" rel="noreferrer" className="text-xs font-black text-slate-400 hover:text-[#078896] transition-colors">
                      www.smq.mx
                    </a>
                  </div>
                </div>

              </div>

              {/* ── PÁGINA 1 DE 5 ───────────────────────────────────────────── */}
              <div id="report-page-1" className="bg-white rounded-2xl shadow-xl border border-slate-300 p-7 w-[1123px] h-[794px] mx-auto text-slate-900 flex flex-col justify-between relative overflow-hidden shrink-0">
                
                <div className="space-y-6">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase border-b border-slate-100 pb-2">
                    <span className="text-[#078896]">RESUMEN EJECUTIVO</span>
                    {customLogo ? (
                      <div className="relative group">
                        <img src={customLogo} alt="Logo" className="h-[96px] max-w-[540px] object-contain shrink-0" />
                        <button 
                          onClick={handleClearLogo} 
                          className="absolute -top-2 -right-2 bg-rose-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                          title="Quitar Logo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ) : (
                      <button 
                        onClick={() => logoInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed border-cyan-300 text-[#078896] hover:bg-cyan-50 font-bold text-xs transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        Subir Logo
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-12 gap-8 items-start">
                    
                    {/* Columna Izquierda (2/3) */}
                    <div className="col-span-7 space-y-5">
                      <div>
                        <span className="text-[10px] font-black text-[#078896] uppercase tracking-wider">INFORME PARAMÉTRICO DE SIMULACIÓN</span>
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase leading-none mt-1">
                          SIMULACIÓN <span className="text-[#12b9c5]">| PAÑAL CAMA</span>
                        </h2>
                      </div>

                      <div>
                        <span className="text-[10px] font-black text-[#078896] uppercase tracking-wider block">CLIENTE</span>
                        <h3 className="text-2xl font-black text-slate-900 uppercase">{inputs.clientName}</h3>
                        <div className="inline-block mt-1 px-3 py-1 rounded-full border border-[#12b9c5] text-[#078896] text-[10px] font-bold">
                          Evaluación de CAPEX, OPEX y costo por pieza
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 leading-relaxed font-medium text-justify">
                        Simulador financiero y operativo para producción de protector absorbente / pañal de cama 60 x 90 cm en máquina MAP-1050, considerando materia prima puesta en bodega, operación por turnos, mano de obra, energía, mantenimiento, recuperación de CAPEX y precio promedio de venta al público.
                      </p>

                      {/* Box Metodológico */}
                      <div className="bg-[#eefbfd] border-l-4 border-[#12b9c5] p-4 rounded-r-xl text-[11px] text-slate-600 leading-relaxed font-medium text-justify">
                        <strong className="text-slate-900 font-bold block mb-1">Nota metodológica:</strong>
                        La capacidad se calcula con velocidad nominal, horas de turno, turnos por día, días laborables y OEE. El costo por pieza integra materia prima sin IVA, mano de obra directa, energía, mantenimiento, indirectos y recuperación mensual del CAPEX. El precio de venta capturado corresponde al valor antes de IVA (precio + IVA). Por lo tanto, los cálculos de utilidad, margen, punto de equilibrio y recuperación de la inversión utilizan íntegramente el precio base capturado; el IVA se muestra únicamente como impuesto adicional al cliente y no forma parte de la utilidad.
                      </div>

                      {/* Tabla Inferior Resumen */}
                      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs pt-2 border-t border-slate-100">
                        <div className="flex justify-between"><span className="text-slate-400 font-bold">Empresa</span><strong className="text-slate-900">{inputs.companyName}</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400 font-bold">Precio máquina</span><strong className="text-slate-900">${inputs.machineUsd.toLocaleString()} USD + IVA</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400 font-bold">Cliente</span><strong className="text-slate-900 uppercase">{inputs.clientName}</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400 font-bold">Velocidad de escenario</span><strong className="text-slate-900">{inputs.speed} pz/min</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400 font-bold">Máquina</span><strong className="text-slate-900">{inputs.machineName}</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400 font-bold">Potencia instalada</span><strong className="text-slate-900">{inputs.powerKw} kW</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400 font-bold">Producto</span><strong className="text-slate-900">{inputs.productName}</strong></div>
                        <div className="flex justify-between"><span className="text-slate-400 font-bold">Operadores</span><strong className="text-slate-900">{inputs.operators} por turno</strong></div>
                      </div>
                    </div>

                    {/* Columna Derecha Destacada (1/3) */}
                    <div className="col-span-5 bg-[#eefbfd] rounded-2xl p-5 space-y-4 flex flex-col justify-between h-full border border-cyan-100/90 shadow-2xs">

                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between border-b border-cyan-200/60 pb-2 gap-3">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block leading-tight">Capacidad Real / Hora</span>
                            <span className="text-[10px] text-slate-400 block leading-tight">Considerando OEE seleccionado</span>
                          </div>
                          <span className="text-lg font-black text-[#078896] shrink-0">{formatNum(calc.kpiHour)} pz/h</span>
                        </div>

                        <div className="flex items-center justify-between border-b border-cyan-200/60 pb-2 gap-3">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block leading-tight">Producción Mensual</span>
                            <span className="text-[10px] text-slate-400 block leading-tight">Piezas por mes ({inputs.shiftsDay} {inputs.shiftsDay === 1 ? 'turno' : 'turnos'})</span>
                          </div>
                          <span className="text-lg font-black text-[#078896] shrink-0">{formatNum(calc.kpiMonth)} pz/mes</span>
                        </div>

                        <div className="flex items-center justify-between border-b border-cyan-200/60 pb-2 gap-3">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block leading-tight">Costo OPEX</span>
                            <span className="text-[10px] text-slate-400 block leading-tight">Sin IVA, antes de CAPEX</span>
                          </div>
                          <span className="text-lg font-black text-[#078896] shrink-0">${calc.kpiOpexUnit.toFixed(2)} mx/pz</span>
                        </div>

                        <div className="flex items-center justify-between border-b border-cyan-200/60 pb-2 gap-3">
                          <div>
                            <span className="text-xs font-bold text-slate-900 block leading-tight">Costo Total</span>
                            <span className="text-[10px] text-slate-400 block leading-tight">OPEX + recuperación CAPEX</span>
                          </div>
                          <span className="text-lg font-black text-[#078896] shrink-0">${calc.kpiTotalCostUnit.toFixed(2)} mx/pz</span>
                        </div>

                        {/* Precio de Venta Destacado en Naranja */}
                        <div className="flex items-center justify-between border border-orange-200/80 bg-orange-50/60 p-2 rounded-xl gap-3">
                          <div>
                            <span className="text-xs font-black text-[#ff5500] block leading-tight">Precio de Venta</span>
                            <span className="text-[10px] text-orange-600/80 font-bold block leading-tight">Precio al público (sin IVA)</span>
                          </div>
                          <span className="text-lg font-black text-[#ff5500] shrink-0">${calc.netSale.toFixed(2)} mx/pz</span>
                        </div>

                        {/* Utilidad Mensual Destacada en Verde */}
                        <div className="flex items-center justify-between border border-emerald-200/80 bg-emerald-50/60 p-2 rounded-xl gap-3">
                          <div>
                            <span className="text-xs font-black text-emerald-800 block leading-tight">Utilidad Mensual</span>
                            <span className="text-[10px] text-emerald-600/80 font-bold block leading-tight">Utilidad estimada neta mensual</span>
                          </div>
                          <span className="text-lg font-black text-emerald-600 shrink-0">{formatMxn(calc.profitMonth)}</span>
                        </div>
                      </div>

                      <div className="space-y-2 pt-2">
                        <h4 className="text-lg font-black text-slate-900">Viabilidad Proyectada</h4>
                        <p className="text-xs font-bold text-slate-600">
                          Margen operativo: {calc.marginPct.toFixed(2)}% | Utilidad: {formatMxn(calc.profitPiece)} por pieza
                        </p>
                        <div className="w-full bg-cyan-100 h-2.5 rounded-full overflow-hidden">
                          <div className="bg-[#078896] h-full rounded-full" style={{ width: `${Math.max(5, Math.min(100, calc.marginPct))}%` }} />
                        </div>
                      </div>

                    </div>

                  </div>
                </div>

                {/* Footer de Página */}
                <div className="flex justify-between items-center text-[10px] font-bold border-t border-slate-200 pt-3 text-slate-400 mt-6">
                  <div className="flex items-center gap-2">
                    <a href="https://www.smq.mx" target="_blank" rel="noreferrer" className="text-[#078896] hover:underline font-black">
                      www.smq.mx
                    </a>
                    <span>|</span>
                    <span>PANDORA 3.0 SIMULADOR PARAMÉTRICO</span>
                  </div>
                  <span className="font-black text-[#078896]">PÁGINA 1 DE 4</span>
                </div>

              </div>

              {/* ── PÁGINA 2 DE 4 ───────────────────────────────────────────── */}
              <div id="report-page-2" className="bg-white rounded-2xl shadow-xl border border-slate-300 p-7 w-[1123px] h-[794px] mx-auto text-slate-900 flex flex-col justify-between relative overflow-hidden shrink-0">
                
                <div className="space-y-6">
                  {/* Header de Página con Logo */}
                  <div className="flex justify-between items-center text-[10px] font-black uppercase border-b border-slate-100 pb-2">
                    <span className="text-[#078896]">PARÁMETROS Y RESULTADOS</span>
                    {customLogo && (
                      <img src={customLogo} alt="Logo" className="h-[96px] max-w-[540px] object-contain shrink-0" />
                    )}
                  </div>

                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] font-black text-[#078896] uppercase tracking-widest block mb-0.5">CONFIGURACIÓN DEL SIMULADOR</span>
                      <h2 className="text-4xl font-black text-slate-900 tracking-tight uppercase leading-none mt-1">
                        <span>PARÁMETROS</span> <span className="text-[#12b9c5]">| DE OPERACIÓN</span>
                      </h2>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Modifica los datos y el simulador recalcula automáticamente.</span>
                  </div>

                  {/* Banner de Flujo de Proceso (4 Pasos Conectados) */}
                  <div className="grid grid-cols-4 gap-3 items-center">
                    {/* Badge 1: PROYECTO */}
                    <div className="bg-[#008b99] text-white rounded-2xl p-3 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <FileText className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-black text-[11px] uppercase tracking-wider">PROYECTO</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-white/70" />
                    </div>

                    {/* Badge 2: CAPACIDAD Y OPERACIÓN */}
                    <div className="bg-[#3bbac7] text-white rounded-2xl p-3 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <Gauge className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-black text-[11px] uppercase tracking-wider leading-tight">CAPACIDAD Y OPERACIÓN</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-white/70" />
                    </div>

                    {/* Badge 3: COSTOS OPERATIVOS */}
                    <div className="bg-[#8cc600] text-white rounded-2xl p-3 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <DollarSign className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-black text-[11px] uppercase tracking-wider leading-tight">COSTOS OPERATIVOS</span>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-white/70" />
                    </div>

                    {/* Badge 4: INVERSIÓN Y CICLO DE VIDA */}
                    <div className="bg-[#ff5500] text-white rounded-2xl p-3 flex items-center justify-between shadow-xs">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <BarChart3 className="w-3.5 h-3.5 text-white" />
                        </div>
                        <span className="font-black text-[10px] uppercase tracking-wider leading-tight">INVERSIÓN Y CICLO DE VIDA</span>
                      </div>
                    </div>
                  </div>

                  {/* Grid de 4 Columnas Verticales de Parámetros */}
                  <div className="grid grid-cols-4 gap-3.5 text-xs">
                    
                    {/* Columna 1: PROYECTO */}
                    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-cyan-200/80 pb-2.5">
                          <div className="w-7 h-7 rounded-xl bg-cyan-100 flex items-center justify-center text-[#008b99]">
                            <FileText className="w-4 h-4" />
                          </div>
                          <h3 className="font-black text-[#008b99] text-xs uppercase tracking-wider">
                            PROYECTO
                          </h3>
                        </div>
                        <div className="space-y-3.5">
                          <div>
                            <span className="text-slate-500 font-bold block text-[11px]">Cliente</span>
                            <strong className="text-slate-900 text-sm block mt-0.5 uppercase">{inputs.clientName}</strong>
                          </div>
                          <div className="border-t border-slate-200/60 pt-2.5">
                            <span className="text-slate-500 font-bold block text-[11px]">Precio de venta por pieza</span>
                            <strong className="text-slate-900 text-sm block mt-0.5">{formatMxn(inputs.salePrice)} MXN + IVA</strong>
                          </div>
                          <div className="border-t border-slate-200/60 pt-2.5">
                            <span className="text-slate-500 font-bold block text-[11px]">IVA aplicable</span>
                            <strong className="text-slate-900 text-sm block mt-0.5">{inputs.ivaRate}%</strong>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Info Box */}
                      <div className="bg-cyan-50 border border-cyan-200/80 p-3 rounded-xl flex items-start gap-2.5 text-[10px] text-cyan-900 leading-snug shadow-xs">
                        <div className="w-6 h-6 rounded-full bg-[#008b99] text-white flex items-center justify-center shrink-0 mt-0.5">
                          <Info className="w-3.5 h-3.5" />
                        </div>
                        <span>La utilidad se calcula sobre el ingreso neto sin IVA.</span>
                      </div>
                    </div>

                    {/* Columna 2: CAPACIDAD Y OPERACIÓN */}
                    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-cyan-200/80 pb-2.5">
                          <div className="w-7 h-7 rounded-xl bg-cyan-100 flex items-center justify-center text-[#3bbac7]">
                            <Gauge className="w-4 h-4" />
                          </div>
                          <h3 className="font-black text-[#008b99] text-xs uppercase tracking-wider">
                            CAPACIDAD Y OPERACIÓN
                          </h3>
                        </div>
                        <div className="space-y-2 divide-y divide-slate-100">
                          <div className="flex justify-between items-center py-1">
                            <span className="text-slate-600 font-medium">Velocidad nominal</span>
                            <strong className="text-slate-900">{inputs.speed} pz/min</strong>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-slate-600 font-medium">OEE / eficiencia real</span>
                            <strong className="text-slate-900">{inputs.oee}%</strong>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-slate-600 font-medium">Horas por turno</span>
                            <strong className="text-slate-900">{inputs.hoursShift} h</strong>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-slate-600 font-medium">Turnos por día</span>
                            <strong className="text-slate-900">{inputs.shiftsDay}</strong>
                          </div>
                          <div className="flex justify-between items-center py-1">
                            <span className="text-slate-600 font-medium">Días laborables por mes</span>
                            <strong className="text-slate-900">{inputs.daysMonth}</strong>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Callout Box Producción Estimada */}
                      <div className="bg-[#eefbfd] border border-cyan-200 p-3 rounded-2xl text-center space-y-1">
                        <div className="w-9 h-9 rounded-full bg-[#008b99] text-white flex items-center justify-center mx-auto mb-1 shadow-sm">
                          <TrendingUp className="w-4 h-4" />
                        </div>
                        <span className="text-[10px] font-bold text-slate-600 block">Producción estimada:</span>
                        <span className="text-xl font-black text-[#008b99] block leading-none">{formatNum(calc.kpiMonth)}</span>
                        <span className="text-[9px] font-black text-cyan-800 tracking-wider uppercase block">pz/mes</span>
                      </div>
                    </div>

                    {/* Columna 3: COSTOS OPERATIVOS */}
                    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-lime-200 pb-2.5">
                          <div className="w-7 h-7 rounded-xl bg-lime-100 flex items-center justify-center text-[#8cc600]">
                            <DollarSign className="w-4 h-4" />
                          </div>
                          <h3 className="font-black text-[#8cc600] text-xs uppercase tracking-wider">
                            COSTOS OPERATIVOS
                          </h3>
                        </div>
                        <div className="space-y-1.5 divide-y divide-slate-100 text-[11px]">
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Materia prima sin IVA</span>
                            <strong className="text-slate-900">{formatMxn(inputs.rawCost)}/pz</strong>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Largo por sección</span>
                            <strong className="text-slate-900">{inputs.tapeLengthCm} cm</strong>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Secciones por pañal</span>
                            <strong className="text-slate-900">{inputs.tapeSections}</strong>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Costo por rollo</span>
                            <strong className="text-slate-900">USD ${inputs.tapeRollUsd.toFixed(2)}</strong>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Longitud por rollo</span>
                            <strong className="text-slate-900">{inputs.tapeRollMeters} m</strong>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Operadores por turno</span>
                            <strong className="text-slate-900">{inputs.operators}</strong>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Sueldo por operador</span>
                            <strong className="text-slate-900">{formatMxn(inputs.wage)}</strong>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Costo energía</span>
                            <strong className="text-slate-900">{formatMxn(inputs.kwhPrice)}/kWh</strong>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Indirectos/empaque</span>
                            <strong className="text-slate-900">{formatMxn(inputs.indirectUnit)}/pz</strong>
                          </div>
                        </div>
                      </div>


                    </div>

                    {/* Columna 4: INVERSIÓN Y CICLO DE VIDA */}
                    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-4">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2 border-b border-orange-200 pb-2.5">
                          <div className="w-7 h-7 rounded-xl bg-orange-100 flex items-center justify-center text-[#ff5500]">
                            <BarChart3 className="w-4 h-4" />
                          </div>
                          <h3 className="font-black text-[#ff5500] text-xs uppercase tracking-wider leading-tight">
                            INVERSIÓN Y CICLO DE VIDA
                          </h3>
                        </div>
                        <div className="space-y-1.5 divide-y divide-slate-100 text-[11px]">
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Precio máquina</span>
                            <strong className="text-slate-900">USD ${inputs.machineUsd.toLocaleString()}</strong>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Tipo de cambio</span>
                            <strong className="text-slate-900">${inputs.fx.toFixed(2)} MXN/USD</strong>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Obra civil / extras</span>
                            <strong className="text-slate-900">{formatMxn(inputs.extraCivil)}</strong>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Importación e instalación</span>
                            <strong className="text-slate-900">{inputs.capexFactor}%</strong>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Recuperación CAPEX</span>
                            <strong className="text-slate-900">{inputs.recoveryMonths} meses</strong>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Mantenimiento anual</span>
                            <strong className="text-slate-900">{inputs.maintenancePct}%</strong>
                          </div>
                          <div className="flex justify-between items-center py-0.5">
                            <span className="text-slate-600 font-medium">Depreciación</span>
                            <strong className="text-slate-900">{inputs.depreciationYears} años</strong>
                          </div>
                        </div>
                      </div>

                      {/* Bottom Horizon Timeline */}
                      <div className="space-y-2 bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs">
                        <span className="text-[10px] font-bold text-slate-700 block text-center uppercase tracking-wider">Horizonte de recuperación</span>
                        <div className="relative pt-2 pb-1 px-1">
                          <div className="absolute top-3 left-2 right-2 h-1 bg-slate-200" />
                          <div className="relative flex justify-between items-center text-[9px] font-bold text-slate-500">
                            <div className="flex flex-col items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 z-10" />
                              <span>0</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 z-10" />
                              <span>12</span>
                            </div>
                            <div className="flex flex-col items-center gap-1">
                              <span className="w-2.5 h-2.5 rounded-full bg-slate-400 z-10" />
                              <span>24m</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                </div>

                {/* Footer de Página con SMQ.mx */}
                <div className="flex justify-between items-center text-[10px] font-bold border-t border-slate-200 pt-2 text-slate-400 mt-2">
                  <div className="flex items-center gap-2">
                    <a href="https://www.smq.mx" target="_blank" rel="noreferrer" className="text-[#00a8b5] hover:underline font-black">
                      www.smq.mx
                    </a>
                    <span>|</span>
                    <span>PANDORA 3.0 SIMULADOR PARAMÉTRICO</span>
                  </div>
                  <span className="font-black text-[#00a8b5]">PÁGINA 2 DE 4</span>
                </div>

              </div>

              {/* ── PÁGINA 3 DE 4 ───────────────────────────────────────────── */}
              <div id="report-page-3" className="bg-white rounded-2xl shadow-xl border border-slate-300 p-6 w-[1123px] h-[794px] mx-auto text-slate-900 flex flex-col justify-between relative overflow-hidden shrink-0">
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-[10px] font-black uppercase border-b border-slate-100 pb-2">
                    <span className="text-[#00a8b5]">OPEX E INDICADORES</span>
                    {customLogo && (
                      <img src={customLogo} alt="Logo" className="h-[96px] max-w-[540px] object-contain shrink-0" />
                    )}
                  </div>

                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] font-black text-[#00a8b5] uppercase tracking-widest block mb-0.5">Escenario base · {inputs.shiftsDay} {inputs.shiftsDay === 1 ? 'turno diario' : 'turnos diarios'} · Valores antes de IVA</span>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tight uppercase leading-none mt-1">
                        <span>RESULTADOS</span> <span className="text-[#00a8b5]">| EJECUTIVOS</span>
                      </h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-5 text-xs">
                    
                    {/* Panel Izquierdo: ESTRUCTURA OPEX */}
                    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2.5 border-b border-cyan-200/80 pb-2">
                          <div className="w-7 h-7 rounded-full bg-[#00a8b5] text-white flex items-center justify-center shadow-xs">
                            <DollarSign className="w-3.5 h-3.5 text-white" />
                          </div>
                          <h3 className="font-black text-[#00a8b5] text-xs uppercase tracking-wider">
                            ESTRUCTURA OPEX
                          </h3>
                        </div>

                        {/* Encabezado de Columnas */}
                        <div className="flex items-center justify-between text-[10px] font-black uppercase text-slate-400 px-1 border-b border-slate-200/60 pb-1">
                          <span>COMPONENTE OPEX</span>
                          <div className="flex gap-6">
                            <span>MENSUAL</span>
                            <span className="text-[#00a8b5]">MXN/PIEZA</span>
                          </div>
                        </div>

                        {/* Filas con Iconos Circulares y Barras de Progresión */}
                        <div className="space-y-2">
                          
                          {/* Fila 1: Materia Prima */}
                          <div className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-xl bg-cyan-50 border border-cyan-200/80 text-[#00a8b5] flex items-center justify-center shrink-0 shadow-2xs">
                                <Package className="w-3.5 h-3.5 stroke-[2.2]" />
                              </div>
                              <span className="text-slate-700 font-medium">Materia prima</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-24 bg-slate-200/60 h-2 rounded-full overflow-hidden hidden sm:block">
                                <div className="bg-[#00a8b5] h-full rounded-full" style={{ width: `${Math.min(100, (calc.rawMonthly / (calc.opexMonthly || 1)) * 100)}%` }} />
                              </div>
                              <strong className="text-slate-900 w-24 text-right">{formatMxn(calc.rawMonthly)}</strong>
                              <strong className="text-[#00a8b5] w-12 text-right">{formatMxn(inputs.rawCost)}</strong>
                            </div>
                          </div>

                          {/* Fila 2: Cintilla Adhesiva */}
                          <div className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-xl bg-cyan-50 border border-cyan-200/80 text-[#00a8b5] flex items-center justify-center shrink-0 shadow-2xs">
                                <Disc className="w-3.5 h-3.5 stroke-[2.2]" />
                              </div>
                              <span className="text-slate-700 font-medium">Cintilla adhesiva ({inputs.tapeLengthCm} cm x {inputs.tapeSections} secc.)</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-24 bg-slate-200/60 h-2 rounded-full overflow-hidden hidden sm:block">
                                <div className="bg-[#00a8b5] h-full rounded-full" style={{ width: `${Math.min(100, (calc.tapeMonthly / (calc.opexMonthly || 1)) * 100)}%` }} />
                              </div>
                              <strong className="text-slate-900 w-24 text-right">{formatMxn(calc.tapeMonthly)}</strong>
                              <strong className="text-[#00a8b5] w-12 text-right">{formatMxn(calc.tapeCostMxnPerPiece)}</strong>
                            </div>
                          </div>

                          {/* Fila 3: Mano de Obra Directa */}
                          <div className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-xl bg-cyan-50 border border-cyan-200/80 text-[#00a8b5] flex items-center justify-center shrink-0 shadow-2xs">
                                <Users className="w-3.5 h-3.5 stroke-[2.2]" />
                              </div>
                              <span className="text-slate-700 font-medium">Mano de obra directa</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-24 bg-slate-200/60 h-2 rounded-full overflow-hidden hidden sm:block">
                                <div className="bg-[#00a8b5] h-full rounded-full" style={{ width: `${Math.min(100, (calc.laborMonthly / (calc.opexMonthly || 1)) * 100)}%` }} />
                              </div>
                              <strong className="text-slate-900 w-24 text-right">{formatMxn(calc.laborMonthly)}</strong>
                              <strong className="text-[#00a8b5] w-12 text-right">{formatMxn(calc.kpiMonth ? calc.laborMonthly/calc.kpiMonth : 0)}</strong>
                            </div>
                          </div>

                          {/* Fila 4: Energía Eléctrica */}
                          <div className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-xl bg-cyan-50 border border-cyan-200/80 text-[#00a8b5] flex items-center justify-center shrink-0 shadow-2xs">
                                <Zap className="w-3.5 h-3.5 stroke-[2.2]" />
                              </div>
                              <span className="text-slate-700 font-medium">Energía eléctrica</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-24 bg-slate-200/60 h-2 rounded-full overflow-hidden hidden sm:block">
                                <div className="bg-[#00a8b5] h-full rounded-full" style={{ width: `${Math.min(100, (calc.energyMonthly / (calc.opexMonthly || 1)) * 100)}%` }} />
                              </div>
                              <strong className="text-slate-900 w-24 text-right">{formatMxn(calc.energyMonthly)}</strong>
                              <strong className="text-[#00a8b5] w-12 text-right">{formatMxn(calc.kpiMonth ? calc.energyMonthly/calc.kpiMonth : 0)}</strong>
                            </div>
                          </div>

                          {/* Fila 5: Mantenimiento */}
                          <div className="flex items-center justify-between text-xs py-0.5 border-b border-slate-100">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-xl bg-cyan-50 border border-cyan-200/80 text-[#00a8b5] flex items-center justify-center shrink-0 shadow-2xs">
                                <Wrench className="w-3.5 h-3.5 stroke-[2.2]" />
                              </div>
                              <span className="text-slate-700 font-medium">Mantenimiento</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-24 bg-slate-200/60 h-2 rounded-full overflow-hidden hidden sm:block">
                                <div className="bg-[#00a8b5] h-full rounded-full" style={{ width: `${Math.min(100, (calc.maintenanceMonthly / (calc.opexMonthly || 1)) * 100)}%` }} />
                              </div>
                              <strong className="text-slate-900 w-24 text-right">{formatMxn(calc.maintenanceMonthly)}</strong>
                              <strong className="text-[#00a8b5] w-12 text-right">{formatMxn(calc.kpiMonth ? calc.maintenanceMonthly/calc.kpiMonth : 0)}</strong>
                            </div>
                          </div>

                          {/* Fila 6: Indirectos */}
                          <div className="flex items-center justify-between text-xs py-0.5">
                            <div className="flex items-center gap-2.5">
                              <div className="w-6 h-6 rounded-xl bg-cyan-50 border border-cyan-200/80 text-[#00a8b5] flex items-center justify-center shrink-0 shadow-2xs">
                                <Package className="w-3.5 h-3.5 stroke-[2.2]" />
                              </div>
                              <span className="text-slate-700 font-medium">Indirectos / empaque adicional</span>
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="w-24 bg-slate-200/60 h-2 rounded-full overflow-hidden hidden sm:block">
                                <div className="bg-[#00a8b5] h-full rounded-full" style={{ width: `${Math.min(100, (calc.indirectMonthly / (calc.opexMonthly || 1)) * 100)}%` }} />
                              </div>
                              <strong className="text-slate-900 w-24 text-right">{formatMxn(calc.indirectMonthly)}</strong>
                              <strong className="text-[#00a8b5] w-12 text-right">{formatMxn(inputs.indirectUnit)}</strong>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Recuadro Destacado Total OPEX */}
                      <div className="border-2 border-[#00a8b5] bg-white p-3 rounded-2xl flex items-center justify-between shadow-xs mt-1">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl border border-cyan-300 bg-cyan-50 flex items-center justify-center text-[#00a8b5] shadow-2xs">
                            <Calculator className="w-4 h-4 stroke-[2.2]" />
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 uppercase block tracking-wider">TOTAL OPEX</span>
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">MENSUAL (OPERACIÓN)</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-black text-[#00a8b5] block leading-none">{formatMxn(calc.opexMonthly)}</span>
                          <span className="text-[10px] font-black text-[#00a8b5] uppercase tracking-wider mt-0.5 block">${calc.kpiOpexUnit.toFixed(2)} COSTO OPEX / PIEZA</span>
                        </div>
                      </div>
                    </div>

                    {/* Panel Derecho: INDICADORES CLAVE */}
                    <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-200 flex flex-col justify-between space-y-3">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2.5 border-b border-cyan-200/80 pb-2">
                          <div className="w-7 h-7 rounded-full bg-[#00a8b5] text-white flex items-center justify-center shadow-xs">
                            <BarChart3 className="w-3.5 h-3.5 text-white" />
                          </div>
                          <h3 className="font-black text-[#00a8b5] text-xs uppercase tracking-wider">
                            INDICADORES CLAVE
                          </h3>
                        </div>

                        {/* Grid 2x2 de Tarjetas de Indicadores */}
                        <div className="grid grid-cols-2 gap-2.5">
                          {/* Card 1: Capacidad por hora */}
                          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-col items-center justify-between text-center space-y-2 shadow-xs">
                            <div className="w-9 h-9 rounded-2xl bg-cyan-50 border border-cyan-200/90 flex items-center justify-center text-[#00a8b5] shadow-xs shrink-0">
                              <Gauge className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <div className="w-full">
                              <span className="text-[9px] font-black text-slate-500 block uppercase tracking-wider">Capacidad por hora</span>
                              <strong className="text-lg font-black text-slate-900 block leading-tight mt-0.5">{formatNum(calc.kpiHour)} pz/h</strong>
                            </div>
                          </div>

                          {/* Card 2: Producción diaria */}
                          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-col items-center justify-between text-center space-y-2 shadow-xs">
                            <div className="w-9 h-9 rounded-2xl bg-cyan-50 border border-cyan-200/90 flex items-center justify-center text-[#00a8b5] shadow-xs shrink-0">
                              <Calendar className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <div className="w-full">
                              <span className="text-[9px] font-black text-slate-500 block uppercase tracking-wider">Producción diaria</span>
                              <strong className="text-lg font-black text-slate-900 block leading-tight mt-0.5">{formatNum(calc.dayPz)} pz/día</strong>
                            </div>
                          </div>

                          {/* Card 3: Producción mensual */}
                          <div className="bg-[#eefbfd] border-2 border-cyan-300/80 rounded-2xl p-3 flex flex-col items-center justify-between text-center space-y-2 shadow-xs">
                            <div className="w-9 h-9 rounded-2xl bg-white border border-cyan-300 flex items-center justify-center text-[#00a8b5] shadow-xs shrink-0">
                              <Factory className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <div className="w-full">
                              <span className="text-[9px] font-black text-[#00a8b5] block uppercase tracking-wider">Producción mensual ({inputs.shiftsDay} {inputs.shiftsDay === 1 ? 'turno' : 'turnos'})</span>
                              <strong className="text-lg font-black text-[#00a8b5] block leading-tight mt-0.5">{formatNum(calc.kpiMonth)} pz/mes</strong>
                            </div>
                          </div>

                          {/* Card 4: Costo total con recuperación CAPEX */}
                          <div className="bg-white border border-slate-200/90 rounded-2xl p-3 flex flex-col items-center justify-between text-center space-y-1.5 shadow-xs">
                            <div className="w-9 h-9 rounded-2xl bg-orange-50 border border-orange-200/90 flex items-center justify-center text-[#ff5500] shadow-xs shrink-0">
                              <DollarSign className="w-4 h-4 stroke-[2.2]" />
                            </div>
                            <div className="w-full">
                              <span className="text-[9px] font-black text-slate-500 block uppercase tracking-wider">Costo Total (OPEX + CAPEX)</span>
                              <strong className="text-lg font-black text-slate-900 block leading-tight mt-0.5">{formatMxn(calc.kpiTotalCostUnit)} pz</strong>
                              <span className="text-[8.5px] font-bold text-slate-400 block mt-0.5">OPEX (${(calc.kpiOpexUnit || 0).toFixed(2)}) + CAPEX (${(calc.capexUnitRecovery || 0).toFixed(2)})</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fila Inferior: Margen y Estado */}
                      <div className="grid grid-cols-2 gap-2.5 items-center pt-0.5">
                        {/* Gauge Anular de Margen */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-2.5 flex flex-col items-center justify-center shadow-xs">
                          <span className="text-[8.5px] font-black text-slate-600 uppercase tracking-wider mb-1 text-center">
                            MARGEN SOBRE VENTA
                          </span>
                          <div className="relative w-16 h-16 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                              <path
                                className="text-slate-100"
                                strokeWidth="3.5"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                              <path
                                className="text-[#ff5500]"
                                strokeDasharray={`${Math.max(0, Math.min(100, calc.marginPct))}, 100`}
                                strokeWidth="3.5"
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="none"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              />
                            </svg>
                            <div className="absolute text-center">
                              <span className="text-sm font-black text-slate-900 leading-none block">
                                {calc.marginPct.toFixed(2)}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Estado del Escenario */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-2.5 flex flex-col justify-between h-full shadow-xs">
                          <span className="text-[8.5px] font-black text-slate-600 uppercase tracking-wider mb-1">
                            ESTADO ESCENARIO
                          </span>
                          <div className="border-2 border-[#00a8b5] bg-cyan-50/50 rounded-xl p-2 flex items-center justify-center gap-1.5">
                            <CheckCircle2 className="w-5 h-5 text-[#00a8b5] shrink-0" />
                            <div className="text-left">
                              <span className="text-[7.5px] font-black text-[#00a8b5] uppercase tracking-wider block">ESTADO</span>
                              <span className="text-sm font-black text-[#00a8b5] uppercase leading-none block">{calc.statusText || 'VIABLE'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>

                  </div>
                </div>

                {/* Footer de Página con SMQ.mx */}
                <div className="flex justify-between items-center text-[10px] font-bold border-t border-slate-200 pt-2 text-slate-400 mt-2">
                  <div className="flex items-center gap-2">
                    <a href="https://www.smq.mx" target="_blank" rel="noreferrer" className="text-[#00a8b5] hover:underline font-black">
                      www.smq.mx
                    </a>
                    <span>|</span>
                    <span>PANDORA 3.0 SIMULADOR PARAMÉTRICO</span>
                  </div>
                  <span className="font-black text-[#00a8b5]">PÁGINA 3 DE 4</span>
                </div>

              </div>

              {/* ── PÁGINA 4 DE 4 ───────────────────────────────────────────── */}
              <div id="report-page-4" className="bg-white rounded-2xl shadow-xl border border-slate-300 p-6 w-[1123px] h-[794px] mx-auto text-slate-900 flex flex-col justify-between relative overflow-hidden shrink-0">
                
                <div className="space-y-2.5">
                  {/* Encabezado Corporativo */}
                  <div className="flex justify-between items-center text-[10px] font-black uppercase border-b border-slate-100 pb-1.5">
                    <span className="text-[#00a8b5]">ESCENARIOS, RECUPERACIÓN Y DEPRECIACIÓN</span>
                    {customLogo && (
                      <img src={customLogo} alt="Logo" className="h-[96px] max-w-[540px] object-contain shrink-0" />
                    )}
                  </div>

                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="text-[10px] font-black text-[#00a8b5] uppercase tracking-widest block mb-0.5">PROYECCIÓN MULTI-ESCENARIO</span>
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase leading-none mt-0.5">
                        <span>ESCENARIOS</span> <span className="text-[#00a8b5]">| OPERATIVOS Y RECUPERACIÓN</span>
                      </h2>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium">Comparativo estratégico de turnos, retorno de inversión y premisas.</span>
                  </div>

                  {/* 1. Tarjetas de Comparación de Escenarios (1 Turno vs 2 Turnos) */}
                  <div className="grid grid-cols-2 gap-3">
                    {/* Escenario 1: 1 Turno */}
                    <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-3 flex flex-col justify-between space-y-2 shadow-2xs">
                      <div className="flex justify-between items-center border-b border-slate-200 pb-1.5">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="bg-slate-200 text-slate-700 font-black text-xs shrink-0 shadow-2xs" 
                            style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <span style={{ lineHeight: '1', display: 'block', marginTop: '-6px' }}>1</span>
                          </div>
                          <div>
                            <span className="text-xs font-black text-slate-900 uppercase block leading-none">ESCENARIO 1 TURNO</span>
                            <span className="text-[9px] text-slate-500 font-bold block mt-0.5">8 horas/día · 26 días/mes</span>
                          </div>
                        </div>
                        <span className="text-[9.5px] font-bold bg-slate-200/70 text-slate-700 px-2.5 py-1 rounded-full">Base Operativa</span>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Producción Mensual</span>
                          <strong className="text-xs font-black text-slate-900 block leading-tight">{formatNum(calc.scenario1Shift.monthPz)} pz</strong>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase block">OPEX Mensual</span>
                          <strong className="text-xs font-black text-slate-900 block leading-tight">{formatMxn(calc.scenario1Shift.opexMonth)}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Costo Total / pieza</span>
                          <strong className="text-xs font-black text-slate-900 block leading-tight">{formatMxn(calc.scenario1Shift.totalUnit)}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-slate-200/70">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Utilidad Mensual</span>
                          <strong className="text-xs font-black text-emerald-600 block leading-tight">{formatMxn(calc.scenario1Shift.profitMonth)}</strong>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200 p-2 rounded-xl flex items-center justify-between min-h-[40px]">
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-wide pl-1">PAYBACK ESTIMADO:</span>
                        <div className="bg-cyan-50 text-[#00a8b5] border border-cyan-200 px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shrink-0 min-h-[28px]">
                          <Clock className="w-3.5 h-3.5 text-[#00a8b5] shrink-0" />
                          <span className="text-[#00a8b5] whitespace-nowrap font-black" style={{ lineHeight: '1', display: 'inline-block', transform: 'translateY(-5px)' }}>{calc.scenario1Shift.paybackMonths} meses</span>
                        </div>
                      </div>
                    </div>

                    {/* Escenario 2: 2 Turnos (RECOMENDADO) */}
                    <div className="bg-[#eefbfd]/60 border-2 border-[#00a8b5] rounded-2xl p-3 flex flex-col justify-between space-y-2 shadow-xs relative overflow-hidden">
                      <div className="flex justify-between items-center border-b border-cyan-200 pb-1.5">
                        <div className="flex items-center gap-2.5">
                          <div 
                            className="bg-[#00a8b5] text-white font-black text-xs shrink-0 shadow-xs" 
                            style={{ width: '28px', height: '28px', minWidth: '28px', minHeight: '28px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                          >
                            <span style={{ lineHeight: '1', display: 'block', marginTop: '-6px' }}>2</span>
                          </div>
                          <div>
                            <span className="text-xs font-black text-[#00a8b5] uppercase block leading-none">ESCENARIO 2 TURNOS</span>
                            <span className="text-[9px] text-[#00a8b5]/80 font-bold block mt-0.5">16 horas/día · 26 días/mes</span>
                          </div>
                        </div>
                        <div className="bg-[#00a8b5] text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 shrink-0 shadow-xs">
                          <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 shrink-0" />
                          <span className="leading-tight">RECOMENDADO</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-1.5 text-xs">
                        <div className="bg-white p-2 rounded-xl border border-cyan-200/80 shadow-2xs">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Producción Mensual</span>
                          <strong className="text-xs font-black text-[#00a8b5] block leading-tight">{formatNum(calc.scenario2Shifts.monthPz)} pz</strong>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-cyan-200/80 shadow-2xs">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase block">OPEX Mensual</span>
                          <strong className="text-xs font-black text-slate-900 block leading-tight">{formatMxn(calc.scenario2Shifts.opexMonth)}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-cyan-200/80 shadow-2xs">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Costo Total / pieza</span>
                          <strong className="text-xs font-black text-slate-900 block leading-tight">{formatMxn(calc.scenario2Shifts.totalUnit)}</strong>
                        </div>
                        <div className="bg-white p-2 rounded-xl border border-cyan-200/80 shadow-2xs">
                          <span className="text-[8.5px] font-bold text-slate-400 uppercase block">Utilidad Mensual</span>
                          <strong className="text-xs font-black text-emerald-600 block leading-tight">{formatMxn(calc.scenario2Shifts.profitMonth)}</strong>
                        </div>
                      </div>

                      <div className="bg-white border border-cyan-300 p-2 rounded-xl flex items-center justify-between shadow-2xs min-h-[40px]">
                        <span className="text-[10px] font-black text-[#00a8b5] uppercase tracking-wide pl-1">PAYBACK ESTIMADO:</span>
                        <div className="bg-[#00a8b5] text-white px-3.5 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 shrink-0 shadow-xs min-h-[28px]">
                          <Clock className="w-3.5 h-3.5 text-white shrink-0" />
                          <span className="text-white whitespace-nowrap font-black" style={{ lineHeight: '1', display: 'inline-block', transform: 'translateY(-5px)' }}>{calc.scenario2Shifts.paybackMonths} meses</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 2. Grid de Recuperación de Inversión y Depreciación */}
                  <div className="grid grid-cols-2 gap-2.5">
                    
                    {/* Panel 1: Recuperación de Inversión */}
                    <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-2.5 space-y-1.5">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                        <div className="w-5 h-5 rounded-lg bg-cyan-100 text-[#00a8b5] flex items-center justify-center">
                          <TrendingUp className="w-3.5 h-3.5 stroke-[2.2]" />
                        </div>
                        <h3 className="font-black text-[#00a8b5] text-[10.5px] uppercase tracking-wider">
                          RECUPERACIÓN DE INVERSIÓN (PAYBACK)
                        </h3>
                      </div>

                      <div className="space-y-1 text-xs">
                        {calc.recoveryTiers.map(t => (
                          <div key={t.months} className="bg-white border border-slate-200 rounded-xl p-1.5 flex items-center justify-between shadow-2xs">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-md bg-cyan-50 text-[#00a8b5] flex items-center justify-center font-bold text-[9px]">
                                {t.months / 12}A
                              </div>
                              <div>
                                <span className="font-black text-slate-900 block leading-none text-xs">{t.yearsLabel}</span>
                                <span className="text-[8.5px] font-bold text-slate-400 block mt-0.5">Cuota: {formatMxn(t.recM)}/mes</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Utilidad Libre Mensual</span>
                              <strong className="text-xs font-black text-emerald-600 block">{formatMxn(t.profM)}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Panel 2: Depreciación de Maquinaria */}
                    <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-2.5 space-y-1.5">
                      <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                        <div className="w-5 h-5 rounded-lg bg-cyan-100 text-[#00a8b5] flex items-center justify-center">
                          <Calculator className="w-3.5 h-3.5 stroke-[2.2]" />
                        </div>
                        <h3 className="font-black text-[#00a8b5] text-[10.5px] uppercase tracking-wider">
                          DEPRECIACIÓN Y VALOR EN LIBROS
                        </h3>
                      </div>

                      <div className="space-y-1 text-xs">
                        {calc.depreciationRows.map(r => (
                          <div key={r.yearLabel} className="bg-white border border-slate-200 rounded-xl p-1.5 flex items-center justify-between shadow-2xs">
                            <div>
                              <span className="font-black text-slate-900 block leading-none text-xs">{r.yearLabel}</span>
                              <span className="text-[8.5px] font-bold text-slate-400 block mt-0.5">Depreciación: {formatMxn(r.annual)}/año</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[8.5px] font-bold text-slate-400 block uppercase">Valor Remanente Libros</span>
                              <strong className="text-xs font-black text-slate-900 block">{formatMxn(r.bookValue)}</strong>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>

                  {/* 3. Base Documental Utilizada (Factsheet Visual) */}
                  <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-2 space-y-1">
                    <div className="flex items-center gap-2 border-b border-slate-200 pb-1">
                      <div className="w-4 h-4 rounded-lg bg-cyan-100 text-[#00a8b5] flex items-center justify-center">
                        <FileText className="w-3 h-3 stroke-[2.2]" />
                      </div>
                      <h3 className="font-black text-[#00a8b5] text-[10px] uppercase tracking-wider">
                        BASE DOCUMENTAL Y PREMISAS DE SIMULACIÓN
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-xs">
                      <div className="bg-white border border-slate-200/80 rounded-xl p-1.5 flex items-start gap-2">
                        <div className="w-4 h-4 rounded-md bg-cyan-50 text-[#00a8b5] flex items-center justify-center shrink-0 mt-0.5">
                          <Factory className="w-3 h-3" />
                        </div>
                        <div>
                          <strong className="text-slate-900 block font-black text-[9.5px]">Cotización Máquina MAP-1050</strong>
                          <p className="text-[8.5px] text-slate-600 leading-snug">
                            82,500 USD + IVA; capacidad 45 pz/min; 18 kW instalados; 60 x 90 cm; instalación incluida.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200/80 rounded-xl p-1.5 flex items-start gap-2">
                        <div className="w-4 h-4 rounded-md bg-cyan-50 text-[#00a8b5] flex items-center justify-center shrink-0 mt-0.5">
                          <Package className="w-3 h-3" />
                        </div>
                        <div>
                          <strong className="text-slate-900 block font-black text-[9.5px]">Cotización Materia Prima (300,000 pz)</strong>
                          <p className="text-[8.5px] text-slate-600 leading-snug">
                            $2.76 MXN/pieza sin IVA ($3.20 con IVA); material puesto en bodega del cliente.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200/80 rounded-xl p-1.5 flex items-start gap-2">
                        <div className="w-4 h-4 rounded-md bg-cyan-50 text-[#00a8b5] flex items-center justify-center shrink-0 mt-0.5">
                          <Disc className="w-3 h-3" />
                        </div>
                        <div>
                          <strong className="text-slate-900 block font-black text-[9.5px]">Cintilla Adhesiva Posterior</strong>
                          <p className="text-[8.5px] text-slate-600 leading-snug">
                            4.90 USD por rollo de 200 m. Consumo calculado según dimensiones.
                          </p>
                        </div>
                      </div>

                      <div className="bg-white border border-slate-200/80 rounded-xl p-1.5 flex items-start gap-2">
                        <div className="w-4 h-4 rounded-md bg-cyan-50 text-[#00a8b5] flex items-center justify-center shrink-0 mt-0.5">
                          <Users className="w-3 h-3" />
                        </div>
                        <div>
                          <strong className="text-slate-900 block font-black text-[9.5px]">Requerimiento Operativo</strong>
                          <p className="text-[8.5px] text-slate-600 leading-snug">
                            2 operadores por turno ($8,000 sueldo mensual), horas de turno y costo de energía modificables.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>

                {/* Footer de Página con SMQ.mx */}
                <div className="flex justify-between items-center text-[10px] font-bold border-t border-slate-200 pt-2 text-slate-400 mt-2">
                  <div className="flex items-center gap-2">
                    <a href="https://www.smq.mx" target="_blank" rel="noreferrer" className="text-[#00a8b5] hover:underline font-black">
                      www.smq.mx
                    </a>
                    <span>|</span>
                    <span>PANDORA 3.0 SIMULADOR PARAMÉTRICO</span>
                  </div>
                  <span className="font-black text-[#00a8b5]">PÁGINA 4 DE 4</span>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

      {/* ── MODAL DIÁLOGO DE PARÁMETROS DE EXPORTACIÓN (NOMBRE PDF, CLIENTE, TC Y PRECIO) ────────── */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-md w-full p-6 sm:p-7 space-y-5 relative">
            <button 
              onClick={() => setShowExportModal(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#078896]/10 text-[#078896] flex items-center justify-center shrink-0">
                <FileText className="w-6 h-6 stroke-[2.2]" />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900 leading-tight">Configuración del Informe PDF</h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5">Ajusta nombre de archivo, cliente, TC y precio de venta antes de descargar</p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Field 1: Nombre del Archivo PDF */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10.5px]">
                  Nombre del Archivo PDF a Exportar
                </label>
                <div className="relative">
                  <input 
                    type="text"
                    value={exportPdfFileName}
                    onChange={(e) => setExportPdfFileName(e.target.value)}
                    placeholder="Ej: Cotizacion_Panal_Cama_Emilio"
                    className="w-full pl-4 pr-12 py-2 rounded-xl border border-slate-300 focus:border-[#078896] focus:ring-2 focus:ring-[#078896]/20 font-bold text-slate-900 outline-none transition-all"
                  />
                  <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-400">.pdf</span>
                </div>
              </div>

              {/* Field 2: Nombre del Cliente */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10.5px]">
                  Nombre del Cliente / Empresa
                </label>
                <input 
                  type="text"
                  value={exportClientName}
                  onChange={(e) => setExportClientName(e.target.value)}
                  placeholder="Ej: DISTRIBUIDORA INDUSTRIAL S.A."
                  className="w-full px-4 py-2 rounded-xl border border-slate-300 focus:border-[#078896] focus:ring-2 focus:ring-[#078896]/20 font-bold text-slate-900 outline-none transition-all"
                />
              </div>

              {/* Field 3: Tipo de Cambio TC */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10.5px]">
                  Tipo de Cambio (TC MXN/USD)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 font-bold text-slate-400">$</span>
                  <input 
                    type="number"
                    step="0.01"
                    min="1"
                    value={exportFx}
                    onChange={(e) => setExportFx(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-20 py-2 rounded-xl border border-slate-300 focus:border-[#078896] focus:ring-2 focus:ring-[#078896]/20 font-black text-slate-900 outline-none transition-all"
                  />
                  <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-400">MXN/USD</span>
                </div>
              </div>

              {/* Field 4: Precio de Venta sin IVA */}
              <div className="space-y-1">
                <label className="font-bold text-slate-700 block uppercase tracking-wider text-[10.5px]">
                  Precio de Venta sin IVA del Pañal (MXN)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2 font-bold text-slate-400">$</span>
                  <input 
                    type="number"
                    step="0.01"
                    min="0.1"
                    value={exportSalePrice}
                    onChange={(e) => setExportSalePrice(parseFloat(e.target.value) || 0)}
                    className="w-full pl-8 pr-20 py-2 rounded-xl border border-slate-300 focus:border-[#078896] focus:ring-2 focus:ring-[#078896]/20 font-black text-slate-900 outline-none transition-all"
                  />
                  <span className="absolute right-3.5 top-2.5 text-[10px] font-bold text-slate-400">MXN/pz</span>
                </div>
              </div>

              {/* Dynamic Preview Callout */}
              <div className="bg-cyan-50/80 border border-cyan-200 p-3 rounded-2xl space-y-1 text-[11px]">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Inversión Máquina USD:</span>
                  <span className="font-bold text-slate-700">${inputs.machineUsd.toLocaleString()} USD</span>
                </div>
                <div className="flex justify-between items-center border-t border-cyan-200/60 pt-1">
                  <span className="text-[#078896] font-bold">Valor en Pesos (TC ${(exportFx || 0).toFixed(2)}):</span>
                  <span className="font-black text-[#078896] text-xs">{formatMxn(inputs.machineUsd * (exportFx || 1))}</span>
                </div>
                <div className="flex justify-between items-center border-t border-cyan-200/60 pt-1">
                  <span className="text-emerald-700 font-bold">Precio Venta sin IVA:</span>
                  <span className="font-black text-emerald-700 text-xs">${(exportSalePrice || 0).toFixed(2)} MXN</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setShowExportModal(false)}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-300 font-bold text-slate-600 hover:bg-slate-50 transition-colors text-xs"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmExport}
                disabled={isExporting}
                className="flex-1 py-3 px-4 rounded-xl bg-[#078896] hover:bg-[#078896]/90 disabled:opacity-50 text-white font-black text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                {isExporting ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    Generando PDF...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4" />
                    Descargar PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
