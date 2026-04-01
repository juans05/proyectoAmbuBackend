import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { District } from './entities/district.entity'
import { UbigeoService } from './ubigeo.service'
import { UbigeoController } from './ubigeo.controller'

@Module({
  imports: [TypeOrmModule.forFeature([District])],
  providers: [UbigeoService],
  controllers: [UbigeoController],
})
export class UbigeoModule {}
