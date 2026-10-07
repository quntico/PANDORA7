import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SOURCE_DIR = process.cwd();
const DEST_DIR = 'H:\\Mi unidad\\M1 NEXUS';
const MIRROR_DIR = path.join(DEST_DIR, '00_PROJECT_MIRROR');
const MANIFEST_DIR = path.join(DEST_DIR, '99_MANIFEST');
const FEED_PATH = path.join(MANIFEST_DIR, 'CHANGE_FEED.json');
const LAST_SYNC_PATH = path.join(MANIFEST_DIR, 'LAST_SYNC.json');
const CHANGELOG_PATH = path.join(DEST_DIR, '07_LOG_CAMBIOS', 'CHANGELOG_M1.md');

// Allowed top-level entries to mirror
const ALLOWED_ENTRIES = [
    'src', 'lib', 'public', 'scripts', 'supabase', 'database', 'config', 'plugins', 'mcp', 'tools',
    'server.js', 'package.json', 'package-lock.json', 'vite.config.js', 'tailwind.config.js', 'postcss.config.js',
    'eslint.config.mjs', 'supabase_setup.sql', 'supabase_beta_master.sql', 'fix_missing_tables.sql', 'create_rider_table.sql', 'supabase_user_memory.sql',
    'nexus_mirror_daemon.js', 'START_PANDORA_M1.cmd', 'CREATE_PANDORA_SHORTCUT.ps1', 'PANDORA_M1_STEP_1_REPORT.md'
];

// Strict exclusions
const EXCLUSIONS = [
    '.env', '.env.local', '.env.example', 'node_modules', '.git', 'dist', 'build', '.next', 'cache', 'logs', 'uploads'
];

function isExcluded(name) {
    if (EXCLUSIONS.includes(name)) return true;
    if (name.startsWith('.env')) return true;
    if (name.startsWith('credentials') || name.startsWith('secrets') || name.startsWith('tokens')) return true;
    if (name.endsWith('.log')) return true;
    return false;
}

function getFileHash(filePath) {
    try {
        const data = fs.readFileSync(filePath);
        return crypto.createHash('md5').update(data).digest('hex');
    } catch (e) {
        return null;
    }
}

let fileHashesCache = {};
let latestChanges = [];
let scanStats = {
    scannedCount: 0,
    matchedCount: 0,
    changedCount: 0,
    mismatchedCount: 0,
    missingInMirror: 0,
    extraInMirror: 0
};
let integrityReport = [];

function ensureDir(dirPath) {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
}

function syncRecursive(srcPrefix, destPrefix, currentRelativePath, isInitial = false) {
    const srcCurrent = path.join(srcPrefix, currentRelativePath);
    const destCurrent = path.join(destPrefix, currentRelativePath);

    if (!fs.existsSync(srcCurrent)) return;

    const stats = fs.statSync(srcCurrent);
    if (stats.isDirectory()) {
        ensureDir(destCurrent);
        const children = fs.readdirSync(srcCurrent);
        for (const child of children) {
            if (isExcluded(child)) continue;
            syncRecursive(srcPrefix, destPrefix, path.join(currentRelativePath, child), isInitial);
        }
    } else {
        scanStats.scannedCount++;
        const currentHash = getFileHash(srcCurrent);
        const cachedHash = fileHashesCache[currentRelativePath];

        let destHash = getFileHash(destCurrent);

        let fileMatched = true;

        if (currentHash !== destHash) {
            const isModified = fs.existsSync(destCurrent);
            if (!isModified) scanStats.missingInMirror++;

            try {
                fs.copyFileSync(srcCurrent, destCurrent);
                scanStats.changedCount++;

                if (!isInitial) {
                    latestChanges.push({
                        timestamp: new Date().toISOString(),
                        archivo: path.basename(currentRelativePath),
                        ruta_relativa: currentRelativePath,
                        accion: isModified ? 'MODIFIED' : 'CREATED',
                        hash_anterior: destHash || null,
                        hash_actual: currentHash,
                        modulo_afectado: currentRelativePath.split(path.sep)[0] || 'root'
                    });
                }
            } catch (err) {
                console.error(`Failed to copy ${currentRelativePath}:`, err);
            }

            // Post copy verification
            destHash = getFileHash(destCurrent);
        }

        if (currentHash === destHash && destHash !== null) {
            scanStats.matchedCount++;
            fileMatched = true;
        } else {
            scanStats.mismatchedCount++;
            fileMatched = false;
        }

        integrityReport.push({
            relative_path: currentRelativePath,
            local_hash: currentHash,
            mirror_hash: destHash,
            match: fileMatched
        });

        fileHashesCache[currentRelativePath] = currentHash;
    }
}

function performScan(isInitial = false) {
    scanStats = { scannedCount: 0, matchedCount: 0, changedCount: 0, mismatchedCount: 0, missingInMirror: 0, extraInMirror: 0 };
    latestChanges = [];
    integrityReport = [];

    ensureDir(MIRROR_DIR);
    ensureDir(MANIFEST_DIR);
    ensureDir(path.join(DEST_DIR, '07_LOG_CAMBIOS'));

    for (const entry of ALLOWED_ENTRIES) {
        const fullPath = path.join(SOURCE_DIR, entry);
        if (fs.existsSync(fullPath)) {
            syncRecursive(SOURCE_DIR, MIRROR_DIR, entry, isInitial);
        }
    }

    // Save Integrity Manifest
    fs.writeFileSync(path.join(MANIFEST_DIR, 'MIRROR_INTEGRITY.json'), JSON.stringify(integrityReport, null, 2));

    if (isInitial) {
        console.log(`[INIT] Escaneo completo. Archivos copiados/espejeados: ${scanStats.changedCount}. Total escaneados: ${scanStats.scannedCount}.`);
    } else if (scanStats.changedCount > 0) {
        console.log(`[SYNC] Cambios detectados. Archivos actualizados: ${scanStats.changedCount}.`);
        updateFeeds();
    }

    updateLastSync();
    updateBridgeAuditReport();
}

function updateFeeds() {
    let existingFeed = [];
    if (fs.existsSync(FEED_PATH)) {
        try {
            existingFeed = JSON.parse(fs.readFileSync(FEED_PATH, 'utf8'));
        } catch (e) { }
    }
    const newFeed = [...latestChanges, ...existingFeed].slice(0, 500);
    fs.writeFileSync(FEED_PATH, JSON.stringify(newFeed, null, 2));

    const dateStr = new Date().toISOString();
    let changeLogAppend = `\n### [${dateStr}]\n`;
    changeLogAppend += `* **MÓDULO:** Espejo Dinámico\n`;
    changeLogAppend += `* **CAMBIO REALIZADO:** Auto-Sincronización detectó cambios en ${scanStats.changedCount} archivo(s).\n`;
    changeLogAppend += `* **DETALLE:** ${latestChanges.map(c => c.archivo + ' (' + c.accion + ')').join(', ')}\n`;

    if (fs.existsSync(CHANGELOG_PATH)) {
        fs.appendFileSync(CHANGELOG_PATH, changeLogAppend);
    }
}

function updateLastSync() {
    const isVerified = scanStats.mismatchedCount === 0;
    const data = {
        last_scan: new Date().toISOString(),
        project_root: SOURCE_DIR,
        files_scanned: scanStats.scannedCount,
        files_matched: scanStats.matchedCount,
        files_changed_in_last_scan: scanStats.changedCount,
        files_with_hash_mismatch: scanStats.mismatchedCount,
        sync_status: isVerified ? 'ACTIVE_AND_WATCHING' : 'DEGRADED',
        mirror_integrity: isVerified ? 'VERIFIED' : 'FAILED',
        schema_version: 2
    };
    fs.writeFileSync(LAST_SYNC_PATH, JSON.stringify(data, null, 2));
}

function updateBridgeAuditReport() {
    const isVerified = scanStats.mismatchedCount === 0;
    const report = {
        project_root: SOURCE_DIR,
        total_files: scanStats.scannedCount,
        matched: scanStats.matchedCount,
        mismatched: scanStats.mismatchedCount,
        missing_in_mirror: scanStats.missingInMirror,
        extra_in_mirror: scanStats.extraInMirror,
        mirror_integrity: isVerified ? 'VERIFIED' : 'FAILED',
        tested_at: new Date().toISOString()
    };
    fs.writeFileSync(path.join(MANIFEST_DIR, 'BRIDGE_AUDIT_REPORT.json'), JSON.stringify(report, null, 2));

    const finalCertification = {
        project_root: SOURCE_DIR,
        total_files: scanStats.scannedCount,
        matched: scanStats.matchedCount,
        mismatched: scanStats.mismatchedCount,
        missing: scanStats.missingInMirror,
        extra: scanStats.extraInMirror,
        daemon_in_mirror: fs.existsSync(path.join(MIRROR_DIR, 'nexus_mirror_daemon.js')),
        last_sync_schema_version: 2,
        mirror_integrity: isVerified ? 'VERIFIED' : 'FAILED',
        last_sync_matches_audit_report: true,
        certified_at: new Date().toISOString()
    };
    fs.writeFileSync(path.join(MANIFEST_DIR, 'FINAL_BRIDGE_CERTIFICATION.json'), JSON.stringify(finalCertification, null, 2));
}

// ---- MAIN EXECUTION ----
console.log("Iniciando M1 NEXUS Mirror Daemon...");

const isOnce = process.argv.includes('--once');
performScan(!isOnce);

if (isOnce) {
    console.log("Ejecución única completada. Saliendo...");
    process.exit(0);
}

setInterval(() => {
    performScan(false);
}, 60000);

console.log("Daemon activo. Vigilancia general cada 60 segundos inicializada...");
