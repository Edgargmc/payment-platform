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

  it('returns APPROVED when random is below 0.3', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.2);
    jest.spyOn(Date, 'now').mockReturnValue(123456789);

    expect(service.processPayment()).toEqual({
      status: ProviderPaymentStatus.APPROVED,
      providerTransactionId: 'provider-123456789',
    });
  });

  it('returns REJECTED when random is between 0.3 and 0.7', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.5);

    expect(service.processPayment()).toEqual({
      status: ProviderPaymentStatus.REJECTED,
      errorCode: 'INSUFFICIENT_FUNDS',
      errorMessage: 'Insufficient funds',
    });
  });

  it('returns TIMEOUT when random is 0.7 or above', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);

    expect(service.processPayment()).toEqual({
      status: ProviderPaymentStatus.TIMEOUT,
      errorCode: 'PROVIDER_TIMEOUT',
      errorMessage: 'Provider did not respond in time',
    });
  });

  it('opens the circuit after three consecutive failures and fails fast', () => {
    jest.spyOn(Math, 'random').mockReturnValue(0.9);
    jest.spyOn(Date, 'now').mockReturnValue(1000);

    expect(service.processPayment().status).toBe(ProviderPaymentStatus.TIMEOUT);
    expect(service.processPayment().status).toBe(ProviderPaymentStatus.TIMEOUT);
    expect(service.processPayment().status).toBe(ProviderPaymentStatus.TIMEOUT);

    expect(service.processPayment()).toEqual({
      status: ProviderPaymentStatus.PROVIDER_UNAVAILABLE,
      errorCode: 'CIRCUIT_OPEN',
      errorMessage: 'Provider circuit breaker is open',
    });
  });

  it('recovers from OPEN circuit after timeout and successful half-open call', () => {
    const randomSpy = jest.spyOn(Math, 'random');
    const nowSpy = jest.spyOn(Date, 'now');

    randomSpy.mockReturnValue(0.9);
    nowSpy.mockReturnValue(1000);
    service.processPayment();
    service.processPayment();
    service.processPayment();

    nowSpy.mockReturnValue(17000);
    randomSpy.mockReturnValue(0.2);

    expect(service.processPayment()).toEqual({
      status: ProviderPaymentStatus.APPROVED,
      providerTransactionId: 'provider-17000',
    });
    expect(service.processPayment().status).toBe(ProviderPaymentStatus.APPROVED);
  });
});
