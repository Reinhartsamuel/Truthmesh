'use client'

import { LucideIcon } from 'lucide-react'

interface StatsCardProps {
  title: string
  value: string
  icon: LucideIcon
  color: 'blue' | 'green' | 'purple' | 'orange'
}

export function StatsCard({ title, value, icon: Icon, color }: StatsCardProps) {
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      iconBg: 'bg-blue-100 dark:bg-blue-800',
      iconColor: 'text-blue-600 dark:text-blue-400',
      text: 'text-blue-600 dark:text-blue-400',
    },
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      iconBg: 'bg-green-100 dark:bg-green-800',
      iconColor: 'text-green-600 dark:text-green-400',
      text: 'text-green-600 dark:text-green-400',
    },
    purple: {
      bg: 'bg-purple-50 dark:bg-purple-900/20',
      iconBg: 'bg-purple-100 dark:bg-purple-800',
      iconColor: 'text-purple-600 dark:text-purple-400',
      text: 'text-purple-600 dark:text-purple-400',
    },
    orange: {
      bg: 'bg-orange-50 dark:bg-orange-900/20',
      iconBg: 'bg-orange-100 dark:bg-orange-800',
      iconColor: 'text-orange-600 dark:text-orange-400',
      text: 'text-orange-600 dark:text-orange-400',
    },
  }

  const classes = colorClasses[color]

  return (
    <div className={`${classes.bg} rounded-xl border border-slate-200 dark:border-slate-700 p-6`}>
      <div className="flex items-center">
        <div className={`${classes.iconBg} rounded-lg p-3 mr-4`}>
          <Icon className={`w-6 h-6 ${classes.iconColor}`} />
        </div>
        <div>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-1">
            {title}
          </p>
          <p className={`text-2xl font-bold ${classes.text}`}>
            {value}
          </p>
        </div>
      </div>
    </div>
  )
}