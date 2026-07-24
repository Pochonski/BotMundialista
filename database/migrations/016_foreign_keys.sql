-- 016_foreign_keys.sql
-- Adds foreign keys that the codebase logically relies on but Postgres
-- was not enforcing. All orphan rows were validated and cleaned in
-- pre-validation (Phase 3 task 3.0).

-- Apuestas
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'apuestas_usuario_fk') THEN
    ALTER TABLE apuestas
      ADD CONSTRAINT apuestas_usuario_fk
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'equipos_seguidos_usuario_fk') THEN
    ALTER TABLE equipos_seguidos
      ADD CONSTRAINT equipos_seguidos_usuario_fk
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
      ON DELETE CASCADE;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'historial_usuario_fk') THEN
    ALTER TABLE historial_consultas
      ADD CONSTRAINT historial_usuario_fk
      FOREIGN KEY (id_usuario) REFERENCES usuarios(id)
      ON DELETE CASCADE;
  END IF;

  -- Note: bet_followers.ticket_id is TEXT( apuestas.id is INT). A FK
  -- with a cast is not permitted. The proper normalization belongs to
  -- migration 018 (bet_followers_v2 with an INT apuesta_id column).
  -- Until 018 runs, the FK on bet_followers is omitted on purpose.
END
$$;
