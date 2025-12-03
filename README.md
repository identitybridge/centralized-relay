# Identity Bridge - Centralized Relay

A minimal, stateless blockchain relay service for commit operations. This is an open-source version that removes all authentication, database, and caching dependencies, making it ~perfect for self-hosted deployments~ something you _may_ be able to use ;)

> ## DISCLAIMER

> This repo is an extract of the centralized relay & API from the Identity Bridge POC. The POC codebase relay manages webhook dispatches via BullMQ, org/user management, metered usage (credit based), API keys and tracks credential issuance related stats. This _should_ be the bare minimum you need to use the [contracts](https://github.com/identitybridge/contracts) as intended, but YMMV.


## Features

- ✅ **Publish Commits** - Publish commits (hashes) on EVM chains
- ✅ **Verify Commits** - Cross-chain commit verification
- ✅ **Revoke Commits** - Revoke commits on origin chains
- ✅ **Check Status** - Query commit status from blockchain
- ✅ **Chain Discovery** - List available blockchain networks
- ✅ **Template Discovery** - Access templates (if configured)
- ✅ **No Database** - Fully stateless, no data persistence
- ✅ **No Authentication** - Public API, no API keys required
- ✅ **No Cache** - Direct blockchain reads

### A note about gas

Identity Bridge subsidizes gas for relevant transactions. This is to further the mission of enabling non-web3 orgs to leverage on-chain features without managing a wallet of their own. As a result you'll need to provide wallets with gas tokens for the networks you want to use. 

### A note about RPCs

We use Infura for several of the EVM RPCs, so this is setup for using it. It doesn't take much to use it with other RPC services or your own node.

## Architecture

This relay is a **stateless transaction service** that:
- Accepts commit operation requests (publish, verify, revoke)
- Interacts directly with blockchain smart contracts
- Returns transaction results
- Provides chain and template discovery

All operations are anonymous and users pay their own gas fees.

## Installation

```bash
# Install dependencies
npm install

# Build
npm run build

# Run in development
npm run dev

# Run in production
npm start
```

## Configuration

Create a `.env` file with the following variables:

```bash
# Server
PORT=3000

# EVM Blockchain
BACKEND_PRIVATE_KEY=0x...              # Wallet private key for transactions
ORIGIN_CHAIN_ID=11155111               # Default anchor chain
ORIGIN_CHAIN_RPC=https://sepolia.infura.io/v3/
ANCHOR_CONTRACT_ADDRESS=0x...          # Anchor contract address

DEST_CHAIN_ID=11155420                 # Default verification chain
DEST_CHAIN_RPC=https://optimism-sepolia.infura.io/v3/
VERIFIER_CONTRACT_ADDRESS=0x...        # Verifier contract address

# Infura API Key (if using Infura RPCs)
INFURA_API_KEY=your_infura_api_key
```

### Chains

You'll need to deploy contracts to target EVM chains and add the entries to `src/config/chains.ts` matching the following shape.

```typescript
export interface Chain {
    id: number | string;
    name: string;
    rpc: string;
    anchorAddress?: string;
    verifierAddress?: string;
    registryAddress?: string;
    blockExplorerUrl?: string;
}
```

## API Endpoints

### Health Check

```http
GET /health
```

Returns server status.

### Publish Commit

```http
POST /api/commits/publish
Content-Type: application/json

{
  "commitHash": "0x...",
  "expiry": 1735689600,
  "anchorChainId": 11155111
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "commitHash": "0x...",
    "transactionHash": "0x...",
    "originChain": 11155111,
    "issuer": "0x...",
    "originChainName": "sepolia"
  }
}
```

### Verify Commit

```http
POST /api/commits/verify
Content-Type: application/json

{
  "commitHash": "0x...",
  "originChainId": 11155111,
  "destChainId": 11155420
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "commitHash": "0x...",
    "verificationHash": "0x...",
    "originChain": 11155111,
    "destChain": 11155420,
    "originChainName": "sepolia",
    "destChainName": "optimism-sepolia"
  }
}
```

### Revoke Commit

```http
POST /api/commits/:commitHash/revoke
Content-Type: application/json

{
  "originChainId": 11155111
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "commitHash": "0x...",
    "revocationHash": "0x...",
    "originChain": 11155111,
    "originChainName": "sepolia",
    "message": "Commit revoked successfully"
  }
}
```

### Get Commit Status

```http
GET /api/commits/:commitHash/status?originChainId=11155111&destChainId=11155420
```

**Response:**
```json
{
  "success": true,
  "data": {
    "commitHash": "0x...",
    "origin": {
      "published": true,
      "revoked": false,
      "issuer": "0x...",
      "publishedAt": "1735689600",
      "expiry": "1735689600",
      "chain": "sepolia",
      "chainId": 11155111
    },
    "destination": {
      "verified": true,
      "verifiedAt": "1735689700",
      "chain": "optimism-sepolia",
      "chainId": 11155420
    }
  }
}
```

### List Chains

```http
GET /api/chains
```

**Response:**
```json
{
  "success": true,
  "data": {
    "chains": [
      {
        "id": 11155111,
        "name": "sepolia",
        "rpc": "https://sepolia.infura.io/v3/...",
        "anchorAddress": "0x...",
        "verifierAddress": "0x...",
        "blockExplorerUrl": "https://sepolia.etherscan.io"
      }
    ]
  }
}
```

### List Templates

```http
GET /api/templates
```

**Response:**
```json
{
  "success": true,
  "data": {
    "templates": [
      {
        "id": "education",
        "name": "Education Credential",
        "description": "...",
        "version": "1.0.0",
        "category": "education",
        "fieldCount": 6,
        "disclosableFieldCount": 4
      }
    ],
    "count": 1
  }
}
```

## Usage Examples

### Publish a Commit

```bash
curl -X POST http://localhost:3000/api/commits/publish \
  -H "Content-Type: application/json" \
  -d '{
    "commitHash": "0x...",
    "expiry": 1735689600,
    "anchorChainId": 11155111
  }'
```

### Verify a Commit

```bash
curl -X POST http://localhost:3000/api/commits/verify \
  -H "Content-Type: application/json" \
  -d '{
    "commitHash": "0x...",
    "originChainId": 11155111,
    "destChainId": 11155420
  }'
```

### Check Commit Status

```bash
curl "http://localhost:3000/api/commits/0x.../status?originChainId=11155111&destChainId=11155420"
```

## Commit Hash Format

The service accepts pre-computed commit hashes. The hash must be:
- A valid `bytes32` value (32 bytes)
- Prefixed with `0x`
- 66 characters total (0x + 64 hex characters)

Example: `0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef`

**Note:** This service does not compute hashes from data. You must provide a pre-computed hash. The hash can represent any data structure (credentials, documents, attestations, etc.) - the service is agnostic to the underlying data.

## Supported Chains

### EVM Chains
- Sepolia (11155111)
- Optimism Sepolia (11155420)
- Base Sepolia (84532)
- Rootstock Testnet (31)
- Polygon Amoy (80002)

## Error Handling

All endpoints return errors in this format:

```json
{
  "success": false,
  "error": "Error message here"
}
```

Common errors:
- `400` - Bad Request (invalid parameters)
- `500` - Internal Server Error (blockchain operation failed)

## Development

```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build for production
npm run build

# Type check
npm run type-check
```

## Project Structure

```
centralized-relay/
├── src/
│   ├── index.ts                 # Main Express app
│   ├── config.ts                # Configuration
│   ├── config/
│   │   └── chains.ts            # Chain definitions
│   ├── blockchain/
│   │   └── clients.ts           # EVM clients
│   ├── contracts/
│   │   └── abis.ts              # EVM contract ABIs
│   ├── routes/
│   │   ├── commits.ts           # Commit operations
│   │   ├── chains.ts            # Chain discovery
│   │   ├── templates.ts         # Template endpoints
│   │   └── discovery.ts         # OpenID4VC discovery
│   ├── services/
│   │   └── commitService.ts     # Core commit logic
│   └── utils/
│       └── address.ts           # Address utilities
├── package.json
├── tsconfig.json
└── README.md
```

## Differences from the full IDBR implementation

This minimal relay removes:
- ❌ Authentication (API keys, users, organizations)
- ❌ Database (Prisma, all data storage)
- ❌ Caching (Redis, cache layer)
- ❌ Background jobs (webhooks, aggregation workers)
- ❌ Advanced features (zkVerify, OAuth, multi-chain auto-verification)
- ❌ Credit system
- ❌ Statistics tracking
- ❌ Webhook delivery
- ❌ W3C credential generation
- ❌ OpenID4VC OAuth support
- ❌ Likely other stuff too

## Security Considerations

1. **No Rate Limiting** - Without auth, there's no per-organization rate limiting
2. **Gas Costs** - Users pay their own gas fees via the backend wallet
3. **Public API** - All endpoints are public, no authentication required
4. **Private Key Security** - Keep `BACKEND_PRIVATE_KEY` secure and never commit it

## License

MIT

## Support

lol, gl bro

# centralized-relay
