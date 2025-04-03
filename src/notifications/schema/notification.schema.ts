import { HydratedDocument, Schema, Types } from 'mongoose';

export const NotificationSchema = new Schema(
  {
    recipient: {
      type: Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'newApplication',
        'applicationStatusUpdate',
        'newJobMatch',
        'applicationDeadlineReminder',
        'interviewScheduled',
        'jobStatusUpdate',
        'newMessage',
        'other',
      ],
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
    },
    relatedJob: {
      type: Types.ObjectId,
      ref: 'Job',
    },
    relatedApplication: {
      type: Types.ObjectId,
      ref: 'Application',
    },
    actionUrl: {
      type: String,
      default: '',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from creation
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient queries
NotificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export interface Notification {
  recipient: Types.ObjectId;
  type:
    | 'newApplication'
    | 'applicationStatusUpdate'
    | 'newJobMatch'
    | 'applicationDeadlineReminder'
    | 'interviewScheduled'
    | 'jobStatusUpdate'
    | 'newMessage'
    | 'other';
  title: string;
  message: string;
  read: boolean;
  relatedJob?: Types.ObjectId;
  relatedApplication?: Types.ObjectId;
  actionUrl?: string;
  priority: 'low' | 'medium' | 'high';
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<Notification>;
