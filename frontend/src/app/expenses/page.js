'use client';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash } from 'react-icons/hi';

const CATEGORIES = [
  { value: 'R', label: 'إيجار' }, { value: 'S', label: 'رواتب' },
  { value: 'U', label: 'مرافق' }, { value: 'M', label: 'تسويق' }, { value: 'O', label: 'أخرى' },
];

export default function ExpensesPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['expenses', page],
    queryFn: () => api.get(`/expenses/?page=${page}`).then(r => r.data),
  });

  const { data: paymentMethods } = useQuery({ queryKey: ['payment-methods'], queryFn: () => api.get('/settings/payment-methods/').then(r => r.data) });

  const saveMutation = useMutation({
    mutationFn: (data) => editing ? api.put(`/expenses/${editing.id}/`, data) : api.post('/expenses/', data),
    onSuccess: () => { queryClient.invalidateQueries(['expenses']); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/expenses/${id}/`),
    onSuccess: () => queryClient.invalidateQueries(['expenses']),
  });

  const [form, setForm] = useState({});
  const openAdd = () => { setEditing(null); setForm({ expense_date: new Date().toISOString().slice(0, 10), category: '', description: '', amount: '', payment_method: '', notes: '' }); setModalOpen(true); };
  const openEdit = (e) => { setEditing(e); setForm({ expense_date: e.expense_date, category: e.category, description: e.description, amount: e.amount, payment_method: e.payment_method, notes: e.notes || '' }); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditing(null); };

  const fmt = (n) => Number(n || 0).toLocaleString('ar-EG', { maximumFractionDigits: 0 });
  const expenses = data?.results || data || [];

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">المصروفات</h1>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HiOutlinePlus size={18} /> إضافة مصروف
        </button>
      </div>

      {isLoading ? <div className="loading-spinner" /> : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table>
            <thead><tr><th>التاريخ</th><th>الفئة</th><th>الوصف</th><th>المبلغ</th><th>طريقة الدفع</th><th>إجراءات</th></tr></thead>
            <tbody>
              {expenses.map(e => (
                <tr key={e.id}>
                  <td>{new Date(e.expense_date).toLocaleDateString('ar-EG')}</td>
                  <td><span className="badge badge-warning">{e.category_display}</span></td>
                  <td>{e.description}</td>
                  <td style={{ fontWeight: 600, color: 'var(--accent-red)' }}>{fmt(e.amount)} ج.م</td>
                  <td>{e.payment_method_name}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openEdit(e)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}><HiOutlinePencil size={18} /></button>
                      <button onClick={() => { if (confirm('هل أنت متأكد؟')) deleteMutation.mutate(e.id); }} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}><HiOutlineTrash size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'تعديل مصروف' : 'إضافة مصروف'}>
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group">
              <label className="form-label">التاريخ *</label>
              <input type="date" required value={form.expense_date || ''} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">الفئة *</label>
              <select required value={form.category || ''} onChange={e => setForm({ ...form, category: e.target.value })}>
                <option value="">اختر</option>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">المبلغ *</label>
              <input type="number" step="0.01" required value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div className="form-group">
              <label className="form-label">طريقة الدفع *</label>
              <select required value={form.payment_method || ''} onChange={e => setForm({ ...form, payment_method: e.target.value })}>
                <option value="">اختر</option>
                {(paymentMethods?.results || paymentMethods || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">الوصف *</label>
              <textarea required value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} />
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">ملاحظات</label>
              <textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>حفظ</button>
            <button type="button" className="btn-secondary" onClick={closeModal}>إلغاء</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
