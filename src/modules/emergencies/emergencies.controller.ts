import {
  Controller,
  Post,
  Body,
  UseGuards,
  Request,
  Get,
  Param,
  Put,
  UseInterceptors,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { EmergenciesService } from './emergencies.service';
import { CreateEmergencyDto } from './dto/create-emergency.dto';
import { CompleteEmergencyDto } from './dto/complete-emergency.dto';

@ApiTags('Emergencies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('emergencies')
export class EmergenciesController {
  constructor(private readonly emergenciesService: EmergenciesService) {}

  @Throttle({ default: { limit: 3, ttl: 3600000 } })
  @Post()
  @ApiOperation({ summary: 'Crear una nueva solicitud de emergencia' })
  async create(@Request() req: any, @Body() data: CreateEmergencyDto) {
    return this.emergenciesService.create(req.user.id, data);
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener mi emergencia activa' })
  async findActive(@Request() req: any) {
    return this.emergenciesService.findActive(req.user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Obtener historial de emergencias del usuario' })
  async findHistory(@Request() req: any) {
    return this.emergenciesService.findHistory(req.user.id);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Listar todas las emergencias' })
  async findAll() {
    return this.emergenciesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener detalle de una emergencia' })
  async findOne(@Param('id') id: string) {
    return this.emergenciesService.findOne(id);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancelar una emergencia' })
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.emergenciesService.cancel(id, req.user.id);
  }

  @Put(':id/accept')
  @Roles(UserRole.CONDUCTOR)
  @ApiOperation({ summary: '[CONDUCTOR] Aceptar una emergencia asignada' })
  async accept(@Param('id') id: string, @Request() req: any) {
    return this.emergenciesService.accept(id, req.user.id);
  }

  @Put(':id/arrived')
  @Roles(UserRole.CONDUCTOR)
  @ApiOperation({ summary: '[CONDUCTOR] Marcar llegada al punto de recogida' })
  async arrived(@Param('id') id: string, @Request() req: any) {
    return this.emergenciesService.arrived(id, req.user.id);
  }

  @Put(':id/complete')
  @Roles(UserRole.CONDUCTOR)
  @ApiOperation({ summary: '[CONDUCTOR] Completar una emergencia' })
  async complete(
    @Param('id') id: string,
    @Request() req: any,
    @Body() data: CompleteEmergencyDto,
  ) {
    return this.emergenciesService.complete(id, req.user.id, data);
  }
}
