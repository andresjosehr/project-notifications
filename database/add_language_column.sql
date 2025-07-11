-- Script para agregar la columna language a la tabla projects
-- Ejecutar este script si la tabla ya existe y no tiene la columna language

ALTER TABLE `projects` 
ADD COLUMN `language` varchar(10) DEFAULT NULL 
AFTER `platform`;

-- Verificar que la columna se agregó correctamente
DESCRIBE projects; 