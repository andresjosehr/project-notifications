# Sistema de Notificaciones Freelance v2.0

Sistema automatizado multiusuario de notificaciones para proyectos de freelance con inteligencia artificial integrada. Monitorea constantemente Workana y Upwork en busca de nuevos proyectos, genera propuestas automáticas personalizadas por usuario y envía notificaciones inteligentes vía Telegram.

## 🌟 Características Principales

- ✅ **Scraping Inteligente**: Monitoreo automatizado de Workana y Upwork
- ✅ **IA Integrada**: Generación automática de propuestas personalizadas
- ✅ **Sistema Multiusuario**: Soporte para múltiples usuarios con configuraciones independientes
- ✅ **Gestión de Propuestas**: Rastreo de propuestas enviadas por usuario y proyecto
- ✅ **Notificaciones Telegram**: Alertas instantáneas personalizadas por usuario
- ✅ **Base de Datos Unificada**: Tabla única para proyectos con identificador de plataforma
- ✅ **Arquitectura Escalable**: Diseño modular y mantenible
- ✅ **Logging Avanzado**: Sistema de logs estructurado
- ✅ **Manejo de Errores**: Sistema robusto de recuperación
- ✅ **Health Checks**: Monitoreo del estado del sistema

## 📁 Arquitectura del Proyecto

```
lib/
├── config/                 # Configuración centralizada
├── database/              # Capa de acceso a datos
│   ├── connection.js      # Pool de conexiones MySQL
│   └── repositories/      # Patrón Repository
│       ├── ProjectRepository.js    # Repositorio de proyectos (tabla unificada)
│       ├── UserRepository.js       # Repositorio de usuarios
│       └── UserProposalRepository.js # Repositorio de propuestas por usuario
├── models/                # Modelos de datos
│   ├── Project.js         # Modelo de proyecto (soporta ambas plataformas)
│   ├── User.js            # Modelo de usuario
│   └── UserProposal.js    # Modelo de propuesta de usuario
├── services/              # Lógica de negocio
│   ├── AIService.js       # Servicio de IA
│   ├── NotificationService.js  # Servicio de notificaciones
│   ├── ProjectService.js  # Servicio de proyectos
│   └── WorkanaService.js  # Servicio específico de Workana
├── scrapers/              # Scrapers modulares
│   ├── BaseScraper.js     # Clase base abstracta
│   ├── UpworkScraper.js   # Scraper específico Upwork
│   ├── WorkanaScraper.js  # Scraper específico Workana
│   └── ScraperFactory.js  # Factory pattern
├── controllers/           # Controladores de aplicación
├── middleware/            # Middleware (manejo errores)
└── utils/                 # Utilidades (logger)
```

## 🚀 Instalación

### Prerrequisitos

- Node.js 16+ 
- MySQL/MariaDB
- Variables de entorno configuradas

### Pasos de Instalación

1. **Clonar el repositorio**
```bash
git clone <repository-url>
cd project-notifications
```

2. **Instalar dependencias**
```bash
npm install
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env
```

Editar `.env` con tus configuraciones:

```env
# Base de Datos
DB_HOST=localhost
DB_USER=tu_usuario
DB_PASSWORD=tu_password
DB_DATABASE=tu_database

# JWT (Autenticación)
JWT_SECRET=tu_secret_key_muy_seguro
JWT_EXPIRES_IN=24h

# IA (Groq API)
GROP_API_KEY=tu_api_key_groq

# Telegram
TELEGRAM_DEFAULT_USER=tu_usuario_telegram

# Configuración opcional
NODE_ENV=production
LOG_LEVEL=INFO
SCRAPING_HEADLESS=true
```

4. **Configurar base de datos**
```bash
# Ejecutar migraciones
npm run migrate

# O ejecutar el script SQL incluido
mysql -u tu_usuario -p tu_database < database/bd.sql
```

5. **🆕 Configuración Inicial del Sistema**

Al ejecutar la aplicación por primera vez, el sistema detectará que no hay usuarios registrados y te redirigirá automáticamente a la página de configuración inicial.

**Opción A: Configuración Web (Recomendada)**
```bash
npm start
# Abrir http://localhost:3000
# El sistema te redirigirá automáticamente a /register.html
```

**Opción B: Script de Prueba**
```bash
# Limpiar base de datos (opcional)
node reset-database.js

# Probar configuración inicial
node test-initial-setup.js
```

### 🆕 Estructura de Base de Datos Actualizada

La tabla `users` ahora incluye campos para autenticación del sistema:

```sql
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  workana_email VARCHAR(255) NOT NULL UNIQUE,
  workana_password VARCHAR(255) NOT NULL,
  proposal_directives LONGTEXT NOT NULL,
  professional_profile LONGTEXT NOT NULL,
  telegram_user VARCHAR(255) NOT NULL,
  workana_session_data LONGTEXT,
  session_expires_at DATETIME,
  system_password VARCHAR(255) NOT NULL,  -- 🆕 Contraseña encriptada del sistema
  role ENUM('ADMIN', 'USER') NOT NULL DEFAULT 'USER',  -- 🆕 Rol del usuario
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE access_tokens (  -- 🆕 Nueva tabla para tokens de acceso
  id INT AUTO_INCREMENT PRIMARY KEY,
  token VARCHAR(255) NOT NULL UNIQUE,
  project_id INT NOT NULL,
  platform ENUM('workana', 'upwork') NOT NULL,
  user_id INT NOT NULL,
  expires_at DATETIME NOT NULL,
  used_at DATETIME NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

## 💻 Uso

### Comandos Principales (Versión Clásica)

#### Modo Continuo (Recomendado)
```bash
npm start
# o
node index.js continuous
```

#### Ciclo Único
```bash
npm run single
# o
node index.js single
```

#### Plataforma Específica
```bash
npm run workana
npm run upwork
# o
node index.js platform --platform workana
node index.js platform --platform upwork
```

#### Estadísticas
```bash
npm run stats
# o
node index.js stats --platform workana
```

#### Búsqueda de Proyectos
```bash
node index.js search --query "angular" --platform upwork --limit 5
```

#### Generar Propuesta
```bash
node index.js proposal --projectId 123 --platform workana
```

#### Health Check
```bash
npm run health
```

## 🆕 Configuración Inicial del Sistema

### Flujo de Configuración Inicial

1. **Primera Ejecución**: Al ejecutar `npm start` por primera vez, el sistema detecta que no hay usuarios registrados.

2. **Redirección Automática**: El sistema te redirige automáticamente a `/register.html` para configurar el administrador inicial.

3. **Formulario de Configuración**: Completa el formulario con:
   - **Email de Workana**: Email que se usará para las sesiones de Workana
   - **Contraseña del Sistema**: Contraseña para acceder al sistema (encriptada)
   - **Directrices de Propuesta**: Instrucciones para generar propuestas (opcional)
   - **Perfil Profesional**: Descripción de tu perfil (opcional)
   - **Usuario de Telegram**: Para notificaciones (opcional)

4. **Creación del Administrador**: El sistema crea automáticamente un usuario con rol `ADMIN`.

5. **Redirección al Login**: Después de la configuración exitosa, eres redirigido al login para iniciar sesión.

### Endpoints de Configuración Inicial

- `GET /api/auth/check-initialization` - Verifica si el sistema está inicializado
- `POST /api/auth/register-admin` - Registra el administrador inicial

### Scripts de Prueba

```bash
# Limpiar base de datos para probar desde cero
node reset-database.js

# Probar configuración inicial
node test-initial-setup.js

# Verificar estado del sistema
curl http://localhost:3000/api/auth/check-initialization
```

### 🆕 Nuevos Comandos CLI (Con Commander.js)

#### Servidor API
```bash
# Iniciar servidor API con endpoints REST
npm run server
# o
node cli.js server --port 3000
```

#### Scraping Específico con Notificaciones
```bash
# Scraping de Workana con notificaciones
npm run workana:scrape
# o
node cli.js workana-scrape --notifications --translate

# Scraping de Upwork con notificaciones
npm run upwork:scrape
# o
node cli.js upwork-scrape --notifications --translate
```

#### Gestión de Sesiones Workana
```bash
# Iniciar sesión en Workana y guardar cookies
npm run workana:login
# o
node cli.js workana-login --username "tu_email" --password "tu_password"
```

#### Envío de Propuestas Automatizado
```bash
# Enviar propuesta con auto-login
npm run workana:proposal
# o
node cli.js workana-proposal --project-id 123456 --username "tu_email" --password "tu_password"

# Enviar propuesta con sesión existente
node cli.js workana-proposal --project-id 123456 --no-auto-login
```

#### Comandos Mejorados
```bash
# Estadísticas detalladas
node cli.js stats --platform workana

# Proyectos recientes
node cli.js recent --platform upwork --limit 20

# Búsqueda avanzada
node cli.js search --query "React" --platform workana --limit 10

# Health check completo
node cli.js health

# Modo continuo
node cli.js continuous --parallel --notifications --translate

# Ciclo único
node cli.js single --parallel --notifications --translate
```

### Opciones de Configuración

#### Modo Continuo con Opciones
```bash
node index.js continuous --parallel true --sendNotifications true --translate true
```

#### Modo de Desarrollo
```bash
npm run dev
```

#### Limpiar Datos
```bash
npm run cleanup
```

## 🔧 Configuración Avanzada

### Variables de Entorno Opcionales

```env
# Configuración de Scraping
SCRAPING_HEADLESS=true
SCRAPING_TIMEOUT=30000
SCRAPING_WAIT_MIN=60
SCRAPING_WAIT_MAX=90
SCRAPING_USER_AGENT="Mozilla/5.0..."

# Configuración de Base de Datos
DB_CONNECTION_LIMIT=10
DB_ACQUIRE_TIMEOUT=60000
DB_TIMEOUT=60000

# Configuración de IA
AI_MODEL=llama3-70b-8192
AI_API_URL=https://api.groq.com/openai/v1/chat/completions

# Configuración de Notificaciones
TELEGRAM_API_URL=http://api.callmebot.com/text.php

# Configuración de Aplicación
API_URL=https://tu-dominio.com
PORT=3000
LOG_LEVEL=INFO
```

### Configuración de Logging

Los logs se categorizan en diferentes niveles:
- `ERROR`: Errores críticos
- `WARN`: Advertencias
- `INFO`: Información general  
- `DEBUG`: Información detallada

```bash
LOG_LEVEL=DEBUG npm start
```

## 🤖 Servicios

### AIService
Maneja todas las operaciones de inteligencia artificial:
- Generación de propuestas personalizadas
- Resúmenes de texto
- Extracción de palabras clave

### NotificationService  
Gestiona las notificaciones vía Telegram:
- Notificaciones de proyectos nuevos
- Notificaciones de errores
- Notificaciones de estado del sistema
- Notificaciones traducidas

### ProjectService
Lógica de negocio para proyectos:
- Scraping y procesamiento
- Filtrado de proyectos nuevos
- Búsqueda y estadísticas
- Gestión de datos

## 🛠️ API de Desarrollo

### 🌐 API REST (Nuevo)

Inicia el servidor API con:
```bash
npm run server
# o
node cli.js server --port 3000
```

#### Endpoints Disponibles

##### Health Check
```bash
GET /health
```

##### Estado del Sistema
```bash
GET /api/status
```

##### Estadísticas
```bash
GET /api/stats?platform=workana
```

##### Proyectos Recientes
```bash
GET /api/projects/recent?platform=upwork&limit=10
```

##### Buscar Proyectos
```bash
GET /api/projects/search?query=React&platform=workana&limit=5
```

##### Scraping de Workana
```bash
POST /api/workana/scrape
Content-Type: application/json

{
  "notifications": true,
  "translate": true
}
```

##### Scraping de Upwork
```bash
POST /api/upwork/scrape
Content-Type: application/json

{
  "notifications": true,
  "translate": true
}
```

##### Login en Workana
```bash
POST /api/workana/login
Content-Type: application/json

{
  "username": "tu_email@example.com",
  "password": "tu_password"
}
```

##### Enviar Propuesta Workana
```bash
POST /api/workana/proposal
Content-Type: application/json

{
  "projectId": "123456",
  "autoLogin": true,
  "username": "tu_email@example.com",
  "password": "tu_password"
}
```

##### Ciclo Único
```bash
POST /api/scrape/single
Content-Type: application/json

{
  "parallel": true,
  "notifications": true,
  "translate": true
}
```

##### Generar Propuesta
```bash
POST /api/proposal/generate
Content-Type: application/json

{
  "projectId": "123456",
  "platform": "workana"
}
```

##### Limpiar Datos
```bash
POST /api/cleanup
Content-Type: application/json

{
  "removeDuplicates": true
}
```

#### Respuestas de la API

**Respuesta Exitosa:**
```json
{
  "success": true,
  "message": "Operación completada",
  "data": {
    "newProjects": 5,
    "notifications": 3
  }
}
```

**Respuesta de Error:**
```json
{
  "success": false,
  "error": "Descripción del error"
}
```

### Uso Programático

```javascript
const { NotificationApp } = require('./index');

async function ejemplo() {
  const app = new NotificationApp();
  await app.initialize();
  
  // Ejecutar ciclo único
  const results = await app.runSingleCycle({
    sendNotifications: true,
    translate: true
  });
  
  // Obtener estadísticas
  const stats = await app.getStats();
  
  // Generar propuesta
  const proposal = await app.generateProposal(123, 'workana');
}
```

### Ejemplo de Uso de API con JavaScript

```javascript
// Obtener estadísticas
const response = await fetch('http://localhost:3000/api/stats');
const stats = await response.json();

// Ejecutar scraping de Workana
const scrapingResponse = await fetch('http://localhost:3000/api/workana/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    notifications: true,
    translate: true
  })
});

// Enviar propuesta
const proposalResponse = await fetch('http://localhost:3000/api/workana/proposal', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: "123456",
    autoLogin: true,
    username: "tu_email@example.com",
    password: "tu_password"
  })
});
```

### Health Check API

```javascript
const health = await app.healthCheck();
/*
{
  timestamp: "2024-01-01T12:00:00.000Z",
  overall: { healthy: true, status: "OK" },
  services: {
    projects: { healthy: true, stats: {...} },
    ai: { healthy: true, response: "OK" },
    notifications: { healthy: true }
  },
  app: {
    isRunning: true,
    currentMode: "continuous",
    environment: "production"
  }
}
*/
```

## 📊 Monitoreo y Logs

### Estructura de Logs

```
[2024-01-01T12:00:00.000Z] [INFO] [UPWORK] Proyectos extraídos | {"count": 15}
[2024-01-01T12:00:01.000Z] [INFO] [DATABASE] Proyecto creado en upwork | {"id": 123}
[2024-01-01T12:00:02.000Z] [INFO] [AI] Propuesta generada exitosamente | {"length": 500}
[2024-01-01T12:00:03.000Z] [INFO] [TELEGRAM] Notificación enviada | {"success": true}
```

### Métricas del Sistema

El sistema registra automáticamente:
- Proyectos procesados por plataforma
- Proyectos nuevos encontrados
- Errores por tipo y severidad
- Tiempo de respuesta de APIs
- Uso de memoria y CPU

## 🔒 Seguridad

### Mejores Prácticas Implementadas

- ✅ Variables de entorno para credenciales
- ✅ Validación de entrada de datos
- ✅ Límites de rate limiting
- ✅ Logs sin información sensible
- ✅ Conexiones de DB con pool
- ✅ Manejo seguro de errores

### Consideraciones de Scraping

- Comportamiento humano simulado
- Headers de navegador reales
- Delays aleatorios entre requests
- Detección y manejo de bloqueos

## 🚨 Troubleshooting

### Problemas Comunes

#### Error de Conexión a Base de Datos
```bash
Error: ER_ACCESS_DENIED_ERROR
```
**Solución**: Verificar credenciales en `.env`

#### Error de API de IA
```bash
Error: API respondió con status 401
```
**Solución**: Verificar `GROP_API_KEY` en `.env`

#### Timeout en Scraping
```bash
Error: Timeout waiting for selector
```
**Solución**: Incrementar `SCRAPING_TIMEOUT` o verificar selectores

#### Notificaciones no llegan
```bash
Error: Telegram API respondió con status 400
```
**Solución**: Verificar `TELEGRAM_DEFAULT_USER` configurado

### Logs de Debug

```bash
LOG_LEVEL=DEBUG node index.js continuous
```

### Modo de Recuperación

```bash
node index.js emergency-stop
node index.js cleanup --removeDuplicates true
node index.js health
```

## 🛣️ Roadmap

### Versión 2.1 (Próxima)
- [ ] Interfaz web de administración
- [ ] API REST completa
- [ ] Métricas avanzadas con Prometheus
- [ ] Soporte para más plataformas freelance
- [ ] Filtros inteligentes por habilidades

### Versión 2.2 (Futuro)
- [ ] Machine Learning para mejor matching
- [ ] Integración con calendarios
- [ ] Notificaciones push móvil
- [ ] Dashboard en tiempo real
- [ ] Integración con CRM

## 🤝 Contribución

### Estructura para Nuevas Características

1. **Nuevos Scrapers**: Extender `BaseScraper`
2. **Nuevos Servicios**: Seguir patrón establecido
3. **Nuevas Plataformas**: Actualizar `ScraperFactory`
4. **Nuevos Comandos**: Agregar a `NotificationApp`

### Ejemplo: Agregar Nueva Plataforma

```javascript
// lib/scrapers/FreelancerScraper.js
class FreelancerScraper extends BaseScraper {
  constructor() {
    super('freelancer');
  }
  
  getUrl() {
    return 'https://freelancer.com/jobs';
  }
  
  // Implementar métodos abstractos...
}

// Actualizar ScraperFactory.js
case 'freelancer':
  return new FreelancerScraper();
```

## 📄 Licencia

ISC License - Ver archivo `LICENSE` para más detalles.

## 📞 Soporte

Para reportar problemas o solicitar características:
1. Revisar este README
2. Verificar logs con `LOG_LEVEL=DEBUG`
3. Ejecutar `npm run health`
4. Crear issue con detalles completos

---

**¡El sistema está diseñado para ser robusto, escalable y fácil de mantener!** 🚀 