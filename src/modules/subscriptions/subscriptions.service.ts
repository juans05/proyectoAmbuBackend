import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription } from './entities/subscription.entity';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UsersService } from '../users/users.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  paginate,
  paginationToSkipTake,
} from '../../common/utils/pagination.utils';

const PLAN_PRICES: Record<string, number> = {
  protegido: 29.9,
  familia: 49.9,
};

@Injectable()
export class SubscriptionsService {
  constructor(
    @InjectRepository(Subscription)
    private readonly subRepo: Repository<Subscription>,
    private readonly usersService: UsersService,
  ) {}

  getPlans() {
    return [
      {
        id: 'protegido',
        name: 'Plan Protegido',
        price: PLAN_PRICES.protegido,
        benefits: [
          '20% descuento en emergencias',
          'Hasta 1 beneficiario',
          'Soporte prioritario',
        ],
      },
      {
        id: 'familia',
        name: 'Plan Familia',
        price: PLAN_PRICES.familia,
        benefits: [
          '20% descuento en emergencias',
          'Hasta 5 beneficiarios',
          'Soporte 24/7',
        ],
      },
    ];
  }

  async create(
    userId: string,
    dto: CreateSubscriptionDto,
  ): Promise<Subscription> {
    const active = await this.subRepo.findOne({
      where: { userId, status: 'active' },
    });
    if (active) throw new ConflictException('Ya tienes una suscripción activa');

    const startDate = new Date();
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const sub = this.subRepo.create({
      userId,
      plan: dto.plan,
      monthlyAmount: PLAN_PRICES[dto.plan],
      startDate,
      endDate,
      status: 'active',
    });
    const saved = await this.subRepo.save(sub);
    await this.usersService.update(userId, { subscriptionTier: dto.plan });
    return saved;
  }

  async findActive(userId: string): Promise<Subscription | null> {
    return this.subRepo.findOne({ where: { userId, status: 'active' } });
  }

  async findAllAdmin(pagination: PaginationDto, status?: string) {
    const { skip, take } = paginationToSkipTake(
      pagination.page!,
      pagination.limit!,
    );
    const where: { status?: string } = {};
    if (status) where.status = status;
    const [data, total] = await this.subRepo.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip,
      take,
    });
    // Map to frontend-expected shape
    const mapped = data.map((s) => ({
      id: s.id,
      userId: s.userId,
      planName: s.plan,
      status: s.status,
      startDate: s.startDate,
      endDate: s.endDate,
      amount: s.monthlyAmount,
      user: s.user
        ? { id: s.user.id, name: s.user.name, email: s.user.email }
        : undefined,
    }));
    return paginate(mapped, total, pagination.page!, pagination.limit!);
  }

  async cancel(userId: string): Promise<void> {
    const sub = await this.findActive(userId);
    if (!sub) throw new NotFoundException('No tienes suscripción activa');
    await this.subRepo.update(sub.id, {
      status: 'cancelled',
      cancelledAt: new Date(),
    });
    await this.usersService.update(userId, { subscriptionTier: 'free' });
  }
}
