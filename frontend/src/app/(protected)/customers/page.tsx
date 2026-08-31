'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import { getCustomers, createCustomer, Customer } from '@/lib/api'
import { hasPermission } from '@/lib/auth'
import { Users, Plus, Search, Phone, Mail, DollarSign, X, Lock } from 'lucide-react'

export default function CustomersPage() {
  const { t, language } = useLanguage()

  const canView = hasPermission('customers', 'view')
  const canAdd = hasPermission('customers', 'add')

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)

  async function loadCustomers() {
    setLoading(true)
    try {
      const data = await getCustomers(search ? `search=${encodeURIComponent(search)}` : '')
      const list = Array.isArray(data) ? data : data.results || []
      setCustomers(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canView) {
      loadCustomers()
    } else {
      setLoading(false)
    }
  }, [canView])

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canAdd) {
      alert('ليس لديك صلاحية لإضافة عميل جديد')
      return
    }
    setSaving(true)
    try {
      await createCustomer({ name, phone, email, address })
      setIsModalOpen(false)
      setName('')
      setPhone('')
      setEmail('')
      setAddress('')
      loadCustomers()
    } catch (err: any) {
      alert(err.message || 'Failed to create customer')
    } finally {
      setSaving(false)
    }
  }

  if (!canView) {
    return (
      <div className="p-8 rounded-2xl bg-[#0c0c10] border border-red-500/30 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">
          {language === 'ar' ? 'غير مصرح بالوصول إلى العملاء' : 'Access Restricted to Customers'}
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          {language === 'ar'
            ? 'يتطلب حسابك الحصول على صلاحية عرض العملاء من قبل الإدارة.'
            : 'Your account does not have permission to view customers.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            <span>{t('customersTitle')}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'ar'
              ? 'إدارة حسابات كبار العملاء (VIP) ومتابعة الأرصدة والديون'
              : 'Client relationship management, loyalty programs and credit limits'}
          </p>
        </div>

        {canAdd && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addCustomer')}</span>
          </button>
        )}
      </div>

      <div className="p-4 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-zinc-500 absolute top-3 start-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={language === 'ar' ? 'بحث بالاسم أو الهاتف...' : 'Search by name or phone...'}
            className="w-full ps-9 pe-4 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
          />
        </div>
        <button
          onClick={loadCustomers}
          className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold"
        >
          {language === 'ar' ? 'بحث' : 'Search'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div
            key={c.id}
            className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] hover:border-amber-500/30 transition space-y-4"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold text-white text-sm">{c.name}</h3>
                <span className="text-[10px] text-zinc-500 font-mono">ID: #{c.id}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-xs">
                {c.name[0]?.toUpperCase()}
              </div>
            </div>

            <div className="space-y-1.5 text-xs text-zinc-400">
              {c.phone && (
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="font-mono text-zinc-300">{c.phone}</span>
                </div>
              )}
              {c.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="truncate">{c.email}</span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <span className="text-xs text-zinc-500">{t('currentBalance')}</span>
              <span
                className={`font-mono font-bold text-xs ${
                  Number(c.current_balance || 0) > 0 ? 'text-red-400' : 'text-emerald-400'
                }`}
              >
                {c.current_balance || 0} EGP
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Modal: New Customer */}
      {isModalOpen && canAdd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c0c10] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>{t('addCustomer')}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('customerName')}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Yasmin Sabri"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('phone')}</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +201001234567"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('email')}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. client@vip.com"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('address')}</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. Zamalek, Cairo"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
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
    </div>
  )
}
