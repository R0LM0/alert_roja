import { z } from "zod";

export const respuestaSchema = z.object({
  estimacion_pct: z.number().int().min(0).max(100),
  decision: z.enum(["aislar", "liberar"]),
  estaba_infectado: z.boolean(),
});

export const rondaSchema = z.object({
  ronda_id: z.string().uuid(),
  jugador: z.string().trim().min(1).max(40),
  respuestas: z.array(respuestaSchema).min(1).max(20),
});

export type RondaInput = z.infer<typeof rondaSchema>;
