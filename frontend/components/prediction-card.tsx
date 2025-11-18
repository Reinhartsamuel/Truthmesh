'use client'

import { TrendingUp, TrendingDown, Minus, Brain } from 'lucide-react'

interface Prediction {
  id: number
  category: string
  prediction: number
  confidence: number
  summary: string
  timestamp: number
  chain_tx_hash?:string
}

interface PredictionCardProps {
  prediction: Prediction
}

export function PredictionCard({ prediction }: PredictionCardProps) {
  const getTrendIcon = (prediction: number) => {
    if (prediction > 0.6) return <TrendingUp className="w-4 h-4 text-green-500" />
    if (prediction < 0.4) return <TrendingDown className="w-4 h-4 text-red-500" />
    return <Minus className="w-4 h-4 text-yellow-500" />
  }

  const getPredictionColor = (prediction: number) => {
    if (prediction > 0.6) return 'text-green-600 dark:text-green-400'
    if (prediction < 0.4) return 'text-red-600 dark:text-red-400'
    return 'text-yellow-600 dark:text-yellow-400'
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    if (confidence > 0.6) return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
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

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
            <Brain className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          </div>
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {prediction.category}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          {getTrendIcon(prediction.prediction)}
          <span className={`text-lg font-bold ${getPredictionColor(prediction.prediction)}`}>
            {(prediction.prediction * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 line-clamp-2">
        {prediction.summary}
      </p>

      {/* Confidence and Time */}
      <div className="flex items-center justify-between">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConfidenceColor(prediction.confidence)}`}>
          {(prediction.confidence * 100).toFixed(1)}% confidence
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400">
          {formatTimeAgo(prediction.timestamp)}
        </span>
      </div>

      {/* Prediction Bar */}
      <div className="mt-4">
        <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1">
          <span>Bearish</span>
          <span>Bullish</span>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${prediction.prediction * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
