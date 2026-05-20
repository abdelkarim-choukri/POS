import {
  Controller, Get, Post, Patch, Delete, Put, Body, Param, Query,
  UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CommunicationsService } from './communications.service';
import { CurrentUser, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import {
  CreateBusinessAnnouncementDto, UpdateBusinessAnnouncementDto,
  UpsertNotificationChannelDto, TestChannelDto,
} from './dto/communications.dto';

@ApiTags('Communications')
@Controller('business')
@UseGuards(RolesGuard)
export class CommunicationsController {
  constructor(private readonly service: CommunicationsService) {}

  // ── COM-005: Platform announcements for this business ──────────────────────
  @Get('platform-announcements')
  @Roles('owner', 'manager', 'employee')
  getActivePlatformAnnouncements(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.getActivePlatformAnnouncements(businessId, userId);
  }

  // ── COM-006: Dismiss a platform announcement ───────────────────────────────
  @Post('platform-announcements/:id/dismiss')
  @Roles('owner', 'manager', 'employee')
  @HttpCode(HttpStatus.OK)
  dismissPlatformAnnouncement(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.service.dismissPlatformAnnouncement(id, userId);
  }

  // ── COM-010: Business announcements CRUD ───────────────────────────────────
  @Get('announcements')
  @Roles('owner', 'manager', 'employee')
  listBusinessAnnouncements(@CurrentUser('business_id') businessId: string) {
    return this.service.listBusinessAnnouncements(businessId);
  }

  @Post('announcements')
  @Roles('owner', 'manager')
  createBusinessAnnouncement(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateBusinessAnnouncementDto,
  ) {
    return this.service.createBusinessAnnouncement(businessId, dto, userId);
  }

  // ── COM-011: Announcements for current user — must be before /:id ──────────
  @Get('announcements/for-me')
  @Roles('owner', 'manager', 'employee')
  getAnnouncementsForMe(
    @CurrentUser('business_id') businessId: string,
    @CurrentUser('role') userRole: string,
  ) {
    return this.service.getAnnouncementsForMe(businessId, userRole);
  }

  @Patch('announcements/:id')
  @Roles('owner', 'manager')
  updateBusinessAnnouncement(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
    @Body() dto: UpdateBusinessAnnouncementDto,
  ) {
    return this.service.updateBusinessAnnouncement(id, businessId, dto);
  }

  @Delete('announcements/:id')
  @Roles('owner', 'manager')
  @HttpCode(HttpStatus.OK)
  deleteBusinessAnnouncement(
    @Param('id') id: string,
    @CurrentUser('business_id') businessId: string,
  ) {
    return this.service.deleteBusinessAnnouncement(id, businessId);
  }

  // ── COM-020: Get channel configs ───────────────────────────────────────────
  @Get('notifications/channels')
  @Roles('owner')
  getChannels(@CurrentUser('business_id') businessId: string) {
    return this.service.getChannels(businessId);
  }

  // ── COM-021: Upsert channel config ────────────────────────────────────────
  @Put('notifications/channels')
  @Roles('owner')
  upsertChannel(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: UpsertNotificationChannelDto,
  ) {
    return this.service.upsertChannel(businessId, dto);
  }

  // ── COM-022: Test channel ──────────────────────────────────────────────────
  @Post('notifications/channels/test')
  @Roles('owner')
  testChannel(
    @CurrentUser('business_id') businessId: string,
    @Body() dto: TestChannelDto,
  ) {
    return this.service.testChannel(businessId, dto);
  }

  // ── COM-030: Refresh SMS balance ───────────────────────────────────────────
  @Post('notifications/sms/refresh-balance')
  @Roles('owner')
  @HttpCode(HttpStatus.OK)
  refreshSmsBalance(@CurrentUser('business_id') businessId: string) {
    return this.service.refreshSmsBalance(businessId);
  }

  // ── COM-031: Get SMS balance ───────────────────────────────────────────────
  @Get('notifications/sms/balance')
  @Roles('owner')
  getSmsBalance(@CurrentUser('business_id') businessId: string) {
    return this.service.getSmsBalance(businessId);
  }
}
