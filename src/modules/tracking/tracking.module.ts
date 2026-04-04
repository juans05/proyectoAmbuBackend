import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { TrackingGateway } from './tracking.gateway';
import { Ambulance } from '../ambulances/entities/ambulance.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ambulance]),
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.accessSecret'),
        signOptions: { expiresIn: config.get('jwt.accessExpires') },
      }),
    }),
  ],
  providers: [
    TrackingGateway,
    {
      provide: Redis,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.get<string>('redis.host') || 'localhost',
          port: config.get<number>('redis.port') || 6379,
          password: config.get<string>('redis.password') || undefined,
          lazyConnect: true,
        }),
    },
  ],
  exports: [TrackingGateway],
})
export class TrackingModule {}
