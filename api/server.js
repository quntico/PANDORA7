
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { PandoraOrchestrator } from '../lib/PandoraOrchestrator.js';
import { PandoraLogger } from '../lib/PandoraLogger.js';
import { FileProcessor } from '../lib/FileProcessor.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// CONFIGURACIÓN DE CARGA PARA VERCEL (Usar /tmp/)
const upload = multer({ dest: os.tmpdir() });
const orchestrator = new PandoraOrchestrator();

app.get('/api', (req, res) => {
  res.json({ status: 'PANDORA V3 ONLINE', version: '7.76', target: 'Vercel Deployment' });
});

app.post("/api/pandora/v2/execute", async (req, res) => {
  const requestId = 'rq_' + Math.random().toString(36).substring(7);
  try {
    const result = await orchestrator.execute(req.body, requestId);
    res.json(result);
  } catch (error) {
    PandoraLogger.logError(requestId, 'v2/execute', error.message);
    res.status(500).json({ success: false, error: 'Error V3 en Orquestador', message: error.message });
  }
});

app.post("/api/pandora/v2/upload", upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).json({ success: false, error: 'No se recibió archivo.' });

  try {
    const extractedContent = await FileProcessor.process(file.path, file.mimetype);
    res.json({
      success: true,
      content: extractedContent,
      fileInfo: { name: file.originalname, size: file.size, type: file.mimetype }
    });
    // Limpieza post-extracción
    if (fs.existsSync(file.path)) fs.unlinkSync(file.path);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Error procesando archivo en Vercel' });
  }
});

// Exportación para Vercel
import axios from 'axios';

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

export default app;
