-- 015_check_constraints.sql
-- Adds CHECK constraints to enforce known enum-like values.
-- Pre-validated: production tables have 0 rows that would conflict.

-- Apuestas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'apuestas_estado_check'
  ) THEN
    ALTER TABLE apuestas
      ADD CONSTRAINT apuestas_estado_check
      CHECK (estado IS NULL OR estado IN ('abierta', 'cerrada', 'completada', 'anulada'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'apuestas_ocr_confianza_range'
  ) THEN
    ALTER TABLE apuestas
      ADD CONSTRAINT apuestas_ocr_confianza_range
      CHECK (confianza_ocr IS NULL OR (confianza_ocr >= 0 AND confianza_ocr <= 1));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'apuestas_id_apuesta_not_null_check'
  ) THEN
    -- id_usuario and id_apuesta are critical FK columns. We can only
    -- enforce NOT NULL where it doesn't break existing rows.
    -- id_apuesta in apuesta_selecciones: keep nullable for now.
    NULL;
  END IF;
END
$$;

-- Selecciones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'selecciones_estado_check'
  ) THEN
    ALTER TABLE apuesta_selecciones
      ADD CONSTRAINT selecciones_estado_check
      CHECK (estado IS NULL OR estado IN ('pendiente', 'ganada', 'perdida', 'anulada', 'push'));
  END IF;
END
$$;

-- Eventos
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'eventos_tipo_check'
  ) THEN
    ALTER TABLE eventos_apuesta
      ADD CONSTRAINT eventos_tipo_check
      CHECK (tipo_evento IS NULL OR tipo_evento IN (
        'gol', 'corner', 'tarjeta_amarilla', 'tarjeta_roja',
        'cambio', 'finalizado', 'iniciado'
      ));
  END IF;
END
$$;

-- Bet followers
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bet_followers_mode_check'
  ) THEN
    ALTER TABLE bet_followers
      ADD CONSTRAINT bet_followers_mode_check
      CHECK (mode IN ('all_events', 'outcome'));
  END IF;
END
$$;
