# POS System Domain Glossary

- **Business** — A tenant (store/restaurant/pharmacy). All data is scoped to one business.
- **Location** — A physical branch of a business. Has terminals.
- **Terminal** — A POS device at a location. PIN login.
- **Transaction** — A completed sale with invoice number, TVA decomposition, payment.
- **TVA** — Morocco's value-added tax (0/7/10/20%). Hardcoded rates per Finance Law 50-25.
- **Stock Batch** — A lot of product received into a warehouse with cost, expiry, vendor.
- **FIFO** — First-In-First-Out consumption: oldest-expiry batch decremented first on sale.
- **Discount Pipeline** — Fixed order: Grade → Promotion → Coupon. Each step feeds the next.
- **Table Session** — An open restaurant table with items, guest attribution, split billing.
- **PO (Purchase Order)** — An order placed with a vendor for stock replenishment.
