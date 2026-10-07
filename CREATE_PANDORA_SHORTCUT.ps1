$WshShell = New-Object -comObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$ShortcutPath = "$DesktopPath\PANDORA M1.lnk"

$Shortcut = $WshShell.CreateShortcut($ShortcutPath)
$Shortcut.TargetPath = "$PSScriptRoot\START_PANDORA_M1.cmd"
$Shortcut.WorkingDirectory = "$PSScriptRoot"
$Shortcut.IconLocation = "$PSScriptRoot\public\favicon.ico"
$Shortcut.Description = "Lanzador de PANDORA M1"

$Shortcut.Save()
Write-Host "Acceso directo creado en el Escritorio: $ShortcutPath"
