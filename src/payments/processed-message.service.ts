import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProcessedMessage } from './processed-message.entity';

@Injectable()
export class ProcessedMessageService {
  private readonly logger = new Logger(ProcessedMessageService.name);

  constructor(
    @InjectRepository(ProcessedMessage)
    private readonly repository: Repository<ProcessedMessage>,
  ) {}

  async wasProcessed(messageId: string): Promise<boolean> {
    const existingMessage = await this.repository.findOne({
      where: { messageId },
    });
    this.logger.log(
      `Message ${messageId} was already processed?: ${!!existingMessage} `,
    );
    return !!existingMessage;
  }

  async markAsProcessed(messageId: string): Promise<void> {
    try {
      const processedMessage = this.repository.create({
        messageId,
      });

      await this.repository.save(processedMessage);
    } catch {
      this.logger.warn(`Message ${messageId} was already marked as processed`);
    }
  }
}
