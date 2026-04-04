import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateMedicalDto } from './dto/update-medical.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { User } from './entities/user.entity';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Mi perfil' })
  getProfile(@CurrentUser() user: User) {
    return this.usersService.findOne(user.id);
  }

  @Put('me')
  @ApiOperation({ summary: 'Actualizar perfil' })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Put('me/medical')
  @ApiOperation({ summary: 'Actualizar datos médicos' })
  updateMedical(@CurrentUser() user: User, @Body() dto: UpdateMedicalDto) {
    return this.usersService.updateMedical(user.id, dto);
  }

  @Post('me/fcm-token')
  @ApiOperation({ summary: 'Registrar token FCM para notificaciones push' })
  updateFcmToken(@CurrentUser() user: User, @Body('token') token: string) {
    return this.usersService.updateFcmToken(user.id, token);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Lista paginada de usuarios' })
  findAll(@Body() pagination: PaginationDto) {
    return this.usersService.findAll(pagination);
  }

  @Get(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Detalle de usuario' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }
}
