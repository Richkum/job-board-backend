import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class WebsocketGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WebsocketGateway.name);
  private userSockets: Map<string, string[]> = new Map();

  constructor(private jwtService: JwtService) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token?.split(' ')[1];
      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;

      // Store socket connection
      const userSockets = this.userSockets.get(userId) || [];
      userSockets.push(client.id);
      this.userSockets.set(userId, userSockets);

      client.join(userId);
      this.logger.log(`Client connected: ${userId}`);
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    try {
      // Remove socket from stored connections
      this.userSockets.forEach((sockets, userId) => {
        const index = sockets.indexOf(client.id);
        if (index !== -1) {
          sockets.splice(index, 1);
          if (sockets.length === 0) {
            this.userSockets.delete(userId);
          }
        }
      });
      this.logger.log(`Client disconnected: ${client.id}`);
    } catch (error) {
      this.logger.error('Disconnect error:', error);
    }
  }

  sendNotification(userId: string, notification: any) {
    try {
      this.server.to(userId).emit('notification', notification);
    } catch (error) {
      this.logger.error('Failed to send notification:', error);
    }
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(client: Socket, payload: { notificationId: string }) {
    try {
      const token = client.handshake.auth.token?.split(' ')[1];
      const decoded = this.jwtService.verify(token);
      const userId = decoded.sub;

      // Emit acknowledgment
      client.emit('notificationRead', payload.notificationId);
    } catch (error) {
      this.logger.error('Mark as read error:', error);
    }
  }
}
