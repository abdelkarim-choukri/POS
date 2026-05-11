import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  MessageBody, ConnectedSocket, OnGatewayConnection,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/events', cors: { origin: '*' } })
export class EventGateway implements OnGatewayConnection {
  @WebSocketServer() server: Server;
  private logger = new Logger('EventGateway');

  handleConnection(client: Socket) {
    const room = client.handshake.query.room as string;
    if (room) {
      client.join(room);
      this.logger.log(`Client ${client.id} joined room: ${room}`);
    }
  }

  @SubscribeMessage('join')
  handleJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    if (data?.room) {
      client.join(data.room);
    }
  }

  emitToRoom(room: string, event: string, payload: any): void {
    this.server.to(room).emit(event, payload);
  }
}
