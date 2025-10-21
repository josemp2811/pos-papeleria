## 🚀 Instalación

### Requisitos Previos
- Node.js (versión 14 o superior)
- npm (incluido con Node.js)
- **MySQL Server** (versión 5.7 o superior)

### Paso 1: Instalar y configurar MySQL

1. Descarga MySQL desde: https://dev.mysql.com/downloads/installer/
2. Ejecuta el instalador y sigue las instrucciones
3. Recuerda la contraseña de root que configures

### Paso 2: Crear estructura de carpetas

```bash
mkdir pos-papeleria
cd pos-papeleria
```

### Paso 3: Crear archivos

Crea los siguientes archivos en la carpeta:

1. **server.js** - Código del backend
2. **package.json** - Configuración del proyecto
3. **database.sql** - Estructura de la base de datos
4. **.env** - Variables de entorno (copia de .env.example)
5. **config/database.js** - Configuración de MySQL
6. **public/index.html** - Frontend

Estructura final:
```
pos-papeleria/
├── server.js
├── package.json
├── database.sql
├── .env
├── scripts/
│   └── backup.js
├── config/
│   └── database.js
└── public/
    └── index.html
```

### Paso 4: Configurar la base de datos

1. **Accede a MySQL:**
```bash
mysql -u root -p
```

2. **Ejecuta el script de base de datos:**
```bash
# Desde la consola de MySQL:
source database.sql;

# O desde la terminal:
mysql -u root -p < database.sql
```

Esto creará:
- Base de datos `papeleria_gran_avenida`
- Tablas: `productos`, `ventas`, `detalle_ventas`
- 10 productos de ejemplo
- Índices para mejorar el rendimiento

### Paso 5: Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```bash
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_contraseña_mysql
DB_NAME=papeleria_gran_avenida
PORT=3000
```

**⚠️ IMPORTANTE:** Reemplaza `tu_contraseña_mysql` con tu contraseña real de MySQL.

### Paso 6: Instalar dependencias

```bash
npm install
```

Esto instalará:
- express: Framework web para Node.js
- cors: Para permitir peticiones desde el frontend
- **mysql2: Driver de MySQL con soporte para promesas**
- **dotenv: Para manejar variables de entorno**

### Paso 7: Iniciar el servidor

```bash
npm start
```

O para desarrollo con auto-reinicio:
```bash
npm run dev
```

El servidor se iniciará en `http://localhost:3000`

✅ Si ves el mensaje "✅ Conexión exitosa a MySQL", todo está funcionando correctamente.

## 💻 Uso del Sistema

### Acceder al Sistema
Abre tu navegador y ve a: `http://localhost:3000`

### 1. Dashboard
- Visualiza estadísticas generales
- Monitorea ventas del día
- Revisa productos más vendidos
- Identifica productos con stock bajo

### 2. Nueva Venta
1. Busca productos usando el campo de búsqueda
2. Agrega productos al carrito con el botón "➕ Agregar"
3. Ajusta cantidades con los botones + y -
4. Selecciona el método de pago
5. Presiona "💳 Procesar Venta"
6. Se generará automáticamente una factura

### 3. Gestión de Productos
- **Agregar:** Click en "➕ Nuevo Producto"
- **Editar:** Click en el botón "✏️" de cada producto
- **Eliminar:** Click en el botón "🗑️" de cada producto

### 4. Historial de Ventas
- Visualiza todas las ventas realizadas
- Click en "👁️ Ver" para ver detalles de cada factura

## 🔧 Configuración

### Cambiar Puerto
En `server.js`, línea 3:
```javascript
const PORT = 3000; // Cambia esto al puerto deseado
```

### Productos Iniciales
Los productos de ejemplo están en `server.js`. Puedes modificarlos o agregar más.


## 🗄️ Base de Datos MySQL

### Estructura de la Base de Datos

#### Tabla: productos
- `id`: INT (Primary Key, Auto Increment)
- `nombre`: VARCHAR(255) - Nombre del producto
- `precio`: DECIMAL(10,2) - Precio del producto
- `stock`: INT - Cantidad disponible
- `categoria`: VARCHAR(100) - Categoría del producto
- `fecha_creacion`: TIMESTAMP - Fecha de creación
- `fecha_actualizacion`: TIMESTAMP - Última actualización

#### Tabla: ventas
- `id`: INT (Primary Key, Auto Increment)
- `numero_factura`: VARCHAR(50) - Número de factura único
- `fecha`: TIMESTAMP - Fecha y hora de la venta
- `subtotal`: DECIMAL(10,2) - Subtotal sin IVA
- `iva`: DECIMAL(10,2) - Monto del IVA
- `total`: DECIMAL(10,2) - Total de la venta
- `metodo_pago`: VARCHAR(50) - Método de pago

#### Tabla: detalle_ventas
- `id`: INT (Primary Key, Auto Increment)
- `venta_id`: INT - Referencia a la venta
- `producto_id`: INT - Referencia al producto
- `nombre_producto`: VARCHAR(255) - Nombre del producto
- `cantidad`: INT - Cantidad vendida
- `precio_unitario`: DECIMAL(10,2) - Precio unitario
- `subtotal`: DECIMAL(10,2) - Subtotal del item


### Consultas Útiles

#### Ver todas las ventas del día
```sql
SELECT * FROM ventas WHERE DATE(fecha) = CURDATE();
```

#### Productos más vendidos
```sql
SELECT * FROM productos_mas_vendidos LIMIT 10;
```

#### Verificar stock bajo
```sql
SELECT * FROM productos WHERE stock < 20;
```

#### Reporte de ventas por período
```sql
SELECT DATE(fecha) as dia, COUNT(*) as ventas, SUM(total) as ingresos
FROM ventas 
WHERE fecha BETWEEN '2024-01-01' AND '2024-12-31'
GROUP BY DATE(fecha);
```

## 📡 API Endpoints

### Productos
- `GET /api/productos` - Listar todos los productos
- `GET /api/productos/:id` - Obtener un producto
- `POST /api/productos` - Crear producto
- `PUT /api/productos/:id` - Actualizar producto
- `DELETE /api/productos/:id` - Eliminar producto

### Ventas
- `GET /api/ventas` - Listar todas las ventas
- `GET /api/ventas/:id` - Obtener una venta
- `POST /api/ventas` - Crear venta

### Dashboard
- `GET /api/dashboard` - Estadísticas generales

### Reportes
- `GET /api/reportes/ventas?fechaInicio=&fechaFin=` - Reporte de ventas

## 🔧 Scripts Adicionales

### Script de Respaldo (backup.js)

El sistema incluye un script completo para gestionar respaldos de la base de datos.

**Crear respaldo manual:**
```bash
node scripts/backup.js backup
```

**Listar respaldos disponibles:**
```bash
node scripts/backup.js list
```

**Restaurar desde respaldo:**
```bash
node scripts/backup.js restore backup_20241019_1430.sql
```

**Respaldo automático cada 12 horas:**
```bash
node scripts/backup.js auto 12
```

### Scripts SQL de Administración

En `scripts_administracion.sql` encontrarás:
- Consultas de reportes avanzados
- Análisis de ventas por período
- Productos más vendidos
- Optimización de tablas
- Procedimientos almacenados
- Sistema de auditoría

**Ejecutar scripts de administración:**
```bash
mysql -u root -p papeleria_gran_avenida < scripts_administracion.sql
```

## 🎯 Mejores Prácticas

### Respaldos Regulares
- Configura respaldos automáticos diarios
- Mantén al menos 30 días de historial
- Guarda copias en ubicaciones diferentes

### Optimización
- Ejecuta `OPTIMIZE TABLE` mensualmente
- Revisa índices de tablas grandes
- Monitorea el tamaño de la base de datos

### Seguridad
- Cambia la contraseña de MySQL regularmente
- No compartas el archivo `.env`
- Usa conexiones SSL en producción
- Limita acceso remoto a la base de datos

### Monitoreo
- Revisa logs de MySQL regularmente
- Monitorea productos con stock bajo
- Analiza patrones de ventas semanalmente

**Desarrollado para Papelería Gran Avenida** 🏪
