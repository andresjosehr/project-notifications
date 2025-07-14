#!/usr/bin/env node

const { Command } = require('commander');
const CommandHandlers = require('./lib/commands/CommandHandlers');

const program = new Command();

program
  .name('workana-scraper')
  .description('Scraper de Workana para Laravel')
  .version('1.0.0');

// Comando para scraping de Workana
program
  .command('scrape-workana')
  .description('Ejecutar scraping de Workana y devolver JSON')
  .option('-q, --quiet', 'Modo silencioso (solo errores)', false)
  .action(CommandHandlers.handleScrapeWorkana);

// Comando para enviar propuesta con sesión y texto
program
  .command('sendProposal')
  .description('Enviar propuesta simple con sesión y texto')
  .argument('<session>', 'Datos de sesión en formato JSON')
  .argument('<proposalText>', 'Texto de la propuesta')
  .argument('<projectLink>', 'Link del proyecto en Workana')
  .action(CommandHandlers.handleSendProposal);

// Comando para login y obtener sesión
program
  .command('login')
  .description('Iniciar sesión en Workana y obtener datos de sesión')
  .argument('<username>', 'Email del usuario de Workana')
  .argument('<password>', 'Contraseña del usuario de Workana')
  .option('--headless [value]', 'Ejecutar en modo headless', 'true')
  .option('--debug', 'Modo debug con más logs', false)
  .action(CommandHandlers.handleLogin);

program.parse(); 