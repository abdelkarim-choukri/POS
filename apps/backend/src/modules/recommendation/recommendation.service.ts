import {
  Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { RecommendationTemplate } from '../../common/entities/recommendation-template.entity';
import { RecommendationTemplateItem } from '../../common/entities/recommendation-template-item.entity';
import {
  CreateTemplateDto, UpdateTemplateDto, SetTemplateItemsDto,
  TemplateQueryDto, ResolveTemplateQueryDto,
} from './dto/recommendation.dto';

@Injectable()
export class RecommendationService {
  constructor(
    @InjectRepository(RecommendationTemplate)
    private templateRepo: Repository<RecommendationTemplate>,
    @InjectRepository(RecommendationTemplateItem)
    private itemRepo: Repository<RecommendationTemplateItem>,
    private dataSource: DataSource,
  ) {}

  // ── REC-001 ───────────────────────────────────────────────────────────────
  async listTemplates(businessId: string, query: TemplateQueryDto) {
    const qb = this.templateRepo
      .createQueryBuilder('t')
      .where('t.business_id = :businessId', { businessId })
      .orderBy('t.display_order', 'ASC')
      .addOrderBy('t.created_at', 'ASC');

    if (query.template_type) qb.andWhere('t.template_type = :tt', { tt: query.template_type });
    if (query.is_active !== undefined) qb.andWhere('t.is_active = :ia', { ia: query.is_active });

    if (query.for_terminal_now) {
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dow = now.getDay() === 0 ? 7 : now.getDay();
      qb.andWhere('t.is_active = true')
        .andWhere(
          `(t.time_window_start IS NULL OR (t.time_window_start <= :time::time AND t.time_window_end >= :time::time))`,
          { time: timeStr },
        )
        .andWhere(
          `(t.applicable_days_of_week IS NULL OR cardinality(t.applicable_days_of_week) = 0 OR :dow = ANY(t.applicable_days_of_week))`,
          { dow },
        );
    }

    return qb.getMany();
  }

  // ── REC-002 ───────────────────────────────────────────────────────────────
  async createTemplate(businessId: string, dto: CreateTemplateDto) {
    const template = this.templateRepo.create({
      ...dto,
      business_id: businessId,
      min_recommendations: dto.min_recommendations ?? 3,
      max_recommendations: dto.max_recommendations ?? 10,
      is_active: dto.is_active ?? true,
      display_order: dto.display_order ?? 0,
    });
    return this.templateRepo.save(template);
  }

  // ── REC-003 ───────────────────────────────────────────────────────────────
  async updateTemplate(id: string, businessId: string, dto: UpdateTemplateDto) {
    const template = await this.templateRepo.findOne({ where: { id, business_id: businessId } });
    if (!template) throw new NotFoundException({ error: 'REC_TEMPLATE_NOT_FOUND', message: 'Recommendation template not found' });
    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  // ── REC-004 ───────────────────────────────────────────────────────────────
  async deleteTemplate(id: string, businessId: string) {
    const template = await this.templateRepo.findOne({ where: { id, business_id: businessId } });
    if (!template) throw new NotFoundException({ error: 'REC_TEMPLATE_NOT_FOUND', message: 'Recommendation template not found' });
    await this.templateRepo.remove(template);
    return { deleted: true };
  }

  // ── REC-005 ───────────────────────────────────────────────────────────────
  async setTemplateItems(id: string, businessId: string, dto: SetTemplateItemsDto) {
    const template = await this.templateRepo.findOne({ where: { id, business_id: businessId } });
    if (!template) throw new NotFoundException({ error: 'REC_TEMPLATE_NOT_FOUND', message: 'Recommendation template not found' });
    if (template.template_type !== 'manual') {
      throw new UnprocessableEntityException({
        error: 'REC_ITEMS_NOT_MANUAL',
        message: 'Items can only be set on manual templates',
      });
    }
    await this.itemRepo.delete({ template_id: id });
    if (!dto.items.length) return [];
    const items = dto.items.map((item, idx) =>
      this.itemRepo.create({
        template_id: id,
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        priority: item.priority ?? idx,
        is_active: item.is_active ?? true,
      }),
    );
    return this.itemRepo.save(items);
  }

  // ── REC-010 ───────────────────────────────────────────────────────────────
  async resolveTemplate(id: string, businessId: string, query: ResolveTemplateQueryDto) {
    const template = await this.templateRepo.findOne({ where: { id, business_id: businessId } });
    if (!template) throw new NotFoundException({ error: 'REC_TEMPLATE_NOT_FOUND', message: 'Recommendation template not found' });

    switch (template.template_type) {
      case 'top_seller':
        return this.resolveTopSellers(template, businessId);
      case 'high_margin':
        return this.resolveHighMargin(template, businessId);
      case 'time_of_day': {
        const timeStr = query.current_time
          ?? `${String(new Date().getHours()).padStart(2, '0')}:${String(new Date().getMinutes()).padStart(2, '0')}`;
        const dow = new Date().getDay() === 0 ? 7 : new Date().getDay();
        if (!this.isInTimeWindow(template, timeStr, dow)) {
          return { items: [], template_name: template.name, template_type: template.template_type };
        }
        return this.resolveManualItems(template, businessId);
      }
      case 'customer_grade_targeted': {
        if (!query.customer_id) {
          return { items: [], template_name: template.name, template_type: template.template_type };
        }
        const [customer] = await this.dataSource.query(
          `SELECT grade_id FROM customers WHERE id = $1 AND business_id = $2 LIMIT 1`,
          [query.customer_id, businessId],
        );
        if (!customer || !template.target_grade_ids?.includes(customer.grade_id)) {
          return { items: [], template_name: template.name, template_type: template.template_type };
        }
        return this.resolveManualItems(template, businessId);
      }
      default:
        return this.resolveManualItems(template, businessId);
    }
  }

  // ── REC-020 ───────────────────────────────────────────────────────────────
  async getFeaturedItems(businessId: string) {
    return this.dataSource.query(
      `SELECT rti.product_id, rti.variant_id, rti.priority,
              p.name, p.price, p.image_url,
              rt.name AS template_name, rt.display_order
       FROM recommendation_templates rt
       JOIN recommendation_template_items rti
         ON rti.template_id = rt.id AND rti.is_active = true
       JOIN products p ON p.id = rti.product_id
       WHERE rt.business_id = $1 AND rt.is_active = true AND p.business_id = $1
       ORDER BY rt.display_order ASC, rti.priority ASC`,
      [businessId],
    );
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private async resolveManualItems(template: RecommendationTemplate, businessId: string) {
    const tier = template.whole_price_tier;
    const extraCol = tier ? `, p.whole_price_${tier}` : '';
    const rows: any[] = await this.dataSource.query(
      `SELECT rti.product_id, rti.variant_id, rti.priority, p.name, p.price, p.image_url${extraCol}
       FROM recommendation_template_items rti
       JOIN products p ON p.id = rti.product_id
       WHERE rti.template_id = $1 AND rti.is_active = true AND p.business_id = $2
       ORDER BY rti.priority ASC`,
      [template.id, businessId],
    );
    const items = rows.map((r) => ({
      product_id: r.product_id,
      variant_id: r.variant_id ?? null,
      name: r.name,
      price: tier && r[`whole_price_${tier}`] != null
        ? parseFloat(r[`whole_price_${tier}`])
        : parseFloat(r.price),
      priority: r.priority,
      image_url: r.image_url ?? null,
    }));
    return { items, template_name: template.name, template_type: template.template_type };
  }

  private async resolveTopSellers(template: RecommendationTemplate, businessId: string) {
    const rows: any[] = await this.dataSource.query(
      `SELECT p.id AS product_id, NULL::uuid AS variant_id, p.name, p.price, p.image_url,
              COUNT(ti.id)::int AS sale_count
       FROM products p
       JOIN transaction_items ti ON ti.product_id = p.id
       JOIN transactions t ON t.id = ti.transaction_id
       WHERE p.business_id = $1 AND p.is_active = true
         AND t.business_id = $1
         AND t.created_at >= now() - INTERVAL '7 days'
       GROUP BY p.id
       ORDER BY sale_count DESC
       LIMIT $2`,
      [businessId, template.max_recommendations],
    );
    const items = rows.map((r, i) => ({
      product_id: r.product_id,
      variant_id: null,
      name: r.name,
      price: parseFloat(r.price),
      priority: i,
      image_url: r.image_url ?? null,
    }));
    return { items, template_name: template.name, template_type: template.template_type };
  }

  private async resolveHighMargin(template: RecommendationTemplate, businessId: string) {
    const rows: any[] = await this.dataSource.query(
      `SELECT p.id AS product_id, NULL::uuid AS variant_id, p.name, p.price, p.image_url
       FROM products p
       WHERE p.business_id = $1 AND p.is_active = true
         AND p.cost_price IS NOT NULL AND p.price > 0
       ORDER BY (p.price - p.cost_price) / p.price DESC
       LIMIT $2`,
      [businessId, template.max_recommendations],
    );
    const items = rows.map((r, i) => ({
      product_id: r.product_id,
      variant_id: null,
      name: r.name,
      price: parseFloat(r.price),
      priority: i,
      image_url: r.image_url ?? null,
    }));
    return { items, template_name: template.name, template_type: template.template_type };
  }

  private isInTimeWindow(template: RecommendationTemplate, currentTime: string, dow: number): boolean {
    const days = template.applicable_days_of_week;
    if (days && days.length > 0 && !days.includes(dow)) return false;
    if (template.time_window_start && template.time_window_end) {
      return currentTime >= template.time_window_start && currentTime <= template.time_window_end;
    }
    return true;
  }
}
