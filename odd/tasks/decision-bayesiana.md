# Decisión bayesiana por paciente

Objective: que el teorema de Bayes sea **la mecánica** del juego, no un anexo del final. Cada paciente trae su propia evidencia, su probabilidad se actualiza por Bayes y la decisión se toma contra un umbral de consecuencias. Supersede la parte de mecánica de `odd/tasks/consultorio-3d.md` (allí queda el historial de la escena 3D y el log).
Branch: `feat/consultorio-animado`. One commit per task, Conventional Commits, no AI attribution.
Runner: `npm run test`, `npm run build`, `npx playwright test`. **No correr build ni e2e con el dev activo.** Pausa tras cada tarea para validación humana.

## Contexto del cambio

Hoy los 10 pacientes del mismo modo son **indistinguibles** para el jugador: todos dieron positivo, así que P(enfermo|positivo) es la misma para todos (33 % en normal). Si la probabilidad no cambia, la acción sensata tampoco: no hay decisión real por paciente, y el puntaje por aciertos premia liberar siempre (6,7 aciertos esperados contra 3,3), lo que contradice el final del brote.

**Sin restricciones de compatibilidad**: la base está en modo demo y se reinicia para la feria. No hace falta migración segura, ni temporadas, ni conservar filas viejas.

## Specs

- S1. Cada paciente llega con una **señal clínica** (evidencia) que fija su probabilidad previa según la modalidad. El test (positivo) la actualiza con Bayes: sensibilidad 0,9 y especificidad 0,8, los mismos parámetros que ya usa el juego.
- S2. Un **umbral único** de decisión para las dos modalidades: aislar a un sano cuesta 1 y liberar a un enfermo cuesta 3, así que la acción de mayor valor esperado es **aislar cuando P(enfermo|positivo) > 25 %**. Los dos modos enseñan cosas distintas sin cambiar los costos.
- S3. La semilla genera **todo** el caso del paciente: evidencia, infección y avatar. Una misma semilla da la misma partida completa (demo repetible para la feria).
- S4. Tabla de evidencias → previo por modalidad, y posteriores que resultan de Bayes:

  | Evidencia | Previo normal | Previo experto | Posterior normal | Posterior experto | Acción óptima |
  |---|---|---|---|---|---|
  | Conviviente con caso | 40 % | 10 % | 75 % | 33 % | aislar (ambas) |
  | Contacto estrecho | 25 % | 5 % | 60 % | 19 % | aislar / liberar |
  | Síntomas compatibles | 18 % | 3 % | 49,7 % | 12 % | aislar / liberar |
  | Sin antecedentes | 10 % | 1 % | 33 % | 4,4 % | aislar / liberar |
  | Protegido (vacunado/barbijo) | 4 % | 0,5 % | 15,8 % | 2,2 % | liberar (ambas) |

  En normal la acción óptima varía (4 de 5 se aíslan, la protección se libera); en experto varía al revés (solo el conviviente se aísla). Ninguna modalidad es un botón repetido 10 veces.
- S5. Puntaje: **1 punto por elegir la acción de mayor valor esperado**. Es la regla de decisión bayesiana, no un acierto contra la verdad oculta.
- S6. Estética de decisión: el jugador ve la evidencia y un recordatorio de los parámetros del test (sensibilidad 90 %, especificidad 80 %), no ve el posterior (eso es lo que tiene que estimar).
- S7. Dinamismo: al decidir suena el efecto, aparece un sello con tu decisión y el paciente **sale hacia cuarentena o hacia la puerta** según lo que elegiste.
- S8. Las dos modalidades siguen: normal (prevalencia 10 %) y experto (1 %), y el modo experto conserva su lección de tasa base (con enfermedad rarísima, casi todo positivo se libera).
- S9. `/resultado` conserva lo que ya funciona (ciudad 2x2, veredicto de la ciudad, mensaje clave, Bayes paso a paso) y **suma** la lectura bayesiana por paciente: su evidencia, previo, posterior, umbral y si tu decisión fue la de mayor valor esperado.
- S10. El veredicto de la ciudad sigue mirando los contagios liberados; una ronda con 0 infectados tiene texto propio (hoy dice "Aislaste a los 0 pacientes infectados").
- S11. Presentación y cálculo separados: los posteriores, umbrales y puntajes salen de funciones puras en `src/lib` con tests; los componentes solo pintan.

## Tasks

- [ ] T1 (S1,S2,S3,S4) Lógica pura: evidencia → previo → posterior → acción óptima → puntos. Semilla reproducible. Tests de la tabla de S4 y del umbral.
- [ ] T2 (S1,S6) UI de ronda: mostrar evidencia y recordatorio del test; quitar cualquier cosa que fije el caso.
- [ ] T3 (S5,S9) Puntaje y resultado por paciente (previo, posterior, umbral, valor esperado).
- [ ] T4 (S7) Dinamismo: sonido al decidir, sello de la decisión, salida a cuarentena o puerta.
- [ ] T5 (S3,S10) Semilla reproducible end‑to‑end + texto del caso 0 infectados.
- [ ] T6 Verificación: `npm run test`, `npm run build`, `npx playwright test` (con el dev apagado) y capturas de las dos modalidades.

## Log

- L1 (2026-10-19): Usuario: "ajustaos entre más esté corriente con el teorema y le dé más dinamismo al juego, estaría perfecto, y me gusta sobre los 2 tipos de modalidad". Antes: "si vamos a reiniciar la bd por que ahorita la tenemos modo demo... para el día de la feria empezaremos desde cero, entonces ahorita estamos tomando cualquier feedback entonces hay que hacer lo conveniente" → sin ataduras de compatibilidad.
- L2 (2026-10-19): Diagnóstico del padre aceptado como base del plan: con posterior constante por modalidad no hay decisión por paciente, y el puntaje por aciertos premiaba liberar siempre (contradicción con el final del brote).
- L3 (2026-10-19): Implementación completa en commit `bbc1976` (pusheado a la rama). Piezas: T1 `src/lib/caso-bayesiano.ts` (tabla de evidencias, umbral derivado de los costos, valor esperado, semilla) + 31 tests; T2 ronda sembrada con `casoDePaciente` y tarjeta con evidencia, recordatorio del test, sonido y sello; T3 puntaje/resultado bayesiano, insignias por decisión óptima y copy del caso 0 infectados; T4b salida a cuarentena o puerta; W-D evidencia en el payload, `puntajeDeRespuestas` como único cálculo del servidor y migración `004_respuestas_evidencia.sql`. Verificado: 249 tests, `tsc` limpio, `build` de producción limpio; el e2e se estaba corriendo al commitear.
- L4 (2026-10-19): PENDIENTES declarados para la próxima sesión: (a) confirmar el e2e (el spec `resultado-finales` tuvo que sembrar `evidencia`, que pasó a ser obligatoria en el schema, y el run en vuelo usa la versión vieja); (b) aplicar migraciones `003` y `004` antes de guardar partidas reales; (c) insignias visibles (chips en el ranking + persistencia local, después página "mi apodo"); (d) panel de la nueva era; (e) pulido visual; (f) verificar reduced-motion y fallback sin WebGL en pantalla. El dev server quedó apagado.
