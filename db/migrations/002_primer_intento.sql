-- Ranking por primer intento: solo la primera partida de cada apodo (sin distinguir
-- mayúsculas ni espacios en los bordes) y dificultad cuenta para ranking y estadísticas.
-- Desempate por menor tiempo total. Idempotente.
alter table partidas add column if not exists tiempo_total_ms int;

alter table partidas add column if not exists primer_intento boolean not null default true;

-- Relleno de las partidas existentes: tiempo total = suma de los tiempos de sus respuestas.
update partidas p
set tiempo_total_ms = coalesce(r.total, 0)
from (select partida_id, sum(tiempo_ms)::int as total from respuestas group by partida_id) r
where r.partida_id = p.id and p.tiempo_total_ms is null;

update partidas
set tiempo_total_ms = 0
where tiempo_total_ms is null;

-- Primer intento = la más antigua (creada_en, luego id) por (apodo normalizado, prevalencia).
update partidas p
set primer_intento = (o.pos = 1)
from (
  select id,
         row_number() over (
           partition by lower(btrim(jugador)), prevalencia
           order by creada_en, id
         ) as pos
  from partidas
) o
where o.id = p.id and p.primer_intento is distinct from (o.pos = 1);

-- Ranking: top por dificultad entre primeros intentos.
create index if not exists partidas_ranking_idx
  on partidas (prevalencia, puntaje desc, tiempo_total_ms, creada_en)
  where primer_intento;

-- Garantiza un solo primer intento por apodo y dificultad aunque dos envíos choquen.
create unique index if not exists partidas_primer_intento_uk
  on partidas (lower(btrim(jugador)), prevalencia)
  where primer_intento
