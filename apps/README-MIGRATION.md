# Migration from Node.js to Laravel

## Overview
Se ha completado la migración del sistema de notificaciones freelance desde Node.js hacia Laravel, manteniendo Node.js únicamente para las funciones de scraping.

## Architecture Changes

### Before (Node.js Full Stack)
- **api/**: Sistema completo en Node.js
  - Base de datos, API, controllers, services, scrapers
  - Todo en una sola aplicación

### After (Laravel + Node.js Hybrid)
- **api2/**: Laravel API principal
  - Manejo de base de datos
  - Controllers y services principales
  - API REST endpoints
  - Comunicación con Node.js para scraping

- **api/**: Node.js Scraper Service
  - Solo funciones de scraping
  - API REST para comunicación con Laravel
  - Workana y Upwork scrapers
  - Login y envío de propuestas

## Laravel API (api2/)

### Database Structure
```bash
# Migrations created:
- create_users_table_new.php
- create_projects_table.php  
- create_access_tokens_table.php
- create_user_proposals_table.php
- create_external_credentials_table.php
```

### Models
- `User` - Usuario del sistema
- `Project` - Proyectos scrapeados 
- `UserProposal` - Propuestas enviadas por usuarios
- `ExternalCredential` - Credenciales externas (Workana, Upwork)
- `AccessToken` - Tokens de acceso

### Controllers
- `ProjectController` - Gestión de proyectos y scraping
- `UserController` - Gestión de usuarios
- `ExternalCredentialController` - Gestión de credenciales
- `ScraperController` - Comunicación con Node.js scraper

### Services
- `ProjectService` - Lógica de negocio de proyectos
- `AIService` - Integración con IA (Groq)
- `NotificationService` - Notificaciones Telegram
- `ScraperService` - Comunicación con Node.js

### API Endpoints
```
GET /health - Health check
GET /api/status - Application status

# Projects
GET /api/projects/stats - Project statistics
GET /api/projects/recent - Recent projects
GET /api/projects/search - Search projects
POST /api/projects/cleanup - Clean up database

# Scraping (delegates to Node.js)
POST /api/scrape/single - Single scraping cycle
POST /api/scrape/{platform} - Platform specific scraping

# Workana (delegates to Node.js)
POST /api/workana/scrape - Workana scraping
POST /api/workana/login - Workana login
POST /api/workana/proposal - Send Workana proposal

# Upwork (delegates to Node.js) 
POST /api/upwork/scrape - Upwork scraping

# AI
POST /api/proposal/generate - Generate AI proposal

# Users
GET /api/users - List users
POST /api/users - Create user
GET /api/users/{user} - Get user
PUT /api/users/{user} - Update user
DELETE /api/users/{user} - Delete user

# Credentials
GET /api/credentials/user/{user} - Get user credentials
POST /api/credentials - Create credentials
PUT /api/credentials/{credential} - Update credentials
DELETE /api/credentials/{credential} - Delete credentials
```

## Node.js Scraper Service (api/)

### New Structure
- `scraper-api.js` - Express API server for scraping
- Mantiene todos los scrapers existentes
- Expone endpoints REST para Laravel

### API Endpoints
```
GET /health - Health check
GET /stats - Service statistics

# Scraping
POST /scrape - Scrape all platforms
POST /scrape/{platform} - Scrape specific platform

# Workana Services
POST /workana/login - Login to Workana
POST /workana/proposal - Send proposal to Workana
```

### Scripts Added
```json
{
  "scraper": "node scraper-api.js",
  "scraper:dev": "nodemon scraper-api.js"
}
```

## Communication Flow

1. **Laravel API** receives HTTP request
2. **Laravel** processes business logic
3. **Laravel** calls **Node.js scraper** via HTTP
4. **Node.js** executes scraping/automation
5. **Node.js** returns results to **Laravel**
6. **Laravel** processes and stores data
7. **Laravel** returns response to client

## Environment Configuration

### Laravel (.env)
```env
# Database
DB_DATABASE=freelance_notifications

# External APIs
NODE_SCRAPER_API_URL=http://localhost:3002
GROP_API_KEY=your_groq_api_key
AI_API_URL=https://api.groq.com/openai/v1/chat/completions
AI_MODEL=llama3-8b-8192
TELEGRAM_API_URL=http://localhost:3001/send-notification
```

### Node.js (.env)
```env
# Scraper service port
SCRAPER_PORT=3002

# Database (for scrapers only)
DB_HOST=127.0.0.1
DB_USER=root
DB_PASSWORD=
DB_DATABASE=freelance_notifications

# External APIs (for scraping)
GROP_API_KEY=your_groq_api_key
```

## Running the System

### Laravel API (Port 8000)
```bash
cd api2/
php artisan serve
```

### Node.js Scraper Service (Port 3002)
```bash
cd api/
npm run scraper
# or for development:
npm run scraper:dev
```

### Optional: Telegram Service (Port 3001)
If you have a separate Telegram notification service.

## Migration Benefits

1. **Separation of Concerns**
   - Laravel handles business logic and data
   - Node.js focuses only on scraping

2. **Better Maintainability**
   - Laravel provides better structure
   - Node.js scrapers remain optimized

3. **Scalability**
   - Can scale Laravel and Node.js independently
   - Multiple scraper instances possible

4. **Technology Strengths**
   - Laravel: Database, API, business logic
   - Node.js: Web scraping, browser automation

## Next Steps

1. **Test the complete system**
2. **Migrate existing database data** if needed
3. **Update any external integrations**
4. **Configure production environment**
5. **Set up monitoring and logging**

## File Structure

```
apps/
├── api/                    # Node.js Scraper Service
│   ├── scraper-api.js     # New scraper API server
│   ├── lib/
│   │   ├── scrapers/      # Existing scrapers
│   │   ├── services/      # Workana service, etc.
│   │   └── utils/         # Utilities
│   └── package.json       # Updated with scraper script
├── api2/                   # Laravel API
│   ├── app/
│   │   ├── Http/Controllers/
│   │   ├── Models/
│   │   └── Services/
│   ├── database/migrations/
│   ├── routes/web.php     # API routes
│   └── .env.example       # Environment template
└── README-MIGRATION.md    # This file
```