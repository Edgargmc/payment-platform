import { IsNotEmpty, IsString, IsNumber, Min, Length } from 'class-validator';

export class CreatePaymentDto {
  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;

  @IsString()
  @IsNotEmpty()
  customerId: string;

  @IsString()
  @IsNotEmpty()
  merchantId: string;

  @IsString()
  @IsNotEmpty()
  qrData: string;

  @IsNumber()
  @Min(1)
  amountInCents: number;

  @IsString()
  @Length(3, 3)
  currency: string;
}
