import { useState, useCallback, useRef } from 'react';

/**
 * Hook para manejar historial de deshacer/rehacer para nodos y conexiones
 * @param {Object} initialState - Estado inicial { nodes: [], edges: [] }
 * @param {number} limit - Límite de pasos en el historial (default: 50)
 */
export function useFlowHistory(initialState = { nodes: [], edges: [] }, limit = 50) {
    const [past, setPast] = useState([]);
    const [future, setFuture] = useState([]);

    // Usamos refs para evitar cierres obsoletos si es necesario, 
    // pero el estado de React debería ser suficiente para este caso simple.

    const canUndo = past.length > 0;
    const canRedo = future.length > 0;

    /**
     * Guarda una instantánea del estado actual en el historial
     * @param {Array} nodes 
     * @param {Array} edges 
     */
    const takeSnapshot = useCallback((nodes, edges) => {
        setPast((prev) => {
            const newPast = [...prev, { nodes, edges }];
            if (newPast.length > limit) {
                return newPast.slice(newPast.length - limit);
            }
            return newPast;
        });
        setFuture([]); // Al hacer un nuevo cambio, borramos el futuro
    }, [limit]);

    /**
     * Deshace el último cambio
     * @param {Array} currentNodes 
     * @param {Array} currentEdges 
     * @returns {Object|null} El estado anterior { nodes, edges } o null si no hay historial
     */
    const undo = useCallback((currentNodes, currentEdges) => {
        if (past.length === 0) return null;

        const previous = past[past.length - 1]; // Último estado guardado
        const newPast = past.slice(0, past.length - 1);

        setPast(newPast);
        setFuture((prev) => [{ nodes: currentNodes, edges: currentEdges }, ...prev]);

        return previous;
    }, [past]);

    /**
     * Rehace el último cambio deshecho
     * @param {Array} currentNodes 
     * @param {Array} currentEdges 
     * @returns {Object|null} El estado siguiente { nodes, edges } o null si no hay futuro
     */
    const redo = useCallback((currentNodes, currentEdges) => {
        if (future.length === 0) return null;

        const next = future[0]; // Siguiente estado
        const newFuture = future.slice(1);

        setFuture(newFuture);
        setPast((prev) => [...prev, { nodes: currentNodes, edges: currentEdges }]);

        return next;
    }, [future]);

    return {
        takeSnapshot,
        undo,
        redo,
        canUndo,
        canRedo,
        historySize: past.length
    };
}
