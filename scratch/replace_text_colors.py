import re
import os

filepath = 'src/pages/alpha/simulators/DHLSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    '<div className="text-3xl font-black text-slate-800 mt-1">',
    '<div className="text-3xl font-black text-[#00B5CC] mt-1">'
)
content = content.replace(
    '<span className="text-3xl font-black text-slate-800">',
    '<span className="text-3xl font-black text-[#00B5CC]">'
)
content = content.replace(
    '<span className="text-3xl font-black text-slate-800 group-hover:text-yellow-600 transition-colors duration-300">',
    '<span className="text-3xl font-black text-[#00B5CC] group-hover:text-[#008080] transition-colors duration-300">'
)
content = content.replace(
    '<span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest',
    '<span className="text-[10px] text-[#0D1A2A] font-bold uppercase tracking-widest'
)
content = content.replace(
    '<span className="text-xs text-slate-500 uppercase font-bold tracking-wider',
    '<span className="text-xs text-[#0D1A2A] uppercase font-bold tracking-wider'
)
content = content.replace(
    'className="text-xs font-black uppercase tracking-widest text-slate-500"',
    'className="text-xs font-black uppercase tracking-widest text-[#0D1A2A]"'
)

# And Tab contents
content = content.replace(
    'className="text-xs font-black text-slate-800 mb-2 uppercase tracking-widest"',
    'className="text-xs font-black text-[#0D1A2A] mb-2 uppercase tracking-widest"'
)
content = content.replace(
    'text-blue-600',
    'text-[#00B5CC]'
)
content = content.replace(
    'text-yellow-600',
    'text-[#F59E0B]' # warm yellow for balance
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print('Done')
