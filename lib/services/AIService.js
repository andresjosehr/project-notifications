const axios = require('axios');
const config = require('../config');
const logger = require('../utils/logger');

class AIService {
  constructor() {
    this.apiKey = config.ai.apiKey;
    this.model = config.ai.model;
    this.apiUrl = config.ai.apiUrl;
    this.defaultTimeout = 30000;
  }

  async makeRequest(messages, options = {}) {
    try {
      const requestBody = {
        model: options.model || this.model,
        stream: false,
        messages: messages,
        ...options
      };

      logger.aiLog('Enviando solicitud a API de IA', { 
        model: requestBody.model,
        messageCount: messages.length 
      });

      const response = await axios.post(this.apiUrl, requestBody, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: this.defaultTimeout
      });

      if (response.status !== 200) {
        throw new Error(`API respondió con status ${response.status}: ${response.data}`);
      }

      const content = response.data.choices[0].message.content;
      
      logger.aiLog('Respuesta recibida de API de IA', { 
        responseLength: content.length,
        tokensUsed: response.data.usage?.total_tokens || 'N/A'
      });

      return content;
    } catch (error) {
      logger.errorWithStack('Error en solicitud a API de IA', error);
      throw error;
    }
  }

  async buildProposal(projectDescription, options = {}) {
    try {
      const systemPrompt = `You are a helpful AI assistant. Today is ${new Date().toLocaleDateString()}, local time is ${new Date().toLocaleTimeString()}.
If you need to display math symbols and expressions, put them in double dollar signs "$$" (example: $$ x - 1 $$)`;

      const userPrompt = `Necesito que redactes una propuesta en español para un requerimiento que debe tener la siguiente estructura:

1) Introducción (Desarrollador web con 8 años de experiencia en Angular, Laravel y Wordpress).
2) De que manera la experiencia y los proyectos realizados ayudan a tener una compresión del requerimiento y aportan valor.
3) De que manera se abordará el requerimiento y que tecnologias se utilizarán (Angular, Laravel, PHP, Typescript, Javascript, Wordpress)
4) Por que deberian elegirte a ti para el proyecto.
5) Pregunta corta al cliente sobre algun aspecto del proyecto que tenga que ver con enteder mas a fondo algun aspecto del requerimiento

Puntos a tener en cuenta:

2) Debe estar escrita en un tono humano y profesional, sin entusiasmo
3) No se debe hablar de "usted" sino de "tu"
4) La propuesta siempre debe empezar con "Hola, soy desarrollador de software con mas de 8 años de experiencia...
6) Evita usar verbos en futuro como "Utilizaré" o "Desarrollare", en su lugar utiliza "Utilizaria" y "Desarrollaria"
6) Menciona por que eres el indicado para el proyecto mencionando e invitando al cliente a revisar el portafolio de proyectos en el perfil de workana
6) Evita la palabra "Creo" o "Yo creo" ya que denotan inseguridad
            
El requerimiento es el siguiente:

${projectDescription}`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];

      const proposal = await this.makeRequest(messages, options);
      
      logger.aiLog('Propuesta generada exitosamente', { 
        projectLength: projectDescription.length,
        proposalLength: proposal.length
      });

      return proposal;
    } catch (error) {
      logger.errorWithStack('Error generando propuesta', error);
      throw error;
    }
  }

  async generateProposalWithProfile(projectTitle, projectDescription, options = {}) {
    try {
      const professionalProfile = process.env.PROFESIONAL_PROFILE;
      const proposalDirectives = process.env.PROPOSAL_DIRECTIVES;


      
      if (!professionalProfile) {
        throw new Error('PROFESIONAL_PROFILE no está configurado en el .env');
      }
      
      if (!proposalDirectives) {
        throw new Error('PROPOSAL_DIRECTIVES no está configurado en el .env');
      }

      const systemPrompt = `Eres un asistente especializado en redactar propuestas profesionales para proyectos freelance. 
Tu tarea es generar una propuesta personalizada basada en el perfil profesional y las directrices proporcionadas.`;

      const userPrompt = `Basándote en el siguiente perfil profesional y las directrices de propuesta, redacta una propuesta personalizada para el proyecto.

PERFIL PROFESIONAL:
${professionalProfile}

INFORMACIÓN DEL PROYECTO:
Título: ${projectTitle}
Descripción: ${projectDescription}

DIRECTRICES DE LA PROPUESTA:
${proposalDirectives}`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];

      const proposal = await this.makeRequest(messages, options);
      
      logger.aiLog('Propuesta con perfil generada exitosamente', { 
        projectTitleLength: projectTitle.length,
        projectDescriptionLength: projectDescription.length,
        proposalLength: proposal.length
      });

      return proposal;
    } catch (error) {
      logger.errorWithStack('Error generando propuesta con perfil', error);
      throw error;
    }
  }

  async translateToSpanish(text, options = {}) {
    try {
      const systemPrompt = `You are a helpful AI assistant. Today is ${new Date().toLocaleDateString()}, local time is ${new Date().toLocaleTimeString()}.
If you need to display math symbols and expressions, put them in double dollar signs "$$" (example: $$ x - 1 $$)`;

      const userPrompt = `Traduce al español el siguiente texto:\n\n${text}`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];

      const translation = await this.makeRequest(messages, options);
      
      logger.aiLog('Traducción completada', { 
        originalLength: text.length,
        translationLength: translation.length
      });

      return translation;
    } catch (error) {
      logger.errorWithStack('Error en traducción', error);
      
      // Fallback: devolver texto original con mensaje de error
      const fallbackText = `Ha ocurrido un error inesperado en la traducción: ${error.message}. 

El texto original es: ${text}`;
      
      logger.warn('Devolviendo texto original como fallback');
      return fallbackText;
    }
  }

  async generateCustomPrompt(prompt, context = '', options = {}) {
    try {
      const systemPrompt = `You are a helpful AI assistant. Today is ${new Date().toLocaleDateString()}, local time is ${new Date().toLocaleTimeString()}.
${context}`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt }
      ];

      const response = await this.makeRequest(messages, options);
      
      logger.aiLog('Prompt personalizado procesado', { 
        promptLength: prompt.length,
        responseLength: response.length
      });

      return response;
    } catch (error) {
      logger.errorWithStack('Error procesando prompt personalizado', error);
      throw error;
    }
  }

  async summarizeText(text, maxWords = 100, options = {}) {
    try {
      const prompt = `Resume el siguiente texto en máximo ${maxWords} palabras, manteniendo los puntos más importantes:

${text}`;

      const summary = await this.generateCustomPrompt(prompt, '', options);
      
      logger.aiLog('Texto resumido', { 
        originalLength: text.length,
        summaryLength: summary.length,
        maxWords
      });

      return summary;
    } catch (error) {
      logger.errorWithStack('Error resumiendo texto', error);
      throw error;
    }
  }

  async extractKeywords(text, maxKeywords = 10, options = {}) {
    try {
      const prompt = `Extrae las ${maxKeywords} palabras clave más importantes del siguiente texto, separadas por comas:

${text}`;

      const keywords = await this.generateCustomPrompt(prompt, '', options);
      
      logger.aiLog('Palabras clave extraídas', { 
        textLength: text.length,
        keywordsLength: keywords.length,
        maxKeywords
      });

      return keywords.split(',').map(k => k.trim()).filter(k => k);
    } catch (error) {
      logger.errorWithStack('Error extrayendo palabras clave', error);
      throw error;
    }
  }

  // Método para verificar el estado del servicio
  async healthCheck() {
    try {
      const testPrompt = "Di 'OK' si me puedes escuchar";
      const response = await this.generateCustomPrompt(testPrompt);
      
      const isHealthy = response.toLowerCase().includes('ok');
      
      logger.aiLog('Health check completado', { 
        isHealthy,
        response: response.substring(0, 100) 
      });

      return { healthy: isHealthy, response };
    } catch (error) {
      logger.errorWithStack('Error en health check de AI', error);
      return { healthy: false, error: error.message };
    }
  }
}

module.exports = new AIService(); 