import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '../../common/enums/user-role.enum'
import { ReportsService } from './reports.service'

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.BUSINESS)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Métricas generales tiempo real' })
  dashboard() {
    return this.reportsService.dashboard()
  }

  @Get('response-times')
  @ApiOperation({ summary: 'Tiempos promedio de respuesta (últimos 30 días)' })
  responseTimes() {
    return this.reportsService.responseTimes()
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Ingresos y comisiones por período' })
  revenue(@Query('from') from?: string, @Query('to') to?: string) {
    return this.reportsService.revenue(from, to)
  }

  @Get('heatmap')
  @ApiOperation({ summary: 'GeoJSON zonas de mayor demanda' })
  heatmap() {
    return this.reportsService.heatmap()
  }
}
