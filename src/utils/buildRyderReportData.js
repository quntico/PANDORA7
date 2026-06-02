/**
 * buildRyderReportData.js
 * Transforma el estado vivo del simulador RYDER en el objeto reportData
 * que consume RyderReportModal. NO recalcula nada — solo mapea.
 */
export function buildRyderReportData({
  inputs,
  computedRows,
  scenarioResults,
  mixScenarioResults,
  CUSTOMER_SCENARIOS,
  MACHINE_CONFIGS,
  selectedRow,
  physicalMaxMH,
  simulatorName,
  installedPowerKw,
  washFlowLh,
  waterReplenishLh,
  tankCapacityL,
  waterChangeDays,
  clientName,
  customerName,
}) {
  const fmt = (v, d = 0) =>
    new Intl.NumberFormat('es-MX', {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(v);

  // ── capDia Y1 usando el selectedRow y el primer escenario ───────────────
  const y1Scenario = scenarioResults?.lavadoSecado?.[0];
  const capDiaY1   = y1Scenario
    ? +(y1Scenario.machineBoxesPerHour * y1Scenario.availableDailyTime).toFixed(0)
    : +(selectedRow?.boxesPerDay ?? 0).toFixed(0);

  // ── requerimiento total diario (suma de todos los modelos activos) ───────
  const reqTotalDia = computedRows
    .filter(r => r.included !== false && r.requiredDaily > 0)
    .reduce((s, r) => s + r.requiredDaily, 0);

  // ── utilización de la máquina en base a requerimiento diario ─────────────
  const speedMH = +(inputs.manualSpeed * 60).toFixed(2);
  const maxMH   = physicalMaxMH ?? 140;
  const utilPct = capDiaY1 > 0 ? (reqTotalDia / capDiaY1) * 100 : 0;

  // ── promedio de capacidad por hora (solo filas con datos) ───────────────
  const activeRows = computedRows.filter(r => r.realBoxesHr > 0);
  const avgCapHr   = activeRows.length
    ? activeRows.reduce((s, r) => s + r.realBoxesHr, 0) / activeRows.length
    : 0;

  // ── cobertura Y1 ────────────────────────────────────────────────────────
  const coberturaY1 = reqTotalDia > 0 ? +((capDiaY1 / reqTotalDia) * 100).toFixed(1) : 0;

  // ── tabla de modelos ─────────────────────────────────────────────────────
  const modelTable = computedRows.map(r => ({
    mod:     r.label,
    nombre:  r.name,
    l:       r.l,
    w:       r.w,
    h:       r.h,
    capHora: +r.realBoxesHr.toFixed(1),
    capDia:  Math.round(r.boxesPerDay),
    reqDia:  r.requiredDaily > 0 ? r.requiredDaily : null,
    hrsReq:  r.requiredDaily > 0 ? +r.requiredHours.toFixed(1) : null,
    suciedad: r.suciedad || 'Polvo',
    estado:  r.requiredDaily > 0
      ? (r.requiredHours <= r.totalHoursDay ? 'VIABLE' : 'EXCEDE')
      : 'N/A',
  }));

  // ── tabla Y1-Y5 (lavadoSecado, referencia al selectedRow) ───────────────
  const scenRows = (scenarioResults?.lavadoSecado ?? []).map(r => ({
    year:              r.year,
    hrsBase:           r.hrsBase,
    hrsEfTurno:        +r.effectiveHoursPerShift.toFixed(2),
    turnos:            r.shifts,
    tiempoDisponible:  +r.availableDailyTime.toFixed(2),
    reqHora:           +r.requiredPerHour.toFixed(1),
    capHora:           +r.machineBoxesPerHour.toFixed(1),
    balance:           +r.deficitOrSurplus.toFixed(1),
    cobertura:         +((r.coverageRatio ?? 0) * 100).toFixed(1),
    lineas:            r.requiredLines + (r.requiredLines === 1 ? ' maq.' : ' maqs.'),
  }));

  // ── conclusiones automáticas ─────────────────────────────────────────────
  const allViable   = modelTable.filter(r => r.reqDia > 0).every(r => r.estado === 'VIABLE');
  const maxLines    = Math.max(...(scenRows.map(r => parseInt(r.lineas)) || [1]));
  const minCoverage = Math.min(...scenRows.map(r => r.cobertura));

  const conclusions = [];
  if (utilPct >= 99)
    conclusions.push({ type: 'warn', title: 'Carga al Límite', text: `La máquina opera al ${fmt(utilPct, 1)}% de su capacidad máxima diaria (${fmt(reqTotalDia)} de ${fmt(capDiaY1)} cajas/día). Se requiere supervisión o líneas adicionales.` });
  else
    conclusions.push({ type: 'ok', title: 'Carga de Máquina', text: `La máquina opera al ${fmt(utilPct, 1)}% de su capacidad máxima diaria (${fmt(reqTotalDia)} de ${fmt(capDiaY1)} cajas/día). Hay margen operativo disponible.` });

  if (allViable)
    conclusions.push({ type: 'ok', title: 'Todos los Modelos Viables', text: 'Los modelos con requerimiento definido presentan capacidad diaria superior al requerimiento.' });
  else
    conclusions.push({ type: 'bad', title: 'Modelos con Déficit', text: 'Uno o más modelos no cubren su requerimiento diario con la configuración actual.' });

  if (maxLines <= 1)
    conclusions.push({ type: 'ok', title: `1 Máquina Suficiente (Y1–Y5)`, text: `El sistema cubre el escenario completo con 1 sola máquina. Cobertura mínima: ${fmt(minCoverage, 1)}% en el peor año.` });
  else
    conclusions.push({ type: 'warn', title: `Se Requieren ${maxLines} Máquinas`, text: `En algún año del horizonte Y1–Y5 se necesitan ${maxLines} máquinas para cubrir la demanda.` });

  conclusions.push({
    type:  coberturaY1 >= 100 ? 'ok' : 'warn',
    title: `Cobertura Global Y1: ${fmt(coberturaY1, 1)}%`,
    text:  `Se producen ${fmt(capDiaY1)} cajas/día vs ${fmt(reqTotalDia)} requeridas en Y1.`,
  });

  // ── retorno del objeto reportData ────────────────────────────────────────
  return {
    inputs,
    installedPowerKw,
    meta: {
      empresa:   clientName || 'IASE',
      cliente:   customerName || 'CENTRAL DE INTELIGENCIA',
      proyecto:  'Informe Paramétrico de Simulación',
      subtitulo: 'Análisis de capacidad, velocidad de línea y cobertura operativa para el sistema de lavado y secado de contenedores.',
      periodo:   'Y1 – Y5',
      fecha:     new Date().toLocaleDateString('es-MX'),
      simulador: simulatorName || 'RYDER',
      maquina:   (() => {
        if (clientName && clientName.includes('-')) {
          const parts = clientName.split('-');
          if (parts[1]) {
            const modelPart = parts[1].split('|')[0].trim();
            if (modelPart) return modelPart;
          }
        }
        return inputs.machineName || 'PLD-120 / PLD-140';
      })(),
      version:   'v7.76',
    },
    kpis: {
      velocidadBandaMph:      speedMH,
      velocidadMaxMph:        maxMH,
      capacidadPromHora:      +avgCapHr.toFixed(0),
      capacidadDiaY1:         capDiaY1,
      requerimientoTotalDia:  reqTotalDia,
      coberturaY1:            coberturaY1,
    },
    lineUtilization: {
      actualMph:      reqTotalDia,
      maxMph:         capDiaY1,
      utilPct:        +utilPct.toFixed(1),
      interpretation: utilPct >= 99
        ? `La máquina opera prácticamente al límite de su capacidad diaria (${fmt(utilPct, 1)}%). Sin margen para absorber variaciones en el volumen de lavado diario.`
        : `La máquina opera al ${fmt(utilPct, 1)}% de su capacidad máxima diaria, con margen operativo disponible para absorber variaciones.`,
    },
    modelTable,
    lavadoSecadoParams: {
      referencia: selectedRow?.name ?? 'N/A',
      rateBase:   reqTotalDia,
      rows:       scenRows,
    },
    waterParams: {
      washFlowLh: washFlowLh ?? 1000,
      waterReplenishLh: waterReplenishLh ?? 150,
      tankCapacityL: tankCapacityL ?? 1200,
      waterChangeDays: waterChangeDays ?? '3–5',
    },
    conclusions,
  };
}
