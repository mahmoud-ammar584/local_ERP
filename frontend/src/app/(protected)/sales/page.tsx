'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/lib/i18n'
import {
  getProducts,
  getCustomers,
  getPaymentMethods,
  getTaxRates,
  getSalesTransactions,
  createSalesTransaction,
  lookupProductBySku,
  Product,
  Customer,
  PaymentMethod,
  TaxRate,
  SalesTransaction,
} from '@/lib/api'
import { getUser, hasPermission } from '@/lib/auth'
import { soundFx } from '@/lib/sound'
import { BarcodeDisplay } from '@/components/BarcodeDisplay'
import { BarcodeLabelModal, LabelProductData } from '@/components/BarcodeLabelModal'
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
  ScanLine,
  Barcode,
  Search,
  Check,
  Tag,
  Lock,
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
  brandName?: string
  color?: string
  size?: string
}

export default function SalesPage() {
  const { t, language } = useLanguage()
  const currentUser = getUser()

  // Granular Permissions
  const canAddSale = hasPermission('sales', 'add')
  const canViewSales = hasPermission('sales', 'view')
  const canApplyDiscount = hasPermission('sales', 'apply_discount')
  const canPrintBarcode = hasPermission('inventory', 'print_barcode')
  const canExportCsv = hasPermission('sales', 'export_csv')

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

  // Quick Barcode Scanning State
  const [barcodeInput, setBarcodeInput] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanToast, setScanToast] = useState<string | null>(null)
  const scannerInputRef = useRef<HTMLInputElement>(null)

  // Label Print Modal State
  const [labelModalProduct, setLabelModalProduct] = useState<LabelProductData | null>(null)
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false)

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
        canViewSales ? getSalesTransactions() : Promise.resolve([]),
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

  // Auto-focus scanner input when POS tab becomes active
  useEffect(() => {
    if (activeTab === 'pos' && canAddSale) {
      setTimeout(() => {
        scannerInputRef.current?.focus()
      }, 100)
    }
  }, [activeTab, canAddSale])

  // Global Keyboard Shortcuts (F2 = Focus Scanner, F9 = Checkout)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault()
        scannerInputRef.current?.focus()
        scannerInputRef.current?.select()
      } else if (e.key === 'F9' || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault()
        if (cart.length > 0 && !completing && canAddSale) {
          handleCheckout()
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart, completing, canAddSale])

  // Scan or SKU Submit Handler
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canAddSale) {
      soundFx.playScanWarning()
      setError('ليس لديك صلاحية لإتمام عمليات البيع')
      return
    }
    const code = barcodeInput.trim()
    if (!code) return

    setError('')
    setIsScanning(true)

    try {
      // 1. Check if the SKU/Variant is already in cart
      const existingIdx = cart.findIndex(
        (i) => i.sku.toLowerCase() === code.toLowerCase()
      )

      if (existingIdx > -1) {
        const updated = [...cart]
        updated[existingIdx].quantity += 1
        setCart(updated)
        soundFx.playScanSuccess()
        setScanToast(`+1 ${updated[existingIdx].name} (${updated[existingIdx].sku})`)
        setTimeout(() => setScanToast(null), 2500)
        setBarcodeInput('')
        return
      }

      // 2. Lookup SKU or Barcode from backend
      const variant = await lookupProductBySku(code)
      if (variant) {
        const variantId = variant.id
        const variantSku = variant.full_sku || variant.sku_suffix || code
        const unitPrice = Number(variant.effective_price || variant.suggested_selling_price || 0)
        const maxStock = variant.stock_quantity ?? variant.current_quantity ?? 999

        // Check if now found in cart by variant ID
        const existingByIdx = cart.findIndex((i) => i.variantId === variantId)
        if (existingByIdx > -1) {
          const updated = [...cart]
          updated[existingByIdx].quantity += 1
          setCart(updated)
        } else {
          setCart((prev) => [
            ...prev,
            {
              productId: variant.product || variant.id,
              variantId: variantId,
              sku: variantSku,
              name: variant.model_name || 'Product',
              price: unitPrice,
              quantity: 1,
              discount: 0,
              maxStock: maxStock,
              brandName: variant.brand_name,
              color: variant.color,
              size: variant.size,
            },
          ])
        }

        soundFx.playScanSuccess()
        setScanToast(`+1 ${variant.model_name || 'Item'} (${variantSku})`)
        setTimeout(() => setScanToast(null), 2500)
        setBarcodeInput('')
      } else {
        soundFx.playScanWarning()
        setError(language === 'ar' ? `لم يتم العثور على صنف بالرمز "${code}"` : `No item found for barcode "${code}"`)
      }
    } catch (err: any) {
      soundFx.playScanWarning()
      setError(err.message || `No product found for SKU / Barcode "${code}"`)
    } finally {
      setIsScanning(false)
      scannerInputRef.current?.focus()
    }
  }

  // Cart operations
  const addToCart = (product: Product, variantIndex = 0) => {
    if (!canAddSale) {
      alert('ليس لديك صلاحية لإتمام عمليات البيع')
      return
    }
    const variant = product.variants?.[variantIndex]
    const variantId = variant ? variant.id : product.id
    const variantSku = variant?.full_sku || variant?.sku_suffix || product.sku || ''
    const availableStock = variant?.stock_quantity ?? variant?.current_quantity ?? 999
    const price = Number(variant?.effective_price || product.suggested_selling_price || 0)

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
          price: price,
          quantity: 1,
          discount: 0,
          maxStock: availableStock,
          brandName: product.brand_name,
          color: variant?.color,
          size: variant?.size,
        },
      ])
    }
    soundFx.playScanSuccess()
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

  // Open barcode label modal for any cart item or product
  const handleOpenLabelModal = (item: CartItem | Product) => {
    if (!canPrintBarcode) {
      alert('ليس لديك صلاحية لطباعة ملصقات الباركود')
      return
    }
    if ('model_name' in item) {
      // Product
      setLabelModalProduct({
        model_name: item.model_name,
        brand_name: item.brand_name,
        sku: item.sku,
        barcode: item.barcode,
        price: item.suggested_selling_price,
        current_quantity: item.current_quantity,
      })
    } else {
      // CartItem
      setLabelModalProduct({
        model_name: item.name,
        brand_name: item.brandName,
        color: item.color,
        size: item.size,
        sku: item.sku,
        price: item.price,
      })
    }
    setIsLabelModalOpen(true)
  }

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const itemDiscounts = cart.reduce(
    (acc, item) => acc + item.price * item.quantity * (item.discount / 100),
    0
  )
  const totalAfterItemDiscounts = subtotal - itemDiscounts
  const appliedDiscount = canApplyDiscount ? transactionDiscount : 0
  const finalTotal = Math.max(0, totalAfterItemDiscounts - appliedDiscount)

  // Handle Checkout Submission
  const handleCheckout = async () => {
    if (!canAddSale) {
      alert('ليس لديك صلاحية لإتمام عمليات البيع')
      return
    }
    if (cart.length === 0) return
    setError('')
    setCompleting(true)

    const defaultPaymentMethod =
      paymentMethods.find((p) => p.is_default) || paymentMethods[0]
    const chosenMethodId = selectedPaymentMethod
      ? Number(selectedPaymentMethod)
      : defaultPaymentMethod?.id

    if (!chosenMethodId) {
      setError('Please configure at least one payment method.')
      setCompleting(false)
      return
    }

    const payload = {
      customer: selectedCustomer ? Number(selectedCustomer) : undefined,
      payment_method: chosenMethodId,
      discount_amount: appliedDiscount,
      lines: cart.map((item) => ({
        product_variant: item.variantId,
        quantity: item.quantity,
        unit_price: item.price,
        discount_percentage: item.discount,
      })),
    }

    try {
      const res = await createSalesTransaction(payload)
      soundFx.playCheckoutSuccess()
      setInvoiceModalTx(res)
      setCart([])
      setTransactionDiscount(0)
      loadInitialData()
    } catch (err: any) {
      soundFx.playScanWarning()
      setError(err.message || 'Checkout failed. Please check stock levels.')
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
              ? 'إصدار الفواتير الفورية، الدفع بالماسح الضوئي (SKU & Barcode)، وطباعة الإيصالات'
              : 'Rapid barcode scanning checkout, instant VIP discounts & invoice generation'}
          </p>
        </div>

        {canViewSales && (
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
        )}
      </div>

      {activeTab === 'pos' ? (
        <div className="space-y-4">
          {/* Quick Barcode Scanner Bar (Always Ready) */}
          {canAddSale ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 shadow-lg relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <form
                  onSubmit={handleBarcodeSubmit}
                  className="flex-1 flex items-center gap-2 relative"
                >
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-amber-400">
                      <Barcode className="w-5 h-5 animate-pulse" />
                    </div>
                    <input
                      ref={scannerInputRef}
                      type="text"
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      placeholder={
                        language === 'ar'
                          ? 'امسح الباركود بالماسح الضوئي أو اكتب كود الـ SKU واضغط Enter... [اختصار F2]'
                          : 'Scan barcode gun or type SKU and hit Enter... [Hotkey: F2]'
                      }
                      className="w-full ps-11 pe-4 py-3 bg-zinc-950 border border-amber-500/40 focus:border-amber-400 rounded-xl text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400/20 transition shadow-inner"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!barcodeInput.trim() || isScanning}
                    className="px-5 py-3 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-2 transition disabled:opacity-50 shrink-0 shadow-md"
                  >
                    <ScanLine className="w-4 h-4" />
                    <span>{language === 'ar' ? 'إضافة للسلة' : 'Add Item'}</span>
                  </button>
                </form>

                {/* Status / Scan Toast Indicator */}
                <div className="flex items-center gap-2 text-xs">
                  {scanToast ? (
                    <div className="px-3 py-1.5 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-lg font-semibold flex items-center gap-1.5 animate-bounce">
                      <Check className="w-4 h-4" />
                      <span>{scanToast}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-zinc-400 font-mono hidden lg:flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      <span>{language === 'ar' ? 'الماسح الضوئي متصل وجاهز' : 'Scanner Gun Ready'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{language === 'ar' ? 'ليس لديك صلاحية لإتمام عمليات البيع والإضافة إلى السلة.' : 'You do not have permission to perform sales checkouts.'}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center justify-between animate-shake">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="text-zinc-500 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Grid Layout: Catalog on Left, POS Cart on Right */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products Quick Catalog (2 Cols) */}
            <div className="lg:col-span-2 space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {products.map((p) => {
                  const defaultVariant = p.variants?.[0]
                  const stock = defaultVariant?.stock_quantity ?? defaultVariant?.current_quantity ?? 0
                  const isOutOfStock = stock <= 0

                  return (
                    <div
                      key={p.id}
                      className={`p-4 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] hover:border-amber-500/40 transition flex flex-col justify-between group relative overflow-hidden ${
                        isOutOfStock ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-[10px] font-mono text-zinc-500 block truncate">
                            {p.sku}
                          </span>
                          {canPrintBarcode && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenLabelModal(p)
                              }}
                              title={language === 'ar' ? 'طباعة باركود' : 'Print Barcode'}
                              className="text-zinc-600 hover:text-amber-400 transition"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <h3 className="font-bold text-white text-xs truncate group-hover:text-amber-400 transition">
                          {p.model_name}
                        </h3>
                        <p className="text-[10px] text-zinc-400">
                          {p.brand_name || 'Generic'} • {defaultVariant?.color || 'M'}
                        </p>
                      </div>

                      <div className="mt-4 pt-2 border-t border-zinc-800/80 flex items-center justify-between">
                        <span className="font-mono font-bold text-amber-400 text-xs">
                          {formatCurrency(p.suggested_selling_price)}
                        </span>
                        {canAddSale && (
                          <button
                            onClick={() => addToCart(p)}
                            disabled={isOutOfStock}
                            className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-bold transition disabled:opacity-30 disabled:hover:bg-amber-500/10"
                          >
                            {isOutOfStock ? 'Out' : '+ Add'}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Cart & Checkout Panel (1 Col) */}
            <div className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] flex flex-col justify-between space-y-4">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <h2 className="text-sm font-bold text-white flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-amber-400" />
                    <span>{t('cart')}</span>
                  </h2>
                  <span className="text-xs font-mono text-zinc-400">
                    {cart.reduce((a, b) => a + b.quantity, 0)} {language === 'ar' ? 'قطع' : 'items'}
                  </span>
                </div>

                {/* Cart Items List */}
                <div className="space-y-2 max-h-64 overflow-y-auto py-3">
                  {cart.length === 0 ? (
                    <div className="text-center py-8 text-zinc-500 text-xs">
                      {language === 'ar'
                        ? 'السلة فارغة. امسح الباركود أو اختر منتجاً.'
                        : 'Cart is empty. Scan barcode or click + Add.'}
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-white truncate block">{item.name}</span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] text-zinc-400 font-mono">{item.sku}</span>
                            {(item.color || item.size) && (
                              <span className="text-[9px] text-amber-400/80">
                                {item.color} / {item.size}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-amber-400 font-bold mt-0.5">
                            {formatCurrency(item.price)}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          {canPrintBarcode && (
                            <button
                              type="button"
                              onClick={() => handleOpenLabelModal(item)}
                              title={language === 'ar' ? 'طباعة باركود' : 'Print Barcode'}
                              className="p-1 text-zinc-500 hover:text-amber-400"
                            >
                              <Tag className="w-3.5 h-3.5" />
                            </button>
                          )}
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
                    <span className="flex items-center gap-1">
                      <span>{t('discount')} (EGP)</span>
                      {!canApplyDiscount && <Lock className="w-3 h-3 text-zinc-500" />}
                    </span>
                    <input
                      type="number"
                      disabled={!canApplyDiscount}
                      value={transactionDiscount}
                      onChange={(e) => setTransactionDiscount(Number(e.target.value))}
                      min={0}
                      className="w-20 px-2 py-0.5 bg-zinc-950 border border-zinc-800 rounded text-end text-xs text-amber-400 font-bold disabled:opacity-50"
                    />
                  </div>
                  <div className="flex justify-between text-base font-black text-white pt-2 border-t border-zinc-800">
                    <span>{t('finalTotal')}</span>
                    <span className="text-amber-400">{formatCurrency(finalTotal)}</span>
                  </div>
                </div>

                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || completing || !canAddSale}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black rounded-xl text-xs sm:text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{completing ? t('loading') : `${t('completeSale')} [F9]`}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* History Tab */
        canViewSales && (
          <div className="rounded-2xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">{t('salesHistory')}</h2>
              {canExportCsv && (
                <a
                  href="/api/sales/transactions/export_csv/"
                  download
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-xs font-semibold text-zinc-300 flex items-center gap-1.5 transition"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>{t('exportCsv')}</span>
                </a>
              )}
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
                        {loading ? t('loading') : t('noData')}
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-zinc-900/30">
                        <td className="p-4 font-mono font-bold text-amber-400">#{tx.id}</td>
                        <td className="p-4 text-white font-semibold">{tx.customer_name || 'Walk-in Customer'}</td>
                        <td className="p-4 text-zinc-400">{tx.payment_method_name}</td>
                        <td className="p-4 text-end font-bold text-white">{formatCurrency(tx.final_total || tx.final_amount || 0)}</td>
                        <td className="p-4 text-end text-zinc-500 font-mono">
                          {new Date(tx.created_at || tx.transaction_date || Date.now()).toLocaleString()}
                        </td>
                        <td className="p-4 text-end">
                          <button
                            onClick={() => setInvoiceModalTx(tx)}
                            className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg text-xs font-semibold"
                          >
                            Invoice
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )
      )}

      {/* Barcode Label Modal */}
      {canPrintBarcode && (
        <BarcodeLabelModal
          isOpen={isLabelModalOpen}
          onClose={() => setIsLabelModalOpen(false)}
          product={labelModalProduct}
        />
      )}

      {/* Invoice Modal */}
      {invoiceModalTx && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-[#0c0c10] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-amber-400" />
                <span>Sales Invoice #{invoiceModalTx.id}</span>
              </h2>
              <button
                onClick={() => setInvoiceModalTx(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 bg-zinc-950 rounded-xl space-y-3 font-mono text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Date:</span>
                <span>{new Date(invoiceModalTx.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Customer:</span>
                <span className="text-white">{invoiceModalTx.customer_name || 'Walk-in'}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Cashier:</span>
                <span className="text-white">{invoiceModalTx.created_by_name || 'Staff'}</span>
              </div>
              <div className="border-t border-zinc-800 pt-2 space-y-1">
                {invoiceModalTx.lines?.map((l: any, i: number) => (
                  <div key={i} className="flex justify-between text-zinc-300">
                    <span>
                      {l.quantity}x {l.product_name} ({l.variant_sku})
                    </span>
                    <span>{formatCurrency(l.line_total)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-zinc-800 pt-2 flex justify-between font-bold text-sm text-amber-400">
                <span>Total Paid:</span>
                <span>{formatCurrency(invoiceModalTx.final_total)}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={handlePrintReceipt}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>{t('printReceipt')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
