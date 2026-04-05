import 'dotenv/config';
import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const getCommonConfig = () => ({
  type: 'postgres' as const,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  schema: process.env.DB_SCHEMA || 'ambudb',
  logging: process.env.NODE_ENV === 'development',
  synchronize: false,
  migrationsTableName: 'typeorm_migrations',
});

// Config used by Nest/TypeOrmModule
export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    ...getCommonConfig(),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: ['dist/migrations/*.js'],
  }),
);

// Export a DataSource instance for the typeorm CLI
export const AppDataSource = new DataSource({
  ...getCommonConfig(),
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
});
