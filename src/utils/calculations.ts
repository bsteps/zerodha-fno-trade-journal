import { format, startOfDay } from 'date-fns';
import { DailyPnL, Position, SymbolPerformance, Trade, TradeStatistics } from '../types/trade';

// Broker fee structure
interface BrokerageCharges {
  brokerage: number;
  stt: number;
  transactionCharges: number;
  sebiCharges: number;
  stampCharges: number;
  gst: number;
  totalCharges: number;
}

// Merge trades by order ID to get actual executed orders
export function mergeTradesByOrderId(trades: Trade[]): Trade[] {
  const orderMap = new Map<string, Trade>();

  trades.forEach(trade => {
    const key = trade.orderId;

    if (!orderMap.has(key)) {
      // Create merged trade with the first trade's data and initialize trades array
      orderMap.set(key, {
        ...trade,
        trades: [trade] // Include the first trade in the trades array
      });
    } else {
      const mergedTrade = orderMap.get(key)!;
      // Add this trade to the trades array
      mergedTrade.trades.push(trade);
      // Aggregate quantity and value
      mergedTrade.quantity += trade.quantity;
      mergedTrade.value += trade.value;
    }
  });

  // Calculate average prices for merged trades
  orderMap.forEach(trade => {
    if (trade.quantity > 0) {
      trade.price = trade.value / trade.quantity;
    }
  });

  return Array.from(orderMap.values());
}

// Calculate brokerage charges based on broker fee structure
export function calculateBrokerageCharges(
  trade: Trade,
  exchange: 'NSE' | 'BSE' = 'NSE'
): BrokerageCharges {
  const { instrumentType, tradeType, value, quantity } = trade;

  // 1. Brokerage calculation
  let brokerage = 0;
  if (instrumentType === 'FUT') {
    // F&O Futures: 0.03% or Rs. 20/executed order whichever is lower
    brokerage = Math.min(value * 0.0003, 20);
  } else if (instrumentType === 'CE' || instrumentType === 'PE') {
    // F&O Options: Flat Rs. 20 per executed order
    brokerage = 20;
  }
  // Note: Equity delivery is zero brokerage, equity intraday would be 0.03% or Rs. 20 whichever is lower

  // 2. STT/CTT calculation
  let stt = 0;
  if (instrumentType === 'FUT') {
    // F&O Futures: 0.02% on sell side
    if (tradeType === 'sell') {
      stt = value * 0.0002;
    }
  } else if (instrumentType === 'CE' || instrumentType === 'PE') {
    // F&O Options: 0.1% on sell side (on premium)
    if (tradeType === 'sell') {
      stt = value * 0.001;
    }
    // Note: 0.125% of intrinsic value on exercised options - not calculated here
  }

  // 3. Transaction charges
  let transactionCharges = 0;
  if (instrumentType === 'FUT') {
    // F&O Futures
    transactionCharges = exchange === 'NSE' ? value * 0.0000173 : 0;
  } else if (instrumentType === 'CE' || instrumentType === 'PE') {
    // F&O Options (on premium)
    transactionCharges = exchange === 'NSE' ?
      value * 0.0003503 :
      value * 0.000325;
  }

  // 4. SEBI charges: ₹10 per crore
  const sebiCharges = (value / 10000000) * 10;

  // 5. Stamp charges (on buy side only)
  let stampCharges = 0;
  if (tradeType === 'buy') {
    if (instrumentType === 'FUT') {
      // F&O Futures: 0.002% or ₹200/crore on buy side
      stampCharges = Math.min(value * 0.00002, (value / 10000000) * 200);
    } else if (instrumentType === 'CE' || instrumentType === 'PE') {
      // F&O Options: 0.003% or ₹300/crore on buy side
      stampCharges = Math.min(value * 0.00003, (value / 10000000) * 300);
    }
  }

  // 6. GST: 18% on (brokerage + SEBI charges + transaction charges)
  const gst = (brokerage + sebiCharges + transactionCharges) * 0.18;

  const totalCharges = brokerage + stt + transactionCharges + sebiCharges + stampCharges + gst;

  return {
    brokerage,
    stt,
    transactionCharges,
    sebiCharges,
    stampCharges,
    gst,
    totalCharges
  };
}

// Enhanced Position interface for proper position tracking
interface EnhancedPosition extends Position {
  positionId: string;
  openTime: Date;
  closeTime?: Date;
  entryPrice: number;
  exitPrice?: number;
  maxQuantity: number;
  remainingQuantity: number;
}

export function calculatePositions(trades: Trade[]): EnhancedPosition[] {
  // Sort trades by execution time to process them chronologically
  const sortedTrades = [...trades].sort((a, b) =>
    a.orderExecutionTime.getTime() - b.orderExecutionTime.getTime()
  );

  const positions: EnhancedPosition[] = [];
  const openPositions = new Map<string, EnhancedPosition[]>(); // symbol -> array of open positions

  sortedTrades.forEach(trade => {
    const instrumentKey = `${trade.symbol}_${trade.instrumentType}_${trade.strikePrice || 0}_${format(trade.expiryDate, 'yyyy-MM-dd')}`;

    if (!openPositions.has(instrumentKey)) {
      openPositions.set(instrumentKey, []);
    }

    const instrumentPositions = openPositions.get(instrumentKey)!;

    if (trade.tradeType === 'buy') {
      // First check if this buy trade closes any existing short positions
      const shortPositions = instrumentPositions.filter(p => p.netQuantity < 0 && p.remainingQuantity > 0);
      let remainingQuantity = trade.quantity;

      // Close short positions first (FIFO)
      for (const position of shortPositions) {
        if (position.remainingQuantity > 0 && remainingQuantity > 0) {
          const quantityToClose = Math.min(position.remainingQuantity, remainingQuantity);

          // Update position
          position.trades.push(trade);
          position.totalBuyValue += (quantityToClose / trade.quantity) * trade.value;
          position.remainingQuantity -= quantityToClose;

          // Calculate realized P&L for short position (sell price - buy price)
          const realizedPnL = quantityToClose * (position.entryPrice - trade.price);
          position.realizedPnL += realizedPnL;

          if (position.remainingQuantity === 0) {
            // Position fully closed
            position.status = 'closed';
            position.closeTime = trade.orderExecutionTime;
            position.exitPrice = trade.price;
            position.netQuantity = 0;
            position.avgBuyPrice = position.totalBuyValue / position.maxQuantity;
          } else {
            // Position partially closed
            position.netQuantity = -position.remainingQuantity;
          }

          remainingQuantity -= quantityToClose;
        }
      }

      // If there's remaining quantity after closing shorts, open a new long position
      if (remainingQuantity > 0) {
        const newPosition: EnhancedPosition = {
          positionId: `${instrumentKey}_${trade.orderExecutionTime.getTime()}_${Math.random().toString(36).substring(2, 11)}`,
          symbol: trade.symbol,
          instrumentType: trade.instrumentType,
          strikePrice: trade.strikePrice,
          expiryDate: trade.expiryDate,
          netQuantity: remainingQuantity,
          avgBuyPrice: trade.price,
          avgSellPrice: 0,
          totalBuyValue: (remainingQuantity / trade.quantity) * trade.value,
          totalSellValue: 0,
          realizedPnL: 0,
          unrealizedPnL: 0,
          status: 'open',
          trades: [trade],
          openTime: trade.orderExecutionTime,
          entryPrice: trade.price,
          maxQuantity: remainingQuantity,
          remainingQuantity: remainingQuantity
        };

        instrumentPositions.push(newPosition);
        positions.push(newPosition);
      }

      // Remove fully closed positions from open positions
      openPositions.set(instrumentKey, instrumentPositions.filter(p => p.remainingQuantity > 0));

    } else if (trade.tradeType === 'sell') {
      // First check if this sell trade closes any existing long positions
      const longPositions = instrumentPositions.filter(p => p.netQuantity > 0 && p.remainingQuantity > 0);
      let remainingQuantity = trade.quantity;

      // Close long positions first (FIFO)
      for (const position of longPositions) {
        if (position.remainingQuantity > 0 && remainingQuantity > 0) {
          const quantityToClose = Math.min(position.remainingQuantity, remainingQuantity);

          // Update position
          position.trades.push(trade);
          position.totalSellValue += (quantityToClose / trade.quantity) * trade.value;
          position.remainingQuantity -= quantityToClose;

          // Calculate realized P&L for long position (sell price - buy price)
          const realizedPnL = quantityToClose * (trade.price - position.entryPrice);
          position.realizedPnL += realizedPnL;

          if (position.remainingQuantity === 0) {
            // Position fully closed
            position.status = 'closed';
            position.closeTime = trade.orderExecutionTime;
            position.exitPrice = trade.price;
            position.netQuantity = 0;
            position.avgSellPrice = position.totalSellValue / position.maxQuantity;
          } else {
            // Position partially closed
            position.netQuantity = position.remainingQuantity;
          }

          remainingQuantity -= quantityToClose;
        }
      }

      // If there's remaining quantity after closing longs, open a new short position
      if (remainingQuantity > 0) {
        const newPosition: EnhancedPosition = {
          positionId: `${instrumentKey}_${trade.orderExecutionTime.getTime()}_${Math.random().toString(36).substring(2, 11)}`,
          symbol: trade.symbol,
          instrumentType: trade.instrumentType,
          strikePrice: trade.strikePrice,
          expiryDate: trade.expiryDate,
          netQuantity: -remainingQuantity,
          avgBuyPrice: 0,
          avgSellPrice: trade.price,
          totalBuyValue: 0,
          totalSellValue: (remainingQuantity / trade.quantity) * trade.value,
          realizedPnL: 0,
          unrealizedPnL: 0,
          status: 'open',
          trades: [trade],
          openTime: trade.orderExecutionTime,
          entryPrice: trade.price,
          maxQuantity: remainingQuantity,
          remainingQuantity: remainingQuantity
        };

        instrumentPositions.push(newPosition);
        positions.push(newPosition);
      }

      // Remove fully closed positions from open positions
      openPositions.set(instrumentKey, instrumentPositions.filter(p => p.remainingQuantity > 0));
    }
  });

  // Convert enhanced positions back to regular positions
  return positions;
}

// Enhanced DailyPnL interface to include both trade-based and order-based win rates
export interface EnhancedDailyPnL extends DailyPnL {
  // Order-based metrics (merged by order ID)
  totalOrders: number;
  winningOrders: number;
  losingOrders: number;
  orderWinRate: number;

  // Trade-based metrics (individual executions)
  tradeWinRate: number;
}

export function calculateDailyPnL(trades: Trade[]): EnhancedDailyPnL[] {
  const dailyMap = new Map<string, EnhancedDailyPnL>();

  // Initialize daily data
  trades.forEach(trade => {
    const dateKey = format(startOfDay(trade.tradeDate), 'yyyy-MM-dd');

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: startOfDay(trade.tradeDate),
        realizedPnL: 0,
        brokerage: 0,
        netPnL: 0,
        totalTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
        grossTurnover: 0,
        // Enhanced metrics
        totalOrders: 0,
        winningOrders: 0,
        losingOrders: 0,
        orderWinRate: 0,
        tradeWinRate: 0
      });
    }
  });

  // Calculate brokerage and order counts for each merged trade (order)
  trades.forEach(trade => {
    const dateKey = format(startOfDay(trade.tradeDate), 'yyyy-MM-dd');
    const daily = dailyMap.get(dateKey);

    if (daily) {
      const charges = calculateBrokerageCharges(trade, trade.exchange as 'NSE' | 'BSE');
      daily.brokerage += charges.totalCharges;
      daily.totalOrders++;
      daily.grossTurnover += trade.value;

      // Count individual trade executions for this order
      daily.totalTrades += trade.trades?.length ?? 0;
    }
  });

  // Calculate P&L for each day - distribute across trading days for better performance metrics
  const positions = calculatePositions(trades);
  positions.forEach(position => {
    if (position.status === 'closed' && position.realizedPnL !== 0) {
      // Get unique trading dates for this position
      const tradingDates = [...new Set(position.trades.map(trade =>
        format(startOfDay(trade.tradeDate), 'yyyy-MM-dd')
      ))].sort();

      // For intraday positions (same day open/close), assign all P&L to that day
      if (tradingDates.length === 1) {
        const dateKey = tradingDates[0];
        const daily = dailyMap.get(dateKey);
        if (daily) {
          daily.realizedPnL += position.realizedPnL;

          // Count winning/losing positions
          if (position.realizedPnL > 0) {
            daily.winningOrders++;
            daily.winningTrades += position.trades.length;
          } else {
            daily.losingOrders++;
            daily.losingTrades += position.trades.length;
          }
        }
      } else {
        // For multi-day positions, distribute P&L evenly across trading days
        // This provides more realistic daily volatility for performance ratios
        const pnlPerDay = position.realizedPnL / tradingDates.length;

        tradingDates.forEach((dateKey, index) => {
          const daily = dailyMap.get(dateKey);
          if (daily) {
            daily.realizedPnL += pnlPerDay;

            // Only count the position as won/lost on the final day
            if (index === tradingDates.length - 1) {
              if (position.realizedPnL > 0) {
                daily.winningOrders++;
                daily.winningTrades += position.trades.length;
              } else {
                daily.losingOrders++;
                daily.losingTrades += position.trades.length;
              }
            }
          }
        });
      }
    }
  });

  // Calculate win rates and net P&L
  dailyMap.forEach(daily => {
    daily.netPnL = daily.realizedPnL - daily.brokerage;

    // Calculate order-based win rate (based on completed positions)
    const totalCompletedOrders = daily.winningOrders + daily.losingOrders;
    daily.orderWinRate = totalCompletedOrders > 0 ? (daily.winningOrders / totalCompletedOrders) * 100 : 0;

    // Calculate trade-based win rate (based on individual executions)
    const totalCompletedTrades = daily.winningTrades + daily.losingTrades;
    daily.tradeWinRate = totalCompletedTrades > 0 ? (daily.winningTrades / totalCompletedTrades) * 100 : 0;
  });

  return Array.from(dailyMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
}

export function calculateTradeStatistics(trades: Trade[]): TradeStatistics {
  const positions = calculatePositions(trades);

  const closedPositions = positions.filter(p => p.status === 'closed');

  const winningPositions = closedPositions.filter(p => p.realizedPnL > 0);
  const losingPositions = closedPositions.filter(p => p.realizedPnL < 0);

  const totalPnL = closedPositions.reduce((sum, p) => sum + p.realizedPnL, 0);

  // Calculate accurate brokerage using merged trades
  const grossTurnover = trades.reduce((sum, mt) => sum + mt.value, 0);
  const totalBrokerage = trades.reduce((sum, mt) => {
    const charges = calculateBrokerageCharges(mt, mt.exchange as 'NSE' | 'BSE');
    return sum + charges.totalCharges;
  }, 0);

  const avgWin = winningPositions.length > 0
    ? winningPositions.reduce((sum, p) => sum + p.realizedPnL, 0) / winningPositions.length
    : 0;

  const avgLoss = losingPositions.length > 0
    ? losingPositions.reduce((sum, p) => sum + p.realizedPnL, 0) / losingPositions.length
    : 0;

  const maxWin = winningPositions.length > 0
    ? Math.max(...winningPositions.map(p => p.realizedPnL))
    : 0;

  const maxLoss = losingPositions.length > 0
    ? Math.min(...losingPositions.map(p => p.realizedPnL))
    : 0;

  const totalWins = winningPositions.reduce((sum, p) => sum + p.realizedPnL, 0);
  const totalLosses = Math.abs(losingPositions.reduce((sum, p) => sum + p.realizedPnL, 0));
  const profitFactor = totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0;

  return {
    totalTrades: trades.length, // Use merged trades count for actual executed orders
    winningTrades: winningPositions.length,
    losingTrades: losingPositions.length,
    winRate: closedPositions.length > 0 ? (winningPositions.length / closedPositions.length) * 100 : 0,
    totalPnL,
    avgWin,
    avgLoss,
    maxWin,
    maxLoss,
    profitFactor,
    grossTurnover,
    totalBrokerage,
    netPnL: totalPnL - totalBrokerage
  };
}

export function calculateSymbolPerformance(trades: Trade[]): SymbolPerformance[] {
  const symbolMap = new Map<string, SymbolPerformance>();
  const positions = calculatePositions(trades);

  positions.forEach(position => {
    const symbol = position.symbol;
    
    if (!symbolMap.has(symbol)) {
      symbolMap.set(symbol, {
        symbol,
        totalTrades: 0,
        totalPnL: 0,
        winRate: 0,
        avgPnL: 0,
        maxWin: 0,
        maxLoss: 0
      });
    }

    const symbolPerf = symbolMap.get(symbol)!;
    symbolPerf.totalTrades += position.trades.length;
    
    if (position.status === 'closed') {
      symbolPerf.totalPnL += position.realizedPnL;
      symbolPerf.maxWin = Math.max(symbolPerf.maxWin, position.realizedPnL);
      symbolPerf.maxLoss = Math.min(symbolPerf.maxLoss, position.realizedPnL);
    }
  });

  // Calculate averages and win rates
  symbolMap.forEach(symbolPerf => {
    const symbolPositions = positions.filter(p => 
      (p.symbol) === symbolPerf.symbol && p.status === 'closed'
    );
    
    if (symbolPositions.length > 0) {
      const winningPositions = symbolPositions.filter(p => p.realizedPnL > 0);
      symbolPerf.winRate = (winningPositions.length / symbolPositions.length) * 100;
      symbolPerf.avgPnL = symbolPerf.totalPnL / symbolPositions.length;
    }
  });

  return Array.from(symbolMap.values()).sort((a, b) => b.totalPnL - a.totalPnL);
}

// Get detailed brokerage breakdown for analysis
export function getBrokerageBreakdown(trades: Trade[]): {
  trades: Trade[];
  totalCharges: BrokerageCharges;
  dailyCharges: { date: string; charges: BrokerageCharges }[];
} {
  // Calculate total charges
  const totalCharges: BrokerageCharges = {
    brokerage: 0,
    stt: 0,
    transactionCharges: 0,
    sebiCharges: 0,
    stampCharges: 0,
    gst: 0,
    totalCharges: 0
  };

  const dailyChargesMap = new Map<string, BrokerageCharges>();

  trades.forEach(trade => {
    const charges = calculateBrokerageCharges(trade, trade.exchange as 'NSE' | 'BSE');

    // Add to total
    totalCharges.brokerage += charges.brokerage;
    totalCharges.stt += charges.stt;
    totalCharges.transactionCharges += charges.transactionCharges;
    totalCharges.sebiCharges += charges.sebiCharges;
    totalCharges.stampCharges += charges.stampCharges;
    totalCharges.gst += charges.gst;
    totalCharges.totalCharges += charges.totalCharges;

    // Add to daily breakdown
    const dateKey = format(startOfDay(trade.tradeDate), 'yyyy-MM-dd');
    if (!dailyChargesMap.has(dateKey)) {
      dailyChargesMap.set(dateKey, {
        brokerage: 0,
        stt: 0,
        transactionCharges: 0,
        sebiCharges: 0,
        stampCharges: 0,
        gst: 0,
        totalCharges: 0
      });
    }

    const dailyCharges = dailyChargesMap.get(dateKey)!;
    dailyCharges.brokerage += charges.brokerage;
    dailyCharges.stt += charges.stt;
    dailyCharges.transactionCharges += charges.transactionCharges;
    dailyCharges.sebiCharges += charges.sebiCharges;
    dailyCharges.stampCharges += charges.stampCharges;
    dailyCharges.gst += charges.gst;
    dailyCharges.totalCharges += charges.totalCharges;
  });

  const dailyCharges = Array.from(dailyChargesMap.entries()).map(([date, charges]) => ({
    date,
    charges
  })).sort((a, b) => a.date.localeCompare(b.date));

  return {
    trades,
    totalCharges,
    dailyCharges
  };
}

// Drawdown analysis interfaces
export interface DrawdownPeriod {
  startDate: Date;
  endDate: Date;
  peakValue: number;
  troughValue: number;
  drawdownAmount: number;
  drawdownPercentage: number;
  recoveryDate?: Date;
  durationDays: number;
  recoveryDays?: number;
  isRecovered: boolean;
}

export interface DrawdownAnalysis {
  maxDrawdown: number;
  maxDrawdownPercentage: number;
  currentDrawdown: number;
  currentDrawdownPercentage: number;
  drawdownPeriods: DrawdownPeriod[];
  avgDrawdown: number;
  avgDrawdownPercentage: number;
  avgRecoveryDays: number;
  totalDrawdownDays: number;
  drawdownFrequency: number; // drawdowns per year
}

// Risk-Reward Ratio analysis
export interface RiskRewardAnalysis {
  ratios: number[];
  avgRatio: number;
  medianRatio: number;
  ratioDistribution: { range: string; count: number; percentage: number }[];
  profitableRatioThreshold: number;
}

// Position size analysis
export interface PositionSizeAnalysis {
  sizeRanges: { range: string; count: number; avgPnL: number; winRate: number }[];
  optimalSizeRange: string;
  correlationWithPnL: number;
}

// Calculate comprehensive drawdown analysis
export function calculateDrawdownAnalysis(trades: Trade[]): DrawdownAnalysis {
  const dailyPnL = calculateDailyPnL(trades);

  if (dailyPnL.length === 0) {
    return {
      maxDrawdown: 0,
      maxDrawdownPercentage: 0,
      currentDrawdown: 0,
      currentDrawdownPercentage: 0,
      drawdownPeriods: [],
      avgDrawdown: 0,
      avgDrawdownPercentage: 0,
      avgRecoveryDays: 0,
      totalDrawdownDays: 0,
      drawdownFrequency: 0
    };
  }

  // Calculate cumulative P&L for each day
  let cumulativePnL = 0;
  const cumulativeData = dailyPnL.map(day => {
    cumulativePnL += day.netPnL;
    return {
      date: day.date,
      cumulativePnL,
      dailyPnL: day.netPnL
    };
  });

  // Find drawdown periods
  const drawdownPeriods: DrawdownPeriod[] = [];
  let currentPeak = cumulativeData[0].cumulativePnL;
  let inDrawdown = false;
  let drawdownStart: typeof cumulativeData[0] | null = null;

  for (let i = 1; i < cumulativeData.length; i++) {
    const current = cumulativeData[i];

    if (current.cumulativePnL > currentPeak) {
      // New peak reached
      if (inDrawdown && drawdownStart) {
        // End current drawdown period
        const drawdownAmount = currentPeak - cumulativeData[i - 1].cumulativePnL;
        const drawdownPercentage = currentPeak !== 0 ? (drawdownAmount / Math.abs(currentPeak)) * 100 : 0;
        const durationDays = Math.ceil((cumulativeData[i - 1].date.getTime() - drawdownStart.date.getTime()) / (1000 * 60 * 60 * 24));
        const recoveryDays = Math.ceil((current.date.getTime() - cumulativeData[i - 1].date.getTime()) / (1000 * 60 * 60 * 24));

        drawdownPeriods.push({
          startDate: drawdownStart.date,
          endDate: cumulativeData[i - 1].date,
          peakValue: currentPeak,
          troughValue: cumulativeData[i - 1].cumulativePnL,
          drawdownAmount,
          drawdownPercentage,
          recoveryDate: current.date,
          durationDays,
          recoveryDays,
          isRecovered: true
        });
      }

      currentPeak = current.cumulativePnL;
      inDrawdown = false;
      drawdownStart = null;
    } else if (current.cumulativePnL < currentPeak) {
      // In drawdown
      if (!inDrawdown) {
        inDrawdown = true;
        drawdownStart = current;
      }
    }
  }

  // Handle ongoing drawdown
  if (inDrawdown && drawdownStart) {
    const lastData = cumulativeData[cumulativeData.length - 1];
    const drawdownAmount = currentPeak - lastData.cumulativePnL;
    const drawdownPercentage = currentPeak !== 0 ? (drawdownAmount / Math.abs(currentPeak)) * 100 : 0;
    const durationDays = Math.ceil((lastData.date.getTime() - drawdownStart.date.getTime()) / (1000 * 60 * 60 * 24));

    drawdownPeriods.push({
      startDate: drawdownStart.date,
      endDate: lastData.date,
      peakValue: currentPeak,
      troughValue: lastData.cumulativePnL,
      drawdownAmount,
      drawdownPercentage,
      durationDays,
      isRecovered: false
    });
  }

  // Calculate statistics
  const maxDrawdown = Math.max(...drawdownPeriods.map(d => d.drawdownAmount), 0);
  const maxDrawdownPercentage = Math.max(...drawdownPeriods.map(d => d.drawdownPercentage), 0);

  const currentData = cumulativeData[cumulativeData.length - 1];
  const currentDrawdown = inDrawdown ? currentPeak - currentData.cumulativePnL : 0;
  const currentDrawdownPercentage = inDrawdown && currentPeak !== 0 ? (currentDrawdown / Math.abs(currentPeak)) * 100 : 0;

  const avgDrawdown = drawdownPeriods.length > 0 ? drawdownPeriods.reduce((sum, d) => sum + d.drawdownAmount, 0) / drawdownPeriods.length : 0;
  const avgDrawdownPercentage = drawdownPeriods.length > 0 ? drawdownPeriods.reduce((sum, d) => sum + d.drawdownPercentage, 0) / drawdownPeriods.length : 0;

  const recoveredPeriods = drawdownPeriods.filter(d => d.isRecovered && d.recoveryDays !== undefined);
  const avgRecoveryDays = recoveredPeriods.length > 0 ? recoveredPeriods.reduce((sum, d) => sum + (d.recoveryDays || 0), 0) / recoveredPeriods.length : 0;

  const totalDrawdownDays = drawdownPeriods.reduce((sum, d) => sum + d.durationDays, 0);

  // Calculate drawdown frequency (per year)
  const totalDays = Math.ceil((cumulativeData[cumulativeData.length - 1].date.getTime() - cumulativeData[0].date.getTime()) / (1000 * 60 * 60 * 24));
  const drawdownFrequency = totalDays > 0 ? (drawdownPeriods.length / totalDays) * 365 : 0;

  return {
    maxDrawdown,
    maxDrawdownPercentage,
    currentDrawdown,
    currentDrawdownPercentage,
    drawdownPeriods,
    avgDrawdown,
    avgDrawdownPercentage,
    avgRecoveryDays,
    totalDrawdownDays,
    drawdownFrequency
  };
}

// Calculate Risk-Reward ratio analysis
export function calculateRiskRewardAnalysis(trades: Trade[]): RiskRewardAnalysis {
  const positions = calculatePositions(trades);
  const closedPositions = positions.filter(p => p.status === 'closed' && p.realizedPnL !== 0);

  // Separate winning and losing positions
  const winningPositions = closedPositions.filter(p => p.realizedPnL > 0);
  const losingPositions = closedPositions.filter(p => p.realizedPnL < 0);

  // Calculate average win and average loss
  const avgWin = winningPositions.length > 0
    ? winningPositions.reduce((sum, p) => sum + p.realizedPnL, 0) / winningPositions.length
    : 0;
  const avgLoss = losingPositions.length > 0
    ? Math.abs(losingPositions.reduce((sum, p) => sum + p.realizedPnL, 0) / losingPositions.length)
    : 0;

  // For individual ratios, we'll calculate how each trade compares to the average win/loss
  const ratios = closedPositions.map(position => {
    if (position.realizedPnL === 0) return 0;

    if (position.realizedPnL > 0) {
      // For winning trades: this win / average loss (how many average losses this win covers)
      return avgLoss > 0 ? position.realizedPnL / avgLoss : 1;
    } else {
      // For losing trades: average win / this loss (how many of these losses one average win covers)
      return avgWin > 0 ? avgWin / Math.abs(position.realizedPnL) : 0;
    }
  }).filter(ratio => ratio > 0);

  if (ratios.length === 0) {
    return {
      ratios: [],
      avgRatio: 0,
      medianRatio: 0,
      ratioDistribution: [],
      profitableRatioThreshold: 0
    };
  }

  const avgRatio = ratios.reduce((sum, r) => sum + r, 0) / ratios.length;
  const sortedRatios = [...ratios].sort((a, b) => a - b);
  const medianRatio = sortedRatios[Math.floor(sortedRatios.length / 2)];

  // Create distribution ranges
  const ranges = [
    { min: 0, max: 0.5, label: '< 0.5' },
    { min: 0.5, max: 1, label: '0.5 - 1.0' },
    { min: 1, max: 1.5, label: '1.0 - 1.5' },
    { min: 1.5, max: 2, label: '1.5 - 2.0' },
    { min: 2, max: 3, label: '2.0 - 3.0' },
    { min: 3, max: Infinity, label: '> 3.0' }
  ];

  const ratioDistribution = ranges.map(range => {
    const count = ratios.filter(r => r >= range.min && r < range.max).length;
    return {
      range: range.label,
      count,
      percentage: (count / ratios.length) * 100
    };
  });

  // Calculate profitable ratio threshold (ratio needed for breakeven given win rate)
  const winRate = closedPositions.filter(p => p.realizedPnL > 0).length / closedPositions.length;
  const profitableRatioThreshold = winRate > 0 ? (1 - winRate) / winRate : Infinity;

  return {
    ratios,
    avgRatio,
    medianRatio,
    ratioDistribution,
    profitableRatioThreshold
  };
}

// Calculate position size analysis
export function calculatePositionSizeAnalysis(trades: Trade[]): PositionSizeAnalysis {
  const positions = calculatePositions(trades);
  const closedPositions = positions.filter(p => p.status === 'closed');

  if (closedPositions.length === 0) {
    return {
      sizeRanges: [],
      optimalSizeRange: '',
      correlationWithPnL: 0
    };
  }

  // Calculate position sizes (use the larger of buy or sell value as position size)
  const positionSizes = closedPositions.map(p => {
    const totalBuyValue = Math.abs(p.totalBuyValue);
    const totalSellValue = Math.abs(p.totalSellValue);
    return Math.max(totalBuyValue, totalSellValue); // Position size is the larger exposure
  });

  // Define size ranges based on position sizes (not individual trades)
  const minValue = Math.min(...positionSizes);
  const maxValue = Math.max(...positionSizes);
  const range = maxValue - minValue;

  const ranges = [
    { min: minValue, max: minValue + range * 0.2, label: 'Small (0-20%)' },
    { min: minValue + range * 0.2, max: minValue + range * 0.4, label: 'Small-Medium (20-40%)' },
    { min: minValue + range * 0.4, max: minValue + range * 0.6, label: 'Medium (40-60%)' },
    { min: minValue + range * 0.6, max: minValue + range * 0.8, label: 'Medium-Large (60-80%)' },
    { min: minValue + range * 0.8, max: maxValue, label: 'Large (80-100%)' }
  ];

  const sizeRanges = ranges.map(range => {
    const positionsInRange = closedPositions.filter((_, index) => {
      const positionSize = positionSizes[index];
      return positionSize >= range.min && positionSize <= range.max;
    });

    const avgPnL = positionsInRange.length > 0 ?
      positionsInRange.reduce((sum, p) => sum + p.realizedPnL, 0) / positionsInRange.length : 0;

    const winningPositions = positionsInRange.filter(p => p.realizedPnL > 0);
    const winRate = positionsInRange.length > 0 ? (winningPositions.length / positionsInRange.length) * 100 : 0;

    return {
      range: range.label,
      count: positionsInRange.length, // Now correctly counts positions, not trades
      avgPnL,
      winRate
    };
  });

  // Find optimal size range (highest average P&L)
  const optimalRange = sizeRanges.reduce((best, current) =>
    current.avgPnL > best.avgPnL ? current : best,
    sizeRanges[0] || { range: '', avgPnL: 0 }
  );

  // Calculate correlation between position size and P&L
  const sizeAndPnL = closedPositions.map((p, index) => ({
    size: positionSizes[index], // Use the correctly calculated position size
    pnl: p.realizedPnL
  }));

  let correlationWithPnL = 0;
  if (sizeAndPnL.length > 1) {
    const avgSize = sizeAndPnL.reduce((sum, sp) => sum + sp.size, 0) / sizeAndPnL.length;
    const avgPnL = sizeAndPnL.reduce((sum, sp) => sum + sp.pnl, 0) / sizeAndPnL.length;

    const numerator = sizeAndPnL.reduce((sum, sp) => sum + (sp.size - avgSize) * (sp.pnl - avgPnL), 0);
    const denomSizeVar = sizeAndPnL.reduce((sum, sp) => sum + Math.pow(sp.size - avgSize, 2), 0);
    const denomPnLVar = sizeAndPnL.reduce((sum, sp) => sum + Math.pow(sp.pnl - avgPnL, 2), 0);

    if (denomSizeVar > 0 && denomPnLVar > 0) {
      correlationWithPnL = numerator / Math.sqrt(denomSizeVar * denomPnLVar);
    }
  }

  return {
    sizeRanges,
    optimalSizeRange: optimalRange.range,
    correlationWithPnL
  };
}

// Advanced Performance Metrics interfaces
export interface StreakAnalysis {
  currentStreak: { type: 'win' | 'loss'; count: number };
  longestWinStreak: number;
  longestLossStreak: number;
  avgWinStreak: number;
  avgLossStreak: number;
  streakDistribution: { streakLength: number; winCount: number; lossCount: number }[];
}

export interface PerformanceRatios {
  sharpeRatio: number;
  calmarRatio: number;
  sortinoRatio: number;
  maxDrawdownRatio: number;
  profitToMaxDrawdownRatio: number;
}

export interface MonthlyReturnsHeatmap {
  year: number;
  months: {
    month: number;
    monthName: string;
    returns: number;
    returnsPercentage: number;
    tradesCount: number;
  }[];
  yearlyReturn: number;
  yearlyReturnPercentage: number;
}

// Calculate consecutive win/loss streaks
export function calculateStreakAnalysis(trades: Trade[]): StreakAnalysis {
  const positions = calculatePositions(trades);
  // Filter out positions with zero P&L and sort chronologically
  const closedPositions = positions
    .filter(p => p.status === 'closed' && p.realizedPnL !== 0)
    .sort((a, b) => {
      return a.openTime.getTime() - b.openTime.getTime();
    });

  if (closedPositions.length === 0) {
    return {
      currentStreak: { type: 'win', count: 0 },
      longestWinStreak: 0,
      longestLossStreak: 0,
      avgWinStreak: 0,
      avgLossStreak: 0,
      streakDistribution: []
    };
  }

  // Calculate streaks
  const streaks: { type: 'win' | 'loss'; count: number }[] = [];
  let currentStreakType: 'win' | 'loss' = closedPositions[0].realizedPnL > 0 ? 'win' : 'loss';
  let currentStreakCount = 1;

  for (let i = 1; i < closedPositions.length; i++) {
    const isWin = closedPositions[i].realizedPnL > 0;
    const streakType = isWin ? 'win' : 'loss';

    if (streakType === currentStreakType) {
      currentStreakCount++;
    } else {
      streaks.push({ type: currentStreakType, count: currentStreakCount });
      currentStreakType = streakType;
      currentStreakCount = 1;
    }
  }

  // Add the final streak
  streaks.push({ type: currentStreakType, count: currentStreakCount });

  // Calculate statistics
  const winStreaks = streaks.filter(s => s.type === 'win').map(s => s.count);
  const lossStreaks = streaks.filter(s => s.type === 'loss').map(s => s.count);

  const longestWinStreak = winStreaks.length > 0 ? Math.max(...winStreaks) : 0;
  const longestLossStreak = lossStreaks.length > 0 ? Math.max(...lossStreaks) : 0;
  const avgWinStreak = winStreaks.length > 0 ? winStreaks.reduce((sum, s) => sum + s, 0) / winStreaks.length : 0;
  const avgLossStreak = lossStreaks.length > 0 ? lossStreaks.reduce((sum, s) => sum + s, 0) / lossStreaks.length : 0;

  // Create streak distribution
  const maxStreak = Math.max(longestWinStreak, longestLossStreak);
  const streakDistribution = [];
  for (let i = 1; i <= maxStreak; i++) {
    const winCount = winStreaks.filter(s => s === i).length;
    const lossCount = lossStreaks.filter(s => s === i).length;
    if (winCount > 0 || lossCount > 0) {
      streakDistribution.push({ streakLength: i, winCount, lossCount });
    }
  }

  return {
    currentStreak: streaks[streaks.length - 1] || { type: 'win', count: 0 },
    longestWinStreak,
    longestLossStreak,
    avgWinStreak,
    avgLossStreak,
    streakDistribution
  };
}

// Calculate advanced performance ratios
export function calculatePerformanceRatios(trades: Trade[]): PerformanceRatios {
  const dailyPnL = calculateDailyPnL(trades);
  const drawdownAnalysis = calculateDrawdownAnalysis(trades);

  if (dailyPnL.length === 0) {
    return {
      sharpeRatio: 0,
      calmarRatio: 0,
      sortinoRatio: 0,
      maxDrawdownRatio: 0,
      profitToMaxDrawdownRatio: 0
    };
  }

  const dailyReturns = dailyPnL.map(day => day.netPnL);
  const totalReturn = dailyReturns.reduce((sum, ret) => sum + ret, 0);
  const avgDailyReturn = totalReturn / dailyReturns.length;

  // Calculate standard deviation of daily returns
  const variance = dailyReturns.reduce((sum, ret) => sum + Math.pow(ret - avgDailyReturn, 2), 0) / dailyReturns.length;
  const stdDev = Math.sqrt(variance);

  // Sharpe Ratio (assuming risk-free rate of 0 for simplicity)
  // Annualized Sharpe = (Annualized Return - Risk Free Rate) / Annualized Volatility
  const annualReturn = avgDailyReturn * 252;
  const annualVolatility = stdDev * Math.sqrt(252);
  const sharpeRatio = annualVolatility > 0 ? annualReturn / annualVolatility : 0;

  // Calmar Ratio (Annual Return / Max Drawdown)
  const calmarRatio = drawdownAnalysis.maxDrawdown > 0 ? annualReturn / drawdownAnalysis.maxDrawdown : 0;

  // Sortino Ratio (only considers downside deviation from mean)
  const belowMeanReturns = dailyReturns.filter(ret => ret < avgDailyReturn);
  const downsideVariance = belowMeanReturns.length > 0
    ? belowMeanReturns.reduce((sum, ret) => sum + Math.pow(ret - avgDailyReturn, 2), 0) / belowMeanReturns.length
    : 0;
  const downsideStdDev = Math.sqrt(downsideVariance);
  const annualDownsideVolatility = downsideStdDev * Math.sqrt(252);
  const sortinoRatio = annualDownsideVolatility > 0 ? annualReturn / annualDownsideVolatility : 0;

  // Max Drawdown Ratio (Max Drawdown as percentage of absolute total return)
  const maxDrawdownRatio = Math.abs(totalReturn) > 0 ? drawdownAnalysis.maxDrawdown / Math.abs(totalReturn) : 0;

  // Profit to Max Drawdown Ratio (handles negative returns properly)
  const profitToMaxDrawdownRatio = drawdownAnalysis.maxDrawdown > 0 ? totalReturn / drawdownAnalysis.maxDrawdown : 0;

  return {
    sharpeRatio,
    calmarRatio,
    sortinoRatio,
    maxDrawdownRatio,
    profitToMaxDrawdownRatio
  };
}

// Calculate monthly returns heatmap data
export function calculateMonthlyReturnsHeatmap(trades: Trade[]): MonthlyReturnsHeatmap[] {
  const dailyPnL = calculateDailyPnL(trades);

  if (dailyPnL.length === 0) {
    return [];
  }

  // Group by year and month
  const monthlyData = new Map<string, { year: number; month: number; returns: number; tradesCount: number }>();

  dailyPnL.forEach(day => {
    const year = day.date.getFullYear();
    const month = day.date.getMonth() + 1; // 1-based month
    const key = `${year}-${month}`;

    if (!monthlyData.has(key)) {
      monthlyData.set(key, { year, month, returns: 0, tradesCount: 0 });
    }

    const monthData = monthlyData.get(key)!;
    monthData.returns += day.netPnL;
    monthData.tradesCount += day.totalTrades;
  });

  // Group by year
  const yearlyData = new Map<number, MonthlyReturnsHeatmap>();

  monthlyData.forEach(({ year, month, returns, tradesCount }) => {
    if (!yearlyData.has(year)) {
      yearlyData.set(year, {
        year,
        months: [],
        yearlyReturn: 0,
        yearlyReturnPercentage: 0
      });
    }

    const yearData = yearlyData.get(year)!;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                       'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    yearData.months.push({
      month,
      monthName: monthNames[month - 1],
      returns,
      returnsPercentage: 0, // Will calculate after we have yearly totals
      tradesCount
    });

    yearData.yearlyReturn += returns;
  });

  // Calculate percentages and sort months
  const result = Array.from(yearlyData.values()).map(yearData => {
    // Sort months by month number
    yearData.months.sort((a, b) => a.month - b.month);

    // Calculate monthly return percentages (relative to yearly return)
    yearData.months = yearData.months.map(month => ({
      ...month,
      returnsPercentage: yearData.yearlyReturn !== 0 ? (month.returns / Math.abs(yearData.yearlyReturn)) * 100 : 0
    }));

    // Calculate yearly return percentage (could be relative to starting capital if available)
    yearData.yearlyReturnPercentage = yearData.yearlyReturn; // For now, same as absolute return

    return yearData;
  });

  return result.sort((a, b) => a.year - b.year);
}

// Market Timing Analytics interfaces
export interface DayOfWeekAnalysis {
  dayOfWeek: string;
  dayNumber: number;
  totalTrades: number;
  totalPnL: number;
  avgPnL: number;
  winRate: number;
  winningTrades: number;
  losingTrades: number;
}

export interface MarketSessionAnalysis {
  session: 'Pre-Market' | 'Opening' | 'Mid-Day' | 'Closing' | 'After-Hours';
  timeRange: string;
  totalTrades: number;
  totalPnL: number;
  avgPnL: number;
  winRate: number;
  winningTrades: number;
  losingTrades: number;
}

export interface VolatilityAnalysis {
  volatilityRange: string;
  tradeCount: number;
  avgPnL: number;
  winRate: number;
  avgVolatility: number;
}

// Calculate day of week performance
export function calculateDayOfWeekAnalysis(trades: Trade[]): DayOfWeekAnalysis[] {
  const positions = calculatePositions(trades);
  const closedPositions = positions.filter(p => p.status === 'closed');

  const dayMap = new Map<number, DayOfWeekAnalysis>();
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  // Initialize all days
  for (let i = 0; i < 7; i++) {
    dayMap.set(i, {
      dayOfWeek: dayNames[i],
      dayNumber: i,
      totalTrades: 0,
      totalPnL: 0,
      avgPnL: 0,
      winRate: 0,
      winningTrades: 0,
      losingTrades: 0
    });
  }

  closedPositions.forEach(position => {
    // Use the last trade date for the position
    const lastTradeDate = position.trades.reduce((latest, trade) =>
      trade.tradeDate > latest ? trade.tradeDate : latest,
      position.trades[0].tradeDate
    );

    const dayOfWeek = lastTradeDate.getDay();
    const dayData = dayMap.get(dayOfWeek)!;

    dayData.totalTrades++;
    dayData.totalPnL += position.realizedPnL;

    if (position.realizedPnL > 0) {
      dayData.winningTrades++;
    } else {
      dayData.losingTrades++;
    }
  });

  // Calculate averages and win rates
  dayMap.forEach(dayData => {
    dayData.avgPnL = dayData.totalTrades > 0 ? dayData.totalPnL / dayData.totalTrades : 0;
    dayData.winRate = dayData.totalTrades > 0 ? (dayData.winningTrades / dayData.totalTrades) * 100 : 0;
  });

  return Array.from(dayMap.values()).filter(day => day.totalTrades > 0);
}

// Calculate market session performance
export function calculateMarketSessionAnalysis(trades: Trade[]): MarketSessionAnalysis[] {
  const positions = calculatePositions(trades);
  const closedPositions = positions.filter(p => p.status === 'closed');

  const sessions: MarketSessionAnalysis[] = [
    { session: 'Pre-Market', timeRange: '07:00-09:15', totalTrades: 0, totalPnL: 0, avgPnL: 0, winRate: 0, winningTrades: 0, losingTrades: 0 },
    { session: 'Opening', timeRange: '09:15-10:30', totalTrades: 0, totalPnL: 0, avgPnL: 0, winRate: 0, winningTrades: 0, losingTrades: 0 },
    { session: 'Mid-Day', timeRange: '10:30-14:30', totalTrades: 0, totalPnL: 0, avgPnL: 0, winRate: 0, winningTrades: 0, losingTrades: 0 },
    { session: 'Closing', timeRange: '14:30-15:30', totalTrades: 0, totalPnL: 0, avgPnL: 0, winRate: 0, winningTrades: 0, losingTrades: 0 },
    { session: 'After-Hours', timeRange: '15:30-17:00', totalTrades: 0, totalPnL: 0, avgPnL: 0, winRate: 0, winningTrades: 0, losingTrades: 0 }
  ];

  const getSessionIndex = (date: Date): number => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const totalMinutes = hours * 60 + minutes;

    if (totalMinutes >= 420 && totalMinutes < 555) return 0; // Pre-Market: 07:00-09:15
    if (totalMinutes >= 555 && totalMinutes < 630) return 1; // Opening: 09:15-10:30
    if (totalMinutes >= 630 && totalMinutes < 870) return 2; // Mid-Day: 10:30-14:30
    if (totalMinutes >= 870 && totalMinutes < 930) return 3; // Closing: 14:30-15:30
    if (totalMinutes >= 930 && totalMinutes < 1020) return 4; // After-Hours: 15:30-17:00

    return 2; // Default to Mid-Day for any other time
  };

  closedPositions.forEach(position => {
    // Use the first trade time for entry analysis
    const firstTradeTime = position.trades.reduce((earliest, trade) =>
      trade.orderExecutionTime < earliest ? trade.orderExecutionTime : earliest,
      position.trades[0].orderExecutionTime
    );

    const sessionIndex = getSessionIndex(firstTradeTime);
    const session = sessions[sessionIndex];

    session.totalTrades++;
    session.totalPnL += position.realizedPnL;

    if (position.realizedPnL > 0) {
      session.winningTrades++;
    } else {
      session.losingTrades++;
    }
  });

  // Calculate averages and win rates
  sessions.forEach(session => {
    session.avgPnL = session.totalTrades > 0 ? session.totalPnL / session.totalTrades : 0;
    session.winRate = session.totalTrades > 0 ? (session.winningTrades / session.totalTrades) * 100 : 0;
  });

  return sessions.filter(session => session.totalTrades > 0);
}

// Calculate volatility vs performance analysis
export function calculateVolatilityAnalysis(trades: Trade[]): VolatilityAnalysis[] {
  const positions = calculatePositions(trades);
  const closedPositions = positions.filter(p => p.status === 'closed');

  if (closedPositions.length === 0) {
    return [];
  }

  // Calculate volatility for each position (using price range as proxy)
  const positionsWithVolatility = closedPositions.map(position => {
    const prices = position.trades.map(t => t.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const avgPrice = prices.reduce((sum, p) => sum + p, 0) / prices.length;
    const volatility = avgPrice > 0 ? ((maxPrice - minPrice) / avgPrice) * 100 : 0;

    return {
      ...position,
      volatility
    };
  });

  // Define volatility ranges
  const allVolatilities = positionsWithVolatility.map(p => p.volatility);
  const minVol = Math.min(...allVolatilities);
  const maxVol = Math.max(...allVolatilities);
  const volRange = maxVol - minVol;

  const ranges = [
    { min: minVol, max: minVol + volRange * 0.25, label: 'Low (0-25%)' },
    { min: minVol + volRange * 0.25, max: minVol + volRange * 0.5, label: 'Medium-Low (25-50%)' },
    { min: minVol + volRange * 0.5, max: minVol + volRange * 0.75, label: 'Medium-High (50-75%)' },
    { min: minVol + volRange * 0.75, max: maxVol, label: 'High (75-100%)' }
  ];

  const volatilityAnalysis = ranges.map(range => {
    const positionsInRange = positionsWithVolatility.filter(p =>
      p.volatility >= range.min && p.volatility <= range.max
    );

    const winningPositions = positionsInRange.filter(p => p.realizedPnL > 0);
    const avgPnL = positionsInRange.length > 0 ?
      positionsInRange.reduce((sum, p) => sum + p.realizedPnL, 0) / positionsInRange.length : 0;
    const winRate = positionsInRange.length > 0 ? (winningPositions.length / positionsInRange.length) * 100 : 0;
    const avgVolatility = positionsInRange.length > 0 ?
      positionsInRange.reduce((sum, p) => sum + p.volatility, 0) / positionsInRange.length : 0;

    return {
      volatilityRange: range.label,
      tradeCount: positionsInRange.length,
      avgPnL,
      winRate,
      avgVolatility
    };
  });

  return volatilityAnalysis.filter(va => va.tradeCount > 0);
}

// Strategy Analysis interfaces
export interface HoldTimeAnalysis {
  holdTimeRange: string;
  avgHoldTimeMinutes: number;
  tradeCount: number;
  avgPnL: number;
  winRate: number;
  totalPnL: number;
}

export interface EntryExitTimingAnalysis {
  hour: number;
  timeLabel: string;
  entryTrades: number;
  exitTrades: number;
  entryAvgPnL: number;
  exitAvgPnL: number;
  entryWinRate: number;
  exitWinRate: number;
}

export interface InstrumentTypeAnalysis {
  instrumentType: 'CE' | 'PE' | 'FUT';
  instrumentName: string;
  totalTrades: number;
  totalPnL: number;
  avgPnL: number;
  winRate: number;
  winningTrades: number;
  losingTrades: number;
  avgHoldTimeMinutes: number;
  totalVolume: number;
}

// Calculate hold time analysis
export function calculateHoldTimeAnalysis(trades: Trade[]): HoldTimeAnalysis[] {
  const positions = calculatePositions(trades);
  const closedPositions = positions.filter(p => p.status === 'closed');

  if (closedPositions.length === 0) {
    return [];
  }

  // Calculate hold time for each position
  const positionsWithHoldTime = closedPositions.map(position => {
    const entryTimes = position.trades.filter(t => t.tradeType === 'buy').map(t => t.orderExecutionTime);
    const exitTimes = position.trades.filter(t => t.tradeType === 'sell').map(t => t.orderExecutionTime);

    if (entryTimes.length === 0 || exitTimes.length === 0) {
      return { ...position, holdTimeMinutes: 0 };
    }

    const firstEntry = new Date(Math.min(...entryTimes.map(t => t.getTime())));
    const lastExit = new Date(Math.max(...exitTimes.map(t => t.getTime())));
    const holdTimeMinutes = (lastExit.getTime() - firstEntry.getTime()) / (1000 * 60);

    return { ...position, holdTimeMinutes };
  });

  // Define hold time ranges
  const ranges = [
    { min: 0, max: 15, label: '0-15 min (Scalping)' },
    { min: 15, max: 60, label: '15-60 min (Short-term)' },
    { min: 60, max: 240, label: '1-4 hours (Intraday)' },
    { min: 240, max: 1440, label: '4-24 hours (Swing)' },
    { min: 1440, max: Infinity, label: '1+ days (Position)' }
  ];

  const holdTimeAnalysis = ranges.map(range => {
    const positionsInRange = positionsWithHoldTime.filter(p =>
      p.holdTimeMinutes >= range.min && p.holdTimeMinutes < range.max
    );

    const winningPositions = positionsInRange.filter(p => p.realizedPnL > 0);
    const totalPnL = positionsInRange.reduce((sum, p) => sum + p.realizedPnL, 0);
    const avgPnL = positionsInRange.length > 0 ? totalPnL / positionsInRange.length : 0;
    const winRate = positionsInRange.length > 0 ? (winningPositions.length / positionsInRange.length) * 100 : 0;
    const avgHoldTime = positionsInRange.length > 0 ?
      positionsInRange.reduce((sum, p) => sum + p.holdTimeMinutes, 0) / positionsInRange.length : 0;

    return {
      holdTimeRange: range.label,
      avgHoldTimeMinutes: avgHoldTime,
      tradeCount: positionsInRange.length,
      avgPnL,
      winRate,
      totalPnL
    };
  });

  return holdTimeAnalysis.filter(hta => hta.tradeCount > 0);
}

// Calculate entry/exit timing analysis
export function calculateEntryExitTimingAnalysis(trades: Trade[]): EntryExitTimingAnalysis[] {
  const positions = calculatePositions(trades);
  const closedPositions = positions.filter(p => p.status === 'closed');

  if (closedPositions.length === 0) {
    return [];
  }

  // Initialize hourly data
  const hourlyData = new Map<number, EntryExitTimingAnalysis>();
  for (let hour = 9; hour <= 15; hour++) { // Market hours 9 AM to 3 PM
    hourlyData.set(hour, {
      hour,
      timeLabel: `${hour}:00`,
      entryTrades: 0,
      exitTrades: 0,
      entryAvgPnL: 0,
      exitAvgPnL: 0,
      entryWinRate: 0,
      exitWinRate: 0
    });
  }

  // Track entry and exit performance by hour
  const entryPnLByHour = new Map<number, number[]>();
  const exitPnLByHour = new Map<number, number[]>();

  closedPositions.forEach(position => {
    // Entry analysis (first buy trade)
    const entryTrades = position.trades.filter(t => t.tradeType === 'buy');
    if (entryTrades.length > 0) {
      const firstEntry = entryTrades.reduce((earliest, trade) =>
        trade.orderExecutionTime < earliest.orderExecutionTime ? trade : earliest
      );
      const entryHour = firstEntry.orderExecutionTime.getHours();

      if (hourlyData.has(entryHour)) {
        const hourData = hourlyData.get(entryHour)!;
        hourData.entryTrades++;

        if (!entryPnLByHour.has(entryHour)) {
          entryPnLByHour.set(entryHour, []);
        }
        entryPnLByHour.get(entryHour)!.push(position.realizedPnL);
      }
    }

    // Exit analysis (last sell trade)
    const exitTrades = position.trades.filter(t => t.tradeType === 'sell');
    if (exitTrades.length > 0) {
      const lastExit = exitTrades.reduce((latest, trade) =>
        trade.orderExecutionTime > latest.orderExecutionTime ? trade : latest
      );
      const exitHour = lastExit.orderExecutionTime.getHours();

      if (hourlyData.has(exitHour)) {
        const hourData = hourlyData.get(exitHour)!;
        hourData.exitTrades++;

        if (!exitPnLByHour.has(exitHour)) {
          exitPnLByHour.set(exitHour, []);
        }
        exitPnLByHour.get(exitHour)!.push(position.realizedPnL);
      }
    }
  });

  // Calculate averages and win rates
  hourlyData.forEach((hourData, hour) => {
    const entryPnLs = entryPnLByHour.get(hour) || [];
    const exitPnLs = exitPnLByHour.get(hour) || [];

    hourData.entryAvgPnL = entryPnLs.length > 0 ? entryPnLs.reduce((sum, pnl) => sum + pnl, 0) / entryPnLs.length : 0;
    hourData.exitAvgPnL = exitPnLs.length > 0 ? exitPnLs.reduce((sum, pnl) => sum + pnl, 0) / exitPnLs.length : 0;

    hourData.entryWinRate = entryPnLs.length > 0 ? (entryPnLs.filter(pnl => pnl > 0).length / entryPnLs.length) * 100 : 0;
    hourData.exitWinRate = exitPnLs.length > 0 ? (exitPnLs.filter(pnl => pnl > 0).length / exitPnLs.length) * 100 : 0;
  });

  return Array.from(hourlyData.values()).filter(data => data.entryTrades > 0 || data.exitTrades > 0);
}

// Calculate instrument type analysis
export function calculateInstrumentTypeAnalysis(trades: Trade[]): InstrumentTypeAnalysis[] {
  const positions = calculatePositions(trades);
  const closedPositions = positions.filter(p => p.status === 'closed');

  if (closedPositions.length === 0) {
    return [];
  }

  const instrumentMap = new Map<string, InstrumentTypeAnalysis>();

  closedPositions.forEach(position => {
    const instrumentType = position.instrumentType;
    const key = instrumentType;

    if (!instrumentMap.has(key)) {
      const instrumentName = instrumentType === 'CE' ? 'Call Options' :
                           instrumentType === 'PE' ? 'Put Options' : 'Futures';

      instrumentMap.set(key, {
        instrumentType,
        instrumentName,
        totalTrades: 0,
        totalPnL: 0,
        avgPnL: 0,
        winRate: 0,
        winningTrades: 0,
        losingTrades: 0,
        avgHoldTimeMinutes: 0,
        totalVolume: 0
      });
    }

    const instrumentData = instrumentMap.get(key)!;
    instrumentData.totalTrades++;
    instrumentData.totalPnL += position.realizedPnL;
    instrumentData.totalVolume += position.trades.reduce((sum, t) => sum + t.quantity, 0);

    if (position.realizedPnL > 0) {
      instrumentData.winningTrades++;
    } else {
      instrumentData.losingTrades++;
    }

    // Calculate hold time
    const entryTimes = position.trades.filter(t => t.tradeType === 'buy').map(t => t.orderExecutionTime);
    const exitTimes = position.trades.filter(t => t.tradeType === 'sell').map(t => t.orderExecutionTime);

    if (entryTimes.length > 0 && exitTimes.length > 0) {
      const firstEntry = new Date(Math.min(...entryTimes.map(t => t.getTime())));
      const lastExit = new Date(Math.max(...exitTimes.map(t => t.getTime())));
      const holdTimeMinutes = (lastExit.getTime() - firstEntry.getTime()) / (1000 * 60);
      instrumentData.avgHoldTimeMinutes += holdTimeMinutes;
    }
  });

  // Calculate averages
  instrumentMap.forEach(instrumentData => {
    instrumentData.avgPnL = instrumentData.totalTrades > 0 ? instrumentData.totalPnL / instrumentData.totalTrades : 0;
    instrumentData.winRate = instrumentData.totalTrades > 0 ? (instrumentData.winningTrades / instrumentData.totalTrades) * 100 : 0;
    instrumentData.avgHoldTimeMinutes = instrumentData.totalTrades > 0 ? instrumentData.avgHoldTimeMinutes / instrumentData.totalTrades : 0;
  });

  return Array.from(instrumentMap.values()).sort((a, b) => b.totalPnL - a.totalPnL);
}

// Psychological Trading Patterns interfaces
export interface RevengeTradingAnalysis {
  totalRevengeTrades: number;
  revengeTradePercentage: number;
  avgRevengeTradePnL: number;
  revengeTradeWinRate: number;
  avgNormalTradePnL: number;
  normalTradeWinRate: number;
  revengeTradesByDay: { date: string; revengeTrades: number; normalTrades: number }[];
}

export interface OvertradingAnalysis {
  dailyTradeStats: {
    date: string;
    tradeCount: number;
    avgPnL: number;
    winRate: number;
    isOvertrading: boolean;
  }[];
  overtradingThreshold: number;
  overtradingDays: number;
  normalTradingDays: number;
  overtradingAvgPnL: number;
  normalTradingAvgPnL: number;
  overtradingWinRate: number;
  normalTradingWinRate: number;
}

export interface BehavioralPatterns {
  profitTakingSpeed: {
    avgWinHoldTime: number;
    avgLossHoldTime: number;
    ratio: number; // < 1 means taking profits too quickly
    pattern: 'Quick Profits, Slow Losses' | 'Balanced' | 'Slow Profits, Quick Losses';
  };
  weekendGapEffect: {
    mondayPerformance: number;
    fridayPerformance: number;
    weekendGapImpact: number;
  };
  emotionalTradingIndicators: {
    largePositionAfterLoss: number; // Count of trades with >150% avg size after losses
    rapidFireTrades: number; // Trades within 15 minutes of each other
    lateNightTrades: number; // Trades after 3 PM
  };
}

// Calculate revenge trading analysis
export function calculateRevengeTradingAnalysis(trades: Trade[]): RevengeTradingAnalysis {
  const positions = calculatePositions(trades);
  const closedPositions = positions.filter(p => p.status === 'closed')
    .sort((a, b) => {
      const aLastTrade = a.trades.reduce((latest, trade) =>
        trade.tradeDate > latest ? trade.tradeDate : latest, a.trades[0].tradeDate);
      const bLastTrade = b.trades.reduce((latest, trade) =>
        trade.tradeDate > latest ? trade.tradeDate : latest, b.trades[0].tradeDate);
      return aLastTrade.getTime() - bLastTrade.getTime();
    });

  if (closedPositions.length < 2) {
    return {
      totalRevengeTrades: 0,
      revengeTradePercentage: 0,
      avgRevengeTradePnL: 0,
      revengeTradeWinRate: 0,
      avgNormalTradePnL: 0,
      normalTradeWinRate: 0,
      revengeTradesByDay: []
    };
  }

  // Identify revenge trades (trades made within 2 hours after a loss)
  const revengeTrades: typeof closedPositions = [];
  const normalTrades: typeof closedPositions = [];
  const dailyRevengeMap = new Map<string, { revengeTrades: number; normalTrades: number }>();

  for (let i = 1; i < closedPositions.length; i++) {
    const currentPosition = closedPositions[i];
    const previousPosition = closedPositions[i - 1];

    const currentStartTime = currentPosition.trades.reduce((earliest, trade) =>
      trade.orderExecutionTime < earliest ? trade.orderExecutionTime : earliest,
      currentPosition.trades[0].orderExecutionTime
    );

    const previousEndTime = previousPosition.trades.reduce((latest, trade) =>
      trade.orderExecutionTime > latest ? trade.orderExecutionTime : latest,
      previousPosition.trades[0].orderExecutionTime
    );

    const timeDiffHours = (currentStartTime.getTime() - previousEndTime.getTime()) / (1000 * 60 * 60);
    const isRevengeTrade = previousPosition.realizedPnL < 0 && timeDiffHours <= 2 && timeDiffHours >= 0;

    const dateKey = format(startOfDay(currentStartTime), 'yyyy-MM-dd');
    if (!dailyRevengeMap.has(dateKey)) {
      dailyRevengeMap.set(dateKey, { revengeTrades: 0, normalTrades: 0 });
    }

    if (isRevengeTrade) {
      revengeTrades.push(currentPosition);
      dailyRevengeMap.get(dateKey)!.revengeTrades++;
    } else {
      normalTrades.push(currentPosition);
      dailyRevengeMap.get(dateKey)!.normalTrades++;
    }
  }

  // Add first trade as normal trade
  if (closedPositions.length > 0) {
    normalTrades.push(closedPositions[0]);
    const firstTradeDate = format(startOfDay(closedPositions[0].trades[0].tradeDate), 'yyyy-MM-dd');
    if (!dailyRevengeMap.has(firstTradeDate)) {
      dailyRevengeMap.set(firstTradeDate, { revengeTrades: 0, normalTrades: 0 });
    }
    dailyRevengeMap.get(firstTradeDate)!.normalTrades++;
  }

  // Calculate statistics
  const totalRevengeTrades = revengeTrades.length;
  const revengeTradePercentage = closedPositions.length > 0 ? (totalRevengeTrades / closedPositions.length) * 100 : 0;

  const avgRevengeTradePnL = revengeTrades.length > 0 ?
    revengeTrades.reduce((sum, p) => sum + p.realizedPnL, 0) / revengeTrades.length : 0;
  const revengeTradeWinRate = revengeTrades.length > 0 ?
    (revengeTrades.filter(p => p.realizedPnL > 0).length / revengeTrades.length) * 100 : 0;

  const avgNormalTradePnL = normalTrades.length > 0 ?
    normalTrades.reduce((sum, p) => sum + p.realizedPnL, 0) / normalTrades.length : 0;
  const normalTradeWinRate = normalTrades.length > 0 ?
    (normalTrades.filter(p => p.realizedPnL > 0).length / normalTrades.length) * 100 : 0;

  const revengeTradesByDay = Array.from(dailyRevengeMap.entries()).map(([date, data]) => ({
    date,
    revengeTrades: data.revengeTrades,
    normalTrades: data.normalTrades
  })).sort((a, b) => a.date.localeCompare(b.date));

  return {
    totalRevengeTrades,
    revengeTradePercentage,
    avgRevengeTradePnL,
    revengeTradeWinRate,
    avgNormalTradePnL,
    normalTradeWinRate,
    revengeTradesByDay
  };
}

// Calculate overtrading analysis
export function calculateOvertradingAnalysis(trades: Trade[]): OvertradingAnalysis {
  const dailyPnL = calculateDailyPnL(trades);

  if (dailyPnL.length === 0) {
    return {
      dailyTradeStats: [],
      overtradingThreshold: 0,
      overtradingDays: 0,
      normalTradingDays: 0,
      overtradingAvgPnL: 0,
      normalTradingAvgPnL: 0,
      overtradingWinRate: 0,
      normalTradingWinRate: 0
    };
  }

  // Calculate overtrading threshold (mean + 1 standard deviation of daily trade counts)
  const dailyTradeCounts = dailyPnL.map(day => day.totalOrders);
  const avgDailyTrades = dailyTradeCounts.reduce((sum, count) => sum + count, 0) / dailyTradeCounts.length;
  const variance = dailyTradeCounts.reduce((sum, count) => sum + Math.pow(count - avgDailyTrades, 2), 0) / dailyTradeCounts.length;
  const stdDev = Math.sqrt(variance);
  const overtradingThreshold = Math.ceil(avgDailyTrades + stdDev);

  // Classify each day
  const dailyTradeStats = dailyPnL.map(day => ({
    date: format(day.date, 'yyyy-MM-dd'),
    tradeCount: day.totalOrders,
    avgPnL: day.totalOrders > 0 ? day.netPnL / day.totalOrders : 0,
    winRate: day.orderWinRate,
    isOvertrading: day.totalOrders > overtradingThreshold
  }));

  const overtradingDays = dailyTradeStats.filter(day => day.isOvertrading);
  const normalTradingDays = dailyTradeStats.filter(day => !day.isOvertrading);

  const overtradingAvgPnL = overtradingDays.length > 0 ?
    overtradingDays.reduce((sum, day) => sum + day.avgPnL, 0) / overtradingDays.length : 0;
  const normalTradingAvgPnL = normalTradingDays.length > 0 ?
    normalTradingDays.reduce((sum, day) => sum + day.avgPnL, 0) / normalTradingDays.length : 0;

  const overtradingWinRate = overtradingDays.length > 0 ?
    overtradingDays.reduce((sum, day) => sum + day.winRate, 0) / overtradingDays.length : 0;
  const normalTradingWinRate = normalTradingDays.length > 0 ?
    normalTradingDays.reduce((sum, day) => sum + day.winRate, 0) / normalTradingDays.length : 0;

  return {
    dailyTradeStats,
    overtradingThreshold,
    overtradingDays: overtradingDays.length,
    normalTradingDays: normalTradingDays.length,
    overtradingAvgPnL,
    normalTradingAvgPnL,
    overtradingWinRate,
    normalTradingWinRate
  };
}

// Calculate behavioral patterns
export function calculateBehavioralPatterns(trades: Trade[]): BehavioralPatterns {
  const positions = calculatePositions(trades);
  const closedPositions = positions.filter(p => p.status === 'closed');

  if (closedPositions.length === 0) {
    return {
      profitTakingSpeed: {
        avgWinHoldTime: 0,
        avgLossHoldTime: 0,
        ratio: 1,
        pattern: 'Balanced'
      },
      weekendGapEffect: {
        mondayPerformance: 0,
        fridayPerformance: 0,
        weekendGapImpact: 0
      },
      emotionalTradingIndicators: {
        largePositionAfterLoss: 0,
        rapidFireTrades: 0,
        lateNightTrades: 0
      }
    };
  }

  // Calculate profit taking speed
  const winningPositions = closedPositions.filter(p => p.realizedPnL > 0);
  const losingPositions = closedPositions.filter(p => p.realizedPnL < 0);

  const calculateHoldTime = (position: Position): number => {
    const entryTimes = position.trades.filter(t => t.tradeType === 'buy').map(t => t.orderExecutionTime);
    const exitTimes = position.trades.filter(t => t.tradeType === 'sell').map(t => t.orderExecutionTime);

    if (entryTimes.length === 0 || exitTimes.length === 0) return 0;

    const firstEntry = new Date(Math.min(...entryTimes.map(t => t.getTime())));
    const lastExit = new Date(Math.max(...exitTimes.map(t => t.getTime())));
    return (lastExit.getTime() - firstEntry.getTime()) / (1000 * 60); // minutes
  };

  const avgWinHoldTime = winningPositions.length > 0 ?
    winningPositions.reduce((sum, p) => sum + calculateHoldTime(p), 0) / winningPositions.length : 0;
  const avgLossHoldTime = losingPositions.length > 0 ?
    losingPositions.reduce((sum, p) => sum + calculateHoldTime(p), 0) / losingPositions.length : 0;

  const ratio = avgLossHoldTime > 0 ? avgWinHoldTime / avgLossHoldTime : 1;
  const pattern = ratio < 0.7 ? 'Quick Profits, Slow Losses' :
                  ratio > 1.3 ? 'Slow Profits, Quick Losses' : 'Balanced';

  // Weekend gap effect
  const mondayTrades = closedPositions.filter(p => {
    const lastTradeDate = p.trades.reduce((latest, trade) =>
      trade.tradeDate > latest ? trade.tradeDate : latest, p.trades[0].tradeDate);
    return lastTradeDate.getDay() === 1; // Monday
  });

  const fridayTrades = closedPositions.filter(p => {
    const lastTradeDate = p.trades.reduce((latest, trade) =>
      trade.tradeDate > latest ? trade.tradeDate : latest, p.trades[0].tradeDate);
    return lastTradeDate.getDay() === 5; // Friday
  });

  const mondayPerformance = mondayTrades.length > 0 ?
    mondayTrades.reduce((sum, p) => sum + p.realizedPnL, 0) / mondayTrades.length : 0;
  const fridayPerformance = fridayTrades.length > 0 ?
    fridayTrades.reduce((sum, p) => sum + p.realizedPnL, 0) / fridayTrades.length : 0;
  const weekendGapImpact = mondayPerformance - fridayPerformance;

  // Emotional trading indicators
  const avgPositionSize = closedPositions.reduce((sum, p) =>
    sum + p.trades.reduce((tSum, t) => tSum + t.value, 0), 0) / closedPositions.length;

  let largePositionAfterLoss = 0;
  let rapidFireTrades = 0;
  let lateNightTrades = 0;

  // Sort positions by time
  const sortedPositions = [...closedPositions].sort((a, b) => {
    const aTime = a.trades[0].orderExecutionTime.getTime();
    const bTime = b.trades[0].orderExecutionTime.getTime();
    return aTime - bTime;
  });

  for (let i = 1; i < sortedPositions.length; i++) {
    const currentPosition = sortedPositions[i];
    const previousPosition = sortedPositions[i - 1];

    const currentPositionSize = currentPosition.trades.reduce((sum, t) => sum + t.value, 0);
    const currentStartTime = currentPosition.trades[0].orderExecutionTime;
    const previousEndTime = previousPosition.trades[previousPosition.trades.length - 1].orderExecutionTime;

    // Large position after loss
    if (previousPosition.realizedPnL < 0 && currentPositionSize > avgPositionSize * 1.5) {
      largePositionAfterLoss++;
    }

    // Rapid fire trades (within 15 minutes)
    const timeDiffMinutes = (currentStartTime.getTime() - previousEndTime.getTime()) / (1000 * 60);
    if (timeDiffMinutes <= 15 && timeDiffMinutes >= 0) {
      rapidFireTrades++;
    }
  }

  // Late night trades (after 3 PM)
  lateNightTrades = closedPositions.filter(p => {
    const startTime = p.trades[0].orderExecutionTime;
    return startTime.getHours() >= 15;
  }).length;

  return {
    profitTakingSpeed: {
      avgWinHoldTime,
      avgLossHoldTime,
      ratio,
      pattern
    },
    weekendGapEffect: {
      mondayPerformance,
      fridayPerformance,
      weekendGapImpact
    },
    emotionalTradingIndicators: {
      largePositionAfterLoss,
      rapidFireTrades,
      lateNightTrades
    }
  };
}

// Portfolio Analytics interfaces
export interface CorrelationMatrix {
  symbol1: string;
  symbol2: string;
  correlation: number;
  commonTradingDays: number;
  symbol1Returns: number[];
  symbol2Returns: number[];
}

export interface SectorExposure {
  sector: string;
  symbols: string[];
  totalTrades: number;
  totalPnL: number;
  avgPnL: number;
  winRate: number;
  exposurePercentage: number;
  avgPositionSize: number;
}

export interface CapitalUtilization {
  date: string;
  totalCapitalUsed: number;
  maxPossibleCapital: number;
  utilizationPercentage: number;
  numberOfPositions: number;
  avgPositionSize: number;
  efficiency: number; // PnL per unit of capital used
}

// Get sector from symbol (simplified mapping)
function getSectorFromSymbol(symbol: string): string {
  const sectorMap: { [key: string]: string } = {
    // Banking
    'HDFCBANK': 'Banking', 'ICICIBANK': 'Banking', 'SBIN': 'Banking', 'AXISBANK': 'Banking',
    'KOTAKBANK': 'Banking', 'INDUSINDBK': 'Banking', 'BANKBARODA': 'Banking',

    // IT
    'TCS': 'IT', 'INFY': 'IT', 'WIPRO': 'IT', 'HCLTECH': 'IT', 'TECHM': 'IT', 'LTI': 'IT',

    // Auto
    'MARUTI': 'Auto', 'TATAMOTORS': 'Auto', 'M&M': 'Auto', 'BAJAJ-AUTO': 'Auto', 'HEROMOTOCO': 'Auto',

    // Pharma
    'SUNPHARMA': 'Pharma', 'DRREDDY': 'Pharma', 'CIPLA': 'Pharma', 'DIVISLAB': 'Pharma',

    // FMCG
    'HINDUNILVR': 'FMCG', 'ITC': 'FMCG', 'NESTLEIND': 'FMCG', 'BRITANNIA': 'FMCG',

    // Metals
    'TATASTEEL': 'Metals', 'JSWSTEEL': 'Metals', 'HINDALCO': 'Metals', 'VEDL': 'Metals',

    // Energy
    'RELIANCE': 'Energy', 'ONGC': 'Energy', 'IOC': 'Energy', 'BPCL': 'Energy',

    // Indices
    'NIFTY': 'Index', 'BANKNIFTY': 'Index', 'FINNIFTY': 'Index'
  };

  // Extract base symbol (remove numbers and special characters)
  const baseSymbol = symbol.replace(/\d+/g, '').replace(/[^A-Z]/g, '');

  // Try exact match first
  if (sectorMap[symbol]) return sectorMap[symbol];
  if (sectorMap[baseSymbol]) return sectorMap[baseSymbol];

  // Check for partial matches
  for (const [key, sector] of Object.entries(sectorMap)) {
    if (symbol.includes(key) || key.includes(baseSymbol)) {
      return sector;
    }
  }

  return 'Others';
}

// Calculate correlation matrix between symbols
export function calculateCorrelationMatrix(trades: Trade[]): CorrelationMatrix[] {
  // Group trades by symbol and date
  const symbolDailyReturns = new Map<string, Map<string, number>>();

  trades.forEach(trade => {
    const symbol = trade.symbol;
    const dateKey = format(startOfDay(trade.tradeDate), 'yyyy-MM-dd');

    if (!symbolDailyReturns.has(symbol)) {
      symbolDailyReturns.set(symbol, new Map());
    }

    const symbolReturns = symbolDailyReturns.get(symbol)!;
    if (!symbolReturns.has(dateKey)) {
      symbolReturns.set(dateKey, 0);
    }

    // For simplicity, use trade value as proxy for returns
    // In a real scenario, you'd calculate actual returns
    symbolReturns.set(dateKey, symbolReturns.get(dateKey)! + trade.value * (trade.tradeType === 'sell' ? 1 : -1));
  });

  const symbols = Array.from(symbolDailyReturns.keys());
  const correlations: CorrelationMatrix[] = [];

  // Calculate correlation for each pair of symbols
  for (let i = 0; i < symbols.length; i++) {
    for (let j = i + 1; j < symbols.length; j++) {
      const symbol1 = symbols[i];
      const symbol2 = symbols[j];

      const symbol1Returns = symbolDailyReturns.get(symbol1)!;
      const symbol2Returns = symbolDailyReturns.get(symbol2)!;

      // Find common trading days
      const commonDates = Array.from(symbol1Returns.keys()).filter(date => symbol2Returns.has(date));

      if (commonDates.length < 5) continue; // Need at least 5 common days

      const returns1 = commonDates.map(date => symbol1Returns.get(date)!);
      const returns2 = commonDates.map(date => symbol2Returns.get(date)!);

      // Calculate correlation
      const mean1 = returns1.reduce((sum, r) => sum + r, 0) / returns1.length;
      const mean2 = returns2.reduce((sum, r) => sum + r, 0) / returns2.length;

      const numerator = returns1.reduce((sum, r1, idx) => sum + (r1 - mean1) * (returns2[idx] - mean2), 0);
      const denominator1 = Math.sqrt(returns1.reduce((sum, r1) => sum + Math.pow(r1 - mean1, 2), 0));
      const denominator2 = Math.sqrt(returns2.reduce((sum, r2) => sum + Math.pow(r2 - mean2, 2), 0));

      const correlation = denominator1 > 0 && denominator2 > 0 ? numerator / (denominator1 * denominator2) : 0;

      correlations.push({
        symbol1,
        symbol2,
        correlation,
        commonTradingDays: commonDates.length,
        symbol1Returns: returns1,
        symbol2Returns: returns2
      });
    }
  }

  return correlations.sort((a, b) => Math.abs(b.correlation) - Math.abs(a.correlation));
}

// Calculate sector exposure analysis
export function calculateSectorExposure(trades: Trade[]): SectorExposure[] {
  const positions = calculatePositions(trades);
  const closedPositions = positions.filter(p => p.status === 'closed');

  const sectorMap = new Map<string, SectorExposure>();
  let totalPortfolioValue = 0;

  closedPositions.forEach(position => {
    const sector = getSectorFromSymbol(position.symbol);
    const positionValue = position.trades.reduce((sum, t) => sum + t.value, 0);
    totalPortfolioValue += positionValue;

    if (!sectorMap.has(sector)) {
      sectorMap.set(sector, {
        sector,
        symbols: [],
        totalTrades: 0,
        totalPnL: 0,
        avgPnL: 0,
        winRate: 0,
        exposurePercentage: 0,
        avgPositionSize: 0
      });
    }

    const sectorData = sectorMap.get(sector)!;
    if (!sectorData.symbols.includes(position.symbol)) {
      sectorData.symbols.push(position.symbol);
    }

    sectorData.totalTrades++;
    sectorData.totalPnL += position.realizedPnL;
    sectorData.avgPositionSize += positionValue;
  });

  // Calculate percentages and averages
  sectorMap.forEach(sectorData => {
    sectorData.avgPnL = sectorData.totalTrades > 0 ? sectorData.totalPnL / sectorData.totalTrades : 0;
    sectorData.avgPositionSize = sectorData.totalTrades > 0 ? sectorData.avgPositionSize / sectorData.totalTrades : 0;
    sectorData.exposurePercentage = totalPortfolioValue > 0 ? (sectorData.avgPositionSize * sectorData.totalTrades / totalPortfolioValue) * 100 : 0;

    const sectorPositions = closedPositions.filter(p => getSectorFromSymbol(p.symbol) === sectorData.sector);
    const winningPositions = sectorPositions.filter(p => p.realizedPnL > 0);
    sectorData.winRate = sectorPositions.length > 0 ? (winningPositions.length / sectorPositions.length) * 100 : 0;
  });

  return Array.from(sectorMap.values()).sort((a, b) => b.exposurePercentage - a.exposurePercentage);
}

// Calculate capital utilization analysis
export function calculateCapitalUtilization(trades: Trade[]): CapitalUtilization[] {
  const dailyPnL = calculateDailyPnL(trades);

  // Group trades by date
  const dailyTrades = new Map<string, typeof trades>();

  trades.forEach(trade => {
    const dateKey = format(startOfDay(trade.tradeDate), 'yyyy-MM-dd');
    if (!dailyTrades.has(dateKey)) {
      dailyTrades.set(dateKey, []);
    }
    dailyTrades.get(dateKey)!.push(trade);
  });

  const utilizationData: CapitalUtilization[] = [];

  // Estimate maximum possible capital (could be configured)
  const estimatedMaxCapital = Math.max(...Array.from(dailyTrades.values()).map(dayTrades =>
    dayTrades.reduce((sum, trade) => sum + trade.value, 0)
  )) * 2; // Assume max capital is 2x of highest single day usage

  dailyTrades.forEach((dayTrades, dateKey) => {
    const totalCapitalUsed = dayTrades.reduce((sum, trade) => sum + trade.value, 0);
    const numberOfPositions = dayTrades.length;
    const avgPositionSize = numberOfPositions > 0 ? totalCapitalUsed / numberOfPositions : 0;
    const utilizationPercentage = estimatedMaxCapital > 0 ? (totalCapitalUsed / estimatedMaxCapital) * 100 : 0;

    // Find corresponding daily P&L
    const dayPnL = dailyPnL.find(day => format(day.date, 'yyyy-MM-dd') === dateKey);
    const efficiency = totalCapitalUsed > 0 && dayPnL ? dayPnL.netPnL / totalCapitalUsed : 0;

    utilizationData.push({
      date: dateKey,
      totalCapitalUsed,
      maxPossibleCapital: estimatedMaxCapital,
      utilizationPercentage,
      numberOfPositions,
      avgPositionSize,
      efficiency
    });
  });

  return utilizationData.sort((a, b) => a.date.localeCompare(b.date));
}

// Comparative Analytics interfaces
export interface BenchmarkComparison {
  date: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  cumulativePortfolioReturn: number;
  cumulativeBenchmarkReturn: number;
  outperformance: number;
  cumulativeOutperformance: number;
}

export interface RollingPerformance {
  date: string;
  period: number; // days
  rollingReturn: number;
  rollingVolatility: number;
  rollingSharpe: number;
  rollingMaxDrawdown: number;
  rollingWinRate: number;
}

export interface PerformanceRanking {
  period: string;
  portfolioReturn: number;
  benchmarkReturn: number;
  outperformance: number;
  percentileRank: number; // Where portfolio ranks vs historical performance
  isOutperforming: boolean;
}

// Calculate benchmark comparison (using a simple market return simulation)
export function calculateBenchmarkComparison(trades: Trade[]): BenchmarkComparison[] {
  const dailyPnL = calculateDailyPnL(trades);

  if (dailyPnL.length === 0) {
    return [];
  }

  // Simulate benchmark returns (Nifty-like performance)
  // In a real scenario, you'd fetch actual benchmark data
  const simulateBenchmarkReturn = (date: Date): number => {
    // Simple simulation: random walk with slight positive bias
    const seed = date.getTime() % 1000;
    const random = (seed / 1000) - 0.5; // -0.5 to 0.5
    return random * 0.02 + 0.0002; // Daily return between -1% to 1% with slight positive bias
  };

  let cumulativePortfolioReturn = 0;
  let cumulativeBenchmarkReturn = 0;
  let portfolioValue = 100000; // Starting value for percentage calculation

  const comparison: BenchmarkComparison[] = dailyPnL.map(day => {
    const portfolioReturn = portfolioValue > 0 ? (day.netPnL / portfolioValue) * 100 : 0;
    const benchmarkReturn = simulateBenchmarkReturn(day.date) * 100;

    cumulativePortfolioReturn += portfolioReturn;
    cumulativeBenchmarkReturn += benchmarkReturn;

    const outperformance = portfolioReturn - benchmarkReturn;
    const cumulativeOutperformance = cumulativePortfolioReturn - cumulativeBenchmarkReturn;

    // Update portfolio value for next calculation
    portfolioValue += day.netPnL;

    return {
      date: format(day.date, 'yyyy-MM-dd'),
      portfolioReturn,
      benchmarkReturn,
      cumulativePortfolioReturn,
      cumulativeBenchmarkReturn,
      outperformance,
      cumulativeOutperformance
    };
  });

  return comparison;
}

// Calculate rolling performance windows
export function calculateRollingPerformance(trades: Trade[], windowDays: number = 30): RollingPerformance[] {
  const dailyPnL = calculateDailyPnL(trades);

  if (dailyPnL.length < windowDays) {
    return [];
  }

  const rollingPerformance: RollingPerformance[] = [];

  for (let i = windowDays - 1; i < dailyPnL.length; i++) {
    const windowData = dailyPnL.slice(i - windowDays + 1, i + 1);
    const currentDate = windowData[windowData.length - 1].date;

    // Calculate rolling metrics
    const returns = windowData.map(day => day.netPnL);
    const totalReturn = returns.reduce((sum, ret) => sum + ret, 0);
    const avgReturn = totalReturn / windowDays;

    // Rolling volatility (standard deviation of returns)
    const variance = returns.reduce((sum, ret) => sum + Math.pow(ret - avgReturn, 2), 0) / windowDays;
    const volatility = Math.sqrt(variance);

    // Rolling Sharpe ratio (assuming risk-free rate of 0)
    const sharpe = volatility > 0 ? (avgReturn * Math.sqrt(252)) / (volatility * Math.sqrt(252)) : 0;

    // Rolling max drawdown
    let peak = returns[0];
    let maxDrawdown = 0;
    let cumulative = 0;

    returns.forEach(ret => {
      cumulative += ret;
      if (cumulative > peak) {
        peak = cumulative;
      }
      const drawdown = peak - cumulative;
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown;
      }
    });

    // Rolling win rate
    const winningDays = windowData.filter(day => day.netPnL > 0).length;
    const winRate = (winningDays / windowDays) * 100;

    rollingPerformance.push({
      date: format(currentDate, 'yyyy-MM-dd'),
      period: windowDays,
      rollingReturn: totalReturn,
      rollingVolatility: volatility,
      rollingSharpe: sharpe,
      rollingMaxDrawdown: maxDrawdown,
      rollingWinRate: winRate
    });
  }

  return rollingPerformance;
}

// Calculate performance rankings across different periods
export function calculatePerformanceRanking(trades: Trade[]): PerformanceRanking[] {
  const dailyPnL = calculateDailyPnL(trades);
  const benchmarkComparison = calculateBenchmarkComparison(trades);

  if (dailyPnL.length === 0) {
    return [];
  }

  const periods = [
    { name: '7D', days: 7 },
    { name: '30D', days: 30 },
    { name: '90D', days: 90 },
    { name: '1Y', days: 365 }
  ];

  const rankings: PerformanceRanking[] = [];

  periods.forEach(period => {
    if (dailyPnL.length >= period.days) {
      const recentData = dailyPnL.slice(-period.days);
      const recentBenchmark = benchmarkComparison.slice(-period.days);

      const portfolioReturn = recentData.reduce((sum, day) => sum + day.netPnL, 0);
      const benchmarkReturn = recentBenchmark.reduce((sum, day) => sum + day.benchmarkReturn, 0);
      const outperformance = portfolioReturn - benchmarkReturn;

      // Calculate percentile rank (simplified - in reality you'd compare against historical data)
      // For now, we'll use a simple heuristic based on outperformance
      let percentileRank = 50; // Default to median
      if (outperformance > 0) {
        percentileRank = Math.min(95, 50 + (outperformance / Math.abs(portfolioReturn)) * 45);
      } else if (outperformance < 0) {
        percentileRank = Math.max(5, 50 + (outperformance / Math.abs(portfolioReturn)) * 45);
      }

      rankings.push({
        period: period.name,
        portfolioReturn,
        benchmarkReturn,
        outperformance,
        percentileRank,
        isOutperforming: outperformance > 0
      });
    }
  });

  return rankings;
}

// Export the interfaces for use in components
export type { BrokerageCharges };
