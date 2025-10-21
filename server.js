const express = require('express');
const cors = require('cors');
require('dotenv').config();
const db = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Contador para facturas (se puede mejorar con secuencias en BD)
let facturaCounter = 1000;

// Inicializar contador de facturas desde la BD
async function inicializarFacturaCounter() {
  try {
    const result = await db.query('SELECT numero_factura FROM ventas ORDER BY id DESC LIMIT 1');
    if (result.length > 0) {
      const ultimaFactura = result[0].numero_factura;
      const numero = parseInt(ultimaFactura.split('-')[1]);
      facturaCounter = numero + 1;
    }
  } catch (error) {
    console.error('Error al inicializar contador de facturas:', error);
  }
}

// ============ ENDPOINTS PRODUCTOS ============

// Obtener todos los productos
app.get('/api/productos', async (req, res) => {
  try {
    const productos = await db.query('SELECT * FROM productos ORDER BY id DESC');
    res.json(productos);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
});

// Obtener un producto por ID
app.get('/api/productos/:id', async (req, res) => {
  try {
    const productos = await db.query('SELECT * FROM productos WHERE id = ?', [req.params.id]);
    if (productos.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }
    res.json(productos[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
});

// Crear nuevo producto
app.post('/api/productos', async (req, res) => {
  try {
    const { nombre, precio, stock, categoria } = req.body;
    
    if (!nombre || !precio || stock === undefined) {
      return res.status(400).json({ error: 'Datos incompletos' });
    }

    const result = await db.query(
      'INSERT INTO productos (nombre, precio, stock, categoria) VALUES (?, ?, ?, ?)',
      [nombre, parseFloat(precio), parseInt(stock), categoria || 'General']
    );

    const nuevoProducto = {
      id: result.insertId,
      nombre,
      precio: parseFloat(precio),
      stock: parseInt(stock),
      categoria: categoria || 'General'
    };

    res.status(201).json(nuevoProducto);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
});

// Actualizar producto
app.put('/api/productos/:id', async (req, res) => {
  try {
    const { nombre, precio, stock, categoria } = req.body;
    const id = parseInt(req.params.id);

    // Verificar que el producto existe
    const productos = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
    if (productos.length === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await db.query(
      'UPDATE productos SET nombre = ?, precio = ?, stock = ?, categoria = ? WHERE id = ?',
      [
        nombre || productos[0].nombre,
        precio !== undefined ? parseFloat(precio) : productos[0].precio,
        stock !== undefined ? parseInt(stock) : productos[0].stock,
        categoria || productos[0].categoria,
        id
      ]
    );

    const productosActualizados = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
    res.json(productosActualizados[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
});

// Eliminar producto
app.delete('/api/productos/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    const result = await db.query('DELETE FROM productos WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
});

// ============ ENDPOINTS VENTAS ============

// Crear nueva venta
app.post('/api/ventas', async (req, res) => {
  const connection = await db.pool.getConnection();
  
  try {
    const { items, total, metodoPago } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'La venta debe tener al menos un producto' });
    }

    // Iniciar transacción
    await connection.beginTransaction();

    // Verificar stock y obtener información actualizada de productos
    for (let item of items) {
      const [productos] = await connection.execute(
        'SELECT id, nombre, precio, stock FROM productos WHERE id = ?',
        [item.id]
      );
      
      if (productos.length === 0) {
        await connection.rollback();
        return res.status(404).json({ error: `Producto ${item.nombre} no encontrado` });
      }

      const producto = productos[0];
      
      if (producto.stock < item.cantidad) {
        await connection.rollback();
        return res.status(400).json({ 
          error: `Stock insuficiente para ${producto.nombre}. Disponible: ${producto.stock}` 
        });
      }

      // Actualizar stock
      await connection.execute(
        'UPDATE productos SET stock = stock - ? WHERE id = ?',
        [item.cantidad, item.id]
      );
    }

    // Crear venta
    const numeroFactura = `FAC-${facturaCounter++}`;
    const subtotal = total / 1.19;
    const iva = total - subtotal;

    const [resultVenta] = await connection.execute(
      'INSERT INTO ventas (numero_factura, subtotal, iva, total, metodo_pago) VALUES (?, ?, ?, ?, ?)',
      [numeroFactura, subtotal, iva, parseFloat(total), metodoPago || 'Efectivo']
    );

    const ventaId = resultVenta.insertId;

    // Insertar items de la venta
    for (let item of items) {
      await connection.execute(
        'INSERT INTO detalle_ventas (venta_id, producto_id, nombre_producto, cantidad, precio_unitario, subtotal) VALUES (?, ?, ?, ?, ?, ?)',
        [ventaId, item.id, item.nombre, item.cantidad, item.precio, item.precio * item.cantidad]
      );
    }

    // Confirmar transacción
    await connection.commit();

    const nuevaVenta = {
      id: ventaId,
      numeroFactura,
      fecha: new Date().toISOString(),
      items,
      subtotal,
      iva,
      total: parseFloat(total),
      metodoPago: metodoPago || 'Efectivo'
    };

    res.status(201).json(nuevaVenta);
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ error: 'Error al procesar la venta' });
  } finally {
    connection.release();
  }
});

// Obtener todas las ventas
app.get('/api/ventas', async (req, res) => {
  try {
    const ventas = await db.query(`
      SELECT 
        v.*,
        COUNT(dv.id) as total_items
      FROM ventas v
      LEFT JOIN detalle_ventas dv ON v.id = dv.venta_id
      GROUP BY v.id
      ORDER BY v.fecha DESC
    `);

    // Obtener items de cada venta y formatear respuesta
    const ventasFormateadas = [];
    for (let venta of ventas) {
      const items = await db.query(
        'SELECT * FROM detalle_ventas WHERE venta_id = ?',
        [venta.id]
      );
      
      ventasFormateadas.push({
        id: venta.id,
        numeroFactura: venta.numero_factura,
        numero_factura: venta.numero_factura,
        fecha: venta.fecha,
        subtotal: parseFloat(venta.subtotal),
        iva: parseFloat(venta.iva),
        total: parseFloat(venta.total),
        metodoPago: venta.metodo_pago,
        metodo_pago: venta.metodo_pago,
        total_items: venta.total_items,
        items: items.map(item => ({
          id: item.id,
          nombre: item.nombre_producto,
          nombre_producto: item.nombre_producto,
          cantidad: item.cantidad,
          precio: parseFloat(item.precio_unitario),
          precio_unitario: parseFloat(item.precio_unitario),
          subtotal: parseFloat(item.subtotal)
        }))
      });
    }

    res.json(ventasFormateadas);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener ventas' });
  }
});

// Obtener venta por ID
app.get('/api/ventas/:id', async (req, res) => {
  try {
    const ventas = await db.query('SELECT * FROM ventas WHERE id = ?', [req.params.id]);
    
    if (ventas.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    const venta = ventas[0];
    
    // Obtener items de la venta
    const items = await db.query(
      'SELECT * FROM detalle_ventas WHERE venta_id = ?',
      [venta.id]
    );
    
    venta.items = items;
    res.json(venta);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener venta' });
  }
});

// ============ ENDPOINTS REPORTES ============

// Dashboard con estadísticas
app.get('/api/dashboard', async (req, res) => {
  try {
    // Total de ventas
    const [totalVentasResult] = await db.query(
      'SELECT COALESCE(SUM(total), 0) as total FROM ventas'
    );
    const totalVentas = totalVentasResult.total;

    // Número de ventas
    const [numeroVentasResult] = await db.query(
      'SELECT COUNT(*) as count FROM ventas'
    );
    const numeroVentas = numeroVentasResult.count;

    // Ventas de hoy
    const [ventasHoyResult] = await db.query(
      'SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total FROM ventas WHERE DATE(fecha) = CURDATE()'
    );
    const ventasHoy = ventasHoyResult.count;
    const totalVentasHoy = ventasHoyResult.total;

    // Promedio de venta
    const promedioVenta = numeroVentas > 0 ? totalVentas / numeroVentas : 0;

    // Top 5 productos más vendidos
    const topProductos = await db.query(`
      SELECT 
        p.id,
        p.nombre,
        p.categoria,
        p.precio,
        SUM(dv.cantidad) as cantidadTotal
      FROM productos p
      INNER JOIN detalle_ventas dv ON p.id = dv.producto_id
      GROUP BY p.id, p.nombre, p.categoria, p.precio
      ORDER BY cantidadTotal DESC
      LIMIT 5
    `);

    // Productos con stock bajo
    const stockBajo = await db.query(
      'SELECT * FROM productos WHERE stock < 20 ORDER BY stock ASC'
    );

    // Total de productos
    const [totalProductosResult] = await db.query(
      'SELECT COUNT(*) as count FROM productos'
    );
    const totalProductos = totalProductosResult.count;

    res.json({
      totalVentas,
      numeroVentas,
      ventasHoy,
      totalVentasHoy,
      promedioVenta,
      topProductos,
      stockBajo,
      totalProductos
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
});

// Reporte de ventas por fecha
app.get('/api/reportes/ventas', async (req, res) => {
  try {
    const { fechaInicio, fechaFin } = req.query;
    
    let query = 'SELECT * FROM ventas WHERE 1=1';
    let params = [];

    if (fechaInicio) {
      query += ' AND fecha >= ?';
      params.push(fechaInicio);
    }
    if (fechaFin) {
      query += ' AND fecha <= ?';
      params.push(fechaFin);
    }

    query += ' ORDER BY fecha DESC';

    const ventas = await db.query(query, params);

    // Obtener items de cada venta
    for (let venta of ventas) {
      const items = await db.query(
        'SELECT * FROM detalle_ventas WHERE venta_id = ?',
        [venta.id]
      );
      venta.items = items;
    }

    const total = ventas.reduce((sum, v) => sum + parseFloat(v.total), 0);

    res.json({
      ventas,
      totalVentas: ventas.length,
      montoTotal: total
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al generar reporte' });
  }
});

// ============ INICIO DEL SERVIDOR ============

async function iniciarServidor() {
  try {
    // Verificar conexión a la base de datos
    const conexionExitosa = await db.testConnection();
    
    if (!conexionExitosa) {
      console.error('❌ No se pudo conectar a la base de datos. Verifica tu configuración.');
      process.exit(1);
    }

    // Inicializar contador de facturas
    await inicializarFacturaCounter();

    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
      console.log(`📊 API disponible en http://localhost:${PORT}/api`);
      console.log(`💾 Base de datos: ${process.env.DB_NAME || 'papeleria_gran_avenida'}`);
    });
  } catch (error) {
    console.error('❌ Error al iniciar el servidor:', error);
    process.exit(1);
  }
}

iniciarServidor();