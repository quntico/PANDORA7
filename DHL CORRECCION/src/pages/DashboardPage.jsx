import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import BottomNavigation from '@/components/BottomNavigation';
import KPICard from '@/components/KPICard';
import RecommendationCard from '@/components/RecommendationCard';
import SensitivitySlider from '@/components/SensitivitySlider';
import RadarChartCard from '@/components/RadarChartCard';
import CashFlowChart from '@/components/CashFlowChart';
import ScenarioChart from '@/components/ScenarioChart';
import ProjectParametersModal from '@/components/dashboard/ProjectParametersModal'; // Import Modal
import { useProject } from '@/context/ProjectContext';
import {
  DollarSign,
  Percent,
  Clock,
  Activity,
  TrendingUp,
  Settings,
  Edit3
} from 'lucide-react';

function DashboardPage() {
  const { calculatorMetrics, analysisResults } = useProject();
  const [isParamsModalOpen, setIsParamsModalOpen] = useState(false);

  // Helper to format currency
  const formatCurrency = (val) => {
    if (val === undefined || val === null) return '$0';
    return val.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
  };

  // Helper to format percentage
  const formatPercent = (val) => {
    if (val === undefined || val === null) return '0%';
    return `${(val * 100).toFixed(1)}%`;
  };

  // Derived Values from synced data
  // Note: 'analysisResults' comes from FlowDesigner sync
  // 'calculatorMetrics' might come from InputPage or synced
  const sourceData = calculatorMetrics || analysisResults || {}; // Prioritize calculatorMetrics as it has the recalcs

  const van = sourceData.netPresentValue || 0;
  const tir = sourceData.irr ? (sourceData.irr < 1 ? sourceData.irr : sourceData.irr / 100) : 0; // Handle if it comes as 25 or 0.25

  const payback = sourceData.paybackYears ? `${sourceData.paybackYears.toFixed(1)} años` : 'N/A';
  const score = sourceData.roi ? Math.min(100, Math.round(sourceData.roi / 2)) : 0; // Simple score logic based on ROI

  return (
    <>
      <Helmet>
        <title>Panel de Control - PANDORA</title>
      </Helmet>

      {/* Deep dark futuristic background */}
      <div className="min-h-screen bg-deep text-white flex flex-col font-sans selection:bg-neon-cyan/30">

        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          <div className="max-w-[1800px] mx-auto space-y-4 pb-20">

            {/* Compact Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                  Análisis Financiero
                </h1>
                <p className="text-sm text-gray-400 mt-0.5">Dashboard de Inversión: {sourceData.notes || 'Proyecto General'}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/30 px-3 py-1.5 rounded-full font-medium">
                  ● En vivo
                </span>
                <button
                  onClick={() => setIsParamsModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 border border-gray-700 hover:bg-gray-700 hover:border-gray-500 transition-all text-xs text-gray-300 font-medium"
                >
                  <Edit3 className="w-3 h-3" />
                  Parámetros
                </button>
              </div>
            </div>

            {/* FILA 1: KPIs Compactos Horizontales (5 columnas) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <KPICard
                title="VAN (Estimado)"
                value={formatCurrency(van)}
                subtitle="Valor Actual Neto"
                icon={DollarSign}
                trend={12.5}
                borderColor="border-neon-cyan/30"
              />
              <KPICard
                title="TIR"
                value={formatPercent(tir)}
                subtitle="Tasa Interna Retorno"
                icon={Percent}
                trend={5.2}
                status="high"
                borderColor="border-neon-blue/30"
              />
              <KPICard
                title="Payback"
                value={payback}
                subtitle="Recuperación"
                icon={Clock}
                borderColor="border-neon-purple/30"
              />
              <KPICard
                title="Inversión Inicial"
                value={formatCurrency(sourceData.investment_amount || sourceData.investment || 0)}
                subtitle="CAPEX Total"
                icon={Activity}
                status="medium"
                borderColor="border-yellow-500/30"
              />
              <KPICard
                title="Score"
                value={`${score}/100`}
                subtitle="Viabilidad General"
                icon={TrendingUp}
                trend={8.3}
                borderColor="border-emerald-500/30"
              />
            </div>

            {/* FILA 2: Radar Score + Dictamen (2 columnas) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-[280px]">
                <RadarChartCard />
              </div>
              <div className="h-[280px]">
                <RecommendationCard />
              </div>
            </div>

            {/* FILA 3: Flujo de Caja (Ancho completo) */}
            <div className="h-[280px]">
              <CashFlowChart />
            </div>

            {/* FILA 4: Escenarios + Sensibilidad (2 columnas) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="h-[280px]">
                <ScenarioChart />
              </div>
              <div className="h-[280px]">
                <SensitivitySlider />
              </div>
            </div>

          </div>
        </main>

        <BottomNavigation />

        {/* Parámetros Modal */}
        <ProjectParametersModal
          isOpen={isParamsModalOpen}
          onClose={() => setIsParamsModalOpen(false)}
        />

      </div>
    </>
  );
}

export default DashboardPage;
