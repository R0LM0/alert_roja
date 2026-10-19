-- Evidencia clínica por respuesta para el puntaje bayesiano. Nullable para filas demo anteriores.
alter table respuestas
  add column if not exists evidencia text check (evidencia in ('conviviente', 'contacto', 'sintomas', 'sin-antecedentes', 'protegido'));
