import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { OutboxEvent, OutboxEventStatus } from './outbox-event.entity';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,

    private readonly dataSource: DataSource,
  ) {}

  async create(dto: CreatePaymentDto): Promise<Payment> {
    const existingPayment = await this.paymentRepository.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });

    if (existingPayment) {
      return existingPayment;
    }

    return this.dataSource.transaction(async (manager) => {
      const payment = manager.create(Payment, {
        ...dto,
        status: PaymentStatus.PROCESSING,
      });

      const savedPayment = await manager.save(payment);

      const outboxEvent = manager.create(OutboxEvent, {
        aggregateId: savedPayment.id,
        eventType: 'PAYMENT_CREATED',
        payload: {
          paymentId: savedPayment.id,
          idempotencyKey: savedPayment.idempotencyKey,
          customerId: savedPayment.customerId,
          merchantId: savedPayment.merchantId,
          amount: savedPayment.amount,
          currency: savedPayment.currency,
          qrData: savedPayment.qrData,
        },
        status: OutboxEventStatus.PENDING,
      });

      await manager.save(outboxEvent);

      return savedPayment;
    });
  }

  async findById(id: string): Promise<Payment | null> {
    return this.paymentRepository.findOne({
      where: { id },
    });
  }


}

