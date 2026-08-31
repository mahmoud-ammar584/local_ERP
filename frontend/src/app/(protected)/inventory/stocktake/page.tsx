'use client'

import React, { useState, useEffect, useRef } from 'react'
import { useLanguage } from '@/lib/i18n'
import {
  getStockAudits,
  getStockAudit,
  createStockAudit,
  scanStockAuditItem,
  setStockAuditItemCount,
  reconcileStockAudit,
  exportStockAuditCsvUrl,
  StockAudit,
  StockAuditItem,
} from '@/lib/api'
import { hasPermission } from '@/lib/auth'
import { soundFx } from '@/lib/sound'
import { BarcodeDisplay } from '@/components/BarcodeDisplay'
import { BarcodeLabelModal, LabelProductData } from '@/components/BarcodeLabelModal'
import {
  ClipboardCheck,
  ScanLine,
  Barcode,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Plus,
  Minus,
  Download,
  Printer,
  History,
  RotateCcw,
  Search,
  Layers,
  Filter,
  Check,
  AlertCircle,
  Tag,
  Clock,
  Sparkles,
  Lock,
} from 'lucide-react'

export default function StocktakePage() {
  const { t, language } = useLanguage()

  // Granular Permissions
  const canView = hasPermission('inventory', 'stocktake_view')
  const canCreate = hasPermission('inventory', 'stocktake_create') || hasPermission('inventory', 'add')
  const canCount = hasPermission('inventory', 'stocktake_count')
  const canReconcile = hasPermission('inventory', 'stocktake_reconcile')
  const canPrintBarcode = hasPermission('inventory', 'print_barcode')

  // Audits list & Active audit
  const [audits, setAudits] = useState<StockAudit[]>([])
  const [activeAudit, setActiveAudit] = useState<StockAudit | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  // Scanner state
  const [scanQuery, setScanQuery] = useState('')
  const [lastScannedItem, setLastScannedItem] = useState<{ item: StockAuditItem; time: string } | null>(null)
  const [scanHistory, setScanHistory] = useState<Array<{ sku: string; name: string; time: string; cue: string }>>([])
  const scannerInputRef = useRef<HTMLInputElement>(null)

  // Filter & Search
  const [filterTab, setFilterTab] = useState<'all' | 'discrepant' | 'deficit' | 'surplus' | 'matched' | 'uncounted'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Modal States
  const [isNewAuditModalOpen, setIsNewAuditModalOpen] = useState(false)
  const [newAuditTitle, setNewAuditTitle] = useState('')
  const [newAuditNotes, setNewAuditNotes] = useState('')
  const [isReconcileModalOpen, setIsReconcileModalOpen] = useState(false)

  // Label Print Modal State
  const [labelProduct, setLabelProduct] = useState<LabelProductData | null>(null)
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false)

  // Manual Edit Quantity Modal State
  const [editingItem, setEditingItem] = useState<StockAuditItem | null>(null)
  const [manualCountInput, setManualCountInput] = useState<number>(0)

  async function loadAudits() {
    setLoading(true)
    try {
      const data = await getStockAudits()
      const list = Array.isArray(data) ? data : data.results || []
      setAudits(list)

      // Auto-select latest in-progress audit if any, or latest audit
      if (list.length > 0) {
        const inProgress = list.find((a) => a.status === 'in_progress')
        const target = inProgress || list[0]
        loadAuditDetails(target.id)
      } else {
        setActiveAudit(null)
      }
    } catch (err: any) {
      console.error('Failed to load stock audits:', err)
      setError(err.message || 'Failed to load stock audits')
    } finally {
      setLoading(false)
    }
  }

  async function loadAuditDetails(id: number) {
    try {
      const audit = await getStockAudit(id)
      setActiveAudit(audit)
    } catch (err: any) {
      console.error('Failed to load audit details:', err)
    }
  }

  useEffect(() => {
    if (canView) {
      loadAudits()
    } else {
      setLoading(false)
    }
  }, [canView])

  // Auto-focus scanner input whenever active audit changes
  useEffect(() => {
    if (canCount && activeAudit && activeAudit.status === 'in_progress') {
      setTimeout(() => {
        scannerInputRef.current?.focus()
      }, 150)
    }
  }, [activeAudit?.id, activeAudit?.status, canCount])

  // Handle barcode submission (Gun or Keyboard Enter)
  const handleScanSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAudit || activeAudit.status !== 'in_progress' || !scanQuery.trim()) return

    if (!canCount) {
      soundFx.playScanWarning()
      setError(language === 'ar' ? 'ليس لديك صلاحية تسجيل القطع ومسح الجرد' : 'You do not have permission to count stock')
      return
    }

    const query = scanQuery.trim()
    setError('')

    try {
      const updatedAudit = await scanStockAuditItem(activeAudit.id, query, 1)
      setActiveAudit(updatedAudit)

      // Find the item that was updated
      const foundItem = updatedAudit.items?.find(
        (i) =>
          i.variant_sku?.toLowerCase() === query.toLowerCase() ||
          i.barcode?.toLowerCase() === query.toLowerCase()
      )

      if (foundItem) {
        soundFx.playScanSuccess()
        setLastScannedItem({
          item: foundItem,
          time: new Date().toLocaleTimeString(),
        })
        setScanHistory((prev) => [
          {
            sku: foundItem.variant_sku,
            name: foundItem.product_name,
            time: new Date().toLocaleTimeString(),
            cue: `${foundItem.counted_quantity} / ${foundItem.expected_quantity}`,
          },
          ...prev.slice(0, 19),
        ])
      } else {
        soundFx.playScanSuccess()
      }

      setScanQuery('')
    } catch (err: any) {
      soundFx.playScanWarning()
      setError(err.message || 'Item not found or scan failed')
    } finally {
      setTimeout(() => {
        scannerInputRef.current?.focus()
      }, 50)
    }
  }

  // Handle manual count quick adjust (+1 / -1)
  const handleQuickAdjust = async (item: StockAuditItem, delta: number) => {
    if (!activeAudit || activeAudit.status !== 'in_progress') return
    if (!canCount) {
      alert('ليس لديك صلاحية لتعديل كميات الجرد')
      return
    }
    const newCount = Math.max(0, item.counted_quantity + delta)
    try {
      const updatedAudit = await setStockAuditItemCount(activeAudit.id, item.id, newCount)
      setActiveAudit(updatedAudit)
      soundFx.playScanSuccess()
    } catch (err: any) {
      alert(err.message || 'Failed to update count')
    }
  }

  // Save manual count from modal
  const handleSaveManualCount = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeAudit || !editingItem) return
    if (!canCount) {
      alert('ليس لديك صلاحية لتعديل كميات الجرد')
      return
    }
    setActionLoading(true)
    try {
      const updatedAudit = await setStockAuditItemCount(
        activeAudit.id,
        editingItem.id,
        manualCountInput
      )
      setActiveAudit(updatedAudit)
      setEditingItem(null)
      soundFx.playScanSuccess()
    } catch (err: any) {
      alert(err.message || 'Failed to update count')
    } finally {
      setActionLoading(false)
    }
  }

  // Create New Stock Audit Session
  const handleCreateAudit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!canCreate) {
      alert('ليس لديك صلاحية لإنشاء جلسة جرد جديدة')
      return
    }
    setActionLoading(true)
    try {
      const newAudit = await createStockAudit(newAuditTitle, newAuditNotes)
      setIsNewAuditModalOpen(false)
      setNewAuditTitle('')
      setNewAuditNotes('')
      await loadAudits()
      loadAuditDetails(newAudit.id)
    } catch (err: any) {
      alert(err.message || 'Failed to create stock audit')
    } finally {
      setActionLoading(false)
    }
  }

  // Atomic Reconcile Confirmation
  const handleReconcile = async () => {
    if (!activeAudit) return
    if (!canReconcile) {
      alert('ليس لديك صلاحية لاعتماد وتسوية الجرد الفعلي على المخزون')
      return
    }
    setActionLoading(true)
    try {
      const reconciled = await reconcileStockAudit(activeAudit.id)
      setActiveAudit(reconciled)
      setIsReconcileModalOpen(false)
      soundFx.playCheckoutSuccess()
      await loadAudits()
    } catch (err: any) {
      alert(err.message || 'Reconciliation failed')
    } finally {
      setActionLoading(false)
    }
  }

  // Open Barcode Label Modal for an item
  const handlePrintLabel = (item: StockAuditItem) => {
    if (!canPrintBarcode) {
      alert('ليس لديك صلاحية لطباعة ملصقات الباركود')
      return
    }
    setLabelProduct({
      model_name: item.product_name,
      brand_name: item.brand_name,
      color: item.color,
      size: item.size,
      sku: item.variant_sku,
      barcode: item.barcode,
      price: item.effective_price || item.unit_cost || 0,
      current_quantity: item.counted_quantity || item.expected_quantity,
    })
    setIsLabelModalOpen(true)
  }

  if (!canView) {
    return (
      <div className="p-8 rounded-2xl bg-[#0c0c10] border border-red-500/30 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">
          {language === 'ar' ? 'غير مصرح بالوصول إلى موديول الجرد' : 'Access Restricted to Stocktake Module'}
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          {language === 'ar'
            ? 'يتطلب حسابك الحصول على صلاحية عرض جلسات الجرد من قبل مدير المتجر.'
            : 'Your account does not have permission to view stocktake audit sessions.'}
        </p>
      </div>
    )
  }

  const items = activeAudit?.items || []

  // Filter and search logic
  const filteredItems = items.filter((itm) => {
    // Tab filter
    if (filterTab === 'discrepant' && itm.discrepancy === 0) return false
    if (filterTab === 'deficit' && itm.discrepancy >= 0) return false
    if (filterTab === 'surplus' && itm.discrepancy <= 0) return false
    if (filterTab === 'matched' && (itm.discrepancy !== 0 || itm.counted_quantity === 0)) return false
    if (filterTab === 'uncounted' && itm.counted_quantity > 0) return false

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      const matchSku = itm.variant_sku?.toLowerCase().includes(q)
      const matchBarcode = itm.barcode?.toLowerCase().includes(q)
      const matchName = itm.product_name?.toLowerCase().includes(q)
      const matchBrand = itm.brand_name?.toLowerCase().includes(q)
      if (!matchSku && !matchBarcode && !matchName && !matchBrand) return false
    }

    return true
  })

  // Discrepancy Statistics
  const matchedCount = items.filter((i) => i.discrepancy === 0 && i.counted_quantity > 0).length
  const deficitCount = items.filter((i) => i.discrepancy < 0).length
  const surplusCount = items.filter((i) => i.discrepancy > 0).length
  const uncountedCount = items.filter((i) => i.counted_quantity === 0).length
  const discrepantCount = deficitCount + surplusCount

  const formatCurrency = (val: number | string) => {
    const num = Number(val) || 0
    return `${num.toLocaleString(language === 'ar' ? 'ar-EG' : 'en-US')} EGP`
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-amber-400" />
            <span>{t('stocktakeTitle')}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'ar'
              ? 'إجراء الجرد الفعلي بالماسح الضوئي، مطابقة الفروقات المخزنية، واحتساب الأثر المالي'
              : 'Physical barcode inventory counting, live variance detection & atomic reconciliation'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeAudit && (
            <a
              href={exportStockAuditCsvUrl(activeAudit.id)}
              download
              className="px-3 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>{t('exportCsv')}</span>
            </a>
          )}
          {canCreate && (
            <button
              onClick={() => setIsNewAuditModalOpen(true)}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{t('newStocktake')}</span>
            </button>
          )}
        </div>
      </div>

      {/* Audit Session Selector Bar */}
      <div className="p-4 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
            #{activeAudit?.id || '—'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">
                {activeAudit?.title || (language === 'ar' ? 'لا توجد جلسة جرد نشطة' : 'No active audit session')}
              </span>
              {activeAudit && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    activeAudit.status === 'completed'
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/30 animate-pulse'
                  }`}
                >
                  {activeAudit.status === 'completed'
                    ? language === 'ar' ? 'مكتمل ومُعتمد' : 'Completed'
                    : language === 'ar' ? 'جاري الجرد بالماسح' : 'In Progress'}
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5 flex items-center gap-2">
              <Clock className="w-3 h-3" />
              <span>
                {activeAudit?.created_at ? new Date(activeAudit.created_at).toLocaleString() : ''}
              </span>
              {activeAudit?.created_by_name && (
                <span>• {language === 'ar' ? 'بواسطة:' : 'By:'} {activeAudit.created_by_name}</span>
              )}
            </p>
          </div>
        </div>

        {/* Switch Session Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 shrink-0">
            {language === 'ar' ? 'الجلسات السابقة:' : 'Audit Sessions:'}
          </span>
          <select
            value={activeAudit?.id || ''}
            onChange={(e) => {
              if (e.target.value) loadAuditDetails(Number(e.target.value))
            }}
            className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
          >
            {audits.map((a) => (
              <option key={a.id} value={a.id}>
                #{a.id} - {a.title} ({a.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeAudit && (
        <>
          {/* Continuous Barcode Scanner Gun Bar */}
          {activeAudit.status === 'in_progress' ? (
            canCount ? (
              <div className="p-5 rounded-2xl bg-gradient-to-r from-amber-500/15 via-zinc-900 to-zinc-900 border-2 border-amber-500/40 shadow-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                    <ScanLine className="w-4 h-4 animate-pulse" />
                    <span>{t('quickScanMode')}</span>
                  </div>
                  <span className="text-[11px] text-zinc-400 font-mono">
                    {language === 'ar' ? 'اضغط الزناد أو امسح الباركود مباشرة' : 'Aim scanner gun & pull trigger'}
                  </span>
                </div>

                <form onSubmit={handleScanSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 start-0 flex items-center ps-4 pointer-events-none text-amber-400">
                      <Barcode className="w-5 h-5" />
                    </div>
                    <input
                      ref={scannerInputRef}
                      type="text"
                      value={scanQuery}
                      onChange={(e) => setScanQuery(e.target.value)}
                      placeholder={
                        language === 'ar'
                          ? 'امسح باركود القطعة بالماسح الضوئي (أو اكتب الـ SKU واضغط Enter)...'
                          : 'Scan barcode or enter SKU and press Enter...'
                      }
                      className="w-full ps-12 pe-4 py-3.5 bg-zinc-950 border border-amber-500/50 focus:border-amber-400 rounded-xl text-sm font-mono text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-amber-400/20 shadow-inner"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!scanQuery.trim()}
                    className="px-6 py-3.5 bg-amber-400 hover:bg-amber-300 text-zinc-950 font-black rounded-xl text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-lg shadow-amber-400/20 shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{language === 'ar' ? 'تسجيل القطعة (+1)' : 'Record (+1)'}</span>
                  </button>
                </form>

                {/* Error or Last Scanned Feedback Banner */}
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2 animate-shake">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                {lastScannedItem && (
                  <div className="p-3 bg-zinc-950/80 border border-zinc-800 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span className="text-white font-bold">{lastScannedItem.item.product_name}</span>
                      <span className="text-zinc-400 font-mono">({lastScannedItem.item.variant_sku})</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-amber-400 font-mono font-bold">
                        {language === 'ar' ? 'الرصيد الممسوح:' : 'Count:'} {lastScannedItem.item.counted_quantity} / {lastScannedItem.item.expected_quantity}
                      </span>
                      <span className="text-zinc-500 font-mono text-[10px]">{lastScannedItem.time}</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-400 flex items-center gap-2">
                <Lock className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{language === 'ar' ? 'ليس لديك صلاحية تسجيل القطع ومسح الباركود بالجرد (عرض فقط).' : 'Read-only view: You do not have permission to count stock.'}</span>
              </div>
            )
          ) : (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold">
                <CheckCircle2 className="w-5 h-5" />
                <span>
                  {language === 'ar'
                    ? 'تم اعتماد وتسوية هذه الجلسة وتحديث المخزون بنجاح.'
                    : 'This stock audit has been reconciled and applied to inventory.'}
                </span>
              </div>
              <span className="text-[11px] font-mono">
                {activeAudit.completed_at ? new Date(activeAudit.completed_at).toLocaleString() : ''}
              </span>
            </div>
          )}

          {/* Quick Metrics KPI Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="p-4 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                {t('expectedStock')}
              </span>
              <div className="text-xl font-black text-white font-mono">
                {activeAudit.total_expected_items}
              </div>
              <span className="text-[10px] text-zinc-500 block">
                {items.length} {language === 'ar' ? 'موديل / مقاس' : 'SKU Variants'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                {t('countedStock')}
              </span>
              <div className="text-xl font-black text-amber-400 font-mono">
                {activeAudit.total_counted_items}
              </div>
              <span className="text-[10px] text-zinc-500 block">
                {language === 'ar' ? 'إجمالي القطع الممسوحة' : 'Scanned count'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                {t('discrepancy')}
              </span>
              <div
                className={`text-xl font-black font-mono ${
                  activeAudit.total_variance_items === 0
                    ? 'text-emerald-400'
                    : activeAudit.total_variance_items > 0
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {activeAudit.total_variance_items > 0 ? `+${activeAudit.total_variance_items}` : activeAudit.total_variance_items}
              </div>
              <span className="text-[10px] text-zinc-500 block">
                {discrepantCount} {language === 'ar' ? 'صنف غير مطابق' : 'Discrepancies'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                {t('varianceCost')}
              </span>
              <div
                className={`text-xl font-black font-mono ${
                  Number(activeAudit.total_variance_cost) === 0
                    ? 'text-emerald-400'
                    : Number(activeAudit.total_variance_cost) > 0
                    ? 'text-yellow-400'
                    : 'text-red-400'
                }`}
              >
                {formatCurrency(activeAudit.total_variance_cost)}
              </div>
              <span className="text-[10px] text-zinc-500 block">
                {language === 'ar' ? 'الأثر المالي للتكلفة' : 'Financial Impact'}
              </span>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="p-4 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Filter Tabs */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <button
                  onClick={() => setFilterTab('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterTab === 'all'
                      ? 'bg-zinc-800 text-white shadow'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  {language === 'ar' ? 'الكل' : 'All'} ({items.length})
                </button>
                <button
                  onClick={() => setFilterTab('discrepant')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition flex items-center gap-1 ${
                    filterTab === 'discrepant'
                      ? 'bg-amber-400 text-zinc-950 font-bold shadow'
                      : 'text-amber-400/80 hover:text-amber-300'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{language === 'ar' ? 'الفروقات فقط' : 'Discrepancies'} ({discrepantCount})</span>
                </button>
                <button
                  onClick={() => setFilterTab('deficit')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterTab === 'deficit'
                      ? 'bg-red-500 text-white font-bold shadow'
                      : 'text-red-400 hover:text-red-300'
                  }`}
                >
                  {t('deficitItems')} ({deficitCount})
                </button>
                <button
                  onClick={() => setFilterTab('surplus')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterTab === 'surplus'
                      ? 'bg-yellow-500 text-zinc-950 font-bold shadow'
                      : 'text-yellow-400 hover:text-yellow-300'
                  }`}
                >
                  {t('surplusItems')} ({surplusCount})
                </button>
                <button
                  onClick={() => setFilterTab('matched')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterTab === 'matched'
                      ? 'bg-emerald-500 text-zinc-950 font-bold shadow'
                      : 'text-emerald-400 hover:text-emerald-300'
                  }`}
                >
                  {t('matchedItems')} ({matchedCount})
                </button>
                <button
                  onClick={() => setFilterTab('uncounted')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    filterTab === 'uncounted'
                      ? 'bg-zinc-700 text-white font-bold shadow'
                      : 'text-zinc-500 hover:text-zinc-300'
                  }`}
                >
                  {t('uncountedItems')} ({uncountedCount})
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative w-full md:w-64">
                <Search className="w-3.5 h-3.5 absolute inset-y-0 start-3 my-auto text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search')}
                  className="w-full ps-9 pe-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {/* Reconciliation Action Button */}
            {activeAudit.status === 'in_progress' && (
              <div className="pt-3 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <p className="text-[11px] text-zinc-400">
                  {language === 'ar'
                    ? 'عند الانتهاء من المسح، اضغط الزر لاعتماد الفروقات وتحديث الأرصدة الفعلية في قاعدة البيانات.'
                    : 'Once physical counting is complete, reconcile to atomically update current inventory.'}
                </p>
                {canReconcile ? (
                  <button
                    onClick={() => setIsReconcileModalOpen(true)}
                    className="px-5 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 hover:from-emerald-400 hover:to-emerald-300 text-zinc-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 transition shrink-0"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{t('reconcileStock')}</span>
                  </button>
                ) : (
                  <div
                    title={language === 'ar' ? 'يتطلب صلاحية اعتماد وتسوية الجرد (مدير المتجر)' : 'Requires Manager Reconciliation Permission'}
                    className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-500 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-not-allowed"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{language === 'ar' ? 'اعتماد الجرد (صلاحية إدارة)' : 'Reconcile (Manager Only)'}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Discrepancy Table */}
          <div className="rounded-2xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-start">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
                    <th className="p-3.5 text-start">{t('modelName')}</th>
                    <th className="p-3.5 text-start">{t('sku')} / {t('barcode')}</th>
                    <th className="p-3.5 text-center">{t('expectedStock')}</th>
                    <th className="p-3.5 text-center">{t('countedStock')}</th>
                    <th className="p-3.5 text-center">{t('discrepancy')}</th>
                    <th className="p-3.5 text-end">{t('varianceCost')}</th>
                    <th className="p-3.5 text-end">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/40">
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-zinc-500">
                        {t('noData')}
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((itm) => {
                      const diff = itm.discrepancy
                      return (
                        <tr
                          key={itm.id}
                          className={`hover:bg-zinc-900/30 transition ${
                            diff < 0
                              ? 'bg-red-500/5'
                              : diff > 0
                              ? 'bg-yellow-500/5'
                              : itm.counted_quantity > 0
                              ? 'bg-emerald-500/5'
                              : ''
                          }`}
                        >
                          {/* Product Info */}
                          <td className="p-3.5">
                            <span className="font-bold text-white block">{itm.product_name}</span>
                            <span className="text-[10px] text-zinc-400">
                              {itm.brand_name} • {itm.color} / {itm.size}
                            </span>
                          </td>

                          {/* SKU & Barcode */}
                          <td className="p-3.5 font-mono">
                            <span className="text-amber-400 block text-[11px] font-bold">
                              {itm.variant_sku}
                            </span>
                            {itm.barcode && (
                              <span className="text-zinc-500 text-[10px] block">
                                {itm.barcode}
                              </span>
                            )}
                          </td>

                          {/* Expected Qty */}
                          <td className="p-3.5 text-center font-mono font-semibold text-zinc-300">
                            {itm.expected_quantity}
                          </td>

                          {/* Counted Qty */}
                          <td className="p-3.5 text-center font-mono">
                            {canCount && activeAudit.status === 'in_progress' ? (
                              <button
                                onClick={() => {
                                  setEditingItem(itm)
                                  setManualCountInput(itm.counted_quantity)
                                }}
                                className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 font-bold text-amber-400 transition"
                              >
                                {itm.counted_quantity}
                              </button>
                            ) : (
                              <span className="font-bold text-zinc-300">{itm.counted_quantity}</span>
                            )}
                          </td>

                          {/* Discrepancy Status */}
                          <td className="p-3.5 text-center">
                            {diff === 0 ? (
                              itm.counted_quantity > 0 ? (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  {language === 'ar' ? 'مطابق' : 'Matched'}
                                </span>
                              ) : (
                                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-500 border border-zinc-700">
                                  {language === 'ar' ? 'لم يُجرد' : 'Uncounted'}
                                </span>
                              )
                            ) : diff > 0 ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-500/10 text-yellow-400 border border-yellow-500/30 font-mono">
                                +{diff} ({language === 'ar' ? 'زيادة' : 'Surplus'})
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 font-mono">
                                {diff} ({language === 'ar' ? 'عجز' : 'Deficit'})
                              </span>
                            )}
                          </td>

                          {/* Variance Cost Impact */}
                          <td
                            className={`p-3.5 text-end font-mono font-bold ${
                              Number(itm.discrepancy_value) === 0
                                ? 'text-zinc-400'
                                : Number(itm.discrepancy_value) > 0
                                ? 'text-yellow-400'
                                : 'text-red-400'
                            }`}
                          >
                            {formatCurrency(itm.discrepancy_value)}
                          </td>

                          {/* Actions */}
                          <td className="p-3.5 text-end">
                            <div className="flex items-center justify-end gap-1">
                              {canCount && activeAudit.status === 'in_progress' && (
                                <>
                                  <button
                                    onClick={() => handleQuickAdjust(itm, -1)}
                                    title="-1"
                                    className="w-6 h-6 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => handleQuickAdjust(itm, 1)}
                                    title="+1"
                                    className="w-6 h-6 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-300 flex items-center justify-center font-bold"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </>
                              )}
                              {canPrintBarcode && (
                                <button
                                  onClick={() => handlePrintLabel(itm)}
                                  title={t('printBarcode')}
                                  className="p-1 rounded bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-amber-400 ms-1"
                                >
                                  <Tag className="w-3.5 h-3.5" />
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
        </>
      )}

      {/* New Audit Modal */}
      {isNewAuditModalOpen && canCreate && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c0c10] border border-[#1e1e26] rounded-2xl p-6 shadow-2xl space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ClipboardCheck className="w-5 h-5 text-amber-400" />
              <span>{t('newStocktake')}</span>
            </h2>

            <form onSubmit={handleCreateAudit} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  {language === 'ar' ? 'عنوان جلسة الجرد' : 'Stocktake Title'}
                </label>
                <input
                  type="text"
                  required
                  value={newAuditTitle}
                  onChange={(e) => setNewAuditTitle(e.target.value)}
                  placeholder={
                    language === 'ar'
                      ? 'مثال: جرد نهاية الموسم - صيف 2026'
                      : 'e.g. End of Season Inventory Count'
                  }
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  {t('notes')}
                </label>
                <textarea
                  rows={2}
                  value={newAuditNotes}
                  onChange={(e) => setNewAuditNotes(e.target.value)}
                  placeholder={language === 'ar' ? 'ملاحظات اختيارية...' : 'Optional notes...'}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsNewAuditModalOpen(false)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
                >
                  <span>{t('startStocktake')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manual Edit Quantity Modal */}
      {editingItem && canCount && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0c0c10] border border-[#1e1e26] rounded-2xl p-5 shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">
              {language === 'ar' ? 'تعديل الكمية الممسوحة يدوياً' : 'Manual Count Override'}
            </h3>
            <p className="text-xs text-zinc-400">
              {editingItem.product_name} ({editingItem.variant_sku})
            </p>

            <form onSubmit={handleSaveManualCount} className="space-y-4">
              <div>
                <label className="block text-[11px] text-zinc-400 mb-1">{t('countedStock')}</label>
                <input
                  type="number"
                  min={0}
                  required
                  value={manualCountInput}
                  onChange={(e) => setManualCountInput(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-base font-bold font-mono text-amber-400 focus:outline-none focus:border-amber-400"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-3 py-1.5 bg-zinc-900 text-zinc-300 text-xs rounded-xl"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-4 py-1.5 bg-amber-500 text-zinc-950 font-bold text-xs rounded-xl"
                >
                  {t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reconcile Confirmation Modal */}
      {isReconcileModalOpen && activeAudit && canReconcile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c0c10] border border-[#1e1e26] rounded-2xl p-6 shadow-2xl space-y-5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h2 className="text-base font-bold text-white">
                {language === 'ar' ? 'تأكيد اعتماد وتطبيق الجرد' : 'Confirm Stock Reconciliation'}
              </h2>
              <p className="text-xs text-zinc-400">
                {t('reconcileWarning')}
              </p>
            </div>

            {/* Discrepancy Summary Box */}
            <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs font-mono">
              <div className="flex justify-between text-zinc-400">
                <span>{t('expectedStock')}:</span>
                <span>{activeAudit.total_expected_items} units</span>
              </div>
              <div className="flex justify-between text-amber-400 font-bold">
                <span>{t('countedStock')}:</span>
                <span>{activeAudit.total_counted_items} units</span>
              </div>
              <div className="flex justify-between text-red-400 pt-1 border-t border-zinc-900">
                <span>{t('discrepancy')}:</span>
                <span>{activeAudit.total_variance_items} units</span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1 border-t border-zinc-900">
                <span>{t('varianceCost')}:</span>
                <span className={Number(activeAudit.total_variance_cost) < 0 ? 'text-red-400' : 'text-emerald-400'}>
                  {formatCurrency(activeAudit.total_variance_cost)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setIsReconcileModalOpen(false)}
                className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleReconcile}
                disabled={actionLoading}
                className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-400 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20"
              >
                {actionLoading ? t('loading') : (language === 'ar' ? 'تطبيق التحديثات فوراً' : 'Apply Updates')}
              </button>
            </div>
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
