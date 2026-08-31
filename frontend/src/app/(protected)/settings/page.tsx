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
  StoreInfo,
  Brand,
  Category,
  Currency,
} from '@/lib/api'
import { hasPermission } from '@/lib/auth'
import { Settings, Store, Tag, DollarSign, Plus, CheckCircle2, Lock } from 'lucide-react'

export default function SettingsPage() {
  const { t, language } = useLanguage()

  const canView = hasPermission('settings', 'view')
  const canEdit = hasPermission('settings', 'edit')

  const [storeInfo, setStoreInfo] = useState<StoreInfo>({
    store_name: 'La Boutique Deluxe',
    legal_name: '',
    tax_registration_number: '',
    phone: '',
    address: '',
    base_currency: 'EGP',
  })
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [newBrand, setNewBrand] = useState('')
  const [newCategory, setNewCategory] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

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
    if (canView) {
      loadData()
    }
  }, [canView])

  const handleSaveStoreInfo = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canEdit) {
      alert('ليس لديك صلاحية لتعديل إعدادات المتجر')
      return
    }
    setSaving(true)
    setSavedSuccess(false)
    try {
      await updateStoreInfo(storeInfo)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    } catch (err: any) {
      alert(err.message || 'Failed to update store info')
    } finally {
      setSaving(false)
    }
  }

  const handleAddBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBrand.trim()) return
    if (!canEdit) {
      alert('ليس لديك صلاحية لإضافة ماركات جديدة')
      return
    }
    try {
      await createBrand({ name: newBrand })
      setNewBrand('')
      loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to add brand')
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.trim()) return
    if (!canEdit) {
      alert('ليس لديك صلاحية لإضافة تصنيفات جديدة')
      return
    }
    try {
      await createCategory({ name: newCategory })
      setNewCategory('')
      loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to add category')
    }
  }

  if (!canView) {
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
            ? 'يتطلب حسابك الحصول على صلاحية عرض الإعدادات من قبل الإدارة.'
            : 'Your account does not have permission to view store settings.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-400" />
          <span>{t('settingsTitle')}</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          {language === 'ar'
            ? 'البيانات الأساسية للمتجر، أسعار الصرف، والماركات والتصنيفات'
            : 'Store metadata, brand catalogs, exchange rates and master classifications'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Store Info */}
        <div className="p-6 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] space-y-5">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Store className="w-4 h-4 text-amber-400" />
            <span>{language === 'ar' ? 'بيانات المتجر والفرع' : 'Store Information'}</span>
          </h2>

          <form onSubmit={handleSaveStoreInfo} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('storeName')}</label>
              <input
                type="text"
                disabled={!canEdit}
                value={storeInfo.store_name}
                onChange={(e) => setStoreInfo({ ...storeInfo, store_name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('legalName')}</label>
              <input
                type="text"
                disabled={!canEdit}
                value={storeInfo.legal_name}
                onChange={(e) => setStoreInfo({ ...storeInfo, legal_name: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('taxNumber')}</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={storeInfo.tax_registration_number}
                  onChange={(e) => setStoreInfo({ ...storeInfo, tax_registration_number: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-60"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('phone')}</label>
                <input
                  type="text"
                  disabled={!canEdit}
                  value={storeInfo.phone}
                  onChange={(e) => setStoreInfo({ ...storeInfo, phone: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-60"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('address')}</label>
              <input
                type="text"
                disabled={!canEdit}
                value={storeInfo.address}
                onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-60"
              />
            </div>

            {canEdit && (
              <div className="flex items-center justify-between pt-2">
                {savedSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Saved successfully</span>
                  </span>
                )}
                <button
                  type="submit"
                  disabled={saving}
                  className="ms-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition"
                >
                  {saving ? t('loading') : t('save')}
                </button>
              </div>
            )}
          </form>
        </div>

        {/* Master Classifications (Brands & Categories) */}
        <div className="space-y-6">
          {/* Brands */}
          <div className="p-6 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-400" />
              <span>{t('brand')}</span>
            </h2>

            {canEdit && (
              <form onSubmit={handleAddBrand} className="flex gap-2">
                <input
                  type="text"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                  placeholder="New Brand (e.g. Dior)"
                  className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {brands.map((b) => (
                <span
                  key={b.id}
                  className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 font-medium"
                >
                  {b.name}
                </span>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div className="p-6 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] space-y-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-amber-400" />
              <span>{t('category')}</span>
            </h2>

            {canEdit && (
              <form onSubmit={handleAddCategory} className="flex gap-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="New Category (e.g. Evening Dresses)"
                  className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded-xl text-xs font-semibold"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </form>
            )}

            <div className="flex flex-wrap gap-2 pt-2">
              {categories.map((c) => (
                <span
                  key={c.id}
                  className="px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-zinc-300 font-medium"
                >
                  {c.name}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
