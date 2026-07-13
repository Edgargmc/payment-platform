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
  });

  async onModuleInit() {
    if (process.env.QUEUE_PROVIDER !== 'sqs') {
      return;
    }

    const queueName = process.env.SQS_QUEUE_NAME || 'payment-events';
    const dlqName = `${queueName}-dlq`;

    try {
      if (process.env.QUEUE_BOOTSTRAP_ENABLED === 'true') {
        await this.createQueues(queueName, dlqName);
      }

      await this.resolveQueueUrls(queueName, dlqName);
    } catch (error) {
      this.logger.error('Could not initialize SQS queues', error);
      throw error;
    }
  }

  private async createQueues(
    queueName: string,
    dlqName: string,
  ): Promise<void> {
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
  }

  private async resolveQueueUrls(
    queueName: string,
    dlqName: string,
  ): Promise<void> {
    const queueUrlResult = await this.client.send(
      new GetQueueUrlCommand({
        QueueName: queueName,
      }),
    );

    const dlqUrlResult = await this.client.send(
      new GetQueueUrlCommand({
        QueueName: dlqName,
      }),
    );

    process.env.SQS_QUEUE_URL = queueUrlResult.QueueUrl;
    process.env.SQS_DLQ_URL = dlqUrlResult.QueueUrl;

    this.logger.log(`SQS queue ready: ${queueUrlResult.QueueUrl}`);
    this.logger.log(`SQS DLQ ready: ${dlqUrlResult.QueueUrl}`);
  }
}