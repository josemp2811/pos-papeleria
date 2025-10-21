-- Base de datos para Sistema POS - Papelería Gran Avenida
-- Ejecutar este script en MySQL

CREATE DATABASE IF NOT EXISTS papeleria_gran_avenida;
USE papeleria_gran_avenida;

-- Tabla de productos
CREATE TABLE productos (
    id INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(255) NOT NULL,
    precio DECIMAL(10, 2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    categoria VARCHAR(100),
    fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla de ventas
CREATE TABLE ventas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    numero_factura VARCHAR(50) UNIQUE NOT NULL,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subtotal DECIMAL(10, 2) NOT NULL,
    iva DECIMAL(10, 2) NOT NULL,
    total DECIMAL(10, 2) NOT NULL,
    metodo_pago VARCHAR(50) NOT NULL
);

-- Tabla de detalle de ventas (items de cada venta)
CREATE TABLE detalle_ventas (
    id INT PRIMARY KEY AUTO_INCREMENT,
    venta_id INT NOT NULL,
    producto_id INT NOT NULL,
    nombre_producto VARCHAR(255) NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    FOREIGN KEY (venta_id) REFERENCES ventas(id) ON DELETE CASCADE,
    FOREIGN KEY (producto_id) REFERENCES productos(id)
);

-- Insertar productos de ejemplo
INSERT INTO productos (nombre, precio, stock, categoria) VALUES
('Cuaderno 100 hojas', 3500.00, 50, 'Papelería'),
('Bolígrafo azul', 1200.00, 100, 'Escritura'),
('Lápiz HB', 800.00, 150, 'Escritura'),
('Borrador blanco', 500.00, 80, 'Útiles'),
('Regla 30cm', 2000.00, 40, 'Útiles'),
('Tijeras', 4500.00, 30, 'Útiles'),
('Pegamento en barra', 2500.00, 60, 'Adhesivos'),
('Carpeta plástica', 1500.00, 70, 'Organización'),
('Marcador permanente', 3000.00, 45, 'Escritura'),
('Block de notas', 2800.00, 55, 'Papelería');

-- Índices para mejorar rendimiento
CREATE INDEX idx_productos_nombre ON productos(nombre);
CREATE INDEX idx_productos_categoria ON productos(categoria);
CREATE INDEX idx_ventas_fecha ON ventas(fecha);
CREATE INDEX idx_ventas_factura ON ventas(numero_factura);
CREATE INDEX idx_detalle_venta ON detalle_ventas(venta_id);
CREATE INDEX idx_detalle_producto ON detalle_ventas(producto_id);

-- Vista para reportes de productos más vendidos
CREATE VIEW productos_mas_vendidos AS
SELECT 
    p.id,
    p.nombre,
    p.categoria,
    p.precio,
    SUM(dv.cantidad) as total_vendido,
    SUM(dv.subtotal) as ingresos_totales
FROM productos p
INNER JOIN detalle_ventas dv ON p.id = dv.producto_id
GROUP BY p.id, p.nombre, p.categoria, p.precio
ORDER BY total_vendido DESC;