
import fastify from 'fastify';
import fastifyCors from '@fastify/cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { toolSchemas, handleToolCall } from './tools.js';

/**
 * PANDORA MCP SERVER V1.0
 * Servidor especializado en exponer capacidades de Pandora a ChatGPT.
 * Corre en el puerto 3002 sobre transporte SSE para acceso desde internet.
 */
const server = new Server(
    {
        name: "pandora-business-engine",
        version: "2.2.0",
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// 1. REGISTRAR LISTADO DE TOOLS PARA CHATGPT
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolSchemas
}));

// 2. REGISTRAR EJECUCIÓN DE TOOLS
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    const content = await handleToolCall(name, args);
    
    return {
        content: [
            {
                type: "text",
                text: JSON.stringify(content, null, 2),
            },
        ],
    };
});

// 3. CONFIGURAR TRANSPORTE HTTP (SSE)
const app = fastify();
await app.register(fastifyCors);

let sseTransport;

app.get('/sse', async (request, reply) => {
    console.log("[PANDORA_MCP_SSE] Nueva conexión desde ChatGPT/ngrok");
    sseTransport = new SSEServerTransport("/message", reply.raw);
    await server.connect(sseTransport);
});

app.post('/message', async (request, reply) => {
    console.log("[PANDORA_MCP_MSG] Mensaje recibido del protocolo:", JSON.stringify(request.body));
    await sseTransport.handlePostMessage(request.raw, reply.raw);
});

const PORT = 3002;
app.listen({ port: PORT, host: '0.0.0.0' }, (err) => {
    if (err) {
        console.error("[PANDORA_MCP_ERROR] No se pudo iniciar el servidor MCP:", err);
        process.exit(1);
    }
    console.log(`\n🚀 SERVIDOR MCP PANDORA ACTIVO EN: http://localhost:${PORT}`);
    console.log(`🔔 USA /sse PARA LA CONEXIÓN INICIAL E INTERNET (ngrok) PARA CHATGPT.\n`);
});
