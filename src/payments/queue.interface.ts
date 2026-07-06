import { PaymentMessage } from './payment-message.interface';

export interface QueuePort {
  publish(message: PaymentMessage): Promise<void>;
}
