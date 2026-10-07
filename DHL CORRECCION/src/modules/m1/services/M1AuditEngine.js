import { officialConfiguration, officialScoringCriteria, PointStatus, RejectionStatus, validateNormativeModel } from '../data/m1ActiveTender.js';

export const M1AuditEngine = {

    validateOfficialMatrix: () => {
        return validateNormativeModel();
    },

    calculateEconomicScore: (lowestSolventPrice, evaluatedPrice) => {
        if (!lowestSolventPrice || !evaluatedPrice || lowestSolventPrice <= 0 || evaluatedPrice <= 0) return 0;
        let score = 50 * (lowestSolventPrice / evaluatedPrice);
        if (score > 50) score = 50;
        return parseFloat(score.toFixed(2));
    },

    auditDocumentCompliance: (requirements) => {
        let criticalIssues = []; // ONLY for RejectionStatus.CONFIRMED
        let missingDocs = [];
        let warnings = [];

        requirements.forEach(req => {
            const hasValidEvidence = req.evidenceLinks && req.evidenceLinks.some(e => e.validationStatus === 'VALIDATED');
            const hasAnyEvidence = req.evidenceLinks && req.evidenceLinks.length > 0;

            if (!hasValidEvidence) {
                if (req.rejectionStatus === RejectionStatus.CONFIRMED) {
                    criticalIssues.push(`[REJECTION_CONFIRMED] Causal confirmada en ${req.code}: ${req.rejectionBasis?.textSummary || 'Documentación requerida no validada'}`);
                } else if (req.mandatory) {
                    missingDocs.push(`[DOCUMENT_MISSING] Riesgo documental en ${req.code}: falta evidencia validada.`);
                }
            }

            if (hasAnyEvidence && !hasValidEvidence) {
                warnings.push(`[PENDING_NORMATIVE_VERIFICATION] Evidencia cargada en ${req.code} pero aún no validada formalmente.`);
            }
        });

        return { criticalIssues, missingDocs, warnings };
    },

    calculateTechnicalScore: (criteria) => {
        let accreditedPoints = 0;
        let estimatedPoints = 0;
        let atRiskPoints = 0;
        let criteriaNoEvidence = 0;

        criteria.forEach(c => {
            if (c.pointStatus === PointStatus.SUPPORTED && c.validationStatus === 'VALIDATED') {
                // Must grant exact accreditedPoints, NOT blindly maxPoints
                accreditedPoints += (c.accreditedPoints || 0);

                // If it's a partial score, the diff is at risk
                if (c.accreditedPoints < c.maxPoints) {
                    atRiskPoints += (c.maxPoints - c.accreditedPoints);
                }
            } else if (c.pointStatus === PointStatus.ESTIMATED) {
                estimatedPoints += (c.estimatedPoints || 0);
                atRiskPoints += (c.maxPoints - (c.estimatedPoints || 0));
            } else {
                atRiskPoints += c.maxPoints;
                criteriaNoEvidence++;
            }
        });

        return {
            accreditedPoints,
            estimatedPoints,
            atRiskPoints,
            criteriaNoEvidence
        };
    },

    runFullAudit: (state) => {
        const modelValidation = validateNormativeModel();

        let activeRequirements = state.requirements && state.requirements.length > 0 ? state.requirements : [];

        // 1. Calculate Document Compliance
        const docCompliance = M1AuditEngine.auditDocumentCompliance(activeRequirements);

        // 2. Calculate Technical Score
        const scoreData = M1AuditEngine.calculateTechnicalScore(officialScoringCriteria);

        const isTechnicallySolvent = scoreData.accreditedPoints >= officialConfiguration.minimumTechnicalSolvency;
        let pointsMissingForSolvency = isTechnicallySolvent ? 0 : parseFloat((officialConfiguration.minimumTechnicalSolvency - scoreData.accreditedPoints).toFixed(2));

        // 3. Determine Solvency/Submission Status
        let submissionReadiness = 'NOT_READY';

        if (!modelValidation.valid || modelValidation.warnings.some(w => w.includes('PARTIAL') || w.includes('PENDING'))) {
            submissionReadiness = 'BLOCKED_NORMATIVE_MODEL';
        } else if (docCompliance.criticalIssues.length > 0) {
            submissionReadiness = 'NOT_READY_DOCUMENTS';
        } else if (!isTechnicallySolvent) {
            submissionReadiness = 'NOT_TECHNICALLY_SOLVENT';
        } else if (docCompliance.missingDocs.length > 0) {
            submissionReadiness = 'AT_RISK';
        } else {
            submissionReadiness = 'READY_FOR_INTERNAL_REVIEW';
        }

        return {
            status: submissionReadiness,
            score: scoreData.accreditedPoints,
            accreditedTechnicalPoints: scoreData.accreditedPoints,
            estimatedTechnicalPoints: scoreData.estimatedPoints,
            atRiskTechnicalPoints: scoreData.atRiskPoints,
            pointsMissingForSolvency,
            criteriaNoEvidence: scoreData.criteriaNoEvidence,
            criteriaPartial: 0,
            criticalCount: docCompliance.criticalIssues.length,
            warningCount: docCompliance.warnings.length + docCompliance.missingDocs.length,
            criticalIssues: docCompliance.criticalIssues,
            warnings: [...docCompliance.missingDocs, ...docCompliance.warnings],
            isSolvent: isTechnicallySolvent,
            solvencyStatus: isTechnicallySolvent ? 'SOLVENTE' : 'NO SOLVENTE',
            modelValidation
        };
    }
};
