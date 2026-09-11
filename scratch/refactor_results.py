import re
import os

filepath = 'src/pages/alpha/simulators/DHLAdvancedSimulator.jsx'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

new_results = """
  const results = useMemo(() => {
    // 1. DIMENSIONES Y CAPACIDAD
    const footprintM2 = (inputs.machineLength || 7.0) * (inputs.machineWidth || 1.8);
    
    const capacidadNominalCajasH = inputs.capacidad_nominal_cajas_h || 200;
    // Capacidad real nunca excede la nominal, y se basa en OEE y reducción.
    // También validamos que el layout de la caja no obligue a producir más de 200.
    const realProductionPerHourBoxes = Math.min(
      capacidadNominalCajasH, 
      capacidadNominalCajasH * ((inputs.oee || 85) / 100) * ((inputs.reductionFactor || 90) / 100)
    );
    
    const dailyProductionBoxes = realProductionPerHourBoxes * ((inputs.hoursPerDay || 16));
    const monthlyProductionBoxes = dailyProductionBoxes * (inputs.daysPerMonth || 24);
    const annualProductionBoxes = monthlyProductionBoxes * 12;
    
    const dailyGoalBoxes = inputs.meta_diaria_cajas || 3000;
    const requirementCoverage = dailyGoalBoxes > 0 ? (dailyProductionBoxes / dailyGoalBoxes) * 100 : 0;
    const systemUtilization = capacidadNominalCajasH > 0 ? (dailyGoalBoxes / (capacidadNominalCajasH * (inputs.hoursPerDay || 16))) * 100 : 0;
    const operationalReserve = dailyProductionBoxes - dailyGoalBoxes;
    const hoursRequired = realProductionPerHourBoxes > 0 ? (dailyGoalBoxes / realProductionPerHourBoxes) : 0;

    // 3. ENERGÍA
    const motorBombaAguaKw = (inputs.motorBombaAguaHp || 15) * 0.746;
    const motorSopladorKw = (inputs.motorSopladorHp || 10) * 0.746;
    const motorBandaKw = (inputs.motorBandaHp || 0.5) * 0.746;
    const calentamientoKw = inputs.calentamientoElectricoKw || 18.0;
    
    let potenciaSecadoresAdicionalKw = 0;
    if (inputs.secadoresIncluidosEnSoplador === 'No') {
      potenciaSecadoresAdicionalKw = inputs.potenciaSecadoresAdicionalKw || 0;
    }
    
    const installedPowerKw = motorBombaAguaKw + motorSopladorKw + motorBandaKw + calentamientoKw + potenciaSecadoresAdicionalKw;
    const averageHourlyConsumptionKw = installedPowerKw * ((inputs.loadFactor || 85) / 100);
    const hourlyElectricityCostMxn = averageHourlyConsumptionKw * (inputs.electricityRate || 2.50);
    const dailyElectricityCostMxn = hourlyElectricityCostMxn * (inputs.hoursPerDay || 16);
    const monthlyElectricityCostMxn = dailyElectricityCostMxn * (inputs.daysPerMonth || 24);
    const annualElectricityCostMxn = monthlyElectricityCostMxn * 12;

    const kwhPer1000Boxes = realProductionPerHourBoxes > 0 ? (averageHourlyConsumptionKw / realProductionPerHourBoxes) * 1000 : 0;
    const electricityCostPer1000BoxesMxn = kwhPer1000Boxes * (inputs.electricityRate || 2.50);

    // 3.5. AGUA E HÍDRICO
    const reposicionTotalLH = (inputs.reposicion_por_arrastre_l_h || 145) + (inputs.reposicion_por_evaporacion_l_h || 0) + (inputs.purga_l_h || 0);
    const consumoPorCajaL = realProductionPerHourBoxes > 0 ? (reposicionTotalLH / realProductionPerHourBoxes) : 0;
    const consumoDiarioOperacionL = reposicionTotalLH * (inputs.hoursPerDay || 16);
    const consumoPorCambioTanqueLDia = (inputs.volumen_tanque_l || 1200) / (inputs.frecuencia_cambio_tanque_dias || 7);
    const consumoDiarioTotalL = consumoDiarioOperacionL + consumoPorCambioTanqueLDia;
    const totalWaterMonthlyLiters = consumoDiarioTotalL * (inputs.daysPerMonth || 24);
    const waterCostMonthlyMxn = (totalWaterMonthlyLiters / 1000) * (inputs.waterCostM3 || 35.0);

    // 3.6 ESCENARIOS (70%, 85%, 95%, 100%)
    const scenarios = [
      { name: 'Conservador', oee: 70 },
      { name: 'Normal', oee: 85 },
      { name: 'Alto Rendimiento', oee: 95 },
      { name: 'Máximo Teórico', oee: 100 }
    ].map(esc => {
      const escCapH = Math.min(capacidadNominalCajasH, capacidadNominalCajasH * (esc.oee / 100));
      const escCapDia = escCapH * (inputs.hoursPerDay || 16);
      const escHorasReq = escCapH > 0 ? (dailyGoalBoxes / escCapH) : 0;
      const escCob = dailyGoalBoxes > 0 ? (escCapDia / dailyGoalBoxes) * 100 : 0;
      const escMargen = escCapDia - dailyGoalBoxes;
      return { ...esc, capH: escCapH, capDia: escCapDia, horasReq: escHorasReq, cob: escCob, margen: escMargen };
    });

    // 4. CAPEX
    const precioEquipoUsd = inputs.precioEquipoUsd || 89700;
    const tipoCambio = inputs.tipoCambio || 18.00;
    const ivaUsd = precioEquipoUsd * ((inputs.iva || 16) / 100);
    
    // Todo será capturado en porcentaje o dólares según la función, pero se pide que se muestren
    // los valores reales. Haremos lo mismo, si val>100 asume es USD, sino %.
    const getCapexValue = (val, base) => (val > 100 || val < -100) ? val : base * (val / 100);

    const maniobrasUsd = getCapexValue(inputs.porcentajeManiobras || 0, precioEquipoUsd);
    const montajeMecanicoUsd = getCapexValue(inputs.porcentajeMontajeMecanico || 0, precioEquipoUsd);
    const obraCivilUsd = getCapexValue(inputs.porcentajeObraCivil || 0, precioEquipoUsd);
    const electricoPrincipalUsd = getCapexValue(inputs.porcentajeElectricoPrincipal || 0, precioEquipoUsd);
    const canalizacionProteccionesUsd = getCapexValue(inputs.porcentajeCanalizacionProtecciones || 0, precioEquipoUsd);
    const extraccionPolvoUsd = getCapexValue(inputs.porcentajeExtraccionPolvo || 0, precioEquipoUsd);
    const seguridadIndustrialUsd = getCapexValue(inputs.porcentajeSeguridadIndustrial || 0, precioEquipoUsd);
    const ingenieriaSupervisionUsd = getCapexValue(inputs.porcentajeIngenieriaSupervision || 0, precioEquipoUsd);
    const contingenciaUsd = getCapexValue(inputs.porcentajeContingencia || 0, precioEquipoUsd);
    const otrosCapexUsd = getCapexValue(inputs.otrosCapexUsd || 0, precioEquipoUsd);

    const capexInstaladoUsd = precioEquipoUsd + maniobrasUsd + montajeMecanicoUsd + obraCivilUsd + electricoPrincipalUsd + canalizacionProteccionesUsd + extraccionPolvoUsd + seguridadIndustrialUsd + ingenieriaSupervisionUsd + contingenciaUsd + otrosCapexUsd;
    const capexFiscalUsd = capexInstaladoUsd + ivaUsd;
    const capexInstaladoMxn = capexInstaladoUsd * tipoCambio;

    // 5. OPEX
    const manoObraMensualMxn = inputs.manoObraMensualMxn || 48000;
    const mantenimientoMensualMxn = inputs.mantenimientoMensualMxn || 8275;
    const refaccionesMensualMxn = inputs.refaccionesMensualMxn || 6000;
    
    const opexMensualMxn = (monthlyElectricityCostMxn || 0) + (waterCostMonthlyMxn || 0) + manoObraMensualMxn + mantenimientoMensualMxn + refaccionesMensualMxn + (inputs.quimicosMensualMxn || 0) + (inputs.supervisionMensualMxn || 0) + (inputs.consumiblesMensualMxn || 0) + (inputs.tratamientoEfluentesMensualMxn || 0) + (inputs.disposicionResiduosMensualMxn || 0) + (inputs.otrosOpexMensualMxn || 0);
    
    const opexAnualMxn = opexMensualMxn * 12;
    const opexPorCajaMxn = monthlyProductionBoxes > 0 ? (opexMensualMxn / monthlyProductionBoxes) : 0;
    const opexPor1000CajasMxn = opexPorCajaMxn * 1000;

    // 6. VIABILIDAD FINANCIERA (OPCIONAL O MANTENIDO POR COMPATIBILIDAD)
    let ingresoMensual = 0;
    if (inputs.usarModoIngresoVenta) ingresoMensual = monthlyProductionBoxes * (inputs.precioVentaCajaMxn || 0);
    else if (inputs.usarModoAhorroInterno) ingresoMensual = monthlyProductionBoxes * (inputs.ahorroPorCajaMxn || 0);

    const flujoOperativoMensual = ingresoMensual - opexMensualMxn;
    const flujoOperativoAnual = flujoOperativoMensual * 12;
    const paybackMeses = flujoOperativoMensual > 0 ? (capexInstaladoMxn / flujoOperativoMensual) : Infinity;

    // ESTADO OPERATIVO (DICTAMEN)
    let estadoOperativo = "NO CUMPLE";
    let estadoColor = "text-red-700 bg-red-50 border-red-200";
    let dictamenTexto = "La configuración analizada no cubre la meta diaria bajo el régimen de operación seleccionado. Se requiere ampliar las horas de operación, aumentar la capacidad certificada o evaluar una segunda línea.";
    
    if (requirementCoverage > 110) {
      estadoOperativo = "CUMPLE";
      estadoColor = "text-emerald-600 bg-emerald-50 border-emerald-200";
      dictamenTexto = "La línea cubre la meta diaria con margen operativo.";
    } else if (requirementCoverage >= 100 && requirementCoverage <= 110) {
      estadoOperativo = "CUMPLE CON MARGEN LIMITADO";
      estadoColor = "text-amber-600 bg-amber-50 border-amber-200";
      dictamenTexto = "La línea cubre la meta, pero opera con un margen reducido. Se recomienda validar tiempos de limpieza, mantenimiento, cambios de formato y disponibilidad real.";
    }

    return {
      footprintM2,
      installedPowerKw,
      averageHourlyConsumptionKw,
      realProductionPerHourBoxes,
      totalWaterMonthlyLiters,
      waterCostMonthlyMxn,
      scenarios,
      dailyProductionBoxes,
      monthlyProductionBoxes,
      annualProductionBoxes,
      hourlyElectricityCostMxn,
      dailyElectricityCostMxn,
      monthlyElectricityCostMxn,
      annualElectricityCostMxn,
      kwhPer1000Boxes,
      electricityCostPer1000BoxesMxn,
      systemUtilization,
      requirementCoverage,
      operationalReserve,
      hoursRequired,
      estadoOperativo,
      estadoColor,
      dictamenTexto,
      totalHp: (inputs.motorBombaAguaHp || 15) + (inputs.motorSopladorHp || 10) + (inputs.motorBandaHp || 0.5),
      // CAPEX
      precioEquipoUsd, ivaUsd, maniobrasUsd, montajeMecanicoUsd, obraCivilUsd, electricoPrincipalUsd, canalizacionProteccionesUsd, extraccionPolvoUsd, seguridadIndustrialUsd, ingenieriaSupervisionUsd, contingenciaUsd,
      capexInstaladoUsd, capexFiscalUsd, capexInstaladoMxn,
      // OPEX
      manoObraMensualMxn, mantenimientoMensualMxn, opexMensualMxn, opexAnualMxn, opexPorCajaMxn, opexPor1000CajasMxn,
      // WATER
      reposicionTotalLH, consumoPorCajaL, consumoDiarioOperacionL, consumoPorCambioTanqueLDia, consumoDiarioTotalL
    };
  }, [inputs, currentNominalCapacity]);
"""

start_idx = content.find('const results = useMemo(() => {')
end_idx = content.find('}, [inputs, currentNominalCapacity]);', start_idx) + len('}, [inputs, currentNominalCapacity]);')

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + new_results.strip() + content[end_idx:]
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print("results useMemo updated!")
else:
    print("Could not find results useMemo boundaries.")
