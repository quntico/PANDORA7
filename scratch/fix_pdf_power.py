import re
import os

filepath = 'src/pages/alpha/simulators/DHLAdvancedSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the PDF rendering bug where Potencia Instalada was grabbing calentamientoElectricoKw (18)
old_line = r'val: `\$\{\(inputs\.calentamientoElectricoKw !== undefined \? inputs\.calentamientoElectricoKw : results\.installedPowerKw\)\.toFixed\(2\)\} kW`'
new_line = r'val: `${results.installedPowerKw.toFixed(2)} kW`'
content = re.sub(old_line, new_line, content)

# Check if there is another place in the Web UI doing the same thing.
# Let's search for "Potencia Instalada Total"
old_ui_line = r'val: `\$\{\(inputs\.calentamientoElectricoKw !== undefined \? inputs\.calentamientoElectricoKw : results\.installedPowerKw\)\.toFixed\(2\)\}`'
new_ui_line = r'val: `${results.installedPowerKw.toFixed(2)}`'
content = re.sub(old_ui_line, new_ui_line, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated PDF rendering of Potencia Instalada!")
