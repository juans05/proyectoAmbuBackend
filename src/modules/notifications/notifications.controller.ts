import {
  Controller,
  Get,
  Put,
  Param,
  Query,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  paginate,
  paginationToSkipTake,
} from '../../common/utils/pagination.utils';

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(
    @InjectRepository(Notification)
    private readonly notificationRepo: Repository<Notification>,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Lista paginada de notificaciones del usuario autenticado',
  })
  async findAll(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    const { skip, take } = paginationToSkipTake(
      pagination.page!,
      pagination.limit!,
    );
    const [data, total] = await this.notificationRepo.findAndCount({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    return paginate(data, total, pagination.page!, pagination.limit!);
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  async markAsRead(@Param('id') id: string, @CurrentUser() user: User) {
    const notification = await this.notificationRepo.findOne({
      where: { id, userId: user.id },
    });
    if (!notification) {
      throw new NotFoundException('Notificación no encontrada');
    }
    notification.isRead = true;
    return this.notificationRepo.save(notification);
  }
}
