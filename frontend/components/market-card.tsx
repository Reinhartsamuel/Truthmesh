'use client'

import { Clock, Users, TrendingUp, TrendingDown } from 'lucide-react'

interface Market {
  id: number
  question: string
  totalYes: number
  totalNo: number
  state: string
  lockTimestamp: number
}

interface MarketCardProps {
  market: Market
}

export function MarketCard({ market }: MarketCardProps) {
  const totalVolume = market.totalYes + market.totalNo
  const yesPercentage = totalVolume > 0 ? (market.totalYes / totalVolume) * 100 : 50
  const noPercentage = totalVolume > 0 ? (market.totalNo / totalVolume) * 100 : 50

  const getStateColor = (state: string) => {
    switch (state) {
      case 'Open':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'Closed':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'Provisional':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
      case 'Finalized':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
      default:
        return 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200'
    }
  }

  const formatTimeRemaining = (timestamp: number) => {
    const diff = timestamp - Date.now()
    if (diff <= 0) return 'Closed'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h`
    return '<1h'
  }

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`
    return `$${volume}`
  }

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 p-6 hover:shadow-lg transition-all duration-200">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex-1 pr-4">
          {market.question}
        </h3>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStateColor(market.state)}`}>
          {market.state}
        </span>
      </div>

      {/* Volume and Time */}
      <div className="flex items-center justify-between mb-4 text-sm text-slate-600 dark:text-slate-400">
        <div className="flex items-center space-x-1">
          <Users className="w-4 h-4" />
          <span>Volume: {formatVolume(totalVolume)}</span>
        </div>
        <div className="flex items-center space-x-1">
          <Clock className="w-4 h-4" />
          <span>{formatTimeRemaining(market.lockTimestamp)}</span>
        </div>
      </div>

      {/* Prediction Bars */}
      <div className="space-y-2">
        {/* Yes Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-4 h-4 text-green-500" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">Yes</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-green-600 dark:text-green-400">
              {yesPercentage.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
              {formatVolume(market.totalYes)}
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
          <div
            className="bg-green-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${yesPercentage}%` }}
          />
        </div>

        {/* No Bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingDown className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-slate-900 dark:text-white">No</span>
          </div>
          <div className="text-right">
            <span className="text-sm font-semibold text-red-600 dark:text-red-400">
              {noPercentage.toFixed(1)}%
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 ml-2">
              {formatVolume(market.totalNo)}
            </span>
          </div>
        </div>
        <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3">
          <div
            className="bg-red-500 h-3 rounded-full transition-all duration-300"
            style={{ width: `${noPercentage}%` }}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-2 mt-6">
        <button className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200">
          Bet Yes
        </button>
        <button className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors duration-200">
          Bet No
        </button>
      </div>
    </div>
  )
}