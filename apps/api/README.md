# Hooked API

Express 5 + Mongoose 9, ESM, Node 22.x. Owns money and identity (docs/DESIGN.md §11 Backend);
play itself stays offline on the phone. Phase 0 ships the skeleton and `GET /api/health`;
phase 7 adds auth, the wallet ledger, cloud-save progress, grants, codes, RevenueCat's webhook
and the admin routes.

## Run locally

```bash
cp apps/api/.env.example apps/api/.env      # then set MONGODB_URI (local mongod or Atlas)
npm run dev:api                             # from the root; node --watch on :4000
curl localhost:4000/api/health
npm run test:api                            # node --test; the health tests need no database
```

## Shape

```
src/server.js        boot: dotenv → connectDb → listen; SIGTERM drain for Heroku
src/app.js           createApp(): helmet, cors, compression, json, morgan, /api routes, JSON 404/500
src/config/db.js     connectDb(uri): pool sizing, autoIndex off in production
src/routes/          index.js mounts everything under /api
src/middleware/      error.js (notFound, errorHandler); auth/admin-key middleware in phase 7
src/models/          Mongoose models, one per collection (phase 7)
test/                *.test.js (unit, node --test); *.int.test.js against a throwaway mongod later
```

Express 5 propagates rejected promises from async handlers to `errorHandler` on its own, so
phase 7's routes need no wrapper.

## Heroku (phase 7; nothing exists there yet)

Operated from the Heroku **dashboard**, like canvass-app: config vars, dyno scaling and
one-off scripts via More → Run console. Its own app (a Basic dyno that never sleeps) and its
own Atlas project, nothing shared with canvass-app. The `Procfile` at the repo root runs
`npm start`. Config vars: `MONGODB_URI`, `NODE_ENV=production`, `CLIENT_ORIGIN`,
`NPM_CONFIG_WORKSPACE=apps/api`, and the phase 7 secrets listed in `.env.example`. Never set
`NPM_CONFIG_PRODUCTION` on this app: any value stops the buildpack's prune, and `true` also
skips installing the admin workspace, which breaks the build.

**The admin page ships with the API**, the way canvass-app serves its web client: `apps/admin`
is a Vite app, `heroku-postbuild` builds it, and Express serves `apps/admin/dist`. Because the
repo is an npm workspace, the build is scoped so Heroku never installs the Expo app. What
exists today: the root `heroku-postbuild` script (step 3) and the rehearsal below. Phase 7
adds the rest when it creates `apps/admin`.

1. `NPM_CONFIG_WORKSPACE=apps/api` (config var) makes the buildpack's `npm ci` install only
   this workspace and what it depends on.
2. Phase 7 adds `"@hooked/admin": "*"` under this package's `devDependencies`, so that
   install also links the admin workspace and pulls its build tooling.
3. The buildpack looks for build scripts in the **root** package.json only. The root already
   has `"heroku-postbuild": "npm run heroku-postbuild -w @hooked/api --if-present"`, which is
   what the buildpack detects; with the config var set, npm runs the script of the same name
   in this package instead. Phase 7 adds `"heroku-postbuild": "npm run build -w @hooked/admin"`
   here. Use the workspace **name**; the path form (`-w apps/admin`) fails from inside a
   workspace. Do not add a root script called `build`: it would be a second detection target.
4. The buildpack then runs a bare `npm prune`, which drops devDependencies only because
   `NODE_ENV=production`; `apps/admin/dist` is an ordinary folder and survives. `npm start`
   resolves to `src/server.js` here.

Rehearsed locally in a scratch copy on 2026-09-10 with the playground standing in for the
admin app: npm reported about 426 packages added instead of about 911, the sibling built,
prune removed the tooling, and `npm start` reached `src/server.js`. Read the first real build
log before trusting it. Any script meant for the Run console lives in this package.json; with
the config var set, `npm run <script>` in the console runs it here.
