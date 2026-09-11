import re
import os

filepath = 'src/pages/alpha/simulators/DHLAdvancedSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the Math.min clamping
content = re.sub(
    r'const realProductionPerHourBoxes = Math\.min\([\s\S]*?\);',
    'const realProductionPerHourBoxes = capacidadNominalCajasH * ((inputs.oee || 85) / 100) * ((inputs.reductionFactor || 90) / 100);',
    content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
