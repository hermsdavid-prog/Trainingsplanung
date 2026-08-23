# Trainingsplanung

Trainingsplanungs- und Dokumentations-App für einen Sportverein. Trainer legen Trainingspläne (Athletik/Kraft-Cardio oder Sportartspezifisch/Karate) für Gruppen oder einzelne Athleten an; Athleten führen ihr Training live durch, tragen Ergebnisse ein und dokumentieren tägliche Gesundheitswerte.

## Tech-Stack

- **Next.js 16** (App Router, Server Actions) + **React 19** + **TypeScript**
- **Supabase** (Postgres + Auth) als Backend — Zugriffskontrolle läuft über Row Level Security (RLS), nicht über eine eigene Autorisierungsschicht im Code
- **Tailwind CSS 4** mit Design-Tokens als CSS Custom Properties in `src/app/globals.css`

## Setup

```bash
npm install
cp .env.local.example .env.local   # Werte aus dem Supabase-Dashboard eintragen
npm run dev
```

### Umgebungsvariablen (`.env.local`)

| Variable | Zweck |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase-Projekt-URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public/Anon-Key — läuft im Browser, wird durch RLS eingeschränkt |
| `SUPABASE_SERVICE_ROLE_KEY` | Umgeht RLS vollständig. **Nur** in `src/lib/supabase/admin.ts` verwenden (Nutzer anlegen/löschen als Admin) — niemals in Client-Code oder eine andere Datei importieren |

Alle drei stehen im Supabase-Dashboard unter *Project Settings → API*. Das Projekt läuft in der Region Frankfurt (eu-central-1).

## Rollen & Zugriffskontrolle

Es gibt drei Rollen (`profiles.role`): `admin`, `trainer`, `athlete`. Accounts werden ausschließlich vom Admin angelegt (`src/app/admin/users`) — es gibt keine Selbstregistrierung.

Autorisierung ist doppelt abgesichert:

1. **Server Actions** (`src/lib/actions/*.ts`) prüfen Rolle/Eigentümerschaft explizit, bevor sie etwas tun (z. B. `requireTrainerOrAdmin`, `requirePlanEditAccess`).
2. **Row Level Security** in Postgres ist die eigentliche Durchsetzungsebene — jede Tabelle hat RLS-Policies, die unabhängig davon gelten, über welchen Weg eine Anfrage kommt. Migrationen liegen im Supabase-Projekt selbst (nicht als lokale `.sql`-Dateien im Repo); Schema-Änderungen laufen über den Supabase MCP/Dashboard.

Layout-Dateien (`src/app/{admin,trainer,athlete}/layout.tsx`) leiten serverseitig um, falls die Rolle nicht passt — das ist UX, nicht die Sicherheitsgrenze.

## Projektstruktur

```
src/
  app/            Next.js-Routen, nach Rolle gruppiert (admin/, trainer/, athlete/)
  components/     UI-Komponenten, gespiegelt zur Domäne (plans/, calendar/, health/, athletik/ …)
  lib/actions/    Server Actions — der einzige Ort, an dem geschrieben wird
  lib/supabase/   Supabase-Client-Setup (server.ts = anon+RLS, admin.ts = service role)
  lib/auth/       Aktuellen Nutzer/Profil serverseitig ermitteln
```

## Bekannte Lücken

Es gibt aktuell **keine automatisierten Tests** — jede Änderung wird manuell verifiziert (Testkonten anlegen, durchklicken, wieder löschen). Vor einer größeren Refaktorierung von `plans.ts` oder `plan-table-editor.tsx` lohnt es sich, das im Hinterkopf zu behalten.
