import {
  Injectable, NotFoundException, ConflictException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { UnitOfMeasure } from '../../common/entities/unit-of-measure.entity';
import { Warehouse } from '../../common/entities/warehouse.entity';
import { Vendor } from '../../common/entities/vendor.entity';
import { VendorCheckDetail } from '../../common/entities/vendor-check-detail.entity';
import { Brand } from '../../common/entities/brand.entity';
import { NutritionInfo } from '../../common/entities/nutrition-info.entity';
import { Product } from '../../common/entities/product.entity';
import {
  CreateUnitOfMeasureDto, UpdateUnitOfMeasureDto,
  CreateWarehouseDto, UpdateWarehouseDto,
  ListVendorsQueryDto, CreateVendorDto, UpdateVendorDto,
  CreateVendorCheckDetailDto,
  CreateBrandDto, UpdateBrandDto,
  SetNutritionInfoDto, ListNutritionQueryDto,
} from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(UnitOfMeasure) private uomRepo: Repository<UnitOfMeasure>,
    @InjectRepository(Warehouse) private warehouseRepo: Repository<Warehouse>,
    @InjectRepository(Vendor) private vendorRepo: Repository<Vendor>,
    @InjectRepository(VendorCheckDetail) private checkDetailRepo: Repository<VendorCheckDetail>,
    @InjectRepository(Brand) private brandRepo: Repository<Brand>,
    @InjectRepository(NutritionInfo) private nutritionRepo: Repository<NutritionInfo>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
  ) {}

  // ── Units of Measure ─────────────────────────────────────────────────────

  async listUnitsOfMeasure(businessId: string) {
    const records = await this.uomRepo.find({
      where: [
        { business_id: businessId, is_active: true },
        { business_id: IsNull(), is_system: true },
      ],
      order: { sort_order: 'ASC', name: 'ASC' },
    });
    return { records };
  }

  async createUnitOfMeasure(businessId: string, dto: CreateUnitOfMeasureDto) {
    const entity = this.uomRepo.create({
      business_id: businessId,
      name: dto.name,
      abbreviation: dto.abbreviation,
      sort_order: dto.sort_order ?? 0,
      is_system: false,
    });
    return this.uomRepo.save(entity);
  }

  async updateUnitOfMeasure(id: string, businessId: string, dto: UpdateUnitOfMeasureDto) {
    const uom = await this.uomRepo.findOne({ where: { id, business_id: businessId } });
    if (!uom) throw new NotFoundException({ error: 'INV_UOM_NOT_FOUND', message: 'Unit of measure not found' });
    Object.assign(uom, dto);
    return this.uomRepo.save(uom);
  }

  async deleteUnitOfMeasure(id: string, businessId: string) {
    const uom = await this.uomRepo.findOne({ where: { id, business_id: businessId } });
    if (!uom) throw new NotFoundException({ error: 'INV_UOM_NOT_FOUND', message: 'Unit of measure not found' });
    if (uom.is_system) {
      throw new UnprocessableEntityException({ error: 'INV_UOM_SYSTEM_DELETE', message: 'System units cannot be deleted' });
    }
    const referencedCount = await this.productRepo.count({ where: { unit_of_measure_id: id } });
    if (referencedCount > 0) {
      throw new UnprocessableEntityException({ error: 'INV_UOM_IN_USE', message: 'Unit is in use by one or more products' });
    }
    uom.is_active = false;
    return this.uomRepo.save(uom);
  }

  // ── Warehouses ────────────────────────────────────────────────────────────

  async listWarehouses(businessId: string) {
    const records = await this.warehouseRepo.find({
      where: { business_id: businessId },
      order: { name: 'ASC' },
    });
    return { records };
  }

  async getWarehouse(id: string, businessId: string) {
    const wh = await this.warehouseRepo.findOne({ where: { id, business_id: businessId } });
    if (!wh) throw new NotFoundException({ error: 'INV_WAREHOUSE_NOT_FOUND', message: 'Warehouse not found' });
    return wh;
  }

  async createWarehouse(businessId: string, dto: CreateWarehouseDto) {
    const existing = await this.warehouseRepo.findOne({
      where: { business_id: businessId, code: dto.code },
    });
    if (existing) throw new ConflictException({ error: 'INV_WAREHOUSE_CODE_CONFLICT', message: 'Warehouse code already exists for this business' });
    const wh = this.warehouseRepo.create({ business_id: businessId, ...dto });
    return this.warehouseRepo.save(wh);
  }

  async updateWarehouse(id: string, businessId: string, dto: UpdateWarehouseDto) {
    const wh = await this.warehouseRepo.findOne({ where: { id, business_id: businessId } });
    if (!wh) throw new NotFoundException({ error: 'INV_WAREHOUSE_NOT_FOUND', message: 'Warehouse not found' });
    Object.assign(wh, dto);
    return this.warehouseRepo.save(wh);
  }

  async deleteWarehouse(id: string, businessId: string) {
    const wh = await this.warehouseRepo.findOne({ where: { id, business_id: businessId } });
    if (!wh) throw new NotFoundException({ error: 'INV_WAREHOUSE_NOT_FOUND', message: 'Warehouse not found' });
    wh.is_active = false;
    return this.warehouseRepo.save(wh);
  }

  // ── Vendors ───────────────────────────────────────────────────────────────

  async listVendors(businessId: string, query: ListVendorsQueryDto) {
    const vendors = await this.vendorRepo.find({
      where: { business_id: businessId },
      order: { name: 'ASC' },
    });

    if (query.for_select) {
      return { records: vendors.map(v => ({ id: v.id, name: v.name, code: v.code })) };
    }
    return { records: vendors };
  }

  async getVendor(id: string, businessId: string) {
    const vendor = await this.vendorRepo.findOne({ where: { id, business_id: businessId } });
    if (!vendor) throw new NotFoundException({ error: 'INV_VENDOR_NOT_FOUND', message: 'Vendor not found' });
    return vendor;
  }

  async createVendor(businessId: string, dto: CreateVendorDto) {
    const existing = await this.vendorRepo.findOne({
      where: { business_id: businessId, code: dto.code },
    });
    if (existing) throw new ConflictException({ error: 'INV_VENDOR_CODE_CONFLICT', message: 'Vendor code already exists for this business' });
    const vendor = this.vendorRepo.create({ business_id: businessId, ...dto });
    return this.vendorRepo.save(vendor);
  }

  async updateVendor(id: string, businessId: string, dto: UpdateVendorDto) {
    const vendor = await this.vendorRepo.findOne({ where: { id, business_id: businessId } });
    if (!vendor) throw new NotFoundException({ error: 'INV_VENDOR_NOT_FOUND', message: 'Vendor not found' });
    Object.assign(vendor, dto);
    return this.vendorRepo.save(vendor);
  }

  async deleteVendor(id: string, businessId: string) {
    const vendor = await this.vendorRepo.findOne({ where: { id, business_id: businessId } });
    if (!vendor) throw new NotFoundException({ error: 'INV_VENDOR_NOT_FOUND', message: 'Vendor not found' });
    vendor.is_active = false;
    return this.vendorRepo.save(vendor);
  }

  // ── Vendor Check Details ──────────────────────────────────────────────────

  async listVendorCheckDetails(vendorId: string, businessId: string) {
    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId, business_id: businessId } });
    if (!vendor) throw new NotFoundException({ error: 'INV_VENDOR_NOT_FOUND', message: 'Vendor not found' });
    const records = await this.checkDetailRepo.find({
      where: { vendor_id: vendorId, business_id: businessId },
      order: { check_date: 'DESC' },
    });
    return { records };
  }

  async createVendorCheckDetail(vendorId: string, businessId: string, dto: CreateVendorCheckDetailDto) {
    const vendor = await this.vendorRepo.findOne({ where: { id: vendorId, business_id: businessId } });
    if (!vendor) throw new NotFoundException({ error: 'INV_VENDOR_NOT_FOUND', message: 'Vendor not found' });
    const detail = this.checkDetailRepo.create({
      business_id: businessId,
      vendor_id: vendorId,
      ...dto,
    });
    return this.checkDetailRepo.save(detail);
  }

  // ── Brands ────────────────────────────────────────────────────────────────

  async listBrands(businessId: string) {
    const records = await this.brandRepo.find({
      where: { business_id: businessId },
      order: { name: 'ASC' },
    });
    return { records };
  }

  async createBrand(businessId: string, dto: CreateBrandDto) {
    const existing = await this.brandRepo.findOne({
      where: { business_id: businessId, name: dto.name },
    });
    if (existing) throw new ConflictException({ error: 'INV_BRAND_NAME_CONFLICT', message: 'Brand name already exists for this business' });
    const brand = this.brandRepo.create({ business_id: businessId, ...dto });
    return this.brandRepo.save(brand);
  }

  async updateBrand(id: string, businessId: string, dto: UpdateBrandDto) {
    const brand = await this.brandRepo.findOne({ where: { id, business_id: businessId } });
    if (!brand) throw new NotFoundException({ error: 'INV_BRAND_NOT_FOUND', message: 'Brand not found' });
    Object.assign(brand, dto);
    return this.brandRepo.save(brand);
  }

  async deleteBrand(id: string, businessId: string) {
    const brand = await this.brandRepo.findOne({ where: { id, business_id: businessId } });
    if (!brand) throw new NotFoundException({ error: 'INV_BRAND_NOT_FOUND', message: 'Brand not found' });
    brand.is_active = false;
    return this.brandRepo.save(brand);
  }

  // ── Nutrition Info ────────────────────────────────────────────────────────

  private async resolveProduct(productId: string, businessId: string): Promise<Product> {
    const product = await this.productRepo.findOne({ where: { id: productId, business_id: businessId } });
    if (!product) throw new NotFoundException({ error: 'INV_PRODUCT_NOT_FOUND', message: 'Product not found' });
    return product;
  }

  async getNutritionInfo(productId: string, businessId: string) {
    await this.resolveProduct(productId, businessId);
    const ni = await this.nutritionRepo.findOne({ where: { product_id: productId } });
    if (!ni) throw new NotFoundException({ error: 'INV_NUTRITION_NOT_FOUND', message: 'No nutrition info for this product' });
    return ni;
  }

  async setNutritionInfo(productId: string, businessId: string, dto: SetNutritionInfoDto) {
    await this.resolveProduct(productId, businessId);
    const existing = await this.nutritionRepo.findOne({ where: { product_id: productId } });
    if (existing) {
      Object.assign(existing, dto);
      return this.nutritionRepo.save(existing);
    }
    const ni = this.nutritionRepo.create({ business_id: businessId, product_id: productId, ...dto });
    return this.nutritionRepo.save(ni);
  }

  async listNutritionInfo(businessId: string, query: ListNutritionQueryDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;

    const qb = this.nutritionRepo
      .createQueryBuilder('ni')
      .where('ni.business_id = :businessId', { businessId })
      .orderBy('ni.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (query.allergen_excludes) {
      const allergens = query.allergen_excludes.split(',').map(a => a.trim()).filter(Boolean);
      for (const allergen of allergens) {
        qb.andWhere('ni.allergens NOT LIKE :allergen', { allergen: `%${allergen}%` });
      }
    }

    if (query.is_vegan !== undefined) {
      qb.andWhere('ni.is_vegan = :is_vegan', { is_vegan: query.is_vegan });
    }

    if (query.is_halal !== undefined) {
      qb.andWhere('ni.is_halal = :is_halal', { is_halal: query.is_halal });
    }

    const [records, total] = await qb.getManyAndCount();
    return { records, total, page, limit };
  }
}
