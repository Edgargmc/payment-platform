export class CreatePaymentDto {
  idempotencyKey: string;
  customerId: string;
  merchantId: string;
  qrData: string;
  amount: number;
  currency: string;
}
