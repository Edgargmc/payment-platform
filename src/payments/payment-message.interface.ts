export interface PaymentMessage {
  eventId: string;
  eventType: string;
  paymentId: string;
  payload: Record<string, unknown>;
}
