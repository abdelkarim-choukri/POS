import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { Public } from '../../common/decorators';
import { PlatformAdminService } from './platform-admin.service';
import { ListVersionLogEntriesQueryDto, ValidateAddressDto } from './dto/platform-admin.dto';

@Controller('auth')
export class PlatformAdminAuthController {
  constructor(private service: PlatformAdminService) {}

  // ── Trade categories public tree (ADM-001) ────────────────────────────────

  @Public()
  @Get('trade-categories/tree')
  listTradeCategoryTree() {
    return this.service.listTradeCategoryTree();
  }

  // ── Version log (ADM-040–041) ─────────────────────────────────────────────

  @Get('version-log/menus')
  listVersionLogMenus() {
    return this.service.listVersionLogMenus();
  }

  @Get('version-log/entries')
  listVersionLogEntries(@Query() query: ListVersionLogEntriesQueryDto) {
    return this.service.listVersionLogEntries(query);
  }

  // ── Morocco address picker (ADM-070–071) ──────────────────────────────────

  @Public()
  @Get('regions/tree')
  getMoroccoRegionsTree() {
    return this.service.getMoroccoRegionsTree();
  }

  @Public()
  @Post('regions/validate')
  validateAddress(@Body() dto: ValidateAddressDto) {
    return this.service.validateAddress(dto);
  }
}
