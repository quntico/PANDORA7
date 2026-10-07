import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { google } from 'googleapis';

export class M1FileIndexer {
    constructor(driveService) {
        this.driveService = driveService;
        this.sourceMode = 'GOOGLE_DRIVE_API';
        this.rootFolderId = '1q0JjIBPAO1ytK7MLRIJTeO0A1UJyurZU';
        this.indexPath = path.join(process.cwd(), 'data', 'm1_document_index.json');

        this.stats = {
            totalFiles: 0,
            totalFolders: 0,
            classified: 0,
            unclassified: 0,
            errors: 0
        };
        this.files = [];

        // Matches AT1..15, AT3A, AT3B etc, AE, DLA, OEM, PERSONAL, EXPERIENCIA
        this.codeRegex = /\b(AT[1-9][A-Z]?|AT1[0-5][A-Z]?|AE\d*|DLA\d*|OEM\d*|PERSONAL|EXPERIENCIA)\b/gi;
    }

    getMimeType(ext) {
        const extLower = (ext || '').toLowerCase();
        const mimes = {
            '.pdf': 'application/pdf',
            '.doc': 'application/msword',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            '.xls': 'application/vnd.ms-excel',
            '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.zip': 'application/zip',
            '.rar': 'application/x-rar-compressed'
        };
        return mimes[extLower] || 'application/octet-stream';
    }

    extractCodes(text) {
        if (!text) return [];
        const matches = text.match(this.codeRegex) || [];
        return [...new Set(matches.map(m => m.toUpperCase()))];
    }

    async fetchDirectChildren(drive, folderId, folderPath = "") {
        let items = [];
        let pageToken = null;
        do {
            const res = await drive.files.list({
                q: `'${folderId}' in parents and trashed = false`,
                fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, parents, webViewLink)',
                spaces: 'drive',
                pageToken: pageToken,
                pageSize: 1000
            });
            if (res.data.files) {
                const mapped = res.data.files.map(f => ({
                    ...f,
                    _parentPath: folderPath
                }));
                items.push(...mapped);
            }
            pageToken = res.data.nextPageToken;
        } while (pageToken);
        return items;
    }

    async scanBFS(drive) {
        const queue = [
            {
                id: this.rootFolderId,
                relativePath: ""
            }
        ];

        while (queue.length > 0) {
            const currentFolder = queue.shift();

            let children;
            try {
                children = await this.fetchDirectChildren(drive, currentFolder.id, currentFolder.relativePath);
            } catch (err) {
                this.stats.errors++;
                console.error(`Error fetching children for folder ${currentFolder.id}:`, err.message);
                continue;
            }

            for (const child of children) {
                const isFolder = child.mimeType === 'application/vnd.google-apps.folder';

                const childRelativePath = currentFolder.relativePath
                    ? currentFolder.relativePath + '/' + child.name
                    : child.name;

                if (isFolder) {
                    this.stats.totalFolders++;
                    queue.push({
                        id: child.id,
                        relativePath: childRelativePath
                    });
                } else {
                    this.stats.totalFiles++;

                    const ext = path.extname(child.name);
                    const parentFolderName = currentFolder.relativePath ? path.basename(currentFolder.relativePath) : "ROOT";

                    const codesFromName = this.extractCodes(child.name);
                    const codesFromFolder = this.extractCodes(parentFolderName);
                    const mergedCodes = [...new Set([...codesFromName, ...codesFromFolder])];

                    let category = 'UNCLASSIFIED';
                    if (mergedCodes.length > 0) {
                        category = 'CLASSIFIED';
                        this.stats.classified++;
                    } else {
                        this.stats.unclassified++;
                    }

                    const sizeBytes = child.size ? parseInt(child.size, 10) : 0;
                    const driveFingerprint = `${child.id}-${child.modifiedTime}-${sizeBytes}`;

                    this.files.push({
                        id: crypto.randomUUID(),
                        driveFileId: child.id,
                        name: child.name,
                        extension: ext,
                        relativePath: childRelativePath,
                        parentFolder: parentFolderName,
                        mimeType: child.mimeType || this.getMimeType(ext),
                        sizeBytes: sizeBytes,
                        modifiedAt: child.modifiedTime,
                        webViewLink: child.webViewLink,
                        driveFingerprint: driveFingerprint,
                        category: category,
                        possibleRequirementCodes: mergedCodes,
                        status: 'INDEXED',
                        source: 'GOOGLE_DRIVE_API'
                    });
                }
            }

            if (this.stats.totalFiles % 25 === 0 && this.stats.totalFiles > 0) {
                console.log(`[DRIVE INDEX] folders=${this.stats.totalFolders} files=${this.stats.totalFiles}`);
            }
        }
    }

    async rescan() {
        const startTime = Date.now();
        this.stats = { totalFiles: 0, totalFolders: 0, classified: 0, unclassified: 0, errors: 0 };
        this.files = [];

        if (!this.driveService || !this.driveService.isConnected()) {
            return { success: false, error: 'NOT_AUTHENTICATED', message: 'Drive no está conectado. Usa la vista Drive para autorizar.' };
        }

        const drive = google.drive({ version: 'v3', auth: this.driveService.oAuth2Client });

        console.log(`\n[M1FileIndexer] Starting GOOGLE DRIVE API SCAN on ${this.rootFolderId}`);

        let watchdogTimeout = false;
        const scanPromise = this.scanBFS(drive);

        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
                watchdogTimeout = true;
                reject(new Error('SCAN_TIMEOUT'));
            }, 60000);
        });

        const elapsedMs = () => Date.now() - startTime;

        try {
            await Promise.race([scanPromise, timeoutPromise]);

            console.log(`\nINDEX COMPLETE [DRIVE]`);
            console.log(`Folders: ${this.stats.totalFolders}`);
            console.log(`Files: ${this.stats.totalFiles}`);
            console.log(`Classified: ${this.stats.classified}`);
            console.log(`Unclassified: ${this.stats.unclassified}`);
            console.log(`Errors: ${this.stats.errors}`);
            console.log(`Elapsed time: ${elapsedMs()}ms\n`);

            const payload = {
                generatedAt: new Date().toISOString(),
                source: this.sourceMode,
                rootFolderId: this.rootFolderId,
                rootFolderName: 'M1 - LICITACION ACTIVA',
                totalFiles: this.stats.totalFiles,
                totalFolders: this.stats.totalFolders,
                classified: this.stats.classified,
                unclassified: this.stats.unclassified,
                errors: this.stats.errors,
                elapsedMs: elapsedMs(),
                files: this.files
            };

            // Ensure data dir exists
            const dataDir = path.dirname(this.indexPath);
            if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

            fs.writeFileSync(this.indexPath, JSON.stringify(payload, null, 2), 'utf8');

            return {
                success: true,
                source: this.sourceMode,
                elapsedMs: elapsedMs(),
                totalFiles: this.stats.totalFiles,
                totalFolders: this.stats.totalFolders,
                classified: this.stats.classified,
                unclassified: this.stats.unclassified,
                errors: this.stats.errors
            };
        } catch (err) {
            console.error('Scan failed or timeout:', err.message);
            return {
                success: false,
                partial: watchdogTimeout,
                reason: err.message,
                filesFound: this.stats.totalFiles,
                foldersFound: this.stats.totalFolders,
                errors: this.stats.errors,
                elapsedMs: elapsedMs()
            };
        }
    }

    async getIndex() {
        if (fs.existsSync(this.indexPath)) {
            try {
                return JSON.parse(fs.readFileSync(this.indexPath, 'utf8'));
            } catch (e) {
                return { error: 'Failed to parse index json' };
            }
        }
        // If not found, do not auto-rescan silently to avoid hidden 60s blocking calls from frontend load
        return { error: 'No index found. Run First Scan.' };
    }
}
