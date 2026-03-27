'use client';
import AppShell from '@/components/AppShell';
import Modal from '@/components/Modal';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useState } from 'react';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineSearch } from 'react-icons/hi';

export default function CustomersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ['customers', search, page],
    queryFn: () => api.get(`/customers/?search=${search}&page=${page}`).then(r => r.data),
  });

  const { data: customerTypes } = useQuery({ queryKey: ['customer-types'], queryFn: () => api.get('/settings/customer-types/').then(r => r.data) });

  const [status, setStatus] = useState('');

  const saveMutation = useMutation({
    mutationFn: (data) => {
      setStatus('Saving...');
      const payload = {
        name: data.name,
        phone: data.phone || null,
        email: data.email || null,
        customer_type: parseInt(data.customer_type),
        address: data.address || '',
        notes: data.notes || '',
      };
      return editing ? api.put(`/customers/${editing.id}/`, payload) : api.post('/customers/', payload);
    },
    onSuccess: () => { 
      setStatus('Saved successfully!');
      queryClient.invalidateQueries(['customers']); 
      setTimeout(closeModal, 1000);
    },
    onError: (err) => {
      const msg = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      setStatus(`Error: ${msg}`);
      console.error(err);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/customers/${id}/`),
    onSuccess: () => queryClient.invalidateQueries(['customers']),
  });

  const [form, setForm] = useState({ name: '', phone: '', email: '', customer_type: '', address: '', notes: '' });
  const openAdd = () => { setEditing(null); setForm({ name: '', phone: '', email: '', customer_type: '', address: '', notes: '' }); setStatus(''); setModalOpen(true); };
  const openEdit = (c) => { 
    setEditing(c); 
    setForm({ 
      name: c.name, 
      phone: c.phone || '', 
      email: c.email || '', 
      customer_type: c.customer_type.toString(), 
      address: c.address || '', 
      notes: c.notes || '' 
    }); 
    setStatus(''); 
    setModalOpen(true); 
  };
  const closeModal = () => { setModalOpen(false); setEditing(null); setStatus(''); };

  // ... rest of the component

  const fmt = (n) => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const customers = data?.results || data || [];

  return (
    <AppShell>
      <div className="page-header">
        <h1 className="page-title">Customers</h1>
        <button className="btn-primary" onClick={openAdd} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <HiOutlinePlus size={18} /> Add customer
        </button>
      </div>

      <div style={{ marginBottom: '1rem', maxWidth: '400px' }}>
        <input placeholder="Search by name or phone..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
      </div>

      {isLoading ? <div className="loading-spinner" /> : (
        <div className="card" style={{ padding: 0, overflow: 'auto' }}>
          <table>
            <thead>
              <tr><th>Name</th><th>Phone</th><th>Type</th><th>Total purchases</th><th>Total profit</th><th>Last purchase</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {customers.map(c => (
                <tr key={c.id}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td style={{ direction: 'ltr', textAlign: 'right' }}>{c.phone || '—'}</td>
                  <td><span className="badge badge-warning">{c.customer_type_name}</span></td>
                  <td>{fmt(c.total_purchases)} EGP</td>
                  <td style={{ color: 'var(--accent-green)' }}>{fmt(c.total_profit)} EGP</td>
                  <td>{c.last_purchase_date ? new Date(c.last_purchase_date).toLocaleDateString('en-US') : '—'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button onClick={() => openEdit(c)} style={{ background: 'none', border: 'none', color: 'var(--gold)', cursor: 'pointer' }}><HiOutlinePencil size={18} /></button>
                      <button onClick={() => { if (confirm('Are you sure?')) deleteMutation.mutate(c.id); }} style={{ background: 'none', border: 'none', color: 'var(--accent-red)', cursor: 'pointer' }}><HiOutlineTrash size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={closeModal} title={editing ? 'Edit customer' : 'Add new customer'}>
        <form onSubmit={e => { e.preventDefault(); saveMutation.mutate(form); }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div className="form-group"><label className="form-label">Name *</label><input required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Phone</label><input value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
            <div className="form-group"><label className="form-label">Email</label><input type="email" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="form-group">
              <label className="form-label">Customer type *</label>
              <select required value={form.customer_type || ''} onChange={e => setForm({ ...form, customer_type: e.target.value })}>
                <option value="">Select</option>
                {(customerTypes?.results || customerTypes || []).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Address</label><textarea value={form.address || ''} onChange={e => setForm({ ...form, address: e.target.value })} rows={2} /></div>
            <div className="form-group" style={{ gridColumn: 'span 2' }}><label className="form-label">Notes</label><textarea value={form.notes || ''} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} /></div>
          </div>
          {status && (
            <div style={{ 
              marginTop: '1rem', 
              padding: '0.75rem', 
              borderRadius: '8px', 
              background: status.startsWith('Error') ? 'rgba(231, 76, 60, 0.1)' : 'rgba(46, 204, 113, 0.1)',
              color: status.startsWith('Error') ? 'var(--accent-red)' : 'var(--accent-green)',
              fontSize: '0.9rem',
              textAlign: 'center'
            }}>
              {status}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button type="submit" className="btn-primary" disabled={saveMutation.isPending}>Save</button>
            <button type="button" className="btn-secondary" onClick={closeModal}>Cancel</button>
          </div>
        </form>
      </Modal>
    </AppShell>
  );
}
