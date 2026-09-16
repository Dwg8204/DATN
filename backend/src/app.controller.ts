import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('Application')
@Controller()
export class AppController {
  @Get()
  info() {
    return {
      name: 'AptiMate API',
      status: 'ok',
      version: '1.0',
      documentation: '/api/docs',
      health: '/api/v1/health/ready',
    };
  }
}
