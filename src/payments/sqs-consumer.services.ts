import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { PaymentConsumerService } from './payment-consumer.service';
import { PaymentMessage } from './payment-message.interface';

@Injectable()
export class SqsConsumerService implements OnModuleInit {
  private readonly logger = new Logger(SqsConsumerService.name);

  private readonly client = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.SQS_ENDPOINT,
  });

  constructor(
    private readonly paymentConsumer: PaymentConsumerService,
  ) {}

  onModuleInit() {
    const enabled =
      process.env.QUEUE_PROVIDER === 'sqs' &&
      process.env.PAYMENT_CONSUMER_ENABLED === 'true';

    if (!enabled) {
      this.logger.log('SQS consumer disabled');
      return;
    }

    this.logger.log('SQS consumer enabled');

    setInterval(() => {
      this.pollMessages().catch((error) => {
        this.logger.error('Error polling SQS messages', error);
      });
    }, 5000);
  }

  private async pollMessages(): Promise<void> {
    const queueUrl = process.env.SQS_QUEUE_URL;

    if (!queueUrl) {
      this.logger.warn('SQS_QUEUE_URL is not configured yet');
      return;
    }


    const result = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 5,
        VisibilityTimeout: 30,
      }),
    );

    const messages = result.Messages || [];

    for (const sqsMessage of messages) {
      if (!sqsMessage.Body || !sqsMessage.ReceiptHandle) {
        continue;
      }

      const message = JSON.parse(sqsMessage.Body) as PaymentMessage;
      this.logger.log(
        `Received SQS message | eventId=${message.eventId} | paymentId=${message.paymentId} | correlationId=${message.correlationId}`,
      );
      await this.paymentConsumer.consume(message);

      await this.client.send(
        new DeleteMessageCommand({
          QueueUrl: queueUrl,
          ReceiptHandle: sqsMessage.ReceiptHandle,
        }),
      );

      this.logger.log(`SQS message ${message.eventId} processed and deleted`);
    }
  }
}