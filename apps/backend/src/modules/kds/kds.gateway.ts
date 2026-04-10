import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/kds',
})
export class KdsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger('KdsGateway');

  handleConnection(client: Socket) {
    const locationId = client.handshake.query.location_id as string;
    if (locationId) {
      client.join(`location:${locationId}`);
      this.logger.log(`KDS client connected: ${client.id} → location ${locationId}`);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`KDS client disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_location')
  handleJoinLocation(@ConnectedSocket() client: Socket, @MessageBody() data: { location_id: string }) {
    client.join(`location:${data.location_id}`);
    this.logger.log(`Client ${client.id} joined location ${data.location_id}`);
  }

  // Called by KDS service when a new order comes in
  emitNewOrder(locationId: string, order: any) {
    this.server.to(`location:${locationId}`).emit('new_order', order);
  }

  // Called by KDS service when order status changes
  emitOrderUpdate(locationId: string, orderId: string, status: string) {
    this.server.to(`location:${locationId}`).emit('order_updated', { id: orderId, order_status: status });
  }
}
