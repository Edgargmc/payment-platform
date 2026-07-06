import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';
import {
  ProviderConnectorService,
  ProviderPaymentStatus,
} from './provider-connector.service';

@Injectable()
export class PaymentProcessorService {
  private readonly logger = new Logger(PaymentProcessorService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly providerConnector: ProviderConnectorService,
  ) {}

  async processPaymentCreated(paymentId: string): Promise<void> {
    this.logger.log(`Processing payment ${paymentId}`);

    const providerResponse = await this.providerConnector.processPayment();

    if (providerResponse.status === ProviderPaymentStatus.APPROVED) {
      await this.dataSource.manager.update(Payment, paymentId, {
        status: PaymentStatus.APPROVED,
        providerTransactionId: providerResponse.providerTransactionId,
        errorCode: undefined,
        errorMessage: undefined,
      });
      return;
    }

    if (providerResponse.status === ProviderPaymentStatus.REJECTED) {
      await this.dataSource.manager.update(Payment, paymentId, {
        status: PaymentStatus.REJECTED,
        errorCode: providerResponse.errorCode,
        errorMessage: providerResponse.errorMessage,
      });
      return;
    }

    if (providerResponse.status === ProviderPaymentStatus.TIMEOUT) {
      await this.dataSource.manager.update(Payment, paymentId, {
        status: PaymentStatus.PENDING,
        errorCode: providerResponse.errorCode,
        errorMessage: providerResponse.errorMessage,
      });
    }
  }
}
