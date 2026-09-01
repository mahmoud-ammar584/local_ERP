'use client'

import React, { useState, useEffect } from 'react'
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
  Product,
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
  SlidersHorizontal,
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
} from 'lucide-react'

export default function InventoryPage() {
  const { t, language } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

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

  // New Product Form State
  const [form, setForm] = useState({
    sku: 'FNL-GG-01',
    barcode: '',
    model_name: '',
    brand: '',
    category: '',
    supplier: '',
    currency: '',
    season: 'SS25',
    cost_foreign: 0,
    suggested_selling_price: 0,
    min_alert_quantity: 2,
    variants: [
      { color: 'Black', size: 'M', sku_suffix: '-BLK-M', barcode: '' },
      { color: 'Black', size: 'L', sku_suffix: '-BLK-L', barcode: '' },
    ],
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

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
      setBrands(Array.isArray(b) ? b : (b as any).results || [])
      setCategories(Array.isArray(c) ? c : (c as any).results || [])
      setSuppliers(Array.isArray(s) ? s : (s as any).results || [])
      setCurrencies(Array.isArray(curr) ? curr : (curr as any).results || [])
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

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    loadInventory()
  }

  // Auto Generate SKU helper
  const handleGenerateSku = () => {
    const selectedBrand = brands.find((b) => String(b.id) === String(form.brand))
    const brandPrefix = selectedBrand
      ? selectedBrand.name.substring(0, 3).toUpperCase()
      : 'FNL'
    const randomNum = Math.floor(100000 + Math.random() * 900000)
    const generatedSku = `${brandPrefix}-${randomNum}`
    setForm((f) => ({
      ...f,
      sku: generatedSku,
      barcode: f.barcode || String(randomNum) + String(Math.floor(1000 + Math.random() * 9000)),
    }))
  }

  const handleAddVariantRow = () => {
    setForm((f) => ({
      ...f,
      variants: [
        ...f.variants,
        {
          color: 'White',
          size: 'M',
          sku_suffix: `-WHT-M-${f.variants.length + 1}`,
          barcode: '',
        },
      ],
    }))
  }

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canAdd) {
      alert('ليس لديك صلاحية لإضافة منتجات جديدة')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      await createProduct({
        sku: form.sku,
        barcode: form.barcode || undefined,
        model_name: form.model_name,
        brand: Number(form.brand) || undefined,
        category: Number(form.category) || undefined,
        supplier: Number(form.supplier) || undefined,
        currency: Number(form.currency) || undefined,
        season: form.season,
        cost_foreign: Number(form.cost_foreign),
        suggested_selling_price: Number(form.suggested_selling_price),
        min_alert_quantity: Number(form.min_alert_quantity),
        variants: form.variants as any,
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

  const handlePrintLabel = (product: Product, variantIndex = 0) => {
    if (!canPrintBarcode) {
      alert('ليس لديك صلاحية لطباعة ملصقات الباركود')
      return
    }
    const v = product.variants?.[variantIndex]
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
              ? 'إدارة الموديلات والمقاسات والألوان ومولد الباركود ومتابعة الأرصدة'
              : 'Manage fashion collections, sizes, colors, barcode tags and inventory levels'}
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
              <span>{t('addProduct')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Stocktake Feature Announcement Banner */}
      {canViewStocktake && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-zinc-900 to-zinc-950 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <ClipboardCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white flex items-center gap-2">
                <span>{language === 'ar' ? 'موديول الجرد المخزني الآلي بالماسح الضوئي' : 'Physical Barcode Stocktake Module'}</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-400/20 text-amber-300 font-bold">New</span>
              </h3>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                {language === 'ar'
                  ? 'امسح القطع بالسكانر وقارن فورياً مع رصيد النظام الفعلي واكشف العجز والزيادة وأثر التكلفة.'
                  : 'Scan physical items with scanner gun, detect deficit/surplus, and reconcile stock with 1-click.'}
              </p>
            </div>
          </div>

          <Link
            href="/inventory/stocktake"
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shrink-0 self-start sm:self-auto shadow-md"
          >
            <span>{language === 'ar' ? 'بدء الجرد الآن' : 'Open Stocktake Hub'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] flex flex-col sm:flex-row items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full relative">
          <Search className="w-4 h-4 text-zinc-500 absolute top-3 start-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'ar' ? 'بحث بكود SKU أو الباركود أو اسم الموديل...' : 'Search by SKU, Barcode, or Model Name...'}
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

      {/* Products Table */}
      <div className="rounded-2xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
                <th className="p-4 text-start">{t('sku')}</th>
                <th className="p-4 text-start">{t('modelName')}</th>
                <th className="p-4 text-start">{t('brand')}</th>
                <th className="p-4 text-start">{t('category')}</th>
                <th className="p-4 text-end">{t('sellingPrice')}</th>
                <th className="p-4 text-center">{t('stockQuantity')}</th>
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
                  const totalStock = p.variants?.reduce(
                    (acc, v) => acc + (v.stock_quantity ?? v.current_quantity ?? 0),
                    0
                  ) ?? (p.current_quantity ?? 0)

                  return (
                    <tr key={p.id} className="hover:bg-zinc-900/30 transition">
                      <td className="p-4 font-mono font-bold text-amber-400">
                        <div className="flex items-center gap-1.5">
                          <span>{p.sku}</span>
                          {p.barcode && (
                            <span className="text-[10px] text-zinc-500 font-normal">
                              ({p.barcode})
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 font-semibold text-white">{p.model_name}</td>
                      <td className="p-4 text-zinc-400">{p.brand_name || '—'}</td>
                      <td className="p-4 text-zinc-400">{p.category_name || '—'}</td>
                      <td className="p-4 text-end font-bold text-white">
                        {p.suggested_selling_price} EGP
                      </td>
                      <td className="p-4 text-center">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 font-bold text-zinc-200">
                          <Package className="w-3.5 h-3.5 text-amber-400" />
                          <span>{totalStock}</span>
                        </div>
                      </td>
                      <td className="p-4 text-end">
                        <div className="flex items-center justify-end gap-1.5">
                          {canPrintBarcode && (
                            <button
                              onClick={() => handlePrintLabel(p, 0)}
                              title={t('printBarcode')}
                              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 hover:border-amber-400/40 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1"
                            >
                              <Tag className="w-3 h-3" />
                              <span>{t('printBarcode')}</span>
                            </button>
                          )}

                          {canAdjust && p.variants && p.variants.length > 0 && (
                            <button
                              onClick={() => {
                                const v = p.variants[0]
                                const qty = v.stock_quantity ?? v.current_quantity ?? 0
                                setSelectedVariant({
                                  id: v.id,
                                  name: `${p.model_name} (${v.color || ''} - ${v.size || ''})`,
                                  currentQty: qty,
                                })
                                setNewQty(qty)
                                setIsAdjustModalOpen(true)
                              }}
                              className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[11px] font-semibold transition"
                            >
                              {t('adjustStock')}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Product with Live Barcode Generator */}
      {isAddModalOpen && canAdd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0c0c10] border border-zinc-800 rounded-2xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-6">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>{t('addProduct')}</span>
              </h2>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateProduct} className="space-y-4">
              {/* Barcode Generator Preview Card */}
              <div className="p-4 bg-zinc-950 border border-zinc-800/80 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                    {language === 'ar' ? 'معاينة الباركود المتولد تلقائياً' : 'Live Barcode Generator'}
                  </span>
                  <p className="text-xs text-white font-mono mt-0.5">
                    {form.sku || 'SAMPLE-SKU'}
                  </p>
                </div>

                <div className="bg-white p-2 rounded-lg flex items-center justify-center">
                  <BarcodeDisplay
                    value={form.sku || 'SAMPLE-SKU'}
                    width={1.2}
                    height={32}
                    showText={false}
                    barColor="#000000"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateSku}
                  className="px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 text-xs font-bold rounded-lg transition flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{t('generateSku')}</span>
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('sku')}</label>
                  <input
                    type="text"
                    value={form.sku}
                    onChange={(e) => setForm({ ...form, sku: e.target.value })}
                    required
                    placeholder="e.g. FNL-DRS-01"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('barcode')} (Optional EAN/UPC)</label>
                  <input
                    type="text"
                    value={form.barcode}
                    onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                    placeholder="e.g. 622104928102"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('modelName')}</label>
                <input
                  type="text"
                  value={form.model_name}
                  onChange={(e) => setForm({ ...form, model_name: e.target.value })}
                  required
                  placeholder="e.g. Silk Evening Gown"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('brand')}</label>
                  <select
                    value={form.brand}
                    onChange={(e) => setForm({ ...form, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="">Select Brand</option>
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
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="">Select Category</option>
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
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('cost')} (Foreign)</label>
                  <input
                    type="number"
                    value={form.cost_foreign}
                    onChange={(e) => setForm({ ...form, cost_foreign: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('sellingPrice')} (EGP)</label>
                  <input
                    type="number"
                    value={form.suggested_selling_price}
                    onChange={(e) => setForm({ ...form, suggested_selling_price: Number(e.target.value) })}
                    required
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Variants Section */}
              <div className="pt-4 border-t border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-zinc-200 flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-amber-400" />
                    <span>Product Variants (Colors & Sizes)</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleAddVariantRow}
                    className="text-[11px] font-semibold text-amber-400 hover:underline"
                  >
                    + Add Variant
                  </button>
                </div>

                <div className="space-y-2">
                  {form.variants.map((v, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2 p-2 bg-zinc-950 rounded-lg border border-zinc-800/80">
                      <input
                        type="text"
                        value={v.color}
                        onChange={(e) => {
                          const updated = [...form.variants]
                          updated[i].color = e.target.value
                          setForm({ ...form, variants: updated })
                        }}
                        placeholder="Color (e.g. Navy)"
                        className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white"
                      />
                      <input
                        type="text"
                        value={v.size}
                        onChange={(e) => {
                          const updated = [...form.variants]
                          updated[i].size = e.target.value
                          setForm({ ...form, variants: updated })
                        }}
                        placeholder="Size (e.g. XL)"
                        className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white"
                      />
                      <input
                        type="text"
                        value={v.sku_suffix}
                        onChange={(e) => {
                          const updated = [...form.variants]
                          updated[i].sku_suffix = e.target.value
                          setForm({ ...form, variants: updated })
                        }}
                        placeholder="SKU Suffix (e.g. -NVY-XL)"
                        className="px-2.5 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs text-white font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition"
                >
                  {saving ? t('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Adjust Stock */}
      {isAdjustModalOpen && selectedVariant && canAdjust && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c0c10] border border-zinc-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-4">
              <h2 className="text-sm font-bold text-white">{t('adjustStock')}</h2>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <span className="text-xs text-zinc-400 font-medium">Selected Item:</span>
                <p className="text-sm font-bold text-amber-400 mt-0.5">{selectedVariant.name}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('stockQuantity')}</label>
                <input
                  type="number"
                  value={newQty}
                  onChange={(e) => setNewQty(Number(e.target.value))}
                  required
                  min={0}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-sm text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('reason')}</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition"
                >
                  {saving ? t('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Label Modal */}
      {canPrintBarcode && (
        <BarcodeLabelModal
          isOpen={isLabelModalOpen}
          onClose={() => setIsLabelModalOpen(false)}
          product={labelProduct}
        />
      )}
    </div>
  )
}
