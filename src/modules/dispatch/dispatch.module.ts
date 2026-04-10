import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bull';
import { DispatchProcessor } from './dispatch.processor';
import { DispatchService } from './dispatch.service';
import { RoutingService } from './routing.service';
import { Ambulance } from '../ambulances/entities/ambulance.entity';
import { Emergency } from '../emergencies/entities/emergency.entity';
import { DISPATCH_QUEUE } from '../../common/constants/queues.constant';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ambulance, Emergency]),
    BullModule.registerQueue({
      name: DISPATCH_QUEUE,
    }),
    TrackingModule,
  ],
  providers: [DispatchProcessor, DispatchService, RoutingService],
  exports: [DispatchService, RoutingService, BullModule],
})
export class DispatchModule {}
