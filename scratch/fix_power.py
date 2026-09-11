import re
import os

filepath = 'src/pages/alpha/simulators/DHLAdvancedSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update migration hook to clear customInstalledPowerKw if it's 18
# Actually, the user's local cache has it. I'll just forcefully delete customInstalledPowerKw if it's 18 or 37.02 so it falls back to the sum, OR just set it to 37.02.
# Let's find the migration hook:
old_migration = r'if \(newInputs\.machineName === \'BWS-250\' \|\| newInputs\.machineName === \'BWD-200 \+ BA\' \|\| \(newInputs\.evaluationName && newInputs\.evaluationName\.includes\(\'BWS-250\'\)\)\) \{'
new_migration = """if (newInputs.machineName === 'BWS-250' || newInputs.machineName === 'BWD-200 + BA' || (newInputs.evaluationName && newInputs.evaluationName.includes('BWS-250'))) {
        newInputs.machineName = 'BWD-250';
        newInputs.evaluationName = 'Lavadora y Secadora de Cajas BWD-250';
        newInputs.technicalSheetName = 'Ficha Técnica de Lavadora y Secadora de Cajas BWD-250';
        if (newInputs.customInstalledPowerKw === 18) {
          newInputs.customInstalledPowerKw = 37.02;
        }
        changed = true;
      }
      
      // Also catch if they already migrated but have the bad power value
      if (newInputs.machineName === 'BWD-250' && newInputs.customInstalledPowerKw === 18) {
        newInputs.customInstalledPowerKw = 37.02;
        changed = true;
      }"""
content = re.sub(old_migration, new_migration, content)

# 2. In defaultInputs, change customInstalledPowerKw: 18 to 37.02
content = content.replace("customInstalledPowerKw: 18, // Calentamiento", "customInstalledPowerKw: 37.02,")

# 3. Update the UI input field
# Find: <input type="number" step="0.1" value={inputs.calentamientoElectricoKw || 0} onChange={e => setInputs(p => ({...p, customInstalledPowerKw: parseFloat(e.target.value) || 0}))} ... />
old_input = r'<input type="number" step="0\.1" value=\{inputs\.calentamientoElectricoKw \|\| 0\} onChange=\{e => setInputs\(p => \(\{\.\.\.p, customInstalledPowerKw: parseFloat\(e\.target\.value\) \|\| 0\}\)\)\} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1\.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />'
new_input = r'<input type="number" step="0.1" value={inputs.customInstalledPowerKw !== undefined ? inputs.customInstalledPowerKw : 37.02} onChange={e => setInputs(p => ({...p, customInstalledPowerKw: parseFloat(e.target.value) || 0}))} className="w-full bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-800 focus:border-cyan-500 focus:outline-none" />'
content = re.sub(old_input, new_input, content)

# 4. Update the logic in results useMemo
# Find: const installedPowerKw = motorBombaAguaKw + motorSopladorKw + motorBandaKw + calentamientoKw + potenciaSecadoresAdicionalKw;
old_power = r'const installedPowerKw = motorBombaAguaKw \+ motorSopladorKw \+ motorBandaKw \+ calentamientoKw \+ potenciaSecadoresAdicionalKw;'
new_power = """const baseSumPowerKw = motorBombaAguaKw + motorSopladorKw + motorBandaKw + calentamientoKw + potenciaSecadoresAdicionalKw;
    const installedPowerKw = inputs.customInstalledPowerKw !== undefined ? inputs.customInstalledPowerKw : baseSumPowerKw;"""
content = re.sub(old_power, new_power, content)


with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)
print("Updated Power Input logic!")
