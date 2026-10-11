-- Alerta Roja: partidas y sus 10 respuestas. Idempotente.
create table if not exists partidas (
  id          uuid        primary key default gen_random_uuid(),
  creada_en   timestamptz not null default now(),
  jugador     text        not null check (char_length(jugador) between 1 and 20),
  prevalencia numeric     not null check (prevalencia in (0.1, 0.01)),
  puntaje     int         not null check (puntaje >= 0)
);

create table if not exists respuestas (
  id               bigserial primary key,
  partida_id       uuid      not null references partidas (id) on delete cascade,
  orden            smallint  not null check (orden between 1 and 10),
  estimacion_pct   smallint  not null check (estimacion_pct between 0 and 100),
  decision         text      not null check (decision in ('aislar', 'liberar')),
  estaba_infectado boolean   not null,
  tiempo_ms        int       not null check (tiempo_ms >= 0)
);

create index if not exists partidas_creada_en_idx on partidas (creada_en);
create index if not exists respuestas_partida_id_idx on respuestas (partida_id);
