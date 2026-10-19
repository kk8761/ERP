import io
import base64
import html
from datetime import datetime
from typing import Dict, Any, List

from reportlab.lib.pagesizes import A4
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors


def generate_goods_receipt_pdf(receipt_data: Dict[str, Any]) -> bytes:
    """
    Generates a true binary PDF Goods Receipt Note (GRN / PGI Slip) using ReportLab.
    Formatted for high-precision enterprise archiving, printing, and regulatory compliance.
    """
    po_number = str(receipt_data.get("po_number", "PO-N/A"))
    grn_number = str(receipt_data.get("grn_number", f"GRN-{datetime.now().strftime('%Y%m%d')}-001"))
    received_date = str(receipt_data.get("received_date", datetime.now().strftime("%b %d, %Y • %I:%M %p")))
    received_by = str(receipt_data.get("received_by", "Authorized Warehouse Receiver"))
    supplier_name = str(receipt_data.get("supplier_name", "Vendor Partner"))
    supplier_code = str(receipt_data.get("supplier_code", "VEND-1001"))
    supplier_email = str(receipt_data.get("supplier_email", "vendor@domain.com"))
    supplier_address = str(receipt_data.get("supplier_address", "Industrial Logistics Hub"))
    purchasing_org = str(receipt_data.get("purchasing_org", "PORG-1000 (Central Purchasing)"))
    dock_bay = str(receipt_data.get("dock_bay", "Warehouse Receiving Dock Bay 4"))
    total_amount = float(receipt_data.get("total_amount", 0.0))
    items: List[Dict[str, Any]] = receipt_data.get("items", [])

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    brand_style = ParagraphStyle(
        'BrandTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=16,
        leading=19,
        textColor=colors.HexColor('#0284c7')
    )
    brand_sub = ParagraphStyle(
        'BrandSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#64748b')
    )
    doc_title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=13,
        leading=16,
        alignment=2, # Right align
        textColor=colors.HexColor('#0f172a')
    )
    doc_sub_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        alignment=2,
        textColor=colors.HexColor('#16a34a')
    )
    doc_ref_style = ParagraphStyle(
        'DocRef',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10,
        alignment=2,
        textColor=colors.HexColor('#64748b')
    )

    meta_h = ParagraphStyle(
        'MetaHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor('#0284c7')
    )
    meta_txt = ParagraphStyle(
        'MetaText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=colors.HexColor('#334155')
    )

    item_txt = ParagraphStyle(
        'ItemText',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10,
        textColor=colors.HexColor('#0f172a')
    )
    item_sub = ParagraphStyle(
        'ItemSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7,
        leading=9,
        textColor=colors.HexColor('#64748b')
    )

    story = []

    # 1. Header Table
    head_left = [
        Paragraph("NEXA GLOBAL ENTERPRISES", brand_style),
        Spacer(1, 2),
        Paragraph("Inbound Logistics & Materials Management • ISO 9001:2015", brand_sub)
    ]
    head_right = [
        Paragraph("GOODS RECEIPT NOTE (GRN)", doc_title_style),
        Spacer(1, 2),
        Paragraph("✓ POST GOODS RECEIPT (PGI) CONFIRMED", doc_sub_style),
        Paragraph(f"DOC #{grn_number}", doc_ref_style)
    ]

    t_head = Table([[head_left, head_right]], colWidths=[310, 213])
    t_head.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 0),
        ('RIGHTPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(t_head)
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor('#0284c7'), spaceBefore=2, spaceAfter=12))

    # 2. Metadata Box (Vendor & Inward Logistics)
    vendor_info = [
        Paragraph("VENDOR / SUPPLIER DETAILS", meta_h),
        Spacer(1, 4),
        Paragraph(f"<b>Vendor Name:</b> {supplier_name}", meta_txt),
        Paragraph(f"<b>Vendor Code:</b> {supplier_code}", meta_txt),
        Paragraph(f"<b>Contact Email:</b> {supplier_email}", meta_txt),
        Paragraph(f"<b>Facility / Address:</b> {supplier_address}", meta_txt)
    ]
    receiving_info = [
        Paragraph("RECEIVING & ORDER RECORDS", meta_h),
        Spacer(1, 4),
        Paragraph(f"<b>PO Reference:</b> <font color=\"#0284c7\"><b>#{po_number}</b></font>", meta_txt),
        Paragraph(f"<b>Receipt Posting Date:</b> {received_date}", meta_txt),
        Paragraph(f"<b>Received By:</b> {received_by}", meta_txt),
        Paragraph(f"<b>Receiving Bay:</b> {dock_bay}", meta_txt),
        Paragraph(f"<b>Purchasing Org:</b> {purchasing_org}", meta_txt)
    ]

    t_meta = Table([[vendor_info, receiving_info]], colWidths=[260, 263])
    t_meta.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (-1, -1), colors.HexColor('#f8fafc')),
        ('BOX', (0, 0), (-1, -1), 1, colors.HexColor('#e2e8f0')),
        ('INNERGRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
        ('LEFTPADDING', (0, 0), (-1, -1), 12),
        ('RIGHTPADDING', (0, 0), (-1, -1), 12),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 14))

    # 3. Line Items Table
    headers = [
        Paragraph("<b>#</b>", styles['Normal']),
        Paragraph("<b>Item Description & SKU</b>", styles['Normal']),
        Paragraph("<b>Qty Ord</b>", styles['Normal']),
        Paragraph("<b>Qty Rec</b>", styles['Normal']),
        Paragraph("<b>Unit Price</b>", styles['Normal']),
        Paragraph("<b>Line Total</b>", styles['Normal']),
        Paragraph("<b>QC Status</b>", styles['Normal'])
    ]
    table_rows = [headers]

    total_qty_ordered = 0
    total_qty_received = 0

    for idx, it in enumerate(items, start=1):
        p_name = it.get("product_name", "Material Item")
        q_ord = int(it.get("quantity_ordered", 0))
        q_rec = int(it.get("quantity_received", q_ord))
        u_cost = float(it.get("unit_cost", 0.0))
        l_tot = float(it.get("line_total", q_rec * u_cost))
        total_qty_ordered += q_ord
        total_qty_received += q_rec

        desc_cell = [
            Paragraph(f"{p_name}", item_txt),
            Paragraph(f"SKU-MAT-{idx * 104} • Inward Batch #{po_number.replace('-', '')}", item_sub)
        ]

        row = [
            Paragraph(f"{idx:02d}", meta_txt),
            desc_cell,
            Paragraph(f"{q_ord}", meta_txt),
            Paragraph(f"<font color=\"#16a34a\"><b>{q_rec}</b></font>", meta_txt),
            Paragraph(f"INR {u_cost:,.2f}", meta_txt),
            Paragraph(f"<b>INR {l_tot:,.2f}</b>", meta_txt),
            Paragraph("<font color=\"#15803d\"><b>✓ PASSED</b></font>", meta_txt)
        ]
        table_rows.append(row)

    col_widths = [24, 215, 48, 48, 64, 74, 50]
    t_items = Table(table_rows, colWidths=col_widths)

    t_style = [
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#0284c7')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 8),
        ('ALIGN', (0, 0), (0, -1), 'CENTER'),
        ('ALIGN', (2, 0), (3, -1), 'CENTER'),
        ('ALIGN', (4, 0), (5, -1), 'RIGHT'),
        ('ALIGN', (6, 0), (6, -1), 'CENTER'),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#cbd5e1')),
    ]
    # Alternating row colors
    for r in range(1, len(table_rows)):
        if r % 2 == 0:
            t_style.append(('BACKGROUND', (0, r), (-1, r), colors.HexColor('#f8fafc')))
        else:
            t_style.append(('BACKGROUND', (0, r), (-1, r), colors.white))

    t_items.setStyle(TableStyle(t_style))
    story.append(t_items)
    story.append(Spacer(1, 12))

    # 4. Totals and QC Summary Table
    qc_content = [
        Paragraph("<b>MATERIAL QUALITY INSPECTION: 100% ACCEPTED</b>", ParagraphStyle('QCT', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.HexColor('#166534'))),
        Paragraph("Zero damages or shortages reported. Goods physically inspected and accepted into warehouse stock.", ParagraphStyle('QCS', parent=styles['Normal'], fontName='Helvetica', fontSize=7.5, textColor=colors.HexColor('#15803d')))
    ]

    totals_table_data = [
        [Paragraph("Total Units Received:", meta_txt), Paragraph(f"<b>{total_qty_received} Units</b>", meta_txt)],
        [Paragraph("Subtotal Consignment:", meta_txt), Paragraph(f"INR {total_amount:,.2f}", meta_txt)],
        [Paragraph("Input Tax Reconciled:", meta_txt), Paragraph("INR 0.00", meta_txt)],
        [Paragraph("<b>Total Inward Value:</b>", meta_h), Paragraph(f"<font color=\"#10b981\" size=\"9\"><b>INR {total_amount:,.2f}</b></font>", meta_h)]
    ]
    t_totals = Table(totals_table_data, colWidths=[120, 85])
    t_totals.setStyle(TableStyle([
        ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
        ('TOPPADDING', (0, 0), (-1, -1), 2),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 2),
        ('LINEBELOW', (0, 2), (-1, 2), 0.5, colors.HexColor('#cbd5e1')),
    ]))

    t_bottom = Table([[qc_content, t_totals]], colWidths=[310, 213])
    t_bottom.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('BACKGROUND', (0, 0), (0, 0), colors.HexColor('#f0fdf4')),
        ('BOX', (0, 0), (0, 0), 0.5, colors.HexColor('#86efac')),
        ('BACKGROUND', (1, 0), (1, 0), colors.HexColor('#f8fafc')),
        ('BOX', (1, 0), (1, 0), 0.5, colors.HexColor('#e2e8f0')),
        ('TOPPADDING', (0, 0), (-1, -1), 8),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ('LEFTPADDING', (0, 0), (-1, -1), 10),
        ('RIGHTPADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(t_bottom)
    story.append(Spacer(1, 22))

    # 5. Signatures Block
    sig1 = [
        Paragraph(f"<i>{received_by}</i>", ParagraphStyle('S1', parent=styles['Normal'], alignment=1, fontSize=8, textColor=colors.HexColor('#0284c7'))),
        Spacer(1, 4),
        HRFlowable(width="80%", thickness=0.5, color=colors.HexColor('#94a3b8'), spaceBefore=2, spaceAfter=4),
        Paragraph("<b>Store Receiving Clerk</b>", ParagraphStyle('ST', parent=styles['Normal'], alignment=1, fontSize=7.5, textColor=colors.HexColor('#475569'))),
        Paragraph("Inward Gate Verification", ParagraphStyle('SS', parent=styles['Normal'], alignment=1, fontSize=6.5, textColor=colors.HexColor('#94a3b8')))
    ]
    sig2 = [
        Paragraph("<b>[QC SIGN-OFF: PASSED]</b>", ParagraphStyle('S2', parent=styles['Normal'], alignment=1, fontSize=8, textColor=colors.HexColor('#16a34a'))),
        Spacer(1, 4),
        HRFlowable(width="80%", thickness=0.5, color=colors.HexColor('#94a3b8'), spaceBefore=2, spaceAfter=4),
        Paragraph("<b>Quality Assurance Lead</b>", ParagraphStyle('ST', parent=styles['Normal'], alignment=1, fontSize=7.5, textColor=colors.HexColor('#475569'))),
        Paragraph("Dock QC Bay 4 Inspection", ParagraphStyle('SS', parent=styles['Normal'], alignment=1, fontSize=6.5, textColor=colors.HexColor('#94a3b8')))
    ]
    sig3 = [
        Paragraph("<i>SAP / ERP Gate Settled</i>", ParagraphStyle('S3', parent=styles['Normal'], alignment=1, fontSize=8, textColor=colors.HexColor('#64748b'))),
        Spacer(1, 4),
        HRFlowable(width="80%", thickness=0.5, color=colors.HexColor('#94a3b8'), spaceBefore=2, spaceAfter=4),
        Paragraph("<b>Inventory Controller</b>", ParagraphStyle('ST', parent=styles['Normal'], alignment=1, fontSize=7.5, textColor=colors.HexColor('#475569'))),
        Paragraph("3-Way Reconciliation Clearance", ParagraphStyle('SS', parent=styles['Normal'], alignment=1, fontSize=6.5, textColor=colors.HexColor('#94a3b8')))
    ]

    t_sigs = Table([[sig1, sig2, sig3]], colWidths=[174, 174, 175])
    t_sigs.setStyle(TableStyle([
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('LEFTPADDING', (0, 0), (-1, -1), 4),
        ('RIGHTPADDING', (0, 0), (-1, -1), 4),
        ('TOPPADDING', (0, 0), (-1, -1), 0),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 0),
    ]))
    story.append(t_sigs)

    doc.build(story)
    return buf.getvalue()


def generate_goods_receipt_html(receipt_data: Dict[str, Any]) -> str:
    """
    HTML representation for fallback or web browser rendering.
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
    <title>Goods Receipt Note - {grn_number} ({po_number})</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        * {{ box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', sans-serif; }}
        body {{ background-color: #f8fafc; color: #0f172a; padding: 24px; font-size: 13px; }}
        .receipt-container {{ max-width: 820px; margin: 0 auto; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 10px; padding: 30px; }}
        .header {{ display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0284c7; padding-bottom: 16px; margin-bottom: 20px; }}
        .doc-title {{ font-size: 18px; font-weight: 800; color: #0f172a; }}
        .meta-grid {{ display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; }}
        .meta-col h4 {{ font-size: 11px; text-transform: uppercase; color: #0284c7; margin-bottom: 6px; font-weight: 800; }}
        .meta-item {{ margin-bottom: 4px; font-size: 12px; }}
        table.items-table {{ width: 100%; border-collapse: collapse; margin-bottom: 20px; }}
        table.items-table th {{ background-color: #0284c7; color: #ffffff; font-size: 11px; font-weight: 800; padding: 8px 10px; }}
    </style>
</head>
<body>
<div class="receipt-container">
    <div class="header">
        <div>
            <div class="doc-title">NEXA GLOBAL ENTERPRISES • GOODS RECEIPT NOTE</div>
            <div style="font-size: 11px; color: #64748b;">Inbound Logistics & Receiving Slip</div>
        </div>
        <div style="text-align: right;">
            <div style="background-color: #ecfdf5; color: #065f46; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 4px; display: inline-block;">✓ POST GOODS RECEIPT CONFIRMED</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 3px;">DOC #{grn_number}</div>
        </div>
    </div>
    <div class="meta-grid">
        <div class="meta-col">
            <h4>Vendor Master Details</h4>
            <div class="meta-item"><b>Vendor:</b> {supplier_name} ({supplier_code})</div>
            <div class="meta-item"><b>Email:</b> {supplier_email}</div>
            <div class="meta-item"><b>Facility:</b> {supplier_address}</div>
        </div>
        <div class="meta-col">
            <h4>Receiving & Order Records</h4>
            <div class="meta-item"><b>PO Reference:</b> #{po_number}</div>
            <div class="meta-item"><b>Posting Date:</b> {received_date}</div>
            <div class="meta-item"><b>Received By:</b> {received_by}</div>
            <div class="meta-item"><b>Receiving Bay:</b> {dock_bay}</div>
        </div>
    </div>
    <table class="items-table">
        <thead>
            <tr>
                <th style="width: 40px; text-align: center;">#</th>
                <th style="text-align: left;">Item Description</th>
                <th style="width: 80px; text-align: center;">Qty Ord</th>
                <th style="width: 80px; text-align: center;">Qty Rec</th>
                <th style="width: 90px; text-align: right;">Unit Price</th>
                <th style="width: 100px; text-align: right;">Line Total</th>
                <th style="width: 80px; text-align: center;">QC</th>
            </tr>
        </thead>
        <tbody>
            {items_rows}
        </tbody>
    </table>
    <div style="display: flex; justify-content: flex-end; margin-top: 10px;">
        <div style="width: 250px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; font-size: 12px;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;"><span>Total Units:</span> <b>{total_qty_received}</b></div>
            <div style="display: flex; justify-content: space-between; font-size: 13px; font-weight: 800; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 6px;">
                <span>Total Inward Value:</span> <span style="color: #10b981;">₹{total_amount:,.2f} INR</span>
            </div>
        </div>
    </div>
</div>
</body>
</html>
"""
