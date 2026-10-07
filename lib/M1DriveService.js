import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const APPDATA_DIR = path.join(process.env.APPDATA || (process.platform === 'darwin' ? process.env.HOME + '/Library/Preferences' : process.env.HOME + '/.local/share'), 'PANDORA', 'google-drive');
const TOKEN_PATH = path.join(APPDATA_DIR, 'token.json');
const CONFIG_PATH = path.join(APPDATA_DIR, 'oauth_config.json');

function ensureAppDir() {
    if (!fs.existsSync(APPDATA_DIR)) {
        fs.mkdirSync(APPDATA_DIR, { recursive: true });
    }
}

export class M1DriveService {
    constructor() {
        this.oAuth2Client = null;
        this.config = null;
        this.loadConfig();
    }

    loadConfig() {
        try {
            ensureAppDir();
            let clientId = process.env.GOOGLE_CLIENT_ID;
            let clientSecret = process.env.GOOGLE_CLIENT_SECRET;
            let redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3010/api/m1/drive/oauth/callback';

            if (fs.existsSync(CONFIG_PATH)) {
                const cfg = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
                clientId = cfg.clientId || clientId;
                clientSecret = cfg.clientSecret || clientSecret;
                redirectUri = cfg.redirectUri || redirectUri;
            }

            this.config = { clientId, clientSecret, redirectUri };

            if (clientId && clientSecret) {
                this.oAuth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri);
                this.loadToken();
            } else {
                this.oAuth2Client = null;
            }
        } catch (error) {
            console.error('[M1_DRIVE] Error loading OAuth Config:', error.message);
        }
    }

    saveConfig(clientId, clientSecret, redirectUri) {
        ensureAppDir();
        const cfg = { clientId, clientSecret, redirectUri };
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
        this.loadConfig();
        return true;
    }

    getConfigStatus() {
        const isConfigured = !!(this.config && this.config.clientId && this.config.clientSecret);
        return {
            configured: isConfigured,
            clientIdMasked: this.config && this.config.clientId ?
                this.config.clientId.substring(0, 10) + '...' + this.config.clientId.substring(this.config.clientId.length - 10) : null,
            redirectUri: this.config ? (this.config.redirectUri || 'http://localhost:3010/api/m1/drive/oauth/callback') : null,
            clientSecretConfigured: !!(this.config && this.config.clientSecret)
        };
    }

    loadToken() {
        if (!this.oAuth2Client) return;
        try {
            ensureAppDir();
            if (fs.existsSync(TOKEN_PATH)) {
                const token = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
                this.oAuth2Client.setCredentials(token);

                // Add event listener for auto-refresh
                this.oAuth2Client.on('tokens', (tokens) => {
                    if (tokens.refresh_token) {
                        this.saveToken(tokens);
                    } else {
                        // Merge with existing
                        const current = JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
                        this.saveToken({ ...current, ...tokens });
                    }
                });

                console.log('[M1_DRIVE] Loaded stored OAuth tokens from APPDATA.');
            }
        } catch (error) {
            console.error('[M1_DRIVE] Error loading tokens (auth missing).');
        }
    }

    saveToken(token) {
        try {
            ensureAppDir();
            fs.writeFileSync(TOKEN_PATH, JSON.stringify(token));
            console.log('[M1_DRIVE] Saved OAuth tokens to APPDATA.');
        } catch (error) {
            console.error('[M1_DRIVE] Error saving tokens (system error).');
        }
    }

    getAuthUrl() {
        if (!this.oAuth2Client) throw new Error('OAuth Client no está configurado (Falta Client ID/Secret)');
        return this.oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            prompt: 'consent',
            scope: ['https://www.googleapis.com/auth/drive.readonly']
        });
    }

    async handleCallback(code) {
        if (!this.oAuth2Client) throw new Error('OAuth Client no está configurado');
        const { tokens } = await this.oAuth2Client.getToken(code);
        this.oAuth2Client.setCredentials(tokens);
        this.saveToken(tokens);
        return tokens;
    }

    async getStatus() {
        const connected = this.isConnected();
        let accountEmail = null;
        let rootAccessible = false;

        if (connected) {
            try {
                const drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
                // Check identity
                const aboutRes = await drive.about.get({ fields: 'user' });
                accountEmail = aboutRes.data.user.emailAddress;

                // Check Root access
                const targetId = process.env.M1_DRIVE_FOLDER_ID || '1q0JjIBPAO1ytK7MLRIJTeO0A1UJyurZU';
                await drive.files.get({ fileId: targetId, fields: 'id' });
                rootAccessible = true;
            } catch (err) {
                console.error('[M1_DRIVE] Background check failed', err.message);
                if (err.message.includes('invalid_grant')) {
                    // Revoked or expired refresh token
                    this.disconnect();
                    return { connected: false, accountEmail: null, tokenAvailable: false, rootAccessible: false, configured: this.getConfigStatus().configured };
                }
            }
        }

        return {
            configured: this.getConfigStatus().configured,
            connected,
            accountEmail: accountEmail || 'No detectada',
            tokenAvailable: connected,
            rootAccessible
        };
    }

    isConnected() {
        return !!(this.oAuth2Client && this.oAuth2Client.credentials && this.oAuth2Client.credentials.refresh_token);
    }

    disconnect() {
        if (this.oAuth2Client) {
            this.oAuth2Client.setCredentials({});
        }
        if (fs.existsSync(TOKEN_PATH)) {
            fs.unlinkSync(TOKEN_PATH);
        }
        return { status: 'DISCONNECTED' };
    }

    async getTree() {
        const targetId = process.env.M1_DRIVE_FOLDER_ID || '1K-STQRLRL0DTvowSY7TJKuBRgsUEG0IG';
        const drive = google.drive({ version: 'v3', auth: this.oAuth2Client });
        return await this.fetchFolderRecursive(drive, targetId);
    }

    async fetchFolderRecursive(drive, folderId) {
        let results = [];
        let params = {
            q: `'${folderId}' in parents and trashed = false`,
            fields: 'nextPageToken, files(id, name, mimeType, webViewLink, modifiedTime, parents)',
            spaces: 'drive'
        };

        let res;
        do {
            res = await drive.files.list(params);
            if (res.data.files) {
                results.push(...res.data.files);
            }
            params.pageToken = res.data.nextPageToken;
        } while (params.pageToken);

        return results.map(f => ({
            driveFileId: f.id,
            fileName: f.name,
            mimeType: f.mimeType,
            webViewLink: f.webViewLink,
            modifiedTime: f.modifiedTime,
            parentId: f.parents && f.parents.length > 0 ? f.parents[0] : null
        }));
    }
}
