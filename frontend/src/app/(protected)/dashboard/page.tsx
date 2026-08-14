'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import {
  getDashboardSummary,
  getSalesOverTime,
  getTopProducts,
  getTopCustomers,
  DashboardSummary,
  SalesOverTimeItem,
  TopProductItem,
  TopCustomerItem,
} from '@/lib/api'
import {
  TrendingUp,
  DollarSign,
  Receipt,
  Package,
  AlertTriangle,
  FileText,
  ArrowUpRight,
  Sparkles,
  Calendar,
} from 'lucide-react'

export default function DashboardPage() {
  const { t, language } = useLanguage()
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month')
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [salesTrend, setSalesTrend] = useState<SalesOverTimeItem[]>([])
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([])
  const [topCustomers, setTopCustomers] = useState<TopCustomerItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadData() {
      setLoading(true)
      try {
        const [sumData, trendData, prodData, custData] = await Promise.all([
          getDashboardSummary(period),
          getSalesOverTime(period),
          getTopProducts(period),
          getTopCustomers(),
        ])
        setSummary(sumData)
        setSalesTrend(trendData || [])
        setTopProducts(prodData || [])
        setTopCustomers(custData || [])
      } catch (err) {
        console.error('Failed to load dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [period])

  const formatCurrency = (val: number | undefined) => {
    const num = Number(val || 0)
    return new Intl.NumberFormat(language === 'ar' ? 'ar-EG' : 'en-US', {
      style: 'currency',
      currency: 'EGP',
      maximumFractionDigits: 0,
    }).format(num)
  }

  return (
    <div className="space-y-6">
      {/* Header & Period Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>{t('dashboardTitle')}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'ar'
              ? 'مؤشرات الأداء المالي والمخزوني ونشاط المبيعات'
              : 'Real-time financial, sales velocity & inventory analytics'}
          </p>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800">
          {(['today', 'week', 'month', 'year'] as const).map((p) => {
            const labels = {
              today: t('periodToday'),
              week: t('periodWeek'),
              month: t('periodMonth'),
              year: t('periodYear'),
            }
            return (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                  period === p
                    ? 'bg-amber-400 text-zinc-950 shadow'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {labels[p]}
              </button>
            )
          })}
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales */}
        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] relative overflow-hidden group hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">{t('totalSales')}</span>
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-white">
            {loading ? '...' : formatCurrency(summary?.total_sales)}
          </div>
          <div className="mt-2 text-[11px] text-zinc-500 flex items-center gap-1">
            <FileText className="w-3 h-3" />
            <span>{summary?.total_transactions || 0} {t('transactionsCount')}</span>
          </div>
        </div>

        {/* Gross Profit */}
        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] relative overflow-hidden group hover:border-emerald-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">{t('totalProfit')}</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-400">
            {loading ? '...' : formatCurrency(summary?.total_profit)}
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">
            {language === 'ar' ? 'هامش الربح بعد خصم التكلفة' : 'Gross margin after product cost'}
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] relative overflow-hidden group hover:border-red-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">{t('totalExpenses')}</span>
            <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-400 flex items-center justify-center">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-red-400">
            {loading ? '...' : formatCurrency(summary?.total_expenses)}
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">
            {language === 'ar' ? 'المصروفات والإيجارات والتشغيل' : 'Store overhead & operational expenses'}
          </div>
        </div>

        {/* Net Income */}
        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] relative overflow-hidden group hover:border-amber-500/30 transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400">{t('netIncome')}</span>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-amber-600 to-amber-400 text-zinc-950 font-bold flex items-center justify-center">
              %
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-amber-300">
            {loading ? '...' : formatCurrency(summary?.net_income)}
          </div>
          <div className="mt-2 text-[11px] text-zinc-500">
            {language === 'ar' ? 'صافي العائد التشغيلي' : 'Net operating financial return'}
          </div>
        </div>
      </div>

      {/* Secondary KPIs (Inventory Value & Alerts) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-semibold">{t('inventoryValue')}</div>
              <div className="text-xl font-bold text-white mt-0.5">
                {loading ? '...' : formatCurrency(summary?.total_inventory_value)}
              </div>
            </div>
          </div>
          <span className="text-xs text-zinc-500">
            {language === 'ar' ? 'إجمالي تقييم البضاعة بالمتجر' : 'Total current stock value'}
          </span>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c0c10] border border-[#1e1e26] flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-zinc-400 font-semibold">{t('lowStockAlert')}</div>
              <div className="text-xl font-bold text-amber-400 mt-0.5">
                {loading ? '...' : `${summary?.low_stock_count || 0} ${language === 'ar' ? 'قطع قاربت على النفاد' : 'items near depletion'}`}
              </div>
            </div>
          </div>
          <a
            href="/inventory"
            className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
          >
            <span>{language === 'ar' ? 'عرض المخزون' : 'View Inventory'}</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Two Column Tables: Top Products & Top Customers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Selling Products */}
        <div className="p-6 rounded-2xl bg-[#0c0c10] border border-[#1e1e26]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-400" />
              <span>{t('topSellingProducts')}</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-3 text-start">{t('modelName')}</th>
                  <th className="pb-3 text-start">{t('brand')}</th>
                  <th className="pb-3 text-center">{t('quantity')}</th>
                  <th className="pb-3 text-end">{t('total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {topProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-zinc-500">
                      {t('noData')}
                    </td>
                  </tr>
                ) : (
                  topProducts.map((p, idx) => (
                    <tr key={idx} className="hover:bg-zinc-900/30">
                      <td className="py-3 font-semibold text-white">
                        {p.variant__product__model_name}
                      </td>
                      <td className="py-3 text-zinc-400">
                        {p.variant__product__brand__name || '—'}
                      </td>
                      <td className="py-3 text-center font-bold text-amber-400">
                        {p.total_qty}
                      </td>
                      <td className="py-3 text-end font-semibold text-emerald-400">
                        {formatCurrency(p.total_revenue)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Customers */}
        <div className="p-6 rounded-2xl bg-[#0c0c10] border border-[#1e1e26]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span>{t('topClients')}</span>
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-start">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="pb-3 text-start">{t('customerName')}</th>
                  <th className="pb-3 text-end">{t('totalPurchases')}</th>
                  <th className="pb-3 text-end">{t('totalProfit')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/40">
                {topCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-zinc-500">
                      {t('noData')}
                    </td>
                  </tr>
                ) : (
                  topCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-900/30">
                      <td className="py-3 font-semibold text-white">{c.name}</td>
                      <td className="py-3 text-end font-semibold text-amber-400">
                        {formatCurrency(c.total_purchases)}
                      </td>
                      <td className="py-3 text-end font-semibold text-emerald-400">
                        {formatCurrency(c.total_profit)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
