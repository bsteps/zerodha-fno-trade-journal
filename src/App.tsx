import React, { useState, useEffect, useRef } from 'react';
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
import { Settings as SettingsModal } from './components/Settings';
import { ComparativeAnalyticsCharts } from './components/ComparativeAnalyticsCharts';
import { mergeTradesByOrderId } from './utils/calculations';
import { loadTradesFromDB, saveTradesToDB, clearTradesFromDB, getStorageSizeFromDB } from './utils/indexedDB';

type TabType = 'dashboard' | 'positions' | 'trades' | 'charts' | 'risk' | 'advanced' | 'timing' | 'strategy' | 'psychology' | 'portfolio' | 'comparative' | 'brokerage';

function App() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [showImport, setShowImport] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [storageSize, setStorageSize] = useState<number>(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load trades from IndexedDB on component mount
  useEffect(() => {
    const loadTrades = async () => {
      try {
        setIsLoading(true);

        // Load trades from IndexedDB
        const loadedTrades = await loadTradesFromDB();
        const mergedTrades = mergeTradesByOrderId(loadedTrades);

        console.log(`Loaded ${mergedTrades.length} trades from IndexedDB`);
        setTrades(mergedTrades);

        // Update storage size
        const size = await getStorageSizeFromDB();
        setStorageSize(size);

      } catch (error) {
        console.error('Failed to load trades from IndexedDB:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTrades();
  }, []);

  // Save trades to IndexedDB whenever trades change
  useEffect(() => {
    const saveTrades = async () => {
      if (trades.length > 0 && !isLoading) {
        try {
          await saveTradesToDB(trades);
          // Update storage size after saving
          const size = await getStorageSizeFromDB();
          setStorageSize(size);
          console.log(`Saved ${trades.length} trades to IndexedDB`);
        } catch (error) {
          console.error('Failed to save trades to IndexedDB:', error);
        }
      }
    };

    saveTrades();
  }, [trades, isLoading]);

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

  const clearAllData = async () => {
    if (window.confirm('Are you sure you want to clear all trade data? This action cannot be undone.')) {
      try {
        await clearTradesFromDB();
        setTrades([]);
        setStorageSize(0);
        console.log('Successfully cleared all trade data');
      } catch (error) {
        console.error('Failed to clear trades from IndexedDB:', error);
      }
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

  // Helper function to format storage size
  const formatStorageSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Handle hover with delay to prevent accidental triggers
  const handleMouseEnter = (groupName: string) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(groupName);
    }, 10); // 150ms delay
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setOpenDropdown(null);
    }, 20); // 300ms delay before closing
  };

  // Handle keyboard navigation
  const handleKeyDown = (event: React.KeyboardEvent, tabId: TabType) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleTabChange(tabId);
    }
  };

  // Handle escape key to close dropdowns
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenDropdown(null);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscapeKey);
    return () => {
      document.removeEventListener('keydown', handleEscapeKey);
    };
  }, []);

  // Cleanup hover timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;

      // Close mobile menu
      if (isMobileMenuOpen && !target.closest('nav')) {
        setIsMobileMenuOpen(false);
      }

      // For hover dropdowns, we don't need to close on click outside
      // as they close automatically on mouse leave
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
              <div className="hidden sm:flex flex-col items-end text-sm text-gray-600">
                <span>
                  {isLoading ? 'Loading...' : `${trades.length} executions loaded`}
                </span>
                {storageSize > 0 && (
                  <span className="text-xs text-gray-500">
                    {formatStorageSize(storageSize)} stored
                  </span>
                )}
              </div>
              <button
                onClick={() => setShowSettings(true)}
                className="btn-secondary flex items-center text-sm"
                title="Settings"
              >
                <Settings className="w-4 h-4 mr-1 sm:mr-2" />
                <span className="hidden lg:inline">Settings</span>
              </button>
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
                  <AlertTriangle className="w-4 h-4 mr-1 sm:mr-2" />
                  <span className="hidden sm:inline">Clear Data</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto">
          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="flex items-center space-x-1 px-4 sm:px-6 lg:px-8" ref={dropdownRef}>
              {tabGroups.map((group) => {
                const hasActiveTab = group.tabs.some(tab => tab.id === activeTab);
                const activeTabInGroup = group.tabs.find(tab => tab.id === activeTab);
                const isOpen = openDropdown === group.name;

                return (
                  <div
                    key={group.name}
                    className="relative"
                    onMouseEnter={() => handleMouseEnter(group.name)}
                    onMouseLeave={handleMouseLeave}
                  >
                    <button
                      onClick={() => setOpenDropdown(isOpen ? null : group.name)}
                      className={`nav-dropdown-trigger flex items-center px-4 py-4 text-sm font-medium border-b-2 transition-all duration-200 rounded-t-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                        hasActiveTab
                          ? 'border-blue-500 text-blue-600 bg-blue-50'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      aria-expanded={isOpen}
                      aria-haspopup="true"
                    >
                      {activeTabInGroup ? (
                        <>
                          <activeTabInGroup.icon className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="mr-2">{activeTabInGroup.name}</span>
                        </>
                      ) : (
                        <span className="mr-2">{group.name}</span>
                      )}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown Menu */}
                    {isOpen && (
                      <div
                        className="absolute top-full left-0 mt-1 w-56 bg-white rounded-lg dropdown-shadow border border-gray-200 py-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
                        onMouseEnter={() => {
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current);
                          }
                        }}
                        onMouseLeave={handleMouseLeave}
                      >
                        <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide border-b border-gray-100">
                          {group.name}
                        </div>
                        {group.tabs.map((tab) => {
                          const Icon = tab.icon;
                          return (
                            <button
                              key={tab.id}
                              onClick={() => {
                                handleTabChange(tab.id);
                                setOpenDropdown(null);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                  e.preventDefault();
                                  handleTabChange(tab.id);
                                  setOpenDropdown(null);
                                }
                              }}
                              className={`dropdown-item w-full flex items-center px-3 py-2 text-sm transition-colors hover:bg-gray-50 focus:outline-none focus:bg-gray-50 ${
                                activeTab === tab.id
                                  ? 'text-blue-600 bg-blue-50'
                                  : 'text-gray-700'
                              }`}
                              aria-current={activeTab === tab.id ? 'page' : undefined}
                            >
                              <Icon className="w-4 h-4 mr-3 flex-shrink-0" />
                              <span>{tab.name}</span>
                              {activeTab === tab.id && (
                                <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full" />
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tablet Navigation */}
          <div className="hidden sm:block md:hidden">
            <div className="overflow-x-auto pb-2 nav-scroll">
              <div className="flex space-x-2 min-w-max px-4">
                {tabGroups.map((group) => (
                  <div key={group.name} className="flex space-x-1 flex-shrink-0">
                    {group.tabs.map((tab) => {
                      const Icon = tab.icon;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => handleTabChange(tab.id)}
                          onKeyDown={(e) => handleKeyDown(e, tab.id)}
                          className={`flex flex-col items-center px-3 py-3 text-xs font-medium border-b-2 transition-all duration-200 whitespace-nowrap rounded-t-lg hover:bg-gray-50 min-w-[64px] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                            activeTab === tab.id
                              ? 'border-blue-500 text-blue-600 bg-blue-50'
                              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                          }`}
                          aria-current={activeTab === tab.id ? 'page' : undefined}
                        >
                          <Icon className="w-4 h-4 mb-1" />
                          <span className="text-center leading-tight">{tab.name.split(' ')[0]}</span>
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="sm:hidden">
            <div className="flex items-center justify-between py-3 px-4">
              <div className="flex items-center min-w-0 flex-1">
                {currentTab && (
                  <>
                    <currentTab.icon className="w-5 h-5 mr-2 text-blue-600 flex-shrink-0" />
                    <span className="text-lg font-medium text-gray-900 truncate">{currentTab.name}</span>
                  </>
                )}
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 rounded-lg text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
              <>
                <div
                  className="fixed inset-0 bg-black bg-opacity-25 z-40"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <div className="absolute left-0 right-0 top-full bg-white border-t border-gray-200 shadow-xl z-50 max-h-[70vh] overflow-y-auto">
                  <div className="py-4">
                    {tabGroups.map((group, groupIndex) => (
                      <div key={group.name} className={`${groupIndex > 0 ? 'border-t border-gray-100 pt-4' : ''} mb-4 last:mb-0`}>
                        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3 px-4">
                          {group.name}
                        </h3>
                        <div className="space-y-1 px-4">
                          {group.tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                              <button
                                key={tab.id}
                                onClick={() => handleTabChange(tab.id)}
                                onKeyDown={(e) => handleKeyDown(e, tab.id)}
                                className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                                  activeTab === tab.id
                                    ? 'bg-blue-50 text-blue-600 border border-blue-200 shadow-sm'
                                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50 active:bg-gray-100'
                                }`}
                                aria-current={activeTab === tab.id ? 'page' : undefined}
                              >
                                <Icon className="w-5 h-5 mr-3 flex-shrink-0" />
                                <span className="text-left font-medium">{tab.name}</span>
                                {activeTab === tab.id && (
                                  <div className="ml-auto w-2 h-2 bg-blue-600 rounded-full" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">Loading trade data...</h3>
            <p className="text-gray-600">
              Please wait while we load your trading data from storage
            </p>
          </div>
        ) : trades.length === 0 ? (
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

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}

export default App;
