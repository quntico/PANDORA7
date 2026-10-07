# MODELO NORMATIVO M1 - PANDORA

## 1. CONFIGURACIÓN OFICIAL
- **Puntaje Técnico Máximo**: 50.0 puntos
- **Puntaje Mínimo de Solvencia**: 37.50 puntos
- **Puntaje Económico Máximo**: 50.0 puntos
- **Puntaje Total Máximo**: 100.0 puntos

## 2. CRITERIOS DE PUNTUACIÓN (SCORING CRITERIA)
| CÓDIGO | SECCIÓN | TÍTULO | PUNTOS MAX | OBLIGATORIO | CAUSAL RECHAZO | DOCUMENTO |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| I-A | I | MATERIALES Y EQUIPO | 4.0 | SÍ | SÍ | AT 9A |
| I-B | I | MANO DE OBRA | 2.0 | SÍ | SÍ | AT 9B |
| I-C | I | MAQUINARIA Y EQUIPO | 1.0 | SÍ | SÍ | AT 9C |
| I-D | I | ORGANIGRAMA TÉCNICO | 0.5 | SÍ | SÍ | AT 3B |
| I-E | I | PLANEACIÓN / PROCEDIMIENTO | 4.0 | SÍ | SÍ (Migrado) | AT 2 |
| I-F | I | PROGRAMAS | 1.0 | SÍ | SÍ | AT 11, AT12A-D |
| I-G | I | SISTEMA DE ASEGURAMIENTO | 2.5 | SÍ | SÍ | ISO/QA |
| II-A | II | RECURSOS HUMANOS | 6.0 | SÍ | SÍ | AT 3A |
| II-B | II | CAPACIDAD ECONÓMICA | 6.0 | SÍ | SÍ | AT 6 |
| II-C | II | APORTE DISCAPACIDAD | 0.5 | NO | NO | AT 13 |
| II-D | II | MIPYME | 0.5 | NO | NO | Constancia |
| II-E | II | CARTA COMPROMISO OEM | 4.0 | SÍ | SÍ | FORMATO OEM |
| III-A | III | EXPERIENCIA LICITANTE | 6.0 | SÍ | SÍ | AT 4 |
| III-B | III | ESPECIALIDAD | 6.0 | SÍ | SÍ | AT 4 |
| III-C | III | CARTA INTENCIÓN CDR | 3.0 | SÍ | SÍ | CDR-01 |
| IV-A | IV | CUMPLIMIENTO CONTRATOS | 3.0 | SÍ | SÍ | AT 4 |

## 3. REQUISITOS - ANEXOS TÉCNICOS (AT)
- **AT1:** Presentación (Obligatorio, No Puntuable, Desechamiento: NO CLASIFICADO)
- **AT2:** Planeación y procedimiento (Obligatorio, Puntuable I-E, Desechamiento: CONFIRMADO si se copia el catálogo)
- **AT3A:** Personal profesional responsable técnico (Obligatorio, Puntuable II-A)
- **AT3B:** Organigrama técnico/administrativo (Obligatorio, Puntuable I-D)
- **AT4:** Experiencia y cumplimiento (Obligatorio, Puntuable III-A, III-B, IV-A)
- **AT5:** Documentación complementaria técnica
- **AT6:** Capacidad financiera (Ficción de puntos II-B)
- **AT7:** Comprobante tecnología
- **AT8:** Prácticas desleales (Manifiesto)
- **AT9A, AT9B, AT9C:** Listado materiales, mano de obra, maquinaria.
- **AT10:** Análisis conceptos trabajo.
- **AT11, AT12A, AT12B, AT12C, AT12D:** Programas generales y específicos temporales.
- **AT13:** Manifestación trabajadores discapacidad (+0.5 opcional).
- **AT14:** Logística precio alzado.
- **AT15:** Red de Actividades.

## 4. REQUISITOS - ANEXOS ECONÓMICOS (AE)
- **AE1A, AE1B, AE1C:** Análisis de costos de instalación, obreros y maquinaria (Costo Directo).
- **AE1D:** Integración costos directos totales.
- **AE2:** Factor Salario Real (FASAR) - Causal crítica si existen prestaciones extralegales apócrifas.
- **AE4:** Costos Indirectos.
- **AE5:** Utilidad.
- **AE6:** Cargos adicionales.
- **AE21:** Presupuesto maestro total y agrupador.

## 5. REQUISITOS - LEGALES/ADMIN (DLA)
- **DLA1:** Personalidad jurídica (Representante, Poder, Constitutiva).
- **DLA2:** Domicilios y contactos.
- **DLA3:** Nacionalidad mexicana bajo protesta (Causal Crítica).

## 6. REGLAS CROSS-CHECK (CRÍTICAS)
- **AT3B_PERSONNEL_EXISTS_IN_AT12D:** Personal en organigrama DEBE existir en programa AT12D.
- **AE1C_EQUIPMENT_EXISTS_IN_AT7:** Equipo costeado DEBE hallarse justificado en AT7.
- **AT11_MATCHES_AT12_SERIES:** Programas detallados subordinados a las fechas maestras AT11.
- **AT10_MATCHES_CATALOG_AND_PROGRAMS:** 100% Conceptos.
- **AT14_MATCHES_AT2_AND_PROGRAMS:** Planeación a Precio alzado atada logísticamente a AT2 y tiempos AT11.
- **AE1D_MATCHES_AE1A_B_C:** Sumatoria intacta.
- **AE21_TOTAL_CONSISTENCY:** Cierre presupuestal.
- Otros Cross-checks OEM, direcciones fiscales, etc, catalogados como CRITICAL en el array oficial del modelo normativo.
