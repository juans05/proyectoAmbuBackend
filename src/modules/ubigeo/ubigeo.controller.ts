import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiOperation } from '@nestjs/swagger'
import { UbigeoService } from './ubigeo.service'

@ApiTags('Ubigeo')
@Controller('ubigeo')
export class UbigeoController {
  constructor(private readonly ubigeoService: UbigeoService) {}

  @Get('districts')
  @ApiOperation({ summary: 'Distritos de Lima y Callao' })
  findDistricts(@Query('search') search?: string) {
    return this.ubigeoService.findDistricts(search)
  }
}
