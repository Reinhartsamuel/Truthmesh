#!/bin/bash

# Database Reset Script for TruthMesh AI Oracle
# 
# This script completely resets the database to a clean state for:
# - Hackathon demonstrations
# - Fresh development environments
# - Testing from scratch
# 
# WARNING: This will DELETE ALL DATA in the database!

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DATABASE_URL=${DATABASE_URL:-"postgresql://localhost:5432/truthmesh_oracle"}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Tables to reset (in dependency order to avoid foreign key constraints)
TABLES=(
    "market_predictions"
    "markets" 
    "predictions"
    "ai_signals"
    "signal_queue"
    "raw_events"
)

# Sample markets for demonstration
SAMPLE_MARKETS=(
    "1|Will Bitcoin reach \$100,000 by the end of 2024?|$(date -d "+30 days" +"%Y-%m-%d %H:%M:%S")|Open"
    "2|Will Ethereum complete the Dencun upgrade successfully by Q2 2024?|$(date -d "+60 days" +"%Y-%m-%d %H:%M:%S")|Open"
    "3|Will the SEC approve a spot Ethereum ETF before July 2024?|$(date -d "+90 days" +"%Y-%m-%d %H:%M:%S")|Open"
    "4|Will total crypto market cap exceed \$3 trillion in 2024?|$(date -d "+180 days" +"%Y-%m-%d %H:%M:%S")|Open"
    "5|Will AI-generated content account for over 50% of crypto news by 2025?|$(date -d "+365 days" +"%Y-%m-%d %H:%M:%S")|Open"
)

# Function to print colored output
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Function to check if required tools are installed
check_dependencies() {
    log_info "Checking dependencies..."
    
    if ! command -v psql &> /dev/null; then
        log_error "PostgreSQL client (psql) is not installed"
        exit 1
    fi
    
    if ! command -v bun &> /dev/null; then
        log_warning "Bun is not installed. Some features may not work."
    fi
    
    log_success "Dependencies checked"
}

# Function to test database connection
test_database_connection() {
    log_info "Testing database connection..."
    
    if ! psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1; then
        log_error "Cannot connect to database: $DATABASE_URL"
        log_error "Please check your DATABASE_URL and ensure PostgreSQL is running"
        exit 1
    fi
    
    log_success "Database connection successful"
}

# Function to reset tables
reset_tables() {
    log_info "Resetting database tables..."
    
    for table in "${TABLES[@]}"; do
        log_info "Clearing table: $table"
        if psql "$DATABASE_URL" -c "DELETE FROM $table CASCADE;" > /dev/null 2>&1; then
            log_success "Cleared $table"
        else
            log_warning "Failed to clear $table (might not exist yet)"
        fi
    done
}

# Function to reset sequences
reset_sequences() {
    log_info "Resetting sequences..."
    
    local sequences=(
        "raw_events_id_seq"
        "signal_queue_id_seq" 
        "ai_signals_id_seq"
        "predictions_id_seq"
        "markets_id_seq"
        "market_predictions_id_seq"
    )
    
    for sequence in "${sequences[@]}"; do
        if psql "$DATABASE_URL" -c "ALTER SEQUENCE $sequence RESTART WITH 1;" > /dev/null 2>&1; then
            log_success "Reset sequence: $sequence"
        else
            log_warning "Sequence $sequence not found (will be created on first insert)"
        fi
    done
}

# Function to insert sample markets
insert_sample_markets() {
    log_info "Inserting sample markets..."
    
    for market_data in "${SAMPLE_MARKETS[@]}"; do
        IFS='|' read -r contract_id question lock_timestamp state <<< "$market_data"
        
        # Escape single quotes in the question for SQL
        question_escaped=$(echo "$question" | sed "s/'/''/g")
        
        local query="INSERT INTO markets (contract_market_id, question, lock_timestamp, state) VALUES ($contract_id, '$question_escaped', '$lock_timestamp', '$state');"
        
        if psql "$DATABASE_URL" -c "$query" > /dev/null 2>&1; then
            log_success "Added market: \"${question:0:50}...\""
        else
            log_warning "Failed to insert market: ${question:0:50}..."
        fi
    done
}

# Function to verify database state
verify_database_state() {
    log_info "Verifying database state..."
    
    echo -e "\n${BLUE}📊 Final database state:${NC}"
    for table in "${TABLES[@]}"; do
        local count=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null | tr -d ' ' || echo "0")
        echo "   $table: $count rows"
    done
}

# Function to show help
show_help() {
    echo -e "${BLUE}Database Reset Script for TruthMesh AI Oracle${NC}"
    echo
    echo "Usage:"
    echo "  ./reset-db.sh [options]"
    echo
    echo "Options:"
    echo "  --help, -h     Show this help message"
    echo "  --force        Skip confirmation (use with caution!)"
    echo "  --url URL      Use custom database URL"
    echo
    echo "This script will:"
    echo "  • Delete ALL data from all tables"
    echo "  • Reset auto-increment sequences" 
    echo "  • Insert sample prediction markets"
    echo "  • Prepare the system for fresh demonstration"
    echo
    echo -e "${RED}WARNING: This operation cannot be undone!${NC}"
}

# Main function
main() {
    echo -e "${BLUE}🚀 Starting database reset...${NC}"
    echo -e "${BLUE}📊 Database: $(echo "$DATABASE_URL" | cut -d'@' -f2)${NC}"
    
    check_dependencies
    test_database_connection
    reset_tables
    reset_sequences
    insert_sample_markets
    verify_database_state
    
    echo -e "\n${GREEN}🎉 Database reset completed successfully!${NC}"
    echo -e "${GREEN}✨ Ready for hackathon demonstration!${NC}"
    echo
    echo -e "${BLUE}📋 Next steps:${NC}"
    echo "   1. Run the AI workflow: bun run scripts/runFullWorkflow.ts"
    echo "   2. Start the frontend: cd frontend && bun run dev"
    echo "   3. Open http://localhost:3000 to see the fresh system"
}

# Parse command line arguments
FORCE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --help|-h)
            show_help
            exit 0
            ;;
        --force)
            FORCE=true
            shift
            ;;
        --url)
            DATABASE_URL="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            show_help
            exit 1
            ;;
    esac
done

# Confirm destructive operation (unless --force is used)
if [[ "$FORCE" != "true" ]]; then
    echo -e "\n${RED}⚠️  WARNING: DESTRUCTIVE OPERATION ⚠️${NC}"
    echo
    echo "This script will DELETE ALL DATA from the database:"
    for table in "${TABLES[@]}"; do
        echo "  • $table"
    done
    echo
    echo -e "${RED}This operation cannot be undone!${NC}"
    echo
    read -p "Type 'RESET' to continue, or anything else to cancel: " confirmation
    
    if [[ "$confirmation" != "RESET" ]]; then
        log_error "Operation cancelled."
        exit 0
    fi
fi

# Run main function
main