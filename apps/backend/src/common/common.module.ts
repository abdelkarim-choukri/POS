import { Global, Module } from '@nestjs/common';
import { SimplTvaService } from './services/simpl-tva.service';
import { EventGateway } from './gateways/event.gateway';

/**
 * Global module for shared services that any feature module may inject.
 * Mark @Global() so consumers don't need to import CommonModule themselves.
 */
@Global()
@Module({
  providers: [SimplTvaService, EventGateway],
  exports: [SimplTvaService, EventGateway],
})
export class CommonModule {}
