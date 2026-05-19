import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VendorPaymentService } from './vendor-payment.service';
import { VendorPayment } from '../../common/entities/vendor-payment.entity';
import { Vendor } from '../../common/entities/vendor.entity';
import { PurchaseOrder } from '../../common/entities/purchase-order.entity';
import { AuditLog } from '../../common/entities/audit-log.entity';

const BIZ = 'biz-1';
const OTHER_BIZ = 'biz-2';
const USER_ID = 'user-1';
const VP_ID = 'vp-1';
const VENDOR_ID = 'vendor-1';
const PO_ID = 'po-1';

function makeVp(overrides: Partial<VendorPayment> = {}): VendorPayment {
  return {
    id: VP_ID,
    business_id: BIZ,
    vendor_id: VENDOR_ID,
    purchase_order_id: null,
    payment_number: 'VP-2026-00001',
    amount_paid: 1000,
    payment_date: '2026-05-17',
    payment_method: 'bank_transfer',
    reference_number: null,
    notes: null,
    status: 'pending',
    created_by_user_id: USER_ID,
    confirmed_by_user_id: null,
    confirmed_at: null,
    created_at: new Date(),
    ...overrides,
  } as VendorPayment;
}

function makeVendor(): Vendor {
  return { id: VENDOR_ID, business_id: BIZ, name: 'Test Vendor' } as Vendor;
}

function makePo(): PurchaseOrder {
  return { id: PO_ID, business_id: BIZ, vendor_id: VENDOR_ID, total_ttc: 5000, status: 'confirmed' } as PurchaseOrder;
}

describe('VendorPaymentService', () => {
  let service: VendorPaymentService;
  let vpRepo: jest.Mocked<any>;
  let vendorRepo: jest.Mocked<any>;
  let poRepo: jest.Mocked<any>;
  let auditLogRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  const mockQr = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    query: jest.fn(),
    manager: { create: jest.fn(), save: jest.fn() },
  };

  beforeEach(async () => {
    vpRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
    };
    vendorRepo = { findOne: jest.fn() };
    poRepo = { findOne: jest.fn() };
    auditLogRepo = { create: jest.fn((dto) => ({ ...dto })), save: jest.fn().mockResolvedValue(undefined) };
    dataSource = {
      createQueryRunner: jest.fn().mockReturnValue(mockQr),
      query: jest.fn(),
    };

    const module = await Test.createTestingModule({
      providers: [
        VendorPaymentService,
        { provide: getRepositoryToken(VendorPayment), useValue: vpRepo },
        { provide: getRepositoryToken(Vendor), useValue: vendorRepo },
        { provide: getRepositoryToken(PurchaseOrder), useValue: poRepo },
        { provide: getRepositoryToken(AuditLog), useValue: auditLogRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(VendorPaymentService);

    Object.values(mockQr).forEach((v) => typeof v === 'function' && (v as jest.Mock).mockReset());
    Object.values(mockQr.manager).forEach((v) => typeof v === 'function' && (v as jest.Mock).mockReset());
    mockQr.connect.mockResolvedValue(undefined);
    mockQr.startTransaction.mockResolvedValue(undefined);
    mockQr.commitTransaction.mockResolvedValue(undefined);
    mockQr.rollbackTransaction.mockResolvedValue(undefined);
    mockQr.release.mockResolvedValue(undefined);
  });

  describe('listPayments', () => {
    it('returns paginated payments for the business', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[makeVp()], 1]),
      };
      vpRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.listPayments(BIZ, {});
      expect(result.records).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getPayment', () => {
    it('returns payment for the correct business', async () => {
      vpRepo.findOne.mockResolvedValue(makeVp());
      const result = await service.getPayment(VP_ID, BIZ);
      expect(result.id).toBe(VP_ID);
    });

    it('throws 404 for cross-tenant access', async () => {
      vpRepo.findOne.mockResolvedValue(null);
      await expect(service.getPayment(VP_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createPayment', () => {
    it('creates payment with auto-generated VP-YYYY-NNNNN number', async () => {
      vendorRepo.findOne.mockResolvedValue(makeVendor());
      mockQr.query.mockResolvedValue([{ cnt: 0 }]);
      const saved = makeVp();
      mockQr.manager.create.mockReturnValue({});
      mockQr.manager.save.mockResolvedValue(saved);
      vpRepo.findOne.mockResolvedValue(saved);

      const result = await service.createPayment(BIZ, USER_ID, {
        vendor_id: VENDOR_ID,
        amount_paid: 1000,
        payment_date: '2026-05-17',
        payment_method: 'bank_transfer',
      });
      expect(mockQr.commitTransaction).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('throws 404 if vendor not found', async () => {
      vendorRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createPayment(BIZ, USER_ID, {
          vendor_id: VENDOR_ID,
          amount_paid: 100,
          payment_date: '2026-05-17',
          payment_method: 'cash',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 404 if PO does not belong to this vendor', async () => {
      vendorRepo.findOne.mockResolvedValue(makeVendor());
      poRepo.findOne.mockResolvedValue(null);
      await expect(
        service.createPayment(BIZ, USER_ID, {
          vendor_id: VENDOR_ID,
          purchase_order_id: PO_ID,
          amount_paid: 100,
          payment_date: '2026-05-17',
          payment_method: 'cash',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmPayment', () => {
    it('transitions pending to confirmed', async () => {
      vpRepo.findOne
        .mockResolvedValueOnce(makeVp({ status: 'pending' }))
        .mockResolvedValueOnce(makeVp({ status: 'confirmed' }));
      vpRepo.update.mockResolvedValue(undefined);
      const result = await service.confirmPayment(VP_ID, BIZ, USER_ID);
      expect(vpRepo.update).toHaveBeenCalledWith(
        VP_ID,
        expect.objectContaining({ status: 'confirmed', confirmed_by_user_id: USER_ID }),
      );
      expect(result?.status).toBe('confirmed');
    });

    it('throws 422 if not pending', async () => {
      vpRepo.findOne.mockResolvedValue(makeVp({ status: 'confirmed' }));
      await expect(service.confirmPayment(VP_ID, BIZ, USER_ID)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for cross-tenant access', async () => {
      vpRepo.findOne.mockResolvedValue(null);
      await expect(service.confirmPayment(VP_ID, OTHER_BIZ, USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('voidPayment', () => {
    it('sets status to voided and writes audit log', async () => {
      vpRepo.findOne
        .mockResolvedValueOnce(makeVp({ status: 'pending' }))
        .mockResolvedValueOnce(makeVp({ status: 'voided' }));
      vpRepo.update.mockResolvedValue(undefined);
      const result = await service.voidPayment(VP_ID, BIZ, { reason: 'duplicate' }, USER_ID);
      expect(vpRepo.update).toHaveBeenCalledWith(VP_ID, { status: 'voided' });
      expect(result?.status).toBe('voided');
      expect(auditLogRepo.create).toHaveBeenCalledWith(expect.objectContaining({ action: 'void' }));
      expect(auditLogRepo.save).toHaveBeenCalled();
    });

    it('throws 422 if already voided', async () => {
      vpRepo.findOne.mockResolvedValue(makeVp({ status: 'voided' }));
      await expect(service.voidPayment(VP_ID, BIZ, { reason: 'x' }, USER_ID)).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 404 for cross-tenant access', async () => {
      vpRepo.findOne.mockResolvedValue(null);
      await expect(service.voidPayment(VP_ID, OTHER_BIZ, { reason: 'x' }, USER_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getVendorOutstanding', () => {
    it('returns POs with balance_due > 0', async () => {
      vendorRepo.findOne.mockResolvedValue(makeVendor());
      dataSource.query.mockResolvedValue([
        {
          id: PO_ID,
          po_number: 'PO-2026-0001',
          total_ttc: '5000',
          amount_paid: '2000',
          balance_due: '3000',
        },
      ]);
      const result = await service.getVendorOutstanding(VENDOR_ID, BIZ);
      expect(result).toHaveLength(1);
      expect(Number(result[0].balance_due)).toBe(3000);
    });

    it('throws 404 if vendor not in business', async () => {
      vendorRepo.findOne.mockResolvedValue(null);
      await expect(service.getVendorOutstanding(VENDOR_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  describe('getVendorPaymentSummary', () => {
    it('returns aggregate stats', async () => {
      vendorRepo.findOne.mockResolvedValue(makeVendor());
      dataSource.query
        .mockResolvedValueOnce([{ total_paid: '10000', payment_count: 5 }])
        .mockResolvedValueOnce([{ total_outstanding: '3000' }])
        .mockResolvedValueOnce([{ avg_days_to_pay: 15 }]);
      const result = await service.getVendorPaymentSummary(VENDOR_ID, BIZ);
      expect(result.total_paid).toBe(10000);
      expect(result.total_outstanding).toBe(3000);
      expect(result.payment_count).toBe(5);
      expect(result.avg_days_to_pay).toBe(15);
    });

    it('throws 404 if vendor not in business', async () => {
      vendorRepo.findOne.mockResolvedValue(null);
      await expect(service.getVendorPaymentSummary(VENDOR_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });
});
