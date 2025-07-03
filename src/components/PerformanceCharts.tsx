import { format } from "date-fns"
import { useMemo, useState } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Trade } from "../types/trade"
import { calculateDailyPnL, calculatePositions, calculateSymbolPerformance } from "../utils/calculations"
import { AIRecommendations } from './AIRecommendations'
import { CustomTooltip } from './CustomTooltip'
import { formatCompactCurrency } from "../utils/formatters"

interface PerformanceChartsProps {
  trades: Trade[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export function PerformanceCharts({ trades }: PerformanceChartsProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<'5min' | '10min' | '15min' | '30min' | 'hourly' | 'daily' | 'weekly' | 'monthly'>('hourly');

  const dailyPnL = useMemo(() => calculateDailyPnL(trades), [trades])
  const symbolPerformance = useMemo(() => calculateSymbolPerformance(trades), [trades])

  // Prepare cumulative P&L data
  const cumulativePnLData = useMemo(() => {
    let cumulative = 0
    return dailyPnL.map((day) => {
      cumulative += day.netPnL
      return {
        date: format(day.date, "dd MMM"),
        fullDate: day.date,
        dailyPnL: Math.round(day.netPnL * 100) / 100,
        cumulativePnL: Math.round(cumulative * 100) / 100,
        trades: day.totalTrades,
        tradeWinRate: Math.round((day.tradeWinRate || 0) * 100) / 100,
        orderWinRate: Math.round((day.orderWinRate || 0) * 100) / 100,
        totalOrders: day.totalOrders || 0,
      }
    })
  }, [dailyPnL])

  // Prepare instrument type distribution based on merged orders
  const instrumentDistribution = useMemo(() => {
    const distribution = trades.reduce((acc: Record<string, number>, trade) => {
      acc[trade.instrumentType] = (acc[trade.instrumentType] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return Object.entries(distribution).map(([type, count]) => ({
      name: type,
      value: count as number,
      percentage: (((count as number) / trades.length) * 100).toFixed(1),
    }))
  }, [trades])

  const positions = useMemo(() => calculatePositions(trades), [trades]);

  // Prepare position initiation distribution (buy to open vs sell to open)
  const positionInitiationDistribution = useMemo(() => {
    // Get all positions using the enhanced position calculation

    let buyToOpenCount = 0
    let sellToOpenCount = 0

    // Analyze each position to determine how it was initiated
    positions.forEach((position) => {
      if (position.trades.length === 0) return

      // Sort trades by execution time to find the opening trade
      const sortedTrades = [...position.trades].sort((a, b) =>
        a.orderExecutionTime.getTime() - b.orderExecutionTime.getTime()
      )

      // The first trade determines how the position was opened
      const openingTrade = sortedTrades[0]

      if (openingTrade.tradeType === "buy") {
        buyToOpenCount++
      } else if (openingTrade.tradeType === "sell") {
        sellToOpenCount++
      }
    })

    const totalPositions = buyToOpenCount + sellToOpenCount

    return [
      {
        name: "Buy to Open",
        value: buyToOpenCount,
        percentage: totalPositions > 0 ? ((buyToOpenCount / totalPositions) * 100).toFixed(1) : "0",
      },
      {
        name: "Sell to Open",
        value: sellToOpenCount,
        percentage: totalPositions > 0 ? ((sellToOpenCount / totalPositions) * 100).toFixed(1) : "0",
      },
    ]
  }, [positions])

  // Helper function to get time bucket based on selected timeframe
  const getTimeBucket = (date: Date, timeframe: typeof selectedTimeframe): string => {
    switch (timeframe) {
      case '5min':
        const minutes5 = Math.floor(date.getMinutes() / 5) * 5;
        return `${date.getHours().toString().padStart(2, '0')}:${minutes5.toString().padStart(2, '0')}`;
      case '10min':
        const minutes10 = Math.floor(date.getMinutes() / 10) * 10;
        return `${date.getHours().toString().padStart(2, '0')}:${minutes10.toString().padStart(2, '0')}`;
      case '15min':
        const minutes15 = Math.floor(date.getMinutes() / 15) * 15;
        return `${date.getHours().toString().padStart(2, '0')}:${minutes15.toString().padStart(2, '0')}`;
      case '30min':
        const minutes30 = Math.floor(date.getMinutes() / 30) * 30;
        return `${date.getHours().toString().padStart(2, '0')}:${minutes30.toString().padStart(2, '0')}`;
      case 'hourly':
        return `${date.getHours().toString().padStart(2, '0')}:00`;
      case 'daily':
        return format(date, 'yyyy-MM-dd');
      case 'weekly':
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        return `Week of ${format(startOfWeek, 'MMM dd')}`;
      case 'monthly':
        return format(date, 'MMM yyyy');
      default:
        return `${date.getHours().toString().padStart(2, '0')}:00`;
    }
  };

  // Prepare trading pattern based on selected timeframe with win/loss breakdown
  const tradingPattern = useMemo(() => {
    const patternData = new Map<string, {
      time: string;
      totalOrders: number;
      winningOrders: number;
      losingOrders: number;
      volume: number;
      winVolume: number;
      lossVolume: number;
    }>();

    positions.forEach((position) => {
      if (position.trades.length === 0) return;

      const timeBucket = getTimeBucket(position.openTime, selectedTimeframe);
      const positionValue = Math.abs(position.totalBuyValue + position.totalSellValue);
      const isWinning = position.realizedPnL > 0;

      if (!patternData.has(timeBucket)) {
        patternData.set(timeBucket, {
          time: timeBucket,
          totalOrders: 0,
          winningOrders: 0,
          losingOrders: 0,
          volume: 0,
          winVolume: 0,
          lossVolume: 0,
        });
      }

      const data = patternData.get(timeBucket)!;
      data.totalOrders += 1;
      data.volume += positionValue;

      if (isWinning) {
        data.winningOrders += 1;
        data.winVolume += positionValue;
      } else if (position.realizedPnL < 0) {
        data.losingOrders += 1;
        data.lossVolume += positionValue;
      }
    });

    // Convert to array and sort by time
    const sortedData = Array.from(patternData.values()).sort((a, b) => {
      // For time-based sorting, we need to handle different formats
      if (selectedTimeframe === 'daily') {
        return new Date(a.time).getTime() - new Date(b.time).getTime();
      } else if (selectedTimeframe === 'weekly' || selectedTimeframe === 'monthly') {
        return a.time.localeCompare(b.time);
      } else {
        // For minute/hourly, sort by time string
        return a.time.localeCompare(b.time);
      }
    });

    // Round volume values
    sortedData.forEach((data) => {
      data.volume = Math.round(data.volume * 100) / 100;
      data.winVolume = Math.round(data.winVolume * 100) / 100;
      data.lossVolume = Math.round(data.lossVolume * 100) / 100;
    });

    return sortedData;
  }, [positions, selectedTimeframe]);

  // Get timeframe options for dropdown
  const timeframeOptions = [
    { value: '5min', label: '5 Minutes' },
    { value: '10min', label: '10 Minutes' },
    { value: '15min', label: '15 Minutes' },
    { value: '30min', label: '30 Minutes' },
    { value: 'hourly', label: 'Hourly' },
    { value: 'daily', label: 'Daily' },
    { value: 'weekly', label: 'Weekly' },
    { value: 'monthly', label: 'Monthly' },
  ] as const;

  // Top performing symbols with rounded values
  const topSymbols = symbolPerformance.slice(0, 10).map((symbol) => ({
    ...symbol,
    totalPnL: Math.round(symbol.totalPnL * 100) / 100,
    avgPnL: Math.round(symbol.avgPnL * 100) / 100,
    maxWin: Math.round(symbol.maxWin * 100) / 100,
    maxLoss: Math.round(symbol.maxLoss * 100) / 100,
    winRate: Math.round(symbol.winRate * 100) / 100,
  }))

  const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"]

  // Calculate overall win rate statistics
  const overallStats = useMemo(() => {
    const totalOrderWins = dailyPnL.reduce((sum, day) => sum + (day.winningOrders || 0), 0)
    const totalOrderLosses = dailyPnL.reduce((sum, day) => sum + (day.losingOrders || 0), 0)
    const totalTradeWins = dailyPnL.reduce((sum, day) => sum + day.winningTrades, 0)
    const totalTradeLosses = dailyPnL.reduce((sum, day) => sum + day.losingTrades, 0)
    const totalOrders = dailyPnL.reduce((sum, day) => sum + (day.totalOrders || 0), 0)
    const totalTrades = dailyPnL.reduce((sum, day) => sum + day.totalTrades, 0)

    return {
      orderWinRate: totalOrderWins + totalOrderLosses > 0 ? (totalOrderWins / (totalOrderWins + totalOrderLosses)) * 100 : 0,
      tradeWinRate: totalTradeWins + totalTradeLosses > 0 ? (totalTradeWins / (totalTradeWins + totalTradeLosses)) * 100 : 0,
      totalOrders,
      totalTrades,
      totalOrderWins,
      totalOrderLosses,
      totalTradeWins,
      totalTradeLosses,
    }
  }, [dailyPnL])

  return (
    <div className='space-y-6'>
      
      {/* Cumulative P&L Chart */}
      <div className='card'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Cumulative P&L Over Time</h3>
        <div className='h-80'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={cumulativePnLData} margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='date' />
              <YAxis tickFormatter={(value) => formatCompactCurrency(value)} width={50} />
              <Tooltip content={<CustomTooltip formatters={{ currency: 'precise', labelStyle: 'medium', borderStyle: 'light' }} />} />
              <Area type='monotone' dataKey='cumulativePnL' stroke='#3B82F6' fill='#3B82F6' fillOpacity={0.1} name='Cumulative P&L' />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily P&L and Win Rates */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Daily P&L</h3>
          <div className='h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={cumulativePnLData} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='date' />
                <YAxis tickFormatter={(value) => formatCompactCurrency(value)} width={50} />
                <Tooltip content={<CustomTooltip formatters={{ currency: 'precise', labelStyle: 'medium', borderStyle: 'light' }} />} />
                <Bar dataKey='dailyPnL' name='Daily P&L'>
                  {cumulativePnLData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.dailyPnL >= 0 ? "#10B981" : "#EF4444"} />
                  ))}
                </Bar>
                <Legend />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Daily Win Rates Comparison</h3>
          <div className='h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <LineChart data={cumulativePnLData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='date' />
                <YAxis domain={[0, 100]} />
                <Tooltip content={<CustomTooltip formatters={{ currency: 'precise', labelStyle: 'medium', borderStyle: 'light' }} />} />
                <Line type='monotone' dataKey='orderWinRate' stroke='#3B82F6' strokeWidth={2} name='Order Win Rate (%)' />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Distribution Charts */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Instrument Type Distribution (by Orders)</h3>
          <div className='h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie data={instrumentDistribution} cx='50%' cy='50%' labelLine={false} label={({ name, percentage }) => `${name} (${percentage}%)`} outerRadius={80} fill='#8884d8' dataKey='value'>
                  {instrumentDistribution.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Daily Position Opening Strategy</h3>
          <p className='text-sm text-gray-600 mb-4'>Shows how you prefer to open positions each day: buying first vs selling first (by instrument per day)</p>
          <div className='h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <PieChart>
                <Pie data={positionInitiationDistribution} cx='50%' cy='50%' labelLine={false} label={({ name, percentage }) => `${name} (${percentage}%)`} outerRadius={80} fill='#8884d8' dataKey='value'>
                  <Cell fill='#10B981' />
                  <Cell fill='#EF4444' />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Trading Pattern */}
      <div className='card'>
        <div className="flex items-center justify-between mb-4">
          <h3 className='text-lg font-semibold text-gray-900'>Trading Pattern (Win/Loss Breakdown)</h3>
          <div className="flex items-center space-x-2">
            <label htmlFor="timeframe-select" className="text-sm font-medium text-gray-700">
              Timeframe:
            </label>
            <select
              id="timeframe-select"
              value={selectedTimeframe}
              onChange={(e) => setSelectedTimeframe(e.target.value as typeof selectedTimeframe)}
              className="px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {timeframeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className='h-64'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={tradingPattern} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis
                dataKey='time'
                angle={selectedTimeframe.includes('min') ? -45 : 0}
                textAnchor={selectedTimeframe.includes('min') ? 'end' : 'middle'}
                height={selectedTimeframe.includes('min') ? 60 : 30}
              />
              <YAxis />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
                        <p className="font-medium text-gray-900">{`${selectedTimeframe === 'daily' ? 'Date' : selectedTimeframe === 'weekly' ? 'Week' : selectedTimeframe === 'monthly' ? 'Month' : 'Time'}: ${label}`}</p>
                        <p className="text-green-600">{`Winning Positions: ${data.winningOrders}`}</p>
                        <p className="text-red-600">{`Losing Positions: ${data.losingOrders}`}</p>
                        <p className="text-gray-600">{`Total Positions: ${data.totalOrders}`}</p>
                        <p className="text-gray-600">{`Win Rate: ${data.totalOrders > 0 ? ((data.winningOrders / data.totalOrders) * 100).toFixed(1) : 0}%`}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar dataKey='winningOrders' stackId="a" fill='#10B981' name='Winning Positions' />
              <Bar dataKey='losingOrders' stackId="a" fill='#EF4444' name='Losing Positions' />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex items-center justify-center space-x-6 text-sm">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-green-500 rounded mr-2"></div>
            <span className="text-gray-600">Winning Positions</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded mr-2"></div>
            <span className="text-gray-600">Losing Positions</span>
          </div>
        </div>
      </div>

      {/* Top Performing Symbols */}
      <div className='card'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Top Performing Symbols</h3>
        <div className='h-80'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={topSymbols} layout='horizontal' margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='symbol' type='category' width={70} />
              <YAxis type='number' tickFormatter={(value) => formatCompactCurrency(value)} width={60} />
              <Tooltip content={<CustomTooltip formatters={{ currency: 'precise', labelStyle: 'medium', borderStyle: 'light' }} />} />
              <Bar dataKey='totalPnL' name='Total P&L'>
                {topSymbols.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.totalPnL >= 0 ? "#10B981" : "#EF4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* AI Recommendations */}
      <AIRecommendations
        trades={trades}
        analysisData={{
          dailyPnL,
          symbolPerformance,
          instrumentDistribution,
          positionInitiationDistribution,
          tradingPattern
        }}
        pageContext="performance"
        pageTitle="Performance Analysis"
        dataDescription="profit/loss patterns and trading efficiency data"
      />
    </div>
  )
}
