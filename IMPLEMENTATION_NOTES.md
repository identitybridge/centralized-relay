# Implementation Notes

This directory contains a minimal relay implementation for generic commit operations.

## 1. Commit Service

The `src/services/commitService.ts` provides generic commit operations:

**Core methods:**
- `publishCommit()` - Publish a commit hash on EVM chain
- `verifyCommitCrossChain()` - Cross-chain verification
- `revokeCommit()` - Revoke a commit on origin chain
- `getCommitStatus()` - Read status from blockchain (no cache)

**Key features:**
- Accepts pre-computed commit hashes (no hash computation in service)
- Fully stateless - no cache or database
- Direct blockchain interactions only

## 3. Templates

If you want template support, copy `api/src/types/templates.ts` to `src/types/templates.ts` and update the templates route to use it.

## 4. Package Dependencies

The `package.json` includes minimal dependencies.

## 2. Testing

After implementation:
1. Test commit publishing on EVM chain
2. Test commit verification cross-chain
3. Test commit revocation
4. Test status checking

## Quick Start

1. Configure chain settings in `src/config/chains.ts`
2. Set environment variables (BACKEND_PRIVATE_KEY, chain RPCs, contract addresses)
3. Test endpoints with pre-computed commit hashes
4. Deploy

The service is ready to use - just provide pre-computed commit hashes!

