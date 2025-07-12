#!/usr/bin/env node

const path = require('path');
const knex = require('knex');
const knexConfig = require('./knexfile.js');

async function runMigrations() {
  const environment = process.env.NODE_ENV || 'development';
  const config = knexConfig[environment];
  
  console.log(`Running migrations for environment: ${environment}`);
  console.log(`Database: ${config.connection.database} at ${config.connection.host}`);
  
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