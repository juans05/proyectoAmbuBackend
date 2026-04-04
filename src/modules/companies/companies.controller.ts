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
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto } from './dto/create-company.dto';
import { User } from '../users/entities/user.entity';

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BUSINESS)
  @ApiOperation({ summary: 'Registrar empresa' })
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary:
      'Lista de empresas [ADMIN: todas con paginación | público: verificadas]',
  })
  findAll(
    @CurrentUser() user: User,
    @Query() pagination: PaginationDto,
    @Query('filter') filter?: string,
  ) {
    if (user.role === UserRole.ADMIN) {
      return this.companiesService.findAllAdmin(pagination, filter);
    }
    return this.companiesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de empresa' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Put(':id')
  @Roles(UserRole.BUSINESS, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar empresa [BUSINESS]' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCompanyDto>) {
    return this.companiesService.update(id, dto);
  }

  @Put(':id/verify')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Verificar empresa' })
  verify(@Param('id') id: string) {
    return this.companiesService.verify(id);
  }

  @Put(':id/suspend')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Suspender empresa' })
  suspend(@Param('id') id: string) {
    return this.companiesService.suspend(id);
  }
}
