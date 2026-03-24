-- =========== EXOTIC HUB SIMPLIFICATION ===========
-- 1. Eliminar vistas y dependencias
DROP VIEW IF EXISTS vista_registro_ventas;

-- 2. Simplificar tabla de ventas
ALTER TABLE ventas DROP COLUMN IF EXISTS ajuste_peso;
ALTER TABLE ventas DROP COLUMN IF EXISTS ajuste_euros;
ALTER TABLE ventas RENAME COLUMN cantidad TO cantidad_real;
ALTER TABLE ventas RENAME COLUMN total TO total_cobrado;

-- 3. Recrear Triggers (cambiando 'cantidad' por 'cantidad_real')
-- Función para restar stock de forma automática
CREATE OR REPLACE FUNCTION restar_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE productos
    SET stock = stock - NEW.cantidad_real
    WHERE id = NEW.producto_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Función para devolver el stock al anular / borrar una venta
CREATE OR REPLACE FUNCTION revertir_stock_borrado()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE productos
    SET stock = stock + OLD.cantidad_real
    WHERE id = OLD.producto_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 4. Recrear la Vista Simplificada para el Panel
CREATE VIEW vista_registro_ventas AS
SELECT 
    v.id AS venta_id,
    p.nombre AS producto_nombre,
    p.tipo AS producto_tipo,
    p.subtipo AS producto_subtipo,
    v.cantidad_real,
    v.total_cobrado,
    v.created_at AS fecha_hora
FROM ventas v
JOIN productos p ON v.producto_id = p.id;
