import { format } from 'date-fns';
import { ChevronDown, ChevronRight, ChevronUp, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Trade } from '../types/trade';

interface TradeTableProps {
  trades: Trade[];
}

type SortField = keyof Trade;
type SortDirection = 'asc' | 'desc';

export function TradeTable({ trades }: TradeTableProps) {
  const [sortField, setSortField] = useState<SortField>('tradeDate');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'buy' | 'sell'>('all');
  const [filterInstrument, setFilterInstrument] = useState<'all' | 'CE' | 'PE' | 'FUT'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());

  const toggleOrderExpansion = (orderId: string) => {
    const newExpanded = new Set(expandedOrders);
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId);
    } else {
      newExpanded.add(orderId);
    }
    setExpandedOrders(newExpanded);
  };

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const filteredAndSortedTrades = useMemo(() => {
    let filtered = trades;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(trade =>
        trade.symbol.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply trade type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(trade => trade.tradeType === filterType);
    }

    // Apply instrument type filter
    if (filterInstrument !== 'all') {
      filtered = filtered.filter(trade => trade.instrumentType === filterInstrument);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle Date objects
      if (aValue instanceof Date && bValue instanceof Date) {
        aValue = aValue.getTime();
        bValue = bValue.getTime();
      }

      // Handle string comparison
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue! < bValue!) return sortDirection === 'asc' ? -1 : 1;
      if (aValue! > bValue!) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [trades, searchTerm, filterType, filterInstrument, sortField, sortDirection]);

  const paginatedTrades = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return filteredAndSortedTrades.slice(startIndex, startIndex + pageSize);
  }, [filteredAndSortedTrades, currentPage, pageSize]);

  const totalPages = Math.ceil(filteredAndSortedTrades.length / pageSize);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' ? 
      <ChevronUp className="w-4 h-4" /> : 
      <ChevronDown className="w-4 h-4" />;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(value);
  };

  return (
    <div className="card">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Order History</h2>
        <p className="text-sm text-gray-600 mb-4">
          Orders are merged by Order ID. Multiple executions for the same order are consolidated.
        </p>
        
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search symbols..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="buy">Buy Only</option>
            <option value="sell">Sell Only</option>
          </select>
          
          <select
            value={filterInstrument}
            onChange={(e) => setFilterInstrument(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Instruments</option>
            <option value="CE">Call Options</option>
            <option value="PE">Put Options</option>
            <option value="FUT">Futures</option>
          </select>
          
          <select
            value={pageSize}
            onChange={(e) => setPageSize(Number(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value={25}>25 per page</option>
            <option value={50}>50 per page</option>
            <option value={100}>100 per page</option>
          </select>
        </div>

        <div className="text-sm text-gray-600">
          Showing {paginatedTrades.length} of {filteredAndSortedTrades.length} orders
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th
                className="table-header cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('tradeDate')}
              >
                <div className="flex items-center space-x-1">
                  <span>Date</span>
                  <SortIcon field="tradeDate" />
                </div>
              </th>
              <th
                className="table-header cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('symbol')}
              >
                <div className="flex items-center space-x-1">
                  <span>Symbol</span>
                  <SortIcon field="symbol" />
                </div>
              </th>
              <th
                className="table-header cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('tradeType')}
              >
                <div className="flex items-center space-x-1">
                  <span>Type</span>
                  <SortIcon field="tradeType" />
                </div>
              </th>
              <th
                className="table-header cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('quantity')}
              >
                <div className="flex items-center space-x-1">
                  <span>Quantity</span>
                  <SortIcon field="quantity" />
                </div>
              </th>
              <th
                className="table-header cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center space-x-1">
                  <span>Avg Price</span>
                  <SortIcon field="price" />
                </div>
              </th>
              <th
                className="table-header cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('value')}
              >
                <div className="flex items-center space-x-1">
                  <span>Total Value</span>
                  <SortIcon field="value" />
                </div>
              </th>
              <th className="table-header">Instrument</th>
              <th className="table-header">Strike</th>
              <th className="table-header">Expiry</th>
              <th className="table-header">Executions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedTrades.map((trade) => [
              <tr key={trade.orderId} className="hover:bg-gray-50">
                  <td className="table-cell">
                    <div className="flex items-center">
                      <button
                        onClick={() => toggleOrderExpansion(trade.orderId)}
                        className="mr-2 p-1 hover:bg-gray-200 rounded"
                        title={expandedOrders.has(trade.orderId) ? "Collapse executions" : "Expand executions"}
                      >
                        <ChevronRight
                          className={`w-4 h-4 transition-transform ${
                            expandedOrders.has(trade.orderId) ? 'rotate-90' : ''
                          }`}
                        />
                      </button>
                      <div>
                        <div className="font-medium">
                          {format(trade.tradeDate, 'dd MMM yyyy')}
                        </div>
                        <div className="text-xs text-gray-500">
                          Order ID: {trade.orderId}
                        </div>
                      </div>
                    </div>
                  </td>
                <td className="table-cell">
                  <div>
                    <div className="font-medium">{trade.symbol}</div>
                    <div className="text-xs text-gray-500">{trade.exchange}</div>
                  </div>
                </td>
                <td className="table-cell">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      trade.tradeType === 'buy'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {trade.tradeType.toUpperCase()}
                  </span>
                </td>
                <td className="table-cell font-mono">{trade.quantity}</td>
                <td className="table-cell font-mono">{formatCurrency(trade.price)}</td>
                <td className="table-cell font-mono font-medium">
                  {formatCurrency(trade.value)}
                </td>
                <td className="table-cell">
                  <span className="inline-flex px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-800">
                    {trade.instrumentType}
                  </span>
                </td>
                <td className="table-cell font-mono">
                  {trade.trades[0]?.strikePrice || '-'}
                </td>
                <td className="table-cell">
                  {format(trade.expiryDate, 'dd MMM')}
                </td>
                <td className="table-cell text-center">
                  <span className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                    {trade.trades.length}
                  </span>
                </td>
              </tr>

              ,

              /* Expanded executions */
              expandedOrders.has(trade.orderId) && (
                <tr key={`${trade.orderId}-expanded`}>
                  <td colSpan={9} className="px-6 py-0">
                    <div className="bg-gray-50 rounded-lg p-4 my-2">
                      <h4 className="text-sm font-medium text-gray-900 mb-3">Individual Executions</h4>
                      <div className="overflow-x-auto">
                        <table className="min-w-full">
                          <thead>
                            <tr className="text-xs text-gray-500 uppercase tracking-wider">
                              <th className="text-left py-2">Time</th>
                              <th className="text-left py-2">Quantity</th>
                              <th className="text-left py-2">Price</th>
                              <th className="text-left py-2">Value</th>
                              <th className="text-left py-2">Trade ID</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {trade.trades.map((trade, index) => (
                              <tr key={trade.id} className="text-sm">
                                <td className="py-2 text-gray-900">
                                  {format(trade.orderExecutionTime, 'HH:mm:ss')}
                                </td>
                                <td className="py-2 text-left font-mono text-gray-900">
                                  {trade.quantity}
                                </td>
                                <td className="py-2 text-left font-mono text-gray-900">
                                  {formatCurrency(trade.price)}
                                </td>
                                <td className="py-2 text-left font-mono text-gray-900">
                                  {formatCurrency(trade.value)}
                                </td>
                                <td className="py-2 text-gray-500 font-mono text-xs">
                                  {trade.tradeId}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </td>
                </tr>
              )
            ].filter(Boolean))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-6">
          <div className="text-sm text-gray-700">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
