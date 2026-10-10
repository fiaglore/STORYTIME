# What Is It About Lagos?

A web-based, BitLife-style procedural life sim set in Lagos: age up year by
year through a pool of random Lagos-flavored events (school, hustle,
family, the city), manage a real-Naira economy (jobs, shop, skills,
chores), and optionally marry, chat, and send money to other real players
signed in at the same time.

## Running locally

```bash
npm install
npm run dev
```

Starts Vite on http://localhost:5173.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Type-check and build the production bundle to `dist/` |
| `npm run preview` | Serve the built `dist/` locally, at the same `/STORYTIME/` base path GitHub Pages uses |
| `npm test` | Run the Vitest suite — pure-function tests for the Lagos Life engine |
| `npm run lint` | Oxlint |

There's also a manual Playwright smoke test, `scripts/smoke-lifesim.mjs`,
that plays a golden path in a real browser against a running preview
server — see the comment at the top of the file for how to run it.

## Cloud save (optional)

Progress can sync to Firebase (email/password sign-in + Firestore)
instead of staying purely local. It's entirely opt-in — with no config,
nothing changes from local-only saves. See the "Firebase / cloud save"
section in `CLAUDE.md` for the full setup (env vars, `firestore.rules`,
where cloud sync is wired in).

## Deployment

`.github/workflows/deploy.yml` builds, tests and publishes `dist/` to
GitHub Pages on every push to `main`. If you've set up Firebase, put the
config in a committed `.env.production` (not `.env` — that's gitignored
and local-only) so the deployed build picks it up too.
