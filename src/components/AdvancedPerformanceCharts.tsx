import React, { useMemo } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from "recharts"
import { Trade } from "../types/trade"
import { calculateStreakAnalysis, calculatePerformanceRatios, calculateMonthlyReturnsHeatmap, StreakAnalysis, PerformanceRatios, MonthlyReturnsHeatmap } from "../utils/calculations"
import { TrendingUp, TrendingDown, Award, Target, Calendar } from "lucide-react"
import { InfoTooltip } from "./InfoTooltip"
import { AIRecommendations } from "./AIRecommendations"
import { formatCurrency, formatNumber } from '../utils/formatters'
import { CustomTooltip } from './CustomTooltip'
import { StatCard } from './StatCard'

interface AdvancedPerformanceChartsProps {
  trades: Trade[]
}

const COLORS = ["#10B981", "#EF4444", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899"]

export function AdvancedPerformanceCharts({ trades }: AdvancedPerformanceChartsProps) {
  const streakAnalysis = useMemo(() => calculateStreakAnalysis(trades), [trades])
  const performanceRatios = useMemo(() => calculatePerformanceRatios(trades), [trades])
  const monthlyHeatmap = useMemo(() => calculateMonthlyReturnsHeatmap(trades), [trades])

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
          <InfoTooltip
            content="Advanced risk-adjusted performance metrics that help evaluate trading strategy effectiveness beyond simple profit/loss. These ratios are used by professional traders and institutions to assess strategy quality."
            id="advanced-performance-header"
          />
        </h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <div className="relative">
            <StatCard
              title="Sharpe Ratio"
              value={formatNumber(performanceRatios.sharpeRatio)}
              icon={TrendingUp}
              color={performanceRatios.sharpeRatio >= 1 ? "green" : performanceRatios.sharpeRatio >= 0 ? "yellow" : "red"}
              subtitle="Risk-adjusted returns"
            />
            <div className="absolute top-2 right-2">
              <InfoTooltip
                content="Sharpe Ratio measures risk-adjusted returns by dividing annual return by annual volatility. Values above 1.0 are good, above 2.0 are excellent. Negative values indicate poor risk management."
                id="sharpe-ratio-info"
              />
            </div>
          </div>
          <div className="relative">
            <StatCard
              title="Calmar Ratio"
              value={formatNumber(performanceRatios.calmarRatio)}
              icon={Target}
              color={performanceRatios.calmarRatio >= 0.5 ? "green" : performanceRatios.calmarRatio >= 0 ? "yellow" : "red"}
              subtitle="Return vs Max Drawdown"
            />
            <div className="absolute top-2 right-2">
              <InfoTooltip
                content="Calmar Ratio divides annual return by maximum drawdown. It shows how much return you get per unit of worst-case loss. Values above 0.5 are good, above 3.0 are excellent."
                id="calmar-ratio-info"
              />
            </div>
          </div>
          <div className="relative">
            <StatCard
              title="Current Streak"
              value={`${streakAnalysis.currentStreak.count} ${streakAnalysis.currentStreak.type}s`}
              icon={streakAnalysis.currentStreak.type === 'win' ? TrendingUp : TrendingDown}
              color={streakAnalysis.currentStreak.type === 'win' ? "green" : "red"}
              subtitle={`Longest: ${Math.max(streakAnalysis.longestWinStreak, streakAnalysis.longestLossStreak)} trades`}
            />
            <div className="absolute top-2 right-2">
              <InfoTooltip
                content="Current Streak shows your active winning or losing sequence. Long losing streaks may indicate strategy issues or emotional trading. Monitor this to manage psychology and risk."
                id="current-streak-info"
              />
            </div>
          </div>
          <div className="relative">
            <StatCard
              title="Sortino Ratio"
              value={formatNumber(performanceRatios.sortinoRatio)}
              icon={Award}
              color={performanceRatios.sortinoRatio >= 1 ? "green" : performanceRatios.sortinoRatio >= 0 ? "yellow" : "red"}
              subtitle="Downside risk adjusted"
            />
            <div className="absolute top-2 right-2">
              <InfoTooltip
                content="Sortino Ratio is like Sharpe Ratio but only considers downside volatility, ignoring upside volatility. This gives a better picture of risk since upside volatility is desirable."
                id="sortino-ratio-info"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Performance Ratios Comparison */}
      <div className='card'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
          Performance Ratios vs Benchmarks
          <InfoTooltip
            content="This chart compares your performance ratios against industry benchmarks. Green bars indicate good performance, red bars suggest areas for improvement. The gray bars show benchmark values to aim for."
            id="ratios-comparison-info"
          />
        </h3>
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
            <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
              Win/Loss Streak Distribution
              <InfoTooltip
                content="Shows the frequency of different streak lengths. Ideally, you want more short loss streaks and longer win streaks. Long loss streaks indicate poor risk management or emotional trading."
                id="streak-distribution-info"
              />
            </h3>
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
            <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
              Streak Statistics
              <InfoTooltip
                content="Detailed streak analysis showing your longest and average winning/losing streaks. Good traders typically have longer average win streaks than loss streaks, indicating they let winners run and cut losses short."
                id="streak-statistics-info"
              />
            </h3>
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-4'>
                <div className='bg-green-50 rounded-lg p-4'>
                  <h4 className='font-semibold text-green-900 mb-2 flex items-center'>
                    Win Streaks
                    <InfoTooltip
                      content="Win streak statistics show your ability to maintain profitable momentum. Longer win streaks indicate good strategy execution and emotional control during profitable periods."
                      id="win-streaks-info"
                    />
                  </h4>
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
                  <h4 className='font-semibold text-red-900 mb-2 flex items-center'>
                    Loss Streaks
                    <InfoTooltip
                      content="Loss streak statistics reveal risk management effectiveness. Long loss streaks often indicate emotional trading, poor stop-loss discipline, or strategy breakdown. Aim to keep these short."
                      id="loss-streaks-info"
                    />
                  </h4>
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
                <h4 className='font-semibold text-blue-900 mb-2 flex items-center'>
                  Current Status
                  <InfoTooltip
                    content="Your current active streak. If on a losing streak, consider reducing position sizes or taking a break to reset psychology. If on a winning streak, maintain discipline and don't get overconfident."
                    id="current-status-info"
                  />
                </h4>
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
            <InfoTooltip
              content="Visual representation of monthly performance across years. Green indicates profitable months, red shows losses. Darker colors represent higher absolute returns. Helps identify seasonal patterns and consistency."
              id="monthly-heatmap-info"
            />
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

      {/* AI Recommendations */}
      <AIRecommendations
        trades={trades}
        analysisData={{
          streakAnalysis,
          performanceRatios,
          monthlyHeatmap
        }}
        pageContext="advanced-performance"
      />
    </div>
  )
}
