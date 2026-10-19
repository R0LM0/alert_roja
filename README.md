# Alerta Roja

Juego web sobre el **teorema de Bayes**: la prueba acierta el 90 %, pero casi nadie sale bien parado al estimar qué significa un positivo. Proyecto de Análisis Estadístico (UNCSM), pensado para una feria: el público juega en el celular (QR) y un panel en el proyector muestra los resultados en vivo.

> **Mensaje clave:** "La prueba acierta 90 %, pero solo 1 de cada 3 positivos está enfermo".

## Los números

| Parámetro | Modo normal | Modo experto |
| --- | --- | --- |
| Ciudad | 1000 personas | 1000 personas |
| Prevalencia | 10 % | 1 % |
| Sensibilidad | 90 % | 90 % |
| Especificidad | 80 % | 80 % |
| Valor predictivo positivo (VPP) | 1/3 (33,3 %) | ≈ 4,3 % (1 de cada 23) |
| Tabla 2x2 (VP / FP / FN / VN) | 90 / 180 / 10 / 720 | 9 / 198 / 1 / 792 |

Cada ronda son 10 pacientes que dieron positivo. Por cada uno el jugador estima la probabilidad de infección (0–100 %) y decide **Aislar** o **Liberar**. La verdad se revela al final, no paciente por paciente.

Puntaje por paciente: `round(100 − |estimación − VPP|)` más 20 si la decisión coincide con la realidad. El servidor lo recalcula; nunca confía en el cliente.

## Stack y estructura

Next.js 15 (App Router) · TypeScript estricto · Tailwind v4 + Radix · Motion · Recharts · Three.js (ciudad 3D) · SWR · zod · Postgres (`pg` o Neon) · Vitest · Playwright.

```
src/
  app/            Rutas: / (inicio), /jugar, /resultado, /panel y /api/* (partidas, stats, ranking, export)
  components/     UI sin cálculos: game/, resultado/, panel/, three/, ui/
  lib/            Lógica pura y testeada: stats, ronda, resultado, formula-bayes, panel, ranking, export-xlsx, csv, cola-offline, rate-limit, db
db/migrations/    001_init.sql (partidas + respuestas), 002_primer_intento.sql (regla del ranking), 005_apodos.sql (apodos únicos)
scripts/          migrate.mjs (npm run db:migrate)
e2e/              Test de Playwright: una ronda completa en celular
```

Toda la estadística vive en `src/lib` (por ejemplo `stats.ts`); los componentes solo pintan lo que esas funciones devuelven.

## Variables de entorno

`.env.example` documenta las variables. En local se usa `.env.local` (no se sube al repositorio).

| Variable | Obligatoria | Para qué sirve |
| --- | --- | --- |
| `DATABASE_URL` | Sí | Conexión a Postgres. Si contiene `neon.tech` se usa el driver de Neon; si no, `pg`. |
| `NEXT_PUBLIC_SITE_URL` | Recomendada | URL pública del juego; es la que codifica el QR del panel. Si falta, se usa la URL desde la que se abrió el panel. |
| `PANEL_KEY` | Opcional | Si se define, `/api/export` (Excel y CSV) exige `?key=<PANEL_KEY>`. `/podio` exige la clave siempre: sin `PANEL_KEY` no se muestra. |
| `CIERRE_FERIA` | Opcional | Hora de cierre con zona, ej. `2026-10-20T18:00:00-06:00`. Las partidas creadas después no cuentan en el ranking ni en el podio. Si es inválida se ignora (aviso en consola). |

## Correr en local

### Opción A: Postgres con Docker

```bash
docker compose up -d db           # Postgres 16 en localhost:5432 (usuario, clave y base: alerta)
```

Crea `.env.local`:

```
DATABASE_URL=postgresql://alerta:alerta@localhost:5432/alerta
```

```bash
npm install
npm run db:migrate                # crea las tablas y aplica 001, 002 y 005
npm run dev                       # http://localhost:3000
```

Usa `docker compose up -d db` (solo la base): el servicio `web` del compose no tiene Dockerfile.

### Opción B: tu propio Postgres (sin Docker)

```bash
createdb alerta_roja
```

```
# .env.local
DATABASE_URL=postgresql://USUARIO:CLAVE@localhost:5432/alerta_roja
```

Luego `npm install`, `npm run db:migrate` y `npm run dev`.

## Con Neon

1. En Neon crea una base **separada** para este proyecto (por ejemplo `alerta_roja`); no reutilices la de otros proyectos.
2. Copia la cadena de conexión a `DATABASE_URL` en `.env.local`. Si trae `channel_binding=require`, no hace falta quitarlo: la app y el script de migración lo eliminan solos (el driver HTTP de Neon no lo soporta).
3. Ejecuta `npm run db:migrate` una vez.

## Desplegar en Vercel

No hace falta Dockerfile.

1. Importa el repositorio en Vercel.
2. Define las 3 variables de entorno: `DATABASE_URL` (Neon), `NEXT_PUBLIC_SITE_URL` (la URL pública del despliegue, la que usa el QR) y `PANEL_KEY`.
3. Migra la base de Neon **una vez desde tu máquina**: `DATABASE_URL` de Neon en `.env.local` y `npm run db:migrate`.
4. Abre `/panel?key=TU_CLAVE`.

El límite de peticiones por IP vive en memoria: en Vercel es **por instancia serverless**, no global. Alcanza para frenar abusos simples, no es una garantía estricta.

## Consejos para la feria

- El QR apunta a `NEXT_PUBLIC_SITE_URL`. En la feria usa la URL pública, o la IP de tu red local (`http://192.168.x.x:3000`) si todos están en el mismo Wi-Fi.
- Por HTTP en LAN el juego funciona (hay respaldo para generar el id de partida sin `crypto.randomUUID`), pero el audio y el WebGL se comportan mejor con HTTPS.
- Proyecta `/panel` a 1920x1080. El filtro Normal / Experto cambia las estadísticas y el histograma.
- **Apodos únicos**: cada apodo queda reservado para el dispositivo que lo usó primero (token `dueno` en `localStorage`, clave `alerta-roja:dueno`; nunca se muestra). Otro dispositivo recibe un 409 con apodos libres sugeridos. Si se borran los datos del navegador, se pierde la reserva. Migración `005_apodos.sql` (tabla `apodos`); la base de la feria se reinicia, así que no hay relleno de partidas previas.
- **Ranking**: solo cuenta el **primer intento por apodo** (sin distinguir mayúsculas ni espacios) en cada dificultad; el desempate es el **menor tiempo total** y luego la partida más antigua. Los intentos siguientes se guardan, pero no entran al ranking ni a las estadísticas del público (histograma, promedio, VPP observado, % que sobreestimó). El contador en vivo sí cuenta todas las partidas.
- **Exportar Excel** (o `/api/export?key=TU_CLAVE`) baja un `.xlsx` con las hojas Resumen (cifras y explicación), Ranking, Histograma y Respuestas (una fila por respuesta, con la columna Primer intento). La hoja Histograma incluye un gráfico de columnas nativo (editable en Excel) por dificultad, con el tramo del VPP teórico resaltado. El enlace **CSV** (`/api/export?formato=csv&key=TU_CLAVE`) baja lo mismo en UTF-8 con BOM. Las horas van en hora de Managua (UTC−6).
- Si el celular pierde conexión al terminar, la partida queda en cola local y se reenvía sola; la pantalla muestra "guardado" o "pendiente".

## Día de la feria

1. `npm run db:migrate` (aplica migraciones pendientes).
2. `npm run db:reset-feria -- --confirmar` vacía partidas, respuestas y apodos, y reinicia los ids. Sin `--confirmar` solo muestra a qué base se conecta y los conteos.
3. Define `CIERRE_FERIA` con la hora de cierre (ej. `2026-10-20T18:00:00-06:00`) y reinicia el servidor.
4. Abre `/podio?key=TU_CLAVE` para ver el top 3 de Normal y Experto. El botón **Revelar** muestra 3.º, 2.º y 1.º.

El podio avisa de **empates** (mismo puntaje y tiempo) y de **mismo dispositivo** en más de un puesto. No excluye a nadie: el organizador decide.

## Tests

```bash
npm test            # Vitest: lógica pura (Bayes, VPP al 10 % y 1 %, puntaje, insignias, panel, cola offline...)
npm run test:e2e    # Playwright: una ronda completa a 360x740
```

El test E2E construye y levanta la app de producción en el puerto 3116 e intercepta `POST /api/partidas`, así que **no escribe en la base**. Usa el Chromium ya instalado de Playwright (si falta: `npx playwright install chromium`).

## Guion de 30 segundos

> "Hay un brote en una ciudad de mil personas: 1 de cada 10 está enfermo.
> Existe una prueba que acierta el 90 %. Te llegan diez pacientes que dieron positivo.
> Tu trabajo: decir qué tan probable es que cada uno esté enfermo, y decidir si lo aíslas o lo liberas.
> Al final te mostramos la ciudad completa y la verdad.
> La sorpresa: de cada 3 positivos, solo 1 está realmente enfermo.
> Pasa porque la enfermedad es poco común: los falsos positivos de mucha gente sana pesan más que los aciertos. Eso es el teorema de Bayes."

## Créditos y licencias

Tipografías, iconos y avatares usan licencias libres, documentadas una por una en [CREDITS.md](CREDITS.md). Los assets se sirven desde el propio sitio, sin CDN en tiempo de ejecución; el sonido se sintetiza en el navegador.
