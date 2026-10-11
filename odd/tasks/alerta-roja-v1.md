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
- [ ] T2 Phase 2: design tokens, fonts, shadcn/ui base components, layout, lang=es
- [ ] T3 Phase 3: home + /jugar flow (slider, swipe, timer, offline queue)
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

## Next step
T2 (pending: .env.example content, blocked by permissions)
