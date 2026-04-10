import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { Transaction } from '../../common/entities/transaction.entity';
import { KdsGateway } from './kds.gateway';

@Injectable()
export class KdsService {
  constructor(
    @InjectRepository(Transaction)
    private txnRepo: Repository<Transaction>,
    private kdsGateway: KdsGateway,
  ) {}

  // Get active orders for a location (not served, today only)
  async getActiveOrders(locationId: string) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    return this.txnRepo.find({
      where: {
        location_id: locationId,
        order_status: In(['new', 'preparing', 'ready']),
        created_at: MoreThan(startOfDay),
        status: 'completed' as any,
      },
      relations: ['items', 'user'],
      order: { created_at: 'ASC' },
    });
  }

  // Update order status
  async updateOrderStatus(orderId: string, newStatus: string) {
    const order = await this.txnRepo.findOne({
      where: { id: orderId },
      relations: ['items', 'user'],
    });
    if (!order) throw new NotFoundException('Order not found');

    order.order_status = newStatus;
    const saved = await this.txnRepo.save(order);

    // Push update to all KDS clients in this location
    this.kdsGateway.emitOrderUpdate(order.location_id, order.id, newStatus);

    return saved;
  }

  // Called after a new transaction is created — pushes to KDS
  async notifyNewOrder(transaction: Transaction) {
    const full = await this.txnRepo.findOne({
      where: { id: transaction.id },
      relations: ['items', 'user'],
    });
    if (full) {
      this.kdsGateway.emitNewOrder(full.location_id, full);
    }
  }
}
