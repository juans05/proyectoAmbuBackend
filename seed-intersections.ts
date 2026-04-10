import { DataSource } from 'typeorm';
import { Intersection, IntersectionType } from './src/modules/tracking/entities/intersection.entity';

// NOTA: Este es un ejemplo de cómo poblar la base de datos con los cruces semaforizados
// Se puede ejecutar manualmente o integrar en un seeder de TypeORM.

export async function seedIntersections(dataSource: DataSource) {
  const repo = dataSource.getRepository(Intersection);

  const intersections = [
    {
      name: 'Av. Javier Prado con Av. Arequipa',
      lat: -12.0917,
      lng: -77.0345,
      type: IntersectionType.TRAFFIC_LIGHT,
    },
    {
      name: 'Av. Salaverry con Av. 28 de Julio',
      lat: -12.0673,
      lng: -77.0387,
      type: IntersectionType.TRAFFIC_LIGHT,
    },
    {
      name: 'Av. Tacna con Av. Nicolás de Piérola',
      lat: -12.0468,
      lng: -77.0348,
      type: IntersectionType.TRAFFIC_LIGHT,
    },
    {
      name: 'Óvalo Gutiérrez',
      lat: -12.1122,
      lng: -77.0366,
      type: IntersectionType.ROUNDABOUT,
    },
    {
        name: 'Av. Brasil con Av. San Felipe',
        lat: -12.0782,
        lng: -77.0504,
        type: IntersectionType.TRAFFIC_LIGHT,
    }
  ];

  for (const inter of intersections) {
    const exists = await repo.findOne({ where: { name: inter.name } });
    if (!exists) {
      const newInter = repo.create({
        ...inter,
        location: {
          type: 'Point',
          coordinates: [inter.lng, inter.lat],
        },
      });
      await repo.save(newInter);
      console.log(`Seed: Intersección ${inter.name} creada.`);
    }
  }
}
