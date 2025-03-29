import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  /**
   * The AppService instance that provides the getHello functionality.
   */
  constructor(private readonly appService: AppService) {}

  /**
   * The root endpoint of the application.
   * Returns a greeting message.
   */
  @Get()
  getHello(): string {
    /**
     * Call the getHello method from the AppService
     * and return the result.
     */
    return this.appService.getHello();
  }
}
