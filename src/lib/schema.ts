import { z } from "zod";
import { tieneGroseria } from "./profanity";
import { PACIENTES_POR_RONDA } from "./stats";

export const prevalenciaSchema = z.union([z.literal(0.1), z.literal(0.01)]);

export const respuestaSchema = z.object({
  orden: z.number().int().min(1).max(PACIENTES_POR_RONDA),
  estimacion_pct: z.number().int().min(0).max(100),
  decision: z.enum(["aislar", "liberar"]),
  estaba_infectado: z.boolean(),
  tiempo_ms: z.number().int().min(0).max(600_000),
});

export const jugadorSchema = z
  .string()
  .trim()
  .min(1, "Escribí un apodo")
  .max(20, "Máximo 20 caracteres")
  .refine((s) => !tieneGroseria(s), "Elegí otro apodo");

export const partidaSchema = z.object({
  /** Clave de idempotencia generada por el cliente; si falta, la genera el servidor. */
  id: z.string().uuid().optional(),
  jugador: jugadorSchema,
  prevalencia: prevalenciaSchema,
  respuestas: z
    .array(respuestaSchema)
    .length(PACIENTES_POR_RONDA)
    .refine((rs) => new Set(rs.map((r) => r.orden)).size === rs.length, "orden repetido"),
});

export type PartidaInput = z.infer<typeof partidaSchema>;

/** Parámetro opcional ?prevalencia= : null = todas. */
export const filtroPrevalenciaSchema = z
  .string()
  .nullable()
  .transform((v) => (v === null || v === "" ? null : Number(v)))
  .pipe(prevalenciaSchema.nullable());
