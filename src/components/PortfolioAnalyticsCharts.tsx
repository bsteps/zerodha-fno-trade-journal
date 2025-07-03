import React, { useMemo } from "react"
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, PieChart, Pie, ScatterChart, Scatter } from "recharts"
import { Trade } from "../types/trade"
import { calculateCorrelationMatrix, calculateSectorExposure, calculateCapitalUtilization, CorrelationMatrix, SectorExposure, CapitalUtilization } from "../utils/calculations"
import { PieChart as PieChartIcon, TrendingUp, DollarSign, Target } from "lucide-react"
import { InfoTooltip } from './InfoTooltip'
import { AIRecommendations } from './AIRecommendations'
import { formatCurrency, formatNumber, formatPercentage } from '../utils/formatters'
import { CustomTooltip } from './CustomTooltip'
import { StatCard } from './StatCard'

interface PortfolioAnalyticsChartsProps {
  trades: Trade[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658", "#FF7C7C", "#8DD1E1"]

export function PortfolioAnalyticsCharts({ trades }: PortfolioAnalyticsChartsProps) {
  const correlationMatrix = useMemo(() => calculateCorrelationMatrix(trades), [trades])
  const sectorExposure = useMemo(() => calculateSectorExposure(trades), [trades])
  const capitalUtilization = useMemo(() => calculateCapitalUtilization(trades), [trades])

  // Calculate portfolio summary stats
  const totalSectors = sectorExposure.length
  const dominantSector = sectorExposure.reduce((max, sector) => 
    sector.exposurePercentage > max.exposurePercentage ? sector : max, 
    sectorExposure[0] || { sector: 'N/A', exposurePercentage: 0, avgPnL: 0 }
  )
  
  const avgCapitalUtilization = capitalUtilization.length > 0 ? 
    capitalUtilization.reduce((sum, day) => sum + day.utilizationPercentage, 0) / capitalUtilization.length : 0

  const highestCorrelation = correlationMatrix.reduce((max, corr) => 
    Math.abs(corr.correlation) > Math.abs(max.correlation) ? corr : max, 
    correlationMatrix[0] || { symbol1: 'N/A', symbol2: 'N/A', correlation: 0 }
  )

  // Prepare correlation data for visualization (top 10 correlations)
  const topCorrelations = correlationMatrix.slice(0, 10).map(corr => ({
    pair: `${corr.symbol1}-${corr.symbol2}`,
    correlation: corr.correlation,
    commonDays: corr.commonTradingDays
  }))

  return (
    <div className='space-y-6'>
      {/* Portfolio Analytics Summary */}
      <div className='card'>
        <h2 className='text-2xl font-bold text-gray-900 mb-6 flex items-center'>
          <PieChartIcon className='w-6 h-6 text-blue-600 mr-2' />
          Portfolio Analytics
        </h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard
            title="Sectors Traded"
            value={totalSectors}
            icon={Target}
            color="blue"
            subtitle={`${dominantSector.sector} dominates`}
          />
          <StatCard
            title="Dominant Sector"
            value={dominantSector.sector}
            icon={TrendingUp}
            color={dominantSector.avgPnL >= 0 ? "green" : "red"}
            subtitle={`${formatPercentage(dominantSector.exposurePercentage)} exposure`}
          />
          <StatCard
            title="Avg Capital Usage"
            value={formatPercentage(avgCapitalUtilization)}
            icon={DollarSign}
            color={avgCapitalUtilization > 80 ? "red" : avgCapitalUtilization > 60 ? "yellow" : "green"}
            subtitle="Of available capital"
          />
          <StatCard
            title="Highest Correlation"
            value={formatNumber(Math.abs(highestCorrelation.correlation))}
            icon={TrendingUp}
            color={Math.abs(highestCorrelation.correlation) > 0.7 ? "red" : "blue"}
            subtitle={`${highestCorrelation.symbol1}-${highestCorrelation.symbol2}`}
          />
        </div>
      </div>

      {/* Sector Exposure Analysis */}
      {sectorExposure.length > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Sector Exposure Distribution</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <PieChart>
                  <Pie
                    data={sectorExposure}
                    cx='50%'
                    cy='50%'
                    labelLine={false}
                    label={({ sector, exposurePercentage }) => `${sector} (${formatNumber(exposurePercentage)}%)`}
                    outerRadius={80}
                    fill='#8884d8'
                    dataKey='exposurePercentage'
                  >
                    {sectorExposure.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Sector Performance</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={sectorExposure}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='sector' angle={-45} textAnchor='end' height={80} />
                  <YAxis tickFormatter={(value) => formatCurrency(value)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey='avgPnL' name='Average P&L'>
                    {sectorExposure.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.avgPnL >= 0 ? "#10B981" : "#EF4444"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Correlation Analysis */}
      {topCorrelations.length > 0 && (
        <div className='card'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Symbol Correlation Analysis</h3>
          <div className='h-64'>
            <ResponsiveContainer width='100%' height='100%'>
              <BarChart data={topCorrelations} layout='horizontal'>
                <CartesianGrid strokeDasharray='3 3' />
                <XAxis type='number' domain={[-1, 1]} />
                <YAxis dataKey='pair' type='category' width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey='correlation' name='Correlation'>
                  {topCorrelations.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={
                      entry.correlation > 0.5 ? "#EF4444" : 
                      entry.correlation < -0.5 ? "#3B82F6" : "#10B981"
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className='mt-4 p-4 bg-blue-50 rounded-lg'>
            <h5 className='font-medium text-blue-900 mb-2'>Correlation Insights:</h5>
            <ul className='text-sm text-blue-700 space-y-1'>
              <li>• <strong>High Positive (&gt;0.5):</strong> Symbols move together - consider diversification</li>
              <li>• <strong>High Negative (&lt;-0.5):</strong> Symbols move opposite - natural hedge</li>
              <li>• <strong>Low Correlation (-0.5 to 0.5):</strong> Good diversification</li>
            </ul>
          </div>
        </div>
      )}

      {/* Capital Utilization Analysis */}
      {capitalUtilization.length > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Capital Utilization Over Time</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <LineChart data={capitalUtilization.slice(-30)}> {/* Last 30 days */}
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='date' />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type='monotone' dataKey='utilizationPercentage' stroke='#3B82F6' strokeWidth={2} name='Utilization %' />
                  <Line type='monotone' dataKey='numberOfPositions' stroke='#10B981' strokeWidth={2} name='Number of Positions' />
                  <Legend />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Capital Efficiency</h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <ScatterChart data={capitalUtilization}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='utilizationPercentage' name='Utilization %' />
                  <YAxis dataKey='efficiency' name='Efficiency' />
                  <Tooltip content={<CustomTooltip />} />
                  <Scatter name='Capital Efficiency' fill='#8884d8' />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Sector Analysis */}
      <div className='card'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Detailed Sector Analysis</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {sectorExposure.map((sector, index) => (
            <div key={index} className='bg-gray-50 rounded-lg p-4'>
              <h4 className='font-semibold text-gray-900 mb-2 flex items-center'>
                <div 
                  className='w-4 h-4 rounded mr-2' 
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                ></div>
                {sector.sector}
              </h4>
              <div className='space-y-2 text-sm'>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Symbols:</span>
                  <span className='font-bold'>{sector.symbols.length}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Total Trades:</span>
                  <span className='font-bold'>{sector.totalTrades}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Total P&L:</span>
                  <span className={`font-bold ${sector.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(sector.totalPnL)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Avg P&L:</span>
                  <span className={`font-bold ${sector.avgPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(sector.avgPnL)}
                  </span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Win Rate:</span>
                  <span className='font-bold text-blue-600'>{formatPercentage(sector.winRate)}</span>
                </div>
                <div className='flex justify-between'>
                  <span className='text-gray-600'>Exposure:</span>
                  <span className='font-bold text-purple-600'>{formatPercentage(sector.exposurePercentage)}</span>
                </div>
                <div className='mt-2 text-xs text-gray-500'>
                  Symbols: {sector.symbols.slice(0, 3).join(', ')}{sector.symbols.length > 3 ? '...' : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Portfolio Insights */}
      <div className='card'>
        <h3 className='text-lg font-semibold text-gray-900 mb-4'>Portfolio Insights & Recommendations</h3>
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          <div className='bg-blue-50 rounded-lg p-4'>
            <h4 className='font-semibold text-blue-900 mb-2'>💡 Diversification</h4>
            <ul className='text-sm text-blue-700 space-y-1'>
              <li>• Trading across {totalSectors} sectors</li>
              <li>• {dominantSector.sector} sector dominates with {formatPercentage(dominantSector.exposurePercentage)}</li>
              {dominantSector.exposurePercentage > 50 && (
                <li>• Consider reducing {dominantSector.sector} exposure</li>
              )}
              {totalSectors < 3 && (
                <li>• Consider diversifying into more sectors</li>
              )}
            </ul>
          </div>
          
          <div className='bg-green-50 rounded-lg p-4'>
            <h4 className='font-semibold text-green-900 mb-2'>📊 Capital Management</h4>
            <ul className='text-sm text-green-700 space-y-1'>
              <li>• Average utilization: {formatPercentage(avgCapitalUtilization)}</li>
              {avgCapitalUtilization > 80 && (
                <li>• High capital usage - consider risk management</li>
              )}
              {avgCapitalUtilization < 30 && (
                <li>• Low capital usage - potential for growth</li>
              )}
              <li>• Monitor position sizing consistency</li>
            </ul>
          </div>
          
          <div className='bg-yellow-50 rounded-lg p-4'>
            <h4 className='font-semibold text-yellow-900 mb-2'>🔗 Correlation Risks</h4>
            <ul className='text-sm text-yellow-700 space-y-1'>
              {Math.abs(highestCorrelation.correlation) > 0.7 && (
                <li>• High correlation detected: {highestCorrelation.symbol1}-{highestCorrelation.symbol2}</li>
              )}
              <li>• Monitor sector concentration risk</li>
              <li>• Consider uncorrelated assets</li>
              {correlationMatrix.filter(c => Math.abs(c.correlation) > 0.5).length > 3 && (
                <li>• Multiple high correlations found</li>
              )}
            </ul>
          </div>
        </div>
      </div>

      {/* AI Recommendations */}
      <AIRecommendations
        trades={trades}
        analysisData={{
          correlationMatrix,
          sectorExposure,
          capitalUtilization
        }}
        pageContext="portfolio-analytics"
        pageTitle="Portfolio Analytics"
        dataDescription="portfolio diversification and allocation data"
      />
    </div>
  )
}
