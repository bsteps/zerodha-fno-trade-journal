import React, { useMemo } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { Trade } from "../types/trade"
import { calculateStreakAnalysis, calculatePerformanceRatios, calculateMonthlyReturnsHeatmap, StreakAnalysis, PerformanceRatios, MonthlyReturnsHeatmap } from "../utils/calculations"
import { TrendingUp, TrendingDown, Award, Target, Calendar } from "lucide-react"

interface AdvancedPerformanceChartsProps {
  trades: Trade[]
}

const COLORS = ["#10B981", "#EF4444", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899"]

export function AdvancedPerformanceCharts({ trades }: AdvancedPerformanceChartsProps) {
  const streakAnalysis = useMemo(() => calculateStreakAnalysis(trades), [trades])
  const performanceRatios = useMemo(() => calculatePerformanceRatios(trades), [trades])
  const monthlyHeatmap = useMemo(() => calculateMonthlyReturnsHeatmap(trades), [trades])

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
                entry.name.includes('P&L') || entry.name.includes('Return') || entry.name.includes('Amount')
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

  // Prepare streak distribution data for chart
  const streakChartData = streakAnalysis.streakDistribution.map(streak => ({
    streakLength: `${streak.streakLength} trades`,
    winStreaks: streak.winCount,
    lossStreaks: streak.lossCount
  }))

  // Prepare performance ratios data for display
  const ratiosData = [
    { name: 'Sharpe Ratio', value: performanceRatios.sharpeRatio, benchmark: 1, color: performanceRatios.sharpeRatio >= 1 ? '#10B981' : '#EF4444' },
    { name: 'Calmar Ratio', value: performanceRatios.calmarRatio, benchmark: 0.5, color: performanceRatios.calmarRatio >= 0.5 ? '#10B981' : '#EF4444' },
    { name: 'Sortino Ratio', value: performanceRatios.sortinoRatio, benchmark: 1, color: performanceRatios.sortinoRatio >= 1 ? '#10B981' : '#EF4444' }
  ]

  return (
    <div className='space-y-6'>
      {/* Advanced Performance Summary */}
      <div className='card'>
        <h2 className='text-2xl font-bold text-gray-900 mb-6 flex items-center'>
          <Award className='w-6 h-6 text-blue-600 mr-2' />
          Advanced Performance Metrics
        </h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard
            title="Sharpe Ratio"
            value={formatNumber(performanceRatios.sharpeRatio)}
            icon={TrendingUp}
            color={performanceRatios.sharpeRatio >= 1 ? "green" : performanceRatios.sharpeRatio >= 0 ? "yellow" : "red"}
            subtitle="Risk-adjusted returns"
          />
          <StatCard
            title="Calmar Ratio"
            value={formatNumber(performanceRatios.calmarRatio)}
            icon={Target}
            color={performanceRatios.calmarRatio >= 0.5 ? "green" : performanceRatios.calmarRatio >= 0 ? "yellow" : "red"}
            subtitle="Return vs Max Drawdown"
          />
          <StatCard
            title="Current Streak"
            value={`${streakAnalysis.currentStreak.count} ${streakAnalysis.currentStreak.type}s`}
            icon={streakAnalysis.currentStreak.type === 'win' ? TrendingUp : TrendingDown}
            color={streakAnalysis.currentStreak.type === 'win' ? "green" : "red"}
            subtitle={`Longest: ${Math.max(streakAnalysis.longestWinStreak, streakAnalysis.longestLossStreak)} trades`}
          />
          <StatCard
            title="Sortino Ratio"
            value={formatNumber(performanceRatios.sortinoRatio)}
            icon={Award}
            color={performanceRatios.sortinoRatio >= 1 ? "green" : performanceRatios.sortinoRatio >= 0 ? "yellow" : "red"}
            subtitle="Downside risk adjusted"
          />
        </div>
      </div>

      {/* Performance Ratios Comparison */}
      <div className='card'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Performance Ratios vs Benchmarks</h3>
        <div className='h-64'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={ratiosData} layout='horizontal'>
              <CartesianGrid strokeDasharray='3 3' />
              <YAxis type='number' />
              <XAxis dataKey='name' type='category' width={100} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey='value' name='Your Ratio'>
                {ratiosData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
              <Bar dataKey='benchmark' fill='#9CA3AF' name='Benchmark' opacity={0.5} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className='mt-4 p-4 bg-gray-50 rounded-lg'>
          <h5 className='font-medium text-gray-900 mb-2'>Ratio Explanations:</h5>
          <ul className='text-sm text-gray-700 space-y-1'>
            <li>• <strong>Sharpe Ratio:</strong> Measures risk-adjusted returns. Above 1.0 is good, above 2.0 is excellent</li>
            <li>• <strong>Calmar Ratio:</strong> Annual return divided by maximum drawdown. Above 0.5 is good</li>
            <li>• <strong>Sortino Ratio:</strong> Like Sharpe but only considers downside volatility. Above 1.0 is good</li>
          </ul>
        </div>
      </div>

      {/* Streak Analysis */}
      {streakChartData.length > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Win/Loss Streak Distribution</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={streakChartData}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='streakLength' />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey='winStreaks' fill='#10B981' name='Win Streaks' />
                  <Bar dataKey='lossStreaks' fill='#EF4444' name='Loss Streaks' />
                  <Legend />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Streak Statistics</h3>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='bg-green-50 rounded-lg p-4'>
                  <h4 className='font-semibold text-green-900 mb-2'>Win Streaks</h4>
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-green-700'>Longest:</span>
                      <span className='font-bold text-green-600'>{streakAnalysis.longestWinStreak}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-green-700'>Average:</span>
                      <span className='font-bold text-green-600'>{formatNumber(streakAnalysis.avgWinStreak)}</span>
                    </div>
                  </div>
                </div>
                
                <div className='bg-red-50 rounded-lg p-4'>
                  <h4 className='font-semibold text-red-900 mb-2'>Loss Streaks</h4>
                  <div className='space-y-2 text-sm'>
                    <div className='flex justify-between'>
                      <span className='text-red-700'>Longest:</span>
                      <span className='font-bold text-red-600'>{streakAnalysis.longestLossStreak}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span className='text-red-700'>Average:</span>
                      <span className='font-bold text-red-600'>{formatNumber(streakAnalysis.avgLossStreak)}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className='bg-blue-50 rounded-lg p-4'>
                <h4 className='font-semibold text-blue-900 mb-2'>Current Status</h4>
                <div className='text-center'>
                  <div className={`text-2xl font-bold ${streakAnalysis.currentStreak.type === 'win' ? 'text-green-600' : 'text-red-600'}`}>
                    {streakAnalysis.currentStreak.count} {streakAnalysis.currentStreak.type === 'win' ? 'Wins' : 'Losses'}
                  </div>
                  <div className='text-sm text-blue-700 mt-1'>in a row</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Returns Heatmap */}
      {monthlyHeatmap.length > 0 && (
        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
            <Calendar className='w-5 h-5 text-blue-600 mr-2' />
            Monthly Returns Heatmap
          </h3>
          <div className='space-y-6'>
            {monthlyHeatmap.map(yearData => (
              <div key={yearData.year} className='space-y-2'>
                <div className='flex items-center justify-between'>
                  <h4 className='font-semibold text-gray-800'>{yearData.year}</h4>
                  <div className={`font-bold ${yearData.yearlyReturn >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(yearData.yearlyReturn)}
                  </div>
                </div>
                <div className='grid grid-cols-12 gap-1'>
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthData = yearData.months.find(m => m.month === i + 1);
                    const intensity = monthData ? Math.min(Math.abs(monthData.returnsPercentage) / 50, 1) : 0;
                    const isPositive = monthData ? monthData.returns >= 0 : true;
                    
                    return (
                      <div
                        key={i}
                        className={`h-8 rounded text-xs flex items-center justify-center font-medium ${
                          monthData 
                            ? isPositive 
                              ? 'text-green-800' 
                              : 'text-red-800'
                            : 'text-gray-400'
                        }`}
                        style={{
                          backgroundColor: monthData 
                            ? isPositive 
                              ? `rgba(16, 185, 129, ${0.2 + intensity * 0.6})`
                              : `rgba(239, 68, 68, ${0.2 + intensity * 0.6})`
                            : '#f3f4f6'
                        }}
                        title={monthData 
                          ? `${monthData.monthName}: ${formatCurrency(monthData.returns)} (${monthData.tradesCount} trades)`
                          : `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i]}: No trades`
                        }
                      >
                        {['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'][i]}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
          <div className='mt-4 flex items-center justify-center space-x-4 text-sm text-gray-600'>
            <div className='flex items-center space-x-2'>
              <div className='w-4 h-4 bg-green-200 rounded'></div>
              <span>Profitable</span>
            </div>
            <div className='flex items-center space-x-2'>
              <div className='w-4 h-4 bg-red-200 rounded'></div>
              <span>Loss</span>
            </div>
            <div className='flex items-center space-x-2'>
              <div className='w-4 h-4 bg-gray-200 rounded'></div>
              <span>No trades</span>
            </div>
            <span>• Darker colors indicate higher absolute returns</span>
          </div>
        </div>
      )}
    </div>
  )
}
