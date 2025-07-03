import React from 'react'
import { formatCurrency, formatCurrencyPrecise, formatNumber, formatPercentage, formatTime } from '../utils/formatters'

interface CustomTooltipProps {
  active?: boolean
  payload?: any[]
  label?: string
  formatters?: {
    currency?: 'standard' | 'precise' | 'compact'
    labelStyle?: 'standard' | 'medium'
    borderStyle?: 'gray' | 'light'
  }
}

export const CustomTooltip: React.FC<CustomTooltipProps> = ({
  active,
  payload,
  label,
  formatters = {}
}) => {
  const {
    currency = 'standard',
    labelStyle = 'standard',
    borderStyle = 'gray'
  } = formatters

  if (active && payload && payload.length) {
    const borderClass = borderStyle === 'light' ? 'border-gray-200' : 'border-gray-300'
    const labelClass = labelStyle === 'medium' ? 'font-medium' : 'text-gray-900 font-medium'

    return (
      <div className={`bg-white p-3 border ${borderClass} rounded-lg shadow-lg`}>
        <p className={labelClass}>{label}</p>
        {payload.map((entry: any, index: number) => {
          let formattedValue = entry.value

          if (typeof entry.value === "number") {
            // Determine the appropriate formatter based on entry name
            if (entry.name.includes('P&L') ||
                entry.name.includes('PnL') ||
                entry.name.includes('Avg') ||
                entry.name.includes('Amount') ||
                entry.name.includes('Value') ||
                entry.name.includes('Capital') ||
                entry.name.includes('Size') ||
                entry.name.includes('Drawdown') ||
                entry.name.includes('volume') ||
                entry.name.includes('Volume')) {

              // Use the specified currency formatter
              if (currency === 'precise') {
                formattedValue = formatCurrencyPrecise(entry.value)
              } else if (currency === 'compact') {
                // For compact, we'll use a simple compact formatter
                formattedValue = formatCompactCurrency(entry.value)
              } else {
                formattedValue = formatCurrency(entry.value)
              }
            } else if (entry.name.includes('%') ||
                       entry.name.includes('Rate') ||
                       entry.name.includes('Return') ||
                       entry.name.includes('Performance') ||
                       entry.name.includes('Outperformance') ||
                       entry.name.includes('Utilization')) {
              formattedValue = formatPercentage(entry.value)
            } else if (entry.name.includes('Time')) {
              formattedValue = formatTime(entry.value)
            } else if (entry.name.includes('Sharpe') ||
                       entry.name.includes('Volatility') ||
                       entry.name.includes('Correlation')) {
              formattedValue = formatNumber(entry.value)
            } else {
              formattedValue = formatNumber(entry.value)
            }
          }

          return (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formattedValue}
            </p>
          )
        })}
      </div>
    )
  }
  return null
}

// Helper function for compact currency formatting
const formatCompactCurrency = (value: number): string => {
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (absValue >= 10000000) { // 1 crore
    return `${sign}₹${(absValue / 10000000).toFixed(1)}Cr`
  } else if (absValue >= 100000) { // 1 lakh
    return `${sign}₹${(absValue / 100000).toFixed(1)}L`
  } else if (absValue >= 1000) { // 1 thousand
    return `${sign}₹${(absValue / 1000).toFixed(1)}K`
  } else {
    return `${sign}₹${absValue.toFixed(1)}`
  }
}
