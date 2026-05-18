import { ChainSyncProcessor } from './chain-sync.processor';

describe('ChainSyncProcessor', () => {
  let processor: ChainSyncProcessor;
  let ds: jest.Mocked<any>;

  beforeEach(() => {
    ds = { query: jest.fn() };
    processor = new ChainSyncProcessor(ds);
  });

  it('syncs categories from parent to child', async () => {
    ds.query
      .mockResolvedValueOnce([{ id: 'cat-1', name: 'Coffee', sort_order: 0, default_tva_rate: 20 }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    await processor.process({
      data: { parentBusinessId: 'p-1', childBusinessIds: ['c-1'], syncWhat: ['categories'], jobId: 'job-1' },
    } as any);
    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO categories'),
      expect.any(Array),
    );
  });

  it('skips product if child category not yet synced', async () => {
    ds.query
      .mockResolvedValueOnce([{ id: 'prod-1', name: 'Latte', child_cat_id: null }])
      .mockResolvedValueOnce(undefined);
    await processor.process({
      data: { parentBusinessId: 'p-1', childBusinessIds: ['c-1'], syncWhat: ['products'], jobId: 'job-1' },
    } as any);
    expect(ds.query).not.toHaveBeenCalledWith(expect.stringContaining('INSERT INTO products'), expect.any(Array));
  });

  it('marks job completed_with_errors on child failure', async () => {
    ds.query
      .mockRejectedValueOnce(new Error('child db error'))
      .mockResolvedValueOnce(undefined);
    await processor.process({
      data: { parentBusinessId: 'p-1', childBusinessIds: ['c-1'], syncWhat: ['categories'], jobId: 'job-1' },
    } as any);
    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE background_jobs'),
      expect.arrayContaining(['completed_with_errors']),
    );
  });

  it('marks job completed on success', async () => {
    ds.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce(undefined);
    await processor.process({
      data: { parentBusinessId: 'p-1', childBusinessIds: ['c-1'], syncWhat: ['categories'], jobId: 'job-1' },
    } as any);
    expect(ds.query).toHaveBeenCalledWith(
      expect.stringContaining('UPDATE background_jobs'),
      expect.arrayContaining(['completed']),
    );
  });
});
