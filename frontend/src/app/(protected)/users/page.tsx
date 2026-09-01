'use client'

import React, { useState, useEffect } from 'react'
import { useLanguage } from '@/lib/i18n'
import { getUsers, getInvitations, createInvitation, deleteInvitation, updateUser } from '@/lib/api'
import { useAuth, refreshSessionProfile, notifyAuthChange } from '@/lib/auth'
import {
  ShieldCheck,
  Plus,
  Mail,
  Copy,
  Check,
  UserPlus,
  Trash2,
  X,
  Edit3,
  CheckSquare,
  Square,
  Shield,
  User,
  Sparkles,
  Lock,
  Sliders,
  CheckCircle2,
  Tag,
  ClipboardCheck,
} from 'lucide-react'

interface ActionDef {
  key: string
  labelAr: string
  labelEn: string
  isDangerous?: boolean
}

interface ModuleDef {
  id: string
  labelAr: string
  labelEn: string
  actions: ActionDef[]
}

const AVAILABLE_MODULES: ModuleDef[] = [
  {
    id: 'dashboard',
    labelAr: 'لوحة التحكم والمؤشرات',
    labelEn: 'Dashboard Analytics',
    actions: [
      { key: 'view', labelAr: 'استعراض الإحصائيات العامة والمبيعات اليومية', labelEn: 'View Key Metrics & Reports' },
      { key: 'view_financials', labelAr: 'استعراض أرقام الأرباح والتكاليف وصافي الدخل', labelEn: 'View Profit & Margins', isDangerous: true },
    ],
  },
  {
    id: 'sales',
    labelAr: 'المبيعات ونقاط البيع (POS)',
    labelEn: 'Sales & POS',
    actions: [
      { key: 'view', labelAr: 'استعراض سجل الفواتير والمبيعات السابقة', labelEn: 'View Transactions History' },
      { key: 'add', labelAr: 'إتمام البيع والدفع السريع بالماسح الضوئي', labelEn: 'POS Fast Barcode Checkout' },
      { key: 'apply_discount', labelAr: 'صلاحية منح وتطبيق خصومات إضافية', labelEn: 'Apply Custom Discounts' },
      { key: 'refund', labelAr: 'صلاحية عمل المرتجعات واسترداد المبالغ', labelEn: 'Process Sales Returns & Refunds', isDangerous: true },
      { key: 'export_csv', labelAr: 'تصدير تقارير المبيعات إلى Excel / CSV', labelEn: 'Export Sales to CSV' },
    ],
  },
  {
    id: 'inventory',
    labelAr: 'المخزون والمنتجات والباركود',
    labelEn: 'Inventory, Products & Barcodes',
    actions: [
      { key: 'view', labelAr: 'استعراض كتالوج المنتجات والمقاسات والأرصدة', labelEn: 'View Product Catalog & Stock' },
      { key: 'add', labelAr: 'إضافة موديلات ومقاسات وألوان وصور جديدة', labelEn: 'Add New Products & Variants' },
      { key: 'edit', labelAr: 'تعديل أسعار البيع والتكلفة وبيانات الموديلات', labelEn: 'Edit Products & Prices' },
      { key: 'delete', labelAr: 'حذف الأصناف والموديلات من النظام', labelEn: 'Delete Products', isDangerous: true },
      { key: 'adjust_stock', labelAr: 'تعديل وتسوية الأرصدة المخزنية يدوياً', labelEn: 'Manual Stock Balance Adjustment', isDangerous: true },
      { key: 'print_barcode', labelAr: 'توليد وطباعة ملصقات الباركود والأسعار', labelEn: 'Generate & Print Barcode Labels' },
      { key: 'stocktake_view', labelAr: 'استعراض جلسات الجرد وكشف الفروقات', labelEn: 'View Stocktake Sessions' },
      { key: 'stocktake_count', labelAr: 'إجراء المسح الضوئي وتسجيل القطع بالجرد', labelEn: 'Perform Scanner Stocktake Counting' },
      { key: 'stocktake_create', labelAr: 'بدء وإنشاء جلسة جرد مخزني جديدة', labelEn: 'Create New Stocktake Session' },
      { key: 'stocktake_reconcile', labelAr: 'اعتماد وتسوية الجرد الفعلي على قاعدة البيانات', labelEn: 'Reconcile & Apply Stocktake to Stock', isDangerous: true },
    ],
  },
  {
    id: 'purchases',
    labelAr: 'المشتريات والموردين',
    labelEn: 'Purchases & Inward',
    actions: [
      { key: 'view', labelAr: 'استعراض أوامر الشراء والموردين', labelEn: 'View Purchase Orders' },
      { key: 'add', labelAr: 'إنشاء أمر شراء وتوريد جديد بالعملة الأجنبية', labelEn: 'Create Purchase Order' },
      { key: 'edit', labelAr: 'تعديل بيانات وتكاليف أمر الشراء', labelEn: 'Edit Purchase Order' },
      { key: 'receive', labelAr: 'استلام بضائع المورد في المخزن وتحديث الأرصدة', labelEn: 'Receive Goods Inward' },
      { key: 'manage_suppliers', labelAr: 'إضافة وتعديل بيانات الموردين وجهات الاتصال', labelEn: 'Manage Suppliers' },
      { key: 'delete', labelAr: 'إلغاء وحذف أوامر الشراء', labelEn: 'Delete Purchase Order', isDangerous: true },
    ],
  },
  {
    id: 'customers',
    labelAr: 'العملاء والديون',
    labelEn: 'Customers & Balances',
    actions: [
      { key: 'view', labelAr: 'استعراض سجل العملاء وحسابات الديون', labelEn: 'View Customer Accounts' },
      { key: 'add', labelAr: 'تسجيل عميل جديد وفتح حساب', labelEn: 'Add Customer' },
      { key: 'edit', labelAr: 'تعديل بيانات وحدود ائتمان العميل', labelEn: 'Edit Customer Details' },
      { key: 'manage_debt', labelAr: 'استعراض كشف الحساب وتسجيل سداد الديون', labelEn: 'Manage Debt & Payments' },
      { key: 'delete', labelAr: 'حذف العميل من النظام', labelEn: 'Delete Customer', isDangerous: true },
    ],
  },
  {
    id: 'expenses',
    labelAr: 'المصروفات التشغيلية',
    labelEn: 'Expenses',
    actions: [
      { key: 'view', labelAr: 'استعراض المصروفات والنفقات التشغيلية', labelEn: 'View Expenses' },
      { key: 'add', labelAr: 'تسجيل مصروف جديد ورفع الإيصالات', labelEn: 'Record New Expense' },
      { key: 'edit', labelAr: 'تعديل المصروفات السابقة', labelEn: 'Edit Expense' },
      { key: 'manage_categories', labelAr: 'إضافة وتعديل بنود وتصنيفات المصروفات', labelEn: 'Manage Expense Categories' },
      { key: 'delete', labelAr: 'حذف المصروف من النظام', labelEn: 'Delete Expense', isDangerous: true },
    ],
  },
  {
    id: 'settings',
    labelAr: 'الإعدادات والبيانات الأساسية',
    labelEn: 'Settings & Master Data',
    actions: [
      { key: 'view', labelAr: 'عرض بيانات المتجر والعملات والماركات', labelEn: 'View Settings' },
      { key: 'edit', labelAr: 'تعديل بيانات المتجر والفرع والعنوان', labelEn: 'Edit Store Profile' },
      { key: 'manage_tax', labelAr: 'تفعيل أو إيقاف ضريبة القيمة المضافة ونسبتها', labelEn: 'Configure VAT & Tax Rates', isDangerous: true },
      { key: 'sync_rates', labelAr: 'تحديث ومزامنة أسعار الصرف الحية للعملات', labelEn: 'Sync Live Exchange Rates' },
      { key: 'manage_brands', labelAr: 'إضافة وتعديل العلامات التجارية (Brands)', labelEn: 'Manage Brands' },
      { key: 'manage_categories', labelAr: 'إضافة وتعديل تصنيفات الموديلات (Categories)', labelEn: 'Manage Categories' },
    ],
  },
  {
    id: 'users',
    labelAr: 'إدارة فريق العمل والصلاحيات',
    labelEn: 'Team & RBAC',
    actions: [
      { key: 'view', labelAr: 'استعراض أعضاء الفريق والدعوات', labelEn: 'View Team Members' },
      { key: 'add', labelAr: 'دعوة موظفين جدد وتحديد صلاحياتهم', labelEn: 'Invite Staff & Set Perms' },
      { key: 'edit', labelAr: 'تعديل صلاحيات ومناصب الموظفين', labelEn: 'Modify Staff Permissions', isDangerous: true },
      { key: 'delete', labelAr: 'إلغاء الدعوات وحذف الموظفين', labelEn: 'Revoke Invites & Remove Staff', isDangerous: true },
    ],
  },
  {
    id: 'audit',
    labelAr: 'سجل العمليات والأمان',
    labelEn: 'Security Audit',
    actions: [
      { key: 'view', labelAr: 'استعراض سجل تحركات الموظفين وتفاصيل التدقيق الأمني', labelEn: 'View Audit Logs' },
    ],
  },
]

// Preset Role Templates
const ROLE_PRESETS: Record<string, { labelAr: string; labelEn: string; perms: Record<string, string[]> }> = {
  cashier: {
    labelAr: 'كاشير نقاط البيع (Cashier)',
    labelEn: 'POS Cashier',
    perms: {
      sales: ['view', 'add'],
      inventory: ['view', 'print_barcode'],
      customers: ['view', 'add'],
    },
  },
  inventory_officer: {
    labelAr: 'أمين مخزن وجرد (Inventory Clerk)',
    labelEn: 'Inventory Clerk',
    perms: {
      inventory: ['view', 'add', 'edit', 'adjust_stock', 'print_barcode', 'stocktake_view', 'stocktake_count'],
      purchases: ['view', 'receive'],
    },
  },
  auditor: {
    labelAr: 'مراقب جرد وتدقيق (Stock Auditor)',
    labelEn: 'Stock Auditor',
    perms: {
      inventory: ['view', 'stocktake_view', 'stocktake_count', 'stocktake_reconcile'],
      audit: ['view'],
    },
  },
  accountant: {
    labelAr: 'محاسب مالي (Accountant)',
    labelEn: 'Financial Accountant',
    perms: {
      dashboard: ['view'],
      sales: ['view', 'export_csv'],
      purchases: ['view'],
      customers: ['view', 'add', 'edit'],
      expenses: ['view', 'add', 'delete'],
      audit: ['view'],
    },
  },
  manager: {
    labelAr: 'مدير فرع (Branch Manager)',
    labelEn: 'Branch Manager',
    perms: {
      dashboard: ['view'],
      sales: ['view', 'add', 'apply_discount', 'export_csv'],
      inventory: ['view', 'add', 'edit', 'adjust_stock', 'print_barcode', 'stocktake_view', 'stocktake_count', 'stocktake_reconcile'],
      purchases: ['view', 'add', 'edit', 'receive'],
      customers: ['view', 'add', 'edit'],
      expenses: ['view', 'add'],
      settings: ['view'],
      users: ['view', 'add'],
      audit: ['view'],
    },
  },
  admin: {
    labelAr: 'مدير متجر شامل (Store Admin)',
    labelEn: 'Store Admin (Full)',
    perms: {
      dashboard: ['view'],
      sales: ['view', 'add', 'apply_discount', 'export_csv'],
      inventory: ['view', 'add', 'edit', 'delete', 'adjust_stock', 'print_barcode', 'stocktake_view', 'stocktake_count', 'stocktake_reconcile'],
      purchases: ['view', 'add', 'edit', 'receive'],
      customers: ['view', 'add', 'edit', 'delete'],
      expenses: ['view', 'add', 'delete'],
      settings: ['view', 'edit'],
      users: ['view', 'add', 'edit', 'delete'],
      audit: ['view'],
    },
  },
}

export default function UsersPage() {
  const { t, language } = useLanguage()
  const { user: currentUser, hasPermission } = useAuth()

  const [users, setUsers] = useState<any[]>([])
  const [invitations, setInvitations] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Permissions to manage users
  const canView = currentUser?.role === 'owner' || hasPermission('users', 'view')
  const canAddUser = hasPermission('users', 'add')
  const canEditUser = hasPermission('users', 'edit')
  const canDeleteUser = hasPermission('users', 'delete')

  // Invite Modal State
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('cashier')
  const [invitePermissions, setInvitePermissions] = useState<Record<string, string[]>>({
    sales: ['view', 'add'],
    inventory: ['view', 'print_barcode'],
    customers: ['view', 'add'],
  })
  const [generatedLink, setGeneratedLink] = useState('')
  const [copied, setCopied] = useState(false)
  const [inviting, setInviting] = useState(false)

  // Edit Permissions Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [editRole, setEditRole] = useState('cashier')
  const [editPermissions, setEditPermissions] = useState<Record<string, string[]>>({})
  const [savingEdit, setSavingEdit] = useState(false)

  async function loadData() {
    setLoading(true)
    try {
      const [u, i] = await Promise.all([getUsers(), getInvitations()])
      setUsers(Array.isArray(u) ? u : (u as any).results || [])
      setInvitations(Array.isArray(i) ? i : (i as any).results || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (canView || canAddUser || canEditUser || canDeleteUser) {
      loadData()
    } else {
      setLoading(false)
    }
  }, [canView, canAddUser, canEditUser, canDeleteUser])

  if (!canView && !canAddUser && !canEditUser && !canDeleteUser) {
    return (
      <div className="p-8 rounded-2xl bg-[#0c0c10] border border-red-500/30 text-center space-y-3">
        <div className="w-12 h-12 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-white">
          {language === 'ar' ? 'غير مصرح بالوصول إلى إدارة فريق العمل' : 'Access Restricted to Team Management'}
        </h2>
        <p className="text-xs text-zinc-400 max-w-md mx-auto">
          {language === 'ar'
            ? 'يتطلب حسابك الحصول على صلاحية إدارة المستخدمين والصلاحيات من قبل الإدارة.'
            : 'Your account does not have permission to view or manage team members.'}
        </p>
      </div>
    )
  }

  // Apply Role Preset Helper
  const applyPreset = (
    presetKey: string,
    setPerms: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
  ) => {
    const preset = ROLE_PRESETS[presetKey]
    if (preset) {
      setPerms(JSON.parse(JSON.stringify(preset.perms)))
    }
  }

  // --- Handlers for Invite ---
  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviting(true)
    try {
      const res: any = await createInvitation(inviteEmail, inviteRole, invitePermissions)
      const link = `${window.location.origin}/signup?token=${res.token}`
      setGeneratedLink(link)
      loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to create invite')
    } finally {
      setInviting(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(generatedLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDeleteInvite = async (id: number) => {
    if (!confirm(language === 'ar' ? 'هل أنت متأكد من إلغاء هذه الدعوة؟' : 'Are you sure you want to revoke this invitation?')) return
    try {
      await deleteInvitation(id)
      loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to delete invite')
    }
  }

  // --- Handlers for Edit Permissions ---
  const openEditModal = (targetUser: any) => {
    setEditingUser(targetUser)
    setEditRole(targetUser.role || 'cashier')
    setEditPermissions(targetUser.permissions || {})
    setIsEditModalOpen(true)
  }

  const handleSavePermissions = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingUser) return
    setSavingEdit(true)
    try {
      await updateUser(editingUser.id, {
        role: editRole,
        permissions: editPermissions,
      })
      await refreshSessionProfile()
      notifyAuthChange()
      setIsEditModalOpen(false)
      loadData()
    } catch (err: any) {
      alert(err.message || 'Failed to update user permissions')
    } finally {
      setSavingEdit(false)
    }
  }

  const togglePermission = (
    perms: Record<string, string[]>,
    setPerms: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
    module: string,
    action: string
  ) => {
    const current = perms[module] || []
    const updated = current.includes(action)
      ? current.filter((a) => a !== action)
      : [...current, action]
    setPerms({ ...perms, [module]: updated })
  }

  const toggleAllForModule = (
    perms: Record<string, string[]>,
    setPerms: React.Dispatch<React.SetStateAction<Record<string, string[]>>>,
    module: string,
    allActions: ActionDef[]
  ) => {
    const current = perms[module] || []
    const allActionKeys = allActions.map((a) => a.key)
    const isAllSelected = allActionKeys.every((a) => current.includes(a))
    setPerms({
      ...perms,
      [module]: isAllSelected ? [] : allActionKeys,
    })
  }

  // Render permission matrix inside modal
  const renderPermissionsMatrix = (
    perms: Record<string, string[]>,
    setPerms: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
  ) => {
    return (
      <div className="space-y-4">
        {/* Preset Templates Bar */}
        <div>
          <span className="text-[11px] font-bold text-zinc-400 block mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>{language === 'ar' ? 'نماذج جاهزة سريعة (Role Presets):' : 'Quick Role Templates:'}</span>
          </span>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(ROLE_PRESETS).map(([k, p]) => (
              <button
                key={k}
                type="button"
                onClick={() => applyPreset(k, setPerms)}
                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-500/40 rounded-lg text-[11px] font-semibold text-zinc-300 hover:text-amber-400 transition"
              >
                {language === 'ar' ? p.labelAr : p.labelEn}
              </button>
            ))}
          </div>
        </div>

        {/* Modules Breakdown */}
        <div className="space-y-3 max-h-96 overflow-y-auto pe-1">
          {AVAILABLE_MODULES.map((mod) => {
            const modPerms = perms[mod.id] || []
            const isAllSelected = mod.actions.every((a) => modPerms.includes(a.key))

            return (
              <div key={mod.id} className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800/80">
                <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-zinc-900">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">
                      {language === 'ar' ? mod.labelAr : mod.labelEn}
                    </span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                      {modPerms.length} / {mod.actions.length}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => toggleAllForModule(perms, setPerms, mod.id, mod.actions)}
                    className="text-[11px] text-amber-400 hover:underline font-semibold"
                  >
                    {isAllSelected ? (language === 'ar' ? 'إلغاء الكل' : 'Clear All') : (language === 'ar' ? 'تحديد الكل' : 'Select All')}
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {mod.actions.map((act) => {
                    const isChecked = modPerms.includes(act.key)
                    return (
                      <label
                        key={act.key}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border transition cursor-pointer ${
                          isChecked
                            ? 'bg-amber-500/10 border-amber-500/30 text-white'
                            : 'bg-zinc-900/50 border-zinc-800/50 text-zinc-400 hover:bg-zinc-900'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => togglePermission(perms, setPerms, mod.id, act.key)}
                          className="rounded text-amber-500 focus:ring-0 w-4 h-4 mt-0.5 bg-zinc-950 border-zinc-700"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-bold">
                              {language === 'ar' ? act.labelAr : act.labelEn}
                            </span>
                            {act.isDangerous && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                                حساس
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] font-mono text-zinc-500 block">
                            {mod.id}:{act.key}
                          </span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-400" />
            <span>{t('usersTitle')}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'ar'
              ? 'إدارة صلاحيات الموظفين الدقيقة ونقاط البيع والجرد والباركود'
              : 'Granular Role-Based Access Control, POS scanning & Stocktake permissions'}
          </p>
        </div>

        {canAddUser && (
          <button
            onClick={() => {
              setGeneratedLink('')
              setIsInviteModalOpen(true)
            }}
            className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>{t('inviteMember')}</span>
          </button>
        )}
      </div>

      {/* Team Members Table */}
      <div className="rounded-2xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs font-bold text-zinc-300">
            {language === 'ar' ? 'أعضاء الفريق النشطين' : 'Active Team Members'} ({users.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
                <th className="p-4 text-start">{t('username')}</th>
                <th className="p-4 text-start">{t('email')}</th>
                <th className="p-4 text-start">{t('role')}</th>
                <th className="p-4 text-start">{language === 'ar' ? 'الصلاحيات الفعالة' : 'Permissions'}</th>
                <th className="p-4 text-end">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {users.map((u) => {
                const isOwner = u.role === 'owner'
                const isAdmin = u.role === 'admin'
                const permCount = Object.values(u.permissions || {}).flat().length

                return (
                  <tr key={u.id} className="hover:bg-zinc-900/30 transition">
                    <td className="p-4 font-semibold text-white">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-xs font-bold text-amber-400">
                          {u.username[0]?.toUpperCase()}
                        </div>
                        <div>
                          <span>{u.first_name ? `${u.first_name} ${u.last_name || ''}` : u.username}</span>
                          <span className="block text-[10px] text-zinc-500 font-mono">@{u.username}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-zinc-400">{u.email || '—'}</td>
                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isOwner
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                            : isAdmin
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                            : 'bg-zinc-800 text-zinc-300 border border-zinc-700'
                        }`}
                      >
                        {isOwner && <Shield className="w-3 h-3" />}
                        <span>{u.role}</span>
                      </span>
                    </td>
                    <td className="p-4">
                      {isOwner ? (
                        <span className="text-[11px] text-amber-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>{language === 'ar' ? 'المالك (وصول شامل ودائم)' : 'Owner (Full Access)'}</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-zinc-300 font-bold">{permCount}</span>
                          <span className="text-zinc-500">{language === 'ar' ? 'صلاحية محددة' : 'assigned permissions'}</span>
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-end">
                      {canEditUser ? (
                        <button
                          onClick={() => openEditModal(u)}
                          disabled={isOwner && currentUser?.role !== 'owner'}
                          className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                          <span>{t('editPermissions')}</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-zinc-500 font-mono italic">
                          {language === 'ar' ? 'استعراض فقط' : 'View Only'}
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pending Invites Table */}
      <div className="rounded-2xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-xs font-bold text-zinc-300">
            {language === 'ar' ? 'الدعوات المعلقة' : 'Pending Email Invitations'} ({invitations.length})
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/50 text-zinc-400">
                <th className="p-4 text-start">{language === 'ar' ? 'البريد الإلكتروني' : 'Target Email'}</th>
                <th className="p-4 text-start">{t('role')}</th>
                <th className="p-4 text-start">{language === 'ar' ? 'تاريخ الانتهاء' : 'Expires At'}</th>
                <th className="p-4 text-end">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {invitations.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-6 text-center text-zinc-500">
                    {language === 'ar' ? 'لا توجد دعوات معلقة حالياً' : 'No pending invitations'}
                  </td>
                </tr>
              ) : (
                invitations.map((inv) => (
                  <tr key={inv.id} className="hover:bg-zinc-900/30 transition">
                    <td className="p-4 font-semibold text-white">{inv.email}</td>
                    <td className="p-4 text-zinc-400 capitalize">{inv.role}</td>
                    <td className="p-4 text-zinc-500">{new Date(inv.expires_at).toLocaleString()}</td>
                    <td className="p-4 text-end">
                      {canDeleteUser && (
                        <button
                          onClick={() => handleDeleteInvite(inv.id)}
                          className="text-zinc-500 hover:text-red-400 p-1 transition"
                          title={language === 'ar' ? 'إلغاء الدعوة' : 'Revoke Invitation'}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Edit User Role & Granular Permissions */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0c0c10] border border-zinc-800 rounded-2xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800 mb-5">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-amber-400" />
                <div>
                  <h2 className="text-base font-bold text-white">
                    {language === 'ar' ? 'تعديل صلاحيات العضو' : 'Edit Member Role & Permissions'}
                  </h2>
                  <p className="text-xs text-zinc-400">
                    {editingUser.first_name ? `${editingUser.first_name} ${editingUser.last_name || ''}` : editingUser.username} (@{editingUser.username})
                  </p>
                </div>
              </div>
              <button onClick={() => setIsEditModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePermissions} className="space-y-5">
              {/* Role Selection */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                  {language === 'ar' ? 'الدور الوظيفي (Role)' : 'Assigned Role'}
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={editingUser.role === 'owner'}
                  className="w-full px-3.5 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 disabled:opacity-60"
                >
                  <option value="cashier">Cashier / Staff (كاشير / موظف)</option>
                  <option value="admin">Store Admin (مدير المتجر)</option>
                  {currentUser?.role === 'owner' && <option value="owner">Store Owner (المالك)</option>}
                </select>
              </div>

              {/* Permissions Matrix - Enabled for all roles except Owner */}
              {editRole !== 'owner' ? (
                <div className="pt-3 border-t border-zinc-800">
                  {renderPermissionsMatrix(editPermissions, setEditPermissions)}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                  <Shield className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>
                    {language === 'ar'
                      ? 'حساب المالك (Owner) يمتلك وصولاً كاملاً ودائماً لجميع وظائف النظام وقواعد البيانات تلقائياً.'
                      : 'The Owner account has permanent, unconditional full access across all modules.'}
                  </span>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition"
                >
                  {savingEdit ? t('loading') : t('save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Invite Member */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0c0c10] border border-zinc-800 rounded-2xl p-6 shadow-2xl my-8">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800 mb-4">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>{t('inviteMember')}</span>
              </h2>
              <button onClick={() => setIsInviteModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {generatedLink ? (
              <div className="space-y-4 py-4">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs">
                  {language === 'ar'
                    ? 'تم إنشاء رابط الدعوة بنجاح! أرسل هذا الرابط للموظف لإكمال تسجيل حسابه:'
                    : 'Invitation link created successfully! Send this link to your team member to complete account setup:'}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedLink}
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 transition"
                  >
                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                    <span>{copied ? 'Copied' : t('copyLink')}</span>
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('inviteEmail')}</label>
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    placeholder="cashier@store.com"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">{t('inviteRole')}</label>
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="cashier">Cashier / Staff (كاشير / موظف)</option>
                    <option value="admin">Store Admin (مدير المتجر)</option>
                  </select>
                </div>

                {inviteRole !== 'admin' && (
                  <div className="pt-2 border-t border-zinc-800">
                    <span className="block text-xs font-bold text-zinc-300 mb-2">{t('permissionsLabel')}</span>
                    {renderPermissionsMatrix(invitePermissions, setInvitePermissions)}
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-3 border-t border-zinc-800">
                  <button
                    type="button"
                    onClick={() => setIsInviteModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={inviting}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-xs transition"
                  >
                    {inviting ? t('loading') : 'Generate Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
