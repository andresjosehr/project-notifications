#!/usr/bin/env node

/**
 * Script to create admin users with hashed passwords
 * Usage: node scripts/create-admin.js
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const readline = require('readline');

const config = require('../lib/config');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

function questionHidden(query) {
  return new Promise(resolve => {
    process.stdout.write(query);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');
    process.stdin.setRawMode(true);
    
    let input = '';
    process.stdin.on('data', char => {
      char = char.toString();
      
      if (char === '\u0003') { // Ctrl+C
        process.exit();
      } else if (char === '\r' || char === '\n') {
        process.stdin.setRawMode(false);
        process.stdin.pause();
        process.stdout.write('\n');
        resolve(input);
      } else if (char === '\u0008' || char === '\u007f') { // Backspace
        if (input.length > 0) {
          input = input.slice(0, -1);
          process.stdout.write('\b \b');
        }
      } else {
        input += char;
        process.stdout.write('*');
      }
    });
  });
}

async function createAdmin() {
  try {
    console.log('🔐 Creador de Usuario Admin');
    console.log('=' .repeat(30));
    
    const email = await question('Email de Workana: ');
    const workanaPassword = await questionHidden('Contraseña de Workana: ');
    const systemPassword = await questionHidden('Contraseña del sistema: ');
    
    if (!email || !workanaPassword || !systemPassword) {
      console.log('❌ Todos los campos son obligatorios');
      rl.close();
      process.exit(1);
    }
    
    // Default values for required fields
    const proposalDirectives = 'Directivas por defecto';
    const professionalProfile = 'Perfil por defecto';
    const telegramUser = 'default_user';
    
    console.log('\n🔄 Creando usuario administrador...');
    
    // Hash the system password
    const hashedPassword = await bcrypt.hash(systemPassword, 10);
    
    // Connect to database
    const connection = await mysql.createConnection(config.database);
    
    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT id, workana_email, role FROM users WHERE workana_email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      console.log(`⚠️  Usuario ya existe: ${user.workana_email} (Rol actual: ${user.role || 'USER'})`);
      const updateUser = await question('¿Deseas actualizar este usuario a ADMIN? (s/n): ');
      
      if (updateUser.toLowerCase() !== 's' && updateUser.toLowerCase() !== 'y') {
        console.log('❌ Operación cancelada');
        await connection.end();
        rl.close();
        process.exit(0);
      }
      
      // Update existing user
      await connection.execute(
        `UPDATE users SET 
          workana_password = ?, 
          system_password = ?, 
          role = 'ADMIN', 
          proposal_directives = ?, 
          professional_profile = ?, 
          telegram_user = ?,
          is_active = 1
        WHERE workana_email = ?`,
        [
          workanaPassword,
          hashedPassword,
          proposalDirectives,
          professionalProfile,
          telegramUser,
          email
        ]
      );
      
      console.log('✅ Usuario actualizado exitosamente a ADMIN');
    } else {
      // Insert new admin user
      await connection.execute(
        `INSERT INTO users (
          workana_email, 
          workana_password, 
          system_password, 
          role, 
          proposal_directives, 
          professional_profile, 
          telegram_user,
          is_active
        ) VALUES (?, ?, ?, 'ADMIN', ?, ?, ?, 1)`,
        [
          email,
          workanaPassword,
          hashedPassword,
          proposalDirectives,
          professionalProfile,
          telegramUser
        ]
      );
      
      console.log('✅ Usuario administrador creado exitosamente');
    }
    
    await connection.end();
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Rol: ADMIN`);
    console.log('\n💡 Ahora puedes hacer login en /api/auth/login');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

// Run the script
createAdmin();