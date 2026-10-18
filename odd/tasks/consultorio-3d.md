# Consultorio 3D en primera persona

Objective: replace the 2D clinic backdrop with a first-person 3D clinic. Supersedes `odd/tasks/consultorio-animado.md` (2D approach rejected by the user).
Branch: `feat/consultorio-animado` (never `main`). One commit per task, Conventional Commits, no AI attribution.
Runner: `npm run test`, `npx playwright test`. Do NOT run `npm run build` while the dev server is running (it corrupts `.next`); stop and ask first. Pause after each task for human validation.

## Specs

- S1. Use `three` + `@react-three/fiber` + `@react-three/drei` (already installed). No new dependencies. Reuse the existing pattern in `src/components/three/` (dynamic import, `ssr: false`).
- S2. First-person view: camera sits behind the doctor's desk, looking at the door. The player is the doctor.
- S3. Intro: on "Start", the scene loads and the door opens (hinge rotation animation, ~1.5 s) before the first patient.
- S4. Patients are low-poly 3D characters built from primitives (no external models). Face: the existing DiceBear avatar (`PatientAvatar`) as a texture on a plane on the head. Faces stay neutral.
- S5. Patients enter one by one: walk from the door to the desk, stop in front of it. After the decision the patient leaves (to isolation room or out the door) and the next one enters.
- S6. Game UI is a compact HUD over the canvas, never covering the center of the scene: patient name + POSITIVO stamp, Aislar/Liberar buttons, progress and timer. Mobile-first (390px). DECISIÓN 2026-10-18: sin slider de estimación (el usuario lo siente inútil); decisión pura del médico y puntaje por aciertos. El final igual enseña la lección bayesiana.
- S7. The timer starts only when the patient has arrived at the desk.
- S8. Presentation only: no changes to seeds, patient generation or API payloads (`src/app/jugar/Turno.tsx` logic). La única excepción autorizada es sacar la estimación del flujo (decisión 2026-10-18): `estimacion_pct` deja de pedirse al jugador.
- S9. `useReducedMotion()`: no walking or door animation, patient appears at the desk.
- S10. Performance: must run smoothly on a mid-range phone (cap DPR at 1.5, no shadows or only baked/simple, few draw calls). If WebGL is unavailable, fall back to the current 2D flow.
- S11. Neutral cues only: animation must not hint at infection (no coughing, masks, color changes).
- S12. Validate visually with Playwright screenshots (390px and 1280px): door closed, door open, patient walking, patient at desk with HUD. Report the image paths.

## Tasks

- [x] T1 (S1,S2,S3,S10) `Consultorio3D` canvas: room, desk, first-person camera, door opening on start. Remove the 2D `Consultorio` mount from `Turno.tsx`. Commit: `033c3b0`.
- [ ] T2 (S4,S5) One 3D patient walking in from the door to the desk (hardcoded), then leaving.
- [ ] T3 (S5,S7,S8) Wire real patients from `ronda` one by one; timer starts on arrival.
- [ ] T4 (S6) HUD redesign over the canvas for mobile and desktop.
- [ ] T5 (S9,S10,S11) Reduced motion, WebGL fallback, polish, sounds; run `npm run test` and e2e.

## Log

- L1 (2026-10-18): "se supone que era por eso te decia 3d osea como se abre la puerta y nos sentamos en consultorio en primera persona y luego va entrando pasiente por paciente esa era idea no poner algo solo consultorio al fondo te dije pero no me haces caso por eso te decia lo three js".
- L2 (2026-10-18): T1 implementada en commit `033c3b0` (+ docs). Cobertura: S1 (three/R3F existentes, dynamic ssr:false), S2 (cámara en [0,1.7,2.4] mirando a la puerta, escritorio en primer plano), S3 (puerta gira a -110° con ease-out en 1.5 s + respiro previo de 250 ms; `Turno` muestra la tarjeta 600 ms después del aviso del canvas y el timer arranca ahí), S10 (dpr<=1.5, sin sombras, frameloop a demand al abrir; fallback al flujo 2D sin WebGL). Verificación: 165 tests vitest (7 del timing de la puerta), `tsc --noEmit` limpio, sin build (dev activo). Capturas CLI contra el dev server en `test-results/consultorio-3d/` (gitignored): `390-puerta-cerrada.png`, `390-puerta-abierta.png`, `1280-puerta-cerrada.png`, `1280-puerta-abierta.png` (puerta abierta sin tarjeta todavía). Nota: no correr e2e/build mientras el dev corre; el spec `consultorio-escena` existente sigue válido para T5 contra build.
- L3 (2026-10-18): Decisión de producto del usuario: sacar la barra de estimación; el juego pasa a decisión pura (Aislar = cuarentena / Liberar = sano) con puntaje por aciertos. Motivación: "la barra del porcentaje creo que no sirve para nada" — el flujo no le daba consecuencia visible. S6 y S8 actualizados. El cambio (quitar slider de `TarjetaPaciente`/`Turno`, respuestas sin `estimacion_pct`, puntaje por aciertos, e2e) queda para T4 (HUD) o tarea propia; NO implementado todavía.
