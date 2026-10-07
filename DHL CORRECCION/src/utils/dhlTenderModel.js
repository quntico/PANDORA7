// Fuente única para la pantalla y el exportador DHL. Sin redondeos intermedios.
export const DHL_MODEL_VERSION = 'DHL-2027-2030-2026-10-06-r1';
export const DHL_YEARS = [2027, 2028, 2029, 2030];
export const DHL_OFFER = [
  ['BWD-350', 51000], ['BA externo: 5 m, 4 secadores', 18000],
  ['SCR700 / PLC-HMI', 12000], ['SWM-1000', 17000],
  ['Garantía 24 meses', 4500], ['Puesta en marcha y capacitación', 2000],
  ['Instalación y viáticos', 2200],
];
export const DHL_BOXES = [
  ['460',20,60,40,20,true], ['500',352,30,20,15,false],
  ['600',29,60,20,15,false], ['750',861,60,40,20,true],
  ['757',13,40,30,9.86,true], ['780',955,60,40,20,true],
  ['787',18,60,40,9.86,true], ['800',62,80,30,20,true],
  ['840',389,80,60,20,true], ['81',92,116,76,0.4,false],
  ['82',28,76,56,0.4,false],
].map(([code, pieces, l, w, h, lid], i) => ({
  id: String(i+1), code, nombre: `Packaging ${code}${lid ? ' (blue box + lid)' : Number(code)<100 ? ' (spacer of plastic)' : ' (blue box)'}`,
  tipo: Number(code)<100 ? 'Plastic spacer' : 'Plastic box',
  largoCm:l, anchoCm:w, altoCm:h, piezasDia2028:pieces, hasLid:lid,
  reqCajasH:pieces/8.5, color:'#008299', includeInPdf:true,
}));
// Se recuperan del DHLSimulator.jsx recibido. Sólo la demanda 2028 es de DHL.
export const DHL_YEAR_ASSUMPTIONS = [
  {year:2027,demand:2500,oee:92,source:'Supuesto del simulador recibido; no validado por DHL'},
  {year:2028,demand:2819,oee:95,source:'Demanda DHL; OEE supuesto pendiente de medición'},
  {year:2029,demand:2950,oee:96,source:'Supuesto del simulador recibido; no validado por DHL'},
  {year:2030,demand:3100,oee:97,source:'Supuesto del simulador recibido; no validado por DHL'},
];
const n = (v, fallback=0) => v !== null && v !== '' && Number.isFinite(Number(v)) ? Number(v) : fallback;
const nonnegative = (v,fallback=0) => Math.max(0,n(v,fallback));
const pct = (v,fallback) => Math.max(0,Math.min(100,n(v,fallback)));

export function normalizeDHLInputs(saved={}, defaults={}) {
  const old = saved.dhlModelVersion !== DHL_MODEL_VERSION;
  const x = {...defaults,...saved};
  if (old) {
    Object.assign(x, {
      companyName:'DHL Supply Chain', clientName:'Francisco Louvier',
      machineName:'BWD-350 + BA + SWM-1000',
      evaluationName:'Lavadora Industrial BWD-350 + BA + SWM-1000',
      technicalSheetName:'Ficha técnica BWD-350 + BA + SWM-1000',
      projectName:'Volvo Washing Machine DSC | Simulación 2027-2030',
      hoursPerDay:8.5,hoursPerShift:8.5,shiftsPerDay:1,
      daysPerWeek:5,diasPorSemana:5,operatingDaysPerYear:248,daysPerMonth:248/12,
      capacidad_nominal_h:350,capacidad_nominal_cajas_h:350,tipo_unidad:'cajas',oee:95,
      meta_diaria_cajas:2819,cajas:DHL_BOXES.map(b=>({...b})),
      annualScenarios:DHL_YEAR_ASSUMPTIONS.map(r=>({...r})),
      motorBombaAguaHp:15,motorSopladorHp:10,motorBandaHp:0.5,
      calentamientoElectricoKw:18,suavizadorKw:7,
      // La potencia de los cuatro secadores BA no está desglosada en la oferta.
      potenciaSecadoresAdicionalKw:0,baPowerConfirmed:false,
      customInstalledPowerKw:undefined,potenciaActivaKw:undefined,
      machineLength:12.5,machineWidth:1.8,machineHeight:1.75,
      pesoOperativoKg:1200,pesoSecoKg:null,pesoFuenteKg:1200,
      pesoOperativoKgDetalle:'Peso de la oferta: 1200 kg; masa seca/operativa pendiente de conciliación',
      waterReplenishmentLH:164,caudal_lavado_lh:1230,volumen_tanque_l:1200,
      volumenAguaOperativoL:1200,waterTankLiters:1200,frecuencia_cambio_tanque_dias:6,
      recirculacion_agua:85,ruidoDb:65,
      precioEquipoUsd:106700,tipoCambio:18.5,iva:16,
      porcentajeManiobras:0,porcentajeMontajeMecanico:0,porcentajeObraCivil:0,
      porcentajeElectricoPrincipal:0,porcentajeCanalizacionProtecciones:0,
      porcentajeExtraccionPolvo:0,porcentajeSeguridadIndustrial:0,
      porcentajeIngenieriaSupervision:0,porcentajeContingencia:0,otrosCapexUsd:0,
      garantia_estandar_meses:12,garantia_extendida_meses:24,
      fecha_inicio_garantia:'24 meses a partir de SAT, según oferta',
      machineNameDetalle:'BWD-350 + BA; tratamiento de agua SWM-1000 separado',
      aplicacionOperativa:'Lavado, enjuague y secado de cajas plásticas',
      aplicacionDetalle:'Calidad y ausencia de escurrimientos: pendientes de FAT/SAT',
      capacidadNominalDetalle:'350 u/h nominales; mínimo contractual 320 u/h lavadas y secas',
      motorPrincipalDetalle:'Bomba 15 HP según oferta A',
      motorAuxiliarDetalle:'Soplador 10 HP; BA externo: 4 secadores, potencia por conciliar',
      dimensionesBandas:'Lavado 60-80 °C',dimensionesBandasDetalle:'Calentamiento 18 kW según oferta A',
      bocaAlimentacion:'5 bar nominales',bocaAlimentacionDetalle:'Presión según oferta A',
      presionLavadoBar:5,presionLavadoBarDetalle:'Inversor incluido; receta por validar',
      particulaFinal:'SCR700 / PLC-HMI',particulaFinalDetalle:'Control incluido en oferta A',
      separadorMagnetico:'480 VAC / 3 fases / 60 Hz',separadorMagneticoDetalle:'Alimentación eléctrica según oferta y layout',
      componentesElectricos:'Según BOM de ingeniería',componentesElectricosDetalle:'Marcas y componentes por confirmar con BOM',
      ruidoDbDetalle:'Límite contractual ≤65 dB(A); cumplimiento pendiente de medición FAT/SAT',
      civilAlimentacionElectrica:'480 VAC / 3 fases / 60 Hz',
    });
  }
  // El calendario anual gobierna el promedio mensual, incluso tras cargar un proyecto.
  x.operatingDaysPerYear=nonnegative(x.operatingDaysPerYear,248);
  x.daysPerMonth=x.operatingDaysPerYear/12;
  x.hoursPerShift=nonnegative(x.hoursPerDay,8.5);
  x.daysPerWeek=nonnegative(x.daysPerWeek,5);
  x.diasPorSemana=x.daysPerWeek;
  x.cajas=Array.isArray(x.cajas)&&x.cajas.length ? x.cajas : DHL_BOXES.map(b=>({...b}));
  x.meta_diaria_cajas=x.cajas.reduce((s,b)=>s+nonnegative(b.piezasDia2028),0);
  x.annualScenarios=DHL_YEARS.map(year=>{
    const row=(x.annualScenarios||[]).find(r=>Number(r.year)===year)||DHL_YEAR_ASSUMPTIONS.find(r=>r.year===year);
    return {...row,year,demand:year===2028?x.meta_diaria_cajas:nonnegative(row.demand),oee:year===2028?pct(x.oee,95):pct(row.oee,95)};
  });
  x.dhlModelVersion=DHL_MODEL_VERSION;
  return x;
}

export function calculateDHLResults(inputs) {
  const i=inputs;
  const hoursPerDay=nonnegative(i.hoursPerDay,8.5), shifts=nonnegative(i.shiftsPerDay,1);
  const dayHours=hoursPerDay*shifts, days=nonnegative(i.operatingDaysPerYear,248), monthDays=days/12;
  const nominal=nonnegative(i.capacidad_nominal_h,350), oee=pct(i.oee,95), load=pct(i.loadFactor,85)/100;
  const demand=(i.cajas||[]).reduce((s,b)=>s+nonnegative(b.piezasDia2028),0);
  const net=nominal*oee/100,daily=net*dayHours,margin=daily-demand;
  const parts=[
    ['Bomba de lavado',nonnegative(i.motorBombaAguaHp,15)*0.7457,'15 HP: oferta A'],
    ['Soplador de lavadora',nonnegative(i.motorSopladorHp,10)*0.7457,'10 HP: oferta A'],
    ['Banda transportadora',nonnegative(i.motorBandaHp,0.5)*0.7457,'0.5 HP: oferta A'],
    ['Calentamiento',nonnegative(i.calentamientoElectricoKw,18),'18 kW: oferta A'],
    ['SWM-1000',nonnegative(i.suavizadorKw,7),'7 kW: anexo B'],
  ];
  const knownPower=parts.reduce((s,r)=>s+r[1],0);
  const additional=nonnegative(i.potenciaSecadoresAdicionalKw);
  const installedPowerKw=knownPower+additional;
  const powerComplete=i.baPowerConfirmed===true;
  const avg=installedPowerKw*load;
  const replenishment=nonnegative(i.waterReplenishmentLH,164),flow=nonnegative(i.caudal_lavado_lh,1230);
  const waterDay=replenishment*dayHours,waterMonth=waterDay*monthDays;
  const energyDay=avg*dayHours,energyMonth=energyDay*monthDays;
  const energyCost=energyMonth*nonnegative(i.electricityRate,2.5);
  const waterCost=waterMonth/1000*nonnegative(i.waterCostM3,35);
  const labor=(nonnegative(i.operadoresPorTurno,2)*nonnegative(i.sueldoOperadorMensual,12000)+nonnegative(i.supervisoresPorTurno)*nonnegative(i.sueldoSupervisorMensual,20000))*shifts;
  const opexParts=[['Energía (parcial)',energyCost],['Agua de reposición (base)',waterCost],['Mano de obra (supuesto)',labor],['Mantenimiento (supuesto)',nonnegative(i.mantenimientoMensualMxn,8275)],['Refacciones (supuesto)',nonnegative(i.refaccionesMensualMxn,6000)],['Químicos (supuesto)',nonnegative(i.quimicosMensualMxn,7000.2)],['Consumibles (supuesto)',nonnegative(i.consumiblesMensualMxn,8000)]];
  const opex=opexParts.reduce((s,r)=>s+r[1],0),monthly=daily*monthDays;
  const years=(i.annualScenarios||DHL_YEAR_ASSUMPTIONS).map(r=>{
    const d=Number(r.year)===2028?demand:nonnegative(r.demand),e=Number(r.year)===2028?oee:pct(r.oee,95);
    const annualDemand=d*days,annualCapacity=nominal*e/100*dayHours*days;
    const effectiveHours=dayHours*days*e/100,requiredHours=nominal>0?annualDemand/nominal:null;
    return {...r,year:Number(r.year),demand:d,oee:e,dailyCapacity:nominal*e/100*dayHours,annualDemand,annualCapacity,
      shiftHours:dayHours*days,effectiveHours,requiredHours,hourMargin:requiredHours===null?null:effectiveHours-requiredHours,
      coverage:d>0?annualCapacity/annualDemand*100:null,utilization:annualCapacity>0?annualDemand/annualCapacity*100:null,
      energyKwh:energyDay*days,waterM3:waterDay*days/1000,margin:nominal*e/100*dayHours-d};
  });
  const scenarios=[70,85,90,94,95,97].map(e=>({name:`OEE ${e}%`,oee:e,capH:nominal*e/100,capDia:nominal*e/100*dayHours,margen:nominal*e/100*dayHours-demand,cob:demand>0?nominal*e/100*dayHours/demand*100:0,horasReq:nominal*e/100>0?demand/(nominal*e/100):null}));
  const status=margin>=0?'SUFICIENCIA CONDICIONADA':'DÉFICIT DETECTADO';
  const precioEquipoUsd=DHL_OFFER.reduce((s,r)=>s+r[1],0),capexMxn=precioEquipoUsd*nonnegative(i.tipoCambio,18.5);
  const netHours=net>0?demand/net:null,nominalDaily=nominal*dayHours;
  return {
    hoursPerDay,dayHours,daysPerYear:days,daysPerMonth:monthDays,nominalCapacity:nominal,oee,dailyGoalBoxes:demand,
    footprintM2:nonnegative(i.machineLength,12.5)*nonnegative(i.machineWidth,1.8),
    realProductionPerHourBoxes:net,dailyProductionBoxes:daily,weeklyProductionBoxes:daily*nonnegative(i.daysPerWeek,5),monthlyProductionBoxes:monthly,annualProductionBoxes:daily*days,
    nominalDailyCapacity:nominalDaily,nominalMargin:nominalDaily-demand,annualDemand:demand*days,annualMargin:margin*days,
    requirementCoverage:demand>0?daily/demand*100:0,systemUtilization:daily>0?demand/daily*100:0,
    operationalReserve:margin,hoursRequired:netHours,minimumOee:nominalDaily>0?demand/nominalDaily*100:null,
    netReserveMinutes:netHours===null?null:(dayHours-netHours)*60,nominalReserveMinutes:nominal>0?margin/nominal*60:null,
    estadoOperativo:status,viabilityState:status,estadoFinanciero:'ESTIMACIÓN PARCIAL',machinesRequired:daily>0?Math.ceil(demand/daily):0,
    estadoColor:margin>=0?'text-amber-700 bg-amber-50 border-amber-200':'text-red-700 bg-red-50 border-red-200',
    dictamenTexto:`${status}. Balance agregado: ${daily.toFixed(2)} u/día frente a ${demand} requeridas; saldo ${margin.toFixed(2)} u/día. OEE ${oee}% supuesto. Validar mezcla, tapas, secado y agua en FAT/SAT. Arranque, calentamiento, pausas y ajustes deben caber en el OEE o descontarse una sola vez.`,
    powerParts:parts,knownPowerKw:knownPower,additionalDryersKw:additional,powerComplete,installedPowerKw,averageHourlyConsumptionKw:avg,
    totalHp:nonnegative(i.motorBombaAguaHp,15)+nonnegative(i.motorSopladorHp,10)+nonnegative(i.motorBandaHp,0.5),
    dailyEnergyKwh:energyDay,weeklyEnergyKwh:energyDay*nonnegative(i.daysPerWeek,5),monthlyEnergyKwh:energyMonth,annualEnergyKwh:energyDay*days,
    hourlyElectricityCostMxn:avg*nonnegative(i.electricityRate,2.5),dailyElectricityCostMxn:energyDay*nonnegative(i.electricityRate,2.5),monthlyElectricityCostMxn:energyCost,annualElectricityCostMxn:energyCost*12,
    kwhPer1000Boxes:net>0?avg/net*1000:0,electricityCostPer1000BoxesMxn:net>0?avg/net*1000*nonnegative(i.electricityRate,2.5):0,
    reposicionTotalLH:replenishment,flowLH:flow,flowReuseEstimate:flow>0?(1-replenishment/flow)*100:null,
    consumoPorCajaL:nominal>0?replenishment/nominal:0,waterPerGoodUnit:net>0?replenishment/net:0,
    consumoDiarioOperacionL:waterDay,consumoPorCambioTanqueLDia:0,consumoDiarioTotalL:waterDay,
    totalWaterMonthlyLiters:waterMonth,weeklyWaterLiters:waterDay*nonnegative(i.daysPerWeek,5),annualWaterM3:waterDay*days/1000,waterCostMonthlyMxn:waterCost,
    scenarios,annualScenarios:years,
    projectionY5:years.map(r=>({...r,hrsB:dayHours*nonnegative(i.daysPerWeek,5),efT:hoursPerDay*r.oee/100,turn:shifts,tDisp:dayHours*r.oee/100,reqH:dayHours>0?r.demand/dayHours:0,capH:nominal*r.oee/100,bal:r.margin,cob:r.coverage})),
    precioEquipoUsd,ivaUsd:precioEquipoUsd*nonnegative(i.iva,16)/100,capexInstaladoUsd:precioEquipoUsd,capexFiscalUsd:precioEquipoUsd*(1+nonnegative(i.iva,16)/100),capexInstaladoMxn:capexMxn,
    maniobrasUsd:0,montajeMecanicoUsd:0,obraCivilUsd:0,electricoPrincipalUsd:0,canalizacionProteccionesUsd:0,extraccionPolvoUsd:0,seguridadIndustrialUsd:0,ingenieriaSupervisionUsd:0,contingenciaUsd:0,otrosCapexUsd:0,
    opexParts,energiaMensualMxn:energyCost,aguaMensualMxn:waterCost,manoObraMensualMxn:labor,mantenimientoMensualMxn:opexParts[3][1],refaccionesMensualMxn:opexParts[4][1],quimicosMensualMxn:opexParts[5][1],consumiblesMensualMxn:opexParts[6][1],
    opexMensualMxn:opex,opexAnualMxn:opex*12,opexPorCajaMxn:monthly>0?opex/monthly:0,opexPor1000CajasMxn:monthly>0?opex/monthly*1000:0,
    ingresoMensual:0,flujoOperativoMensual:-opex,flujoOperativoAnual:-opex*12,paybackMeses:Infinity,roiAnual:0,puntoEquilibrioTonMes:0,
  };
}

export function dhlTechnicalRows(i,r) {
  return [
    ['Configuración','BWD-350 + BA + SWM-1000','Oferta A + anexos B/C + layout E'],
    ['Capacidad nominal',`${r.nominalCapacity} unidades/h`,'Referencia de cálculo; no medición FAT/SAT'],
    ['Mínimo contractual','320 unidades/h lavadas y secas','No garantiza cubrir 2819 unidades en 8.5 h'],
    ['Lavadora + BA',`${i.machineLength} × ${i.machineWidth} × ${i.machineHeight} m`,'Layout E; BA ya incluido en 12.50 m'],
    ['SWM-1000','2.00 × 1.10 × 2.00 m','Anexo B; verificar envolvente conjunta con RO lateral'],
    ['Peso de lavadora','1200 kg (oferta A)','Masa seca/operativa por conciliar; no calcular cimentación'],
    ['Peso SWM-1000','1000 kg (anexo B)','Identificado por separado del conjunto'],
    ['Bomba / banda / soplador',`${i.motorBombaAguaHp} / ${i.motorBandaHp} / ${i.motorSopladorHp} HP`,'Oferta A; BA externo requiere desglose independiente'],
    ['Calentamiento / SWM',`${i.calentamientoElectricoKw} / ${i.suavizadorKw} kW`,'Oferta A / anexo B'],
    ['Potencia documentada',`${r.installedPowerKw.toFixed(2)} kW (${r.powerComplete?'conciliada':'parcial'})`,'Falta confirmar potencia incremental BA y consumos auxiliares'],
    ['Electricidad','480 VAC / 3 fases / 60 Hz','Oferta A + anexo B + layout E'],
    ['Lavado / presión','60-80 °C / 5 bar','Oferta A; receta y calidad pendientes de FAT/SAT'],
    ['Control','SCR700 / PLC-HMI','Incluido en oferta A; BOM de ingeniería pendiente'],
    ['Acústica','Límite ≤65 dB(A)','Cumplimiento pendiente de medición FAT/SAT'],
  ];
}
