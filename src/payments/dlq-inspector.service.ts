import { Injectable, Logger } from '@nestjs/common';
import {
  GetQueueUrlCommand,
  ReceiveMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';

@Injectable()
export class DlqInspectorService {
  private readonly logger = new Logger(DlqInspectorService.name);

  private readonly client = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.SQS_ENDPOINT,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
    },
  });

  async peekMessages() {
    const queueName = `${process.env.SQS_QUEUE_NAME || 'payment-events'}-dlq`;

    const queueUrlResult = await this.client.send(
      new GetQueueUrlCommand({
        QueueName: queueName,
      }),
    );

    const dlqUrl = queueUrlResult.QueueUrl;

    if (!dlqUrl) {
      return {
        status: 'DLQ_NOT_FOUND',
        messages: [],
      };
    }

    const result = await this.client.send(
      new ReceiveMessageCommand({
        QueueUrl: dlqUrl,
        MaxNumberOfMessages: 10,
        WaitTimeSeconds: 1,
        VisibilityTimeout: 5,
      }),
    );

    return {
      status: 'OK',
      count: result.Messages?.length || 0,
      messages:
        result.Messages?.map((message) => ({
          messageId: message.MessageId,
          body: message.Body,
        })) || [],
    };
  }
}
