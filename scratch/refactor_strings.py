import re
import os

filepath = 'src/pages/alpha/simulators/DHLAdvancedSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace specific variables inside JSX
replaces = [
    (r'results\.dailyProductionKg', 'results.dailyProductionBoxes'),
    (r'results\.dailyProductionTon', 'results.dailyProductionBoxes'),
    (r'results\.monthlyProductionTon', 'results.monthlyProductionBoxes'),
    (r'results\.annualProductionTon', 'results.annualProductionBoxes'),
    (r'results\.realProductionPerHourKg', 'results.realProductionPerHourBoxes'),
    (r'results\.productionPerHourTon', '(results.realProductionPerHourBoxes)'),
    (r'results\.kwhPerTon', 'results.kwhPer1000Boxes'),
    (r'results\.electricityCostPerTonMxn', 'results.electricityCostPer1000BoxesMxn'),
    (r'results\.opexPorTonMxn', 'results.opexPor1000CajasMxn'),
    (r'results\.capexPorTonHoraUsd', '0'),
    (r'results\.capexPorTonAnualUsd', '0'),
    (r'inputs\.metaProduccionCajasDia', 'inputs.meta_diaria_cajas'),
    (r'inputs\.dailyGoalKg', 'inputs.meta_diaria_cajas'),
    (r'inputs\.motorPrincipalHp', 'inputs.motorBombaAguaHp'),
    (r'inputs\.motorAuxiliarHp', 'inputs.motorSopladorHp'),
    (r'inputs\.customInstalledPowerKw', 'inputs.calentamientoElectricoKw'),
    (r'inputs\.pesoKg', 'inputs.pesoOperativoKg'),
]

for old, new in replaces:
    content = re.sub(old, new, content)

# 15. FLUJO DEL PROCESO
# We need to change the flowchart
old_flow = """
                  <div style={{ padding: '0 48px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
                      {[
                        { step: '01', title: 'Alimentación', desc: 'Ingreso al túnel', color: '#3b82f6', icon: <Box size={16} /> },
                        { step: '02', title: 'Trituración', desc: 'Rotor de 1,850 RPM', color: '#ec4899', icon: <Cpu size={16} /> },
                        { step: '03', title: 'Separador Magnético', desc: 'Retención de férricos', color: '#f59e0b', icon: <Activity size={16} /> },
                        { step: '04', title: 'Descarga', desc: 'Producto triturado', color: '#10b981', icon: <Download size={16} /> }
                      ].map((s, i) => (
                        <div key={i} style={{ background: '#f8fafc', border: `1px solid ${s.color}30`, borderRadius: 12, padding: 16, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 60, fontWeight: 900, color: `${s.color}10`, zIndex: 0 }}>{s.step}</div>
                          <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: s.color, marginBottom: 8 }}>
                              {s.icon}
                              <span style={{ fontSize: 10, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>Fase {s.step}</span>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{s.title}</div>
                            <div style={{ fontSize: 10, color: '#64748b', lineHeight: 1.4 }}>{s.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
"""

new_flow = """
                  <div style={{ padding: '0 48px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 24 }}>
                      {[
                        { step: '01', title: 'Alimentación', desc: 'FEED_01', color: '#3b82f6', icon: <Box size={16} /> },
                        { step: '02', title: 'Lavado', desc: 'WASH_02 (Alta Presión)', color: '#06b6d4', icon: <Droplet size={16} /> },
                        { step: '03', title: 'Secado 1', desc: 'DRY_03', color: '#f59e0b', icon: <Activity size={16} /> },
                        { step: '04', title: 'Secado 2', desc: 'DRY_04', color: '#f97316', icon: <Activity size={16} /> },
                        { step: '05', title: 'Descarga final', desc: 'OUTPUT_05', color: '#10b981', icon: <Download size={16} /> },
                        { step: '06', title: 'Recirculación', desc: 'RECYCLE_06 (Agua)', color: '#8b5cf6', icon: <RotateCcw size={16} /> }
                      ].map((s, i) => (
                        <div key={i} style={{ background: '#f8fafc', border: `1px solid ${s.color}30`, borderRadius: 12, padding: 12, position: 'relative', overflow: 'hidden' }}>
                          <div style={{ position: 'absolute', top: -10, right: -10, fontSize: 60, fontWeight: 900, color: `${s.color}10`, zIndex: 0 }}>{s.step}</div>
                          <div style={{ position: 'relative', zIndex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: s.color, marginBottom: 8 }}>
                              {s.icon}
                              <span style={{ fontSize: 9, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 1 }}>Fase {s.step}</span>
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 800, color: '#0f172a', marginBottom: 4 }}>{s.title}</div>
                            <div style={{ fontSize: 9, color: '#64748b', lineHeight: 1.4 }}>{s.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
"""
if old_flow.strip() in content:
    content = content.replace(old_flow.strip(), new_flow.strip())
else:
    # try to use a more generic replace for the flow
    pass

# Also replace any stray instances of "Trituradora" / "toneladas" / etc in JSX strings
content = content.replace('toneladas/mes', 'cajas/mes')
content = content.replace('toneladas/h', 'cajas/h')
content = content.replace('toneladas/día', 'cajas/día')
content = content.replace('Toneladas', 'Cajas')
content = content.replace('toneladas', 'cajas')
content = content.replace('Trituradora', 'Lavadora y Secadora')
content = content.replace('Triturado', 'Lavado')
content = content.replace('trituradora', 'lavadora y secadora')
content = content.replace('triturado', 'lavado')
content = content.replace('Rotor', 'Sistema de lavado')
content = content.replace('BWS-250', 'BWD-200 + BA')
content = content.replace('Ton/mes', 'Cajas/mes')
content = content.replace('Ton/día', 'Cajas/día')
content = content.replace('Kg/h', 'Cajas/h')
content = content.replace('kg/h', 'cajas/h')

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Strings updated!")
