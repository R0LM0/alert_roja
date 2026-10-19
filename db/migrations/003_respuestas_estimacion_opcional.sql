-- Las rondas nuevas registran solo decisiones; las estimaciones anteriores se conservan.
alter table respuestas alter column estimacion_pct drop not null;
