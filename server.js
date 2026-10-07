import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { exec } from 'child_process';
import { PandoraOrchestrator } from './lib/PandoraOrchestrator.js';
import { PandoraLogger } from './lib/PandoraLogger.js';
import { M1DriveService } from './lib/M1DriveService.js';
import { DocumentIngestionService } from './lib/DocumentIngestionService.js';
import { M1AgentService } from './lib/M1AgentService.js';
import { M1FileIndexer } from './lib/M1FileIndexer.js';

dotenv.config();

const app = express();
const driveService = new M1DriveService();
const ingestionService = new DocumentIngestionService(driveService);
const agentService = new M1AgentService(driveService, ingestionService);
const fileIndexer = new M1FileIndexer(driveService);
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

// ==========================================================
// FASE 5A: GOOGLE DRIVE M1 CONFIG & INTEGRATION (OAUTH 2.0)
// ==========================================================

app.get('/api/m1/drive/config', (req, res) => {
  res.json(driveService.getConfigStatus());
});

app.post('/api/m1/drive/config', (req, res) => {
  const { clientId, clientSecret, redirectUri } = req.body;
  if (!clientId || !clientId.includes('.apps.googleusercontent.com')) {
    return res.status(400).json({ success: false, error: 'Client ID inválido. Debe contener .apps.googleusercontent.com' });
  }
  if (!clientSecret || clientSecret.trim() === '') {
    return res.status(400).json({ success: false, error: 'Client Secret no puede estar vacío.' });
  }
  if (!redirectUri || !redirectUri.startsWith('http://localhost:')) {
    return res.status(400).json({ success: false, error: 'Redirect URI inválido. Debe comenzar con http://localhost:' });
  }

  try {
    driveService.saveConfig(clientId, clientSecret, redirectUri);
    res.json({ success: true });
  } catch (err) {
    console.error('Config Error:', err);
    res.status(500).json({ success: false, error: 'No se pudo guardar la configuración.' });
  }
});

app.get('/api/m1/drive/auth-url', (req, res) => {
  try {
    const url = driveService.getAuthUrl();
    res.json({ success: true, url });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// OAuth callback handler (full path - must match GCP Authorized Redirect URI exactly)
app.get('/api/m1/drive/oauth/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code parameter.');
  try {
    await driveService.handleCallback(code);
    res.redirect('http://localhost:4001/m1');
  } catch (e) {
    res.status(500).send(`Error de autenticación: ${e.message}`);
  }
});

// Short alias (backward compat)
app.get('/api/m1/drive/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send('Missing code parameter.');
  try {
    await driveService.handleCallback(code);
    res.redirect('http://localhost:4001/m1');
  } catch (e) {
    res.status(500).send(`Error de autenticación: ${e.message}`);
  }
});

app.get('/api/m1/drive/status', async (req, res) => {
  try {
    const status = await driveService.getStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ connected: false, error: err.message });
  }
});

app.post('/api/m1/drive/disconnect', (req, res) => {
  res.json(driveService.disconnect());
});

app.get('/api/m1/drive/tree', async (req, res) => {
  try {
    const tree = await driveService.getTree();
    res.json({ success: true, files: tree });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/m1/drive/parse', async (req, res) => {
  const { driveFileId, mimeType, fileName } = req.body;
  try {
    const parsedContext = await ingestionService.downloadAndParse(driveFileId, mimeType, fileName);
    res.json({ success: true, parsedContext });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// --- M1 EXPEDIENTE FILE INDEXER ---
app.get('/api/m1/files/index', async (req, res) => {
  try {
    const data = await fileIndexer.getIndex();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/m1/files/rescan', async (req, res) => {
  try {
    const data = await fileIndexer.rescan();
    res.json({ success: true, data });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/m1/agent/message', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  await agentService.handleStreamRequest(req, res);
});

app.get('/api/m1/agent/status', async (req, res) => {
  res.json(await agentService.checkStatus());
});

app.post('/api/m1/agent/test', async (req, res) => {
  res.json(await agentService.testConnection());
});

app.post('/api/admin/openai/configure', async (req, res) => {
  const { apiKey, model, reasoningEffort } = req.body;
  res.json(await agentService.configure(apiKey, model, reasoningEffort));
});

app.post('/api/admin/openai/disconnect', async (req, res) => {
  res.json(await agentService.disconnect());
});

app.get('/api/m1/nexus/log', (req, res) => {
  try {
    const manifestDir = 'H:\\Mi unidad\\M1 NEXUS\\99_MANIFEST';
    let changeFeed = [];
    if (fs.existsSync(path.join(manifestDir, 'CHANGE_FEED.json'))) {
      changeFeed = JSON.parse(fs.readFileSync(path.join(manifestDir, 'CHANGE_FEED.json'), 'utf8'));
    }
    res.json({ success: true, log: changeFeed });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

app.post('/api/m1/nexus/sync', (req, res) => {
  exec('node nexus_mirror_daemon.js --once', (err, stdout, stderr) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, error: err.message });
    }

    try {
      const manifestDir = 'H:\\Mi unidad\\M1 NEXUS\\99_MANIFEST';
      let lastSync = { files_scanned: 0, files_changed_in_last_scan: 0, sync_status: 'UNKNOWN' };
      let changeFeed = [];

      if (fs.existsSync(path.join(manifestDir, 'LAST_SYNC.json'))) {
        lastSync = JSON.parse(fs.readFileSync(path.join(manifestDir, 'LAST_SYNC.json'), 'utf8'));
      }
      if (fs.existsSync(path.join(manifestDir, 'CHANGE_FEED.json'))) {
        changeFeed = JSON.parse(fs.readFileSync(path.join(manifestDir, 'CHANGE_FEED.json'), 'utf8'));
      }

      const changedCount = lastSync.files_changed_in_last_scan || 0;
      const recentChanges = changeFeed.slice(0, changedCount);

      let created = 0, modified = 0, deleted = 0, renamed = 0;
      recentChanges.forEach(c => {
        if (c.accion === 'CREATED') created++;
        else if (c.accion === 'MODIFIED') modified++;
        else if (c.accion === 'DELETED') deleted++;
        else if (c.accion === 'RENAMED') renamed++;
      });

      res.json({
        success: true,
        timestamp: lastSync.last_scan || new Date().toISOString(),
        files_scanned: lastSync.files_scanned || 0,
        files_changed: changedCount,
        created,
        modified,
        deleted,
        renamed,
        sync_status: lastSync.sync_status || "ACTIVE_AND_WATCHING",
        mirror_integrity: lastSync.mirror_integrity || "VERIFIED",
        changed_files: recentChanges.map(c => ({
          file: c.archivo,
          action: c.accion
        }))
      });
    } catch (parseError) {
      console.error('Error parsing sync info:', parseError);
      res.status(500).json({ success: false, error: 'Failed to read sync manifests.' });
    }
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`\n🚀 MOTOR PANDORA BETA V2 activo en: http://localhost:${PORT}`);
});
