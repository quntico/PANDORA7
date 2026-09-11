import re
import os

filepath = 'src/pages/alpha/simulators/DHLAdvancedSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the malformed line
content = content.replace("const capacidadNominalCajasH = inputs.capacidad_nominal_cajas_h ||const capacidadNominalCajasH = currentNominalCapacity;", "const capacidadNominalCajasH = currentNominalCapacity;")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
