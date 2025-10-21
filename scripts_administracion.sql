-- Scripts de administración para Papelería Gran Avenida
-- Ejecutar según sea necesario

USE papeleria_gran_avenida;

-- ============================================
-- CONSULTAS DE REPORTE
-- ============================================

-- Reporte de ventas del día
SELECT 
    v.numero_factura,
    v.fecha,
    v.total,
    v.metodo_pago,
    COUNT(dv.id) as total_items
FROM ventas v
LEFT JOIN detalle_ventas dv ON v.id = dv.venta_id
WHERE DATE(v.fecha) = CURDATE()
GROUP BY v.id
ORDER BY v.fecha DESC;

-- Reporte de ventas del mes actual
SELECT 
    DATE(fecha) as dia,
    COUNT(*) as numero_ventas,
    SUM(total) as total_ingresos
FROM ventas
WHERE MONTH(fecha) = MONTH(CURDATE()) 
  AND YEAR(fecha) = YEAR(CURDATE())
GROUP BY DATE(fecha)
ORDER BY dia DESC;

-- Top 10 productos más vendidos (todos los tiempos)
SELECT 
    p.nombre,
    p.categoria,
    SUM(dv.cantidad) as total_vendido,
    SUM(dv.subtotal) as ingresos_generados
FROM productos p
INNER JOIN detalle_ventas dv ON p.id = dv.producto_id
GROUP BY p.id, p.nombre, p.categoria
ORDER BY total_vendido DESC
LIMIT 10;

-- Productos con stock crítico (menos de 10 unidades)
SELECT 
    id,
    nombre,
    stock,
    precio,
    categoria,
    (stock * precio) as valor_inventario
FROM productos
WHERE stock < 10
ORDER BY stock ASC;

-- Reporte de ventas por categoría
SELECT 
    p.categoria,
    COUNT(DISTINCT dv.venta_id) as numero_ventas,
    SUM(dv.cantidad) as unidades_vendidas,
    SUM(dv.subtotal) as ingresos_totales
FROM detalle_ventas dv
INNER JOIN productos p ON dv.producto_id = p.id
GROUP BY p.categoria
ORDER BY ingresos_totales DESC;

-- Análisis de métodos de pago
SELECT 
    metodo_pago,
    COUNT(*) as numero_ventas,
    SUM(total) as total_ingresos,
    AVG(total) as ticket_promedio
FROM ventas
GROUP BY metodo_pago
ORDER BY total_ingresos DESC;

-- Ventas por hora del día (análisis de flujo)
SELECT 
    HOUR(fecha) as hora,
    COUNT(*) as numero_ventas,
    SUM(total) as ingresos
FROM ventas
WHERE DATE(fecha) = CURDATE()
GROUP BY HOUR(fecha)
ORDER BY hora;

-- ============================================
-- MANTENIMIENTO Y OPTIMIZACIÓN
-- ============================================

-- Limpiar ventas antiguas (más de 2 años)
-- ¡CUIDADO! Esto eliminará datos permanentemente
-- DELETE FROM ventas WHERE fecha < DATE_SUB(NOW(), INTERVAL 2 YEAR);

-- Optimizar tablas
OPTIMIZE TABLE productos;
OPTIMIZE TABLE ventas;
OPTIMIZE TABLE detalle_ventas;

-- Verificar integridad de datos
SELECT 
    'Productos sin stock' as alerta,
    COUNT(*) as cantidad
FROM productos 
WHERE stock = 0
UNION ALL
SELECT 
    'Productos con precio 0' as alerta,
    COUNT(*) as cantidad
FROM productos 
WHERE precio = 0
UNION ALL
SELECT 
    'Ventas sin items' as alerta,
    COUNT(*) as cantidad
FROM ventas v
LEFT JOIN detalle_ventas dv ON v.id = dv.venta_id
WHERE dv.id IS NULL;

-- ============================================
-- RESPALDO Y RECUPERACIÓN
-- ============================================

-- Ver tamaño de las tablas
SELECT 
    table_name AS 'Tabla',
    ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Tamaño (MB)'
FROM information_schema.TABLES
WHERE table_schema = 'papeleria_gran_avenida'
ORDER BY (data_length + index_length) DESC;

-- ============================================
-- AJUSTES DE INVENTARIO
-- ============================================

-- Actualizar stock masivamente (ejemplo: agregar 10 unidades a todos)
-- UPDATE productos SET stock = stock + 10 WHERE categoria = 'Papelería';

-- Ajustar precios por categoría (ejemplo: incremento del 10%)
-- UPDATE productos SET precio = precio * 1.10 WHERE categoria = 'Escritura';

-- Marcar productos descontinuados (agregar columna primero)
-- ALTER TABLE productos ADD COLUMN activo BOOLEAN DEFAULT TRUE;
-- UPDATE productos SET activo = FALSE WHERE id IN (1, 2, 3);

-- ============================================
-- REPORTES AVANZADOS
-- ============================================

-- Comparativa mes actual vs mes anterior
SELECT 
    'Mes Actual' as periodo,
    COUNT(*) as ventas,
    SUM(total) as ingresos
FROM ventas
WHERE MONTH(fecha) = MONTH(CURDATE()) 
  AND YEAR(fecha) = YEAR(CURDATE())
UNION ALL
SELECT 
    'Mes Anterior' as periodo,
    COUNT(*) as ventas,
    SUM(total) as ingresos
FROM ventas
WHERE MONTH(fecha) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))
  AND YEAR(fecha) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH));

-- Productos que no se han vendido nunca
SELECT 
    p.id,
    p.nombre,
    p.categoria,
    p.stock,
    p.precio
FROM productos p
LEFT JOIN detalle_ventas dv ON p.id = dv.producto_id
WHERE dv.id IS NULL
ORDER BY p.fecha_creacion DESC;

-- Análisis ABC de productos (Pareto)
SELECT 
    p.nombre,
    SUM(dv.subtotal) as ingresos,
    SUM(SUM(dv.subtotal)) OVER (ORDER BY SUM(dv.subtotal) DESC) / 
    SUM(SUM(dv.subtotal)) OVER () * 100 as porcentaje_acumulado
FROM detalle_ventas dv
INNER JOIN productos p ON dv.producto_id = p.id
GROUP BY p.id, p.nombre
ORDER BY ingresos DESC;

-- ============================================
-- PROCEDIMIENTOS ALMACENADOS ÚTILES
-- ============================================

-- Procedimiento para obtener reporte de ventas por rango de fechas
DELIMITER //
CREATE PROCEDURE IF NOT EXISTS ReporteVentasPorFecha(
    IN fecha_inicio DATE,
    IN fecha_fin DATE
)
BEGIN
    SELECT 
        v.numero_factura,
        v.fecha,
        v.total,
        v.metodo_pago,
        GROUP_CONCAT(
            CONCAT(dv.cantidad, 'x ', dv.nombre_producto) 
            SEPARATOR ', '
        ) as productos
    FROM ventas v
    LEFT JOIN detalle_ventas dv ON v.id = dv.venta_id
    WHERE DATE(v.fecha) BETWEEN fecha_inicio AND fecha_fin
    GROUP BY v.id
    ORDER BY v.fecha DESC;
    
    SELECT 
        COUNT(*) as total_ventas,
        SUM(total) as total_ingresos,
        AVG(total) as ticket_promedio,
        MIN(total) as venta_minima,
        MAX(total) as venta_maxima
    FROM ventas
    WHERE DATE(fecha) BETWEEN fecha_inicio AND fecha_fin;
END //
DELIMITER ;

-- Usar el procedimiento:
-- CALL ReporteVentasPorFecha('2024-01-01', '2024-12-31');

-- ============================================
-- EVENTOS AUTOMÁTICOS
-- ============================================

-- Evento para limpiar ventas muy antiguas automáticamente (cada mes)
-- Descomentar si deseas activar
/*
DELIMITER //
CREATE EVENT IF NOT EXISTS limpiar_ventas_antiguas
ON SCHEDULE EVERY 1 MONTH
STARTS CURRENT_TIMESTAMP
DO
BEGIN
    DELETE FROM ventas 
    WHERE fecha < DATE_SUB(NOW(), INTERVAL 3 YEAR);
END //
DELIMITER ;
*/

-- Ver eventos activos
-- SHOW EVENTS;

-- ============================================
-- AUDITORÍA
-- ============================================

-- Crear tabla de auditoría para cambios en productos
CREATE TABLE IF NOT EXISTS auditoria_productos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    producto_id INT,
    accion VARCHAR(50),
    campo_modificado VARCHAR(100),
    valor_anterior TEXT,
    valor_nuevo TEXT,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_producto (producto_id),
    INDEX idx_fecha (fecha)
);

-- Trigger para auditar cambios en precio
DELIMITER //
CREATE TRIGGER IF NOT EXISTS after_producto_update
AFTER UPDATE ON productos
FOR EACH ROW
BEGIN
    IF OLD.precio != NEW.precio THEN
        INSERT INTO auditoria_productos 
        (producto_id, accion, campo_modificado, valor_anterior, valor_nuevo)
        VALUES 
        (NEW.id, 'UPDATE', 'precio', OLD.precio, NEW.precio);
    END IF;
    
    IF OLD.stock != NEW.stock THEN
        INSERT INTO auditoria_productos 
        (producto_id, accion, campo_modificado, valor_anterior, valor_nuevo)
        VALUES 
        (NEW.id, 'UPDATE', 'stock', OLD.stock, NEW.stock);
    END IF;
END //
DELIMITER ;

-- Ver auditoría de un producto específico
-- SELECT * FROM auditoria_productos WHERE producto_id = 1 ORDER BY fecha DESC;