import dotenv from 'dotenv';
import { M1DriveService } from './lib/M1DriveService.js';
import { google } from 'googleapis';

dotenv.config();

async function testDrive() {
    const driveService = new M1DriveService();
    console.log('Status:', driveService.getStatus());

    if (!driveService.isConnected()) {
        console.error('NOT CONNECTED! Cannot proceed without valid token.');
        return;
    }

    const TARGET = '1q0JjIBPAO1ytK7MLRIJTeO0A1UJyurZU';
    const drive = google.drive({ version: 'v3', auth: driveService.oAuth2Client });

    console.log('Testing Root API access...');
    const t0 = Date.now();
    try {
        const res = await drive.files.list({
            q: `'${TARGET}' in parents and trashed = false`,
            fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, parents, webViewLink)',
            spaces: 'drive',
            pageSize: 1000
        });
        const ms = Date.now() - t0;

        let rootFolders = 0;
        let rootFiles = 0;

        for (const f of res.data.files) {
            if (f.mimeType === 'application/vnd.google-apps.folder') rootFolders++;
            else rootFiles++;
        }

        console.log(`ROOT_API_TEST = PASS`);
        console.log(`ROOT_ITEMS = ${res.data.files.length}`);
        console.log(`ROOT_FOLDERS = ${rootFolders}`);
        console.log(`ROOT_FILES = ${rootFiles}`);
        console.log(`ROOT_ELAPSED_MS = ${ms}`);
    } catch (err) {
        console.error('ROOT_API_TEST = FAIL');
        console.error(err);
    }
}

testDrive();
