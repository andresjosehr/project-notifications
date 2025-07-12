#!/bin/bash

# Script para preparar el servidor para despliegue automático
# Ejecutar como: chmod +x scripts/setup-server.sh && ./scripts/setup-server.sh

echo "🚀 Configurando servidor para GitHub Actions deployment..."

# Verificar PM2 está instalado
if ! command -v pm2 &> /dev/null; then
    echo "📦 Instalando PM2..."
    npm install -g pm2
fi

# Crear directorios de logs si no existen
sudo mkdir -p /var/log/pm2
sudo chown -R $USER:$USER /var/log/pm2

# Configurar PM2 para auto-inicio
pm2 startup
pm2 save

# Configurar permisos para el directorio del proyecto
sudo chown -R $USER:$USER /var/www/projects/jobs
chmod -R 755 /var/www/projects/jobs

# Crear archivo .env si no existe
if [ ! -f /var/www/projects/jobs/apps/api/.env ]; then
    echo "📝 Creando archivo .env template..."
    cat > /var/www/projects/jobs/apps/api/.env << EOF
NODE_ENV=production
PORT=3000
DB_HOST=localhost
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_password_mysql
DB_DATABASE=tu_base_datos
GROP_API_KEY=tu_groq_api_key
LOG_LEVEL=INFO
SCRAPING_HEADLESS=true
EOF
    echo "⚠️  Edita el archivo .env con tus credenciales reales"
fi

echo "✅ Servidor configurado correctamente"
echo "🔧 Próximos pasos:"
echo "   1. Editar /var/www/projects/jobs/apps/api/.env"
echo "   2. Configurar base de datos MySQL"
echo "   3. Ejecutar migraciones: npm run migrate --workspace=apps/api"
echo "   4. Probar despliegue: pm2 start ecosystem.config.js"