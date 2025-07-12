# Sistema de Notificaciones Freelance - Monorepo

Este proyecto es un **monorepo** que contiene tanto el backend (API Express) como el frontend (Angular) del Sistema de Notificaciones Freelance. La estructura está organizada siguiendo las mejores prácticas para facilitar el desarrollo, mantenimiento y escalabilidad.

## 🏗️ Estructura del Monorepo

```
freelance-notifications-monorepo/
├── apps/
│   ├── api/                 # Backend Express.js
│   │   ├── index.js         # Punto de entrada principal
│   │   ├── start-server.js  # Script de inicio
│   │   ├── knexfile.js      # Configuración de base de datos
│   │   ├── lib/             # Librerías y utilidades
│   │   ├── database/        # Migraciones y seeds
│   │   ├── scripts/         # Scripts de utilidad
│   │   ├── public/          # Archivos estáticos
│   │   └── package.json     # Dependencias del backend
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

# Iniciar solo la API
npm run start:api

# Iniciar solo el Frontend
npm run start:frontend

# Construir el Frontend para producción
npm run build:frontend

# Ejecutar migraciones de base de datos
npm run migrate
```

### Comandos de la API (`apps/api/`)

```bash
# Navegar al directorio de la API
cd apps/api

# Iniciar en modo desarrollo
npm start
npm run start:dev

# Gestión de migraciones
npm run migrate              # Ejecutar migraciones pendientes
npm run migrate:rollback     # Revertir última migración
npm run migrate:make         # Crear nueva migración
npm run migrate:status       # Ver estado de migraciones
npm run migrate:decouple     # Ejecutar migraciones específicas

# Scripts de utilidad
npm run migrate:language     # Migración de idiomas
npm run credentials:create   # Crear credenciales externas
```

### Comandos del Frontend (`apps/frontend/`)

```bash
# Navegar al directorio del Frontend
cd apps/frontend

# Iniciar servidor de desarrollo
npm start

# Construir para producción
npm run build

# Ejecutar tests
npm test

# Construir en modo watch
npm run watch
```

## 🛠️ Tecnologías Utilizadas

### Backend (API)
- **Express.js** - Framework web para Node.js
- **Knex.js** - Query builder para base de datos
- **MySQL** - Base de datos principal
- **JWT** - Autenticación
- **Puppeteer/Playwright** - Web scraping
- **OpenAI** - Integración con IA
- **Web Push** - Notificaciones push

### Frontend
- **Angular 19** - Framework de frontend
- **Angular Material** - Componentes de UI
- **Tailwind CSS** - Framework de CSS
- **Transloco** - Internacionalización
- **ApexCharts** - Gráficos y visualizaciones
- **Quill** - Editor de texto rico

## 📦 Gestión de Dependencias

Este monorepo utiliza **NPM Workspaces** para gestionar las dependencias de manera eficiente:

- **Dependencias compartidas**: Instaladas en la raíz del proyecto
- **Dependencias específicas**: Cada aplicación tiene sus propias dependencias
- **Instalación unificada**: `npm install` instala dependencias de todos los workspaces
- **Scripts centralizados**: Los scripts principales están en el `package.json` raíz

## 🔧 Configuración del Entorno

### Requisitos Previos
- Node.js (versión recomendada: 18+)
- npm (incluido con Node.js)
- MySQL (para la base de datos)

### Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <url-del-repositorio>
   cd freelance-notifications-monorepo
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   ```bash
   # Crear archivo .env en apps/api/
   cp apps/api/.env.example apps/api/.env
   # Editar con tus configuraciones
   ```

4. **Configurar base de datos**
   ```bash
   # Ejecutar migraciones
   npm run migrate
   ```

## 🚀 Desarrollo

### Iniciar el Proyecto Completo
```bash
npm start
```
Esto iniciará:
- **API**: En el puerto configurado (por defecto 3000)
- **Frontend**: En http://localhost:4200

### Desarrollo Individual

**Solo API:**
```bash
npm run start:api
```

**Solo Frontend:**
```bash
npm run start:frontend
```

## 🏗️ Construcción y Despliegue

### Construir Frontend
```bash
npm run build:frontend
```
Los archivos se generarán en `apps/frontend/dist/`

### Despliegue
- **Frontend**: Construir y servir los archivos estáticos
- **API**: Usar PM2 o similar para el servidor Node.js

## 📁 Estructura Detallada

### API (`apps/api/`)
```
api/
├── index.js              # Servidor principal
├── start-server.js       # Script de inicio
├── knexfile.js          # Configuración de BD
├── lib/                 # Librerías compartidas
│   ├── database.js      # Conexión a BD
│   ├── auth.js          # Autenticación
│   └── utils.js         # Utilidades
├── database/            # Base de datos
│   ├── migrations/      # Migraciones
│   └── seeds/          # Datos iniciales
├── scripts/            # Scripts de utilidad
├── public/             # Archivos estáticos
└── logs/               # Archivos de log
```

### Frontend (`apps/frontend/`)
```
frontend/
├── src/                # Código fuente
│   ├── app/           # Componentes principales
│   ├── assets/        # Recursos estáticos
│   └── styles/        # Estilos globales
├── angular.json       # Configuración Angular
├── tailwind.config.js # Configuración Tailwind
└── tsconfig.json      # Configuración TypeScript
```

## 🔍 Troubleshooting

### Problemas Comunes

1. **Error de dependencias**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Puerto ocupado**
   - Cambiar puerto en configuración de la API
   - Verificar que no haya otros servicios corriendo

3. **Problemas de migración**
   ```bash
   npm run migrate:status
   npm run migrate:rollback
   npm run migrate
   ```

## 📝 Notas de Desarrollo

- **Convenciones**: Seguir las convenciones de Angular y Express.js
- **Commits**: Usar mensajes descriptivos y seguir conventional commits
- **Testing**: Ejecutar tests antes de hacer commit
- **Linting**: Usar ESLint y Prettier para consistencia de código

## 🤝 Contribución

1. Fork el repositorio
2. Crear una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear un Pull Request

## 📄 Licencia

Este proyecto está bajo la licencia ISC.

---

**Desarrollado con ❤️ para el Sistema de Notificaciones Freelance** 