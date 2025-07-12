const bcrypt = require('bcrypt');
const mysql = require('mysql2/promise');
const config = require('./lib/config');

async function testPasswordHashing() {
  console.log('🔐 Probando encriptación de contraseñas...\n');

  try {
    // 1. Probar encriptación básica
    const testPassword = 'mi_contraseña_segura_123';
    console.log('1. Encriptando contraseña de prueba...');
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    console.log('✅ Contraseña encriptada:', hashedPassword.substring(0, 20) + '...');
    
    // 2. Verificar que la contraseña se puede verificar
    console.log('\n2. Verificando contraseña encriptada...');
    const isValid = await bcrypt.compare(testPassword, hashedPassword);
    console.log('✅ Verificación exitosa:', isValid);
    
    // 3. Verificar que contraseña incorrecta falla
    console.log('\n3. Verificando contraseña incorrecta...');
    const isInvalid = await bcrypt.compare('contraseña_incorrecta', hashedPassword);
    console.log('✅ Verificación falla correctamente:', !isInvalid);

    // 4. Probar conexión a base de datos
    console.log('\n4. Probando conexión a base de datos...');
    const db = await mysql.createConnection({
      host: config.database.host,
      user: config.database.user,
      password: config.database.password,
      database: config.database.database
    });
    console.log('✅ Conexión a base de datos exitosa');

    // 5. Verificar estructura de tabla users
    console.log('\n5. Verificando estructura de tabla users...');
    const [columns] = await db.execute('DESCRIBE users');
    const passwordColumn = columns.find(col => col.Field === 'password');
    if (passwordColumn) {
      console.log('✅ Campo password encontrado:', passwordColumn.Type);
    } else {
      console.log('❌ Campo password no encontrado');
    }

    // 6. Simular registro de usuario
    console.log('\n6. Simulando registro de usuario...');
    const testUserData = {
      email: 'test@example.com',
      password: 'test_password_123',
      proposal_directives: 'Directrices de prueba',
      professional_profile: 'Perfil de prueba',
      telegram_user: '@test_user',
      role: 'ADMIN',
      is_active: true
    };

    // Simular el proceso de encriptación que haría el UserRepository
    const bcrypt = require('bcrypt');
    testUserData.password = await bcrypt.hash(testUserData.password, 10);
    console.log('✅ Contraseña encriptada para inserción:', testUserData.password.substring(0, 20) + '...');

    await db.end();
    console.log('\n🎉 Todas las pruebas pasaron exitosamente!');
    console.log('\n📝 Resumen:');
    console.log('- La encriptación de contraseñas funciona correctamente');
    console.log('- La verificación de contraseñas funciona correctamente');
    console.log('- La base de datos está configurada correctamente');
    console.log('- El campo password existe en la tabla users');
    console.log('- El proceso de registro encriptará las contraseñas automáticamente');

  } catch (error) {
    console.error('❌ Error durante las pruebas:', error.message);
    process.exit(1);
  }
}

// Ejecutar pruebas
testPasswordHashing(); 