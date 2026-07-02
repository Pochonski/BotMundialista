$ErrorActionPreference = 'Continue'

Import-Module Az.Accounts, Az.Resources, Az.Websites -ErrorAction SilentlyContinue

$results = New-Object System.Collections.ArrayList

function Add-Result {
    param($Name, $Action, $Status, $Detail = '')
    $script:results += [PSCustomObject]@{ Recurso = $Name; Accion = $Action; Estado = $Status; Detalle = $Detail }
    $color = switch ($Status) {
        'OK'   { 'Green' }
        'SKIP' { 'DarkGray' }
        'INFO' { 'Cyan' }
        default { 'Yellow' }
    }
    Write-Host ("[{0,-4}] {1,-58} :: {2}" -f $Status, $Name, $Detail) -ForegroundColor $color
}

function Pause-WebApp {
    param($Name, $RG)
    try {
        $state = (Get-AzWebApp -ResourceGroupName $RG -Name $Name).State
        if ($state -eq 'Stopped') {
            Add-Result $Name 'Stop-AzWebApp' 'SKIP' "ya estaba Stopped"
            return
        }
        Stop-AzWebApp -ResourceGroupName $RG -Name $Name -ErrorAction Stop | Out-Null
        Add-Result $Name 'Stop-AzWebApp' 'OK' "RG=$RG"
    } catch {
        Add-Result $Name 'Stop-AzWebApp' 'FAIL' $_.Exception.Message.Split([Environment]::NewLine)[0]
    }
}

function Suspend-AppServicePlan {
    param($Name, $RG)
    try {
        $apps = @(Get-AzWebApp | Where-Object { $_.ServerFarmId -like "*/$RG/*" -and $_.Name -ne 'botmundialista' })
        Add-Result $Name 'CheckApps' 'INFO' "Apps activas: $($apps.Count)"
        if ($apps.Count -gt 0) {
            Add-Result $Name 'Suspend-Plan' 'SKIP' "Apps aún activas; stop individual primero"
            return
        }
        $plan = Get-AzAppServicePlan -ResourceGroupName $RG -Name $Name -ErrorAction Stop
        Add-Result $Name 'Suspend-Plan' 'INFO' "SKU=$($plan.Sku.Tier) Workers=$($plan.NumberOfWorkers)"
    } catch {
        Add-Result $Name 'Suspend-Plan' 'FAIL' $_.Exception.Message.Split([Environment]::NewLine)[0]
    }
}

function Pause-Postgres {
    param($Name, $RG)
    $uri = "https://management.azure.com/subscriptions/$((Get-AzContext).Subscription.Id)/resourceGroups/$RG/providers/Microsoft.DBforPostgreSQL/flexibleServers/$Name/stop?api-version=2023-12-01-preview"
    try {
        $token = (Get-AzAccessToken -ErrorAction Stop).Token
        $headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
        $resp = Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ErrorAction Stop
        Add-Result $Name 'PostgreSQL/Stop' 'OK' "Acción programada (max 7 días)"
    } catch {
        $msg = $_.Exception.Message
        if ($msg -match 'Accepted') {
            Add-Result $Name 'PostgreSQL/Stop' 'OK' "Stop aceptado async"
        } else {
            Add-Result $Name 'PostgreSQL/Stop' 'FAIL' $msg.Split([Environment]::NewLine)[0]
        }
    }
}

function Pause-SqlDatabase {
    param($DbName, $ServerName, $RG)
    $uri = "https://management.azure.com/subscriptions/$((Get-AzContext).Subscription.Id)/resourceGroups/$RG/providers/Microsoft.Sql/servers/$ServerName/databases/$DbName/pause?api-version=2023-08-01-preview"
    try {
        $token = (Get-AzAccessToken -ErrorAction Stop).Token
        $headers = @{ Authorization = "Bearer $token"; 'Content-Type' = 'application/json' }
        Invoke-RestMethod -Method Post -Uri $uri -Headers $headers -ErrorAction Stop | Out-Null
        Add-Result "$ServerName/$DbName" 'SQL/Pause' 'OK' "Serverless tier pausado"
    } catch {
        Add-Result "$ServerName/$DbName" 'SQL/Pause' 'FAIL' $_.Exception.Message.Split([Environment]::NewLine)[0]
    }
}

Write-Host "`n=== STEP 1: STOP Web Apps / Function Apps (excepto botmundialista) ===" -ForegroundColor Cyan
$apps = Get-AzWebApp | Where-Object { $_.Name -ne 'botmundialista' }
foreach ($a in $apps) { Pause-WebApp -Name $a.Name -RG $a.ResourceGroup }

Write-Host "`n=== STEP 2: Verificar App Service Plans no-proyecto ===" -ForegroundColor Cyan
$plans = Get-AzAppServicePlan | Where-Object { $_.ResourceGroup -ne 'botmundialista-rg' }
foreach ($p in $plans) { Suspend-AppServicePlan -Name $p.Name -RG $p.ResourceGroup }

Write-Host "`n=== STEP 3: STOP PostgreSQL Flexible Servers (no-proyecto) ===" -ForegroundColor Cyan
$pgServers = @(
    @{ Name = 'pgprop-53383'; RG = 'rg-plataforma-arrendamientos' },
    @{ Name = 'pgprop-prop-74777'; RG = 'JosephResourceGroup' },
    @{ Name = 'ms-propiedades-53383'; RG = 'JosephResourceGroup' }
)
foreach ($s in $pgServers) { Pause-Postgres -Name $s.Name -RG $s.RG }

Write-Host "`n=== STEP 4: PAUSE SQL Databases serverless (no-proyecto) ===" -ForegroundColor Cyan
$sqlDbs = @(
    @{ Db = 'arrendamientos_db'; Server = 'arrendamientoscr'; RG = 'JosephResourceGroup' },
    @{ Db = 'usuarios_db';       Server = 'arrendamientoscr'; RG = 'JosephResourceGroup' },
    @{ Db = 'usuarios_db_boot';  Server = 'arrendamientoscr'; RG = 'JosephResourceGroup' }
)
foreach ($d in $sqlDbs) { Pause-SqlDatabase -DbName $d.Db -ServerName $d.Server -RG $d.RG }

Write-Host "`n=== STEP 5: Recursos NO pausable (informativo) ===" -ForegroundColor Cyan
Add-Result 'JosephApi'                      'INFO' 'SKIP' 'Consumption tier - serverless, $0 por existencia'
Add-Result 'plataforma-arrendamientos-api'  'INFO' 'SKIP' 'Consumption tier - serverless, $0 por existencia'
Add-Result 'mongoclusterjoseph'             'INFO' 'SKIP' 'Free tier - $0 (compute Free)'
Add-Result 'arrendamientos-sb1'             'INFO' 'SKIP' 'ServiceBus Standard existe; bajo costo ~$0.01/hr'
Add-Result 'acrpropiedades53383'            'INFO' 'SKIP' 'ACR Basic existe; bajo costo ~$0.067/dia'
Add-Result 'storageeventdrivenpocho'        'INFO' 'SKIP' 'Storage Standard; bajo costo ~$0.018/GB-mes'
Add-Result 'josephresourcegroupa451'        'INFO' 'SKIP' 'Storage Standard; bajo costo ~$0.018/GB-mes'
Add-Result 'OderCommunication'              'INFO' 'SKIP' 'Communication Services existe; bajo costo'
Add-Result 'acs-ms-usuarios'                'INFO' 'SKIP' 'Communication Services existe; bajo costo'
Add-Result 'OrderEmail'                     'INFO' 'SKIP' 'Email Services existe; bajo costo'
Add-Result 'kv-ms-usuarios'                 'INFO' 'SKIP' 'Key Vault existe; ~$0.03/10k ops'
Add-Result 'log-ms-usuarios'                'INFO' 'SKIP' 'Log Analytics existe; bajo costo'
Add-Result 'oidc-msi-a6b7 / arrendamientos-m-id-9603' 'INFO' 'SKIP' 'Managed Identity, gratuito'
Add-Result 'simple-react-app-v2'            'INFO' 'SKIP' 'Static Web App, Free tier'
Add-Result 'PlataformaAriendamientosCR'     'INFO' 'SKIP' 'Static Web App, Free tier'
Add-Result 'arrendamientoscr/master'        'INFO' 'SKIP' 'SQL master DB, no pausable'

Write-Host "`n=== RESUMEN ===" -ForegroundColor Magenta
$ok = ($results | Where-Object Estado -eq 'OK').Count
$fail = ($results | Where-Object Estado -eq 'FAIL').Count
$skip = ($results | Where-Object Estado -eq 'SKIP').Count
$info = ($results | Where-Object Estado -eq 'INFO').Count
Write-Host ("OK=$ok  FAIL=$fail  SKIP=$skip  INFO=$info  Total=$($results.Count)") -ForegroundColor Yellow
$results | Format-Table -AutoSize
