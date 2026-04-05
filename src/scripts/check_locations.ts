import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';
import { Ambulance } from '../modules/ambulances/entities/ambulance.entity';

dotenv.config({ path: '.env' });

async function check() {
  const connection = await createConnection({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Ambulance],
    synchronize: false,
  });

  const ambulances = await connection.getRepository(Ambulance).find();
  console.log('Ambulances in DB:');
  ambulances.forEach(a => {
    console.log(`- ID: ${a.id}, Plate: ${a.plate}, Lat: ${a.locationLat}, Lng: ${a.locationLng}`);
  });

  await connection.close();
}

check().catch(console.error);
