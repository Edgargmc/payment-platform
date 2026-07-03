import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: {
    create: jest.Mock;
    findById: jest.Mock;
  };

  beforeEach(async () => {
    paymentsService = {
      create: jest.fn(),
      findById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        {
          provide: PaymentsService,
          useValue: paymentsService,
        },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('delegates create to service', async () => {
    const dto: CreatePaymentDto = {
      idempotencyKey: 'idem-1',
      customerId: 'customer-1',
      merchantId: 'merchant-1',
      qrData: 'qr-data',
      amountInCents: 2000,
      currency: 'ARS',
    };
    const payment = { id: 'payment-1' };
    paymentsService.create.mockResolvedValue(payment);

    await expect(controller.create(dto)).resolves.toBe(payment);
    expect(paymentsService.create).toHaveBeenCalledWith(dto);
  });

  it('delegates findById to service', async () => {
    const payment = { id: 'payment-2' };
    paymentsService.findById.mockResolvedValue(payment);

    await expect(controller.findById('payment-2')).resolves.toBe(payment);
    expect(paymentsService.findById).toHaveBeenCalledWith('payment-2');
  });
});
