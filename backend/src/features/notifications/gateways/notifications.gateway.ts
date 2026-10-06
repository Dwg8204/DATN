import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { AuthRepository } from '../../auth/repositories/auth.repository';
import { AccessTokenPayload } from '../../auth/types/auth-user.type';
import { NotificationDeliveryRow } from '../repositories/notifications.repository';

const ACCESS_COOKIE = 'aptimate_access_token';

@WebSocketGateway({
  namespace: '/notifications',
  path: '/api/v1/socket.io',
  cors: {
    origin: process.env.FRONTEND_ORIGIN || 'http://localhost:5173',
    credentials: true,
  },
})
export class NotificationsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(NotificationsGateway.name);

  @WebSocketServer()
  private server!: Server;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly authRepository: AuthRepository,
  ) {}

  async handleConnection(@ConnectedSocket() client: Socket): Promise<void> {
    try {
      const token = this.readCookie(client.handshake.headers.cookie, ACCESS_COOKIE);
      if (!token) throw new Error('Missing access token');
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: this.config.getOrThrow<string>('auth.accessSecret'),
        issuer: this.config.getOrThrow<string>('auth.issuer'),
        audience: this.config.getOrThrow<string>('auth.audience'),
      });
      if (payload.type !== 'access' || !payload.family || !Number.isInteger(payload.version)) {
        throw new Error('Invalid access token');
      }
      const user = await this.authRepository.findAuthUserById(payload.sub, payload.family);
      if (!user || user.status !== 'ACTIVE' || payload.version !== user.authVersion) {
        throw new Error('Account unavailable');
      }
      client.data.userId = user.id;
      await client.join(this.userRoom(user.id));
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(@ConnectedSocket() client: Socket): void {
    if (client.data.userId) this.logger.debug(`Notification socket disconnected for user ${client.data.userId}`);
  }

  emitCreated(deliveries: NotificationDeliveryRow[]): void {
    for (const delivery of deliveries) {
      this.server.to(this.userRoom(delivery.user_id)).emit('notification.created', delivery);
    }
  }

  private userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private readCookie(header: string | undefined, name: string): string | null {
    if (!header) return null;
    for (const pair of header.split(';')) {
      const separator = pair.indexOf('=');
      if (separator < 0 || pair.slice(0, separator).trim() !== name) continue;
      return decodeURIComponent(pair.slice(separator + 1).trim());
    }
    return null;
  }
}
