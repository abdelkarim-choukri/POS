import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  NotFoundException, ConflictException, UnprocessableEntityException,
} from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { UnitOfMeasure } from '../../common/entities/unit-of-measure.entity';
import { Warehouse } from '../../common/entities/warehouse.entity';
import { Vendor } from '../../common/entities/vendor.entity';
import { VendorCheckDetail } from '../../common/entities/vendor-check-detail.entity';
import { Brand } from '../../common/entities/brand.entity';
import { NutritionInfo } from '../../common/entities/nutrition-info.entity';
import { Product } from '../../common/entities/product.entity';

const BIZ_ID = 'biz-1';
const OTHER_BIZ = 'biz-2';
const WAREHOUSE_ID = 'wh-1';
const VENDOR_ID = 'vendor-1';
const BRAND_ID = 'brand-1';
const PRODUCT_ID = 'prod-1';
const UOM_ID = 'uom-1';

// ── Factories ────────────────────────────────────────────────────────────────

function makeUom(overrides: Partial<UnitOfMeasure> = {}): UnitOfMeasure {
  return {
    id: UOM_ID,
    business_id: BIZ_ID,
    name: 'Kilogram',
    abbreviation: 'kg',
    is_system: false,
    is_active: true,
    sort_order: 0,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as UnitOfMeasure;
}

function makeWarehouse(overrides: Partial<Warehouse> = {}): Warehouse {
  return {
    id: WAREHOUSE_ID,
    business_id: BIZ_ID,
    name: 'Main Warehouse',
    code: 'WH-01',
    address: '123 Street',
    manager_user_id: null,
    is_central: false,
    linked_location_id: null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as Warehouse;
}

function makeVendor(overrides: Partial<Vendor> = {}): Vendor {
  return {
    id: VENDOR_ID,
    business_id: BIZ_ID,
    code: 'VEND-01',
    name: 'Test Vendor',
    contact_name: 'Ali',
    contact_phone: '0600000000',
    contact_email: 'ali@vendor.ma',
    address: '456 Ave',
    ice_number: '123456789000000',
    if_number: '12345678',
    payment_terms_days: 30,
    notes: null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as Vendor;
}

function makeBrand(overrides: Partial<Brand> = {}): Brand {
  return {
    id: BRAND_ID,
    business_id: BIZ_ID,
    name: 'Danone',
    code: 'DAN',
    logo_url: null,
    description: null,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as Brand;
}

function makeNutritionInfo(overrides: Partial<NutritionInfo> = {}): NutritionInfo {
  return {
    id: 'ni-1',
    business_id: BIZ_ID,
    product_id: PRODUCT_ID,
    serving_size_g: 100,
    calories_kcal: 250,
    protein_g: 10,
    carbs_g: 30,
    sugar_g: 5,
    fat_g: 8,
    saturated_fat_g: 3,
    fiber_g: 2,
    sodium_mg: 150,
    allergens: 'gluten,dairy',
    is_vegetarian: true,
    is_vegan: false,
    is_halal: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as NutritionInfo;
}

function makeQb(results: any[] = [], count = 0) {
  const qb: any = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    addOrderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getManyAndCount: jest.fn().mockResolvedValue([results, count]),
    getMany: jest.fn().mockResolvedValue(results),
    getCount: jest.fn().mockResolvedValue(count),
    getOne: jest.fn().mockResolvedValue(results[0] ?? null),
    getRawMany: jest.fn().mockResolvedValue(results),
  };
  return qb;
}

// ── Service builder ──────────────────────────────────────────────────────────

async function buildService(overrides: {
  uomRepo?: Partial<any>;
  warehouseRepo?: Partial<any>;
  vendorRepo?: Partial<any>;
  checkDetailRepo?: Partial<any>;
  brandRepo?: Partial<any>;
  nutritionRepo?: Partial<any>;
  productRepo?: Partial<any>;
} = {}) {
  const uomRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn((e: any) => Promise.resolve({ id: UOM_ID, ...e })),
    count: jest.fn().mockResolvedValue(0),
    createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
    ...overrides.uomRepo,
  };

  const warehouseRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn((e: any) => Promise.resolve({ id: WAREHOUSE_ID, ...e })),
    createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
    ...overrides.warehouseRepo,
  };

  const vendorRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn((e: any) => Promise.resolve({ id: VENDOR_ID, ...e })),
    createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
    ...overrides.vendorRepo,
  };

  const checkDetailRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn((e: any) => Promise.resolve({ id: 'cd-1', ...e })),
    ...overrides.checkDetailRepo,
  };

  const brandRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn((e: any) => Promise.resolve({ id: BRAND_ID, ...e })),
    ...overrides.brandRepo,
  };

  const nutritionRepo = {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
    create: jest.fn((d: any) => ({ ...d })),
    save: jest.fn((e: any) => Promise.resolve({ id: 'ni-1', ...e })),
    createQueryBuilder: jest.fn().mockReturnValue(makeQb()),
    ...overrides.nutritionRepo,
  };

  const productRepo = {
    findOne: jest.fn().mockResolvedValue({
      id: PRODUCT_ID, business_id: BIZ_ID, name: 'Product A',
    }),
    ...overrides.productRepo,
  };

  const module = await Test.createTestingModule({
    providers: [
      InventoryService,
      { provide: getRepositoryToken(UnitOfMeasure), useValue: uomRepo },
      { provide: getRepositoryToken(Warehouse), useValue: warehouseRepo },
      { provide: getRepositoryToken(Vendor), useValue: vendorRepo },
      { provide: getRepositoryToken(VendorCheckDetail), useValue: checkDetailRepo },
      { provide: getRepositoryToken(Brand), useValue: brandRepo },
      { provide: getRepositoryToken(NutritionInfo), useValue: nutritionRepo },
      { provide: getRepositoryToken(Product), useValue: productRepo },
    ],
  }).compile();

  return {
    service: module.get(InventoryService),
    uomRepo,
    warehouseRepo,
    vendorRepo,
    checkDetailRepo,
    brandRepo,
    nutritionRepo,
    productRepo,
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('InventoryService', () => {

  // ── Units of Measure ─────────────────────────────────────────────────────

  describe('listUnitsOfMeasure [EXT-INV-001]', () => {
    it('returns system units and business custom units', async () => {
      const systemUom = makeUom({ id: 'sys-1', business_id: null, is_system: true, name: 'Unit', abbreviation: 'unit' });
      const customUom = makeUom({ id: 'cust-1', business_id: BIZ_ID, name: 'Tablet', abbreviation: 'tab' });
      const { service } = await buildService({
        uomRepo: {
          find: jest.fn().mockResolvedValue([systemUom, customUom]),
        },
      });
      const result = await service.listUnitsOfMeasure(BIZ_ID);
      expect(result.records).toHaveLength(2);
    });
  });

  describe('createUnitOfMeasure [EXT-INV-001]', () => {
    it('creates a custom unit for the business', async () => {
      const { service, uomRepo } = await buildService();
      const result = await service.createUnitOfMeasure(BIZ_ID, { name: 'Tablet', abbreviation: 'tab' });
      expect(uomRepo.save).toHaveBeenCalled();
      expect(result).toHaveProperty('id');
    });
  });

  describe('updateUnitOfMeasure [EXT-INV-001]', () => {
    it('updates a custom unit', async () => {
      const uom = makeUom({ is_system: false });
      const { service, uomRepo } = await buildService({
        uomRepo: { findOne: jest.fn().mockResolvedValue(uom) },
      });
      await service.updateUnitOfMeasure(UOM_ID, BIZ_ID, { name: 'Kilogramme' });
      expect(uomRepo.save).toHaveBeenCalled();
    });

    it('throws 404 for a unit belonging to another business', async () => {
      const { service } = await buildService({
        uomRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        service.updateUnitOfMeasure(UOM_ID, OTHER_BIZ, { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteUnitOfMeasure [EXT-INV-001]', () => {
    it('throws 422 when trying to delete a system unit', async () => {
      const sysUom = makeUom({ is_system: true });
      const { service } = await buildService({
        uomRepo: { findOne: jest.fn().mockResolvedValue(sysUom) },
      });
      await expect(
        service.deleteUnitOfMeasure(UOM_ID, BIZ_ID),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws 422 when unit is referenced by a product', async () => {
      const customUom = makeUom({ is_system: false });
      const { service } = await buildService({
        uomRepo: {
          findOne: jest.fn().mockResolvedValue(customUom),
        },
        productRepo: {
          findOne: jest.fn().mockResolvedValue({ id: PRODUCT_ID, business_id: BIZ_ID }),
          count: jest.fn().mockResolvedValue(1), // 1 product references this unit
        },
      });
      await expect(
        service.deleteUnitOfMeasure(UOM_ID, BIZ_ID),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('soft-deletes (sets is_active=false) when not in use', async () => {
      const customUom = makeUom({ is_system: false });
      const { service, uomRepo } = await buildService({
        uomRepo: {
          findOne: jest.fn().mockResolvedValue(customUom),
          save: jest.fn((e: any) => Promise.resolve(e)),
        },
        productRepo: {
          findOne: jest.fn().mockResolvedValue({ id: PRODUCT_ID, business_id: BIZ_ID }),
          count: jest.fn().mockResolvedValue(0), // no products reference this unit
        },
      });
      await service.deleteUnitOfMeasure(UOM_ID, BIZ_ID);
      expect(uomRepo.save).toHaveBeenCalled();
      expect(customUom.is_active).toBe(false);
    });
  });

  // ── Warehouses ────────────────────────────────────────────────────────────

  describe('listWarehouses [INV-001]', () => {
    it('returns warehouses for the business', async () => {
      const wh = makeWarehouse();
      const { service } = await buildService({
        warehouseRepo: { find: jest.fn().mockResolvedValue([wh]) },
      });
      const result = await service.listWarehouses(BIZ_ID);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].code).toBe('WH-01');
    });
  });

  describe('getWarehouse [INV-002]', () => {
    it('returns a single warehouse', async () => {
      const wh = makeWarehouse();
      const { service } = await buildService({
        warehouseRepo: { findOne: jest.fn().mockResolvedValue(wh) },
      });
      const result = await service.getWarehouse(WAREHOUSE_ID, BIZ_ID);
      expect(result.id).toBe(WAREHOUSE_ID);
    });

    it('throws 404 for a warehouse in another business', async () => {
      const { service } = await buildService({
        warehouseRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        service.getWarehouse(WAREHOUSE_ID, OTHER_BIZ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createWarehouse [INV-003]', () => {
    it('creates and returns the warehouse', async () => {
      const { service, warehouseRepo } = await buildService({
        warehouseRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      const result = await service.createWarehouse(BIZ_ID, {
        name: 'Main', code: 'WH-01', is_central: false,
      });
      expect(warehouseRepo.save).toHaveBeenCalled();
    });

    it('throws 409 when code already exists for this business', async () => {
      const { service } = await buildService({
        warehouseRepo: { findOne: jest.fn().mockResolvedValue(makeWarehouse()) },
      });
      await expect(
        service.createWarehouse(BIZ_ID, { name: 'Dup', code: 'WH-01', is_central: false }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateWarehouse [INV-004]', () => {
    it('updates and returns the warehouse', async () => {
      const wh = makeWarehouse();
      const { service, warehouseRepo } = await buildService({
        warehouseRepo: {
          findOne: jest.fn().mockResolvedValue(wh),
          save: jest.fn((e: any) => Promise.resolve(e)),
        },
      });
      await service.updateWarehouse(WAREHOUSE_ID, BIZ_ID, { name: 'Updated' });
      expect(warehouseRepo.save).toHaveBeenCalled();
    });
  });

  describe('deleteWarehouse [INV-005]', () => {
    it('soft-deletes by setting is_active=false', async () => {
      const wh = makeWarehouse({ is_active: true });
      const { service, warehouseRepo } = await buildService({
        warehouseRepo: {
          findOne: jest.fn().mockResolvedValue(wh),
          save: jest.fn((e: any) => Promise.resolve(e)),
        },
      });
      await service.deleteWarehouse(WAREHOUSE_ID, BIZ_ID);
      expect(warehouseRepo.save).toHaveBeenCalled();
      expect(wh.is_active).toBe(false);
    });

    it('throws 404 for a warehouse in another business', async () => {
      const { service } = await buildService({
        warehouseRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        service.deleteWarehouse(WAREHOUSE_ID, OTHER_BIZ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Vendors ───────────────────────────────────────────────────────────────

  describe('listVendors [INV-010]', () => {
    it('returns full vendor records by default', async () => {
      const { service } = await buildService({
        vendorRepo: { find: jest.fn().mockResolvedValue([makeVendor()]) },
      });
      const result = await service.listVendors(BIZ_ID, {});
      expect(result.records).toHaveLength(1);
      expect(result.records[0]).toHaveProperty('contact_email');
    });

    it('returns lightweight records when for_select=true', async () => {
      const { service } = await buildService({
        vendorRepo: { find: jest.fn().mockResolvedValue([makeVendor()]) },
      });
      const result = await service.listVendors(BIZ_ID, { for_select: true });
      expect(result.records[0]).toHaveProperty('id');
      expect(result.records[0]).toHaveProperty('name');
      expect(result.records[0]).toHaveProperty('code');
      expect(result.records[0]).not.toHaveProperty('contact_email');
    });
  });

  describe('getVendor [INV-011]', () => {
    it('returns vendor detail', async () => {
      const { service } = await buildService({
        vendorRepo: { findOne: jest.fn().mockResolvedValue(makeVendor()) },
      });
      const result = await service.getVendor(VENDOR_ID, BIZ_ID);
      expect(result.id).toBe(VENDOR_ID);
    });

    it('throws 404 for vendor in another business', async () => {
      const { service } = await buildService({
        vendorRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(service.getVendor(VENDOR_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  describe('createVendor [INV-012]', () => {
    it('creates and returns the vendor', async () => {
      const { service, vendorRepo } = await buildService({
        vendorRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await service.createVendor(BIZ_ID, { name: 'Vendor X', code: 'VX-01' });
      expect(vendorRepo.save).toHaveBeenCalled();
    });

    it('throws 409 when code already exists for this business', async () => {
      const { service } = await buildService({
        vendorRepo: { findOne: jest.fn().mockResolvedValue(makeVendor()) },
      });
      await expect(
        service.createVendor(BIZ_ID, { name: 'Dup', code: 'VEND-01' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateVendor [INV-013]', () => {
    it('updates and returns the vendor', async () => {
      const vendor = makeVendor();
      const { service, vendorRepo } = await buildService({
        vendorRepo: {
          findOne: jest.fn().mockResolvedValue(vendor),
          save: jest.fn((e: any) => Promise.resolve(e)),
        },
      });
      await service.updateVendor(VENDOR_ID, BIZ_ID, { name: 'Updated Vendor' });
      expect(vendorRepo.save).toHaveBeenCalled();
    });
  });

  describe('deleteVendor [INV-014]', () => {
    it('soft-deletes by setting is_active=false', async () => {
      const vendor = makeVendor({ is_active: true });
      const { service, vendorRepo } = await buildService({
        vendorRepo: {
          findOne: jest.fn().mockResolvedValue(vendor),
          save: jest.fn((e: any) => Promise.resolve(e)),
        },
      });
      await service.deleteVendor(VENDOR_ID, BIZ_ID);
      expect(vendor.is_active).toBe(false);
      expect(vendorRepo.save).toHaveBeenCalled();
    });

    it('throws 404 for vendor in another business', async () => {
      const { service } = await buildService({
        vendorRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(service.deleteVendor(VENDOR_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  // ── Vendor Check Details ──────────────────────────────────────────────────

  describe('listVendorCheckDetails [INV-015]', () => {
    it('returns check details for a vendor in the same business', async () => {
      const { service } = await buildService({
        vendorRepo: { findOne: jest.fn().mockResolvedValue(makeVendor()) },
        checkDetailRepo: {
          find: jest.fn().mockResolvedValue([{
            id: 'cd-1', vendor_id: VENDOR_ID, check_date: '2026-01-01',
            quality_score: 8, delivery_score: 9, price_score: 7,
          }]),
        },
      });
      const result = await service.listVendorCheckDetails(VENDOR_ID, BIZ_ID);
      expect(result.records).toHaveLength(1);
    });

    it('throws 404 for vendor in another business', async () => {
      const { service } = await buildService({
        vendorRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        service.listVendorCheckDetails(VENDOR_ID, OTHER_BIZ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('createVendorCheckDetail [INV-015]', () => {
    it('creates a check detail record for a vendor', async () => {
      const { service, checkDetailRepo } = await buildService({
        vendorRepo: { findOne: jest.fn().mockResolvedValue(makeVendor()) },
      });
      await service.createVendorCheckDetail(VENDOR_ID, BIZ_ID, {
        check_date: '2026-05-01',
        checked_by_user_id: 'user-1',
        quality_score: 9,
        delivery_score: 8,
        price_score: 7,
      });
      expect(checkDetailRepo.save).toHaveBeenCalled();
    });
  });

  // ── Brands ────────────────────────────────────────────────────────────────

  describe('listBrands [INV-020]', () => {
    it('returns brands for the business', async () => {
      const { service } = await buildService({
        brandRepo: { find: jest.fn().mockResolvedValue([makeBrand()]) },
      });
      const result = await service.listBrands(BIZ_ID);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].name).toBe('Danone');
    });
  });

  describe('createBrand [INV-021]', () => {
    it('creates and returns a brand', async () => {
      const { service, brandRepo } = await buildService({
        brandRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await service.createBrand(BIZ_ID, { name: 'Nestlé' });
      expect(brandRepo.save).toHaveBeenCalled();
    });

    it('throws 409 when name already exists for this business', async () => {
      const { service } = await buildService({
        brandRepo: { findOne: jest.fn().mockResolvedValue(makeBrand()) },
      });
      await expect(
        service.createBrand(BIZ_ID, { name: 'Danone' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateBrand [INV-022]', () => {
    it('updates a brand', async () => {
      const brand = makeBrand();
      const { service, brandRepo } = await buildService({
        brandRepo: {
          findOne: jest.fn().mockResolvedValue(brand),
          save: jest.fn((e: any) => Promise.resolve(e)),
        },
      });
      await service.updateBrand(BRAND_ID, BIZ_ID, { name: 'Danone SA' });
      expect(brandRepo.save).toHaveBeenCalled();
    });

    it('throws 404 for brand in another business', async () => {
      const { service } = await buildService({
        brandRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        service.updateBrand(BRAND_ID, OTHER_BIZ, { name: 'X' }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteBrand [INV-023]', () => {
    it('soft-deletes by setting is_active=false', async () => {
      const brand = makeBrand({ is_active: true });
      const { service, brandRepo } = await buildService({
        brandRepo: {
          findOne: jest.fn().mockResolvedValue(brand),
          save: jest.fn((e: any) => Promise.resolve(e)),
        },
      });
      await service.deleteBrand(BRAND_ID, BIZ_ID);
      expect(brand.is_active).toBe(false);
      expect(brandRepo.save).toHaveBeenCalled();
    });

    it('throws 404 for brand in another business', async () => {
      const { service } = await buildService({
        brandRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        service.deleteBrand(BRAND_ID, OTHER_BIZ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  // ── Nutrition Info ────────────────────────────────────────────────────────

  describe('getNutritionInfo [INV-030]', () => {
    it('returns nutrition info for a product', async () => {
      const ni = makeNutritionInfo();
      const { service } = await buildService({
        productRepo: {
          findOne: jest.fn().mockResolvedValue({ id: PRODUCT_ID, business_id: BIZ_ID }),
        },
        nutritionRepo: { findOne: jest.fn().mockResolvedValue(ni) },
      });
      const result = await service.getNutritionInfo(PRODUCT_ID, BIZ_ID);
      expect(result.calories_kcal).toBe(250);
    });

    it('throws 404 if no nutrition info exists for the product', async () => {
      const { service } = await buildService({
        productRepo: {
          findOne: jest.fn().mockResolvedValue({ id: PRODUCT_ID, business_id: BIZ_ID }),
        },
        nutritionRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        service.getNutritionInfo(PRODUCT_ID, BIZ_ID),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 404 if product belongs to another business', async () => {
      const { service } = await buildService({
        productRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        service.getNutritionInfo(PRODUCT_ID, OTHER_BIZ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('setNutritionInfo [INV-031]', () => {
    it('creates nutrition info when none exists (upsert)', async () => {
      const { service, nutritionRepo } = await buildService({
        productRepo: {
          findOne: jest.fn().mockResolvedValue({ id: PRODUCT_ID, business_id: BIZ_ID }),
        },
        nutritionRepo: {
          findOne: jest.fn().mockResolvedValue(null),
          create: jest.fn((d: any) => ({ ...d })),
          save: jest.fn((e: any) => Promise.resolve({ id: 'ni-new', ...e })),
        },
      });
      const result = await service.setNutritionInfo(PRODUCT_ID, BIZ_ID, {
        calories_kcal: 300, serving_size_g: 100,
      });
      expect(nutritionRepo.save).toHaveBeenCalled();
    });

    it('updates nutrition info when it already exists (upsert)', async () => {
      const existing = makeNutritionInfo();
      const { service, nutritionRepo } = await buildService({
        productRepo: {
          findOne: jest.fn().mockResolvedValue({ id: PRODUCT_ID, business_id: BIZ_ID }),
        },
        nutritionRepo: {
          findOne: jest.fn().mockResolvedValue(existing),
          save: jest.fn((e: any) => Promise.resolve(e)),
        },
      });
      await service.setNutritionInfo(PRODUCT_ID, BIZ_ID, { calories_kcal: 400 });
      expect(nutritionRepo.save).toHaveBeenCalled();
      expect(existing.calories_kcal).toBe(400);
    });

    it('throws 404 if product belongs to another business', async () => {
      const { service } = await buildService({
        productRepo: { findOne: jest.fn().mockResolvedValue(null) },
      });
      await expect(
        service.setNutritionInfo(PRODUCT_ID, OTHER_BIZ, { calories_kcal: 300 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('listNutritionInfo [INV-032]', () => {
    it('returns all products that have nutrition info', async () => {
      const ni = makeNutritionInfo();
      const { service } = await buildService({
        nutritionRepo: {
          createQueryBuilder: jest.fn().mockReturnValue(makeQb([ni], 1)),
        },
      });
      const result = await service.listNutritionInfo(BIZ_ID, {});
      expect(result.records).toHaveLength(1);
    });

    it('filters by allergen_excludes (comma-separated)', async () => {
      const { service, nutritionRepo } = await buildService();
      await service.listNutritionInfo(BIZ_ID, { allergen_excludes: 'gluten,dairy' });
      expect(nutritionRepo.createQueryBuilder).toHaveBeenCalled();
    });

    it('filters by is_halal=true', async () => {
      const { service, nutritionRepo } = await buildService();
      await service.listNutritionInfo(BIZ_ID, { is_halal: true });
      expect(nutritionRepo.createQueryBuilder).toHaveBeenCalled();
    });
  });
});
