#!/usr/bin/env node

/**
 * Simple test script to verify JWT authentication works
 * Usage: node scripts/test-auth.js
 */

const fetch = require('node-fetch');

const API_BASE = process.env.API_BASE || 'http://localhost:3000';

async function testAuth() {
  try {
    console.log('🧪 Probando autenticación JWT');
    console.log('=' .repeat(40));
    
    // Test 1: Try to access protected endpoint without token
    console.log('\n1. 🔒 Probando acceso sin token...');
    const response1 = await fetch(`${API_BASE}/api/stats`);
    const result1 = await response1.json();
    
    if (response1.status === 401) {
      console.log('✅ Endpoint protegido correctamente');
    } else {
      console.log('❌ Endpoint no está protegido');
    }
    
    // Test 2: Try to login with invalid credentials
    console.log('\n2. 🔐 Probando login con credenciales inválidas...');
    const response2 = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'invalid@example.com',
        password: 'wrongpassword'
      })
    });
    
    const result2 = await response2.json();
    
    if (response2.status === 401) {
      console.log('✅ Login rechazado correctamente');
    } else {
      console.log('❌ Login debería ser rechazado');
    }
    
    // Test 3: Try to access /build-bid without token
    console.log('\n3. 🔗 Probando /build-bid sin token...');
    const response3 = await fetch(`${API_BASE}/build-bid/123/workana`);
    const result3 = await response3.json();
    
    if (response3.status === 401) {
      console.log('✅ /build-bid protegido correctamente');
    } else {
      console.log('❌ /build-bid no está protegido');
    }
    
    // Test 4: Check health endpoint (should work without auth)
    console.log('\n4. 🩺 Probando endpoint de salud...');
    const response4 = await fetch(`${API_BASE}/health`);
    
    if (response4.status === 200) {
      console.log('✅ Endpoint de salud accesible');
    } else {
      console.log('❌ Endpoint de salud no accesible');
    }
    
    console.log('\n🎉 Pruebas completadas');
    console.log('\n💡 Para probar el login exitoso:');
    console.log('   1. Ejecuta: node scripts/create-admin.js');
    console.log('   2. Usa las credenciales para hacer login en /api/auth/login');
    console.log('   3. Usa el token JWT en el header Authorization: Bearer <token>');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error.message);
  }
}

// Run the test
testAuth();