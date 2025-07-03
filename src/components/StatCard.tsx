import React from 'react'
import { Info } from 'lucide-react'
import { InfoTooltip } from './InfoTooltip'

interface StatCardProps {
  title: string
  value: string | number
  icon: React.ComponentType<{ className?: string }>
  color: 'red' | 'green' | 'blue' | 'yellow' | 'gray'
  subtitle?: string
  tooltip?: string
  variant?: 'default' | 'compact'
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon: Icon,
  color,
  subtitle,
  tooltip,
  variant = 'default'
}) => {
  const colorClasses = {
    red: 'bg-red-50 text-red-700 border-red-200',
    green: 'bg-green-50 text-green-700 border-green-200',
    blue: 'bg-blue-50 text-blue-700 border-blue-200',
    yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    gray: 'bg-gray-50 text-gray-700 border-gray-200'
  }

  const compactColorClasses = {
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    yellow: 'bg-yellow-50 text-yellow-600',
    gray: 'bg-gray-50 text-gray-600'
  }

  if (variant === 'compact') {
    return (
      <div className="card">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${compactColorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="ml-4 flex-1">
            <div className="flex items-center">
              <p className="text-sm font-medium text-gray-500">{title}</p>
              {tooltip && (
                <InfoTooltip content={tooltip} id={`tooltip-${title.replace(/\s+/g, '-').toLowerCase()}`}>
                  <Info className="w-4 h-4 text-gray-400 ml-1 hover:text-gray-600" />
                </InfoTooltip>
              )}
            </div>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`card border-l-4 ${colorClasses[color]}`}>
      <div className='flex items-center justify-between'>
        <div>
          <div className="flex items-center">
            <p className='text-sm font-medium opacity-75'>{title}</p>
            {tooltip && (
              <InfoTooltip content={tooltip} id={`tooltip-${title.replace(/\s+/g, '-').toLowerCase()}`}>
                <Info className="w-4 h-4 text-gray-400 ml-1 hover:text-gray-600 opacity-75" />
              </InfoTooltip>
            )}
          </div>
          <p className='text-2xl font-bold'>{value}</p>
          {subtitle && <p className='text-xs opacity-60 mt-1'>{subtitle}</p>}
        </div>
        <Icon className='w-8 h-8 opacity-50' />
      </div>
    </div>
  )
}
