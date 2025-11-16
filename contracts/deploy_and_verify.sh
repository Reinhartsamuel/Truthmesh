#!/usr/bin/env bash
set -euo pipefail

# deploy_and_verify.sh
# Deploy PredictionOracle via Foundry script and verify on Etherscan (or equivalent explorer API).
#
# Usage (from truthmesh-seedify/contracts):
#   DEPLOYER_KEY=0x... ORACLE_SIGNER=0x... RPC_URL=https://... CHAIN=sepolia ETHERSCAN_API_KEY=... ./deploy_and_verify.sh
#
# Notes:
# - If RPC_URL points to localhost (Anvil), the script will deploy but skip Etherscan verification
#   (local chains are not verifiable on public explorers). It will still print the deployed address
#   and the on-chain bytecode using `cast code`.
# - CHAIN is used to select the correct explorer API host for verification polling (common names: mainnet, sepolia, polygon, mumbai, arbitrum, optimism).
# - This script first runs the Foundry script `script/PredictionOracle.s.sol:PredictionOracleScript`.
# - Then it calls `forge verify-contract` and polls the explorer API for verification to appear (by checking the ABI availability).
#
# Requirements:
# - Foundry (forge & cast) in PATH.
# - curl, jq, grep, awk.
# - Environment variables:
#     DEPLOYER_KEY or PRIVATE_KEY (private key used with --private-key)
#     RPC_URL
#     CHAIN (e.g. sepolia, mainnet, polygon, mumbai, arbitrum, optimism)
#     ETHERSCAN_API_KEY (for public chain verification)
#     ORACLE_SIGNER (optional; if not provided, script's logic may use deployer address)
#
# Exit codes:
# - 0 success (deployment + verification or local deploy with bytecode printed)
# - non-zero on failure

# --- Configurable values ---
SCRIPT_TARGET="script/PredictionOracle.s.sol:PredictionOracleScript"
CONTRACT_FQN="src/PredictionOracle.sol:PredictionOracle"
LOGFILE="$(mktemp /tmp/forge-deploy-XXXX.log)"
POLL_INTERVAL=6          # seconds between verification checks
POLL_TIMEOUT=300         # total seconds to wait for verification (5 minutes)
# ----------------------------

# Utility: print usage
usage() {
  cat <<EOF
Usage:
  DEPLOYER_KEY=0x... RPC_URL=https://... CHAIN=sepolia ETHERSCAN_API_KEY=... [ORACLE_SIGNER=0x...] ./deploy_and_verify.sh

Environment:
  DEPLOYER_KEY / PRIVATE_KEY - private key for broadcasting the deploy transaction
  RPC_URL                    - rpc endpoint to use for deployment
  CHAIN                      - network name for verification (ex: sepolia, mainnet, polygon, mumbai, arbitrum, optimism)
  ETHERSCAN_API_KEY          - API key for the explorer (Etherscan/Polygonscan/Arbiscan etc)
  ORACLE_SIGNER              - (optional) address to pass as constructor arg via script env
EOF
}

# Basic env checks
if [ "${RPC_URL:-}" = "" ]; then
  echo "Missing RPC_URL. Aborting."
  usage
  exit 2
fi

# Accept either DEPLOYER_KEY or PRIVATE_KEY
DEPLOYER_KEY="${DEPLOYER_KEY:-${PRIVATE_KEY:-}}"
if [ -z "$DEPLOYER_KEY" ]; then
  echo "Missing DEPLOYER_KEY or PRIVATE_KEY env var. Aborting."
  usage
  exit 2
fi

CHAIN="${CHAIN:-}"
ETHERSCAN_API_KEY="${ETHERSCAN_API_KEY:-}"
ORACLE_SIGNER="${ORACLE_SIGNER:-}"

# Determine if this is a local RPC (skip verification)
is_local_rpc() {
  case "$RPC_URL" in
    http://localhost*|http://127.0.0.1*|ws://localhost*|ws://127.0.0.1*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# Map CHAIN to explorer API host for ABI polling
get_api_host() {
  local chain="$1"
  case "$chain" in
    mainnet) echo "api.etherscan.io" ;;
    sepolia) echo "api-sepolia.etherscan.io" ;;
    goerli)  echo "api-goerli.etherscan.io" ;; # legacy
    polygon) echo "api.polygonscan.com" ;;
    mumbai)  echo "api-testnet.polygonscan.com" ;;
    arbitrum) echo "api.arbiscan.io" ;;
    arbitrum-goerli) echo "api-goerli.arbiscan.io" ;; # example - may vary
    optimism) echo "api-optimistic.etherscan.io" ;;
    optimism-goerli) echo "api-goerli-optimistic.etherscan.io" ;;
    * )
      # default to etherscan
      echo "api.etherscan.io"
      ;;
  esac
}

# Deploy using forge script
echo "Deploying contract with Foundry script..."
echo " - Script target: $SCRIPT_TARGET"
echo " - Using RPC: $RPC_URL"
echo " - Logging output to: $LOGFILE"

# Export environment variables expected by the script if they are named differently
# The script uses vm.envUint(\"ORACLE_PRIVATE_KEY\") and vm.envAddress(\"ORACLE_SIGNER\") internally.
# Expose ORACLE_PRIVATE_KEY in env for the script if DEPLOYER_KEY is set.
export ORACLE_PRIVATE_KEY="$DEPLOYER_KEY"

# If ORACLE_SIGNER was provided, export ORACLE_SIGNER so vm.envAddress picks it up.
if [ -n "$ORACLE_SIGNER" ]; then
  export ORACLE_SIGNER
fi

# Run forge script and capture output
# We add --broadcast and --private-key to ensure broadcast; use --rpc-url
if ! forge script "$SCRIPT_TARGET" --rpc-url "$RPC_URL" --private-key "$DEPLOYER_KEY" --broadcast |& tee "$LOGFILE"; then
  echo "forge script failed. See $LOGFILE for details."
  exit 3
fi

# Extract deployed address from script output
DEPLOYED_ADDR="$(grep -oE 'PredictionOracle deployed at: 0x[0-9a-fA-F]+' "$LOGFILE" | awk '{print $3}' | tail -n1 || true)"

if [ -z "$DEPLOYED_ADDR" ]; then
  # Try a more permissive grep if formatting differs
  DEPLOYED_ADDR="$(grep -oE '0x[0-9a-fA-F]{40}' "$LOGFILE" | head -n1 || true)"
fi

if [ -z "$DEPLOYED_ADDR" ]; then
  echo "Failed to parse deployed contract address from forge output. Please check $LOGFILE"
  exit 4
fi

echo "Deployed contract address: $DEPLOYED_ADDR"

# If local RPC, skip verification and show bytecode
if is_local_rpc; then
  echo "Detected local RPC (Anvil/localhost). Skipping Etherscan verification."
  echo "On-chain bytecode at $DEPLOYED_ADDR:"
  cast code "$DEPLOYED_ADDR" --rpc-url "$RPC_URL"
  echo "Done."
  exit 0
fi

# Ensure we have a chain and etherscan api key for verification
if [ -z "$CHAIN" ] || [ -z "$ETHERSCAN_API_KEY" ]; then
  echo "CHAIN and ETHERSCAN_API_KEY are required for verification on public explorers."
  echo "Deployed address: $DEPLOYED_ADDR"
  exit 5
fi

# Run forge verify-contract
echo "Running forge verify-contract for $CONTRACT_FQN on chain '$CHAIN'..."
if forge verify-contract --chain "$CHAIN" "$DEPLOYED_ADDR" "$CONTRACT_FQN" "$ETHERSCAN_API_KEY" |& tee -a "$LOGFILE"; then
  echo "forge verify-contract returned successfully (submission may still be pending)."
else
  echo "forge verify-contract reported an error. See $LOGFILE for details."
  # continue to poll explorer API anyway in case verification was actually submitted
fi

# Determine explorer API host
API_HOST="$(get_api_host "$CHAIN")"
echo "Using explorer API host: $API_HOST"

# Poll explorer API for ABI presence to confirm verification
echo "Polling explorer API to confirm verification (will wait up to $POLL_TIMEOUT seconds)..."
ELAPSED=0
while [ $ELAPSED -lt $POLL_TIMEOUT ]; do
  # Query getabi endpoint (returns ABI if contract source is verified)
  # Example: https://api-sepolia.etherscan.io/api?module=contract&action=getabi&address=0x...&apikey=KEY
  RESP="$(curl -s \"https://$API_HOST/api?module=contract&action=getabi&address=$DEPLOYED_ADDR&apikey=$ETHERSCAN_API_KEY\")" || true

  # Try to parse status using jq if available, else simple grep
  if command -v jq >/dev/null 2>&1; then
    STATUS="$(echo "$RESP" | jq -r '.status' 2>/dev/null || echo \"0\")"
    MESSAGE="$(echo "$RESP" | jq -r '.result' 2>/dev/null || echo \"\")"
  else
    # Fallback parsing
    STATUS="$(echo "$RESP" | grep -oE '\"status\"\s*:\s*\"[01]\"' | grep -oE '[01]' || echo \"0\")"
    MESSAGE="$RESP"
  fi

  if [ "$STATUS" = "1" ]; then
    echo "Explorer reports contract ABI available — verification complete."
    echo "Explorer result: $MESSAGE"
    exit 0
  else
    echo "Not verified yet (elapsed ${ELAPSED}s). Explorer response snippet:"
    echo "$MESSAGE" | head -c 300
    sleep "$POLL_INTERVAL"
    ELAPSED=$((ELAPSED + POLL_INTERVAL))
  fi
done

echo "Timed out waiting for explorer verification (waited $POLL_TIMEOUT seconds)."
echo "You can manually check: https://$API_HOST/address/$DEPLOYED_ADDR#code"
exit 6