import React from 'react';
import {
    Zap,
    DollarSign,
    TrendingUp,
    Activity,
    AlertTriangle,
    Gauge,
    Wallet,
} from 'lucide-react';

function MetricsPanel({ metrics, nodes, onOpenSettings }) {
    const hasNodes = nodes && nodes.length > 0;

    return (
        <div className="p-4 space-y-4">
            <div className="mb-4">
                <h2 className="text-sm font-bold text-white mb-1">Métricas en Vivo</h2>
                <p className="text-xs text-gray-400">Simulación en tiempo real</p>
            </div>

            {!hasNodes ? (
                <div className="p-4 rounded-xl bg-glass-light border border-glass-border text-center">
                    <Activity className="w-8 h-8 text-gray-500 mx-auto mb-2" />
                    <p className="text-xs text-gray-400">
                        Agrega equipos al canvas para ver métricas
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {/* Capacidad Total */}
                    <div
                        onClick={onOpenSettings}
                        className="p-3 rounded-xl backdrop-blur-xl bg-glass-light border border-neon-cyan/30 shadow-float cursor-pointer hover:bg-white/5 transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20 group-hover:scale-110 transition-transform">
                                <Gauge className="w-3 h-3" />
                            </div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide group-hover:text-neon-cyan transition-colors">
                                Capacidad Total
                            </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-white group-hover:text-neon-cyan transition-colors">
                                {metrics.bottleneck || 0}
                            </span>
                            <span className="text-xs text-gray-400">kg/h</span>
                        </div>
                        {metrics.bottleneckNode && (
                            <p className="text-[9px] text-neon-cyan mt-1">
                                Cuello de botella: {metrics.bottleneckNode}
                            </p>
                        )}
                    </div>

                    {/* Consumo Energético */}
                    <div
                        onClick={onOpenSettings}
                        className="p-3 rounded-xl backdrop-blur-xl bg-glass-light border border-yellow-500/30 shadow-float cursor-pointer hover:bg-white/5 transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 group-hover:scale-110 transition-transform">
                                <Zap className="w-3 h-3" />
                            </div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide group-hover:text-yellow-400 transition-colors">
                                Consumo Total
                            </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-white group-hover:text-yellow-400 transition-colors">
                                {metrics.totalPower || 0}
                            </span>
                            <span className="text-xs text-gray-400">kW</span>
                        </div>
                    </div>

                    {/* Costo Operativo */}
                    <div
                        onClick={onOpenSettings}
                        className="p-3 rounded-xl backdrop-blur-xl bg-glass-light border border-neon-purple/30 shadow-float cursor-pointer hover:bg-white/5 transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-neon-purple/10 text-neon-purple border border-neon-purple/20 group-hover:scale-110 transition-transform">
                                <DollarSign className="w-3 h-3" />
                            </div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide group-hover:text-neon-purple transition-colors">
                                Costo Operativo
                            </span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Por hora:</span>
                                <span className="text-white font-semibold">
                                    ${metrics.costPerHour?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Por día:</span>
                                <span className="text-white font-semibold">
                                    ${metrics.costPerDay?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Por mes:</span>
                                <span className="text-white font-semibold">
                                    ${metrics.costPerMonth?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Producción Estimada */}
                    <div
                        onClick={onOpenSettings}
                        className="p-3 rounded-xl backdrop-blur-xl bg-glass-light border border-emerald-500/30 shadow-float cursor-pointer hover:bg-white/5 transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
                                <TrendingUp className="w-3 h-3" />
                            </div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide group-hover:text-emerald-400 transition-colors">
                                Producción Estimada
                            </span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Por turno (8h):</span>
                                <span className="text-white font-semibold">
                                    {metrics.productionPerShift?.toLocaleString() || '0'} kg
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Por día (24h):</span>
                                <span className="text-white font-semibold">
                                    {metrics.productionPerDay?.toLocaleString() || '0'} kg
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Por mes:</span>
                                <span className="text-white font-semibold">
                                    {metrics.productionPerMonth?.toLocaleString() || '0'} kg
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Utilidades Estimadas */}
                    <div
                        onClick={onOpenSettings}
                        className="p-3 rounded-xl backdrop-blur-xl bg-glass-light border border-lime-500/30 shadow-float cursor-pointer hover:bg-white/5 transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-lime-500/10 text-lime-400 border border-lime-500/20 group-hover:scale-110 transition-transform">
                                <Wallet className="w-3 h-3" />
                            </div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide group-hover:text-lime-400 transition-colors">
                                Utilidades Estimadas
                            </span>
                        </div>
                        <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Por día:</span>
                                <span className="text-white font-semibold">
                                    ${metrics.netProfitPerDay?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                </span>
                            </div>
                            <div className="flex justify-between text-xs">
                                <span className="text-gray-400">Por mes:</span>
                                <span className="text-white font-semibold">
                                    ${metrics.netProfitPerMonth?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* ROI */}
                    <div
                        onClick={onOpenSettings}
                        className="p-3 rounded-xl backdrop-blur-xl bg-glass-light border border-neon-pink/30 shadow-float cursor-pointer hover:bg-white/5 transition-all group"
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div className="p-1.5 rounded-lg bg-neon-pink/10 text-neon-pink border border-neon-pink/20 group-hover:scale-110 transition-transform">
                                <Activity className="w-3 h-3" />
                            </div>
                            <span className="text-[10px] text-gray-400 uppercase tracking-wide group-hover:text-neon-pink transition-colors">
                                ROI Estimado
                            </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold text-white group-hover:text-neon-pink transition-colors">
                                {metrics.roi?.toFixed(1) || '0.0'}
                            </span>
                            <span className="text-xs text-gray-400">%</span>
                        </div>
                    </div>

                    {/* Alertas */}
                    {metrics.bottleneckNode && (
                        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="text-xs font-semibold text-yellow-400 mb-1">
                                        Cuello de Botella Detectado
                                    </p>
                                    <p className="text-[10px] text-gray-300 leading-relaxed">
                                        El equipo <strong>{metrics.bottleneckNode}</strong> está
                                        limitando la capacidad total de la línea.
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Info adicional */}
            <div className="mt-6 p-3 rounded-xl bg-neon-blue/5 border border-neon-blue/20">
                <p className="text-[10px] text-neon-blue leading-relaxed">
                    💡 <strong>Simulación:</strong> Los cálculos se actualizan
                    automáticamente al modificar la configuración de equipos.
                </p>
            </div>
        </div>
    );
}

export default MetricsPanel;
