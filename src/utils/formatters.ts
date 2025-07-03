/**
 * Utility functions for formatting numbers, currency, percentages, and time
 */

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

export const formatCurrencyPrecise = (value: number): string => {
  // For very small values, show 2 decimal places
  if (Math.abs(value) < 100) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value)
  }
  // For larger values, show no decimal places
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)
}

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value)
}

export const formatPercentage = (value: number): string => {
  return `${formatNumber(value)}%`
}

export const formatTime = (minutes: number): string => {
  if (minutes < 60) {
    return `${Math.round(minutes)}m`
  } else if (minutes < 1440) {
    const hours = Math.floor(minutes / 60)
    const mins = Math.round(minutes % 60)
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`
  } else {
    const days = Math.floor(minutes / 1440)
    const hours = Math.floor((minutes % 1440) / 60)
    return hours > 0 ? `${days}d ${hours}h` : `${days}d`
  }
}

// Compact currency formatter for chart axes
export const formatCompactCurrency = (value: number) => {
  const absValue = Math.abs(value)
  const sign = value < 0 ? '-' : ''

  if (absValue >= 10000000) { // 1 crore and above
    return `${sign}₹${(absValue / 10000000).toFixed(1)}Cr`
  } else if (absValue >= 100000) { // 1 lakh and above
    return `${sign}₹${(absValue / 100000).toFixed(1)}L`
  } else if (absValue >= 1000) { // 1 thousand and above
    return `${sign}₹${(absValue / 1000).toFixed(1)}K`
  } else if (absValue >= 100) {
    return `${sign}₹${absValue.toFixed(0)}`
  } else {
    return `${sign}₹${absValue.toFixed(1)}`
  }
}
