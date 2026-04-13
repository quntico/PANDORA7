
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { 
  AlertTriangle, TrendingUp, Droplets, Settings, 
  Package, Target, Landmark, Brain, Factory, 
  BarChart3, ShieldEllipsis, FileText, ClipboardCheck 
} from 'lucide-react';


const VALUATION_PROMPT = `Actúa como un Auditor Financiero y Evaluador Industrial despiadado y altamente crítico. NO SEAS SUAVE. Busca e ilumina los vacíos, inconsistencias y riesgos ocultos del proyecto, sé agresivo en tu escrutinio financiero y operativo.

Divide la evaluación en 10 fases. Para cada fase debes extraer y entregar OBLIGATORIAMENTE:
1. "Datos Duros" (Cifras exactas, inversiones, TIR, capacidades. Si no hay datos, califícalo estrictamente de irresponsable).
2. "Impacto y Riesgos" (Aggresivo: quién pierde dinero, qué está incompleto o basado en humo).
3. "Semáforo de Certeza": OBLIGATORIO usar uno de estos 3 emojis para calificar al inicio del párrafo: \n- 🔴 [0-39%] PELIGRO (Datos faltantes o humo)\n- 🟡 [40-79%] PRECAUCIÓN (Datos incompletos o supuestos)\n- 🟢 [80-100%] VIABLE (Garantizado o sólido)

## FASE 1: EXPLORACIÓN INICIAL (Tipo, Objetivo, Ubicación, Actores)
## FASE 2: ANÁLISIS DE MERCADO (Demanda, Precios, Competencia - ¡exige cifras!)
## FASE 3: EVALUACIÓN TÉCNICA (Tecnología, Capacidad, Complejidad - ¡qué puede fallar!)
## FASE 4: EVALUACIÓN FINANCIERA (CAPEX, OPEX, Ingresos, ROI - ¡desmenuza el dinero!)
## FASE 5: EVALUACIÓN LEGAL / REGULATORIA (Permisos críticos)
## FASE 6: EVALUACIÓN AMBIENTAL Y SOCIAL (Impactos letales y comunidad)
## FASE 7: ANÁLISIS DE RIESGOS (Técnicos, Financieros, Operativos)
## FASE 8: INTEGRACIÓN (Inconsistencias cruzadas)
## FASE 9: ESTRUCTURACIÓN DEL PROYECTO (Quién pone la plata y quién cobra)
## FASE 10: DECISIÓN FINAL
(Dictamen crudo: 1. Semáforo Global en % | 2. Veredicto Implacable | 3. Recomendación de Inversión)

[MAPEO ESTRICTO DE SALIDA JSON V3]:
- templateId: "project_valuation"
- title: "AUDITORÍA DE 10 FASES"
- summary: ¡AQUÍ DEBES REDACTAR COMPLETAMENTE EL DESGLOSE DE LAS 10 FASES EN FORMATO MARKDOWN (## FASE 1, ## FASE 2, etc.)! ¡NO RESUMAS! Todo el texto inmenso de las 10 fases debe ir dentro de esta clave "summary".
- metrics: Crea exactamente 4 métricas financieras frías (Ej. INVERSIÓN TOTAL, TIR, PAYBACK, RIESGO %). ¡No las dejes vacías!
- charts: Genera EXACTAMENTE 3 GRÁFICAS: 1) type: "bar", title: "Score por Fase (0-100)" (Incluye la llave 'reason' en cada data point). 2) type: "pie", title: "Matriz de Distribución de Riesgos %" (Técnico, Financiero, etc). 3) type: "pie", title: "Distribución del Presupuesto (MUSD)".
- tables: Crea 1 tabla resumen consolidada con las 10 fases, su estatus, riesgos y Score Semáforo %.`;

const EXECUTIVE_TOOLS = [
  { id: "val", label: "Valuación 10 Fases", icon: <ClipboardCheck />, prompt: VALUATION_PROMPT, color: "text-neon-cyan" },
  { id: "risk", label: "Análisis Riesgo", icon: <AlertTriangle />, prompt: "Analiza riesgos y genera matriz/heatmap.", color: "text-red-400" },
  { id: "roi", label: "ROI / Rentas", icon: <TrendingUp />, prompt: "Calcula ROI/IRR con gráfica.", color: "text-neon-cyan" },
  { id: "cash", label: "Flujo Efectivo", icon: <Droplets />, prompt: "Genera flujo de efectivo con gráfica.", color: "text-blue-400" },
  { id: "cost", label: "Costos", icon: <Settings />, prompt: "Desglosa CAPEX/OPEX con pie chart.", color: "text-orange-400" },
  { id: "rev", label: "Ingresos", icon: <Package />, prompt: "Gráfica de ingresos y demanda.", color: "text-green-400" },
  { id: "scen", label: "Escenarios", icon: <Target />, prompt: "Comparativa gráfica de escenarios.", color: "text-neon-purple" },
  { id: "fin", label: "Finanzas", icon: <Landmark />, prompt: "Analiza deuda y apalancamiento.", color: "text-yellow-400" },
  { id: "strat", label: "Estrategia", icon: <Brain />, prompt: "Riesgos estratégicos y mercado.", color: "text-pink-400" },
  { id: "ops", label: "Operación", icon: <Factory />, prompt: "Eficiencia y cuellos de botella.", color: "text-cyan-400" },
  { id: "kpi", label: "KPI Dashboard", icon: <BarChart3 />, prompt: "Dashboard visual de KPIs.", color: "text-neon-cyan" },
  { id: "alert", label: "Alertas", icon: <ShieldEllipsis />, prompt: "Detección de riesgos críticos.", color: "text-red-500" },
  { id: "rep", label: "Reporte Full", icon: <FileText />, prompt: "Reporte ejecutivo completo con visuales.", color: "text-white" }
];


export default function ExecutiveActions({ onAction, isExpanded }) {
  const [hovered, setHovered] = React.useState(null);

  return (
    <div className={cn("flex flex-col gap-3 py-6 px-3 h-full items-center justify-start bg-white/[0.02] border-l border-white/5 transition-all w-full", isExpanded ? "items-stretch px-4" : "")}>
      {EXECUTIVE_TOOLS.map((tool) => (
        <div key={tool.id} className="relative flex items-center w-full">
          <motion.button
            whileHover={{ scale: isExpanded ? 1.05 : 1.2, x: isExpanded ? 5 : -5 }}
            whileTap={{ scale: 0.9 }}
            onMouseEnter={() => setHovered(tool.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onAction(tool.prompt)}
            title={tool.label}
            className={cn(
              "rounded-2xl flex items-center bg-white/[0.03] border border-white/5 hover:border-neon-cyan/40 hover:bg-neon-cyan/5 transition-all shadow-glow-sm cursor-pointer",
              isExpanded ? "w-full h-12 px-4 justify-start gap-3" : "w-12 h-12 justify-center",
              tool.color
            )}
          >
            <div className="flex-shrink-0">
              {React.cloneElement(tool.icon, { className: "w-5 h-5" })}
            </div>
            
            {isExpanded && (
              <span className="text-[11px] font-black uppercase tracking-[2px] text-white whitespace-nowrap">
                {tool.label}
              </span>
            )}
          </motion.button>

          <AnimatePresence>
            {!isExpanded && hovered === tool.id && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="absolute right-full mr-4 px-4 py-2 rounded-xl bg-black/90 border border-neon-cyan/30 backdrop-blur-xl whitespace-nowrap z-50 pointer-events-none"
              >
                <span className="text-[10px] font-black uppercase tracking-[3px] text-white">
                  {tool.label}
                </span>
                <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 w-2 h-2 bg-black border-r border-t border-neon-cyan/30 rotate-45" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ))}
    </div>
  );
}
