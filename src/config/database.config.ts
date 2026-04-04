import { registerAs } from '@nestjs/config';
import { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

const common = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  schema: process.env.DB_SCHEMA || 'ambudb',
  logging: process.env.NODE_ENV === 'development',
  synchronize: false,
  migrationsTableName: 'typeorm_migrations',
} as const;

// Config used by Nest/TypeOrmModule (runtime built app uses compiled `dist` paths)
export default registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    ...common,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: ['dist/migrations/*.js'],
  }),
);

// Export a DataSource instance for the typeorm CLI (ts-node/run-time)
export const AppDataSource = new DataSource({
  ...common,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  // CLI runs in TS (ts-node), point to source migrations
  migrations: [__dirname + '/../../migrations/*{.ts,.js}'],
});
