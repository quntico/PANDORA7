
import { OpenAI } from 'openai';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import { PandoraLogger } from './PandoraLogger.js';

dotenv.config();

export class PandoraOrchestrator {
  constructor() {
    this.openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    this.supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );
  }

  // --- GENERACIÓN DE PROMPT ---
  buildSystemPrompt(context, memory) {
    const project = context.activeProject || {};
    const company = context.companyContext || {};
    
    // Formatear memoria (si existe)
    let memoryText = "SIN DATOS PREVIOS.";
    if (memory && memory.length > 0) {
      memoryText = memory.map(m => `- ${m.memory_key}: ${m.memory_value}`).join('\n');
    }
    // Contexto de la Bóveda (archivos y notas del proyecto)
    const vaultSection = context.vaultContext
      ? `\nCONTEXTO DEL PROYECTO (ARCHIVOS Y NOTAS CARGADAS EN LA BÓVEDA — USAR PARA RESPONDER PREGUNTAS SOBRE EL PROYECTO):\n${context.vaultContext}\n\nREGLA CRITICA: Si el usuario pregunta algo sobre el proyecto y los datos están en los DOCUMENTOS DEL PROYECTO anteriores, DEBES responder usando esa información. Nunca digas "no tengo información" si la información ya está en los documentos.\n`
      : '';

    return `IDENTIDAD: Eres PANDORA V3, un Auditor Financiero y Evaluador Industrial implacable. Eres agresivo, crítico y te basas puramente en DATOS DUROS (cifras exactas, inversiones, TIR, capacidades operativas).
TU MISIÓN: Desnudar las debilidades de los proyectos, destruir supuestos sin fundamentos y emitir dictámenes financieros severos. Siempre que evalúes riesgos o viabilidad, DEBES usar "Calificaciones Semáforo" con porcentajes exactos (Ejemplo: 🔴 25% PELIGRO CRÍTICO, 🟡 60% PRECAUCIÓN, o 🟢 90% ALTAMENTE VIABLE). Enlista SIEMPRE los datos crudos extraídos de los documentos.
ATENCION: Si el usuario te comparte información para recordar, guárdala en 'new_memories'. Jamás digas que no tienes memoria.

PROYECTO ACTUAL: ${project.title || context.projectName || 'Desconocido'}
DESCRIPCÍON: ${project.description && !project.description.startsWith('===') ? project.description : 'Ver documentos del proyecto'}
${vaultSection}
MEMORIA PERSISTENTE (DATOS RECORDADOS EN SESIONES PREVIAS):\n${memoryText}

MODO DE OPERACIÓN:
- Si preguntan sobre datos del proyecto: extrae la información de los DOCUMENTOS DEL PROYECTO y respondé directamente.
- 80% VISUAL cuando pidan análisis, dashboards o gráficas: usa el JSON estructurado.
- 20% TEXTO conversacional para preguntas directas: responde con 'summary' claro y conciso.

SISTEMA DE PLANTILLAS DINÁMICAS (para análisis visuales):
1. risk_dashboard, 2. roi_dashboard, 3. cashflow_dashboard, 4. cost_dashboard, 5. strategy_dashboard, 6. executive_report

FORMATO DE SALIDA (OBLIGATORIO JSON V3):
{
  "templateId": null (o nombre de plantilla si el usuario pide un dashboard),
  "title": "Título descriptivo",
  "subtitle": "Insight clave",
  "summary": "Tu respuesta ejecutiva directa y clara en español",
  "metrics": [...],
  "charts": [...],
  "tables": [...],
  "recommendation": { 
      "status": "AVANZAR | AJUSTAR | DESCARTAR", 
      "text": "Conclusión ejecutiva EXHAUSTIVA Y PROFUNDA (mínimo 200 palabras, detallando contexto, finanzas, métricas y justificación de porqué se toma la decisión, NO USES SÓLO 3 FRASES. Debe leerse como un dictamen final pesado).", 
      "bullets": ["Justo 1 detallado", "Justo 2 detallado", "Justo 3 detallado", "Justo 4 detallado"] 
  },
  "new_memories": [],
  "generatedImages": []
}

REGLA DE ORO: Para preguntas conversacionales usa templateId: null y pon la respuesta en 'summary'. Para análisis visuales usa una plantilla con datos reales.
SUPER REGLA: TUS RECOMENDACIONES DEBEN SER ALTAMENTE TÉCNICAS, FINANCIERAMENTE CRUCIALES Y PROFUNDAS. NUNCA ENTREGUES SOLO 3 FRASES VACIAS.`;
  }

  // --- EJECUCIÓN DEL AGENTE ---
  async execute(payload, requestId) {
    const startTime = Date.now();
    let { message, userId, companyId, projectId, attachments, v2 } = payload;
    
    // Detección de intención visual
    const isDashboardRequest = /grafica|matriz|dashboard|distribucion|barras|pie|linea|riesgo|roi|financial|executive/i.test(message);
    const shadowPrompt = isDashboardRequest 
      ? "\n\n[OBLIGATORIO]: Genera una consola visual V3. Usa el JSON estructurado completo."
      : "";

    if (typeof message === 'object') {
       message = (message && (message.text || message.content)) || JSON.stringify(message);
    }
    const finalUserMessage = String(message) + shadowPrompt;

    // Los dashboards siempre usan el modelo Pro
    const model = isDashboardRequest ? 'gpt-4o' : 'gpt-4o-mini';
    
    console.log("[PANDORA_ENGINE_V3]", { model, isDashboardRequest, requestId });

    try {
      // 1. Resolver Contexto y Memoria
      // Leer el vaultContext enviado desde el frontend (notas, archivos, descripción del proyecto)
      const payloadContext = payload.projectContext || {};
      const context = { 
        scopeId: projectId || companyId || userId, 
        projectId,
        projectName: payloadContext.projectName || null,
        vaultContext: payloadContext.vaultContext || null,
        activeProject: {
          title: payloadContext.projectName || null,
          // NO poner vaultContext como description (causaba duplicación)
          description: null
        }
      };
      const memory = await this.loadScopedMemory(context);
      
      // 2. Construir Prompts
      const systemPrompt = this.buildSystemPrompt(context, memory);
      const userContentArray = await this.buildUserPromptContentArray(finalUserMessage, attachments);
      
      let currentMessages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContentArray }
      ];

      // 3. Herramientas
      const tools = [
        {
          type: "function",
          function: {
            name: "getCurrentDateTime",
            description: "Fecha/Hora actual local.",
            parameters: { type: "object", properties: {} }
          }
        },
        {
          type: "function",
          function: {
            name: "webSearch",
            description: "Busca en la web para datos actualizados.",
            parameters: {
              type: "object",
              properties: { query: { type: "string" } },
              required: ["query"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "generateImage",
            description: "Usa DALL-E 3 para crear o generar una imagen basada en texto (para ilustraciones, previsualizaciones o fotos).",
            parameters: {
              type: "object",
              properties: { prompt: { type: "string", description: "Descripción detallada de la imagen a generar" } },
              required: ["prompt"]
            }
          }
        }
      ];

      let toolsUsed = [];
      let finalJsonData = null;
      let loopCount = 0;
      let continueLoop = true;

      while (continueLoop && loopCount < 5) {
        loopCount++;
        
        const response = await this.openai.chat.completions.create({
          model: model,
          messages: currentMessages,
          tools: tools,
          tool_choice: "auto", 
          response_format: { type: "json_object" }
        });

        const responseMessage = response.choices[0].message;

        if (responseMessage.tool_calls) {
          currentMessages.push(responseMessage);
          for (const toolCall of responseMessage.tool_calls) {
            const functionName = toolCall.function.name;
            let toolOutput = "";
            toolsUsed.push(functionName);

            if (functionName === "getCurrentDateTime") {
              toolOutput = JSON.stringify(this.getCurrentDateTime());
            } else if (functionName === "webSearch") {
              const functionArgs = JSON.parse(toolCall.function.arguments);
              toolOutput = await this.webSearch(functionArgs.query);
            } else if (functionName === "generateImage") {
              const functionArgs = JSON.parse(toolCall.function.arguments);
              toolOutput = await this.generateImageTool(functionArgs.prompt);
            }

            currentMessages.push({
              tool_call_id: toolCall.id,
              role: "tool",
              name: functionName,
              content: String(toolOutput)
            });
          }
        } else {
          try {
            const parsed = JSON.parse(responseMessage.content || "{}");
            
            // Guardrail Visual
            if (isDashboardRequest && !parsed.templateId && (!parsed.charts || parsed.charts.length === 0)) {
               if (loopCount < 4) {
                 currentMessages.push({
                    role: "user",
                    content: "ERROR: No usaste una plantilla visual. REINTENTA devolviendo 'templateId' y el objeto visual completo V3."
                 });
                 continue;
               }
            }
            finalJsonData = parsed;
          } catch (e) {
            finalJsonData = { text: responseMessage.content };
          }
          continueLoop = false;
        }
      }

      // 4. Persistencia de Memoria y Logs
      if (finalJsonData.new_memories) {
        await this.saveMemories(context.scopeId, finalJsonData.new_memories);
      }
      await this.persistLogs(message, finalJsonData, context);

      return {
        success: true,
        engine_info: {
          model,
          api: "Pandora Engine V3.1 (Cognitive Memory)",
          tools_used: [...new Set(toolsUsed)],
          mode: finalJsonData.templateId ? 'Strategic Dashboard' : 'Analytical Chat'
        },
        output: finalJsonData
      };

    } catch (error) {
       PandoraLogger.logError(requestId, 'agent_v3_execute', error.message);
       throw error;
    }
  }

  // --- MÓDULOS DE SOPORTE ---
  async loadScopedMemory(context) {
    const { data, error } = await this.supabase
      .from('user_memory_beta')
      .select('*')
      .eq('user_id', String(context.scopeId));
    if (error) console.error('[MEMORIA] Error cargando memoria:', error);
    return data || [];
  }

  async saveMemories(scopeId, newMemories) {
    for (const mem of newMemories) {
      const { error } = await this.supabase.from('user_memory_beta').upsert({
        user_id: String(scopeId),
        memory_key: mem.key,
        memory_value: String(mem.value)
      }, { onConflict: 'user_id, memory_key' });
      if (error) console.error('[MEMORIA] Error guardando memoria:', error);
    }
  }

  async persistLogs(userPrompt, gptResponse, context) {
    if (!context.projectId) return;
    try {
      const respText = typeof gptResponse === 'object' ? (gptResponse.summary || gptResponse.text || "JSON structured analysis") : gptResponse;
      await this.supabase.from('project_logs_beta').insert([
        { project_id: context.projectId, action: userPrompt, source: 'user', result: 'PROMPT' },
        { project_id: context.projectId, action: String(respText), source: 'assistant', result: 'Executive Response' }
      ]);
    } catch(e) {}
  }

  async buildUserPromptContentArray(message, attachments) {
      const contentArray = [];
      let textPrompt = message;

      if (attachments && attachments.length > 0) {
        textPrompt += "\n\n--- ADJUNTOS EXTRAÍDOS ---\n";
        attachments.forEach(a => {
          if (a.content.startsWith('[IMAGE_BASE64]')) {
             const base64Url = a.content.replace('[IMAGE_BASE64]', '');
             contentArray.push({
               type: "image_url",
               image_url: { url: base64Url }
             });
             textPrompt += `[${a.name}]: [Imagen enviada y anexada visualmente al modelo]\n`;
          } else {
             textPrompt += `[${a.name}]: ${a.content}\n`;
          }
        });
      }
      
      contentArray.unshift({
        type: "text",
        text: textPrompt
      });

      return contentArray;
  }

  getCurrentDateTime() {
    const now = new Date();
    return {
      iso: now.toISOString(),
      date: now.toLocaleDateString("es-MX", { dateStyle: "full" }),
      time: now.toLocaleTimeString("es-MX")
    };
  }

  async webSearch(query) {
    try {
      const searchUrl = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      const res = await axios.get(searchUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
      });
      const $ = cheerio.load(res.data);
      const results = [];
      $('.result').each((i, el) => {
        if (i < 3) {
          const title = $(el).find('.result__title').text().trim();
          const snip = $(el).find('.result__snippet').text().trim();
          results.push(`**${title}**: ${snip}`);
        }
      });
      return results.join('\n\n');
    } catch (err) {
      return "Búsqueda limitada.";
    }
  }

  async generateImageTool(prompt) {
    try {
      const response = await this.openai.images.generate({
        model: "dall-e-3",
        prompt: prompt,
        n: 1,
        size: "1024x1024"
      });
      return JSON.stringify({ url: response.data[0].url });
    } catch (err) {
      console.error("[DALL-E ERROR]", err.message);
      return JSON.stringify({ error: "No se pudo generar la imagen: " + err.message });
    }
  }
}
