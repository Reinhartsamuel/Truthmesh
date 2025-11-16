'use client'

import { Clock, TrendingUp, TrendingDown, Brain, Users, Shield } from 'lucide-react'

interface ActivityItem {
  id: number
  type: 'prediction' | 'market' | 'bet' | 'resolution'
  title: string
  description: string
  timestamp: number
  metadata?: {
    category?: string
    prediction?: number
    confidence?: number
    amount?: number
    outcome?: 'yes' | 'no'
  }
}

export function ActivityFeed() {
  const activities: ActivityItem[] = [
    {
      id: 1,
      type: 'prediction',
      title: 'New AI Prediction Generated',
      description: 'BTC price movement analysis completed',
      timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
      metadata: {
        category: 'BTC Price',
        prediction: 0.78,
        confidence: 0.85,
      },
    },
    {
      id: 2,
      type: 'bet',
      title: 'Large Bet Placed',
      description: 'User placed significant bet on market outcome',
      timestamp: Date.now() - 1000 * 60 * 15, // 15 minutes ago
      metadata: {
        amount: 2500,
        outcome: 'yes',
      },
    },
    {
      id: 3,
      type: 'market',
      title: 'New Market Created',
      description: 'ETH 2.0 gas fee reduction prediction market',
      timestamp: Date.now() - 1000 * 60 * 30, // 30 minutes ago
    },
    {
      id: 4,
      type: 'resolution',
      title: 'Market Resolved',
      description: 'BTC dominance market finalized with outcome',
      timestamp: Date.now() - 1000 * 60 * 60, // 1 hour ago
      metadata: {
        outcome: 'yes',
      },
    },
    {
      id: 5,
      type: 'prediction',
      title: 'AI Model Updated',
      description: 'New training data incorporated into prediction model',
      timestamp: Date.now() - 1000 * 60 * 120, // 2 hours ago
    },
  ]

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'prediction':
        return <Brain className="w-4 h-4 text-blue-500" />
      case 'market':
        return <TrendingUp className="w-4 h-4 text-green-500" />
      case 'bet':
        return <Users className="w-4 h-4 text-purple-500" />
      case 'resolution':
        return <Shield className="w-4 h-4 text-orange-500" />
      default:
        return <Clock className="w-4 h-4 text-slate-500" />
    }
  }

  const getActivityColor = (type: ActivityItem['type']) => {
    switch (type) {
      case 'prediction':
        return 'bg-blue-100 dark:bg-blue-900'
      case 'market':
        return 'bg-green-100 dark:bg-green-900'
      case 'bet':
        return 'bg-purple-100 dark:bg-purple-900'
      case 'resolution':
        return 'bg-orange-100 dark:bg-orange-900'
      default:
        return 'bg-slate-100 dark:bg-slate-900'
    }
  }

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (days > 0) return `${days}d ago`
    if (hours > 0) return `${hours}h ago`
    if (minutes > 0) return `${minutes}m ago`
    return 'Just now'
  }

  const formatPredictionValue = (prediction: number) => {
    return (prediction * 100).toFixed(1) + '%'
  }

  const formatAmount = (amount: number) => {
    if (amount >= 1000) return `$${(amount / 1000).toFixed(1)}K`
    return `$${amount}`
  }

  return (
    <div className="space-y-4">
      {activities.map((activity, index) => (
        <div
          key={activity.id}
          className="flex items-start space-x-4 p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-all duration-200"
        >
          {/* Icon */}
          <div className={`${getActivityColor(activity.type)} rounded-lg p-2 flex-shrink-0`}>
            {getActivityIcon(activity.type)}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between mb-1">
              <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
                {activity.title}
              </h4>
              <span className="text-xs text-slate-500 dark:text-slate-400 flex-shrink-0 ml-2">
                {formatTimeAgo(activity.timestamp)}
              </span>
            </div>
            
            <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
              {activity.description}
            </p>

            {/* Metadata */}
            {activity.metadata && (
              <div className="flex flex-wrap gap-2">
                {activity.metadata.category && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {activity.metadata.category}
                  </span>
                )}
                {activity.metadata.prediction !== undefined && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                    Prediction: {formatPredictionValue(activity.metadata.prediction)}
                  </span>
                )}
                {activity.metadata.confidence !== undefined && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200">
                    Confidence: {(activity.metadata.confidence * 100).toFixed(1)}%
                  </span>
                )}
                {activity.metadata.amount !== undefined && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                    Amount: {formatAmount(activity.metadata.amount)}
                  </span>
                )}
                {activity.metadata.outcome && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${
                    activity.metadata.outcome === 'yes' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {activity.metadata.outcome === 'yes' ? 'Yes' : 'No'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}