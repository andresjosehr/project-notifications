# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
This is a freelance project notification system v2.0 that monitors Workana and Upwork for new projects, generates AI-powered proposals, and sends Telegram notifications. The system is built with Node.js and uses a modular architecture with multi-user support and unified database structure.

## Common Commands

### Running the Application (Classic)
```bash
# Start continuous monitoring mode (recommended)
npm start
# or
node index.js continuous

# Run single cycle
npm run single
# or  
node index.js single

# Run development mode
npm run dev

# Platform-specific scraping
npm run workana
npm run upwork
# or
node index.js platform --platform workana
node index.js platform --platform upwork
```

### 🆕 New CLI Commands (Commander.js)
```bash
# Start API server
npm run server
# or
node cli.js server --port 3000

# Workana scraping with notifications
npm run workana:scrape
# or
node cli.js workana-scrape --notifications --translate

# Upwork scraping with notifications
npm run upwork:scrape
# or
node cli.js upwork-scrape --notifications --translate

# Workana login and session management
npm run workana:login
# or
node cli.js workana-login --username "email" --password "password"

# Send Workana proposal with auto-login
npm run workana:proposal
# or
node cli.js workana-proposal --project-id 123456 --username "email" --password "password"

# Enhanced commands
node cli.js stats --platform workana
node cli.js recent --platform upwork --limit 10
node cli.js search --query "React" --platform workana --limit 5
node cli.js health
node cli.js continuous --parallel --notifications --translate
node cli.js single --parallel --notifications --translate
```

### Management Commands
```bash
# Check system health
npm run health

# View statistics
npm run stats

# Search projects
node index.js search --query "angular" --platform upwork --limit 5

# Generate proposal for project
node index.js proposal --projectId 123 --platform workana

# Cleanup data/duplicates
npm run cleanup

# View recent projects
npm run recent
```

### Development Commands
```bash
# Install dependencies
npm install

# Debug mode with detailed logs
LOG_LEVEL=DEBUG npm start
```

## Architecture Overview

### Modular Structure
- **Entry Point**: `index.js` - CLI interface that delegates to `lib/app.js`
- **🆕 Enhanced CLI**: `cli.js` - New Commander.js-based CLI with enhanced commands
- **🆕 API Server**: `lib/server.js` - Express server with REST API endpoints
- **Core App**: `lib/app.js` - Main application class with command routing
- **Controllers**: `lib/controllers/` - Handle application logic
- **Services**: `lib/services/` - Business logic (AI, Notifications, Projects, Workana)
- **Scrapers**: `lib/scrapers/` - Modular scraping with Factory pattern
- **Database**: `lib/database/` - Repository pattern for data access
- **Models**: `lib/models/` - Data models
- **Utils**: `lib/utils/` - Shared utilities like logger

### Key Design Patterns
- **Factory Pattern**: `ScraperFactory.js` creates platform-specific scrapers
- **Repository Pattern**: Database access abstracted through repositories
- **Base Class**: `BaseScraper.js` provides common scraping functionality
- **Dependency Injection**: Services injected into controllers
- **🆕 Command Pattern**: Commander.js for structured CLI commands
- **🆕 REST API**: Express server with RESTful endpoints
- **🆕 Multi-user Architecture**: User-specific configurations and proposal tracking
- **🆕 Unified Data Model**: Single table for projects across all platforms

### Platform Support
- **Workana**: 
  - **Public scraping**: WorkanaScraper (no login required)
  - **Authenticated actions**: WorkanaService (login, send proposals)
  - **Notifications**: AI-powered project notifications
- **Upwork**: Complete scraping, proposal generation, notifications
- **Extensible**: Easy to add new platforms by extending `BaseScraper`

### 🆕 New Components

#### WorkanaService (`lib/services/WorkanaService.js`)
- Session management with cookie persistence (24h expiry)
- Automated login with Playwright
- Proposal sending with auto-login capability
- Browser automation with stealth mode
- **ONLY for authenticated actions** (login, send proposals)

#### API Server (`lib/server.js`)
- Express-based REST API
- CORS enabled for cross-origin requests
- Comprehensive error handling
- All CLI commands available as HTTP endpoints
- JSON request/response format

#### Enhanced CLI (`cli.js`)
- Commander.js-based command structure
- Better help and error messages
- Structured command organization
- Enhanced output formatting with emojis
- Consistent option handling

## Database Schema
The system uses MySQL with these main tables:
- `projects` - Unified table for all projects with platform identification (workana/upwork)
- `users` - Multi-user support with individual configurations
- `user_proposals` - Tracks proposals sent by each user to specific projects

### Key Schema Changes in v2.0:
- **Unified Project Table**: Combined `workana_projects` and `upwork_projects` into single `projects` table
- **Platform Column**: Added `platform` ENUM('workana','upwork') for platform identification
- **Multi-user Support**: New `users` table for independent user configurations
- **Proposal Tracking**: `user_proposals` table replaces global `proposal_sent_at` column
- **User-specific Settings**: Each user has their own proposal directives, professional profile, and Telegram notifications

## Environment Configuration
Required environment variables:
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE` - Database connection
- `GROP_API_KEY` - Groq API key for AI services
- `TELEGRAM_DEFAULT_USER` - Telegram user for notifications

Optional configuration:
- `NODE_ENV` - Environment (development/production)
- `LOG_LEVEL` - Logging level (DEBUG/INFO/WARN/ERROR)
- `SCRAPING_HEADLESS` - Run browsers in headless mode
- `PORT` - API server port (default: 3000)
- `API_URL` - Base URL for API endpoints
- `DB_CONNECTION_LIMIT`, `DB_ACQUIRE_TIMEOUT`, `DB_TIMEOUT` - Database connection settings
- `AI_MODEL`, `AI_API_URL` - AI service configuration
- `TELEGRAM_API_URL` - Telegram API endpoint
- `SCRAPING_TIMEOUT`, `SCRAPING_WAIT_MIN`, `SCRAPING_WAIT_MAX` - Scraping settings
- `SCRAPING_USER_AGENT` - User agent for web scraping

## 🆕 API Endpoints

### Start API Server
```bash
npm run server
# or
node cli.js server --port 3000
```

### Available Endpoints

#### Health and Status
- `GET /health` - System health check
- `GET /api/status` - Application status

#### Statistics and Data
- `GET /api/stats?platform=workana` - Get project statistics
- `GET /api/projects/recent?platform=upwork&limit=10` - Recent projects
- `GET /api/projects/search?query=React&platform=workana&limit=5` - Search projects

#### Scraping Operations (Public, no login)
- `POST /api/workana/scrape` - Execute Workana scraping (uses WorkanaScraper)
- `POST /api/upwork/scrape` - Execute Upwork scraping (uses UpworkScraper)
- `POST /api/scrape/single` - Execute single scraping cycle

#### Workana Management (Authenticated)
- `POST /api/workana/login` - Login to Workana and save session (uses WorkanaService)
- `POST /api/workana/proposal` - Send proposal to Workana project (uses WorkanaService)

#### Utilities
- `POST /api/proposal/generate` - Generate AI proposal
- `POST /api/cleanup` - Clean up database

### API Request/Response Format

**Request Body Example:**
```json
{
  "notifications": true,
  "translate": true,
  "projectId": "123456",
  "username": "email@example.com",
  "password": "password"
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    "newProjects": 5,
    "notifications": 3
  }
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Error description"
}
```

## Testing
No test framework is currently configured. The project uses:
- Health checks via `npm run health`
- Manual testing through single cycle runs
- Debug logging for troubleshooting

## Logging
Structured logging with different levels:
- Uses custom logger in `lib/utils/logger.js`
- Supports DEBUG, INFO, WARN, ERROR levels
- Contextual logging with metadata
- Set `LOG_LEVEL=DEBUG` for detailed output

## AI Integration
- Uses Groq API for text generation
- Automatic proposal generation
- Translation capabilities
- Configurable AI models and parameters

## Error Handling
- Global error handling via `lib/middleware/errorHandler.js`
- Graceful degradation for scraping failures
- Comprehensive logging of errors with stack traces
- Health check system for monitoring