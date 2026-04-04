import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { ThrottlerModule } from '@nestjs/throttler';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import jwtConfig from './config/jwt.config';
import bullConfig from './config/bull.config';
import { envValidationSchema } from './config/env.validation';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { AmbulancesModule } from './modules/ambulances/ambulances.module';
import { EmergenciesModule } from './modules/emergencies/emergencies.module';
import { DispatchModule } from './modules/dispatch/dispatch.module';
import { TrackingModule } from './modules/tracking/tracking.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SubscriptionsModule } from './modules/subscriptions/subscriptions.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { AiAssistantModule } from './modules/ai-assistant/ai-assistant.module';
import { ReportsModule } from './modules/reports/reports.module';
import { UbigeoModule } from './modules/ubigeo/ubigeo.module';
import { HealthModule } from './modules/health/health.module';
import { PlansModule } from './modules/plans/plans.module';
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, jwtConfig, bullConfig],
      validationSchema: envValidationSchema,
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => config.get('database')!,
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: config.get('bull.redis')!,
      }),
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    // Fase 1
    AuthModule,
    UsersModule,
    CompaniesModule,
    AmbulancesModule,
    EmergenciesModule,
    DispatchModule,
    TrackingModule,
    NotificationsModule,
    CommonModule,
    // Fase 2
    SubscriptionsModule,
    PaymentsModule,
    AiAssistantModule,
    ReportsModule,
    UbigeoModule,
    HealthModule,
    PlansModule,
  ],
})
export class AppModule {}
