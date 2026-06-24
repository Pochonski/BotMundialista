# Deployment en Azure - Pasos Pendientes

## Recursos Ya Creados
- Resource Group: `botmundialista-rg`
- App Service Plan: `botmundialista-plan` (Free tier)
- Web App: `botmundialista.azurewebsites.net`

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
