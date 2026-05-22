import {
  Controller, Post, Param, Body, HttpCode, HttpStatus, Headers,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { createHmac, timingSafeEqual } from 'crypto';
import { Public } from '../../common/decorators/public.decorator';
import { NotificationSendService } from './notification-send.service';
import { OptOutDto, WebhookPayloadDto } from './dto/notifications.dto';

@ApiTags('Notifications (Public)')
@Controller()
export class NotificationsPublicController {
  constructor(private readonly sendService: NotificationSendService) {}

  // ── COM-053: Provider delivery webhook ────────────────────────────────────
  @Post('webhooks/notifications/:provider')
  @Public()
  @HttpCode(HttpStatus.OK)
  handleWebhook(
    @Param('provider') provider: string,
    @Headers('x-webhook-signature') signature: string | undefined,
    @Body() body: WebhookPayloadDto,
  ) {
    const envKey = `WEBHOOK_SECRET_${provider.toUpperCase().replace(/-/g, '_')}`;
    const secret = process.env[envKey];
    if (!secret) {
      throw new ForbiddenException({ error: 'WEBHOOK_NOT_CONFIGURED', message: 'Webhook not configured for this provider' });
    }
    if (!signature) {
      throw new ForbiddenException({ error: 'WEBHOOK_MISSING_SIGNATURE', message: 'Missing signature header' });
    }
    const expected = createHmac('sha256', secret)
      .update(JSON.stringify(body))
      .digest('hex');
    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new ForbiddenException({ error: 'WEBHOOK_INVALID_SIGNATURE', message: 'Invalid webhook signature' });
    }
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
