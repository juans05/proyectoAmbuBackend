import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Emergency } from './entities/emergency.entity';
import { User } from '../users/entities/user.entity';
import { Ambulance } from '../ambulances/entities/ambulance.entity';
import { EmergenciesService } from './emergencies.service';
import { EmergenciesController } from './emergencies.controller';
import { DispatchModule } from '../dispatch/dispatch.module';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Emergency, User, Ambulance]),
    DispatchModule,
    TrackingModule,
  ],
  providers: [EmergenciesService],
  controllers: [EmergenciesController],
  exports: [EmergenciesService],
})
export class EmergenciesModule {}
