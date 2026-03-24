-- =========== ACTUALIZACIÓN: PRODUCTOS AISLADOS (CONCEPTO) ===========
-- 1. Añadimos la columna 'concepto' a la tabla de ventas para permitir notas manuales
ALTER TABLE ventas ADD COLUMN IF NOT EXISTS concepto TEXT;

-- 2. Actualizamos la vista del Registro de Ventas para que incluya esta nueva columna
DROP VIEW IF EXISTS vista_registro_ventas;
CREATE VIEW vista_registro_ventas AS
SELECT 
    v.id AS venta_id,
    p.nombre AS producto_nombre,
    p.tipo AS producto_tipo,
    p.subtipo AS producto_subtipo,
    v.cantidad_real,
    v.total_cobrado,
    v.created_at AS fecha_hora,
    v.concepto
FROM ventas v
JOIN productos p ON v.producto_id = p.id;
