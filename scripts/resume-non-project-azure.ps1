# Resume-BotMundialistaNeighbours.ps1
# Reanuda los recursos que se pausaron con pause-non-project.ps1
# NO toca botmundialista-rg
#
# Uso: .\Resume-Neighbours.ps1

$ErrorActionPreference = 'Continue'
Import-Module Az.Accounts, Az.Resources, Az.Websites, Az.Sql, Az.PostgreSqlFlexibleServer -ErrorAction SilentlyContinue

$results = New-Object System.Collections.ArrayList
function Add-Result { param($N,$A,$S,$D='') $script:results += [PSCustomObject]@{Recurso=$N;Accion=$A;Estado=$S;Detalle=$D}; $c=switch($S){'OK'{'Green'}default{'Yellow'}}; Write-Host ("[{0,-4}] {1,-55} :: {2}" -f $S,$N,$D) -ForegroundColor $c }

Write-Host "`n=== Resume App Service Plans B1 → Free ===" -ForegroundColor Cyan
foreach ($p in @(@{N='asp-propiedades';R='rg-plataforma-arrendamientos';T='B1'},@{N='ASP-ms-usuarios-boot-centralus';R='JosephResourceGroup';T='B1'})) {
    try {
        Set-AzAppServicePlan -ResourceGroupName $p.R -Name $p.N -Tier $p.T -WorkerSize Small -NumberofWorkers 1 -ErrorAction Stop | Out-Null
        Add-Result $p.N "Resume-Plan→$($p.T)" 'OK' ''
    } catch { Add-Result $p.N "Resume-Plan→$($p.T)" 'FAIL' $_.Exception.Message.Split([Environment]::NewLine)[0] }
}

Write-Host "`n=== Start Web Apps / Function Apps ===" -ForegroundColor Cyan
$apps = Get-AzWebApp | Where-Object { $_.Name -ne 'botmundialista' -and $_.State -eq 'Stopped' }
foreach ($a in $apps) {
    try { Start-AzWebApp -ResourceGroupName $a.ResourceGroup -Name $a.Name -ErrorAction Stop | Out-Null; Add-Result $a.Name 'Start-AzWebApp' 'OK' $a.ResourceGroup }
    catch { Add-Result $a.Name 'Start-AzWebApp' 'FAIL' $_.Exception.Message.Split([Environment]::NewLine)[0] }
}

Write-Host "`n=== Resume SQL Databases ===" -ForegroundColor Cyan
foreach ($d in 'arrendamientos_db','usuarios_db','usuarios_db_boot') {
    try { Resume-AzSqlDatabase -ResourceGroupName "JosephResourceGroup" -ServerName "arrendamientoscr" -DatabaseName $d -ErrorAction Stop | Out-Null; Add-Result "arrendamientoscr/$d" 'Resume-SQL' 'OK' '' }
    catch { Add-Result "arrendamientoscr/$d" 'Resume-SQL' 'FAIL' $_.Exception.Message.Split([Environment]::NewLine)[0] }
}

Write-Host "`n=== Start PostgreSQL Flexible Servers ===" -ForegroundColor Cyan
foreach ($s in @(@{N='pgprop-53383';R='rg-plataforma-arrendamientos'},@{N='pgprop-prop-74777';R='JosephResourceGroup'},@{N='ms-propiedades-53383';R='JosephResourceGroup'})) {
    try { Start-AzPostgreSqlFlexibleServer -ResourceGroupName $s.R -Name $s.N -ErrorAction Stop | Out-Null; Add-Result $s.N 'Start-Postgres' 'OK' '' }
    catch { Add-Result $s.N 'Start-Postgres' 'FAIL' $_.Exception.Message.Split([Environment]::NewLine)[0] }
}

Write-Host "`n=== RESUMEN ===" -ForegroundColor Magenta
$ok = ($results | Where-Object Estado -eq 'OK').Count
$f = ($results | Where-Object Estado -eq 'FAIL').Count
Write-Host "OK=$ok  FAIL=$f  Total=$($results.Count)" -ForegroundColor Yellow
$results | Format-Table -AutoSize
