import re
import os

filepath = 'src/pages/alpha/simulators/DHLAdvancedSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r'(?i)tonelada', 'caja', content)
content = re.sub(r'(?i)trituradora', 'lavadora', content)
content = re.sub(r'(?i)rotor', 'sistema de lavado', content)
content = re.sub(r'(?i)fuerzas oscilatorias', 'fuerzas hidrodinámicas', content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Final case-insensitive replacements done.")
