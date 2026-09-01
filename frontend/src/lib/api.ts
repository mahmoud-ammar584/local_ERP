import { fetchJson, fetchFormData } from './http'

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

export interface ProductColorSummary {
  color: string
  image_url?: string
  count: number
}

export interface ProductVariant {
  id: number
  product?: number
  color: string
  size: string
  sku_suffix: string
  full_sku?: string
  barcode?: string
  image?: string
  image_url?: string
  effective_image_url?: string
  price_override?: number
  current_quantity?: number
  stock_quantity?: number
  effective_price?: number
  model_name?: string
  brand_name?: string
  brand_id?: number
  category_name?: string
  suggested_selling_price?: number
  is_exact_variant?: boolean
  all_variants?: ProductVariant[]
}

export interface Product {
  id: number
  sku: string
  barcode?: string
  model_name: string
  brand: number
  brand_name?: string
  category: number
  category_name?: string
  supplier?: number
  currency?: number
  season?: string
  image?: string
  image_url?: string
  primary_image_url?: string
  cost_foreign?: number
  cost_local?: number
  suggested_selling_price: number
  min_alert_quantity: number
  variants: ProductVariant[]
  colors?: ProductColorSummary[]
  total_stock?: number
  current_quantity?: number
  created_at: string
}

export interface PaymentMethod {
  id: number
  name: string
  code?: string
  is_active: boolean
  is_default?: boolean
}

export interface TaxRate {
  id: number
  name: string
  rate: number
  is_active: boolean
}

export interface StockAuditItem {
  id: number
  audit: number
  variant: number
  variant_sku: string
  product_name: string
  brand_name: string
  category_name?: string
  color: string
  size: string
  image_url?: string
  barcode?: string
  effective_price?: number
  expected_quantity: number
  counted_quantity: number
  unit_cost: number
  discrepancy: number
  discrepancy_value: number
  discrepancy_type: 'matched' | 'surplus' | 'deficit'
  notes?: string
  last_scanned_at?: string
  created_at: string
}

export interface StockAudit {
  id: number
  title: string
  status: 'draft' | 'in_progress' | 'completed' | 'cancelled'
  created_by?: number
  created_by_name?: string
  notes?: string
  created_at: string
  completed_at?: string
  reconciled_at?: string
  total_expected_items: number
  total_counted_items: number
  total_variance_items: number
  total_variance_cost: number | string
  items_count?: number
  items?: StockAuditItem[]
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
  product_image_url?: string
  color?: string
  size?: string
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
  final_total?: number
  paid_amount: number
  remaining_amount: number
  transaction_date: string
  created_at?: string
  created_by?: number
  created_by_username?: string
  created_by_name?: string
  lines?: any[]
  items?: SalesItem[]
}

export interface ReturnItem {
  id: number
  sales_item: number
  variant_sku?: string
  product_name?: string
  brand_name?: string
  color?: string
  size?: string
  unit_price: number
  quantity_returned: number
  refund_amount: number
  reason?: string
}

export interface ReturnTransaction {
  id: number
  return_date: string
  customer?: number
  customer_name?: string
  original_transaction: number
  original_invoice_number?: string
  reason?: string
  total_refund_amount: number
  items?: ReturnItem[]
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
  code?: string
  description?: string
}

export interface Expense {
  id: number
  category: number | string
  category_name?: string
  amount: number
  expense_date: string
  notes?: string
  receipt?: string
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
export interface Currency { id: number; code: string; name: string; exchange_rate_to_base: number }

export interface DashboardSummary {
  period: string
  total_sales: number
  total_cogs: number
  gross_profit: number
  total_expenses: number
  net_profit: number
  inventory_value: number
  low_stock_count: number
  total_orders: number
  average_order_value: number
}

export interface SalesOverTimeItem {
  date: string
  sales: number
  orders_count: number
}

export interface ExpenseByCategoryItem {
  category_name: string
  total_amount: number
}

export interface TopProductItem {
  variant_id: number
  product_name: string
  brand_name: string
  color: string
  size: string
  sku: string
  total_sold: number
  total_revenue: number
}

export interface TopCustomerItem {
  id: number
  name: string
  phone: string
  total_spent: number
  orders_count: number
}

// ---------------- API CLIENT FUNCTIONS ----------------

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
  fetchJson<TopCustomerItem[]>('/api/dashboard/top-customers/')

// Inventory & Products
export const getProducts = (params = '') =>
  fetchJson<Product[] | { results: Product[] }>(`/api/inventory/products/${params ? '?' + params : ''}`)

export const getProduct = (id: number) =>
  fetchJson<Product>(`/api/inventory/products/${id}/`)

export const createProduct = (data: Record<string, unknown>) =>
  fetchJson<Product>('/api/inventory/products/', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const uploadProductImage = (file: File, variantId?: number, productId?: number) => {
  const formData = new FormData()
  formData.append('image', file)
  if (variantId) formData.append('variant_id', String(variantId))
  if (productId) formData.append('product_id', String(productId))
  return fetchFormData<{ message: string; url: string; path: string }>('/api/inventory/products/upload-image/', formData)
}

export const addVariantToProduct = (
  productId: number,
  data:
    | {
        color: string
        size: string
        gender?: string
        barcode?: string
        image_url?: string
        initial_quantity?: number
        current_quantity?: number
        price_override?: number
      }
    | {
        variants: Array<{
          color: string
          size: string
          gender?: string
          barcode?: string
          image_url?: string
          initial_quantity?: number
          current_quantity?: number
          price_override?: number
        }>
      }
) =>
  fetchJson<any>(`/api/inventory/products/${productId}/add-variant/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const updateProduct = (id: number, data: Record<string, unknown>) =>
  fetchJson<Product>(`/api/inventory/products/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const adjustProductStock = (variantId: number, newQuantity: number, reason: string) =>
  fetchJson<any>('/api/inventory/products/adjust-stock/', {
    method: 'POST',
    body: JSON.stringify({ variant_id: variantId, new_quantity: newQuantity, reason }),
  })

export const lookupProductBySku = (sku: string) =>
  fetchJson<ProductVariant>(`/api/inventory/products/lookup/?q=${encodeURIComponent(sku)}`)

// Stocktake & Audits
export const getStockAudits = () =>
  fetchJson<StockAudit[] | { results: StockAudit[] }>('/api/inventory/stock-audits/')

export const getStockAudit = (id: number) =>
  fetchJson<StockAudit>(`/api/inventory/stock-audits/${id}/`)

export const createStockAudit = (title: string, notes?: string) =>
  fetchJson<StockAudit>('/api/inventory/stock-audits/', {
    method: 'POST',
    body: JSON.stringify({ title, notes }),
  })

export const scanStockAuditItem = (auditId: number, sku: string, quantity = 1) =>
  fetchJson<StockAudit>(
    `/api/inventory/stock-audits/${auditId}/scan/`,
    {
      method: 'POST',
      body: JSON.stringify({ sku, quantity }),
    }
  )

export const setStockAuditItemCount = (auditId: number, itemId: number, countedQuantity: number, notes?: string) =>
  fetchJson<StockAudit>(`/api/inventory/stock-audits/${auditId}/set-item-count/`, {
    method: 'POST',
    body: JSON.stringify({ item_id: itemId, counted_quantity: countedQuantity, notes }),
  })

export const reconcileStockAudit = (auditId: number) =>
  fetchJson<StockAudit>(`/api/inventory/stock-audits/${auditId}/reconcile/`, {
    method: 'POST',
  })

export const cancelStockAudit = (auditId: number, reason?: string) =>
  fetchJson<StockAudit>(`/api/inventory/stock-audits/${auditId}/cancel/`, {
    method: 'POST',
    body: JSON.stringify({ reason }),
  })

export const exportStockAuditCsvUrl = (auditId: number) =>
  `/api/inventory/stock-audits/${auditId}/export-csv/`

// Sales
export const getSalesTransactions = (params = '') =>
  fetchJson<SalesTransaction[] | { results: SalesTransaction[] }>(`/api/sales/transactions/${params ? '?' + params : ''}`)

export const createSalesTransaction = (data: Record<string, unknown>) =>
  fetchJson<SalesTransaction>('/api/sales/transactions/', {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getReturns = (params = '') =>
  fetchJson<ReturnTransaction[] | { results: ReturnTransaction[] }>(`/api/sales/returns/${params ? '?' + params : ''}`)

export const createReturnTransaction = (data: {
  original_transaction_id: number
  reason?: string
  items: Array<{
    sales_item_id: number
    quantity_returned: number
    reason?: string
  }>
}) =>
  fetchJson<ReturnTransaction>('/api/sales/returns/', {
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

export const recordCustomerPayment = (
  customerId: number,
  data: { amount: number; notes?: string; payment_type?: string }
) =>
  fetchJson<any>(`/api/customers/${customerId}/record-payment/`, {
    method: 'POST',
    body: JSON.stringify(data),
  })

export const getCustomerStatement = (customerId: number) =>
  fetchJson<{
    customer: Customer
    sales: SalesTransaction[]
    returns: ReturnTransaction[]
  }>(`/api/customers/${customerId}/statement/`)

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

export const updateUser = (id: number, data: Record<string, unknown>) =>
  fetchJson(`/api/auth/users/${id}/`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  })

export const deleteInvitation = (id: number) =>
  fetchJson(`/api/auth/invitations/${id}/`, { method: 'DELETE' })

// Audit
export const getAuditLogs = () =>
  fetchJson<any[]>('/api/core/audit-logs/')
