import React, { useState, useEffect } from "react"
import { Brain, RefreshCw, AlertCircle, Sparkles, TrendingUp, TrendingDown, Target } from "lucide-react"
import ReactMarkdown from "react-markdown"
import { Trade } from "../types/trade"
import { InfoTooltip } from "./InfoTooltip"

interface AIRecommendationsProps {
  trades: Trade[]
  analysisData: any
  pageContext: "dashboard" | "performance" | "advanced-performance" | "risk-management" | "trading-patterns" | "market-timing" | "strategy-analysis" | "psychological-patterns" | "portfolio-analytics" | "brokerage"
  pageTitle?: string
  dataDescription?: string
}

interface AIResponse {
  content: string
  timestamp: number
  dataHash: string
}

export function AIRecommendations({ trades, analysisData, pageContext, pageTitle = "Trading Analysis", dataDescription = "trading performance data" }: AIRecommendationsProps) {
  const [aiResponse, setAiResponse] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string>("")
  const [hasApiKey, setHasApiKey] = useState(false)

  // Check for API key on component mount
  useEffect(() => {
    const apiKey = localStorage.getItem("gemini_api_key")
    setHasApiKey(!!apiKey)
  }, [])

  // Generate data hash for caching
  const generateDataHash = (data: any): string => {
    const dataString = JSON.stringify({
      tradesCount: trades.length,
      analysisData,
      pageContext,
      lastTradeDate: trades[0]?.tradeDate?.getTime() || 0,
    })

    // Simple hash function
    let hash = 0
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return hash.toString()
  }

  // Load cached AI response
  const loadCachedResponse = (dataHash: string): AIResponse | null => {
    try {
      const cached = localStorage.getItem(`ai_response_${pageContext}`)
      if (cached) {
        const response: AIResponse = JSON.parse(cached)
        if (response.dataHash === dataHash) {
          return response
        }
      }
    } catch (error) {
      console.error("Error loading cached AI response:", error)
    }
    return null
  }

  // Save AI response to cache
  const saveCachedResponse = (content: string, dataHash: string) => {
    try {
      const response: AIResponse = {
        content,
        timestamp: Date.now(),
        dataHash,
      }
      localStorage.setItem(`ai_response_${pageContext}`, JSON.stringify(response))
    } catch (error) {
      console.error("Error saving AI response:", error)
    }
  }

  // Generate AI recommendations
  const generateRecommendations = async (forceRegenerate = false) => {
    if (!hasApiKey) {
      setError("Please configure your Gemini API key in settings to get AI recommendations.")
      return
    }

    const dataHash = generateDataHash({ trades, analysisData, pageContext })

    // Check for cached response unless forcing regeneration
    if (!forceRegenerate) {
      const cached = loadCachedResponse(dataHash)
      if (cached) {
        setAiResponse(cached.content)
        return
      }
    }

    setIsLoading(true)
    setError("")

    try {
      const apiKey = localStorage.getItem("gemini_api_key")
      if (!apiKey) {
        throw new Error("API key not found")
      }

      // Prepare data for AI analysis
      const analysisContext = {
        pageContext,
        totalTrades: trades.length,
        dateRange:
          trades.length > 0
            ? {
                start: trades[trades.length - 1]?.tradeDate,
                end: trades[0]?.tradeDate,
              }
            : null,
        analysisData: JSON.stringify(analysisData, null, 2),
      }

      // Create prompt based on page context
      const prompt = createContextualPrompt(pageContext, analysisContext)

      // Call Gemini API
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.4,
          },
        }),
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const data = await response.json()
      const aiContent = data.candidates?.[0]?.content?.parts?.[0]?.text || "No recommendations generated."

      setAiResponse(aiContent)
      saveCachedResponse(aiContent, dataHash)
    } catch (error) {
      console.error("Error generating AI recommendations:", error)
      setError(error instanceof Error ? error.message : "Failed to generate recommendations")
    } finally {
      setIsLoading(false)
    }
  }

  // Create contextual prompt based on page
  const createContextualPrompt = (context: string, data: any): string => {
    // Get context-specific focus areas
    const contextPrompts = {
      dashboard: "overall trading performance and portfolio health",
      performance: "profit/loss patterns and trading efficiency",
      "advanced-performance": "risk-adjusted metrics and streak analysis",
      "risk-management": "position sizing and risk control strategies",
      "trading-patterns": "timing patterns and market behavior analysis",
      "market-timing": "entry/exit timing and market condition analysis",
      "strategy-analysis": "trading strategy effectiveness and optimization",
      "psychological-patterns": "emotional trading patterns and discipline",
      "portfolio-analytics": "portfolio diversification and allocation",
      brokerage: "cost analysis and fee optimization",
    }

    const focusArea = contextPrompts[context as keyof typeof contextPrompts] || "trading performance"

    const basePrompt = `You are an expert F&O trading coach. Analyze this ${dataDescription} focusing on ${focusArea}.

Trading Summary:
- Total Trades: ${data.totalTrades}
- Context: ${pageTitle}
- Analysis Data: ${JSON.stringify(data.analysisData)}

Provide detailed but concise analysis in this format:

## 🎯 Immediate Actions (Today)
- [Action 1 with specific numbers/percentages]
- [Action 2 with clear implementation steps]
- [Action 3 with measurable targets]

## ⚠️ Critical Issues Identified
- [Issue 1: Problem + Impact + Why it matters]
- [Issue 2: Problem + Impact + Why it matters]
- [Issue 3: Problem + Impact + Why it matters]

## 📈 Strategic Improvements (Next 1-2 Weeks)
- [Improvement 1: What to do + Expected outcome]
- [Improvement 2: What to do + Expected outcome]
- [Improvement 3: What to do + Expected outcome]

## 💡 Key Insights
- [Insight 1: Pattern/trend observed with significance]
- [Insight 2: Performance metric interpretation]

Focus on ${focusArea}. Be specific with numbers, percentages, and actionable steps. Each point should be 1-2 lines maximum.`

    return basePrompt
  }

  // Auto-generate on component mount
  useEffect(() => {
    if (hasApiKey && trades.length > 0) {
      generateRecommendations()
    }
  }, [hasApiKey, trades.length, pageContext])

  if (!hasApiKey) {
    return (
      <div className='card'>
        <div className='flex items-center justify-between mb-4'>
          <h3 className='text-lg font-semibold text-gray-900 flex items-center'>
            <Brain className='w-5 h-5 text-purple-600 mr-2' />
            AI Recommendations
            <InfoTooltip content="Get personalized trading insights and recommendations powered by Google's Gemini AI. Configure your API key in settings to enable this feature." id='ai-recommendations-info' />
          </h3>
        </div>

        <div className='text-center py-8'>
          <Sparkles className='mx-auto h-12 w-12 text-gray-400 mb-4' />
          <h4 className='text-lg font-medium text-gray-900 mb-2'>AI-Powered Insights Available</h4>
          <p className='text-gray-600 mb-4'>Configure your Gemini API key in settings to get personalized trading recommendations.</p>
          <div className='bg-blue-50 border border-blue-200 rounded-lg p-4 text-left'>
            <h5 className='font-medium text-blue-900 mb-2'>What you'll get:</h5>
            <ul className='text-sm text-blue-800 space-y-1'>
              <li>• Personalized performance analysis</li>
              <li>• Risk assessment and mitigation strategies</li>
              <li>• Actionable improvement recommendations</li>
              <li>• Pattern recognition in your trading behavior</li>
            </ul>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className='card'>
      <div className='flex items-center justify-between mb-4'>
        <h3 className='text-lg font-semibold text-gray-900 flex items-center'>
          <Brain className='w-5 h-5 text-purple-600 mr-2' />
          AI Recommendations
          <InfoTooltip content='AI-powered analysis of your trading data with personalized insights and actionable recommendations to improve your performance.' id='ai-recommendations-info' />
        </h3>

        <button
          onClick={() => generateRecommendations(true)}
          disabled={isLoading}
          className='flex items-center px-3 py-1.5 text-sm bg-purple-100 text-purple-700 rounded-md hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
        >
          <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? "animate-spin" : ""}`} />
          {isLoading ? "Analyzing..." : "Regenerate"}
        </button>
      </div>

      {isLoading && (
        <div className='text-center py-8'>
          <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mb-4'></div>
          <p className='text-gray-600'>Analyzing your trading data...</p>
        </div>
      )}

      {error && (
        <div className='bg-red-50 border border-red-200 rounded-lg p-4 mb-4'>
          <div className='flex items-center'>
            <AlertCircle className='w-5 h-5 text-red-600 mr-2' />
            <p className='text-red-800'>{error}</p>
          </div>
        </div>
      )}

      {aiResponse && !isLoading && (
        <div className='prose prose-sm lg:prose-base max-w-none'>
          <div className='bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6'>
            <ReactMarkdown
              components={{
                h2: ({ children }) => <h2 className='text-lg font-semibold text-blue-800 mt-4 mb-3 flex items-center border-b border-blue-200 pb-2 first:mt-0'>{children}</h2>,
                ul: ({ children }) => <ul className='space-y-2 mb-4'>{children}</ul>,
                li: ({ children }) => (
                  <li className='flex items-start text-gray-700 leading-relaxed'>
                    <span className='text-blue-600 mr-2 flex-shrink-0'>•</span>
                    <span>{children}</span>
                  </li>
                ),
                p: ({ children }) => <p className='text-gray-700 leading-relaxed mb-2'>{children}</p>,
              }}
            >
              {aiResponse}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {!aiResponse && !isLoading && !error && trades.length > 0 && (
        <div className='text-center py-8'>
          <Brain className='mx-auto h-12 w-12 text-gray-400 mb-4' />
          <p className='text-gray-600 mb-4'>Click "Regenerate" to get AI-powered insights for your trading data.</p>
        </div>
      )}
    </div>
  )
}
