'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'
import {
  getProducts,
  createProduct,
  adjustProductStock,
  getBrands,
  getCategories,
  getSuppliers,
  getCurrencies,
  uploadProductImage,
  Product,
  ProductVariant,
  Brand,
  Category,
  Supplier,
  Currency,
} from '@/lib/api'
import { hasPermission } from '@/lib/auth'
import { BarcodeDisplay } from '@/components/BarcodeDisplay'
import { BarcodeLabelModal, LabelProductData } from '@/components/BarcodeLabelModal'
import {
  Shirt,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Package,
  Layers,
  X,
  Tag,
  ClipboardCheck,
  Sparkles,
  Barcode,
  ArrowUpRight,
  Lock,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Upload,
  Trash2,
  Copy,
  Check,
  Eye,
  Sliders,
  Maximize2,
} from 'lucide-react'

interface ColorEntry {
  id: string
  name: string
  imageUrl: string
  imageFile?: File
  uploading?: boolean
}

interface VariantMatrixRow {
  color: string
  size: string
  gender: string
  sku_suffix: string
  barcode: string
  current_quantity: number
  price_override?: number
  image_url: string
}

export default function InventoryPage() {
  const { t, language } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Expanded Product IDs
  const [expandedProductIds, setExpandedProductIds] = useState<Record<number, boolean>>({})

  // Granular Permissions
  const canView = hasPermission('inventory', 'view')
  const canAdd = hasPermission('inventory', 'add')
  const canAdjust = hasPermission('inventory', 'adjust_stock')
  const canPrintBarcode = hasPermission('inventory', 'print_barcode')
  const canViewStocktake = hasPermission('inventory', 'stocktake_view') || hasPermission('inventory', 'stocktake_count')

  // Metadata for creating products
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<{ id: number; name: string; currentQty: number } | null>(null)
  const [newQty, setNewQty] = useState<number>(0)
  const [adjustReason, setAdjustReason] = useState('Manual Stock Count')

  // Barcode Label Modal State
  const [labelProduct, setLabelProduct] = useState<LabelProductData | null>(null)
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false)

  // Fullscreen Image Preview
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  // Copied SKU feedback
  const [copiedSku, setCopiedSku] = useState<string | null>(null)

  // Matrix Creation Form State
  const [form, setForm] = useState({
    sku: 'GC-POLO-01',
    barcode: '',
    model_name: '',
    brand: '',
    category: '',
    supplier: '',
    currency: '',
    season: 'SS25',
    cost_foreign: 0,
    suggested_selling_price: 0,
    profit_margin_percentage: 0,
    min_alert_quantity: 3,
  })

  const [colorsList, setColorsList] = useState<ColorEntry[]>([
    { id: '1', name: 'Black', imageUrl: '' },
    { id: '2', name: 'White', imageUrl: '' },
  ])
  const [newColorInput, setNewColorInput] = useState('')

  const [sizesList, setSizesList] = useState<string[]>(['S', 'M', 'L', 'XL'])
  const [newSizeInput, setNewSizeInput] = useState('')

  const [matrixRows, setMatrixRows] = useState<VariantMatrixRow[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})

  async function loadInventory() {
    setLoading(true)
    try {
      const data = await getProducts(search ? `search=${encodeURIComponent(search)}` : '')
      const list = Array.isArray(data) ? data : data.results || []
      setProducts(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadMetadata() {
    try {
      const [b, c, s, curr] = await Promise.all([
        getBrands(),
        getCategories(),
        getSuppliers(),
        getCurrencies(),
      ])
      const bList = Array.isArray(b) ? b : (b as any).results || []
      const cList = Array.isArray(c) ? c : (c as any).results || []
      const sList = Array.isArray(s) ? s : (s as any).results || []
      const currList = Array.isArray(curr) ? curr : (curr as any).results || []

      setBrands(bList)
      setCategories(cList)
      setSuppliers(sList)
      setCurrencies(currList)

      if (bList.length > 0 && !form.brand) setForm((f) => ({ ...f, brand: String(bList[0].id) }))
      if (cList.length > 0 && !form.category) setForm((f) => ({ ...f, category: String(cList[0].id) }))
      if (sList.length > 0 && !form.supplier) setForm((f) => ({ ...f, supplier: String(sList[0].id) }))
      if (currList.length > 0 && !form.currency) setForm((f) => ({ ...f, currency: String(currList[0].id) }))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (canView) {
      loadInventory()
      loadMetadata()
    } else {
      setLoading(false)
    }
  }, [canView])

  // Recalculate matrix rows whenever base SKU, colors, or sizes change
  useEffect(() => {
    const rows: VariantMatrixRow[] = []
    const baseSku = form.sku.trim() || 'PROD'

    colorsList.forEach((c) => {
      const colorCode = c.name.trim().substring(0, 3).toUpperCase() || 'STD'
      sizesList.forEach((s) => {
        const sizeCode = s.trim().toUpperCase() || 'STD'
        const suffix = `-${colorCode}-${sizeCode}`

        // Keep existing quantity or default to 0
        const existing = matrixRows.find((r) => r.color === c.name && r.size === s)
        rows.push({
          color: c.name,
          size: s,
          gender: 'U',
          sku_suffix: suffix,
          barcode: existing?.barcode || '',
          current_quantity: existing ? existing.current_quantity : 5,
          price_override: existing?.price_override,
          image_url: c.imageUrl || '',
        })
      })
    })
    setMatrixRows(rows)
  }, [colorsList, sizesList, form.sku])

  if (!canView) {
    return (
      <div className="p-8 rounded-2xl bg-[#0c0c10] border border-red-500/30 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">
          {language === 'ar' ? 'غير مصرح بالوصول إلى المخزون والمنتجات' : 'Access Restricted to Inventory'}
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          {language === 'ar'
            ? 'يتطلب حسابك الحصول على صلاحية عرض المخزون والمنتجات من قبل الإدارة.'
            : 'Your account does not have permission to view inventory and products.'}
        </p>
      </div>
    )
  }

  const toggleExpand = (id: number) => {
    setExpandedProductIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadInventory()
  }

  const handleCopySku = (skuText: string) => {
    navigator.clipboard.writeText(skuText)
    setCopiedSku(skuText)
    setTimeout(() => setCopiedSku(null), 2000)
  }

  // Auto Generate SKU helper
  const handleGenerateSku = () => {
    const selectedBrand = brands.find((b) => String(b.id) === String(form.brand))
    const brandPrefix = selectedBrand
      ? selectedBrand.name.substring(0, 3).toUpperCase()
      : 'LUX'
    const randomNum = Math.floor(1000 + Math.random() * 9000)
    const generatedSku = `${brandPrefix}-${randomNum}`
    setForm((f) => ({
      ...f,
      sku: generatedSku,
      barcode: f.barcode || String(Math.floor(100000000000 + Math.random() * 900000000000)),
    }))
  }

  // Color & Image Upload Management
  const handleAddColor = () => {
    if (!newColorInput.trim()) return
    const name = newColorInput.trim()
    if (colorsList.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      alert('هذا اللون موجود بالفعل')
      return
    }
    setColorsList((prev) => [...prev, { id: String(Date.now()), name, imageUrl: '' }])
    setNewColorInput('')
  }

  const handleRemoveColor = (id: string) => {
    if (colorsList.length <= 1) {
      alert('يجب أن يحتوي المنتج على لون واحد على الأقل')
      return
    }
    setColorsList((prev) => prev.filter((c) => c.id !== id))
  }

  const handleColorImageUpload = async (colorId: string, file: File) => {
    setColorsList((prev) =>
      prev.map((c) => (c.id === colorId ? { ...c, uploading: true } : c))
    )
    try {
      const res = await uploadProductImage(file)
      setColorsList((prev) =>
        prev.map((c) => (c.id === colorId ? { ...c, imageUrl: res.url, uploading: false } : c))
      )
    } catch (err: any) {
      alert(err.message || 'Failed to upload and compress image')
      setColorsList((prev) =>
        prev.map((c) => (c.id === colorId ? { ...c, uploading: false } : c))
      )
    }
  }

  // Size Preset Handlers
  const handleAddSize = () => {
    if (!newSizeInput.trim()) return
    const size = newSizeInput.trim().toUpperCase()
    if (sizesList.includes(size)) return
    setSizesList((prev) => [...prev, size])
    setNewSizeInput('')
  }

  const handleRemoveSize = (size: string) => {
    if (sizesList.length <= 1) {
      alert('يجب أن يحتوي المنتج على مقاس واحد على الأقل')
      return
    }
    setSizesList((prev) => prev.filter((s) => s !== size))
  }

  const applySizePreset = (preset: 'clothes' | 'shoes' | 'onesize') => {
    if (preset === 'clothes') setSizesList(['S', 'M', 'L', 'XL', 'XXL'])
    if (preset === 'shoes') setSizesList(['39', '40', '41', '42', '43', '44'])
    if (preset === 'onesize') setSizesList(['Standard'])
  }

  // Create Product Submit
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canAdd) {
      alert('ليس لديك صلاحية لإضافة منتجات جديدة')
      return
    }
    setFormError('')
    setSaving(true)

    // Prepare variants payload
    const variantsPayload = matrixRows.map((row) => ({
      color: row.color,
      size: row.size,
      gender: row.gender,
      sku_suffix: row.sku_suffix,
      barcode: row.barcode || undefined,
      current_quantity: Number(row.current_quantity) || 0,
      price_override: row.price_override ? Number(row.price_override) : undefined,
      image_url: row.image_url || undefined,
    }))

    try {
      await createProduct({
        sku: form.sku.trim(),
        barcode: form.barcode.trim() || undefined,
        model_name: form.model_name.trim(),
        brand: Number(form.brand) || undefined,
        category: Number(form.category) || undefined,
        supplier: Number(form.supplier) || undefined,
        currency: Number(form.currency) || undefined,
        season: form.season,
        cost_foreign: Number(form.cost_foreign),
        suggested_selling_price: Number(form.suggested_selling_price),
        min_alert_quantity: Number(form.min_alert_quantity),
        variants: variantsPayload,
      })
      setIsAddModalOpen(false)
      loadInventory()
    } catch (err: any) {
      setFormError(err.message || 'Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedVariant) return
    if (!canAdjust) {
      alert('ليس لديك صلاحية لتعديل الأرصدة المخزنية يدوياً')
      return
    }
    setSaving(true)
    try {
      await adjustProductStock(selectedVariant.id, newQty, adjustReason)
      setIsAdjustModalOpen(false)
      loadInventory()
    } catch (err: any) {
      alert(err.message || 'Failed to adjust stock')
    } finally {
      setSaving(false)
    }
  }

  const handlePrintLabel = (product: Product, variant?: ProductVariant) => {
    if (!canPrintBarcode) {
      alert('ليس لديك صلاحية لطباعة ملصقات الباركود')
      return
    }
    const v = variant || product.variants?.[0]
    setLabelProduct({
      model_name: product.model_name,
      brand_name: product.brand_name,
      color: v?.color,
      size: v?.size,
      sku: v?.full_sku || v?.sku_suffix || product.sku,
      barcode: v?.barcode || product.barcode,
      price: v?.effective_price || product.suggested_selling_price,
      current_quantity: v?.stock_quantity ?? product.current_quantity,
    })
    setIsLabelModalOpen(true)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shirt className="w-5 h-5 text-amber-400" />
            <span>{t('productsTitle')}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'ar'
              ? 'إدارة مصفوفة الألوان والمقاسات، صور كل لون عالية الجودة، وأرصدة الـ SKU الفرعية بدقة'
              : 'Product matrix catalog, color-specific compressed photos, and variant SKU stock control'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canViewStocktake && (
            <Link
              href="/inventory/stocktake"
              className="px-3.5 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-amber-500/30 text-amber-400 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>{t('navStocktake')}</span>
            </Link>
          )}

          {canAdd && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{t('addProduct')} (مصفوفة ألوان ومقاسات)</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-zinc-500 absolute top-3 start-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'ar' ? 'بحث بالـ SKU الكامل، كود اللون/المقاس، الباركود، أو اسم الموديل...' : 'Search by Full SKU, Variant suffix, Barcode, or Model Name...'}
            className="w-full ps-9 pe-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500"
          />
        </form>

        <button
          onClick={loadInventory}
          className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-xs font-semibold text-zinc-300 flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>{language === 'ar' ? 'تحديث' : 'Refresh'}</span>
        </button>
      </div>

      {/* Products Table with Expandable Variant Matrix */}
      <div className="rounded-2xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/70 text-zinc-400">
                <th className="p-4 text-start w-10"></th>
                <th className="p-4 text-start">{t('sku')} الأساسي</th>
                <th className="p-4 text-start">{t('modelName')} والماركة</th>
                <th className="p-4 text-start">الألوان المتوفرة</th>
                <th className="p-4 text-end">{t('sellingPrice')}</th>
                <th className="p-4 text-center">إجمالي الرصيد</th>
                <th className="p-4 text-end">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    {loading ? t('loading') : t('noData')}
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isExpanded = !!expandedProductIds[p.id]
                  const variants = p.variants || []
                  const totalStock = p.total_stock ?? variants.reduce((acc, v) => acc + (v.stock_quantity ?? v.current_quantity ?? 0), 0)

                  return (
                    <React.Fragment key={p.id}>
                      {/* Parent Product Row */}
                      <tr className={`hover:bg-zinc-900/40 transition cursor-pointer ${isExpanded ? 'bg-zinc-900/30' : ''}`}>
                        <td className="p-4 text-center" onClick={() => toggleExpand(p.id)}>
                          <button className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>

                        <td className="p-4 font-mono font-bold text-amber-400" onClick={() => toggleExpand(p.id)}>
                          <div className="flex items-center gap-2">
                            <span>{p.sku}</span>
                            {p.barcode && (
                              <span className="text-[10px] text-zinc-500 font-normal">({p.barcode})</span>
                            )}
                          </div>
                        </td>

                        <td className="p-4" onClick={() => toggleExpand(p.id)}>
                          <div className="font-semibold text-white text-sm">{p.model_name}</div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            <span className="text-amber-400/90 font-medium">{p.brand_name || '—'}</span>
                            <span>•</span>
                            <span>{p.category_name || '—'}</span>
                          </div>
                        </td>

                        {/* Colors Preview Badges */}
                        <td className="p-4" onClick={() => toggleExpand(p.id)}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {p.colors && p.colors.length > 0 ? (
                              p.colors.map((c, idx) => (
                                <div
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300"
                                >
                                  {c.image_url ? (
                                    <img
                                      src={c.image_url}
                                      alt={c.color}
                                      className="w-4 h-4 rounded object-cover border border-zinc-700 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setPreviewImageUrl(c.image_url || null)
                                      }}
                                    />
                                  ) : (
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/40" />
                                  )}
                                  <span>{c.color}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-zinc-500 text-[11px]">—</span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-end font-bold text-white font-mono" onClick={() => toggleExpand(p.id)}>
                          {Number(p.suggested_selling_price || 0).toLocaleString()} EGP
                        </td>

                        <td className="p-4 text-center" onClick={() => toggleExpand(p.id)}>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold font-mono text-xs border ${
                            totalStock > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}>
                            <Package className="w-3.5 h-3.5" />
                            <span>{totalStock} قطعة</span>
                          </div>
                        </td>

                        <td className="p-4 text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            {canPrintBarcode && (
                              <button
                                onClick={() => handlePrintLabel(p)}
                                title={t('printBarcode')}
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 hover:border-amber-400/40 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1"
                              >
                                <Tag className="w-3 h-3" />
                                <span>طباعة باركود</span>
                              </button>
                            )}

                            <button
                              onClick={() => toggleExpand(p.id)}
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] font-semibold transition"
                            >
                              {isExpanded ? 'طي التفاصيل' : `المتغيرات (${variants.length})`}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Nested Variant Breakdown Matrix Accordion */}
                      {isExpanded && (
                        <tr className="bg-zinc-950/90 border-b border-zinc-800">
                          <td colSpan={7} className="p-4 ps-12">
                            <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-amber-400 flex items-center gap-2">
                                  <Layers className="w-4 h-4" />
                                  <span>مصفوفة المتغيرات الفرعية ({p.model_name})</span>
                                </h4>
                                <span className="text-[11px] text-zinc-400">
                                  {variants.length} تركيبة ألوان ومقاسات
                                </span>
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-zinc-800 text-zinc-400 text-[10px] uppercase">
                                      <th className="py-2 text-start">صورة اللون</th>
                                      <th className="py-2 text-start">اللون</th>
                                      <th className="py-2 text-start">المقاس</th>
                                      <th className="py-2 text-start">الـ SKU الكامل (Variant SKU)</th>
                                      <th className="py-2 text-start">الباركود</th>
                                      <th className="py-2 text-end">السعر</th>
                                      <th className="py-2 text-center">الرصيد المتاح</th>
                                      <th className="py-2 text-end">الإجراءات</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-800/50">
                                    {variants.map((v) => {
                                      const variantQty = v.stock_quantity ?? v.current_quantity ?? 0
                                      const fullSku = v.full_sku || `${p.sku}${v.sku_suffix}`
                                      const imgUrl = v.effective_image_url || v.image_url

                                      return (
                                        <tr key={v.id} className="hover:bg-zinc-800/40 transition">
                                          {/* Variant Photo Thumbnail */}
                                          <td className="py-2">
                                            {imgUrl ? (
                                              <div
                                                className="relative group w-9 h-9 rounded-lg overflow-hidden border border-zinc-700 bg-zinc-950 cursor-pointer"
                                                onClick={() => setPreviewImageUrl(imgUrl)}
                                              >
                                                <img src={imgUrl} alt={v.color} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                                  <Eye className="w-3.5 h-3.5 text-white" />
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="w-9 h-9 rounded-lg border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600 bg-zinc-950">
                                                <ImageIcon className="w-4 h-4" />
                                              </div>
                                            )}
                                          </td>

                                          <td className="py-2">
                                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 font-medium">
                                              {v.color}
                                            </span>
                                          </td>

                                          <td className="py-2">
                                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono font-bold border border-amber-500/20">
                                              {v.size}
                                            </span>
                                          </td>

                                          <td className="py-2 font-mono font-bold text-zinc-200">
                                            <div className="flex items-center gap-1.5">
                                              <span>{fullSku}</span>
                                              <button
                                                onClick={() => handleCopySku(fullSku)}
                                                className="text-zinc-500 hover:text-amber-400 transition"
                                                title="نسخ الـ SKU"
                                              >
                                                {copiedSku === fullSku ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                              </button>
                                            </div>
                                          </td>

                                          <td className="py-2 font-mono text-zinc-400">
                                            {v.barcode || '—'}
                                          </td>

                                          <td className="py-2 text-end font-mono font-bold text-white">
                                            {Number(v.effective_price || p.suggested_selling_price || 0).toLocaleString()} EGP
                                          </td>

                                          <td className="py-2 text-center">
                                            <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                                              variantQty > (p.min_alert_quantity || 2)
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                : variantQty > 0
                                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                : 'bg-red-500/15 text-red-400 border border-red-500/30'
                                            }`}>
                                              {variantQty} قطعة
                                            </span>
                                          </td>

                                          <td className="py-2 text-end">
                                            <div className="flex items-center justify-end gap-1.5">
                                              {canPrintBarcode && (
                                                <button
                                                  onClick={() => handlePrintLabel(p, v)}
                                                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 transition"
                                                  title="طباعة باركود هذا المقاس واللون"
                                                >
                                                  <Tag className="w-3.5 h-3.5" />
                                                </button>
                                              )}

                                              {canAdjust && (
                                                <button
                                                  onClick={() => {
                                                    setSelectedVariant({
                                                      id: v.id,
                                                      name: `${p.model_name} — ${v.color} / ${v.size} (${fullSku})`,
                                                      currentQty: variantQty,
                                                    })
                                                    setNewQty(variantQty)
                                                    setIsAdjustModalOpen(true)
                                                  }}
                                                  className="px-2 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-semibold transition"
                                                >
                                                  تعديل الرصيد
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Visual Fashion Matrix Add Product */}
      {isAddModalOpen && canAdd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-[#0c0c10] border border-zinc-800 rounded-3xl p-6 shadow-2xl my-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">إضافة منتج فاخر مع مصفوفة الألوان والمقاسات</h2>
                  <p className="text-[11px] text-zinc-400">صنف رئيسي واحد مع توليد آلي لكافة الـ SKUs الفرعية وصور كل لون</p>
                </div>
              </div>
              <button onClick={() => setIsAddModalOpen(false)} className="text-zinc-400 hover:text-white p-1 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-6">
              {/* Step 1: Base Product Information */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-4">
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">1. البيانات الأساسية والتسعير</h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('brand')}</label>
                    <select
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="">اختر الماركة</option>
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('category')}</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="">اختر القسم</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('supplier')}</label>
                    <select
                      value={form.supplier}
                      onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      <option value="">اختر المورد</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('modelName')}</label>
                    <input
                      type="text"
                      value={form.model_name}
                      onChange={(e) => setForm({ ...form, model_name: e.target.value })}
                      required
                      placeholder="مثال: Cotton Oversized T-Shirt"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-zinc-300">{t('sku')} الأساسي (Base SKU)</label>
                      <button
                        type="button"
                        onClick={handleGenerateSku}
                        className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>توليد تلقائي</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value })}
                      required
                      placeholder="مثال: GC-TSH-01"
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">عملة الشراء</label>
                    <select
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      required
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      {currencies.map((c) => (
                        <option key={c.id} value={c.id}>{c.code} ({c.name})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">تكلفة الشراء بالعملة</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.cost_foreign}
                      onChange={(e) => setForm({ ...form, cost_foreign: Number(e.target.value) })}
                      required
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">سعر البيع المقترح (EGP)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.suggested_selling_price}
                      onChange={(e) => setForm({ ...form, suggested_selling_price: Number(e.target.value) })}
                      required
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">حد تنبيه النواقص</label>
                    <input
                      type="number"
                      value={form.min_alert_quantity}
                      onChange={(e) => setForm({ ...form, min_alert_quantity: Number(e.target.value) })}
                      required
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Step 2: Colors Management with Image Compression */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">2. ألوان الصنف و صور كل لون (مضغوطة تلقائياً WebP)</h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">ارفع صورة لكل لون لتظهر تلقائياً في المخزن ونقطة البيع عند اختياره</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={newColorInput}
                    onChange={(e) => setNewColorInput(e.target.value)}
                    placeholder="أدخل لون جديد (مثال: أسود، أزرق، كحلي)..."
                    className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400 min-w-[220px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddColor()
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddColor}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-amber-400 font-bold text-xs rounded-xl transition flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>إضافة لون</span>
                  </button>
                </div>

                {/* Color Cards with Image Uploader */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  {colorsList.map((color) => (
                    <div
                      key={color.id}
                      className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between gap-3 relative"
                    >
                      <div className="flex items-center gap-2.5">
                        {/* Hidden input */}
                        <input
                          type="file"
                          accept="image/*"
                          ref={(el) => { fileInputRefs.current[color.id] = el }}
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleColorImageUpload(color.id, file)
                          }}
                        />

                        {/* Image button */}
                        <div
                          onClick={() => fileInputRefs.current[color.id]?.click()}
                          className="w-12 h-12 rounded-xl border border-dashed border-zinc-700 hover:border-amber-400 bg-zinc-950 flex flex-col items-center justify-center cursor-pointer transition overflow-hidden shrink-0 group relative"
                          title="رفع صورة لهذا اللون"
                        >
                          {color.uploading ? (
                            <RefreshCw className="w-4 h-4 text-amber-400 animate-spin" />
                          ) : color.imageUrl ? (
                            <>
                              <img src={color.imageUrl} alt={color.name} className="w-full h-full object-cover" />
                              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                                <Upload className="w-3.5 h-3.5 text-white" />
                              </div>
                            </>
                          ) : (
                            <Upload className="w-4 h-4 text-zinc-500 group-hover:text-amber-400" />
                          )}
                        </div>

                        <div>
                          <span className="text-xs font-bold text-white block">{color.name}</span>
                          <span className="text-[10px] text-zinc-500">
                            {color.imageUrl ? 'تم ضغط الصورة (WebP)' : 'انقر لرفع صورة'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveColor(color.id)}
                        className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Sizes Management */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">3. المقاسات وتوزيع الأرصدة</h3>
                  <div className="flex items-center gap-1.5 text-[11px]">
                    <span className="text-zinc-500">قوالب سريعة:</span>
                    <button
                      type="button"
                      onClick={() => applySizePreset('clothes')}
                      className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-amber-400 transition"
                    >
                      ملابس (S, M, L, XL, XXL)
                    </button>
                    <button
                      type="button"
                      onClick={() => applySizePreset('shoes')}
                      className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-amber-400 transition"
                    >
                      أحذية (39-44)
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {sizesList.map((sz) => (
                    <div
                      key={sz}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white font-mono"
                    >
                      <span>{sz}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSize(sz)}
                        className="text-zinc-500 hover:text-red-400"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}

                  <div className="inline-flex items-center gap-1">
                    <input
                      type="text"
                      value={newSizeInput}
                      onChange={(e) => setNewSizeInput(e.target.value)}
                      placeholder="مقاس جديد..."
                      className="w-24 px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-mono"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault()
                          handleAddSize()
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddSize}
                      className="p-1 rounded-lg bg-zinc-800 text-amber-400"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Step 4: Generated Variant Matrix Grid */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                      4. مصفوفة الـ SKUs والكميات المولدة آلياً ({matrixRows.length} متغير)
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      كل متغير له SKU فريد، ورصيد منفصل، ويمكن تمييزه مباشرة في البيع والجرد
                    </p>
                  </div>
                </div>

                <div className="max-h-64 overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-zinc-950 border-b border-zinc-800 text-zinc-400 text-[10px]">
                      <tr>
                        <th className="py-2 px-3 text-start">اللون</th>
                        <th className="py-2 px-3 text-start">المقاس</th>
                        <th className="py-2 px-3 text-start">الـ SKU الكامل (Full SKU)</th>
                        <th className="py-2 px-3 text-center">الكمية الابتدائية بالمخزن</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/40">
                      {matrixRows.map((row, idx) => (
                        <tr key={idx} className="hover:bg-zinc-800/30">
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-200">{row.color}</span>
                          </td>
                          <td className="py-2 px-3">
                            <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono font-bold">
                              {row.size}
                            </span>
                          </td>
                          <td className="py-2 px-3 font-mono font-bold text-zinc-300">
                            {form.sku.trim()}{row.sku_suffix}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <input
                              type="number"
                              min="0"
                              value={row.current_quantity}
                              onChange={(e) => {
                                const val = Number(e.target.value) || 0
                                setMatrixRows((prev) =>
                                  prev.map((r, i) => (i === idx ? { ...r, current_quantity: val } : r))
                                )
                              }}
                              className="w-20 px-2 py-1 bg-zinc-950 border border-zinc-700 rounded-lg text-xs font-mono text-center text-white focus:outline-none focus:border-amber-400"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 text-xs font-bold shadow-lg shadow-amber-500/20 transition flex items-center gap-2"
                >
                  {saving && <RefreshCw className="w-4 h-4 animate-spin" />}
                  <span>حفظ المنتج ومصفوفة المقاسات ({matrixRows.length})</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust Single Variant Stock */}
      {isAdjustModalOpen && canAdjust && selectedVariant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c0c10] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <span>تعديل رصيد المتغير يدوياً</span>
              </h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-zinc-300 bg-zinc-950 p-3 rounded-xl border border-zinc-800">
              <span className="text-zinc-500 block">الصنف والمتغير:</span>
              <span className="font-bold text-white">{selectedVariant.name}</span>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">الرصيد الفعلي الجديد</label>
                <input
                  type="number"
                  min="0"
                  value={newQty}
                  onChange={(e) => setNewQty(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">سبب التعديل</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="مثال: جرد يدوي، تسوية هالك، تصحيح إدخال"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition"
                >
                  {saving ? 'جارٍ التحديث...' : 'تحديث الرصيد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Fullscreen Image Preview */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="max-w-2xl max-h-[85vh] bg-zinc-950 p-2 rounded-2xl border border-zinc-800 shadow-2xl relative">
            <img src={previewImageUrl} alt="Preview" className="max-h-[80vh] w-auto rounded-xl object-contain" />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-4 end-4 p-2 bg-black/70 hover:bg-black text-white rounded-full transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Barcode Label Print Modal */}
      {isLabelModalOpen && labelProduct && (
        <BarcodeLabelModal
          isOpen={isLabelModalOpen}
          onClose={() => setIsLabelModalOpen(false)}
          product={labelProduct}
        />
      )}
    </div>
  )
}
