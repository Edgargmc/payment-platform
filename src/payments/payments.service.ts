import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OutboxEvent, OutboxEventStatus } from './outbox-event.entity';
import { IdempotencyCacheService } from './idempotency-cache.service';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    private readonly dataSource: DataSource,
    private readonly idempotencyCache: IdempotencyCacheService,
  ) {}

  async create(dto: CreatePaymentDto): Promise<Payment> {
    const cachedPaymentId = await this.idempotencyCache.getPaymentId(
      dto.idempotencyKey,
    );

    if (cachedPaymentId) {
      const cachedPayment = await this.findById(cachedPaymentId);

      if (cachedPayment) {
        return cachedPayment;
      }
    }

    const existingPayment = await this.paymentRepository.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });

    if (existingPayment) {
      await this.idempotencyCache.savePaymentId(
        dto.idempotencyKey,
        existingPayment.id,
      );

      return existingPayment;
    }

    const savedPayment = await this.dataSource.transaction(async (manager) => {
      const payment = manager.create(Payment, {
        ...dto,
        status: PaymentStatus.PROCESSING,
      });

      const newPayment = await manager.save(payment);

      const outboxEvent = manager.create(OutboxEvent, {
        aggregateId: newPayment.id,
        eventType: 'PAYMENT_CREATED',
        payload: {
          paymentId: newPayment.id,
          idempotencyKey: newPayment.idempotencyKey,
          customerId: newPayment.customerId,
          merchantId: newPayment.merchantId,
          amountInCents: newPayment.amountInCents,
          currency: newPayment.currency,
          qrData: newPayment.qrData,
        },
        status: OutboxEventStatus.PENDING,
      });

      await manager.save(outboxEvent);

      return newPayment;
    });

    await this.idempotencyCache.savePaymentId(
      dto.idempotencyKey,
      savedPayment.id,
    );

    return savedPayment;
  }

  async findById(id: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { id },
    });
  }
}
