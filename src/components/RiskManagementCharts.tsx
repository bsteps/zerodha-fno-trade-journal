import React, { useMemo } from "react"
import { format } from "date-fns"
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"
import { Trade } from "../types/trade"
import { calculateDrawdownAnalysis, calculateRiskRewardAnalysis, calculatePositionSizeAnalysis, DrawdownAnalysis, RiskRewardAnalysis, PositionSizeAnalysis } from "../utils/calculations"
import { TrendingDown, AlertTriangle, Target, DollarSign } from "lucide-react"

interface RiskManagementChartsProps {
  trades: Trade[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export function RiskManagementCharts({ trades }: RiskManagementChartsProps) {
  const drawdownAnalysis = useMemo(() => calculateDrawdownAnalysis(trades), [trades])
  const riskRewardAnalysis = useMemo(() => calculateRiskRewardAnalysis(trades), [trades])
  const positionSizeAnalysis = useMemo(() => calculatePositionSizeAnalysis(trades), [trades])

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatPercentage = (value: number) => {
    return `${formatNumber(value)}%`
  }

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-white p-3 border border-gray-300 rounded-lg shadow-lg'>
          <p className='text-gray-900 font-medium'>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${
                entry.name.includes('P&L') || entry.name.includes('Amount') || entry.name.includes('Value')
                  ? formatCurrency(entry.value)
                  : entry.name.includes('%') || entry.name.includes('Rate')
                  ? formatPercentage(entry.value)
                  : formatNumber(entry.value)
              }`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  // Stat card component
  const StatCard = ({ title, value, icon: Icon, color, subtitle }: {
    title: string
    value: string | number
    icon: any
    color: 'red' | 'green' | 'blue' | 'yellow' | 'gray'
    subtitle?: string
  }) => {
    const colorClasses = {
      red: 'bg-red-50 text-red-700 border-red-200',
      green: 'bg-green-50 text-green-700 border-green-200',
      blue: 'bg-blue-50 text-blue-700 border-blue-200',
      yellow: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      gray: 'bg-gray-50 text-gray-700 border-gray-200'
    }

    return (
      <div className={`card border-l-4 ${colorClasses[color]}`}>
        <div className='flex items-center justify-between'>
          <div>
            <p className='text-sm font-medium opacity-75'>{title}</p>
            <p className='text-2xl font-bold'>{value}</p>
            {subtitle && <p className='text-xs opacity-60 mt-1'>{subtitle}</p>}
          </div>
          <Icon className='w-8 h-8 opacity-50' />
        </div>
      </div>
    )
  }

  // Prepare drawdown chart data
  const drawdownChartData = drawdownAnalysis.drawdownPeriods.map((period, index) => ({
    period: `DD${index + 1}`,
    drawdownAmount: period.drawdownAmount,
    drawdownPercentage: period.drawdownPercentage,
    durationDays: period.durationDays,
    recoveryDays: period.recoveryDays || 0,
    isRecovered: period.isRecovered
  }))

  return (
    <div className='space-y-6'>
      {/* Risk Management Summary */}
      <div className='card'>
        <h2 className='text-2xl font-bold text-gray-900 mb-6 flex items-center'>
          <AlertTriangle className='w-6 h-6 text-red-600 mr-2' />
          Risk Management Analytics
        </h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard
            title="Max Drawdown"
            value={formatCurrency(drawdownAnalysis.maxDrawdown)}
            icon={TrendingDown}
            color="red"
            subtitle={`${formatPercentage(drawdownAnalysis.maxDrawdownPercentage)}`}
          />
          <StatCard
            title="Current Drawdown"
            value={formatCurrency(drawdownAnalysis.currentDrawdown)}
            icon={TrendingDown}
            color={drawdownAnalysis.currentDrawdown > 0 ? "red" : "green"}
            subtitle={`${formatPercentage(drawdownAnalysis.currentDrawdownPercentage)}`}
          />
          <StatCard
            title="Avg Recovery Days"
            value={formatNumber(drawdownAnalysis.avgRecoveryDays)}
            icon={Target}
            color="blue"
            subtitle={`${drawdownAnalysis.drawdownPeriods.filter(d => d.isRecovered).length} recovered`}
          />
          <StatCard
            title="Avg Risk:Reward"
            value={formatNumber(riskRewardAnalysis.avgRatio)}
            icon={DollarSign}
            color={riskRewardAnalysis.avgRatio >= 2 ? "green" : riskRewardAnalysis.avgRatio >= 1 ? "yellow" : "red"}
            subtitle={`Median: ${formatNumber(riskRewardAnalysis.medianRatio)}`}
          />
        </div>
      </div>

      {/* Drawdown Periods Analysis */}
      {drawdownChartData.length > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Drawdown Amounts</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={drawdownChartData}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='period' />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey='drawdownAmount' name='Drawdown Amount'>
                    {drawdownChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.isRecovered ? "#EF4444" : "#DC2626"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Drawdown Duration vs Recovery</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={drawdownChartData.filter(d => d.isRecovered)}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='period' />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey='durationDays' fill='#EF4444' name='Drawdown Days' />
                  <Bar dataKey='recoveryDays' fill='#10B981' name='Recovery Days' />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Risk-Reward Analysis */}
      {riskRewardAnalysis.ratioDistribution.length > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Risk:Reward Ratio Distribution</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <Pie
                    data={riskRewardAnalysis.ratioDistribution}
                    cx='50%'
                    cy='50%'
                    labelLine={false}
                    label={({ range, percentage }) => `${range} (${formatNumber(percentage)}%)`}
                    outerRadius={80}
                    fill='#8884d8'
                    dataKey='count'
                  >
                    {riskRewardAnalysis.ratioDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Risk:Reward Analysis</h3>
            <div className='space-y-4'>
              <div className='bg-blue-50 rounded-lg p-4'>
                <h4 className='font-semibold text-blue-900 mb-2'>Key Metrics</h4>
                <div className='grid grid-cols-2 gap-4 text-sm'>
                  <div>
                    <span className='text-blue-700'>Average Ratio:</span>
                    <div className='font-bold text-blue-600'>{formatNumber(riskRewardAnalysis.avgRatio)}</div>
                  </div>
                  <div>
                    <span className='text-blue-700'>Median Ratio:</span>
                    <div className='font-bold text-blue-600'>{formatNumber(riskRewardAnalysis.medianRatio)}</div>
                  </div>
                </div>
              </div>
              
              <div className='bg-yellow-50 rounded-lg p-4'>
                <h4 className='font-semibold text-yellow-900 mb-2'>Breakeven Analysis</h4>
                <div className='text-sm text-yellow-700'>
                  <div>Required R:R for breakeven:</div>
                  <div className='font-bold text-yellow-600 text-lg'>
                    {formatNumber(riskRewardAnalysis.profitableRatioThreshold)}
                  </div>
                  <div className='text-xs mt-1'>Based on your current win rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Position Size Analysis */}
      {positionSizeAnalysis.sizeRanges.length > 0 && (
        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Position Size Analysis</h3>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={positionSizeAnalysis.sizeRanges}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='range' angle={-45} textAnchor='end' height={80} />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey='avgPnL' name='Average P&L'>
                    {positionSizeAnalysis.sizeRanges.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avgPnL >= 0 ? "#10B981" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className='space-y-4'>
              <div className='bg-green-50 rounded-lg p-4'>
                <h4 className='font-semibold text-green-900 mb-2'>Optimal Position Size</h4>
                <div className='font-bold text-green-600 text-lg'>{positionSizeAnalysis.optimalSizeRange}</div>
                <div className='text-sm text-green-700 mt-1'>Highest average P&L</div>
              </div>
              
              <div className='bg-blue-50 rounded-lg p-4'>
                <h4 className='font-semibold text-blue-900 mb-2'>Size-Performance Correlation</h4>
                <div className='font-bold text-blue-600 text-lg'>
                  {formatNumber(positionSizeAnalysis.correlationWithPnL)}
                </div>
                <div className='text-sm text-blue-700 mt-1'>
                  {Math.abs(positionSizeAnalysis.correlationWithPnL) > 0.3 
                    ? positionSizeAnalysis.correlationWithPnL > 0 
                      ? "Larger positions tend to be more profitable"
                      : "Smaller positions tend to be more profitable"
                    : "Position size has weak correlation with performance"
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
