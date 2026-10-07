import React from 'react';
import { 
  Activity, 
  Edit3, 
  Trash2, 
  Upload, 
  Sliders, 
  Minimize2, 
  Maximize2, 
  RotateCcw, 
  Check, 
  Anchor, 
  Lock, 
  Unlock, 
  Plus, 
  Link2, 
  Pencil, 
  X, 
  Loader2 
} from 'lucide-react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar } from 'recharts';
import { cn } from '@/lib/utils';

const formatNumber = (value, decimals = 2) => {
  if (!isFinite(value)) return '-';
  return Number(value).toLocaleString('es-MX', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
};

export default function TabMetricas({
  selectedRow,
  worstLavado,
  manualLinesUsed,
  setManualLinesUsed,
  scenarioResults,
  CUSTOMER_SCENARIOS,
  setCustomerScenarios,
  computedRows,
  selectedMixIds,
  setViabilityInfoModal,
  totalLavadoReq,
  totalSecadoReq,
  installedPowerKw,
  heatingKw,
  pumpsKw,
  blowersKw,
  beltKw,
  washFlowLh,
  setWashFlowLh,
  waterReplenishLh,
  setWaterReplenishLh,
  tankCapacityL,
  setTankCapacityL,
  waterChangeDays,
  setWaterChangeDays,
  activeCapacityPerHour,
  isEditingPower,
  setIsEditingPower,
  powerDraft,
  setPowerDraft,
  isEditingWashFlow,
  setIsEditingWashFlow,
  washFlowDraft,
  setWashFlowDraft,
  isEditingReplenish,
  setIsEditingReplenish,
  replenishDraft,
  setReplenishDraft,
  isEditingTank,
  setIsEditingTank,
  tankDraft,
  setTankDraft,
  isEditingChangeDays,
  setIsEditingChangeDays,
  changeDaysDraft,
  setChangeDaysDraft,
  inputs,
  physicalMaxMH,
  totalHrsLavado,
  totalHrsSecado,
  setInfoModal,
  simulatorId
}) {
  if (!selectedRow) {
    return (
      <div className="rounded-2xl bg-white border border-slate-200 p-8 text-center text-slate-500 font-bold uppercase tracking-wider">
        Por favor selecciona un modelo de caja en la lista principal para ver sus métricas detalladas y escenarios.
      </div>
    );
  }

  const totalPowerKw = installedPowerKw;
  const activeLoadFactor = 0.85;
  const avgHourlyKwh = totalPowerKw * activeLoadFactor;
  const avgHourlyCostMxn = avgHourlyKwh * 2.50;
  
  const availableTime = scenarioResults.lavadoSecado?.[0]?.availableDailyTime ?? 16;
  const dailyHours = totalHrsLavado > 0 ? Math.min(availableTime, totalHrsLavado) : availableTime;
  const dailyKwh = avgHourlyKwh * dailyHours;
  const dailyCostMxn = dailyKwh * 2.50;
  const annualCostMxn = dailyCostMxn * (inputs.daysPerMonth || 26) * 12;
  
  const boxKwh = activeCapacityPerHour > 0 ? avgHourlyKwh / activeCapacityPerHour : 0;
  const boxCost = boxKwh * 2.50;

  const y1Sc = CUSTOMER_SCENARIOS.lavadoSecado.scenarios[0];
  const y1Hours = y1Sc ? (y1Sc.effectiveHoursPerShift * y1Sc.shifts) : 10;
  
  // Consumo diario (m³/día) = (waterReplenishLh * horas) / 1000
  const dailyWaterM3 = (waterReplenishLh * y1Hours) / 1000;
  
  // Consumo semanal (m³/semana) = dailyWaterM3 * 6 días
  const weeklyWaterM3 = dailyWaterM3 * 6;
  
  // Recirculación (%) = ((Caudal - Reposición) / Caudal) * 100
  const recircPct = washFlowLh > 0 ? ((washFlowLh - waterReplenishLh) / washFlowLh) * 100 : 0;
  
  // Consumo unitario por caja (L/caja)
  const unitWaterL = activeCapacityPerHour > 0 ? (waterReplenishLh / activeCapacityPerHour) : 0;

  return (
    <div className="space-y-6">
      
      {/* Client Scenario Header & Badges */}
      <div className="rounded-2xl bg-white border border-slate-200 p-5 shadow-sm text-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-150 pb-4 mb-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-yellow-805">
              Escenarios del Cliente — Modelo: {selectedRow.name}
            </h3>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-0.5">Plan de capacidad y crecimiento de producción Y1 a Y5</p>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-xl border border-slate-200">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest flex items-center gap-2">
                Líneas Req. — Lavado y Secado
                <span className={cn(
                  "text-[8px] px-1.5 py-0.5 rounded font-black tracking-normal uppercase", 
                  manualLinesUsed !== null ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-blue-100 text-blue-800 border border-blue-300'
                )}>
                  {manualLinesUsed !== null ? 'Fijo / Manual' : 'Cálculo Auto'}
                </span>
              </div>
              
              <div className="flex items-center gap-1">
                {manualLinesUsed !== null ? (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManualLinesUsed(prev => Math.max(1, prev - 1)); }}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-black flex items-center justify-center transition-all text-xs"
                      title="Disminuir líneas"
                    >
                      -
                    </button>
                    <span className="w-6 text-center font-mono font-black text-amber-600 text-sm">
                      {manualLinesUsed}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManualLinesUsed(prev => prev + 1); }}
                      className="w-7 h-7 rounded-lg bg-white border border-slate-200 hover:bg-slate-50 active:scale-95 text-slate-700 font-black flex items-center justify-center transition-all text-xs"
                      title="Aumentar líneas"
                    >
                      +
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManualLinesUsed(null); }}
                      className="text-[9px] px-2 py-1.5 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 text-red-650 uppercase tracking-widest font-black transition-all ml-1"
                      title="Restablecer a cálculo automático"
                    >
                      Auto
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setManualLinesUsed(worstLavado || 1); }}
                    className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-[10px] font-black uppercase tracking-wider transition-all"
                    title="Establecer líneas manualmente"
                  >
                    Fijar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cajas/Día Summary Cards */}
        {['lavadoSecado'].map(key => {
          const sc = CUSTOMER_SCENARIOS[key];
          const bestRow  = scenarioResults[key][0];
          const worstRow = scenarioResults[key][scenarioResults[key].length - 1];
          const machineDailyBest  = bestRow  ? bestRow.machineBoxesPerHour * bestRow.availableDailyTime  : 0;
          const machineDailyWorst = worstRow ? worstRow.machineBoxesPerHour * worstRow.availableDailyTime : 0;

          const isAuto = sc?.mode === 'auto';
          const sumAllModels = computedRows.reduce((s, r) => s + (r.requiredDaily || 0), 0);
          const mixSelected = computedRows.filter(r => selectedMixIds.includes(r.id));
          const mixTotalReq = mixSelected.reduce((s, r) => s + (r.requiredDaily || 0), 0);
          const effectiveReq = mixSelected.length > 0 && mixTotalReq > 0 
            ? mixTotalReq 
            : (isAuto ? sumAllModels : sc.dailyRate);

          const pct = machineDailyBest > 0 ? Math.min(100, (machineDailyBest / effectiveReq) * 100) : 0;
          
          return (
            <div key={`summary-${key}`} className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-500 uppercase tracking-widest">{sc.name} — Resumen Diario</span>
                
                {/* Segment controller */}
                <div className="flex bg-slate-100 border border-slate-200 p-0.5 rounded-lg gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomerScenarios(prev => ({
                        ...prev,
                        [key]: { ...prev[key], mode: 'manual' }
                      }));
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[9px] font-black uppercase rounded transition-all",
                      sc.mode !== 'auto'
                        ? 'bg-yellow-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    Manual
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCustomerScenarios(prev => ({
                        ...prev,
                        [key]: { ...prev[key], mode: 'auto' }
                      }));
                    }}
                    className={cn(
                      "px-2.5 py-1 text-[9px] font-black uppercase rounded transition-all",
                      sc.mode === 'auto'
                        ? 'bg-yellow-500 text-white shadow-sm'
                        : 'text-slate-500 hover:text-slate-800'
                    )}
                  >
                    Tabla (Auto)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Req. Diario */}
                <div
                  onClick={() => setViabilityInfoModal({
                    title: `Req. Diario — ${sc.name}`,
                    formula: sc.mode === 'auto'
                      ? 'Suma de los Req. Diario de TODOS los modelos con requerimiento en la tabla.'
                      : 'Volumen de producción diario ingresado de forma manual directamente en esta tarjeta.',
                    steps: sc.mode === 'auto'
                      ? [
                          `Modelos con req: ${computedRows.filter(r=>r.requiredDaily>0).map(r=>`${r.label} - ${r.name} (${(r.requiredDaily||0).toLocaleString('es-MX')} cajas)`).join(', ')}`,
                          `Total Suma = ${computedRows.filter(r=>r.requiredDaily>0).map(r=>r.requiredDaily||0).join(' + ')} = ${effectiveReq.toLocaleString('es-MX')} cajas/día`,
                          `Req/h (Y1) = ${effectiveReq} ÷ ${bestRow?.availableDailyTime?.toFixed(2)} h = ${bestRow ? (effectiveReq / bestRow.availableDailyTime).toFixed(1) : '-'} c/h`
                        ]
                      : [
                          `Dato manual ingresado: ${sc.dailyRate?.toLocaleString('es-MX')} cajas/día`,
                          `Req/h (Y1) = ${sc.dailyRate} ÷ ${bestRow?.availableDailyTime?.toFixed(2)} h = ${bestRow ? (sc.dailyRate / bestRow.availableDailyTime).toFixed(1) : '-'} c/h`
                        ]
                  })}
                  className={cn(
                    "p-4 rounded-xl border text-center cursor-pointer transition-all",
                    sc.mode === 'auto'
                      ? 'bg-yellow-50/50 border-yellow-300 hover:bg-yellow-50/80'
                      : 'bg-slate-50 border-slate-200 hover:border-yellow-500/40 hover:bg-yellow-50/10'
                  )}
                >
                  <div className="text-[9px] text-yellow-800 uppercase font-bold tracking-wider mb-1">Req. Diario</div>
                  {sc.mode === 'auto' ? (
                    <div>
                      <div className="text-2xl font-black text-slate-800">{effectiveReq.toLocaleString('es-MX')}</div>
                      <div className="text-[8px] text-slate-400 font-black uppercase tracking-wider">[Tabla]</div>
                    </div>
                  ) : (
                    <div className="space-y-1 flex flex-col items-center">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={sc.dailyRate ?? 0}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value.replace(/\D/g, '')) || 0);
                          setCustomerScenarios(prev => ({
                            ...prev,
                            [key]: {
                              ...prev[key],
                              dailyRate: val
                            }
                          }));
                        }}
                        className="w-24 bg-white border border-slate-200 text-center text-slate-800 font-black text-lg rounded px-2 py-1 focus:border-yellow-500 focus:outline-none transition-colors"
                      />
                      <div className="text-[8px] text-slate-400 font-black uppercase tracking-wider">[Manual]</div>
                    </div>
                  )}
                  <div className="text-[9px] text-slate-500 font-bold mt-1">cajas/día</div>
                </div>

                {/* Cap. Máx Y1 */}
                <div
                  onClick={() => setViabilityInfoModal({
                    title: `Cap. Máx (Y1) — ${sc.name}`,
                    formula: 'Capacidad máxima diaria de la máquina en el año 1 (mejor escenario de tiempo disponible). Cap./h × Tiempo disponible Y1.',
                    steps: [
                      `Modelo activo: ${selectedRow?.name}`,
                      `Cap. real/h máquina: ${bestRow?.machineBoxesPerHour?.toFixed(1)} cajas/h`,
                      `Horas efectivas Y1: ${bestRow?.effectiveHoursPerShift?.toFixed(2)} h/turno × ${bestRow?.shifts} turnos = ${bestRow?.availableDailyTime?.toFixed(2)} h/día`,
                      `Cap. Máx/día = ${bestRow?.machineBoxesPerHour?.toFixed(1)} × ${bestRow?.availableDailyTime?.toFixed(2)} = ${Math.round(machineDailyBest).toLocaleString('es-MX')} cajas/día`
                    ]
                  })}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center cursor-pointer hover:border-yellow-500/40 hover:bg-yellow-50/10 transition-all"
                >
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Cap. Máx (Y1)</div>
                  <div className="text-2xl font-black text-slate-800">{Math.round(machineDailyBest).toLocaleString('es-MX')}</div>
                  <div className="text-[9px] text-slate-400 font-bold mt-1">cajas/día</div>
                </div>

                {/* Cap. Mín Y5 */}
                <div
                  onClick={() => setViabilityInfoModal({
                    title: `Cap. Mín (Y5) — ${sc.name}`,
                    formula: 'Capacidad mínima diaria de la máquina en el año 5 (peor escenario de tiempo disponible). Cap./h × Tiempo disponible Y5.',
                    steps: [
                      `Modelo activo: ${selectedRow?.name}`,
                      `Cap. real/h máquina: ${worstRow?.machineBoxesPerHour?.toFixed(1)} cajas/h`,
                      `Horas efectivas Y5: ${worstRow?.effectiveHoursPerShift?.toFixed(2)} h/turno × ${worstRow?.shifts} turnos = ${worstRow?.availableDailyTime?.toFixed(2)} h/día`,
                      `Cap. Mín/día = ${worstRow?.machineBoxesPerHour?.toFixed(1)} × ${worstRow?.availableDailyTime?.toFixed(2)} = ${Math.round(machineDailyWorst).toLocaleString('es-MX')} cajas/día`
                    ]
                  })}
                  className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center cursor-pointer hover:border-yellow-500/40 hover:bg-yellow-50/10 transition-all"
                >
                  <div className="text-[9px] text-slate-500 font-bold uppercase tracking-wider mb-1">Cap. Mín (Y5)</div>
                  <div className="text-2xl font-black text-slate-800">{Math.round(machineDailyWorst).toLocaleString('es-MX')}</div>
                  <div className="text-[9px] text-slate-400 font-bold mt-1">cajas/día</div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="space-y-1.5 pt-2 border-t border-slate-100">
                <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                  <span>Cobertura con 1 línea — mejor caso (Y1)</span>
                  <span className="font-bold text-slate-800">{pct.toFixed(1)}%</span>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
                  <div
                    className="h-full rounded-full transition-all duration-700 animate-pulse"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg, #3b82f6, #eab308)'
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Impacto Energético y Costos */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden p-5 shadow-sm text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
              ⚡ Impacto Energético e Indicadores de Consumo
            </h3>
          </div>
          <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-800 px-2.5 py-1 rounded-md font-black uppercase tracking-widest">Línea Wash & Dry</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Potencia Instalada</div>
            {isEditingPower ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                const val = parseFloat(powerDraft);
                if (!isNaN(val) && val > 0) {
                  setInstalledPowerKw(val);
                  localStorage.setItem(`sim_${simulatorId}_installed_power`, val.toString());
                }
                setIsEditingPower(false);
              }} className="mt-1 flex items-center gap-1.5">
                <input
                  type="number"
                  step="0.1"
                  autoFocus
                  value={powerDraft}
                  onChange={(e) => setPowerDraft(e.target.value)}
                  onBlur={() => {
                    const val = parseFloat(powerDraft);
                    if (!isNaN(val) && val > 0) {
                      setInstalledPowerKw(val);
                      localStorage.setItem(`sim_${simulatorId}_installed_power`, val.toString());
                    }
                    setIsEditingPower(false);
                  }}
                  className="w-20 px-2 py-1 bg-white border border-amber-500 rounded-lg text-slate-800 font-black text-lg outline-none"
                />
                <span className="text-xs text-slate-500 font-medium">kW</span>
              </form>
            ) : (
              <div 
                onClick={() => {
                  setPowerDraft(totalPowerKw.toString());
                  setIsEditingPower(true);
                }}
                className="text-2xl font-black text-slate-800 mt-1 cursor-pointer hover:text-amber-600 transition-colors flex items-baseline gap-1 group/btn"
                title="Haz clic para editar manualmente la potencia instalada"
              >
                {formatNumber(totalPowerKw, 1)} <span className="text-xs text-slate-400 font-medium">kW</span>
                <Edit3 className="w-3.5 h-3.5 opacity-40 group-hover/btn:opacity-100 text-amber-500 transition-opacity ml-1.5" />
              </div>
            )}
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Haz clic para editar</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Consumo Promedio</div>
            <div className="text-2xl font-black text-amber-600 mt-1">{formatNumber(avgHourlyKwh, 1)} <span className="text-xs text-slate-500 font-medium">kWh</span></div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">A 85% de factor de carga</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Costo Operativo/h</div>
            <div className="text-2xl font-black text-emerald-600 mt-1">${formatNumber(avgHourlyCostMxn, 1)} <span className="text-xs text-slate-500 font-medium">MXN</span></div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Ref Tarifa: $2.50 / kWh</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Costo Energético Anual</div>
            <div className="text-2xl font-black text-red-600 mt-1">
              ${Number(annualCostMxn).toLocaleString('es-MX', { maximumFractionDigits: 0 })} <span className="text-xs text-slate-500 font-medium">MXN</span>
            </div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">312 días de operación Y1</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-black text-slate-800 mb-2 uppercase tracking-widest">◈ Desglose Técnico de Potencia</div>
            <div className="space-y-2 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold uppercase text-[10px]">🔥 Calentamiento de Agua:</span>
                <span className="font-bold text-slate-800">{formatNumber(heatingKw, 1)} kW <span className="text-slate-400 font-normal">(40.2%)</span></span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold uppercase text-[10px]">💧 Bombas de Lavado:</span>
                <span className="font-bold text-slate-800">{formatNumber(pumpsKw, 1)} kW <span className="text-slate-400 font-normal">(33.5%)</span></span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold uppercase text-[10px]">🌀 Secado (Turbinas Sopladoras):</span>
                <span className="font-bold text-slate-800">{formatNumber(blowersKw, 1)} kW <span className="text-slate-400 font-normal">(24.6%)</span></span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500 font-bold uppercase text-[10px]">⚙ Motor Banda Transportadora:</span>
                <span className="font-bold text-slate-800">{formatNumber(beltKw, 1)} kW <span className="text-slate-400 font-normal">(1.7%)</span></span>
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="text-xs font-black text-slate-800 mb-2 uppercase tracking-widest">◈ Huella Energética por Caja</div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Con una capacidad real de <span className="text-blue-600 font-black">{activeCapacityPerHour > 0 ? formatNumber(activeCapacityPerHour, 0) : '-'} cajas/hora</span> y un consumo promedio de <span className="text-slate-800 font-black">{formatNumber(avgHourlyKwh, 1)} kWh</span>, cada caja lavada y secada tiene un consumo eléctrico neto estimado de <span className="text-amber-600 font-black">{boxKwh > 0 ? formatNumber(boxKwh, 2) : '-'} kWh/caja</span>.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Costo energético neto unitario:</span>
              <span className="font-black text-emerald-600">
                ${boxCost > 0 ? formatNumber(boxCost, 2) : '-'} MXN / caja
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Balance Hídrico y Sustentabilidad */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden p-5 shadow-sm text-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              💧 Balance Hídrico e Indicadores de Consumo de Agua
            </h3>
          </div>
          <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-800 px-2.5 py-1 rounded-md font-black uppercase tracking-widest">Sustentabilidad</span>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Caudal Lavado Interno</div>
            {isEditingWashFlow ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                const val = parseFloat(washFlowDraft);
                if (!isNaN(val) && val > 0) {
                  setWashFlowLh(val);
                  localStorage.setItem(`sim_${simulatorId}_wash_flow_lh`, val.toString());
                }
                setIsEditingWashFlow(false);
              }} className="mt-1 flex items-center gap-1.5">
                <input
                  type="number"
                  step="1"
                  autoFocus
                  value={washFlowDraft}
                  onChange={(e) => setWashFlowDraft(e.target.value)}
                  onBlur={() => {
                    const val = parseFloat(washFlowDraft);
                    if (!isNaN(val) && val > 0) {
                      setWashFlowLh(val);
                      localStorage.setItem(`sim_${simulatorId}_wash_flow_lh`, val.toString());
                    }
                    setIsEditingWashFlow(false);
                  }}
                  className="w-20 px-2 py-1 bg-white border border-blue-500 rounded-lg text-slate-800 font-black text-lg outline-none"
                />
                <span className="text-xs text-slate-500 font-medium">L/h</span>
              </form>
            ) : (
              <div 
                onClick={() => {
                  setWashFlowDraft(washFlowLh.toString());
                  setIsEditingWashFlow(true);
                }}
                className="text-2xl font-black text-slate-800 mt-1 cursor-pointer hover:text-blue-600 transition-colors flex items-baseline gap-1 group/btn"
                title="Haz clic para editar manualmente el caudal de lavado"
              >
                {formatNumber(washFlowLh, 0)} <span className="text-xs text-slate-400 font-medium">L/h</span>
                <Edit3 className="w-3.5 h-3.5 opacity-40 group-hover/btn:opacity-100 text-blue-500 transition-opacity ml-1.5" />
              </div>
            )}
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Haz clic para editar</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Reposición Real de Agua</div>
            {isEditingReplenish ? (
              <form onSubmit={(e) => {
                e.preventDefault();
                const val = parseFloat(replenishDraft);
                if (!isNaN(val) && val > 0) {
                  setWaterReplenishLh(val);
                  localStorage.setItem(`sim_${simulatorId}_water_replenish_lh`, val.toString());
                }
                setIsEditingReplenish(false);
              }} className="mt-1 flex items-center gap-1.5">
                <input
                  type="number"
                  step="1"
                  autoFocus
                  value={replenishDraft}
                  onChange={(e) => setReplenishDraft(e.target.value)}
                  onBlur={() => {
                    const val = parseFloat(replenishDraft);
                    if (!isNaN(val) && val > 0) {
                      setWaterReplenishLh(val);
                      localStorage.setItem(`sim_${simulatorId}_water_replenish_lh`, val.toString());
                    }
                    setIsEditingReplenish(false);
                  }}
                  className="w-20 px-2 py-1 bg-white border border-blue-500 rounded-lg text-slate-800 font-black text-lg outline-none"
                />
                <span className="text-xs text-slate-500 font-medium">L/h</span>
              </form>
            ) : (
              <div 
                onClick={() => {
                  setReplenishDraft(waterReplenishLh.toString());
                  setIsEditingReplenish(true);
                }}
                className="text-2xl font-black text-blue-600 mt-1 cursor-pointer hover:text-blue-500 transition-colors flex items-baseline gap-1 group/btn"
                title="Haz clic para editar manualmente la reposición de agua"
              >
                {formatNumber(waterReplenishLh, 0)} <span className="text-xs text-slate-400 font-medium">L/h</span>
                <Edit3 className="w-3.5 h-3.5 opacity-40 group-hover/btn:opacity-100 text-blue-500 transition-opacity ml-1.5" />
              </div>
            )}
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Haz clic para editar</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Consumo Nominal Diario</div>
            <div className="text-2xl font-black text-slate-800 mt-1">
              {formatNumber(dailyWaterM3, 2)} <span className="text-xs text-slate-500 font-medium">m³/día</span>
            </div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1 font-mono">Para {y1Hours} hrs de operación Y1</div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Consumo Nominal Semanal</div>
            <div className="text-2xl font-black text-cyan-650 mt-1">
              {formatNumber(weeklyWaterM3, 1)} <span className="text-xs text-slate-500 font-medium">m³/sem</span>
            </div>
            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1">Basado en 6 días/semana</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-black text-slate-800 mb-3 uppercase tracking-widest">◈ Configuración de Recirculación y Filtros</div>
            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold uppercase text-[10px]">♻ Tasa de Recirculación:</span>
                <span className="font-black text-cyan-600">{formatNumber(recircPct, 1)}% <span className="text-slate-400 font-normal">(Ahorro de agua limpia)</span></span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
                <span className="text-slate-500 font-bold uppercase text-[10px]">📦 Capacidad del Tanque:</span>
                {isEditingTank ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    const val = parseFloat(tankDraft);
                    if (!isNaN(val) && val > 0) {
                      setTankCapacityL(val);
                      localStorage.setItem(`sim_${simulatorId}_tank_capacity_l`, val.toString());
                    }
                    setIsEditingTank(false);
                  }} className="flex items-center gap-1.5">
                    <input
                      type="number"
                      autoFocus
                      value={tankDraft}
                      onChange={(e) => setTankDraft(e.target.value)}
                      onBlur={() => {
                        const val = parseFloat(tankDraft);
                        if (!isNaN(val) && val > 0) {
                          setTankCapacityL(val);
                          localStorage.setItem(`sim_${simulatorId}_tank_capacity_l`, val.toString());
                        }
                        setIsEditingTank(false);
                      }}
                      className="w-16 px-1.5 py-0.5 bg-white border border-blue-500 rounded text-slate-800 font-black text-xs outline-none"
                    />
                  </form>
                ) : (
                  <span 
                    onClick={() => {
                      setTankDraft(tankCapacityL.toString());
                      setIsEditingTank(true);
                    }}
                    className="font-bold text-slate-850 cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-1"
                    title="Haz clic para editar"
                  >
                    {formatNumber(tankCapacityL, 0)} L
                    <Edit3 className="w-3 h-3 opacity-40 text-blue-500" />
                  </span>
                )}
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-500 font-bold uppercase text-[10px]">📅 Cambio de Agua Recomendado:</span>
                {isEditingChangeDays ? (
                  <form onSubmit={(e) => {
                    e.preventDefault();
                    if (changeDaysDraft.trim()) {
                      setWaterChangeDays(changeDaysDraft.trim());
                      localStorage.setItem(`sim_${simulatorId}_water_change_days`, changeDaysDraft.trim());
                    }
                    setIsEditingChangeDays(false);
                  }} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      autoFocus
                      value={changeDaysDraft}
                      onChange={(e) => setChangeDaysDraft(e.target.value)}
                      onBlur={() => {
                        if (changeDaysDraft.trim()) {
                          setWaterChangeDays(changeDaysDraft.trim());
                          localStorage.setItem(`sim_${simulatorId}_water_change_days`, changeDaysDraft.trim());
                        }
                        setIsEditingChangeDays(false);
                      }}
                      className="w-16 px-1.5 py-0.5 bg-white border border-blue-500 rounded text-slate-850 font-black text-xs outline-none"
                    />
                  </form>
                ) : (
                  <span 
                    onClick={() => {
                      setChangeDaysDraft(waterChangeDays);
                      setIsEditingChangeDays(true);
                    }}
                    className="font-bold text-slate-800 cursor-pointer hover:text-blue-600 transition-colors flex items-center gap-1"
                    title="Haz clic para editar"
                  >
                    Cada {waterChangeDays} días
                    <Edit3 className="w-3 h-3 opacity-40 text-blue-500" />
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
            <div>
              <div className="text-xs font-black text-slate-800 mb-2 uppercase tracking-widest">◈ Huella Hídrica por Caja Lavada</div>
              <p className="text-xs text-slate-600 leading-relaxed font-medium">
                Con una capacidad real de <span className="text-blue-600 font-black">{activeCapacityPerHour > 0 ? formatNumber(activeCapacityPerHour, 0) : '-'} cajas/hora</span> y un consumo de reposición de <span className="text-slate-800 font-black">{formatNumber(waterReplenishLh, 0)} litros/hora</span>, cada caja lavada y secada tiene un consumo neto de agua potable estimado de solo <span className="text-blue-650 font-black">{unitWaterL > 0 ? formatNumber(unitWaterL, 2) : '-'} litros/caja</span>.
              </p>
            </div>
            <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold uppercase tracking-wider text-[10px]">Eficiencia hídrica unitaria:</span>
              <span className="font-black text-blue-600">
                {unitWaterL > 0 ? formatNumber(unitWaterL, 2) : '-'} Litros / caja
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Panel */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm text-slate-800">
        <div className="px-5 py-3 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-805 uppercase tracking-wider">
            ◈ Gráfica de Eficiencia — Req/h vs Capacidad Máquina
          </h3>
          <span className="text-[10px] text-slate-500 font-bold uppercase">Modelo activo: {selectedRow?.name}</span>
        </div>
        
        {['lavadoSecado'].map(key => {
          const sc = CUSTOMER_SCENARIOS[key];
          const chartData = scenarioResults[key].map(r => ({
            year: r.year,
            'Req/h':        +r.requiredPerHour.toFixed(1),
            'Cap. Máquina': +r.machineBoxesPerHour.toFixed(1),
          }));
          return (
            <div key={`chart-${key}`} className="p-5">
              <div className="text-[10px] font-black uppercase tracking-widest mb-4 text-slate-500">
                ◈ <span className="text-yellow-800">{sc.name}</span>
              </div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="year" tick={{ fill: '#475569', fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', fontSize: '12px', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: 'rgba(234,179,8,0.05)' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: '#475569', fontWeight: 605 }} />
                  <Bar dataKey="Req/h" name="Req. / hora" fill="#eab308" fillOpacity={0.9} radius={[4,4,0,0]} maxBarSize={36} />
                  <Bar dataKey="Cap. Máquina" name="Cap. Máquina" fill="#3b82f6" fillOpacity={0.8} radius={[4,4,0,0]} maxBarSize={36} />
                </BarChart>
              </ResponsiveContainer>
              <p className="text-[9px] text-slate-400 font-bold uppercase mt-1 text-center">
                <span className="text-yellow-600">■ Amarillo</span> = Req. / hora &nbsp;·&nbsp;
                <span className="text-blue-600">■ Azul</span> = Cap. Máquina
              </p>
            </div>
          );
        })}
      </div>

      {/* Y1-Y5 Detail Table */}
      {[{ key: 'lavadoSecado', label: '⬡ Lavado y Secado', accent: 'border-slate-200', th: 'text-slate-600' }].map(({ key, label, accent, th }) => (
        <div key={key} className={cn("rounded-2xl bg-white border overflow-hidden shadow-sm", accent)}>
          <div className="px-5 py-4 border-b border-slate-150 bg-slate-50/50 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-805 uppercase tracking-wider">{label}</h3>
            <span className="text-[10px] text-slate-500 font-bold uppercase">Rate diario: <strong className="text-slate-800">{(key === 'lavadoSecado' ? totalLavadoReq : totalSecadoReq).toLocaleString('es-MX')}</strong> piezas/día</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  {[
                    { label: 'Año',               key: 'sc_year'      },
                    { label: 'Hrs Base',           key: 'sc_hrsBase'   },
                    { label: 'Hrs Ef./Turno',      key: 'sc_hrsEf'     },
                    { label: 'Turnos',             key: 'sc_turnos'    },
                    { label: 'T. Disp. (h)',       key: 'sc_tDisp'     },
                    { label: 'Rate/Día',           key: 'sc_rateDia'   },
                    { label: 'Req./h',             key: 'sc_reqH'      },
                    { label: 'Máq. c/h',           key: 'sc_maqH'      },
                    { label: 'Déficit/Superávit',   key: 'sc_deficit'   },
                    { label: 'Cobertura %',        key: 'sc_cobertura' },
                    { label: 'Líneas Req.',        key: 'sc_lineas'    },
                  ].map(({ label, key }) => (
                    <th
                      key={key}
                      onClick={() => setInfoModal(key)}
                      className={cn("px-4 py-3 font-semibold uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition-colors select-none", th)}
                      title="Click para ver definición"
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {scenarioResults[key].map(row => (
                  <tr key={row.year} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 font-black text-slate-850">{row.year}</td>
                    <td className="px-4 py-3 text-slate-500">{row.hrsBase}</td>
                    <td className="px-4 py-3 text-slate-550">{formatNumber(row.effectiveHoursPerShift, 2)}</td>
                    <td className="px-4 py-3 text-slate-500">{row.shifts}</td>
                    <td className="px-4 py-3 text-slate-600">{formatNumber(row.availableDailyTime, 2)}</td>
                    <td className="px-4 py-3 text-slate-650">{row.dailyRate.toLocaleString('es-MX')}</td>
                    <td className="px-4 py-3 font-bold text-yellow-800">{formatNumber(row.requiredPerHour, 1)}</td>
                    <td className="px-4 py-3 font-bold text-blue-600">{formatNumber(row.machineBoxesPerHour, 1)}</td>
                    <td className={cn("px-4 py-3 font-bold", row.deficitOrSurplus >= 0 ? 'text-green-600' : 'text-red-500')}>
                      {row.deficitOrSurplus >= 0 ? '+' : ''}{formatNumber(row.deficitOrSurplus, 1)}
                    </td>
                    <td className={cn("px-4 py-3 font-bold", row.coverageRatio >= 1 ? 'text-green-600' : 'text-red-500')}>
                      {formatNumber(row.coverageRatio * 100, 1)}%
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "px-2.5 py-0.5 rounded-full text-xs font-black", 
                        row.requiredLines <= 1 ? 'bg-green-50 text-green-700 border border-green-200' : row.requiredLines === 2 ? 'bg-yellow-50 text-yellow-750 border border-yellow-250' : 'bg-red-50 text-red-650 border border-red-200'
                      )}>
                        {row.requiredLines} maq.
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}
