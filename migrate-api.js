#!/usr/bin/env node

const path = require('path');
const knex = require('knex');

// Load knexfile from apps/api
const knexfilePath = path.join(__dirname, 'apps', 'api', 'knexfile.js');
const knexConfig = require(knexfilePath);

async function runMigrations() {
  const environment = process.env.NODE_ENV || 'development';
  const config = knexConfig[environment];
  
  // Update migrations directory to be relative to root
  config.migrations.directory = path.join(__dirname, 'apps', 'api', config.migrations.directory);
  
  console.log(`Running migrations for environment: ${environment}`);
  console.log(`Database: ${config.connection.database} at ${config.connection.host}`);
  console.log(`Migrations directory: ${config.migrations.directory}`);
  
  const db = knex(config);
  
  try {
    const [batchNo, log] = await db.migrate.latest();
    
    if (log.length === 0) {
      console.log('Already up to date');
    } else {
      console.log(`Batch ${batchNo} run: ${log.length} migrations`);
      log.forEach(migration => console.log(`- ${migration}`));
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await db.destroy();
  }
}

runMigrations();