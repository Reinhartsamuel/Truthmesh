// lib/api.ts
import { formatPredictionValue, formatConfidence, formatTimestamp } from './web3';

export interface MarketPrediction {
  predictionId: number;
  aiPredictionId: number;
  marketOutcome: string;
  confidence: number;
  submittedToChain: boolean;
  chainTxHash: string | null;
  createdAt: string;
}

export interface Market {
  id: number;
  contract_market_id: string;
  question: string;
  lock_timestamp: string;
  resolve_timestamp: string | null;
  state: string;
  created_at: string;
  updated_at: string;
  predictions?: MarketPrediction[];
}

export interface RawEvent {
  id: number;
  source: string;
  source_id?: string;
  title?: string;
  text: string;
  url?: string;
  metadata?: any;
  inserted_at: string;
}

export interface AISignal {
  id: number;
  category: string;
  relevance: number;
  confidence: number;
  summary: string;
  reasoning: string;
  created_at: string;
  source: string;
  title?: string;
  text: string;
  url?: string;
}

export interface Prediction {
  id: number;
  category: string;
  summary: string;
  prediction_value: number;
  created_at: string;
  relevance: number;
  confidence: number;
  reasoning: string;
  source: string;
  title?: string;
  text: string;
  url?: string;
  chain_tx_hash?:string
}

export interface Stats {
  events: number;
  signals: number;
  predictions: number;
  categories: Array<{
    category: string;
    count: number;
  }>;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3999';
const API_BASE_URL = 'http://localhost:3999';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async fetchWithErrorHandling<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error(`API Error (${endpoint}):`, error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // Get recent raw events
  async getEvents(limit: number = 50, offset: number = 0): Promise<ApiResponse<{ events: RawEvent[], total: number }>> {
    return this.fetchWithErrorHandling(`/api/events?limit=${limit}&offset=${offset}`);
  }

  // Get AI signals with their raw events
  async getSignals(limit: number = 50, offset: number = 0): Promise<ApiResponse<{ signals: AISignal[], total: number }>> {
    return this.fetchWithErrorHandling(`/api/signals?limit=${limit}&offset=${offset}`);
  }

  // Get predictions with their signals and events
  async getPredictions(limit: number = 50, offset: number = 0): Promise<ApiResponse<{ predictions: Prediction[], total: number }>> {
    return this.fetchWithErrorHandling(`/api/predictions?limit=${limit}&offset=${offset}`);
  }

  // Get statistics
  async getStats(): Promise<ApiResponse<Stats>> {
    return this.fetchWithErrorHandling('/api/stats');
  }

  // Get markets
  async getMarkets(limit: number = 50, offset: number = 0): Promise<ApiResponse<{ markets: Market[], total: number }>> {
    return this.fetchWithErrorHandling(`/api/markets?limit=${limit}&offset=${offset}`);
  }

  // Get events by category
  async getEventsByCategory(category: string, limit: number = 50): Promise<ApiResponse<{ category: string, signals: AISignal[], total: number }>> {
    return this.fetchWithErrorHandling(`/api/events/category/${category}?limit=${limit}`);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string; time: string }>> {
    return this.fetchWithErrorHandling('/health');
  }
}

// Utility functions for formatting
export const formatEventTime = (timestamp: string): string => {
  return new Date(timestamp).toLocaleString();
};

export const formatTimeAgo = (timestamp: string): string => {
  const diff = Date.now() - new Date(timestamp).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

export const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    BTC_price: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
    ETH_ecosystem: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    Macro: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    Regulation: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    Exploit: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  };
  return colors[category] || 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-200';
};

export const getSourceIcon = (source: string): string => {
  const icons: Record<string, string> = {
    'rss': '📰',
    'newsapi': '📡',
    'coingecko': '💰',
    'test': '🧪',
  };
  return icons[source] || '📄';
};

// Create and export a singleton instance
export const apiClient = new ApiClient();

export default apiClient;
