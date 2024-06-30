require('dotenv').config();
const { loginWorkana } = require('./src/workana/login');



async function init () {

  loginWorkana()
  
}

init();

