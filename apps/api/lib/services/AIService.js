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
      // Filtrar solo los campos válidos para la API de Groq
      const validOptions = {};
      if (options.model) validOptions.model = options.model;
      if (options.temperature !== undefined) validOptions.temperature = options.temperature;
      if (options.max_tokens !== undefined) validOptions.max_tokens = options.max_tokens;
      if (options.top_p !== undefined) validOptions.top_p = options.top_p;
      if (options.frequency_penalty !== undefined) validOptions.frequency_penalty = options.frequency_penalty;
      if (options.presence_penalty !== undefined) validOptions.presence_penalty = options.presence_penalty;

      const requestBody = {
        model: validOptions.model || this.model,
        stream: false,
        messages: messages,
        ...validOptions
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
      const language = options.language || 'es';
      const targetLanguage = this._getTargetLanguage(language);
      
      const systemPrompt = `You are a helpful AI assistant. Today is ${new Date().toLocaleDateString()}, local time is ${new Date().toLocaleTimeString()}.
If you need to display math symbols and expressions, put them in double dollar signs "$$" (example: $$ x - 1 $$)`;

      const userPrompt = `Necesito que redactes una propuesta en ${targetLanguage} para un requerimiento que debe tener la siguiente estructura:

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
7) IMPORTANTE: La propuesta debe estar escrita completamente en ${targetLanguage}
            
El requerimiento es el siguiente:

${projectDescription}`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];

      const proposal = await this.makeRequest(messages, options);
      
      logger.aiLog('Propuesta generada exitosamente', { 
        projectLength: projectDescription.length,
        proposalLength: proposal.length,
        language: language,
        targetLanguage: targetLanguage
      });

      return proposal;
    } catch (error) {
      logger.errorWithStack('Error generando propuesta', error);
      throw error;
    }
  }


  async generateProposalWithUserProfile(projectTitle, projectDescription, userProfile, userDirectives, options = {}) {
    try {
      if (!userProfile) {
        throw new Error('Perfil profesional del usuario no proporcionado');
      }
      
      if (!userDirectives) {
        throw new Error('Directrices de propuesta del usuario no proporcionadas');
      }

      const language = options.language || 'es';
      const targetLanguage = this._getTargetLanguage(language);

      const systemPrompt = `Eres un asistente especializado en redactar propuestas profesionales para proyectos freelance. 
Tu tarea es generar una propuesta personalizada basada en el perfil profesional y las directrices proporcionadas.
IMPORTANTE: La propuesta debe estar escrita completamente en ${targetLanguage}.`;

      const userPrompt = `Basándote en el siguiente perfil profesional y las directrices de propuesta, redacta una propuesta personalizada para el proyecto en ${targetLanguage}.

PERFIL PROFESIONAL:
${userProfile}

INFORMACIÓN DEL PROYECTO:
Título: ${projectTitle}
Descripción: ${projectDescription}

DIRECTRICES DE LA PROPUESTA:
${userDirectives}

IMPORTANTE: La propuesta debe estar escrita completamente en ${targetLanguage}.`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ];

      const proposal = await this.makeRequest(messages, options);
      
      logger.aiLog('Propuesta con perfil de usuario generada exitosamente', { 
        projectTitleLength: projectTitle.length,
        projectDescriptionLength: projectDescription.length,
        proposalLength: proposal.length,
        language: language,
        targetLanguage: targetLanguage
      });

      // Now request to translate the proposal to the target language
      const prompt = `Traduce la siguiente propuesta al idioma ${targetLanguage}, responde solamente con la propuesta traducida en ${targetLanguage}, no respondas nada mas:
      ${proposal}`;
      const translatedProposal = await this.makeRequest([{ role: "user", content: prompt }], options);
      return translatedProposal;

      return proposal;
    } catch (error) {
      logger.errorWithStack('Error generando propuesta con perfil de usuario', error);
      throw error;
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
      
      // Verificar tanto respuestas en español como en inglés
      const isHealthy = response.toLowerCase().includes('ok') || 
                       response.toLowerCase().includes('sí') || 
                       response.toLowerCase().includes('si') ||
                       response.toLowerCase().includes('escuchar') ||
                       response.toLowerCase().includes('puedo');
      
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

  // Método auxiliar para convertir códigos de idioma a nombres completos
  _getTargetLanguage(languageCode) {
    const languageMap = {
      'es': 'español',
      'en': 'inglés',
      'pt': 'portugués',
      'fr': 'francés',
      'de': 'alemán',
      'it': 'italiano',
      'nl': 'holandés',
      'ru': 'ruso',
      'zh': 'chino',
      'ja': 'japonés',
      'ko': 'coreano',
      'ar': 'árabe',
      'hi': 'hindi',
      'tr': 'turco',
      'pl': 'polaco',
      'sv': 'sueco',
      'da': 'danés',
      'no': 'noruego',
      'fi': 'finlandés',
      'cs': 'checo',
      'sk': 'eslovaco',
      'hu': 'húngaro',
      'ro': 'rumano',
      'bg': 'búlgaro',
      'hr': 'croata',
      'sl': 'esloveno',
      'et': 'estonio',
      'lv': 'letón',
      'lt': 'lituano',
      'mt': 'maltés',
      'el': 'griego',
      'cy': 'galés',
      'ga': 'irlandés',
      'is': 'islandés',
      'fo': 'feroés',
      'sq': 'albanés',
      'mk': 'macedonio',
      'sr': 'serbio',
      'bs': 'bosnio',
      'me': 'montenegrino',
      'uk': 'ucraniano',
      'be': 'bielorruso',
      'kk': 'kazajo',
      'uz': 'uzbeko',
      'ky': 'kirguís',
      'tg': 'tayiko',
      'mn': 'mongol',
      'ka': 'georgiano',
      'hy': 'armenio',
      'az': 'azerí',
      'tk': 'turcomano',
      'gl': 'gallego',
      'eu': 'vasco',
      'ca': 'catalán',
      'oc': 'occitano',
      'br': 'bretón',
      'gd': 'gaélico escocés',
      'gv': 'manés',
      'kw': 'córnico',
      'fur': 'friulano',
      'sc': 'sardo',
      'rm': 'romanche',
      'lb': 'luxemburgués',
      'fy': 'frisón',
      'af': 'afrikáans',
      'sw': 'suajili',
      'zu': 'zulú',
      'xh': 'xhosa',
      'st': 'sesoto',
      'tn': 'setswana',
      'ts': 'tsonga',
      've': 'venda',
      'nr': 'ndebele del sur',
      'ss': 'siswati',
      'sn': 'shona',
      'ny': 'chichewa',
      'mg': 'malgache',
      'rw': 'kinyarwanda',
      'lg': 'luganda',
      'ak': 'akan',
      'tw': 'twi',
      'ee': 'ewe',
      'yo': 'yoruba',
      'ig': 'igbo',
      'ha': 'hausa',
      'ff': 'fula',
      'wo': 'wolof',
      'bm': 'bambara',
      'dy': 'dyula',
      'kr': 'kanuri',
      'ne': 'nepalí',
      'bn': 'bengalí',
      'ta': 'tamil',
      'te': 'telugu',
      'ml': 'malayalam',
      'kn': 'canarés',
      'gu': 'gujarati',
      'pa': 'punjabi',
      'or': 'oriya',
      'as': 'asamés',
      'mr': 'marathi',
      'sa': 'sánscrito',
      'si': 'cingalés',
      'my': 'birmano',
      'km': 'jemer',
      'lo': 'lao',
      'th': 'tailandés',
      'vi': 'vietnamita',
      'id': 'indonesio',
      'ms': 'malayo',
      'tl': 'tagalo',
      'ceb': 'cebuano',
      'jv': 'javanés',
      'su': 'sundanés',
      'min': 'minangkabau',
      'bug': 'buginés',
      'ban': 'balinés',
      'mad': 'madurés',
      'ace': 'acehnés',
      'gor': 'gorontalo',
      'mak': 'makasar',
      'nij': 'ngaju',
      'bjn': 'banjar',
      'sun': 'sundanés',
      'jav': 'javanés',
      'ind': 'indonesio',
      'zsm': 'malayo estándar',
      'zlm': 'malayo malayo',
      'zmi': 'malayo indonesio',
      'zmm': 'malayo malayo',
      'zmn': 'malayo malayo',
      'zmo': 'malayo malayo',
      'zmp': 'malayo malayo',
      'zmq': 'malayo malayo',
      'zmr': 'malayo malayo',
      'zms': 'malayo malayo',
      'zmt': 'malayo malayo',
      'zmu': 'malayo malayo',
      'zmv': 'malayo malayo',
      'zmw': 'malayo malayo',
      'zmx': 'malayo malayo',
      'zmy': 'malayo malayo',
      'zmz': 'malayo malayo'
    };

    return languageMap[languageCode] || 'español'; // Por defecto español si no se reconoce el código
  }
}

module.exports = new AIService(); 