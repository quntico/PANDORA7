/**
 * Datos Base para el Simulador de Línea de Reciclado LMA-500
 */

export const LMA500_NOMINAL_CAPACITY = 500; // kg/h
export const LMA500_BASE_CAPEX = 179500; // USD
export const LMA500_INSTALLED_POWER = 364.90; // kW (Suma de los equipos)

export const LMA500_EQUIPMENTS = [
  { id: 'banda_entrada', name: 'Banda de entrada', kw: 1.65, capexUsd: 6500 },
  { id: 'detector_metales', name: 'Detector de metales', kw: 2.20, capexUsd: 7000 },
  { id: 'trituradora', name: 'Trituradora GSX500', kw: 41.00, capexUsd: 36000 },
  { id: 'banda_salida', name: 'Banda de salida', kw: 1.65, capexUsd: 6000 },
  { id: 'aglomeradora', name: 'Aglomeradora', kw: 56.00, capexUsd: 22000 },
  { id: 'peletizadora', name: 'Peletizadora PT-500', kw: 246.00, capexUsd: 84500 },
  { id: 'cernidor_silo', name: 'Cernidor + silo', kw: 4.40, capexUsd: 4000 },
  { id: 'chiller', name: 'Chiller 10 tons', kw: 12.00, capexUsd: 13500 }
];

export const LMA500_MATERIAL_TYPES = [
  { id: 'pe', name: 'PE (Polietileno)', density: 0.92 },
  { id: 'pp', name: 'PP (Polipropileno)', density: 0.90 },
  { id: 'hdpe', name: 'HDPE (Alta Densidad)', density: 0.95 },
  { id: 'ldpe', name: 'LDPE (Baja Densidad)', density: 0.92 },
  { id: 'film', name: 'Film Plástico', density: 0.85 },
  { id: 'postindustrial', name: 'Material Postindustrial', density: 0.92 },
  { id: 'postconsumo', name: 'Material Postconsumo', density: 0.90 },
  { id: 'custom', name: 'Otro / Personalizado', density: 0.90 }
];
