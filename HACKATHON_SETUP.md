# TruthMesh AI Oracle - Hackathon Setup Guide

## 🚀 Quick Start for Hackathon Judges

Welcome to TruthMesh AI Oracle! This guide will help you get the system running quickly for demonstration purposes.

## 📋 Prerequisites

Before starting, ensure you have:
- **PostgreSQL** installed and running
- **Bun** runtime installed (Node.js alternative)
- **Git** for cloning the repository

### Install PostgreSQL (if needed)

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

**Windows:** Download from [postgresql.org/download/windows](https://www.postgresql.org/download/windows/)

### Install Bun (if needed)
```bash
curl -fsSL https://bun.sh/install | bash
```

## 🛠️ Setup Instructions

### 1. Clone and Install Dependencies
```bash
git clone <repository-url>
cd truthmesh-seedify
bun install
```

### 2. Database Setup
```bash
# Create database (if not exists)
createdb truthmesh_oracle

# Or connect and create manually:
psql postgres
CREATE DATABASE truthmesh_oracle;
\q
```

### 3. Environment Configuration
Create `.env` file in project root:
```env
# Database Configuration
DATABASE_URL=postgresql://localhost:5432/truthmesh_oracle

# AI Configuration (Optional - system works without these)
OPENAI_API_KEY=your_key_here
NEWSAPI_KEY=your_key_here

# Blockchain Configuration (Optional - for full demo)
ORACLE_PRIVATE_KEY=your_private_key
RPC_URL=http://localhost:8545
```

### 4. Reset Database (Fresh Start)
```bash
# Option A: Using TypeScript script (recommended)
bun run reset-db

# Option B: Using bash script
chmod +x scripts/reset-db.sh
./scripts/reset-db.sh
```

**This will:**
- Delete all existing data
- Reset sequences
- Create 5 sample prediction markets
- Prepare system for demonstration

## 🎯 Demo Workflow

### Step 1: Generate AI Predictions
```bash
# Run the full AI workflow
bun run scripts/runFullWorkflow.ts
```

**What happens:**
- Fetches crypto news from multiple sources
- Processes through AI pipeline (classification → reasoning → predictions)
- Links predictions to relevant markets
- Stores everything in database

### Step 2: Start Frontend
```bash
cd frontend
bun install
bun run dev
```

### Step 3: View Results
Open **http://localhost:3000** to see:
- **Dashboard** with real-time stats
- **Prediction Markets** with AI-powered insights
- **AI Oracle View** with full reasoning transparency
- **Activity Feed** showing system operations

## 🔍 What to Look For

### Key Features to Demo:

1. **AI Reasoning Transparency**
   - Every prediction shows the AI's complete reasoning process
   - No black box - full explainability

2. **Market-Aware Predictions**
   - AI automatically matches predictions to relevant markets
   - Shows how AI answers specific market questions

3. **Real-time Data Pipeline**
   - Live news ingestion → AI processing → Predictions
   - Multiple data sources (RSS, NewsAPI, CoinGecko)

4. **Blockchain Integration**
   - Signed predictions submitted to smart contracts
   - Cryptographic verification of AI outputs

### Demo Scenarios:

**Scenario 1: Market Analysis**
- Show how AI analyzes Bitcoin price predictions
- Demonstrate confidence scoring and reasoning

**Scenario 2: Regulatory Impact**
- Show AI analysis of SEC decisions on crypto markets
- Highlight multi-factor reasoning

**Scenario 3: Technical Developments**
- Demonstrate AI understanding of Ethereum upgrades
- Show technical vs. market impact analysis

## 🎮 Interactive Demo Steps

### Quick Demo (5 minutes):
1. **Reset database** → Fresh start
2. **Run workflow** → Generate AI predictions  
3. **Show frontend** → Demonstrate transparency
4. **Highlight reasoning** → Explain AI decision process

### Full Demo (15 minutes):
1. **Architecture overview** → System design
2. **Data pipeline** → News to predictions
3. **AI transparency** → Reasoning display
4. **Market matching** → Automatic relevance
5. **Blockchain integration** → On-chain verification

## 🐛 Troubleshooting

### Common Issues:

**Database Connection Failed:**
```bash
# Check if PostgreSQL is running
psql -l

# Create database if missing
createdb truthmesh_oracle
```

**Frontend Not Loading:**
```bash
# Ensure frontend dependencies are installed
cd frontend
bun install
bun run dev
```

**No AI Predictions:**
```bash
# Check if workflow ran successfully
bun run scripts/runFullWorkflow.ts

# Verify database has data
psql truthmesh_oracle -c "SELECT COUNT(*) FROM predictions;"
```

**Environment Variables:**
- Ensure `.env` file exists in project root
- Check `DATABASE_URL` format is correct

### Logs and Debugging:

**Backend Logs:**
```bash
# Run backend with debug output
DATABASE_URL=postgresql://... bun run src/server.ts
```

**Database Inspection:**
```bash
# Connect to database
psql truthmesh_oracle

# Check tables and data
\dt
SELECT * FROM markets LIMIT 5;
SELECT * FROM predictions LIMIT 5;
```

## 📊 Expected Output

After successful setup, you should see:

**Database:**
- 5 sample prediction markets
- Multiple AI predictions with reasoning
- Linked market-prediction relationships

**Frontend:**
- Dashboard with statistics
- Markets tab showing AI-powered insights
- Predictions tab with full reasoning
- Clean, professional interface

**Console:**
- Workflow completion messages
- AI processing logs
- Database operation confirmations

## 🎉 Success Metrics

The system is working correctly when:
- ✅ Frontend loads at http://localhost:3000
- ✅ Markets show AI predictions and reasoning
- ✅ Stats display active counts
- ✅ No errors in console logs
- ✅ Database contains fresh data

## 📞 Support

For hackathon judges:
- **Technical issues**: Check troubleshooting section
- **Demo guidance**: Follow interactive demo steps  
- **Architecture questions**: Refer to system documentation

**Remember:** The key innovation is **AI reasoning transparency** - every prediction shows exactly how the AI reached its conclusion!

---
*TruthMesh AI Oracle - Bridging AI Predictions and Transparent Reasoning*