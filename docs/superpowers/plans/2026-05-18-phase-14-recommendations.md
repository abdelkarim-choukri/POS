# Phase 14 — Recommendations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement Module REC (Smart Recommendations) — template CRUD, terminal resolution, and featured-items list. ~13 new tests added on top of 575 existing.

**Architecture:** New `RecommendationModule` with two controllers (`business` + `terminal` routes), one service with 7 methods, 2 new entities stored in `src/common/entities/`, and a single migration that creates 2 tables and adds 4 price-tier columns to `products`.

**Tech Stack:** NestJS, TypeORM, PostgreSQL. No BullMQ (no background jobs needed). No new feature flags (module is gated by the existing `recommendations` feature flag row already seeded in `business_type_features`; service logic does NOT check this flag at runtime — the platform's existing feature-gate mechanism handles it).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `apps/backend/src/migrations/1714014000000-AddRecommendations.ts` | Migration: 2 tables + 4 product columns + 4 indexes |
| Create | `apps/backend/src/common/entities/recommendation-template.entity.ts` | `recommendation_templates` TypeORM entity |
| Create | `apps/backend/src/common/entities/recommendation-template-item.entity.ts` | `recommendation_template_items` TypeORM entity |
| Modify | `apps/backend/src/common/entities/product.entity.ts` | Add `whole_price_1`–`4` columns |
| Modify | `apps/backend/src/common/entities/index.ts` | Export 2 new entities |
| Create | `apps/backend/src/modules/recommendation/dto/recommendation.dto.ts` | All DTOs for REC |
| Create | `apps/backend/src/modules/recommendation/recommendation.service.ts` | 7 service methods (REC-001–020) |
| Create | `apps/backend/src/modules/recommendation/recommendation.service.spec.ts` | 13 unit tests |
| Create | `apps/backend/src/modules/recommendation/recommendation.controller.ts` | Business dashboard routes |
| Create | `apps/backend/src/modules/recommendation/recommendation-terminal.controller.ts` | Terminal route |
| Create | `apps/backend/src/modules/recommendation/recommendation.module.ts` | Module wiring |
| Modify | `apps/backend/src/app.module.ts` | Register `RecommendationModule` |
| Modify | `apps/backend/CLAUDE.md` | Update test count + phase status |
| Modify | `apps/backend/docs/IMPLEMENTATION_LOG.md` | Add Phase 14 done entry |

---

## Task 1: Migration `1714014000000-AddRecommendations`

**Files:**
- Create: `apps/backend/src/migrations/1714014000000-AddRecommendations.ts`

- [ ] **Step 1: Create the migration file**

```typescript
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRecommendations1714014000000 implements MigrationInterface {
  name = 'AddRecommendations1714014000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Whole-price tiers on products (REC-MOD-001)
    await queryRunner.query(`
      ALTER TABLE "products"
        ADD COLUMN "whole_price_1" NUMERIC(12,2) NULL,
        ADD COLUMN "whole_price_2" NUMERIC(12,2) NULL,
        ADD COLUMN "whole_price_3" NUMERIC(12,2) NULL,
        ADD COLUMN "whole_price_4" NUMERIC(12,2) NULL
    `);

    // 2. Recommendation templates
    await queryRunner.query(`
      CREATE TABLE "recommendation_templates" (
        "id"                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "business_id"             UUID NOT NULL REFERENCES "businesses"("id") ON DELETE CASCADE,
        "name"                    VARCHAR(200) NOT NULL,
        "template_type"           VARCHAR(40) NOT NULL DEFAULT 'manual',
        "time_window_start"       TIME NULL,
        "time_window_end"         TIME NULL,
        "applicable_days_of_week" INT[] NULL,
        "target_grade_ids"        UUID[] NULL,
        "min_recommendations"     INT NOT NULL DEFAULT 3,
        "max_recommendations"     INT NOT NULL DEFAULT 10,
        "whole_price_tier"        INT NULL,
        "applicable_location_ids" UUID[] NULL,
        "is_active"               BOOLEAN NOT NULL DEFAULT true,
        "display_order"           INT NOT NULL DEFAULT 0,
        "created_at"              TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"              TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 3. Recommendation template items
    await queryRunner.query(`
      CREATE TABLE "recommendation_template_items" (
        "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "template_id" UUID NOT NULL REFERENCES "recommendation_templates"("id") ON DELETE CASCADE,
        "product_id"  UUID NOT NULL REFERENCES "products"("id"),
        "variant_id"  UUID NULL REFERENCES "product_variants"("id"),
        "priority"    INT NOT NULL DEFAULT 0,
        "is_active"   BOOLEAN NOT NULL DEFAULT true,
        "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);

    // 4. Indexes (§13.3 pattern)
    await queryRunner.query(
      `CREATE INDEX "idx_recommendation_templates_business_id"
       ON "recommendation_templates"("business_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_recommendation_templates_active"
       ON "recommendation_templates"("business_id", "is_active")
       WHERE "is_active" = true`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_recommendation_template_items_template_id"
       ON "recommendation_template_items"("template_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_recommendation_template_items_product_id"
       ON "recommendation_template_items"("product_id")`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "recommendation_template_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "recommendation_templates"`);
    await queryRunner.query(`
      ALTER TABLE "products"
        DROP COLUMN IF EXISTS "whole_price_1",
        DROP COLUMN IF EXISTS "whole_price_2",
        DROP COLUMN IF EXISTS "whole_price_3",
        DROP COLUMN IF EXISTS "whole_price_4"
    `);
  }
}
```

- [ ] **Step 2: Run migration to verify it applies cleanly**

```bash
docker compose exec backend npm run migration:run --workspace=apps/backend
```

Expected: migration `AddRecommendations1714014000000` applied, no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/migrations/1714014000000-AddRecommendations.ts
git commit -m "phase-14: migration AddRecommendations — 2 tables + whole_price cols (REC-MOD-001)"
```

---

## Task 2: Entities + Product update + Barrel

**Files:**
- Create: `apps/backend/src/common/entities/recommendation-template.entity.ts`
- Create: `apps/backend/src/common/entities/recommendation-template-item.entity.ts`
- Modify: `apps/backend/src/common/entities/product.entity.ts`
- Modify: `apps/backend/src/common/entities/index.ts`

- [ ] **Step 1: Create `recommendation-template.entity.ts`**

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany,
  JoinColumn, CreateDateColumn, UpdateDateColumn,
} from 'typeorm';
import { Business } from './business.entity';
import { RecommendationTemplateItem } from './recommendation-template-item.entity';

@Entity('recommendation_templates')
export class RecommendationTemplate {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  business_id: string;

  @ManyToOne(() => Business)
  @JoinColumn({ name: 'business_id' })
  business: Business;

  @Column({ type: 'varchar', length: 200 })
  name: string;

  @Column({ type: 'varchar', length: 40, default: 'manual' })
  template_type: string;

  @Column({ type: 'time', nullable: true })
  time_window_start: string | null;

  @Column({ type: 'time', nullable: true })
  time_window_end: string | null;

  @Column({ type: 'int', array: true, nullable: true })
  applicable_days_of_week: number[] | null;

  @Column({ type: 'uuid', array: true, nullable: true })
  target_grade_ids: string[] | null;

  @Column({ type: 'int', default: 3 })
  min_recommendations: number;

  @Column({ type: 'int', default: 10 })
  max_recommendations: number;

  @Column({ type: 'int', nullable: true })
  whole_price_tier: number | null;

  @Column({ type: 'uuid', array: true, nullable: true })
  applicable_location_ids: string[] | null;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @Column({ type: 'int', default: 0 })
  display_order: number;

  @OneToMany(() => RecommendationTemplateItem, (item) => item.template)
  items: RecommendationTemplateItem[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

- [ ] **Step 2: Create `recommendation-template-item.entity.ts`**

```typescript
import {
  Entity, PrimaryGeneratedColumn, Column, ManyToOne,
  JoinColumn, CreateDateColumn,
} from 'typeorm';
import { RecommendationTemplate } from './recommendation-template.entity';

@Entity('recommendation_template_items')
export class RecommendationTemplateItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  template_id: string;

  @ManyToOne(() => RecommendationTemplate, (t) => t.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'template_id' })
  template: RecommendationTemplate;

  @Column({ type: 'uuid' })
  product_id: string;

  @Column({ type: 'uuid', nullable: true })
  variant_id: string | null;

  @Column({ type: 'int', default: 0 })
  priority: number;

  @Column({ type: 'boolean', default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
```

- [ ] **Step 3: Add `whole_price_1`–`4` columns to `product.entity.ts`**

In `apps/backend/src/common/entities/product.entity.ts`, add these 4 columns after the `tva_exempt` column (around line 63):

```typescript
  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  whole_price_1: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  whole_price_2: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  whole_price_3: number | null;

  @Column({ type: 'numeric', precision: 12, scale: 2, nullable: true })
  whole_price_4: number | null;
```

- [ ] **Step 4: Add exports to `index.ts`**

Append to `apps/backend/src/common/entities/index.ts`:

```typescript
export { RecommendationTemplate } from './recommendation-template.entity';
export { RecommendationTemplateItem } from './recommendation-template-item.entity';
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
docker compose exec backend npx nest build -p tsconfig.build.json 2>&1 | tail -5
```

Expected: exits 0, no TypeScript errors.

- [ ] **Step 6: Commit**

```bash
git add apps/backend/src/common/entities/recommendation-template.entity.ts \
        apps/backend/src/common/entities/recommendation-template-item.entity.ts \
        apps/backend/src/common/entities/product.entity.ts \
        apps/backend/src/common/entities/index.ts
git commit -m "phase-14: entities RecommendationTemplate, RecommendationTemplateItem, product whole_price cols"
```

---

## Task 3: DTOs

**Files:**
- Create: `apps/backend/src/modules/recommendation/dto/recommendation.dto.ts`

- [ ] **Step 1: Create the DTO file**

```typescript
import {
  IsArray, IsBoolean, IsIn, IsInt, IsNotEmpty, IsOptional,
  IsString, IsUUID, Length, Max, Min, ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

const TEMPLATE_TYPES = [
  'manual', 'top_seller', 'high_margin', 'time_of_day', 'customer_grade_targeted', 'seasonal',
] as const;

export class CreateTemplateDto {
  @IsString() @Length(1, 200) name: string;
  @IsIn(TEMPLATE_TYPES) template_type: string;
  @IsOptional() @IsString() time_window_start?: string;
  @IsOptional() @IsString() time_window_end?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(1, { each: true }) @Max(7, { each: true })
  @Type(() => Number)
  applicable_days_of_week?: number[];
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) target_grade_ids?: string[];
  @IsOptional() @IsInt() @Min(1) min_recommendations?: number;
  @IsOptional() @IsInt() @Min(1) max_recommendations?: number;
  @IsOptional() @IsInt() @Min(1) @Max(4) whole_price_tier?: number;
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) applicable_location_ids?: string[];
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsInt() display_order?: number;
}

export class UpdateTemplateDto {
  @IsOptional() @IsString() @Length(1, 200) name?: string;
  @IsOptional() @IsIn(TEMPLATE_TYPES) template_type?: string;
  @IsOptional() @IsString() time_window_start?: string;
  @IsOptional() @IsString() time_window_end?: string;
  @IsOptional() @IsArray() @IsInt({ each: true }) @Min(1, { each: true }) @Max(7, { each: true })
  @Type(() => Number)
  applicable_days_of_week?: number[];
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) target_grade_ids?: string[];
  @IsOptional() @IsInt() @Min(1) min_recommendations?: number;
  @IsOptional() @IsInt() @Min(1) max_recommendations?: number;
  @IsOptional() @IsInt() @Min(1) @Max(4) whole_price_tier?: number;
  @IsOptional() @IsArray() @IsUUID(undefined, { each: true }) applicable_location_ids?: string[];
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsInt() display_order?: number;
}

export class TemplateItemInputDto {
  @IsUUID() @IsNotEmpty() product_id: string;
  @IsOptional() @IsUUID() variant_id?: string;
  @IsOptional() @IsInt() priority?: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
}

export class SetTemplateItemsDto {
  @IsArray() @ValidateNested({ each: true }) @Type(() => TemplateItemInputDto)
  items: TemplateItemInputDto[];
}

export class TemplateQueryDto {
  @IsOptional() @IsIn(TEMPLATE_TYPES) template_type?: string;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()
  is_active?: boolean;
  @IsOptional() @Transform(({ value }) => value === 'true' || value === true) @IsBoolean()
  for_terminal_now?: boolean;
}

export class ResolveTemplateQueryDto {
  @IsOptional() @IsUUID() customer_id?: string;
  @IsOptional() @IsUUID() location_id?: string;
  @IsOptional() @IsString() current_time?: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/backend/src/modules/recommendation/dto/recommendation.dto.ts
git commit -m "phase-14: recommendation DTOs (CreateTemplateDto, UpdateTemplateDto, SetTemplateItemsDto, etc.)"
```

---

## Task 4: Write Failing Tests First

**Files:**
- Create: `apps/backend/src/modules/recommendation/recommendation.service.spec.ts`

- [ ] **Step 1: Create the spec file with all 13 test cases**

```typescript
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { RecommendationService } from './recommendation.service';
import { RecommendationTemplate } from '../../common/entities/recommendation-template.entity';
import { RecommendationTemplateItem } from '../../common/entities/recommendation-template-item.entity';

const BIZ = 'biz-1';
const OTHER_BIZ = 'biz-other';
const TMPL_ID = 'tmpl-1';

function makeTemplate(overrides: Partial<RecommendationTemplate> = {}): RecommendationTemplate {
  return {
    id: TMPL_ID,
    business_id: BIZ,
    name: 'Test Template',
    template_type: 'manual',
    time_window_start: null,
    time_window_end: null,
    applicable_days_of_week: null,
    target_grade_ids: null,
    min_recommendations: 3,
    max_recommendations: 10,
    whole_price_tier: null,
    applicable_location_ids: null,
    is_active: true,
    display_order: 0,
    items: [],
    created_at: new Date(),
    updated_at: new Date(),
    business: {} as any,
    ...overrides,
  };
}

describe('RecommendationService', () => {
  let service: RecommendationService;
  let templateRepo: jest.Mocked<any>;
  let itemRepo: jest.Mocked<any>;
  let dataSource: jest.Mocked<any>;

  beforeEach(async () => {
    templateRepo = {
      createQueryBuilder: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      remove: jest.fn(),
    };
    itemRepo = {
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };
    dataSource = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        RecommendationService,
        { provide: getRepositoryToken(RecommendationTemplate), useValue: templateRepo },
        { provide: getRepositoryToken(RecommendationTemplateItem), useValue: itemRepo },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get(RecommendationService);
  });

  // ── REC-001: List templates ──────────────────────────────────────────────
  describe('listTemplates', () => {
    it('returns templates scoped to the business', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([makeTemplate()]),
      };
      templateRepo.createQueryBuilder.mockReturnValue(qb);

      const result = await service.listTemplates(BIZ, {});
      expect(result).toHaveLength(1);
      expect(qb.where).toHaveBeenCalledWith('t.business_id = :businessId', { businessId: BIZ });
    });

    it('applies for_terminal_now filter (3 extra andWhere calls)', async () => {
      const qb = {
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        addOrderBy: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      templateRepo.createQueryBuilder.mockReturnValue(qb);

      await service.listTemplates(BIZ, { for_terminal_now: true });
      // is_active=true + time window + day-of-week
      expect(qb.andWhere).toHaveBeenCalledTimes(3);
    });
  });

  // ── REC-002: Create template ─────────────────────────────────────────────
  describe('createTemplate', () => {
    it('creates and returns a template with defaults', async () => {
      const dto = { name: 'Lunch Specials', template_type: 'manual' };
      const created = makeTemplate({ name: 'Lunch Specials' });
      templateRepo.create.mockReturnValue(created);
      templateRepo.save.mockResolvedValue(created);

      const result = await service.createTemplate(BIZ, dto as any);
      expect(result.name).toBe('Lunch Specials');
      expect(templateRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ business_id: BIZ, min_recommendations: 3, max_recommendations: 10 }),
      );
    });
  });

  // ── REC-003: Update template ─────────────────────────────────────────────
  describe('updateTemplate', () => {
    it('updates and returns the template', async () => {
      const tmpl = makeTemplate();
      templateRepo.findOne.mockResolvedValue(tmpl);
      templateRepo.save.mockResolvedValue({ ...tmpl, name: 'Updated' });

      const result = await service.updateTemplate(TMPL_ID, BIZ, { name: 'Updated' } as any);
      expect(result.name).toBe('Updated');
    });

    it('throws 404 for cross-tenant access (REC-003)', async () => {
      templateRepo.findOne.mockResolvedValue(null);
      await expect(service.updateTemplate(TMPL_ID, OTHER_BIZ, {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ── REC-004: Delete template ─────────────────────────────────────────────
  describe('deleteTemplate', () => {
    it('removes the template and returns { deleted: true }', async () => {
      const tmpl = makeTemplate();
      templateRepo.findOne.mockResolvedValue(tmpl);
      templateRepo.remove.mockResolvedValue(undefined);

      expect(await service.deleteTemplate(TMPL_ID, BIZ)).toEqual({ deleted: true });
    });

    it('throws 404 for cross-tenant access (REC-004)', async () => {
      templateRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteTemplate(TMPL_ID, OTHER_BIZ)).rejects.toThrow(NotFoundException);
    });
  });

  // ── REC-005: Set template items ──────────────────────────────────────────
  describe('setTemplateItems', () => {
    it('replaces all items for a manual template', async () => {
      const tmpl = makeTemplate({ template_type: 'manual' });
      templateRepo.findOne.mockResolvedValue(tmpl);
      itemRepo.delete.mockResolvedValue(undefined);
      itemRepo.create.mockImplementation((data: any) => data);
      itemRepo.save.mockResolvedValue([{ product_id: 'prod-1', priority: 0, is_active: true }]);

      const dto = { items: [{ product_id: 'prod-1', priority: 0 }] };
      await service.setTemplateItems(TMPL_ID, BIZ, dto as any);
      expect(itemRepo.delete).toHaveBeenCalledWith({ template_id: TMPL_ID });
      expect(itemRepo.save).toHaveBeenCalled();
    });

    it('throws 422 for non-manual templates', async () => {
      const tmpl = makeTemplate({ template_type: 'top_seller' });
      templateRepo.findOne.mockResolvedValue(tmpl);

      await expect(
        service.setTemplateItems(TMPL_ID, BIZ, { items: [] } as any),
      ).rejects.toThrow(UnprocessableEntityException);
    });
  });

  // ── REC-010: Resolve template ────────────────────────────────────────────
  describe('resolveTemplate', () => {
    it('throws 404 for cross-tenant access', async () => {
      templateRepo.findOne.mockResolvedValue(null);
      await expect(service.resolveTemplate(TMPL_ID, OTHER_BIZ, {})).rejects.toThrow(NotFoundException);
    });

    it('returns manual items with parsed price', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate({ template_type: 'manual', whole_price_tier: null }));
      dataSource.query.mockResolvedValue([
        { product_id: 'p1', variant_id: null, name: 'Burger', price: '25.00', image_url: null, priority: 0 },
      ]);

      const result = await service.resolveTemplate(TMPL_ID, BIZ, {});
      expect(result.items).toHaveLength(1);
      expect(result.items[0].price).toBe(25);
      expect(result.template_type).toBe('manual');
    });

    it('executes top-seller SQL for top_seller template', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate({ template_type: 'top_seller', max_recommendations: 5 }));
      dataSource.query.mockResolvedValue([
        { product_id: 'p1', name: 'Burger', price: '25.00', image_url: null, sale_count: 10 },
      ]);

      const result = await service.resolveTemplate(TMPL_ID, BIZ, {});
      expect(result.template_type).toBe('top_seller');
      expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('COUNT(ti.id)'), [BIZ, 5]);
    });

    it('executes high-margin SQL for high_margin template', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate({ template_type: 'high_margin', max_recommendations: 5 }));
      dataSource.query.mockResolvedValue([
        { product_id: 'p1', name: 'Caviar', price: '200.00', image_url: null },
      ]);

      const result = await service.resolveTemplate(TMPL_ID, BIZ, {});
      expect(result.template_type).toBe('high_margin');
      expect(dataSource.query).toHaveBeenCalledWith(expect.stringContaining('cost_price'), [BIZ, 5]);
    });

    it('returns empty items for time_of_day template outside window', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate({
        template_type: 'time_of_day',
        time_window_start: '12:00',
        time_window_end: '14:00',
        applicable_days_of_week: null,
      }));

      const result = await service.resolveTemplate(TMPL_ID, BIZ, { current_time: '09:00' });
      expect(result.items).toHaveLength(0);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('returns items for time_of_day template inside window', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate({
        template_type: 'time_of_day',
        time_window_start: '12:00',
        time_window_end: '14:00',
        applicable_days_of_week: null,
        whole_price_tier: null,
      }));
      dataSource.query.mockResolvedValue([
        { product_id: 'p1', variant_id: null, name: 'Lunch', price: '30.00', image_url: null, priority: 0 },
      ]);

      const result = await service.resolveTemplate(TMPL_ID, BIZ, { current_time: '13:00' });
      expect(result.items).toHaveLength(1);
    });

    it('returns empty for customer_grade_targeted without customer_id', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate({
        template_type: 'customer_grade_targeted',
        target_grade_ids: ['grade-vip'],
      }));

      const result = await service.resolveTemplate(TMPL_ID, BIZ, {});
      expect(result.items).toHaveLength(0);
      expect(dataSource.query).not.toHaveBeenCalled();
    });

    it('returns items for customer_grade_targeted with matching grade', async () => {
      templateRepo.findOne.mockResolvedValue(makeTemplate({
        template_type: 'customer_grade_targeted',
        target_grade_ids: ['grade-vip'],
        whole_price_tier: null,
      }));
      dataSource.query
        .mockResolvedValueOnce([{ grade_id: 'grade-vip' }])
        .mockResolvedValueOnce([
          { product_id: 'p1', variant_id: null, name: 'VIP Item', price: '100.00', image_url: null, priority: 0 },
        ]);

      const result = await service.resolveTemplate(TMPL_ID, BIZ, { customer_id: 'cust-1' });
      expect(result.items).toHaveLength(1);
      expect(dataSource.query).toHaveBeenNthCalledWith(
        1,
        expect.stringContaining('FROM customers'),
        ['cust-1', BIZ],
      );
    });
  });

  // ── REC-020: Featured items ──────────────────────────────────────────────
  describe('getFeaturedItems', () => {
    it('returns flattened items from all active templates', async () => {
      dataSource.query.mockResolvedValue([
        { product_id: 'p1', template_name: 'T1', name: 'Burger', price: '25.00', image_url: null, priority: 0, display_order: 0 },
      ]);

      const result = await service.getFeaturedItems(BIZ);
      expect(result).toHaveLength(1);
      expect(dataSource.query).toHaveBeenCalledWith(
        expect.stringContaining('recommendation_templates'),
        [BIZ],
      );
    });
  });
});
```

- [ ] **Step 2: Run tests to confirm all 13 fail (RecommendationService not yet created)**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern=recommendation.service.spec 2>&1 | tail -20
```

Expected: all tests fail with "Cannot find module './recommendation.service'".

---

## Task 5: Service Implementation

**Files:**
- Create: `apps/backend/src/modules/recommendation/recommendation.service.ts`

- [ ] **Step 1: Create the service**

```typescript
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
    if (!template) throw new NotFoundException('Recommendation template not found');
    Object.assign(template, dto);
    return this.templateRepo.save(template);
  }

  // ── REC-004 ───────────────────────────────────────────────────────────────
  async deleteTemplate(id: string, businessId: string) {
    const template = await this.templateRepo.findOne({ where: { id, business_id: businessId } });
    if (!template) throw new NotFoundException('Recommendation template not found');
    await this.templateRepo.remove(template);
    return { deleted: true };
  }

  // ── REC-005 ───────────────────────────────────────────────────────────────
  async setTemplateItems(id: string, businessId: string, dto: SetTemplateItemsDto) {
    const template = await this.templateRepo.findOne({ where: { id, business_id: businessId } });
    if (!template) throw new NotFoundException('Recommendation template not found');
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
    if (!template) throw new NotFoundException('Recommendation template not found');

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
```

- [ ] **Step 2: Run the spec to verify all 13 tests pass**

```bash
docker compose exec backend npm test --workspace=apps/backend -- --testPathPattern=recommendation.service.spec 2>&1 | tail -20
```

Expected: 13 tests pass, 0 failures.

- [ ] **Step 3: Run the full suite to confirm zero regressions**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

Expected: 588 tests passing (575 existing + 13 new), 0 failures.

- [ ] **Step 4: Commit**

```bash
git add apps/backend/src/modules/recommendation/recommendation.service.ts \
        apps/backend/src/modules/recommendation/recommendation.service.spec.ts
git commit -m "phase-14: RecommendationService — 7 methods, 13 tests (REC-001–020)"
```

---

## Task 6: Controllers

**Files:**
- Create: `apps/backend/src/modules/recommendation/recommendation.controller.ts`
- Create: `apps/backend/src/modules/recommendation/recommendation-terminal.controller.ts`

- [ ] **Step 1: Create the business dashboard controller**

`apps/backend/src/modules/recommendation/recommendation.controller.ts`:

```typescript
import {
  Controller, Get, Post, Patch, Put, Delete,
  Param, Body, Query, Request, UseGuards,
} from '@nestjs/common';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RecommendationService } from './recommendation.service';
import {
  CreateTemplateDto, UpdateTemplateDto, SetTemplateItemsDto, TemplateQueryDto,
} from './dto/recommendation.dto';

@Controller('business')
@UseGuards(RolesGuard)
export class RecommendationController {
  constructor(private recommendationService: RecommendationService) {}

  // REC-001
  @Get('recommendation-templates')
  @Roles('owner', 'manager')
  listTemplates(@Request() req: any, @Query() query: TemplateQueryDto) {
    return this.recommendationService.listTemplates(req.user.business_id, query);
  }

  // REC-020 — declared before /:id routes to avoid route collision
  @Get('recommendation-templates/featured')
  @Roles('owner', 'manager', 'employee')
  getFeaturedItems(@Request() req: any) {
    return this.recommendationService.getFeaturedItems(req.user.business_id);
  }

  // REC-002
  @Post('recommendation-templates')
  @Roles('owner', 'manager')
  createTemplate(@Request() req: any, @Body() dto: CreateTemplateDto) {
    return this.recommendationService.createTemplate(req.user.business_id, dto);
  }

  // REC-003
  @Patch('recommendation-templates/:id')
  @Roles('owner', 'manager')
  updateTemplate(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateTemplateDto) {
    return this.recommendationService.updateTemplate(id, req.user.business_id, dto);
  }

  // REC-004
  @Delete('recommendation-templates/:id')
  @Roles('owner', 'manager')
  deleteTemplate(@Param('id') id: string, @Request() req: any) {
    return this.recommendationService.deleteTemplate(id, req.user.business_id);
  }

  // REC-005
  @Put('recommendation-templates/:id/items')
  @Roles('owner', 'manager')
  setTemplateItems(@Param('id') id: string, @Request() req: any, @Body() dto: SetTemplateItemsDto) {
    return this.recommendationService.setTemplateItems(id, req.user.business_id, dto);
  }
}
```

- [ ] **Step 2: Create the terminal controller**

`apps/backend/src/modules/recommendation/recommendation-terminal.controller.ts`:

```typescript
import { Controller, Get, Param, Query } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators';
import { RecommendationService } from './recommendation.service';
import { ResolveTemplateQueryDto } from './dto/recommendation.dto';

@Controller('terminal')
export class RecommendationTerminalController {
  constructor(private recommendationService: RecommendationService) {}

  // REC-010
  @Get('recommendation-templates/:id/items')
  resolveTemplate(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
    @Query() query: ResolveTemplateQueryDto,
  ) {
    return this.recommendationService.resolveTemplate(id, businessId, query);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/backend/src/modules/recommendation/recommendation.controller.ts \
        apps/backend/src/modules/recommendation/recommendation-terminal.controller.ts
git commit -m "phase-14: RecommendationController + RecommendationTerminalController (REC-001–020)"
```

---

## Task 7: Module + AppModule Registration

**Files:**
- Create: `apps/backend/src/modules/recommendation/recommendation.module.ts`
- Modify: `apps/backend/src/app.module.ts`

- [ ] **Step 1: Create the module**

`apps/backend/src/modules/recommendation/recommendation.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RecommendationService } from './recommendation.service';
import { RecommendationController } from './recommendation.controller';
import { RecommendationTerminalController } from './recommendation-terminal.controller';
import { RecommendationTemplate } from '../../common/entities/recommendation-template.entity';
import { RecommendationTemplateItem } from '../../common/entities/recommendation-template-item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RecommendationTemplate, RecommendationTemplateItem])],
  controllers: [RecommendationController, RecommendationTerminalController],
  providers: [RecommendationService],
})
export class RecommendationModule {}
```

- [ ] **Step 2: Register in `app.module.ts`**

Add the import statement:
```typescript
import { RecommendationModule } from './modules/recommendation/recommendation.module';
```

Add to the `imports` array (after `ChainModule`):
```typescript
RecommendationModule,
```

- [ ] **Step 3: Verify build compiles**

```bash
docker compose exec backend npx nest build -p tsconfig.build.json 2>&1 | tail -5
```

Expected: exits 0, no errors.

- [ ] **Step 4: Run full test suite one final time**

```bash
docker compose exec backend npm test --workspace=apps/backend 2>&1 | tail -10
```

Expected: 588 tests passing, 43 suites, 0 failures.

- [ ] **Step 5: Commit**

```bash
git add apps/backend/src/modules/recommendation/recommendation.module.ts \
        apps/backend/src/app.module.ts
git commit -m "phase-14: RecommendationModule wired into AppModule"
```

---

## Task 8: Update Docs

**Files:**
- Modify: `CLAUDE.md` (in repo root)
- Modify: `docs/IMPLEMENTATION_LOG.md`

- [ ] **Step 1: Update `CLAUDE.md`**

In the **Implementation status** section, update:
- Change "575 tests passing, 42 suites" → "588 tests passing, 43 suites"
- Change `Next: 14 (REC — Recommendations).` → `Next: 15 (ADM — Platform Admin).`
- Add `14,` to the completed phases list

In **Key architectural facts for future phases**, add:
```
- `RecommendationModule` at `src/modules/recommendation/`: 2 controllers, `RecommendationService` (7 methods: listTemplates, createTemplate, updateTemplate, deleteTemplate, setTemplateItems, resolveTemplate, getFeaturedItems)
- Template types: manual (configured items), top_seller (last-7d SQL), high_margin (margin SQL), time_of_day (window check + configured items), customer_grade_targeted (grade check + configured items), seasonal (configured items)
- `whole_price_1`–`4` NUMERIC(12,2) NULL added to `products` (REC-MOD-001); tier selected via `recommendation_templates.whole_price_tier`
```

- [ ] **Step 2: Append Phase 14 entry to `docs/IMPLEMENTATION_LOG.md`**

Add after the Phase 13 entry:

```markdown
### Phase 14 — Recommendations (DONE). 588 tests passing (43 suites).

See extension spec §10 (REC-001–020) for requirement IDs.

- [x] Migration `1714014000000-AddRecommendations` — `recommendation_templates`, `recommendation_template_items` tables; `whole_price_1`–`4` on products; 4 indexes
- [x] 2 new entities: `RecommendationTemplate`, `RecommendationTemplateItem`; `Product` entity updated with 4 price-tier columns
- [x] `RecommendationService` — 7 methods:
      listTemplates with `for_terminal_now` filter (time window + DOW check in SQL, REC-001);
      createTemplate/updateTemplate/deleteTemplate (REC-002–004);
      setTemplateItems — replace-set, 422 for non-manual types (REC-005);
      resolveTemplate — manual/seasonal returns configured items, top_seller runs 7-day sales SQL,
      high_margin runs margin ORDER BY SQL, time_of_day checks window, customer_grade_targeted checks grade (REC-010);
      getFeaturedItems — flattened JOIN across all active templates (REC-020)
- [x] `RecommendationController` — 6 routes under `/api/business/recommendation-templates/…`
- [x] `RecommendationTerminalController` — 1 route under `/api/terminal/recommendation-templates/:id/items`
- [x] `RecommendationModule` registered in AppModule
- [x] 13 unit tests in `recommendation.service.spec.ts`
```

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/IMPLEMENTATION_LOG.md
git commit -m "phase-14: update docs — 588 tests, 43 suites, mark Phase 14 DONE"
```

---

## Self-Review Against Spec

**Spec coverage check:**

| Requirement | Task | Status |
|---|---|---|
| REC-MOD-001 — `whole_price_1`–`4` on products | Task 1 (migration) + Task 2 (entity) | ✓ |
| REC-001 — List templates w/ `for_terminal_now` | Task 5 (`listTemplates`) | ✓ |
| REC-002 — Create template | Task 5 (`createTemplate`) | ✓ |
| REC-003 — Update template | Task 5 (`updateTemplate`) | ✓ |
| REC-004 — Delete template | Task 5 (`deleteTemplate`) | ✓ |
| REC-005 — Set items (manual only, 422 otherwise) | Task 5 (`setTemplateItems`) | ✓ |
| REC-010 — Resolve items (all 5 dynamic types) | Task 5 (`resolveTemplate`) | ✓ |
| REC-020 — Featured items list | Task 5 (`getFeaturedItems`) | ✓ |
| Cross-tenant 404 (multi-tenancy rule) | Tasks 4 & 5 (updateTemplate, deleteTemplate, resolveTemplate tests) | ✓ |
| §13.4 migration 13 (AddRecommendations) | Task 1 | ✓ |
| `recommendation_templates` §13.1 schema | Task 1 (all 15 columns present) | ✓ |
| `recommendation_template_items` §13.1 schema | Task 1 (all 7 columns present) | ✓ |
| §13.3 indexes | Task 1 (4 indexes) | ✓ |
| Reversible `down` method | Task 1 | ✓ |

**Placeholder scan:** None found — all steps contain actual code.

**Type consistency check:**
- `RecommendationTemplate` entity used in service constructor and test `makeTemplate()` factory ✓
- `SetTemplateItemsDto.items` typed as `TemplateItemInputDto[]` and referenced in service ✓
- `TemplateQueryDto` used in controller `@Query()` and service `listTemplates()` ✓
- `ResolveTemplateQueryDto` used in terminal controller `@Query()` and service `resolveTemplate()` ✓
- Service private methods `resolveManualItems`, `resolveTopSellers`, `resolveHighMargin`, `isInTimeWindow` all used internally ✓
