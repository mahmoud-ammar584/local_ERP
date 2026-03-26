'use client';
import AppShell from '@/components/AppShell';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, CartesianGrid
} from 'recharts';
import { HiOutlineCash, HiOutlineTrendingUp, HiOutlineCube, HiOutlineExclamation } from 'react-icons/hi';

const COLORS = ['#c9a84c', '#d4b96a', '#e74c3c', '#2ecc71', '#3498db'];

export default function DashboardPage() {
  const [period, setPeriod] = useState('month');

  const { data: summary } = useQuery({
    queryKey: ['dashboard-summary', period],
    queryFn: () => api.get(`/dashboard/summary/?period=${period}`).then(r => r.data),
  });

  const { data: salesChart } = useQuery({
    queryKey: ['sales-over-time', period],
    queryFn: () => api.get(`/dashboard/sales-over-time/?period=${period}`).then(r => r.data),
  });

  const { data: expensesPie } = useQuery({
    queryKey: ['expenses-by-category', period],
    queryFn: () => api.get(`/dashboard/expenses-by-category/?period=${period}`).then(r => r.data),
  });

  const { data: topProducts } = useQuery({
    queryKey: ['top-products', period],
    queryFn: () => api.get(`/dashboard/top-products/?period=${period}`).then(r => r.data),
  });

  const { data: topCustomers } = useQuery({
    queryKey: ['top-customers'],
    queryFn: () => api.get('/dashboard/top-customers/').then(r => r.data),
  });

  const fmt = (n) => Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 });

  const kpis = [
    { label: 'إجمالي المبيعات', value: `${fmt(summary?.total_sales)} ج.م`, icon: HiOutlineCash, color: 'var(--gold)' },
    { label: 'صافي الربح', value: `${fmt(summary?.total_profit)} ج.م`, icon: HiOutlineTrendingUp, color: 'var(--accent-green)' },
    { label: 'المصروفات', value: `${fmt(summary?.total_expenses)} ج.م`, icon: HiOutlineCash, color: 'var(--accent-red)' },
    { label: 'منتجات منخفضة المخزون', value: summary?.low_stock_count || 0, icon: HiOutlineExclamation, color: 'var(--accent-red)' },
  ];

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">لوحة التحكم</h1>
        <select value={period} onChange={e => setPeriod(e.target.value)}
          style={{ width: 'auto', padding: '0.5rem 1rem' }}>
          <option value="today">اليوم</option>
          <option value="week">آخر 7 أيام</option>
          <option value="month">هذا الشهر</option>
          <option value="year">هذه السنة</option>
        </select>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {kpis.map((kpi, i) => (
          <div key={i} className="kpi-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <kpi.icon size={28} style={{ color: kpi.color }} />
              <div>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{kpi.label}</p>
                <p style={{ fontSize: '1.4rem', fontWeight: 700, color: kpi.color }}>{kpi.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        {/* Sales Line Chart */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>المبيعات اليومية</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={salesChart || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" stroke="var(--text-secondary)" fontSize={12} />
              <YAxis stroke="var(--text-secondary)" fontSize={12} />
              <Tooltip
                contentStyle={{ background: 'var(--dark-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }}
                labelStyle={{ color: 'var(--text-secondary)' }}
              />
              <Line type="monotone" dataKey="total" stroke="var(--gold)" strokeWidth={2} dot={{ fill: 'var(--gold)' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expenses Pie Chart */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>توزيع المصروفات</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={expensesPie || []} dataKey="total" nameKey="category" cx="50%" cy="50%" outerRadius={80} label={({ category }) => category}>
                {(expensesPie || []).map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: 'var(--dark-card)', border: '1px solid var(--border-color)', borderRadius: '8px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        {/* Top Products */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>أعلى المنتجات مبيعاً</h3>
          <table>
            <thead>
              <tr><th>المنتج</th><th>الماركة</th><th>الكمية</th><th>الإيرادات</th></tr>
            </thead>
            <tbody>
              {(topProducts || []).map((p, i) => (
                <tr key={i}>
                  <td>{p.product__model}</td>
                  <td>{p.product__brand__name}</td>
                  <td>{p.total_qty}</td>
                  <td>{fmt(p.total_revenue)} ج.م</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Customers */}
        <div className="card">
          <h3 style={{ marginBottom: '1rem', fontWeight: 600 }}>أفضل العملاء</h3>
          <table>
            <thead>
              <tr><th>العميل</th><th>إجمالي المشتريات</th><th>إجمالي الربح</th></tr>
            </thead>
            <tbody>
              {(topCustomers || []).map((c, i) => (
                <tr key={i}>
                  <td>{c.name}</td>
                  <td>{fmt(c.total_purchases)} ج.م</td>
                  <td>{fmt(c.total_profit)} ج.م</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Net Income */}
      {summary && (
        <div className="card" style={{ marginTop: '1rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>صافي الدخل</p>
          <p style={{
            fontSize: '2rem', fontWeight: 800,
            color: summary.net_income >= 0 ? 'var(--accent-green)' : 'var(--accent-red)',
          }}>
            {fmt(summary.net_income)} ج.م
          </p>
        </div>
      )}
    </AppShell>
  );
}
