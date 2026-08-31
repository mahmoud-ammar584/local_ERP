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
  getStoreInfo,
  Product,
  Customer,
  PaymentMethod,
  TaxRate,
  SalesTransaction,
  StoreInfo,
} from '@/lib/api'
import { getUser, hasPermission } from '@/lib/auth'
import { soundFx } from '@/lib/sound'
import { BarcodeDisplay } from '@/components/BarcodeDisplay'
import { BarcodeLabelModal, LabelProductData } from '@/components/BarcodeLabelModal'
import { ThermalReceiptModal } from '@/components/ThermalReceiptModal'
import { ReturnModal } from '@/components/ReturnModal'
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
  Volume2,
  VolumeX,
  RotateCcw,
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
  const [storeInfo, setStoreInfo] = useState<StoreInfo | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])

  const [selectedCustomer, setSelectedCustomer] = useState<string>('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('')
  const [transactionDiscount, setTransactionDiscount] = useState<number>(0)

  // Quick Barcode Scanning State
  const [barcodeInput, setBarcodeInput] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)
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

  // Thermal Receipt Modal State
  const [receiptTx, setReceiptTx] = useState<any | null>(null)

  // Return & Refund Modal State
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)

  async function loadInitialData() {
    setLoading(true)
    try {
      const [pRes, cRes, pmRes, trRes, txRes, sRes] = await Promise.all([
        getProducts(),
        getCustomers(),
        getPaymentMethods(),
        getTaxRates(),
        canViewSales ? getSalesTransactions() : Promise.resolve([]),
        getStoreInfo().catch(() => null),
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
      if (sRes) setStoreInfo(sRes)

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
  }, [cart, completing, canAddSale, selectedCustomer, selectedPaymentMethod, transactionDiscount])

  // Scan or SKU Submit Handler
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canAddSale) {
      if (soundEnabled) soundFx.playScanWarning()
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
        if (soundEnabled) soundFx.playScanSuccess()
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

        if (soundEnabled) soundFx.playScanSuccess()
        setScanToast(`+1 ${variant.model_name || 'Item'} (${variantSku})`)
        setTimeout(() => setScanToast(null), 2500)
        setBarcodeInput('')
      } else {
        if (soundEnabled) soundFx.playScanWarning()
        setError(language === 'ar' ? `لم يتم العثور على صنف بالرمز "${code}"` : `No item found for barcode "${code}"`)
      }
    } catch (err: any) {
      if (soundEnabled) soundFx.playScanWarning()
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
    if (soundEnabled) soundFx.playScanSuccess()
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

  // Calculations matching backend formulas
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const itemDiscounts = cart.reduce(
    (acc, item) => acc + item.price * item.quantity * (item.discount / 100),
    0
  )
  const totalAfterItemDiscounts = subtotal - itemDiscounts
  const discountRate = canApplyDiscount ? Number(transactionDiscount || 0) : 0
  const transactionDiscountAmount = (totalAfterItemDiscounts * discountRate) / 100
  const totalDiscount = itemDiscounts + transactionDiscountAmount

  // Default Tax Rate 14%
  const defaultTaxRate = (taxRates as any[]).find((t) => t.is_default) || taxRates[0]
  const taxMultiplier = defaultTaxRate ? Number(defaultTaxRate.rate || 0) : 0.14
  const calculatedTax = (totalAfterItemDiscounts - transactionDiscountAmount) * taxMultiplier
  const finalTotal = Math.max(0, totalAfterItemDiscounts - transactionDiscountAmount + calculatedTax)

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
      overall_discount_percentage: transactionDiscount || 0,
      items: cart.map((item) => ({
        variant: item.variantId,
        quantity_sold: item.quantity,
        unit_price: item.price,
        item_discount_percentage: item.discount || 0,
      })),
      lines: cart.map((item) => ({
        product_variant: item.variantId,
        quantity: item.quantity,
        unit_price: item.price,
        discount_percentage: item.discount || 0,
      })),
    }

    try {
      const res = await createSalesTransaction(payload)
      if (soundEnabled) soundFx.playCheckoutSuccess()
      setReceiptTx(res)
      setCart([])
      setTransactionDiscount(0)
      loadInitialData()
    } catch (err: any) {
      if (soundEnabled) soundFx.playScanWarning()
      setError(err.message || 'Checkout failed. Please check stock levels.')
    } finally {
      setCompleting(false)
    }
  }

  const formatCurrency = (amount: number | string) => {
    const val = Number(amount) || 0
    return `${val.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} EGP`
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
              ? 'نقطة البيع السريعة، الدفع بالباركود و الـ SKU، وطباعة الإيصالات الحرارية الفورية'
              : 'Rapid barcode scanning checkout, instant VIP discounts & thermal receipt printing'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            title={soundEnabled ? 'كتم صوت الماسح' : 'تفعيل صوت الماسح'}
            className={`p-2 rounded-xl border transition ${
              soundEnabled
                ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                : 'bg-zinc-900 border-zinc-800 text-zinc-500'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Return & Refund Button */}
          {canAddSale && (
            <button
              onClick={() => setIsReturnModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 text-amber-400 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{language === 'ar' ? 'استرجاع بمسح الباركود' : 'Return / Refund'}</span>
            </button>
          )}

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
                          ? 'امسح الباركود بالمسدس أو اكتب SKU ثم اضغط Enter (F2 للتركيز)...'
                          : 'Scan barcode with gun or type SKU and press Enter (Press F2 to focus)...'
                      }
                      className="w-full ps-11 pe-24 py-3 bg-zinc-950/90 border border-amber-500/40 rounded-xl text-white placeholder-zinc-500 text-xs sm:text-sm font-mono focus:outline-none focus:ring-2 focus:ring-amber-400/50 shadow-inner"
                      disabled={isScanning}
                    />
                    <div className="absolute inset-y-0 end-0 flex items-center pe-2">
                      <button
                        type="submit"
                        disabled={isScanning || !barcodeInput.trim()}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-zinc-950 rounded-lg text-xs font-bold transition flex items-center gap-1"
                      >
                        <ScanLine className="w-3.5 h-3.5" />
                        <span>{language === 'ar' ? 'مسح' : 'Scan'}</span>
                      </button>
                    </div>
                  </div>
                </form>

                {scanToast && (
                  <div className="px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-1.5 animate-in fade-in">
                    <Check className="w-4 h-4" />
                    <span>{scanToast}</span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-3 bg-zinc-900/50 border border-zinc-800 rounded-xl flex items-center gap-2 text-zinc-400 text-xs">
              <Lock className="w-4 h-4 text-amber-400" />
              <span>{language === 'ar' ? 'وضع العرض فقط - لا تملك صلاحية إضافة فواتير بيع' : 'View Only Mode - No permission to create sales'}</span>
            </div>
          )}

          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError('')} className="text-zinc-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Main Grid: Catalog / Quick Pick & Live Cart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Catalog Grid */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                  <span>{language === 'ar' ? 'الكتالوج وسرعة الاختيار' : 'Product Catalog'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                    {products.length} {language === 'ar' ? 'منتج' : 'items'}
                  </span>
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {products.length === 0 ? (
                  <div className="col-span-2 p-8 text-center bg-zinc-900/20 border border-zinc-800 rounded-2xl text-zinc-500 text-xs">
                    {loading ? t('loading') : t('noData')}
                  </div>
                ) : (
                  products.map((product) => {
                    const mainVariant = product.variants?.[0]
                    const price = mainVariant?.effective_price || product.suggested_selling_price || 0
                    const stock = mainVariant?.stock_quantity ?? mainVariant?.current_quantity ?? product.current_quantity ?? 0

                    return (
                      <div
                        key={product.id}
                        className="p-3.5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] hover:border-amber-500/40 transition group flex flex-col justify-between"
                      >
                        <div className="space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80">
                                {product.brand_name || 'Generic'}
                              </span>
                              <h3 className="text-xs font-bold text-white group-hover:text-amber-400 transition line-clamp-1">
                                {product.model_name}
                              </h3>
                            </div>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold ${
                                stock <= 0
                                  ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                  : stock <= 5
                                  ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}
                            >
                              {stock} {language === 'ar' ? 'متاح' : 'in stock'}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                              {product.sku}
                            </span>
                            {mainVariant?.color && (
                              <span className="text-[10px] text-zinc-400 bg-zinc-900/60 px-1.5 py-0.5 rounded">
                                {mainVariant.color}
                              </span>
                            )}
                            {mainVariant?.size && (
                              <span className="text-[10px] text-zinc-400 bg-zinc-900/60 px-1.5 py-0.5 rounded">
                                {mainVariant.size}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                          <div className="font-bold text-sm text-white font-mono">
                            {formatCurrency(price)}
                          </div>
                          <div className="flex items-center gap-1.5">
                            {canPrintBarcode && (
                              <button
                                onClick={() => handleOpenLabelModal(product)}
                                title={language === 'ar' ? 'طباعة باركود للمنتج' : 'Print Barcode Label'}
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 border border-zinc-800 transition"
                              >
                                <Barcode className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => addToCart(product, 0)}
                              disabled={!canAddSale || (stock <= 0 && !(product as any).can_be_oversold)}
                              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500 border border-amber-500/30 text-amber-400 hover:text-zinc-950 text-xs font-bold transition flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Plus className="w-3.5 h-3.5" />
                              <span>{language === 'ar' ? 'إضافة' : 'Add'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Live Cart & Checkout Section */}
            <div className="lg:col-span-5 space-y-4">
              <div className="rounded-3xl bg-[#0c0c10] border border-[#1e1e26] p-5 shadow-2xl space-y-4 sticky top-6">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-amber-400" />
                    <h2 className="text-sm font-bold text-white">
                      {language === 'ar' ? 'سلة المشتريات' : 'Current Cart'}
                    </h2>
                    <span className="px-2 py-0.5 text-[10px] rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-bold">
                      {cart.reduce((s, i) => s + i.quantity, 0)} {language === 'ar' ? 'قطع' : 'items'}
                    </span>
                  </div>
                  {cart.length > 0 && (
                    <button
                      onClick={() => setCart([])}
                      className="text-xs text-red-400 hover:text-red-300 font-semibold transition"
                    >
                      {language === 'ar' ? 'تفريغ السلة' : 'Clear'}
                    </button>
                  )}
                </div>

                {/* Cart Items List */}
                <div className="space-y-2.5 max-h-72 overflow-y-auto pe-1">
                  {cart.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-zinc-800 rounded-2xl text-zinc-500 space-y-2">
                      <Barcode className="w-8 h-8 mx-auto text-zinc-600 opacity-50" />
                      <p className="text-xs">
                        {language === 'ar'
                          ? 'السلة فارغة. امسح الباركود أو اختر من الكتالوج'
                          : 'Cart is empty. Scan barcode or pick from catalog.'}
                      </p>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-3 group"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                            {item.brandName && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-zinc-900 text-zinc-400 rounded">
                                {item.brandName}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-500 font-mono flex items-center gap-1.5 mt-0.5">
                            <span>{item.sku}</span>
                            {item.color && <span>• {item.color}</span>}
                            {item.size && <span>• {item.size}</span>}
                          </div>
                          <div className="text-xs font-bold text-amber-400 font-mono mt-1">
                            {formatCurrency(item.price)}
                          </div>
                        </div>

                        {/* Qty Controls */}
                        <div className="flex items-center gap-2">
                          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                            <button
                              onClick={() => updateCartQty(idx, -1)}
                              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="w-6 text-center text-xs font-mono font-bold text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateCartQty(idx, 1)}
                              className="p-1 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(idx)}
                            className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Customer & Payment Setup */}
                <div className="space-y-3 pt-3 border-t border-zinc-800 text-xs">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        {t('customer')}
                      </label>
                      <select
                        value={selectedCustomer}
                        onChange={(e) => setSelectedCustomer(e.target.value)}
                        className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                      >
                        <option value="">{language === 'ar' ? 'عميل نقدي (Walk-in)' : 'Walk-in Customer'}</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} {c.phone ? `(${c.phone})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">
                        {t('paymentMethod')}
                      </label>
                      <select
                        value={selectedPaymentMethod}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                      >
                        {paymentMethods.map((pm) => (
                          <option key={pm.id} value={pm.id}>
                            {pm.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Transaction Discount (RBAC Protected) */}
                  {canApplyDiscount && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800/80">
                      <div className="flex items-center gap-1.5 text-zinc-400">
                        <Tag className="w-3.5 h-3.5 text-amber-400" />
                        <span>{language === 'ar' ? 'خصم إجمالي على الفاتورة (%)' : 'Invoice Discount (%)'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={transactionDiscount}
                          onChange={(e) => setTransactionDiscount(Number(e.target.value) || 0)}
                          className="w-16 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-end font-mono font-bold focus:outline-none focus:border-amber-400"
                        />
                        <span className="text-zinc-500 font-mono">%</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Summary */}
                <div className="space-y-1.5 pt-3 border-t border-zinc-800 font-mono text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>{language === 'ar' ? 'المجموع قبل الضريبة' : 'Subtotal'}</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  {totalDiscount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>{language === 'ar' ? 'إجمالي الخصومات' : 'Discount'}</span>
                      <span>-{formatCurrency(totalDiscount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-zinc-400">
                    <span>{language === 'ar' ? 'ضريبة القيمة المضافة (14%)' : 'VAT Tax (14%)'}</span>
                    <span>+{formatCurrency(calculatedTax)}</span>
                  </div>
                  <div className="flex justify-between text-base font-black text-white pt-2 border-t-2 border-zinc-800">
                    <span>{t('finalTotal')}</span>
                    <span className="text-amber-400">{formatCurrency(finalTotal)}</span>
                  </div>
                </div>

                {/* Checkout Submit Button */}
                <button
                  onClick={handleCheckout}
                  disabled={cart.length === 0 || completing || !canAddSale}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black rounded-2xl text-xs sm:text-sm transition shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
          <div className="rounded-3xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden shadow-xl">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <h2 className="text-sm font-bold text-white">{t('salesHistory')}</h2>
              {canExportCsv && (
                <a
                  href="/api/sales/transactions/export_csv/"
                  download
                  className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 flex items-center gap-1.5 transition"
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
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setReceiptTx(tx)}
                              className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-400 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                            >
                              <Receipt className="w-3.5 h-3.5" />
                              <span>{language === 'ar' ? 'عرض الفاتورة' : 'Receipt'}</span>
                            </button>
                            {canAddSale && (
                              <button
                                onClick={() => setIsReturnModalOpen(true)}
                                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-amber-400 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>{language === 'ar' ? 'إرجاع' : 'Return'}</span>
                              </button>
                            )}
                          </div>
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

      {/* Thermal POS Receipt Modal */}
      <ThermalReceiptModal
        isOpen={!!receiptTx}
        onClose={() => setReceiptTx(null)}
        transaction={receiptTx}
        storeInfo={storeInfo}
      />

      {/* Sales Return & Refund Modal */}
      <ReturnModal
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        transactions={transactions}
        onReturnSuccess={loadInitialData}
      />
    </div>
  )
}
