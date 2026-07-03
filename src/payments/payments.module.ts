import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './payment.entity';
import { OutboxEvent } from './outbox-event.entity';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { OutboxWorkerService } from './outbox-worker.service';
import { ProviderConnectorService } from './provider-connector.service';

@Module({
  imports: [TypeOrmModule.forFeature([Payment, OutboxEvent])],
  controllers: [PaymentsController],
  providers: [PaymentsService, OutboxWorkerService, ProviderConnectorService],
})
export class PaymentsModule {}
