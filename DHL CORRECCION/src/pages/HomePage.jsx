
import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, TrendingUp, BarChart3, Target, Shield, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ChatInputBox from '@/components/ChatInputBox';

function HomePage() {
  const navigate = useNavigate();

  return (
    <>
      <Helmet>
        <title>PANDORA - Análisis de Proyectos de Inversión</title>
        <meta name="description" content="Plataforma de análisis financiero y toma de decisiones impulsada por IA." />
      </Helmet>

      <div className="min-h-screen">
        {/* Hero Section */}
        <section className="pt-24 pb-16 text-center relative overflow-hidden">
          {/* Background Glows */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-cyan-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="max-w-5xl mx-auto space-y-8 px-6 relative z-10">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-950/30 border border-cyan-500/30 text-cyan-400 text-sm font-medium transition-opacity duration-300">
              <Sparkles className="w-4 h-4" />
              <span>Potenciado por Inteligencia Artificial</span>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-white via-cyan-100 to-gray-400 bg-clip-text text-transparent pb-2 tracking-tight">
              Análisis de Proyectos<br />de Inversión
            </h1>
            
            <p className="text-xl text-gray-300 max-w-2xl mx-auto leading-relaxed">
              Proporciona los detalles de tu proyecto para análisis financiero impulsado por IA, 
              métricas integrales y evaluación de riesgos en tiempo real.
            </p>
            
            {/* Chat Input Box Feature */}
            <div className="py-10">
              <ChatInputBox />
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Button
                onClick={() => navigate('/analysis-input')}
                className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white border-0 px-8 py-6 text-lg rounded-xl shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all hover:scale-105"
              >
                Crear nuevo análisis
              </Button>
              <Button
                onClick={() => navigate('/dashboard')}
                variant="outline"
                className="bg-gray-900/40 backdrop-blur-md border-cyan-500/30 text-cyan-100 hover:bg-cyan-500/10 hover:border-cyan-400/50 px-8 py-6 text-lg rounded-xl"
              >
                Ver Panel de Control
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 bg-[#0F172A]/50 relative">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-16 text-white flex flex-col items-center gap-4">
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Características Potentes</span>
              <span className="w-24 h-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-full" />
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <FeatureCard
                icon={<TrendingUp className="w-8 h-8" />}
                title="Detección de Contexto"
                description="Detecta automáticamente el tipo de proyecto, etapa de madurez y nivel de riesgo desde tu descripción."
              />
              <FeatureCard
                icon={<BarChart3 className="w-8 h-8" />}
                title="Calculadoras Dinámicas"
                description="Calculadoras específicas para SaaS, Industrial, Inmobiliario, Energía y más sectores."
              />
              <FeatureCard
                icon={<Target className="w-8 h-8" />}
                title="Análisis de Escenarios"
                description="Compara escenarios Conservador, Realista y Optimista lado a lado con un solo clic."
              />
              <FeatureCard
                icon={<Shield className="w-8 h-8" />}
                title="Motor de Decisión"
                description="Sistema de puntuación multidimensional que evalúa rentabilidad, riesgo y viabilidad."
              />
            </div>
          </div>
        </section>

        {/* Metrics Section */}
        <section className="py-20 relative overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px] bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" />
          
          <div className="max-w-7xl mx-auto text-center px-6 relative z-10">
            <h2 className="text-3xl font-bold mb-4 text-white">
              Métricas Financieras Integrales
            </h2>
            <p className="text-gray-400 mb-16 max-w-2xl mx-auto">
              Obtén información detallada con métricas financieras estándar de la industria y análisis personalizado.
            </p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
              <MetricItem label="VAN (NPV)" />
              <MetricItem label="TIR (IRR)" />
              <MetricItem label="Periodo Recuperación" />
              <MetricItem label="EBITDA" />
              <MetricItem label="Punto de Equilibrio" />
              <MetricItem label="Flujo de Caja" />
            </div>
          </div>
        </section>
      </div>
    </>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="p-8 rounded-2xl backdrop-blur-xl bg-gray-900/40 border border-cyan-500/10 hover:border-cyan-500/40 hover:bg-gray-800/60 hover:shadow-[0_0_30px_rgba(6,182,212,0.1)] transition-all duration-300 group">
      <div className="w-14 h-14 rounded-xl bg-cyan-950/50 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mb-6 group-hover:scale-110 group-hover:bg-cyan-900/50 transition-all">
        {icon}
      </div>
      <h3 className="text-xl font-semibold text-white mb-3">{title}</h3>
      <p className="text-sm text-gray-400 leading-relaxed">{description}</p>
    </div>
  );
}

function MetricItem({ label }) {
  return (
    <div className="space-y-3 group cursor-default">
      <div className="w-20 h-20 mx-auto rounded-2xl bg-gradient-to-br from-gray-800 to-gray-900 border border-cyan-500/20 flex items-center justify-center shadow-lg group-hover:border-cyan-500/50 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] transition-all duration-300">
        <BarChart3 className="w-8 h-8 text-cyan-500 group-hover:text-cyan-400 transition-colors" />
      </div>
      <p className="text-sm font-medium text-gray-300 group-hover:text-cyan-400 transition-colors">{label}</p>
    </div>
  );
}

export default HomePage;
