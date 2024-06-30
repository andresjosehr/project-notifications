const puppeteer = require('puppeteer');
const userAgent = require('user-agents');
const fs = require('fs');
const playwright = require('playwright');
const { query } = require('../../database/index');
const {sendTelegramNotification} = require('../telegram/notification');
const {translateToSpanish} = require('../ai/ai');

//import playwright
const {chromium} = require("playwright-extra");
//import stealth
const stealth = require("puppeteer-extra-plugin-stealth")();


const sendWorkanaBid = async (req, res) => {
  
  chromium.use(stealth);

  const browser = await chromium.launch({
    headless: false,
  });

  // Cargar la sesión existente
  const storageState = JSON.parse(fs.readFileSync('playwright/.auth/workana.json'));
  const context = await browser.newContext({ storageState });

  const page = await context.newPage();


  const pageUrl = "https://www.workana.com/job/emigracion-de-hosting";

  const lastPath = pageUrl.split('/').pop();

  const bidPage = `https://www.workana.com/messages/bid/${lastPath}/?tab=message&ref=project_view`


  await page.goto(pageUrl);
  
  await page.waitForSelector('.wk-user-info');
  
  const name = await page.$$eval('.wk-user-info a span', name => {
    return name[0].textContent.split(' ')[0];
  });
  
  await page.goto(bidPage);
  const bid = process.env.BID.replace('{client_name}', name)
  

  await page.type('textarea', bid);


  await page.click('input[value="Enviar"]');

  await browser.close(); 
};


function encodeNewlines(text) {
  return text.replace(/\r\n|\n/g, '%0A');
}

function getRandomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}







module.exports = {
  sendWorkanaBid
};
