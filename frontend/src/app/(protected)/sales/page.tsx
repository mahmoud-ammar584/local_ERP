'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import {
  getSalesTransactions,
  createSalesTransaction,
  getProducts,
  getCustomers,
  getPaymentMethods,
  getTaxRates,
  Product,
  Customer,
  PaymentMethod,
  TaxRate,
  SalesTransaction,
} from '@/lib/api'
import {
  ShoppingCart,
  Plus,
  Trash2,
  Receipt,
  Download,
  CreditCard,
  UserCheck,
  CheckCircle2,
  Printer,
  History,
} from 'lucide-react'

interface CartItem {
  variantId: number
  productId: number
  name: string
  sku: string
  price: number
  quantity: number
  discount: number
}

export default function SalesPage() {
  const { t, language } = useLanguage()
  const [activeTab, setActiveTab] = useState<'pos' | 'history'>('pos')

  // Products & Metadata
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [transactions, setTransactions] = useState<SalesTransaction[]>([])
  const [loading, setLoading] = useState(false)

  // POS State
  const [cart, setCart] = useState<CartItem[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [transactionDiscount, setTransactionDiscount] = useState<number>(0)
  const [completing, setCompleting] = useState(false)
  const [completedTx, setCompletedTx] = useState<SalesTransaction | null>(null)
  const [error, setError] = useState('')

  async function loadInitialData() {
    setLoading(true)
    try {
      const [p, c, pm, tr, tx] = await Promise.all([
        getProducts(),
        getCustomers(),
        getPaymentMethods(),
        getTaxRates(),
        getSalesTransactions(),
      ])
      setProducts(Array.isArray(p) ? p : (p as any).results || [])
      setCustomers(Array.isArray(c) ? c : (c as any).results || [])
      const pmList = Array.isArray(pm) ? pm : (pm as any).results || []
      setPaymentMethods(pmList)
      if (pmList.length > 0) setSelectedPaymentMethod(String(pmList[0].id))
      setTaxRates(Array.isArray(tr) ? tr : (tr as any).results || [])
      setTransactions(Array.isArray(tx) ? tx : (tx as any).results || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  const addToCart = (product: Product, variantIndex = 0) => {
    const v = product.variants[variantIndex]
    if (!v) return

    const existingIndex = cart.findIndex((i) => i.variantId === v.id)
    if (existingIndex > -1) {
      const updated = [...cart]
      updated[existingIndex].quantity += 1
      setCart(updated)
    } else {
      setCart([
        ...cart,
        {
          variantId: v.id,
          productId: product.id,
          name: `${product.model_name} (${v.color} - ${v.size})`,
          sku: `${product.sku}${v.sku_suffix}`,
          price: product.suggested_selling_price,
          quantity: 1,
          discount: 0,
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
      const payload = {
        customer: selectedCustomer ? Number(selectedCustomer) : null,
        payment_method: selectedPaymentMethod ? Number(selectedPaymentMethod) : (paymentMethods[0]?.id || 1),
        discount_amount: transactionDiscount,
        paid_amount: finalTotal,
        items: cart.map((item) => ({
          variant: item.variantId,
          quantity_sold: item.quantity,
          unit_price: item.price,
          item_discount_percentage: item.discount,
        })),
      }

      const tx = await createSalesTransaction(payload)
      setCompletedTx(tx)
      setCart([])
      setTransactionDiscount(0)
      loadInitialData()
    } catch (err: any) {
      setError(err.message || 'Checkout failed')
    } finally {
      setCompleting(false)
    }
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 2,
    }).format(val)

  return (
    <div className="space-y-6">
      {/* Page Title & Tabs */}
      <div className="flex items-center justify-between">
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
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p, 0)}
                    className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:border-amber-500/50 text-start group transition"
                  >
                    <span className="text-[10px] font-mono text-amber-400/80 block truncate">{p.sku}</span>
                    <span className="text-xs font-bold text-white block mt-0.5 truncate group-hover:text-amber-400">
                      {p.model_name}
                    </span>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-400">{p.suggested_selling_price} EGP</span>
                      <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-bold">
                        +
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Col: Cart & Checkout */}
          <div className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] flex flex-col justify-between space-y-6">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <span className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-amber-400" />
                  <span>{t('cart')}</span>
                </span>
                <span className="text-xs font-semibold text-amber-400 px-2 py-0.5 rounded-full bg-amber-400/10 border border-amber-400/20">
                  {cart.length} items
                </span>
              </div>

              {/* Error Box */}
              {error && (
                <div className="mt-3 p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {error}
                </div>
              )}

              {/* Cart Items List */}
              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                {cart.length === 0 ? (
                  <div className="py-8 text-center text-zinc-500 text-xs">
                    {language === 'ar' ? 'السلة فارغة. انقر على منتج لإضافته' : 'Cart is empty. Click an item to add'}
                  </div>
                ) : (
                  cart.map((item, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-white truncate">{item.name}</p>
                        <p className="text-[10px] text-zinc-400 font-mono">{item.price} EGP</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg">
                          <button
                            onClick={() => updateCartQty(idx, -1)}
                            className="px-2 py-0.5 text-zinc-400 hover:text-white text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold text-white">{item.quantity}</span>
                          <button
                            onClick={() => updateCartQty(idx, 1)}
                            className="px-2 py-0.5 text-zinc-400 hover:text-white text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => removeFromCart(idx)}
                          className="text-zinc-500 hover:text-red-400 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Checkout Controls */}
            <div className="space-y-4 pt-4 border-t border-zinc-800">
              {/* Customer Selector */}
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">{t('customer')}</label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">{t('walkInCustomer')}</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              {/* Payment Method */}
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
              <div className="space-y-1.5 text-xs">
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
                    className="w-20 px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-end text-xs text-amber-400"
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
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black rounded-xl text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {completing ? t('loading') : t('completeSale')}
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
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-zinc-500">
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
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
