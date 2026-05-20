import {
  Controller, Get, Post, Patch, Put, Delete,
  Param, Body, Query, Request, UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { RecommendationService } from './recommendation.service';
import {
  CreateTemplateDto, UpdateTemplateDto, SetTemplateItemsDto, TemplateQueryDto,
} from './dto/recommendation.dto';

@ApiTags('Recommendations')
@Controller('business')
@UseGuards(RolesGuard)
export class RecommendationController {
  constructor(private recommendationService: RecommendationService) {}

  // REC-001
  @Get('recommendation-templates')
  @Roles('owner', 'manager')
  listTemplates(@Request() req: any, @Query() query: TemplateQueryDto) {
    return this.recommendationService.listTemplates(req.user.business_id, query);
  }

  // REC-020 — declared before /:id routes to avoid route collision
  @Get('recommendation-templates/featured')
  @Roles('owner', 'manager', 'employee')
  getFeaturedItems(@Request() req: any) {
    return this.recommendationService.getFeaturedItems(req.user.business_id);
  }

  // REC-002
  @Post('recommendation-templates')
  @Roles('owner', 'manager')
  createTemplate(@Request() req: any, @Body() dto: CreateTemplateDto) {
    return this.recommendationService.createTemplate(req.user.business_id, dto);
  }

  // REC-003
  @Patch('recommendation-templates/:id')
  @Roles('owner', 'manager')
  updateTemplate(@Param('id') id: string, @Request() req: any, @Body() dto: UpdateTemplateDto) {
    return this.recommendationService.updateTemplate(id, req.user.business_id, dto);
  }

  // REC-004
  @Delete('recommendation-templates/:id')
  @Roles('owner', 'manager')
  deleteTemplate(@Param('id') id: string, @Request() req: any) {
    return this.recommendationService.deleteTemplate(id, req.user.business_id);
  }

  // REC-005
  @Put('recommendation-templates/:id/items')
  @Roles('owner', 'manager')
  setTemplateItems(@Param('id') id: string, @Request() req: any, @Body() dto: SetTemplateItemsDto) {
    return this.recommendationService.setTemplateItems(id, req.user.business_id, dto);
  }
}
