
/**
 * PANDORA MCP TOOLS DEFINITION
 * Definición estructurada de herramientas para que ChatGPT las use como plugins.
 */
export const toolSchemas = [
  {
    name: "get_active_project_context",
    description: "Obtiene información detallada sobre el último proyecto activo de Pandora del usuario, incluyendo ID del proyecto, empresa asociada y estado del historial. Úsalo para establecer el contexto de trabajo.",
    inputSchema: {
      type: "object",
      properties: {
        user_id: { 
          type: "string", 
          description: "Opcional: ID del usuario para filtrar el contexto." 
        }
      }
    }
  },
  {
    name: "get_active_company_context",
    description: "Obtiene información detallada sobre la empresa asociada a un proyecto, incluyendo datos fiscales o corporativos registrados.",
    inputSchema: {
      type: "object",
      properties: {
        company_id: { 
          type: "string", 
          description: "ID de la empresa." 
        }
      },
      required: ["company_id"]
    }
  },
  {
    name: "search_scoped_memory",
    description: "Busca en la memoria persistente del proyecto para recuperar datos estructurados, preferencias o información de negocio guardada anteriormente.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { 
          type: "string", 
          description: "ID del proyecto." 
        },
        query: { 
          type: "string", 
          description: "Término de búsqueda." 
        }
      },
      required: ["project_id", "query"]
    }
  },
  {
    name: "analyze_project_risk",
    description: "Evalúa los riesgos estratégicos y operativos de un proyecto basándose en los datos actuales.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "ID del proyecto a analizar." }
      },
      required: ["project_id"]
    }
  },
  {
    name: "analyze_investment_case",
    description: "Genera un análisis de viabilidad financiera (ROI, Payback) para un caso de inversión.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "ID del proyecto." }
      },
      required: ["project_id"]
    }
  },
  {
    name: "generate_executive_summary",
    description: "Genera un resumen ejecutivo profesional y estructurado de la situación del proyecto.",
    inputSchema: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "ID del proyecto." }
      },
      required: ["project_id"]
    }
  }
];

/**
 * HANDLER PARA EJECUTAR LAS TOOLS
 */
import { adapter } from './adapter.js';

export async function handleToolCall(name, args) {
  const startTime = Date.now();
  console.log(`[MCP_TOOL_CALL] Invocando: ${name} | Args:`, JSON.stringify(args));
  
  let result;
  try {
    switch (name) {
      case "get_active_project_context":
        result = await adapter.getActiveProjectContext(args.user_id || 'default_user');
        break;
      case "get_active_company_context":
        result = await adapter.getActiveCompanyContext(args.company_id);
        break;
      case "search_scoped_memory":
        result = await adapter.searchScopedMemory(args.project_id, args.query);
        break;
      case "analyze_project_risk":
        result = await adapter.analyzeProjectRisk(args.project_id);
        break;
      case "analyze_investment_case":
        result = await adapter.analyzeInvestmentCase(args.project_id);
        break;
      case "generate_executive_summary":
        result = await adapter.generateExecutiveSummary(args.project_id);
        break;
      default:
        throw new Error(`Tool ${name} no disponible.`);
    }
    
    console.log(`[MCP_TOOL_SUCCESS] Invocó: ${name} | Duración: ${Date.now() - startTime}ms`);
    return result;
    
  } catch (error) {
    console.error(`[MCP_TOOL_ERROR] Fallo en ${name}:`, error.message);
    return { error: error.message };
  }
}
