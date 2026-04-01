import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Emergency } from './entities/emergency.entity';
import { EmergenciesService } from './emergencies.service';
import { EmergenciesController } from './emergencies.controller';
import { DispatchModule } from '../dispatch/dispatch.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Emergency]),
    DispatchModule,
  ],
  providers: [EmergenciesService],
  controllers: [EmergenciesController],
  exports: [EmergenciesService],
})
export class EmergenciesModule {}
