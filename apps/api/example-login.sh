#!/bin/bash

# Ejemplo de uso del comando login de Workana CLI
# Este script muestra cómo obtener una sesión de Workana

echo "=== Ejemplo de Login en Workana ==="
echo ""

# Configurar credenciales (reemplaza con tus credenciales reales)
USERNAME="tu_email@ejemplo.com"
PASSWORD="tu_contraseña"

echo "Iniciando sesión en Workana..."
echo "Usuario: $USERNAME"
echo ""

# Ejecutar el comando de login
RESULT=$(node cli.js login "$USERNAME" "$PASSWORD" --debug)

# Verificar si el login fue exitoso
if echo "$RESULT" | jq -e '.success == true' > /dev/null; then
    echo "✅ Login exitoso!"
    echo ""
    echo "Datos de sesión obtenidos:"
    echo "$RESULT" | jq '.session.sessionData'
    echo ""
    echo "Para usar esta sesión en otros comandos:"
    echo "SESSION_DATA='$(echo "$RESULT" | jq -r '.session.sessionData | tojson')'"
    echo "node cli.js sendProposal \"\$SESSION_DATA\" \"Texto de tu propuesta...\""
else
    echo "❌ Error en el login:"
    echo "$RESULT" | jq -r '.error.message'
fi 