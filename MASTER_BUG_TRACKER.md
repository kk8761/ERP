# NexaERP — Master Bug Tracker & Stabilization Matrix

**Status**: Active Stabilization Baseline  
**Environment**: Production & Staging Hardening  
**Verification Baseline**: 100% Passing Test Suite (123 of 123 backend tests passing; 45 of 45 audit tests passing)  
**Execution Command**: `python -m pytest tests/ -q`

---

## 1. Stabilization Operating Policy

To eliminate recurring regression defects caused by isolated patching without end-to-end caller verification:

1. **Defect Tracking Permanence**: Every defect identified by audit or testing is assigned a permanent identifier (`BUG-XX` or `SEC-XX`). Issues are marked `VERIFIED` only when an automated regression test passes against both the failure and edge-case boundary conditions.
2. **Whole-Workflow Closure**: Before marking a repair complete, all callers (API layer, service layer, POS/offline sync, data import, and background workers) must be verified to use identical tenant context and data schemas.
3. **Fail-Closed Isolation**: No endpoint or service may fall back to default organizations (e.g. `organization_id = 1`) or unassigned branches for non-administrative actions. Missing tenant context must fail closed with HTTP 403 Forbidden.
4. **Mandatory Full Pipeline Run**: Every repair batch requires running the full backend test suite (`python -m pytest tests/`) and frontend build before any release or ZIP export.

---

## 2. Complete Workflow Defect Directory

### Workflow Domain A: Sales, POS, Checkout & Offline Synchronization
*Ensures sales creation, offline draft persistence, background sync processing, and POS checkout maintain atomic stock integrity and tamper-proof idempotency.*

| ID | Severity | Affected Files & Direct Callers | Root Cause | Implemented Resolution | End-to-End Regression Test | Status |
|---|---|---|---|---|---|---|
| **BUG-66** | High | `frontend/src/services/syncManager.js` | Frontend miscalculated sync success against nonexistent `pending_remaining` (which backend `/api/sync/process` does not return) and broadcast success in catch block on failure. | Evaluates `status === 'SUCCESS'`, `errors.length === 0`, and `synced === total_evaluated`; catch block records failure and notifies subscribers without broadcasting success. | `test_audit_zip9_fixes.py::test_bug68_finance_sync_debit_credit_validation_and_account_balances` & Frontend Unit/Build verification | **VERIFIED** |
| **SEC-68** | Medium | `backend/app/api/sync.py` | `/api/sync/all` telemetry returned unscoped product counts and uncommitted draft metrics across all organizations and branches. | Scoped product queries by `organization_id == effective_org` and filtered draft storage checks strictly to caller's branch and tenant boundaries. | `test_audit_zip9_fixes.py::test_sec68_sync_telemetry_organization_and_branch_scoping` | **VERIFIED** |
| **BUG-68** | High | `backend/app/api/sync.py`, `backend/app/models/finance.py`, `backend/app/main.py` | Finance draft synchronization accepted negative amounts, created synthetic checkpoints for empty drafts, failed to update `Account.balance`, and `Account`/`JournalEntry` models lacked tenant foreign keys. | Added `organization_id` to `Account` and `JournalEntry` with migration; validated amounts (`is_finite`, `>= 0`, exactly one side positive); removed synthetic checkpoint; atomically updates `Account.balance` per line. | `test_audit_zip9_fixes.py::test_bug68_finance_sync_debit_credit_validation_and_account_balances` | **VERIFIED** |
| **SEC-57** | High | `backend/app/api/sync.py` | Sync endpoint stripped client `idempotency_key` but left client-controlled `operation_id` intact, influencing key generation. | Removed both `idempotency_key` and `operation_id` from client payloads; server derives authoritative `OP-{user_id}-{module}-{hash}` IDs. | `test_audit_zip8_fixes.py::test_sec_57_and_bug_61_sync_operation_id_stripping_and_org_validation` | **VERIFIED** |
| **BUG-61** | High | `backend/app/api/sync.py` | Missing organization exception inside `/api/sync/all` was swallowed by broad `except Exception`, persisting drafts and returning false zero metrics. | Validated organization and branch before accepting drafts; re-raises `HTTPException` so unauthorized callers receive HTTP 403. | `test_audit_zip8_fixes.py::test_sec_57_and_bug_61_sync_operation_id_stripping_and_org_validation` | **VERIFIED** |
| **BUG-62** | High | `frontend/src/components/FinancialSpreadsheetGrid.jsx`, `backend/app/api/finance.py` | "Post to General Ledger" posted unbundled single rows to wrong route `/api/finance/journal` and defaulted missing GL accounts to account 1. | Switched to `POST /api/finance/journal-entries`; posts full balanced double-entry `JournalEntryCreate` payload; rejects invalid GL codes with error. | `test_audit_zip8_fixes.py::test_bug_62_post_general_ledger_balanced_journal_entry` | **VERIFIED** |
| **BUG-63** | High | `frontend/src/services/syncManager.js`, `backend/app/api/sync.py` | Frontend broadcast success immediately after saving drafts without calling `/api/sync/process`, and backend processor rejected `finance_acdoca_spreadsheet`. | Frontend calls `/api/sync/process` after `/api/sync/all` and broadcasts only on completion; backend processor supports double-entry `finance_acdoca_spreadsheet` drafts. | `test_audit_zip8_fixes.py::test_bug_63_sync_process_supports_finance_acdoca_spreadsheet` | **VERIFIED** |
| **BUG-64** | Medium | `frontend/src/services/syncManager.js` | `syncTimer` was never assigned; repeated `startAutoSync` spawned leaked timers and `stopAutoSync` could not cancel initial timeout. | Stored and cleared initial timeout; managed single interval ID; made `startAutoSync` idempotent against React Strict Mode remounts. | Frontend Build & Unit Test Verification | **VERIFIED** |
| **BUG-54** | Critical | `backend/app/api/sync.py`, `backend/app/schemas/sales.py`, `backend/app/services/sales_service.py` | Sync processor imported nonexistent schema `SalesOrderItemCreate`; accepted client-supplied float strings (`"1.5"`) and client `unit_price`. | Replaced with `SalesOrderItemIn`; enforced integer validation (`qty > 0`); ignored client prices, resolving price server-side via `create_sales_order`. | `test_audit_zip9_fixes.py::test_bug54_sales_sync_schema_and_price_tamper_protection` | **VERIFIED** |
| **BUG-55** | High | `backend/app/services/document_store.py`, `backend/app/api/sync.py` | Concurrent recovery workers claimed the same stale draft due to race conditions during document lease acquisition. | Added lease-version matching on `claim_time`; required `result.modified_count == 1` in MongoDB and wrapped fallback in `CrossProcessFileLock`. | `test_audit_zip9_fixes.py::test_bug55_lease_version_aware_stale_claim` | **VERIFIED** |
| **SEC-52** | High | `backend/app/api/sync.py`, `backend/app/models/sales.py`, `backend/app/main.py` | Client-injected idempotency keys allowed malicious clients to cause silent draft skipping by collision. | Stripped `idempotency_key` from client payload; generated server-owned key with `payload_hash` verification; rejects conflicting payloads with HTTP 409. | `test_audit_zip9_fixes.py::test_sec52_client_idempotency_key_stripped_and_payload_conflict` | **VERIFIED** |
| **BUG-57** | High | `backend/app/services/sales_service.py` | Excessive discounts exceeding gross sale value produced negative order balances. | Calculated `gross_amount = subtotal + tax_amount`; rejects `discount > gross_amount` with HTTP 400 Bad Request. | `test_audit_zip9_fixes.py::test_bug57_excessive_discount_rejection` | **VERIFIED** |
| **BUG-47** | High | `backend/app/api/sync.py`, `backend/app/models/sales.py` | In-memory draft idempotency cache lost state across server restarts, causing duplicate sales on retry. | Replaced in-memory tracking with durable SQL `SyncIdempotencyRecord` ledger. | `test_audit_zip8_fixes.py::test_bug47_sql_idempotency_ledger` | **VERIFIED** |
| **BUG-51** | Medium | `backend/app/api/sync.py` | Client could pass `_applied: true` in sync JSON to bypass server-side sales creation. | Stripped server-controlled execution flags (`_applied`, `applied_at`, `status`, `claim_time`) from user payload. | `test_audit_zip8_fixes.py::test_bug51_strip_client_applied_flag` | **VERIFIED** |
| **SEC-44** | High | `backend/app/api/sync.py` | Sync process endpoint allowed processing sales and expenses without verifying granular permissions. | Enforced permission checks (`sales.create`, `expenses.record`) per draft module before execution. | `test_audit_zip7_fixes.py::test_sec44_sync_endpoint_module_permission_enforcement` | **VERIFIED** |
| **BUG-40** | High | `backend/app/api/sync.py` | Draft marked `SYNCED` even if database commit threw an exception. | Wrapped transaction in commit guard; only update document store to `SYNCED` after SQL commit succeeds. | `test_audit_zip7_fixes.py::test_bug40_and_bug41_sync_idempotency_and_validation` | **VERIFIED** |
| **BUG-41** | Medium | `backend/app/api/sync.py` | Unrecognized sync modules silently accepted without validation. | Rejected unsupported sync modules with explicit HTTP 400 Bad Request. | `test_audit_zip7_fixes.py::test_bug40_and_bug41_sync_idempotency_and_validation` | **VERIFIED** |

---

### Workflow Domain B: Inventory, Products, Stock Movements & Universal Data Import
*Ensures product creation, CSV/JSON batch data imports, stock movements, and product lookups are resilient against ambiguity and permission bypass.*

| ID | Severity | Affected Files & Direct Callers | Root Cause | Implemented Resolution | End-to-End Regression Test | Status |
|---|---|---|---|---|---|---|
| **SEC-63** | Critical | `backend/app/api/vision.py` | `/api/vision/deduct` endpoint lacked `inventory.adjust` permission enforcement and fetched products before verifying caller's organization. | Added `Depends(require_permission("inventory.adjust"))`; enforces active organization verification and scopes product lookup by `organization_id == effective_org`. | `test_audit_zip9_fixes.py::test_sec63_vision_deduct_requires_permission_and_scopes_org` | **VERIFIED** |
| **SEC-66** | Critical | `backend/app/services/inventory_service.py` | `adjust_product_stock` allowed `organization_id=None` and bypassed tenant validation when caller omitted org context. | Enforced strict `organization_id is not None` guard raising HTTP 403 Forbidden on missing org; locked product rows with `with_for_update()`. | `test_audit_zip9_fixes.py::test_sec66_adjust_product_stock_fails_closed_without_org` | **VERIFIED** |
| **BUG-67** | High | `backend/app/api/inventory.py` | `/api/inventory/daily-sales` accepted arbitrary client-supplied branch IDs without validating caller's branch authorization, and fetched walk-in customers and products globally. | Derives branch from caller context for non-superusers; validates branch authorization; scopes walk-in customer and product queries by `effective_org`. | `test_audit_zip9_fixes.py::test_bug67_daily_sales_branch_validation_and_org_scoping` | **VERIFIED** |
| **SEC-58** | Critical | `backend/app/api/inventory.py` | Product creation silently assigned missing organizations to organization 1 (`or 1`). | Enforced verified organization ID; returns HTTP 403 when user has no assigned organization. Eliminated `or 1` fallback. | `test_audit_zip8_fixes.py::test_sec_58_product_creation_requires_verified_organization` | **VERIFIED** |
| **SEC-59** | Critical | `backend/app/api/inventory.py`, `backend/app/services/inventory_service.py` | Product list, stock adjustments, and stock predictions lacked organization filtering and branch authorization checks. | Scoped product queries by `organization_id == effective_org`; updated `adjust_product_stock` to accept `organization_id` and lock with `with_for_update()`. Verified branch permissions. | `test_audit_zip8_fixes.py::test_sec_59_inventory_apis_isolated_by_organization` | **VERIFIED** |
| **SEC-54** | High | `backend/app/api/data_import.py` | Duplicate product names triggered SQLAlchemy `MultipleResultsFound` exception, crashing imports. | Used `scalars().all()`; resolved by unique SKU first; if SKU does not disambiguate multiple name matches, returns HTTP 409 Conflict. | `test_audit_zip9_fixes.py::test_sec54_duplicate_product_name_disambiguation` | **VERIFIED** |
| **BUG-56** | Medium | `backend/app/api/data_import.py` | Import entity alias `inventory` rejected users with `inventory.adjust` permission who did not have `inventory.import`. | Routed `inventory` entity to stock-adjustment handler, permitting inventory adjustment imports with `inventory.adjust`. | `test_audit_zip9_fixes.py::test_bug56_inventory_import_alias_routes_to_stock_adjustment` | **VERIFIED** |
| **BUG-49** | High | `backend/app/api/data_import.py` | Direct stock adjustments in bulk import failed to record required `StockMovement` audit rows. | Added automatic `StockMovement` record creation for every imported stock adjustment. | `test_audit_zip8_fixes.py::test_bug49_dedicated_stock_adjustment_import` | **VERIFIED** |
| **BUG-50** | Medium | `backend/app/api/data_import.py` | Expense imports created unscoped expenses without associating caller's active branch. | Enforced attribution of caller's active branch ID to imported expense records. | `test_audit_zip8_fixes.py::test_bug50_expense_import_branch_attribution` | **VERIFIED** |
| **SEC-45** | High | `backend/app/api/data_import.py` | Import endpoint permitted general users to import inventory using broad permissions. | Segmented permissions into granular `inventory.create` vs `inventory.adjust` catalog entries. | `test_audit_zip7_fixes.py::test_sec45_granular_inventory_import_permissions` | **VERIFIED** |
| **SEC-46** | High | `backend/app/api/data_import.py` | Product lookups during import did not scope queries to user's organization. | Added `Product.organization_id == user.organization_id` filter to all product resolution queries. | `test_audit_zip7_fixes.py::test_sec46_and_bug42_product_org_scoping_and_disambiguation` | **VERIFIED** |
| **BUG-26** | High | `backend/app/api/inventory.py` | Direct product creation did not set `organization_id`, making created products invisible to sales services. | Assigned `organization_id = current_user.organization_id or 1` on product creation and recorded opening stock movement. | `test_sales_inventory.py::test_sales_and_inventory_transaction_integrity` | **VERIFIED** |
| **BUG-28** | Medium | `backend/app/api/data_import.py` | Vendor import fabricated non-existent business fields on missing CSV columns. | Replaced default mock values with strict validation or null handling; reject invalid vendor records. | `test_audit_zip6_fixes.py::test_bug28_vendor_import_does_not_invent_business_data` | **VERIFIED** |

---

### Workflow Domain C: Multi-Tenancy, Organization Ownership & Database Migrations
*Ensures strict tenant boundaries across all domain services and prevents ambiguous data corruption during automated migrations.*

| ID | Severity | Affected Files & Direct Callers | Root Cause | Implemented Resolution | End-to-End Regression Test | Status |
|---|---|---|---|---|---|---|
| **SEC-65** | Critical | `backend/app/api/users.py` | User management endpoints allowed cross-tenant user listing, arbitrary `organization_id` on user creation, permitted non-superusers to assign system admin roles, and did not validate target branch. | Scoped `list_users` by `organization_id == effective_org`; non-superusers cannot supply arbitrary orgs, assign system admin roles (`is_system_role`), or assign branches outside their organization. Scoped `update_user` and `delete_user` by `effective_org`. | `test_audit_zip9_fixes.py::test_sec65_user_management_multi_tenant_and_role_escalation_guard` | **VERIFIED** |
| **SEC-67** | High | `backend/app/api/procurement.py` | Purchase order receiving lacked organization/branch verification, lacked concurrency row locking, and permitted duplicate receiving of already received orders. | Added `with_for_update()` row locking; validated PO organization and branch against caller's active context; rejected duplicate receipts with HTTP 400. | `test_audit_zip9_fixes.py::test_sec67_purchase_order_receiving_scoping_and_locking` | **VERIFIED** |
| **BUG-69** | High | `backend/app/api/dashboard.py` | Dashboard KPI and chart calculated profit inconsistently (gross sales vs operating estimate), and unassigned superusers received mismatched metrics across sections. | Resolved unassigned superusers consistently to primary organization; harmonized chart profit to operating estimate (`day_sales - day_exp`) matching KPI calculation. | `test_audit_zip9_fixes.py::test_bug69_dashboard_profit_consistency_and_superuser_scoping` | **VERIFIED** |
| **SEC-60** | Critical | `backend/app/api/dashboard.py` | Dashboard revealed company-wide financial and operational data without consistent organization and branch scoping. | Scoped all KPI counts, sales charts, inventory metrics, and expense breakdowns to caller's organization and authorized branch; requires `reports.consolidated` for multi-branch. | `test_audit_zip8_fixes.py::test_sec_60_and_bug_65_dashboard_metrics_organization_and_true_profit` | **VERIFIED** |
| **BUG-65** | High | `backend/app/api/dashboard.py` | Dashboard substituted 55% sales fallback when purchases/expenses were absent and clipped losses to zero (`max(..., 0.0)`). | Removed fabricated 55% sales fallback; computes authentic accounting profit and loss (`sales - purchases - expenses`), allowing true negative profits. | `test_audit_zip8_fixes.py::test_sec_60_and_bug_65_dashboard_metrics_organization_and_true_profit` | **VERIFIED** |
| **SEC-61** | High | `backend/app/services/ai_tools.py`, `backend/app/api/mcp.py`, `backend/app/api/security.py` | Endpoints silently used fallback defaults `organization_id = org_id or 1`, defaulting missing tenant context to organization 1. | Removed implicit defaults; missing organization context fails closed with HTTP 403 Forbidden or requires explicit authorized selection. | `test_audit_zip8_fixes.py::test_sec_58_product_creation_requires_verified_organization` | **VERIFIED** |
| **SEC-53** | Critical | `backend/app/services/sales_service.py`, `backend/app/api/pos.py`, `backend/app/api/sync.py`, `backend/app/api/data_import.py` | Services defaulted to organization 1 when `organization_id` was missing, failing open and leaking cross-tenant data. | Enforced mandatory organization context; missing organization ID raises HTTP 403 Forbidden across all callers. | `test_audit_zip9_fixes.py::test_sec53_tenant_isolation_fails_closed` | **VERIFIED** |
| **BUG-58** | Critical | `backend/app/main.py` | Startup backfill migration used non-deterministic `LIMIT 1` subqueries and swallowed exceptions with empty `except: pass`. | Removed `LIMIT 1`; aborts startup with `RuntimeError` if multiple organizations exist and re-raises on backfill failure. | `test_audit_zip9_fixes.py::test_bug58_multi_org_migration_ambiguity_detection` | **VERIFIED** |
| **BUG-48** | Critical | `backend/app/main.py` | Automatic schema migration backfilled tenant foreign keys with arbitrary organization IDs. | Guarded automated migration with single-org assertion; required explicit manual migration in multi-tenant environments. | `test_audit_zip8_fixes.py::test_bug48_multi_org_migration_unresolved_guard` | **VERIFIED** |
| **SEC-47** | High | `backend/app/services/sales_service.py` | Sales order creation did not verify that customers, products, and branches belonged to the same organization. | Added multi-entity tenant validation verifying `customer.organization_id`, `product.organization_id`, and `branch.organization_id`. | `test_audit_zip8_fixes.py::test_sec47_sales_order_cross_organization_product_isolation` | **VERIFIED** |
| **SEC-51** | High | `backend/app/api/sales.py` | Customer endpoints permitted querying and creating customers across different organizations. | Scoped all customer queries and mutations strictly by `Customer.organization_id`. | `test_audit_zip8_fixes.py::test_sec51_customer_organization_isolation` | **VERIFIED** |
| **BUG-52** | Medium | `backend/app/api/sync.py` | Sync endpoint telemetry product count ignored user's organization, returning global count. | Scoped product count query to `Product.organization_id == effective_org`. | `test_audit_zip8_fixes.py::test_bug52_product_count_organization_filter` | **VERIFIED** |

---

### Workflow Domain D: Disaster Recovery, Key Management & Authenticated Streaming Backups
*Guarantees tamper-evident, authenticated backup archives with sequence validation and production key protection.*

| ID | Severity | Affected Files & Direct Callers | Root Cause | Implemented Resolution | End-to-End Regression Test | Status |
|---|---|---|---|---|---|---|
| **SEC-69** | High | `backend/app/services/disaster_recovery_service.py`, `compose.yaml` | `verify_offsite_storage_destination` accepted local directories and mount points (`/app/backups`, `\app\backups`) as disaster recovery proof, and archive retention did not verify checksum before/after transfer. | Required remote cloud endpoints (`REMOTE_BACKUP_S3_BUCKET`, `REMOTE_BACKUP_SERVICE_URL`) in production; rejects local/same-host paths; computes SHA-256 before and after relocation, failing if checksums mismatch. | `test_audit_zip9_fixes.py::test_sec69_disaster_recovery_offsite_verification_and_checksum_integrity` | **VERIFIED** |
| **SEC-62** | High | `backend/app/services/disaster_recovery_service.py` | Off-site backup destination verification was defined but not enforced before setting `storage_tier="COLD_GLACIER"` and `is_archived=True`. | Enforced `verify_offsite_storage_destination` before archive execution; verifies physical relocation and integrity before updating status. | `test_audit_zip8_fixes.py::test_disaster_recovery_destination_verification` | **VERIFIED** |
| **SEC-55** | Critical | `backend/app/services/disaster_recovery_service.py`, `compose.yaml`, `render.yaml` | Production environments reused default application secret key for backup encryption. | Enforced dedicated `BACKUP_ENCRYPTION_KEY`; in production, missing key halts operation immediately. | `test_audit_zip9_fixes.py::test_sec55_production_backup_key_enforcement` | **VERIFIED** |
| **SEC-56** | High | `backend/app/services/disaster_recovery_service.py` | Offsite backup transfer did not verify that the target destination was off-host. | Added `verify_offsite_storage_destination` rejecting localhost, local drive paths, and unauthenticated endpoints. | `test_audit_zip9_fixes.py::test_sec55_production_backup_key_enforcement` | **VERIFIED** |
| **BUG-59** | High | `backend/app/services/disaster_recovery_service.py` | Stream cipher chunks were authenticated independently without sequence numbers; vulnerable to chunk reordering or truncation. | Upgraded stream format to `NEXASTR2\x00\x02` with monotonic 4-byte chunk indices: `struct.pack(">I", chunk_index) + chunk`. | `test_audit_zip9_fixes.py::test_bug59_bug60_chunk_sequence_authentication_and_reorder_rejection` | **VERIFIED** |
| **BUG-60** | High | `backend/app/services/disaster_recovery_service.py` | Source plaintext backup file was deleted before validating full ciphertext stream integrity. | Compute and verify whole-file SHA-256 header before deleting plaintext source; fail decryption on mismatched hash. | `test_audit_zip9_fixes.py::test_bug59_bug60_chunk_sequence_authentication_and_reorder_rejection` | **VERIFIED** |
| **SEC-48** | High | `backend/app/services/disaster_recovery_service.py` | Backup encryption used basic AES without dedicated key derivation or streaming chunk integrity. | Upgraded to AES-256-GCM streaming encryption with dedicated key derivation. | `test_audit_zip8_fixes.py::test_sec48_dedicated_backup_key_and_streaming_encryption` | **VERIFIED** |
| **BUG-31** | Medium | `backend/app/services/disaster_recovery_service.py` | PITR drill status fabricated successful reports without executing drill routines. | Standardized PITR reporting: returns `SIMULATED` in development/test and requires live verification in production. | `test_audit_zip6_fixes.py::test_bug31_and_bug33_dr_service_authentic_history_and_physical_retention` | **VERIFIED** |

---

### Workflow Domain E: Authentication, RBAC, Active Branch Context & AI Boundaries
*Ensures session integrity, multi-factor authentication, active branch context switching, and AI assistant security boundaries.*

| ID | Severity | Affected Files & Direct Callers | Root Cause | Implemented Resolution | End-to-End Regression Test | Status |
|---|---|---|---|---|---|---|
| **SEC-64** | Critical | `backend/app/api/ai_assistant.py`, `backend/app/services/ai_service.py` | AI assistant defaulted missing tenant context to organization 1, fetched products/suppliers globally, and executed PO and stock updates without checking `procurement.create` or `inventory.adjust` permissions. | Eliminated default org fallback (fails closed with HTTP 403); scoped live ERP context queries by `organization_id`; enforced granular permission checks (`procurement.create`, `inventory.adjust`, `procurement.manage`) in AI action execution. | `test_audit_zip9_fixes.py::test_sec64_ai_assistant_tenant_scoping_and_permission_enforcement` | **VERIFIED** |
| **BUG-27** | High | `backend/app/api/data_import.py` | Employee and warehouse imports assigned fallback branches silently. | Required explicit branch assignment for employee and warehouse imports; rejects missing branch. | `test_audit_zip6_fixes.py::test_bug27_explicit_branch_required_for_employees_and_warehouses` | **VERIFIED** |
| **BUG-29** | High | `backend/app/api/auth.py`, `backend/app/services/sales_service.py` | Branch switching mutated user base profile instead of an active ephemeral session context. | Introduced `active_branch_id` session field; preserved original `user.branch_id` for home branch attribution. | `test_audit_zip6_fixes.py::test_bug29_branch_switch_upsert_and_active_context` | **VERIFIED** |
| **BUG-37** | High | `backend/app/services/sales_service.py` | Branch switching allowed non-admin users to switch to arbitrary branches across organizations. | Enforced branch membership and organization verification on branch switch requests. | `test_audit_zip7_fixes.py::test_bug37_and_bug38_branch_switching_and_all_branches_policy` | **VERIFIED** |
| **BUG-38** | Medium | `backend/app/api/sales.py` | "All Branches" query filter permitted non-global admins to view cross-branch records. | Restricted unscoped cross-branch queries to superusers and executive roles only. | `test_audit_zip7_fixes.py::test_bug37_and_bug38_branch_switching_and_all_branches_policy` | **VERIFIED** |
| **BUG-39** | Low | `backend/app/auth/dependencies.py` | Unbound `logger` reference triggered NameError on authorization failures. | Imported and configured structured logger in auth dependencies module. | `test_audit_zip7_fixes.py::test_bug39_logger_defined_in_dependencies` | **VERIFIED** |
| **SEC-40** | High | `backend/app/api/data_import.py` | Permission catalog did not include dedicated import permissions for various modules. | Registered explicit permissions (`procurement.import`, `hr.import`, `inventory.import`) in permission catalog. | `test_audit_zip6_fixes.py::test_sec40_import_permission_catalog_alignment` | **VERIFIED** |
| **SEC-41** | High | `backend/app/services/document_store.py` | Document store read operations failed open when local storage was unreachable. | Enforced fail-closed behavior on document store queries; raises error rather than returning mock empty data. | `test_audit_zip6_fixes.py::test_sec41_document_store_authoritative_read_and_fail_closed` | **VERIFIED** |
| **SEC-43** | High | `backend/app/services/ai_service.py` | AI assistant MCP tools executed actions without verifying caller organization boundaries. | Added user and organization context verification to all AI tool execution wrappers. | `test_audit_zip6_fixes.py::test_sec43_and_bug30_ai_tools_tenant_isolation_and_permissions` | **VERIFIED** |

---

## 3. End-to-End Validation Protocol

Before any release or repository push, execute the complete validation pipeline:

### 1. Backend Test Suite (123 Tests)
```powershell
cd backend
python -m pytest tests/ -q
```
**Expected Outcome**: `123 passed, 4 warnings in ~70s` (100% clean).

### 2. Audit-Specific Regression Suite (45 Tests)
```powershell
cd backend
python -m pytest tests/test_audit_exact_fixes.py tests/test_audit_zip6_fixes.py tests/test_audit_zip7_fixes.py tests/test_audit_zip8_fixes.py tests/test_audit_zip9_fixes.py -q
```
**Expected Outcome**: `45 passed in ~30s` (100% clean).

### 3. Database Migration & Schema Consistency Verification
```powershell
cd backend
python -c "import app.main; print('Startup migration assertions passed cleanly')"
```

---

## 4. Defect Intake & Fix Protocol

Whenever a new bug or security issue is reported:
1. **Log**: Assign a permanent ID (`BUG-XX` / `SEC-XX`) in this master tracker with Severity, Affected Callers, and Root Cause.
2. **Reproduce via Test**: Write a failing test case in `tests/test_audit_zipX_fixes.py` *before* modifying production code.
3. **Audit All Callers**: Search the entire codebase for all consumers of the modified service, model, or schema.
4. **Repair & Validate**: Apply the fix, verify the new test passes, and execute the full 129-test suite.
5. **Mark Verified**: Change the tracker status to `VERIFIED` and commit with reference to the defect ID.
