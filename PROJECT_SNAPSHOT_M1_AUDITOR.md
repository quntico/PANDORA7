# PROJECT SNAPSHOT: PANDORA / M1 AUDITOR

## 1. ESTADO GENERAL DEL PROYECTO

- **Stack tecnológico completo**: React 18, Vite 4.4, TailwindCSS 3.4
- **Lenguaje**: JavaScript (ES Modules, JSX)
- **Base de datos**: Supabase (PostgreSQL), Zustand (Local Storage Persist: `pandora_m1`)
- **Servicios externos**: OpenAI API, Google Drive API (vía googleapis)
- **Autenticación**: Supabase Auth (general), Google OAuth2 (para M1 Drive Sincro)
- **APIs**: Backend interno local en Express (puerto 3001) para intermediación segura con OpenAI
- **Integración con Google Drive**: Soporte básico vía `M1DriveService.js` mediante Node. (Por el momento en estado `DISCONNECTED` o simulado si faltan credenciales OAuth reales)
- **Integración de IA**: OpenAI SDK en Node (`M1AgentService.js`), capacidades de function calling y tools interactivas (Ej. `create_chart`). Modos y roles de sistema ajustados para actuar como Copiloto Experto.
- **Variables de entorno necesarias**: `OPENAI_API_KEY`, `OPENAI_MODEL`, `VITE_M1_API_BASE_URL`
- **Estado de compilación actual**: Ejecutándose exitosamente
- **Errores**: No hay bloqueos críticos en build de Vite, pero al ser JS (sin TS estricto), carece de validación de tipos, permitiendo errores de `undefined` si faltan props en los componentes.

**Clasificación global: PARCIALMENTE OPERATIVO**
*Por qué:* La interfaz gráfica (UI/UX), la navegación, el motor de reglas estático (M1AuditEngine) y el agente conversacional IA están totalmente construidos y funcionales. Sin embargo, la integración con Google Drive aún requiere refinamiento de credenciales reales y la ingesta documental para calificar archivos automáticamente sigue requiriendo desarrollo back-end profundo.

---

## 2. ÁRBOL REAL DEL PROYECTO

Estructura relevante analizada:

- `/src/`
  - `/components/` -> Componentes compartidos globales de UI
  - `/context/` -> ProjectContext, BetaContext, LanguageContext
  - `/layouts/` -> MainLayout, BetaLayout
  - `/pages/` -> Rutas principales antiguas (Simulators, Dashboard, verify)
  - `/modules/` -> **Punto focal de nueva arquitectura modular M1**
    - `/m1/`
      - `M1Page.jsx` -> Contenedor principal de todo el sistema Auditor M1
      - `M1Store.js` -> Estado global persistente Zustand
      - `M1AgentStore.js` -> Estado del IA Copilot
      - `M1GlobalAgentSandbox.jsx` -> UI flotante del asistente IA (arrastrable)
      - `M1AgentConsole.jsx` -> Centro de Control "Fullscreen" del Agente
      - `M1ChecklistView.jsx` / `M1RiskView.jsx` / `M1DriveView.jsx` -> Distintas vistas tabulares de control 
      - `/data/` -> Contiene `m1ActiveTender.js` (Fuente de Verdad del modelo lógico)
      - `/services/` -> `M1AuditEngine.js` y `M1ApiService.js` para cálculos
- `/lib/` -> Servicios backend express paralelos (`M1AgentService.js`)
- `server.js` -> Inicializador de endpoints Backend
- `package.json` / `vite.config.js` -> Configuración del proyecto

---

## 3. RUTAS Y PANTALLAS

### Rutas Globales (`App.jsx`)
- `/` y `/alpha`: Layouts base
- `/m1` -> `M1Page.jsx` (Pantalla principal del sistema Auditor)

### Navegación Interna de M1 (Renderizado Condicional por `M1Store:activeView`)
- **Dashboard**: `M1DashboardView.jsx` (Muestra KPIs globales y progreso) - REAL (lee de Store)
- **Checklist**: `M1ChecklistView.jsx` (Lista de requisitos formales M1) - REAL (lee `requirements` de M1Store)
- **Calificación**: `M1ChecklistView.jsx` - Comparte lógica tabular
- **Personal / Experiencia / Técnico / Económico / Legal / Fabricantes**: Distintas vistas que mapean secciones filtradas de los requisitos cargados. (Parcialmente implementado el filtrado de UI)
- **Agent Console**: `M1AgentConsole.jsx` - OPERATIVO (interactúa con OpenAI vía Backend para lógica de chat, genera cuadros)
- **Sincronización Drive**: `M1DriveView.jsx` - PARCIAL/MOCK (permite visualización, pero la extracción real de los archivos PDF está incompleta)

**Estado general de vistas:** Utilizan los datos reales declarados en el modelo lógico `m1ActiveTender.js` pero no tienen conectada aún la lógica de mutación de base de datos final salvo su estado local Zustand.

---

## 4. MODELO DE DATOS

**Zustand persist store (`pandora_m1`) en `M1Store.js`**:
- **activeView**: String
- **auditStatus**: `NOT_STARTED` | `IN_PROGRESS`
- **requirements**: Array (estado dinámico de los anexos formales AT/AE/DLA)
- **personnel, experience, documents, risks**: Arrays paralelos analíticos.
- **scores**:
  - `officialTechnicalMaxPoints` y cálculo progresivo.
- **settings**: Configuraciones del usuario (`driveStatus`, `driveFolderId`, etc.)

**Zustand persist store (`pandora_m1_agent`) en `M1AgentStore.js`**:
- **sessions**: Historiales de chat (conversaciones con el agente)
- **aiStatus**: Conexión con modelo OpenAI Configurado/No Configurado.
- **kpis**: `processedRequests`, `sourcedAnswers`, `activeBlocks`.

---

## 5. MODELO NORMATIVO M1

La fuente de verdad absoluta está en: **`src/modules/m1/data/m1ActiveTender.js`**.

**ESTRUCTURAS CONTENIDAS:**
1. `officialConfiguration`: Puntos mínimos y máximos (Solvencia = 37.50, Max = 50.0).
2. `officialScoringCriteria` (Lista estriada)
   - I-A: Calidad Materiales (AT9A, Max: 4.0)
   - I-B: Mano de Obra (AT9B, Max: 2.0)
   - I-C: Maquinaria (AT9C, Max: 1.0)
   - I-D: Organigrama (AT3B, Max: 0.5)
   - I-E: Planeación (AT2, Max: 4.0)
   - I-F: Programas (AT11, Max: 1.0)
   - I-G: Calidad ISO (Max: 2.5)
   - II-A: Capacidad RRHH (AT3A, Max: 6.0)
   - II-B: Capacidad Económica (AT6, Max: 6.0)
   - II-C: Discapacitados (AT13, Max: 0.5)
   - II-E: OEM Carta (FORMATO-OEM, Max: 4.0)
   - III-A: Exp. Licitante (AT4, Max: 6.0)
   - III-B: Especialidad (AT4, Max: 6.0)
   - III-C: Carta CDR (Max: 3.0)
   - IV-A: Cumplimiento de contratos (AT4, Max: 3.0)
3. `officialTenderRequirements` (Anexos Críticos)
   - AT1 a AT15 (Técnicos)
   - AE1 a AE21 (Económicos)
   - DLA1 a DLA3 (Legales)
4. `CrossCheckRules`: Reglas de inferencia estructural cruzada (Ej. `AT3B_PERSONNEL_EXISTS_IN_AT12D`).

Todos los requerimientos tienen banderas de: `obligatorio`, `puntuable`, `riesgo`, `status`.

---

## 6. MOTOR DE CALIFICACIÓN

**Archivo:** `src/modules/m1/services/M1AuditEngine.js`

**Reglas actuales IMPLEMENTADAS / HARDCODEADAS**:
1. Recorre todos los requisitos (o fallback al `officialScoringCriteria` de no existir modificados).
2. Suma puntos según el `pointStatus`. SOLO suma a la cuenta Acreditada si el status es `SUPPORTED`.
3. Valida contra la meta solvente `37.50`.
4. Calcula faltante base `37.50 - accreditedTechnicalPoints`.
5. Acumula los requisitos `NO_EVIDENCE` que son `mandatory` al bloque de Riesgos Críticos (Causal de Desechamiento).

**Diferenciación:**
- **IMPLEMENTADO:** Fórmula sumativa de Puntajes y Detección de Faltantes.
- **NO IMPLEMENTADO:** Las reglas cruzadas `CrossCheckRules` aún no validan inteligentemente archivos, se asume que un humano (o Agente superior) las activa mutando el store.

---

## 7. CHECKLIST

Actualmente renderizado en **`M1ChecklistView.jsx`**.
**Campos Existentes**:
- Código (Ej. AT2)
- Nombre de Requisito
- Grupo/Categoría (DocumentGroup)
- Responsable (ownerRole / responsiblePerson)
- Estado Carga (DocumentMaturity)
- Evidencias o Enlaces Cargados
- Banderas Críticas (Causal Desechamiento)

**Faltantes en la DB/UI del Checklist:** Observación persistente en cada fila y la acción de auto-corrida de IA por fila independiente. 

---

## 8. MOTOR DE AUDITORÍA

Botón **EJECUTAR AUDITORÍA** (`runFullAudit(state)` en M1AuditEngine).

- **Función:** Genera una corrida síncrona sobre el estado de Zustand array `requirements` contra las reglas duras de M1.
- **Detecciones Reales Actuales:** SÍ detecta documento faltante, riesgo de pérdida de puntos, causa crítica estructural.
- **Detecciones Incompletas/Falsas:** NO detecta de forma nativa firmas faltantes dentro de PDF, deficiencia de personal, vigencias, o errores de suma matemática en los excels porque para ello el PDF necesita ser ingerido primero.

---

## 9. GOOGLE DRIVE

Botón **SINCRO DRIVE** (`M1DriveView.jsx`).

- Autentica a través de variables o el SDK local, marcando el estado global como `CONNECTED`.
- **Estado Actual:** Principalmente Mock / Visual. Se asume que el backend en una futura implementación ejecutará la sincronización recursiva, extraerá la metadata OCR, y relacionará los IDs extraidos al Store de Zustand. Actualmente reporta el estatus, se simula o fracasa si el backend de Express no halla tokens OAuth definidos localmente.

---

## 10. IA / AGENTES

- **Agente Global M1 Copilot**: Opera mediante `M1GlobalAgentSandbox.jsx` y `M1AgentConsole.jsx`.
- **Backend Paralelo**: Node.js `M1AgentService.js`.
- **Motor/Proveedor**: OpenAI (Modelos Chat Completions) - Inyección dinámica `gpt-5.6-sol` (en su defecto mapeado a GPT-4o vía el validador estricto interno).
- **Prompt:** Modificado extensivamente para evitar formatos robóticos, supresión de tags crudos, actuando ultra-eficiente. Se envía el texto exacto del contexto de la App actual para entendimiento espacial.
- **Tools / Functions:** Registra y mapea herramientas para generar gráficos estadísticos Recharts mediante `create_chart` y buscar datos externos.

---

## 11. HARDCODES, MOCKS Y DATOS FALSOS

- **El Store `Zustand` inicia vacío**: Si no se inyectan los arrays base iniciales (hydrate), la UI muestra `0 documentos` por defecto en todos lados hasta sincronizar la matriz.
- El requisito normativo pide `37.5` puntos inyectables; estos están hardcodeados lógicamente en `M1AuditEngine.js`.
- Ciertos strings como `"SIN ASIGNAR"` de los responsables están hardcodeados en el Array de `m1ActiveTender.js`.

---

## 12. FUNCIONALIDADES ROTAS O INCOMPLETAS

| PRIORIDAD | MÓDULO | PROBLEMA | ARCHIVO | SOLUCIÓN |
| :--- | :--- | :--- | :--- | :--- |
| **P1** | Motor Backend | No procesa los PDFs ni imágenes (OCR incompleto server-side) vinculandolos al motor. | `server.js` | Conectar y enlazar extractores de PDF a requerimientos. |
| **P1** | Calificador | El Módulo "EJECUTAR AUDITORÍA" no dispara revisión IA profunda; solo matemática de Store. | `M1AuditEngine.js` | Agregar hook asíncrono para verificar consistencia documental cruzada con OpenAI vía tools. |
| **P2** | Google Drive | El proceso OAuth completo a nombre del cliente no está resguardado en el frontend. | `M1DriveView.jsx` | Integrar ventana nativa Google SSO. |

---

## 13. QUÉ FALTA PARA TERMINAR HOY (M1 AUDITOR CORE)

### BLOQUE A — INDISPENSABLES PARA ENTREGA FUNCIONAL (OPERATIVO)
- **A1. Iniciar Base de Datos Local**: Inyectar formalmente el array `officialTenderRequirements` dentro del Store vacío Zustand `requirements` al montar la aplicación para popular las tablas de todo el dashboard de manera funcional. (Dificultad: **BAJA**)
- **A2. Botón Editar en Tablas**: Permitir que el checklist altere el estado local `PointStatus` (Ej. pasar de `NOT_EVALUATED` a `SUPPORTED`) para que la Matemática en Audit Engine opere. (Dificultad: **BAJA**)
- **A3. Visión de Requisitos Faltantes en el Dashboard**: Conectar correctamente los KPIs del Home a las sumas reales. (Dificultad: **BAJA**)

### BLOQUE B — NECESARIOS
- **B1. Prompt de Evaluación Cruzada**: Instruir al agente que reciba un extracto crudo y emita una calificación `CONFIRMED` en el Store de un requisito del M1. (Dificultad: **MEDIA**)

### BLOQUE C — DESEABLES
- **C1. Conexión de API Oauth Drive**: (Dificultad: **ALTA**)

---

## 14. ARCHIVOS QUE NECESITA CHATGPT

Para traspasar correctamente el contexto de la sesión global actual referencial a otro modelo IA:

1. `src/modules/m1/M1Store.js`
2. `src/modules/m1/services/M1AuditEngine.js`
3. `src/modules/m1/data/m1ActiveTender.js` (Solo los arreglos base o su esquema estructural)
4. `src/modules/m1/M1AgentConsole.jsx`
5. `src/modules/m1/M1Page.jsx`
6. `lib/M1AgentService.js` (Backend)

*(Puedes adjuntar explícitamente estos archivos para recuperar exactamente la dinámica de este auditor M1).*
