'use client'

import { useState, useEffect } from 'react'
import { useAccount } from 'wagmi'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { Brain, TrendingUp, Database, Activity, Filter } from 'lucide-react'
import { apiClient, AISignal, Prediction, RawEvent, Stats, formatTimeAgo, getCategoryColor, getSourceIcon } from '@/lib/api'
import { StatsCard } from '@/components/stats-card'

export default function EventsPage() {
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<'events' | 'signals' | 'predictions'>('events')
  const [events, setEvents] = useState<RawEvent[]>([])
  const [signals, setSignals] = useState<AISignal[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isConnected) {
      loadData()
    }
  }, [isConnected])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [statsRes, eventsRes, signalsRes, predictionsRes] = await Promise.all([
        apiClient.getStats(),
        apiClient.getEvents(20),
        apiClient.getSignals(20),
        apiClient.getPredictions(20)
      ])

      if (statsRes.data) setStats(statsRes.data)
      if (eventsRes.data) setEvents(eventsRes.data.events)
      if (signalsRes.data) setSignals(signalsRes.data.signals)
      if (predictionsRes.data) setPredictions(predictionsRes.data.predictions)

      if (statsRes.error || eventsRes.error || signalsRes.error || predictionsRes.error) {
        setError('Failed to load some data. The backend server might not be running.')
      }
    } catch (err) {
      setError('Failed to connect to backend server. Make sure the API server is running.')
    } finally {
      setLoading(false)
    }
  }

  const statsData = stats ? [
    {
      title: 'Total Events',
      value: stats.events.toString(),
      icon: Database,
      color: 'blue' as const,
    },
    {
      title: 'AI Signals',
      value: stats.signals.toString(),
      icon: Brain,
      color: 'purple' as const,
    },
    {
      title: 'Predictions',
      value: stats.predictions.toString(),
      icon: TrendingUp,
      color: 'green' as const,
    },
    {
      title: 'Categories',
      value: stats.categories.length.toString(),
      icon: Filter,
      color: 'orange' as const,
    },
  ] : []

  // if (!isConnected) {
  //   return (
  //     <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
  //       <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
  //         <div className="text-center py-16">
  //           <div className="max-w-md mx-auto">
  //             <Brain className="w-16 h-16 text-blue-500 mx-auto mb-4" />
  //             <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
  //               Connect Your Wallet
  //             </h2>
  //             <p className="text-slate-600 dark:text-slate-400 mb-8">
  //               Connect your wallet to access the TruthMesh AI Oracle database and explore real-time events and predictions.
  //             </p>
  //             <ConnectButton />
  //           </div>
  //         </div>
  //       </div>
  //     </div>
  //   )
  // }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-4 text-slate-600 dark:text-slate-400">Loading database data...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <Activity className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Backend Connection Error
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-4">
                {error}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mb-8">
                Make sure the backend server is running on port 3000 with: <code className="bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded">bun run dev</code>
              </p>
              <button
                onClick={loadData}
                className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg font-medium transition-colors duration-200"
              >
                Retry Connection
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
            AI Oracle Database
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Real-time events, AI signals, and predictions from the TruthMesh AI Oracle
          </p>
        </div>

        {/* Stats Grid */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {statsData.map((stat, index) => (
              <StatsCard key={index} {...stat} />
            ))}
          </div>
        )}

        {/* Category Distribution */}
        {stats && stats.categories.length > 0 && (
          <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 mb-8">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
              Category Distribution
            </h3>
            <div className="flex flex-wrap gap-2">
              {stats.categories.map((cat) => (
                <span
                  key={cat.category}
                  className={`px-3 py-1 rounded-full text-sm font-medium ${getCategoryColor(cat.category)}`}
                >
                  {cat.category}: {cat.count}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="border-b border-slate-200 dark:border-slate-700 mb-8">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'events' as const, name: 'Raw Events', count: events.length },
              { id: 'signals' as const, name: 'AI Signals', count: signals.length },
              { id: 'predictions' as const, name: 'Predictions', count: predictions.length },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                  ${activeTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                  }
                `}
              >
                {tab.name}
                <span className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-0.5 px-2 rounded-full text-xs">
                  {tab.count}
                </span>
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="fade-in">
          {activeTab === 'events' && (
            <div className="space-y-4">
              {events.map((event) => (
                <div
                  key={event.id}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="text-lg">{getSourceIcon(event.source)}</span>
                      <span className="text-sm font-medium text-slate-900 dark:text-white">
                        {event.source}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatTimeAgo(event.inserted_at)}
                    </span>
                  </div>

                  {event.title && (
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                      {event.title}
                    </h4>
                  )}

                  <p className="text-slate-600 dark:text-slate-400 mb-4">
                    {event.text}
                  </p>

                  {event.url && (
                    <a
                      href={event.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:text-blue-600 text-sm"
                    >
                      View Source →
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'signals' && (
            <div className="space-y-4">
              {signals.map((signal) => (
                <div
                  key={signal.id}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(signal.category)}`}>
                        {signal.category}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {getSourceIcon(signal.source)} {signal.source}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatTimeAgo(signal.created_at)}
                    </span>
                  </div>

                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {signal.summary}
                  </h4>

                  <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
                    Original: {signal.text}
                  </p>

                  <div className="flex items-center space-x-4 text-sm mb-3">
                    <span className="text-blue-600 dark:text-blue-400">
                      Relevance: {(signal.relevance * 100).toFixed(1)}%
                    </span>
                    <span className="text-green-600 dark:text-green-400">
                      Confidence: {(signal.confidence * 100).toFixed(1)}%
                    </span>
                  </div>

                  {signal.reasoning && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600">
                      <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">AI Reasoning:</h5>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {signal.reasoning}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {activeTab === 'predictions' && (
            <div className="space-y-4">
              {predictions.map((prediction) => (
                <div
                  key={prediction.id}
                  className="bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 p-6 hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(prediction.category)}`}>
                        {prediction.category}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {getSourceIcon(prediction.source)} {prediction.source}
                      </span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400">
                      {formatTimeAgo(prediction.created_at)}
                    </span>
                  </div>

                  <h4 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                    {prediction.summary}
                  </h4>

                  <p className="text-slate-600 dark:text-slate-400 mb-4 text-sm">
                    Original: {prediction.text}
                  </p>

                  <div className="flex items-center space-x-4 text-sm mb-3">
                    <span className="text-blue-600 dark:text-blue-400">
                      Relevance: {(prediction.relevance * 100).toFixed(1)}%
                    </span>
                    <span className="text-green-600 dark:text-green-400">
                      Confidence: {(prediction.confidence * 100).toFixed(1)}%
                    </span>
                    <span className="text-purple-600 dark:text-purple-400 font-semibold">
                      Prediction: {(prediction.prediction_value * 100).toFixed(1)}%
                    </span>
                  </div>

                  {prediction.reasoning && (
                    <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-700 rounded-lg border border-slate-200 dark:border-slate-600 mb-4">
                      <h5 className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">AI Reasoning:</h5>
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                        {prediction.reasoning}
                      </p>
                    </div>
                  )}

                  {/* Prediction Bar */}
                  <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${prediction.prediction_value * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State */}
          {((activeTab === 'events' && events.length === 0) ||
           (activeTab === 'signals' && signals.length === 0) ||
           (activeTab === 'predictions' && predictions.length === 0)) && (
            <div className="text-center py-16">
              <Database className="w-16 h-16 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                No Data Available
              </h3>
              <p className="text-slate-600 dark:text-slate-400">
                {activeTab === 'events' && 'No raw events have been collected yet.'}
                {activeTab === 'signals' && 'No AI signals have been generated yet.'}
                {activeTab === 'predictions' && 'No predictions have been created yet.'}
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-500 mt-2">
                Run the workflow script to generate sample data.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
