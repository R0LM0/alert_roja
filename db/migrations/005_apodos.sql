-- Apodos únicos: cada apodo (normalizado: sin espacios en los bordes ni mayúsculas)
-- queda reservado para el dispositivo (dueno) que lo reclamó primero. Idempotente.
-- No toca partidas: no hace falta relleno de datos existentes.
create table if not exists apodos (
  apodo_norm text primary key,
  apodo text not null,
  dueno uuid not null,
  creado_en timestamptz not null default now()
);
