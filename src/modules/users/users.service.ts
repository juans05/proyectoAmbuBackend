import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { User } from './entities/user.entity'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { UpdateMedicalDto } from './dto/update-medical.dto'
import { PaginationDto } from '../../common/dto/pagination.dto'
import { paginate, paginationToSkipTake } from '../../common/utils/pagination.utils'

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } })
  }

  async findOne(id: string): Promise<User> {
    const user = await this.findById(id)
    if (!user) throw new NotFoundException('Usuario no encontrado')
    return user
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } })
  }

  async findByEmailWithPassword(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      select: ['id', 'email', 'name', 'password', 'role', 'subscriptionTier', 'isActive', 'phone', 'avatarUrl', 'fcmToken', 'refreshToken'],
    })
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData)
    return this.userRepository.save(user)
  }

  async update(id: string, updateData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, updateData)
    return this.findOne(id)
  }

  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    await this.userRepository.update(id, { refreshToken: refreshToken as string })
  }

  async updateProfile(id: string, dto: UpdateProfileDto): Promise<User> {
    return this.update(id, dto)
  }

  async updateMedical(id: string, dto: UpdateMedicalDto): Promise<User> {
    return this.update(id, dto)
  }

  async updateFcmToken(id: string, token: string): Promise<void> {
    await this.userRepository.update(id, { fcmToken: token })
  }

  async findAll(pagination: PaginationDto) {
    const { skip, take } = paginationToSkipTake(pagination.page!, pagination.limit!)
    const [data, total] = await this.userRepository.findAndCount({
      skip,
      take,
      order: { createdAt: 'DESC' },
    })
    return paginate(data, total, pagination.page!, pagination.limit!)
  }
}
