import { create } from 'zustand';

export const useM1AgentStore = create((set, get) => ({
    sessions: [],
    currentSessionId: null,

    isSandboxOpen: false,
    isSandboxMaximized: false,

    contextContext: 'Todo M1', // Context target (Técnico, Económico, Legal, etc)
    mode: 'CHAT',

    // UI states
    isProcessing: false,
    timelineSteps: [],

    // KPIs
    kpis: {
        processedRequests: 0,
        reviewedDocs: 0,
        executedCalculations: 0,
        sourcedAnswers: 0,
        pendingActions: 0,
        activeBlocks: 0
    },

    // Backend status
    aiStatus: {
        configured: false,
        connected: false,
        model: 'Desconocido',
        apiReachable: false,
        lastError: null
    },

    isConfigModalOpen: false,
    setConfigModalOpen: (val) => set({ isConfigModalOpen: val }),

    setSandboxOpen: (val) => set({ isSandboxOpen: val }),
    toggleSandbox: () => set((state) => ({ isSandboxOpen: !state.isSandboxOpen })),
    setSandboxMaximized: (val) => set({ isSandboxMaximized: val }),
    setAiStatus: (status) => set({ aiStatus: status }),

    setContext: (ctx) => set({ contextContext: ctx }),
    setMode: (mode) => set({ mode: mode }),

    addMessage: (message) => set((state) => {
        const session = state.sessions.find(s => s.id === state.currentSessionId);
        if (!session) return state; // Handle properly in component by initSession

        const newSessions = state.sessions.map(s => {
            if (s.id === state.currentSessionId) {
                return { ...s, history: [...s.history, message] };
            }
            return s;
        });

        return { sessions: newSessions };
    }),

    initSession: () => set((state) => {
        const id = Date.now().toString();
        const newSession = {
            id,
            history: [],
            createdAt: new Date().toISOString()
        };
        return { sessions: [...state.sessions, newSession], currentSessionId: id };
    }),

    addTimelineStep: (step) => set((state) => ({
        timelineSteps: [...state.timelineSteps, { ...step, id: Date.now(), timestamp: new Date().toISOString() }]
    })),

    clearTimeline: () => set({ timelineSteps: [] }),
    setProcessing: (val) => set({ isProcessing: val }),
    incrementKpi: (key) => set((state) => ({ kpis: { ...state.kpis, [key]: state.kpis[key] + 1 } }))
}));
