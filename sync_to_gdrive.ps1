param(
    [Parameter(Mandatory=$false)]
    [string]$DriveFolder = ""
)

$LocalFolder = "$PSScriptRoot\M1 NEXUS"
$ConfigFile = "$PSScriptRoot\.m1_nexus_drive_path.txt"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "    PANDORA M1 <-> GOOGLE DRIVE SYNC     " -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# 1. Recuperar la ruta de Drive guardada previamente
if ([string]::IsNullOrWhiteSpace($DriveFolder)) {
    if (Test-Path $ConfigFile) {
        $DriveFolder = Get-Content $ConfigFile
        Write-Host "Usando ruta guardada: $DriveFolder" -ForegroundColor Green
    } else {
        $DriveFolder = Read-Host "Ingresa la ruta local de tu Google Drive para la carpeta 'M1 NEXUS' (ej. G:\Mi unidad\M1 NEXUS o C:\Users\Nombre\Google Drive\M1 NEXUS)"
        if (-Not (Test-Path $DriveFolder)) {
            Write-Host "¡Advertencia! La ruta destino no parece existir. Verifica si Google Drive for Desktop está activo." -ForegroundColor Yellow
        } else {
            Set-Content -Path $ConfigFile -Value $DriveFolder
            Write-Host "Ruta guardada exitosamente para futuras sincronizaciones." -ForegroundColor Green
        }
    }
}

if ([string]::IsNullOrWhiteSpace($DriveFolder)) {
    Write-Host "No se proporcionó una ruta válida. Sincronización abortada." -ForegroundColor Red
    exit 1
}

# 2. Verificar origen
if (-Not (Test-Path $LocalFolder)) {
    Write-Host "Error: No se encontró la carpeta local M1 NEXUS en $LocalFolder" -ForegroundColor Red
    exit 1
}

# 3. Eliminar barra final si existe en el destino
$DriveFolder = $DriveFolder.TrimEnd('\')

Write-Host "`nIniciando sincronización unidireccional (Local -> Google Drive)...`n" -ForegroundColor Yellow

# 4. Robocopy MIRROR (Espejo local al destino, borra del destino lo que no esté en local)
# /MIR: Mirror, /MT:8: Multi-thread, /R:1 /W:1: Reintentos rápidos, /NP: No progreso por archivo (más limpio), /NDL /NFL: Solo loggea errores y resumen
$robocopyParams = @(
    $LocalFolder,
    $DriveFolder,
    "/MIR",
    "/MT:8",
    "/R:1",
    "/W:1",
    "/XD", "node_modules", ".git", "dist",
    "/XF", ".env*", "*.log", "credentials.json"
)

& robocopy @robocopyParams

$exitCode = $LASTEXITCODE
if ($exitCode -ge 8) {
    Write-Host "`n[ERROR] Ocurrió al menos un fallo copiando los archivos." -ForegroundColor Red
} else {
    Write-Host "`n[ÉXITO] Archivos sincronizados en Google Drive correctamente." -ForegroundColor Green
}

Write-Host "La próxima vez, ChatGPT ejecutará este archivo con la ruta ya configurada cuando pidas 'SYNC M1 NEXUS'." -ForegroundColor Cyan
