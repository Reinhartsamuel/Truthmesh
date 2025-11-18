# Database Setup for TruthMesh AI Oracle

## Prerequisites

- PostgreSQL 12+ installed and running
- Node.js 18+ or Bun
- Environment variables configured

## Quick Setup

### 1. Install PostgreSQL

**macOS (Homebrew):**
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

**Windows:**
Download and install from [PostgreSQL Downloads](https://www.postgresql.org/download/windows/)

### 2. Create Database and User

```bash
# Connect to PostgreSQL
psql postgres

# Create database
CREATE DATABASE truthmesh_oracle;

# Create user (optional)
CREATE USER truthmesh_user WITH PASSWORD 'your_password';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE truthmesh_oracle TO truthmesh_user;

# Exit
\q
```

### 3. Set Environment Variables

Create or update `.env` file in the project root:

```env
# Database Configuration
DATABASE_URL=postgresql://truthmesh_user:your_password@localhost:5432/truthmesh_oracle

# Alternative formats:
# DATABASE_URL=postgresql://localhost:5432/truthmesh_oracle
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/truthmesh_oracle

# AI/ML Configuration
OPENAI_API_KEY=your_openai_api_key_here
NEWSAPI_KEY=your_newsapi_key_here

# Blockchain Configuration
ORACLE_PRIVATE_KEY=your_private_key_here
RPC_URL=http://localhost:8545
ORACLE_CONTRACT_ADDRESS=0x...
PREDICTION_MARKET_ADDRESS=0x...
```

### 4. Apply Database Schema

The schema will be automatically applied when you run the application, but you can also apply it manually:

```bash
# Using the workflow script (recommended)
DATABASE_URL=postgresql://... bun run scripts/runFullWorkflow.ts

# Or manually with psql
psql truthmesh_oracle -f sql/schema.sql
```

## Database Schema Overview

The system uses 4 main tables:

### 1. `raw_events` - Source Data
- Events from RSS feeds, NewsAPI, CoinGecko
- Contains original text, source, URLs, metadata
- Deduplicated by content hash

### 2. `signal_queue` - Processing Queue
- Work queue for AI processing
- Links raw events to AI signals

### 3. `ai_signals` - AI Analysis
- Category classification (BTC_price, ETH_ecosystem, etc.)
- Relevance scores (embedding similarity)
- Confidence scores (LLM reasoning)
- AI-generated summaries

### 4. `predictions` - Final Predictions
- Numerical predictions (0-1 scale)
- Ready for on-chain submission
- Links back to source events

## Testing Database Connection

### 1. Test Connection
```bash
# Set environment variable
export DATABASE_URL=postgresql://...

# Test connection
bun run src/index.ts
```

### 2. Generate Sample Data
```bash
# Run full workflow to populate database
DATABASE_URL=postgresql://... bun run scripts/runFullWorkflow.ts
```

### 3. Verify Data
```bash
# Connect to database and check tables
psql truthmesh_oracle

# List tables
\dt

# Check data
SELECT * FROM raw_events LIMIT 5;
SELECT * FROM ai_signals LIMIT 5;
SELECT * FROM predictions LIMIT 5;
```

## Troubleshooting

### Common Issues

**1. Connection Refused**
```
Error: connect ECONNREFUSED
```
- Check if PostgreSQL is running: `brew services list` or `sudo systemctl status postgresql`
- Verify port 5432 is open

**2. Authentication Failed**
```
Error: password authentication failed for user
```
- Check username/password in DATABASE_URL
- Verify user has database privileges

**3. Database Doesn't Exist**
```
Error: database "truthmesh_oracle" does not exist
```
- Create the database: `createdb truthmesh_oracle`

**4. Environment Variables Not Loaded**
```
Error: DATABASE_URL missing
```
- Ensure `.env` file is in project root
- Restart your terminal/application

### Development Database (Optional)

For development, you can use a local SQLite database instead:

```bash
# Install SQLite
brew install sqlite3

# Update DATABASE_URL
DATABASE_URL=file:./dev.db
```

## Production Considerations

### 1. Database Backups
```bash
# Backup database
pg_dump truthmesh_oracle > backup_$(date +%Y%m%d).sql

# Restore database
psql truthmesh_oracle < backup_file.sql
```

### 2. Performance Optimization
- Add indexes on frequently queried columns
- Consider connection pooling
- Monitor query performance

### 3. Security
- Use strong passwords
- Limit database user privileges
- Enable SSL connections in production
- Regular security updates

## API Endpoints

Once running, the backend provides these API endpoints:

- `GET /api/events` - Raw events from data sources
- `GET /api/signals` - AI-processed signals
- `GET /api/predictions` - Final predictions
- `GET /api/stats` - System statistics
- `GET /api/events/category/:category` - Filter by category

## Support

If you encounter issues:
1. Check the logs for error messages
2. Verify PostgreSQL is running
3. Confirm environment variables are set
4. Check database permissions

For additional help, check the project documentation or create an issue in the repository.