-- 017_baseline_to_timestamptz.sql
-- Convert baseline TIMESTAMP columns to TIMESTAMPTZ to be timezone-aware.
--
-- Pre-validation: all rows in this DB are timezone-naive. The data was
-- stored assuming UTC (every value came from a Node new Date() in
-- server local time which is UTC in production). Converting with
-- AT TIME ZONE 'UTC' preserves the underlying instant.
--
-- Tables vacías: este cambio es seguro sin pérdida de datos.
-- Si en el futuro se importan datos timezone-ambiguous, esto podrá
-- requerir re-interpretación por tabla.

DO $$
DECLARE
  tbl text;
  cols text[];
  c text;
BEGIN
  -- Map of table → list of timestamp columns
  FOR tbl, cols IN
    SELECT * FROM (VALUES
      ('usuarios', ARRAY['fecha_registro']::text[]),
      ('equipos_seguidos', ARRAY['fecha_seguimiento']::text[]),
      ('historial_consultas', ARRAY['fecha']::text[]),
      ('apuestas', ARRAY['fecha_creacion','fecha_partido','fecha_cierre']::text[]),
      ('eventos_apuesta', ARRAY['fecha']::text[])
    ) AS m(t, c)
  LOOP
    FOREACH c IN ARRAY cols
    LOOP
      EXECUTE format(
        'ALTER TABLE %I ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I AT TIME ZONE ''UTC''',
        tbl, c, c
      );
    END LOOP;
  END LOOP;
END
$$;
