# Corrección del simulador DHL original

Se aplica al componente enlazado por la ruta `/simulators/dhl`: `src/pages/alpha/simulators/DHLAdvancedSimulator.jsx`. No hay que crear otra página ni migrar de exportador.

## Aplicación con Antigravity

Adjunta este ZIP. Pide copiar únicamente los cinco archivos indicados abajo a las mismas rutas de PANDORA 3.0, con respaldo del archivo anterior. Los demás archivos del ZIP proceden del proyecto recibido y no deben reemplazar cambios recientes del proyecto activo. No requiere paquetes nuevos ni servicios pagados.

## Aplicación manual en Windows

Extrae el ZIP en una carpeta aparte. Abre PowerShell dentro de la carpeta `DHL_ENTREGA` y ejecuta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\INSTALAR_DHL.ps1
```

El script pide la ruta de PANDORA 3.0, respalda los archivos existentes y copia solo los cinco de la corrección. `ExecutionPolicy Bypass` se limita a ese proceso; no cambia la configuración permanente. Actualiza la página `/simulators/dhl` del servidor que ya tienes abierto. No borres localStorage ni IndexedDB.

## Archivos de la corrección

1. `src/pages/alpha/simulators/DHLAdvancedSimulator.jsx`: integra el cálculo y el informe en la ruta original, corrige migración de datos, enlaces de formularios y carga de capturas; conserva las funciones de otros módulos recibidos.
2. `src/utils/dhlTenderModel.js`: modelo común de capacidad, calendario, proyección de cuatro años, potencia de referencia, agua base y costos.
3. `src/components/dhl/DHLReportPages.jsx`: informe de 13 páginas; vistas 2–4; proyección 2027–2030 en página 8; todas las referencias, supuestos y pendientes visibles.
4. `src/components/dhl/dhlReferenceViews.js`: capturas históricas del informe original como respaldo cuando falten capturas guardadas. No son un plano ni un modelo 3D nuevo.
5. `src/utils/exportDHLReport.js`: exportación A4 horizontal con control de 13 páginas, carga de imágenes con límite de espera, control de desbordamiento y capa de texto buscable. Conserva imágenes para el diseño y añade texto real del DOM, sin OCR.

Los controles de exclusión de secciones del informe DHL quedan inactivos para conservar sus 13 páginas. No se borran las capturas existentes.

## Evidencia comprobada

- JSX principal analizado y empaquetado, sin errores de sintaxis.
- Modelo numérico: 17 controles, seis escenarios OEE, migración de datos heredados, calendario 248/12, cuatro años y cero OEE comprobados por aserciones.
- Componente original montado en navegador con servicios de nube y visor 3D sustituidos por dobles de prueba: diez pestañas abiertas sin errores; migración de 9 a 8.5 h; informe original de 13 páginas.
- Exportador real jsPDF/html2canvas ejecutado en Chromium: PDF de 13 páginas A4 horizontal y texto extraíble. Los déficits son visibles en el informe.
- Diseño de las 13 páginas revisado; control de desbordamiento sin hallazgos. PDF entregado como revisión.

La prueba aislada del componente no acredita conexión a Supabase, funcionamiento del visor 3D completo ni el build de toda PANDORA. El ZIP recibido no incluía index.html, configuración original de Vite/Tailwind, entorno ni activos públicos. Antigravity debe probar el build en tu proyecto completo y descargar el PDF desde la ruta original.

## Bases y límites de ingeniería

2028: 2819 unidades/día, 350 u/h nominales, turno 8.5 h, un turno, 248 días/año, OEE 95% supuesto. Producción 2826.25/día; margen +7.25; equilibrio OEE 94.7563025%; capacidad anual 700910.

2027/2029/2030 recuperan hipótesis del DHLSimulator.jsx recibido: 2500/2950/3100 unidades/día y OEE 92/96/97%. No se identifican como demandas aprobadas por DHL. Con esas hipótesis hay déficit en 2029 y 2030.

Potencia: oferta A documenta 15 HP bomba, 10 HP soplador, 0.5 HP banda y 18 kW calentamiento; anexo B indica 7 kW SWM. Suma convertida: 44.01535 kW de referencia, PARCIAL. Falta potencia incremental del BA y rendimiento eléctrico. No se fuerza 64 ni 61.25 kW como total validado.

Agua: 1230 L/h y reposición 164 L/h según anexo. 1200 L es volumen del tanque. La relación 1-164/1230 no demuestra recuperación semanal. No hay balance dinámico de llenado, calentamiento, pérdidas, recambios y paros. El consumo mostrado es base, no total certificado.

Pendientes para DHL: mezcla/recetas y tapas, OEE medido y pérdidas, calidad y secado, ruido ≤65 dB(A), recuperación semanal ≥80%, potencia BA y envolvente integral, pesos operativos y alcance comercial final. No puede resolverlos una corrección de software sin evidencia de ingeniería.

## Verificación reproducible del modelo

Desde la carpeta extraída:

```bash
node DHL_ENTREGA/verificar-modelo.mjs
```
