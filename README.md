# 🚨 Alerta Roja

Juego estadístico web (Next.js + Neon) sobre el **teorema de Bayes**, sensibilidad, especificidad y valor predictivo positivo. Basado en los juegos 24 y 39 del catálogo de Análisis Estadístico.

**Idea:** la prueba "acierta 90%", pero con 10% de prevalencia y 20% de falsas alarmas, solo **1 de cada 3 positivos** está realmente infectado.

## Cómo se juega

1. El jugador recibe 10 pacientes que dieron positivo.
2. Para cada uno estima con un slider la probabilidad de que esté infectado y decide **aislar** o **liberar**.
3. Al final ve la ciudad de 1000 personas repartida en la tabla 2×2 y la fórmula de Bayes.
4. El panel (`/panel`) compara lo que estima el público contra el VPP real y exporta un CSV.

## Correr en local

```bash
npm install
cp .env.example .env.local   # poné tu DATABASE_URL de Neon
# ejecutá db/schema.sql en la consola SQL de Neon
npm run dev
npm test
```

## Despliegue en Vercel

1. Importá el repo en Vercel.
2. Integración **Neon** (inyecta `DATABASE_URL`) o agregá la variable a mano.
3. Ejecutá `db/schema.sql` una vez en Neon.

## Estructura

- `src/lib/stats.ts` — fórmulas (Bayes, VPP, VPN, frecuencias naturales). Con tests.
- `src/app/api/respuestas/route.ts` — POST (valida con zod, límite de tamaño y rate limit básico) y GET.
- `src/app/api/export/route.ts` — CSV.
- `src/app/page.tsx` — juego. `src/app/panel/page.tsx` — panel con polling (SWR).

## Cálculo en Excel

Con el CSV exportado: `VPP observado = PROMEDIO(estaba_infectado)` y `VPP teórico = (0.9*0.1)/(0.9*0.1+0.2*0.9)`.

## Pendiente (siguiente iteración)

- Slider de prevalencia en el panel (1% → el VPP se desploma).
- Rate limit persistente (Upstash) si el endpoint queda público mucho tiempo.
- Ajuste de Poisson a las llegadas al stand.
