import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Key, Save, Eye, EyeOff, X, AlertTriangle } from 'lucide-react';

interface SettingsProps {
  onClose: () => void;
}

export function Settings({ onClose }: SettingsProps) {
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [maxLossPerTrade, setMaxLossPerTrade] = useState('');
  const [maxLossPerDay, setMaxLossPerDay] = useState('');
  const [maxTradesPerDay, setMaxTradesPerDay] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedApiKey = localStorage.getItem('gemini_api_key');
    if (savedApiKey) {
      setGeminiApiKey(savedApiKey);
    }

    const savedMaxLossPerTrade = localStorage.getItem('max_loss_per_trade');
    if (savedMaxLossPerTrade) {
      setMaxLossPerTrade(savedMaxLossPerTrade);
    }

    const savedMaxLossPerDay = localStorage.getItem('max_loss_per_day');
    if (savedMaxLossPerDay) {
      setMaxLossPerDay(savedMaxLossPerDay);
    }

    const savedMaxTradesPerDay = localStorage.getItem('max_trades_per_day');
    if (savedMaxTradesPerDay) {
      setMaxTradesPerDay(savedMaxTradesPerDay);
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage('');

    try {
      // Save API key
      if (geminiApiKey.trim()) {
        // Validate API key format (basic validation)
        if (!geminiApiKey.startsWith('AIza')) {
          throw new Error('Invalid API key format. Gemini API keys should start with "AIza"');
        }
        localStorage.setItem('gemini_api_key', geminiApiKey.trim());
      } else {
        localStorage.removeItem('gemini_api_key');
      }

      // Save max loss per trade
      if (maxLossPerTrade.trim()) {
        const value = parseFloat(maxLossPerTrade.trim());
        if (isNaN(value) || value <= 0) {
          throw new Error('Max Loss per Trade must be a positive number');
        }
        localStorage.setItem('max_loss_per_trade', maxLossPerTrade.trim());
      } else {
        localStorage.removeItem('max_loss_per_trade');
      }

      // Save max loss per day
      if (maxLossPerDay.trim()) {
        const value = parseFloat(maxLossPerDay.trim());
        if (isNaN(value) || value <= 0) {
          throw new Error('Max Loss per Day must be a positive number');
        }
        localStorage.setItem('max_loss_per_day', maxLossPerDay.trim());
      } else {
        localStorage.removeItem('max_loss_per_day');
      }

      // Save max trades per day
      if (maxTradesPerDay.trim()) {
        const value = parseInt(maxTradesPerDay.trim());
        if (isNaN(value) || value <= 0) {
          throw new Error('Max Trades per Day must be a positive integer');
        }
        localStorage.setItem('max_trades_per_day', maxTradesPerDay.trim());
      } else {
        localStorage.removeItem('max_trades_per_day');
      }

      setSaveMessage('Settings saved successfully!');
    } catch (error) {
      setSaveMessage(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center">
            <SettingsIcon className="w-6 h-6 text-blue-600 mr-3" />
            <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close settings"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* AI Configuration Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Key className="w-5 h-5 text-gray-600 mr-2" />
              AI Configuration
            </h3>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="gemini-api-key" className="block text-sm font-medium text-gray-700 mb-2">
                  Google Gemini API Key
                </label>
                <div className="relative">
                  <input
                    id="gemini-api-key"
                    type={showApiKey ? 'text' : 'password'}
                    value={geminiApiKey}
                    onChange={(e) => setGeminiApiKey(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Enter your Gemini API key (AIza...)"
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  Get your free API key from{' '}
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>

              {/* Save Message */}
              {saveMessage && (
                <div className={`p-3 rounded-md text-sm ${
                  saveMessage.includes('successfully') 
                    ? 'bg-green-50 text-green-800 border border-green-200' 
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}>
                  {saveMessage}
                </div>
              )}

              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSaving ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <Save className="w-4 h-4 mr-2" />
                )}
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>

          {/* Trading Risk Management Section */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
              Risk Management
            </h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="max-loss-per-trade" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Loss per Trade (₹)
                </label>
                <input
                  id="max-loss-per-trade"
                  type="number"
                  value={maxLossPerTrade}
                  onChange={(e) => setMaxLossPerTrade(e.target.value)}
                  placeholder="e.g., 5000 (leave empty to disable)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used for revenge trade detection. Leave empty to disable this check.
                </p>
              </div>

              <div>
                <label htmlFor="max-loss-per-day" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Loss per Day (₹)
                </label>
                <input
                  id="max-loss-per-day"
                  type="number"
                  value={maxLossPerDay}
                  onChange={(e) => setMaxLossPerDay(e.target.value)}
                  placeholder="e.g., 15000 (leave empty to disable)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used for revenge trade detection. Leave empty to disable this check.
                </p>
              </div>

              <div>
                <label htmlFor="max-trades-per-day" className="block text-sm font-medium text-gray-700 mb-2">
                  Max Trades per Day
                </label>
                <input
                  id="max-trades-per-day"
                  type="number"
                  value={maxTradesPerDay}
                  onChange={(e) => setMaxTradesPerDay(e.target.value)}
                  placeholder="e.g., 10 (leave empty for auto-calculation)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Used for overtrading detection. Leave empty to use statistical threshold (mean + 1 std dev).
                </p>
              </div>
            </div>
          </div>

          {/* AI Features Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">AI-Powered Features</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Personalized trading insights and recommendations</li>
              <li>• Performance analysis with actionable suggestions</li>
              <li>• Risk assessment and improvement strategies</li>
              <li>• Pattern recognition in your trading behavior</li>
            </ul>
          </div>

          {/* Privacy Notice */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-2">Privacy & Security</h4>
            <p className="text-sm text-gray-700">
              Your API key and risk management settings are stored locally in your browser and never sent to our servers.
              Trading data is processed by Google's Gemini AI to generate insights.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
