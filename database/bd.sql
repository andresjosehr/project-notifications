-- --------------------------------------------------------
-- Host:                         127.0.0.1
-- Versión del servidor:         8.0.42-0ubuntu0.24.04.1 - (Ubuntu)
-- SO del servidor:              Linux
-- HeidiSQL Versión:             12.10.0.7000
-- --------------------------------------------------------

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET NAMES utf8 */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

-- Volcando estructura para tabla projects.access_tokens
CREATE TABLE IF NOT EXISTS `access_tokens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `token` varchar(255) NOT NULL,
  `project_id` int NOT NULL,
  `platform` enum('workana','upwork') NOT NULL,
  `user_id` int NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `token` (`token`),
  KEY `idx_token` (`token`),
  KEY `idx_expires` (`expires_at`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `access_tokens_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla projects.access_tokens: ~0 rows (aproximadamente)

-- Volcando estructura para tabla projects.projects
CREATE TABLE IF NOT EXISTS `projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `title` longtext,
  `description` longtext,
  `price` longtext,
  `skills` longtext,
  `link` varchar(255) DEFAULT NULL,
  `platform` enum('workana','upwork') NOT NULL,
  `client_name` varchar(255) DEFAULT NULL,
  `client_country` varchar(100) DEFAULT NULL,
  `client_rating` decimal(3,2) DEFAULT NULL,
  `payment_verified` tinyint(1) DEFAULT '0',
  `is_featured` tinyint(1) DEFAULT '0',
  `is_max_project` tinyint(1) DEFAULT '0',
  `date` varchar(50) DEFAULT NULL,
  `time_ago` varchar(50) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla projects.projects: ~0 rows (aproximadamente)

-- Volcando estructura para tabla projects.users
CREATE TABLE IF NOT EXISTS `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `workana_email` varchar(255) NOT NULL,
  `workana_password` varchar(255) NOT NULL,
  `proposal_directives` longtext NOT NULL,
  `professional_profile` longtext NOT NULL,
  `telegram_user` varchar(255) NOT NULL,
  `workana_session_data` longtext,
  `session_expires_at` datetime DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  `system_password` varchar(255) NOT NULL,
  `role` enum('ADMIN','USER') NOT NULL DEFAULT 'USER',
  PRIMARY KEY (`id`),
  UNIQUE KEY `workana_email` (`workana_email`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla projects.users: ~0 rows (aproximadamente)
INSERT INTO `users` (`id`, `workana_email`, `workana_password`, `proposal_directives`, `professional_profile`, `telegram_user`, `workana_session_data`, `session_expires_at`, `created_at`, `updated_at`, `is_active`, `system_password`, `role`) VALUES
	(1, 'interlinevzla@gmail.com', 'Paralelepipe2', '1. Saludo personalizado\n\nDirígete al cliente por su nombre si está disponible\nEmpieza siempre con: \'Hola! un gusto saludarte. Mi nombre es Andres, soy desarrollador de software con 9 años de experiencia, cuento con una calificación impecable en workana y cuento con el nivel mas alto en la plataforma, He trabado...\'\n\n\n1 Tu propuesta de solución\n\nExplica cómo abordarás cada requerimiento\nDescribe tu metodología de trabajo\nIncluye un plan de acción paso a paso, es decir, una lista enumerada\nMenciona herramientas o tecnologías específicas que usarás (Basados entu perfil)\n\n2. Cronograma de pasos de entregables sin estimación de tiempo\n\nDefine hitos y entregables específicos por puntos en una lista\n\n3. Garantías y políticas\n\nOfrece revisiones incluidas\nMenciona tu política de satisfacción\nIncluye soporte post-entrega si aplica\n\n4. Llamada a la acción\n\nInvita a una conversación para aclarar dudas\nPropón una reunión o llamada inicial\nMantén un tono muy cercano\n\nConsejos adicionales:\n\nNo enumeres los puntos de la propuesta\nNo utilices lenguaje formal. Utiliza lenguaje casual, informar y cercano\nNo muestres tanto entusiasmo, hace parecer un poco falso\nSolo haz una pregunta al final, no mas de una pregunta\nNo enumeres estos pasos en la propuesta\nNo pongas firmas\nNo pongas labels que se tengan que reemplazar como \'[cliente]\' o \'$x presupuesto\'\nMantén la propuesta entre 200-400 palabras\nUsa párrafos cortos y fáciles de leer\nNo incluyas presupuesto ni estimación de tiempo\nIncluye una pregunta final inteligente que demuestren tu interés\nRecuerda que le estas hablando directamente al cliente\nNUNCA NUNCA PERO NUNCA uses signo de interrogacion de apertura ni signo de exclamación de apertura', 'Perfil Profesional - José Hernández\nDesarrollador Full Stack Senior | 9 años de experiencia\nResumen Profesional\nDesarrollador Full Stack con 9 años de experiencia sólida en el diseño, desarrollo e implementación de sistemas web complejos, interfaces de usuario intuitivas y soluciones tecnológicas innovadoras. Especializado en Angular y Laravel, con un enfoque riguroso en la escritura de código limpio, reutilizable y escalable, aplicando las mejores prácticas y estándares de desarrollo de la industria.\nFortalezas y Virtudes Técnicas\nVersatilidad de Roles\nDurante mi trayectoria profesional he demostrado capacidad para adaptarme y destacar en múltiples roles:\n\nAnalista de Sistemas: Análisis profundo de requerimientos y arquitectura de soluciones\nBackend Developer: Desarrollo robusto de APIs y lógica de negocio compleja\nFrontend Developer: Creación de interfaces modernas y experiencias de usuario excepcionales\nLíder Técnico: Coordinación de equipos, toma de decisiones técnicas estratégicas y mentoría\n\nExperiencia en Liderazgo Técnico\n\nLíder en toma de decisiones técnicas con capacidad para evaluar y seleccionar las mejores soluciones\nGestión de equipos de desarrollo con experiencia liderando grupos de hasta 4 personas\nContratación de talento técnico, contribuyendo al crecimiento y fortalecimiento de equipos\nPlanificación estratégica con participación activa en reuniones de planificación e informes ejecutivos\n\nDominio de Tecnologías Clave\n\nFrontend: Angular, Angular Material, RxJS, SASS, CSS Grid, JavaScript/TypeScript\nBackend: Laravel, PHP, Node.js, ExpressJS\nBases de Datos: MySQL, gestión y optimización de consultas\nCMS: WordPress (desarrollo de plugins y temas personalizados), WordPress Codex\nHerramientas: Git, integración continua (CI/CD), Azure DevOps\n\nCapacidades de Desarrollo Avanzado\n\nProgramación Reactiva: Implementación experta de RxJS para manejo asíncrono de datos\nFormularios Reactivos Complejos: Desarrollo de interfaces dinámicas y validaciones avanzadas\nWebSockets y Tiempo Real: Implementación de notificaciones en tiempo real y comunicación bidireccional\nSistemas de Monitoreo: Desarrollo de dashboards complejos con gráficos configurables usando Chart.js\nIntegrations APIs: Experiencia integrando servicios externos como Zadarma, LiveConnect, y APIs de terceros\n\nEspecialización en Sistemas Complejos\n\nPlataformas de Gestión Empresarial: Desarrollo de sistemas internos para ventas, cobranza y seguimiento\nAplicaciones de Monitoreo IoT: Creación de sistemas de monitoreo para pozos de agua, remolcadores e instalaciones industriales\nE-learning y E-commerce: Desarrollo de plataformas educativas y comerciales con sistemas de pago integrados\nGeolocalización: Implementación de mapas interactivos con OpenLayers\n\nImplementación de Mejores Prácticas\n\nDevOps: Implementación de integración continua y respaldos automáticos diarios\nOptimización de Performance: Refactorización de código legacy y optimización de tiempos de carga\nArquitectura Escalable: Diseño de sistemas que soportan crecimiento y alta concurrencia\nCódigo Limpio: Aplicación rigurosa de principios SOLID y patrones de diseño\n\nInnovación y Resolución de Problemas\n\nAutomatización de Procesos: Desarrollo de soluciones que optimizan flujos de trabajo empresariales\nSistemas de Alarmas Configurables: Implementación de sistemas de alertas personalizables\nMódulos de Comunicación: Desarrollo de sistemas de notificaciones por WhatsApp, correo electrónico y chat en línea\nManejo de Archivos: Procesamiento avanzado de archivos CSV para importación masiva de datos\n\nAdaptabilidad y Aprendizaje Continuo\n\nFreelancer Activo: Mantengo proyectos independientes que me permiten estar al día con las últimas tendencias\nProyectos Personales: Desarrollo continuo de aplicaciones por hobby y utilidad personal\nMentoring: Experiencia en enseñanza (profesor de inglés) que complementa mis habilidades de liderazgo\n\nValor Agregado\nMi enfoque se centra en crear soluciones tecnológicas que realmente resuelvan problemas empresariales, combinando conocimiento técnico profundo con visión estratégica. Me caracterizo por mi capacidad de sugerir y ejecutar mejoras que añaden valor real a los proyectos, optimizar sistemas existentes y estandarizar patrones de desarrollo que faciliten el mantenimiento y escalabilidad a largo plazo.\nLa combinación de mis habilidades técnicas, experiencia en liderazgo y pasión por la innovación me convierte en un desarrollador integral capaz de llevar proyectos desde la conceptualización hasta la implementación exitosa, siempre con un enfoque en la calidad, escalabilidad y experiencia del usuario.', 'andresjosehr', '{"cookies":[{"name":"appcookie[user_locale]","value":"es_AR","domain":".www.workana.com","path":"/","expires":1783272814.936331,"httpOnly":true,"secure":true,"sameSite":"Lax"},{"name":"OptanonAlertBoxClosed","value":"2025-07-05T17:33:21.662Z","domain":".www.workana.com","path":"/","expires":1783272801,"httpOnly":false,"secure":false,"sameSite":"Lax"},{"name":"_gcl_au","value":"1.1.376809956.1751736802","domain":".workana.com","path":"/","expires":1759512802,"httpOnly":false,"secure":false,"sameSite":"Lax"},{"name":"_ga","value":"GA1.1.1681401700.1751736803","domain":".workana.com","path":"/","expires":1786296814.304849,"httpOnly":false,"secure":false,"sameSite":"Lax"},{"name":"_fbp","value":"fb.1.1751736803046.123508288445085829","domain":".workana.com","path":"/","expires":1759512814,"httpOnly":false,"secure":false,"sameSite":"Lax"},{"name":"li_sugr","value":"3e74079e-294a-48e1-81ce-4ccfb95e8b7b","domain":".linkedin.com","path":"/","expires":1759512814.386309,"httpOnly":false,"secure":true,"sameSite":"None"},{"name":"bcookie","value":"\\"v=2&5371f4f5-ed9c-4b68-8127-b845fbd37bcb\\"","domain":".linkedin.com","path":"/","expires":1783272814.386365,"httpOnly":false,"secure":true,"sameSite":"None"},{"name":"lidc","value":"\\"b=OGST09:s=O:r=O:a=O:p=O:g=3181:u=1:x=1:i=1751736802:t=1751823202:v=2:sig=AQEGbHwu8_3YAzYDETuA-pyJvo81v5W_\\"","domain":".linkedin.com","path":"/","expires":1751823203.061574,"httpOnly":false,"secure":true,"sameSite":"None"},{"name":"UserMatchHistory","value":"AQIdvhAKLSd_YQAAAZfbpl6xZqdlQA4yOfUAFEpWOdGEWCXgPvwvXGtorwxntNqkjslqU1kckdhFfA","domain":".linkedin.com","path":"/","expires":1754328803.208123,"httpOnly":false,"secure":true,"sameSite":"None"},{"name":"AnalyticsSyncHistory","value":"AQJtWeiRMQdNggAAAZfbpl6xpm_FK3dpzOLW5KPD6cFh-kK-Wl1CwRdqwpszVtDxpaNAhn8KPBBJ-YTaqZas_A","domain":".linkedin.com","path":"/","expires":1754328803.20814,"httpOnly":false,"secure":true,"sameSite":"None"},{"name":"bscookie","value":"\\"v=1&20250705173323119e9fae-f662-4c45-887f-09846c9ecb27AQEgs6x3JGMxnmHh_wWJS9BQISXgmRfy\\"","domain":".www.linkedin.com","path":"/","expires":1783272803.544634,"httpOnly":true,"secure":true,"sameSite":"None"},{"name":"__cf_bm","value":"xydbF_.tKTrVf1Tpftuuh3nxBEoTdgdsox6l.H6woLw-1751736803-1.0.1.1-q88hq7_uWFpulfHCsblQ2Pp1ZKvUbx2Uou2YN_GVDhHuz6k_hRsLZQ3gkgAu9FEIy47CgUsb5kn4JBMkJZE3zWpIDjfCVH_tkWbB_fLnMww","domain":".linkedin.com","path":"/","expires":1751738603.544721,"httpOnly":true,"secure":true,"sameSite":"None"},{"name":"appcookie[wldh]","value":"eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyIyMTU4ODk2IjoiZjgyZjc3YmZjYmNlMjRlMTBjNWM1MDM3YzgwM2EzY2QifQ.9nAnb1nh-wgD7nEWchQZBPFTm9kLLMq95GCTV2Xduh8","domain":".www.workana.com","path":"/","expires":1783272805.072692,"httpOnly":true,"secure":true,"sameSite":"Lax"},{"name":"appcookie[activeSession]","value":"1","domain":".www.workana.com","path":"/","expires":1751823205.072711,"httpOnly":true,"secure":true,"sameSite":"Lax"},{"name":"appcookie[wd]","value":"7Dh3PxVM8wDMefNiwj2a9WomF8OP0P2VcbtJLifj","domain":".www.workana.com","path":"/","expires":1783272805.072742,"httpOnly":true,"secure":true,"sameSite":"Lax"},{"name":"workana_session","value":"1e06g03v9mg503kjo4f6gqb9e0","domain":".www.workana.com","path":"/","expires":1754328805.072787,"httpOnly":true,"secure":true,"sameSite":"Lax"},{"name":"dcstcookieii","value":"92620a1e953587dfe3d7a150ea7d875e964206f02c25d184f6ddb6ec769a90b6","domain":".www.workana.com","path":"/","expires":1754415205.072845,"httpOnly":false,"secure":true,"sameSite":"Strict"},{"name":"__zlcmid","value":"1SUnk1ui7uUXltS","domain":".workana.com","path":"/","expires":1783272814,"httpOnly":false,"secure":false,"sameSite":"Lax"},{"name":"OptanonConsent","value":"isGpcEnabled=0&datestamp=Sat+Jul+05+2025+13%3A33%3A34+GMT-0400+(Venezuela+Time)&version=6.34.0&isIABGlobal=false&hosts=&landingPath=NotLandingPage&groups=C0001%3A1%2CC0002%3A1%2CC0003%3A1%2CC0004%3A1&geolocation=VE%3BN&AwaitingReconsent=false","domain":".www.workana.com","path":"/","expires":1783272814,"httpOnly":false,"secure":false,"sameSite":"Lax"},{"name":"_ga_61Z13C91TT","value":"GS2.1.s1751736802$o1$g1$t1751736814$j48$l1$h1624653596","domain":".workana.com","path":"/","expires":1786296814.304505,"httpOnly":false,"secure":false,"sameSite":"Lax"},{"name":"AWSALBCORS","value":"RMhK06gmHH33MMzuaSzAg6A9ozIH/cYTMnstPq17y+CAcief+PudlgCP4SSl6a0e8Ua+4fTjFymuNjQODpZ4LyA8F/fmOP+GCZeDVISmbIPFsaMUmwVD8Y5OhMCV","domain":"widget-mediator.zopim.com","path":"/","expires":1752341614.545198,"httpOnly":false,"secure":true,"sameSite":"None"}],"timestamp":"2025-07-05T17:33:37.040Z","userAgent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}', '2025-07-06 13:33:37', '2025-07-05 16:24:19', '2025-07-05 21:17:55', 1, '$2b$10$4OPmAl9fEci1EEOwbvclf.zuXybLaeoOkIQL8w1a3B6yR5WHr4pb.', 'ADMIN');

-- Volcando estructura para tabla projects.user_proposals
CREATE TABLE IF NOT EXISTS `user_proposals` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `project_id` int NOT NULL,
  `project_platform` enum('workana','upwork') NOT NULL DEFAULT 'workana',
  `proposal_sent_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `proposal_content` longtext,
  `status` enum('sent','accepted','rejected','pending') DEFAULT 'sent',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_project_unique` (`user_id`,`project_id`,`project_platform`),
  CONSTRAINT `user_proposals_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- Volcando datos para la tabla projects.user_proposals: ~0 rows (aproximadamente)

/*!40103 SET TIME_ZONE=IFNULL(@OLD_TIME_ZONE, 'system') */;
/*!40101 SET SQL_MODE=IFNULL(@OLD_SQL_MODE, '') */;
/*!40014 SET FOREIGN_KEY_CHECKS=IFNULL(@OLD_FOREIGN_KEY_CHECKS, 1) */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40111 SET SQL_NOTES=IFNULL(@OLD_SQL_NOTES, 1) */;
