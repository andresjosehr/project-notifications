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
    headless: false,
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
      let projectDetails = project.querySelector('.project-details p').textContent.replace('  Ver menos', '');
      const price = project.querySelector('.budget span span').innerHTML;
      let link = project.querySelector('.project-title a').href;
      // Remove all after "?"
      link = link.split('?')[0];

      return {
        title: title,
        projectDetails: projectDetails,
        projectDetailsType: typeof projectDetails,
        price: price,
        link: link
      }
    });
  });
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
