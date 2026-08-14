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
import { Settings, Store, Tag, DollarSign, Plus, CheckCircle2 } from 'lucide-react'

export default function SettingsPage() {
  const { t, language } = useLanguage()
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
    loadData()
  }, [])

  const handleSaveStoreInfo = async (e: React.FormEvent) => {
    e.preventDefault()
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
    try {
      await createBrand({ name: newBrand.trim() })
      setNewBrand('')
      loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to add brand')
    }
  }

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCategory.trim()) return
    try {
      await createCategory({ name: newCategory.trim() })
      setNewCategory('')
      loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to add category')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-amber-400" />
          <span>{t('settingsTitle')}</span>
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          {language === 'ar'
            ? 'تخصيص بيانات المتجر وإدارة العلامات التجارية والتصنيفات والعملات'
            : 'Configure store profile, master brands, fashion lines and base currency'}
        </p>
      </div>

      {/* Store Profile Card */}
      <div className="p-6 rounded-2xl bg-[#0c0c10] border border-[#1e1e26]">
        <h2 className="text-sm font-bold text-white flex items-center gap-2 mb-4 pb-3 border-b border-zinc-800">
          <Store className="w-4 h-4 text-amber-400" />
          <span>{t('storeInfo')}</span>
        </h2>

        {savedSuccess && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{t('success')}</span>
          </div>
        )}

        <form onSubmit={handleSaveStoreInfo} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('storeName')}</label>
              <input
                type="text"
                value={storeInfo.store_name}
                onChange={(e) => setStoreInfo({ ...storeInfo, store_name: e.target.value })}
                required
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('taxNumber')}</label>
              <input
                type="text"
                value={storeInfo.tax_registration_number || ''}
                onChange={(e) => setStoreInfo({ ...storeInfo, tax_registration_number: e.target.value })}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('storeAddress')}</label>
            <input
              type="text"
              value={storeInfo.address || ''}
              onChange={(e) => setStoreInfo({ ...storeInfo, address: e.target.value })}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="flex justify-end pt-2">
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

      {/* Brands and Categories Manager */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Brands */}
        <div className="p-6 rounded-2xl bg-[#0c0c10] border border-[#1e1e26]">
          <h3 className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            <span>Brands (العلامات التجارية)</span>
          </h3>

          <form onSubmit={handleAddBrand} className="flex gap-2 mb-3">
            <input
              type="text"
              value={newBrand}
              onChange={(e) => setNewBrand(e.target.value)}
              placeholder="e.g. Gucci, Dior, Zara"
              className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
            />
            <button type="submit" className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold rounded-xl text-white">
              +
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5">
            {brands.map((b) => (
              <span key={b.id} className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300">
                {b.name}
              </span>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="p-6 rounded-2xl bg-[#0c0c10] border border-[#1e1e26]">
          <h3 className="text-xs font-bold text-zinc-300 mb-3 flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5 text-amber-400" />
            <span>Categories (التصنيفات)</span>
          </h3>

          <form onSubmit={handleAddCategory} className="flex gap-2 mb-3">
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="e.g. Dresses, Suits, Accessories"
              className="flex-1 px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white"
            />
            <button type="submit" className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-xs font-bold rounded-xl text-white">
              +
            </button>
          </form>

          <div className="flex flex-wrap gap-1.5">
            {categories.map((c) => (
              <span key={c.id} className="px-2.5 py-1 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-300">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
