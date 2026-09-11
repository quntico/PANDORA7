import re
import os

filepath = 'src/pages/alpha/simulators/DHLAdvancedSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Remove math factors
content = re.sub(r'\s*\*\s*\(\(inputs\.reductionFactor\s*\|\|\s*90\)\s*/\s*100\)', '', content)
content = re.sub(r'\s*\*\s*\(\(inputs\.reductionFactor\s*\|\|\s*95\)\s*/\s*100\)', '', content)
content = re.sub(r'\s*\*\s*\(\(inputs\.reductionFactor\s*!==\s*undefined\s*\?\s*inputs\.reductionFactor\s*:\s*90\)\s*/\s*100\)', '', content)
content = re.sub(r'\s*\*\s*\(\(inputs\.reductionFactor\s*!==\s*undefined\s*\?\s*inputs\.reductionFactor\s*:\s*95\)\s*/\s*100\)', '', content)
content = re.sub(r'\s*\*\s*\(inputs\.reductionFactor\s*/\s*100\)', '', content)

# Remove specific UI blocks
# Line 1916-1919 (aprox) -> <span className="text-[9px] font-bold text-slate-500 uppercase">Utilización / Factor de Reducción (%)</span>
# We'll use regex to remove that block
pattern_ui1 = r'<div className="mb-4">\s*<span className="text-\[9px\] font-bold text-slate-500 uppercase">Utilización / Factor de Reducción \(%\)</span>.*?</div>'
content = re.sub(pattern_ui1, '', content, flags=re.DOTALL)

# Line 2523-2531:
# <div className="flex items-center justify-between text-slate-500 text-[10px] font-bold uppercase tracking-wider">
#   <span>Reducción (Criba):</span>
#   <div className="flex items-center gap-2">
#     <input ... />
#     <span>%</span>
#   </div>
# </div>
pattern_ui2 = r'<div className="flex items-center justify-between text-slate-500 text-\[10px\] font-bold uppercase tracking-wider">\s*<span>Reducción \(Criba\):</span>.*?</div>\s*</div>'
content = re.sub(pattern_ui2, '', content, flags=re.DOTALL)

# In the PDF output: 
# <div className="flex justify-between"><span>Factor Reducción:</span><span className="text-slate-850 font-bold">{(scenarioResults.conservador.utilization * 100).toFixed(1)}%</span></div>
pattern_pdf1 = r'<div className="flex justify-between">\s*<span>Factor Reducción:</span>\s*<span className="text-slate-850 font-bold">[^<]+</span>\s*</div>'
content = re.sub(pattern_pdf1, '', content, flags=re.DOTALL)

# Find and remove any stray occurrences of 'Reducción (Criba)'
content = content.replace("<span>Reducción (Criba):</span>", "")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Removed reduction factor!")
