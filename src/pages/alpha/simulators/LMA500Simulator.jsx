import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Zap, DollarSign, Activity, Settings, 
  AlertCircle, ShieldAlert, Cpu, Layers, Wind, Droplet, 
  Clock, BarChart3, Wrench, FileSpreadsheet, Percent, 
  TrendingUp, RefreshCw, Printer, Info, Eye, X, Download, FileText,
  FolderOpen, Upload, Check, Sliders, RotateCcw, Table2, MousePointer,
  Loader2, Lock, Unlock, Link2, Plus, LineChart, Maximize2, Minimize2
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie, LabelList
} from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

// Componentes del Visor 3D y Datos Base
import SharedTwinViewer3D from '../../../components/flow/SharedTwinViewer3D';
import FlowDesignsLibrary from '../../../components/flow/FlowDesignsLibrary';
import { process3DFile } from '../../../utils/fileProcessor';
import { supabase, uploadFileWithProgress } from '../../../supabase';
import { useFlowDesigns } from '../../../hooks/useFlowDesigns';
import { 
  LMA500_EQUIPMENTS, 
  LMA500_MATERIAL_TYPES, 
  LMA500_NOMINAL_CAPACITY, 
  LMA500_INSTALLED_POWER, 
  LMA500_BASE_CAPEX 
} from '../../../utils/lma500Data';
import { calculateLMA500Metrics } from '../../../utils/lma500Calculations';

const REPORT_STYLES = {
  th: { background: '#edfbfd', color: '#008299', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.4, padding: '8px 10px', borderBottom: '2px solid #b2f5ea', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 },
  td: { borderBottom: '1px solid #edf2f7', padding: '8px 10px', textAlign: 'left', verticalAlign: 'middle', fontSize: 11, color: '#1e293b' }
};

export default function LMA500Simulator() {
  const navigate = useNavigate();
  const reportRef = useRef(null);

  // --- 1. ESTADO DE ENTRADAS CON VALORES REALES DE LA FICHA ---
  const defaultInputs = {
    clientName: 'PABLO SOLER',    // Cliente predeterminado
    projectName: 'Proyecto Reciclado Solimaq LMA-500',
    capacityDesired: 450,          // kg/h (Operación Alta)
    hoursPerShift: 8,             // hrs
    shiftsPerDay: 2,              // turnos
    daysPerMonth: 26,             // días operativos al mes
    materialType: 'hdpe',         // HDPE por defecto
    customMaterialName: '',       // Si es personalizado
    loadFactor: 75,               // 75% recomendado
    electricityRate: 2.30,        // 2.30 MXN/kWh promedio industrial
    exchangeRate: 18.00,          // USD/MXN
    numOperators: 2,              // 2 operadores de línea
    laborCostPerShift: 450,       // 450 MXN por operador por turno
    maintenanceCost: 800,         // 800 USD/mes estimado
    sparePartsCost: 500,          // 500 USD/mes estimado
    waterCost: 150,               // 150 USD/mes de reposición chiller
    requiresAir: true,            // ¿Requiere aire?
    airPressureBar: 7.0,          // 7 bar
    airConsumptionNm3: 15.0,      // 15 Nm3/h
    airCostPerNm3: 0.35,          // 0.35 MXN por Nm3
    capexCableado: 4500,          // USD acometida eléctrica
    capexManiobras: 3000,         // USD descarga
    capexMontaje: 6000,           // USD ensamble técnico
    capexObraCivil: 8000,         // USD cimentaciones
    capexCompresor: 12000,        // USD compresor neumático
    capexInstalacionAdic: 2500,   // USD tuberías y periféricos
    sellPricePerKg: 28.50,        // 28.50 MXN precio de venta de pellet
    rawMaterialCostPerKg: 12.00,  // 12.00 MXN costo de compra de hojuela sucia
    includeRawMaterialInOpex: true, // ¿Incluir costo de hojuela en OPEX mensual?
    nominalCapacity: 500,          // Capacidad nominal por defecto (LMA-500)
    oeePercent: 95,               // OEE global (%)
    useAdvancedOee: false,        // Toggle para OEE por módulo
    oeeModules: {
      banda_entrada: { d: 92, p: 96, q: 97 },
      detector_metales: { d: 92, p: 96, q: 97 },
      trituradora: { d: 90, p: 95, q: 95 },
      banda_salida: { d: 92, p: 96, q: 97 },
      aglomeradora: { d: 88, p: 92, q: 95 },
      peletizadora: { d: 85, p: 90, q: 92 },
      cernidor_silo: { d: 95, p: 98, q: 98 },
      chiller: { d: 95, p: 98, q: 98 }
    },
    wastePercent: 5,              // Merma (%)
    voltage: 440,                 // Tensión eléctrica VAC
    powerFactor: 0.85,            // FP eléctrico
    feederLength: 50,             // m acometida
    isEpcMode: false,             // Modo EPC vs Conceptual
    useAdvancedPower: false,      // Toggle para curvas reales
    energyStates: {
      conveyor: 'Normal', shredder: 'Normal', agglomerator: 'Normal', pelletizer: 'Normal', chiller: 'Normal'
    },
    thermalConfig: {
      humidity: 1, // %
      zoneTemps: 220,
      dieTemp: 230
    },
    dynamicCapexConfig: {
      ccm: true, cables: true, capacitors: true, transformer: true, engineering: true
    },
    includeTechAuditPdf: true,
    includeFinancialAuditPdf: true
  };

  const [inputs, setInputs] = useState(() => {
    const saved = localStorage.getItem('sim_lma500_inputs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultInputs, ...parsed };
      } catch (e) {
        console.error("Error al cargar inputs desde la nube/local", e);
      }
    }
    return defaultInputs;
  });

  useEffect(() => {
    localStorage.setItem('sim_lma500_inputs', JSON.stringify(inputs));
  }, [inputs]);

  // --- ESTADOS DE TWIN DIGITAL ---
  const defaultMaterials = [
    { id: 'pe', name: 'PE (Polietileno)', density: 0.92, classification: 'Post-Consumo', rawPrice: 11.50, sellPrice: 26.00, includeInOpex: true },
    { id: 'pp', name: 'PP (Polipropileno)', density: 0.90, classification: 'Post-Consumo', rawPrice: 10.00, sellPrice: 24.50, includeInOpex: true },
    { id: 'hdpe', name: 'HDPE (Alta Densidad)', density: 0.95, classification: 'Post-Consumo', rawPrice: 12.00, sellPrice: 28.50, includeInOpex: true },
    { id: 'ldpe', name: 'LDPE (Baja Densidad)', density: 0.92, classification: 'Post-Consumo', rawPrice: 11.00, sellPrice: 25.00, includeInOpex: true },
    { id: 'film', name: 'Film Plástico', density: 0.85, classification: 'Post-Consumo', rawPrice: 8.50, sellPrice: 21.00, includeInOpex: true },
    { id: 'postindustrial', name: 'Material Postindustrial', density: 0.92, classification: 'Post-Industrial', rawPrice: 14.00, sellPrice: 31.00, includeInOpex: true },
    { id: 'postconsumo', name: 'Material Postconsumo', density: 0.90, classification: 'Post-Consumo', rawPrice: 10.50, sellPrice: 25.00, includeInOpex: true }
  ];

  const [materials, setMaterials] = useState(() => {
    const saved = localStorage.getItem('sim_lma500_materials');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error al cargar materiales", e);
      }
    }
    return defaultMaterials;
  });

  useEffect(() => {
    localStorage.setItem('sim_lma500_materials', JSON.stringify(materials));
  }, [materials]);

  const [showAddMaterial, setShowAddMaterial] = useState(false);
  const [isAddMaterialModalOpen, setIsAddMaterialModalOpen] = useState(false);
  const [newMatName, setNewMatName] = useState('');
  const [newMatClassification, setNewMatClassification] = useState('Post-Consumo');
  const [newMatRawPrice, setNewMatRawPrice] = useState(10.00);
  const [newMatSellPrice, setNewMatSellPrice] = useState(25.00);
  const [newMatIncludeInOpex, setNewMatIncludeInOpex] = useState(true);
  const [selectedMaterialDetail, setSelectedMaterialDetail] = useState(null);

  // --- CONTROLADORES DINÁMICOS DE MATERIALES ---
  const handleUpdateMaterialField = (id, field, value) => {
    setMaterials(prev => prev.map(m => {
      if (m.id === id) {
        const updated = { ...m, [field]: value };
        // Si este material es el activo, sincronizar inmediatamente con inputs del simulador
        if (inputs.materialType === id) {
          setInputs(inputsPrev => ({
            ...inputsPrev,
            rawMaterialCostPerKg: field === 'rawPrice' ? value : inputsPrev.rawMaterialCostPerKg,
            sellPricePerKg: field === 'sellPrice' ? value : inputsPrev.sellPricePerKg,
            includeRawMaterialInOpex: field === 'includeInOpex' ? value : inputsPrev.includeRawMaterialInOpex
          }));
        }
        return updated;
      }
      return m;
    }));
  };

  const handleActivateMaterial = (id) => {
    const matched = materials.find(m => m.id === id);
    if (matched) {
      setInputs(prev => ({
        ...prev,
        materialType: id,
        rawMaterialCostPerKg: matched.rawPrice,
        sellPricePerKg: matched.sellPrice,
        includeRawMaterialInOpex: matched.includeInOpex !== false
      }));
    }
  };

  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isTwinEditMode, setIsTwinEditMode] = useState(false);
  const [selectedTwinNodeId, setSelectedTwinNodeId] = useState(null);
  const [isDesignsLibraryOpen, setIsDesignsLibraryOpen] = useState(false);

  // --- ESTADOS DE PANTALLA COMPLETA DEL GEMELO DIGITAL ---
  const twinBlockRef = useRef(null);
  const [isTwinBlockFullscreen, setIsTwinBlockFullscreen] = useState(false);
  const [twinTheme, setTwinTheme] = useState('blueprint');

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
  const [twinLayout, setTwinLayout] = useState(() => {
    const saved = localStorage.getItem('sim_lma500_twin_layout');
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

  const [twinNodePositions, setTwinNodePositions] = useState(() => {
    const saved = localStorage.getItem('sim_lma500_twin_node_positions');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return {};
  });

  useEffect(() => {
    if (twinLayout) {
      localStorage.setItem('sim_lma500_twin_layout', JSON.stringify(twinLayout));
    } else {
      localStorage.removeItem('sim_lma500_twin_layout');
    }
  }, [twinLayout]);

  const [isAnchored, setIsAnchored] = useState(true);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [twinSnapshot, setTwinSnapshot] = useState(null);
  const [twinSnapshotLateral, setTwinSnapshotLateral] = useState(() => localStorage.getItem('twin_snapshot_lateral') || null);
  const [twinSnapshotSuperior, setTwinSnapshotSuperior] = useState(() => localStorage.getItem('twin_snapshot_superior') || null);
  const [twinSnapshotIsometrica, setTwinSnapshotIsometrica] = useState(() => localStorage.getItem('twin_snapshot_isometrica') || null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  // Estados del modal de exportación
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [exportFileName, setExportFileName] = useState('');
  const [exportExchangeRate, setExportExchangeRate] = useState(20);

  const [twinLabelHeightOffset, setTwinLabelHeightOffset] = useState(() => {
    const saved = localStorage.getItem('sim_lma500_twin_label_height_offset');
    return saved !== null ? Number(saved) : 0.2;
  });

  const [twinLabelsCollapsed, setTwinLabelsCollapsed] = useState(() => {
    const saved = localStorage.getItem('sim_lma500_twin_labels_collapsed');
    return saved !== null ? saved === 'true' : false;
  });

  const [twinFloorElevation, setTwinFloorElevation] = useState(() => {
    const saved = localStorage.getItem('sim_lma500_twin_floor_elevation');
    return saved !== null ? Number(saved) : 0.0;
  });

  const [twinFloorLocked, setTwinFloorLocked] = useState(() => {
    const saved = localStorage.getItem('sim_lma500_twin_floor_locked');
    return saved === 'true';
  });

  useEffect(() => {
    localStorage.setItem('sim_lma500_twin_label_height_offset', String(twinLabelHeightOffset));
  }, [twinLabelHeightOffset]);

  useEffect(() => {
    localStorage.setItem('sim_lma500_twin_labels_collapsed', String(twinLabelsCollapsed));
  }, [twinLabelsCollapsed]);

  useEffect(() => {
    localStorage.setItem('sim_lma500_twin_floor_elevation', String(twinFloorElevation));
  }, [twinFloorElevation]);

  useEffect(() => {
    localStorage.setItem('sim_lma500_twin_floor_locked', String(twinFloorLocked));
  }, [twinFloorLocked]);

  // Hook de Librería de Diseños 3D de Supabase y estados de subida
  const { loadDesign: fetchDesignFromDb, saveDesign: saveDesignToDb } = useFlowDesigns();
  const [currentDesignId, setCurrentDesignId] = useState(() => {
    return localStorage.getItem('sim_lma500_twin_anchor_id') || null;
  });
  const [pendingUpload, setPendingUpload] = useState(null); // { file, processedResult }
  const [uploadModelName, setUploadModelName] = useState('');
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // --- 2. CÁLCULO DE MÉTRICAS EN TIEMPO REAL ---
  const results = useMemo(() => {
    return calculateLMA500Metrics({ ...inputs, materials });
  }, [inputs, materials]);

  // --- 3. DYNAMIC 3D DIGITAL TWIN BINDING ---
  const twinNodes = useMemo(() => {
    return LMA500_EQUIPMENTS.map((eq) => {
      const dynamicPower = Number((eq.kw * (inputs.loadFactor / 100)).toFixed(2));
      const customPos = twinNodePositions[eq.id];
      return {
        id: eq.id,
        type: 'custom',
        data: {
          type: eq.id === 'banda_entrada' || eq.id === 'banda_salida' ? 'Transportador' :
                eq.id === 'detector_metales' ? 'Detector' :
                eq.id === 'trituradora' ? 'Molino' :
                eq.id === 'aglomeradora' ? 'Mezcladora' :
                eq.id === 'peletizadora' ? 'Extrusora' :
                eq.id === 'cernidor_silo' ? 'Secadora' : 'Chiller',
          label: eq.name,
          capacity: inputs.capacityDesired, 
          power: dynamicPower, 
          color: '#0d9488', 
          hideLabel: true,
          position3D: customPos?.position3D || null,
          labelPosition: customPos?.labelPosition || null
        }
      };
    });
  }, [inputs.loadFactor, inputs.capacityDesired, twinNodePositions]);

  const twinEdges = useMemo(() => {
    return [
      { id: 'edge_1', source: 'banda_entrada', target: 'detector_metales' },
      { id: 'edge_2', source: 'detector_metales', target: 'trituradora' },
      { id: 'edge_3', source: 'trituradora', target: 'banda_salida' },
      { id: 'edge_4', source: 'banda_salida', target: 'aglomeradora' },
      { id: 'edge_5', source: 'aglomeradora', target: 'peletizadora' },
      { id: 'edge_6', source: 'peletizadora', target: 'cernidor_silo' },
      { id: 'edge_7', source: 'cernidor_silo', target: 'chiller' }
    ];
  }, []);

  // Cerrar el visor con la tecla "ESC"
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

  // Cargar instantánea del gemelo digital de localStorage y mantenerlo sincronizado
  useEffect(() => {
    const syncSnapshot = () => {
      setTwinSnapshot(localStorage.getItem('twin_snapshot_base64'));
      setTwinSnapshotLateral(localStorage.getItem('twin_snapshot_lateral'));
      setTwinSnapshotSuperior(localStorage.getItem('twin_snapshot_superior'));
      setTwinSnapshotIsometrica(localStorage.getItem('twin_snapshot_isometrica'));
    };
    syncSnapshot();
    window.addEventListener('storage', syncSnapshot);
    return () => window.removeEventListener('storage', syncSnapshot);
  }, [isReportModalOpen]);

  // Controladores de eventos de la barra del Twin con carga en la nube
  const processAndSetupTwinModel = async (file) => {
    if (!file) return;
    try {
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
        description: `Modelo 3D subido desde el simulador (${ext.toUpperCase()})`,
        nodes: [],
        edges: [],
        layout: layoutRecord,
        customEquipments: null,
      });

      // Aplicar el layout al visor del simulador
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
        localStorage.setItem('sim_lma500_twin_node_positions', JSON.stringify(positions));
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
      localStorage.removeItem('sim_lma500_twin_layout');
      localStorage.removeItem('sim_lma500_twin_node_positions');
      localStorage.removeItem('sim_lma500_twin_anchor_id');
      setCurrentDesignId(null);
      alert("Coordenadas 3D del gemelo reajustadas a los valores de diseño de Solimaq.");
    }, 1000);
  };

  const handleAnchorToSimulator = async () => {
    if (!twinLayout) return;
    setIsAnchoring(true);
    try {
      const anchorData = {
        name: `Twin · LMA500`,
        description: `Configuración anclada al simulador lma500`,
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
      localStorage.setItem('sim_lma500_twin_anchor_id', designId || '');
      localStorage.setItem('sim_lma500_twin_layout', JSON.stringify({ ...twinLayout, elevation: twinFloorElevation }));
      localStorage.setItem('sim_lma500_twin_node_positions', JSON.stringify(twinNodePositions));
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
      localStorage.setItem('sim_lma500_twin_node_positions', JSON.stringify(next));
      return next;
    });
    setIsAnchored(false);
  };

  const handleInputChange = (field, val) => {
    let parsedVal = val;
    if (typeof val === 'boolean') {
      parsedVal = val;
    } else if (field !== 'materialType' && field !== 'customMaterialName' && field !== 'requiresAir' && field !== 'clientName' && field !== 'projectName' && field !== 'customDictamenText' && field !== 'customRecommendationText') {
      parsedVal = val === '' ? '' : parseFloat(val) || 0;
      if (typeof parsedVal === 'number' && parsedVal < 0) {
        parsedVal = 0;
      }
    }
    setInputs(prev => ({
      ...prev,
      [field]: parsedVal
    }));
  };

  // --- 4. PREPARACIÓN DE DATOS PARA GRÁFICAS ---
  const chartPowerData = useMemo(() => {
    return LMA500_EQUIPMENTS.map(eq => ({
      name: eq.name,
      'kW Instalados': eq.kw,
      'kW en Carga (Factor)': Number((eq.kw * (inputs.loadFactor / 100)).toFixed(2))
    }));
  }, [inputs.loadFactor]);

  const chartOpexData = useMemo(() => {
    return [
      { name: 'Materia Prima', MX: Number((results.opex.rawMaterialUsd * inputs.exchangeRate).toFixed(0)) },
      { name: 'Energía Eléctrica', MX: Number((results.opex.electricUsd * inputs.exchangeRate).toFixed(0)) },
      { name: 'Mano de Obra', MX: Number((results.opex.laborUsd * inputs.exchangeRate).toFixed(0)) },
      { name: 'Mantenimiento', MX: Number((results.opex.maintenanceUsd * inputs.exchangeRate).toFixed(0)) },
      { name: 'Refacciones', MX: Number((results.opex.sparePartsUsd * inputs.exchangeRate).toFixed(0)) },
      { name: 'Agua', MX: Number((results.opex.waterUsd * inputs.exchangeRate).toFixed(0)) },
      { name: 'Aire Comprimido', MX: Number((results.opex.airUsd * inputs.exchangeRate).toFixed(0)) }
    ].filter(d => d.MX > 0);
  }, [results, inputs.exchangeRate]);

  const costBreakdown = useMemo(() => {
    const rawMaterialUsd = results.opex.rawMaterialUsd || 0;
    const operatingOpexUsd = results.opex.totalUsd - rawMaterialUsd;
    const totalUsd = results.opex.totalUsd || 1;

    const productionMonthly = results.production.monthly || 1;
    const wastePercent = results.production.wastePercent || 0;
    const rawMaterialKg = productionMonthly / (1 - (wastePercent / 100));
    const wasteKg = rawMaterialKg - productionMonthly;

    return {
      rawMaterialUsd,
      operatingOpexUsd,
      totalUsd,
      rawMaterialPercent: (rawMaterialUsd / totalUsd) * 100,
      operatingPercent: (operatingOpexUsd / totalUsd) * 100,
      rawMaterialKg,
      wasteKg,
      electricPercent: (results.opex.electricUsd / totalUsd) * 100,
      maintenancePercent: (results.opex.maintenanceUsd / totalUsd) * 100,
      laborPercent: (results.opex.laborUsd / totalUsd) * 100,
      otherPercent: ((results.opex.airUsd + results.opex.sparePartsUsd + results.opex.waterUsd) / totalUsd) * 100
    };
  }, [results]);

  const chartCashFlowData = useMemo(() => {
    const data = [];
    let cumulativeMxn = -results.capex.totalMxn;
    const monthlyNetProfit = results.profitability.profitMxn;

    data.push({
      mes: 'Mes 0',
      'Flujo Acumulado (MXN)': Number((cumulativeMxn / 1000).toFixed(0))
    });

    for (let i = 1; i <= 24; i++) {
      cumulativeMxn += monthlyNetProfit;
      data.push({
        mes: `M${i}`,
        'Flujo Acumulado (MXN)': Number((cumulativeMxn / 1000).toFixed(0))
      });
    }
    return data;
  }, [results]);

  const financialProjectionsData = useMemo(() => {
    const periods = [1, 3, 6, 12];
    const revenueMonthly = results.profitability.revenueUsd * inputs.exchangeRate;
    const profitMonthly = results.profitability.profitMxn;
    const sellPrice = inputs.sellPricePerKg || 0;
    const capexTotal = results.capex.totalMxn;
    
    return periods.map(months => {
      const projectedRevenue = revenueMonthly * months;
      const projectedProfit = profitMonthly * months;
      const projectedOpex = projectedRevenue - projectedProfit;
      const projectedProduction = sellPrice > 0 ? projectedRevenue / sellPrice : 0;
      const recovered = projectedProfit >= capexTotal;
      
      return {
        months,
        label: `${months} Mes${months > 1 ? 'es' : ''}`,
        projectedRevenue,
        projectedOpex,
        projectedProfit,
        projectedProduction,
        recovered
      };
    });
  }, [results, inputs.exchangeRate, inputs.sellPricePerKg]);

  const capexRecoveryChartData = useMemo(() => {
    const data = [];
    let cumulativeMxn = 0;
    const monthlyNetProfit = results.profitability.profitMxn;
    const capexTotal = results.capex.totalMxn;

    for (let i = 1; i <= 12; i++) {
      cumulativeMxn += monthlyNetProfit;
      data.push({
        mes: `Mes ${i}`,
        'Utilidad Acumulada': Number((cumulativeMxn / 1000000).toFixed(2)),
        'CAPEX Total': Number((capexTotal / 1000000).toFixed(2))
      });
    }
    return data;
  }, [results]);

  const financialProjectionsLongTermData = useMemo(() => {
    const periods = [12, 24, 36];
    const revenueMonthly = results.profitability.revenueUsd * inputs.exchangeRate;
    const profitMonthly = results.profitability.profitMxn;
    const sellPrice = inputs.sellPricePerKg || 0;
    const capexTotal = results.capex.totalMxn;
    
    return periods.map(months => {
      const projectedRevenue = revenueMonthly * months;
      const projectedProfit = profitMonthly * months;
      const projectedOpex = projectedRevenue - projectedProfit;
      const projectedProduction = sellPrice > 0 ? projectedRevenue / sellPrice : 0;
      const recovered = projectedProfit >= capexTotal;
      const roiPercentage = capexTotal > 0 ? ((projectedProfit - capexTotal) / capexTotal) * 100 : 0;
      
      return {
        months,
        label: `${months / 12} Año${months > 12 ? 's' : ''}`,
        projectedRevenue,
        projectedOpex,
        projectedProfit,
        projectedProduction,
        recovered,
        roiPercentage
      };
    });
  }, [results, inputs.exchangeRate, inputs.sellPricePerKg]);

  const capexRecoveryLongTermChartData = useMemo(() => {
    const data = [];
    let cumulativeMxn = 0;
    const monthlyNetProfit = results.profitability.profitMxn;
    const capexTotal = results.capex.totalMxn;

    for (let i = 3; i <= 36; i+=3) {
      cumulativeMxn = monthlyNetProfit * i;
      data.push({
        mes: `M${i}`,
        'Utilidad Acumulada': Number((cumulativeMxn / 1000000).toFixed(2)),
        'CAPEX Total': Number((capexTotal / 1000000).toFixed(2))
      });
    }
    return data;
  }, [results]);

  const COLORS_PALETTE = ['#0d9488', '#0f766e', '#14b8a6', '#2dd4bf', '#5eead4', '#99f6e4', '#ccfbf1'];

  // Formateadores
  const formatCurrency = (val, currency = 'USD') => {
    const isMxn = currency === 'MXN' || currency === 'MX';
    const finalVal = isMxn ? val : val * inputs.exchangeRate;
    const formatted = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'MXN',
      maximumFractionDigits: 0
    }).format(finalVal);
    const cleanFormatted = formatted.replace('MX$', '$');
    return `${cleanFormatted} MX`;
  };

  // --- EXPORTAR EXCEL ---
  const exportExcel = () => {
    try {
      const wb = XLSX.utils.book_new();
      
      const configData = [
        ['Parámetro', 'Valor Simulado', 'Unidad'],
        ['Cliente', inputs.clientName || 'PABLO SOLER', 'Texto'],
        ['Proyecto', inputs.projectName || 'LMA-500 Solimaq', 'Texto'],
        ['Capacidad Deseada', inputs.capacityDesired, 'kg/h'],
        ['Turnos al Día', inputs.shiftsPerDay, 'Turnos'],
        ['Horas por Turno', inputs.hoursPerShift, 'hrs'],
        ['Días Operativos al Mes', inputs.daysPerMonth, 'días'],
        ['Material Procesado', inputs.materialType.toUpperCase(), 'Categoría'],
        ['Factor de Carga Eléctrica', inputs.loadFactor, '%'],
        ['Tarifa Eléctrica promedio', inputs.electricityRate, 'MXN/kWh'],
        ['Tipo de Cambio', inputs.exchangeRate, 'USD/MXN'],
        ['Precio Venta Pellet', inputs.sellPricePerKg, 'MXN/kg'],
        ['Costo Hoja Sucia', inputs.rawMaterialCostPerKg, 'MXN/kg'],
        ['Operadores por Turno', inputs.numOperators, 'Personas'],
        ['Costo Operador por Turno', inputs.laborCostPerShift, 'MXN/turno']
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(configData), 'Configuración');

      const eqData = [
        ['ID', 'Nombre de Equipo', 'kW Instalado', 'kW Activo (Factor Carga)', 'Tensión VAC', 'CAPEX Base (USD)'],
        ...LMA500_EQUIPMENTS.map(eq => [
          eq.id, eq.name, eq.kw, +(eq.kw * (inputs.loadFactor / 100)).toFixed(2), 220, eq.capexUsd
        ])
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(eqData), 'Equipos');

      const resData = [
        ['Métrica', 'Valor Mensual (USD)', 'Valor Anual (USD)', 'Valor Mensual (MXN)', 'Valor Anual (MXN)'],
        ['Producción Total (kg)', results.production.monthly, results.production.annual, '-', '-'],
        ['Consumo Eléctrico (kWh)', results.energy.monthlyKwh, results.energy.annualKwh, '-', '-'],
        ['Costo de Electricidad', results.opex.electricUsd, results.opex.electricUsd * 12, results.energy.monthlyCostMxn, results.energy.annualCostMxn],
        ['Costo Materia Prima', results.opex.rawMaterialUsd, results.opex.rawMaterialUsd * 12, results.opex.rawMaterialUsd * inputs.exchangeRate, results.opex.rawMaterialUsd * 12 * inputs.exchangeRate],
        ['Costo Mano de Obra', results.opex.laborUsd, results.opex.laborUsd * 12, results.opex.laborUsd * inputs.exchangeRate, results.opex.laborUsd * 12 * inputs.exchangeRate],
        ['Ingresos Totales (Venta Pellet)', results.profitability.revenueUsd, results.profitability.revenueUsd * 12, results.profitability.revenueMxn, results.profitability.revenueMxn * 12],
        ['Utilidad Neta (Net Profit)', results.profitability.profitUsd, results.profitability.profitUsd * 12, results.profitability.profitMxn, results.profitability.profitMxn * 12],
        ['CAPEX Total Proyectado', results.capex.totalUsd, '-', results.capex.totalMxn, '-'],
        ['Costo Unitario de Pellet', results.opex.costPerKgMxn, 'MXN/kg', '-', '-'],
        ['Payback Estimado (Retorno)', results.profitability.paybackMonths ? +results.profitability.paybackMonths.toFixed(1) : 'N/D', 'Meses', '-', '-']
      ];
      XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resData), 'Finanzas');

      XLSX.writeFile(wb, `LMA500_Simulacion_${inputs.clientName.replace(/\s+/g, '_')}_${Date.now()}.xlsx`);
    } catch (err) {
      console.error(err);
      alert("Error al exportar a Excel");
    }
  };

  // --- EXPORTAR CSV ---
  const exportCsv = () => {
    try {
      let csvContent = "data:text/csv;charset=utf-8,";
      csvContent += "Parametro,Valor Simulado,Unidad\n";
      csvContent += `Cliente,${inputs.clientName || 'PABLO SOLER'},Texto\n`;
      csvContent += `Proyecto,${inputs.projectName || 'LMA-500 Solimaq'},Texto\n`;
      csvContent += `Capacidad Deseada,${inputs.capacityDesired},kg/h\n`;
      csvContent += `Consumo Activo,${results.energy.activePowerKw.toFixed(2)},kW\n`;
      csvContent += `CAPEX Total Proyectado,${results.capex.totalUsd.toFixed(2)},USD\n`;
      csvContent += `OPEX Total Mensual,${results.opex.totalUsd.toFixed(2)},USD\n`;
      csvContent += `Payback Simple,${results.profitability.paybackMonths ? results.profitability.paybackMonths.toFixed(1) : 'N/D'},Meses\n`;
      csvContent += `Costo/kg Producido,${results.opex.costPerKgMxn.toFixed(2)},MXN\n`;
      
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `LMA500_Simulacion_${inputs.clientName.replace(/\s+/g, '_')}_${Date.now()}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error(err);
      alert("Error al exportar a CSV");
    }
  };

  const printReport = async (fileName = null) => {
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
      // jsPDF en formato A4 Horizontal (Landscape)
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
        
        // Actualizar progreso
        setPdfProgress((i / pages.length) * 100);

        // Renderizado html2canvas de alta resolución (escala 2)
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
      
      const clientNameClean = (inputs.clientName || 'PABLO_SOLER').trim().toUpperCase().replace(/\s+/g, '_');
      const projectNameClean = (inputs.projectName || 'INFORME_LMA500').trim().toUpperCase().replace(/\s+/g, '_');
      const defaultFileName = `SOLIMAQ_LMA500_INFORME_${projectNameClean}_${clientNameClean}.pdf`;
      
      pdf.save(fileName && fileName.trim() !== '' ? fileName : defaultFileName);
      
    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert("Error al generar el PDF de alta fidelidad. Por favor reintente.");
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress(0);
    }
  };

  const handlePrintFromMain = () => {
    const clientNameClean = (inputs.clientName || 'PABLO_SOLER').trim().toUpperCase().replace(/\s+/g, '_');
    const projectNameClean = (inputs.projectName || 'INFORME_LMA500').trim().toUpperCase().replace(/\s+/g, '_');
    setExportFileName(`SOLIMAQ_LMA500_INFORME_${projectNameClean}_${clientNameClean}.pdf`);
    setExportExchangeRate(inputs.exchangeRate || 20);
    setShowExportDialog(true);
  };

  const confirmExportPdf = () => {
    setShowExportDialog(false);
    
    // Actualizar el TC global si el usuario lo modificó en el dialog
    if (exportExchangeRate !== inputs.exchangeRate) {
      setInputs(prev => ({ ...prev, exchangeRate: exportExchangeRate }));
    }

    setTwinSnapshot(localStorage.getItem('twin_snapshot_base64'));
    setTwinSnapshotLateral(localStorage.getItem('twin_snapshot_lateral'));
    setTwinSnapshotSuperior(localStorage.getItem('twin_snapshot_superior'));
    setTwinSnapshotIsometrica(localStorage.getItem('twin_snapshot_isometrica'));
    setIsReportModalOpen(true);
    
    // Dar tiempo para que el reporte se renderice con el nuevo TC antes de imprimir
    setTimeout(() => {
      printReport(exportFileName);
    }, 1000); // 1000ms para asegurar el rerender completo
  };

  const getValidationQRUrl = () => {
    try {
      const payloadString = JSON.stringify({
        p: inputs.projectName || 'LMA-500',
        c: inputs.clientName || 'PABLO SOLER',
        s: 'SOLIMAQ LMA-500',
        d: new Date().toLocaleDateString('es-MX'),
        h: 'SOLIMAQ-LMA500-RECILOGIC-PANDORA-v7.80'
      });
      // Safe base64 encoding for Unicode
      const b64 = btoa(unescape(encodeURIComponent(payloadString)));
      const verifyUrl = `${window.location.origin}/verify?d=${encodeURIComponent(b64)}`;
      return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=008299&data=${encodeURIComponent(verifyUrl)}`;
    } catch(e) {
      return "https://api.qrserver.com/v1/create-qr-code/?size=150x150&color=008299&data=error";
    }
  };

  // Estilos de Páginas en Modal
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
      padding: '38px 48px 65px', 
      height: '100%', 
      position: 'relative',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      boxSizing: 'border-box'
    },
    h2: { fontSize: 24, margin: '0 0 6px', color: '#0f172a', fontWeight: 800 },
    sub: { margin: '0 0 15px', color: '#475569', fontSize: 13, fontWeight: 500 }
  };

  const getSplitTitle = (title) => {
    const cleanTitle = title.toUpperCase();
    const extractNum = (str) => { const match = str.match(/^(\d+)\.\s+/); return match ? match[1] + '. ' : ''; };
    const num = extractNum(title);

    if (cleanTitle.includes('ESPECIFICACIONES TÉCNICAS')) return { line1: num + 'ESPECIFICACIONES TÉCNICAS', line2: 'Y DESGLOSE DE EQUIPOS' };
    if (cleanTitle.includes('VISTA LATERAL')) return { line1: num + 'GEMELO DIGITAL 3D', line2: 'VISTA LATERAL / PRINCIPAL' };
    if (cleanTitle.includes('VISTA SUPERIOR')) return { line1: num + 'GEMELO DIGITAL 3D', line2: 'VISTA SUPERIOR (PLANTA)' };
    if (cleanTitle.includes('VISTA ISOMÉTRICA')) return { line1: num + 'GEMELO DIGITAL 3D', line2: 'VISTA ISOMÉTRICA (PERSPECTIVA)' };
    if (cleanTitle.includes('ESCENARIOS Y RENDIMIENTO')) return { line1: num + 'ESCENARIOS Y RENDIMIENTO', line2: 'OPERATIVO DE PRODUCCIÓN' };
    if (cleanTitle.includes('MODELO DE CARGA')) return { line1: num + 'MODELO DE CARGA', line2: 'Y EFICIENCIA ENERGÉTICA' };
    if (cleanTitle.includes('TARIFAS Y COSTOS')) return { line1: num + 'TARIFAS Y COSTOS', line2: 'DE ENERGÍA ELÉCTRICA' };
    if (cleanTitle.includes('CONSUMOS TÉCNICOS') || cleanTitle.includes('CONSUMOS NEUMÁTICOS')) return { line1: num + 'CONSUMOS TÉCNICOS', line2: 'NEUMÁTICOS E HÍDRICOS' };
    if (cleanTitle.includes('INFRAESTRUCTURA Y OEE') || cleanTitle.includes('AUDITORÍA DE INFRAESTRUCTURA')) return { line1: num + 'AUDITORÍA DE INFRAESTRUCTURA', line2: 'Y OEE DINÁMICO' };
    if (cleanTitle.includes('ESTRUCTURA DE INVERSIÓN') || cleanTitle.includes('ANÁLISIS DE CAPEX')) return { line1: num + 'ANÁLISIS DE CAPEX', line2: 'Y DISTRIBUCIÓN DE INVERSIÓN' };
    if (cleanTitle.includes('COSTO DE PRODUCCIÓN') || cleanTitle.includes('ANÁLISIS DE COSTO')) return { line1: num + 'ANÁLISIS DE COSTO', line2: 'MATERIA PRIMA Y COSTO TOTAL DE PRODUCCIÓN' };
    if (cleanTitle.includes('AUDITORÍA PARAMÉTRICA')) return { line1: num + 'AUDITORÍA PARAMÉTRICA', line2: 'AUTOMÁTICA Y ESCENARIOS FINANCIEROS' };
    if (cleanTitle.includes('RETORNO DE INVERSIÓN')) return { line1: num + 'RETORNO DE INVERSIÓN (ROI)', line2: 'Y DIAGNÓSTICO DE VIABILIDAD' };
    if (cleanTitle.includes('SENSIBILIDAD FINANCIERA')) return { line1: num + 'SENSIBILIDAD FINANCIERA', line2: 'Y ESTRÉS DE MARGEN' };
    if (cleanTitle.includes('CURVA DE DEGRADACIÓN')) return { line1: num + 'CURVA DE DEGRADACIÓN', line2: 'DE VIDA ÚTIL' };
    if (cleanTitle.includes('PROYECCIÓN FINANCIERA POR PERIODO')) return { line1: num + 'PROYECCIÓN FINANCIERA', line2: 'POR PERIROY' }; // keep original typo line if present or use original lines
    if (cleanTitle.includes('LARGO PLAZO')) return { line1: num + 'PROYECCIÓN DE RETORNO', line2: 'A LARGO PLAZO (1 A 3 AÑOS)' };

    return { line1: title.toUpperCase(), line2: '' };
  };

  const renderPageHeader = (title, subtitle) => {
    const { line1, line2 } = getSplitTitle(title);
    return (
      <div style={{ marginBottom: 20 }}>
        {/* Estampado Corporativo de Recilogic */}
        <div style={{ fontSize: 9, fontWeight: 900, color: '#008299', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
          SOLIMAQ LMA-500 · RECILOGIC · PANDORA v7.80
        </div>
        
        {/* Diseño Premium de Título en Dos Líneas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          {/* Línea 1: Azul Pizarra Oscuro Negrita */}
          <div style={{ fontSize: 24, fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
            {line1}
          </div>
          
          {/* Línea 2: Turquesa Brillante con Indicador Vertical Grueso */}
          {line2 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 1 }}>
              <div style={{ width: 4, height: 22, background: '#00cbd6', borderRadius: 2 }} />
              <div style={{ fontSize: 24, fontWeight: 900, color: '#00cbd6', letterSpacing: '-0.5px', lineHeight: 1.1 }}>
                {line2}
              </div>
            </div>
          )}
        </div>

        {/* Subtítulo Descriptivo */}
        <p style={{ margin: '8px 0 0', color: '#64748b', fontSize: 11, fontWeight: 600 }}>
          {subtitle}
        </p>
      </div>
    );
  };

  const renderPageFooter = (pageNum, totalPgs) => {
    return (
      <div style={{ position: 'absolute', bottom: 18, left: 48, right: 48, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: 8, fontSize: 9, color: '#94a3b8', fontWeight: 700 }}>
        <span style={{ textTransform: 'uppercase' }}>{inputs.clientName || 'PABLO SOLER'} · MÁQUINA: SOLIMAQ LMA-500</span>
        <span>PÁGINA {pageNum} DE {totalPgs}</span>
      </div>
    );
  };

  // Cálculo dinámico de páginas para el PDF
  const isTech = inputs.includeTechAuditPdf !== false;
  const isFin = inputs.includeFinancialAuditPdf !== false;

  let pg = 1;
  const pgPortada = pg++;
  const pgSpecs = pg++;
  const pg3DSide = pg++;
  const pg3DTop = pg++;
  const pg3DIso = pg++;
  const pgScenarios = pg++;
  const pgEnergy = pg++;
  const pgCostosE = pg++;
  const pgConsumos = pg++;
  const pgOEE = pg++;
  const pgCAPEX = pg++;
  const pgOPEX = pg++;
  const pgEscenariosFin = pg++;
  const pgROI = pg++;
  
  const pgTech1 = isTech ? pg++ : 0;
  const pgFin1 = isFin ? pg++ : 0;
  const pgTech2 = isTech ? pg++ : 0;
  
  const pgProj1 = pg++;
  const pgProj2 = pg++;
  
  const totalPgs = pg - 1;

  return (
    <div className="min-h-screen bg-[#050505] text-white p-4 md:p-8 font-sans relative overflow-hidden">
      
      {/* Loader de Progreso de Generación de PDF */}
      {isGeneratingPdf && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-md">
          <div className="bg-[#0b0c10] border border-slate-800 rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl space-y-6">
            <RefreshCw className="w-12 h-12 text-teal-400 animate-spin mx-auto animate-duration-1000" />
            <div>
              <h4 className="text-lg font-black text-white uppercase tracking-wider">Generando PDF Oficial</h4>
              <p className="text-xs text-gray-400 mt-2 font-medium">Renderizando páginas en alta fidelidad A4...</p>
            </div>
            
            {/* Barra de Progreso */}
            <div className="w-full bg-slate-900 rounded-full h-3.5 border border-slate-800 overflow-hidden relative">
              <div 
                className="bg-gradient-to-r from-teal-500 to-[#00cbd6] h-full transition-all duration-300 rounded-full" 
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
      {/* Luces y acentos de fondo */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-teal-500/5 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-[#0d9488]/5 blur-[120px] pointer-events-none" />

      {/* --- ENCABEZADO PREMIUM --- */}
      <div className="max-w-[1500px] mx-auto bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-[#1A1A1A] rounded-3xl p-6 mb-8 shadow-2xl relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/alpha/simulators')}
            className="w-10 h-10 rounded-xl bg-[#151515] border border-[#222] flex items-center justify-center hover:bg-[#202020] text-gray-400 hover:text-white transition-colors"
            title="Volver al Hub"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black tracking-widest bg-teal-500/10 border border-teal-500/35 text-teal-400 uppercase">
                SOLIMAQ
              </span>
              <span className="text-xs text-gray-500 font-bold tracking-wide uppercase">
                Twin & Financial Simulator
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-2 uppercase">
              Simulador <span className="text-teal-400">LMA-500</span>
            </h1>
            <p className="text-[10px] text-gray-500 max-w-sm mt-1.5">
              Optimización técnica, análisis de CAPEX, Costos de Producción y periodización de payback para la línea de reciclado de plásticos de 500 kg/h
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#0d9488]/10 hover:bg-[#0d9488]/20 border border-[#0d9488]/30 text-teal-400 transition-all font-bold text-sm shadow-[0_0_15px_rgba(13,148,136,0.15)] animate-pulse"
          >
            <Eye className="w-4 h-4" />
            Ver Informe en Visor ({totalPgs} Págs)
          </button>
          <button
            onClick={handlePrintFromMain}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-teal-500 hover:bg-teal-600 text-black transition-all font-bold text-sm shadow-[0_0_20px_rgba(20,184,166,0.25)]"
          >
            <Printer className="w-4 h-4" />
            Exportar PDF
          </button>
        </div>
      </div>

      {/* --- GRID DE SIMULACIÓN --- */}
      <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        
        {/* =========================================================================
            PANEL IZQUIERDO: CONFIGURACIÓN DE ENTRADAS
            ========================================================================= */}
        <div className="lg:col-span-4 space-y-6">

          {/* Sección 0: Datos del Proyecto */}
          <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-5">
              <FileSpreadsheet className="w-5 h-5 text-teal-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">
                Datos del Proyecto
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                  Nombre del Cliente
                </label>
                <input
                  type="text"
                  value={inputs.clientName}
                  onChange={e => handleInputChange('clientName', e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white transition-all"
                  placeholder="Ej: PABLO SOLER"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                  Nombre del Proyecto
                </label>
                <input
                  type="text"
                  value={inputs.projectName}
                  onChange={e => handleInputChange('projectName', e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white transition-all"
                  placeholder="Ej: Proyecto Reciclaje LMA-500"
                />
              </div>
            </div>
          </div>
          
          {/* Parámetros de Alimentación */}
          <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-5">
              <Layers className="w-5 h-5 text-teal-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">
                Alimentación & Material
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                  Tipo de Material
                </label>
                <select
                  value={inputs.materialType}
                  onChange={e => {
                    const selectedId = e.target.value;
                    const matched = materials.find(m => m.id === selectedId);
                    if (matched) {
                      setInputs(prev => ({
                        ...prev,
                        materialType: selectedId,
                        rawMaterialCostPerKg: matched.rawPrice,
                        sellPricePerKg: matched.sellPrice,
                        includeRawMaterialInOpex: matched.includeInOpex !== false
                      }));
                    } else {
                      handleInputChange('materialType', selectedId);
                    }
                  }}
                  className="w-full px-4 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 focus:bg-[#1b1e2a] text-sm font-bold text-white transition-all cursor-pointer"
                >
                  {materials.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                  <option value="custom">Otro / Personalizado</option>
                </select>

                <div className="flex items-center justify-between mt-3">
                  <button
                    type="button"
                    onClick={() => setIsAddMaterialModalOpen(true)}
                    className="w-full py-2.5 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 hover:border-teal-500/50 rounded-2xl text-xs font-bold uppercase tracking-widest transition-all duration-300 flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(20,184,166,0.05)] hover:shadow-[0_0_20px_rgba(20,184,166,0.15)]"
                  >
                    + Agregar Material
                  </button>
                </div>
              </div>

              {inputs.materialType === 'custom' && (
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                    Nombre del Material Personalizado
                  </label>
                  <input
                    type="text"
                    placeholder="Ej. PET Amorfo"
                    value={inputs.customMaterialName}
                    onChange={e => handleInputChange('customMaterialName', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white transition-all"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2.5">
                  Modelo de Extrusora Solimaq
                </label>
                <div className="grid grid-cols-5 gap-1.5 bg-[#14161f] p-1 rounded-2xl border border-slate-800 mb-4">
                  {[100, 250, 500, 1000, 1500].map(cap => {
                    const isActive = (inputs.nominalCapacity || 500) === cap;
                    return (
                      <button
                        key={cap}
                        type="button"
                        onClick={() => {
                          setInputs(prev => ({
                            ...prev,
                            nominalCapacity: cap,
                            capacityDesired: cap
                          }));
                        }}
                        className={`py-2 text-[10px] font-black uppercase rounded-xl transition-all duration-300 ${
                          isActive 
                            ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-black shadow-[0_0_12px_rgba(20,184,166,0.35)] font-black' 
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        {cap}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                    Capacidad de Procesamiento
                  </label>
                  <span className="text-xs font-black text-teal-400">
                    {inputs.capacityDesired} kg/h
                  </span>
                </div>
                <input
                  type="range"
                  min="50"
                  max={Math.floor((inputs.nominalCapacity || 500) * 1.10)}
                  step="10"
                  value={inputs.capacityDesired}
                  onChange={e => handleInputChange('capacityDesired', e.target.value)}
                  className="w-full accent-teal-500 cursor-pointer bg-slate-800"
                />
                <div className="flex justify-between text-[9px] font-bold text-gray-500 mt-1">
                  <span>50 kg/h</span>
                  <span className="text-center w-1/3">{(inputs.nominalCapacity || 500)} kg/h (Nominal)</span>
                  <span>{Math.floor((inputs.nominalCapacity || 500) * 1.10)} kg/h (+10%)</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mt-2 border-t border-slate-800 pt-4">
                <div className="col-span-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      Eficiencia (OEE)
                    </label>
                    <button 
                      onClick={() => handleInputChange('useAdvancedOee', !inputs.useAdvancedOee)}
                      className="text-[9px] font-bold text-teal-400 uppercase tracking-widest hover:text-teal-300 transition-colors bg-teal-500/10 px-2 py-1 rounded"
                    >
                      {inputs.useAdvancedOee ? 'Usar Modo Simple' : 'Activar OEE por Módulo'}
                    </button>
                  </div>
                  
                  {!inputs.useAdvancedOee ? (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-[9px] text-gray-500">Global Line OEE</span>
                        <span className="text-xs font-black text-teal-400">{inputs.oeePercent}%</span>
                      </div>
                      <input
                        type="range" min="50" max="100" step="1"
                        value={inputs.oeePercent}
                        onChange={e => handleInputChange('oeePercent', e.target.value)}
                        className="w-full accent-teal-500 cursor-pointer bg-slate-800"
                      />
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4 bg-[#14161f] p-4 rounded-xl border border-teal-500/20 col-span-2">
                      <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest border-b border-slate-800 pb-2 mb-2">Desglose Industrial de OEE (D × R × C)</div>
                      {[
                        { id: 'banda_entrada', label: 'Banda Entrada' },
                        { id: 'detector_metales', label: 'Detector Metales' },
                        { id: 'trituradora', label: 'Trituradora GSX500' },
                        { id: 'banda_salida', label: 'Banda Salida' },
                        { id: 'aglomeradora', label: 'Aglomeradora' },
                        { id: 'peletizadora', label: 'Peletizadora PT-500' },
                        { id: 'cernidor_silo', label: 'Cernidor + Silo' },
                        { id: 'chiller', label: 'Chiller' }
                      ].map(mod => {
                        const oeeObj = inputs.oeeModules?.[mod.id] || { d: 92, p: 96, q: 97 };
                        const finalOee = typeof oeeObj === 'number' ? oeeObj : (oeeObj.d * oeeObj.p * oeeObj.q) / 10000;
                        return (
                          <div key={mod.id} className="grid grid-cols-5 gap-2 items-center bg-[#0b0c10] p-2 rounded-lg">
                            <span className="col-span-1 text-[9px] text-gray-400 uppercase font-bold">{mod.label}</span>
                            <div className="col-span-1 flex flex-col">
                              <span className="text-[8px] text-gray-500 mb-1">Disp. %</span>
                              <input type="number" min="50" max="100" value={oeeObj.d || finalOee} onChange={e => handleInputChange('oeeModules', { ...inputs.oeeModules, [mod.id]: { ...oeeObj, d: Number(e.target.value) }})} className="w-full bg-[#14161f] text-[10px] text-white px-2 py-1 border border-slate-800 rounded" />
                            </div>
                            <div className="col-span-1 flex flex-col">
                              <span className="text-[8px] text-gray-500 mb-1">Rend. %</span>
                              <input type="number" min="50" max="100" value={oeeObj.p || 100} onChange={e => handleInputChange('oeeModules', { ...inputs.oeeModules, [mod.id]: { ...oeeObj, p: Number(e.target.value) }})} className="w-full bg-[#14161f] text-[10px] text-white px-2 py-1 border border-slate-800 rounded" />
                            </div>
                            <div className="col-span-1 flex flex-col">
                              <span className="text-[8px] text-gray-500 mb-1">Calidad %</span>
                              <input type="number" min="50" max="100" value={oeeObj.q || 100} onChange={e => handleInputChange('oeeModules', { ...inputs.oeeModules, [mod.id]: { ...oeeObj, q: Number(e.target.value) }})} className="w-full bg-[#14161f] text-[10px] text-white px-2 py-1 border border-slate-800 rounded" />
                            </div>
                            <div className="col-span-1 flex flex-col items-end justify-center">
                              <span className="text-[8px] text-gray-500 mb-1">OEE Final</span>
                              <span className={`text-xs font-black ${finalOee >= 90 ? 'text-emerald-400' : finalOee >= 80 ? 'text-amber-400' : 'text-red-400'}`}>{finalOee.toFixed(1)}%</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      Merma %
                    </label>
                    <span className="text-xs font-black text-red-400">
                      {inputs.wastePercent}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    step="1"
                    value={inputs.wastePercent}
                    onChange={e => handleInputChange('wastePercent', e.target.value)}
                    className="w-full accent-red-500 cursor-pointer bg-slate-800"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* Horarios Operativos */}
          <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-5">
              <Clock className="w-5 h-5 text-teal-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">
                Horarios & Jornadas
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                  Horas por Turno
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={inputs.hoursPerShift}
                  onChange={e => handleInputChange('hoursPerShift', e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white text-center transition-all"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                  Turnos por Día
                </label>
                <select
                  value={inputs.shiftsPerDay}
                  onChange={e => handleInputChange('shiftsPerDay', e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white text-center transition-all cursor-pointer"
                >
                  <option value={1}>1 Turno</option>
                  <option value={2}>2 Turnos</option>
                  <option value={3}>3 Turnos</option>
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                  Días Operativos al Mes
                </label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={inputs.daysPerMonth}
                  onChange={e => handleInputChange('daysPerMonth', e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white transition-all"
                />
              </div>
            </div>
          </div>

          {/* Tarifas & Costos de Insumos */}
          <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-5">
              <Zap className="w-5 h-5 text-teal-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">
                Energía & Parámetros Económicos
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2" title="Tensión de alimentación principal">
                    Voltaje
                  </label>
                  <select
                    value={inputs.voltage}
                    onChange={e => handleInputChange('voltage', Number(e.target.value))}
                    className="w-full px-2 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white transition-all cursor-pointer"
                  >
                    <option value={220}>220V</option>
                    <option value={440}>440V</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      Factor Carga Global vs Dinámico
                    </label>
                    <button 
                      onClick={() => handleInputChange('useAdvancedPower', !inputs.useAdvancedPower)}
                      className="text-[9px] font-bold text-teal-400 uppercase tracking-widest hover:text-teal-300 transition-colors bg-teal-500/10 px-2 py-1 rounded"
                    >
                      {inputs.useAdvancedPower ? 'Usar Factor Simple' : 'Activar Curvas Dinámicas'}
                    </button>
                  </div>
                  
                  {!inputs.useAdvancedPower ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="number" min="10" max="100"
                        value={inputs.loadFactor}
                        onChange={e => handleInputChange('loadFactor', e.target.value)}
                        className="w-24 px-2 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white text-center transition-all"
                      />
                      <span className="text-[10px] font-bold text-gray-500">% fijo para toda la línea</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 bg-[#14161f] p-3 rounded-xl border border-teal-500/20">
                      {[
                        { key: 'conveyor', label: 'Bandas', options: ['Baja', 'Normal', 'Alta'] },
                        { key: 'shredder', label: 'Trituradora', options: ['Baja', 'Normal', 'Alta'] },
                        { key: 'agglomerator', label: 'Aglomeradora', options: ['Limpio-seco', 'Normal', 'Húmedo-denso'] },
                        { key: 'pelletizer', label: 'Peletizadora', options: ['Baja', 'Normal', 'Alta'] },
                        { key: 'chiller', label: 'Chiller', options: ['Baja', 'Normal', 'Alta'] }
                      ].map(eq => (
                        <div key={eq.key} className="flex justify-between items-center bg-[#0b0c10] p-1.5 rounded-lg">
                          <span className="text-[9px] text-gray-400 uppercase w-1/2">{eq.label}</span>
                          <select
                            value={inputs.energyStates?.[eq.key] || 'Normal'}
                            onChange={e => {
                              const newStates = { ...inputs.energyStates, [eq.key]: e.target.value };
                              handleInputChange('energyStates', newStates);
                            }}
                            className="w-1/2 bg-transparent text-[9px] text-teal-400 font-bold focus:outline-none cursor-pointer"
                          >
                            {eq.options.map(opt => <option key={opt} value={opt} className="bg-[#14161f]">{opt}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                    Tarifa
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm font-black text-teal-500 pointer-events-none">$</span>
                    <input
                      type="number"
                      step="0.05"
                      value={inputs.electricityRate}
                      onChange={e => handleInputChange('electricityRate', e.target.value)}
                      className="w-full pl-6 pr-2 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                    Cambio USD/MXN
                  </label>
                  <input
                    type="number"
                    step="0.10"
                    value={inputs.exchangeRate}
                    onChange={e => handleInputChange('exchangeRate', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white text-center transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                    Precio Venta Pellet (MXN/kg)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-teal-500 pointer-events-none">$</span>
                    <input
                      type="number"
                      step="0.10"
                      value={inputs.sellPricePerKg}
                      onChange={e => handleInputChange('sellPricePerKg', e.target.value)}
                      className="w-full pl-8 pr-3 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                  Costo de Materia Prima (MXN/kg Hojuela)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-teal-500 pointer-events-none">$</span>
                  <input
                    type="number"
                    step="0.10"
                    value={inputs.rawMaterialCostPerKg}
                    onChange={e => handleInputChange('rawMaterialCostPerKg', e.target.value)}
                    className="w-full pl-8 pr-3 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white transition-all"
                  />
                </div>
              </div>

              {/* CURVA TÉRMICA & EPC */}
              <div className="grid grid-cols-2 gap-4 mt-2 border-t border-slate-800 pt-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                      Humedad Entrada %
                    </label>
                    <span className={`text-xs font-black ${inputs.thermalConfig?.humidity > 3 ? 'text-red-400' : 'text-teal-400'}`}>
                      {inputs.thermalConfig?.humidity || 1}%
                    </span>
                  </div>
                  <input
                    type="range" min="0" max="10" step="0.5"
                    value={inputs.thermalConfig?.humidity || 1}
                    onChange={e => handleInputChange('thermalConfig', { ...(inputs.thermalConfig || {}), humidity: Number(e.target.value) })}
                    className="w-full accent-teal-500 cursor-pointer bg-slate-800"
                  />
                </div>
                
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                    Nivel de Proyecto
                  </label>
                  <select
                    value={inputs.isEpcMode ? 'EPC' : 'Conceptual'}
                    onChange={e => handleInputChange('isEpcMode', e.target.value === 'EPC')}
                    className="w-full px-4 py-2.5 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white transition-all cursor-pointer"
                  >
                    <option value="Conceptual">Ingeniería Conceptual</option>
                    <option value="EPC">EPC (Llave en Mano)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Mano de Obra & Gastos */}
          <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-5">
              <Wrench className="w-5 h-5 text-teal-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">
                Operación & Gastos Fijos
              </h2>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                    Operadores / Turno
                  </label>
                  <input
                    type="number"
                    value={inputs.numOperators}
                    onChange={e => handleInputChange('numOperators', e.target.value)}
                    className="w-full px-4 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white text-center transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                    Operador / Turno (MXN)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-black text-teal-500 pointer-events-none">$</span>
                    <input
                      type="number"
                      value={inputs.laborCostPerShift}
                      onChange={e => handleInputChange('laborCostPerShift', e.target.value)}
                      className="w-full pl-8 pr-3 py-3 rounded-2xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-sm font-bold text-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[8px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
                    Mtto MXN/mes
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-teal-500 pointer-events-none">$</span>
                    <input
                      type="number"
                      value={inputs.maintenanceCost}
                      onChange={e => handleInputChange('maintenanceCost', e.target.value)}
                      className="w-full pl-6 pr-1.5 py-2.5 rounded-xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
                    Refacc MXN/mes
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-teal-500 pointer-events-none">$</span>
                    <input
                      type="number"
                      value={inputs.sparePartsCost}
                      onChange={e => handleInputChange('sparePartsCost', e.target.value)}
                      className="w-full pl-6 pr-1.5 py-2.5 rounded-xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
                    Agua MXN/mes
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-teal-500 pointer-events-none">$</span>
                    <input
                      type="number"
                      value={inputs.waterCost}
                      onChange={e => handleInputChange('waterCost', e.target.value)}
                      className="w-full pl-6 pr-1.5 py-2.5 rounded-xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Aire Comprimido */}
          <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <Wind className="w-5 h-5 text-teal-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-widest">
                  Aire Comprimido
                </h2>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={inputs.requiresAir}
                  onChange={e => setInputs(p => ({ ...p, requiresAir: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
              </label>
            </div>

            {inputs.requiresAir ? (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
                    Presión (bar)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    value={inputs.airPressureBar}
                    onChange={e => handleInputChange('airPressureBar', e.target.value)}
                    className="w-full px-2.5 py-2.5 rounded-xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white text-center transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
                    Nm³/h
                  </label>
                  <input
                    type="number"
                    value={inputs.airConsumptionNm3}
                    onChange={e => handleInputChange('airConsumptionNm3', e.target.value)}
                    className="w-full px-2.5 py-2.5 rounded-xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white text-center transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
                    MXN/Nm³
                  </label>
                  <div className="relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-black text-teal-500 pointer-events-none">$</span>
                    <input
                      type="number"
                      step="0.05"
                      value={inputs.airCostPerNm3}
                      onChange={e => handleInputChange('airCostPerNm3', e.target.value)}
                      className="w-full pl-6 pr-1.5 py-2.5 rounded-xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white transition-all"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-500 font-medium text-center py-2">
                Sistema neumático omitido. Consumo = 0.
              </p>
            )}
          </div>

          {/* CAPEX Adicional */}
          <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-5">
              <DollarSign className="w-5 h-5 text-teal-400" />
              <h2 className="text-sm font-black text-white uppercase tracking-widest">
                CAPEX Adicional (USD)
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
                  Acometida/Cableado
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-teal-500 pointer-events-none">$</span>
                  <input
                    type="number"
                    value={inputs.capexCableado}
                    onChange={e => handleInputChange('capexCableado', e.target.value)}
                    className="w-full pl-7 pr-2 py-2.5 rounded-xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
                  Maniobras Descarga
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-teal-500 pointer-events-none">$</span>
                  <input
                    type="number"
                    value={inputs.capexManiobras}
                    onChange={e => handleInputChange('capexManiobras', e.target.value)}
                    className="w-full pl-7 pr-2 py-2.5 rounded-xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
                  Montaje Mecánico
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-teal-500 pointer-events-none">$</span>
                  <input
                    type="number"
                    value={inputs.capexMontaje}
                    onChange={e => handleInputChange('capexMontaje', e.target.value)}
                    className="w-full pl-7 pr-2 py-2.5 rounded-xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
                  Obra Civil Base
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-teal-500 pointer-events-none">$</span>
                  <input
                    type="number"
                    value={inputs.capexObraCivil}
                    onChange={e => handleInputChange('capexObraCivil', e.target.value)}
                    className="w-full pl-7 pr-2 py-2.5 rounded-xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white transition-all"
                  />
                </div>
              </div>

              {inputs.requiresAir && (
                <div>
                  <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
                    Compresor Tornillo
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-teal-500 pointer-events-none">$</span>
                    <input
                      type="number"
                      value={inputs.capexCompresor}
                      onChange={e => handleInputChange('capexCompresor', e.target.value)}
                      className="w-full pl-7 pr-2 py-2.5 rounded-xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-1.5">
                  Instalación Adic.
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-teal-500 pointer-events-none">$</span>
                  <input
                    type="number"
                    value={inputs.capexInstalacionAdic}
                    onChange={e => handleInputChange('capexInstalacionAdic', e.target.value)}
                    className="w-full pl-7 pr-2 py-2.5 rounded-xl bg-[#14161f] border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white transition-all"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* CAPEX Eléctrico Dinámico */}
          <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <Zap className="w-5 h-5 text-teal-400" />
                <h2 className="text-sm font-black text-white uppercase tracking-widest">
                  Infraestructura Eléctrica Requerida
                </h2>
              </div>
              <span className="text-[10px] text-teal-500 font-bold bg-teal-500/10 px-2 py-1 rounded">
                CAPEX Inteligente
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-300">
              {[
                { id: 'ccm', label: 'CCM / Tablero Principal', p: '4%' },
                { id: 'cables', label: 'Cableado y Canalización', p: '3%' },
                { id: 'capacitors', label: 'Bancos de Capacitores', p: '1.5%' },
                { id: 'transformer', label: 'Subestación / Transformador', p: '5%' },
                { id: 'engineering', label: 'Ingeniería y Puesta en Marcha', p: '2%' }
              ].map(opt => (
                <label key={opt.id} className="flex items-center gap-2 cursor-pointer p-2 bg-[#14161f] rounded-xl border border-slate-800 hover:border-teal-500/30 transition-colors">
                  <input
                    type="checkbox"
                    checked={inputs.dynamicCapexConfig?.[opt.id] !== false}
                    onChange={e => {
                      const newConfig = { ...inputs.dynamicCapexConfig, [opt.id]: e.target.checked };
                      handleInputChange('dynamicCapexConfig', newConfig);
                    }}
                    className="accent-teal-500 w-4 h-4"
                  />
                  <div className="flex flex-col">
                    <span className="font-bold">{opt.label}</span>
                    <span className="text-[9px] text-teal-400">+{opt.p} CAPEX Base</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

        </div>

        {/* =========================================================================
            PANEL DERECHO: VISOR 3D, KPIs, TABLAS Y GRÁFICAS (MODO OSCURO)
            ========================================================================= */}
        <div className="lg:col-span-8 space-y-8">
          
          {/* --- TWIN DIGITAL 3D CON BARRA COMPLETA (Librería, Subir 3D, Ajustes, Anclado) --- */}
          <div 
            ref={twinBlockRef}
            className={`transition-all duration-300 relative ${
              isTwinBlockFullscreen 
                ? `w-screen h-screen overflow-y-auto ${twinTheme === 'toxic' ? 'bg-[#0d0d0e]' : 'bg-[#05070f]'} p-8 rounded-none border-none z-[9999] flex flex-col justify-between` 
                : twinTheme === 'toxic'
                  ? 'bg-[#121212] border border-[#2c302e] rounded-3xl p-6 shadow-xl overflow-hidden'
                  : 'bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md overflow-hidden'
            }`}
          >
            <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-5 border-b pb-4 ${twinTheme === 'toxic' ? 'border-[#2c302e]' : 'border-slate-800'}`}>
              <div>
                <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${twinTheme === 'toxic' ? 'text-[#84cc16]' : 'text-[#00F0FF]'}`}>
                  <Activity className={`w-4 h-4 animate-pulse ${twinTheme === 'toxic' ? 'text-[#84cc16]' : 'text-[#00F0FF]'}`} />
                  Twin Digital 3D de la Línea
                </h3>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Gemelo digital interactivo y trayectorias de flujo en tiempo real.
                </p>
              </div>

              {/* Controles del Twin de la Imagen 2 */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button 
                  onClick={() => setIsDesignsLibraryOpen(true)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] ${
                    twinTheme === 'toxic'
                      ? 'bg-[#222222] border-[#2c302e] hover:border-[#84cc16] text-[#84cc16] hover:text-white'
                      : 'bg-teal-950/40 hover:bg-teal-900/40 text-[#00F0FF] border border-[#0d9488]/40'
                  }`}
                  title="Abrir librería de layouts guardados"
                >
                  <FolderOpen className="w-3.5 h-3.5" /> Librería
                </button>

                <label 
                  htmlFor="twin-upload-file-lma"
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
                  id="twin-upload-file-lma" 
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
                  title="Restablecer posiciones originales de fábrica"
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
              <div className="mb-4 p-4 rounded-xl bg-black/40 border border-white/5 backdrop-blur-md space-y-4">
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
                        {/* Dot de color */}
                        <span
                          className="w-2.5 h-2.5 rounded-full mx-1.5 flex-shrink-0"
                          style={{ backgroundColor: node.data?.color || '#00F0FF' }}
                        />
                        {/* Nombre → selecciona para mover */}
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
            <div className={`relative rounded-2xl overflow-hidden border ${twinTheme === 'toxic' ? 'border-[#2c302e] bg-[#0c0d0e]' : twinTheme === 'blueprint' ? 'border-slate-800/80 bg-[#edf4f9]' : 'border-slate-800/80 bg-[#05070f]'}`}>
              <SharedTwinViewer3D 
                height={isTwinBlockFullscreen ? "calc(100vh - 280px)" : "410px"} 
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

              {/* Banner flotante inferior de la Imagen 2 */}
              <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5 select-none pointer-events-none">
                <MousePointer className="w-3 h-3 text-[#00F0FF]" />
                Click + arrastrar para orbitar | Scroll para zoom
              </div>
            </div>
          </div>

          {/* --- KPI CARDS EN MOTO OSCURO --- */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-5 shadow-xl backdrop-blur-md flex flex-col justify-between h-[135px]">
              <div>
                <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">
                  Estado Operativo
                </span>
                <div className={`mt-2.5 text-xs font-black px-2.5 py-1.5 rounded-xl border text-center uppercase tracking-wide inline-block ${results.production.statusColor}`}>
                  {results.production.status}
                </div>
              </div>
              <div className="text-[10px] font-bold text-gray-400 tracking-wide">
                Utilización real: {results.production.utilizationPercent.toFixed(1)}%
              </div>
            </div>

            <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-5 shadow-xl backdrop-blur-md flex flex-col justify-between h-[135px]">
              <div>
                <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">
                  CAPEX Total Proyectado
                </span>
                <div className="text-xl font-black text-teal-400 mt-2">
                  {formatCurrency(results.capex.totalMxn, 'MXN')}
                </div>
              </div>
              <div className="text-[10px] font-bold text-gray-400 tracking-wide">
                Maquinaria + Periféricos + Montaje + Obra Civil
              </div>
            </div>

            <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-5 shadow-xl backdrop-blur-md flex flex-col justify-between h-[135px]">
              <div>
                <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">
                  Costo Total Producción
                </span>
                <div className="text-xl font-black text-white mt-2">
                  {formatCurrency(results.opex.totalMxn, 'MXN')}
                </div>
              </div>
              <div className="text-[10px] font-bold text-teal-400 tracking-wide font-black">
                Costo/kg: {results.opex.costPerKgMxn.toFixed(2)} MX/kg
              </div>
            </div>

            <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-5 shadow-xl backdrop-blur-md flex flex-col justify-between h-[135px]">
              <div>
                <span className="text-[10px] font-black text-gray-500 tracking-widest uppercase">
                  Payback Simple Estimado
                </span>
                <div className="text-xl font-black text-teal-400 mt-2">
                  {results.profitability.paybackMonths 
                    ? `${results.profitability.paybackMonths.toFixed(1)} Meses`
                    : 'N/D'}
                </div>
              </div>
              <div className="text-[10px] font-bold text-gray-400 tracking-wide">
                Utilidad: {formatCurrency(results.profitability.profitMxn, 'MXN')}
              </div>
            </div>

          </div>

          {/* --- RESUMEN DE PRODUCTIVIDAD --- */}
          <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <div className="flex items-center gap-2.5">
                <Activity className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-widest">
                  Resumen de Producción Reciclado LMA-500
                </h3>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
              <div className="bg-[#14161f] p-4 rounded-2xl text-center border border-slate-800/50">
                <span className="block text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1">Por Hora</span>
                <span className="text-base font-black text-white">{formatNumber(results.production.effectivePerHour, 0)} kg</span>
              </div>
              <div className="bg-[#14161f] p-4 rounded-2xl text-center border border-slate-800/50">
                <span className="block text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1">Por Turno</span>
                <span className="text-base font-black text-white">{formatNumber(results.production.perShift, 0)} kg</span>
              </div>
              <div className="bg-[#14161f] p-4 rounded-2xl text-center border border-slate-800/50">
                <span className="block text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1">Al Día</span>
                <span className="text-base font-black text-white">{formatNumber(results.production.daily, 0)} kg</span>
              </div>
              <div className="bg-[#14161f] p-4 rounded-2xl text-center border border-slate-800/50">
                <span className="block text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1">Al Mes</span>
                <span className="text-base font-black text-white">{formatNumber(results.production.monthly, 0)} kg</span>
              </div>
              <div className="bg-[#14161f] p-4 rounded-2xl text-center border border-slate-800/50 col-span-2 md:col-span-1">
                <span className="block text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1">Al Año</span>
                <span className="text-base font-black text-teal-400 font-black">{formatNumber(results.production.annual, 0)} kg</span>
              </div>
            </div>
          </div>

          {/* --- TABLA TÉCNICA DE LOS EQUIPOS --- */}
          <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md overflow-hidden">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-5">
              <Cpu className="w-5 h-5 text-teal-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                Desglose Físico y Eléctrico de Equipos SOLIMAQ
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs font-semibold text-gray-400">
                <thead className="bg-[#14161f] text-[10px] font-black text-gray-500 uppercase tracking-wider border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4 text-gray-400">Equipo</th>
                    <th className="py-3 px-4 text-center">Tensión nominal</th>
                    <th className="py-3 px-4 text-center">kW Instalados</th>
                    <th className="py-3 px-4 text-center">Consumo Estimado (kW)</th>
                    <th className="py-3 px-4 text-right">CAPEX Base (MX)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {LMA500_EQUIPMENTS.map(eq => {
                    const estimatedLoadKw = eq.kw * (inputs.loadFactor / 100);
                    return (
                      <tr key={eq.id} className="hover:bg-white/5 transition-colors">
                        <td className="py-3 px-4 font-black text-white">{eq.name}</td>
                        <td className="py-3 px-4 text-center text-gray-500">220 VAC</td>
                        <td className="py-3 px-4 text-center text-white">{eq.kw.toFixed(2)} kW</td>
                        <td className="py-3 px-4 text-center text-teal-400 font-bold">{estimatedLoadKw.toFixed(2)} kW</td>
                        <td className="py-3 px-4 text-right font-black text-white">{formatCurrency(eq.capexUsd, 'USD')}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-teal-950/20 border-t border-slate-800 font-black text-white">
                  <tr>
                    <td className="py-3.5 px-4 font-black text-teal-400">Total Línea</td>
                    <td className="py-3.5 px-4 text-center text-gray-500">-</td>
                    <td className="py-3.5 px-4 text-center text-white">{LMA500_INSTALLED_POWER.toFixed(2)} kW</td>
                    <td className="py-3.5 px-4 text-center text-teal-400 font-black">{results.energy.activePowerKw.toFixed(2)} kW</td>
                    <td className="py-3.5 px-4 text-right text-teal-400 font-black">{formatCurrency(LMA500_BASE_CAPEX, 'USD')}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* --- DESGLOSE DE COSTOS --- */}
          <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-5">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                Desglose de Costos de Producción (Mensual)
              </h3>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                {/* 1. Materia Prima */}
                <div>
                  <h4 className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">1. Costo Materia Prima</h4>
                  <div className="text-xs space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-800/30">
                      <span className="text-gray-400">Materia prima comprada</span>
                      <span className="text-white">{costBreakdown.rawMaterialKg.toFixed(0)} kg</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/30">
                      <span className="text-gray-400">Pellet vendible</span>
                      <span className="text-white">{(results.production.monthly || 0).toFixed(0)} kg</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/30">
                      <span className="text-gray-400">Merma ({results.production.wastePercent || 0}%)</span>
                      <span className="text-red-400">{costBreakdown.wasteKg.toFixed(0)} kg</span>
                    </div>
                    <div className="flex justify-between py-2 border-t border-slate-800/50 font-bold">
                      <span className="text-gray-300">Total Materia Prima</span>
                      <span className="text-teal-400">{formatCurrency(costBreakdown.rawMaterialUsd, 'USD')}</span>
                    </div>
                  </div>
                </div>

                {/* 2. OPEX Operativo */}
                <div>
                  <h4 className="text-xs font-bold text-teal-500 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2">2. OPEX Operativo</h4>
                  <div className="text-xs space-y-2">
                    <div className="flex justify-between py-1 border-b border-slate-800/30">
                      <span className="text-gray-400">Consumo Eléctrico</span>
                      <span className="text-white">{formatCurrency(results.opex.electricUsd, 'USD')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/30">
                      <span className="text-gray-400">Mano de Obra Directa</span>
                      <span className="text-white">{formatCurrency(results.opex.laborUsd, 'USD')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/30">
                      <span className="text-gray-400">Servicios (Aire/Agua)</span>
                      <span className="text-white">{formatCurrency(results.opex.airUsd + results.opex.waterUsd, 'USD')}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-800/30">
                      <span className="text-gray-400">Mantenimiento y Refacciones</span>
                      <span className="text-white">{formatCurrency(results.opex.maintenanceUsd + results.opex.sparePartsUsd, 'USD')}</span>
                    </div>
                    <div className="flex justify-between py-2 border-t border-slate-800/50 font-bold">
                      <span className="text-gray-300">Total Operativo</span>
                      <span className="text-teal-400">{formatCurrency(costBreakdown.operatingOpexUsd, 'USD')}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Costo Total de Producción */}
                <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs font-bold text-gray-400 uppercase">3. Costo Total Producción</span>
                    <span className="text-sm font-black text-white">{formatCurrency(costBreakdown.totalUsd, 'USD')}</span>
                  </div>
                  <div className="text-[10px] space-y-1 mb-3 bg-black/40 p-3 rounded-lg border border-slate-800/80">
                    <div className="font-bold text-gray-500 uppercase mb-2">Desglose Unitario por KG (MXN)</div>
                    <div className="flex justify-between text-gray-400">
                      <span>Materia prima</span>
                      <span>{((costBreakdown.rawMaterialUsd * inputs.exchangeRate) / (results.production.monthly || 1)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Electricidad</span>
                      <span>{((results.opex.electricUsd * inputs.exchangeRate) / (results.production.monthly || 1)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Mano de obra</span>
                      <span>{((results.opex.laborUsd * inputs.exchangeRate) / (results.production.monthly || 1)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Mantenimiento y Refacciones</span>
                      <span>{(((results.opex.maintenanceUsd + results.opex.sparePartsUsd) * inputs.exchangeRate) / (results.production.monthly || 1)).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-400">
                      <span>Agua/Aire</span>
                      <span>{(((results.opex.waterUsd + results.opex.airUsd) * inputs.exchangeRate) / (results.production.monthly || 1)).toFixed(2)}</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-slate-800/50">
                    <span className="text-[10px] text-gray-400 uppercase font-bold tracking-widest">Costo Unitario Total</span>
                    <span className="text-xs font-bold text-teal-400">{results.opex.costPerKgMxn.toFixed(2)} MXN/kg</span>
                  </div>
                </div>
              </div>

              {/* Gráfica y Alertas */}
              <div className="space-y-6 flex flex-col justify-center">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Materia Prima', value: costBreakdown.rawMaterialUsd },
                          { name: 'OPEX Operativo', value: costBreakdown.operatingOpexUsd }
                        ]}
                        cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value"
                      >
                        <Cell fill="#0d9488" />
                        <Cell fill="#6366f1" />
                      </Pie>
                      <Tooltip formatter={(val) => formatCurrency(val, 'USD')} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', fontSize: '12px', color: '#fff' }} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', color: '#cbd5e1' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Alertas Inteligentes UI */}
                <div className="space-y-2 mt-4">
                  <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3 text-xs text-gray-300">
                    El costo operativo de la planta representa únicamente el <strong>{costBreakdown.operatingPercent.toFixed(1)}%</strong> del costo total. El componente dominante es la materia prima adquirida.
                  </div>
                  {costBreakdown.rawMaterialPercent > 80 && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-xs text-amber-200">
                      <strong>Nota Estratégica:</strong> Materia prima domina estructura financiera. La rentabilidad depende del costo de adquisición y control de mermas.
                    </div>
                  )}
                  {costBreakdown.electricPercent > 20 && (
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-200">
                      <strong>Alerta:</strong> Consumo energético elevado respecto al costo total ({costBreakdown.electricPercent.toFixed(1)}%).
                    </div>
                  )}
                  {costBreakdown.maintenancePercent < 0.5 && (
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 text-xs text-blue-200">
                      <strong>Aviso:</strong> Posible subestimación de mantenimiento ({costBreakdown.maintenancePercent.toFixed(2)}%).
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* --- ROI / RETORNO DE INVERSIÓN --- */}
          <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-6">
              <TrendingUp className="w-5 h-5 text-teal-400" />
              <h3 className="text-sm font-black text-white uppercase tracking-widest">
                Retorno de Inversión (Flujo Proyectado)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
              
              <div className="md:col-span-4 space-y-4">
                <div className="bg-[#14161f] p-4 rounded-2xl border border-slate-800/50 text-center">
                  <span className="block text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1">
                    Ingresos Mensuales
                  </span>
                  <span className="text-base font-black text-white">
                    {formatCurrency(results.profitability.revenueUsd, 'USD')}
                  </span>
                </div>

                <div className="bg-[#14161f] p-4 rounded-2xl border border-slate-800/50 text-center">
                  <span className="block text-[8px] font-black text-gray-500 uppercase tracking-wider mb-1">
                    Margen Operativo Mensual
                  </span>
                  <span className="text-base font-black text-teal-400 font-black">
                    {formatCurrency(results.profitability.profitUsd, 'USD')}
                  </span>
                </div>

                <div className="bg-teal-950/20 p-4 rounded-2xl border border-teal-800/40 text-center">
                  <span className="block text-[8px] font-black text-teal-400 uppercase tracking-wider mb-1">
                    Retorno Simple (Meses)
                  </span>
                  <span className="text-lg font-black text-white font-black">
                    {results.profitability.paybackMonths 
                      ? `${results.profitability.paybackMonths.toFixed(1)} Meses`
                      : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Area Chart Cash Flow */}
              <div className="md:col-span-8 h-[240px]">
                <span className="block text-[9px] font-black text-gray-500 uppercase tracking-widest text-center mb-3">
                  Flujo de Efectivo Acumulado Proyectado a 24 Meses (Miles MXN)
                </span>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartCashFlowData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                    <defs>
                      <linearGradient id="colorFlow" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4}/>
                        <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis dataKey="mes" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                    <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
                    <Tooltip formatter={(value) => `${value.toLocaleString()}k MX`} contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b' }} />
                    <Area type="monotone" dataKey="Flujo Acumulado (MXN)" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorFlow)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

            </div>
          </div>

          {/* --- DICTAMEN PARAMÉTRICO AUTOMÁTICO --- */}
          {/* --- DICTAMEN TÉCNICO Y OPERATIVO --- */}
          <div className={`bg-[#0b0c10]/80 border ${
            results.auditDictamen.statusColor === 'emerald' ? 'border-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]' :
            results.auditDictamen.statusColor === 'amber' ? 'border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]' :
            'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)]'
          } rounded-3xl p-6 backdrop-blur-md mt-6`}>
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-lg bg-${results.auditDictamen.statusColor}-500/20 flex items-center justify-center border border-${results.auditDictamen.statusColor}-500/30`}>
                  <Activity className={`w-4 h-4 text-${results.auditDictamen.statusColor}-400`} />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">
                    Dictamen Paramétrico Automático
                  </h3>
                  <p className={`text-[10px] font-bold uppercase tracking-wider text-${results.auditDictamen.statusColor}-400`}>
                    Estatus: {results.auditDictamen.statusText}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Incluir en PDF</span>
                <button 
                  onClick={() => handleInputChange('includeTechAuditPdf', inputs.includeTechAuditPdf === false ? true : false)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${inputs.includeTechAuditPdf !== false ? 'bg-teal-500' : 'bg-slate-700'}`}
                >
                  <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${inputs.includeTechAuditPdf !== false ? 'left-[22px]' : 'left-[3px]'}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-[#14161f] p-3 rounded-xl border border-slate-800">
                <span className="block text-[9px] text-gray-500 uppercase font-black tracking-wider mb-1">Cuello de Botella</span>
                <span className="text-sm text-teal-400 font-black uppercase">{results.auditDictamen.bottleneckId.replace('_', ' ')} ({results.auditDictamen.bottleneckValue}%)</span>
              </div>
              <div className="bg-[#14161f] p-3 rounded-xl border border-slate-800">
                <span className="block text-[9px] text-gray-500 uppercase font-black tracking-wider mb-1">Capacidad Efectiva Real</span>
                <span className="text-sm text-white font-black">{results.production.effectivePerHour.toFixed(1)} kg/h</span>
              </div>
              <div className="bg-[#14161f] p-3 rounded-xl border border-slate-800">
                <span className="block text-[9px] text-gray-500 uppercase font-black tracking-wider mb-1">Potencia Activa Estimada</span>
                <span className="text-sm text-white font-black">{results.energy.activePowerKw.toFixed(1)} kW</span>
              </div>
              <div className="bg-[#14161f] p-3 rounded-xl border border-slate-800">
                <span className="block text-[9px] text-gray-500 uppercase font-black tracking-wider mb-1">Amperaje Principal</span>
                <span className="text-sm text-white font-black">{results.auditDictamen.estimatedAmperage.toFixed(1)} A @ {results.energy.voltage}V</span>
              </div>
            </div>

            {/* Listado de Alertas Técnicas */}
            {(results.warnings.length > 0 || results.auditDictamen.electricalAlerts.length > 0) && (
              <div className="space-y-2 mt-4 pt-4 border-t border-slate-800/50">
                <span className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Registro de Inconsistencias (Logs)</span>
                {[...results.auditDictamen.electricalAlerts, ...results.warnings].map((warn, i) => (
                  <div key={i} className="bg-red-500/5 border border-red-500/10 rounded-lg p-2.5 flex gap-2 items-start">
                    <span className="text-red-500 font-black text-sm leading-none mt-0.5">!</span>
                    <p className="text-[10px] text-red-200/80 font-bold leading-relaxed">{warn}</p>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800/50">
              <label className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-2">Conclusión y Dictamen Oficial (Editable para PDF)</label>
              <textarea
                value={inputs.customDictamenText !== undefined ? inputs.customDictamenText : 'El análisis de amortización proyecta un escenario de inversión sumamente favorable. Con un costo unitario por kilogramo minimizado y una capacidad de carga optimizada, la planta LMA-500 garantiza rentabilidad inmediata.'}
                onChange={(e) => handleInputChange('customDictamenText', e.target.value)}
                className="w-full bg-[#14161f] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-all resize-none"
                rows="3"
              />
              <textarea
                value={inputs.customRecommendationText !== undefined ? inputs.customRecommendationText : 'Recomendación técnica oficial: Proceder a la configuración física del sistema neumático y preparación de acometidas eléctricas según los resultados validados en PANDORA.'}
                onChange={(e) => handleInputChange('customRecommendationText', e.target.value)}
                className="w-full bg-[#14161f] border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-teal-500 transition-all resize-none mt-2"
                rows="2"
              />
            </div>
          </div>

          {/* --- PROYECCIÓN FINANCIERA Y MERCADO --- */}
          <div className="bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 backdrop-blur-md mt-6">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                  <TrendingUp className="w-4 h-4 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">
                    Proyecciones Financieras y Mercado
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Incluir en PDF</span>
                <button 
                  onClick={() => handleInputChange('includeFinancialAuditPdf', inputs.includeFinancialAuditPdf === false ? true : false)}
                  className={`w-10 h-5 rounded-full relative transition-colors ${inputs.includeFinancialAuditPdf !== false ? 'bg-indigo-500' : 'bg-slate-700'}`}
                >
                  <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-[3px] transition-all ${inputs.includeFinancialAuditPdf !== false ? 'left-[22px]' : 'left-[3px]'}`} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-800 pb-2">Comparativa CAPEX</h4>
                <div className="flex justify-between items-center bg-[#14161f] p-3 rounded-lg border border-slate-800">
                  <span className="text-[11px] text-gray-400 font-bold">CAPEX Base (Sin Infra. Dinámica)</span>
                  <span className="text-sm font-black text-white">{formatCurrency(results.capex.totalUsd, 'USD')}</span>
                </div>
                <div className="flex justify-between items-center bg-teal-950/20 p-3 rounded-lg border border-teal-900/30">
                  <span className="text-[11px] text-teal-400 font-bold">CAPEX Ajustado (Recomendado)</span>
                  <span className="text-sm font-black text-teal-400">{formatCurrency(results.capex.totalAdjustedUsd, 'USD')}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-800 pb-2">Proyección Payback</h4>
                <div className="flex justify-between items-center bg-[#14161f] p-2 rounded-lg">
                  <span className="text-[10px] text-gray-400 font-bold uppercase w-1/3">Conservador</span>
                  <span className="text-[11px] font-black text-red-400">{results.scenarios.conservative.paybackMonths ? results.scenarios.conservative.paybackMonths.toFixed(1) + ' Meses' : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center bg-[#14161f] p-2 rounded-lg">
                  <span className="text-[10px] text-gray-400 font-bold uppercase w-1/3">Realista</span>
                  <span className="text-[11px] font-black text-sky-400">{results.scenarios.realistic.paybackMonths ? results.scenarios.realistic.paybackMonths.toFixed(1) + ' Meses' : 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center bg-[#14161f] p-2 rounded-lg">
                  <span className="text-[10px] text-gray-400 font-bold uppercase w-1/3">Optimista</span>
                  <span className="text-[11px] font-black text-emerald-400">{results.scenarios.optimistic.paybackMonths ? results.scenarios.optimistic.paybackMonths.toFixed(1) + ' Meses' : 'N/A'}</span>
                </div>
              </div>

              <div className="space-y-3 col-span-1 md:col-span-2">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-800 pb-2">Benchmark OEM y Modo EPC</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-2 rounded-lg border ${results.benchmark.kwhPerTon.state === 'Verde' ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-amber-500/30 bg-amber-500/5'}`}>
                    <span className="block text-[9px] uppercase font-bold text-gray-400">Consumo Energético Especifico</span>
                    <span className="text-xs font-black text-white">{results.benchmark.kwhPerTon.actual.toFixed(1)} kWh/Ton <span className="text-[9px] text-gray-500 ml-1">(Ref OEM: {results.benchmark.kwhPerTon.expected})</span></span>
                  </div>
                  <div className="p-2 rounded-lg border border-slate-800 bg-[#14161f]">
                    <span className="block text-[9px] uppercase font-bold text-gray-400">Modo Proyecto</span>
                    <span className="text-xs font-black text-teal-400">{results.capex.isEpcMode ? 'Llave en Mano (EPC)' : 'Ingeniería Conceptual'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Listado de Alertas de Mercado */}
            {results.auditDictamen.marketAlerts.length > 0 && (
              <div className="space-y-2 mt-4 pt-4 border-t border-slate-800/50">
                <span className="block text-[9px] font-black text-gray-500 uppercase tracking-widest mb-3">Logs de Viabilidad Comercial</span>
                {results.auditDictamen.marketAlerts.map((warn, i) => (
                  <div key={i} className="bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 flex gap-2 items-start">
                    <span className="text-amber-500 font-black text-sm leading-none mt-0.5">!</span>
                    <p className="text-[10px] text-amber-200/80 font-bold leading-relaxed">{warn}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

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
                  placeholder="Ej: Planta LMA-500"
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

      {/* --- PREMIUM GLASSMORPHISM DIALOG FOR MATERIAL MANAGEMENT --- */}
      {isAddMaterialModalOpen && (
        <div 
          className="fixed inset-0 z-50 overflow-y-auto bg-[#050608]/85 p-4 md:py-12 backdrop-blur-md flex justify-center items-start cursor-pointer"
          style={{ backdropFilter: 'blur(20px)' }}
          onClick={() => setIsAddMaterialModalOpen(false)}
        >
          {/* Centered glass beveled card */}
          <div 
            className="relative w-full max-w-6xl bg-[#0a0d14]/95 border border-teal-500/35 rounded-[32px] p-6 md:p-8 shadow-[0_0_60px_rgba(20,184,166,0.25)] backdrop-blur-3xl transition-all my-auto cursor-default"
            style={{
              boxShadow: 'inset 0 0 40px rgba(20, 184, 166, 0.1), 0 30px 60px -15px rgba(0, 0, 0, 0.7)',
              borderWidth: '1.5px',
              borderColor: 'rgba(20, 184, 166, 0.35) rgba(20, 184, 166, 0.15) rgba(20, 184, 166, 0.15) rgba(20, 184, 166, 0.35)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Neon tab accent at the top */}
            <div className="absolute -top-3.5 left-8 px-6 py-1.5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-[10px] font-black uppercase tracking-widest text-black shadow-[0_0_20px_rgba(20,184,166,0.65)]">
              ADMINISTRACIÓN DE MATERIALES
            </div>

            <button 
              onClick={() => setIsAddMaterialModalOpen(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors text-lg font-bold"
            >
              ✕
            </button>

            {/* Custom Theme Scrollbar Styles */}
            <style>{`
              .custom-theme-scrollbar::-webkit-scrollbar {
                width: 6px;
                height: 6px;
              }
              .custom-theme-scrollbar::-webkit-scrollbar-track {
                background: rgba(20, 22, 31, 0.4);
                border-radius: 9999px;
              }
              .custom-theme-scrollbar::-webkit-scrollbar-thumb {
                background: linear-gradient(to bottom, #14b8a6, #06b6d4);
                border-radius: 9999px;
                box-shadow: 0 0 8px rgba(20, 184, 166, 0.4);
              }
              .custom-theme-scrollbar::-webkit-scrollbar-thumb:hover {
                background: #2dd4bf;
              }
            `}</style>

            <h3 className="text-xl font-black text-white uppercase tracking-wider mb-6 flex items-center gap-2">
              <Layers className="w-5 h-5 text-teal-400" />
              Gestión de Materiales y Costos Operativos
            </h3>

            <div className="space-y-6">
              {/* --- INLINE HORIZONTAL REGISTRAR COMMAND BAR --- */}
              <div className="bg-[#14161f]/40 border border-slate-800/80 rounded-2xl p-5 shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]">
                <span className="block text-xs font-black text-cyan-400 uppercase tracking-widest border-b border-slate-800/60 pb-2 mb-4">
                  Registrar Nuevo Material en el Sistema
                </span>
                
                <div 
                  className="gap-4 items-end"
                  style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.2fr 0.8fr 1fr 1fr auto' }}
                >
                  {/* Name */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                      Nombre del Material
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. ABS Premium Rígido"
                      value={newMatName}
                      onChange={e => setNewMatName(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b0c10]/95 border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white transition-all"
                    />
                  </div>

                  {/* Classification */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                      Clasificación
                    </label>
                    <select
                      value={newMatClassification}
                      onChange={e => setNewMatClassification(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#0b0c10]/95 border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white cursor-pointer"
                    >
                      <option value="Post-Industrial">Post-Industrial</option>
                      <option value="Post-Consumo">Post-Consumo</option>
                    </select>
                  </div>

                  {/* Density */}
                  <div>
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                      Densidad (g/cm³)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      defaultValue={0.92}
                      className="w-full px-4 py-2.5 rounded-xl bg-[#0b0c10]/95 border border-slate-800 focus:outline-none focus:border-teal-400 text-xs font-bold text-white text-center"
                      id="modalMatDensity"
                    />
                  </div>

                  {/* Raw Price */}
                  <div className="relative">
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                      Costo Compra ($/kg)
                    </label>
                    <span className="absolute left-2.5 bottom-3 text-xs font-black text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.1"
                      value={newMatRawPrice}
                      onChange={e => setNewMatRawPrice(parseFloat(e.target.value) || 0)}
                      className="w-full pl-6 pr-2 py-2.5 rounded-xl bg-[#0b0c10]/95 border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white text-left"
                    />
                  </div>

                  {/* Sell Price */}
                  <div className="relative">
                    <label className="block text-[10px] font-black uppercase text-gray-400 tracking-wider mb-2">
                      Precio Venta ($/kg)
                    </label>
                    <span className="absolute left-2.5 bottom-3 text-xs font-black text-gray-500">$</span>
                    <input
                      type="number"
                      step="0.1"
                      value={newMatSellPrice}
                      onChange={e => setNewMatSellPrice(parseFloat(e.target.value) || 0)}
                      className="w-full pl-6 pr-2 py-2.5 rounded-xl bg-[#0b0c10]/95 border border-slate-800 focus:outline-none focus:border-teal-500 text-xs font-bold text-white text-left"
                    />
                  </div>

                  {/* Submit Button */}
                  <div>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newMatName.trim()) return;
                        const newId = 'custom_' + Date.now();
                        const densityInput = parseFloat(document.getElementById('modalMatDensity')?.value) || 0.92;
                        const newMat = {
                          id: newId,
                          name: newMatName.trim(),
                          density: densityInput,
                          classification: newMatClassification,
                          rawPrice: newMatRawPrice,
                          sellPrice: newMatSellPrice,
                          includeInOpex: true
                        };
                        setMaterials(prev => [...prev, newMat]);
                        setInputs(prev => ({
                          ...prev,
                          materialType: newId,
                          rawMaterialCostPerKg: newMatRawPrice,
                          sellPricePerKg: newMatSellPrice,
                          includeRawMaterialInOpex: true
                        }));
                        setNewMatName('');
                        setIsAddMaterialModalOpen(false);
                      }}
                      className="py-2.5 px-6 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 text-black text-xs font-black uppercase tracking-widest shadow-[0_0_15px_rgba(20,184,166,0.3)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
                    >
                      + Registrar
                    </button>
                  </div>
                </div>
              </div>

              {/* --- ACTIVE MATERIAL TELEMETRY CARD (REAL-TIME STREAM) --- */}
              {(() => {
                const activeMat = materials.find(m => m.id === inputs.materialType) || materials[0];
                if (!activeMat) return null;
                return (
                  <div 
                    className="bg-gradient-to-r from-teal-500/10 to-cyan-500/10 border border-teal-500/30 rounded-2xl p-5 shadow-[0_0_20px_rgba(20,184,166,0.15)] relative overflow-hidden"
                    style={{
                      borderWidth: '1.5px',
                      borderColor: 'rgba(20, 184, 166, 0.3) rgba(20, 184, 166, 0.1) rgba(20, 184, 166, 0.1) rgba(20, 184, 166, 0.3)'
                    }}
                  >
                    <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-teal-500/5 blur-2xl pointer-events-none" />
                    
                    <div className="flex items-center gap-2 mb-4">
                      <Sliders className="w-4 h-4 text-teal-400" />
                      <span className="text-[10px] font-black uppercase text-teal-300 tracking-wider">
                        Ficha de Telemetría y Especificaciones (Material Seleccionado)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-center">
                      {/* Name */}
                      <div className="md:col-span-2 space-y-1">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Nombre del Material</div>
                        <input
                          type="text"
                          value={activeMat.name}
                          onChange={e => handleUpdateMaterialField(activeMat.id, 'name', e.target.value)}
                          className="w-full bg-transparent border-b border-teal-500/20 focus:border-teal-400 text-base font-black text-white focus:outline-none transition-all py-1"
                        />
                        <div className="text-[9px] text-teal-400/80 font-bold uppercase tracking-wider flex items-center gap-1.5 mt-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                          Transmitiendo datos en tiempo real al simulador
                        </div>
                      </div>

                      {/* Classification */}
                      <div className="space-y-1">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Clasificación</div>
                        <select
                          value={activeMat.classification}
                          onChange={e => handleUpdateMaterialField(activeMat.id, 'classification', e.target.value)}
                          className="w-full bg-transparent border-b border-teal-500/20 focus:border-teal-400 text-xs font-bold text-white focus:outline-none cursor-pointer py-1"
                        >
                          <option value="Post-Industrial" className="bg-[#0b0c10]">Post-Industrial</option>
                          <option value="Post-Consumo" className="bg-[#0b0c10]">Post-Consumo</option>
                        </select>
                      </div>

                      {/* Density */}
                      <div className="space-y-1">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Densidad del Material</div>
                        <div className="flex items-center gap-1.5 py-1">
                          <input
                            type="number"
                            step="0.01"
                            value={activeMat.density || 0.92}
                            onChange={e => handleUpdateMaterialField(activeMat.id, 'density', parseFloat(e.target.value) || 0)}
                            className="w-16 bg-transparent border-b border-teal-500/20 focus:border-teal-400 text-sm font-black text-white focus:outline-none text-center"
                          />
                          <span className="text-[10px] text-teal-400 font-black uppercase">g/cm³</span>
                        </div>
                      </div>

                      {/* Prices & OPEX Margin */}
                      <div className="space-y-1">
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Márgen Comercial</div>
                        <div className="text-sm font-black text-emerald-400 py-1">
                          +${((activeMat.sellPrice - activeMat.rawPrice) || 0).toFixed(2)} <span className="text-[10px] text-gray-400 font-bold">MXN/kg</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* --- FULL-WIDTH MATERIALS LIST --- */}
              <div className="space-y-4">
                <span className="block text-xs font-black text-teal-400 uppercase tracking-widest border-b border-slate-800 pb-2">
                  Materiales en el Sistema (Edición en Tiempo Real)
                </span>
                
                <div className="max-h-[360px] overflow-y-auto pr-2 space-y-2.5 custom-theme-scrollbar">
                  {/* Header Row */}
                  <div 
                    className="gap-4 px-4 py-2 text-[11px] font-black uppercase text-teal-400 tracking-wider border-b border-slate-800/60 items-center"
                    style={{ display: 'grid', gridTemplateColumns: '85px 1fr 180px 95px 95px 65px' }}
                  >
                    <div className="text-left">Estado</div>
                    <div className="text-left">Nombre del Material</div>
                    <div className="text-left">Clasificación</div>
                    <div className="text-center">Compra ($/kg)</div>
                    <div className="text-center">Venta ($/kg)</div>
                    <div className="text-center">OPEX</div>
                  </div>

                  {materials.map(m => {
                    const isActive = inputs.materialType === m.id;
                    return (
                      <div 
                        key={m.id} 
                        className={`gap-4 px-4 py-3 rounded-2xl border transition-all items-center cursor-pointer ${
                          isActive 
                            ? 'bg-teal-500/10 border-teal-500/50 shadow-[0_0_15px_rgba(20,184,166,0.08)]' 
                            : 'bg-[#14161f]/40 border-slate-800 hover:border-slate-700'
                        }`}
                        style={{ display: 'grid', gridTemplateColumns: '85px 1fr 180px 95px 95px 65px' }}
                        onClick={(e) => {
                          if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'SELECT' && e.target.tagName !== 'BUTTON') {
                            setSelectedMaterialDetail(m);
                          }
                        }}
                      >
                        {/* Selector LED */}
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleActivateMaterial(m.id)}
                            className="flex items-center gap-2"
                          >
                            <span className={`w-3.5 h-3.5 rounded-full border transition-all ${
                              isActive 
                                ? 'bg-teal-400 border-teal-300 shadow-[0_0_10px_rgba(20,184,166,0.8)]' 
                                : 'bg-transparent border-slate-600 hover:border-teal-500'
                            }`} />
                            <span className={`text-[10px] font-black uppercase tracking-wider ${isActive ? 'text-teal-300' : 'text-gray-400 hover:text-white'}`}>
                              {isActive ? 'Activo' : 'Activar'}
                            </span>
                          </button>
                        </div>

                        {/* Name Input */}
                        <div>
                          <input 
                            type="text" 
                            value={m.name} 
                            onChange={e => handleUpdateMaterialField(m.id, 'name', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#0b0c10]/95 border border-slate-800 text-xs font-bold text-white focus:border-teal-500 focus:outline-none transition-all" 
                          />
                        </div>

                        {/* Classification Dropdown */}
                        <div>
                          <select
                            value={m.classification}
                            onChange={e => handleUpdateMaterialField(m.id, 'classification', e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#0b0c10]/95 border border-slate-800 text-xs font-bold text-white focus:border-teal-500 focus:outline-none transition-all cursor-pointer"
                          >
                            <option value="Post-Industrial">Post-Industrial</option>
                            <option value="Post-Consumo">Post-Consumo</option>
                          </select>
                        </div>

                        {/* Costo Compra */}
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-xs font-black text-gray-500">$</span>
                          <input 
                            type="number" 
                            step="0.1"
                            value={m.rawPrice} 
                            onChange={e => handleUpdateMaterialField(m.id, 'rawPrice', parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-2 rounded-xl bg-[#0b0c10]/95 border border-slate-800 text-xs font-bold text-white text-left focus:border-teal-500 focus:outline-none" 
                          />
                        </div>

                        {/* Precio Venta */}
                        <div className="relative flex items-center">
                          <span className="absolute left-2.5 text-xs font-black text-gray-500">$</span>
                          <input 
                            type="number" 
                            step="0.1"
                            value={m.sellPrice} 
                            onChange={e => handleUpdateMaterialField(m.id, 'sellPrice', parseFloat(e.target.value) || 0)}
                            className="w-full pl-6 pr-2 py-2 rounded-xl bg-[#0b0c10]/95 border border-slate-800 text-xs font-bold text-white text-left focus:border-teal-500 focus:outline-none" 
                          />
                        </div>

                        {/* OPEX Toggle / Delete action */}
                        <div className="flex items-center justify-center gap-3">
                          <input
                            type="checkbox"
                            checked={m.includeInOpex !== false}
                            onChange={e => handleUpdateMaterialField(m.id, 'includeInOpex', e.target.checked)}
                            className="w-5 h-5 rounded border-slate-800 text-teal-500 bg-[#14161f]/50 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                          />
                          {m.id.startsWith('custom_') && (
                            <button
                              type="button"
                              onClick={() => {
                                setMaterials(prev => prev.filter(item => item.id !== m.id));
                                if (isActive) {
                                  handleActivateMaterial('hdpe');
                                }
                              }}
                              title="Eliminar Material"
                              className="text-rose-400 hover:text-rose-300 transition-colors text-sm font-bold"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="mt-8 flex justify-end gap-3 border-t border-slate-800 pt-4">
              <button
                type="button"
                onClick={() => setIsAddMaterialModalOpen(false)}
                className="px-6 py-2.5 bg-gradient-to-r from-teal-500/10 to-cyan-500/10 hover:from-teal-500/20 hover:to-cyan-500/20 text-teal-400 border border-teal-500/30 hover:border-teal-500/50 text-xs font-black uppercase tracking-widest rounded-xl transition-all duration-300"
              >
                Cerrar Administrador
              </button>
            </div>

            {/* ── MODAL: DETALLE DE MATERIAL (abre al hacer clic en fila) ─── */}
            {selectedMaterialDetail && (() => {
              const dm = materials.find(m => m.id === selectedMaterialDetail.id) || selectedMaterialDetail;
              const isActiveDm = inputs.materialType === dm.id;
              const margen = ((dm.sellPrice || 0) - (dm.rawPrice || 0)).toFixed(2);
              return (
                <div
                  className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
                  style={{ background: 'rgba(5,6,8,0.88)', backdropFilter: 'blur(16px)' }}
                  onClick={() => setSelectedMaterialDetail(null)}
                >
                  <div
                    className="relative w-full max-w-lg rounded-[28px] p-8 shadow-[0_0_80px_rgba(20,184,166,0.25)] cursor-default"
                    style={{
                      background: 'linear-gradient(135deg, #0a0d14 0%, #0e1320 100%)',
                      border: '1.5px solid rgba(20,184,166,0.35)',
                      boxShadow: 'inset 0 0 40px rgba(20,184,166,0.06), 0 30px 60px rgba(0,0,0,0.7)'
                    }}
                    onClick={e => e.stopPropagation()}
                  >
                    {/* Neon badge */}
                    <div className="absolute -top-3.5 left-8 px-5 py-1.5 rounded-full bg-gradient-to-r from-teal-500 to-cyan-500 text-[10px] font-black uppercase tracking-widest text-black shadow-[0_0_20px_rgba(20,184,166,0.65)]">
                      Ficha Técnica del Material
                    </div>

                    {/* Close btn */}
                    <button
                      onClick={() => setSelectedMaterialDetail(null)}
                      className="absolute top-5 right-5 w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>

                    {/* Material name headline */}
                    <div className="mt-4 mb-6">
                      <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-1">Nombre del Material</p>
                      <input
                        type="text"
                        value={dm.name}
                        onChange={e => {
                          handleUpdateMaterialField(dm.id, 'name', e.target.value);
                          setSelectedMaterialDetail(prev => ({ ...prev, name: e.target.value }));
                        }}
                        className="w-full bg-transparent border-b-2 border-teal-500/30 focus:border-teal-400 text-xl font-black text-white focus:outline-none transition-all py-1"
                      />
                      {isActiveDm && (
                        <span className="inline-flex items-center gap-1.5 mt-2 text-[10px] font-black uppercase text-teal-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-teal-400 animate-ping" />
                          Material activo en el simulador
                        </span>
                      )}
                    </div>

                    {/* Grid de datos */}
                    <div className="grid grid-cols-2 gap-4 mb-6">

                      {/* Clasificación */}
                      <div className="col-span-2 bg-white/3 rounded-2xl p-4 border border-white/5">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Clasificación del Material</p>
                        <select
                          value={dm.classification}
                          onChange={e => {
                            handleUpdateMaterialField(dm.id, 'classification', e.target.value);
                            setSelectedMaterialDetail(prev => ({ ...prev, classification: e.target.value }));
                          }}
                          className="w-full bg-[#0b0c10] border border-slate-700 text-sm font-bold text-white rounded-xl px-4 py-2.5 focus:outline-none focus:border-teal-500 cursor-pointer transition-all"
                        >
                          <option value="Post-Consumo">Post-Consumo</option>
                          <option value="Post-Industrial">Post-Industrial</option>
                        </select>
                      </div>

                      {/* Densidad */}
                      <div className="bg-white/3 rounded-2xl p-4 border border-white/5">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Densidad</p>
                        <div className="flex items-end gap-2">
                          <input
                            type="number"
                            step="0.01"
                            value={dm.density || 0.92}
                            onChange={e => {
                              const v = parseFloat(e.target.value) || 0;
                              handleUpdateMaterialField(dm.id, 'density', v);
                              setSelectedMaterialDetail(prev => ({ ...prev, density: v }));
                            }}
                            className="w-24 bg-transparent border-b border-teal-500/30 focus:border-teal-400 text-lg font-black text-white focus:outline-none text-center transition-all"
                          />
                          <span className="text-[11px] text-teal-400 font-black uppercase mb-0.5">g/cm³</span>
                        </div>
                      </div>

                      {/* Margen comercial */}
                      <div className="bg-white/3 rounded-2xl p-4 border border-white/5">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Margen Comercial</p>
                        <p className={`text-lg font-black ${parseFloat(margen) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {parseFloat(margen) >= 0 ? '+' : ''}{margen}
                          <span className="text-[11px] text-gray-400 font-bold ml-1">MXN/kg</span>
                        </p>
                      </div>

                      {/* Precio de Compra */}
                      <div className="bg-white/3 rounded-2xl p-4 border border-white/5">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Precio de Compra</p>
                        <div className="flex items-end gap-1.5">
                          <span className="text-sm font-black text-gray-500 mb-0.5">$</span>
                          <input
                            type="number"
                            step="0.1"
                            value={dm.rawPrice}
                            onChange={e => {
                              const v = parseFloat(e.target.value) || 0;
                              handleUpdateMaterialField(dm.id, 'rawPrice', v);
                              setSelectedMaterialDetail(prev => ({ ...prev, rawPrice: v }));
                            }}
                            className="w-24 bg-transparent border-b border-teal-500/30 focus:border-teal-400 text-lg font-black text-white focus:outline-none text-center transition-all"
                          />
                          <span className="text-[11px] text-gray-400 font-bold mb-0.5">MXN/kg</span>
                        </div>
                      </div>

                      {/* Precio de Venta */}
                      <div className="bg-white/3 rounded-2xl p-4 border border-white/5">
                        <p className="text-[10px] font-black uppercase text-gray-500 tracking-wider mb-2">Precio de Venta</p>
                        <div className="flex items-end gap-1.5">
                          <span className="text-sm font-black text-gray-500 mb-0.5">$</span>
                          <input
                            type="number"
                            step="0.1"
                            value={dm.sellPrice}
                            onChange={e => {
                              const v = parseFloat(e.target.value) || 0;
                              handleUpdateMaterialField(dm.id, 'sellPrice', v);
                              setSelectedMaterialDetail(prev => ({ ...prev, sellPrice: v }));
                            }}
                            className="w-24 bg-transparent border-b border-teal-500/30 focus:border-teal-400 text-lg font-black text-white focus:outline-none text-center transition-all"
                          />
                          <span className="text-[11px] text-gray-400 font-bold mb-0.5">MXN/kg</span>
                        </div>
                      </div>

                      {/* Incluir en OPEX */}
                      <div className="col-span-2 flex items-center justify-between bg-white/3 rounded-2xl px-4 py-3.5 border border-white/5">
                        <div>
                          <p className="text-[11px] font-black uppercase text-gray-300 tracking-wider">Incluir en Cálculo OPEX</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">Activa para que el costo de materia prima se sume al OPEX mensual</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const next = dm.includeInOpex === false ? true : false;
                            handleUpdateMaterialField(dm.id, 'includeInOpex', next);
                            setSelectedMaterialDetail(prev => ({ ...prev, includeInOpex: next }));
                          }}
                          className={`relative w-12 h-6 rounded-full transition-all duration-300 flex-shrink-0 ${
                            dm.includeInOpex !== false ? 'bg-teal-500 shadow-[0_0_10px_rgba(20,184,166,0.5)]' : 'bg-slate-700'
                          }`}
                        >
                          <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-300 ${
                            dm.includeInOpex !== false ? 'left-6' : 'left-0.5'
                          }`} />
                        </button>
                      </div>
                    </div>

                    {/* Footer CTAs */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          handleActivateMaterial(dm.id);
                          setSelectedMaterialDetail(null);
                        }}
                        disabled={isActiveDm}
                        className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-black text-xs uppercase tracking-widest shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0"
                      >
                        {isActiveDm ? '✓ Material Activo en Simulador' : 'Activar este Material'}
                      </button>
                      <button
                        onClick={() => setSelectedMaterialDetail(null)}
                        className="px-5 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/10 text-xs font-black uppercase tracking-widest transition-all"
                      >
                        Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* --- IN-APP EXECUTIVE REPORT VIEW MODAL (Exactamente a 12 Páginas) --- */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#050608]/95 overflow-y-auto p-4 md:p-6" style={{ backdropFilter: 'blur(16px)' }}>
          
          {/* Sticky Toolbar de Control en el Reporte */}
          <div className="max-w-[1140px] w-full mx-auto bg-[#0a0d14]/90 border border-white/10 rounded-2xl px-6 py-4 flex items-center justify-between shadow-2xl mb-6 sticky top-2 z-50 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-teal-500/20 flex items-center justify-center border border-teal-500/30">
                <FileText className="w-5 h-5 text-teal-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">
                  {inputs.projectName || 'INFORME INDUSTRIAL SOLIMAQ LMA-500'}
                </h3>
                <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest">
                  PANDORA 3.0 • VISOR DE {14 + (inputs.includeTechAuditPdf !== false ? 2 : 0) + (inputs.includeFinancialAuditPdf !== false ? 1 : 0)} PÁGINAS MÁSTER
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={printReport}
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

          {/* CONTENEDOR MÁSTER DE 12 PÁGINAS (Hojas en Vista Previa e Imprimibles) */}
          <div ref={reportRef} className="lma-report-wrap" style={{ width: '1120px', margin: '0 auto' }}>
            
            {/* ==========================================
                PÁGINA 1: PORTADA PRINCIPAL (COVER)
                ========================================== */}
            <div className="lma-page" style={S.page}>
              {/* Top Banner Gradient */}
              <div style={{ height: 80, background: 'linear-gradient(to right, #008299, #00c2cb)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(120deg, transparent, transparent 28px, rgba(255,255,255,0.03) 28px, rgba(255,255,255,0.03) 30px)' }} />
                
                {/* Brand Logo & Version badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2 }}>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
                    RECILOGIC
                  </span>
                  <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 800, color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '2px 8px', background: 'rgba(255,255,255,0.1)' }}>
                    PANDORA 3.0 · V7.80
                  </span>
                </div>

                {/* Right side line metadata */}
                <div style={{ textAlign: 'right', position: 'relative', zIndex: 2 }}>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    LÍNEA DE RECICLADO DE PLÁSTICOS LMA-500
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: 700, marginTop: 3 }}>
                    CLIENTE: {inputs.clientName.toUpperCase()} &nbsp;|&nbsp; MÁQUINA: LMA-500 &nbsp;|&nbsp; FECHA: {new Date().toLocaleDateString()}
                  </div>
                </div>
              </div>

              {/* Cover Content */}
              <div className="lma-page-inner" style={{ ...S.inner, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 40, alignItems: 'center', marginTop: -20, flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    {/* Small tag */}
                    <div style={{ fontSize: 9, fontWeight: 900, color: '#008299', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                      INFORME PARAMÉTRICO DE SIMULACIÓN
                    </div>
                    
                    {/* Main Title */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 44, fontWeight: 900, color: '#0f2038', letterSpacing: -0.8, lineHeight: 1.0, fontFamily: 'sans-serif' }}>
                        SIMULACIÓN
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 4, height: 38, background: '#00c2cb', borderRadius: 2 }} />
                        <div style={{ fontSize: 44, fontWeight: 900, color: '#00c2cb', letterSpacing: -0.8, lineHeight: 1.0, fontFamily: 'sans-serif' }}>
                          DE LÍNEA
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Cliente Section */}
                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 900, color: '#00c2cb', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 }}>
                      CLIENTE
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#0f2038', letterSpacing: -0.5 }}>
                      {inputs.clientName.toUpperCase()}
                    </div>
                  </div>

                  {/* Horizon Pill */}
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content', background: '#edfbfd', border: '1px solid #00c2cb', borderRadius: 20, padding: '4px 14px', fontSize: 10, color: '#008299', fontWeight: 800 }}>
                    <span style={{ display: 'inline-block', width: 6, height: 6, background: '#008299', borderRadius: '50%' }} />
                    Horizonte Y1 – Y5
                  </div>

                  <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.6, margin: 0 }}>
                    Análisis de capacidad, potencia instalada y viabilidad financiera para la línea de reciclado de plásticos SOLIMAQ LMA-500.
                  </p>

                  {/* Calculation Base Card */}
                  <div style={{ background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 16, padding: 18 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '8px', fontSize: 11, color: '#475569' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#008299', fontWeight: 700 }}>Empresa</span>
                        <strong style={{ color: '#1e293b' }}>MÁQUINA EN EVALUACIÓN - LMA-500 | IASE</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#008299', fontWeight: 700 }}>Cliente</span>
                        <strong style={{ color: '#1e293b' }}>{inputs.clientName}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#008299', fontWeight: 700 }}>Máquina</span>
                        <strong style={{ color: '#1e293b' }}>SOLIMAQ LMA-500</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#008299', fontWeight: 700 }}>Proyecto</span>
                        <strong style={{ color: '#1e293b' }}>Informe Paramétrico de Simulación</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#008299', fontWeight: 700 }}>Fecha</span>
                        <strong style={{ color: '#1e293b' }}>{new Date().toLocaleDateString()}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Material Parámetro Activo Card */}
                  <div style={{ background: '#f0fdfa', border: '1px solid #99f6e4', borderRadius: 16, padding: 18, marginTop: -8 }}>
                    <span style={{ fontSize: 9, fontWeight: 900, color: '#0f766e', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 8 }}>PARÁMETROS DEL MATERIAL SIMULADO</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '6px', fontSize: 11, color: '#475569' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#0f766e', fontWeight: 700 }}>Material</span>
                        <strong style={{ color: '#0f172a' }}>{materials.find(m => m.id === inputs.materialType)?.name || (inputs.materialType === 'custom' ? inputs.customMaterialName : inputs.materialType)}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#0f766e', fontWeight: 700 }}>Clasificación</span>
                        <strong style={{ color: '#0f172a' }}>{materials.find(m => m.id === inputs.materialType)?.classification || 'Post-Consumo'}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#0f766e', fontWeight: 700 }}>Precio Mercado (Compra)</span>
                        <strong style={{ color: '#0f172a' }}>{formatCurrency(inputs.rawMaterialCostPerKg, 'MXN')}/kg</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#0f766e', fontWeight: 700 }}>Precio de Venta (Extruido)</span>
                        <strong style={{ color: '#0d9488', fontWeight: 800 }}>{formatCurrency(inputs.sellPricePerKg, 'MXN')}/kg</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Results Preview Widget (Matching BDP 150 layout exactly) */}
                <div style={{ background: '#edfbfd', border: '1px solid #b2f5ea', borderRadius: 24, padding: 28, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <span style={{ fontSize: 12, fontWeight: 900, color: '#008299', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block' }}>
                    VISTA PREVIA DE RESULTADOS
                  </span>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ borderBottom: '1px solid #b2f5ea', paddingBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block' }}>Capacidad Nominal</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Máx {inputs.nominalCapacity || 500} kg/h</span>
                      </div>
                      <strong style={{ fontSize: 24, color: '#008299', fontWeight: 900 }}>{inputs.capacityDesired ? inputs.capacityDesired.toFixed(1) : '500.0'} kg/h</strong>
                    </div>

                    <div style={{ borderBottom: '1px solid #b2f5ea', paddingBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block' }}>Potencia Instalada</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Total motores</span>
                      </div>
                      <strong style={{ fontSize: 24, color: '#008299', fontWeight: 900 }}>{LMA500_INSTALLED_POWER.toFixed(2)} kW</strong>
                    </div>

                    <div style={{ borderBottom: '1px solid #b2f5ea', paddingBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block' }}>Consumo Nominal</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Carga activa al {inputs.loadFactor}%</span>
                      </div>
                      <strong style={{ fontSize: 24, color: '#008299', fontWeight: 900 }}>{results.energy.activePowerKw.toFixed(2)} kW</strong>
                    </div>

                    <div style={{ borderBottom: '1px solid #b2f5ea', paddingBottom: 12 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 8 }}>
                        <div>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block' }}>Costo Unitario Total</span>
                          <span style={{ fontSize: 11, color: '#64748b' }}>Por kg procesado</span>
                        </div>
                        <strong style={{ fontSize: 24, color: '#008299', fontWeight: 900 }}>{results.opex.costPerKgMxn.toFixed(2)} MXN</strong>
                      </div>
                      <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
                        <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, flex: 1 }}>
                          <span style={{ display: 'block', color: '#64748b', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Mat. Prima (C/ Merma)</span>
                          <span style={{ color: '#008299', fontWeight: 900 }}>${((costBreakdown.rawMaterialUsd * inputs.exchangeRate) / (results.production.monthly || 1)).toFixed(2)}</span>
                        </div>
                        <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, flex: 1 }}>
                          <span style={{ display: 'block', color: '#64748b', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Energía</span>
                          <span style={{ color: '#008299', fontWeight: 900 }}>${((results.opex.electricUsd * inputs.exchangeRate) / (results.production.monthly || 1)).toFixed(2)}</span>
                        </div>
                        <div style={{ background: '#f1f5f9', padding: '4px 8px', borderRadius: 6, flex: 1 }}>
                          <span style={{ display: 'block', color: '#64748b', fontSize: 9, fontWeight: 700, textTransform: 'uppercase' }}>Otros Op.</span>
                          <span style={{ color: '#008299', fontWeight: 900 }}>${(((results.opex.laborUsd + results.opex.maintenanceUsd + results.opex.sparePartsUsd + results.opex.waterUsd + results.opex.airUsd) * inputs.exchangeRate) / (results.production.monthly || 1)).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <div>
                        <span style={{ fontSize: 12, fontWeight: 700, color: '#1e293b', display: 'block' }}>Retorno Estimado</span>
                        <span style={{ fontSize: 11, color: '#64748b' }}>Payback simple</span>
                      </div>
                      <strong style={{ fontSize: 24, color: '#008299', fontWeight: 900 }}>{results.profitability.paybackMonths ? `${results.profitability.paybackMonths.toFixed(1)} Meses` : 'N/D'}</strong>
                    </div>
                  </div>
                </div>
              </div>

              {renderPageFooter(pgPortada, totalPgs)}
            </div>

            {/* ==========================================
                PÁGINA 2: ESPECIFICACIONES DE EQUIPOS
                ========================================== */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pgSpecs}. Especificaciones Técnicas y Desglose de Equipos`, 'Listado físico nominal con potencias individuales calculadas al factor de carga')}
                
                <table style={{ w: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr>
                      <th style={{ ...REPORT_STYLES.th, background: '#edfbfd' }}>Equipo</th>
                      <th style={{ ...REPORT_STYLES.th, background: '#edfbfd', textAlign: 'center' }}>Voltaje</th>
                      <th style={{ ...REPORT_STYLES.th, background: '#edfbfd', textAlign: 'center' }}>kW Instalados</th>
                      <th style={{ ...REPORT_STYLES.th, background: '#edfbfd', textAlign: 'center' }}>Carga Activa ({inputs.loadFactor}%)</th>
                      <th style={{ ...REPORT_STYLES.th, background: '#edfbfd', textAlign: 'right' }}>CAPEX Base (MX)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {LMA500_EQUIPMENTS.map(eq => (
                      <tr key={eq.id}>
                        <td style={REPORT_STYLES.td}>{eq.name}</td>
                        <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>220 VAC</td>
                        <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{eq.kw.toFixed(2)} kW</td>
                        <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#0d9488', fontWeight: 700 }}>{(eq.kw * (inputs.loadFactor / 100)).toFixed(2)} kW</td>
                        <td style={{ ...REPORT_STYLES.td, textAlign: 'right', fontWeight: 800 }}>{formatCurrency(eq.capexUsd, 'USD')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                      <td style={{ ...REPORT_STYLES.td, color: '#0d9488' }}>Total Línea Completa</td>
                      <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>-</td>
                      <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{LMA500_INSTALLED_POWER.toFixed(2)} kW</td>
                      <td style={{ ...REPORT_STYLES.td, textAlign: 'center', color: '#0d9488' }}>{results.energy.activePowerKw.toFixed(2)} kW</td>
                      <td style={{ ...REPORT_STYLES.td, textAlign: 'right', color: '#0d9488' }}>{formatCurrency(LMA500_BASE_CAPEX, 'USD')}</td>
                    </tr>
                  </tfoot>
                </table>

                <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, fontSize: 10, color: '#475569', lineHeight: 1.4 }}>
                  <strong>Nota del Ingeniero:</strong> Los componentes han sido calibrados mecánicamente para un voltaje nominal de **220 VAC** según los requerimientos eléctricos estándar de plantas de reciclaje en México.
                </div>

                {/* Gráfica de Distribución de Potencia de Equipos */}
                <div style={{ marginTop: 15, background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 16, padding: '14px 20px' }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: '#008299', textTransform: 'uppercase', letterSpacing: 1, display: 'block', marginBottom: 8 }}>DISTRIBUCIÓN DE POTENCIA POR EQUIPO (kW)</span>
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none', fontSize: 9, lineHeight: '1.4' }}>
                    <tbody>
                      {LMA500_EQUIPMENTS.map(eq => {
                        const percentage = (eq.kw / LMA500_INSTALLED_POWER) * 100;
                        return (
                          <tr key={eq.id} style={{ border: 'none' }}>
                            <td style={{ width: 150, color: '#475569', fontWeight: 600, padding: '4px 0 4px 20px', verticalAlign: 'middle', whiteSpace: 'nowrap', border: 'none' }}>
                              {eq.name}
                            </td>
                            <td style={{ padding: '4px 10px', verticalAlign: 'middle', border: 'none' }}>
                              <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden', width: '100%' }}>
                                <div style={{ width: `${percentage}%`, height: '100%', background: 'linear-gradient(90deg, #008299, #00c2cb)', borderRadius: 3 }} />
                              </div>
                            </td>
                            <td style={{ width: 75, textAlign: 'right', fontWeight: 700, color: '#1e293b', padding: '4px 20px 4px 0', verticalAlign: 'middle', whiteSpace: 'nowrap', border: 'none' }}>
                              {eq.kw.toFixed(1)} kW
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
              {renderPageFooter(pgSpecs, totalPgs)}
            </div>

            {/* ==========================================
                PÁGINA 3: GEMELO DIGITAL - VISTA LATERAL
                ========================================== */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pg3DSide}. Gemelo Digital 3D - Vista Lateral / Principal`, 'Visualización técnica principal y dimensionamiento de la línea de reciclado Solimaq')}
                
                <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 20, background: '#edf4f9', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {twinSnapshotLateral ? (
                    <img 
                      src={twinSnapshotLateral} 
                      alt="Vista Lateral" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain'
                      }} 
                    />
                  ) : twinSnapshot ? (
                    <img 
                      src={twinSnapshot} 
                      alt="Twin Snapshot Fallback" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain'
                      }} 
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#94a3b8' }}>
                      <span style={{ fontSize: 32 }}>📷</span>
                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Vista Lateral no capturada</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 15, fontSize: 9, color: '#64748b', fontWeight: 600 }}>
                  <div>• Altura Máxima: <strong style={{ color: '#0f172a' }}>3.2 metros</strong></div>
                  <div>• Ancho Operativo: <strong style={{ color: '#0f172a' }}>4.8 metros</strong></div>
                  <div>• Longitud Total de Línea: <strong style={{ color: '#0f172a' }}>24.5 metros lineales</strong></div>
                </div>
              </div>
              {renderPageFooter(pg3DSide, totalPgs)}
            </div>

            {/* ==========================================
                PÁGINA 4: GEMELO DIGITAL - VISTA SUPERIOR
                ========================================== */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pg3DTop}. Gemelo Digital 3D - Vista Superior (Planta)`, 'Composición en planta y distribución espacial de los módulos de reciclado')}
                
                <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 20, background: '#edf4f9', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {twinSnapshotSuperior ? (
                    <img 
                      src={twinSnapshotSuperior} 
                      alt="Vista Superior" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain'
                      }} 
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#94a3b8' }}>
                      <span style={{ fontSize: 32 }}>📷</span>
                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Vista Superior no capturada</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 15, fontSize: 9, color: '#64748b', fontWeight: 600 }}>
                  <div>• Altura Máxima: <strong style={{ color: '#0f172a' }}>3.2 metros</strong></div>
                  <div>• Ancho Operativo: <strong style={{ color: '#0f172a' }}>4.8 metros</strong></div>
                  <div>• Longitud Total de Línea: <strong style={{ color: '#0f172a' }}>24.5 metros lineales</strong></div>
                </div>
              </div>
              {renderPageFooter(pg3DTop, totalPgs)}
            </div>

            {/* ==========================================
                PÁGINA 5: GEMELO DIGITAL - VISTA ISOMÉTRICA
                ========================================== */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pg3DIso}. Gemelo Digital 3D - Vista Isométrica (Perspectiva)`, 'Visualización volumétrica y profundidad tridimensional de la línea Solimaq')}
                
                <div style={{ flex: 1, border: '1px solid #e2e8f0', borderRadius: 20, background: '#edf4f9', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {twinSnapshotIsometrica ? (
                    <img 
                      src={twinSnapshotIsometrica} 
                      alt="Vista Isométrica" 
                      style={{ 
                        width: '100%', 
                        height: '100%', 
                        objectFit: 'contain'
                      }} 
                    />
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, color: '#94a3b8' }}>
                      <span style={{ fontSize: 32 }}>📷</span>
                      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>Vista Isométrica no capturada</span>
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: 15, fontSize: 9, color: '#64748b', fontWeight: 600 }}>
                  <div>• Altura Máxima: <strong style={{ color: '#0f172a' }}>3.2 metros</strong></div>
                  <div>• Ancho Operativo: <strong style={{ color: '#0f172a' }}>4.8 metros</strong></div>
                  <div>• Longitud Total de Línea: <strong style={{ color: '#0f172a' }}>24.5 metros lineales</strong></div>
                </div>
              </div>
              {renderPageFooter(pg3DIso, totalPgs)}
            </div>

            {/* ==========================================
                PÁGINA 4: RENDIMIENTO OPERATIVO
                ========================================== */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pgScenarios}. Escenarios y Rendimiento Operativo de Producción`, 'Proyecciones operacionales para hojuelas rígidas y flexibles según el material')}
                
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={REPORT_STYLES.th}>Material</th>
                      <th style={{ ...REPORT_STYLES.th, textAlign: 'center' }}>Por Hora (kg)</th>
                      <th style={{ ...REPORT_STYLES.th, textAlign: 'center' }}>Por Turno ({inputs.hoursPerShift} hrs)</th>
                      <th style={{ ...REPORT_STYLES.th, textAlign: 'center' }}>Mensual ({inputs.daysPerMonth} días)</th>
                      <th style={{ ...REPORT_STYLES.th, textAlign: 'right' }}>Anual (Toneladas)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {materials.map(m => {
                      const hourly = inputs.capacityDesired * (m.density || 0.92);
                      const shift = hourly * inputs.hoursPerShift;
                      const monthly = shift * inputs.shiftsPerDay * inputs.daysPerMonth;
                      const annual = (monthly * 12) / 1000;
                      return (
                        <tr key={m.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ ...REPORT_STYLES.td, fontWeight: 700 }}>{m.name}</td>
                          <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{formatNumber(hourly, 0)} kg</td>
                          <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{formatNumber(shift, 0)} kg</td>
                          <td style={{ ...REPORT_STYLES.td, textAlign: 'center' }}>{formatNumber(monthly, 0)} kg</td>
                          <td style={{ ...REPORT_STYLES.td, textAlign: 'right', fontWeight: 800, color: '#0d9488' }}>{formatNumber(annual, 1)} Tons</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                <div style={{ background: '#fcfdfe', border: '1px solid #ccfbf1', borderRadius: 16, padding: 18, fontSize: 10, color: '#0f766e', lineHeight: 1.4 }}>
                  <strong>Análisis de Escenario {materials.find(m => m.id === inputs.materialType)?.name || 'HDPE'} (Simulación Activa):</strong> Procesando este material se proyecta una producción mensual de **{formatNumber(results.production.monthly, 0)} kg** de pellet extrusionado de alta calidad, logrando una eficiencia de utilización de línea del **{results.production.utilizationPercent.toFixed(1)}%** respecto a la nominal.
                </div>

                {/* Gráfica de Proyección de Materiales */}
                <div style={{ marginTop: 15, background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 16, padding: '16px 20px' }}>
                  <span style={{ fontSize: 9, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 20 }}>PROYECCIÓN ANUAL DE TONELADAS POR MATERIAL</span>
                  <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: 125, paddingTop: 10 }}>
                    {materials.map((m, idx) => {
                      const hourly = inputs.capacityDesired * (m.density || 0.92);
                      const annual = (hourly * inputs.hoursPerShift * inputs.shiftsPerDay * inputs.daysPerMonth * 12) / 1000;
                      const barHeight = Math.min(80, (annual / 5000) * 80);
                      
                      const colors = [
                        { text: '#4f46e5', grad: 'linear-gradient(180deg, #818cf8, #4f46e5)' }, // PE
                        { text: '#0d9488', grad: 'linear-gradient(180deg, #2dd4bf, #0d9488)' }, // PP
                        { text: '#ea580c', grad: 'linear-gradient(180deg, #fb923c, #ea580c)' }, // HDPE
                        { text: '#2563eb', grad: 'linear-gradient(180deg, #60a5fa, #2563eb)' }, // LDPE
                        { text: '#059669', grad: 'linear-gradient(180deg, #34d399, #059669)' }, // Film
                        { text: '#e11d48', grad: 'linear-gradient(180deg, #fb7185, #e11d48)' }, // Postindustrial
                        { text: '#db2777', grad: 'linear-gradient(180deg, #f472b6, #db2777)' }, // Postconsumo
                        { text: '#9333ea', grad: 'linear-gradient(180deg, #c084fc, #9333ea)' }  // Otro
                      ];
                      const c = colors[idx % colors.length];

                      return (
                        <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 80 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, color: c.text }}>{formatNumber(annual, 0)} T</span>
                          <div style={{ width: 28, height: 80, background: '#e9ecef', borderRadius: '4px 4px 0 0', display: 'flex', alignItems: 'flex-end' }}>
                            <div style={{ width: '100%', height: `${barHeight}px`, background: c.grad, borderRadius: '4px 4px 0 0' }} />
                          </div>
                          <span style={{ fontSize: 9, color: '#475569', fontWeight: 600, textAlign: 'center', whiteSpace: 'nowrap' }}>{m.name}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              {renderPageFooter(pgScenarios, totalPgs)}
            </div>

            {/* ==========================================
                PÁGINA 5: EFICIENCIA ENERGÉTICA
                ========================================== */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pgEnergy}. Modelo de Carga y Eficiencia Energética`, 'Distribución de demanda kW instalada vs activa en factor de carga')}

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: -2 }}>

                  {/* KPI Cards — 4 energy categories */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                    {/* Category 1 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 16, padding: '14px 20px' }}>
                      <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg, #fb923c, #ea580c)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Cpu style={{ width: 22, height: 22, color: '#ffffff' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>Extrusión Principal</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Peletizadora PT-500</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#ea580c', lineHeight: 1 }}>{(246 * (inputs.loadFactor/100)).toFixed(1)}</div>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>kW  ·  67.4%</div>
                      </div>
                    </div>

                    {/* Category 2 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 16, padding: '14px 20px' }}>
                      <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg, #60a5fa, #2563eb)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Activity style={{ width: 22, height: 22, color: '#ffffff' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>Termo-Compactación</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Aglomeradora</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#2563eb', lineHeight: 1 }}>{(56 * (inputs.loadFactor/100)).toFixed(1)}</div>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>kW  ·  15.3%</div>
                      </div>
                    </div>

                    {/* Category 3 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 16, padding: '14px 20px' }}>
                      <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg, #34d399, #059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Wrench style={{ width: 22, height: 22, color: '#ffffff' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>Molienda y Triturado</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>GSX500</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#059669', lineHeight: 1 }}>{(41 * (inputs.loadFactor/100)).toFixed(1)}</div>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>kW  ·  11.2%</div>
                      </div>
                    </div>

                    {/* Category 4 */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 16, padding: '14px 20px' }}>
                      <div style={{ width: 46, height: 46, borderRadius: 12, background: 'linear-gradient(135deg, #c084fc, #9333ea)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Wind style={{ width: 22, height: 22, color: '#ffffff' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 800, color: '#1e293b', marginBottom: 2 }}>Enfriamiento y Carga</div>
                        <div style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Banda + Silo + Chiller</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 22, fontWeight: 900, color: '#9333ea', lineHeight: 1 }}>{(21.9 * (inputs.loadFactor/100)).toFixed(1)}</div>
                        <div style={{ fontSize: 10, color: '#64748b', fontWeight: 700 }}>kW  ·  6.1%</div>
                      </div>
                    </div>

                  </div>

                  {/* Chart */}
                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, padding: '20px 20px 12px', display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', textAlign: 'center', marginBottom: 8 }}>Distribución Eléctrica de Carga (kW)</span>
                    <div style={{ flex: 1, minHeight: 200 }}>
                      <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={chartPowerData.slice(2, 6)} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" stroke="#475569" style={{ fontSize: '11px', fontWeight: 'bold' }} angle={-15} textAnchor="end" />
                          <YAxis stroke="#475569" style={{ fontSize: '11px' }} />
                          <Tooltip formatter={(value) => `${value} kW`} contentStyle={{ fontSize: 12 }} />
                          <Bar dataKey="kW en Carga (Factor)" radius={[10, 10, 0, 0]} label={{ position: 'top', style: { fontSize: 12, fontWeight: 800, fill: '#0f172a' }, formatter: v => `${v}kW` }}>
                            {chartPowerData.slice(2, 6).map((entry, index) => {
                              const barColors = ['#ea580c', '#2563eb', '#059669', '#9333ea'];
                              return <Cell key={`cell-${index}`} fill={barColors[index % barColors.length]} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Balance total footer */}
                <div style={{ background: 'linear-gradient(135deg, #edfbfd, #f0fdf4)', border: '1px solid #b2f5ea', borderRadius: 16, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ width: 48, height: 48, borderRadius: 14, background: 'linear-gradient(135deg, #2dd4bf, #0d9488)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Zap style={{ width: 24, height: 24, color: '#ffffff' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>Balance Eléctrico Nominal</div>
                    <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
                      Potencia activa total en operación: <strong style={{ color: '#008299', fontSize: 14 }}>{results.energy.activePowerKw.toFixed(2)} kW</strong> · Factor de potencia proyectado <strong>0.88 Cos Phi</strong> · Factor de carga configurado: <strong>{inputs.loadFactor}%</strong>
                    </div>
                  </div>
                  <div style={{ textAlign: 'center', flexShrink: 0 }}>
                    <div style={{ fontSize: 28, fontWeight: 900, color: '#008299', lineHeight: 1 }}>{results.energy.activePowerKw.toFixed(1)}</div>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 700 }}>kW ACTIVOS</div>
                  </div>
                </div>

              </div>
              {renderPageFooter(pgEnergy, totalPgs)}
            </div>

            {/* ==========================================
                PÁGINA 6: COSTOS ENERGÉTICOS
                ========================================== */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pgCostosE}. Tarifas y Costos de Energía Eléctrica`, 'Detalle analítico del gasto energético mensual y anual en planta')}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'stretch', flex: 1, padding: '15px 0' }}>
                  <div>
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, padding: '24px 28px', boxShadow: '0 4px 20px rgba(0, 0, 0, 0.01)' }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: '#00cbd6', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: 16 }}>DESGLOSE DE CONSUMOS</span>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: '#334155' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: 8 }}>
                          <span>Tarifa simulada (MXN/kWh):</span>
                          <strong style={{ color: '#0f172a' }}>{inputs.electricityRate.toFixed(2)} MXN</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: 8 }}>
                          <span>Consumo por Hora (kWh):</span>
                          <strong style={{ color: '#0f172a' }}>{results.energy.activePowerKw.toFixed(1)} kWh</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: 8 }}>
                          <span>Costo Eléctrico por Hora:</span>
                          <strong style={{ color: '#0f172a' }}>{formatCurrency(results.energy.hourlyCostMxn, 'MXN')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: 8 }}>
                          <span>Costo Eléctrico por Turno ({inputs.hoursPerShift}h):</span>
                          <strong style={{ color: '#0f172a' }}>{formatCurrency(results.energy.hourlyCostMxn * inputs.hoursPerShift, 'MXN')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #edf2f7', paddingBottom: 8, alignItems: 'center' }}>
                          <span style={{ fontWeight: 700 }}>Costo Eléctrico Mensual:</span>
                          <strong style={{ color: '#008299', fontSize: 16, fontWeight: 900 }}>{formatCurrency(results.energy.monthlyCostMxn, 'MXN')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
                          <span style={{ fontWeight: 700 }}>Costo Eléctrico Anual:</span>
                          <strong style={{ color: '#0d9488', fontSize: 18, fontWeight: 900 }}>{formatCurrency(results.energy.annualCostMxn, 'MXN')}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #f8fafc, #edfbfd)', border: '1px solid #b2f5ea', borderRadius: 20, padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(13, 148, 136, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(13, 148, 136, 0.2)' }}>
                        <Clock className="w-5 h-5 text-teal-600 animate-pulse" style={{ color: '#0d9488' }} />
                      </div>
                      <div>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#00cbd6', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: 8 }}>RECOMENDACIÓN DE EFICIENCIA</span>
                        <p style={{ fontSize: 13, color: '#008299', lineHeight: 1.6, margin: 0, fontWeight: 500, textAlign: 'justify' }}>
                          Operando en tarifas de media tensión GDMTO o GDMTH, se recomienda programar la operación durante los horarios <strong>Base e Intermedio</strong> para evitar los cargos por demanda en horario punta, lo cual puede reducir el costo por kWh simulado hasta en un <strong>18.5%</strong>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráfica de Comparativa GDMTH */}
                <div style={{ marginTop: 24, background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 20, padding: '20px 24px' }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 16 }}>COMPARATIVA DE TARIFA POR HORARIO (GDMTH)</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, fontSize: 12 }}>
                      <span style={{ width: 140, color: '#475569', fontWeight: 700 }}>Horario Base (Bajo)</span>
                      <div style={{ flex: 1, height: 16, background: '#e9ecef', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ width: '40%', height: '100%', background: 'linear-gradient(90deg, #2dd4bf, #0d9488)', borderRadius: 8 }} />
                      </div>
                      <span style={{ width: 110, textAlign: 'right', fontWeight: 800, color: '#0d9488' }}>{inputs.electricityRate.toFixed(2)} MXN/kWh</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, fontSize: 12 }}>
                      <span style={{ width: 140, color: '#475569', fontWeight: 700 }}>Horario Intermedio</span>
                      <div style={{ flex: 1, height: 16, background: '#e9ecef', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ width: '65%', height: '100%', background: 'linear-gradient(90deg, #60a5fa, #2563eb)', borderRadius: 8 }} />
                      </div>
                      <span style={{ width: 110, textAlign: 'right', fontWeight: 800, color: '#2563eb' }}>{(inputs.electricityRate * 1.3).toFixed(2)} MXN/kWh</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 15, fontSize: 12 }}>
                      <span style={{ width: 140, color: '#475569', fontWeight: 700 }}>Horario Punta (Alto)</span>
                      <div style={{ flex: 1, height: 16, background: '#e9ecef', borderRadius: 8, overflow: 'hidden' }}>
                        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, #fb7185, #e11d48)', borderRadius: 8 }} />
                      </div>
                      <span style={{ width: 110, textAlign: 'right', fontWeight: 800, color: '#e11d48' }}>{(inputs.electricityRate * 2.1).toFixed(2)} MXN/kWh</span>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, fontSize: 10, color: '#64748b', fontWeight: 500 }}>
                  • El cálculo incluye el factor de carga promedio y asume un voltaje de alimentación estable de 220 VAC.
                </div>
              </div>
              {renderPageFooter(pgCostosE, totalPgs)}
            </div>

            {/* ==========================================
                PÁGINA 7: CONSUMOS NEUMÁTICOS E HÍDRICOS
                ========================================== */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pgConsumos}. Consumos Neumáticos e Hídricos (Servicios Planta)`, 'Evaluación de requerimientos de aire y fluidos de enfriamiento')}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'stretch', flex: 1, padding: '15px 0' }}>
                  <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#edfbfd', borderBottom: '2.5px solid #008299' }}>
                          <th style={{ ...REPORT_STYLES.th, fontSize: 11, padding: '12px 14px', background: '#edfbfd' }}>Servicio Técnico</th>
                          <th style={{ ...REPORT_STYLES.th, fontSize: 11, padding: '12px 14px', background: '#edfbfd', textAlign: 'center' }}>Especificación</th>
                          <th style={{ ...REPORT_STYLES.th, fontSize: 11, padding: '12px 14px', background: '#edfbfd', textAlign: 'center' }}>Consumo Nominal</th>
                          <th style={{ ...REPORT_STYLES.th, fontSize: 11, padding: '12px 14px', background: '#edfbfd', textAlign: 'right' }}>Costo Mensual</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ ...REPORT_STYLES.td, padding: '15px 14px', fontSize: 12 }}>Enfriamiento por Chiller</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '15px 14px', fontSize: 12, textAlign: 'center' }}>Refrigerante R410a</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '15px 14px', fontSize: 12, textAlign: 'center', fontWeight: 600 }}>150 L/h reposición</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '15px 14px', fontSize: 12, textAlign: 'right', fontWeight: 800, color: '#008299' }}>{formatCurrency(inputs.waterCost, 'USD')}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ ...REPORT_STYLES.td, padding: '15px 14px', fontSize: 12 }}>Aire Comprimido (Cribado)</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '15px 14px', fontSize: 12, textAlign: 'center' }}>7.0 Bar presión</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '15px 14px', fontSize: 12, textAlign: 'center', fontWeight: 600 }}>{inputs.requiresAir ? `${inputs.airConsumptionNm3} Nm3/h` : '0 Nm3/h'}</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '15px 14px', fontSize: 12, textAlign: 'right', fontWeight: 800, color: '#0d9488' }}>{formatCurrency(results.opex.airUsd, 'USD')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #f8fafc, #edfbfd)', border: '1px solid #b2f5ea', borderRadius: 20, padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#00cbd6', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: 16 }}>PARÁMETROS HÍDRICOS Y OPERACIÓN</span>
                    <div style={{ fontSize: 13, color: '#475569', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00cbd6', flexShrink: 0 }} />
                        <span>Reposición estimada chiller: <strong>150 litros/hora</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00cbd6', flexShrink: 0 }} />
                        <span>Reposición total por turno: <strong>1,200 litros</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#00cbd6', marginTop: 6, flexShrink: 0 }} />
                        <span>Recomendación chiller: <strong>Reposición de volumen mediante chiller de circuito cerrado de 10 toneladas incluido.</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Gráfica de Indicadores Neumáticos e Hídricos */}
                <div style={{ marginTop: 24, background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 24, padding: '24px 32px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 30, boxShadow: '0 4px 20px rgba(0, 0, 0, 0.01)' }}>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#008299', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 12, textAlign: 'center' }}>USO HÍDRICO (RECIRCULACIÓN)</span>
                    <div style={{ position: 'relative', height: 115, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <svg width="200" height="100" viewBox="0 0 200 100">
                        <defs>
                          <linearGradient id="waterGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#00cbd6" />
                            <stop offset="100%" stopColor="#0d9488" />
                          </linearGradient>
                        </defs>
                        <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="#e9ecef" strokeWidth="12" strokeLinecap="round" />
                        <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="url(#waterGaugeGrad)" strokeWidth="12" strokeDasharray="252" strokeDashoffset="10" strokeLinecap="round" />
                        <text x="100" y="80" textAnchor="middle" fontSize="24" fontWeight="900" fill="#0f172a">96%</text>
                      </svg>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'center', marginTop: 4 }}>Tasa de Recirculación de Agua</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>Circuito Ecológico Cerrado</div>
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#00cbd6', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 12, textAlign: 'center' }}>CARGA NEUMÁTICA (AIRE)</span>
                    <div style={{ position: 'relative', height: 115, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                      <svg width="200" height="100" viewBox="0 0 200 100">
                        <defs>
                          <linearGradient id="airGaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#2563eb" />
                          </linearGradient>
                        </defs>
                        <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="#e9ecef" strokeWidth="12" strokeLinecap="round" />
                        <path d="M 20 90 A 80 80 0 0 1 180 90" fill="none" stroke="url(#airGaugeGrad)" strokeWidth="12" strokeDasharray="252" strokeDashoffset={inputs.requiresAir ? "63" : "252"} strokeLinecap="round" />
                        <text x="100" y="80" textAnchor="middle" fontSize="24" fontWeight="900" fill="#0f172a">{inputs.requiresAir ? "75%" : "0%"}</text>
                      </svg>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#475569', textAlign: 'center', marginTop: 4 }}>Utilización de Presión (7.0 Bar)</div>
                      <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'center' }}>Consumo Neumático Activo</div>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, fontSize: 10, color: '#64748b', fontWeight: 500 }}>
                  • Consumos neumáticos estimados según la presión neumática de cribado a 7.0 bar.
                </div>
              </div>
              {renderPageFooter(pgConsumos, totalPgs)}
            </div>

            {/* ==========================================
                PÁGINA X: INFRAESTRUCTURA Y OEE
                ========================================== */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pgOEE}. Auditoría de Infraestructura y OEE Dinámico`, 'Desglose detallado de eficiencia por módulo y curva eléctrica real estimada')}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, flex: 1, padding: '10px 0' }}>
                  
                  {/* Fila 1: OEE por módulo */}
                  <div style={{ background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 16, padding: '16px 20px' }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 12 }}>EFICIENCIA OPERATIVA POR MÓDULO (OEE)</span>
                    <div style={{ display: 'flex', gap: 15, justifyContent: 'space-between', alignItems: 'center' }}>
                      {Object.entries(results.production.oeeModules || {}).map(([key, val]) => (
                        <div key={key} style={{ flex: 1, textAlign: 'center' }}>
                          <div style={{ position: 'relative', height: 80, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', background: '#e2e8f0', borderRadius: 6, overflow: 'hidden' }}>
                            <div style={{ width: '100%', height: `${val.oee}%`, background: val.oee < 85 ? '#ef4444' : val.oee < 90 ? '#f59e0b' : '#0d9488', transition: 'height 0.3s' }}></div>
                            <span style={{ position: 'absolute', width: '100%', bottom: 5, fontSize: 10, fontWeight: 900, color: '#ffffff', textShadow: '0 1px 2px rgba(0,0,0,0.5)' }}>{val.oee.toFixed(1)}%</span>
                          </div>
                          <span style={{ fontSize: 8, fontWeight: 700, color: '#475569', textTransform: 'uppercase', display: 'block', marginTop: 6, lineHeight: 1.1 }}>{key.replace('_', ' ')}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Fila 2: Curva Eléctrica y Alertas Eléctricas */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 20 }}>
                    {/* Curva Eléctrica */}
                    <div style={{ background: '#fcfdfe', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px 20px' }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 12 }}>CURVA DE CARGA DE POTENCIA (kW)</span>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10 }}>
                        <thead>
                          <tr style={{ background: '#edfbfd', borderBottom: '2px solid #008299' }}>
                            <th style={{ ...REPORT_STYLES.th, padding: '6px' }}>Equipo</th>
                            <th style={{ ...REPORT_STYLES.th, padding: '6px', textAlign: 'center' }}>kW Instalados</th>
                            <th style={{ ...REPORT_STYLES.th, padding: '6px', textAlign: 'center' }}>Estado de Carga</th>
                            <th style={{ ...REPORT_STYLES.th, padding: '6px', textAlign: 'right' }}>kW Reales</th>
                          </tr>
                        </thead>
                        <tbody>
                          {results.energy.equipmentPowerDetails?.map((eq) => (
                            <tr key={eq.id} style={{ borderBottom: '1px solid #edf2f7' }}>
                              <td style={{ ...REPORT_STYLES.td, padding: '6px', fontWeight: 700 }}>{eq.name}</td>
                              <td style={{ ...REPORT_STYLES.td, padding: '6px', textAlign: 'center' }}>{eq.kw.toFixed(2)}</td>
                              <td style={{ ...REPORT_STYLES.td, padding: '6px', textAlign: 'center' }}>{Math.round(eq.factor * 100)}%</td>
                              <td style={{ ...REPORT_STYLES.td, padding: '6px', textAlign: 'right', fontWeight: 800, color: '#0d9488' }}>{eq.realKw.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Alertas Infraestructura Eléctrica */}
                    <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 16, padding: '16px 20px' }}>
                      <span style={{ fontSize: 11, fontWeight: 900, color: '#b45309', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 12 }}>REQUISITOS DE INFRAESTRUCTURA ELÉCTRICA</span>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 10, color: '#92400e', fontWeight: 600 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #fcd34d', paddingBottom: 6 }}>
                          <span>Corriente Estimada Principal:</span>
                          <span style={{ fontWeight: 900 }}>{results.energy.estimatedAmperage.toFixed(1)} Amperes</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #fcd34d', paddingBottom: 6 }}>
                          <span>Tensión de Operación:</span>
                          <span style={{ fontWeight: 900 }}>{results.energy.voltage} VAC Trifásico</span>
                        </div>
                        <div style={{ marginTop: 6 }}>
                          <span style={{ fontSize: 9, fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>Dictamen Técnico de Instalación:</span>
                          <ul style={{ margin: 0, paddingLeft: 14, fontSize: 9, lineHeight: 1.4 }}>
                            {results.auditDictamen.electricalAlerts.length > 0 
                              ? results.auditDictamen.electricalAlerts.map((a, i) => <li key={i}>{a}</li>)
                              : <li>Instalación de bajo requerimiento. No requiere infraestructura mayor.</li>}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>
              {renderPageFooter(pgOEE, totalPgs)}
            </div>

            {/* ==========================================
                PÁGINA 8: ESTRUCTURA DEL CAPEX
                ========================================== */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pgCAPEX}. Estructura de Inversión Inicial Proyectada (CAPEX)`, 'Presupuesto general y desglose de gastos de ingeniería, montaje e instalación')}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, alignItems: 'stretch', flex: 1, padding: '15px 0' }}>
                  <div>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#edfbfd', borderBottom: '2.5px solid #008299' }}>
                          <th style={{ ...REPORT_STYLES.th, fontSize: 11, padding: '12px 14px', background: '#edfbfd' }}>Categoría del CAPEX</th>
                          <th style={{ ...REPORT_STYLES.th, fontSize: 11, padding: '12px 14px', background: '#edfbfd', textAlign: 'center' }}>Clave Inversión</th>
                          <th style={{ ...REPORT_STYLES.th, fontSize: 11, padding: '12px 14px', background: '#edfbfd', textAlign: 'right' }}>Monto (MX)</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12 }}>Línea Base SOLIMAQ LMA-500</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12, textAlign: 'center' }}>Maquinaria</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12, textAlign: 'right', fontWeight: 800 }}>{formatCurrency(results.capex.baseUsd, 'USD')}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12 }}>Compresor de Aire Tornillo</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12, textAlign: 'center' }}>Periferia</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12, textAlign: 'right', fontWeight: 800 }}>{formatCurrency(inputs.requiresAir ? inputs.capexCompresor : 0, 'USD')}</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                          <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12 }}>Montaje Técnico y Ensamble</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12, textAlign: 'center' }}>Servicio</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12, textAlign: 'right', fontWeight: 800 }}>{formatCurrency(inputs.capexMontaje, 'USD')}</td>
                        </tr>
                        <tr style={{ borderBottom: results.capex.electricalCapexUsd > 0 ? '1px solid #edf2f7' : '1.5px solid #008299' }}>
                          <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12 }}>Obras Civiles y Cimentaciones</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12, textAlign: 'center' }}>Instalación</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12, textAlign: 'right', fontWeight: 800 }}>{formatCurrency(inputs.capexObraCivil, 'USD')}</td>
                        </tr>
                        {results.capex.electricalCapexUsd > 0 && (
                          <tr style={{ borderBottom: '1.5px solid #008299' }}>
                            <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12 }}>Infraestructura Eléctrica (Tableros, Transf., Cables)</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12, textAlign: 'center' }}>Instalación</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 12, textAlign: 'right', fontWeight: 800 }}>{formatCurrency(results.capex.electricalCapexUsd, 'USD')}</td>
                          </tr>
                        )}
                        <tr style={{ background: '#edfbfd', fontWeight: 800 }}>
                          <td style={{ ...REPORT_STYLES.td, padding: '14px 14px', fontSize: 13, color: '#0f172a' }}>INVERSIÓN TOTAL PROYECTADA</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '14px 14px', fontSize: 13, textAlign: 'center', color: '#0f172a' }}>-</td>
                          <td style={{ ...REPORT_STYLES.td, padding: '14px 14px', fontSize: 14, textAlign: 'right', color: '#0d9488', fontWeight: 900 }}>{formatCurrency(results.capex.totalAdjustedUsd, 'USD')}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ background: 'linear-gradient(135deg, #fcfdfe, #f0fdf4)', border: '1px solid #bbf7d0', borderRadius: 20, padding: '24px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <span style={{ fontSize: 11, fontWeight: 900, color: '#16a34a', textTransform: 'uppercase', letterSpacing: 1.5, display: 'block', marginBottom: 16 }}>RESUMEN MONETARIO</span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: '#334155' }}>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                        <span>Inversión Total (CAPEX): <strong style={{ color: '#16a34a', fontSize: 15, fontWeight: 900 }}>{formatCurrency(results.capex.totalAdjustedUsd * inputs.exchangeRate, 'MXN')}</strong></span>
                      </div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a', flexShrink: 0 }} />
                        <span>Tipo de Cambio: <strong style={{ color: '#475569' }}>{inputs.exchangeRate.toFixed(2)} MXN/USD</strong></span>
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12, fontSize: 10, color: '#64748b', fontWeight: 500 }}>
                  • El presupuesto incluye acometidas eléctricas, maniobras mecánicas y el compresor de aire tornillo simulado.
                </div>

                {/* Gráfica de Distribución de CAPEX */}
                <div style={{ marginTop: 24, background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 20, padding: '20px 24px' }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 16 }}>DISTRIBUCIÓN DE CAPEX (% DEL TOTAL)</span>
                  <div style={{ display: 'flex', height: 22, borderRadius: 11, overflow: 'hidden', background: '#e9ecef', marginBottom: 12 }}>
                    <div style={{ width: `${(results.capex.baseUsd / results.capex.totalUsd) * 100}%`, background: '#0d9488' }} title="Maquinaria" />
                    <div style={{ width: `${((inputs.requiresAir ? inputs.capexCompresor : 0) / results.capex.totalUsd) * 100}%`, background: '#00cbd6' }} title="Periferia" />
                    <div style={{ width: `${(inputs.capexMontaje / results.capex.totalUsd) * 100}%`, background: '#3b82f6' }} title="Montaje" />
                    <div style={{ width: `${(inputs.capexObraCivil / results.capex.totalUsd) * 100}%`, background: '#1d4ed8' }} title="Obra Civil" />
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 20px', fontSize: 11, fontWeight: 700 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, background: '#0d9488', borderRadius: '50%' }} />
                      <span style={{ color: '#475569' }}>Línea Base: {((results.capex.baseUsd / results.capex.totalUsd) * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, background: '#00cbd6', borderRadius: '50%' }} />
                      <span style={{ color: '#475569' }}>Periferia: {(((inputs.requiresAir ? inputs.capexCompresor : 0) / results.capex.totalUsd) * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, background: '#3b82f6', borderRadius: '50%' }} />
                      <span style={{ color: '#475569' }}>Montaje: {((inputs.capexMontaje / results.capex.totalUsd) * 100).toFixed(1)}%</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 8, height: 8, background: '#1d4ed8', borderRadius: '50%' }} />
                      <span style={{ color: '#475569' }}>Obra Civil: {((inputs.capexObraCivil / results.capex.totalUsd) * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              </div>
              {renderPageFooter(pgCAPEX, totalPgs)}
            </div>


            {/* ==========================================
                PÁGINA 11: ANÁLISIS DE COSTO DE PRODUCCIÓN
                ========================================== */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pgOPEX}. Análisis de Costo de Producción y OPEX`, 'Distribución de capas de costo: Materia Prima vs Operación Industrial')}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, justifyContent: 'flex-start', paddingTop: 10 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
                    
                    {/* Columna Izquierda: Tablas de Costo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* 1. Materia Prima */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: '#f0fdfa', borderBottom: '2px solid #0d9488' }}>
                            <th colSpan="3" style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#0f766e', textTransform: 'uppercase' }}>1. Costo de Materia Prima</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Materia prima requerida (kg/mes)</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{costBreakdown.rawMaterialKg.toFixed(0)} kg</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(costBreakdown.rawMaterialUsd, 'USD')}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Pellet producido (kg/mes)</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>{(results.production.monthly || 0).toFixed(0)} kg</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#94a3b8' }}>-</td>
                          </tr>
                          <tr style={{ borderBottom: '1.5px solid #0d9488' }}>
                            <td style={{ padding: '8px 12px', color: '#ef4444', fontWeight: 700 }}>Merma ({results.production.wastePercent}%)</td>
                            <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: 800, color: '#ef4444' }}>{costBreakdown.wasteKg.toFixed(0)} kg</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#94a3b8' }}>-</td>
                          </tr>
                          <tr style={{ background: '#f8fafc' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>Costo Total Materia Prima</td>
                            <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 900, color: '#0f172a' }}></td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#0d9488', fontSize: 13 }}>{formatCurrency(costBreakdown.rawMaterialUsd, 'USD')}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* 2. OPEX Operativo */}
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
                        <thead>
                          <tr style={{ background: '#eef2ff', borderBottom: '2px solid #4f46e5' }}>
                            <th style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 900, color: '#3730a3', textTransform: 'uppercase' }}>2. OPEX Operativo</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 900, color: '#3730a3' }}>Costo Mensual</th>
                            <th style={{ padding: '8px 12px', textAlign: 'right', fontSize: 11, fontWeight: 900, color: '#3730a3' }}>MXN/kg</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Consumo Eléctrico</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(results.opex.electricUsd, 'USD')}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>{((results.opex.electricUsd * inputs.exchangeRate) / (results.production.monthly || 1)).toFixed(2)}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Mano de Obra Directa</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(results.opex.laborUsd, 'USD')}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>{((results.opex.laborUsd * inputs.exchangeRate) / (results.production.monthly || 1)).toFixed(2)}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Mantenimiento e Insumos</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(results.opex.maintenanceUsd + results.opex.sparePartsUsd, 'USD')}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>{(((results.opex.maintenanceUsd + results.opex.sparePartsUsd) * inputs.exchangeRate) / (results.production.monthly || 1)).toFixed(2)}</td>
                          </tr>
                          <tr style={{ borderBottom: '1.5px solid #4f46e5' }}>
                            <td style={{ padding: '8px 12px', color: '#475569', fontWeight: 600 }}>Servicios (Agua/Aire)</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(results.opex.airUsd + results.opex.waterUsd, 'USD')}</td>
                            <td style={{ padding: '8px 12px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>{(((results.opex.airUsd + results.opex.waterUsd) * inputs.exchangeRate) / (results.production.monthly || 1)).toFixed(2)}</td>
                          </tr>
                          <tr style={{ background: '#f8fafc' }}>
                            <td style={{ padding: '10px 12px', fontWeight: 800, color: '#0f172a' }}>Total OPEX Operativo</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#4f46e5', fontSize: 13 }}>{formatCurrency(costBreakdown.operatingOpexUsd, 'USD')}</td>
                            <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 900, color: '#64748b' }}>{((costBreakdown.operatingOpexUsd * inputs.exchangeRate) / (results.production.monthly || 1)).toFixed(2)}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* 3. Costo Total */}
                      <div style={{ background: '#0f172a', borderRadius: 12, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, display: 'block', marginBottom: 2 }}>3. Costo Total de Producción</span>
                          <span style={{ fontSize: 13, color: '#38bdf8', fontWeight: 700 }}>Costo Real Unitario: {results.opex.costPerKgMxn.toFixed(2)} MXN/kg</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 18, color: '#ffffff', fontWeight: 900 }}>{formatCurrency(costBreakdown.totalUsd, 'USD')}</span>
                        </div>
                      </div>
                    </div>

                    {/* Columna Derecha: Gráfica y Resumen Ejecutivo */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Gráfica */}
                      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 16, padding: '16px', height: 260, display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', textAlign: 'center', marginBottom: 10 }}>Distribución de Costo Total</span>
                        <div style={{ flex: 1 }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Materia Prima', value: costBreakdown.rawMaterialUsd },
                                  { name: 'OPEX Operativo', value: costBreakdown.operatingOpexUsd }
                                ]}
                                cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2} dataKey="value"
                              >
                                <Cell fill="#0d9488" />
                                <Cell fill="#4f46e5" />
                              </Pie>
                              <Tooltip formatter={(val) => formatCurrency(val, 'USD')} />
                              <Legend verticalAlign="bottom" height={20} wrapperStyle={{ fontSize: '10px' }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Explicación Ejecutiva */}
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '16px', flex: 1 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#166534', textTransform: 'uppercase', display: 'block', marginBottom: 8 }}>Explicación Ejecutiva</span>
                        <p style={{ fontSize: 11, color: '#15803d', lineHeight: 1.5, margin: 0 }}>
                          El costo operativo puro de la planta representa únicamente el <strong>{costBreakdown.operatingPercent.toFixed(1)}%</strong> del costo total. El componente dominante en la estructura de egresos es la adquisición de la materia prima reciclada.
                        </p>
                        
                        {costBreakdown.rawMaterialPercent > 80 && (
                          <div style={{ marginTop: 10, padding: '8px 10px', background: '#fffbeb', borderLeft: '3px solid #f59e0b', fontSize: 10, color: '#92400e' }}>
                            <strong>Nota Estratégica:</strong> La materia prima domina la estructura financiera. La rentabilidad del proyecto dependerá fundamentalmente de negociar un buen costo de adquisición y mantener la merma estrictamente controlada al {results.production.wastePercent}%.
                          </div>
                        )}
                        {costBreakdown.electricPercent > 20 && (
                          <div style={{ marginTop: 10, padding: '8px 10px', background: '#fef2f2', borderLeft: '3px solid #ef4444', fontSize: 10, color: '#991b1b' }}>
                            <strong>Alerta:</strong> El consumo energético es elevado respecto al costo total.
                          </div>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
              {renderPageFooter(pgOPEX, totalPgs)}
            </div>

            {/* ==========================================
                PÁGINA 10: AUDITORÍA PARAMÉTRICA Y ESCENARIOS
                ========================================== */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pgEscenariosFin}. Auditoría Paramétrica Automática y Escenarios Financieros`, 'Análisis dinámico de OEE, factibilidad de mercado y proyección en escenarios')}
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, justifyContent: 'flex-start', padding: '10px 0' }}>
                  
                  {/* Fila superior: Escenarios y Dictamen */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                    {/* Tabla de Escenarios */}
                    <div>
                      <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 10 }}>PROYECCIÓN EN TRES ESCENARIOS (MXN)</span>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                        <thead>
                          <tr style={{ background: '#edfbfd', borderBottom: '2px solid #008299' }}>
                            <th style={{ ...REPORT_STYLES.th, padding: '8px 10px', textAlign: 'left', fontSize: 15, whiteSpace: 'nowrap' }}>Escenario</th>
                            <th style={{ ...REPORT_STYLES.th, padding: '8px 10px', textAlign: 'right', fontSize: 15, whiteSpace: 'nowrap' }}>Ingreso Mensual</th>
                            <th style={{ ...REPORT_STYLES.th, padding: '8px 10px', textAlign: 'right', fontSize: 15, whiteSpace: 'nowrap' }}>OPEX Mensual</th>
                            <th style={{ ...REPORT_STYLES.th, padding: '8px 10px', textAlign: 'right', fontSize: 15, whiteSpace: 'nowrap' }}>Utilidad Bruta MXN</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ ...REPORT_STYLES.td, padding: '8px 10px', fontWeight: 800, color: '#e11d48', fontSize: 15, whiteSpace: 'nowrap' }}>Conservador</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '8px 10px', textAlign: 'right', fontSize: 15, whiteSpace: 'nowrap' }}>{formatCurrency(results.scenarios.conservative.revenueUsd, 'USD')}</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '8px 10px', textAlign: 'right', fontSize: 15, whiteSpace: 'nowrap' }}>{formatCurrency(results.scenarios.conservative.opexUsd, 'USD')}</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap' }}>{formatCurrency(results.scenarios.conservative.marginUsd, 'USD')}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #edf2f7', background: '#f8fafc' }}>
                            <td style={{ ...REPORT_STYLES.td, padding: '8px 10px', fontWeight: 800, color: '#3b82f6', fontSize: 15, whiteSpace: 'nowrap' }}>Realista</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '8px 10px', textAlign: 'right', fontSize: 15, whiteSpace: 'nowrap' }}>{formatCurrency(results.scenarios.realistic.revenueUsd, 'USD')}</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '8px 10px', textAlign: 'right', fontSize: 15, whiteSpace: 'nowrap' }}>{formatCurrency(results.scenarios.realistic.opexUsd, 'USD')}</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap' }}>{formatCurrency(results.scenarios.realistic.marginUsd, 'USD')}</td>
                          </tr>
                          <tr style={{ borderBottom: '2px solid #10b981', background: '#f0fdf4' }}>
                            <td style={{ ...REPORT_STYLES.td, padding: '8px 10px', fontWeight: 800, color: '#10b981', fontSize: 15, whiteSpace: 'nowrap' }}>Optimista</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '8px 10px', textAlign: 'right', fontSize: 15, whiteSpace: 'nowrap' }}>{formatCurrency(results.scenarios.optimistic.revenueUsd, 'USD')}</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '8px 10px', textAlign: 'right', fontSize: 15, whiteSpace: 'nowrap' }}>{formatCurrency(results.scenarios.optimistic.opexUsd, 'USD')}</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '8px 10px', textAlign: 'right', fontWeight: 800, fontSize: 15, whiteSpace: 'nowrap' }}>{formatCurrency(results.scenarios.optimistic.marginUsd, 'USD')}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Dictamen Paramétrico */}
                    <div style={{ background: '#f8fafc', border: `1.5px solid ${results.auditDictamen.statusColor === 'emerald' ? '#10b981' : results.auditDictamen.statusColor === 'amber' ? '#f59e0b' : '#ef4444'}`, borderRadius: 16, padding: '16px 20px' }}>
                      <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 12 }}>DICTAMEN DE AUDITORÍA AUTOMÁTICA</span>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <span style={{ fontSize: 13, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Cuello de Botella</span>
                          <span style={{ fontSize: 16, fontWeight: 900, color: '#0d9488', textTransform: 'uppercase' }}>{results.auditDictamen.bottleneckId.replace('_', ' ')} ({results.auditDictamen.bottleneckValue.toFixed(1)}%)</span>
                        </div>
                        <div>
                          <span style={{ fontSize: 13, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Capacidad Efectiva Real</span>
                          <span style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{results.production.effectivePerHour.toFixed(1)} kg/h</span>
                        </div>
                        <div>
                          <span style={{ fontSize: 13, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Amperaje Principal</span>
                          <span style={{ fontSize: 16, fontWeight: 900, color: '#0f172a' }}>{results.auditDictamen.estimatedAmperage.toFixed(1)} A @ {results.energy.voltage}V</span>
                        </div>
                        <div>
                          <span style={{ fontSize: 13, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>Estatus del Escenario</span>
                          <span style={{ fontSize: 15, fontWeight: 900, color: results.auditDictamen.statusColor === 'emerald' ? '#10b981' : results.auditDictamen.statusColor === 'amber' ? '#f59e0b' : '#ef4444', textTransform: 'uppercase' }}>{results.auditDictamen.statusText}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fila inferior: Gráfica de Escenarios */}
                  <div style={{ background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 16, padding: '16px 20px', flex: 1, display: 'flex', flexDirection: 'column', minHeight: 220 }}>
                    <span style={{ fontSize: 15, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 12 }}>PROYECCIÓN GRÁFICA DE ESCENARIOS (MXN)</span>
                    <div style={{ flex: 1, width: '100%' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={[
                            { name: 'Conservador', Ingresos: results.scenarios.conservative.revenueUsd * (inputs.exchangeRate || 20), OPEX: results.scenarios.conservative.opexUsd * (inputs.exchangeRate || 20), 'Utilidad Bruta': results.scenarios.conservative.marginUsd * (inputs.exchangeRate || 20) },
                            { name: 'Realista', Ingresos: results.scenarios.realistic.revenueUsd * (inputs.exchangeRate || 20), OPEX: results.scenarios.realistic.opexUsd * (inputs.exchangeRate || 20), 'Utilidad Bruta': results.scenarios.realistic.marginUsd * (inputs.exchangeRate || 20) },
                            { name: 'Optimista', Ingresos: results.scenarios.optimistic.revenueUsd * (inputs.exchangeRate || 20), OPEX: results.scenarios.optimistic.opexUsd * (inputs.exchangeRate || 20), 'Utilidad Bruta': results.scenarios.optimistic.marginUsd * (inputs.exchangeRate || 20) }
                          ]}
                          margin={{ top: 10, right: 10, left: 20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 14, fill: '#64748b', fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 14, fill: '#64748b' }} tickFormatter={(val) => `$${(val/1000000).toFixed(1)}M`} />
                          <Tooltip formatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value)} />
                          <Legend wrapperStyle={{ fontSize: 14, fontWeight: 700 }} />
                          <Bar dataKey="Ingresos" fill="#008299" radius={[4, 4, 0, 0]} barSize={65}>
                            <LabelList dataKey="Ingresos" position="top" formatter={(val) => `$${(val/1000000).toFixed(1)}M`} style={{ fontSize: 13, fontWeight: 900, fill: '#008299' }} />
                          </Bar>
                          <Bar dataKey="OPEX" stackId="split" fill="#f43f5e" barSize={65}>
                            <LabelList dataKey="OPEX" position="center" formatter={(val) => `$${(val/1000000).toFixed(1)}M`} style={{ fontSize: 13, fontWeight: 800, fill: '#ffffff' }} />
                          </Bar>
                          <Bar dataKey="Utilidad Bruta" stackId="split" fill="#10b981" radius={[4, 4, 0, 0]} barSize={65}>
                            <LabelList dataKey="Utilidad Bruta" position="center" formatter={(val) => `$${(val/1000000).toFixed(1)}M`} style={{ fontSize: 13, fontWeight: 900, fill: '#ffffff' }} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>
              </div>
              {renderPageFooter(pgEscenariosFin, totalPgs)}
            </div>

            {/* ==========================================
                PÁGINA 11: ROI Y CONCLUSIONES
                ========================================== */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pgROI}. Retorno de Inversión (ROI) y Diagnóstico de Viabilidad`, 'Análisis acumulado de flujos y dictamen formal de la simulación técnica')}
                
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 28, alignItems: 'stretch', flex: 1, padding: '10px 0' }}>
                  {/* Columna Izquierda: Métricas y Ventajas Competitivas */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                        <thead>
                          <tr style={{ background: '#edfbfd', borderBottom: '2.5px solid #008299' }}>
                            <th style={{ ...REPORT_STYLES.th, fontSize: 15, padding: '11px 14px', background: '#edfbfd' }}>Indicador Clave</th>
                            <th style={{ ...REPORT_STYLES.th, fontSize: 15, padding: '11px 14px', background: '#edfbfd', textAlign: 'right' }}>Valor Proyectado</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ ...REPORT_STYLES.td, padding: '11px 14px', fontSize: 15 }}>Ingresos Mensuales por Venta</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '11px 14px', fontSize: 15, textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{formatCurrency(results.profitability.revenueUsd, 'USD')}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ ...REPORT_STYLES.td, padding: '11px 14px', fontSize: 15 }}>Utilidad Bruta Estimada (Mensual)</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '11px 14px', fontSize: 15, textAlign: 'right', fontWeight: 800, color: '#0d9488' }}>{formatCurrency(results.profitability.profitUsd, 'USD')}</td>
                          </tr>
                          <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                            <td style={{ ...REPORT_STYLES.td, padding: '11px 14px', fontSize: 15 }}>Utilidad Bruta Estimada (Anual)</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '11px 14px', fontSize: 15, textAlign: 'right', fontWeight: 800, color: '#0d9488' }}>{formatCurrency(results.profitability.profitUsd * 12, 'USD')}</td>
                          </tr>
                          <tr style={{ background: '#edfbfd', fontWeight: 800 }}>
                            <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 15, color: '#0f172a' }}>PERIODO RETORNO (PAYBACK)</td>
                            <td style={{ ...REPORT_STYLES.td, padding: '12px 14px', fontSize: 16, textAlign: 'right', color: '#008299', fontWeight: 900 }}>{results.profitability.paybackMonths ? `${results.profitability.paybackMonths.toFixed(1)} Meses` : 'N/D'}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {/* Tarjeta de Economía Unitaria */}
                    <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 20, flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                      <div style={{ padding: '16px 20px', background: 'linear-gradient(135deg, #f8fafc, #f1f5f9)', borderBottom: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: 14, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block' }}>ECONOMÍA UNITARIA Y RENTABILIDAD</span>
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 15 }}>
                          <tbody>
                            <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                              <td style={{ ...REPORT_STYLES.td, padding: '10px 20px', fontSize: 15, color: '#475569' }}>Precio Venta Pellet</td>
                              <td style={{ ...REPORT_STYLES.td, padding: '10px 20px', fontSize: 15, textAlign: 'right', fontWeight: 800 }}>${(inputs.sellPricePerKg || 0).toFixed(2)} MX/kg</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                              <td style={{ ...REPORT_STYLES.td, padding: '10px 20px', fontSize: 15, color: '#475569' }}>Costo Real Producción (OPEX)</td>
                              <td style={{ ...REPORT_STYLES.td, padding: '10px 20px', fontSize: 15, textAlign: 'right', fontWeight: 800, color: '#e11d48' }}>${results.opex.costPerKgMxn.toFixed(2)} MX/kg</td>
                            </tr>
                            <tr style={{ borderBottom: '2px solid #008299', background: '#f0fdfa' }}>
                              <td style={{ ...REPORT_STYLES.td, padding: '10px 20px', fontSize: 15, fontWeight: 800, color: '#0f766e' }}>Utilidad Bruta Unitaria*</td>
                              <td style={{ ...REPORT_STYLES.td, padding: '10px 20px', fontSize: 15, textAlign: 'right', fontWeight: 900, color: '#0d9488' }}>${((inputs.sellPricePerKg || 0) - results.opex.costPerKgMxn).toFixed(2)} MX/kg</td>
                            </tr>
                            <tr style={{ borderBottom: '1px solid #edf2f7' }}>
                              <td style={{ ...REPORT_STYLES.td, padding: '10px 20px', fontSize: 15, color: '#475569' }}>Utilidad Bruta por Día*</td>
                              <td style={{ ...REPORT_STYLES.td, padding: '10px 20px', fontSize: 15, textAlign: 'right', fontWeight: 800 }}>{formatCurrency((results.profitability.profitUsd / (inputs.daysPerMonth || 24)), 'USD')}</td>
                            </tr>
                            <tr>
                              <td style={{ ...REPORT_STYLES.td, padding: '10px 20px', fontSize: 15, color: '#475569' }}>Utilidad Bruta por Semana*</td>
                              <td style={{ ...REPORT_STYLES.td, padding: '10px 20px', fontSize: 15, textAlign: 'right', fontWeight: 800 }}>{formatCurrency((results.profitability.profitUsd / 4.333), 'USD')}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <div style={{ padding: '6px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: 9.5, color: '#64748b', lineHeight: 1.2, display: 'block', fontStyle: 'italic' }}>
                          * La "Utilidad Bruta" no incluye IVA, ISR, financiamiento, depreciación de maquinaria, renta de nave industrial, seguros, fletes de producto terminado ni gastos comerciales/administrativos.
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Certificación y Dictamen Final */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Gráfica de Economía Unitaria */}
                    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 20, padding: '16px 20px', height: 180, display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', textAlign: 'center', marginBottom: 10 }}>DISTRIBUCIÓN DEL PRECIO DE VENTA</span>
                      <div style={{ flex: 1, width: '100%' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'OPEX Unitario', value: results.opex.costPerKgMxn },
                                { name: 'Utilidad Bruta Unitaria', value: Math.max(0, (inputs.sellPricePerKg || 0) - results.opex.costPerKgMxn) }
                              ]}
                              cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} dataKey="value"
                            >
                              <Cell fill="#f43f5e" /> {/* Rojo para OPEX */}
                              <Cell fill="#10b981" /> {/* Verde para Margen */}
                            </Pie>
                            <Tooltip formatter={(value) => `$${value.toFixed(2)} MXN/kg`} />
                            <Legend verticalAlign="middle" align="right" layout="vertical" wrapperStyle={{ fontSize: 12, fontWeight: 700 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    {inputs.includeTechAuditPdf !== false && (
                      <>
                        {/* Dictamen / Comentarios / Conclusiones */}
                        <div style={{ background: 'linear-gradient(135deg, #edfbfd, #ccfbf1)', border: '1px solid #99f6e4', borderRadius: 20, padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 900, color: '#0f766e', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', marginBottom: 8 }}>DIAGNÓSTICO Y CONCLUSIÓN</span>
                        <p style={{ fontSize: 14, color: '#115e59', lineHeight: 1.5, margin: 0 }}>
                          <strong>Dictamen de Viabilidad:</strong> {inputs.customDictamenText !== undefined ? inputs.customDictamenText : 'El análisis de amortización proyecta un escenario de inversión sumamente favorable. Con un costo unitario por kilogramo minimizado y una capacidad de carga optimizada, la planta LMA-500 garantiza rentabilidad inmediata.'}
                        </p>
                        <p style={{ fontSize: 13, color: '#115e59', lineHeight: 1.5, margin: '8px 0 0 0', fontStyle: 'italic' }}>
                          * {inputs.customRecommendationText !== undefined ? inputs.customRecommendationText : 'Recomendación técnica oficial: Proceder a la configuración física del sistema neumático y preparación de acometidas eléctricas según los resultados validados en PANDORA.'}
                        </p>
                      </div>

                      {/* Certificación / Firmas */}
                      <div style={{ border: '1px dashed #cbd5e1', borderRadius: 20, padding: '18px 24px', background: '#f8fafc', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <span style={{ fontSize: 11, fontWeight: 900, color: '#475569', textTransform: 'uppercase', letterSpacing: 1.2, display: 'block', textAlign: 'center' }}>VALIDACIÓN Y CERTIFICACIÓN TÉCNICA</span>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                          {/* Código QR de Certificación en 2D */}
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <img
                              src={getValidationQRUrl()}
                              style={{ width: 72, height: 72, border: '1.5px solid #008299', borderRadius: 10, padding: 5, background: '#ffffff', objectFit: 'contain' }}
                              alt="QR Certificado"
                            />
                            <span style={{ fontSize: 7, fontWeight: 900, color: '#008299', textTransform: 'uppercase', letterSpacing: 0.5 }}>CERTIFICADO PANDORA</span>
                          </div>

                          {/* Firmas Cruzadas */}
                          <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', gap: 20 }}>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                              <div style={{ height: 35, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>[Firma Digital Solimaq]</span>
                              </div>
                              <div style={{ width: '100%', height: 1, background: '#cbd5e1', margin: '4px 0' }} />
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#334155', display: 'block' }}>Responsable Técnico Solimaq</span>
                            </div>
                            <div style={{ flex: 1, textAlign: 'center' }}>
                              <div style={{ height: 35, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <span style={{ fontFamily: 'monospace', fontSize: 12, color: '#94a3b8' }}>[Sello Automático]</span>
                              </div>
                              <div style={{ width: '100%', height: 1, background: '#cbd5e1', margin: '4px 0' }} />
                              <span style={{ fontSize: 10, fontWeight: 700, color: '#334155', display: 'block' }}>Director de Planta Recilogic</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ marginTop: 6, borderTop: '1px solid #e2e8f0', paddingTop: 8, fontSize: 10, fontFamily: 'monospace', color: '#94a3b8', textAlign: 'center' }}>
                          VERIFICACIÓN HASH: SOLIMAQ-LMA500-RECILOGIC-PANDORA-v7.80
                        </div>
                      </div>
                      </>
                    )}
                  </div>
                </div>


              </div>
              {renderPageFooter(pgROI, totalPgs)}
            </div>

            {/* ==========================================
              PÁGINA 13: AUDITORÍA PARAMÉTRICA Y TÉRMICA
              ========================================== */}
          {inputs.includeTechAuditPdf !== false && (
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pgTech1}. Auditoría de Infraestructura y OEE Dinámico`, 'Análisis termodinámico, eléctrico y eficiencia OEE industrial descompuesta')}
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 10 }}>
                {/* Desglose OEE */}
                <div style={{ background: '#f8fafc', borderRadius: 16, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
                  <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#0f172a', fontWeight: 900, textTransform: 'uppercase' }}>OEE Industrial (Disponibilidad × Rendimiento × Calidad)</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                    {Object.entries(results.production.oeeModules).map(([id, val]) => (
                      <div key={id} style={{ background: '#ffffff', padding: '10px 14px', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                        <span style={{ fontSize: 9, color: '#64748b', fontWeight: 800, textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>{id.replace('_', ' ')}</span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                          <span style={{ fontSize: 10, color: '#475569' }}>D: {val.d}%</span>
                          <span style={{ fontSize: 10, color: '#475569' }}>R: {val.p}%</span>
                          <span style={{ fontSize: 10, color: '#475569' }}>C: {val.q}%</span>
                        </div>
                        <div style={{ fontSize: 13, fontWeight: 900, color: val.state === 'Rojo' ? '#e11d48' : val.state === 'Amarillo' ? '#d97706' : '#059669', borderTop: '1px solid #f1f5f9', paddingTop: 4, marginTop: 4 }}>
                          {val.oee.toFixed(1)}% OEE
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Perfil Eléctrico y Térmico */}
                <div style={{ display: 'flex', gap: 20 }}>
                  <div style={{ flex: 1, background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#0f172a', fontWeight: 900, textTransform: 'uppercase' }}>Dimensionamiento Eléctrico</h4>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0', color: '#64748b', fontWeight: 600 }}>Tensión Principal</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{results.energy.voltage} VAC</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0', color: '#64748b', fontWeight: 600 }}>Amperaje Pico</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, color: '#e11d48' }}>{results.energy.estimatedAmperage.toFixed(1)} A</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0', color: '#64748b', fontWeight: 600 }}>Demanda Máxima (kVA)</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{results.energy.kVA.toFixed(1)} kVA</td>
                        </tr>
                        <tr>
                          <td style={{ padding: '8px 0', color: '#64748b', fontWeight: 600 }}>Factor de Potencia</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, color: results.energy.powerFactor < 0.9 ? '#e11d48' : '#059669' }}>{results.energy.powerFactor}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div style={{ flex: 1, background: '#ffffff', borderRadius: 16, border: '1px solid #e2e8f0', padding: '16px 20px' }}>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: 13, color: '#0f172a', fontWeight: 900, textTransform: 'uppercase' }}>Comportamiento Térmico Extrusor</h4>
                    <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0', color: '#64748b', fontWeight: 600 }}>Humedad Alimentación</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, color: results.thermalConfig.humidity > 3 ? '#e11d48' : '#0f172a' }}>{results.thermalConfig.humidity}%</td>
                        </tr>
                        <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '8px 0', color: '#64748b', fontWeight: 600 }}>Temperaturas Zonas / Dado</td>
                          <td style={{ padding: '8px 0', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{results.thermalConfig.zoneTemps}°C / {results.thermalConfig.dieTemp}°C</td>
                        </tr>
                        <tr>
                          <td colSpan="2" style={{ padding: '12px 0 0 0', color: '#475569', fontSize: 11, fontStyle: 'italic', lineHeight: 1.4 }}>
                            {results.auditDictamen.thermalAlerts.length > 0 
                              ? results.auditDictamen.thermalAlerts[0] 
                              : "Operación térmica estable. No hay penalización por torque hidrodinámico."}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '12px 16px' }}>
                  <span style={{ fontSize: 10, color: '#b91c1c', fontWeight: 800, display: 'block', marginBottom: 4 }}>Bitácora de Ingeniería (Logs)</span>
                  <ul style={{ margin: 0, paddingLeft: 16, color: '#991b1b', fontSize: 11, fontFamily: 'monospace' }}>
                    {[...results.auditDictamen.electricalAlerts].map((al, idx) => (
                      <li key={idx} style={{ marginBottom: 2 }}>{al}</li>
                    ))}
                    {results.auditDictamen.electricalAlerts.length === 0 && (
                      <li>No se detectaron inconsistencias operativas críticas.</li>
                    )}
                  </ul>
                </div>
              </div>
              
              {renderPageFooter(pgTech1, totalPgs)}
            </div>
          </div>
          )}

          {/* ==========================================
              PÁGINA 14: SENSIBILIDAD FINANCIERA
              ========================================== */}
          {inputs.includeFinancialAuditPdf !== false && (
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pgFin1}. Sensibilidad Financiera y Estrés de Margen`, 'Métricas del "Digital Twin" simulando variabilidad de mercado y escenarios de crisis')}
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 10 }}>
                {/* Tabla de Sensibilidad */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#0f172a', fontWeight: 900, textTransform: 'uppercase' }}>Sensibilidad Financiera por Variable Crítica</h4>
                  <p style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>El simulador somete el margen de utilidad base a tres escenarios de estrés estadístico para evaluar la resiliencia del payback.</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: '1px solid #e2e8f0' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '12px', textAlign: 'left', color: '#475569' }}>Variable Alterada</th>
                        <th style={{ padding: '12px', textAlign: 'center', color: '#475569' }}>Variación</th>
                        <th style={{ padding: '12px', textAlign: 'right', color: '#475569' }}>Nuevo Margen Mensual</th>
                        <th style={{ padding: '12px', textAlign: 'right', color: '#475569' }}>Impacto en Flujo</th>
                        <th style={{ padding: '12px', textAlign: 'right', color: '#475569' }}>Nuevo Payback</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.sensitivityAnalysis.map((sa, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: sa.impact < 0 ? '#fff1f2' : '#ffffff' }}>
                          <td style={{ padding: '12px', fontWeight: 700, color: '#0f172a' }}>{sa.variable}</td>
                          <td style={{ padding: '12px', textAlign: 'center', fontWeight: 800, color: sa.impact < 0 ? '#e11d48' : '#059669' }}>{sa.change}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(sa.marginAdjusted, 'USD')}</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: sa.impact < 0 ? '#e11d48' : '#059669' }}>{sa.impact > 0 ? '+' : ''}{sa.impact.toFixed(1)}%</td>
                          <td style={{ padding: '12px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>{sa.payback ? sa.payback.toFixed(1) + ' meses' : 'N/D'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 15, background: '#f0fdfa', border: '1px solid #ccfbf1', padding: '12px', borderRadius: 8 }}>
                    <span style={{ fontSize: 11, color: '#0f766e', fontWeight: 700 }}>Conclusión de Sensibilidad:</span>
                    <span style={{ fontSize: 10, color: '#115e59', display: 'block', marginTop: 4 }}>
                      El margen operativo del modelo muestra resiliencia ante variaciones del 10% en costos energéticos, aunque permanece altamente sensible al costo de adquisición de materia prima.
                    </span>
                  </div>
                </div>
              </div>
              
              {renderPageFooter(pgFin1, totalPgs)}
            </div>
          </div>
          )}

          {/* ==========================================
              PÁGINA 15: CURVA DE DEGRADACIÓN A 12 MESES
              ========================================== */}
          {inputs.includeTechAuditPdf !== false && (
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pgTech2}. Curva de Degradación de Vida Útil`, 'Proyección técnica de desgaste de husillo, cuhillas y mallas a lo largo de 12 meses operativos')}
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24, paddingTop: 10 }}>
                {/* Degradación */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#0f172a', fontWeight: 900, textTransform: 'uppercase' }}>Curva de Degradación OEE y Mantenimiento Periódico</h4>
                  <p style={{ fontSize: 11, color: '#475569', marginBottom: 12 }}>El OEE decae gradualmente por el desgaste físico y la contaminación de filtros. Se proyectan mantenimientos preventivos mayores en los meses 4 y 8.</p>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '10px', color: '#475569' }}>Periodo</th>
                        <th style={{ padding: '10px', color: '#475569' }}>OEE Resultante</th>
                        <th style={{ padding: '10px', color: '#475569' }}>Producción Mensual Estimada</th>
                        <th style={{ padding: '10px', color: '#475569' }}>Downtime (Horas Muertas)</th>
                        <th style={{ padding: '10px', color: '#475569' }}>Evento Intervención</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.degradationCurve.map((deg, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: deg.event === 'Mantenimiento' ? '#f0fdf4' : '#ffffff' }}>
                          <td style={{ padding: '10px', fontWeight: 700, color: '#0f172a' }}>Mes {deg.month}</td>
                          <td style={{ padding: '10px', fontWeight: 900, color: deg.oee < 80 ? '#e11d48' : '#059669' }}>{deg.oee.toFixed(1)}%</td>
                          <td style={{ padding: '10px', fontWeight: 700, color: '#334155' }}>{formatNumber(deg.production, 0)} kg</td>
                          <td style={{ padding: '10px', color: '#64748b' }}>{deg.downtime.toFixed(1)}% del tiempo total</td>
                          <td style={{ padding: '10px', fontWeight: 800, color: deg.event === 'Mantenimiento' ? '#059669' : '#94a3b8' }}>{deg.event}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 15, background: '#f8fafc', border: '1px solid #e2e8f0', padding: '12px', borderRadius: 8 }}>
                    <span style={{ fontSize: 11, color: '#475569', fontWeight: 700 }}>Directriz de Mantenimiento:</span>
                    <span style={{ fontSize: 10, color: '#64748b', display: 'block', marginTop: 4 }}>
                      Se recomienda acatar las intervenciones mayores (Mes 4 y Mes 8) para restablecer la eficiencia del husillo, restaurando la curva de recuperación y mitigando pérdidas por torque.
                    </span>
                  </div>
                </div>
              </div>
              
              {renderPageFooter(pgTech2, totalPgs)}
            </div>
          </div>
          )}

          {/* ==========================================
              PÁGINA 16: PROYECCIÓN FINANCIERA POR PERIODO
              ========================================== */}
          <div className="lma-page" style={S.page}>
            <div className="lma-page-inner" style={S.inner}>
              {renderPageHeader(`${pgProj1}. Proyección Financiera por Periodo`, 'Proyección automática de Ingresos, OPEX y Recuperación de CAPEX en ventanas temporales clave')}
              
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 10 }}>
                {/* Tabla de Proyección */}
                <div>
                  <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#0f172a', fontWeight: 900, textTransform: 'uppercase' }}>Desempeño Acumulado</h4>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: '1px solid #e2e8f0' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                        <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>Periodo</th>
                        <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>Ingresos Proyectados</th>
                        <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>OPEX Proyectado</th>
                        <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>Utilidad Bruta</th>
                        <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>Producción Est. (kg)</th>
                        <th style={{ padding: '10px', textAlign: 'center', color: '#475569' }}>Recuperación CAPEX</th>
                      </tr>
                    </thead>
                    <tbody>
                      {financialProjectionsData.map((fp, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px', fontWeight: 800, color: '#0f172a' }}>{fp.label}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{formatCurrency(fp.projectedRevenue / inputs.exchangeRate, 'USD')}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#e11d48' }}>{formatCurrency(fp.projectedOpex / inputs.exchangeRate, 'USD')}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#10b981' }}>{formatCurrency(fp.projectedProfit / inputs.exchangeRate, 'USD')}</td>
                          <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>{formatNumber(fp.projectedProduction, 0)} kg</td>
                          <td style={{ padding: '10px', textAlign: 'center' }}>
                            <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: 10, fontWeight: 800, background: fp.recovered ? '#dcfce7' : '#fee2e2', color: fp.recovered ? '#166534' : '#991b1b' }}>
                              {fp.recovered ? 'RECUPERADO' : 'NO RECUPERADO'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flex: 1, minHeight: 250 }}>
                  <div style={{ background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 12, padding: '16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Ingresos vs OPEX vs Utilidad (MXN)</span>
                    <div style={{ width: '100%', height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={financialProjectionsData} margin={{ top: 10, right: 10, left: 20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `$${(val/1000000).toFixed(1)}M`} />
                          <Tooltip formatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value)} />
                          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                          <Bar dataKey="projectedRevenue" name="Ingresos" fill="#008299" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="projectedOpex" name="OPEX" fill="#f43f5e" radius={[2, 2, 0, 0]} />
                          <Bar dataKey="projectedProfit" name="Utilidad" fill="#10b981" radius={[2, 2, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                  
                  <div style={{ background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 12, padding: '16px' }}>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Recuperación Acumulada vs CAPEX (MXN)</span>
                    <div style={{ width: '100%', height: 200 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={capexRecoveryChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                          <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `$${val}M`} />
                          <Tooltip formatter={(value) => `$${value}M`} />
                          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                          <Area type="monotone" dataKey="Utilidad Acumulada" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                          <Area type="step" dataKey="CAPEX Total" stroke="#e11d48" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
              
              {renderPageFooter(pgProj1, totalPgs)}
            </div>

            {/* ==========================================
                PÁGINA 17: PROYECCIÓN A LARGO PLAZO (12, 24, 36 MESES)
                ========================================== */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader(`${pgProj2}. Proyección de Retorno a Largo Plazo (1 a 3 Años)`, 'Extrapolación financiera y crecimiento de utilidad acumulada en horizonte de 36 meses')}
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 20, paddingTop: 10 }}>
                  <div>
                    <h4 style={{ margin: '0 0 10px 0', fontSize: 13, color: '#0f172a', fontWeight: 900, textTransform: 'uppercase' }}>Crecimiento Financiero (12, 24 y 36 Meses)</h4>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, border: '1px solid #e2e8f0' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                          <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>Horizonte</th>
                          <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>Ingresos Brutos</th>
                          <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>OPEX Total</th>
                          <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>Utilidad Neta</th>
                          <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>Estatus de Inversión</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financialProjectionsLongTermData.map((fp, i) => (
                          <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: fp.recovered ? '#f0fdf4' : '#ffffff' }}>
                            <td style={{ padding: '10px', fontWeight: 800, color: '#0f172a' }}>{fp.label}</td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#334155' }}>{formatCurrency(fp.projectedRevenue / inputs.exchangeRate, 'USD')}</td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 700, color: '#e11d48' }}>{formatCurrency(fp.projectedOpex / inputs.exchangeRate, 'USD')}</td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 900, color: '#059669' }}>{formatCurrency(fp.projectedProfit / inputs.exchangeRate, 'USD')}</td>
                            <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: fp.recovered ? '#059669' : '#e11d48' }}>
                              {fp.recovered ? `RECUPERADO (+${fp.roiPercentage.toFixed(1)}%)` : 'EN PROCESO'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, flex: 1, maxHeight: 300 }}>
                    <div style={{ background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 12, padding: '16px' }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Ingresos vs Utilidad (USD)</span>
                      <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={financialProjectionsLongTermData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `$${(val / (inputs.exchangeRate * 1000000)).toFixed(1)}M`} />
                            <Tooltip formatter={(value) => formatCurrency(value / inputs.exchangeRate, 'USD')} />
                            <Legend wrapperStyle={{ fontSize: 11, fontWeight: 700 }} />
                            <Bar dataKey="projectedRevenue" name="Ingresos" fill="#0d9488" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="projectedProfit" name="Utilidad" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    
                    <div style={{ background: '#f8fafc', border: '1px solid #edf2f7', borderRadius: 12, padding: '16px' }}>
                      <span style={{ fontSize: 13, fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Proyección Crecimiento Utilidad vs CAPEX</span>
                      <div style={{ width: '100%', height: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={capexRecoveryLongTermChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(val) => `$${val}M`} />
                            <Tooltip formatter={(value) => `$${value}M`} />
                            <Legend wrapperStyle={{ fontSize: 10, fontWeight: 700 }} />
                            <Area type="monotone" dataKey="Utilidad Acumulada" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                            <Area type="step" dataKey="CAPEX Total" stroke="#e11d48" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {renderPageFooter(pgProj2, totalPgs)}
            </div>
          </div>
          </div>
        </div>
      )}

      {/* --- GRID DE CONTENIDO SECUNDARIO --- */}
      <div className="max-w-[1500px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 mt-8">
        
        {/* Gráfica de Opex del simulador */}
        <div className="lg:col-span-6 bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-5">
            <BarChart3 className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">
              Carga Eléctrica por Equipo ( kW )
            </h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartPowerData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#94a3b8" style={{ fontSize: '9px', fontWeight: 'bold' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <Tooltip />
                <Legend style={{ fontSize: '10px' }} />
                <Bar dataKey="kW Instalados" fill="#1e293b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="kW en Carga (Factor)" fill="#0d9488" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Proyección de Utilidades */}
        <div className="lg:col-span-6 bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-5">
            <Percent className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">
              Flujo Acumulado Proyectado
            </h3>
          </div>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartCashFlowData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorFlowLma" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2dd4bf" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#2dd4bf" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                <XAxis dataKey="mes" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} />
                <Tooltip formatter={(value) => `${value.toLocaleString()}k MX`} />
                <Area type="monotone" dataKey="Flujo Acumulado (MXN)" stroke="#0d9488" strokeWidth={3} fillOpacity={1} fill="url(#colorFlowLma)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Proyección Financiera por Periodo (UI) */}
        <div className="lg:col-span-12 bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-5">
            <LineChart className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">
              Proyección Financiera por Periodo
            </h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Desempeño Acumulado</div>
              <div className="space-y-3">
                {financialProjectionsData.map((fp, i) => (
                  <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                      <span className="text-sm font-black text-white">{fp.label}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${fp.recovered ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {fp.recovered ? 'RECUPERADO' : 'NO RECUPERADO'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Ingresos</span>
                      <span className="text-xs font-black text-teal-400">{formatCurrency(fp.projectedRevenue / inputs.exchangeRate, 'USD')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">OPEX</span>
                      <span className="text-xs font-black text-red-400">{formatCurrency(fp.projectedOpex / inputs.exchangeRate, 'USD')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-800/50">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Utilidad Bruta</span>
                      <span className="text-sm font-black text-emerald-400">{formatCurrency(fp.projectedProfit / inputs.exchangeRate, 'USD')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex-1">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Ingresos vs OPEX vs Utilidad</div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialProjectionsData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="label" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                      <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} tickFormatter={(val) => `$${(val/1000000).toFixed(1)}M`} />
                      <Tooltip formatter={(value) => new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value)} />
                      <Legend style={{ fontSize: '10px' }} />
                      <Bar dataKey="projectedRevenue" name="Ingresos" fill="#0d9488" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="projectedOpex" name="OPEX" fill="#e11d48" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="projectedProfit" name="Utilidad" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex-1">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Recuperación vs CAPEX (12 Meses)</div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={capexRecoveryChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="mes" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                      <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} tickFormatter={(val) => `$${val}M`} />
                      <Tooltip formatter={(value) => `$${value}M`} />
                      <Legend style={{ fontSize: '10px' }} />
                      <Area type="monotone" dataKey="Utilidad Acumulada" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                      <Area type="step" dataKey="CAPEX Total" stroke="#e11d48" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Proyección Financiera a Largo Plazo (UI) */}
        <div className="lg:col-span-12 bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md">
          <div className="flex items-center gap-2.5 border-b border-slate-800 pb-4 mb-5">
            <LineChart className="w-5 h-5 text-teal-400" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest">
              Proyección de Retorno a Largo Plazo (1, 2 y 3 Años)
            </h3>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <div className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Crecimiento Financiero</div>
              <div className="space-y-3">
                {financialProjectionsLongTermData.map((fp, i) => (
                  <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex justify-between items-center border-b border-slate-800/50 pb-2">
                      <span className="text-sm font-black text-white">{fp.label}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-black ${fp.recovered ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                        {fp.recovered ? `+${fp.roiPercentage.toFixed(1)}% ROI` : 'EN PROCESO'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">Ingresos Brutos</span>
                      <span className="text-xs font-black text-teal-400">{formatCurrency(fp.projectedRevenue / inputs.exchangeRate, 'USD')}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-gray-500 font-bold uppercase">OPEX Total</span>
                      <span className="text-xs font-black text-red-400">{formatCurrency(fp.projectedOpex / inputs.exchangeRate, 'USD')}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1 border-t border-slate-800/50">
                      <span className="text-[10px] text-gray-400 font-bold uppercase">Utilidad Neta</span>
                      <span className="text-sm font-black text-emerald-400">{formatCurrency(fp.projectedProfit / inputs.exchangeRate, 'USD')}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-2 flex flex-col gap-6">
              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex-1">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Ingresos vs Utilidad</div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={financialProjectionsLongTermData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="label" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                      <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} tickFormatter={(val) => `$${(val/1000000).toFixed(1)}M`} />
                      <Tooltip formatter={(value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(value)} />
                      <Legend style={{ fontSize: '10px' }} />
                      <Bar dataKey="projectedRevenue" name="Ingresos Brutos" fill="#0d9488" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="projectedProfit" name="Utilidad Neta" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex-1">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-2">Crecimiento Utilidad vs CAPEX (36 Meses)</div>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={capexRecoveryLongTermChartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                      <XAxis dataKey="mes" stroke="#94a3b8" style={{ fontSize: '10px' }} />
                      <YAxis stroke="#94a3b8" style={{ fontSize: '10px' }} tickFormatter={(val) => `$${val}M`} />
                      <Tooltip formatter={(value) => `$${value}M`} />
                      <Legend style={{ fontSize: '10px' }} />
                      <Area type="monotone" dataKey="Utilidad Acumulada" stroke="#10b981" fill="#10b981" fillOpacity={0.2} strokeWidth={2} />
                      <Area type="step" dataKey="CAPEX Total" stroke="#e11d48" fill="none" strokeWidth={2} strokeDasharray="5 5" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* --- BARRA FLOTANTE DE EXPORTACIÓN INFERIOR DE LA IMAGEN 2 --- */}
      <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-5 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-3 px-6 py-3 rounded-2xl bg-black/95 backdrop-blur-xl border border-white/10 shadow-2xl">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 mr-1">Exportar</span>
          <button
            onClick={exportCsv}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 text-gray-300 transition-all text-xs font-bold"
          >
            <Download className="w-3.5 h-3.5 text-gray-400" /> CSV
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 hover:bg-emerald-500/20 text-emerald-400 transition-all text-xs font-bold"
          >
            <Table2 className="w-3.5 h-3.5" /> Excel
          </button>
        </div>
      </div>

      {/* --- FOOTER DESCRIPTIVO --- */}
      <div className="max-w-[1500px] mx-auto text-center mt-12 text-gray-600 text-xs font-semibold py-8 border-t border-slate-900">
        PANDORA v7.80 • Sistema de Inteligencia y Simulación de Inversiones Industriales
        <p className="text-[10px] text-gray-600 mt-1 font-medium">
          SOLIMAQ S.A. de C.V. • Derechos Reservados. Todos los cálculos son estimaciones paramétricas basadas en fichas técnicas.
        </p>
      </div>

      {/* Modal de Configuración de Exportación PDF */}
      {showExportDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#050505]/90 backdrop-blur-sm px-4">
          <div className="bg-[#0b0c10] border border-teal-500/30 rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <h3 className="text-xl font-black text-white mb-2">Exportar Informe PDF</h3>
            <p className="text-sm text-gray-400 mb-6">Confirma los detalles del documento antes de generar la versión de alta fidelidad.</p>
            
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-teal-500 uppercase tracking-widest mb-2">Nombre del Archivo</label>
                <input
                  type="text"
                  value={exportFileName}
                  onChange={(e) => setExportFileName(e.target.value)}
                  className="w-full bg-[#111216] border border-gray-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors text-sm"
                  placeholder="Ej. SOLIMAQ_INFORME.pdf"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-teal-500 uppercase tracking-widest mb-2">Tipo de Cambio (TC) para Reporte</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-bold">$</span>
                  <input
                    type="number"
                    value={exportExchangeRate}
                    onChange={(e) => setExportExchangeRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#111216] border border-gray-800 rounded-xl pl-8 pr-4 py-3 text-white focus:outline-none focus:border-teal-500 transition-colors font-mono text-lg"
                    min="1"
                    step="0.1"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-xs">MXN/USD</span>
                </div>
                <p className="text-[10px] text-gray-500 mt-2">
                  * El reporte entero se re-calculará con este tipo de cambio antes de imprimir.
                </p>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                onClick={() => setShowExportDialog(false)}
                className="flex-1 px-4 py-3 rounded-xl bg-gray-900 hover:bg-gray-800 text-gray-300 transition-all text-sm font-bold"
              >
                Cancelar
              </button>
              <button
                onClick={confirmExportPdf}
                className="flex-1 px-4 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-black transition-all text-sm font-bold flex items-center justify-center gap-2"
              >
                <Printer size={16} /> Generar PDF
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Helper rápido de formateo
function formatNumber(value, decimals = 2) {
  if (!isFinite(value)) return '-';
  return Number(value).toLocaleString('es-MX', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
}
