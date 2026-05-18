import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Business } from '../../common/entities/business.entity';
import { resolveDateRange } from '../../common/utils/date-range';
import { ReportLanguage } from '../../common/i18n/report-labels';
import { ReportQueryDto } from './dto/report-query.dto';
import { SalesGenerator } from './generators/sales.generator';
import { PaymentsGenerator } from './generators/payments.generator';
import { CustomersGenerator } from './generators/customers.generator';
import { OperationsGenerator } from './generators/operations.generator';
import { AccountingGenerator } from './generators/accounting.generator';
import { ExistingWrappersGenerator } from './generators/existing-wrappers.generator';
import { InventoryReportsGenerator } from './generators/inventory-reports.generator';

// restaurant only (kitchen-performance)
const RESTAURANT_ONLY_REPORTS = new Set(['kitchen-performance']);

// restaurant + hotel (table reports)
const RESTAURANT_HOTEL_REPORTS = new Set(['sales-by-table', 'table-turnover']);

const ALL_REPORT_IDS = new Set([
  'sales-summary', 'sales-by-hour', 'sales-by-day', 'sales-by-month',
  'sales-by-category', 'sales-by-product', 'sales-by-table',
  'payment-summary', 'cash-report', 'card-report',
  'customer-summary', 'top-customers', 'customer-grades', 'loyalty-summary',
  'employee-performance', 'kitchen-performance', 'table-turnover', 'voids-cancellations',
  'tva-declaration', 'daily-close', 'invoice-register', 'tva-by-rate',
  'promotion-report', 'coupon-report', 'discount-write-offs', 'points-exchange-report',
  // Inventory reports (Phase 12A)
  'stock-position', 'stock-movements', 'vendor-purchases', 'input-tva',
  // Phase 12D reports
  'cogs', 'vendor-balance', 'bill-aging',
]);

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Business) private businessRepo: Repository<Business>,
    private salesGen: SalesGenerator,
    private paymentsGen: PaymentsGenerator,
    private customersGen: CustomersGenerator,
    private operationsGen: OperationsGenerator,
    private accountingGen: AccountingGenerator,
    private wrappersGen: ExistingWrappersGenerator,
    private inventoryGen: InventoryReportsGenerator,
  ) {}

  async getReport(businessId: string, reportId: string, query: ReportQueryDto, lang: ReportLanguage) {
    if (!ALL_REPORT_IDS.has(reportId)) {
      throw new NotFoundException({ error: 'REPORT_NOT_FOUND', message: `Unknown report: ${reportId}` });
    }

    const business = await this.businessRepo.findOne({
      where: { id: businessId },
      relations: ['business_type'],
    });
    if (!business) throw new NotFoundException('Business not found');

    const businessType = business.business_type?.name ?? 'retail';

    if (RESTAURANT_ONLY_REPORTS.has(reportId) && businessType !== 'restaurant') {
      throw new NotFoundException({
        error: 'REPORT_NOT_AVAILABLE',
        message: 'This report is not available for your business type',
      });
    }

    if (
      RESTAURANT_HOTEL_REPORTS.has(reportId) &&
      businessType !== 'restaurant' &&
      businessType !== 'hotel'
    ) {
      throw new NotFoundException({
        error: 'REPORT_NOT_AVAILABLE',
        message: 'This report is not available for your business type',
      });
    }

    const period = resolveDateRange(query.type, query.from, query.to);

    switch (reportId) {
      // Sales
      case 'sales-summary':
        return this.salesGen.salesSummary(businessId, lang, businessType, period, query.type);
      case 'sales-by-hour':
        return this.salesGen.salesByHour(businessId, lang, businessType, period, query.type);
      case 'sales-by-day':
        return this.salesGen.salesByDay(businessId, lang, businessType, period, query.type);
      case 'sales-by-month':
        return this.salesGen.salesByMonth(businessId, lang, businessType, period, query.type);
      case 'sales-by-category':
        return this.salesGen.salesByCategory(businessId, lang, businessType, period, query.type);
      case 'sales-by-product':
        return this.salesGen.salesByProduct(businessId, lang, businessType, period, query.type);
      case 'sales-by-table':
        return this.salesGen.salesByTable(businessId, lang, businessType, period, query.type);
      // Payments
      case 'payment-summary':
        return this.paymentsGen.paymentSummary(businessId, lang, businessType, period, query.type);
      case 'cash-report':
        return this.paymentsGen.cashReport(businessId, lang, businessType, period, query.type);
      case 'card-report':
        return this.paymentsGen.cardReport(businessId, lang, businessType, period, query.type);
      // Customers
      case 'customer-summary':
        return this.customersGen.customerSummary(businessId, lang, businessType, period, query.type);
      case 'top-customers':
        return this.customersGen.topCustomers(businessId, lang, businessType, period, query.type);
      case 'customer-grades':
        return this.customersGen.customerGrades(businessId, lang, businessType, period, query.type);
      case 'loyalty-summary':
        return this.customersGen.loyaltySummary(businessId, lang, businessType, period, query.type);
      // Operations
      case 'employee-performance':
        return this.operationsGen.employeePerformance(businessId, lang, businessType, period, query.type);
      case 'kitchen-performance':
        return this.operationsGen.kitchenPerformance(businessId, lang, businessType, period, query.type);
      case 'table-turnover':
        return this.operationsGen.tableTurnover(businessId, lang, businessType, period, query.type);
      case 'voids-cancellations':
        return this.operationsGen.voidsCancellations(businessId, lang, businessType, period, query.type);
      // TVA & Accounting
      case 'tva-declaration':
        return this.accountingGen.tvaDeclaration(businessId, lang, businessType, period, query.type);
      case 'daily-close':
        return this.accountingGen.dailyClose(businessId, lang, businessType, period, query.type);
      case 'invoice-register': {
        const page = query.page ?? 1;
        const limit = query.limit ?? 500;
        return this.accountingGen.invoiceRegister(businessId, lang, businessType, period, query.type, page, limit);
      }
      case 'tva-by-rate':
        return this.accountingGen.tvaByRate(businessId, lang, businessType, period, query.type);
      // Promotions & Discounts wrappers
      case 'promotion-report':
        return this.wrappersGen.promotionReport(businessId, lang, businessType, period, query.type);
      case 'coupon-report':
        return this.wrappersGen.couponReport(businessId, lang, businessType, period, query.type);
      case 'discount-write-offs':
        return this.wrappersGen.discountWriteOffs(businessId, lang, businessType, period, query.type);
      case 'points-exchange-report':
        return this.wrappersGen.pointsExchangeReport(businessId, lang, businessType, period, query.type);
      // Inventory reports (Phase 12A)
      case 'stock-position':
        return this.inventoryGen.stockPosition(businessId, lang, businessType, period, query.type, {
          warehouse_id: query.warehouse_id,
          category_id: query.category_id,
          low_stock_only: query.low_stock_only,
        });
      case 'stock-movements': {
        const page = query.page ?? 1;
        const limit = query.limit ?? 50;
        return this.inventoryGen.stockMovements(businessId, lang, businessType, period, query.type, {
          warehouse_id: query.warehouse_id,
          product_id: query.product_id,
          movement_type: query.movement_type,
          page,
          limit,
        });
      }
      case 'vendor-purchases':
        return this.inventoryGen.vendorPurchases(businessId, lang, businessType, period, query.type, {
          vendor_id: query.vendor_id,
        });
      case 'input-tva':
        return this.inventoryGen.inputTva(businessId, lang, businessType, period, query.type);
      // Phase 12D reports
      case 'cogs':
        return this.inventoryGen.cogs(businessId, lang, businessType, period, query.type, {
          warehouse_id: query.warehouse_id,
          category_id: query.category_id,
        });
      case 'vendor-balance':
        return this.inventoryGen.vendorBalance(businessId, lang, businessType, period, query.type, {
          as_of_date: query.as_of_date,
        });
      case 'bill-aging':
        return this.inventoryGen.billAging(businessId, lang, businessType, period, query.type, {
          as_of_date: query.as_of_date,
        });
      default:
        throw new NotFoundException({ error: 'REPORT_NOT_IMPLEMENTED', message: `Report ${reportId} is not implemented yet` });
    }
  }
}
