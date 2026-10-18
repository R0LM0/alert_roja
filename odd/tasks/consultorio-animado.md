# Consultorio animado

> SUPERSEDED by `odd/tasks/consultorio-3d.md` (2D approach rejected).

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
- S12. The clinic must be clearly visible: colorful, high-contrast palette defined as CSS variables in `globals.css` (do not reuse the dark surface/border tokens). Illustrated SVG look (ink outlines, flat fills, soft floor shadow), inspired by hand-inked isometric figures.
- S13. The assemble animation lasts about 2 s and is clearly visible; the first patient card appears only after it ends (skipped with reduced motion).
- S14. During the round the scene is NOT heavily dimmed: at most a light overlay behind the card, scene still readable.
- S15. Validate visually with Playwright screenshots (mobile 390px and desktop 1280px) at ~300ms, ~1200ms and during the first patient turn; attach the paths in the report.

## Tasks

- [x] T1 v2 (S12-S15, redo): previous version at `ec5684f` was nearly invisible (gray on dark, dimmed). Reworked `Consultorio.tsx`. Commit: `57b3f2a`.
- [x] T1 v1 (S1,S2,S3,S9,S10) Create `src/components/game/consultorio/Consultorio.tsx` static layered scene + intro assemble animation; mount it in `/jugar` during `cargando` and behind `jugando`. Commit: `ec5684f`.
- [ ] T2 (S4,S9) Waiting room: patients enter from the door with stagger.
- [ ] T3 (S5,S10) Active patient to the desk with `layoutId`; show `TarjetaPaciente`.
- [ ] T4 (S6,S8) Exit animations per decision + sounds + stamp.
- [ ] T5 (S7,S9) Idle loops and polish; run `npm run test`, `npm run build`, e2e.

## Log

- L1 (2026-10-18): "siento que nuestro juego no es muy juego que digamos .. que tanto seria hacer animado el juego que cuando le demos star como que cargue el consultorio entre los pacientes" and "porfavor para que trabaje en una rama, para ir validando".
- L2 (2026-10-18): Directiva de sesión: hacer solo T1 y frenar para validación humana. Implementado en commit `ec5684f` (feat(jugar): assemble the clinic scene behind the game). Cobertura: S1 (sin dependencias nuevas; solo `motion/react`), S2 (armado escalonado pared→piso→escritorio→camas→sala-espera→puerta), S3 (estructura en capas del `Consultorio`; los pacientes con `PatientAvatar` quedan para T2), S9 (`useReducedMotion`: estado final sin escalonado), S10 (flujo `/jugar` intacto: 159 tests vitest, build, 3 e2e `jugar-ronda.spec.ts` en verde). Nota: `npm run lint` no existe en alert_roja (scripts: dev/build/start/test/test:e2e/db:migrate).
- L3 (2026-10-18): User validated T1 v1 in the browser: "casi lo mismo nada hizo la idea". Playwright confirmed the scene is almost invisible. Reopened T1 as v2 with S12-S15.
- L4 (2026-10-18): T1 v2 implementada en commit `57b3f2a` (feat(jugar): rebuild clinic scene as a visible SVG illustration). Cobertura: S12 (paleta `--cons-*` en `globals.css`, SVG con tinta/sombra; se descartó el primer intento por capas con `meet` porque escalaba gigante cada pieza), S13 (armado ~2 s vía `ESCALON_MS=300`+`DURACION_ENTRADA_MS=500`+`duracionEnsamblado()`; `Turno` retiene la primera tarjeta con `escenaLista` y el timer arranca ahí), S14 (sin atenuado; escena `max-w-[44rem]` para asomar a los costados en escritorio), S15 (spec `e2e/consultorio-escena.spec.ts`: 2 anchos × 3 momentos). Verificación: 159 tests vitest, build, 3 e2e `jugar-ronda.spec.ts` + 2 e2e escena en verde. Capturas en `test-results/consultorio-v2/` (gitignored): `390-armado-300ms.png`, `390-armado-1200ms.png`, `390-primer-paciente.png`, `1280-armado-300ms.png`, `1280-armado-1200ms.png`, `1280-primer-paciente.png`.
