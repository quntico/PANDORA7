const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'alpha', 'simulators', 'WM500Simulator.jsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Enforce minimum font size of 10 in PDF inline styles and Tailwind classes
// We only want to target the PDF section, which is roughly between "reportRef" and "FlowDesignsLibrary"
const pdfStartIndex = content.indexOf('ref={reportRef}');
const pdfEndIndex = content.indexOf('<FlowDesignsLibrary');

if (pdfStartIndex !== -1 && pdfEndIndex !== -1) {
  let pdfSection = content.substring(pdfStartIndex, pdfEndIndex);

  // Replace inline styles
  pdfSection = pdfSection.replace(/fontSize:\s*[789]\b/g, 'fontSize: 10');
  
  // Replace Tailwind classes (if any are used in the PDF section)
  pdfSection = pdfSection.replace(/text-\[7px\]|text-\[8px\]|text-\[9px\]/g, 'text-[10px]');

  // 2. Adjust Financial Page Layout and insert Chart
  // The financial section has: <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
  // We want to reduce gap to 12, padding to 12, marginBottom to 6, and insert a Recharts PieChart below it.
  
  pdfSection = pdfSection.replace(
    /<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>/g,
    `<div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>`
  );

  // Reduce paddings and gaps inside the 4 cards
  pdfSection = pdfSection.replace(
    /<div style={{ border: '1px solid #e2e8f0', borderRadius: 16, padding: 16, background: '#f8fafc' }}>/g,
    `<div style={{ border: '1px solid #e2e8f0', borderRadius: 12, padding: 12, background: '#f8fafc' }}>`
  );
  
  pdfSection = pdfSection.replace(
    /<div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>/g,
    `<div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>`
  );
  
  pdfSection = pdfSection.replace(
    /marginBottom: 12/g,
    `marginBottom: 8`
  );
  
  pdfSection = pdfSection.replace(
    /marginBottom: 8/g,
    `marginBottom: 4`
  );

  // Re-inject the fixed financial section grid block with a chart below it.
  // We need to find the end of the `grid` div. 
  // The structure is: 
  // <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
  //   <div flex column> <div capex> <div opex> </div>
  //   <div flex column> <div roi> <div riesgo> </div>
  // </div>
  
  const chartInjection = `
                        {/* GRÁFICO OPEX INYECTADO */}
                        <div style={{ marginTop: 12, border: '1px solid #e2e8f0', borderRadius: 12, padding: '12px 16px', background: '#fff', display: 'flex', alignItems: 'center', gap: 20 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 10, fontWeight: 900, color: '#0f2038', textTransform: 'uppercase', marginBottom: 4 }}>Distribución de Costo Operativo (OPEX)</div>
                            <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>El gráfico circular detalla la proporción de gastos operativos mensuales. La optimización de la matriz energética y los mantenimientos preventivos son la clave para maximizar el flujo operativo y acelerar el retorno de inversión.</div>
                          </div>
                          <div style={{ width: 300, height: 140 }}>
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: 'Energía', value: results.monthlyElectricityCostMxn, fill: '#0ea5e9' },
                                    { name: 'Mano de Obra', value: results.manoObraMensualMxn, fill: '#8b5cf6' },
                                    { name: 'Mantenimiento', value: results.mantenimientoMensualMxn, fill: '#f59e0b' },
                                    { name: 'Consumibles', value: inputs.cuchillasMensualMxn + inputs.refaccionesMensualMxn + inputs.lubricacionMensualMxn, fill: '#10b981' }
                                  ].filter(d => d.value > 0)}
                                  cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value"
                                >
                                  {[{fill: '#0ea5e9'}, {fill: '#8b5cf6'}, {fill: '#f59e0b'}, {fill: '#10b981'}].map((e,i) => <Cell key={i} fill={e.fill} />)}
                                </Pie>
                                <Tooltip formatter={(value) => "$" + new Intl.NumberFormat().format(value.toFixed(0))} />
                                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: 10 }} iconType="circle" iconSize={6} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
`;

  // We find the closing div of the grid.
  // We can just replace the exact Riesgo component closing tags.
  // In the file:
  //                               </div>
  //                             </div>
  //                           </div>
  //                         </div>
  // 
  //                       </div>
  // 
  //                       {renderPageFooter(++pdfPageIndex, totalPdfPages)}

  const targetToReplace = `                              </div>
                            </div>
                          </div>
                        </div>`;
  
  const replacement = `                              </div>
                            </div>
                          </div>
                        </div>${chartInjection}`;

  pdfSection = pdfSection.replace(targetToReplace, replacement);

  // Merge back
  content = content.substring(0, pdfStartIndex) + pdfSection + content.substring(pdfEndIndex);
  
  fs.writeFileSync(filePath, content, 'utf8');
  console.log("PDF constraints applied and chart injected successfully.");
} else {
  console.log("Could not locate PDF section boundaries.");
}
