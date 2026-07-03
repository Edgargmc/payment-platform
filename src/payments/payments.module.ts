import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { OutboxEvent } from './outbox-event.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { OutboxWorkerService } from './outbox-worker.service';
import { ProviderConnectorService } from './provider-connector.service';
import { IdempotencyCacheService } from './idempotency-cache.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, OutboxEvent])],
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    OutboxWorkerService,
    ProviderConnectorService,
    IdempotencyCacheService,
  ],
  exports: [IdempotencyCacheService],
})
export class PaymentsModule {}
