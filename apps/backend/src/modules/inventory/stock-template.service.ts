import {
  Injectable, NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { StockTemplate } from '../../common/entities/stock-template.entity';
import { StockTemplateItem } from '../../common/entities/stock-template-item.entity';
import { PurchaseOrder } from '../../common/entities/purchase-order.entity';
import { PurchaseOrderItem } from '../../common/entities/purchase-order-item.entity';
import {
  CreateStockTemplateDto,
  UpdateStockTemplateDto,
  GeneratePurchaseOrderDto,
} from './dto/stock-engine.dto';

@Injectable()
export class StockTemplateService {
  constructor(
    @InjectRepository(StockTemplate) private templateRepo: Repository<StockTemplate>,
    @InjectRepository(StockTemplateItem) private itemRepo: Repository<StockTemplateItem>,
    @InjectRepository(PurchaseOrder) private poRepo: Repository<PurchaseOrder>,
    @InjectRepository(PurchaseOrderItem) private poItemRepo: Repository<PurchaseOrderItem>,
    private dataSource: DataSource,
  ) {}

  // ── INV-060: List Templates ─────────────────────────────────────────────────

  async listTemplates(businessId: string) {
    const records = await this.templateRepo.find({
      where: { business_id: businessId },
      relations: ['items'],
      order: { created_at: 'DESC' },
    });
    return { records };
  }

  // ── INV-061: Get Single Template ────────────────────────────────────────────

  async getTemplate(id: string, businessId: string) {
    const template = await this.templateRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items'],
    });
    if (!template) throw new NotFoundException('Template not found');
    return template;
  }

  // ── INV-062: Create Template ────────────────────────────────────────────────

  async createTemplate(businessId: string, dto: CreateStockTemplateDto) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const template = qr.manager.create(StockTemplate, {
        business_id: businessId,
        name: dto.name,
        default_vendor_id: dto.default_vendor_id ?? null,
        default_warehouse_id: dto.default_warehouse_id ?? null,
      });
      const savedTemplate = await qr.manager.save(StockTemplate, template);

      if (dto.items && dto.items.length > 0) {
        const items = dto.items.map((item) =>
          qr.manager.create(StockTemplateItem, {
            template_id: savedTemplate.id,
            product_id: item.product_id,
            variant_id: item.variant_id ?? null,
            default_quantity: item.default_quantity,
          }),
        );
        await qr.manager.save(StockTemplateItem, items);
      }

      await qr.commitTransaction();

      return this.templateRepo.findOne({
        where: { id: savedTemplate.id },
        relations: ['items'],
      });
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }

  // ── INV-063: Update Template ────────────────────────────────────────────────

  async updateTemplate(id: string, businessId: string, dto: UpdateStockTemplateDto) {
    const template = await this.templateRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items'],
    });
    if (!template) throw new NotFoundException('Template not found');

    if (dto.name !== undefined) template.name = dto.name;
    if (dto.default_vendor_id !== undefined) template.default_vendor_id = dto.default_vendor_id ?? null;
    if (dto.default_warehouse_id !== undefined) template.default_warehouse_id = dto.default_warehouse_id ?? null;
    if (dto.is_active !== undefined) template.is_active = dto.is_active;

    if (dto.items !== undefined) {
      // Replace-set: delete old items and insert new ones
      const qr = this.dataSource.createQueryRunner();
      await qr.connect();
      await qr.startTransaction();

      try {
        await qr.manager.save(StockTemplate, template);

        if (template.items && template.items.length > 0) {
          await qr.manager.remove(StockTemplateItem, template.items);
        }

        if (dto.items.length > 0) {
          const newItems = dto.items.map((item) =>
            qr.manager.create(StockTemplateItem, {
              template_id: id,
              product_id: item.product_id,
              variant_id: item.variant_id ?? null,
              default_quantity: item.default_quantity,
            }),
          );
          await qr.manager.save(StockTemplateItem, newItems);
        }

        await qr.commitTransaction();
      } catch (err) {
        await qr.rollbackTransaction();
        throw err;
      } finally {
        await qr.release();
      }
    } else {
      await this.templateRepo.save(template);
    }

    return this.templateRepo.findOne({ where: { id }, relations: ['items'] });
  }

  // ── INV-064: Delete Template ────────────────────────────────────────────────

  async deleteTemplate(id: string, businessId: string) {
    const template = await this.templateRepo.findOne({
      where: { id, business_id: businessId },
    });
    if (!template) throw new NotFoundException('Template not found');
    await this.templateRepo.remove(template);
  }

  // ── INV-065: Generate PO from Template ─────────────────────────────────────

  async generatePurchaseOrder(
    id: string,
    businessId: string,
    userId: string,
    dto: GeneratePurchaseOrderDto,
  ) {
    const template = await this.templateRepo.findOne({
      where: { id, business_id: businessId },
      relations: ['items'],
    });
    if (!template) throw new NotFoundException('Template not found');

    // Resolve warehouse: dto.warehouse_id > template.default_warehouse_id
    const warehouseId = dto.warehouse_id ?? template.default_warehouse_id;
    const vendorId = dto.vendor_id ?? template.default_vendor_id ?? null;

    // Generate PO number: PO-YYYY-NNNN
    const year = new Date().getFullYear();
    const [countResult] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS cnt FROM purchase_orders WHERE business_id = $1 AND EXTRACT(YEAR FROM order_date) = $2`,
      [businessId, year],
    );
    const count: number = countResult.cnt ?? 0;
    const poNumber = `PO-${year}-${String(count + 1).padStart(4, '0')}`;

    const qr = this.dataSource.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      const po = qr.manager.create(PurchaseOrder, {
        business_id: businessId,
        po_number: poNumber,
        vendor_id: vendorId ?? undefined,
        warehouse_id: warehouseId ?? undefined,
        status: 'draft',
        expected_delivery_date: dto.expected_delivery_date ?? undefined,
        subtotal_ht: 0,
        total_tva: 0,
        total_ttc: 0,
        created_by_user_id: userId,
      });
      const savedPo = await qr.manager.save(PurchaseOrder, po);

      if (template.items && template.items.length > 0) {
        const poItems = template.items.map((item) =>
          qr.manager.create(PurchaseOrderItem, {
            purchase_order_id: savedPo.id,
            product_id: item.product_id,
            variant_id: item.variant_id ?? null,
            quantity_ordered: item.default_quantity,
            quantity_received: 0,
            unit_of_measure: 'unit',
            unit_cost_ht: 0,
            tva_rate: 0,
            line_total_ht: 0,
            line_total_tva: 0,
            line_total_ttc: 0,
          }),
        );
        await qr.manager.save(PurchaseOrderItem, poItems);
      }

      await qr.commitTransaction();

      return this.poRepo.findOne({ where: { id: savedPo.id }, relations: ['items'] });
    } catch (err) {
      await qr.rollbackTransaction();
      throw err;
    } finally {
      await qr.release();
    }
  }
}
