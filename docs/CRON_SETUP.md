# Configuración de Cron para Scraping de Workana

Esta guía te muestra cómo configurar el scraping automático de Workana para que se ejecute cada minuto en tu servidor.

## 🎯 Enfoque Recomendado

**Comando + Cron** es la opción más robusta para un entorno de servidor porque:

- ✅ **Robustez**: Si una ejecución falla, no afecta las siguientes
- ✅ **Simplicidad**: Fácil de monitorear y debuggear
- ✅ **Escalabilidad**: Fácil de ajustar la frecuencia
- ✅ **Logs claros**: Una ejecución = un log completo
- ✅ **Gestión de recursos**: Libera memoria entre ejecuciones

## 🚀 Configuración Rápida

### 1. Configurar Cron Automáticamente

```bash
# Ejecutar el script de configuración
./scripts/setup-cron.sh
```

Este script:
- Verifica dependencias
- Crea directorios necesarios
- Configura el cron para ejecutar cada minuto
- Maneja conflictos con configuraciones previas

### 2. Verificar Estado

```bash
# Monitorear el estado del cron
./scripts/monitor-cron.sh
```

### 3. Ver Logs en Tiempo Real

```bash
# Seguir los logs en tiempo real
tail -f logs/workana-cron.log
```

## 📋 Configuración Manual

Si prefieres configurar manualmente:

```bash
# Abrir editor de cron
crontab -e

# Agregar esta línea para ejecutar cada minuto
* * * * * /usr/bin/node /ruta/completa/al/proyecto/cli.js workana-cron --quiet >> /ruta/completa/al/proyecto/logs/workana-cron.log 2>&1
```

## 🔧 Comandos Disponibles

### Comando Optimizado para Cron

```bash
# Nuevo comando específico para cron
node cli.js workana-cron [opciones]

# Opciones:
#   -n, --notifications   Enviar notificaciones (default: true)
#   -t, --translate      Traducir proyectos (default: true)
#   -q, --quiet          Modo silencioso (default: false)
```

### Comandos de Gestión

```bash
# Configurar cron
./scripts/setup-cron.sh

# Monitorear estado
./scripts/monitor-cron.sh

# Remover cron
./scripts/remove-cron.sh
```

## 📊 Monitoreo y Logs

### Ubicación de Logs

```bash
logs/workana-cron.log  # Logs del cron
logs/app.log           # Logs generales de la aplicación
```

### Comandos de Monitoreo

```bash
# Ver últimas ejecuciones
tail -20 logs/workana-cron.log

# Seguir logs en tiempo real
tail -f logs/workana-cron.log

# Buscar errores
grep "Error" logs/workana-cron.log

# Estadísticas de ejecución
grep "completado" logs/workana-cron.log | tail -10
```

## 🛠️ Mantenimiento

### Verificar Estado del Cron

```bash
# Ver configuración actual
crontab -l

# Verificar si el servicio cron está corriendo
sudo systemctl status cron
```

### Limpieza de Logs

```bash
# Limpiar logs (mantener solo últimas 1000 líneas)
tail -1000 logs/workana-cron.log > logs/workana-cron.log.tmp && mv logs/workana-cron.log.tmp logs/workana-cron.log

# Rotar logs por fecha
mv logs/workana-cron.log logs/workana-cron-$(date +%Y%m%d).log
```

## 🔍 Troubleshooting

### Problemas Comunes

1. **Cron no se ejecuta**
   ```bash
   # Verificar servicio cron
   sudo systemctl status cron
   
   # Verificar configuración
   crontab -l
   ```

2. **Permisos de archivo**
   ```bash
   # Verificar permisos del proyecto
   ls -la cli.js
   chmod +x cli.js
   ```

3. **Variables de entorno**
   ```bash
   # El cron no carga variables de entorno automáticamente
   # Agregar al crontab si es necesario:
   PATH=/usr/local/bin:/usr/bin:/bin
   NODE_ENV=production
   ```

### Test Manual

```bash
# Probar el comando manualmente
node cli.js workana-cron

# Probar con opciones
node cli.js workana-cron --notifications --translate --quiet
```

## 🎛️ Configuración Avanzada

### Frecuencia Personalizada

```bash
# Cada 2 minutos
*/2 * * * * comando

# Cada 5 minutos
*/5 * * * * comando

# Solo en horas laborables (9-17h, lunes-viernes)
* 9-17 * * 1-5 comando
```

### Timeout y Límites

```bash
# Agregar timeout al comando (5 minutos máximo)
* * * * * timeout 300 /usr/bin/node /ruta/al/proyecto/cli.js workana-cron --quiet >> /ruta/logs/workana-cron.log 2>&1
```

## 🔄 Alternativas

### SystemD Timer (Más Robusto)

Para mayor control y características avanzadas, considera usar systemd:

```bash
# Ver configuración de systemd
cat scripts/workana-scraper.service
cat scripts/workana-scraper.timer
```

### Supervisor/PM2

Para aplicaciones que requieren alta disponibilidad:

```bash
# Con PM2
pm2 start cli.js --name workana-cron --cron "* * * * *"
```

## 📈 Métricas y Alertas

### Logs Estructurados

El comando `workana-cron` genera logs optimizados:

```bash
# Formato: timestamp - nivel - mensaje - métricas
2024-01-15 10:30:01 - INFO - Workana cron completado: 15 procesados, 3 nuevos, 2500ms
```

### Alertas Básicas

```bash
# Script para detectar fallos (ejecutar cada 5 minutos)
if ! grep -q "completado" logs/workana-cron.log | tail -5; then
    echo "⚠️ Workana cron podría tener problemas"
fi
```

## 🎯 Beneficios del Enfoque Elegido

1. **Aislamiento**: Cada ejecución es independiente
2. **Depuración**: Fácil de testear y debuggear
3. **Escalabilidad**: Fácil de replicar en múltiples servidores
4. **Monitoreo**: Logs claros y métricas útiles
5. **Mantenimiento**: Simple de mantener y actualizar

---

**¡Listo!** 🎉 Tu scraping de Workana ahora se ejecutará automáticamente cada minuto. 