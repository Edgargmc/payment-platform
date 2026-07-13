import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  SQSClient,
  SendMessageCommand,
  GetQueueUrlCommand,
} from '@aws-sdk/client-sqs';
import type { QueuePort } from './queue.interface';
import { PaymentMessage } from './payment-message.interface';

@Injectable()
export class SqsQueueService implements QueuePort, OnModuleInit {
  private readonly logger = new Logger(SqsQueueService.name);

  private readonly client = new SQSClient({
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.SQS_ENDPOINT,
  });

  private queueUrl!: string;

  async onModuleInit(): Promise<void> {
    // Si viene configurada explícitamente (ej. LocalStack o configurada dinámicamente)
    if (process.env.SQS_QUEUE_URL) {
      this.queueUrl = process.env.SQS_QUEUE_URL;
      return;
    }

    const queueName = process.env.SQS_QUEUE_NAME;
    if (!queueName) {
      throw new Error('SQS_QUEUE_NAME is not configured');
    }

    // Sistema de reintentos para darle tiempo a QueueBootstrapService de crear la cola
    const maxAttempts = 5;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        const response = await this.client.send(
          new GetQueueUrlCommand({
            QueueName: queueName,
          }),
        );

        this.queueUrl = response.QueueUrl!;
        this.logger.log(`Resolved SQS Queue URL: ${this.queueUrl}`);
        return; // Éxito completo, salimos del método
      } catch (error: any) {
        if (error.name === 'QueueDoesNotExist' && attempts < maxAttempts) {
          this.logger.warn(
            `La cola SQS "${queueName}" aún no existe (Intento ${attempts}/${maxAttempts}). Esperando a que QueueBootstrapService la cree...`
          );
          // Esperamos 2 segundos antes del siguiente intento
          await new Promise((resolve) => setTimeout(resolve, 2000));
        } else {
          // Si es otro error, o ya agotamos los intentos, lanzamos el error para romper la app
          this.logger.error(`Error definitivo al resolver la cola SQS: ${error.message}`);
          throw error;
        }
      }
    }
  }

  async publish(message: PaymentMessage): Promise<void> {
    await this.client.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(message),
      }),
    );

    this.logger.log(`Message ${message.eventId} published to SQS`);
  }
}
