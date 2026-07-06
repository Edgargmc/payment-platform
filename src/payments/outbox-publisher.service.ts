import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OutboxEventStatus } from './outbox-event.entity';
import { QUEUE_PORT } from './queue.constants';
import type { QueuePort } from './queue.interface';

@Injectable()
export class OutboxPublisherService implements OnModuleInit {
  private readonly logger = new Logger(OutboxPublisherService.name);

  constructor(
    private readonly dataSource: DataSource,

    @Inject(QUEUE_PORT)
    private readonly queuePort: QueuePort,
  ) {}

  onModuleInit() {
    const publisherEnabled = process.env.OUTBOX_PUBLISHER_ENABLED === 'true';

    if (!publisherEnabled) {
      this.logger.log('Outbox publisher disabled');
      return;
    }

    this.logger.log('Outbox publisher enabled');

    setInterval(() => {
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
        this.logger.log(`Processing outbox event ${event.id}`);

        await manager.query(
          `
            update outbox_events
            set status = $1,
                attempts = attempts + 1
            where id = $2
          `,
          [OutboxEventStatus.PROCESSING, event.id],
        );

        await this.queuePort.publish({
          eventId: event.id,
          eventType: event.eventType,
          paymentId: event.aggregateId,
          payload: event.payload,
        });

        await manager.query(
          `
          update outbox_events
          set status = $1,
              "processedAt" = now()
          where id = $2
          `,
          [OutboxEventStatus.PROCESSED, event.id],
        );

        this.logger.log(`Outbox event ${event.id} processed`);
      }
    });
  }
}
