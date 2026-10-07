import { google } from 'googleapis';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import unzipper from 'unzipper';
import { parseStringPromise } from 'xml2js';

export class DocumentIngestionService {
    constructor(driveService) {
        this.driveService = driveService;
    }

    async downloadAndParse(driveFileId, mimeType, fileName) {
        if (!this.driveService.oAuth2Client.credentials) {
            throw new Error('OAuth no configurado');
        }

        const drive = google.drive({ version: 'v3', auth: this.driveService.oAuth2Client });

        let parserType = 'UNKNOWN';
        let parserStatus = 'PENDING';
        let completeness = 'MINIMAL';
        let textExtracted = '';
        let extractedFields = {};
        let errors = [];
        let warnings = [];
        let pages = 0;
        let tablesExtracted = 0;
        let structureExtracted = false;

        const startTime = Date.now();

        try {
            let isGoogleDoc = mimeType.includes('google-apps');
            let response;

            if (isGoogleDoc) {
                let exportMime = 'application/pdf';
                if (mimeType.includes('document')) exportMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                if (mimeType.includes('spreadsheet')) exportMime = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                if (mimeType.includes('presentation')) exportMime = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

                response = await drive.files.export({ fileId: driveFileId, mimeType: exportMime }, { responseType: 'arraybuffer' });
                mimeType = exportMime;
            } else {
                response = await drive.files.get({ fileId: driveFileId, alt: 'media' }, { responseType: 'arraybuffer' });
            }

            const buffer = Buffer.from(response.data);

            if (mimeType.includes('pdf')) {
                parserType = 'PDF';
                const pdfData = await pdfParse(buffer);
                textExtracted = pdfData.text || '';
                pages = pdfData.numpages;

                if (textExtracted.trim().length < 50) {
                    parserStatus = 'OCR_REQUIRED';
                    completeness = 'MINIMAL';
                    warnings.push('PDF escaneado. No se encontro texto nativo. Requiere OCR.');
                } else {
                    parserStatus = 'PARSED';
                    completeness = 'FULL';
                }
            }
            else if (mimeType.includes('wordprocessingml') || fileName.endsWith('.docx')) {
                parserType = 'DOCX';
                // mammoth try extracting formatted text with simple table structure
                const docxData = await mammoth.extractRawText({ buffer });
                textExtracted = docxData.value;
                parserStatus = 'PARSED';
                completeness = 'PARTIAL';
                warnings.push('TABLE_EXTRACTION_PARTIAL: Mammoth puede perder celdas tabulares críticas.');
            }
            else if (mimeType.includes('spreadsheetml') || fileName.endsWith('.xlsx')) {
                parserType = 'XLSX';
                const wb = xlsx.read(buffer, { type: 'buffer', cellFormula: true });
                let textBuilder = [];
                let hasFormulas = false;

                wb.SheetNames.forEach(sheetName => {
                    const ws = wb.Sheets[sheetName];
                    textExtracted += `--- SHEET: ${sheetName} ---\n`;
                    for (const cell in ws) {
                        if (cell[0] === '!') continue;
                        const cv = ws[cell].v;
                        const f = ws[cell].f;
                        if (f) hasFormulas = true;
                        if (cv !== undefined) textBuilder.push(`${sheetName}!${cell}: ${cv} ${f ? `[Formula: ${f}]` : ''}`);
                    }
                });

                textExtracted = textBuilder.join('\n');
                structureExtracted = true;
                parserStatus = 'PARSED';
                completeness = 'FULL';
            }
            else if (mimeType.includes('presentationml') || fileName.endsWith('.pptx')) {
                parserType = 'PPTX';
                const pptxExtract = await this.parsePPTX(buffer);
                textExtracted = pptxExtract.text;
                pages = pptxExtract.slideCount;
                structureExtracted = true;
                parserStatus = 'PARSED';
                completeness = 'FULL';

                if (pptxExtract.hasMedia) {
                    warnings.push('IMAGE_CONTENT_NOT_ANALYZED: Se detectaron refs a media/imagenes sin OCR aplicable.');
                }

                // Semántica base para PPTX
                if (textExtracted.toLowerCase().includes('modelo') || textExtracted.toLowerCase().includes('capacidad')) {
                    extractedFields.classification = textExtracted.toLowerCase().includes('watts') ? 'DATASHEET' : 'TECHNICAL_PRESENTATION';
                } else {
                    extractedFields.classification = 'COMMERCIAL_PRESENTATION';
                }
            } else {
                parserStatus = 'UNSUPPORTED';
                completeness = 'MINIMAL';
                errors.push(`Parseo no disponible para MIME: ${mimeType}`);
            }

            // Entity extraction
            this.extractEntitiesSimulated(textExtracted, extractedFields);

        } catch (err) {
            console.error('[INGESTION ERROR]', err);
            parserStatus = 'PARSER_ERROR';
            errors.push(err.message);
        }

        const durationMs = Date.now() - startTime;

        console.log(`[INGEST_LOG] ID: ${driveFileId} | File: ${fileName} | Parser: ${parserType} | Dur: ${durationMs}ms | Status: ${parserStatus}`);

        return {
            driveFileId,
            fileName,
            mimeType,
            parserType,
            parserStatus,
            completeness,
            textExtracted: textExtracted.substring(0, 50000), // restrict raw size downstream
            tablesExtracted,
            structureExtracted,
            pages,
            extractedFields,
            durationMs,
            errors,
            warnings
        };
    }

    async parsePPTX(buffer) {
        let textBuilder = [];
        let slideCount = 0;
        let hasMedia = false;

        const directory = await unzipper.Open.buffer(buffer);

        for (const file of directory.files) {
            if (file.path.startsWith('ppt/slides/slide') && file.path.endsWith('.xml')) {
                slideCount++;
                const xmlBuffer = await file.buffer();
                const xmlObj = await parseStringPromise(xmlBuffer.toString());

                // Extracting text elements (a:t) from slide xml
                textBuilder.push(`--- Slide ${slideCount} ---`);
                this.recursiveXMLTextExtractor(xmlObj, textBuilder);
            }
            if (file.path.startsWith('ppt/media/')) {
                hasMedia = true;
            }
        }

        return {
            slideCount,
            hasMedia,
            text: textBuilder.join('\n')
        };
    }

    recursiveXMLTextExtractor(obj, textBuilder) {
        if (!obj) return;
        if (typeof obj === 'string') {
            textBuilder.push(obj);
            return;
        }
        if (obj['a:t']) {
            obj['a:t'].forEach(t => {
                if (typeof t === 'string') textBuilder.push(t);
                if (t._) textBuilder.push(t._);
            });
        }
        for (const key in obj) {
            if (typeof obj[key] === 'object') {
                this.recursiveXMLTextExtractor(obj[key], textBuilder);
            }
        }
    }

    extractEntitiesSimulated(text, fields) {
        const t = text.toLowerCase();
        if (t.includes('at 2') || t.includes('anexo técnico 2')) {
            fields.documentCode = 'AT2';
            fields.topic = 'Planeación integral / procedimiento';
            fields.suggestedRequirementId = 'AT2';
        }

        // Simular PPTX Data extraction
        const models = text.match(/Modelo[\s:]+([A-Z0-9-]+)/i);
        if (models) fields.modelsDetected = models[1];

        const capacities = text.match(/Capacidad[\s:]+([0-9]+\s*(TPD|TPH|kg|lts|ton))/i);
        if (capacities) fields.capacityDetected = capacities[1];
    }
}
