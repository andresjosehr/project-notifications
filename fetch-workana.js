require('dotenv').config();
const db = require('./database/index');
const {query} = require('./database/index');
const {scrapProjects} = require('./src/upwork/index');
const {scrapWorkanaProjects} = require('./src/workana/index');



async function init () {

  scrapWorkanaProjects()
  
}

init();

