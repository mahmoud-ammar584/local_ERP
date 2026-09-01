'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import {
  getPurchaseOrders,
  createPurchaseOrder,
  getSuppliers,
  createSupplier,
  getProducts,
  PurchaseOrder,
  Supplier,
  Product,
} from '@/lib/api'
import { hasPermission } from '@/lib/auth'
import { Truck, Plus, Package, Calendar, DollarSign, X, Lock, CheckCircle2 } from 'lucide-react'

export default function PurchasesPage() {
  const { t, language } = useLanguage()

  const canView = hasPermission('purchases', 'view')
  const canAdd = hasPermission('purchases', 'add')

  const [orders, setOrders] = useState<PurchaseOrder[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [supplierId, setSupplierId] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [shippingCost, setShippingCost] = useState(0)
  const [customsCost, setCustomsCost] = useState(0)
  const [saving, setSaving] = useState(false)

  // Quick Supplier Add Modal
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false)
  const [newSupplierName, setNewSupplierName] = useState('')
  const [newSupplierContact, setNewSupplierContact] = useState('')
  const [newSupplierPhone, setNewSupplierPhone] = useState('')
  const [savingSupplier, setSavingSupplier] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  async function loadData() {
    setLoading(true)
    try {
      const [o, s, p] = await Promise.all([
        getPurchaseOrders(),
        getSuppliers(),
        getProducts(),
      ])
      const oList = Array.isArray(o) ? o : (o as any).results || []
      const sList = Array.isArray(s) ? s : (s as any).results || []
      const pList = Array.isArray(p) ? p : (p as any).results || []

      setOrders(oList)
      setSuppliers(sList)
      setProducts(pList)
      if (sList.length > 0 && !supplierId) {
        setSupplierId(String(sList[0].id))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canView) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [canView])

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canAdd) {
      alert('ليس لديك صلاحية لإنشاء أمر شراء')
      return
    }
    setSaving(true)
    try {
      await createPurchaseOrder({
        supplier: Number(supplierId),
        invoice_number: invoiceNumber,
        shipping_cost: Number(shippingCost),
        customs_cost: Number(customsCost),
      })
      setIsModalOpen(false)
      showToast('تم إنشاء أمر الشراء بنجاح!')
      loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to create PO')
    } finally {
      setSaving(false)
    }
  }

  const handleQuickCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newSupplierName.trim()) return
    setSavingSupplier(true)
    try {
      const created = await createSupplier({
        name: newSupplierName.trim(),
        contact_person: newSupplierContact.trim() || undefined,
        phone: newSupplierPhone.trim() || undefined,
      })
      setSuppliers((prev) => [...prev, created])
      setSupplierId(String(created.id))
      showToast(`تم إنشاء واختيار المورد (${created.name}) بنجاح!`)
      setNewSupplierName('')
      setNewSupplierContact('')
      setNewSupplierPhone('')
      setIsSupplierModalOpen(false)
    } catch (err: any) {
      alert(err.message || 'Failed to create supplier')
    } finally {
      setSavingSupplier(false)
    }
  }

  if (!canView) {
    return (
      <div className="p-8 rounded-2xl bg-[#0c0c10] border border-red-500/30 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">
          {language === 'ar' ? 'غير مصرح بالوصول إلى المشتريات' : 'Access Restricted to Purchases'}
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          {language === 'ar'
            ? 'يتطلب حسابك الحصول على صلاحية إدارة المشتريات من قبل الإدارة.'
            : 'Your account does not have permission to view or manage purchases.'}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 end-6 z-50 px-4 py-3 rounded-2xl bg-emerald-500 text-zinc-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Truck className="w-5 h-5 text-amber-400" />
            <span>{t('purchasesTitle')}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'ar'
              ? 'إدارة أوامر الشراء، فواتير الموردين، وتكاليف الشحن والجمارك'
              : 'Supply chain management, purchase orders, shipping and customs tracking'}
          </p>
        </div>

        {canAdd && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t('newPurchaseOrder')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] space-y-1">
          <span className="text-xs text-zinc-400 font-medium">{language === 'ar' ? 'إجمالي الأوامر' : 'Total Orders'}</span>
          <div className="text-2xl font-bold text-white font-mono">{orders.length}</div>
        </div>
        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] space-y-1">
          <span className="text-xs text-zinc-400 font-medium">{t('supplier')}</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">{suppliers.length}</div>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400 uppercase tracking-wider text-[10px]">
                <th className="p-4 text-start"># ID</th>
                <th className="p-4 text-start">{t('supplier')}</th>
                <th className="p-4 text-start">{t('invoiceNumber')}</th>
                <th className="p-4 text-start">{t('status')}</th>
                <th className="p-4 text-end">{t('shippingCost')}</th>
                <th className="p-4 text-end">{t('customsCost')}</th>
                <th className="p-4 text-end">{t('date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-zinc-500">
                    {loading ? t('loading') : t('noData')}
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr key={o.id} className="hover:bg-zinc-900/30">
                    <td className="p-4 font-mono font-bold text-amber-400">#{o.id}</td>
                    <td className="p-4 font-semibold text-white">{o.supplier_name || `Supplier #${o.supplier}`}</td>
                    <td className="p-4 font-mono text-zinc-300">{o.invoice_number || '—'}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {o.status}
                      </span>
                    </td>
                    <td className="p-4 text-end text-zinc-300 font-mono">{o.shipping_cost} EGP</td>
                    <td className="p-4 text-end text-zinc-300 font-mono">{o.customs_cost} EGP</td>
                    <td className="p-4 text-end text-zinc-500 font-mono">{new Date(o.order_date).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New PO */}
      {isModalOpen && canAdd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c0c10] border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>{t('newPurchaseOrder')}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateOrder} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-300">{t('supplier')} *</label>
                  <button
                    type="button"
                    onClick={() => setIsSupplierModalOpen(true)}
                    className="text-[11px] text-amber-400 hover:underline font-bold"
                  >
                    + مورد جديد
                  </button>
                </div>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">اختر المورد</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('invoiceNumber')}</label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="e.g. INV-2026-08"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('shippingCost')} (EGP)</label>
                  <input
                    type="number"
                    value={shippingCost}
                    onChange={(e) => setShippingCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('customsCost')} (EGP)</label>
                  <input
                    type="number"
                    value={customsCost}
                    onChange={(e) => setCustomsCost(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 text-zinc-950 font-bold rounded-xl text-xs shadow-lg transition"
                >
                  {saving ? t('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Add Supplier */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0c0c10] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">إضافة مورد جديد</h3>
              <button onClick={() => setIsSupplierModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleQuickCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">اسم المورد / الشركة *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="مثال: Milano Luxury Imports"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">الشخص المسؤول (اختياري)</label>
                <input
                  type="text"
                  value={newSupplierContact}
                  onChange={(e) => setNewSupplierContact(e.target.value)}
                  placeholder="مثال: Marco Rossi"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">رقم الهاتف (اختياري)</label>
                <input
                  type="text"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  placeholder="مثال: +201001234567"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingSupplier}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow"
                >
                  {savingSupplier ? 'جاري الحفظ...' : 'حفظ المورد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
