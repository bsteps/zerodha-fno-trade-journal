import { useMemo } from 'react';
import { format, startOfWeek, startOfMonth } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Target, Award, Info } from 'lucide-react';
import { Trade, TradeStatistics } from '../types/trade';
import { calculateDailyPnL, calculateTradeStatistics } from '../utils/calculations';
import { InfoTooltip } from './InfoTooltip';
import { AIRecommendations } from './AIRecommendations';
import { formatCurrency, formatPercentage } from '../utils/formatters';
import { StatCard } from './StatCard';

interface PnLDashboardProps {
  trades: Trade[];
}

export function PnLDashboard({ trades }: PnLDashboardProps) {
  const dailyPnL = useMemo(() => calculateDailyPnL(trades), [trades]);
  const statistics = useMemo(() => calculateTradeStatistics(trades), [trades]);

  // Calculate weekly and monthly aggregations
  const weeklyPnL = useMemo(() => {
    const weekMap = new Map<string, { week: Date; pnl: number; trades: number }>();
    
    dailyPnL.forEach(day => {
      const weekStart = startOfWeek(day.date, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      
      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { week: weekStart, pnl: 0, trades: 0 });
      }
      
      const week = weekMap.get(weekKey)!;
      week.pnl += day.netPnL;
      week.trades += day.totalTrades;
    });
    
    return Array.from(weekMap.values()).sort((a, b) => a.week.getTime() - b.week.getTime());
  }, [dailyPnL]);

  const monthlyPnL = useMemo(() => {
    const monthMap = new Map<string, { month: Date; pnl: number; trades: number }>();
    
    dailyPnL.forEach(day => {
      const monthStart = startOfMonth(day.date);
      const monthKey = format(monthStart, 'yyyy-MM');
      
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, { month: monthStart, pnl: 0, trades: 0 });
      }
      
      const month = monthMap.get(monthKey)!;
      month.pnl += day.netPnL;
      month.trades += day.totalTrades;
    });
    
    return Array.from(monthMap.values()).sort((a, b) => a.month.getTime() - b.month.getTime());
  }, [dailyPnL]);

  const bestDay = dailyPnL.reduce((best, day) => 
    day.netPnL > best.netPnL ? day : best, 
    dailyPnL[0] || { netPnL: 0, date: new Date() }
  );

  const worstDay = dailyPnL.reduce((worst, day) =>
    day.netPnL < worst.netPnL ? day : worst,
    dailyPnL[0] || { netPnL: 0, date: new Date() }
  );

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Net P&L"
          value={formatCurrency(statistics.netPnL)}
          icon={DollarSign}
          color={statistics.netPnL >= 0 ? 'green' : 'red'}
          tooltip="Your total profit or loss after deducting all costs including brokerage, taxes, and charges. This is your actual money made or lost from trading."
          variant="compact"
        />
        <StatCard
          title="Win Rate"
          value={formatPercentage(statistics.winRate)}
          icon={Target}
          color={statistics.winRate >= 60 ? 'green' : statistics.winRate >= 40 ? 'yellow' : 'red'}
          tooltip="Percentage of profitable trades out of total trades. A higher win rate is good, but it should be balanced with average win/loss amounts. Even 40-50% win rate can be profitable with proper risk management."
          variant="compact"
        />
        <StatCard
          title="Profit Factor"
          value={statistics.profitFactor.toFixed(2)}
          icon={Award}
          color={statistics.profitFactor >= 2 ? 'green' : statistics.profitFactor >= 1 ? 'yellow' : 'red'}
          tooltip="Ratio of total profits to total losses. Values above 1.0 indicate profitability. 1.5-2.0 is good, 2.0+ is excellent. This metric combines both win rate and average win/loss size."
          variant="compact"
        />
        <StatCard
          title="Total Trades"
          value={statistics.totalTrades}
          icon={TrendingUp}
          color="blue"
          tooltip="Total number of completed positions (not individual buy/sell executions). Each position represents one complete trade cycle from entry to exit."
          variant="compact"
        />
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trading Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-gray-600">Winning Trades</span>
                <InfoTooltip content="Number of profitable positions. This counts completed positions, not individual buy/sell executions." id="winning-trades">
                  <Info className="w-4 h-4 text-gray-400 ml-1 hover:text-gray-600" />
                </InfoTooltip>
              </div>
              <span className="font-medium text-green-600">{statistics.winningTrades}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-gray-600">Losing Trades</span>
                <InfoTooltip content="Number of loss-making positions. Focus on keeping this number manageable through proper risk management." id="losing-trades">
                  <Info className="w-4 h-4 text-gray-400 ml-1 hover:text-gray-600" />
                </InfoTooltip>
              </div>
              <span className="font-medium text-red-600">{statistics.losingTrades}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-gray-600">Average Win</span>
                <InfoTooltip content="Average profit per winning trade. Higher values indicate better profit capture. Compare this with your average loss to assess risk-reward ratio." id="avg-win">
                  <Info className="w-4 h-4 text-gray-400 ml-1 hover:text-gray-600" />
                </InfoTooltip>
              </div>
              <span className="font-medium text-green-600">{formatCurrency(statistics.avgWin)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-gray-600">Average Loss</span>
                <InfoTooltip content="Average loss per losing trade. Keep this controlled through stop losses. Ideally, your average win should be larger than your average loss." id="avg-loss">
                  <Info className="w-4 h-4 text-gray-400 ml-1 hover:text-gray-600" />
                </InfoTooltip>
              </div>
              <span className="font-medium text-red-600">{formatCurrency(statistics.avgLoss)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-gray-600">Largest Win</span>
                <InfoTooltip content="Your biggest single trade profit. While good, don't rely on occasional big wins. Consistent smaller wins are more sustainable." id="max-win">
                  <Info className="w-4 h-4 text-gray-400 ml-1 hover:text-gray-600" />
                </InfoTooltip>
              </div>
              <span className="font-medium text-green-600">{formatCurrency(statistics.maxWin)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-gray-600">Largest Loss</span>
                <InfoTooltip content="Your biggest single trade loss. This should be controlled through proper position sizing and stop losses. Large losses can wipe out many small wins." id="max-loss">
                  <Info className="w-4 h-4 text-gray-400 ml-1 hover:text-gray-600" />
                </InfoTooltip>
              </div>
              <span className="font-medium text-red-600">{formatCurrency(statistics.maxLoss)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-gray-600">Gross Turnover</span>
                <InfoTooltip content="Total value of all trades executed (buy + sell values). This represents your total trading volume and is used to calculate brokerage charges." id="gross-turnover">
                  <Info className="w-4 h-4 text-gray-400 ml-1 hover:text-gray-600" />
                </InfoTooltip>
              </div>
              <span className="font-medium">{formatCurrency(statistics.grossTurnover)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-gray-600">Total Brokerage</span>
                <InfoTooltip content="All trading costs including brokerage, STT, exchange charges, GST, SEBI charges, and stamp duty. These costs reduce your net profit." id="total-brokerage">
                  <Info className="w-4 h-4 text-gray-400 ml-1 hover:text-gray-600" />
                </InfoTooltip>
              </div>
              <span className="font-medium text-red-600">{formatCurrency(statistics.totalBrokerage)}</span>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-gray-600">Realized P&L</span>
                <InfoTooltip content="Profit or loss from your trading before deducting brokerage and other charges. This is your gross trading performance." id="realized-pnl">
                  <Info className="w-4 h-4 text-gray-400 ml-1 hover:text-gray-600" />
                </InfoTooltip>
              </div>
              <span className={`font-medium ${statistics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(statistics.totalPnL)}
              </span>
            </div>
            <div className="flex justify-between items-center border-t pt-2">
              <div className="flex items-center">
                <span className="text-gray-900 font-medium">Net P&L</span>
                <InfoTooltip content="Your final profit or loss after all costs. This is the actual money you made or lost. Focus on keeping this positive consistently." id="net-pnl">
                  <Info className="w-4 h-4 text-gray-400 ml-1 hover:text-gray-600" />
                </InfoTooltip>
              </div>
              <span className={`font-bold ${statistics.netPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(statistics.netPnL)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Best and Worst Days */}
      {dailyPnL.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 text-green-600 mr-2" />
              Best Trading Day
              <InfoTooltip content="Your most profitable single trading day. Analyze what went right on this day - market conditions, strategy, timing, and mindset." id="best-day">
                <Info className="w-4 h-4 text-gray-400 ml-2 hover:text-gray-600" />
              </InfoTooltip>
            </h3>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(bestDay.netPnL)}
              </div>
              <div className="text-gray-600">
                {format(bestDay.date, 'EEEE, dd MMMM yyyy')}
              </div>
              <div className="text-sm text-gray-500">
                {bestDay.totalTrades} trades • {bestDay.winningTrades} wins • {bestDay.losingTrades} losses
              </div>
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingDown className="w-5 h-5 text-red-600 mr-2" />
              Worst Trading Day
              <InfoTooltip content="Your worst loss in a single trading day. Learn from this day - what went wrong? Overtrading, revenge trading, ignoring stops, or bad market conditions?" id="worst-day">
                <Info className="w-4 h-4 text-gray-400 ml-2 hover:text-gray-600" />
              </InfoTooltip>
            </h3>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(worstDay.netPnL)}
              </div>
              <div className="text-gray-600">
                {format(worstDay.date, 'EEEE, dd MMMM yyyy')}
              </div>
              <div className="text-sm text-gray-500">
                {worstDay.totalTrades} trades • {worstDay.winningTrades} wins • {worstDay.losingTrades} losses
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Performance */}
      {monthlyPnL.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            Monthly Performance
            <InfoTooltip content="Track your consistency month by month. Look for patterns - are you more profitable in certain months? Consistent monthly profits indicate a robust trading strategy." id="monthly-performance">
              <Info className="w-4 h-4 text-gray-400 ml-2 hover:text-gray-600" />
            </InfoTooltip>
          </h3>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Month</th>
                  <th className="table-header">P&L</th>
                  <th className="table-header">Trades</th>
                  <th className="table-header">Performance</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlyPnL.map((month, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="table-cell font-medium">
                      {format(month.month, 'MMMM yyyy')}
                    </td>
                    <td className="table-cell">
                      <span className={`font-medium ${month.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(month.pnl)}
                      </span>
                    </td>
                    <td className="table-cell">{month.trades}</td>
                    <td className="table-cell">
                      <div className="flex items-center">
                        {month.pnl >= 0 ? (
                          <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                        ) : (
                          <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                        )}
                        <span className={month.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                          {month.pnl >= 0 ? 'Profit' : 'Loss'}
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Recommendations */}
      <AIRecommendations
        trades={trades}
        analysisData={{
          statistics,
          dailyPnL,
          monthlyPnL,
          bestDay,
          worstDay
        }}
        pageContext="dashboard"
        pageTitle="Trading Dashboard"
        dataDescription="overall trading performance and portfolio health data"
      />
    </div>
  );
}
