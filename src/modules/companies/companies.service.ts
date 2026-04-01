import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Company } from './entities/company.entity'
import { CreateCompanyDto } from './dto/create-company.dto'

@Injectable()
export class CompaniesService {
  constructor(
    @InjectRepository(Company)
    private readonly companyRepo: Repository<Company>,
  ) {}

  async create(dto: CreateCompanyDto): Promise<Company> {
    const existing = await this.companyRepo.findOne({ where: { ruc: dto.ruc } })
    if (existing) throw new ConflictException('Ya existe una empresa con ese RUC')
    const company = this.companyRepo.create(dto)
    return this.companyRepo.save(company)
  }

  async findAll(): Promise<Company[]> {
    return this.companyRepo.find({ where: { isVerified: true }, order: { name: 'ASC' } })
  }

  async findOne(id: string): Promise<Company> {
    const company = await this.companyRepo.findOne({ where: { id }, relations: ['ambulances'] })
    if (!company) throw new NotFoundException('Empresa no encontrada')
    return company
  }

  async update(id: string, data: Partial<Company>): Promise<Company> {
    await this.findOne(id)
    await this.companyRepo.update(id, data)
    return this.findOne(id)
  }

  async verify(id: string): Promise<Company> {
    return this.update(id, { isVerified: true })
  }
}
