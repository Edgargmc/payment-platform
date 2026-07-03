import { Injectable } from '@nestjs/common';

export enum ProviderPaymentStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  TIMEOUT = 'TIMEOUT',
}

export interface ProviderPaymentResponse {
  status: ProviderPaymentStatus;
  providerTransactionId?: string;
  errorCode?: string;
  errorMessage?: string;
}

@Injectable()
export class ProviderConnectorService {
  async processPayment(): Promise<ProviderPaymentResponse> {
    const random = Math.random();

    if (random < 0.3) {
      return {
        status: ProviderPaymentStatus.APPROVED,
        providerTransactionId: `provider-${Date.now()}`,
      };
    }

    if (random < 0.7) {
      return {
        status: ProviderPaymentStatus.REJECTED,
        errorCode: 'INSUFFICIENT_FUNDS',
        errorMessage: 'Insufficient funds',
      };
    }

    return {
      status: ProviderPaymentStatus.TIMEOUT,
      errorCode: 'PROVIDER_TIMEOUT',
      errorMessage: 'Provider did not respond in time',
    };
  }
}
