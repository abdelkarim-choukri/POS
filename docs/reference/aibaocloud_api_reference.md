# 爱宝美食云 (AiBao Cloud POS) — API Reference Map
> Extracted from: `main.faff60daa43927502dc9.js`  
> Platform: Angular SPA (NG-ALAIN framework + Ant Design)  
> Auth: OAuth2 Bearer Token  
> Base URL: `https://w.aibaocloud.com/` (prefix all API paths with your API gateway root)

---

## Table of Contents
1. [Authentication](#1-authentication)
2. [App Routes (Frontend Navigation)](#2-app-routes)
3. [API Endpoints by Module](#3-api-endpoints-by-module)
   - 3.1 User Center (`ucenter/`)
   - 3.2 Base / Store Config (`base/`)
   - 3.3 Goods / Products (`goods/`)
   - 3.4 Customers (`custs/`)
   - 3.5 Sales & Dashboard (`sales/`)
   - 3.6 Smart Traffic (`api/`)
   - 3.7 Payments (`hpay/`)
4. [Known Request Patterns](#4-known-request-patterns)
5. [Notes & Observations](#5-notes--observations)

---

## 1. Authentication

### Token Endpoint
| Method | Path | Purpose |
|--------|------|---------|
| POST | `auth/oauth/token` | Obtain OAuth2 Bearer token |
| GET | `ucenter/getToken` | Get token via user center |
| GET | `ucenter/getCode` | Get SMS verification code |
| GET | `ucenter/getEmailCode` | Get email verification code |
| GET | `ucenter/loginValidateCode` | Get login CAPTCHA code |
| POST | `ucenter/checkUsername` | Validate username availability |
| POST | `ucenter/register` | Register new account |

### Session Management
| Method | Path | Purpose |
|--------|------|---------|
| POST | `base/user/logout` | Log out current user |
| GET | `base/user/info` | Get current user info |
| PUT | `base/user/editInfo` | Edit user profile |
| POST | `base/user/findPassword` | Password recovery |
| POST | `base/user/checkCode` | Verify recovery code |
| PUT | `base/posCustomer/resetPwdNew` | Reset password |
| GET | `base/code/getCode` | Get verification code |
| POST | `base/code/checkCode` | Check verification code |
| GET | `base/email/getCode` | Get email code |
| GET | `base/common/getOToken` | Get OAuth token |

### Store Login Flow (Multi-store)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `ucenter/preUserCenter/getStoreInfoByUsername` | Fetch stores for a username |
| GET | `ucenter/preUserCenter/getProxyStoreByUsername` | Get proxy store list for user |
| GET | `ucenter/getZoneAreaAPIByUserId` | Get zone/area API for user |
| GET | `base/posStore/pagingQueryUcenter` | Paginated store list |

---

## 2. App Routes

These are the frontend hash routes available in the SPA (`#/<route>`):

| Route | Description |
|-------|-------------|
| `passport/login` | Login page |
| `register` | New account registration |
| `register-result` | Registration confirmation |
| `findpassword` | Password recovery |
| `dashboard` | Main dashboard |
| `dashboard/v1` | Dashboard v1 (legacy) |
| `sales` | Sales module |
| `goods` / `commodity` | Goods / product management |
| `cloudgoods` | Cloud goods (multi-store product sync) |
| `stock` | Stock / inventory management |
| `warehouse` | Warehouse management |
| `purchase` | Purchase orders |
| `custmgr` | Customer management |
| `custreport` | Customer reports |
| `promotion` | Promotions & campaigns |
| `dataanalysis` | Data analytics |
| `goodstraffic` | Smart traffic / dish recommendation |
| `settleAccounts` | Settlement & accounts |
| `setup` | Settings / configuration |
| `sysmgr` | System management |
| `storeMgr` | Store management |
| `storemigrate` | Store migration tools |
| `mgrmicr` | Micro-management (franchise/chain) |
| `wechat` / `wxdc` | WeChat integration |
| `waimai` | Food delivery (外卖) integration |
| `aibaopay` | AiBao payment module |
| `partner` | Partner management |
| `platforms` | Platform integrations |
| `guider` | Onboarding guide |
| `record` | Operation records/logs |
| `data` | Data export/import |
| `advanced` | Advanced settings |
| `callback/:type` | OAuth callback handler |
| `403` / `404` / `500` | Error pages |

---

## 3. API Endpoints by Module

### 3.1 User Center (`ucenter/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `ucenter/getToken` | Obtain auth token |
| GET | `ucenter/getCode` | SMS code |
| GET | `ucenter/getEmailCode` | Email verification code |
| GET | `ucenter/loginValidateCode` | Login CAPTCHA |
| POST | `ucenter/checkUsername` | Check username availability |
| POST | `ucenter/register` | Register user |
| GET | `ucenter/getZoneAreaAPIByUserId` | Get zone/region API access for user |
| GET | `ucenter/preUserCenter/getStoreInfoByUsername` | Get store info by username |
| GET | `ucenter/preUserCenter/getProxyStoreByUsername` | Get proxy store by username |
| GET | `ucenter/VerMgr/listVersionLogMenu` | List version changelog menu |
| GET | `ucenter/VerMgr/versionLogDetailPage` | Version changelog detail (paginated) |

---

### 3.2 Base / Store Config (`base/`)

#### User & Auth
| Method | Path | Purpose |
|--------|------|---------|
| GET | `base/user/info` | Current user info |
| PUT | `base/user/editInfo` | Edit user info |
| POST | `base/user/logout` | Logout |
| POST | `base/user/findPassword` | Find/reset password |
| POST | `base/user/checkCode` | Verify code |
| GET | `base/user/userPage` | User list (paginated) |
| GET | `base/menu/getUserTree` | Get menu tree for current user |

#### Store
| Method | Path | Purpose |
|--------|------|---------|
| GET | `base/posStore/{id}` | Get store by ID |
| GET | `base/posStore/pagingQueryUcenter` | Paginated store list |
| POST | `base/posStore/registerFcdr` | Register store with FCDR |
| POST | `base/posStore/toSendAllDataToFc` | Push all data to FC system |
| GET | `base/posStoreconfig/getConfig2?storeId={id}` | Get store config by store ID |
| GET | `base/posStoreAccount/getRestMessageNumber` | Get remaining SMS message count |
| GET | `base/posStoreCustomAuthority/getStoreCustomAuthority` | Get custom permissions for store |
| GET | `base/posStoreProduct/getProductExpiretionTime` | Get product expiration time |
| GET | `base/posStoreMessage/getPulishMessage` | Get published store messages |
| GET | `base/posStoreMessage/homePageNotices` | Get homepage notices |

#### Store Parameters / Settings
| Method | Path | Purpose |
|--------|------|---------|
| GET | `base/posStoreparam/getValueByKeyAndType` | Get param value by key+type |
| POST | `base/posStoreparam/saveSettings` | Save store parameter settings |
| GET | `base/posStoreparamOpt/getParamByParamType` | Get param options by type |
| POST | `base/posStoreparamOpt/saveSettings` | Save param option settings |
| POST | `base/posStoreparamOpt/restoreDefaultSet` | Restore default settings |

#### Customer / Cards
| Method | Path | Purpose |
|--------|------|---------|
| DELETE | `base/posCustomer/{id}` | Delete customer |
| GET | `base/posCustomer/retCard` | Return/retrieve card |
| PUT | `base/posCustomer/resetPwdNew` | Reset customer password |
| POST | `base/posCustomer/batchImportCustGrade` | Batch import customer grades |
| POST | `base/posCustfee/adjustCustPoint` | Adjust customer points |

#### Region / Logistics
| Method | Path | Purpose |
|--------|------|---------|
| GET | `base/posAreaZone/list` | List area zones |
| GET | `base/sysCityRegion/address` | Get city/region address data |
| GET | `base/sysExpress/pagingQuery` | Paginated express/courier query |

#### System
| Method | Path | Purpose |
|--------|------|---------|
| GET | `base/sysParam/page` | System params (paginated) |
| GET | `base/posTradeInfo/tree` | Trade info tree |
| GET | `base/common/capitaldetail` | Capital/financial detail |
| POST | `base/upload/uploadFileByStream?storeId={id}` | Upload file (stream) |
| GET | `base/code/getCode` | Get verification code |
| POST | `base/code/checkCode` | Check verification code |
| GET | `base/email/getCode` | Get email code |

---

### 3.3 Goods / Products (`goods/`)

#### Categories
| Method | Path | Purpose |
|--------|------|---------|
| GET | `goods/posCategory/tree/{id}` | Category tree |
| GET | `goods/posCategory/cateNodesData` | Category node data |
| GET | `goods/posCategory/cateOptions` | Category options (for dropdowns) |
| GET | `goods/posCategory/query` | Query categories |

#### Products (SPU/SKU)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `goods/posItemSpu/getItemSpuPage` | SPU list (paginated) |
| GET | `goods/posItemSpu/getNotItemMapPage` | Un-mapped SPU items (paginated) |
| GET | `goods/posItemSpu/favorItemList` | Favourite/featured items |
| GET | `goods/posItemSpu/getItemCodePage` | SPU by item code (paginated) |
| GET | `goods/posItemSku/getItemSkuPage` | SKU list (paginated) |
| GET | `goods/posItemSku/getItemSkuForSelectPage` | SKU select picker (paginated) |
| POST | `goods/posItemSku/getItemSkuList` | SKU list by criteria |
| GET | `goods/posItemSku/getItemCodePage` | SKU by item code |
| GET | `goods/posItem/templateStoreResultMap/page` | Template store result map (paginated) |

#### Brands & Vendors
| Method | Path | Purpose |
|--------|------|---------|
| GET | `goods/posBrand/query` | Query brands |
| GET | `goods/posBrand/selectBrandList` | Brand select list |
| GET | `goods/posVendor/getVendorList` | Vendor list |
| GET | `goods/posVendor/getVendorList?storeId={id}` | Vendor list filtered by store |
| GET | `goods/posVendor/selectVendorList` | Vendor select list |
| GET | `goods/posVendor/vendorList` | All vendors |
| GET | `goods/posVendorcheckdetail/page` | Vendor check details (paginated) |

#### Nutrition
| Method | Path | Purpose |
|--------|------|---------|
| GET | `goods/posNutrient/page` | Nutrient info (paginated) |

#### Promotions (Goods-level)
| Method | Path | Purpose |
|--------|------|---------|
| GET | `goods/posPromh/getSubStoreCheckData` | Sub-store promotion check data |

#### Purchase Orders
| Method | Path | Purpose |
|--------|------|---------|
| GET | `goods/posPurchaseh/getParentStore` | Get parent store for purchase |

#### Stock / Inventory
| Method | Path | Purpose |
|--------|------|---------|
| GET | `goods/batchStock/page` | Batch stock (paginated) |
| GET | `goods/posStktemplate/findByPage` | Stock templates (paginated) |

#### Store Areas & Tables
| Method | Path | Purpose |
|--------|------|---------|
| GET | `goods/posStoreArea/list` | Store area list |
| GET | `goods/posStoreArea/page2` | Store area paginated (v2) |
| GET | `goods/posStoreTable/page` | Store tables (paginated) |
| GET | `goods/posStoreTableType/selectStoreTypeList` | Store table type list |

#### Warehouse
| Method | Path | Purpose |
|--------|------|---------|
| GET | `goods/warehouse/page` | Warehouse list (paginated) |

---

### 3.4 Customers (`custs/`)

#### Customer Records
| Method | Path | Purpose |
|--------|------|---------|
| GET | `custs/posCustomer/gainStoreCustInfos` | Get store customer info |
| GET | `custs/posCustomer/page` | Customer list (paginated) |
| GET | `custs/posSpecs/selectCustSpec` | Customer spec/attributes select |
| GET | `custs/posCustlabel/findAllLabel` | Get all customer labels/tags |
| GET | `custs/posCustgrade/getStoreCustGrade/{id}` | Get customer grade for store |

#### Customer Promotions
| Method | Path | Purpose |
|--------|------|---------|
| POST | `custs/posCustpromh/add` | Create customer promotion |
| PUT | `custs/posCustpromh/edit` | Edit customer promotion |

#### Points / Exchange Rules
| Method | Path | Purpose |
|--------|------|---------|
| GET | `custs/posCustexrule/getCountByPointValue` | Check if point value rule exists |
| POST | `custs/posCustexrule/saveRuleAndRuleDetail` | Save point exchange rule + details |

#### Coupons
| Method | Path | Purpose |
|--------|------|---------|
| GET | `custs/posCouponh/listAvailableCollectCouponsBySy` | List collectible coupons available to system |

---

### 3.5 Sales & Dashboard (`sales/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `sales/dashboard/loadDashboardSummary` | Load dashboard summary metrics |

---

### 3.6 Smart Traffic / Dish Recommendation (`api/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `api/posCategory/cateNodesData` | Category nodes for smart traffic |
| GET | `api/posSmarttrafficTemplate/getList` | List smart traffic templates |
| GET | `api/posSmarttrafficTemplate/getItemListByTemplateId` | Get items for a smart traffic template |

---

### 3.7 Payments (`hpay/`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `hpay/wpSellerServicer/getByPayServiceProxyID` | Get payment service proxy info |

---

## 4. Known Request Patterns

### Pagination
Most list endpoints accept these query params:
```
pageIndex / page   — page number (usually 1-based)
pageSize           — records per page
storeId            — filter by store
storeSysCode       — store system code (used alongside storeId)
```

### Standard Response Envelope
```json
{
  "code": 0,        // 0 = success, non-zero = error
  "msg": "success", // human-readable message
  "data": { ... }   // payload (object or array)
}
```

### Authentication Header
```
Authorization: Bearer <token>
```
Token obtained from `auth/oauth/token` or `ucenter/getToken`.

### File Upload
```
POST base/upload/uploadFileByStream?storeId={storeId}
Content-Type: multipart/form-data
```
Returns an image path key (e.g. `d8e4030c.../filename.png`) used as `imageUrl` in subsequent calls.

### Common Shared Parameters
Many endpoints require both:
- `storeId` — numeric store ID
- `storeSysCode` — string store system code

---

## 5. Notes & Observations

| Item | Detail |
|------|--------|
| **Framework** | Angular (NG-ALAIN + Ant Design NG) |
| **Auth Type** | OAuth2 Bearer Token |
| **Image Storage** | Dual-mode: private deploy uses `IMAGE_DOWN_URL2`, public uses `IMAGE_DOWN_URL` (configured in `IS_PRIVATE_DEPLOY` flag) |
| **Internationalization** | Built-in i18n (`langXXX` key system) — Chinese primary |
| **Multi-store** | Full multi-store support via `storeId` / `storeSysCode` / `actStoreId` |
| **Delivery Integration** | 外卖 (waimai) module present — likely Meituan/Ele.me |
| **WeChat Integration** | WeChat (`wechat`) and WeChat Mini Program (`wxdc`) modules present |
| **Map Integration** | AMap (高德地图) referenced (commented out in HTML but present in codebase) |
| **Rich Text** | CKEditor 4 integrated |
| **Excel** | ExcelJS integrated for import/export |
| **Payment** | AiBao Pay (`aibaopay`) + proxy payment service (`hpay/`) |
| **Cloud Goods Sync** | `cloudgoods` route suggests multi-store product synchronization |