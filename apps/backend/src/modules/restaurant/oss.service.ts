import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TableSession } from '../../common/entities/table-session.entity';
import { Transaction } from '../../common/entities/transaction.entity';

@Injectable()
export class OssService {
  constructor(
    @InjectRepository(TableSession) private sessionRepo: Repository<TableSession>,
    @InjectRepository(Transaction) private txnRepo: Repository<Transaction>,
  ) {}

  async getOssData(locationId: string) {
    // Table sessions with any item in 'preparing'
    const preparingSessionsRaw = await this.sessionRepo
      .createQueryBuilder('ts')
      .select('tbl.table_number', 'display_number')
      .addSelect("'dine_in'", 'order_type')
      .addSelect(
        "COUNT(tsi.id) FILTER (WHERE tsi.kds_status != 'cancelled')",
        'item_count',
      )
      .addSelect(
        "MIN(tsi.added_at) FILTER (WHERE tsi.kds_status = 'preparing')",
        'started_at',
      )
      .innerJoin('ts.table', 'tbl')
      .innerJoin('table_session_items', 'tsi', 'tsi.table_session_id = ts.id')
      .where('ts.location_id = :locationId', { locationId })
      .andWhere("ts.status IN ('open', 'awaiting_payment')")
      .groupBy('ts.id, tbl.table_number')
      .having("COUNT(tsi.id) FILTER (WHERE tsi.kds_status = 'preparing') > 0")
      .getRawMany();

    // Table sessions where ALL non-cancelled items are 'ready' (none new or preparing)
    const readySessionsRaw = await this.sessionRepo
      .createQueryBuilder('ts')
      .select('tbl.table_number', 'display_number')
      .addSelect("'dine_in'", 'order_type')
      .addSelect(
        "COUNT(tsi.id) FILTER (WHERE tsi.kds_status != 'cancelled')",
        'item_count',
      )
      .addSelect('MAX(tsi.added_at)', 'ready_at')
      .innerJoin('ts.table', 'tbl')
      .innerJoin('table_session_items', 'tsi', 'tsi.table_session_id = ts.id')
      .where('ts.location_id = :locationId', { locationId })
      .andWhere("ts.status IN ('open', 'awaiting_payment')")
      .groupBy('ts.id, tbl.table_number')
      .having(
        "COUNT(tsi.id) FILTER (WHERE tsi.kds_status IN ('new', 'preparing')) = 0" +
        " AND COUNT(tsi.id) FILTER (WHERE tsi.kds_status = 'ready') > 0",
      )
      .getRawMany();

    // Direct transactions in 'preparing'
    const preparingTxnsRaw = await this.txnRepo
      .createQueryBuilder('txn')
      .select('txn.transaction_number', 'display_number')
      .addSelect("'takeaway'", 'order_type')
      .addSelect('COUNT(ti.id)', 'item_count')
      .addSelect('txn.created_at', 'started_at')
      .innerJoin('txn.items', 'ti')
      .where('txn.location_id = :locationId', { locationId })
      .andWhere("txn.order_status = 'preparing'")
      .groupBy('txn.id, txn.transaction_number, txn.created_at')
      .getRawMany();

    // Direct transactions in 'ready'
    const readyTxnsRaw = await this.txnRepo
      .createQueryBuilder('txn')
      .select('txn.transaction_number', 'display_number')
      .addSelect("'takeaway'", 'order_type')
      .addSelect('COUNT(ti.id)', 'item_count')
      .addSelect('txn.updated_at', 'ready_at')
      .innerJoin('txn.items', 'ti')
      .where('txn.location_id = :locationId', { locationId })
      .andWhere("txn.order_status = 'ready'")
      .groupBy('txn.id, txn.transaction_number, txn.updated_at')
      .getRawMany();

    return {
      preparing: [
        ...preparingSessionsRaw.map((r) => ({
          display_number: r.display_number,
          order_type: r.order_type,
          item_count: Number(r.item_count),
          started_at: r.started_at,
        })),
        ...preparingTxnsRaw.map((r) => ({
          display_number: r.display_number,
          order_type: r.order_type,
          item_count: Number(r.item_count),
          started_at: r.started_at,
        })),
      ],
      ready: [
        ...readySessionsRaw.map((r) => ({
          display_number: r.display_number,
          order_type: r.order_type,
          item_count: Number(r.item_count),
          ready_at: r.ready_at,
        })),
        ...readyTxnsRaw.map((r) => ({
          display_number: r.display_number,
          order_type: r.order_type,
          item_count: Number(r.item_count),
          ready_at: r.ready_at,
        })),
      ],
    };
  }
}
