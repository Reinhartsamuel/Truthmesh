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

    PRIVATE_KEY=your_private_key
    DATABASE_URL=postgresql://...

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



 ┌─────────────────────────┐
 │     Data Ingester       │
 │ - queues events         │
 │ - cleans & normalizes   │
 └───────────┬─────────────┘
             │
             ↓
 ┌─────────────────────────┐
 │    AI Prediction Engine │
 │ - loads ML model        │
 │ - runs prediction       │
 │ - produces probability  │
 └───────────┬─────────────┘
             │
             ↓
 ┌─────────────────────────┐
 │   Signing Module        │
 │ - packs struct exactly  │
 │ - hashes + signs        │
 │ - returns signature     │
 └───────────┬─────────────┘
             │
             ↓
 ┌─────────────────────────┐
 │   On-Chain Broadcaster  │
 │ - sends tx to contract  │
 │ - stores result in DB   │
 └─────────────────────────┘
 
 forge script script/PredictionMarket.s.sol:PredictionMarketScript --rpc-url $RPC_URL --private-key $PRIVATE_KEY --etherscan-api-key $ETHERSCAN_API_KEY --broadcast --verify
 bun run scripts/resetDatabase.ts
 bun run scripts/createSampleMarkets.ts
 bun run scripts/syncMarkets.ts  
 bun run scripts/runMarketAwareWorkflow.ts
