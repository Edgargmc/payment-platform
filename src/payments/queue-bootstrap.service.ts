import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  CreateQueueCommand,
  GetQueueAttributesCommand,
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
    const dlqName = `${queueName}-dlq`;

    try {
      await this.client.send(
        new CreateQueueCommand({
          QueueName: dlqName,
        }),
      );

      const dlqUrlResult = await this.client.send(
        new GetQueueUrlCommand({
          QueueName: dlqName,
        }),
      );

      const dlqAttributes = await this.client.send(
        new GetQueueAttributesCommand({
          QueueUrl: dlqUrlResult.QueueUrl,
          AttributeNames: ['QueueArn'],
        }),
      );

      const dlqArn = dlqAttributes.Attributes?.QueueArn;

      await this.client.send(
        new CreateQueueCommand({
          QueueName: queueName,
          Attributes: {
            RedrivePolicy: JSON.stringify({
              deadLetterTargetArn: dlqArn,
              maxReceiveCount: '3',
            }),
          },
        }),
      );

      const queueUrlResult = await this.client.send(
        new GetQueueUrlCommand({
          QueueName: queueName,
        }),
      );

      process.env.SQS_QUEUE_URL = queueUrlResult.QueueUrl;
      process.env.SQS_DLQ_URL = dlqUrlResult.QueueUrl;

      this.logger.log(`SQS queue ready: ${queueUrlResult.QueueUrl}`);
      this.logger.log(`SQS DLQ ready: ${dlqUrlResult.QueueUrl}`);
    } catch (error) {
      this.logger.error('Could not create or resolve SQS queues', error);
      throw error;
    }
  }
}
