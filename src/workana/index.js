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


const scrapWorkanaProjects = async (req, res) => {
  
  chromium.use(stealth);

  const browser = await chromium.launch({
    headless: true,
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.workana.com/jobs?category=it-programming&language=en%2Ces');
  await page.waitForLoadState("networkidle");

  // Esperar 10 segundos.
  // await new Promise(resolve => setTimeout(resolve, 10000));

  // Tomar un pantallazo.
  await page.screenshot({ path: 'workana.png' });

  // Await .project-item selector
  await page.waitForSelector('.project-item');


  await page.$$eval('.project-item', projects => {
    projects.map(project => {
      const viewMore = project.querySelector('.project-details a.link.small');      
      if(viewMore) {
        viewMore.click();
      }
    });
  });



  // Evaluar y extraer la información de los proyectos.
  const projects = await page.$$eval('.project-item', projects => {
    return projects.map(project => {
      const title = project.querySelector('.project-title span span').getAttribute('title');
      let description = project.querySelector('.project-details p').textContent.replace('  Ver menos', '');
      const price = project.querySelector('.budget span span').innerHTML;
      let link = project.querySelector('.project-title a').href;
      // Remove all after "?"
      link = link.split('?')[0];

      description = description.split('Categoría: ')[0];
      return {
        title: title,
        description: description,
        price: price,
        link: link
      }
    });
  });
  
  

  const workana_projects = await query('SELECT * FROM workana_projects WHERE link IN (?)', [projects.map(project => project.link)]);

  const newProjects = projects.filter(project => {
    return workana_projects.find(workana_project => workana_project.link === project.link) === undefined;
  });

  // Insert into database
  if(newProjects.length > 0) {
    await query('INSERT INTO workana_projects (title, description, price, link) VALUES ?', [newProjects.map(project => [project.title, project.description, project.price, project.link])]);
  }

  newProjects.forEach(async project => {
    let text = `WORKANA  Enviar Propuesta: tatatata`;

    await sendTelegramNotification(text, 'andresjosehr');
    
  });


  // Close browser
  await browser.close();


};


function encodeNewlines(text) {
  return text.replace(/\r\n|\n/g, '%0A');
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}







module.exports = {
  scrapWorkanaProjects
};
