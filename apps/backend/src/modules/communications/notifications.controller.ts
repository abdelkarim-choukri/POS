import {
  Controller, Get, Post, Patch, Delete, Param, Body, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { RolesGuard } from '../../common/guards';
import { CurrentUser, Roles } from '../../common/decorators';
import { NotificationSendService } from './notification-send.service';
import {
  CreateTemplateDto, UpdateTemplateDto, PreviewTemplateDto,
  SendSingleDto, SendToSegmentDto, SendHistoryQueryDto,
} from './dto/notifications.dto';

@Controller('business')
@UseGuards(RolesGuard)
export class NotificationsController {
  constructor(private readonly sendService: NotificationSendService) {}

  // ── COM-040: List templates ────────────────────────────────────────────────
  @Get('notifications/templates')
  @Roles('owner', 'manager')
  listTemplates(@CurrentUser('business_id') businessId: string) {
    return this.sendService.listTemplates(businessId);
  }

  // ── COM-041: Create template ───────────────────────────────────────────────
  @Post('notifications/templates')
  @Roles('owner', 'manager')
  createTemplate(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: CreateTemplateDto,
  ) {
    return this.sendService.createTemplate(businessId, dto);
  }

  // ── COM-044: Preview — must be declared before /:id ───────────────────────
  @Post('notifications/templates/:id/preview')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  previewTemplate(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
    @Body() dto: PreviewTemplateDto,
  ) {
    return this.sendService.previewTemplate(id, businessId, dto);
  }

  // ── COM-042: Update template ───────────────────────────────────────────────
  @Patch('notifications/templates/:id')
  @Roles('owner', 'manager')
  updateTemplate(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
    @Body() dto: UpdateTemplateDto,
  ) {
    return this.sendService.updateTemplate(id, businessId, dto);
  }

  // ── COM-043: Delete template ───────────────────────────────────────────────
  @Delete('notifications/templates/:id')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  deleteTemplate(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    return this.sendService.deleteTemplate(id, businessId);
  }

  // ── COM-050: Single send ───────────────────────────────────────────────────
  @Post('notifications/send')
  @Roles('owner', 'manager')
  sendSingle(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: SendSingleDto,
  ) {
    return this.sendService.sendSingle(businessId, dto);
  }

  // ── COM-051: Campaign send ─────────────────────────────────────────────────
  @Post('notifications/send-to-segment')
  @Roles('owner', 'manager')
  sendToSegment(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: SendToSegmentDto,
  ) {
    return this.sendService.sendToSegment(businessId, dto);
  }

  // ── COM-052: Send history ──────────────────────────────────────────────────
  @Get('notifications/sends')
  @Roles('owner', 'manager')
  getSendHistory(
    @CurrentUser('business_id') businessId: string,
    @Query() query: SendHistoryQueryDto,
  ) {
    return this.sendService.getSendHistory(businessId, query);
  }
}
