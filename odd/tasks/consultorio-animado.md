# Consultorio animado

Objective: make the game feel like a game: on "Start" the clinic loads and patients walk in; each turn is animated.
Branch: `feat/consultorio-animado` (never commit to `main`). One commit per task, Conventional Commits, no AI attribution.
Runner: `npm run test` (vitest), `npm run build`, `npx playwright test` for e2e. Pause after each task for human validation.

## Specs

- S1. No new dependencies. Use `motion` (`motion/react`), existing `@dicebear` avatars and `use-sound`. Do NOT use three.js/R3F for the clinic (keep it only for the existing city background).
- S2. Intro: when the player starts, the clinic scene "assembles" (floor, desk, beds, waiting room enter with stagger) before the first patient appears.
- S3. Clinic scene: a client component `Consultorio` built with layered SVG/CSS (background, beds, waiting room). Patients are rendered with the existing `PatientAvatar`.
- S4. Patients enter one by one from the door to the waiting room, with staggered delays.
- S5. Active patient moves to the desk using shared layout (`layoutId`) and shows the existing `TarjetaPaciente`.
- S6. Decision feedback: the patient leaves with an animation depending on the decision; sound via `use-sound`; reuse `positivo-stamp.tsx`.
- S7. Idle loops (breathing, blink) are subtle.
- S8. Avatar faces MUST stay neutral: animations must give NO cue about infection (see comment in `patient-avatar.tsx`). No coughing, no mask, no color change tied to infection.
- S9. Respect `useReducedMotion()`: with reduced motion, skip walking and stagger, show the final state.
- S10. Mobile-first and responsive; must not break `/jugar` flow, timer (`cuenta-regresiva.tsx`) or game logic in `src/app/jugar/Turno.tsx` (phases: cargando | jugando | enviando | error).
- S11. Animation is presentation only: do not change scoring, seeds, patient generation or API payloads.

## Tasks

- [x] T1 (S1,S2,S3,S9,S10) Create `src/components/game/consultorio/Consultorio.tsx` static layered scene + intro assemble animation; mount it in `/jugar` during `cargando` and behind `jugando`. Commit: `ec5684f`.
- [ ] T2 (S4,S9) Waiting room: patients enter from the door with stagger.
- [ ] T3 (S5,S10) Active patient to the desk with `layoutId`; show `TarjetaPaciente`.
- [ ] T4 (S6,S8) Exit animations per decision + sounds + stamp.
- [ ] T5 (S7,S9) Idle loops and polish; run `npm run test`, `npm run build`, e2e.

## Log

- L1 (2026-10-18): "siento que nuestro juego no es muy juego que digamos .. que tanto seria hacer animado el juego que cuando le demos star como que cargue el consultorio entre los pacientes" and "porfavor para que trabaje en una rama, para ir validando".
- L2 (2026-10-18): Directiva de sesión: hacer solo T1 y frenar para validación humana. Implementado en commit `ec5684f` (feat(jugar): assemble the clinic scene behind the game). Cobertura: S1 (sin dependencias nuevas; solo `motion/react`), S2 (armado escalonado pared→piso→escritorio→camas→sala-espera→puerta), S3 (estructura en capas del `Consultorio`; los pacientes con `PatientAvatar` quedan para T2), S9 (`useReducedMotion`: estado final sin escalonado), S10 (flujo `/jugar` intacto: 159 tests vitest, build, 3 e2e `jugar-ronda.spec.ts` en verde). Nota: `npm run lint` no existe en alert_roja (scripts: dev/build/start/test/test:e2e/db:migrate).
