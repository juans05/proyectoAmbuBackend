import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  console.log('🏗️  Starting Full Emergency Schema Sync...');

  const columnsToAdd = [
    { name: 'suggestedRoutePolyline', type: 'TEXT' },
    { name: 'actualDurationSeconds', type: 'INT' },
    { name: 'timeDifferenceSeconds', type: 'INT' },
  ];

  try {
    for (const column of columnsToAdd) {
      await dataSource.query(`
        ALTER TABLE ambudb.emergencies
        ADD COLUMN IF NOT EXISTS "${column.name}" ${column.type};
      `);
      console.log(`✅ Column "${column.name}" verified/added successfully.`);
    }
    console.log('🏁 Schema Sync completed successfully.');
  } catch (error) {
    console.error('❌ Error during schema sync:', error);
  } finally {
    await app.close();
  }
}

bootstrap();
