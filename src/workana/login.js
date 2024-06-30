const { chromium } = require('playwright'); 
// Import expect from playwright
const fs = require('fs');

const loginWorkana = async () => {
  const browser = await chromium.launch({
    headless: false,
  
  });

  const authFile = 'playwright/.auth/workana.json';

  // No necesitas especificar proxy nuevamente en newContext
  const context = await browser.newContext();

  const page = await context.newPage();

  // Navegar a la página de inicio de sesión de Workana
  await page.goto('https://www.workana.com/login');

  await page.waitForLoadState("networkidle");

  // wait for #onetrust-accept-btn-handler
  await page.waitForSelector('#onetrust-accept-btn-handler');
  await page.click('#onetrust-accept-btn-handler');

  // Esperar a que los campos de login estén cargados
  await page.waitForSelector('input[name="email"]');
  await page.waitForSelector('input[name="password"]');

  // Await 5 seconds
  await page.waitForTimeout(5000);

  // Ingresar las credenciales de inicio de sesión
  await page.type('input[name="email"]', 'interlinevzla@gmail.com', { delay: 100 });
  await page.type('input[name="password"]', 'Paralelepipe2', { delay: 100 });

  await page.waitForTimeout(5000);

  // Hacer clic en el botón de inicio de sesión
  await page.click('button[type="submit"]');

  // Esperar a que la navegación después del inicio de sesión esté completa
  await page.waitForURL('https://www.workana.com/dashboard');

  await page.context().storageState({ path: authFile});

  await browser.close();
};
exports.loginWorkana = loginWorkana;