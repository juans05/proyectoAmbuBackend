import {
  Injectable,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { Payment } from './entities/payment.entity';
import { ProcessPaymentDto } from './dto/process-payment.dto';
import { Emergency } from '../emergencies/entities/emergency.entity';
import { Subscription } from '../subscriptions/entities/subscription.entity';
import { Plan } from '../plans/entities/plan.entity';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
    @InjectRepository(Emergency)
    private readonly emergencyRepo: Repository<Emergency>,
    @InjectRepository(Subscription)
    private readonly subscriptionRepo: Repository<Subscription>,
    @InjectRepository(Plan)
    private readonly planRepo: Repository<Plan>,
    private readonly config: ConfigService,
    private readonly httpService: HttpService,
  ) {}

  async charge(userId: string, dto: ProcessPaymentDto): Promise<Payment> {
    if (!dto.emergencyId && !dto.subscriptionId) {
      throw new BadRequestException(
        'Debe indicar emergencyId o subscriptionId',
      );
    }

    let amount = 0;
    let description = '';

    if (dto.emergencyId) {
      const emergency = await this.emergencyRepo.findOneBy({
        id: dto.emergencyId,
      });
      if (!emergency) throw new BadRequestException('Emergencia no encontrada');
      amount = emergency.totalAmount || 100; // fallback si no se calculó
      description = `Emergencia AmbuGo - ${emergency.type}`;
    } else {
      const subscription = await this.subscriptionRepo.findOneBy({
        id: dto.subscriptionId,
      });
      if (!subscription)
        throw new BadRequestException('Suscripción no encontrada');

      // Obtener el plan desde la tabla `plans` (subscription.plan almacena el id)
      const plan = await this.planRepo.findOne({
        where: { id: subscription.plan },
      });
      if (!plan) throw new NotFoundException('Plan asociado no encontrado');

      amount = Number(plan.price);
      description = `Suscripción AmbuGo - Plan ${plan.name}`;
    }

    const culqiSecret = this.config.get<string>('CULQI_SECRET_KEY');

    try {
      // Culqi requiere el monto en céntimos (integer)
      const amountInCents = Math.round(amount * 100);

      const response = await firstValueFrom(
        this.httpService.post(
          'https://api.culqi.com/v2/charges',
          {
            amount: amountInCents,
            currency_code: 'PEN',
            email: 'cliente@ambugo.com', // En prod usar email del usuario
            source_id: dto.culqiToken,
            description,
          },
          {
            headers: {
              Authorization: `Bearer ${culqiSecret}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (response.data.object !== 'charge') {
        throw new Error('Error en el procesamiento del pago con Culqi');
      }

      this.logger.log(`Pago procesado exitosamente por S/ ${amount}`);

      const commission = this.config.get<number>('PLATFORM_COMMISSION') ?? 0.12;
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
        culqiChargeId: response.data.id, // Guardar ID de Culqi
      });

      return this.paymentRepo.save(payment);
    } catch (error) {
      this.logger.error(
        'Culqi API error',
        error.response?.data || error.message,
      );
      throw new BadRequestException(
        error.response?.data?.user_message ||
          'No se pudo procesar el pago con la tarjeta',
      );
    }
  }

  async findByUser(userId: string): Promise<Payment[]> {
    return this.paymentRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async report(): Promise<{
    totalRevenue: number;
    totalCommissions: number;
    count: number;
  }> {
    const result = await this.paymentRepo
      .createQueryBuilder('p')
      .select('SUM(p.amount)', 'totalRevenue')
      .addSelect('SUM(p.platformFee)', 'totalCommissions')
      .addSelect('COUNT(*)', 'count')
      .where('p.status = :status', { status: 'paid' })
      .getRawOne();
    return {
      totalRevenue: +result.totalRevenue || 0,
      totalCommissions: +result.totalCommissions || 0,
      count: +result.count || 0,
    };
  }
}
