import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard'
import { RolesGuard } from '../../common/guards/roles.guard'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '../../common/enums/user-role.enum'
import { CompaniesService } from './companies.service'
import { CreateCompanyDto } from './dto/create-company.dto'

@ApiTags('Companies')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @ApiOperation({ summary: 'Registrar empresa' })
  create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto)
  }

  @Get()
  @ApiOperation({ summary: 'Lista de empresas verificadas' })
  findAll() {
    return this.companiesService.findAll()
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de empresa' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id)
  }

  @Put(':id')
  @Roles(UserRole.BUSINESS, UserRole.ADMIN)
  @ApiOperation({ summary: 'Actualizar empresa [BUSINESS]' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateCompanyDto>) {
    return this.companiesService.update(id, dto)
  }

  @Put(':id/verify')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[ADMIN] Verificar empresa' })
  verify(@Param('id') id: string) {
    return this.companiesService.verify(id)
  }
}
