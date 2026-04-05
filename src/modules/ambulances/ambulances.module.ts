import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ambulance } from './entities/ambulance.entity';
import { AmbulancesService } from './ambulances.service';
import { AmbulancesController } from './ambulances.controller';
import { TrackingModule } from '../tracking/tracking.module';

@Module({
  imports: [TypeOrmModule.forFeature([Ambulance]), forwardRef(() => TrackingModule)],
  providers: [AmbulancesService],
  controllers: [AmbulancesController],
  exports: [AmbulancesService, TypeOrmModule],
})
export class AmbulancesModule {}
