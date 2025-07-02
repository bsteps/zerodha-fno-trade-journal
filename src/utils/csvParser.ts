import Papa from 'papaparse';
import { RawTradeData, Trade } from '../types/trade';

export interface ParseResult {
  trades: Trade[];
  errors: string[];
  totalRows: number;
  validRows: number;
}

export function parseSymbol(symbol: string): {
  underlyingSymbol: string;
  instrumentType: 'CE' | 'PE' | 'FUT';
  strikePrice?: number;
  expiryDate?: string;
} {
  // Futures
  if (symbol.includes('FUT')) {
    return {
      underlyingSymbol: symbol.replace(/\d+[A-Z]+FUT$/, ''),
      instrumentType: 'FUT'
    };
  }

  // Options with numeric expiry date (e.g., NIFTY2560524750PE)
  const numericOptionMatch = symbol.match(/^([A-Z]+)(\d{5})(\d+)(CE|PE)$/);
  if (numericOptionMatch) {
    const [, underlying, dateStr, strike, type] = numericOptionMatch;
    return {
      underlyingSymbol: underlying,
      instrumentType: type as 'CE' | 'PE',
      strikePrice: parseInt(strike, 10),
      expiryDate: dateStr
    };
  }

  // Options with alphanumeric expiry date (e.g., BANKNIFTY25APR51200PE)
  const alphaOptionMatch = symbol.match(/^([A-Z]+)(\d{2}[A-Z]{3})(\d+)(CE|PE)$/);
  if (alphaOptionMatch) {
    const [, underlying, dateStr, strike, type] = alphaOptionMatch;
    return {
      underlyingSymbol: underlying,
      instrumentType: type as 'CE' | 'PE',
      strikePrice: parseInt(strike, 10),
      expiryDate: dateStr
    };
  }

  // Fallback for unknown CE/PE type
  const ceMatch = symbol.match(/(CE|PE)$/);
  if (ceMatch) {
    return {
      underlyingSymbol: symbol.replace(/\d+[CP]E$/, ''),
      instrumentType: ceMatch[1] as 'CE' | 'PE'
    };
  }

  return {
    underlyingSymbol: symbol,
    instrumentType: 'FUT'
  };
}


export function transformRawTrade(raw: RawTradeData, index: number): Trade {
  const symbolInfo = parseSymbol(raw.symbol);
  
  return {
    id: `${raw.trade_id}_${index}`,
    symbol: raw.symbol,
    isin: raw.isin,
    tradeDate: new Date(raw.trade_date),
    exchange: raw.exchange,
    segment: raw.segment,
    series: raw.series,
    tradeType: raw.trade_type,
    auction: raw.auction,
    quantity: raw.quantity,
    price: raw.price,
    tradeId: raw.trade_id,
    orderId: raw.order_id,
    orderExecutionTime: new Date(raw.order_execution_time),
    expiryDate: new Date(raw.expiry_date),
    value: raw.quantity * raw.price,
    instrumentType: symbolInfo.instrumentType,
    strikePrice: symbolInfo.strikePrice,
    underlyingSymbol: symbolInfo.underlyingSymbol,
    trades: [],
  };
}

export function validateTradeData(raw: any): raw is RawTradeData {
  return (
    typeof raw.symbol === 'string' &&
    typeof raw.trade_date === 'string' &&
    typeof raw.exchange === 'string' &&
    typeof raw.segment === 'string' &&
    (raw.trade_type === 'buy' || raw.trade_type === 'sell') &&
    typeof raw.quantity === 'number' &&
    typeof raw.price === 'number' &&
    typeof raw.trade_id === 'string' &&
    typeof raw.order_id === 'string' &&
    typeof raw.order_execution_time === 'string' &&
    typeof raw.expiry_date === 'string'
  );
}

export function parseCsvFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const errors: string[] = [];
    const trades: Trade[] = [];
    let totalRows = 0;
    let validRows = 0;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      transform: (value: string, field: string) => {
        // Convert string numbers to actual numbers
        if (['quantity', 'price'].includes(field)) {
          const num = parseFloat(value);
          return isNaN(num) ? value : num;
        }
        // Convert string booleans to actual booleans
        if (field === 'auction') {
          return value.toLowerCase() === 'true';
        }
        return value;
      },
      complete: (results) => {
        totalRows = results.data.length;
        
        results.data.forEach((row: any, index: number) => {
          try {
            if (validateTradeData(row)) {
              const trade = transformRawTrade(row, index);
              trades.push(trade);
              validRows++;
            } else {
              errors.push(`Row ${index + 2}: Invalid data format`);
            }
          } catch (error) {
            errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }
        });

        // Add parsing errors from Papa Parse
        if (results.errors.length > 0) {
          results.errors.forEach(error => {
            errors.push(`Parse error: ${error.message}`);
          });
        }

        resolve({
          trades,
          errors,
          totalRows,
          validRows
        });
      },
      error: (error) => {
        resolve({
          trades: [],
          errors: [`File parsing failed: ${error.message}`],
          totalRows: 0,
          validRows: 0
        });
      }
    });
  });
}
