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
ALTER TABLE productos ADD CONSTRAINT productos_subtipo_check
CHECK (
  (tipo = 'extraccion' AND subtipo IN ('ICE O LATOR', 'BHO', 'DRY SIFT', 'HASH'))
  OR 
  (tipo != 'extraccion') 
);

-- ====================================================
-- INSTRUCCIONES:
-- Copia todo este código y ejecútalo en el SQL Editor de Supabase
-- ====================================================
