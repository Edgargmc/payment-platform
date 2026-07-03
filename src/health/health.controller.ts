import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  health() {
    return {
      status: 'OK',
      service: 'payment-platform',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  readiness() {
    return this.healthService.readiness();
  }
}
