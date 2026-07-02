import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async create(dto: CreatePaymentDto): Promise<Payment> {
    const existingPayment = await this.paymentRepository.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });

    if (existingPayment) {
      return existingPayment;
    }

    const payment = this.paymentRepository.create({
      ...dto,
      status: PaymentStatus.PROCESSING,
    });

    return this.paymentRepository.save(payment);
  }
}
