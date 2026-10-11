# alerta-roja-v1

## Objective
Evolve the existing MVP (Next.js + stats.ts + db.ts + Docker) into the full "Alerta Roja" Bayes game: mobile game flow, reveal animation, scoring/badges, live projector panel, sound/confetti, tests and README.

## Constraints
- Keep `src/lib/stats.ts` and its tests (extend them); keep the `src/lib/db.ts` adapter (neon.tech -> Neon driver, otherwise pg). No ORM, parameterized queries.
- Replace `db/schema.sql` with `db/migrations/001_init.sql` (partidas + respuestas) and `npm run db:migrate`.
- Dev DB: user's local Postgres. Prod: Neon, separate database `alerta_roja`.
- Statistics unchanged: 1000 people, prevalence 10%, sens 90%, spec 80%, PPV = 1/3. Expert mode prevalence 1% (PPV ~4.3%).
- UI copy: Spanish (project language). Code/comments/docs: follow the existing project style (Spanish identifiers already in stats.ts).
- Full spec: scratchpad `spec.md` (original product brief).

## Tasks (one work-unit commit each)
- [x] T1 Phase 1: refactor base, migrations, db:migrate, env/.env.example, zod, rate limit, API (partidas, stats, ranking, export), stats.ts server-side scoring
- [x] T2 Phase 2: design tokens, fonts, shadcn/ui base components, layout, lang=es
- [x] T3 Phase 3: home + /jugar flow (slider, swipe, timer, offline queue)
- [ ] T4 Phase 4: /resultado reveal, score, badges, formula, expert mode
- [ ] T5 Phase 5: /panel (QR, ranking, histogram, cards, filter, CSV)
- [ ] T6 Phase 6: sound, confetti, polish, CREDITS.md
- [ ] T7 Phase 7: vitest extension, Playwright mobile test, README

## Acceptance
`npm run build` and `npm test` pass; Playwright mobile round passes.

## Progress / evidence
- Baseline: npm install OK, npm test 5/5 passing (vitest 2.1.9).
- Route: each task delegated to one writer (2+ non-trivial files per task).
- T1 (writer): RED observed (12 failing tests before impl), then GREEN. npm test: 4 files / 28 tests pass; npx tsc --noEmit: clean; npm run build: OK (routes /api/export, partidas, ranking, stats dynamic). db:migrate untested (no local DB / .env.local); SQL reviewed, statement splitting checked offline. Atomic insert = single CTE (insert partidas + insert respuestas via unnest). Brief's "0.009/0.206" is an arithmetic slip: 0.009 + 0.2*0.99 = 0.207 -> PPV 0.043478 (tested). `.env.example` edit was denied by permission settings; proposed content pending parent.
- T2 (writer): deps installed (tailwind 4.3.3, motion 14, lucide 1.55, recharts 3.10, three/r3f 9/drei 10, playwright 1.63.0 [1.64.0 core missing in registry], dicebear 9.4.x, etc.; all pinned exact because npm save-exact is on). Only peer warning: @dicebear/collection 9.4.2 wants core ^9 (resolved to 9.4.3, benign). Avatar style: Thumbs, CC0 1.0 (read from node_modules/@dicebear/thumbs/LICENSE). Contrast (computed): fg/bg 17.3, muted/bg 8.3, muted/surface-2 6.6, white/primary 4.8, white/primary-hover 6.5, primary-text/surface 6.9, success-fg/success 7.5, warning-fg/warning 8.5, border-strong/surface 4.7, ring/surface 8.0. Dockerfile and .dockerignore removed; next.config standalone output removed. npm test: 5 files / 34 tests pass; tsc clean; npm run build OK. Not visually tested in a browser.
- T3 (writer, uncommitted): RED observed (3 new test files failed to load, then validarApodo test failed), then GREEN. npm test: 9 files / 65 tests pass; npx tsc --noEmit clean; npm run build OK (/, /jugar dynamic, /resultado placeholder). Dev server on :3112: /, /jugar, /jugar?modo=experto, /resultado all 200; server stopped, port free. No browser run (swipe, timer, focus untested visually). No DB rows inserted. Timeout policy: estimate sent as-is, patient LIBERADO, amber notice 1.5 s. Swipe starts only from the card header (avatar/name) to not clash with the slider. kit-demo.tsx deleted.

## Next step
T4 (pending: .env.example content, blocked by permissions; idempotency key for POST /api/partidas to avoid duplicate saves on lost response — do in T6/T7). Pi (parallel, isolated files) does T6 once T2 is committed.
