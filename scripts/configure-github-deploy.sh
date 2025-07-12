#!/bin/bash

# Script para configurar usuario github-deploy en servidor
# Ejecutar como root: chmod +x scripts/configure-github-deploy.sh && ./scripts/configure-github-deploy.sh

echo "🚀 Configurando usuario github-deploy para despliegue..."

# Dar permisos sudo sin password para comandos específicos
echo "🔐 Configurando permisos sudo..."
cat > /etc/sudoers.d/github-deploy << EOF
github-deploy ALL=(ALL) NOPASSWD: /usr/bin/systemctl restart *, /usr/bin/systemctl start *, /usr/bin/systemctl stop *
github-deploy ALL=(ALL) NOPASSWD: /usr/local/bin/pm2, /usr/bin/pm2
EOF

# Configurar ownership del directorio del proyecto
echo "📁 Configurando permisos del proyecto..."
chown -R github-deploy:github-deploy /var/www/projects/jobs
chmod -R 755 /var/www/projects/jobs

# Configurar PM2 para el usuario github-deploy
echo "⚙️ Configurando acceso PM2 para github-deploy..."
# Dar acceso al usuario github-deploy al PM2 existente
su - github-deploy -c "
cd /var/www/projects/jobs
# Verificar acceso a PM2
pm2 list
"

# Crear directorio para logs
mkdir -p /var/log/pm2
chown -R github-deploy:github-deploy /var/log/pm2

# Crear archivo .env si no existe
if [ ! -f /var/www/projects/jobs/apps/api/.env ]; then
    echo "📝 Creando archivo .env..."
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
    chown github-deploy:github-deploy /var/www/projects/jobs/apps/api/.env
fi

echo ""
echo "✅ Usuario github-deploy configurado correctamente"
echo ""
echo "🔑 Próximo paso - Generar SSH key:"
echo "   ssh-keygen -t rsa -b 4096 -C 'github-actions' -f ~/.ssh/github_deploy"
echo "   ssh-copy-id -i ~/.ssh/github_deploy.pub github-deploy@tu-servidor.com"
echo ""
echo "📋 GitHub Secrets a configurar:"
echo "   USERNAME: github-deploy"
echo "   SSH_PRIVATE_KEY: (contenido de ~/.ssh/github_deploy)"