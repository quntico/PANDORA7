import React, { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { 
  ArrowLeft, Sliders, Save, FileSpreadsheet, Printer, RotateCcw, 
  Settings, Award, Activity, Coins, TrendingUp, ShieldAlert, Check,
  Download, FileText, Briefcase, Calendar, Info, Cpu, Zap, DollarSign,
  Wrench, Pause, Play, Loader2, ArrowRight, Plus, Trash2, Edit2,
  FolderOpen, Upload, Lock, Unlock, MousePointer, Maximize2, Minimize2,
  Layers, Eye, X
} from "lucide-react";
import { supabase, uploadFileWithProgress } from "@/supabase";
import { useBeta } from "@/context/BetaContext";
import SharedTwinViewer3D from "@/components/flow/SharedTwinViewer3D";
import FlowDesignsLibrary from "@/components/flow/FlowDesignsLibrary";
import { useFlowDesigns } from "@/hooks/useFlowDesigns";
import { process3DFile } from "@/utils/fileProcessor";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { createPortal } from "react-dom";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, Cell, AreaChart, Area, LineChart, Line, ComposedChart 
} from "recharts";


// ── Helpers de IndexedDB para almacenamiento de Modelos 3D persistentes locales ──
const dbName = "PandoraMolexDB";
const storeName = "molex_models";

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

const defaultRows = [
  {
    id: 1,
    cable: "CABLE NEGRO",
    modelo: "SIN MODELO",
    descripcion:
      "Cable con 4 polos, material estañado calibre 18, rafia, armadura de acero y cobertura PVC. Diámetro nominal 12 mm.",
    tipo: "estanado",
    kgLote: 5,
    metros: 0,
    kgmCable: 0,
    kgmCobre: 4 * 0.823 * 0.00896,
    pctBruto: 15,
    eficiencia: 93,
  },
  {
    id: 2,
    cable: "CABLE AMARILLO",
    modelo: "(UL) VW31 E46194 (ET) STOOW 8/C 16 AWG (1.31mm²)",
    descripcion:
      "Cable de 8 polos, cobre calibre 16, posible non woven y cobertura de PVC amarillo. Con cobre.",
    tipo: "rojo",
    kgLote: 5,
    metros: 0,
    kgmCable: 0,
    kgmCobre: 8 * 1.31 * 0.00896,
    pctBruto: 32,
    eficiencia: 95,
  },
  {
    id: 3,
    cable: "CABLE GRIS",
    modelo: "BELLDEN E357312-8 SHIELDED AWM STYLE",
    descripcion:
      "Cable con cobre estañado, 8 polos con armadura y cobertura de PVC gris.",
    tipo: "estanado",
    kgLote: 5,
    metros: 0,
    kgmCable: 0,
    kgmCobre: 8 * 0.823 * 0.00896,
    pctBruto: 20,
    eficiencia: 93,
  },
  {
    id: 4,
    cable: "CABLE NEGRO 2",
    modelo: "57552 SOUTHWIRE 12 AWG 4/C VFD RHH/RHW-2 CIRS PLUS 16 AWG",
    descripcion:
      "Cable con armadura y 6 polos: 4 polos calibre 12 y 2 polos de control calibre 16. Cobre estañado.",
    tipo: "estanado",
    kgLote: 5,
    metros: 0,
    kgmCable: 0,
    kgmCobre: ((4 * 3.31) + (2 * 1.31)) * 0.00896,
    pctBruto: 28,
    eficiencia: 93,
  },
];

const MOLEX_EQUIPMENTS = [
  { id: 'unwind', name: 'Desbobinador de Carretes', kw: 2.2, capexUsd: 4500, desc: 'Desenrollado y guiado de cable final de rollo.' },
  { id: 'cutter', name: 'Cortadora / Peladora', kw: 1.5, capexUsd: 3200, desc: 'Pre-corte longitudinal del cable grueso.' },
  { id: 'granulator', name: 'Granulador de Cuchillas', kw: 15.0, capexUsd: 22000, desc: 'Molienda de cobre y PVC a partículas de 3-5mm.' },
  { id: 'separator', name: 'Mesa Densimétrica', kw: 3.0, capexUsd: 12500, desc: 'Separador vibratorio por gravedad cobre vs plástico.' },
  { id: 'press', name: 'Prensa Briqueteadora', kw: 5.5, capexUsd: 8500, desc: 'Compactadora de polvo de cobre recuperado.' }
];

const money = (v) =>
  "$" +
  Number(v || 0).toLocaleString("es-MX", {
    maximumFractionDigits: 0,
  }) + " MXN";

const money2 = (v) =>
  "$" +
  Number(v || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " MXN";

const moneyShort = (v) =>
  "$" +
  Number(v || 0).toLocaleString("es-MX", {
    maximumFractionDigits: 0,
  });

const makeDoughnutSVG = (percentages, colors) => {
  const r = 35;
  const C = 2 * Math.PI * r; // ~219.91
  let currentOffset = 0;
  return (
    <svg width="90" height="90" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
      {percentages.map((p, idx) => {
        const strokeLength = C * (p / 100);
        const strokeOffset = currentOffset;
        currentOffset -= strokeLength;
        return (
          <circle
            key={idx}
            cx="50"
            cy="50"
            r={r}
            fill="transparent"
            stroke={colors[idx]}
            strokeWidth="12"
            strokeDasharray={`${strokeLength} ${C}`}
            strokeDashoffset={strokeOffset}
          />
        );
      })}
    </svg>
  );
};

const kg = (v) =>
  Number(v || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + " kg";

const pct = (v) =>
  Number(v || 0).toLocaleString("es-MX", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + "%";

export default function MolexSimulator() {
  const navigate = useNavigate();
  const { activeProject } = useBeta();
  const [activeTab, setActiveTab] = useState("portada");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const defaultInputs = {
    companyName: "CENTRAL DE INTELIGENCIA",
    clientName: "PEDRO PEREZ",
    projectName: "MOLEX - RECUPERACIÓN COBRE",
    evaluationDate: new Date().toLocaleDateString("es-MX"),
    pesoObjetivo: 20,
    precioRojo: 195,
    precioEstanado: 175,
    costoCompra: 0,
    multiplicadorActivo: 1,
    diasMes: 26,
    mesesAnio: 12,
    nombreEscenario: "MOLEX finales de rollo",
    rows: defaultRows,
    
    // CAPEX
    machinePurchaseUsd: 45000,
    installationCostUsd: 5000,
    civilWorksUsd: 2500,
    
    // OPEX
    numOperators: 2,
    monthlySalaryMxn: 12000,
    monthlyMaintenanceUsd: 400,
    monthlyConsumablesUsd: 250,
    
    // Energía
    installedPowerKw: 27.2,
    averageLoadFactor: 80,
    electricityRateMxn: 2.50,
    voltage: 440,
    horasTrabajoDia: 2.5,
    
    // Financiero
    exchangeRate: 18.20,
    
    // Riesgos
    vidaUtilCuchillasHoras: 800,
    frecuenciaMantenimientoHoras: 250,
    riesgoHumedad: 'medio',
    riesgoPolvo: 'bajo',
    riesgoMetal: 'medio',
    riesgoVoltaje: 'alto'
  };

  const [inputs, setInputs] = useState(() => {
    const saved = localStorage.getItem('sim_molex_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { ...defaultInputs, ...parsed };
      } catch (e) {
        console.error("Error al parsear localStorage:", e);
      }
    }
    return defaultInputs;
  });

  const [twinLayout, setTwinLayout] = useState(null);
  const [isProcessingModel, setIsProcessingModel] = useState(false);

  // --- ESTADOS DE TWIN DIGITAL (HEREDADOS DE LMA 500) ---
  const twinBlockRef = useRef(null);
  const [isTwinBlockFullscreen, setIsTwinBlockFullscreen] = useState(false);
  const [twinTheme, setTwinTheme] = useState(() => localStorage.getItem('sim_molex_twin_theme') || 'cyberpunk');
  const [isTwinEditMode, setIsTwinEditMode] = useState(false);
  const [twinLabelHeightOffset, setTwinLabelHeightOffset] = useState(() => {
    const saved = localStorage.getItem('sim_molex_twin_label_height_offset');
    return saved ? Number(saved) : 0.8;
  });
  const [twinLabelsCollapsed, setTwinLabelsCollapsed] = useState(() => {
    return localStorage.getItem('sim_molex_twin_labels_collapsed') === 'true';
  });
  const [twinFloorElevation, setTwinFloorElevation] = useState(() => {
    const saved = localStorage.getItem('sim_molex_twin_floor_elevation');
    return saved ? Number(saved) : 0;
  });
  const [twinFloorLocked, setTwinFloorLocked] = useState(() => {
    return localStorage.getItem('sim_molex_twin_floor_locked') === 'true';
  });
  const [selectedTwinNodeId, setSelectedTwinNodeId] = useState(null);
  const [twinNodePositions, setTwinNodePositions] = useState(() => {
    const saved = localStorage.getItem('sim_molex_twin_node_positions');
    return saved ? JSON.parse(saved) : {};
  });

  const [isDesignsLibraryOpen, setIsDesignsLibraryOpen] = useState(false);
  const [currentDesignId, setCurrentDesignId] = useState(() => localStorage.getItem('sim_molex_twin_anchor_id') || null);
  const [pendingUpload, setPendingUpload] = useState(null);
  const [uploadModelName, setUploadModelName] = useState('');
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isAnchored, setIsAnchored] = useState(true);
  const [isAnchoring, setIsAnchoring] = useState(false);

  // --- ESTADOS PARA INFORME PDF Y VISOR ---
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [isExportOnly, setIsExportOnly] = useState(false);
  const reportRef = useRef(null);

  const [twinSnapshot, setTwinSnapshot] = useState(null);
  const [twinSnapshotLateral, setTwinSnapshotLateral] = useState(null);
  const [twinSnapshotSuperior, setTwinSnapshotSuperior] = useState(null);
  const [twinSnapshotIsometrica, setTwinSnapshotIsometrica] = useState(null);

  useEffect(() => {
    const syncSnapshot = () => {
      const suffix = activeProject?.id ? `${activeProject.id}_` : '';
      setTwinSnapshot(localStorage.getItem(`sim_molex_${suffix}twin_snapshot_base64`) || localStorage.getItem(`sim_molex_twin_snapshot_base64`));
      setTwinSnapshotLateral(localStorage.getItem(`sim_molex_${suffix}twin_snapshot_lateral`) || localStorage.getItem(`sim_molex_twin_snapshot_lateral`));
      setTwinSnapshotSuperior(localStorage.getItem(`sim_molex_${suffix}twin_snapshot_superior`) || localStorage.getItem(`sim_molex_twin_snapshot_superior`));
      setTwinSnapshotIsometrica(localStorage.getItem(`sim_molex_${suffix}twin_snapshot_isometrica`) || localStorage.getItem(`sim_molex_twin_snapshot_isometrica`));
    };
    if (isReportModalOpen) {
      syncSnapshot();
    }
  }, [isReportModalOpen, activeProject?.id]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setIsReportModalOpen(false);
      }
    };
    if (isReportModalOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isReportModalOpen]);

  const handleOpenReportModal = () => {
    setIsReportModalOpen(true);
  };

  const { loadDesign: fetchDesignFromDb, saveDesign: saveDesignToDb } = useFlowDesigns();

  const toggleTwinBlockFullscreen = () => {
    setIsTwinBlockFullscreen(!isTwinBlockFullscreen);
  };

  // Cargar modelo 3D desde IndexedDB al montar
  useEffect(() => {
    async function loadSavedModel() {
      const savedMeta = localStorage.getItem('sim_molex_layout_meta');
      if (!savedMeta) return;
      
      const savedModel = await getModelFromIndexedDB('sim_molex_active_model');
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

  const processAndSetupTwinModel = async (file) => {
    if (!file) return;
    setIsProcessingModel(true);
    try {
      const result = await process3DFile(file);
      await saveModelToIndexedDB('sim_molex_active_model', file, file.name, result.type);
      
      const layoutData = {
        url: result.url,
        type: result.type,
        name: file.name,
        blobMap: result.blobMap
      };
      
      setTwinLayout(layoutData);
      localStorage.setItem('sim_molex_layout_meta', JSON.stringify({ name: file.name, type: result.type }));
      
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

  useEffect(() => {
    localStorage.setItem('sim_molex_twin_label_height_offset', String(twinLabelHeightOffset));
  }, [twinLabelHeightOffset]);

  useEffect(() => {
    localStorage.setItem('sim_molex_twin_labels_collapsed', String(twinLabelsCollapsed));
  }, [twinLabelsCollapsed]);

  useEffect(() => {
    localStorage.setItem('sim_molex_twin_floor_elevation', String(twinFloorElevation));
  }, [twinFloorElevation]);

  useEffect(() => {
    localStorage.setItem('sim_molex_twin_floor_locked', String(twinFloorLocked));
  }, [twinFloorLocked]);

  useEffect(() => {
    localStorage.setItem('sim_molex_twin_theme', twinTheme);
  }, [twinTheme]);

  const handleLoadDesignFromLibrary = async (designId) => {
    const design = await fetchDesignFromDb(designId);
    if (design) {
      if (design.layout) setTwinLayout(design.layout);
      setCurrentDesignId(designId);
      setIsDesignsLibraryOpen(false);
      setIsAnchored(false);

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
        localStorage.setItem('sim_molex_twin_node_positions', JSON.stringify(positions));
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
      localStorage.removeItem('sim_molex_twin_layout');
      localStorage.removeItem('sim_molex_twin_node_positions');
      localStorage.removeItem('sim_molex_twin_anchor_id');
      setCurrentDesignId(null);
      alert("Coordenadas 3D del gemelo reajustadas a los valores de diseño.");
    }, 1000);
  };

  const handleAnchorToSimulator = async () => {
    if (!twinLayout) return;
    setIsAnchoring(true);
    try {
      const anchorData = {
        name: `Twin · MOLEX`,
        description: `Configuración anclada al simulador molex`,
        nodes: twinNodes,
        edges: twinEdges,
        layout: { ...twinLayout, elevation: twinFloorElevation },
        custom_equipments: null,
      };

      let designId = currentDesignId;

      if (designId) {
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

      localStorage.setItem('sim_molex_twin_anchor_id', designId || '');
      localStorage.setItem('sim_molex_twin_layout', JSON.stringify({ ...twinLayout, elevation: twinFloorElevation }));
      localStorage.setItem('sim_molex_twin_node_positions', JSON.stringify(twinNodePositions));
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
      localStorage.setItem('sim_molex_twin_node_positions', JSON.stringify(next));
      return next;
    });
    setIsAnchored(false);
  };

  const handleTwinModelUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    
    setIsProcessingModel(true);
    try {
      const result = await process3DFile(file);
      setPendingUpload({ file, processedResult: result });
      setUploadModelName(file.name.replace(/\.[^/.]+$/, ""));
    } catch (err) {
      console.error(err);
      alert('Error procesando el archivo 3D: ' + err.message);
    } finally {
      setIsProcessingModel(false);
    }
  };

  const handleSaveUploadToLibrary = async () => {
    if (!pendingUpload || !uploadModelName.trim()) return;
    setIsSavingToCloud(true);
    setUploadProgress(10);
    try {
      const file = pendingUpload.file;
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `flow_layouts/${fileName}`;
      
      setUploadProgress(30);
      const { data: storageData, error: storageError } = await uploadFileWithProgress(
        'flow-assets',
        filePath,
        file,
        (progress) => {
          setUploadProgress(30 + Math.floor(progress * 0.5));
        }
      );

      if (storageError) throw storageError;

      const publicUrl = supabase.storage.from('flow-assets').getPublicUrl(filePath).data.publicUrl;
      setUploadProgress(85);

      const layoutData = {
        url: publicUrl,
        type: pendingUpload.processedResult.type,
        name: uploadModelName,
        blobMap: pendingUpload.processedResult.blobMap
      };

      const designPayload = {
        name: uploadModelName,
        description: `Modelo 3D subido desde Simulador MOLEX`,
        nodes: twinNodes,
        edges: twinEdges,
        layout: layoutData,
        created_at: new Date().toISOString()
      };

      const { data: designData, error: dbError } = await supabase
        .from('flow_designs_beta')
        .insert([designPayload])
        .select()
        .single();

      if (dbError) throw dbError;

      setUploadProgress(100);
      setTwinLayout(layoutData);
      if (designData?.id) {
        setCurrentDesignId(designData.id);
        localStorage.setItem('sim_molex_twin_anchor_id', designData.id);
      }
      localStorage.setItem('sim_molex_layout_meta', JSON.stringify({ name: uploadModelName, type: pendingUpload.processedResult.type }));
      
      setPendingUpload(null);
      setToastMessage(`Modelo "${uploadModelName}" guardado en la librería y anclado.`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    } catch (err) {
      console.error('[UploadToLibrary] Error:', err);
      alert('Error al guardar modelo: ' + err.message);
    } finally {
      setIsSavingToCloud(false);
      setUploadProgress(0);
    }
  };

  const handleResetTwinModel = async () => {
    if (window.confirm('¿Deseas restablecer el visor 3D al modelo predeterminado?')) {
      await deleteModelFromIndexedDB('sim_molex_active_model');
      setTwinLayout(null);
      localStorage.removeItem('sim_molex_layout_meta');
      setToastMessage('Visor 3D restablecido.');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 4000);
    }
  };

  const updateGlobal = (key, value) => {
    setInputs((prev) => ({
      ...prev,
      [key]: key === "nombreEscenario" ? value : Number(value || 0),
    }));
  };

  const updateMetadata = (key, value) => {
    setInputs((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const updateRow = (index, key, value) => {
    setInputs((prev) => {
      const newRows = prev.rows.map((row, i) =>
        i === index
          ? {
              ...row,
              [key]: ["cable", "modelo", "descripcion", "tipo"].includes(key)
                ? value
                : Number(value || 0),
            }
          : row
      );
      return { ...prev, rows: newRows };
    });
  };

  const calculations = useMemo(() => {
    let totalKgCable = 0;
    let totalRojo = 0;
    let totalEstanado = 0;
    let totalVentaRojo = 0;
    let totalVentaEstanado = 0;
    const warnings = [];

    const calculatedRows = inputs.rows.map((r) => {
      const isLote = (r.baseCalculo || (Number(r.metros || 0) > 0 ? "metros" : "lote")) === "lote";
      const kgCableCapturado = Number(r.kgLote || 0);
      const kgCablePorMetros = Number(r.metros || 0) * Number(r.kgmCable || 0);
      
      const kgCable = isLote ? kgCableCapturado : kgCablePorMetros;
      const usaMetros = !isLote;

      const kgCobreBruto = isLote
        ? kgCable * (Number(r.pctBruto || 0) / 100)
        : Number(r.metros || 0) * Number(r.kgmCobre || 0);

      const kgRecuperado =
        kgCobreBruto * (Number(r.eficiencia || 0) / 100);

      const kgRojo = r.tipo === "rojo" ? kgRecuperado : 0;
      const kgEstanado = r.tipo === "estanado" ? kgRecuperado : 0;

      const venta =
        kgRojo * inputs.precioRojo +
        kgEstanado * inputs.precioEstanado;

      const recPct = kgCable > 0 ? (kgRecuperado / kgCable) * 100 : 0;
      const valorKg = kgCable > 0 ? venta / kgCable : 0;

      totalKgCable += kgCable;
      totalRojo += kgRojo;
      totalEstanado += kgEstanado;
      totalVentaRojo += kgRojo * inputs.precioRojo;
      totalVentaEstanado += kgEstanado * inputs.precioEstanado;

      if (kgCable > 0 && kgCobreBruto > kgCable) {
        warnings.push(
          `${r.cable}: el cobre bruto calculado supera el peso del cable. Revisa metros o inputs de cobre.`
        );
      }

      if (kgCablePorMetros > 0 && kgCableCapturado > 0) {
        const diff =
          Math.abs(kgCablePorMetros - kgCableCapturado) /
          Math.max(kgCableCapturado, 0.0001);

        if (diff > 0.15) {
          warnings.push(
            `${r.cable}: el kg capturado y el kg calculado difieren más de 15%.`
          );
        }
      }

      return {
        ...r,
        kgCable,
        kgCablePorMetros,
        kgCobreBruto,
        kgRecuperado,
        kgRojo,
        kgEstanado,
        venta,
        recPct,
        valorKg,
        usaMetros,
      };
    });

    const totalCobre = totalRojo + totalEstanado;
    const ventaTotal = totalVentaRojo + totalVentaEstanado;
    const recTotalPct =
      totalKgCable > 0 ? (totalCobre / totalKgCable) * 100 : 0;
    const valorKgTotal =
      totalKgCable > 0 ? ventaTotal / totalKgCable : 0;
    const costoTotal = totalKgCable * inputs.costoCompra;
    const multiplo =
      costoTotal > 0 ? ventaTotal / costoTotal : null;

    if (
      Math.abs(totalKgCable - inputs.pesoObjetivo) > 0.05 &&
      inputs.pesoObjetivo > 0
    ) {
      warnings.unshift(
        `La suma del lote es ${kg(
          totalKgCable
        )}, pero el objetivo capturado es ${kg(inputs.pesoObjetivo)}.`
      );
    }

    // --- CAPEX ---
    const capexTotalUsd = (Number(inputs.machinePurchaseUsd) || 0) + (Number(inputs.installationCostUsd) || 0) + (Number(inputs.civilWorksUsd) || 0);
    const capexTotalMxn = capexTotalUsd * (Number(inputs.exchangeRate) || 18.2);

    // --- OPEX Mensual Fijo ---
    const laborMonthlyMxn = (Number(inputs.numOperators) || 0) * (Number(inputs.monthlySalaryMxn) || 0);
    const maintenanceMonthlyMxn = (Number(inputs.monthlyMaintenanceUsd) || 0) * (Number(inputs.exchangeRate) || 18.2);
    const consumablesMonthlyMxn = (Number(inputs.monthlyConsumablesUsd) || 0) * (Number(inputs.exchangeRate) || 18.2);
    const opexFixedMonthlyMxn = laborMonthlyMxn + maintenanceMonthlyMxn + consumablesMonthlyMxn;

    // --- Energía Eléctrica ---
    const voltagePenalty = Number(inputs.voltage) === 220 ? 1.07 : 1.00;
    const averageHourlyKwh = (Number(inputs.installedPowerKw) || 0) * ((Number(inputs.averageLoadFactor) || 0) / 100) * voltagePenalty;
    const dailyKwh = averageHourlyKwh * (Number(inputs.horasTrabajoDia) || 2.5); // Horas operativas diarias configurables
    const monthlyKwhBase = dailyKwh * (Number(inputs.diasMes) || 26);
    const monthlyEnergyCostBaseMxn = monthlyKwhBase * (Number(inputs.electricityRateMxn) || 2.5);

    // OPEX Total Base
    const opexTotalBaseMxn = opexFixedMonthlyMxn + monthlyEnergyCostBaseMxn;

    // Specific Energy Index (kWh/kg of copper recovered)
    const specificEnergyIndex = totalCobre > 0 ? (dailyKwh / totalCobre) : 0;

    return {
      rows: calculatedRows,
      totalKgCable,
      totalRojo,
      totalEstanado,
      totalVentaRojo,
      totalVentaEstanado,
      totalCobre,
      ventaTotal,
      recTotalPct,
      valorKgTotal,
      costoTotal,
      multiplo,
      warnings,
      
      // Nuevos cálculos
      capexTotalUsd,
      capexTotalMxn,
      laborMonthlyMxn,
      maintenanceMonthlyMxn,
      consumablesMonthlyMxn,
      opexFixedMonthlyMxn,
      averageHourlyKwh,
      dailyKwh,
      monthlyKwhBase,
      monthlyEnergyCostBaseMxn,
      opexTotalBaseMxn,
      specificEnergyIndex
    };
  }, [
    inputs.rows, inputs.precioRojo, inputs.precioEstanado, inputs.costoCompra, inputs.pesoObjetivo,
    inputs.machinePurchaseUsd, inputs.installationCostUsd, inputs.civilWorksUsd, inputs.exchangeRate,
    inputs.numOperators, inputs.monthlySalaryMxn, inputs.monthlyMaintenanceUsd, inputs.monthlyConsumablesUsd,
    inputs.installedPowerKw, inputs.averageLoadFactor, inputs.voltage, inputs.diasMes, inputs.electricityRateMxn,
    inputs.horasTrabajoDia
  ]);

  const proyecciones = useMemo(() => {
    return [1, 2, 3, 4, 5].map((m) => {
      const kgCableDia = calculations.totalKgCable * m;
      const rojoDia = calculations.totalRojo * m;
      const estanadoDia = calculations.totalEstanado * m;
      const metalDia = calculations.totalCobre * m;
      const ventaDia = calculations.ventaTotal * m;
      const metalMes = metalDia * inputs.diasMes;
      const ventaMes = ventaDia * inputs.diasMes;
      const metalAnio = metalMes * inputs.mesesAnio;
      const ventaAnio = ventaMes * inputs.mesesAnio;
      
      const costoCableDia = calculations.costoTotal * m;
      const costoCableMes = costoCableDia * inputs.diasMes;
      
      // Costo de Energía Eléctrica escala con el multiplicador de producción
      const energiaMesMxn = calculations.monthlyEnergyCostBaseMxn * m;
      
      // OPEX Fijo mensual
      const opexFijoMesMxn = calculations.opexFixedMonthlyMxn;
      
      // OPEX Total mensual
      const opexTotalMesMxn = opexFijoMesMxn + energiaMesMxn;
      
      // Costos totales de operación mensual
      const costosTotalesOperativosMesMxn = costoCableMes + opexTotalMesMxn;
      
      // Margen mensual (EBITDA)
      const margenMensualMxn = ventaMes - costosTotalesOperativosMesMxn;
      const margenAnualMxn = margenMensualMxn * inputs.mesesAnio;
      
      // ROI y Payback
      const roiAnual = calculations.capexTotalMxn > 0 ? (margenAnualMxn / calculations.capexTotalMxn) * 100 : 0;
      const paybackMeses = margenMensualMxn > 0 ? calculations.capexTotalMxn / margenMensualMxn : Infinity;

      // Punto de equilibrio (Break Even) en Kg/mes
      const totalKgCableMes = calculations.totalKgCable * m * inputs.diasMes;
      const ingresoPorKg = totalKgCableMes > 0 ? ventaMes / totalKgCableMes : 0;
      const costoVariablePorKg = totalKgCableMes > 0 ? (costoCableMes + energiaMesMxn) / totalKgCableMes : 0;
      const margenContribucionPorKg = ingresoPorKg - costoVariablePorKg;
      
      const puntoEquilibrioKgMes = margenContribucionPorKg > 0 ? opexFijoMesMxn / margenContribucionPorKg : Infinity;
      const puntoEquilibrioTonMes = puntoEquilibrioKgMes !== Infinity ? puntoEquilibrioKgMes / 1000 : Infinity;
      
      const multiplo =
        costoCableDia > 0 ? (ventaDia / costoCableDia).toFixed(2) + "x" : "N/A";

      return {
        m,
        kgCableDia,
        rojoDia,
        estanadoDia,
        metalDia,
        ventaDia,
        metalMes,
        ventaMes,
        metalAnio,
        ventaAnio,
        multiplo,
        
        // Financieros por escenario
        opexTotalMesMxn,
        margenMensualMxn,
        margenAnualMxn,
        roiAnual,
        paybackMeses,
        puntoEquilibrioTonMes
      };
    });
  }, [calculations, inputs.diasMes, inputs.mesesAnio]);

  const activeProjection =
    proyecciones.find((p) => p.m === inputs.multiplicadorActivo) ||
    proyecciones[0];

  const avgEfficiency = useMemo(() => {
    if (!inputs.rows.length) return 0;
    const sum = inputs.rows.reduce((acc, curr) => acc + curr.eficiencia, 0);
    return (sum / inputs.rows.length).toFixed(1);
  }, [inputs.rows]);

  const conclusions = useMemo(() => {
    const list = [];
    if (activeProjection.roiAnual > 50) {
      list.push({ text: `Proyecto altamente viable con excelente retorno de inversión (ROI de ${activeProjection.roiAnual.toFixed(1)}% anual).` });
    }
    if (activeProjection.paybackMeses <= 12) {
      list.push({ text: `El periodo de retorno es extremadamente acelerado (${activeProjection.paybackMeses.toFixed(1)} meses).` });
    } else if (activeProjection.paybackMeses <= 24) {
      list.push({ text: `Retorno de inversión en un rango estándar de la industria (${activeProjection.paybackMeses.toFixed(1)} meses).` });
    } else {
      list.push({ text: `El retorno de inversión excede los 24 meses (${activeProjection.paybackMeses === Infinity ? 'N/A' : activeProjection.paybackMeses.toFixed(1)} meses). Se sugiere optimizar opex.` });
    }
    if (activeProjection.puntoEquilibrioTonMes !== Infinity) {
      list.push({ text: `El punto de equilibrio operativo se sitúa en ${activeProjection.puntoEquilibrioTonMes.toFixed(2)} Toneladas de cable procesado por mes.` });
    }
    list.push({ text: `La eficiencia de separación promedio de la línea se sitúa en un ${avgEfficiency}%.` });
    return list;
  }, [activeProjection, avgEfficiency]);

  const distribuirPeso = () => {
    const porCable = inputs.pesoObjetivo / inputs.rows.length;
    setInputs((prev) => ({
      ...prev,
      rows: prev.rows.map((row) => ({
        ...row,
        kgLote: Number(porCable.toFixed(2)),
      }))
    }));
  };

  const resetear = () => {
    if (window.confirm("¿Deseas restablecer todos los parámetros del simulador a los valores base?")) {
      setInputs(defaultInputs);
      setToastMessage("Parámetros restablecidos a valores por defecto.");
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    }
  };

  const printReport = async () => {
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
        setPdfProgress(Math.round((i / pages.length) * 100));

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
      
      const clientNameClean = (inputs.clientName || 'CLIENTE').trim().toUpperCase().replace(/\s+/g, '_');
      const projectNameClean = (inputs.projectName || 'PROYECTO').trim().toUpperCase().replace(/\s+/g, '_');
      const finalFileName = `SOLIMAQ_MOLEX_INFORME_${projectNameClean}_${clientNameClean}.pdf`;
      
      pdf.save(finalFileName);
      
    } catch (err) {
      console.error("Error al generar PDF:", err);
      alert("Error al generar el PDF. Por favor reintente.");
    } finally {
      setIsGeneratingPdf(false);
      setPdfProgress(0);
    }
  };

  const exportarCSV = () => {
    const header = [
      "Cable",
      "Modelo",
      "Tipo cobre",
      "Kg cable lote",
      "Metros",
      "Kg/m cable medido",
      "Kg/m cobre teorico",
      "% cobre bruto estimado",
      "Eficiencia %",
      "Kg cobre rojo",
      "Kg cobre estanado",
      "% recuperacion",
      "Venta MXN",
      "Valor MXN/kg",
      "Base",
    ];

    const data = [header];

    calculations.rows.forEach((r) => {
      data.push([
        r.cable,
        r.modelo,
        r.tipo,
        r.kgCable,
        r.metros,
        r.kgmCable,
        r.kgmCobre,
        r.pctBruto,
        r.eficiencia,
        r.kgRojo,
        r.kgEstanado,
        r.recPct,
        r.venta,
        r.valorKg,
        r.usaMetros ? "Metros x AWG" : "% estimado",
      ]);
    });

    data.push([]);
    data.push([
      "PROYECCION",
      inputs.nombreEscenario,
      "Dias por mes",
      inputs.diasMes,
      "Meses por año",
      inputs.mesesAnio,
    ]);

    data.push([
      "Escenario",
      "Kg cable dia",
      "Kg rojo dia",
      "Kg estanado dia",
      "Kg metal dia",
      "Venta dia MXN",
      "Kg metal mes",
      "Venta mes MXN",
      "Kg metal año",
      "Venta año MXN",
      "Multiplo venta/costo",
    ]);

    proyecciones.forEach((p) => {
      data.push([
        "x" + p.m,
        p.kgCableDia,
        p.rojoDia,
        p.estanadoDia,
        p.metalDia,
        p.ventaDia,
        p.metalMes,
        p.ventaMes,
        p.metalAnio,
        p.ventaAnio,
        p.multiplo,
      ]);
    });

    const csv = data
      .map((row) =>
        row
          .map((v) => `"${String(v).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "resultados_simulador_molex.csv";
    a.click();

    URL.revokeObjectURL(url);
  };

  const handleSaveSimulator = async () => {
    try {
      localStorage.setItem('sim_molex_data', JSON.stringify(inputs));
      if (activeProject?.id) {
        const payload = {
          project_id: activeProject.id,
          key: 'sim_molex_data',
          value: JSON.stringify({
            inputs,
            twinLayoutMeta: localStorage.getItem('sim_molex_layout_meta') ? JSON.parse(localStorage.getItem('sim_molex_layout_meta')) : null,
            twinNodePositions,
            twinTheme,
            twinFloorElevation,
            twinLabelHeightOffset,
            twinLabelsCollapsed,
            currentDesignId
          }),
          timestamp: Date.now()
        };
        await supabase
          .from('project_context_beta')
          .upsert([payload], { onConflict: 'project_id,key' });
        
        setToastMessage('¡Simulador MOLEX guardado y sincronizado con la nube!');
      } else {
        setToastMessage('¡Simulador guardado localmente!');
      }
    } catch (e) {
      console.error(e);
      setToastMessage('¡Guardado localmente! (Error de sincronización)');
    }
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3500);
  };

  // Carga inicial
  useEffect(() => {
    const loadData = async () => {
      if (activeProject?.id) {
        try {
          const { data } = await supabase
            .from('project_context_beta')
            .select('value')
            .eq('project_id', activeProject.id)
            .eq('key', 'sim_molex_data')
            .maybeSingle();
            
          if (data?.value) {
            const parsed = JSON.parse(data.value);
            // Re-hidratar inputs
            if (parsed.inputs) {
              setInputs(prev => ({ ...defaultInputs, ...parsed.inputs }));
            } else {
              setInputs(prev => ({ ...defaultInputs, ...parsed }));
            }
            // Re-hidratar twin
            if (parsed.twinNodePositions) {
              setTwinNodePositions(parsed.twinNodePositions);
              localStorage.setItem('sim_molex_twin_node_positions', JSON.stringify(parsed.twinNodePositions));
            }
            if (parsed.twinTheme) {
              setTwinTheme(parsed.twinTheme);
              localStorage.setItem('sim_molex_twin_theme', parsed.twinTheme);
            }
            if (parsed.twinFloorElevation) {
              setTwinFloorElevation(parsed.twinFloorElevation);
              localStorage.setItem('sim_molex_twin_floor_elevation', String(parsed.twinFloorElevation));
            }
            if (parsed.twinLabelHeightOffset) {
              setTwinLabelHeightOffset(parsed.twinLabelHeightOffset);
              localStorage.setItem('sim_molex_twin_label_height_offset', String(parsed.twinLabelHeightOffset));
            }
            if (parsed.twinLabelsCollapsed) {
              setTwinLabelsCollapsed(parsed.twinLabelsCollapsed);
              localStorage.setItem('sim_molex_twin_labels_collapsed', String(parsed.twinLabelsCollapsed));
            }
            if (parsed.currentDesignId) {
              setCurrentDesignId(parsed.currentDesignId);
              localStorage.setItem('sim_molex_twin_anchor_id', parsed.currentDesignId);
            }
            return;
          }
        } catch (err) {
          console.error("Error al cargar de Supabase:", err);
        }
      }
      
      const saved = localStorage.getItem('sim_molex_data');
      if (saved) {
        try {
          setInputs(prev => ({ ...defaultInputs, ...JSON.parse(saved) }));
        } catch (e) {
          console.error("Error al parsear localStorage:", e);
        }
      }
    };
    loadData();
  }, [activeProject]);

  const twinNodes = useMemo(() => {
    const defaultNodes = [
      { id: '1', type: 'unwind', label: 'Desbobinador de Carretes', color: '#00F0FF', defaultPos: [-6, 0, 0] },
      { id: '2', type: 'cutter', label: 'Cortadora / Peladora', color: '#FF0055', defaultPos: [-3, 0, 0] },
      { id: '3', type: 'granulator', label: 'Granulador de Cuchillas (Trituración)', color: '#FFB700', defaultPos: [0, 0, 0] },
      { id: '4', type: 'separator', label: 'Mesa Densimétrica (Gravedad)', color: '#00FF66', defaultPos: [3, 0, 0] },
      { id: '5', type: 'press', label: 'Prensa Briqueteadora de Cobre', color: '#8A2BE2', defaultPos: [6, 0, 0] }
    ];

    return defaultNodes.map((eq) => {
      const customPos = twinNodePositions[eq.id];
      return {
        id: eq.id,
        type: 'custom',
        data: {
          type: eq.type === 'unwind' ? 'Transportador' :
                eq.type === 'cutter' ? 'Detector' :
                eq.type === 'granulator' ? 'Molino' :
                eq.type === 'separator' ? 'Mezcladora' : 'Extrusora',
          label: eq.label,
          color: eq.color,
          capacity: inputs.pesoLote || 5,
          power: eq.type === 'unwind' ? 2.2 :
                 eq.type === 'cutter' ? 1.5 :
                 eq.type === 'granulator' ? 15.0 :
                 eq.type === 'separator' ? 3.0 : 5.5,
          hideLabel: true,
          position3D: customPos?.position3D || { x: eq.defaultPos[0], y: eq.defaultPos[1], z: eq.defaultPos[2] },
          labelPosition: customPos?.labelPosition || null
        }
      };
    });
  }, [twinNodePositions, inputs.pesoLote]);

  const twinEdges = useMemo(() => [
    { id: 'e1', source: '1', target: '2', animated: true },
    { id: 'e2', source: '2', target: '3', animated: true },
    { id: 'e3', source: '3', target: '4', animated: true },
    { id: 'e4', source: '4', target: '5', animated: true }
  ], []);

  // Estilos de Páginas en Modal
  const S = {
    page: { 
      width: '1120px', 
      height: '792px', 
      background: 'radial-gradient(circle at 90% 8%, rgba(6,182,212,0.04) 0%, rgba(255,255,255,0) 40%), radial-gradient(circle at 10% 92%, rgba(8,145,178,0.03) 0%, rgba(255,255,255,0) 40%), #ffffff', 
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

  const renderPageHeader = (title, sub) => {
    const parts = title.split(" / ");
    const mainTitle = parts[0] || "";
    const secondaryTitle = parts[1] || "";
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: '26px', position: 'relative', borderBottom: '1px solid rgba(226, 232, 240, 0.8)', paddingBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Barra de acento vertical color turquesa más prominente */}
          <div style={{ width: '6px', height: '26px', backgroundColor: '#00989d', borderRadius: '3px' }} />
          <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.8px', margin: 0, display: 'flex', gap: 8, alignItems: 'center', lineHeight: '1.2' }}>
            <span>{mainTitle}</span>
            {secondaryTitle && <span style={{ color: '#00b0b9' }}>/ {secondaryTitle}</span>}
          </h2>
        </div>
        {sub && (
          <p style={{ fontSize: '10.5px', color: '#64748b', margin: '2px 0 0 18px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            {sub}
          </p>
        )}
      </div>
    );
  };

  const renderPageFooter = (pageNum, totalPages) => {
    return (
      <div style={{ position: 'absolute', bottom: '24px', left: '48px', right: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '12px', fontSize: '9px', color: '#94a3b8', fontWeight: 700 }}>
        <span>PROYECTO: {inputs.projectName?.toUpperCase()} &nbsp;|&nbsp; CLIENTE: {inputs.clientName?.toUpperCase()}</span>
        <span>PÁGINA {pageNum} DE {totalPages}</span>
      </div>
    );
  };

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
              <h1 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                {inputs.projectName}
              </h1>
              <span className="text-[10px] font-black tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-700 uppercase animate-pulse">PARAMÉTRICO</span>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
              <span>Cliente:</span>
              <span className="text-cyan-600 font-black uppercase">{inputs.clientName}</span>
              <span className="text-slate-300">|</span>
              <span>MOLEX RECUPERACIÓN</span>
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
            onClick={exportarCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-50 text-slate-750 transition-all uppercase tracking-wider shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            Exportar CSV
          </button>

          <button 
            onClick={handleOpenReportModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-[#0d9488]/10 hover:bg-[#0d9488]/20 border border-[#0d9488]/30 text-teal-600 hover:text-teal-700 transition-all uppercase tracking-wider shadow-sm animate-pulse"
          >
            <Eye className="w-4 h-4 text-teal-600" />
            Ver Informe
          </button>

          <button 
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 text-slate-750 transition-all uppercase tracking-wider shadow-sm"
          >
            <Printer className="w-4 h-4 text-red-500" />
            Informe PDF
          </button>

          <button 
            onClick={resetear}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold bg-white border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-all shadow-sm"
            title="Restaurar a valores originales"
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
              <div className="p-4 pt-0 grid grid-cols-1 gap-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Empresa</span>
                  <input 
                    type="text" 
                    value={inputs.companyName} 
                    onChange={e => updateMetadata("companyName", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none uppercase" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Cliente</span>
                  <input 
                    type="text" 
                    value={inputs.clientName} 
                    onChange={e => updateMetadata("clientName", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none uppercase" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Nombre del Proyecto</span>
                  <input 
                    type="text" 
                    value={inputs.projectName} 
                    onChange={e => updateMetadata("projectName", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none uppercase" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Fecha Evaluación</span>
                  <input 
                    type="text" 
                    value={inputs.evaluationDate} 
                    onChange={e => updateMetadata("evaluationDate", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
              </div>
            </details>

            {/* 2. PRECIOS Y COSTOS COMERCIALES */}
            <details className="group mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50" open>
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">2. Precios y Costos (MXN/kg)</span>
              </summary>
              <div className="p-4 pt-0 grid grid-cols-1 gap-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Precio Cobre Rojo</span>
                  <input 
                    type="number" 
                    value={inputs.precioRojo} 
                    onChange={e => updateGlobal("precioRojo", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Precio Cobre Estañado</span>
                  <input 
                    type="number" 
                    value={inputs.precioEstanado} 
                    onChange={e => updateGlobal("precioEstanado", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Costo Compra Cable Mixto</span>
                  <input 
                    type="number" 
                    value={inputs.costoCompra} 
                    onChange={e => updateGlobal("costoCompra", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Tipo de Cambio (MXN/USD)</span>
                  <input 
                    type="number" 
                    value={inputs.exchangeRate} 
                    onChange={e => updateGlobal("exchangeRate", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
              </div>
            </details>

            {/* 3. PARÁMETROS DEL LOTE */}
            <details className="group mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50" open>
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">3. Parámetros del Lote</span>
              </summary>
              <div className="p-4 pt-0 grid grid-cols-1 gap-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Peso Objetivo (kg)</span>
                  <input 
                    type="number" 
                    value={inputs.pesoObjetivo} 
                    onChange={e => updateGlobal("pesoObjetivo", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <button 
                  onClick={distribuirPeso}
                  className="mt-1 w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-3 rounded-lg text-xs transition-colors uppercase tracking-wider shadow-xs"
                >
                  Distribuir Peso Objetivo
                </button>
              </div>
            </details>

            {/* 4. CAPEX */}
            <details className="group mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">4. Inversión Inicial (CAPEX)</span>
              </summary>
              <div className="p-4 pt-0 grid grid-cols-1 gap-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Adquisición Máquina (USD)</span>
                  <input 
                    type="number" 
                    value={inputs.machinePurchaseUsd} 
                    onChange={e => updateGlobal("machinePurchaseUsd", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Costo Instalación (USD)</span>
                  <input 
                    type="number" 
                    value={inputs.installationCostUsd} 
                    onChange={e => updateGlobal("installationCostUsd", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Obra Civil (USD)</span>
                  <input 
                    type="number" 
                    value={inputs.civilWorksUsd} 
                    onChange={e => updateGlobal("civilWorksUsd", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
              </div>
            </details>

            {/* 5. OPEX */}
            <details className="group mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">5. Costos de Operación (OPEX)</span>
              </summary>
              <div className="p-4 pt-0 grid grid-cols-1 gap-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Operadores por Turno</span>
                  <input 
                    type="number" 
                    value={inputs.numOperators} 
                    onChange={e => updateGlobal("numOperators", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Salario Mensual por Operador (MXN)</span>
                  <input 
                    type="number" 
                    value={inputs.monthlySalaryMxn} 
                    onChange={e => updateGlobal("monthlySalaryMxn", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Mantenimiento Mensual (USD)</span>
                  <input 
                    type="number" 
                    value={inputs.monthlyMaintenanceUsd} 
                    onChange={e => updateGlobal("monthlyMaintenanceUsd", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Consumibles Mensuales (USD)</span>
                  <input 
                    type="number" 
                    value={inputs.monthlyConsumablesUsd} 
                    onChange={e => updateGlobal("monthlyConsumablesUsd", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
              </div>
            </details>

            {/* 6. ENERGÍA */}
            <details className="group mb-3 border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">6. Consumo Eléctrico</span>
              </summary>
              <div className="p-4 pt-0 grid grid-cols-1 gap-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Potencia Instalada (kW)</span>
                  <input 
                    type="number" 
                    value={inputs.installedPowerKw} 
                    onChange={e => updateGlobal("installedPowerKw", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Factor de Carga (%)</span>
                  <input 
                    type="number" 
                    value={inputs.averageLoadFactor} 
                    onChange={e => updateGlobal("averageLoadFactor", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Tarifa Eléctrica (MXN/kWh)</span>
                  <input 
                    type="number" 
                    value={inputs.electricityRateMxn} 
                    onChange={e => updateGlobal("electricityRateMxn", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Horas de Trabajo Diarias (Lote Base)</span>
                  <input 
                    type="number" 
                    step="0.1"
                    min="0.1"
                    max="24"
                    value={inputs.horasTrabajoDia || 2.5} 
                    onChange={e => updateGlobal("horasTrabajoDia", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Voltaje de Operación (VAC)</span>
                  <select 
                    value={inputs.voltage} 
                    onChange={e => updateGlobal("voltage", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value={440}>440V (Trifásico - Alta Eficiencia)</option>
                    <option value={220}>220V (Trifásico - Con Penalización de 7%)</option>
                  </select>
                </div>
              </div>
            </details>

            {/* 7. RIESGOS */}
            <details className="group border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">7. Mantenimiento y Riesgos</span>
              </summary>
              <div className="p-4 pt-0 grid grid-cols-1 gap-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Vida Útil Cuchillas (Horas)</span>
                  <input 
                    type="number" 
                    value={inputs.vidaUtilCuchillasHoras} 
                    onChange={e => updateGlobal("vidaUtilCuchillasHoras", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Frecuencia Mtto General (Horas)</span>
                  <input 
                    type="number" 
                    value={inputs.frecuenciaMantenimientoHoras} 
                    onChange={e => updateGlobal("frecuenciaMantenimientoHoras", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Riesgo de Humedad en PVC</span>
                  <select 
                    value={inputs.riesgoHumedad} 
                    onChange={e => updateMetadata("riesgoHumedad", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="bajo">Bajo (Humedad &lt; 2%)</option>
                    <option value="medio">Medio (Humedad 2-5%)</option>
                    <option value="alto">Alto (Humedad &gt; 5% - Riesgo de Aglomeración)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Riesgo Exposición a Polvo</span>
                  <select 
                    value={inputs.riesgoPolvo} 
                    onChange={e => updateMetadata("riesgoPolvo", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="bajo">Bajo (Extracción Activa)</option>
                    <option value="medio">Medio (Filtros Estándar)</option>
                    <option value="alto">Alto (Sin Extracción Localizada)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Riesgo Contaminación de Cobre</span>
                  <select 
                    value={inputs.riesgoMetal} 
                    onChange={e => updateMetadata("riesgoMetal", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="bajo">Bajo (Separación Magnética Activa)</option>
                    <option value="medio">Medio (Revisión Manual)</option>
                    <option value="alto">Alto (Directo a Trituración)</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Riesgo Falla Eléctrica / Voltaje</span>
                  <select 
                    value={inputs.riesgoVoltaje} 
                    onChange={e => updateMetadata("riesgoVoltaje", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="bajo">Bajo (Protección Regulada)</option>
                    <option value="medio">Medio (Variación Estándar)</option>
                    <option value="alto">Alto (Inestabilidad en Planta)</option>
                  </select>
                </div>
              </div>
            </details>

            {/* 8. CONFIGURACIÓN INDUSTRIAL DE ESCENARIOS */}
            <details className="group border border-slate-200 rounded-xl overflow-hidden bg-slate-50 mt-3" open>
              <summary className="flex items-center justify-between p-4 cursor-pointer select-none bg-slate-50 hover:bg-slate-100 transition-colors">
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-wider">8. Proyecciones Industriales</span>
              </summary>
              <div className="p-4 pt-0 grid grid-cols-1 gap-2.5">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Nombre Escenario</span>
                  <input 
                    type="text" 
                    value={inputs.nombreEscenario} 
                    onChange={e => updateGlobal("nombreEscenario", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Días de Producción/Mes</span>
                  <input 
                    type="number" 
                    value={inputs.diasMes} 
                    onChange={e => updateGlobal("diasMes", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Meses de Producción/Año</span>
                  <input 
                    type="number" 
                    value={inputs.mesesAnio} 
                    onChange={e => updateGlobal("mesesAnio", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-slate-500 uppercase">Multiplicador Activo</span>
                  <select 
                    value={inputs.multiplicadorActivo} 
                    onChange={e => updateGlobal("multiplicadorActivo", e.target.value)} 
                    className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                  >
                    <option value={1}>x1 · día base</option>
                    <option value={2}>x2 · doble producción diaria</option>
                    <option value={3}>x3 · triple producción diaria</option>
                    <option value={4}>x4 · cuadruple producción diaria</option>
                    <option value={5}>x5 · quintuple producción diaria</option>
                  </select>
                </div>
              </div>
            </details>
          </div>
        </div>

        {/* PANEL DERECHO: TABS Y CONTENIDO DE REPORTES */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          
          {/* TAB SELECTOR */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9 bg-slate-200 p-1.5 rounded-2xl gap-1 mb-2">
            {[
              { id: 'portada', label: '1. Portada' },
              { id: 'parametros', label: '2. Parámetros' },
              { id: 'twin', label: '3. Twin 3D' },
              { id: 'tabla', label: '4. Métricas' },
              { id: 'capex', label: '5. CAPEX/OPEX' },
              { id: 'energia', label: '6. Energía' },
              { id: 'escenarios', label: '7. Escenarios' },
              { id: 'financiero', label: '8. Financiero' },
              { id: 'riesgos', label: '9. Riesgos' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`py-2 rounded-xl text-[10px] font-black uppercase transition-all tracking-wider text-center ${
                  activeTab === t.id 
                    ? 'bg-white text-cyan-800 shadow-sm border border-slate-100' 
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-300'
                }`}
                title={t.label}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* TAB CONTENT: 2. PARAMETROS */}
          {activeTab === "parametros" && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-cyan-600" />
                  <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">Parámetros Operativos del Proceso</h3>
                </div>
                <button 
                  onClick={distribuirPeso}
                  className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] transition-colors uppercase tracking-wider shadow-sm"
                >
                  Distribuir Peso Objetivo
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CARD: PRECIOS Y COMERCIALES */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col gap-4">
                  <span className="text-[10px] font-black text-indigo-750 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-indigo-650" />
                    1. Precios y Costos de Venta
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Cobre Rojo (MXN/kg)</span>
                      <input 
                        type="number" 
                        value={inputs.precioRojo} 
                        onChange={e => updateGlobal("precioRojo", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Cobre Estañado (MXN/kg)</span>
                      <input 
                        type="number" 
                        value={inputs.precioEstanado} 
                        onChange={e => updateGlobal("precioEstanado", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Compra Cable Mixto</span>
                      <input 
                        type="number" 
                        value={inputs.costoCompra} 
                        onChange={e => updateGlobal("costoCompra", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Tipo Cambio (USD)</span>
                      <input 
                        type="number" 
                        value={inputs.exchangeRate} 
                        onChange={e => updateGlobal("exchangeRate", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                      />
                    </div>
                  </div>
                </div>

                {/* CARD: PLANIFICACIÓN DE PRODUCCIÓN */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col gap-4">
                  <span className="text-[10px] font-black text-indigo-755 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-650" />
                    2. Planificación Temporal y Lotes
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Peso Lote Objetivo (kg)</span>
                      <input 
                        type="number" 
                        value={inputs.pesoObjetivo} 
                        onChange={e => updateGlobal("pesoObjetivo", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Días operables / Mes</span>
                      <input 
                        type="number" 
                        value={inputs.diasMes} 
                        onChange={e => updateGlobal("diasMes", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                      />
                    </div>
                    <div className="flex flex-col gap-1 col-span-2">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Escenario de Multiplicador Activo</span>
                      <select 
                        value={inputs.multiplicadorActivo} 
                        onChange={e => updateGlobal("multiplicadorActivo", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                      >
                        <option value={1}>x1 · día base ({kg(calculations.totalKgCable)} cable/día)</option>
                        <option value={2}>x2 · doble turno/prod ({kg(calculations.totalKgCable * 2)} cable/día)</option>
                        <option value={3}>x3 · triple turno/prod ({kg(calculations.totalKgCable * 3)} cable/día)</option>
                        <option value={4}>x4 · cuadruple ({kg(calculations.totalKgCable * 4)} cable/día)</option>
                        <option value={5}>x5 · quintuple ({kg(calculations.totalKgCable * 5)} cable/día)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* CARD: ESTRUCTURA CAPEX Y OPEX */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col gap-4">
                  <span className="text-[10px] font-black text-indigo-755 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-650" />
                    3. Inversión Inicial (CAPEX) y Operativos (OPEX)
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Compra Máquina (USD)</span>
                      <input 
                        type="number" 
                        value={inputs.machinePurchaseUsd} 
                        onChange={e => updateGlobal("machinePurchaseUsd", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Instalación (USD)</span>
                      <input 
                        type="number" 
                        value={inputs.installationCostUsd} 
                        onChange={e => updateGlobal("installationCostUsd", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Operadores / Turno</span>
                      <input 
                        type="number" 
                        value={inputs.numOperators} 
                        onChange={e => updateGlobal("numOperators", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Sueldo Mensual (MXN)</span>
                      <input 
                        type="number" 
                        value={inputs.monthlySalaryMxn} 
                        onChange={e => updateGlobal("monthlySalaryMxn", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                      />
                    </div>
                  </div>
                </div>

                {/* CARD: ELECTRICIDAD Y ENERGÍA */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col gap-4">
                  <span className="text-[10px] font-black text-indigo-755 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-indigo-650" />
                    4. Potencia Eléctrica y Tarifas
                  </span>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Potencia Instalada (kW)</span>
                      <input 
                        type="number" 
                        value={inputs.installedPowerKw} 
                        onChange={e => updateGlobal("installedPowerKw", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Factor Carga (%)</span>
                      <input 
                        type="number" 
                        value={inputs.averageLoadFactor} 
                        onChange={e => updateGlobal("averageLoadFactor", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Tarifa Luz (MXN/kWh)</span>
                      <input 
                        type="number" 
                        value={inputs.electricityRateMxn} 
                        onChange={e => updateGlobal("electricityRateMxn", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" 
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <span className="text-[9px] font-bold text-slate-500 uppercase">Voltaje Trifásico (V)</span>
                      <select 
                        value={inputs.voltage} 
                        onChange={e => updateGlobal("voltage", e.target.value)} 
                        className="w-full bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                      >
                        <option value={440}>440V</option>
                        <option value={220}>220V</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* SECCIÓN COMPLETA DE CONFIGURACIÓN DE CABLES */}
                <div className="bg-slate-50 border border-slate-150 rounded-2xl p-5 flex flex-col gap-4 col-span-1 md:col-span-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-1.5">
                      <Cpu className="w-3.5 h-3.5 text-indigo-650 animate-pulse" />
                      <span className="text-[10px] font-black text-indigo-755 uppercase tracking-wider">
                        5. Configuración y Recuperación de Cables (Cobre Rojo vs Estañado)
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        const newRow = {
                          id: Date.now(),
                          cable: `NUEVO CABLE ${inputs.rows.length + 1}`,
                          modelo: "SIN MODELO",
                          descripcion: "Cable con cobre y cobertura de PVC.",
                          tipo: "rojo",
                          kgLote: 0,
                          metros: 100,
                          kgmCable: 0.15,
                          kgmCobre: 0.05,
                          pctBruto: 33,
                          eficiencia: 95
                        };
                        setInputs(prev => ({ ...prev, rows: [...prev.rows, newRow] }));
                      }}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-1.5 px-3 rounded-lg text-[9px] transition-colors uppercase tracking-wider flex items-center gap-1 shadow-xs"
                    >
                      <Plus className="w-3 h-3" /> Agregar Cable
                    </button>
                  </div>

                  <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-xs">
                    <table className="min-w-full text-xs">
                      <thead>
                        <tr className="bg-slate-900 text-white font-black uppercase text-[9px]">
                          <th className="px-3 py-2 text-left border-r border-slate-800">Cable / Modelo / Base</th>
                          <th className="px-3 py-2 text-left border-r border-slate-800">Descripción</th>
                          <th className="px-3 py-2 text-center border-r border-slate-800">Tipo Cobre</th>
                          <th className="px-3 py-2 text-center border-r border-slate-800">Metros / Lote</th>
                          <th className="px-3 py-2 text-center border-r border-slate-800">Ft (Pies)</th>
                          <th className="px-3 py-2 text-center border-r border-slate-800">Cable (kg/m) / % Cob</th>
                          <th className="px-3 py-2 text-center border-r border-slate-800">Cobre (kg/m)</th>
                          <th className="px-3 py-2 text-center border-r border-slate-800">Ef. %</th>
                          <th className="px-3 py-2 text-right border-r border-slate-800">Cobre Recuperado</th>
                          <th className="px-2 py-2 text-center">Acción</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {calculations.rows.map((r, index) => {
                          const isLote = (r.baseCalculo || (Number(r.metros || 0) > 0 ? "metros" : "lote")) === "lote";
                          const pies = (Number(r.metros || 0) * 3.28084).toFixed(1);
                          return (
                            <tr key={r.id} className="hover:bg-slate-50/50">
                              <td className="px-3 py-2 border-r border-slate-100">
                                <input
                                  type="text"
                                  value={r.cable}
                                  onChange={e => updateRow(index, "cable", e.target.value)}
                                  className="w-24 bg-transparent border-b border-transparent hover:border-slate-350 focus:border-cyan-500 focus:outline-none font-bold text-slate-800 text-[11px]"
                                />
                                <input
                                  type="text"
                                  value={r.modelo}
                                  onChange={e => updateRow(index, "modelo", e.target.value)}
                                  className="w-24 block bg-transparent border-b border-transparent hover:border-slate-250 focus:border-cyan-400 focus:outline-none text-[9px] text-slate-400 font-semibold uppercase mt-0.5"
                                />
                                <select
                                  value={r.baseCalculo || (Number(r.metros || 0) > 0 ? "metros" : "lote")}
                                  onChange={e => updateRow(index, "baseCalculo", e.target.value)}
                                  className="mt-1.5 block text-[9px] font-black uppercase text-indigo-700 bg-indigo-50 border border-indigo-200 rounded px-1.5 py-0.5 focus:outline-none cursor-pointer"
                                >
                                  <option value="lote">Base: Lote</option>
                                  <option value="metros">Base: Metros</option>
                                </select>
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 min-w-[200px]">
                                <textarea
                                  value={r.descripcion}
                                  onChange={e => updateRow(index, "descripcion", e.target.value)}
                                  className="w-full bg-transparent border border-transparent hover:border-slate-200 focus:border-cyan-400 focus:outline-none text-[10px] text-slate-500 font-medium resize-y py-0.5 px-1 rounded"
                                  rows={2}
                                />
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 text-center">
                                <select
                                  value={r.tipo}
                                  onChange={e => updateRow(index, "tipo", e.target.value)}
                                  className={`border rounded px-1.5 py-0.5 font-black text-[9px] uppercase focus:outline-none ${
                                    r.tipo === 'rojo' 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  <option value="rojo">Cobre Rojo</option>
                                  <option value="estanado">Estañado</option>
                                </select>
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 text-center">
                                {isLote ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Kg Lote</span>
                                    <input
                                      type="number"
                                      value={r.kgLote}
                                      onChange={e => updateRow(index, "kgLote", e.target.value)}
                                      className="w-16 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Metros</span>
                                    <input
                                      type="number"
                                      value={r.metros}
                                      onChange={e => updateRow(index, "metros", e.target.value)}
                                      className="w-16 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"
                                    />
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 text-center text-slate-500 font-bold font-mono">
                                {isLote ? "—" : `${pies} ft`}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 text-center">
                                {isLote ? (
                                  <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">% Cobre</span>
                                    <input
                                      type="number"
                                      value={r.pctBruto}
                                      onChange={e => updateRow(index, "pctBruto", e.target.value)}
                                      className="w-12 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-semibold text-slate-800 focus:border-cyan-500 focus:outline-none"
                                    />
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">kg/m Cable</span>
                                    <input
                                      type="number"
                                      step="0.001"
                                      value={r.kgmCable}
                                      onChange={e => updateRow(index, "kgmCable", e.target.value)}
                                      className="w-16 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-semibold text-slate-800 focus:border-cyan-500 focus:outline-none"
                                    />
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 text-center">
                                {isLote ? (
                                  <span className="text-slate-400 font-semibold">—</span>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">kg/m Cobre</span>
                                    <input
                                      type="number"
                                      step="0.001"
                                      value={r.kgmCobre}
                                      onChange={e => updateRow(index, "kgmCobre", e.target.value)}
                                      className="w-16 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-semibold text-slate-800 focus:border-cyan-500 focus:outline-none"
                                    />
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 text-center">
                                <input
                                  type="number"
                                  value={r.eficiencia}
                                  onChange={e => updateRow(index, "eficiencia", e.target.value)}
                                  className="w-12 bg-slate-50 border border-slate-200 rounded px-1 py-0.5 text-center font-semibold text-slate-800 focus:border-cyan-500 focus:outline-none"
                                />
                              </td>
                              <td className="px-3 py-2 border-r border-slate-100 text-right font-black text-slate-900">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black ${
                                  r.tipo === 'rojo' 
                                    ? 'bg-emerald-50 text-emerald-700' 
                                    : 'bg-amber-50 text-amber-700'
                                }`}>
                                  {kg(r.kgRecuperado)}
                                </span>
                              </td>
                              <td className="px-2 py-2 text-center">
                                <button
                                  onClick={() => {
                                    if (inputs.rows.length <= 1) {
                                      alert("Debe haber al menos un cable en la simulación.");
                                      return;
                                    }
                                    setInputs(prev => ({
                                      ...prev,
                                      rows: prev.rows.filter((_, i) => i !== index)
                                    }));
                                  }}
                                  className="p-1 rounded-lg text-slate-400 hover:text-red-650 hover:bg-red-50 transition-colors"
                                  title="Eliminar cable"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* MINI INDICADORES DE RECUPERACIÓN TOTAL */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-slate-200 pt-4 mt-2">
                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-emerald-600 uppercase">Cobre Rojo Puro Recuperado</span>
                        <span className="text-sm font-black text-emerald-800">{kg(calculations.totalRojo)}</span>
                      </div>
                      <Coins className="w-5 h-5 text-emerald-500" />
                    </div>
                    
                    <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-amber-600 uppercase">Cobre Estañado Recuperado</span>
                        <span className="text-sm font-black text-amber-800">{kg(calculations.totalEstanado)}</span>
                      </div>
                      <Coins className="w-5 h-5 text-amber-500" />
                    </div>

                    <div className="bg-slate-100 border border-slate-200 rounded-xl p-3 flex justify-between items-center">
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black text-slate-600 uppercase">Total Metal Recuperado</span>
                        <span className="text-sm font-black text-slate-800">{kg(calculations.totalCobre)}</span>
                      </div>
                      <Activity className="w-5 h-5 text-slate-500" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 1. PORTADA */}
          {activeTab === "portada" && (
            <div className="flex flex-col gap-6">
              
              {/* GRADIENT COVER CARD */}
              <div className="bg-gradient-to-r from-[#09152b] via-[#0f2244] to-[#16356c] text-white rounded-3xl p-8 relative overflow-hidden shadow-md">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <span className="text-[10px] font-black tracking-widest text-cyan-400 uppercase block mb-2">INFORME TÉCNICO DE CAPACIDAD</span>
                    <h2 className="text-2xl font-black uppercase tracking-tight">{inputs.projectName}</h2>
                    <p className="text-xs text-slate-300 font-bold uppercase mt-1">RECUPERACIÓN DE COBRE EN FINALES DE ROLLO</p>
                  </div>
                  <span className="text-[10px] font-black tracking-wider px-3 py-1 rounded-full bg-violet-600/30 border border-violet-500/50 text-violet-200 uppercase">PDF: ACTIVADO</span>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 border-t border-white/10 pt-6 mt-6 text-xs font-bold text-slate-300">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-1">Cliente</span>
                    <span className="text-white uppercase">{inputs.clientName}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-1">Fecha Proyección</span>
                    <span className="text-white">{inputs.evaluationDate}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-1">Eficiencia Promedio</span>
                    <span className="text-cyan-400">{avgEfficiency}%</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block mb-1">Estado Operativo</span>
                    <span className="text-emerald-400">VIABLE</span>
                  </div>
                </div>
              </div>

              {/* KPI CARDS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Cobre Rojo Recuperado</span>
                  <div className="text-3xl font-black text-slate-900 tracking-tight my-2">{kg(calculations.totalRojo)}</div>
                  <span className="text-xs font-bold text-emerald-600">Venta: {money(calculations.totalVentaRojo)}</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Cobre Estañado</span>
                  <div className="text-3xl font-black text-slate-900 tracking-tight my-2">{kg(calculations.totalEstanado)}</div>
                  <span className="text-xs font-bold text-amber-600">Venta: {money(calculations.totalVentaEstanado)}</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Recuperación Diario Base</span>
                  <div className="text-3xl font-black text-slate-900 tracking-tight my-2">{pct(calculations.recTotalPct)}</div>
                  <span className="text-xs font-bold text-cyan-600">{kg(calculations.totalCobre)} Metal Total</span>
                </div>

                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between min-h-[120px]">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Valor Diario Base</span>
                  <div className="text-3xl font-black text-slate-900 tracking-tight my-2">{money(calculations.ventaTotal)}</div>
                  <span className="text-xs font-bold text-slate-500">
                    {money2(calculations.valorKgTotal)}/kg · {calculations.multiplo ? calculations.multiplo.toFixed(2) + "x" : "N/A"}
                  </span>
                </div>
              </div>

              {/* ACTIVE PROJECTION CARD */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase text-slate-900 mb-4 tracking-wider">Escenario Activo Seleccionado (x{activeProjection.m})</h3>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Cable Procesado / Día</span>
                    <span className="text-lg font-black text-slate-800">{kg(activeProjection.kgCableDia)}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Metal Recuperado / Día</span>
                    <span className="text-lg font-black text-cyan-700">{kg(activeProjection.metalDia)}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Venta Mensual</span>
                    <span className="text-lg font-black text-emerald-700">{money(activeProjection.ventaMes)}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4">
                    <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">EBITDA Mensual</span>
                    <span className="text-lg font-black text-indigo-700">{money(activeProjection.margenMensualMxn)}</span>
                  </div>
                </div>
              </div>

              {/* TECHNICAL CONCLUSIONS */}
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

          {/* TAB CONTENT: 2. TWIN 3D */}
          {activeTab === 'twin' && (
            <div className="space-y-6">
              
              {/* --- TWIN DIGITAL 3D CON BARRA COMPLETA (Librería, Subir 3D, Ajustes, Anclado) --- */}
              <div 
                ref={twinBlockRef}
                className={`transition-all duration-300 relative ${
                  isTwinBlockFullscreen 
                    ? `w-screen h-screen overflow-y-auto ${twinTheme === 'toxic' ? 'bg-[#0d0d0e]' : twinTheme === 'blueprint' ? 'bg-[#edf4f9]' : 'bg-[#05070f]'} p-8 rounded-none border-none z-[9999] flex flex-col justify-between` 
                    : twinTheme === 'toxic'
                      ? 'bg-[#121212] border border-[#2c302e] rounded-3xl p-6 shadow-xl overflow-hidden'
                      : twinTheme === 'blueprint'
                        ? 'bg-[#f8fafc] border border-slate-200 rounded-3xl p-6 shadow-xl overflow-hidden text-slate-800'
                        : 'bg-[#0b0c10]/80 border border-slate-800/80 rounded-3xl p-6 shadow-xl backdrop-blur-md overflow-hidden text-white'
                }`}
              >
                <div className={`flex flex-col xl:flex-row xl:items-center justify-between gap-4 mb-5 border-b pb-4 ${twinTheme === 'toxic' ? 'border-[#2c302e]' : twinTheme === 'blueprint' ? 'border-slate-200' : 'border-slate-800'}`}>
                  <div>
                    <h3 className={`text-sm font-black uppercase tracking-widest flex items-center gap-2 ${twinTheme === 'toxic' ? 'text-[#84cc16]' : twinTheme === 'blueprint' ? 'text-blue-700' : 'text-[#00F0FF]'}`}>
                      <Activity className={`w-4 h-4 animate-pulse ${twinTheme === 'toxic' ? 'text-[#84cc16]' : twinTheme === 'blueprint' ? 'text-blue-600' : 'text-[#00F0FF]'}`} />
                      Twin Digital 3D de la Planta de Recuperación (MOLEX)
                    </h3>
                    <p className={`text-[10px] ${twinTheme === 'blueprint' ? 'text-slate-500' : 'text-gray-400'} mt-0.5`}>
                      Gemelo digital interactivo y trayectorias de flujo de cable en tiempo real.
                    </p>
                  </div>

                  {/* Controles del Twin */}
                  <div className="flex flex-wrap items-center gap-2 text-xs w-full xl:w-auto xl:justify-end pr-10 md:pr-20 xl:pr-32">
                    <button 
                      onClick={() => setIsDesignsLibraryOpen(true)}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl transition-all font-black uppercase tracking-widest text-[9px] ${
                        twinTheme === 'toxic'
                          ? 'bg-[#222222] border-[#2c302e] hover:border-[#84cc16] text-[#84cc16] hover:text-white'
                          : twinTheme === 'blueprint'
                            ? 'bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200'
                            : 'bg-teal-950/40 hover:bg-teal-900/40 text-[#00F0FF] border border-[#0d9488]/40'
                      }`}
                      title="Abrir librería de layouts guardados"
                    >
                      <FolderOpen className="w-3.5 h-3.5" /> Librería
                    </button>

                    <label 
                      htmlFor="twin-upload-file-molex"
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-xl cursor-pointer transition-all font-black uppercase tracking-widest text-[9px] ${
                        twinTheme === 'toxic'
                          ? 'bg-[#222222] border-[#2c302e] hover:border-[#84cc16] text-[#84cc16] hover:text-white'
                          : twinTheme === 'blueprint'
                            ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
                            : 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/30'
                      }`}
                      title="Subir archivo 3D de la planta (.glb, .gltf o .fbx)"
                    >
                      <Upload className="w-3.5 h-3.5" /> Subir 3D
                    </label>
                    <input 
                      type="file" 
                      id="twin-upload-file-molex" 
                      className="hidden" 
                      accept=".glb,.gltf,.fbx" 
                      onChange={handleTwinModelUpload} 
                    />

                    {twinLayout && (
                      <button 
                        onClick={handleResetTwinModel}
                        className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl transition-all font-black uppercase tracking-widest text-[9px] ${
                          twinTheme === 'toxic'
                            ? 'bg-red-950/40 border-red-500/30 text-red-400 hover:bg-red-900/40 hover:text-white'
                            : twinTheme === 'blueprint'
                              ? 'bg-red-50 border border-red-200 text-red-700 hover:bg-red-100'
                              : 'bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20'
                        }`}
                        title="Restablecer al modelo predeterminado de fábrica (Quitar CAD)"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> Quitar CAD
                      </button>
                    )}

                    <button 
                      onClick={() => setIsTwinEditMode(!isTwinEditMode)}
                      className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl transition-all font-black uppercase tracking-widest text-[9px] ${
                        isTwinEditMode 
                          ? twinTheme === 'toxic'
                            ? 'bg-[#84cc16] hover:bg-[#a3e635] text-black font-extrabold border-none shadow-[0_0_12px_rgba(132,204,22,0.4)]'
                            : 'bg-yellow-500/20 border-yellow-500 text-yellow-600' 
                          : twinTheme === 'toxic'
                            ? 'bg-[#1a1a1a] border-[#2c302e] text-gray-400 hover:text-white'
                            : twinTheme === 'blueprint'
                              ? 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
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
                            : twinTheme === 'blueprint'
                              ? 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
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
                          : twinTheme === 'blueprint'
                            ? 'bg-slate-100 border-slate-200 text-slate-600 hover:text-slate-900'
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
                              : 'bg-green-500/20 border-green-500 text-green-600 font-extrabold shadow-[0_0_10px_rgba(34,197,94,0.2)]'
                            : twinTheme === 'toxic'
                              ? 'bg-lime-500/10 hover:bg-lime-500/20 text-lime-400 border border-lime-500/30'
                              : 'bg-green-500/10 hover:bg-green-500/20 text-green-600 border border-green-500/30'
                      }`}
                      title="Guardar posiciones en este simulador"
                    >
                      <Check className="w-3.5 h-3.5" /> {isAnchoring ? 'Guardando...' : 'Anclado'}
                    </button>
                  </div>
                </div>

                {/* Panel de Ajustes del Twin / Fichas de Movimiento */}
                {isTwinEditMode && (
                  <div className={`mb-4 p-4 rounded-xl border backdrop-blur-md space-y-4 ${twinTheme === 'toxic' ? 'bg-black/40 border-white/5' : twinTheme === 'blueprint' ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/5'}`}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs">
                      {/* Altura de Fichas Slider */}
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          <span>Altura de Fichas de Movimiento:</span>
                          <span className="text-cyan-500 font-bold">{twinLabelHeightOffset.toFixed(1)} m</span>
                        </div>
                        <input
                          type="range"
                          min="0.0"
                          max="4.0"
                          step="0.1"
                          value={twinLabelHeightOffset}
                          onChange={(e) => setTwinLabelHeightOffset(Number(e.target.value))}
                          className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                        />
                      </div>

                      {/* Ocultar Etiquetas Toggle */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Ocultar Etiquetas:</span>
                        <button
                          onClick={() => setTwinLabelsCollapsed(!twinLabelsCollapsed)}
                          className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase border transition-all ${
                            twinLabelsCollapsed 
                              ? 'bg-cyan-500/25 border-cyan-500 text-cyan-400' 
                              : 'bg-white/5 border-white/10 text-gray-400'
                          }`}
                        >
                          {twinLabelsCollapsed ? 'Activado' : 'Desactivado'}
                        </button>
                      </div>

                      {/* Elevación del Piso */}
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-center text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          <span className="flex items-center gap-1">
                            {twinFloorLocked ? <Lock className="w-2.5 h-2.5 text-yellow-400" /> : <Unlock className="w-2.5 h-2.5 text-gray-400" />}
                            Elevación del Piso:
                          </span>
                          <span className="text-cyan-500 font-bold tabular-nums">{twinFloorElevation.toFixed(1)} m</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setTwinFloorLocked(l => !l)}
                            className={`p-1.5 border rounded-lg transition-all ${
                              twinFloorLocked 
                                ? 'bg-yellow-500/20 border-yellow-500 text-yellow-400' 
                                : 'bg-white/5 border-white/10 text-gray-400 hover:text-white'
                            }`}
                            title={twinFloorLocked ? 'Desbloquear elevación del piso' : 'Bloquear elevación del piso'}
                          >
                            {twinFloorLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                          </button>
                          <input
                            type="range"
                            min="-5.0"
                            max="5.0"
                            step="0.1"
                            value={twinFloorElevation}
                            onChange={(e) => {
                              if (!twinFloorLocked) {
                                setTwinFloorElevation(Number(e.target.value));
                                setIsAnchored(false);
                              }
                            }}
                            disabled={twinFloorLocked}
                            className={`w-full h-1 rounded-lg appearance-none cursor-pointer accent-cyan-500 ${
                              twinFloorLocked ? 'opacity-40 cursor-not-allowed' : 'bg-slate-800'
                            }`}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Fichas 3D selector */}
                    <div className="border-t border-white/5 pt-3">
                      <span className="block text-[9px] font-black uppercase text-gray-400 tracking-wider mb-2">
                        Equipos en Escena (Selecciona para mover en el espacio 3D):
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {twinNodes.map((node) => (
                          <div
                            key={node.id}
                            className={`flex items-center rounded-lg border overflow-hidden transition-all ${
                              selectedTwinNodeId === node.id
                                ? 'border-[#00F0FF] bg-[#00F0FF]/15'
                                : 'border-slate-800 bg-slate-900/60 hover:border-slate-700'
                            }`}
                          >
                            <span
                              className="w-2.5 h-2.5 rounded-full mx-1.5 flex-shrink-0"
                              style={{ backgroundColor: node.data?.color || '#00F0FF' }}
                            />
                            <button
                              onClick={() => setSelectedTwinNodeId(selectedTwinNodeId === node.id ? null : node.id)}
                              className={`py-1.5 px-3 text-[10px] font-bold transition-colors uppercase ${
                                selectedTwinNodeId === node.id ? 'text-white' : 'text-gray-400 hover:text-white'
                              }`}
                              title="Seleccionar para mover en 3D"
                            >
                              {node.data?.label || node.data?.type || 'Equipo'}
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-[9px] text-gray-500 italic mt-1.5">
                        💡 Tip: Activa "Ajustes", selecciona un equipo de la lista arriba, y arrástralo directamente en el visor 3D usando las flechas de control.
                      </p>
                    </div>
                  </div>
                )}

                {/* Canvas 3D Viewer */}
                <div className={`relative rounded-2xl overflow-hidden border ${
                  twinTheme === 'toxic' 
                    ? 'border-[#2c302e] bg-[#0c0d0e]' 
                    : twinTheme === 'blueprint' 
                      ? 'border-slate-200 bg-[#edf4f9]' 
                      : 'border-slate-800/80 bg-[#05070f]'
                }`}>
                  <SharedTwinViewer3D 
                    storagePrefix="sim_molex_"
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

                  {/* Banner flotante de controles */}
                  <div className="absolute bottom-4 right-4 bg-black/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10 text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5 select-none pointer-events-none">
                    <MousePointer className="w-3 h-3 text-[#00F0FF]" />
                    Click + arrastrar para orbitar | Scroll para zoom
                  </div>
                </div>

                {/* Mini KPI cards del twin */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-6">
                  {MOLEX_EQUIPMENTS.map((eq) => (
                    <div key={eq.id} className={`rounded-xl p-3.5 text-center transition-all border ${
                      twinTheme === 'toxic'
                        ? 'bg-[#151515] border-[#2c302e] hover:border-[#84cc16]'
                        : twinTheme === 'blueprint'
                          ? 'bg-slate-50 border-slate-200 hover:border-blue-400 text-slate-800'
                          : 'bg-slate-900/60 border-slate-800 hover:border-cyan-500/50 text-white'
                    }`}>
                      <span className={`block text-[8px] font-black uppercase tracking-widest ${twinTheme === 'blueprint' ? 'text-slate-400' : 'text-slate-500'}`}>{eq.name}</span>
                      <span className={`block text-sm font-black mt-1 ${twinTheme === 'toxic' ? 'text-[#84cc16]' : twinTheme === 'blueprint' ? 'text-blue-700' : 'text-[#00F0FF]'}`}>{eq.kw} kW</span>
                      <span className="block text-[9px] font-mono mt-0.5 opacity-80">${new Intl.NumberFormat().format(eq.capexUsd)} USD</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 3. DETALLE DE LOTES */}
          {activeTab === "tabla" && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">Simulación Por Tipo de Cable</h3>
                <span className="text-xs text-slate-500 font-bold">Modifica los valores directamente en las celdas</span>
              </div>

              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="min-w-full text-xs">
                  <thead>
                    <tr className="bg-slate-800 text-slate-300 font-black uppercase">
                      <th className="px-3 py-3 border-r border-slate-700 text-left">Cable</th>
                      <th className="px-3 py-3 border-r border-slate-700 text-left">Modelo</th>
                      <th className="px-3 py-3 border-r border-slate-700 text-center">Tipo</th>
                      <th className="px-3 py-3 border-r border-slate-700 text-center">Kg Lote</th>
                      <th className="px-3 py-3 border-r border-slate-700 text-center">Metros</th>
                      <th className="px-3 py-3 border-r border-slate-700 text-center">Kg/m Cable</th>
                      <th className="px-3 py-3 border-r border-slate-700 text-center">Cobre/m</th>
                      <th className="px-3 py-3 border-r border-slate-700 text-center">% Cobre</th>
                      <th className="px-3 py-3 border-r border-slate-700 text-center">Ef. %</th>
                      <th className="px-3 py-3 border-r border-slate-700 text-center">Kg Recuperado</th>
                      <th className="px-3 py-3 border-r border-slate-700 text-right">Venta (MXN)</th>
                      <th className="px-3 py-3 text-center">Base</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {calculations.rows.map((r, index) => {
                      const isLote = (r.baseCalculo || (Number(r.metros || 0) > 0 ? "metros" : "lote")) === "lote";
                      return (
                        <tr key={r.id} className="hover:bg-slate-50/50">
                        <td className="px-3 py-2 font-bold text-slate-900 border-r border-slate-100">{r.cable}</td>
                        <td className="px-3 py-2 text-slate-500 border-r border-slate-100 truncate max-w-[120px] font-bold" title={r.modelo}>{r.modelo}</td>
                        <td className="px-2 py-2 border-r border-slate-100 text-center">
                          <select
                            value={r.tipo}
                            onChange={(e) => updateRow(index, "tipo", e.target.value)}
                            className="bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 font-bold text-[10px] text-slate-800"
                          >
                            <option value="rojo">Cobre rojo</option>
                            <option value="estanado">Cobre estañado</option>
                          </select>
                        </td>
                        <td className="px-2 py-2 border-r border-slate-100 text-center">
                          <input 
                            type="number" 
                            value={r.kgLote} 
                            step="0.01"
                            onChange={e => updateRow(index, "kgLote", e.target.value)} 
                            disabled={!isLote}
                            className={`w-16 border rounded text-center py-0.5 font-bold focus:outline-none ${
                              !isLote ? 'bg-slate-50 text-slate-350 border-slate-200 cursor-not-allowed opacity-60' : 'bg-white border-slate-200 text-slate-800 focus:border-cyan-550'
                            }`}
                          />
                        </td>
                        <td className="px-2 py-2 border-r border-slate-100 text-center">
                          <input 
                            type="number" 
                            value={r.metros} 
                            step="1"
                            onChange={e => updateRow(index, "metros", e.target.value)} 
                            disabled={isLote}
                            className={`w-16 border rounded text-center py-0.5 font-bold focus:outline-none ${
                              isLote ? 'bg-slate-50 text-slate-350 border-slate-200 cursor-not-allowed opacity-60' : 'bg-white border-slate-200 text-slate-800 focus:border-cyan-555'
                            }`}
                          />
                        </td>
                        <td className="px-2 py-2 border-r border-slate-100 text-center">
                          <input 
                            type="number" 
                            value={r.kgmCable} 
                            step="0.0001"
                            onChange={e => updateRow(index, "kgmCable", e.target.value)} 
                            disabled={isLote}
                            className={`w-16 border rounded text-center py-0.5 font-bold focus:outline-none ${
                              isLote ? 'bg-slate-50 text-slate-350 border-slate-200 cursor-not-allowed opacity-60' : 'bg-white border-slate-200 text-slate-800 focus:border-cyan-555'
                            }`}
                          />
                        </td>
                        <td className="px-2 py-2 border-r border-slate-100 text-center">
                          <input 
                            type="number" 
                            value={Number(r.kgmCobre).toFixed(5)} 
                            step="0.00001"
                            onChange={e => updateRow(index, "kgmCobre", e.target.value)} 
                            disabled={isLote}
                            className={`w-20 border rounded text-center py-0.5 font-bold focus:outline-none ${
                              isLote ? 'bg-slate-50 text-slate-350 border-slate-200 cursor-not-allowed opacity-60' : 'bg-white border-slate-200 text-slate-800 focus:border-cyan-555'
                            }`}
                          />
                        </td>
                        <td className="px-2 py-2 border-r border-slate-100 text-center">
                          <input 
                            type="number" 
                            value={r.pctBruto} 
                            step="0.1"
                            onChange={e => updateRow(index, "pctBruto", e.target.value)} 
                            disabled={!isLote}
                            className={`w-14 border rounded text-center py-0.5 font-bold focus:outline-none ${
                              !isLote ? 'bg-slate-50 text-slate-350 border-slate-200 cursor-not-allowed opacity-60' : 'bg-white border-slate-200 text-slate-800 focus:border-cyan-555'
                            }`}
                          />
                        </td>
                        <td className="px-2 py-2 border-r border-slate-100 text-center">
                          <input 
                            type="number" 
                            value={r.eficiencia} 
                            step="0.1"
                            onChange={e => updateRow(index, "eficiencia", e.target.value)} 
                            className="w-14 bg-white border border-slate-200 rounded text-center py-0.5 font-bold"
                          />
                        </td>
                        <td className="px-3 py-2 border-r border-slate-100 text-center font-black text-slate-800">
                          {kg(r.kgRecuperado)}
                        </td>
                        <td className="px-3 py-2 border-r border-slate-100 text-right font-black text-cyan-700">
                          {money(r.venta)}
                        </td>
                        <td className="px-2 py-2 text-center">
                          <select
                            value={isLote ? "lote" : "metros"}
                            onChange={(e) => updateRow(index, "baseCalculo", e.target.value)}
                            className={`border rounded px-1.5 py-0.5 font-black text-[9px] uppercase focus:outline-none cursor-pointer ${
                              isLote 
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}
                          >
                            <option value="lote">Lote</option>
                            <option value="metros">Metros</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                  </tbody>
                </table>
              </div>

              {calculations.warnings.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 rounded-2xl p-4 flex flex-col gap-1.5 animate-pulse">
                  <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wider">
                    <ShieldAlert className="w-4 h-4 text-amber-600" />
                    Advertencias de Validación
                  </div>
                  <ul className="list-disc pl-5 text-[11px] font-bold space-y-1">
                    {calculations.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* TAB CONTENT: 4. CAPEX/OPEX */}
          {activeTab === 'capex' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CAPEX CARD */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                      Estructura de Inversión Inicial (CAPEX)
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">CAPEX Total Estimado</span>
                        <span className="text-3xl font-black text-slate-900">
                          ${new Intl.NumberFormat().format(calculations.capexTotalMxn.toFixed(0))} <span className="text-lg text-slate-500">MXN</span>
                        </span>
                        <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
                          (${new Intl.NumberFormat().format(calculations.capexTotalUsd.toFixed(0))} USD · TC: {inputs.exchangeRate})
                        </span>
                      </div>
                      <div className="space-y-2 mt-4">
                        {[
                          { label: 'Adquisición de Maquinaria Principal', valUsd: inputs.machinePurchaseUsd },
                          { label: 'Instalación y Puesta en Marcha', valUsd: inputs.installationCostUsd },
                          { label: 'Obra Civil e Infraestructura', valUsd: inputs.civilWorksUsd }
                        ].map((item, i) => (
                          <div key={i} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg text-xs font-semibold">
                            <span className="text-slate-650 uppercase">{item.label}</span>
                            <div className="text-right">
                              <span className="text-emerald-700 font-bold block">${new Intl.NumberFormat().format((item.valUsd * inputs.exchangeRate).toFixed(0))} MXN</span>
                              <span className="text-[9px] text-slate-400 font-mono">${new Intl.NumberFormat().format(item.valUsd)} USD</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* OPEX CARD */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                      <Activity className="w-5 h-5 text-rose-600" />
                      Estructura de Gastos Operativos (OPEX)
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <span className="block text-[10px] font-bold text-slate-400 uppercase">OPEX Mensual Total (Escenario Activo)</span>
                        <span className="text-3xl font-black text-slate-900">
                          ${new Intl.NumberFormat().format(activeProjection.opexTotalMesMxn.toFixed(0))} <span className="text-lg text-slate-500">MXN</span>
                        </span>
                      </div>
                      <div className="space-y-2 mt-4">
                        {[
                          { label: 'Mano de Obra Directa', val: calculations.laborMonthlyMxn },
                          { label: 'Mantenimiento Preventivo', val: calculations.maintenanceMonthlyMxn },
                          { label: 'Consumibles / Cuchillas Trituradoras', val: calculations.consumablesMonthlyMxn },
                          { label: 'Energía Eléctrica (Escenario Activo)', val: calculations.monthlyEnergyCostBaseMxn * activeProjection.m }
                        ].map((item, i) => (
                          <div key={i} className="flex justify-between items-center bg-slate-50 p-2.5 rounded-lg text-xs font-semibold">
                            <span className="text-slate-650 uppercase">{item.label}</span>
                            <span className="text-rose-700 font-bold">${new Intl.NumberFormat().format(item.val.toFixed(0))} MXN</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 5. ENERGÍA */}
          {activeTab === 'energia' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <h3 className="text-sm font-black uppercase text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyan-600" />
                  Desglose Energético Operativo de la Línea
                </h3>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Potencia Instalada</span>
                    <span className="text-xl font-black text-slate-800">{inputs.installedPowerKw} kW</span>
                    <span className="block text-[9px] text-slate-450 mt-1 font-mono">{(inputs.installedPowerKw * 1.341).toFixed(1)} HP equivalentes</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Consumo Promedio Hora</span>
                    <span className="text-xl font-black text-cyan-700">{calculations.averageHourlyKwh.toFixed(2)} kWh</span>
                    <span className="block text-[9px] text-cyan-600 font-mono mt-1">Factor de Carga: {inputs.averageLoadFactor}%</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-4">
                    <span className="block text-[9px] font-bold text-slate-400 uppercase">Costo Eléctrico Hora</span>
                    <span className="text-xl font-black text-slate-800">${(calculations.averageHourlyKwh * inputs.electricityRateMxn).toFixed(2)} MXN</span>
                    <span className="block text-[9px] text-slate-450 mt-1 font-mono">Tarifa: ${inputs.electricityRateMxn}/kWh</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-5">
                    <h4 className="text-xs font-black uppercase text-slate-700 mb-3">Consumo Proyectado Diario y Mensual</h4>
                    <ul className="text-xs space-y-2.5 font-semibold text-slate-650">
                      <li className="flex justify-between">
                        <span>Horas operativas base por día (Escenario x1):</span>
                        <span className="text-slate-800">{inputs.horasTrabajoDia || 2.5} hrs</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Consumo diario base:</span>
                        <span className="text-slate-800">{calculations.dailyKwh.toFixed(1)} kWh/día</span>
                      </li>
                      <li className="flex justify-between border-t border-slate-200/50 pt-2">
                        <span>Consumo mensual base:</span>
                        <span className="text-slate-800">{calculations.monthlyKwhBase.toFixed(1)} kWh/mes</span>
                      </li>
                      <li className="flex justify-between">
                        <span>Costo eléctrico mensual base:</span>
                        <span className="text-cyan-700 font-bold">${new Intl.NumberFormat().format(calculations.monthlyEnergyCostBaseMxn.toFixed(0))} MXN</span>
                      </li>
                    </ul>
                  </div>

                  <div className="bg-cyan-50/50 border border-cyan-150 rounded-xl p-5">
                    <h4 className="text-xs font-black uppercase text-cyan-800 mb-3 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-cyan-600" />
                      Voltaje y Factor de Reducción
                    </h4>
                    <p className="text-xs text-slate-600 leading-relaxed font-medium">
                      El voltaje seleccionado es de <strong>{inputs.voltage}V</strong>. Operar la máquina a 220V genera un calentamiento inductivo que penaliza un <strong>7%</strong> la eficiencia eléctrica general del sistema (ya integrado en los cálculos HMI).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 6. ESCENARIOS */}
          {activeTab === "escenarios" && (
            <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
              <h3 className="text-sm font-black uppercase text-slate-900 tracking-wider">Tabla Comparativa De Proyección Económica</h3>
              {(() => {
                const chartData = proyecciones.map(p => ({
                  name: `x${p.m}`,
                  Ventas: Math.round(p.ventaMes),
                  EBITDA: Math.round(p.margenMensualMxn),
                  OPEX: Math.round(p.opexTotalMesMxn)
                }));

                const CustomTooltip = ({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-slate-900/95 border border-slate-800 p-4 rounded-xl shadow-2xl text-xs backdrop-blur-md">
                        <p className="font-black text-slate-350 uppercase mb-2">Escenario {label}</p>
                        {payload.map((entry, index) => (
                          <div key={index} className="flex justify-between gap-6 py-1">
                            <span style={{ color: entry.color }} className="font-bold uppercase text-[10px]">{entry.name}:</span>
                            <span className="font-mono font-black text-white">
                              ${new Intl.NumberFormat().format(entry.value)} MXN
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                };

                return (
                  <div className="grid grid-cols-1 gap-6">
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="min-w-full text-xs">
                        <thead>
                          <tr className="bg-slate-800 text-slate-300 font-black uppercase text-left">
                            <th className="px-4 py-3 border-r border-slate-700">Escenario</th>
                            <th className="px-4 py-3 border-r border-slate-700">Kg Cable/Día</th>
                            <th className="px-4 py-3 border-r border-slate-700">Kg Cobre Rojo/Día</th>
                            <th className="px-4 py-3 border-r border-slate-700">Kg Estañado/Día</th>
                            <th className="px-4 py-3 border-r border-slate-700">Kg Metal Total</th>
                            <th className="px-4 py-3 border-r border-slate-700">Venta/Día</th>
                            <th className="px-4 py-3 border-r border-slate-700">Kg Metal/Mes</th>
                            <th className="px-4 py-3 border-r border-slate-700">Venta/Mes</th>
                            <th className="px-4 py-3 border-r border-slate-700">Kg Metal/Año</th>
                            <th className="px-4 py-3 border-r border-slate-700">Venta/Año</th>
                            <th className="px-4 py-3">Múltiplo</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {proyecciones.map((p) => (
                            <tr 
                              key={p.m} 
                              className={`hover:bg-slate-50/50 ${
                                p.m === inputs.multiplicadorActivo 
                                  ? "bg-cyan-50/40 font-bold" 
                                  : ""
                              }`}
                            >
                              <td className="px-4 py-2.5 border-r border-slate-100">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                  p.m === inputs.multiplicadorActivo 
                                    ? "bg-cyan-600 text-white" 
                                    : "bg-slate-100 text-slate-600 border border-slate-200"
                                }`}>
                                  x{p.m}
                                </span>
                              </td>
                              <td className="px-4 py-2.5 border-r border-slate-100">{kg(p.kgCableDia)}</td>
                              <td className="px-4 py-2.5 border-r border-slate-100 text-emerald-600">{kg(p.rojoDia)}</td>
                              <td className="px-4 py-2.5 border-r border-slate-100 text-amber-600">{kg(p.estanadoDia)}</td>
                              <td className="px-4 py-2.5 border-r border-slate-100 font-bold">{kg(p.metalDia)}</td>
                              <td className="px-4 py-2.5 border-r border-slate-100 font-bold">{money(p.ventaDia)}</td>
                              <td className="px-4 py-2.5 border-r border-slate-100">{kg(p.metalMes)}</td>
                              <td className="px-4 py-2.5 border-r border-slate-100 text-emerald-700 font-bold">{money(p.ventaMes)}</td>
                              <td className="px-4 py-2.5 border-r border-slate-100">{kg(p.metalAnio)}</td>
                              <td className="px-4 py-2.5 border-r border-slate-100 text-indigo-700 font-bold">{money(p.ventaAnio)}</td>
                              <td className="px-4 py-2.5 text-cyan-600 font-black">{p.multiplo}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="border border-slate-200 rounded-2xl p-6 bg-slate-50/50">
                      <div className="flex flex-col md:flex-row justify-between md:items-center gap-3 mb-6">
                        <div>
                          <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                            Gráfica de Escenarios de Rendimiento Económico Mensual
                          </h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            Proyección visual comparativa de Ventas, OPEX y Margen EBITDA (mensual) según el multiplicador.
                          </p>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-bold text-slate-650 uppercase">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-cyan-500" />
                            <span>Ventas</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                            <span>EBITDA</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-sm bg-rose-500" />
                            <span>OPEX</span>
                          </div>
                        </div>
                      </div>

                      <div className="h-[280px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorEbitda" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorOpex" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} />
                            <YAxis 
                              stroke="#64748b" 
                              fontSize={10} 
                              tickLine={false} 
                              axisLine={false} 
                              tickFormatter={(value) => `$${new Intl.NumberFormat('es-MX', { notation: 'compact' }).format(value)}`} 
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area type="monotone" dataKey="Ventas" stroke="#06b6d4" strokeWidth={2} fillOpacity={1} fill="url(#colorVentas)" />
                            <Area type="monotone" dataKey="EBITDA" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorEbitda)" />
                            <Area type="monotone" dataKey="OPEX" stroke="#f43f5e" strokeWidth={2} fillOpacity={1} fill="url(#colorOpex)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* TAB CONTENT: 7. FINANCIERO */}
          {activeTab === 'financiero' && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col gap-6">
                <div className="flex justify-between items-center mb-2 border-b border-slate-100 pb-4">
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-900 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-indigo-600" />
                      Matriz Comparativa de Viabilidad Financiera (5 Escenarios)
                    </h3>
                    <p className="text-xs text-slate-500 mt-1 font-medium">
                      Análisis comparativo de ingresos, gastos, rentabilidad (ROI) y amortización (Payback) según volumen de procesamiento diario.
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                  <table className="min-w-full text-xs">
                    <thead>
                      <tr className="bg-slate-800 text-slate-300 font-black uppercase text-left">
                        <th className="px-4 py-3 border-r border-slate-700">Escenario</th>
                        <th className="px-4 py-3 border-r border-slate-700">Procesamiento</th>
                        <th className="px-4 py-3 border-r border-slate-700">Venta Mensual</th>
                        <th className="px-4 py-3 border-r border-slate-700">OPEX Mensual</th>
                        <th className="px-4 py-3 border-r border-slate-700">EBITDA Mensual</th>
                        <th className="px-4 py-3 border-r border-slate-700">EBITDA Anual</th>
                        <th className="px-4 py-3 border-r border-slate-700">Margen EBITDA</th>
                        <th className="px-4 py-3 border-r border-slate-700">ROI Anual</th>
                        <th className="px-4 py-3 border-r border-slate-700">Payback (Retorno)</th>
                        <th className="px-4 py-3">Pto. Equilibrio</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {proyecciones.map((p) => {
                        const isSel = p.m === inputs.multiplicadorActivo;
                        const margenEbitdaPct = p.ventaMes > 0 ? (p.margenMensualMxn / p.ventaMes) * 100 : 0;
                        return (
                          <tr 
                            key={p.m} 
                            onClick={() => updateGlobal("multiplicadorActivo", p.m)}
                            className={`hover:bg-slate-50/50 cursor-pointer transition-colors ${
                              isSel ? "bg-cyan-50/40 font-bold" : ""
                            }`}
                          >
                            <td className="px-4 py-2.5 border-r border-slate-100">
                              <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                                isSel 
                                  ? "bg-cyan-600 text-white" 
                                  : "bg-slate-100 text-slate-655 border border-slate-200"
                              }`}>
                                x{p.m}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 border-r border-slate-100 font-semibold">{p.kgCableDia.toFixed(0)} kg/día</td>
                            <td className="px-4 py-2.5 border-r border-slate-100 font-semibold">{money(p.ventaMes)}</td>
                            <td className="px-4 py-2.5 border-r border-slate-100 text-rose-600 font-semibold">{money(p.opexTotalMesMxn)}</td>
                            <td className={`px-4 py-2.5 border-r border-slate-100 font-bold ${p.margenMensualMxn >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {money(p.margenMensualMxn)}
                            </td>
                            <td className={`px-4 py-2.5 border-r border-slate-100 font-bold ${p.margenAnualMxn >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                              {money(p.margenAnualMxn)}
                            </td>
                            <td className={`px-4 py-2.5 border-r border-slate-100 font-bold ${margenEbitdaPct >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {margenEbitdaPct.toFixed(1)}%
                            </td>
                            <td className={`px-4 py-2.5 border-r border-slate-100 font-black ${p.roiAnual >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {p.roiAnual.toFixed(1)}%
                            </td>
                            <td className="px-4 py-2.5 border-r border-slate-100 font-semibold">
                              {p.paybackMeses === Infinity ? 'N/A' : `${p.paybackMeses.toFixed(1)} meses`}
                            </td>
                            <td className="px-4 py-2.5 font-bold text-indigo-650">
                              {p.puntoEquilibrioTonMes !== Infinity ? `${p.puntoEquilibrioTonMes.toFixed(2)} ton/mes` : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
                    <div>
                      <h4 className="text-xs font-black uppercase text-slate-800 tracking-wider">
                        Análisis Detallado del Escenario Seleccionado: <span className="text-cyan-600 font-black">x{inputs.multiplicadorActivo} ({activeProjection.kgCableDia.toFixed(0)} kg/día)</span>
                      </h4>
                      <p className="text-[10px] text-slate-550 mt-0.5">
                        Haz clic en cualquier fila de la tabla superior para cambiar el escenario activo de simulación.
                      </p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${
                      activeProjection.paybackMeses <= 12 ? 'bg-emerald-100 text-emerald-700' : 
                      activeProjection.paybackMeses <= 24 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {activeProjection.paybackMeses <= 12 ? 'ALTAMENTE RENTABLE' : 
                       activeProjection.paybackMeses <= 24 ? 'MODERADAMENTE VIABLE' : 'RETORNO EXTENDIDO'}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Dictamen de Retorno (Payback)</span>
                      <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                        Para el escenario de <strong>{activeProjection.kgCableDia.toFixed(0)} kg/día</strong>, la inversión inicial (CAPEX) de <strong>{money(calculations.capexTotalMxn)}</strong> se recuperará en un período estimado de <strong>{activeProjection.paybackMeses === Infinity ? 'N/A' : `${activeProjection.paybackMeses.toFixed(1)} meses`}</strong>, operando con un ROI anualizado de <strong>{activeProjection.roiAnual.toFixed(1)}%</strong>.
                      </p>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-2">Punto de Equilibrio de Operación</span>
                      <p className="text-xs text-slate-650 leading-relaxed font-semibold">
                        La planta requiere procesar un mínimo de <strong>{activeProjection.puntoEquilibrioTonMes !== Infinity ? activeProjection.puntoEquilibrioTonMes.toFixed(2) : 'N/A'} toneladas mensuales</strong> de cable mixto para alcanzar el punto de equilibrio (donde los ingresos cubren OPEX y consumo eléctrico).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB CONTENT: 8. RIESGOS */}
          {activeTab === 'riesgos' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* MATRIZ DE RIESGO */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 mb-4 border-b border-slate-100 pb-3 flex items-center gap-2">
                    <ShieldAlert className="w-5 h-5 text-red-650" />
                    Matriz de Riesgo Operativo de Cobre
                  </h3>
                  <div className="space-y-3">
                    {[
                      { label: 'Exposición a Polvo Fino de PVC', val: inputs.riesgoPolvo, icon: '🌪️' },
                      { label: 'Humedad en Envoltura Plástica', val: inputs.riesgoHumedad, icon: '💧' },
                      { label: 'Contaminación Metálica en Cuchillas', val: inputs.riesgoMetal, icon: '🧲' },
                      { label: 'Variaciones e Inestabilidad de Voltaje', val: inputs.riesgoVoltaje, icon: '⚡' }
                    ].map((r, i) => (
                      <div key={i} className="flex justify-between items-center bg-slate-50 p-3.5 rounded-xl border border-slate-100 animate-fade-in">
                        <span className="text-xs font-bold text-slate-605 uppercase flex items-center gap-2">{r.icon} {r.label}</span>
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
                    <Wrench className="w-5 h-5 text-slate-605" />
                    Frecuencia de Mantenimiento Requerida
                  </h3>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Vida Útil de Cuchillas</span>
                      <span className="text-lg font-black text-slate-800">{inputs.vidaUtilCuchillasHoras} hrs</span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Mtto General Preventivo</span>
                      <span className="text-lg font-black text-slate-800">{inputs.frecuenciaMantenimientoHoras} hrs</span>
                    </div>
                  </div>
                  
                  <h4 className="text-[10px] font-black text-slate-400 uppercase mb-3">Requisitos e Infraestructura de Seguridad</h4>
                  <div className="flex flex-wrap gap-2 text-[10px] font-bold uppercase">
                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-700">Extractor de Polvo PVC</span>
                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-700">Protección Acústica 85dB</span>
                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-700">Separador Magnético en Tolva</span>
                    <span className="px-2.5 py-1 bg-slate-100 border border-slate-200 rounded-lg text-slate-700">Guantes de Kevlar Anticalor</span>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* TOAST NOTIFICATION */}
      {showToast && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-slate-700 text-white rounded-2xl px-5 py-3 shadow-xl flex items-center gap-2.5 transition-all z-50 animate-bounce">
          <Check className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold uppercase tracking-wider">{toastMessage}</span>
        </div>
      )}

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

      {/* Modal: Nombrar y Guardar Modelo 3D Subido */}
      {pendingUpload && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
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
            <div className="p-6 space-y-4 text-slate-300">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-gray-400">Nombre del Layout / Planta</label>
                <input 
                  type="text" 
                  value={uploadModelName}
                  onChange={(e) => setUploadModelName(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-white focus:border-cyan-400 focus:outline-none transition-colors"
                  placeholder="Ej. Nave Molex Planta 2"
                />
              </div>

              {isSavingToCloud && (
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-wider text-cyan-400">
                    <span>Subiendo archivo 3D a la nube...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-cyan-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white/2 border-t border-white/5 flex items-center justify-end gap-2">
              <button 
                onClick={() => setPendingUpload(null)}
                disabled={isSavingToCloud}
                className="px-4 py-2 rounded-xl border border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button 
                onClick={handleSaveUploadToLibrary}
                disabled={isSavingToCloud || !uploadModelName.trim()}
                className="px-4 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-400 disabled:bg-cyan-800 disabled:opacity-50 text-black text-[10px] font-black uppercase tracking-widest transition-all shadow-md flex items-center gap-1.5"
              >
                {isSavingToCloud ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Guardar y Anclar
              </button>
            </div>
          </div>
        </div>
      , document.body)}

      {/* ====================================================
          MODAL VISOR DE INFORME INDUSTRIAL PDF (1120x792 px)
          ==================================================== */}
      {isReportModalOpen && createPortal(
        <div className="fixed inset-0 z-[99999] bg-[#090b10]/95 backdrop-blur-xl flex flex-col items-center justify-start overflow-y-auto p-6">
          {/* Barra de Control Superior */}
          <div className="w-full max-w-[1120px] flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
                <FileText className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-white text-sm font-black uppercase tracking-wider">Visor de Reporte Paramétrico</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Molex simulator report • 6 Páginas Industriales</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              {isGeneratingPdf && (
                <div className="flex items-center gap-3 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                  <Loader2 className="w-4 h-4 text-cyan-400 animate-spin" />
                  <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest font-mono">Exportando: {pdfProgress}%</span>
                </div>
              )}
              
              <button
                onClick={printReport}
                disabled={isGeneratingPdf}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-cyan-500 hover:bg-cyan-600 text-slate-950 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                Descargar PDF
              </button>
              
              <button
                onClick={() => setIsReportModalOpen(false)}
                className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Contenedor del Reporte (Hojas A4 Landscape) */}
          <div ref={reportRef} className="space-y-8 select-none" style={{ width: '1120px' }}>

            {/* HOJA 1: PORTADA */}
            <div className="lma-page" style={S.page}>
              <div style={{ height: 80, background: 'linear-gradient(to right, #00989d, #00b0b9)', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 48px' }}>
                <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(120deg, transparent, transparent 28px, rgba(255,255,255,0.03) 28px, rgba(255,255,255,0.03) 30px)' }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 2 }}>
                  <span style={{ color: '#fff', fontWeight: 900, fontSize: 20, letterSpacing: 1, textTransform: 'uppercase', fontFamily: 'sans-serif' }}>
                    CENTERS DE MÉXICO
                  </span>
                  <span style={{ display: 'inline-block', fontSize: 9, fontWeight: 800, color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, padding: '2px 8px', background: 'rgba(255,255,255,0.1)' }}>
                    PANDORA 3.0
                  </span>
                </div>
                <div style={{ textAlign: 'right', position: 'relative', zIndex: 2 }}>
                  <div style={{ color: '#fff', fontSize: 13, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    SIMULADOR DE RECUPERACIÓN DE COBRE
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 9, fontWeight: 700, marginTop: 3 }}>
                    CLIENTE: {inputs.clientName?.toUpperCase() || 'PEDRO PEREZ'} &nbsp;|&nbsp; MÁQUINA: MOLEX &nbsp;|&nbsp; FECHA: {inputs.evaluationDate || new Date().toLocaleDateString("es-MX")}
                  </div>
                </div>
              </div>

              <div className="lma-page-inner" style={{ ...S.inner, display: 'grid', gridTemplateColumns: '1.2fr 1.0fr', gap: 40, alignItems: 'center', marginTop: -20, flex: 1 }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 900, color: '#00989d', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
                      INFORME PARAMÉTRICO DE SIMULACIÓN
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <div style={{ fontSize: 44, fontWeight: 900, color: '#0f2038', letterSpacing: -0.8, lineHeight: 1.0, fontFamily: 'sans-serif' }}>
                        SIMULACIÓN
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 4, height: 38, background: '#00b0b9', borderRadius: 2 }} />
                        <div style={{ fontSize: 44, fontWeight: 900, color: '#00b0b9', letterSpacing: -0.8, lineHeight: 1.0, fontFamily: 'sans-serif' }}>
                          DE LÍNEA
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ marginTop: 4 }}>
                    <div style={{ fontSize: 9, fontWeight: 900, color: '#00b0b9', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 2 }}>
                      CLIENTE
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#0f2038', letterSpacing: -0.5, borderBottom: '2px solid #00989d', paddingBottom: '4px', width: 'fit-content' }}>
                      {inputs.clientName?.toUpperCase() || 'PEDRO PEREZ'}
                    </div>
                  </div>

                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, width: 'fit-content', background: '#ecfeff', border: '1px solid #00b0b9', borderRadius: 20, padding: '4px 14px', fontSize: 10, color: '#00989d', fontWeight: 800 }}>
                    • Evaluación de Capacidad y Eficiencia
                  </div>

                  <p style={{ fontSize: '10px', color: '#64748b', margin: '4px 0', lineHeight: '1.4' }}>
                    Análisis de capacidad, potencia instalada y viabilidad financiera para la línea de recuperación de cobre puro y estañado con el simulador MOLEX.
                  </p>

                  <table style={{ width: '100%', fontSize: '10px', marginTop: '10px' }}>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 0', fontWeight: 800, color: '#00989d' }}>Empresa</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{inputs.clientName?.toUpperCase() || 'PEDRO PEREZ'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 0', fontWeight: 800, color: '#00989d' }}>Cliente</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{inputs.clientName?.toUpperCase() || 'PEDRO PEREZ'}</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 0', fontWeight: 800, color: '#00989d' }}>Máquina</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>MOLEX</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 0', fontWeight: 800, color: '#00989d' }}>Proyecto</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{inputs.projectName?.toUpperCase() || 'PROYECTO PREDETERMINADO PANDORA'}</td>
                      </tr>
                      <tr>
                        <td style={{ padding: '6px 0', fontWeight: 800, color: '#00989d' }}>Fecha</td>
                        <td style={{ padding: '6px 0', textAlign: 'right', fontWeight: 700, color: '#0f172a' }}>{inputs.evaluationDate || new Date().toLocaleDateString("es-MX")}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '12px', padding: '12px 18px', marginTop: '10px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 900, color: '#0d9488', textTransform: 'uppercase' }}>Parámetros del Material Simulado</div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginTop: '6px' }}>
                      <span style={{ color: '#475569', fontWeight: 700 }}>Material Evaluado:</span>
                      <span style={{ fontWeight: 900, color: '#0f172a' }}>CABLES DE COBRE DESCARTE</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginTop: '4px' }}>
                      <span style={{ color: '#475569', fontWeight: 700 }}>Régimen Diario:</span>
                      <span style={{ fontWeight: 900, color: '#0f172a' }}>{inputs.diasMes} días ({inputs.numOperators} operadores)</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '9px', marginTop: '4px' }}>
                      <span style={{ color: '#475569', fontWeight: 700 }}>Meta Objetivo Diaria:</span>
                      <span style={{ fontWeight: 900, color: '#0f172a' }}>{inputs.pesoObjetivo} kg/lote</span>
                    </div>
                  </div>
                </div>

                <div style={{ background: '#f4fbfb', border: '1px solid #d2f4f4', borderRadius: 20, padding: 30, display: 'flex', flexDirection: 'column', gap: 18, height: '100%', justifyContent: 'center' }}>
                  <div style={{ fontSize: 11, fontWeight: 900, color: '#00989d', borderBottom: '1px solid #d2f4f4', paddingBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                    Vista Previa de Resultados
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5f6f6', paddingBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>Cobre Recuperado Mensual (5x)</div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Cobre puro + estañado proyectado</div>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#00989d' }}>
                        {(proyecciones[4]?.metalMes || 0).toFixed(2)} kg
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5f6f6', paddingBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>Ingreso Estimado Mensual (5x)</div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Valor comercial total proyectado</div>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#00989d' }}>
                        {money(proyecciones[4]?.ventaMes || 0)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e5f6f6', paddingBottom: '8px' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>Costo Operativo Mensual (5x)</div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Proyección mensual (OPEX 5x)</div>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#00989d' }}>
                        {money(proyecciones[4]?.opexTotalMesMxn || 0)}
                      </div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: '11px', fontWeight: 800, color: '#0f172a' }}>Retorno de Inversión (ROI 5x)</div>
                        <div style={{ fontSize: '9px', color: '#64748b', marginTop: '2px' }}>Tasa interna proyectada (5x)</div>
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: 900, color: '#10b981' }}>
                        {(proyecciones[4]?.roiAnual || 0).toFixed(1)}% Anual
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {renderPageFooter(1, 11)}
            </div>

            {/* HOJA 2: CONFIGURACIÓN DEL SISTEMA */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader("2. CONFIGURACIÓN DEL SISTEMA / ESPECIFICACIONES TÉCNICAS", "Listado físico nominal con potencias individuales calculadas al factor de carga")}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9px' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1', textAlign: 'left' }}>
                        <th style={{ padding: '6px 12px', fontWeight: 950, color: '#334155' }}>EQUIPO</th>
                        <th style={{ padding: '6px 12px', fontWeight: 950, color: '#334155', textAlign: 'center' }}>CAPACIDAD</th>
                        <th style={{ padding: '6px 12px', fontWeight: 950, color: '#334155', textAlign: 'right' }}>KW INSTALADOS</th>
                        <th style={{ padding: '6px 12px', fontWeight: 950, color: '#334155', textAlign: 'right' }}>CARGA ACTIVA ({inputs.averageLoadFactor}%)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 12px', fontWeight: 800, color: '#0f172a' }}>Desbobinador de Carretes (De-spooler)</td>
                        <td style={{ padding: '6px 12px', textAlign: 'center', color: '#64748b' }}>-</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700 }}>2.20 kW</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', color: '#0d9488', fontWeight: 700 }}>1.87 kW</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        <td style={{ padding: '6px 12px', fontWeight: 800, color: '#0f172a' }}>Cortadora / Peladora (Pre-cut)</td>
                        <td style={{ padding: '6px 12px', textAlign: 'center', color: '#64748b' }}>-</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700 }}>1.50 kW</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', color: '#0d9488', fontWeight: 700 }}>1.28 kW</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '6px 12px', fontWeight: 800, color: '#0f172a' }}>Granulador de Cuchillas Principal (Granulator)</td>
                        <td style={{ padding: '6px 12px', textAlign: 'center', color: '#0f172a', fontWeight: 700 }}>500 kg/h</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700 }}>15.00 kW</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', color: '#0d9488', fontWeight: 700 }}>12.75 kW</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                        <td style={{ padding: '6px 12px', fontWeight: 800, color: '#0f172a' }}>Mesa Densimétrica Separadora (Gravity Separator)</td>
                        <td style={{ padding: '6px 12px', textAlign: 'center', color: '#64748b' }}>-</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700 }}>3.00 kW</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', color: '#0d9488', fontWeight: 700 }}>2.55 kW</td>
                      </tr>
                      <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                        <td style={{ padding: '6px 12px', fontWeight: 800, color: '#0f172a' }}>Prensa Briqueteadora de Polvo (Briquette Press)</td>
                        <td style={{ padding: '6px 12px', textAlign: 'center', color: '#64748b' }}>-</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 700 }}>5.50 kW</td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', color: '#0d9488', fontWeight: 700 }}>4.68 kW</td>
                      </tr>
                      <tr style={{ background: '#f0fdfa', fontWeight: 900 }}>
                        <td style={{ padding: '8px 12px', color: '#0f172a' }}>Total Sistema de Recuperación MOLEX</td>
                        <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>-</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right' }}>27.20 kW</td>
                        <td style={{ padding: '8px 12px', textAlign: 'right', color: '#0d9488' }}>23.12 kW</td>
                      </tr>
                    </tbody>
                  </table>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '8px 12px', fontSize: '9px', color: '#475569' }}>
                    <strong>Nota del Ingeniero:</strong> Los componentes han sido calibrados mecánicamente para un voltaje nominal de {inputs.voltage}V adaptado a los requerimientos eléctricos del sitio, con una carga activa basada en un factor de reducción (carga) del {inputs.averageLoadFactor}% y OEE del 90%.
                  </div>

                  <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px 18px' }}>
                    <div style={{ fontSize: '9px', fontWeight: 950, color: '#334155', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Distribución de Potencia Instalada por Equipo (kW)
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '9px' }}>
                        <span style={{ width: '220px', fontWeight: 800, color: '#475569' }}>Desbobinador</span>
                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', margin: '0 12px' }}>
                          <div style={{ width: `${(2.20 / 27.20) * 100}%`, height: '100%', background: '#00b0b9' }} />
                        </div>
                        <span style={{ width: '50px', textAlign: 'right', fontWeight: 900 }}>2.20 kW</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '9px' }}>
                        <span style={{ width: '220px', fontWeight: 800, color: '#475569' }}>Cortadora / Peladora</span>
                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', margin: '0 12px' }}>
                          <div style={{ width: `${(1.50 / 27.20) * 100}%`, height: '100%', background: '#00b0b9' }} />
                        </div>
                        <span style={{ width: '50px', textAlign: 'right', fontWeight: 900 }}>1.50 kW</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '9px' }}>
                        <span style={{ width: '220px', fontWeight: 800, color: '#475569' }}>Granulador Principal</span>
                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', margin: '0 12px' }}>
                          <div style={{ width: `${(15.00 / 27.20) * 100}%`, height: '100%', background: '#00b0b9' }} />
                        </div>
                        <span style={{ width: '50px', textAlign: 'right', fontWeight: 900 }}>15.00 kW</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '9px' }}>
                        <span style={{ width: '220px', fontWeight: 800, color: '#475569' }}>Mesa Densimétrica</span>
                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', margin: '0 12px' }}>
                          <div style={{ width: `${(3.00 / 27.20) * 100}%`, height: '100%', background: '#00b0b9' }} />
                        </div>
                        <span style={{ width: '50px', textAlign: 'right', fontWeight: 900 }}>3.00 kW</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', fontSize: '9px' }}>
                        <span style={{ width: '220px', fontWeight: 800, color: '#475569' }}>Prensa Briqueteadora</span>
                        <div style={{ flex: 1, height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', margin: '0 12px' }}>
                          <div style={{ width: `${(5.50 / 27.20) * 100}%`, height: '100%', background: '#00b0b9' }} />
                        </div>
                        <span style={{ width: '50px', textAlign: 'right', fontWeight: 900 }}>5.50 kW</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ background: '#f0fdfa', border: '1px solid #ccfbf1', borderRadius: '12px', padding: '10px 15px', fontSize: '9px' }}>
                    <div style={{ color: '#0d9488', fontWeight: 950, textTransform: 'uppercase', marginBottom: '4px' }}>Dictamen Técnico Automático</div>
                    <ul style={{ margin: 0, paddingLeft: '16px', listStyleType: 'disc', color: '#475569', fontWeight: 700 }}>
                      <li>Riesgo controlado de saturación. La utilización proyectada de potencia es estable bajo tensión nominal de {inputs.voltage}V.</li>
                      <li>La cobertura del lote actual es óptima, logrando recuperar {calculations.recTotalPct.toFixed(2)}% del material de entrada.</li>
                    </ul>
                  </div>
                </div>
              </div>
              {renderPageFooter(2, 11)}
            </div>

            {/* HOJA 3: FLUJO DEL PROCESO */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader("3. FICHA TÉCNICA Y COMPONENTES / FLUJO DEL PROCESO", "Esquema secuencial de la línea de separación y granulación de cables")}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: '16px', padding: '4px 10px' }}>
                  
                  {/* Title Area */}
                  <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '22px', fontWeight: 950, color: '#1e3a8a', textTransform: 'uppercase', margin: 0, letterSpacing: '0.5px' }}>Flujo de Trabajo</h2>
                    <h3 style={{ fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', margin: '4px 0 0 0', letterSpacing: '0.5px' }}>Proceso Integrado de Reciclaje de Cobre</h3>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '10px' }}>
                      <div style={{ width: '28px', height: '3px', background: '#00b0b9' }} />
                      <div style={{ width: '28px', height: '3px', background: '#3b82f6' }} />
                      <div style={{ width: '28px', height: '3px', background: '#f97316' }} />
                      <div style={{ width: '28px', height: '3px', background: '#a855f7' }} />
                      <div style={{ width: '28px', height: '3px', background: '#22c55e' }} />
                      <div style={{ width: '28px', height: '3px', background: '#ef4444' }} />
                    </div>
                  </div>

                  {/* Cards Area */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
                    {[
                      { id: '01', title: 'Alimentación', code: 'FEED_01', color: '#00b0b9', desc: 'Carga continua y desbobinado de cables de cobre hacia la peladora.', footer: 'BOBINA: ACTIVA' },
                      { id: '02', title: 'Pre-Corte', code: 'INLET_02', color: '#3b82f6', desc: 'Peladora mecánica y cortadora longitudinal para reducir el tamaño inicial.', footer: 'CORTE: ACTIVO' },
                      { id: '03', title: 'Granulación', code: 'SHRED_03', color: '#f97316', desc: 'Granulador de cuchillas rotativas que pulveriza el cable a partículas uniformes.', footer: 'MEDIDA: 3-5 MM' },
                      { id: '04', title: 'Separación', code: 'SEP_04', color: '#a855f7', desc: 'Separación neumática y densimétrica por vibración de alta frecuencia para separar cobre del aislante.', footer: `EFICIENCIA: ${calculations.recTotalPct.toFixed(2)}%` },
                      { id: '05', title: 'Almacenamiento', code: 'STORE_05', color: '#22c55e', desc: 'Almacenamiento temporal y controlado del cobre granulado para su manejo y clasificación final.', footer: 'RESGUARDO: SEGURO' },
                      { id: '06', title: 'Cobre Granulado', code: 'OUTPUT_06', color: '#ef4444', desc: 'Obtención y almacenamiento separado de cobre granulado, clasificado en cobre puro y cobre estañado listo para comercializar.', footer: 'SALIDA: 2 FRACCIONES' }
                    ].map((step, idx) => (
                      <React.Fragment key={step.id}>
                        {/* Card */}
                        <div style={{ 
                          flex: 1, 
                          background: '#ffffff', 
                          border: `1.5px solid ${step.color}30`, 
                          borderTop: `4.5px solid ${step.color}`, 
                          borderRadius: '12px', 
                          padding: '12px 10px', 
                          display: 'flex', 
                          flexDirection: 'column', 
                          alignItems: 'center',
                          textAlign: 'center',
                          position: 'relative',
                          height: '180px',
                          boxShadow: '0 4px 10px rgba(0,0,0,0.03)'
                        }}>
                          {/* Top circle */}
                          <div style={{
                            width: '24px', height: '24px', borderRadius: '50%', background: step.color, color: '#fff', fontSize: '10px', fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px'
                          }}>
                            {step.id}
                          </div>
                          
                          <h4 style={{ fontSize: '10px', fontWeight: 900, color: step.color, margin: 0, textTransform: 'uppercase' }}>{step.title}</h4>
                          <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', marginBottom: '8px' }}>{step.code}</span>
                          
                          <p style={{ fontSize: '8px', color: '#475569', lineHeight: '1.4', flex: 1, margin: 0 }}>
                            {step.desc}
                          </p>
                          
                          <div style={{ width: '100%', borderTop: `1px solid ${step.color}20`, paddingTop: '8px', fontSize: '8px', fontWeight: 900, color: step.color, textTransform: 'uppercase', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            {step.footer}
                          </div>
                        </div>

                        {/* Arrow */}
                        {idx < 5 && (
                          <div style={{ color: '#94a3b8', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 2px' }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                          </div>
                        )}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* Timeline Below Cards */}
                  <div style={{ position: 'relative', marginTop: '6px', padding: '0 10px' }}>
                    <div style={{ position: 'absolute', left: '46px', right: '46px', top: '5px', height: '1.5px', background: '#cbd5e1', zIndex: 0 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', position: 'relative', zIndex: 1 }}>
                      {[
                        { color: '#00b0b9', title: 'Entrada Continua', desc: 'Alimentación automática desde bobina' },
                        { color: '#3b82f6', title: 'Preparación', desc: 'Reducción de tamaño para proceso eficiente' },
                        { color: '#f97316', title: 'Granulación', desc: 'Partículas uniformes de 3 a 5 mm' },
                        { color: '#a855f7', title: 'Separación Avanzada', desc: 'Tecnología neumática y vibración de alta frecuencia' },
                        { color: '#22c55e', title: 'Almacenamiento', desc: 'Resguardo ordenado del material granulado' },
                        { color: '#ef4444', title: 'Clasificación Final', desc: 'Separado en cobre puro y cobre estañado' }
                      ].map((tl, i) => (
                        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '15%', textAlign: 'center' }}>
                          <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: tl.color, border: '2px solid #fff', boxShadow: '0 0 0 1.5px #cbd5e1' }} />
                          <span style={{ fontSize: '8.5px', fontWeight: 900, color: tl.color, marginTop: '8px' }}>{tl.title}</span>
                          <span style={{ fontSize: '7.5px', fontWeight: 600, color: '#64748b', marginTop: '2px', lineHeight: '1.2' }}>{tl.desc}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Bottom Feature Boxes */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', marginTop: '6px' }}>
                    {[
                      { 
                        title: 'PROCESO AUTOMATIZADO', 
                        desc: 'Sistema continuo con control automatizado en cada etapa', 
                        icon: (
                          <g>
                            <circle cx="12" cy="12" r="9" stroke="#0ea5e9" strokeWidth="2" fill="none"/>
                            <circle cx="12" cy="12" r="3" stroke="#0ea5e9" strokeWidth="2" fill="none"/>
                            <line x1="12" y1="2" x2="12" y2="6" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="12" y1="18" x2="12" y2="22" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="2" y1="12" x2="6" y2="12" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
                            <line x1="18" y1="12" x2="22" y2="12" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round"/>
                          </g>
                        ) 
                      },
                      { 
                        title: 'ALTA EFICIENCIA', 
                        desc: `${calculations.recTotalPct.toFixed(2)}% de eficiencia en separación de cobre`, 
                        icon: (
                          <g>
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#3b82f6" strokeWidth="2" fill="none"/>
                            <path d="m9 12 2 2 4-4" stroke="#3b82f6" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </g>
                        ) 
                      },
                      { 
                        title: 'SOSTENIBLE', 
                        desc: 'Tecnología limpia que cuida el medio ambiente', 
                        icon: (
                          <g>
                            <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 22 12 12" stroke="#22c55e" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                          </g>
                        ) 
                      },
                      { 
                        title: 'RENTABLE', 
                        desc: 'Maximización del valor comercial del cobre', 
                        icon: (
                          <g>
                            <rect x="18" y="4" width="4" height="16" rx="1" fill="#ef4444"/>
                            <rect x="11" y="10" width="4" height="10" rx="1" fill="#ef4444"/>
                            <rect x="4" y="14" width="4" height="6" rx="1" fill="#ef4444"/>
                            <path d="M2 22h20" stroke="#ef4444" strokeWidth="2" strokeLinecap="round"/>
                          </g>
                        ) 
                      }
                    ].map((box, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 8px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
                          {box.icon}
                        </svg>
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontSize: '8.5px', fontWeight: 900, color: '#1e293b' }}>{box.title}</span>
                          <span style={{ fontSize: '7.5px', color: '#64748b', lineHeight: '1.2' }}>{box.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                </div>
              </div>
              {renderPageFooter(3, 11)}
            </div>

            {/* HOJA 4: GEMELO DIGITAL 3D - VISTA ISOMÉTRICA */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader("4. GEMELO DIGITAL 3D / VISTA ISOMÉTRICA DE LA PLANTA", "Distribución isométrica tridimensional de la maquinaria")}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090a0f', borderRadius: 16, overflow: 'hidden', border: '1px solid #1e293b', position: 'relative', height: '400px', margin: 'auto 0' }}>
                  {twinSnapshotIsometrica ? (
                    <img src={twinSnapshotIsometrica} alt="Vista Isométrica" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : twinSnapshot ? (
                    <img src={twinSnapshot} alt="Vista Isométrica" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>
                      Sin captura isométrica del Twin Digital.
                    </div>
                  )}
                </div>
              </div>
              {renderPageFooter(4, 11)}
            </div>

            {/* HOJA 5: GEMELO DIGITAL 3D - VISTA LATERAL */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader("5. GEMELO DIGITAL 3D / VISTA LATERAL DE LA PLANTA", "Distribución lateral tridimensional de la maquinaria")}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090a0f', borderRadius: 16, overflow: 'hidden', border: '1px solid #1e293b', position: 'relative', height: '400px', margin: 'auto 0' }}>
                  {twinSnapshotLateral ? (
                    <img src={twinSnapshotLateral} alt="Vista Lateral" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>
                      Sin captura lateral del Twin Digital.
                    </div>
                  )}
                </div>
              </div>
              {renderPageFooter(5, 11)}
            </div>

            {/* HOJA 6: GEMELO DIGITAL 3D - VISTA SUPERIOR */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader("6. GEMELO DIGITAL 3D / VISTA SUPERIOR (LAYOUT DE PLANTA)", "Distribución superior tridimensional de la maquinaria")}
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090a0f', borderRadius: 16, overflow: 'hidden', border: '1px solid #1e293b', position: 'relative', height: '400px', margin: 'auto 0' }}>
                  {twinSnapshotSuperior ? (
                    <img src={twinSnapshotSuperior} alt="Vista Superior" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ color: '#64748b', fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', textAlign: 'center' }}>
                      Sin captura superior del Twin Digital.
                    </div>
                  )}
                </div>
              </div>
              {renderPageFooter(6, 11)}
            </div>

            {/* HOJA 7: ESTRUCTURA DE CAPEX / OPEX */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader("7. ESTRUCTURA DE CAPEX / OPEX", "Distribución de inversión inicial y costos operativos proyectados")}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  
                  {/* CAPEX CARD */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '560px',
                    boxSizing: 'border-box'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#008299',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: '#1e293b', letterSpacing: '0.2px' }}>
                          ESTRUCTURA DE INVERSIÓN INICIAL (CAPEX)
                        </span>
                        <div style={{ width: '45px', height: '3px', background: '#008299', marginTop: '4px', borderRadius: '1.5px' }} />
                      </div>
                    </div>

                    {/* Table */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '6px', fontSize: '9px', fontWeight: 800, color: '#008299' }}>
                        <span>Concepto</span>
                        <span>Monto (MXN)</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Row 1 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '6px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008299' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                              </svg>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 600, color: '#334155' }}>Adquisición de Maquinaria (MOLEX)</span>
                          </div>
                          <span style={{ fontSize: '9.5px', fontWeight: 850, color: '#1e293b' }}>{money(inputs.machinePurchaseUsd * inputs.exchangeRate)}</span>
                        </div>

                        {/* Row 2 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '6px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008299' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 2v6M9 2v4M15 2v4M6 8h12v4a6 6 0 0 1-6 6v4" />
                              </svg>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 600, color: '#334155' }}>Instalación e Integración Eléctrica</span>
                          </div>
                          <span style={{ fontSize: '9.5px', fontWeight: 850, color: '#1e293b' }}>{money(inputs.installationCostUsd * inputs.exchangeRate)}</span>
                        </div>

                        {/* Row 3 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#008299' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <rect x="3" y="3" width="18" height="18" rx="2" />
                                <path d="M3 9h18M3 15h18M9 9v6M15 15v6" />
                              </svg>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 600, color: '#334155' }}>Obra Civil y Cimentación</span>
                          </div>
                          <span style={{ fontSize: '9.5px', fontWeight: 850, color: '#1e293b' }}>{money(inputs.civilWorksUsd * inputs.exchangeRate)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Total Box */}
                    <div style={{
                      background: '#f0fdfa',
                      border: '1.5px solid #ccfbf1',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#008299', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="4" y="2" width="16" height="20" rx="2" />
                            <line x1="8" y1="6" x2="16" y2="6" />
                            <line x1="16" y1="14" x2="16" y2="18" />
                            <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
                          </svg>
                        </div>
                        <span style={{ fontSize: '9.5px', fontWeight: 900, color: '#008299' }}>CAPEX Total Estimado (MXN)</span>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 950, color: '#008299' }}>{money(calculations.capexTotalMxn)}</span>
                    </div>

                    {/* Charts Container */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '10px', marginTop: '10px', flex: 1, alignItems: 'center' }}>
                      {/* Doughnut Chart */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '12px', padding: '6px', height: '135px', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: '8px', fontWeight: 900, color: '#475569', marginBottom: '4px' }}>Distribución del CAPEX</span>
                        <div style={{ position: 'relative', width: '85px', height: '85px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {(() => {
                            const total = calculations.capexTotalMxn || 1;
                            const pMaq = ((inputs.machinePurchaseUsd * inputs.exchangeRate) / total) * 100;
                            const pInst = ((inputs.installationCostUsd * inputs.exchangeRate) / total) * 100;
                            const pCivil = ((inputs.civilWorksUsd * inputs.exchangeRate) / total) * 100;
                            return (
                              <>
                                {makeDoughnutSVG([pMaq, pInst, pCivil], ['#008299', '#0d9488', '#0f766e'])}
                                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', borderRadius: '50%', background: '#ffffff', boxShadow: 'inset 0 0 5px rgba(0,0,0,0.05)' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#008299" strokeWidth="2.5">
                                    <line x1="18" y1="20" x2="18" y2="10" />
                                    <line x1="12" y1="20" x2="12" y2="4" />
                                    <line x1="6" y1="20" x2="6" y2="14" />
                                  </svg>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Horizontal Bar Chart */}
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#f8fafc', borderRadius: '12px', padding: '8px', height: '135px', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: '8px', fontWeight: 900, color: '#475569', marginBottom: '8px', textAlign: 'center' }}>Comparativo de Componentes (CAPEX)</span>
                        
                        {(() => {
                          const total = calculations.capexTotalMxn || 1;
                          const vMaq = inputs.machinePurchaseUsd * inputs.exchangeRate;
                          const vInst = inputs.installationCostUsd * inputs.exchangeRate;
                          const vCivil = inputs.civilWorksUsd * inputs.exchangeRate;
                          
                          const maxVal = Math.max(vMaq, vInst, vCivil, 1);
                          
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#64748b', width: '42px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Maquinaria</span>
                                <div style={{ flex: 1, height: '10px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                                  <div style={{ width: `${(vMaq / maxVal) * 100}%`, background: '#008299' }} />
                                </div>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#334155', width: '38px' }}>{moneyShort(vMaq)}</span>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#64748b', width: '42px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Instalación</span>
                                <div style={{ flex: 1, height: '10px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                                  <div style={{ width: `${(vInst / maxVal) * 100}%`, background: '#0d9488' }} />
                                </div>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#334155', width: '38px' }}>{moneyShort(vInst)}</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#64748b', width: '42px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Obra Civil</span>
                                <div style={{ flex: 1, height: '10px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                                  <div style={{ width: `${(vCivil / maxVal) * 100}%`, background: '#0f766e' }} />
                                </div>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#334155', width: '38px' }}>{moneyShort(vCivil)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Bottom Summary Box */}
                    {(() => {
                      const total = calculations.capexTotalMxn || 1;
                      const pMaq = ((inputs.machinePurchaseUsd * inputs.exchangeRate) / total) * 100;
                      return (
                        <div style={{
                          background: '#ecfeff',
                          border: '1px solid #a5f3fc',
                          borderRadius: '12px',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '6px'
                        }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#008299',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10" />
                              <circle cx="12" cy="12" r="6" />
                              <circle cx="12" cy="12" r="2" />
                            </svg>
                          </div>
                          <span style={{ fontSize: '8px', fontWeight: 700, color: '#0f766e', lineHeight: '1.2' }}>
                            La inversión inicial se concentra principalmente en maquinaria ({pMaq.toFixed(0)}%), asegurando la capacidad productiva del proyecto.
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* OPEX CARD */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '560px',
                    boxSizing: 'border-box'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#be185d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: '#1e293b', letterSpacing: '0.2px' }}>
                          GASTO OPERATIVO MENSUAL (OPEX)
                        </span>
                        <div style={{ width: '45px', height: '3px', background: '#be185d', marginTop: '4px', borderRadius: '1.5px' }} />
                      </div>
                    </div>

                    {/* Table */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '6px', fontSize: '9px', fontWeight: 800, color: '#be185d' }}>
                        <span>Concepto</span>
                        <span>Monto (MXN)</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Row 1 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '5px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be185d' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                              </svg>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 600, color: '#334155' }}>Mano de Obra Directa</span>
                          </div>
                          <span style={{ fontSize: '9.5px', fontWeight: 850, color: '#1e293b' }}>{money(calculations.laborMonthlyMxn)}</span>
                        </div>

                        {/* Row 2 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '5px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be185d' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                              </svg>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 600, color: '#334155' }}>Mantenimiento Periódico</span>
                          </div>
                          <span style={{ fontSize: '9.5px', fontWeight: 850, color: '#1e293b' }}>{money(calculations.maintenanceMonthlyMxn)}</span>
                        </div>

                        {/* Row 3 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '5px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be185d' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                              </svg>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 600, color: '#334155' }}>Consumibles y Cuchillas</span>
                          </div>
                          <span style={{ fontSize: '9.5px', fontWeight: 850, color: '#1e293b' }}>{money(calculations.consumablesMonthlyMxn)}</span>
                        </div>

                        {/* Row 4 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be185d' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                              </svg>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 600, color: '#334155' }}>Costo Eléctrico (Escenario x{inputs.multiplicadorActivo})</span>
                          </div>
                          <span style={{ fontSize: '9.5px', fontWeight: 850, color: '#1e293b' }}>{money(activeProjection.energiaMesMxn)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Total Box */}
                    <div style={{
                      background: '#fff1f2',
                      border: '1.5px solid #ffe4e6',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#be185d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="4" y="2" width="16" height="20" rx="2" />
                            <line x1="8" y1="6" x2="16" y2="6" />
                            <line x1="16" y1="14" x2="16" y2="18" />
                            <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
                          </svg>
                        </div>
                        <span style={{ fontSize: '9.5px', fontWeight: 900, color: '#be185d' }}>OPEX Total Mensual (MXN)</span>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 950, color: '#be185d' }}>{money(activeProjection.opexTotalMesMxn)}</span>
                    </div>

                    {/* Charts Container */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '10px', marginTop: '10px', flex: 1, alignItems: 'center' }}>
                      {/* Doughnut Chart */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '12px', padding: '6px', height: '135px', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: '8px', fontWeight: 900, color: '#475569', marginBottom: '4px' }}>Distribución del CAPEX</span>
                        <div style={{ position: 'relative', width: '85px', height: '85px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {(() => {
                            const total = calculations.capexTotalMxn || 1;
                            const vMaq = inputs.machinePurchaseUsd * inputs.exchangeRate;
                            const vInst = inputs.installationCostUsd * inputs.exchangeRate;
                            const vCivil = inputs.civilWorksUsd * inputs.exchangeRate;
                            const pMaq = isNaN(vMaq / total) ? 0 : (vMaq / total) * 100;
                            const pInst = isNaN(vInst / total) ? 0 : (vInst / total) * 100;
                            const pCivil = isNaN(vCivil / total) ? 0 : (vCivil / total) * 100;
                            return (
                              <>
                                {makeDoughnutSVG([pMaq, pInst, pCivil], ['#008299', '#0d9488', '#0f766e'])}
                                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', borderRadius: '50%', background: '#ffffff', boxShadow: 'inset 0 0 5px rgba(0,0,0,0.05)' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#008299" strokeWidth="2.5">
                                    <line x1="18" y1="20" x2="18" y2="10" />
                                    <line x1="12" y1="20" x2="12" y2="4" />
                                    <line x1="6" y1="20" x2="6" y2="14" />
                                  </svg>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Horizontal Bar Chart */}
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#f8fafc', borderRadius: '12px', padding: '8px', height: '135px', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: '8px', fontWeight: 900, color: '#475569', marginBottom: '8px', textAlign: 'center' }}>Comparativo de Componentes (CAPEX)</span>
                        
                        {(() => {
                          const total = calculations.capexTotalMxn || 1;
                          const vMaq = inputs.machinePurchaseUsd * inputs.exchangeRate;
                          const vInst = inputs.installationCostUsd * inputs.exchangeRate;
                          const vCivil = inputs.civilWorksUsd * inputs.exchangeRate;
                          
                          const maxVal = Math.max(vMaq, vInst, vCivil, 1);
                          
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#64748b', width: '42px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Maquinaria</span>
                                <div style={{ flex: 1, height: '10px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                                  <div style={{ width: `${(vMaq / maxVal) * 100}%`, background: '#008299' }} />
                                </div>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#334155', width: '38px' }}>{moneyShort(vMaq)}</span>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#64748b', width: '42px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Instalación</span>
                                <div style={{ flex: 1, height: '10px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                                  <div style={{ width: `${(vInst / maxVal) * 100}%`, background: '#0d9488' }} />
                                </div>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#334155', width: '38px' }}>{moneyShort(vInst)}</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#64748b', width: '42px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Obra Civil</span>
                                <div style={{ flex: 1, height: '10px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', display: 'flex' }}>
                                  <div style={{ width: `${(vCivil / maxVal) * 100}%`, background: '#0f766e' }} />
                                </div>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#334155', width: '38px' }}>{moneyShort(vCivil)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Bottom Summary Box */}
                    {(() => {
                      const total = calculations.capexTotalMxn || 1;
                      const vMaq = inputs.machinePurchaseUsd * inputs.exchangeRate;
                      const pMaq = isNaN(vMaq / total) ? 0 : (vMaq / total) * 100;
                      return (
                        <div style={{
                          background: '#ecfeff',
                          border: '1px solid #a5f3fc',
                          borderRadius: '12px',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '6px'
                        }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#008299',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10" />
                              <circle cx="12" cy="12" r="6" />
                              <circle cx="12" cy="12" r="2" />
                            </svg>
                          </div>
                          <span style={{ fontSize: '8px', fontWeight: 700, color: '#0f766e', lineHeight: '1.2' }}>
                            La inversión inicial se concentra principalmente en maquinaria ({pMaq.toFixed(0)}%), asegurando la capacidad productiva del proyecto.
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* OPEX CARD */}
                  <div style={{
                    background: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: '20px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    height: '560px',
                    boxSizing: 'border-box'
                  }}>
                    {/* Header */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#be185d',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <polyline points="12 6 12 12 16 14" />
                        </svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '11px', fontWeight: 900, color: '#1e293b', letterSpacing: '0.2px' }}>
                          GASTO OPERATIVO MENSUAL (OPEX)
                        </span>
                        <div style={{ width: '45px', height: '3px', background: '#be185d', marginTop: '4px', borderRadius: '1.5px' }} />
                      </div>
                    </div>

                    {/* Table */}
                    <div style={{ marginTop: '12px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1.5px solid #f1f5f9', paddingBottom: '6px', fontSize: '9px', fontWeight: 800, color: '#be185d' }}>
                        <span>Concepto</span>
                        <span>Monto (MXN)</span>
                      </div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {/* Row 1 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '5px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be185d' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                              </svg>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 600, color: '#334155' }}>Mano de Obra Directa</span>
                          </div>
                          <span style={{ fontSize: '9.5px', fontWeight: 850, color: '#1e293b' }}>{money(calculations.laborMonthlyMxn)}</span>
                        </div>

                        {/* Row 2 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '5px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be185d' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                              </svg>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 600, color: '#334155' }}>Mantenimiento Periódico</span>
                          </div>
                          <span style={{ fontSize: '9.5px', fontWeight: 850, color: '#1e293b' }}>{money(calculations.maintenanceMonthlyMxn)}</span>
                        </div>

                        {/* Row 3 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #f1f5f9', padding: '5px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be185d' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                              </svg>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 600, color: '#334155' }}>Consumibles y Cuchillas</span>
                          </div>
                          <span style={{ fontSize: '9.5px', fontWeight: 850, color: '#1e293b' }}>{money(calculations.consumablesMonthlyMxn)}</span>
                        </div>

                        {/* Row 4 */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: '#fdf2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#be185d' }}>
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                              </svg>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 600, color: '#334155' }}>Costo Eléctrico (Escenario x{inputs.multiplicadorActivo})</span>
                          </div>
                          <span style={{ fontSize: '9.5px', fontWeight: 850, color: '#1e293b' }}>{money(activeProjection.energiaMesMxn)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Total Box */}
                    <div style={{
                      background: '#fff1f2',
                      border: '1.5px solid #ffe4e6',
                      borderRadius: '12px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginTop: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#be185d', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff' }}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="4" y="2" width="16" height="20" rx="2" />
                            <line x1="8" y1="6" x2="16" y2="6" />
                            <line x1="16" y1="14" x2="16" y2="18" />
                            <path d="M16 10h.01M12 10h.01M8 10h.01M12 14h.01M8 14h.01M12 18h.01M8 18h.01" />
                          </svg>
                        </div>
                        <span style={{ fontSize: '9.5px', fontWeight: 900, color: '#be185d' }}>OPEX Total Mensual (MXN)</span>
                      </div>
                      <span style={{ fontSize: '14px', fontWeight: 950, color: '#be185d' }}>{money(activeProjection.opexTotalMesMxn)}</span>
                    </div>

                    {/* Charts Container */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.15fr', gap: '10px', marginTop: '10px', flex: 1, alignItems: 'center' }}>
                      {/* Doughnut Chart */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#f8fafc', borderRadius: '12px', padding: '6px', height: '135px', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: '8px', fontWeight: 900, color: '#475569', marginBottom: '4px' }}>Distribución del OPEX</span>
                        <div style={{ position: 'relative', width: '85px', height: '85px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {(() => {
                            const total = activeProjection.opexTotalMesMxn || 1;
                            const vLabor = calculations.laborMonthlyMxn;
                            const vMtto = calculations.maintenanceMonthlyMxn;
                            const vCons = calculations.consumablesMonthlyMxn;
                            const vEner = activeProjection.energiaMesMxn;
                            const pLabor = isNaN(vLabor / total) ? 0 : (vLabor / total) * 100;
                            const pMtto = isNaN(vMtto / total) ? 0 : (vMtto / total) * 100;
                            const pCons = isNaN(vCons / total) ? 0 : (vCons / total) * 100;
                            const pEner = isNaN(vEner / total) ? 0 : (vEner / total) * 100;
                            return (
                              <>
                                {makeDoughnutSVG([pLabor, pMtto, pCons, pEner], ['#9d174d', '#c2185b', '#e91e63', '#f48fb1'])}
                                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '45px', height: '45px', borderRadius: '50%', background: '#ffffff', boxShadow: 'inset 0 0 5px rgba(0,0,0,0.05)' }}>
                                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#be185d" strokeWidth="2.5">
                                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                                    <path d="M9 12l2 2 4-4" />
                                  </svg>
                                </div>
                              </>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Horizontal Bar Chart */}
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', background: '#f8fafc', borderRadius: '12px', padding: '8px', height: '135px', boxSizing: 'border-box' }}>
                        <span style={{ fontSize: '8px', fontWeight: 900, color: '#475569', marginBottom: '8px', textAlign: 'center' }}>Comparativo de Componentes (OPEX)</span>
                        
                        {(() => {
                          const total = activeProjection.opexTotalMesMxn || 1;
                          const vLabor = calculations.laborMonthlyMxn;
                          const vMtto = calculations.maintenanceMonthlyMxn;
                          const vCons = calculations.consumablesMonthlyMxn;
                          const vEner = activeProjection.energiaMesMxn;
                          
                          const maxVal = Math.max(vLabor, vMtto, vCons, vEner, 1);
                          
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#64748b', width: '42px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Nómina</span>
                                <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '2.5px', overflow: 'hidden', display: 'flex' }}>
                                  <div style={{ width: `${(vLabor / maxVal) * 100}%`, background: '#9d174d' }} />
                                </div>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#334155', width: '38px' }}>{moneyShort(vLabor)}</span>
                              </div>
                              
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#64748b', width: '42px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Mtto</span>
                                <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '2.5px', overflow: 'hidden', display: 'flex' }}>
                                  <div style={{ width: `${(vMtto / maxVal) * 100}%`, background: '#c2185b' }} />
                                </div>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#334155', width: '38px' }}>{moneyShort(vMtto)}</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#64748b', width: '42px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Consumibles</span>
                                <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '2.5px', overflow: 'hidden', display: 'flex' }}>
                                  <div style={{ width: `${(vCons / maxVal) * 100}%`, background: '#e91e63' }} />
                                </div>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#334155', width: '38px' }}>{moneyShort(vCons)}</span>
                              </div>

                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#64748b', width: '42px', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Energía</span>
                                <div style={{ flex: 1, height: '8px', background: '#e2e8f0', borderRadius: '2.5px', overflow: 'hidden', display: 'flex' }}>
                                  <div style={{ width: `${(vEner / maxVal) * 100}%`, background: '#f48fb1' }} />
                                </div>
                                <span style={{ fontSize: '7.5px', fontWeight: 800, color: '#334155', width: '38px' }}>{moneyShort(vEner)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Bottom Summary Box */}
                    {(() => {
                      const total = activeProjection.opexTotalMesMxn || 1;
                      const vLabor = calculations.laborMonthlyMxn;
                      const vMtto = calculations.maintenanceMonthlyMxn;
                      const vCons = calculations.consumablesMonthlyMxn;
                      const vEner = activeProjection.energiaMesMxn;
                      const pLabor = isNaN(vLabor / total) ? 0 : (vLabor / total) * 100;
                      const pMtto = isNaN(vMtto / total) ? 0 : (vMtto / total) * 100;
                      const pCons = isNaN(vCons / total) ? 0 : (vCons / total) * 100;
                      const pEner = isNaN(vEner / total) ? 0 : (vEner / total) * 100;
                      return (
                        <div style={{
                          background: '#fff1f2',
                          border: '1px solid #ffe4e6',
                          borderRadius: '12px',
                          padding: '8px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginTop: '6px'
                        }}>
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            background: '#be185d',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            flexShrink: 0
                          }}>
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                          </div>
                          <span style={{ fontSize: '8px', fontWeight: 700, color: '#9d174d', lineHeight: '1.2' }}>
                            El gasto operativo mensual se concentra en nómina ({pLabor.toFixed(0)}%), seguido de consumibles ({pCons.toFixed(0)}%) y mantenimiento ({pMtto.toFixed(0)}%). El costo de energía es {pEner.toFixed(0)}% en este escenario.
                          </span>
                        </div>
                      );
                    })()}
                  </div>

                </div>
              </div>
              {renderPageFooter(7, 11)}
            </div>

            {/* HOJA 8: REQUERIMIENTOS OPERATIVOS / ENERGÍA & CAPACIDAD */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {(() => {
                  const horasDia = Number(inputs.horasTrabajoDia) || 2.5;
                  const diasMes = Number(inputs.diasMes) || 26;
                  const rate = Number(inputs.electricityRateMxn) || 2.5;

                  const prodHoraTon = (calculations.totalCobre / (horasDia || 1)) / 1000;
                  const prodDiaTon = calculations.totalCobre / 1000;
                  const prodSemTon = (calculations.totalCobre * 6) / 1000;
                  const prodMesTon = (calculations.totalCobre * diasMes) / 1000;

                  const consHoraKwh = calculations.averageHourlyKwh;
                  const consDiaKwh = calculations.dailyKwh;
                  const consSemKwh = calculations.dailyKwh * 6;
                  const consMesKwh = calculations.monthlyKwhBase;

                  const costHoraMxn = consHoraKwh * rate;
                  const costDiaMxn = consDiaKwh * rate;
                  const costSemMxn = consSemKwh * rate;
                  const costMesMxn = calculations.monthlyEnergyCostBaseMxn;

                  const maxCost = Math.max(costHoraMxn, costDiaMxn, costSemMxn, costMesMxn, 1);
                  const barData = [
                    { label: 'Por hora', val: costHoraMxn },
                    { label: 'Por turno', val: costDiaMxn },
                    { label: 'Por semana (6 días)', val: costSemMxn },
                    { label: 'Por mes', val: costMesMxn }
                  ];

                  return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
                      
                      {/* Header */}
                      {renderPageHeader("8. REQUERIMIENTOS OPERATIVOS / ENERGÍA & CAPACIDAD", "Resumen operativo del sistema y análisis de potencia y consumo eléctrico")}

                      {/* Top KPI Cards */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '12px' }}>
                        
                        {/* KPI 1: Potencia Instalada */}
                        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#00b0b9" strokeWidth="2.5">
                              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Potencia Instalada Total</span>
                            <span style={{ fontSize: '20px', fontWeight: 950, color: '#0f172a', marginTop: '1px' }}>{inputs.installedPowerKw} kw</span>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>Tensión: {inputs.voltage} V</span>
                          </div>
                        </div>

                        {/* KPI 2: Consumo Promedio */}
                        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#e6f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Consumo Promedio Hora</span>
                            <span style={{ fontSize: '20px', fontWeight: 950, color: '#0f172a', marginTop: '1px' }}>
                              {(inputs.installedPowerKw * (inputs.averageLoadFactor / 100)).toFixed(2)} kWh
                            </span>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>Factor de carga: {inputs.averageLoadFactor}%</span>
                          </div>
                        </div>

                        {/* KPI 3: Costo Eléctrico */}
                        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '12px 18px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
                          <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <span style={{ fontSize: '18px', fontWeight: 950, color: '#10b981' }}>$</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Costo Eléctrico Hora</span>
                            <span style={{ fontSize: '20px', fontWeight: 950, color: '#0f172a', marginTop: '1px' }}>
                              {`$${Math.round(costHoraMxn).toLocaleString()} MXN`}
                            </span>
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontWeight: 700 }}>Tarifa: ${rate} MXN/kWh</span>
                          </div>
                        </div>

                      </div>

                      {/* Main Grid content */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1.15fr', gap: '20px', marginTop: '14px', flex: 1, alignItems: 'stretch' }}>
                        
                        {/* Left column: Distribución de Potencia */}
                        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '18px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 950, color: '#0b1329', textTransform: 'uppercase' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00b0b9" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                                <line x1="18" y1="20" x2="18" y2="10" />
                                <line x1="12" y1="20" x2="12" y2="4" />
                                <line x1="6" y1="20" x2="6" y2="14" />
                              </svg>
                              <span>Distribución de Potencia Instalada por Equipo (kW)</span>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                              <div style={{ display: 'flex', fontSize: '10px', fontWeight: 800, color: '#64748b', borderBottom: '1px solid #cbd5e1', paddingBottom: '4px' }}>
                                <span style={{ width: '150px' }}>EQUIPO</span>
                                <span style={{ flex: 1, textAlign: 'center' }}>POTENCIA (kW)</span>
                                <span style={{ width: '80px', textAlign: 'right' }}>% DEL TOTAL</span>
                              </div>
                              {[
                                { name: 'Desbobinador de Carretes', val: 2.2, pctVal: '8.1%' },
                                { name: 'Cortadora / Peladora', val: 1.5, pctVal: '5.5%' },
                                { name: 'Granulador de Cuchillas', val: 15.0, pctVal: '55.1%' },
                                { name: 'Mesa Densimétrica', val: 3.0, pctVal: '11.0%' },
                                { name: 'Prensa Briqueteadora', val: 5.5, pctVal: '20.2%' }
                              ].map((eq, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', fontSize: '11px', height: '24px' }}>
                                  <span style={{ width: '150px', fontWeight: 700, color: '#334155' }}>{eq.name}</span>
                                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                      <div style={{ width: `${(eq.val / 27.2) * 100}%`, height: '100%', background: '#00b0b9', borderRadius: '4px' }} />
                                    </div>
                                    <span style={{ width: '40px', fontWeight: 800, color: '#1e293b', textAlign: 'right' }}>{eq.val.toFixed(1)} kW</span>
                                  </div>
                                  <span style={{ width: '80px', textAlign: 'right', fontWeight: 700, color: '#64748b' }}>{eq.pctVal}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 900, color: '#00b0b9', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                              Resumen de Distribución
                            </span>
                            
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', border: '1.5px solid #cbd5e1', borderRadius: '12px', padding: '12px' }}>
                              <div style={{ position: 'relative', width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                {makeDoughnutSVG([55.1, 20.2, 11.0, 8.1, 5.5], ['#00b0b9', '#0891b2', '#0d9488', '#0f766e', '#14b8a6'])}
                                <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                                  <span style={{ fontSize: '14px', fontWeight: 950, color: '#0b1329' }}>{inputs.installedPowerKw}</span>
                                  <span style={{ fontSize: '8px', fontWeight: 800, color: '#64748b' }}>kW</span>
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {/* KPI 1 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#00b0b9" strokeWidth="2.5">
                                      <circle cx="12" cy="12" r="10" />
                                      <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                  </div>
                                  <span style={{ fontSize: '10.5px', color: '#475569', fontWeight: 650 }}>
                                    <strong style={{ color: '#00b0b9', fontSize: '12.5px', fontWeight: 900 }}>55.1%</strong> Concentrado en Granulador de Cuchillas
                                  </span>
                                </div>
                                {/* KPI 2 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#e6f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0891b2" strokeWidth="2.5">
                                      <line x1="18" y1="20" x2="18" y2="10" />
                                      <line x1="12" y1="20" x2="12" y2="4" />
                                      <line x1="6" y1="20" x2="6" y2="14" />
                                    </svg>
                                  </div>
                                  <span style={{ fontSize: '10.5px', color: '#475569', fontWeight: 650 }}>
                                    <strong style={{ color: '#0891b2', fontSize: '12.5px', fontWeight: 900 }}>3</strong> Equipos con más de 3 kW de potencia
                                  </span>
                                </div>
                                {/* KPI 3 */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                                    </svg>
                                  </div>
                                  <span style={{ fontSize: '10.5px', color: '#475569', fontWeight: 650 }}>
                                    <strong style={{ color: '#10b981', fontSize: '12.5px', fontWeight: 900 }}>{inputs.installedPowerKw} kW</strong> Potencia instalada total
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right column: Proyección y Costo Eléctrico Estimado */}
                        <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '16px', padding: '18px 24px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', boxSizing: 'border-box' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', fontSize: '12px', fontWeight: 950, color: '#0b1329', textTransform: 'uppercase' }}>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#00b0b9" strokeWidth="2.5" style={{ marginRight: '6px' }}>
                                <line x1="2" y1="3" x2="22" y2="3" />
                                <line x1="4" y1="8" x2="20" y2="8" />
                                <line x1="4" y1="13" x2="20" y2="13" />
                                <line x1="2" y1="18" x2="22" y2="18" />
                              </svg>
                              <span>Proyección Producción vs Consumo Eléctrico</span>
                            </div>

                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px', border: '1.5px solid #cbd5e1', borderRadius: '8px', overflow: 'hidden' }}>
                              <thead>
                                <tr style={{ background: '#0b1329', color: '#ffffff', textAlign: 'center', fontWeight: 900, fontSize: '10px' }}>
                                  <th style={{ padding: '8px 6px', borderRight: '1px solid #2e3e5c' }}>PERIODO</th>
                                  <th style={{ padding: '8px 6px', borderRight: '1px solid #2e3e5c' }}>PRODUCCIÓN (ton)</th>
                                  <th style={{ padding: '8px 6px', borderRight: '1px solid #2e3e5c' }}>CONSUMO (kWh)</th>
                                  <th style={{ padding: '8px 6px' }}>COSTO ESTIMADO (MXN)</th>
                                </tr>
                              </thead>
                              <tbody>
                                <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>
                                  <td style={{ padding: '6px 8px', fontWeight: 800, color: '#334155', borderRight: '1px solid #cbd5e1', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00b0b9" strokeWidth="2.5">
                                        <circle cx="12" cy="12" r="10" />
                                        <polyline points="12 6 12 12 16 14" />
                                      </svg>
                                      <span>Por hora</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>{prodHoraTon.toFixed(4)}</td>
                                  <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>{consHoraKwh.toFixed(2)}</td>
                                  <td style={{ padding: '6px 8px', color: '#0d9488', fontWeight: 900 }}>{`$${Math.round(costHoraMxn).toLocaleString()} MXN`}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'center', background: '#f8fafc' }}>
                                  <td style={{ padding: '6px 8px', fontWeight: 800, color: '#334155', borderRight: '1px solid #cbd5e1', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                      </svg>
                                      <span>Por turno</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>{prodDiaTon.toFixed(3)}</td>
                                  <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>{consDiaKwh.toFixed(2)}</td>
                                  <td style={{ padding: '6px 8px', color: '#0d9488', fontWeight: 900 }}>{`$${Math.round(costDiaMxn).toLocaleString()} MXN`}</td>
                                </tr>
                                <tr style={{ borderBottom: '1px solid #cbd5e1', textAlign: 'center' }}>
                                  <td style={{ padding: '6px 8px', fontWeight: 800, color: '#334155', borderRight: '1px solid #cbd5e1', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0f766e" strokeWidth="2.5">
                                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                        <line x1="16" y1="2" x2="16" y2="6" />
                                        <line x1="8" y1="2" x2="8" y2="6" />
                                        <line x1="3" y1="10" x2="21" y2="10" />
                                      </svg>
                                      <span>Por semana (6 días)</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>{prodSemTon.toFixed(3)}</td>
                                  <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>{consSemKwh.toFixed(1)}</td>
                                  <td style={{ padding: '6px 8px', color: '#0d9488', fontWeight: 900 }}>{`$${Math.round(costSemMxn).toLocaleString()} MXN`}</td>
                                </tr>
                                <tr style={{ textAlign: 'center', background: '#f8fafc' }}>
                                  <td style={{ padding: '6px 8px', fontWeight: 800, color: '#334155', borderRight: '1px solid #cbd5e1', textAlign: 'left' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#14b8a6" strokeWidth="2.5">
                                        <rect x="3" y="3" width="18" height="18" rx="2" />
                                        <line x1="9" y1="3" x2="9" y2="21" />
                                        <line x1="15" y1="3" x2="15" y2="21" />
                                        <line x1="3" y1="9" x2="21" y2="9" />
                                        <line x1="3" y1="15" x2="21" y2="15" />
                                      </svg>
                                      <span>Por mes</span>
                                    </div>
                                  </td>
                                  <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>{prodMesTon.toFixed(3)}</td>
                                  <td style={{ padding: '6px 8px', borderRight: '1px solid #cbd5e1', fontWeight: 700 }}>{consMesKwh.toFixed(1)}</td>
                                  <td style={{ padding: '6px 8px', color: '#0d9488', fontWeight: 900 }}>{`$${Math.round(costMesMxn).toLocaleString()} MXN`}</td>
                                </tr>
                              </tbody>
                            </table>
                          </div>

                          {/* Cost Bar Chart */}
                          <div style={{ background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px', padding: '12px 16px', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                            <span style={{ fontSize: '11px', fontWeight: 900, color: '#475569', textTransform: 'uppercase', marginBottom: '8px' }}>
                              Costo Eléctrico Estimado (MXN)
                            </span>
                            
                            <div style={{ display: 'flex', height: '110px', position: 'relative', borderLeft: '1.5px solid #cbd5e1', paddingLeft: '8px' }}>
                              {/* Y-Axis Grid Lines */}
                              <div style={{ position: 'absolute', left: '46px', right: 0, top: 0, bottom: 0, pointerEvents: 'none' }}>
                                {[1.0, 0.75, 0.5, 0.25, 0].map((ratio) => {
                                  const y = (1 - ratio) * 100;
                                  return (
                                    <div key={ratio} style={{
                                      position: 'absolute',
                                      left: 0,
                                      right: 0,
                                      top: `${y}%`,
                                      borderTop: '1px dashed #e2e8f0',
                                      height: 0
                                    }} />
                                  );
                                })}
                              </div>

                              {/* Y-Axis Ticks */}
                              <div style={{ width: '40px', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: '6px', boxSizing: 'border-box' }}>
                                {[1.0, 0.75, 0.5, 0.25, 0].map((ratio) => {
                                  const val = maxCost * ratio;
                                  return (
                                    <span key={ratio} style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', lineHeight: '9px' }}>
                                      {Math.round(val).toLocaleString()}
                                    </span>
                                  );
                                })}
                              </div>

                              {/* Bars Container */}
                              <div style={{ flex: 1, display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', height: '100%', zIndex: 2 }}>
                                {barData.map((b, idx) => {
                                  const barHeight = (b.val / maxCost) * 75;
                                  return (
                                    <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '70px' }}>
                                      {/* Bar Value Label */}
                                      <span style={{ fontSize: '9px', fontWeight: 900, color: '#1e293b', marginBottom: '2px', whiteSpace: 'nowrap' }}>
                                        {`$${Math.round(b.val).toLocaleString()} MXN`}
                                      </span>
                                      {/* The Bar */}
                                      <div style={{
                                        width: '18px',
                                        height: `${Math.max(barHeight, 4)}px`,
                                        background: '#00b0b9',
                                        borderRadius: '3px 3px 0 0'
                                      }} />
                                      {/* Period Label */}
                                      <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', marginTop: '4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                                        {b.label}
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>

                        </div>

                      </div>

                      {/* Bottom Insight Box */}
                      <div style={{
                        background: '#f0fdfa',
                        border: '1.5px solid #ccfbf1',
                        borderRadius: '10px',
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: '14px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1 }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#00b0b9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                              <line x1="9" y1="18" x2="15" y2="18" />
                              <line x1="10" y1="22" x2="14" y2="22" />
                            </svg>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', fontWeight: 900, color: '#0f766e', textTransform: 'uppercase', borderRight: '1.5px solid #cbd5e1', paddingRight: '8px', flexShrink: 0 }}>
                              Insight Principal
                            </span>
                            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#0f766e', lineHeight: '1.3' }}>
                              El Granulador de Cuchillas concentra la mayor parte de la potencia instalada, mientras que el costo eléctrico se mantiene controlado en la operación base.
                            </span>
                          </div>
                        </div>
                        
                        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e6f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#00b0b9" strokeWidth="2.5">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="6" />
                            <circle cx="12" cy="12" r="2" />
                          </svg>
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </div>
              {renderPageFooter(8, 11)}
            </div>

            {/* HOJA 9: SIMULACIÓN DE ESCENARIOS */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader("9. PROYECCIÓN PARAMÉTRICA / SIMULACIÓN DE ESCENARIOS", "Tabla comparativa de rendimiento y gráfica de escenarios económicos mensuales")}
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  
                  {/* Top Cards Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '14px' }}>
                    {/* Card 1: OPEX Fijo */}
                    <div style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderLeft: '4.5px solid #ef4444',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5">
                          <path d="M20 21v-8l-8-4-8 4v8h16z" />
                          <path d="M12 9v12" />
                          <path d="M8 13h2" />
                          <path d="M8 17h2" />
                          <path d="M14 13h2" />
                          <path d="M14 17h2" />
                        </svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>OPEX mensual fijo</span>
                        <span style={{ fontSize: '17.5px', fontWeight: 900, color: '#1e293b', marginTop: '1px' }}>{money(calculations.opexFixedMonthlyMxn)}</span>
                      </div>
                    </div>

                    {/* Card 2: Venta x1 */}
                    <div style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderLeft: '4.5px solid #06b6d4',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ecfeff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#06b6d4" strokeWidth="2.5">
                          <circle cx="9" cy="21" r="1" />
                          <circle cx="20" cy="21" r="1" />
                          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
                        </svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Venta mensual x1</span>
                        <span style={{ fontSize: '17.5px', fontWeight: 900, color: '#1e293b', marginTop: '1px' }}>{money(proyecciones[0].ventaMes)}</span>
                      </div>
                    </div>

                    {/* Card 3: Venta x5 */}
                    <div style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderLeft: '4.5px solid #0ea5e9',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#f0f9ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.5">
                          <line x1="18" y1="20" x2="18" y2="10" />
                          <line x1="12" y1="20" x2="12" y2="4" />
                          <line x1="6" y1="20" x2="6" y2="14" />
                        </svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Venta mensual x5</span>
                        <span style={{ fontSize: '17.5px', fontWeight: 900, color: '#1e293b', marginTop: '1px' }}>{money(proyecciones[4].ventaMes)}</span>
                      </div>
                    </div>

                    {/* Card 4: EBITDA x5 */}
                    <div style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderLeft: '4.5px solid #10b981',
                      borderRadius: '12px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                    }}>
                      <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ecfdf5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
                          <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                          <polyline points="17 6 23 6 23 12" />
                        </svg>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>EBITDA x5</span>
                        <span style={{ fontSize: '17.5px', fontWeight: 900, color: '#1e293b', marginTop: '1px' }}>{money(proyecciones[4].margenMensualMxn)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Dynamic Alert Box */}
                  {(() => {
                    const breakEvenScenario = proyecciones.find(p => p.margenMensualMxn > 0) || proyecciones[1];
                    const clearProfitScenario = proyecciones.find(p => p.margenMensualMxn > 15000) || proyecciones[2];
                    return (
                      <div style={{
                        background: '#f0f9ff',
                        border: '1px solid #bae6fd',
                        borderRadius: '10px',
                        padding: '8px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                        <span style={{ fontSize: '13.5px', fontWeight: 700, color: '#0369a1' }}>
                          Punto de equilibrio: el EBITDA se vuelve positivo a partir de <strong style={{ color: '#15803d', fontWeight: 900 }}>x{breakEvenScenario.m}</strong> y claramente rentable desde <strong style={{ color: '#15803d', fontWeight: 900 }}>x{clearProfitScenario.m}</strong>.
                        </span>
                      </div>
                    );
                  })()}

                  {/* Main Grid: Table & Chart */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.65fr', gap: '24px', flex: 1, alignItems: 'stretch' }}>
                    
                    {/* Left: Scenarios Table */}
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
                        <thead>
                          <tr style={{ background: '#0b1329', color: '#ffffff', fontSize: '12px', fontWeight: 800, textAlign: 'center' }}>
                            <th style={{ padding: '10px 6px', borderRight: '1px solid #2e3e5c' }}>Escenario</th>
                            <th style={{ padding: '10px 6px', borderRight: '1px solid #2e3e5c' }}>Producción<br/>(kg/día)</th>
                            <th style={{ padding: '10px 6px', borderRight: '1px solid #2e3e5c' }}>Cobre<br/>(kg/día)</th>
                            <th style={{ padding: '10px 6px', borderRight: '1px solid #2e3e5c' }}>Venta mensual<br/>(MXN)</th>
                            <th style={{ padding: '10px 6px' }}>EBITDA mensual<br/>(MXN)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {proyecciones.map((p) => {
                            const isTarget5x = p.m === 5;
                            const ebitda = p.margenMensualMxn;
                            const ebitdaColor = ebitda < 0 ? '#ef4444' : '#10b981';
                            const bg = isTarget5x ? '#f0fdf4' : 'transparent';
                            const fontW = isTarget5x ? 900 : 600;
                            const borderStyle = isTarget5x ? '1.5px solid #10b981' : '1px solid #e2e8f0';
                            
                            return (
                              <tr key={p.m} style={{
                                background: bg,
                                borderBottom: borderStyle,
                                fontSize: '13px',
                                fontWeight: fontW,
                                color: '#334155',
                                height: '42px',
                                textAlign: 'center'
                              }}>
                                <td style={{ padding: '8px 6px', borderRight: '1px solid #e2e8f0', fontWeight: 900, color: isTarget5x ? '#10b981' : '#1e293b' }}>
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
                                    {isTarget5x ? (
                                      <span style={{ color: '#10b981', fontSize: '14px' }}>★</span>
                                    ) : (
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                                        <line x1="18" y1="20" x2="18" y2="10" />
                                        <line x1="12" y1="20" x2="12" y2="4" />
                                        <line x1="6" y1="20" x2="6" y2="14" />
                                      </svg>
                                    )}
                                    <span>x{p.m}</span>
                                  </div>
                                </td>
                                <td style={{ padding: '8px 6px', borderRight: '1px solid #e2e8f0' }}>{Math.round(p.kgCableDia)}</td>
                                <td style={{ padding: '8px 6px', borderRight: '1px solid #e2e8f0' }}>{Math.round(p.metalDia)}</td>
                                <td style={{ padding: '8px 6px', borderRight: '1px solid #e2e8f0', color: '#0891b2', fontWeight: 800 }}>{moneyShort(p.ventaMes)}</td>
                                <td style={{ padding: '8px 6px', color: ebitdaColor, fontWeight: 800 }}>
                                  {ebitda < 0 ? `-${moneyShort(Math.abs(ebitda))}` : moneyShort(ebitda)}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Right: Comparative Bar Chart Card */}
                    <div style={{
                      background: '#ffffff',
                      border: '1.5px solid #e2e8f0',
                      borderRadius: '16px',
                      padding: '18px 24px',
                      display: 'flex',
                      flexDirection: 'column',
                      boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)',
                      boxSizing: 'border-box',
                      height: '100%',
                      justifyContent: 'space-between'
                    }}>
                      <span style={{ fontSize: '13.5px', fontWeight: 950, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '8px' }}>
                        Comparativa Gráfica Mensual (MXN)
                      </span>
                      
                      {/* Chart Body */}
                      <div style={{ height: '260px', width: '100%', marginTop: '10px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart 
                            data={proyecciones.map(p => ({
                              name: `x${p.m}`,
                              Ventas: p.ventaMes,
                              'OPEX (Fijo)': calculations.opexFixedMonthlyMxn,
                              EBITDA: p.margenMensualMxn
                            }))} 
                            margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis 
                              dataKey="name" 
                              axisLine={{ stroke: '#94a3b8', strokeWidth: 2 }} 
                              tickLine={false} 
                              tick={{ fontSize: 12, fontWeight: 800, fill: '#64748b' }} 
                            />
                            <YAxis 
                              tickFormatter={(val) => val === 0 ? '0' : (val / 1000) + 'k'} 
                              axisLine={false} 
                              tickLine={false} 
                              tick={{ fontSize: 11, fill: '#64748b', fontWeight: 700 }} 
                            />
                            <Tooltip 
                              formatter={(value) => moneyShort(value)}
                              cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                              contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                            />
                            <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 800, paddingTop: '10px' }} />
                            <Bar dataKey="Ventas" fill="#00b0b9" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="OPEX (Fijo)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="EBITDA" fill="#10b981" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Bottom Caption */}
                      <span style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textAlign: 'center', marginTop: '16px' }}>
                        OPEX mensual fijo constante en todos los escenarios: {money(calculations.opexFixedMonthlyMxn)}
                      </span>
                    </div>

                  </div>
                </div>
              </div>
              {renderPageFooter(9, 11)}
            </div>

            {/* HOJA 10: VIABILIDAD FINANCIERA */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader("10. VIABILIDAD FINANCIERA / RETORNO DE INVERSIÓN (ROI)", "Matriz de viabilidad económica y proyección del periodo de amortización de capital")}
                
                {(() => {
                  const viableInicial = proyecciones.find(p => p.margenAnualMxn > 0) || proyecciones[2];
                  const maxRoi = Math.max(...proyecciones.map(p => p.roiAnual));
                  const paybackValores = proyecciones.map(p => p.paybackMeses).filter(v => v !== Infinity && v > 0);
                  const minPayback = paybackValores.length > 0 ? Math.min(...paybackValores) : 0;
                  const pEquilibrio = proyecciones[0].puntoEquilibrioTonMes;

                  return (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      
                      {/* Top Cards Row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                        {/* Card 1: Escenario viable inicial */}
                        <div style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderLeft: '4.5px solid #0d9488',
                          borderRadius: '12px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10" />
                              <circle cx="12" cy="12" r="6" />
                              <circle cx="12" cy="12" r="2" />
                            </svg>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Escenario viable inicial</span>
                            <span style={{ fontSize: '18px', fontWeight: 900, color: '#0d9488', marginTop: '0px' }}>x{viableInicial.m}</span>
                          </div>
                        </div>

                        {/* Card 2: ROI máximo */}
                        <div style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderLeft: '4.5px solid #16a34a',
                          borderRadius: '12px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5">
                              <line x1="18" y1="20" x2="18" y2="10" />
                              <line x1="12" y1="20" x2="12" y2="4" />
                              <line x1="6" y1="20" x2="6" y2="14" />
                            </svg>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>ROI máximo</span>
                            <span style={{ fontSize: '18px', fontWeight: 900, color: '#16a34a', marginTop: '0px' }}>{maxRoi.toFixed(1)}%</span>
                          </div>
                        </div>

                        {/* Card 3: Mejor payback */}
                        <div style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderLeft: '4.5px solid #ea580c',
                          borderRadius: '12px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#ffedd5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5">
                              <path d="M5 2h14" />
                              <path d="M5 22h14" />
                              <path d="M19 2v6c0 4-4 6-4 6s4 2 4 6v2" />
                              <path d="M5 2v6c0 4 4 6 4 6s-4 2-4 6v2" />
                            </svg>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Mejor payback</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginTop: '0px' }}>
                              <span style={{ fontSize: '18px', fontWeight: 900, color: '#ea580c' }}>{minPayback.toFixed(1)}</span>
                              <span style={{ fontSize: '11px', fontWeight: 850, color: '#ea580c' }}>meses</span>
                            </div>
                          </div>
                        </div>

                        {/* Card 4: Punto de equilibrio */}
                        <div style={{
                          background: '#ffffff',
                          border: '1.5px solid #e2e8f0',
                          borderLeft: '4.5px solid #2563eb',
                          borderRadius: '12px',
                          padding: '8px 12px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                        }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                              <line x1="12" y1="3" x2="12" y2="21" />
                              <line x1="6" y1="7" x2="18" y2="7" />
                              <path d="M6 7l-3 6h6l-3-6M18 7l-3 6h6l-3-6" />
                            </svg>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Punto de equilibrio</span>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '3px', marginTop: '0px' }}>
                              <span style={{ fontSize: '18px', fontWeight: 900, color: '#2563eb' }}>{pEquilibrio.toFixed(2)}</span>
                              <span style={{ fontSize: '10.5px', fontWeight: 850, color: '#2563eb' }}>ton/mes</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Main Grid: Table & Charts */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '20px', flex: 1, alignItems: 'stretch' }}>
                        
                        {/* Left: Table Column */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', justifyContent: 'center' }}>
                          <span style={{ fontSize: '13.5px', fontWeight: 950, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.3px', borderBottom: '1.5px solid #cbd5e1', paddingBottom: '6px' }}>
                            Matriz Financiera por Escenario
                          </span>
                          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1.5px solid #cbd5e1', borderRadius: '12px', overflow: 'hidden' }}>
                            <thead>
                              <tr style={{ background: '#005b60', color: '#ffffff', fontSize: '12.5px', fontWeight: 800, textAlign: 'center' }}>
                                <th style={{ padding: '6px 6px', borderRight: '1px solid #11787e', width: '15%' }}>Escenario</th>
                                <th style={{ padding: '6px 6px', borderRight: '1px solid #11787e', width: '27%' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                                      <circle cx="8" cy="8" r="6" />
                                      <circle cx="18" cy="18" r="4" />
                                      <line x1="12" y1="12" x2="15" y2="15" />
                                    </svg>
                                    <span>EBITDA anual</span>
                                  </div>
                                </th>
                                <th style={{ padding: '6px 6px', borderRight: '1px solid #11787e', width: '20%' }}>
                                  <span>% ROI anual</span>
                                </th>
                                <th style={{ padding: '6px 6px', borderRight: '1px solid #11787e', width: '18%' }}>
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', justifyContent: 'center' }}>
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                                      <circle cx="12" cy="12" r="10" />
                                      <polyline points="12 6 12 12 16 14" />
                                    </svg>
                                    <span>Payback</span>
                                  </div>
                                </th>
                                <th style={{ padding: '6px 6px', width: '20%' }}>
                                  <span>P. equilibrio</span>
                                </th>
                              </tr>
                            </thead>
                            <tbody>
                              {proyecciones.map((p) => {
                                const isTarget5x = p.m === 5;
                                const isViableInicial = p.m === 3;
                                
                                const ebitda = p.margenAnualMxn;
                                const ebitdaColor = ebitda < 0 ? '#ef4444' : '#16a34a';
                                const roiColor = p.roiAnual < 0 ? '#ef4444' : '#16a34a';
                                const paybackColor = p.paybackMeses === Infinity ? '#64748b' : p.paybackMeses <= 12 ? '#16a34a' : p.paybackMeses <= 24 ? '#ea580c' : '#ef4444';
                                
                                const bg = isTarget5x ? '#f0fdf4' : isViableInicial ? '#f0fdf4' : 'transparent';
                                const borderStyle = isTarget5x ? '1.5px solid #10b981' : isViableInicial ? '1px solid #0d9488' : '1px solid #e2e8f0';
                                const fontW = (isTarget5x || isViableInicial) ? 900 : 600;

                                return (
                                  <tr key={p.m} style={{
                                    background: bg,
                                    borderBottom: borderStyle,
                                    fontSize: '13.5px',
                                    fontWeight: fontW,
                                    color: '#334155',
                                    height: '35px',
                                    textAlign: 'center'
                                  }}>
                                    <td style={{ padding: '4px 6px', borderRight: '1px solid #cbd5e1', fontWeight: 900, color: isTarget5x ? '#10b981' : isViableInicial ? '#0d9488' : '#1e293b' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
                                        {isTarget5x ? (
                                          <span style={{ color: '#10b981', fontSize: '15px' }}>★</span>
                                        ) : (
                                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5">
                                            <line x1="18" y1="20" x2="18" y2="10" />
                                            <line x1="12" y1="20" x2="12" y2="4" />
                                            <line x1="6" y1="20" x2="6" y2="14" />
                                          </svg>
                                        )}
                                        <span>x{p.m}</span>
                                      </div>
                                    </td>
                                    <td style={{ padding: '4px 6px', borderRight: '1px solid #cbd5e1', color: ebitdaColor, fontWeight: 800 }}>
                                      {ebitda < 0 ? `-${money(Math.abs(ebitda))}` : money(ebitda)}
                                    </td>
                                    <td style={{ padding: '4px 6px', borderRight: '1px solid #cbd5e1', color: roiColor, fontWeight: 800 }}>
                                      {p.roiAnual.toFixed(1)}%
                                    </td>
                                    <td style={{ padding: '4px 6px', borderRight: '1px solid #cbd5e1', color: paybackColor, fontWeight: 800 }}>
                                      {p.paybackMeses === Infinity ? 'N/A' : `${p.paybackMeses.toFixed(1)} meses`}
                                    </td>
                                    <td style={{ padding: '4px 6px', color: '#2563eb', fontWeight: 800 }}>
                                      {p.puntoEquilibrioTonMes.toFixed(2)} ton/mes
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {/* Table Legend */}
                          <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#64748b', marginTop: '6px', fontWeight: 800 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: '#10b981', fontSize: '15px', lineHeight: '1' }}>★</span>
                              <span>Mejor escenario (mayor ROI y menor payback)</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '14px', height: '14px', background: '#f0fdf4', border: '1.5px solid #0d9488', borderRadius: '3px' }} />
                              <span>Primer escenario viable</span>
                            </div>
                          </div>
                        </div>

                        {/* Right Column: Comparative Charts */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', justifyContent: 'center' }}>
                          
                          {/* Chart 1: Comparativa de Amortización */}
                          <div style={{
                            background: '#ffffff',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '8px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)',
                            boxSizing: 'border-box'
                          }}>
                            <span style={{ fontSize: '13px', fontWeight: 950, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '6px' }}>
                              Comparativa de Amortización (Meses para Retorno)
                            </span>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                              {proyecciones.map((p) => {
                                const isInfinity = p.paybackMeses === Infinity;
                                const wPct = isInfinity ? 10 : Math.min(100, (p.paybackMeses / 60) * 100);
                                const barColor = isInfinity ? '#cbd5e1' : p.paybackMeses <= 12 ? '#16a34a' : p.paybackMeses <= 24 ? '#ea580c' : '#ef4444';
                                
                                return (
                                  <div key={p.m} style={{ display: 'flex', alignItems: 'center', fontSize: '11.5px' }}>
                                    <span style={{ width: '28px', fontWeight: 900, color: '#475569' }}>x{p.m}</span>
                                    <div style={{ flex: 1, display: 'flex', alignItems: 'center' }}>
                                      {isInfinity ? (
                                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                          <div style={{ flex: 0.6, height: '10px', background: '#f1f5f9', borderRadius: '5px' }}>
                                            <div style={{ width: '15%', height: '100%', background: '#cbd5e1', borderRadius: '5px' }} />
                                          </div>
                                          <span style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>N/A</span>
                                        </div>
                                      ) : (
                                        <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '10px' }}>
                                          <div style={{ flex: 1, height: '10px', background: '#f1f5f9', borderRadius: '5px', overflow: 'hidden' }}>
                                            <div style={{ width: `${wPct}%`, height: '100%', background: barColor, borderRadius: '5px' }} />
                                          </div>
                                          <span style={{ fontSize: '11px', fontWeight: 900, color: barColor, whiteSpace: 'nowrap', width: '70px', textAlign: 'right' }}>
                                            {p.paybackMeses.toFixed(1)} meses
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Amortization Legend */}
                            <div style={{ display: 'flex', gap: '14px', fontSize: '10.5px', color: '#64748b', marginTop: '6px', borderTop: '1.5px solid #f1f5f9', paddingTop: '4px', fontWeight: 800 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '8px', height: '8px', background: '#16a34a', borderRadius: '50%' }} />
                                <span>Verde: &lt;12 meses</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '8px', height: '8px', background: '#ea580c', borderRadius: '50%' }} />
                                <span>Naranja: 12-24 meses</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <div style={{ width: '8px', height: '8px', background: '#ef4444', borderRadius: '50%' }} />
                                <span>Rojo: &gt;24 meses</span>
                              </div>
                            </div>
                          </div>

                          {/* Chart 2: ROI y EBITDA Anual */}
                          <div style={{
                            background: '#ffffff',
                            border: '1.5px solid #e2e8f0',
                            borderRadius: '16px',
                            padding: '8px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02), 0 2px 4px -1px rgba(0,0,0,0.02)',
                            boxSizing: 'border-box'
                          }}>
                            <span style={{ fontSize: '13px', fontWeight: 950, color: '#1e293b', textTransform: 'uppercase', letterSpacing: '0.3px', marginBottom: '4px' }}>
                              ROI y EBITDA Anual por Escenario
                            </span>

                            {/* Chart Body */}
                            <div style={{ height: '180px', width: '100%', marginTop: '4px' }}>
                              <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart 
                                  data={proyecciones.map(p => ({
                                    name: `x${p.m}`,
                                    'EBITDA anual (MXN)': p.margenAnualMxn,
                                    'ROI anual (%)': p.roiAnual
                                  }))}
                                  margin={{ top: 10, right: 0, left: -20, bottom: 0 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                  <XAxis 
                                    dataKey="name" 
                                    axisLine={{ stroke: '#94a3b8', strokeWidth: 1.5 }} 
                                    tickLine={false} 
                                    tick={{ fontSize: 11, fontWeight: 800, fill: '#64748b' }} 
                                  />
                                  <YAxis 
                                    yAxisId="left"
                                    orientation="left"
                                    tickFormatter={(val) => val === 0 ? '0' : val > 0 ? `${val/1000}k` : `-${Math.abs(val)/1000}k`} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} 
                                  />
                                  <YAxis 
                                    yAxisId="right"
                                    orientation="right"
                                    tickFormatter={(val) => `${val}%`} 
                                    axisLine={false} 
                                    tickLine={false} 
                                    tick={{ fontSize: 10, fill: '#64748b', fontWeight: 700 }} 
                                  />
                                  <Tooltip 
                                    formatter={(value, name) => name === 'EBITDA anual (MXN)' ? moneyShort(value) : `${value.toFixed(1)}%`}
                                    cursor={{ fill: 'rgba(0,0,0,0.04)' }}
                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                                  />
                                  <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 800, paddingTop: '5px' }} />
                                  <Bar yAxisId="left" dataKey="EBITDA anual (MXN)" fill="#0e7490" barSize={16} radius={[2, 2, 0, 0]} />
                                  <Line 
                                    yAxisId="right" 
                                    type="monotone" 
                                    dataKey="ROI anual (%)" 
                                    stroke="#1e293b" 
                                    strokeWidth={2} 
                                    dot={{ fill: '#ffffff', stroke: '#1e293b', strokeWidth: 2, r: 4.5 }} 
                                    activeDot={{ r: 6 }} 
                                  />
                                </ComposedChart>
                              </ResponsiveContainer>
                            </div>
                          </div>

                        </div>
                      </div>

                      {/* Footer Key Insight Box */}
                      <div style={{
                        background: '#ffffff',
                        border: '1.5px solid #cbd5e1',
                        borderRadius: '14px',
                        padding: '12px 18px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '16px',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#ccfbf1', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5">
                              <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A5 5 0 0 0 8 8c0 1 .3 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
                              <line x1="9" y1="18" x2="15" y2="18" />
                              <line x1="10" y1="22" x2="14" y2="22" />
                            </svg>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                            <span style={{ fontSize: '13px', fontWeight: 950, color: '#0d9488', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                              Insight Clave:
                            </span>
                            <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: '1.4' }}>
                              La viabilidad financiera inicia en el escenario <strong style={{ color: '#0d9488' }}>x3</strong>. Los escenarios <strong style={{ color: '#0d9488' }}>x4</strong> y <strong style={{ color: '#0d9488' }}>x5</strong> mejoran significativamente el ROI y reducen el tiempo de retorno, destacando <strong style={{ color: '#16a34a' }}>x5 con {maxRoi.toFixed(1)}% de ROI</strong> y <strong style={{ color: '#ea580c' }}>{minPayback.toFixed(1)} meses</strong> de payback.
                            </p>
                          </div>
                        </div>
                        {/* Right side icons */}
                        <div style={{ display: 'flex', gap: '16px', flexShrink: 0 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0d9488" strokeWidth="2.5">
                              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                              <polyline points="17 6 23 6 23 12" />
                            </svg>
                            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#64748b', textAlign: 'center', width: '60px', lineHeight: '1.2' }}>Mayor rentabilidad</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ea580c" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10" />
                              <polyline points="12 6 12 12 16 14" />
                            </svg>
                            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#64748b', textAlign: 'center', width: '60px', lineHeight: '1.2' }}>Menor tiempo de retorno</span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                              <circle cx="12" cy="12" r="10" />
                              <circle cx="12" cy="12" r="6" />
                            </svg>
                            <span style={{ fontSize: '9.5px', fontWeight: 800, color: '#64748b', textAlign: 'center', width: '60px', lineHeight: '1.2' }}>Decisiones más inteligentes</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  );
                })()}
              </div>
              {renderPageFooter(10, 11)}
            </div>

            {/* HOJA 11: MATRIZ DE RIESGOS */}
            <div className="lma-page" style={S.page}>
              <div className="lma-page-inner" style={S.inner}>
                {renderPageHeader("11. MATRIZ DE RIESGOS Y CONDICIONES DE RENTABILIDAD", "Evaluación de riesgos operativos de procesamiento de cobre, contingencia y mantenimiento")}
                <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 32, marginTop: 12 }}>
                  
                  {/* Riesgos */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div style={{ fontSize: '15px', fontWeight: 950, color: '#334155', borderBottom: '1px solid #cbd5e1', paddingBottom: 6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Riesgos Operativos Clave
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[
                        { label: 'Exposición a Polvo Fino de PVC', val: inputs.riesgoPolvo, mitigation: 'Instalación de Extractor Industrial centers-grade.' },
                        { label: 'Humedad en Envoltura Plástica', val: inputs.riesgoHumedad, mitigation: 'Secado previo y pre-clasificación del material de entrada.' },
                        { label: 'Contaminación Metálica en Tolva', val: inputs.riesgoMetal, mitigation: 'Imantado preventivo y detectores en la tolva de alimentación.' },
                        { label: 'Variaciones e Inestabilidad de Voltaje', val: inputs.riesgoVoltaje, mitigation: 'Estabilizador de tensión calibrado a la potencia del sitio.' }
                      ].map((r, i) => {
                        const color = r.val === 'alto' ? '#ef4444' : r.val === 'medio' ? '#f59e0b' : '#10b981';
                        const bg = r.val === 'alto' ? '#fef2f2' : r.val === 'medio' ? '#fffbeb' : '#f0fdf4';
                        return (
                          <div key={i} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '12px 18px', display: 'flex', flexDirection: 'column', gap: 6, boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a' }}>{r.label}</span>
                              <span style={{ fontSize: '12px', fontWeight: 900, color: color, background: bg, border: `1.5px solid ${color}`, padding: '2px 10px', borderRadius: 14, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {r.val}
                              </span>
                            </div>
                            <p style={{ fontSize: '12.5px', color: '#475569', margin: 0, lineHeight: '1.4' }}>
                              <strong style={{ color: '#334155' }}>Mitigación:</strong> {r.mitigation}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Mtto y seguridad */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div style={{ fontSize: '15px', fontWeight: 950, color: '#334155', borderBottom: '1px solid #cbd5e1', paddingBottom: 6, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      Mantenimiento & Seguridad Requerida
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                      <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
                        <span style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.3px' }}>Vida Útil Cuchillas</span>
                        <span style={{ fontSize: '22px', fontWeight: 950, color: '#0f172a' }}>{inputs.vidaUtilCuchillasHoras} hrs</span>
                      </div>
                      <div style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '14px 10px', textAlign: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
                        <span style={{ display: 'block', fontSize: '12px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4, letterSpacing: '0.3px' }}>Mtto Preventivo</span>
                        <span style={{ fontSize: '22px', fontWeight: 950, color: '#0f172a' }}>{inputs.frecuenciaMantenimientoHoras} hrs</span>
                      </div>
                    </div>

                    <div style={{ background: '#faf5ff', border: '1.5px solid #f3e8ff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 4px rgba(0,0,0,0.01)' }}>
                      <span style={{ fontSize: '14px', fontWeight: 950, color: '#6b21a8', textTransform: 'uppercase', display: 'block', marginBottom: 10, letterSpacing: '0.3px' }}>
                        Requisitos de Infraestructura Obligatorios
                      </span>
                      <ul style={{ margin: 0, paddingLeft: 14, fontSize: '12.5px', color: '#581c87', display: 'flex', flexDirection: 'column', gap: 8, lineHeight: '1.4' }}>
                        <li>Extractor de polvo PVC con filtro HEPA activo.</li>
                        <li>Protección acústica obligatoria (cabina o PPE &gt; 85dB).</li>
                        <li>Imán de neodimio de alta potencia en la tolva de entrada.</li>
                        <li>Guantes de Kevlar con protección térmica contra fricción de corte.</li>
                      </ul>
                    </div>
                  </div>

                </div>
              </div>
              {renderPageFooter(11, 11)}
            </div>

          </div>
        </div>
      , document.body)}

    </div>
  );
}
