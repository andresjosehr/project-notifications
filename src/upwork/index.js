const puppeteer = require('puppeteer');
const userAgent = require('user-agents');
const fs = require('fs').promises;
const playwright = require('playwright');
const { query } = require('../../database/index');
const {sendTelegramNotification} = require('../telegram/notification');
const {translateToSpanish} = require('../ai/ai');

//import playwright
const {chromium} = require("playwright-extra");
//import stealth
const stealth = require("puppeteer-extra-plugin-stealth")();



const scrapProjects = async (count) => {

  chromium.use(stealth);

  const browser = await chromium.launch({
    headless: true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  

  await page.goto('https://www.upwork.com/nx/search/jobs/?per_page=50&q=web&sort=recency')

   //wait until the page has loaded
   await page.waitForLoadState("networkidle");
   //we will look at 5 random spots on the page
   var scrollActionsCount = 5;
   //while our count is great than zero
   while (scrollActionsCount > 0) {
       //generate a random amount to scroll down
       const scrollDownAmount = getRandomInt(10, 1000);
       //scroll down by the random amount
       await page.mouse.wheel(0, scrollDownAmount);
       //create a random wait time between 1 and 10 seconds
       const randomWait = getRandomInt(1000, 10000);
       //create a random amount to scroll back up the page
       const scrollUpAmount = 0 - getRandomInt(10, 1000);
       //wait the randomWait time that we created
       await page.waitForTimeout(randomWait);
       //scroll up by the random amount
       await page.mouse.wheel(0, scrollUpAmount);
       //decrement the scrollActionsCount
       scrollActionsCount--
   }

  //  screenshot
  await page.screenshot({ path: 'example.png' });

  


  const upwork_projects = await query('SELECT * FROM upwork_projects');

  const projects = await page.$$eval('.job-tile', (projects) => {
    console.log(projects);
    return projects.map((project) => {
      console.log(project);
      const title = project.querySelector('.up-n-link')?.innerText;
      const description = project.querySelector('.text-body-sm .air3-line-clamp.is-clamped')?.innerText;
      let info = project.querySelector('.job-tile-info-list');
      // insert %0A between each text in tag
      // Iterate for each li
      info = Array.from(info.querySelectorAll('li')).map((li) => {
        return li.innerText;
      }).join('%0A');
      // 
      const skills = Array.from(project.querySelectorAll('.air3-token-container')).map((skill) => skill?.innerText);
      
      const link =  project.querySelector('.up-n-link')?.href;
      return {
        title,
        description,
        info,
        skills,
        link
      };
    });

    
  });

  const newProjects = projects.filter(function(project) {
    return !upwork_projects.find(function(p) {
      return p.title === project.title && p.link === project.link;
    });
  });


  for (let project of newProjects) {
    try{
    await query('INSERT INTO upwork_projects (title, description, link) VALUES (?, ?, ?)', [project.title, project.description, project.link]);

    if(count > 0) {
    // Get last inserted project
    const project_id = await query('SELECT id FROM upwork_projects ORDER BY id DESC LIMIT 1');

    project.description = project.description;

    let text = `UPWORK \n\n${project.info} \n ${project.title} \n\n ${project.description}`;
    // Remove all line breaks
    

    text = await translateToSpanish(text);

    text = encodeNewlines(text);


    text = text + `%0A %0A ${project.link} %0A %0A Propuesta: https://workana-notifications.andresjosehr.com/build-bid/${project_id[0].id}/upwork`

    sendTelegramNotification(text, 'andresjosehr');
  }

  } catch (error) {
    console.log('Error fetching project');
    console.log(error);
  }
    
    
  }


  await browser.close();

  // res.json(projects);
  

};


function encodeNewlines(text) {
  return text.replace(/\r\n|\n/g, '%0A');
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}







module.exports = {
  scrapProjects
};
