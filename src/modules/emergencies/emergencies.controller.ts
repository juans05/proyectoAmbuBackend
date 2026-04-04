import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { User } from '../users/entities/user.entity';
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
  async create(@CurrentUser() user: User, @Body() data: CreateEmergencyDto) {
    return this.emergenciesService.create(user.id, data);
  }

  @Get('active')
  @ApiOperation({ summary: 'Obtener mi emergencia activa' })
  async findActive(@CurrentUser() user: User) {
    return this.emergenciesService.findActive(user.id);
  }

  @Get('history')
  @ApiOperation({ summary: 'Obtener historial de emergencias del usuario' })
  async findHistory(@CurrentUser() user: User) {
    return this.emergenciesService.findHistory(user.id);
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
  async cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.emergenciesService.cancel(id, user.id);
  }

  @Put(':id/accept')
  @Roles(UserRole.CONDUCTOR)
  @ApiOperation({ summary: '[CONDUCTOR] Aceptar una emergencia asignada' })
  async accept(@Param('id') id: string, @CurrentUser() user: User) {
    return this.emergenciesService.accept(id, user.id);
  }

  @Put(':id/arrived')
  @Roles(UserRole.CONDUCTOR)
  @ApiOperation({ summary: '[CONDUCTOR] Marcar llegada al punto de recogida' })
  async arrived(@Param('id') id: string, @CurrentUser() user: User) {
    return this.emergenciesService.arrived(id, user.id);
  }

  @Put(':id/complete')
  @Roles(UserRole.CONDUCTOR)
  @ApiOperation({ summary: '[CONDUCTOR] Completar una emergencia' })
  async complete(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @Body() data: CompleteEmergencyDto,
  ) {
    return this.emergenciesService.complete(id, user.id, data);
  }
}
