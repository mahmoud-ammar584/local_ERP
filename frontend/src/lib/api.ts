import { fetchJson } from './http'

// --- Types ---

export interface DashboardSummary {
  total_sales: number
  total_profit: number
  total_expenses: number
  net_income: number
  low_stock_count: number
  total_inventory_value: number
  total_transactions: number
}

export interface SalesOverTimeItem {
  date: string
  total: number
  count: number
}

export interface ExpenseByCategoryItem {
  category: string
  total: number
}

export interface TopProductItem {
  variant__product__model_name: string
  variant__product__brand__name: string
  total_qty: number
  total_revenue: number
}

export interface TopCustomerItem {
  id: number
  name: string
  total_purchases: number
  total_profit: number
}

export interface ProductVariant {
  id: number
  color: string
  size: string
  sku_suffix: string
  current_quantity?: number
}

export interface Product {
  id: number
  sku: string
  model_name: string
  brand: number
  brand_name?: string
  category: number
  category_name?: string
  supplier?: number
  currency?: number
  season?: string
  cost_foreign?: number
  cost_local?: number
  suggested_selling_price: number
  min_alert_quantity: number
  variants: ProductVariant[]
  total_stock?: number
  created_at: string
}

export interface Customer {
  id: number
  name: string
  phone: string
  email?: string
  address?: string
  customer_type?: number
  customer_type_name?: string
  current_balance: number
  total_purchases: number
}

export interface SalesItem {
  variant: number
  variant_sku?: string
  product_name?: string
  quantity_sold: number
  unit_price: number
  item_discount_percentage?: number
  tax_rate?: number
}

export interface SalesTransaction {
  id: number
  invoice_number?: string
  customer?: number
  customer_name?: string
  payment_method?: number
  payment_method_name?: string
  subtotal_amount: number
  discount_amount: number
  tax_amount: number
  final_amount: number
  paid_amount: number
  remaining_amount: number
  transaction_date: string
  items?: SalesItem[]
}

export interface PurchaseOrderItem {
  product: number
  variant?: number
  quantity_ordered: number
  unit_cost_foreign: number
}

export interface PurchaseOrder {
  id: number
  supplier: number
  supplier_name?: string
  invoice_number?: string
  order_date: string
  status: 'pending' | 'received' | 'cancelled'
  total_foreign_amount: number
  shipping_cost: number
  customs_cost: number
  items?: PurchaseOrderItem[]
}

export interface ExpenseCategory {
  id: number
  name: string
}

export interface Expense {
  id: number
  category: string | number
  category_name?: string
  amount: number
  expense_date: string
  notes?: string
}

export interface StoreInfo {
  store_name: string
  legal_name?: string
  tax_registration_number?: string
  phone?: string
  email?: string
  address?: string
  base_currency?: string
}

export interface Brand { id: number; name: string }
export interface Category { id: number; name: string }
export interface Supplier { id: number; name: string; contact_person?: string; phone?: string }
export interface PaymentMethod { id: number; name: string; code?: string }
export interface Currency { id: number; code: string; name: string; exchange_rate_to_base: number }
export interface TaxRate { id: number; name: string; percentage: number }

// --- API Functions ---

// Dashboard
export const getDashboardSummary = (period = 'month') =>
  fetchJson<DashboardSummary>(`/api/dashboard/summary/?period=${period}`)

export const getSalesOverTime = (period = 'month') =>
  fetchJson<SalesOverTimeItem[]>(`/api/dashboard/sales-over-time/?period=${period}`)

export const getExpensesByCategory = (period = 'month') =>
  fetchJson<ExpenseByCategoryItem[]>(`/api/dashboard/expenses-by-category/?period=${period}`)

export const getTopProducts = (period = 'month') =>
  fetchJson<TopProductItem[]>(`/api/dashboard/top-products/?period=${period}`)

export const getTopCustomers = () =>
  fetchJson<TopCustomerItem[]>(`/api/dashboard/top-customers/`)

// Inventory
export const getProducts = (params = '') =>
  fetchJson<Product[] | { results: Product[] }>(`/api/inventory/products/${params ? '?' + params : ''}`)

export const getProduct = (id: number) =>
  fetchJson<Product>(`/api/inventory/products/${id}/`)

export const createProduct = (data: Partial<Product>) =>
  fetchJson<Product>('/api/inventory/products/', { method: 'POST', body: JSON.stringify(data) })

export const updateProduct = (id: number, data: Partial<Product>) =>
  fetchJson<Product>(`/api/inventory/products/${id}/`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteProduct = (id: number) =>
  fetchJson(`/api/inventory/products/${id}/`, { method: 'DELETE' })

export const lookupProductBySku = (sku: string) =>
  fetchJson<ProductVariant>(`/api/inventory/products/lookup/?sku=${encodeURIComponent(sku)}`)

export const adjustProductStock = (variantId: number, newQuantity: number, reason: string) =>
  fetchJson('/api/inventory/products/adjust-stock/', {
    method: 'POST',
    body: JSON.stringify({ variant_id: variantId, new_quantity: newQuantity, reason }),
  })

// Sales
export const getSalesTransactions = (params = '') =>
  fetchJson<SalesTransaction[] | { results: SalesTransaction[] }>(`/api/sales/transactions/${params ? '?' + params : ''}`)

export const createSalesTransaction = (data: Record<string, unknown>) =>
  fetchJson<SalesTransaction>('/api/sales/transactions/', {
    method: 'POST',
    body: JSON.stringify(data),
  })

// Purchases
export const getPurchaseOrders = () =>
  fetchJson<PurchaseOrder[] | { results: PurchaseOrder[] }>('/api/purchases/orders/')

export const createPurchaseOrder = (data: Record<string, unknown>) =>
  fetchJson<PurchaseOrder>('/api/purchases/orders/', {
    method: 'POST',
    body: JSON.stringify(data),
  })

// Customers
export const getCustomers = (params = '') =>
  fetchJson<Customer[] | { results: Customer[] }>(`/api/customers/${params ? '?' + params : ''}`)

export const createCustomer = (data: Partial<Customer>) =>
  fetchJson<Customer>('/api/customers/', { method: 'POST', body: JSON.stringify(data) })

export const updateCustomer = (id: number, data: Partial<Customer>) =>
  fetchJson<Customer>(`/api/customers/${id}/`, { method: 'PUT', body: JSON.stringify(data) })

export const deleteCustomer = (id: number) =>
  fetchJson(`/api/customers/${id}/`, { method: 'DELETE' })

// Expenses
export const getExpenses = () =>
  fetchJson<Expense[] | { results: Expense[] }>('/api/expenses/')

export const createExpense = (data: Partial<Expense>) =>
  fetchJson<Expense>('/api/expenses/', { method: 'POST', body: JSON.stringify(data) })

export const deleteExpense = (id: number) =>
  fetchJson(`/api/expenses/${id}/`, { method: 'DELETE' })

export const getExpenseCategories = () =>
  fetchJson<ExpenseCategory[] | { results: ExpenseCategory[] }>('/api/expenses/categories/')

// Settings
export const getStoreInfo = () =>
  fetchJson<StoreInfo>('/api/settings/store-info/')

export const updateStoreInfo = (data: Partial<StoreInfo>) =>
  fetchJson<StoreInfo>('/api/settings/store-info/', { method: 'POST', body: JSON.stringify(data) })

export const getBrands = () =>
  fetchJson<Brand[] | { results: Brand[] }>('/api/settings/brands/')

export const createBrand = (data: { name: string }) =>
  fetchJson<Brand>('/api/settings/brands/', { method: 'POST', body: JSON.stringify(data) })

export const getCategories = () =>
  fetchJson<Category[] | { results: Category[] }>('/api/settings/categories/')

export const createCategory = (data: { name: string }) =>
  fetchJson<Category>('/api/settings/categories/', { method: 'POST', body: JSON.stringify(data) })

export const getSuppliers = () =>
  fetchJson<Supplier[] | { results: Supplier[] }>('/api/settings/suppliers/')

export const getPaymentMethods = () =>
  fetchJson<PaymentMethod[] | { results: PaymentMethod[] }>('/api/settings/payment-methods/')

export const getCurrencies = () =>
  fetchJson<Currency[] | { results: Currency[] }>('/api/settings/currencies/')

export const getTaxRates = () =>
  fetchJson<TaxRate[] | { results: TaxRate[] }>('/api/settings/tax-rates/')

// Users & Invites
export const getUsers = () =>
  fetchJson<any[]>('/api/auth/users/')

export const getInvitations = () =>
  fetchJson<any[]>('/api/auth/invitations/')

export const createInvitation = (email: string, role: string, permissions: Record<string, string[]>) =>
  fetchJson('/api/auth/invitations/', {
    method: 'POST',
    body: JSON.stringify({ email, role, permissions }),
  })

export const deleteInvitation = (id: number) =>
  fetchJson(`/api/auth/invitations/${id}/`, { method: 'DELETE' })

// Audit
export const getAuditLogs = () =>
  fetchJson<any[]>('/api/core/audit-logs/')
