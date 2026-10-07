import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useM1Store = create(
    persist(
        (set, get) => ({
            activeView: 'Dashboard',
            auditStatus: 'NOT_STARTED',
            requirements: [],
            personnel: [],
            experience: [],
            documents: [],
            risks: [],
            submissionReadiness: 'NOT_READY',
            scores: {
                officialTechnicalMaxPoints: 0,
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

            setActiveView: (view) => set({ activeView: view }),
            setAuditStatus: (status) => set({ auditStatus: status }),

            updateSettings: (newSettings) => set((state) => ({
                settings: { ...state.settings, ...newSettings }
            })),
            setSubmissionReadiness: (status) => set({ submissionReadiness: status }),

            // Placeholder actions for Phase 3+
            setRequirements: (reqs) => set({ requirements: reqs }),
            updateRequirement: (id, updates) => set((state) => {
                const existing = state.requirements.find(r => r.id === id) || {};
                const other = state.requirements.filter(r => r.id !== id);
                return {
                    requirements: [...other, { ...existing, id, ...updates }]
                }
            }),
            setPersonnel: (pers) => set({ personnel: pers }),
            setExperience: (exp) => set({ experience: exp }),
            setDocuments: (docs) => set({ documents: docs }),
            setRisks: (risks) => set({ risks: risks })
        }),
        {
            name: 'pandora_m1'
        }
    )
);
