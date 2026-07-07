export interface PaymentMessage {
  eventId: string;
  correlationId: string;
  eventType: string;
  paymentId: string;
  payload: Record<string, unknown>;
}
