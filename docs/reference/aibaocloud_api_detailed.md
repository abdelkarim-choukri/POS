# 爱宝美食云 — Full API Input / Output Reference
> Source: `main.faff60daa43927502dc9.js` (Angular SPA bundle)  
> All endpoints are relative — prefix with your API gateway base URL  
> Auth: `Authorization: Bearer <token>` on all protected endpoints  
> Standard response envelope: `{ code: 0, msg: "...", data: ... }`  
> `code: 0` = success. Any other value = error (read `msg` field).

---

## CONVENTIONS

| Symbol | Meaning |
|--------|---------|
| `*` | Required field |
| `[paged]` | Returns `{ records: [], total: N }` |
| `[envelope]` | Returns `{ code, msg, data }` |
| `path/:x` | URL path param |

---

## MODULE 1 — AUTHENTICATION & USER CENTER

---

### `POST auth/oauth/token`
**Purpose:** Obtain OAuth2 Bearer token (primary login)

**Input (form or JSON):**
```json
{
  "username": "abroadTea",
  "password": "aml123456"
}
```

**Output:**
```json
{
  "access_token": "<bearer_token>",
  "token_type": "bearer",
  "expires_in": 3600
}
```

---

### `GET ucenter/getToken`
**Purpose:** Get token via user center (alternative login)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `username` * | string | Username |
| `password` * | string | Password |

**Output:** `[envelope]` — `data` contains token string

---

### `GET ucenter/getCode`
**Purpose:** Send SMS verification code to phone

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `phone` * | string | Phone number |
| `areaCode` | string | Country/area code |
| `storeAreaCode` | string | Store service area code |
| `type` | string | Code purpose type |

**Output:** `[envelope]` — `data.id` = codeId (used in verification step)

---

### `GET ucenter/getEmailCode`
**Purpose:** Send email verification code

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `email` * | string | Email address |
| `type` | string | Code purpose type |

**Output:** `[envelope]` — `data.id` = codeId

---

### `GET ucenter/loginValidateCode`
**Purpose:** Get CAPTCHA image for login form

**Input:** None

**Output:** Image binary or base64 CAPTCHA + `data.id` = codeId

---

### `POST ucenter/checkUsername`
**Purpose:** Check if a username is available during registration

**Input (JSON body):**
| Param | Type | Notes |
|-------|------|-------|
| `username` * | string | |

**Output:** `[envelope]` — `code: 0` = available

---

### `POST ucenter/register`
**Purpose:** Register a new account

**Input (JSON body):**
| Param | Type | Notes |
|-------|------|-------|
| `userName` * | string | Login username |
| `confirmPassword` * | string | Password |
| `phone` | string | Phone number |
| `email` | string | Email |
| `codeId` | string | From `getCode` / `getEmailCode` |
| `code` | string | Verification code value |
| `areaCode` | string | Phone area code |
| `storeAreaCode` | string | Service region code |
| `isConsent` | boolean | Terms agreement |

**Output:** `[envelope]` — `code: 0` + redirect prompt on success

---

### `GET ucenter/preUserCenter/getStoreInfoByUsername`
**Purpose:** Fetch list of stores associated with a username (used on login store-selection screen)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `username` * | string | |
| `storeType` | string | e.g. `"1"` = normal, `"2"` = proxy |

**Output:** Array of store objects:
```json
[
  { "id": 123, "storeName": "...", "storeSysCode": "...", "storeType": "..." }
]
```

---

### `GET ucenter/preUserCenter/getProxyStoreByUsername`
**Purpose:** Get proxy/franchise stores for a user

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `username` * | string | |
| `storeType` | string | Always `"2"` for proxy |

**Output:** Array of proxy store objects (same shape as above)

---

### `GET ucenter/getZoneAreaAPIByUserId`
**Purpose:** Get regional API configuration for a user (used for multi-zone deployments)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `userName` * | string | |

**Output:** `[envelope]` — `data` = zone/region API config object

---

### `GET ucenter/VerMgr/listVersionLogMenu`
**Purpose:** List version changelog menu entries

**Input:** None

**Output:**
```json
{
  "success": true,
  "data": [
    { "id": "...", "sysName": "..." }
  ]
}
```

---

### `GET ucenter/VerMgr/versionLogDetailPage`
**Purpose:** Paginated version changelog detail

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | Page number |
| `limit` | int | Page size |
| `id` | string | Menu entry ID from above |

**Output:** `[paged]` — `records[]` each has `verDesc` (string with `\n` or `<br/>` line breaks), `expireTime`

---

## MODULE 2 — BASE / STORE CONFIG

---

### `GET base/user/info`
**Purpose:** Get current logged-in user's info

**Input:** None (token identifies user)

**Output:** `[envelope]`
```json
{
  "data": {
    "username": "...",
    "staffName": "...",
    "storeId": 123,
    "storeSysCode": "..."
  }
}
```

---

### `PUT base/user/editInfo`
**Purpose:** Edit current user's profile

**Input (JSON body):** User model object — same fields as `user/info` output

**Output:** `[envelope]` — `code: 0` on success

---

### `POST base/user/logout`
**Purpose:** Log out current session

**Input:** `{}` (empty body)

**Output:** `[envelope]` — `code: 0` on success

---

### `POST base/user/findPassword`
**Purpose:** Reset forgotten password

**Input (JSON body):**
| Param | Type | Notes |
|-------|------|-------|
| `codeId` * | string | From `getCode` / `getEmailCode` |
| `code` * | string | Verification code |
| `phone` | string | Registered phone |
| `email` | string | Registered email |
| `username` * | string | |
| `password` * | string | New password |
| `repassword` * | string | Confirm new password |
| `phoneAreaCode` | string | Phone area code |
| `serviceAreaCode` | string | Service region code |
| `storeAreaCode` | string | Store area code |

**Output:** `[envelope]` — `code: 0` on success

---

### `POST base/user/checkCode`
**Purpose:** Verify a code (intermediate step in password reset)

**Input (JSON body):**
| Param | Type | Notes |
|-------|------|-------|
| `codeId` * | string | From `getCode` |
| `code` * | string | Code entered by user |
| `areaCode` | string | |
| `storeAreaCode` | string | |
| `email` | string | |

**Output:** `[envelope]` — `code: 0` if valid

---

### `GET base/user/userPage`
**Purpose:** Paginated list of users

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | |
| `limit` | int | |
| `storeId` | int | |

**Output:** `[paged]` — `records[]` of user objects

---

### `GET base/menu/getUserTree`
**Purpose:** Get navigation menu tree for the current user (permission-based)

**Input:** None

**Output:** Nested array of menu nodes:
```json
[{ "id": "...", "title": "...", "children": [...] }]
```

---

### `GET base/code/getCode`
**Purpose:** Get SMS or phone verification code

**Input (query params):** Same as `ucenter/getCode`

**Output:** `[envelope]` — `data.id` = codeId

---

### `POST base/code/checkCode`
**Purpose:** Verify code entered by user

**Input (JSON body):**
| Param | Type | Notes |
|-------|------|-------|
| `codeId` * | string | |
| `code` * | string | |

**Output:** `[envelope]` — `code: 0` if valid

---

### `GET base/email/getCode`
**Purpose:** Get email verification code

**Input (query params):** Same as `ucenter/getEmailCode`

**Output:** `[envelope]` — `data.id` = codeId

---

### `GET base/common/getOToken`
**Purpose:** Get OAuth token for internal service calls

**Input:** None

**Output:** `[envelope]` — `data` = token string

---

### `GET base/common/capitaldetail`
**Purpose:** Get capital/financial summary detail

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` | int | |
| `storeSysCode` | string | |
| `startDate` | string | `yyyy-MM-dd` |
| `endDate` | string | `yyyy-MM-dd` |

**Output:** `[envelope]` — `data` = financial summary object

---

### `GET base/posStore/{id}`
**Purpose:** Get a single store by ID

**Input:** URL path param `id` = store ID

**Output:** `[envelope]` — `data` = store object with `fcdrAccount`, config fields

---

### `GET base/posStore/pagingQueryUcenter`
**Purpose:** Paginated store list (user center context)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | |
| `limit` | int | |
| `storeName` | string | Optional filter |

**Output:** `[paged]` — `records[]` of store objects

---

### `POST base/posStore/registerFcdr`
**Purpose:** Register store with FCDR (financial/compliance system)

**Input (JSON body):**
| Param | Type | Notes |
|-------|------|-------|
| `storeSysCode` * | string | |

**Output:** `[envelope]` — `code: 0` on success, returns QR code info on success

---

### `POST base/posStore/toSendAllDataToFc`
**Purpose:** Push all store data to FC (franchise center) system

**Input (JSON body):**
| Param | Type | Notes |
|-------|------|-------|
| `storeSysCode` * | string | |

**Output:** `[envelope]` — `code: 0` = sent successfully

---

### `GET base/posStoreconfig/getConfig2?storeId={id}`
**Purpose:** Get store configuration (v2)

**Input (query param):** `storeId` = store ID

**Output:** `[envelope]` — `data` = config object including:
- `apos_waimai_domain` — delivery platform domain

---

### `GET base/posStoreAccount/getRestMessageNumber`
**Purpose:** Get remaining SMS message balance for the store

**Input:** None (store determined from session)

**Output:** `[envelope]`
```json
{ "data": { "msgNum": 250 } }
```

---

### `GET base/posStoreCustomAuthority/getStoreCustomAuthority`
**Purpose:** Get custom permission settings for the current store

**Input:** None

**Output:** `[envelope]` — `data` = permission flags object

---

### `GET base/posStoreProduct/getProductExpiretionTime`
**Purpose:** Check for products nearing expiration in the store

**Input:** None

**Output:** `[envelope]`
```json
{ "data": [{ "productName": "...", "expireTime": "2026-05-01" }] }
```
If `data` is non-empty and `expireTime < now`, show expiry warning.

---

### `GET base/posStoreMessage/getPulishMessage`
**Purpose:** Get published store broadcast messages

**Input (query params — hardcoded in app):**
| Param | Value | Notes |
|-------|-------|-------|
| `page` | 1 | |
| `limit` | 50 | |
| `status` | `"P"` | P = Published |

**Output:** `[paged]` — `records[]` of message objects with `expireTime`, `isShow`

---

### `GET base/posStoreMessage/homePageNotices`
**Purpose:** Get homepage notice banners

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `limitNum` | int | Max notices to return |
| `storeId` | int | |

**Output:** Array of notice objects

---

### `GET base/posStoreparam/getValueByKeyAndType`
**Purpose:** Get a single store parameter value by key + type

**Input (query params):**
| Param | Type | Example |
|-------|------|---------|
| `paramType` * | string | `"ItemSetting"` |
| `paramKey` * | string | `"commodityBatchMange"` |
| `storeId` * | int | |

**Output:** `[envelope]`
```json
{ "data": { "paramValue": "Y", "paramType": "...", "paramKey": "..." } }
```
Interpreted as: if `paramValue` contains `"00:00"` → settlement end = `"23:59"`, else compute from hour.

---

### `POST base/posStoreparam/saveSettings`
**Purpose:** Save store parameter settings

**Input (JSON body):**
```json
{
  "storeId": 123,
  "storeSysCode": "...",
  "paramList": [
    { "paramType": "...", "paramKey": "...", "paramValue": "..." }
  ]
}
```

**Output:** `{ "flag": true, "msg": "..." }` — `flag: true` = success

---

### `GET base/posStoreparamOpt/getParamByParamType`
**Purpose:** Get parameter options by type (for settings dropdowns)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `paramType` * | string | Settings category |
| `storeId` | int | |

**Output:** `[envelope]` — `data` = array of param option objects

---

### `POST base/posStoreparamOpt/saveSettings`
**Purpose:** Save param option settings

**Input (JSON body):** Array of param option objects

**Output:** `{ "flag": true, "msg": "..." }`

---

### `POST base/posStoreparamOpt/restoreDefaultSet`
**Purpose:** Restore all settings to default

**Input (JSON body):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` * | int | |
| `storeSysCode` * | string | |
| `paramType` | string | Specific type to reset, or all |

**Output:** `{ "flag": true, "msg": "..." }`

---

### `GET base/posAreaZone/list`
**Purpose:** Get list of all area/zone codes (used for region selection)

**Input:** None

**Output:** Array of zone objects:
```json
[{ "id": "...", "areaCode": "CN", "areaName": "China" }]
```

---

### `GET base/sysCityRegion/address`
**Purpose:** Get city/region address data (cascading address picker)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `parentId` * | string | `"CN"` for provinces; province code for cities; city code for districts |

**Output:** Array of region nodes — used to populate province → city → district dropdowns

---

### `GET base/posTradeInfo/tree`
**Purpose:** Get trade/industry category tree (used in registration)

**Input:** None

**Output:** Nested tree of trade type objects — app uses as `tradeTypeListNeedShow`

---

### `GET base/sysExpress/pagingQuery`
**Purpose:** Paginated list of express/courier services

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | |
| `limit` | int | |

**Output:** `[paged]` — `records[]` of courier objects

---

### `GET base/sysParam/page`
**Purpose:** Paginated system parameters list

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | |
| `limit` | int | |
| `paramType` | string | Filter by type |

**Output:** `[paged]`

---

### `PUT base/posCustomer/resetPwdNew`
**Purpose:** Reset a customer's password (admin action)

**Input (JSON body):**
| Param | Type | Notes |
|-------|------|-------|
| `id` * | string | Customer ID |
| `password` * | string | New password |

**Output:** `[envelope]` — `code: 0` on success

---

### `DELETE base/posCustomer/{id}`
**Purpose:** Delete a customer record

**Input:** URL path param `id` = customer ID

**Output:** `[envelope]` — `code: 0` on success

---

### `POST base/posCustomer/batchImportCustGrade`
**Purpose:** Batch import customer grade assignments

**Input (JSON body):** Array of customer grade mappings:
```json
[{ "custId": "...", "gradeId": "..." }]
```

**Output:** `[envelope]` — `code: 0` on success

---

### `POST base/posCustfee/adjustCustPoint`
**Purpose:** Manually adjust a customer's loyalty points (add or deduct)

**Input (JSON body):**
| Param | Type | Notes |
|-------|------|-------|
| `custId` * | string | Customer ID |
| `adjustPointNum` * | string | Points to add (positive) or deduct (negative), sent as string |

**Output:** `[envelope]` — `code: 0` on success

---

### `POST base/upload/uploadFileByStream?storeId={id}`
**Purpose:** Upload an image or file

**Input:** `multipart/form-data` with file binary. Query param: `storeId`

**Output:** `[envelope]`
```json
{ "data": "d8e4030c.../filename.png" }
```
Store the returned path as `imageUrl` for use in other API calls.

---

## MODULE 3 — GOODS / PRODUCTS

---

### `GET goods/posCategory/tree/{storeId}/{storeSysCode}`
**Purpose:** Get full category tree for a store

**Input (URL path + query params):**
| Param | Where | Notes |
|-------|-------|-------|
| `storeId` * | path | |
| `storeSysCode` * | path | |
| `useType` | query | `"0"` = all types |

**Output:** Nested category tree:
```json
[{ "id": "...", "cateName": "...", "children": [...] }]
```

---

### `GET goods/posCategory/cateNodesData`
**Purpose:** Get flat list of category nodes (for pickers/selectors)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` * | int | |
| `storeSysCode` * | string | |
| `isContainSubCate` | boolean | Include sub-categories |
| `isOnlineShow` | string | `"1"` = online only, `""` = all |
| `useType` | string | Category use type filter |

**Output:** Array of category node objects

---

### `GET goods/posCategory/cateOptions`
**Purpose:** Get categories as dropdown options

**Input (query params):** Same as `cateNodesData`

**Output:** Array of `{ value, label }` pairs for dropdowns

---

### `GET goods/posCategory/query`
**Purpose:** Paginated category query with filters

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | |
| `limit` | int | |
| `storeId` | int | |
| `storeSysCode` | string | |
| `cateName` | string | Name filter |

**Output:** `[paged]` — `records[]` of category objects

---

### `GET goods/posItemSpu/getItemSpuPage`
**Purpose:** Paginated SPU (product unit) list

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` * | int | |
| `limit` * | int | |
| `storeId` * | int | |
| `storeSysCode` * | string | |
| `itemName` | string | Name search |
| `itemCode` | string | Code search |
| `categoryId` | string | Category filter |
| `brandId` | string | Brand filter |
| `vendorId` | string | Vendor filter |
| `status` | string | Product status |

**Output:** `[paged]`
```json
{
  "records": [{ "id": "...", "itemName": "...", "itemCode": "...", "retailPrice": 0, "status": "..." }],
  "total": 100
}
```

---

### `GET goods/posItemSpu/getNotItemMapPage`
**Purpose:** Paginated list of SPUs not yet mapped to the current store (for cloud goods sync)

**Input (query params):** Same pagination + store params as `getItemSpuPage`

**Output:** `[paged]`

---

### `GET goods/posItemSpu/favorItemList`
**Purpose:** Get favourite/featured item list

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `favoriteId` * | string | Favourite list ID |
| `storeId` * | int | |
| `storeSysCode` * | string | |

**Output:** Array of item objects

---

### `GET goods/posItemSku/getItemSkuPage`
**Purpose:** Paginated SKU (stock keeping unit) list

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` * | int | |
| `limit` * | int | |
| `storeId` * | int | |
| `storeSysCode` * | string | |
| `itemName` | string | |
| `itemCode` | string | |
| `categoryId` | string | |
| `specs1` | string | SKU spec/variant |

**Output:** `[paged]`
```json
{
  "records": [{ "id": "...", "itemName": "...", "itemCode": "...", "specs1": "...", "retailPrice": 0, "wholePrice1": 0 }],
  "total": 100
}
```

---

### `GET goods/posItemSku/getItemSkuForSelectPage`
**Purpose:** SKU list optimised for picker/select modals (slimmer payload)

**Input (query params):** Same as `getItemSkuPage`

**Output:** `[paged]` — lighter SKU objects for display in select dropdowns

---

### `POST goods/posItemSku/getItemSkuList`
**Purpose:** Get full SKU list for a store (non-paginated, for bulk operations)

**Input (JSON body):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` * | int | |
| `storeSysCode` * | string | |

**Output:** Array of SKU objects (full details including pricing tiers `wholePrice1/2/3/4`)

---

### `GET goods/posItem/templateStoreResultMap/page`
**Purpose:** Paginated template-to-store product mapping results

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | |
| `limit` | int | |
| `storeId` | int | |

**Output:** `[paged]`

---

### `GET goods/posBrand/query`
**Purpose:** Paginated brand query

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | |
| `limit` | int | |
| `storeId` | int | |
| `brandName` | string | Name filter |

**Output:** `[paged]` — `records[]` → app uses as `brandItems`

---

### `GET goods/posBrand/selectBrandList`
**Purpose:** Brand list for select/dropdown

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` * | int | |
| `storeSysCode` * | string | |

**Output:** Array of `{ id, brandName }` objects

---

### `GET goods/posVendor/getVendorList`
### `GET goods/posVendor/getVendorList?storeId={id}&storeSysCode={code}`
**Purpose:** Full vendor list for a store

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` * | int | |
| `storeSysCode` * | string | |

**Output:** `[envelope]` — `data` = array of vendor objects. App adds an "All vendors" entry via `addAllVendor()`.

---

### `GET goods/posVendor/selectVendorList`
**Purpose:** Vendor list for select/dropdown (slimmer)

**Input (query params):** Same as `getVendorList`

**Output:** Array of `{ id, vendorName }` objects

---

### `GET goods/posVendor/vendorList`
**Purpose:** Simple vendor list (no pagination)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` * | int | |
| `storeSysCode` * | string | |

**Output:** Array of vendor objects

---

### `GET goods/posVendorcheckdetail/page`
**Purpose:** Paginated vendor check/audit detail

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | |
| `limit` | int | |
| `storeId` | int | |

**Output:** `[paged]`

---

### `GET goods/posNutrient/page`
**Purpose:** Paginated nutrient/ingredient information

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | |
| `limit` | int | |
| `storeId` | int | |
| `nutrientName` | string | Filter |

**Output:** `[paged]`

---

### `GET goods/posPromh/getSubStoreCheckData`
**Purpose:** Get promotion check data for sub-stores (franchise validation)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` | int | |
| `storeSysCode` | string | |
| `promId` | string | Promotion ID |

**Output:** `[envelope]` — `data` = validation result object

---

### `GET goods/posPurchaseh/getParentStore`
**Purpose:** Get parent store info for purchase orders (chain/franchise)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` * | int | Current store |

**Output:** `[envelope]` — `data` = parent store object

---

### `GET goods/batchStock/page`
**Purpose:** Paginated batch stock entries

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | |
| `limit` | int | |
| `storeId` | int | |

**Output:** `[paged]`

---

### `GET goods/posStktemplate/findByPage`
**Purpose:** Stock templates (paginated)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | |
| `limit` | int | |
| `storeId` | int | |

**Output:** `[paged]`

---

### `GET goods/posStoreArea/list`
**Purpose:** List of store floor areas/zones (e.g. indoor, outdoor, VIP room)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` * | int | |
| `storeSysCode` * | string | |

**Output:** Array of area objects

---

### `GET goods/posStoreArea/page2`
**Purpose:** Paginated store areas (v2)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | |
| `limit` | int | |
| `storeId` | int | |

**Output:** `[paged]`

---

### `GET goods/posStoreTableType/selectStoreTypeList`
**Purpose:** List of table types in the store

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` * | int | |
| `storeSysCode` * | string | |
| `isContainSubCate` | boolean | Include sub-types |

**Output:** Array of table type objects

---

### `GET goods/posStoreTable/page`
**Purpose:** Paginated table list

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | |
| `limit` | int | |
| `storeId` | int | |
| `areaId` | string | Filter by area |
| `tableTypeId` | string | Filter by type |

**Output:** `[paged]`

---

### `GET goods/warehouse/page`
**Purpose:** Paginated warehouse list

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` | int | |
| `limit` | int | |
| `storeId` | int | |

**Output:** `[paged]`

---

## MODULE 4 — CUSTOMERS

---

### `GET custs/posCustomer/page`
**Purpose:** Paginated customer list with filters

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` * | int | Default 1 |
| `limit` * | int | Default 10 |
| `storeId` * | int | |
| `storeSysCode` * | string | |
| `custName` | string | Name search |
| `gradeId` | string | Grade filter |
| `isWxCust` | string | `"2"` = all, `"1"` = WeChat only |
| `timeType` | string | `"BD"` = birthday, `"RG"` = registration |
| `starttime` | string | Date range start `yyyy-MM-dd` |
| `endtime` | string | Date range end |
| `custLabels` | string | Comma-separated label IDs |
| `status` | string | `"Y"` = active, `"N"` = inactive |
| `expired` | string | Expiry filter |
| `isCancelPush` | string | Push cancelled flag |
| `isWhole` | string | Is whole-store customer |
| `qryAmtType` | string | Amount query type: `"ye"` = balance |
| `qryAmtOpt` | string | Operator: `"gt"` = greater than |
| `qryAmtValue` | number | Amount threshold |
| `isExactQry` | string | Exact match flag |

**Output:** `[paged]`
```json
{
  "records": [{ "id": "...", "custName": "...", "custCode": "...", "ttlpoints": 100, "storeName": "..." }],
  "total": 500
}
```

---

### `GET custs/posCustomer/gainStoreCustInfos`
**Purpose:** Get aggregated customer stats for dashboard

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` * | int | |
| `storeSysCode` * | string | (passed as header) |

**Output:** `[envelope]`
```json
{
  "data": {
    "custTotal": 1200,
    "chargeAccountTotal": 55000.00,
    "pointsTotal": 98000,
    "rechargeTotal": 120000.00
  }
}
```

---

### `GET custs/posCustgrade/getStoreCustGrade/{storeId}/{storeSysCode}`
**Purpose:** Get customer grade/tier list for a store

**Input:** URL path params: `storeId`, `storeSysCode`

**Output:** `[envelope]` — `data` array of grade objects:
```json
[{ "id": "...", "gradeName": "Gold", "key": "..." }]
```
App maps these with `title = gradeName`, `key = id`, `isLeaf = true` for tree display.

---

### `GET custs/posCustlabel/findAllLabel`
**Purpose:** Get all customer labels/tags for a store

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` * | int | |
| `storeSysCode` * | string | |

**Output:** Array of label objects:
```json
[{ "id": "...", "labelName": "VIP", "labelColor": "#FF0000" }]
```

---

### `GET custs/posSpecs/selectCustSpec`
**Purpose:** Get customer attribute/spec options (for custom fields)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` * | int | |
| `specsType` | string | `"custLable"` = customer label type |

**Output:** Array of spec option objects

---

### `GET custs/posCouponh/listAvailableCollectCouponsBySy`
**Purpose:** List coupons available for customers to collect (system-level)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` * | int | |
| `storeSysCode` * | string | |
| `shareCase` | string | `"y"` = shared/shareable |
| `suitRanges` | int | `1` = all ranges |

**Output:** `[envelope]` — `data` array of coupon objects:
```json
[{
  "id": "...",
  "couponName": "10% Off",
  "couponTypeName": "Discount",
  "couponValue": 10,
  "storeName": "...",
  "storeSysCode": "..."
}]
```

---

### `POST custs/posCustpromh/add`
**Purpose:** Create a new customer promotion/campaign

**Input (JSON body):**
| Param | Type | Notes |
|-------|------|-------|
| `promType` * | string | Campaign type enum |
| `promName` * | string | Campaign name |
| `promCode` | string | Campaign code |
| `storeId` * | int | |
| `storeSysCode` * | string | |
| `startDate` * | string | `yyyy-MM-dd` |
| `endDate` * | string | `yyyy-MM-dd` |
| `startTime` | datetime | |
| `endTime` | datetime | |
| `alidDateType` | string | `"D"` = daily, `"W"` = weekly, `"M"` = monthly |
| `validDates` | string | Comma-separated valid dates/days |
| `dayType` | string | `"A"` = all day, `"T"` = time period |
| `timePeriods` | array | `[{ "s": "HH:mm", "e": "HH:mm" }]` |
| `isAdjustLegalDay` | boolean | Adjust for public holidays |
| `invalidDatePeriods` | array | `[{ "s": "yyyy-MM-dd", "e": "yyyy-MM-dd" }]` |
| `actStoreId` | array | Active store IDs |
| `actStoreSysCode` | array | Active store sys codes |
| `userType` | string | `"A"` = all users |
| `userList` | array | Specific user list |
| `remark` | string | Notes |
| `promStockPerDay` | int | Max stock per day (0 = unlimited) |
| `promMaxStock` | int | Max total stock |
| `promCntPerPerson` | int | Max per customer |
| `promCntPerPersonDay` | int | Max per customer per day |
| `isSendSms` | boolean | Send SMS notification |
| `isSendWx` | boolean | Send WeChat notification |
| `advanceNotifyDays` | int | Days in advance to notify |
| `isJoinShare` | boolean | Allow sharing |
| `shareMainTitle` | string | Share card main title |
| `shareSubTitle` | string | Share card subtitle |
| `sharePosterUrl` | string | Share poster image path |
| `shareH5Url` | string | H5 share URL |
| `shareXcxUrl` | string | Mini Program share URL |
| `ruleJson` | string | JSON string of rule details |

**Output:** `[envelope]` — `code: 0` on success

---

### `PUT custs/posCustpromh/edit`
**Purpose:** Edit an existing customer promotion

**Input:** Same as `add` above, plus `id` field

**Output:** `[envelope]` — `code: 0` on success

---

### `GET custs/posCustexrule/getCountByPointValue`
**Purpose:** Check if a points exchange rule with the given point value already exists

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `pointValue` * | number | Points value to check |
| `storeId` * | int | |
| `storeSysCode` * | string | |
| `ruleType` | string | Rule type |

**Output:** Integer — count of existing rules. `0` = no conflict, `> 0` = duplicate exists.

---

### `POST custs/posCustexrule/saveRuleAndRuleDetail`
**Purpose:** Save a points exchange rule with its detail items

**Input (JSON body):**
```json
{
  "posCustexrule": {
    "id": "",
    "pointValue": 100,
    "ruleScope": "storeId1,storeId2",
    "validityDateType": "D",
    "validityDay": 30,
    "ruleStartDate": "2026-01-01",
    "ruleEndDate": "2026-12-31",
    "startDate": "2026-01-01",
    "endDate": "2026-12-31",
    "remark": ""
  },
  "posCustexruledetails": [
    {
      "itemId": "...",
      "couponName": "...",
      "couponValue": 10,
      "price": 5.00,
      "allowTotalExQty": 100,
      "allowOneExQty": 1,
      "singleExQtyPerDay": 1,
      "itemStoreSysCode": "...",
      "crtStoreName": "..."
    }
  ],
  "storeId": 123,
  "storeSysCode": "...",
  "storeName": "My Store"
}
```

**Output:** `[envelope]` — `code: 0` + success message on success

---

## MODULE 5 — SALES & DASHBOARD

---

### `GET sales/dashboard/loadDashboardSummary`
**Purpose:** Load all dashboard summary metrics

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeId` * | int | |
| `storeSysCode` * | string | (also passed as header) |
| `startDate` | string | `yyyy-MM-dd` |
| `endDate` | string | `yyyy-MM-dd` |
| `type` | string | Period type |

**Output:** `[envelope]`
```json
{
  "data": {
    "sumList": [...],
    "weekData": [...],
    "tendenData": [...]
  }
}
```
- `sumList` — summary KPI cards (revenue, orders, etc.)
- `weekData` — weekly breakdown data
- `tendenData` — trend/time-series data (odd-length arrays trimmed by 1 from the start)

---

## MODULE 6 — SMART TRAFFIC / DISH RECOMMENDATION

---

### `GET api/posSmarttrafficTemplate/getList`
**Purpose:** Get list of smart traffic (dish recommendation) templates

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `storeIds` * | string | Store ID (note: named `storeIds`) |
| `type` * | string | Template type |

**Output:** Array of template objects → app stores as `templateList`

---

### `GET api/posSmarttrafficTemplate/getItemListByTemplateId`
**Purpose:** Get items/dishes for a specific smart traffic template (paginated)

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `page` * | int | Default 1 |
| `limit` * | int | Default 10 |
| `storeId` * | string | |
| `templateId` * | string | From template list above |
| `mainStoreId` | string | Parent store ID |
| `orderItems` | string | `"1"` = include order data |

**Output:** `[paged]`
```json
{
  "records": [{
    "Id": "...",
    "itemCode": "...",
    "itemName": "...",
    "wholePrice1": 0,
    "wholePrice2": 0,
    "wholePrice3": 0,
    "wholePrice4": 0
  }],
  "total": 50
}
```
Price tier used depends on `wholePriceType` flag: `1/null` → `wholePrice1`, `2` → `wholePrice2`, etc.

---

### `GET api/posCategory/cateNodesData`
**Purpose:** Category nodes for smart traffic context (same structure as goods module but different base path)

**Input:** Same as `goods/posCategory/cateNodesData`

**Output:** Array of category node objects

---

## MODULE 7 — PAYMENTS

---

### `GET hpay/wpSellerServicer/getByPayServiceProxyID`
**Purpose:** Get payment service proxy configuration by ID

**Input (query params):**
| Param | Type | Notes |
|-------|------|-------|
| `payServiceProxyID` * | string | Payment proxy ID |

**Output:** `[envelope]`
```json
{
  "data": {
    "payServiceProxyID": "...",
    "internalAccout": "..."
  }
}
```

---

## APPENDIX A — Common Query Patterns

### Pagination
```json
{ "page": 1, "limit": 10 }
```
Response: `{ "records": [...], "total": 200 }`

### Store Context (required by most endpoints)
```json
{ "storeId": 123, "storeSysCode": "STORE_ABC" }
```

### Auth Header
```
Authorization: Bearer <access_token>
```

### File Upload → Use in API
1. Upload: `POST base/upload/uploadFileByStream?storeId=123`  
   → Returns path like `"abc123/image.png"`
2. Use in body: `"imageUrl": "abc123/image.png"`
3. Display: prepend `IMAGE_DOWN_URL` config value to path

---

## APPENDIX B — Key Enum Values

| Field | Value | Meaning |
|-------|-------|---------|
| `status` | `"Y"` / `"N"` | Active / Inactive |
| `isAdjustLegalDay` | `"Y"` / `"N"` | Holiday adjustment on/off |
| `isSendSms` / `isSendWx` | `"N"` = off, other = on | Notification toggle |
| `isJoinShare` | `"Y"` / `"N"` | Sharing enabled |
| `alidDateType` | `"D"` = daily, `"W"` = weekly, `"M"` = monthly | Valid date type |
| `dayType` | `"A"` = all day, `"T"` = time period | Day time type |
| `userType` | `"A"` = all users | Promotion target |
| `isWxCust` | `"1"` = WeChat only, `"2"` = all | Customer filter |
| `timeType` | `"BD"` = birthday, `"RG"` = registration | Customer date type |
| `qryAmtOpt` | `"gt"` = greater than, `"lt"` = less than | Amount filter operator |
| `specsType` | `"custLable"` | Customer label spec type |
| `storeType` | `"1"` = normal, `"2"` = proxy | Store type for login |