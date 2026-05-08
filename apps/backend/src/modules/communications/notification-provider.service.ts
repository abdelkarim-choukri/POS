import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

export interface SendParams {
  channel: string;
  to: string;
  subject?: string;
  body: string;
  fromAddress?: string;
}

export interface SendResult {
  success: boolean;
  provider_message_id: string;
  error?: string;
}

// TODO: replace stub with real provider integrations (Infobip/Twilio for SMS,
// SendGrid/SES for email, Meta Cloud API for WhatsApp).
// To swap in a real provider: implement send() using the provider's SDK.
// No other code changes needed — all callers go through this service.
@Injectable()
export class NotificationProviderService {
  async send(params: SendParams): Promise<SendResult> {
    console.log(
      `[NotificationProviderService] stub send — channel=${params.channel} to=${params.to}`,
    );
    return {
      success: true,
      provider_message_id: `stub-${randomUUID()}`,
    };
  }
}
