import React from 'react';
import { X, Printer } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell, ReferenceLine
} from 'recharts';

const fmt = (v, d = 0) =>
  new Intl.NumberFormat('es-MX', { minimumFractionDigits: d, maximumFractionDigits: d }).format(v ?? 0);

export default function RyderReportModal({ reportData, onClose }) {
  const reportRef = React.useRef(null);

  // ESC closes
  React.useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  // Open print window with cloned report content
  const printReport = () => {
    const node = reportRef.current;
    if (!node) return;

    const pw = window.open('', '_blank', 'width=1200,height=900');
    if (!pw) { alert('Permite pop-ups para exportar el PDF'); return; }

    pw.document.write(`
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>RYDER — Informe Paramétrico de Simulación</title>
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

  if (!reportData) return null;
  const { meta, kpis, lineUtilization, modelTable, lavadoSecadoParams, conclusions } = reportData;

  // Chart data
  const modelWithReq = modelTable.filter(r => r.reqDia > 0);
  const modelChartData = modelWithReq.map(r => ({ name: r.mod, 'Cap/Día': r.capDia, 'Req/Día': r.reqDia }));
  const coverageData   = lavadoSecadoParams.rows.map(r => ({ name: r.year, 'Cobertura %': r.cobertura, 'Superávit': r.balance }));
  const donutData = [
    { name: 'Utilizado', value: lineUtilization.utilPct },
    { name: 'Margen',    value: Math.max(0, 100 - lineUtilization.utilPct) },
  ];

  return (
    <>
      <div
        id="ry-modal-root"
        style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(8,12,28,0.75)', overflow: 'auto', backdropFilter: 'blur(5px)' }}
      >
        {/* Sticky toolbar */}
        <div className="ry-no-print" style={{ position: 'sticky', top: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 22px', background: 'rgba(15,20,40,0.97)', borderBottom: '1px solid rgba(17,181,201,0.25)' }}>
          <span style={{ fontWeight: 800, fontSize: 15, color: '#fff', letterSpacing: 0.3 }}>📋 RYDER — Informe Paramétrico · {meta.version}</span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={printReport} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#11b5c9', color: '#fff', border: 0, borderRadius: 8, padding: '8px 18px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              <Printer size={15} /> Exportar PDF
            </button>
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, padding: '8px 14px', fontWeight: 700, cursor: 'pointer', fontSize: 14 }}>
              <X size={15} /> Cerrar
            </button>
          </div>
        </div>

        {/* Report container — cloned into print window */}
        <div ref={reportRef} style={{ width: 1120, maxWidth: 'calc(100vw - 32px)', margin: '28px auto 80px', display: 'flex', flexDirection: 'column', gap: 22 }}>

          {/* ── PAGE 1: Cover ── */}
          <div className="ry-page" style={S.page}>
            {/* Hero gradient top bar */}
            <div style={{ height: 88, background: 'linear-gradient(90deg,#0b8ea0 0%,#11b5c9 55%,#6dd5e3 100%)', position: 'relative', overflow: 'hidden' }}>
              {/* Subtle diagonal stripe overlay */}
              <div style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(120deg, transparent, transparent 28px, rgba(255,255,255,0.04) 28px, rgba(255,255,255,0.04) 30px)' }} />
              <div style={{ position: 'absolute', top: 24, left: 42, color: '#fff', fontWeight: 800, fontSize: 20, letterSpacing: 3, textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: 12 }}>
                RYDER
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: 1.5, background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.35)', borderRadius: 4, padding: '2px 8px' }}>
                  PANDORA 3.0 · {meta.version}
                </span>
              </div>
              <div style={{ position: 'absolute', bottom: 14, right: 42, color: 'rgba(255,255,255,0.75)', fontSize: 12, fontWeight: 600 }}>
                Reporte de Simulación Industrial
              </div>
            </div>

            <div className="ry-page-inner" style={{ ...S.inner, display: 'grid', gridTemplateColumns: '1.25fr 1fr', gap: 36, alignItems: 'center' }}>
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
                    ['Máquina',  meta.simulador],
                    ['Proyecto', meta.proyecto],
                    ['Fecha',    meta.fecha],
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

          {/* ── PAGE 2: KPIs ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={S.inner}>
              <h2 style={S.h2}>Indicadores Clave de Operación</h2>
              <p style={S.sub}>Resumen ejecutivo de velocidad, capacidad y cobertura inicial.</p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 16 }}>
                {[
                  { v: fmt(kpis.velocidadBandaMph, 1), l: 'Vel. Banda (m/h)',  h: `Máx: ${fmt(kpis.velocidadMaxMph)} m/h` },
                  { v: fmt(kpis.capacidadPromHora),     l: 'Cap. Prom/h (c/h)', h: 'Capacidad promedio por hora' },
                  { v: fmt(kpis.capacidadDiaY1),        l: 'Cap. Día Y1 (cajas)',h: 'Producción diaria año 1' },
                  { v: fmt(kpis.requerimientoTotalDia), l: 'Req. Total/Día',    h: 'Requerimiento diario global' },
                ].map((k, i) => (
                  <div key={i} style={S.kpi}>
                    <div style={{ fontSize: 34, fontWeight: 800, color: '#0b8ea0', lineHeight: 1, marginBottom: 8 }}>{k.v}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: '#122033' }}>{k.l}</div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginTop: 5 }}>{k.h}</div>
                  </div>
                ))}
              </div>
              <div style={{ ...S.kpi, maxWidth: 280 }}>
                <div style={{ fontSize: 34, fontWeight: 800, color: '#0b8ea0', lineHeight: 1, marginBottom: 8 }}>{fmt(kpis.coberturaY1, 1)}%</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#122033' }}>Cobertura Y1</div>
                <div style={{ fontSize: 12, color: '#6b7280', marginTop: 5 }}>% del requerimiento cubierto en Y1</div>
              </div>
            </div>
          </div>

          {/* ── PAGE 3: Utilización ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={S.inner}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 24 }}>
                <div style={{ background: 'linear-gradient(135deg,rgba(17,181,201,0.09),rgba(17,181,201,0.01))', border: '1px solid rgba(17,181,201,0.2)', borderRadius: 18, padding: 28 }}>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#122033', marginBottom: 10 }}>Velocidad de Línea — Utilización</div>
                  <div style={{ fontSize: 56, fontWeight: 800, color: '#0b8ea0', lineHeight: 1, marginBottom: 6 }}>{fmt(lineUtilization.utilPct, 1)}%</div>
                  <div style={{ fontWeight: 700, color: '#122033', marginBottom: 10 }}>Banda Actual</div>
                  <div style={{ fontSize: 14, color: '#526678' }}>{fmt(lineUtilization.actualMph, 1)} m/h de {fmt(lineUtilization.maxMph)} m/h límite</div>
                  <div style={{ marginTop: 16, color: '#5c7083', fontSize: 14, lineHeight: 1.6 }}>{lineUtilization.interpretation}</div>
                </div>
                <div style={S.panel}>
                  <h3 style={S.h3}>Utilización visual</h3>
                  <ResponsiveContainer width="100%" height={270}>
                    <PieChart>
                      <Pie data={donutData} cx="50%" cy="45%" innerRadius="62%" outerRadius="82%" dataKey="value" startAngle={90} endAngle={-270} paddingAngle={1}>
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
            </div>
          </div>

          {/* ── PAGE 4: Modelos ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={S.inner}>
              <h2 style={S.h2}>Modelos de Contenedores Evaluados</h2>
              <div style={S.panel}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr>{['Mod','Nombre','Cap c/h','Cap/Día','Req/Día','Hrs Req.','Estado'].map(h => (
                      <th key={h} style={S.th}>{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody>
                    {modelTable.map((r, i) => (
                      <tr key={r.mod} style={{ background: i % 2 === 0 ? '#fff' : '#f7fbfd' }}>
                        <td style={{ ...S.td, fontWeight: 800, color: '#0b8ea0' }}>{r.mod}</td>
                        <td style={S.td}>{r.nombre}</td>
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
            </div>
          </div>

          {/* ── PAGE 5: Cap vs Req + Escenarios ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={S.inner}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
                <div style={S.panel}>
                  <h3 style={S.h3}>Capacidad vs Requerimiento por Modelo</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={modelChartData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8eef4" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => fmt(v)} />
                      <Legend />
                      <Bar dataKey="Cap/Día" fill="#11b5c9" radius={[6,6,0,0]} />
                      <Bar dataKey="Req/Día" fill="#122033" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div style={S.panel}>
                  <h3 style={S.h3}>Lavado y Secado — Parámetros Y1–Y5</h3>
                  <p style={{ fontSize: 12, color: '#6b7280', margin: '0 0 10px' }}>Ref: {lavadoSecadoParams.referencia} · Rate base: {fmt(lavadoSecadoParams.rateBase)} cajas/día</p>
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
                            <td style={{ ...S.td, fontWeight: 800, color: '#0b8ea0' }}>{r.year}</td>
                            <td style={S.td}>{r.hrsBase}</td>
                            <td style={S.td}>{fmt(r.hrsEfTurno, 2)}</td>
                            <td style={S.td}>{r.turnos}</td>
                            <td style={S.td}>{fmt(r.tiempoDisponible, 2)}</td>
                            <td style={S.td}>{fmt(r.reqHora, 1)}</td>
                            <td style={S.td}>{fmt(r.capHora, 1)}</td>
                            <td style={{ ...S.td, color: r.balance >= 0 ? '#16a34a' : '#dc2626', fontWeight: 700 }}>{r.balance >= 0 ? '+' : ''}{fmt(r.balance, 1)}</td>
                            <td style={{ ...S.td, color: r.cobertura >= 100 ? '#16a34a' : '#f59e0b', fontWeight: 700 }}>{fmt(r.cobertura, 1)}%</td>
                            <td style={S.td}>{r.lineas}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── PAGE 6: Cobertura Y1-Y5 ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={S.inner}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 22 }}>
                <div style={S.panel}>
                  <h3 style={S.h3}>Cobertura Anual Y1–Y5</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={coverageData} margin={{ top: 5, right: 10, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8eef4" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                      <Tooltip formatter={(v) => `${fmt(v, 1)}%`} />
                      <ReferenceLine y={100} stroke="#11b5c9" strokeDasharray="5 3" label={{ value: '100%', fill: '#0b8ea0', fontSize: 11 }} />
                      <Bar dataKey="Cobertura %" fill="#11b5c9" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <p style={{ fontSize: 12, color: '#5c7083', marginTop: 8 }}>Cobertura sobre 100% = 1 máquina suficiente.</p>
                </div>
                <div style={S.panel}>
                  <h3 style={S.h3}>Tendencia de Cobertura Y1–Y5</h3>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={coverageData} margin={{ top: 5, right: 16, bottom: 5, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e8eef4" />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis yAxisId="left" tickFormatter={v => `${v}%`} tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine yAxisId="left" y={100} stroke="#11b5c9" strokeDasharray="4 2" />
                      <Line yAxisId="left"  type="monotone" dataKey="Cobertura %" stroke="#11b5c9" strokeWidth={2.5} dot={{ r: 5, fill: '#11b5c9' }} />
                      <Line yAxisId="right" type="monotone" dataKey="Superávit"   stroke="#122033" strokeWidth={2} dot={{ r: 4, fill: '#122033' }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <p style={{ fontSize: 12, color: '#5c7083', marginTop: 8 }}>Cobertura % y superávit c/h por año proyectado.</p>
                </div>
              </div>
            </div>
          </div>

          {/* ── PAGE 7: Conclusiones ── */}
          <div className="ry-page" style={S.page}>
            <div className="ry-page-inner" style={S.inner}>
              <h2 style={S.h2}>Conclusiones del Informe</h2>
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
              <p style={{ marginTop: 28, color: '#9aabb8', fontSize: 12, borderTop: '1px solid #e8eef4', paddingTop: 16 }}>
                Reporte generado automáticamente · PANDORA 3.0 · RYDER Industrial Simulator · {meta.fecha}
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Style constants ─────────────────────────────────────────────────────────
const S = {
  page:  { background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.12)' },
  inner: { padding: '32px 42px 38px' },
  panel: { background: '#fff', border: '1px solid #dbe5ee', borderRadius: 16, padding: '18px 18px 14px' },
  kpi:   { background: 'linear-gradient(180deg,#fbfdff,#f3f8fc)', border: '1px solid #dbe5ee', borderRadius: 16, padding: 18 },
  h2:    { fontSize: 28, margin: '0 0 8px', color: '#122033', lineHeight: 1.1 },
  h3:    { margin: '0 0 12px', color: '#122033', fontSize: 18, fontWeight: 700 },
  sub:   { margin: '0 0 20px', color: '#5f7286', fontSize: 14 },
  th:    { background: '#f1f8fb', color: '#122033', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.4, padding: '9px 10px', borderBottom: '1px solid #dbe5ee', textAlign: 'left', whiteSpace: 'nowrap', fontWeight: 700 },
  td:    { borderBottom: '1px solid #dbe5ee', padding: '9px 10px', textAlign: 'left', verticalAlign: 'middle', fontSize: 13, color: '#1f2a37' },
};
