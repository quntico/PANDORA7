import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { officialTenderRequirements, officialConfiguration } from './data/m1ActiveTender';

const SCHEMA_VERSION = 2;

export const useM1Store = create(
    persist(
        (set, get) => ({
            _schemaVersion: SCHEMA_VERSION,
            activeView: 'Dashboard',
            auditStatus: 'NOT_STARTED',
            requirements: [],
            scoringCriteria: [],
            personnel: [],
            experience: [],
            documents: [],
            risks: [],
            submissionReadiness: 'NOT_READY',
            scores: {
                officialTechnicalMaxPoints: officialConfiguration.officialTechnicalMaxPoints,
                accreditedTechnicalPoints: 0,
                estimatedTechnicalPoints: 0,
                atRiskTechnicalPoints: 0,
                economicScore: 0,
                totalScore: 0
            },
            auditHistory: [],
            lastDriveSync: null,
            lastApiEvaluation: null,
            settings: {
                apiBaseUrl: '',
                apiStatus: 'disconnected',
                driveFolderId: '',
                driveStatus: 'disconnected',
                autoEval: false,
                autoSync: false,
                syncInterval: 5000
            },

            hydrateNormativeModel: () => set((state) => {
                const newReqs = officialTenderRequirements.map(officialReq => {
                    const existingReq = state.requirements?.find(r => r.id === officialReq.id);
                    const oldEvidences = existingReq?.evidenceLinks || existingReq?.evidenceLinked || [];
                    return { ...JSON.parse(JSON.stringify(officialReq)), evidenceLinks: oldEvidences };
                });

                const newCriteria = officialScoringCriteria.map(officialCrit => {
                    const existingCrit = state.scoringCriteria?.find(c => c.id === officialCrit.id) || {};
                    return { ...JSON.parse(JSON.stringify(officialCrit)), ...existingCrit };
                });

                return {
                    requirements: newReqs,
                    scoringCriteria: newCriteria,
                    scores: {
                        ...state.scores,
                        officialTechnicalMaxPoints: officialConfiguration.officialTechnicalMaxPoints
                    },
                    _schemaVersion: SCHEMA_VERSION
                };
            }),

            setActiveView: (view) => set({ activeView: view }),
            setAuditStatus: (status) => set({ auditStatus: status }),

            updateSettings: (newSettings) => set((state) => ({
                settings: { ...state.settings, ...newSettings }
            })),
            setSubmissionReadiness: (status) => set({ submissionReadiness: status }),

            setRequirements: (reqs) => set({ requirements: reqs }),
            updateRequirement: (id, updates) => set((state) => {
                const existing = state.requirements.find(r => r.id === id) || {};
                const other = state.requirements.filter(r => r.id !== id);
                return {
                    requirements: [...other, { ...existing, id, ...updates }]
                }
            }),
            updateScoringCriterion: (id, updates) => set((state) => {
                const existing = state.scoringCriteria?.find(r => r.id === id) || {};
                const other = state.scoringCriteria?.filter(r => r.id !== id) || [];
                return {
                    scoringCriteria: [...other, { ...existing, id, ...updates }]
                }
            }),
            setPersonnel: (pers) => set({ personnel: pers }),
            setExperience: (exp) => set({ experience: exp }),
            setDocuments: (docs) => set({ documents: docs }),
            setRisks: (risks) => set({ risks: risks })
        }),
        {
            name: 'pandora_m1',
            version: SCHEMA_VERSION,
            migrate: (persistedState, version) => {
                if (version < SCHEMA_VERSION) {
                    persistedState.requirements = []; // Force hydration
                    persistedState.scoringCriteria = [];
                }
                if (!persistedState.scoringCriteria || persistedState.scoringCriteria.length === 0) {
                    persistedState.scoringCriteria = officialScoringCriteria;
                }
                return persistedState;
            }
        }
    )
);
