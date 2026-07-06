import { Injectable, Logger } from '@nestjs/common';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import type { QueuePort } from './queue.interface';
import { PaymentMessage } from './payment-message.interface';

@Injectable()
export class SqsQueueService implements QueuePort {
  private readonly logger = new Logger(SqsQueueService.name);

  private readonly client = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.SQS_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    },
  });

  async publish(message: PaymentMessage): Promise<void> {
    const queueUrl = process.env.SQS_QUEUE_URL;

    if (!queueUrl) {
      throw new Error('SQS_QUEUE_URL is not configured');
    }

    await this.client.send(
      new SendMessageCommand({
        QueueUrl: queueUrl,
        MessageBody: JSON.stringify(message),
      }),
    );

    this.logger.log(`Message ${message.eventId} published to SQS`);
  }
}
