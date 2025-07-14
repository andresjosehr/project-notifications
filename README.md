# Sistema de Notificaciones Freelance - Monorepo

Este proyecto es un **monorepo** que contiene el backend (Laravel + Node.js CLI) y el frontend (Angular) del Sistema de Notificaciones Freelance. La estructura está organizada siguiendo las mejores prácticas para facilitar el desarrollo, mantenimiento y escalabilidad.

## 🏗️ Estructura del Monorepo

```
freelance-notifications-monorepo/
├── apps/
│   ├── api/                 # Backend Laravel + Node.js CLI
│   │   ├── app/             # Código principal de Laravel
│   │   │   ├── Http/        # Controladores y middleware
│   │   │   ├── Models/      # Modelos Eloquent
│   │   │   ├── Services/    # Servicios de negocio
│   │   │   └── Console/     # Comandos Artisan
│   │   ├── routes/          # Definición de rutas
│   │   │   ├── api.php      # Rutas de API
│   │   │   └── web.php      # Rutas web
│   │   ├── database/        # Migraciones y seeders
│   │   ├── config/          # Configuración de Laravel
│   │   ├── resources/       # Vistas y assets
│   │   ├── storage/         # Logs y archivos
│   │   ├── tests/           # Tests de Laravel
│   │   ├── cli.js           # CLI Node.js para scraping
│   │   ├── artisan          # Comando Artisan
│   │   ├── composer.json    # Dependencias PHP
│   │   └── package.json     # Dependencias Node.js CLI
│   │
│   └── frontend/            # Frontend Angular
│       ├── src/             # Código fuente de Angular
│       ├── angular.json     # Configuración de Angular
│       ├── tailwind.config.js # Configuración de Tailwind CSS
│       └── package.json     # Dependencias del frontend
│
├── package.json             # Configuración del monorepo
├── package-lock.json        # Lock file del monorepo
└── README.md               # Este archivo
```

## 🚀 Comandos Disponibles

### Comandos del Monorepo (Raíz)

```bash
# Instalar todas las dependencias
npm install

# Iniciar API y Frontend simultáneamente
npm start

# Iniciar solo la API (Laravel)
npm run start:api

# Iniciar solo el Frontend
npm run start:frontend

# Construir el Frontend para producción
npm run build:frontend

# Ejecutar migraciones de base de datos
npm run migrate
```

### Comandos de la API (`apps/api/`)

#### Laravel
```bash
# Navegar al directorio de la API
cd apps/api

# Instalar dependencias PHP
composer install

# Configurar entorno
cp .env.example .env
php artisan key:generate

# Desarrollo con queue, logs y vite
composer run dev

# Solo el servidor Laravel
php artisan serve

# Gestión de migraciones
php artisan migrate              # Ejecutar migraciones pendientes
php artisan migrate:rollback    # Revertir última migración
php artisan migrate:make        # Crear nueva migración
php artisan migrate:status      # Ver estado de migraciones

# Tests
composer run test
php artisan test

# Optimización para producción
php artisan config:cache
php artisan route:cache
php artisan view:cache
```

#### Node.js CLI (Scraping)
```bash
# Instalar dependencias Node.js
npm install

# Scraping de proyectos Workana
npm run scrape
npm run scrape:quiet

# Envío de propuestas
npm run send-proposal
npm run sendProposal

# Comandos directos
node cli.js scrape-workana --quiet
node cli.js send-proposal --project-id "12345" --user-id 1
```

### Comandos del Frontend (`apps/frontend/`)

```bash
# Navegar al directorio del Frontend
cd apps/frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start

# Construir para producción
npm run build
npm run build:prod

# Ejecutar tests
npm test

# Construir en modo watch
npm run watch
```

## 🛠️ Tecnologías Utilizadas

### Backend (API)
- **Laravel 12** - Framework PHP para la API principal
- **PHP 8.2+** - Lenguaje de programación del backend
- **MySQL/PostgreSQL** - Base de datos principal
- **Eloquent ORM** - ORM de Laravel
- **JWT Auth** - Autenticación con JWT
- **Laravel Sanctum** - Autenticación API
- **Laravel Queue** - Procesamiento en cola
- **Node.js CLI** - Herramientas de scraping con Playwright
- **Playwright** - Web scraping y automatización
- **OpenAI** - Integración con IA

### Frontend
- **Angular 19** - Framework de frontend
- **Angular Material** - Componentes de UI
- **Tailwind CSS** - Framework de CSS
- **Transloco** - Internacionalización
- **ApexCharts** - Gráficos y visualizaciones
- **Quill** - Editor de texto rico
- **Fuse Template** - Template base

## 📦 Gestión de Dependencias

Este monorepo utiliza **NPM Workspaces** para gestionar las dependencias de manera eficiente:

- **Dependencias compartidas**: Instaladas en la raíz del proyecto
- **Dependencias específicas**: Cada aplicación tiene sus propias dependencias
- **Instalación unificada**: `npm install` instala dependencias de todos los workspaces
- **Scripts centralizados**: Los scripts principales están en el `package.json` raíz

## 🔧 Configuración del Entorno

### Requisitos Previos
- **PHP 8.2+** con extensiones requeridas
- **Composer** - Gestor de dependencias PHP
- **Node.js 18+** - Para el CLI de scraping
- **npm** - Gestor de paquetes Node.js
- **MySQL/PostgreSQL** - Base de datos
- **Redis** (opcional) - Para colas y cache

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd freelance-notifications-monorepo
   ```

2. **Instalar dependencias del monorepo**
   ```bash
   npm install
   ```

3. **Configurar API Laravel**
   ```bash
   cd apps/api
   composer install
   cp .env.example .env
   php artisan key:generate
   ```

4. **Configurar base de datos**
   ```bash
   # Editar .env con configuración de BD
   php artisan migrate
   php artisan db:seed
   ```

5. **Instalar dependencias Node.js CLI**
   ```bash
   cd apps/api
   npm install
   ```

## 🚀 Desarrollo

### Iniciar el Proyecto Completo
```bash
npm start
```
Esto iniciará:
- **API Laravel**: En el puerto configurado (por defecto 8000)
- **Frontend**: En http://localhost:4200

### Desarrollo Individual

**Solo API Laravel:**
```bash
npm run start:api
# o
cd apps/api
composer run dev
```

**Solo Frontend:**
```bash
npm run start:frontend
```

**CLI de Scraping:**
```bash
cd apps/api
npm run scrape
```

## 🏗️ Construcción y Despliegue

### Construir Frontend
```bash
npm run build:frontend
```
Los archivos se generarán en `apps/frontend/dist/`

### Despliegue
- **Frontend**: Construir y servir los archivos estáticos
- **API Laravel**: Usar Laravel Forge, Vapor o similar
- **CLI Node.js**: Instalar en servidor de scraping

## 📁 Estructura Detallada

### API Laravel (`apps/api/`)
```
api/
├── app/                    # Código principal
│   ├── Http/              # Controladores y middleware
│   ├── Models/            # Modelos Eloquent
│   ├── Services/          # Servicios de negocio
│   └── Console/           # Comandos Artisan
├── routes/                # Definición de rutas
│   ├── api.php           # Rutas de API
│   └── web.php           # Rutas web
├── database/             # Base de datos
│   ├── migrations/       # Migraciones
│   └── seeders/         # Datos iniciales
├── config/               # Configuración
├── resources/            # Vistas y assets
├── storage/              # Logs y archivos
├── tests/                # Tests
├── cli.js               # CLI Node.js
├── artisan              # Comando Artisan
├── composer.json        # Dependencias PHP
└── package.json         # Dependencias Node.js
```

### Frontend (`apps/frontend/`)
```
frontend/
├── src/                 # Código fuente
│   ├── app/            # Componentes principales
│   ├── assets/         # Recursos estáticos
│   └── styles/         # Estilos globales
├── angular.json        # Configuración Angular
├── tailwind.config.js  # Configuración Tailwind
└── tsconfig.json       # Configuración TypeScript
```

## 🔍 Troubleshooting

### Problemas Comunes

1. **Error de dependencias PHP**
   ```bash
   cd apps/api
   composer install --no-dev
   composer dump-autoload
   ```

2. **Error de dependencias Node.js**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

3. **Puerto ocupado**
   - Cambiar puerto en configuración de Laravel
   - Verificar que no haya otros servicios corriendo

4. **Problemas de migración**
   ```bash
   cd apps/api
   php artisan migrate:status
   php artisan migrate:rollback
   php artisan migrate
   ```

5. **Problemas con el CLI de scraping**
   ```bash
   cd apps/api
   npm install playwright
   npx playwright install
   ```

## 📝 Notas de Desarrollo

- **Convenciones**: Seguir las convenciones de Laravel y Angular
- **Commits**: Usar mensajes descriptivos y seguir conventional commits
- **Testing**: Ejecutar tests antes de hacer commit
- **Linting**: Usar Laravel Pint para PHP y Prettier para TypeScript

## 🤝 Contribución

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia MIT.

---

**Desarrollado con ❤️ para el Sistema de Notificaciones Freelance** 