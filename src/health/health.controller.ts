import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  health() {
    return {
      status: 'OK',
      service: process.env.APP_NAME || 'payment-platform',
      version: process.env.APP_VERSION || 'local',
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  readiness() {
    return this.healthService.readiness();
  }
}
