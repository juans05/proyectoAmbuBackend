import { Controller, Get, Post, Delete, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { SubscriptionsService } from './subscriptions.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';

@ApiTags('Subscriptions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('subscriptions')
export class SubscriptionsController {
  constructor(private readonly subscriptionsService: SubscriptionsService) {}

  @Get('plans')
  @ApiOperation({ summary: 'Planes disponibles' })
  getPlans() {
    return this.subscriptionsService.getPlans();
  }

  @Post()
  @ApiOperation({ summary: 'Suscribirse a un plan' })
  create(@CurrentUser() user: User, @Body() dto: CreateSubscriptionDto) {
    return this.subscriptionsService.create(user.id, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Mi suscripción activa' })
  findMine(@CurrentUser() user: User) {
    return this.subscriptionsService.findActive(user.id);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Cancelar suscripción' })
  cancel(@CurrentUser() user: User) {
    return this.subscriptionsService.cancel(user.id);
  }
}
