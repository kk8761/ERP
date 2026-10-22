import io
import re
import csv
import json
import base64
import uuid
import logging
from typing import Optional, List, Dict, Any
from decimal import Decimal, InvalidOperation
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import Response
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models.auth import User
from app.models.sales import Customer
from app.models.procurement import Supplier
from app.models.inventory import Product, ProductCategory, StockMovement
from app.models.hr import Employee
from app.models.finance import Account, Expense
from app.models.org import Warehouse, Department, Branch
from app.services.audit_service import record_audit_log

# Optional PDF & Excel Libraries
try:
    import pypdf
    PYPDF_AVAILABLE = True
except ImportError:
    PYPDF_AVAILABLE = False

try:
    import openpyxl
    OPENPYXL_AVAILABLE = True
except ImportError:
    OPENPYXL_AVAILABLE = False

router = APIRouter(prefix="/api/data-import", tags=["Universal Document & Data Onboarding Hub"])

class BatchCommitRequest(BaseModel):
    entity_type: str  # "customers", "vendors", "products", etc.
    records: List[Dict[str, Any]]
    branch_id: Optional[int] = None
    batch_id: Optional[str] = None


def _clean_str(val: Any) -> str:
    if val is None:
        return ""
    return str(val).strip()


def parse_decimal(value: Any, field_name: str, allow_zero: bool = True, allow_negative: bool = False) -> Decimal:
    """Strict numeric parser for money and decimal fields. Rejects non-numeric/infinite/invalid values (BUG-25)."""
    if value is None or str(value).strip() == "":
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} is required"
        )
    try:
        result = Decimal(str(value).replace(",", "").strip())
    except InvalidOperation:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be numeric"
        )
    if not result.is_finite():
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be finite"
        )
    if not allow_negative and result < 0:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be positive"
        )
    if not allow_zero and result == 0:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be positive"
        )
    return result


def parse_int(value: Any, field_name: str, allow_zero: bool = True, allow_negative: bool = False) -> int:
    """Strict integer parser rejecting malformed or fractional values."""
    dec = parse_decimal(value, field_name, allow_zero=allow_zero, allow_negative=allow_negative)
    if dec % 1 != 0:
        raise HTTPException(
            status_code=400,
            detail=f"{field_name} must be an integer"
        )
    return int(dec)


def _clean_num(val: Any, default: float = 0.0) -> float:
    if val is None or str(val).strip() == "":
        return default
    s = str(val).strip().replace(",", "")
    try:
        f = float(s)
        return f if (f == f and f != float('inf') and f != float('-inf')) else default
    except ValueError:
        return default


def _detect_entity_type(headers: List[str], text_sample: str) -> str:
    """Intelligently detects whether document represents Vendors, Products, Customers, Employees, Accounts, Expenses, or Warehouses."""
    h_combined = " ".join(headers).lower()
    t_combined = text_sample.lower()
    combined = f"{h_combined} {t_combined}"

    scores = {
        "employees": len(re.findall(r'\b(employee|staff|designation|salary|joining_date|doj|department|first_name|last_name|emp_code|worker|payroll|pan_number)\b', combined)),
        "chart_of_accounts": len(re.findall(r'\b(account_code|account_type|chart_of_accounts|general_ledger|gl_code|asset|liability|equity|revenue|debit|credit)\b', combined)),
        "expenses": len(re.findall(r'\b(expense|expense_number|voucher|claim|petty_cash|receipt_ref|expense_date)\b', combined)),
        "warehouses": len(re.findall(r'\b(warehouse|bin_rack|storage_facility|wh_code|aisle|storage_location)\b', combined)),
        "vendors": len(re.findall(r'\b(vendor|supplier|gstin|gst_tax|tax_id|supplier_name|contact_person|payment_terms|reconciliation|incoterms|lead_time)\b', combined)),
        "products": len(re.findall(r'\b(sku|barcode|product|item|selling_price|cost_price|unit_price|reorder_level|stock|inventory|uom|unit_of_measure|category)\b', combined)),
        "customers": len(re.findall(r'\b(customer|client|buyer|consumer|total_spend|credit_limit|customer_name)\b', combined)),
    }

    best_type = max(scores, key=scores.get)
    if scores[best_type] > 0:
        return best_type
    
    # Default fallbacks
    if "sku" in combined or "stock" in combined or "price" in combined:
        return "products"
    elif "vendor" in combined or "supplier" in combined:
        return "vendors"
    elif "employee" in combined or "salary" in combined or "designation" in combined:
        return "employees"
    elif "account" in combined:
        return "chart_of_accounts"
    elif "expense" in combined:
        return "expenses"
    return "customers"


def _parse_tabular_dict_rows(rows: List[Dict[str, Any]], entity_type: str) -> List[Dict[str, Any]]:
    """Normalizes key-value header mappings to standard ERP database fields across all entity types."""
    normalized = []
    
    for idx, row in enumerate(rows):
        # Case-insensitive header dictionary
        r_lower = {k.strip().lower().replace(" ", "_").replace("-", "_"): _clean_str(v) for k, v in row.items() if k}
        
        if entity_type == "vendors":
            name = (
                r_lower.get("vendor_name") or r_lower.get("supplier_name") or 
                r_lower.get("vendor") or r_lower.get("supplier") or 
                r_lower.get("company_name") or r_lower.get("name") or ""
            )
            if not name:
                continue
                
            vendor_code = r_lower.get("vendor_code") or r_lower.get("code") or f"VEND-{1000 + idx}"
            phone = r_lower.get("phone") or r_lower.get("mobile") or r_lower.get("contact_number") or ""
            email = r_lower.get("email") or r_lower.get("email_address") or ""
            contact = r_lower.get("contact_person") or r_lower.get("contact") or r_lower.get("manager") or ""
            city = r_lower.get("city") or ""
            address = r_lower.get("address") or r_lower.get("location") or ""
            gst = r_lower.get("gst_tax_number") or r_lower.get("gstin") or r_lower.get("tax_id") or ""
            terms = r_lower.get("payment_terms") or r_lower.get("terms") or ""
            raw_score = r_lower.get("rating_score") or r_lower.get("rating") or r_lower.get("score")
            score = None
            if raw_score is not None and str(raw_score).strip() != "" and str(raw_score).strip().upper() != "UNRATED":
                try:
                    score = float(raw_score)
                except (ValueError, TypeError):
                    score = None

            status_badge = "READY"
            warnings = []
            if not email and not phone:
                status_badge = "WARNING"
                warnings.append("Missing email or phone")
            if not gst:
                warnings.append("No GSTIN specified (standard domestic terms)")
            if score is None:
                warnings.append("Unrated supplier (pending evaluation)")

            normalized.append({
                "_row_id": idx + 1,
                "name": name,
                "vendor_code": vendor_code,
                "contact_person": contact,
                "phone": phone,
                "email": email,
                "city": city,
                "address": address,
                "gst_tax_number": gst,
                "payment_terms": terms,
                "rating_score": score,
                "status_badge": status_badge,
                "warnings": warnings
            })

        elif entity_type in ["products", "catalog", "inventory"]:
            name = (
                r_lower.get("product_name") or r_lower.get("item_name") or 
                r_lower.get("product") or r_lower.get("item") or 
                r_lower.get("name") or ""
            )
            if not name:
                continue

            sku = (
                r_lower.get("sku") or r_lower.get("item_code") or 
                r_lower.get("product_code") or f"SKU-{re.sub(r'[^A-Z0-9]', '', name.upper())[:8]}-{idx+1}"
            )
            barcode = r_lower.get("barcode") or r_lower.get("upc") or r_lower.get("ean") or f"8901{100000+idx}"
            category = r_lower.get("category") or r_lower.get("group") or "General Merchandise"
            uom = r_lower.get("unit_of_measure") or r_lower.get("uom") or r_lower.get("unit") or "unit"
            sell_price = _clean_num(r_lower.get("selling_price") or r_lower.get("price") or r_lower.get("mrp") or r_lower.get("rate"), default=100.0)
            cost_price = _clean_num(r_lower.get("cost_price") or r_lower.get("cost") or r_lower.get("purchase_price"), default=sell_price * 0.75)
            stock = int(_clean_num(r_lower.get("current_stock") or r_lower.get("stock") or r_lower.get("qty") or r_lower.get("quantity"), default=50))
            reorder = int(_clean_num(r_lower.get("reorder_level") or r_lower.get("min_stock") or r_lower.get("threshold"), default=15))

            status_badge = "READY"
            warnings = []
            if sell_price <= cost_price:
                warnings.append("Cost price exceeds or equals selling price")

            normalized.append({
                "_row_id": idx + 1,
                "name": name,
                "sku": sku,
                "barcode": barcode,
                "category": category,
                "unit_of_measure": uom,
                "selling_price": sell_price,
                "cost_price": cost_price,
                "current_stock": stock,
                "reorder_level": reorder,
                "status_badge": status_badge,
                "warnings": warnings
            })

        elif entity_type in ["employees", "hr", "staff"]:
            full_name = r_lower.get("name") or r_lower.get("employee_name") or ""
            f_name = r_lower.get("first_name") or (full_name.split()[0] if full_name else f"Employee_{idx+1}")
            l_name = r_lower.get("last_name") or (" ".join(full_name.split()[1:]) if len(full_name.split()) > 1 else "Staff")
            emp_code = r_lower.get("employee_code") or r_lower.get("code") or r_lower.get("emp_id") or f"EMP-{1000 + idx + 1}"
            email = r_lower.get("email") or f"{f_name.lower()}.{l_name.lower().replace(' ', '')}@nexaerp.internal"
            phone = r_lower.get("phone") or r_lower.get("mobile") or "+91 98000 00000"
            designation = r_lower.get("designation") or r_lower.get("role") or r_lower.get("title") or "Operations Associate"
            department = r_lower.get("department") or r_lower.get("dept") or "Operations"
            salary = _clean_num(r_lower.get("basic_salary") or r_lower.get("salary") or r_lower.get("ctc"), default=45000.0)

            normalized.append({
                "_row_id": idx + 1,
                "name": f"{f_name} {l_name}",
                "first_name": f_name,
                "last_name": l_name,
                "employee_code": emp_code,
                "email": email,
                "phone": phone,
                "designation": designation,
                "department": department,
                "basic_salary": salary,
                "status_badge": "READY",
                "warnings": []
            })

        elif entity_type in ["chart_of_accounts", "accounts", "general_ledger"]:
            code = r_lower.get("code") or r_lower.get("account_code") or f"{1000 + idx}"
            name = r_lower.get("name") or r_lower.get("account_name") or f"Account {code}"
            acc_type = (r_lower.get("account_type") or r_lower.get("type") or "ASSET").upper()
            if acc_type not in ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]:
                acc_type = "ASSET"
            balance = _clean_num(r_lower.get("balance") or r_lower.get("opening_balance"), default=0.0)

            normalized.append({
                "_row_id": idx + 1,
                "name": name,
                "code": code,
                "account_type": acc_type,
                "balance": balance,
                "status_badge": "READY",
                "warnings": []
            })

        elif entity_type in ["expenses", "vouchers"]:
            exp_num = r_lower.get("expense_number") or r_lower.get("voucher_no") or f"EXP-{2000 + idx + 1}"
            category = r_lower.get("category") or "Other"
            amount = _clean_num(r_lower.get("amount") or r_lower.get("total"), default=1000.0)
            desc = r_lower.get("description") or r_lower.get("desc") or f"Operational Expense {exp_num}"
            pay_method = (r_lower.get("payment_method") or "BANK_TRANSFER").upper()

            normalized.append({
                "_row_id": idx + 1,
                "name": desc,
                "expense_number": exp_num,
                "category": category,
                "amount": amount,
                "description": desc,
                "payment_method": pay_method,
                "status_badge": "READY",
                "warnings": []
            })

        elif entity_type in ["warehouses", "storage"]:
            name = r_lower.get("name") or r_lower.get("warehouse_name") or f"Warehouse Hub {idx+1}"
            code = r_lower.get("code") or r_lower.get("wh_code") or f"WH-{idx+1:02d}"
            loc = r_lower.get("location") or r_lower.get("address") or "Central Facility"

            normalized.append({
                "_row_id": idx + 1,
                "name": name,
                "code": code,
                "location": loc,
                "status_badge": "READY",
                "warnings": []
            })

        else: # customers
            name = (
                r_lower.get("customer_name") or r_lower.get("client_name") or 
                r_lower.get("customer") or r_lower.get("client") or 
                r_lower.get("full_name") or r_lower.get("name") or ""
            )
            if not name:
                continue

            phone = r_lower.get("phone") or r_lower.get("mobile") or r_lower.get("contact") or ""
            email = r_lower.get("email") or r_lower.get("email_address") or ""
            address = r_lower.get("address") or r_lower.get("city") or r_lower.get("location") or ""
            spend = _clean_num(r_lower.get("total_spend") or r_lower.get("lifetime_spend") or r_lower.get("sales"), default=0.0)

            status_badge = "READY"
            warnings = []
            if not phone and not email:
                status_badge = "WARNING"
                warnings.append("Missing phone & email contact")

            normalized.append({
                "_row_id": idx + 1,
                "name": name,
                "phone": phone,
                "email": email,
                "address": address,
                "total_spend": spend,
                "status_badge": status_badge,
                "warnings": warnings
            })

    return normalized


def _parse_pdf_text_to_records(raw_text: str, entity_type: str) -> List[Dict[str, Any]]:
    """Extracts structured entities from plain text / PDF lines using semantic regex and smart segmenting."""
    lines = [l.strip() for l in raw_text.splitlines() if l.strip()]
    if not lines:
        return []

    records = []

    # Strategy 1: Check for pipe (|) delimited structured lines
    pipe_lines = [l for l in lines if "|" in l]
    if len(pipe_lines) >= 1:
        first_parts = [p.strip() for p in pipe_lines[0].split("|") if p.strip()]
        has_colons = any(":" in p for p in first_parts)
        has_digits = any(re.search(r'\d{4,}', p) for p in first_parts)
        is_true_header = (not has_colons) and (not has_digits) and any(k in pipe_lines[0].lower() for k in ["name", "vendor", "supplier", "product", "item", "customer", "contact", "gst", "phone", "email"])
        
        if is_true_header and len(pipe_lines) > 1:
            raw_headers = [p.strip() for p in pipe_lines[0].split("|") if p.strip()]
            headers = [re.sub(r'[^a-zA-Z0-9_]', '', h.lower().replace(" ", "_")) for h in raw_headers]
            for pl in pipe_lines[1:]:
                parts = [p.strip() for p in pl.split("|") if p.strip()]
                d = {}
                for i, val in enumerate(parts):
                    if i < len(headers):
                        d[headers[i]] = val
                if d:
                    records.append(d)
        else:
            # Piped lines without explicit headers (e.g. "Acme Corp | Contact: Jane | Phone: 9876543210 | GSTIN: ...")
            for pl in pipe_lines:
                parts = [p.strip() for p in pl.split("|") if p.strip()]
                if not parts:
                    continue
                rec = {}
                # First part is almost always the entity name (strip leading number like '1. ')
                clean_name = re.sub(r'^\d+[\.\)]\s*', '', parts[0]).strip()
                rec["name"] = clean_name
                
                # Scan remaining parts for keys or patterns
                for part in parts[1:]:
                    if ":" in part:
                        k, v = part.split(":", 1)
                        k_clean = k.strip().lower()
                        v_clean = v.strip()
                        if "contact" in k_clean:
                            rec["contact_person"] = v_clean
                        elif "phone" in k_clean or "mobile" in k_clean:
                            rec["phone"] = v_clean
                        elif "gst" in k_clean or "tax" in k_clean:
                            rec["gst_tax_number"] = v_clean
                        elif "email" in k_clean:
                            rec["email"] = v_clean
                        elif "sku" in k_clean or "code" in k_clean:
                            rec["sku"] = v_clean
                        elif "price" in k_clean or "cost" in k_clean:
                            rec["price"] = re.sub(r'[^\d.]', '', v_clean)
                        elif "city" in k_clean or "location" in k_clean:
                            rec["city"] = v_clean
                        elif "terms" in k_clean:
                            rec["payment_terms"] = v_clean
                    else:
                        # Pattern matching on the part
                        phone_m = re.search(r'(?:\+?91[\s-]?)?([6-9]\d{9})', part)
                        email_m = re.search(r'([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', part)
                        gst_m = re.search(r'\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b', part)
                        if email_m and not rec.get("email"):
                            rec["email"] = email_m.group(1)
                        elif phone_m and not rec.get("phone"):
                            rec["phone"] = phone_m.group(1)
                        elif gst_m and not rec.get("gst_tax_number"):
                            rec["gst_tax_number"] = gst_m.group(1)
                        elif any(t in part.lower() for t in ["net 30", "net 45", "net 60", "immediate", "advance"]):
                            rec["payment_terms"] = part
                        elif not rec.get("city") and len(part) < 30 and not re.search(r'\d', part):
                            rec["city"] = part

                if rec.get("name"):
                    records.append(rec)

    # Strategy 2: If no piped lines, scan for block-based or list-based lines
    if not records:
        current_rec = {}
        for line in lines:
            # E.g. "1. Acme Corp" or "Vendor: Acme Corp"
            v_match = re.search(r'(?:Vendor|Supplier|Company|Party|Customer|Product|Item)[:\s]+([A-Za-z0-9\s&.,-]+)', line, re.IGNORECASE)
            list_match = re.search(r'^\d+[\.\)]\s+([A-Za-z0-9\s&.,-]+)', line)
            email_match = re.search(r'([a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)', line)
            phone_match = re.search(r'(?:\+?91[\s-]?)?([6-9]\d{9}|\d{3}[-\s]?\d{3}[-\s]?\d{4})', line)
            gst_match = re.search(r'\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1})\b', line)
            price_match = re.search(r'(?:₹|INR|Rs\.?|\$)\s*([\d,]+(?:\.\d{2})?)', line)
            sku_match = re.search(r'\b(?:SKU|Code)[:\s]*([A-Z0-9-]+)\b', line, re.IGNORECASE)

            trigger_new = v_match or list_match
            if trigger_new:
                if current_rec and current_rec.get("name"):
                    records.append(current_rec)
                matched_name = (v_match.group(1) if v_match else list_match.group(1)).strip()
                current_rec = {"name": matched_name}

            if current_rec:
                if email_match and not current_rec.get("email"):
                    current_rec["email"] = email_match.group(1).strip()
                if phone_match and not current_rec.get("phone"):
                    current_rec["phone"] = phone_match.group(1).strip()
                if gst_match and not current_rec.get("gst_tax_number"):
                    current_rec["gst_tax_number"] = gst_match.group(1).strip()
                if price_match:
                    current_rec["price"] = price_match.group(1).replace(",", "")
                if sku_match and not current_rec.get("sku"):
                    current_rec["sku"] = sku_match.group(1).strip()

        if current_rec and current_rec.get("name"):
            records.append(current_rec)

    # Strategy 3: Fallback line scanning if still nothing
    if not records and len(lines) > 0:
        for idx, line in enumerate(lines[:30]):
            if len(line) > 3 and not re.search(r'^(page|report|date|table|total)\b', line, re.IGNORECASE):
                records.append({
                    "name": line[:80].strip(),
                    "phone": f"+91 98765 {idx:04d}",
                    "email": f"contact{idx+1}@enterprise-vendor.internal"
                })

    return _parse_tabular_dict_rows(records, entity_type)


@router.post("/extract")
async def extract_data_from_file(
    file: Optional[UploadFile] = File(None),
    file_base64: Optional[str] = Form(None),
    file_name: Optional[str] = Form(None),
    entity_type_hint: Optional[str] = Form(None),
    current_user: User = Depends(get_current_user)
):
    """
    Universal Multi-Format Data Ingestion Endpoint:
    Accepts PDF, Excel (.xlsx/.xls), CSV, JSON, TXT, and Images.
    Automatically classifies entity type (Customers, Vendors, or Products)
    and extracts structured tabular records with validation warnings.
    """
    filename = ""
    content_bytes = b""

    if file:
        filename = file.filename or "uploaded_data.csv"
        content_bytes = await file.read()
    elif file_base64:
        filename = file_name or "uploaded_data.pdf"
        try:
            # Strip data url prefix if present
            raw_b64 = file_base64.split(",")[-1] if "," in file_base64 else file_base64
            content_bytes = base64.b64decode(raw_b64)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid base64 document payload: {str(e)}")
    else:
        raise HTTPException(status_code=400, detail="No file or document content provided.")

    ext = filename.lower().split(".")[-1] if "." in filename else "csv"
    raw_text = ""
    dict_rows: List[Dict[str, Any]] = []

    # 1. PARSE ACCORDING TO FORMAT
    if ext == "pdf":
        if not PYPDF_AVAILABLE:
            raise HTTPException(status_code=500, detail="PyPDF engine is not available on server.")
        try:
            reader = pypdf.PdfReader(io.BytesIO(content_bytes))
            for page in reader.pages:
                txt = page.extract_text()
                if txt:
                    raw_text += txt + "\n"
        except Exception as pdf_err:
            raise HTTPException(status_code=400, detail=f"Failed to parse PDF document: {str(pdf_err)}")

    elif ext in ["xlsx", "xls"]:
        if not OPENPYXL_AVAILABLE:
            raise HTTPException(status_code=500, detail="Openpyxl engine is not available on server.")
        try:
            wb = openpyxl.load_workbook(io.BytesIO(content_bytes), data_only=True)
            sheet = wb.active
            rows_iter = list(sheet.iter_rows(values_only=True))
            if rows_iter:
                headers = [str(c or "").strip() for c in rows_iter[0]]
                for r in rows_iter[1:]:
                    if any(c is not None for c in r):
                        row_dict = {}
                        for i, val in enumerate(r):
                            if i < len(headers) and headers[i]:
                                row_dict[headers[i]] = val
                        if row_dict:
                            dict_rows.append(row_dict)
        except Exception as xl_err:
            raise HTTPException(status_code=400, detail=f"Failed to parse Excel workbook: {str(xl_err)}")

    elif ext in ["csv", "tsv", "txt"]:
        try:
            text_str = content_bytes.decode("utf-8", errors="replace")
            raw_text = text_str
            # Try CSV reader
            delim = "\t" if ext == "tsv" or "\t" in text_str[:200] else ","
            reader = csv.DictReader(io.StringIO(text_str), delimiter=delim)
            dict_rows = [row for row in reader if any(v.strip() for v in row.values() if v)]
        except Exception as csv_err:
            raise HTTPException(status_code=400, detail=f"Failed to parse CSV/Text data: {str(csv_err)}")

    elif ext == "json":
        try:
            parsed_json = json.loads(content_bytes.decode("utf-8", errors="replace"))
            if isinstance(parsed_json, list):
                dict_rows = [r for r in parsed_json if isinstance(r, dict)]
            elif isinstance(parsed_json, dict):
                # Search for any array property
                for v in parsed_json.values():
                    if isinstance(v, list) and len(v) > 0 and isinstance(v[0], dict):
                        dict_rows = v
                        break
                if not dict_rows:
                    dict_rows = [parsed_json]
        except Exception as json_err:
            raise HTTPException(status_code=400, detail=f"Failed to parse JSON file: {str(json_err)}")

    else:
        # Generic text fallback
        raw_text = content_bytes.decode("utf-8", errors="replace")

    # 2. DETECT ENTITY TYPE
    sample_headers = list(dict_rows[0].keys()) if dict_rows else []
    entity_type = entity_type_hint or _detect_entity_type(sample_headers, raw_text or str(dict_rows[:3]))

    # 3. NORMALIZE RECORDS
    extracted_records = []
    if dict_rows:
        extracted_records = _parse_tabular_dict_rows(dict_rows, entity_type)
    elif raw_text:
        extracted_records = _parse_pdf_text_to_records(raw_text, entity_type)

    return {
        "success": True,
        "filename": filename,
        "format": ext.upper(),
        "detected_entity_type": entity_type,
        "total_detected": len(extracted_records),
        "records": extracted_records,
        "summary": f"Extracted {len(extracted_records)} {entity_type} records from {filename} ({ext.upper()} format)."
    }


@router.post("/commit")
async def commit_batch_import(
    payload: BatchCommitRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Persists reviewed and verified records directly into the ERP Database.
    Supports Customers, Vendors (Suppliers), and Products (Catalog).
    """
    records = payload.records
    entity_type = payload.entity_type.lower()
    if not records:
        raise HTTPException(status_code=400, detail="No records to import.")

    # SEC-40: Align import permission requirements with actual permissions catalog
    REQUIRED_IMPORT_PERMS = {
        "customers": ["customers.manage", "sales.manage"],
        "clients": ["customers.manage", "sales.manage"],
        "products": ["inventory.create", "inventory.update", "inventory.manage"],
        "catalog": ["inventory.create", "inventory.update", "inventory.manage"],
        "inventory": ["inventory.adjust", "inventory.manage"],
        "stock": ["inventory.adjust", "inventory.manage"],
        "expenses": ["expenses.record", "finance.manage"],
        "vouchers": ["expenses.record", "finance.manage"],
        "employees": ["hr.manage"],
        "hr": ["hr.manage"],
        "staff": ["hr.manage"],
        "vendors": ["suppliers.manage", "procurement.manage"],
        "suppliers": ["suppliers.manage", "procurement.manage"],
        "warehouses": ["warehouses.manage", "inventory.manage"],
        "storage": ["warehouses.manage", "inventory.manage"],
        "chart_of_accounts": ["accounts.manage", "finance.manage"],
        "accounts": ["accounts.manage", "finance.manage"],
        "general_ledger": ["accounts.manage", "finance.manage"],
    }
    allowed_perms = REQUIRED_IMPORT_PERMS.get(entity_type)
    if allowed_perms is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported import entity type '{entity_type}'. Allowed types: {', '.join(sorted(set(REQUIRED_IMPORT_PERMS.keys())))}"
        )

    user_perms = getattr(current_user, "effective_permissions", set())
    is_admin = current_user.is_superuser or any(
        r.role and r.role.name in ["System Administrator", "Executive", "Managing Director"]
        for r in getattr(current_user, "roles", [])
    )
    if not is_admin and not any(p in user_perms for p in allowed_perms):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Access denied: Importing '{entity_type}' records requires '{allowed_perms[0]}' permission."
        )

    # SEC-26: Batch size cap
    if len(records) > 500:
        raise HTTPException(status_code=400, detail="Batch size exceeds maximum limit of 500 records per import.")

    # SEC-26 / BUG-27: Branch derivation and validation
    branch_scoped_entities = {"employees", "hr", "staff", "warehouses", "storage"}
    user_active_branch = getattr(current_user, "active_branch_id", current_user.branch_id) or current_user.branch_id

    if not is_admin:
        if user_active_branch is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No branch assigned to this account. Cannot perform branch-scoped imports."
            )
        if payload.branch_id is not None and payload.branch_id != user_active_branch:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: Cannot import into another branch ({payload.branch_id}). Your account is assigned to branch {user_active_branch}."
            )
        effective_branch_id = user_active_branch
    else:
        # BUG-27 Fix: Do NOT silently default branch-specific entities to branch 1!
        if entity_type in branch_scoped_entities:
            if payload.branch_id is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Branch selection is required when importing branch-specific entity '{entity_type}'. Please specify an explicit branch_id."
                )
            effective_branch_id = payload.branch_id
        else:
            effective_branch_id = payload.branch_id or user_active_branch

    # Validate that branch exists in DB
    if effective_branch_id is not None:
        b_res = await db.execute(select(Branch).where(Branch.id == effective_branch_id))
        if not b_res.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Branch ID {effective_branch_id} does not exist."
            )

    batch_id = payload.batch_id or f"IMP-{uuid.uuid4().hex[:8].upper()}"
    created_count = 0
    updated_count = 0
    errors = []

    try:
        if entity_type in ["vendors", "suppliers"]:
            for r in records:
                name = _clean_str(r.get("name"))
                if not name:
                    continue

                # Check if exists by name or vendor_code
                v_code = _clean_str(r.get("vendor_code"))
                v_filter = [Supplier.name == name]
                if v_code:
                    v_filter.append(Supplier.vendor_code == v_code)
                existing_res = await db.execute(select(Supplier).where(or_(*v_filter)))
                existing = existing_res.scalars().first()

                raw_rating = r.get("rating_score") if r.get("rating_score") is not None else r.get("rating")
                rating_score = None
                if raw_rating is not None and str(raw_rating).strip() != "" and str(raw_rating).strip().upper() != "UNRATED":
                    try:
                        rating_score = float(raw_rating)
                    except (ValueError, TypeError):
                        raise HTTPException(status_code=400, detail=f"Invalid rating_score for vendor '{name}'. Must be numeric or unrated.")

                if existing:
                    # Update fields
                    existing.phone = _clean_str(r.get("phone")) or existing.phone
                    existing.email = _clean_str(r.get("email")) or existing.email
                    existing.contact_person = _clean_str(r.get("contact_person")) or existing.contact_person
                    if r.get("city"):
                        existing.city = _clean_str(r.get("city"))
                    if r.get("payment_terms"):
                        existing.payment_terms = _clean_str(r.get("payment_terms"))
                    if r.get("gst_tax_number"):
                        existing.gst_tax_number = _clean_str(r.get("gst_tax_number"))
                    if rating_score is not None:
                        existing.rating_score = rating_score
                    updated_count += 1
                else:
                    # BUG-28 Fix: Do not invent Hyderabad, Net 30 Days, or 92.5 score
                    sup = Supplier(
                        name=name,
                        vendor_code=v_code or f"VEND-{uuid.uuid4().hex[:6].upper()}",
                        vendor_account_group="Standard Vendor",
                        contact_person=_clean_str(r.get("contact_person")) or None,
                        phone=_clean_str(r.get("phone")) or None,
                        email=_clean_str(r.get("email")) or None,
                        city=_clean_str(r.get("city")) or None,
                        address=_clean_str(r.get("address")) or None,
                        gst_tax_number=_clean_str(r.get("gst_tax_number")) or None,
                        payment_terms=_clean_str(r.get("payment_terms")) or None,
                        rating_score=rating_score,
                        status="ACTIVE"
                    )
                    db.add(sup)
                    created_count += 1

        elif entity_type in ["products", "catalog", "inventory", "stock"]:
            # Ensure category exists
            cat_res = await db.execute(select(ProductCategory).limit(1))
            default_cat = cat_res.scalar_one_or_none()
            default_cat_id = default_cat.id if default_cat else 1

            for r in records:
                name = _clean_str(r.get("name"))
                if not name:
                    continue

                sku = _clean_str(r.get("sku")) or f"SKU-{re.sub(r'[^A-Z0-9]', '', name.upper())[:8]}"
                existing_res = await db.execute(select(Product).where(or_(Product.sku == sku, Product.name == name)))
                existing = existing_res.scalar_one_or_none()

                raw_sell = r.get("selling_price")
                raw_cost = r.get("cost_price")
                raw_stock = r.get("current_stock") if r.get("current_stock") is not None else r.get("stock")
                raw_reorder = r.get("reorder_level")

                # BUG-25 Fix: Strict numeric parsing rejecting non-numeric/zero selling price
                sell_price = parse_decimal(raw_sell, f"Product '{name}' selling_price", allow_zero=False, allow_negative=False)
                cost_price = parse_decimal(raw_cost, f"Product '{name}' cost_price", allow_zero=True, allow_negative=False)
                stock = parse_int(raw_stock, f"Product '{name}' current_stock", allow_zero=True, allow_negative=False)
                reorder = parse_int(raw_reorder, f"Product '{name}' reorder_level", allow_zero=True, allow_negative=False) if raw_reorder is not None else 0

                if existing:
                    old_stock = existing.current_stock
                    existing.selling_price = sell_price
                    existing.cost_price = cost_price
                    existing.current_stock = stock
                    existing.reorder_level = reorder

                    # BUG-26 Fix: Record stock adjustment movement
                    stock_diff = stock - old_stock
                    if stock_diff != 0:
                        m_type = "ADJUSTMENT_IN" if stock_diff > 0 else "ADJUSTMENT_OUT"
                        movement = StockMovement(
                            product_id=existing.id,
                            movement_type=m_type,
                            quantity=abs(stock_diff),
                            previous_stock=old_stock,
                            new_stock=stock,
                            reference_id=f"IMPORT-{batch_id}",
                            notes=f"Stock adjustment via product import batch {batch_id}",
                            created_by_user_id=current_user.id
                        )
                        db.add(movement)
                    updated_count += 1
                else:
                    prod = Product(
                        name=name,
                        sku=sku,
                        barcode=_clean_str(r.get("barcode")) or None,
                        category_id=default_cat_id,
                        unit_of_measure=_clean_str(r.get("unit_of_measure")) or "unit",
                        selling_price=sell_price,
                        cost_price=cost_price,
                        current_stock=stock,
                        reorder_level=reorder,
                        is_active=True
                    )
                    db.add(prod)
                    await db.flush()

                    # BUG-26 Fix: Record opening stock movement
                    if stock > 0:
                        movement = StockMovement(
                            product_id=prod.id,
                            movement_type="OPENING_STOCK",
                            quantity=stock,
                            previous_stock=0,
                            new_stock=stock,
                            reference_id=f"IMPORT-{batch_id}",
                            notes=f"Initial opening stock imported via batch {batch_id}",
                            created_by_user_id=current_user.id
                        )
                        db.add(movement)
                    created_count += 1

        elif entity_type in ["employees", "hr", "staff"]:
            for r in records:
                email = _clean_str(r.get("email"))
                code = _clean_str(r.get("employee_code") or r.get("code")) or f"EMP-{1000 + created_count + 1}"
                full_n = _clean_str(r.get("name"))
                if full_n and " " in full_n:
                    parts = full_n.split(None, 1)
                    f_name = parts[0]
                    l_name = parts[1]
                else:
                    f_name = _clean_str(r.get("first_name")) or (full_n if full_n else "Employee")
                    l_name = _clean_str(r.get("last_name")) or "Staff"
                desig = _clean_str(r.get("designation") or r.get("role")) or "Associate"

                raw_salary = r.get("basic_salary") if r.get("basic_salary") is not None else (r.get("salary") or r.get("base_salary"))
                # BUG-25 Fix: Strict decimal parsing for salary
                salary = parse_decimal(raw_salary, f"Basic salary for employee '{f_name} {l_name}'", allow_zero=True, allow_negative=False)

                # Scope employee lookup by branch to prevent cross-branch mutations
                existing = None
                if email:
                    e_res = await db.execute(
                        select(Employee).where(and_(Employee.email == email, Employee.branch_id == effective_branch_id))
                    )
                    existing = e_res.scalar_one_or_none()
                if not existing and code:
                    e_res = await db.execute(
                        select(Employee).where(and_(Employee.employee_code == code, Employee.branch_id == effective_branch_id))
                    )
                    existing = e_res.scalar_one_or_none()

                if existing:
                    existing.first_name = f_name
                    existing.last_name = l_name
                    existing.designation = desig
                    existing.basic_salary = salary
                    existing.branch_id = effective_branch_id
                    updated_count += 1
                else:
                    emp = Employee(
                        employee_code=code,
                        first_name=f_name,
                        last_name=l_name,
                        email=email,
                        phone=_clean_str(r.get("phone")),
                        designation=desig,
                        basic_salary=salary,
                        branch_id=effective_branch_id
                    )
                    db.add(emp)
                    created_count += 1

        elif entity_type in ["chart_of_accounts", "accounts"]:
            for r in records:
                code = _clean_str(r.get("code") or r.get("account_code"))
                if not code:
                    continue
                name = _clean_str(r.get("name") or r.get("account_name")) or f"Account {code}"
                acc_type = (_clean_str(r.get("account_type")) or "ASSET").upper()

                existing_res = await db.execute(select(Account).where(Account.code == code))
                existing = existing_res.scalar_one_or_none()
                if existing:
                    # Manage account metadata only; ordinary imports must not overwrite a live ledger balance directly
                    existing.name = name
                    existing.account_type = acc_type
                    updated_count += 1
                else:
                    acc = Account(
                        code=code,
                        name=name,
                        account_type=acc_type,
                        balance=Decimal("0.0")
                    )
                    db.add(acc)
                    created_count += 1

        elif entity_type == "general_ledger":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="General ledger opening balances must be posted through balanced, validated journal entries in a controlled accounting period. Direct account balance overwrites are prohibited."
            )

        elif entity_type in ["expenses", "vouchers"]:
            for r in records:
                exp_num = _clean_str(r.get("expense_number") or r.get("voucher_number")) or f"EXP-{2000 + created_count + 1}"
                cat = _clean_str(r.get("category") or r.get("expense_category")) or "Other"

                raw_amount = r.get("amount") if r.get("amount") is not None else r.get("total_amount")
                # BUG-25 Fix: Strict positive decimal parsing
                amt = parse_decimal(raw_amount, "Expense amount", allow_zero=False, allow_negative=False)

                desc = _clean_str(r.get("description") or r.get("name") or r.get("title")) or f"Imported Expense {exp_num}"
                pay_method = (_clean_str(r.get("payment_method")) or "BANK_TRANSFER").upper()

                exp = Expense(
                    expense_number=exp_num,
                    category=cat,
                    amount=amt,
                    description=desc,
                    payment_method=pay_method,
                    recorded_by_user_id=current_user.id
                )
                db.add(exp)
                created_count += 1

        elif entity_type in ["warehouses", "storage"]:
            for r in records:
                code = _clean_str(r.get("code") or r.get("warehouse_code")) or f"WH-{created_count+1:02d}"
                name = _clean_str(r.get("name") or r.get("warehouse_name")) or f"Warehouse {code}"
                loc = _clean_str(r.get("location") or r.get("city")) or "Main Complex"

                # Scope warehouse lookup by effective branch
                existing_res = await db.execute(
                    select(Warehouse).where(and_(Warehouse.code == code, Warehouse.branch_id == effective_branch_id))
                )
                existing = existing_res.scalar_one_or_none()
                if existing:
                    existing.name = name
                    existing.location = loc
                    updated_count += 1
                else:
                    wh = Warehouse(
                        branch_id=effective_branch_id,
                        name=name,
                        code=code,
                        location=loc
                    )
                    db.add(wh)
                    created_count += 1

        elif entity_type in ["customers", "clients"]:
            for r in records:
                name = _clean_str(r.get("name"))
                if not name:
                    continue

                phone = _clean_str(r.get("phone"))
                email = _clean_str(r.get("email"))

                # Check if customer already exists by phone or name
                existing = None
                if phone:
                    c_res = await db.execute(select(Customer).where(Customer.phone == phone))
                    existing = c_res.scalar_one_or_none()
                if not existing:
                    c_res = await db.execute(select(Customer).where(Customer.name == name))
                    existing = c_res.scalar_one_or_none()

                if existing:
                    existing.email = email or existing.email
                    existing.address = _clean_str(r.get("address")) or existing.address
                    updated_count += 1
                else:
                    cust = Customer(
                        name=name,
                        phone=phone,
                        email=email,
                        address=_clean_str(r.get("address")),
                        total_spend=Decimal(str(_clean_num(r.get("total_spend"), 0.0)))
                    )
                    db.add(cust)
                    created_count += 1
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unsupported import entity type '{entity_type}'."
            )

        await db.commit()

        # Audit log
        await record_audit_log(
            db=db,
            user_id=current_user.id,
            user_email=current_user.email,
            action=f"DATA_IMPORT_{entity_type.upper()}",
            entity_name=entity_type,
            entity_id="0",
            details=f"Batch imported {created_count} new and updated {updated_count} {entity_type} records via Universal Document Hub."
        )

        return {
            "success": True,
            "entity_type": entity_type,
            "created_count": created_count,
            "updated_count": updated_count,
            "total_processed": created_count + updated_count,
            "message": f"Successfully processed {created_count + updated_count} {entity_type} records into NexaERP."
        }

    except HTTPException:
        # Error 5 Fix: Propagate validation and business HTTP errors without converting to HTTP 500
        await db.rollback()
        raise
    except Exception as e:
        await db.rollback()
        logging.error(f"[DATA IMPORT COMMIT ERROR]: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database commit error during batch import."
        )


@router.get("/templates/{entity_type}")
async def download_sample_template(entity_type: str):
    """Generates standard CSV onboarding templates for all enterprise data types."""
    e_type = entity_type.lower()
    
    if e_type in ["vendors", "suppliers"]:
        csv_content = (
            "Vendor Name,Vendor Code,Contact Person,Phone,Email,City,Address,GSTIN Tax ID,Payment Terms,Rating Score\n"
            "Adani Wilmar Supplies Ltd,VEND-1001,Rajesh Adani,+91 98200 11223,supplies@adaniwilmar.internal,Ahmedabad,Plot 42 GIDC Estate,24AAACA1234A1Z5,Net 30 Days,96.5\n"
            "ITC Agri Foods Distribution,VEND-1002,Suresh Kumar,+91 98300 44556,agri@itclimited.internal,Kolkata,37 J.L. Nehru Road,19AABCI5678B1Z2,Net 30 Days,94.0\n"
            "Amul Dairy Cooperative,VEND-1003,Mehul Patel,+91 98400 77889,procurement@amuldairy.internal,Anand,Amul Dairy Road,24AAACA9876C1Z8,Net 15 Days,95.0\n"
            "Tata Consumer Brands,VEND-1004,Pooja Sharma,+91 98111 22334,b2b@tataconsumer.internal,Mumbai,Bombay House 24 Homi Mody St,27AAACT1122D1Z4,Net 30 Days,97.0\n"
        )
        filename = "nexaerp_vendors_import_template.csv"

    elif e_type in ["products", "catalog", "inventory"]:
        csv_content = (
            "Product Name,SKU,Category,Selling Price,Cost Price,Current Stock,Min Reorder Level,Unit of Measure,Barcode\n"
            "Royal Basmati Rice 5kg,SKU-RICE-5KG,Groceries,380.00,285.00,85,20,kg,890103010101\n"
            "Amul Gold Full Cream Milk 1L,SKU-MILK-1L,Dairy,68.00,52.00,120,30,ltr,890103010102\n"
            "Fortune Refined Sunflower Oil 1L,SKU-OIL-1L,Edible Oils,145.00,115.00,90,25,ltr,890103010103\n"
            "Aashirvaad Shudh Chakki Atta 10kg,SKU-ATTA-10KG,Grains,420.00,320.00,45,15,kg,890103010104\n"
        )
        filename = "nexaerp_products_import_template.csv"

    elif e_type in ["employees", "hr", "staff"]:
        csv_content = (
            "First Name,Last Name,Employee Code,Email,Phone,Designation,Department,Basic Salary\n"
            "Ananya,Sharma,EMP-1001,ananya.sharma@nexaerp.internal,+91 98765 00011,Senior Logistics Manager,Operations,75000.00\n"
            "Meera,Nair,EMP-1002,meera.nair@nexaerp.internal,+91 98765 00012,Financial Controller,Finance,85000.00\n"
            "Sunil,Reddy,EMP-1003,sunil.reddy@nexaerp.internal,+91 98765 00013,Procurement Specialist,Procurement,55000.00\n"
            "Karthik,Reddy,EMP-1004,karthik.reddy@nexaerp.internal,+91 98765 00014,Store Operations Lead,Sales,50000.00\n"
        )
        filename = "nexaerp_employees_import_template.csv"

    elif e_type in ["chart_of_accounts", "accounts"]:
        csv_content = (
            "Account Code,Account Name,Account Type,Balance\n"
            "1010,Operating Cash Account,ASSET,50000.00\n"
            "1020,HDFC Corporate Operating Bank,ASSET,350000.00\n"
            "2010,Accounts Payable (Trade Creditors),LIABILITY,85000.00\n"
            "4010,Retail Storefront Merchandise Sales,REVENUE,0.00\n"
            "5010,Cost of Goods Sold (Procurement),EXPENSE,0.00\n"
        )
        filename = "nexaerp_chart_of_accounts_template.csv"

    elif e_type in ["expenses", "vouchers"]:
        csv_content = (
            "Expense Number,Category,Amount,Description,Payment Method\n"
            "EXP-2001,Inventory,32452.00,Bulk grains and cooking oils wholesale procurement,BANK_TRANSFER\n"
            "EXP-2002,Staff & Payroll,18788.00,Staff overtime and warehouse shift incentives,BANK_TRANSFER\n"
            "EXP-2003,Rent & Utilities,12810.00,Storefront power electricity and fiber broadband,UPI\n"
            "EXP-2004,Marketing,6832.00,Local regional flyer and promotional SMS alerts,CARD\n"
        )
        filename = "nexaerp_expenses_import_template.csv"

    elif e_type in ["warehouses", "storage"]:
        csv_content = (
            "Warehouse Name,Warehouse Code,Location\n"
            "Main Store Front Storage,WH-FRONT,Aisle 1-6 Ground Floor\n"
            "North Warehouse Central Storage,WH-NORTH,Hangar Bay 4 Industrial Area\n"
            "Cold Storage Dairy Facility,WH-COLD,Temperature Controlled Unit B\n"
        )
        filename = "nexaerp_warehouses_import_template.csv"

    else: # customers
        csv_content = (
            "Customer Name,Phone,Email,Address,Total Spend\n"
            "Karthik Varma,+91 98765 43210,karthik.varma@gmail.com,Banjara Hills Hyderabad,14500.00\n"
            "Sneha Reddy,+91 98123 45678,sneha.reddy@techfirm.internal,Jubilee Hills Hyderabad,28200.00\n"
            "Ananya Deshmukh,+91 98987 65432,ananya.d@enterprise.com,BKC Mumbai,41000.00\n"
            "Vikram Malhotra,+91 98450 12345,v.malhotra@consulting.org,Indiranagar Bengaluru,9500.00\n"
        )
        filename = "nexaerp_customers_import_template.csv"

    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
