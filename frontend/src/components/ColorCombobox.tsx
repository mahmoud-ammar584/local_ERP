'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Palette, Check, Search, Plus, ChevronDown } from 'lucide-react'

export interface LuxuryColorPreset {
  name: string
  hex: string
  labelAr: string
  keywords?: string[]
}

export const LUXURY_COLOR_PRESETS: LuxuryColorPreset[] = [
  { name: 'Black', hex: '#111111', labelAr: 'أسود', keywords: ['اسود', 'black', 'فحم'] },
  { name: 'White', hex: '#FFFFFF', labelAr: 'أبيض', keywords: ['ابيض', 'white', 'ناصع'] },
  { name: 'Off-White', hex: '#FAF9F6', labelAr: 'أوف وايت / كريمي', keywords: ['اوف وايت', 'كريمي', 'off white', 'cream'] },
  { name: 'Navy Blue', hex: '#0B1930', labelAr: 'كحلي / نيفي', keywords: ['كحلي', 'نيفي', 'navy', 'blue', 'ازرق داكن'] },
  { name: 'Beige', hex: '#D4B996', labelAr: 'بيج', keywords: ['بيج', 'beige', 'رملي'] },
  { name: 'Camel', hex: '#C19A6B', labelAr: 'جملي / هافان', keywords: ['جملي', 'هافان', 'camel', 'havana', 'عسلي'] },
  { name: 'Olive Green', hex: '#556B2F', labelAr: 'زيتي / أوليف', keywords: ['زيتي', 'اوليف', 'olive', 'green', 'عسكري'] },
  { name: 'Burgundy', hex: '#6A1A24', labelAr: 'نبيتي / بورجوندي', keywords: ['نبيتي', 'بورجوندي', 'burgundy', 'مارون', 'عنابي'] },
  { name: 'Emerald Green', hex: '#097969', labelAr: 'أخضر زمردي', keywords: ['اخضر', 'زمردي', 'emerald', 'green'] },
  { name: 'Royal Blue', hex: '#1E3A8A', labelAr: 'أزرق رويال', keywords: ['ازرق', 'رويال', 'royal blue', 'ملكي'] },
  { name: 'Charcoal Grey', hex: '#36454F', labelAr: 'رمادي غامق / فيراني', keywords: ['رمادي غامق', 'فيراني', 'charcoal', 'grey', 'gray'] },
  { name: 'Light Grey', hex: '#D3D3D3', labelAr: 'رمادي فاتح', keywords: ['رمادي فاتح', 'رصاصي', 'light grey', 'gray'] },
  { name: 'Brown', hex: '#5C4033', labelAr: 'بني / شوكولاتة', keywords: ['بني', 'شوكولاتة', 'brown', 'chocolate'] },
  { name: 'Dusty Rose', hex: '#DCAE96', labelAr: 'وردي / كشمير', keywords: ['وردي', 'كشمير', 'rose', 'pink', 'dusty rose', 'زهري'] },
  { name: 'Red', hex: '#B22222', labelAr: 'أحمر', keywords: ['احمر', 'red', 'قرمزي'] },
  { name: 'Baby Blue', hex: '#89CFF0', labelAr: 'بيبي بلو / سماوي', keywords: ['بيبي بلو', 'سماوي', 'baby blue', 'sky'] },
  { name: 'Lavender', hex: '#E6E6FA', labelAr: 'لافندر / بنفسجي فاتح', keywords: ['لافندر', 'بنفسجي', 'lavender', 'purple', 'موف'] },
  { name: 'Mustard Yellow', hex: '#FFDB58', labelAr: 'خردلي / مسطردة', keywords: ['خردلي', 'مسطردة', 'اصفر', 'mustard', 'yellow'] },
  { name: 'Gold', hex: '#D4AF37', labelAr: 'ذهبي', keywords: ['ذهبي', 'gold'] },
  { name: 'Silver', hex: '#C0C0C0', labelAr: 'فضي', keywords: ['فضي', 'silver', 'سيلفر'] },
]

interface ColorComboboxProps {
  value: string
  onChange: (colorName: string, hex?: string) => void
  placeholder?: string
  extraCustomColors?: string[]
}

export const ColorCombobox: React.FC<ColorComboboxProps> = ({
  value,
  onChange,
  placeholder = 'ابحث عن لون بالعربي أو الإنجليزي...',
  extraCustomColors = [],
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Find current active color info
  const activePreset = LUXURY_COLOR_PRESETS.find(
    (c) => c.name.toLowerCase() === value.toLowerCase()
  )

  // Filter presets based on Arabic / English input
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const filteredPresets = LUXURY_COLOR_PRESETS.filter((preset) => {
    if (!normalizedSearch) return true
    const nameMatch = preset.name.toLowerCase().includes(normalizedSearch)
    const arabicMatch = preset.labelAr.toLowerCase().includes(normalizedSearch)
    const keywordsMatch = preset.keywords?.some((k) => k.toLowerCase().includes(normalizedSearch))
    return nameMatch || arabicMatch || keywordsMatch
  })

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (colorName: string, hex?: string) => {
    onChange(colorName, hex)
    setIsOpen(false)
    setSearchTerm('')
  }

  const handleAddCustom = () => {
    if (!searchTerm.trim()) return
    handleSelect(searchTerm.trim())
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-3.5 py-2.5 bg-zinc-900 border border-zinc-700 hover:border-amber-400/60 rounded-xl text-xs text-start flex items-center justify-between gap-2 text-white transition shadow-sm focus:outline-none focus:ring-1 focus:ring-amber-400"
      >
        <div className="flex items-center gap-2.5 truncate">
          {activePreset ? (
            <div
              className="w-4 h-4 rounded-full border border-zinc-500 shadow-sm shrink-0"
              style={{ backgroundColor: activePreset.hex }}
            />
          ) : (
            <div className="w-4 h-4 rounded-full bg-amber-400/30 border border-amber-400 shrink-0 flex items-center justify-center">
              <Palette className="w-2.5 h-2.5 text-amber-400" />
            </div>
          )}
          <span className="font-bold text-zinc-100 truncate">
            {value || 'اختر لوناً...'}
          </span>
          {activePreset && (
            <span className="text-[11px] text-zinc-400 font-normal">
              ({activePreset.labelAr})
            </span>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-zinc-400 shrink-0 transition-transform ${isOpen ? 'rotate-180 text-amber-400' : ''}`} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute top-full start-0 end-0 mt-1.5 z-50 bg-[#0c0c10] border border-amber-500/30 rounded-2xl shadow-2xl p-2.5 space-y-2 backdrop-blur-xl animate-in fade-in slide-in-from-top-2">
          {/* Live Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-zinc-500 absolute start-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (filteredPresets.length > 0) {
                    handleSelect(filteredPresets[0].name, filteredPresets[0].hex)
                  } else if (searchTerm.trim()) {
                    handleAddCustom()
                  }
                } else if (e.key === 'Escape') {
                  setIsOpen(false)
                }
              }}
              placeholder={placeholder}
              className="w-full ps-8 pe-3 py-2 bg-zinc-950 border border-zinc-800 focus:border-amber-400 rounded-xl text-xs text-white placeholder-zinc-500 focus:outline-none"
            />
          </div>

          {/* Color List */}
          <div className="max-h-56 overflow-y-auto space-y-1 pe-1">
            {filteredPresets.map((preset) => {
              const isSelected = preset.name.toLowerCase() === value.toLowerCase()
              return (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => handleSelect(preset.name, preset.hex)}
                  className={`w-full px-2.5 py-2 rounded-xl text-xs flex items-center justify-between gap-2 transition ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40'
                      : 'hover:bg-zinc-800/60 text-zinc-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-4 h-4 rounded-full border border-zinc-600 shadow-sm shrink-0"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span className="font-semibold text-white">{preset.name}</span>
                    <span className="text-[11px] text-zinc-400">({preset.labelAr})</span>
                  </div>
                  {isSelected && <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                </button>
              )
            })}

            {/* Custom Color Option when typing something new */}
            {searchTerm.trim() && (
              <button
                type="button"
                onClick={handleAddCustom}
                className="w-full px-2.5 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-dashed border-amber-500/40 text-amber-400 text-xs font-bold flex items-center justify-between gap-2 transition mt-1"
              >
                <div className="flex items-center gap-2">
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ استخدام لون جديد: &quot;{searchTerm.trim()}&quot;</span>
                </div>
                <span className="text-[10px] text-zinc-400 font-normal">اضغط Enter</span>
              </button>
            )}

            {filteredPresets.length === 0 && !searchTerm.trim() && (
              <div className="p-3 text-center text-xs text-zinc-500">لا توجد ألوان مطابقة</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
