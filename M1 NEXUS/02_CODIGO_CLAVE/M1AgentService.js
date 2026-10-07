import OpenAI from 'openai';
import { M1AgentToolRegistry } from './M1AgentToolRegistry.js';
import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';

export class M1AgentService {
    constructor(driveService, ingestionService) {
        this.loadLocalEnv();
        this.apiKey = process.env.OPENAI_API_KEY;
        this.model = process.env.OPENAI_MODEL || 'gpt-5.6-sol';

        // Validador de Nivel 5.5-5.6
        if (!this.model.includes('5.5') && !this.model.includes('5.6')) {
            console.warn(`[GPT_DOWNGRADE_PREVENTION] El modelo ${this.model} no está aprobado. Forzando gpt-5.6-sol.`);
            this.model = 'gpt-5.6-sol';
        }

        if (this.apiKey) {
            try {
                this.openai = new OpenAI({ apiKey: this.apiKey });
            } catch (e) {
                console.error("OpenAI Init Error:", e);
            }
        }
        this.registry = new M1AgentToolRegistry(driveService, ingestionService);
    }

    loadLocalEnv() {
        try {
            const envPath = path.resolve(process.cwd(), '.env.local');
            if (fs.existsSync(envPath)) {
                const lines = fs.readFileSync(envPath, 'utf8').split('\n');
                for (const line of lines) {
                    if (line.startsWith('OPENAI_API_KEY=')) process.env.OPENAI_API_KEY = line.split('=')[1].trim();
                    if (line.startsWith('OPENAI_MODEL=')) process.env.OPENAI_MODEL = line.split('=')[1].trim();
                }
            }
        } catch (e) { }
    }

    async checkStatus() {
        return {
            configured: !!this.apiKey,
            connected: !!this.openai,
            model: this.model,
            apiReachable: null,
            lastError: null
        };
    }

    async testConnection() {
        if (!this.openai) return { status: 'CONFIG_MISSING', configured: false, connected: false, requestedModel: this.model };
        const start = Date.now();
        try {
            const res = await this.openai.chat.completions.create({
                model: this.model,
                messages: [{ role: 'user', content: 'Ping. Responde unicamente "PONG".' }],
                max_completion_tokens: 5
            });
            const latencyMs = Date.now() - start;
            if (res.choices && res.choices.length > 0) {
                return { status: 'PASS', configured: true, connected: true, requestedModel: this.model, actualModel: res.model, latencyMs, error: null };
            }
            return { status: 'MODEL_NOT_AVAILABLE', configured: true, connected: true, requestedModel: this.model, latencyMs, error: "Empty response" };
        } catch (e) {
            const latencyMs = Date.now() - start;
            if (e.status === 401) return { status: 'AUTH_ERROR', configured: true, connected: false, requestedModel: this.model, latencyMs, error: e.message };
            if (e.status === 429) return { status: 'RATE_LIMIT', configured: true, connected: false, requestedModel: this.model, latencyMs, error: e.message };
            if (e.status === 404) return { status: 'MODEL_NOT_AVAILABLE', configured: true, connected: false, requestedModel: this.model, latencyMs, error: e.message };
            return { status: 'NETWORK_ERROR', configured: true, connected: false, requestedModel: this.model, latencyMs, error: e.message };
        }
    }

    async configure(apiKey, model, reasoningEffort) {
        if (process.env.NODE_ENV === 'production') {
            return { error: "No permitido en Producción por seguridad (Requiere inyección via Secrets)." };
        }

        const tempModel = model || 'gpt-5.6-sol';
        let tempOpenAI;
        try {
            tempOpenAI = new OpenAI({ apiKey });
            const res = await tempOpenAI.chat.completions.create({
                model: tempModel,
                messages: [{ role: 'user', content: 'Ping. Responde unicamente "PONG".' }],
                max_completion_tokens: 5
            });
            if (!res.choices || res.choices.length === 0) return { error: "Empty Response", status: "MODEL_NOT_AVAILABLE" };
        } catch (e) {
            if (e.status === 401) return { error: "API KEY INVÁLIDA", status: 'AUTH_ERROR' };
            if (e.status === 404) return { error: "MODELO NO DISPONIBLE", status: 'MODEL_NOT_AVAILABLE' };
            if (e.status === 429) return { error: "Sin saldo o Rate Limit", status: 'RATE_LIMIT' };
            return { error: "Sin conexión: " + e.message, status: 'NETWORK_ERROR' };
        }

        // Apply
        this.apiKey = apiKey;
        this.model = tempModel;
        this.openai = tempOpenAI;
        process.env.OPENAI_API_KEY = apiKey;
        process.env.OPENAI_MODEL = tempModel;
        process.env.OPENAI_REASONING_EFFORT = reasoningEffort || 'medium';

        try {
            const safeContent = `OPENAI_API_KEY=${apiKey}\nOPENAI_MODEL=${tempModel}\nOPENAI_REASONING_EFFORT=${process.env.OPENAI_REASONING_EFFORT}\n`;
            fs.writeFileSync(path.resolve(process.cwd(), '.env.local'), safeContent, { mode: 0o600 });
        } catch (fsErr) {
            console.error("No se pudo persistir .env.local");
        }

        return { status: "VALID" };
    }

    async disconnect() {
        this.apiKey = null;
        this.openai = null;
        process.env.OPENAI_API_KEY = '';
        try {
            const envPath = path.resolve(process.cwd(), '.env.local');
            if (fs.existsSync(envPath)) fs.unlinkSync(envPath);
        } catch (e) { }
        return { status: 'NOT_CONFIGURED' };
    }

    async handleStreamRequest(req, res) {
        if (!this.openai) {
            res.write(JSON.stringify({ type: 'error', data: 'OPENAI_API_KEY missing in backend .env' }) + '\n');
            res.end();
            return;
        }

        const { message, conversationId, mode, contextScope } = req.body;

        let messages = [
            {
                role: 'system',
                content: `Eres PANDORA M1 AUDITOR AGENT, un copilioto operativo experto en licitaciones del gobierno operando localmente.
Trabajas solo sobre la segunda convocatoria activa M1.
Reglas Clave:
1. Responde SIEMPRE de manera conversacional, natural, ultra-eficiente y rápida. Actúa como un asistente humano de élite.
2. NUNCA imprimas logs, etiquetas técnicas, ni bloques de "Trazabilidad" (ej. NO escribas OFFICIAL_M1_SOURCE o WEB_RESEARCH_SOURCE en tu chat). La interfaz de usuario ya maneja las fuentes visualmente, así que mantén tus respuestas completamente limpias de metadatos o formato de logs.
3. Si la respuesta requiere contexto oficial, utiliza tus herramientas y resume la información directamente, sin justificar ni explicar tus pasos de búsqueda.
4. Genera gráficas (create_chart) cuando se te soliciten resúmenes visuales.
5. Si el usuario pregunta cosas casuales (ej. saludos) o sobre la hora/fecha actual, responde de manera cálida y directa sin herramientas. (Hora actual: ${new Date().toLocaleString()}).
Tu contexto activo: ${contextScope}`
            },
            { role: 'user', content: message }
        ];

        let isDone = false;
        let sources = [];
        let lack = [];

        const notifyFrontend = (status, text) => {
            res.write(JSON.stringify({ type: 'timeline', data: { status, text } }) + '\n');
        };

        try {
            notifyFrontend('RUNNING', 'Analizando intención de consulta...');

            while (!isDone) {
                const response = await this.openai.chat.completions.create({
                    model: this.model,
                    messages: messages,
                    tools: this.registry.getToolsSchema(),
                    tool_choice: 'auto',
                    reasoning_effort: 'none'
                });

                const responseMessage = response.choices[0].message;
                messages.push(responseMessage);

                if (responseMessage.tool_calls) {
                    for (const toolCall of responseMessage.tool_calls) {
                        const functionName = toolCall.function.name;
                        const functionArgs = JSON.parse(toolCall.function.arguments);

                        notifyFrontend('RUNNING', `Consultando M1 vía ${functionName} ${JSON.stringify(functionArgs)}...`);

                        const functionResponse = await this.registry.executeTool(functionName, functionArgs, (msg) => {
                            notifyFrontend('RUNNING', msg);
                        });

                        notifyFrontend('DONE', `Completada consulta ${functionName}.`);

                        // Identify errors & lock traces automatically 
                        if (functionResponse.error === 'DRIVE_NOT_CONNECTED') {
                            lack.push(`Requiere conexión Drive para ${functionName}`);
                        }

                        // Extract sources automatically for UI
                        if (functionResponse.webViewLink) {
                            sources.push({ url: functionResponse.webViewLink, name: functionResponse.fileName || 'Source' });
                        }

                        messages.push({
                            tool_call_id: toolCall.id,
                            role: 'tool',
                            name: functionName,
                            content: JSON.stringify(functionResponse).substring(0, 50000),
                        });
                    }
                } else {
                    isDone = true;
                    notifyFrontend('RUNNING', 'Generando reporte estructurado...');
                    const outputContent = responseMessage.content;

                    const finalBlock = {
                        type: 'result',
                        data: {
                            rawText: outputContent,
                            findings: ["Lectura completa."],
                            lack: lack,
                            sources: sources
                        }
                    };
                    res.write(JSON.stringify(finalBlock) + '\n');
                }
            }
        } catch (error) {
            console.error(error);
            notifyFrontend('FAILED', `Fallo sistémico: ${error.message}`);
            res.write(JSON.stringify({ type: 'error', data: error.message }) + '\n');
        } finally {
            res.end();
        }
    }
}
