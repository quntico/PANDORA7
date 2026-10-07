import React from 'react';
import { 
  Trash2, 
  Upload, 
  CheckCircle2, 
  Plus, 
  Lock, 
  Unlock, 
  Edit3, 
  Power 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const formatNumber = (value, decimals = 2) => {
  if (!isFinite(value)) return '-';
  return Number(value).toLocaleString('es-MX', {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals
  });
};

export default function TabPortada({
  computedRows,
  selectedId,
  setSelectedId,
  toggleInclusion,
  dailyReqs,
  updateBoxRequirement,
  reqLocked,
  setReqLocked,
  saveStatus,
  openEditBoxModal,
  removeBox,
  excluidos,
  selectedMixIds,
  toggleMix,
  distributeGlobalRate,
  setSelectedMixIds,
  totalLavadoReq,
  scenarioResults,
  inputs,
  activeCapacityPerHour,
  setViabilityInfoModal,
  productImageBase64,
  handleRemoveProductImage,
  handleProductImageUpload,
  openNewBoxModal,
  clearBoxes,
  loadOfficialReqs,
  lavadoRows,
  secadoRows
}) {
  return (
    <div className="space-y-6">
      
      {/* Table: Resultados de Simulación */}
      <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm flex flex-col text-slate-800">
        <div className="px-5 py-4 border-b border-slate-150 flex flex-wrap gap-4 justify-between items-center bg-slate-50/50">
          <h3 className="text-sm font-bold text-slate-850 uppercase tracking-wider">Resultados de Simulación</h3>
          <div className="flex flex-wrap gap-2.5 text-xs">
            <button onClick={clearBoxes} className="p-2 bg-red-50 hover:bg-red-105 text-red-600 border border-red-200 rounded-xl transition-all" title="Borrar Todos">
              <Trash2 className="w-4 h-4" />
            </button>
            <button onClick={loadOfficialReqs} className="flex items-center gap-2 px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-800 border border-yellow-200 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest">
              <CheckCircle2 className="w-3.5 h-3.5 text-yellow-600" /> Oficiales
            </button>
            
            {/* Foto de la Caja */}
            <div className="flex items-center gap-2">
              {productImageBase64 ? (
                <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-xl pl-2 pr-3 py-1.5 transition-all">
                  <img 
                    src={productImageBase64} 
                    alt="Caja subida" 
                    className="w-5 h-5 object-cover rounded-md border border-yellow-250 shrink-0" 
                  />
                  <span className="text-[10px] font-black uppercase text-yellow-800 tracking-wider">Foto Lista</span>
                  <button 
                    onClick={handleRemoveProductImage}
                    className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors uppercase ml-1"
                    title="Eliminar foto"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-3 py-2 bg-yellow-50 hover:bg-yellow-100 text-yellow-850 border border-yellow-200 font-bold uppercase tracking-wider rounded-xl cursor-pointer transition-all">
                  <Upload className="w-3.5 h-3.5 text-yellow-600" />
                  <span className="text-[10px] font-black tracking-wider">Subir Foto Caja</span>
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleProductImageUpload} 
                    className="hidden" 
                  />
                </label>
              )}
            </div>

            <button onClick={openNewBoxModal} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold uppercase tracking-wider rounded-xl transition-all shadow-sm">
              <Plus className="w-4 h-4" /> Agregar Caja
            </button>
          </div>
        </div>
        
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-xs" style={{minWidth:'900px'}}>
            <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-3 py-3 font-semibold">Mod</th>
                <th className="px-3 py-3 font-semibold">Máquina</th>
                <th className="px-3 py-3 font-semibold font-bold">Nombre</th>
                <th className="px-3 py-3 font-semibold text-center">L&times;A&times;H (cm)</th>
                <th className="px-3 py-3 font-semibold text-center">Vel (m/h)</th>
                <th className="px-3 py-3 font-semibold text-center" title="Vel. banda ÷ Pitch — capacidad teórica pura">Cap. Real (c/h)</th>
                <th className="px-3 py-3 font-semibold text-yellow-800 text-center">
                  <span className="flex items-center gap-1 justify-center">
                    Req. Diario
                    <button
                      onClick={(e) => { e.stopPropagation(); setReqLocked(!reqLocked); }}
                      title={reqLocked ? 'Bloqueado — click para editar' : 'Click para bloquear'}
                      className={cn("p-0.5 rounded transition-all", reqLocked ? "text-yellow-600" : "text-slate-400 hover:text-yellow-600")}
                    >
                      {reqLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                    </button>
                    {saveStatus === 'saving' && <span className="text-[9px] text-yellow-650 animate-pulse">↻</span>}
                    {saveStatus === 'saved'  && <span className="text-[9px] text-green-600">✓</span>}
                  </span>
                </th>
                <th className="px-3 py-3 font-semibold text-purple-700 text-center">Horas Req.</th>
                <th className="px-3 py-3 font-semibold text-center">Suciedad</th>
                <th className="px-3 py-3 font-semibold text-center">Estado</th>
                <th className="px-3 py-3 font-semibold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {/* Group header: LAVADO Y SECADO */}
              <tr>
                <td colSpan={11} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-cyan-50/50 text-cyan-800 border-b border-cyan-100">
                  ⬡ Lavado y Secado — {lavadoRows.filter(r=>r.included).length} productos — Total req: {lavadoRows.filter(r=>r.included).reduce((s,r)=>s+(r.requiredDaily||0),0).toLocaleString('es-MX')} pzas/día
                </td>
              </tr>
              {lavadoRows.map((r) => (
                <tr key={r.id}
                  className={cn("transition-all hover:bg-slate-50 cursor-pointer", selectedId===r.id ? "bg-blue-50/40" : "", !r.included && "opacity-40 grayscale")}
                  onClick={() => setSelectedId(r.id)}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleInclusion(r.id); }}
                        className={cn("p-1 rounded-md transition-all", r.included ? "text-cyan-600 hover:bg-cyan-50" : "text-slate-400 hover:bg-slate-100")}
                        title={r.included ? "Desactivar de evaluación" : "Activar para evaluación"}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{backgroundColor: r.color||'#3b82f6',color:'#fff'}}>{r.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-800 border border-cyan-100">Lav+Sec</span></td>
                  <td className="px-3 py-3 font-medium text-slate-800 text-sm">{r.name}</td>
                  <td className="px-3 py-3 text-slate-500 text-xs text-center">{r.l}&times;{r.w}&times;{r.h}</td>
                  <td className="px-3 py-3 text-slate-600 text-center text-xs">{formatNumber(r.linearMh,1)}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-bold text-blue-600">{formatNumber(r.realBoxesHr,1)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <input type="number" value={dailyReqs[r.id]??''} placeholder="Req" readOnly={reqLocked}
                      onChange={(e) => updateBoxRequirement(r.id, Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className={cn("w-20 bg-white border rounded-lg px-2 py-1 text-xs outline-none transition-colors text-center font-bold text-slate-800 focus:border-yellow-500", 
                        reqLocked ? 'border-yellow-400/40 text-yellow-600/60 cursor-not-allowed' : 'border-slate-200'
                      )} 
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    {(dailyReqs[r.id]??0)>0
                      ? <span className={cn("text-xs font-bold", r.requiredHours > r.totalHoursDay ? 'text-red-500' : 'text-purple-600')}>{formatNumber(r.requiredHours,2)}h</span>
                      : <span className="text-slate-400 text-xs">-</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-slate-105 text-slate-600 text-[10px] font-bold border border-slate-200 uppercase tracking-tighter">
                      {r.suciedad || 'Polvo'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {(dailyReqs[r.id]??0)>0
                      ? <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", r.requiredHours<=r.totalHoursDay?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-600 border border-red-205')}>
                          {r.requiredHours<=r.totalHoursDay?'✓ OK':'⚠ Excede'}
                        </span>
                      : <span className="text-slate-400 text-xs">-</span>}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={(e)=>{e.stopPropagation();openEditBoxModal(r);}} className="p-1 bg-blue-50 hover:bg-blue-105 text-blue-600 rounded-lg transition-all border border-blue-100"><Edit3 className="w-3 h-3"/></button>
                      <button onClick={(e)=>{e.stopPropagation();removeBox(r.id);}} className="p-1 bg-red-50 hover:bg-red-105 text-red-600 rounded-lg transition-all border border-red-100"><Trash2 className="w-3 h-3"/></button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Group header: SOLO SECADO */}
              <tr>
                <td colSpan={11} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-purple-50/50 text-purple-800 border-b border-purple-100">
                  ⬡ Solo Secado — {secadoRows.filter(r=>r.included).length} productos — Total req: {secadoRows.filter(r=>r.included).reduce((s,r)=>s+(r.requiredDaily||0),0).toLocaleString('es-MX')} pzas/día
                </td>
              </tr>
              {secadoRows.map((r) => (
                <tr key={r.id}
                  className={cn("transition-all hover:bg-slate-50 cursor-pointer", selectedId===r.id ? "bg-purple-50/30" : "", !r.included && "opacity-40 grayscale")}
                  onClick={() => setSelectedId(r.id)}
                >
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleInclusion(r.id); }}
                        className={cn("p-1 rounded-md transition-all", r.included ? "text-purple-600 hover:bg-purple-50" : "text-slate-400 hover:bg-slate-100")}
                        title={r.included ? "Desactivar de evaluación" : "Activar para evaluación"}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0" style={{backgroundColor: r.color||'#8b5cf6',color:'#fff'}}>{r.label}</span>
                    </div>
                  </td>
                  <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-100">Secado</span></td>
                  <td className="px-3 py-3 font-medium text-slate-800 text-sm">{r.name}</td>
                  <td className="px-3 py-3 text-slate-500 text-xs text-center">{r.l}&times;{r.w}&times;{r.h}</td>
                  <td className="px-3 py-3 text-slate-600 text-center text-xs">{formatNumber(r.linearMh,1)}</td>
                  <td className="px-3 py-3 text-center">
                    <span className="font-bold text-purple-600">{formatNumber(r.realBoxesHr,1)}</span>
                  </td>
                  <td className="px-3 py-3">
                    <input type="number" value={dailyReqs[r.id]??''} placeholder="Req" readOnly={reqLocked}
                      onChange={(e) => updateBoxRequirement(r.id, Number(e.target.value))}
                      onClick={(e) => e.stopPropagation()}
                      className={cn("w-20 bg-white border rounded-lg px-2 py-1 text-xs outline-none transition-colors text-center font-bold text-slate-800 focus:border-yellow-500", 
                        reqLocked ? 'border-yellow-400/40 text-yellow-600/60 cursor-not-allowed' : 'border-slate-200'
                      )} 
                    />
                  </td>
                  <td className="px-3 py-3 text-center">
                    {(dailyReqs[r.id]??0)>0
                      ? <span className="text-xs font-bold text-purple-650">{formatNumber(r.requiredHours,2)}h</span>
                      : <span className="text-slate-400 text-xs">-</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="px-2 py-0.5 rounded-md bg-slate-105 text-slate-600 text-[10px] font-bold border border-slate-200 uppercase tracking-tighter">
                      {r.suciedad || 'Polvo'}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {(dailyReqs[r.id]??0)>0
                      ? <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", r.requiredHours<=r.totalHoursDay?'bg-green-50 text-green-700 border border-green-200':'bg-red-50 text-red-655 border border-red-200')}>
                          {r.requiredHours<=r.totalHoursDay?'✓ OK':'⚠ Excede'}
                        </span>
                      : <span className="text-slate-400 text-xs">-</span>}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex gap-1 justify-end">
                      <button onClick={(e)=>{e.stopPropagation();openEditBoxModal(r);}} className="p-1 bg-blue-50 hover:bg-blue-105 text-blue-650 rounded-lg transition-all border border-blue-100"><Edit3 className="w-3 h-3"/></button>
                      <button onClick={(e)=>{e.stopPropagation();removeBox(r.id);}} className="p-1 bg-red-50 hover:bg-red-105 text-red-650 rounded-lg transition-all border border-red-100"><Trash2 className="w-3 h-3"/></button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* EXCLUIDOS */}
              {excluidos.length > 0 && (
                <>
                  <tr><td colSpan={11} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest bg-slate-100 text-slate-500 border-b border-slate-200">⊘ Otros / Especiales</td></tr>
                  {excluidos.map((r) => (
                    <tr key={r.id} className="opacity-55 hover:opacity-80 transition-opacity">
                      <td className="px-3 py-2"><span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black bg-slate-200 text-slate-500">{r.label}</span></td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">Excluido</span></td>
                      <td className="px-3 py-2 text-slate-600 text-sm" colSpan={9}>{r.name} &mdash; <span className="text-[11px]">{r.l > 0 ? `${r.l}×${r.w}×${r.h} cm` : 'Sin dimensiones'}</span></td>
                    </tr>
                  ))}
                </>
              )}
            </tbody>
            
            {/* FOOTER TOTAL MIX */}
            {(() => {
              const selectedMixRows = computedRows.filter(r => selectedMixIds.includes(r.id));
              const totalReq = selectedMixRows.reduce((s, r) => s + (r.requiredDaily || 0), 0);
              if (totalReq === 0) return null;
              const bestY1 = scenarioResults.lavadoSecado?.[0];
              const machCapDay = bestY1 ? bestY1.machineBoxesPerHour * bestY1.availableDailyTime : 0;
              const covers = machCapDay >= totalReq;
              return (
                <tfoot>
                  <tr className="border-t-2 border-yellow-250 bg-slate-50">
                    <td colSpan={3} className="px-4 py-3 text-xs font-black uppercase tracking-widest text-yellow-800">Total req. diario (Mix seleccionado)</td>
                    <td colSpan={3} />
                    <td className="px-4 py-3">
                      <span className="text-lg font-black text-amber-600">{totalReq.toLocaleString('es-MX')}</span>
                      <span className="text-[10px] text-slate-500 ml-1 font-bold">cajas/día</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("px-3 py-1 rounded-full text-xs font-black border", 
                        covers ? 'bg-green-50 text-green-700 border-green-200' : 'bg-pink-50 text-pink-700 border-pink-200'
                      )}>
                        {covers ? '✓ 1 máq. suficiente' : '⚠ 1 máq. insuficiente'}
                      </span>
                    </td>
                    <td colSpan={3} />
                  </tr>
                </tfoot>
              );
            })()}
          </table>
        </div>
      </div>

      {/* Viabilidad Panel */}
      {(() => {
        const mixRows  = computedRows.filter(r => selectedMixIds.includes(r.id));
        const totalReq = mixRows.reduce((s, r) => s + (r.requiredDaily || 0), 0);
        if (totalReq === 0) return null;

        const bestY1 = scenarioResults.lavadoSecado?.[0];
        const y1Hours = bestY1?.availableDailyTime ?? (inputs.hoursPerShift * inputs.shifts);
        const avgCapH = mixRows.length > 0 ? mixRows.reduce((s, r) => s + r.realBoxesHr, 0) / mixRows.length : 0;
        const machCapDay  = +(avgCapH * y1Hours).toFixed(0);
        const machCapHour = +avgCapH.toFixed(1);
        const reqPerHour = y1Hours > 0 ? +(totalReq / y1Hours).toFixed(1) : 0;
        const covers   = machCapDay >= totalReq;
        const lines    = machCapDay > 0 ? Math.ceil(totalReq / machCapDay) : 0;
        const coverPct = machCapDay > 0 ? Math.min(100, (machCapDay / totalReq) * 100) : 0;

        return (
          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm text-slate-800">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap items-center justify-between gap-3">
              <h3 className="text-sm font-black uppercase tracking-widest text-yellow-800">
                ◈ Viabilidad — Mix seleccionado ({selectedMixIds.length} mod.) vs. Lavado+Secado
              </h3>
              <span className={cn("px-3 py-1 rounded-full text-xs font-black border", 
                covers ? 'bg-green-50 text-green-700 border-green-200' : 'bg-pink-50 text-pink-705 border-pink-250'
              )}>
                {covers ? '✓ UNA MÁQUINA SUFICIENTE' : `⚠️ SE REQUIEREN ${lines} MÁQUINAS`}
              </span>
            </div>
            
            <div className="p-5 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {/* KPI 1 */}
              <div onClick={() => setViabilityInfoModal({
                title: 'Total Req. / Día',
                formula: 'Suma de los Req. Diario de los modelos activos en el mix (círculos encendidos en la tabla).',
                steps: [
                  `Modelos en mix: ${mixRows.filter(r=>r.requiredDaily>0).map(r=>`${r.label} ${r.name} = ${(r.requiredDaily||0).toLocaleString('es-MX')}`).join(' | ')}`,
                  `Total = ${mixRows.filter(r=>r.requiredDaily>0).map(r=>r.requiredDaily||0).join(' + ')} = ${totalReq.toLocaleString('es-MX')} cajas/día`
                ]
              })} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center cursor-pointer hover:border-yellow-500/40 hover:bg-yellow-50/10 transition-all">
                <div className="text-[9px] text-yellow-700 uppercase font-bold tracking-wider mb-1">Total Req. / Día</div>
                <div className="text-2xl font-black text-slate-850">{totalLavadoReq.toLocaleString('es-MX')}</div>
                <div className="text-[9px] text-slate-500 font-medium">{`cajas/día (${selectedMixIds.length} modelo${selectedMixIds.length>1?'s':''} selec.)`}</div>
              </div>
              {/* KPI 2 */}
              <div onClick={() => setViabilityInfoModal({
                title: 'Cap. Máq. / Día (Y1)',
                formula: 'Promedio de Cap. Real/h de los modelos en el mix × Horas disponibles Y1.',
                steps: [
                  `Modelos en mix: ${mixRows.map(r=>`${r.label} ${r.name} (${r.realBoxesHr.toFixed(1)} c/h)`).join(' | ')}`,
                  `Promedio cap/h = (${mixRows.map(r=>r.realBoxesHr.toFixed(1)).join(' + ')}) ÷ ${mixRows.length} = ${machCapHour} c/h`,
                  `Tiempo disponible Y1: ${y1Hours.toFixed(2)} h/día`,
                  `Cap./día = ${machCapHour} × ${y1Hours.toFixed(2)} = ${machCapDay.toLocaleString('es-MX')} cajas/día`
                ]
              })} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center cursor-pointer hover:border-yellow-500/40 hover:bg-yellow-50/10 transition-all">
                <div className="text-[9px] text-yellow-705 uppercase font-bold tracking-wider mb-1">Cap. Máq. / Día (Y1)</div>
                <div className="text-2xl font-black text-slate-850">{machCapDay.toLocaleString('es-MX')}</div>
                <div className="text-[9px] text-slate-500 font-medium">prom. {machCapHour} c/h × {y1Hours.toFixed(1)}h</div>
              </div>
              {/* KPI 3 */}
              <div onClick={() => setViabilityInfoModal({
                title: 'Req. / Hora Necesario',
                formula: 'Total req./día ÷ Horas disponibles Y1.',
                steps: [
                  `Total req. mix: ${totalReq.toLocaleString('es-MX')} cajas/día`,
                  `Horas disponibles Y1: ${y1Hours.toFixed(2)} h`,
                  `Req./h = ${totalReq} ÷ ${y1Hours.toFixed(2)} = ${reqPerHour} c/h`,
                  `Cap. promedio del mix: ${machCapHour} c/h`
                ]
              })} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center cursor-pointer hover:border-yellow-500/40 hover:bg-yellow-50/10 transition-all">
                <div className="text-[9px] text-yellow-700 uppercase font-bold tracking-wider mb-1">Req. / Hora Necesario</div>
                <div className="text-2xl font-black text-slate-850">{reqPerHour}</div>
                <div className="text-[9px] text-slate-500 font-medium">vs prom. mix: {machCapHour} c/h</div>
              </div>
              {/* KPI 4 */}
              <div onClick={() => setViabilityInfoModal({
                title: 'Estado de Viabilidad',
                formula: 'Evalúa si la capacidad de la máquina única (Y1) es suficiente para cubrir la demanda del mix seleccionado.',
                steps: [
                  `Total req./día: ${totalReq.toLocaleString('es-MX')} cajas`,
                  `Cap. máquina/día (Y1): ${machCapDay.toLocaleString('es-MX')} cajas`,
                  `Cobertura = ${totalReq > 0 ? ((machCapDay / totalReq) * 105).toFixed(1) : 0}%`
                ]
              })} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center cursor-pointer hover:border-cyan-500/40 hover:bg-cyan-50/10 transition-all">
                <div className="text-[9px] text-yellow-700 uppercase font-bold tracking-wider mb-1">Viabilidad (1 Máq.)</div>
                <div className={cn("text-xl font-black", covers ? 'text-green-600' : 'text-pink-600')}>
                  {covers ? 'VIABLE' : 'INSUFICIENTE'}
                </div>
                <div className="text-[9px] text-slate-500 font-bold">sobre mix seleccionado</div>
              </div>
              {/* KPI 5 */}
              {(() => {
                const capUsedPct = machCapDay > 0 ? (totalReq / machCapDay) * 100 : 0;
                const capFreePct = Math.max(0, 100 - capUsedPct);
                const overload   = capUsedPct > 100;
                const freeBoxes  = Math.max(0, machCapDay - totalReq);
                const kpiColor   = overload ? 'text-pink-600' : capFreePct > 20 ? 'text-yellow-600' : 'text-amber-600';
                return (
                  <div onClick={() => setViabilityInfoModal({
                    title: '% Cap. Disponible',
                    formula: '(Cap. máq/día − Total req.) ÷ Cap. máq/día × 100.',
                    steps: [
                      `Cap. máq/día (Y1): ${machCapDay.toLocaleString('es-MX')} cajas`,
                      `Total req. mix: ${totalReq.toLocaleString('es-MX')} cajas`,
                      `Cajas libres = ${freeBoxes.toLocaleString('es-MX')} cajas`
                    ]
                  })} className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center cursor-pointer hover:border-yellow-500/40 hover:bg-yellow-50/10 transition-all">
                    <div className="text-[9px] text-yellow-700 uppercase font-bold tracking-wider mb-1">Cap. Disponible</div>
                    <div className={cn("text-2xl font-black", kpiColor)}>
                      {capFreePct.toFixed(1)}%
                    </div>
                    <div className="text-[9px] text-slate-500 font-medium">{freeBoxes.toLocaleString('es-MX')} c libres/día</div>
                  </div>
                );
              })()}
            </div>
            
            {/* Progress bar */}
            <div className="px-5 pb-5 space-y-1.5 border-t border-slate-100 pt-4">
              <div className="flex justify-between text-[10px] text-slate-500 font-bold">
                <span>Cobertura con 1 máquina (Y1 mejor caso)</span>
                <span className="font-bold text-slate-805">{coverPct.toFixed(1)}%</span>
              </div>
              <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden border border-slate-200/50">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width:`${coverPct}%`, background:'linear-gradient(90deg,#3b82f6,#eab308)' }}
                />
              </div>
              {!covers && (
                <p className="text-[10px] pt-1 text-slate-600 font-medium">
                  Déficit: <span className="font-bold text-red-600">{(totalReq - machCapDay).toLocaleString('es-MX')}</span> cajas/día — la máquina cubre el {coverPct.toFixed(1)}% del total requerido.
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Análisis de Mix Panel */}
      {(() => {
        const mixRows = computedRows.filter(r => selectedMixIds.includes(r.id));
        const avgCapH = mixRows.length > 0 ? mixRows.reduce((s, r) => s + r.realBoxesHr, 0) / mixRows.length : 0;
        const totalMixReq = mixRows.reduce((s, r) => s + (r.requiredDaily || 0), 0);
        const y1Hours = scenarioResults.lavadoSecado?.[0]?.availableDailyTime ?? (inputs.hoursPerShift * inputs.shifts);
        const mixHrsNeeded = +mixRows.reduce((s, r) => s + r.requiredHours, 0).toFixed(2);
        const mixCovers = totalMixReq > 0 ? mixHrsNeeded <= y1Hours : null;
        const mixCapDay = Math.round(avgCapH * y1Hours);
        return (
          <div className="rounded-2xl bg-white border border-slate-200 overflow-hidden shadow-sm text-slate-800">
            <div className="px-5 py-3.5 border-b border-slate-250 bg-slate-50/50 flex flex-wrap items-center justify-between gap-4">
              <h3 className="text-sm font-black uppercase tracking-widest text-yellow-800">
                ◈ Análisis de Mix — Selecciona los modelos a producir hoy
              </h3>
              <div className="flex items-center gap-3">
                <button onClick={distributeGlobalRate} className="text-[10px] font-black uppercase bg-yellow-50 hover:bg-yellow-100 text-yellow-750 border border-yellow-200 px-3 py-1.5 rounded-lg transition-all">
                  Distribuir Rate Global
                </button>
                <button onClick={() => setSelectedMixIds([])} className="text-[10px] text-slate-400 hover:text-slate-700 transition-colors font-bold uppercase">Limpiar</button>
              </div>
            </div>

            {/* Model Selector list */}
            <div className="p-4 flex flex-wrap gap-2 border-b border-slate-100 bg-slate-50/10">
              {computedRows.map(r => {
                const active = selectedMixIds.includes(r.id);
                return (
                  <button key={r.id} onClick={() => toggleMix(r.id)}
                    className={cn("flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-bold transition-all", 
                      active
                        ? 'border-yellow-500 bg-yellow-50/50 text-yellow-800 shadow-sm'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-350 hover:bg-slate-50'
                    )}
                  >
                    <span className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black text-white"
                      style={{ backgroundColor: active ? (r.color||'#3b82f6') : '#94a3b8' }}>
                      {r.label}
                    </span>
                    {r.name}
                    <span className="opacity-75 text-[10px] font-mono">({r.realBoxesHr.toFixed(0)} c/h)</span>
                  </button>
                );
              })}
            </div>

            {mixRows.length === 0 ? (
              <div className="px-5 py-8 text-center text-xs text-slate-400 font-bold uppercase tracking-wider">Selecciona al menos un modelo de caja para iniciar el análisis del mix.</div>
            ) : (
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-[9px] text-yellow-750 uppercase font-bold tracking-wider mb-1">Modelos Selec.</div>
                    <div className="text-2xl font-black text-slate-800">{mixRows.length}</div>
                    <div className="text-[9px] text-slate-500 font-bold">{mixRows.map(r=>r.label).join(', ')}</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-[9px] text-yellow-750 uppercase font-bold tracking-wider mb-1">Cap. Promedio/h</div>
                    <div className="text-2xl font-black text-slate-800">{avgCapH.toFixed(1)}</div>
                    <div className="text-[9px] text-slate-500 font-bold">cajas/h (prom. mix)</div>
                  </div>
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-[9px] text-yellow-750 uppercase font-bold tracking-wider mb-1">Cap. Mix / Día (Y1)</div>
                    <div className="text-2xl font-black text-slate-800">{mixCapDay.toLocaleString('es-MX')}</div>
                    <div className="text-[9px] text-slate-500 font-bold">{avgCapH.toFixed(1)} c/h &times; {y1Hours.toFixed(1)}h</div>
                  </div>
                  {(() => {
                    const y1Sc    = scenarioResults.lavadoSecado?.[0];
                    const hrsEfT  = y1Sc?.effectiveHoursPerShift ?? 0;
                    const shifts  = y1Sc?.shifts ?? 1;
                    return (
                      <div className="p-3.5 rounded-xl bg-yellow-50/50 border border-yellow-200 text-center">
                        <div className="text-[9px] text-yellow-755 uppercase font-bold tracking-wider mb-1">Hrs Ef. / Turno (Y1)</div>
                        <div className="text-2xl font-black text-yellow-800">{hrsEfT.toFixed(2)}h</div>
                        <div className="text-[9px] text-slate-500 font-bold">{shifts} turno{shifts > 1 ? 's' : ''} · {y1Hours.toFixed(2)}h total</div>
                      </div>
                    );
                  })()}
                  <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-center">
                    <div className="text-[9px] text-yellow-750 uppercase font-bold tracking-wider mb-1">Horas Necesarias</div>
                    <div className={cn("text-2xl font-black", mixHrsNeeded > y1Hours ? 'text-red-600' : 'text-slate-800')}>
                      {mixHrsNeeded > 0 ? `${mixHrsNeeded}h` : '-'}
                    </div>
                    <div className="text-[9px] text-slate-500 font-bold">de {y1Hours.toFixed(2)}h disp. (Y1)</div>
                  </div>
                </div>

                {/* Detalle por modelo */}
                <div className="overflow-x-auto border border-slate-150 rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-150">
                      <tr>
                        {['Mod','Nombre','Cap. Real/h','Req. Diario','Hrs Necesarias','¿Alcanza?'].map(h=>(
                          <th key={h} className="px-3 py-2.5 text-left text-[10px] text-slate-500 uppercase font-bold tracking-wider">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {mixRows.map(r => {
                        const hrsNeeded = r.realBoxesHr > 0 && r.requiredDaily > 0 ? +(r.requiredDaily / r.realBoxesHr).toFixed(2) : null;
                        const ok = hrsNeeded !== null ? hrsNeeded <= y1Hours : null;
                        return (
                          <tr key={r.id} className="hover:bg-slate-50">
                            <td className="px-3 py-2">
                              <span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-white" style={{backgroundColor: r.color||'#3b82f6'}}>{r.label}</span>
                            </td>
                            <td className="px-3 py-2 text-slate-800 font-bold">{r.name}</td>
                            <td className="px-3 py-2 text-slate-600 font-medium">{r.realBoxesHr.toFixed(1)} c/h</td>
                            <td className="px-3 py-2 text-slate-800 font-bold">{r.requiredDaily > 0 ? r.requiredDaily.toLocaleString('es-MX') : <span className="text-slate-400">—</span>}</td>
                            <td className={cn("px-3 py-2 font-bold", ok===false?'text-red-600':'text-slate-700')}>{hrsNeeded !== null ? `${hrsNeeded}h` : '—'}</td>
                            <td className="px-3 py-2">
                              {ok === null ? <span className="text-slate-400 text-[10px] font-bold">Sin req.</span>
                              : ok ? <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-yellow-50 text-yellow-750 border border-yellow-250">✓ Sí</span>
                              : <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-600 border border-red-200">✗ No</span>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Verdict mix */}
                {totalMixReq > 0 && (
                  <div className={cn("p-3 rounded-xl border text-center text-xs font-bold", 
                    mixCovers ? 'bg-yellow-50 border-yellow-300 text-yellow-800' : 'bg-red-50 border-red-200 text-red-700'
                  )}>
                    {mixCovers
                      ? `✓ El mix completo (${totalMixReq.toLocaleString('es-MX')} cajas) puede completarse en ${mixHrsNeeded}h — dentro de las ${y1Hours.toFixed(2)}h disponibles (Y1).`
                      : `⚠ El mix (${totalMixReq.toLocaleString('es-MX')} cajas) requiere ${mixHrsNeeded}h pero solo hay ${y1Hours.toFixed(2)}h disponibles (Y1). Faltan ${(mixHrsNeeded - y1Hours).toFixed(2)}h.`
                    }
                  </div>
                )}

                {/* Image Box */}
                <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-yellow-500 rounded-full" />
                      <h4 className="text-xs font-black uppercase text-slate-805 tracking-widest">Foto del Producto (Caja)</h4>
                    </div>
                    {productImageBase64 && (
                      <button 
                        onClick={handleRemoveProductImage}
                        className="text-[10px] font-bold text-red-500 hover:text-red-700 transition-colors uppercase"
                      >
                        Eliminar
                      </button>
                    )}
                  </div>

                  {productImageBase64 ? (
                    <div className="relative group rounded-xl border border-slate-200 overflow-hidden bg-white h-44 flex items-center justify-center p-2 shadow-inner">
                      <img 
                        src={productImageBase64} 
                        alt="Caja a lavar" 
                        className="max-h-full max-w-full object-contain"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                        <label className="cursor-pointer text-xs font-black text-yellow-800 border border-yellow-300 rounded-lg px-3 py-1.5 bg-white hover:bg-yellow-50 transition-all uppercase shadow-md">
                          Cambiar Foto
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={handleProductImageUpload} 
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label className="border border-dashed border-slate-300 hover:border-yellow-500 hover:bg-yellow-50/20 rounded-xl p-6 flex flex-col items-center justify-center gap-2 cursor-pointer transition-all h-44 group">
                      <Upload className="w-6 h-6 text-slate-400 group-hover:text-yellow-600 transition-colors" />
                      <span className="text-xs font-bold text-slate-500 group-hover:text-slate-800 transition-colors">Subir imagen del contenedor</span>
                      <span className="text-[9px] text-slate-400">Recomendado: Imagen cuadrada de menos de 2MB</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleProductImageUpload} 
                        className="hidden" 
                      />
                    </label>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })()}

    </div>
  );
}
