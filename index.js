require('dotenv').config();
const db = require('./database/index');
const {query} = require('./database/index');
const {scrapProjects} = require('./src/upwork/index');



async function init () {

let count = 0;
while(true) {
    await scrapProjects(count);
    
    // Await 1 minute and console.log each second
    // Between 60 and 90
    let random = Math.floor(Math.random() * (90 - 60)) + 60;
    console.log(`Waiting ${random} seconds`);
    for(let i = 0; i < random; i++) {
      console.log(i);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    count++;
  }
  
}

init();

