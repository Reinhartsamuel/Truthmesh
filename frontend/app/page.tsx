'use client'

import { useState } from 'react'
import { ConnectButton } from '@rainbow-me/rainbowkit'
import { useAccount, useReadContract, useWatchContractEvent } from 'wagmi'
import { PREDICTION_ORACLE_ABI, CONTRACT_ADDRESSES, formatPredictionValue, formatConfidence, formatTimestamp } from '@/lib/web3'
import { PredictionCard } from '@/components/prediction-card'
import { MarketCard } from '@/components/market-card'
import { StatsCard } from '@/components/stats-card'
import { ActivityFeed } from '@/components/activity-feed'
import { Brain, TrendingUp, Users, Shield } from 'lucide-react'

export default function Home() {
  const { isConnected } = useAccount()
  const [activeTab, setActiveTab] = useState<'predictions' | 'markets' | 'activity'>('predictions')

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

  const stats = [
    {
      title: 'Total Predictions',
      value: predictionCount?.toString() || '0',
      icon: Brain,
      color: 'blue',
    },
    {
      title: 'Active Markets',
      value: '12',
      icon: TrendingUp,
      color: 'green',
    },
    {
      title: 'Oracle Accuracy',
      value: '87.5%',
      icon: Shield,
      color: 'purple',
    },
    {
      title: 'Active Users',
      value: '256',
      icon: Users,
      color: 'orange',
    },
  ]

  const samplePredictions = [
    {
      id: 1,
      category: 'BTC Price',
      prediction: 0.75,
      confidence: 0.82,
      summary: 'BTC expected to surge based on ETF inflows and market sentiment',
      timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    },
    {
      id: 2,
      category: 'ETH Ecosystem',
      prediction: 0.65,
      confidence: 0.78,
      summary: 'Ethereum L2 activity shows strong growth momentum',
      timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago
    },
    {
      id: 3,
      category: 'Macro',
      prediction: 0.45,
      confidence: 0.71,
      summary: 'Fed policy uncertainty creates market volatility',
      timestamp: Date.now() - 1000 * 60 * 90, // 1.5 hours ago
    },
  ]

  const sampleMarkets = [
    {
      id: 1,
      question: 'Will BTC exceed $50,000 by end of month?',
      totalYes: 12500,
      totalNo: 8500,
      state: 'Open',
      lockTimestamp: Date.now() + 1000 * 60 * 60 * 24 * 7, // 7 days from now
    },
    {
      id: 2,
      question: 'Will ETH 2.0 reduce gas fees by 50%?',
      totalYes: 8900,
      totalNo: 11200,
      state: 'Open',
      lockTimestamp: Date.now() + 1000 * 60 * 60 * 24 * 14, // 14 days from now
    },
  ]

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
            <ConnectButton />
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
                  { id: 'predictions', name: 'AI Predictions', count: samplePredictions.length },
                  { id: 'markets', name: 'Prediction Markets', count: sampleMarkets.length },
                  { id: 'activity', name: 'Activity Feed', count: 24 },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
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
              {activeTab === 'predictions' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {samplePredictions.map((prediction) => (
                    <PredictionCard key={prediction.id} prediction={prediction} />
                  ))}
                </div>
              )}

              {activeTab === 'markets' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {sampleMarkets.map((market) => (
                    <MarketCard key={market.id} market={market} />
                  ))}
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