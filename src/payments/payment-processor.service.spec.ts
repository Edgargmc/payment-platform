import { DataSource } from 'typeorm';
import { PaymentProcessorService } from './payment-processor.service';
import {
  ProviderConnectorService,
  ProviderPaymentStatus,
} from './provider-connector.service';
import { Payment, PaymentStatus } from './payment.entity';

describe('PaymentProcessorService', () => {
  let service: PaymentProcessorService;
  let dataSource: { manager: { findOne: jest.Mock; update: jest.Mock } };
  let providerConnector: { processPayment: jest.Mock };
  const payment = {
    id: 'payment-1',
    status: PaymentStatus.PROCESSING,
  } as Payment;

  beforeEach(() => {
    jest.restoreAllMocks();

    dataSource = {
      manager: {
        findOne: jest.fn().mockResolvedValue(payment),
        update: jest.fn(),
      },
    };

    providerConnector = {
      processPayment: jest.fn(),
    };

    service = new PaymentProcessorService(
      dataSource as unknown as DataSource,
      providerConnector as unknown as ProviderConnectorService,
    );
  });

  it('marks payment as APPROVED when provider approves', async () => {
    providerConnector.processPayment.mockReturnValue({
      status: ProviderPaymentStatus.APPROVED,
      providerTransactionId: 'provider-123',
    });

    await service.processPaymentCreated('payment-1');

    expect(dataSource.manager.findOne).toHaveBeenCalledWith(Payment, {
      where: { id: 'payment-1' },
    });
    expect(dataSource.manager.update).toHaveBeenCalledWith(Payment, 'payment-1', {
      status: PaymentStatus.APPROVED,
      providerTransactionId: 'provider-123',
      errorCode: undefined,
      errorMessage: undefined,
    });
  });

  it('marks payment as REJECTED when provider rejects', async () => {
    providerConnector.processPayment.mockReturnValue({
      status: ProviderPaymentStatus.REJECTED,
      errorCode: 'INSUFFICIENT_FUNDS',
      errorMessage: 'Insufficient funds',
    });

    await service.processPaymentCreated('payment-2');

    expect(dataSource.manager.update).toHaveBeenCalledWith(Payment, 'payment-2', {
      status: PaymentStatus.REJECTED,
      errorCode: 'INSUFFICIENT_FUNDS',
      errorMessage: 'Insufficient funds',
    });
  });

  it('marks payment as PENDING when provider times out', async () => {
    providerConnector.processPayment.mockReturnValue({
      status: ProviderPaymentStatus.TIMEOUT,
      errorCode: 'PROVIDER_TIMEOUT',
      errorMessage: 'Provider did not respond in time',
    });

    await service.processPaymentCreated('payment-3');

    expect(dataSource.manager.update).toHaveBeenCalledWith(Payment, 'payment-3', {
      status: PaymentStatus.PENDING,
      errorCode: 'PROVIDER_TIMEOUT',
      errorMessage: 'Provider did not respond in time',
    });
  });

  it('marks payment as FAILED when provider is unavailable', async () => {
    providerConnector.processPayment.mockReturnValue({
      status: ProviderPaymentStatus.PROVIDER_UNAVAILABLE,
      errorCode: 'CIRCUIT_OPEN',
      errorMessage: 'Provider circuit breaker is open',
    });

    await service.processPaymentCreated('payment-4', 'corr-4');

    expect(dataSource.manager.update).toHaveBeenCalledWith(Payment, 'payment-4', {
      status: PaymentStatus.FAILED,
      errorCode: 'CIRCUIT_OPEN',
      errorMessage: 'Provider circuit breaker is open',
    });
  });

  it('does nothing when payment does not exist', async () => {
    dataSource.manager.findOne.mockResolvedValue(null);

    await service.processPaymentCreated('missing-payment');

    expect(providerConnector.processPayment).not.toHaveBeenCalled();
    expect(dataSource.manager.update).not.toHaveBeenCalled();
  });

  it('does nothing when payment is already finalized', async () => {
    dataSource.manager.findOne.mockResolvedValue({
      id: 'payment-5',
      status: PaymentStatus.APPROVED,
    } as Payment);

    await service.processPaymentCreated('payment-5');

    expect(providerConnector.processPayment).not.toHaveBeenCalled();
    expect(dataSource.manager.update).not.toHaveBeenCalled();
  });
});
