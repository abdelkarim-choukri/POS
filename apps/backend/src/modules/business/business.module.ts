import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusinessController } from './business.controller';
import { BusinessService } from './business.service';
import { Category } from '../../common/entities/category.entity';
import { Product } from '../../common/entities/product.entity';
import { ProductVariant } from '../../common/entities/product-variant.entity';
import { ModifierGroup } from '../../common/entities/modifier-group.entity';
import { Modifier } from '../../common/entities/modifier.entity';
import { ProductModifierGroup } from '../../common/entities/product-modifier-group.entity';
import { User } from '../../common/entities/user.entity';
import { ClockEntry } from '../../common/entities/clock-entry.entity';
import { Location } from '../../common/entities/location.entity';
import { Terminal } from '../../common/entities/terminal.entity';
import { Transaction } from '../../common/entities/transaction.entity';
import { Refund } from '../../common/entities/refund.entity';
import { Void } from '../../common/entities/void.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Category, Product, ProductVariant,
      ModifierGroup, Modifier, ProductModifierGroup,
      User, ClockEntry, Location, Terminal,
      Transaction, Refund, Void,
    ]),
  ],
  controllers: [BusinessController],
  providers: [BusinessService],
})
export class BusinessModule {}
