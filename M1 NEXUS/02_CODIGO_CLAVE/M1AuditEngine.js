import { officialConfiguration, officialScoringCriteria, PointStatus, validateNormativeModel } from '../data/m1ActiveTender.js';

export const M1AuditEngine = {

    validateOfficialMatrix: () => {
        return validateNormativeModel();
    },

    calculateEconomicScore: (lowestSolventPrice, evaluatedPrice) => {
        // Both prices without IVA
        if (!lowestSolventPrice || !evaluatedPrice || lowestSolventPrice <= 0 || evaluatedPrice <= 0) return 0;

        // Formula: PPAj = 50 × (PSPMB / PPj)
        let score = 50 * (lowestSolventPrice / evaluatedPrice);

        // Cannot exceed 50
        if (score > 50) score = 50;

        return parseFloat(score.toFixed(2));
    },

    runFullAudit: (state) => {
        // Engine verifies the matrix strictly through validateNormativeModel
        if (!validateNormativeModel()) {
            return {
                status: "FAILED",
                error: "ERROR — MODELO NORMATIVO M1 INCONSISTENTE",
                scores: null
            };
        }

        const { requirements } = state;
        let criticalIssues = [];
        let warnings = [];
        let accreditedTechnicalPoints = 0;
        let estimatedTechnicalPoints = 0;
        let atRiskTechnicalPoints = 0;

        // We assume requirements in the store map to the official ones
        const reqs = requirements.length > 0 ? requirements : officialScoringCriteria;

        let pointsMissingForSolvency = 0;
        let criteriaNoEvidence = 0;
        let criteriaPartial = 0;

        reqs.forEach(req => {
            // Logic for sum. ONLY SUPPORTED adds to Accredited. 
            // ESTIMATED adds to Estimated.
            // NO_EVIDENCE, REJECTED adds to atRisk
            // If NOT_EVALUATED, it's at risk by default since time is passing in audit.

            switch (req.pointStatus) {
                case PointStatus.SUPPORTED:
                    accreditedTechnicalPoints += req.maxPoints;
                    break;
                case PointStatus.ESTIMATED:
                    estimatedTechnicalPoints += req.maxPoints;
                    break;
                default:
                    atRiskTechnicalPoints += req.maxPoints;
                    if (req.mandatory) {
                        criticalIssues.push(`Causal crítica: ${req.title} carece de evidencia validada.`);
                    }
                    criteriaNoEvidence++;
                    break;
            }

            if (req.evidenceLinked && req.evidenceLinked.length > 0 && req.evidenceRequired) {
                if (req.evidenceLinked.length < req.evidenceRequired.length) {
                    criteriaPartial++;
                    warnings.push(`Criterio parcial: ${req.code} faltan documentos requeridos.`);
                }
            }
        });

        const isSolvent = accreditedTechnicalPoints >= 37.50;

        if (!isSolvent) {
            pointsMissingForSolvency = parseFloat((37.50 - accreditedTechnicalPoints).toFixed(2));
        }

        return {
            status: criticalIssues.length > 0 ? 'NO LISTO PARA PRESENTAR' : 'LISTO PARA REVISIÓN FINAL',
            score: accreditedTechnicalPoints,
            accreditedTechnicalPoints,
            estimatedTechnicalPoints,
            atRiskTechnicalPoints,
            pointsMissingForSolvency,
            criteriaNoEvidence,
            criteriaPartial,
            criticalCount: criticalIssues.length,
            warningCount: warnings.length,
            criticalIssues,
            warnings,
            isSolvent,
            solvencyStatus: isSolvent ? 'SOLVENTE' : 'NO SOLVENTE'
        };
    }
};
