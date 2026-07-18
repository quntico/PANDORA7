import { useState, useEffect } from 'react';

const defaultFinancialInputs = {
  // Obra Civil y Piso
  civilExcavacionM3: 2.0,
  civilConcretoFc: 250,
  civilEspesorPisoCm: 15,
  civilRefuerzoPiso: 'Malla Electrosoldada',
  civilCargaSoportada: 5.0,
  civilAreaRequeridaM2: 25,
  civilAcabadoPiso: 'Pulido con pintura epóxica',
  civilJuntasDilatacion: 'Sello elastomérico',
  civilAnclajeTornillos: 'Taquetes expansivos',
  civilCanalizacionesSubterraneas: 'Tubería y Drenaje',
  civilSistemaVibracion: 'Placas de neopreno',

  // CAPEX
  precioEquipoUsd: 89700,
  iva: 16,
  tipoCambio: 18,
  porcentajeManiobras: 2,
  porcentajeMontajeMecanico: 3,
  porcentajeObraCivil: 2,
  porcentajeElectricoPrincipal: 4,
  porcentajeCanalizacionProtecciones: 3,
  porcentajeExtraccionPolvo: 0,
  porcentajeSeguridadIndustrial: 2,
  porcentajeIngenieriaSupervision: 2,
  porcentajeContingencia: 5,

  // OPEX
  operadoresPorTurno: 2,
  sueldoOperadorMensual: 12000,
  supervisoresPorTurno: 0,
  sueldoSupervisorMensual: 20000,
  mantenimientoAnualPorcentaje: 5,
  filtrosMensualMxn: 0,
  refaccionesMensualMxn: 5000,
  lubricacionMensualMxn: 1000,
  limpiezaMensualMxn: 4000,
  consumiblesMensualMxn: 8000,
  otrosOpexMensualMxn: 0,

  // Riesgos y Mantenimiento
  riesgoPolvo: 'bajo',
  riesgoIncendio: 'bajo',
  riesgoMetal: 'bajo',
  riesgoRuido: 'medio',
  frecuenciaMantenimientoHoras: 250,
  vidaUtilCuchillasHoras: 2000,
  disponibilidadMecanica: 95,
  factorParo: 5,
  requiereExtraccionPolvo: false,
  requiereSistemaContraIncendio: false,
  requiereCabinaAcustica: false,
  requiereLOTO: true,
  requiereGuardas: true,
  requiereEStop: true,
  
  // Financiero Base (para OPEX extendido si se requiere)
  vidaUtilAnios: 10,
  tasaDescuento: 14,
  depreciacionAnual: 10,
};

export function useFinancialEngine(simulatorId) {
  const [finInputs, setFinInputs] = useState(() => {
    const saved = localStorage.getItem(`sim_${simulatorId}_fin_inputs`);
    return saved ? { ...defaultFinancialInputs, ...JSON.parse(saved) } : defaultFinancialInputs;
  });

  useEffect(() => {
    localStorage.setItem(`sim_${simulatorId}_fin_inputs`, JSON.stringify(finInputs));
  }, [finInputs, simulatorId]);

  // Cálculos CAPEX
  const equipoBaseUsd = finInputs.precioEquipoUsd || 0;
  const tc = finInputs.tipoCambio || 18;
  const baseMxn = equipoBaseUsd * tc;
  const calcCapex = (pct) => baseMxn * ((pct || 0) / 100);

  const capexItems = {
    maniobras: calcCapex(finInputs.porcentajeManiobras),
    montaje: calcCapex(finInputs.porcentajeMontajeMecanico),
    obraCivil: calcCapex(finInputs.porcentajeObraCivil),
    electrico: calcCapex(finInputs.porcentajeElectricoPrincipal),
    canalizacion: calcCapex(finInputs.porcentajeCanalizacionProtecciones),
    extraccion: calcCapex(finInputs.porcentajeExtraccionPolvo),
    seguridad: calcCapex(finInputs.porcentajeSeguridadIndustrial),
    ingenieria: calcCapex(finInputs.porcentajeIngenieriaSupervision),
    contingencia: calcCapex(finInputs.porcentajeContingencia),
  };

  const capexInstaladoMxn = baseMxn + Object.values(capexItems).reduce((a, b) => a + b, 0);

  // Cálculos OPEX
  const turnosPorDia = 2; // Default o tomar de otro lado si existe
  const manoObraMensualMxn = ((finInputs.operadoresPorTurno || 0) * turnosPorDia * (finInputs.sueldoOperadorMensual || 0)) + 
                             ((finInputs.supervisoresPorTurno || 0) * turnosPorDia * (finInputs.sueldoSupervisorMensual || 0));
  
  const mantenimientoMensualMxn = (capexInstaladoMxn * ((finInputs.mantenimientoAnualPorcentaje || 0) / 100)) / 12;

  // El costo eléctrico se debería calcular con el consumo de la máquina, para OPEX simple usamos un estimado o lo extraemos
  // Aquí podemos dejarlo en 0 o pasarlo por props si lo calculamos en DHLSimulator
  const opexMensualMxn = manoObraMensualMxn + mantenimientoMensualMxn + 
                         (finInputs.filtrosMensualMxn || 0) + (finInputs.refaccionesMensualMxn || 0) + 
                         (finInputs.lubricacionMensualMxn || 0) + (finInputs.limpiezaMensualMxn || 0) + 
                         (finInputs.consumiblesMensualMxn || 0) + (finInputs.otrosOpexMensualMxn || 0);

  const finResults = {
    baseMxn,
    capexItems,
    capexInstaladoMxn,
    manoObraMensualMxn,
    mantenimientoMensualMxn,
    opexMensualMxn
  };

  return { finInputs, setFinInputs, finResults };
}
