import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, ConflictException, UnprocessableEntityException } from '@nestjs/common';
import { RestaurantService } from './restaurant.service';
import { DiningArea } from '../../common/entities/dining-area.entity';
import { TableType } from '../../common/entities/table-type.entity';
import { RestaurantTable } from '../../common/entities/table.entity';
import { TableSession } from '../../common/entities/table-session.entity';

const BIZ_A = 'biz-a';
const BIZ_B = 'biz-b';
const AREA_ID = 'area-1';
const TABLE_ID = 'table-1';
const LOC_ID = 'loc-1';
const TT_ID = 'tt-1';

function makeArea(overrides: Partial<DiningArea> = {}): DiningArea {
  return {
    id: AREA_ID,
    business_id: BIZ_A,
    location_id: LOC_ID,
    name: 'Indoor',
    description: null,
    sort_order: 0,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    business: null as any,
    location: null as any,
    ...overrides,
  };
}

function makeTable(overrides: Partial<RestaurantTable> = {}): RestaurantTable {
  return {
    id: TABLE_ID,
    business_id: BIZ_A,
    location_id: LOC_ID,
    area_id: AREA_ID,
    table_type_id: null,
    table_number: 'T-01',
    capacity: 4,
    position_x: null,
    position_y: null,
    qr_code: null,
    is_active: true,
    business: null as any,
    location: null as any,
    area: null as any,
    table_type: null,
    ...overrides,
  };
}

function makeSession(overrides: Partial<TableSession> = {}): TableSession {
  return {
    id: 'session-1',
    business_id: BIZ_A,
    location_id: LOC_ID,
    table_id: TABLE_ID,
    opened_at: new Date(),
    opened_by_user_id: 'user-1',
    closed_at: null,
    closed_in_transaction_id: null,
    customer_id: null,
    guest_count: null,
    expected_split_count: 1,
    partial_payment: false,
    notes: null,
    status: 'open',
    business: null as any,
    location: null as any,
    table: null as any,
    opened_by_user: null as any,
    customer: null,
    ...overrides,
  };
}

function makeQb(rawResults: any[] = []) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawResults),
  };
  return qb;
}

describe('RestaurantService', () => {
  let service: RestaurantService;
  let areaRepo: jest.Mocked<any>;
  let tableTypeRepo: jest.Mocked<any>;
  let tableRepo: jest.Mocked<any>;
  let sessionRepo: jest.Mocked<any>;

  beforeEach(async () => {
    const makeRepo = () => ({
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      create: jest.fn((dto) => ({ ...dto })),
      save: jest.fn((entity) => Promise.resolve({ id: 'new-id', ...entity })),
      remove: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(),
    });

    areaRepo = makeRepo();
    tableTypeRepo = makeRepo();
    tableRepo = makeRepo();
    sessionRepo = makeRepo();

    const module = await Test.createTestingModule({
      providers: [
        RestaurantService,
        { provide: getRepositoryToken(DiningArea), useValue: areaRepo },
        { provide: getRepositoryToken(TableType), useValue: tableTypeRepo },
        { provide: getRepositoryToken(RestaurantTable), useValue: tableRepo },
        { provide: getRepositoryToken(TableSession), useValue: sessionRepo },
      ],
    }).compile();

    service = module.get(RestaurantService);
  });

  // ── RST-002: Create dining area ───────────────────────────────────────────

  describe('createDiningArea', () => {
    it('creates a dining area successfully', async () => {
      areaRepo.findOne.mockResolvedValue(null);
      areaRepo.save.mockResolvedValue(makeArea({ id: 'new-area' }));

      const result = await service.createDiningArea(BIZ_A, {
        location_id: LOC_ID,
        name: 'Indoor',
      });

      expect(areaRepo.findOne).toHaveBeenCalledWith({
        where: { business_id: BIZ_A, name: 'Indoor' },
      });
      expect(result.name).toBe('Indoor');
    });

    it('throws 409 when name already exists for this business', async () => {
      areaRepo.findOne.mockResolvedValue(makeArea());

      await expect(
        service.createDiningArea(BIZ_A, { location_id: LOC_ID, name: 'Indoor' }),
      ).rejects.toThrow(ConflictException);
    });

    it('returns 404 for cross-tenant dining area lookup (BIZ_B cannot see BIZ_A area)', async () => {
      areaRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateDiningArea(BIZ_B, AREA_ID, { name: 'New Name' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── RST-004: Delete dining area ───────────────────────────────────────────

  describe('deleteDiningArea', () => {
    it('deletes area with no active tables', async () => {
      areaRepo.findOne.mockResolvedValue(makeArea());
      tableRepo.count.mockResolvedValue(0);

      const result = await service.deleteDiningArea(BIZ_A, AREA_ID);

      expect(result).toEqual({ deleted: true });
      expect(areaRepo.remove).toHaveBeenCalled();
    });

    it('throws 422 when active tables are assigned to the area', async () => {
      areaRepo.findOne.mockResolvedValue(makeArea());
      tableRepo.count.mockResolvedValue(3);

      await expect(service.deleteDiningArea(BIZ_A, AREA_ID)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws 404 when area not found', async () => {
      areaRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteDiningArea(BIZ_A, 'no-such-area')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  // ── RST-021: Create table ─────────────────────────────────────────────────

  describe('createTable', () => {
    it('creates a table successfully', async () => {
      tableRepo.findOne.mockResolvedValue(null);
      tableRepo.save.mockResolvedValue(makeTable({ id: 'new-table' }));

      const result = await service.createTable(BIZ_A, {
        location_id: LOC_ID,
        area_id: AREA_ID,
        table_number: 'T-01',
      });

      expect(tableRepo.findOne).toHaveBeenCalledWith({
        where: { business_id: BIZ_A, table_number: 'T-01' },
      });
      expect(result.table_number).toBe('T-01');
    });

    it('throws 409 when table_number already exists for this business', async () => {
      tableRepo.findOne.mockResolvedValue(makeTable());

      await expect(
        service.createTable(BIZ_A, { location_id: LOC_ID, area_id: AREA_ID, table_number: 'T-01' }),
      ).rejects.toThrow(ConflictException);
    });

    it('returns 404 for cross-tenant table lookup (BIZ_B cannot see BIZ_A table)', async () => {
      tableRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateTable(BIZ_B, TABLE_ID, { table_number: 'T-99' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── RST-023: Delete table ─────────────────────────────────────────────────

  describe('deleteTable', () => {
    it('deletes table with no open session', async () => {
      tableRepo.findOne.mockResolvedValue(makeTable());
      sessionRepo.findOne.mockResolvedValue(null);

      const result = await service.deleteTable(BIZ_A, TABLE_ID);

      expect(result).toEqual({ deleted: true });
      expect(tableRepo.remove).toHaveBeenCalled();
    });

    it('throws 422 when an open session exists for the table', async () => {
      tableRepo.findOne.mockResolvedValue(makeTable());
      sessionRepo.findOne.mockResolvedValue(makeSession({ status: 'open' }));

      await expect(service.deleteTable(BIZ_A, TABLE_ID)).rejects.toThrow(
        UnprocessableEntityException,
      );
    });

    it('throws 404 when table not found', async () => {
      tableRepo.findOne.mockResolvedValue(null);

      await expect(service.deleteTable(BIZ_A, 'no-such-table')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
