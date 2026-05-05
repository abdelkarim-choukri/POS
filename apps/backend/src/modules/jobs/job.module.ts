import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { BackgroundJob } from '../../common/entities/background-job.entity';
import { JobService } from './job.service';
import { JobController } from './job.controller';
import { RedisLockService, REDIS_CLIENT } from './redis-lock.service';
import Redis from 'ioredis';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([BackgroundJob]),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'redis',
        port: parseInt(process.env.REDIS_PORT || '6379'),
      },
    }),
  ],
  controllers: [JobController],
  providers: [
    JobService,
    RedisLockService,
    {
      provide: REDIS_CLIENT,
      useFactory: () =>
        new Redis({
          host: process.env.REDIS_HOST || 'redis',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        }),
    },
  ],
  exports: [JobService, RedisLockService],
})
export class JobModule {}
