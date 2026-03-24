-- ⚠️ SCRIPT PARA LIMPIAR TODA LA BASE DE DATOS ⚠️
-- Ejecuta este código en el SQL Editor de Supabase cuando quieras 
-- borrar absolutamente todas las ventas y el inventario.

-- 1. Primero borramos el historial de ventas (depende de los productos)
DELETE FROM ventas;

-- 2. Ahora borramos todos los productos del inventario
DELETE FROM productos;

-- Opcional: Reiniciar el contador automático de los IDs (solo si son SERIAL o IDENTITY)
-- Si tus IDs son gen_random_uuid() (es decir, letras y números largos), 
-- estas dos líneas de alter sequence no harán falta y darán un aviso inofensivo, puedes ignorarlo.
ALTER SEQUENCE IF EXISTS ventas_id_seq RESTART WITH 1;
ALTER SEQUENCE IF EXISTS productos_id_seq RESTART WITH 1;

-- ¡Listo! La base de datos está totalmente limpia.
