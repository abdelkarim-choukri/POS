export type ReportLanguage = 'fr' | 'ar' | 'en';

export interface ReportLabelSet {
  // Summary KPI labels — Sales
  total_ttc: string;
  total_ht: string;
  total_tva: string;
  orders: string;
  avg_order_value: string;
  customers: string;
  discount_total: string;
  peak_hour: string;
  peak_revenue: string;
  quietest_hour: string;
  best_day: string;
  avg_monthly_revenue: string;
  categories_with_sales: string;
  top_category: string;
  total_products_sold: string;
  unique_products: string;
  total_table_revenue: string;
  total_sessions: string;
  avg_revenue_per_table: string;
  avg_session_duration: string;
  // Column labels — Sales
  date: string;
  day_of_week: string;
  hour: string;
  month: string;
  product_name: string;
  category_name: string;
  quantity_sold: string;
  avg_unit_price: string;
  payment_method: string;
  transaction_count: string;
  employee_name: string;
  invoice_number: string;
  percentage_of_total: string;
  table_number: string;
  area_name: string;
  sessions_count: string;
  avg_per_session: string;
  avg_duration_minutes: string;
  points_earned: string;
  points_redeemed: string;
  // Payments labels
  total_collected: string;
  payment_methods_used: string;
  cash_total: string;
  cash_transactions: string;
  cash_share: string;
  card_total: string;
  card_transactions: string;
  card_share: string;
  // Customer labels
  total_customers: string;
  new_customers: string;
  returning_customers: string;
  total_points_issued: string;
  transactions_with_customer: string;
  customer_code: string;
  phone: string;
  grade_name: string;
  visit_count: string;
  total_spent: string;
  avg_per_visit: string;
  points_balance: string;
  total_customer_revenue: string;
  avg_spend_per_customer: string;
  total_graded_customers: string;
  ungraded_customers: string;
  avg_spend_per_grade: string;
  customer_count: string;
  avg_per_customer: string;
  avg_points_balance: string;
  total_points_outstanding: string;
  total_points_redeemed: string;
  net_points_issued: string;
  points_adjusted: string;
  net_change: string;
  customer_name: string;
  // Operations labels
  total_employees: string;
  top_performer: string;
  orders_processed: string;
  voids_count: string;
  items_prepared: string;
  items_cancelled_total: string;
  avg_prep_time: string;
  items_new: string;
  items_preparing: string;
  items_ready: string;
  items_served: string;
  items_cancelled: string;
  avg_duration: string;
  avg_covers: string;
  revenue_per_cover: string;
  avg_guest_count: string;
  total_voided: string;
  voided_amount: string;
  cancelled_sessions_count: string;
  transaction_number: string;
  reason: string;
  opened_by_name: string;
  items_count: string;
  // TVA & Accounting
  gross_ttc: string;
  net_ttc: string;
  cash_payments_row: string;
  card_payments_row: string;
  coupons_redeemed_row: string;
  metric: string;
  total_invoices: string;
  tva_rate: string;
  weighted_avg_rate: string;
  tva_rate_20_ht: string;
  tva_rate_20_tva: string;
  tva_rate_10_ht: string;
  tva_rate_10_tva: string;
  tva_rate_7_ht: string;
  tva_rate_7_tva: string;
  tva_rate_0_ht: string;
  // Promotions & Discounts wrappers
  total_promotions_active: string;
  total_redemptions: string;
  total_discount_given: string;
  promotion_name: string;
  promotion_type: string;
  redemption_count: string;
  avg_discount_per_use: string;
  total_issued: string;
  total_redeemed_label: string;
  redemption_rate: string;
  coupon_type_name: string;
  total_expired: string;
  total_voided_label: string;
  discount_given: string;
  total_write_offs_count: string;
  total_write_off_amount: string;
  terminal_id_label: string;
  write_off_count_label: string;
  total_points_spent: string;
  unique_customers_served: string;
  rule_name: string;
  points_spent: string;
  items_issued: string;
}

export const REPORT_LABELS: Record<ReportLanguage, ReportLabelSet> = {
  fr: {
    // Sales
    total_ttc: 'Total TTC',
    total_ht: 'Total HT',
    total_tva: 'TVA',
    orders: 'Commandes',
    avg_order_value: 'Panier moyen',
    customers: 'Clients',
    discount_total: 'Remises',
    peak_hour: 'Heure de pointe',
    peak_revenue: 'Chiffre de pointe',
    quietest_hour: 'Heure creuse',
    best_day: 'Meilleure journée',
    avg_monthly_revenue: 'Revenu mensuel moyen',
    categories_with_sales: 'Catégories avec ventes',
    top_category: 'Top catégorie',
    total_products_sold: 'Produits vendus',
    unique_products: 'Produits uniques',
    total_table_revenue: 'Chiffre tables',
    total_sessions: 'Sessions tables',
    avg_revenue_per_table: 'Revenu moyen par table',
    avg_session_duration: 'Durée moyenne session',
    date: 'Date',
    day_of_week: 'Jour',
    hour: 'Heure',
    month: 'Mois',
    product_name: 'Produit',
    category_name: 'Catégorie',
    quantity_sold: 'Qté vendue',
    avg_unit_price: 'Prix moyen unitaire',
    payment_method: 'Mode de paiement',
    transaction_count: 'Transactions',
    employee_name: 'Employé',
    invoice_number: 'N° facture',
    percentage_of_total: '% du total',
    table_number: 'Table',
    area_name: 'Zone',
    sessions_count: 'Sessions',
    avg_per_session: 'Moy. par session',
    avg_duration_minutes: 'Durée moy. (min)',
    points_earned: 'Points gagnés',
    points_redeemed: 'Points utilisés',
    // Payments
    total_collected: 'Total encaissé',
    payment_methods_used: 'Modes utilisés',
    cash_total: 'Total espèces',
    cash_transactions: 'Transactions espèces',
    cash_share: 'Part espèces (%)',
    card_total: 'Total carte',
    card_transactions: 'Transactions carte',
    card_share: 'Part carte (%)',
    // Customers
    total_customers: 'Clients actifs',
    new_customers: 'Nouveaux clients',
    returning_customers: 'Clients récurrents',
    total_points_issued: 'Points émis (période)',
    transactions_with_customer: 'Achats avec client',
    customer_code: 'Code client',
    phone: 'Téléphone',
    grade_name: 'Grade',
    visit_count: 'Visites',
    total_spent: 'Total dépensé',
    avg_per_visit: 'Moy. par visite',
    points_balance: 'Solde points',
    total_customer_revenue: 'CA clients',
    avg_spend_per_customer: 'Moy. par client',
    total_graded_customers: 'Clients classés',
    ungraded_customers: 'Sans grade',
    avg_spend_per_grade: 'Dépense moy. par grade',
    customer_count: 'Nombre de clients',
    avg_per_customer: 'Moy. par client',
    avg_points_balance: 'Solde moy. (points)',
    total_points_outstanding: 'Solde total (points)',
    total_points_redeemed: 'Points utilisés (période)',
    net_points_issued: 'Points nets émis',
    points_adjusted: 'Ajustements',
    net_change: 'Variation nette',
    customer_name: 'Nom client',
    // Operations
    total_employees: 'Employés actifs',
    top_performer: 'Meilleur employé',
    orders_processed: 'Commandes traitées',
    voids_count: 'Annulations',
    items_prepared: 'Articles préparés',
    items_cancelled_total: 'Articles annulés',
    avg_prep_time: 'Temps moy. préparation',
    items_new: 'Nouveaux',
    items_preparing: 'En préparation',
    items_ready: 'Prêts',
    items_served: 'Servis',
    items_cancelled: 'Annulés',
    avg_duration: 'Durée moyenne',
    avg_covers: 'Couverts moyens',
    revenue_per_cover: 'Revenu par couvert',
    avg_guest_count: 'Moy. convives',
    total_voided: 'Transactions annulées',
    voided_amount: 'Montant annulé',
    cancelled_sessions_count: 'Sessions annulées',
    transaction_number: 'N° transaction',
    reason: 'Motif',
    opened_by_name: 'Ouvert par',
    items_count: 'Nb articles',
    // TVA & Accounting
    gross_ttc: 'Total brut TTC',
    net_ttc: 'Total net TTC',
    cash_payments_row: 'Paiements espèces',
    card_payments_row: 'Paiements carte',
    coupons_redeemed_row: 'Coupons utilisés',
    metric: 'Indicateur',
    total_invoices: 'Total factures',
    tva_rate: 'Taux TVA',
    weighted_avg_rate: 'Taux moyen pondéré',
    tva_rate_20_ht: 'Base 20% HT',
    tva_rate_20_tva: 'TVA 20%',
    tva_rate_10_ht: 'Base 10% HT',
    tva_rate_10_tva: 'TVA 10%',
    tva_rate_7_ht: 'Base 7% HT',
    tva_rate_7_tva: 'TVA 7%',
    tva_rate_0_ht: 'Base 0% HT',
    // Promotions & Discounts wrappers
    total_promotions_active: 'Promotions actives',
    total_redemptions: 'Total utilisations',
    total_discount_given: 'Remises accordées',
    promotion_name: 'Promotion',
    promotion_type: 'Type',
    redemption_count: 'Utilisations',
    avg_discount_per_use: 'Remise moy. / utilisation',
    total_issued: 'Total émis',
    total_redeemed_label: 'Total utilisés',
    redemption_rate: 'Taux utilisation',
    coupon_type_name: 'Type coupon',
    total_expired: 'Expirés',
    total_voided_label: 'Annulés',
    discount_given: 'Remise accordée',
    total_write_offs_count: "Nombre d'annulations",
    total_write_off_amount: 'Montant total annulé',
    terminal_id_label: 'Terminal',
    write_off_count_label: 'Nombre',
    total_points_spent: 'Points dépensés (total)',
    unique_customers_served: 'Clients uniques',
    rule_name: 'Règle',
    points_spent: 'Points dépensés',
    items_issued: 'Articles attribués',
  },
  ar: {
    // Sales
    total_ttc: 'المجموع الكلي',
    total_ht: 'المجموع قبل الضريبة',
    total_tva: 'الضريبة',
    orders: 'الطلبات',
    avg_order_value: 'متوسط الطلب',
    customers: 'العملاء',
    discount_total: 'الخصومات',
    peak_hour: 'ساعة الذروة',
    peak_revenue: 'إيرادات الذروة',
    quietest_hour: 'أهدأ ساعة',
    best_day: 'أفضل يوم',
    avg_monthly_revenue: 'متوسط الإيراد الشهري',
    categories_with_sales: 'الفئات المباعة',
    top_category: 'أفضل فئة',
    total_products_sold: 'المنتجات المباعة',
    unique_products: 'منتجات فريدة',
    total_table_revenue: 'إيراد الطاولات',
    total_sessions: 'جلسات الطاولات',
    avg_revenue_per_table: 'متوسط إيراد الطاولة',
    avg_session_duration: 'متوسط مدة الجلسة',
    date: 'التاريخ',
    day_of_week: 'اليوم',
    hour: 'الساعة',
    month: 'الشهر',
    product_name: 'المنتج',
    category_name: 'الفئة',
    quantity_sold: 'الكمية المباعة',
    avg_unit_price: 'متوسط سعر الوحدة',
    payment_method: 'طريقة الدفع',
    transaction_count: 'المعاملات',
    employee_name: 'الموظف',
    invoice_number: 'رقم الفاتورة',
    percentage_of_total: '% من المجموع',
    table_number: 'الطاولة',
    area_name: 'المنطقة',
    sessions_count: 'الجلسات',
    avg_per_session: 'متوسط لكل جلسة',
    avg_duration_minutes: 'متوسط المدة (دقيقة)',
    points_earned: 'النقاط المكتسبة',
    points_redeemed: 'النقاط المستخدمة',
    // Payments
    total_collected: 'إجمالي المحصل',
    payment_methods_used: 'طرق الدفع المستخدمة',
    cash_total: 'إجمالي النقد',
    cash_transactions: 'معاملات نقدية',
    cash_share: 'حصة النقد (%)',
    card_total: 'إجمالي البطاقة',
    card_transactions: 'معاملات البطاقة',
    card_share: 'حصة البطاقة (%)',
    // Customers
    total_customers: 'العملاء النشطون',
    new_customers: 'عملاء جدد',
    returning_customers: 'عملاء متكررون',
    total_points_issued: 'النقاط الممنوحة',
    transactions_with_customer: 'مشتريات مع عميل',
    customer_code: 'رمز العميل',
    phone: 'الهاتف',
    grade_name: 'الدرجة',
    visit_count: 'الزيارات',
    total_spent: 'إجمالي الإنفاق',
    avg_per_visit: 'متوسط لكل زيارة',
    points_balance: 'رصيد النقاط',
    total_customer_revenue: 'إيراد العملاء',
    avg_spend_per_customer: 'متوسط الإنفاق',
    total_graded_customers: 'عملاء مصنفون',
    ungraded_customers: 'بدون درجة',
    avg_spend_per_grade: 'متوسط الإنفاق بالدرجة',
    customer_count: 'عدد العملاء',
    avg_per_customer: 'متوسط لكل عميل',
    avg_points_balance: 'متوسط رصيد النقاط',
    total_points_outstanding: 'الرصيد الإجمالي (نقاط)',
    total_points_redeemed: 'النقاط المستخدمة',
    net_points_issued: 'النقاط الصافية',
    points_adjusted: 'التعديلات',
    net_change: 'التغيير الصافي',
    customer_name: 'اسم العميل',
    // Operations
    total_employees: 'الموظفون النشطون',
    top_performer: 'أفضل موظف',
    orders_processed: 'الطلبات المعالجة',
    voids_count: 'الإلغاءات',
    items_prepared: 'العناصر المحضرة',
    items_cancelled_total: 'العناصر الملغاة',
    avg_prep_time: 'متوسط وقت التحضير',
    items_new: 'جديد',
    items_preparing: 'قيد التحضير',
    items_ready: 'جاهز',
    items_served: 'تم التقديم',
    items_cancelled: 'ملغاة',
    avg_duration: 'المدة المتوسطة',
    avg_covers: 'متوسط الأغطية',
    revenue_per_cover: 'الإيراد لكل غطاء',
    avg_guest_count: 'متوسط الضيوف',
    total_voided: 'المعاملات الملغاة',
    voided_amount: 'المبلغ الملغى',
    cancelled_sessions_count: 'الجلسات الملغاة',
    transaction_number: 'رقم المعاملة',
    reason: 'السبب',
    opened_by_name: 'فتح بواسطة',
    items_count: 'عدد العناصر',
    // TVA & Accounting
    gross_ttc: 'الإجمالي الكلي قبل الخصم',
    net_ttc: 'الإجمالي الصافي',
    cash_payments_row: 'مدفوعات نقدية',
    card_payments_row: 'مدفوعات البطاقة',
    coupons_redeemed_row: 'القسائم المستخدمة',
    metric: 'المؤشر',
    total_invoices: 'إجمالي الفواتير',
    tva_rate: 'نسبة الضريبة',
    weighted_avg_rate: 'المعدل المتوسط المرجح',
    tva_rate_20_ht: 'أساس 20% قبل الضريبة',
    tva_rate_20_tva: 'ضريبة 20%',
    tva_rate_10_ht: 'أساس 10% قبل الضريبة',
    tva_rate_10_tva: 'ضريبة 10%',
    tva_rate_7_ht: 'أساس 7% قبل الضريبة',
    tva_rate_7_tva: 'ضريبة 7%',
    tva_rate_0_ht: 'أساس 0% قبل الضريبة',
    // Promotions & Discounts wrappers
    total_promotions_active: 'العروض النشطة',
    total_redemptions: 'إجمالي الاستخدامات',
    total_discount_given: 'الخصومات الممنوحة',
    promotion_name: 'العرض',
    promotion_type: 'النوع',
    redemption_count: 'الاستخدامات',
    avg_discount_per_use: 'متوسط الخصم لكل استخدام',
    total_issued: 'إجمالي الإصدار',
    total_redeemed_label: 'إجمالي المستخدمة',
    redemption_rate: 'معدل الاستخدام',
    coupon_type_name: 'نوع القسيمة',
    total_expired: 'المنتهية الصلاحية',
    total_voided_label: 'الملغاة',
    discount_given: 'الخصم الممنوح',
    total_write_offs_count: 'إجمالي الإلغاءات',
    total_write_off_amount: 'المبلغ الإجمالي الملغى',
    terminal_id_label: 'الجهاز',
    write_off_count_label: 'العدد',
    total_points_spent: 'النقاط المنفقة (إجمالي)',
    unique_customers_served: 'العملاء الفريدون',
    rule_name: 'القاعدة',
    points_spent: 'النقاط المنفقة',
    items_issued: 'العناصر الممنوحة',
  },
  en: {
    // Sales
    total_ttc: 'Total (incl. tax)',
    total_ht: 'Total (excl. tax)',
    total_tva: 'VAT',
    orders: 'Orders',
    avg_order_value: 'Avg Order Value',
    customers: 'Customers',
    discount_total: 'Discounts',
    peak_hour: 'Peak Hour',
    peak_revenue: 'Peak Revenue',
    quietest_hour: 'Quietest Hour',
    best_day: 'Best Day',
    avg_monthly_revenue: 'Avg Monthly Revenue',
    categories_with_sales: 'Categories with Sales',
    top_category: 'Top Category',
    total_products_sold: 'Products Sold',
    unique_products: 'Unique Products',
    total_table_revenue: 'Table Revenue',
    total_sessions: 'Table Sessions',
    avg_revenue_per_table: 'Avg Revenue per Table',
    avg_session_duration: 'Avg Session Duration',
    date: 'Date',
    day_of_week: 'Day of Week',
    hour: 'Hour',
    month: 'Month',
    product_name: 'Product',
    category_name: 'Category',
    quantity_sold: 'Qty Sold',
    avg_unit_price: 'Avg Unit Price',
    payment_method: 'Payment Method',
    transaction_count: 'Transactions',
    employee_name: 'Employee',
    invoice_number: 'Invoice #',
    percentage_of_total: '% of Total',
    table_number: 'Table',
    area_name: 'Area',
    sessions_count: 'Sessions',
    avg_per_session: 'Avg per Session',
    avg_duration_minutes: 'Avg Duration (min)',
    points_earned: 'Points Earned',
    points_redeemed: 'Points Redeemed',
    // Payments
    total_collected: 'Total Collected',
    payment_methods_used: 'Payment Methods Used',
    cash_total: 'Cash Total',
    cash_transactions: 'Cash Transactions',
    cash_share: 'Cash Share (%)',
    card_total: 'Card Total',
    card_transactions: 'Card Transactions',
    card_share: 'Card Share (%)',
    // Customers
    total_customers: 'Active Customers',
    new_customers: 'New Customers',
    returning_customers: 'Returning Customers',
    total_points_issued: 'Points Issued (Period)',
    transactions_with_customer: 'Purchases with Customer',
    customer_code: 'Customer Code',
    phone: 'Phone',
    grade_name: 'Grade',
    visit_count: 'Visits',
    total_spent: 'Total Spent',
    avg_per_visit: 'Avg per Visit',
    points_balance: 'Points Balance',
    total_customer_revenue: 'Customer Revenue',
    avg_spend_per_customer: 'Avg Spend per Customer',
    total_graded_customers: 'Graded Customers',
    ungraded_customers: 'Ungraded Customers',
    avg_spend_per_grade: 'Avg Spend per Grade',
    customer_count: 'Customer Count',
    avg_per_customer: 'Avg per Customer',
    avg_points_balance: 'Avg Points Balance',
    total_points_outstanding: 'Total Outstanding Points',
    total_points_redeemed: 'Points Redeemed (Period)',
    net_points_issued: 'Net Points Issued',
    points_adjusted: 'Adjustments',
    net_change: 'Net Change',
    customer_name: 'Customer Name',
    // Operations
    total_employees: 'Active Employees',
    top_performer: 'Top Performer',
    orders_processed: 'Orders Processed',
    voids_count: 'Voids',
    items_prepared: 'Items Prepared',
    items_cancelled_total: 'Items Cancelled',
    avg_prep_time: 'Avg Prep Time',
    items_new: 'New',
    items_preparing: 'Preparing',
    items_ready: 'Ready',
    items_served: 'Served',
    items_cancelled: 'Cancelled',
    avg_duration: 'Avg Duration',
    avg_covers: 'Avg Covers',
    revenue_per_cover: 'Revenue per Cover',
    avg_guest_count: 'Avg Guests',
    total_voided: 'Voided Transactions',
    voided_amount: 'Voided Amount',
    cancelled_sessions_count: 'Cancelled Sessions',
    transaction_number: 'Transaction #',
    reason: 'Reason',
    opened_by_name: 'Opened By',
    items_count: 'Items Count',
    // TVA & Accounting
    gross_ttc: 'Gross TTC',
    net_ttc: 'Net TTC',
    cash_payments_row: 'Cash Payments',
    card_payments_row: 'Card Payments',
    coupons_redeemed_row: 'Coupons Redeemed',
    metric: 'Metric',
    total_invoices: 'Total Invoices',
    tva_rate: 'VAT Rate',
    weighted_avg_rate: 'Weighted Avg Rate',
    tva_rate_20_ht: '20% Rate Base',
    tva_rate_20_tva: '20% VAT',
    tva_rate_10_ht: '10% Rate Base',
    tva_rate_10_tva: '10% VAT',
    tva_rate_7_ht: '7% Rate Base',
    tva_rate_7_tva: '7% VAT',
    tva_rate_0_ht: '0% Rate Base',
    // Promotions & Discounts wrappers
    total_promotions_active: 'Active Promotions',
    total_redemptions: 'Total Redemptions',
    total_discount_given: 'Total Discount Given',
    promotion_name: 'Promotion',
    promotion_type: 'Type',
    redemption_count: 'Redemptions',
    avg_discount_per_use: 'Avg Discount per Use',
    total_issued: 'Total Issued',
    total_redeemed_label: 'Total Redeemed',
    redemption_rate: 'Redemption Rate',
    coupon_type_name: 'Coupon Type',
    total_expired: 'Expired',
    total_voided_label: 'Voided',
    discount_given: 'Discount Given',
    total_write_offs_count: 'Total Write-offs',
    total_write_off_amount: 'Total Write-off Amount',
    terminal_id_label: 'Terminal',
    write_off_count_label: 'Count',
    total_points_spent: 'Total Points Spent',
    unique_customers_served: 'Unique Customers',
    rule_name: 'Rule',
    points_spent: 'Points Spent',
    items_issued: 'Items Issued',
  },
};
