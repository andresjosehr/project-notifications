#!/usr/bin/env node

const NotificationApp = require('./lib/app');
const logger = require('./lib/utils/logger');

async function main() {
  try {
    const app = new NotificationApp();
    
    // Obtener argumentos de línea de comandos
    const args = process.argv.slice(2);
    const command = args[0] || 'continuous';
    
    // Parsear argumentos adicionales
    const options = {};
    for (let i = 1; i < args.length; i += 2) {
      const key = args[i]?.replace('--', '');
      const value = args[i + 1];
      if (key) {
        options[key] = value === 'true' ? true : value === 'false' ? false : value;
      }
    }
    
    logger.info(`Iniciando aplicación con comando: ${command}`, options);
    
    // Ejecutar comando
    const result = await app.runCommand(command, options);
    
    if (result && typeof result === 'object') {
      logger.info('Comando completado exitosamente', result);
    } else {
      logger.info('Comando completado exitosamente');
    }
    
  } catch (error) {
    logger.errorWithStack('Error en aplicación principal', error);
    process.exit(1);
  }
}

// Ejecutar si este archivo es ejecutado directamente
if (require.main === module) {
  main();
}

module.exports = { NotificationApp, main };

