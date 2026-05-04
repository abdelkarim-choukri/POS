import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  ConflictException, NotFoundException,
  UnprocessableEntityException, BadRequestException,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerGrade } from '../../common/entities/customer-grade.entity';
import { CustomerLabel } from '../../common/entities/customer-label.entity';
import { CustomerLabelAssignment } from '../../common/entities/customer-label-assignment.entity';
import { CustomerAttribute } from '../../common/entities/customer-attribute.entity';
import { CustomerAttributeValue } from '../../common/entities/customer-attribute-value.entity';
import { CustomerPointsHistory } from '../../common/entities/customer-points-history.entity';
import { Transaction } from '../../common/entities/transaction.entity';

// ── Shared mock helpers ──────────────────────────────────────────────────────

const managerQueryMock = jest.fn();

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn((e: any) => Promise.resolve(Array.isArray(e) ? e : { id: 'new-uuid', ...e })),
    count: jest.fn().mockResolvedValue(0),
    delete: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn((e: any) => Promise.resolve(e)),
    createQueryBuilder: jest.fn(),
    manager: { query: managerQueryMock },
    ...overrides,
  };
}

const txEmMock = {
  findOne: jest.fn(),
  save: jest.fn((entity: any, data?: any) => Promise.resolve(data ?? entity)),
  create: jest.fn((Entity: any, d: any) => ({ ...d })),
  delete: jest.fn().mockResolvedValue(undefined),
};

const dataSourceMock = {
  transaction: jest.fn((cb: (em: any) => Promise<any>) => cb(txEmMock)),
};

// ── Test suite ───────────────────────────────────────────────────────────────

describe('CustomerService — Part B', () => {
  let service: CustomerService;
  let customerRepo: ReturnType<typeof makeRepo>;
  let gradeRepo: ReturnType<typeof makeRepo>;
  let labelRepo: ReturnType<typeof makeRepo>;
  let claRepo: ReturnType<typeof makeRepo>;
  let attrRepo: ReturnType<typeof makeRepo>;
  let cavRepo: ReturnType<typeof makeRepo>;
  let pointsHistoryRepo: ReturnType<typeof makeRepo>;
  let transactionRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    jest.clearAllMocks();
    customerRepo = makeRepo();
    gradeRepo = makeRepo();
    labelRepo = makeRepo();
    claRepo = makeRepo();
    attrRepo = makeRepo();
    cavRepo = makeRepo();
    pointsHistoryRepo = makeRepo();
    transactionRepo = makeRepo();

    managerQueryMock.mockResolvedValue([[{ customer_counter: 1 }], 1]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: getRepositoryToken(Customer),                useValue: customerRepo },
        { provide: getRepositoryToken(CustomerGrade),           useValue: gradeRepo },
        { provide: getRepositoryToken(CustomerLabel),           useValue: labelRepo },
        { provide: getRepositoryToken(CustomerLabelAssignment), useValue: claRepo },
        { provide: getRepositoryToken(CustomerAttribute),       useValue: attrRepo },
        { provide: getRepositoryToken(CustomerAttributeValue),  useValue: cavRepo },
        { provide: getRepositoryToken(CustomerPointsHistory),   useValue: pointsHistoryRepo },
        { provide: getRepositoryToken(Transaction),             useValue: transactionRepo },
        { provide: DataSource,                                  useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get(CustomerService);
  });

  // ── Labels ─────────────────────────────────────────────────────────────────

  describe('createLabel', () => {
    it('creates and returns label for the business', async () => {
      const result = await service.createLabel('biz-1', { name: 'VIP', color_hex: '#FFD700' });
      expect(labelRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'VIP', business_id: 'biz-1' }),
      );
      expect(labelRepo.save).toHaveBeenCalled();
    });
  });

  describe('deleteLabel', () => {
    it('deletes all assignments then soft-deletes the label', async () => {
      const label = { id: 'label-1', business_id: 'biz-1', is_active: true };
      labelRepo.findOne.mockResolvedValueOnce(label);

      await service.deleteLabel('biz-1', 'label-1');

      expect(claRepo.delete).toHaveBeenCalledWith({ label_id: 'label-1' });
      expect(label.is_active).toBe(false);
      expect(labelRepo.save).toHaveBeenCalledWith(label);
    });

    it('throws NotFoundException for unknown label', async () => {
      labelRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.deleteLabel('biz-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('assignLabels', () => {
    it('replaces existing assignments with new set inside a transaction', async () => {
      customerRepo.findOne
        .mockResolvedValueOnce({ id: 'cust-1', business_id: 'biz-1' })  // existence check
        .mockResolvedValueOnce({ id: 'cust-1', label_assignments: [] }); // final reload

      await service.assignLabels('biz-1', 'cust-1', { label_ids: ['l-a', 'l-b'] });

      expect(dataSourceMock.transaction).toHaveBeenCalledTimes(1);
      // Deletes old assignments
      expect(txEmMock.delete).toHaveBeenCalledWith(CustomerLabelAssignment, { customer_id: 'cust-1' });
      // Creates two new ones
      expect(txEmMock.create).toHaveBeenCalledTimes(2);
    });

    it('throws 404 for unknown customer', async () => {
      customerRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.assignLabels('biz-1', 'bad-id', { label_ids: [] }))
        .rejects.toThrow(NotFoundException);
    });
  });

  // ── Attributes ─────────────────────────────────────────────────────────────

  describe('createAttribute', () => {
    it('persists the definition with business_id', async () => {
      await service.createAttribute('biz-1', {
        key: 'skin_type', label: 'Skin Type', data_type: 'enum',
        enum_options: ['normal', 'oily', 'dry'],
      });
      expect(attrRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ key: 'skin_type', business_id: 'biz-1' }),
      );
    });
  });

  describe('updateAttribute', () => {
    it('blocks data_type change when customer values exist', async () => {
      const attr = { id: 'attr-1', business_id: 'biz-1', data_type: 'string' };
      attrRepo.findOne.mockResolvedValueOnce(attr);
      cavRepo.count.mockResolvedValueOnce(3); // existing values

      await expect(
        service.updateAttribute('biz-1', 'attr-1', { data_type: 'number' }),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('allows data_type change when no values exist', async () => {
      const attr = { id: 'attr-1', business_id: 'biz-1', data_type: 'string', is_required: false };
      attrRepo.findOne.mockResolvedValueOnce(attr);
      cavRepo.count.mockResolvedValueOnce(0);

      await service.updateAttribute('biz-1', 'attr-1', { data_type: 'number' });

      expect(attrRepo.save).toHaveBeenCalledWith(expect.objectContaining({ data_type: 'number' }));
    });

    it('throws 404 for unknown attribute', async () => {
      attrRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.updateAttribute('biz-1', 'bad-id', { label: 'x' }))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('setCustomerAttributes', () => {
    const biz = 'biz-1';
    const cust = 'cust-1';

    beforeEach(() => {
      customerRepo.findOne.mockResolvedValue({ id: cust, business_id: biz });
      txEmMock.findOne.mockResolvedValue(null); // no existing values
    });

    it('saves valid values for all data types', async () => {
      attrRepo.find.mockResolvedValueOnce([
        { id: 'a1', key: 'age',        data_type: 'number',  is_required: false, enum_options: null },
        { id: 'a2', key: 'joined',     data_type: 'date',    is_required: false, enum_options: null },
        { id: 'a3', key: 'subscribed', data_type: 'boolean', is_required: false, enum_options: null },
        { id: 'a4', key: 'tier',       data_type: 'enum',    is_required: false, enum_options: ['gold', 'silver'] },
      ]);
      // getCustomerAttributes final reload
      cavRepo.find.mockResolvedValueOnce([]);

      const result = await service.setCustomerAttributes(biz, cust, {
        values: { age: '30', joined: '2024-01-15', subscribed: 'true', tier: 'gold' },
      });
      expect(result).toBeDefined();
    });

    it('returns 400 with per-field errors for invalid values', async () => {
      attrRepo.find.mockResolvedValueOnce([
        { id: 'a1', key: 'age',  data_type: 'number', is_required: false, enum_options: null },
        { id: 'a2', key: 'tier', data_type: 'enum',   is_required: false, enum_options: ['gold', 'silver'] },
      ]);

      try {
        await service.setCustomerAttributes(biz, cust, {
          values: { age: 'not-a-number', tier: 'platinum' },
        });
        fail('Expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        const body = (e as BadRequestException).getResponse() as any;
        expect(body.errors.age).toBeDefined();
        expect(body.errors.tier).toBeDefined();
      }
    });

    it('returns 400 for unknown attribute key', async () => {
      attrRepo.find.mockResolvedValueOnce([]);

      await expect(
        service.setCustomerAttributes(biz, cust, { values: { unknown_key: 'val' } }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  // ── Points ─────────────────────────────────────────────────────────────────

  describe('adjustPoints', () => {
    it('happy path: returns new balance and creates history entry', async () => {
      // Atomic UPDATE returns new balance
      managerQueryMock.mockResolvedValueOnce([[{ points_balance: 150 }], 1]);

      const result = await service.adjustPoints('biz-1', 'cust-1', { delta: 50, reason: 'Loyalty bonus applied' }, 'user-1');

      expect(managerQueryMock).toHaveBeenCalledWith(
        expect.stringContaining('points_balance + $1 >= 0'),
        [50, 'cust-1', 'biz-1'],
      );
      expect(result.points_balance).toBe(150);
      expect(pointsHistoryRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          source: 'manual_adjustment',
          delta: 50,
          balance_after: 150,
          adjusted_by_user_id: 'user-1',
          reason: 'Loyalty bonus applied',
        }),
      );
    });

    it('throws 422 when adjustment would make balance negative', async () => {
      // UPDATE returns no row (WHERE clause prevents negative balance)
      managerQueryMock.mockResolvedValueOnce([[], 0]);
      customerRepo.findOne.mockResolvedValueOnce({ id: 'cust-1' }); // customer exists

      await expect(
        service.adjustPoints('biz-1', 'cust-1', { delta: -999, reason: 'Large deduction attempt' }, 'user-1'),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 when customer does not exist', async () => {
      managerQueryMock.mockResolvedValueOnce([[], 0]);
      customerRepo.findOne.mockResolvedValueOnce(null); // customer not found

      await expect(
        service.adjustPoints('biz-1', 'bad-id', { delta: -10, reason: 'Some reason here' }, 'user-1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getPointsHistory', () => {
    it('returns paginated history filtered by source', async () => {
      customerRepo.findOne.mockResolvedValueOnce({ id: 'cust-1' });
      const qb: any = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([['entry1'], 1]),
      };
      pointsHistoryRepo.createQueryBuilder = jest.fn().mockReturnValue(qb);

      const result = await service.getPointsHistory('biz-1', 'cust-1', {
        page: 1, limit: 20, source: 'manual_adjustment',
      });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ph.source = :source'),
        { source: 'manual_adjustment' },
      );
      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('throws 404 for unknown customer', async () => {
      customerRepo.findOne.mockResolvedValueOnce(null);
      await expect(
        service.getPointsHistory('biz-1', 'bad-id', { page: 1, limit: 20 }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
