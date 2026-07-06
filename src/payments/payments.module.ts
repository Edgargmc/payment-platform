import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Payment } from './payment.entity';
import { OutboxEvent } from './outbox-event.entity';

import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

import { OutboxWorkerService } from './outbox-worker.service';
import { ProviderConnectorService } from './provider-connector.service';
import { IdempotencyCacheService } from './idempotency-cache.service';
import { PaymentProcessorService } from './payment-processor-service';
import { LocalQueueService } from './local-queue.service';
import { SqsQueueService } from './sqs-queue.service';
import { QUEUE_PORT } from './queue.constants';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, OutboxEvent])],

  controllers: [PaymentsController],

  providers: [
    PaymentsService,
    OutboxWorkerService,
    ProviderConnectorService,
    IdempotencyCacheService,
    PaymentProcessorService,
    LocalQueueService,
    SqsQueueService,
    {
      provide: QUEUE_PORT,
      useFactory: (
        localQueueService: LocalQueueService,
        sqsQueueService: SqsQueueService,
      ) => {
        return process.env.QUEUE_PROVIDER === 'sqs'
          ? sqsQueueService
          : localQueueService;
      },
      inject: [LocalQueueService, SqsQueueService],
    },
  ],

  exports: [IdempotencyCacheService],
})
export class PaymentsModule {}
