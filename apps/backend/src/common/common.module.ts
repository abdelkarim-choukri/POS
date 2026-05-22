import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { SimplTvaService } from './services/simpl-tva.service';
import { EventGateway } from './gateways/event.gateway';

@Global()
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: () => {
        const s = process.env.JWT_SECRET;
        if (!s) throw new Error('JWT_SECRET environment variable is required');
        return { secret: s };
      },
    }),
  ],
  providers: [SimplTvaService, EventGateway],
  exports: [SimplTvaService, EventGateway, JwtModule],
})
export class CommonModule {}
