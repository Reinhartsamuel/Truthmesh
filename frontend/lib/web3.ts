import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, localhost } from 'wagmi/chains'
import { getDefaultConfig } from '@rainbow-me/rainbowkit'

// Contract addresses (update these with your deployed contract addresses)
export const CONTRACT_ADDRESSES = {
  predictionOracle: process.env.NEXT_PUBLIC_PREDICTION_ORACLE_ADDRESS || '0x...',
  predictionMarket: process.env.NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS || '0x...',
} as const

// ABI for PredictionOracle contract
export const PREDICTION_ORACLE_ABI = [
  {
    inputs: [{ internalType: 'address', name: '_signer', type: 'address' }],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: 'uint256', name: 'id', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'prediction', type: 'uint256' },
      { indexed: false, internalType: 'uint256', name: 'confidence', type: 'uint256' },
      { indexed: true, internalType: 'address', name: 'signer', type: 'address' },
    ],
    name: 'PredictionSubmitted',
    type: 'event',
  },
  {
    inputs: [],
    name: 'getEthSignedMessageHash',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'id', type: 'uint256' },
      { internalType: 'uint256', name: 'prediction', type: 'uint256' },
      { internalType: 'uint256', name: 'confidence', type: 'uint256' },
    ],
    name: 'getMessageHash',
    outputs: [{ internalType: 'bytes32', name: '', type: 'bytes32' }],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'id', type: 'uint256' }],
    name: 'getPrediction',
    outputs: [
      { internalType: 'uint256', name: 'id', type: 'uint256' },
      { internalType: 'uint256', name: 'prediction', type: 'uint256' },
      { internalType: 'uint256', name: 'confidence', type: 'uint256' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { internalType: 'address', name: 'signer', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getLatestPrediction',
    outputs: [
      { internalType: 'uint256', name: 'id', type: 'uint256' },
      { internalType: 'uint256', name: 'prediction', type: 'uint256' },
      { internalType: 'uint256', name: 'confidence', type: 'uint256' },
      { internalType: 'uint256', name: 'timestamp', type: 'uint256' },
      { internalType: 'address', name: 'signer', type: 'address' },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'getPredictionCount',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'id', type: 'uint256' }],
    name: 'predictionExists',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'latestPredictionId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'oracleSigner',
    outputs: [{ internalType: 'address', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'id', type: 'uint256' },
      { internalType: 'uint256', name: 'prediction', type: 'uint256' },
      { internalType: 'uint256', name: 'confidence', type: 'uint256' },
      { internalType: 'bytes', name: 'signature', type: 'bytes' },
    ],
    name: 'submitPrediction',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const

// ABI for PredictionMarket contract
export const PREDICTION_MARKET_ABI = [
  {
    inputs: [
      { internalType: 'address', name: '_oracleSigner', type: 'address' },
      { internalType: 'address', name: '_arbitrator', type: 'address' },
      { internalType: 'uint256', name: '_disputeBond', type: 'uint256' },
      { internalType: 'uint256', name: '_minBet', type: 'uint256' },
      { internalType: 'address', name: '_predictionOracle', type: 'address' },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'marketId', type: 'uint256' }],
    name: 'resolveMarketWithOracle',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'marketId', type: 'uint256' }],
    name: 'resolveMarketWithLatestOracle',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'predictionOracle',
    outputs: [{ internalType: 'contract PredictionOracle', name: '', type: 'address' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nextMarketId',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const

// Configure chains
export const chains = [mainnet, sepolia, localhost] as const

// Create wagmi config
export const config = getDefaultConfig({
  appName: 'TruthMesh AI Oracle',
  projectId: process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || 'your-project-id',
  chains: chains as any,
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [localhost.id]: http('http://127.0.0.1:8545'),
  },
  ssr: true,
})

// Utility functions
export const formatPredictionValue = (value: bigint, scale: number = 1000000): number => {
  return Number(value) / scale
}

export const formatConfidence = (confidence: bigint, scale: number = 1000000): number => {
  return Number(confidence) / scale
}

export const formatTimestamp = (timestamp: bigint): string => {
  return new Date(Number(timestamp) * 1000).toLocaleString()
}