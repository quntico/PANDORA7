# PANDORA M1 — STEP 2 REPORT
**Fase:** Autenticación Google Drive OAuth 2.0  
**Fecha:** 2026-09-16 13:59 CST

---

## ESTADO DE CREDENCIALES

| Campo | Estado |
|-------|--------|
| GOOGLE_CLIENT_ID_CONFIGURED | NO (pendiente usuario) |
| GOOGLE_CLIENT_SECRET_CONFIGURED | NO (pendiente usuario) |
| GOOGLE_REDIRECT_URI_CONFIGURED | DEFAULT AUTO |
| Redirect URI por defecto | `http://localhost:3010/api/m1/drive/oauth/callback` |

---

## ENDPOINTS FUNCIONALES (VERIFICADOS)

| Endpoint | Respuesta | MS |
|----------|-----------|-----|
| `GET /api/m1/drive/config` | `{configured:false}` | < 50ms |
| `GET /api/m1/drive/status` | `{connected:false}` | < 50ms |
| `POST /api/m1/drive/config` | Pendiente credenciales | — |
| `GET /api/m1/drive/oauth/callback` | Registrado y activo | — |
| `GET /api/m1/drive/callback` | Alias activo | — |

---

## PRUEBAS DE FLUJO

| Prueba | Resultado |
|--------|-----------|
| CONFIG SAVE | PENDIENTE (usuario debe pegar Client ID/Secret) |
| OAUTH FLOW | PENDIENTE (pendiente credenciales) |
| ACCOUNT | N/A |
| ROOT ACCESS | N/A |

---

## INFRAESTRUCTURA COMPLETADA

- ✅ Formulario de credenciales OAuth implementado en `M1DriveView.jsx` (Client ID, Client Secret, Redirect URI)
- ✅ Client Secret enmascarado por defecto (botón MOSTRAR/OCULTAR)
- ✅ Credenciales guardadas en `%APPDATA%\PANDORA\google-drive\oauth_config.json` (fuera del proyecto)
- ✅ Token guardado en `%APPDATA%\PANDORA\google-drive\token.json` (fuera del proyecto)
- ✅ NEXUS **no sincroniza** `oauth_config.json` ni `token.json`
- ✅ `START_PANDORA_M1.cmd` detecta cambios en `server.js` y reinicia backend automáticamente
- ✅ Auto-refresh de token via `oAuth2Client.on('tokens', ...)`
- ✅ Scope de sólo lectura: `drive.readonly`
- ✅ Callback registrado en ruta `/api/m1/drive/oauth/callback`

---

## INSTRUCCIÓN PARA CONTINUAR

Para completar la autenticación:

1. Abrir PANDORA → pestaña **Drive**
2. Pegar `GOOGLE_CLIENT_ID` (debe terminar en `.apps.googleusercontent.com`)
3. Pegar `GOOGLE_CLIENT_SECRET`
4. `REDIRECT URI` ya está pre-llenado: `http://localhost:3010/api/m1/drive/oauth/callback`
5. Hacer clic en **GUARDAR CREDENCIALES**
6. Hacer clic en **CONECTAR GOOGLE DRIVE** → autorizar en navegador
7. Después del callback PANDORA mostrará: cuenta, estado y acceso root

**NO SE HA AVANZADO AL PASO 3.**
