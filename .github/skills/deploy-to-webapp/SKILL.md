---
name: deploy-to-webapp
description: 'Build and deploy this wedding website to its live Azure Web App (anchen-joe-protected), not the Azure Static Web Apps GitHub Actions workflow. Use when asked to "deploy", "push live", "ship", or "release" changes to the production site (https://www.anchenandjoe.wedding).'
---

# Deploy to the Azure Web App

## Important: there are two deploy paths in this repo — use the Web App one

- There is an **Azure Static Web Apps** GitHub Actions workflow
  (`.github/workflows/azure-static-web-apps-happy-desert-0ddd4e403.yml`) that
  triggers on push to `master`. **This is not how the live site is actually
  deployed.** Pushing to `master` alone does NOT update the production site.
- The real production site is an **Azure Web App (App Service)** named
  `anchen-joe-protected` in resource group `wedding-rg`, served at
  **https://www.anchenandjoe.wedding**. It runs `server.mjs` (a plain Node
  HTTP server with guest-login auth) serving the contents of a `dist/`-like
  folder. Deployment is a manual zip push via `az webapp deploy`.

## When to use

The user asks to deploy, publish, push live, ship, or release a change to the
wedding website (e.g. "change the menu page photo and deploy").

## Procedure

1. **Make the content change** in the source snippet files at the repo root
   (e.g. `menu-snippet.html`, `our-story-snippet.html`, etc.) and/or add new
   images under `websites/AD2903022/images/`, matching existing conventions
   (see `STATIC_ASSETS.md`).

2. **Build the static site.** Do not use `npm run build` if PowerShell's
   execution policy blocks `npm.ps1` — call the build script directly instead:
   ```powershell
   node build.mjs
   ```
   This regenerates `dist/` from the snippets (routes defined in
   `build.mjs`).

3. **Copy the server files into `dist/`.** `server.mjs` serves from `dist/`
   only if `dist/index.html` exists, but `server.mjs` and `package.json`
   themselves must also ship in the deployed package root:
   ```powershell
   Copy-Item server.mjs dist\server.mjs -Force
   Copy-Item package.json dist\package.json -Force
   ```

4. **Zip `dist/` with forward-slash paths — do NOT use `Compress-Archive`.**
   PowerShell's `Compress-Archive` (and the legacy
   `System.IO.Compression.FileSystem` `ZipFile.CreateFromDirectory` helper)
   both store entry paths with backslashes on Windows, e.g.
   `evening-rsvp\index.html`. The Linux-based Kudu/App Service rsync step
   then fails with:
   ```
   rsync: [generator] recv_generator: failed to stat
   "/home/site/wwwroot/evening-rsvp\index.html": Invalid argument (22)
   ```
   and the whole deployment fails. Use the bundled
   [create-deploy-zip.ps1](./scripts/create-deploy-zip.ps1) script instead,
   which manually builds zip entries with `/` separators:
   ```powershell
   cd C:\Users\joe_c\wedding-website
   .\.github\skills\deploy-to-webapp\scripts\create-deploy-zip.ps1
   ```
   This removes any existing `deploy.zip` and creates a fresh one from the
   current `dist/` contents.

5. **Deploy the zip to the Web App:**
   ```powershell
   az webapp deploy --resource-group wedding-rg --name anchen-joe-protected --src-path deploy.zip --type zip
   ```
   Azure CLI should already be logged in (check with `az account show`). Wait
   for `"Deployment has completed successfully"` and a final status block
   with `"status": "RuntimeSuccessful"`.

6. **If the deployment fails**, fetch the Kudu deployment log for detail
   (the `az webapp deploy` error only gives a generic 400):
   ```powershell
   az webapp deployment list-publishing-credentials --resource-group wedding-rg --name anchen-joe-protected -o json
   ```
   Then call `https://anchen-joe-protected.scm.azurewebsites.net/api/deployments/latest/log`
   with Basic auth using those credentials to see the real rsync/build error.

7. **Verify.** The site (including static assets under `/websites/...`) sits
   behind guest-login auth, so a plain unauthenticated `curl`/
   `Invoke-WebRequest` will just return the login gate page (HTTP 200 with
   `<title>Guest access | Anchen &amp; Joe</title>`) for every path — this is
   NOT a failure signal. Rely on the `az webapp deploy` success status and on
   confirming the right file/HTML content was present in `dist/` and the zip
   before deploying, rather than trying to curl-verify the live page content.

8. **Commit the result.** `deploy.zip` is tracked in git as a record of what
   was last deployed. Stage and commit only the files relevant to the change
   (the snippet, any new images, and `deploy.zip`) — this repo often has
   unrelated pre-existing uncommitted changes from other in-progress work;
   leave those alone and commit only your own changes.
