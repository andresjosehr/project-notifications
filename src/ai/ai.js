const axios = require("axios");

const buildProposal = async () => { 
  // Get id path param
  const { id } = req.params;

  const table = {
    workana: 'projects',
    upwork: 'upwork_projects'
  }
  
  if(!id) {
    res.status(400).json({ error: 'Id is required' });
  }

  const project = await query('SELECT * FROM '+ table[req.params.platform] + ' WHERE id = ?', [id]);


  if(!project.length) {
    return res.status(404).json({ error: 'Project not found' });
  }


  const body = {
    "model": "llama3-70b-8192",
    "stream": false,
    "messages": [
        {
            "role": "system",
            "content": "You are a helpful AI assistant. Today is Wed May 01 2024, local time is 17:57:54 GMT-0400 (hora de Venezuela).\nIf you need to display math symbols and expressions, put them in double dollar signs \"$$\" (example: $$ x - 1 $$)"
        },
        {
            "role": "user",
            "content": "Necesito que redactes una propuesta en español para un requerimiento que debe tener la siguiente estructura:\n\n1) Introducción (Desarrollador web con 8 años de experiencia en Angular, Laravel y Wordpress).\n2) De que manera la experiencia y los proyectos realizados ayudan a tener una compresión del requerimiento y aportan valor.\n3) De que manera se abordará el requerimiento y que tecnologias se utilizarán (Angular, Laravel, PHP, Typescript, Javascript, Wordpress)\n4) Por que deberian elegirte a ti para el proyecto.\n5) Pregunta corta al cliente sobre algun aspecto del proyecto que tenga que ver con enteder mas a fondo algun aspecto del requerimiento\n\nPuntos a tener en cuenta\n\n2) Debe estar escrita en un tono humano y profesional, sin entusiasmo\n3) No se debe hablar de \"usted\" sino de \"tu\"\n4) La propuesta siempre debe empezar con \"Hola, soy desarrollador de software con mas de 8 años de experiencia...\n6) Evita usar verbos en futuro como \"Utilizaré\" o \"Desarrollare\", en su lugar utiliza \"Utilizaria\" y \"Desarrollaria\"\n6) Menciona por que eres el indicado para el proyecto mencionando e invitando al cliente a revisar el portafolio de proyectos en el perfil de workana\n6) Evita la palabra \"Creo\" o \"Yo creo\" ya que denotan inseguridad\n            \nEl requerimiento es el siguiente:\n\n " + project[0].description
        }
    ]
}

  // MAKE AXIOS REQUEST
  const completion = await axios.post('https://api.groq.com/openai/v1/chat/completions', body, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROP_API_KEY}`
    }
  });

    
  if(completion.status != 200) {
    return res.status(500).json({ error: completion.data });
  }

  const text =  completion.data.choices[0].message.content;

  // Close browser

  // return text (not json and include break lines)
  res.set('Content-Type', 'text/plain');


  return res.status(200).send(text);
}


const translateToSpanish = async (text) => { 



  const body = {
    "model": "llama3-70b-8192",
    "stream": false,
    "messages": [
        {
            "role": "system",
            "content": "You are a helpful AI assistant. Today is Sun Jun 09 2024, local time is 16:56:26 GMT-0400 (hora de Venezuela).\nIf you need to display math symbols and expressions, put them in double dollar signs \"$$\" (example: $$ x - 1 $$)"
        },
        {
            "role": "user",
            "content": "Traduce al español el siguiente texto:\n\n" + text
        }
    ]
}

  // MAKE AXIOS REQUEST
  const completion = await axios.post('https://api.groq.com/openai/v1/chat/completions', body, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.GROP_API_KEY}`
    }
  });

    
  if(completion.status != 200) {
    return `Ha ocurrido un error inesperado: ${completion.data} El texto a traducir es: ${text}`;
  }

  return completion.data.choices[0].message.content;
}


module.exports = {buildProposal, translateToSpanish};