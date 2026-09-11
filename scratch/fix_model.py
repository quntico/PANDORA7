import re
import os

filepath = 'src/pages/alpha/simulators/DHLAdvancedSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace all forms of the machine name
content = content.replace("BWD-200 + BA", "BWD-250")
content = content.replace("BWS-250", "BWD-250")

# And we should update the migration hook to be more aggressive
# so that it catches cases where machineName might already be something else but evaluationName still has BWS-250
migration_hook = """
  // Migración automática para forzar valores de lavado si provienen de caché vieja
  useEffect(() => {
    setInputs(prev => {
      let changed = false;
      let newInputs = { ...prev };
      if (newInputs.machineName === 'BWS-250' || newInputs.machineName === 'BWD-200 + BA' || (newInputs.evaluationName && newInputs.evaluationName.includes('BWS-250'))) {
        newInputs.machineName = 'BWD-250';
        newInputs.evaluationName = 'Lavadora y Secadora de Cajas BWD-250';
        newInputs.technicalSheetName = 'Ficha Técnica de Lavadora y Secadora de Cajas BWD-250';
        changed = true;
      }
      return changed ? newInputs : prev;
    });
  }, []);
"""

# Let's just find the existing migration block and replace it
# First, let's find the old block we wrote
pattern = r'// Migración automática para forzar valores de lavado.*?changed \? newInputs : prev;\s*\}\);\s*\}, \[\]\);'
content = re.sub(pattern, migration_hook.strip(), content, flags=re.DOTALL)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated machine model to BWD-250!")
