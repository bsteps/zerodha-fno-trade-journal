import React, { useMemo } from 'react';
import { format } from 'date-fns';
import { TrendingUp, TrendingDown, Circle } from 'lucide-react';
import { Trade, Position } from '../types/trade';
import { calculatePositions } from '../utils/calculations';

interface PositionTrackerProps {
  trades: Trade[];
}

export function PositionTracker({ trades }: PositionTrackerProps) {
  const positions = useMemo(() => calculatePositions(trades), [trades]);
  
  const openPositions = positions.filter(p => p.status === 'open');
  const closedPositions = positions.filter(p => p.status === 'closed');
  
  const totalRealizedPnL = closedPositions.reduce((sum, p) => sum + p.realizedPnL, 0);
  const totalUnrealizedPnL = openPositions.reduce((sum, p) => sum + p.unrealizedPnL, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value);
  };

  const PnLDisplay = ({ value, className = '' }: { value: number; className?: string }) => {
    const isPositive = value > 0;
    const isNegative = value < 0;
    
    return (
      <div className={`flex items-center ${className}`}>
        {isPositive && <TrendingUp className="w-4 h-4 text-green-600 mr-1" />}
        {isNegative && <TrendingDown className="w-4 h-4 text-red-600 mr-1" />}
        {value === 0 && <Circle className="w-4 h-4 text-gray-400 mr-1" />}
        <span
          className={`font-medium ${
            isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-600'
          }`}
        >
          {formatCurrency(value)}
        </span>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Total Positions</h3>
          <p className="text-2xl font-bold text-gray-900">{positions.length}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Open Positions</h3>
          <p className="text-2xl font-bold text-blue-600">{openPositions.length}</p>
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Realized P&L</h3>
          <PnLDisplay value={totalRealizedPnL} className="text-lg" />
        </div>
        <div className="card">
          <h3 className="text-sm font-medium text-gray-500 mb-2">Unrealized P&L</h3>
          <PnLDisplay value={totalUnrealizedPnL} className="text-lg" />
        </div>
      </div>

      {/* Open Positions */}
      {openPositions.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Open Positions</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-header">Symbol</th>
                  <th className="table-header">Type</th>
                  <th className="table-header">Strike</th>
                  <th className="table-header">Expiry</th>
                  <th className="table-header">Net Qty</th>
                  <th className="table-header">Avg Buy Price</th>
                  <th className="table-header">Avg Sell Price</th>
                  <th className="table-header">Unrealized P&L</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {openPositions.map((position, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="table-cell">
                      <div>
                        <div className="font-medium">{position.symbol}</div>
                        <div className="text-xs text-gray-500">
                          {position.trades.length} trades
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">
                      <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                        {position.instrumentType}
                      </span>
                    </td>
                    <td className="table-cell font-mono">
                      {position.strikePrice || '-'}
                    </td>
                    <td className="table-cell">
                      {format(position.expiryDate, 'dd MMM yyyy')}
                    </td>
                    <td className="table-cell">
                      <span
                        className={`font-mono font-medium ${
                          position.netQuantity > 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {position.netQuantity > 0 ? '+' : ''}{position.netQuantity}
                      </span>
                    </td>
                    <td className="table-cell font-mono">
                      {position.avgBuyPrice > 0 ? formatCurrency(position.avgBuyPrice) : '-'}
                    </td>
                    <td className="table-cell font-mono">
                      {position.avgSellPrice > 0 ? formatCurrency(position.avgSellPrice) : '-'}
                    </td>
                    <td className="table-cell">
                      <PnLDisplay value={position.unrealizedPnL} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Closed Positions */}
      <div className="card">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Closed Positions ({closedPositions.length})
        </h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-header">Symbol</th>
                <th className="table-header">Type</th>
                <th className="table-header">Strike</th>
                <th className="table-header">Expiry</th>
                <th className="table-header">Trades</th>
                <th className="table-header">Avg Buy Price</th>
                <th className="table-header">Avg Sell Price</th>
                <th className="table-header">Realized P&L</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {closedPositions
                .sort((a, b) => b.realizedPnL - a.realizedPnL)
                .map((position, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div>
                      <div className="font-medium">{position.symbol}</div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                      {position.instrumentType}
                    </span>
                  </td>
                  <td className="table-cell font-mono">
                    {position.strikePrice || '-'}
                  </td>
                  <td className="table-cell">
                    {format(position.expiryDate, 'dd MMM yyyy')}
                  </td>
                  <td className="table-cell">
                    <span className="text-sm text-gray-600">
                      {position.trades.length} trades
                    </span>
                  </td>
                  <td className="table-cell font-mono">
                    {formatCurrency(position.avgBuyPrice)}
                  </td>
                  <td className="table-cell font-mono">
                    {formatCurrency(position.avgSellPrice)}
                  </td>
                  <td className="table-cell">
                    <PnLDisplay value={position.realizedPnL} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
