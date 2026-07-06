import { DataSource } from 'typeorm';
import { PaymentProcessorService } from './payment-processor.service';
import {
  ProviderConnectorService,
  ProviderPaymentStatus,
} from './provider-connector.service';
import { Payment, PaymentStatus } from './payment.entity';

describe('PaymentProcessorService', () => {
  let service: PaymentProcessorService;
  let dataSource: { manager: { update: jest.Mock } };
  let providerConnector: { processPayment: jest.Mock };

  beforeEach(() => {
    jest.restoreAllMocks();

    dataSource = {
      manager: {
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
    providerConnector.processPayment.mockResolvedValue({
      status: ProviderPaymentStatus.APPROVED,
      providerTransactionId: 'provider-123',
    });

    await service.processPaymentCreated('payment-1');

    expect(dataSource.manager.update).toHaveBeenCalledWith(Payment, 'payment-1', {
      status: PaymentStatus.APPROVED,
      providerTransactionId: 'provider-123',
      errorCode: undefined,
      errorMessage: undefined,
    });
  });

  it('marks payment as REJECTED when provider rejects', async () => {
    providerConnector.processPayment.mockResolvedValue({
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
    providerConnector.processPayment.mockResolvedValue({
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
});
