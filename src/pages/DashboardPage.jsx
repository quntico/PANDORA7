
import React from 'react';
import { Helmet } from 'react-helmet';
import BottomNavigation from '@/components/BottomNavigation';
import KPICard from '@/components/KPICard';
import RecommendationCard from '@/components/RecommendationCard';
import SensitivitySlider from '@/components/SensitivitySlider';
import RadarChartCard from '@/components/RadarChartCard';
import CashFlowChart from '@/components/CashFlowChart';
import ScenarioChart from '@/components/ScenarioChart';
import {
  DollarSign,
  Percent,
  Clock,
  Activity,
  TrendingUp
} from 'lucide-react';

function DashboardPage() {
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
                <p className="text-sm text-gray-400 mt-0.5">Dashboard de Inversión</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-neon-cyan bg-neon-cyan/10 border border-neon-cyan/30 px-3 py-1.5 rounded-full font-medium">
                  ● En vivo
                </span>
              </div>
            </div>

            {/* FILA 1: KPIs Compactos Horizontales (5 columnas) */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              <KPICard
                title="VAN"
                value="$1.24M"
                subtitle="Valor Actual Neto"
                icon={DollarSign}
                trend={12.5}
                borderColor="border-neon-cyan/30"
              />
              <KPICard
                title="TIR"
                value="24.8%"
                subtitle="Tasa Interna Retorno"
                icon={Percent}
                trend={5.2}
                status="high"
                borderColor="border-neon-blue/30"
              />
              <KPICard
                title="Payback"
                value="2.4 años"
                subtitle="Recuperación"
                icon={Clock}
                borderColor="border-neon-purple/30"
              />
              <KPICard
                title="Riesgo"
                value="Medio"
                subtitle="Score: 65/100"
                icon={Activity}
                status="medium"
                borderColor="border-yellow-500/30"
              />
              <KPICard
                title="Score"
                value="85/100"
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
      </div>
    </>
  );
}

export default DashboardPage;
