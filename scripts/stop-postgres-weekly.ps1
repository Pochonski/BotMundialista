# Stop-PostgresWeekly.ps1
# Re-pausa los 3 PostgreSQL Flexible Servers (auto-resume a los 7 días).
# Uso:
#   Manual:        .\Stop-PostgresWeekly.ps1
#   Programado:    schtasks /create /tn "StopPGWeekly" /tr "powershell -File C:\...\Stop-PostgresWeekly.ps1" /sc weekly /d SUN /st 02:00

$ErrorActionPreference = 'Continue'
Import-Module Az.Accounts, Az.PostgreSqlFlexibleServer -ErrorAction SilentlyContinue

if (-not (Get-AzContext -ErrorAction SilentlyContinue)) {
    Connect-AzAccount -UseDeviceAuthentication
}

$servers = @(
    @{ Name = 'pgprop-53383';          RG = 'rg-plataforma-arrendamientos' },
    @{ Name = 'pgprop-prop-74777';     RG = 'JosephResourceGroup' },
    @{ Name = 'ms-propiedades-53383';  RG = 'JosephResourceGroup' }
)

foreach ($s in $servers) {
    try {
        $state = (Get-AzPostgreSqlFlexibleServer -ResourceGroupName $s.RG -Name $s.Name -ErrorAction Stop).State
        if ($state -eq 'Ready') {
            Stop-AzPostgreSqlFlexibleServer -ResourceGroupName $s.RG -Name $s.Name -ErrorAction Stop | Out-Null
            Write-Host "[OK   ] $($s.Name): Ready -> Stopped (otros 7 días)" -ForegroundColor Green
        } elseif ($state -eq 'Stopping') {
            Write-Host "[WAIT ] $($s.Name): aún parándose..." -ForegroundColor Yellow
        } else {
            Write-Host "[SKIP ] $($s.Name): ya está $state" -ForegroundColor DarkGray
        }
    } catch {
        Write-Host "[FAIL ] $($s.Name): $($_.Exception.Message.Split([Environment]::NewLine)[0])" -ForegroundColor Yellow
    }
}
