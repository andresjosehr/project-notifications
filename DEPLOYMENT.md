# Guía de Despliegue

## Configuración del Servidor

### 1. Permisos de Usuario

El usuario SSH debe tener permisos de sudo configurados. Agregar al archivo `/etc/sudoers`:

```bash
# Agregar esta línea al archivo sudoers
deploy_user ALL=(ALL) NOPASSWD: ALL
```

### 2. Estructura de Directorios

Asegurar que existe el directorio del proyecto:

```bash
sudo mkdir -p /var/www/projects/jobs
sudo chown -R deploy_user:deploy_user /var/www/projects/jobs
sudo chmod -R 755 /var/www/projects/jobs
```

### 3. Instalación de Dependencias

#### Node.js y npm
```bash
# Instalar Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version
npm --version
```

#### PHP 8.2 y Composer
```bash
# Instalar PHP 8.2
sudo apt update
sudo apt install -y php8.2 php8.2-cli php8.2-fpm php8.2-mysql php8.2-xml php8.2-mbstring php8.2-curl php8.2-zip

# Instalar Composer
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer

# Verificar instalación
php --version
composer --version
```

#### Git
```bash
sudo apt install -y git
```

### 4. Configuración de Laravel

#### Permisos de Storage y Cache
```bash
cd /var/www/projects/jobs/apps/api
sudo chmod -R 775 storage
sudo chmod -R 775 bootstrap/cache
sudo chown -R www-data:www-data storage
sudo chown -R www-data:www-data bootstrap/cache
```

#### Archivo .env
Crear el archivo `.env` en `/var/www/projects/jobs/apps/api/` con las variables de entorno necesarias:

```env
APP_ENV=production
APP_DEBUG=false
APP_URL=https://tu-dominio.com

DB_CONNECTION=mysql
DB_HOST=tu-host-db
DB_PORT=3306
DB_DATABASE=tu-database
DB_USERNAME=tu-username
DB_PASSWORD=tu-password

CACHE_DRIVER=file
SESSION_DRIVER=file
QUEUE_CONNECTION=database
```

### 5. Configuración de Nginx (Opcional)

Si usas Nginx, configurar el virtual host:

```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    root /var/www/projects/jobs/apps/frontend/dist/fuse/browser;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

### 6. Troubleshooting

#### Error: EACCES permission denied
```bash
# Cambiar permisos del directorio
sudo chown -R $USER:$USER /var/www/projects/jobs
sudo chmod -R 755 /var/www/projects/jobs
```

#### Error: Could not delete vendor files
```bash
# Limpiar vendor y reinstalar
cd /var/www/projects/jobs/apps/api
sudo rm -rf vendor
composer install --no-dev --optimize-autoloader
```

#### Error: Laravel log permissions
```bash
# Configurar permisos de logs
sudo chmod -R 775 /var/www/projects/jobs/apps/api/storage
sudo chown -R www-data:www-data /var/www/projects/jobs/apps/api/storage
```

### 7. Variables de Entorno en GitHub Secrets

Configurar los siguientes secrets en tu repositorio de GitHub:

- `HOST`: IP o dominio del servidor
- `USERNAME`: Usuario SSH
- `SSH_PRIVATE_KEY`: Clave privada SSH
- `PORT`: Puerto SSH (opcional, por defecto 22)
- `DB_HOST`: Host de la base de datos
- `DB_USER`: Usuario de la base de datos
- `DB_PASSWORD`: Contraseña de la base de datos
- `DB_DATABASE`: Nombre de la base de datos

### 8. Verificación del Despliegue

Después del despliegue, verificar:

1. **Frontend**: `https://tu-dominio.com`
2. **API**: `https://tu-dominio.com/api`
3. **Logs**: `/var/www/projects/jobs/apps/api/storage/logs/laravel.log`
4. **Cache**: `/var/www/projects/jobs/apps/api/bootstrap/cache/`

### 9. Comandos Útiles

```bash
# Verificar estado del servidor
sudo systemctl status nginx
sudo systemctl status php8.2-fpm

# Ver logs de Laravel
tail -f /var/www/projects/jobs/apps/api/storage/logs/laravel.log

# Limpiar cache manualmente
cd /var/www/projects/jobs/apps/api
php artisan cache:clear
php artisan config:clear
php artisan route:clear
php artisan view:clear

# Reiniciar servicios
sudo systemctl restart nginx
sudo systemctl restart php8.2-fpm
``` 