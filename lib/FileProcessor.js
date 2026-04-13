
import fs from 'fs';
import mammoth from 'mammoth';
import xlsx from 'xlsx';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfjs = require('pdfjs-dist/build/pdf.js');

// Configurar Worker para Node.js
pdfjs.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.js');

/**
 * FILE PROCESSOR MULTIMODAL
 * Extrae texto y data estructurada de diversos formatos.
 */
export class FileProcessor {
  static async process(filePath, mimetype) {
    console.log(`[FILE_PROCESSOR] Procesando: ${filePath} (${mimetype})`);
    
    try {
      if (mimetype === 'application/pdf') {
        const dataBuffer = new Uint8Array(fs.readFileSync(filePath));
        // Usar pdfjs-dist directamente para máxima fiabilidad
        const loadingTask = pdfjs.getDocument({ data: dataBuffer });
        const pdf = await loadingTask.promise;
        let fullText = '';
        
        console.log(`[FILE_PROCESSOR] PDF cargado: ${pdf.numPages} páginas.`);
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map(item => item.str).join(' ');
          fullText += `\n--- PÁGINA ${i} ---\n${pageText}\n`;
        }
        
        return fullText || "[Archivo sin texto extraíble]";
      }
      
      if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || mimetype === 'application/msword') {
        const result = await mammoth.extractRawText({ path: filePath });
        return result.value;
      }
      
      if (mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || mimetype === 'application/vnd.ms-excel') {
        const workbook = xlsx.readFile(filePath);
        let fullText = "";
        workbook.SheetNames.forEach(sheetName => {
          const worksheet = workbook.Sheets[sheetName];
          fullText += `\n--- HOJA: ${sheetName} ---\n`;
          fullText += xlsx.utils.sheet_to_txt(worksheet);
        });
        return fullText;
      }
      
      if (mimetype === 'text/plain') {
        return fs.readFileSync(filePath, 'utf8');
      }

      if (mimetype.startsWith('image/')) {
        const base64 = fs.readFileSync(filePath, 'base64');
        return `[IMAGE_BASE64]data:${mimetype};base64,${base64}`;
      }

      return `[Archivo no soportado para extracción de texto o visión: ${mimetype}]`;
    } catch (error) {
      console.error('[FILE_PROCESSOR_ERROR]', error);
      return `[Error procesando archivo: ${error.message}]`;
    }
  }
}
