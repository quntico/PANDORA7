export const TRANSLATIONS = {
  es: {
    header: {
      title: "PANDORA",
      nav: {
        home: "Inicio",
        evaluation: "Evaluación",
        simulation: "Simulación",
        analysis: "Análisis",
        history: "Historial",
        dashboard: "Panel de Control",
        sandbox: "SANDBOX EJECUTIVO",
        admin_system: "SISTEMA DE ADMINISTRACIÓN",
        sandbox_tab: "Sandbox",
        admin_tab: "Administración",
        vault_tab: "Bóveda",
        alpha_mode: "MODO ALPHA"
      },
      mode: {
        title: "MODO:",
        analyst: "Modo Analista",
        entrepreneur: "Modo Emprendedor"
      },
      focus: {
        show: "Mostrar interfaz completa",
        hide: "Modo foco — ocultar paneles",
        label: "FOCO"
      },
      status: {
        ai_sync: "IA Sincronizada"
      },
      settings: "Configuración",
      profile: "Perfil"
    },
    sidebar: {
      logo_title: "Regresar a The Sandbox",
      mode_beta: "MODO BETA",
      active_projects: "PROYECTOS ACTIVOS",
      new_project: "Nuevo Proyecto",
      admin: "Administración",
      simulator: "Simulador",
      alpha_config: "Configuración Alfa",
      exit_beta: "Salir Modo Beta",
      groups: {
        workspace: "ESPACIO DE TRABAJO",
        engine: "MOTOR DEL PROYECTO"
      },
      items: {
        memory: "Memoria del Proyecto",
        docs: "Documentación",
        history: "Historial de Capturas",
        tasks: "Decisiones y Tareas",
        versions: "Control de Versiones",
        tools: "Herramientas Conectadas"
      }
    },
    vault: {
      title: "BÓVEDA",
      subtitle: "Gestión de Proyectos Persistentes",
      new: "Nuevo",
      back_projects: "← Proyectos",
      no_projects: "Sin proyectos",
      project_files: "Archivos del Proyecto",
      upload: "Subir",
      view_extracted: "Ver contenido extraído",
      delete_file: "Eliminar archivo",
      filters: {
        all: "Todos",
        active: "Activos",
        archived: "Archivados"
      },
      status: {
        active: "Activo",
        paused: "Pausado",
        archived: "Archivado"
      },
      stats: {
        ai_analysis: "Análisis IA",
        files: "Archivos",
        decisions: "Decisiones",
        tasks: "Tareas",
        recent_decisions: "Decisiones Recientes",
        pending_tasks: "Tareas Pendientes"
      },
      editor: {
        edit_project: "Editar Proyecto",
        new_project: "Nuevo Proyecto",
        name: "Nombre",
        name_placeholder: "Nombre del proyecto...",
        description: "Descripción",
        desc_placeholder: "¿De qué trata este proyecto?",
        files_context: "Archivos de Contexto (arrastrar y soltar)",
        drag_drop_files: "Arrastra archivos aquí o haz clic",
        exec_notes: "Notas / Contexto Ejecutivo",
        notes_placeholder: "Información clave, supuestos, restricciones, objetivos...",
        tags: "Etiquetas (separadas por coma)",
        status: "Estado",
        save_project: "Guardar Proyecto"
      }
    },
    home: {
      hero: {
        title: "Análisis de Proyectos de Inversión",
        subtitle: "Proporciona los detalles de tu proyecto para análisis financiero impulsado por IA",
        description: "Evalúa la viabilidad de proyectos con análisis impulsado por IA, métricas financieras integrales y evaluación inteligente de riesgos. Toma decisiones basadas en datos con confianza.",
        ctaStart: "Crear nuevo análisis",
        ctaDashboard: "Ver Panel de Control"
      },
      features: {
        title: "Características Potentes",
        context: "Detección de Contexto IA",
        contextDesc: "Detecta automáticamente tipo de proyecto, etapa y riesgo",
        calculators: "Calculadoras Dinámicas",
        calculatorsDesc: "Calculadoras específicas para SaaS, Industrial, Inmobiliario y más",
        scenarios: "Análisis de Escenarios",
        scenariosDesc: "Compara escenarios Conservador, Realista y Optimista",
        decision: "Motor de Decisión",
        decisionDesc: "Sistema de puntuación multidimensional de viabilidad"
      },
      metrics: {
        title: "Métricas Financieras Integrales",
        subtitle: "Obtén información detallada con métricas financieras estándar de la industria"
      }
    },
    input: {
      title: "Análisis de Proyecto",
      subtitle: "Proporciona los detalles de tu proyecto para análisis financiero impulsado por IA",
      description: {
        title: "Descripción del Proyecto",
        placeholder: "Describe tu proyecto en detalle. Incluye el modelo de negocio, mercado objetivo, inversión necesaria, etapa actual, cronograma y resultados esperados...",
        example: "Ejemplo: \"Planeamos lanzar una plataforma SaaS para gestión de proyectos...\""
      },
      form: {
        title: "Información Estructurada",
        name: "Nombre del Proyecto",
        type: "Tipo de Proyecto",
        investment: "Monto de Inversión",
        timeline: "Cronograma (Meses)",
        stage: "Etapa Actual",
        autoDetect: "Auto-detectar desde descripción",
        submit: "Enviar análisis"
      }
    },
    analysis: {
      title: "Análisis",
      subtitle: "Configura las métricas de tu proyecto para modelado financiero detallado",
      context: {
        title: "Contexto del Proyecto Detectado",
        type: "Tipo",
        maturity: "Madurez",
        horizon: "Horizonte",
        risk: "Riesgo"
      },
      calculator: {
        alert: "Ajusta los controles deslizantes para configurar los parámetros financieros.",
        run: "Ejecutar Análisis Completo"
      }
    },
    dashboard: {
      title: "Panel de Control",
      loading_title: "CARGANDO SISTEMA BETA",
      loading_subtitle: "Sincronizando con Supabase Memory...",
      sync_badge: "Sincronizado",
      kpi: {
        npv: "Valor Actual Neto",
        irr: "TIR",
        payback: "Recuperación",
        risk: "Riesgo",
        profitability: "Rentabilidad"
      },
      cards: {
        radar: "Análisis Multidimensional",
        recommendation: "Dictamen General",
        sensitivity: "Sensibilidad",
        cashflow: "Flujo de Caja",
        scenarios: "Escenarios"
      }
    },
    chat: {
      welcome: "¡Hola! Soy PANDORA, tu asistente experto en evaluación de proyectos de inversión.",
      inputPlaceholder: "Inicia un análisis estratégico o selecciona una acción...",
      upload: "Adjuntar archivo",
      send: "Enviar",
      typing: "PANDORA está escribiendo...",
      error: "Error al procesar"
    },
    common: {
      loading: "Cargando...",
      error: "Error",
      success: "Éxito",
      back: "Volver",
      save: "Guardar",
      cancel: "Cancelar",
      updated_recent: "Actualizado: Recientemente",
      updated_recently: "Actualizado recientemente",
      recently: "Recientemente",
      updated: "Actualizado"
    }
  },
  en: {
    header: {
      title: "PANDORA",
      nav: {
        home: "Home",
        evaluation: "Evaluation",
        simulation: "Simulation",
        analysis: "Analysis",
        history: "History",
        dashboard: "Dashboard",
        sandbox: "EXECUTIVE SANDBOX",
        admin_system: "ADMINISTRATION SYSTEM",
        sandbox_tab: "Sandbox",
        admin_tab: "Administration",
        vault_tab: "Vault",
        alpha_mode: "ALPHA MODE"
      },
      mode: {
        title: "MODE:",
        analyst: "Analyst Mode",
        entrepreneur: "Entrepreneur Mode"
      },
      focus: {
        show: "Show full interface",
        hide: "Focus mode — hide panels",
        label: "FOCUS"
      },
      status: {
        ai_sync: "AI Synchronized"
      },
      settings: "Settings",
      profile: "Profile"
    },
    sidebar: {
      logo_title: "Return to The Sandbox",
      mode_beta: "BETA MODE",
      active_projects: "ACTIVE PROJECTS",
      new_project: "New Project",
      admin: "Administration",
      simulator: "Simulator",
      alpha_config: "Alpha Settings",
      exit_beta: "Exit Beta Mode",
      groups: {
        workspace: "WORKSPACE",
        engine: "PROJECT ENGINE"
      },
      items: {
        memory: "Project Memory",
        docs: "Documentation",
        history: "Snapshot History",
        tasks: "Decisions & Tasks",
        versions: "Version Control",
        tools: "Connected Tools"
      }
    },
    vault: {
      title: "VAULT",
      subtitle: "Management of Persistent Projects",
      new: "New",
      back_projects: "← Projects",
      no_projects: "No projects",
      project_files: "Project Files",
      upload: "Upload",
      view_extracted: "View extracted content",
      delete_file: "Delete file",
      filters: {
        all: "All",
        active: "Active",
        archived: "Archived"
      },
      status: {
        active: "Active",
        paused: "Paused",
        archived: "Archived"
      },
      stats: {
        ai_analysis: "AI Analysis",
        files: "Files",
        decisions: "Decisions",
        tasks: "Tasks",
        recent_decisions: "Recent Decisions",
        pending_tasks: "Pending Tasks"
      },
      editor: {
        edit_project: "Edit Project",
        new_project: "New Project",
        name: "Name",
        name_placeholder: "Project name...",
        description: "Description",
        desc_placeholder: "What is this project about?",
        files_context: "Context Files (drag & drop)",
        drag_drop_files: "Drag files here or click",
        exec_notes: "Notes / Executive Context",
        notes_placeholder: "Key information, assumptions, constraints, goals...",
        tags: "Tags (comma separated)",
        status: "Status",
        save_project: "Save Project"
      }
    },
    home: {
      hero: {
        title: "Investment Project Analysis",
        subtitle: "Provide your project details for AI-driven financial analysis",
        description: "Evaluate project viability with AI-powered analysis, comprehensive financial metrics, and intelligent risk assessment. Make data-driven decisions with confidence.",
        ctaStart: "Create new analysis",
        ctaDashboard: "View Dashboard"
      },
      features: {
        title: "Powerful Features",
        context: "AI Context Detection",
        contextDesc: "Automatically detects project type, stage, and risk",
        calculators: "Dynamic Calculators",
        calculatorsDesc: "Specific calculators for SaaS, Industrial, Real Estate and more",
        scenarios: "Scenario Analysis",
        scenariosDesc: "Compare Conservative, Realistic, and Optimistic scenarios",
        decision: "Decision Engine",
        decisionDesc: "Viability multi-dimensional scoring system"
      },
      metrics: {
        title: "Comprehensive Financial Metrics",
        subtitle: "Get detailed information with industry-standard financial metrics"
      }
    },
    input: {
      title: "Project Analysis",
      subtitle: "Provide your project details for AI-driven financial analysis",
      description: {
        title: "Project Description",
        placeholder: "Describe your project in detail. Include business model, target market, required investment, current stage, timeline, and expected outcomes...",
        example: "Example: \"We plan to launch a SaaS platform for project management...\""
      },
      form: {
        title: "Structured Information",
        name: "Project Name",
        type: "Project Type",
        investment: "Investment Amount",
        timeline: "Timeline (Months)",
        stage: "Current Stage",
        autoDetect: "Auto-detect from description",
        submit: "Submit analysis"
      }
    },
    analysis: {
      title: "Analysis",
      subtitle: "Configure your project metrics for detailed financial modeling",
      context: {
        title: "Detected Project Context",
        type: "Type",
        maturity: "Maturity",
        horizon: "Horizon",
        risk: "Risk"
      },
      calculator: {
        alert: "Adjust sliders to configure financial parameters.",
        run: "Run Full Analysis"
      }
    },
    dashboard: {
      title: "Dashboard",
      loading_title: "LOADING BETA SYSTEM",
      loading_subtitle: "Synchronizing with Supabase Memory...",
      sync_badge: "Synchronized",
      kpi: {
        npv: "Net Present Value",
        irr: "IRR",
        payback: "Payback",
        risk: "Risk",
        profitability: "Profitability"
      },
      cards: {
        radar: "Multi-dimensional Analysis",
        recommendation: "General Verdict",
        sensitivity: "Sensitivity",
        cashflow: "Cash Flow",
        scenarios: "Scenarios"
      }
    },
    chat: {
      welcome: "Hello! I am PANDORA, your expert assistant in investment project evaluation.",
      inputPlaceholder: "Start a strategic analysis or select an action...",
      upload: "Attach file",
      send: "Send",
      typing: "PANDORA is typing...",
      error: "Error processing"
    },
    common: {
      loading: "Loading...",
      error: "Error",
      success: "Success",
      back: "Back",
      save: "Save",
      cancel: "Cancel",
      updated_recent: "Updated: Recently",
      updated_recently: "Updated recently",
      recently: "Recently",
      updated: "Updated"
    }
  }
};
