import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Company } from '../modules/companies/entities/company.entity';
import { Ambulance } from '../modules/ambulances/entities/ambulance.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { AmbulanceStatus } from '../common/enums/ambulance-status.enum';
import { AmbulanceType } from '../common/enums/ambulance-type.enum';
import * as bcrypt from 'bcryptjs';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);
  
  console.log('🌱 Iniciando Seeding...');

  // 1. Crear Compañía
  const companyRepo = dataSource.getRepository(Company);
  let company = await companyRepo.findOne({ where: { ruc: '20100000001' } });
  if (!company) {
    company = companyRepo.create({
      name: 'AmbuGo Central',
      ruc: '20100000001',
      address: 'Av. Siempre Viva 123',
    });
    await companyRepo.save(company);
    console.log('✅ Compañía creada');
  }

  // 2. Crear Conductores
  const userRepo = dataSource.getRepository(User);
  const password = await bcrypt.hash('admin123', 10);

  const conductorsData = [
    { name: 'Juan Perez', email: 'juan@ambugo.com' },
    { name: 'Maria Lopez', email: 'maria@ambugo.com' },
  ];

  const conductors: User[] = [];
  for (const data of conductorsData) {
    let user = await userRepo.findOne({ where: { email: data.email } });
    if (!user) {
      user = userRepo.create({
        ...data,
        password,
        role: UserRole.CONDUCTOR,
        isActive: true,
      });
      user = await userRepo.save(user);
      console.log(`✅ Conductor creado: ${data.name}`);
    }
    conductors.push(user);
  }

  // 3. Crear Ambulancias (Ubicación: Cercado de Lima)
  const ambulanceRepo = dataSource.getRepository(Ambulance);
  const coordinates = [
    { lat: -12.046374, lng: -77.042793, plate: 'ABC-123', type: AmbulanceType.I },
    { lat: -12.050000, lng: -77.045000, plate: 'XYZ-987', type: AmbulanceType.II },
  ];

  for (let i = 0; i < coordinates.length; i++) {
    const coord = coordinates[i];
    let amb = await ambulanceRepo.findOne({ where: { plate: coord.plate } });
    if (!amb) {
      amb = ambulanceRepo.create({
        plate: coord.plate,
        type: coord.type,
        status: AmbulanceStatus.AVAILABLE,
        companyId: company.id,
        conductorId: conductors[i].id,
        locationLat: coord.lat,
        locationLng: coord.lng,
        location: {
          type: 'Point',
          coordinates: [coord.lng, coord.lat],
        },
        isActive: true,
      });
      await ambulanceRepo.save(amb);
      console.log(`✅ Ambulancia creada: ${coord.plate}`);
    }
  }

  console.log('🏁 Seeding completado con éxito.');
  await app.close();
}

bootstrap();
