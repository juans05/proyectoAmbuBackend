import { Controller, Post, Body, UseGuards, Request, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { EmergenciesService } from './emergencies.service';

@ApiTags('Emergencies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('emergencies')
export class EmergenciesController {
  constructor(private readonly emergenciesService: EmergenciesService) {}

  @Post()
  @ApiOperation({ summary: 'Crear una nueva solicitud de emergencia' })
  async create(@Request() req: any, @Body() data: any) {
    return this.emergenciesService.create(req.user.id, data);
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener mi emergencia activa' })
  async findActive(@Request() req: any) {
    return this.emergenciesService.findActive(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una emergencia' })
  async findOne(@Param('id') id: string) {
    return this.emergenciesService.findOne(id);
  }
}
