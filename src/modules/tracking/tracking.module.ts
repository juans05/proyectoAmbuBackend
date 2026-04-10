import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import Redis from 'ioredis';
import { TrackingGateway } from './tracking.gateway';
import { TrackingController } from './tracking.controller';
import { RouteAnalyticsService } from './route-analytics.service';
import { PriorityEngineService } from './priority-engine.service';
import { WazeIntegrationService } from './waze-integration.service';
import { Ambulance } from '../ambulances/entities/ambulance.entity';
import { Emergency } from '../emergencies/entities/emergency.entity';
import { RouteLog } from './entities/route-log.entity';
import { Intersection } from './entities/intersection.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ambulance, RouteLog, Emergency, Intersection]),
    ConfigModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('jwt.accessSecret'),
        signOptions: { expiresIn: config.get('jwt.accessExpires') },
      }),
    }),
  ],
  controllers: [TrackingController],
  providers: [
    TrackingGateway,
    RouteAnalyticsService,
    PriorityEngineService,
    WazeIntegrationService,
    {
      provide: Redis,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('redis.url');
        const host = config.get<string>('redis.host');
        const port = config.get<number>('redis.port');
        const password = config.get<string>('redis.password');

        if (url) {
          return new Redis(url, {
            lazyConnect: true,
            maxRetriesPerRequest: null,
            enableOfflineQueue: true,
          });
        }

        return new Redis({
          host: host || 'localhost',
          port: port || 6379,
          password: password || undefined,
          lazyConnect: true,
          maxRetriesPerRequest: null,
          enableOfflineQueue: true,
        });
      },
    },
  ],
  exports: [TrackingGateway, RouteAnalyticsService, PriorityEngineService, WazeIntegrationService],
})
export class TrackingModule {}
