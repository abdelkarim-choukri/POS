import {
  Injectable, NotFoundException, ConflictException,
  UnprocessableEntityException, BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerGrade } from '../../common/entities/customer-grade.entity';
import { CustomerLabel } from '../../common/entities/customer-label.entity';
import { CustomerLabelAssignment } from '../../common/entities/customer-label-assignment.entity';
import { CustomerAttribute } from '../../common/entities/customer-attribute.entity';
import { CustomerAttributeValue } from '../../common/entities/customer-attribute-value.entity';
import { CustomerPointsHistory } from '../../common/entities/customer-points-history.entity';
import { Transaction } from '../../common/entities/transaction.entity';
import {
  CreateCustomerDto, UpdateCustomerDto, ListCustomersQueryDto,
  CreateGradeDto, UpdateGradeDto,
  CreateLabelDto, UpdateLabelDto, AssignLabelsDto,
  CreateAttributeDto, UpdateAttributeDto, SetAttributeValuesDto,
  PointsHistoryQueryDto, PointsAdjustmentDto,
} from './dto/customer.dto';

@Injectable()
export class CustomerService {
  constructor(
    @InjectRepository(Customer) private customerRepo: Repository<Customer>,
    @InjectRepository(CustomerGrade) private gradeRepo: Repository<CustomerGrade>,
    @InjectRepository(CustomerLabel) private labelRepo: Repository<CustomerLabel>,
    @InjectRepository(CustomerLabelAssignment) private claRepo: Repository<CustomerLabelAssignment>,
    @InjectRepository(CustomerAttribute) private attrRepo: Repository<CustomerAttribute>,
    @InjectRepository(CustomerAttributeValue) private cavRepo: Repository<CustomerAttributeValue>,
    @InjectRepository(CustomerPointsHistory) private pointsHistoryRepo: Repository<CustomerPointsHistory>,
    @InjectRepository(Transaction) private transactionRepo: Repository<Transaction>,
    private dataSource: DataSource,
  ) {}

  // ── CUSTOMER CRUD ──────────────────────────────────────────────────────────

  async list(businessId: string, query: ListCustomersQueryDto) {
    const { page, limit, search, grade_id, label_ids, is_active,
            created_from, created_to, birthday_from, birthday_to,
            points_op, points_value } = query;

    const qb = this.customerRepo.createQueryBuilder('c')
      .leftJoinAndSelect('c.grade', 'grade')
      .leftJoinAndSelect('c.label_assignments', 'cla')
      .leftJoinAndSelect('cla.label', 'label')
      .where('c.business_id = :businessId', { businessId })
      .andWhere('c.is_active = :is_active', { is_active: is_active ?? true });

    if (search) {
      qb.andWhere(
        '(c.first_name ILIKE :s OR c.last_name ILIKE :s OR c.phone ILIKE :s OR c.email ILIKE :s OR c.customer_code ILIKE :s)',
        { s: `%${search}%` },
      );
    }

    if (grade_id) {
      qb.andWhere('c.grade_id = :grade_id', { grade_id });
    }

    // AND semantics: customer must have ALL specified labels
    if (label_ids) {
      const ids = label_ids.split(',').map((id) => id.trim()).filter(Boolean);
      for (let i = 0; i < ids.length; i++) {
        qb.andWhere(
          `EXISTS (SELECT 1 FROM customer_label_assignments cla${i} WHERE cla${i}.customer_id = c.id AND cla${i}.label_id = :lid${i})`,
          { [`lid${i}`]: ids[i] },
        );
      }
    }

    if (created_from) qb.andWhere('c.created_at >= :created_from', { created_from });
    if (created_to)   qb.andWhere('c.created_at <= :created_to',   { created_to });
    if (birthday_from) qb.andWhere('c.birthday >= :birthday_from', { birthday_from });
    if (birthday_to)   qb.andWhere('c.birthday <= :birthday_to',   { birthday_to });

    if (points_op && points_value !== undefined) {
      const opMap = { gt: '>', lt: '<', eq: '=' };
      qb.andWhere(`c.points_balance ${opMap[points_op]} :pv`, { pv: points_value });
    }

    qb.orderBy('c.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [records, total] = await qb.getManyAndCount();

    return { records, total, page, limit };
  }

  async getDetail(businessId: string, id: string) {
    const customer = await this.customerRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['grade', 'label_assignments', 'label_assignments.label', 'attribute_values', 'attribute_values.attribute'],
    });
    if (!customer) throw new NotFoundException('Customer not found');

    // Lifetime stats
    const stats = await this.transactionRepo
      .createQueryBuilder('t')
      .select([
        'COUNT(t.id)::int AS visit_count',
        'COALESCE(SUM(t.total_ttc), 0)::numeric AS total_spend',
        'MAX(t.created_at) AS last_visit',
      ])
      .where('t.customer_id = :id AND t.business_id = :businessId AND t.status = \'completed\'', { id, businessId })
      .getRawOne();

    return {
      ...customer,
      stats: {
        visit_count: Number(stats.visit_count),
        total_spend: Number(stats.total_spend),
        last_visit: stats.last_visit ?? null,
      },
    };
  }

  async create(businessId: string, dto: CreateCustomerDto) {
    // Phone uniqueness per business
    if (dto.phone) {
      const existing = await this.customerRepo.findOne({
        where: { business_id: businessId, phone: dto.phone },
      });
      if (existing) throw new ConflictException('Phone number already registered for this business');
    }

    // Atomic customer_counter increment → customer_code
    const counterRaw = await this.customerRepo.manager.query(
      `UPDATE businesses
       SET customer_counter = customer_counter + 1
       WHERE id = $1
       RETURNING customer_counter`,
      [businessId],
    );
    const counterRows = Array.isArray(counterRaw[0]) ? counterRaw[0] : counterRaw;
    const customerCode = `C-${String(counterRows[0].customer_counter).padStart(6, '0')}`;

    const customer = this.customerRepo.create({
      business_id: businessId,
      customer_code: customerCode,
      phone: dto.phone,
      email: dto.email,
      first_name: dto.first_name,
      last_name: dto.last_name,
      birthday: dto.birthday,
      gender: dto.gender,
      address: dto.address,
      grade_id: dto.grade_id,
      consent_marketing: dto.consent_marketing ?? false,
      notes: dto.notes,
    });
    const saved = await this.customerRepo.save(customer);

    // Assign labels if provided
    if (dto.label_ids?.length) {
      const assignments = dto.label_ids.map((label_id) =>
        this.claRepo.create({ customer_id: saved.id, label_id }),
      );
      await this.claRepo.save(assignments);
    }

    return this.customerRepo.findOne({
      where: { id: saved.id },
      relations: ['grade', 'label_assignments', 'label_assignments.label'],
    });
  }

  async update(businessId: string, id: string, dto: UpdateCustomerDto) {
    const customer = await this.customerRepo.findOne({ where: { id, business_id: businessId } });
    if (!customer) throw new NotFoundException('Customer not found');

    // Phone uniqueness check on change
    if (dto.phone && dto.phone !== customer.phone) {
      const existing = await this.customerRepo.findOne({
        where: { business_id: businessId, phone: dto.phone },
      });
      if (existing) throw new ConflictException('Phone number already registered for this business');
    }

    Object.assign(customer, dto);
    return this.customerRepo.save(customer);
  }

  async softDelete(businessId: string, id: string) {
    const customer = await this.customerRepo.findOne({ where: { id, business_id: businessId } });
    if (!customer) throw new NotFoundException('Customer not found');
    customer.is_active = false;
    await this.customerRepo.save(customer);
    return { success: true };
  }

  // ── GRADE CRUD ─────────────────────────────────────────────────────────────

  async listGrades(businessId: string) {
    return this.gradeRepo.find({
      where: { business_id: businessId },
      order: { sort_order: 'ASC', min_points: 'ASC' },
    });
  }

  async createGrade(businessId: string, dto: CreateGradeDto) {
    const grade = this.gradeRepo.create({ ...dto, business_id: businessId });
    return this.gradeRepo.save(grade);
  }

  async updateGrade(businessId: string, id: string, dto: UpdateGradeDto) {
    const grade = await this.gradeRepo.findOne({ where: { id, business_id: businessId } });
    if (!grade) throw new NotFoundException('Grade not found');
    Object.assign(grade, dto);
    return this.gradeRepo.save(grade);
  }

  async deleteGrade(businessId: string, id: string) {
    // Wrap in transaction: soft-delete + demotion must be atomic
    await this.dataSource.transaction(async (em) => {
      const grade = await em.findOne(CustomerGrade, { where: { id, business_id: businessId } });
      if (!grade) throw new NotFoundException('Grade not found');

      // Find the lowest remaining active grade (excluding the one being deleted)
      const fallback = await em.findOne(CustomerGrade, {
        where: { business_id: businessId, is_active: true },
        order: { min_points: 'ASC', sort_order: 'ASC' },
      });
      const fallbackId = (fallback && fallback.id !== id) ? fallback.id : null;

      // Demote all customers on this grade
      await em.createQueryBuilder()
        .update(Customer)
        .set({ grade_id: fallbackId as any })
        .where('grade_id = :id AND business_id = :businessId', { id, businessId })
        .execute();

      // Soft-delete the grade
      grade.is_active = false;
      await em.save(grade);
    });

    return { success: true };
  }

  // ── LABEL CRUD ─────────────────────────────────────────────────────────────

  async listLabels(businessId: string) {
    return this.labelRepo.find({
      where: { business_id: businessId, is_active: true },
      order: { name: 'ASC' },
    });
  }

  async createLabel(businessId: string, dto: CreateLabelDto) {
    const label = this.labelRepo.create({ ...dto, business_id: businessId });
    return this.labelRepo.save(label);
  }

  async updateLabel(businessId: string, id: string, dto: UpdateLabelDto) {
    const label = await this.labelRepo.findOne({ where: { id, business_id: businessId, is_active: true } });
    if (!label) throw new NotFoundException('Label not found');
    Object.assign(label, dto);
    return this.labelRepo.save(label);
  }

  async deleteLabel(businessId: string, id: string) {
    const label = await this.labelRepo.findOne({ where: { id, business_id: businessId, is_active: true } });
    if (!label) throw new NotFoundException('Label not found');
    // Cascade: remove all assignments, then soft-delete the label
    await this.claRepo.delete({ label_id: id });
    label.is_active = false;
    await this.labelRepo.save(label);
    return { success: true };
  }

  async assignLabels(businessId: string, customerId: string, dto: AssignLabelsDto) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId, business_id: businessId } });
    if (!customer) throw new NotFoundException('Customer not found');

    await this.dataSource.transaction(async (em) => {
      await em.delete(CustomerLabelAssignment, { customer_id: customerId });
      if (dto.label_ids.length > 0) {
        const assignments = dto.label_ids.map((label_id) =>
          em.create(CustomerLabelAssignment, { customer_id: customerId, label_id }),
        );
        await em.save(CustomerLabelAssignment, assignments);
      }
    });

    return this.customerRepo.findOne({
      where: { id: customerId },
      relations: ['label_assignments', 'label_assignments.label'],
    });
  }

  // ── ATTRIBUTE CRUD ─────────────────────────────────────────────────────────

  async listAttributes(businessId: string) {
    return this.attrRepo.find({
      where: { business_id: businessId },
      order: { key: 'ASC' },
    });
  }

  async createAttribute(businessId: string, dto: CreateAttributeDto) {
    const attr = this.attrRepo.create({ ...dto, business_id: businessId });
    return this.attrRepo.save(attr);
  }

  async updateAttribute(businessId: string, id: string, dto: UpdateAttributeDto) {
    const attr = await this.attrRepo.findOne({ where: { id, business_id: businessId } });
    if (!attr) throw new NotFoundException('Attribute not found');

    if (dto.data_type && dto.data_type !== attr.data_type) {
      const valueCount = await this.cavRepo.count({ where: { attribute_id: id } });
      if (valueCount > 0) {
        throw new UnprocessableEntityException(
          'Cannot change data_type once customers have values for this attribute. Create a new attribute instead.',
        );
      }
    }

    Object.assign(attr, dto);
    return this.attrRepo.save(attr);
  }

  async deleteAttribute(businessId: string, id: string) {
    const attr = await this.attrRepo.findOne({ where: { id, business_id: businessId } });
    if (!attr) throw new NotFoundException('Attribute not found');
    await this.cavRepo.delete({ attribute_id: id });
    await this.attrRepo.remove(attr);
    return { success: true };
  }

  async getCustomerAttributes(businessId: string, customerId: string) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId, business_id: businessId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const values = await this.cavRepo.find({
      where: { customer_id: customerId },
      relations: ['attribute'],
    });
    return values;
  }

  async setCustomerAttributes(businessId: string, customerId: string, dto: SetAttributeValuesDto) {
    const customer = await this.customerRepo.findOne({ where: { id: customerId, business_id: businessId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const attributes = await this.attrRepo.find({ where: { business_id: businessId } });
    const attrMap = new Map(attributes.map((a) => [a.key, a]));

    // Validate all values first — collect all errors before throwing
    const errors: Record<string, string> = {};
    for (const [key, value] of Object.entries(dto.values)) {
      const attr = attrMap.get(key);
      if (!attr) {
        errors[key] = `Unknown attribute key: ${key}`;
        continue;
      }
      const err = this.validateAttributeValue(attr.data_type, value, attr.enum_options);
      if (err) errors[key] = err;
    }

    // Check required attributes are present
    for (const attr of attributes) {
      if (attr.is_required && !(attr.key in dto.values)) {
        errors[attr.key] = `Required attribute missing`;
      }
    }

    if (Object.keys(errors).length > 0) {
      throw new BadRequestException({ message: 'Attribute validation failed', errors });
    }

    // Upsert values
    await this.dataSource.transaction(async (em) => {
      for (const [key, value] of Object.entries(dto.values)) {
        const attr = attrMap.get(key)!;
        const existing = await em.findOne(CustomerAttributeValue, {
          where: { customer_id: customerId, attribute_id: attr.id },
        });
        if (existing) {
          existing.value = value;
          await em.save(existing);
        } else {
          await em.save(em.create(CustomerAttributeValue, {
            customer_id: customerId,
            attribute_id: attr.id,
            value,
          }));
        }
      }
    });

    return this.getCustomerAttributes(businessId, customerId);
  }

  private validateAttributeValue(dataType: string, value: string, enumOptions: string[] | null): string | null {
    switch (dataType) {
      case 'number':
        return isNaN(Number(value)) ? 'Must be a valid number' : null;
      case 'date':
        return isNaN(Date.parse(value)) ? 'Must be a valid date' : null;
      case 'boolean':
        return value !== 'true' && value !== 'false' ? 'Must be "true" or "false"' : null;
      case 'enum':
        return enumOptions && !enumOptions.includes(value)
          ? `Must be one of: ${enumOptions.join(', ')}`
          : null;
      default:
        return null; // 'string' — any value is valid
    }
  }

  // ── POINTS MANAGEMENT ──────────────────────────────────────────────────────

  async getPointsHistory(businessId: string, customerId: string, query: PointsHistoryQueryDto) {
    const { page, limit, from_date, to_date, source } = query;

    const customer = await this.customerRepo.findOne({ where: { id: customerId, business_id: businessId } });
    if (!customer) throw new NotFoundException('Customer not found');

    const qb = this.pointsHistoryRepo.createQueryBuilder('ph')
      .where('ph.customer_id = :customerId AND ph.business_id = :businessId', { customerId, businessId })
      .orderBy('ph.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (from_date) qb.andWhere('ph.created_at >= :from_date', { from_date });
    if (to_date)   qb.andWhere('ph.created_at <= :to_date',   { to_date });
    if (source)    qb.andWhere('ph.source = :source',         { source });

    const [records, total] = await qb.getManyAndCount();
    return { records, total, page, limit };
  }

  async adjustPoints(businessId: string, customerId: string, dto: PointsAdjustmentDto, adjustedByUserId: string) {
    // Atomic update — returns no row if balance would go negative
    const rows = await this.customerRepo.manager.query(
      `UPDATE customers
       SET points_balance = points_balance + $1
       WHERE id = $2 AND business_id = $3 AND points_balance + $1 >= 0
       RETURNING points_balance`,
      [dto.delta, customerId, businessId],
    );

    const resultRows = Array.isArray(rows[0]) ? rows[0] : rows;

    if (!resultRows || resultRows.length === 0) {
      // Either customer not found or balance would go negative — distinguish:
      const exists = await this.customerRepo.findOne({ where: { id: customerId, business_id: businessId } });
      if (!exists) throw new NotFoundException('Customer not found');
      throw new UnprocessableEntityException('Adjustment would make points balance negative');
    }

    const newBalance: number = resultRows[0].points_balance;

    const entry = this.pointsHistoryRepo.create({
      business_id: businessId,
      customer_id: customerId,
      delta: dto.delta,
      balance_after: newBalance,
      source: 'manual_adjustment',
      adjusted_by_user_id: adjustedByUserId,
      reason: dto.reason,
    });
    await this.pointsHistoryRepo.save(entry);

    return { points_balance: newBalance, entry };
  }
}
