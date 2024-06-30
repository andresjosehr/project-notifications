require('dotenv').config();
const { sendWorkanaBid } = require('./src/workana/send-bid');



async function init () {

  sendWorkanaBid()
  
}

init();

