# Authentication

The repository now contains the Azure Static Web Apps route policy for two guest roles:

- `ceremony`: can view every route, including Order of the Day, Our Story, and The Castle.
- `evening`: can view the shared authenticated routes, including the reception, travel, food, RSVP, and homepage.

The policy lives in `staticwebapp.config.json`. The site-wide `authenticated` rule is last so the ceremony-only rules are matched first. The login landing page is at `/login/` and currently starts the Azure Entra login flow with `/.auth/login/aad`.

## Azure setup

1. Configure Microsoft Entra ID or Microsoft Entra External ID as the identity provider for the Static Web App. For External ID or another custom OIDC provider, change the provider segment in `public/login/index.html` from `aad` to the provider name configured in Azure.
2. Create the two guest identities in that provider. Use individual accounts rather than sharing one password.
3. Assign the custom Static Web Apps roles `ceremony` and `evening` using the Static Web Apps role-management/invitation tooling. Do not put passwords, tokens, or role decisions in client-side JavaScript.
4. Add the Static Web Apps deployment token as the GitHub secret `AZURE_STATIC_WEB_APPS_API_TOKEN`.

## Security

This is substantially safer than a password check in the page because Azure performs authentication before serving protected routes and the browser receives an authenticated session rather than a hard-coded credential. HTTPS, strong individual passwords, MFA where appropriate, and account removal in the identity provider still matter.

The Canva RSVP embed remains a separate public Canva resource. Protecting `/rsvp/` protects access through this website, but anyone with the direct Canva embed URL could still reach Canva's resource. Do not place sensitive information in that form unless the Canva design itself is also access-controlled.