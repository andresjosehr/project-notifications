require('dotenv').config();
const db = require('./database/index');
const {query} = require('./database/index');
const { sendWorkanaBid } = require('./src/workana/send-bid');

async function main() {
  try {
    await sendWorkanaBid();

    console.log("Proceso finalizado.");
    // exit process
    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

main(); 
