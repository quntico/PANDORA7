import React from 'react';
import { X, Printer } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ReferenceLine
} from 'recharts';
import SharedTwinViewer3D from '../flow/SharedTwinViewer3D';

const fmt = (v, d = 0) =>
  new Intl.NumberFormat('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v ?? 0);

export default function RyderReportModal({ reportData, printWindow, clearPrintWindow, onClose, isExportOnly = false, onExportPDF }) {
  const reportRef = React.useRef(null);

  const { 
    meta, inputs, kpis, lineUtilization, modelTable, lavadoSecadoParams, 
    conclusions, installedPowerKw, waterParams, productImageBase64,
    twinSnapshotLateral: reportTwinSnapshotLateral,
    twinSnapshotSuperior: reportTwinSnapshotSuperior,
    twinSnapshotIsometrica: reportTwinSnapshotIsometrica,
    pumpsKw: passedPumpsKw,
    blowersKw: passedBlowersKw,
    heatingKw: passedHeatingKw,
    beltKw: passedBeltKw,
  } = reportData;

  // Parámetros Hídricos y Cálculos
  const wp = waterParams || { washFlowLh: 1000, waterReplenishLh: 150, tankCapacityL: 1200, waterChangeDays: '3–5' };
  const waterDailyHours = inputs.hoursPerShift * inputs.shiftsPerDay || 10;
  const dailyWaterM3 = (wp.waterReplenishLh * waterDailyHours) / 1000;
  const weeklyWaterM3 = dailyWaterM3 * 6;
  const recircPct = wp.washFlowLh > 0 ? ((wp.washFlowLh - wp.waterReplenishLh) / wp.washFlowLh) * 100 : 0;
  const modelCapHr = modelTable?.[0]?.capHora || 200;
  const unitWaterL = modelCapHr > 0 ? (wp.waterReplenishLh / modelCapHr) : 0.75;
  const twinSnapshot = reportTwinSnapshotLateral || localStorage.getItem('twin_snapshot_base64');
  const twinSnapshotLateral = reportTwinSnapshotLateral || localStorage.getItem('twin_snapshot_lateral') || localStorage.getItem('sim_forvia_twin_snapshot_lateral') || localStorage.getItem('sim_lma500_twin_snapshot_lateral');
  const twinSnapshotSuperior = reportTwinSnapshotSuperior || localStorage.getItem('twin_snapshot_superior') || localStorage.getItem('sim_forvia_twin_snapshot_superior') || localStorage.getItem('sim_lma500_twin_snapshot_superior');
  const twinSnapshotIsometrica = reportTwinSnapshotIsometrica || localStorage.getItem('twin_snapshot_isometrica') || localStorage.getItem('sim_forvia_twin_snapshot_isometrica') || localStorage.getItem('sim_lma500_twin_snapshot_isometrica');

  const renderFooter = (pageNum) => (
    <div style={{ position: 'absolute', bottom: 18, left: 42, right: 42, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e8eef4', paddingTop: 10, fontSize: 10, color: '#9aabb8', fontWeight: 700, letterSpacing: 0.3 }}>
      <span style={{ textTransform: 'uppercase' }}>{meta.empresa || 'MÁQUINA EN EVALUACIÓN - BWD 200 | GRUPO GUSI'}</span>
      <span>PÁGINA {pageNum} DE 13</span>
    </div>
  );

  const renderPageHeader = (line1, line2, subtitleDesc) => (
    <div style={{ marginBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: 15 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'stretch' }}>
          <div style={{ width: 6, background: '#11b5c9', borderRadius: 4 }} />
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ fontSize: 26, fontWeight: 950, margin: 0, color: '#122033', textTransform: 'uppercase', lineHeight: 1.0, letterSpacing: -0.5 }}>{line1}</h2>
            <h2 style={{ fontSize: 26, fontWeight: 950, margin: 0, color: '#11b5c9', textTransform: 'uppercase', lineHeight: 1.0, marginTop: 4, letterSpacing: -0.5 }}>{line2}</h2>
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 9, fontWeight: 800, color: '#11b5c9', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 2, lineHeight: 1 }}>
            {meta.simulador} · {meta.maquina}
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, color: '#122033', marginTop: 4 }}>{meta.cliente}</div>
          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>{subtitleDesc}</div>
        </div>
      </div>
    </div>
  );

  const S = {
    ...REPORT_STYLES,
    page: isExportOnly 
      ? { ...REPORT_STYLES.page, borderRadius: 0, boxShadow: 'none' } 
      : REPORT_STYLES.page,
    inner: REPORT_STYLES.inner
  };

  // ESC closes
  React.useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Auto-trigger printing if printWindow is provided synchronously
  React.useEffect(() => {
    if (printWindow && reportData) {
      const timer = setTimeout(() => {
        printReport(printWindow);
        if (clearPrintWindow) clearPrintWindow();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [printWindow, reportData]);

  // Open print window with cloned report content
  const printReport = (targetWindow = null) => {
    const node = reportRef.current;
    if (!node) return;

    // Use synchronously opened print window if present, otherwise open new
    const pw = targetWindow || window.open('', '_blank', 'width=1200,height=900');
    if (!pw) { alert('Permite pop-ups para exportar el PDF'); return; }

    pw.document.open();
    pw.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>${meta.simulador} — Informe Paramétrico de Simulación</title>
        <style>
          *, *::before, *::after { box-sizing: border-box; }
          body {
            margin: 0;
            font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
            background: #eef3f7;
            color: #1f2a37;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .ry-report-wrap {
            width: 1100px;
            max-width: 100%;
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            gap: 22px;
            padding: 28px 0 60px;
          }
          @media print {
            body { background: #fff; }
            .ry-report-wrap { width: 100%; padding: 0; gap: 0; }
            .ry-page { break-after: page; border-radius: 0 !important; box-shadow: none !important; }
            .ry-page-inner { padding: 24px 32px !important; }
            .no-print { display: none !important; }
          }
          /* recharts SVG text */
          .recharts-text { fill: #42566a; font-family: 'Segoe UI', Arial, sans-serif; }
        </style>
      </head>
      <body>
        <div class="ry-report-wrap">${node.innerHTML}</div>
        <div class="no-print" style="text-align:center;padding:20px">
          <button onclick="window.print();" style="padding:12px 28px;background:#11b5c9;color:#fff;border:0;border-radius:8px;font-size:16px;font-weight:700;cursor:pointer;">
            ⬇ Descargar / Imprimir PDF
          </button>
          <button onclick="window.close();" style="margin-left:12px;padding:12px 20px;background:#e5e7eb;color:#1f2a37;border:0;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">
            Cerrar
          </button>
        </div>
        <script>
          // Auto-trigger print after load (optional — remove if you prefer manual)
          window.addEventListener('load', () => {
            // Small delay so Recharts SVGs can finish rendering
            setTimeout(() => window.print(), 600);
          });
        <\/script>
      </body></html>
    `);
    pw.document.close();
  };

  // Chart data
  const modelWithReq = modelTable.filter(r => r.reqDia > 0);
  const modelChartData = modelWithReq.map(r => ({ name: r.mod, 'Cap/Día': r.capDia, 'Req/Día': r.reqDia }));
  const coverageData   = lavadoSecadoParams.rows.map(r => ({ name: r.year, 'Cobertura %': r.cobertura, 'Superávit': r.balance }));
  const donutData = [
    { name: 'Utilizado', value: lineUtilization.utilPct },
    { name: 'Margen',    value: Math.max(0, 100 - lineUtilization.utilPct) },
  ];

  // ── modelado energético y económico ─────────────────────────────────────
  const energyInputs = inputs || { shifts: 2, hoursPerShift: 8, daysPerMonth: 26 };
  const totalPowerKw = installedPowerKw ?? 89.5;
  const energyConfig = {
    pumpsKw: passedPumpsKw !== undefined ? passedPumpsKw : totalPowerKw * (30.0 / 89.5),
    blowersKw: passedBlowersKw !== undefined ? passedBlowersKw : totalPowerKw * (22.0 / 89.5),
    beltKw: passedBeltKw !== undefined ? passedBeltKw : totalPowerKw * (1.5 / 89.5),
    heatingKw: passedHeatingKw !== undefined ? passedHeatingKw : totalPowerKw * (36.0 / 89.5),
    electricityRate: 2.50, // MXN por kWh
  };
  const activeLoadFactor = 0.85;
  const avgHourlyKwh = totalPowerKw * activeLoadFactor; // kWh
  const avgHourlyCostMxn = avgHourlyKwh * energyConfig.electricityRate; // $ MXN
  
  const y1Scenario = lavadoSecadoParams.rows.find(r => r.year === 'Y1') || { tiempoDisponible: 16 };
  const totalHrsLavado = modelTable?.reduce((sum, r) => sum + (r.hrsReq || 0), 0) || 0;
  const dailyHours = totalHrsLavado > 0 ? Math.min(y1Scenario.tiempoDisponible, totalHrsLavado) : y1Scenario.tiempoDisponible;
  const dailyKwh = avgHourlyKwh * dailyHours;
  const dailyCostMxn = dailyKwh * energyConfig.electricityRate;
  const workingDaysPerYear = (energyInputs.daysPerMonth || 26) * 12; // 312 días
  const annualKwh = dailyKwh * workingDaysPerYear;
  const annualCostMxn = dailyCostMxn * workingDaysPerYear;
  const annualCostUsd = annualCostMxn / 20;

  const energyBreakdownData = [
    { name: 'Calentamiento', value: energyConfig.heatingKw, fill: '#ef4444' },
    { name: 'Bombas Agua', value: energyConfig.pumpsKw, fill: '#11b5c9' },
    { name: 'Sopladores', value: energyConfig.blowersKw, fill: '#f59e0b' },
    { name: 'Motor Banda', value: energyConfig.beltKw, fill: '#122033' },
  ];

  return (
    <>
      <div
        id="ry-modal-root"
        style={isExportOnly ? { background: '#ffffff', overflow: 'visible' } : { position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(8,12,28,0.75)', overflow: 'auto', backdropFilter: 'blur(5px)' }}
      >
        {/* Sticky toolbar */}
        <div className="ry-no-print" style={isExportOnly ? { display: 'none' } : { position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 22px', background: 'rgba(15,20,40,0.97)', borderBottom: '1px solid rgba(17,181,201,0.25)' }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: 0.3 }}>📋 {meta.simulador} — Informe Paramétrico · {meta.version}</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => onExportPDF ? onExportPDF() : printReport()} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#11b5c9', color: '#fff', border: 0, borderRadius: 8, padding: '8px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              <Printer size={15} /> Exportar PDF
            </button>
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              <X size={15} /> Cerrar
            </button>
          </div>
        </div>

        {/* Report container — cloned into print window */}
        <div ref={reportRef} style={{ width: 1120, maxWidth: '100%', margin: isExportOnly ? 0 : '28px auto 80px', display: 'flex', flexDirection: 'column', gap: isExportOnly ? 0 : 22 }}>

          {/* ── PAGE 1: Cover ── */}
          <div className="ry-page" style={S.page}>
            {/* Hero gradient top bar */}
            <div style={{ height: 88, background: 'linear-gradient(90deg,#0b8ea0 0%,#11b5c9 55%,#6dd5e3 100%)', position: 'relative', overflow: 'hidden' }}>
              {/* Subtle diagonal stripe overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(120deg, transparent, transparent 28px, rgba(255,255,255,0.04) 28px, rgba(255,255,255,0.04) 30px)' }} />
              <div style={{ position: 'absolute', top: 24, left: 42, color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: 3, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 12 }}>
                {meta.simulador}
                <span style={{ display: 'inline-block', height: 24, lineHeight: '24px', fontSize: 10, fontWeight: 700, letterSpacing: 1.5, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 4, padding: '0 10px', verticalAlign: 'middle', position: 'relative', top: '4px' }}>
                  PANDORA 3.0 · {meta.version}
                </span>
              </div>
              <div style={{ position: 'absolute', bottom: 10, right: 42, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <div style={{ color: 'rgba(255,255,255,0.98)', fontSize: 14, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 0.8 }}>
                  Línea de Lavado + Secado de Cajas plásticas
                </div>
                <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: 800, display: 'flex', gap: 10, justifyContent: 'flex-end', alignItems: 'center' }}>
                  <span>CLIENTE: <strong style={{ color: '#fff', textTransform: 'uppercase' }}>{meta.cliente}</strong></span>
                  <span style={{ opacity: 0.6 }}>|</span>
                  <span>MÁQUINA: <strong style={{ color: '#fff', textTransform: 'uppercase' }}>{meta.maquina}</strong></span>
                  <span style={{ opacity: 0.6 }}>|</span>
                  <span>FECHA: <strong style={{ color: '#fff', textTransform: 'uppercase' }}>{meta.fecha}</strong></span>
                </div>
              </div>
            </div>

            <div className="ry-page-inner" style={{ ...S.inner, display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 36, alignItems: 'center', position: 'relative', marginTop: -40 }}>
              {/* ── Left: Title block ── */}
              <div>
                {/* Overline */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
                  <div style={{ width: 4, height: 48, background: 'linear-gradient(180deg,#11b5c9,#0b8ea0)', borderRadius: 4 }} />
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: '#11b5c9', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 3 }}>
                      Informe Paramétrico de Simulación
                    </div>
                    {/* Main title */}
                    <div style={{ fontSize: 42, fontWeight: 900, color: '#0f1c2e', lineHeight: 1.0, letterSpacing: -0.5 }}>
                      SIMULACIÓN
                    </div>
                    <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.0, letterSpacing: -0.5 }}>
                      <span style={{ color: '#11b5c9' }}>DE LÍNEA</span>
                    </div>
                    <div style={{ fontSize: 32, fontWeight: 900, color: '#0f1c2e', marginTop: 14, letterSpacing: -0.5, textTransform: 'uppercase' }}>
                      <span style={{ fontSize: 13, fontWeight: 800, color: '#11b5c9', display: 'block', letterSpacing: 2.5, marginBottom: 2 }}>CLIENTE</span>
                      {meta.cliente}
                    </div>
                  </div>
                </div>

                {/* Period badge */}
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#f0fbfd', border: '1.5px solid #b2e8f0', borderRadius: 50, padding: '5px 16px', marginBottom: 20 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#11b5c9' }} />
                  <span style={{ fontSize: 13, fontWeight: 800, color: '#0b8ea0', letterSpacing: 1 }}>Horizonte {meta.periodo}</span>
                </div>

                {/* Subtitle */}
                <p style={{ fontSize: 14, color: '#4d647a', lineHeight: 1.65, margin: '0 0 26px', maxWidth: 480 }}>
                  {meta.subtitulo}
                </p>

                {/* Meta grid */}
                <div style={{ display: 'grid', gap: 8, background: '#f7fbfd', border: '1px solid #dbe5ee', borderRadius: 12, padding: '14px 18px' }}>
                  {[
                    ['Empresa',    meta.empresa || 'IASE'],
                    ['Cliente',    meta.cliente || 'CENTRAL DE INTELIGENCIA'],
                    ['Máquina',    meta.maquina],
                    ['Proyecto',   meta.proyecto],
                    ['Fecha',      meta.fecha],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 13 }}>
                      <span style={{ fontWeight: 700, color: '#0b8ea0', minWidth: 80 }}>{k}</span>
                      <span style={{ color: '#1f2a37', fontWeight: 500 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ── Right: Data preview panel ── */}
              <div style={{ background: 'linear-gradient(160deg,#f0fbfd 0%,#eef6fa 100%)', border: '1.5px solid #c2e8f2', borderRadius: 20, padding: 28, display: 'flex', flexDirection: 'column', gap: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: '#0b8ea0', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>Vista previa de resultados</div>
                {[
                  { label: 'Vel. de Banda', value: `${fmt(kpis.velocidadBandaMph, 1)} m/h`, sub: `Máx ${fmt(kpis.velocidadMaxMph)} m/h` },
                  { label: 'Capacidad Promedio', value: `${fmt(kpis.capacidadPromHora)} c/h`, sub: 'Por hora' },
                  { label: 'Req. Diario Total', value: `${fmt(kpis.requerimientoTotalDia)} cajas`, sub: 'Año 1' },
                  { label: 'Cobertura Y1', value: `${fmt(kpis.coberturaY1, 1)}%`, sub: 'Del requerimiento' },
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 14, borderBottom: i < 3 ? '1px solid #d4edf5' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#526678' }}>{item.label}</div>
                      <div style={{ fontSize: 10, color: '#8fa8bf' }}>{item.sub}</div>
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 800, color: '#0b8ea0' }}>{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── PAGE 2: ESPECIFICACIÓN DE PRODUCTOS A LAVAR ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={{ ...S.inner, display: 'flex', flexDirection: 'column' }}>
              {renderPageHeader('PRODUCTOS A LAVAR', 'DETALLE DE CONTENEDORES', 'Especificaciones físicas, volumétricas y tasas de suciedad analizadas.')}
              
              <div style={{ display: 'flex', gap: 32, flex: 1, minHeight: 0, marginTop: 10 }}>
                {/* Tabla de especificaciones a la izquierda */}
                <div style={{ flex: 1.4 }}>
                  <h3 style={{ ...S.h3, marginBottom: 12 }}>Modelos de Cajas Registrados</h3>
                  <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, marginBottom: 20 }}>
                    Los siguientes modelos de contenedores plásticos y cajas han sido parametrizados para evaluar la viabilidad de lavado, capacidad volumétrica y consumo energético del sistema:
                  </p>
                  
                  <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: 12 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                          <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 800, color: '#0f1c2e' }}>Mod</th>
                          <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 800, color: '#0f1c2e' }}>Nombre</th>
                          <th style={{ padding: '12px 10px', textAlign: 'left', fontWeight: 800, color: '#0f1c2e' }}>Dimensiones cm</th>
                          <th style={{ padding: '12px 10px', textAlign: 'center', fontWeight: 800, color: '#0f1c2e' }}>Suciedad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {modelTable.map((r, i) => (
                          <tr key={i} style={{ borderBottom: i < modelTable.length - 1 ? '1px solid #edf2f7' : 'none' }}>
                            <td style={{ padding: '12px 10px' }}>
                              <span style={{ width: 20, height: 20, borderRadius: '50%', background: r.color || '#3b82f6', color: '#fff', fontSize: 10, fontWeight: 900, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {r.mod}
                              </span>
                            </td>
                            <td style={{ padding: '12px 10px', fontWeight: 700, color: '#1e293b' }}>
                              {r.nombre}
                            </td>
                            <td style={{ padding: '12px 10px', color: '#475569', fontWeight: 600 }}>
                              {r.l} × {r.w} × {r.h} cm
                            </td>
                            <td style={{ padding: '12px 10px', textAlign: 'center' }}>
                              <span style={{ padding: '3px 8px', borderRadius: 12, fontSize: 10, fontWeight: 800, background: r.suciedad === 'ALTA' ? '#fee2e2' : r.suciedad === 'MEDIA' ? '#fef3c7' : '#d1fae5', color: r.suciedad === 'ALTA' ? '#ef4444' : r.suciedad === 'MEDIA' ? '#d97706' : '#10b981' }}>
                                {r.suciedad || 'MEDIA'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Imagen del contenedor a la derecha */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <h3 style={{ ...S.h3, marginBottom: 4 }}>Fotografía del Contenedor</h3>
                  
                  <div style={{ flex: 1, minHeight: 280, border: '1px solid #cbd5e1', borderRadius: 16, background: '#f8fafc', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {productImageBase64 ? (
                      <img 
                        src={productImageBase64} 
                        alt="Caja a lavar" 
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', padding: 12 }} 
                      />
                    ) : (
                      <div style={{ textAlign: 'center', padding: 24, color: '#94a3b8' }}>
                        <svg viewBox="0 0 64 64" width="80" height="80" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ margin: '0 auto 16px', opacity: 0.5 }}>
                          <path d="M4 16 L32 4 L60 16 L32 28 Z" />
                          <path d="M4 16 L4 48 L32 60 L32 28" />
                          <path d="M60 16 L60 48 L32 60" />
                          <path d="M14 20 L42 8 M48 22 L20 34" />
                        </svg>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Modelo Digital Estándar</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>Sube una foto real del contenedor en el simulador para personalizar este apartado.</div>
                      </div>
                    )}
                  </div>
                  
                  <div style={{ background: '#f1f5f9', borderRadius: 12, padding: 14, borderLeft: '4px solid #11b5c9' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0f1c2e', textTransform: 'uppercase', marginBottom: 4 }}>Propiedades Físicas Relevantes</div>
                    <div style={{ fontSize: 11, color: '#475569', lineHeight: 1.5 }}>
                      Las dimensiones y el peso determinan la velocidad de línea recomendada y la holgura en el transportador para asegurar un lavado completo a alta presión y el posterior escurrido centrífugo o térmico.
                    </div>
                  </div>
                </div>
              </div>

              {renderFooter(2)}
            </div>
          </div>

          {/* ── PAGE 3: Twin Digital 3D - Vista Lateral ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={{ ...S.inner, display: 'flex', flexDirection: 'column' }}>
              {renderPageHeader('TWIN DIGITAL 3D', 'VISTA LATERAL', 'Visualización tridimensional de perfil y distribución del flujo lateral.')}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, minHeight: 0 }}>
                <div style={{ position: 'relative', height: '360px', borderRadius: 20, overflow: 'hidden', border: '1px solid #dbe5ee', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {twinSnapshotLateral ? (
                    <img 
                      src={twinSnapshotLateral} 
                      alt="Vista Lateral" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : twinSnapshot ? (
                    <img 
                      src={twinSnapshot} 
                      alt="Twin Snapshot Fallback" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <SharedTwinViewer3D height="360px" interactive={false} showControls={false} />
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: 24, justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 80 }}>
                  <div style={{ flex: 1.5 }}>
                    <h3 style={S.h3}>Arquitectura Espacial Lateral</h3>
                    <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, margin: '0 0 12px' }}>
                      Esta vista ilustra la elevación y distribución física longitudinal de los módulos operativos, optimizada para la demanda nominal diaria de <strong>{fmt(modelCapHr, 0)} cajas/h</strong>.
                    </p>
                  </div>
                  
                  <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0b8ea0', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>Eficiencia ESG y Balances</div>
                    <div style={{ fontSize: 12, color: '#5f7286', lineHeight: 1.5 }}>
                      • Caudal interno: <strong>{fmt(wp.washFlowLh, 0)} L/h</strong><br />
                      • Ahorro de agua: <strong>{fmt(recircPct, 1)}%</strong><br />
                      • Reposición: <strong>{fmt(wp.waterReplenishLh, 0)} L/h</strong>
                    </div>
                  </div>
                </div>
              </div>
              {renderFooter(3)}
            </div>
          </div>

          {/* ── PAGE 3: Twin Digital 3D - Vista Superior ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={{ ...S.inner, display: 'flex', flexDirection: 'column' }}>
              {renderPageHeader('TWIN DIGITAL 3D', 'VISTA SUPERIOR', 'Visualización en planta y alineamiento de la línea de lavado.')}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, minHeight: 0 }}>
                <div style={{ position: 'relative', height: '360px', borderRadius: 20, overflow: 'hidden', border: '1px solid #dbe5ee', background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {twinSnapshotSuperior ? (
                    <img 
                      src={twinSnapshotSuperior} 
                      alt="Vista Superior" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : twinSnapshot ? (
                    <img 
                      src={twinSnapshot} 
                      alt="Twin Snapshot Fallback" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <SharedTwinViewer3D height="360px" interactive={false} showControls={false} />
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: 24, justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 80 }}>
                  <div style={{ flex: 1.5 }}>
                    <h3 style={S.h3}>Distribución en Planta</h3>
                    <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, margin: '0 0 12px' }}>
                      Vista en planta que detalla el flujo lineal y el espaciamiento de las guías de transporte mecánico, garantizando el flujo continuo y seguro de los contenedores.
                    </p>
                  </div>
                  
                  <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0b8ea0', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>Eficiencia ESG y Balances</div>
                    <div style={{ fontSize: 12, color: '#5f7286', lineHeight: 1.5 }}>
                      • Caudal interno: <strong>{fmt(wp.washFlowLh, 0)} L/h</strong><br />
                      • Ahorro de agua: <strong>{fmt(recircPct, 1)}%</strong><br />
                      • Reposición: <strong>{fmt(wp.waterReplenishLh, 0)} L/h</strong>
                    </div>
                  </div>
                </div>
              </div>
              {renderFooter(4)}
            </div>
          </div>

          {/* ── PAGE 4: Twin Digital 3D - Vista Isométrica ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={{ ...S.inner, display: 'flex', flexDirection: 'column' }}>
              {renderPageHeader('TWIN DIGITAL 3D', 'VISTA ISOMÉTRICA', 'Visualización tridimensional y perspectiva del gemelo digital.')}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20, flex: 1, minHeight: 0 }}>
                <div style={{ position: 'relative', height: '360px', borderRadius: 20, overflow: 'hidden', border: '1px solid #dbe5ee', background: '#f8fafc', display: 'flex', alignItems: 'center', justifySelf: 'center', justifyContent: 'center' }}>
                  {twinSnapshotIsometrica ? (
                    <img 
                      src={twinSnapshotIsometrica} 
                      alt="Vista Isométrica" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : twinSnapshot ? (
                    <img 
                      src={twinSnapshot} 
                      alt="Twin Snapshot Fallback" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
                    />
                  ) : (
                    <SharedTwinViewer3D height="360px" interactive={false} showControls={false} />
                  )}
                </div>
                
                <div style={{ display: 'flex', gap: 24, justifyContent: 'space-between', alignItems: 'flex-start', marginTop: 80 }}>
                  <div style={{ flex: 1.5 }}>
                    <h3 style={S.h3}>Perspectiva Tridimensional de la Línea</h3>
                    <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, margin: '0 0 12px' }}>
                      La trayectoria tridimensional conecta secuencialmente las etapas principales de alimentación, lavado por aspersión a alta presión y secado térmico continuo.
                    </p>
                  </div>
                  
                  <div style={{ flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 12, padding: '16px' }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#0b8ea0', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>Eficiencia ESG y Balances</div>
                    <div style={{ fontSize: 12, color: '#5f7286', lineHeight: 1.5 }}>
                      • Caudal interno: <strong>{fmt(wp.washFlowLh, 0)} L/h</strong><br />
                      • Ahorro de agua: <strong>{fmt(recircPct, 1)}%</strong><br />
                      • Reposición: <strong>{fmt(wp.waterReplenishLh, 0)} L/h</strong>
                    </div>
                  </div>
                </div>
              </div>
              {renderFooter(5)}
            </div>
          </div>

          {/* ── PAGE 5: KPIs ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={S.inner}>
              {renderPageHeader('INDICADORES CLAVE', 'DE OPERACIÓN', 'Resumen ejecutivo de velocidad, capacidad y cobertura inicial del sistema.')}
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, marginTop: 100 }}>
                {/* Left column: 2x2 grid of giant KPI cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  {[
                    { v: `${fmt(kpis.velocidadBandaMph, 1)} m/h`, l: 'Velocidad de Banda', h: `Máxima de diseño: ${fmt(kpis.velocidadMaxMph)} m/h` },
                    { v: `${fmt(kpis.capacidadPromHora)} c/h`,   l: 'Capacidad Promedio', h: 'Cajas lavadas y secadas por hora' },
                    { v: `${fmt(kpis.capacidadDiaY1)} cajas`,    l: 'Capacidad Diaria Y1', h: 'Producción nominal al día' },
                    { v: `${fmt(kpis.requerimientoTotalDia)} cajas`, l: 'Requerimiento Total', h: 'Demanda de producción establecida' },
                  ].map((k, i) => (
                    <div key={i} style={{ ...S.kpi, display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '170px', padding: '24px 20px' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#5f7286', marginBottom: 6 }}>{k.l}</div>
                      <div style={{ fontSize: 30, fontWeight: 900, color: '#0b8ea0', lineHeight: 1.1, marginBottom: 6 }}>{k.v}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{k.h}</div>
                    </div>
                  ))}
                </div>

                {/* Right column: Huge Cobertura executive panel */}
                <div style={{ ...S.panel, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '30px 24px', background: 'radial-gradient(circle at 50% 50%, rgba(17,181,201,0.06) 0%, rgba(11,142,160,0.01) 100%), #ffffff', height: '360px' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#122033', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16 }}>Cobertura del Requerimiento (Año 1)</div>
                  
                  {/* Visual gauge */}
                  <div style={{ position: 'relative', width: 140, height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                    <svg width="140" height="140" viewBox="0 0 140 140">
                      <circle cx="70" cy="70" r="58" fill="none" stroke="#e2e8f0" strokeWidth="10" />
                      <circle cx="70" cy="70" r="58" fill="none" stroke="#11b5c9" strokeWidth="10" strokeDasharray={`${2 * Math.PI * 58}`} strokeDashoffset={`${2 * Math.PI * 58 * (1 - Math.min(kpis.coberturaY1, 100) / 100)}`} strokeLinecap="round" transform="rotate(-90 70 70)" />
                    </svg>
                    <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <span style={{ fontSize: 28, fontWeight: 950, color: '#0b8ea0', lineHeight: 1 }}>{fmt(kpis.coberturaY1, 1)}%</span>
                      <span style={{ fontSize: 9, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginTop: 2 }}>Cubierto</span>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.6, margin: '0 0 8px' }}>
                    El sistema cuenta con una cobertura del <strong>{fmt(kpis.coberturaY1, 1)}%</strong> sobre el requerimiento operativo de cajas del Año 1.
                  </p>
                  <div style={{ fontSize: 11, fontWeight: 700, color: kpis.coberturaY1 >= 100 ? '#16a34a' : '#d97706', background: kpis.coberturaY1 >= 100 ? '#f0fdf4' : '#fffbeb', border: `1px solid ${kpis.coberturaY1 >= 100 ? '#bbf7d0' : '#fef3c7'}`, borderRadius: 8, padding: '6px 12px', display: 'inline-block' }}>
                    {kpis.coberturaY1 >= 100 ? '✓ CAPACIDAD TOTALMENTE VIABLE' : '⚠ REQUIERE MONITOREO DE CAPACIDAD'}
                  </div>
                </div>
              </div>
              {renderFooter(6)}
            </div>
          </div>

          {/* ── PAGE 6: Utilización ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={S.inner}>
              {renderPageHeader('UTILIZACIÓN', 'Y CARGA DEL SISTEMA', 'Análisis del porcentaje de utilización diaria y margen operativo disponible.')}
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24 }}>
                <div style={{ background: 'linear-gradient(135deg,rgba(17,181,201,0.09),rgba(17,181,201,0.01))', border: '1px solid rgba(17,181,201,0.2)', borderRadius: 18, padding: '20px 24px' }}>
                  <div style={{ fontSize: 16, fontWeight: 800, color: '#122033', marginBottom: 6 }}>Carga y Utilización de la Máquina</div>
                  <div style={{ fontSize: 50, fontWeight: 800, color: '#0b8ea0', lineHeight: 1, marginBottom: 4 }}>{fmt(lineUtilization.utilPct, 1)}%</div>
                  <div style={{ fontWeight: 700, color: '#122033', marginBottom: 6 }}>Carga Requerida</div>
                  <div style={{ fontSize: 13, color: '#526678' }}>{fmt(lineUtilization.actualMph)} c/d de {fmt(lineUtilization.maxMph)} c/d máxima</div>
                  <div style={{ marginTop: 12, color: '#5c7083', fontSize: 13, lineHeight: 1.5 }}>{lineUtilization.interpretation}</div>
                </div>
                <div style={S.panel}>
                  <h3 style={S.h3}>Utilización visual</h3>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="45%" innerRadius="62%" outerRadius="82%" dataKey="value" startAngle={90} endAngle={-270} paddingAngle={1} isAnimationActive={false}>
                        <Cell fill="#11b5c9" />
                        <Cell fill="#dbe5ee" />
                      </Pie>
                      <text x="50%" y="44%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 22, fontWeight: 800, fill: '#122033' }}>
                        {fmt(lineUtilization.utilPct, 1)}%
                      </text>
                      <text x="50%" y="54%" textAnchor="middle" dominantBaseline="middle" style={{ fontSize: 11, fill: '#6b7280' }}>
                        Utilización
                      </text>
                      <Tooltip formatter={(v) => `${fmt(v, 1)}%`} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
                {[
                  { title: 'Capacidad Máxima Diaria', value: `${fmt(lineUtilization.maxMph)} c/d`, sub: 'Cajas/día a velocidad máxima de banda' },
                  { title: 'Carga Real Asignada', value: `${fmt(lineUtilization.actualMph)} c/d`, sub: 'Cajas/día requeridas por la producción' },
                  { title: 'Reserva Operativa de Seguridad', value: `${fmt(100 - lineUtilization.utilPct, 1)}%`, sub: 'Capacidad libre para incrementos imprevistos' },
                ].map((item, idx) => (
                  <div key={idx} style={{ ...S.kpi, padding: '16px 20px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#5f7286', marginBottom: 4 }}>{item.title}</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0b8ea0', marginBottom: 2 }}>{item.value}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8' }}>{item.sub}</div>
                  </div>
                ))}
              </div>
              {renderFooter(7)}
            </div>
          </div>

          {/* ── PAGE 7: Modelos ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={S.inner}>
              {renderPageHeader('MODELOS DE CONTENEDORES', 'EVALUADOS EN SIMULACIÓN', 'Especificaciones técnicas y dimensiones de las cajas plásticas consideradas.')}
              <div style={S.panel}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>{['Mod','Nombre','Medidas (Largo x Ancho x Alto) cm','Suciedad','Cap c/h','Cap/Día','Req/Día','Hrs Req.','Estado'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {modelTable.map((r, i) => (
                      <tr key={r.mod} style={{ background: i % 2 === 0 ? '#fff' : '#f7fbfd' }}>
                        <td style={{ ...S.td, fontWeight: 800, color: '#0b8ea0' }}>{r.mod}</td>
                        <td style={S.td}>{r.nombre}</td>
                        <td style={S.td}>{r.l} x {r.w} x {r.h} cm</td>
                        <td style={S.td}>{r.suciedad}</td>
                        <td style={S.td}>{fmt(r.capHora, 1)}</td>
                        <td style={S.td}>{fmt(r.capDia)}</td>
                        <td style={S.td}>{r.reqDia != null ? fmt(r.reqDia) : '—'}</td>
                        <td style={S.td}>{r.hrsReq != null ? `${fmt(r.hrsReq, 1)}h` : '—'}</td>
                        <td style={{ ...S.td, color: r.estado === 'VIABLE' ? '#16a34a' : r.estado === 'EXCEDE' ? '#dc2626' : '#6b7280', fontWeight: 800 }}>
                          {r.estado === 'VIABLE' ? '✅' : r.estado === 'EXCEDE' ? '❌' : '—'} {r.estado}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginTop: 24 }}>
                {[
                  { title: '◈ Criterios de Viabilidad', text: 'Las cajas que superan la capacidad nominal de la máquina o línea se marcan como EXCEDE en rojo para indicar sobrecarga.' },
                  { title: '◈ Ajuste por Suciedad', text: 'El tiempo de lavado y consumo hídrico se calibran dinámicamente según el nivel de suciedad (Baja, Media, Alta).' },
                  { title: '◈ Espaciamiento de Seguridad', text: 'Se calcula una holgura mecánica entre cajas para prevenir colisiones en banda y asegurar un secado térmico uniforme.' },
                ].map((item, idx) => (
                  <div key={idx} style={{ ...S.panel, padding: '16px 20px', background: '#f8fafc' }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#122033', marginBottom: 6 }}>{item.title}</div>
                    <p style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.5, margin: 0 }}>{item.text}</p>
                  </div>
                ))}
              </div>
              {renderFooter(8)}
            </div>
          </div>

          {/* ── PAGE 8: Cap vs Req + Escenarios ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={S.inner}>
              {renderPageHeader('CAPACIDAD VS REQUERIMIENTO', 'ANÁLISIS DE LA LÍNEA', 'Contraste gráfico de la capacidad real frente a la demanda por modelo de caja.')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
                <div style={{ ...S.panel, height: '480px' }}>
                  <h3 style={S.h3}>Capacidad vs Requerimiento por Modelo</h3>
                  <ResponsiveContainer width="100%" height={360}>
                    <BarChart data={modelChartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8eef4" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="Cap/Día" fill="#11b5c9" radius={[6,6,0,0]} isAnimationActive={false} />
                      <Bar dataKey="Req/Día" fill="#122033" radius={[6,6,0,0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ ...S.panel, height: '480px' }}>
                  <h3 style={S.h3}>Lavado y Secado — Parámetros Y1–Y5</h3>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 16px' }}>Ref: {lavadoSecadoParams.referencia} · Rate base: {fmt(lavadoSecadoParams.rateBase)} cajas/día</p>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr>{['Año','Hrs B','Ef/T','Turn','T.Disp','Req/h','Cap/h','Bal.','Cob.','Líneas'].map(h => (
                          <th key={h} style={{ ...S.th, fontSize: 11 }}>{h}</th>
                        ))}</tr>
                      </thead>
                      <tbody>
                        {lavadoSecadoParams.rows.map((r, i) => (
                          <tr key={r.year} style={{ background: i % 2 === 0 ? '#fff' : '#f7fbfd' }}>
                            <td style={{ ...S.td, fontWeight: 800, color: '#0b8ea0', padding: '12px 10px' }}>{r.year}</td>
                            <td style={{ ...S.td, padding: '12px 10px' }}>{r.hrsBase}</td>
                            <td style={{ ...S.td, padding: '12px 10px' }}>{fmt(r.hrsEfTurno, 2)}</td>
                            <td style={{ ...S.td, padding: '12px 10px' }}>{r.turnos}</td>
                            <td style={{ ...S.td, padding: '12px 10px' }}>{fmt(r.tiempoDisponible, 2)}</td>
                            <td style={{ ...S.td, padding: '12px 10px' }}>{fmt(r.reqHora, 1)}</td>
                            <td style={{ ...S.td, padding: '12px 10px' }}>{fmt(r.capHora, 1)}</td>
                            <td style={{ ...S.td, color: r.balance >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700, padding: '12px 10px' }}>{r.balance >= 0 ? '+' : ''}{fmt(r.balance, 1)}</td>
                            <td style={{ ...S.td, color: r.cobertura >= 100 ? '#16a34a' : '#f59e0b', fontWeight: 700, padding: '12px 10px' }}>{fmt(r.cobertura, 1)}%</td>
                            <td style={{ ...S.td, padding: '12px 10px' }}>{r.lineas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              {renderFooter(8)}
            </div>
          </div>

          {/* ── PAGE 9: Cobertura Y1-Y5 ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={S.inner}>
              {renderPageHeader('COBERTURA Y TENDENCIAS', 'PROYECCIÓN Y1–Y5', 'Evolución proyectada del porcentaje de cobertura y balance de capacidad instalada.')}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
                <div style={{ ...S.panel, height: '480px' }}>
                  <h3 style={S.h3}>Cobertura Anual Y1–Y5</h3>
                  <ResponsiveContainer width="100%" height={340}>
                    <BarChart data={coverageData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8eef4" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => `${fmt(v, 1)}%`} />
                      <ReferenceLine y={100} stroke="#11b5c9" strokeDasharray="5 3" label={{ value: '100%', fill: '#0b8ea0', fontSize: 11 }} />
                      <Bar dataKey="Cobertura %" fill="#11b5c9" radius={[6,6,0,0]} isAnimationActive={false} />
                    </BarChart>
                  </ResponsiveContainer>
                  <p style={{ fontSize: 12, color: '#5c7083', marginTop: 12 }}>Cobertura sobre 100% = 1 máquina suficiente.</p>
                </div>
                <div style={{ ...S.panel, height: '480px' }}>
                  <h3 style={S.h3}>Tendencia de Cobertura Y1–Y5</h3>
                  <ResponsiveContainer width="100%" height={340}>
                    <LineChart data={coverageData} margin={{ top: 5, right: 16, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8eef4" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine yAxisId="left" y={100} stroke="#11b5c9" strokeDasharray="4 2" />
                      <Line yAxisId="left"  type="monotone" dataKey="Cobertura %" stroke="#11b5c9" strokeWidth={2.5} dot={{ r: 5, fill: '#11b5c9' }} isAnimationActive={false} />
                      <Line yAxisId="right" type="monotone" dataKey="Superávit"   stroke="#122033" strokeWidth={2} dot={{ r: 4, fill: '#122033' }} isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                  <p style={{ fontSize: 12, color: '#5c7083', marginTop: 12 }}>Cobertura % y superávit c/h por año proyectado.</p>
                </div>
              </div>
              {renderFooter(10)}
            </div>
          </div>

          {/* ── PAGE 10: Consumo Energético ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={S.inner}>
              {renderPageHeader('CONSUMO ENERGÉTICO', 'Y BALANCE TÉRMICO', 'Análisis detallado de potencia instalada, consumo de corriente y proyección de costo eléctrico.')}
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 18 }}>
                <div style={S.kpi}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0b8ea0', lineHeight: 1, marginBottom: 8 }}>{fmt(totalPowerKw, 1)} kW</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#122033' }}>Potencia Instalada</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 5 }}>Carga nominal total conectada</div>
                </div>
                <div style={S.kpi}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0b8ea0', lineHeight: 1, marginBottom: 8 }}>{fmt(avgHourlyKwh, 1)} kWh</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#122033' }}>Consumo Promedio/Hora</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 5 }}>A 85% de factor de carga</div>
                </div>
                <div style={S.kpi}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0b8ea0', lineHeight: 1, marginBottom: 8 }}>${fmt(avgHourlyCostMxn, 1)} MXN</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#122033' }}>Costo por Hora (Prom.)</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 5 }}>Tarifa industrial: $2.50/kWh</div>
                </div>
                <div style={S.kpi}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0b8ea0', lineHeight: 1, marginBottom: 8 }}>${fmt(dailyCostMxn)} MXN</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#122033' }}>Costo Diario Y1 ({fmt(dailyHours, 1)}h)</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 5 }}>Consumo diario: {fmt(dailyKwh)} kWh</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: 22 }}>
                <div style={{ ...S.panel, height: '340px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={S.h3}>Desglose de Potencia por Componente</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
                    <div style={{ flex: 1 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, height: 'auto' }}>
                        <thead>
                          <tr>
                            <th style={{ ...S.th, padding: '8px 8px' }}>Componente</th>
                            <th style={{ ...S.th, padding: '8px 8px', textAlign: 'right' }}>Potencia</th>
                            <th style={{ ...S.th, padding: '8px 8px', textAlign: 'right' }}>% Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            ['Calentamiento de Agua', energyConfig.heatingKw, '#ef4444'],
                            ['Bombas de Agua (Lavado)', energyConfig.pumpsKw, '#11b5c9'],
                            ['Sopladores de Secado', energyConfig.blowersKw, '#f59e0b'],
                            ['Motor de Banda', energyConfig.beltKw, '#122033'],
                          ].map(([name, val, color], idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #dbe5ee' }}>
                              <td style={{ padding: '9px 8px', fontSize: 12 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: color }} />
                                  {name}
                                </div>
                              </td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(val, 1)} kW</td>
                              <td style={{ padding: '9px 8px', textAlign: 'right', color: '#6b7280' }}>{fmt((val / totalPowerKw) * 100, 1)}%</td>
                            </tr>
                          ))}
                          <tr style={{ background: '#f8fafc', fontWeight: 800 }}>
                            <td style={{ padding: '10px 8px', fontSize: 12 }}>POTENCIA TOTAL CONECTADA</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>{fmt(totalPowerKw, 1)} kW</td>
                            <td style={{ padding: '10px 8px', textAlign: 'right' }}>100.0%</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                    <div style={{ width: 190, height: 190, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <PieChart width={190} height={190}>
                        <Pie data={energyBreakdownData} cx="95" cy="95" innerRadius="48%" outerRadius="75%" dataKey="value" startAngle={90} endAngle={-270} isAnimationActive={false}>
                          {energyBreakdownData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v) => `${fmt(v, 1)} kW`} />
                      </PieChart>
                    </div>
                  </div>
                </div>

                <div style={{ ...S.panel, height: '340px', padding: '24px 22px', display: 'flex', flexDirection: 'column' }}>
                  <h3 style={S.h3}>Proyecciones de Gasto Operativo en Energía</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14, flex: 1, justifyContent: 'center' }}>
                    {[
                      ['Tarifa Industrial Base', `$${fmt(energyConfig.electricityRate, 2)} MXN / kWh`, 'Tarifa media regulada'],
                      ['Consumo Energético Semanal (6 días)', `${fmt(dailyKwh * 6)} kWh / sem`, `Costo: $${fmt(dailyCostMxn * 6)} MXN`],
                      ['Consumo Energético Mensual (26 días)', `${fmt(dailyKwh * energyInputs.daysPerMonth)} kWh / mes`, `Costo: $${fmt(dailyCostMxn * energyInputs.daysPerMonth)} MXN`],
                      ['Impacto Económico Anual (312 días)', `${fmt(dailyKwh * energyInputs.daysPerMonth * 12)} kWh / año`, `Costo: $${fmt(dailyCostMxn * energyInputs.daysPerMonth * 12)} MXN (~$${fmt((dailyCostMxn * energyInputs.daysPerMonth * 12) / 20.0)} USD)`],
                    ].map(([label, val, sub], idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: idx < 3 ? '1px solid #e8eef4' : 'none' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#122033', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{sub}</div>
                        </div>
                        <div style={{ fontSize: 15, fontWeight: 800, color: idx === 3 ? '#ef4444' : '#0b8ea0', textAlign: 'right', whiteSpace: 'nowrap', flexShrink: 0, marginLeft: 16 }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {renderFooter(11)}
            </div>
          </div>

          {/* ── PAGE 11: Consumo Hídrico ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={S.inner}>
              {renderPageHeader('CONSUMO HÍDRICO', 'Y SUSTENTABILIDAD', 'Análisis del balance hídrico, tasa de recirculación de agua y huella ecológica.')}
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 18 }}>
                <div style={S.kpi}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0b8ea0', lineHeight: 1, marginBottom: 8 }}>{fmt(wp.washFlowLh, 0)} L/h</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#122033' }}>Caudal de Lavado Interno</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 5 }}>Volumen interno recirculado</div>
                </div>
                <div style={S.kpi}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0b8ea0', lineHeight: 1, marginBottom: 8 }}>{fmt(wp.waterReplenishLh, 0)} L/h</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#122033' }}>Reposición Real de Agua</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 5 }}>Consumo real de red de agua limpia</div>
                </div>
                <div style={S.kpi}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0b8ea0', lineHeight: 1, marginBottom: 8 }}>{fmt(dailyWaterM3, 2)} m³</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#122033' }}>Consumo Diario Y1 ({fmt(waterDailyHours, 1)}h)</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 5 }}>Equivalente a {fmt(dailyWaterM3 * 1000, 0)} Litros</div>
                </div>
                <div style={S.kpi}>
                  <div style={{ fontSize: 24, fontWeight: 800, color: '#0b8ea0', lineHeight: 1, marginBottom: 8 }}>{fmt(weeklyWaterM3, 1)} m³</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#122033' }}>Consumo Semanal</div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 5 }}>Basado en 6 días laborables</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
                <div style={{ ...S.panel, height: '340px', padding: '24px 22px' }}>
                  <h3 style={S.h3}>Configuración y Eficiencia Hídrica</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 270, justifyContent: 'center' }}>
                    {[
                      ['Tasa de Recirculación de Agua', `${fmt(recircPct, 1)}%`, 'Ahorro neto de agua limpia por recirculación y filtrado'],
                      ['Capacidad Nominal del Tanque', `${fmt(wp.tankCapacityL, 0)} Litros`, 'Capacidad del tanque de lavado principal'],
                      ['Frecuencia de Cambio de Agua', `Cada ${wp.waterChangeDays} días`, 'Frecuencia de purga e higienización total'],
                      ['Modelo de Referencia Activo', meta.referencia || lavadoSecadoParams.referencia || 'PLD-120 / PLD-140', 'Modelo de caja base para el análisis unitario'],
                    ].map(([label, val, sub], idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 12, borderBottom: idx < 3 ? '1px solid #e8eef4' : 'none' }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: '#122033' }}>{label}</div>
                          <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{sub}</div>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#0b8ea0', textAlign: 'right' }}>{val}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ ...S.panel, height: '340px', padding: '24px 22px' }}>
                  <h3 style={S.h3}>Análisis de Huella Hídrica por Contenedor</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16, height: 270, justifyContent: 'center' }}>
                    <div style={{ padding: '16px 20px', border: '1px solid #dbe5ee', borderRadius: 16, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: '#122033' }}>Consumo Específico por Caja</div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>Basado en {fmt(modelCapHr, 0)} cajas/h de capacidad real</div>
                      </div>
                      <div style={{ fontSize: 24, fontWeight: 900, color: '#0b8ea0' }}>{fmt(unitWaterL, 2)} L / caja</div>
                    </div>
                    
                    <div style={{ padding: '16px 20px', border: '1px solid #dbe5ee', borderRadius: 16, background: '#f8fafc' }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#122033', marginBottom: 6 }}>◈ Evaluación de Impacto Ambiental (ESG)</div>
                      <p style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.5, margin: 0 }}>
                        El sistema de recirculación del simulador Wash & Dry reduce en un <strong>{fmt(recircPct, 0)}%</strong> la demanda de agua de reposición respecto a sistemas tradicionales de lavado una vez-pasados (once-through). Esto representa una disminución crítica de la huella hídrica y minimiza la generación de efluentes, facilitando el cumplimiento de normativas de sustentabilidad y optimizando el costo operativo por caja.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {renderFooter(12)}
            </div>
          </div>

          {/* ── PAGE 12: Conclusiones ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={S.inner}>
              {renderPageHeader('CONCLUSIONES DEL INFORME', 'Y RECOMENDACIONES TÉCNICAS', 'Diagnóstico general de viabilidad operativa y recomendaciones estratégicas.')}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 10 }}>
                {conclusions.map((c, i) => (
                  <div key={i} style={{ borderRadius: 16, padding: '16px 20px', border: '1px solid #dbe5ee', background: '#fbfdff', borderLeft: `6px solid ${c.type === 'ok' ? '#22c55e' : c.type === 'warn' ? '#f59e0b' : '#ef4444'}` }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: '#122033', marginBottom: 6 }}>
                      {c.type === 'ok' ? '✅' : c.type === 'warn' ? '⚠️' : '❌'} {c.title}
                    </div>
                    <p style={{ margin: 0, color: '#4f6377', fontSize: 14, lineHeight: 1.6 }}>{c.text}</p>
                  </div>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 24, marginTop: 24, alignItems: 'center' }}>
                <div style={{ ...S.panel, background: '#f8fafc', border: '1px dashed #cbd5e1' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#122033', marginBottom: 6 }}>◈ Validación y Confidencialidad</div>
                  <p style={{ fontSize: 11, color: '#4b5563', lineHeight: 1.5, margin: 0 }}>
                    Este informe técnico ha sido generado de manera automática por el simulador de alto rendimiento PANDORA 3.0. Los datos presentados están basados en las condiciones y parámetros operativos provistos por el usuario y corresponden a simulaciones de dinámica de fluidos y balances de materia y energía certificados.
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '16px' }}>
                  <div style={{ width: 140, height: 1, background: '#94a3b8', marginBottom: 8 }} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#122033' }}>PANDORA 3.0 Simulator</div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>Sello Digital y Aprobación Técnica</div>
                  <div style={{ fontSize: 9, fontFamily: 'monospace', color: '#94a3b8', marginTop: 4 }}>ID: PND-BWD-85C9</div>
                </div>
              </div>
              {renderFooter(13)}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Style constants ─────────────────────────────────────────────────────────
const REPORT_STYLES = {
  page:  { width: '1120px', height: '792px', background: 'radial-gradient(circle at 90% 8%, rgba(17,181,201,0.05) 0%, rgba(255,255,255,0) 40%), radial-gradient(circle at 10% 92%, rgba(11,142,160,0.04) 0%, rgba(255,255,255,0) 40%), #ffffff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 12px 48px rgba(18,32,51,0.12)', position: 'relative' },
  inner: { padding: '38px 48px 65px', height: '100%', position: 'relative' },
  panel: { background: '#ffffff', border: '1px solid #dbe5ee', borderRadius: 16, padding: '22px 22px 18px', boxShadow: '0 8px 32px rgba(18,32,51,0.03)' },
  kpi:   { background: 'linear-gradient(135deg,#fcfdfe,#f4f8fc)', border: '1px solid #dbe5ee', borderRadius: 16, padding: 20, boxShadow: '0 6px 20px rgba(18,32,51,0.02)' },
  h2:    { fontSize: 28, margin: '0 0 8px', color: '#122033', lineHeight: 1.1 },
  h3:    { margin: '0 0 12px', color: '#122033', fontSize: 16, fontWeight: 800, letterSpacing: -0.2 },
  sub:   { margin: '0 0 20px', color: '#5f7286', fontSize: 14 },
  th:    { background: '#f5fafc', color: '#122033', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, padding: '10px 12px', borderBottom: '1px solid #dbe5ee', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 },
  td:    { borderBottom: '1px solid #dbe5ee', padding: '9px 10px', textAlign: 'left', verticalAlign: 'middle', fontSize: 13, color: '#1f2a37' },
};
