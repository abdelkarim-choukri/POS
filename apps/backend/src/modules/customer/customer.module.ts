import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerController } from './customer.controller';
import { CustomerService } from './customer.service';
import { Customer } from '../../common/entities/customer.entity';
import { CustomerGrade } from '../../common/entities/customer-grade.entity';
import { CustomerLabel } from '../../common/entities/customer-label.entity';
import { CustomerLabelAssignment } from '../../common/entities/customer-label-assignment.entity';
import { CustomerAttribute } from '../../common/entities/customer-attribute.entity';
import { CustomerAttributeValue } from '../../common/entities/customer-attribute-value.entity';
import { CustomerPointsHistory } from '../../common/entities/customer-points-history.entity';
import { Transaction } from '../../common/entities/transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Customer, CustomerGrade, CustomerLabel, CustomerLabelAssignment,
      CustomerAttribute, CustomerAttributeValue, CustomerPointsHistory,
      Transaction,
    ]),
  ],
  controllers: [CustomerController],
  providers: [CustomerService],
  exports: [CustomerService],
})
export class CustomerModule {}
