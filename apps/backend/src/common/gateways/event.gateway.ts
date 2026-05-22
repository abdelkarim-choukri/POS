import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@WebSocketGateway({
  namespace: '/events',
  cors: { origin: process.env.WS_CORS_ORIGIN || 'http://localhost:5173' },
})
export class EventGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private logger = new Logger('EventGateway');

  constructor(private jwtService: JwtService) {}

  handleConnection(client: Socket) {
    const token =
      ((client.handshake.auth as any)?.token as string | undefined) ??
      (client.handshake.headers?.authorization as string | undefined)?.replace('Bearer ', '');

    let user: any;
    try {
      user = this.jwtService.verify(token ?? '');
    } catch {
      client.disconnect(true);
      return;
    }

    (client as any).data = { user };

    const room = client.handshake.query.room as string;
    if (room && this.isRoomAllowed(room, user)) {
      client.join(room);
      this.logger.log(`Client ${client.id} joined room: ${room}`);
    }
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    const user = (client as any).data?.user;
    if (data?.room && user && this.isRoomAllowed(data.room, user)) {
      client.join(data.room);
    }
  }

  emitToRoom(room: string, event: string, payload: any): void {
    this.server.to(room).emit(event, payload);
  }

  private isRoomAllowed(room: string, user: any): boolean {
    if (user?.type === 'super_admin') return true;
    const parts = room.split(':');
    if (parts.length < 2) return false;
    const roomBizId = parts[parts.length - 1];
    return roomBizId === user?.business_id;
  }
}
