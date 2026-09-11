import re

filepath = 'src/pages/alpha/simulators/DHLAdvancedSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update UI Text
old_ui_text = r'className="mt-2 p-2 bg-blue-50 border-l-2 border-blue-400 text-\[9px\] text-blue-700 leading-tight"'
new_ui_text = 'className="mt-2 p-2.5 bg-blue-50 border-l-[3px] border-blue-400 text-[11px] text-blue-700 font-medium leading-relaxed"'
content = re.sub(old_ui_text, new_ui_text, content)

# 2. Update PDF Text
old_pdf_text = r'marginTop: \'12px\', padding: \'8px\', background: \'#f0f9ff\', borderLeft: \'2px solid #38bdf8\', fontSize: \'8px\', color: \'#0369a1\', lineHeight: \'1\.2\''
new_pdf_text = "marginTop: '12px', padding: '10px', background: '#f0f9ff', borderLeft: '3px solid #38bdf8', fontSize: '10px', fontWeight: 500, color: '#0369a1', lineHeight: '1.4'"
content = re.sub(old_pdf_text, new_pdf_text, content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated text sizes!")
