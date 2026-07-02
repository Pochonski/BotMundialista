# Deployment en Azure - Pasos Pendientes

## Recursos Ya Creados
- Resource Group: `botmundialista-rg` (East US)
- App Service Plan: `botmundialista-plan` (Free tier)
- Web App: `botmundialista.azurewebsites.net` (East US)
- Azure Cosmos DB: `botmundialista-cosmos` (Free tier, Central US, SQL API, Session consistency)
- Azure Cosmos DB Database: `scores365` con 25 contenedores
- Web App Managed Identity con rol `Cosmos DB Built-in Data Contributor` sobre `dbs/scores365`

## Variables de entorno requeridas en App Service Configuration

| Name | Value |
|------|-------|
| `COSMOS_ENDPOINT` | `https://botmundialista-cosmos.documents.azure.com:443/` |
| `COSMOS_DATABASE` | `scores365` |
| `COSMOS_KEY` | (opcional - solo local; en Azure usa Managed Identity) |
| `SCORES365_TIMEZONE` | `America/Costa_Rica` |
| `SCORES365_USER_COUNTRY` | `153` |
| `SCORES365_LANG` | `14` |
| `SCORES365_APP_TYPE` | `5` |
| `SCORES365_POLL_MS` | `25000` |
| `SCORES365_COMPETITION_MUNDIAL` | `5930` |

## Provisionamiento de Cosmos DB (ya hecho)

```powershell
# 1. Instalar módulo
Install-Module -Name Az.CosmosDB -Force -Scope CurrentUser

# 2. Crear cuenta (Free tier)
New-AzCosmosDBAccount -ResourceGroupName 'botmundialista-rg' `
  -Name 'botmundialista-cosmos' -Location 'centralus' -ApiKind 'GlobalDocumentDB' `
  -EnableFreeTier:$true -DefaultConsistencyLevel 'Session' `
  -BackupPolicyType 'Periodic' -BackupIntervalInMinutes 1440 -BackupRetentionIntervalInHours 8

# 3. Crear base de datos (1000 RU/s shared)
New-AzCosmosDBSqlDatabase -ParentObject (Get-AzCosmosDBAccount ...) `
  -Name 'scores365' -Throughput 1000
```

## Pasos para Completar el Deploy

### Opción 1: GitHub Actions (Recomendado)

1. **Descargar Publish Profile**
   - Ir a [portal.azure.com](https://portal.azure.com)
   - App Services → botmundialista
   - Overview → Download publish profile

2. **Agregar Secret en GitHub**
   - Ir a GitHub → Settings → Secrets and variables → Actions
   - New repository secret:
     - Name: `AZURE_PUBLISHPROFILE`
     - Value: (pegar contenido del archivo descargado)

3. **Hacer push a master**
   ```bash
   git push origin master
   ```
   - GitHub Actions deployará automáticamente

---

### Opción 2: Manual via ZIP

1. **Descargar Publish Profile** desde Azure Portal

2. **Usar Kudu o FTP** para subir archivos:
   - FTP: `ftps://waws-prod-blu-131.ftp.azurewebsites.windows.net/site/wwwroot`
   - Credenciales en el publish profile

---

## Configurar Variables de Entorno en Azure

Si no se configuraron correctamente, ir a:
**App Services → botmundialista → Configuration → Application settings**

| Name | Value |
|------|-------|
| RAPIDAPI_KEY | (tu RAPIDAPI key de .env) |
| RAPIDAPI_HOST | free-api-live-football-data.p.rapidapi.com |
| TELEGRAM_BOT_TOKEN | (tu Telegram bot token) |
| GEMINI_API_KEY | (tu Gemini API key) |
| DB_HOST | (tu DB host de Supabase) |
| DB_PORT | 5432 |
| DB_USER | postgres |
| DB_PASSWORD | (tu password de Supabase) |
| DB_NAME | postgres |
| DB_SSL | true |

---

## Scripts de Cosmos DB (365scores → cache local)

Los siguientes scripts usan el endpoint `webws.365scores.com` para popular `scores365`:

| Script | Qué hace | Tiempo típico |
|--------|---------|---------------|
| `npm run cosmos:bootstrap` | Ingesta inicial: 87 partidos, 1300 atletas, 22 ediciones históricas, brackets, standings, etc. | **12-15 min** (primera vez) / **10-30s** (re-run con state cache) |
| `npm run cosmos:refresh` | Refresh periódico (cron 6h): catálogo + standings + trends + news + game trends | corre como daemon |
| `npm run cosmos:poller` | Live poller (cron 25s): solo partidos en vivo, persiste a `game_snapshots` con delta via `lastUpdateId` | corre como daemon |
| `npm run test:365` | Test E2E de la cache: valida ~57 checks (containers, stats, atletas, tips, history) | **~10s** |

### Inicialización recomendada (primera vez)

```bash
# 1. Setear COSMOS_ENDPOINT y COSMOS_KEY en .env (o usar Managed Identity)
# 2. Bootstrap inicial - ingesta completa
npm run cosmos:bootstrap

# 3. Verificar con test
npm run test:365

# 4. Arrancar daemons (en producción con PM2 o systemd)
npm run cosmos:refresh &
npm run cosmos:poller &
```

### State cache

El script `cosmos:bootstrap` mantiene `database/.scores365-state.json` que cachea qué atletas/partidos ya están ingestados. Re-ejecuciones solo procesan lo nuevo → **re-runs típicos de 10-30s en lugar de 12-15min**. Para forzar re-ingesta completa:

```bash
rm database/.scores365-state.json
npm run cosmos:bootstrap
```

---

## Verificar Deploy

```bash
# Ver logs
az webapp log tail --name botmundialista --resource-group botmundialista-rg

# Reiniciar
az webapp restart --name botmundialista --resource-group botmundialista-rg
```

---

## Configurar Telegram Webhook (opcional)

El bot usa polling, no webhook. Si prefieres webhook:
1. Configurar HTTPS en Azure (certificado gratis de Let's Encrypt)
2. Modificar `telegramBot.js` para usar `setWebhook`

---

## Notas
- El SKU **Free** tiene limitaciones: 60 min/día CPU, 1 GB RAM
- Para WhatsApp se necesitaría custom container con Chrome
- El bot de Telegram funciona 24/7 con polling simple
