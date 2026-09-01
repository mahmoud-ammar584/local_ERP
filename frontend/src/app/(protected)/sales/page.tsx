'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/lib/i18n'
import {
  getProducts,
  getCustomers,
  createCustomer,
  getPaymentMethods,
  getTaxRates,
  getSalesTransactions,
  createSalesTransaction,
  lookupProductBySku,
  getStoreInfo,
  Product,
  ProductVariant,
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
  UserPlus,
  Phone,
  User,
  ChevronDown,
  Layers,
  Image as ImageIcon,
  CheckCircle,
  Shirt,
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
  imageUrl?: string
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

  // Customer Search & Quick Add State
  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [isCustomerDropdownOpen, setIsCustomerDropdownOpen] = useState(false)
  const [isQuickCustomerModalOpen, setIsQuickCustomerModalOpen] = useState(false)
  const [quickCustomerName, setQuickCustomerName] = useState('')
  const [quickCustomerPhone, setQuickCustomerPhone] = useState('')
  const [quickCustomerEmail, setQuickCustomerEmail] = useState('')
  const [quickCustomerAddress, setQuickCustomerAddress] = useState('')
  const [savingQuickCustomer, setSavingQuickCustomer] = useState(false)

  // Fast Barcode Scanner input & UI
  const [barcodeInput, setBarcodeInput] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanToast, setScanToast] = useState<string | null>(null)
  const [soundEnabled, setSoundEnabled] = useState(true)
  const scannerInputRef = useRef<HTMLInputElement>(null)

  // Variant Matrix Modal State (for products with multiple colors/sizes)
  const [variantModalProduct, setVariantModalProduct] = useState<Product | null>(null)
  const [selectedColorForModal, setSelectedColorForModal] = useState<string>('')

  // History State
  const [transactions, setTransactions] = useState<SalesTransaction[]>([])
  const [receiptTx, setReceiptTx] = useState<any>(null)
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)

  // Barcode Label Modal State
  const [labelModalProduct, setLabelModalProduct] = useState<LabelProductData | null>(null)
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false)

  const [loading, setLoading] = useState(true)
  const [completing, setCompleting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadInitialData()
  }, [])

  // Auto focus scanner input
  useEffect(() => {
    if (activeTab === 'pos' && canAddSale) {
      scannerInputRef.current?.focus()
    }
  }, [activeTab, canAddSale])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F2: Focus Barcode Scanner
      if (e.key === 'F2') {
        e.preventDefault()
        scannerInputRef.current?.focus()
      }
      // F9: Complete Sale
      if (e.key === 'F9' && cart.length > 0 && !completing && canAddSale) {
        e.preventDefault()
        handleCheckout()
      }
      // Escape: Close dropdown or modal
      if (e.key === 'Escape') {
        setIsCustomerDropdownOpen(false)
        setIsQuickCustomerModalOpen(false)
        setVariantModalProduct(null)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart, completing, canAddSale])

  async function loadInitialData() {
    setLoading(true)
    try {
      const [prods, custs, pms, taxes, txs, sInfo] = await Promise.all([
        getProducts(),
        getCustomers(),
        getPaymentMethods(),
        getTaxRates(),
        getSalesTransactions(),
        getStoreInfo().catch(() => null),
      ])

      const prodList = Array.isArray(prods) ? prods : (prods as any).results || []
      const custList = Array.isArray(custs) ? custs : (custs as any).results || []
      const pmList = Array.isArray(pms) ? pms : (pms as any).results || []
      const taxList = Array.isArray(taxes) ? taxes : (taxes as any).results || []
      const txList = Array.isArray(txs) ? txs : (txs as any).results || []

      setProducts(prodList)
      setCustomers(custList)
      setPaymentMethods(pmList)
      setTaxRates(taxList)
      setTransactions(txList)
      setStoreInfo(sInfo)

      const defPm = pmList.find((p: any) => p.is_default) || pmList[0]
      if (defPm) setSelectedPaymentMethod(String(defPm.id))
    } catch (err: any) {
      setError(err.message || 'Failed to load initial data')
    } finally {
      setLoading(false)
    }
  }

  // Add specific variant to cart
  const addVariantToCart = (product: Product, variant: ProductVariant) => {
    if (!canAddSale) {
      alert('ليس لديك صلاحية لإتمام عمليات البيع')
      return
    }
    const variantId = variant.id
    const variantSku = variant.full_sku || `${product.sku}${variant.sku_suffix}`
    const availableStock = variant.stock_quantity ?? variant.current_quantity ?? 999
    const price = Number(variant.effective_price || product.suggested_selling_price || 0)
    const imageUrl = variant.effective_image_url || variant.image_url || product.primary_image_url || product.image_url

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
          color: variant.color,
          size: variant.size,
          imageUrl: imageUrl,
        },
      ])
    }

    if (soundEnabled) soundFx.playScanSuccess()
    setScanToast(`+1 ${product.model_name} (${variant.color} / ${variant.size})`)
    setTimeout(() => setScanToast(null), 2500)
    setVariantModalProduct(null)
  }

  // Handle Product Card click in Catalog
  const handleProductCardClick = (product: Product) => {
    const variants = product.variants || []
    if (variants.length === 1) {
      // Direct add
      addVariantToCart(product, variants[0])
    } else if (variants.length > 1) {
      // Open Variant Selector Modal
      setVariantModalProduct(product)
      setSelectedColorForModal(variants[0].color || '')
    } else {
      // Fallback
      addToCartLegacy(product)
    }
  }

  const addToCartLegacy = (product: Product) => {
    const mainVariant = product.variants?.[0]
    const variantId = mainVariant ? mainVariant.id : product.id
    const variantSku = mainVariant?.full_sku || mainVariant?.sku_suffix || product.sku
    const price = Number(mainVariant?.effective_price || product.suggested_selling_price || 0)

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
          maxStock: product.current_quantity ?? 999,
          brandName: product.brand_name,
          color: mainVariant?.color,
          size: mainVariant?.size,
          imageUrl: product.primary_image_url || product.image_url,
        },
      ])
    }
    if (soundEnabled) soundFx.playScanSuccess()
  }

  // Barcode / SKU Gun Rapid Scanner Handler
  const handleBarcodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canAddSale) {
      alert('ليس لديك صلاحية لإتمام عمليات البيع')
      return
    }
    const code = barcodeInput.trim()
    if (!code) return

    setError('')
    setIsScanning(true)

    try {
      // 1. Check if exact SKU/variant is already in cart
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
      const result = await lookupProductBySku(code)
      if (result) {
        if (result.is_exact_variant) {
          // Exact single variant matched
          const variantSku = result.full_sku || result.sku_suffix || code
          const unitPrice = Number(result.effective_price || result.suggested_selling_price || 0)
          const maxStock = result.stock_quantity ?? result.current_quantity ?? 999
          const imgUrl = result.effective_image_url || result.image_url

          setCart((prev) => [
            ...prev,
            {
              productId: result.product || result.id,
              variantId: result.id,
              sku: variantSku,
              name: result.model_name || 'Product',
              price: unitPrice,
              quantity: 1,
              discount: 0,
              maxStock: maxStock,
              brandName: result.brand_name,
              color: result.color,
              size: result.size,
              imageUrl: imgUrl,
            },
          ])

          if (soundEnabled) soundFx.playScanSuccess()
          setScanToast(`+1 ${result.model_name || 'Item'} (${result.color} / ${result.size})`)
          setTimeout(() => setScanToast(null), 2500)
          setBarcodeInput('')
        } else {
          // Base SKU matched -> open variant selector modal
          const prod = products.find((p) => String(p.id) === String(result.product || result.id)) || {
            id: result.product || result.id,
            sku: result.full_sku || code,
            model_name: result.model_name,
            brand_name: result.brand_name,
            suggested_selling_price: Number(result.effective_price || 0),
            variants: result.all_variants || [],
          } as any

          setVariantModalProduct(prod)
          if (prod.variants && prod.variants.length > 0) {
            setSelectedColorForModal(prod.variants[0].color || '')
          }
          setBarcodeInput('')
        }
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
  const subtotal = cart.reduce((acc, item) => acc + item.price * item.quantity, 0)
  const itemDiscounts = cart.reduce(
    (acc, item) => acc + item.price * item.quantity * (item.discount / 100),
    0
  )
  const totalAfterItemDiscounts = subtotal - itemDiscounts
  const discountRate = canApplyDiscount ? Number(transactionDiscount || 0) : 0
  const transactionDiscountAmount = (totalAfterItemDiscounts * discountRate) / 100
  const totalDiscount = itemDiscounts + transactionDiscountAmount

  const isTaxActive = storeInfo?.is_tax_enabled !== false
  const defaultTaxRate = (taxRates as any[]).find((t) => t.is_default) || taxRates[0]
  const configuredTaxPct = storeInfo?.tax_rate_percentage != null ? Number(storeInfo.tax_rate_percentage) : (defaultTaxRate ? Number(defaultTaxRate.rate || 0.14) * 100 : 14)
  const taxMultiplier = isTaxActive ? (configuredTaxPct / 100) : 0
  const calculatedTax = (totalAfterItemDiscounts - transactionDiscountAmount) * taxMultiplier
  const finalTotal = Math.max(0, totalAfterItemDiscounts - transactionDiscountAmount + calculatedTax)

  // Customer Filter & Quick Create
  const selectedCustomerObj = customers.find((c) => String(c.id) === String(selectedCustomer))
  const filteredCustomers = customers.filter((c) => {
    if (!customerSearchQuery.trim()) return true
    const q = customerSearchQuery.toLowerCase().trim()
    return c.name?.toLowerCase().includes(q) || c.phone?.toLowerCase().includes(q)
  })

  const handleQuickCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickCustomerName.trim()) return
    setSavingQuickCustomer(true)
    try {
      const newCust = await createCustomer({
        name: quickCustomerName.trim(),
        phone: quickCustomerPhone.trim() || undefined,
        email: quickCustomerEmail.trim() || undefined,
        address: quickCustomerAddress.trim() || undefined,
      })
      setCustomers((prev) => [newCust, ...prev])
      setSelectedCustomer(String(newCust.id))
      setCustomerSearchQuery('')
      setIsQuickCustomerModalOpen(false)
      setQuickCustomerName('')
      setQuickCustomerPhone('')
      setQuickCustomerEmail('')
      setQuickCustomerAddress('')
      if (soundEnabled) soundFx.playScanSuccess()
    } catch (err: any) {
      alert(err.message || 'Failed to create customer')
    } finally {
      setSavingQuickCustomer(false)
    }
  }

  // Handle Checkout Submission
  const handleCheckout = async () => {
    if (!canAddSale) {
      alert('ليس لديك صلاحية لإتمام عمليات البيع')
      return
    }
    if (cart.length === 0) return
    setError('')
    setCompleting(true)

    const defaultPaymentMethod = paymentMethods.find((p) => p.is_default) || paymentMethods[0]
    const chosenMethodId = selectedPaymentMethod ? Number(selectedPaymentMethod) : defaultPaymentMethod?.id

    if (!chosenMethodId) {
      setError('Please configure at least one payment method.')
      setCompleting(false)
      return
    }

    const payload = {
      customer: selectedCustomer && selectedCustomer !== '0' ? Number(selectedCustomer) : undefined,
      payment_method: chosenMethodId,
      overall_discount_percentage: transactionDiscount || 0,
      items: cart.map((item) => ({
        variant: item.variantId,
        quantity_sold: item.quantity,
        unit_price: item.price,
        item_discount_percentage: item.discount || 0,
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
              ? 'نقطة البيع السريعة، مسح باركود الـ SKU الفرعي للون والمقاس، وطباعة الإيصالات الفورية'
              : 'Rapid barcode scanning checkout with exact color/size SKU variants and instant receipt printing'}
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
          {/* Quick Barcode Scanner Bar */}
          {canAddSale ? (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 via-zinc-900 to-zinc-900 border border-amber-500/30 shadow-lg relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <form onSubmit={handleBarcodeSubmit} className="flex-1 flex items-center gap-2 relative">
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
                          ? 'امسح الـ SKU الفرعي أو الباركود بالمسدس ثم اضغط Enter (F2 للتركيز)...'
                          : 'Scan exact variant SKU or barcode with gun (Press F2 to focus)...'
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
              <span>{language === 'ar' ? 'وضع العرض فقط - لا تملك صلاحية إضافة فواتير بيع' : 'View Only Mode'}</span>
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

          {/* Main Grid: Catalog Quick Pick & Live Cart */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Catalog Grid */}
            <div className="lg:col-span-7 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold text-zinc-300 flex items-center gap-2">
                  <span>{language === 'ar' ? 'كتالوج الأصناف السريع' : 'Product Catalog'}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                    {products.length} {language === 'ar' ? 'صنف' : 'items'}
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
                    const variants = product.variants || []
                    const price = product.suggested_selling_price || variants[0]?.effective_price || 0
                    const totalStock = product.total_stock ?? variants.reduce((acc, v) => acc + (v.stock_quantity ?? v.current_quantity ?? 0), 0)
                    const thumbUrl = product.primary_image_url || product.image_url || variants[0]?.effective_image_url

                    return (
                      <div
                        key={product.id}
                        onClick={() => handleProductCardClick(product)}
                        className="p-3.5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] hover:border-amber-500/50 hover:bg-zinc-900/30 transition group flex flex-col justify-between cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          {/* Image Thumbnail */}
                          {thumbUrl ? (
                            <img
                              src={thumbUrl}
                              alt={product.model_name}
                              className="w-12 h-12 rounded-xl object-cover border border-zinc-800 shrink-0 group-hover:scale-105 transition"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 shrink-0">
                              <Shirt className="w-5 h-5" />
                            </div>
                          )}

                          <div className="space-y-1 min-w-0 flex-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400/80 block truncate">
                              {product.brand_name || 'Brand'}
                            </span>
                            <h3 className="text-xs font-bold text-white group-hover:text-amber-400 transition truncate">
                              {product.model_name}
                            </h3>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-zinc-800">
                                {product.sku}
                              </span>
                              {variants.length > 1 && (
                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 font-bold border border-amber-500/20">
                                  {variants.length} خيارات
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="mt-3 pt-3 border-t border-zinc-800/60 flex items-center justify-between">
                          <div className="font-bold text-sm text-white font-mono">
                            {formatCurrency(price)}
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono font-bold ${
                              totalStock <= 0
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                : totalStock <= 5
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {totalStock} متاح
                            </span>
                            <button
                              type="button"
                              className="p-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 transition"
                            >
                              <Plus className="w-3.5 h-3.5" />
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
                      {language === 'ar' ? 'سلة الفاتورة الحالية' : 'Current Cart'}
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
                          ? 'السلة فارغة. امسح الـ SKU أو اختر من الكتالوج'
                          : 'Cart is empty. Scan barcode or pick from catalog.'}
                      </p>
                    </div>
                  ) : (
                    cart.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-3 group"
                      >
                        {/* Thumbnail Image */}
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-10 h-10 rounded-lg object-cover border border-zinc-800 shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 shrink-0">
                            <Shirt className="w-4 h-4" />
                          </div>
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold text-white truncate">{item.name}</h4>
                            {item.brandName && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-zinc-900 text-zinc-400 rounded">
                                {item.brandName}
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-400 font-mono flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-amber-400/90 font-bold">{item.sku}</span>
                            {item.color && <span className="bg-zinc-900 px-1 rounded">{item.color}</span>}
                            {item.size && <span className="bg-amber-500/10 text-amber-300 px-1 rounded font-bold">{item.size}</span>}
                          </div>
                          <div className="text-xs font-bold text-white font-mono mt-1">
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
                <div className="space-y-3 pt-3 border-t border-zinc-800">
                  <div className="grid grid-cols-2 gap-2">
                    {/* Customer Selector */}
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] text-zinc-400 flex items-center gap-1">
                          <User className="w-3 h-3 text-amber-400" />
                          <span>{t('customer')}</span>
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsQuickCustomerModalOpen(true)}
                          className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                        >
                          <UserPlus className="w-2.5 h-2.5" />
                          <span>{language === 'ar' ? '+ عميل' : '+ New'}</span>
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => setIsCustomerDropdownOpen(!isCustomerDropdownOpen)}
                        className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-start flex items-center justify-between text-white"
                      >
                        <span className="truncate">
                          {selectedCustomerObj ? selectedCustomerObj.name : (language === 'ar' ? 'عميل نقدي (Walk-in)' : 'Walk-in')}
                        </span>
                        <ChevronDown className="w-3 h-3 text-zinc-400" />
                      </button>

                      {isCustomerDropdownOpen && (
                        <div className="absolute z-30 start-0 top-full mt-1 w-full max-h-52 overflow-y-auto rounded-xl bg-zinc-950 border border-zinc-800 shadow-2xl p-1.5 space-y-1">
                          <input
                            type="text"
                            placeholder="بحث بالاسم أو الهاتف..."
                            value={customerSearchQuery}
                            onChange={(e) => setCustomerSearchQuery(e.target.value)}
                            className="w-full px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none"
                            autoFocus
                          />
                          <div
                            onClick={() => {
                              setSelectedCustomer('')
                              setIsCustomerDropdownOpen(false)
                            }}
                            className="px-2 py-1.5 rounded hover:bg-zinc-900 cursor-pointer text-xs text-zinc-300 flex items-center justify-between"
                          >
                            <span>عميل نقدي (Walk-in)</span>
                            {!selectedCustomer && <Check className="w-3 h-3 text-amber-400" />}
                          </div>
                          {filteredCustomers.map((c) => (
                            <div
                              key={c.id}
                              onClick={() => {
                                setSelectedCustomer(String(c.id))
                                setIsCustomerDropdownOpen(false)
                              }}
                              className="px-2 py-1.5 rounded hover:bg-zinc-900 cursor-pointer text-xs text-zinc-300 flex items-center justify-between"
                            >
                              <div>
                                <span className="font-bold text-white block">{c.name}</span>
                                {c.phone && <span className="text-[10px] text-zinc-500">{c.phone}</span>}
                              </div>
                              {selectedCustomer === String(c.id) && <Check className="w-3 h-3 text-amber-400" />}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Payment Method */}
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">{t('paymentMethod')}</label>
                      <select
                        value={selectedPaymentMethod}
                        onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                        className="w-full px-2.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
                      >
                        {paymentMethods.map((pm) => (
                          <option key={pm.id} value={pm.id}>{pm.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Transaction Discount */}
                  {canApplyDiscount && (
                    <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-950 border border-zinc-800/80">
                      <div className="flex items-center gap-1.5 text-zinc-400 text-xs">
                        <Tag className="w-3.5 h-3.5 text-amber-400" />
                        <span>{language === 'ar' ? 'خصم إجمالي (%)' : 'Discount (%)'}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={transactionDiscount}
                          onChange={(e) => setTransactionDiscount(Number(e.target.value) || 0)}
                          className="w-16 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-white text-end font-mono font-bold focus:outline-none focus:border-amber-400 text-xs"
                        />
                        <span className="text-zinc-500 font-mono text-xs">%</span>
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
                    <th className="p-4 text-start">الكاشير / المستخدم</th>
                    <th className="p-4 text-start">{t('paymentMethod')}</th>
                    <th className="p-4 text-end">{t('finalTotal')}</th>
                    <th className="p-4 text-end">{t('date')}</th>
                    <th className="p-4 text-end">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-500">
                        {loading ? t('loading') : t('noData')}
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-zinc-900/30">
                        <td className="p-4 font-mono font-bold text-amber-400">#{tx.id}</td>
                        <td className="p-4 text-white font-semibold">{tx.customer_name || 'Walk-in Customer'}</td>
                        <td className="p-4 font-mono font-bold text-zinc-300">
                          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">
                            {tx.created_by_username || tx.created_by_name || currentUser?.username || 'Staff'}
                          </span>
                        </td>
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

      {/* Interactive Variant Selection Matrix Modal for POS */}
      {variantModalProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-[#0c0c10] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{variantModalProduct.model_name}</h3>
                  <p className="text-[11px] text-zinc-400">
                    {variantModalProduct.brand_name} • {variantModalProduct.sku}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setVariantModalProduct(null)}
                className="p-1 text-zinc-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Colors Switcher */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-300 block">1. اختر اللون:</label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {Array.from(new Set((variantModalProduct.variants || []).map((v) => v.color))).map((colName) => {
                  const matchingVariant = (variantModalProduct.variants || []).find((v) => v.color === colName)
                  const imgUrl = matchingVariant?.effective_image_url || matchingVariant?.image_url || variantModalProduct.primary_image_url
                  const isSelected = selectedColorForModal === colName

                  return (
                    <button
                      key={colName}
                      type="button"
                      onClick={() => setSelectedColorForModal(colName)}
                      className={`p-2.5 rounded-2xl border flex items-center gap-2.5 transition text-start ${
                        isSelected
                          ? 'bg-amber-500/15 border-amber-400 text-white shadow-md'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-300 hover:border-zinc-700'
                      }`}
                    >
                      {imgUrl ? (
                        <img src={imgUrl} alt={colName} className="w-8 h-8 rounded-lg object-cover border border-zinc-700 shrink-0" />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center shrink-0">
                          <Shirt className="w-4 h-4 text-amber-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-xs font-bold block truncate">{colName}</span>
                        <span className="text-[10px] text-zinc-500 block">انقر للتحديد</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Sizes for Selected Color */}
            <div className="space-y-2 pt-2">
              <label className="text-xs font-bold text-zinc-300 block">
                2. اختر المقاس لإضافته للسلة فوراً:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {(variantModalProduct.variants || [])
                  .filter((v) => !selectedColorForModal || v.color === selectedColorForModal)
                  .map((variant) => {
                    const qty = variant.stock_quantity ?? variant.current_quantity ?? 0
                    const fullSku = variant.full_sku || `${variantModalProduct.sku}${variant.sku_suffix}`

                    return (
                      <button
                        key={variant.id}
                        type="button"
                        disabled={qty <= 0 && !(variantModalProduct as any).can_be_oversold}
                        onClick={() => addVariantToCart(variantModalProduct, variant)}
                        className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800 hover:border-amber-400 hover:bg-zinc-900 transition flex flex-col items-center justify-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed group shadow-sm"
                      >
                        <span className="text-sm font-black text-amber-400 font-mono group-hover:scale-110 transition">
                          {variant.size}
                        </span>
                        <span className="text-[10px] text-zinc-400 font-mono">
                          {fullSku}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          qty > 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {qty > 0 ? `${qty} متاح` : 'نفد الرصيد'}
                        </span>
                      </button>
                    )
                  })}
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setVariantModalProduct(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
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

      {/* Quick Add Customer Modal */}
      {isQuickCustomerModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c0c10] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">إضافة عميل جديد سريعاً</h3>
                  <p className="text-[11px] text-zinc-400">تسجيل العميل وإدراجه في الفاتورة الحالية فوراً</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickCustomerModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCreateCustomer} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">اسم العميل *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickCustomerName}
                  onChange={(e) => setQuickCustomerName(e.target.value)}
                  placeholder="مثال: سارة أحمد"
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-amber-400" />
                  <span>رقم الهاتف</span>
                </label>
                <input
                  type="tel"
                  value={quickCustomerPhone}
                  onChange={(e) => setQuickCustomerPhone(e.target.value)}
                  placeholder="010XXXXXXXX"
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCustomerModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingQuickCustomer || !quickCustomerName.trim()}
                  className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {savingQuickCustomer ? t('loading') : 'حفظ واختيار العميل'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
