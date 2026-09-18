# Custom guest authentication

The local protected server is `server.mjs`. It serves the generated `dist/` pages only after a valid guest username/password login creates a signed, HttpOnly session cookie.

## Local preview

Set temporary local values in PowerShell, then run:

```powershell
$env:PORT = "4174"
$env:SESSION_SECRET = "use-a-long-random-local-secret"
$env:CEREMONY_USERNAME = "ceremony-guest"
$env:CEREMONY_PASSWORD = "use-a-local-ceremony-password"
$env:RECEPTION_USERNAME = "reception-guest"
$env:RECEPTION_PASSWORD = "use-a-local-reception-password"
npm.cmd run build
npm.cmd start
```

Open `http://127.0.0.1:4174/`.

The local server uses non-Secure cookies on HTTP only when `NODE_ENV` is not `production`. App Service must run behind HTTPS with `NODE_ENV=production`, which enables the Secure cookie flag.

## Roles

- Day Guests can access all generated pages.
- Evening Guests cannot access Order of the Day, the ceremony Q&A, Food, or the ceremony RSVP. They use the evening Q&A and evening RSVP routes instead.

Credentials are read from environment variables and are never stored in source control:

```text
CEREMONY_USERNAME
CEREMONY_PASSWORD
RECEPTION_USERNAME
RECEPTION_PASSWORD
SESSION_SECRET
SESSION_TTL_SECONDS
```

For production, store these as App Service environment variables. Use long random codes and rotate them when needed.

## Deployment boundary

This server is the protected hosting boundary. Do not publish `dist/` as a public Static Web Apps site and assume the cookie protects it; Static Web Apps route rules do not enforce this custom session. Move the deployment to an Azure App Service Node application before using these access codes with real guests. The existing Static Web Apps/Entra configuration remains available for rollback until the App Service deployment is ready.
