import { Global, Module } from '@nestjs/common';
import { SimplTvaService } from './services/simpl-tva.service';

/**
 * Global module for shared services that any feature module may inject.
 * Mark @Global() so consumers don't need to import CommonModule themselves.
 */
@Global()
@Module({
  providers: [SimplTvaService],
  exports: [SimplTvaService],
})
export class CommonModule {}
