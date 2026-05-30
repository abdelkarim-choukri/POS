<!-- converted from POS_SRS_v1.0.docx -->


SOFTWARE REQUIREMENTS SPECIFICATION
Point of Sale (POS) System
Morocco — Multi-Business / Multi-Location Platform


## Revision History

# 1. Introduction
## 1.1 Purpose
This Software Requirements Specification (SRS) defines the complete functional and non-functional requirements for the Point of Sale (POS) System — a cloud-connected, multi-tenant platform designed for Moroccan businesses. It serves as the primary contract between the client and the development team, providing a single authoritative reference for design, development, testing, and acceptance.
## 1.2 Scope
The POS System shall provide a full end-to-end retail and hospitality solution comprising three integrated layers:
- A touch-screen Terminal Application installed on Ubuntu-based POS hardware at each sales counter, capable of full offline operation.
- A Business Admin Web Dashboard accessible via browser for owners and managers to manage products, employees, view analytics, and export TVA (tax) declarations.
- A Super Admin Web Dashboard for the platform operator to manage all client businesses, terminal assignments, and subscription billing.

The system shall be legally compliant with Morocco's Finance Law No. 50-25 (2026), including TVA rate management, compliant receipt printing, and preparation for the SIMPL-TVA mandatory e-invoicing mandate issued by the Direction Générale des Impôts (DGI).
## 1.3 Definitions and Abbreviations

## 1.4 System Overview
The platform serves multiple independent businesses (tenants), each with one or more physical locations and one or more POS terminals per location. All tenant data is isolated. A single Super Admin account manages onboarding, terminal provisioning, and subscriptions across the entire platform.
The system supports the following business types in its initial release, with extensibility for additional types in later phases: Retail (general commerce), Restaurant / Café, Pharmacy, Salon / Spa, and Hotel.
## 1.5 References
- Morocco Finance Law No. 50-25 — Budget Year 2026
- POS System Design Document v2.0, April 2026
- Morocco DGI — SIMPL-TVA portal technical documentation (provisional)
- W3C Web Serial API specification
- ESC/POS thermal printer protocol reference

# 2. Overall Description
## 2.1 Product Perspective
The POS System is a new, standalone SaaS platform. It does not replace or integrate with any existing system in its initial release. The platform is hosted on a Virtual Private Server (VPS) in the cloud and communicates with terminals over HTTPS. Terminals maintain a local SQLite database for offline operation and synchronize with the server when connectivity is restored.
## 2.2 Product Functions — High Level

## 2.3 User Classes and Characteristics

## 2.4 Operating Environment
- Backend API: Node.js + NestJS, hosted on VPS (DigitalOcean or Contabo)
- Database: PostgreSQL (server); SQLite (local terminal cache for offline mode)
- Terminal Application: Electron-based web kiosk running on Ubuntu 22.04 LTS
- Web Dashboards: React + Tailwind CSS, served as Single-Page Applications
- Receipt Printing: Thermal printer connected via USB serial (Web Serial API, ESC/POS protocol)
- Cash Drawer: Triggered via ESC/POS command through the receipt printer port
- Card Payment Terminal: CMI or Payzone hardware terminal connected locally
- Minimum internet speed: 1 Mbps uplink sufficient for sync; offline mode active below this threshold
## 2.5 Design and Implementation Constraints
- All monetary values shall be stored and displayed in Moroccan Dirham (MAD).
- All receipts must comply with Morocco Finance Law No. 50-25 mandatory fields.
- TVA rates must follow the two-rate structure (10% reduced, 20% standard) with specific 0% and 7% exemptions as defined by law.
- Invoice numbers must be sequential, gap-free, and unique per business — required for SIMPL-TVA compliance.
- Offline transactions must be fully reconstructable from local SQLite data; no sale data shall be lost due to connectivity failure.
- The terminal application must function on Ubuntu 22.04 LTS without requiring an internet connection for its core POS operations.
## 2.6 Assumptions and Dependencies
- The client business has at least one Ubuntu-based POS terminal device.
- A compatible ESC/POS thermal receipt printer is available at each terminal location.
- CMI or Payzone card terminal hardware is available if card payment is required.
- The SIMPL-TVA DGI API is not yet publicly available; the system shall be built to integrate once the API is released without requiring architectural changes.
- Morocco DGI may revise TVA rates; the system shall support rate updates without code changes.

# 3. System Features & Functional Requirements
Requirements are identified by a unique code in the format [MOD-NNN]. Requirements using the keyword shall are mandatory; should indicates a recommended feature for the initial release.
## 3.1 Authentication & Authorization
[AUTH-001]  The system shall support two authentication methods: (a) email + password login for web dashboard users, and (b) numeric PIN login (4–6 digits) for terminal employees.
[AUTH-002]  Authentication shall return a signed JWT token containing at minimum: user ID, role, business ID, and token expiry.
[AUTH-003]  JWT tokens shall be validated on every protected API endpoint; missing or expired tokens shall result in a 401 Unauthorized response.
[AUTH-004]  The system shall implement Role-Based Access Control (RBAC) with the following roles: super_admin, owner, manager, employee.
[AUTH-005]  Employee role accounts shall only be permitted to access the terminal PIN login interface and terminal API endpoints.
[AUTH-006]  Manager and owner roles shall have access to the Business Admin web dashboard.
[AUTH-007]  The system shall log every login attempt (success and failure) in the audit log.
[AUTH-008]  All passwords shall be hashed using bcrypt before storage; plaintext passwords shall never be stored.
## 3.2 Super Admin Management
### 3.2.1 Business Management
[SAD-001]  The Super Admin shall be able to create new business accounts, providing: business type, business name, legal name, contact email and phone, logo, full address, ICE number (15-digit), and IF number.
[SAD-002]  The Super Admin shall be able to activate or suspend a business account.
[SAD-003]  The Super Admin shall be able to define business types (e.g. Restaurant, Retail, Pharmacy, Salon, Hotel) and configure which features are enabled per type.
[SAD-004]  Business type features shall include configurable toggles for: product modifiers, product variants, sold-out toggle, employee clock-in, and default TVA rate presets.
### 3.2.2 Terminal Management
[SAD-010]  The Super Admin shall be able to register new terminals by generating a unique terminal code (e.g. T-001).
[SAD-011]  The Super Admin shall be able to assign a terminal to a specific business location.
[SAD-012]  The system shall display real-time terminal health status (online/offline, last seen timestamp, app version) in the Super Admin dashboard.
### 3.2.3 Subscription Management
[SAD-020]  The Super Admin shall be able to create, update, and cancel subscriptions for each business, specifying: plan name, price in MAD, start date, and end date.
[SAD-021]  Subscription status shall be one of: trial, active, suspended, cancelled.
[SAD-022]  The Super Admin dashboard shall display a platform-wide revenue overview and a list of all business subscriptions.
## 3.3 Business Admin — Product Catalog
### 3.3.1 Categories
[CAT-001]  A business admin shall be able to create, edit, and soft-delete product categories.
[CAT-002]  Each category shall have a configurable default TVA rate (0%, 7%, 10%, or 20%). This rate shall apply to all products in the category unless a product overrides it.
[CAT-003]  Categories shall support display ordering via a sort_order field.
### 3.3.2 Products
[PRD-001]  A business admin shall be able to create, edit, and soft-delete products with the following fields: name, description, category, price (TTC in MAD), cost price, SKU, image, and sold-out status.
[PRD-002]  Each product shall have an optional TVA rate override field. If set, it supersedes the parent category's default rate.
[PRD-003]  Each product shall have a tva_exempt boolean flag. When set to true, the effective TVA rate shall be forced to 0% regardless of any other setting.
[PRD-004]  TVA rate resolution shall follow this priority chain: (1) tva_exempt = true → 0%; (2) product.tva_rate is set → use product rate; (3) fallback to category.default_tva_rate.
[PRD-005]  The product management UI shall display each product's effective TVA rate and the source of that rate (product override / category default / exempt).
[PRD-006]  Products shall support product variants (e.g. Small / Medium / Large) when the business type has variants enabled. Each variant shall have its own price override and SKU.
[PRD-007]  Products shall support modifier groups (e.g. Toppings, Extras) when the business type has modifiers enabled. Each modifier group shall have a minimum/maximum selection count and a required flag.
## 3.4 Business Admin — Employee Management
[EMP-001]  A business admin shall be able to create employee accounts with fields: first name, last name, email (optional), phone, role (owner/manager/employee), and a 4–6 digit PIN.
[EMP-002]  Permissions configurable per employee shall include: can_void, can_refund, and dashboard_access.
[EMP-003]  Employees with clock-in enabled (per business type config) shall be able to clock in and out from the terminal using their PIN.
[EMP-004]  Clock-in and clock-out timestamps shall be recorded per employee per terminal session, and total hours shall be calculated upon clock-out.
[EMP-005]  The Business Admin dashboard shall provide a clock history report showing all clock-in/out records filterable by employee and date range.
## 3.5 Terminal Application
### 3.5.1 Terminal Activation & Configuration
[TRM-001]  On first launch, the terminal shall prompt for a terminal activation code. The code shall be validated against the server; on success, the terminal shall download and cache its full business configuration.
[TRM-002]  The terminal shall send a heartbeat to the server every 60 seconds to report connectivity status and app version.
[TRM-003]  The terminal shall cache the full product catalog locally in SQLite so that sales can be processed without internet connectivity.
[TRM-004]  The terminal shall poll for catalog updates using a differential endpoint that returns only items changed since the last sync timestamp.
### 3.5.2 Employee PIN Login Screen
[TRM-010]  The terminal login screen shall display the business logo and name, a large touch-friendly numeric PIN keypad (0–9, Clear, Enter), and a real-time employee name preview as a valid PIN is recognized.
[TRM-011]  On successful PIN login, the terminal shall issue a session JWT scoped to the employee's role and business.
[TRM-012]  Failed PIN attempts shall be rate-limited; after 5 consecutive failures the terminal shall enforce a 60-second lockout.
### 3.5.3 Main Sales Screen
[TRM-020]  The main sales screen shall display: (left) a scrollable list of product categories; (center) a touch-friendly product grid; (right) the current order panel showing line items, quantities, and subtotal.
[TRM-021]  Sold-out products shall be visually greyed out and non-selectable.
[TRM-022]  Tapping a product that has variants or modifiers shall open a product detail modal with selectors for variant, modifier groups, and quantity before adding to the order.
[TRM-023]  The order panel shall provide +/– controls per line item and a Clear Order button.
[TRM-024]  The order panel shall display a running subtotal (TTC) at all times.
### 3.5.4 Payment Screen
[PAY-001]  The payment screen shall display the complete itemized order on the left and payment method buttons on the right.
[PAY-002]  The system shall support the following payment methods: Cash, Card (CMI), Card (Payzone).
[PAY-003]  Selecting Cash shall display a numpad for the cashier to enter the amount tendered. The system shall prominently display the change due (tendered − total TTC) before the cashier confirms payment.
[PAY-004]  Selecting Card (CMI or Payzone) shall initiate the card payment flow with the connected terminal hardware. The system shall handle the full flow: payment initiation, approval, decline, and timeout states.
[PAY-005]  Card payment shall not be recorded as completed unless the hardware terminal returns an explicit approval confirmation.
[PAY-006]  On payment confirmation, the system shall finalize the transaction, calculate and store all TVA figures, generate an invoice number, print the receipt, and trigger the cash drawer (for cash payments).
### 3.5.5 Void Flow
[VOID-001]  Within 60 seconds of completing a transaction, an authorized employee shall be able to void the transaction from the success screen.
[VOID-002]  The void screen shall display the transaction details, a reason selector (Customer changed mind / Wrong items / Employee error / Other), and a manager PIN field if the employee's role does not have can_void permission.
[VOID-003]  Voided transactions shall be recorded in the voids table with: voiding employee, approving manager (if applicable), reason, and timestamp.
[VOID-004]  Voided transactions shall be clearly marked in all reports and dashboards.
## 3.6 Receipt Printing & Hardware
### 3.6.1 Receipt Printer
[RCP-001]  The terminal shall connect to an ESC/POS-compatible thermal printer via the Web Serial API (USB serial).
[RCP-002]  The selected printer port shall be saved and automatically reconnected on terminal startup without displaying the browser port picker dialog each time.
[RCP-003]  The baud rate for the printer connection shall be configurable in terminal settings with a default of 115200 bps.
[RCP-004]  Each completed transaction shall automatically trigger a receipt print.
### 3.6.2 Legal Receipt Contents
Every printed receipt must include all fields mandated by Morocco Finance Law No. 50-25. Missing any field renders the receipt invalid for the customer's TVA deduction claim.

### 3.6.3 Cash Drawer
[HW-001]  The terminal shall send an ESC/POS cash drawer open command through the receipt printer port upon cash payment confirmation.
[HW-002]  The terminal UI shall display a confirmation indicator to the cashier after the cash drawer trigger command is sent.
## 3.7 Morocco TVA Compliance (Finance Law No. 50-25)
This section defines the complete set of requirements for TVA compliance. All sub-requirements in this section are mandatory before any pilot deployment with a real business.
### 3.7.1 TVA Rates

[TVA-001]  The system shall support TVA rates of 0%, 7%, 10%, and 20% configurable per product category and overridable per individual product.
[TVA-002]  The system shall enforce the TVA rate resolution priority chain defined in PRD-004 at every point of sale.
[TVA-003]  TVA rates shall be locked in at the time of sale and recorded permanently in transaction_items.tva_rate. Future rate changes shall not retroactively alter historical transaction records.
### 3.7.2 Transaction Tax Calculations
All prices entered into the system are TTC (customer-facing, tax-inclusive). The system derives HT and TVA amounts from TTC using the following formulas:
- item_ht = round(item_ttc / (1 + tva_rate / 100), 2)
- item_tva = round(item_ttc − item_ht, 2)
- total_ht = sum of all item_ht
- total_tva = sum of all item_tva
- total_ttc = total_ht + total_tva

Example: An item priced at 20.00 MAD TTC at 10% TVA → HT = 18.18 MAD, TVA = 1.82 MAD, TTC = 20.00 MAD.

[TVA-010]  The system shall calculate and permanently store item_ht, item_tva, and item_ttc for every line item in every transaction.
[TVA-011]  The system shall calculate and permanently store total_ht, total_tva, and total_ttc for every transaction header.
[TVA-012]  The offline transaction creation path shall apply identical TVA calculations to the online path; no tax data shall be missing from offline transactions.
### 3.7.3 Invoice Numbering
[TVA-020]  The system shall generate a unique, sequential invoice number for every transaction in the format: INV-{businessId}-{year}-{paddedSequence} (example: INV-042-2026-00001).
[TVA-021]  Invoice numbers shall be gap-free within a business; no numbers shall be skipped or reused. Generation shall use an atomic database increment operation to prevent duplicates under concurrent load.
[TVA-022]  The invoice number shall be printed on every receipt alongside the transaction number.
### 3.7.4 TVA Declaration Report
[TVA-030]  The Business Admin dashboard shall provide a TVA Declaration Report accessible from the Reports section.
[TVA-031]  The report shall accept a date range input and display totals grouped by TVA rate: Total HT, TVA Collected (MAD), and Transaction Count per rate, plus a grand total row showing total TVA owed.
[TVA-032]  The report shall support export to PDF format suitable for accountant submission to DGI.
[TVA-033]  The system shall auto-detect the filing frequency regime: monthly (if annual taxable sales ≥ 1,000,000 MAD) or quarterly (below threshold). Filing deadline reminders shall be displayed accordingly.
### 3.7.5 SIMPL-TVA E-Invoicing Preparation
[TVA-040]  The system shall store the following fields on every transaction for future SIMPL-TVA submission: invoice_number (unique), simpl_tva_status (pending/sent/validated/rejected), simpl_tva_reference, and simpl_tva_sent_at.
[TVA-041]  A SimplTvaService module shall be implemented that formats every transaction into the data structure required by the SIMPL-TVA API, including seller ICE/IF, all line items with TVA, HT/TVA/TTC totals, invoice number, and payment method.
[TVA-042]  The SIMPL-TVA submission function shall initially operate as a stub (logging the payload, returning a mock reference). The stub shall be replaceable with a live DGI API call without any architectural changes.
[TVA-043]  The business record shall store the ICE number, IF number, and an invoice_counter field. Incrementing this counter shall be the atomic source of truth for invoice number generation.
## 3.8 Offline Mode & Sync
[OFF-001]  The terminal shall detect loss of internet connectivity and immediately switch to offline mode without interrupting any in-progress transaction.
[OFF-002]  In offline mode, the terminal shall process sales using the locally cached product catalog and store completed transactions in a local SQLite sync queue.
[OFF-003]  Offline transactions shall be assigned a temporary reference ID (e.g. OFL-{base36timestamp}) clearly distinguished from server-assigned transaction numbers.
[OFF-004]  Upon connectivity restoration, the terminal shall automatically synchronize all queued offline operations to the server in chronological order.
[OFF-005]  After a successful sync, the server-assigned transaction number and invoice number shall be cross-referenced against the offline reference ID and both shall be stored permanently. No transaction data shall be overwritten without preserving the original offline reference.
[OFF-006]  The sync retry mechanism shall implement exponential backoff (starting at 30 seconds, doubling on each failure, capped at 15 minutes).
[OFF-007]  The sync service shall have a maximum retry limit (configurable, default: 10 attempts). After reaching the limit, the item shall be marked as failed and surfaced in the terminal UI.
[OFF-008]  The terminal shall display a persistent visual indicator showing the count of pending and failed sync items so cashiers are aware of unsynced data.
[OFF-009]  The online/offline event listener registration shall be idempotent — registering it multiple times shall not create duplicate handlers.
[OFF-010]  The sync queue table shall record: operation type, full payload JSON, status (pending/synced/failed), attempt count, queued timestamp, synced timestamp, and last error message.
## 3.9 Business Admin — Reports & Analytics
[RPT-001]  The Business Admin dashboard shall provide the following report types, all supporting a configurable date range and location filter:
- Daily Sales Summary — total revenue, transaction count, and average transaction value per day
- Revenue by Product — breakdown of sales and revenue per individual product
- Revenue by Category — breakdown of sales and revenue per product category
- Payment Methods — cash vs card split by transaction count and revenue
- Full Transaction History — paginated, searchable list of all transactions with full details
- Voids & Refunds Log — all void and refund events with reason and approving employee
- Location Comparison — side-by-side revenue and transaction metrics for multi-location businesses
- Employee Hours — clock in/out history and total hours worked per employee
- TVA Declaration Report — see Section 3.7.4

[RPT-002]  All tabular reports shall be exportable to CSV format.
[RPT-003]  The TVA Declaration Report shall additionally be exportable to PDF.
## 3.10 Refunds
[REF-001]  Authorized users (role: manager or owner with can_refund permission) shall be able to issue full or partial refunds from the Business Admin dashboard.
[REF-002]  Refunds shall require a reason to be recorded and shall log the refunding employee, refund amount, and timestamp.
[REF-003]  Refund method shall be one of: cash or card_reversal.
[REF-004]  Refunded transactions shall be marked with status = refunded or partial_refund and excluded from active revenue totals.

# 4. Non-Functional Requirements
## 4.1 Performance
[NFR-P01]  API endpoints shall respond within 500 ms for 95% of requests under normal load (≤ 50 concurrent users per business).
[NFR-P02]  The terminal application shall load the main sales screen within 2 seconds of employee PIN login.
[NFR-P03]  The product catalog sync (differential update) shall complete within 5 seconds on a 1 Mbps connection.
[NFR-P04]  Receipt printing shall complete within 3 seconds of payment confirmation.
## 4.2 Reliability & Availability
[NFR-R01]  The server-side platform shall target 99.5% uptime (excluding scheduled maintenance windows of < 2 hours).
[NFR-R02]  The terminal application shall continue to process sales with zero data loss during server downtime via the offline mode defined in Section 3.8.
[NFR-R03]  No financial transaction data shall be lost due to: network interruption, terminal crash, or power failure (assuming hardware has write-ahead logging enabled in SQLite).
## 4.3 Security
[NFR-S01]  All API communication shall use HTTPS with a valid TLS certificate. HTTP traffic shall be redirected to HTTPS.
[NFR-S02]  JWT tokens shall have an expiry of no more than 8 hours for terminal sessions and 24 hours for dashboard sessions.
[NFR-S03]  All sensitive actions (login, void, refund, product price change, employee creation) shall be recorded in the audit_logs table.
[NFR-S04]  Multi-tenant data isolation shall be enforced at the database query level; no API endpoint shall return data belonging to a different business.
[NFR-S05]  Employee PINs shall be stored as hashed values (bcrypt); plaintext PINs shall never be logged or returned in API responses.
[NFR-S06]  The terminal application shall run in a full-screen kiosk mode, preventing access to the underlying operating system from the sales floor.
## 4.4 Scalability
[NFR-SC01]  The platform architecture shall support onboarding of at least 500 businesses, each with up to 20 locations and 10 terminals per location, without database schema changes.
[NFR-SC02]  The TVA report query shall execute within 10 seconds for a business with up to 100,000 transactions in the reporting period.
## 4.5 Maintainability
[NFR-M01]  TVA rates shall be configurable via the admin interface without requiring code deployments.
[NFR-M02]  Business type feature toggles (modifiers, variants, clock-in, etc.) shall be configurable per business type without code changes.
[NFR-M03]  The SIMPL-TVA submission function shall be activatable by changing a single configuration flag and adding the DGI API endpoint URL, without architectural changes.
## 4.6 Usability
[NFR-U01]  The terminal POS interface shall be operable by touch only, with no requirement for a keyboard or mouse on the sales floor.
[NFR-U02]  All touch targets on the terminal shall be at minimum 44 × 44 pixels to meet accessibility standards.
[NFR-U03]  The time from opening the app to completing a cash sale shall not exceed 60 seconds for a trained cashier.
[NFR-U04]  The system shall support French and Arabic languages in a future release; all user-facing strings shall be externalized to language files from the initial build.
## 4.7 Data Retention
[NFR-D01]  All transaction records, invoice numbers, and TVA figures shall be retained for a minimum of 10 years to comply with Morocco's tax records retention law.
[NFR-D02]  Audit log records shall be append-only; no audit log entry shall be deleted or modified after creation.

# 5. External Interface Requirements
## 5.1 Hardware Interfaces

## 5.2 Software Interfaces

## 5.3 Communication Interfaces
[COM-001]  All client-server API communication shall use HTTPS/REST with JSON payloads.
[COM-002]  Terminal heartbeat messages shall be sent over HTTPS POST every 60 seconds.
[COM-003]  The offline sync endpoint shall accept a batch payload of multiple queued operations in a single request.
[COM-004]  The server API shall be versioned (e.g. /api/v1/) to allow non-breaking future updates.

# 6. Database Schema Summary
The system uses PostgreSQL as its primary database. The following tables constitute the complete data model. All tables include created_at and updated_at timestamps.


# 7. API Architecture Summary
The backend exposes a RESTful API organized into three security groups. All endpoints return JSON. Authentication uses JWT with role-based access control.
## 7.1 Authentication API (/api/auth/)

## 7.2 Super Admin API (/api/super/)
Protected — super_admin role only. Covers: business management, terminal registration & assignment, subscription management, platform analytics dashboard, and audit log access.
## 7.3 Business Admin API (/api/business/)
Protected — owner and manager roles. Covers: product catalog (categories, products, variants, modifiers), employee management, clock history, reports (daily sales, by item, by category, payment methods, transactions, voids/refunds, employee hours, TVA declaration), and transaction void/refund initiation.
## 7.4 Terminal API (/api/terminal/)
Protected — terminal session JWT. Covers: terminal activation, heartbeat, employee PIN clock-in/out, product catalog retrieval (full and differential), transaction creation (with TVA calculation and invoice number generation), void processing, today's transaction list, and offline sync batch push.

# 8. Development Phases
The system shall be delivered in the following phased approach to ensure a working product is available for pilot testing as early as possible.


# 9. Acceptance Criteria
The following conditions must be satisfied before the system is accepted for production deployment with a real client business.
## 9.1 Critical Functional Gates
- A complete end-to-end sale (product selection → cash payment → receipt print) can be executed on physical Ubuntu terminal hardware.
- All receipts include the mandatory Morocco TVA fields: ICE, IF, invoice number, per-item TVA rate, total HT, TVA by rate, total TTC.
- A transaction completed in offline mode (server disconnected) is correctly synced to the server upon reconnection, with both the offline reference and server-assigned invoice number preserved.
- TVA calculations are mathematically correct for 0%, 7%, 10%, and 20% rates, verified by automated test suite.
- Invoice numbers are sequential, unique, and gap-free across 1,000 concurrent test transactions.
- The sync retry mechanism correctly retries failed operations and surfaces failed items in the terminal UI.
- Card payment (CMI or Payzone) completes a real charge on hardware before the transaction is recorded as paid.
- Cash change calculation is displayed before payment is confirmed.
## 9.2 Legal Compliance Gate
- The printed receipt passes a legal review confirming compliance with Finance Law No. 50-25 mandatory fields.
- The TVA Declaration Report for a test period matches manual calculation from raw transaction data.
- The SIMPL-TVA payload builder produces a valid payload structure as per available DGI documentation.
## 9.3 Performance Gate
- 100 concurrent simulated transactions processed without data loss or duplicate invoice numbers.
- TVA report for 50,000 transactions returns within 10 seconds.
- Terminal loads to main sales screen within 2 seconds after PIN login.

# Appendix A — TVA Rate Quick Reference
The table below summarizes the applicable TVA rates by business and product type under Morocco Finance Law No. 50-25 (2026):

# Appendix B — Screen Flow Summary
## Terminal Flow
Employee Login (T1) → Main Sales Screen (T2) → Product Detail / Modifiers modal if needed (T3) → Payment Screen (T4) → Payment Confirmation (T5) → Success / Receipt Screen (T6) → returns to Main Sales Screen (T2). Void flow: T6 → Void Confirmation (T7) → T2.
## Business Admin Flow
Login → Dashboard Home. Navigation to: Product Catalog, Employee Management, Reports (including TVA Declaration tab), Location Management, Settings.
## Super Admin Flow
Login → Dashboard Home. Navigation to: Business Management (creation wizard), Terminal Management, Subscriptions, Business Type Configuration (feature toggles + TVA defaults), Audit Log.
| Document Type | Software Requirements Specification |
| --- | --- |
| Version | 1.0 |
| Date | April 2026 |
| Status | Draft — For Review |
| Target Market | Morocco (MAD / TVA compliance) |
| Legal Reference | Finance Law No. 50-25 |
| Version | Date | Description | Author |
| --- | --- | --- | --- |
| 1.0 | April 2026 | Initial SRS — full system scope | Project Team |
| Term / Abbreviation | Definition |
| --- | --- |
| POS | Point of Sale — the physical terminal and software used to process sales |
| TVA | Taxe sur la Valeur Ajoutée — Moroccan Value Added Tax (equivalent to VAT) |
| TTC | Toutes Taxes Comprises — total price including TVA (customer-facing price) |
| HT | Hors Taxe — price before TVA is applied |
| ICE | Identifiant Commun de l'Entreprise — 15-digit Moroccan tax identifier |
| IF | Identifiant Fiscal — TVA registration number issued by DGI |
| DGI | Direction Générale des Impôts — Morocco's tax authority |
| SIMPL-TVA | Morocco's official digital e-invoicing portal (DGI mandate, 2026) |
| MAD | Moroccan Dirham — the currency used for all financial values |
| Super Admin | Platform operator with full access to all client businesses |
| Business Admin | Owner or manager of a single client business |
| Terminal | Physical POS device (Ubuntu-based) assigned to a business location |
| JWT | JSON Web Token — used for stateless API authentication |
| ESC/POS | Escape/POS protocol — standard command set for thermal receipt printers |
| SQLite | Lightweight embedded database used locally on each terminal for offline storage |
| KDS | Kitchen Display Screen — future terminal type for restaurant order routing |
| SRS | Software Requirements Specification — this document |
| Function Area | Summary |
| --- | --- |
| Multi-tenant business management | Create, configure, and manage multiple independent businesses from a single Super Admin interface |
| Terminal POS operations | Process sales with product selection, payment confirmation, receipt printing, and void capability |
| Offline mode | Continue processing sales when internet is unavailable; sync automatically when back online |
| Product catalog | Manage categories, products, variants, and modifiers per business |
| Employee management | Manage staff accounts, roles, PIN-based terminal login, and clock in/out |
| Payment processing | Accept cash (with change calculation) and card payments via CMI or Payzone terminals |
| Morocco TVA compliance | Assign TVA rates per product/category, calculate HT/TVA/TTC per transaction, print legal receipts |
| TVA declaration report | Generate monthly/quarterly TVA declaration reports grouped by rate for DGI filing |
| SIMPL-TVA preparation | Store all required e-invoicing fields and provide a connector stub for the DGI portal |
| Business analytics | Daily sales, revenue by product/category, payment method breakdown, multi-location comparison |
| Subscription management | Track plan, billing status, and active period for each client business |
| Audit log | Immutable log of all sensitive actions across the platform |
| User Class | Access Layer | Description |
| --- | --- | --- |
| Super Admin | Web Dashboard | Platform operator. Full access to all businesses, terminals, and subscriptions. High technical proficiency assumed. |
| Business Owner | Web Dashboard + Terminal | Owner of a client business. Manages all settings for their business, views all reports, and can process sales. |
| Manager | Web Dashboard + Terminal | Supervises operations. Can approve voids/refunds, view reports, manage employees and products. |
| Employee / Cashier | Terminal only | Front-line staff. Logs in via PIN, processes sales, accepts payment, and prints receipts. Limited system access. |
| Receipt Field | Source | Required? |
| --- | --- | --- |
| Business name | businesses.name | Mandatory |
| Business full address | businesses.address | Mandatory |
| ICE number (15 digits) | businesses.ice_number | Mandatory |
| IF number (TVA registration) | businesses.if_number | Mandatory |
| Date and time of sale | transaction.created_at | Mandatory |
| Unique invoice number | transaction.invoice_number | Mandatory |
| Per-item: name, quantity, unit price (TTC) | transaction_items | Mandatory |
| Per-item: TVA rate applied | transaction_items.tva_rate | Mandatory |
| Total HT (before TVA) | transaction.total_ht | Mandatory |
| TVA amount grouped by rate | transaction totals | Mandatory |
| Total TTC (customer pays) | transaction.total_ttc | Mandatory |
| Payment method | transaction.payment_method | Mandatory |
| Change given (cash payments) | Calculated at payment screen | Mandatory for cash |
| Transaction reference number | transaction.transaction_number | Recommended |
| Business / Category Type | TVA Rate | Legal Basis |
| --- | --- | --- |
| Retail — general (electronics, clothing, homeware) | 20% | Standard rate — Finance Law 2026 |
| Restaurant / Café — food and drinks served on-site | 10% | Catering services — reduced rate |
| Fresh/frozen meat, basic pasta (any sector) | 0% | Exempt — Finance Law 2026 |
| Water supply, electricity meters (any sector) | 7% | Goods of general consumption |
| Pharmacy — medicines | 7% or 0% | Depends on medication category |
| Hardware | Interface | Requirements |
| --- | --- | --- |
| Thermal receipt printer | USB Serial — Web Serial API (ESC/POS) | Auto-reconnect on startup; configurable baud rate (default 115200); must not prompt port picker after first pairing |
| Cash drawer | ESC/POS command via printer port | Open command sent on every cash payment confirmation; UI confirmation displayed to cashier |
| Card payment terminal (CMI) | CMI SDK / local serial/TCP | Full payment flow: initiate → approve → decline → timeout; receipt only prints after hardware approval |
| Card payment terminal (Payzone) | Payzone SDK / local serial/TCP | Same requirements as CMI; both may coexist and be user-selectable |
| Barcode scanner (future) | USB HID keyboard emulation | Product lookup by SKU on the sales screen |
| System | Interface Type | Purpose |
| --- | --- | --- |
| PostgreSQL | NestJS TypeORM / direct SQL | Primary persistent data store for all server-side data |
| SQLite (terminal) | Better-SQLite3 (Node.js) | Local offline cache for terminal catalog, pending sync queue, and session state |
| DGI SIMPL-TVA Portal | REST API (HTTPS — stub for now) | Future mandatory e-invoicing submission; connector prepared but not activated until API is public |
| VPS Hosting (DigitalOcean / Contabo) | SSH / systemd / nginx | Application deployment, reverse proxy, TLS termination |
| Table | Purpose |
| --- | --- |
| super_admins | Platform operator accounts |
| subscriptions | Subscription/billing status per business |
| business_types | Available business categories (Restaurant, Retail, etc.) |
| business_type_features | Feature toggles per business type |
| businesses | Client business accounts including ICE, IF, invoice_counter |
| locations | Physical branches per business |
| terminals | POS devices assigned to locations |
| users | All users: owners, managers, employees (with PIN) |
| clock_entries | Employee clock in/out records |
| categories | Product categories with default_tva_rate |
| products | Products with tva_rate override and tva_exempt flag |
| product_variants | Size/color variants per product |
| modifier_groups | Groups of add-on options (e.g. Toppings) |
| modifiers | Individual add-on items with price |
| product_modifier_groups | Many-to-many link: products ↔ modifier groups |
| transactions | Every completed sale with total_ht, total_tva, total_ttc, invoice_number, simpl_tva_status |
| transaction_items | Line items with locked tva_rate, item_ht, item_tva, item_ttc |
| voids | Void records linked to transactions |
| refunds | Full and partial refund records |
| sync_queue | Offline operation queue per terminal |
| audit_logs | Immutable log of all sensitive actions |
| Method | Endpoint | Description |
| --- | --- | --- |
| POST | /api/auth/login | Email/password login (dashboard) or PIN login (terminal) |
| POST | /api/auth/logout | Invalidate current session token |
| POST | /api/auth/refresh | Refresh expiring JWT token |
| GET | /api/auth/me | Get current user profile and permissions |
| PUT | /api/auth/change-password | Change own password |
| Phase | Scope | Target Duration |
| --- | --- | --- |
| Phase 1 — Core Platform | Database setup (PostgreSQL + all tables including TVA columns), authentication (JWT, roles, PIN), Super Admin dashboard (business creation, terminal management), Business Admin dashboard (product catalog, employee management, basic reports), Terminal app (employee login, sales screen, cash payment, receipt printing, offline mode, void flow) | 8–10 weeks |
| Phase 2 — First Business Type (Retail) | Retail product catalog (categories, simple variants), sold-out toggle, TVA rate configuration (20% default), legal receipt printing with ICE/IF/TVA breakdown, full Ubuntu hardware testing, pilot deployment with one real business | 2–3 weeks |
| Phase 3 — Additional Business Types | Restaurant/Café (modifiers, add-ons, TVA at 10%), Pharmacy (category-heavy catalog, medication TVA rates), Salon/Spa (service-based items), Hotel (room-linked charges) | 3–4 weeks per type |
| Phase 4 — Advanced Features | TVA declaration report (monthly/quarterly export), SIMPL-TVA e-invoicing integration (when DGI API opens), refund flow from dashboard, advanced reporting and multi-location comparison, subscription/billing management, Arabic/French language support, QR payment integration, digital receipts and loyalty programs | Ongoing |
| Business Type | Product / Service Category | TVA Rate |
| --- | --- | --- |
| Retail (general) | Electronics, clothing, homeware, general goods | 20% |
| Restaurant / Café | Food and beverages served on-site | 10% |
| Any sector | Fresh meat, frozen meat, basic pasta, flour | 0% (exempt) |
| Any sector | Water supply, electricity meters | 7% |
| Pharmacy | Prescription medicines (check per item) | 7% or 0% |
| Salon / Spa | Haircuts, beauty services | 20% |
| Hotel | Accommodation and related services | 10% or 20% |