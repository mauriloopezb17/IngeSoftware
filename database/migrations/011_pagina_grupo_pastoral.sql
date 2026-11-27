-- Migración 011: página propia, galería, contenido enriquecido y contacto separado para cada grupo pastoral (PAR-172, PAR-166.1).
BEGIN;

ALTER TABLE grupo_pastoral
    ADD COLUMN slug varchar(120) NULL,
    ADD COLUMN whatsapp varchar(30) NULL,
    ADD COLUMN correo varchar(120) NULL,
    ADD COLUMN detalle jsonb NULL;

ALTER TABLE grupo_pastoral
    RENAME COLUMN contacto TO responsable;

WITH bases AS (
    SELECT id,
           sede_id,
           orden,
           COALESCE(
               NULLIF(
                   trim(both '-' from regexp_replace(
                       lower(translate(
                           nombre,
                           'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
                           'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc'
                       )),
                       '[^a-z0-9]+',
                       '-',
                       'g'
                   )),
                   ''
               ),
               'grupo'
           ) AS slug_base
      FROM grupo_pastoral
),
numerados AS (
    SELECT id,
           slug_base,
           ROW_NUMBER() OVER (PARTITION BY sede_id, slug_base ORDER BY orden, id) AS fila_num
      FROM bases
)
UPDATE grupo_pastoral g
   SET slug = CASE
                WHEN n.fila_num = 1 THEN left(n.slug_base, 120)
                ELSE left(n.slug_base, 115) || '-' || n.fila_num
              END
  FROM numerados n
 WHERE g.id = n.id;

ALTER TABLE grupo_pastoral
    ALTER COLUMN slug SET NOT NULL;

ALTER TABLE grupo_pastoral
    ADD CONSTRAINT grupo_pastoral_sede_slug_uq UNIQUE (sede_id, slug);

-- Completa el slug al insertar sin él (por ejemplo, en el seed inicial que corre después de las migraciones).
CREATE OR REPLACE FUNCTION grupo_pastoral_completar_slug()
RETURNS trigger AS $$
DECLARE
    slug_base text;
    candidato text;
    sufijo int := 2;
BEGIN
    IF NEW.slug IS NOT NULL AND NEW.slug <> '' THEN
        RETURN NEW;
    END IF;
    slug_base := COALESCE(
        NULLIF(
            trim(both '-' from regexp_replace(
                lower(translate(
                    NEW.nombre,
                    'áàäâãéèëêíìïîóòöôõúùüûñçÁÀÄÂÃÉÈËÊÍÌÏÎÓÒÖÔÕÚÙÜÛÑÇ',
                    'aaaaaeeeeiiiiooooouuuuncaaaaaeeeeiiiiooooouuuunc'
                )),
                '[^a-z0-9]+',
                '-',
                'g'
            )),
            ''
        ),
        'grupo'
    );
    candidato := left(slug_base, 120);
    WHILE EXISTS (
        SELECT 1 FROM grupo_pastoral WHERE sede_id = NEW.sede_id AND slug = candidato
    ) LOOP
        candidato := left(slug_base, 115) || '-' || sufijo;
        sufijo := sufijo + 1;
    END LOOP;
    NEW.slug := candidato;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grupo_pastoral_bi_slug
    BEFORE INSERT ON grupo_pastoral
    FOR EACH ROW
    EXECUTE FUNCTION grupo_pastoral_completar_slug();

COMMIT;
