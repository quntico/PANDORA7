
import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import InputField from '@/components/InputField';
import { useProject } from '@/context/ProjectContext';
import { useContextEngine } from '@/hooks/useContextEngine';
import { Lightbulb, ArrowRight, FileText, Layers } from 'lucide-react';

function InputPage() {
  const navigate = useNavigate();
  const { updateProjectData, setContextData } = useProject();
  const { analyzeContext } = useContextEngine();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    projectType: '',
    investmentAmount: '',
    timeline: '',
    currentStage: ''
  });

  const [charCount, setCharCount] = useState(0);

  const handleDescriptionChange = (e) => {
    const text = e.target.value;
    setFormData(prev => ({ ...prev, description: text }));
    setCharCount(text.length);
  };

  const handleSubmit = () => {
    const projectData = {
      ...formData,
      investmentAmount: parseFloat(formData.investmentAmount) || 0,
      timeline: parseInt(formData.timeline) || 12
    };

    updateProjectData(projectData);
    const context = analyzeContext(projectData);
    setContextData(context);
    
    navigate('/analysis');
  };

  const exampleText = `Ejemplo: "Planeamos lanzar una plataforma SaaS para gestión de proyectos dirigida a pequeñas empresas. 
La inversión inicial necesaria es de $150,000 para desarrollo y marketing. 
Tenemos un MVP validado con 50 usuarios beta y planeamos lanzar en 6 meses. 
El precio esperado es de $29/mes por usuario con una meta de 1000 usuarios en el primer año."`;

  return (
    <>
      <Helmet>
        <title>Entrada de Proyecto - PANDORA</title>
      </Helmet>

      <div className="min-h-screen py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent mb-4">
              Análisis de Proyecto
            </h1>
            <p className="text-gray-400 text-lg">
              Proporciona los detalles de tu proyecto para análisis financiero impulsado por IA
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Free-form Description */}
            <div className="space-y-6">
              <div className="p-8 rounded-2xl backdrop-blur-xl bg-gray-900/40 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 rounded-lg bg-cyan-900/30 border border-cyan-500/30 text-cyan-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Descripción del Proyecto</h2>
                </div>
                
                <textarea
                  value={formData.description}
                  onChange={handleDescriptionChange}
                  placeholder="Describe tu proyecto en detalle. Incluye el modelo de negocio, mercado objetivo, inversión necesaria, etapa actual, cronograma y resultados esperados..."
                  className="w-full h-80 px-5 py-4 bg-gray-800/40 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all resize-none leading-relaxed"
                />
                
                <div className="flex justify-between items-center mt-3">
                  <span className="text-xs text-gray-500">{charCount} caracteres</span>
                  <span className="text-xs text-cyan-500/70">Mínimo 50 caracteres recomendado</span>
                </div>
              </div>

              <div className="p-6 rounded-2xl backdrop-blur-md bg-gradient-to-br from-blue-900/10 to-cyan-900/10 border border-cyan-500/20">
                <div className="flex items-center gap-2 mb-3 text-cyan-400">
                  <Lightbulb className="w-4 h-4" />
                  <h3 className="text-sm font-semibold">Ejemplo de Descripción</h3>
                </div>
                <p className="text-sm text-gray-300 leading-relaxed italic border-l-2 border-cyan-500/30 pl-4 py-1">
                  {exampleText}
                </p>
              </div>
            </div>

            {/* Right Column - Structured Form */}
            <div className="space-y-6">
              <div className="p-8 rounded-2xl backdrop-blur-xl bg-gray-900/40 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.1)] space-y-8">
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-2 rounded-lg bg-cyan-900/30 border border-cyan-500/30 text-cyan-400">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h2 className="text-xl font-semibold text-white">Información Estructurada</h2>
                </div>
                
                <InputField
                  label="Nombre del Proyecto"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Ingresa el nombre del proyecto"
                  description="Un nombre claro y descriptivo para tu proyecto"
                  className="bg-gray-800/40 border-gray-700/50 focus:border-cyan-500/50"
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-200">
                    Tipo de Proyecto
                  </label>
                  <select
                    value={formData.projectType}
                    onChange={(e) => setFormData(prev => ({ ...prev, projectType: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800/40 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  >
                    <option value="">Auto-detectar desde descripción</option>
                    <option value="SaaS">SaaS / Software</option>
                    <option value="Industrial">Industrial / Manufactura</option>
                    <option value="Real Estate">Inmobiliario / Real Estate</option>
                    <option value="Energy">Energía / Renovable</option>
                    <option value="Infrastructure">Infraestructura</option>
                    <option value="Commercial">Comercial / Retail</option>
                  </select>
                </div>

                <InputField
                  label="Monto de Inversión (USD)"
                  type="number"
                  value={formData.investmentAmount}
                  onChange={(e) => setFormData(prev => ({ ...prev, investmentAmount: e.target.value }))}
                  placeholder="150000"
                  description="Inversión inicial total requerida"
                  className="bg-gray-800/40 border-gray-700/50 focus:border-cyan-500/50"
                />

                <InputField
                  label="Cronograma (Meses)"
                  type="number"
                  value={formData.timeline}
                  onChange={(e) => setFormData(prev => ({ ...prev, timeline: e.target.value }))}
                  placeholder="12"
                  description="Duración estimada del proyecto"
                  className="bg-gray-800/40 border-gray-700/50 focus:border-cyan-500/50"
                />

                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-200">
                    Etapa Actual
                  </label>
                  <select
                    value={formData.currentStage}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentStage: e.target.value }))}
                    className="w-full px-4 py-3 bg-gray-800/40 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                  >
                    <option value="">Auto-detectar desde descripción</option>
                    <option value="Idea">Idea / Concepto</option>
                    <option value="Validated">Validado / MVP</option>
                    <option value="In Operation">En Operación</option>
                  </select>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!formData.name && !formData.description}
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-7 text-lg rounded-xl shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
                >
                  Enviar Análisis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default InputPage;
