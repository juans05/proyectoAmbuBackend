import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

async function setupPostGIS() {
  const client = new Client({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    console.log(`📡 Conectando a ${process.env.DB_HOST}...`);
    await client.connect();
    
    console.log('🚀 Intentando instalar extensión PostGIS...');
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    
    const res = await client.query('SELECT postgis_full_version();');
    console.log('✅ PostGIS instalado correctamente!');
    console.log('📦 Versión:', res.rows[0].postgis_full_version);
    
  } catch (err) {
    console.error('❌ Error instalando PostGIS:', err.message);
    if (err.message.includes('permission denied')) {
      console.error('👉 Tip: Asegúrate de que el usuario tiene permisos de Superusuario.');
    }
  } finally {
    await client.end();
  }
}

setupPostGIS();
