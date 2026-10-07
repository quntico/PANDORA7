param([string]$ProjectPath)
$ErrorActionPreference = 'Stop'
$sourceRoot = Split-Path -Parent $PSScriptRoot
if (-not $ProjectPath) {
  if (Test-Path (Join-Path (Get-Location) 'src\pages\alpha\simulators\DHLAdvancedSimulator.jsx')) { $ProjectPath = (Get-Location).Path }
  else { $ProjectPath = Read-Host 'Pega la ruta completa de PANDORA 3.0 (sin comillas)' }
}
$ProjectPath = $ProjectPath.Trim('"')
if (-not (Test-Path (Join-Path $ProjectPath 'src\pages\alpha\simulators\DHLAdvancedSimulator.jsx'))) { throw 'No se encontro el proyecto PANDORA. No se copio ningun archivo.' }
$files = @('src\pages\alpha\simulators\DHLAdvancedSimulator.jsx','src\utils\dhlTenderModel.js','src\utils\exportDHLReport.js','src\components\dhl\DHLReportPages.jsx','src\components\dhl\dhlReferenceViews.js')
foreach ($file in $files) { if (-not (Test-Path (Join-Path $sourceRoot $file))) { throw "Paquete incompleto: $file" } }
$backupRoot = Join-Path $ProjectPath ('DHL_respaldo_' + (Get-Date -Format 'yyyyMMdd_HHmmss'))
foreach ($file in $files) {
  $target = Join-Path $ProjectPath $file
  if (Test-Path $target) { $back = Join-Path $backupRoot $file; New-Item -ItemType Directory -Force -Path (Split-Path $back) | Out-Null; Copy-Item -LiteralPath $target -Destination $back }
}
foreach ($file in $files) {
  $target = Join-Path $ProjectPath $file
  New-Item -ItemType Directory -Force -Path (Split-Path $target) | Out-Null
  Copy-Item -LiteralPath (Join-Path $sourceRoot $file) -Destination $target -Force
}
Write-Host 'Correccion aplicada a cinco archivos. No se modificaron dependencias ni otros simuladores.'
Write-Host "Respaldo: $backupRoot"
Write-Host 'Actualiza /simulators/dhl. Abre Visualizar Informe y comprueba 13 paginas; proyeccion anual en pagina 8.'
