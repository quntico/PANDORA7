/**
 * M1DriveService
 * Adaptador de Frontend para manejar metadatos de documentos en Drive.
 * NO implementa OAuth directo. Se comunica exclusivamente con el backend interno de PANDORA.
 */

const getInternalApiUrl = () => '/api/m1/drive';

export const M1DriveService = {
    getStatus: async () => {
        console.log(`Checking Drive status via internal API: ${getInternalApiUrl()}/status`);
        // Mock
        return { status: 'disconnected' };
    },

    getTree: async () => {
        console.log(`Fetching Drive tree via internal API: ${getInternalApiUrl()}/tree`);
        return [];
    },

    syncFiles: async () => {
        console.log(`Requesting Drive Sync via internal API: ${getInternalApiUrl()}/sync`);
        return [];
    },

    getFileDetails: async (fileId) => {
        console.log(`Fetching File details via internal API: ${getInternalApiUrl()}/files/${fileId}`);
        return null;
    }
};
