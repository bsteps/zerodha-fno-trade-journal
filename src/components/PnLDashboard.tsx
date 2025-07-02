import React, { useMemo } from 'react';
import { format, startOfWeek, startOfMonth, endOfWeek, endOfMonth, eachDayOfInterval } from 'date-fns';
import { TrendingUp, TrendingDown, DollarSign, Target, Award, AlertTriangle } from 'lucide-react';
import { Trade, DailyPnL, TradeStatistics } from '../types/trade';
import { calculateDailyPnL, calculateTradeStatistics } from '../utils/calculations';

interface PnLDashboardProps {
  trades: Trade[];
}

export function PnLDashboard({ trades }: PnLDashboardProps) {
  const dailyPnL = useMemo(() => calculateDailyPnL(trades), [trades]);
  const statistics = useMemo(() => calculateTradeStatistics(trades), [trades]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

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

  const StatCard = ({ 
    title, 
    value, 
    icon: Icon, 
    color = 'blue',
    subtitle 
  }: { 
    title: string; 
    value: string | number; 
    icon: React.ElementType; 
    color?: 'blue' | 'green' | 'red' | 'yellow';
    subtitle?: string;
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 text-blue-600',
      green: 'bg-green-50 text-green-600',
      red: 'bg-red-50 text-red-600',
      yellow: 'bg-yellow-50 text-yellow-600'
    };

    return (
      <div className="card">
        <div className="flex items-center">
          <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
          <div className="ml-4">
            <p className="text-sm font-medium text-gray-500">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Net P&L"
          value={formatCurrency(statistics.netPnL)}
          icon={DollarSign}
          color={statistics.netPnL >= 0 ? 'green' : 'red'}
        />
        <StatCard
          title="Win Rate"
          value={formatPercentage(statistics.winRate)}
          icon={Target}
          color={statistics.winRate >= 60 ? 'green' : statistics.winRate >= 40 ? 'yellow' : 'red'}
        />
        <StatCard
          title="Profit Factor"
          value={statistics.profitFactor.toFixed(2)}
          icon={Award}
          color={statistics.profitFactor >= 2 ? 'green' : statistics.profitFactor >= 1 ? 'yellow' : 'red'}
        />
        <StatCard
          title="Total Trades"
          value={statistics.totalTrades}
          icon={TrendingUp}
          color="blue"
        />
      </div>

      {/* Detailed Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Trading Performance</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Winning Trades</span>
              <span className="font-medium text-green-600">{statistics.winningTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Losing Trades</span>
              <span className="font-medium text-red-600">{statistics.losingTrades}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Win</span>
              <span className="font-medium text-green-600">{formatCurrency(statistics.avgWin)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Average Loss</span>
              <span className="font-medium text-red-600">{formatCurrency(statistics.avgLoss)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Largest Win</span>
              <span className="font-medium text-green-600">{formatCurrency(statistics.maxWin)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Largest Loss</span>
              <span className="font-medium text-red-600">{formatCurrency(statistics.maxLoss)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Summary</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Gross Turnover</span>
              <span className="font-medium">{formatCurrency(statistics.grossTurnover)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Brokerage</span>
              <span className="font-medium text-red-600">{formatCurrency(statistics.totalBrokerage)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Realized P&L</span>
              <span className={`font-medium ${statistics.totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(statistics.totalPnL)}
              </span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-900 font-medium">Net P&L</span>
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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monthly Performance</h3>
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
    </div>
  );
}
