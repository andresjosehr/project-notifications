# Sistema de Notificaciones Freelance v2.0

Sistema automatizado de notificaciones para proyectos de freelance con inteligencia artificial integrada. Monitorea constantemente Workana y Upwork en busca de nuevos proyectos, genera propuestas automáticas y envía notificaciones inteligentes vía Telegram.

## 🌟 Características Principales

- ✅ **Scraping Inteligente**: Monitoreo automatizado de Workana y Upwork
- ✅ **IA Integrada**: Generación automática de propuestas personalizadas
- ✅ **Notificaciones Telegram**: Alertas instantáneas de nuevos proyectos
- ✅ **Traducción Automática**: Conversión automática al español
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
├── models/                # Modelos de datos
├── services/              # Lógica de negocio
│   ├── AIService.js       # Servicio de IA
│   ├── NotificationService.js  # Servicio de notificaciones
│   └── ProjectService.js  # Servicio de proyectos
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
```sql
-- Crear tablas necesarias
CREATE TABLE workana_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500),
  description TEXT,
  price VARCHAR(200),
  link VARCHAR(500) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE upwork_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(500),
  description TEXT,
  info TEXT,
  link VARCHAR(500) UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 💻 Uso

### Comandos Principales

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
- Traducción automática
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