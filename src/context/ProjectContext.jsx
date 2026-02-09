
import React, { createContext, useContext, useState } from 'react';

const ProjectContext = createContext();

export function ProjectProvider({ children }) {
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

  const updateProjectData = (data) => {
    setProjectData(prev => ({ ...prev, ...data }));
  };

  const updateCalculatorMetrics = (metrics) => {
    setCalculatorMetrics(prev => ({ ...prev, ...metrics }));
  };

  const resetProject = () => {
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
        resetProject
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
