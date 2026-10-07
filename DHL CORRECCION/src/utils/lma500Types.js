/**
 * Definiciones de Tipos JSDoc para el Simulador LMA-500
 */

/**
 * @typedef {Object} LMA500Inputs
 * @property {number} capacityDesired - Capacidad deseada en kg/h (Máximo 500)
 * @property {number} hoursPerShift - Horas laboradas por turno
 * @property {number} shiftsPerDay - Número de turnos por día (1, 2 o 3)
 * @property {number} daysPerMonth - Días operativos al mes (Máximo 31)
 * @property {string} materialType - Tipo de material seleccionado (PE, PP, HDPE, etc.)
 * @property {string} customMaterialName - Nombre personalizado si el material es 'custom'
 * @property {number} loadFactor - Factor de carga eléctrica de la línea %
 * @property {number} electricityRate - Tarifa eléctrica en MXN por kWh
 * @property {number} exchangeRate - Tipo de cambio comercial USD/MXN
 * @property {number} numOperators - Número de operadores requeridos en la línea
 * @property {number} laborCostPerShift - Costo promedio de mano de obra por operador por turno (MXN)
 * @property {number} maintenanceCost - Costo mensual estimado de mantenimiento preventivo (USD)
 * @property {number} sparePartsCost - Presupuesto mensual para refacciones y consumibles (USD)
 * @property {number} waterCost - Costo mensual de consumo de agua si aplica (USD)
 * @property {boolean} requiresAir - Switch indicador si la línea requiere aire comprimido
 * @property {number} airPressureBar - Presión del sistema neumático en bar
 * @property {number} airConsumptionNm3 - Consumo neumático en Nm³/h
 * @property {number} airCostPerNm3 - Costo unitario por Nm³ de aire comprimido (MXN)
 * @property {number} capexCableado - CAPEX adicional: Acometida y cableado de potencia (USD)
 * @property {number} capexManiobras - CAPEX adicional: Maniobras de carga y descarga de maquinaria (USD)
 * @property {number} capexMontaje - CAPEX adicional: Ensamble mecánico e instalación (USD)
 * @property {number} capexObraCivil - CAPEX adicional: Cimentaciones y adecuaciones de nave (USD)
 * @property {number} capexCompresor - CAPEX adicional: Compresor de tornillo y tanque de aire (USD)
 * @property {number} capexInstalacionAdic - CAPEX adicional: Otras adecuaciones periféricas (USD)
 * @property {number} sellPricePerKg - Precio comercial estimado de venta por kg de pellet reciclado (MXN)
 * @property {number} rawMaterialCostPerKg - Costo de adquisición de la hojuela / materia prima por kg (MXN)
 */

/**
 * @typedef {Object} LMA500Results
 * @property {Object} production
 * @property {number} production.perHour - Producción por hora (kg)
 * @property {number} production.perShift - Producción por turno (kg)
 * @property {number} production.daily - Producción diaria (kg)
 * @property {number} production.monthly - Producción mensual (kg)
 * @property {number} production.annual - Producción anual (kg)
 * @property {number} production.utilizationPercent - Porcentaje de utilización vs 500 kg/h
 * @property {string} production.status - Estado operativo (SOBRECARGA, OPERACIÓN ALTA, etc.)
 * @property {string} production.statusColor - Clases CSS del estado operativo
 * 
 * @property {Object} energy
 * @property {number} energy.activePowerKw - Demanda real activa (kW)
 * @property {number} energy.dailyKwh - Consumo diario (kWh)
 * @property {number} energy.monthlyKwh - Consumo mensual (kWh)
 * @property {number} energy.annualKwh - Consumo anual (kWh)
 * @property {number} energy.hourlyCostMxn - Costo energético por hora (MXN)
 * @property {number} energy.dailyCostMxn - Costo energético por día (MXN)
 * @property {number} energy.monthlyCostMxn - Costo energético por mes (MXN)
 * @property {number} energy.annualCostMxn - Costo energético por año (MXN)
 * @property {number} energy.monthlyCostUsd - Costo energético por mes (USD)
 * 
 * @property {Object} air
 * @property {boolean} air.requiresAir - Indica si se calculó aire comprimido
 * @property {number} air.monthlyCostMxn - Costo mensual de aire comprimido (MXN)
 * @property {number} air.monthlyCostUsd - Costo mensual de aire comprimido (USD)
 * 
 * @property {Object} capex
 * @property {number} capex.baseUsd - Inversión base fija (179,500 USD)
 * @property {number} capex.additionalUsd - Suma de adicionales (USD)
 * @property {number} capex.totalUsd - Inversión total (USD)
 * @property {number} capex.totalMxn - Inversión total (MXN)
 * 
 * @property {Object} opex
 * @property {number} opex.electricUsd - Costo de electricidad (USD/mes)
 * @property {number} opex.laborUsd - Costo de mano de obra (USD/mes)
 * @property {number} opex.airUsd - Costo de aire comprimido (USD/mes)
 * @property {number} opex.rawMaterialUsd - Costo de materia prima (USD/mes)
 * @property {number} opex.maintenanceUsd - Costo de mantenimiento (USD/mes)
 * @property {number} opex.sparePartsUsd - Costo de refacciones (USD/mes)
 * @property {number} opex.waterUsd - Costo de agua (USD/mes)
 * @property {number} opex.totalUsd - OPEX total mensual (USD)
 * @property {number} opex.totalMxn - OPEX total mensual (MXN)
 * @property {number} opex.costPerKgUsd - Costo operativo por kg procesado (USD)
 * @property {number} opex.costPerKgMxn - Costo operativo por kg procesado (MXN)
 * 
 * @property {Object} profitability
 * @property {number} profitability.revenueMxn - Ingresos mensuales (MXN)
 * @property {number} profitability.revenueUsd - Ingresos mensuales (USD)
 * @property {number} profitability.profitMxn - Utilidad bruta mensual (MXN)
 * @property {number} profitability.profitUsd - Utilidad bruta mensual (USD)
 * @property {number|null} profitability.paybackMonths - Período de recuperación en meses (simple)
 * 
 * @property {string[]} warnings - Advertencias económicas o técnicas activas
 */
export default {};
