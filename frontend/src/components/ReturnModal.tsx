'use client'

import React, { useState } from 'react'
import {
  RotateCcw,
  Search,
  Barcode,
  X,
  AlertCircle,
  CheckCircle,
  Plus,
  Minus,
  ArrowRight,
  PackageCheck,
  Receipt,
} from 'lucide-react'
import { useLanguage } from '@/lib/i18n'
import { soundFx } from '@/lib/sound'
import { createReturnTransaction, SalesTransaction } from '@/lib/api'

interface ReturnModalProps {
  isOpen: boolean
  onClose: () => void
  transactions: SalesTransaction[]
  onReturnSuccess?: () => void
}

export function ReturnModal({
  isOpen,
  onClose,
  transactions,
  onReturnSuccess,
}: ReturnModalProps) {
  const { t, language } = useLanguage()

  const [invoiceQuery, setInvoiceQuery] = useState('')
  const [selectedTx, setSelectedTx] = useState<any | null>(null)
  const [returnItems, setReturnItems] = useState<{
    [salesItemId: number]: { quantity: number; reason: string }
  }>({})
  const [globalReason, setGlobalReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  if (!isOpen) return null

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError('')
    const q = invoiceQuery.trim().replace(/^#?SALE-?/i, '')
    if (!q) return

    const num = Number(q)
    const found = transactions.find((tx) => tx.id === num)
    if (found) {
      setSelectedTx(found)
      // Initialize return items map
      const initial: { [id: number]: { quantity: number; reason: string } } = {}
      const items = found.items || found.lines || []
      items.forEach((it: any) => {
        initial[it.id] = { quantity: 0, reason: 'Wrong Size / Fit' }
      })
      setReturnItems(initial)
      soundFx.playScanSuccess()
    } else {
      soundFx.playScanWarning()
      setError(
        language === 'ar'
          ? `لم يتم العثور على فاتورة برقم #${invoiceQuery}`
          : `No invoice found for #${invoiceQuery}`
      )
    }
  }

  const updateReturnQty = (salesItemId: number, maxQty: number, delta: number) => {
    setReturnItems((prev) => {
      const curr = prev[salesItemId]?.quantity || 0
      const next = Math.max(0, Math.min(maxQty, curr + delta))
      return {
        ...prev,
        [salesItemId]: {
          ...prev[salesItemId],
          quantity: next,
        },
      }
    })
  }

  const updateReturnReason = (salesItemId: number, reason: string) => {
    setReturnItems((prev) => ({
      ...prev,
      [salesItemId]: {
        ...prev[salesItemId],
        reason,
      },
    }))
  }

  // Calculate total refund
  const rawItems = selectedTx ? selectedTx.items || selectedTx.lines || [] : []
  const totalRefund = rawItems.reduce((sum: number, it: any) => {
    const qty = returnItems[it.id]?.quantity || 0
    const price = Number(it.unit_price || it.price || 0)
    const disc = Number(it.item_discount_percentage || it.discount_percentage || 0)
    const unitRefund = price * (1 - disc / 100)
    return sum + unitRefund * qty
  }, 0)

  const totalReturnUnits = Object.values(returnItems).reduce(
    (sum, val) => sum + (val.quantity || 0),
    0
  )

  const handleSubmitReturn = async () => {
    if (!selectedTx || totalReturnUnits === 0) {
      setError(
        language === 'ar'
          ? 'يرجى تحديد قطعة واحدة على الأقل للاسترجاع'
          : 'Please select at least one unit to return'
      )
      return
    }

    setError('')
    setLoading(true)

    const payloadItems = Object.entries(returnItems)
      .filter(([_, val]) => val.quantity > 0)
      .map(([itemId, val]) => ({
        sales_item_id: Number(itemId),
        quantity_returned: val.quantity,
        reason: val.reason || globalReason || 'Customer Return',
      }))

    try {
      await createReturnTransaction({
        original_transaction_id: selectedTx.id,
        reason: globalReason || 'Customer return',
        items: payloadItems,
      })

      soundFx.playCheckoutSuccess()
      setSuccessMsg(
        language === 'ar'
          ? `تم استرجاع ${totalReturnUnits} قطعة وإرجاعها للمخزن واسترداد ${totalRefund.toFixed(2)} EGP بنجاح!`
          : `Successfully returned ${totalReturnUnits} items and refunded ${totalRefund.toFixed(2)} EGP!`
      )

      if (onReturnSuccess) {
        onReturnSuccess()
      }

      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err: any) {
      soundFx.playScanWarning()
      setError(err.message || 'Return failed. Please check permissions.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
      <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {language === 'ar' ? 'استرجاع واستبدال المنتجات' : 'Process Sales Return & Refund'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {language === 'ar'
                  ? 'مسح باركود الفاتورة وإعادة القطع للمخزن ورد المبلغ تلقائياً'
                  : 'Scan receipt barcode, select items and replenish stock'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barcode Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none text-amber-400">
              <Barcode className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={invoiceQuery}
              onChange={(e) => setInvoiceQuery(e.target.value)}
              placeholder={
                language === 'ar'
                  ? 'امسح باركود الفاتورة أو اكتب رقمها (مثال: SALE-12 أو 12)...'
                  : 'Scan receipt barcode or enter invoice # (e.g. SALE-12 or 12)...'
              }
              className="w-full ps-10 pe-4 py-2.5 bg-zinc-900 border border-zinc-800 focus:border-amber-400 rounded-xl text-xs sm:text-sm font-mono text-white placeholder-zinc-500 focus:outline-none"
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
          >
            <Search className="w-4 h-4" />
            <span>{language === 'ar' ? 'بحث' : 'Search'}</span>
          </button>
        </form>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2 font-bold animate-in fade-in">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Selected Invoice Details & Items */}
        {selectedTx && (
          <div className="space-y-4">
            <div className="p-3.5 bg-zinc-900/60 border border-zinc-800 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-amber-400 text-sm">
                  #SALE-{String(selectedTx.id).padStart(6, '0')}
                </span>
                <span className="text-zinc-400">
                  {new Date(selectedTx.created_at || selectedTx.transaction_date).toLocaleDateString()}
                </span>
                <span className="px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 font-semibold">
                  {selectedTx.customer_name || (language === 'ar' ? 'عميل نقدي' : 'Walk-in')}
                </span>
              </div>
              <div className="font-mono font-bold text-white">
                {language === 'ar' ? 'إجمالي الفاتورة:' : 'Original Total:'}{' '}
                <span className="text-amber-400">
                  {Number(selectedTx.final_total || selectedTx.final_amount || 0).toFixed(2)} EGP
                </span>
              </div>
            </div>

            {/* Items Table */}
            <div className="border border-zinc-800 rounded-2xl overflow-hidden">
              <div className="max-h-64 overflow-y-auto">
                <table className="w-full text-start text-xs">
                  <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 sticky top-0">
                    <tr>
                      <th className="p-3 text-start">{language === 'ar' ? 'الصنف' : 'Item'}</th>
                      <th className="p-3 text-center">{language === 'ar' ? 'الكمية المباعة' : 'Sold Qty'}</th>
                      <th className="p-3 text-center">{language === 'ar' ? 'الكمية المرتجعة' : 'Return Qty'}</th>
                      <th className="p-3 text-end">{language === 'ar' ? 'المبلغ المسترد' : 'Refund Line'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {rawItems.map((item: any) => {
                      const maxSold = Number(item.quantity_sold ?? item.quantity ?? 1)
                      const returnQty = returnItems[item.id]?.quantity || 0
                      const unitPrice = Number(item.unit_price || item.price || 0)
                      const lineRefund = unitPrice * returnQty

                      return (
                        <tr
                          key={item.id}
                          className={`transition ${
                            returnQty > 0 ? 'bg-amber-500/5' : 'hover:bg-zinc-900/30'
                          }`}
                        >
                          <td className="p-3">
                            <div className="font-bold text-white">
                              {item.product_name || item.model_name}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400 mt-0.5">
                              {item.variant_sku || item.product_sku} {item.color ? `| ${item.color}` : ''}{' '}
                              {item.size ? `| ${item.size}` : ''}
                            </div>
                          </td>
                          <td className="p-3 text-center font-mono font-bold text-zinc-300">
                            {maxSold}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateReturnQty(item.id, maxSold, -1)}
                                className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-8 text-center font-mono font-bold text-white text-xs">
                                {returnQty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateReturnQty(item.id, maxSold, 1)}
                                className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-end font-mono font-bold text-amber-400">
                            {lineRefund.toFixed(2)} EGP
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Total Refund Bar & Submit */}
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-xs text-zinc-400 block">
                  {language === 'ar' ? 'إجمالي المبلغ المسترد للعميل:' : 'Total Refund to Customer:'}
                </span>
                <span className="text-lg font-black text-amber-400 font-mono">
                  {totalRefund.toFixed(2)} EGP
                </span>
                <span className="text-[11px] text-zinc-500 ms-2 font-mono">
                  ({totalReturnUnits} {language === 'ar' ? 'قطع مسترجعة' : 'units'})
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition"
                >
                  {language === 'ar' ? 'إلغاء' : 'Cancel'}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitReturn}
                  disabled={loading || totalReturnUnits === 0}
                  className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 transition"
                >
                  <PackageCheck className="w-4 h-4" />
                  <span>{loading ? t('loading') : language === 'ar' ? 'تأكيد الاسترجاع وإعادة المخزن' : 'Confirm Return'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
