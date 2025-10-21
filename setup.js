const readline = require('readline');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Colores para la consola
const colores = {
  reset: '\x1b[0m',
  verde: '\x1b[32m',
  rojo: '\x1b[31m',
  amarillo: '\x1b[33m',
  azul: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(mensaje, color = 'reset') {
  console.log(`${colores[color]}${mensaje}${colores.reset}`);
}

function pregunta(texto) {
  return new Promise((resolve) => {
    rl.question(`${colores.azul}${texto}${colores.reset}`, (respuesta) => {
      resolve(respuesta);
    });
  });
}

async function ejecutarComando(comando, descripcion) {
  return new Promise((resolve, reject) => {
    log(`\n⏳ ${descripcion}...`, 'amarillo');
    exec(comando, (error, stdout, stderr) => {
      if (error) {
        log(`✗ Error: ${error.message}`, 'rojo');
        reject(error);
        return;
      }
      if (stderr && !stderr.includes('warning') && !stderr.includes('Warning')) {
        log(`⚠️  ${stderr}`, 'amarillo');
      }
      log(`✓ ${descripcion} completado`, 'verde');
      resolve(stdout);
    });
  });
}

function crearDirectorio(ruta, nombre) {
  if (!fs.existsSync(ruta)) {
    fs.mkdirSync(ruta, { recursive: true });
    log(`✓ Directorio ${nombre} creado`, 'verde');
  } else {
    log(`ℹ  Directorio ${nombre} ya existe`, 'amarillo');
  }
}

async function verificarMySQL() {
  try {
    await ejecutarComando('mysql --version', 'Verificando instalación de MySQL');
    return true;
  } catch (error) {
    log('\n❌ MySQL no está instalado o no está en el PATH', 'rojo');
    log('Por favor instala MySQL antes de continuar:', 'amarillo');
    log('- Windows: https://dev.mysql.com/downloads/installer/', 'azul');
    log('- Linux: sudo apt install mysql-server', 'azul');
    log('- macOS: brew install mysql', 'azul');
    return false;
  }
}

async function verificarNode() {
  try {
    const version = await ejecutarComando('node --version', 'Verificando instalación de Node.js');
    log(`  Versión: ${version.trim()}`, 'azul');
    return true;
  } catch (error) {
    log('\n❌ Node.js no está instalado', 'rojo');
    log('Descarga Node.js desde: https://nodejs.org/', 'amarillo');
    return false;
  }
}

async function crearArchivoEnv(config) {
  const contenido = `# Configuración de MySQL
DB_HOST=${config.host}
DB_USER=${config.user}
DB_PASSWORD=${config.password}
DB_NAME=${config.database}

# Puerto del servidor
PORT=${config.port}
`;

  fs.writeFileSync('.env', contenido);
  log('✓ Archivo .env creado', 'verde');
}

async function crearBaseDatos(config) {
  try {
    log('\n📊 Creando base de datos...', 'azul');
    
    // Comando para ejecutar el script SQL
    const comando = `mysql -h ${config.host} -u ${config.user} -p${config.password} < database.sql`;
    
    await ejecutarComando(comando, 'Configurando base de datos');
    
    log('\n✓ Base de datos creada exitosamente', 'verde');
    log('  - Tablas: productos, ventas, detalle_ventas', 'azul');
    log('  - 10 productos de ejemplo agregados', 'azul');
    return true;
  } catch (error) {
    log('\n❌ Error al crear la base de datos', 'rojo');
    log('Puedes crearla manualmente ejecutando:', 'amarillo');
    log(`  mysql -u ${config.user} -p < database.sql`, 'azul');
    return false;
  }
}

async function instalarDependencias() {
  try {
    await ejecutarComando('npm install', 'Instalando dependencias de Node.js');
    log('\n✓ Dependencias instaladas:', 'verde');
    log('  - express', 'azul');
    log('  - cors', 'azul');
    log('  - mysql2', 'azul');
    log('  - dotenv', 'azul');
    return true;
  } catch (error) {
    log('\n❌ Error al instalar dependencias', 'rojo');
    log('Intenta ejecutar manualmente: npm install', 'amarillo');
    return false;
  }
}

async function setup() {
  console.clear();
  log('╔═══════════════════════════════════════════════════╗', 'verde');
  log('║   🏪 INSTALADOR - PAPELERÍA GRAN AVENIDA         ║', 'verde');
  log('║   Sistema POS con MySQL                          ║', 'verde');
  log('╚═══════════════════════════════════════════════════╝', 'verde');
  
  log('\n👋 ¡Bienvenido! Este asistente te ayudará a configurar el sistema.\n', 'azul');

  // Verificar requisitos
  log('═══ Verificando requisitos ═══\n', 'bold');
  
  const nodeOk = await verificarNode();
  if (!nodeOk) {
    process.exit(1);
  }

  const mysqlOk = await verificarMySQL();
  if (!mysqlOk) {
    process.exit(1);
  }

  log('\n✓ Todos los requisitos están instalados\n', 'verde');

  // Verificar que existen los archivos necesarios
  const archivosRequeridos = ['database.sql', 'server.js', 'package.json'];
  const archivosFaltantes = archivosRequeridos.filter(archivo => !fs.existsSync(archivo));
  
  if (archivosFaltantes.length > 0) {
    log('❌ Faltan archivos requeridos:', 'rojo');
    archivosFaltantes.forEach(archivo => log(`  - ${archivo}`, 'rojo'));
    log('\nAsegúrate de tener todos los archivos del proyecto.', 'amarillo');
    process.exit(1);
  }

  // Configuración de MySQL
  log('═══ Configuración de MySQL ═══\n', 'bold');
  
  const config = {
    host: await pregunta('Host de MySQL (default: localhost): ') || 'localhost',
    user: await pregunta('Usuario de MySQL (default: root): ') || 'root',
    password: await pregunta('Contraseña de MySQL: '),
    database: await pregunta('Nombre de la base de datos (default: papeleria_gran_avenida): ') || 'papeleria_gran_avenida',
    port: await pregunta('Puerto del servidor web (default: 3000): ') || '3000'
  };

  log('\n═══ Creando estructura del proyecto ═══', 'bold');
  
  // Crear directorios necesarios
  crearDirectorio('./public', 'public');
  crearDirectorio('./config', 'config');
  crearDirectorio('./scripts', 'scripts');
  crearDirectorio('./backups', 'backups');

  // Crear archivo .env
  log('\n⚙️  Creando archivo de configuración...', 'amarillo');
  await crearArchivoEnv(config);

  // Instalar dependencias
  log('\n═══ Instalando dependencias ═══', 'bold');
  const instalacionOk = await instalarDependencias();
  
  if (!instalacionOk) {
    log('\n⚠️  Continúa con la configuración de la base de datos...', 'amarillo');
  }

  // Crear base de datos
  log('\n═══ Configurando base de datos ═══', 'bold');
  const bdCreada = await crearBaseDatos(config);

  // Crear .gitignore
  log('\n📝 Creando .gitignore...', 'amarillo');
  const gitignoreContent = `# Variables de entorno
.env

# Dependencias
node_modules/

# Respaldos
backups/*.sql

# Logs
*.log
npm-debug.log*

# Sistema operativo
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo
`;
  fs.writeFileSync('.gitignore', gitignoreContent);
  log('✓ Archivo .gitignore creado', 'verde');

  // Resumen final
  log('\n╔═══════════════════════════════════════════════════╗', 'verde');
  log('║         ✅ INSTALACIÓN COMPLETADA                ║', 'verde');
  log('╚═══════════════════════════════════════════════════╝', 'verde');

  log('\n📋 Resumen de configuración:', 'bold');
  log(`  ✓ Base de datos: ${config.database}`, 'azul');
  log(`  ✓ Host MySQL: ${config.host}`, 'azul');
  log(`  ✓ Usuario MySQL: ${config.user}`, 'azul');
  log(`  ✓ Puerto servidor: ${config.port}`, 'azul');

  log('\n🚀 Para iniciar el servidor:', 'bold');
  log('  npm start', 'verde');
  log('\n  o para desarrollo:', 'amarillo');
  log('  npm run dev', 'verde');

  log('\n📊 Accede al sistema en:', 'bold');
  log(`  http://localhost:${config.port}`, 'verde');

  log('\n💾 Para crear respaldos:', 'bold');
  log('  node scripts/backup.js backup', 'verde');

  log('\n📖 Consulta README.md para más información', 'azul');
  
  log('\n¡Gracias por usar el sistema POS - Papelería Gran Avenida! 🏪\n', 'verde');

  rl.close();
}

// Ejecutar setup
setup().catch(error => {
  log(`\n❌ Error durante la instalación: ${error.message}`, 'rojo');
  rl.close();
  process.exit(1);
});