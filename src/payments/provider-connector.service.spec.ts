import {
  ProviderConnectorService,
  ProviderPaymentStatus,
} from './provider-connector.service';

describe('ProviderConnectorService', () => {
  let service: ProviderConnectorService;

  beforeEach(() => {
    jest.restoreAllMocks();
    service = new ProviderConnectorService();
  });

  it('returns APPROVED when random is below 0.3', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.2);
    jest.spyOn(Date, 'now').mockReturnValue(123456789);

    await expect(service.processPayment()).resolves.toEqual({
      status: ProviderPaymentStatus.APPROVED,
      providerTransactionId: 'provider-123456789',
    });
  });

  it('returns REJECTED when random is between 0.3 and 0.7', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    await expect(service.processPayment()).resolves.toEqual({
      status: ProviderPaymentStatus.REJECTED,
      errorCode: 'INSUFFICIENT_FUNDS',
      errorMessage: 'Insufficient funds',
    });
  });

  it('returns TIMEOUT when random is 0.7 or above', async () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);

    await expect(service.processPayment()).resolves.toEqual({
      status: ProviderPaymentStatus.TIMEOUT,
      errorCode: 'PROVIDER_TIMEOUT',
      errorMessage: 'Provider did not respond in time',
    });
  });
});
