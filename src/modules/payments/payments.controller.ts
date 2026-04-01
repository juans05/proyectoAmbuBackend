import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { UserRole } from '../../common/enums/user-role.enum'
import { User } from '../users/entities/user.entity'
import { PaymentsService } from './payments.service'
import { ProcessPaymentDto } from './dto/process-payment.dto'

@ApiTags('Payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('charge')
  @ApiOperation({ summary: 'Cobrar servicio de emergencia' })
  charge(@CurrentUser() user: User, @Body() dto: ProcessPaymentDto) {
    return this.paymentsService.charge(user.id, dto)
  }

  @Post('subscription')
  @ApiOperation({ summary: 'Cobrar suscripción' })
  chargeSubscription(@CurrentUser() user: User, @Body() dto: ProcessPaymentDto) {
    return this.paymentsService.charge(user.id, dto)
  }

  @Get('history')
  @ApiOperation({ summary: 'Historial de pagos' })
  history(@CurrentUser() user: User) {
    return this.paymentsService.findByUser(user.id)
  }

  @Get('report')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Reporte de comisiones' })
  report() {
    return this.paymentsService.report()
  }
}
