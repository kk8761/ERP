# NexaERP Enterprise User Guide
Comprehensive Operator Manual for All Core Business Modules

---

## 1. Getting Started & Navigation

### 1.1 Logging In & Multi-Factor Authentication (MFA)
1. Open your browser and navigate to `http://localhost:5173` (or your company ERP portal).
2. Enter your corporate email and password.
3. If TOTP/SMS MFA is enabled, input the 6-digit verification code.
4. If you require temporary privileged access (e.g., Master Chart of Accounts editing, salary disbursement), navigate to **Security & Elevation** and submit a Just-In-Time (JIT) access request with required business justification.

### 1.2 Layout & Global Features
- **Sidebar**: Access all modules (Dashboard, Sales, Inventory, POS, Procurement, Finance, HR, Manufacturing, GRC, Predictive AI, Community Forum, Settings).
- **Universal Search (`Ctrl+K`)**: Rapidly find products, customer accounts, purchase orders, or navigation links.
- **AI Copilot Drawer**: Click the floating Copilot icon on the bottom-right for instant natural language querying across ERP data.

---

## 2. Core Modules Guide

### 2.1 Point-of-Sale (POS) & Retail Checkout
1. Select active register and scan items using the integrated barcode scanner modal or type item SKU.
2. Select customer loyalty tier (Retail, Wholesale, Enterprise Contract).
3. Apply discounts or coupon codes (subject to role authorization limits).
4. Select payment method: Cash, Credit Card, UPI / QR, or Customer Account credit.
5. Capture customer e-signature on the digital signature pad.
6. Print or email invoice receipt.

### 2.2 Inventory Management & Predictive Stock Depletion
1. **Stock Levels**: View real-time quantities across multiple warehouses.
2. **Stock Exhaustion Predictor**: Toggle consumer segments (All, Retail B2C, Wholesale B2B, Enterprise, Surge Promo) to view projected days until stockout, daily run rate, and recommended purchase order reorder triggers.
3. **Stock Movements**: Transfer stock between warehouses using Goods-in-Transit clearing accounts.

### 2.3 Procurement & Vendor Management
1. Create Purchase Orders (POs) for approved suppliers.
2. Multi-tier approval chain: POs > $5,000 require manager approval.
3. Receipt of Goods: Match incoming vendor deliveries against PO line items.

### 2.4 Financial Accounting & General Ledger
1. **Chart of Accounts**: Double-entry ledger compliant with GAAP and IFRS.
2. **Journal Entries**: Balanced debits and credits with auto-clearing.
3. **Accounts Receivable / Payable**: Aging schedules, invoice payment allocation.
4. **Financial Statements**: Balance Sheet, Income Statement, Trial Balance.

### 2.5 Manufacturing & Industry 4.0
1. **Bill of Materials (BOM)**: Multi-level assembly structures.
2. **Production Scheduling**: Gantt chart capacity planning across work centers.
3. **OEE Telemetry**: Real-time Availability, Performance, and Quality tracking.

### 2.6 Governance, Risk & Compliance (GRC)
1. **5x5 Risk Heatmap**: Likelihood vs Impact scoring.
2. **Compliance Frameworks**: ISO 27001, SOC 2 Type II, GDPR, OSHA audits.

### 2.7 Community Forum & Knowledge Base
1. Search community discussion threads by module or problem description.
2. Post questions and receive verified answers from internal solutions architects and peers.

---

## 3. Security & Anti-Tamper Policy
- Context menu right-click and developer console access are restricted on production terminals.
- All privilege changes, elevation grants, and price overrides are logged in the immutable audit log.
