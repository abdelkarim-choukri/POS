import { Controller, Get, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { JobService } from './job.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';

@Controller('business')
@UseGuards(RolesGuard)
export class JobController {
  constructor(private jobService: JobService) {}

  // [XCC-055] Get job status — scoped to caller's business
  @Get('jobs/:id')
  @Roles('owner', 'manager', 'employee')
  async getJob(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    const job = await this.jobService.getJob(id, businessId);
    if (!job) throw new NotFoundException();
    return job;
  }
}
