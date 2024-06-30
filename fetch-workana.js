require('dotenv').config();
const db = require('./database/index');
const {query} = require('./database/index');
const {scrapProjects} = require('./src/upwork/index');
const {scrapWorkanaProjects} = require('./src/workana/index');


async function main() {
  try {
    await scrapWorkanaProjects();

    // Cierra la conexión a la base de datos (si aplica)
    if (db.close) { // Verifica si existe la función close
      await db.close(); 
    }

    console.log("Proceso finalizado.");
    // exit process
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main(); 