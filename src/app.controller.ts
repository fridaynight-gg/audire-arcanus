import { Controller } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Root route removed to serve static client files (index.html)
  // The client directory is served as static assets via main.ts
}
