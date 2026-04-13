import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { PandoraOrchestrator } from './lib/PandoraOrchestrator.js';
import { PandoraLogger } from './lib/PandoraLogger.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

import { FileProcessor } from './lib/FileProcessor.js';

// --- CONFIGURACIÓN DE CARGA DE ARCHIVOS ---
const upload = multer({ dest: 'uploads/' });
const orchestrator = new PandoraOrchestrator();

// Ruta de diagnóstico visual
app.get('/', (req, res) => {
  res.send('<h1 style="color: #00F0FF; background: #000; padding: 20px; font-family: monospace;">🚀 MOTOR PANDORA BETA ONLINE (CON V2 & MULTIMODAL)</h1>');
});

// --- RUTA V2: EJECUCIÓN DEL ORQUESTADOR ---
app.post("/api/pandora/v2/execute", async (req, res) => {
  const requestId = 'rq_' + Math.random().toString(36).substring(7);
  try {
    // ── DIAGNÓSTICO: verificar que el vaultContext llega al backend ──
    const pc = req.body?.projectContext || {};
    const vaultLen = pc.vaultContext?.length || 0;
    console.log(`[PANDORA v2] Proyecto: "${pc.projectName || 'N/A'}" | VaultContext: ${vaultLen} chars | Msg: "${(req.body?.message || '').slice(0, 80)}"`);
    if (vaultLen > 0) console.log(`[PANDORA v2] VaultContext preview: ${pc.vaultContext.slice(0, 300)}`);
    
    const result = await orchestrator.execute(req.body, requestId);
    res.json(result);
  } catch (error) {
    PandoraLogger.logError(requestId, 'v2/execute', error.message);
    res.status(500).json({ success: false, error: 'Error V2 en Orquestador', message: error.message });
  }
});

// --- RUTA V2: CARGA MULTIMODAL ---
app.post("/api/pandora/v2/upload", upload.single('file'), async (req, res) => {
  const requestId = 'up_' + Math.random().toString(36).substring(7);
  const file = req.file;

  if (!file) {
    return res.status(400).json({ success: false, error: 'No se recibió archivo.' });
  }

  console.log(`[PANDORA V2] Recibiendo: ${file.originalname} (${file.size} bytes)`);

  try {
    // Producir contenido real vía extracción
    const extractedContent = await FileProcessor.process(file.path, file.mimetype);
    
    res.json({
      success: true,
      content: extractedContent,
      fileInfo: {
        name: file.originalname,
        size: file.size,
        type: file.mimetype
      }
    });

    // Limpieza de temporales
    fs.unlinkSync(file.path);

  } catch (error) {
    console.error('[UPLOAD_ERROR]', error);
    res.status(500).json({ success: false, error: 'Error procesando archivo' });
  }
});

// Mantener compatibilidad con V1
app.post("/api/pandora/execute", async (req, res) => {
  const requestId = 'legacy_' + Math.random().toString(36).substring(7);
  try {
    const result = await orchestrator.execute({ 
      message: req.body.prompt, 
      projectId: req.body.projectId,
      userId: req.body.userId,
      v2: false 
    }, requestId);
    res.json(result);
  } catch (error) {
    console.error('[LEGACY_ERROR]', error);
    res.status(500).json({ success: false, error: 'Error en legacy' });
  }
});

// --- RUTA V2: PROXY DE IMÁGENES (Para Evitar CORS en Canvas/Descargas) ---
app.get("/api/pandora/v2/proxy-image", async (req, res) => {
  if (!req.query.url) return res.status(400).send("No URL provided");
  try {
    const response = await axios.get(req.query.url, { responseType: 'arraybuffer' });
    res.set('Content-Type', response.headers['content-type']);
    res.send(response.data);
  } catch (error) {
    console.error('[PROXY_ERROR]', error.message);
    res.status(500).send("Error proxying image");
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 MOTOR PANDORA BETA V2 activo en: http://localhost:${PORT}`);
});
