-- ====================================================
-- MIGRACIÓN DE INVENTARIO: CATEGORÍAS Y SUBTIPOS 
-- ====================================================

-- 1. Eliminar la restricción actual de 'tipo'
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_tipo_check;

-- 2. Migrar los datos existentes a la nueva nomenclatura
UPDATE productos SET tipo = 'weed' WHERE tipo = 'flor';
UPDATE productos SET tipo = 'extraccion' WHERE tipo = 'resina';

-- 3. Añadir la nueva restricción restrictiva para 'tipo'
ALTER TABLE productos ADD CONSTRAINT productos_tipo_check 
CHECK (tipo IN ('weed', 'extraccion', 'bebida', 'otro'));

-- 4. Añadir la nueva columna 'subtipo'
ALTER TABLE productos ADD COLUMN IF NOT EXISTS subtipo TEXT NULL;

-- 5. Añadir la restricción condicional para 'subtipo'
-- Solo obliga a tener subtipo válido si el tipo es 'extraccion'
ALTER TABLE productos DROP CONSTRAINT IF EXISTS productos_subtipo_check;
ALTER TABLE productos ADD CONSTRAINT productos_subtipo_check
CHECK (
  (tipo = 'extraccion' AND subtipo IN ('ICE O LATOR', 'BHO', 'DRY SIFT', 'HASH'))
  OR 
  (tipo != 'extraccion') 
);

-- 6. Contabilidad de Cortesías en Ventas
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS ajuste_peso NUMERIC(10,2) DEFAULT 0;
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS ajuste_euros NUMERIC(10,2) DEFAULT 0;

-- 7. Actualizar la Vista Histórica
DROP VIEW IF EXISTS vista_registro_ventas;
CREATE VIEW vista_registro_ventas AS
SELECT 
  v.id AS venta_id,
  p.id AS producto_id,
  p.nombre AS producto_nombre,
  p.tipo AS producto_tipo,
  p.subtipo AS producto_subtipo,
  v.cantidad,
  v.total AS total_euros,
  v.ajuste_peso,
  v.ajuste_euros,
  v.created_at AS fecha_hora
FROM ventas v
JOIN productos p ON v.producto_id = p.id
ORDER BY v.created_at DESC;

-- ====================================================
-- INSTRUCCIONES ÚLTIMA PASADA:
-- Copia TODO este código (líneas de la 1 a la 44) 
-- y ejecútalo en el SQL Editor de Supabase
-- ====================================================
