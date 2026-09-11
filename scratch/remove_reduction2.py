import os

filepath = 'src/pages/alpha/simulators/DHLAdvancedSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for i, line in enumerate(lines):
    if "['Factor de reducción', inputs.reductionFactor, '%']" in line:
        continue
    
    if "Utilización / Factor de Reducción (%)" in line:
        # We need to skip the div that wraps it
        continue
    
    # 2528 area
    if 'value={inputs.reductionFactor' in line or 'onChange={(e) => setInputs(prev => ({ ...prev, reductionFactor' in line:
        continue
    
    if 'reductionFactor:' in line and '95' in line:
        continue
        
    if 'utilization: (inputs.reductionFactor || 90) / 100' in line:
        new_lines.append(line.replace('(inputs.reductionFactor || 90) / 100', '1'))
        continue

    new_lines.append(line)

# Let's use a regex to strip the block starting with "Utilización / Factor de Reducción"
content = "".join(new_lines)
import re
content = re.sub(r'<div[^>]*>\s*<span className="text-\[9px\] font-bold text-slate-500 uppercase">Utilización / Factor de Reducción \(%\)</span>.*?</div>\s*</div>', '', content, flags=re.DOTALL)
content = re.sub(r'<div className="flex items-center justify-between text-slate-500 text-\[10px\] font-bold uppercase tracking-wider">\s*<div className="flex items-center gap-2">\s*<input[^>]*/>\s*<span>%</span>\s*</div>\s*</div>', '', content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed remaining lines!")
