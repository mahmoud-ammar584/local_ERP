'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import {
  getStoreInfo,
  updateStoreInfo,
  getBrands,
  createBrand,
  getCategories,
  createCategory,
  getCurrencies,
  syncLiveExchangeRates,
  StoreInfo,
  Brand,
  Category,
  Currency,
} from '@/lib/api'
import { hasPermission } from '@/lib/auth'
import {
  Settings,
  Store,
  Tag,
  DollarSign,
  Plus,
  CheckCircle2,
  Lock,
  Receipt,
  Percent,
  RefreshCw,
  Globe,
  TrendingUp,
  ShieldCheck,
  Building,
  Coins,
  FileText,
} from 'lucide-react'

export default function SettingsPage() {
  const { t, language } = useLanguage()

  const canView = hasPermission('settings', 'view')
  const canEdit = hasPermission('settings', 'edit')
  const canManageTax = hasPermission('settings', 'manage_tax') || canEdit
  const canSyncRates = hasPermission('settings', 'sync_rates') || canEdit
  const canManageBrands = hasPermission('settings', 'manage_brands') || canEdit
  const canManageCategories = hasPermission('settings', 'manage_categories') || canEdit

  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    store_name: 'La Boutique Deluxe',
    legal_name: '',
    tax_registration_number: '',
    phone: '',
    address: '',
    base_currency_code: 'EGP',
    is_tax_enabled: true,
    tax_rate_percentage: 14,
  })
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [newBrand, setNewBrand] = useState('')
  const [newCategory, setNewCategory] = useState('')
  
  const [saving, setSaving] = useState(false)
  const [syncingRates, setSyncingRates] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  async function loadData() {
    try {
      const [si, b, c, curr] = await Promise.all([
        getStoreInfo(),
        getBrands(),
        getCategories(),
        getCurrencies(),
      ])
      if (si) setStoreInfo(si)
      setBrands(Array.isArray(b) ? b : (b as any).results || [])
      setCategories(Array.isArray(c) ? c : (c as any).results || [])
      setCurrencies(Array.isArray(curr) ? curr : (curr as any).results || [])
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    if (canView || canEdit || canManageTax || canSyncRates || canManageBrands || canManageCategories) {
      loadData()
    }
  }, [canView, canEdit, canManageTax, canSyncRates, canManageBrands, canManageCategories])

  const handleSaveStoreInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit && !canManageTax) {
      alert('ليس لديك صلاحية لتعديل إعدادات المتجر أو الضرائب')
      return
    }
    setSaving(true)
    try {
      const updated = await updateStoreInfo(storeInfo)
      if (updated) setStoreInfo(updated)
      showToast('تم حفظ إعدادات المتجر والضرائب بنجاح!')
    } catch (err: any) {
      alert(err.message || 'Failed to update store info')
    } finally {
      setSaving(false)
    }
  }

  const handleSyncExchangeRates = async () => {
    if (!canSyncRates) {
      alert('ليس لديك صلاحية لمزامنة أسعار الصرف')
      return
    }
    setSyncingRates(true)
    try {
      const res = await syncLiveExchangeRates()
      if (res.currencies) setCurrencies(res.currencies)
      showToast('تم تحديث أسعار الصرف الحية من البنك المركزي بنجاح!')
      loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to sync exchange rates')
    } finally {
      setSyncingRates(false)
    }
  }

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBrand.trim()) return
    if (!canManageBrands) {
      alert('ليس لديك صلاحية لإضافة ماركات جديدة')
      return
    }
    try {
      const b = await createBrand({ name: newBrand.trim() })
      setBrands((prev) => [...prev, b])
      setNewBrand('')
      showToast(`تمت إضافة ماركة (${b.name}) بنجاح!`)
    } catch (err: any) {
      alert(err.message || 'Failed to add brand')
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.trim()) return
    if (!canManageCategories) {
      alert('ليس لديك صلاحية لإضافة تصنيفات جديدة')
      return
    }
    try {
      const c = await createCategory({ name: newCategory.trim() })
      setCategories((prev) => [...prev, c])
      setNewCategory('')
      showToast(`تمت إضافة تصنيف (${c.name}) بنجاح!`)
    } catch (err: any) {
      alert(err.message || 'Failed to add category')
    }
  }

  if (!canView && !canEdit && !canManageTax && !canSyncRates && !canManageBrands && !canManageCategories) {
    return (
      <div className="p-8 rounded-2xl bg-[#0c0c10] border border-red-500/30 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">
          {language === 'ar' ? 'غير مصرح بالوصول إلى الإعدادات' : 'Access Restricted to Settings'}
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          {language === 'ar'
            ? 'يتطلب حسابك الحصول على صلاحية إدارة الإعدادات من قبل الإدارة.'
            : 'Your account does not have permission to view settings.'}
        </p>
      </div>
    )
  }

  // Live VAT calculation preview for 1,000 EGP sample sale
  const sampleAmount = 1000
  const isTaxActive = !!storeInfo.is_tax_enabled
  const taxPct = Number(storeInfo.tax_rate_percentage || 14)
  const sampleVat = isTaxActive ? (sampleAmount * taxPct) / 100 : 0
  const sampleTotal = sampleAmount + sampleVat

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 end-6 z-50 px-4 py-3 rounded-2xl bg-emerald-500 text-zinc-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Settings className="w-5 h-5 text-amber-400" />
            <span>إعدادات النظام والضرائب وأسعار الصرف</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'ar'
              ? 'البيانات الأساسية للمتجر، تفعيل أو إيقاف ضريبة القيمة المضافة (VAT)، وتحديث أسعار الصرف الحية'
              : 'Store identity, VAT tax controls, live currency exchange rate engine, brands and categories'}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Left Column: Store Identity & Tax Management */}
        <div className="space-y-6">
          {/* Card 1: Store & Legal Identity */}
          <div className="p-6 rounded-3xl bg-[#0c0c10] border border-[#1e1e26] space-y-4 shadow-xl">
            <div className="flex items-center gap-2.5 pb-3 border-b border-zinc-800">
              <Store className="w-5 h-5 text-amber-400" />
              <h2 className="text-sm font-bold text-white">بيانات المتجر والفرع</h2>
            </div>

            <form onSubmit={handleSaveStoreInfo} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">اسم المتجر التجاري *</label>
                <input
                  type="text"
                  required
                  value={storeInfo.store_name || ''}
                  onChange={(e) => setStoreInfo({ ...storeInfo, store_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">الاسم القانوني للشركة / المنشأة</label>
                <input
                  type="text"
                  value={storeInfo.legal_name || ''}
                  onChange={(e) => setStoreInfo({ ...storeInfo, legal_name: e.target.value })}
                  placeholder="e.g. La Boutique Deluxe S.A.E"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">رقم الهاتف</label>
                  <input
                    type="text"
                    value={storeInfo.phone || ''}
                    onChange={(e) => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">البريد الإلكتروني</label>
                  <input
                    type="email"
                    value={storeInfo.email || ''}
                    onChange={(e) => setStoreInfo({ ...storeInfo, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl text-xs text-white focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">العنوان والموقع</label>
                <input
                  type="text"
                  value={storeInfo.address || ''}
                  onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
                  placeholder="e.g. 90th St, Fifth Settlement, Cairo"
                  className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl text-xs text-white focus:outline-none"
                />
              </div>

              {canEdit && (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-zinc-950 font-bold rounded-xl text-xs shadow-lg transition"
                  >
                    {saving ? 'جاري الحفظ...' : 'حفظ بيانات المتجر'}
                  </button>
                </div>
              )}
            </form>
          </div>

          {/* Card 2: Dedicated Tax Management & VAT Configuration */}
          <div className="p-6 rounded-3xl bg-[#0c0c10] border border-amber-500/30 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Receipt className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-sm font-bold text-white">إدارة الضرائب والفاتورة الضريبية (VAT)</h2>
                  <p className="text-[11px] text-zinc-400">تفعيل أو إيقاف ضريبة القيمة المضافة ونسبتها</p>
                </div>
              </div>

              {/* Status Badge */}
              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                isTaxActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-zinc-800 border-zinc-700 text-zinc-400'
              }`}>
                {isTaxActive ? '● الضريبة مفعلة' : '○ الضريبة معطلة'}
              </span>
            </div>

            <form onSubmit={handleSaveStoreInfo} className="space-y-4">
              {/* Global VAT Toggle Switch */}
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-white block">حالة العمل بالضريبة على المبيعات</span>
                  <span className="text-[11px] text-zinc-400">
                    {isTaxActive
                      ? 'يتم احتساب الضريبة تلقائياً على كل فاتورة بيع وإظهارها للعميل'
                      : 'الضريبة معطلة (0%) ولن يتم احتساب أي ضريبة إضافية على المبيعات'}
                  </span>
                </div>

                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isTaxActive}
                    onChange={(e) => setStoreInfo({ ...storeInfo, is_tax_enabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    نسبة ضريبة القيمة المضافة (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max="100"
                      value={storeInfo.tax_rate_percentage ?? 14}
                      onChange={(e) =>
                        setStoreInfo({ ...storeInfo, tax_rate_percentage: Number(e.target.value) || 0 })
                      }
                      className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl text-xs font-mono font-bold text-white focus:outline-none"
                    />
                    <Percent className="w-3.5 h-3.5 text-zinc-500 absolute end-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">الرقم الضريبي للمنشأة</label>
                  <input
                    type="text"
                    value={storeInfo.tax_registration_number || ''}
                    onChange={(e) => setStoreInfo({ ...storeInfo, tax_registration_number: e.target.value })}
                    placeholder="e.g. 100-234-567"
                    className="w-full px-3.5 py-2.5 bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl text-xs font-mono text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Live VAT Simulator Box */}
              <div className="p-3.5 rounded-2xl bg-zinc-950/80 border border-zinc-800/80 space-y-2">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>معاينة احتساب الفاتورة (مثال مبيعات: 1,000 ج.م):</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span>المبلغ قبل الضريبة:</span>
                  <span className="font-mono">1,000 EGP</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-300">
                  <span>ضريبة القيمة المضافة ({isTaxActive ? `${taxPct}%` : 'معطلة'}):</span>
                  <span className="font-mono text-amber-400">+{sampleVat.toLocaleString()} EGP</span>
                </div>
                <div className="flex items-center justify-between text-xs font-bold text-white pt-1.5 border-t border-zinc-800">
                  <span>إجمالي الفاتورة النهائي:</span>
                  <span className="font-mono text-emerald-400 text-sm">{sampleTotal.toLocaleString()} EGP</span>
                </div>
              </div>

              {canEdit && (
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs shadow-lg transition flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>حفظ وتطبيق إعدادات الضريبة</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Live Exchange Rates Engine & Brands/Categories */}
        <div className="space-y-6">
          {/* Card 3: Live Currency Exchange Rate Engine */}
          <div className="p-6 rounded-3xl bg-[#0c0c10] border border-[#1e1e26] space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <Coins className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-sm font-bold text-white">العملة الأساسية وأسعار الصرف الحية</h2>
                  <p className="text-[11px] text-zinc-400">
                    العملة الأساسية: <span className="text-amber-400 font-bold font-mono">الجنيه المصري (EGP)</span> • تحديث آلي كل 4 ساعات
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleSyncExchangeRates}
                disabled={syncingRates}
                className="px-3.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-400/50 text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm self-start sm:self-auto disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingRates ? 'animate-spin' : ''}`} />
                <span>{syncingRates ? 'جاري التحديث...' : 'تحديث أسعار الصرف الحية الآن'}</span>
              </button>
            </div>

            {/* Currencies Grid */}
            <div className="space-y-2 max-h-72 overflow-y-auto pe-1">
              {currencies.map((curr) => {
                const isBase = curr.code === 'EGP'
                return (
                  <div
                    key={curr.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between gap-2 transition ${
                      isBase
                        ? 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-zinc-950 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono font-bold text-xs shrink-0 ${
                        isBase ? 'bg-amber-500 text-zinc-950' : 'bg-zinc-900 text-zinc-300'
                      }`}>
                        {curr.code}
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-xs text-white block truncate">{curr.name}</span>
                        <span className="text-[10px] text-zinc-400">
                          {isBase ? 'العملة الأساسية للمبيعات والمخزن' : `1 ${curr.code} = ${Number(curr.exchange_rate_to_base).toLocaleString()} ج.م`}
                        </span>
                      </div>
                    </div>

                    <div className="text-end shrink-0">
                      <span className="font-mono font-bold text-xs text-amber-400 block">
                        {Number(curr.exchange_rate_to_base).toFixed(2)} EGP
                      </span>
                      <span className="text-[10px] text-zinc-500">سعر التحويل</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Card 4: Brands & Categories Management */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Brands */}
            <div className="p-5 rounded-3xl bg-[#0c0c10] border border-[#1e1e26] space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                <Tag className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white">العلامات التجارية ({brands.length})</h3>
              </div>

              <form onSubmit={handleAddBrand} className="flex gap-2">
                <input
                  type="text"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder="ماركة جديدة..."
                  className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs"
                >
                  +
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-1">
                {brands.map((b) => (
                  <span
                    key={b.id}
                    className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 font-semibold"
                  >
                    {b.name}
                  </span>
                ))}
              </div>
            </div>

            {/* Categories */}
            <div className="p-5 rounded-3xl bg-[#0c0c10] border border-[#1e1e26] space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                <Building className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white">التصنيفات ({categories.length})</h3>
              </div>

              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="تصنيف جديد..."
                  className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs"
                >
                  +
                </button>
              </form>

              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto pt-1">
                {categories.map((c) => (
                  <span
                    key={c.id}
                    className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-300 font-semibold"
                  >
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
