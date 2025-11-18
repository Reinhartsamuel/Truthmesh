'use client'

import { useEffect, useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useWatchContractEvent } from 'wagmi'
import { PREDICTION_ORACLE_ABI, CONTRACT_ADDRESSES, formatPredictionValue, formatConfidence, formatTimestamp } from '@/lib/web3'
import { PredictionCard } from '@/components/prediction-card'
import { MarketCard } from '@/components/market-card'
import { StatsCard } from '@/components/stats-card'
import { ActivityFeed } from '@/components/activity-feed'
import { Brain, TrendingUp, Users, Shield, Database, Lightbulb, Target, Clock, LucideIcon } from 'lucide-react'
import Link from 'next/link'
import apiClient, { Market, Prediction } from '@/lib/api'

// AI Reasoning Component
function AIReasoning({ reasoning }: { reasoning: string }) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-slate-600">
      <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
        {reasoning || 'No AI reasoning available for this prediction'}
      </p>
    </div>
  )
}

export default function Home() {
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<'predictions' | 'markets' | 'activity'>('predictions')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [markets, setMarkets] = useState<Market[]>([])
  const [predictions, setPredictions] = useState<Prediction[]>([])

  // Fetch latest prediction
  const { data: latestPrediction, refetch: refetchPrediction } = useReadContract({
    address: CONTRACT_ADDRESSES.predictionOracle as `0x${string}`,
    abi: PREDICTION_ORACLE_ABI,
    functionName: 'getLatestPrediction',
  })

  // Fetch prediction count
  const { data: predictionCount } = useReadContract({
    address: CONTRACT_ADDRESSES.predictionOracle as `0x${string}`,
    abi: PREDICTION_ORACLE_ABI,
    functionName: 'getPredictionCount',
  })

  // Watch for new prediction events
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.predictionOracle as `0x${string}`,
    abi: PREDICTION_ORACLE_ABI,
    eventName: 'PredictionSubmitted',
    onLogs: () => {
      refetchPrediction()
    },
  })

  const stats: Array<{
    title: string;
    value: string;
    description: string;
    icon: LucideIcon;
    color: 'blue' | 'green' | 'purple' | 'orange';
  }> = [
    {
      title: 'Active Markets',
      value: markets.filter(m => m.state === 'Open').length.toString(),
      description: 'Markets accepting bets',
      icon: TrendingUp,
      color: 'green',
    },
    {
      title: 'AI Predictions',
      value: predictions.length.toString(),
      description: 'Total AI analyses',
      icon: Brain,
      color: 'purple',
    },
    {
      title: 'Oracle Confidence',
      value: predictions.length > 0 ? `${Math.round(predictions.reduce((total, pred) => total + (pred.confidence || 0), 0) / predictions.length * 100)}%` : '0%',
      description: 'Average AI confidence',
      icon: Shield,
      color: 'orange',
    },
    {
      title: 'Categories',
      value: Array.from(new Set(predictions.map(p => p.category))).length.toString(),
      description: 'Different categories',
      icon: Database,
      color: 'blue',
    },
  ]

  useEffect(() => {
    if (isConnected) {
      loadData()
    }
  }, [isConnected])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const [marketsRes, predictionsRes] = await Promise.all([
        apiClient.getMarkets(20),
        apiClient.getPredictions(20)
      ]);

      if (marketsRes.data) {
        setMarkets(marketsRes.data.markets);
      }
      if (predictionsRes.data) {
        setPredictions(predictionsRes.data.predictions);
      }

      if (marketsRes.error || predictionsRes.error) {
        setError('Failed to load some data. The backend server might not be running.');
      }
    } catch (err) {
      console.error('Error loading data:', err);
      setError('Failed to connect to backend server. Make sure the API server is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                TruthMesh AI Oracle
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                href="/events"
                className="flex items-center space-x-2 px-4 py-2 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
              >
                <Database className="w-4 h-4" />
                <span className="text-sm font-medium">Database</span>
              </Link>
              <ConnectButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          <div className="text-center py-16">
            <div className="max-w-md mx-auto">
              <Brain className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">
                Connect Your Wallet
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-8">
                Connect your wallet to access the TruthMesh AI Oracle dashboard and explore real-time predictions powered by artificial intelligence.
              </p>
              <ConnectButton />
            </div>
          </div>
        ) : (
          <>
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {stats.map((stat, index) => (
                <StatsCard key={index} {...stat} />
              ))}
            </div>

            {/* Latest Prediction Banner */}
            {latestPrediction && (
              <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl p-6 text-white mb-8">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Latest AI Prediction</h3>
                    <p className="text-blue-100">
                      Prediction: {formatPredictionValue(latestPrediction[1])} |
                      Confidence: {formatConfidence(latestPrediction[2])}% |
                      Time: {formatTimestamp(latestPrediction[3])}
                    </p>
                  </div>
                  <div className="bg-white/20 rounded-lg p-3">
                    <Brain className="w-6 h-6" />
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Tabs */}
            <div className="border-b border-slate-200 dark:border-slate-700 mb-8">
              <nav className="-mb-px flex space-x-8">
                {[
                  { id: 'markets', name: 'Prediction Markets', count: markets.length, icon: Target },
                  { id: 'predictions', name: 'AI Oracle View', count: predictions.length, icon: Brain },
                  { id: 'activity', name: 'Activity Feed', count: 24, icon: Clock },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`
                      whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2
                      ${activeTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 dark:text-slate-400 dark:hover:text-slate-300'
                      }
                    `}
                  >
                    <tab.icon className="w-4 h-4" />
                    <span>{tab.name}</span>
                    <span className="ml-2 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 py-0.5 px-2 rounded-full text-xs">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab Content */}
            <div className="fade-in">
              {activeTab === 'markets' && (
                <div className="space-y-6">
                  {markets.map((market) => {
                    // Manual mapping: Find predictions that match this market's question
                    const relevantPredictions = predictions.filter(prediction => {
                      const marketLower = market.question.toLowerCase();
                      const predictionLower = prediction.summary?.toLowerCase() || '';

                      // Simple keyword matching
                      const marketKeywords = marketLower.split(/[^a-zA-Z0-9]/).filter(w => w.length > 3);
                      const predictionKeywords = predictionLower.split(/[^a-zA-Z0-9]/).filter(w => w.length > 3);

                      const matchingKeywords = marketKeywords.filter(word =>
                        predictionKeywords.some(predWord => predWord.includes(word) || word.includes(predWord))
                      );

                      return matchingKeywords.length > 0;
                    });

                    const latestPrediction = relevantPredictions[0];
                    const predictionValue = latestPrediction?.prediction_value || 0.5;
                    const confidence = latestPrediction?.confidence || 0.5;
                    const marketOutcome = predictionValue > 0.5 ? 'Yes' : 'No';

                    return (
                      <MarketCard
                        key={market.id}
                        market={{
                          id: market.id,
                          question: market.question,
                          totalYes: predictionValue > 0.5 ? Math.round(predictionValue * 100) : 0,
                          totalNo: predictionValue <= 0.5 ? Math.round((1 - predictionValue) * 100) : 0,
                          state: market.state,
                          lockTimestamp: new Date(market.lock_timestamp).getTime()
                        }}
                      />
                    );
                  })}

                  {markets.length === 0 && !loading && (
                    <div className="text-center py-16">
                      <Target className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No Prediction Markets
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400">
                        Create some prediction markets to get started.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'predictions' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {predictions.map((prediction) => (
                    <div key={prediction.id} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-200">
                      {/* Prediction Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                            <Brain className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                              {prediction.summary}
                            </h3>
                            <div className="flex items-center space-x-4 mt-1 text-sm text-slate-500 dark:text-slate-400">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                prediction.category === 'BTC_price'
                                  ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                  : prediction.category === 'ETH_ecosystem'
                                  ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                              }`}>
                                {prediction.category}
                              </span>
                              <span className="flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>{new Date(prediction.created_at).toLocaleDateString()}</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* AI Prediction Section */}
                      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-slate-700 dark:to-slate-800 rounded-lg p-4 mb-4 border border-blue-100 dark:border-slate-600">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-2">
                            <Target className="w-4 h-4 text-blue-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              AI Prediction
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              prediction.prediction_value > 0.5
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                            }`}>
                              {prediction.prediction_value > 0.5 ? 'Positive' : 'Negative'}
                            </span>
                            <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                              {(prediction.confidence * 100).toFixed(0)}% confidence
                            </span>
                          </div>
                        </div>

                        {/* Prediction Bar */}
                        <div className="w-full bg-slate-200 dark:bg-slate-600 rounded-full h-3 mb-3">
                          <div
                            className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${prediction.prediction_value * 100}%` }}
                          />
                        </div>

                        {/* AI Reasoning */}
                        <div className="mt-4">
                          <div className="flex items-center space-x-2 mb-3">
                            <Lightbulb className="w-4 h-4 text-yellow-500" />
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              AI Reasoning
                            </span>
                          </div>
                          <AIReasoning reasoning={prediction.reasoning} />
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex space-x-4">
                        <button className="flex-1 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg">
                          <span className="font-semibold">View Markets</span>
                        </button>
                        <a href={`https://testnet.bscscan.com/tx/${prediction?.chain_tx_hash}` } target='_blank'>
                          <button className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg">
                            <span className="font-semibold">Inspect Signature</span>
                          </button>
                        </a>
                      </div>
                    </div>
                  ))}

                  {predictions.length === 0 && !loading && (
                    <div className="col-span-full text-center py-16">
                      <Brain className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
                        No AI Predictions Yet
                      </h3>
                      <p className="text-slate-600 dark:text-slate-400">
                        Run the market-aware workflow to generate AI predictions.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'activity' && (
                <div className="max-w-4xl">
                  <ActivityFeed />
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
