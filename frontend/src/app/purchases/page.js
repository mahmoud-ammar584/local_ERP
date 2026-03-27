'use client';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { HiOutlinePlus, HiOutlineEye, HiOutlineCheck } from 'react-icons/hi';

const STATUS_MAP = { P: { label: 'معلق', cls: 'badge-warning' }, R: { label: 'مستلم', cls: 'badge-success' }, PR: { label: 'مستلم جزئياً', cls: 'badge-warning' }, C: { label: 'ملغي', cls: 'badge-danger' } };

export default function PurchasesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [receiveModal, setReceiveModal] = useState(null);
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ['purchases', page],
    queryFn: () => api.get(`/purchases/orders/?page=${page}`).then(r => r.data),
  });

  const { data: products } = useQuery({ queryKey: ['products-all'], queryFn: () => api.get('/inventory/products/?page_size=100').then(r => r.data) });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/settings/suppliers/').then(r => r.data) });
  const { data: currencies } = useQuery({ queryKey: ['currencies'], queryFn: () => api.get('/settings/currencies/').then(r => r.data) });

  const [form, setForm] = useState({
    supplier: '', order_date: new Date().toISOString().slice(0, 10), expected_delivery_date: '', currency: '',
    status: 'P',
    items: [{ product: '', ordered_quantity: 1, unit_cost_foreign: '' }],
  });

  const addItem = () => setForm({ ...form, items: [...form.items, { product: '', ordered_quantity: 1, unit_cost_foreign: '' }] });

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/purchases/orders/', data),
    onSuccess: () => { queryClient.invalidateQueries(['purchases']); setModalOpen(false); },
  });

  const receiveMutation = useMutation({
    mutationFn: ({ id, items }) => api.post(`/purchases/orders/${id}/receive/`, { items }),
    onSuccess: () => { queryClient.invalidateQueries(['purchases']); setReceiveModal(null); },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...form,
      items: form.items.map(i => ({
        product: parseInt(i.product), ordered_quantity: parseInt(i.ordered_quantity),
        unit_cost_foreign: i.unit_cost_foreign,
      })),
    };
    createMutation.mutate(payload);
  };

  const [receiveItems, setReceiveItems] = useState([]);

  const openReceive = (order) => {
    setReceiveItems(order.items.map(i => ({ item_id: i.id, quantity: 0, max: i.ordered_quantity - i.received_quantity, name: i.product_name })));
    setReceiveModal(order);
  };

  const handleReceive = () => {
    receiveMutation.mutate({ id: receiveModal.id, items: receiveItems.filter(i => i.quantity > 0) });
  };

  const fmt = (n) => Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 });
  const orders = data?.results || data || [];

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">المشتريات</h1>
        <button className="btn-primary" onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HiOutlinePlus size={18} /> طلب شراء جديد
        </button>
      </div>

      {isLoading ? <div className="loading-spinner" /> : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table>
            <thead><tr><th>#</th><th>المورد</th><th>التاريخ</th><th>الحالة</th><th>المبلغ</th><th>العملة</th><th>إجراءات</th></tr></thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id}>
                  <td>PO-{o.id}</td>
                  <td>{o.supplier_name}</td>
                  <td>{new Date(o.order_date).toLocaleDateString('ar-EG')}</td>
                  <td><span className={`badge ${STATUS_MAP[o.status]?.cls}`}>{STATUS_MAP[o.status]?.label}</span></td>
                  <td>{fmt(o.total_amount_foreign)}</td>
                  <td>{o.currency_code}</td>
                  <td style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => setDetailModal(o)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}>
                      <HiOutlineEye size={18} />
                    </button>
                    {o.status !== 'R' && o.status !== 'C' && (
                      <button onClick={() => openReceive(o)} style={{ background: 'none', border: 'none', color: 'var(--accent-green)', cursor: 'pointer' }}>
                        <HiOutlineCheck size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* New PO Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="طلب شراء جديد">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">المورد *</label>
              <select required value={form.supplier} onChange={e => setForm({ ...form, supplier: e.target.value })}>
                <option value="">اختر</option>
                {(suppliers?.results || suppliers || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">العملة *</label>
              <select required value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option value="">اختر</option>
                {(currencies?.results || currencies || []).map(c => <option key={c.id} value={c.id}>{c.code}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">تاريخ الطلب *</label>
              <input type="date" required value={form.order_date} onChange={e => setForm({ ...form, order_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">تاريخ التسليم المتوقع</label>
              <input type="date" value={form.expected_delivery_date} onChange={e => setForm({ ...form, expected_delivery_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">الحالة</label>
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                <option value="P">معلق (طلب شراء)</option>
                <option value="R">مستلم (فاتورة نهائية)</option>
              </select>
            </div>
          </div>
          <h4 style={{ margin: '1rem 0 0.5rem', color: 'var(--gold)' }}>المنتجات</h4>
          {form.items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <select required value={item.product} onChange={e => { const items = [...form.items]; items[i].product = e.target.value; setForm({ ...form, items }); }}>
                <option value="">المنتج</option>
                {(products?.results || products || []).map(p => <option key={p.id} value={p.id}>{p.brand_name} - {p.model} ({p.sku})</option>)}
              </select>
              <input type="number" min="1" placeholder="الكمية" value={item.ordered_quantity} onChange={e => { const items = [...form.items]; items[i].ordered_quantity = e.target.value; setForm({ ...form, items }); }} />
              <input type="number" step="0.01" placeholder="التكلفة" value={item.unit_cost_foreign} onChange={e => { const items = [...form.items]; items[i].unit_cost_foreign = e.target.value; setForm({ ...form, items }); }} />
              {form.items.length > 1 && <button type="button" onClick={() => setForm({ ...form, items: form.items.filter((_, idx) => idx !== i) })} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}>✕</button>}
            </div>
          ))}
          <button type="button" className="btn-secondary" onClick={addItem} style={{ fontSize: '0.85rem', padding: '0.3rem 0.75rem' }}>+ إضافة منتج</button>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
            <button type="submit" className="btn-primary" disabled={createMutation.isPending}>حفظ</button>
            <button type="button" className="btn-secondary" onClick={() => setModalOpen(false)}>إلغاء</button>
          </div>
        </form>
      </Modal>

      {/* Receive Modal */}
      <Modal isOpen={!!receiveModal} onClose={() => setReceiveModal(null)} title="استلام بضاعة">
        {receiveModal && (
          <div>
            <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>PO-{receiveModal.id} - {receiveModal.supplier_name}</p>
            {receiveItems.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', alignItems: 'center' }}>
                <span style={{ flex: 1 }}>{item.name}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>متبقي: {item.max}</span>
                <input type="number" min="0" max={item.max} style={{ width: '80px' }}
                  value={item.quantity} onChange={e => { const items = [...receiveItems]; items[i].quantity = parseInt(e.target.value) || 0; setReceiveItems(items); }} />
              </div>
            ))}
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
              <button className="btn-primary" onClick={handleReceive} disabled={receiveMutation.isPending}>تأكيد الاستلام</button>
              <button className="btn-secondary" onClick={() => setReceiveModal(null)}>إلغاء</button>
            </div>
          </div>
        )}
      </Modal>

      {/* Detail Modal */}
      <Modal isOpen={!!detailModal && !receiveModal} onClose={() => setDetailModal(null)} title={`تفاصيل الطلب PO-${detailModal?.id}`}>
        {detailModal && (
          <table>
            <thead><tr><th>المنتج</th><th>مطلوب</th><th>مستلم</th><th>التكلفة</th></tr></thead>
            <tbody>
              {(detailModal.items || []).map((item, i) => (
                <tr key={i}>
                  <td>{item.product_name}</td>
                  <td>{item.ordered_quantity}</td>
                  <td>{item.received_quantity}</td>
                  <td>{fmt(item.unit_cost_foreign)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>
    </AppShell>
  );
}
