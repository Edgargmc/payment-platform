import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PaymentsService } from './payments.service';
import { Payment, PaymentStatus } from './payment.entity';
import { OutboxEvent, OutboxEventStatus } from './outbox-event.entity';
import { IdempotencyCacheService } from './idempotency-cache.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let paymentRepository: jest.Mocked<Repository<Payment>>;
  let dataSource: { transaction: jest.Mock };
  let idempotencyCache: {
    getPaymentId: jest.Mock;
    savePaymentId: jest.Mock;
  };

  const createPaymentDto: CreatePaymentDto = {
    idempotencyKey: 'idem-123',
    customerId: 'customer-1',
    merchantId: 'merchant-1',
    qrData: 'qr-data',
    amountInCents: 1500,
    currency: 'ARS',
  };

  beforeEach(async () => {
    paymentRepository = {
      findOne: jest.fn(),
    } as unknown as jest.Mocked<Repository<Payment>>;

    dataSource = {
      transaction: jest.fn(),
    };

    idempotencyCache = {
      getPaymentId: jest.fn(),
      savePaymentId: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        {
          provide: getRepositoryToken(Payment),
          useValue: paymentRepository,
        },
        {
          provide: DataSource,
          useValue: dataSource,
        },
        {
          provide: IdempotencyCacheService,
          useValue: idempotencyCache,
        },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns cached payment when idempotency key exists in cache', async () => {
    const cachedPayment = {
      id: 'payment-1',
      idempotencyKey: createPaymentDto.idempotencyKey,
      status: PaymentStatus.APPROVED,
    } as Payment;

    idempotencyCache.getPaymentId.mockResolvedValue(cachedPayment.id);
    jest.spyOn(service, 'findById').mockResolvedValue(cachedPayment);

    const result = await service.create(createPaymentDto);

    expect(idempotencyCache.getPaymentId).toHaveBeenCalledWith(
      createPaymentDto.idempotencyKey,
    );
    expect(service.findById).toHaveBeenCalledWith(cachedPayment.id);
    expect(paymentRepository.findOne).not.toHaveBeenCalled();
    expect(result).toBe(cachedPayment);
  });

  it('returns existing payment from repository and stores it in cache', async () => {
    const existingPayment = {
      id: 'payment-2',
      idempotencyKey: createPaymentDto.idempotencyKey,
      status: PaymentStatus.PROCESSING,
    } as Payment;

    idempotencyCache.getPaymentId.mockResolvedValue(null);
    paymentRepository.findOne.mockResolvedValue(existingPayment);

    const result = await service.create(createPaymentDto);

    expect(paymentRepository.findOne).toHaveBeenCalledWith({
      where: { idempotencyKey: createPaymentDto.idempotencyKey },
    });
    expect(idempotencyCache.savePaymentId).toHaveBeenCalledWith(
      createPaymentDto.idempotencyKey,
      existingPayment.id,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
    expect(result).toBe(existingPayment);
  });

  it('creates payment and outbox event when idempotency key is new', async () => {
    const savedPayment = {
      id: 'payment-3',
      ...createPaymentDto,
      status: PaymentStatus.PROCESSING,
    } as Payment;

    const manager = {
      create: jest
        .fn()
        .mockImplementation((_entity, payload) => ({ ...payload })),
      save: jest.fn().mockResolvedValueOnce(savedPayment).mockResolvedValueOnce({
        id: 'event-1',
      }),
    };

    idempotencyCache.getPaymentId.mockResolvedValue(null);
    paymentRepository.findOne.mockResolvedValue(null);
    dataSource.transaction.mockImplementation(
      async (callback: (entityManager: typeof manager) => Promise<Payment>) =>
        callback(manager),
    );

    const result = await service.create(createPaymentDto);

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.create).toHaveBeenNthCalledWith(1, Payment, {
      ...createPaymentDto,
      status: PaymentStatus.PROCESSING,
    });
    expect(manager.create).toHaveBeenNthCalledWith(
      2,
      OutboxEvent,
      expect.objectContaining({
        aggregateId: savedPayment.id,
        eventType: 'PAYMENT_CREATED',
        status: OutboxEventStatus.PENDING,
        payload: expect.objectContaining({
          paymentId: savedPayment.id,
          idempotencyKey: savedPayment.idempotencyKey,
        }),
      }),
    );
    expect(idempotencyCache.savePaymentId).toHaveBeenCalledWith(
      createPaymentDto.idempotencyKey,
      savedPayment.id,
    );
    expect(result).toBe(savedPayment);
  });

  it('findById delegates to repository', async () => {
    const payment = { id: 'payment-4' } as Payment;
    paymentRepository.findOne.mockResolvedValue(payment);

    const result = await service.findById(payment.id);

    expect(paymentRepository.findOne).toHaveBeenCalledWith({
      where: { id: payment.id },
    });
    expect(result).toBe(payment);
  });
});
