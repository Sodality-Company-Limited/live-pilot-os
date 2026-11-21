import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get('health')
  getHealth(): { status: string; service: string; timestamp: string } {
    return {
      status: 'healthy',
      service: 'session-service',
      timestamp: new Date().toISOString(),
    };
  }

  @Get('healthz')
  getHealthz(): { status: string; service: string; timestamp: string } {
    return {
      status: 'healthy',
      service: 'session-service',
      timestamp: new Date().toISOString(),
    };
  }
}
