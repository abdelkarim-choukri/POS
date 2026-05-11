import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { KdsService } from './kds.service';
import { Transaction } from '../../common/entities/transaction.entity';
import { TableSessionItem } from '../../common/entities/table-session-item.entity';
import { KdsGateway } from './kds.gateway';
import { EventGateway } from '../../common/gateways/event.gateway';

const BIZ_A = 'biz-a';
const LOC_A = 'loc-a';
const ITEM_ID = 'item-1';

const mockKdsGateway = { emitNewOrder: jest.fn(), emitOrderUpdate: jest.fn() };
const mockEventGateway = { emitToRoom: jest.fn() };

function makeFluentQb(rawResult: any[]) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawResult),
  };
  return qb;
}

describe('KdsService — RST-MOD-001', () => {
  let service: KdsService;
  let tsiRepo: jest.Mocked<any>;
  let txnRepo: jest.Mocked<any>;

  beforeEach(async () => {
    tsiRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };
    txnRepo = {
      createQueryBuilder: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      save: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        KdsService,
        { provide: getRepositoryToken(Transaction), useValue: txnRepo },
        { provide: getRepositoryToken(TableSessionItem), useValue: tsiRepo },
        { provide: KdsGateway, useValue: mockKdsGateway },
        { provide: EventGateway, useValue: mockEventGateway },
      ],
    }).compile();

    service = module.get(KdsService);
    jest.clearAllMocks();
  });

  // ── getKdsItems ────────────────────────────────────────────────────────────

  describe('getKdsItems', () => {
    const tableItem = {
      id: 'tsi-1',
      table_number: 'T-01',
      table_session_id: 'session-1',
      product_name: 'Tajine',
      variant_name: null,
      quantity: 2,
      notes: null,
      modifiers_json: {},
      kds_status: 'new',
      added_at: new Date('2026-05-10T10:00:00Z'),
      added_by: 'Chef',
    };
    const directItem = {
      id: 'txn-item-1',
      product_name: 'Pizza',
      variant_name: null,
      quantity: 1,
      modifiers_json: {},
      kds_status: 'preparing',
      added_at: new Date('2026-05-10T11:00:00Z'),
      added_by: 'Cashier',
    };

    it('returns items from both table_session_items and direct transactions', async () => {
      tsiRepo.createQueryBuilder.mockReturnValue(makeFluentQb([tableItem]));
      txnRepo.createQueryBuilder.mockReturnValue(makeFluentQb([directItem]));

      const result = await service.getKdsItems(BIZ_A, {});

      expect(result.items).toHaveLength(2);
      const sources = result.items.map((i) => i.order_source);
      expect(sources).toContain('table_session');
      expect(sources).toContain('direct_transaction');
    });

    it('backward compat: returns only direct_transaction items when no table session items exist', async () => {
      tsiRepo.createQueryBuilder.mockReturnValue(makeFluentQb([]));
      txnRepo.createQueryBuilder.mockReturnValue(makeFluentQb([directItem]));

      const result = await service.getKdsItems(BIZ_A, {});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].order_source).toBe('direct_transaction');
    });

    it('sets order_source=table_session and includes table_number for table items', async () => {
      tsiRepo.createQueryBuilder.mockReturnValue(makeFluentQb([tableItem]));
      txnRepo.createQueryBuilder.mockReturnValue(makeFluentQb([]));

      const result = await service.getKdsItems(BIZ_A, {});

      expect(result.items[0].order_source).toBe('table_session');
      expect(result.items[0].table_number).toBe('T-01');
      expect(result.items[0].table_session_id).toBe('session-1');
    });

    it('sets table_number=null and table_session_id=null for direct transaction items', async () => {
      tsiRepo.createQueryBuilder.mockReturnValue(makeFluentQb([]));
      txnRepo.createQueryBuilder.mockReturnValue(makeFluentQb([directItem]));

      const result = await service.getKdsItems(BIZ_A, {});

      expect(result.items[0].table_number).toBeNull();
      expect(result.items[0].table_session_id).toBeNull();
    });
  });

  // ── updateItemStatus ───────────────────────────────────────────────────────

  describe('updateItemStatus', () => {
    function makeItem(kdsStatus: string) {
      return {
        id: ITEM_ID,
        business_id: BIZ_A,
        kds_status: kdsStatus,
        table_session_id: 'session-1',
        table_session: {
          location_id: LOC_A,
          table: { table_number: 'T-01' },
        },
      };
    }

    it('valid transition new → preparing updates kds_status and emits event', async () => {
      const item = makeItem('new');
      tsiRepo.findOne.mockResolvedValue(item);
      tsiRepo.save.mockResolvedValue({ ...item, kds_status: 'preparing' });

      const result = await service.updateItemStatus(BIZ_A, ITEM_ID, 'preparing');

      expect(tsiRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ kds_status: 'preparing' }),
      );
      expect(mockEventGateway.emitToRoom).toHaveBeenCalledWith(
        `kds:${BIZ_A}`,
        'kds:item_status_changed',
        expect.objectContaining({ old_status: 'new', new_status: 'preparing' }),
      );
    });

    it('invalid transition new → ready throws 422', async () => {
      tsiRepo.findOne.mockResolvedValue(makeItem('new'));

      await expect(
        service.updateItemStatus(BIZ_A, ITEM_ID, 'ready'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('emits floor:item_ready when transition reaches ready', async () => {
      const item = makeItem('preparing');
      tsiRepo.findOne.mockResolvedValue(item);
      tsiRepo.save.mockResolvedValue({ ...item, kds_status: 'ready' });

      await service.updateItemStatus(BIZ_A, ITEM_ID, 'ready');

      expect(mockEventGateway.emitToRoom).toHaveBeenCalledWith(
        `floor:${BIZ_A}`,
        'floor:item_ready',
        expect.objectContaining({ item_id: ITEM_ID }),
      );
    });

    it('throws 404 for cross-tenant item access', async () => {
      tsiRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateItemStatus('biz-b', ITEM_ID, 'preparing'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
