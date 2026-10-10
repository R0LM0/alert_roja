-- Ejecutar una vez en la consola SQL de Neon.
create table if not exists respuestas (
  id               bigserial primary key,
  creada_en        timestamptz not null default now(),
  ronda_id         uuid        not null,
  jugador          text        not null check (char_length(jugador) between 1 and 40),
  estimacion_pct   smallint    not null check (estimacion_pct between 0 and 100),
  decision         text        not null check (decision in ('aislar', 'liberar')),
  estaba_infectado boolean     not null
);

create index if not exists respuestas_creada_en_idx on respuestas (creada_en desc);
