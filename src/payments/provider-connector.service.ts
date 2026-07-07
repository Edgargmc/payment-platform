import { Injectable, Logger } from '@nestjs/common';

export enum ProviderPaymentStatus {
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  TIMEOUT = 'TIMEOUT',
  PROVIDER_UNAVAILABLE = 'PROVIDER_UNAVAILABLE',
}

export interface ProviderPaymentResponse {
  status: ProviderPaymentStatus;
  providerTransactionId?: string;
  errorCode?: string;
  errorMessage?: string;
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

@Injectable()
export class ProviderConnectorService {
  private readonly logger = new Logger(ProviderConnectorService.name);

  private circuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private readonly failureThreshold = 3;
  private readonly openTimeoutMs = 15000;
  private openedAt?: number;

  processPayment(): ProviderPaymentResponse {
    if (this.circuitState === CircuitState.OPEN) {
      const canTryAgain =
        this.openedAt && Date.now() - this.openedAt >= this.openTimeoutMs;

      if (!canTryAgain) {
        this.logger.warn('Circuit breaker OPEN. Failing fast.');

        return {
          status: ProviderPaymentStatus.PROVIDER_UNAVAILABLE,
          errorCode: 'CIRCUIT_OPEN',
          errorMessage: 'Provider circuit breaker is open',
        };
      }

      this.logger.log('Circuit breaker moving to HALF_OPEN');
      this.circuitState = CircuitState.HALF_OPEN;
    }

    const providerResponse = this.callProvider();

    if (
      providerResponse.status === ProviderPaymentStatus.TIMEOUT ||
      providerResponse.status === ProviderPaymentStatus.PROVIDER_UNAVAILABLE
    ) {
      this.recordFailure();
      return providerResponse;
    }

    this.recordSuccess();
    return providerResponse;
  }

  private callProvider(): ProviderPaymentResponse {
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

  private recordFailure(): void {
    this.failureCount += 1;

    this.logger.warn(
      `Provider failure count: ${this.failureCount}/${this.failureThreshold}`,
    );

    if (this.failureCount >= this.failureThreshold) {
      this.circuitState = CircuitState.OPEN;
      this.openedAt = Date.now();
      this.logger.error('Circuit breaker moved to OPEN');
    }
  }

  private recordSuccess(): void {
    if (this.circuitState === CircuitState.HALF_OPEN) {
      this.logger.log('Circuit breaker recovered. Moving to CLOSED');
    }

    this.circuitState = CircuitState.CLOSED;
    this.failureCount = 0;
    this.openedAt = undefined;
  }
}
