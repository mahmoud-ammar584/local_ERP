'use client'

import React, { useState } from 'react'
import { BarcodeDisplay } from './BarcodeDisplay'
import { useLanguage } from '@/lib/i18n'
import { Printer, X, Tag, Copy, Sparkles } from 'lucide-react'

export interface LabelProductData {
  model_name: string
  brand_name?: string
  color?: string
  size?: string
  sku: string
  barcode?: string
  price: number | string
  current_quantity?: number
}

interface BarcodeLabelModalProps {
  isOpen: boolean
  onClose: () => void
  product: LabelProductData | null
}

export function BarcodeLabelModal({
  isOpen,
  onClose,
  product,
}: BarcodeLabelModalProps) {
  const { t, language } = useLanguage()
  const [copies, setCopies] = useState<number>(1)
  const [labelSize, setLabelSize] = useState<'50x30' | '38x25' | 'a4'>('50x30')

  if (!isOpen || !product) return null

  const barcodeValue = product.barcode || product.sku
  const priceFormatted = Number(product.price || 0).toLocaleString(
    language === 'ar' ? 'ar-EG' : 'en-US'
  )

  const handlePrint = () => {
    window.print()
  }

  // Create array of copies for printing
  const labelItems = Array.from({ length: Math.max(1, copies) })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      {/* Modal Container (Screen Only) */}
      <div className="relative w-full max-w-lg bg-[#0c0c10] border border-[#1e1e26] rounded-2xl shadow-2xl overflow-hidden print:hidden">
        {/* Header */}
        <div className="p-5 border-b border-[#1e1e26] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">
                {language === 'ar' ? 'طباعة ملصق الباركود (Price Tag)' : 'Print Barcode Label'}
              </h2>
              <p className="text-[11px] text-zinc-400">
                {product.brand_name ? `${product.brand_name} • ` : ''}{product.model_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5">
          {/* Label Preview Card */}
          <div>
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
              {language === 'ar' ? 'معاينة الملصق المباشر' : 'Live Label Preview'}
            </span>
            <div className="p-4 bg-white text-zinc-950 rounded-xl border border-zinc-300 shadow-inner flex flex-col items-center justify-center text-center select-none max-w-xs mx-auto">
              <div className="text-[10px] font-black tracking-wider uppercase text-zinc-600">
                Funnel Boutique
              </div>
              <div className="text-xs font-bold text-zinc-950 truncate max-w-full mt-0.5">
                {product.brand_name ? `${product.brand_name} ` : ''}{product.model_name}
              </div>
              {(product.color || product.size) && (
                <div className="text-[10px] font-semibold text-zinc-700 mt-0.5">
                  {product.color ? `${product.color}` : ''} {product.size ? `/ ${product.size}` : ''}
                </div>
              )}

              {/* Barcode */}
              <div className="my-2">
                <BarcodeDisplay
                  value={barcodeValue}
                  width={1.4}
                  height={38}
                  showText={true}
                  barColor="#000000"
                  textColor="#000000"
                  fontSize={10}
                />
              </div>

              {/* Price */}
              <div className="text-xs font-black text-zinc-950 border-t border-zinc-200 pt-1 w-full flex justify-between px-2">
                <span className="text-[9px] text-zinc-500">PRICE:</span>
                <span>{priceFormatted} EGP</span>
              </div>
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            {/* Copies */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                {language === 'ar' ? 'عدد النسخ (Copies)' : 'Number of Copies'}
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={200}
                  value={copies}
                  onChange={(e) => setCopies(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white font-bold focus:outline-none focus:border-amber-400"
                />
                {typeof product.current_quantity === 'number' && product.current_quantity > 0 && (
                  <button
                    type="button"
                    onClick={() => setCopies(product.current_quantity || 1)}
                    title={language === 'ar' ? 'مطابقة رصيد المخزن' : 'Match Stock Qty'}
                    className="px-2.5 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-amber-400 rounded-xl text-[11px] font-bold shrink-0"
                  >
                    Stock ({product.current_quantity})
                  </button>
                )}
              </div>
            </div>

            {/* Label Format */}
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                {language === 'ar' ? 'مقاس الورق / الملصق' : 'Label Format'}
              </label>
              <select
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value as any)}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-xl text-white text-xs focus:outline-none focus:border-amber-400"
              >
                <option value="50x30">50mm × 30mm (Thermal Standard)</option>
                <option value="38x25">38mm × 25mm (Thermal Compact)</option>
                <option value="a4">A4 Sheet (Multi-Grid)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-[#1e1e26] bg-zinc-950/50 flex items-center justify-end gap-2.5">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 text-xs font-semibold rounded-xl transition"
          >
            {t('cancel')}
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-bold rounded-xl text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition"
          >
            <Printer className="w-4 h-4" />
            <span>{language === 'ar' ? `طباعة ${copies} ملصق` : `Print ${copies} Labels`}</span>
          </button>
        </div>
      </div>

      {/* Hidden Print Container (Visible only during window.print()) */}
      <div className="hidden print:block fixed inset-0 bg-white text-black p-2 z-[9999]">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .print-label-container, .print-label-container * {
              visibility: visible;
            }
            .print-label-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              justify-content: flex-start;
              background: white;
            }
            .label-card {
              page-break-inside: avoid;
              border: 1px dashed #ccc;
              box-sizing: border-box;
            }
          }
        `}} />

        <div className="print-label-container">
          {labelItems.map((_, i) => (
            <div
              key={i}
              className={`label-card bg-white text-zinc-950 p-2 text-center flex flex-col items-center justify-between ${
                labelSize === '38x25'
                  ? 'w-[38mm] h-[25mm] text-[8px]'
                  : labelSize === '50x30'
                  ? 'w-[50mm] h-[30mm] text-[9px]'
                  : 'w-[65mm] h-[38mm] text-[10px] m-1'
              }`}
            >
              <div className="font-bold tracking-wider uppercase text-[8px]">Funnel Boutique</div>
              <div className="font-bold text-[9px] truncate max-w-full leading-tight">
                {product.brand_name ? `${product.brand_name} ` : ''}{product.model_name}
              </div>
              {(product.color || product.size) && (
                <div className="text-[8px] font-semibold text-zinc-700">
                  {product.color ? `${product.color}` : ''} {product.size ? `/ ${product.size}` : ''}
                </div>
              )}

              <div className="my-0.5">
                <BarcodeDisplay
                  value={barcodeValue}
                  width={labelSize === '38x25' ? 1 : 1.3}
                  height={labelSize === '38x25' ? 24 : 32}
                  showText={true}
                  barColor="#000000"
                  textColor="#000000"
                  fontSize={8}
                />
              </div>

              <div className="font-black text-[9px] w-full flex justify-between border-t border-zinc-300 pt-0.5 px-1">
                <span>EGP</span>
                <span>{priceFormatted}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
