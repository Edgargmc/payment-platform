import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Payment, PaymentStatus } from './payment.entity';
import { OutboxEventStatus } from './outbox-event.entity';
import {
  ProviderConnectorService,
  ProviderPaymentStatus,
} from './provider-connector.service';

@Injectable()
export class OutboxWorkerService implements OnModuleInit {
  private readonly logger = new Logger(OutboxWorkerService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly providerConnector: ProviderConnectorService,
  ) {}

  onModuleInit() {
    setInterval(() => {
      this.logger.log('Searching outbox');
      this.processPendingEvents().catch((error) => {
        this.logger.error('Error processing outbox events', error);
      });
    }, 5000);
  }

  async processPendingEvents(): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const events = await manager.query(`
          select *
          from outbox_events
          where status = 'PENDING'
          order by "createdAt"
              limit 5
        for update skip locked
      `);

      for (const event of events) {
        this.logger.log(`Processing event ${event.id}`);

        await manager.query(
          `
              update outbox_events
              set status = $1,
                  attempts = attempts + 1
              where id = $2
          `,
          [OutboxEventStatus.PROCESSING, event.id],
        );

        const providerResponse = await this.providerConnector.processPayment();

        const paymentId = event.aggregateId;

        if (providerResponse.status === ProviderPaymentStatus.APPROVED) {
          await manager.update(Payment, paymentId, {
            status: PaymentStatus.APPROVED,
            providerTransactionId: providerResponse.providerTransactionId,
            errorCode: undefined,
            errorMessage: undefined,
          });
        }

        if (providerResponse.status === ProviderPaymentStatus.REJECTED) {
          await manager.update(Payment, paymentId, {
            status: PaymentStatus.REJECTED,
            errorCode: providerResponse.errorCode,
            errorMessage: providerResponse.errorMessage,
          });
        }

        if (providerResponse.status === ProviderPaymentStatus.TIMEOUT) {
          await manager.update(Payment, paymentId, {
            status: PaymentStatus.PENDING,
            errorCode: providerResponse.errorCode,
            errorMessage: providerResponse.errorMessage,
          });
        }

        await manager.query(
          `
              update outbox_events
              set status = $1,
                  "processedAt" = now()
              where id = $2
          `,
          [OutboxEventStatus.PROCESSED, event.id],
        );

        this.logger.log(
          `Event ${event.id} processed with result ${providerResponse.status}`,
        );
      }
    });
  }
}
