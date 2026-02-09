
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
        <title>Analysis Results - PANDORA</title>
        <meta name="description" content="Comprehensive financial analysis results with multi-scenario comparison and decision recommendations." />
      </Helmet>

      <div className="min-h-screen py-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-white mb-3">
              Analysis Results
            </h1>
            <p className="text-gray-400">
              Comprehensive financial analysis and viability assessment
            </p>
          </div>

          {/* Scenario Toggle */}
          <div className="flex justify-center">
            <ScenarioToggle value={selectedScenario} onChange={setSelectedScenario} />
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Net Present Value"
              value={formatCurrency(currentScenarioData.npv)}
              subtitle="USD"
            />
            <KPICard
              title="Internal Rate of Return"
              value={`${(currentScenarioData.irr * 100).toFixed(2)}%`}
              subtitle="IRR"
            />
            <KPICard
              title="Payback Period"
              value={currentScenarioData.payback ? currentScenarioData.payback.toFixed(1) : 'N/A'}
              subtitle="years"
            />
            <KPICard
              title="Project Type"
              value={analysisResults.projectType}
              subtitle="Context"
            />
          </div>

          {/* Tabs */}
          <div className="flex gap-4 border-b border-gray-700">
            <TabButton active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')}>
              Financial Metrics
            </TabButton>
            <TabButton active={activeTab === 'cashflow'} onClick={() => setActiveTab('cashflow')}>
              Cash Flow Projection
            </TabButton>
            <TabButton active={activeTab === 'scenarios'} onClick={() => setActiveTab('scenarios')}>
              Scenario Comparison
            </TabButton>
            <TabButton active={activeTab === 'decision'} onClick={() => setActiveTab('decision')}>
              Decision Engine
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
              View Dashboard
            </Button>
            <Button
              onClick={() => {
                resetProject();
                navigate('/analysis-input');
              }}
              variant="outline"
              className="border-gray-700 text-gray-300 hover:bg-gray-800 px-8 py-6 text-lg rounded-xl"
            >
              New Analysis
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
      <h2 className="text-2xl font-bold text-white mb-6">Financial Metrics Summary</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <MetricRow label="Net Present Value (NPV)" value={formatCurrency(data.npv)} positive={data.npv > 0} />
        <MetricRow label="Internal Rate of Return (IRR)" value={`${(data.irr * 100).toFixed(2)}%`} positive={data.irr > 0.1} />
        <MetricRow label="Payback Period" value={data.payback ? `${data.payback.toFixed(1)} years` : 'N/A'} positive={data.payback < 3} />
        <MetricRow label="5-Year Total Cash Flow" value={formatCurrency(data.cashFlows.reduce((a, b) => a + b, 0))} positive={data.cashFlows.reduce((a, b) => a + b, 0) > 0} />
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
      <h2 className="text-2xl font-bold text-white mb-6">5-Year Cash Flow Projection</h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Year</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Cash Flow</th>
              <th className="text-right py-3 px-4 text-gray-400 font-medium">Cumulative</th>
            </tr>
          </thead>
          <tbody>
            {data.cashFlows.map((cf, idx) => {
              const cumulative = data.cashFlows.slice(0, idx + 1).reduce((a, b) => a + b, 0);
              return (
                <tr key={idx} className="border-b border-gray-800">
                  <td className="py-3 px-4 text-white font-medium">Year {idx}</td>
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
      <h2 className="text-2xl font-bold text-white mb-6">Scenario Comparison</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {scenarios.map(scenario => (
          <div key={scenario.scenario} className="p-6 rounded-xl bg-gray-800/50 border border-gray-700 space-y-4">
            <h3 className="text-lg font-semibold text-white capitalize">{scenario.scenario}</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">NPV</p>
                <p className={`text-xl font-bold ${scenario.npv > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(scenario.npv)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">IRR</p>
                <p className="text-xl font-bold text-teal-400">
                  {(scenario.irr * 100).toFixed(2)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Payback</p>
                <p className="text-xl font-bold text-blue-400">
                  {scenario.payback ? `${scenario.payback.toFixed(1)}y` : 'N/A'}
                </p>
              </div>
            </div>
          </div>
        ))}
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
        <h3 className="text-xl font-bold text-white mb-6">Multi-Dimensional Analysis</h3>
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
            Main Risks
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
            Recommendations
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

  return (
    <div>
      <div className="flex justify-between mb-2">
        <span className="text-sm font-medium text-gray-300 capitalize">{label}</span>
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
      label: '🟢 Highly Viable Project',
      description: 'Strong financial metrics and low risk profile. Recommended for investment.',
      icon: <CheckCircle className="w-12 h-12 text-green-400" />,
      borderColor: 'border-green-500',
      bgColor: 'bg-green-900/20',
      risks: ['Market competition', 'Execution challenges', 'Timing risks'],
      recommendations: ['Proceed with confidence', 'Secure funding promptly', 'Build strong team']
    };
  } else if (score >= 50) {
    return {
      label: '🟡 Viable with Adjustments',
      description: 'Positive potential but requires optimization in key areas.',
      icon: <TrendingUp className="w-12 h-12 text-yellow-400" />,
      borderColor: 'border-yellow-500',
      bgColor: 'bg-yellow-900/20',
      risks: ['Cash flow timing', 'Market validation needed', 'Higher than average risk'],
      recommendations: ['Improve unit economics', 'Validate market demand', 'Reduce initial costs']
    };
  } else if (score >= 25) {
    return {
      label: '🔴 High Risk Project',
      description: 'Significant concerns identified. Not recommended without major changes.',
      icon: <AlertTriangle className="w-12 h-12 text-red-400" />,
      borderColor: 'border-red-500',
      bgColor: 'bg-red-900/20',
      risks: ['Negative NPV', 'Extended payback period', 'Low profitability', 'Market uncertainty'],
      recommendations: ['Reconsider business model', 'Reduce costs significantly', 'Seek alternative approaches']
    };
  } else {
    return {
      label: '⚠️ Not Recommended',
      description: 'Critical issues detected. Project not viable in current form.',
      icon: <XCircle className="w-12 h-12 text-red-500" />,
      borderColor: 'border-red-600',
      bgColor: 'bg-red-900/30',
      risks: ['Severe negative returns', 'Unsustainable economics', 'Very high risk'],
      recommendations: ['Do not proceed', 'Fundamental redesign required', 'Consider alternative opportunities']
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
