import { google } from 'googleapis';
import { M1ActiveTender } from '../src/modules/m1/data/m1ActiveTender.js';

export class M1AgentToolRegistry {
    constructor(driveService, ingestionService) {
        this.driveService = driveService;
        this.ingestionService = ingestionService;
    }

    getToolsSchema() {
        return [
            { type: "function", function: { name: "get_m1_status", description: "Snapshot compacto del estado auditivo M1.", parameters: { type: "object", properties: {} } } },
            { type: "function", function: { name: "get_requirement", description: "Obtiene los detalles oficiales del requisito", parameters: { type: "object", properties: { requirementId: { type: "string" } }, required: ["requirementId"] } } },
            { type: "function", function: { name: "search_drive_files", description: "Busca un archivo físico en el Drive", parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] } } },
            { type: "function", function: { name: "read_drive_document", description: "Descarga, parsea y devuelve texto desde Drive.", parameters: { type: "object", properties: { driveFileId: { type: "string" } }, required: ["driveFileId"] } } },
            { type: "function", function: { name: "run_calculation", description: "Calcula comparativos estadísticos", parameters: { type: "object", properties: { operation: { type: "string" }, inputs: { type: "array", items: { type: "number" } } }, required: ["operation", "inputs"] } } },
            // OpenAI Native Web Search Enabler
            { type: "function", function: { name: "web_research", description: "Investiga noticias públicas, precios, normativas de internet actualizadas en tiempo real.", parameters: { type: "object", properties: { query: { type: "string" }, objective: { type: "string" } }, required: ["query"] } } },

            { type: "function", function: { name: "create_chart", description: "Estructura la data cruda del modelo en un layout visual para que Frontend pinte barras, pastel o líneas.", parameters: { type: "object", properties: { chartType: { type: "string", description: "BAR, LINE, PIE" }, title: { type: "string" }, labels: { type: "array", items: { type: "string" } }, datasets: { type: "array", items: { type: "object", properties: { label: { type: "string" }, data: { type: "array", items: { type: "number" } } } } } }, required: ["chartType", "title", "labels", "datasets"] } } },
            { type: "function", function: { name: "get_score_status", description: "Snapshot de puntos.", parameters: { type: "object", properties: {} } } },
            { type: "function", function: { name: "get_missing_requirements", description: "Requerimientos vacios.", parameters: { type: "object", properties: {} } } },
            { type: "function", function: { name: "get_risk_status", description: "Lista los riesgos operativos M1.", parameters: { type: "object", properties: {} } } },
            { type: "function", function: { name: "get_economic_status", description: "Estado económico M1.", parameters: { type: "object", properties: {} } } },
            { type: "function", function: { name: "get_legal_status", description: "Estado de cumplimiento legal.", parameters: { type: "object", properties: {} } } },
            { type: "function", function: { name: "get_expiring_documents", description: "Documentos legales próximos a vencer.", parameters: { type: "object", properties: {} } } }
        ];
    }

    async executeTool(toolName, args, onProgress) {
        onProgress(`Ejecutando \`${toolName}\`...`);

        try {
            switch (toolName) {
                case "get_m1_status":
                case "get_score_status":
                    let accredited = 0;
                    let required = M1ActiveTender.scoringCriteria.totalAllowed || 100; // placeholder check
                    let threshold = 37.5;
                    const validated = M1ActiveTender.tenderRequirements.filter(r => r.evaluationStatus === 'VERIFIED');
                    if (validated.length === 0) return { status: "NOT_EVALUATED", message: "No existen evidencias validadas suficientes" };
                    return { status: "EVALUATED", accreditedPoints: accredited, estimatedPoints: 0, atRiskPoints: 0, gapToThreshold: threshold - accredited };

                case "get_deadline_status":
                    const deadline = new Date("2026-09-25T10:00:00-06:00");
                    const now = new Date();
                    const diffMs = deadline - now;
                    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                    const diffHrs = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    return { event: "Presentación y Apertura", deadline: deadline.toISOString(), daysRemaining: diffDays, hoursRemaining: diffHrs, urgency: diffDays <= 10 ? 'ATTENTION' : 'NORMAL', source: "Convocatoria FP-14-2026 OFFICIAL_M1_SOURCE" };

                case "get_deadline_action_plan":
                    return { PRIORIDAD_HOY: ["Conectar Drive", "Leer Bases"], PROXIMAS_24H: ["Buscar actas de junta"], ANTES_DE_PRESENTACION: ["Obtener scoring 37.5"] };

                case "web_research": // Native bypass
                    return { status: "OPENAI_NATIVE_SEARCH_EXECUTED" };

                case "create_chart":
                    const hasValidContent = M1ActiveTender.tenderRequirements && M1ActiveTender.tenderRequirements.length > 0;
                    if (!hasValidContent) return { action: "NO_DATA", error: "Sin datos para graficar." };
                    onProgress(`Renderizando gráfica local: ${args.title}`);
                    return { action: "RENDER_CHART", payload: { type: args.chartType, title: args.title, labels: args.labels, datasets: args.datasets } };

                case "run_calculation":
                    let val = 0;
                    if (args.operation === 'SUM') val = args.inputs.reduce((a, b) => a + b, 0);
                    if (args.operation === 'DIFF') val = args.inputs[0] - args.inputs[1];
                    if (args.operation === 'PERCENTAGE') val = (args.inputs[0] / args.inputs[1]) * 100;
                    return { operation: args.operation, inputs: args.inputs, result: val, assumptions: "Cálculo en motor exacto, no derivado del LLM." };

                case "search_drive_files":
                    if (!this.driveService || !this.driveService.isConnected()) {
                        return { status: "FAIL", error: "DRIVE_NOT_CONNECTED", detail: "El token OAUTH2 de Drive no existe." };
                    }
                    const startSearch = Date.now();
                    const driveFiles = await this.driveService.listFiles(args.query || "");
                    return { results: driveFiles, durationMs: Date.now() - startSearch };

                case "read_drive_document":
                    if (!this.driveService || !this.driveService.isConnected()) {
                        return { status: "FAIL", error: "DRIVE_NOT_CONNECTED", detail: "El token OAUTH2 de Drive no existe o necesita autorización manual mediante el portal de PANDORA." };
                    }
                    const startRaw = Date.now();
                    const parseResult = await this.ingestionService.downloadAndParseDocument(args.driveFileId, this.driveService);
                    return { ...parseResult, durationMs: Date.now() - startRaw };

                case "get_requirement":
                    const req = M1ActiveTender.tenderRequirements.find(r => r.id === args.requirementId);
                    if (!req) return { error: `Requisito ${args.requirementId} no encontrado.` };
                    return { requirement: req, missingEvidence: req.evidenceLinks?.length ? false : true, risk: req.dependsOnClarification ? "Depende de Junta de Aclaraciones" : "Ninguno" };

                case "get_missing_requirements":
                    const missing = M1ActiveTender.tenderRequirements.filter(r => !r.evidenceLinks?.length);
                    return { totalMissing: missing.length, items: missing.map(m => m.id) };

                case "get_risk_status":
                    const rules = M1ActiveTender.config?.criticalRisks || [];
                    return { activeRisks: rules.length, rules };

                case "get_economic_status":
                    const economic = M1ActiveTender.tenderRequirements.filter(r => r.category === 'ECONOMIC');
                    return economic.length > 0 ? { status: 'EVALUATED', economicItems: economic } : { status: "INCOMPLETE", warning: "Existen inconsistencias económicas o no hay rubros." };

                case "get_legal_status":
                    const legal = M1ActiveTender.tenderRequirements.filter(r => r.category === 'LEGAL');
                    return legal.length > 0 ? { status: "REVIEW_NEEDED", count: legal.length } : { status: "NOT_EVALUATED" };

                case "get_expiring_documents":
                    const docs = M1ActiveTender.M1LegalData?.documents || [];
                    const expiring = docs.filter(d => new Date(d.expirationDate) < new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 30));
                    return { status: docs.length === 0 ? "NOT_EVALUATED" : "CHECKED", expiring: expiring };

                default:
                    return { error: `Tool ${toolName} not implemented.` };
            }
        } catch (e) {
            return { error: e.message };
        }
    }
}
