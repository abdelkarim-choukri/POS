import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotFoundException } from '@nestjs/common';
import { JobService } from './job.service';
import { RedisLockService, REDIS_CLIENT } from './redis-lock.service';
import { BackgroundJob } from '../../common/entities/background-job.entity';

function makeRepo(overrides: Record<string, any> = {}) {
  return {
    create: jest.fn((d: any) => ({ id: 'job-uuid', ...d })),
    save: jest.fn((e: any) => Promise.resolve(e)),
    findOne: jest.fn(),
    ...overrides,
  };
}

describe('JobService', () => {
  let service: JobService;
  let repo: ReturnType<typeof makeRepo>;

  beforeEach(async () => {
    repo = makeRepo();
    const module = await Test.createTestingModule({
      providers: [
        JobService,
        { provide: getRepositoryToken(BackgroundJob), useValue: repo },
      ],
    }).compile();
    service = module.get(JobService);
  });

  it('createJob inserts a row with status queued', async () => {
    const job = await service.createJob({ job_type: 'bulk_coupon_issue', business_id: 'biz-1' });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ job_type: 'bulk_coupon_issue', status: 'queued' }),
    );
    expect(repo.save).toHaveBeenCalled();
    expect(job.status).toBe('queued');
  });

  it('createJob stores unique_lock_key when provided', async () => {
    await service.createJob({
      job_type: 'expiration_scan',
      unique_lock_key: 'expiration_scan:biz-1',
    });
    expect(repo.create).toHaveBeenCalledWith(
      expect.objectContaining({ unique_lock_key: 'expiration_scan:biz-1' }),
    );
  });

  it('updateJobStatus transitions status and sets started_at for running', async () => {
    const existing = {
      id: 'job-uuid', status: 'queued', started_at: null, completed_at: null,
    };
    repo.findOne.mockResolvedValue(existing);
    const updated = await service.updateJobStatus('job-uuid', 'running');
    expect(updated.status).toBe('running');
    expect(updated.started_at).toBeInstanceOf(Date);
  });

  it('updateJobStatus sets completed_at for completed', async () => {
    const existing = {
      id: 'job-uuid', status: 'running', started_at: new Date(), completed_at: null,
    };
    repo.findOne.mockResolvedValue(existing);
    const updated = await service.updateJobStatus('job-uuid', 'completed', {
      result_json: { processed: 10 },
    });
    expect(updated.status).toBe('completed');
    expect(updated.completed_at).toBeInstanceOf(Date);
    expect(updated.result_json).toEqual({ processed: 10 });
  });

  it('updateJobStatus throws NotFoundException for unknown id', async () => {
    repo.findOne.mockResolvedValue(null);
    await expect(service.updateJobStatus('bad-id', 'running')).rejects.toThrow(NotFoundException);
  });

  it('getJob returns null for missing id', async () => {
    repo.findOne.mockResolvedValue(null);
    const result = await service.getJob('missing-id', 'biz-1');
    expect(result).toBeNull();
  });

  it('getJob scopes by business_id', async () => {
    repo.findOne.mockResolvedValue(null);
    await service.getJob('job-uuid', 'biz-1');
    expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'job-uuid', business_id: 'biz-1' } });
  });
});

describe('RedisLockService', () => {
  let lockService: RedisLockService;
  let redisMock: { set: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    redisMock = { set: jest.fn(), del: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        RedisLockService,
        { provide: REDIS_CLIENT, useValue: redisMock },
      ],
    }).compile();
    lockService = module.get(RedisLockService);
  });

  it('acquireLock returns true when Redis returns OK', async () => {
    redisMock.set.mockResolvedValue('OK');
    const acquired = await lockService.acquireLock('expiration_scan:biz-1', 300);
    expect(acquired).toBe(true);
    expect(redisMock.set).toHaveBeenCalledWith('lock:expiration_scan:biz-1', '1', 'EX', 300, 'NX');
  });

  it('acquireLock returns false when lock is already held (Redis returns null)', async () => {
    redisMock.set.mockResolvedValue(null);
    const acquired = await lockService.acquireLock('expiration_scan:biz-1', 300);
    expect(acquired).toBe(false);
  });

  it('releaseLock deletes the lock key', async () => {
    redisMock.del.mockResolvedValue(1);
    await lockService.releaseLock('expiration_scan:biz-1');
    expect(redisMock.del).toHaveBeenCalledWith('lock:expiration_scan:biz-1');
  });
});
