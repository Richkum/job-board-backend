import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  Notification,
  NotificationDocument,
} from './schema/notification.schema';
import { WebsocketGateway } from 'src/common/middleware/websocket.gateway';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    @InjectModel('Notification')
    private notificationModel: Model<NotificationDocument>,
    private websocketGateway: WebsocketGateway,
  ) {}

  async create(notificationData: {
    recipient: Types.ObjectId;
    type: Notification['type'];
    title: string;
    message: string;
    relatedJob?: Types.ObjectId;
    relatedApplication?: Types.ObjectId;
    actionUrl?: string;
    priority?: 'low' | 'medium' | 'high';
  }): Promise<NotificationDocument> {
    try {
      const notification = await this.notificationModel.create({
        ...notificationData,
        read: false,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      });

      // Emit real-time notification
      this.websocketGateway.sendNotification(
        notification.recipient.toString(),
        notification,
      );

      return notification;
    } catch (error) {
      this.logger.error('Failed to create notification:', error);
      throw error;
    }
  }

  async getUserNotifications(
    userId: string,
    options: {
      read?: boolean;
      limit?: number;
      page?: number;
    } = {},
  ) {
    const { read, limit = 10, page = 1 } = options;

    const query: any = {
      recipient: new Types.ObjectId(userId),
      expiresAt: { $gt: new Date() },
    };

    if (typeof read === 'boolean') {
      query.read = read;
    }

    try {
      const [notifications, total] = await Promise.all([
        this.notificationModel
          .find(query)
          .populate('relatedJob', 'title company')
          .populate('relatedApplication', 'status')
          .sort({ createdAt: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .exec(),
        this.notificationModel.countDocuments(query),
      ]);

      return {
        notifications,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error('Failed to fetch notifications:', error);
      throw error;
    }
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      await this.notificationModel.updateOne(
        {
          _id: new Types.ObjectId(notificationId),
          recipient: new Types.ObjectId(userId),
        },
        { $set: { read: true } },
      );
    } catch (error) {
      this.logger.error('Failed to mark notification as read:', error);
      throw error;
    }
  }

  async markAllAsRead(userId: string): Promise<void> {
    try {
      await this.notificationModel.updateMany(
        {
          recipient: new Types.ObjectId(userId),
          read: false,
        },
        { $set: { read: true } },
      );
    } catch (error) {
      this.logger.error('Failed to mark all notifications as read:', error);
      throw error;
    }
  }

  async getUnreadCount(userId: string): Promise<number> {
    try {
      return await this.notificationModel.countDocuments({
        recipient: new Types.ObjectId(userId),
        read: false,
        expiresAt: { $gt: new Date() },
      });
    } catch (error) {
      this.logger.error('Failed to get unread count:', error);
      throw error;
    }
  }
}
