import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Ambulance } from './entities/ambulance.entity'
import { AmbulancesService } from './ambulances.service'
import { AmbulancesController } from './ambulances.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Ambulance])],
  providers: [AmbulancesService],
  controllers: [AmbulancesController],
  exports: [AmbulancesService, TypeOrmModule],
})
export class AmbulancesModule {}
