import {
  Controller, Post, Param, Body, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { NotificationSendService } from './notification-send.service';
import { OptOutDto, WebhookPayloadDto } from './dto/notifications.dto';

@ApiTags('Notifications (Public)')
@Controller()
export class NotificationsPublicController {
  constructor(private readonly sendService: NotificationSendService) {}

  // ── COM-053: Provider delivery webhook ────────────────────────────────────
  // TODO: verify provider signature (provider-specific HMAC/shared secret) before processing
  @Post('webhooks/notifications/:provider')
  @Public()
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Param('provider') provider: string,
    @Body() body: WebhookPayloadDto,
  ) {
    return this.sendService.handleWebhook(provider, body);
  }

  // ── COM-060: Customer opt-out (one-click link in marketing messages) ───────
  @Post('public/notifications/opt-out')
  @Public()
  @HttpCode(HttpStatus.OK)
  optOut(@Body() dto: OptOutDto) {
    return this.sendService.optOut(dto.token);
  }
}
