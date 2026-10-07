import React from 'react';
import {DHL_OFFER, dhlTechnicalRows} from '../../utils/dhlTenderModel';
import {DHL_REFERENCE_VIEWS,DHL_REFERENCE_LOGO} from './dhlReferenceViews';

const fmt=(v,d=2)=>v===null||v===undefined||!Number.isFinite(Number(v))?'Pendiente':new Intl.NumberFormat('es-MX',{minimumFractionDigits:d,maximumFractionDigits:d}).format(Number(v));
const sign=(v,d=2)=>v===null?'Pendiente':`${v>=0?'+':''}${fmt(v,d)}`;
const c={ink:'#14243b',cyan:'#008299',light:'#ecf9fb',gray:'#526274',line:'#dfe8ee',warn:'#9a5b12',red:'#b42332'};
const css=`
.dhl-report{font-family:Arial,Helvetica,sans-serif;color:${c.ink};text-align:left;font-size:15px;line-height:1.4;font-weight:400;}
.dhl-report *{box-sizing:border-box;}
.dhl-report .pdf-page{width:1120px;height:792px;position:relative;background:#fff;border:1px solid ${c.line};border-radius:18px;overflow:hidden;margin:0 0 24px;flex-shrink:0;padding:38px 46px 62px;}
.dhl-report h1,.dhl-report h2,.dhl-report h3,.dhl-report p{margin:0;line-height:1.3;}
.dhl-report h1{font-size:42px;font-weight:800;letter-spacing:-1px;}
.dhl-report h2{font-size:30px;font-weight:800;letter-spacing:-.6px;}
.dhl-report h3{font-size:19px;font-weight:700;color:${c.cyan};}
.dhl-report .header{height:90px;display:flex;justify-content:space-between;gap:18px;align-items:flex-start;border-bottom:1px solid ${c.line};margin-bottom:20px;}
.dhl-report .header p{font-size:13px;color:${c.gray};margin-top:8px;}
.dhl-report .eyebrow{font-size:12px;font-weight:800;color:${c.cyan};letter-spacing:1.4px;text-transform:uppercase;margin-bottom:6px;}
.dhl-report .brand{width:164px;height:42px;object-fit:contain;}
.dhl-report .footer{position:absolute;bottom:21px;left:46px;right:46px;height:24px;border-top:1px solid ${c.line};padding-top:9px;display:flex;justify-content:space-between;gap:20px;font-size:10px;font-weight:700;color:#607288;letter-spacing:.4px;}
.dhl-report .body{display:flex;flex-direction:column;gap:16px;height:568px;}
.dhl-report .grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;}
.dhl-report .metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;}
.dhl-report .metric,.dhl-report .box{border:1px solid ${c.line};border-radius:12px;padding:16px;background:#fff;}
.dhl-report .metric{background:${c.light};padding:13px 15px;}
.dhl-report .metric strong{display:block;color:${c.cyan};font-size:27px;line-height:1.25;margin:6px 0;}
.dhl-report .metric span{font-size:12px;color:${c.gray};display:block;}
.dhl-report .metric label{font-size:12px;font-weight:700;display:block;}
.dhl-report .note{border:1px solid #b8e6eb;border-radius:10px;background:${c.light};padding:13px 16px;font-size:14px;line-height:1.45;}
.dhl-report .warn{background:#fff8eb;border-color:#ead4ac;color:#704c20;}
.dhl-report .danger{background:#fff0f1;border-color:#edbcc1;color:${c.red};}
.dhl-report .small{font-size:12px;color:${c.gray};line-height:1.45;}
.dhl-report table{width:100%;border-collapse:collapse;font-size:14px;line-height:1.35;table-layout:fixed;}
.dhl-report th{padding:9px 10px;background:${c.light};color:${c.cyan};font-size:12px;text-transform:uppercase;text-align:left;border-bottom:2px solid #b8e6eb;overflow-wrap:anywhere;}
.dhl-report td{padding:8px 10px;border-bottom:1px solid ${c.line};vertical-align:top;overflow-wrap:anywhere;}
.dhl-report .compact td{padding:4px 9px;font-size:13px;}
.dhl-report .numeric{text-align:right;font-variant-numeric:tabular-nums;}
.dhl-report .focus{background:#edfbfd;font-weight:700;}
.dhl-report .bad{color:${c.red};font-weight:700;}
.dhl-report .good{color:${c.cyan};font-weight:700;}
.dhl-report ul{padding-left:20px;margin:8px 0 0;}
.dhl-report li{margin:7px 0;}
.dhl-report .view{width:100%;height:425px;object-fit:contain;border:1px solid ${c.line};border-radius:12px;background:#edf4f9;}
.dhl-report .row{display:flex;justify-content:space-between;gap:20px;border-bottom:1px solid ${c.line};padding:9px 0;}
.dhl-report svg text{font-family:Arial,Helvetica,sans-serif;}
@media print{.dhl-report .pdf-page{margin:0;border:0;border-radius:0;break-after:page;}}
`;
function Page({number,title,subtitle,children}){
  return <section className="pdf-page" data-report-page={number}>
    <header className="header"><div><div className="eyebrow">DHL Supply Chain / Volvo Washing Machine DSC</div><h2>{title}</h2><p>{subtitle}</p></div><img className="brand" src={DHL_REFERENCE_LOGO} alt="Soliwaste"/></header>
    <div className="body">{children}</div>
    <footer className="footer"><span>FRANCISCO LOUVIER | BWD-350 + BA + SWM-1000 | REVISIÓN TÉCNICA</span><span>PÁGINA {number} DE 13</span></footer>
  </section>;
}
function Metric({label,value,unit}){return <div className="metric"><label>{label}</label><strong>{value}</strong><span>{unit}</span></div>;}
function Note({children,warning=false,danger=false}){return <div className={`note ${warning?'warn':''} ${danger?'danger':''}`}>{children}</div>;}
function Table({heads,rows,compact=false,widths}){return <table className={compact?'compact':''}><thead><tr>{heads.map((h,k)=><th key={k} style={widths?{width:widths[k]}:undefined}>{h}</th>)}</tr></thead><tbody>{rows.map((r,j)=><tr key={j}>{r.map((v,k)=><td key={k}>{v}</td>)}</tr>)}</tbody></table>;}
function MixChart({boxes}){
  const max=Math.max(1,...boxes.map(b=>Number(b.piezasDia2028)||0));
  return <svg viewBox="0 0 1010 170" style={{width:'100%',height:120}} aria-label="Demanda diaria de las once referencias 2028">
    <line x1="40" y1="135" x2="1000" y2="135" stroke={c.line}/>
    {boxes.map((b,k)=>{const x=52+k*86,h=(Number(b.piezasDia2028)||0)/max*103;return <g key={b.id||k}><rect x={x} y={135-h} width="42" height={h} rx="3" fill={c.cyan}/><text x={x+21} y={125-h} fontSize="13" textAnchor="middle" fill={c.ink}>{fmt(b.piezasDia2028,0)}</text><text x={x+21} y="156" fontSize="13" textAnchor="middle" fill={c.gray}>{b.code||b.nombre?.match(/\d+/)?.[0]||k+1}</text></g>;})}
  </svg>;
}

export function DHLAnnualPanel({inputs,results,onChange}){
  const rows=results.annualScenarios;
  return <div style={{background:'#fff',color:c.ink,padding:24,border:'1px solid '+c.line,borderRadius:16,fontFamily:'Arial,sans-serif'}}>
    <h3 style={{fontSize:20,color:c.cyan,fontWeight:800,marginBottom:10}}>Simulación anual 2027-2030 | Horas, capacidad y consumos</h3>
    <p style={{fontSize:13,marginBottom:16}}>2028: demanda DHL. Los otros años y todos los OEE son supuestos editables del simulador recibido. No constituyen validación contractual.</p>
    <div style={{overflowX:'auto'}}><table style={{width:'100%',fontSize:13,borderCollapse:'collapse'}}><thead><tr>{['Año','Demanda/día','OEE %','h turno/año','h efectivas/año','h requeridas/año','Saldo h','kWh/año (parcial)','Agua m³/año (base)'].map(h=><th key={h} style={{padding:8,textAlign:'left',background:c.light}}>{h}</th>)}</tr></thead>
    <tbody>{rows.map(r=><tr key={r.year}><td style={{padding:8,fontWeight:800}}>{r.year}</td><td>{onChange&&r.year!==2028?<input aria-label={`Demanda ${r.year}`} type="number" min="0" value={r.demand} onChange={e=>onChange(r.year,'demand',Number(e.target.value))} style={{width:85,border:'1px solid '+c.line,color:c.ink,background:'#fff',padding:5}}/>:fmt(r.demand,0)}</td><td>{onChange&&r.year!==2028?<input aria-label={`OEE ${r.year}`} type="number" min="0" max="100" value={r.oee} onChange={e=>onChange(r.year,'oee',Number(e.target.value))} style={{width:60,border:'1px solid '+c.line,color:c.ink,background:'#fff',padding:5}}/>:fmt(r.oee,0)}</td><td>{fmt(r.shiftHours)}</td><td>{fmt(r.effectiveHours)}</td><td>{fmt(r.requiredHours)}</td><td style={{color:r.hourMargin<0?c.red:c.cyan}}>{sign(r.hourMargin)}</td><td>{fmt(r.energyKwh)}</td><td>{fmt(r.waterM3,3)}</td></tr>)}</tbody></table></div>
    <p style={{fontSize:12,marginTop:14}}>h efectivas = horas de turno × OEE; h requeridas = demanda anual / tasa nominal. El consumo eléctrico usa factor de carga independiente del OEE y turno completo. La potencia BA está pendiente; agua sin llenado inicial ni recambios adicionales.</p>
  </div>;
}

export default function DHLReportPages({inputs:i,results:r,snapshots={}}){
  const boxes=i.cajas||[];
  const views=[['isometrica','Vista isométrica',snapshots.isometrica],['superior','Vista superior',snapshots.superior],['lateral','Vista lateral',snapshots.lateral]];
  const tech=dhlTechnicalRows(i,r);
  const money=v=>`$${fmt(v)} MXN`;
  const nominalHours=r.dayHours*r.daysPerYear;
  return <div className="dhl-report"><style>{css}</style>
    <Page number={1} title="Simulación de línea | 2027-2030" subtitle="Balance paramétrico de capacidad, horas y consumos. Año de evaluación DHL: 2028.">
      <div className="grid"><div className="box"><div className="eyebrow">Configuración propuesta</div><h1>BWD-350 + BA</h1><h3 style={{marginTop:8}}>Tratamiento SWM-1000</h3><p style={{marginTop:18}}>Cliente técnico: <b>{i.clientName||'Francisco Louvier'}</b></p><p style={{marginTop:8}}>Proyecto: Volvo Washing Machine DSC</p><p style={{marginTop:8}}>Fecha: {i.evaluationDate||'06/10/2026'}</p><div className="row"><span>Turno / turnos diarios</span><b>{fmt(i.hoursPerDay,1)} h / {i.shiftsPerDay}</b></div><div className="row"><span>Calendario</span><b>Lunes a viernes / {fmt(r.daysPerYear,0)} días/año</b></div><div className="row"><span>Promedio mensual</span><b>{fmt(r.daysPerMonth,6)} días</b></div></div>
      <div style={{display:'flex',flexDirection:'column',gap:12}}><Metric label="Demanda conjunta 2028" value={fmt(r.dailyGoalBoxes,0)} unit="unidades/día: 11 referencias"/><Metric label={`Capacidad neta a OEE ${fmt(r.oee,0)}% supuesto`} value={fmt(r.realProductionPerHourBoxes)} unit="unidades/hora; sin redondeo intermedio"/><Metric label="Saldo diario del balance agregado" value={sign(r.operationalReserve)} unit="unidades/día; sujeto a condiciones operativas"/></div></div>
      <Note warning={r.operationalReserve>=0} danger={r.operationalReserve<0}>{r.dictamenTexto}</Note>
      <p className="small">Las 8.5 h describen la duración del turno. Arranque, calentamiento, pausas y cambios de formato deben estar incluidos en disponibilidad/OEE o descontarse una sola vez. Este cálculo no demuestra calidad, secado, ruido ni recuperación semanal de agua.</p>
    </Page>
    {views.map(([key,title,src],index)=><Page key={key} number={index+2} title={title} subtitle="Configuración visual de la línea. El layout de ingeniería prevalece sobre esta representación.">
      <img className="view" src={src||DHL_REFERENCE_VIEWS[key]} alt={title}/>
      <Note>{src?'Captura disponible del modelo guardado en el simulador.':'Captura ilustrativa recuperada del informe original de 13 páginas.'} No utilizar esta imagen como plano dimensionado ni como comprobación de capacidad o envolvente.</Note>
      <p className="small">Layout E: BWD-350 + BA, 12.50 × 1.80 × 1.75 m. SWM-1000: 2.00 × 1.10 × 2.00 m, separado. Confirmar la envolvente total cuando la RO se coloque lateralmente.</p>
    </Page>)}
    <Page number={5} title="Configuración y potencia documentada" subtitle="Desglose conciliado con oferta A y anexo B. Conversión de HP; no medición eléctrica.">
      <Table heads={['Componente','Potencia de referencia','Fuente / alcance']} rows={r.powerParts.map(([name,kw,source])=>[name,`${fmt(kw,4)} kW`,source])}/>
      <div className="metrics"><Metric label="Subtotal documentado" value={fmt(r.knownPowerKw)} unit="kW: incluye SWM-1000"/><Metric label="BA adicional registrado" value={r.powerComplete?fmt(r.additionalDryersKw):'Pendiente'} unit="kW incrementales, sin duplicar soplador"/><Metric label="Factor de carga supuesto" value={`${fmt(i.loadFactor,0)}%`} unit="independiente del OEE"/><Metric label="Potencia media parcial" value={fmt(r.averageHourlyConsumptionKw)} unit="kW sobre las partidas documentadas"/></div>
      <Note warning>La oferta describe BA externo de 5 m con cuatro secadores, pero no desglosa su potencia incremental. El total integral y los costos eléctricos permanecen parciales hasta conciliar motores, resistencias y auxiliares. La conversión HP→kW representa potencia mecánica nominal; consumo eléctrico requiere rendimiento, factor de carga y medición.</Note>
      <p className="small">Fórmula base: suma de potencias documentadas + BA incremental confirmado. Potencia media estimada = subtotal × factor de carga. No se aplica OEE como factor eléctrico.</p>
    </Page>
    <Page number={6} title="Ficha técnica de la solución" subtitle="Especificaciones de referencia y pendientes de ingeniería. Sin homologaciones automáticas.">
      <Table compact heads={['Característica','Especificación','Fuente / condición']} widths={['24%','31%','45%']} rows={tech}/>
      <p className="small">Dimensiones de lavadora y RO identificadas por separado. Oferta A: garantía 24 meses desde SAT; confirmar condiciones en la cotización final firmada.</p>
    </Page>
    <Page number={7} title="Las 11 referencias | demanda 2028" subtitle="Geometrías y cantidades de Francisco Louvier. Todas comparten la misma línea.">
      <Table compact heads={['Referencia','L × A × H (mm)','Tapa','Unidades/día','Tiempo neto (min)']} widths={['18%','29%','15%','17%','21%']} rows={boxes.map(b=>[b.code||b.nombre?.match(/\d+/)?.[0]||b.nombre,`${fmt(b.largoCm*10,1)} × ${fmt(b.anchoCm*10,1)} × ${fmt(b.altoCm*10,1)}`,b.hasLid?'Caja + tapa':'Sin tapa',fmt(b.piezasDia2028,0),r.realProductionPerHourBoxes>0?fmt(b.piezasDia2028/r.realProductionPerHourBoxes*60):'Sin capacidad'])}/>
      <MixChart boxes={boxes}/>
      <Note warning>Total: <b>{fmt(r.dailyGoalBoxes,0)} unidades/día</b>. Tiempo agregado a tasa neta común: <b>{fmt(r.hoursRequired===null?null:r.hoursRequired*60,4)} min</b>. No incluye un cálculo mecánico por receta. Orientación, carriles, separación, residencia, setups y procesamiento de tapas deben validarse; ninguna familia queda aprobada por comparación aislada.</Note>
    </Page>
    <Page number={8} title="Proyección anual 2027-2030" subtitle="Consumo por año y eficiencia en horas. La demanda 2028 es la referencia de DHL.">
      <Table compact heads={['Año','Demanda/día','OEE supuesto','h turno/año','h efectivas/año','h requeridas/año','Saldo h/año']} rows={r.annualScenarios.map(y=>[<b>{y.year}</b>,fmt(y.demand,0),`${fmt(y.oee,0)}%`,fmt(y.shiftHours),fmt(y.effectiveHours),fmt(y.requiredHours),<span className={y.hourMargin<0?'bad':'good'}>{sign(y.hourMargin)}</span>])}/>
      <Table compact heads={['Año','Demanda anual','Capacidad anual','Utilización neta','Energía kWh/año*','Agua m³/año*']} rows={r.annualScenarios.map(y=>[y.year,fmt(y.annualDemand,0),fmt(y.annualCapacity,2),`${fmt(y.utilization,4)}%`,fmt(y.energyKwh),fmt(y.waterM3,3)])}/>
      <Note warning><b>Origen de los supuestos:</b> el código DHLSimulator.jsx recibido contenía 2027: 2500 u/d y OEE 92%; 2029: 2950 y 96%; 2030: 3100 y 97%. Se conservan como hipótesis, pendientes de aprobación DHL. Para 2028 se usa demanda DHL y OEE supuesto del escenario.</Note>
      <p className="small">h turno = turno × turnos × días/año; h efectivas = h turno × OEE; h requeridas = demanda anual / tasa nominal. Saldo expresado en horas equivalentes a tasa nominal. *Consumos sobre turno completo: energía parcial sin BA incremental; agua base sin llenado inicial, purgas ni recambios adicionales. No constituyen consumos anuales medidos.</p>
    </Page>
    <Page number={9} title="Balance de capacidad y energía" subtitle="Control 2028 y calendario común para todas las unidades y períodos.">
      <div className="metrics"><Metric label="Demanda horaria" value={fmt(r.dailyGoalBoxes/r.dayHours,6)} unit="unidades/h"/><Metric label="Producción diaria neta" value={fmt(r.dailyProductionBoxes)} unit="unidades/día"/><Metric label="OEE mínimo de equilibrio" value={`${fmt(r.minimumOee,6)}%`} unit="balance simplificado a tasa común"/><Metric label="Reserva a tasa neta" value={fmt(r.netReserveMinutes,4)} unit="minutos del turno"/></div>
      <div className="grid"><div><h3 style={{marginBottom:10}}>Producción y energía parcial</h3><Table heads={['Período','Producción (u)','Energía (kWh)*']} rows={[
        ['Día',fmt(r.dailyProductionBoxes),fmt(r.dailyEnergyKwh)],['Semana (5 días)',fmt(r.weeklyProductionBoxes),fmt(r.weeklyEnergyKwh)],['Mes promedio',fmt(r.monthlyProductionBoxes),fmt(r.monthlyEnergyKwh)],['Año (248 días)',fmt(r.annualProductionBoxes),fmt(r.annualEnergyKwh)],
      ]}/></div><div className="box"><h3>Indicadores del balance</h3><div className="row"><span>Cobertura</span><b>{fmt(r.requirementCoverage,7)}%</b></div><div className="row"><span>Utilización neta</span><b>{fmt(r.systemUtilization,7)}%</b></div><div className="row"><span>Margen nominal diario</span><b>{sign(r.nominalMargin)} u</b></div><div className="row"><span>Margen neto anual</span><b>{sign(r.annualMargin)} u</b></div><div className="row"><span>Reserva equivalente nominal</span><b>{fmt(r.nominalReserveMinutes,4)} min</b></div></div></div>
      <Note>*Potencia media parcial {fmt(r.averageHourlyConsumptionKw)} kW; costo eléctrico supuesto ${fmt(i.electricityRate)} MXN/kWh. Energía = potencia media × horas. Intensidad: {fmt(r.kwhPer1000Boxes)} kWh/1000 unidades producidas; costo eléctrico: {money(r.electricityCostPer1000BoxesMxn)} /1000 unidades.</Note>
      <p className="small">Horas anuales de turno: {fmt(nominalHours,0)}. Las dos reservas usan bases distintas: tiempo disponible a tasa neta y tiempo equivalente a tasa nominal. El margen es reducido y no valida el desempeño industrial de la mezcla.</p>
    </Page>
    <Page number={10} title="Escenarios y criterios FAT/SAT" subtitle="Sensibilidad al OEE supuesto. Los déficits permanecen visibles.">
      <Table heads={['OEE','Tasa neta (u/h)','Producción/día','Saldo/día','Resultado del balance']} rows={r.scenarios.map(s=>[`${s.oee}%`,fmt(s.capH),fmt(s.capDia),<span className={s.margen<0?'bad':'good'}>{sign(s.margen)}</span>,s.margen<0?'DÉFICIT':'SUFICIENCIA CONDICIONADA'])}/>
      <Note warning>Mínimo contractual: <b>320 unidades/h completamente lavadas y secas</b>. En {fmt(r.dayHours,1)} h produce {fmt(320*r.dayHours,0)} unidades; saldo {sign(320*r.dayHours-r.dailyGoalBoxes,0)} frente a la demanda. Cumplir 320 u/h no demuestra suficiencia diaria 2028.</Note>
      <div className="grid"><div className="box"><h3>Comprobar en FAT/SAT</h3><ul><li>Capacidad, calidad de lavado y todas las geometrías.</li><li>Sin escurrimientos visibles ni acumulación de agua.</li><li>Ruido ≤65 dB(A) y recuperación semanal ≥80%.</li></ul></div><div className="box"><h3>Protocolo por cerrar con DHL</h3><p style={{marginTop:10}}>Muestras representativas, recetas, duración, instrumentos calibrados, metodología, registros, criterios de aceptación y acciones correctivas con repetición de pruebas.</p></div></div>
    </Page>
    <Page number={11} title="Agua y disponibilidad de producción" subtitle="Base del anexo C y tratamiento SWM-1000. Estimaciones, no recuperación demostrada.">
      <div className="metrics"><Metric label="Flujo interno de referencia" value={fmt(r.flowLH,0)} unit="L/h según anexo C"/><Metric label="Reposición de referencia" value={fmt(r.reposicionTotalLH,0)} unit="L/h según anexo C"/><Metric label="Reposición diaria base" value={fmt(r.consumoDiarioTotalL/1000,3)} unit="m³/día de turno completo"/><Metric label="Reposición semanal base" value={fmt(r.weeklyWaterLiters/1000,3)} unit="m³/semana de cinco días"/></div>
      <Table heads={['Indicador','Cálculo / dato','Condición']} rows={[
        ['Consumo nominal unitario',`${fmt(r.consumoPorCajaL,5)} L/unidad`,`Reposición / ${r.nominalCapacity} u/h nominales; anexo ≈0.47`],
        ['Consumo por unidad neta',`${fmt(r.waterPerGoodUnit,5)} L/unidad`,'Reposición / tasa neta del escenario; otra base'],
        ['Mes / año base',`${fmt(r.totalWaterMonthlyLiters/1000,3)} / ${fmt(r.annualWaterM3,3)} m³`,'Promedio 248/12; año 248 días'],
        ['Relación simplificada de flujos',`${fmt(r.flowReuseEstimate,4)}%`,'1 - reposición / flujo interno; no equivale a recuperación semanal'],
        ['SWM-1000 / tanque','1000 L/h nominales / 1200 L','Permeado, concentrado y nivel útil por confirmar'],
      ]}/>
      <Note warning>El cálculo base no integra llenado inicial, calentamiento, evaporación, arrastre, purgas, recambios ni paros por falta de agua. Validar su inclusión en la reposición del anexo y en disponibilidad/OEE. Recirculación, recuperación de agua y rechazo de sales de RO son indicadores diferentes.</Note>
      <p className="small">La recuperación semanal ≥80% requiere definir fronteras de medición, volúmenes y balance semanal, incluyendo cambios de tanque. Los valores históricos 746/112 L/h y 0.36 L/unidad quedan sustituidos por la referencia del anexo; no se presentan como equivalentes.</p>
    </Page>
    <Page number={12} title="Oferta y costos de operación" subtitle="CAPEX conciliado con oferta A. OPEX estimado y parcialmente documentado.">
      <div className="grid"><div><h3 style={{marginBottom:10}}>Oferta antes de IVA (USD)</h3><Table compact heads={['Partida','Importe USD']} widths={['74%','26%']} rows={[...DHL_OFFER.map(([name,v])=>[name,`US$${fmt(v)}`]),[<b>Total</b>,<b>US${fmt(r.precioEquipoUsd)}</b>]]}/><p className="small" style={{marginTop:10}}>TC supuesto: ${fmt(i.tipoCambio)} MXN/USD. Equivalencia: {money(r.capexInstaladoMxn)} antes de IVA. Kit incluido; BOM y precios pendientes.</p></div><div><h3 style={{marginBottom:10}}>OPEX mensual estimado (MXN)</h3><Table compact heads={['Partida','Importe','Participación']} widths={['52%','28%','20%']} rows={[...r.opexParts.map(([name,v])=>[name,money(v),`${fmt(r.opexMensualMxn>0?v/r.opexMensualMxn*100:0,1)}%`]),[<b>Total parcial</b>,<b>{money(r.opexMensualMxn)}</b>,'100%']]}/><p className="small" style={{marginTop:10}}>Costo por unidad estimado: {money(r.opexPorCajaMxn)}. Denominador: producción mensual neta de {fmt(r.monthlyProductionBoxes)} unidades; no demanda ni kilogramos.</p></div></div>
      <Note warning>No agregar porcentajes de maniobras o instalación como cargos independientes a la oferta integral. La cotización final debe confirmar descarga, grúa/montacargas, posicionamiento, montaje y coordinación a cargo de SOLIMAQ, costo de fianza 20%, contrato, garantía y ausencia de costos omitidos. La oferta A aún debe conciliarse con esas aclaraciones.</Note>
      <p className="small">Mano de obra, mantenimiento, refacciones, químicos y consumibles son supuestos económicos del simulador. Electricidad parcial por potencia BA pendiente; agua base sin pérdidas adicionales. No se emite dictamen de rentabilidad ni payback sin ingresos o ahorros documentados.</p>
    </Page>
    <Page number={13} title="Implantación y cierre de ingeniería" subtitle="Requisitos por confirmar para liberación; sin prescripciones automáticas de cimentación.">
      <div className="grid"><div className="box"><h3>Layout y servicios</h3><ul><li>Lavadora + BA: 12.50 × 1.80 × 1.75 m.</li><li>RO separada: 2.00 × 1.10 × 2.00 m; comprobar envolvente lateral y pasillos.</li><li>480 VAC / 3 fases / 60 Hz.</li><li>Suministro según layout: 5 bar y ≥4 m³/h; comprobar conexiones y condiciones de sitio.</li><li>Drenaje, ventilación y acometidas según ingeniería aprobada.</li></ul></div><div className="box"><h3>Montaje y obra civil</h3><ul><li>SOLIMAQ: descarga, maniobras, grúa o montacargas, ubicación final, montaje y coordinación, incluidos en alcance/precio final por confirmar.</li><li>Peso seco, agua útil y cargas por apoyo por conciliar.</li><li>Losa, anclajes y refuerzo sujetos a cálculo estructural y sitio.</li><li>Sin espesor, excavación ni carga portante prefijados por el simulador.</li></ul></div></div>
      <Note warning><b>Dictamen de revisión:</b> el balance 2028 es condicionado. Antes de adjudicación deben cerrarse mezcla/recetas y tapas, disponibilidad/OEE, agua y calentamiento, secado, ruido, potencia integral y alcance comercial. El simulador documenta cálculos y supuestos; no sustituye evidencia ni aceptación FAT/SAT.</Note>
      <p className="small">Fuentes: oferta A V3.2, anexo B SWM-1000, anexo C técnico, layout E y tabla 2028 de Francisco Louvier. Capturas de respaldo: informe original de 13 páginas. Años 2027/2029/2030: hipótesis recuperadas del código recibido.</p>
    </Page>
  </div>;
}
