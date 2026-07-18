import re
import os

filepath = 'src/pages/alpha/simulators/DHLSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Safe Replacements
safe_replacements = [
    ('bg-[#0A0A0A] border border-[#1A1A1A]', 'bg-white border border-slate-200 shadow-sm'),
    ('bg-[#0A0A0A] border border-[#333]', 'bg-white border border-slate-300'),
    ('bg-[#0A0A0A] border border-[#1E1E1E]', 'bg-white border border-slate-200 shadow-sm'),
    ('bg-[#0A0A0A] border border-[#2A2A2A]', 'bg-white border border-slate-200 shadow-sm'),
    ('bg-[#111] border-[#1A1A1A]', 'bg-slate-50 border-slate-200'),
    ('bg-[#111] rounded-xl p-3 border border-[#1A1A1A]', 'bg-slate-50 rounded-xl p-3 border border-slate-200'),
    ('bg-[#0D1A2A] border-[#00F0FF]/40', 'bg-blue-50 border-blue-300'),
    ('bg-[#0D0D0D]', 'bg-white'),
    ('bg-[#111] border border-[#2a2a2a]', 'bg-white border border-slate-200'),
    ('bg-[#222]', 'bg-slate-200'),
    ('border-[#00F0FF]/30', 'border-blue-300'),
    ('shadow-[0_0_40px_#00F0FF22]', 'shadow-xl shadow-blue-500/10'),
    ('text-[#ffcc00]', 'text-yellow-600'),
    ('text-[#00F0FF]', 'text-blue-600'),
    ('hover:border-[#ffcc00]/50', 'hover:border-yellow-400'),
    ('hover:bg-[#ffcc00]/5', 'hover:bg-yellow-50'),
    ('hover:shadow-[0_0_16px_#ffcc0022]', 'hover:shadow-md'),
    ('hover:border-[#00F0FF]/30', 'hover:border-blue-300'),
    ('hover:border-[#00F0FF]/40', 'hover:border-blue-400'),
    ('hover:shadow-[0_0_18px_#00F0FF18]', 'hover:shadow-md'),
    
    # Specific Text Replacements for the KPIs:
    ('<span className="text-3xl font-black text-white">', '<span className="text-3xl font-black text-slate-800">'),
    ('text-white outline-none', 'text-slate-800 outline-none'),
    ('text-white text-xs', 'text-slate-800 text-xs'),
    ('text-white focus:', 'text-slate-800 focus:'),
    ('text-gray-500', 'text-slate-500'),
    ('text-gray-400', 'text-slate-500'),
    ('text-gray-600', 'text-slate-600'),
    ('text-gray-700', 'text-slate-400'),
]

for old, new in safe_replacements:
    content = content.replace(old, new)

# Special target for Equivalencia, Cap Máq, Carga, Residencia etc text colors:
content = re.sub(r'text-3xl font-black text-white( group-hover.*?)?', r'text-3xl font-black text-slate-800\1', content)
content = re.sub(r'text-2xl font-black text-white( group-hover.*?)?', r'text-2xl font-black text-slate-800\1', content)
content = re.sub(r'text-white( group-hover:text-yellow-600.*?)?', r'text-slate-800\1', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print('Success')
