import { format } from "date-fns"
import { useMemo } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Trade } from "../types/trade"
import { calculateDailyPnL, calculateSymbolPerformance } from "../utils/calculations"

interface PerformanceChartsProps {
  trades: Trade[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export function PerformanceCharts({ trades }: PerformanceChartsProps) {
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

  // Prepare position initiation distribution (buy to open vs sell to open)
  const positionInitiationDistribution = useMemo(() => {
    // Group orders by symbol + expiry to track position building
    const positionOrdersMap = new Map<string, Trade[]>()

    trades.forEach((trade) => {
      // Include trade date to differentiate between different trading sessions
      const positionKey = `${trade.symbol}_${format(trade.expiryDate, "yyyy-MM-dd")}_${format(trade.orderExecutionTime, "yyyy-MM-dd")}`

      if (!positionOrdersMap.has(positionKey)) {
        positionOrdersMap.set(positionKey, [])
      }

      positionOrdersMap.get(positionKey)!.push(trade)
    })

    let buyToOpenCount = 0
    let sellToOpenCount = 0

    // For each position, find the first order (opening order)
    positionOrdersMap.forEach((orders) => {
      // Sort orders by execution time to find the opening order
      const sortedOrders = orders.sort((a, b) => a.orderExecutionTime.getTime() - b.orderExecutionTime.getTime())

      let quantity = 0;
      sortedOrders.forEach((order) => {
        if (order.tradeType === "buy" && quantity == 0) {
          buyToOpenCount++
        } 
        
        if(order.tradeType === "sell" && quantity == 0) {
          sellToOpenCount++
        }

        quantity = order.tradeType === "buy" ? quantity + order.quantity : quantity - order.quantity
      })
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
  }, [trades])

  // Prepare hourly trading pattern based on orders (not individual trades)
  const hourlyPattern = useMemo(() => {
    const hourlyData = Array.from({ length: 24 }, (_, hour) => ({
      time: `${hour.toString().padStart(2, "0")}:00`,
      orders: 0,
      volume: 0,
    }))

    trades.forEach((trade) => {
      const hour = trade.orderExecutionTime.getHours()
      hourlyData[hour].orders += 1
      hourlyData[hour].volume += trade.value
    })

    // Round volume values
    hourlyData.forEach((data) => {
      data.volume = Math.round(data.volume * 100) / 100
    })

    const filteredData = hourlyData.filter((data) => data.orders > 0)

    return filteredData
  }, [trades])

  // Top performing symbols with rounded values
  const topSymbols = symbolPerformance.slice(0, 10).map((symbol) => ({
    ...symbol,
    totalPnL: Math.round(symbol.totalPnL * 100) / 100,
    avgPnL: Math.round(symbol.avgPnL * 100) / 100,
    maxWin: Math.round(symbol.maxWin * 100) / 100,
    maxLoss: Math.round(symbol.maxLoss * 100) / 100,
    winRate: Math.round(symbol.winRate * 100) / 100,
  }))

  console.log(topSymbols);
  

  const COLORS = ["#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"]

  const formatCurrency = (value: number) => {
    // For very small values, show 2 decimal places
    if (Math.abs(value) < 100) {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(value)
    }
    // For larger values, show no decimal places
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(value)
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className='bg-white p-3 border border-gray-200 rounded-lg shadow-lg'>
          <p className='font-medium'>{label}</p>
          {payload.map((entry: any, index: number) => {
            let formattedValue = entry.value

            if (typeof entry.value === "number") {
              if (entry.name.includes("PnL") || entry.name.includes("P&L")) {
                formattedValue = formatCurrency(entry.value)
              } else if (entry.name.includes("Rate") || entry.name.includes("%")) {
                formattedValue = `${formatNumber(entry.value)}%`
              } else if (entry.name.includes("volume") || entry.name.includes("Volume")) {
                formattedValue = formatCurrency(entry.value)
              } else {
                formattedValue = formatNumber(entry.value)
              }
            }

            return (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: {formattedValue}
              </p>
            )
          })}
        </div>
      )
    }
    return null
  }

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
      {/* Win Rate Comparison Summary */}
      <div className='card'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Win Rate Analysis</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <div className='bg-blue-50 rounded-lg p-4'>
            <h4 className='font-semibold text-blue-900 mb-2'>Order-Based Win Rate</h4>
            <div className='text-2xl font-bold text-blue-600 mb-1'>{formatNumber(overallStats.orderWinRate)}%</div>
            <div className='text-sm text-blue-700'>
              {overallStats.totalOrderWins} wins out of {overallStats.totalOrderWins + overallStats.totalOrderLosses} completed orders
            </div>
            <div className='text-xs text-blue-600 mt-1'>Based on merged trades by Order ID</div>
          </div>

          <div className='bg-purple-50 rounded-lg p-4'>
            <h4 className='font-semibold text-purple-900 mb-2'>Trade-Based Win Rate</h4>
            <div className='text-2xl font-bold text-purple-600 mb-1'>{formatNumber(overallStats.tradeWinRate)}%</div>
            <div className='text-sm text-purple-700'>
              {overallStats.totalTradeWins} wins out of {overallStats.totalTradeWins + overallStats.totalTradeLosses} individual executions
            </div>
            <div className='text-xs text-purple-600 mt-1'>Based on individual trade executions</div>
          </div>
        </div>

        <div className='mt-4 p-4 bg-gray-50 rounded-lg'>
          <h5 className='font-medium text-gray-900 mb-2'>Understanding the Difference:</h5>
          <ul className='text-sm text-gray-700 space-y-1'>
            <li>
              • <strong>Order-based:</strong> Counts each complete order (buy + sell) as one unit
            </li>
            <li>
              • <strong>Trade-based:</strong> Counts each individual execution separately
            </li>
            <li>• Order-based is more accurate for strategy analysis as it reflects actual trading decisions</li>
            <li>• Trade-based shows execution-level performance</li>
          </ul>
        </div>
      </div>
      {/* Cumulative P&L Chart */}
      <div className='card'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Cumulative P&L Over Time</h3>
        <div className='h-80'>
          <ResponsiveContainer width='100%' height='100%'>
            <AreaChart data={cumulativePnLData}>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='date' />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip content={<CustomTooltip />} />
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
              <BarChart data={cumulativePnLData}>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis dataKey='date' />
                <YAxis tickFormatter={(value) => formatCurrency(value)} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey='dailyPnL' name='Daily P&L'>
                  {cumulativePnLData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.dailyPnL >= 0 ? "#10B981" : "#EF4444"} />
                  ))}
                </Bar>
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
                <Tooltip content={<CustomTooltip />} />
                <Line type='monotone' dataKey='orderWinRate' stroke='#3B82F6' strokeWidth={2} name='Order Win Rate (%)' />
                <Line type='monotone' dataKey='tradeWinRate' stroke='#8B5CF6' strokeWidth={2} name='Trade Win Rate (%)' />
                <Legend />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className='mt-2 text-sm text-gray-600'>
            <div className='flex items-center space-x-4'>
              <div className='flex items-center'>
                <div className='w-3 h-3 bg-blue-500 rounded mr-2'></div>
                <span>Order-based (by Order ID)</span>
              </div>
              <div className='flex items-center'>
                <div className='w-3 h-3 bg-purple-500 rounded mr-2'></div>
                <span>Trade-based (individual executions)</span>
              </div>
            </div>
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
                  {instrumentDistribution.map((entry, index) => (
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
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Hourly Trading Pattern (by Orders)</h3>
        <div className='h-64'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={hourlyPattern} layout='horizontal'>
              <CartesianGrid strokeDasharray='3 3' />
              <YAxis type='number' dataKey='orders' />
              <XAxis type='category' dataKey={"time"} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey='orders' fill='#3B82F6' name='Number of Orders' />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top Performing Symbols */}
      <div className='card'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Top Performing Symbols</h3>
        <div className='h-80'>
          <ResponsiveContainer width='100%' height='100%'>
            <BarChart data={topSymbols} layout='horizontal'>
              <CartesianGrid strokeDasharray='3 3' />
              <XAxis dataKey='symbol' type='category' width={80} />
              <YAxis type='number' tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey='totalPnL' name='Total P&L'>
                {topSymbols.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.totalPnL >= 0 ? "#10B981" : "#EF4444"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
