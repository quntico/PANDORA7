import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabase';

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
  const [projectId, setProjectId] = useState(null); // ID del proyecto en Supabase
  const [projectData, setProjectData] = useState({
    name: '',
    description: '',
    projectType: '',
    investmentAmount: 0,
    timeline: 12,
    currentStage: ''
  });

  const [calculatorMetrics, setCalculatorMetrics] = useState({});

  const [analysisResults, setAnalysisResults] = useState(null);

  const [userMode, setUserMode] = useState('entrepreneur');

  const [selectedScenario, setSelectedScenario] = useState('realistic');

  const [contextData, setContextData] = useState(null);

  const [isSaving, setIsSaving] = useState(false);

  // Guardar proyecto en Supabase
  const saveProjectToSupabase = useCallback(async () => {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const payload = {
        name: projectData.name,
        description: projectData.description,
        project_type: projectData.projectType,
        investment_amount: projectData.investmentAmount,
        timeline: projectData.timeline,
        current_stage: projectData.currentStage,
        calculator_metrics: calculatorMetrics,
        analysis_results: analysisResults
      };

      if (projectId) {
        // Actualizar existente
        const { error } = await supabase
          .from('projects')
          .update(payload)
          .eq('id', projectId);
        if (error) throw error;
      } else {
        // Crear nuevo
        const { data, error } = await supabase
          .from('projects')
          .insert([payload])
          .select()
          .single();
        if (error) throw error;
        if (data) setProjectId(data.id);
      }
      console.log('[ProjectContext] Proyecto guardado en Supabase');
    } catch (err) {
      console.error('[ProjectContext] Error guardando proyecto:', err);
    } finally {
      setIsSaving(false);
    }
  }, [projectId, projectData, calculatorMetrics, analysisResults, isSaving]);

  // Cargar proyecto desde Supabase (el más reciente)
  const loadLatestProject = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows

      if (data) {
        setProjectId(data.id);
        setProjectData({
          name: data.name || '',
          description: data.description || '',
          projectType: data.project_type || '',
          investmentAmount: data.investment_amount || 0,
          timeline: data.timeline || 12,
          currentStage: data.current_stage || ''
        });
        setCalculatorMetrics(data.calculator_metrics || {});
        setAnalysisResults(data.analysis_results || null);
        console.log('[ProjectContext] Proyecto cargado desde Supabase:', data.id);
      }
    } catch (err) {
      console.error('[ProjectContext] Error cargando proyecto:', err);
    }
  }, []);

  // Cargar al iniciar
  useEffect(() => {
    loadLatestProject();
  }, [loadLatestProject]);

  const updateProjectData = (data) => {
    setProjectData(prev => ({ ...prev, ...data }));
  };

  const updateCalculatorMetrics = (metrics) => {
    setCalculatorMetrics(prev => ({ ...prev, ...metrics }));
  };

  const resetProject = () => {
    setProjectId(null);
    setProjectData({
      name: '',
      description: '',
      projectType: '',
      investmentAmount: 0,
      timeline: 12,
      currentStage: ''
    });
    setCalculatorMetrics({});
    setAnalysisResults(null);
    setContextData(null);
    setSelectedScenario('realistic');
  };

  return (
    <ProjectContext.Provider
      value={{
        projectId,
        projectData,
        setProjectData,
        updateProjectData,
        calculatorMetrics,
        setCalculatorMetrics,
        updateCalculatorMetrics,
        analysisResults,
        setAnalysisResults,
        userMode,
        setUserMode,
        selectedScenario,
        setSelectedScenario,
        contextData,
        setContextData,
        resetProject,
        saveProjectToSupabase, // Nueva función para guardar
        loadLatestProject,     // Nueva función para cargar
        isSaving
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within ProjectProvider');
  }
  return context;
}
