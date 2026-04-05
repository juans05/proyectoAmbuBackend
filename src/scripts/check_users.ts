import { createConnection } from 'typeorm';
import * as dotenv from 'dotenv';
import { User } from '../modules/users/entities/user.entity';

dotenv.config({ path: '.env' });

async function check() {
  const connection = await createConnection({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [User],
    synchronize: false,
  });

  const users = await connection.getRepository(User).find();
  console.log('Users in DB:');
  users.forEach(u => {
    console.log(`- Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
  });

  await connection.close();
}

check().catch(console.error);
