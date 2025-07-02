import React, { useMemo } from "react"
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, Cell } from "recharts"
import { Trade } from "../types/trade"
import { calculateBenchmarkComparison, calculateRollingPerformance, calculatePerformanceRanking, BenchmarkComparison, RollingPerformance, PerformanceRanking } from "../utils/calculations"
import { TrendingUp, Award, Target, BarChart3 } from "lucide-react"

interface ComparativeAnalyticsChartsProps {
  trades: Trade[]
}

const COLORS = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"]

export function ComparativeAnalyticsCharts({ trades }: ComparativeAnalyticsChartsProps) {
  const benchmarkComparison = useMemo(() => calculateBenchmarkComparison(trades), [trades])
  const rollingPerformance30D = useMemo(() => calculateRollingPerformance(trades, 30), [trades])
  const rollingPerformance7D = useMemo(() => calculateRollingPerformance(trades, 7), [trades])
  const performanceRanking = useMemo(() => calculatePerformanceRanking(trades), [trades])

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
                entry.name.includes('Return') || entry.name.includes('Performance') || entry.name.includes('Outperformance')
                  ? formatPercentage(entry.value)
                  : entry.name.includes('P&L') || entry.name.includes('Drawdown')
                  ? formatCurrency(entry.value)
                  : entry.name.includes('Sharpe') || entry.name.includes('Volatility')
                  ? formatNumber(entry.value)
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

  // Calculate summary statistics
  const totalOutperformance = benchmarkComparison.length > 0 ? 
    benchmarkComparison[benchmarkComparison.length - 1].cumulativeOutperformance : 0

  const avgDailyOutperformance = benchmarkComparison.length > 0 ? 
    benchmarkComparison.reduce((sum, day) => sum + day.outperformance, 0) / benchmarkComparison.length : 0

  const outperformingDays = benchmarkComparison.filter(day => day.outperformance > 0).length
  const outperformanceRate = benchmarkComparison.length > 0 ? (outperformingDays / benchmarkComparison.length) * 100 : 0

  const currentRolling30D = rollingPerformance30D.length > 0 ? rollingPerformance30D[rollingPerformance30D.length - 1] : null

  return (
    <div className='space-y-6'>
      {/* Comparative Analytics Summary */}
      <div className='card'>
        <h2 className='text-2xl font-bold text-gray-900 mb-6 flex items-center'>
          <BarChart3 className='w-6 h-6 text-blue-600 mr-2' />
          Comparative Analytics
        </h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard
            title="Total Outperformance"
            value={formatPercentage(totalOutperformance)}
            icon={TrendingUp}
            color={totalOutperformance >= 0 ? "green" : "red"}
            subtitle="vs Benchmark (cumulative)"
          />
          <StatCard
            title="Daily Outperformance"
            value={formatPercentage(avgDailyOutperformance)}
            icon={Target}
            color={avgDailyOutperformance >= 0 ? "green" : "red"}
            subtitle="Average daily excess return"
          />
          <StatCard
            title="Outperformance Rate"
            value={formatPercentage(outperformanceRate)}
            icon={Award}
            color={outperformanceRate >= 50 ? "green" : "yellow"}
            subtitle={`${outperformingDays} out of ${benchmarkComparison.length} days`}
          />
          <StatCard
            title="30D Rolling Sharpe"
            value={currentRolling30D ? formatNumber(currentRolling30D.rollingSharpe) : "N/A"}
            icon={BarChart3}
            color={currentRolling30D && currentRolling30D.rollingSharpe >= 1 ? "green" : "blue"}
            subtitle="Current 30-day window"
          />
        </div>
      </div>

      {/* Benchmark Comparison */}
      {benchmarkComparison.length > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Cumulative Performance vs Benchmark</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <AreaChart data={benchmarkComparison}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis tickFormatter={(value) => formatPercentage(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Area type='monotone' dataKey='cumulativePortfolioReturn' stackId='1' stroke='#3B82F6' fill='#3B82F6' fillOpacity={0.3} name='Portfolio Return (%)' />
                  <Area type='monotone' dataKey='cumulativeBenchmarkReturn' stackId='2' stroke='#10B981' fill='#10B981' fillOpacity={0.3} name='Benchmark Return (%)' />
                  <Legend />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Daily Outperformance</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={benchmarkComparison.slice(-30)}> {/* Last 30 days */}
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis tickFormatter={(value) => formatPercentage(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey='outperformance' name='Daily Outperformance (%)'>
                    {benchmarkComparison.slice(-30).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.outperformance >= 0 ? "#10B981" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Rolling Performance Analysis */}
      {rollingPerformance30D.length > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>30-Day Rolling Sharpe Ratio</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={rollingPerformance30D}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type='monotone' dataKey='rollingSharpe' stroke='#8B5CF6' strokeWidth={2} name='Rolling Sharpe Ratio' />
                  <Line type='monotone' dataKey='rollingWinRate' stroke='#F59E0B' strokeWidth={2} name='Rolling Win Rate (%)' />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>30-Day Rolling Returns vs Volatility</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={rollingPerformance30D}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type='monotone' dataKey='rollingReturn' stroke='#3B82F6' strokeWidth={2} name='Rolling Return' />
                  <Line type='monotone' dataKey='rollingVolatility' stroke='#EF4444' strokeWidth={2} name='Rolling Volatility' />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Performance Rankings */}
      {performanceRanking.length > 0 && (
        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Performance Rankings by Period</h3>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={performanceRanking}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='period' />
                  <YAxis tickFormatter={(value) => formatPercentage(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey='portfolioReturn' fill='#3B82F6' name='Portfolio Return (%)' />
                  <Bar dataKey='benchmarkReturn' fill='#10B981' name='Benchmark Return (%)' />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className='space-y-3'>
              {performanceRanking.map((ranking, index) => (
                <div key={index} className='bg-gray-50 rounded-lg p-4'>
                  <div className='flex items-center justify-between mb-2'>
                    <h4 className='font-semibold text-gray-900'>{ranking.period} Performance</h4>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      ranking.isOutperforming ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {ranking.isOutperforming ? 'Outperforming' : 'Underperforming'}
                    </span>
                  </div>
                  <div className='grid grid-cols-2 gap-4 text-sm'>
                    <div>
                      <span className='text-gray-600'>Portfolio:</span>
                      <div className={`font-bold ${ranking.portfolioReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(ranking.portfolioReturn)}
                      </div>
                    </div>
                    <div>
                      <span className='text-gray-600'>Benchmark:</span>
                      <div className={`font-bold ${ranking.benchmarkReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(ranking.benchmarkReturn)}
                      </div>
                    </div>
                    <div>
                      <span className='text-gray-600'>Outperformance:</span>
                      <div className={`font-bold ${ranking.outperformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercentage(ranking.outperformance)}
                      </div>
                    </div>
                    <div>
                      <span className='text-gray-600'>Percentile:</span>
                      <div className='font-bold text-blue-600'>{formatNumber(ranking.percentileRank)}th</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Rolling Performance Comparison */}
      {rollingPerformance7D.length > 0 && rollingPerformance30D.length > 0 && (
        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Rolling Performance Comparison (7D vs 30D)</h3>
          <div className='h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='date' />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  data={rollingPerformance7D} 
                  type='monotone' 
                  dataKey='rollingSharpe' 
                  stroke='#F59E0B' 
                  strokeWidth={2} 
                  name='7D Rolling Sharpe' 
                />
                <Line 
                  data={rollingPerformance30D} 
                  type='monotone' 
                  dataKey='rollingSharpe' 
                  stroke='#8B5CF6' 
                  strokeWidth={2} 
                  name='30D Rolling Sharpe' 
                />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className='mt-4 p-4 bg-blue-50 rounded-lg'>
            <h5 className='font-medium text-blue-900 mb-2'>Rolling Performance Insights:</h5>
            <ul className='text-sm text-blue-700 space-y-1'>
              <li>• <strong>7-Day Rolling:</strong> Shows short-term performance trends and volatility</li>
              <li>• <strong>30-Day Rolling:</strong> Provides smoother, more stable performance view</li>
              <li>• <strong>Divergence:</strong> Large gaps indicate inconsistent short-term performance</li>
              <li>• <strong>Convergence:</strong> Similar values suggest stable trading performance</li>
            </ul>
          </div>
        </div>
      )}

      {/* Comparative Insights */}
      <div className='card'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Comparative Performance Insights</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          <div className='bg-green-50 rounded-lg p-4'>
            <h4 className='font-semibold text-green-900 mb-2'>✅ Strengths</h4>
            <ul className='text-sm text-green-700 space-y-1'>
              {totalOutperformance > 0 && (
                <li>• Positive cumulative outperformance ({formatPercentage(totalOutperformance)})</li>
              )}
              {outperformanceRate > 50 && (
                <li>• Outperforming benchmark {formatPercentage(outperformanceRate)} of the time</li>
              )}
              {currentRolling30D && currentRolling30D.rollingSharpe > 1 && (
                <li>• Strong risk-adjusted returns (Sharpe &gt; 1.0)</li>
              )}
              {avgDailyOutperformance > 0 && (
                <li>• Consistent daily outperformance</li>
              )}
            </ul>
          </div>
          
          <div className='bg-yellow-50 rounded-lg p-4'>
            <h4 className='font-semibold text-yellow-900 mb-2'>⚠️ Areas for Improvement</h4>
            <ul className='text-sm text-yellow-700 space-y-1'>
              {totalOutperformance < 0 && (
                <li>• Underperforming benchmark overall</li>
              )}
              {outperformanceRate < 50 && (
                <li>• Outperforming less than 50% of the time</li>
              )}
              {currentRolling30D && currentRolling30D.rollingSharpe < 0.5 && (
                <li>• Low risk-adjusted returns</li>
              )}
              {avgDailyOutperformance < 0 && (
                <li>• Negative average daily outperformance</li>
              )}
            </ul>
          </div>
          
          <div className='bg-blue-50 rounded-lg p-4'>
            <h4 className='font-semibold text-blue-900 mb-2'>📊 Key Metrics</h4>
            <ul className='text-sm text-blue-700 space-y-1'>
              <li>• Total outperformance: {formatPercentage(totalOutperformance)}</li>
              <li>• Outperformance rate: {formatPercentage(outperformanceRate)}</li>
              <li>• Avg daily excess return: {formatPercentage(avgDailyOutperformance)}</li>
              {currentRolling30D && (
                <li>• Current 30D Sharpe: {formatNumber(currentRolling30D.rollingSharpe)}</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
