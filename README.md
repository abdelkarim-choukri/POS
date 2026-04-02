# POS System

Multi-tenant Point of Sale platform.

## Structure
```
apps/
  backend/         — NestJS API server
  terminal-app/    — Electron POS terminal (Ubuntu kiosk)
  dashboard-web/   — React admin dashboards (Business + Super Admin)
packages/
  shared/          — Shared types, constants, utilities
```

## Phase 1: Core Platform
- PostgreSQL database with all core tables
- JWT authentication (email/password + PIN)
- Super Admin & Business Admin dashboards
- Terminal app: login, sales, payment, receipts, void, offline sync
