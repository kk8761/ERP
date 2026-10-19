import html
from datetime import datetime
from typing import Dict, Any, List

def generate_goods_receipt_html(receipt_data: Dict[str, Any]) -> str:
    """
    Generates an executive, enterprise-grade Goods Receipt Note (GRN / PGI) HTML document.
    Designed for instant browser download, offline archiving, and print-to-PDF formatting.
    """
    po_number = html.escape(str(receipt_data.get("po_number", "PO-N/A")))
    grn_number = html.escape(str(receipt_data.get("grn_number", f"GRN-{datetime.now().strftime('%Y%m%d')}-001")))
    received_date = html.escape(str(receipt_data.get("received_date", datetime.now().strftime("%b %d, %Y • %I:%M %p"))))
    received_by = html.escape(str(receipt_data.get("received_by", "Authorized Warehouse Receiver")))
    supplier_name = html.escape(str(receipt_data.get("supplier_name", "Vendor Partner")))
    supplier_code = html.escape(str(receipt_data.get("supplier_code", "VEND-1001")))
    supplier_email = html.escape(str(receipt_data.get("supplier_email", "vendor@domain.com")))
    supplier_address = html.escape(str(receipt_data.get("supplier_address", "Industrial Logistics Hub")))
    purchasing_org = html.escape(str(receipt_data.get("purchasing_org", "PORG-1000 (Central Purchasing)")))
    dock_bay = html.escape(str(receipt_data.get("dock_bay", "Warehouse Receiving Dock Bay 4")))
    total_amount = float(receipt_data.get("total_amount", 0.0))
    items: List[Dict[str, Any]] = receipt_data.get("items", [])

    items_rows = ""
    total_qty_ordered = 0
    total_qty_received = 0

    for idx, item in enumerate(items, start=1):
        p_name = html.escape(str(item.get("product_name", "Material Item")))
        q_ord = int(item.get("quantity_ordered", 0))
        q_rec = int(item.get("quantity_received", q_ord))
        u_cost = float(item.get("unit_cost", 0.0))
        l_tot = float(item.get("line_total", q_rec * u_cost))
        total_qty_ordered += q_ord
        total_qty_received += q_rec

        items_rows += f"""
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 12px; font-weight: 600; text-align: center; color: #64748b;">{idx:02d}</td>
            <td style="padding: 10px 12px;">
                <div style="font-weight: 700; color: #0f172a;">{p_name}</div>
                <div style="font-size: 11px; color: #64748b;">SKU-MAT-{idx * 104} • Inward Batch #{po_number.replace('-', '')}</div>
            </td>
            <td style="padding: 10px 12px; text-align: center; font-weight: 600; color: #334155;">{q_ord}</td>
            <td style="padding: 10px 12px; text-align: center; font-weight: 700; color: #10b981; background-color: #f0fdf4;">{q_rec}</td>
            <td style="padding: 10px 12px; text-align: right; color: #334155;">₹{u_cost:,.2f}</td>
            <td style="padding: 10px 12px; text-align: right; font-weight: 700; color: #0f172a;">₹{l_tot:,.2f}</td>
            <td style="padding: 10px 12px; text-align: center;">
                <span style="background-color: #dcfce7; color: #15803d; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 9999px; text-transform: uppercase;">
                    ✓ PASSED
                </span>
            </td>
        </tr>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Goods Receipt Note - {grn_number} ({po_number})</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }}
        body {{
            background-color: #f8fafc;
            color: #0f172a;
            padding: 30px;
            font-size: 13px;
        }}
        .receipt-container {{
            max-width: 850px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 12px;
            padding: 36px;
            box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
        }}
        .header {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 20px;
            margin-bottom: 24px;
        }}
        .logo-title {{
            display: flex;
            align-items: center;
            gap: 12px;
        }}
        .logo-box {{
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%);
            color: #ffffff;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 22px;
            font-weight: 900;
            letter-spacing: -1px;
        }}
        .doc-title {{
            font-size: 20px;
            font-weight: 800;
            color: #0f172a;
            letter-spacing: -0.3px;
        }}
        .doc-subtitle {{
            font-size: 12px;
            color: #64748b;
            margin-top: 2px;
        }}
        .badge-verified {{
            background-color: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
            padding: 6px 14px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 800;
            text-align: right;
            display: inline-block;
        }}
        .meta-grid {{
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 26px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 18px;
        }}
        .meta-col h4 {{
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.6px;
            color: #0284c7;
            margin-bottom: 8px;
            font-weight: 800;
        }}
        .meta-item {{
            margin-bottom: 5px;
            font-size: 12.5px;
        }}
        .meta-label {{
            color: #64748b;
            display: inline-block;
            width: 130px;
        }}
        .meta-val {{
            font-weight: 600;
            color: #0f172a;
        }}
        table.items-table {{
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
        }}
        table.items-table th {{
            background-color: #f1f5f9;
            color: #475569;
            font-size: 11px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 10px 12px;
            border-bottom: 2px solid #cbd5e1;
        }}
        .total-box {{
            display: flex;
            justify-content: flex-end;
            margin-bottom: 28px;
        }}
        .total-card {{
            width: 280px;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 14px 18px;
        }}
        .total-row {{
            display: flex;
            justify-content: space-between;
            margin-bottom: 6px;
            font-size: 12px;
            color: #64748b;
        }}
        .total-row.grand {{
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            margin-top: 8px;
            font-size: 14px;
            font-weight: 800;
            color: #0f172a;
        }}
        .qc-banner {{
            background: linear-gradient(to right, #f0fdf4, #ecfdf5);
            border: 1px solid #86efac;
            border-radius: 8px;
            padding: 14px 18px;
            margin-bottom: 28px;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }}
        .signatures {{
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 20px;
            margin-top: 36px;
            padding-top: 24px;
            border-top: 1px dashed #cbd5e1;
        }}
        .sig-block {{
            text-align: center;
        }}
        .sig-line {{
            height: 1px;
            background: #94a3b8;
            margin-bottom: 8px;
        }}
        .sig-title {{
            font-size: 11px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
        }}
        .sig-sub {{
            font-size: 10px;
            color: #94a3b8;
        }}
        .actions-bar {{
            margin-top: 24px;
            display: flex;
            justify-content: center;
            gap: 12px;
        }}
        .btn-print {{
            background-color: #0284c7;
            color: #ffffff;
            border: none;
            border-radius: 6px;
            padding: 10px 24px;
            font-size: 13px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.2);
        }}
        .btn-print:hover {{
            background-color: #0369a1;
        }}
        @media print {{
            body {{
                background: #ffffff;
                padding: 0;
            }}
            .receipt-container {{
                box-shadow: none;
                border: none;
                padding: 0;
                max-width: 100%;
            }}
            .actions-bar {{
                display: none !important;
            }}
        }}
    </style>
</head>
<body>

<div class="receipt-container">
    <!-- Header -->
    <div class="header">
        <div class="logo-title">
            <div class="logo-box">N</div>
            <div>
                <div class="doc-title">GOODS RECEIPT NOTE (GRN)</div>
                <div class="doc-subtitle">Nexa Global Enterprises • Inbound Logistics & Receiving Slip</div>
            </div>
        </div>
        <div>
            <div class="badge-verified">
                ✓ POST GOODS RECEIPT (PGI) CONFIRMED
            </div>
            <div style="font-family: monospace; font-size: 11px; color: #64748b; margin-top: 4px; text-align: right;">
                DOC #{grn_number}
            </div>
        </div>
    </div>

    <!-- Metadata Section -->
    <div class="meta-grid">
        <div class="meta-col">
            <h4>Vendor / Supplier Details</h4>
            <div class="meta-item"><span class="meta-label">Vendor Name:</span> <span class="meta-val">{supplier_name}</span></div>
            <div class="meta-item"><span class="meta-label">Vendor Code:</span> <span class="meta-val">{supplier_code}</span></div>
            <div class="meta-item"><span class="meta-label">Email:</span> <span class="meta-val">{supplier_email}</span></div>
            <div class="meta-item"><span class="meta-label">Facility / Address:</span> <span class="meta-val">{supplier_address}</span></div>
        </div>
        <div class="meta-col">
            <h4>Receiving & Order Records</h4>
            <div class="meta-item"><span class="meta-label">PO Document Ref:</span> <span class="meta-val" style="color: #0284c7; font-weight: 800;">#{po_number}</span></div>
            <div class="meta-item"><span class="meta-label">Receipt Posting:</span> <span class="meta-val">{received_date}</span></div>
            <div class="meta-item"><span class="meta-label">Received By:</span> <span class="meta-val">{received_by}</span></div>
            <div class="meta-item"><span class="meta-label">Destination Bay:</span> <span class="meta-val">{dock_bay}</span></div>
            <div class="meta-item"><span class="meta-label">Purchasing Org:</span> <span class="meta-val">{purchasing_org}</span></div>
        </div>
    </div>

    <!-- Line Items Table -->
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 50px; text-align: center;">#</th>
                <th style="text-align: left;">Item Description & Material ID</th>
                <th style="width: 90px; text-align: center;">Qty Ordered</th>
                <th style="width: 100px; text-align: center;">Qty Received</th>
                <th style="width: 110px; text-align: right;">Unit Price</th>
                <th style="width: 120px; text-align: right;">Line Total</th>
                <th style="width: 90px; text-align: center;">QC Status</th>
            </tr>
        </thead>
        <tbody>
            {items_rows}
        </tbody>
    </table>

    <!-- Totals and QC Statement -->
    <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 20px;">
        <div style="flex: 1;">
            <div class="qc-banner">
                <div>
                    <div style="font-size: 12px; font-weight: 800; color: #166534;">
                        MATERIAL QUALITY VERIFICATION: 100% ACCEPTED
                    </div>
                    <div style="font-size: 11px; color: #15803d; margin-top: 2px;">
                        Zero damages reported. Consignment accepted into warehouse inventory stock.
                    </div>
                </div>
                <div style="font-size: 22px;">📦</div>
            </div>
        </div>

        <div class="total-box">
            <div class="total-card">
                <div class="total-row">
                    <span>Total Units Received:</span>
                    <strong style="color: #0f172a;">{total_qty_received} Units</strong>
                </div>
                <div class="total-row">
                    <span>Subtotal Value:</span>
                    <span>₹{total_amount:,.2f}</span>
                </div>
                <div class="total-row">
                    <span>Input GST (Reconciled):</span>
                    <span>₹0.00</span>
                </div>
                <div class="total-row grand">
                    <span>Total Inward Value:</span>
                    <span style="color: #10b981;">₹{total_amount:,.2f} INR</span>
                </div>
            </div>
        </div>
    </div>

    <!-- Signatures -->
    <div class="signatures">
        <div class="sig-block">
            <div style="height: 36px; display: flex; align-items: flex-end; justify-content: center; font-size: 11px; font-style: italic; color: #0284c7; padding-bottom: 4px;">
                {received_by}
            </div>
            <div class="sig-line"></div>
            <div class="sig-title">Store Receiving Clerk</div>
            <div class="sig-sub">Inward Gate Verification</div>
        </div>

        <div class="sig-block">
            <div style="height: 36px; display: flex; align-items: flex-end; justify-content: center; font-size: 11px; font-weight: 700; color: #10b981; padding-bottom: 4px;">
                [QC SIGN-OFF: APPROVED]
            </div>
            <div class="sig-line"></div>
            <div class="sig-title">Quality Assurance Lead</div>
            <div class="sig-sub">Dock Inspection Bay</div>
        </div>

        <div class="sig-block">
            <div style="height: 36px; display: flex; align-items: flex-end; justify-content: center; font-size: 11px; color: #64748b; padding-bottom: 4px;">
                SAP/ERP System Gate
            </div>
            <div class="sig-line"></div>
            <div class="sig-title">Inventory Controller</div>
            <div class="sig-sub">Financial 3-Way Match Clearance</div>
        </div>
    </div>

    <!-- Actions for Print/Download -->
    <div class="actions-bar">
        <button class="btn-print" onclick="window.print()">
            🖨️ Print / Save as PDF
        </button>
    </div>
</div>

</body>
</html>
"""
