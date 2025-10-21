const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuración
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD || '';
const DB_NAME = process.env.DB_NAME || 'papeleria_gran_avenida';
const DB_HOST = process.env.DB_HOST || 'localhost';

// Directorio de respaldos
const BACKUP_DIR = path.join(__dirname, '../backups');

// Crear directorio de respaldos si no existe
if (!fs.existsSync(BACKUP_DIR)) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });
  console.log('📁 Directorio de respaldos creado');
}

// Generar nombre de archivo con fecha y hora
function generarNombreBackup() {
  const fecha = new Date();
  const año = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');
  const hora = String(fecha.getHours()).padStart(2, '0');
  const minuto = String(fecha.getMinutes()).padStart(2, '0');
  
  return `backup_${año}${mes}${dia}_${hora}${minuto}.sql`;
}

// Realizar respaldo
function realizarBackup() {
  const nombreArchivo = generarNombreBackup();
  const rutaCompleta = path.join(BACKUP_DIR, nombreArchivo);
  
  // Comando mysqldump
  const comando = `mysqldump -h ${DB_HOST} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} > "${rutaCompleta}"`;
  
  console.log('🔄 Iniciando respaldo de base de datos...');
  console.log(`📦 Base de datos: ${DB_NAME}`);
  
  exec(comando, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error al realizar el respaldo:', error.message);
      return;
    }
    
    if (stderr && !stderr.includes('Warning')) {
      console.error('⚠️ Advertencia:', stderr);
    }
    
    // Verificar que el archivo se creó correctamente
    if (fs.existsSync(rutaCompleta)) {
      const stats = fs.statSync(rutaCompleta);
      const tamaño = (stats.size / 1024).toFixed(2);
      
      console.log('✅ Respaldo completado exitosamente');
      console.log(`📄 Archivo: ${nombreArchivo}`);
      console.log(`💾 Tamaño: ${tamaño} KB`);
      console.log(`📂 Ubicación: ${rutaCompleta}`);
      
      // Limpiar respaldos antiguos (mantener solo los últimos 30)
      limpiarBackupsAntiguos();
    } else {
      console.error('❌ Error: El archivo de respaldo no se creó');
    }
  });
}

// Limpiar respaldos antiguos
function limpiarBackupsAntiguos() {
  const archivos = fs.readdirSync(BACKUP_DIR)
    .filter(archivo => archivo.startsWith('backup_') && archivo.endsWith('.sql'))
    .map(archivo => ({
      nombre: archivo,
      ruta: path.join(BACKUP_DIR, archivo),
      fecha: fs.statSync(path.join(BACKUP_DIR, archivo)).mtime
    }))
    .sort((a, b) => b.fecha - a.fecha);
  
  // Mantener solo los últimos 30 respaldos
  const LIMITE_BACKUPS = 30;
  
  if (archivos.length > LIMITE_BACKUPS) {
    console.log(`\n🗑️ Limpiando respaldos antiguos (manteniendo ${LIMITE_BACKUPS} más recientes)...`);
    
    const archivosAEliminar = archivos.slice(LIMITE_BACKUPS);
    
    archivosAEliminar.forEach(archivo => {
      fs.unlinkSync(archivo.ruta);
      console.log(`   Eliminado: ${archivo.nombre}`);
    });
    
    console.log(`✅ ${archivosAEliminar.length} respaldo(s) antiguo(s) eliminado(s)`);
  }
}

// Listar respaldos disponibles
function listarBackups() {
  const archivos = fs.readdirSync(BACKUP_DIR)
    .filter(archivo => archivo.startsWith('backup_') && archivo.endsWith('.sql'))
    .map(archivo => {
      const stats = fs.statSync(path.join(BACKUP_DIR, archivo));
      return {
        nombre: archivo,
        tamaño: (stats.size / 1024).toFixed(2) + ' KB',
        fecha: stats.mtime.toLocaleString('es-CO')
      };
    })
    .sort((a, b) => b.nombre.localeCompare(a.nombre));
  
  if (archivos.length === 0) {
    console.log('📭 No hay respaldos disponibles');
    return;
  }
  
  console.log('\n📋 Respaldos disponibles:\n');
  archivos.forEach((archivo, index) => {
    console.log(`${index + 1}. ${archivo.nombre}`);
    console.log(`   Tamaño: ${archivo.tamaño} | Fecha: ${archivo.fecha}\n`);
  });
}

// Restaurar desde un respaldo
function restaurarBackup(nombreArchivo) {
  const rutaArchivo = path.join(BACKUP_DIR, nombreArchivo);
  
  if (!fs.existsSync(rutaArchivo)) {
    console.error('❌ Error: El archivo de respaldo no existe');
    return;
  }
  
  console.log('⚠️  ADVERTENCIA: Esta operación sobrescribirá la base de datos actual');
  console.log('🔄 Restaurando respaldo...');
  
  const comando = `mysql -h ${DB_HOST} -u ${DB_USER} -p${DB_PASSWORD} ${DB_NAME} < "${rutaArchivo}"`;
  
  exec(comando, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Error al restaurar:', error.message);
      return;
    }
    
    console.log('✅ Base de datos restaurada exitosamente');
    console.log(`📄 Desde: ${nombreArchivo}`);
  });
}

// Programa automático de respaldos
function programarBackupAutomatico(intervaloHoras = 24) {
  console.log(`🕐 Respaldo automático programado cada ${intervaloHoras} hora(s)`);
  
  // Realizar primer respaldo inmediatamente
  realizarBackup();
  
  // Programar respaldos periódicos
  setInterval(() => {
    console.log('\n⏰ Ejecutando respaldo automático...');
    realizarBackup();
  }, intervaloHoras * 60 * 60 * 1000);
}

// Procesar argumentos de línea de comandos
const args = process.argv.slice(2);
const comando = args[0];

switch (comando) {
  case 'backup':
    realizarBackup();
    break;
    
  case 'list':
    listarBackups();
    break;
    
  case 'restore':
    if (args[1]) {
      restaurarBackup(args[1]);
    } else {
      console.error('❌ Error: Especifica el nombre del archivo a restaurar');
      console.log('Uso: node backup.js restore <nombre_archivo>');
      listarBackups();
    }
    break;
    
  case 'auto':
    const horas = parseInt(args[1]) || 24;
    programarBackupAutomatico(horas);
    break;
    
  default:
    console.log('📦 Sistema de Respaldo - Papelería Gran Avenida\n');
    console.log('Uso:');
    console.log('  node backup.js backup           - Crear respaldo manual');
    console.log('  node backup.js list             - Listar respaldos disponibles');
    console.log('  node backup.js restore <archivo> - Restaurar desde respaldo');
    console.log('  node backup.js auto [horas]     - Respaldo automático (default: 24h)\n');
    console.log('Ejemplos:');
    console.log('  node backup.js backup');
    console.log('  node backup.js restore backup_20241019_1430.sql');
    console.log('  node backup.js auto 12');
    break;
}

module.exports = {
  realizarBackup,
  listarBackups,
  restaurarBackup,
  programarBackupAutomatico
};