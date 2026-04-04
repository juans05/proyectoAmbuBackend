import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Emergency } from '../emergencies/entities/emergency.entity';
import { Ambulance } from '../ambulances/entities/ambulance.entity';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Emergency, Ambulance])],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
