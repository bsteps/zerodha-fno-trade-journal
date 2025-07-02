export interface RawTradeData {
  symbol: string;
  isin: string;
  trade_date: string;
  exchange: string;
  segment: string;
  series: string;
  trade_type: 'buy' | 'sell';
  auction: boolean;
  quantity: number;
  price: number;
  trade_id: string;
  order_id: string;
  order_execution_time: string;
  expiry_date: string;
}

export interface Trade {
  id: string;
  symbol: string;
  isin: string;
  tradeDate: Date;
  exchange: string;
  segment: string;
  series: string;
  tradeType: 'buy' | 'sell';
  auction: boolean;
  quantity: number;
  price: number;
  tradeId: string;
  orderId: string;
  orderExecutionTime: Date;
  expiryDate: Date;
  value: number; // quantity * price
  instrumentType: 'CE' | 'PE' | 'FUT';
  strikePrice?: number;
  underlyingSymbol: string;
  trades: Trade[];
}

export interface Position {
  symbol: string;
  instrumentType: 'CE' | 'PE' | 'FUT';
  strikePrice?: number;
  expiryDate: Date;
  netQuantity: number;
  avgBuyPrice: number;
  avgSellPrice: number;
  totalBuyValue: number;
  totalSellValue: number;
  realizedPnL: number;
  unrealizedPnL: number;
  status: 'open' | 'closed';
  trades: Trade[];
}

export interface DailyPnL {
  date: Date;
  realizedPnL: number;
  brokerage: number;
  netPnL: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  grossTurnover: number;
  // Enhanced metrics for order-based analysis
  totalOrders?: number;
  winningOrders?: number;
  losingOrders?: number;
  orderWinRate?: number;
  tradeWinRate?: number;
}

export interface TradeStatistics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  maxWin: number;
  maxLoss: number;
  profitFactor: number;
  grossTurnover: number;
  totalBrokerage: number;
  netPnL: number;
}

export interface SymbolPerformance {
  symbol: string;
  totalTrades: number;
  totalPnL: number;
  winRate: number;
  avgPnL: number;
  maxWin: number;
  maxLoss: number;
}

export interface MonthlyPerformance {
  month: string;
  year: number;
  totalPnL: number;
  totalTrades: number;
  winRate: number;
  bestDay: number;
  worstDay: number;
}

export interface FilterOptions {
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  symbols: string[];
  instrumentTypes: ('CE' | 'PE' | 'FUT')[];
  tradeTypes: ('buy' | 'sell')[];
  minQuantity: number | null;
  maxQuantity: number | null;
  minPrice: number | null;
  maxPrice: number | null;
}
