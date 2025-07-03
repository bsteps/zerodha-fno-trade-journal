import React, { useMemo } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"
import { Trade } from "../types/trade"
import { calculateRevengeTradingAnalysis, calculateOvertradingAnalysis, calculateBehavioralPatterns, RevengeTradingAnalysis, OvertradingAnalysis, BehavioralPatterns } from "../utils/calculations"
import { Brain, AlertTriangle, Clock, TrendingDown } from "lucide-react"
import { InfoTooltip } from './InfoTooltip'
import { AIRecommendations } from './AIRecommendations'
import { formatCurrency, formatNumber, formatPercentage, formatTime } from '../utils/formatters'
import { CustomTooltip } from './CustomTooltip'
import { StatCard } from './StatCard'

interface PsychologicalPatternsChartsProps {
  trades: Trade[]
}

const COLORS = ["#EF4444", "#10B981", "#3B82F6", "#F59E0B", "#8B5CF6", "#EC4899"]

export function PsychologicalPatternsCharts({ trades }: PsychologicalPatternsChartsProps) {
  const revengeTradingAnalysis = useMemo(() => calculateRevengeTradingAnalysis(trades), [trades])
  const overtradingAnalysis = useMemo(() => calculateOvertradingAnalysis(trades), [trades])
  const behavioralPatterns = useMemo(() => calculateBehavioralPatterns(trades), [trades])

  // Prepare comparison data for revenge vs normal trades
  const revengeComparisonData = [
    {
      type: 'Revenge Trades',
      avgPnL: revengeTradingAnalysis.avgRevengeTradePnL,
      winRate: revengeTradingAnalysis.revengeTradeWinRate,
      count: revengeTradingAnalysis.totalRevengeTrades
    },
    {
      type: 'Normal Trades',
      avgPnL: revengeTradingAnalysis.avgNormalTradePnL,
      winRate: revengeTradingAnalysis.normalTradeWinRate,
      count: revengeTradingAnalysis.revengeTradesByDay.reduce((sum, day) => sum + day.normalTrades, 0)
    }
  ]

  // Prepare overtrading comparison data
  const overtradingComparisonData = [
    {
      type: 'Overtrading Days',
      avgPnL: overtradingAnalysis.overtradingAvgPnL,
      winRate: overtradingAnalysis.overtradingWinRate,
      days: overtradingAnalysis.overtradingDays
    },
    {
      type: 'Normal Days',
      avgPnL: overtradingAnalysis.normalTradingAvgPnL,
      winRate: overtradingAnalysis.normalTradingWinRate,
      days: overtradingAnalysis.normalTradingDays
    }
  ]

  // Prepare emotional indicators data
  const emotionalIndicatorsData = [
    { name: 'Large Position After Loss', value: behavioralPatterns.emotionalTradingIndicators.largePositionAfterLoss },
    { name: 'Rapid Fire Trades', value: behavioralPatterns.emotionalTradingIndicators.rapidFireTrades },
    { name: 'Late Trading', value: behavioralPatterns.emotionalTradingIndicators.lateNightTrades }
  ]

  return (
    <div className='space-y-6'>
      {/* Psychological Patterns Summary */}
      <div className='card'>
        <h2 className='text-2xl font-bold text-gray-900 mb-6 flex items-center'>
          <Brain className='w-6 h-6 text-purple-600 mr-2' />
          Psychological Trading Patterns
        </h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard
            title="Revenge Trades"
            value={`${revengeTradingAnalysis.totalRevengeTrades}`}
            icon={AlertTriangle}
            color={revengeTradingAnalysis.revengeTradePercentage > 20 ? "red" : revengeTradingAnalysis.revengeTradePercentage > 10 ? "yellow" : "green"}
            subtitle={`${formatPercentage(revengeTradingAnalysis.revengeTradePercentage)} of all trades`}
          />
          <StatCard
            title="Overtrading Days"
            value={`${overtradingAnalysis.overtradingDays}`}
            icon={TrendingDown}
            color={overtradingAnalysis.overtradingDays > overtradingAnalysis.normalTradingDays * 0.3 ? "red" : "yellow"}
            subtitle={`Threshold: ${overtradingAnalysis.overtradingThreshold}+ trades/day`}
          />
          <StatCard
            title="Profit Taking Speed"
            value={behavioralPatterns.profitTakingSpeed.pattern.split(',')[0]}
            icon={Clock}
            color={behavioralPatterns.profitTakingSpeed.pattern === 'Quick Profits, Slow Losses' ? "red" : "blue"}
            subtitle={`Ratio: ${formatNumber(behavioralPatterns.profitTakingSpeed.ratio)}`}
          />
          <StatCard
            title="Weekend Gap Impact"
            value={formatCurrency(behavioralPatterns.weekendGapEffect.weekendGapImpact)}
            icon={Brain}
            color={behavioralPatterns.weekendGapEffect.weekendGapImpact < 0 ? "red" : "green"}
            subtitle="Monday vs Friday performance"
          />
        </div>
      </div>

      {/* Revenge Trading Analysis */}
      {revengeTradingAnalysis.totalRevengeTrades > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Revenge vs Normal Trading Performance</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={revengeComparisonData}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='type' />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey='avgPnL' name='Average P&L'>
                    <Cell fill="#EF4444" />
                    <Cell fill="#10B981" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Revenge Trading Insights</h3>
            <div className='space-y-4'>
              <div className='bg-red-50 rounded-lg p-4'>
                <h4 className='font-semibold text-red-900 mb-2'>Revenge Trading Stats</h4>
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-red-700'>Total Revenge Trades:</span>
                    <span className='font-bold text-red-600'>{revengeTradingAnalysis.totalRevengeTrades}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-red-700'>Percentage:</span>
                    <span className='font-bold text-red-600'>{formatPercentage(revengeTradingAnalysis.revengeTradePercentage)}</span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-red-700'>Avg P&L:</span>
                    <span className={`font-bold ${revengeTradingAnalysis.avgRevengeTradePnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(revengeTradingAnalysis.avgRevengeTradePnL)}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-red-700'>Win Rate:</span>
                    <span className='font-bold text-red-600'>{formatPercentage(revengeTradingAnalysis.revengeTradeWinRate)}</span>
                  </div>
                </div>
              </div>
              
              <div className='bg-green-50 rounded-lg p-4'>
                <h4 className='font-semibold text-green-900 mb-2'>Normal Trading Stats</h4>
                <div className='space-y-2 text-sm'>
                  <div className='flex justify-between'>
                    <span className='text-green-700'>Avg P&L:</span>
                    <span className={`font-bold ${revengeTradingAnalysis.avgNormalTradePnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(revengeTradingAnalysis.avgNormalTradePnL)}
                    </span>
                  </div>
                  <div className='flex justify-between'>
                    <span className='text-green-700'>Win Rate:</span>
                    <span className='font-bold text-green-600'>{formatPercentage(revengeTradingAnalysis.normalTradeWinRate)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Overtrading Analysis */}
      {overtradingAnalysis.overtradingDays > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Overtrading vs Normal Days Performance</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={overtradingComparisonData}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='type' />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey='avgPnL' name='Average P&L per Trade'>
                    <Cell fill="#F59E0B" />
                    <Cell fill="#3B82F6" />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Daily Trading Pattern</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={overtradingAnalysis.dailyTradeStats.slice(-30)}> {/* Last 30 days */}
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type='monotone' dataKey='tradeCount' stroke='#8B5CF6' strokeWidth={2} name='Daily Trade Count' />
                  <Line type='monotone' dataKey='avgPnL' stroke='#10B981' strokeWidth={2} name='Avg P&L per Trade' />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Behavioral Patterns */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Emotional Trading Indicators</h3>
          <div className='h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie
                  data={emotionalIndicatorsData}
                  cx='50%'
                  cy='50%'
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill='#8884d8'
                  dataKey='value'
                >
                  {emotionalIndicatorsData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Profit Taking Behavior</h3>
          <div className='space-y-4'>
            <div className='bg-purple-50 rounded-lg p-4'>
              <h4 className='font-semibold text-purple-900 mb-2'>Hold Time Analysis</h4>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-purple-700'>Avg Win Hold Time:</span>
                  <span className='font-bold text-green-600'>{formatTime(behavioralPatterns.profitTakingSpeed.avgWinHoldTime)}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-purple-700'>Avg Loss Hold Time:</span>
                  <span className='font-bold text-red-600'>{formatTime(behavioralPatterns.profitTakingSpeed.avgLossHoldTime)}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-purple-700'>Ratio (Win/Loss):</span>
                  <span className='font-bold text-purple-600'>{formatNumber(behavioralPatterns.profitTakingSpeed.ratio)}</span>
                </div>
                <div className='mt-2 p-2 bg-white rounded'>
                  <span className='text-purple-700'>Pattern: </span>
                  <span className={`font-bold ${
                    behavioralPatterns.profitTakingSpeed.pattern === 'Quick Profits, Slow Losses' ? 'text-red-600' :
                    behavioralPatterns.profitTakingSpeed.pattern === 'Balanced' ? 'text-green-600' : 'text-blue-600'
                  }`}>
                    {behavioralPatterns.profitTakingSpeed.pattern}
                  </span>
                </div>
              </div>
            </div>
            
            <div className='bg-blue-50 rounded-lg p-4'>
              <h4 className='font-semibold text-blue-900 mb-2'>Weekend Gap Effect</h4>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-blue-700'>Monday Performance:</span>
                  <span className={`font-bold ${behavioralPatterns.weekendGapEffect.mondayPerformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(behavioralPatterns.weekendGapEffect.mondayPerformance)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-blue-700'>Friday Performance:</span>
                  <span className={`font-bold ${behavioralPatterns.weekendGapEffect.fridayPerformance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(behavioralPatterns.weekendGapEffect.fridayPerformance)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-blue-700'>Gap Impact:</span>
                  <span className={`font-bold ${behavioralPatterns.weekendGapEffect.weekendGapImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(behavioralPatterns.weekendGapEffect.weekendGapImpact)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Psychological Insights */}
      <div className='card'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Psychological Trading Insights</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          <div className='bg-red-50 rounded-lg p-4'>
            <h4 className='font-semibold text-red-900 mb-2'>⚠️ Warning Signs</h4>
            <ul className='text-sm text-red-700 space-y-1'>
              {revengeTradingAnalysis.revengeTradePercentage > 15 && (
                <li>• High revenge trading rate ({formatPercentage(revengeTradingAnalysis.revengeTradePercentage)})</li>
              )}
              {behavioralPatterns.profitTakingSpeed.pattern === 'Quick Profits, Slow Losses' && (
                <li>• Taking profits too quickly, holding losses too long</li>
              )}
              {behavioralPatterns.emotionalTradingIndicators.rapidFireTrades > 5 && (
                <li>• Frequent rapid-fire trading ({behavioralPatterns.emotionalTradingIndicators.rapidFireTrades} instances)</li>
              )}
              {overtradingAnalysis.overtradingDays > overtradingAnalysis.normalTradingDays * 0.3 && (
                <li>• Overtrading on {overtradingAnalysis.overtradingDays} days</li>
              )}
            </ul>
          </div>
          
          <div className='bg-yellow-50 rounded-lg p-4'>
            <h4 className='font-semibold text-yellow-900 mb-2'>💡 Recommendations</h4>
            <ul className='text-sm text-yellow-700 space-y-1'>
              <li>• Set cooling-off periods after losses</li>
              <li>• Limit daily trade count to {overtradingAnalysis.overtradingThreshold - 1}</li>
              <li>• Use position sizing rules consistently</li>
              <li>• Avoid trading in the last hour (after 2:30 PM)</li>
            </ul>
          </div>
          
          <div className='bg-green-50 rounded-lg p-4'>
            <h4 className='font-semibold text-green-900 mb-2'>✅ Positive Patterns</h4>
            <ul className='text-sm text-green-700 space-y-1'>
              {revengeTradingAnalysis.revengeTradePercentage < 10 && (
                <li>• Low revenge trading rate</li>
              )}
              {behavioralPatterns.profitTakingSpeed.pattern === 'Balanced' && (
                <li>• Balanced profit/loss holding times</li>
              )}
              {overtradingAnalysis.normalTradingAvgPnL > overtradingAnalysis.overtradingAvgPnL && (
                <li>• Better performance on normal trading days</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <AIRecommendations
        trades={trades}
        analysisData={{
          revengeTradingAnalysis,
          overtradingAnalysis,
          behavioralPatterns
        }}
        pageContext="psychological-patterns"
        pageTitle="Psychological Patterns Analysis"
        dataDescription="emotional trading patterns and discipline data"
      />
    </div>
  )
}
