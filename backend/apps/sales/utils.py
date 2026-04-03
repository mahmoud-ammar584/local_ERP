from io import BytesIO
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch

def generate_invoice_pdf(sale):
    """
    Generate a professional PDF invoice for a SalesTransaction.
    """
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    elements = []
    
    styles = getSampleStyleSheet()
    title_style = styles['Heading1']
    normal_style = styles['Normal']
    
    # Header
    elements.append(Paragraph(f"INVOICE #{sale.id}", title_style))
    elements.append(Paragraph(f"Date: {sale.transaction_date.strftime('%Y-%m-%d')}", normal_style))
    if sale.customer:
        elements.append(Paragraph(f"Customer: {sale.customer.name}", normal_style))
    elements.append(Spacer(1, 0.2 * inch))
    
    # Table Data
    data = [['Item', 'Qty', 'Unit Price', 'Disc (%)', 'Total']]
    for item in sale.items.all():
        data.append([
            item.variant.full_sku if item.variant else (item.product.sku if item.product else 'Unknown'),
            str(item.quantity_sold),
            f"{item.unit_price:,.2f}",
            f"{item.item_discount_percentage}%",
            f"{item.item_total_after_tax:,.2f}"
        ])
    
    # Subtotal/Tax/Total
    data.append(['', '', '', 'Subtotal:', f"{sale.total_amount_before_tax:,.2f}"])
    data.append(['', '', '', 'Tax:', f"{sale.total_tax:,.2f}"])
    if sale.overall_discount_percentage > 0:
        data.append(['', '', '', f'Discount ({sale.overall_discount_percentage}%):', f"-{sale.final_amount - (sale.total_amount_before_tax + sale.total_tax):,.2f}"])
    data.append(['', '', '', 'Total:', f"{sale.final_amount:,.2f}"])
    
    t = Table(data, colWidths=[3*inch, 0.5*inch, 1*inch, 1*inch, 1*inch])
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.grey),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 12),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
        ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
        ('GRID', (0, 0), (-1, -1), 1, colors.black),
        ('ALIGN', (3, -3), (4, -1), 'RIGHT'),
        ('FONTNAME', (3, -1), (4, -1), 'Helvetica-Bold'),
    ]))
    
    elements.append(t)
    
    # Notes
    if sale.notes:
        elements.append(Spacer(1, 0.2 * inch))
        elements.append(Paragraph(f"Notes: {sale.notes}", normal_style))
        
    doc.build(elements)
    buffer.seek(0)
    return buffer
