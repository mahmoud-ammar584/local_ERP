'use client'

import React, { useRef } from 'react'
import { Printer, Download, X, CheckCircle, Store, Calendar, User, CreditCard } from 'lucide-react'
import { BarcodeDisplay } from '@/components/BarcodeDisplay'
import { useLanguage } from '@/lib/i18n'

export interface ThermalReceiptProps {
  isOpen: boolean
  onClose: () => void
  transaction: any
  storeInfo?: {
    store_name?: string
    name?: string
    address?: string
    phone?: string
    tax_registration_number?: string
    commercial_registration?: string
    legal_name?: string
  } | null
}

export const ThermalReceiptModal: React.FC<ThermalReceiptProps> = ({
  isOpen,
  onClose,
  transaction,
  storeInfo,
}) => {
  const { language } = useLanguage()
  const receiptRef = useRef<HTMLDivElement>(null)

  if (!isOpen || !transaction) return null

  const storeName = storeInfo?.store_name || storeInfo?.name || 'SARIEH BOUTIQUE'
  const storeAddress = storeInfo?.address || 'Cairo, Egypt'
  const storePhone = storeInfo?.phone || '+20 100 000 0000'
  const taxNumber = storeInfo?.tax_registration_number || '300-456-789'
  const commercialReg = storeInfo?.commercial_registration || storeInfo?.legal_name || 'CR-987654'

  const txDate = transaction.transaction_date || transaction.created_at || new Date().toISOString()
  const formattedDate = new Date(txDate).toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const rawItems = transaction.items || transaction.lines || []
  const items = rawItems.map((item: any) => ({
    sku: item.variant_sku || item.product_sku || 'SKU',
    name: item.product_name || item.model_name || 'Product',
    brand: item.brand_name || '',
    color: item.color || '',
    size: item.size || '',
    quantity: Number(item.quantity_sold ?? item.quantity ?? 1),
    unitPrice: Number(item.unit_price ?? item.price ?? 0),
    discountPercentage: Number(item.item_discount_percentage ?? item.discount_percentage ?? 0),
    total: Number(item.item_total_after_tax ?? item.line_total ?? (Number(item.unit_price || 0) * Number(item.quantity_sold || item.quantity || 1))),
  }))

  const subtotal = Number(transaction.total_amount_before_tax ?? transaction.subtotal_amount ?? items.reduce((sum: number, it: any) => sum + (it.unitPrice * it.quantity), 0))
  const taxAmount = Number(transaction.total_tax ?? transaction.tax_amount ?? 0)
  const discountAmount = Number(transaction.discount_amount ?? 0)
  const finalTotal = Number(transaction.final_amount ?? transaction.final_total ?? (subtotal + taxAmount - discountAmount))

  const handlePrint = () => {
    const printContent = receiptRef.current
    if (!printContent) return

    const printWindow = window.open('', '_blank', 'width=400,height=700')
    if (!printWindow) {
      window.print()
      return
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="${language === 'ar' ? 'rtl' : 'ltr'}">
        <head>
          <title>Receipt #${transaction.id}</title>
          <style>
            @page {
              size: 80mm auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace, system-ui;
              width: 78mm;
              margin: 0 auto;
              padding: 6mm 3mm;
              color: #000;
              background: #fff;
              font-size: 11px;
              line-height: 1.35;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .border-b { border-bottom: 1px dashed #444; }
            .border-t { border-top: 1px dashed #444; }
            .py-1 { padding-top: 4px; padding-bottom: 4px; }
            .py-2 { padding-top: 8px; padding-bottom: 8px; }
            .my-1 { margin-top: 4px; margin-bottom: 4px; }
            .my-2 { margin-top: 8px; margin-bottom: 8px; }
            .flex { display: flex; justify-content: space-between; align-items: flex-start; }
            .items-table { width: 100%; border-collapse: collapse; margin: 6px 0; }
            .items-table th { border-bottom: 1px solid #000; font-size: 10px; padding: 3px 0; text-align: start; }
            .items-table td { padding: 4px 0; font-size: 11px; vertical-align: top; }
            .barcode-wrap { text-align: center; margin-top: 8px; }
            .barcode-wrap svg { max-width: 180px; height: 35px; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleDownloadPdf = () => {
    window.open(`/api/sales/transactions/${transaction.id}/invoice/`, '_blank')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {language === 'ar' ? `فاتورة بيع رقم #${transaction.id}` : `Sale Receipt #${transaction.id}`}
              </h2>
              <p className="text-[11px] text-emerald-400 font-medium">
                {language === 'ar' ? 'تم الدفع والخصم من المخزن بنجاح' : 'Paid & Stock Deducted Successfully'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div
          ref={receiptRef}
          className="p-5 bg-white text-zinc-950 rounded-2xl shadow-inner font-mono text-xs space-y-3 select-none"
        >
          {/* Store Info */}
          <div className="text-center space-y-1">
            <div className="font-extrabold text-sm tracking-wider uppercase">{storeName}</div>
            <div className="text-[10px] text-zinc-600">{storeAddress}</div>
            <div className="text-[10px] text-zinc-600">Tel: {storePhone}</div>
            <div className="text-[10px] text-zinc-600">Tax Reg: {taxNumber} | CR: {commercialReg}</div>
          </div>

          <div className="border-b border-dashed border-zinc-400 my-2" />

          {/* Invoice Meta */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-zinc-600 font-semibold">{language === 'ar' ? 'رقم الفاتورة:' : 'Invoice No:'}</span>
              <span className="font-bold">#SALE-{String(transaction.id).padStart(6, '0')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">{language === 'ar' ? 'التاريخ:' : 'Date:'}</span>
              <span>{formattedDate}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">{language === 'ar' ? 'العميل:' : 'Customer:'}</span>
              <span className="font-semibold">{transaction.customer_name || (language === 'ar' ? 'عميل نقدي' : 'Walk-in')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">{language === 'ar' ? 'الكاشير / القائم بالعملية:' : 'Cashier / User:'}</span>
              <span className="font-bold font-mono">{transaction.created_by_username || transaction.created_by_name || 'Staff'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-600">{language === 'ar' ? 'طريقة الدفع:' : 'Payment:'}</span>
              <span className="font-semibold">{transaction.payment_method_name || 'Cash'}</span>
            </div>
          </div>

          <div className="border-b border-dashed border-zinc-400 my-2" />

          {/* Items Table */}
          <table className="w-full text-start">
            <thead>
              <tr className="border-b border-zinc-900 text-[10px] uppercase">
                <th className="text-start py-1">{language === 'ar' ? 'الصنف' : 'Item'}</th>
                <th className="text-center py-1">{language === 'ar' ? 'الكمية' : 'Qty'}</th>
                <th className="text-end py-1">{language === 'ar' ? 'السعر' : 'Price'}</th>
                <th className="text-end py-1">{language === 'ar' ? 'الإجمالي' : 'Total'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {items.map((item: any, idx: number) => (
                <tr key={idx} className="text-[11px]">
                  <td className="py-1.5 pe-1">
                    <div className="font-bold">{item.name}</div>
                    <div className="text-[9px] text-zinc-500">
                      {item.sku} {item.color ? `| ${item.color}` : ''} {item.size ? `| ${item.size}` : ''}
                    </div>
                  </td>
                  <td className="text-center py-1.5 align-top font-bold">{item.quantity}</td>
                  <td className="text-end py-1.5 align-top">{item.unitPrice.toFixed(2)}</td>
                  <td className="text-end py-1.5 align-top font-bold">{item.total.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-b border-dashed border-zinc-400 my-2" />

          {/* Financial Breakdown */}
          <div className="space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-zinc-600">{language === 'ar' ? 'المجموع قبل الضريبة:' : 'Subtotal:'}</span>
              <span>{subtotal.toFixed(2)} EGP</span>
            </div>
            {taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-zinc-600">{language === 'ar' ? 'ضريبة القيمة المضافة (14%):' : 'VAT Tax (14%):'}</span>
                <span>+{taxAmount.toFixed(2)} EGP</span>
              </div>
            )}
            {discountAmount > 0 && (
              <div className="flex justify-between text-emerald-700 font-semibold">
                <span>{language === 'ar' ? 'إجمالي الخصومات:' : 'Discount:'}</span>
                <span>-{discountAmount.toFixed(2)} EGP</span>
              </div>
            )}
            <div className="flex justify-between font-black text-sm pt-2 border-t-2 border-zinc-900">
              <span>{language === 'ar' ? 'الصافي المطلوب / المدفوع:' : 'NET TOTAL PAID:'}</span>
              <span>{finalTotal.toFixed(2)} EGP</span>
            </div>
          </div>

          <div className="border-b border-dashed border-zinc-400 my-2" />

          {/* Barcode Footer for Returns */}
          <div className="text-center space-y-1.5 pt-1">
            <div className="flex justify-center">
              <BarcodeDisplay
                value={`SALE-${transaction.id}`}
                width={1.4}
                height={32}
                showText={true}
                className="bg-transparent text-zinc-950"
              />
            </div>
            <p className="text-[9px] text-zinc-500 leading-tight">
              {language === 'ar'
                ? 'شكراً لتسوقكم معنا! الاسترجاع والاستبدال خلال 14 يوماً مع إحضار الفاتورة الأصلية.'
                : 'Thank you for shopping with us! Returns & exchanges within 14 days with original receipt.'}
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <button
            onClick={handleDownloadPdf}
            className="px-4 py-2.5 rounded-xl border border-zinc-700 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <Download className="w-4 h-4" />
            <span>{language === 'ar' ? 'تحميل الفاتورة PDF' : 'Download PDF'}</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
            >
              {language === 'ar' ? 'فاتورة جديدة (Esc)' : 'New Sale (Esc)'}
            </button>
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition"
            >
              <Printer className="w-4 h-4" />
              <span>{language === 'ar' ? 'طباعة الإيصال (F9)' : 'Print Receipt (F9)'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
