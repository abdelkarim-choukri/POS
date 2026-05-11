import {
  Injectable, NotFoundException, ConflictException, UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DiningArea } from '../../common/entities/dining-area.entity';
import { TableType } from '../../common/entities/table-type.entity';
import { RestaurantTable } from '../../common/entities/table.entity';
import { TableSession } from '../../common/entities/table-session.entity';
import {
  CreateDiningAreaDto, UpdateDiningAreaDto, ListDiningAreasQueryDto,
  CreateTableTypeDto, UpdateTableTypeDto,
  CreateTableDto, UpdateTableDto, ListTablesQueryDto,
} from './dto/restaurant.dto';

@Injectable()
export class RestaurantService {
  constructor(
    @InjectRepository(DiningArea) private areaRepo: Repository<DiningArea>,
    @InjectRepository(TableType) private tableTypeRepo: Repository<TableType>,
    @InjectRepository(RestaurantTable) private tableRepo: Repository<RestaurantTable>,
    @InjectRepository(TableSession) private sessionRepo: Repository<TableSession>,
  ) {}

  // ── RST-001: List dining areas ────────────────────────────────────────────

  async listDiningAreas(businessId: string, query: ListDiningAreasQueryDto) {
    const qb = this.areaRepo
      .createQueryBuilder('a')
      .select('a.id', 'id')
      .addSelect('a.location_id', 'location_id')
      .addSelect('a.name', 'name')
      .addSelect('a.description', 'description')
      .addSelect('a.sort_order', 'sort_order')
      .addSelect('a.is_active', 'is_active')
      .addSelect('COUNT(t.id)', 'table_count')
      .leftJoin(
        'tables',
        't',
        't.area_id = a.id AND t.is_active = true AND t.business_id = a.business_id',
      )
      .where('a.business_id = :businessId', { businessId })
      .groupBy('a.id')
      .orderBy('a.sort_order', 'ASC')
      .addOrderBy('a.name', 'ASC');

    const isActive = query.is_active ?? true;
    qb.andWhere('a.is_active = :is_active', { is_active: isActive });

    if (query.location_id) {
      qb.andWhere('a.location_id = :location_id', { location_id: query.location_id });
    }

    const raw = await qb.getRawMany();
    return {
      records: raw.map((r) => ({
        id: r.id,
        location_id: r.location_id,
        name: r.name,
        description: r.description,
        sort_order: Number(r.sort_order),
        is_active: r.is_active,
        table_count: Number(r.table_count),
      })),
    };
  }

  // ── RST-002: Create dining area ───────────────────────────────────────────

  async createDiningArea(businessId: string, dto: CreateDiningAreaDto) {
    const existing = await this.areaRepo.findOne({
      where: { business_id: businessId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException('Dining area name already exists for this business');
    }

    const area = this.areaRepo.create({
      business_id: businessId,
      location_id: dto.location_id,
      name: dto.name,
      description: dto.description ?? null,
      sort_order: dto.sort_order ?? 0,
    });
    return this.areaRepo.save(area);
  }

  // ── RST-003: Update dining area ───────────────────────────────────────────

  async updateDiningArea(businessId: string, id: string, dto: UpdateDiningAreaDto) {
    const area = await this.areaRepo.findOne({ where: { id, business_id: businessId } });
    if (!area) throw new NotFoundException('Dining area not found');

    if (dto.name && dto.name !== area.name) {
      const conflict = await this.areaRepo.findOne({
        where: { business_id: businessId, name: dto.name },
      });
      if (conflict) {
        throw new ConflictException('Dining area name already exists for this business');
      }
    }

    Object.assign(area, dto);
    return this.areaRepo.save(area);
  }

  // ── RST-004: Delete dining area ───────────────────────────────────────────

  async deleteDiningArea(businessId: string, id: string) {
    const area = await this.areaRepo.findOne({ where: { id, business_id: businessId } });
    if (!area) throw new NotFoundException('Dining area not found');

    const activeCount = await this.tableRepo.count({
      where: { area_id: id, business_id: businessId, is_active: true },
    });
    if (activeCount > 0) {
      throw new UnprocessableEntityException(
        'Cannot delete dining area with active tables assigned to it',
      );
    }

    await this.areaRepo.remove(area);
    return { deleted: true };
  }

  // ── RST-010: List table types ─────────────────────────────────────────────

  listTableTypes(businessId: string) {
    return this.tableTypeRepo.find({
      where: { business_id: businessId },
      order: { name: 'ASC' },
    });
  }

  // ── RST-011: Create table type ────────────────────────────────────────────

  async createTableType(businessId: string, dto: CreateTableTypeDto) {
    const tt = this.tableTypeRepo.create({
      business_id: businessId,
      name: dto.name,
      default_capacity: dto.default_capacity ?? 4,
    });
    return this.tableTypeRepo.save(tt);
  }

  // ── RST-012: Update table type ────────────────────────────────────────────

  async updateTableType(businessId: string, id: string, dto: UpdateTableTypeDto) {
    const tt = await this.tableTypeRepo.findOne({ where: { id, business_id: businessId } });
    if (!tt) throw new NotFoundException('Table type not found');
    Object.assign(tt, dto);
    return this.tableTypeRepo.save(tt);
  }

  // ── RST-013: Delete table type ────────────────────────────────────────────

  async deleteTableType(businessId: string, id: string) {
    const tt = await this.tableTypeRepo.findOne({ where: { id, business_id: businessId } });
    if (!tt) throw new NotFoundException('Table type not found');
    await this.tableTypeRepo.remove(tt);
    return { deleted: true };
  }

  // ── RST-020: List tables ──────────────────────────────────────────────────

  async listTables(businessId: string, query: ListTablesQueryDto) {
    const isActive = query.is_active ?? true;

    // Single LEFT JOIN on table_sessions for session_status — O(tables) not O(tables²)
    const qb = this.tableRepo
      .createQueryBuilder('t')
      .select('t.id', 'id')
      .addSelect('t.table_number', 'table_number')
      .addSelect('t.capacity', 'capacity')
      .addSelect('t.area_id', 'area_id')
      .addSelect('t.table_type_id', 'table_type_id')
      .addSelect('t.position_x', 'position_x')
      .addSelect('t.position_y', 'position_y')
      .addSelect('t.is_active', 'is_active')
      .addSelect('t.location_id', 'location_id')
      .addSelect('a.name', 'area_name')
      .addSelect('tt.name', 'table_type_name')
      .addSelect('ts.status', 'active_session_status')
      .leftJoin('t.area', 'a')
      .leftJoin('t.table_type', 'tt')
      .leftJoin(
        'table_sessions',
        'ts',
        "ts.table_id = t.id AND ts.status IN ('open', 'awaiting_payment')",
      )
      .where('t.business_id = :businessId', { businessId })
      .andWhere('t.is_active = :isActive', { isActive })
      .orderBy('t.table_number', 'ASC');

    if (query.location_id) qb.andWhere('t.location_id = :loc', { loc: query.location_id });
    if (query.area_id) qb.andWhere('t.area_id = :area', { area: query.area_id });
    if (query.table_type_id) qb.andWhere('t.table_type_id = :tt', { tt: query.table_type_id });

    const raw = await qb.getRawMany();

    return {
      records: raw.map((r) => {
        const record: Record<string, any> = {
          id: r.id,
          table_number: r.table_number,
          capacity: Number(r.capacity),
          area: r.area_id ? { id: r.area_id, name: r.area_name } : null,
          table_type: r.table_type_id ? { id: r.table_type_id, name: r.table_type_name } : null,
          position_x: r.position_x !== null ? Number(r.position_x) : null,
          position_y: r.position_y !== null ? Number(r.position_y) : null,
          is_active: r.is_active,
        };
        if (query.with_session_status) {
          record.session_status =
            r.active_session_status === 'awaiting_payment' ? 'awaiting_payment'
            : r.active_session_status === 'open' ? 'occupied'
            : 'available';
        }
        return record;
      }),
    };
  }

  // ── RST-021: Create table ─────────────────────────────────────────────────

  async createTable(businessId: string, dto: CreateTableDto) {
    const existing = await this.tableRepo.findOne({
      where: { business_id: businessId, table_number: dto.table_number },
    });
    if (existing) {
      throw new ConflictException('Table number already exists for this business');
    }

    const table = this.tableRepo.create({
      business_id: businessId,
      location_id: dto.location_id,
      area_id: dto.area_id,
      table_type_id: dto.table_type_id ?? null,
      table_number: dto.table_number,
      capacity: dto.capacity ?? 4,
      position_x: dto.position_x ?? null,
      position_y: dto.position_y ?? null,
    });
    return this.tableRepo.save(table);
  }

  // ── RST-022: Update table ─────────────────────────────────────────────────

  async updateTable(businessId: string, id: string, dto: UpdateTableDto) {
    const table = await this.tableRepo.findOne({ where: { id, business_id: businessId } });
    if (!table) throw new NotFoundException('Table not found');

    if (dto.table_number && dto.table_number !== table.table_number) {
      const conflict = await this.tableRepo.findOne({
        where: { business_id: businessId, table_number: dto.table_number },
      });
      if (conflict) {
        throw new ConflictException('Table number already exists for this business');
      }
    }

    Object.assign(table, dto);
    return this.tableRepo.save(table);
  }

  // ── RST-023: Delete table ─────────────────────────────────────────────────

  async deleteTable(businessId: string, id: string) {
    const table = await this.tableRepo.findOne({ where: { id, business_id: businessId } });
    if (!table) throw new NotFoundException('Table not found');

    const openSession = await this.sessionRepo.findOne({
      where: { table_id: id, business_id: businessId, status: 'open' },
    });
    if (openSession) {
      throw new UnprocessableEntityException(
        'Cannot delete table with an open session',
      );
    }

    await this.tableRepo.remove(table);
    return { deleted: true };
  }
}
