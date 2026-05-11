import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { OssService } from './oss.service';
import { TableSession } from '../../common/entities/table-session.entity';
import { Transaction } from '../../common/entities/transaction.entity';

const LOC_A = 'loc-a';

function makeFluentQb(rawResult: any[]) {
  const qb: any = {
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    having: jest.fn().mockReturnThis(),
    getRawMany: jest.fn().mockResolvedValue(rawResult),
  };
  return qb;
}

describe('OssService', () => {
  let service: OssService;
  let sessionRepo: jest.Mocked<any>;
  let txnRepo: jest.Mocked<any>;

  beforeEach(async () => {
    sessionRepo = { createQueryBuilder: jest.fn() };
    txnRepo = { createQueryBuilder: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        OssService,
        { provide: getRepositoryToken(TableSession), useValue: sessionRepo },
        { provide: getRepositoryToken(Transaction), useValue: txnRepo },
      ],
    }).compile();

    service = module.get(OssService);
  });

  it('returns correct grouping: preparing from sessions + txns, ready from sessions + txns', async () => {
    const preparingSession = { display_number: 'T-01', order_type: 'dine_in', item_count: '3', started_at: new Date() };
    const readySession = { display_number: 'T-02', order_type: 'dine_in', item_count: '2', ready_at: new Date() };
    const preparingTxn = { display_number: 'TXN-001', order_type: 'takeaway', item_count: '1', started_at: new Date() };
    const readyTxn = { display_number: 'TXN-002', order_type: 'takeaway', item_count: '2', ready_at: new Date() };

    // sessionRepo.createQueryBuilder is called twice: once for preparing, once for ready
    sessionRepo.createQueryBuilder
      .mockReturnValueOnce(makeFluentQb([preparingSession]))
      .mockReturnValueOnce(makeFluentQb([readySession]));

    txnRepo.createQueryBuilder
      .mockReturnValueOnce(makeFluentQb([preparingTxn]))
      .mockReturnValueOnce(makeFluentQb([readyTxn]));

    const result = await service.getOssData(LOC_A);

    expect(result.preparing).toHaveLength(2);
    expect(result.ready).toHaveLength(2);

    const prepSources = result.preparing.map((p) => p.display_number);
    expect(prepSources).toContain('T-01');
    expect(prepSources).toContain('TXN-001');

    const readySources = result.ready.map((r) => r.display_number);
    expect(readySources).toContain('T-02');
    expect(readySources).toContain('TXN-002');
  });
});
