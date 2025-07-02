import React, { useMemo } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie } from "recharts"
import { Trade } from "../types/trade"
import { calculateHoldTimeAnalysis, calculateEntryExitTimingAnalysis, calculateInstrumentTypeAnalysis, HoldTimeAnalysis, EntryExitTimingAnalysis, InstrumentTypeAnalysis } from "../utils/calculations"
import { Clock, Target, TrendingUp, Activity } from "lucide-react"

interface StrategyAnalysisChartsProps {
  trades: Trade[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export function StrategyAnalysisCharts({ trades }: StrategyAnalysisChartsProps) {
  const holdTimeAnalysis = useMemo(() => calculateHoldTimeAnalysis(trades), [trades])
  const entryExitAnalysis = useMemo(() => calculateEntryExitTimingAnalysis(trades), [trades])
  const instrumentAnalysis = useMemo(() => calculateInstrumentTypeAnalysis(trades), [trades])

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

  const formatTime = (minutes: number) => {
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

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-white p-3 border border-gray-300 rounded-lg shadow-lg'>
          <p className='text-gray-900 font-medium'>{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {`${entry.name}: ${
                entry.name.includes('P&L') || entry.name.includes('Avg')
                  ? formatCurrency(entry.value)
                  : entry.name.includes('%') || entry.name.includes('Rate')
                  ? formatPercentage(entry.value)
                  : entry.name.includes('Time')
                  ? formatTime(entry.value)
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

  // Find best performing strategies
  const bestHoldTime = holdTimeAnalysis.reduce((best, ht) => 
    ht.avgPnL > best.avgPnL ? ht : best, 
    holdTimeAnalysis[0] || { holdTimeRange: 'N/A', avgPnL: 0, avgHoldTimeMinutes: 0 }
  )

  const bestInstrument = instrumentAnalysis.reduce((best, inst) => 
    inst.avgPnL > best.avgPnL ? inst : best, 
    instrumentAnalysis[0] || { instrumentName: 'N/A', avgPnL: 0, winRate: 0 }
  )

  const bestEntryHour = entryExitAnalysis.reduce((best, timing) => 
    timing.entryAvgPnL > best.entryAvgPnL ? timing : best, 
    entryExitAnalysis[0] || { timeLabel: 'N/A', entryAvgPnL: 0 }
  )

  const bestExitHour = entryExitAnalysis.reduce((best, timing) => 
    timing.exitAvgPnL > best.exitAvgPnL ? timing : best, 
    entryExitAnalysis[0] || { timeLabel: 'N/A', exitAvgPnL: 0 }
  )

  return (
    <div className='space-y-6'>
      {/* Strategy Analysis Summary */}
      <div className='card'>
        <h2 className='text-2xl font-bold text-gray-900 mb-6 flex items-center'>
          <Target className='w-6 h-6 text-blue-600 mr-2' />
          Strategy Analysis
        </h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard
            title="Best Hold Time"
            value={bestHoldTime.holdTimeRange.split(' ')[0]}
            icon={Clock}
            color="green"
            subtitle={`${formatCurrency(bestHoldTime.avgPnL)} avg P&L`}
          />
          <StatCard
            title="Best Instrument"
            value={bestInstrument.instrumentName}
            icon={TrendingUp}
            color="blue"
            subtitle={`${formatPercentage(bestInstrument.winRate)} win rate`}
          />
          <StatCard
            title="Best Entry Time"
            value={bestEntryHour.timeLabel}
            icon={Activity}
            color="yellow"
            subtitle={`${formatCurrency(bestEntryHour.entryAvgPnL)} avg P&L`}
          />
          <StatCard
            title="Best Exit Time"
            value={bestExitHour.timeLabel}
            icon={Target}
            color="gray"
            subtitle={`${formatCurrency(bestExitHour.exitAvgPnL)} avg P&L`}
          />
        </div>
      </div>

      {/* Hold Time Analysis */}
      {holdTimeAnalysis.length > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Hold Time Performance</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={holdTimeAnalysis}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='holdTimeRange' angle={-45} textAnchor='end' height={80} />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey='avgPnL' name='Average P&L'>
                    {holdTimeAnalysis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avgPnL >= 0 ? "#10B981" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Hold Time Win Rates</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={holdTimeAnalysis}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='holdTimeRange' angle={-45} textAnchor='end' height={80} />
                  <YAxis domain={[0, 100]} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type='monotone' dataKey='winRate' stroke='#3B82F6' strokeWidth={3} name='Win Rate (%)' />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Entry/Exit Timing Analysis */}
      {entryExitAnalysis.length > 0 && (
        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Entry vs Exit Timing Performance</h3>
          <div className='h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={entryExitAnalysis}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='timeLabel' />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey='entryAvgPnL' fill='#10B981' name='Entry Avg P&L' />
                <Bar dataKey='exitAvgPnL' fill='#3B82F6' name='Exit Avg P&L' />
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className='mt-4 p-4 bg-blue-50 rounded-lg'>
            <h5 className='font-medium text-blue-900 mb-2'>Timing Insights:</h5>
            <ul className='text-sm text-blue-700 space-y-1'>
              <li>• <strong>Entry Performance:</strong> Shows average P&L of positions opened at each hour</li>
              <li>• <strong>Exit Performance:</strong> Shows average P&L of positions closed at each hour</li>
              <li>• <strong>Best Entry:</strong> {bestEntryHour.timeLabel} with {formatCurrency(bestEntryHour.entryAvgPnL)} avg P&L</li>
              <li>• <strong>Best Exit:</strong> {bestExitHour.timeLabel} with {formatCurrency(bestExitHour.exitAvgPnL)} avg P&L</li>
            </ul>
          </div>
        </div>
      )}

      {/* Instrument Type Analysis */}
      {instrumentAnalysis.length > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Instrument Type Performance</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={instrumentAnalysis}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='instrumentName' />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey='avgPnL' name='Average P&L'>
                    {instrumentAnalysis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avgPnL >= 0 ? "#10B981" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Instrument Type Distribution</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <Pie
                    data={instrumentAnalysis}
                    cx='50%'
                    cy='50%'
                    labelLine={false}
                    label={({ instrumentName, totalTrades }) => `${instrumentName} (${totalTrades})`}
                    outerRadius={80}
                    fill='#8884d8'
                    dataKey='totalTrades'
                  >
                    {instrumentAnalysis.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Strategy Metrics */}
      <div className='card'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Detailed Strategy Metrics</h3>
        <div className='space-y-6'>
          {/* Hold Time Details */}
          {holdTimeAnalysis.length > 0 && (
            <div>
              <h4 className='font-medium text-gray-800 mb-3'>Hold Time Strategy Performance</h4>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {holdTimeAnalysis.map((ht, index) => (
                  <div key={index} className='bg-gray-50 rounded-lg p-4'>
                    <h5 className='font-semibold text-gray-900 mb-2'>{ht.holdTimeRange}</h5>
                    <div className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Trades:</span>
                        <span className='font-bold'>{ht.tradeCount}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Avg P&L:</span>
                        <span className={`font-bold ${ht.avgPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(ht.avgPnL)}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Win Rate:</span>
                        <span className='font-bold text-blue-600'>{formatPercentage(ht.winRate)}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Avg Hold:</span>
                        <span className='font-bold text-purple-600'>{formatTime(ht.avgHoldTimeMinutes)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Instrument Type Details */}
          {instrumentAnalysis.length > 0 && (
            <div>
              <h4 className='font-medium text-gray-800 mb-3'>Instrument Type Performance</h4>
              <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
                {instrumentAnalysis.map((inst, index) => (
                  <div key={index} className='bg-gray-50 rounded-lg p-4'>
                    <h5 className='font-semibold text-gray-900 mb-2'>{inst.instrumentName}</h5>
                    <div className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Total Trades:</span>
                        <span className='font-bold'>{inst.totalTrades}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Total P&L:</span>
                        <span className={`font-bold ${inst.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(inst.totalPnL)}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Avg P&L:</span>
                        <span className={`font-bold ${inst.avgPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(inst.avgPnL)}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Win Rate:</span>
                        <span className='font-bold text-blue-600'>{formatPercentage(inst.winRate)}</span>
                      </div>
                      <div className='flex justify-between'>
                        <span className='text-gray-600'>Avg Hold:</span>
                        <span className='font-bold text-purple-600'>{formatTime(inst.avgHoldTimeMinutes)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
