import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Activity, Play, Pause, RefreshCw, AlertTriangle, CheckCircle2, 
  Settings, Layers, TrendingUp, Cpu, Wrench, ShieldAlert, 
  Printer, Download, FileSpreadsheet, Eye, EyeOff, Sliders, Info, Zap
} from 'lucide-react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

// --- DEFINICIÓN DE TIPOS ---
interface ModuloProceso {
  id: string;
  nombre: string;
  activo: boolean;
  potenciaInstalada: number; // kW
  capacidadNominal: number; // kg/h
  comentarioRiesgo: string;
}

export default function App() {
  // --- ESTADOS DE LA APLICACIÓN ---
  
  // 1. Configuración del Rollo
  const [diametroExteriorRollo, setDiametroExteriorRollo] = useState<number>(3.00); // m
  const [diametroInteriorRollo, setDiametroInteriorRollo] = useState<number>(1.20); // m
  const [alturaRollo, setAlturaRollo] = useState<number>(1.60); // m
  const [pesoRollo, setPesoRollo] = useState<number>(500); // kg
  const [velocidadDesbobinado, setVelocidadDesbobinado] = useState<number>(8); // m/min
  const [coefFriccion, setCoefFriccion] = useState<number>(0.20);
  const [factorSeguridad, setFactorSeguridad] = useState<number>(1.5);

  // 2. Configuración del Tubo
  const [diametroExteriorTubo, setDiametroExteriorTubo] = useState<number>(9.52); // mm
  const [diametroInteriorTubo, setDiametroInteriorTubo] = useState<number>(7.80); // mm
  const [resistenciaCorte, setResistenciaCorte] = useState<number>(220); // MPa
  const [limiteElastico, setLimiteElastico] = useState<number>(70); // MPa
  const [extractorPolvoActivo, setExtractorPolvoActivo] = useState<boolean>(false);

  // 3. Módulos del Proceso
  const [modulos, setModulos] = useState<ModuloProceso[]>([
    { id: 'banda_entrada', nombre: 'Banda de entrada', activo: true, potenciaInstalada: 2.2, capacidadNominal: 1000, comentarioRiesgo: 'Pellizcos en rodillos' },
    { id: 'desbobinadora', nombre: 'Desbobinadora de rollo maestro', activo: true, potenciaInstalada: 5.5, capacidadNominal: 800, comentarioRiesgo: 'Tensión excesiva y latigueo' },
    { id: 'dancer', nombre: 'Rodillo dancer / acumulador', activo: true, potenciaInstalada: 1.5, capacidadNominal: 800, comentarioRiesgo: 'Inercia mecánica' },
    { id: 'alimentador', nombre: 'Rodillo alimentador', activo: true, potenciaInstalada: 3, capacidadNominal: 800, comentarioRiesgo: 'Puntos de atrapamiento' },
    { id: 'cizalla', nombre: 'Cizalla rotativa', activo: true, potenciaInstalada: 15, capacidadNominal: 800, comentarioRiesgo: 'Cuchillas expuestas, alta fuerza' },
    { id: 'trituradora', nombre: 'Trituradora M1200', activo: true, potenciaInstalada: 75, capacidadNominal: 1000, comentarioRiesgo: 'Picos de corriente, sobrecarga' },
    { id: 'banda_salida_trit', nombre: 'Banda salida trituradora', activo: true, potenciaInstalada: 2.2, capacidadNominal: 1000, comentarioRiesgo: 'Derrame de virutas' },
    { id: 'molino', nombre: 'Molino granulador', activo: true, potenciaInstalada: 55, capacidadNominal: 600, comentarioRiesgo: 'Alto ruido y polvo fino' },
    { id: 'banda_salida_mol', nombre: 'Banda salida molino', activo: true, potenciaInstalada: 2.2, capacidadNominal: 600, comentarioRiesgo: 'Acumulación de estática' },
    { id: 'tolva', nombre: 'Tolva pulmón', activo: true, potenciaInstalada: 1.5, capacidadNominal: 600, comentarioRiesgo: 'Bloqueo por puente de material' },
    { id: 'briqueteadora', nombre: 'Briqueteadora doble BQT300', activo: true, potenciaInstalada: 60, capacidadNominal: 500, comentarioRiesgo: 'Presión extrema, temperatura' },
    { id: 'banda_salida_briq', nombre: 'Banda salida briqueteadora', activo: true, potenciaInstalada: 2.2, capacidadNominal: 500, comentarioRiesgo: 'Caída de briquetas calientes' },
    { id: 'carritos', nombre: 'Carritos de descarga', activo: true, potenciaInstalada: 0, capacidadNominal: 500, comentarioRiesgo: 'Sobresfuerzo del operador' }
  ]);

  // 4. Estados de Animación del Gemelo Digital
  const [animando, setAnimando] = useState<boolean>(true);
  const [rotacionY, setRotacionY] = useState<number>(0.6);
  const [rotacionX, setRotacionX] = useState<number>(0.4);
  const [zoomCanvas, setZoomCanvas] = useState<number>(1);
  const isDragging = useRef<boolean>(false);
  const previousMousePosition = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // --- VALIDACIONES DE ENTRADAS ---
  const validaciones = useMemo(() => {
    const errores: string[] = [];
    if (diametroInteriorRollo >= diametroExteriorRollo) {
      errores.push("El diámetro interior del rollo debe ser menor que el diámetro exterior.");
    }
    if (diametroInteriorTubo >= diametroExteriorTubo) {
      errores.push("El diámetro interior del tubo de cobre debe ser menor que su diámetro exterior.");
    }
    if (pesoRollo <= 0) {
      errores.push("El peso del rollo debe ser mayor a 0 kg.");
    }
    if (velocidadDesbobinado <= 0) {
      errores.push("La velocidad de desbobinado debe ser mayor a 0 m/min.");
    }
    if (diametroExteriorRollo <= 0 || diametroInteriorRollo <= 0 || alturaRollo <= 0) {
      errores.push("Las dimensiones geométricas del rollo deben ser mayores a 0.");
    }
    if (diametroExteriorTubo <= 0 || diametroInteriorTubo <= 0) {
      errores.push("Las dimensiones del tubo deben ser mayores a 0.");
    }
    return {
      valido: errores.length === 0,
      errores
    };
  }, [
    diametroExteriorRollo, diametroInteriorRollo, alturaRollo, pesoRollo, 
    velocidadDesbobinado, diametroExteriorTubo, diametroInteriorTubo
  ]);

  // --- CÁLCULOS TÉCNICOS ---
  const calculos = useMemo(() => {
    if (!validaciones.valido) {
      return {
        espesorTuboMm: 0,
        areaMetalicaM2: 0,
        pesoMetroKgM: 0,
        longitudTotalM: 0,
        tiempoDesbobinadoMin: 0,
        masaPorMinutoKgMin: 0,
        capacidadRequeridaKgH: 0,
        fuerzaCorteN: 0,
        fuerzaCorteKN: 0,
        fuerzaCorteTon: 0,
        radioMedioRolloM: 0,
        torqueBaseNm: 0,
        torqueSeguroNm: 0,
        omegaRadSeg: 0,
        potenciaMecanicaDesbobinadoKw: 0,
        potenciaInstaladaTotalKw: 0,
        cuelloBotellaModulo: 'Ninguno',
        cuelloBotellaCapacidad: Infinity,
        alertaSobrecarga: false,
        scoreRiesgo: 0,
        clasificacionRiesgo: 'Bajo'
      };
    }

    // A) Espesor Tubo
    const espesorTuboMm = (diametroExteriorTubo - diametroInteriorTubo) / 2;

    // B) Área metálica del tubo en m²
    const odM = diametroExteriorTubo / 1000;
    const idM = diametroInteriorTubo / 1000;
    const areaMetalicaM2 = (Math.PI / 4) * (Math.pow(odM, 2) - Math.pow(idM, 2));

    // C) Peso por metro del tubo
    const densidadCobre = 8960; // kg/m³
    const pesoMetroKgM = areaMetalicaM2 * densidadCobre;

    // D) Longitud total estimada del rollo
    const longitudTotalM = pesoRollo / pesoMetroKgM;

    // E) Tiempo para desbobinar
    const tiempoDesbobinadoMin = longitudTotalM / velocidadDesbobinado;

    // F) Masa por minuto
    const masaPorMinutoKgMin = pesoRollo / tiempoDesbobinadoMin;

    // G) Capacidad requerida kg/h
    const capacidadRequeridaKgH = masaPorMinutoKgMin * 60;

    // H) Fuerza de corte
    // Resistencia al corte en Pa = resistenciaCorte * 10^6
    const fuerzaCorteN = areaMetalicaM2 * (resistenciaCorte * 1000000);
    const fuerzaCorteKN = fuerzaCorteN / 1000;
    const fuerzaCorteTon = fuerzaCorteN / 9806.65;

    // I) Torque en desbobinadora
    const radioMedioRolloM = (diametroExteriorRollo + diametroInteriorRollo) / 4;
    const gravedad = 9.81;
    const torqueBaseNm = pesoRollo * gravedad * coefFriccion * radioMedioRolloM;
    const torqueSeguroNm = torqueBaseNm * factorSeguridad;

    // J) Potencia mecánica de desbobinado
    const velocidadLinealMSeg = velocidadDesbobinado / 60;
    const omegaRadSeg = velocidadLinealMSeg / radioMedioRolloM;
    const potenciaMecanicaDesbobinadoKw = (torqueSeguroNm * omegaRadSeg) / 1000;

    // K) Potencia instalada total (módulos activos)
    const potenciaInstaladaTotalKw = modulos
      .filter(m => m.activo)
      .reduce((sum, m) => sum + m.potenciaInstalada, 0);

    // L) Cuello de Botella
    const modulosActivos = modulos.filter(m => m.activo);
    let cuelloBotellaModulo = 'Ninguno';
    let cuelloBotellaCapacidad = Infinity;
    
    if (modulosActivos.length > 0) {
      const minCap = modulosActivos.reduce((min, curr) => curr.capacidadNominal < min.capacidadNominal ? curr : min, modulosActivos[0]);
      cuelloBotellaModulo = minCap.nombre;
      cuelloBotellaCapacidad = minCap.capacidadNominal;
    }

    const alertaSobrecarga = capacidadRequeridaKgH > cuelloBotellaCapacidad;

    // M) Índice de Riesgo (0 a 100)
    let riskScore = 0;
    
    const desbobinadoraActiva = modulos.find(m => m.id === 'desbobinadora')?.activo;
    const dancerActivo = modulos.find(m => m.id === 'dancer')?.activo;
    const alimentadorActivo = modulos.find(m => m.id === 'alimentador')?.activo;
    const cizallaActiva = modulos.find(m => m.id === 'cizalla')?.activo;
    const trituradoraActiva = modulos.find(m => m.id === 'trituradora')?.activo;
    const molinoActivo = modulos.find(m => m.id === 'molino')?.activo;

    if (velocidadDesbobinado > 15) riskScore += 20;
    if (pesoRollo > 700) riskScore += 15;
    if (diametroExteriorRollo > 3.2) riskScore += 10;
    if (!dancerActivo) riskScore += 25;
    if (!alimentadorActivo) riskScore += 20;
    if (!cizallaActiva && trituradoraActiva) riskScore += 15;
    if (molinoActivo && !extractorPolvoActivo) riskScore += 15;
    if (alertaSobrecarga) riskScore += 25;

    // Limitar score a 100
    riskScore = Math.min(riskScore, 100);

    let clasificacionRiesgo = 'Bajo';
    if (riskScore > 30 && riskScore <= 60) {
      clasificacionRiesgo = 'Medio';
    } else if (riskScore > 60) {
      clasificacionRiesgo = 'Alto';
    }

    return {
      espesorTuboMm,
      areaMetalicaM2,
      pesoMetroKgM,
      longitudTotalM,
      tiempoDesbobinadoMin,
      masaPorMinutoKgMin,
      capacidadRequeridaKgH,
      fuerzaCorteN,
      fuerzaCorteKN,
      fuerzaCorteTon,
      radioMedioRolloM,
      torqueBaseNm,
      torqueSeguroNm,
      omegaRadSeg,
      potenciaMecanicaDesbobinadoKw,
      potenciaInstaladaTotalKw,
      cuelloBotellaModulo,
      cuelloBotellaCapacidad,
      alertaSobrecarga,
      scoreRiesgo: riskScore,
      clasificacionRiesgo
    };
  }, [
    validaciones, diametroExteriorRollo, diametroInteriorRollo, alturaRollo, pesoRollo, 
    velocidadDesbobinado, coefFriccion, factorSeguridad, diametroExteriorTubo, 
    diametroInteriorTubo, resistenciaCorte, limiteElastico, extractorPolvoActivo, modulos
  ]);

  // --- DIAGNÓSTICOS AUTOMÁTICOS ---
  const diagnosticos = useMemo(() => {
    const list: string[] = [];
    const dancerActivo = modulos.find(m => m.id === 'dancer')?.activo;
    const alimentadorActivo = modulos.find(m => m.id === 'alimentador')?.activo;
    const cizallaActiva = modulos.find(m => m.id === 'cizalla')?.activo;
    const trituradoraActiva = modulos.find(m => m.id === 'trituradora')?.activo;
    const molinoActivo = modulos.find(m => m.id === 'molino')?.activo;
    const briqueteadoraActiva = modulos.find(m => m.id === 'briqueteadora')?.activo;
    const tolvaActiva = modulos.find(m => m.id === 'tolva')?.activo;

    if (!dancerActivo) {
      list.push("Riesgo de latigueo del rollo y desenrollado súbito.");
    }
    if (!alimentadorActivo) {
      list.push("La trituradora recibirá jalones y picos de carga.");
    }
    if (!cizallaActiva && trituradoraActiva) {
      list.push("El tubo largo puede formar nidos y atorar la tolva.");
    }
    if (molinoActivo) {
      list.push("Revisar generación de polvo fino de cobre y sistema de extracción.");
    }
    if (briqueteadoraActiva && molinoActivo && !tolvaActiva) {
      list.push("Agregar tolva pulmón antes de briqueteadora.");
    }
    if (velocidadDesbobinado > 12) {
      list.push("Revisar tensión y freno del pay-off.");
    }
    if (calculos.fuerzaCorteKN > 50) {
      list.push("Validar diámetro, espesor y dureza real del cobre.");
    }
    return list;
  }, [modulos, velocidadDesbobinado, calculos]);

  // --- RECOMENDACIONES DE INGENIERÍA ---
  const recomendaciones = useMemo(() => {
    const list: string[] = [];
    const dancerActivo = modulos.find(m => m.id === 'dancer')?.activo;
    const molinoActivo = modulos.find(m => m.id === 'molino')?.activo;
    const tolvaActiva = modulos.find(m => m.id === 'tolva')?.activo;

    list.push("Agregar freno hidráulico o neumático en desbobinadora.");
    if (!dancerActivo) {
      list.push("Agregar dancer arm con sensor de posición.");
    }
    list.push("Sincronizar velocidad de desbobinadora con rodillo alimentador.");
    list.push("Agregar jaula de contención del rollo.");
    if (!tolvaActiva) {
      list.push("Agregar tolva pulmón antes de briqueteadora.");
    }
    if (molinoActivo && !extractorPolvoActivo) {
      list.push("Agregar extracción de polvo si hay molino.");
    }
    list.push("Usar guardas físicas por riesgo de latigueo.");
    list.push("Medir corriente de trituradora para control automático.");

    return list;
  }, [modulos, extractorPolvoActivo]);

  // --- EXPORTAR A CSV ---
  const exportarCSV = () => {
    const rows = [
      ["Variable", "Valor", "Unidad", "Comentario"],
      ["Area metalica del tubo", calculos.areaMetalicaM2.toFixed(8), "m2", "Seccion transversal metalica"],
      ["Peso por metro", calculos.pesoMetroKgM.toFixed(4), "kg/m", "Basado en densidad del cobre"],
      ["Longitud total estimada", calculos.longitudTotalM.toFixed(2), "m", "Longitud de tubo en el rollo"],
      ["Tiempo de desbobinado", calculos.tiempoDesbobinadoMin.toFixed(2), "min", "Duracion del ciclo"],
      ["Capacidad requerida", calculos.capacidadRequeridaKgH.toFixed(2), "kg/h", "Flujo de masa requerido"],
      ["Fuerza de corte", calculos.fuerzaCorteKN.toFixed(2), "kN", "Fuerza necesaria para cizalla"],
      ["Torque requerido (Seguro)", calculos.torqueSeguroNm.toFixed(2), "N-m", "Incluye factor de seguridad"],
      ["Potencia estimada desbobinado", calculos.potenciaMecanicaDesbobinadoKw.toFixed(2), "kW", "Potencia mecanica util"],
      ["Potencia instalada total", calculos.potenciaInstaladaTotalKw.toFixed(2), "kW", "Suma de modulos activos"],
      ["Cuello de botella", calculos.cuelloBotellaModulo, "Modulo", `Capacidad limitante: ${calculos.cuelloBotellaCapacidad} kg/h`],
      ["Indice de riesgo", calculos.scoreRiesgo, "Score 0-100", `Nivel: ${calculos.clasificacionRiesgo}`]
    ];

    const csvContent = "data:text/csv;charset=utf-8," 
      + rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "Carrier_Simulador_Resultados.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- IMPRIMIR / PDF ---
  const imprimirPantalla = () => {
    window.print();
  };

  // --- CONTROLADOR DE ACTIVACIÓN DE MÓDULO ---
  const toggleModulo = (id: string) => {
    setModulos(prev => prev.map(m => m.id === id ? { ...m, activo: !m.activo } : m));
  };

  const setPotenciaModulo = (id: string, kw: number) => {
    setModulos(prev => prev.map(m => m.id === id ? { ...m, potenciaInstalada: kw } : m));
  };

  const setCapacidadModulo = (id: string, kgh: number) => {
    setModulos(prev => prev.map(m => m.id === id ? { ...m, capacidadNominal: kgh } : m));
  };

  // --- RENDERIZADO DEL GEMELO DIGITAL (CANVAS 3D) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frameId: number;
    let time = 0;

    const render = () => {
      time += 0.02;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Dimensiones del canvas
      const cx = canvas.width / 2;
      const cy = canvas.height / 2 + 30;

      // Matriz de proyección isométrica muy simple basada en rotacionX y rotacionY
      const project = (x: number, y: number, z: number) => {
        // Rotación alrededor de Y (eje vertical)
        const cosY = Math.cos(rotacionY);
        const sinY = Math.sin(rotacionY);
        const x1 = x * cosY - z * sinY;
        const z1 = x * sinY + z * cosY;

        // Rotación alrededor de X (inclinación de cámara)
        const cosX = Math.cos(rotacionX);
        const sinX = Math.sin(rotacionX);
        const y2 = y * cosX - z1 * sinX;
        const z2 = y * sinX + z1 * cosX;

        // Proyección simple con Zoom
        const scale = 45 * zoomCanvas;
        return {
          x: cx + x1 * scale,
          y: cy - y2 * scale,
          z: z2
        };
      };

      // --- DIBUJAR CUADRÍCULA DE SUELO INDUSTRIAL ---
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.4)';
      ctx.lineWidth = 1;
      const gridSize = 10;
      for (let i = -gridSize; i <= gridSize; i++) {
        // Líneas paralelas a Z
        const p1 = project(i, -1.5, -gridSize);
        const p2 = project(i, -1.5, gridSize);
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();

        // Líneas paralelas a X
        const p3 = project(-gridSize, -1.5, i);
        const p4 = project(gridSize, -1.5, i);
        ctx.beginPath();
        ctx.moveTo(p3.x, p3.y);
        ctx.lineTo(p4.x, p4.y);
        ctx.stroke();
      }

      // --- DIBUJAR LOS MÓDULOS DE PROCESO EN 3D ---
      // Definimos posiciones 3D para cada módulo a lo largo de la línea (X aumenta)
      const posicionesModulos = [
        { id: 'banda_entrada', label: 'B. Entrada', x: -6, z: 0, w: 1.2, h: 0.4, d: 0.6, color: '#3b82f6' },
        { id: 'desbobinadora', label: 'Desbobinadora', x: -4, z: 0, w: 1.5, h: 1.8, d: 1.2, color: '#8b5cf6' },
        { id: 'dancer', label: 'Dancer arm', x: -2, z: 0, w: 0.8, h: 1.4, d: 0.8, color: '#00F0FF' },
        { id: 'alimentador', label: 'Alimentador', x: -0.5, z: 0, w: 0.8, h: 0.8, d: 0.8, color: '#3b82f6' },
        { id: 'cizalla', label: 'Cizalla Rot.', x: 1, z: 0, w: 1.0, h: 1.2, d: 1.0, color: '#ec4899' },
        { id: 'trituradora', label: 'Trituradora M1200', x: 2.5, z: 0, w: 1.6, h: 1.6, d: 1.4, color: '#f59e0b' },
        { id: 'banda_salida_trit', label: 'B. Trituradora', x: 4.2, z: 0, w: 1.4, h: 0.5, d: 0.6, color: '#3b82f6' },
        { id: 'molino', label: 'Molino Gran.', x: 6.0, z: 0, w: 1.5, h: 1.7, d: 1.3, color: '#10b981' },
        { id: 'banda_salida_mol', label: 'B. Molino', x: 7.6, z: 0, w: 1.4, h: 0.5, d: 0.6, color: '#3b82f6' },
        { id: 'tolva', label: 'Tolva Pulmón', x: 9.0, z: 0, w: 1.3, h: 2.2, d: 1.3, color: '#f59e0b' },
        { id: 'briqueteadora', label: 'Briqueteadora', x: 11.0, z: 0, w: 1.7, h: 1.9, d: 1.5, color: '#8b5cf6' },
        { id: 'banda_salida_briq', label: 'B. Salida B.', x: 12.8, z: 0, w: 1.4, h: 0.4, d: 0.6, color: '#3b82f6' },
        { id: 'carritos', label: 'Carritos Descarga', x: 14.5, z: 0, w: 1.2, h: 0.8, d: 1.0, color: '#6b7280' }
      ];

      // Ordenar módulos por profundidad Z proyectada para que se pinten correctamente de atrás hacia adelante (Painter's algorithm)
      const modulosProyectados = posicionesModulos.map(m => {
        const pState = modulos.find(mod => mod.id === m.id);
        const activo = pState?.activo || false;
        
        // Coordenadas proyectadas del centro del bloque
        const projCenter = project(m.x, 0, m.z);

        return {
          ...m,
          activo,
          projCenter,
          zDepth: projCenter.z
        };
      }).sort((a, b) => b.zDepth - a.zDepth);

      // Dibujar cada bloque
      modulosProyectados.forEach(m => {
        const activo = m.activo;
        
        // Color de dibujo
        let blockColor = '#374151'; // Gris por defecto (inactivo)
        let strokeColor = '#4b5563';
        let glowColor = 'transparent';

        if (activo) {
          blockColor = m.color;
          strokeColor = '#ffffff';
          if (m.id === 'trituradora' && calculos.alertaSobrecarga) {
            blockColor = '#ef4444'; // Alerta de sobrecarga
            glowColor = 'rgba(239, 68, 68, 0.4)';
          } else {
            glowColor = `${m.color}33`;
          }
        }

        // Definir los 8 vértices del cubo 3D
        const dx = m.w / 2;
        const dy = m.h / 2;
        const dz = m.d / 2;
        const yOffset = -1.5 + dy; // apoya en el suelo y = -1.5

        const vertices = [
          project(m.x - dx, yOffset - dy, m.z - dz), // 0
          project(m.x + dx, yOffset - dy, m.z - dz), // 1
          project(m.x + dx, yOffset + dy, m.z - dz), // 2
          project(m.x - dx, yOffset + dy, m.z - dz), // 3
          project(m.x - dx, yOffset - dy, m.z + dz), // 4
          project(m.x + dx, yOffset - dy, m.z + dz), // 5
          project(m.x + dx, yOffset + dy, m.z + dz), // 6
          project(m.x - dx, yOffset + dy, m.z + dz)  // 7
        ];

        // Caras: definimos cada una por el índice de sus vértices
        const faces = [
          { indices: [0, 1, 2, 3], colorFactor: 0.85 }, // Atrás
          { indices: [1, 5, 6, 2], colorFactor: 0.70 }, // Derecha
          { indices: [4, 5, 6, 7], colorFactor: 1.00 }, // Adelante
          { indices: [0, 4, 7, 3], colorFactor: 0.75 }, // Izquierda
          { indices: [3, 2, 6, 7], colorFactor: 1.15 }  // Arriba
        ];

        // Dibujar caras
        faces.forEach(f => {
          ctx.beginPath();
          ctx.moveTo(vertices[f.indices[0]].x, vertices[f.indices[0]].y);
          for (let i = 1; i < f.indices.length; i++) {
            ctx.lineTo(vertices[f.indices[i]].x, vertices[f.indices[i]].y);
          }
          ctx.closePath();

          // Crear iluminación básica aplicando el factor de color
          ctx.fillStyle = blockColor;
          ctx.fill();

          // Aplicar sombreado para dar sensación 3D
          ctx.fillStyle = `rgba(0, 0, 0, ${1 - f.colorFactor})`;
          ctx.fill();

          ctx.strokeStyle = strokeColor;
          ctx.lineWidth = 1;
          ctx.stroke();
        });

        // --- DETALLES DE ANIMACIÓN Y COMPONENTES ---
        // A) Rollo de tubo de cobre en la Desbobinadora
        if (m.id === 'desbobinadora' && activo) {
          ctx.save();
          const pRolloCenter = project(m.x, yOffset + 0.2, m.z);
          ctx.beginPath();
          ctx.arc(pRolloCenter.x, pRolloCenter.y, 25 * zoomCanvas * (diametroExteriorRollo / 3), 0, 2 * Math.PI);
          ctx.strokeStyle = '#f97316'; // Cobre
          ctx.lineWidth = 12 * (pesoRollo / 500);
          ctx.stroke();
          
          // Núcleo de acero del rollo
          ctx.beginPath();
          ctx.arc(pRolloCenter.x, pRolloCenter.y, 10 * zoomCanvas * (diametroInteriorRollo / 1.2), 0, 2 * Math.PI);
          ctx.fillStyle = '#4b5563';
          ctx.fill();
          ctx.restore();
        }

        // B) Dancer arm (Animación oscilante)
        if (m.id === 'dancer' && activo) {
          const dancerAngle = Math.sin(time * 3) * 0.15;
          const armEnd = project(m.x + Math.sin(dancerAngle) * 0.4, yOffset - 0.4 + Math.cos(dancerAngle) * 0.4, m.z);
          const armStart = project(m.x, yOffset + 0.3, m.z);
          ctx.beginPath();
          ctx.moveTo(armStart.x, armStart.y);
          ctx.lineTo(armEnd.x, armEnd.y);
          ctx.strokeStyle = '#00F0FF';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // C) Cizalla rotativa (Corte animado de cobre)
        if (m.id === 'cizalla' && activo) {
          const shearY = yOffset + Math.abs(Math.sin(time * 5)) * 0.4;
          const bladeTop = project(m.x, shearY + 0.3, m.z);
          const bladeBottom = project(m.x, shearY - 0.1, m.z);
          ctx.beginPath();
          ctx.moveTo(bladeTop.x, bladeTop.y);
          ctx.lineTo(bladeBottom.x, bladeBottom.y);
          ctx.strokeStyle = '#f43f5e';
          ctx.lineWidth = 4;
          ctx.stroke();
        }

        // D) Trituradora M1200 en funcionamiento
        if (m.id === 'trituradora' && activo) {
          ctx.save();
          const pTritCenter = project(m.x, yOffset + 0.1, m.z);
          ctx.beginPath();
          ctx.arc(pTritCenter.x, pTritCenter.y, 14 * zoomCanvas, 0, 2 * Math.PI);
          ctx.fillStyle = '#1e293b';
          ctx.fill();
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 2;
          ctx.stroke();
          
          // Cuchillas internas giratorias
          const bladesCount = 6;
          for (let b = 0; b < bladesCount; b++) {
            const angle = time * 4 + (b * (Math.PI * 2) / bladesCount);
            const bx = pTritCenter.x + Math.cos(angle) * 12;
            const by = pTritCenter.y + Math.sin(angle) * 12;
            ctx.beginPath();
            ctx.moveTo(pTritCenter.x, pTritCenter.y);
            ctx.lineTo(bx, by);
            ctx.strokeStyle = '#ef4444';
            ctx.lineWidth = 2;
            ctx.stroke();
          }
          ctx.restore();
        }

        // E) Molino Granulador con partículas de cobre volando
        if (m.id === 'molino' && activo && animando) {
          const pMolCenter = project(m.x, yOffset + 0.3, m.z);
          for (let p = 0; p < 8; p++) {
            const px = pMolCenter.x + (Math.sin(time * 10 + p) * 15);
            const py = pMolCenter.y - (Math.abs(Math.cos(time * 8 + p)) * 20);
            ctx.beginPath();
            ctx.arc(px, py, 2, 0, 2 * Math.PI);
            ctx.fillStyle = '#f97316'; // partículas color cobre
            ctx.fill();
          }
        }

        // F) Briqueteadora comprimiendo cobre
        if (m.id === 'briqueteadora' && activo) {
          const compressCycle = Math.abs(Math.sin(time * 2)) * 12;
          const pBriqCenter = project(m.x, yOffset, m.z);
          // Matriz/Pistón izquierdo
          ctx.fillStyle = '#94a3b8';
          ctx.fillRect(pBriqCenter.x - 20 + compressCycle, pBriqCenter.y - 10, 10, 20);
          // Matriz/Pistón derecho
          ctx.fillRect(pBriqCenter.x + 10 - compressCycle, pBriqCenter.y - 10, 10, 20);
        }

        // G) Tubo de cobre fluyendo entre desbobinadora y cizalla
        if (activo && m.x > -4 && m.x < 1 && animando) {
          ctx.beginPath();
          const pStart = project(-4, -0.7, 0);
          const pEnd = project(1, -0.9, 0);
          
          // Dibujar trayectoria del tubo ondulada
          ctx.moveTo(pStart.x, pStart.y);
          const pDancer = project(-2, -0.6 + Math.sin(time * 3) * 0.15, 0);
          const pAlim = project(-0.5, -0.9, 0);
          
          ctx.bezierCurveTo(pDancer.x, pDancer.y, pAlim.x, pAlim.y, pEnd.x, pEnd.y);
          ctx.strokeStyle = '#f97316'; // Color cobre
          ctx.lineWidth = 4 * (diametroExteriorTubo / 9.52);
          ctx.stroke();
        }

        // --- GLOW INDICATOR LIGHT ---
        if (glowColor !== 'transparent') {
          ctx.save();
          ctx.shadowColor = blockColor;
          ctx.shadowBlur = 15;
          ctx.beginPath();
          const pLight = project(m.x, yOffset + dy + 0.3, m.z);
          ctx.arc(pLight.x, pLight.y, 4, 0, 2 * Math.PI);
          ctx.fillStyle = blockColor;
          ctx.fill();
          ctx.restore();
        }

        // --- TEXT LABELS IN 3D SPACE ---
        ctx.save();
        ctx.fillStyle = activo ? '#ffffff' : '#6b7280';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        const pLabel = project(m.x, yOffset + dy + 0.6, m.z);
        ctx.fillText(m.label, pLabel.x, pLabel.y);
        
        // Mostrar potencia real activa encima
        if (activo) {
          ctx.fillStyle = '#00F0FF';
          ctx.font = '8px monospace';
          ctx.fillText(`${m.potenciaInstalada}kW`, pLabel.x, pLabel.y - 10);
        }
        ctx.restore();
      });

      // Dibujar línea del flujo del cobre con flechas sutiles
      ctx.save();
      ctx.strokeStyle = 'rgba(249, 115, 22, 0.4)';
      ctx.lineWidth = 2;
      const fStart = project(-6.5, -1.2, 0);
      const fEnd = project(15, -1.2, 0);
      ctx.beginPath();
      ctx.moveTo(fStart.x, fStart.y);
      ctx.lineTo(fEnd.x, fEnd.y);
      ctx.stroke();
      ctx.restore();

      // Info de cámara en esquina inferior derecha
      ctx.fillStyle = '#6b7280';
      ctx.font = '9px monospace';
      ctx.fillText(`Cam RotX: ${rotacionX.toFixed(2)} | RotY: ${rotacionY.toFixed(2)} | Zoom: ${zoomCanvas.toFixed(1)}x`, 20, canvas.height - 20);

      if (animando) {
        frameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      cancelAnimationFrame(frameId);
    };
  }, [
    animando, rotacionX, rotacionY, zoomCanvas, modulos, 
    diametroExteriorRollo, diametroInteriorRollo, pesoRollo, 
    diametroExteriorTubo, calculos.alertaSobrecarga
  ]);

  // --- CONTROL DE RATÓN (ARRASTRAR PARA ORBITAR EL CANVAS) ---
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    isDragging.current = true;
    previousMousePosition.current = {
      x: e.clientX,
      y: e.clientY
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;
    
    setRotacionY(prev => prev + deltaX * 0.007);
    setRotacionX(prev => Math.max(-0.2, Math.min(1.2, prev + deltaY * 0.007))); // Límites de cámara

    previousMousePosition.current = {
      x: e.clientX,
      y: e.clientY
    };
  };

  const handleMouseUpOrLeave = () => {
    isDragging.current = false;
  };

  // --- DATOS PARA GRÁFICAS DE COMPORTAMIENTO ---
  const chartModulosData = useMemo(() => {
    return modulos.map(m => ({
      name: m.nombre,
      'Capacidad (kg/h)': m.activo ? m.capacidadNominal : 0,
      'Potencia (kW)': m.activo ? m.potenciaInstalada : 0
    }));
  }, [modulos]);

  const chartBalanceCargaData = useMemo(() => {
    return [
      { name: 'Flujo Requerido', 'Masa kg/h': Math.round(calculos.capacidadRequeridaKgH) },
      { name: 'Cuello de Botella', 'Masa kg/h': calculos.cuelloBotellaCapacidad === Infinity ? 0 : calculos.cuelloBotellaCapacidad }
    ];
  }, [calculos]);

  return (
    <div className="min-h-screen bg-[#08080a] text-gray-200 p-4 md:p-8">
      
      {/* 1. ENCABEZADO */}
      <header className="mb-8 border-b border-[#1b1b22] pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
              <Cpu className="w-6 h-6 animate-pulse" />
            </span>
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white">
              Simulador Técnico – Rollos de Tubo de Cobre
            </h1>
          </div>
          <p className="text-gray-500 mt-2 font-semibold tracking-widest uppercase text-xs">
            Desbobinado | Corte | Trituración | Molienda | Briqueteado · Proyecto Carrier
          </p>
        </div>

        {/* Acciones principales de cabecera */}
        <div className="flex items-center gap-3 no-print">
          <button
            onClick={() => setAnimando(!animando)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest border transition-all ${
              animando 
                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-glow-cyan" 
                : "bg-gray-800/30 border-gray-700 text-gray-400"
            }`}
          >
            {animando ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            {animando ? "Animación ON" : "Animación OFF"}
          </button>

          <button
            onClick={imprimirPantalla}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-850 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-300 transition-all font-bold text-xs uppercase tracking-widest"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            Imprimir / PDF
          </button>

          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-850 hover:bg-gray-800 border border-gray-700 hover:border-gray-500 text-gray-300 transition-all font-bold text-xs uppercase tracking-widest"
          >
            <FileSpreadsheet className="w-4 h-4 text-green-400" />
            CSV
          </button>
        </div>
      </header>

      {/* ALERTAS DE VALIDACIÓN */}
      {!validaciones.valido && (
        <div className="mb-8 p-4 rounded-2xl bg-red-950/20 border border-red-500/40 text-red-200">
          <h3 className="font-bold flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            Error en configuración del simulador
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-300">
            {validaciones.errores.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* GRID DE PANTALLA PRINCIPAL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* PARTE IZQUIERDA: CONFIGURACIONES (5 COLS) */}
        <div className="lg:col-span-5 space-y-8 no-print">
          
          {/* 2. CONFIGURACIÓN DEL ROLLO */}
          <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24]">
            <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
              <Sliders className="w-4 h-4 text-blue-400" />
              2. Configuración del Rollo Maestro
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Ø Exterior Rollo (m)</label>
                <input 
                  type="number" 
                  step="0.05"
                  value={diametroExteriorRollo} 
                  onChange={(e) => setDiametroExteriorRollo(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#17171e] border border-[#272733] hover:border-gray-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm font-black text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Ø Interior Rollo (m)</label>
                <input 
                  type="number" 
                  step="0.05"
                  value={diametroInteriorRollo} 
                  onChange={(e) => setDiametroInteriorRollo(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#17171e] border border-[#272733] hover:border-gray-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm font-black text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Altura del Rollo (m)</label>
                <input 
                  type="number" 
                  step="0.05"
                  value={alturaRollo} 
                  onChange={(e) => setAlturaRollo(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#17171e] border border-[#272733] hover:border-gray-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm font-black text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Peso del Rollo (kg)</label>
                <input 
                  type="number" 
                  step="25"
                  value={pesoRollo} 
                  onChange={(e) => setPesoRollo(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#17171e] border border-[#272733] hover:border-gray-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm font-black text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Vel. Desbobinado (m/min)</label>
                <input 
                  type="number" 
                  step="0.5"
                  value={velocidadDesbobinado} 
                  onChange={(e) => setVelocidadDesbobinado(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#17171e] border border-[#272733] hover:border-gray-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm font-black text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Coef. Fricción Estimado</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={coefFriccion} 
                  onChange={(e) => setCoefFriccion(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#17171e] border border-[#272733] hover:border-gray-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm font-black text-white focus:outline-none"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Factor de Seguridad Mecánica (F.S.)</label>
                <input 
                  type="number" 
                  step="0.1"
                  value={factorSeguridad} 
                  onChange={(e) => setFactorSeguridad(parseFloat(e.target.value) || 0)}
                  className="w-full bg-[#17171e] border border-[#272733] hover:border-gray-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm font-black text-white focus:outline-none"
                />
              </div>
            </div>
          </section>

          {/* 3. CONFIGURACIÓN DEL TUBO */}
          <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24]">
            <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
              <Wrench className="w-4 h-4 text-cyan-400" />
              3. Especificación del Tubo de Cobre
            </h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Ø Exterior Tubo (mm)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={diametroExteriorTubo} 
                    onChange={(e) => setDiametroExteriorTubo(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#17171e] border border-[#272733] hover:border-gray-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm font-black text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-400 uppercase mb-2">Ø Interior Tubo (mm)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={diametroInteriorTubo} 
                    onChange={(e) => setDiametroInteriorTubo(parseFloat(e.target.value) || 0)}
                    className="w-full bg-[#17171e] border border-[#272733] hover:border-gray-600 focus:border-cyan-500 rounded-xl px-3 py-2 text-sm font-black text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Parámetros estáticos del Cobre */}
              <div className="p-4 rounded-2xl bg-gray-900/30 border border-[#222] grid grid-cols-2 gap-y-3 gap-x-4">
                <div>
                  <span className="text-[10px] text-gray-500 block">Espesor Calculado:</span>
                  <span className="text-xs font-black text-cyan-400">{calculos.espesorTuboMm.toFixed(2)} mm</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Material:</span>
                  <span className="text-xs font-black text-white">Cobre Puro</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Densidad Material:</span>
                  <span className="text-xs font-bold text-white">8,960 kg/m³</span>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Resistencia al Corte (MPa):</span>
                  <input
                    type="number"
                    value={resistenciaCorte}
                    onChange={(e) => setResistenciaCorte(parseFloat(e.target.value) || 0)}
                    className="w-full max-w-[80px] bg-transparent text-xs font-black text-white border-b border-gray-700 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Límite Elástico (MPa):</span>
                  <input
                    type="number"
                    value={limiteElastico}
                    onChange={(e) => setLimiteElastico(parseFloat(e.target.value) || 0)}
                    className="w-full max-w-[80px] bg-transparent text-xs font-black text-white border-b border-gray-700 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 block">Extractor de Polvo:</span>
                  <label className="relative inline-flex items-center cursor-pointer mt-1">
                    <input 
                      type="checkbox" 
                      checked={extractorPolvoActivo} 
                      onChange={(e) => setExtractorPolvoActivo(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-7 h-4 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-cyan-500"></div>
                  </label>
                </div>
              </div>
            </div>
          </section>

          {/* INDICADORES CLAVE RÁPIDOS */}
          <section className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] flex flex-col justify-between">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Flujo de Masa Requerido</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-black text-white">{Math.round(calculos.capacidadRequeridaKgH)}</span>
                <span className="text-xs text-gray-500">kg/h</span>
              </div>
            </div>

            <div className={`p-4 rounded-3xl border flex flex-col justify-between transition-colors ${
              calculos.clasificacionRiesgo === 'Alto'
                ? "bg-red-950/20 border-red-500/30"
                : calculos.clasificacionRiesgo === 'Medio'
                  ? "bg-amber-950/20 border-amber-500/30"
                  : "bg-green-950/20 border-green-500/30"
            }`}>
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-wider">Score de Riesgo</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className={`text-xl font-black ${
                  calculos.clasificacionRiesgo === 'Alto' ? "text-red-500" : calculos.clasificacionRiesgo === 'Medio' ? "text-amber-500" : "text-green-500"
                }`}>{calculos.scoreRiesgo}</span>
                <span className="text-xs text-gray-500 uppercase tracking-widest">{calculos.clasificacionRiesgo}</span>
              </div>
            </div>
          </section>

        </div>

        {/* PARTE DERECHA: GEMELO DIGITAL Y MÓDULOS (7 COLS) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* VISUALIZADOR 3D / GEMELO DIGITAL */}
          <section className="rounded-3xl bg-[#0f0f13] border border-[#1d1d24] overflow-hidden flex flex-col print-card">
            <div className="px-6 py-4 border-b border-[#1b1b22] flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-black uppercase tracking-widest text-white">Gemelo Digital Interactivo (Canvas 3D)</span>
              </div>
              <div className="text-[10px] text-gray-500 font-bold">
                *Arrastra para rotar la perspectiva | Scroll para zoom
              </div>
            </div>

            {/* Area de Renderizado Canvas */}
            <div className="relative bg-[#050507] h-[280px] w-full cursor-grab active:cursor-grabbing">
              <canvas 
                ref={canvasRef}
                width={800}
                height={280}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUpOrLeave}
                onMouseLeave={handleMouseUpOrLeave}
                className="w-full h-full block"
              />

              {/* Botones de Control de Cámara Rápidos */}
              <div className="absolute bottom-4 right-4 flex gap-1.5 no-print">
                <button
                  onClick={() => setZoomCanvas(z => Math.max(0.6, z - 0.1))}
                  className="w-7 h-7 rounded-lg bg-gray-900/80 border border-gray-700 text-white flex items-center justify-center text-xs font-bold hover:bg-gray-800"
                  title="Zoom Out"
                >
                  -
                </button>
                <button
                  onClick={() => setZoomCanvas(z => Math.min(2.0, z + 0.1))}
                  className="w-7 h-7 rounded-lg bg-gray-900/80 border border-gray-700 text-white flex items-center justify-center text-xs font-bold hover:bg-gray-800"
                  title="Zoom In"
                >
                  +
                </button>
                <button
                  onClick={() => {
                    setRotacionX(0.4);
                    setRotacionY(0.6);
                    setZoomCanvas(1.0);
                  }}
                  className="w-7 h-7 rounded-lg bg-gray-900/80 border border-gray-700 text-white flex items-center justify-center text-xs hover:bg-gray-800"
                  title="Reiniciar Vista"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </section>

          {/* 10. DIAGRAMA SIMPLE */}
          <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] print-card">
            <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
              <Layers className="w-4 h-4 text-cyan-400" />
              Esquema Secuencial de Flujo
            </h2>
            <div className="flex flex-wrap items-center justify-start gap-y-4 gap-x-2 p-4 bg-gray-950/40 rounded-2xl border border-gray-900/50">
              {modulos.map((m, idx) => {
                const isTrituradoraSobrecarga = m.id === 'trituradora' && calculos.alertaSobrecarga;
                const isMolinoPolvo = m.id === 'molino' && m.activo && !extractorPolvoActivo;

                let badgeColor = "bg-gray-900 border-gray-800 text-gray-500";
                if (m.activo) {
                  if (isTrituradoraSobrecarga || isMolinoPolvo) {
                    badgeColor = "bg-red-500/10 border-red-500/40 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.15)]";
                  } else {
                    badgeColor = "bg-cyan-500/10 border-cyan-500/40 text-cyan-400";
                  }
                }

                return (
                  <React.Fragment key={m.id}>
                    <div className={`px-3 py-1.5 rounded-xl border text-[11px] font-black uppercase tracking-wider ${badgeColor} transition-all`}>
                      {m.nombre}
                    </div>
                    {idx < modulos.length - 1 && (
                      <span className="text-gray-700 font-bold select-none px-0.5">→</span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>
          </section>

          {/* 4. CONFIGURACIÓN DE LOS MÓDULOS DEL PROCESO */}
          <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] no-print">
            <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
              <Cpu className="w-4 h-4 text-blue-400" />
              4. Módulos y Equipos del Proceso
            </h2>
            
            <div className="space-y-3 max-h-[420px] overflow-y-auto pr-2">
              {modulos.map((m) => {
                const isTrituradoraAlerta = m.id === 'trituradora' && calculos.alertaSobrecarga;
                
                return (
                  <div 
                    key={m.id}
                    className={`p-4 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                      m.activo 
                        ? isTrituradoraAlerta 
                          ? "bg-red-950/10 border-red-500/40" 
                          : "bg-gray-900/50 border-[#222]" 
                        : "bg-gray-950/20 border-transparent opacity-60"
                    }`}
                  >
                    {/* Checkbox y Nombre */}
                    <div className="flex items-center gap-3 min-w-[240px]">
                      <input 
                        type="checkbox" 
                        checked={m.activo}
                        onChange={() => toggleModulo(m.id)}
                        className="w-4 h-4 rounded accent-cyan-500 bg-gray-800 border-gray-700"
                      />
                      <div>
                        <span className="text-sm font-bold text-white block">{m.nombre}</span>
                        <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider block">{m.comentarioRiesgo}</span>
                      </div>
                    </div>

                    {/* Inputs de Potencia e Instalación */}
                    <div className="flex items-center gap-4 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Potencia (kW):</span>
                        <input 
                          type="number"
                          value={m.potenciaInstalada}
                          disabled={!m.activo}
                          onChange={(e) => setPotenciaModulo(m.id, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-gray-950 border border-gray-800 hover:border-gray-600 focus:border-cyan-500 rounded-lg px-2 py-1 text-xs font-black text-center text-white disabled:opacity-40"
                        />
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-500 font-bold uppercase">Capacidad (kg/h):</span>
                        <input 
                          type="number"
                          value={m.capacidadNominal}
                          disabled={!m.activo}
                          onChange={(e) => setCapacidadModulo(m.id, parseInt(e.target.value) || 0)}
                          className="w-20 bg-gray-950 border border-gray-800 hover:border-gray-600 focus:border-cyan-500 rounded-lg px-2 py-1 text-xs font-black text-center text-white disabled:opacity-40"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

        </div>

      </div>

      {/* SECCIÓN INFERIOR: GRÁFICAS Y ANÁLISIS COMPLEMENTARIOS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
        
        {/* GRÁFICAS RECHARTS */}
        <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] no-print">
          <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
            <Activity className="w-4 h-4 text-cyan-400" />
            Balance Operativo de la Línea (kg/h)
          </h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartBalanceCargaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 41, 59, 0.4)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} fontWeight="bold" />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f0f13', borderColor: '#1d1d24', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#fff' }}
                />
                <Bar dataKey="Masa kg/h" fill="#3b82f6" radius={[8, 8, 0, 0]}>
                  <Cell fill="#00F0FF" />
                  <Cell fill={calculos.alertaSobrecarga ? "#f43f5e" : "#10b981"} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-gray-500 mt-4 leading-relaxed font-semibold italic text-center">
            *Si el Flujo Requerido supera al Cuello de Botella, la barra limitadora cambiará a rojo indicando una condición de atasco.
          </p>
        </section>

        {/* GRÁFICA DE POTENCIAS POR EQUIPO */}
        <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] no-print">
          <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
            <Zap className="w-4 h-4 text-amber-400" />
            Distribución de Potencia de Módulos Activos (kW)
          </h2>
          <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartModulosData.filter(m => m['Potencia (kW)'] > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(30, 41, 59, 0.4)" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                <YAxis stroke="#64748b" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f0f13', borderColor: '#1d1d24', borderRadius: '12px' }}
                  labelStyle={{ fontWeight: 'bold', color: '#fff' }}
                />
                <Bar dataKey="Potencia (kW)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

      </div>

      {/* DIAGNÓSTICOS, RECOMENDACIONES Y RESULTADOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
        
        {/* 6. DIAGNÓSTICO AUTOMÁTICO */}
        <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] print-card">
          <h2 className="text-sm font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
            <ShieldAlert className="w-4 h-4 text-red-500" />
            6. Diagnóstico Automático
          </h2>
          {diagnosticos.length > 0 ? (
            <ul className="space-y-3">
              {diagnosticos.map((d, idx) => (
                <li 
                  key={idx} 
                  className="flex items-start gap-2.5 p-3 rounded-2xl bg-red-950/15 border border-red-500/20 text-xs font-bold text-red-300 leading-normal"
                >
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  {d}
                </li>
              ))}
            </ul>
          ) : (
            <div className="flex items-center gap-3 p-4 rounded-2xl bg-green-950/15 border border-green-500/20 text-xs font-bold text-green-400">
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
              Línea operativa estable y sin alertas de configuración críticas.
            </div>
          )}
        </section>

        {/* 7. RECOMENDACIONES DE INGENIERÍA */}
        <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] print-card">
          <h2 className="text-sm font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
            <CheckCircle2 className="w-4 h-4 text-green-400" />
            7. Recomendaciones de Ingeniería
          </h2>
          <ul className="space-y-2.5">
            {recomendaciones.map((rec, idx) => (
              <li 
                key={idx} 
                className="flex items-start gap-2 p-2.5 rounded-xl bg-gray-900/40 text-xs font-semibold text-gray-300 leading-normal"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-2"></span>
                {rec}
              </li>
            ))}
          </ul>
        </section>

        {/* ESTATUS DEL CUELLO DE BOTELLA */}
        <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] flex flex-col justify-between print-card">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-white mb-4 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
              <Info className="w-4 h-4 text-cyan-400" />
              Análisis de Capacidad
            </h2>
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Módulo Limitante (Cuello Botella)</span>
                <span className="text-sm font-black text-white">{calculos.cuelloBotellaModulo}</span>
              </div>

              <div>
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Capacidad Máxima Real de la Línea</span>
                <span className="text-sm font-black text-white">{calculos.cuelloBotellaCapacidad} kg/h</span>
              </div>

              <div>
                <span className="text-[10px] text-gray-500 block uppercase font-bold">Capacidad Requerida por Desbobinado</span>
                <span className={`text-sm font-black ${calculos.alertaSobrecarga ? "text-red-500" : "text-cyan-400"}`}>
                  {calculos.capacidadRequeridaKgH.toFixed(2)} kg/h
                </span>
              </div>
            </div>
          </div>

          {calculos.alertaSobrecarga && (
            <div className="mt-6 p-4 rounded-2xl bg-red-950/20 border border-red-500/30 flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 animate-bounce shrink-0" />
              <div className="text-[11px] font-bold text-red-300 leading-normal">
                ¡ALERTA!: La capacidad requerida ({Math.round(calculos.capacidadRequeridaKgH)} kg/h) supera el cuello de botella. Se acumulará material en el proceso.
              </div>
            </div>
          )}
        </section>

      </div>

      {/* 8. TABLA DE RESULTADOS COMPLETOS */}
      <section className="p-6 rounded-3xl bg-[#0f0f13] border border-[#1d1d24] mt-8 print-card">
        <h2 className="text-sm font-black uppercase tracking-widest text-white mb-6 flex items-center gap-2 border-b border-[#1b1b22] pb-3">
          <Layers className="w-4 h-4 text-blue-400" />
          8. Matriz de Resultados Técnicos Consolidados
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-[#1b1b22] text-gray-400 uppercase text-[10px] font-black tracking-wider">
                <th className="py-3 px-4">Variable del Sistema</th>
                <th className="py-3 px-4">Valor Simulado</th>
                <th className="py-3 px-4">Unidad</th>
                <th className="py-3 px-4">Comentario de Ingeniería</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171720] font-semibold text-gray-300">
              
              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Área metálica del tubo</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.areaMetalicaM2.toFixed(8)}</td>
                <td className="py-3.5 px-4 text-gray-500">m²</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Sección neta del material conductor de cobre.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Peso por metro</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.pesoMetroKgM.toFixed(4)}</td>
                <td className="py-3.5 px-4 text-gray-500">kg/m</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Carga de gravedad unitaria lineal para transporte y esfuerzos.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Longitud total estimada</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.longitudTotalM.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-gray-500">m</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Distancia lineal total contenida en el rollo de peso configurado.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Tiempo de desbobinado</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.tiempoDesbobinadoMin.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-gray-500">minutos</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Ciclo operativo total necesario para procesar el peso de rollo completo.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Capacidad requerida</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.capacidadRequeridaKgH.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-gray-500">kg/h</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Rendimiento continuo mínimo para absorber la tasa de desbobinado.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Fuerza de corte estimada</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">
                  {calculos.fuerzaCorteKN.toFixed(2)} / {calculos.fuerzaCorteTon.toFixed(2)}
                </td>
                <td className="py-3.5 px-4 text-gray-500">kN / tonf</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Capacidad de fuerza perpendicular neta que la cizalla rotativa debe aplicar.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Torque requerido desbobinadora</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.torqueSeguroNm.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-gray-500">N·m</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Par de torsión seguro necesario considerando el factor multiplicador F.S.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Potencia estimada desbobinado</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.potenciaMecanicaDesbobinadoKw.toFixed(4)}</td>
                <td className="py-3.5 px-4 text-gray-500">kW</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Demanda útil mecánica en el árbol del motor desbobinador.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Potencia instalada total</td>
                <td className="py-3.5 px-4 font-mono text-cyan-400">{calculos.potenciaInstaladaTotalKw.toFixed(2)}</td>
                <td className="py-3.5 px-4 text-gray-500">kW</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Suma total de acometida eléctrica consumida por todos los módulos activos.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Cuello de botella</td>
                <td className="py-3.5 px-4 font-bold text-white">{calculos.cuelloBotellaModulo}</td>
                <td className="py-3.5 px-4 text-gray-500">Módulo</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">Punto restrictivo del sistema con la menor velocidad/capacidad nominal.</td>
              </tr>

              <tr>
                <td className="py-3.5 px-4 font-bold text-white">Índice de riesgo</td>
                <td className="py-3.5 px-4 font-mono text-red-400">{calculos.scoreRiesgo} / 100</td>
                <td className="py-3.5 px-4 text-gray-500">Score</td>
                <td className="py-3.5 px-4 text-xs font-medium text-gray-400">
                  Evaluación ponderada de riesgos operativos (Velocidades, dancer inactivo, etc.).
                </td>
              </tr>

            </tbody>
          </table>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-16 text-center text-xs text-gray-600 font-semibold uppercase tracking-widest no-print">
        Carrier Corp. Industrial Design Suite © 2026 - PANDORA 3.0 Platform
      </footer>

    </div>
  );
}
