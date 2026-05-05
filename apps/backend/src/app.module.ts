import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_GUARD } from '@nestjs/core';
import { getDatabaseConfig } from './config/database.config';
import { CommonModule } from './common/common.module';
import { AuthModule } from './modules/auth/auth.module';
import { CustomerModule } from './modules/customer/customer.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { BusinessModule } from './modules/business/business.module';
import { TerminalModule } from './modules/terminal/terminal.module';
import { KdsModule } from './modules/kds/kds.module';
import { HealthModule } from './modules/health/health.module';
import { JobModule } from './modules/jobs/job.module';
import { PromotionModule } from './modules/promotion/promotion.module';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    TypeOrmModule.forRootAsync({
      useFactory: getDatabaseConfig,
    }),
    CommonModule,
    JobModule,
    AuthModule,
    SuperAdminModule,
    BusinessModule,
    CustomerModule,
    PromotionModule,
    TerminalModule,
    KdsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AppModule {}
