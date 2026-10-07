/**
 * M1ApiService
 * Adaptador de Frontend para evaluaciones de auditoría.
 * Todas las peticiones deben viajar hacia endpoints internos del servidor de PANDORA.
 * NUNCA contactar APIs protegidas externamente desde esta capa.
 */

const getBaseUrl = () => {
    // Use public variables only
    return import.meta.env.VITE_M1_API_BASE_URL || '/api/m1';
};

export const M1ApiService = {
    checkHealth: async () => {
        try {
            console.log(`Checking API health via internal endpoint: ${getBaseUrl()}/health`);
            // Mock internal resolution
            return { status: 'connected' };
        } catch (error) {
            console.error("API Health check failed:", error);
            return { status: 'disconnected' };
        }
    },

    evaluateState: async (snapshot) => {
        try {
            console.log(`Sending evaluation to internal endpoint: ${getBaseUrl()}/evaluate`, snapshot);

            // Mocking internal endpoint response
            return {
                officialTechnicalMaxPoints: 0,
                accreditedTechnicalPoints: 0,
                estimatedTechnicalPoints: 0,
                atRiskTechnicalPoints: 0,
                economicScore: 0,
                totalScore: 0,
                solvencyStatus: "POR VERIFICAR",
                criticalIssues: [],
                warnings: [],
                missingEvidence: [],
                inconsistencies: [],
                recommendations: ["Auditoría simulada correctamente."]
            };
        } catch (error) {
            console.error("API Evaluation failed:", error);
            throw error;
        }
    }
};
