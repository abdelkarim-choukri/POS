import { KdsService } from './kds.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Transaction } from '../../common/entities/transaction.entity';
import { TableSessionItem } from '../../common/entities/table-session-item.entity';
import { Test } from '@nestjs/testing';
import { KdsGateway } from './kds.gateway';
import { EventGateway } from '../../common/gateways/event.gateway';
import { NotFoundException } from '@nestjs/common';

const BIZ_ID = 'biz-1';

function mockRepo(overrides: any = {}) {
  return { findOne: jest.fn(), find: jest.fn(), save: jest.fn(), ...overrides };
}

async function buildService(txnRepo: any) {
  const module = await Test.createTestingModule({
    providers: [
      KdsService,
      { provide: getRepositoryToken(Transaction), useValue: txnRepo },
      { provide: getRepositoryToken(TableSessionItem), useValue: mockRepo() },
      { provide: KdsGateway, useValue: { emitOrderUpdate: jest.fn(), emitNewOrder: jest.fn() } },
      { provide: EventGateway, useValue: { emitToRoom: jest.fn() } },
    ],
  }).compile();
  return module.get(KdsService);
}

describe('KdsService.updateOrderStatus', () => {
  it('returns 404 when order does not belong to the requesting business', async () => {
    const txnRepo = mockRepo({
      findOne: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    });
    const service = await buildService(txnRepo);
    await expect(service.updateOrderStatus(BIZ_ID, 'order-99', 'preparing'))
      .rejects.toMatchObject({ response: { error: 'KDS_ORDER_NOT_FOUND' } });
  });

  it('updates status when order belongs to the business', async () => {
    const order = { id: 'order-1', business_id: BIZ_ID, location_id: 'loc-1', items: [], order_status: 'new' };
    const txnRepo = mockRepo({
      findOne: jest.fn().mockResolvedValue(order),
      save: jest.fn().mockImplementation((o: any) => o),
    });
    const service = await buildService(txnRepo);
    const result = await service.updateOrderStatus(BIZ_ID, 'order-1', 'preparing');
    expect(result.order_status).toBe('preparing');
  });
});
