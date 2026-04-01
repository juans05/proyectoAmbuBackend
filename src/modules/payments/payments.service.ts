import { Injectable, BadRequestException, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { HttpService } from '@nestjs/axios'
import { firstValueFrom } from 'rxjs'
import { Payment } from './entities/payment.entity'
import { ProcessPaymentDto } from './dto/process-payment.dto'

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name)

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async charge(userId: string, dto: ProcessPaymentDto): Promise<Payment> {
    if (!dto.emergencyId && !dto.subscriptionId) {
      throw new BadRequestException('Debe indicar emergencyId o subscriptionId')
    }

    // TODO: llamar a Culqi API real con dto.culqiToken
    // Por ahora registramos el pago como completado (integración pendiente)
    const commission = this.config.get<number>('PLATFORM_COMMISSION') ?? 0.12
    const amount = 100 // placeholder — debe venir de la emergencia/suscripción
    const payment = this.paymentRepo.create({
      userId,
      emergencyId: dto.emergencyId,
      subscriptionId: dto.subscriptionId,
      type: dto.emergencyId ? 'emergency' : 'subscription',
      amount,
      platformFee: +(amount * commission).toFixed(2),
      companyAmount: +(amount * (1 - commission)).toFixed(2),
      status: 'paid',
      paymentMethod: 'card',
    })
    return this.paymentRepo.save(payment)
  }

  async findByUser(userId: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    })
  }

  async report(): Promise<{ totalRevenue: number; totalCommissions: number; count: number }> {
    const result = await this.paymentRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'totalRevenue')
      .addSelect('SUM(p.platformFee)', 'totalCommissions')
      .addSelect('COUNT(*)', 'count')
      .where('p.status = :status', { status: 'paid' })
      .getRawOne()
    return {
      totalRevenue: +result.totalRevenue || 0,
      totalCommissions: +result.totalCommissions || 0,
      count: +result.count || 0,
    }
  }
}
