'use client'

import React, { useMemo } from 'react'

interface BarcodeDisplayProps {
  value: string
  width?: number
  height?: number
  showText?: boolean
  className?: string
  textColor?: string
  barColor?: string
  fontSize?: number
}

// Code 128B Barcode Patterns (widths of bars and spaces: 6 digits per symbol)
const CODE128_PATTERNS: string[] = [
  '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
  '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
  '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
  '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
  '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
  '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
  '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
  '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
  '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
  '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
  '114131', '311141', '411131', '211412', '211214', '211232', '2331112' // 106 = STOP
]

/**
 * Encodes an ASCII string into a Code 128B barcode pattern
 */
function encodeCode128B(text: string): string[] | null {
  if (!text) return null

  // Clean string to ASCII 32 - 126
  const clean = text.replace(/[^\x20-\x7E]/g, '')
  if (!clean) return null

  const codes: number[] = [104] // Start Code B = 104
  let checksum = 104

  for (let i = 0; i < clean.length; i++) {
    const code = clean.charCodeAt(i) - 32
    codes.push(code)
    checksum += code * (i + 1)
  }

  const checkDigit = checksum % 103
  codes.push(checkDigit)
  codes.push(106) // Stop code

  return codes.map((c) => CODE128_PATTERNS[c] || CODE128_PATTERNS[0])
}

export function BarcodeDisplay({
  value,
  width = 2,
  height = 50,
  showText = true,
  className = '',
  textColor = 'currentColor',
  barColor = 'currentColor',
  fontSize = 11,
}: BarcodeDisplayProps) {
  const patterns = useMemo(() => encodeCode128B(value || 'SAMPLE'), [value])

  if (!patterns) {
    return (
      <div className={`flex items-center justify-center text-xs text-zinc-500 ${className}`}>
        Invalid Barcode Value
      </div>
    )
  }

  // Calculate total module width
  const modules: boolean[] = []
  patterns.forEach((pattern) => {
    let isBar = true
    for (let i = 0; i < pattern.length; i++) {
      const runLength = parseInt(pattern[i], 10)
      for (let r = 0; r < runLength; r++) {
        modules.push(isBar)
      }
      isBar = !isBar
    }
  })

  // Quiet zones (10 modules on each side)
  const quietZone = 10
  const totalModules = modules.length + quietZone * 2
  const svgWidth = totalModules * width
  const svgHeight = height + (showText ? fontSize + 8 : 0)

  return (
    <div className={`inline-flex flex-col items-center select-none ${className}`}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox={`0 0 ${totalModules} ${svgHeight}`}
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-visible"
        shapeRendering="crispEdges"
      >
        {/* White background / quiet zone */}
        <rect x="0" y="0" width={totalModules} height={height} fill="transparent" />

        {/* Barcode Stripes */}
        {modules.map((isBar, idx) => {
          if (!isBar) return null
          return (
            <rect
              key={idx}
              x={idx + quietZone}
              y={0}
              width={1}
              height={height}
              fill={barColor}
            />
          )
        })}

        {/* Human Readable Text */}
        {showText && (
          <text
            x={totalModules / 2}
            y={height + fontSize + 2}
            textAnchor="middle"
            fill={textColor}
            style={{
              fontSize: `${fontSize}px`,
              fontFamily: 'monospace',
              fontWeight: '600',
              letterSpacing: '1.5px',
            }}
          >
            {value}
          </text>
        )}
      </svg>
    </div>
  )
}
