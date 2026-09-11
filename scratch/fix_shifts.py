import re
import os

filepath = 'src/pages/alpha/simulators/DHLAdvancedSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix the daily production calculation to include shifts
# Find: const dailyProductionBoxes = realProductionPerHourBoxes * ((inputs.hoursPerDay || 16));
# Replace: const dailyProductionBoxes = realProductionPerHourBoxes * (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 2);
content = re.sub(
    r'const dailyProductionBoxes = realProductionPerHourBoxes \* \(\(inputs\.hoursPerDay \|\| 16\)\);',
    r'const dailyProductionBoxes = realProductionPerHourBoxes * (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 2);',
    content
)

# And fix system utilization calculation
# Find: const systemUtilization = capacidadNominalCajasH > 0 ? (dailyGoalBoxes / (capacidadNominalCajasH * (inputs.hoursPerDay || 16))) * 100 : 0;
# Replace: const systemUtilization = capacidadNominalCajasH > 0 ? (dailyGoalBoxes / (capacidadNominalCajasH * (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 2))) * 100 : 0;
content = re.sub(
    r'const systemUtilization = capacidadNominalCajasH > 0 \? \(dailyGoalBoxes / \(capacidadNominalCajasH \* \(inputs\.hoursPerDay \|\| 16\)\)\) \* 100 : 0;',
    r'const systemUtilization = capacidadNominalCajasH > 0 ? (dailyGoalBoxes / (capacidadNominalCajasH * (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 2))) * 100 : 0;',
    content
)

# And fix scenarios
# Find: const escCapDia = escCapH * (inputs.hoursPerDay || 16);
# Replace: const escCapDia = escCapH * (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 2);
content = re.sub(
    r'const escCapDia = escCapH \* \(inputs\.hoursPerDay \|\| 16\);',
    r'const escCapDia = escCapH * (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 2);',
    content
)

# And fix electricity cost daily
content = re.sub(
    r'const dailyElectricityCostMxn = hourlyElectricityCostMxn \* \(inputs\.hoursPerDay \|\| 16\);',
    r'const dailyElectricityCostMxn = hourlyElectricityCostMxn * (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 2);',
    content
)

# And fix water consumption daily
content = re.sub(
    r'const consumoDiarioOperacionL = reposicionTotalLH \* \(inputs\.hoursPerDay \|\| 16\);',
    r'const consumoDiarioOperacionL = reposicionTotalLH * (inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 2);',
    content
)

# 2. Add an effect to auto-migrate old trituradora localStorage values
migration_hook = """
  // Sync project names
  useEffect(() => {
"""
migration_new = """
  // Migración automática para forzar valores de lavado si provienen de caché vieja
  useEffect(() => {
    setInputs(prev => {
      let changed = False;
      let newInputs = { ...prev };
      if (newInputs.machineName === 'BWS-250') {
        newInputs.machineName = 'BWD-200 + BA';
        newInputs.evaluationName = 'Lavadora y Secadora de Cajas BWD-200 + BA';
        newInputs.technicalSheetName = 'Ficha Técnica de Lavadora y Secadora de Cajas BWD-200 + BA';
        changed = True;
      }
      return changed ? newInputs : prev;
    });
  }, []);

  // Sync project names
  useEffect(() => {
"""
migration_new = migration_new.replace("changed = False", "changed = false").replace("changed = True", "changed = true")

if "Migración automática para forzar valores" not in content:
    content = content.replace(migration_hook, migration_new)


# 3. Replace text strings
content = content.replace("Cámara de Trituración", "Cámara de Lavado")
content = content.replace("'TRITURACIÓN'", "'LAVADO'")
content = content.replace("fuerzas dinámicas de trituración", "fuerzas dinámicas de lavado")
content = content.replace("línea de trituración de materiales sólidos", "línea de lavado, enjuague y secado de cajas plásticas")
content = content.replace("Sistema de Trituración", "Sistema de Lavado")


# 4. Fix missing hours in PDF
# Find: <span className="text-slate-800 font-bold">{inputs.hoursPerDay} horas ({inputs.shiftsPerDay || 2} turnos)</span>
# Wait, let's look at how it renders in the screenshot: "horas (2 turnos)"
# It means inputs.hoursPerDay is undefined in that block.
# Let's fix anywhere it says `horas (`
content = re.sub(
    r'\{inputs\.hoursPerDay\}\shoras',
    r'{(inputs.hoursPerDay || 8) * (inputs.shiftsPerDay || 2)} horas',
    content
)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated shifts and texts!")
