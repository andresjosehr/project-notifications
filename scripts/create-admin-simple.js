#!/usr/bin/env node

/**
 * Script simple para crear admin users con hashed passwords
 * Usage: node scripts/create-admin-simple.js <email> <workana_password> <system_password>
 */

const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const config = require('../lib/config');

async function createAdmin() {
  try {
    const args = process.argv.slice(2);
    
    if (args.length < 3) {
      console.log('❌ Uso: node scripts/create-admin-simple.js <email> <workana_password> <system_password>');
      console.log('📖 Ejemplo: node scripts/create-admin-simple.js user@example.com workana123 system123');
      process.exit(1);
    }
    
    const [email, workanaPassword, systemPassword] = args;
    
    console.log('🔐 Creando Usuario Admin');
    console.log('=' .repeat(30));
    console.log(`📧 Email: ${email}`);
    
    // Hash the system password
    console.log('🔄 Encriptando contraseña...');
    const hashedPassword = await bcrypt.hash(systemPassword, 10);
    
    // Connect to database
    console.log('🔗 Conectando a base de datos...');
    const connection = await mysql.createConnection(config.database);
    
    // Check if user already exists
    const [existingUsers] = await connection.execute(
      'SELECT id, workana_email, role FROM users WHERE workana_email = ?',
      [email]
    );
    
    if (existingUsers.length > 0) {
      const user = existingUsers[0];
      console.log(`⚠️  Usuario ya existe: ${user.workana_email} (Rol actual: ${user.role || 'USER'})`);
      console.log('🔄 Actualizando usuario existente a ADMIN...');
      
      // Update existing user
      await connection.execute(
        `UPDATE users SET 
          workana_password = ?, 
          system_password = ?, 
          role = 'ADMIN', 
          is_active = 1
        WHERE workana_email = ?`,
        [
          workanaPassword,
          hashedPassword,
          email
        ]
      );
      
      console.log('✅ Usuario actualizado exitosamente a ADMIN');
    } else {
      console.log('🆕 Creando nuevo usuario ADMIN...');
      
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
          'Directivas por defecto',
          'Perfil por defecto',
          'default_user'
        ]
      );
      
      console.log('✅ Usuario administrador creado exitosamente');
    }
    
    await connection.end();
    
    console.log(`📧 Email: ${email}`);
    console.log(`🔑 Rol: ADMIN`);
    console.log('\n💡 Ahora puedes hacer login en /api/auth/login');
    console.log(`📝 Credenciales para login:`);
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${systemPassword}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
createAdmin();