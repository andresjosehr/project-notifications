#!/usr/bin/env node

const { startServer } = require('./lib/server');

const port = process.env.PORT || 3000;

console.log(`🚀 Iniciando servidor en puerto ${port}...`);
console.log(`📱 Panel de control: http://localhost:${port}/control`);
console.log(`👥 Usuarios: http://localhost:${port}/users`);
console.log(`📋 Proyectos: http://localhost:${port}/projects`);

startServer(port).catch(error => {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
}); 