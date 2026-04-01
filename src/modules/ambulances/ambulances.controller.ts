import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '../../common/enums/user-role.enum'
import { AmbulanceStatus } from '../../common/enums/ambulance-status.enum'
import { GeoQueryDto } from '../../common/dto/geo-query.dto'
import { AmbulancesService } from './ambulances.service'
import { CreateAmbulanceDto } from './dto/create-ambulance.dto'
import { UpdateLocationDto } from './dto/update-location.dto'
import { User } from '../users/entities/user.entity'

@ApiTags('Ambulances')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('ambulances')
export class AmbulancesController {
  constructor(private readonly ambulancesService: AmbulancesService) {}

  @Post()
  @Roles(UserRole.BUSINESS, UserRole.ADMIN)
  @ApiOperation({ summary: 'Registrar ambulancia' })
  create(@Body() dto: CreateAmbulanceDto) {
    return this.ambulancesService.create(dto)
  }

  @Get()
  @Roles(UserRole.BUSINESS, UserRole.ADMIN)
  @ApiOperation({ summary: 'Mis ambulancias [BUSINESS]' })
  findMine(@CurrentUser() user: User & { companyId?: string }) {
    return this.ambulancesService.findByCompany(user.companyId ?? '')
  }

  @Get('nearby')
  @ApiOperation({ summary: 'Ambulancias cercanas disponibles' })
  findNearby(@Query() query: GeoQueryDto) {
    return this.ambulancesService.findNearby(query)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de ambulancia' })
  findOne(@Param('id') id: string) {
    return this.ambulancesService.findOne(id)
  }

  @Put(':id/status')
  @Roles(UserRole.CONDUCTOR, UserRole.BUSINESS, UserRole.ADMIN)
  @ApiOperation({ summary: 'Cambiar estado de ambulancia' })
  updateStatus(@Param('id') id: string, @Body('status') status: AmbulanceStatus) {
    return this.ambulancesService.updateStatus(id, status)
  }

  @Put(':id/location')
  @Roles(UserRole.CONDUCTOR)
  @ApiOperation({ summary: 'Actualizar ubicación GPS [CONDUCTOR]' })
  updateLocation(@Param('id') id: string, @Body() dto: UpdateLocationDto) {
    return this.ambulancesService.updateLocation(id, dto)
  }
}
