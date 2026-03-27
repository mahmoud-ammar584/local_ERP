'use client';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { HiOutlinePlus, HiOutlineEye, HiOutlineDownload } from 'react-icons/hi';

export default function SalesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [invoiceToPrint, setInvoiceToPrint] = useState(null);
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

  const handleSKULookup = (i, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const sku = form.items[i].sku;
      if (!sku) return;
      
      const prod = (products?.results || products || []).find(p => p.sku === sku);
      if (prod) {
        updateItem(i, 'product', prod.id.toString());
      }
    }
  };

  const createMutation = useMutation({
    mutationFn: (data) => api.post('/sales/transactions/', data),
    onSuccess: (res) => { 
      queryClient.invalidateQueries(['sales']); 
      setModalOpen(false); 
      setInvoiceToPrint(res.data); // Open invoice for printing immediately
    },
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

  const handleExport = async () => {
    try {
      const response = await api.get('/sales/transactions/export_csv/', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'sales_report.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Export failed', err);
    }
  };

  const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const transactions = data?.results || data || [];

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Sales</h1>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn-secondary" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HiOutlineDownload size={18} /> Export CSV
          </button>
          <button className="btn-primary" onClick={() => setModalOpen(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <HiOutlinePlus size={18} /> New sale
          </button>
        </div>
      </div>

      {isLoading ? <div className="loading-spinner" /> : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table>
            <thead>
              <tr><th>#</th><th>Date</th><th>Customer</th><th>Payment method</th><th>Amount</th><th>Profit</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {transactions.map(t => (
                <tr key={t.id}>
                  <td>{t.id}</td>
                  <td>{new Date(t.transaction_date).toLocaleDateString('en-US')}</td>
                  <td>{t.customer_name || '—'}</td>
                  <td>{t.payment_method_name}</td>
                  <td style={{ fontWeight: 600 }}>{fmt(t.final_amount)} EGP</td>
                  <td style={{ color: 'var(--accent-green)' }}>{fmt(t.total_profit)} EGP</td>
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
          <button disabled={!data.previous} onClick={() => setPage(p => p - 1)}>Previous</button>
          <span style={{ color: 'var(--text-secondary)' }}>Page {page}</span>
          <button disabled={!data.next} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
      )}

      {/* New Sale Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="New sale">
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">Date *</label>
              <input type="datetime-local" required value={form.transaction_date} onChange={e => setForm({ ...form, transaction_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">Customer</label>
              <select value={form.customer} onChange={e => setForm({ ...form, customer: e.target.value })}>
                <option value="">No customer</option>
                {(customers?.results || customers || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment method *</label>
              <select required value={form.payment_method} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                <option value="">Select</option>
                {(paymentMethods?.results || paymentMethods || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Overall discount %</label>
              <input type="number" step="0.01" value={form.overall_discount_percentage} onChange={e => setForm({ ...form, overall_discount_percentage: e.target.value })} />
            </div>
          </div>

          <h4 style={{ margin: '1rem 0 0.5rem', color: 'var(--gold)' }}>Items</h4>
          {form.items.map((item, i) => (
            <div key={i} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'end' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Lookup by SKU</label>
                  <input 
                    placeholder="SKU..." 
                    value={item.sku || ''} 
                    onChange={e => updateItem(i, 'sku', e.target.value)}
                    onKeyDown={e => handleSKULookup(i, e)}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Product</label>
                  <select required value={item.product} onChange={e => updateItem(i, 'product', e.target.value)}>
                    <option value="">Select product</option>
                    {(products?.results || products || []).map(p => (
                      <option key={p.id} value={p.id}>
                        {p.brand_name} - {p.model} (stock: {p.current_quantity})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Quantity</label>
                  <input type="number" min="1" required value={item.quantity_sold} onChange={e => updateItem(i, 'quantity_sold', e.target.value)} />
                  {item._stock <= 0 && item._can_oversell && <p style={{ fontSize: '0.65rem', color: 'var(--gold)' }}>(pre-order)</p>}
                  {item._stock < item.quantity_sold && !item._can_oversell && <p style={{ fontSize: '0.65rem', color: 'var(--accent-red)' }}>Shortage: {item._stock - item.quantity_sold}</p>}
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.7rem' }}>Unit price</label>
                  <input type="number" step="0.01" required value={item.unit_price} onChange={e => updateItem(i, 'unit_price', e.target.value)} />
                </div>
                <button type="button" onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer', height: '38px' }}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.35rem' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <select required value={item.tax_rate} onChange={e => updateItem(i, 'tax_rate', e.target.value)} style={{ fontSize: '0.8rem' }}>
                    <option value="">Tax</option>
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
          <InvoiceView data={detailModal} fmt={fmt} />
        )}
      </Modal>

      {/* Invoice Print Modal */}
      <Modal isOpen={!!invoiceToPrint} onClose={() => setInvoiceToPrint(null)} title="فاتورة المبيعات">
        {invoiceToPrint && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
              <button className="btn-primary" onClick={() => window.print()} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <HiOutlineDownload size={18} /> طباعة الفاتورة
              </button>
            </div>
            <div id="printable-invoice" className="printable-area">
              <InvoiceView data={invoiceToPrint} fmt={fmt} isPrint={true} />
            </div>
          </div>
        )}
      </Modal>

      <style jsx>{`
        @media print {
          body * { visibility: hidden; }
          .printable-area, .printable-area * { visibility: visible; }
          .printable-area { position: absolute; left: 0; top: 0; width: 100%; }
          .btn-primary, .btn-secondary, .modal-close { display: none !important; }
        }
      `}</style>
    </AppShell>
  );
}

function InvoiceView({ data, fmt, isPrint = false }) {
  return (
    <div style={{ padding: isPrint ? '2rem' : '0', color: isPrint ? '#000' : 'inherit', background: isPrint ? '#fff' : 'transparent' }}>
      <div style={{ textAlign: 'center', marginBottom: '1.5rem', borderBottom: '2px solid var(--gold)', paddingBottom: '1rem' }}>
        <h2 style={{ color: 'var(--gold)', marginBottom: '0.25rem' }}>LUXURY BOUTIQUE</h2>
        <p style={{ fontSize: '0.85rem', color: isPrint ? '#666' : 'var(--text-secondary)' }}>فاتورة مبيعات رقم #{data.id}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
        <div>
          <p><strong>التاريخ:</strong> {new Date(data.transaction_date).toLocaleString('ar-EG')}</p>
          <p><strong>العميل:</strong> {data.customer_name || 'عميل نقدي'}</p>
        </div>
        <div style={{ textAlign: 'left' }}>
          <p><strong>طريقة الدفع:</strong> {data.payment_method_name}</p>
        </div>
      </div>

      <table className="invoice-table">
        <thead>
          <tr>
            <th>الصنف</th>
            <th>SKU</th>
            <th>الكمية</th>
            <th>السعر</th>
            <th>الإجمالي</th>
          </tr>
        </thead>
        <tbody>
          {(data.items || []).map((item, i) => (
            <tr key={i}>
              <td style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                {item.product_image_url && (
                  <img src={item.product_image_url} alt="" style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} />
                )}
                <span>{item.product_name}</span>
              </td>
              <td>{item.product_sku}</td>
              <td style={{ textAlign: 'center' }}>{item.quantity_sold}</td>
              <td>{fmt(item.unit_price)}</td>
              <td style={{ fontWeight: 600 }}>{fmt(item.item_total_after_tax)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: '2rem', borderTop: '2px solid #eee', paddingTop: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <span>المبلغ قبل الخصم:</span>
          <span>{fmt(data.total_amount_before_tax)} ج.م</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
          <span>الخصم ({data.overall_discount_percentage}%):</span>
          <span>-{fmt(data.total_amount_before_tax * data.overall_discount_percentage / 100)} ج.م</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.3rem', fontWeight: 800, color: 'var(--gold)', marginTop: '0.5rem' }}>
          <span>الإجمالي النهائي:</span>
          <span>{fmt(data.final_amount)} ج.م</span>
        </div>
      </div>

      <div style={{ marginTop: '3rem', textAlign: 'center', fontSize: '0.8rem', color: '#888' }}>
        <p>شكراً لشرائكم من متجرنا</p>
      </div>

      <style jsx>{`
        .invoice-table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
        .invoice-table th { background: #f9f9f9; color: #333; text-align: right; padding: 0.75rem; border-bottom: 2px solid #eee; }
        .invoice-table td { padding: 0.75rem; border-bottom: 1px solid #eee; }
        :global(.dark-mode) .invoice-table th { background: rgba(255,255,255,0.05); color: var(--gold); }
      `}</style>
    </div>
  );
}
