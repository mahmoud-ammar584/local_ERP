'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import {
  getProducts,
  getCustomers,
  getPaymentMethods,
  getTaxRates,
  getSalesTransactions,
  createSalesTransaction,
  Product,
  Customer,
  PaymentMethod,
  TaxRate,
  SalesTransaction,
} from '@/lib/api'
import { getUser } from '@/lib/auth'
import {
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  Printer,
  History,
  Download,
  AlertCircle,
  Sparkles,
  X,
  Receipt,
  QrCode,
} from 'lucide-react'

interface CartItem {
  productId: number
  variantId: number
  sku: string
  name: string
  price: number
  quantity: number
  discount: number // percentage
  maxStock: number
}

export default function SalesPage() {
  const { t, language } = useLanguage()
  const currentUser = getUser()

  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos')

  // POS State
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [cart, setCart] = useState<CartItem[]>([])

  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [transactionDiscount, setTransactionDiscount] = useState<number>(0)

  // Transaction History State
  const [transactions, setTransactions] = useState<SalesTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')

  // Invoice Print Modal State
  const [invoiceModalTx, setInvoiceModalTx] = useState<any | null>(null)

  async function loadInitialData() {
    setLoading(true)
    try {
      const [pRes, cRes, pmRes, trRes, txRes] = await Promise.all([
        getProducts(),
        getCustomers(),
        getPaymentMethods(),
        getTaxRates(),
        getSalesTransactions(),
      ])

      const pList = Array.isArray(pRes) ? pRes : (pRes as any).results || []
      const cList = Array.isArray(cRes) ? cRes : (cRes as any).results || []
      const pmList = Array.isArray(pmRes) ? pmRes : (pmRes as any).results || []
      const trList = Array.isArray(trRes) ? trRes : (trRes as any).results || []
      const txList = Array.isArray(txRes) ? txRes : (txRes as any).results || []

      setProducts(pList)
      setCustomers(cList)
      setPaymentMethods(pmList)
      setTaxRates(trList)
      setTransactions(txList)

      if (pmList.length > 0 && !selectedPaymentMethod) {
        setSelectedPaymentMethod(String(pmList[0].id))
      }
    } catch (err) {
      console.error('Failed to load sales dependencies:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // Cart operations
  const addToCart = (product: Product, variantIndex = 0) => {
    const variant = product.variants?.[variantIndex]
    const variantId = variant ? variant.id : product.id
    const variantSku = (variant?.full_sku || variant?.sku_suffix || product.sku || '')
    const availableStock = variant?.stock_quantity ?? variant?.current_quantity ?? 999

    const existingIndex = cart.findIndex((item) => item.variantId === variantId)
    if (existingIndex > -1) {
      const updated = [...cart]
      updated[existingIndex].quantity += 1
      setCart(updated)
    } else {
      setCart([
        ...cart,
        {
          productId: product.id,
          variantId: variantId,
          sku: variantSku,
          name: product.model_name,
          price: Number(product.suggested_selling_price) || 0,
          quantity: 1,
          discount: 0,
          maxStock: availableStock,
        },
      ])
    }
  }

  const updateCartQty = (index: number, delta: number) => {
    const updated = [...cart]
    updated[index].quantity += delta
    if (updated[index].quantity <= 0) {
      updated.splice(index, 1)
    }
    setCart(updated)
  }

  const removeFromCart = (index: number) => {
    const updated = [...cart]
    updated.splice(index, 1)
    setCart(updated)
  }

  // Calculations
  const subtotal = cart.reduce((acc, i) => acc + i.price * i.quantity * (1 - i.discount / 100), 0)
  const finalTotal = Math.max(0, subtotal - transactionDiscount)

  const handleCheckout = async () => {
    if (cart.length === 0) return
    setError('')
    setCompleting(true)
    try {
      const defaultTaxId = taxRates[0]?.id || 1
      const payload = {
        customer: selectedCustomer ? Number(selectedCustomer) : null,
        payment_method: selectedPaymentMethod ? Number(selectedPaymentMethod) : (paymentMethods[0]?.id || 1),
        transaction_date: new Date().toISOString(),
        overall_discount_percentage: 0,
        discount_amount: transactionDiscount,
        paid_amount: finalTotal,
        items: cart.map((item) => ({
          product: item.productId,
          variant: item.variantId,
          quantity_sold: item.quantity,
          unit_price: item.price,
          item_discount_percentage: item.discount,
          tax_rate: defaultTaxId,
        })),
      }

      const tx = await createSalesTransaction(payload)
      setInvoiceModalTx(tx)
      setCart([])
      setTransactionDiscount(0)
      loadInitialData()
    } catch (err: any) {
      let msg = err.message || 'Checkout failed'
      if (err.details) {
        if (typeof err.details === 'object' && (err.details as any).items) {
          const itm = (err.details as any).items
          msg = Array.isArray(itm) ? (typeof itm[0] === 'object' ? JSON.stringify(itm[0]) : itm[0]) : String(itm)
        }
      }
      setError(msg)
    } finally {
      setCompleting(false)
    }
  }

  const handlePrintReceipt = () => {
    window.print()
  }

  const formatCurrency = (amount: number | string) => {
    const val = Number(amount) || 0
    return `${val.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} EGP`
  }

  return (
    <div className="space-y-6">
      {/* Header & Mode Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-amber-400" />
            <span>{t('posTitle')}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'ar'
              ? 'إصدار الفواتير الفورية وإدارة عمليات البيع لعملاء المتجر'
              : 'Instant checkout, VIP discounting & invoice generation'}
          </p>
        </div>

        <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          <button
            onClick={() => setActiveTab('pos')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'pos' ? 'bg-amber-400 text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            {t('newSale')}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'history' ? 'bg-amber-400 text-zinc-950 shadow' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>{t('salesHistory')}</span>
          </button>
        </div>
      </div>

      {activeTab === 'pos' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left / Center 2 Cols: Products Grid */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-4 rounded-2xl bg-[#0c0c10] border border-[#1e1e26]">
              <h2 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                {language === 'ar' ? 'اختر المنتجات لإضافتها للسلة' : 'Catalog Quick Select'}
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((p) => {
                  const stock = p.variants?.reduce(
                    (acc, v) => acc + (v.stock_quantity ?? v.current_quantity ?? 0),
                    0
                  ) ?? (p.current_quantity ?? 0)

                  return (
                    <button
                      key={p.id}
                      onClick={() => addToCart(p, 0)}
                      className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-amber-500/50 text-start group transition flex flex-col justify-between"
                    >
                      <div>
                        <span className="text-[10px] font-mono text-amber-400/80 block truncate">{p.sku}</span>
                        <span className="text-xs font-bold text-white block mt-0.5 truncate group-hover:text-amber-400">
                          {p.model_name}
                        </span>
                        <span className="text-[10px] text-zinc-400 block mt-0.5">
                          {p.brand_name || 'Fashion'} • Stock: {stock}
                        </span>
                      </div>
                      <div className="mt-3 flex items-center justify-between w-full">
                        <span className="text-xs font-black text-emerald-400">{p.suggested_selling_price} EGP</span>
                        <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-bold group-hover:bg-amber-400 group-hover:text-zinc-950 transition">
                          +
                        </span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Right Col: POS Cart & Checkout */}
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <h2 className="text-sm font-bold text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>{t('cart')}</span>
                </h2>
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-full text-[10px] font-bold">
                  {cart.length} items
                </span>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Cart Line Items */}
              <div className="space-y-2.5 max-h-60 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs">
                    {language === 'ar' ? 'السلة فارغة، انقر على منتج لإضافته' : 'Cart is empty. Click a product to add.'}
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-white truncate block">{item.name}</span>
                        <span className="text-[10px] text-zinc-400 font-mono">{item.sku}</span>
                        <div className="text-[11px] text-amber-400 font-bold mt-0.5">
                          {formatCurrency(item.price)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => updateCartQty(idx, -1)}
                          className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-6 text-center font-bold text-white text-xs">{item.quantity}</span>
                        <button
                          onClick={() => updateCartQty(idx, 1)}
                          className="w-6 h-6 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="w-6 h-6 text-zinc-500 hover:text-red-400 flex items-center justify-center ms-1"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Customer Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">{t('customer')}</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">{language === 'ar' ? 'عميل نقدي (عام)' : 'Walk-in Cash Customer'}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">{t('paymentMethod')}</label>
                <select
                  value={selectedPaymentMethod}
                  onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  {paymentMethods.map((pm) => (
                    <option key={pm.id} value={pm.id}>
                      {pm.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Subtotal & Totals */}
              <div className="space-y-1.5 text-xs pt-2 border-t border-zinc-800">
                <div className="flex justify-between text-zinc-400">
                  <span>{t('subtotal')}</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between items-center text-zinc-400">
                  <span>{t('discount')} (EGP)</span>
                  <input
                    type="number"
                    value={transactionDiscount}
                    onChange={(e) => setTransactionDiscount(Number(e.target.value))}
                    min={0}
                    className="w-20 px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-end text-xs text-amber-400 font-bold"
                  />
                </div>
                <div className="flex justify-between text-base font-black text-white pt-2 border-t border-zinc-800">
                  <span>{t('finalTotal')}</span>
                  <span className="text-amber-400">{formatCurrency(finalTotal)}</span>
                </div>
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || completing}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black rounded-xl text-xs sm:text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{completing ? t('loading') : t('completeSale')}</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* History Tab */
        <div className="rounded-2xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden">
          <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">{t('salesHistory')}</h2>
            <a
              href="/api/sales/transactions/export_csv/"
              download
              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('exportCsv')}</span>
            </a>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
                  <th className="p-4 text-start"># ID</th>
                  <th className="p-4 text-start">{t('customer')}</th>
                  <th className="p-4 text-start">{t('paymentMethod')}</th>
                  <th className="p-4 text-end">{t('finalTotal')}</th>
                  <th className="p-4 text-end">{t('date')}</th>
                  <th className="p-4 text-end">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-zinc-500">
                      {t('noData')}
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-zinc-900/30">
                      <td className="p-4 font-mono font-bold text-amber-400">
                        {tx.invoice_number || `#${tx.id}`}
                      </td>
                      <td className="p-4 font-semibold text-white">{tx.customer_name || 'Walk-in Customer'}</td>
                      <td className="p-4 text-zinc-400">{tx.payment_method_name || 'Cash'}</td>
                      <td className="p-4 text-end font-bold text-emerald-400">
                        {formatCurrency(tx.final_amount)}
                      </td>
                      <td className="p-4 text-end text-zinc-500">
                        {new Date(tx.transaction_date).toLocaleString()}
                      </td>
                      <td className="p-4 text-end">
                        <button
                          onClick={() => setInvoiceModalTx(tx)}
                          className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          <span>{language === 'ar' ? 'طباعة' : 'Print'}</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Printable Invoice / Thermal Receipt Modal */}
      {invoiceModalTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-md bg-white text-zinc-950 rounded-2xl p-6 shadow-2xl my-8 relative print:m-0 print:p-4 print:w-full print:max-w-none print:shadow-none">
            {/* Modal Controls (Hidden in Print) */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 mb-4 print:hidden">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                {language === 'ar' ? 'معاينة الفاتورة للطباعة' : 'Printable Invoice Preview'}
              </span>
              <button
                onClick={() => setInvoiceModalTx(null)}
                className="text-zinc-400 hover:text-zinc-700 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Receipt Body */}
            <div id="printable-receipt" className="text-center font-mono text-xs text-zinc-900 space-y-4">
              {/* Store Header */}
              <div className="border-b border-dashed border-zinc-300 pb-3">
                <h2 className="text-base font-black tracking-wider uppercase text-zinc-950">
                  {currentUser?.company_name || 'La Boutique Deluxe'}
                </h2>
                <p className="text-[11px] text-zinc-600 font-semibold mt-0.5">Funnel Luxury Fashion ERP</p>
                <p className="text-[10px] text-zinc-500">Tax Reg: 482-910-384 | CR: 104928</p>
                <p className="text-[10px] text-zinc-500">Tel: +20 (02) 2794-8800</p>
              </div>

              {/* Transaction Metadata */}
              <div className="text-start space-y-1 text-[11px] border-b border-dashed border-zinc-300 pb-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Invoice No:</span>
                  <span className="font-bold text-zinc-950">{invoiceModalTx.invoice_number || `#${invoiceModalTx.id}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Date & Time:</span>
                  <span>{new Date(invoiceModalTx.transaction_date || invoiceModalTx.created_at).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Cashier:</span>
                  <span>{currentUser?.first_name || currentUser?.username || 'Staff'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Customer:</span>
                  <span className="font-semibold">{invoiceModalTx.customer_name || 'Walk-in Customer'}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="border-b border-dashed border-zinc-300 pb-3">
                <table className="w-full text-start text-[11px]">
                  <thead>
                    <tr className="border-b border-zinc-300 text-zinc-600 font-bold">
                      <th className="py-1 text-start">Item</th>
                      <th className="py-1 text-center">Qty</th>
                      <th className="py-1 text-end">Price</th>
                      <th className="py-1 text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {invoiceModalTx.items && invoiceModalTx.items.length > 0 ? (
                      invoiceModalTx.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="py-1 font-semibold text-zinc-950">
                            {item.product_name || item.product?.model_name || `Item #${item.variant || item.product || idx + 1}`}
                          </td>
                          <td className="py-1 text-center">{item.quantity_sold}</td>
                          <td className="py-1 text-end">{Number(item.unit_price).toFixed(2)}</td>
                          <td className="py-1 text-end font-bold">{Number(item.item_total_after_tax || (item.unit_price * item.quantity_sold)).toFixed(2)}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-1 text-center text-zinc-500">
                          Total items: {cart.length || 1}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Financial Totals */}
              <div className="text-start space-y-1 text-[11px] border-b border-dashed border-zinc-300 pb-3">
                <div className="flex justify-between">
                  <span className="text-zinc-600">Subtotal:</span>
                  <span>{formatCurrency(invoiceModalTx.total_amount_before_tax || invoiceModalTx.final_amount)}</span>
                </div>
                {Number(invoiceModalTx.discount_amount) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>Discount:</span>
                    <span>-{formatCurrency(invoiceModalTx.discount_amount)}</span>
                  </div>
                )}
                {Number(invoiceModalTx.total_tax) > 0 && (
                  <div className="flex justify-between text-zinc-600">
                    <span>VAT (Tax):</span>
                    <span>+{formatCurrency(invoiceModalTx.total_tax)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-black text-zinc-950 pt-1.5 border-t border-zinc-400">
                  <span>TOTAL PAID:</span>
                  <span>{formatCurrency(invoiceModalTx.final_amount)}</span>
                </div>
                <div className="flex justify-between text-[10px] text-zinc-500 pt-1">
                  <span>Payment Method:</span>
                  <span className="font-semibold uppercase">{invoiceModalTx.payment_method_name || 'Cash'}</span>
                </div>
              </div>

              {/* Footer Policy & Barcode */}
              <div className="pt-1 text-center space-y-1 text-[10px] text-zinc-500">
                <p className="font-semibold text-zinc-700">Thank you for visiting {currentUser?.company_name || 'La Boutique Deluxe'}!</p>
                <p>Exchange & Return within 14 days with original receipt and tags attached.</p>
                <div className="pt-2 flex justify-center">
                  <div className="px-4 py-1.5 bg-zinc-100 border border-zinc-300 rounded text-[9px] font-mono tracking-widest text-zinc-800">
                    * {invoiceModalTx.invoice_number || `TX-${invoiceModalTx.id}`} *
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons (Hidden in Print) */}
            <div className="flex items-center gap-3 pt-5 border-t border-zinc-200 mt-4 print:hidden">
              <button
                onClick={() => setInvoiceModalTx(null)}
                className="flex-1 py-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 font-bold rounded-xl text-xs transition"
              >
                {language === 'ar' ? 'إغلاق وعملية جديدة' : 'Close & New Sale'}
              </button>
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <Printer className="w-4 h-4" />
                <span>{language === 'ar' ? 'طباعة الفاتورة' : 'Print Invoice'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
