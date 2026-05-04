import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
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
    save: jest.fn((e: any) => Promise.resolve({ id: 'new-uuid', ...e })),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn(),
    manager: { query: managerQueryMock },
    ...overrides,
  };
}

const dataSourceMock = {
  transaction: jest.fn((cb: (em: any) => Promise<any>) => {
    // Provide a minimal EntityManager with a grade by default
    return cb({
      findOne: jest.fn()
        .mockResolvedValueOnce({ id: 'grade-1', business_id: 'biz-1', is_active: true })
        .mockResolvedValueOnce(null),
      save: jest.fn((e: any) => Promise.resolve(e)),
      createQueryBuilder: jest.fn(() => ({
        update: jest.fn().mockReturnThis(),
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        execute: jest.fn().mockResolvedValue(undefined),
      })),
    });
  }),
};

// ── Test suite ───────────────────────────────────────────────────────────────

describe('CustomerService', () => {
  let service: CustomerService;
  let customerRepo: ReturnType<typeof makeRepo>;
  let gradeRepo: ReturnType<typeof makeRepo>;
  let claRepo: ReturnType<typeof makeRepo>;
  let transactionRepo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    jest.clearAllMocks();
    customerRepo = makeRepo();
    gradeRepo = makeRepo();
    claRepo = makeRepo();
    transactionRepo = makeRepo();

    // Default counter response
    managerQueryMock.mockResolvedValue([[{ customer_counter: 1 }], 1]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        { provide: getRepositoryToken(Customer),                useValue: customerRepo },
        { provide: getRepositoryToken(CustomerGrade),           useValue: gradeRepo },
        { provide: getRepositoryToken(CustomerLabel),           useValue: makeRepo() },
        { provide: getRepositoryToken(CustomerLabelAssignment), useValue: claRepo },
        { provide: getRepositoryToken(CustomerAttribute),       useValue: makeRepo() },
        { provide: getRepositoryToken(CustomerAttributeValue),  useValue: makeRepo() },
        { provide: getRepositoryToken(CustomerPointsHistory),   useValue: makeRepo() },
        { provide: getRepositoryToken(Transaction),             useValue: transactionRepo },
        { provide: DataSource,                                  useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get(CustomerService);
  });

  // ── create ─────────────────────────────────────────────────────────────────

  describe('create', () => {
    const dto = {
      phone: '+212600000001',
      first_name: 'Amina',
      last_name: 'El Idrissi',
    } as any;

    it('creates a customer with auto-generated code C-000001', async () => {
      customerRepo.findOne
        .mockResolvedValueOnce(null)  // phone uniqueness check
        .mockResolvedValueOnce({ id: 'new-uuid', customer_code: 'C-000001' }); // final reload

      const result = await service.create('biz-1', dto);

      expect(managerQueryMock).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE businesses'),
        ['biz-1'],
      );
      expect(customerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer_code: 'C-000001', business_id: 'biz-1' }),
      );
      expect(result).toBeDefined();
    });

    it('pads counter to 6 digits (counter=42 → C-000042)', async () => {
      managerQueryMock.mockResolvedValueOnce([[{ customer_counter: 42 }], 1]);
      customerRepo.findOne.mockResolvedValue(null);

      await service.create('biz-1', dto);

      expect(customerRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ customer_code: 'C-000042' }),
      );
    });

    it('throws 409 ConflictException when phone already exists for this business', async () => {
      customerRepo.findOne.mockResolvedValueOnce({ id: 'existing-uuid' }); // phone exists

      await expect(service.create('biz-1', dto)).rejects.toThrow(ConflictException);
    });

    it('assigns labels if label_ids provided', async () => {
      customerRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'new-uuid' });
      claRepo.save.mockResolvedValueOnce([]);

      await service.create('biz-1', { ...dto, label_ids: ['label-a', 'label-b'] });

      expect(claRepo.create).toHaveBeenCalledTimes(2);
    });

    it('skips label assignment when no label_ids provided', async () => {
      customerRepo.findOne.mockResolvedValue(null);

      await service.create('biz-1', dto);

      expect(claRepo.create).not.toHaveBeenCalled();
    });
  });

  // ── list ───────────────────────────────────────────────────────────────────

  describe('list (pagination + filters)', () => {
    const makeQb = () => {
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[], 0]),
      };
      return qb;
    };

    it('returns paginated result with default page/limit', async () => {
      const qb = makeQb();
      qb.getManyAndCount.mockResolvedValueOnce([['c1', 'c2'], 2]);
      customerRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.list('biz-1', { page: 1, limit: 20, is_active: true });

      expect(result.records).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('applies search filter when search param provided', async () => {
      const qb = makeQb();
      customerRepo.createQueryBuilder.mockReturnValue(qb);

      await service.list('biz-1', { page: 1, limit: 20, search: 'Amina', is_active: true });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('ILIKE'),
        expect.objectContaining({ s: '%Amina%' }),
      );
    });

    it('applies points_op filter', async () => {
      const qb = makeQb();
      customerRepo.createQueryBuilder.mockReturnValue(qb);

      await service.list('biz-1', { page: 1, limit: 20, points_op: 'gt', points_value: 100, is_active: true });

      expect(qb.andWhere).toHaveBeenCalledWith(
        expect.stringContaining('points_balance > :pv'),
        { pv: 100 },
      );
    });

    it('applies one EXISTS subquery per label_id (AND semantics)', async () => {
      const qb = makeQb();
      customerRepo.createQueryBuilder.mockReturnValue(qb);

      await service.list('biz-1', { page: 1, limit: 20, label_ids: 'label-a,label-b', is_active: true });

      const andWhereCalls = qb.andWhere.mock.calls;
      const existsCalls = andWhereCalls.filter((c: any[]) =>
        typeof c[0] === 'string' && c[0].includes('EXISTS'),
      );
      expect(existsCalls).toHaveLength(2);
    });
  });

  // ── softDelete ─────────────────────────────────────────────────────────────

  describe('softDelete', () => {
    it('sets is_active = false on the customer', async () => {
      const customer = { id: 'cust-1', business_id: 'biz-1', is_active: true };
      customerRepo.findOne.mockResolvedValueOnce(customer);

      await service.softDelete('biz-1', 'cust-1');

      expect(customer.is_active).toBe(false);
      expect(customerRepo.save).toHaveBeenCalledWith(customer);
    });

    it('throws NotFoundException for unknown customer', async () => {
      customerRepo.findOne.mockResolvedValueOnce(null);
      await expect(service.softDelete('biz-1', 'bad-id')).rejects.toThrow(NotFoundException);
    });
  });

  // ── update ─────────────────────────────────────────────────────────────────

  describe('update', () => {
    it('merges dto fields onto the customer and saves', async () => {
      const customer = { id: 'c1', business_id: 'biz-1', first_name: 'Old', phone: '+212600000001' };
      customerRepo.findOne
        .mockResolvedValueOnce(customer)   // load customer
        .mockResolvedValueOnce(null);      // phone uniqueness check

      await service.update('biz-1', 'c1', { first_name: 'New', phone: '+212600000002' } as any);

      expect(customer.first_name).toBe('New');
      expect(customerRepo.save).toHaveBeenCalledWith(customer);
    });

    it('throws 409 if new phone belongs to another customer', async () => {
      customerRepo.findOne
        .mockResolvedValueOnce({ id: 'c1', phone: '+212600000001' })
        .mockResolvedValueOnce({ id: 'c2' }); // another customer has that phone

      await expect(
        service.update('biz-1', 'c1', { phone: '+212600000002' } as any),
      ).rejects.toThrow(ConflictException);
    });
  });

  // ── grades ─────────────────────────────────────────────────────────────────

  describe('deleteGrade', () => {
    it('wraps demotion + soft-delete in a transaction', async () => {
      await service.deleteGrade('biz-1', 'grade-1');
      expect(dataSourceMock.transaction).toHaveBeenCalledTimes(1);
    });

    it('demotes affected customers to fallback grade inside the transaction', async () => {
      const grade = { id: 'grade-1', business_id: 'biz-1', is_active: true };
      const fallback = { id: 'grade-2', min_points: 0, sort_order: 0 };

      const execMock = jest.fn().mockResolvedValue(undefined);
      const em: any = {
        findOne: jest.fn()
          .mockResolvedValueOnce(grade)
          .mockResolvedValueOnce(fallback),
        save: jest.fn((e: any) => Promise.resolve(e)),
        createQueryBuilder: jest.fn(() => ({
          update: jest.fn().mockReturnThis(),
          set: jest.fn().mockReturnThis(),
          where: jest.fn().mockReturnThis(),
          execute: execMock,
        })),
      };

      dataSourceMock.transaction.mockImplementationOnce((cb: any) => cb(em));

      await service.deleteGrade('biz-1', 'grade-1');

      expect(execMock).toHaveBeenCalled();
      expect(grade.is_active).toBe(false);
      expect(em.save).toHaveBeenCalledWith(grade);
    });

    it('sets grade_id to null when no other active grades exist', async () => {
      const grade = { id: 'grade-1', business_id: 'biz-1', is_active: true };

      let setArg: any;
      const em: any = {
        findOne: jest.fn()
          .mockResolvedValueOnce(grade)
          .mockResolvedValueOnce(null), // no fallback
        save: jest.fn((e: any) => Promise.resolve(e)),
        createQueryBuilder: jest.fn(() => ({
          update: jest.fn().mockReturnThis(),
          set: jest.fn((v: any) => { setArg = v; return em.createQueryBuilder(); }),
          where: jest.fn().mockReturnThis(),
          execute: jest.fn().mockResolvedValue(undefined),
        })),
      };

      dataSourceMock.transaction.mockImplementationOnce((cb: any) => cb(em));

      await service.deleteGrade('biz-1', 'grade-1');

      expect(setArg).toEqual({ grade_id: null });
    });
  });
});
