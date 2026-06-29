# SynfraCore Radiology — AI Voice Reporting

Voice-to-report assistant for radiologists. One admin account per hospital;
the admin creates username/password logins for each radiologist. All data
is stored in a real database (Cloudflare D1), not the browser.

## Stack
- React + Vite (frontend)
- Cloudflare Pages Functions (`/functions/api/...`) — serverless backend
- Cloudflare D1 (SQL database) — hospitals, users, sessions, reports
- Auth: PBKDF2 password hashing + httpOnly session cookie (no external libraries)
- Voice-to-text: browser's native Speech Recognition (Web Speech API) — free,
  works in Chrome/Edge, language selectable from dropdown
- Report formatting: simple template for now (swap later for a real AI model)
- PDF: browser print for now

## One-time setup: create the D1 database

You need the Cloudflare CLI (`wrangler`) for this part — Pages dashboard
alone can't create a D1 database.

```
npm install -g wrangler
wrangler login

# Create the database
wrangler d1 create synfracore-db
```

This prints a `database_id`. Copy it into `wrangler.toml`, replacing
`REPLACE_WITH_YOUR_D1_DATABASE_ID`.

Then load the schema:
```
wrangler d1 execute synfracore-db --remote --file=./schema.sql
```

## Connect D1 to your Pages project (one-time, in the dashboard)
1. Cloudflare dashboard → Workers & Pages → your Pages project → **Settings → Functions**
2. Under **D1 database bindings**, add a binding:
   - Variable name: `DB`
   - D1 database: `synfracore-db`
3. Save. Redeploy (or it applies on the next deploy).

## Local development
```
npm install
npm run dev
```
Note: Functions/D1 only run when deployed via Cloudflare Pages, or locally
via `wrangler pages dev` (a separate command — ask if you want this set up).

## Deploy to Cloudflare Pages (via GitHub)
1. Push this repo to GitHub.
2. Cloudflare dashboard → Workers & Pages → Create → Pages → Connect to Git.
3. Pick this repo.
4. Build settings:
   - Build command: `npm run build`
   - Output directory: `dist`
5. Deploy, then add the D1 binding as described above, then redeploy once more.

## How accounts work
- First visit → **Login page → "New Hospital" tab** → creates the hospital
  and its one admin account.
- Admin logs in → **Manage Radiologists** page → creates a username/password
  for each radiologist, shares it with them directly (shown once on screen).
- Radiologists log in with those credentials and only see their own
  hospital's reports.

## Not included yet (future phases)
- Real AI language model for impression generation (currently a template)
- PDF generation engine (currently browser print)
- Password reset flow
- Multi-hospital admin oversight / billing

## Important
AI creates draft reports only. Final medical approval always remains with
the radiologist — shown in the UI and should stay true in any future version.
