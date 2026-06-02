import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Calculator, 
  Settings, 
  FileText, 
  Download, 
  Layers, 
  Zap, 
  Gauge, 
  Check, 
  User, 
  Briefcase, 
  ArrowLeft,
  FileCheck,
  Building,
  Calendar,
  Layers2,
  Globe,
  Grid,
  FileSpreadsheet,
  Signature,
  Upload,
  Image as ImageIcon,
  Move,
  Palette,
  Trash2,
  ArrowUp,
  ArrowDown,
  Sliders
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// --- DATA STRUCTURES FOR SMQ MACHINERY & CONFIGS ---

const MACHINE_TYPES = [
  {
    id: 'smq-dp8',
    name: 'SMQ-DP8 PRO',
    tag: 'Estándar Europeo OEM',
    desc: 'Envasadora rotativa de 8 estaciones servoasistidas, diseñada para alta velocidad y sellados herméticos a prueba de fugas.',
    basePrice: 165000,
    basePower: 3.8,
    maxSpeed: 60,
    stations: 8,
    dimensions: '3,200 x 2,100 x 1,850 mm',
    weight: '2,200 kg',
    airConsumption: '380 Nl/min',
    layoutDesc: 'Huella de cimentación estándar con transportador de salida de 3.5 metros y mesa giratoria final.',
    image: 'https://xbubebonbivunzrqeidg.supabase.co/storage/v1/object/public/media/1780113554541_planta%20600%201.png'
  },
  {
    id: 'smq-dp6',
    name: 'SMQ-DP6 HIGH-CAP',
    tag: 'Gran Formato & Alta Densidad',
    desc: 'Envasadora rotativa de 6 estaciones reforzada, ideal para bolsas Doypack de gran volumen y productos de alto peso.',
    basePrice: 185000,
    basePower: 4.5,
    maxSpeed: 45,
    stations: 6,
    dimensions: '3,500 x 2,300 x 2,100 mm',
    weight: '2,600 kg',
    airConsumption: '420 Nl/min',
    layoutDesc: 'Espacio reforzado para dosificación de alta carga de frutos secos, snacks grandes y polvos de alta densidad.',
    image: 'https://xbubebonbivunzrqeidg.supabase.co/storage/v1/object/public/media/1780117410783_pellet%201.png'
  },
  {
    id: 'smq-vffs-500',
    name: 'SMQ-VFFS-500',
    tag: 'Vertical Form Fill Seal',
    desc: 'Sistema vertical continuo para conformado, llenado y sellado a partir de bobina plana de película.',
    basePrice: 95000,
    basePower: 3.2,
    maxSpeed: 80,
    stations: 3,
    dimensions: '1,800 x 1,500 x 2,400 mm',
    weight: '1,100 kg',
    airConsumption: '320 Nl/min',
    layoutDesc: 'Configuración vertical ultra compacta ideal para plantas con espacio en planta limitado pero buena altura libre.',
    image: 'https://xbubebonbivunzrqeidg.supabase.co/storage/v1/object/public/media/1780115231575_choco%20color%202.png'
  }
];

const DOSER_TYPES = [
  {
    id: 'doser-multicabezal',
    name: 'Balanza Multicabezal (14 Cabezales)',
    desc: 'Alta velocidad y precisión al gramo para snacks, frutos secos, dulces y granulados.',
    price: 35000,
    power: 3.5,
    accuracy: '±0.5g a ±1.5g',
    cleanTime: '15 min (Cambio rápido)'
  },
  {
    id: 'doser-sinfin',
    name: 'Tornillo Sinfín Servocontrolado',
    desc: 'Llenado hermético antipolvo ideal para harinas, polvos finos, café molido y colágeno.',
    price: 22000,
    power: 4.0,
    accuracy: '±1% o superior',
    cleanTime: '25 min (Sistema rotativo)'
  },
  {
    id: 'doser-volumetrico',
    name: 'Dosificador Volumétrico de Copas',
    desc: 'Solución económica y confiable para legumbres, arroz, sal y granos homogéneos.',
    price: 12000,
    power: 1.5,
    accuracy: '±1.5%',
    cleanTime: '10 min (Copas removibles)'
  },
  {
    id: 'doser-piston',
    name: 'Dosificador de Pistón para Líquidos',
    desc: 'Válvulas neumáticas antigoteo para salsas, aderezos, miel, cremas y geles.',
    price: 18000,
    power: 2.0,
    accuracy: '±1%',
    cleanTime: '20 min (Sistema CIP integrado)'
  }
];

const AUXILIARY_MODULES = [
  {
    id: 'mod-nitrogen',
    name: 'Inyección de Nitrógeno Activo',
    desc: 'Preserva atmósfera modificada para extender la frescura.',
    price: 8500,
    power: 0.5,
    checked: true,
    haccp: false
  },
  {
    id: 'mod-coder',
    name: 'Codificador Láser de Fibra',
    desc: 'Impresión indeleble de lote y caducidad directamente en el film.',
    price: 9500,
    power: 0.8,
    checked: true,
    haccp: false
  },
  {
    id: 'mod-metal',
    name: 'Detector de Metales Gravimétrico',
    desc: 'Inspección crítica antes de la salida final de la bolsa.',
    price: 14500,
    power: 1.2,
    checked: false,
    haccp: true
  },
  {
    id: 'mod-weigher',
    name: 'Checkweigher Dinámico de Salida',
    desc: 'Balanza de control con sistema de rechazo automático.',
    price: 12000,
    power: 1.0,
    checked: false,
    haccp: true
  },
  {
    id: 'mod-conveyor',
    name: 'Banda Transportadora de Cangilones',
    desc: 'Transportador de cangilones sanitario de elevación limpia.',
    price: 4500,
    power: 0.75,
    checked: true,
    haccp: false
  },
  {
    id: 'mod-collector',
    name: 'Colector de Polvos por Vacío',
    desc: 'Campana extractora de polvo integrada para sellados perfectos.',
    price: 8000,
    power: 3.0,
    checked: false,
    haccp: false
  }
];

export default function SMQSimulator() {
  const navigate = useNavigate();

  // --- PERSISTENT DYNAMIC SCENARIO STATE ---
  const [quoteNumber, setQuoteNumber] = useState(() => localStorage.getItem('smq_quote_num') || 'SMQ-2026-084A');
  const [clientName, setClientName] = useState(() => localStorage.getItem('smq_sim_client') || 'FEDD CENTERS');
  const [companyName, setCompanyName] = useState(() => localStorage.getItem('smq_sim_company') || 'CENTERS INDUSTRIAL S.A. DE C.V.');
  const [projectName, setProjectName] = useState(() => localStorage.getItem('smq_sim_project') || 'LÍNEA INTEGRAL DOYPACK SMQ-DP8');
  const [exchangeRate, setExchangeRate] = useState(() => parseFloat(localStorage.getItem('smq_sim_tc') || '18.20'));
  
  // Custom letter of presentation state
  const [presentationLetter, setPresentationLetter] = useState(() => {
    return localStorage.getItem('smq_presentation_letter') || 
      `Estimado Cliente,\n\nNos complace presentar nuestra cotización formal para el suministro e integración de la Línea Automática de Envasado SMQ.\n\nNuestras soluciones combinan ingeniería alemana y construcción sanitaria en acero inoxidable AISI 304, garantizando una eficiencia del 98% en piso de producción. Esta propuesta ha sido configurada detalladamente según las necesidades operativas de su planta.\n\nQuedamos a su total disposición para resolver cualquier duda o realizar ajustes técnicos sobre la presente propuesta.\n\nAtentamente,\nIngeniería de Aplicaciones SMQ`;
  });

  const [selectedMachineId, setSelectedMachineId] = useState(() => localStorage.getItem('smq_sim_machine') || 'smq-dp8');
  const [selectedDoserId, setSelectedDoserId] = useState(() => localStorage.getItem('smq_sim_doser') || 'doser-multicabezal');
  
  const [activeAuxModules, setActiveAuxModules] = useState(() => {
    const saved = localStorage.getItem('smq_sim_aux_mods');
    if (saved) return JSON.parse(saved);
    return AUXILIARY_MODULES.reduce((acc, m) => {
      acc[m.id] = m.checked;
      return acc;
    }, {});
  });

  // Sliders and specs variables
  const [speedPPM, setSpeedPPM] = useState(() => parseInt(localStorage.getItem('smq_sim_speed') || '45'));
  const [hoursPerDay, setHoursPerDay] = useState(() => parseInt(localStorage.getItem('smq_sim_hours') || '16'));
  const [daysPerYear, setDaysPerYear] = useState(() => parseInt(localStorage.getItem('smq_sim_days') || '280'));
  
  // Commercial Terms variables
  const [deliveryWeeks, setDeliveryWeeks] = useState(() => parseInt(localStorage.getItem('smq_sim_delivery') || '14'));
  const [paymentAdvance, setPaymentAdvance] = useState(() => parseInt(localStorage.getItem('smq_sim_payment_adv') || '50'));
  const [warrantyMonths, setWarrantyMonths] = useState(() => parseInt(localStorage.getItem('smq_sim_warranty') || '12'));

  // --- DYNAMIC BACKGROUND & OVERLAY IMAGE STATE (NO CANVAS RESIZING - ORIGINAL RESOLUTION SAVED TO REACT STATE) ---
  const [backgrounds, setBackgrounds] = useState(() => {
    try {
      const saved = localStorage.getItem('smq_doc_backgrounds');
      return saved ? JSON.parse(saved) : { portada: null, carta: null, tecnica: null, layout: null, terminos: null };
    } catch {
      return { portada: null, carta: null, tecnica: null, layout: null, terminos: null };
    }
  });

  const [overlays, setOverlays] = useState(() => {
    try {
      const saved = localStorage.getItem('smq_doc_overlays');
      return saved ? JSON.parse(saved) : { portada: null, layout: null };
    } catch {
      return { portada: null, layout: null };
    }
  });

  // Overlay placements (in percentage relative to A4 page dimensions for preview)
  const [overlaySettings, setOverlaySettings] = useState(() => {
    try {
      const saved = localStorage.getItem('smq_doc_overlay_settings');
      return saved ? JSON.parse(saved) : {
        portada: { x: 50, y: 35, w: 40, h: 40 }, 
        layout: { x: 15, y: 60, w: 70, h: 30 }
      };
    } catch {
      return {
        portada: { x: 50, y: 35, w: 40, h: 40 },
        layout: { x: 15, y: 60, w: 70, h: 30 }
      };
    }
  });

  // Overlaid text styling colors
  const [textColors, setTextColors] = useState(() => {
    try {
      const saved = localStorage.getItem('smq_doc_text_colors');
      return saved ? JSON.parse(saved) : {
        portada: '#004B87',
        carta: '#1E293B',
        tecnica: '#1E293B',
        layout: '#1E293B',
        terminos: '#1E293B'
      };
    } catch {
      return {
        portada: '#004B87',
        carta: '#1E293B',
        tecnica: '#1E293B',
        layout: '#1E293B',
        terminos: '#1E293B'
      };
    }
  });

  // --- DYNAMIC PAGE EXPORT SELECTOR AND ORDER LIST (HIGH-TECH LED DESIGN) ---
  const [pagesList, setPagesList] = useState(() => {
    try {
      const saved = localStorage.getItem('smq_pages_order');
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      { id: 'portada', name: '1. Portada del Documento', enabled: true },
      { id: 'carta', name: '2. Carta de Presentación', enabled: true },
      { id: 'tecnica', name: '3. Datos Técnicos & Especificaciones', enabled: true },
      { id: 'layout', name: '4. Huella y Plano de Layout', enabled: true },
      { id: 'terminos', name: '5. Condiciones de Venta & Capex', enabled: true }
    ];
  });

  // Live preview layout tab
  const [activePreviewTab, setActivePreviewTab] = useState('portada'); // 'portada', 'carta', 'tecnica', 'layout', 'terminos', 'grid'

  // Refs for hidden file inputs
  const bgInputRef = useRef(null);
  const overlayInputRef = useRef(null);

  // Persist state in localStorage with try/catch to protect against large raw Base64 quotas limits
  useEffect(() => {
    localStorage.setItem('smq_quote_num', quoteNumber);
    localStorage.setItem('smq_sim_client', clientName);
    localStorage.setItem('smq_sim_company', companyName);
    localStorage.setItem('smq_sim_project', projectName);
    localStorage.setItem('smq_sim_tc', exchangeRate.toString());
    localStorage.setItem('smq_presentation_letter', presentationLetter);
    localStorage.setItem('smq_sim_machine', selectedMachineId);
    localStorage.setItem('smq_sim_doser', selectedDoserId);
    localStorage.setItem('smq_sim_aux_mods', JSON.stringify(activeAuxModules));
    localStorage.setItem('smq_sim_speed', speedPPM.toString());
    localStorage.setItem('smq_sim_hours', hoursPerDay.toString());
    localStorage.setItem('smq_sim_days', daysPerYear.toString());
    localStorage.setItem('smq_sim_delivery', deliveryWeeks.toString());
    localStorage.setItem('smq_sim_payment_adv', paymentAdvance.toString());
    localStorage.setItem('smq_sim_warranty', warrantyMonths.toString());
    localStorage.setItem('smq_doc_overlay_settings', JSON.stringify(overlaySettings));
    localStorage.setItem('smq_doc_text_colors', JSON.stringify(textColors));
    localStorage.setItem('smq_pages_order', JSON.stringify(pagesList));

    try {
      localStorage.setItem('smq_doc_backgrounds', JSON.stringify(backgrounds));
      localStorage.setItem('smq_doc_overlays', JSON.stringify(overlays));
    } catch (e) {
      console.warn("Storage Quota Exceeded. Keeping custom high-res assets active in memory during session:", e);
    }
  }, [
    quoteNumber, clientName, companyName, projectName, exchangeRate, presentationLetter,
    selectedMachineId, selectedDoserId, activeAuxModules, speedPPM, hoursPerDay, 
    daysPerYear, deliveryWeeks, paymentAdvance, warrantyMonths, 
    backgrounds, overlays, overlaySettings, textColors, pagesList
  ]);

  const activeMachine = MACHINE_TYPES.find(m => m.id === selectedMachineId) || MACHINE_TYPES[0];
  const activeDoser = DOSER_TYPES.find(d => d.id === selectedDoserId) || DOSER_TYPES[0];

  // Adjust operating speed limit based on selected machine
  useEffect(() => {
    if (speedPPM > activeMachine.maxSpeed) {
      setSpeedPPM(activeMachine.maxSpeed);
    }
  }, [selectedMachineId, activeMachine]);

  // Calculate pricing & electrical parameters
  const calculateCapEx = () => {
    let sum = activeMachine.basePrice + activeDoser.price;
    Object.keys(activeAuxModules).forEach(modId => {
      if (activeAuxModules[modId]) {
        const mod = AUXILIARY_MODULES.find(m => m.id === modId);
        if (mod) sum += mod.price;
      }
    });
    return sum;
  };

  const calculatePower = () => {
    let sum = activeMachine.basePower + activeDoser.power;
    Object.keys(activeAuxModules).forEach(modId => {
      if (activeAuxModules[modId]) {
        const mod = AUXILIARY_MODULES.find(m => m.id === modId);
        if (mod) sum += mod.power;
      }
    });
    return sum;
  };

  const capExTotal = calculateCapEx();
  const powerTotal = calculatePower();

  // Formatting date for cover page
  const formattedDate = new Date().toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).toUpperCase();

  // --- RAW HIGH-RESOLUTION UPLOAD HANDLERS (NO PIXELATION) ---
  const handleBackgroundUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setBackgrounds(prev => ({
        ...prev,
        [activePreviewTab]: event.target.result // Full resolution base64
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleOverlayUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setOverlays(prev => ({
        ...prev,
        [activePreviewTab]: event.target.result // Full resolution base64
      }));
    };
    reader.readAsDataURL(file);
  };

  const removeBackgroundImage = () => {
    setBackgrounds(prev => ({
      ...prev,
      [activePreviewTab]: null
    }));
  };

  const removeOverlayImage = () => {
    setOverlays(prev => ({
      ...prev,
      [activePreviewTab]: null
    }));
  };

  // Adjust sliders settings for overlay position
  const handleSettingsChange = (field, value) => {
    setOverlaySettings(prev => ({
      ...prev,
      [activePreviewTab]: {
        ...prev[activePreviewTab],
        [field]: value
      }
    }));
  };

  // --- ORDERING & LED SELECTION FUNCTIONS ---
  const togglePageEnabled = (id) => {
    setPagesList(prev => 
      prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p)
    );
  };

  const movePageUp = (index) => {
    if (index === 0) return;
    setPagesList(prev => {
      const newList = [...prev];
      const temp = newList[index];
      newList[index] = newList[index - 1];
      newList[index - 1] = temp;
      return newList;
    });
  };

  const movePageDown = (index) => {
    if (index === pagesList.length - 1) return;
    setPagesList(prev => {
      const newList = [...prev];
      const temp = newList[index];
      newList[index] = newList[index + 1];
      newList[index + 1] = temp;
      return newList;
    });
  };

  // --- PROGRAMMATIVE COVER PAGE VECTOR DRAWING FOR PDF ---
  const drawCoverBackground = (doc) => {
    // Left diagonal polygonal overlay matching the image precisely
    doc.setFillColor(0, 75, 135); // SMQ Royal Blue (#004B87)
    
    // Draw polygon 1: Main left side shape
    doc.path([
      { op: 'm', c: [0, 50] },
      { op: 'l', c: [55, 50] },
      { op: 'l', c: [70, 150] },
      { op: 'l', c: [55, 175] },
      { op: 'l', c: [85, 198] },
      { op: 'l', c: [15, 222] },
      { op: 'l', c: [0, 222] },
      { op: 'h' }
    ], 'F');

    // Draw polygon 2: Darker/glow accent polygon
    doc.setFillColor(0, 34, 102); // Deep Dark Cobalt (#002266)
    doc.path([
      { op: 'm', c: [0, 70] },
      { op: 'l', c: [42, 70] },
      { op: 'l', c: [55, 130] },
      { op: 'l', c: [38, 148] },
      { op: 'l', c: [72, 192] },
      { op: 'l', c: [0, 215] },
      { op: 'h' }
    ], 'F');

    // Draw bright cyan neon highlights
    doc.setDrawColor(0, 210, 255); // Neon Cyan (#00D2FF)
    doc.setLineWidth(1.2);
    doc.line(55, 50, 70, 150);
    doc.line(70, 150, 55, 175);
    doc.line(55, 175, 85, 198);
    doc.line(85, 198, 15, 222);

    // Draw grey textured background subtle dot pattern simulation
    doc.setFillColor(240, 243, 248);
    doc.rect(170, 50, 40, 150, 'F');
    // Simulate halftone grid top-right
    for (let x = 175; x < 210; x += 3) {
      for (let y = 55; y < 140; y += 3) {
        doc.setFillColor(220, 225, 235);
        doc.circle(x, y, 0.4, 'F');
      }
    }

    // Top logo backing polygon
    doc.setFillColor(255, 255, 255);
    doc.path([
      { op: 'm', c: [0, 0] },
      { op: 'l', c: [75, 0] },
      { op: 'l', c: [60, 50] },
      { op: 'l', c: [0, 50] },
      { op: 'h' }
    ], 'F');

    // Accent line below top logo polygon
    doc.setDrawColor(0, 75, 135);
    doc.setLineWidth(1.5);
    doc.line(60, 50, 0, 50);

    doc.setDrawColor(0, 210, 255);
    doc.setLineWidth(1.5);
    doc.line(0, 44, 20, 44);

    // Write Top Left "SMQ" Text Logo
    doc.setTextColor(0, 75, 135);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.text("SMQ", 15, 24);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.text("WELCOME TO THE FUTURE", 15, 30);

    // Write Top Right Slogan
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(11);
    doc.setFont("helvetica", "normal");
    doc.text("THINK.", 160, 16);
    doc.text("DESIGN.", 160, 21);
    doc.setTextColor(0, 75, 135);
    doc.setFont("helvetica", "bold");
    doc.text("AUTOMATE.", 160, 26);
    doc.setFillColor(0, 75, 135);
    doc.rect(155, 12, 1.5, 16, 'F');

    // Bottom Footer Blue Polygon Band
    doc.setFillColor(0, 75, 135);
    doc.path([
      { op: 'm', c: [0, 297] },
      { op: 'l', c: [0, 285] },
      { op: 'l', c: [65, 285] },
      { op: 'l', c: [75, 297] },
      { op: 'h' }
    ], 'F');

    // Little triangle on the bottom right
    doc.setFillColor(0, 34, 102);
    doc.path([
      { op: 'm', c: [140, 297] },
      { op: 'l', c: [210, 297] },
      { op: 'l', c: [210, 290] },
      { op: 'h' }
    ], 'F');

    // Footer website text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("www.smq.mx", 25, 292.5);
  };

  const drawHeaderBar = (doc, titleText) => {
    doc.setFillColor(8, 11, 18);
    doc.rect(0, 0, 210, 26, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("SMQ", 15, 15);
    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.text("INDUSTRIAL SYSTEMS", 15, 20);

    doc.setTextColor(0, 210, 255);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(titleText.toUpperCase(), 195, 16, { align: 'right' });

    doc.setFillColor(0, 75, 135);
    doc.rect(15, 26, 180, 1.2, 'F');
  };

  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [30, 41, 59];
  };

  // --- DYNAMIC ORDERED MULTI-PAGE PDF GENERATOR ---
  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      let pageCount = 0;

      // Filter and loop strictly in the user defined custom order list!
      pagesList.forEach((pageItem) => {
        if (!pageItem.enabled) return;

        if (pageCount > 0) {
          doc.addPage();
        }
        pageCount++;

        // Render sheet based on pageItem.id
        if (pageItem.id === 'portada') {
          // PAGE 1: COVER
          if (backgrounds.portada) {
            doc.addImage(backgrounds.portada, 'JPEG', 0, 0, 210, 297);
          } else {
            drawCoverBackground(doc);
          }

          if (overlays.portada) {
            const { x, y, w, h } = overlaySettings.portada;
            const mmX = (x / 100) * 210;
            const mmY = (y / 100) * 297;
            const mmW = (w / 100) * 210;
            const mmH = (h / 100) * 297;
            doc.addImage(overlays.portada, 'JPEG', mmX, mmY, mmW, mmH);
          }

          const coverRGB = hexToRgb(textColors.portada);
          doc.setTextColor(coverRGB[0], coverRGB[1], coverRGB[2]);
          
          if (!backgrounds.portada) {
            doc.setFont("helvetica", "bold");
            doc.setFontSize(38);
            doc.text("COTIZACIÓN", 105, 240, { align: 'center' });
            doc.setFontSize(13);
            doc.setFont("helvetica", "normal");
            doc.text("Y DATOS TÉCNICOS", 105, 247, { align: 'center' });
            
            doc.setFillColor(coverRGB[0], coverRGB[1], coverRGB[2]);
            doc.rect(98, 251, 14, 1.2, 'F');
          }

          // Four Columns details
          const startY = 265;
          const colW = 46;

          if (!backgrounds.portada) {
            doc.setFontSize(7.5);
            doc.setTextColor(120, 120, 120);
            doc.setFont("helvetica", "bold");

            doc.text("COTIZACIÓN", 15 + 1 * colW, startY, { align: 'center' });
            doc.text("CLIENTE", 15 + 2 * colW, startY, { align: 'center' });
            doc.text("EMPRESA", 15 + 3 * colW, startY, { align: 'center' });
            doc.text("FECHA", 15 + 4 * colW, startY, { align: 'center' });
          }

          doc.setFontSize(8.5);
          doc.setTextColor(30, 30, 30);
          doc.setFont("helvetica", "bold");
          doc.text(quoteNumber, 15 + 1 * colW, startY + 5, { align: 'center' });
          doc.text(clientName.toUpperCase(), 15 + 2 * colW, startY + 5, { align: 'center' });
          
          const shortCompany = companyName.length > 20 ? companyName.slice(0, 18) + '...' : companyName;
          doc.text(shortCompany.toUpperCase(), 15 + 3 * colW, startY + 5, { align: 'center' });
          doc.text(formattedDate, 15 + 4 * colW, startY + 5, { align: 'center' });

          if (!backgrounds.portada) {
            // Clean lines under the labels
            doc.setDrawColor(coverRGB[0], coverRGB[1], coverRGB[2]);
            doc.setLineWidth(0.8);
            doc.line(15 + 1 * colW - 10, startY + 8, 15 + 1 * colW + 10, startY + 8);
            doc.line(15 + 2 * colW - 10, startY + 8, 15 + 2 * colW + 10, startY + 8);
            doc.line(15 + 3 * colW - 10, startY + 8, 15 + 3 * colW + 10, startY + 8);
            doc.line(15 + 4 * colW - 10, startY + 8, 15 + 4 * colW + 10, startY + 8);
          }
        }
        else if (pageItem.id === 'carta') {
          // PAGE 2: PRESENTATION LETTER
          if (backgrounds.carta) {
            doc.addImage(backgrounds.carta, 'JPEG', 0, 0, 210, 297);
          } else {
            drawHeaderBar(doc, "Carta de Presentación");
          }

          const letterRGB = hexToRgb(textColors.carta);
          doc.setTextColor(letterRGB[0], letterRGB[1], letterRGB[2]);
          
          doc.setFontSize(10.5);
          doc.setFont("helvetica", "bold");
          doc.text(`PROYECTO: ${projectName.toUpperCase()}`, 15, 42);
          doc.text(`COTIZACIÓN NÚMERO: ${quoteNumber}`, 15, 48);
          doc.text(`FECHA DE EMISIÓN: ${formattedDate}`, 15, 54);

          doc.setFont("helvetica", "normal");
          doc.setFontSize(9.5);
          doc.setTextColor(60, 60, 60);

          // Split presentation letter to draw properly
          const splitLetter = doc.splitTextToSize(presentationLetter, 180);
          doc.text(splitLetter, 15, 68);

          // Draw sign block
          const letterHeight = 68 + splitLetter.length * 5;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(15, letterHeight + 25, 75, letterHeight + 25);
          doc.line(135, letterHeight + 25, 195, letterHeight + 25);

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "bold");
          doc.text("INGENIERÍA DE APLICACIONES SMQ", 15, letterHeight + 30);
          doc.text("FIRMA DE ACEPTACIÓN CLIENTE", 135, letterHeight + 30);
        }
        else if (pageItem.id === 'tecnica') {
          // PAGE 3: TECHNICAL DETAILS & CAPEX
          if (backgrounds.tecnica) {
            doc.addImage(backgrounds.tecnica, 'JPEG', 0, 0, 210, 297);
          } else {
            drawHeaderBar(doc, "Datos Técnicos & Especificaciones");
          }

          const specsRGB = hexToRgb(textColors.tecnica);
          doc.setTextColor(specsRGB[0], specsRGB[1], specsRGB[2]);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("1. ESPECIFICACIONES GENERALES DEL SISTEMA", 15, 38);

          const generalSpecs = [
            ["Máquina Base Seleccionada", activeMachine.name, "Estaciones Mecánicas", `${activeMachine.stations} Estaciones`],
            ["Velocidad Operativa Sincronizada", `${speedPPM} bolsas/minuto`, "Consumo Eléctrico Estimado", `${powerTotal.toFixed(2)} kW`],
            ["Dimensiones Generales", activeMachine.dimensions, "Peso del Chasis", activeMachine.weight],
            ["Flujo Neumático Nominal", activeMachine.airConsumption, "Material Estructural Principal", "Acero Inoxidable AISI 304"]
          ];

          autoTable(doc, {
            body: generalSpecs,
            startY: 42,
            theme: 'grid',
            bodyStyles: { fontSize: 8, cellPadding: 3.5 },
            columnStyles: {
              0: { fontStyle: 'bold', cellWidth: 50, fillColor: [245, 247, 250] },
              1: { cellWidth: 40 },
              2: { fontStyle: 'bold', cellWidth: 50, fillColor: [245, 247, 250] },
              3: { cellWidth: 40 }
            },
            margin: { left: 15, right: 15 }
          });

          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("2. INTEGRACIÓN DE COMPONENTES Y MÓDULOS DE DOSIFICADO", 15, doc.lastAutoTable.finalY + 10);

          const componentData = [
            [
              { content: activeMachine.name, styles: { fontStyle: 'bold' } },
              activeMachine.desc,
              `$${activeMachine.basePrice.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`
            ],
            [
              { content: activeDoser.name, styles: { fontStyle: 'bold' } },
              `Módulo de dosificación con precisión ${activeDoser.accuracy}. Tiempo de limpieza rápida: ${activeDoser.cleanTime}.`,
              `$${activeDoser.price.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`
            ]
          ];

          // Add auxiliary modules to Capex list
          Object.keys(activeAuxModules).forEach(modId => {
            if (activeAuxModules[modId]) {
              const mod = AUXILIARY_MODULES.find(m => m.id === modId);
              if (mod) {
                componentData.push([
                  { content: mod.name, styles: { fontStyle: 'normal' } },
                  mod.desc,
                  `$${mod.price.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`
                ]);
              }
            }
          });

          autoTable(doc, {
            head: [["COMPONENTE BUNDLE", "DESCRIPCIÓN TÉCNICA E INTEGRACIÓN", "PRECIO NETO (USD)"]],
            body: componentData,
            startY: doc.lastAutoTable.finalY + 14,
            theme: 'striped',
            headStyles: { fillColor: [0, 75, 135], textColor: [255, 255, 255], fontStyle: 'bold' },
            bodyStyles: { fontSize: 8 },
            columnStyles: {
              0: { cellWidth: 50 },
              1: { cellWidth: 95 },
              2: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }
            },
            margin: { left: 15, right: 15 }
          });
        }
        else if (pageItem.id === 'layout') {
          // PAGE 4: LAYOUT & BLUEPRINT
          if (backgrounds.layout) {
            doc.addImage(backgrounds.layout, 'JPEG', 0, 0, 210, 297);
          } else {
            drawHeaderBar(doc, "Huella y Distribución (Layout)");
          }

          if (overlays.layout) {
            const { x, y, w, h } = overlaySettings.layout;
            const mmX = (x / 100) * 210;
            const mmY = (y / 100) * 297;
            const mmW = (w / 100) * 210;
            const mmH = (h / 100) * 297;
            doc.addImage(overlays.layout, 'JPEG', mmX, mmY, mmW, mmH);
          }

          const layoutRGB = hexToRgb(textColors.layout);
          doc.setTextColor(layoutRGB[0], layoutRGB[1], layoutRGB[2]);
          
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("ESQUEMA TÉCNICO Y ESPACIAL DE CIMENTACIÓN", 15, 38);

          doc.setFontSize(9);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(80, 80, 80);
          doc.text(activeMachine.layoutDesc, 15, 44);

          // Draw blueprint frame
          if (!backgrounds.layout) {
            doc.setDrawColor(0, 75, 135);
            doc.setLineWidth(0.8);
            doc.setFillColor(250, 252, 255);
            doc.roundedRect(15, 52, 180, 140, 2, 2, 'FD');

            doc.setDrawColor(220, 230, 245);
            doc.setLineWidth(0.5);
            for (let g = 25; g < 185; g += 15) {
              doc.line(g, 52, g, 192);
            }
            for (let g = 62; g < 182; g += 15) {
              doc.line(15, g, 195, g);
            }

            doc.setDrawColor(0, 75, 135);
            doc.setLineWidth(1.5);
            if (selectedMachineId === 'smq-vffs-500') {
              doc.roundedRect(70, 72, 70, 85, 2, 2, 'D');
              doc.rect(80, 82, 50, 25, 'D');
              doc.line(70, 117, 140, 117);
              doc.circle(105, 137, 10, 'D');
              doc.line(105, 137, 105, 157);
            } else {
              doc.circle(105, 117, 34, 'D');
              doc.roundedRect(60, 72, 90, 95, 2, 2, 'D');
              for (let a = 0; a < 360; a += 45) {
                const rad = (a * Math.PI) / 180;
                const sx = 105 + 34 * Math.cos(rad);
                const sy = 117 + 34 * Math.sin(rad);
                doc.circle(sx, sy, 3, 'FD');
              }
            }

            doc.setDrawColor(180, 20, 20); 
            doc.setLineWidth(0.5);
            doc.line(55, 180, 155, 180);
            doc.line(55, 177, 55, 183);
            doc.line(155, 177, 155, 183);
            
            doc.setFontSize(8);
            doc.setTextColor(180, 20, 20);
            doc.setFont("helvetica", "bold");
            doc.text(activeMachine.dimensions.split('x')[0].trim() + " (ANCHO)", 105, 176, { align: 'center' });

            doc.setDrawColor(180, 20, 20);
            doc.line(165, 65, 165, 165);
            doc.line(162, 65, 168, 65);
            doc.line(162, 165, 168, 165);
            doc.text(activeMachine.dimensions.split('x')[1].trim() + " (LARGO)", 173, 117);
          }

          doc.setFontSize(7.5);
          doc.setTextColor(120, 120, 120);
          doc.setFont("helvetica", "italic");
          doc.text("* Tolerancias mínimas de paso peatonal de 1.2 metros recomendables en los cuatro flancos.", 15, 205);
          doc.text("* Puntos de alimentación eléctrica y toma neumática marcados en color azul y rojo respectivamente.", 15, 210);
        }
        else if (pageItem.id === 'terminos') {
          // PAGE 5: SALES TERMS & CAPEX RESUME
          if (backgrounds.terminos) {
            doc.addImage(backgrounds.terminos, 'JPEG', 0, 0, 210, 297);
          } else {
            drawHeaderBar(doc, "Resumen & Condiciones de Venta");
          }

          const termsRGB = hexToRgb(textColors.terminos);
          doc.setTextColor(termsRGB[0], termsRGB[1], termsRGB[2]);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("DESGLOSE COMERCIAL Y PRESUPUESTO CAPEX", 15, 38);

          doc.setFillColor(245, 247, 250);
          doc.roundedRect(15, 44, 180, 48, 2, 2, 'F');

          doc.setTextColor(40, 40, 40);
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.text("Inversión Total en Equipamiento (CAPEX):", 22, 54);
          
          doc.setTextColor(0, 75, 135);
          doc.setFontSize(13);
          doc.setFont("helvetica", "bold");
          doc.text(`$${capExTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD`, 185, 54, { align: 'right' });

          doc.setFontSize(9.5);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(100, 100, 100);
          doc.text(`Tipo de cambio cotizado: $${exchangeRate.toFixed(2)} MXN`, 22, 64);
          
          doc.setTextColor(40, 40, 40);
          doc.setFontSize(11);
          doc.setFont("helvetica", "bold");
          doc.text("Inversión Equivalente en Moneda Nacional:", 22, 78);
          
          doc.setTextColor(0, 75, 135);
          doc.setFontSize(14);
          doc.text(`$${(capExTotal * exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 })} MXN`, 185, 78, { align: 'right' });

          doc.setFontSize(11);
          doc.setTextColor(30, 30, 30);
          doc.setFont("helvetica", "bold");
          doc.text("CLÁUSULAS Y CONDICIONES COMERCIALES", 15, 108);

          const termsTable = [
            ["Plazo de Entrega Fabricación", `${deliveryWeeks} semanas a partir del depósito de anticipo.`],
            ["Esquema de Pago Convenido", `${paymentAdvance}% de Anticipo, 40% previo a embarque, ${100 - paymentAdvance}% contra comisionamiento final.`],
            ["Cobertura de Garantía SMQ", `${warrantyMonths} meses en piezas de desgaste y componentes electrónicos.`],
            ["Fletes e Instalación", "Flete incluido a pie de planta. Viáticos de ingenieros comisionadores cotizados por separado."],
            ["Pruebas de Sellado FAT", "Se requiere el envío de 500 bolsas preformadas muestra y 10 kg de producto para pruebas de sellado FAT."]
          ];

          autoTable(doc, {
            body: termsTable,
            startY: 114,
            theme: 'plain',
            bodyStyles: { fontSize: 8.5, cellPadding: 4.5 },
            columnStyles: {
              0: { fontStyle: 'bold', cellWidth: 55, textColor: [0, 75, 135] },
              1: { cellWidth: 125, textColor: [80, 80, 80] }
            },
            margin: { left: 15, right: 15 }
          });

          // Signatures
          const finalTermsY = doc.lastAutoTable.finalY + 15;
          doc.setDrawColor(200, 200, 200);
          doc.setLineWidth(0.5);
          doc.line(15, finalTermsY + 22, 75, finalTermsY + 22);
          doc.line(135, finalTermsY + 22, 195, finalTermsY + 22);

          doc.setFontSize(8.5);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(30, 30, 30);
          doc.text("INGENIERÍA COMERCIAL SMQ", 15, finalTermsY + 27);
          doc.text("ACEPTACIÓN DE PROPUESTA (CLIENTE)", 135, finalTermsY + 27);
        }
      });

      // Global page number footers on active sheets
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(150, 150, 150);
        doc.text("SMQ Industrial Systems | Think, Design, Automate", 105, 290, { align: 'center' });
        doc.text(`Página ${i} de ${pageCount}`, 195, 290, { align: 'right' });
      }

      // Save file
      const sanitizeFileName = (clientName || 'SMQ').replace(/\s+/g, '_');
      doc.save(`PROPUESTA_TECNICO_COMERCIAL_SMQ_${sanitizeFileName}.pdf`);

    } catch (error) {
      console.error("Error creating beautiful multi-page PDF:", error);
      alert("No se pudo exportar la cotización en PDF. Revisa tu consola.");
    }
  };

  return (
    <div className="min-h-screen bg-[#06080E] text-white p-6 relative overflow-hidden font-sans">
      
      {/* Decorative premium cobalt glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[#004B87]/8 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[45%] h-[45%] rounded-full bg-[#002266]/10 blur-[130px] pointer-events-none" />

      {/* Hidden inputs for uploading original high-res images */}
      <input
        type="file"
        ref={bgInputRef}
        onChange={handleBackgroundUpload}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={overlayInputRef}
        onChange={handleOverlayUpload}
        accept="image/*"
        className="hidden"
      />

      <div className="max-w-[1720px] mx-auto space-y-8 mt-2 relative z-10">
        
        {/* TOP HEADER */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between border-b border-[#141B2D] pb-6 gap-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/alpha/simulators')}
              className="p-3 bg-[#0D1424] border border-[#1E2943] hover:border-gray-500 rounded-xl hover:bg-glass hover:scale-105 transition-all text-gray-400 hover:text-white flex items-center justify-center shadow-lg"
              title="Volver al Hub"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-[#004B87]/15 border border-[#004B87]/30 flex items-center justify-center shadow-md">
                <Calculator className="w-6 h-6 text-[#00D2FF]" />
              </div>
              <div className="flex flex-col">
                <h1 className="text-2xl font-black uppercase tracking-wider text-white flex items-center gap-3 animate-fade-in">
                  Constructor de Cotizaciones SMQ
                  <span className="px-2.5 py-0.5 rounded text-[8px] font-black bg-[#004B87]/20 border border-[#004B87]/40 text-[#00D2FF] tracking-widest animate-pulse">
                    LIVE COMPOSER
                  </span>
                </h1>
                <p className="text-gray-400 text-xs font-semibold tracking-wide mt-0.5">
                  Diseña la propuesta técnico-comercial live a medida que seleccionas el equipamiento.
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={exportPDF}
              className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#004B87] hover:bg-[#003865] text-white font-black text-xs transition-all shadow-[0_4px_20px_rgba(0,75,135,0.4)] hover:scale-[1.02] active:scale-[0.98] border border-[#00D2FF]/30 cursor-pointer"
            >
              <Download className="w-4 h-4 stroke-[3] text-[#00D2FF]" />
              Exportar Cotización PDF
            </button>
          </div>
        </div>

        {/* WORKSPACE GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT COLUMN: PARAMETERS, BUILDER & LED ORDER MANAGER (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            
            {/* PANEL 0: LED PAGE EXPORT & CUSTOM ORDER MANAGER */}
            <div className="p-6 rounded-2xl bg-[#0E1524] border border-[#00D2FF]/30 space-y-5 shadow-2xl relative overflow-hidden text-left">
              <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-[#00E676]/5 blur-2xl pointer-events-none" />
              
              <h3 className="text-xs font-black uppercase tracking-widest text-[#00D2FF] flex items-center gap-2 border-b border-[#141B2D] pb-3">
                <FileCheck className="w-4 h-4 text-[#00E676] shadow-glow" /> 📑 Control y Orden de Exportación (LED)
              </h3>

              <p className="text-[10px] text-gray-400 leading-normal">
                Usa el interruptor LED brillante para activar/desactivar hojas del reporte. Utiliza las flechas para ordenar su secuencia exacta en la exportación del PDF.
              </p>

              <div className="space-y-2">
                {pagesList.map((p, index) => {
                  return (
                    <div 
                      key={p.id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                        p.enabled 
                          ? 'bg-[#0A0F1D] border-[#00E676]/30 shadow-[0_0_12px_rgba(0,230,118,0.03)]' 
                          : 'bg-[#070A12]/40 border-dashed border-[#1D253B] opacity-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {/* High-tech Physical Glowing LED indicator */}
                        <button
                          onClick={() => togglePageEnabled(p.id)}
                          className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                            p.enabled 
                              ? 'bg-[#00E676]/10 border-[#00E676] shadow-[0_0_12px_rgba(0,230,118,0.2)]' 
                              : 'bg-red-600/10 border-red-600 shadow-[0_0_8px_rgba(239,68,68,0.1)]'
                          }`}
                          title={p.enabled ? "Desactivar página" : "Activar página"}
                        >
                          <div className={`w-3 h-3 rounded-full transition-all ${
                            p.enabled 
                              ? 'bg-[#00E676] shadow-[0_0_6px_#00E676]' 
                              : 'bg-red-600 shadow-[0_0_6px_#ef4444]'
                          }`} />
                        </button>
                        
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-white tracking-wide">{p.name}</span>
                          <span className="text-[8px] text-gray-500 font-bold uppercase">
                            Secuencia: {index + 1} • {p.enabled ? 'Activo' : 'Omitido'}
                          </span>
                        </div>
                      </div>

                      {/* Ordering buttons arrows */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => movePageUp(index)}
                          disabled={index === 0}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            index === 0 
                              ? 'border-transparent text-gray-700' 
                              : 'border-[#1D253B] bg-[#070A12] text-gray-400 hover:text-white hover:border-gray-500'
                          }`}
                          title="Subir orden"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => movePageDown(index)}
                          disabled={index === pagesList.length - 1}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            index === pagesList.length - 1 
                              ? 'border-transparent text-gray-700' 
                              : 'border-[#1D253B] bg-[#070A12] text-gray-400 hover:text-white hover:border-gray-500'
                          }`}
                          title="Bajar orden"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PANEL 0.5: LAYER COMPOSITION & CUSTOM UPLOADS (DYNAMICS LAYER COMPOSER) */}
            {activePreviewTab !== 'grid' && (
              <div className="p-6 rounded-2xl bg-[#0E1524] border border-[#004B87]/40 space-y-5 shadow-2xl relative overflow-hidden text-left">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-[#00D2FF]/5 blur-2xl pointer-events-none" />
                
                <h3 className="text-xs font-black uppercase tracking-widest text-[#00D2FF] flex items-center gap-2 border-b border-[#141B2D] pb-3">
                  <Sliders className="w-4 h-4 text-[#00D2FF]" /> 🎛️ Capas de Hoja: {activePreviewTab.toUpperCase()}
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  {/* BACKGROUND COMPONENT */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">1. Imagen de Fondo (Original)</span>
                    {backgrounds[activePreviewTab] ? (
                      <div className="relative rounded-lg overflow-hidden border border-[#1E2943] bg-[#070A12] h-20 flex items-center justify-center group">
                        <img 
                          src={backgrounds[activePreviewTab]} 
                          className="w-full h-full object-cover" 
                          alt="Custom Background" 
                        />
                        <button
                          onClick={removeBackgroundImage}
                          className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-red-600/80 hover:bg-red-600 flex items-center justify-center text-white transition-all scale-0 group-hover:scale-100 shadow-md cursor-pointer"
                          title="Eliminar Fondo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => bgInputRef.current?.click()}
                        className="w-full h-20 border-2 border-dashed border-[#1E2943] hover:border-[#00D2FF] rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-white transition-all bg-[#070A12]/50 hover:bg-[#070A12] cursor-pointer"
                      >
                        <Upload className="w-4 h-4 text-[#00D2FF] mb-1.5" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Cargar Fondo</span>
                      </button>
                    )}
                  </div>

                  {/* FOREGROUND OVERLAY COMPONENT (Specific to cover page or layout page) */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">2. Imagen Superior (Original)</span>
                    {activePreviewTab === 'portada' || activePreviewTab === 'layout' ? (
                      overlays[activePreviewTab] ? (
                        <div className="relative rounded-lg overflow-hidden border border-[#1E2943] bg-[#070A12] h-20 flex items-center justify-center group">
                          <img 
                            src={overlays[activePreviewTab]} 
                            className="w-full h-full object-contain p-1" 
                            alt="Custom Overlay" 
                          />
                          <button
                            onClick={removeOverlayImage}
                            className="absolute inset-0 m-auto w-8 h-8 rounded-full bg-red-600/80 hover:bg-red-600 flex items-center justify-center text-white transition-all scale-0 group-hover:scale-100 shadow-md cursor-pointer"
                            title="Eliminar Imagen Superior"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => overlayInputRef.current?.click()}
                          className="w-full h-20 border-2 border-dashed border-[#1E2943] hover:border-[#00D2FF] rounded-lg flex flex-col items-center justify-center text-gray-400 hover:text-white transition-all bg-[#070A12]/50 hover:bg-[#070A12] cursor-pointer"
                        >
                          <ImageIcon className="w-4 h-4 text-[#00D2FF] mb-1.5" />
                          <span className="text-[9px] font-black uppercase tracking-wider">Cargar Imagen</span>
                        </button>
                      )
                    ) : (
                      <div className="h-20 border border-[#1E2943] rounded-lg bg-[#070A12]/20 flex items-center justify-center text-[8px] text-gray-500 font-bold uppercase tracking-wider px-3 text-center">
                        Overlay no disponible en esta página
                      </div>
                    )}
                  </div>
                </div>

                {/* TEXT COLOR SELECTOR */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#141B2D]">
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
                    <Palette className="w-3.5 h-3.5 text-[#00D2FF]" /> 3. Color de Textos en esta Página
                  </span>
                  <div className="flex gap-2">
                    {[
                      { name: 'Azul SMQ', value: '#004B87' },
                      { name: 'Cian Neón', value: '#00D2FF' },
                      { name: 'Negro Carbón', value: '#1E293B' },
                      { name: 'Blanco Sólido', value: '#FFFFFF' },
                      { name: 'Gris Plata', value: '#94A3B8' }
                    ].map(c => {
                      const isSelected = textColors[activePreviewTab] === c.value;
                      return (
                        <button
                          key={c.value}
                          onClick={() => setTextColors(prev => ({ ...prev, [activePreviewTab]: c.value }))}
                          className={`px-3 py-1.5 rounded-lg text-[9px] font-black tracking-wider transition-all border cursor-pointer ${
                            isSelected 
                              ? 'bg-white text-black border-white shadow-md' 
                              : 'bg-[#070A12] text-gray-400 border-[#1D253B] hover:text-white'
                          }`}
                        >
                          {c.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* POSITION SLIDERS FOR OVERLAY */}
                {overlays[activePreviewTab] && (
                  <div className="space-y-4 pt-3 border-t border-[#141B2D]">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Move className="w-3.5 h-3.5 text-[#00D2FF]" /> 4. Posición y Tamaño de Imagen Superior
                    </span>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1 text-left">
                        <div className="flex justify-between text-[9px] font-bold">
                          <span className="text-gray-400">Horizontal (X)</span>
                          <span className="text-[#00D2FF]">{overlaySettings[activePreviewTab].x}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="90"
                          value={overlaySettings[activePreviewTab].x}
                          onChange={(e) => handleSettingsChange('x', parseInt(e.target.value))}
                          className="w-full accent-[#00D2FF]"
                        />
                      </div>

                      <div className="space-y-1 text-left">
                        <div className="flex justify-between text-[9px] font-bold">
                          <span className="text-gray-400">Vertical (Y)</span>
                          <span className="text-[#00D2FF]">{overlaySettings[activePreviewTab].y}%</span>
                        </div>
                        <input
                          type="range"
                          min="0"
                          max="90"
                          value={overlaySettings[activePreviewTab].y}
                          onChange={(e) => handleSettingsChange('y', parseInt(e.target.value))}
                          className="w-full accent-[#00D2FF]"
                        />
                      </div>

                      <div className="space-y-1 text-left">
                        <div className="flex justify-between text-[9px] font-bold">
                          <span className="text-gray-400">Ancho (W)</span>
                          <span className="text-[#00D2FF]">{overlaySettings[activePreviewTab].w}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={overlaySettings[activePreviewTab].w}
                          onChange={(e) => handleSettingsChange('w', parseInt(e.target.value))}
                          className="w-full accent-[#00D2FF]"
                        />
                      </div>

                      <div className="space-y-1 text-left">
                        <div className="flex justify-between text-[9px] font-bold">
                          <span className="text-gray-400">Alto (H)</span>
                          <span className="text-[#00D2FF]">{overlaySettings[activePreviewTab].h}%</span>
                        </div>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={overlaySettings[activePreviewTab].h}
                          onChange={(e) => handleSettingsChange('h', parseInt(e.target.value))}
                          className="w-full accent-[#00D2FF]"
                        />
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* PANEL 1: CLIENT & BINDER DETAILS */}
            <div className="p-6 rounded-2xl bg-[#0B0F19] border border-[#141B2D] space-y-4 shadow-xl">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#00D2FF] flex items-center gap-2 border-b border-[#141B2D] pb-3">
                <Briefcase className="w-4 h-4 text-[#004B87]" /> Datos de Portada y Carpeta
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Número de Cotización</label>
                  <input
                    type="text"
                    value={quoteNumber}
                    onChange={(e) => setQuoteNumber(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#070A12] border border-[#1D253B] hover:border-gray-600 focus:border-[#00D2FF] focus:outline-none text-white transition-all text-xs font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Nombre del Cliente</label>
                  <input
                    type="text"
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#070A12] border border-[#1D253B] hover:border-gray-600 focus:border-[#00D2FF] focus:outline-none text-white transition-all text-xs font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1.5 sm:col-span-2 text-left">
                  <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Empresa / Razón Social</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#070A12] border border-[#1D253B] hover:border-gray-600 focus:border-[#00D2FF] focus:outline-none text-white transition-all text-xs font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">Nombre del Proyecto</label>
                  <input
                    type="text"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#070A12] border border-[#1D253B] hover:border-gray-600 focus:border-[#00D2FF] focus:outline-none text-white transition-all text-xs font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1.5 text-left">
                  <label className="text-[9px] uppercase font-bold text-gray-400 tracking-wider">T.C. Estimado (MXN/USD)</label>
                  <input
                    type="number"
                    step="0.05"
                    value={exchangeRate}
                    onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 1)}
                    className="w-full px-4 py-2.5 rounded-lg bg-[#070A12] border border-[#1D253B] hover:border-gray-600 focus:border-[#00D2FF] focus:outline-none text-white transition-all text-xs font-bold"
                  />
                </div>
              </div>
            </div>

            {/* PANEL 2: MACHINERY BUNDLE BUILDER */}
            <div className="p-6 rounded-2xl bg-[#0B0F19] border border-[#141B2D] space-y-4 shadow-xl">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#00D2FF] flex items-center gap-2 border-b border-[#141B2D] pb-3">
                <Layers className="w-4 h-4 text-[#004B87]" /> 1. Selección de Maquinaria Principal
              </h3>
              
              <div className="space-y-3">
                {MACHINE_TYPES.map(m => {
                  const isSelected = selectedMachineId === m.id;
                  return (
                    <div
                      key={m.id}
                      onClick={() => setSelectedMachineId(m.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-4 ${
                        isSelected 
                          ? 'bg-[#0E1524] border-[#00D2FF]/40 shadow-[0_0_15px_rgba(0,210,255,0.06)]' 
                          : 'bg-[#070A12]/60 border-[#1D253B] hover:border-gray-700 hover:bg-[#070A12]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-all ${
                        isSelected ? 'bg-[#00D2FF] border-[#00D2FF]' : 'border-gray-600'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-black stroke-[3.5]" />}
                      </div>
                      <div className="flex-grow space-y-1 text-left">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-white uppercase tracking-wider">{m.name}</span>
                          <span className="text-[10px] font-extrabold text-[#00D2FF]">${m.basePrice.toLocaleString()} USD</span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-normal">{m.desc}</p>
                        <div className="flex gap-2 pt-1">
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-white/5 text-gray-400 border border-white/10 tracking-widest uppercase">
                            {m.tag}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PANEL 3: DOSER SYSTEM */}
            <div className="p-6 rounded-2xl bg-[#0B0F19] border border-[#141B2D] space-y-4 shadow-xl">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#00D2FF] flex items-center gap-2 border-b border-[#141B2D] pb-3">
                <Settings className="w-4 h-4 text-[#004B87]" /> 2. Módulo de Dosificación e Inyección
              </h3>

              <div className="space-y-3">
                {DOSER_TYPES.map(d => {
                  const isSelected = selectedDoserId === d.id;
                  return (
                    <div
                      key={d.id}
                      onClick={() => setSelectedDoserId(d.id)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-start gap-4 ${
                        isSelected 
                          ? 'bg-[#0E1524] border-[#00D2FF]/40 shadow-[0_0_15px_rgba(0,210,255,0.06)]' 
                          : 'bg-[#070A12]/60 border-[#1D253B] hover:border-gray-700 hover:bg-[#070A12]'
                      }`}
                    >
                      <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-1 transition-all ${
                        isSelected ? 'bg-[#00D2FF] border-[#00D2FF]' : 'border-gray-600'
                      }`}>
                        {isSelected && <Check className="w-3 h-3 text-black stroke-[3.5]" />}
                      </div>
                      <div className="flex-grow space-y-1 text-left">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-black text-white uppercase tracking-wider">{d.name}</span>
                          <span className="text-[10px] font-extrabold text-[#00D2FF]">+${d.price.toLocaleString()} USD</span>
                        </div>
                        <p className="text-[10px] text-gray-400 leading-normal">{d.desc}</p>
                        <div className="flex gap-2 pt-1">
                          <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-[#004B87]/20 text-[#00D2FF] border border-[#004B87]/40">
                            Precisión: {d.accuracy}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PANEL 4: AUXILIARIES */}
            <div className="p-6 rounded-2xl bg-[#0B0F19] border border-[#141B2D] space-y-4 shadow-xl">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#00D2FF] flex items-center gap-2 border-b border-[#141B2D] pb-3">
                <Zap className="w-4 h-4 text-[#004B87]" /> 3. Equipamiento Auxiliar / Opciones HACCP
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {AUXILIARY_MODULES.map(m => {
                  const isChecked = activeAuxModules[m.id];
                  return (
                    <div
                      key={m.id}
                      onClick={() => {
                        setActiveAuxModules(prev => ({
                          ...prev,
                          [m.id]: !prev[m.id]
                        }));
                      }}
                      className={`p-3 rounded-xl border flex justify-between items-start cursor-pointer transition-all ${
                        isChecked 
                          ? 'bg-[#0E1524] border-[#00D2FF]/40' 
                          : 'bg-[#070A12]/60 border-[#1D253B] hover:border-gray-700 hover:bg-[#070A12]'
                      }`}
                    >
                      <div className="space-y-1 pr-1 text-left">
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-md border flex items-center justify-center transition-all shrink-0 ${
                            isChecked ? 'bg-[#00D2FF] border-[#00D2FF]' : 'border-gray-600 bg-transparent'
                          }`}>
                            {isChecked && <Check className="w-2.5 h-2.5 text-black stroke-[3.5]" />}
                          </div>
                          <span className="text-[11px] font-bold text-white tracking-wide">{m.name}</span>
                        </div>
                        <p className="text-[9px] text-gray-500 leading-tight">
                          {m.desc}
                        </p>
                      </div>

                      <div className="flex flex-col items-end gap-0.5 shrink-0">
                        <span className="text-[10px] font-black text-[#00D2FF]">
                          +${m.price.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* PANEL 5: OPERATIONAL SCENARIOS */}
            <div className="p-6 rounded-2xl bg-[#0B0F19] border border-[#141B2D] space-y-4 shadow-xl">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#00D2FF] flex items-center gap-2 border-b border-[#141B2D] pb-3">
                <Gauge className="w-4 h-4 text-[#004B87]" /> 4. Parámetros Operativos e Insumos
              </h3>

              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-wider">
                    <span className="text-gray-400">Velocidad de Operación</span>
                    <span className="text-[#00D2FF]">{speedPPM} bolsas/min</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max={activeMachine.maxSpeed}
                    value={speedPPM}
                    onChange={(e) => setSpeedPPM(parseInt(e.target.value))}
                    className="w-full accent-[#00D2FF]"
                  />
                  <div className="flex justify-between text-[8px] text-gray-500 font-bold">
                    <span>10 ppm</span>
                    <span>Máx: {activeMachine.maxSpeed} ppm</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] uppercase font-bold text-gray-400">Horas Operación / Día</label>
                    <input
                      type="number"
                      value={hoursPerDay}
                      onChange={(e) => setHoursPerDay(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg bg-[#070A12] border border-[#1D253B] focus:border-[#00D2FF] focus:outline-none text-white text-xs font-bold"
                    />
                  </div>
                  <div className="flex flex-col gap-1 text-left">
                    <label className="text-[9px] uppercase font-bold text-gray-400">Días Operación / Año</label>
                    <input
                      type="number"
                      value={daysPerYear}
                      onChange={(e) => setDaysPerYear(parseInt(e.target.value) || 0)}
                      className="w-full px-3 py-2 rounded-lg bg-[#070A12] border border-[#1D253B] focus:border-[#00D2FF] focus:outline-none text-white text-xs font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* PANEL 6: COMMERCIAL CLAUSES */}
            <div className="p-6 rounded-2xl bg-[#0B0F19] border border-[#141B2D] space-y-4 shadow-xl">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#00D2FF] flex items-center gap-2 border-b border-[#141B2D] pb-3">
                <FileCheck className="w-4 h-4 text-[#004B87]" /> 5. Cláusulas y Condiciones Comerciales
              </h3>

              <div className="grid grid-cols-3 gap-3">
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[8px] uppercase font-bold text-gray-400">Plazo Fabricación (Semanas)</label>
                  <input
                    type="number"
                    value={deliveryWeeks}
                    onChange={(e) => setDeliveryWeeks(parseInt(e.target.value) || 1)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070A12] border border-[#1D253B] focus:border-[#00D2FF] focus:outline-none text-white text-xs font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[8px] uppercase font-bold text-gray-400">Anticipo (%)</label>
                  <input
                    type="number"
                    max="90"
                    min="10"
                    value={paymentAdvance}
                    onChange={(e) => setPaymentAdvance(parseInt(e.target.value) || 50)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070A12] border border-[#1D253B] focus:border-[#00D2FF] focus:outline-none text-white text-xs font-bold"
                  />
                </div>
                <div className="flex flex-col gap-1 text-left">
                  <label className="text-[8px] uppercase font-bold text-gray-400">Meses Garantía</label>
                  <input
                    type="number"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(parseInt(e.target.value) || 12)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070A12] border border-[#1D253B] focus:border-[#00D2FF] focus:outline-none text-white text-xs font-bold"
                  />
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: DOCUMENT PREVIEWER WORKSPACE (7 cols) */}
          <div className="lg:col-span-7 space-y-6 flex flex-col h-full justify-between">
            
            {/* DOCUMENT PAGES NAV TABS */}
            <div className="flex flex-wrap bg-[#0B0F19] p-2 rounded-2xl border border-[#141B2D] gap-1.5 shadow-md">
              <button
                onClick={() => setActivePreviewTab('portada')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  activePreviewTab === 'portada' ? 'bg-[#004B87] text-white shadow-lg border border-[#00D2FF]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Layers2 className="w-4 h-4 text-[#00D2FF]" />
                1. Portada
              </button>
              <button
                onClick={() => setActivePreviewTab('carta')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  activePreviewTab === 'carta' ? 'bg-[#004B87] text-white shadow-lg border border-[#00D2FF]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileText className="w-4 h-4 text-[#00D2FF]" />
                2. Carta
              </button>
              <button
                onClick={() => setActivePreviewTab('tecnica')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  activePreviewTab === 'tecnica' ? 'bg-[#004B87] text-white shadow-lg border border-[#00D2FF]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-[#00D2FF]" />
                3. Datos Técnicos
              </button>
              <button
                onClick={() => setActivePreviewTab('layout')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  activePreviewTab === 'layout' ? 'bg-[#004B87] text-white shadow-lg border border-[#00D2FF]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Globe className="w-4 h-4 text-[#00D2FF]" />
                4. Layout
              </button>
              <button
                onClick={() => setActivePreviewTab('terminos')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  activePreviewTab === 'terminos' ? 'bg-[#004B87] text-white shadow-lg border border-[#00D2FF]/20' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Signature className="w-4 h-4 text-[#00D2FF]" />
                5. Condiciones
              </button>
              <div className="flex-grow" />
              <button
                onClick={() => setActivePreviewTab('grid')}
                className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                  activePreviewTab === 'grid' ? 'bg-[#00D2FF] text-black shadow-lg' : 'text-gray-400 hover:text-white hover:bg-white/5'
                }`}
              >
                <Grid className="w-4 h-4" />
                Vista Carpeta
              </button>
            </div>

            {/* LIVE PREVIEW AREA WITH REAL SHEETS PRESENTATION */}
            <div className="flex-grow flex items-center justify-center p-4 rounded-2xl bg-[#030508] border border-[#141B2D] min-h-[720px] shadow-inner relative overflow-y-auto max-h-[85vh]">
              
              {/* PAGE SHEETS CONTAINER */}
              <div className="w-full h-full flex flex-col items-center justify-start py-8 gap-12">
                
                {/* -------------------- PAGE 1: PORTADA PREVIEW -------------------- */}
                {(activePreviewTab === 'portada' || activePreviewTab === 'grid') && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-[595px] h-[842px] bg-white text-[#1E293B] shadow-[0_25px_60px_rgba(0,0,0,0.7)] rounded-xl relative overflow-hidden flex flex-col justify-between p-12 select-none border border-white/10"
                    style={{ aspectRatio: '1/1.414' }}
                  >
                    {/* Background rendering: Custom image if uploaded, else standard vector lines */}
                    {backgrounds.portada ? (
                      <img 
                        src={backgrounds.portada} 
                        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0" 
                        alt="Custom cover background" 
                      />
                    ) : (
                      <div 
                        className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
                        style={{
                          background: 'radial-gradient(circle at 85% 20%, rgba(240, 244, 252, 0.4) 0%, transparent 70%)'
                        }}
                      >
                        <div 
                          className="absolute top-0 left-0 w-[240px] h-[130px] bg-white"
                          style={{ clipPath: 'polygon(0 0, 100% 0, 80% 100%, 0 100%)' }}
                        />
                        
                        <div 
                          className="absolute top-0 left-0 w-[300px] h-[610px] bg-[#004B87]"
                          style={{
                            clipPath: 'polygon(0 145px, 200px 145px, 250px 420px, 200px 490px, 300px 550px, 50px 610px, 0 610px)',
                            filter: 'drop-shadow(5px 15px 30px rgba(0,75,135,0.4))'
                          }}
                        />
                        
                        <div 
                          className="absolute top-0 left-0 w-[240px] h-[610px] bg-[#002266]"
                          style={{
                            clipPath: 'polygon(0 200px, 150px 200px, 195px 370px, 140px 420px, 240px 530px, 0 595px)'
                          }}
                        />

                        <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 595 842" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M 200 145 L 250 420 L 200 490 L 300 550 L 50 610" stroke="#00D2FF" strokeWidth="3" strokeLinecap="round" />
                        </svg>
                        
                        <div 
                          className="absolute top-[130px] right-[40px] w-[140px] h-[350px] opacity-15"
                          style={{
                            backgroundImage: 'radial-gradient(rgba(0, 75, 135, 0.4) 1px, transparent 1.5px)',
                            backgroundSize: '8px 8px'
                          }}
                        />
                      </div>
                    )}

                    {/* FOREGROUND OVERLAY IMAGE EN CIMA */}
                    {overlays.portada && (
                      <img 
                        src={overlays.portada} 
                        className="absolute object-contain pointer-events-none z-10 shadow-xl rounded-lg"
                        style={{
                          left: `${overlaySettings.portada.x}%`,
                          top: `${overlaySettings.portada.y}%`,
                          width: `${overlaySettings.portada.w}%`,
                          height: `${overlaySettings.portada.h}%`,
                          transform: 'translate(-50%, -50%)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                        alt="Foreground cover overlay" 
                      />
                    )}

                    {/* TOP HEADER LABELS */}
                    {!backgrounds.portada && (
                      <div className="flex justify-between items-start z-10">
                        <div className="flex flex-col text-left">
                          <span className="text-3xl font-black text-[#004B87] tracking-tight">SMQ</span>
                          <span className="text-[7px] font-bold text-[#004B87] tracking-widest mt-0.5">WELCOME TO THE FUTURE</span>
                          <div className="w-10 h-[2px] bg-[#00D2FF] mt-2" />
                        </div>
                        
                        <div className="flex items-center gap-2.5 text-right">
                          <div className="w-[1.5px] h-9 bg-[#004B87]" />
                          <div className="flex flex-col text-[8.5px] font-bold tracking-wider text-gray-500 uppercase">
                            <span>THINK.</span>
                            <span>DESIGN.</span>
                            <span className="text-[#004B87] font-extrabold">AUTOMATE.</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* CENTER COVER TITLES & CUSTOMER DYNAMIC INFO */}
                    {!backgrounds.portada && (
                      <div className="flex flex-col items-center z-10 mt-[230px] space-y-2">
                        <h1 
                          className="text-[44px] font-black tracking-tight leading-none uppercase"
                          style={{ color: textColors.portada }}
                        >
                          COTIZACIÓN
                        </h1>
                        <p 
                          className="text-sm font-semibold tracking-[0.2em]"
                          style={{ color: `${textColors.portada}CC` }}
                        >
                          Y DATOS TÉCNICOS
                        </p>
                        <div 
                          className="w-14 h-[3.5px] mt-2 rounded-full shadow-lg" 
                          style={{ backgroundColor: textColors.portada }}
                        />
                      </div>
                    )}

                    {/* DYNAMIC DATA PILLS AT THE BOTTOM */}
                    <div className={`grid grid-cols-4 gap-2 z-10 pt-4 mt-[80px] ${!backgrounds.portada ? 'border-t border-gray-100' : ''}`}>
                      <div className="flex flex-col items-center space-y-1">
                        {!backgrounds.portada && (
                          <span className="text-[7.5px] font-bold text-gray-400 tracking-wider flex items-center gap-1">
                            <FileText className="w-3 h-3 text-[#004B87]" /> COTIZACIÓN
                          </span>
                        )}
                        <span className="text-[9.5px] font-extrabold text-[#1E293B] truncate max-w-[130px] uppercase">{quoteNumber}</span>
                        {!backgrounds.portada && <div className="w-6 h-[1.5px] mt-1" style={{ backgroundColor: textColors.portada }} />}
                      </div>
                      <div className="flex flex-col items-center space-y-1">
                        {!backgrounds.portada && (
                          <span className="text-[7.5px] font-bold text-gray-400 tracking-wider flex items-center gap-1">
                            <User className="w-3 h-3 text-[#004B87]" /> CLIENTE
                          </span>
                        )}
                        <span className="text-[9.5px] font-extrabold text-[#1E293B] truncate max-w-[130px] uppercase">{clientName}</span>
                        {!backgrounds.portada && <div className="w-6 h-[1.5px] mt-1" style={{ backgroundColor: textColors.portada }} />}
                      </div>
                      <div className="flex flex-col items-center space-y-1">
                        {!backgrounds.portada && (
                          <span className="text-[7.5px] font-bold text-gray-400 tracking-wider flex items-center gap-1">
                            <Building className="w-3 h-3 text-[#004B87]" /> EMPRESA
                          </span>
                        )}
                        <span className="text-[9.5px] font-extrabold text-[#1E293B] truncate max-w-[130px] uppercase">
                          {companyName.length > 15 ? companyName.slice(0, 13) + '...' : companyName}
                        </span>
                        {!backgrounds.portada && <div className="w-6 h-[1.5px] mt-1" style={{ backgroundColor: textColors.portada }} />}
                      </div>
                      <div className="flex flex-col items-center space-y-1">
                        {!backgrounds.portada && (
                          <span className="text-[7.5px] font-bold text-gray-400 tracking-wider flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-[#004B87]" /> FECHA
                          </span>
                        )}
                        <span className="text-[9.5px] font-extrabold text-[#1E293B] truncate max-w-[130px] uppercase">{formattedDate.split('DE')[0]}</span>
                        {!backgrounds.portada && <div className="w-6 h-[1.5px] mt-1" style={{ backgroundColor: textColors.portada }} />}
                      </div>
                    </div>

                    {/* STYLIZED COVER FOOTER WITH BRAND TRA PEZOIDS */}
                    {!backgrounds.portada && (
                      <div className="absolute bottom-0 left-0 w-full h-[50px] pointer-events-none z-10">
                        <div 
                          className="absolute bottom-0 left-0 w-[190px] h-[34px] bg-[#004B87] flex items-center pl-10"
                          style={{ clipPath: 'polygon(0 0, 160px 0, 190px 100%, 0 100%)' }}
                        >
                          <span className="text-white text-[8.5px] font-bold tracking-wider flex items-center gap-1.5 pt-2">
                            <Globe className="w-3 h-3 text-[#00D2FF]" /> www.smq.mx
                          </span>
                        </div>
                        
                        <div 
                          className="absolute bottom-0 right-0 w-[140px] h-[24px] bg-[#002266]"
                          style={{ clipPath: 'polygon(30px 0, 100% 0, 100% 100%, 0 100%)' }}
                        />
                      </div>
                    )}

                  </motion.div>
                )}

                {/* -------------------- PAGE 2: LETTER PREVIEW -------------------- */}
                {(activePreviewTab === 'carta' || activePreviewTab === 'grid') && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-[595px] h-[842px] bg-white text-[#1E293B] shadow-[0_25px_60px_rgba(0,0,0,0.7)] rounded-xl relative overflow-hidden flex flex-col justify-between p-12 border border-white/10 text-left"
                    style={{ aspectRatio: '1/1.414' }}
                  >
                    {backgrounds.carta && (
                      <img src={backgrounds.carta} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0" alt="Carta background" />
                    )}

                    <div className="space-y-6 flex-grow z-10 relative">
                      
                      {/* HEADER BLACK BAR */}
                      <div className="flex justify-between items-center pb-3 border-b-2" style={{ borderColor: textColors.carta }}>
                        <div className="flex flex-col">
                          <span className="text-xl font-black text-[#1E293B] tracking-tight leading-none">SMQ</span>
                          <span className="text-[6px] text-gray-500 font-bold tracking-widest mt-1">INDUSTRIAL SYSTEMS</span>
                        </div>
                        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: textColors.carta }}>CARTA DE PRESENTACIÓN</span>
                      </div>

                      {/* META DETAILS BOX */}
                      <div className="p-4 bg-gray-50 rounded-xl space-y-1.5 text-xs text-[#334155] border border-gray-100">
                        <div><strong style={{ color: textColors.carta }}>PROYECTO:</strong> {projectName.toUpperCase()}</div>
                        <div><strong style={{ color: textColors.carta }}>COTIZACIÓN NÚMERO:</strong> {quoteNumber}</div>
                        <div><strong style={{ color: textColors.carta }}>FECHA DE EMISIÓN:</strong> {formattedDate}</div>
                      </div>

                      {/* DYNAMIC PRESENTATION LETTER CONTENT */}
                      <div className="text-[10.5px] leading-relaxed text-gray-600 space-y-4">
                        <textarea
                          value={presentationLetter}
                          onChange={(e) => setPresentationLetter(e.target.value)}
                          className="w-full h-[380px] bg-transparent border border-dashed border-gray-200 hover:border-gray-400 focus:border-[#00D2FF] focus:outline-none p-3 rounded-lg text-[10.5px] leading-relaxed text-gray-600 font-normal resize-none"
                          title="Haz clic para editar la carta en vivo"
                        />
                      </div>

                      {/* SIGNATURE FIELDS */}
                      <div className="grid grid-cols-2 gap-8 pt-8">
                        <div className="space-y-4">
                          <div className="h-[1px] bg-gray-200" />
                          <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">INGENIERÍA DE APLICACIONES SMQ</div>
                        </div>
                        <div className="space-y-4">
                          <div className="h-[1px] bg-gray-200" />
                          <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">ACEPTACIÓN DE PROPUESTA (CLIENTE)</div>
                        </div>
                      </div>

                    </div>

                    {/* BRAND SHEET FOOTER */}
                    <div className="flex justify-between items-center text-[7px] text-gray-400 pt-4 border-t border-gray-100 z-10">
                      <span>www.smq.mx | Think, Design, Automate</span>
                      <span>Página 2 de 5</span>
                    </div>

                  </motion.div>
                )}

                {/* -------------------- PAGE 3: SPECIFICATIONS PREVIEW -------------------- */}
                {(activePreviewTab === 'tecnica' || activePreviewTab === 'grid') && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-[595px] h-[842px] bg-white text-[#1E293B] shadow-[0_25px_60px_rgba(0,0,0,0.7)] rounded-xl relative overflow-hidden flex flex-col justify-between p-12 border border-white/10 text-left"
                    style={{ aspectRatio: '1/1.414' }}
                  >
                    {backgrounds.tecnica && (
                      <img src={backgrounds.tecnica} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0" alt="Tecnica background" />
                    )}

                    <div className="space-y-6 flex-grow z-10 relative">
                      
                      {/* HEADER BLACK BAR */}
                      <div className="flex justify-between items-center pb-3 border-b-2" style={{ borderColor: textColors.tecnica }}>
                        <div className="flex flex-col">
                          <span className="text-xl font-black text-[#1E293B] tracking-tight leading-none">SMQ</span>
                          <span className="text-[6px] text-gray-500 font-bold tracking-widest mt-1">INDUSTRIAL SYSTEMS</span>
                        </div>
                        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: textColors.tecnica }}>DATOS TÉCNICOS & CAPEX</span>
                      </div>

                      {/* SECTION 1: SPECIFICATIONS GRID */}
                      <div className="space-y-2.5">
                        <h3 className="text-[10.5px] font-black uppercase tracking-wider border-l-2 pl-2" style={{ color: textColors.tecnica, borderLeftColor: textColors.tecnica }}>
                          1. Especificaciones Físicas y de Red del Sistema
                        </h3>

                        <div className="grid grid-cols-2 gap-2 text-[9px] text-[#475569]">
                          <div className="p-2 rounded-lg bg-gray-50 flex justify-between border border-gray-100">
                            <strong className="text-gray-500">Máquina base:</strong>
                            <span>{activeMachine.name}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-50 flex justify-between border border-gray-100">
                            <strong className="text-gray-500">Dosificador:</strong>
                            <span>{activeDoser.name}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-50 flex justify-between border border-gray-100">
                            <strong className="text-gray-500">Velocidad:</strong>
                            <span>{speedPPM} bolsas/min</span>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-50 flex justify-between border border-gray-100">
                            <strong className="text-gray-500">Carga Potencia:</strong>
                            <span>{powerTotal.toFixed(2)} kW</span>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-50 flex justify-between border border-gray-100">
                            <strong className="text-gray-500">Huella Dimensiones:</strong>
                            <span>{activeMachine.dimensions}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-50 flex justify-between border border-gray-100">
                            <strong className="text-gray-500">Peso Total:</strong>
                            <span>{activeMachine.weight}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-50 flex justify-between border border-gray-100">
                            <strong className="text-gray-500">Suministro Aire:</strong>
                            <span>{activeMachine.airConsumption}</span>
                          </div>
                          <div className="p-2 rounded-lg bg-gray-50 flex justify-between border border-gray-100">
                            <strong className="text-gray-500">Material Chasis:</strong>
                            <span>Acero Inoxidable AISI 304</span>
                          </div>
                        </div>
                      </div>

                      {/* SECTION 2: CAPEX BUNDLE ITEMIZED TABLE */}
                      <div className="space-y-2.5 flex-grow">
                        <h3 className="text-[10.5px] font-black uppercase tracking-wider border-l-2 pl-2" style={{ color: textColors.tecnica, borderLeftColor: textColors.tecnica }}>
                          2. Desglose Detallado del Equipamiento Seleccionado
                        </h3>

                        <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm bg-white">
                          <table className="w-full text-left text-[9px] border-collapse">
                            <thead>
                              <tr className="bg-[#004B87] text-white font-bold uppercase tracking-wider text-[8px]">
                                <th className="p-2.5">Componente Bundle</th>
                                <th className="p-2.5">Especificación Técnica</th>
                                <th className="p-2.5 text-right">Inversión (USD)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-600">
                              <tr>
                                <td className="p-2.5 font-bold text-[#1E293B]">{activeMachine.name}</td>
                                <td className="p-2.5 text-gray-500">{activeMachine.desc.slice(0, 75)}...</td>
                                <td className="p-2.5 text-right font-bold text-[#004B87]">${activeMachine.basePrice.toLocaleString()}</td>
                              </tr>
                              <tr>
                                <td className="p-2.5 font-bold text-[#1E293B]">{activeDoser.name}</td>
                                <td className="p-2.5 text-gray-500">Precisión de llenado {activeDoser.accuracy}. Tiempo lavado: {activeDoser.cleanTime}.</td>
                                <td className="p-2.5 text-right font-bold text-[#004B87]">${activeDoser.price.toLocaleString()}</td>
                              </tr>
                              {Object.keys(activeAuxModules).map(modId => {
                                if (activeAuxModules[modId]) {
                                  const mod = AUXILIARY_MODULES.find(m => m.id === modId);
                                  if (mod) {
                                    return (
                                      <tr key={mod.id}>
                                        <td className="p-2.5 font-bold text-[#1E293B]">{mod.name}</td>
                                        <td className="p-2.5 text-gray-500">{mod.desc}</td>
                                        <td className="p-2.5 text-right font-bold text-[#004B87]">${mod.price.toLocaleString()}</td>
                                      </tr>
                                    );
                                  }
                                }
                                return null;
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>

                    </div>

                    {/* BRAND SHEET FOOTER */}
                    <div className="flex justify-between items-center text-[7px] text-gray-400 pt-4 border-t border-gray-100 z-10">
                      <span>www.smq.mx | Think, Design, Automate</span>
                      <span>Página 3 de 5</span>
                    </div>

                  </motion.div>
                )}

                {/* -------------------- PAGE 4: LAYOUT PREVIEW -------------------- */}
                {(activePreviewTab === 'layout' || activePreviewTab === 'grid') && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-[595px] h-[842px] bg-white text-[#1E293B] shadow-[0_25px_60px_rgba(0,0,0,0.7)] rounded-xl relative overflow-hidden flex flex-col justify-between p-12 border border-white/10 text-left"
                    style={{ aspectRatio: '1/1.414' }}
                  >
                    {backgrounds.layout && (
                      <img src={backgrounds.layout} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0" alt="Layout background" />
                    )}

                    {overlays.layout && (
                      <img 
                        src={overlays.layout} 
                        className="absolute object-contain pointer-events-none z-10 shadow-xl rounded-lg"
                        style={{
                          left: `${overlaySettings.layout.x}%`,
                          top: `${overlaySettings.layout.y}%`,
                          width: `${overlaySettings.layout.w}%`,
                          height: `${overlaySettings.layout.h}%`,
                          transform: 'translate(-50%, -50%)',
                          border: '1px solid rgba(255, 255, 255, 0.2)'
                        }}
                        alt="Layout overlay graphic" 
                      />
                    )}

                    <div className="space-y-6 flex-grow z-10 relative">
                      
                      {/* HEADER BLACK BAR */}
                      <div className="flex justify-between items-center pb-3 border-b-2" style={{ borderColor: textColors.layout }}>
                        <div className="flex flex-col">
                          <span className="text-xl font-black text-[#1E293B] tracking-tight leading-none">SMQ</span>
                          <span className="text-[6px] text-gray-500 font-bold tracking-widest mt-1">INDUSTRIAL SYSTEMS</span>
                        </div>
                        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: textColors.layout }}>LAYOUT & PLANO DE CIMENTACIÓN</span>
                      </div>

                      {/* DESCRIPTION */}
                      <div className="space-y-2">
                        <h3 className="text-[10.5px] font-black uppercase tracking-wider border-l-2 pl-2" style={{ color: textColors.layout, borderLeftColor: textColors.layout }}>
                          Huella de Cimentación y Espacio Operativo Requerido
                        </h3>
                        <p className="text-[9px] text-gray-500 leading-normal">
                          {activeMachine.layoutDesc} Las tolerancias de paso recomendadas aseguran que sus operadores y personal de mantenimiento realicen ajustes y saneamiento con absoluta comodidad y resguardo normativo.
                        </p>
                      </div>

                      {/* LAYOUT VECTOR DESIGN GRID BOX */}
                      {!backgrounds.layout && (
                        <div className="border-2 border-dashed border-gray-200 rounded-2xl flex-grow h-[360px] bg-gray-50 relative flex items-center justify-center p-8 overflow-hidden shadow-inner">
                          
                          <div 
                            className="absolute inset-0 opacity-10 pointer-events-none"
                            style={{
                              backgroundImage: 'linear-gradient(to right, #004B87 1px, transparent 1px), linear-gradient(to bottom, #004B87 1px, transparent 1px)',
                              backgroundSize: '15px 15px'
                            }}
                          />

                          {selectedMachineId === 'smq-vffs-500' ? (
                            <div className="w-[180px] h-[220px] border-4 border-[#004B87] bg-white rounded-xl relative flex flex-col justify-between p-4 shadow-md">
                              <div className="w-full h-8 border-2 border-gray-300 rounded flex items-center justify-center text-[7px] font-bold text-gray-400">FEEDER HULL</div>
                              <div className="w-full h-24 border-2 border-dashed border-gray-300 flex items-center justify-center">
                                <div className="w-16 h-16 rounded-full border-4 border-[#004B87] border-double flex items-center justify-center">
                                  <span className="text-[8px] font-black text-[#004B87]">VFFS ROLL</span>
                                </div>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[6px] text-gray-400 font-bold">1,800 mm</span>
                                <span className="text-[6px] text-gray-400 font-bold">2,400 mm</span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-[240px] h-[240px] border-4 border-[#004B87] bg-white rounded-xl relative flex items-center justify-center shadow-md">
                              <div className="w-[170px] h-[170px] rounded-full border-4 border-[#004B87] border-double relative flex items-center justify-center">
                                <span className="text-[9px] font-black text-[#004B87] uppercase tracking-wider">{activeMachine.stations} Estaciones</span>
                                
                                {[...Array(activeMachine.stations)].map((_, i) => {
                                  const angle = (i * 360) / activeMachine.stations;
                                  return (
                                    <div
                                      key={i}
                                      className="absolute w-4 h-4 rounded-full bg-[#00D2FF] border border-[#004B87] flex items-center justify-center text-[8px] font-black text-black shadow-sm"
                                      style={{
                                        transform: `rotate(${angle}deg) translate(85px) rotate(-${angle}deg)`
                                      }}
                                    >
                                      {i + 1}
                                    </div>
                                  );
                                })}
                              </div>
                              
                              <div className="absolute left-2 bottom-2 text-[7px] text-[#004B87] font-black">{activeMachine.dimensions}</div>
                            </div>
                          )}

                          <div className="absolute left-6 top-1/2 -translate-y-1/2 h-[70%] w-0 border-l border-red-500 flex flex-col justify-between items-center text-[7px] font-bold text-red-500 pl-1">
                            <div className="w-1.5 h-[1px] bg-red-500" />
                            <span className="rotate-90 origin-left">LARGO</span>
                            <div className="w-1.5 h-[1px] bg-red-500" />
                          </div>
                          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[70%] h-0 border-t border-red-500 flex justify-between items-center text-[7px] font-bold text-red-500 pt-1">
                            <div className="h-1.5 w-[1px] bg-red-500" />
                            <span>ANCHO</span>
                            <div className="h-1.5 w-[1px] bg-red-500" />
                          </div>

                        </div>
                      )}

                      <div className="text-[7.5px] text-gray-400 italic space-y-0.5 z-10">
                        <div>* Dimensiones mostradas son nominales. Un plano AutoCAD oficial será enviado al concluir la firma de contrato.</div>
                        <div>* Se requiere alimentación eléctrica trifásica estable 220V/440V en la toma designada.</div>
                      </div>

                    </div>

                    {/* BRAND SHEET FOOTER */}
                    <div className="flex justify-between items-center text-[7px] text-gray-400 pt-4 border-t border-gray-100 z-10">
                      <span>www.smq.mx | Think, Design, Automate</span>
                      <span>Página 4 de 5</span>
                    </div>

                  </motion.div>
                )}

                {/* -------------------- PAGE 5: COMMERCIAL TERMS PREVIEW -------------------- */}
                {(activePreviewTab === 'terminos' || activePreviewTab === 'grid') && (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-[595px] h-[842px] bg-white text-[#1E293B] shadow-[0_25px_60px_rgba(0,0,0,0.7)] rounded-xl relative overflow-hidden flex flex-col justify-between p-12 border border-white/10 text-left"
                    style={{ aspectRatio: '1/1.414' }}
                  >
                    {backgrounds.terminos && (
                      <img src={backgrounds.terminos} className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0" alt="Terminos background" />
                    )}

                    <div className="space-y-6 flex-grow z-10 relative">
                      
                      {/* HEADER BLACK BAR */}
                      <div className="flex justify-between items-center pb-3 border-b-2" style={{ borderColor: textColors.terminos }}>
                        <div className="flex flex-col">
                          <span className="text-xl font-black text-[#1E293B] tracking-tight leading-none">SMQ</span>
                          <span className="text-[6px] text-gray-500 font-bold tracking-widest mt-1">INDUSTRIAL SYSTEMS</span>
                        </div>
                        <span className="text-[10px] font-black tracking-widest uppercase" style={{ color: textColors.terminos }}>RESUMEN & CONDICIONES</span>
                      </div>

                      {/* FINANCIAL RESUME BUNDLE */}
                      <div className="space-y-2.5">
                        <h3 className="text-[10.5px] font-black uppercase tracking-wider border-l-2 pl-2" style={{ color: textColors.terminos, borderLeftColor: textColors.terminos }}>
                          Desglose Comercial e Inversión Total Capex
                        </h3>

                        <div className="p-4 bg-gray-50 rounded-xl space-y-4 border border-gray-100 bg-white">
                          
                          <div className="flex justify-between items-center border-b border-gray-200/60 pb-3">
                            <span className="text-[10px] font-bold text-gray-500">Inversión Total en Maquinaria (CapEx USD):</span>
                            <span className="text-sm font-extrabold text-[#004B87]">${capExTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} USD</span>
                          </div>

                          <div className="flex justify-between items-center">
                            <div className="flex flex-col">
                              <span className="text-[10.5px] font-black text-gray-800">Inversión Equivalente en MXN (Con IVA):</span>
                              <span className="text-[8px] text-gray-400 font-semibold mt-0.5">Tipo de cambio tomado: $ {exchangeRate.toFixed(2)} MXN</span>
                            </div>
                            <span className="text-base font-extrabold text-[#004B87]">
                              ${(capExTotal * exchangeRate).toLocaleString('en-US', { minimumFractionDigits: 2 })} MXN
                            </span>
                          </div>

                        </div>
                      </div>

                      {/* TERMS & CLAUSES LIST */}
                      <div className="space-y-2.5 flex-grow">
                        <h3 className="text-[10.5px] font-black uppercase tracking-wider border-l-2 pl-2" style={{ color: textColors.terminos, borderLeftColor: textColors.terminos }}>
                          Cláusulas y Condiciones Comerciales Estándar
                        </h3>

                        <div className="divide-y divide-gray-100 text-[9px] text-[#475569]">
                          <div className="py-2.5 flex justify-between">
                            <strong className="text-[#004B87] font-bold uppercase tracking-wider w-[130px]">Plazo de entrega:</strong>
                            <span className="flex-grow">{deliveryWeeks} semanas a partir de la firma de contrato y depósito.</span>
                          </div>
                          <div className="py-2.5 flex justify-between">
                            <strong className="text-[#004B87] font-bold uppercase tracking-wider w-[130px]">Esquema de Pago:</strong>
                            <span className="flex-grow">{paymentAdvance}% anticipo, 40% previo a embarque, {100 - paymentAdvance}% contra arranque final.</span>
                          </div>
                          <div className="py-2.5 flex justify-between">
                            <strong className="text-[#004B87] font-bold uppercase tracking-wider w-[130px]">Garantía:</strong>
                            <span className="flex-grow">{warrantyMonths} meses de cobertura técnica en refacciones contra defectos de origen.</span>
                          </div>
                          <div className="py-2.5 flex justify-between">
                            <strong className="text-[#004B87] font-bold uppercase tracking-wider w-[130px]">Instalación FAT/SAT:</strong>
                            <span className="flex-grow">Incluye comisionamiento, pruebas en frío y capacitación técnica para operadores.</span>
                          </div>
                        </div>
                      </div>

                      {/* SIGNATURE FIELDS */}
                      <div className="grid grid-cols-2 gap-8 pt-6">
                        <div className="space-y-4">
                          <div className="h-[1px] bg-gray-200" />
                          <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">INGENIERÍA COMERCIAL SMQ</div>
                        </div>
                        <div className="space-y-4">
                          <div className="h-[1px] bg-gray-200" />
                          <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">ACEPTACIÓN DE PROPUESTA CLIENTE</div>
                        </div>
                      </div>

                    </div>

                    {/* BRAND SHEET FOOTER */}
                    <div className="flex justify-between items-center text-[7px] text-gray-400 pt-4 border-t border-gray-100 z-10">
                      <span>www.smq.mx | Think, Design, Automate</span>
                      <span>Página 5 de 5</span>
                    </div>

                  </motion.div>
                )}

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
