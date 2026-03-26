'use client';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

function CrudSection({ title, queryKey, endpoint, fields }) {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({});

  const { data, isLoading } = useQuery({ queryKey: [queryKey], queryFn: () => api.get(endpoint).then(r => r.data) });

  const saveMutation = useMutation({
    mutationFn: (data) => editing ? api.put(`${endpoint}${editing.id}/`, data) : api.post(endpoint, data),
    onSuccess: () => { queryClient.invalidateQueries([queryKey]); setModalOpen(false); setEditing(null); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`${endpoint}${id}/`),
    onSuccess: () => queryClient.invalidateQueries([queryKey]),
  });

  const openAdd = () => {
    setEditing(null);
    setForm(Object.fromEntries(fields.map(f => [f.key, ''])));
    setModalOpen(true);
  };

  const openEdit = (item) => {
    setEditing(item);
    setForm(Object.fromEntries(fields.map(f => [f.key, item[f.key] || ''])));
    setModalOpen(true);
  };

  const items = data?.results || data || [];

  return (
    <div className="card" style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ fontWeight: 600, color: 'var(--gold)' }}>{title}</h3>
        <button className="btn-primary" onClick={openAdd} style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
          <HiOutlinePlus size={14} /> إضافة
        </button>
      </div>

      {isLoading ? <div className="loading-spinner" /> : (
        <table>
          <thead>
            <tr>
              {fields.map(f => <th key={f.key}>{f.label}</th>)}
              <th>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id}>
                {fields.map(f => <td key={f.key}>{item[f.key] || '—'}</td>)}
                <td>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => openEdit(item)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}><HiOutlinePencil size={16} /></button>
                    <button onClick={() => { if (confirm('هل أنت متأكد؟')) deleteMutation.mutate(item.id); }} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}><HiOutlineTrash size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Modal isOpen={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); }} title={editing ? `تعديل ${title}` : `إضافة ${title}`}>
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }}>
          {fields.map(f => (
            <div className="form-group" key={f.key}>
              <label className="form-label">{f.label}</label>
              {f.type === 'textarea' ? (
                <textarea value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} rows={2} />
              ) : (
                <input type={f.type || 'text'} required={f.required} value={form[f.key] || ''} onChange={e => setForm({ ...form, [f.key]: e.target.value })} />
              )}
            </div>
          ))}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>حفظ</button>
            <button type="button" className="btn-secondary" onClick={() => { setModalOpen(false); setEditing(null); }}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: storeInfo } = useQuery({ queryKey: ['store-info'], queryFn: () => api.get('/settings/store-info/').then(r => r.data) });
  const [storeForm, setStoreForm] = useState(null);

  const storeMutation = useMutation({
    mutationFn: (data) => api.put('/settings/store-info/', data),
    onSuccess: () => { queryClient.invalidateQueries(['store-info']); setStoreForm(null); },
  });

  return (
    <AppShell>
      <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>الإعدادات</h1>

      {/* Store Info */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontWeight: 600, color: 'var(--gold)' }}>بيانات المتجر</h3>
          {!storeForm && <button className="btn-secondary" onClick={() => setStoreForm(storeInfo)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>تعديل</button>}
        </div>
        {storeForm ? (
          <form onSubmit={e => { e.preventDefault(); storeMutation.mutate(storeForm); }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group"><label className="form-label">اسم المتجر</label><input value={storeForm.name} onChange={e => setStoreForm({ ...storeForm, name: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">الهاتف</label><input value={storeForm.phone} onChange={e => setStoreForm({ ...storeForm, phone: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">البريد</label><input type="email" value={storeForm.email} onChange={e => setStoreForm({ ...storeForm, email: e.target.value })} /></div>
              <div className="form-group"><label className="form-label">العنوان</label><input value={storeForm.address} onChange={e => setStoreForm({ ...storeForm, address: e.target.value })} /></div>
            </div>
            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
              <button type="submit" className="btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>حفظ</button>
              <button type="button" className="btn-secondary" onClick={() => setStoreForm(null)} style={{ padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}>إلغاء</button>
            </div>
          </form>
        ) : storeInfo ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.9rem' }}>
            <p><span style={{ color: 'var(--text-secondary)' }}>الاسم:</span> {storeInfo.name}</p>
            <p><span style={{ color: 'var(--text-secondary)' }}>الهاتف:</span> {storeInfo.phone}</p>
            <p><span style={{ color: 'var(--text-secondary)' }}>البريد:</span> {storeInfo.email}</p>
            <p><span style={{ color: 'var(--text-secondary)' }}>العنوان:</span> {storeInfo.address}</p>
          </div>
        ) : null}
      </div>

      <CrudSection title="الماركات" queryKey="brands" endpoint="/settings/brands/"
        fields={[{ key: 'name', label: 'الاسم', required: true }, { key: 'description', label: 'الوصف', type: 'textarea' }]} />

      <CrudSection title="الفئات" queryKey="categories" endpoint="/settings/categories/"
        fields={[{ key: 'name', label: 'الاسم', required: true }, { key: 'description', label: 'الوصف', type: 'textarea' }]} />

      <CrudSection title="الموردون" queryKey="suppliers" endpoint="/settings/suppliers/"
        fields={[{ key: 'name', label: 'الاسم', required: true }, { key: 'contact_person', label: 'جهة الاتصال' }, { key: 'phone', label: 'الهاتف' }, { key: 'email', label: 'البريد', type: 'email' }]} />

      <CrudSection title="أنواع العملاء" queryKey="customer-types" endpoint="/settings/customer-types/"
        fields={[{ key: 'name', label: 'الاسم', required: true }]} />

      <CrudSection title="طرق الدفع" queryKey="payment-methods" endpoint="/settings/payment-methods/"
        fields={[{ key: 'name', label: 'الاسم', required: true }]} />

      <CrudSection title="العملات" queryKey="currencies" endpoint="/settings/currencies/"
        fields={[{ key: 'code', label: 'الرمز', required: true }, { key: 'name', label: 'الاسم', required: true }, { key: 'exchange_rate_to_base', label: 'سعر الصرف', type: 'number', required: true }]} />

      <CrudSection title="نسب الضرائب" queryKey="tax-rates" endpoint="/settings/tax-rates/"
        fields={[{ key: 'name', label: 'الاسم', required: true }, { key: 'rate', label: 'النسبة (مثال: 0.14)', type: 'number', required: true }]} />
    </AppShell>
  );
}
