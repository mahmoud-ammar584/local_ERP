'use client';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { HiOutlineSearch, HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

export default function InventoryPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['products', search, page],
    queryFn: () => api.get(`/inventory/products/?search=${search}&page=${page}`).then(r => r.data),
  });

  const { data: brands } = useQuery({ queryKey: ['brands'], queryFn: () => api.get('/settings/brands/').then(r => r.data) });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => api.get('/settings/categories/').then(r => r.data) });
  const { data: suppliers } = useQuery({ queryKey: ['suppliers'], queryFn: () => api.get('/settings/suppliers/').then(r => r.data) });
  const { data: currencies } = useQuery({ queryKey: ['currencies'], queryFn: () => api.get('/settings/currencies/').then(r => r.data) });

  const saveMutation = useMutation({
    mutationFn: (data) => editing
      ? api.put(`/inventory/products/${editing.id}/`, data)
      : api.post('/inventory/products/', data),
    onSuccess: () => { queryClient.invalidateQueries(['products']); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/inventory/products/${id}/`),
    onSuccess: () => queryClient.invalidateQueries(['products']),
  });

  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  const openAdd = () => {
    setEditing(null);
    setForm({ sku: '', brand: '', category: '', model_name: '', gender: 'U', size: '',
      color: '', cost_foreign: '', currency: '', customs_cost: '0', shipping_cost: '0',
      suggested_selling_price: '', min_alert_quantity: '0', supplier: '', initial_quantity: '0' });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (product) => {
    setEditing(product);
    setForm({
      sku: product.sku, brand: product.brand, category: product.category,
      model_name: product.model_name, gender: product.gender, size: product.size,
      color: product.color, cost_foreign: product.cost_foreign, currency: product.currency,
      customs_cost: product.customs_cost, shipping_cost: product.shipping_cost,
      suggested_selling_price: product.suggested_selling_price,
      min_alert_quantity: product.min_alert_quantity, supplier: product.supplier,
      can_be_oversold: product.can_be_oversold || false,
      image: product.image,
    });
    setErrors({});
    setModalOpen(true);
  };

  const closeModal = () => { setModalOpen(false); setEditing(null); setErrors({}); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    
    // بنستخدم FormData عشان الصور
    const formData = new FormData();
    Object.keys(form).forEach(key => {
      if (key === 'image' && typeof form[key] === 'string') return; // ما نبعتش الـ URL كملف
      if (form[key] !== null && form[key] !== undefined) {
        formData.append(key, form[key]);
      }
    });

    try {
      if (editing) {
        await api.patch(`/inventory/products/${editing.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      } else {
        await api.post('/inventory/products/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }
      queryClient.invalidateQueries(['products']);
      closeModal();
    } catch (err) {
      if (err.response?.data) setErrors(err.response.data);
    }
  };

  const fmt = (n) => Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 });
  const products = data?.results || data || [];

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">المخزون</h1>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HiOutlinePlus size={18} /> إضافة منتج
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: '1rem', maxWidth: '400px' }}>
        <div className="search-box">
          <input placeholder="بحث بالاسم أو SKU..."
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      {isLoading ? <div className="loading-spinner" /> : (
        <>
          <div className="card" style={{ padding: 0, overflow: 'auto' }}>
            <table>
              <thead>
                <tr>
                  <th>الصورة</th><th>SKU</th><th>الماركة</th><th>الموديل</th><th>الفئة</th>
                  <th>المقاس</th><th>הلون</th><th>الكمية</th>
                  <th>التكلفة</th><th>سعر البيع</th><th>الربح المتوقع</th><th>إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {products.map(p => (
                  <tr key={p.id} className={p.is_low_stock ? 'low-stock-row' : ''}>
                    <td>
                      {p.image ? (
                        <img src={p.image} alt={p.model_name} style={{ width: '40px', height: '40px', borderRadius: '4px', objectFit: 'cover' }} />
                      ) : (
                        <div style={{ width: '40px', height: '40px', background: 'var(--dark-input)', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px', color: 'var(--text-secondary)' }}>لا يوجد</div>
                      )}
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>{p.sku}</td>
                    <td>{p.brand_name}</td>
                    <td>{p.model_name} {p.can_be_oversold && <span style={{ color: 'var(--gold)', fontSize: '0.7rem' }}>⭐</span>}</td>
                    <td>{p.category_name}</td>
                    <td>{p.size}</td>
                    <td>{p.color}</td>
                    <td>
                      <span className={p.is_low_stock ? 'badge badge-danger' : 'badge badge-success'}>
                        {p.current_quantity ?? 0}
                      </span>
                    </td>
                    <td>{fmt(p.total_cost)} ج.م</td>
                    <td>{fmt(p.suggested_selling_price)} ج.م</td>
                    <td style={{ color: p.expected_profit > 0 ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                      {fmt(p.expected_profit)} ج.م
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button onClick={() => openEdit(p)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}>
                          <HiOutlinePencil size={18} />
                        </button>
                        <button onClick={() => { if (confirm('هل أنت متأكد؟')) deleteMutation.mutate(p.id); }}
                          style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}>
                          <HiOutlineTrash size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.count && (
            <div className="pagination">
              <button disabled={!data.previous} onClick={() => setPage(p => p - 1)}>السابق</button>
              <span style={{ color: 'var(--text-secondary)' }}>صفحة {page}</span>
              <button disabled={!data.next} onClick={() => setPage(p => p + 1)}>التالي</button>
            </div>
          )}
        </>
      )}

      {/* Add/Edit Modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'تعديل منتج' : 'إضافة منتج جديد'}>
        <form onSubmit={handleSubmit}>
          {errors.non_field_errors && (
            <div style={{ color: 'var(--accent-red)', marginBottom: '1rem', padding: '0.5rem', background: 'rgba(231, 76, 60, 0.1)', borderRadius: '4px' }}>
              {errors.non_field_errors}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">SKU *</label>
              <input required value={form.sku || ''} onChange={e => setForm({ ...form, sku: e.target.value })} />
              {errors.sku && <p className="field-error">{errors.sku}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">الموديل *</label>
              <input required value={form.model_name || ''} onChange={e => setForm({ ...form, model_name: e.target.value })} />
              {errors.model_name && <p className="field-error">{errors.model_name}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">الماركة *</label>
              <select required value={form.brand || ''} onChange={e => setForm({ ...form, brand: e.target.value })}>
                <option value="">اختر</option>
                {(brands?.results || brands || []).map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              {errors.brand && <p className="field-error">{errors.brand}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">الفئة *</label>
              <select required value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">اختر</option>
                {(categories?.results || categories || []).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.category && <p className="field-error">{errors.category}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">الجنس</label>
              <select value={form.gender || 'U'} onChange={e => setForm({ ...form, gender: e.target.value })}>
                <option value="M">رجالي</option>
                <option value="F">نسائي</option>
                <option value="U">للجنسين</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">المقاس *</label>
              <input required value={form.size || ''} onChange={e => setForm({ ...form, size: e.target.value })} />
              {errors.size && <p className="field-error">{errors.size}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">اللون *</label>
              <input required value={form.color || ''} onChange={e => setForm({ ...form, color: e.target.value })} />
              {errors.color && <p className="field-error">{errors.color}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">المورد *</label>
              <select required value={form.supplier || ''} onChange={e => setForm({ ...form, supplier: e.target.value })}>
                <option value="">اختر</option>
                {(suppliers?.results || suppliers || []).map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {errors.supplier && <p className="field-error">{errors.supplier}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">التكلفة (عملة أجنبية) *</label>
              <input type="number" step="0.01" required value={form.cost_foreign || ''} onChange={e => setForm({ ...form, cost_foreign: e.target.value })} />
              {errors.cost_foreign && <p className="field-error">{errors.cost_foreign}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">العملة *</label>
              <select required value={form.currency || ''} onChange={e => setForm({ ...form, currency: e.target.value })}>
                <option value="">اختر</option>
                {(currencies?.results || currencies || []).map(c => <option key={c.id} value={c.id}>{c.code} - {c.name}</option>)}
              </select>
              {errors.currency && <p className="field-error">{errors.currency}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">تكلفة الجمارك</label>
              <input type="number" step="0.01" value={form.customs_cost || '0'} onChange={e => setForm({ ...form, customs_cost: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">تكلفة الشحن</label>
              <input type="number" step="0.01" value={form.shipping_cost || '0'} onChange={e => setForm({ ...form, shipping_cost: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">سعر البيع المقترح *</label>
              <input type="number" step="0.01" required value={form.suggested_selling_price || ''} onChange={e => setForm({ ...form, suggested_selling_price: e.target.value })} />
              {errors.suggested_selling_price && <p className="field-error">{errors.suggested_selling_price}</p>}
            </div>
            <div className="form-group">
              <label className="form-label">حد التنبيه</label>
              <input type="number" value={form.min_alert_quantity || '0'} onChange={e => setForm({ ...form, min_alert_quantity: e.target.value })} />
            </div>
            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingTop: '1.5rem' }}>
              <input type="checkbox" style={{ width: 'auto' }} checked={form.can_be_oversold || false} onChange={e => setForm({ ...form, can_be_oversold: e.target.checked })} />
              <label className="form-label" style={{ marginBottom: 0 }}>يسمح بالبيع بدون رصيد</label>
            </div>
            {!editing && (
              <div className="form-group">
                <label className="form-label">الكمية المبدئية</label>
                <input type="number" value={form.initial_quantity || '0'} onChange={e => setForm({ ...form, initial_quantity: e.target.value })} />
              </div>
            )}
            <div className="form-group">
              <label className="form-label">صورة المنتج</label>
              <input type="file" accept="image/*" onChange={e => setForm({ ...form, image: e.target.files[0] })} />
              {typeof form.image === 'string' && form.image && (
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>توجد صورة حالية</p>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-start' }}>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>
              {saveMutation.isPending ? 'جاري الحفظ...' : 'حفظ'}
            </button>
            <button type="button" className="btn-secondary" onClick={closeModal}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
