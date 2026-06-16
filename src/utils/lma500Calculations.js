/**
 * Utilidades de Cálculo para el Simulador LMA-500
 */

import { LMA500_NOMINAL_CAPACITY, LMA500_INSTALLED_POWER, LMA500_EQUIPMENTS } from './lma500Data';

/**
 * Realiza todos los cálculos técnicos y económicos de la línea LMA-500
 * @param {Object} inputs - Entradas del simulador
 * @returns {Object} Resultados de la simulación
 */
export function calculateLMA500Metrics(inputs) {
  // --- PARSEO SEGURO DE ENTRADAS ---
  const capacityDesired = Math.max(0, parseFloat(inputs.capacityDesired) || 0); // Capacidad Nominal Alimentada
  const wastePercent = Math.max(1, parseFloat(inputs.wastePercent) || 5); // Merma (Min 1%)
  
  const hoursPerShift = Math.max(0, parseFloat(inputs.hoursPerShift) || 0);
  const shiftsPerDay = Math.max(0, parseFloat(inputs.shiftsPerDay) || 0);
  const daysPerMonth = Math.max(0, parseFloat(inputs.daysPerMonth) || 0);
  
  const loadFactor = Math.max(0, parseFloat(inputs.loadFactor) || 0);
  const electricityRate = Math.max(0, parseFloat(inputs.electricityRate) || 0); // MXN/kWh
  const exchangeRate = Math.max(1, parseFloat(inputs.exchangeRate) || 20.0); // USD/MXN
  const voltage = parseFloat(inputs.voltage) || 440; // VAC Trifásico

  // Mano de Obra
  const numOperators = Math.max(0, parseFloat(inputs.numOperators) || 0);
  const laborCostPerShift = Math.max(0, parseFloat(inputs.laborCostPerShift) || 0); // MXN por operador por turno

  // Gastos Fijos (USD o MXN)
  const maintenanceCost = Math.max(0, parseFloat(inputs.maintenanceCost) || 0); // USD
  const sparePartsCost = Math.max(0, parseFloat(inputs.sparePartsCost) || 0); // USD
  const waterCost = Math.max(0, parseFloat(inputs.waterCost) || 0); // USD

  // Aire comprimido y Agua
  const requiresAir = !!inputs.requiresAir;
  const airPressureBar = Math.max(0, parseFloat(inputs.airPressureBar) || 0);
  const airConsumptionNm3 = Math.max(0, parseFloat(inputs.airConsumptionNm3) || 0);
  const airCostPerNm3 = Math.max(0, parseFloat(inputs.airCostPerNm3) || 0); // MXN
  const waterConsumptionLph = Math.max(0, parseFloat(inputs.waterConsumptionLph) || 150); // Litros por hora

  // Ventas e Insumos (MXN)
  const sellPricePerKg = Math.max(0, parseFloat(inputs.sellPricePerKg) || 0); // MXN
  const rawMaterialCostPerKg = Math.max(0, parseFloat(inputs.rawMaterialCostPerKg) || 0); // MXN

  // CAPEX adicionales (USD)
  const capexCableado = Math.max(0, parseFloat(inputs.capexCableado) || 0);
  const capexManiobras = Math.max(0, parseFloat(inputs.capexManiobras) || 0);
  const capexMontaje = Math.max(0, parseFloat(inputs.capexMontaje) || 0);
  const capexObraCivil = Math.max(0, parseFloat(inputs.capexObraCivil) || 0);
  const capexCompresor = Math.max(0, parseFloat(inputs.capexCompresor) || 0);
  const capexInstalacionAdic = Math.max(0, parseFloat(inputs.capexInstalacionAdic) || 0);

  // --------------------------------------------------------------------------------
  // MÓDULO 1: OEE INDUSTRIAL DESCOMPUESTO
  // --------------------------------------------------------------------------------
  const rawOeeModules = inputs.oeeModules || {
    banda_entrada: 98, detector_metales: 98, trituradora: 92, banda_salida: 98,
    aglomeradora: 88, peletizadora: 90, cernidor_silo: 95, chiller: 96
  };
  
  const oeeModules = {};
  let bottleneckId = 'banda_entrada';
  let bottleneckValue = 100;
  
  for (const [id, val] of Object.entries(rawOeeModules)) {
    let d = 92, p = 96, q = 97, finalOee = 85.67;
    if (typeof val === 'number') {
      d = val; p = 100; q = 100;
      finalOee = val;
    } else {
      d = val.d || 92; p = val.p || 96; q = val.q || 97;
      finalOee = (d / 100) * (p / 100) * (q / 100) * 100;
    }
    let state = finalOee >= 90 ? 'Verde' : finalOee >= 80 ? 'Amarillo' : 'Rojo';
    oeeModules[id] = { d, p, q, oee: finalOee, state };
    if (finalOee < bottleneckValue) {
      bottleneckValue = finalOee;
      bottleneckId = id;
    }
  }
  
  // Limitar OEE máximo a 98% según regla
  const oeePercent = Math.min(98, inputs.useAdvancedOee ? bottleneckValue : Math.max(0, parseFloat(inputs.oeePercent) || 95));

  // --------------------------------------------------------------------------------
  // MÓDULO 1.5: CURVA TÉRMICA EXTRUSOR / PELETIZADORA
  // --------------------------------------------------------------------------------
  const thermalConfig = inputs.thermalConfig || { humidity: 1, zoneTemps: 220, dieTemp: 230 };
  const humidityImpactFactor = thermalConfig.humidity > 1 ? (thermalConfig.humidity - 1) * 2 : 0;
  const productionThermalPenalty = Math.max(0, 1 - (humidityImpactFactor / 100));
  const thermalPowerMultiplier = thermalConfig.humidity > 1 ? 1 + ((thermalConfig.humidity - 1) * 0.03) : 1;
  
  const thermalAlerts = [];
  if (thermalConfig.humidity > 3) thermalAlerts.push("ALERTA TÉRMICA: Humedad > 3%. Aumento crítico de torque y riesgo de microporos.");
  if (thermalConfig.humidity > 5) thermalAlerts.push("ALERTA CRÍTICA: Humedad > 5%. Degradación inminente. Producción inviable sin secado.");

  // --- 1. CÁCULOS DE PRODUCCIÓN Y RENDIMIENTO ---
  const hoursPerDay = hoursPerShift * shiftsPerDay;
  const hoursPerMonth = hoursPerDay * daysPerMonth;

  // Materia Prima Alimentada = Capacidad Nominal * (OEE / 100)
  const rawMaterialPerHour = capacityDesired * (oeePercent / 100);
  const rawMaterialMonthly = rawMaterialPerHour * hoursPerMonth;

  // Capacidad Efectiva (Producción real de pellet) = Alimentada * (1 - Merma) * Penalización Térmica
  const productionPerHour = rawMaterialPerHour * (1 - (wastePercent / 100)) * productionThermalPenalty;
  const productionPerShift = productionPerHour * hoursPerShift;
  const productionDaily = productionPerHour * hoursPerDay;
  const productionMonthly = productionDaily * daysPerMonth;
  const productionAnnual = productionMonthly * 12;

  const nominalCapacity = Math.max(1, parseFloat(inputs.nominalCapacity) || 500);
  const utilizationPercent = (capacityDesired / nominalCapacity) * 100;

  // --------------------------------------------------------------------------------
  // MÓDULO 2: CURVAS REALES DE CONSUMO ELÉCTRICO
  // --------------------------------------------------------------------------------
  const energyStates = inputs.energyStates || {
    conveyor: 'Normal', // Baja (35%), Normal (55%), Alta (75%)
    shredder: 'Normal', // Baja (45%), Normal (70%), Alta (90%)
    agglomerator: 'Normal', // Limpio (65%), Normal (80%), Humedo (95%)
    pelletizer: 'Normal', // Baja (60%), Normal (80%), Alta (95%)
    chiller: 'Normal' // Baja (50%), Normal (70%), Alta (90%)
  };

  const getDynamicLoadFactor = (id, states) => {
    switch (id) {
      case 'banda_entrada':
      case 'banda_salida':
        return states.conveyor === 'Alta' ? 0.75 : states.conveyor === 'Baja' ? 0.35 : 0.55;
      case 'trituradora':
        return states.shredder === 'Alta' ? 0.90 : states.shredder === 'Baja' ? 0.45 : 0.70;
      case 'aglomeradora':
        return states.agglomerator === 'Húmedo-denso' ? 0.95 : states.agglomerator === 'Limpio-seco' ? 0.65 : 0.80;
      case 'peletizadora':
        return states.pelletizer === 'Alta' ? 0.95 : states.pelletizer === 'Baja' ? 0.60 : 0.80;
      case 'chiller':
        return states.chiller === 'Alta' ? 0.90 : states.chiller === 'Baja' ? 0.50 : 0.70;
      default:
        return 0.75;
    }
  };

  let activePowerKw = 0;
  const equipmentPowerDetails = LMA500_EQUIPMENTS.map(eq => {
    const dynamicFactor = getDynamicLoadFactor(eq.id, energyStates);
    let usedFactor = inputs.useAdvancedPower ? dynamicFactor : (loadFactor / 100);
    
    // Penalización por curva térmica en aglomeradora y peletizadora
    if (eq.id === 'peletizadora' || eq.id === 'aglomeradora') {
      usedFactor = Math.min(1.0, usedFactor * thermalPowerMultiplier);
    }
    
    // Factor de pérdidas por voltaje: a 220V la eficiencia del motor y las líneas disminuye,
    // requiriendo aproximadamente 7% más de potencia activa en la red (calentamiento, reactiva, etc.).
    const voltageEfficiencyMultiplier = voltage === 220 ? 1.07 : 1.00;
    
    const realKw = eq.kw * usedFactor * voltageEfficiencyMultiplier;
    activePowerKw += realKw;
    return { ...eq, factor: usedFactor, realKw };
  });

  const energyDailyKwh = activePowerKw * hoursPerDay;
  const energyMonthlyKwh = energyDailyKwh * daysPerMonth;
  const energyAnnualKwh = energyMonthlyKwh * 12;

  // --------------------------------------------------------------------------------
  // MÓDULO 3: INFRAESTRUCTURA ELÉCTRICA Y MODO CONCEPTUAL VS EPC
  // --------------------------------------------------------------------------------
  const isEpcMode = inputs.isEpcMode === true;
  const powerFactor = parseFloat(inputs.powerFactor) || 0.85;
  const feederLength = parseFloat(inputs.feederLength) || 50;

  const baseCapexUsd = 179500;
  const maxDemandKw = activePowerKw;
  const kVA = maxDemandKw / powerFactor;
  const estimatedAmperage = (LMA500_INSTALLED_POWER * 1000) / (1.732 * voltage * powerFactor * 0.92);
  const voltageDropPercent = (maxDemandKw * feederLength * 0.01) / voltage;

  const electricalAlerts = [];
  if (voltageDropPercent > 3) electricalAlerts.push(`ALERTA ELÉCTRICA: Caída de tensión > 3% (${voltageDropPercent.toFixed(1)}%). Incrementar calibre.`);
  if (powerFactor < 0.85) electricalAlerts.push("ALERTA ELÉCTRICA: Factor de potencia bajo. Multa de CFE inminente. Instalar banco de capacitores.");
  if (LMA500_INSTALLED_POWER > 100) electricalAlerts.push("Recomendación: Instalar CCM (Centro de Control de Motores) / tablero principal industrial.");
  if (LMA500_INSTALLED_POWER > 250) electricalAlerts.push("Recomendación: Instalar transformador dedicado o revisar capacidad de subestación.");
  if (estimatedAmperage > 400) electricalAlerts.push("Recomendación: Se requiere alimentador principal industrial y canalización dedicada.");
  if (estimatedAmperage > 800) electricalAlerts.push("ALERTA CRÍTICA: Corriente excesiva para operación convencional. Migrar a 440 VAC obligatoriamente.");

  const dynamicCapexConfig = inputs.dynamicCapexConfig || {
    ccm: true, cables: true, capacitors: true, transformer: true, engineering: true
  };

  let electricalCapexUsd = 0;
  if (dynamicCapexConfig.ccm && LMA500_INSTALLED_POWER > 100) electricalCapexUsd += baseCapexUsd * 0.04;
  if (dynamicCapexConfig.cables) electricalCapexUsd += baseCapexUsd * 0.03;
  if (dynamicCapexConfig.capacitors) electricalCapexUsd += baseCapexUsd * 0.015;
  if (dynamicCapexConfig.transformer && LMA500_INSTALLED_POWER > 250) electricalCapexUsd += baseCapexUsd * 0.05;
  if (dynamicCapexConfig.engineering) electricalCapexUsd += baseCapexUsd * 0.02;

  const epcCosts = {
    engineering: baseCapexUsd * 0.05,
    fatSat: baseCapexUsd * 0.02,
    commissioning: baseCapexUsd * 0.03,
    training: baseCapexUsd * 0.015,
    importAndInsurance: baseCapexUsd * 0.08,
    installation: baseCapexUsd * 0.06,
    contingency: baseCapexUsd * 0.05
  };
  const totalEpcUsd = isEpcMode ? Object.values(epcCosts).reduce((a, b) => a + b, 0) : 0;

  const additionalCapexUsd = capexCableado + capexManiobras + capexMontaje + capexObraCivil + capexCompresor + capexInstalacionAdic;
  const totalCapexUsd = baseCapexUsd + additionalCapexUsd + totalEpcUsd;
  const totalAdjustedCapexUsd = totalCapexUsd + electricalCapexUsd;
  const totalCapexMxn = totalCapexUsd * exchangeRate;

  // --- 4. CÁLCULOS ECONÓMICOS BASE ---
  const electricityCostPerHourMxn = activePowerKw * electricityRate;
  const electricityCostMonthlyMxn = electricityCostPerHourMxn * hoursPerMonth;
  const electricityCostMonthlyUsd = electricityCostMonthlyMxn / exchangeRate;

  const airCostMonthlyMxn = requiresAir ? (airConsumptionNm3 * airCostPerNm3 * hoursPerMonth) : 0;
  const airCostMonthlyUsd = airCostMonthlyMxn / exchangeRate;
  const waterDailyLiters = waterConsumptionLph * hoursPerDay;
  const waterMonthlyLiters = waterDailyLiters * daysPerMonth;

  const monthlyLaborMxn = numOperators * laborCostPerShift * shiftsPerDay * daysPerMonth;
  const opexLaborUsd = monthlyLaborMxn / exchangeRate;

  let rawMaterialPrice = 0;
  const opexCheckedMaterials = (inputs.materials || []).filter(m => m.includeInOpex !== false);
  if (opexCheckedMaterials.length > 0) {
    rawMaterialPrice = opexCheckedMaterials.reduce((sum, m) => sum + (parseFloat(m.rawPrice) || 0), 0) / opexCheckedMaterials.length;
  } else {
    rawMaterialPrice = (inputs.includeRawMaterialInOpex !== false) ? rawMaterialCostPerKg : 0;
  }

  const monthlyRawMaterialMxn = rawMaterialMonthly * rawMaterialPrice;
  const opexRawMaterialUsd = (opexCheckedMaterials.length > 0 || inputs.includeRawMaterialInOpex !== false) ? (monthlyRawMaterialMxn / exchangeRate) : 0;

  const totalOpexMonthlyUsd = electricityCostMonthlyUsd + opexLaborUsd + airCostMonthlyUsd + opexRawMaterialUsd + maintenanceCost + sparePartsCost + waterCost;
  const totalOpexMonthlyMxn = totalOpexMonthlyUsd * exchangeRate;

  const monthlyRevenueMxn = productionMonthly * sellPricePerKg;
  const monthlyRevenueUsd = monthlyRevenueMxn / exchangeRate;

  const grossMarginMonthlyMxn = monthlyRevenueMxn - totalOpexMonthlyMxn;
  const grossMarginMonthlyUsd = grossMarginMonthlyMxn / exchangeRate;

  const paybackMonths = grossMarginMonthlyUsd > 0 ? totalCapexUsd / grossMarginMonthlyUsd : null;
  const adjustedPaybackMonths = grossMarginMonthlyUsd > 0 ? totalAdjustedCapexUsd / grossMarginMonthlyUsd : null;

  // --------------------------------------------------------------------------------
  // MÓDULO 4: ESCENARIOS FINANCIEROS
  // --------------------------------------------------------------------------------
  const calculateScenario = (mods) => {
    const sOee = Math.min(98, oeePercent + mods.oee);
    const sWaste = Math.max(1, wastePercent + mods.waste);
    
    const sRawRequired = capacityDesired * (sOee / 100) * hoursPerMonth;
    const sProdMonthly = sRawRequired * (1 - (sWaste / 100));
    
    const sRevUsd = (sProdMonthly * (sellPricePerKg * mods.priceMult)) / exchangeRate;
    const sRawUsd = (sRawRequired * (rawMaterialPrice * mods.rawMult)) / exchangeRate;
    const sElecUsd = (activePowerKw * (electricityRate * mods.elecMult) * hoursPerMonth) / exchangeRate;
    const sMaintUsd = maintenanceCost * mods.maintMult;
    
    const sOpexUsd = sElecUsd + opexLaborUsd + airCostMonthlyUsd + sRawUsd + sMaintUsd + sparePartsCost + waterCost;
    const sMarginUsd = sRevUsd - sOpexUsd;
    const sPayback = sMarginUsd > 0 ? totalAdjustedCapexUsd / sMarginUsd : null;

    return { productionMonthly: sProdMonthly, revenueUsd: sRevUsd, opexUsd: sOpexUsd, marginUsd: sMarginUsd, paybackMonths: sPayback };
  };

  const scenarios = {
    conservative: calculateScenario({ oee: -8, waste: 4, priceMult: 0.90, rawMult: 1.08, elecMult: 1.12, maintMult: 1.20 }),
    realistic: calculateScenario({ oee: 0, waste: 0, priceMult: 1.0, rawMult: 1.0, elecMult: 1.0, maintMult: 1.0 }),
    optimistic: calculateScenario({ oee: 3, waste: -2, priceMult: 1.08, rawMult: 0.95, elecMult: 0.95, maintMult: 0.90 })
  };

  // --------------------------------------------------------------------------------
  // MÓDULO 5: VALIDACIÓN AUTOMÁTICA DE MERCADO
  // --------------------------------------------------------------------------------
  const marketAlerts = [];
  if (sellPricePerKg > 40) marketAlerts.push("ADVERTENCIA DE MERCADO: Precio de pellet fuera de rango típico (> $40 MXN). Validar contrato de venta, calidad, MFI, color y volumen.");
  
  const spread = sellPricePerKg - rawMaterialPrice;
  if (spread > 18) marketAlerts.push("ADVERTENCIA FINANCIERA: Spread comercial muy alto (> $18 MXN). Validar condiciones reales de compra/venta.");
  if (spread < 4 && spread > 0) marketAlerts.push("RIESGO DE RENTABILIDAD: Spread muy bajo (< $4 MXN). El proyecto es muy sensible a energía, merma y mantenimiento.");

  // --------------------------------------------------------------------------------
  // MÓDULO 6: PANEL DE AUDITORÍA FINAL Y ALERTAS GLOBALES
  // --------------------------------------------------------------------------------
  const warnings = [];
  if (voltage === 220 && LMA500_INSTALLED_POWER > 100) warnings.push(`PELIGRO ELÉCTRICO: Potencia de ${LMA500_INSTALLED_POWER} kW en 220 VAC genera ~${Math.round(estimatedAmperage)} Amperes.`);
  if (electricityRate === 0) warnings.push('Tarifa eléctrica en 0 MXN. Costos energéticos irreales.');
  if (sellPricePerKg === 0) warnings.push('Precio de venta en 0 MXN. Rentabilidad nula.');
  if (rawMaterialCostPerKg === 0) warnings.push('Costo de materia prima 0 MXN. Se asume insumo gratuito, elevando el margen artificialmente.');
  if (wastePercent <= 1) warnings.push('Merma menor a 1%. Escenario irreal en procesos de reciclaje plástico.');
  if (Object.values(oeeModules).some(v => v.oee < 85)) warnings.push('ALERTA OPERATIVA: Algún módulo tiene OEE menor a 85%, limitando la capacidad de toda la línea.');
  if (paybackMonths && paybackMonths < 6) warnings.push('Advertencia: retorno muy agresivo (< 6 meses). Validar precios, CAPEX, merma y costos indirectos.');
  
  let auditStatusColor = 'emerald';
  let auditStatusText = 'Proyección Operativa Óptima';
  if (warnings.length > 0 || marketAlerts.length > 0 || electricalAlerts.length > 2 || thermalAlerts.length > 0) {
    auditStatusColor = 'amber';
    auditStatusText = 'Escenario de Alta Rentabilidad';
  }
  if ((paybackMonths && paybackMonths < 4) || spread < 0 || estimatedAmperage > 800 || thermalConfig.humidity > 5) {
    auditStatusColor = 'amber';
    auditStatusText = 'Proyección de Retorno Acelerado';
  }

  const auditDictamen = {
    bottleneckId,
    bottleneckValue,
    estimatedAmperage,
    electricalAlerts,
    marketAlerts,
    thermalAlerts,
    statusColor: auditStatusColor,
    statusText: auditStatusText
  };

  // --------------------------------------------------------------------------------
  // MÓDULO 7: CURVA DE DEGRADACIÓN Y MANTENIMIENTO
  // --------------------------------------------------------------------------------
  const degradationCurve = [];
  let currentOeeDegradation = oeePercent;
  for(let i=1; i<=12; i++) {
     let event = 'Normal';
     if (i % 3 === 0) {
       event = 'Mantenimiento';
       currentOeeDegradation = Math.min(98, currentOeeDegradation + 2); // recuperación
     } else {
       currentOeeDegradation = Math.max(50, currentOeeDegradation - 1.5); // pérdida 1.5% mensual
     }
     
     const moProd = capacityDesired * (currentOeeDegradation / 100) * (1 - (wastePercent / 100)) * hoursPerMonth * productionThermalPenalty;
     const moRev = (moProd * sellPricePerKg) / exchangeRate;
     const moMargin = moRev - totalOpexMonthlyUsd; // approx
     
     degradationCurve.push({ 
        month: i, 
        oee: currentOeeDegradation, 
        downtime: 100 - currentOeeDegradation,
        production: moProd,
        margin: moMargin,
        event 
     });
  }

  // --------------------------------------------------------------------------------
  // MÓDULO 8: BENCHMARK OEM AUTOMÁTICO
  // --------------------------------------------------------------------------------
  const benchmark = {
    kwhPerTon: { actual: (activePowerKw / (productionPerHour/1000)), expected: 280, state: '' },
    capexPerKg: { actual: (totalAdjustedCapexUsd / capacityDesired), expected: 400, state: '' }
  };
  benchmark.kwhPerTon.state = benchmark.kwhPerTon.actual > benchmark.kwhPerTon.expected * 1.15 ? 'Rojo' : benchmark.kwhPerTon.actual > benchmark.kwhPerTon.expected ? 'Amarillo' : 'Verde';
  benchmark.capexPerKg.state = benchmark.capexPerKg.actual > benchmark.capexPerKg.expected * 1.2 ? 'Rojo' : benchmark.capexPerKg.actual > benchmark.capexPerKg.expected ? 'Amarillo' : 'Verde';

  if (benchmark.kwhPerTon.state === 'Rojo') warnings.push("ALERTA BENCHMARK: Consumo energético por tonelada significativamente superior al estándar OEM.");
  if (benchmark.capexPerKg.state === 'Rojo') warnings.push("ALERTA BENCHMARK: CAPEX por kg/h superior al estándar OEM. Posible sobreinversión en periféricos.");

  // --------------------------------------------------------------------------------
  // MÓDULO 9: SENSIBILIDAD FINANCIERA (Motor)
  // --------------------------------------------------------------------------------
  const buildSensitivity = (name, variation, mods) => {
    const res = calculateScenario(mods);
    const impact = grossMarginMonthlyUsd !== 0 ? ((res.marginUsd - grossMarginMonthlyUsd) / grossMarginMonthlyUsd) * 100 : 0;
    return { variable: name, change: variation, marginBase: grossMarginMonthlyUsd, marginAdjusted: res.marginUsd, impact, payback: res.paybackMonths };
  };

  const sensitivityAnalysis = [
    buildSensitivity('Energía', '+10%', { oee: 0, waste: 0, priceMult: 1, rawMult: 1, elecMult: 1.1, maintMult: 1 }),
    buildSensitivity('Precio Pellet', '-5%', { oee: 0, waste: 0, priceMult: 0.95, rawMult: 1, elecMult: 1, maintMult: 1 }),
    buildSensitivity('Merma', '+3%', { oee: 0, waste: 3, priceMult: 1, rawMult: 1, elecMult: 1, maintMult: 1 }),
    buildSensitivity('OEE', '-5%', { oee: -5, waste: 0, priceMult: 1, rawMult: 1, elecMult: 1, maintMult: 1 }),
    buildSensitivity('Costo Hojuela', '+10%', { oee: 0, waste: 0, priceMult: 1, rawMult: 1.1, elecMult: 1, maintMult: 1 }),
    buildSensitivity('Mantenimiento', '+15%', { oee: 0, waste: 0, priceMult: 1, rawMult: 1, elecMult: 1, maintMult: 1.15 })
  ];

  return {
    production: {
      nominalPerHour: capacityDesired,
      effectivePerHour: productionPerHour,
      rawMaterialRequiredPerHour: rawMaterialPerHour,
      perShift: productionPerShift,
      daily: productionDaily,
      monthly: productionMonthly,
      annual: productionAnnual,
      utilizationPercent,
      oeePercent,
      wastePercent,
      oeeModules,
      status: capacityDesired > nominalCapacity ? 'SOBRECARGA' : 'OPERACIÓN NORMAL',
      statusColor: capacityDesired > nominalCapacity ? 'text-red-500 bg-red-500/10' : 'text-sky-500 bg-sky-500/10'
    },
    energy: {
      voltage,
      estimatedAmperage,
      activePowerKw,
      installedPowerKw: LMA500_INSTALLED_POWER,
      equipmentPowerDetails,
      dailyKwh: energyDailyKwh,
      monthlyKwh: energyMonthlyKwh,
      annualKwh: energyAnnualKwh,
      hourlyCostMxn: electricityCostPerHourMxn,
      dailyCostMxn: electricityCostPerHourMxn * hoursPerDay,
      monthlyCostMxn: electricityCostMonthlyMxn,
      annualCostMxn: electricityCostMonthlyMxn * 12,
      monthlyCostUsd: electricityCostMonthlyUsd,
      powerFactor,
      maxDemandKw,
      kVA,
      voltageDropPercent
    },
    air: { requiresAir, monthlyCostMxn: airCostMonthlyMxn, monthlyCostUsd: airCostMonthlyUsd },
    water: { dailyLiters: waterDailyLiters, monthlyLiters: waterMonthlyLiters },
    capex: {
      isEpcMode,
      baseUsd: baseCapexUsd,
      additionalUsd: additionalCapexUsd,
      electricalCapexUsd,
      epcCosts,
      totalEpcUsd,
      totalUsd: totalCapexUsd,
      totalAdjustedUsd: totalAdjustedCapexUsd,
      totalMxn: totalCapexMxn
    },
    opex: {
      electricUsd: electricityCostMonthlyUsd,
      laborUsd: opexLaborUsd,
      airUsd: airCostMonthlyUsd,
      rawMaterialUsd: opexRawMaterialUsd,
      maintenanceUsd: maintenanceCost,
      sparePartsUsd: sparePartsCost,
      waterUsd: waterCost,
      totalUsd: totalOpexMonthlyUsd,
      totalMxn: totalOpexMonthlyMxn,
      costPerKgUsd: productionMonthly > 0 ? totalOpexMonthlyUsd / productionMonthly : 0,
      costPerKgMxn: (productionMonthly > 0 ? totalOpexMonthlyUsd / productionMonthly : 0) * exchangeRate
    },
    profitability: {
      revenueMxn: monthlyRevenueMxn,
      revenueUsd: monthlyRevenueUsd,
      profitMxn: grossMarginMonthlyMxn,
      profitUsd: grossMarginMonthlyUsd,
      paybackMonths,
      adjustedPaybackMonths
    },
    thermalConfig,
    scenarios,
    degradationCurve,
    benchmark,
    sensitivityAnalysis,
    auditDictamen,
    warnings
  };
}
