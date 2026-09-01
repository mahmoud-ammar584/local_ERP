'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useLanguage } from '@/lib/i18n'
import {
  getProducts,
  createProduct,
  updateProduct,
  adjustProductStock,
  getBrands,
  createBrand,
  getCategories,
  createCategory,
  getSuppliers,
  createSupplier,
  getCurrencies,
  uploadProductImage,
  addVariantToProduct,
  Product,
  ProductVariant,
  Brand,
  Category,
  Supplier,
  Currency,
} from '@/lib/api'
import { hasPermission } from '@/lib/auth'
import { BarcodeLabelModal, LabelProductData } from '@/components/BarcodeLabelModal'
import { ColorCombobox, LUXURY_COLOR_PRESETS } from '@/components/ColorCombobox'
import {
  Shirt,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Package,
  Layers,
  X,
  Tag,
  ClipboardCheck,
  Sparkles,
  Barcode,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Upload,
  Trash2,
  Copy,
  Check,
  Camera,
  PlusCircle,
  Loader2,
  Palette,
  CheckSquare,
  Square,
  Edit,
  DollarSign,
} from 'lucide-react'

const STANDARD_SIZES_PRESETS = [
  'XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size', 'Standard',
  '38', '39', '40', '41', '42', '43', '44', '45',
]

interface ColorEntry {
  id: string
  name: string
  imageUrl: string
  imageFile?: File
  uploading?: boolean
}

interface VariantMatrixRow {
  color: string
  size: string
  gender: string
  sku_suffix: string
  barcode: string
  current_quantity: number
  price_override?: number
  image_url: string
}

interface MultiSizeItem {
  size: string
  quantity: number
  barcode: string
  price_override?: number
}

export default function InventoryPage() {
  const { t, language } = useLanguage()
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Expanded Product IDs
  const [expandedProductIds, setExpandedProductIds] = useState<Record<number, boolean>>({})

  // Granular Permissions
  const canView = hasPermission('inventory', 'view')
  const canAdd = hasPermission('inventory', 'add')
  const canAdjust = hasPermission('inventory', 'adjust_stock')
  const canPrintBarcode = hasPermission('inventory', 'print_barcode')
  const canViewStocktake = hasPermission('inventory', 'stocktake_view') || hasPermission('inventory', 'stocktake_count')

  // Metadata for creating products
  const [brands, setBrands] = useState<Brand[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [currencies, setCurrencies] = useState<Currency[]>([])

  // --- Quick Creation Modals State ---
  const [isQuickBrandModalOpen, setIsQuickBrandModalOpen] = useState(false)
  const [quickBrandName, setQuickBrandName] = useState('')
  const [quickBrandSaving, setQuickBrandSaving] = useState(false)

  const [isQuickCategoryModalOpen, setIsQuickCategoryModalOpen] = useState(false)
  const [quickCategoryName, setQuickCategoryName] = useState('')
  const [quickCategorySaving, setQuickCategorySaving] = useState(false)

  const [isQuickSupplierModalOpen, setIsQuickSupplierModalOpen] = useState(false)
  const [quickSupplierName, setQuickSupplierName] = useState('')
  const [quickSupplierPhone, setQuickSupplierPhone] = useState('')
  const [quickSupplierSaving, setQuickSupplierSaving] = useState(false)

  // --- Quick Edit Product Modal State ---
  const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [editProductForm, setEditProductForm] = useState({
    model_name: '',
    suggested_selling_price: 0,
    cost_foreign: 0,
    brand: '',
    category: '',
    supplier: '',
    min_alert_quantity: 3,
  })
  const [editProductSaving, setEditProductSaving] = useState(false)

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState<{ id: number; name: string; currentQty: number } | null>(null)
  const [newQty, setNewQty] = useState<number>(0)
  const [adjustReason, setAdjustReason] = useState('Manual Stock Count')

  // --- Add Multi-Size Variants to Existing Product Modal State ---
  const [isAddVariantModalOpen, setIsAddVariantModalOpen] = useState(false)
  const [activeProductForVariant, setActiveProductForVariant] = useState<Product | null>(null)
  const [selectedColorName, setSelectedColorName] = useState('Black')
  
  const [selectedSizesMap, setSelectedSizesMap] = useState<Record<string, MultiSizeItem>>({
    'M': { size: 'M', quantity: 5, barcode: '' },
    'L': { size: 'L', quantity: 5, barcode: '' },
  })
  const [customSizeInput, setCustomSizeInput] = useState('')
  
  const [variantImageUrl, setVariantImageUrl] = useState('')
  const [uploadingVariantImage, setUploadingVariantImage] = useState(false)
  const [addingVariantSaving, setAddingVariantSaving] = useState(false)
  const [addVariantError, setAddVariantError] = useState('')

  // Uploading state tracking for direct variant table uploader
  const [uploadingVariantId, setUploadingVariantId] = useState<number | null>(null)
  const [uploadingProductId, setUploadingProductId] = useState<number | null>(null)

  // Barcode Label Modal State
  const [labelProduct, setLabelProduct] = useState<LabelProductData | null>(null)
  const [isLabelModalOpen, setIsLabelModalOpen] = useState(false)

  // Fullscreen Image Preview
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null)

  // Feedback Toast
  const [copiedSku, setCopiedSku] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  // Matrix Creation Form State (for New Products)
  const [form, setForm] = useState({
    sku: 'GC-POLO-01',
    barcode: '',
    model_name: '',
    brand: '',
    category: '',
    supplier: '',
    currency: '',
    season: 'SS25',
    cost_foreign: 0,
    suggested_selling_price: 0,
    profit_margin_percentage: 0,
    min_alert_quantity: 3,
  })

  const [colorsList, setColorsList] = useState<ColorEntry[]>([
    { id: '1', name: 'Black', imageUrl: '' },
    { id: '2', name: 'White', imageUrl: '' },
  ])

  const [sizesList, setSizesList] = useState<string[]>(['S', 'M', 'L', 'XL'])
  const [newSizeInput, setNewSizeInput] = useState('')

  const [matrixRows, setMatrixRows] = useState<VariantMatrixRow[]>([])
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({})
  const variantTableFileInputRef = useRef<HTMLInputElement>(null)
  const productTableFileInputRef = useRef<HTMLInputElement>(null)
  const [targetVariantForUpload, setTargetVariantForUpload] = useState<{ productId: number; variantId: number } | null>(null)
  const [targetProductForUpload, setTargetProductForUpload] = useState<number | null>(null)

  const showToast = (msg: string) => {
    setToastMessage(msg)
    setTimeout(() => setToastMessage(null), 3500)
  }

  async function loadInventory() {
    setLoading(true)
    try {
      const data = await getProducts(search ? `search=${encodeURIComponent(search)}` : '')
      const list = Array.isArray(data) ? data : data.results || []
      setProducts(list)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadMetadata() {
    try {
      const [b, c, s, curr] = await Promise.all([
        getBrands(),
        getCategories(),
        getSuppliers(),
        getCurrencies(),
      ])
      const bList = Array.isArray(b) ? b : (b as any).results || []
      const cList = Array.isArray(c) ? c : (c as any).results || []
      const sList = Array.isArray(s) ? s : (s as any).results || []
      const currList = Array.isArray(curr) ? curr : (curr as any).results || []

      setBrands(bList)
      setCategories(cList)
      setSuppliers(sList)
      setCurrencies(currList)

      if (bList.length > 0 && !form.brand) setForm((f) => ({ ...f, brand: String(bList[0].id) }))
      if (cList.length > 0 && !form.category) setForm((f) => ({ ...f, category: String(cList[0].id) }))
      if (sList.length > 0 && !form.supplier) setForm((f) => ({ ...f, supplier: String(sList[0].id) }))
      if (currList.length > 0 && !form.currency) setForm((f) => ({ ...f, currency: String(currList[0].id) }))
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadInventory()
    loadMetadata()
  }, [])

  // Auto-regenerate matrix when colors, sizes, or base sku change in Add Modal
  useEffect(() => {
    if (!isAddModalOpen) return
    generateMatrixRows()
  }, [colorsList, sizesList, form.sku])

  function toggleExpand(productId: number) {
    setExpandedProductIds((prev) => ({
      ...prev,
      [productId]: !prev[productId],
    }))
  }

  function handleCopySku(skuText: string) {
    navigator.clipboard.writeText(skuText)
    setCopiedSku(skuText)
    setTimeout(() => setCopiedSku(null), 2000)
  }

  function handlePrintLabel(product: Product, variant?: ProductVariant) {
    const selectedVariant = variant || product.variants?.[0]
    const labelData: LabelProductData = {
      model_name: product.model_name,
      brand_name: product.brand_name || 'Brand',
      sku: selectedVariant?.full_sku || `${product.sku}${selectedVariant?.sku_suffix || ''}`,
      barcode: selectedVariant?.barcode || product.barcode || '',
      price: selectedVariant?.effective_price || product.suggested_selling_price || 0,
      size: selectedVariant?.size,
      color: selectedVariant?.color,
    }
    setLabelProduct(labelData)
    setIsLabelModalOpen(true)
  }

  // --- Image Upload Handler for Variant Row in Table ---
  const handleTriggerVariantImageUpload = (productId: number, variantId: number) => {
    setTargetVariantForUpload({ productId, variantId })
    variantTableFileInputRef.current?.click()
  }

  const handleVariantTableFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !targetVariantForUpload) return

    setUploadingVariantId(targetVariantForUpload.variantId)
    try {
      const res = await uploadProductImage(file, targetVariantForUpload.variantId)
      setProducts((prev) =>
        prev.map((p) => {
          if (p.id === targetVariantForUpload.productId) {
            const updatedVariants = (p.variants || []).map((v) =>
              v.id === targetVariantForUpload.variantId ? { ...v, effective_image_url: res.url, image_url: res.url } : v
            )
            return { ...p, variants: updatedVariants }
          }
          return p
        })
      )
      showToast('تم رفع الصورة وضغطها بصيغة WebP بنجاح!')
    } catch (err: any) {
      alert(err.message || 'Failed to upload image')
    } finally {
      setUploadingVariantId(null)
      setTargetVariantForUpload(null)
      if (variantTableFileInputRef.current) variantTableFileInputRef.current.value = ''
    }
  }

  // --- Image Upload Handler for Product Row in Table ---
  const handleTriggerProductImageUpload = (productId: number) => {
    setTargetProductForUpload(productId)
    productTableFileInputRef.current?.click()
  }

  const handleProductTableFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !targetProductForUpload) return

    setUploadingProductId(targetProductForUpload)
    try {
      const res = await uploadProductImage(file, undefined, targetProductForUpload)
      setProducts((prev) =>
        prev.map((p) =>
          p.id === targetProductForUpload ? { ...p, image_url: res.url, primary_image_url: res.url } : p
        )
      )
      showToast('تم تحديث الصورة الرئيسية للمنتج بنجاح!')
    } catch (err: any) {
      alert(err.message || 'Failed to upload image')
    } finally {
      setUploadingProductId(null)
      setTargetProductForUpload(null)
      if (productTableFileInputRef.current) productTableFileInputRef.current.value = ''
    }
  }

  // --- Quick Create Actions ---
  const handleCreateQuickBrand = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickBrandName.trim()) return
    setQuickBrandSaving(true)
    try {
      const newBrand = await createBrand({ name: quickBrandName.trim() })
      setBrands((prev) => [...prev, newBrand])
      setForm((f) => ({ ...f, brand: String(newBrand.id) }))
      if (isEditProductModalOpen) setEditProductForm((f) => ({ ...f, brand: String(newBrand.id) }))
      showToast(`تم إنشاء واختيار ماركة (${newBrand.name}) بنجاح!`)
      setQuickBrandName('')
      setIsQuickBrandModalOpen(false)
    } catch (err: any) {
      alert(err.message || 'Failed to create brand')
    } finally {
      setQuickBrandSaving(false)
    }
  }

  const handleCreateQuickCategory = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickCategoryName.trim()) return
    setQuickCategorySaving(true)
    try {
      const newCat = await createCategory({ name: quickCategoryName.trim() })
      setCategories((prev) => [...prev, newCat])
      setForm((f) => ({ ...f, category: String(newCat.id) }))
      if (isEditProductModalOpen) setEditProductForm((f) => ({ ...f, category: String(newCat.id) }))
      showToast(`تم إنشاء واختيار تصنيف (${newCat.name}) بنجاح!`)
      setQuickCategoryName('')
      setIsQuickCategoryModalOpen(false)
    } catch (err: any) {
      alert(err.message || 'Failed to create category')
    } finally {
      setQuickCategorySaving(false)
    }
  }

  const handleCreateQuickSupplier = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!quickSupplierName.trim()) return
    setQuickSupplierSaving(true)
    try {
      const newSup = await createSupplier({
        name: quickSupplierName.trim(),
        phone: quickSupplierPhone.trim() || undefined,
      })
      setSuppliers((prev) => [...prev, newSup])
      setForm((f) => ({ ...f, supplier: String(newSup.id) }))
      if (isEditProductModalOpen) setEditProductForm((f) => ({ ...f, supplier: String(newSup.id) }))
      showToast(`تم إنشاء واختيار المورد (${newSup.name}) بنجاح!`)
      setQuickSupplierName('')
      setQuickSupplierPhone('')
      setIsQuickSupplierModalOpen(false)
    } catch (err: any) {
      alert(err.message || 'Failed to create supplier')
    } finally {
      setQuickSupplierSaving(false)
    }
  }

  // --- Quick Edit Product Details ---
  const handleOpenEditProduct = (product: Product) => {
    setEditingProduct(product)
    setEditProductForm({
      model_name: product.model_name,
      suggested_selling_price: Number(product.suggested_selling_price) || 0,
      cost_foreign: Number(product.cost_foreign) || 0,
      brand: String(product.brand || ''),
      category: String(product.category || ''),
      supplier: String(product.supplier || ''),
      min_alert_quantity: Number(product.min_alert_quantity) || 3,
    })
    setIsEditProductModalOpen(true)
  }

  const handleSaveEditProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingProduct) return
    setEditProductSaving(true)
    try {
      const updated = await updateProduct(editingProduct.id, {
        model_name: editProductForm.model_name.trim(),
        suggested_selling_price: Number(editProductForm.suggested_selling_price),
        cost_foreign: Number(editProductForm.cost_foreign),
        brand: Number(editProductForm.brand),
        category: Number(editProductForm.category),
        supplier: Number(editProductForm.supplier),
        min_alert_quantity: Number(editProductForm.min_alert_quantity),
      })
      showToast(`تم تحديث بيانات الصنف (${updated.model_name}) بنجاح!`)
      setIsEditProductModalOpen(false)
      loadInventory()
    } catch (err: any) {
      alert(err.message || 'Failed to update product')
    } finally {
      setEditProductSaving(false)
    }
  }

  // --- Open Multi-Size Variant Modal for Existing Product ---
  const handleOpenAddVariantModal = (product: Product) => {
    setActiveProductForVariant(product)
    
    // Default color
    const existingColor = product.colors?.[0]?.color || product.variants?.[0]?.color || 'Black'
    setSelectedColorName(existingColor)

    // Set default selected sizes
    setSelectedSizesMap({
      'S': { size: 'S', quantity: 5, barcode: '' },
      'M': { size: 'M', quantity: 5, barcode: '' },
      'L': { size: 'L', quantity: 5, barcode: '' },
    })
    setCustomSizeInput('')
    setVariantImageUrl('')
    setAddVariantError('')
    setIsAddVariantModalOpen(true)
  }

  // Toggle size selection in multi-size selector
  const toggleSizeSelection = (size: string) => {
    setSelectedSizesMap((prev) => {
      const next = { ...prev }
      if (next[size]) {
        delete next[size]
      } else {
        next[size] = { size, quantity: 5, barcode: '' }
      }
      return next
    })
  }

  const handleAddCustomSizeToSelection = () => {
    if (!customSizeInput.trim()) return
    const size = customSizeInput.trim().toUpperCase()
    setSelectedSizesMap((prev) => ({
      ...prev,
      [size]: prev[size] || { size, quantity: 5, barcode: '' },
    }))
    setCustomSizeInput('')
  }

  const handleUpdateSizeQty = (size: string, qty: number) => {
    setSelectedSizesMap((prev) => ({
      ...prev,
      [size]: { ...prev[size], quantity: Math.max(0, qty) },
    }))
  }

  const handleUploadModalVariantImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingVariantImage(true)
    try {
      const res = await uploadProductImage(file)
      setVariantImageUrl(res.url)
      showToast('تم رفع صورة اللون بنجاح!')
    } catch (err: any) {
      alert(err.message || 'Failed to upload image')
    } finally {
      setUploadingVariantImage(false)
    }
  }

  // Save all selected sizes for the color in 1 single Batch request!
  const handleSaveMultiSizeVariants = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeProductForVariant) return

    const finalColor = selectedColorName.trim()
    if (!finalColor) {
      setAddVariantError('يرجى تحديد أو كتابة اسم اللون')
      return
    }

    const sizesArray = Object.values(selectedSizesMap)
    if (sizesArray.length === 0) {
      setAddVariantError('يرجى اختيار مقاس واحد على الأقل')
      return
    }

    setAddingVariantSaving(true)
    setAddVariantError('')

    const batchPayload = {
      variants: sizesArray.map((item) => ({
        color: finalColor,
        size: item.size,
        gender: 'U',
        barcode: item.barcode.trim() || undefined,
        image_url: variantImageUrl.trim() || undefined,
        initial_quantity: Number(item.quantity) || 0,
      })),
    }

    try {
      await addVariantToProduct(activeProductForVariant.id, batchPayload)
      showToast(`تم إنشاء ${sizesArray.length} مقاسات للون (${finalColor}) بسعر الصنف الأساسي بنجاح!`)
      setIsAddVariantModalOpen(false)
      loadInventory()
    } catch (err: any) {
      setAddVariantError(err.message || 'فشل إضافة المقاسات')
    } finally {
      setAddingVariantSaving(false)
    }
  }

  // --- Add Product Modal: Matrix Generator ---
  function generateMatrixRows() {
    const rows: VariantMatrixRow[] = []
    const baseSku = form.sku.trim() || 'PRODUCT'

    colorsList.forEach((c) => {
      const colorClean = c.name.trim().replace(/\s+/g, '').toUpperCase() || 'STD'
      sizesList.forEach((s) => {
        const sizeClean = s.trim().replace(/\s+/g, '').toUpperCase() || 'STD'
        const suffix = `-${colorClean}-${sizeClean}`
        rows.push({
          color: c.name.trim() || 'Standard',
          size: s.trim() || 'Standard',
          gender: 'U',
          sku_suffix: suffix,
          barcode: '',
          current_quantity: 0,
          image_url: c.imageUrl || '',
        })
      })
    })

    setMatrixRows(rows)
  }

  function handleAddColor(colorName: string) {
    if (!colorName.trim()) return
    const name = colorName.trim()
    if (colorsList.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      return
    }
    setColorsList([...colorsList, { id: String(Date.now()), name, imageUrl: '' }])
  }

  function handleRemoveColor(id: string) {
    if (colorsList.length <= 1) return
    setColorsList(colorsList.filter((c) => c.id !== id))
  }

  async function handleColorImageUpload(colorId: string, file: File) {
    setColorsList((prev) =>
      prev.map((c) => (c.id === colorId ? { ...c, uploading: true } : c))
    )
    try {
      const res = await uploadProductImage(file)
      setColorsList((prev) =>
        prev.map((c) => (c.id === colorId ? { ...c, imageUrl: res.url, uploading: false } : c))
      )
      setMatrixRows((prev) =>
        prev.map((row) => {
          const matchingColor = colorsList.find((c) => c.id === colorId)
          if (matchingColor && row.color === matchingColor.name) {
            return { ...row, image_url: res.url }
          }
          return row
        })
      )
      showToast('تم رفع صورة اللون وضغطها WebP بنجاح!')
    } catch (err: any) {
      alert(err.message || 'Image upload failed')
      setColorsList((prev) =>
        prev.map((c) => (c.id === colorId ? { ...c, uploading: false } : c))
      )
    }
  }

  function handleAddSize() {
    if (!newSizeInput.trim()) return
    const size = newSizeInput.trim().toUpperCase()
    if (sizesList.includes(size)) {
      setNewSizeInput('')
      return
    }
    setSizesList([...sizesList, size])
    setNewSizeInput('')
  }

  function handleRemoveSize(size: string) {
    if (sizesList.length <= 1) return
    setSizesList(sizesList.filter((s) => s !== size))
  }

  function handleMatrixQtyChange(index: number, qty: number) {
    const updated = [...matrixRows]
    updated[index].current_quantity = Math.max(0, qty)
    setMatrixRows(updated)
  }

  function handleMatrixBarcodeChange(index: number, barcode: string) {
    const updated = [...matrixRows]
    updated[index].barcode = barcode
    setMatrixRows(updated)
  }

  function handleMatrixPriceChange(index: number, price: number) {
    const updated = [...matrixRows]
    updated[index].price_override = price > 0 ? price : undefined
    setMatrixRows(updated)
  }

  async function handleSaveNewProduct(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setFormError('')

    if (!form.sku || !form.model_name || !form.brand || !form.category || !form.supplier || !form.currency) {
      setFormError('Please fill all required basic fields.')
      setSaving(false)
      return
    }

    if (matrixRows.length === 0) {
      setFormError('Please add at least one color and one size variant.')
      setSaving(false)
      return
    }

    const payload = {
      sku: form.sku.trim(),
      barcode: form.barcode.trim() || undefined,
      model_name: form.model_name.trim(),
      brand: Number(form.brand),
      category: Number(form.category),
      supplier: Number(form.supplier),
      currency: Number(form.currency),
      season: form.season,
      cost_foreign: Number(form.cost_foreign),
      suggested_selling_price: Number(form.suggested_selling_price),
      profit_margin_percentage: Number(form.profit_margin_percentage),
      min_alert_quantity: Number(form.min_alert_quantity),
      variants: matrixRows.map((r) => ({
        color: r.color,
        size: r.size,
        gender: r.gender,
        sku_suffix: r.sku_suffix,
        barcode: r.barcode.trim() || undefined,
        current_quantity: Number(r.current_quantity) || 0,
        price_override: r.price_override,
        image_url: r.image_url || undefined,
      })),
    }

    try {
      await createProduct(payload)
      showToast('تم إنشاء المنتج ومصفوفة المتغيرات بنجاح!')
      setIsAddModalOpen(false)
      loadInventory()
    } catch (err: any) {
      setFormError(err.message || 'Failed to create product')
    } finally {
      setSaving(false)
    }
  }

  async function handleAdjustStock(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedVariant) return
    try {
      await adjustProductStock(selectedVariant.id, newQty, adjustReason)
      showToast('تم تعديل رصيد المخزون بنجاح')
      setIsAdjustModalOpen(false)
      loadInventory()
    } catch (err: any) {
      alert(err.message || 'Stock adjustment failed')
    }
  }

  return (
    <div className="space-y-6">
      {/* Hidden File Inputs for Table Uploads */}
      <input
        type="file"
        ref={variantTableFileInputRef}
        onChange={handleVariantTableFileChange}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={productTableFileInputRef}
        onChange={handleProductTableFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 end-6 z-50 px-4 py-3 rounded-2xl bg-emerald-500 text-zinc-950 font-bold text-xs shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Shirt className="w-5 h-5 text-amber-400" />
            <span>{t('navInventory')}</span>
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            {language === 'ar'
              ? 'إدارة مصفوفة الألوان والمقاسات، صور كل لون عالية الجودة، وأرصدة الـ SKU الفرعية بدقة'
              : 'Product Matrix Catalog with color-specific WebP compressed photos, deterministic SKUs, and live variant stocks'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {canViewStocktake && (
            <Link
              href="/inventory/stocktake"
              className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-amber-400/40 text-amber-400 text-xs font-bold rounded-xl flex items-center gap-1.5 transition shadow-sm"
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>{t('navStocktake')}</span>
            </Link>
          )}

          {canAdd && (
            <button
              onClick={() => {
                setIsAddModalOpen(true)
                generateMatrixRows()
              }}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition"
            >
              <Plus className="w-4 h-4" />
              <span>{language === 'ar' ? 'إضافة منتج جديد (مصفوفة ألوان ومقاسات)' : 'Add Product Matrix'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute start-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadInventory()}
            placeholder={
              language === 'ar'
                ? 'بحث بالـ SKU الكامل، كود اللون/المقاس، الباركود، أو اسم الموديل...'
                : 'Search by Variant SKU, Barcode, Color, Size, or Model...'
            }
            className="w-full ps-10 pe-4 py-2.5 bg-[#0c0c10] border border-[#1e1e26] focus:border-amber-400/50 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none transition shadow-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadInventory}
            className="p-2.5 bg-[#0c0c10] border border-[#1e1e26] hover:border-zinc-700 text-zinc-400 hover:text-white rounded-xl text-xs transition"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Products Table with Expandable Matrix Accordion */}
      <div className="rounded-3xl bg-[#0c0c10] border border-[#1e1e26] overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-start">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-950/60 text-zinc-400 uppercase tracking-wider text-[10px]">
                <th className="p-4 w-12 text-center">#</th>
                <th className="p-4 text-start">{t('sku')} الأساسي</th>
                <th className="p-4 text-start">اسم الموديل والماركة</th>
                <th className="p-4 text-start">الألوان المتوفرة</th>
                <th className="p-4 text-end">{t('sellingPrice')}</th>
                <th className="p-4 text-center">إجمالي الرصيد</th>
                <th className="p-4 text-end">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/40">
              {loading ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-500">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-400 mb-2" />
                    <span>{t('loading')}</span>
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-12 text-center text-zinc-500">
                    {t('noData')}
                  </td>
                </tr>
              ) : (
                products.map((p) => {
                  const isExpanded = !!expandedProductIds[p.id]
                  const variants = p.variants || []
                  const totalStock = p.total_stock ?? variants.reduce((acc, v) => acc + (v.stock_quantity ?? v.current_quantity ?? 0), 0)
                  const primaryImg = p.primary_image_url || p.image_url || variants[0]?.effective_image_url

                  return (
                    <React.Fragment key={p.id}>
                      {/* Parent Product Row */}
                      <tr className={`hover:bg-zinc-900/40 transition cursor-pointer ${isExpanded ? 'bg-zinc-900/30' : ''}`}>
                        <td className="p-4 text-center" onClick={() => toggleExpand(p.id)}>
                          <button className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition">
                            {isExpanded ? <ChevronDown className="w-4 h-4 text-amber-400" /> : <ChevronRight className="w-4 h-4" />}
                          </button>
                        </td>

                        <td className="p-4 font-mono font-bold text-amber-400" onClick={() => toggleExpand(p.id)}>
                          <div className="flex items-center gap-2">
                            <span>{p.sku}</span>
                            {p.barcode && (
                              <span className="text-[10px] text-zinc-500 font-normal">({p.barcode})</span>
                            )}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            {/* Product Photo Thumbnail with Direct Upload Button */}
                            <div className="relative group shrink-0">
                              {primaryImg ? (
                                <img
                                  src={primaryImg}
                                  alt={p.model_name}
                                  className="w-10 h-10 rounded-xl object-cover border border-zinc-800 cursor-pointer"
                                  onClick={() => setPreviewImageUrl(primaryImg)}
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-xl bg-zinc-900 border border-dashed border-zinc-700 flex items-center justify-center text-zinc-600">
                                  <Shirt className="w-4 h-4" />
                                </div>
                              )}
                              <button
                                type="button"
                                title="تحديث / رفع صورة للموديل"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleTriggerProductImageUpload(p.id)
                                }}
                                className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 rounded-xl flex items-center justify-center transition text-white"
                              >
                                {uploadingProductId === p.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                                ) : (
                                  <Camera className="w-3.5 h-3.5 text-amber-400" />
                                )}
                              </button>
                            </div>

                            <div onClick={() => toggleExpand(p.id)}>
                              <div className="font-semibold text-white text-sm">{p.model_name}</div>
                              <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                                <span className="text-amber-400/90 font-medium">{p.brand_name || '—'}</span>
                                <span>•</span>
                                <span>{p.category_name || '—'}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Colors Preview Badges */}
                        <td className="p-4" onClick={() => toggleExpand(p.id)}>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {p.colors && p.colors.length > 0 ? (
                              p.colors.map((c, idx) => (
                                <div
                                  key={idx}
                                  className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300"
                                >
                                  {c.image_url ? (
                                    <img
                                      src={c.image_url}
                                      alt={c.color}
                                      className="w-4 h-4 rounded object-cover border border-zinc-700 cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        setPreviewImageUrl(c.image_url || null)
                                      }}
                                    />
                                  ) : (
                                    <div className="w-2.5 h-2.5 rounded-full bg-amber-400/40" />
                                  )}
                                  <span className="font-medium">{c.color}</span>
                                </div>
                              ))
                            ) : (
                              <span className="text-zinc-500 text-[11px]">—</span>
                            )}
                          </div>
                        </td>

                        <td className="p-4 text-end font-bold text-white font-mono" onClick={() => toggleExpand(p.id)}>
                          {Number(p.suggested_selling_price || 0).toLocaleString()} EGP
                        </td>

                        <td className="p-4 text-center" onClick={() => toggleExpand(p.id)}>
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-bold font-mono text-xs border ${
                            totalStock > 0 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-red-500/10 border-red-500/30 text-red-400'
                          }`}>
                            <Package className="w-3.5 h-3.5" />
                            <span>{totalStock} قطعة</span>
                          </div>
                        </td>

                        <td className="p-4 text-end">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* In-place Edit Product Button */}
                            {canAdd && (
                              <button
                                onClick={() => handleOpenEditProduct(p)}
                                title="تعديل بيانات الصنف الأساسية"
                                className="p-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 rounded-lg text-[11px] transition"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {canPrintBarcode && (
                              <button
                                onClick={() => handlePrintLabel(p)}
                                title={t('printBarcode')}
                                className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 text-amber-400 border border-zinc-800 hover:border-amber-400/40 rounded-lg text-[11px] font-semibold transition inline-flex items-center gap-1"
                              >
                                <Tag className="w-3 h-3" />
                                <span>باركود</span>
                              </button>
                            )}

                            <button
                              onClick={() => toggleExpand(p.id)}
                              className="px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg text-[11px] font-semibold transition"
                            >
                              {isExpanded ? 'طي' : `المتغيرات (${variants.length})`}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Nested Variant Breakdown Matrix Accordion */}
                      {isExpanded && (
                        <tr className="bg-zinc-950/90 border-b border-zinc-800">
                          <td colSpan={7} className="p-4 ps-12">
                            <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3 shadow-inner">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-zinc-800/80">
                                <div className="flex items-center gap-2">
                                  <Layers className="w-4 h-4 text-amber-400" />
                                  <h4 className="text-xs font-bold text-white">
                                    مصفوفة ألوان ومقاسات: <span className="text-amber-400">{p.model_name}</span>
                                  </h4>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono font-bold">
                                    {variants.length} تشكيلة
                                  </span>
                                </div>

                                {/* Button: Add Multi-Size Color Variant to this existing product */}
                                {canAdd && (
                                  <button
                                    onClick={() => handleOpenAddVariantModal(p)}
                                    className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition"
                                  >
                                    <PlusCircle className="w-4 h-4" />
                                    <span>+ إضافة لون ومقاسات متعددة للمنتج</span>
                                  </button>
                                )}
                              </div>

                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="border-b border-zinc-800 text-zinc-400 text-[10px] uppercase">
                                      <th className="py-2.5 text-start">صورة اللون</th>
                                      <th className="py-2.5 text-start">اللون</th>
                                      <th className="py-2.5 text-start">المقاس</th>
                                      <th className="py-2.5 text-start">الـ SKU الكامل (Variant SKU)</th>
                                      <th className="py-2.5 text-start">الباركود</th>
                                      <th className="py-2.5 text-end">السعر</th>
                                      <th className="py-2.5 text-center">الرصيد المتاح</th>
                                      <th className="py-2.5 text-end">الإجراءات</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-zinc-800/50">
                                    {variants.map((v) => {
                                      const variantQty = v.stock_quantity ?? v.current_quantity ?? 0
                                      const fullSku = v.full_sku || `${p.sku}${v.sku_suffix}`
                                      const imgUrl = v.effective_image_url || v.image_url

                                      return (
                                        <tr key={v.id} className="hover:bg-zinc-800/40 transition">
                                          {/* Variant Photo Thumbnail with Upload Trigger */}
                                          <td className="py-2.5">
                                            <div className="relative group w-10 h-10 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-950 shrink-0">
                                              {imgUrl ? (
                                                <img src={imgUrl} alt={v.color} className="w-full h-full object-cover" />
                                              ) : (
                                                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600 bg-zinc-900/50">
                                                  <ImageIcon className="w-3.5 h-3.5" />
                                                </div>
                                              )}
                                              <button
                                                type="button"
                                                onClick={() => handleTriggerVariantImageUpload(p.id, v.id)}
                                                title="رفع / تغيير صورة هذا اللون"
                                                className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-amber-400 transition"
                                              >
                                                {uploadingVariantId === v.id ? (
                                                  <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                  <Camera className="w-4 h-4" />
                                                )}
                                              </button>
                                            </div>
                                          </td>

                                          <td className="py-2.5">
                                            <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 font-semibold">
                                              {v.color}
                                            </span>
                                          </td>

                                          <td className="py-2.5">
                                            <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 font-mono font-bold border border-amber-500/20">
                                              {v.size}
                                            </span>
                                          </td>

                                          <td className="py-2.5 font-mono font-bold text-zinc-200">
                                            <div className="flex items-center gap-1.5">
                                              <span>{fullSku}</span>
                                              <button
                                                onClick={() => handleCopySku(fullSku)}
                                                className="text-zinc-500 hover:text-amber-400 transition"
                                                title="نسخ الـ SKU"
                                              >
                                                {copiedSku === fullSku ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                                              </button>
                                            </div>
                                          </td>

                                          <td className="py-2.5 font-mono text-zinc-400">
                                            {v.barcode || '—'}
                                          </td>

                                          <td className="py-2.5 text-end font-mono font-bold text-white">
                                            {Number(v.effective_price || p.suggested_selling_price || 0).toLocaleString()} EGP
                                          </td>

                                          <td className="py-2.5 text-center">
                                            <span className={`px-2.5 py-1 rounded-lg font-mono font-bold ${
                                              variantQty > (p.min_alert_quantity || 2)
                                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                                : variantQty > 0
                                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                                                : 'bg-red-500/15 text-red-400 border border-red-500/30'
                                            }`}>
                                              {variantQty} قطعة
                                            </span>
                                          </td>

                                          <td className="py-2.5 text-end">
                                            <div className="flex items-center justify-end gap-1.5">
                                              <button
                                                onClick={() => handleTriggerVariantImageUpload(p.id, v.id)}
                                                className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-amber-400 transition"
                                                title="رفع صورة لهذا المقاس/اللون"
                                              >
                                                <Camera className="w-3.5 h-3.5" />
                                              </button>

                                              {canPrintBarcode && (
                                                <button
                                                  onClick={() => handlePrintLabel(p, v)}
                                                  className="p-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-amber-400 transition"
                                                  title="طباعة باركود هذا المقاس واللون"
                                                >
                                                  <Tag className="w-3.5 h-3.5" />
                                                </button>
                                              )}

                                              {canAdjust && (
                                                <button
                                                  onClick={() => {
                                                    setSelectedVariant({
                                                      id: v.id,
                                                      name: `${p.model_name} — ${v.color} / ${v.size} (${fullSku})`,
                                                      currentQty: variantQty,
                                                    })
                                                    setNewQty(variantQty)
                                                    setIsAdjustModalOpen(true)
                                                  }}
                                                  className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg text-[10px] font-semibold transition"
                                                >
                                                  تعديل الرصيد
                                                </button>
                                              )}
                                            </div>
                                          </td>
                                        </tr>
                                      )
                                    })}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add Multi-Size Variants to an Existing Product */}
      {isAddVariantModalOpen && activeProductForVariant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#0c0c10] border border-amber-500/30 rounded-3xl p-6 shadow-2xl my-8 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Palette className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">إضافة لون ومقاسات متعددة للمنتج</h3>
                  <p className="text-[11px] text-zinc-400 font-mono">
                    {activeProductForVariant.model_name} ({activeProductForVariant.sku}) • السعر التلقائي: {Number(activeProductForVariant.suggested_selling_price || 0).toLocaleString()} EGP
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddVariantModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {addVariantError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addVariantError}</span>
              </div>
            )}

            <form onSubmit={handleSaveMultiSizeVariants} className="space-y-5">
              {/* Step 1: Bilingual Searchable Color Combobox & Color Photo Upload */}
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5" />
                  <span>1. تحديد اللون (بحث ذكي بالعربي والإنجليزي) وصورته</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-start">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">
                      اختر اللون أو اكتب للبحث (عربي/إنجليزي) *
                    </label>
                    <ColorCombobox
                      value={selectedColorName}
                      onChange={(color) => setSelectedColorName(color)}
                      placeholder="ابحث بالعربي (مثل كحلي/اسود) أو English..."
                    />
                  </div>

                  {/* Color Photo Uploader */}
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">صورة هذا اللون (مضغوطة تلقائياً WebP)</label>
                    <div className="flex items-center gap-2">
                      <label className="flex-1 px-3 py-2.5 bg-zinc-900 border border-dashed border-zinc-700 hover:border-amber-400 rounded-xl text-xs text-zinc-400 hover:text-amber-400 cursor-pointer flex items-center justify-center gap-1.5 transition truncate">
                        {uploadingVariantImage ? (
                          <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                        <span>{variantImageUrl ? 'تغيير الصورة' : 'رفع صورة اللون'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadModalVariantImage}
                          className="hidden"
                        />
                      </label>

                      {variantImageUrl && (
                        <div className="relative group shrink-0">
                          <img
                            src={variantImageUrl}
                            alt="Preview"
                            className="w-10 h-10 rounded-xl object-cover border border-amber-400/50"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Step 2: Multi-Size Selection */}
              <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    <span>2. اختر المقاسات المتاحة لهذا اللون (تحديد متعدد بنقرة واحدة)</span>
                  </label>
                  <span className="text-[11px] text-zinc-400 font-mono font-bold">
                    {Object.keys(selectedSizesMap).length} مقاسات مختارة
                  </span>
                </div>

                {/* Size Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {STANDARD_SIZES_PRESETS.map((sz) => {
                    const isSelected = !!selectedSizesMap[sz]
                    return (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => toggleSizeSelection(sz)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition flex items-center gap-1.5 ${
                          isSelected
                            ? 'bg-gradient-to-r from-amber-500 to-amber-400 text-zinc-950 shadow-md shadow-amber-500/20 ring-2 ring-amber-400/50'
                            : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
                        }`}
                      >
                        {isSelected ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5 opacity-40" />}
                        <span>{sz}</span>
                      </button>
                    )
                  })}
                </div>

                {/* Custom Size Input */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={customSizeInput}
                    onChange={(e) => setCustomSizeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddCustomSizeToSelection())}
                    placeholder="أضف مقاساً آخر (مثال: 46 أو 50ml)..."
                    className="flex-1 px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomSizeToSelection}
                    className="px-3 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    + إضافة مقاس
                  </button>
                </div>
              </div>

              {/* Step 3: Quantities and Barcodes for each selected size */}
              {Object.keys(selectedSizesMap).length > 0 && (
                <div className="p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" />
                      <span>3. كميات المخزون الافتتاحية للمقاسات المختارة</span>
                    </label>
                    <span className="text-[11px] text-zinc-400">
                      السعر تلقائي: {Number(activeProductForVariant.suggested_selling_price || 0).toLocaleString()} EGP
                    </span>
                  </div>

                  <div className="rounded-xl border border-zinc-800/80 overflow-hidden">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-zinc-900/90 text-zinc-400 text-[10px] uppercase">
                        <tr>
                          <th className="p-2.5 text-start">المقاس</th>
                          <th className="p-2.5 text-start">الـ SKU المشتق</th>
                          <th className="p-2.5 text-center">الرصيد المتوفر *</th>
                          <th className="p-2.5 text-start">الباركود الفرعي (اختياري)</th>
                          <th className="p-2.5 text-center">إلغاء</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {Object.values(selectedSizesMap).map((item) => {
                          const colorCode = selectedColorName.replace(/\s+/g, '').toUpperCase()
                          const derivedSku = `${activeProductForVariant.sku}-${colorCode}-${item.size}`

                          return (
                            <tr key={item.size} className="hover:bg-zinc-900/30">
                              <td className="p-2.5">
                                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-300 font-mono font-bold border border-amber-500/20">
                                  {item.size}
                                </span>
                              </td>

                              <td className="p-2.5 font-mono text-zinc-300 font-bold">
                                {derivedSku}
                              </td>

                              <td className="p-2.5 text-center">
                                <input
                                  type="number"
                                  min="0"
                                  value={item.quantity}
                                  onChange={(e) => handleUpdateSizeQty(item.size, Number(e.target.value) || 0)}
                                  className="w-24 px-2 py-1.5 bg-zinc-900 border border-zinc-700 rounded-lg text-center font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                                />
                              </td>

                              <td className="p-2.5">
                                <input
                                  type="text"
                                  value={item.barcode}
                                  onChange={(e) =>
                                    setSelectedSizesMap((prev) => ({
                                      ...prev,
                                      [item.size]: { ...prev[item.size], barcode: e.target.value },
                                    }))
                                  }
                                  placeholder="تلقائي..."
                                  className="w-full px-2 py-1.5 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-zinc-300 text-xs focus:outline-none focus:border-amber-400"
                                />
                              </td>

                              <td className="p-2.5 text-center">
                                <button
                                  type="button"
                                  onClick={() => toggleSizeSelection(item.size)}
                                  className="text-zinc-500 hover:text-red-400 transition"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddVariantModalOpen(false)}
                  className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={addingVariantSaving || uploadingVariantImage || Object.keys(selectedSizesMap).length === 0}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {addingVariantSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  <span>
                    {addingVariantSaving
                      ? 'جاري حفظ المقاسات...'
                      : `حفظ وإضافة كافة المقاسات (${Object.keys(selectedSizesMap).length}) للمصفوفة`}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Full Fashion Matrix Add Product (New Master Product) */}
      {isAddModalOpen && canAdd && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="w-full max-w-4xl bg-[#0c0c10] border border-zinc-800 rounded-3xl p-6 shadow-2xl my-8 space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">
                  {language === 'ar' ? 'إضافة منتج جديد مع مصفوفة الألوان والمقاسات' : 'Add Product with Variants Matrix'}
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSaveNewProduct} className="space-y-6">
              {/* Section 1: Basic Product Information */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  1. البيانات الأساسية للصنف (Master Info)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      كود الصنف الأساسي (Base SKU) *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.sku}
                      onChange={(e) => setForm({ ...form, sku: e.target.value.toUpperCase() })}
                      placeholder="e.g. GC-POLO-01"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      اسم الموديل (Model Name) *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.model_name}
                      onChange={(e) => setForm({ ...form, model_name: e.target.value })}
                      placeholder="e.g. GG Monogram Silk Shirt"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      الباركود الأساسي (اختياري)
                    </label>
                    <input
                      type="text"
                      value={form.barcode}
                      onChange={(e) => setForm({ ...form, barcode: e.target.value })}
                      placeholder="e.g. 7678909359"
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-zinc-300">{t('brand')} *</label>
                      <button
                        type="button"
                        onClick={() => setIsQuickBrandModalOpen(true)}
                        className="text-[11px] text-amber-400 hover:underline font-bold"
                      >
                        + ماركة جديدة
                      </button>
                    </div>
                    <select
                      value={form.brand}
                      onChange={(e) => setForm({ ...form, brand: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      {brands.map((b) => (
                        <option key={b.id} value={b.id}>{b.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-zinc-300">{t('category')} *</label>
                      <button
                        type="button"
                        onClick={() => setIsQuickCategoryModalOpen(true)}
                        className="text-[11px] text-amber-400 hover:underline font-bold"
                      >
                        + تصنيف جديد
                      </button>
                    </div>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-zinc-300">{t('supplier')} *</label>
                      <button
                        type="button"
                        onClick={() => setIsQuickSupplierModalOpen(true)}
                        className="text-[11px] text-amber-400 hover:underline font-bold"
                      >
                        + مورد جديد
                      </button>
                    </div>
                    <select
                      value={form.supplier}
                      onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      {language === 'ar' ? 'العملة' : 'Currency'} *
                    </label>
                    <select
                      value={form.currency}
                      onChange={(e) => setForm({ ...form, currency: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                    >
                      {currencies.map((curr) => (
                        <option key={curr.id} value={curr.id}>{curr.code} - {curr.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      {t('cost')} (Foreign Currency) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={form.cost_foreign || ''}
                      onChange={(e) => setForm({ ...form, cost_foreign: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      {t('sellingPrice')} (EGP) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={form.suggested_selling_price || ''}
                      onChange={(e) => setForm({ ...form, suggested_selling_price: Number(e.target.value) || 0 })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Colors & Compressed Image Upload with Bilingual Search */}
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    2. ألوان الصنف وصورها المضغوطة (Colors & Compressed Photos)
                  </h4>
                  <span className="text-[11px] text-zinc-400">
                    يتم ضغط كل صورة تلقائياً وتحويلها لـ WebP عالية الدقة
                  </span>
                </div>

                <div className="max-w-md">
                  <label className="block text-xs text-zinc-400 mb-1">اختر أو ابحث عن لون لإضافته للمصفوفة:</label>
                  <ColorCombobox
                    value=""
                    onChange={(color) => handleAddColor(color)}
                    placeholder="ابحث أو أضف لوناً (عربي/إنجليزي)..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
                  {colorsList.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 flex items-center justify-between gap-2.5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {/* Image Uploader Thumbnail */}
                        <div className="relative group w-12 h-12 rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 shrink-0">
                          {c.imageUrl ? (
                            <img src={c.imageUrl} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                              <ImageIcon className="w-4 h-4" />
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => fileInputRefs.current[c.id]?.click()}
                            disabled={c.uploading}
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-amber-400 transition"
                            title="Upload Photo for this color"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                          <input
                            type="file"
                            accept="image/*"
                            ref={(el) => {
                              fileInputRefs.current[c.id] = el
                            }}
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleColorImageUpload(c.id, file)
                            }}
                            className="hidden"
                          />
                        </div>

                        <div className="min-w-0">
                          <span className="font-bold text-xs text-white block truncate">{c.name}</span>
                          <span className="text-[10px] text-zinc-500">
                            {c.imageUrl ? 'الصورة جاهزة' : 'انقر لرفع صورة'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveColor(c.id)}
                        disabled={colorsList.length <= 1}
                        className="p-1.5 text-zinc-500 hover:text-red-400 rounded-lg disabled:opacity-30 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 3: Sizes */}
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    3. مقاسات الصنف (Sizes)
                  </h4>
                  <div className="flex items-center gap-1.5">
                    {['S,M,L,XL', 'XS,S,M,L,XL,XXL', 'Free Size', '38,39,40,41,42,43'].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSizesList(preset.split(','))}
                        className="px-2 py-0.5 rounded bg-zinc-900 hover:bg-zinc-800 text-[10px] text-zinc-400 font-mono transition"
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newSizeInput}
                    onChange={(e) => setNewSizeInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSize())}
                    placeholder="أضف مقاساً (مثال: XXL أو 44 أو 100ml)..."
                    className="flex-1 px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleAddSize}
                    className="px-3.5 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold transition"
                  >
                    + إضافة مقاس
                  </button>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {sizesList.map((sz) => (
                    <div
                      key={sz}
                      className="px-3 py-1.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center gap-2 text-xs font-mono font-bold text-white shadow-sm"
                    >
                      <span>{sz}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveSize(sz)}
                        disabled={sizesList.length <= 1}
                        className="text-zinc-500 hover:text-red-400 disabled:opacity-30"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Live Generated Variant Matrix Grid */}
              <div className="space-y-3 pt-3 border-t border-zinc-800">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    <span>4. مصفوفة الأصناف والكميات الناتجة ({matrixRows.length} صنف فرعي)</span>
                  </h4>
                  <span className="text-[11px] text-zinc-400">
                    أدخل رصيد المخزون الافتتاحي لكل لون ومقاس
                  </span>
                </div>

                <div className="rounded-2xl border border-zinc-800/80 overflow-hidden bg-zinc-950">
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-xs text-start">
                      <thead className="bg-zinc-900/90 text-zinc-400 uppercase text-[10px] sticky top-0 z-10">
                        <tr>
                          <th className="p-2.5 text-start">اللون والصورة</th>
                          <th className="p-2.5 text-start">المقاس</th>
                          <th className="p-2.5 text-start">الـ SKU المشتق</th>
                          <th className="p-2.5 text-center">الكمية الافتتاحية *</th>
                          <th className="p-2.5 text-start">الباركود الفرعي</th>
                          <th className="p-2.5 text-end">سعر خاص (اختياري)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/50">
                        {matrixRows.map((row, idx) => (
                          <tr key={idx} className="hover:bg-zinc-900/30">
                            <td className="p-2.5">
                              <div className="flex items-center gap-2">
                                {row.image_url ? (
                                  <img src={row.image_url} alt={row.color} className="w-6 h-6 rounded-md object-cover border border-zinc-700" />
                                ) : (
                                  <div className="w-6 h-6 rounded-md bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600">
                                    <Shirt className="w-3 h-3" />
                                  </div>
                                )}
                                <span className="font-bold text-white">{row.color}</span>
                              </div>
                            </td>

                            <td className="p-2.5">
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono font-bold">
                                {row.size}
                              </span>
                            </td>

                            <td className="p-2.5 font-mono text-zinc-300 font-bold">
                              {form.sku || 'SKU'}{row.sku_suffix}
                            </td>

                            <td className="p-2.5 text-center">
                              <input
                                type="number"
                                min="0"
                                value={row.current_quantity}
                                onChange={(e) => handleMatrixQtyChange(idx, Number(e.target.value) || 0)}
                                className="w-20 px-2 py-1 bg-zinc-900 border border-zinc-700 rounded-lg text-center font-mono font-bold text-white focus:outline-none focus:border-amber-400"
                              />
                            </td>

                            <td className="p-2.5">
                              <input
                                type="text"
                                value={row.barcode}
                                onChange={(e) => handleMatrixBarcodeChange(idx, e.target.value)}
                                placeholder="تلقائي..."
                                className="w-28 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg font-mono text-zinc-300 text-xs focus:outline-none focus:border-amber-400"
                              />
                            </td>

                            <td className="p-2.5 text-end">
                              <input
                                type="number"
                                min="0"
                                value={row.price_override || ''}
                                onChange={(e) => handleMatrixPriceChange(idx, Number(e.target.value) || 0)}
                                placeholder={String(form.suggested_selling_price || 0)}
                                className="w-24 px-2 py-1 bg-zinc-900 border border-zinc-800 rounded-lg text-end font-mono text-white text-xs focus:outline-none focus:border-amber-400"
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center gap-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs rounded-xl"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {saving ? t('loading') : 'حفظ المنتج ومصفوفة المتغيرات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Edit Product Master Info */}
      {isEditProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-[#0c0c10] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold text-white">تعديل بيانات المنتج: {editingProduct.sku}</h3>
              </div>
              <button onClick={() => setIsEditProductModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditProduct} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">اسم الموديل *</label>
                <input
                  type="text"
                  required
                  value={editProductForm.model_name}
                  onChange={(e) => setEditProductForm({ ...editProductForm, model_name: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">سعر البيع (EGP) *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editProductForm.suggested_selling_price || ''}
                    onChange={(e) => setEditProductForm({ ...editProductForm, suggested_selling_price: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">التكلفة بالعملة الأجنبية *</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={editProductForm.cost_foreign || ''}
                    onChange={(e) => setEditProductForm({ ...editProductForm, cost_foreign: Number(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-300">الماركة</label>
                    <button
                      type="button"
                      onClick={() => setIsQuickBrandModalOpen(true)}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      + جديدة
                    </button>
                  </div>
                  <select
                    value={editProductForm.brand}
                    onChange={(e) => setEditProductForm({ ...editProductForm, brand: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {brands.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-zinc-300">التصنيف</label>
                    <button
                      type="button"
                      onClick={() => setIsQuickCategoryModalOpen(true)}
                      className="text-[10px] text-amber-400 hover:underline"
                    >
                      + جديد
                    </button>
                  </div>
                  <select
                    value={editProductForm.category}
                    onChange={(e) => setEditProductForm({ ...editProductForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2.5 pt-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsEditProductModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-900 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={editProductSaving}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg"
                >
                  {editProductSaving ? 'جاري الحفظ...' : 'حفظ التعديلات'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Add Brand */}
      {isQuickBrandModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0c0c10] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">إضافة ماركة جديدة</h3>
              <button onClick={() => setIsQuickBrandModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateQuickBrand} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">اسم الماركة *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickBrandName}
                  onChange={(e) => setQuickBrandName(e.target.value)}
                  placeholder="مثال: Balenciaga, Yves Saint Laurent..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickBrandModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={quickBrandSaving}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow"
                >
                  {quickBrandSaving ? 'جاري الحفظ...' : 'حفظ الماركة'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Add Category */}
      {isQuickCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0c0c10] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">إضافة تصنيف جديد</h3>
              <button onClick={() => setIsQuickCategoryModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateQuickCategory} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">اسم التصنيف *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickCategoryName}
                  onChange={(e) => setQuickCategoryName(e.target.value)}
                  placeholder="مثال: قمصان حرير / أحذية كلاسيك / نظارات"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickCategoryModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={quickCategorySaving}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow"
                >
                  {quickCategorySaving ? 'جاري الحفظ...' : 'حفظ التصنيف'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Quick Add Supplier */}
      {isQuickSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[#0c0c10] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">إضافة مورد جديد</h3>
              <button onClick={() => setIsQuickSupplierModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateQuickSupplier} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">اسم المورد *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={quickSupplierName}
                  onChange={(e) => setQuickSupplierName(e.target.value)}
                  placeholder="مثال: Luxury Wholesale Co."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">رقم الهاتف (اختياري)</label>
                <input
                  type="text"
                  value={quickSupplierPhone}
                  onChange={(e) => setQuickSupplierPhone(e.target.value)}
                  placeholder="مثال: +201001234567"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsQuickSupplierModalOpen(false)}
                  className="flex-1 py-2 bg-zinc-900 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={quickSupplierSaving}
                  className="flex-1 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow"
                >
                  {quickSupplierSaving ? 'جاري الحفظ...' : 'حفظ المورد'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && selectedVariant && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-[#0c0c10] border border-amber-500/30 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">تعديل رصيد المخزون</h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdjustStock} className="space-y-3.5">
              <div>
                <label className="block text-xs text-zinc-400 mb-1">الصنف</label>
                <div className="p-2.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white font-mono">
                  {selectedVariant.name}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1">الرصيد الحالي</label>
                  <div className="p-2 bg-zinc-900 border border-zinc-800 rounded-xl text-xs font-mono font-bold text-zinc-400 text-center">
                    {selectedVariant.currentQty} قطعة
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">الرصيد الجديد *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={newQty}
                    onChange={(e) => setNewQty(Number(e.target.value) || 0)}
                    className="w-full p-2 bg-zinc-950 border border-amber-500/40 rounded-xl text-xs font-mono font-bold text-white text-center focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">سبب التعديل</label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. جرد يدوي / بضاعة تالفة / استلام إضافي"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex items-center gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-xl shadow-lg"
                >
                  تأكيد التعديل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Label Modal */}
      {canPrintBarcode && (
        <BarcodeLabelModal
          isOpen={isLabelModalOpen}
          onClose={() => setIsLabelModalOpen(false)}
          product={labelProduct}
        />
      )}

      {/* Image Fullscreen Preview Modal */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setPreviewImageUrl(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] rounded-2xl overflow-hidden border border-zinc-700 bg-zinc-950 shadow-2xl">
            <img src={previewImageUrl} alt="Product Full View" className="w-full h-full object-contain" />
            <button
              onClick={() => setPreviewImageUrl(null)}
              className="absolute top-3 end-3 p-2 rounded-full bg-black/60 hover:bg-black text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
