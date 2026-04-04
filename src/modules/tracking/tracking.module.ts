import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { TrackingGateway } from './tracking.gateway';
import { RouteAnalyticsService } from './route-analytics.service';
import { Ambulance } from '../ambulances/entities/ambulance.entity';
import { Emergency } from '../emergencies/entities/emergency.entity';
import { RouteLog } from './entities/route-log.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ambulance, RouteLog, Emergency]),
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
    RouteAnalyticsService,
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
  exports: [TrackingGateway, RouteAnalyticsService],
})
export class TrackingModule {}
