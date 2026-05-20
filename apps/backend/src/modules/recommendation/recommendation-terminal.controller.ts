import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators';
import { RecommendationService } from './recommendation.service';
import { ResolveTemplateQueryDto } from './dto/recommendation.dto';

@ApiTags('Recommendations (Terminal)')
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
