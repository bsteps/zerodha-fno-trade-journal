import { Trade } from '../types/trade';

const DB_NAME = 'TradeJournalDB';
const DB_VERSION = 2;
const STORE_NAME = 'trades';
const AI_STORE_NAME = 'ai_responses';

interface DBSchema {
  trades: {
    key: string;
    value: Trade;
    indexes: {
      'by-date': Date;
      'by-symbol': string;
      'by-order-id': string;
    };
  };
}

class IndexedDBManager {
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create trades object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

          // Create indexes for efficient querying
          store.createIndex('by-date', 'tradeDate', { unique: false });
          store.createIndex('by-symbol', 'symbol', { unique: false });
          store.createIndex('by-order-id', 'orderId', { unique: false });
        }

        // Create AI responses object store if it doesn't exist
        if (!db.objectStoreNames.contains(AI_STORE_NAME)) {
          const aiStore = db.createObjectStore(AI_STORE_NAME, { keyPath: 'id' });

          // Create indexes for AI responses
          aiStore.createIndex('by-page-context', 'pageContext', { unique: false });
          aiStore.createIndex('by-timestamp', 'timestamp', { unique: false });
          aiStore.createIndex('by-data-hash', 'dataHash', { unique: false });
        }
      };
    });
  }

  async saveTrades(trades: Trade[]): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing data first
      const clearRequest = store.clear();
      
      clearRequest.onsuccess = () => {
        // Add all trades
        let completed = 0;
        const total = trades.length;

        if (total === 0) {
          resolve();
          return;
        }

        trades.forEach(trade => {
          const addRequest = store.add(trade);
          
          addRequest.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
          
          addRequest.onerror = () => {
            reject(new Error(`Failed to save trade: ${trade.id}`));
          };
        });
      };

      clearRequest.onerror = () => {
        reject(new Error('Failed to clear existing trades'));
      };

      transaction.onerror = () => {
        reject(new Error('Transaction failed'));
      };
    });
  }

  async loadTrades(): Promise<Trade[]> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const trades = request.result.map(trade => ({
          ...trade,
          // Ensure dates are Date objects
          tradeDate: new Date(trade.tradeDate),
          orderExecutionTime: new Date(trade.orderExecutionTime),
          expiryDate: new Date(trade.expiryDate),
        }));
        resolve(trades);
      };

      request.onerror = () => {
        reject(new Error('Failed to load trades'));
      };
    });
  }

  async clearAllTrades(): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME, AI_STORE_NAME], 'readwrite');

      // Clear trades
      const tradesStore = transaction.objectStore(STORE_NAME);
      const tradesRequest = tradesStore.clear();

      // Clear AI responses when clearing trades
      const aiStore = transaction.objectStore(AI_STORE_NAME);
      const aiRequest = aiStore.clear();

      let completedRequests = 0;
      const totalRequests = 2;

      const checkCompletion = () => {
        completedRequests++;
        if (completedRequests === totalRequests) {
          resolve();
        }
      };

      tradesRequest.onsuccess = checkCompletion;
      aiRequest.onsuccess = checkCompletion;

      tradesRequest.onerror = () => {
        reject(new Error('Failed to clear trades'));
      };

      aiRequest.onerror = () => {
        reject(new Error('Failed to clear AI responses'));
      };
    });
  }

  async getTradeCount(): Promise<number> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.count();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error('Failed to get trade count'));
      };
    });
  }

  async getStorageSize(): Promise<number> {
    // Estimate storage size by getting all trades and calculating their JSON size
    try {
      const trades = await this.loadTrades();
      const jsonString = JSON.stringify(trades);
      return new Blob([jsonString]).size;
    } catch (error) {
      console.error('Failed to calculate storage size:', error);
      return 0;
    }
  }

  // AI Response methods
  async saveAIResponse(pageContext: string, content: string, dataHash: string): Promise<void> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const aiResponse = {
        id: `${pageContext}_${Date.now()}`,
        pageContext,
        content,
        dataHash,
        timestamp: Date.now()
      };

      const transaction = this.db.transaction([AI_STORE_NAME], 'readwrite');
      const store = transaction.objectStore(AI_STORE_NAME);

      // First, delete any existing response for this page context
      const index = store.index('by-page-context');
      const deleteRequest = index.openCursor(IDBKeyRange.only(pageContext));

      deleteRequest.onsuccess = (event) => {
        const cursor = (event.target as IDBRequest).result;
        if (cursor) {
          cursor.delete();
          cursor.continue();
        } else {
          // Now add the new response
          const addRequest = store.add(aiResponse);

          addRequest.onsuccess = () => {
            resolve();
          };

          addRequest.onerror = () => {
            reject(new Error('Failed to save AI response'));
          };
        }
      };

      deleteRequest.onerror = () => {
        reject(new Error('Failed to clear existing AI response'));
      };
    });
  }

  async getAIResponse(pageContext: string, dataHash: string): Promise<any | null> {
    if (!this.db) {
      await this.init();
    }

    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('Database not initialized'));
        return;
      }

      const transaction = this.db.transaction([AI_STORE_NAME], 'readonly');
      const store = transaction.objectStore(AI_STORE_NAME);
      const index = store.index('by-page-context');
      const request = index.get(pageContext);

      request.onsuccess = () => {
        const result = request.result;
        if (result && result.dataHash === dataHash) {
          resolve(result);
        } else {
          resolve(null);
        }
      };

      request.onerror = () => {
        reject(new Error('Failed to get AI response'));
      };
    });
  }
}

// Create singleton instance
export const dbManager = new IndexedDBManager();

// Helper functions for easier usage
export const saveTradesToDB = (trades: Trade[]) => dbManager.saveTrades(trades);
export const loadTradesFromDB = () => dbManager.loadTrades();
export const clearTradesFromDB = () => dbManager.clearAllTrades();
export const getTradeCountFromDB = () => dbManager.getTradeCount();
export const getStorageSizeFromDB = () => dbManager.getStorageSize();
