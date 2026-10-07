/**
 * FUENTE DE VERDAD - PANDORA M1
 * SEGUNDA CONVOCATORIA ACTIVA
 */

export const tenderVersion = { project: "M1", version: "2.0", status: "ACTIVE", source: "SEGUNDA CONVOCATORIA" };

export const officialConfiguration = {
    officialTechnicalMaxPoints: 50,
    minimumTechnicalSolvency: 37.50,
    officialEconomicMaxPoints: 50,
    officialTotalMaxPoints: 100
};

export const DocumentGroup = {
    LEGAL: "LEGAL", ADMINISTRATIVE: "ADMINISTRATIVE", AT: "AT", AE: "AE", TECHNICAL_SCOPE: "TECHNICAL_SCOPE",
    PERSONNEL: "PERSONNEL", EXPERIENCE: "EXPERIENCE", TECHNICAL: "TECHNICAL", ECONOMIC: "ECONOMIC",
    OEM: "OEM", CONTRACT: "CONTRACT", GUARANTEES: "GUARANTEES", PROGRAMS: "PROGRAMS",
    JOINT_PROPOSAL: "JOINT_PROPOSAL", CLARIFICATIONS: "CLARIFICATIONS", CATALOG: "CATALOG", OTHER_OFFICIAL: "OTHER_OFFICIAL"
};

export const SourceType = {
    CONVOCATORIA: "CONVOCATORIA", ANEXO_TECNICO: "ANEXO_TECNICO", ANEXO_ECONOMICO: "ANEXO_ECONOMICO",
    ALCANCES: "ALCANCES", CATALOGO: "CATALOGO", CONTRATO: "CONTRATO", JUNTA_ACLARACIONES: "JUNTA_ACLARACIONES"
};

export const RequirementStatus = {
    NOT_STARTED: "NO INICIADO", IN_PROGRESS: "EN PROCESO", PENDING_EVIDENCE: "PENDIENTE EVIDENCIA",
    UNDER_REVIEW: "POR REVISAR", COMPLIANT: "CUMPLE", NON_COMPLIANT: "NO CUMPLE",
    NOT_APPLICABLE: "NO APLICA", BLOCKED: "BLOQUEADO"
};

export const PointStatus = {
    NOT_EVALUATED: "NOT_EVALUATED", NO_EVIDENCE: "NO_EVIDENCE", ESTIMATED: "ESTIMATED",
    SUPPORTED: "SUPPORTED", REJECTED: "REJECTED"
};

export const AuditStatus = { NOT_STARTED: "NOT_STARTED", RUNNING: "RUNNING", COMPLETED: "COMPLETED", FAILED: "FAILED" };
export const RuleSeverity = { INFO: "INFO", WARNING: "WARNING", CRITICAL: "CRITICAL" };

export const RiskType = {
    REJECTION: "REJECTION",
    TECHNICAL_SCORE_LOSS: "TECHNICAL_SCORE_LOSS",
    DOCUMENT_MISSING: "DOCUMENT_MISSING",
    INCONSISTENCY: "INCONSISTENCY",
    DEADLINE: "DEADLINE",
    INFORMATIONAL: "INFORMATIONAL",
    ECONOMIC_INCONSISTENCY: "ECONOMIC_INCONSISTENCY",
    MISSING_AMOUNT: "MISSING_AMOUNT",
    PROGRAM_MISMATCH: "PROGRAM_MISMATCH",
    TECHNICAL_ECONOMIC_MISMATCH: "TECHNICAL_ECONOMIC_MISMATCH",
    LEGAL_MISSING: "LEGAL_MISSING",
    LEGAL_EXPIRED: "LEGAL_EXPIRED",
    SIGNATURE_MISSING: "SIGNATURE_MISSING",
    UNDER_OATH_TEXT_MISSING: "UNDER_OATH_TEXT_MISSING",
    MEMBER_DOCUMENT_MISSING: "MEMBER_DOCUMENT_MISSING",
    CORPORATE_DATA_MISMATCH: "CORPORATE_DATA_MISMATCH",
    JOINT_PROPOSAL_INCONSISTENCY: "JOINT_PROPOSAL_INCONSISTENCY",
    ELECTRONIC_SUBMISSION_RISK: "ELECTRONIC_SUBMISSION_RISK",
    OEM_LETTER_MISSING: "OEM_LETTER_MISSING",
    OEM_REFERENCE_INSUFFICIENT: "OEM_REFERENCE_INSUFFICIENT",
    OEM_REFERENCE_UNVERIFIED: "OEM_REFERENCE_UNVERIFIED",
    OEM_CAPACITY_MISMATCH: "OEM_CAPACITY_MISMATCH",
    OEM_TECHNOLOGY_MISMATCH: "OEM_TECHNOLOGY_MISMATCH",
    OEM_SCOPE_MISMATCH: "OEM_SCOPE_MISMATCH",
    OEM_SOURCE_RULE_CONFLICT: "OEM_SOURCE_RULE_CONFLICT",
    PERSONNEL_MISSING: "PERSONNEL_MISSING",
    PERSONNEL_PROFILE_MISMATCH: "PERSONNEL_PROFILE_MISMATCH",
    PERSONNEL_LICENSE_MISSING: "PERSONNEL_LICENSE_MISSING",
    PERSONNEL_COMMITMENT_MISSING: "PERSONNEL_COMMITMENT_MISSING",
    PERSONNEL_EXPERIENCE_INSUFFICIENT: "PERSONNEL_EXPERIENCE_INSUFFICIENT",
    EXPERIENCE_CONTRACT_MISSING: "EXPERIENCE_CONTRACT_MISSING",
    EXPERIENCE_EVIDENCE_INCOMPLETE: "EXPERIENCE_EVIDENCE_INCOMPLETE",
    EXPERIENCE_OWNER_NOT_ELIGIBLE: "EXPERIENCE_OWNER_NOT_ELIGIBLE",
    EXPERIENCE_CAPACITY_MISMATCH: "EXPERIENCE_CAPACITY_MISMATCH",
    EXPERIENCE_DATE_MISMATCH: "EXPERIENCE_DATE_MISMATCH",
    EXPERIENCE_SCOPE_MISMATCH: "EXPERIENCE_SCOPE_MISMATCH"
};

export const RejectionStatus = {
    CONFIRMED: "CONFIRMED",
    NOT_CONFIRMED: "NOT_CONFIRMED",
    NOT_CLASSIFIED: "NOT_CLASSIFIED",
    NOT_APPLICABLE: "NOT_APPLICABLE"
};

export const NormativeReviewStatus = {
    VERIFIED: "VERIFIED",
    PARTIAL: "PARTIAL",
    PENDING: "PENDING"
};

export const DocumentMaturity = {
    MISSING: "MISSING",
    DRAFT: "DRAFT",
    IN_REVIEW: "IN_REVIEW",
    READY_TO_SIGN: "READY_TO_SIGN",
    SIGNED: "SIGNED",
    FINAL: "FINAL"
};

export const SubmissionReadiness = {
    NOT_READY: "NOT_READY",
    AT_RISK: "AT_RISK",
    READY_FOR_INTERNAL_REVIEW: "READY_FOR_INTERNAL_REVIEW",
    READY_FOR_SIGNATURE: "READY_FOR_SIGNATURE",
    READY_FOR_SUBMISSION: "READY_FOR_SUBMISSION"
};

export const NormativeAuthorityPriority = {
    1: "JUNTA_ACLARACIONES_POSTERIOR",
    2: "MODIFICACION_OFICIAL",
    3: "CONVOCATORIA_ACTIVA",
    4: "ANEXO_OFICIAL_ACTIVO",
    5: "ALCANCES_ACTIVOS",
    6: "MODELO_CONTRATO_ACTIVO",
    7: "DOCUMENTO_INTERNO"
};

export const CrossCheckRules = [
    { id: "AT3B_PERSONNEL_EXISTS_IN_AT12D", severity: RuleSeverity.CRITICAL, sourceRequirement: "AT3B", targetRequirement: "AT12D", rule: "matches_personnel", message: "Persona en organigrama no localizada en plantilla AT12D" },
    { id: "AE1C_EQUIPMENT_EXISTS_IN_AT7", severity: RuleSeverity.CRITICAL, sourceRequirement: "AE1C", targetRequirement: "AT7", rule: "matches_equipment_list", message: "Equipo facturado no existe en AT7" },
    { id: "AT11_MATCHES_AT12_SERIES", severity: RuleSeverity.CRITICAL, sourceRequirement: "AT11", targetRequirement: "AT12_SERIES", rule: "matches_dates_and_amounts", message: "Programa general difiere de programas detallados (AT12)" },
    { id: "AT9_MATCHES_AT12_SERIES", severity: RuleSeverity.CRITICAL, sourceRequirement: "AT9_SERIES", targetRequirement: "AT12_SERIES", rule: "matches_quantities", message: "Cantidades de listados (AT9) difieren de programas erogaciones (AT12)" },
    { id: "AT10_MATCHES_CATALOG_AND_PROGRAMS", severity: RuleSeverity.CRITICAL, sourceRequirement: "AT10", targetRequirement: "PROGRAMS_AND_CATALOG", rule: "matches_all_concepts", message: "Análisis de conceptos discrepa con catálogo y programas" },
    { id: "AT14_MATCHES_AT2_AND_PROGRAMS", severity: RuleSeverity.CRITICAL, sourceRequirement: "AT14", targetRequirement: "AT2_AND_PROGRAMS", rule: "congruent_strategy", message: "Planeación Precio Alzado discrepa con AT2 o programas AT11/12" },
    { id: "AT15_MATCHES_AT11_AND_AT14", severity: RuleSeverity.CRITICAL, sourceRequirement: "AT15", targetRequirement: "AT11_AND_AT14", rule: "matches_critical_path", message: "Red de actividades AT15 diverge de AT11 o AT14" },
    { id: "AE1A_MATCHES_AT9A", severity: RuleSeverity.CRITICAL, sourceRequirement: "AE1A", targetRequirement: "AT9A", rule: "matches_quantities", message: "Cantidades de materiales AE1A no cuadran con AT9A" },
    { id: "AE1A_MATCHES_AT12A", severity: RuleSeverity.CRITICAL, sourceRequirement: "AE1A", targetRequirement: "AT12A", rule: "matches_amounts", message: "Importe de materiales AE1A difiere del programa AT12A" },
    { id: "AE1B_MATCHES_AT9B", severity: RuleSeverity.CRITICAL, sourceRequirement: "AE1B", targetRequirement: "AT9B", rule: "matches_categories", message: "Categorías o jornadas AE1B no cuadran con AT9B" },
    { id: "AE1B_MATCHES_AT12B", severity: RuleSeverity.CRITICAL, sourceRequirement: "AE1B", targetRequirement: "AT12B", rule: "matches_amounts", message: "Importe de mano de obra AE1B difiere del programa AT12B" },
    { id: "AE1C_MATCHES_AT9C", severity: RuleSeverity.CRITICAL, sourceRequirement: "AE1C", targetRequirement: "AT9C", rule: "matches_quantities", message: "Maquinaria cotizada AE1C difiere de la lista AT9C" },
    { id: "AE1D_MATCHES_AE1A_B_C", severity: RuleSeverity.CRITICAL, sourceRequirement: "AE1D", targetRequirement: "AE1A_B_C", rule: "matches_sum", message: "Integración de costo directo AE1D no suma AE1A+AE1B+AE1C" },
    { id: "AE21_TOTAL_CONSISTENCY", severity: RuleSeverity.CRITICAL, sourceRequirement: "AE21", targetRequirement: "ALL_AE", rule: "matches_total", message: "Monto total AE21 no cuadra con la suma de precios unitarios y precio alzado" },
    { id: "DOMICILIO_MATCHES_SUPPORT", severity: RuleSeverity.CRITICAL, sourceRequirement: "DLA2", targetRequirement: "DLA2_PROOF", rule: "exact_address", message: "El comprobante de domicilio no coincide con la declaración en formato DLA2" },
    { id: "COMPANY_NAME_MATCHES_PROOF", severity: RuleSeverity.CRITICAL, sourceRequirement: "DLA", targetRequirement: "LEGAL_ENTITY", rule: "matches_entity", message: "Discrepancia en la razón social entre documentos DLA y registro oficial" },
    { id: "DLA1_MATCHES_MANIFESTATIONS", severity: RuleSeverity.CRITICAL, sourceRequirement: "DLA1", targetRequirement: "DLA3_5_9_10_11_12", rule: "matches_personnel", message: "Representante legal en manifestaciones difiere de DLA1" },
    { id: "OEM_LETTER_MATCHES_SELECTED_TECHNOLOGY", severity: RuleSeverity.CRITICAL, sourceRequirement: "FORMATO-OEM", targetRequirement: "AT_TECHNOLOGY", rule: "matches_technology", message: "Carta OEM no corresponde con tecnología listada en anexos técnicos" },
    { id: "OEM_REFERENCE_MATCHES_TECHNOLOGY", severity: RuleSeverity.WARNING, sourceRequirement: "OEM_REF", targetRequirement: "AT_TECHNOLOGY", rule: "matches_technology", message: "Referencia OEM con tecnología no asimilable a propuesta" },
    { id: "OEM_REFERENCE_CAPACITY_MATCHES_REQUIREMENT", severity: RuleSeverity.CRITICAL, sourceRequirement: "OEM_REF", targetRequirement: "CAPACITY_RULE", rule: "matches_capacity", message: "Capacidad de referencia de planta sub-óptima según regla oficial" },
    { id: "OEM_REFERENCE_EVIDENCE_COMPLETE", severity: RuleSeverity.WARNING, sourceRequirement: "OEM_REF", targetRequirement: "EVIDENCE", rule: "has_evidence", message: "Evidencia de verificación OEM faltante (Contactos/Web)" },
    { id: "OEM_SELECTED_MATCHES_AT_TECHNICAL_PROPOSAL", severity: RuleSeverity.CRITICAL, sourceRequirement: "FORMATO-OEM", targetRequirement: "AT2", rule: "congruent_supplier", message: "Proveedor propuesto discrepa de memoria AT2" },
    { id: "OEM_SELECTED_MATCHES_AE_EQUIPMENT", severity: RuleSeverity.CRITICAL, sourceRequirement: "FORMATO-OEM", targetRequirement: "AE1C", rule: "congruent_equipment", message: "Maquinaria cotizada AE1C no pertenece al ofertante principal" },
    { id: "OEM_SELECTED_MATCHES_CONSORTIUM_SCOPE", severity: RuleSeverity.WARNING, sourceRequirement: "FORMATO-OEM", targetRequirement: "DLA8", rule: "congruent_scope", message: "Alcance OEM discrepa de consorciados en convenio DLA8" },
    { id: "PERSONNEL_EXISTS_IN_AT3A", severity: RuleSeverity.CRITICAL, sourceRequirement: "PERSONNEL", targetRequirement: "AT3A", rule: "matches_personnel", message: "Persona propuesta no integrada en expediente AT3A" },
    { id: "PERSONNEL_EXISTS_IN_AT3B", severity: RuleSeverity.CRITICAL, sourceRequirement: "PERSONNEL", targetRequirement: "AT3B", rule: "matches_organigram", message: "Persona no reflejada en organigrama AT3B" },
    { id: "PERSONNEL_EXISTS_IN_AT12D", severity: RuleSeverity.CRITICAL, sourceRequirement: "PERSONNEL", targetRequirement: "AT12D", rule: "matches_payroll", message: "Persona propuesta no se encuentra en nómina AT12D" },
    { id: "PERSONNEL_COST_EXISTS_IN_AE", severity: RuleSeverity.CRITICAL, sourceRequirement: "PERSONNEL", targetRequirement: "AE1B", rule: "matches_cost", message: "Personal sugerido no costeado en rubro económico Mano de Obra" },
    { id: "PERSONNEL_ROLE_MATCHES_PROGRAM", severity: RuleSeverity.WARNING, sourceRequirement: "PERSONNEL", targetRequirement: "PROGRAMS", rule: "matches_schedule", message: "Lapso de intervención humana no coincide en programas" },
    { id: "EXPERIENCE_CONTRACT_MATCHES_CRITERION", severity: RuleSeverity.CRITICAL, sourceRequirement: "CONTRACT", targetRequirement: "SCORING_CRITERION", rule: "matches_scoring", message: "Contrato no ostenta validación cruzada con criterio de puntuación" },
    { id: "EXPERIENCE_OWNER_IS_ELIGIBLE", severity: RuleSeverity.CRITICAL, sourceRequirement: "CONTRACT", targetRequirement: "LEGAL_ENTITY", rule: "is_eligible", message: "Propietario de la currícula no amparado en registro DLA8" }
];

export const officialScoringCriteria = [
    // I. CALIDAD DE LA OBRA (15.0)
    {
        id: "I-A", section: "I", code: "CALIDAD-MATERIALES", title: "MATERIALES Y EQUIPO DE INSTALACIÓN PERMANENTE", description: "Auditar descripción, características, cantidades, unidades, congruencia con especificaciones.",
        maxPoints: 4.0, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: true, scored: true,
        rejectionCause: true, rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null, riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "AT 9A", sourceSection: "Sección Materiales", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Catálogo original", "Fichas técnicas"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: [],
        supportingRequirementIds: ["AT9A"]
    },
    {
        id: "I-B", section: "I", code: "CALIDAD-MANO-OBRA", title: "MANO DE OBRA", description: "Auditar categorías, cantidades, unidades y congruencia con programa.",
        maxPoints: 2.0, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: true, scored: true,
        rejectionCause: true, rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null, riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "AT 9B", sourceSection: "Sección Mano de Obra", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Programa MO", "Plantilla integrada"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: [],
        supportingRequirementIds: ["AT9B"]
    },
    {
        id: "I-C", section: "I", code: "CALIDAD-MAQUINARIA", title: "MAQUINARIA Y EQUIPO DE CONSTRUCCIÓN", description: "Auditar maquinaria, cantidades, suficiencia, ejecución y cruce contra AE1C.",
        maxPoints: 1.0, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: true, scored: true,
        rejectionCause: true, rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null, riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "AT 9C", sourceSection: "Sección Maquinaria", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Programa Maquinaria"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: ["AE1C_EQUIPMENT_EXISTS_IN_AT7"],
        supportingRequirementIds: ["AT9C"]
    },
    {
        id: "I-D", section: "I", code: "CALIDAD-ORGANIGRAMA", title: "ORGANIGRAMA DE PROFESIONALES TÉCNICOS", description: "Contener nombre, especialidad, puesto, horas-hombre.",
        maxPoints: 0.5, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: true, scored: true,
        rejectionCause: true, rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null, riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "AT 3B", sourceSection: "Sección Organigrama", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Organigrama gráfico"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: ["AT3B_PERSONNEL_EXISTS_IN_AT12D"],
        supportingRequirementIds: ["AT3B"]
    },
    {
        id: "I-E", section: "I", code: "CALIDAD-PLANEACION", title: "PLANEACIÓN / PROCEDIMIENTO CONSTRUCTIVO / PROPUESTA TÉCNICA", description: "Auditar planeación integral, recursos, cómo, cuándo, dónde. No simple copia del catálogo.",
        maxPoints: 4.0, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: true, scored: true,
        // Migrate actual validation into AT2; pointing everything directly to it via supportingRequirementIds: ["AT2"]
        rejectionCause: false, rejectionStatus: RejectionStatus.NOT_CLASSIFIED,
        rejectionBasis: null,
        riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "AT 2", sourceSection: "Procedimiento", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Memoria descriptiva técnica"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "Causal de desechamiento migrada matriz documental AT2.", crossChecks: [],
        supportingRequirementIds: ["AT2"],
        migrationPending: false
    },
    {
        id: "I-F", section: "I", code: "CALIDAD-PROGRAMAS", title: "PROGRAMAS", description: "Auditar congruencia entre ejecución, materiales, mano de obra, maquinaria y personal técnico.",
        maxPoints: 1.0, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: true, scored: true,
        rejectionCause: true, rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null, riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "AT 11", sourceSection: "Programas Generales", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Gantt / Rutas críticas"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: [],
        supportingRequirementIds: ["AT11", "AT12A", "AT12B", "AT12C", "AT12D"]
    },
    {
        id: "I-G", section: "I", code: "CALIDAD-ASEGURAMIENTO", title: "SISTEMA DE ASEGURAMIENTO DE CALIDAD", description: "Auditar sistema de calidad, procedimientos, inspección, control, pruebas, trazabilidad.",
        maxPoints: 2.5, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: true, scored: true,
        rejectionCause: true, rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null, riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "N/A", sourceSection: "Calidad", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Manual de Calidad ISO"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: [],
        supportingRequirementIds: []
    },

    // II. CAPACIDAD DEL LICITANTE (17.0)
    {
        id: "II-A", section: "II", code: "CAPACIDAD-RRHH", title: "RECURSOS HUMANOS", description: "Validar profesión, título, cédula, experiencia, CV, carta compromiso, identificación.",
        maxPoints: 6.0, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: true, scored: true,
        rejectionCause: true, rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null, riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "AT 3", sourceSection: "Plantilla", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Títulos", "Cédulas", "CVs", "Cartas Compromiso"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: [],
        supportingRequirementIds: ["AT3A"]
    },
    {
        id: "II-B", section: "II", code: "CAPACIDAD-ECONOMICA", title: "CAPACIDAD ECONÓMICA", description: "Calculado vía fórmula contable explícita.",
        maxPoints: 6.0, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: true, scored: true,
        rejectionCause: true, rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null, riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "AT 6", sourceSection: "Financiero", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Estados Financieros Auditados"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: [],
        supportingRequirementIds: ["AT6"]
    },
    {
        id: "II-C", section: "II", code: "CAPACIDAD-DISCAPACIDAD", title: "TRABAJADORES CON DISCAPACIDAD", description: "Auditar soporte requerido (IMSS) oficial.",
        maxPoints: 0.5, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: false, scored: true,
        rejectionCause: false, rejectionStatus: RejectionStatus.NOT_APPLICABLE, rejectionBasis: null, riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "AT 13", sourceSection: "Sedesol/IMSS", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Altas IMSS / Constancias"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: [],
        supportingRequirementIds: ["AT13"]
    },
    {
        id: "II-D", section: "II", code: "CAPACIDAD-MIPYME", title: "MIPYME / PARTICIPACIÓN O SOPORTE APLICABLE", description: "Soporte documental conforme texto oficial.",
        maxPoints: 0.5, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: false, scored: true,
        rejectionCause: false, rejectionStatus: RejectionStatus.NOT_APPLICABLE, rejectionBasis: null, riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "N/A", sourceSection: "Estratificación", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Constancia MiPyME"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: [],
        supportingRequirementIds: []
    },
    {
        id: "II-E", section: "II", code: "CAPACIDAD-CARTA-FABRICANTE", title: "CARTA COMPROMISO DEL FABRICANTE DE TECNOLOGÍA", description: "Auditar firma, facultades, tecnología, proyecto, QR aplicable, contacto.",
        maxPoints: 4.0, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: true, scored: true,
        rejectionCause: true, rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null, riskType: RiskType.DOCUMENT_MISSING,
        sourceDocument: "FORMATO-OEM", sourceSection: "Cartas OEM", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Certificado OEM original en hoja membretada"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: [],
        supportingRequirementIds: []
    },

    // III. EXPERIENCIA Y ESPECIALIDAD (15.0)
    {
        id: "III-A", section: "III", code: "EXP-LICITANTE", title: "EXPERIENCIA DEL LICITANTE", description: "Integrantes, cliente, objeto, contratos, fecha, ubicación, importe, evidencia, actas, rol.",
        maxPoints: 6.0, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: true, scored: true,
        rejectionCause: true, rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null, riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "AT 4", sourceSection: "Experiencia", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Contratos", "Actas Entrega"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: [],
        supportingRequirementIds: ["AT4"]
    },
    {
        id: "III-B", section: "III", code: "EXP-ESPECIALIDAD", title: "ESPECIALIDAD", description: "Evidencias relativas a diseño, construcción, operación, referencias OEM.",
        maxPoints: 6.0, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: true, scored: true,
        rejectionCause: true, rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null, riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "AT 4", sourceSection: "Sub-especialidad", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Plantas Referencia comparables"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: [],
        supportingRequirementIds: ["AT4"]
    },
    {
        id: "III-C", section: "III", code: "EXP-CARTA-CDR", title: "CARTA DE INTENCIÓN PARA APROVECHAMIENTO DE CDR", description: "Receptora, autorización, intención expresa, datos y vigencia.",
        maxPoints: 3.0, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: true, scored: true,
        rejectionCause: true, rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null, riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "CDR-01", sourceSection: "Tratamiento / Destino final", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Carta intención certificada de cliente receptor CDR"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: [],
        supportingRequirementIds: []
    },

    // IV. CUMPLIMIENTO CONTRATOS (3.0)
    {
        id: "IV-A", section: "IV", code: "CUMPLIMIENTO-CONTRATOS", title: "CUMPLIMIENTO SATISFACTORIO DE CONTRATOS", description: "Administración pública, actas de recepción, fianzas, trazabilidad de fechas.",
        maxPoints: 3.0, accreditedPoints: 0, estimatedPoints: 0, atRiskPoints: 0, calculationRule: "MANUAL", evidenceUsed: [], validationStatus: "PENDING",
        mandatory: true, scored: true,
        rejectionCause: true, rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null, riskType: RiskType.TECHNICAL_SCORE_LOSS,
        sourceDocument: "AT 4", sourceSection: "Historial de Cumplimiento", sourcePage: "s/d", sourceUrl: "#", evidenceRequired: ["Cartas de satisfaction", "Escritos de baja de fianzas"], evidenceLinked: [], status: RequirementStatus.NOT_STARTED, pointStatus: PointStatus.NOT_EVALUATED, responsible: "SIN ASIGNAR", dueDate: null, notes: "", crossChecks: [],
        supportingRequirementIds: ["AT4"]
    }
];

// FASE 4A: INGESTA DOCUMENTAL ANEXOS TÉCNICOS
export const officialTenderRequirements = [
    {
        id: "AT1", code: "AT1", parentCode: null, group: DocumentGroup.AT, subgroup: "PRESENTACION",
        title: "Manifestación de conocimiento de sitio, condiciones y bases",
        description: "Carta de presentación manifestando que se conoce el sitio, las condiciones de suministro, bases de licitación, anexos, modificaciones y juntas de aclaraciones.",
        exactRequirementSummary: "El licitante manifiesta conocer el sitio, condiciones, convocatoria, juntas de aclaraciones, modificaciones y documentos contractuales.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato AT1 firmado"], deliverables: ["Documento AT1"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 1", sourcePage: "s/d", sourceLocator: "AT-01", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: true, signatureRequired: true, letterheadRequired: true,
        dependencies: [], crossChecks: [],
        ownerRole: "LEGAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.DOCUMENT_MISSING, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT2", code: "AT2", parentCode: null, group: DocumentGroup.AT, subgroup: "TECHNICAL_PROCEDURE",
        title: "Planeación integral y procedimiento constructivo",
        description: "Memoria descriptiva detallando procedimiento constructivo, frentes de trabajo, empleo de recursos.",
        exactRequirementSummary: "Documento propio que explique el CÓMO, CUÁNDO, CON QUÉ se realizarán los trabajos, sin ser una mera copia del catálogo de conceptos.",
        mandatory: true, scored: true, scoringCriteriaIds: ["I-E"],
        rejectionStatus: RejectionStatus.CONFIRMED,
        rejectionBasis: { sourceDocument: "AT 2", section: "General", page: "s/d", textSummary: "Será motivo de desechamiento incluir únicamente el catálogo de conceptos de la licitación." },
        evidenceRequired: ["Memoria técnica descriptiva de procedimiento constructivo"], deliverables: ["Documento AT2"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 2", sourcePage: "s/d", sourceLocator: "AT-02", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: [], crossChecks: [],
        ownerRole: "CONSTRUCTION", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.REJECTION, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT3A", code: "AT3A", parentCode: "AT3", group: DocumentGroup.AT, subgroup: "PERSONNEL",
        title: "Profesionales técnicos responsables al servicio del licitante",
        description: "Compendio documental del personal propuesto, incluyendo su formación, experiencia y titularidad técnica para los frentes de trabajo.",
        exactRequirementSummary: "Se deben integrar CV, identificación, título, cédula y carta compromiso para cada profesional listado en el organigrama AT3B.",
        mandatory: true, scored: true, scoringCriteriaIds: ["II-A"],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["CV", "Título", "Cédula", "Identificación", "Carta Compromiso"], deliverables: ["Expediente personal técnico (AT3A)"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 3", sourcePage: "s/d", sourceLocator: "AT-03", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AT3B"], crossChecks: [],
        ownerRole: "HR", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_SCORE_LOSS, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT3B", code: "AT3B", parentCode: "AT3", group: DocumentGroup.AT, subgroup: "PERSONNEL",
        title: "Organigrama del personal técnico y administrativo",
        description: "Representación gráfica de la jerarquía y disposición de los profesionales responsables del proyecto propuestos en AT3A y costeados en AT12D.",
        exactRequirementSummary: "Organigrama detallando estructura de mando con nombres de responsables congruentes con nóminas referidas.",
        mandatory: true, scored: true, scoringCriteriaIds: ["I-D"],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Organigrama gráfico"], deliverables: ["Documento AT3B gráfico"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 3", sourcePage: "s/d", sourceLocator: "AT-03", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: false, letterheadRequired: false,
        dependencies: ["AT3A"], crossChecks: ["AT3B_PERSONNEL_EXISTS_IN_AT12D"],
        ownerRole: "HR", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.DOCUMENT_MISSING, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT4", code: "AT4", parentCode: null, group: DocumentGroup.AT, subgroup: "EXPERIENCE",
        title: "Experiencia y capacidad técnica",
        description: "Manifestación y comprobación de trabajos similares, con listado de contratos, entes contratantes, montos financieros, alcances técnicos y evidencia documental formal.",
        exactRequirementSummary: "Lista de contratos anteriores demostrando experiencia en el rubro, respaldando todo con copias de contratos, finiquitos o actas de entrega/recepción e historial de cumplimiento de fianzas (satisfacción).",
        mandatory: true, scored: true, scoringCriteriaIds: ["III-A", "III-B", "IV-A"],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Relación de contratos (AT4)", "Copias de contratos", "Actas de entrega", "Mención de liberación fianzas"], deliverables: ["Formatos AT4 y anexos probatorios"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 4", sourcePage: "s/d", sourceLocator: "AT-04", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: true, signatureRequired: true, letterheadRequired: false,
        dependencies: [], crossChecks: [],
        ownerRole: "LEGAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_SCORE_LOSS, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT5", code: "AT5", parentCode: null, group: DocumentGroup.AT, subgroup: "TECHNICAL_SCOPE",
        title: "Documentación complementaria técnica AT5",
        description: "Verificación y extracción pendiente de detalle oficial sobre capacidades operacionales y obligaciones colaterales.",
        exactRequirementSummary: "Pendiente delimitación textual desde el texto activo M1.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: [], deliverables: [],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 5", sourcePage: "s/d", sourceLocator: "AT-05", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: false, letterheadRequired: false,
        dependencies: [], crossChecks: [],
        ownerRole: "TECHNICAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.DOCUMENT_MISSING, priority: "MEDIA",
        evidenceLinks: [], notes: "Referencia reservada.", dueDate: null, normativeReviewStatus: NormativeReviewStatus.PARTIAL
    },
    {
        id: "AT6", code: "AT6", parentCode: null, group: DocumentGroup.AT, subgroup: "FINANCIAL",
        title: "Documentación para acreditar capacidad financiera",
        description: "Estados financieros, declaraciones fiscales, ratios dictaminados y capital de trabajo que prueben solvencia técnica-económica vinculante al cálculo de puntos.",
        exactRequirementSummary: "Estados financieros auditados u originales recientes que sostengan los ratios del numeral II-B.",
        mandatory: true, scored: true, scoringCriteriaIds: ["II-B"],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Estados financieros auditados", "Balance reciente", "Declaraciones anuales fiscales"], deliverables: ["Documento AT6"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 6", sourcePage: "s/d", sourceLocator: "AT-06", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: true, signatureRequired: true, letterheadRequired: false,
        dependencies: [], crossChecks: [],
        ownerRole: "FINANCIAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_SCORE_LOSS, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.PARTIAL
    },
    {
        id: "AT7", code: "AT7", parentCode: null, group: DocumentGroup.AT, subgroup: "TECHNICAL_SCOPE",
        title: "Documentación comprobatoria de tecnología y listados",
        description: "Catálogos y folletos que amparen el suministro de equipos especiales, patentes o maquinaria requerida por el proceso.",
        exactRequirementSummary: "Información técnica que avale el equipo a suministrar propuesto por el OEM para cruce económico.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Fichas técnicas", "Listados de suministro real"], deliverables: ["Documentos AT7"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 7", sourcePage: "s/d", sourceLocator: "AT-07", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: false, letterheadRequired: false,
        dependencies: [], crossChecks: [],
        ownerRole: "OEM", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.DOCUMENT_MISSING, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.PARTIAL
    },
    {
        id: "AT8", code: "AT8", parentCode: null, group: DocumentGroup.AT, subgroup: "LEGAL",
        title: "Manifestación bajo protesta de decir verdad sobre prácticas desleales de comercio internacional",
        description: "Declaración de que los precios consignados en la proposición no se cotizan en condiciones de prácticas desleales de comercio internacional (discriminación de precios o subsidios).",
        exactRequirementSummary: "Documento en papel membretado, firmado por el licitante/representante legal, con datos de la licitación, declarando ausencia de prácticas desleales.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato AT8 firmado y membretado"], deliverables: ["Documento AT8"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 8", sourcePage: "s/d", sourceLocator: "AT-08", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: true,
        dependencies: [], crossChecks: [],
        ownerRole: "LEGAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.DOCUMENT_MISSING, priority: "MEDIA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT9A", code: "AT9A", parentCode: null, group: DocumentGroup.AT, subgroup: "TECHNICAL",
        title: "Listado de materiales y equipos de instalación permanente",
        description: "Relación clasificada y cuantificada de materiales para justificar volúmenes.",
        exactRequirementSummary: "Formatos detallados de materiales a suministrar que soporten calificación I-A y correlacionen plazos AT12A.",
        mandatory: true, scored: true, scoringCriteriaIds: ["I-A"],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Tabla de listado volumétrico base"], deliverables: ["Documento AT9A"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 9", sourcePage: "s/d", sourceLocator: "AT-9A", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: [], crossChecks: ["AT9_MATCHES_AT12_SERIES"],
        ownerRole: "CONSTRUCTION", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_SCORE_LOSS, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT9B", code: "AT9B", parentCode: null, group: DocumentGroup.AT, subgroup: "TECHNICAL",
        title: "Listado de categorías de mano de obra",
        description: "Cédula de perfiles de obreros e instaladores requeridos.",
        exactRequirementSummary: "Formatos detallados del perfil de operadores básicos requiriendo congruencia con plazos en AT12B y scoring I-B.",
        mandatory: true, scored: true, scoringCriteriaIds: ["I-B"],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Tabla de cuadrillas y jornaleros operativos"], deliverables: ["Documento AT9B"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 9", sourcePage: "s/d", sourceLocator: "AT-9B", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: [], crossChecks: ["AT9_MATCHES_AT12_SERIES"],
        ownerRole: "CONSTRUCTION", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_SCORE_LOSS, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT9C", code: "AT9C", parentCode: null, group: DocumentGroup.AT, subgroup: "TECHNICAL",
        title: "Listado de maquinaria y equipo de construcción",
        description: "Relación de activo fijo vehicular y herramientas motoras de carga/edificación requeridos in-situ.",
        exactRequirementSummary: "Formatos detallados de maquinaria de servicio temporal para soportar el scoring I-C y programa erogaciones AT12C.",
        mandatory: true, scored: true, scoringCriteriaIds: ["I-C"],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Listado de maquinaria a intervenir"], deliverables: ["Documento AT9C"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 9", sourcePage: "s/d", sourceLocator: "AT-9C", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: [], crossChecks: ["AT9_MATCHES_AT12_SERIES"],
        ownerRole: "CONSTRUCTION", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_SCORE_LOSS, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT10", code: "AT10", parentCode: null, group: DocumentGroup.AT, subgroup: "TECHNICAL",
        title: "Análisis de la totalidad de los conceptos de trabajo de la propuesta",
        description: "Análisis exhaustivo detallando todos los conceptos de trabajo de la propuesta con apego al formato oficial.",
        exactRequirementSummary: "Debe incluir descripción, razón social, firma, plazo, fecha de presentación, y análisis de 100% de conceptos congruente con el catálogo.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato AT10 llenado y firmado"], deliverables: ["Documento AT10"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 10", sourcePage: "s/d", sourceLocator: "AT-10", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: [], crossChecks: ["AT10_MATCHES_CATALOG_AND_PROGRAMS"],
        ownerRole: "TECHNICAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.DOCUMENT_MISSING, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT11", code: "AT11", parentCode: null, group: DocumentGroup.PROGRAMS, subgroup: "EXECUTION",
        title: "Programa General de Ejecución de los Trabajos",
        description: "Documentación Gantt Calendarizada dictando la distribución del proyecto entero.",
        exactRequirementSummary: "Programa maestro que dictamina todas las rutas críticas generales afectando I-F. Las fechas de erogaciones y subprogramas de AT12A..D deben anidarse exactamente dentro del paraguas del AT11.",
        mandatory: true, scored: true, scoringCriteriaIds: ["I-F"],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Diagrama de Gantt/Ruta crítica"], deliverables: ["Documento AT11"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 11", sourcePage: "s/d", sourceLocator: "AT-11", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: [], crossChecks: ["AT11_MATCHES_AT12_SERIES"],
        ownerRole: "SCHEDULING", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_SCORE_LOSS, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT12A", code: "AT12A", parentCode: "AT12", group: DocumentGroup.PROGRAMS, subgroup: "EXECUTION",
        title: "Programa particular calendarizado y erogaciones de materiales/equipo permanente",
        description: "Periodización técnica de cuándo entran y cuánto se gasta en materiales permanentes.",
        exactRequirementSummary: "Subprograma ligado a AT9A debiendo respetar vigencias maestras de AT11.",
        mandatory: true, scored: true, scoringCriteriaIds: ["I-F"],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Gantt / Tabla erogación materiales"], deliverables: ["Documento formático AT12A"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 12", sourcePage: "s/d", sourceLocator: "AT-12A", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AT11", "AT9A"], crossChecks: [],
        ownerRole: "SCHEDULING", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_SCORE_LOSS, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT12B", code: "AT12B", parentCode: "AT12", group: DocumentGroup.PROGRAMS, subgroup: "EXECUTION",
        title: "Programa particular calendarizado y erogaciones de mano de obra",
        description: "Periodización técnica de cuándo operan los jornaleros descritos en AT9B.",
        exactRequirementSummary: "Subprograma ligado a AT9B, sin contravenir las vigencias maestras de AT11.",
        mandatory: true, scored: true, scoringCriteriaIds: ["I-F"],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Gantt / Tabla erogación mano de obra"], deliverables: ["Documento formático AT12B"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 12", sourcePage: "s/d", sourceLocator: "AT-12B", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AT11", "AT9B"], crossChecks: [],
        ownerRole: "SCHEDULING", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_SCORE_LOSS, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT12C", code: "AT12C", parentCode: "AT12", group: DocumentGroup.PROGRAMS, subgroup: "EXECUTION",
        title: "Programa calendarizado y erogaciones de Uso de Maquinaria",
        description: "Periodización de rentas y operaciones paramétricas de activos de construcción indicados en AT9C.",
        exactRequirementSummary: "Subprograma ligado a AT9C, amparado cronológicamente bajo AT11.",
        mandatory: true, scored: true, scoringCriteriaIds: ["I-F"],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Gantt / Tabla erogación maquinaria"], deliverables: ["Documento formático AT12C"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 12", sourcePage: "s/d", sourceLocator: "AT-12C", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AT11", "AT9C"], crossChecks: [],
        ownerRole: "SCHEDULING", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_SCORE_LOSS, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT12D", code: "AT12D", parentCode: "AT12", group: DocumentGroup.PROGRAMS, subgroup: "EXECUTION",
        title: "Programa calendarizado personal profesional técnico, administrativo y de dirección",
        description: "Distribución horaria y gasto por cada ingeniero y director expuesto en AT3B.",
        exactRequirementSummary: "Cada persona listada en organigrama (AT3B) debe encontrarse documentada en este subprograma contable ligado bajo AT11.",
        mandatory: true, scored: true, scoringCriteriaIds: ["I-F", "I-D"],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Tabla de plantilla administrativa temporal"], deliverables: ["Documento formático AT12D"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 12", sourcePage: "s/d", sourceLocator: "AT-12D", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AT11", "AT3B"], crossChecks: ["AT3B_PERSONNEL_EXISTS_IN_AT12D"],
        ownerRole: "SCHEDULING", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_SCORE_LOSS, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT13", code: "AT13", parentCode: null, group: DocumentGroup.AT, subgroup: "PERSONNEL",
        title: "Manifiesto y Comprobante de Trabajadores con Discapacidad (Sedesol/IMSS)",
        description: "Manifiesto oficial acreditando porcentaje legal de empleados con capacidades diferentes. Adiciona base fiscal (altas IMSS).",
        exactRequirementSummary: "Entrega de documento con anexos comprobatorios IMSS para obtener puntaje sumativo sin comprometer causal de desechamiento técnica (no obligatorio de base para solvencia, pero auditable formalmente si se presenta).",
        mandatory: false, scored: true, scoringCriteriaIds: ["II-C"],
        rejectionStatus: RejectionStatus.NOT_APPLICABLE, rejectionBasis: null,
        evidenceRequired: ["Formato AT13", "Altas patronales vigentes IMSS a personal del formato"], deliverables: ["Documento AT13 integral"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 13", sourcePage: "s/d", sourceLocator: "AT-13", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: [], crossChecks: [],
        ownerRole: "HR", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_SCORE_LOSS, priority: "BAJA",
        evidenceLinks: [], notes: "Requisito condicional optativo para acumular +0.5 puntos.", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT14", code: "AT14", parentCode: null, group: DocumentGroup.AT, subgroup: "TECHNICAL_PROCEDURE",
        title: "Descripción de la planeación integral para actividades a Precio Alzado",
        description: "Planeación integral que abarca el procedimiento constructivo, recursos, producción, estrategia, frentes simultáneos, personal y maquinaria/equipo por frente, demostrando congruencia con el programa.",
        exactRequirementSummary: "Documento en membrete y firmado, enviado por la plataforma, que justifique la logística Precio Alzado congruente con AT2, AT11, AT12A-D y AT15.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato AT14 descriptivo", "Constancia envío Plataforma"], deliverables: ["Documento AT14 firmado y membretado"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 14", sourcePage: "s/d", sourceLocator: "AT-14", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: true,
        dependencies: ["AT2", "AT11", "AT12A", "AT12B", "AT12C", "AT12D", "AT15"], crossChecks: ["AT14_MATCHES_AT2_AND_PROGRAMS"],
        ownerRole: "CONSTRUCTION", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.DOCUMENT_MISSING, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AT15", code: "AT15", parentCode: null, group: DocumentGroup.PROGRAMS, subgroup: "EXECUTION",
        title: "Red de actividades con ruta crítica y avance físico",
        description: "Programa preferentemente en diagrama de barras (Gantt) que establece fechas, hitos, ruta crítica, avances físicos y cédula de avances, sin incluir montos.",
        exactRequirementSummary: "Documento firmado mostrando fecha inicio/término, porcentajes, cédulas, red de actividades sin informaciòn de montos económicos. Congruente con AT11 y AT14.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Diagrama de Red / Ruta crítica sin montos", "Cédula de avances"], deliverables: ["Documento AT15"],
        sourceDocumentId: "DOC-002", sourceDocumentName: "Anexos Técnicos (AT)", sourceSection: "AT 15", sourcePage: "s/d", sourceLocator: "AT-15", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AT11", "AT14"], crossChecks: ["AT15_MATCHES_AT11_AND_AT14"],
        ownerRole: "SCHEDULING", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.DOCUMENT_MISSING, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    // FASE 4B: INGESTA DOCUMENTAL ANEXOS ECONÓMICOS
    {
        id: "AE1A", code: "AE1A", parentCode: "AE1", group: DocumentGroup.AE, subgroup: "DIRECT_COST", economicCategory: "MATERIAL",
        title: "Materiales y Equipo de Instalación Permanente",
        description: "Análisis de costos de materiales incluyendo descripción, especificaciones, origen, unidades, cantidades, costo unitario e importe.",
        exactRequirementSummary: "Formato oficial detallando importes de materiales concurrentes con listados físicos.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato AE1A integrado firmada"], deliverables: ["Documento AE1A"],
        sourceDocumentId: "DOC-003", sourceDocumentName: "Anexos Económicos (AE)", sourceSection: "AE 1A", sourcePage: "s/d", sourceLocator: "AE-1A", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AT9A", "AT12A"], crossChecks: ["AE1A_MATCHES_AT9A", "AE1A_MATCHES_AT12A"],
        ownerRole: "ESTIMATING", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_ECONOMIC_MISMATCH, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AE1B", code: "AE1B", parentCode: "AE1", group: DocumentGroup.AE, subgroup: "DIRECT_COST", economicCategory: "LABOR",
        title: "Mano de Obra",
        description: "Análisis con personal/categoría, jornadas, cantidades, salario real e importe.",
        exactRequirementSummary: "Formato oficial valorizando la fuerza de trabajo, coincidente con AT9B.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato AE1B"], deliverables: ["Documento AE1B"],
        sourceDocumentId: "DOC-003", sourceDocumentName: "Anexos Económicos (AE)", sourceSection: "AE 1B", sourcePage: "s/d", sourceLocator: "AE-1B", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AT9B", "AT12B"], crossChecks: ["AE1B_MATCHES_AT9B", "AE1B_MATCHES_AT12B", "AE1B_MATCHES_PERSONNEL_COSTS"],
        ownerRole: "ESTIMATING", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_ECONOMIC_MISMATCH, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AE1C", code: "AE1C", parentCode: "AE1", group: DocumentGroup.AE, subgroup: "DIRECT_COST", economicCategory: "EQUIPMENT",
        title: "Maquinaria y Equipo de Construcción",
        description: "Análisis de cargos por maquinaria: descripción, unidad, cantidades, costo, importe.",
        exactRequirementSummary: "Formato oficial para maquinaria alineada a lista AT9C.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato AE1C"], deliverables: ["Documento AE1C"],
        sourceDocumentId: "DOC-003", sourceDocumentName: "Anexos Económicos (AE)", sourceSection: "AE 1C", sourcePage: "s/d", sourceLocator: "AE-1C", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AT9C"], crossChecks: ["AE1C_MATCHES_AT9C"],
        ownerRole: "ESTIMATING", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.TECHNICAL_ECONOMIC_MISMATCH, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AE1D", code: "AE1D", parentCode: "AE1", group: DocumentGroup.AE, subgroup: "DIRECT_COST", economicCategory: "DIRECT_COST",
        title: "Integración de Costo Directo",
        description: "Condensado integrando sumatorias directas de Materiales, Mano de Obra y Maquinaria.",
        exactRequirementSummary: "Formato consolidado de costo directo sin alteraciones en su fórmula sumativa.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato AE1D"], deliverables: ["Documento AE1D"],
        sourceDocumentId: "DOC-003", sourceDocumentName: "Anexos Económicos (AE)", sourceSection: "AE 1D", sourcePage: "s/d", sourceLocator: "AE-1D", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AE1A", "AE1B", "AE1C"], crossChecks: ["AE1D_MATCHES_AE1A_B_C"],
        ownerRole: "ESTIMATING", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.ECONOMIC_INCONSISTENCY, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AE2", code: "AE2", parentCode: null, group: DocumentGroup.AE, subgroup: "DIRECT_COST", economicCategory: "SALARY_FACTOR",
        title: "Integración del Factor de Salario Real (FASAR)",
        description: "Cálculo técnico-legal del costo real de un trabajador incorporando exclusivamente LFT, IMSS, INFONAVIT o contrato colectivo aplicable.",
        exactRequirementSummary: "Formato oficial para el SBC y obligaciones obrero patronales, sin prestaciones apócrifas.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.CONFIRMED,
        rejectionBasis: { sourceDocument: "AE2", section: "FASAR", page: "s/d", textSummary: "La inclusión de cualquier prestación distinta a las expresamente establecidas por la ley aplicable produce el desechamiento de la propuesta." },
        evidenceRequired: ["Formato AE2 - FASAR", "Formatos SBC", "Copia contrato colectivo si aplica"], deliverables: ["Documentación FASAR (AE2)"],
        sourceDocumentId: "DOC-003", sourceDocumentName: "Anexos Económicos (AE)", sourceSection: "AE 2", sourcePage: "s/d", sourceLocator: "AE-02", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: true, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AE1B"], crossChecks: [],
        ownerRole: "FINANCIAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.REJECTION, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AE4", code: "AE4", parentCode: null, group: DocumentGroup.AE, subgroup: "INDIRECT_COST", economicCategory: "INDIRECT_COST",
        title: "Análisis, cálculo e integración de Costos Indirectos",
        description: "Integración de honorarios, oficinas centrales de campo, apoyos logísticos, seguros y finanzas desglosados en tarifas porcentuales y montos.",
        exactRequirementSummary: "Formato para cargos indirectos. No se permiten rubros dobles de costos directos o ajenos.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato AE4 - Indirectos"], deliverables: ["Documento AE4"],
        sourceDocumentId: "DOC-003", sourceDocumentName: "Anexos Económicos (AE)", sourceSection: "AE 4", sourcePage: "s/d", sourceLocator: "AE-04", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AE1D"], crossChecks: [],
        ownerRole: "ESTIMATING", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.ECONOMIC_INCONSISTENCY, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AE5", code: "AE5", parentCode: null, group: DocumentGroup.AE, subgroup: "PROFIT", economicCategory: "PROFIT",
        title: "Análisis, cálculo e integración de Utilidad",
        description: "Margen de ganancia neto sobre la base permitida de operaciones (Costos Directos e Indirectos).",
        exactRequirementSummary: "Cálculo técnico-financiero del margen empresarial.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato AE5 (Utilidad)"], deliverables: ["Documento AE5"],
        sourceDocumentId: "DOC-003", sourceDocumentName: "Anexos Económicos (AE)", sourceSection: "AE 5", sourcePage: "s/d", sourceLocator: "AE-05", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AE4"], crossChecks: [],
        ownerRole: "ESTIMATING", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.ECONOMIC_INCONSISTENCY, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AE6", code: "AE6", parentCode: null, group: DocumentGroup.AE, subgroup: "ADDITIONAL_CHARGES", economicCategory: "ADDITIONAL_CHARGES",
        title: "Cargos Adicionales",
        description: "Aplicación y despliegue de tributos federales, impuestos y derechos según corresponda al marco fiscal del sitio.",
        exactRequirementSummary: "Formato paramétrico de cargos como retenciones al millar, inspección o afines.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato AE6 (Cargos adicionales)"], deliverables: ["Documento AE6"],
        sourceDocumentId: "DOC-003", sourceDocumentName: "Anexos Económicos (AE)", sourceSection: "AE 6", sourcePage: "s/d", sourceLocator: "AE-06", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AE5"], crossChecks: [],
        ownerRole: "ESTIMATING", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.ECONOMIC_INCONSISTENCY, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "AE21", code: "AE21", parentCode: null, group: DocumentGroup.AE, subgroup: "BUDGET", economicCategory: "BUDGET",
        title: "Presupuesto Total de los Trabajos",
        description: "Catálogo maestro que fusiona la Obra a Precios Unitarios y los Trabajos a Precio Alzado, totalizándolos con y sin impuestos.",
        exactRequirementSummary: "Condensado absoluto indicando montos globales parciales con importes en número y letra.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato AE21 Principal"], deliverables: ["Documento de totalización presupuestal AE21"],
        sourceDocumentId: "DOC-003", sourceDocumentName: "Anexos Económicos (AE)", sourceSection: "AE 21", sourcePage: "s/d", sourceLocator: "AE-21", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        dependencies: ["AE1D", "AE4", "AE5", "AE6"], crossChecks: ["AE21_TOTAL_CONSISTENCY"],
        ownerRole: "FINANCIAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.ECONOMIC_INCONSISTENCY, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    // FASE 4C: INGESTA DOCUMENTAL LEGAL Y ADMINISTRATIVA
    {
        id: "DLA1", code: "DLA1", parentCode: null, group: DocumentGroup.LEGAL, subgroup: "CORPORATE",
        title: "Acreditación de la Personalidad Jurídica del Licitante",
        description: "Acredita existencia legal y facultades. Requiere acta constitutiva, RFC, objeto social, poderes y manifiesta bajo protesta de decir verdad que facultades no han sido revocadas.",
        exactRequirementSummary: "Documento oficial del representante legal, identificación, datos corporativos.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato DLA1", "Acta constitutiva", "Poder notarial", "Identificación Oficial", "RFC"], deliverables: ["Documento DLA1"],
        sourceDocumentId: "DOC-004", sourceDocumentName: "Anexos Legales y Administrativos (DLA)", sourceSection: "DLA 1", sourcePage: "s/d", sourceLocator: "DLA-01", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        underOathRequired: true, appliesTo: "BOTH", submissionScope: "ONE_PER_PROPOSAL",
        dependencies: [], crossChecks: ["DLA1_MATCHES_MANIFESTATIONS", "COMPANY_NAME_MATCHES_PROOF"],
        ownerRole: "LEGAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.CORPORATE_DATA_MISMATCH, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "DLA2", code: "DLA2", parentCode: null, group: DocumentGroup.ADMINISTRATIVE, subgroup: "CORPORATE",
        title: "Domicilio, Correo y Personas Autorizadas para Notificaciones",
        description: "Formato en papel membretado proporcionando domicilio fiscal, contactos telefónicos y correos electrónicos para oír notificaciones, junto a comprobante de domicilio.",
        exactRequirementSummary: "Formato membretado y comprobantes de domicilio congruentes.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato DLA2 membretado", "Comprobante Domicilio"], deliverables: ["Documento DLA2"],
        sourceDocumentId: "DOC-004", sourceDocumentName: "Anexos Legales y Administrativos (DLA)", sourceSection: "DLA 2", sourcePage: "s/d", sourceLocator: "DLA-02", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: false, letterheadRequired: true,
        underOathRequired: false, appliesTo: "BOTH", submissionScope: "ONE_PER_PROPOSAL",
        dependencies: [], crossChecks: ["DOMICILIO_MATCHES_SUPPORT"],
        ownerRole: "LEGAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.INCONSISTENCY, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "DLA3", code: "DLA3", parentCode: null, group: DocumentGroup.LEGAL, subgroup: "DECLARATIONS",
        title: "Manifestación de Nacionalidad",
        description: "Manifestación en papel membretado, bajo protesta de decir verdad, declarando tener la nacionalidad mexicana.",
        exactRequirementSummary: "Firmado, con membrete y texto de protesta manifestando nacionalidad mexicana.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato DLA3"], deliverables: ["Documento DLA3"],
        sourceDocumentId: "DOC-004", sourceDocumentName: "Anexos Legales y Administrativos (DLA)", sourceSection: "DLA 3", sourcePage: "s/d", sourceLocator: "DLA-03", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: true, signatureRequired: true, letterheadRequired: true,
        underOathRequired: true, appliesTo: "BOTH", submissionScope: "ONE_PER_MEMBER",
        dependencies: [], crossChecks: [],
        ownerRole: "LEGAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.UNDER_OATH_TEXT_MISSING, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "DLA4", code: "DLA4", parentCode: null, group: DocumentGroup.LEGAL, subgroup: "DECLARATIONS",
        title: "Manifestación sobre Estudios, Planes o Programas Previos",
        description: "Declaración bajo protesta si se tienen o no estudios previos, validando si estos guardan relación con costos del mercado.",
        exactRequirementSummary: "Selección clara de HAS o NO_PREVIOUS, firmado bajo protesta de decir verdad.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato DLA4"], deliverables: ["Documento DLA4"],
        sourceDocumentId: "DOC-004", sourceDocumentName: "Anexos Legales y Administrativos (DLA)", sourceSection: "DLA 4", sourcePage: "s/d", sourceLocator: "DLA-04", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: true, signatureRequired: true, letterheadRequired: false,
        underOathRequired: true, appliesTo: "BOTH", submissionScope: "ONE_PER_MEMBER",
        dependencies: [], crossChecks: [],
        ownerRole: "LEGAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.UNDER_OATH_TEXT_MISSING, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "DLA5", code: "DLA5", parentCode: null, group: DocumentGroup.LEGAL, subgroup: "DECLARATIONS",
        title: "Declaración de Integridad",
        description: "Garantiza abstención de prácticas contrarias a la ley, manipulación de evaluaciones e inhabilitaciones.",
        exactRequirementSummary: "Declaración bajo protesta exigible por integrante en caso conjunta.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato DLA5"], deliverables: ["Documento DLA5"],
        sourceDocumentId: "DOC-004", sourceDocumentName: "Anexos Legales y Administrativos (DLA)", sourceSection: "DLA 5", sourcePage: "s/d", sourceLocator: "DLA-05", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: true, signatureRequired: true, letterheadRequired: false,
        underOathRequired: true, appliesTo: "BOTH", submissionScope: "ONE_PER_MEMBER",
        dependencies: [], crossChecks: [],
        ownerRole: "LEGAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.UNDER_OATH_TEXT_MISSING, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "DLA6", code: "DLA6", parentCode: null, group: DocumentGroup.ADMINISTRATIVE, subgroup: "COMPLIANCE",
        title: "Constancia de Situación Fiscal y Opiniones de Cumplimiento",
        description: "Acreditación de vigencia del SAT (30 días), matriz de opiniones positivas fiscales e instituciones de seguridad social por integrante.",
        exactRequirementSummary: "Constancia fiscal actualizada, opiniones SAT, IMSS e INFONAVIT en sentido positivo.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["CSF SAT", "Opinión 32D SAT", "Opinión IMSS", "Opinión INFONAVIT"], deliverables: ["Documento DLA6 Integrado"],
        sourceDocumentId: "DOC-004", sourceDocumentName: "Anexos Legales y Administrativos (DLA)", sourceSection: "DLA 6", sourcePage: "s/d", sourceLocator: "DLA-06", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: true, signatureRequired: false, letterheadRequired: false,
        underOathRequired: false, appliesTo: "BOTH", submissionScope: "ONE_PER_MEMBER",
        documentDate: null, expirationDate: null, daysOld: 0, isCurrent: false, validityRule: "30_DAYS",
        dependencies: [], crossChecks: [],
        ownerRole: "FINANCIAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.LEGAL_EXPIRED, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "DLA7", code: "DLA7", parentCode: null, group: DocumentGroup.ADMINISTRATIVE, subgroup: "MISC",
        title: "Manifestación bajo protesta de decir verdad (Art. 94 LFIIEDB)",
        description: "Manifestación bajo protesta de decir verdad de que el licitante y su representante no se encuentran en los supuestos establecidos en el artículo 94 de la LFIIEDB.",
        exactRequirementSummary: "Formato firmado manifestando que no hay impedimento por Art. 94 de la LFIIEDB.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato DLA7"], deliverables: ["Documento DLA7"],
        sourceDocumentId: "DOC-004", sourceDocumentName: "Anexos Legales y Administrativos (DLA)", sourceSection: "DLA 7", sourcePage: "s/d", sourceLocator: "DLA-07", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: true, signatureRequired: true, letterheadRequired: false,
        underOathRequired: true, appliesTo: "BOTH", submissionScope: "ONE_PER_MEMBER",
        dependencies: [], crossChecks: [],
        ownerRole: "LEGAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.UNDER_OATH_TEXT_MISSING, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "DLA8", code: "DLA8", parentCode: null, group: DocumentGroup.JOINT_PROPOSAL, subgroup: "CORPORATE",
        title: "Convenio de Participación Conjunta",
        description: "Convenio que amalgama a las entidades. Designación de firmas, porcentaje de participación y declaración de solidaridad u obligaciones específicas.",
        exactRequirementSummary: "Formato DLA8, firmado presencialmente o e.firma, abarcando a cada entity member.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Convenio firmado"], deliverables: ["Documento DLA8"],
        sourceDocumentId: "DOC-004", sourceDocumentName: "Anexos Legales y Administrativos (DLA)", sourceSection: "DLA 8", sourcePage: "s/d", sourceLocator: "DLA-08", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        underOathRequired: false, appliesTo: "JOINT_BID", submissionScope: "CONDITIONAL",
        dependencies: ["DLA1"], crossChecks: [],
        ownerRole: "LEGAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.JOINT_PROPOSAL_INCONSISTENCY, priority: "CRÍTICA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "DLA9", code: "DLA9", parentCode: null, group: DocumentGroup.LEGAL, subgroup: "DECLARATIONS",
        title: "Conocimiento y Aceptación de la Convocatoria",
        description: "Confirmación explícita sobre todos los términos, anexos y alcance de bases.",
        exactRequirementSummary: "Firmado y bajo protesta.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato DLA9"], deliverables: ["Documento DLA9"],
        sourceDocumentId: "DOC-004", sourceDocumentName: "Anexos Legales y Administrativos (DLA)", sourceSection: "DLA 9", sourcePage: "s/d", sourceLocator: "DLA-09", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        underOathRequired: true, appliesTo: "BOTH", submissionScope: "ONE_PER_PROPOSAL",
        dependencies: [], crossChecks: [],
        ownerRole: "LEGAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.UNDER_OATH_TEXT_MISSING, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "DLA10", code: "DLA10", parentCode: null, group: DocumentGroup.LEGAL, subgroup: "DECLARATIONS",
        title: "Aceptación del uso de medios electrónicos",
        description: "Responsiva directa de que cualquier problema con Plataforma electrónica o fallas de descompresión asume consecuencias el licitante.",
        exactRequirementSummary: "Formatado en papel membretado y bajo protesta de decir verdad.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato DLA10"], deliverables: ["Documento DLA10"],
        sourceDocumentId: "DOC-004", sourceDocumentName: "Anexos Legales y Administrativos (DLA)", sourceSection: "DLA 10", sourcePage: "s/d", sourceLocator: "DLA-10", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: true,
        underOathRequired: true, appliesTo: "BOTH", submissionScope: "ONE_PER_PROPOSAL",
        dependencies: [], crossChecks: [],
        ownerRole: "LEGAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.ELECTRONIC_SUBMISSION_RISK, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "DLA11", code: "DLA11", parentCode: null, group: DocumentGroup.LEGAL, subgroup: "DECLARATIONS",
        title: "Manifestación de no ejecutar acciones con otro participante",
        description: "Declaración bajo protesta para evitar daños a Hacienda Pública o ventajas indebidas.",
        exactRequirementSummary: "Formato firmado de manera autógrafa conforme al documento DLA activo.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato DLA11"], deliverables: ["Documento DLA11"],
        sourceDocumentId: "DOC-004", sourceDocumentName: "Anexos Legales y Administrativos (DLA)", sourceSection: "DLA 11", sourcePage: "s/d", sourceLocator: "DLA-11", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, autographSignatureRequired: true, letterheadRequired: false,
        underOathRequired: true, appliesTo: "BOTH", submissionScope: "ONE_PER_PROPOSAL",
        dependencies: [], crossChecks: [],
        ownerRole: "LEGAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.UNDER_OATH_TEXT_MISSING, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    },
    {
        id: "DLA12", code: "DLA12", parentCode: null, group: DocumentGroup.LEGAL, subgroup: "DECLARATIONS",
        title: "Manifestación de no subcontratar a otro licitante participante",
        description: "Bajo protesta de decir verdad, la promesa de no subcontratar a licitantes perdedores dentro de la ejecución si resulta adjudicado.",
        exactRequirementSummary: "Formato oficial firmado.",
        mandatory: true, scored: false, scoringCriteriaIds: [],
        rejectionStatus: RejectionStatus.NOT_CLASSIFIED, rejectionBasis: null,
        evidenceRequired: ["Formato DLA12"], deliverables: ["Documento DLA12"],
        sourceDocumentId: "DOC-004", sourceDocumentName: "Anexos Legales y Administrativos (DLA)", sourceSection: "DLA 12", sourcePage: "s/d", sourceLocator: "DLA-12", sourceUrl: "#",
        appliesToJointProposal: true, individualPerConsortiumMember: false, signatureRequired: true, letterheadRequired: false,
        underOathRequired: true, appliesTo: "BOTH", submissionScope: "ONE_PER_PROPOSAL",
        dependencies: [], crossChecks: [],
        ownerRole: "LEGAL", responsiblePerson: "SIN ASIGNAR",
        status: RequirementStatus.NOT_STARTED, riskType: RiskType.UNDER_OATH_TEXT_MISSING, priority: "ALTA",
        evidenceLinks: [], notes: "", dueDate: null, normativeReviewStatus: NormativeReviewStatus.VERIFIED
    }
];

export const demoRequirements = [];

export function validateNormativeModel() {
    let valid = true;
    let blockingErrors = [];
    let warnings = [];

    // Sum points
    let totalScoring = officialScoringCriteria.reduce((sum, req) => sum + req.maxPoints, 0);
    if (Math.abs(totalScoring - 50) > 0.001) {
        valid = false;
        blockingErrors.push(`Suma total de puntajes técnicos NO es 50 (Actual: ${totalScoring})`);
    }

    if (Math.abs(officialConfiguration.minimumTechnicalSolvency - 37.5) > 0.001) {
        valid = false;
        blockingErrors.push(`El mínimo técnico debe ser exactamente 37.50.`);
    }

    // IDs / Codes uniques
    const reqIds = new Set();
    const reqCodes = new Set();
    const allReqs = [...officialScoringCriteria, ...officialTenderRequirements];

    allReqs.forEach(req => {
        if (reqIds.has(req.id)) {
            valid = false;
            blockingErrors.push(`ID duplicado detectado: ${req.id}`);
        }
        reqIds.add(req.id);

        if (req.code) {
            if (reqCodes.has(req.code)) {
                valid = false;
                blockingErrors.push(`Código duplicado detectado: ${req.code}`);
            }
            reqCodes.add(req.code);
        }

        // No fictitious data
        const reqStr = JSON.stringify(req).toLowerCase();
        if (reqStr.includes("consorcio constructor") || reqStr.includes("empresa lider") || reqStr.includes("socia especialista")) {
            valid = false;
            blockingErrors.push(`Dato ficticio encontrado en ${req.id}`);
        }

        if (req.rejectionStatus === RejectionStatus.CONFIRMED && (!req.rejectionBasis || !req.rejectionBasis.textSummary)) {
            valid = false;
            blockingErrors.push(`El ítem ${req.id} tiene estado CONFIRMED pero carece de un rejectionBasis explícito.`);
        }

        if (req.sourceDocument === "N/D" || req.sourceDocument === "") {
            warnings.push(`Documento fuente inexistente o vacío en ${req.id}`);
        }
    });

    officialScoringCriteria.forEach(c => {
        if (c.scored && !c.calculationRule) {
            warnings.push(`Criterio puntuable sin regla de cálculo explícita: ${c.id}`);
        }
        if (c.pointStatus === "SUPPORTED") {
            // "ningún criterio SUPPORTED sin evidencia validada"
            if (!c.validationStatus || c.validationStatus !== "VALIDATED") {
                warnings.push(`Criterio SUPPORTED carece de validación formal en ${c.id}`);
            }
        }
        c.supportingRequirementIds.forEach(supId => {
            if (!reqIds.has(supId)) {
                valid = false;
                blockingErrors.push(`El criterio ${c.id} hace referencia al requisito inexistente: ${supId}`);
            }
        });
    });

    CrossCheckRules.forEach(rule => {
        if (!reqIds.has(rule.sourceRequirement)) {
            warnings.push(`Regla CrossCheck ${rule.id} refiere a sourceRequirement inexistente: ${rule.sourceRequirement}`);
        }
    });

    if (officialScoringCriteria === officialTenderRequirements) {
        valid = false;
        blockingErrors.push("officialScoringCriteria y officialTenderRequirements comparten la misma referencia de memoria.");
    }

    let verifiedCount = 0;
    let partialCount = 0;
    let pendingCount = 0;
    const totalCount = officialTenderRequirements.length;

    officialTenderRequirements.forEach(req => {
        if (req.normativeReviewStatus === NormativeReviewStatus.VERIFIED) verifiedCount++;
        else if (req.normativeReviewStatus === NormativeReviewStatus.PARTIAL) {
            partialCount++;
            warnings.push(`Requisito normativo en estado PARTIAL: ${req.id}`);
        }
        else if (req.normativeReviewStatus === NormativeReviewStatus.PENDING || req.normativeReviewStatus === undefined) {
            pendingCount++;
            warnings.push(`Requisito normativo en estado PENDING: ${req.id}`);
        }
    });

    return {
        valid,
        blockingErrors,
        warnings,
        normativeCoverage: {
            verified: verifiedCount,
            partial: partialCount,
            pending: pendingCount,
            total: totalCount,
            percentage: totalCount > 0 ? (verifiedCount / totalCount) * 100 : 0
        }
    };
}

export function validateEconomicConsistency() {
    let isConsistent = true;
    let errors = [];

    const reqIndex = new Set(officialTenderRequirements.map(r => r.id));
    if (!reqIndex.has("AE1A") || !reqIndex.has("AT9A")) {
        isConsistent = false;
        errors.push("Missing core pair: Materiales (AE1A - AT9A)");
    }
    if (!reqIndex.has("AE1B") || !reqIndex.has("AT9B")) {
        isConsistent = false;
        errors.push("Missing core pair: Mano de Obra (AE1B - AT9B)");
    }
    if (!reqIndex.has("AE1C") || !reqIndex.has("AT9C")) {
        isConsistent = false;
        errors.push("Missing core pair: Maquinaria (AE1C - AT9C)");
    }

    if (!isConsistent) {
        console.warn("[ECONOMIC INCOHERENCE]", errors);
    }
    return isConsistent;
}

export function auditMatrixIntegrity(testMatrix = officialScoringCriteria) {
    return validateNormativeModel();
}

export function validateLegalValidity() {
    let isValid = true;
    let errors = [];

    const dl6Req = officialTenderRequirements.find(r => r.code === "DLA6");
    if (dl6Req && dl6Req.daysOld > 30) {
        isValid = false;
        errors.push("DLA6 - CSF expirada (> 30 días)");
    }

    if (!isValid) console.warn("[LEGAL VALIDITY WARNINGS]", errors);
    return isValid;
}

export function validateSignatureRequirements(docId) {
    const doc = officialTenderRequirements.find(r => r.code === docId);
    if (!doc) return "NOT_REQUIRED";
    if (!doc.signatureRequired) return "NOT_REQUIRED";
    if (doc.status === RequirementStatus.COMPLIANT) return "SIGNED";
    return "PENDING";
}

export const M1LegalData = {
    entity: {
        type: "SINGLE", // Limpio
        name: "",
        members: []
    }
};

export function auditTenderDatasetIntegrity() {
    return validateNormativeModel();
}

// -------------------------------------------------------------
// FASE 4D: MÓDULO FABRICANTE (OEM) 
// -------------------------------------------------------------

export function validateManufacturerReference(reference) {
    if (!reference.verified) return "NOT_REVIEWED";
    if (!reference.plantName || !reference.technologyType || !reference.country) return "PARTIAL";
    if (reference.qualifiesForRequirement) return "SUPPORTED";
    return "REJECTED_REFERENCE";
}

export const manufacturerReferenceRequirement = {
    nationalRequired: null,
    internationalRequired: null,
    minimumCapacityTPD: null,
    requiredTechnology: null,
    sourceStatus: "CONFLICTING_SOURCES",
    sourceEvidence: [],
    clarificationId: null
};

export const M1OEMData = {
    providers: []
};

// -------------------------------------------------------------
// FASE 4E: RECURSOS HUMANOS / EXPERIENCIA CONTRACTUAL
// -------------------------------------------------------------

export function validatePersonnelMatch(personnel) {
    if (!personnel.cv || !personnel.officialId) return "NOT_REVIEWED";
    if (personnel.requiredByRequirementIds.length > 0 && (!personnel.titleDocument || !personnel.professionalLicense)) return "PARTIAL";
    if (personnel.missingEvidence && personnel.missingEvidence.length > 0) return "PARTIAL";
    return "QUALIFIES";
}

export function validateExperienceContract(contract) {
    if (!contract.contractDocument || !contract.acceptanceDocument) return "NOT_REVIEWED";
    if (!contract.client || !contract.scopePerformed.length) return "PARTIAL";
    return "SUPPORTED";
}

export function preventDoubleCounting(references) {
    // Basic mock implementation of not double counting points.
    return true;
}

export const M1PersonnelData = {
    positions: [
        {
            id: "POS-001", roleName: "Superintendente de Construcción", quantityRequired: null,
            professionRequirement: null, specialtyRequirement: null, minimumExperienceYears: null,
            sourceRequirementId: "AT3A", sourceStatus: "CONFLICTING_SOURCES", verificationStatus: "PENDING"
        }
    ],
    members: []
};

export const M1ExperienceData = {
    contracts: []
};

// -------------------------------------------------------------
// FASE 4F: JUNTAS DE ACLARACIONES Y MOTOR NORMATIVO
// -------------------------------------------------------------

export function compareNormativeRule(original, modification) {
    if (!modification) return { changed: false };
    return {
        changed: true,
        changeType: modification.normativeEffect,
        previousValue: original.exactRequirementSummary,
        newValue: modification.effectiveRule,
        sourceClarificationId: modification.clarificationId,
        affectedFields: ["exactRequirementSummary"]
    };
}

export function rebuildEffectiveTenderRules() {
    let status = "CURRENT";
    let coverage = "COMPLETE";

    if (M1ClarificationsData.meetings.length === 0) {
        status = "INCOMPLETE";
        coverage = "NO_SOURCE";
    }

    const hasIncompleteMeetings = M1ClarificationsData.meetings.some(m => !m.sourceDocumentId || m.status === 'SOURCE_MISSING' || m.status === 'NOTICE_ONLY');
    if (hasIncompleteMeetings) {
        status = "RECONCILING";
        coverage = "PARTIAL_MINUTES";
    }

    return { normativeDatasetStatus: status, clarificationCoverageStatus: coverage };
}

export const M1_DEADLINES = {
    proposalSubmission: {
        dateTime: "2026-09-25T10:00:00-06:00",
        timezone: "America/Mexico_City",
        label: "Presentación y Apertura de Proposiciones",
        sourceType: "OFFICIAL_M1_SOURCE"
    }
};

export const M1ClarificationsData = {
    meetings: []
};

export const demoClarifications = {
    active: false,
    includedInAudit: false,
    includedInNormativeDataset: false,
    meetings: [
        {
            id: "JA-01",
            meetingNumber: 1,
            documentName: "Primera Junta de Aclaraciones",
            documentDate: "2023-11-15",
            sourceUrl: "#",
            status: "CURRENT",
            questions: [
                {
                    id: "Q-01",
                    clarificationId: "JA-01",
                    questionNumber: 45,
                    participant: "MSW Tech",
                    question: "¿Se confirmará requerimiento de plantas?",
                    officialAnswer: "Queda pendiente a segunda resolución.",
                    topic: "OEM",
                    affectedRequirementIds: [],
                    affectedScoringCriteriaIds: [],
                    normativeEffect: "CLARIFIED",
                    previousRule: "CONFLICTING_SOURCES",
                    effectiveRule: "PENDING_CLARIFICATION",
                    effectiveFrom: "2023-11-15",
                    sourcePage: "18",
                    sourceLocator: "P-45",
                    reviewStatus: "VERIFIED"
                }
            ],
            modifications: []
        }
    ]
};

export const M1ActiveTender = {
    tenderVersion,
    config: officialConfiguration,
    rules: CrossCheckRules,
    scoringCriteria: officialScoringCriteria,
    tenderRequirements: officialTenderRequirements,
    demoRequirements,
    auditMatrixIntegrity,
    validateNormativeModel,
    validateEconomicConsistency,
    validateLegalValidity,
    validateSignatureRequirements,
    validateManufacturerReference,
    validatePersonnelMatch,
    validateExperienceContract,
    preventDoubleCounting,
    compareNormativeRule,
    rebuildEffectiveTenderRules,
    auditTenderDatasetIntegrity,
    M1LegalData,
    M1OEMData,
    M1PersonnelData,
    M1ExperienceData,
    M1ClarificationsData,
    manufacturerReferenceRequirement
};
