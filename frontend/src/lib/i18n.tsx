'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'

export type Language = 'ar' | 'en'

const translations = {
  ar: {
    // Brand
    brandName: 'Funnel ERP',
    brandSubtitle: 'نظام إدارة محلات الأزياء الراقية',
    
    // Navigation
    navDashboard: 'لوحة التحكم',
    navInventory: 'المخزون والمنتجات',
    navSales: 'المبيعات ونقاط البيع',
    navPurchases: 'المشتريات والموردين',
    navCustomers: 'العملاء والديون',
    navExpenses: 'المصروفات',
    navSettings: 'الإعدادات والبيانات',
    navUsers: 'فريق العمل والصلاحيات',
    navAudit: 'سجل العمليات والأمان',
    logout: 'تسجيل الخروج',
    
    // Auth & Users
    loginTitle: 'تسجيل الدخول',
    loginSubtitle: 'يرجى إدخال بيانات حسابك للوصول للنظام',
    usernameOrEmail: 'اسم المستخدم أو البريد',
    password: 'كلمة المرور',
    signIn: 'دخول النظام',
    authenticating: 'جاري التحقق...',
    adminRole: 'مدير النظام',
    cashierRole: 'كاشير / موظف',
    activeTenant: 'المتجر / الشركة النشطة',

    // Dashboard
    dashboardTitle: 'نظرة عامة على الأداء',
    periodToday: 'اليوم',
    periodWeek: 'هذا الأسبوع',
    periodMonth: 'هذا الشهر',
    periodYear: 'هذا العام',
    totalSales: 'إجمالي المبيعات',
    totalProfit: 'إجمالي الأرباح',
    totalExpenses: 'إجمالي المصروفات',
    netIncome: 'صافي الدخل',
    inventoryValue: 'قيمة المخزون',
    lowStockAlert: 'تنبيهات نواقص المخزون',
    transactionsCount: 'عدد الفواتير',
    salesTrend: 'حركة المبيعات خلال الفترة',
    topSellingProducts: 'المنتجات الأكثر مبيعاً',
    topClients: 'أفضل العملاء نشاطاً',
    
    // Common Actions
    add: 'إضافة',
    edit: 'تعديل',
    delete: 'حذف',
    save: 'حفظ',
    cancel: 'إلغاء',
    search: 'بحث...',
    filter: 'تصفية',
    exportCsv: 'تصدير كملف إكسيل CSV',
    loading: 'جاري التحميل...',
    noData: 'لا توجد بيانات متاحة حالياً',
    actions: 'إجراءات',
    status: 'الحالة',
    date: 'التاريخ',
    amount: 'المبلغ',
    quantity: 'الكمية',
    price: 'السعر',
    total: 'الإجمالي',
    success: 'تمت العملية بنجاح',
    error: 'حدث خطأ ما',
    
    // Inventory
    productsTitle: 'كتالوج المنتجات والمخزون',
    addProduct: 'إضافة منتج جديد',
    sku: 'كود المنتج (SKU)',
    modelName: 'اسم الموديل',
    brand: 'العلامة التجارية (Brand)',
    category: 'التصنيف',
    supplier: 'المورد',
    cost: 'سعر التكلفة',
    sellingPrice: 'سعر البيع المقترح',
    stockQuantity: 'الكمية المتوفرة',
    adjustStock: 'تعديل الرصيد المخزني',
    reason: 'سبب التعديل',

    // Sales & POS
    posTitle: 'شاشة المبيعات ونقاط البيع (POS)',
    newSale: 'فاتورة بيع جديدة',
    searchProductOrBarcode: 'ابحث باسم الموديل أو امسح الباركود...',
    cart: 'سلة المشتريات',
    customer: 'العميل',
    walkInCustomer: 'عميل نقدي (عام)',
    paymentMethod: 'طريقة الدفع',
    discount: 'الخصم',
    tax: 'الضريبة',
    subtotal: 'المجموع الفرعي',
    finalTotal: 'المبلغ النهائي للدفع',
    completeSale: 'إتمام البيع وطباعة الفاتورة',
    salesHistory: 'سجل المعاملات السابقة',
    cash: 'نقداً (Cash)',
    visa: 'بطاقة ائتمان / فيزا',

    // Purchases
    purchasesTitle: 'أوامر الشراء وإدارة الموردين',
    newPurchaseOrder: 'أمر شراء جديد',
    invoiceNumber: 'رقم فاتورة المورد',
    shippingCost: 'مصاريف الشحن',
    customsCost: 'الجمارك والمصاريف',

    // Customers
    customersTitle: 'سجل العملاء وإدارة الديون',
    addCustomer: 'إضافة عميل جديد',
    customerName: 'اسم العميل',
    phone: 'رقم الهاتف',
    totalPurchases: 'إجمالي المشتريات',
    debtBalance: 'الرصيد / المديونية',
    customerType: 'نوع العميل',

    // Expenses
    expensesTitle: 'المصروفات التشغيلية',
    addExpense: 'تسجيل مصروف جديد',
    expenseCategory: 'بند المصروف',
    notes: 'ملاحظات وتفاصيل',

    // Settings
    settingsTitle: 'إعدادات النظام والبيانات الأساسية',
    storeInfo: 'بيانات المتجر والفرع',
    storeName: 'اسم المتجر',
    storeAddress: 'العنوان',
    taxNumber: 'الرقم الضريبي',
    currencies: 'العملات وأسعار الصرف',
    brandsAndCategories: 'الماركات والتصنيفات',
    
    // Users & Invites
    usersTitle: 'إدارة فريق العمل والدعوات',
    inviteMember: 'دعوة عضو جديد للفريق',
    inviteEmail: 'البريد الإلكتروني للعضو',
    inviteRole: 'الدور الوظيفي',
    inviteLink: 'رابط الدعوة',
    copyLink: 'نسخ الرابط',
    permissionsLabel: 'الصلاحيات الممنوحة',
  },
  en: {
    // Brand
    brandName: 'Funnel ERP',
    brandSubtitle: 'Luxury Retail Management System',
    
    // Navigation
    navDashboard: 'Dashboard',
    navInventory: 'Inventory',
    navSales: 'Sales & POS',
    navPurchases: 'Purchases',
    navCustomers: 'Customers',
    navExpenses: 'Expenses',
    navSettings: 'Settings',
    navUsers: 'Team & RBAC',
    navAudit: 'Security Audit',
    logout: 'Sign Out',
    
    // Auth & Users
    loginTitle: 'Sign In',
    loginSubtitle: 'Enter your credentials to access your ERP portal',
    usernameOrEmail: 'Username or Email',
    password: 'Password',
    signIn: 'Sign In',
    authenticating: 'Authenticating...',
    adminRole: 'Administrator',
    cashierRole: 'Cashier / Staff',
    activeTenant: 'Active Store / Company',

    // Dashboard
    dashboardTitle: 'Executive Overview',
    periodToday: 'Today',
    periodWeek: 'This Week',
    periodMonth: 'This Month',
    periodYear: 'This Year',
    totalSales: 'Total Revenue',
    totalProfit: 'Gross Profit',
    totalExpenses: 'Total Expenses',
    netIncome: 'Net Operating Income',
    inventoryValue: 'Inventory Asset Value',
    lowStockAlert: 'Low Stock Alerts',
    transactionsCount: 'Total Transactions',
    salesTrend: 'Sales Trajectory',
    topSellingProducts: 'Top Performing Products',
    topClients: 'Top Valuable Customers',
    
    // Common Actions
    add: 'Add',
    edit: 'Edit',
    delete: 'Delete',
    save: 'Save Changes',
    cancel: 'Cancel',
    search: 'Search...',
    filter: 'Filter',
    exportCsv: 'Export CSV Report',
    loading: 'Loading...',
    noData: 'No records available currently',
    actions: 'Actions',
    status: 'Status',
    date: 'Date',
    amount: 'Amount',
    quantity: 'Quantity',
    price: 'Price',
    total: 'Total',
    success: 'Operation completed successfully',
    error: 'An error occurred',
    
    // Inventory
    productsTitle: 'Product Catalog & Inventory',
    addProduct: 'New Product',
    sku: 'SKU Code',
    modelName: 'Model Name',
    brand: 'Brand',
    category: 'Category',
    supplier: 'Supplier',
    cost: 'Foreign Cost',
    sellingPrice: 'Suggested Selling Price',
    stockQuantity: 'Available Stock',
    adjustStock: 'Adjust Stock Balance',
    reason: 'Adjustment Reason',

    // Sales & POS
    posTitle: 'Point of Sale (POS)',
    newSale: 'New Transaction',
    searchProductOrBarcode: 'Scan barcode or search model name...',
    cart: 'Order Cart',
    customer: 'Customer',
    walkInCustomer: 'Walk-in Customer (General)',
    paymentMethod: 'Payment Method',
    discount: 'Discount',
    tax: 'Tax',
    subtotal: 'Subtotal',
    finalTotal: 'Grand Total',
    completeSale: 'Complete Sale & Print Receipt',
    salesHistory: 'Transaction History',
    cash: 'Cash',
    visa: 'Credit Card / Visa',

    // Purchases
    purchasesTitle: 'Purchase Orders & Supplier Inward',
    newPurchaseOrder: 'New Purchase Order',
    invoiceNumber: 'Supplier Invoice #',
    shippingCost: 'Shipping Cost',
    customsCost: 'Customs & Clearance',

    // Customers
    customersTitle: 'Customer Accounts & Ledger',
    addCustomer: 'Add Customer',
    customerName: 'Customer Name',
    phone: 'Phone Number',
    totalPurchases: 'Total Purchases',
    debtBalance: 'Outstanding Balance',
    customerType: 'Customer Tier',

    // Expenses
    expensesTitle: 'Operational Expenses',
    addExpense: 'Record Expense',
    expenseCategory: 'Expense Category',
    notes: 'Notes & Description',

    // Settings
    settingsTitle: 'System Settings & Master Data',
    storeInfo: 'Store Profile',
    storeName: 'Store Name',
    storeAddress: 'Physical Address',
    taxNumber: 'Tax Registration #',
    currencies: 'Currencies & Rates',
    brandsAndCategories: 'Brands & Classifications',
    
    // Users & Invites
    usersTitle: 'Team Management & Invitations',
    inviteMember: 'Invite Team Member',
    inviteEmail: 'Member Email Address',
    inviteRole: 'Assigned Role',
    inviteLink: 'Invitation Link',
    copyLink: 'Copy Link',
    permissionsLabel: 'Granular Permissions',
  }
}

interface LanguageContextType {
  language: Language
  setLanguage: (lang: Language) => void
  t: (key: keyof typeof translations['en']) => string
  dir: 'rtl' | 'ltr'
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'ar',
  setLanguage: () => {},
  t: (k) => k,
  dir: 'rtl',
})

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('ar')

  useEffect(() => {
    const saved = localStorage.getItem('funnel_erp_lang') as Language | null
    if (saved === 'ar' || saved === 'en') {
      setLanguageState(saved)
      document.documentElement.dir = saved === 'ar' ? 'rtl' : 'ltr'
      document.documentElement.lang = saved
    } else {
      document.documentElement.dir = 'rtl'
      document.documentElement.lang = 'ar'
    }
  }, [])

  const setLanguage = (lang: Language) => {
    setLanguageState(lang)
    localStorage.setItem('funnel_erp_lang', lang)
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = lang
  }

  const t = (key: keyof typeof translations['en']): string => {
    const dict = translations[language] || translations['en']
    return dict[key] || translations['en'][key] || String(key)
  }

  const dir = language === 'ar' ? 'rtl' : 'ltr'

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  return useContext(LanguageContext)
}
