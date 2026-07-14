import { createHash } from 'crypto';
import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ProcessedMessage } from './processed-message.entity';

@Injectable()
export class ProcessedMessageService {
  private readonly logger = new Logger(ProcessedMessageService.name);

  constructor(private readonly dataSource: DataSource) {}

  async executeOnce(
    messageId: string,
    callback: () => Promise<void>,
  ): Promise<boolean> {
    const [lockKey1, lockKey2] = this.buildLockKeys(messageId);

    return this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [
        lockKey1,
        lockKey2,
      ]);

      const existingMessage = await manager.findOne(ProcessedMessage, {
        where: { messageId },
      });

      if (existingMessage) {
        this.logger.warn(`Duplicated message ignored: ${messageId}`);
        return false;
      }

      await callback();

      const processedMessage = manager.create(ProcessedMessage, { messageId });
      await manager.save(processedMessage);

      return true;
    });
  }

  private buildLockKeys(messageId: string): [number, number] {
    const hash = createHash('sha256')
      .update(`payment-event:${messageId}`)
      .digest();

    return [hash.readInt32BE(0), hash.readInt32BE(4)];
  }
}
