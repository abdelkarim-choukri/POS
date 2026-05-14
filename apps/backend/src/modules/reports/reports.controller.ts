import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportQueryDto } from './dto/report-query.dto';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { ReportLanguage } from '../../common/i18n/report-labels';

@Controller('business/reports')
@Roles('owner', 'manager')
@UseGuards(RolesGuard)
export class ReportsController {
  constructor(private service: ReportsService) {}

  @Get(':reportId')
  getReport(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('language_preference') lang: string,
    @Param('reportId') reportId: string,
    @Query() query: ReportQueryDto,
  ) {
    const language: ReportLanguage =
      lang === 'ar' || lang === 'en' ? (lang as ReportLanguage) : 'fr';
    return this.service.getReport(businessId, reportId, query, language);
  }
}
