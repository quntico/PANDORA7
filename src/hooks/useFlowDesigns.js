import { useState, useCallback } from 'react';
import { supabase } from '@/supabase';

export function useFlowDesigns() {
    const [designs, setDesigns] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    // Cargar todos los diseños
    const loadDesigns = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('flow_designs')
                .select('id, name, description, created_at, updated_at')
                .order('updated_at', { ascending: false });

            if (fetchError) throw fetchError;
            setDesigns(data || []);
        } catch (err) {
            console.error('[FlowDesigns] Error loading:', err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Cargar un diseño específico
    const loadDesign = useCallback(async (id) => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('flow_designs')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;
            return data;
        } catch (err) {
            console.error('[FlowDesigns] Error loading design:', err);
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Guardar nuevo diseño
    const saveDesign = useCallback(async (name, nodes, edges, customEquipments, description = '', layout = null) => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: saveError } = await supabase
                .from('flow_designs')
                .insert([{
                    name,
                    description,
                    nodes,
                    edges,
                    custom_equipments: customEquipments,
                    layout
                }])
                .select()
                .single();

            if (saveError) throw saveError;
            return data;
        } catch (err) {
            console.error('[FlowDesigns] Error saving:', err);
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Actualizar diseño existente
    const updateDesign = useCallback(async (id, name, nodes, edges, customEquipments, description = '', layout = null) => {
        setIsLoading(true);
        setError(null);
        try {
            const { data, error: updateError } = await supabase
                .from('flow_designs')
                .update({
                    name,
                    description,
                    nodes,
                    edges,
                    custom_equipments: customEquipments,
                    layout,
                    updated_at: new Date().toISOString()
                })
                .eq('id', id)
                .select()
                .single();

            if (updateError) throw updateError;
            return data;
        } catch (err) {
            console.error('[FlowDesigns] Error updating:', err);
            setError(err.message);
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Eliminar diseño
    const deleteDesign = useCallback(async (id) => {
        setIsLoading(true);
        setError(null);
        try {
            const { error: deleteError } = await supabase
                .from('flow_designs')
                .delete()
                .eq('id', id);

            if (deleteError) throw deleteError;
            setDesigns(prev => prev.filter(d => d.id !== id));
            return true;
        } catch (err) {
            console.error('[FlowDesigns] Error deleting:', err);
            setError(err.message);
            return false;
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        designs,
        isLoading,
        error,
        loadDesigns,
        loadDesign,
        saveDesign,
        updateDesign,
        deleteDesign
    };
}
