import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { ModifierGroup } from '../../common/entities/modifier-group.entity';
import { Modifier } from '../../common/entities/modifier.entity';
import { ProductModifierGroup } from '../../common/entities/product-modifier-group.entity';
import { User } from '../../common/entities/user.entity';
import { ClockEntry } from '../../common/entities/clock-entry.entity';
import { Location } from '../../common/entities/location.entity';
import { Terminal } from '../../common/entities/terminal.entity';
import { Transaction } from '../../common/entities/transaction.entity';
import { Refund } from '../../common/entities/refund.entity';
import { Void as VoidEntity } from '../../common/entities/void.entity';
import { UserRole, RefundMethod } from '../../common/enums';
import { PaginationDto, PaginatedResult } from '../../common/dto';
import {
  CreateCategoryDto, UpdateCategoryDto,
  CreateProductDto, UpdateProductDto, CreateVariantDto, UpdateVariantDto,
  CreateModifierGroupDto, UpdateModifierGroupDto, CreateModifierDto, LinkModifierGroupDto,
  CreateEmployeeDto, UpdateEmployeeDto,
  CreateLocationDto, UpdateLocationDto,
  ReportFilterDto, RefundDto,
} from './dto';

@Injectable()
export class BusinessService {
  constructor(
    @InjectRepository(Category) private categoryRepo: Repository<Category>,
    @InjectRepository(Product) private productRepo: Repository<Product>,
    @InjectRepository(ProductVariant) private variantRepo: Repository<ProductVariant>,
    @InjectRepository(ModifierGroup) private modGroupRepo: Repository<ModifierGroup>,
    @InjectRepository(Modifier) private modifierRepo: Repository<Modifier>,
    @InjectRepository(ProductModifierGroup) private pmgRepo: Repository<ProductModifierGroup>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(ClockEntry) private clockRepo: Repository<ClockEntry>,
    @InjectRepository(Location) private locationRepo: Repository<Location>,
    @InjectRepository(Terminal) private terminalRepo: Repository<Terminal>,
    @InjectRepository(Transaction) private transactionRepo: Repository<Transaction>,
    @InjectRepository(Refund) private refundRepo: Repository<Refund>,
    @InjectRepository(VoidEntity) private voidRepo: Repository<VoidEntity>,
  ) {}

  // ===== CATEGORIES =====

  async listCategories(businessId: string) {
    return this.categoryRepo.find({
      where: { business_id: businessId },
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async createCategory(businessId: string, dto: CreateCategoryDto) {
    const category = this.categoryRepo.create({ ...dto, business_id: businessId });
    return this.categoryRepo.save(category);
  }

  async updateCategory(businessId: string, id: string, dto: UpdateCategoryDto) {
    const cat = await this.categoryRepo.findOne({ where: { id, business_id: businessId } });
    if (!cat) throw new NotFoundException('Category not found');
    Object.assign(cat, dto);
    return this.categoryRepo.save(cat);
  }

  async deleteCategory(businessId: string, id: string) {
    const cat = await this.categoryRepo.findOne({ where: { id, business_id: businessId } });
    if (!cat) throw new NotFoundException('Category not found');
    cat.is_active = false;
    return this.categoryRepo.save(cat);
  }

  // ===== PRODUCTS =====

  async listProducts(businessId: string, categoryId?: string) {
    const where: any = { business_id: businessId };
    if (categoryId) where.category_id = categoryId;
    return this.productRepo.find({
      where,
      relations: ['category', 'variants', 'product_modifier_groups', 'product_modifier_groups.modifier_group'],
      order: { sort_order: 'ASC', name: 'ASC' },
    });
  }

  async createProduct(businessId: string, dto: CreateProductDto) {
    const product = this.productRepo.create({ ...dto, business_id: businessId });
    return this.productRepo.save(product);
  }

  async updateProduct(businessId: string, id: string, dto: UpdateProductDto) {
    const product = await this.productRepo.findOne({ where: { id, business_id: businessId } });
    if (!product) throw new NotFoundException('Product not found');
    Object.assign(product, dto);
    return this.productRepo.save(product);
  }

  async toggleSoldOut(businessId: string, id: string) {
    const product = await this.productRepo.findOne({ where: { id, business_id: businessId } });
    if (!product) throw new NotFoundException('Product not found');
    product.is_sold_out = !product.is_sold_out;
    return this.productRepo.save(product);
  }

  async deleteProduct(businessId: string, id: string) {
    const product = await this.productRepo.findOne({ where: { id, business_id: businessId } });
    if (!product) throw new NotFoundException('Product not found');
    product.is_active = false;
    return this.productRepo.save(product);
  }

  // Variants
  async listVariants(productId: string) {
    return this.variantRepo.find({ where: { product_id: productId }, order: { name: 'ASC' } });
  }

  async createVariant(productId: string, dto: CreateVariantDto) {
    const variant = this.variantRepo.create({ ...dto, product_id: productId });
    return this.variantRepo.save(variant);
  }

  async updateVariant(id: string, dto: UpdateVariantDto) {
    const variant = await this.variantRepo.findOne({ where: { id } });
    if (!variant) throw new NotFoundException('Variant not found');
    Object.assign(variant, dto);
    return this.variantRepo.save(variant);
  }

  // ===== MODIFIER GROUPS =====

  async listModifierGroups(businessId: string) {
    return this.modGroupRepo.find({
      where: { business_id: businessId },
      relations: ['modifiers'],
      order: { sort_order: 'ASC' },
    });
  }

  async createModifierGroup(businessId: string, dto: CreateModifierGroupDto) {
    const group = this.modGroupRepo.create({ ...dto, business_id: businessId });
    return this.modGroupRepo.save(group);
  }

  async updateModifierGroup(businessId: string, id: string, dto: UpdateModifierGroupDto) {
    const group = await this.modGroupRepo.findOne({ where: { id, business_id: businessId } });
    if (!group) throw new NotFoundException('Modifier group not found');
    Object.assign(group, dto);
    return this.modGroupRepo.save(group);
  }

  async addModifier(groupId: string, dto: CreateModifierDto) {
    const mod = this.modifierRepo.create({ ...dto, modifier_group_id: groupId });
    return this.modifierRepo.save(mod);
  }

  async linkModifierGroupToProduct(productId: string, dto: LinkModifierGroupDto) {
    const link = this.pmgRepo.create({ product_id: productId, modifier_group_id: dto.modifier_group_id });
    return this.pmgRepo.save(link);
  }

  // ===== EMPLOYEES =====

  async listEmployees(businessId: string) {
    return this.userRepo.find({
      where: { business_id: businessId },
      order: { created_at: 'DESC' },
      select: ['id', 'email', 'first_name', 'last_name', 'role', 'phone', 'is_active', 'can_void', 'can_refund', 'dashboard_access', 'created_at'],
    });
  }

  async createEmployee(businessId: string, dto: CreateEmployeeDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepo.create({
      business_id: businessId,
      email: dto.email,
      password_hash: passwordHash,
      pin: dto.pin,
      first_name: dto.first_name,
      last_name: dto.last_name,
      role: dto.role,
      phone: dto.phone,
      can_void: dto.can_void || false,
      can_refund: dto.can_refund || false,
      dashboard_access: dto.dashboard_access || false,
    });
    const saved = await this.userRepo.save(user);
    const { password_hash, ...result } = saved;
    return result;
  }

  async updateEmployee(businessId: string, id: string, dto: UpdateEmployeeDto) {
    const user = await this.userRepo.findOne({ where: { id, business_id: businessId } });
    if (!user) throw new NotFoundException('Employee not found');
    Object.assign(user, dto);
    const saved = await this.userRepo.save(user);
    const { password_hash, ...result } = saved;
    return result;
  }

  async updateEmployeeStatus(businessId: string, id: string, isActive: boolean) {
    const user = await this.userRepo.findOne({ where: { id, business_id: businessId } });
    if (!user) throw new NotFoundException('Employee not found');
    user.is_active = isActive;
    return this.userRepo.save(user);
  }

  async getClockHistory(employeeId: string) {
    return this.clockRepo.find({
      where: { user_id: employeeId },
      order: { clock_in: 'DESC' },
      take: 50,
    });
  }

  // ===== LOCATIONS =====

  async listLocations(businessId: string) {
    return this.locationRepo.find({
      where: { business_id: businessId },
      relations: ['terminals'],
      order: { name: 'ASC' },
    });
  }

  async createLocation(businessId: string, dto: CreateLocationDto) {
    const location = this.locationRepo.create({ ...dto, business_id: businessId });
    return this.locationRepo.save(location);
  }

  async updateLocation(businessId: string, id: string, dto: UpdateLocationDto) {
    const loc = await this.locationRepo.findOne({ where: { id, business_id: businessId } });
    if (!loc) throw new NotFoundException('Location not found');
    Object.assign(loc, dto);
    return this.locationRepo.save(loc);
  }

  async getLocationTerminals(businessId: string, locationId: string) {
    const loc = await this.locationRepo.findOne({ where: { id: locationId, business_id: businessId } });
    if (!loc) throw new NotFoundException('Location not found');
    return this.terminalRepo.find({ where: { location_id: locationId } });
  }

  // ===== REPORTS =====

  async getDailySales(businessId: string, filter: ReportFilterDto) {
    const qb = this.transactionRepo.createQueryBuilder('t')
      .select("DATE(t.created_at)", 'date')
      .addSelect('COUNT(*)', 'transaction_count')
      .addSelect('SUM(t.total)', 'total_revenue')
      .where('t.business_id = :businessId', { businessId })
      .andWhere("t.status = 'completed'");

    if (filter.start_date) qb.andWhere('t.created_at >= :start', { start: filter.start_date });
    if (filter.end_date) qb.andWhere('t.created_at <= :end', { end: filter.end_date });
    if (filter.location_id) qb.andWhere('t.location_id = :locId', { locId: filter.location_id });

    return qb.groupBy('date').orderBy('date', 'DESC').getRawMany();
  }

  async getRevenueByItem(businessId: string, filter: ReportFilterDto) {
    const qb = this.transactionRepo.createQueryBuilder('t')
      .innerJoin('t.items', 'ti')
      .select('ti.product_name', 'product_name')
      .addSelect('SUM(ti.quantity)', 'total_quantity')
      .addSelect('SUM(ti.line_total)', 'total_revenue')
      .where('t.business_id = :businessId', { businessId })
      .andWhere("t.status = 'completed'");

    if (filter.start_date) qb.andWhere('t.created_at >= :start', { start: filter.start_date });
    if (filter.end_date) qb.andWhere('t.created_at <= :end', { end: filter.end_date });
    if (filter.location_id) qb.andWhere('t.location_id = :locId', { locId: filter.location_id });

    return qb.groupBy('ti.product_name').orderBy('total_revenue', 'DESC').getRawMany();
  }

  async getPaymentMethodBreakdown(businessId: string, filter: ReportFilterDto) {
    const qb = this.transactionRepo.createQueryBuilder('t')
      .select('t.payment_method', 'payment_method')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(t.total)', 'total')
      .where('t.business_id = :businessId', { businessId })
      .andWhere("t.status = 'completed'");

    if (filter.start_date) qb.andWhere('t.created_at >= :start', { start: filter.start_date });
    if (filter.end_date) qb.andWhere('t.created_at <= :end', { end: filter.end_date });

    return qb.groupBy('t.payment_method').getRawMany();
  }

  async getTransactionHistory(businessId: string, pagination: PaginationDto, filter: ReportFilterDto) {
    const { page, limit } = pagination;
    const qb = this.transactionRepo.createQueryBuilder('t')
      .leftJoinAndSelect('t.items', 'ti')
      .leftJoinAndSelect('t.user', 'u')
      .where('t.business_id = :businessId', { businessId })
      .orderBy('t.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (filter.start_date) qb.andWhere('t.created_at >= :start', { start: filter.start_date });
    if (filter.end_date) qb.andWhere('t.created_at <= :end', { end: filter.end_date });
    if (filter.location_id) qb.andWhere('t.location_id = :locId', { locId: filter.location_id });

    const [data, total] = await qb.getManyAndCount();
    return new PaginatedResult(data, total, page, limit);
  }

  async getVoidsRefunds(businessId: string, filter: ReportFilterDto) {
    const voids = await this.voidRepo.createQueryBuilder('v')
      .innerJoin('v.transaction', 't')
      .addSelect(['t.transaction_number', 't.total', 't.created_at'])
      .where('t.business_id = :businessId', { businessId })
      .orderBy('v.voided_at', 'DESC')
      .getMany();

    const refunds = await this.refundRepo.createQueryBuilder('r')
      .innerJoin('r.transaction', 't')
      .addSelect(['t.transaction_number', 't.total', 't.created_at'])
      .where('t.business_id = :businessId', { businessId })
      .orderBy('r.refunded_at', 'DESC')
      .getMany();

    return { voids, refunds };
  }

  async getTransactionDetail(businessId: string, transactionId: string) {
    const txn = await this.transactionRepo.findOne({
      where: { id: transactionId, business_id: businessId },
      relations: ['items', 'user', 'void', 'refunds', 'location', 'terminal'],
    });
    if (!txn) throw new NotFoundException('Transaction not found');
    return txn;
  }

  async issueRefund(businessId: string, transactionId: string, userId: string, dto: RefundDto) {
    const txn = await this.transactionRepo.findOne({
      where: { id: transactionId, business_id: businessId },
    });
    if (!txn) throw new NotFoundException('Transaction not found');

    const refund = this.refundRepo.create({
      transaction_id: transactionId,
      refunded_by: userId,
      amount: dto.amount || txn.total,
      reason: dto.reason || 'Refund issued from dashboard',
      refund_method: (dto.refund_method as RefundMethod) || RefundMethod.CASH,
    });
    await this.refundRepo.save(refund);

    txn.status = dto.amount && dto.amount < Number(txn.total) ? 'partial_refund' as any : 'refunded' as any;
    await this.transactionRepo.save(txn);

    return refund;
  }

  async getClockReport(businessId: string, filter: ReportFilterDto) {
    const qb = this.clockRepo.createQueryBuilder('c')
      .innerJoin('c.user', 'u')
      .addSelect(['u.first_name', 'u.last_name', 'u.role'])
      .where('u.business_id = :businessId', { businessId })
      .orderBy('c.clock_in', 'DESC');

    if (filter.start_date) qb.andWhere('c.clock_in >= :start', { start: filter.start_date });
    if (filter.end_date) qb.andWhere('c.clock_in <= :end', { end: filter.end_date });

    return qb.getMany();
  }
}
