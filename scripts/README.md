# Database Reset Scripts

This directory contains scripts to reset the TruthMesh AI Oracle database to a clean state, perfect for hackathon demonstrations and fresh development environments.

## Available Scripts

### TypeScript Reset Script (`resetDatabase.ts`)

**Features:**
- Interactive confirmation prompt (unless `--force` is used)
- Resets all tables in correct dependency order
- Resets auto-increment sequences
- Inserts sample prediction markets
- Comprehensive error handling and logging

**Usage:**
```bash
# Using bun directly
bun run scripts/resetDatabase.ts

# Using package.json script
bun run reset-db

# Skip confirmation (use with caution!)
bun run scripts/resetDatabase.ts --force

# Show help
bun run scripts/resetDatabase.ts --help
```

### Bash Reset Script (`reset-db.sh`)

**Features:**
- Command-line interface with colored output
- Dependency checking
- Database connection testing
- Sample market insertion
- Command-line options

**Usage:**
```bash
# Make executable and run
chmod +x scripts/reset-db.sh
./scripts/reset-db.sh

# Skip confirmation
./scripts/reset-db.sh --force

# Use custom database URL
./scripts/reset-db.sh --url "postgresql://user:pass@host:port/db"

# Show help
./scripts/reset-db.sh --help
```

## What Gets Reset

The scripts will **DELETE ALL DATA** from these tables (in dependency order):

1. `market_predictions` - Links between markets and AI predictions
2. `markets` - Prediction market questions
3. `predictions` - AI-generated predictions
4. `ai_signals` - AI-processed signals
5. `signal_queue` - Processing queue
6. `raw_events` - Source data from feeds

## Sample Markets Created

After reset, these demonstration markets are automatically created:

1. **"Will Bitcoin reach $100,000 by the end of 2024?"** (30-day lock)
2. **"Will Ethereum complete the Dencun upgrade successfully by Q2 2024?"** (60-day lock)
3. **"Will the SEC approve a spot Ethereum ETF before July 2024?"** (90-day lock)
4. **"Will total crypto market cap exceed $3 trillion in 2024?"** (180-day lock)
5. **"Will AI-generated content account for over 50% of crypto news by 2025?"** (365-day lock)

## Prerequisites

- PostgreSQL database running and accessible via `DATABASE_URL`
- Environment variable `DATABASE_URL` set in `.env` file
- For TypeScript script: Bun runtime
- For bash script: `psql` command-line tool

## Environment Setup

Ensure your `.env` file contains:
```env
DATABASE_URL=postgresql://username:password@localhost:5432/truthmesh_oracle
```

## Next Steps After Reset

1. **Run AI workflow** to generate predictions:
   ```bash
   bun run scripts/runFullWorkflow.ts
   ```

2. **Start the frontend**:
   ```bash
   cd frontend
   bun run dev
   ```

3. **View the system** at http://localhost:3000

## Warning

⚠️ **This operation is destructive and cannot be undone!** All existing data will be permanently deleted.

Use only for:
- Hackathon demonstrations
- Development/testing environments
- Fresh system setups

## Troubleshooting

**Connection Issues:**
- Verify PostgreSQL is running
- Check `DATABASE_URL` format and credentials
- Ensure database exists: `createdb truthmesh_oracle`

**Permission Issues:**
- Ensure database user has necessary privileges
- Check that tables exist (run schema if needed)

**Script Errors:**
- Check that all dependencies are installed
- Verify file permissions on bash script

## Support

For issues with these scripts, check:
- Database connection logs
- Environment variable configuration
- PostgreSQL service status