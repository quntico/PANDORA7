import re
import os

filepath = 'src/pages/alpha/simulators/DHLAdvancedSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix corruptions
content = content.replace("const capacidadNominalCajasH = currentNominalCapacity;n", "\\n")
content = content.replace("const capacidadNominalCajasH = currentNominalCapacity;d", "\\d")
content = content.replace("const capacidadNominalCajasH = currentNominalCapacity;s", "\\s")
content = content.replace("const capacidadNominalCajasH = currentNominalCapacity;.", "\\.")
content = content.replace("const capacidadNominalCajasH = currentNominalCapacity;/", "\\/")
content = content.replace("const capacidadNominalCajasH = currentNominalCapacity;[", "\\[")

# Remove any other stray 'const capacidadNominalCajasH = currentNominalCapacity;' that shouldn't be there (except the real one which should be `const capacidadNominalCajasH = currentNominalCapacity;`)
# Let's be careful. The actual line is:
# `const capacidadNominalCajasH = currentNominalCapacity;`
# But wait, did it replace ALL `\`? Yes.
# So `\\` is just `\`.
# Let's fix the specific lines first:
content = content.replace(r'file.name.replace(/\.[^.]+$/,', r'file.name.replace(/\.[^.]+$/,')
# Wait, I just replaced all the bad ones using python string replace above. Let's see if that's enough.

# Now implement the geometric logic
# Find the math:
# const conveyorSpeedCmH = (inputs.conveyorSpeedMH !== undefined ? inputs.conveyorSpeedMH : 160) * 100;
# const espacioPorCajaCm = activeBox.largoCm + (inputs.boxGapCm !== undefined ? inputs.boxGapCm : 15);
# const currentNominalCapacity = espacioPorCajaCm > 0 ? Math.floor(conveyorSpeedCmH / espacioPorCajaCm) : 0;

old_math = r'const conveyorSpeedCmH = \(inputs\.conveyorSpeedMH !== undefined \? inputs\.conveyorSpeedMH : 160\) \* 100;\s*const espacioPorCajaCm = activeBox\.largoCm \+ \(inputs\.boxGapCm !== undefined \? inputs\.boxGapCm : 15\);\s*const currentNominalCapacity = espacioPorCajaCm > 0 \? Math\.floor\(conveyorSpeedCmH / espacioPorCajaCm\) : 0;'
new_math = """
  const conveyorSpeedMH = inputs.conveyorSpeedMH !== undefined ? inputs.conveyorSpeedMH : 160;
  const conveyorSpeedCmH = conveyorSpeedMH * 100;
  const espacioPorCajaCm = activeBox.largoCm + (inputs.boxGapCm !== undefined ? inputs.boxGapCm : 15);
  const capacidadGeometrica = espacioPorCajaCm > 0 ? Math.floor(conveyorSpeedCmH / espacioPorCajaCm) : 0;
  const currentNominalCapacity = Math.min(capacidadGeometrica, 350);
"""
content = re.sub(old_math, new_math.strip(), content)

# PDF Note injection
# Find: <p style={{ color: '#475569', fontSize: 12, lineHeight: 1.6, margin: 0 }}>Análisis de capacidad, potencia instalada y viabilidad financiera para la línea de lavado...
# Replace with the new note added below it.
old_pdf_note = r'(<p style=\{\{ color: \'#475569\', fontSize: 12, lineHeight: 1\.6, margin: 0 \}\}>Análisis de capacidad.*?<\/p>)'
new_pdf_note = r'\1\n                    <div style={{ marginTop: 12, padding: 12, backgroundColor: "#f8fafc", borderLeft: "4px solid #0284c7", fontSize: 10, color: "#475569", lineHeight: 1.5 }}>\n                      <strong>Nota Metodológica:</strong> La capacidad por modelo se calcula en función de la velocidad lineal de la banda, la dimensión de la caja en el sentido de avance y la separación entre unidades. El resultado está limitado a una capacidad física máxima de 350 cajas/h. La capacidad real considera el OEE seleccionado.\n                    </div>'
content = re.sub(old_pdf_note, new_pdf_note, content)

# Fix charts `bandaSpeedMeterPerMin`
# Find `inputs.bandaSpeedMeterPerMin || 10`
# Replace with `(inputs.conveyorSpeedMH || 160) / 60`
content = content.replace("inputs.bandaSpeedMeterPerMin || 10", "(inputs.conveyorSpeedMH !== undefined ? inputs.conveyorSpeedMH : 160) / 60")

# Add UI warning in TabMetricas (around line 1916 where the input is)
ui_input = r'(<input type="number" step="10" value=\{inputs\.conveyorSpeedMH[^\}]*\}\s*onChange=\{[^\}]*\}\s*className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1\.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none"\s*/>)'
warning_code = r'\1\n                      {(inputs.conveyorSpeedMH > 250) && <div className="text-[9px] text-red-500 font-bold mt-1">Velocidad fuera del rango permitido. El máximo del equipo es 250 m/h.</div>}\n                      {(capacidadGeometrica > 350) && <div className="text-[9px] text-amber-500 font-bold mt-1 leading-tight">La capacidad geométrica supera el límite físico del sistema. Para efectos del análisis se aplica el máximo de 350 cajas/h.</div>}'
# We need to make sure capacidadGeometrica is available in the render scope.
# Oh wait, `capacidadGeometrica` is defined inside `DHLAdvancedSimulator` render function! Yes.
content = re.sub(ui_input, warning_code, content)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated geometric math, fixed corruptions, added warnings!")
