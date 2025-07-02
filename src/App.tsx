import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, FileText, Upload, Settings, Calculator, AlertTriangle, Award, Clock, Target, Brain, PieChart, Activity, ChevronDown, Menu, X } from 'lucide-react';
import { Trade } from './types/trade';
import { TradeImport } from './components/TradeImport';
import { TradeTable } from './components/TradeTable';
import { PositionTracker } from './components/PositionTracker';
import { PnLDashboard } from './components/PnLDashboard';
import { PerformanceCharts } from './components/PerformanceCharts';
import { BrokerageBreakdown } from './components/BrokerageBreakdown';
import { RiskManagementCharts } from './components/RiskManagementCharts';
import { AdvancedPerformanceCharts } from './components/AdvancedPerformanceCharts';
import { MarketTimingCharts } from './components/MarketTimingCharts';
import { StrategyAnalysisCharts } from './components/StrategyAnalysisCharts';
import { PsychologicalPatternsCharts } from './components/PsychologicalPatternsCharts';
import { PortfolioAnalyticsCharts } from './components/PortfolioAnalyticsCharts';
import { ComparativeAnalyticsCharts } from './components/ComparativeAnalyticsCharts';
import { mergeTradesByOrderId } from './utils/calculations';

type TabType = 'dashboard' | 'positions' | 'trades' | 'charts' | 'risk' | 'advanced' | 'timing' | 'strategy' | 'psychology' | 'portfolio' | 'comparative' | 'brokerage';

function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showImport, setShowImport] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load trades from localStorage on component mount
  useEffect(() => {
    const savedTrades = localStorage.getItem('tradeJournalData');
    if (savedTrades) {
      try {
        const parsedTrades = JSON.parse(savedTrades);
        // Convert date strings back to Date objects
        const tradesWithDates = mergeTradesByOrderId(parsedTrades.map((trade: any) => ({
          ...trade,
          tradeDate: new Date(trade.tradeDate),
          orderExecutionTime: new Date(trade.orderExecutionTime),
          expiryDate: new Date(trade.expiryDate),
        })));
        console.log(tradesWithDates);
        
        setTrades(tradesWithDates);
      } catch (error) {
        console.error('Failed to load trades from localStorage:', error);
      }
    }
  }, []);

  // Save trades to localStorage whenever trades change
  useEffect(() => {
    if (trades.length > 0) {
      localStorage.setItem('tradeJournalData', JSON.stringify(trades));
    }
  }, [trades]);

  const handleTradesImported = (newTrades: Trade[]) => {
    setTrades(prevTrades => {
      // Merge new trades with existing ones, avoiding duplicates
      const existingTradeIds = new Set(prevTrades.map(t => t.id));
      const uniqueNewTrades = newTrades.filter(t => !existingTradeIds.has(t.id));
      return [...prevTrades, ...uniqueNewTrades].sort((a, b) =>
        b.tradeDate.getTime() - a.tradeDate.getTime()
      );
    });
    setShowImport(false);
  };

  const clearAllData = () => {
    if (window.confirm('Are you sure you want to clear all trade data? This action cannot be undone.')) {
      setTrades([]);
      localStorage.removeItem('tradeJournalData');
    }
  };

  // Organize tabs into groups for better navigation
  const tabGroups = [
    {
      name: 'Overview',
      tabs: [
        { id: 'dashboard' as TabType, name: 'Dashboard', icon: BarChart3 },
        { id: 'positions' as TabType, name: 'Positions', icon: TrendingUp },
        { id: 'trades' as TabType, name: 'Orders', icon: FileText },
      ]
    },
    {
      name: 'Analytics',
      tabs: [
        { id: 'charts' as TabType, name: 'Performance', icon: BarChart3 },
        { id: 'risk' as TabType, name: 'Risk', icon: AlertTriangle },
        { id: 'advanced' as TabType, name: 'Advanced', icon: Award },
      ]
    },
    {
      name: 'Strategy',
      tabs: [
        { id: 'timing' as TabType, name: 'Timing', icon: Clock },
        { id: 'strategy' as TabType, name: 'Strategy', icon: Target },
        { id: 'psychology' as TabType, name: 'Psychology', icon: Brain },
      ]
    },
    {
      name: 'Portfolio',
      tabs: [
        { id: 'portfolio' as TabType, name: 'Portfolio', icon: PieChart },
        { id: 'comparative' as TabType, name: 'Comparative', icon: Activity },
        { id: 'brokerage' as TabType, name: 'Brokerage', icon: Calculator },
      ]
    }
  ];

  // Flatten tabs for easy lookup
  const allTabs = tabGroups.flatMap(group => group.tabs);
  const currentTab = allTabs.find(tab => tab.id === activeTab);

  const handleTabChange = (tabId: TabType) => {
    setActiveTab(tabId);
    setIsMobileMenuOpen(false);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobileMenuOpen && !(event.target as Element).closest('nav')) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobileMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <TrendingUp className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-900">FNO Trade Journal</h1>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <span className="hidden sm:inline text-sm text-gray-600">
                {trades.length} executions loaded
              </span>
              <button
                onClick={() => setShowImport(true)}
                className="btn-primary flex items-center text-sm"
              >
                <Upload className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Import CSV</span>
                <span className="sm:hidden">Import</span>
              </button>
              {trades.length > 0 && (
                <button
                  onClick={clearAllData}
                  className="btn-secondary flex items-center text-sm"
                >
                  <Settings className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Clear Data</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="flex space-x-4 overflow-x-auto scrollbar-hide">
              {tabGroups.map((group) => (
                <div key={group.name} className="flex space-x-1 flex-shrink-0">
                  {group.tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`flex items-center px-2 lg:px-3 py-4 text-xs lg:text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                          activeTab === tab.id
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-4 h-4 mr-1 lg:mr-2" />
                        <span className="hidden lg:inline">{tab.name}</span>
                        <span className="lg:hidden">{tab.name.split(' ')[0]}</span>
                      </button>
                    );
                  })}
                  {group !== tabGroups[tabGroups.length - 1] && (
                    <div className="border-l border-gray-200 mx-1 lg:mx-2" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <div className="flex items-center justify-between py-4">
              <div className="flex items-center">
                {currentTab && (
                  <>
                    <currentTab.icon className="w-5 h-5 mr-2 text-blue-600" />
                    <span className="text-lg font-medium text-gray-900">{currentTab.name}</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
              <div className="border-t border-gray-200 py-4 bg-white shadow-lg animate-in slide-in-from-top-2 duration-200">
                {tabGroups.map((group) => (
                  <div key={group.name} className="mb-4 last:mb-0">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-3">
                      {group.name}
                    </h3>
                    <div className="space-y-1 px-3">
                      {group.tabs.map((tab) => {
                        const Icon = tab.icon;
                        return (
                          <button
                            key={tab.id}
                            onClick={() => handleTabChange(tab.id)}
                            className={`w-full flex items-center px-3 py-3 text-sm font-medium rounded-lg transition-all duration-150 ${
                              activeTab === tab.id
                                ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 border border-transparent'
                            }`}
                          >
                            <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                            <span className="text-left">{tab.name}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {trades.length === 0 ? (
          <div className="text-center py-12">
            <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No trade data found</h3>
            <p className="text-gray-600 mb-6">
              Import your CSV file to start analyzing your FNO trades
            </p>
            <button
              onClick={() => setShowImport(true)}
              className="btn-primary"
            >
              Import Trade Data
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'dashboard' && <PnLDashboard trades={trades} />}
            {activeTab === 'positions' && <PositionTracker trades={trades} />}
            {activeTab === 'trades' && <TradeTable trades={trades} />}
            {activeTab === 'charts' && <PerformanceCharts trades={trades} />}
            {activeTab === 'risk' && <RiskManagementCharts trades={trades} />}
            {activeTab === 'advanced' && <AdvancedPerformanceCharts trades={trades} />}
            {activeTab === 'timing' && <MarketTimingCharts trades={trades} />}
            {activeTab === 'strategy' && <StrategyAnalysisCharts trades={trades} />}
            {activeTab === 'psychology' && <PsychologicalPatternsCharts trades={trades} />}
            {activeTab === 'portfolio' && <PortfolioAnalyticsCharts trades={trades} />}
            {activeTab === 'comparative' && <ComparativeAnalyticsCharts trades={trades} />}
            {activeTab === 'brokerage' && <BrokerageBreakdown trades={trades} />}
          </>
        )}
      </main>

      {/* Import Modal */}
      {showImport && (
        <TradeImport
          onTradesImported={handleTradesImported}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

export default App;
