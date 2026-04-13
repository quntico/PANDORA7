import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/supabase';

const BetaContext = createContext();

export function BetaProvider({ children }) {
  const [activeProject, setActiveProject] = useState(null);
  const [projectId, setProjectId] = useState(null);
  const [projects, setProjects] = useState([]);
  const [messages, setMessages] = useState([]);
  const [artifacts, setArtifacts] = useState([]);
  const [memory, setMemory] = useState({
    decisions: [],
    tasks: [],
    ctx: {},
    userTraits: {} // Nueva sección para memoria de usuario
  });
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('sandbox'); // sandbox | admin

  // ID persistente para memoria aunque no haya login
  const [userId] = useState(() => {
    const saved = localStorage.getItem('pandora_beta_user_id');
    if (saved) return saved;
    const newId = `user_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('pandora_beta_user_id', newId);
    return newId;
  });

  // Cargar lista de proyectos
  const fetchProjects = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('projects_beta')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setProjects(data || []);
      return data;
    } catch (err) {
      console.error('[BetaContext] Error fetching projects:', err);
      return [];
    }
  }, []);

  const loadLatestOrCreate = useCallback(async () => {
    try {
      setLoading(true);
      console.log('[BetaContext] Iniciando carga de proyecto...');
      
      let project = null;
      const { data: existingProjects, error: fetchError } = await supabase
        .from('projects_beta')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1);

      if (!fetchError && existingProjects && existingProjects.length > 0) {
        project = existingProjects[0];
        console.log('[BetaContext] Proyecto recuperado:', project.name);
      } else {
        console.warn('[BetaContext] No se encontraron proyectos o error de red. Intentando crear uno nuevo...');
        // Crear proyecto inicial
        const { data: newProject, error: createError } = await supabase
          .from('projects_beta')
          .insert([{ name: 'PANDORA DEFAULT PROJECT', description: 'Proyecto de respaldo' }])
          .select()
          .single();
        
        if (!createError) {
          project = newProject;
          console.log('[BetaContext] Nuevo proyecto creado:', project.name);
        }
      }

      // Si después de todo seguimos sin proyecto (ej. Supabase offline), usar mock local
      if (!project) {
        console.error('[BetaContext] Fallo crítico de conexión a Supabase. Activando modo local de emergencia.');
        project = {
          id: 'local-fallback-id',
          name: 'PANDORA LOCAL (Offline)',
          description: 'Modo sin persistencia activado por error de conexión'
        };
      }

      setActiveProject(project);
      
      if (project.id !== 'local-fallback-id') {
        await Promise.all([
          fetchArtifacts(project.id),
          fetchMemory(project.id),
          fetchLogs(project.id)
        ]);
      }

    } catch (err) {
      console.error('[BetaContext] Error crítico en loadLatestOrCreate:', err);
      // Fallback definitivo
      setActiveProject({
        id: 'local-fallback-id',
        name: 'PANDORA LOCAL (Error)',
        description: 'Error crítico de inicialización'
      });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchArtifacts = async (projectId) => {
    const { data } = await supabase
      .from('project_artifacts_beta')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    setArtifacts(data || []);
  };

  const fetchLogs = async (projectId) => {
    const { data } = await supabase
      .from('project_logs_beta')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });
    
    // Transformar logs a formato de mensajes si es necesario, 
    // o mantener mensajes separados. Por ahora, los mensajes se guardan en logs.
    if (data) {
      const msgs = data.map(log => ({
        id: log.id,
        role: log.source === 'assistant' ? 'assistant' : 'user', 
        content: log.action, // Usar action para el mensaje completo
        summary: log.result, // Mantener el resumen por si se necesita
        timestamp: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }));
      setMessages(msgs);
    }
  };

  const fetchMemory = async (projectId) => {
    const { data: context } = await supabase.from('project_context_beta').select('*').eq('project_id', projectId);
    const { data: decisions } = await supabase.from('project_decisions_beta').select('*').eq('project_id', projectId);
    const { data: tasks } = await supabase.from('project_tasks_beta').select('*').eq('project_id', projectId);

    setMemory({
      summary: '', // Podría venir de snapshots
      decisions: decisions || [],
      variables: context?.reduce((acc, curr) => ({ ...acc, [curr.key]: curr.value }), {}) || {},
      constraints: [],
      pendingTasks: tasks || [],
      documents: [],
      versionHistory: []
    });
  };

  useEffect(() => {
    fetchProjects();
    loadLatestOrCreate();
  }, [fetchProjects, loadLatestOrCreate]);

  // Recargar datos cuando cambie el proyecto activo
  useEffect(() => {
    if (activeProject?.id) {
       fetchArtifacts(activeProject.id);
       fetchMemory(activeProject.id);
       fetchLogs(activeProject.id);
    }
  }, [activeProject?.id]);

  // Función para sincronizar todo el estado del proyecto desde la BD
  const syncProjectData = useCallback(async (projectId) => {
    if (!projectId || projectId === 'local-fallback-id') return;
    try {
      await Promise.all([
        fetchArtifacts(projectId),
        fetchMemory(projectId),
        fetchLogs(projectId),
        fetchProjects() // Recargar lista lateral si cambió algo
      ]);
    } catch (err) {
      console.error('[BetaContext] Error syncing data:', err);
    }
  }, [fetchProjects]);

  const addMessage = (message) => {
    // UI Update inmediata y local
    setMessages(prev => [...prev, message]);
    
    // Si el mensaje tiene artefactos nuevos generados localmente, 
    // podrías guardarlos, pero el backend optimizado ya lo hace.
    if (message.artifacts && message.artifacts.length > 0) {
       setArtifacts(prev => [...prev, ...message.artifacts]);
    }
  };

  const createProject = async (name) => {
    try {
      const { data, error } = await supabase
        .from('projects_beta')
        .insert([{ name, status: 'active' }])
        .select()
        .single();
      
      if (error) throw error;
      setProjects(prev => [data, ...prev]);
      setActiveProject(data);
      setMessages([]);
      setArtifacts([]);
      return data;
    } catch (err) {
      console.error('[BetaContext] Error creating project:', err);
    }
  };

  const saveDecision = async (title, description, impact) => {
    if (!activeProject) return;
    const { data } = await supabase.from('project_decisions_beta').insert([{
      project_id: activeProject.id,
      title,
      description,
      impact
    }]).select().single();
    if (data) setMemory(prev => ({ ...prev, decisions: [...prev.decisions, data] }));
  };

  const saveTask = async (title, priority = 'medium') => {
    if (!activeProject) return;
    const { data } = await supabase.from('project_tasks_beta').insert([{
      project_id: activeProject.id,
      title,
      status: 'pending',
      priority
    }]).select().single();
    if (data) setMemory(prev => ({ ...prev, pendingTasks: [...prev.pendingTasks, data] }));
  };

  return (
    <BetaContext.Provider
      value={{
        activeProject,
        setActiveProject,
        projects,
        userId,
        messages,
        addMessage,
        syncProjectData,
        artifacts,
        memory,
        setMemory,
        createProject,
        saveDecision,
        saveTask,
        fetchProjects,
        loading,
        viewMode,
        setViewMode
      }}
    >
      {children}
    </BetaContext.Provider>

  );
}

export function useBeta() {
  const context = useContext(BetaContext);
  if (!context) {
    throw new Error('useBeta must be used within BetaProvider');
  }
  return context;
}
