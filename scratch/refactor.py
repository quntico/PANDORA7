import re
import os

filepath = 'src/pages/alpha/simulators/DHLAdvancedSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update defaultInputs
content = content.replace("machineName: 'BWS-250'", "machineName: 'BWD-200 + BA'")
content = content.replace("evaluationName: 'Lavadora y Secadora de Cajas BWS-250'", "evaluationName: 'Lavadora y Secadora de Cajas BWD-200 + BA'")
content = content.replace("technicalSheetName: 'Ficha Técnica de Máquina de Lavado BWS-250'", "technicalSheetName: 'Ficha Técnica de Lavadora y Secadora de Cajas BWD-200 + BA'")

# Capacidad y Metas
content = content.replace("dailyGoalKg: 2000, // Meta en cajas", "meta_diaria_cajas: 3000,")
content = content.replace("nominalCapacity: 200, // Cajas por hora", "capacidad_nominal_cajas_h: 200,")

# Dimensiones
content = content.replace("pesoKg: 1800,", "pesoOperativoKg: 1800,\n    pesoSecoKg: 1000,\n    longitudSecadoExternoM: 5.0,\n    volumenAguaOperativoL: 800,")

# Obra Civil
content = content.replace("civilExcavacionM3: 2.0,", "civilCargaPorApoyo: 500,")
content = content.replace("civilConcretoFc: 250,", "civilNumeroApoyos: 6,")
content = content.replace("civilEspesorPisoCm: 15,", "civilDrenajeRequerido: 'Trinchera con rejilla',")
content = content.replace("civilRefuerzoPiso: 'Malla Electrosoldada',", "civilCaudalDescarga: 250,")
content = content.replace("civilCargaSoportada: 5.0,", "civilDiametroTuberia: '4 pulgadas',")
content = content.replace("civilAcabadoPiso: 'Pulido con pintura epóxica',", "civilAlimentacionElectrica: 'Trifásica 440V',")
content = content.replace("civilJuntasDilatacion: 'Sello elastomérico',", "civilDistanciaTablero: 15,")
content = content.replace("civilAnclajeTornillos: 'Taquetes expansivos',", "civilTransformador: 'No',")
content = content.replace("civilCanalizacionesSubterraneas: 'Tubería y Drenaje',", "civilAireComprimido: 'No',")
content = content.replace("civilSistemaVibracion: 'Placas de neopreno',", "civilRequerimientoAgua: 'Toma 1 pulgada',\n    civilVentilacion: 'Campana extractora opcional',")

# Motores
content = content.replace("motorPrincipalHp: 15, // Bomba de agua", "motorBombaAguaHp: 15,")
content = content.replace("motorAuxiliarHp: 10, // Soplador", "motorSopladorHp: 10,\n    motorBandaHp: 0.5,\n    calentamientoElectricoKw: 18.00,\n    secadoresIncluidosEnSoplador: 'No',\n    potenciaSecadoresAdicionalKw: 0,")

# Agua
content = content.replace("waterChangesPerWeek: 1,", "frecuencia_cambio_tanque_dias: 7,")
content = content.replace("waterTankLiters: 1200,", "volumen_tanque_l: 1200,\n    caudal_interno_l_h: 2527,\n    porcentaje_recirculacion: 85,\n    reposicion_por_arrastre_l_h: 145,\n    reposicion_por_evaporacion_l_h: 0,\n    purga_l_h: 0,")

# Garantia
content = content.replace("technicalSheetName: 'Ficha Técnica de Lavadora y Secadora de Cajas BWD-200 + BA',", "technicalSheetName: 'Ficha Técnica de Lavadora y Secadora de Cajas BWD-200 + BA',\n    garantia_estandar_meses: 12,\n    garantia_extendida_meses: 24,\n    alcance_garantia: 'Defectos de fabricación y vicios ocultos',\n    exclusiones: 'Partes de desgaste y daños por mala operación',\n    fecha_inicio_garantia: 'A partir de firma de FAT/SAT',")

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("defaultInputs updated!")
