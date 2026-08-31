'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import {
  getCustomers,
  createCustomer,
  recordCustomerPayment,
  getCustomerStatement,
  Customer,
} from '@/lib/api'
import { hasPermission } from '@/lib/auth'
import {
  Users,
  Plus,
  Search,
  Phone,
  Mail,
  DollarSign,
  X,
  Lock,
  CreditCard,
  FileText,
  CheckCircle,
  Receipt,
  RotateCcw,
  Sparkles,
} from 'lucide-react'

export default function CustomersPage() {
  const { t, language } = useLanguage()

  const canView = hasPermission('customers', 'view')
  const canAdd = hasPermission('customers', 'add')
  const canEdit = hasPermission('customers', 'edit')

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modal: New Customer
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)

  // Modal: Settle Payment / Add Store Credit
  const [paymentModalCustomer, setPaymentModalCustomer] = useState<Customer | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)

  // Modal: Customer Statement
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null)
  const [statementData, setStatementData] = useState<any | null>(null)
  const [loadingStatement, setLoadingStatement] = useState(false)

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

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!paymentModalCustomer || !paymentAmount) return
    setProcessingPayment(true)
    try {
      await recordCustomerPayment(paymentModalCustomer.id, {
        amount: Number(paymentAmount),
        notes: paymentNotes || 'Debt Settlement',
      })
      setPaymentModalCustomer(null)
      setPaymentAmount('')
      setPaymentNotes('')
      loadCustomers()
    } catch (err: any) {
      alert(err.message || 'Payment recording failed')
    } finally {
      setProcessingPayment(false)
    }
  }

  const handleOpenStatement = async (c: Customer) => {
    setStatementCustomer(c)
    setLoadingStatement(true)
    try {
      const res = await getCustomerStatement(c.id)
      setStatementData(res)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingStatement(false)
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
              ? 'إدارة حسابات كبار العملاء (VIP)، متابعة الأرصدة والديون، وسداد الدفعات'
              : 'Client relationship management, credit limits & customer payment ledger'}
          </p>
        </div>

        {canAdd && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addCustomer')}</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
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

      {/* Customers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => {
          const balance = Number(c.current_balance || 0)
          const totalPurchases = Number(c.total_purchases || 0)

          return (
            <div
              key={c.id}
              className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] hover:border-amber-500/30 transition space-y-4 flex flex-col justify-between"
            >
              <div className="space-y-3">
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
                  {c.address && (
                    <div className="text-[11px] text-zinc-500 truncate">
                      📍 {c.address}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-zinc-950/80 rounded-xl border border-zinc-900 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-zinc-400 text-[11px]">
                    <span>{language === 'ar' ? 'إجمالي المشتريات:' : 'Total Purchases:'}</span>
                    <span className="text-white font-bold">{totalPurchases.toFixed(2)} EGP</span>
                  </div>
                  <div className="flex justify-between items-center pt-1 border-t border-zinc-900">
                    <span className="text-zinc-400 text-[11px]">{t('currentBalance')}:</span>
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                        balance > 0
                          ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                          : balance < 0
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}
                    >
                      {balance > 0
                        ? `${balance.toFixed(2)} EGP (${language === 'ar' ? 'مدين' : 'Debt'})`
                        : balance < 0
                        ? `${Math.abs(balance).toFixed(2)} EGP (${language === 'ar' ? 'رصيد دائن' : 'Credit'})`
                        : `${balance.toFixed(2)} EGP`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-end gap-2">
                <button
                  onClick={() => handleOpenStatement(c)}
                  className="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>{language === 'ar' ? 'كشف حساب' : 'Statement'}</span>
                </button>

                {(canEdit || canAdd) && (
                  <button
                    onClick={() => setPaymentModalCustomer(c)}
                    className="px-2.5 py-1.5 bg-amber-500/10 hover:bg-amber-500 border border-amber-500/30 text-amber-400 hover:text-zinc-950 rounded-lg text-xs font-bold flex items-center gap-1 transition"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>{language === 'ar' ? 'سداد دفعة' : 'Settle Pay'}</span>
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Modal: Record Customer Payment */}
      {paymentModalCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c0c10] border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-amber-400" />
                <h2 className="text-sm font-bold text-white">
                  {language === 'ar' ? `سداد دفعة: ${paymentModalCustomer.name}` : `Record Payment: ${paymentModalCustomer.name}`}
                </h2>
              </div>
              <button
                onClick={() => setPaymentModalCustomer(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800 font-mono text-xs flex justify-between">
              <span className="text-zinc-400">{language === 'ar' ? 'المديونية الحالية:' : 'Current Debt Balance:'}</span>
              <span className="text-red-400 font-bold">{Number(paymentModalCustomer.current_balance || 0).toFixed(2)} EGP</span>
            </div>

            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {language === 'ar' ? 'المبلغ المدفوع (EGP)' : 'Payment Amount (EGP)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl text-white font-mono text-xs focus:outline-none"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  {language === 'ar' ? 'ملاحظات وسند السداد' : 'Notes / Reference'}
                </label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'سداد نقدي، تحويل فودافون كاش، إيداع...' : 'Cash settlement, transfer...'}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl text-white text-xs focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalCustomer(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={processingPayment}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition disabled:opacity-50"
                >
                  {processingPayment ? t('loading') : language === 'ar' ? 'تأكيد السداد' : 'Confirm Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Customer Statement */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-sm font-bold text-white">
                    {language === 'ar' ? `كشف حساب: ${statementCustomer.name}` : `Account Statement: ${statementCustomer.name}`}
                  </h2>
                  <span className="text-[10px] text-zinc-500 font-mono">ID: #{statementCustomer.id} | {statementCustomer.phone}</span>
                </div>
              </div>
              <button
                onClick={() => {
                  setStatementCustomer(null)
                  setStatementData(null)
                }}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto space-y-4 flex-1 pe-1">
              {loadingStatement ? (
                <div className="p-8 text-center text-zinc-500 text-xs">{t('loading')}</div>
              ) : statementData ? (
                <div className="space-y-4">
                  {/* Sales History */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-amber-400" />
                      <span>{language === 'ar' ? 'سجل الفواتير والمشتريات' : 'Sales & Invoices'}</span>
                    </h3>
                    <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                      <table className="w-full text-xs text-start">
                        <thead className="bg-zinc-900 text-zinc-400">
                          <tr>
                            <th className="p-2.5 text-start"># ID</th>
                            <th className="p-2.5 text-start">{t('date')}</th>
                            <th className="p-2.5 text-start">{t('paymentMethod')}</th>
                            <th className="p-2.5 text-end">{t('finalTotal')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 font-mono">
                          {statementData.sales?.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-zinc-500">
                                {t('noData')}
                              </td>
                            </tr>
                          ) : (
                            statementData.sales?.map((s: any) => (
                              <tr key={s.id} className="hover:bg-zinc-900/30">
                                <td className="p-2.5 text-amber-400 font-bold">#{s.id}</td>
                                <td className="p-2.5 text-zinc-400">
                                  {new Date(s.transaction_date).toLocaleDateString()}
                                </td>
                                <td className="p-2.5 text-zinc-300">{s.payment_method_name}</td>
                                <td className="p-2.5 text-end font-bold text-white">
                                  {Number(s.final_amount).toFixed(2)} EGP
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Returns History */}
                  <div className="space-y-2">
                    <h3 className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                      <RotateCcw className="w-3.5 h-3.5 text-red-400" />
                      <span>{language === 'ar' ? 'سجل المرتجعات والمبالغ المستردة' : 'Returns & Refunds'}</span>
                    </h3>
                    <div className="border border-zinc-800 rounded-2xl overflow-hidden">
                      <table className="w-full text-xs text-start">
                        <thead className="bg-zinc-900 text-zinc-400">
                          <tr>
                            <th className="p-2.5 text-start"># Return</th>
                            <th className="p-2.5 text-start">{t('date')}</th>
                            <th className="p-2.5 text-start">{language === 'ar' ? 'السبب' : 'Reason'}</th>
                            <th className="p-2.5 text-end">{language === 'ar' ? 'المبلغ المسترد' : 'Refund'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/60 font-mono">
                          {statementData.returns?.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-4 text-center text-zinc-500">
                                {t('noData')}
                              </td>
                            </tr>
                          ) : (
                            statementData.returns?.map((r: any) => (
                              <tr key={r.id} className="hover:bg-zinc-900/30">
                                <td className="p-2.5 text-red-400 font-bold">#{r.id}</td>
                                <td className="p-2.5 text-zinc-400">
                                  {new Date(r.return_date).toLocaleDateString()}
                                </td>
                                <td className="p-2.5 text-zinc-300">{r.reason || '—'}</td>
                                <td className="p-2.5 text-end font-bold text-emerald-400">
                                  +{Number(r.total_refund_amount).toFixed(2)} EGP
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Modal: New Customer */}
      {isModalOpen && canAdd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c0c10] border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
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
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition"
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
