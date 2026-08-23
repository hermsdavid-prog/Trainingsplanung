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

## Tests

```bash
npm test              # einmalig, alle Tests
npm run test:watch    # Watch-Modus während der Entwicklung
npm run test:coverage # mit Coverage-Report
```

Zwei Arten von Tests, in `tests/`:

- **`tests/unit/`** — reine Funktionen ohne Datenbank (`date.ts`, `berlin-holidays.ts`, `health-status.ts`). Laufen überall sofort, brauchen kein `.env.local`.
- **`tests/integration/`** — laufen gegen das **echte** Supabase-Projekt aus `.env.local` (es gibt keine separate Testdatenbank, siehe "Bekannte Lücken"). Sie legen eigene Wegwerf-Testkonten per Service-Role-Key an (`tests/helpers/supabase.ts`) und räumen sich in `afterAll` wieder vollständig auf. Decken bisher vor allem RLS-Grenzen ab (z. B. „kann Athlet B den Plan von Athlet A sehen?") und die `replace_training_plan_items`-DB-Funktion.

Neue Server-Action-Tests lassen sich aktuell nicht direkt gegen die Action-Funktion schreiben — sie rufen intern `cookies()` aus `next/headers` auf, was außerhalb eines echten Next.js-Requests einen Fehler wirft. Stattdessen wie in `tests/integration/` direkt gegen die Tabellen/RPCs testen (mit einem eingeloggten Test-User-Client), das prüft ohnehin die eigentliche Sicherheitsgrenze (RLS), nicht nur die Action-Hülle drumherum.

## Bekannte Lücken

Testabdeckung ist noch dünn — die Basis-Testsuite deckt bislang gezielt die RLS-Grenzen und den Plan-Speicherpfad ab, nicht die App als Ganzes. Vor einer größeren Refaktorierung von `plans.ts` oder `plan-table-editor.tsx` lohnt es sich trotzdem, weiter mit Testkonten manuell durchzuklicken.
