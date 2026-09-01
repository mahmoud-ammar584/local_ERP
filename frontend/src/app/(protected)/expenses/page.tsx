'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import {
  getExpenses,
  createExpense,
  getExpenseCategories,
  createExpenseCategory,
  Expense,
  ExpenseCategory,
} from '@/lib/api'
import { hasPermission } from '@/lib/auth'
import { Receipt, Plus, DollarSign, Calendar, X, Lock, PlusCircle, CheckCircle2 } from 'lucide-react'

export default function ExpensesPage() {
  const { t, language } = useLanguage()

  const canView = hasPermission('expenses', 'view')
  const canAdd = hasPermission('expenses', 'add')

  const [expenses, setExpenses] = useState<Expense[]>([])
  const [categories, setCategories] = useState<ExpenseCategory[]>([])
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [categoryId, setCategoryId] = useState('')
  const [amount, setAmount] = useState<number>(0)
  const [expenseDate, setExpenseDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)

  // Quick Expense Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')
  const [savingCat, setSavingCat] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3000)
  }

  async function loadExpenses() {
    setLoading(true)
    try {
      const [e, c] = await Promise.all([getExpenses(), getExpenseCategories()])
      const eList = Array.isArray(e) ? e : (e as any).results || []
      const cList = Array.isArray(c) ? c : (c as any).results || []
      setExpenses(eList)
      setCategories(cList)
      if (cList.length > 0 && !categoryId) {
        setCategoryId(String(cList[0].id))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canView) {
      loadExpenses()
    } else {
      setLoading(false)
    }
  }, [canView])

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canAdd) {
      alert('ليس لديك صلاحية لتسجيل مصروف جديد')
      return
    }
    setSaving(true)
    try {
      await createExpense({
        category: categoryId,
        amount: Number(amount),
        expense_date: expenseDate,
        notes,
      })
      setIsModalOpen(false)
      setAmount(0)
      setNotes('')
      showToast('تم تسجيل المصروف بنجاح!')
      loadExpenses()
    } catch (err: any) {
      alert(err.message || 'Failed to create expense')
    } finally {
      setSaving(false)
    }
  }

  const handleQuickCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newCatName.trim()) return
    setSavingCat(true)
    try {
      const created = await createExpenseCategory({ name: newCatName.trim() })
      setCategories((prev) => [...prev, created])
      setCategoryId(String(created.id))
      showToast(`تم إنشاء واختيار تصنيف (${created.name}) بنجاح!`)
      setNewCatName('')
      setIsCategoryModalOpen(false)
    } catch (err: any) {
      alert(err.message || 'Failed to create category')
    } finally {
      setSavingCat(false)
    }
  }

  if (!canView) {
    return (
      <div className="p-8 rounded-2xl bg-[#0c0c10] border border-red-500/30 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">
          {language === 'ar' ? 'غير مصرح بالوصول إلى المصروفات' : 'Access Restricted to Expenses'}
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          {language === 'ar'
            ? 'يتطلب حسابك الحصول على صلاحية عرض المصروفات من قبل الإدارة.'
            : 'Your account does not have permission to view expenses.'}
        </p>
      </div>
    )
  }

  const totalAmount = expenses.reduce((acc, curr) => acc + Number(curr.amount || 0), 0)

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
            <Receipt className="w-5 h-5 text-amber-400" />
            <span>{t('expensesTitle')}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'ar'
              ? 'تسجيل ومتابعة نفقات التشغيل والإيجار والدعاية والرواتب'
              : 'Operational expense tracking, utilities, rent and payroll management'}
          </p>
        </div>

        {canAdd && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>{t('addExpense')}</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] space-y-1">
          <span className="text-xs text-zinc-400 font-medium">{t('totalExpenses')}</span>
          <div className="text-2xl font-bold text-white font-mono">{totalAmount.toLocaleString()} EGP</div>
        </div>
        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] space-y-1">
          <span className="text-xs text-zinc-400 font-medium">{t('expensesCount')}</span>
          <div className="text-2xl font-bold text-amber-400 font-mono">{expenses.length}</div>
        </div>
      </div>

      <div className="rounded-3xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400 uppercase tracking-wider text-[10px]">
                <th className="p-4 text-start"># ID</th>
                <th className="p-4 text-start">{t('category')}</th>
                <th className="p-4 text-start">{t('notes')}</th>
                <th className="p-4 text-end">{t('amount')}</th>
                <th className="p-4 text-end">{t('date')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-zinc-500">
                    {t('loading')}
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-zinc-500">
                    {t('noData')}
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-zinc-900/40 transition">
                    <td className="p-4 font-mono font-bold text-amber-400">EXP-{exp.id}</td>
                    <td className="p-4">
                      <span className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 font-semibold">
                        {exp.category_name || `Category ${exp.category}`}
                      </span>
                    </td>
                    <td className="p-4 text-zinc-300">{exp.notes || '—'}</td>
                    <td className="p-4 text-end font-mono font-bold text-white">
                      {Number(exp.amount || 0).toLocaleString()} EGP
                    </td>
                    <td className="p-4 text-end font-mono text-zinc-400">{exp.expense_date}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Expense */}
      {isModalOpen && canAdd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c0c10] border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>{t('addExpense')}</span>
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateExpense} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-zinc-300">{t('category')} *</label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-[11px] text-amber-400 hover:underline font-bold"
                  >
                    + تصنيف جديد
                  </button>
                </div>
                <select
                  required
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                >
                  <option value="">اختر التصنيف</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('amount')} (EGP) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={amount || ''}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('date')} *</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('notes')}</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="مثال: إيجار المحل لشهر سبتمبر / صيانة / بوفيه"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
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

      {/* Modal: Quick Add Expense Category */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0c0c10] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">إضافة تصنيف مصروفات جديد</h3>
              <button onClick={() => setIsCategoryModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleQuickCreateCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">اسم التصنيف *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="مثال: إيجار / بوفيه ومشروبات / تسويق إلكتروني"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={savingCat}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow"
                >
                  {savingCat ? 'جاري الحفظ...' : 'حفظ التصنيف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
