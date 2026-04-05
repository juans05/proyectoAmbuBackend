import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AmbulanceStatus } from '../../common/enums/ambulance-status.enum';
import { GeoQueryDto } from '../../common/dto/geo-query.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AmbulancesService } from './ambulances.service';
import { CreateAmbulanceDto } from './dto/create-ambulance.dto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { User } from '../users/entities/user.entity';
import { Logger } from '@nestjs/common';

@ApiTags('Ambulances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ambulances')
export class AmbulancesController {
  private readonly logger = new Logger(AmbulancesController.name);
  constructor(private readonly ambulancesService: AmbulancesService) {}

  @Post()
  @Roles(UserRole.BUSINESS, UserRole.ADMIN)
  @ApiOperation({ summary: 'Registrar ambulancia' })
  create(@Body() dto: CreateAmbulanceDto) {
    return this.ambulancesService.create(dto);
  }

  @Get()
  @Roles(UserRole.BUSINESS, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Listar ambulancias [ADMIN: todas | BUSINESS: por empresa]',
  })
  findAll(
    @CurrentUser() user: User & { companyId?: string },
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
  ) {
    if (user.role === UserRole.ADMIN) {
      return this.ambulancesService.findAllAdmin(pagination, status);
    }
    return this.ambulancesService.findByCompany(user.companyId ?? '');
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Ambulancias cercanas disponibles' })
  findNearby(@Query() query: GeoQueryDto) {
    return this.ambulancesService.findNearby(query);
  }

  @Get('conductor/mine')
  @Roles(UserRole.CONDUCTOR)
  @ApiOperation({ summary: 'Mi ambulancia asignada [CONDUCTOR]' })
  myConductorAmbulance(@CurrentUser() user: User) {
    return this.ambulancesService.findByConductor(user.id);
  }

  @Get('conductor/stats')
  @Roles(UserRole.CONDUCTOR)
  @ApiOperation({ summary: 'Estadísticas del día [CONDUCTOR]' })
  myConductorStats(@CurrentUser() user: User) {
    return this.ambulancesService.getConductorDayStats(user.id);
  }

  @Put('conductor/status')
  @Roles(UserRole.CONDUCTOR)
  @ApiOperation({ summary: 'Cambiar mi estado de disponibilidad [CONDUCTOR]' })
  updateConductorStatus(
    @CurrentUser() user: User,
    @Body('status') status: AmbulanceStatus,
  ) {
    this.logger.log(`Conductor ${user.email} (ID: ${user.id}) cambiando estado a: ${status}`);
    return this.ambulancesService.updateStatusByConductor(user.id, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de ambulancia' })
  findOne(@Param('id') id: string) {
    return this.ambulancesService.findOne(id);
  }

  @Put(':id/status')
  @Roles(UserRole.CONDUCTOR, UserRole.BUSINESS, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cambiar estado de ambulancia' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: AmbulanceStatus,
  ) {
    return this.ambulancesService.updateStatus(id, status);
  }

  @Put(':id/location')
  @Roles(UserRole.CONDUCTOR)
  @ApiOperation({ summary: 'Actualizar ubicación GPS [CONDUCTOR]' })
  updateLocation(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.ambulancesService.updateLocation(id, dto);
  }
}
