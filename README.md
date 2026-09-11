# Hooked

Store name **Yarn Over**; "Hooked" is the codename used for the repo, the EAS slug and the bundle id.

A cozy match-3 where every level is a crochet project and everything you make decorates
your room. Modeled on Fishdom, themed around crochet, built to ship. The design is in
[docs/DESIGN.md](docs/DESIGN.md); the working rules in [CLAUDE.md](CLAUDE.md).

## Layout

```
hooked/                      npm workspaces, one lockfile, Node 22.x
  apps/
    mobile/                  Expo SDK 57 app (plain JS, React Navigation, EAS Build + Update)
    playground/              Vite web harness that imports @hooked/engine (phases 1–3)
    api/                     Express 5 + Mongoose 9 API, Heroku (routes land in phase 7)
    admin/                   small React page over the admin routes (phase 7, not created)
  packages/
    engine/                  @hooked/engine — pure JS match-3 engine + Jest
    levels/                  @hooked/levels — level JSON (loader + validation land in phase 4)
  docs/                      DESIGN.md (the spec), PROMPTS.md, QUESTIONS.md, LEVELS-BOOK1.md, design/BRIEF.md, reference/
  Procfile                   web: npm start  → apps/api
```

## Quick start

```bash
nvm install 22 && nvm use    # once; the repo pins Node 22 (.nvmrc, and a Volta pin for Volta users)
npm install                  # once, at the root; installs and links every workspace
npm test                     # engine + levels + api
npm run mobile               # Metro; scan the QR with Expo Go on the phone
npm run play -- packages/engine/fixtures/coaster-5x5.json --seed 1   # the engine plays a level in the terminal
npm run dev:playground       # http://localhost:5174
cp apps/api/.env.example apps/api/.env && npm run dev:api   # needs a local mongod or Atlas
```

## Where things stand

Phase 0 (monorepo setup) is committed. The EAS project exists (`@omar4589/hooked`), the
identifiers are final (`com.omarzumaya.hooked`), and the owner's decisions from 2026-09-10 are
in DESIGN.md and docs/QUESTIONS.md. Phase 0 (monorepo) is done: hello world ran on a phone through Expo Go on 2026-09-10. Phase 1
(the engine) is built: `packages/engine` generates boards, detects matches, applies gravity and
cascades, scores, and plays a level in the terminal with `npm run play`. Not yet done: phase 2
(the board on the phone), the Heroku app and Atlas cluster (phase 7). Phases 1–9 and their "done when" are in
DESIGN.md §11; phase 0's is the setup prompt in docs/PROMPTS.md.
