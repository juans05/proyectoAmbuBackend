import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, Like } from 'typeorm'
import { District } from './entities/district.entity'

@Injectable()
export class UbigeoService {
  constructor(
    @InjectRepository(District)
    private readonly districtRepo: Repository<District>,
  ) {}

  async findDistricts(search?: string): Promise<District[]> {
    if (search) {
      return this.districtRepo.find({
        where: [
          { district: Like(`%${search}%`), province: 'LIMA' },
          { district: Like(`%${search}%`), province: 'CALLAO' },
        ],
        order: { district: 'ASC' },
        take: 50,
      })
    }
    return this.districtRepo.find({
      where: [{ province: 'LIMA' }, { province: 'CALLAO' }],
      order: { district: 'ASC' },
    })
  }
}
