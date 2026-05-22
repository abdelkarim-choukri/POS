import { Controller, Get, Post, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public, Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards/roles.guard';
import { PlatformAdminService } from './platform-admin.service';
import { ListVersionLogEntriesQueryDto, ValidateAddressDto } from './dto/platform-admin.dto';

@ApiTags('Platform Admin')
@Controller('auth')
@UseGuards(RolesGuard)
export class PlatformAdminAuthController {
  constructor(private service: PlatformAdminService) {}

  // ── Trade categories public tree (ADM-001) ────────────────────────────────

  @Public()
  @Get('trade-categories/tree')
  listTradeCategoryTree() {
    return this.service.listTradeCategoryTree();
  }

  // ── Version log (ADM-040–041) ─────────────────────────────────────────────

  @Roles('owner', 'manager', 'super_admin')
  @Get('version-log/menus')
  listVersionLogMenus() {
    return this.service.listVersionLogMenus();
  }

  @Roles('owner', 'manager', 'super_admin')
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
