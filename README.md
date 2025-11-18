# TruthMesh AI Oracle -- Prediction Engine

## Overview

TruthMesh AI Oracle is an off-chain AI-driven prediction engine designed
for decentralized prediction markets. It ingests real-world events,
processes them through an AI model, and produces signed on-chain
verifiable predictions.

## Features

-   Event ingestion (price, macro, regulatory, custom)
-   Queue system for reliable asynchronous processing
-   AI scoring engine producing confidence-weighted predictions
-   Signature generation (EIP-191) for on-chain verification
-   Developer-friendly architecture

## Architecture

-   **raw_events** → stored directly from ingestion API
-   **queue_events** → worker picks tasks from here
-   **ai_worker** → processes events, applies vector model, generates
    prediction + confidence
-   **signer** → off-chain signing using private key
-   **oracle contract** → verifies signer and message validity

## Requirements

-   Node.js (Bun recommended)
-   PostgreSQL
-   Ethers.js v6
-   dotenv
-   Drizzle ORM (optional)

## Install

``` bash
bun install
bun add ethers pg drizzle-orm
```

## Running Worker

``` bash
bun run worker.ts
```

## Environment Variables

   PORT=3999


DATABASE_URL=postgresql://
NEWSAPI_KEY=
POLL_INTERVAL_SECONDS=15
OPENAI_API_KEY=

# private keys
ORACLE_PRIVATE_KEY=your-private-key
PRIVATE_KEY=your-private-key
DEPLOYER_PRIVATE_KEY=your-private-key


# oracle wallet address
ORACLE_SIGNER=your-wallet-address
ARBITRATOR=your-wallet-address

# rpc and api key
RPC_URL=your-rpc-url
ETHERSCAN_API_KEY=your-etherscan-api-key


# contract addresses
PREDICTION_ORACLE_ADDRESS=
PREDICTION_MARKET_ADDRESS=

# frontend
NEXT_PUBLIC_API_BASE_URL=


## Signing Output Example

``` json
{
  "prediction": 1,
  "confidence": 0.82,
  "signature": "0x...",
  "signer": "0x1234...",
  "messageHash": "0xabc..."
}
```

## On-Chain Validation

The contract verifies: - Signature authenticity - Prediction freshness -
Event type validity

## Disclaimer

This is for hackathon/demo use. Not production-ready.


## Run Full Workflow
```
 forge script script/PredictionMarket.s.sol:PredictionMarketScript --rpc-url $RPC_URL --private-key $PRIVATE_KEY --etherscan-api-key $ETHERSCAN_API_KEY --broadcast --verify
 ```
 ```bash
 bun run scripts/resetDatabase.ts
 bun run scripts/createSampleMarkets.ts
 bun run scripts/syncMarkets.ts  
 bun run scripts/runMarketAwareWorkflow.ts
 ```
