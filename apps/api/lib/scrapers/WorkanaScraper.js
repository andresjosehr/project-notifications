const BaseScraper = require('./BaseScraper');
const Project = require('../models/Project');
const logger = require('../utils/logger');
const { franc } = require('franc');

class WorkanaScraper extends BaseScraper {
  constructor() {
    super('workana');
  }

  detectLanguage(text) {
    try {
      if (!text || typeof text !== 'string' || text.trim().length < 10) {
        logger.debug('Text too short or invalid for language detection', { textLength: text ? text.length : 0 });
        return 'unknown';
      }

      const cleanText = text.trim();
      const langCode = franc(cleanText);
      
      logger.debug('Language detection result', { 
        textSample: cleanText.substring(0, 50),
        detectedCode: langCode 
      });
      
      // Map franc language codes to our desired format
      const languageMap = {
        'spa': 'es',
        'eng': 'en',
        'und': 'unknown' // undetermined
      };

      const result = languageMap[langCode] || 'unknown';
      logger.debug('Final language mapping', { langCode, result });
      
      return result;
    } catch (error) {
      logger.warn('Error detecting language', { 
        error: error.message,
        stack: error.stack,
        textLength: text ? text.length : 0
      });
      return 'unknown';
    }
  }

  getUrl() {
    return 'https://www.workana.com/jobs?category=it-programming&language=en%2Ces';
  }

  getProjectSelector() {
    return '.project-item';
  }

  async scrapeProjects() {
    logger.info('Scraping projects is starting');
    try {
      await this.page.waitForSelector(this.getProjectSelector());
      
      // Expandir detalles de proyectos
      await this.expandProjectDetails();
      
      const projects = await this.page.$$eval(this.getProjectSelector(), (elements) => {
        return elements.map((element) => {
          try {
            const titleElement = element.querySelector('.project-title span span');
            const title = titleElement?.getAttribute('title') || titleElement?.innerText || '';
            
            let description = element.querySelector('.project-details p')?.textContent || '';
            description = description.replace('Ver menos', '').replace('Ver más', '').trim();
            
            const priceElement = element.querySelector('.budget span span');
            const price = priceElement?.innerHTML || priceElement?.innerText || '';
            
            const linkElement = element.querySelector('.project-title a');
            let link = linkElement?.href || '';
            
            // Limpiar URL
            link = link.split('?')[0];
            
            // Limpiar descripción
            description = description.split('Categoría: ')[0];
            description = description.split('Category: ')[0];
            description = description.trim();
            
            // Extraer skills
            const skillElements = element.querySelectorAll('.skills .skill h3');
            let skills = Array.from(skillElements).map(skill => skill.textContent.trim()).join(', ')

            // Check if skills is array
            if(Array.isArray(skills)){
              skills = ''
            }
            
            // Extraer información del cliente
            let clientName = '';
            let clientCountry = '';
            let clientRating = 0;
            let paymentVerified = false;
            
            // Intentar múltiples selectores para el nombre del cliente
            const clientNameElement = element.querySelector('.author-info a span');
            if (clientNameElement) {
              clientName = clientNameElement.textContent.trim();
            }
            
            // Intentar múltiples selectores para el país
            const countryElement = element.querySelector('.project-author .country .country-name a') ||
                                 element.querySelector('.country .country-name a') ||
                                 element.querySelector('.country-name a');
            if (countryElement) {
              clientCountry = countryElement.textContent.trim();
            }
            
            // Extraer rating del cliente (del data-content del popover)
            const popoverElement = element.querySelector('.project-author .author-info .js-popover-stay') ||
                                 element.querySelector('.author-info .js-popover-stay') ||
                                 element.querySelector('.js-popover-stay');
            
            if (popoverElement) {
              const popoverContent = popoverElement.getAttribute('data-content') || '';
              
              // Buscar rating en el contenido del popover
              const ratingMatch = element.querySelector('.stars-bg');
              if (ratingMatch) {
                // get title attribute value
                clientRating = parseFloat(ratingMatch.getAttribute('title'));
              }
              
              // Verificar si el método de pago está verificado
              paymentVerified = popoverContent.includes('Método de pago:') && popoverContent.includes('Verificado');
            }
            
            // También verificar si está verificado directamente en el DOM visible
            if (!paymentVerified) {
              const paymentVerifiedElement = element.querySelector('.payment-verified') || 
                                           element.querySelector('.payment .payment-verified');
              paymentVerified = paymentVerifiedElement !== null;
            }
            
            // Verificar si es proyecto destacado
            const isFeatured = element.classList.contains('project-item-featured');
            
            // Verificar si es proyecto max
            const isMaxProject = element.querySelector('.label-max') !== null;
            
            // Debug logging para entender qué está pasando
            console.log('Project extraction debug:', {
              title: title.substring(0, 50),
              clientName,
              clientCountry,
              clientRating,
              paymentVerified,
              isFeatured,
              isMaxProject,
              hasProjectAuthor: !!element.querySelector('.project-author'),
              hasAuthorInfo: !!element.querySelector('.author-info'),
              hasPopover: !!element.querySelector('.js-popover-stay')
            });
            
            return {
              title,
              description,
              price,
              skills,
              link,
              client_name: clientName,
              client_country: clientCountry,
              client_rating: clientRating,
              payment_verified: paymentVerified,
              is_featured: isFeatured,
              is_max_project: isMaxProject,
              platform: 'workana',
              titleAndDescription: title + ' ' + description
            };
          } catch (error) {
            console.error('Error parsing individual project:', error);
            return null;
          }
        }).filter(Boolean);
      });

      logger.info('Projects scraped, now we are going to detect the language');
      
      const projectInstances = projects.map(projectData => {
        // Detect language from title and description
        const textForLanguageDetection = projectData.titleAndDescription;
        
        const language = this.detectLanguage(textForLanguageDetection);
        
        // Remove the temporary field and add language
        const finalProjectData = {
          ...projectData,
          language: language
        };
        delete finalProjectData.titleAndDescription;
        
        return new Project(finalProjectData);
      });
            
      return projectInstances;
    } catch (error) {
      logger.errorWithStack(`Error scrapeando proyectos de ${this.platform}`, error);
      throw error;
    }
  }

  async expandProjectDetails() {
    try {
      // Expandir todos los links "Ver más detalles"
      await this.page.$$eval(this.getProjectSelector(), (projects) => {
        projects.forEach(project => {
          // Buscar el link "Ver más detalles" en el párrafo de la descripción
          const viewMoreLink = project.querySelector('.project-details p a[href="#"]');
          if (viewMoreLink && (viewMoreLink.innerText.includes('Ver más') 
            || viewMoreLink.innerText.includes('Ver más detalles')
            || viewMoreLink.innerText.includes('View more')
            || viewMoreLink.innerText.includes('View more details')
          )) {
            viewMoreLink.click();
          }
        });
      });
      
      // Esperar un poco para que se expandan los detalles
      await this.page.waitForTimeout(2000);
      
      logger.scraperLog(this.platform, 'Detalles de proyectos expandidos');
    } catch (error) {
      logger.warn(`Error expandiendo detalles de proyectos en ${this.platform}`, error);
    }
  }

  async waitForProjects() {
    try {
      await this.page.waitForSelector(this.getProjectSelector(), { timeout: 10000 });
      return true;
    } catch (error) {
      logger.warn(`No se encontraron proyectos en ${this.platform} o timeout`, error);
      return false;
    }
  }

  async simulateHumanBehavior() {
    try {
      // Comportamiento específico para Workana
      await super.simulateHumanBehavior();
      
      // Esperar a que se carguen los proyectos
      const projectsFound = await this.waitForProjects();
      
      if (projectsFound) {
        // Scroll más suave para Workana
        const scrollActions = 3;
        for (let i = 0; i < scrollActions; i++) {
          const scrollDownAmount = this.getRandomInt(200, 600);
          await this.page.mouse.wheel(0, scrollDownAmount);
          
          const randomWait = this.getRandomInt(2000, 5000);
          await this.page.waitForTimeout(randomWait);
          
          const scrollUpAmount = this.getRandomInt(50, 200);
          await this.page.mouse.wheel(0, -scrollUpAmount);
        }
        
        logger.scraperLog(this.platform, 'Comportamiento humano específico de Workana completado');
      }
      
    } catch (error) {
      logger.errorWithStack(`Error en simulación de comportamiento humano para ${this.platform}`, error);
      throw error;
    }
  }

  cleanProjectData(projectData) {
    // Limpieza específica para datos de Workana
    return {
      ...projectData,
      title: projectData.title?.trim() || '',
      description: projectData.description?.trim() || '',
      link: projectData.link?.split('?')[0] || '', // Remover query params
      price: projectData.price?.trim() || '',
      skills: Array.isArray(projectData.skills) ? '' : (projectData.skills?.trim() || ''),
      client_name: projectData.clientName?.trim() || '',
      language: projectData.language || 'unknown',
      client_country: projectData.clientCountry?.trim() || '',
      client_rating: projectData.clientRating || 0,
      payment_verified: projectData.paymentVerified || false,
      is_featured: projectData.isFeatured || false,
      is_max_project: projectData.isMaxProject || false,
      info: ''
    };
  }

  async execute() {
    try {
      logger.scraperLog(this.platform, 'Iniciando proceso de scraping');
      
      await this.initialize();
      await this.navigateTo(this.getUrl());
      await this.simulateHumanBehavior();
      // await this.takeScreenshot(`${this.platform}-scraping`);
      
      const projects = await this.scrapeProjects();
      
      // Limpiar datos de proyectos
      const cleanedProjects = projects.map(project => {
        const cleaned = this.cleanProjectData(project );
        return new Project(cleaned);
      });
      
      await this.close();
      
      logger.scraperLog(this.platform, `Proceso completado: ${cleanedProjects.length} proyectos`);
      
      return cleanedProjects;
    } catch (error) {
      logger.errorWithStack(`Error ejecutando scraper de ${this.platform}`, error);
      await this.close();
      throw error;
    }
  }
}

module.exports = WorkanaScraper; 