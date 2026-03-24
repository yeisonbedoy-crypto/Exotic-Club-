-- Habilitar extensión para generar UUIDs si no está activa
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabla de Productos
CREATE TABLE productos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('flor', 'resina', 'bebida', 'otro')),
    -- 'peso' (permite decimales) o 'unidad' (solo enteros)
    categoria TEXT NOT NULL CHECK (categoria IN ('peso', 'unidad')), 
    stock NUMERIC(10, 2) NOT NULL DEFAULT 0,
    precio NUMERIC(10, 2) NOT NULL DEFAULT 0,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. Tabla de Ventas
CREATE TABLE ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    producto_id UUID NOT NULL REFERENCES productos(id) ON DELETE RESTRICT,
    cantidad NUMERIC(10, 2) NOT NULL,
    total NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Índices recomendados para la vista del "Registro de Ventas" y búsquedas
CREATE INDEX idx_productos_activo ON productos(activo, tipo);
CREATE INDEX idx_ventas_producto_id ON ventas(producto_id);
CREATE INDEX idx_ventas_fecha ON ventas(created_at DESC);

-- 3. Función y Trigger para automatizar el descuento de stock
CREATE OR REPLACE FUNCTION actualizar_stock_venta()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE productos
    SET stock = stock - NEW.cantidad,
        updated_at = timezone('utc'::text, now())
    WHERE id = NEW.producto_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_restar_stock
AFTER INSERT ON ventas
FOR EACH ROW
EXECUTE PROCEDURE actualizar_stock_venta();

-- 4. Vista de Registro de Ventas (Facilitará leer el historial luego)
CREATE VIEW vista_registro_ventas AS
SELECT 
    v.id AS venta_id,
    p.nombre AS producto_nombre,
    p.tipo AS producto_tipo,
    v.cantidad,
    v.total AS total_euros,
    v.created_at AS fecha_hora
FROM ventas v
JOIN productos p ON v.producto_id = p.id
ORDER BY v.created_at DESC;
