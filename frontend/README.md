# TruthMesh AI Oracle - Frontend

A modern React/Next.js frontend for the TruthMesh AI Oracle system, providing real-time visualization of AI-powered predictions and decentralized prediction markets.

## Features

- **🔗 Wallet Integration**: Connect with MetaMask, WalletConnect, and other popular wallets
- **📊 Real-time Predictions**: Live updates of AI-generated predictions
- **🎯 Prediction Markets**: Interactive betting interface for prediction markets
- **📈 Analytics Dashboard**: Comprehensive statistics and activity feeds
- **🌙 Dark Mode**: Full dark/light theme support
- **📱 Responsive Design**: Optimized for desktop and mobile devices

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Web3**: Wagmi + Viem + RainbowKit
- **State Management**: TanStack Query
- **Icons**: Lucide React
- **TypeScript**: Full type safety

## Quick Start

### Prerequisites

- Node.js 18+ 
- Bun or npm/yarn
- Wallet (MetaMask, etc.)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd truthmesh-seedify/frontend
   ```

2. **Install dependencies**
   ```bash
   bun install
   # or
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Edit `.env.local` with your configuration:
   ```env
   NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your-walletconnect-project-id
   NEXT_PUBLIC_PREDICTION_ORACLE_ADDRESS=0x...
   NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0x...
   ```

4. **Run the development server**
   ```bash
   bun run dev
   # or
   npm run dev
   # or
   yarn dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## Configuration

### Contract Addresses

Update the contract addresses in your environment variables:

```env
NEXT_PUBLIC_PREDICTION_ORACLE_ADDRESS=0xYourPredictionOracleAddress
NEXT_PUBLIC_PREDICTION_MARKET_ADDRESS=0xYourPredictionMarketAddress
```

### WalletConnect Project ID

1. Go to [WalletConnect Cloud](https://cloud.walletconnect.com/)
2. Create a new project
3. Copy the Project ID to your environment variables

### RPC URLs

Configure custom RPC URLs if needed:

```env
NEXT_PUBLIC_MAINNET_RPC_URL=https://mainnet.infura.io/v3/your-key
NEXT_PUBLIC_SEPOLIA_RPC_URL=https://sepolia.infura.io/v3/your-key
NEXT_PUBLIC_LOCAL_RPC_URL=http://127.0.0.1:8545
```

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── activity-feed.tsx  # Activity feed component
│   ├── market-card.tsx    # Market display card
│   ├── prediction-card.tsx # Prediction display card
│   ├── providers.tsx      # Web3 providers
│   └── stats-card.tsx     # Statistics card
├── lib/                   # Utility libraries
│   └── web3.ts           # Web3 configuration and ABIs
└── hooks/                # Custom React hooks
```

## Available Scripts

- `bun run dev` - Start development server
- `bun run build` - Build for production
- `bun run start` - Start production server
- `bun run lint` - Run ESLint

## Smart Contract Integration

The frontend integrates with two main contracts:

### PredictionOracle.sol
- Fetches AI-generated predictions
- Displays prediction confidence and timestamps
- Real-time event listening for new predictions

### PredictionMarket.sol
- Creates and manages prediction markets
- Handles betting and payouts
- Market resolution using oracle data

## Development

### Adding New Components

1. Create component file in `components/` directory
2. Use TypeScript for type safety
3. Follow the existing component patterns
4. Add proper error handling for Web3 interactions

### Custom Hooks

Create custom hooks in the `hooks/` directory for reusable Web3 logic:

```typescript
export function usePredictionData(predictionId: number) {
  return useReadContract({
    address: CONTRACT_ADDRESSES.predictionOracle,
    abi: PREDICTION_ORACLE_ABI,
    functionName: 'getPrediction',
    args: [predictionId],
  })
}
```

### Styling

- Use Tailwind CSS utility classes
- Follow the design system in `tailwind.config.js`
- Maintain consistent spacing and colors

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy automatically on git push

### Other Platforms

The app can be deployed to any platform that supports Next.js:

- Netlify
- AWS Amplify
- Railway
- DigitalOcean App Platform

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Troubleshooting

### Common Issues

**Wallet Connection Fails**
- Ensure WalletConnect Project ID is set
- Check if the wallet is properly installed
- Verify network connectivity

**Contract Calls Fail**
- Check contract addresses in environment variables
- Verify the contract is deployed to the correct network
- Ensure the user is connected to the right network

**Build Errors**
- Clear node_modules and reinstall dependencies
- Check TypeScript types
- Verify all environment variables are set

## Support

For support and questions:
- Create an issue in the repository
- Check the existing documentation
- Review the smart contract integration tests

## License

This project is licensed under the MIT License - see the LICENSE file for details.