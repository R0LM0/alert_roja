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
- S6. Game UI is a compact HUD over the canvas, never covering the center of the scene: patient name + POSITIVO stamp, the probability slider, Aislar/Liberar buttons, progress and timer. Mobile-first (390px).
- S7. The timer starts only when the patient has arrived at the desk.
- S8. Presentation only: no changes to scoring, seeds, patient generation or API payloads (`src/app/jugar/Turno.tsx` logic).
- S9. `useReducedMotion()`: no walking or door animation, patient appears at the desk.
- S10. Performance: must run smoothly on a mid-range phone (cap DPR at 1.5, no shadows or only baked/simple, few draw calls). If WebGL is unavailable, fall back to the current 2D flow.
- S11. Neutral cues only: animation must not hint at infection (no coughing, masks, color changes).
- S12. Validate visually with Playwright screenshots (390px and 1280px): door closed, door open, patient walking, patient at desk with HUD. Report the image paths.

## Tasks

- [ ] T1 (S1,S2,S3,S10) `Consultorio3D` canvas: room, desk, first-person camera, door opening on start. Remove the 2D `Consultorio` mount from `Turno.tsx`.
- [ ] T2 (S4,S5) One 3D patient walking in from the door to the desk (hardcoded), then leaving.
- [ ] T3 (S5,S7,S8) Wire real patients from `ronda` one by one; timer starts on arrival.
- [ ] T4 (S6) HUD redesign over the canvas for mobile and desktop.
- [ ] T5 (S9,S10,S11) Reduced motion, WebGL fallback, polish, sounds; run `npm run test` and e2e.

## Log

- L1 (2026-10-18): "se supone que era por eso te decia 3d osea como se abre la puerta y nos sentamos en consultorio en primera persona y luego va entrando pasiente por paciente esa era idea no poner algo solo consultorio al fondo te dije pero no me haces caso por eso te decia lo three js".
