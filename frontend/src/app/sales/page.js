'use client';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { HiOutlinePlus, HiOutlineEye } from 'react-icons/hi';

export default function SalesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['sales', page],
    queryFn: () => api.get(`/sales/transactions/?page=${page}`).then(r => r.data),
  });

  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => api.get('/inventory/products/?page_size=100').then(r => r.data) });
  const { data: customers } = useQuery({ queryKey: ['customers-all'], queryFn: () => api.get('/customers/?page_size=100').then(r => r.data) });
  const { data: paymentMethods } = useQuery({ queryKey: ['payment-methods'], queryFn: () => api.get('/settings/payment-methods/').then(r => r.data) });
  const { data: taxRates } = useQuery({ queryKey: ['tax-rates'], queryFn: () => api.get('/settings/tax-rates/').then(r => r.data) });

  const [form, setForm] = useState({
    transaction_date: new Date().toISOString().slice(0, 16),
    customer: '', payment_method: '', overall_discount_percentage: '0', notes: '',
    items: [{ product: '', quantity_sold: 1, unit_price: '', item_discount_percentage: '0', tax_rate: '' }],
  });

  const addItem = () => setForm({ ...form, items: [...form.items, { product: '', quantity_sold: 1, unit_price: '', item_discount_percentage: '0', tax_rate: '' }] });
  const removeItem = (i) => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) });
  const updateItem = (i, field, value) => {
    const items = [...form.items];
    items[i] = { ...items[i], [field]: value };
    if (field === 'product') {
      const prod = (products?.results || products || []).find(p => p.id === parseInt(value));
      if (prod) items[i].unit_price = prod.suggested_selling_price;
    }
    setForm({ ...form, items });
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/sales/transactions/', data),
    onSuccess: () => { queryClient.invalidateQueries(['sales']); setModalOpen(false); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      customer: form.customer || null,
      items: form.items.map(i => ({
        product: parseInt(i.product),
        quantity_sold: parseInt(i.quantity_sold),
        unit_price: i.unit_price,
        item_discount_percentage: i.item_discount_percentage || '0',
        tax_rate: parseInt(i.tax_rate),
      })),
    };
    createMutation.mutate(payload);
  };

  const fmt = (n) => Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 });
  const transactions = data?.results || data || [];

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">المبيعات</h1>
        <button className="btn-primary" onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HiOutlinePlus size={18} /> عملية بيع جديدة
        </button>
      </div>

      {isLoading ? <div className="loading-spinner" /> : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table>
            <thead>
              <tr><th>#</th><th>التاريخ</th><th>العميل</th><th>طريقة الدفع</th><th>المبلغ</th><th>الربح</th><th>إجراءات</th></tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{new Date(t.transaction_date).toLocaleDateString('ar-EG')}</td>
                  <td>{t.customer_name || '—'}</td>
                  <td>{t.payment_method_name}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(t.final_amount)} ج.م</td>
                  <td style={{ color: 'var(--accent-green)' }}>{fmt(t.total_profit)} ج.م</td>
                  <td>
                    <button onClick={() => setDetailModal(t)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}>
                      <HiOutlineEye size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data?.count && (
        <div className="pagination">
          <button disabled={!data.previous} onClick={() => setPage(p => p - 1)}>السابق</button>
          <span style={{ color: 'var(--text-secondary)' }}>صفحة {page}</span>
          <button disabled={!data.next} onClick={() => setPage(p => p + 1)}>التالي</button>
        </div>
      )}

      {/* New Sale Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="عملية بيع جديدة">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">التاريخ *</label>
              <input type="datetime-local" required value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">العميل</label>
              <select value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })}>
                <option value="">بدون عميل</option>
                {(customers?.results || customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">طريقة الدفع *</label>
              <select required value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                <option value="">اختر</option>
                {(paymentMethods?.results || paymentMethods || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">خصم عام %</label>
              <input type="number" step="0.01" value={form.overall_discount_percentage} onChange={e => setForm({ ...form, overall_discount_percentage: e.target.value })} />
            </div>
          </div>

          <h4 style={{ margin: '1rem 0 0.5rem', color: 'var(--gold)' }}>المنتجات</h4>
          {form.items.map((item, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>بحث بـ SKU</label>
                  <input placeholder="SKU..." value={item.sku || ''} onChange={e => updateItem(i, 'sku', e.target.value)} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>المنتج</label>
                  <select required value={item.product} onChange={e => updateItem(i, 'product', e.target.value)}>
                    <option value="">اختر المنتج</option>
                    {(products?.results || products || []).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.brand_name} - {p.model} (رصيد: {p.current_quantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>الكمية</label>
                  <input type="number" min="1" required value={item.quantity_sold} onChange={e => updateItem(i, 'quantity_sold', e.target.value)} />
                  {item._stock <= 0 && item._can_oversell && <p style={{ fontSize: '0.65rem', color: 'var(--gold)' }}>(طلب مسبق)</p>}
                  {item._stock < item.quantity_sold && !item._can_oversell && <p style={{ fontSize: '0.65rem', color: 'var(--accent-red)' }}>عجز: {item._stock - item.quantity_sold}</p>}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>السعر</label>
                  <input type="number" step="0.01" required value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                </div>
                <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', height: '38px' }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.35rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <select required value={item.tax_rate} onChange={e => updateItem(i, 'tax_rate', e.target.value)} style={{ fontSize: '0.8rem' }}>
                    <option value="">الضريبة</option>
                    {(taxRates?.results || taxRates || []).map(t => <option key={t.id} value={t.id}>{t.name} ({t.rate}%)</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <input type="number" step="0.01" placeholder="خصم %" value={item.item_discount_percentage} onChange={e => updateItem(i, 'item_discount_percentage', e.target.value)} style={{ fontSize: '0.8rem' }} />
                </div>
              </div>
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addItem} style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem', marginTop: '0.5rem' }}>
            + إضافة منتج
          </button>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'جاري الحفظ...' : 'تسجيل البيع'}
            </button>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!detailModal} onClose={() => setDetailModal(null)} title={`تفاصيل البيع #${detailModal?.id}`}>
        {detailModal && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              <p><span style={{ color: 'var(--text-secondary)' }}>التاريخ:</span> {new Date(detailModal.transaction_date).toLocaleDateString('ar-EG')}</p>
              <p><span style={{ color: 'var(--text-secondary)' }}>العميل:</span> {detailModal.customer_name || '—'}</p>
              <p><span style={{ color: 'var(--text-secondary)' }}>طريقة الدفع:</span> {detailModal.payment_method_name}</p>
              <p><span style={{ color: 'var(--text-secondary)' }}>الخصم العام:</span> {detailModal.overall_discount_percentage}%</p>
            </div>
            <table>
              <thead><tr><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الخصم</th><th>الإجمالي</th></tr></thead>
              <tbody>
                {(detailModal.items || []).map((item, i) => (
                  <tr key={i}>
                    <td>{item.product_name}</td>
                    <td>{item.quantity_sold}</td>
                    <td>{fmt(item.unit_price)} ج.م</td>
                    <td>{item.item_discount_percentage}%</td>
                    <td>{fmt(item.item_total_after_tax)} ج.م</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ marginTop: '1rem', textAlign: 'left', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <p style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--gold)' }}>الإجمالي: {fmt(detailModal.final_amount)} ج.م</p>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
