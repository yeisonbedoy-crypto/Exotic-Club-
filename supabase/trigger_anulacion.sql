-- Función para devolver el stock descontado cuando se anula una venta
CREATE OR REPLACE FUNCTION revertir_stock_borrado()
RETURNS TRIGGER AS $$
BEGIN
    -- Sumar la cantidad de la venta de vuelta al inventario del producto
    UPDATE productos
    SET stock = stock + OLD.cantidad
    WHERE id = OLD.producto_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Crear el Trigger asociado a la tabla 'ventas'
DROP TRIGGER IF EXISTS trigger_sumar_stock_borrado ON ventas;
CREATE TRIGGER trigger_sumar_stock_borrado
    AFTER DELETE ON ventas
    FOR EACH ROW
    EXECUTE FUNCTION revertir_stock_borrado();
