import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { INestApplication, ValidationPipe } from '@nestjs/common';
const supertest = require('supertest');
import { DataSource } from 'typeorm';

async function bootstrap() {
  console.log('🚀 Iniciando Suite de QA (AmbuGo Verification)...');
  const app = await NestFactory.create(AppModule, { logger: false });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();

  const server = app.getHttpServer();
  const results: any[] = [];

  // --- Helpers ---
  const testEndpoint = async (name: string, method: string, url: string, token?: string, body?: any) => {
    let req = supertest(server);
    let op = (req as any)[method.toLowerCase()](url);
    if (token) op = op.set('Authorization', `Bearer ${token}`);
    if (body) op = op.send(body);

    const res = await op;
    const passed = res.status >= 200 && res.status < 300;
    results.push({ name, method, url, status: res.status, passed, error: passed ? '' : JSON.stringify(res.body) });
    console.log(`${passed ? '✅' : '❌'} [${res.status}] ${method} ${url} - ${name}`);
  };

  try {
    // 1. AUTH - Login Admin
    console.log('\n--- Probando Autenticación ---');
    const loginRes = await supertest(server)
      .post('/auth/login')
      .send({ email: 'admin@ambugo.com', password: 'admin123456' });
    
    const adminToken = loginRes.body.accessToken;
    if (!adminToken) throw new Error('No se pudo obtener token de Admin');
    console.log('✅ Login Admin: OK');

    // 2. AMBULANCES
    console.log('\n--- Probando Ambulancias ---');
    await testEndpoint('Listar Ambulancias (Admin)', 'GET', '/ambulances', adminToken);
    await testEndpoint('Ambulancias Cercanas', 'GET', '/ambulances/nearby?lat=-12.046&lng=-77.042&radius=50000', adminToken);
    
    // 3. EMERGENCIES (The fixed one!)
    console.log('\n--- Probando Emergencias (Fix 500/400) ---');
    await testEndpoint('Listar Emergencias (Multi-status)', 'GET', '/emergencies?status=pending,assigned,on_route,arrived&limit=5', adminToken);
    await testEndpoint('Historial (Mío)', 'GET', '/emergencies/history', adminToken);

    // 4. REPORTS
    console.log('\n--- Probando Reportes ---');
    await testEndpoint('Dashboard Metrics', 'GET', '/reports/dashboard', adminToken);
    await testEndpoint('Revenue Stats', 'GET', '/reports/revenue', adminToken);

    // 5. USERS
    console.log('\n--- Probando Usuarios ---');
    await testEndpoint('Mi Perfil', 'GET', '/users/me', adminToken);

    // --- Final Report ---
    console.log('\n' + '='.repeat(40));
    console.log('📊 RESUMEN FINAL DE QA');
    console.log('='.repeat(40));
    const totals = results.reduce((acc, r) => {
      acc[r.passed ? 'passed' : 'failed']++;
      return acc;
    }, { passed: 0, failed: 0 });

    console.log(`Pasa: ${totals.passed}`);
    console.log(`Falla: ${totals.failed}`);
    
    if (totals.failed > 0) {
      console.log('\n❌ Detalle de errores:');
      results.filter(r => !r.passed).forEach(r => {
        console.log(`- ${r.method} ${r.url}: ${r.error}`);
      });
    } else {
      console.log('\n🎉 ¡Todos los endpoints críticos están funcionando correctamente!');
    }

  } catch (err) {
    console.error('💥 Error fatal en la suite de QA:', err);
  } finally {
    await app.close();
    process.exit(0);
  }
}

bootstrap();
