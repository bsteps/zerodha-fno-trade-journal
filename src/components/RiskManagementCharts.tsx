import { AlertTriangle, DollarSign, Info, Target, TrendingDown } from "lucide-react"
import { useMemo } from "react"
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { Trade } from "../types/trade"
import { calculateDrawdownAnalysis, calculatePositionSizeAnalysis, calculateRiskRewardAnalysis } from "../utils/calculations"
import { AIRecommendations } from './AIRecommendations'
import { InfoTooltip } from "./InfoTooltip"
import { StatCard } from './StatCard'
import { CustomTooltip } from './CustomTooltip'
import { formatCompactCurrency, formatNumber, formatPercentage } from "../utils/formatters"

interface RiskManagementChartsProps {
  trades: Trade[]
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

export function RiskManagementCharts({ trades }: RiskManagementChartsProps) {
  const drawdownAnalysis = useMemo(() => calculateDrawdownAnalysis(trades), [trades])
  const riskRewardAnalysis = useMemo(() => calculateRiskRewardAnalysis(trades), [trades])
  const positionSizeAnalysis = useMemo(() => calculatePositionSizeAnalysis(trades), [trades])

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
          <InfoTooltip content="Comprehensive analysis of your risk management performance including drawdowns, recovery patterns, risk-reward ratios, and position sizing effectiveness. These metrics help you understand and improve your risk control." id="risk-management-overview">
            <Info className="w-5 h-5 text-gray-400 ml-2 hover:text-gray-600" />
          </InfoTooltip>
        </h2>
        
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
          <StatCard
            title="Max Drawdown"
            value={formatCompactCurrency(drawdownAnalysis.maxDrawdown)}
            icon={TrendingDown}
            color="red"
            subtitle={`${formatPercentage(drawdownAnalysis.maxDrawdownPercentage)}`}
            tooltip="The largest peak-to-trough decline in your account value. This represents your worst-case loss scenario and indicates the maximum risk you've experienced. Keep this under 20% for good risk management."
          />
          <StatCard
            title="Current Drawdown"
            value={formatCompactCurrency(drawdownAnalysis.currentDrawdown)}
            icon={TrendingDown}
            color={drawdownAnalysis.currentDrawdown > 0 ? "red" : "green"}
            subtitle={`${formatPercentage(drawdownAnalysis.currentDrawdownPercentage)}`}
            tooltip="Your current decline from the most recent account peak. If positive, you're currently in a losing streak. Monitor this closely and consider reducing position sizes if it exceeds 10%."
          />
          <StatCard
            title="Avg Recovery Days"
            value={formatNumber(drawdownAnalysis.avgRecoveryDays)}
            icon={Target}
            color="blue"
            subtitle={`${drawdownAnalysis.drawdownPeriods.filter(d => d.isRecovered).length} recovered`}
            tooltip="Average number of trading days needed to recover from drawdowns back to previous highs. Shorter recovery times indicate better resilience and risk management. Aim for under 30 days."
          />
          <StatCard
            title="Avg Risk:Reward"
            value={formatNumber(riskRewardAnalysis.avgRatio)}
            icon={DollarSign}
            color={riskRewardAnalysis.avgRatio >= 2 ? "green" : riskRewardAnalysis.avgRatio >= 1 ? "yellow" : "red"}
            subtitle={`Median: ${formatNumber(riskRewardAnalysis.medianRatio)}`}
            tooltip="Average ratio of profit to loss across all trades. Values above 2.0 are excellent, 1.0-2.0 are good, below 1.0 indicate poor risk management. Compare with your required threshold for profitability."
          />
        </div>
      </div>

      {/* Drawdown Periods Analysis */}
      {drawdownChartData.length > 0 && (
        <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
              Drawdown Amounts
              <InfoTooltip content="Shows the absolute dollar amount lost during each drawdown period. Darker red bars indicate drawdowns that haven't been recovered yet. Helps identify your worst losing streaks and their severity." id="drawdown-amounts">
                <Info className="w-4 h-4 text-gray-400 ml-2 hover:text-gray-600" />
              </InfoTooltip>
            </h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%' >
                <BarChart data={drawdownChartData} margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='period' />
                  <YAxis tickFormatter={(value) => formatCompactCurrency(value)} />
                  <Tooltip content={<CustomTooltip formatters={{ currency: 'compact' }} />} />
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
            <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
              Drawdown Duration vs Recovery
              <InfoTooltip content="Compares how long you stayed in drawdown (red bars) versus how long it took to recover (green bars). Shorter recovery times indicate better resilience and risk management. Only shows recovered drawdowns." id="drawdown-recovery">
                <Info className="w-4 h-4 text-gray-400 ml-2 hover:text-gray-600" />
              </InfoTooltip>
            </h3>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={drawdownChartData.filter(d => d.isRecovered)}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='period' />
                  <YAxis />
                  <Tooltip content={<CustomTooltip formatters={{ currency: 'compact' }} />} />
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
            <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
              Risk:Reward Ratio Distribution
              <InfoTooltip content="Shows how your trades are distributed across different risk-reward ratios. Aim for more trades in the >2.0 range (green/blue sections). Ratios >3.0 are exceptional, while <1.0 indicate poor risk management." id="risk-reward-distribution">
                <Info className="w-4 h-4 text-gray-400 ml-2 hover:text-gray-600" />
              </InfoTooltip>
            </h3>
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
                    {riskRewardAnalysis.ratioDistribution.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className='card'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
              Risk:Reward Analysis
              <InfoTooltip content="Key risk-reward metrics for your trading. Average ratio shows overall performance, median is less affected by outliers. The breakeven threshold shows the minimum ratio needed for profitability given your win rate." id="risk-reward-analysis">
                <Info className="w-4 h-4 text-gray-400 ml-2 hover:text-gray-600" />
              </InfoTooltip>
            </h3>
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
          <h3 className='text-lg font-semibold text-gray-900 mb-4 flex items-center'>
            Position Size Analysis
            <InfoTooltip content="Analyzes how your position sizes correlate with performance. The chart shows average P&L by position size range. The correlation value indicates if larger positions tend to be more (+) or less (-) profitable." id="position-size-analysis">
              <Info className="w-4 h-4 text-gray-400 ml-2 hover:text-gray-600" />
            </InfoTooltip>
          </h3>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
            <div className='h-64'>
              <ResponsiveContainer width='100%' height='100%'>
                <BarChart data={positionSizeAnalysis.sizeRanges} margin={{ left: 20, bottom: 30 }}>
                  <CartesianGrid strokeDasharray='3 3' />
                  <XAxis dataKey='range' angle={-45} textAnchor='end' height={80} />
                  <YAxis tickFormatter={(value) => formatCompactCurrency(value)} />
                  <Tooltip content={<CustomTooltip formatters={{ currency: 'compact' }} />} />
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

      {/* AI Recommendations */}
      <AIRecommendations
        trades={trades}
        analysisData={{
          drawdownAnalysis,
          riskRewardAnalysis,
          positionSizeAnalysis
        }}
        pageContext="risk-management"
        pageTitle="Risk Management Analysis"
        dataDescription="position sizing and risk control strategies data"
      />
    </div>
  )
}
