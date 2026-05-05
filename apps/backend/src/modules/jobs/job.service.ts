import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BackgroundJob } from '../../common/entities/background-job.entity';

export interface CreateJobDto {
  business_id?: string;
  job_type: string;
  unique_lock_key?: string;
  payload_json?: Record<string, any>;
  max_retries?: number;
}

@Injectable()
export class JobService {
  constructor(
    @InjectRepository(BackgroundJob)
    private jobRepo: Repository<BackgroundJob>,
  ) {}

  async createJob(dto: CreateJobDto): Promise<BackgroundJob> {
    const data: Partial<BackgroundJob> = {
      business_id: dto.business_id ?? undefined,
      job_type: dto.job_type,
      unique_lock_key: dto.unique_lock_key ?? undefined,
      payload_json: dto.payload_json ?? undefined,
      status: 'queued',
      retry_count: 0,
      max_retries: dto.max_retries ?? 3,
    };
    const job = this.jobRepo.create(data as BackgroundJob);
    return this.jobRepo.save(job);
  }

  async updateJobStatus(
    id: string,
    status: string,
    updates: {
      result_json?: Record<string, any>;
      error_message?: string;
      retry_count?: number;
      started_at?: Date;
      completed_at?: Date;
    } = {},
  ): Promise<BackgroundJob> {
    const job = await this.jobRepo.findOne({ where: { id } });
    if (!job) throw new NotFoundException(`Job ${id} not found`);

    Object.assign(job, { status, ...updates });

    if (status === 'running' && !job.started_at) {
      job.started_at = new Date();
    }
    if ((status === 'completed' || status === 'failed' || status === 'dead_letter') && !job.completed_at) {
      job.completed_at = new Date();
    }

    return this.jobRepo.save(job);
  }

  async getJob(id: string, businessId?: string): Promise<BackgroundJob | null> {
    const where: any = { id };
    if (businessId !== undefined) {
      where.business_id = businessId;
    }
    return this.jobRepo.findOne({ where });
  }
}
