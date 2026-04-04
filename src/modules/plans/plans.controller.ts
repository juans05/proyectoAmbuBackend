import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PlansService } from './plans.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Plans')
@Controller('plans')
export class PlansController {
  constructor(private readonly plansService: PlansService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Lista de planes con precios y beneficios',
    description: 'Retorna todos los planes activos: free, protegido y familia.',
  })
  findAll() {
    return this.plansService.findAll();
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Detalle de un plan por ID' })
  findOne(@Param('id') id: string) {
    return this.plansService.findById(id);
  }
}
