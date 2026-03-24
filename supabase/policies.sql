-- ==========================================
-- POLÍTICAS DE SEGURIDAD (RLS) PARA SUPABASE
-- ==========================================

-- 1. Habilitar RLS en las tablas principales
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE ventas ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para 'productos'
-- (A) Permitir a cualquier persona VER el inventario (necesario para la terminal POS)
CREATE POLICY "Permitir lectura publica de productos" 
ON productos FOR SELECT 
USING (true);

-- (B) Permitir al Administrador CREAR, ACTUALIZAR y BORRAR productos
-- Nota: Al no tener login por ahora, permitimos todo temporalmente.
-- En un futuro, cambiar 'true' por 'auth.role() = ''authenticated'''
CREATE POLICY "Permitir administracion completa de productos" 
ON productos FOR ALL 
USING (true) WITH CHECK (true);

-- 3. Políticas para 'ventas'
-- (A) Permitir a la terminal POS CREAR nuevas ventas
CREATE POLICY "Permitir registrar ventas" 
ON ventas FOR INSERT 
WITH CHECK (true);

-- (B) Permitir al panel de Admin LEER el historial de ventas
CREATE POLICY "Permitir leer registro de ventas" 
ON ventas FOR SELECT 
USING (true);

-- ==========================================
-- RECORDATORIO DE EJECUCIÓN:
-- Copia este bloque y pégalo en el SQL Editor de Supabase y dale a "Run".
-- ==========================================
