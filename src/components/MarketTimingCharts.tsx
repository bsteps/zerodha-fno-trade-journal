import { Activity, Calendar, Clock, TrendingUp } from "lucide-react"
import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Trade } from "../types/trade"
import { calculateDayOfWeekAnalysis, calculateMarketSessionAnalysis, calculatePositions, calculateHoldingPeriodAnalysis } from "../utils/calculations"
import { AIRecommendations } from './AIRecommendations'
import { StatCard } from './StatCard'
import { CustomTooltip } from './CustomTooltip'
import { formatCurrency, formatNumber, formatPercentage } from '../utils/formatters'

interface MarketTimingChartsProps {
  trades: Trade[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658"]

export function MarketTimingCharts({ trades }: MarketTimingChartsProps) {
  const positions = useMemo(() => calculatePositions(trades), [trades])

  const dayOfWeekAnalysis = useMemo(() => calculateDayOfWeekAnalysis(positions), [positions])
  const marketSessionAnalysis = useMemo(() => calculateMarketSessionAnalysis(positions), [positions])
  const holdingPeriodAnalysis = useMemo(() => calculateHoldingPeriodAnalysis(positions), [positions])

  console.log(marketSessionAnalysis);
  

  // Find best performing day and session
  const bestDay = dayOfWeekAnalysis.reduce((best, day) => 
    day.avgPnL > best.avgPnL ? day : best, 
    dayOfWeekAnalysis[0] || { dayOfWeek: 'N/A', avgPnL: 0, winRate: 0 }
  )

  const bestSession = marketSessionAnalysis.reduce((best, session) => 
    session.avgPnL > best.avgPnL ? session : best, 
    marketSessionAnalysis[0] || { session: 'N/A', avgPnL: 0, winRate: 0 }
  )

  const bestHoldingPeriod = holdingPeriodAnalysis.reduce((best, period) =>
    period.avgPnL > best.avgPnL ? period : best,
    holdingPeriodAnalysis[0] || { holdingPeriodRange: 'N/A', avgPnL: 0, winRate: 0 }
  )

  // Prepare radar chart data for day of week analysis
  const radarData = dayOfWeekAnalysis.map(day => ({
    day: day.dayOfWeek.substring(0, 3), // Abbreviated day names
    winRate: day.winRate,
    avgPnL: Math.max(day.avgPnL, 0), // Only positive values for radar
    totalTrades: day.totalTrades
  }))

  return (
    <div className='space-y-6'>
      {/* Market Timing Summary */}
      <div className='card'>
        <h2 className='text-2xl font-bold text-gray-900 mb-6 flex items-center'>
          <Clock className='w-6 h-6 text-blue-600 mr-2' />
          Market Timing Analytics
        </h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard
            title="Best Day"
            value={bestDay.dayOfWeek}
            icon={Calendar}
            color="green"
            subtitle={`${formatCurrency(bestDay.avgPnL)} avg • ${formatPercentage(bestDay.winRate)} win rate`}
          />
          <StatCard
            title="Best Session"
            value={bestSession.session}
            icon={Clock}
            color="blue"
            subtitle={`${formatCurrency(bestSession.avgPnL)} avg • ${bestSession.timeRange}`}
          />
          <StatCard
            title="Best Holding Period"
            value={bestHoldingPeriod.holdingPeriodRange}
            icon={Activity}
            color="yellow"
            subtitle={`${formatCurrency(bestHoldingPeriod.avgPnL)} avg P&L`}
          />
          <StatCard
            title="Trading Days"
            value={dayOfWeekAnalysis.length}
            icon={TrendingUp}
            color="gray"
            subtitle={`${marketSessionAnalysis.length} active sessions`}
          />
        </div>
      </div>

      {/* Day of Week Analysis */}
      {dayOfWeekAnalysis.length > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Day of Week Performance</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={dayOfWeekAnalysis}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='dayOfWeek' />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey='avgPnL' name='Average P&L'>
                    {dayOfWeekAnalysis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avgPnL >= 0 ? "#10B981" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Day of Week Win Rates</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={dayOfWeekAnalysis}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='dayOfWeek' />
                  <YAxis domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type='monotone' dataKey='winRate' stroke='#3B82F6' strokeWidth={3} name='Win Rate (%)' />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Market Session Analysis */}
      {marketSessionAnalysis.length > 0 && (
        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Market Session Performance</h3>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={marketSessionAnalysis}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='session' angle={-45} textAnchor='end' height={80} />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey='avgPnL' name='Average P&L'>
                    {marketSessionAnalysis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avgPnL >= 0 ? "#10B981" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className='space-y-3'>
              {marketSessionAnalysis.map((session, index) => (
                <div key={session.session} className='bg-gray-50 rounded-lg p-3'>
                  <div className='flex items-center justify-between mb-2'>
                    <h4 className='font-semibold text-gray-900'>{session.session}</h4>
                    <span className='text-sm text-gray-600'>{session.timeRange}</span>
                  </div>
                  <div className='grid grid-cols-3 gap-2 text-sm'>
                    <div>
                      <span className='text-gray-600'>Trades:</span>
                      <div className='font-bold'>{session.totalTrades}</div>
                    </div>
                    <div>
                      <span className='text-gray-600'>Avg P&L:</span>
                      <div className={`font-bold ${session.avgPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(session.avgPnL)}
                      </div>
                    </div>
                    <div>
                      <span className='text-gray-600'>Win Rate:</span>
                      <div className='font-bold text-blue-600'>{formatPercentage(session.winRate)}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Holding Period Analysis */}
      {holdingPeriodAnalysis.length > 0 && (
        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Holding Period vs Performance Analysis</h3>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={holdingPeriodAnalysis} margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='holdingPeriodRange' angle={-45} textAnchor='end' height={80} />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey='avgPnL' name='Average P&L'>
                    {holdingPeriodAnalysis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avgPnL >= 0 ? "#10B981" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={holdingPeriodAnalysis}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='holdingPeriodRange' angle={-45} textAnchor='end' height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type='monotone' dataKey='winRate' stroke='#8B5CF6' strokeWidth={3} name='Win Rate (%)' />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='mt-4 p-4 bg-blue-50 rounded-lg'>
            <h5 className='font-medium text-blue-900 mb-2'>Holding Period Insights:</h5>
            <ul className='text-sm text-blue-700 space-y-1'>
              <li>• <strong>Scalping (0-15 min):</strong> Quick trades with minimal time exposure</li>
              <li>• <strong>Short-term (15-60 min):</strong> Brief positions capturing short-term moves</li>
              <li>• <strong>Medium-term (1-4 hours):</strong> Moderate holding periods for trend following</li>
              <li>• <strong>Intraday (4-24 hours):</strong> Full session or overnight positions</li>
              <li>• <strong>Multi-day (1+ days):</strong> Swing trading with extended exposure</li>
              <li>• <strong>Optimal Period:</strong> {bestHoldingPeriod.holdingPeriodRange} shows best average P&L</li>
            </ul>
          </div>
        </div>
      )}

      {/* Day of Week Radar Chart */}
      {radarData.length > 0 && (
        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Weekly Performance Radar</h3>
          <div className='h-80'>
            <ResponsiveContainer width='100%' height='100%'>
              <RadarChart data={radarData}>
                <PolarGrid />
                <PolarAngleAxis dataKey='day' />
                <PolarRadiusAxis angle={90} domain={[0, 100]} />
                <Radar name='Win Rate (%)' dataKey='winRate' stroke='#3B82F6' fill='#3B82F6' fillOpacity={0.3} />
                <Radar name='Trade Count' dataKey='totalTrades' stroke='#10B981' fill='#10B981' fillOpacity={0.2} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className='mt-4 text-center text-sm text-gray-600'>
            Radar chart showing win rate and trade frequency by day of week
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      <AIRecommendations
        trades={trades}
        analysisData={{
          dayOfWeekAnalysis,
          marketSessionAnalysis,
          holdingPeriodAnalysis
        }}
        pageContext="market-timing"
        pageTitle="Market Timing Analysis"
        dataDescription="entry/exit timing and market condition analysis data"
      />
    </div>
  )
}
