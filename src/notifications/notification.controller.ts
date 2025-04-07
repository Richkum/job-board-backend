import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { JwtAuthGuard } from '../auth/gaurd/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  private readonly logger = new Logger(NotificationController.name);

  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async getUserNotifications(
    @Request() req,
    @Query('read') read?: boolean,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    this.logger.log(`Fetching notifications for user ${req.user._id}`);
    return this.notificationService.getUserNotifications(req.user._id, {
      read,
      page,
      limit,
    });
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    return this.notificationService.getUnreadCount(req.user._id);
  }

  @Patch(':id/read')
  async markAsRead(@Request() req, @Param('id') notificationId: string) {
    return this.notificationService.markAsRead(notificationId, req.user._id);
  }

  @Patch('mark-all-read')
  async markAllAsRead(@Request() req) {
    return this.notificationService.markAllAsRead(req.user._id);
  }
}
