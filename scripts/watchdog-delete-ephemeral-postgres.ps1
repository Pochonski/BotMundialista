# Watchdog-PostgresEphemeral.ps1
# Detecta y elimina los PostgreSQL Flexible Servers no-deseados si reaparecen
# (Azure los puede auto-recrear al reactivarse o mediante plantillas/Bicep).
#
# Programar con Task Scheduler (recomendado cada 1 hora):
#   schtasks /create /tn "WatchdogPostgres" /tr "powershell -ExecutionPolicy Bypass -File C:\Users\josep\Documents\Joseph\Proyectos\BotMundialista\scripts\watchdog-delete-ephemeral-postgres.ps1" /sc hourly /mo 1 /ru SYSTEM
#
# O ejecutar manualmente:
#   npm run azure:watchdog-pg

$ErrorActionPreference = 'Continue'

# Modulo Azure
try {
    Import-Module Az.Accounts, Az.PostgreSqlFlexibleServer -ErrorAction Stop | Out-Null
} catch {
    Write-Host "[FAIL] No se pudieron cargar modulos Az. Instalar con: Install-Module Az -Scope CurrentUser -Force" -ForegroundColor Red
    exit 1
}

# Autenticacion silenciosa (usa cache si existe, si no, device code)
$ctx = Get-AzContext -ErrorAction SilentlyContinue
if (-not $ctx -or -not $ctx.Account) {
    Write-Host "[AUTH] Iniciando device code auth..." -ForegroundColor Yellow
    try {
        Connect-AzAccount -UseDeviceAuthentication -ErrorAction Stop | Out-Null
    } catch {
        Write-Host "[FAIL] Auth fallida: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Lista de servidores a eliminar (serverName, resourceGroup)
$targets = @(
    @{ Name = 'pgprop-53383';         RG = 'rg-plataforma-arrendamientos' },
    @{ Name = 'pgprop-prop-74777';    RG = 'JosephResourceGroup' },
    @{ Name = 'ms-propiedades-53383'; RG = 'JosephResourceGroup' }
)

$logFile = Join-Path $PSScriptRoot '..\logs\watchdog-postgres.log'
$logDir = Split-Path $logFile
if (-not (Test-Path $logDir)) { New-Item -ItemType Directory -Path $logDir -Force | Out-Null }

function Write-Log {
    param($Message, $Color = 'White')
    $ts = Get-Date -Format 'yyyy-MM-dd HH:mm:ss'
    $line = "[$ts] $Message"
    Write-Host $line -ForegroundColor $Color
    Add-Content -LiteralPath $logFile -Value $line -ErrorAction SilentlyContinue
}

Write-Log "=== Watchdog PostgreSQL ejecutado ===" 'Cyan'

$found = 0
$deleted = 0
$skipped = 0

foreach ($t in $targets) {
    try {
        $srv = Get-AzPostgreSqlFlexibleServer -ResourceGroupName $t.RG -Name $t.Name -ErrorAction Stop
        $found++
        $state = $srv.State
        Write-Log "Detectado: $($t.Name) ($($t.RG)) estado=$state" 'Yellow'

        if ($state -in @('Dropping', 'Deleting')) {
            Write-Log "  -> ya en proceso de eliminacion, saltando" 'DarkGray'
            $skipped++
            continue
        }

        if ($state -eq 'Stopped') {
            Write-Log "  -> Stopped: eliminando inmediatamente" 'Cyan'
        } elseif ($state -eq 'Ready') {
            Write-Log "  -> Ready: primero Stop, luego Delete" 'Cyan'
            try {
                Stop-AzPostgreSqlFlexibleServer -ResourceGroupName $t.RG -Name $t.Name -Confirm:$false -ErrorAction Stop | Out-Null
                Write-Log "  -> Stop enviado" 'Cyan'
            } catch {
                Write-Log "  -> WARN stop fallo (continuo con delete): $($_.Exception.Message.Split([Environment]::NewLine)[0])" 'Yellow'
            }
            Start-Sleep -Seconds 5
        } elseif ($state -eq 'Stopping') {
            Write-Log "  -> aun parandose, esperando 20s antes de delete" 'DarkGray'
            Start-Sleep -Seconds 20
        }

        try {
            Remove-AzPostgreSqlFlexibleServer -ResourceGroupName $t.RG -Name $t.Name -Confirm:$false -ErrorAction Stop | Out-Null
            Write-Log "  -> ELIMINADO" 'Green'
            $deleted++
        } catch {
            Write-Log "  -> FAIL delete: $($_.Exception.Message.Split([Environment]::NewLine)[0])" 'Red'
        }
    } catch {
        $msg = $_.Exception.Message.Split([Environment]::NewLine)[0]
        if ($msg -match 'NotFound|404|ResourceNotFound|was not found') {
            Write-Log "OK $($t.Name) ($($t.RG)): no existe (limpio)" 'DarkGray'
        } else {
            Write-Log "ERROR $($t.Name) ($($t.RG)): $msg" 'Red'
        }
    }
}

Write-Log "Resumen: encontrados=$found eliminados=$deleted skipped=$skipped" 'Cyan'
Write-Log "=== Watchdog finalizado ===`n" 'Cyan'
