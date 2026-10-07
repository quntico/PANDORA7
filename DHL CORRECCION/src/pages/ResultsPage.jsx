
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import KPICard from '@/components/KPICard';
import AlertBox from '@/components/AlertBox';
import ScenarioToggle from '@/components/ScenarioToggle';
import { useProject } from '@/context/ProjectContext';
import { TrendingUp, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

function ResultsPage() {
  const navigate = useNavigate();
  const { analysisResults, selectedScenario, setSelectedScenario, resetProject } = useProject();
  const [activeTab, setActiveTab] = useState('metrics');

  useEffect(() => {
    if (!analysisResults) {
      navigate('/analysis');
    }
  }, [analysisResults, navigate]);

  if (!analysisResults) {
    return null;
  }

  const currentScenarioData = analysisResults.scenarios.find(s => s.scenario === selectedScenario);
  
  // Decision Engine Scoring
  const decisionScore = calculateDecisionScore(currentScenarioData);
  const verdict = getVerdict(decisionScore.overall);

  return (
    <>
      <Helmet>
        <title>Resultados del Análisis - PANDORA</title>
        <meta name="description" content="Resultados completos del análisis financiero con comparación de múltiples escenarios y recomendaciones de decisión." />
      </Helmet>

      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-3">
              Resultados del Análisis
            </h1>
            <p className="text-gray-400">
              Análisis financiero integral y evaluación de viabilidad
            </p>
          </div>

          {/* Scenario Toggle */}
          <div className="flex justify-center">
            <ScenarioToggle value={selectedScenario} onChange={setSelectedScenario} />
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Valor Actual Neto"
              value={formatCurrency(currentScenarioData.npv)}
              subtitle="VAN (USD)"
            />
            <KPICard
              title="Tasa Interna de Retorno"
              value={`${(currentScenarioData.irr * 100).toFixed(2)}%`}
              subtitle="TIR"
            />
            <KPICard
              title="Periodo de Recuperación"
              value={currentScenarioData.payback ? `${currentScenarioData.payback.toFixed(1)} años` : 'N/A'}
              subtitle="Payback"
            />
            <KPICard
              title="Tipo de Proyecto"
              value={analysisResults.projectType}
              subtitle="Contexto"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-700">
            <TabButton active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')}>
              Métricas Financieras
            </TabButton>
            <TabButton active={activeTab === 'cashflow'} onClick={() => setActiveTab('cashflow')}>
              Proyección del Flujo de Caja
            </TabButton>
            <TabButton active={activeTab === 'scenarios'} onClick={() => setActiveTab('scenarios')}>
              Comparativa de Escenarios
            </TabButton>
            <TabButton active={activeTab === 'decision'} onClick={() => setActiveTab('decision')}>
              Motor de Decisión
            </TabButton>
          </div>

          {/* Tab Content */}
          {activeTab === 'metrics' && <MetricsTab data={currentScenarioData} />}
          {activeTab === 'cashflow' && <CashFlowTab data={currentScenarioData} />}
          {activeTab === 'scenarios' && <ScenariosTab scenarios={analysisResults.scenarios} />}
          {activeTab === 'decision' && <DecisionTab score={decisionScore} verdict={verdict} />}

          {/* Actions */}
          <div className="flex gap-4 justify-center">
            <Button
              onClick={() => navigate('/dashboard')}
              className="bg-gradient-to-r from-teal-500 to-blue-600 hover:from-teal-600 hover:to-blue-700 text-white px-8 py-6 text-lg rounded-xl"
            >
              Ver Panel de Control
            </Button>
            <Button
              onClick={() => {
                resetProject();
                navigate('/analysis-input');
              }}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 px-8 py-6 text-lg rounded-xl"
            >
              Nuevo Análisis
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-6 py-3 font-medium transition-all ${
        active
          ? 'text-teal-400 border-b-2 border-teal-400'
          : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

function MetricsTab({ data }) {
  return (
    <div className="p-6 rounded-2xl backdrop-blur-md bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50">
      <h2 className="text-2xl font-bold text-white mb-6">Resumen de Métricas Financieras</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricRow label="Valor Actual Neto (VAN)" value={formatCurrency(data.npv)} positive={data.npv > 0} />
        <MetricRow label="Tasa Interna de Retorno (TIR)" value={`${(data.irr * 100).toFixed(2)}%`} positive={data.irr > 0.1} />
        <MetricRow label="Periodo de Recuperación" value={data.payback ? `${data.payback.toFixed(1)} años` : 'N/A'} positive={data.payback < 3} />
        <MetricRow label="Flujo de Caja Total a 5 Años" value={formatCurrency(data.cashFlows.reduce((a, b) => a + b, 0))} positive={data.cashFlows.reduce((a, b) => a + b, 0) > 0} />
      </div>
    </div>
  );
}

function MetricRow({ label, value, positive }) {
  return (
    <div className="flex justify-between items-center p-4 rounded-lg bg-gray-800/50 border border-gray-700">
      <span className="text-gray-300">{label}</span>
      <span className={`font-semibold ${positive ? 'text-green-400' : 'text-red-400'}`}>
        {value}
      </span>
    </div>
  );
}

function CashFlowTab({ data }) {
  return (
    <div className="p-6 rounded-2xl backdrop-blur-md bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50">
      <h2 className="text-2xl font-bold text-white mb-6">Proyección del Flujo de Caja a 5 Años</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Año</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Flujo de Caja</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Acumulado</th>
            </tr>
          </thead>
          <tbody>
            {data.cashFlows.map((cf, idx) => {
              const cumulative = data.cashFlows.slice(0, idx + 1).reduce((a, b) => a + b, 0);
              return (
                <tr key={idx} className="border-b border-gray-800">
                  <td className="py-3 px-4 text-white font-medium">Año {idx}</td>
                  <td className={`text-right py-3 px-4 font-semibold ${cf >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(cf)}
                  </td>
                  <td className={`text-right py-3 px-4 font-semibold ${cumulative >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(cumulative)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ScenariosTab({ scenarios }) {
  return (
    <div className="p-6 rounded-2xl backdrop-blur-md bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50">
      <h2 className="text-2xl font-bold text-white mb-6">Comparativa de Escenarios</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scenarios.map(scenario => {
          const scenarioTranslation = {
            conservative: 'conservador',
            realistic: 'realista',
            optimistic: 'optimista'
          }[scenario.scenario] || scenario.scenario;
          return (
            <div key={scenario.scenario} className="p-6 rounded-xl bg-gray-800/50 border border-gray-700 space-y-4">
              <h3 className="text-lg font-semibold text-white capitalize">{scenarioTranslation}</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">VAN</p>
                  <p className={`text-xl font-bold ${scenario.npv > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(scenario.npv)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">TIR</p>
                  <p className="text-xl font-bold text-teal-400">
                    {(scenario.irr * 100).toFixed(2)}%
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Recuperación (Payback)</p>
                  <p className="text-xl font-bold text-blue-400">
                    {scenario.payback ? `${scenario.payback.toFixed(1)}a` : 'N/A'}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DecisionTab({ score, verdict }) {
  return (
    <div className="space-y-6">
      {/* Overall Verdict */}
      <div className={`p-8 rounded-2xl backdrop-blur-md border-2 ${verdict.borderColor} ${verdict.bgColor}`}>
        <div className="flex items-center gap-4 mb-4">
          {verdict.icon}
          <h2 className="text-3xl font-bold text-white">{verdict.label}</h2>
        </div>
        <p className="text-lg text-gray-200">{verdict.description}</p>
      </div>

      {/* Dimension Scores */}
      <div className="p-6 rounded-2xl backdrop-blur-md bg-gradient-to-br from-gray-800/80 to-gray-900/80 border border-gray-700/50">
        <h3 className="text-xl font-bold text-white mb-6">Análisis Multidimensional</h3>
        <div className="space-y-4">
          {Object.entries(score.dimensions).map(([key, value]) => (
            <DimensionScore key={key} label={key} score={value} />
          ))}
        </div>
      </div>

      {/* Risks & Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 rounded-2xl backdrop-blur-md bg-gradient-to-br from-red-900/20 to-gray-900/80 border border-red-700/50">
          <h3 className="text-lg font-bold text-red-300 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Principales Riesgos
          </h3>
          <ul className="space-y-2">
            {verdict.risks.map((risk, idx) => (
              <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                <span>{risk}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-6 rounded-2xl backdrop-blur-md bg-gradient-to-br from-green-900/20 to-gray-900/80 border border-green-700/50">
          <h3 className="text-lg font-bold text-green-300 mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            Recomendaciones
          </h3>
          <ul className="space-y-2">
            {verdict.recommendations.map((rec, idx) => (
              <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                <span className="text-green-400 mt-1">•</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function DimensionScore({ label, score }) {
  const getColor = (score) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 50) return 'bg-yellow-500';
    if (score >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const dimensionTranslations = {
    profitability: 'Rentabilidad',
    liquidity: 'Liquidez',
    risk: 'Riesgo',
    robustness: 'Robustez de Caja',
    scalability: 'Escalabilidad',
    realism: 'Realismo del Escenario'
  };

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-300 capitalize">{dimensionTranslations[label] || label}</span>
        <span className="text-sm font-bold text-teal-400">{score}/100</span>
      </div>
      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
        <div
          className={`h-full ${getColor(score)} transition-all duration-500`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function calculateDecisionScore(data) {
  const profitability = Math.min(100, Math.max(0, (data.npv / 100000) * 50 + 50));
  const liquidity = Math.min(100, Math.max(0, data.payback ? (5 - data.payback) * 20 : 0));
  const risk = Math.min(100, Math.max(0, data.irr > 0.15 ? 80 : data.irr > 0.1 ? 60 : 40));
  const robustness = Math.min(100, Math.max(0, data.cashFlows.filter(cf => cf > 0).length * 20));
  const scalability = Math.min(100, Math.max(0, data.irr * 300));
  const realism = 70; // Based on scenario type

  return {
    dimensions: {
      profitability: Math.round(profitability),
      liquidity: Math.round(liquidity),
      risk: Math.round(risk),
      robustness: Math.round(robustness),
      scalability: Math.round(scalability),
      realism: Math.round(realism)
    },
    overall: Math.round((profitability + liquidity + risk + robustness + scalability + realism) / 6)
  };
}

function getVerdict(score) {
  if (score >= 75) {
    return {
      label: '🟢 Proyecto Altamente Viable',
      description: 'Sólidas métricas financieras y perfil de bajo riesgo. Altamente recomendado para inversión.',
      icon: <CheckCircle className="w-12 h-12 text-green-400" />,
      borderColor: 'border-green-500',
      bgColor: 'bg-green-900/20',
      risks: ['Competencia en el mercado', 'Desafíos de ejecución operativa', 'Riesgos de sincronización (timing)'],
      recommendations: ['Proceder con total confianza', 'Asegurar el financiamiento de inmediato', 'Consolidar un equipo de alto rendimiento']
    };
  } else if (score >= 50) {
    return {
      label: '🟡 Viable con Ajustes',
      description: 'Potencial positivo, pero requiere optimizaciones en áreas clave antes de proceder.',
      icon: <TrendingUp className="w-12 h-12 text-yellow-400" />,
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-900/20',
      risks: ['Tiempos y flujo de caja', 'Validación comercial requerida', 'Riesgo superior al promedio'],
      recommendations: ['Optimizar costos unitarios', 'Validar la demanda del mercado', 'Reducir los gastos iniciales (CAPEX)']
    };
  } else if (score >= 25) {
    return {
      label: '🔴 Proyecto de Alto Riesgo',
      description: 'Se han identificado preocupaciones significativas. No se recomienda sin cambios estructurales profundos.',
      icon: <AlertTriangle className="w-12 h-12 text-red-400" />,
      borderColor: 'border-red-500',
      bgColor: 'bg-red-900/20',
      risks: ['Valor Actual Neto (VAN) negativo', 'Periodo de recuperación extendido', 'Baja rentabilidad estimada', 'Incertidumbre crítica del mercado'],
      recommendations: ['Revaluar el modelo de negocio', 'Reducir costos de manera drástica', 'Explorar enfoques estratégicos alternativos']
    };
  } else {
    return {
      label: '⚠️ No Recomendado',
      description: 'Problemas críticos detectados. El proyecto no es viable en su forma actual.',
      icon: <XCircle className="w-12 h-12 text-red-500" />,
      borderColor: 'border-red-600',
      bgColor: 'bg-red-900/30',
      risks: ['Retornos negativos graves', 'Estructura financiera insostenible', 'Riesgo extremadamente alto'],
      recommendations: ['No continuar con la inversión', 'Rediseño fundamental del proyecto', 'Considerar otras oportunidades de negocio']
    };
  }
}

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
}

export default ResultsPage;
