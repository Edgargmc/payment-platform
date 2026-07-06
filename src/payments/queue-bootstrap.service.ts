import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CreateQueueCommand,
  GetQueueUrlCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';

@Injectable()
export class QueueBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(QueueBootstrapService.name);

  private readonly client = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.SQS_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    },
  });

  async onModuleInit() {
    if (process.env.QUEUE_PROVIDER !== 'sqs') {
      return;
    }

    const queueName = process.env.SQS_QUEUE_NAME || 'payment-events';

    try {
      await this.client.send(
        new CreateQueueCommand({
          QueueName: queueName,
        }),
      );

      const result = await this.client.send(
        new GetQueueUrlCommand({
          QueueName: queueName,
        }),
      );

      process.env.SQS_QUEUE_URL = result.QueueUrl;

      this.logger.log(`SQS queue ready: ${result.QueueUrl}`);
    } catch (error) {
      this.logger.error('Could not create or resolve SQS queue', error);
      throw error;
    }
  }
}
