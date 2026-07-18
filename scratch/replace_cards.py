import re
import os

filepath = 'src/pages/alpha/simulators/DHLSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix Carga de Máquina Card (Inline Styles and Classes)
content = re.sub(
    r'className="group p-4 rounded-2xl cursor-pointer\s*border border-\[\#0D2A4A\] hover:border-\[\#3A9EBE\]/40\s*transition-all duration-300"',
    r'className="group p-4 rounded-2xl cursor-pointer border border-slate-200 bg-white hover:border-cyan-300 shadow-sm transition-all duration-300"',
    content
)

content = re.sub(
    r'style=\{\{\s*background:\s*\'linear-gradient\(180deg, #050E1C 0%, #061220 100%\)\',\s*boxShadow:\s*\'0 2px 12px rgba\(0,0,0,0\.5\), inset 0 1px 0 rgba\(58,158,190,0\.12\)\'\s*\}\}',
    r'',
    content
)

content = content.replace("style={{ color: '#5A8FAA', textShadow: 'none' }}", "className=\"text-slate-500\"")
content = content.replace("style={{ color: '#5AACCC', textShadow: 'none' }}", "className=\"text-cyan-600\"")
content = content.replace("if (!isActive && !isHover) return '#060E1A';", "if (!isActive && !isHover) return '#f1f5f9';")

# Fix Bottom 4 KPIs
content = content.replace(
    'bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-slate-200 shadow-lg relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(56,189,248,0.1)] hover:border-yellow-500/30 group',
    'bg-white border border-slate-200 shadow-sm relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-yellow-400 group'
)
content = content.replace(
    'bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-slate-200 shadow-lg relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(96,165,250,0.1)] hover:border-blue-400/30 group',
    'bg-white border border-slate-200 shadow-sm relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-blue-300 group'
)
content = content.replace(
    'bg-gradient-to-b from-[#111] to-[#0A0A0A] border border-slate-200 shadow-lg relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)] hover:border-white/20 group',
    'bg-white border border-slate-200 shadow-sm relative overflow-hidden cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-slate-300 group'
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
